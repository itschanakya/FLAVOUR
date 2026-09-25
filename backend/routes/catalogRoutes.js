const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDB, syncStandardPacketPrice } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Setup Multer Storage for Catalog Photos
const catalogUploadDir = path.join(__dirname, '../uploads/catalog/');
if (!fs.existsSync(catalogUploadDir)) {
  fs.mkdirSync(catalogUploadDir, { recursive: true });
}

const catalogStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, catalogUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'catalog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadCatalogPhoto = multer({
  storage: catalogStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// POST /api/catalog/upload-photo - Upload item photo from device
router.post('/upload-photo', authenticateToken, authorizeRoles('ADMIN'), uploadCatalogPhoto.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }
    const imageUrl = `/uploads/catalog/${req.file.filename}`;
    res.json({ imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Catalog photo upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo.' });
  }
});

// GET /api/catalog - List active catalog items with live stock, today's consumption & expiry
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const todayStr = new Date().toISOString().split('T')[0];

    // Admin sees all, Unit & Institution see only active items by default
    const query = req.user.role === 'ADMIN' 
      ? 'SELECT * FROM refreshment_items ORDER BY item_name ASC'
      : 'SELECT * FROM refreshment_items WHERE is_active = 1 ORDER BY item_name ASC';
    
    const items = await db.all(query);

    // Calculate today's consumed quantity for each item
    const enhancedItems = await Promise.all(items.map(async (item) => {
      const consumedRes = await db.get(
        `SELECT COALESCE(SUM(di.quantity), 0) as consumed_today
         FROM demand_items di
         JOIN demands d ON di.demand_id = d.id
         WHERE di.item_id = ? 
           AND d.status IN ('ACCEPTED', 'FULFILLED')
           AND DATE(d.demand_date) = ?`,
        [item.id, todayStr]
      );

      const wastageRes = await db.get(
        `SELECT COALESCE(SUM(quantity), 0) as total_wastage
         FROM item_stock_logs
         WHERE item_id = ? 
           AND (change_type = 'STOCK_OUT' OR log_type IN ('WASTAGE', 'EXPIRED', 'DAMAGE', 'CONDEMNED'))`,
        [item.id]
      );

      const consumedToday = consumedRes ? (consumedRes.consumed_today || 0) : 0;
      const totalWastage = wastageRes ? (wastageRes.total_wastage || 0) : 0;
      const currentStock = item.current_stock !== undefined && item.current_stock !== null ? item.current_stock : 0;
      const isExpired = !!(item.expiry_date && item.expiry_date <= todayStr);
      const isOutOfStock = currentStock <= 0;
      const isLowStock = currentStock > 0 && currentStock <= (item.min_threshold || 10);

      return {
        ...item,
        current_stock: currentStock,
        consumed_today: consumedToday,
        total_wastage: totalWastage,
        is_expired: isExpired,
        is_out_of_stock: isOutOfStock,
        is_low_stock: isLowStock
      };
    }));

    res.json(enhancedItems);
  } catch (error) {
    console.error('Fetch catalog error:', error);
    res.status(500).json({ error: 'Failed to retrieve refreshment catalog.' });
  }
});

// POST /api/catalog - Admin adds new refreshment item
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { item_name, unit_price, unit_of_measure, initial_stock, min_threshold, expiry_date, image_url } = req.body;

    if (!item_name || unit_price === undefined || !unit_of_measure) {
      return res.status(400).json({ error: 'Item name, unit price, and unit of measure are required.' });
    }

    const price = parseFloat(unit_price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Unit price must be a valid positive number.' });
    }

    const stock = parseInt(initial_stock, 10) || 0;
    const threshold = parseInt(min_threshold, 10) || 10;
    const expDate = expiry_date || null;
    const imgUrl = image_url || null;

    const db = await getDB();
    const result = await db.run(
      'INSERT INTO refreshment_items (item_name, unit_price, unit_of_measure, is_active, current_stock, min_threshold, expiry_date, image_url) VALUES (?, ?, ?, 1, ?, ?, ?, ?)',
      [item_name, price, unit_of_measure, stock, threshold, expDate, imgUrl]
    );

    const itemId = result.lastID;

    // If initial stock provided, log it
    if (stock > 0) {
      await db.run(
        'INSERT INTO item_stock_logs (item_id, log_type, quantity, balance_after, expiry_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, 'STOCK_IN', stock, stock, expDate, 'Initial opening stock', req.user.id]
      );
    }

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM', itemId, 'CREATED', req.user.id, `Added catalog item ${item_name} @ ₹${price}/${unit_of_measure} with stock ${stock}`]
    );

    res.status(201).json({
      message: 'Refreshment item added to catalog.',
      item: { id: itemId, item_name, unit_price: price, unit_of_measure, is_active: 1, current_stock: stock, expiry_date: expDate, image_url: imgUrl }
    });

  } catch (error) {
    console.error('Create catalog item error:', error);
    res.status(500).json({ error: 'Failed to add item to catalog.' });
  }
});

// PUT /api/catalog/:id - Admin updates item (price, availability, expiry date, photo, etc.)
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { item_name, unit_price, unit_of_measure, is_active, min_threshold, expiry_date, image_url } = req.body;
    const db = await getDB();

    const price = parseFloat(unit_price);
    const active = is_active ? 1 : 0;
    const threshold = parseInt(min_threshold, 10) || 10;
    const imgUrl = image_url !== undefined ? image_url : null;

    await db.run(
      'UPDATE refreshment_items SET item_name = ?, unit_price = ?, unit_of_measure = ?, is_active = ?, min_threshold = ?, expiry_date = ?, image_url = ? WHERE id = ?',
      [item_name, price, unit_of_measure, active, threshold, expiry_date || null, imgUrl, req.params.id]
    );

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM', req.params.id, 'UPDATED', req.user.id, `Updated item ${item_name} (price: ₹${price}, active: ${active}, expiry: ${expiry_date || 'N/A'})`]
    );

    // If an item in the standard packet template changed price, recalculate and sync packet price
    await syncStandardPacketPrice(db);

    res.json({ message: 'Catalog item updated successfully.' });
  } catch (error) {
    console.error('Update catalog item error:', error);
    res.status(500).json({ error: 'Failed to update catalog item.' });
  }
});

// DELETE /api/catalog/:id - Admin deletes an item
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const itemId = req.params.id;

    // Check if item exists
    const item = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found.' });
    }

    // Check if item is part of active/pending/approved demands
    const activeDemandItem = await db.get(
      `SELECT di.id, d.demand_number, d.status 
       FROM demand_items di 
       JOIN demands d ON di.demand_id = d.id 
       WHERE di.item_id = ? AND d.status IN ('PENDING', 'APPROVED', 'ACCEPTED')
       LIMIT 1`,
      [itemId]
    );

    if (activeDemandItem) {
      return res.status(400).json({
        error: `Cannot delete item '${item.item_name}' because it is part of active Demand #${activeDemandItem.demand_number} (${activeDemandItem.status}). Deactivate it instead.`
      });
    }

    // Delete related logs, packet template entries, and demand item associations first
    await db.run('DELETE FROM packet_template_items WHERE item_id = ?', [itemId]);
    await db.run('DELETE FROM item_stock_logs WHERE item_id = ?', [itemId]);
    await db.run('DELETE FROM demand_items WHERE item_id = ?', [itemId]);
    await db.run('DELETE FROM refreshment_items WHERE id = ?', [itemId]);

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM', itemId, 'DELETED', req.user.id, `Deleted catalog item ${item.item_name}`]
    );

    res.json({ message: `Item '${item.item_name}' deleted successfully.` });
  } catch (error) {
    console.error('Delete catalog item error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete catalog item.' });
  }
});

// POST /api/catalog/:id/stock-in - Admin adds new stock shipment with new expiry date
router.post('/:id/stock-in', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { quantity, expiry_date, notes, created_at } = req.body;
    const itemId = req.params.id;

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Please specify a valid quantity greater than 0.' });
    }

    if (!expiry_date) {
      return res.status(400).json({ error: 'New stock requires a valid Expiry Date.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (expiry_date <= todayStr) {
      return res.status(400).json({ error: 'Expiry date must be in the future for newly added stock.' });
    }

    const db = await getDB();
    const item = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found.' });
    }

    const newBalance = (item.current_stock || 0) + qty;
    const entryTimestamp = created_at || new Date().toISOString();

    // Update item stock and new expiry date
    await db.run(
      'UPDATE refreshment_items SET current_stock = ?, expiry_date = ?, last_restocked_at = NOW(), is_active = 1 WHERE id = ?',
      [newBalance, expiry_date, itemId]
    );

    const prevStock = item.current_stock || 0;
    const unitRate = item.unit_price || 0;
    const gstRate = item.default_gst_rate || 5.0;
    const totalAmt = (qty * unitRate) * (1 + gstRate / 100);

    // Record stock log entry with complete traceability
    await db.run(
      `INSERT INTO item_stock_logs 
       (item_id, log_type, change_type, previous_stock, quantity, balance_after, unit_price, gst_rate, total_amount, expiry_date, notes, created_at, created_by) 
       VALUES (?, 'STOCK_IN', 'STOCK_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, prevStock, qty, newBalance, unitRate, gstRate, totalAmt, expiry_date, notes || 'Direct Stock-In Arrival', entryTimestamp, req.user.id]
    );

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM_STOCK', itemId, 'STOCK_IN', req.user.id, `Added +${qty} units to ${item.item_name}. New Balance: ${newBalance}, New Expiry: ${expiry_date}`]
    );

    res.json({
      message: `Successfully added ${qty} units. New stock balance is ${newBalance}.`,
      item: {
        id: itemId,
        current_stock: newBalance,
        expiry_date: expiry_date,
        is_expired: false,
        is_out_of_stock: false
      }
    });

  } catch (error) {
    console.error('Stock-in error:', error);
    res.status(500).json({ error: 'Failed to add stock.' });
  }
});

// GET /api/catalog/all-stock-logs - Fetch overall stock logs, flow totals, and wastage across all items
router.get('/all-stock-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();

    const inRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as val 
       FROM item_stock_logs 
       WHERE change_type = 'STOCK_IN' OR log_type = 'STOCK_IN'`
    );

    const outRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as val 
       FROM item_stock_logs 
       WHERE change_type = 'STOCK_OUT' OR log_type IN ('STOCK_OUT', 'WASTAGE', 'EXPIRED', 'DAMAGE', 'CONSUMED', 'DISPATCH')`
    );

    const wastageRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as units, COALESCE(SUM(total_amount), 0) as amount 
       FROM item_stock_logs 
       WHERE log_type IN ('WASTAGE', 'EXPIRED', 'DAMAGE', 'CONDEMNED')`
    );

    const logs = await db.all(
      `SELECT sl.*, ri.item_name, ri.unit_of_measure, ri.image_url, u.name as added_by_name
       FROM item_stock_logs sl
       LEFT JOIN refreshment_items ri ON sl.item_id = ri.id
       LEFT JOIN users u ON sl.created_by = u.id
       ORDER BY sl.created_at DESC LIMIT 300`
    );

    const itemSummaries = await db.all(
      `SELECT ri.id, ri.item_name, ri.unit_of_measure, ri.image_url, ri.current_stock, ri.unit_price, ri.expiry_date,
              COALESCE(SUM(CASE WHEN sl.change_type = 'STOCK_IN' OR sl.log_type = 'STOCK_IN' THEN sl.quantity ELSE 0 END), 0) as total_in,
              COALESCE(SUM(CASE WHEN sl.change_type = 'STOCK_OUT' OR sl.log_type IN ('STOCK_OUT', 'WASTAGE', 'EXPIRED', 'DAMAGE', 'CONSUMED', 'DISPATCH') THEN sl.quantity ELSE 0 END), 0) as total_out,
              COALESCE(SUM(CASE WHEN sl.log_type IN ('WASTAGE', 'EXPIRED', 'DAMAGE', 'CONDEMNED') THEN sl.quantity ELSE 0 END), 0) as total_wastage
       FROM refreshment_items ri
       LEFT JOIN item_stock_logs sl ON ri.id = sl.item_id
       GROUP BY ri.id, ri.item_name, ri.unit_of_measure, ri.image_url, ri.current_stock, ri.unit_price, ri.expiry_date
       ORDER BY ri.item_name ASC`
    );

    res.json({
      global_flow_in: Number(inRes?.val || 0),
      global_flow_out: Number(outRes?.val || 0),
      global_wastage_units: Number(wastageRes?.units || 0),
      global_wastage_amount: Number(wastageRes?.amount || 0),
      logs,
      itemSummaries
    });
  } catch (error) {
    console.error('Fetch all stock logs error:', error);
    res.status(500).json({ error: 'Failed to fetch global stock history.' });
  }
});

// GET /api/catalog/:id/stock-logs - Fetch stock history logs & flow metrics for an item
router.get('/:id/stock-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const itemId = req.params.id;

    const item = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found.' });
    }

    const inRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as val 
       FROM item_stock_logs 
       WHERE item_id = ? AND (change_type = 'STOCK_IN' OR log_type = 'STOCK_IN')`,
      [itemId]
    );

    const outRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as val 
       FROM item_stock_logs 
       WHERE item_id = ? AND (change_type = 'STOCK_OUT' OR log_type IN ('STOCK_OUT', 'WASTAGE', 'EXPIRED', 'DAMAGE', 'CONSUMED', 'DISPATCH'))`,
      [itemId]
    );

    const wastageRes = await db.get(
      `SELECT COALESCE(SUM(quantity), 0) as val 
       FROM item_stock_logs 
       WHERE item_id = ? AND log_type IN ('WASTAGE', 'EXPIRED', 'DAMAGE', 'CONDEMNED')`,
      [itemId]
    );

    const logs = await db.all(
      `SELECT sl.*, u.name as added_by_name 
       FROM item_stock_logs sl
       LEFT JOIN users u ON sl.created_by = u.id
       WHERE sl.item_id = ?
       ORDER BY sl.created_at DESC LIMIT 100`,
      [itemId]
    );

    let totalIn = Number(inRes?.val || 0);
    const totalOut = Number(outRes?.val || 0);
    const totalWastage = Number(wastageRes?.val || 0);

    // If item had initial stock before logging was enabled, ensure totalIn reflects stock + out
    if (totalIn === 0 && (item.current_stock || 0) > 0) {
      totalIn = (item.current_stock || 0) + totalOut;
    }

    res.json({
      item,
      total_flow_in: totalIn,
      total_flow_out: totalOut,
      total_wastage: totalWastage,
      current_stock: item.current_stock || 0,
      logs
    });
  } catch (error) {
    console.error('Fetch stock logs error:', error);
    res.status(500).json({ error: 'Failed to fetch stock logs.' });
  }
});

// POST /api/catalog/stock-out-batch - Process multi-item Stock Out / Condemnation Sheet through proper channel
router.post('/stock-out-batch', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const { items, reason, reference_no, disposal_date, authorized_by, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Please specify at least one item with stock-out quantity.' });
    }

    const validItems = items.filter(i => parseInt(i.quantity, 10) > 0);
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Stock-out quantities must be greater than zero.' });
    }

    const officialRef = reference_no && reference_no.trim() !== ''
      ? reference_no.trim()
      : `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const officialDate = disposal_date || new Date().toISOString().split('T')[0];
    const authOfficer = authorized_by || 'Warehouse Manager / Store Incharge';
    const generalReason = reason || 'WASTAGE';

    let totalOutUnits = 0;
    let totalOutValuation = 0;
    const processedItems = [];

    for (const vItem of validItems) {
      const catItem = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [vItem.item_id]);
      if (!catItem) continue;

      const qty = parseInt(vItem.quantity, 10);
      const currentBal = catItem.current_stock || 0;
      if (qty > currentBal) {
        return res.status(400).json({
          error: `Cannot write off ${qty} units for '${catItem.item_name}'. Current stock is only ${currentBal} ${catItem.unit_of_measure}s.`
        });
      }

      const itemReason = vItem.reason || generalReason;
      const newBal = currentBal - qty;
      const unitPrice = catItem.unit_price || 0;
      const gstRate = catItem.default_gst_rate !== undefined ? catItem.default_gst_rate : 5.0;
      const lineVal = (qty * unitPrice) * (1 + gstRate / 100);

      totalOutUnits += qty;
      totalOutValuation += lineVal;

      // Update live stock
      await db.run('UPDATE refreshment_items SET current_stock = ? WHERE id = ?', [newBal, catItem.id]);

      // Insert into item_stock_logs
      const itemNote = vItem.notes && vItem.notes.trim() !== ''
        ? vItem.notes.trim()
        : `${notes || 'Vendor Warehouse Stock-Out & Write-Off'} (Voucher Ref: ${officialRef}, Auth: ${authOfficer})`;

      await db.run(
        `INSERT INTO item_stock_logs
         (item_id, log_type, change_type, previous_stock, quantity, balance_after, unit_price, gst_rate, total_amount, reference_no, expiry_date, notes, created_at, created_by)
         VALUES (?, ?, 'STOCK_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          catItem.id,
          itemReason,
          currentBal,
          qty,
          newBal,
          unitPrice,
          gstRate,
          lineVal,
          officialRef,
          catItem.expiry_date || null,
          itemNote,
          req.user?.id || 1
        ]
      );

      processedItems.push({
        item_id: catItem.id,
        item_name: catItem.item_name,
        quantity: qty,
        previous_stock: currentBal,
        new_balance: newBal,
        reason: itemReason,
        line_valuation: lineVal
      });
    }

    // Insert system audit log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['VENDOR_STOCK_OUT', 0, 'STOCK_OUT_BATCH', req.user?.id || 1, `Vendor stock-out batch: ${totalOutUnits} units written off under Ref #${officialRef} (${generalReason}). Loss Valuation: ₹${totalOutValuation.toFixed(2)}`]
    );

    res.json({
      message: `Stock-Out Voucher #${officialRef} processed successfully! ${totalOutUnits} units deducted from store stock.`,
      reference_no: officialRef,
      total_units: totalOutUnits,
      total_valuation: totalOutValuation,
      items: processedItems
    });
  } catch (error) {
    console.error('Batch stock out error:', error);
    res.status(500).json({ error: error.message || 'Failed to process batch stock-out.' });
  }
});

// POST /api/catalog/:id/stock-out - Process Stock Out / Disposal / Write-Off through proper channel
router.post('/:id/stock-out', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const itemId = req.params.id;
    const { quantity, reason, reference_no, disposal_date, authorized_by, notes } = req.body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Please specify a valid quantity greater than 0.' });
    }

    const item = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found.' });
    }

    const currentBal = item.current_stock || 0;
    if (qty > currentBal) {
      return res.status(400).json({
        error: `Cannot write off ${qty} units. Current stock balance is only ${currentBal} ${item.unit_of_measure}s.`
      });
    }

    const newBal = currentBal - qty;
    const officialRef = reference_no && reference_no.trim() !== '' 
      ? reference_no.trim() 
      : `DISP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const reasonType = reason || 'WASTAGE';
    const authOfficer = authorized_by || 'Officer In-Charge';
    const detailedNote = notes && notes.trim() !== ''
      ? `${notes.trim()} (Authorized By: ${authOfficer}, Order: ${officialRef})`
      : `Proper channel disposal due to ${reasonType}. Sanction Ref: ${officialRef}. Authorized By: ${authOfficer}`;

    const unitPrice = item.unit_price || 0;
    const gstRate = item.default_gst_rate !== undefined ? item.default_gst_rate : 5.0;
    const totalVal = (qty * unitPrice) * (1 + gstRate / 100);

    // Update live current stock
    await db.run(
      'UPDATE refreshment_items SET current_stock = ? WHERE id = ?',
      [newBal, itemId]
    );

    // Record audited stock out log
    await db.run(
      `INSERT INTO item_stock_logs
       (item_id, log_type, change_type, previous_stock, quantity, balance_after, unit_price, gst_rate, total_amount, reference_no, expiry_date, notes, created_at, created_by)
       VALUES (?, ?, 'STOCK_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        itemId,
        reasonType,
        currentBal,
        qty,
        newBal,
        unitPrice,
        gstRate,
        totalVal,
        officialRef,
        item.expiry_date || null,
        detailedNote,
        req.user?.id || 1
      ]
    );

    // Record system audit log
    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM_STOCK', itemId, 'STOCK_OUT', req.user.id, `Stock-out of ${qty} units of ${item.item_name} via proper channel (${reasonType}). Ref: ${officialRef}. Prev: ${currentBal}, New: ${newBal}`]
    );

    res.json({
      message: `Successfully processed stock out of ${qty} ${item.unit_of_measure}s under Reference #${officialRef}.`,
      item: {
        id: itemId,
        current_stock: newBal,
        total_wastage: qty
      }
    });
  } catch (error) {
    console.error('Stock-out error:', error);
    res.status(500).json({ error: error.message || 'Failed to process stock-out through proper channel.' });
  }
});
// ==========================================
// STOCK DEMAND INDENTS WORKFLOW ENDPOINTS
// 1. DEMAND GENERATED -> 2. DEMAND FULFILLED -> 3. TAKEN ON CHARGE AS STOCK IN
// ==========================================

// GET /api/catalog/stock-demands - Fetch recent stock demand indents
router.get('/stock-demands', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const indents = await db.all(
      `SELECT sdi.*, 
              u1.name as created_by_name,
              u2.name as fulfilled_by_name,
              u3.name as taken_on_charge_by_name
       FROM stock_demand_indents sdi
       LEFT JOIN users u1 ON sdi.created_by = u1.id
       LEFT JOIN users u2 ON sdi.fulfilled_by = u2.id
       LEFT JOIN users u3 ON sdi.taken_on_charge_by = u3.id
       ORDER BY sdi.created_at DESC LIMIT 30`
    );

    for (const indent of indents) {
      const items = await db.all(
        `SELECT sdii.*, ri.image_url, ri.current_stock as live_stock
         FROM stock_demand_indent_items sdii
         LEFT JOIN refreshment_items ri ON sdii.item_id = ri.id
         WHERE sdii.indent_id = ?`,
        [indent.id]
      );
      indent.items = items;
    }

    res.json(indents);
  } catch (error) {
    console.error('Fetch stock demands error:', error);
    res.status(500).json({ error: 'Failed to fetch stock demand indents.' });
  }
});

// POST /api/catalog/stock-demands - Generate new Stock Demand Indent (DEMAND GENERATED)
router.post('/stock-demands', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const { items, notes, indent_date, supplier_name } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Please specify at least one item with demand quantity.' });
    }

    const validItems = items.filter(i => parseInt(i.demand_quantity, 10) > 0);
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Demand quantities must be greater than zero.' });
    }

    // Fetch catalog items to verify details & calculate amounts
    const catalogItems = await db.all('SELECT * FROM refreshment_items');
    const catalogMap = new Map(catalogItems.map(i => [i.id, i]));

    let totalUnits = 0;
    let subtotal = 0;
    let totalGstAmount = 0;
    const resolvedItems = [];

    for (const vItem of validItems) {
      const catItem = catalogMap.get(parseInt(vItem.item_id, 10));
      if (!catItem) continue;

      const qty = parseInt(vItem.demand_quantity, 10);
      const userRate = vItem.rate !== undefined && vItem.rate !== '' && !isNaN(parseFloat(vItem.rate))
        ? parseFloat(vItem.rate)
        : (catItem.unit_price || 0);
      const userGstRate = vItem.gst_rate !== undefined && vItem.gst_rate !== '' && !isNaN(parseFloat(vItem.gst_rate))
        ? parseFloat(vItem.gst_rate)
        : 0;

      const lineSubtotal = qty * userRate;
      const lineGst = lineSubtotal * (userGstRate / 100);
      const lineTotal = lineSubtotal + lineGst;

      totalUnits += qty;
      subtotal += lineSubtotal;
      totalGstAmount += lineGst;

      resolvedItems.push({
        item_id: catItem.id,
        item_name: catItem.item_name,
        unit_of_measure: catItem.unit_of_measure,
        unit_price: userRate,
        gst_rate: userGstRate,
        demand_quantity: qty,
        subtotal: lineSubtotal,
        gst_amount: lineGst,
        total_amount: lineTotal,
        batch_expiry_date: vItem.batch_expiry_date || vItem.expiry_date || null
      });
    }

    const gstAmount = totalGstAmount;
    const grandTotal = subtotal + gstAmount;
    const indentNumber = `IND-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const officialDate = indent_date || new Date().toISOString().split('T')[0];
    const vendorName = supplier_name || 'State Central Refreshment Hub';

    const indentRes = await db.run(
      `INSERT INTO stock_demand_indents 
       (indent_number, indent_date, status, supplier_name, total_items, total_units, subtotal, gst_amount, grand_total, created_by, notes)
       VALUES (?, ?, 'DEMAND_GENERATED', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [indentNumber, officialDate, vendorName, resolvedItems.length, totalUnits, subtotal, gstAmount, grandTotal, req.user?.id || 1, notes || 'Standard Stock Replenishment Demand']
    );

    const indentId = indentRes.lastID;

    for (const item of resolvedItems) {
      await db.run(
        `INSERT INTO stock_demand_indent_items
         (indent_id, item_id, item_name, unit_of_measure, unit_price, gst_rate, demand_quantity, received_quantity, subtotal, gst_amount, total_amount, batch_expiry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [indentId, item.item_id, item.item_name, item.unit_of_measure, item.unit_price, item.gst_rate, item.demand_quantity, item.demand_quantity, item.subtotal, item.gst_amount, item.total_amount, item.batch_expiry_date || null]
      );
    }

    res.json({
      message: `Demand Indent #${indentNumber} generated successfully!`,
      indent: {
        id: indentId,
        indent_number: indentNumber,
        indent_date: officialDate,
        status: 'DEMAND_GENERATED',
        supplier_name: vendorName,
        total_items: resolvedItems.length,
        total_units: totalUnits,
        subtotal: subtotal,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        items: resolvedItems
      }
    });
  } catch (error) {
    console.error('Create stock demand error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate stock demand indent.' });
  }
});

// PUT /api/catalog/stock-demands/:id/fulfill - Mark as DEMAND FULFILLED
router.put('/stock-demands/:id/fulfill', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const indentId = req.params.id;

    const indent = await db.get('SELECT * FROM stock_demand_indents WHERE id = ?', [indentId]);
    if (!indent) {
      return res.status(404).json({ error: 'Stock Demand Indent not found.' });
    }

    const invoiceNo = req.body.invoice_no || null;
    const vendor = req.body.supplier_name || indent.supplier_name;

    await db.run(
      `UPDATE stock_demand_indents 
       SET status = 'DEMAND_FULFILLED', fulfilled_at = NOW(), fulfilled_by = ?, invoice_no = COALESCE(?, invoice_no), supplier_name = ? 
       WHERE id = ?`,
      [req.user?.id || 1, invoiceNo, vendor, indentId]
    );

    res.json({
      message: `Demand Indent #${indent.indent_number} marked as DEMAND FULFILLED (Supplies received at store)!`,
      status: 'DEMAND_FULFILLED'
    });
  } catch (error) {
    console.error('Fulfill stock demand error:', error);
    res.status(500).json({ error: error.message || 'Failed to fulfill demand.' });
  }
});

// POST /api/catalog/stock-demands/:id/take-on-charge - Take on charge as stock in
router.post('/stock-demands/:id/take-on-charge', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const db = await getDB();
    const indentId = req.params.id;

    const indent = await db.get('SELECT * FROM stock_demand_indents WHERE id = ?', [indentId]);
    if (!indent) {
      return res.status(404).json({ error: 'Stock Demand Indent not found.' });
    }

    if (indent.status === 'TAKEN_ON_CHARGE') {
      return res.status(400).json({ error: 'This demand indent has already been taken on charge into stock.' });
    }

    const indentItems = await db.all('SELECT * FROM stock_demand_indent_items WHERE indent_id = ?', [indentId]);
    if (indentItems.length === 0) {
      return res.status(400).json({ error: 'No items found in this demand indent.' });
    }

    // Restock each item and update catalog live rates from incoming demand
    for (const item of indentItems) {
      const curItem = await db.get('SELECT current_stock, expiry_date, unit_price, default_gst_rate FROM refreshment_items WHERE id = ?', [item.item_id]);
      const prevStock = curItem ? (curItem.current_stock || 0) : 0;
      const newStock = prevStock + item.demand_quantity;
      const expDate = curItem?.expiry_date || null;

      const demandRate = (item.unit_price !== undefined && item.unit_price !== null && Number(item.unit_price) > 0)
        ? Number(item.unit_price)
        : (curItem?.unit_price || 0);
      const demandGst = (item.gst_rate !== undefined && item.gst_rate !== null && Number(item.gst_rate) >= 0)
        ? Number(item.gst_rate)
        : (curItem?.default_gst_rate !== undefined ? curItem.default_gst_rate : 5.0);

      // Update current stock, incoming rate, GST rate, expiry date, and restock timestamp in live catalog
      await db.run(
        `UPDATE refreshment_items 
         SET current_stock = ?, 
             unit_price = ?, 
             cost_price = ?, 
             default_gst_rate = ?, 
             expiry_date = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE expiry_date END,
             last_restocked_at = NOW(), 
             is_active = 1 
         WHERE id = ?`,
        [newStock, demandRate, demandRate, demandGst, item.batch_expiry_date || null, item.batch_expiry_date || null, item.batch_expiry_date || null, item.item_id]
      );

      // Log into stock ledger with full financial, audit, and indent traceability
      await db.run(
        `INSERT INTO item_stock_logs 
         (item_id, log_type, change_type, previous_stock, quantity, balance_after, unit_price, gst_rate, total_amount, indent_id, reference_no, expiry_date, notes, created_by)
         VALUES (?, 'STOCK_IN', 'STOCK_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.item_id,
          prevStock,
          item.demand_quantity,
          newStock,
          demandRate,
          demandGst,
          item.total_amount || ((item.demand_quantity * demandRate) * (1 + demandGst / 100)),
          indentId,
          indent.indent_number,
          item.batch_expiry_date || expDate,
          `Taken on charge from Demand Indent #${indent.indent_number} at Rate ₹${demandRate} (+${demandGst}% GST)`,
          req.user?.id || 1
        ]
      );
    }

    // Update indent status and recording officer
    await db.run(
      `UPDATE stock_demand_indents 
       SET status = 'TAKEN_ON_CHARGE', 
           received_units = total_units,
           taken_on_charge_at = NOW(), 
           taken_on_charge_by = ? 
       WHERE id = ?`,
      [req.user?.id || 1, indentId]
    );

    res.json({
      message: `Demand Indent #${indent.indent_number} successfully TAKEN ON CHARGE AS STOCK IN! All live balances updated.`,
      status: 'TAKEN_ON_CHARGE'
    });
  } catch (error) {
    console.error('Take on charge error:', error);
    res.status(500).json({ error: error.message || 'Failed to take demand on charge as stock in.' });
  }
});

module.exports = router;
