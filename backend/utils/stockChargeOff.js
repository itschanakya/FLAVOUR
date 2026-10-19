/**
 * stockChargeOff.js
 * Utility to charge off inventory stock when demands are delivered,
 * and restore stock if delivery is reset or canceled.
 */

async function chargeOffDemandStock(db, demandId, userId, noteReason = 'Delivery Handover') {
  if (!demandId) return { success: false, reason: 'No demandId provided' };

  const demand = await db.get('SELECT * FROM demands WHERE id = ? AND is_deleted = 0', [demandId]);
  if (!demand) return { success: false, reason: 'Demand not found' };

  // Idempotency: if already charged off, do not deduct again
  if (demand.stock_charged_off) {
    return { success: true, alreadyChargedOff: true, chargedItems: [] };
  }

  // 1. Fetch dedicated menu for this demand's unit
  let menuItems = [];
  if (demand.unit_id) {
    menuItems = await db.all(`
      SELECT umi.item_id, umi.quantity as qty_per_packet, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
      FROM unit_menu_items umi
      JOIN refreshment_items ri ON umi.item_id = ri.id
      WHERE umi.unit_id = ?
    `, [demand.unit_id]);
  }

  // 2. Fallback to active packet template if unit has no custom menu
  if (!menuItems || menuItems.length === 0) {
    const defaultTemplate = await db.get("SELECT id FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    if (defaultTemplate) {
      menuItems = await db.all(`
        SELECT pti.item_id, pti.quantity as qty_per_packet, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
        FROM packet_template_items pti
        JOIN refreshment_items ri ON pti.item_id = ri.id
        WHERE pti.template_id = ?
      `, [defaultTemplate.id]);
    }
  }

  // Determine total packets
  const qtyRow = await db.get('SELECT SUM(quantity) as total_qty FROM demand_items WHERE demand_id = ?', [demandId]);
  const totalPackets = qtyRow?.total_qty || demand.total_quantity || 1;
  const chargedItems = [];

  // 3. Fallback to direct demand_items if no unit menu or template items
  if (!menuItems || menuItems.length === 0) {
    const directItems = await db.all(`
      SELECT di.item_id, di.quantity as required_qty, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
      FROM demand_items di
      JOIN refreshment_items ri ON di.item_id = ri.id
      WHERE di.demand_id = ?
    `, [demandId]);

    for (const dItem of directItems) {
      const requiredQty = dItem.required_qty || 1;
      const currentStock = dItem.current_stock || 0;
      const newStock = Math.max(0, currentStock - requiredQty);

      await db.run(
        "UPDATE refreshment_items SET current_stock = ? WHERE id = ?",
        [newStock, dItem.item_id]
      );

      await db.run(
        `INSERT INTO item_stock_logs (
          item_id, log_type, change_type, previous_stock, quantity, balance_after,
          unit_price, total_amount, reference_no, expiry_date, notes, created_by
        ) VALUES (?, 'DISPATCH_CHARGE_OFF', 'DISPATCH_CHARGE_OFF', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dItem.item_id,
          currentStock,
          requiredQty,
          newStock,
          dItem.unit_price || 0,
          (dItem.unit_price || 0) * requiredQty,
          demand.demand_number,
          dItem.expiry_date || null,
          `${noteReason}: Demand ${demand.demand_number} (${requiredQty} ${dItem.unit_of_measure || 'units'})`,
          userId || null
        ]
      );

      chargedItems.push({
        item_id: dItem.item_id,
        item_name: dItem.item_name,
        deducted_quantity: requiredQty,
        remaining_stock: newStock
      });
    }
  } else {
    for (const mItem of menuItems) {
      const requiredQty = (mItem.qty_per_packet || 1) * totalPackets;
      const currentItem = await db.get("SELECT * FROM refreshment_items WHERE id = ?", [mItem.item_id]);
      if (!currentItem) continue;

      const currentStock = currentItem.current_stock || 0;
      const newStock = Math.max(0, currentStock - requiredQty);

      await db.run(
        "UPDATE refreshment_items SET current_stock = ? WHERE id = ?",
        [newStock, mItem.item_id]
      );

      await db.run(
        `INSERT INTO item_stock_logs (
          item_id, log_type, change_type, previous_stock, quantity, balance_after,
          unit_price, total_amount, reference_no, expiry_date, notes, created_by
        ) VALUES (?, 'DISPATCH_CHARGE_OFF', 'DISPATCH_CHARGE_OFF', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mItem.item_id,
          currentStock,
          requiredQty,
          newStock,
          currentItem.unit_price || 0,
          (currentItem.unit_price || 0) * requiredQty,
          demand.demand_number,
          currentItem.expiry_date || null,
          `${noteReason}: Demand ${demand.demand_number} (${totalPackets} pkts × ${mItem.qty_per_packet} = ${requiredQty} ${currentItem.unit_of_measure || 'units'})`,
          userId || null
        ]
      );

      chargedItems.push({
        item_id: mItem.item_id,
        item_name: currentItem.item_name,
        deducted_quantity: requiredQty,
        remaining_stock: newStock
      });
    }
  }

  await db.run(
    `UPDATE demands SET stock_charged_off = 1, stock_charged_off_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [demandId]
  );

  return { success: true, chargedItems, totalPackets };
}

/**
 * Reverses a previously charged-off demand stock when a delivery is reset/reverted.
 */
async function revertDemandStockChargeOff(db, demandId, userId, noteReason = 'Delivery Reset') {
  if (!demandId) return { success: false, reason: 'No demandId provided' };

  const demand = await db.get('SELECT * FROM demands WHERE id = ?', [demandId]);
  if (!demand || !demand.stock_charged_off) {
    return { success: true, notChargedOff: true };
  }

  // 1. Fetch menu composition
  let menuItems = [];
  if (demand.unit_id) {
    menuItems = await db.all(`
      SELECT umi.item_id, umi.quantity as qty_per_packet, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
      FROM unit_menu_items umi
      JOIN refreshment_items ri ON umi.item_id = ri.id
      WHERE umi.unit_id = ?
    `, [demand.unit_id]);
  }

  if (!menuItems || menuItems.length === 0) {
    const defaultTemplate = await db.get("SELECT id FROM packet_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    if (defaultTemplate) {
      menuItems = await db.all(`
        SELECT pti.item_id, pti.quantity as qty_per_packet, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
        FROM packet_template_items pti
        JOIN refreshment_items ri ON pti.item_id = ri.id
        WHERE pti.template_id = ?
      `, [defaultTemplate.id]);
    }
  }

  const qtyRow = await db.get('SELECT SUM(quantity) as total_qty FROM demand_items WHERE demand_id = ?', [demandId]);
  const totalPackets = qtyRow?.total_qty || demand.total_quantity || 1;

  if (!menuItems || menuItems.length === 0) {
    const directItems = await db.all(`
      SELECT di.item_id, di.quantity as required_qty, ri.item_name, ri.current_stock, ri.unit_of_measure, ri.expiry_date, ri.unit_price
      FROM demand_items di
      JOIN refreshment_items ri ON di.item_id = ri.id
      WHERE di.demand_id = ?
    `, [demandId]);

    for (const dItem of directItems) {
      const restoreQty = dItem.required_qty || 1;
      const currentItem = await db.get("SELECT * FROM refreshment_items WHERE id = ?", [dItem.item_id]);
      if (!currentItem) continue;

      const currentStock = currentItem.current_stock || 0;
      const newStock = currentStock + restoreQty;

      await db.run("UPDATE refreshment_items SET current_stock = ? WHERE id = ?", [newStock, dItem.item_id]);

      await db.run(
        `INSERT INTO item_stock_logs (
          item_id, log_type, change_type, previous_stock, quantity, balance_after,
          unit_price, total_amount, expiry_date, notes, created_by
        ) VALUES (?, 'CORRECTION_RESTORE', 'CORRECTION_RESTORE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dItem.item_id,
          currentStock,
          restoreQty,
          newStock,
          currentItem.unit_price || 0,
          (currentItem.unit_price || 0) * restoreQty,
          currentItem.expiry_date || null,
          `${noteReason}: Demand ${demand.demand_number} (${restoreQty} units restored to stock)`,
          userId || null
        ]
      );
    }
  } else {
    for (const mItem of menuItems) {
      const restoreQty = (mItem.qty_per_packet || 1) * totalPackets;
      const currentItem = await db.get("SELECT * FROM refreshment_items WHERE id = ?", [mItem.item_id]);
      if (!currentItem) continue;

      const currentStock = currentItem.current_stock || 0;
      const newStock = currentStock + restoreQty;

      await db.run("UPDATE refreshment_items SET current_stock = ? WHERE id = ?", [newStock, mItem.item_id]);

      await db.run(
        `INSERT INTO item_stock_logs (
          item_id, log_type, change_type, previous_stock, quantity, balance_after,
          unit_price, total_amount, expiry_date, notes, created_by
        ) VALUES (?, 'CORRECTION_RESTORE', 'CORRECTION_RESTORE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mItem.item_id,
          currentStock,
          restoreQty,
          newStock,
          currentItem.unit_price || 0,
          (currentItem.unit_price || 0) * restoreQty,
          currentItem.expiry_date || null,
          `${noteReason}: Demand ${demand.demand_number} (${totalPackets} pkts × ${mItem.qty_per_packet} = ${restoreQty} units restored to stock)`,
          userId || null
        ]
      );
    }
  }

  await db.run(
    `UPDATE demands SET stock_charged_off = 0, stock_charged_off_at = NULL WHERE id = ?`,
    [demandId]
  );

  return { success: true };
}

module.exports = {
  chargeOffDemandStock,
  revertDemandStockChargeOff
};
