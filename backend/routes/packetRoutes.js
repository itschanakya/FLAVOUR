const express = require('express');
const router = express.Router();
const { getDB, syncStandardPacketPrice } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/packets/current - Get active standard packet template with items & expiry dates
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const todayStr = new Date().toISOString().split('T')[0];

    let template = await db.get("SELECT * FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    if (!template) {
      const initRes = await db.run("INSERT INTO packet_templates (name, target_budget, gst_rate, is_active) VALUES ('Standard Cadet Refreshment Packet', 75.0, 5.0, 1)");
      template = { id: initRes.lastID, name: 'Standard Cadet Refreshment Packet', target_budget: 75.0, gst_rate: 5.0, is_active: 1 };
    }

    const items = await db.all(
      `SELECT pti.id, pti.template_id, pti.item_id, pti.quantity, 
              COALESCE(pti.expiry_date, ri.expiry_date) as expiry_date,
              ri.item_name, ri.unit_price, ri.unit_of_measure, ri.current_stock, ri.is_active
       FROM packet_template_items pti
       JOIN refreshment_items ri ON pti.item_id = ri.id
       WHERE pti.template_id = ?
       ORDER BY ri.item_name ASC`,
      [template.id]
    );

    // Calculate item subtotal, GST, and check expiry status
    let subtotal = 0;
    const packetItems = items.map(item => {
      const lineCost = (item.unit_price || 0) * (item.quantity || 1);
      subtotal += lineCost;
      const isExpired = !!(item.expiry_date && item.expiry_date <= todayStr);
      return {
        ...item,
        line_total: lineCost,
        is_expired: isExpired
      };
    });

    const gstRate = template.gst_rate || 5.0;
    const gstAmount = parseFloat((subtotal * (gstRate / 100)).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    const targetBudget = template.target_budget || 75.0;
    const difference = parseFloat((grandTotal - targetBudget).toFixed(2));

    let budgetStatus = 'BALANCED';
    if (difference < -0.01) budgetStatus = 'UNDER_BUDGET';
    else if (difference > 0.01) budgetStatus = 'EXCESS_BUDGET';

    res.json({
      template,
      items: packetItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      gst_rate: gstRate,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      target_budget: targetBudget,
      difference: Math.abs(difference),
      budget_status: budgetStatus,
      has_expired_items: packetItems.some(i => i.is_expired)
    });

  } catch (error) {
    console.error('Fetch packet template error:', error);
    res.status(500).json({ error: 'Failed to retrieve standard packet template.' });
  }
});

// POST /api/packets/save - Admin updates standard packet configuration
router.post('/save', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { items, name, target_budget, gst_rate } = req.body;
    const db = await getDB();
    const todayStr = new Date().toISOString().split('T')[0];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Packet must contain at least one item.' });
    }

    // Validate that NO expired items are included
    for (const it of items) {
      const catItem = await db.get('SELECT * FROM refreshment_items WHERE id = ?', [it.item_id]);
      if (!catItem) {
        return res.status(400).json({ error: `Item with ID ${it.item_id} not found.` });
      }

      const checkExp = it.expiry_date || catItem.expiry_date;
      if (checkExp && checkExp <= todayStr) {
        return res.status(400).json({
          error: `Item '${catItem.item_name}' is EXPIRED (Expiry: ${checkExp}). Expired items cannot be added to refreshment packets. Please restock with a fresh batch first!`
        });
      }
    }

    // Enforce statutory budget ceiling: Price NOT MORE THAN ₹75.00
    let totalItemsCost = 0;
    for (const it of items) {
      const catItem = await db.get('SELECT unit_price FROM refreshment_items WHERE id = ?', [it.item_id]);
      const qty = parseInt(it.quantity, 10) || 1;
      totalItemsCost += (catItem?.unit_price || 0) * qty;
    }
    const gstRateVal = gst_rate !== undefined ? parseFloat(gst_rate) : 5.0;
    const computedGst = parseFloat((totalItemsCost * (gstRateVal / 100)).toFixed(2));
    const computedGrandTotal = parseFloat((totalItemsCost + computedGst).toFixed(2));

    if (computedGrandTotal > 75.00) {
      return res.status(400).json({
        error: `Standard Refreshment Packet price cannot exceed ₹75.00! Current total with ${gstRateVal}% GST is ₹${computedGrandTotal.toFixed(2)}. Please adjust item selection or quantities.`
      });
    }

    // Get or create template
    let template = await db.get("SELECT * FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    let templateId = template ? template.id : null;

    if (!templateId) {
      const resT = await db.run(
        "INSERT INTO packet_templates (name, target_budget, gst_rate, is_active) VALUES (?, ?, ?, 1)",
        [name || 'Cadet Standard Refreshment Packet', target_budget || 75.0, gst_rate || 5.0]
      );
      templateId = resT.lastID;
    } else {
      await db.run(
        "UPDATE packet_templates SET name = ?, target_budget = ?, gst_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name || template.name, target_budget || 75.0, gst_rate || 5.0, templateId]
      );
    }

    // Replace items
    await db.run("DELETE FROM packet_template_items WHERE template_id = ?", [templateId]);

    for (const it of items) {
      const qty = parseInt(it.quantity, 10) || 1;
      const expDate = it.expiry_date || null;
      await db.run(
        "INSERT INTO packet_template_items (template_id, item_id, quantity, expiry_date) VALUES (?, ?, ?, ?)",
        [templateId, it.item_id, qty, expDate]
      );
    }

    await db.run(
      'INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)',
      ['PACKET_TEMPLATE', templateId, 'UPDATED', req.user.id, `Updated standard packet composition with ${items.length} items`]
    );

    // Synchronize catalog Standard Refreshment Packet and existing demands
    const syncedGrandTotal = await syncStandardPacketPrice(db);

    res.json({ 
      message: 'Standard Refreshment Packet configuration saved successfully.',
      grand_total: syncedGrandTotal
    });

  } catch (error) {
    console.error('Save packet template error:', error);
    res.status(500).json({ error: 'Failed to save packet configuration.' });
  }
});

module.exports = router;
