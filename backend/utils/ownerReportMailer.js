const { jsPDF } = require('jspdf');
const { getDB } = require('../database');
const { sendEmailSafely } = require('./emailService');
const { buildOwnerSummaryData, getISTDateParts } = require('./ownerSummaryBuilder');

function formatDDMMYYYY(dateStr) {
  if (!dateStr || dateStr === 'Undated') return dateStr || '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
  }
  return dateStr;
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function fmtRs(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function generateOwnerSummaryPdfBuffer(summary, scopeLabel = 'All Dates | All Units | All PINs') {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = 10;

  const ensureSpace = (neededMm) => {
    if (y + neededMm > pageH - 12) {
      pdf.addPage();
      y = 12;
    }
  };

  const drawSectionHeader = (title, rightText = '') => {
    ensureSpace(12);
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, y, contentW, 6.5, 1, 1, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin + 2.5, y + 4.4);
    if (rightText) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(rightText, pageW - margin - 2.5, y + 4.4, { align: 'right' });
    }
    y += 8;
  };

  // Header Banner
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(margin, y, contentW, 18, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.text('FLAVOUR BASE INDIA - DELIVERY, STOCK & DOCUMENTATION SUMMARY', margin + 4, y + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.8);
  const generatedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Scope: ${scopeLabel}   |   Generated: ${generatedAt} IST`, margin + 4, y + 13.5);
  y += 22;

  // KPI Strip (4 boxes)
  const gen = summary.generated || {};
  const del = summary.delivered || {};
  const pend = summary.pending_delivery || {};
  const docs = summary.docs_pending || {};
  const delPct = gen.count > 0 ? Math.round((del.count / gen.count) * 100) : 0;

  const kpis = [
    {
      title: 'TOTAL DEMAND GENERATED',
      main: `${fmtNum(gen.count)} Demands`,
      sub: `${fmtNum(gen.packets)} Pkts | ${fmtRs(gen.amount)}`,
      bg: [239, 246, 255],
      border: [191, 219, 254],
      accent: [29, 78, 216]
    },
    {
      title: `TOTAL DELIVERED (${delPct}%)`,
      main: `${fmtNum(del.count)} Demands`,
      sub: `${fmtNum(del.packets)} Pkts | ${fmtRs(del.amount)}`,
      bg: [236, 253, 245],
      border: [167, 243, 208],
      accent: [4, 120, 87]
    },
    {
      title: 'PENDING DELIVERY',
      main: `${fmtNum(pend.count)} Demands`,
      sub: `${fmtNum(pend.packets)} Pkts in pipeline`,
      bg: [248, 250, 252],
      border: [226, 232, 240],
      accent: [51, 65, 85]
    },
    {
      title: 'DOCS PENDING (BALANCE)',
      main: `${fmtNum(docs.count)} Demands`,
      sub: `Rcpt: ${docs.receipt_pending || 0} | Bill: ${docs.bill_pending || 0} | ${fmtRs(docs.amount)}`,
      bg: [255, 251, 235],
      border: [253, 230, 138],
      accent: [180, 83, 9]
    }
  ];

  const boxGap = 2.5;
  const boxW = (contentW - boxGap * 3) / 4;
  kpis.forEach((k, idx) => {
    const x = margin + idx * (boxW + boxGap);
    pdf.setFillColor(...k.bg);
    pdf.setDrawColor(...k.border);
    pdf.roundedRect(x, y, boxW, 17, 1.5, 1.5, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(...k.accent);
    pdf.text(k.title, x + 2.5, y + 4.5);
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(k.main, x + 2.5, y + 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(pdf.splitTextToSize(k.sub, boxW - 4)[0], x + 2.5, y + 14.5);
  });
  y += 21;

  // 1. SPECIFIC LAST DAY DEMANDED & DELIVERED (Serial #1 - Merged NCC Unit when >1 institution)
  const lastDay = summary.last_day || {};
  const ldTot = lastDay.totals || {};
  const ldDemands = lastDay.demands || [];
  drawSectionHeader(
    `1. LAST DAY DEMAND & DELIVERY STATUS (${formatDDMMYYYY(lastDay.date)})`,
    `Dem: ${fmtNum(ldTot.demanded_count)} (${fmtNum(ldTot.demanded_packets)} Pkts) | Del: ${fmtNum(ldTot.delivered_count)} (${fmtNum(ldTot.delivered_packets)} Pkts) | Pend: ${fmtNum(ldTot.pending_count)}`
  );

  ensureSpace(8);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentW, 5.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.6);
  pdf.setTextColor(71, 85, 105);
  pdf.text('NCC UNIT', margin + 2, y + 3.8);
  pdf.text('DEMAND REF', margin + 32, y + 3.8);
  pdf.text('INSTITUTION', margin + 62, y + 3.8);
  pdf.text('PKTS', margin + 138, y + 3.8, { align: 'right' });
  pdf.text('AMOUNT', margin + 162, y + 3.8, { align: 'right' });
  pdf.text('DELIVERY STATUS', pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 6;

  if (ldDemands.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No demands recorded for the last active date.', margin + 2, y + 4);
    y += 6;
  } else {
    const unitGroups = [];
    ldDemands.forEach(d => {
      const uName = d.unit_name || 'Unassigned';
      const prev = unitGroups[unitGroups.length - 1];
      if (prev && prev.unit_name === uName) prev.items.push(d);
      else unitGroups.push({ unit_name: uName, items: [d] });
    });

    unitGroups.forEach(grp => {
      const grpH = grp.items.length * 4.8;
      if (y + grpH > pageH - 12) {
        pdf.addPage();
        y = 12;
      }
      const grpStartY = y;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, grpStartY, 28, grpH, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(grp.unit_name).slice(0, 16), margin + 2, grpStartY + grpH / 2 + 1);

      grp.items.forEach(d => {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin + 28, y + 4.8, pageW - margin, y + 4.8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(String(d.demand_number || '').slice(0, 16), margin + 32, y + 3.5);
        pdf.text(String(d.institution_name || '').slice(0, 42), margin + 62, y + 3.5);
        pdf.text(fmtNum(d.packets), margin + 138, y + 3.5, { align: 'right' });
        pdf.text(fmtRs(d.amount), margin + 162, y + 3.5, { align: 'right' });
        if (d.delivery_status === 'DELIVERED') pdf.setTextColor(4, 120, 87);
        else if (d.delivery_status === 'CANCELLED' || d.delivery_status === 'REJECTED') pdf.setTextColor(185, 28, 28);
        else pdf.setTextColor(180, 83, 9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(d.delivery_status || 'PENDING').slice(0, 16), pageW - margin - 2, y + 3.5, { align: 'right' });
        y += 4.8;
      });
    });
  }
  y += 4;

  // 2. TOTAL ITEMS DEMANDED, DELIVERED & BALANCE (ITEM-WISE)
  const itemRows = summary.item_wise || [];
  drawSectionHeader('2. TOTAL ITEMS DEMANDED, DELIVERED & BALANCE (ITEM-WISE)', `${itemRows.length} Item(s)`);
  ensureSpace(8);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentW, 5.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.6);
  pdf.setTextColor(71, 85, 105);
  pdf.text('ITEM / MENU PACK', margin + 2, y + 3.8);
  pdf.text('DEMANDED (QTY / AMT)', margin + 104, y + 3.8, { align: 'right' });
  pdf.text('DELIVERED (QTY / AMT)', margin + 148, y + 3.8, { align: 'right' });
  pdf.text('BALANCE (QTY / AMT)', pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 6;

  let totItemDem = 0;
  let totItemDemAmt = 0;
  let totItemDel = 0;
  let totItemDelAmt = 0;
  let totItemBal = 0;
  let totItemBalAmt = 0;
  itemRows.forEach(it => {
    ensureSpace(6);
    totItemDem += it.demanded_packets || 0;
    totItemDemAmt += it.demanded_amount || 0;
    totItemDel += it.delivered_packets || 0;
    totItemDelAmt += it.delivered_amount || 0;
    totItemBal += it.balance_packets || 0;
    totItemBalAmt += it.balance_amount || 0;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(it.item_name || '').slice(0, 36), margin + 2, y + 3.8);
    pdf.text(`${fmtNum(it.demanded_packets)} / ${fmtRs(it.demanded_amount)}`, margin + 104, y + 3.8, { align: 'right' });
    pdf.setTextColor(4, 120, 87);
    pdf.text(`${fmtNum(it.delivered_packets)} / ${fmtRs(it.delivered_amount)}`, margin + 148, y + 3.8, { align: 'right' });
    pdf.setTextColor(180, 83, 9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${fmtNum(it.balance_packets)} / ${fmtRs(it.balance_amount)}`, pageW - margin - 2, y + 3.8, { align: 'right' });
    y += 5;
  });

  ensureSpace(6);
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y, pageW - margin, y);
  y += 1;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('TOTAL', margin + 2, y + 3.8);
  pdf.text(`${fmtNum(totItemDem)} / ${fmtRs(totItemDemAmt)}`, margin + 104, y + 3.8, { align: 'right' });
  pdf.text(`${fmtNum(totItemDel)} / ${fmtRs(totItemDelAmt)}`, margin + 148, y + 3.8, { align: 'right' });
  pdf.text(`${fmtNum(totItemBal)} / ${fmtRs(totItemBalAmt)}`, pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 8;

  // 3A. DELIVERED TO WHOM - UNIT-WISE
  const unitRows = summary.unit_wise || [];
  drawSectionHeader('3A. DELIVERED TO WHOM - UNIT-WISE', `${unitRows.length} Unit(s)`);
  ensureSpace(8);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentW, 5.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('NCC UNIT', margin + 2, y + 3.8);
  pdf.text('DEMANDS', margin + 108, y + 3.8, { align: 'right' });
  pdf.text('PACKETS', margin + 132, y + 3.8, { align: 'right' });
  pdf.text('AMOUNT', margin + 162, y + 3.8, { align: 'right' });
  pdf.text('DOCS (VER / PEND)', pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 6;

  unitRows.forEach(u => {
    ensureSpace(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(u.unit_name || '').slice(0, 48), margin + 2, y + 3.6);
    pdf.text(fmtNum(u.demands_count), margin + 108, y + 3.6, { align: 'right' });
    pdf.text(fmtNum(u.packets), margin + 132, y + 3.6, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(fmtRs(u.amount), margin + 162, y + 3.6, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${u.docs_verified} Ver / ${u.docs_pending} Pend`, pageW - margin - 2, y + 3.6, { align: 'right' });
    y += 4.8;
  });
  y += 4;

  // 3B. DELIVERED TO WHOM - INSTITUTION-WISE
  const instRows = summary.institution_wise || [];
  drawSectionHeader('3B. DELIVERED TO WHOM - INSTITUTION-WISE', `${instRows.length} Institution(s)`);
  ensureSpace(8);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentW, 5.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('INSTITUTION (UNIT)', margin + 2, y + 3.8);
  pdf.text('DEMANDS', margin + 108, y + 3.8, { align: 'right' });
  pdf.text('PACKETS', margin + 132, y + 3.8, { align: 'right' });
  pdf.text('AMOUNT', margin + 162, y + 3.8, { align: 'right' });
  pdf.text('DOCS (VER / PEND)', pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 6;

  instRows.forEach(inst => {
    ensureSpace(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.1);
    pdf.setTextColor(15, 23, 42);
    const label = inst.unit_name ? `${inst.institution_name} (${inst.unit_name})` : inst.institution_name;
    pdf.text(String(label || '').slice(0, 52), margin + 2, y + 3.6);
    pdf.text(fmtNum(inst.demands_count), margin + 108, y + 3.6, { align: 'right' });
    pdf.text(fmtNum(inst.packets), margin + 132, y + 3.6, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(fmtRs(inst.amount), margin + 162, y + 3.6, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${inst.docs_verified} Ver / ${inst.docs_pending} Pend`, pageW - margin - 2, y + 3.6, { align: 'right' });
    y += 4.7;
  });
  y += 4;

  // 4. STOCK BALANCE & UNIT-WISE CONSUMPTION STATUS
  const st = summary.stock_status || {};
  drawSectionHeader(
    '4. STOCK BALANCE & CONSUMPTION STATUS',
    `Total Stock: ${fmtNum(st.total_stock_units)} Units (${fmtRs(st.total_stock_value)})`
  );

  ensureSpace(12);
  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(margin, y, contentW, 9.5, 1, 1, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(30, 64, 175);
  pdf.text(
    `Total Stock Balance: ${fmtNum(st.total_stock_units)} Units | Stock Value: ${fmtRs(st.total_stock_value)}   •   Last Delivery Consumption (${formatDDMMYYYY(st.last_delivery_date)}): ${fmtNum(st.last_delivery_packets)} Pkts (${fmtRs(st.last_delivery_amount)})`,
    margin + 3,
    y + 6
  );
  y += 11.5;

  const unitCons = st.unit_wise_consumption || [];
  ensureSpace(8);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentW, 5.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('NCC UNIT', margin + 2, y + 3.8);
  pdf.text('DAY-WISE (LAST DAY)', margin + 105, y + 3.8, { align: 'right' });
  pdf.text('WEEKLY (7 DAYS)', margin + 146, y + 3.8, { align: 'right' });
  pdf.text('MONTHLY (CURR MONTH)', pageW - margin - 2, y + 3.8, { align: 'right' });
  y += 6;

  unitCons.forEach(uc => {
    ensureSpace(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.1);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(uc.unit_name || '').slice(0, 38), margin + 2, y + 3.6);
    pdf.text(`${fmtNum(uc.day_packets)} Pkts / ${fmtRs(uc.day_amount)}`, margin + 105, y + 3.6, { align: 'right' });
    pdf.text(`${fmtNum(uc.week_packets)} Pkts / ${fmtRs(uc.week_amount)}`, margin + 146, y + 3.6, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${fmtNum(uc.month_packets)} Pkts / ${fmtRs(uc.month_amount)}`, pageW - margin - 2, y + 3.6, { align: 'right' });
    y += 4.8;
  });
  y += 4;

  // 5. DOCUMENTATION PENDING - DATEWISE
  const docPend = summary.date_pending_docs || [];
  if (docPend.length > 0) {
    drawSectionHeader('5. DOCUMENTATION PENDING - DATEWISE', `${docPend.length} Date(s)`);
    ensureSpace(8);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, contentW, 5.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('DATE', margin + 2, y + 3.8);
    pdf.text('DELIVERED', margin + 38, y + 3.8, { align: 'right' });
    pdf.text('PACKETS', margin + 62, y + 3.8, { align: 'right' });
    pdf.text('AMOUNT', margin + 92, y + 3.8, { align: 'right' });
    pdf.text('RCPT PEND', margin + 116, y + 3.8, { align: 'right' });
    pdf.text('BILL PEND', margin + 138, y + 3.8, { align: 'right' });
    pdf.text('PENDING REFS', margin + 144, y + 3.8);
    y += 6;

    docPend.forEach(d => {
      ensureSpace(5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.1);
      pdf.setTextColor(15, 23, 42);
      pdf.text(formatDDMMYYYY(d.date), margin + 2, y + 3.6);
      pdf.text(fmtNum(d.delivered_count), margin + 38, y + 3.6, { align: 'right' });
      pdf.text(fmtNum(d.packets), margin + 62, y + 3.6, { align: 'right' });
      pdf.text(fmtRs(d.amount), margin + 92, y + 3.6, { align: 'right' });
      pdf.setTextColor(180, 83, 9);
      pdf.text(fmtNum(d.receipt_pending), margin + 116, y + 3.6, { align: 'right' });
      pdf.text(fmtNum(d.bill_pending), margin + 138, y + 3.6, { align: 'right' });
      pdf.setTextColor(71, 85, 105);
      pdf.text((d.demand_refs || []).slice(0, 3).join(', '), margin + 144, y + 3.6);
      y += 4.7;
    });
    y += 4;
  }

  // 6. CANCELLED & REJECTED DEMANDS (SEPARATE LAST TABLE)
  const canRej = summary.cancelled_rejected || [];
  drawSectionHeader('6. CANCELLED & REJECTED DEMANDS', `${canRej.length} Record(s)`);
  if (canRej.length === 0) {
    ensureSpace(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No cancelled or rejected demands in this scope.', margin + 2, y + 4);
    y += 6;
  } else {
    ensureSpace(8);
    pdf.setFillColor(254, 242, 242);
    pdf.rect(margin, y, contentW, 5.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.6);
    pdf.setTextColor(153, 27, 27);
    pdf.text('DEMAND REF', margin + 2, y + 3.8);
    pdf.text('DATE', margin + 34, y + 3.8);
    pdf.text('INSTITUTION / UNIT', margin + 56, y + 3.8);
    pdf.text('PKTS', margin + 132, y + 3.8, { align: 'right' });
    pdf.text('AMOUNT', margin + 156, y + 3.8, { align: 'right' });
    pdf.text('STATUS', margin + 162, y + 3.8);
    pdf.text('REASON', margin + 180, y + 3.8);
    y += 6;

    canRej.forEach(c => {
      ensureSpace(5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(c.demand_number || '').slice(0, 18), margin + 2, y + 3.6);
      pdf.text(formatDDMMYYYY(c.demand_date), margin + 34, y + 3.6);
      const instUnit = c.unit_name ? `${c.institution_name} (${c.unit_name})` : c.institution_name;
      pdf.text(String(instUnit || '').slice(0, 36), margin + 56, y + 3.6);
      pdf.text(fmtNum(c.packets), margin + 132, y + 3.6, { align: 'right' });
      pdf.text(fmtRs(c.amount), margin + 156, y + 3.6, { align: 'right' });
      pdf.setTextColor(185, 28, 28);
      pdf.text(String(c.status || '').slice(0, 10), margin + 162, y + 3.6);
      pdf.setTextColor(71, 85, 105);
      pdf.text(String(c.reason || '-').slice(0, 14), margin + 180, y + 3.6);
      y += 4.7;
    });
  }

  const arrayBuffer = pdf.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function buildOwnerSummaryEmailHtml(summary) {
  const gen = summary.generated || {};
  const del = summary.delivered || {};
  const pend = summary.pending_delivery || {};
  const docs = summary.docs_pending || {};
  const ld = summary.last_day || {};
  const ldTot = ld.totals || {};
  const st = summary.stock_status || {};
  const delPct = gen.count > 0 ? Math.round((del.count / gen.count) * 100) : 0;

  const itemRowsHtml = (summary.item_wise || [])
    .map(
      it => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${it.item_name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmtNum(it.demanded_packets)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#047857;font-weight:700;">${fmtNum(it.delivered_packets)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#b45309;font-weight:700;">${fmtNum(it.balance_packets)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">₹${fmtNum(it.delivered_amount)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:20px;background:#f8fafc;color:#0f172a;">
    <div style="background:#0f172a;color:#ffffff;padding:18px 22px;border-radius:12px 12px 0 0;">
      <div style="font-size:11px;letter-spacing:1px;color:#94a3b8;font-weight:700;">FLAVOUR BASE INDIA • DAILY OWNER REPORT</div>
      <h2 style="margin:4px 0 0 0;font-size:20px;">Delivery, Stock &amp; Documentation Summary</h2>
      <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Generated at 08:00 AM IST • Full compact PDF report attached</div>
    </div>

    <div style="background:#ffffff;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
      <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:16px;">
        <tr>
          <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;width:25%;">
            <div style="font-size:10px;font-weight:700;color:#1d4ed8;">DEMAND GENERATED</div>
            <div style="font-size:16px;font-weight:800;margin-top:2px;">${fmtNum(gen.count)}</div>
            <div style="font-size:11px;color:#475569;">${fmtNum(gen.packets)} Pkts • ₹${fmtNum(gen.amount)}</div>
          </td>
          <td style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:10px;width:25%;">
            <div style="font-size:10px;font-weight:700;color:#047857;">DELIVERED (${delPct}%)</div>
            <div style="font-size:16px;font-weight:800;margin-top:2px;">${fmtNum(del.count)}</div>
            <div style="font-size:11px;color:#475569;">${fmtNum(del.packets)} Pkts • ₹${fmtNum(del.amount)}</div>
          </td>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;width:25%;">
            <div style="font-size:10px;font-weight:700;color:#334155;">PENDING DELIVERY</div>
            <div style="font-size:16px;font-weight:800;margin-top:2px;">${fmtNum(pend.count)}</div>
            <div style="font-size:11px;color:#475569;">${fmtNum(pend.packets)} Pkts</div>
          </td>
          <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;width:25%;">
            <div style="font-size:10px;font-weight:700;color:#b45309;">DOCS PENDING</div>
            <div style="font-size:16px;font-weight:800;margin-top:2px;">${fmtNum(docs.count)}</div>
            <div style="font-size:11px;color:#475569;">Rcpt: ${docs.receipt_pending || 0} | Bill: ${docs.bill_pending || 0}</div>
          </td>
        </tr>
      </table>

      <div style="background:#f1f5f9;padding:12px 14px;border-radius:8px;margin-bottom:16px;font-size:13px;">
        <strong>Last Day (${formatDDMMYYYY(ld.date)}):</strong>
        Demanded <strong>${fmtNum(ldTot.demanded_count)}</strong> (${fmtNum(ldTot.demanded_packets)} Pkts) &nbsp;|&nbsp;
        Delivered <strong style="color:#047857;">${fmtNum(ldTot.delivered_count)}</strong> (${fmtNum(ldTot.delivered_packets)} Pkts) &nbsp;|&nbsp;
        Pending <strong style="color:#b45309;">${fmtNum(ldTot.pending_count)}</strong> &nbsp;|&nbsp;
        Cancelled/Rejected <strong style="color:#b91c1c;">${fmtNum(ldTot.cancelled_count)}</strong>
      </div>

      <h3 style="font-size:14px;margin:0 0 8px 0;color:#0f172a;">Item-wise Summary (Demanded / Delivered / Balance)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
        <thead>
          <tr style="background:#f8fafc;color:#475569;text-align:left;">
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;">Item</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Demanded</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Delivered</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Balance</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;text-align:right;">Del. Amount</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:12px;">
        <strong>Stock Balance Status:</strong>
        Total Stock: <strong>${fmtNum(st.total_stock_units)} Units</strong> (Value: <strong>₹${fmtNum(st.total_stock_value)}</strong>)
        &nbsp;|&nbsp;
        Last Delivery Consumption (${formatDDMMYYYY(st.last_delivery_date)}): <strong>${fmtNum(st.last_delivery_packets)} Pkts</strong> (₹${fmtNum(st.last_delivery_amount)})
      </div>

      <p style="font-size:12px;color:#64748b;margin:12px 0 0 0;">
        Please find the attached PDF for the complete Unit-wise, Institution-wise, Day/Week/Month Consumption, Documentation Pending, and Cancelled/Rejected Demands breakdown.
      </p>
    </div>
  </div>`;
}

async function getAppSetting(db, key, defaultVal = '') {
  try {
    const row = await db.get('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
    return row ? row.setting_value : defaultVal;
  } catch {
    return defaultVal;
  }
}

async function setAppSetting(db, key, val) {
  await db.run(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, String(val ?? '')]
  ).catch(async () => {
    // SQLite fallback if ON DUPLICATE KEY UPDATE is not supported
    const existing = await db.get('SELECT setting_key FROM app_settings WHERE setting_key = ?', [key]);
    if (existing) {
      await db.run('UPDATE app_settings SET setting_value = ? WHERE setting_key = ?', [String(val ?? ''), key]);
    } else {
      await db.run('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [key, String(val ?? '')]);
    }
  });
}

async function sendOwnerSummaryReport({ force = false } = {}) {
  const db = await getDB();
  const ownerEmail = (await getAppSetting(db, 'owner_report_email', '')).trim();
  const enabled = (await getAppSetting(db, 'owner_report_enabled', 'true')).trim();
  const lastSentDate = (await getAppSetting(db, 'owner_report_last_sent_date', '')).trim();

  if (!ownerEmail || !ownerEmail.includes('@')) {
    return { sent: false, reason: 'Owner report email is not configured.' };
  }

  if (!force && enabled === 'false') {
    return { sent: false, reason: 'Daily owner report email is disabled.' };
  }

  const todayIST = getISTDateParts(0);
  if (!force && lastSentDate === todayIST.ymd) {
    return { sent: false, reason: `Already sent today (${todayIST.ymd}).` };
  }

  const summary = await buildOwnerSummaryData(db, {});
  const pdfBuffer = generateOwnerSummaryPdfBuffer(summary, 'All Dates | All Units | All PINs');
  const htmlContent = buildOwnerSummaryEmailHtml(summary);
  const textContent = `Flavour Base India - Daily Owner Summary (${todayIST.dmy})\n\nDemanded: ${summary.generated.count} (${summary.generated.packets} Pkts)\nDelivered: ${summary.delivered.count} (${summary.delivered.packets} Pkts)\nPending Delivery: ${summary.pending_delivery.count}\nDocs Pending: ${summary.docs_pending.count}\n\nFull PDF report is attached.`;

  const subject = `Daily Owner Summary & Documentation Report - ${todayIST.dmy}`;
  const filename = `Flavour_Base_Owner_Summary_${todayIST.dmy}.pdf`;

  const ok = await sendEmailSafely(ownerEmail, subject, htmlContent, textContent, [
    { filename, content: pdfBuffer, contentType: 'application/pdf' }
  ]);

  if (ok) {
    await setAppSetting(db, 'owner_report_last_sent_date', todayIST.ymd);
    return { sent: true, to: ownerEmail, date: todayIST.ymd, filename };
  }

  return { sent: false, reason: 'Email delivery failed. Check SMTP/Resend configuration.' };
}

let dailyOwnerSchedulerInterval = null;
function startDailyOwnerReportScheduler() {
  if (dailyOwnerSchedulerInterval) return;

  const checkAndSend = async () => {
    try {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      if (nowIST.getHours() < 8) return; // Wait until 08:00 AM IST
      const result = await sendOwnerSummaryReport({ force: false });
      if (result.sent) {
        console.log(`[Owner Report Scheduler] Daily 08:00 AM IST report sent to ${result.to}`);
      }
    } catch (err) {
      console.error('[Owner Report Scheduler] Error:', err.message);
    }
  };

  setTimeout(checkAndSend, 15000);
  dailyOwnerSchedulerInterval = setInterval(checkAndSend, 5 * 60 * 1000);
  console.log('[Owner Report Scheduler] Automated 08:00 AM IST daily owner report scheduler initialized.');
}

module.exports = {
  generateOwnerSummaryPdfBuffer,
  buildOwnerSummaryEmailHtml,
  sendOwnerSummaryReport,
  startDailyOwnerReportScheduler,
  getAppSetting,
  setAppSetting
};
