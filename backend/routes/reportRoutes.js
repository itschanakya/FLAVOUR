const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/summary - Dashboard KPI counters
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    let scopeWhere = 'WHERE d.is_deleted = 0';
    const params = [];

    if (req.user.role === 'INSTITUTION') {
      scopeWhere += ' AND d.institution_id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      scopeWhere += ' AND d.unit_id = ?';
      params.push(req.user.unit_id);
    }

    const counts = await db.all(
      `SELECT status, COUNT(*) as count 
       FROM demands d
       ${scopeWhere}
       GROUP BY status`,
      params
    );

    const statusCounts = {
      TOTAL: 0
    };

    counts.forEach(row => {
      statusCounts[row.status] = row.count;
      statusCounts.TOTAL += row.count;
    });

    // Total monetary value of fulfilled and approved demands
    const financialVal = await db.get(
      `SELECT 
         SUM(CASE WHEN d.status IN ('FULFILLED', 'DELIVERED') THEN di.quantity * di.unit_price_snapshot ELSE 0 END) as total_fulfilled_val,
         SUM(CASE WHEN d.status IN ('OUT_FOR_DELIVERY', 'ARRIVED') THEN di.quantity ELSE 0 END) as total_packets_in_transit,
         SUM(CASE WHEN d.status IN ('DELIVERED', 'FULFILLED') THEN di.quantity ELSE 0 END) as total_packets_delivered,
         SUM(di.quantity) as total_packets_demanded
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       ${scopeWhere}`,
      params
    );

    res.json({
      summary: statusCounts,
      financials: {
        total_amount_delivered: financialVal.total_fulfilled_val || 0,
        total_packets_in_transit: financialVal.total_packets_in_transit || 0,
        total_packets_delivered: financialVal.total_packets_delivered || 0,
        total_packets_demanded: financialVal.total_packets_demanded || 0
      }
    });

  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({ error: 'Failed to generate summary report.' });
  }
});

// GET /api/reports/periodic - Weekly & Monthly aggregations
router.get('/periodic', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    let scopeWhere = 'WHERE d.is_deleted = 0';
    const params = [];

    if (req.user.role === 'INSTITUTION') {
      scopeWhere += ' AND d.institution_id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      scopeWhere += ' AND d.unit_id = ?';
      params.push(req.user.unit_id);
    }

    // Monthly breakdown
    const monthly = await db.all(
      `SELECT 
         DATE_FORMAT(d.demand_date, '%Y-%m') as month,
         COUNT(DISTINCT d.id) as demand_count,
         SUM(di.quantity) as total_quantity,
         SUM(di.quantity * di.unit_price_snapshot) as total_cost
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       ${scopeWhere}
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    // Weekly breakdown
    const weekly = await db.all(
      `SELECT 
         DATE_FORMAT(d.demand_date, '%Y-%u') as week,
         MIN(d.demand_date) as week_start,
         COUNT(DISTINCT d.id) as demand_count,
         SUM(di.quantity) as total_quantity,
         SUM(di.quantity * di.unit_price_snapshot) as total_cost
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       ${scopeWhere}
       GROUP BY week
       ORDER BY week DESC
       LIMIT 8`,
      params
    );

    res.json({ monthly, weekly });
  } catch (error) {
    console.error('Periodic report error:', error);
    res.status(500).json({ error: 'Failed to generate periodic report.' });
  }
});

// GET /api/reports/cumulative - Filterable detailed report
router.get('/cumulative', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, unit_id, institution_id, year_group, item_id, status } = req.query;
    const db = await getDB();

    let query = `
      SELECT 
        d.id as demand_id,
        d.demand_number,
        d.demand_date,
        d.purpose,
        d.status,
        u.unit_name,
        i.institution_name,
        di.year_group,
        ri.item_name,
        ri.unit_of_measure,
        di.quantity,
        di.unit_price_snapshot,
        (di.quantity * di.unit_price_snapshot) as line_total
      FROM demands d
      JOIN demand_items di ON d.id = di.demand_id
      JOIN refreshment_items ri ON di.item_id = ri.id
      JOIN institutions i ON d.institution_id = i.id
      JOIN units u ON d.unit_id = u.id
      WHERE d.is_deleted = 0
    `;

    const params = [];

    // Role-based scope
    if (req.user.role === 'INSTITUTION') {
      query += ' AND d.institution_id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      query += ' AND d.unit_id = ?';
      params.push(req.user.unit_id);
    }

    // Dynamic filters
    if (start_date) {
      query += ' AND d.demand_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND d.demand_date <= ?';
      params.push(end_date);
    }
    if (unit_id && req.user.role === 'ADMIN') {
      query += ' AND d.unit_id = ?';
      params.push(unit_id);
    }
    if (institution_id && (req.user.role === 'ADMIN' || req.user.role === 'UNIT')) {
      query += ' AND d.institution_id = ?';
      params.push(institution_id);
    }
    if (year_group) {
      query += ' AND di.year_group = ?';
      params.push(year_group);
    }
    if (item_id) {
      query += ' AND di.item_id = ?';
      params.push(item_id);
    }
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.demand_date DESC, d.id DESC';

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Cumulative report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative report.' });
  }
});

// GET /api/reports/utilization - Institution Sanctioned Strength vs Raised Demand Utilization
router.get('/utilization', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    let instWhere = '';
    const params = [];

    if (req.user.role === 'INSTITUTION') {
      instWhere = 'WHERE i.id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      instWhere = 'WHERE i.unit_id = ?';
      params.push(req.user.unit_id);
    }

    const institutions = await db.all(
      `SELECT i.id, i.institution_name, u.unit_name,
              i.strength_1st_year, i.strength_2nd_year, i.strength_3rd_year,
              (i.strength_1st_year + i.strength_2nd_year + i.strength_3rd_year) as total_sanctioned_strength
       FROM institutions i
       JOIN units u ON i.unit_id = u.id
       ${instWhere}
       ORDER BY i.institution_name ASC`,
      params
    );

    const report = [];

    for (const inst of institutions) {
      // Sum up demand item quantities raised by year group (excluding cancelled or deleted)
      const demandSum = await db.all(
        `SELECT di.year_group, SUM(di.quantity) as raised_qty
         FROM demands d
         JOIN demand_items di ON d.id = di.demand_id
         WHERE d.institution_id = ? AND d.is_deleted = 0 AND d.status != 'CANCELLED'
         GROUP BY di.year_group`,
        [inst.id]
      );

      const raised = {
        '1st Year': 0,
        '2nd Year': 0,
        '3rd Year': 0
      };

      demandSum.forEach(r => {
        if (raised.hasOwnProperty(r.year_group)) {
          raised[r.year_group] = r.raised_qty || 0;
        }
      });

      const totalRaised = raised['1st Year'] + raised['2nd Year'] + raised['3rd Year'];

      report.push({
        institution_id: inst.id,
        institution_name: inst.institution_name,
        unit_name: inst.unit_name,
        strength: {
          y1: inst.strength_1st_year,
          y2: inst.strength_2nd_year,
          y3: inst.strength_3rd_year,
          total: inst.total_sanctioned_strength
        },
        raised: {
          y1: raised['1st Year'],
          y2: raised['2nd Year'],
          y3: raised['3rd Year'],
          total: totalRaised
        },
        utilization_pct: inst.total_sanctioned_strength > 0 
          ? Math.min(100, Math.round((totalRaised / inst.total_sanctioned_strength) * 100))
          : 0
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Utilization report error:', error);
    res.status(500).json({ error: 'Failed to generate utilization report.' });
  }
});

// GET /api/reports/audit-logs - Audit trail
// GET /api/reports/annual-summary - Comprehensive Annual School/Institution Summary
router.get('/annual-summary', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const db = await getDB();
    const targetYear = year || new Date().getFullYear().toString();

    let instWhere = '';
    const params = [];

    if (req.user.role === 'INSTITUTION') {
      instWhere = 'WHERE i.id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      instWhere = 'WHERE i.unit_id = ?';
      params.push(req.user.unit_id);
    }

    const institutions = await db.all(
      `SELECT i.id, i.institution_name, i.ano_cto_name, i.ano_cto_contact, i.pin_code, i.complete_address, u.unit_name, u.unit_code,
              COALESCE(i.strength_1st_year, 0) as strength_1st_year,
              COALESCE(i.strength_2nd_year, 0) as strength_2nd_year,
              COALESCE(i.strength_3rd_year, 0) as strength_3rd_year,
              (COALESCE(i.strength_1st_year, 0) + COALESCE(i.strength_2nd_year, 0) + COALESCE(i.strength_3rd_year, 0)) as total_sanctioned_strength
       FROM institutions i
       JOIN units u ON i.unit_id = u.id
       ${instWhere}
       ORDER BY i.institution_name ASC`,
      params
    );

    const summaries = [];

    for (const inst of institutions) {
      const annualQuota = (inst.total_sanctioned_strength || 0) * 25;

      const demands = await db.all(
        `SELECT d.id, d.demand_number, d.demand_date, d.status, d.purpose,
                COALESCE(SUM(di.quantity), 0) as total_qty,
                COALESCE(SUM(di.quantity * di.unit_price_snapshot), 0) as total_amount
         FROM demands d
         LEFT JOIN demand_items di ON d.id = di.demand_id
         WHERE d.institution_id = ? 
           AND d.is_deleted = 0 
           AND (DATE_FORMAT(d.demand_date, '%Y') = ? OR d.demand_date LIKE ?)
         GROUP BY d.id
         ORDER BY d.demand_date ASC`,
        [inst.id, targetYear, `${targetYear}%`]
      );

      const yearGroupBreakdown = await db.all(
        `SELECT di.year_group, SUM(di.quantity) as qty
         FROM demands d
         JOIN demand_items di ON d.id = di.demand_id
         WHERE d.institution_id = ? 
           AND d.is_deleted = 0 
           AND d.status != 'CANCELLED'
           AND DATE_FORMAT(d.demand_date, '%Y') = ?
         GROUP BY di.year_group`,
        [inst.id, targetYear]
      );

      const yearGroupQty = {
        '1st Year': 0,
        '2nd Year': 0,
        '3rd Year': 0
      };
      yearGroupBreakdown.forEach(b => {
        if (yearGroupQty.hasOwnProperty(b.year_group)) {
          yearGroupQty[b.year_group] = b.qty || 0;
        }
      });

      let totalConsumed = 0;
      let totalFulfilledAmount = 0;
      let totalApprovedAmount = 0;

      const statusCounts = { PENDING: 0, APPROVED: 0, ACCEPTED: 0, FULFILLED: 0, CANCELLED: 0, REJECTED: 0 };

      demands.forEach(d => {
        if (statusCounts.hasOwnProperty(d.status)) statusCounts[d.status]++;
        if (['PENDING', 'APPROVED', 'ACCEPTED', 'FULFILLED'].includes(d.status)) {
          totalConsumed += (d.total_qty || 0);
        }
        if (d.status === 'FULFILLED') {
          totalFulfilledAmount += (d.total_amount || 0);
        }
        if (['APPROVED', 'ACCEPTED', 'FULFILLED'].includes(d.status)) {
          totalApprovedAmount += (d.total_amount || 0);
        }
      });

      const remainingQuota = Math.max(0, annualQuota - totalConsumed);
      const utilizationPct = annualQuota > 0 ? Math.min(100, Math.round((totalConsumed / annualQuota) * 100)) : 0;

      summaries.push({
        institution: inst,
        year: targetYear,
        annual_quota: annualQuota,
        total_consumed: totalConsumed,
        remaining_quota: remainingQuota,
        utilization_pct: utilizationPct,
        total_approved_amount: totalApprovedAmount,
        total_fulfilled_amount: totalFulfilledAmount,
        year_group_breakdown: yearGroupQty,
        status_counts: statusCounts,
        demands_count: demands.length,
        demands
      });
    }

    res.json(summaries);
  } catch (error) {
    console.error('Annual summary report error:', error);
    res.status(500).json({ error: 'Failed to generate annual summary.' });
  }
});

// GET /api/reports/weekly-monthly-summary - Aggregated periodic summary
router.get('/weekly-monthly-summary', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const db = await getDB();
    const targetYear = year || new Date().getFullYear().toString();

    let scopeWhere = "WHERE d.is_deleted = 0 AND DATE_FORMAT(d.demand_date, '%Y') = ?";
    const params = [targetYear];

    if (req.user.role === 'INSTITUTION') {
      scopeWhere += ' AND d.institution_id = ?';
      params.push(req.user.institution_id);
    } else if (req.user.role === 'UNIT') {
      scopeWhere += ' AND d.unit_id = ?';
      params.push(req.user.unit_id);
    }

    // Monthly Summary
    const monthlySummary = await db.all(
      `SELECT 
         DATE_FORMAT(d.demand_date, '%m') as month_num,
         DATE_FORMAT(d.demand_date, '%Y-%m') as month_key,
         COUNT(DISTINCT d.id) as demand_count,
         SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN d.status IN ('APPROVED', 'ACCEPTED') THEN 1 ELSE 0 END) as approved_count,
         SUM(CASE WHEN d.status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled_count,
         SUM(CASE WHEN d.status IN ('CANCELLED', 'REJECTED') THEN 1 ELSE 0 END) as cancelled_count,
         SUM(di.quantity) as total_packets,
         SUM(di.quantity * di.unit_price_snapshot) as total_cost
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       ${scopeWhere}
       GROUP BY month_num, month_key
       ORDER BY month_key ASC`,
      params
    );

    // Weekly Summary
    const weeklySummary = await db.all(
      `SELECT 
         DATE_FORMAT(d.demand_date, '%u') as week_num,
         MIN(d.demand_date) as week_start,
         MAX(d.demand_date) as week_end,
         COUNT(DISTINCT d.id) as demand_count,
         SUM(di.quantity) as total_packets,
         SUM(di.quantity * di.unit_price_snapshot) as total_cost
       FROM demands d
       JOIN demand_items di ON d.id = di.demand_id
       ${scopeWhere}
       GROUP BY week_num
       ORDER BY week_num ASC`,
      params
    );

    // Institution-level breakdown for Unit / Admin
    let instBreakdown = [];
    if (['UNIT', 'ADMIN'].includes(req.user.role)) {
      instBreakdown = await db.all(
        `SELECT 
           i.id as institution_id,
           i.institution_name,
           u.unit_name,
           COUNT(DISTINCT d.id) as total_demands,
           SUM(di.quantity) as total_packets,
           SUM(di.quantity * di.unit_price_snapshot) as total_amount
         FROM demands d
         JOIN demand_items di ON d.id = di.demand_id
         JOIN institutions i ON d.institution_id = i.id
         JOIN units u ON d.unit_id = u.id
         ${scopeWhere}
         GROUP BY i.id
         ORDER BY i.institution_name ASC`,
        params
      );
    }

    res.json({
      year: targetYear,
      monthly: monthlySummary,
      weekly: weeklySummary,
      institutions: instBreakdown
    });
  } catch (error) {
    console.error('Weekly-monthly summary error:', error);
    res.status(500).json({ error: 'Failed to generate weekly/monthly summary.' });
  }
});

module.exports = router;
