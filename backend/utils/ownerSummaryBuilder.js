/**
 * ownerSummaryBuilder.js
 * Shared executive summary builder for DocumentationPage & Automated Daily Owner Email/PDF.
 */

function getISTDateParts(offsetDays = 0) {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000) + (offsetDays * 86400000);
  const d = new Date(istMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return {
    ymd: `${yyyy}-${mm}-${dd}`,
    ym: `${yyyy}-${mm}`,
    dmy: `${dd}-${mm}-${yyyy}`
  };
}

async function buildOwnerSummaryData(db, filters = {}) {
  const { date, unit_code, pin_code } = filters;

  let scopeSql = ` WHERE d.is_deleted = 0`;
  const scopeParams = [];

  if (date && date !== 'ALL') {
    scopeSql += ` AND d.demand_date = ?`;
    scopeParams.push(date);
  }
  if (unit_code && unit_code !== 'ALL') {
    scopeSql += ` AND (u.unit_code = ? OR u.unit_name = ?)`;
    scopeParams.push(unit_code, unit_code);
  }
  if (pin_code && pin_code !== 'ALL') {
    scopeSql += ` AND i.pin_code = ?`;
    scopeParams.push(pin_code);
  }

  const activeSql = `${scopeSql} AND d.status NOT IN ('REJECTED', 'CANCELLED')`;

  // 1. Top-level KPIs (Generated vs Delivered vs Pending vs Docs Pending)
  const kpiRow = await db.get(
    `SELECT
       COUNT(*) as generated_count,
       COALESCE(SUM(COALESCE(di_agg.total_qty, 0)), 0) as generated_packets,
       COALESCE(SUM(COALESCE(di_agg.total_amt, 0)), 0) as generated_amount,
       SUM(CASE WHEN d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED' THEN 1 ELSE 0 END) as delivered_count,
       COALESCE(SUM(CASE WHEN d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED' THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as delivered_packets,
       COALESCE(SUM(CASE WHEN d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED' THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as delivered_amount,
       SUM(CASE WHEN (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') AND (d.delivery_receipt_url IS NULL OR d.delivery_receipt_url = '' OR d.invoice_url IS NULL OR d.invoice_url = '') THEN 1 ELSE 0 END) as docs_pending_count,
       SUM(CASE WHEN (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') AND (d.delivery_receipt_url IS NULL OR d.delivery_receipt_url = '') THEN 1 ELSE 0 END) as receipt_pending_count,
       SUM(CASE WHEN (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') AND (d.invoice_url IS NULL OR d.invoice_url = '') THEN 1 ELSE 0 END) as bill_pending_count,
       COALESCE(SUM(CASE WHEN (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') AND (d.delivery_receipt_url IS NULL OR d.delivery_receipt_url = '' OR d.invoice_url IS NULL OR d.invoice_url = '') THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as docs_pending_amount
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id,
              SUM(quantity) as total_qty,
              SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items
       GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${activeSql}`,
    scopeParams
  );

  const generatedCount = Number(kpiRow?.generated_count) || 0;
  const generatedPackets = Number(kpiRow?.generated_packets) || 0;
  const generatedAmount = Number(kpiRow?.generated_amount) || 0;
  const deliveredCount = Number(kpiRow?.delivered_count) || 0;
  const deliveredPackets = Number(kpiRow?.delivered_packets) || 0;
  const deliveredAmount = Number(kpiRow?.delivered_amount) || 0;

  // 2. Item-wise Summary (Demanded Qty/Amt, Delivered Qty/Amt, Balance Qty/Amt, Avg Rate)
  const itemRows = await db.all(
    `SELECT
       COALESCE(ri.item_name, 'Standard Refreshment Packet') as item_name,
       COALESCE(SUM(di.quantity), 0) as demanded_packets,
       COALESCE(SUM(di.quantity * COALESCE(di.unit_price_snapshot, 0)), 0) as demanded_amount,
       COALESCE(SUM(CASE WHEN d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED' THEN di.quantity ELSE 0 END), 0) as delivered_packets,
       COALESCE(SUM(CASE WHEN d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED' THEN di.quantity * COALESCE(di.unit_price_snapshot, 0) ELSE 0 END), 0) as delivered_amount
     FROM demand_items di
     JOIN demands d ON di.demand_id = d.id
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN refreshment_items ri ON di.item_id = ri.id
     ${activeSql}
     GROUP BY COALESCE(ri.item_name, 'Standard Refreshment Packet')
     ORDER BY delivered_packets DESC, demanded_packets DESC`,
    scopeParams
  );

  const itemWise = itemRows.map(r => {
    const demandedPkts = Number(r.demanded_packets) || 0;
    const demandedAmt = Number(r.demanded_amount) || 0;
    const deliveredPkts = Number(r.delivered_packets) || 0;
    const deliveredAmt = Number(r.delivered_amount) || 0;
    const balPkts = Math.max(0, demandedPkts - deliveredPkts);
    const balAmt = Math.max(0, demandedAmt - deliveredAmt);
    return {
      item_name: r.item_name,
      demanded_packets: demandedPkts,
      demanded_amount: demandedAmt,
      delivered_packets: deliveredPkts,
      delivered_amount: deliveredAmt,
      balance_packets: balPkts,
      balance_amount: balAmt,
      avg_rate: deliveredPkts > 0 ? Math.round(deliveredAmt / deliveredPkts) : (demandedPkts > 0 ? Math.round(demandedAmt / demandedPkts) : 0)
    };
  });

  // 3. Specific Last Day Demanded & Delivered Table (above Delivered to Whom)
  const todayIST = getISTDateParts(0).ymd;
  const yesterdayIST = getISTDateParts(-1).ymd;

  // Pick specific filtered date if set, else yesterday if it has demands, else latest demand_date <= todayIST, else latest demand_date overall
  let targetLastDate = null;
  if (date && date !== 'ALL') {
    targetLastDate = date;
  } else {
    const yestCheck = await db.get(
      `SELECT COUNT(*) as cnt FROM demands d LEFT JOIN institutions i ON d.institution_id = i.id JOIN units u ON d.unit_id = u.id ${scopeSql} AND d.demand_date = ?`,
      [...scopeParams, yesterdayIST]
    );
    if (Number(yestCheck?.cnt) > 0) {
      targetLastDate = yesterdayIST;
    } else {
      const latestRow = await db.get(
        `SELECT MAX(d.demand_date) as max_date FROM demands d LEFT JOIN institutions i ON d.institution_id = i.id JOIN units u ON d.unit_id = u.id ${scopeSql} AND d.demand_date <= ?`,
        [...scopeParams, todayIST]
      );
      targetLastDate = latestRow?.max_date || null;
      if (!targetLastDate) {
        const anyLatest = await db.get(
          `SELECT MAX(d.demand_date) as max_date FROM demands d LEFT JOIN institutions i ON d.institution_id = i.id JOIN units u ON d.unit_id = u.id ${scopeSql}`,
          scopeParams
        );
        targetLastDate = anyLatest?.max_date || yesterdayIST;
      }
    }
  }

  const lastDayUnitRows = await db.all(
    `SELECT
       COALESCE(u.unit_code, u.unit_name, 'Unassigned') as unit_name,
       SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') THEN 1 ELSE 0 END) as demanded_count,
       COALESCE(SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as demanded_packets,
       COALESCE(SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as demanded_amount,
       SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') THEN 1 ELSE 0 END) as delivered_count,
       COALESCE(SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as delivered_packets,
       COALESCE(SUM(CASE WHEN d.status NOT IN ('REJECTED', 'CANCELLED') AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED') THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as delivered_amount,
       SUM(CASE WHEN d.status IN ('REJECTED', 'CANCELLED') THEN 1 ELSE 0 END) as cancelled_count,
       COALESCE(SUM(CASE WHEN d.status IN ('REJECTED', 'CANCELLED') THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as cancelled_packets
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${scopeSql} AND d.demand_date = ?
     GROUP BY COALESCE(u.unit_code, u.unit_name, 'Unassigned')
     ORDER BY demanded_packets DESC`,
    [...scopeParams, targetLastDate]
  );

  const lastDayTotals = {
    demanded_count: 0,
    demanded_packets: 0,
    demanded_amount: 0,
    delivered_count: 0,
    delivered_packets: 0,
    delivered_amount: 0,
    pending_count: 0,
    pending_packets: 0,
    cancelled_count: 0,
    cancelled_packets: 0
  };

  const lastDayBreakdown = lastDayUnitRows.map(r => {
    const demCnt = Number(r.demanded_count) || 0;
    const demPkt = Number(r.demanded_packets) || 0;
    const demAmt = Number(r.demanded_amount) || 0;
    const delCnt = Number(r.delivered_count) || 0;
    const delPkt = Number(r.delivered_packets) || 0;
    const delAmt = Number(r.delivered_amount) || 0;
    const pendCnt = Math.max(0, demCnt - delCnt);
    const pendPkt = Math.max(0, demPkt - delPkt);
    const canCnt = Number(r.cancelled_count) || 0;
    const canPkt = Number(r.cancelled_packets) || 0;

    lastDayTotals.demanded_count += demCnt;
    lastDayTotals.demanded_packets += demPkt;
    lastDayTotals.demanded_amount += demAmt;
    lastDayTotals.delivered_count += delCnt;
    lastDayTotals.delivered_packets += delPkt;
    lastDayTotals.delivered_amount += delAmt;
    lastDayTotals.pending_count += pendCnt;
    lastDayTotals.pending_packets += pendPkt;
    lastDayTotals.cancelled_count += canCnt;
    lastDayTotals.cancelled_packets += canPkt;

    return {
      unit_name: r.unit_name,
      demanded_count: demCnt,
      demanded_packets: demPkt,
      demanded_amount: demAmt,
      delivered_count: delCnt,
      delivered_packets: delPkt,
      delivered_amount: delAmt,
      pending_count: pendCnt,
      pending_packets: pendPkt,
      cancelled_count: canCnt,
      cancelled_packets: canPkt
    };
  });

  const lastDayDemandRows = await db.all(
    `SELECT
       d.id,
       d.demand_number,
       COALESCE(u.unit_code, u.unit_name, 'Unassigned') as unit_name,
       COALESCE(i.institution_name, 'Unknown Institution') as institution_name,
       COALESCE(di_agg.total_qty, 0) as packets,
       COALESCE(di_agg.total_amt, 0) as amount,
       d.status,
       d.delivery_status
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${scopeSql} AND d.demand_date = ?
     ORDER BY u.unit_name ASC, i.institution_name ASC, d.id ASC`,
    [...scopeParams, targetLastDate]
  );

  // 4. Delivered to Whom — BOTH Unit-wise and Institution-wise
  const deliveredSql = `${activeSql} AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED')`;

  const unitWiseRows = await db.all(
    `SELECT
       COALESCE(u.unit_code, u.unit_name, 'Unassigned') as unit_name,
       COUNT(*) as demands_count,
       COALESCE(SUM(COALESCE(di_agg.total_qty, 0)), 0) as packets,
       COALESCE(SUM(COALESCE(di_agg.total_amt, 0)), 0) as amount,
       SUM(CASE WHEN d.delivery_receipt_url IS NOT NULL AND d.delivery_receipt_url != '' AND d.invoice_url IS NOT NULL AND d.invoice_url != '' THEN 1 ELSE 0 END) as docs_verified,
       SUM(CASE WHEN d.delivery_receipt_url IS NULL OR d.delivery_receipt_url = '' OR d.invoice_url IS NULL OR d.invoice_url = '' THEN 1 ELSE 0 END) as docs_pending
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${deliveredSql}
     GROUP BY COALESCE(u.unit_code, u.unit_name, 'Unassigned')
     ORDER BY packets DESC`,
    scopeParams
  );

  const instWiseRows = await db.all(
    `SELECT
       COALESCE(i.institution_name, 'Unknown Institution') as institution_name,
       COALESCE(u.unit_code, u.unit_name, '') as unit_name,
       COUNT(*) as demands_count,
       COALESCE(SUM(COALESCE(di_agg.total_qty, 0)), 0) as packets,
       COALESCE(SUM(COALESCE(di_agg.total_amt, 0)), 0) as amount,
       SUM(CASE WHEN d.delivery_receipt_url IS NOT NULL AND d.delivery_receipt_url != '' AND d.invoice_url IS NOT NULL AND d.invoice_url != '' THEN 1 ELSE 0 END) as docs_verified,
       SUM(CASE WHEN d.delivery_receipt_url IS NULL OR d.delivery_receipt_url = '' OR d.invoice_url IS NULL OR d.invoice_url = '' THEN 1 ELSE 0 END) as docs_pending
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${deliveredSql}
     GROUP BY COALESCE(i.institution_name, 'Unknown Institution'), COALESCE(u.unit_code, u.unit_name, '')
     ORDER BY packets DESC`,
    scopeParams
  );

  // 5. Cancelled & Rejected Demands (separate last table)
  const cancelledRejectedRows = await db.all(
    `SELECT
       d.id,
       d.demand_number,
       d.demand_date,
       COALESCE(i.institution_name, 'Unknown Institution') as institution_name,
       COALESCE(u.unit_code, u.unit_name, '') as unit_name,
       COALESCE(di_agg.total_qty, 0) as packets,
       COALESCE(di_agg.total_amt, 0) as amount,
       d.status,
       COALESCE(NULLIF(d.delivery_rejection_reason, ''), NULLIF(d.review_remarks, ''), '-') as reason
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${scopeSql} AND d.status IN ('CANCELLED', 'REJECTED')
     ORDER BY d.demand_date DESC, d.id DESC`,
    scopeParams
  );

  // 6. Stock Balance Status + Last Delivery Consumption + Day/Week/Month Unit-wise Consumption
  const stockAgg = await db.get(
    `SELECT
       COALESCE(SUM(COALESCE(current_stock, 0)), 0) as total_stock_units,
       COALESCE(SUM(COALESCE(current_stock, 0) * COALESCE(NULLIF(cost_price, 0), unit_price, 0)), 0) as total_stock_value
     FROM refreshment_items
     WHERE is_active = 1 AND item_name != 'Standard Refreshment Packet'`
  );

  // Last delivery consumption (from most recent delivered demand date)
  const lastDeliveredDateRow = await db.get(
    `SELECT MAX(d.demand_date) as last_del_date
     FROM demands d
     WHERE d.is_deleted = 0
       AND d.status NOT IN ('REJECTED', 'CANCELLED')
       AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED')`
  );
  const lastDeliveryDate = lastDeliveredDateRow?.last_del_date || todayIST;

  const lastDeliveryRow = await db.get(
    `SELECT
       COALESCE(SUM(COALESCE(di_agg.total_qty, 0)), 0) as packets_consumed,
       COALESCE(SUM(COALESCE(di_agg.total_amt, 0)), 0) as amount_consumed
     FROM demands d
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     WHERE d.is_deleted = 0
       AND d.status NOT IN ('REJECTED', 'CANCELLED')
       AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED')
       AND d.demand_date = ?`,
    [lastDeliveryDate]
  );

  const weekStartIST = getISTDateParts(-6).ymd;
  const monthStartIST = `${getISTDateParts(0).ym}-01`;

  const unitConsumptionRows = await db.all(
    `SELECT
       COALESCE(u.unit_code, u.unit_name, 'Unassigned') as unit_name,
       COALESCE(SUM(CASE WHEN d.demand_date = ? THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as day_packets,
       COALESCE(SUM(CASE WHEN d.demand_date = ? THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as day_amount,
       COALESCE(SUM(CASE WHEN d.demand_date >= ? AND d.demand_date <= ? THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as week_packets,
       COALESCE(SUM(CASE WHEN d.demand_date >= ? AND d.demand_date <= ? THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as week_amount,
       COALESCE(SUM(CASE WHEN d.demand_date >= ? AND d.demand_date <= ? THEN COALESCE(di_agg.total_qty, 0) ELSE 0 END), 0) as month_packets,
       COALESCE(SUM(CASE WHEN d.demand_date >= ? AND d.demand_date <= ? THEN COALESCE(di_agg.total_amt, 0) ELSE 0 END), 0) as month_amount
     FROM demands d
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     WHERE d.is_deleted = 0
       AND d.status NOT IN ('REJECTED', 'CANCELLED')
       AND (d.delivery_status = 'DELIVERED' OR d.status = 'FULFILLED')
     GROUP BY COALESCE(u.unit_code, u.unit_name, 'Unassigned')
     ORDER BY month_packets DESC, week_packets DESC`,
    [
      lastDeliveryDate, lastDeliveryDate,
      weekStartIST, todayIST,
      weekStartIST, todayIST,
      monthStartIST, todayIST,
      monthStartIST, todayIST
    ]
  );

  // 7. Datewise Pending Documentation Summary
  const deliveredDemandsForDocs = await db.all(
    `SELECT
       d.demand_date,
       d.demand_number,
       d.delivery_receipt_url,
       d.invoice_url,
       COALESCE(di_agg.total_qty, 0) as packets,
       COALESCE(di_agg.total_amt, 0) as amount
     FROM demands d
     LEFT JOIN institutions i ON d.institution_id = i.id
     JOIN units u ON d.unit_id = u.id
     LEFT JOIN (
       SELECT demand_id, SUM(quantity) as total_qty, SUM(quantity * COALESCE(unit_price_snapshot, 0)) as total_amt
       FROM demand_items GROUP BY demand_id
     ) di_agg ON di_agg.demand_id = d.id
     ${deliveredSql}
     ORDER BY d.demand_date DESC, d.id DESC`,
    scopeParams
  );

  const dateDocsMap = {};
  for (const row of deliveredDemandsForDocs) {
    const dt = row.demand_date || 'Undated';
    if (!dateDocsMap[dt]) {
      dateDocsMap[dt] = {
        date: dt,
        delivered_count: 0,
        packets: 0,
        amount: 0,
        receipt_pending: 0,
        bill_pending: 0,
        verified: 0,
        demand_refs: []
      };
    }
    const entry = dateDocsMap[dt];
    const hasRcpt = Boolean(row.delivery_receipt_url);
    const hasBill = Boolean(row.invoice_url);
    entry.delivered_count += 1;
    entry.packets += Number(row.packets) || 0;
    entry.amount += Number(row.amount) || 0;
    if (!hasRcpt) entry.receipt_pending += 1;
    if (!hasBill) entry.bill_pending += 1;
    if (hasRcpt && hasBill) {
      entry.verified += 1;
    } else if (row.demand_number) {
      entry.demand_refs.push(row.demand_number);
    }
  }

  const datePendingDocs = Object.values(dateDocsMap)
    .filter(d => d.receipt_pending > 0 || d.bill_pending > 0)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    generated: {
      count: generatedCount,
      packets: generatedPackets,
      amount: generatedAmount
    },
    delivered: {
      count: deliveredCount,
      packets: deliveredPackets,
      amount: deliveredAmount
    },
    pending_delivery: {
      count: Math.max(0, generatedCount - deliveredCount),
      packets: Math.max(0, generatedPackets - deliveredPackets),
      amount: Math.max(0, generatedAmount - deliveredAmount)
    },
    docs_pending: {
      count: Number(kpiRow?.docs_pending_count) || 0,
      receipt_pending: Number(kpiRow?.receipt_pending_count) || 0,
      bill_pending: Number(kpiRow?.bill_pending_count) || 0,
      amount: Number(kpiRow?.docs_pending_amount) || 0
    },
    item_wise: itemWise,
    last_day: {
      date: targetLastDate,
      totals: lastDayTotals,
      unit_breakdown: lastDayBreakdown,
      demands: lastDayDemandRows.map(r => {
        const effStatus = (r.delivery_status === 'DELIVERED' || r.status === 'FULFILLED')
          ? 'DELIVERED'
          : (r.status === 'CANCELLED' || r.status === 'REJECTED')
            ? r.status
            : (r.delivery_status || r.status || 'PENDING');
        return {
          id: r.id,
          demand_number: r.demand_number,
          unit_name: r.unit_name,
          institution_name: r.institution_name,
          packets: Number(r.packets) || 0,
          amount: Number(r.amount) || 0,
          delivery_status: effStatus
        };
      })
    },
    unit_wise: unitWiseRows.map(r => ({
      unit_name: r.unit_name,
      demands_count: Number(r.demands_count) || 0,
      packets: Number(r.packets) || 0,
      amount: Number(r.amount) || 0,
      docs_verified: Number(r.docs_verified) || 0,
      docs_pending: Number(r.docs_pending) || 0
    })),
    institution_wise: instWiseRows.map(r => ({
      institution_name: r.institution_name,
      unit_name: r.unit_name,
      demands_count: Number(r.demands_count) || 0,
      packets: Number(r.packets) || 0,
      amount: Number(r.amount) || 0,
      docs_verified: Number(r.docs_verified) || 0,
      docs_pending: Number(r.docs_pending) || 0
    })),
    cancelled_rejected: cancelledRejectedRows.map(r => ({
      id: r.id,
      demand_number: r.demand_number,
      demand_date: r.demand_date,
      institution_name: r.institution_name,
      unit_name: r.unit_name,
      packets: Number(r.packets) || 0,
      amount: Number(r.amount) || 0,
      status: r.status,
      reason: r.reason
    })),
    stock_status: {
      total_stock_units: Number(stockAgg?.total_stock_units) || 0,
      total_stock_value: Number(stockAgg?.total_stock_value) || 0,
      last_delivery_date: lastDeliveryDate,
      last_delivery_packets: Number(lastDeliveryRow?.packets_consumed) || 0,
      last_delivery_amount: Number(lastDeliveryRow?.amount_consumed) || 0,
      week_start: weekStartIST,
      month_start: monthStartIST,
      unit_wise_consumption: unitConsumptionRows.map(r => ({
        unit_name: r.unit_name,
        day_packets: Number(r.day_packets) || 0,
        day_amount: Number(r.day_amount) || 0,
        week_packets: Number(r.week_packets) || 0,
        week_amount: Number(r.week_amount) || 0,
        month_packets: Number(r.month_packets) || 0,
        month_amount: Number(r.month_amount) || 0
      }))
    },
    date_pending_docs: datePendingDocs
  };
}

module.exports = {
  buildOwnerSummaryData,
  getISTDateParts
};
