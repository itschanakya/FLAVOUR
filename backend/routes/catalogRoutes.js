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

      const consumedToday = consumedRes ? (consumedRes.consumed_today || 0) : 0;
      const currentStock = item.current_stock !== undefined && item.current_stock !== null ? item.current_stock : 0;
      const isExpired = !!(item.expiry_date && item.expiry_date <= todayStr);
      const isOutOfStock = currentStock <= 0;
      const isLowStock = currentStock > 0 && currentStock <= (item.min_threshold || 10);

      return {
        ...item,
        current_stock: currentStock,
        consumed_today: consumedToday,
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

    // Delete related logs and template entries first
    await db.run('DELETE FROM packet_template_items WHERE item_id = ?', [itemId]);
    await db.run('DELETE FROM item_stock_logs WHERE item_id = ?', [itemId]);
    await db.run('DELETE FROM refreshment_items WHERE id = ?', [itemId]);

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['ITEM', itemId, 'DELETED', req.user.id, `Deleted catalog item ${item.item_name}`]
    );

    res.json({ message: `Item '${item.item_name}' deleted successfully.` });
  } catch (error) {
    console.error('Delete catalog item error:', error);
    res.status(500).json({ error: 'Failed to delete catalog item.' });
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
      'UPDATE refreshment_items SET current_stock = ?, expiry_date = ?, is_active = 1 WHERE id = ?',
      [newBalance, expiry_date, itemId]
    );

    // Record stock log entry
    await db.run(
      'INSERT INTO item_stock_logs (item_id, log_type, quantity, balance_after, expiry_date, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [itemId, 'STOCK_IN', qty, newBalance, expiry_date, notes || 'Shipment Stock-In', entryTimestamp, req.user.id]
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

// GET /api/catalog/:id/stock-logs - Fetch stock history logs for an item
router.get('/:id/stock-logs', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const logs = await db.all(
      `SELECT sl.*, u.name as added_by_name 
       FROM item_stock_logs sl
       LEFT JOIN users u ON sl.created_by = u.id
       WHERE sl.item_id = ?
       ORDER BY sl.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(logs);
  } catch (error) {
    console.error('Fetch stock logs error:', error);
    res.status(500).json({ error: 'Failed to fetch stock logs.' });
  }
});

module.exports = router;
