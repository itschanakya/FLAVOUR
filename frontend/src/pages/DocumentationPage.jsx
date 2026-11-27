import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import { getDocumentViewUrl, getDocumentImageUrl } from '../utils/documentViewer';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { extractDemandFromPdf, mergePdfFiles } from '../utils/pdfDemandMatcher';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
import {
  FileCheck, CheckCircle2, Calendar, Upload, FileText,
  IndianRupee, MapPin, RefreshCw, School, Package, Users,
  ChevronDown, ChevronUp, ChevronRight, AlertTriangle, X, Eye, Building2,
  Layers, Filter, Search, Phone, MessageCircle, ExternalLink,
  Printer, ArrowUpRight, Truck, Clock, ShieldCheck, Download, Gauge, Trash2
} from 'lucide-react';

export default function DocumentationPage() {
  const { token } = useAuth();
  const { events } = useSSE();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [selectedPin, setSelectedPin] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [docFilter, setDocFilter] = useState('BALANCE'); // 'BALANCE' | 'FULLY_DOCUMENTED'
  const [groupMode, setGroupMode] = useState('DATEWISE'); // 'ALL' | 'DATEWISE' | 'UNITWISE'
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Owner Summary & Compact PDF State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [ownerSummaryStats, setOwnerSummaryStats] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [recipientViewMode, setRecipientViewMode] = useState('UNITWISE'); // 'UNITWISE' | 'INSTITUTIONWISE'
  
  // Modals
  const [selectedDemandForSummary, setSelectedDemandForSummary] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [removingDoc, setRemovingDoc] = useState(null); // 'receipt' | 'invoice' | null
  const [receiptFile, setReceiptFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  // Bulk Upload State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDocType, setBulkDocType] = useState('INVOICE'); // 'INVOICE' | 'RECEIPT'
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkScanProgress, setBulkScanProgress] = useState({ current: 0, total: 0 });
  const [bulkMergeSameDemand, setBulkMergeSameDemand] = useState(true);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResultSummary, setBulkResultSummary] = useState(null);

  // Fetch delivered demands
  const fetchDeliveredDemands = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/delivery/demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter demands that are delivered only
        const deliveredOnly = (Array.isArray(data) ? data : []).filter(
          d => d.delivery_status === 'DELIVERED'
        );
        setDemands(deliveredOnly);
        setSelectedDemandForSummary(prev =>
          prev ? deliveredOnly.find(d => d.id === prev.id) || prev : null
        );
      }
    } catch (err) {
      console.error('Error fetching documentation demands:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDeliveredDemands();
    const interval = setInterval(fetchDeliveredDemands, 15000);
    return () => clearInterval(interval);
  }, [fetchDeliveredDemands]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchDeliveredDemands();
    }
  }, [events?.DEMAND_UPDATED, fetchDeliveredDemands]);

  // Date formatting helpers
  const formatDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return dateStr || '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        } else if (parts[2].length === 4) {
          return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return 0;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
        } else if (parts[2].length === 4) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
        }
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch {
      return 0;
    }
  };

  const formatDateDisplay = (dateStr) => {
    const ts = parseDateToTimestamp(dateStr);
    if (!ts) return dateStr || 'Undated';
    return new Date(ts).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Available filter options
  const availableDates = useMemo(() => {
    const dateMap = new Map();
    demands.forEach(d => {
      const dt = d.demand_date || 'Undated';
      dateMap.set(dt, (dateMap.get(dt) || 0) + 1);
    });
    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  }, [demands]);

  const availablePins = useMemo(() => {
    const pins = new Set();
    demands.forEach(d => {
      if (d.pin_code && d.pin_code !== 'N/A') pins.add(d.pin_code);
    });
    return Array.from(pins).sort();
  }, [demands]);

  const availableUnits = useMemo(() => {
    const unitMap = new Map();
    demands.forEach(d => {
      const code = d.unit_code || d.unit_name;
      if (code) {
        const existing = unitMap.get(code);
        unitMap.set(code, {
          code,
          name: d.unit_name,
          count: (existing ? existing.count : 0) + 1
        });
      }
    });
    return Array.from(unitMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [demands]);

  // Filtered demands
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (selectedDate !== 'ALL' && (d.demand_date || 'Undated') !== selectedDate) return false;
      if (selectedPin !== 'ALL' && d.pin_code !== selectedPin) return false;
      if (selectedUnit !== 'ALL' && d.unit_code !== selectedUnit && d.unit_name !== selectedUnit) return false;

      const hasReceipt = Boolean(d.delivery_receipt_url);
      const hasInvoice = Boolean(d.invoice_url);
      const isFullyDoc = hasReceipt && hasInvoice;

      if (docFilter === 'BALANCE' && isFullyDoc) return false;
      if (docFilter === 'FULLY_DOCUMENTED' && !isFullyDoc) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = (d.demand_number || '').toLowerCase().includes(q);
        const matchInst = (d.institution_name || '').toLowerCase().includes(q);
        const matchUnit = (d.unit_name || '').toLowerCase().includes(q);
        const matchPartner = (d.delivery_partner_name || '').toLowerCase().includes(q);
        const matchPin = (d.pin_code || '').toLowerCase().includes(q);
        if (!matchNum && !matchInst && !matchUnit && !matchPartner && !matchPin) return false;
      }
      return true;
    }).sort((a, b) => (parseDateToTimestamp(b.demand_date) - parseDateToTimestamp(a.demand_date)) || (b.id - a.id));
  }, [demands, selectedDate, selectedPin, selectedUnit, docFilter, searchTerm]);

  // Datewise grouping (each date sorted newest first; rows inside sorted by Unit then Demand #)
  const groupedDatewise = useMemo(() => {
    const map = {};
    filteredDemands.forEach(d => {
      const key = d.demand_date || 'Undated';
      if (!map[key]) {
        map[key] = {
          key,
          date: key,
          totalPackets: 0,
          totalAmount: 0,
          unitSet: new Set(),
          demands: []
        };
      }
      map[key].totalPackets += Number(d.total_quantity) || 0;
      map[key].totalAmount += Number(d.total_amount) || 0;
      if (d.unit_name || d.unit_code) map[key].unitSet.add(d.unit_code || d.unit_name);
      map[key].demands.push(d);
    });
    return Object.values(map)
      .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date))
      .map(g => ({
        ...g,
        unitCount: g.unitSet.size,
        demands: [...g.demands].sort((a, b) =>
          (a.unit_name || '').localeCompare(b.unit_name || '') || (b.id - a.id)
        )
      }));
  }, [filteredDemands]);

  // Unitwise grouping (alphabetical by Unit Name; rows inside sorted newest date first)
  const groupedUnitwise = useMemo(() => {
    const map = {};
    filteredDemands.forEach(d => {
      const key = d.unit_code || d.unit_name || 'GENERAL';
      if (!map[key]) {
        map[key] = {
          key,
          unitCode: d.unit_code || '',
          unitName: d.unit_name || 'General Unit',
          nccGroup: d.ncc_group || '',
          totalPackets: 0,
          totalAmount: 0,
          dateSet: new Set(),
          demands: []
        };
      }
      map[key].totalPackets += Number(d.total_quantity) || 0;
      map[key].totalAmount += Number(d.total_amount) || 0;
      if (d.demand_date) map[key].dateSet.add(d.demand_date);
      map[key].demands.push(d);
    });
    return Object.values(map)
      .sort((a, b) => a.unitName.localeCompare(b.unitName))
      .map(g => ({
        ...g,
        dateCount: g.dateSet.size,
        demands: [...g.demands].sort((a, b) =>
          (parseDateToTimestamp(b.demand_date) - parseDateToTimestamp(a.demand_date)) || (b.id - a.id)
        )
      }));
  }, [filteredDemands]);

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Overall counts
  const totalDelivered = demands.length;
  const balanceCount = demands.filter(d => !d.delivery_receipt_url || !d.invoice_url).length;
  const fullyDocumentedCount = demands.filter(d => d.delivery_receipt_url && d.invoice_url).length;
  const totalPackets = filteredDemands.reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);
  const totalAmount = filteredDemands.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);

  // Owner Executive Summary Data (across all delivered demands matching Date/Unit/PIN/Search, ignoring Balance/Documented tab)
  const ownerReportData = useMemo(() => {
    const scopedDemands = demands.filter(d => {
      if (selectedDate !== 'ALL' && (d.demand_date || 'Undated') !== selectedDate) return false;
      if (selectedPin !== 'ALL' && d.pin_code !== selectedPin) return false;
      if (selectedUnit !== 'ALL' && d.unit_code !== selectedUnit && d.unit_name !== selectedUnit) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = (d.demand_number || '').toLowerCase().includes(q);
        const matchInst = (d.institution_name || '').toLowerCase().includes(q);
        const matchUnit = (d.unit_name || '').toLowerCase().includes(q);
        const matchPartner = (d.delivery_partner_name || '').toLowerCase().includes(q);
        const matchPin = (d.pin_code || '').toLowerCase().includes(q);
        if (!matchNum && !matchInst && !matchUnit && !matchPartner && !matchPin) return false;
      }
      return true;
    });

    const itemMap = new Map();
    const unitMap = new Map();
    const instMap = new Map();
    const dateMap = new Map();

    let docPendingCount = 0;
    let verifiedCount = 0;
    let receiptPendingCount = 0;
    let billPendingCount = 0;
    let docPendingAmount = 0;
    let deliveredPackets = 0;
    let deliveredAmount = 0;

    scopedDemands.forEach(d => {
      const qty = Number(d.total_quantity) || 0;
      const amt = Number(d.total_amount) || 0;
      const hasReceipt = Boolean(d.delivery_receipt_url);
      const hasInvoice = Boolean(d.invoice_url);
      const isVerified = hasReceipt && hasInvoice;

      deliveredPackets += qty;
      deliveredAmount += amt;

      if (isVerified) {
        verifiedCount += 1;
      } else {
        docPendingCount += 1;
        docPendingAmount += amt;
        if (!hasReceipt) receiptPendingCount += 1;
        if (!hasInvoice) billPendingCount += 1;
      }

      // 1. Items aggregation
      (d.items || []).forEach(it => {
        const iName = (it.item_name || 'Refreshment Pack').trim();
        const iQty = Number(it.quantity) || 0;
        const iCost = Number(it.total_cost) || (iQty * (Number(it.unit_price_snapshot || it.unit_price) || 0));
        if (!itemMap.has(iName)) {
          itemMap.set(iName, { itemName: iName, qty: 0, amount: 0 });
        }
        const entry = itemMap.get(iName);
        entry.qty += iQty;
        entry.amount += iCost;
      });

      // 2. Unit-wise recipient aggregation
      const uKey = d.unit_code || d.unit_name || 'GENERAL';
      if (!unitMap.has(uKey)) {
        unitMap.set(uKey, {
          key: uKey,
          unitCode: d.unit_code || '',
          unitName: d.unit_name || 'General Unit',
          instSet: new Set(),
          demandCount: 0,
          packets: 0,
          amount: 0,
          receiptPending: 0,
          billPending: 0,
          verifiedCount: 0
        });
      }
      const uEntry = unitMap.get(uKey);
      uEntry.demandCount += 1;
      uEntry.packets += qty;
      uEntry.amount += amt;
      if (d.institution_name) uEntry.instSet.add(d.institution_name);
      if (isVerified) uEntry.verifiedCount += 1;
      if (!hasReceipt) uEntry.receiptPending += 1;
      if (!hasInvoice) uEntry.billPending += 1;

      // 3. Institution-wise recipient aggregation
      const instKey = `${d.institution_name || 'Institution'}__${uKey}`;
      if (!instMap.has(instKey)) {
        instMap.set(instKey, {
          key: instKey,
          institutionName: d.institution_name || 'Institution',
          unitCode: d.unit_code || '',
          unitName: d.unit_name || 'General Unit',
          demandCount: 0,
          packets: 0,
          amount: 0,
          receiptPending: 0,
          billPending: 0,
          verifiedCount: 0
        });
      }
      const instEntry = instMap.get(instKey);
      instEntry.demandCount += 1;
      instEntry.packets += qty;
      instEntry.amount += amt;
      if (isVerified) instEntry.verifiedCount += 1;
      if (!hasReceipt) instEntry.receiptPending += 1;
      if (!hasInvoice) instEntry.billPending += 1;

      // 4. Datewise documentation pending aggregation
      const dtKey = d.demand_date || 'Undated';
      if (!dateMap.has(dtKey)) {
        dateMap.set(dtKey, {
          date: dtKey,
          demandCount: 0,
          packets: 0,
          amount: 0,
          receiptPending: 0,
          billPending: 0,
          docPendingCount: 0,
          verifiedCount: 0,
          pendingRefs: []
        });
      }
      const dtEntry = dateMap.get(dtKey);
      dtEntry.demandCount += 1;
      dtEntry.packets += qty;
      dtEntry.amount += amt;
      if (isVerified) {
        dtEntry.verifiedCount += 1;
      } else {
        dtEntry.docPendingCount += 1;
        if (!hasReceipt) dtEntry.receiptPending += 1;
        if (!hasInvoice) dtEntry.billPending += 1;
        if (d.demand_number) dtEntry.pendingRefs.push(d.demand_number);
      }
    });

    const itemSummary = Array.from(itemMap.values())
      .map(it => ({
        ...it,
        avgRate: it.qty > 0 ? Math.round((it.amount / it.qty) * 100) / 100 : 0
      }))
      .sort((a, b) => b.qty - a.qty);

    const unitRecipientSummary = Array.from(unitMap.values())
      .map(u => ({ ...u, instCount: u.instSet.size }))
      .sort((a, b) => b.amount - a.amount);

    const institutionRecipientSummary = Array.from(instMap.values())
      .sort((a, b) => b.amount - a.amount);

    const datePendingSummary = Array.from(dateMap.values())
      .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));

    return {
      scopedCount: scopedDemands.length,
      deliveredPackets,
      deliveredAmount,
      docPendingCount,
      verifiedCount,
      receiptPendingCount,
      billPendingCount,
      docPendingAmount,
      itemSummary,
      unitRecipientSummary,
      institutionRecipientSummary,
      datePendingSummary
    };
  }, [demands, selectedDate, selectedPin, selectedUnit, searchTerm]);

  const handleOpenOwnerSummary = async () => {
    setSummaryModalOpen(true);
    setLoadingSummary(true);
    try {
      const qs = new URLSearchParams();
      if (selectedDate !== 'ALL') qs.set('date', selectedDate);
      if (selectedUnit !== 'ALL') qs.set('unit_code', selectedUnit);
      if (selectedPin !== 'ALL') qs.set('pin_code', selectedPin);
      const res = await fetch(`/api/delivery/documentation-summary?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerSummaryStats(data);
      }
    } catch (err) {
      console.error('Error fetching owner summary stats:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDownloadOwnerPdf = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentW = pageW - margin * 2;
    let y = 10;

    const fmtRs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
    const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

    const ensureSpace = (neededMm) => {
      if (y + neededMm > pageH - 12) {
        pdf.addPage();
        y = 12;
      }
    };

    // Header Banner
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.roundedRect(margin, y, contentW, 18, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('FLAVOUR BASE INDIA — DELIVERY & DOCUMENTATION SUMMARY', margin + 4, y + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const scopeParts = [
      selectedDate === 'ALL' ? 'Date: All Dates' : `Date: ${formatDDMMYYYY(selectedDate)}`,
      selectedUnit === 'ALL' ? 'Unit: All Units' : `Unit: ${selectedUnit}`,
      selectedPin === 'ALL' ? 'PIN: All' : `PIN: ${selectedPin}`
    ];
    const generatedAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    pdf.text(`Scope: ${scopeParts.join(' | ')}   •   Generated: ${generatedAt}`, margin + 4, y + 13.5);
    y += 22;

    // KPI Summary Strip (4 compact boxes)
    const genCount = ownerSummaryStats?.generated?.count ?? ownerReportData.scopedCount;
    const genPkts = ownerSummaryStats?.generated?.packets ?? ownerReportData.deliveredPackets;
    const genAmt = ownerSummaryStats?.generated?.amount ?? ownerReportData.deliveredAmount;
    const delCount = ownerSummaryStats?.delivered?.count ?? ownerReportData.scopedCount;
    const delPkts = ownerSummaryStats?.delivered?.packets ?? ownerReportData.deliveredPackets;
    const delAmt = ownerSummaryStats?.delivered?.amount ?? ownerReportData.deliveredAmount;
    const pendDelCount = ownerSummaryStats?.pending_delivery?.count ?? Math.max(0, genCount - delCount);
    const pendDelPkts = ownerSummaryStats?.pending_delivery?.packets ?? Math.max(0, genPkts - delPkts);
    const delPct = genCount > 0 ? Math.round((delCount / genCount) * 100) : 0;

    const kpis = [
      {
        title: 'TOTAL DEMAND GENERATED',
        main: `${fmtNum(genCount)} Demands`,
        sub: `${fmtNum(genPkts)} Pkts | ${fmtRs(genAmt)}`,
        bg: [239, 246, 255],
        border: [191, 219, 254],
        accent: [29, 78, 216]
      },
      {
        title: `TOTAL DELIVERED (${delPct}%)`,
        main: `${fmtNum(delCount)} Demands`,
        sub: `${fmtNum(delPkts)} Pkts | ${fmtRs(delAmt)}`,
        bg: [236, 253, 245],
        border: [167, 243, 208],
        accent: [4, 120, 87]
      },
      {
        title: 'PENDING DELIVERY',
        main: `${fmtNum(pendDelCount)} Demands`,
        sub: `${fmtNum(pendDelPkts)} Pkts in pipeline`,
        bg: [248, 250, 252],
        border: [226, 232, 240],
        accent: [51, 65, 85]
      },
      {
        title: 'DOCS PENDING (BALANCE)',
        main: `${fmtNum(ownerReportData.docPendingCount)} Demands`,
        sub: `Rcpt: ${ownerReportData.receiptPendingCount} | Bill: ${ownerReportData.billPendingCount} | ${fmtRs(ownerReportData.docPendingAmount)}`,
        bg: [255, 251, 235],
        border: [253, 230, 138],
        accent: [180, 83, 9]
      }
    ];

    const boxGap = 2.5;
    const boxW = (contentW - boxGap * 3) / 4;
    kpis.forEach((k, idx) => {
      const bx = margin + idx * (boxW + boxGap);
      pdf.setFillColor(...k.bg);
      pdf.setDrawColor(...k.border);
      pdf.roundedRect(bx, y, boxW, 17, 1.5, 1.5, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...k.accent);
      pdf.text(k.title, bx + 2.5, y + 4.5);
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(k.main, bx + 2.5, y + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(pdf.splitTextToSize(k.sub, boxW - 5)[0] || '', bx + 2.5, y + 14.5);
    });
    y += 22;

    // Helper for compact vector tables
    const drawSectionTable = (title, headers, rows, colWidths, aligns = []) => {
      ensureSpace(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title, margin, y);
      y += 2.5;

      const drawHeaderRow = () => {
        pdf.setFillColor(241, 245, 249);
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin, y, contentW, 6.5, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(51, 65, 85);
        let cx = margin;
        headers.forEach((h, i) => {
          const al = aligns[i] || 'left';
          const tx = al === 'right' ? cx + colWidths[i] - 2 : al === 'center' ? cx + colWidths[i] / 2 : cx + 2;
          pdf.text(String(h), tx, y + 4.4, { align: al });
          cx += colWidths[i];
        });
        y += 6.5;
      };

      drawHeaderRow();

      rows.forEach((row, rIdx) => {
        const isTotalRow = Boolean(row._isTotal);
        const cellLines = row.cells.map((val, i) => pdf.splitTextToSize(String(val ?? ''), colWidths[i] - 4));
        const maxLines = Math.max(1, ...cellLines.map(l => l.length));
        const rowH = Math.max(5.8, maxLines * 3.5 + 2.2);

        if (y + rowH > pageH - 12) {
          pdf.addPage();
          y = 12;
          drawHeaderRow();
        }

        if (isTotalRow) {
          pdf.setFillColor(238, 242, 255);
        } else if (rIdx % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, y, contentW, rowH, 'FD');

        pdf.setFont('helvetica', isTotalRow ? 'bold' : 'normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(15, 23, 42);

        let cx = margin;
        cellLines.forEach((lines, i) => {
          const al = aligns[i] || 'left';
          const tx = al === 'right' ? cx + colWidths[i] - 2 : al === 'center' ? cx + colWidths[i] / 2 : cx + 2;
          lines.forEach((ln, lIdx) => {
            pdf.text(ln, tx, y + 4 + lIdx * 3.5, { align: al });
          });
          cx += colWidths[i];
        });
        y += rowH;
      });
      y += 5;
    };

    // Section 1: Last Day Demand & Delivery Status (Serial #1 - Merged NCC Unit cell when >1 institution)
    const ld = ownerSummaryStats?.last_day;
    if (ld) {
      const ldTot = ld.totals || {};
      const ldDemands = ld.demands || [];

      ensureSpace(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`1. LAST DAY DEMAND & DELIVERY STATUS (${formatDDMMYYYY(ld.date)})`, margin, y);
      y += 2.5;

      const ldColWidths = [28, 28, 66, 14, 24, 30];
      const ldHeaders = ['NCC Unit', 'Demand Ref', 'Institution', 'Pkts', 'Amount', 'Delivery Status'];
      const ldAligns = ['left', 'left', 'left', 'right', 'right', 'center'];

      const drawLdHeader = () => {
        pdf.setFillColor(241, 245, 249);
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin, y, contentW, 6.5, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(51, 65, 85);
        let cx = margin;
        ldHeaders.forEach((h, i) => {
          const al = ldAligns[i];
          const tx = al === 'right' ? cx + ldColWidths[i] - 2 : al === 'center' ? cx + ldColWidths[i] / 2 : cx + 2;
          pdf.text(h, tx, y + 4.4, { align: al });
          cx += ldColWidths[i];
        });
        y += 6.5;
      };

      drawLdHeader();

      if (ldDemands.length === 0) {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, y, contentW, 6, 'FD');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`No demands recorded on ${formatDDMMYYYY(ld.date)}`, margin + 2, y + 4);
        y += 6;
      } else {
        // Group demands by unit_name preserving order
        const unitGroups = [];
        ldDemands.forEach(d => {
          const uName = d.unit_name || 'Unassigned';
          const lastGrp = unitGroups[unitGroups.length - 1];
          if (lastGrp && lastGrp.unit_name === uName) {
            lastGrp.items.push(d);
          } else {
            unitGroups.push({ unit_name: uName, items: [d] });
          }
        });

        unitGroups.forEach(grp => {
          const rowHeights = grp.items.map(d => {
            const instLines = pdf.splitTextToSize(String(d.institution_name || ''), ldColWidths[2] - 4);
            return Math.max(5.8, instLines.length * 3.5 + 2.2);
          });
          const totalGrpH = rowHeights.reduce((a, b) => a + b, 0);

          if (y + totalGrpH > pageH - 12) {
            pdf.addPage();
            y = 12;
            drawLdHeader();
          }

          const grpStartY = y;
          // Draw merged NCC Unit cell on the left
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(margin, grpStartY, ldColWidths[0], totalGrpH, 'FD');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.2);
          pdf.setTextColor(15, 23, 42);
          const unitLines = pdf.splitTextToSize(String(grp.unit_name), ldColWidths[0] - 4);
          const unitTextStartY = grpStartY + (totalGrpH / 2) - ((unitLines.length - 1) * 1.75) + 1.2;
          unitLines.forEach((ln, lIdx) => {
            pdf.text(ln, margin + 2, unitTextStartY + lIdx * 3.5);
          });

          // Draw individual institution/demand rows on the right
          grp.items.forEach((d, idx) => {
            const rh = rowHeights[idx];
            const cells = [d.demand_number, d.institution_name, fmtNum(d.packets), fmtRs(d.amount), d.delivery_status];
            let cx = margin + ldColWidths[0];
            for (let cIdx = 0; cIdx < cells.length; cIdx++) {
              const colW = ldColWidths[cIdx + 1];
              const al = ldAligns[cIdx + 1];
              pdf.setFillColor(idx % 2 === 1 ? 252 : 255, idx % 2 === 1 ? 253 : 255, idx % 2 === 1 ? 255 : 255);
              pdf.setDrawColor(226, 232, 240);
              pdf.rect(cx, y, colW, rh, 'FD');
              pdf.setFont('helvetica', cIdx === 4 ? 'bold' : 'normal');
              pdf.setFontSize(7.1);
              if (cIdx === 4) {
                if (d.delivery_status === 'DELIVERED') pdf.setTextColor(4, 120, 87);
                else if (d.delivery_status === 'CANCELLED' || d.delivery_status === 'REJECTED') pdf.setTextColor(185, 28, 28);
                else pdf.setTextColor(180, 83, 9);
              } else {
                pdf.setTextColor(15, 23, 42);
              }
              const lines = pdf.splitTextToSize(String(cells[cIdx] ?? ''), colW - 4);
              const tx = al === 'right' ? cx + colW - 2 : al === 'center' ? cx + colW / 2 : cx + 2;
              lines.forEach((ln, lIdx) => {
                pdf.text(ln, tx, y + 4 + lIdx * 3.5, { align: al });
              });
              cx += colW;
            }
            y += rh;
          });
        });
      }

      // Totals row for Last Day
      ensureSpace(7);
      pdf.setFillColor(238, 242, 255);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, y, contentW, 6.2, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(15, 23, 42);
      const totCells = [
        `TOTAL (${formatDDMMYYYY(ld.date)})`,
        `Dem: ${fmtNum(ldTot.demanded_count)}`,
        `Del: ${fmtNum(ldTot.delivered_count)} | Pend: ${fmtNum(ldTot.pending_count)} | Canc: ${fmtNum(ldTot.cancelled_count)}`,
        fmtNum(ldTot.demanded_packets),
        fmtRs(ldTot.demanded_amount),
        `${fmtNum(ldTot.delivered_packets)} Del`
      ];
      let cxTot = margin;
      totCells.forEach((val, i) => {
        const colW = ldColWidths[i];
        const al = ldAligns[i];
        const tx = al === 'right' ? cxTot + colW - 2 : al === 'center' ? cxTot + colW / 2 : cxTot + 2;
        pdf.text(String(val), tx, y + 4.2, { align: al });
        cxTot += colW;
      });
      y += 11;
    }

    // Section 2: Total Items Demanded, Delivered & Balance (Item-wise)
    const apiItems = ownerSummaryStats?.item_wise || [];
    if (apiItems.length > 0) {
      const totDem = apiItems.reduce((s, x) => s + (x.demanded_packets || 0), 0);
      const totDemAmt = apiItems.reduce((s, x) => s + (x.demanded_amount || 0), 0);
      const totDel = apiItems.reduce((s, x) => s + (x.delivered_packets || 0), 0);
      const totDelAmt = apiItems.reduce((s, x) => s + (x.delivered_amount || 0), 0);
      const totBal = apiItems.reduce((s, x) => s + (x.balance_packets || 0), 0);
      const totBalAmt = apiItems.reduce((s, x) => s + (x.balance_amount || 0), 0);
      const itemRows = apiItems.map(it => ({
        cells: [
          it.item_name,
          `${fmtNum(it.demanded_packets)} / ${fmtRs(it.demanded_amount)}`,
          `${fmtNum(it.delivered_packets)} / ${fmtRs(it.delivered_amount)}`,
          `${fmtNum(it.balance_packets)} / ${fmtRs(it.balance_amount)}`
        ]
      }));
      itemRows.push({
        _isTotal: true,
        cells: [
          'TOTAL',
          `${fmtNum(totDem)} / ${fmtRs(totDemAmt)}`,
          `${fmtNum(totDel)} / ${fmtRs(totDelAmt)}`,
          `${fmtNum(totBal)} / ${fmtRs(totBalAmt)}`
        ]
      });
      drawSectionTable(
        '2. TOTAL ITEMS DEMANDED, DELIVERED & BALANCE (ITEM-WISE)',
        ['Item / Menu Pack Name', 'Demanded (Qty / Amt)', 'Delivered (Qty / Amt)', 'Balance (Qty / Amt)'],
        itemRows,
        [70, 40, 40, 40],
        ['left', 'right', 'right', 'right']
      );
    } else if (ownerReportData.itemSummary.length > 0) {
      const itemRows = ownerReportData.itemSummary.map(it => ({
        cells: [it.itemName, `${fmtNum(it.qty)} / ${fmtRs(it.amount)}`, `${fmtNum(it.qty)} / ${fmtRs(it.amount)}`, '0 / Rs. 0']
      }));
      itemRows.push({
        _isTotal: true,
        cells: ['TOTAL', `${fmtNum(ownerReportData.deliveredPackets)} / ${fmtRs(ownerReportData.deliveredAmount)}`, `${fmtNum(ownerReportData.deliveredPackets)} / ${fmtRs(ownerReportData.deliveredAmount)}`, '0 / Rs. 0']
      });
      drawSectionTable(
        '2. TOTAL ITEMS DEMANDED, DELIVERED & BALANCE (ITEM-WISE)',
        ['Item / Menu Pack Name', 'Demanded (Qty / Amt)', 'Delivered (Qty / Amt)', 'Balance (Qty / Amt)'],
        itemRows,
        [70, 40, 40, 40],
        ['left', 'right', 'right', 'right']
      );
    }

    // Section 3A: Delivered To Whom — Unit-wise (ALWAYS printed)
    const unitRows = ownerReportData.unitRecipientSummary.map(u => ({
      cells: [
        u.unitCode ? `${u.unitName} (${u.unitCode})` : u.unitName,
        fmtNum(u.instCount),
        fmtNum(u.demandCount),
        fmtNum(u.packets),
        fmtRs(u.amount),
        `${u.verifiedCount} Ver / ${u.demandCount - u.verifiedCount} Pend`
      ]
    }));
    unitRows.push({
      _isTotal: true,
      cells: [
        `TOTAL (${ownerReportData.unitRecipientSummary.length} Units)`,
        '-',
        fmtNum(ownerReportData.scopedCount),
        fmtNum(ownerReportData.deliveredPackets),
        fmtRs(ownerReportData.deliveredAmount),
        `${ownerReportData.verifiedCount} Ver / ${ownerReportData.docPendingCount} Pend`
      ]
    });
    drawSectionTable(
      '3A. DELIVERED TO WHOM (UNIT-WISE SUMMARY)',
      ['NCC Unit / Battalion', 'Inst.', 'Demands', 'Packets', 'Amount', 'Docs Status'],
      unitRows,
      [74, 14, 20, 22, 28, 32],
      ['left', 'center', 'center', 'right', 'right', 'center']
    );

    // Section 3B: Delivered To Whom — Institution-wise (ALWAYS printed)
    const instRows = ownerReportData.institutionRecipientSummary.map(inst => ({
      cells: [
        `${inst.institutionName} (${inst.unitCode || inst.unitName})`,
        fmtNum(inst.demandCount),
        fmtNum(inst.packets),
        fmtRs(inst.amount),
        `${inst.verifiedCount} Ver / ${inst.demandCount - inst.verifiedCount} Pend`
      ]
    }));
    instRows.push({
      _isTotal: true,
      cells: [
        `TOTAL (${ownerReportData.institutionRecipientSummary.length} Institutions)`,
        fmtNum(ownerReportData.scopedCount),
        fmtNum(ownerReportData.deliveredPackets),
        fmtRs(ownerReportData.deliveredAmount),
        `${ownerReportData.verifiedCount} Ver / ${ownerReportData.docPendingCount} Pend`
      ]
    });
    drawSectionTable(
      '3B. DELIVERED TO WHOM (INSTITUTION-WISE BREAKDOWN)',
      ['Institution (NCC Unit)', 'Demands', 'Packets', 'Amount', 'Docs Status'],
      instRows,
      [86, 20, 22, 30, 32],
      ['left', 'center', 'right', 'right', 'center']
    );

    // Section 4: Stock Balance & Consumption Status
    const st = ownerSummaryStats?.stock_status;
    if (st) {
      const stockRows = (st.unit_wise_consumption || []).map(uc => ({
        cells: [
          uc.unit_name,
          `${fmtNum(uc.day_packets)} Pkts / ${fmtRs(uc.day_amount)}`,
          `${fmtNum(uc.week_packets)} Pkts / ${fmtRs(uc.week_amount)}`,
          `${fmtNum(uc.month_packets)} Pkts / ${fmtRs(uc.month_amount)}`
        ]
      }));
      stockRows.unshift({
        _isTotal: true,
        cells: [
          `TOTAL STOCK: ${fmtNum(st.total_stock_units)} Units (${fmtRs(st.total_stock_value)})`,
          `Last Del (${formatDDMMYYYY(st.last_delivery_date)})`,
          `${fmtNum(st.last_delivery_packets)} Pkts`,
          fmtRs(st.last_delivery_amount)
        ]
      });
      drawSectionTable(
        '4. STOCK BALANCE & UNIT-WISE CONSUMPTION (DAY / WEEKLY / MONTHLY)',
        ['NCC Unit / Stock Summary', 'Day-wise (Last Day)', 'Weekly (7 Days)', 'Monthly (Curr Month)'],
        stockRows,
        [64, 42, 42, 42],
        ['left', 'right', 'right', 'right']
      );
    }

    // Section 5: Documentation Pending Datewise
    if (ownerReportData.datePendingSummary.length > 0) {
      const dateRows = ownerReportData.datePendingSummary.map(dt => ({
        cells: [
          formatDDMMYYYY(dt.date),
          fmtNum(dt.demandCount),
          fmtNum(dt.packets),
          fmtRs(dt.amount),
          fmtNum(dt.receiptPending),
          fmtNum(dt.billPending),
          fmtNum(dt.verifiedCount),
          dt.pendingRefs.length > 0 ? dt.pendingRefs.join(', ') : 'All Verified'
        ]
      }));
      dateRows.push({
        _isTotal: true,
        cells: [
          'TOTAL',
          fmtNum(ownerReportData.scopedCount),
          fmtNum(ownerReportData.deliveredPackets),
          fmtRs(ownerReportData.deliveredAmount),
          fmtNum(ownerReportData.receiptPendingCount),
          fmtNum(ownerReportData.billPendingCount),
          fmtNum(ownerReportData.verifiedCount),
          `${ownerReportData.docPendingCount} Pending`
        ]
      });
      drawSectionTable(
        '5. DOCUMENTATION PENDING — DATEWISE SUMMARY',
        ['Date', 'Deliv.', 'Packets', 'Amount', 'Rcpt Pend', 'Bill Pend', 'Verified', 'Pending Demand Refs'],
        dateRows,
        [22, 13, 17, 25, 17, 16, 16, 64],
        ['left', 'center', 'right', 'right', 'center', 'center', 'center', 'left']
      );
    }

    // Section 6: Cancelled & Rejected Demands (Separate Last Table)
    const canRej = ownerSummaryStats?.cancelled_rejected || [];
    const canRows = canRej.length > 0
      ? canRej.map(c => ({
          cells: [
            c.demand_number,
            formatDDMMYYYY(c.demand_date),
            c.unit_name ? `${c.institution_name} (${c.unit_name})` : c.institution_name,
            fmtNum(c.packets),
            fmtRs(c.amount),
            c.status,
            c.reason || '-'
          ]
        }))
      : [{ cells: ['-', '-', 'No cancelled or rejected demands in this scope', '0', 'Rs. 0', '-', '-'] }];
    drawSectionTable(
      `6. CANCELLED & REJECTED DEMANDS (${canRej.length})`,
      ['Demand Ref', 'Date', 'Institution (Unit)', 'Pkts', 'Amount', 'Status', 'Reason'],
      canRows,
      [28, 20, 56, 14, 22, 20, 30],
      ['left', 'left', 'left', 'right', 'right', 'center', 'left']
    );

    // Page Footers
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Flavour Base India • Official Delivery & Documentation Summary', margin, pageH - 5);
      pdf.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
    }

    const dateTag = new Date().toISOString().slice(0, 10);
    pdf.save(`Flavour_Owner_Delivery_Summary_${dateTag}.pdf`);
  };

  // Document Upload Handler
  const handleUploadDocs = async (e) => {
    e.preventDefault();
    if (!selectedDemandForSummary) return;

    if (!receiptFile && !invoiceFile && !selectedDemandForSummary.delivery_receipt_url && !selectedDemandForSummary.invoice_url) {
      alert('Please select a signed delivery receipt or bill/invoice to upload.');
      return;
    }

    setFulfilling(true);
    try {
      const formData = new FormData();
      if (receiptFile) formData.append('receipt', receiptFile);
      if (invoiceFile) formData.append('invoice', invoiceFile);

      const res = await fetch(`/api/demands/${selectedDemandForSummary.id}/fulfill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      alert('Documents uploaded and verified successfully!');
      setReceiptFile(null);
      setInvoiceFile(null);
      setReceiptPreview(null);
      setInvoicePreview(null);
      
      // Update local state
      setSelectedDemandForSummary(prev => prev ? ({
        ...prev,
        status: data.status || prev.status,
        delivery_receipt_url: data.delivery_receipt_url || prev.delivery_receipt_url,
        invoice_url: data.invoice_url || prev.invoice_url
      }) : null);

      fetchDeliveredDemands();
    } catch (err) {
      alert(err.message);
    } finally {
      setFulfilling(false);
    }
  };

  // Document Remove Handler
  const handleRemoveDoc = async (docType) => {
    if (!selectedDemandForSummary) return;
    const label = docType === 'invoice' ? 'Vendor Bill / Invoice' : 'Signed Delivery Receipt';
    if (!window.confirm(`Are you sure you want to remove the uploaded ${label}?`)) return;

    setRemovingDoc(docType);
    try {
      const res = await fetch(`/api/demands/${selectedDemandForSummary.id}/document/${docType}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to remove ${label}`);

      if (docType === 'receipt') {
        setReceiptFile(null);
        setReceiptPreview(null);
      } else {
        setInvoiceFile(null);
        setInvoicePreview(null);
      }

      setSelectedDemandForSummary(prev => prev ? ({
        ...prev,
        status: data.status || prev.status,
        delivery_receipt_url: data.delivery_receipt_url ?? null,
        invoice_url: data.invoice_url ?? null
      }) : null);

      fetchDeliveredDemands();
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingDoc(null);
    }
  };

  const extractDemandKey = (fileName) => {
    if (!fileName) return null;
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // 1. Try full pattern: DEM-2026-182 or DEM_2026_182 or DEM2026182
    const fullMatch = nameWithoutExt.match(/DEM[-_ ]?(\d{4}|\d{2})[-_ ]?(\d+)/i);
    if (fullMatch) {
      const year = fullMatch[1].length === 2 ? `20${fullMatch[1]}` : fullMatch[1];
      const num = fullMatch[2];
      return { full: `DEM-${year}-${num}`, num: parseInt(num, 10) };
    }

    // 2. Try year-num: 2026-182 or 2026_182
    const yearNumMatch = nameWithoutExt.match(/\b(202\d)[-_ ]?(\d+)\b/);
    if (yearNumMatch) {
      return { full: `DEM-${yearNumMatch[1]}-${yearNumMatch[2]}`, num: parseInt(yearNumMatch[2], 10) };
    }

    // 3. Try isolated number: e.g. "Invoice_182", "182", "bill-182"
    const numMatch = nameWithoutExt.match(/(?:^|[^0-9])(\d{1,4})(?:$|[^0-9])/);
    if (numMatch) {
      return { num: parseInt(numMatch[1], 10) };
    }

    return null;
  };

  const findDemandByExtractedKey = useCallback((key) => {
    if (!key) return null;
    if (key.full) {
      const exact = demands.find(d => (d.demand_number || '').toUpperCase() === key.full.toUpperCase());
      if (exact) return exact;
    }
    if (key.num) {
      const candidates = demands.filter(d => {
        const m = (d.demand_number || '').match(/(\d+)$/);
        const dNum = m ? parseInt(m[1], 10) : d.id;
        return dNum === key.num || d.id === key.num;
      });
      if (candidates.length === 1) return candidates[0];
    }
    return null;
  }, [demands]);

  const getDemandRefStatus = useCallback((pdfDemandNum, matchedDemand, isPdf) => {
    if (!isPdf) return 'IMAGE';
    if (pdfDemandNum === null || pdfDemandNum === undefined) return 'NO_REF';
    if (!matchedDemand) return 'NOT_IN_LIST';
    const m = (matchedDemand.demand_number || '').match(/(\d+)$/);
    const dNum = m ? parseInt(m[1], 10) : matchedDemand.id;
    return dNum === pdfDemandNum ? 'MATCH' : 'MISMATCH';
  }, []);

  const autoMatchFiles = async (rawFiles) => {
    const fileList = Array.from(rawFiles || []);
    if (fileList.length === 0) return;

    setBulkScanning(true);
    setBulkScanProgress({ current: 0, total: fileList.length });
    try {
      const results = new Array(fileList.length);
      const concurrency = 4;
      let doneCount = 0;

      for (let start = 0; start < fileList.length; start += concurrency) {
        const slice = fileList.slice(start, start + concurrency);
        await Promise.all(slice.map(async (file, offset) => {
          const idx = start + offset;
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

          let matchedDemand = null;
          let matchSource = null;
          let invoiceNo = '';
          let pdfDemandNum = null;
          let pdfOtherRef = '';

          if (isPdf) {
            // For PDFs: match strictly by "Other References" inside the PDF (never by filename)
            const pdfInfo = await extractDemandFromPdf(file);
            invoiceNo = pdfInfo.invoiceNo || '';
            pdfDemandNum = pdfInfo.demandNum;
            pdfOtherRef = pdfInfo.demandFull || (pdfInfo.demandNum !== null ? String(pdfInfo.demandNum) : '');
            if (pdfInfo.demandFull || pdfInfo.demandNum !== null) {
              matchedDemand = findDemandByExtractedKey({
                full: pdfInfo.demandFull,
                num: pdfInfo.demandNum
              });
              if (matchedDemand) {
                matchSource = pdfInfo.method?.startsWith('ocr') ? 'pdf-ocr' : 'pdf-ref';
              }
            }
          } else {
            // For image files: fall back to filename matching
            const fileKey = extractDemandKey(file.name);
            matchedDemand = findDemandByExtractedKey(fileKey);
            matchSource = matchedDemand ? 'filename' : null;
          }

          results[idx] = {
            id: `${file.name}-${idx}-${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            isPdf,
            invoiceNo,
            pdfDemandNum,
            pdfOtherRef,
            refMatchStatus: getDemandRefStatus(pdfDemandNum, matchedDemand, isPdf),
            matchSource,
            matchedDemandId: matchedDemand ? matchedDemand.id : '',
            matchedDemandNumber: matchedDemand ? matchedDemand.demand_number : '',
            matchedInstitution: matchedDemand ? matchedDemand.institution_name : '',
            matchedPin: matchedDemand ? matchedDemand.pin_code : '',
            isMatched: Boolean(matchedDemand)
          };

          doneCount += 1;
          setBulkScanProgress({ current: doneCount, total: fileList.length });
        }));
      }

      setBulkFiles(prev => [...prev, ...results]);
    } finally {
      setBulkScanning(false);
    }
  };

  const handleUpdateFileDemand = (fileId, newDemandId) => {
    const selected = demands.find(d => String(d.id) === String(newDemandId));
    setBulkFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return {
        ...f,
        matchedDemandId: selected ? selected.id : '',
        matchedDemandNumber: selected ? selected.demand_number : '',
        matchedInstitution: selected ? selected.institution_name : '',
        matchedPin: selected ? selected.pin_code : '',
        refMatchStatus: getDemandRefStatus(f.pdfDemandNum, selected || null, f.isPdf),
        isMatched: Boolean(selected)
      };
    }));
  };

  const handleRemoveBulkFile = (fileId) => {
    setBulkFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleExecuteBulkUpload = async () => {
    const readyFiles = bulkFiles.filter(f => f.matchedDemandId);
    if (readyFiles.length === 0) {
      alert('No matched files to upload. Please match at least one file to a demand.');
      return;
    }

    setBulkUploading(true);
    setBulkResultSummary(null);

    try {
      let filesToUpload = readyFiles;

      // Merge multiple PDFs belonging to the same demand before uploading
      if (bulkMergeSameDemand) {
        const byDemand = new Map();
        for (const item of readyFiles) {
          const key = String(item.matchedDemandId);
          if (!byDemand.has(key)) byDemand.set(key, []);
          byDemand.get(key).push(item);
        }

        const mergedList = [];
        for (const [, group] of byDemand.entries()) {
          const pdfItems = group.filter(
            i => i.file.type === 'application/pdf' || i.name.toLowerCase().endsWith('.pdf')
          );
          const nonPdfItems = group.filter(
            i => !(i.file.type === 'application/pdf' || i.name.toLowerCase().endsWith('.pdf'))
          );

          if (pdfItems.length > 1) {
            pdfItems.sort((a, b) =>
              (a.invoiceNo || a.name).localeCompare(b.invoiceNo || b.name)
            );
            const baseName = `${pdfItems[0].matchedDemandNumber || pdfItems[0].matchedDemandId}.pdf`;
            const mergedFile = await mergePdfFiles(pdfItems.map(i => i.file), baseName);
            mergedList.push({
              ...pdfItems[0],
              file: mergedFile,
              name: baseName
            });
          } else {
            mergedList.push(...pdfItems);
          }
          mergedList.push(...nonPdfItems);
        }
        filesToUpload = mergedList;
      }

      setBulkProgress({ current: 0, total: filesToUpload.length });

      const batchSize = 10;
      let totalUpdated = 0;
      let failedCount = 0;

      for (let i = 0; i < filesToUpload.length; i += batchSize) {
        const chunk = filesToUpload.slice(i, i + batchSize);
        const formData = new FormData();
        const mappings = [];

        chunk.forEach(item => {
          formData.append('files', item.file);
          mappings.push({
            originalname: item.file.name,
            demand_id: item.matchedDemandId,
            doc_type: bulkDocType
          });
        });

        formData.append('mappings', JSON.stringify(mappings));
        formData.append('doc_type', bulkDocType);

        const res = await fetch('/api/demands/bulk-upload-docs', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const updatedInChunk = typeof data.updated === 'number' ? data.updated : chunk.length;
          totalUpdated += updatedInChunk;
          failedCount += Math.max(0, chunk.length - updatedInChunk);
        } else {
          failedCount += chunk.length;
        }

        setBulkProgress({ current: Math.min(i + chunk.length, filesToUpload.length), total: filesToUpload.length });
      }

      setBulkResultSummary({
        success: true,
        updated: totalUpdated,
        failed: failedCount
      });

      fetchDeliveredDemands();
      setTimeout(() => {
        setBulkModalOpen(false);
        setBulkFiles([]);
        setBulkUploading(false);
        setBulkResultSummary(null);
      }, 2000);
    } catch (err) {
      alert('Bulk upload error: ' + err.message);
      setBulkUploading(false);
    }
  };

  const handleSendWhatsAppAlert = (dem) => {
    if (!dem) return;
    const phone = dem.ano_cto_contact || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `*NCC REFRESHMENT DELIVERY COMPLETED - DOCUMENTATION PROOF*\n` +
      `--------------------------------\n` +
      `Demand: ${dem.demand_number}\n` +
      `Institution: ${dem.institution_name}\n` +
      `Delivered Packets: ${dem.total_quantity} Pkts\n` +
      `Delivered Date: ${formatDDMMYYYY(dem.demand_date)}\n` +
      `Delivered By: ${dem.delivery_partner_name || 'Fleet Partner'} (${dem.delivery_partner_vehicle || 'Van'})\n` +
      `Delivery Status: Successfully Delivered & Verified\n` +
      `--------------------------------\n` +
      `Official documentation and receipts are registered.`;
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const activeGroups = groupMode === 'DATEWISE' ? groupedDatewise : groupMode === 'UNITWISE' ? groupedUnitwise : [];
  const allCollapsed = activeGroups.length > 0 && activeGroups.every(g => collapsedGroups[g.key]);

  const handleToggleAllGroups = () => {
    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const next = {};
      activeGroups.forEach(g => {
        next[g.key] = true;
      });
      setCollapsedGroups(next);
    }
  };

  const renderManifestTable = (rows) => (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
            <tr>
              <th className="px-4 py-3.5 w-[15%]"># / Demand Ref</th>
              <th className="px-4 py-3.5 w-[18%]">Battalion / Unit</th>
              <th className="px-4 py-3.5 w-[30%]">Delivered Institution & Address</th>
              <th className="px-4 py-3.5 text-center w-[11%]">Packets / Value</th>
              <th className="px-4 py-3.5 text-center w-[12%]">Delivered By</th>
              <th className="px-4 py-3.5 text-center w-[10%]">Documentation Proof</th>
              <th className="px-4 py-3.5 text-right w-[4%]">Summary Card</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((dem, idx) => {
              const hasReceipt = Boolean(dem.delivery_receipt_url);
              const hasInvoice = Boolean(dem.invoice_url);
              const isFullyDoc = hasReceipt && hasInvoice;

              return (
                <tr
                  key={dem.id}
                  onClick={() => setSelectedDemandForSummary(dem)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  {/* Col 1: # & Demand Ref (Bold & Prominent) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-base text-blue-700 group-hover:text-blue-800 tracking-tight">
                          {dem.demand_number}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          {formatDDMMYYYY(dem.demand_date)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Col 2: Battalion / Unit */}
                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-xs text-slate-900" title={dem.unit_name}>
                      {dem.unit_name || 'General Unit'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {dem.unit_code && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold border border-slate-200">
                          {dem.unit_code}
                        </span>
                      )}
                      {dem.ncc_group && (
                        <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-extrabold border border-amber-200">
                          {dem.ncc_group}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Col 3: Delivered Institution & PIN & Address */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {dem.institution_name}
                      </h5>
                      {dem.pin_code && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 shrink-0">
                          <MapPin className="w-2.5 h-2.5 text-rose-500" />
                          PIN {dem.pin_code}
                        </span>
                      )}
                    </div>
                    {dem.complete_address && (
                      <p className="text-[11px] text-slate-500 font-medium truncate max-w-xl mt-0.5" title={dem.complete_address}>
                        {dem.complete_address}
                      </p>
                    )}
                  </td>

                  {/* Col 4: Quantity & Amount */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <span className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-xl shadow-2xs inline-block">
                      {dem.total_quantity || 0} Pkts
                    </span>
                    <div className="text-xs font-black text-emerald-700 mt-0.5">
                      ₹{(dem.total_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* Col 5: Delivered By */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <div className="text-xs font-extrabold text-slate-800" title={dem.delivery_partner_name}>
                      {dem.delivery_partner_name || 'Assigned Driver'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {dem.delivery_partner_vehicle || 'Delivery Van'}
                    </div>
                  </td>

                  {/* Col 6: Documentation Proof */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {isFullyDoc ? (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified & Fully Doc</span>
                        </span>
                      ) : (
                        <>
                          {hasReceipt ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Receipt
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Receipt Pending
                            </span>
                          )}
                          {hasInvoice ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Bill
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Bill Pending
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Col 7: Summary Card */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedDemandForSummary(dem)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Open Delivery Summary Card & Upload Documents"
                    >
                      <span>Card</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Executive Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black text-[11px] mb-1.5 border border-indigo-200 shadow-2xs">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" /> Post-Delivery Documentation & Verification
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Documentation Portal
            <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-200" /> {balanceCount} Balance
            </span>
            <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-200" /> {fullyDocumentedCount} Documented
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Official records for delivered demands. Click any delivery row to view the full <strong className="text-slate-800 font-bold">Summary Card</strong>, verify items, and upload signed delivery receipts or vendor invoices.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenOwnerSummary}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="View compact executive summary & download PDF report for Flavour Base India owner"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Owner Summary & PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Bulk upload invoices or receipts with auto-matching by Demand Reference Number"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload Docs</span>
          </button>
          <Link
            to="/delivery"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet Delivery</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Manifest</span>
          </button>
        </div>
      </div>

      {/* KPI Slicers Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Slicer Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 overflow-x-auto">
            {/* Balance Pending */}
            <button
              type="button"
              onClick={() => setDocFilter('BALANCE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                docFilter === 'BALANCE'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100/70'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Balance ({balanceCount} Pending)</span>
            </button>

            {/* Fully Documented */}
            <button
              type="button"
              onClick={() => setDocFilter('FULLY_DOCUMENTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                docFilter === 'FULLY_DOCUMENTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/70'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Documented ({fullyDocumentedCount})</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-extrabold text-xs border border-blue-200 shadow-2xs">
              Total Packets: <strong>{totalPackets.toLocaleString('en-IN')}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-200 shadow-2xs">
              Total Value: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong>
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search demand #, school, driver, PIN..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Date Filter */}
            {availableDates.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="font-extrabold text-slate-400 text-[10px]">Date:</span>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[155px] truncate"
                >
                  <option value="ALL">All Dates ({availableDates.length})</option>
                  {availableDates.map(d => (
                    <option key={d.date} value={d.date}>
                      {formatDDMMYYYY(d.date)} ({d.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PIN Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="font-extrabold text-slate-400 text-[10px]">PIN:</span>
              <select
                value={selectedPin}
                onChange={e => setSelectedPin(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                <option value="ALL">All PINs ({availablePins.length})</option>
                {availablePins.map(pin => (
                  <option key={pin} value={pin}>PIN {pin}</option>
                ))}
              </select>
            </div>

            {/* NCC Unit Filter */}
            {availableUnits.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="font-extrabold text-slate-400 text-[10px]">Unit:</span>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="ALL">All Units ({availableUnits.length})</option>
                  {availableUnits.map(u => (
                    <option key={u.code} value={u.code}>
                      {u.code} ({u.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset button */}
            {(selectedDate !== 'ALL' || selectedPin !== 'ALL' || selectedUnit !== 'ALL' || docFilter !== 'BALANCE' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('ALL');
                  setSelectedPin('ALL');
                  setSelectedUnit('ALL');
                  setDocFilter('BALANCE');
                  setSearchTerm('');
                }}
                className="px-2 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Group By View Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => { setGroupMode('DATEWISE'); setCollapsedGroups({}); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  groupMode === 'DATEWISE'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Datewise</span>
              </button>
              <button
                type="button"
                onClick={() => { setGroupMode('UNITWISE'); setCollapsedGroups({}); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  groupMode === 'UNITWISE'
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200/70'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Unitwise</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  groupMode === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>All</span>
              </button>
            </div>

            {groupMode !== 'ALL' && activeGroups.length > 1 && (
              <button
                type="button"
                onClick={handleToggleAllGroups}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer"
                title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
              >
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deliveries Documentation Manifest Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          Loading documentation records...
        </div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6 shadow-xs">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 mb-1">No Delivered Demands Found</h3>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
            Once demands are marked as delivered in Fleet Delivery, they automatically reflect here for document verification and summary card access.
          </p>
          <div className="mt-4">
            <Link
              to="/delivery"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-xs"
            >
              <Truck className="w-4 h-4" /> Go to Fleet Delivery
            </Link>
          </div>
        </div>
      ) : groupMode === 'DATEWISE' ? (
        <div className="space-y-4">
          {groupedDatewise.map(dateGroup => {
            const isExpanded = !collapsedGroups[dateGroup.key];
            return (
              <div key={dateGroup.key} className="space-y-2.5">
                {/* Datewise Banner Header */}
                <div
                  onClick={() => toggleGroupCollapse(dateGroup.key)}
                  className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-white rounded-2xl p-3.5 sm:px-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border border-indigo-200/80 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600 shrink-0" /> : <ChevronRight className="w-5 h-5 text-indigo-600 shrink-0" />}
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                        Delivery Date
                      </div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{formatDateDisplay(dateGroup.date)}</span>
                        <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {formatDDMMYYYY(dateGroup.date)}
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-white text-slate-700 font-extrabold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{dateGroup.unitCount} Unit{dateGroup.unitCount !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200/80 shadow-2xs flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      <span>{dateGroup.demands.length} Demand{dateGroup.demands.length !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-black text-xs border border-blue-200 shadow-2xs">
                      {dateGroup.totalPackets.toLocaleString('en-IN')} Pkts
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 shadow-2xs">
                      ₹{dateGroup.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {isExpanded && renderManifestTable(dateGroup.demands)}
              </div>
            );
          })}
        </div>
      ) : groupMode === 'UNITWISE' ? (
        <div className="space-y-4">
          {groupedUnitwise.map(unitGroup => {
            const isExpanded = !collapsedGroups[unitGroup.key];
            return (
              <div key={unitGroup.key} className="space-y-2.5">
                {/* Unitwise Banner Header */}
                <div
                  onClick={() => toggleGroupCollapse(unitGroup.key)}
                  className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-white rounded-2xl p-3.5 sm:px-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border border-blue-200/80 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-600 shrink-0" /> : <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" />}
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <span>NCC Unit / Battalion</span>
                        {unitGroup.nccGroup && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-extrabold border border-amber-200">
                            {unitGroup.nccGroup}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{unitGroup.unitName}</span>
                        {unitGroup.unitCode && (
                          <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {unitGroup.unitCode}
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-white text-slate-700 font-extrabold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{unitGroup.dateCount} Date{unitGroup.dateCount !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200/80 shadow-2xs flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      <span>{unitGroup.demands.length} Demand{unitGroup.demands.length !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-black text-xs border border-blue-200 shadow-2xs">
                      {unitGroup.totalPackets.toLocaleString('en-IN')} Pkts
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 shadow-2xs">
                      ₹{unitGroup.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {isExpanded && renderManifestTable(unitGroup.demands)}
              </div>
            );
          })}
        </div>
      ) : (
        renderManifestTable(filteredDemands)
      )}

      {/* SUMMARY CARD MODAL (ONLY ACCESSIBLE AFTER DELIVERY) */}
      {selectedDemandForSummary && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedDemandForSummary(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/40">
                      {selectedDemandForSummary.demand_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ✓ DELIVERED
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white uppercase tracking-tight truncate mt-0.5 max-w-[280px] sm:max-w-md">
                    {selectedDemandForSummary.institution_name}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDemandForSummary(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Delivery Overview Details Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Unit Jurisdiction</span>
                    <p className="font-extrabold text-slate-800">{selectedDemandForSummary.unit_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Delivered Date</span>
                    <p className="font-extrabold text-slate-800">{formatDDMMYYYY(selectedDemandForSummary.demand_date)}</p>
                  </div>
                </div>

                <div className="text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Delivery Address</span>
                  <p className="font-medium text-slate-700 text-xs">
                    {selectedDemandForSummary.complete_address || 'Address registered on file'} (PIN: {selectedDemandForSummary.pin_code})
                  </p>
                </div>

                {/* ANO Contact Row */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    ANO: {selectedDemandForSummary.ano_cto_name || 'Incharge Officer'}
                  </span>
                  {selectedDemandForSummary.ano_cto_contact ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${selectedDemandForSummary.ano_cto_contact}`}
                        className="font-black text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> {selectedDemandForSummary.ano_cto_contact}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppAlert(selectedDemandForSummary)}
                        className="text-emerald-600 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50"
                        title="Send WhatsApp confirmation"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">Contact not available</span>
                  )}
                </div>
              </div>

              {/* Quantity, Total Amount & Delivery Partner Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                    TOTAL DELIVERED
                  </div>
                  <div className="text-base font-black text-indigo-950 mt-1">
                    {selectedDemandForSummary.total_quantity || 0} Packets
                  </div>
                  <div className="text-xs font-bold text-indigo-700 mt-0.5">
                    ₹{(selectedDemandForSummary.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                    DELIVERED BY
                  </div>
                  <div className="text-xs font-black text-slate-900 mt-1 truncate">
                    {selectedDemandForSummary.delivery_partner_name || 'Fleet Driver'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                    {selectedDemandForSummary.delivery_partner_vehicle || 'Standard Vehicle'}
                  </div>
                  {selectedDemandForSummary.total_km != null ? (
                    <div className="text-[10px] font-black text-emerald-800 mt-1 inline-flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      <Gauge className="w-3 h-3" /> {selectedDemandForSummary.total_km} KM Traveled
                    </div>
                  ) : selectedDemandForSummary.start_km_reading != null ? (
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                      Start: {selectedDemandForSummary.start_km_reading} km
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Items Breakdown Collapsible or List */}
              {selectedDemandForSummary.items && selectedDemandForSummary.items.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Delivered Packet Line Items ({selectedDemandForSummary.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedDemandForSummary.items.map((item, i) => {
                      const qty = Number(item.quantity) || 0;
                      const rawPrice = item.unit_price_snapshot ?? item.unit_price ?? item.price;
                      const fallbackRate = (Number(selectedDemandForSummary.total_quantity) > 0 && Number(selectedDemandForSummary.total_amount) > 0)
                        ? (Number(selectedDemandForSummary.total_amount) / Number(selectedDemandForSummary.total_quantity))
                        : 0;
                      const unitRate = (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice)))
                        ? Number(rawPrice)
                        : fallbackRate;
                      const lineCost = (item.total_cost !== undefined && item.total_cost !== null && !isNaN(Number(item.total_cost)))
                        ? Number(item.total_cost)
                        : (qty * unitRate);

                      return (
                        <div key={i} className="py-2 flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate">
                              {item.item_name || item.name || 'Standard Refreshment Packet'}
                            </span>
                            {item.year_group && (
                              <span className="text-[10px] text-slate-400 font-semibold">{item.year_group}</span>
                            )}
                          </div>
                          <span className="font-mono text-slate-600 shrink-0 font-medium">
                            {qty} pkts × ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = <span className="font-bold text-slate-800">₹{lineCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Document Upload / View Section (Signed Receipt & Bill) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Delivery Verification Documents
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400">PDF / Image</span>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleUploadDocs} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Delivery Receipt */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-[10px] font-black text-slate-600 uppercase">
                        1. Signed Delivery Receipt
                      </label>
                      {selectedDemandForSummary.delivery_receipt_url ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getDocumentViewUrl(selectedDemandForSummary.delivery_receipt_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                title="Open original PDF / Document"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Receipt
                              </a>
                              {selectedDemandForSummary.delivery_receipt_url.includes('cloudinary.com') && selectedDemandForSummary.delivery_receipt_url.toLowerCase().endsWith('.pdf') && (
                                <a
                                  href={getDocumentImageUrl(selectedDemandForSummary.delivery_receipt_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5"
                                  title="Open rendered preview image (bypasses direct PDF delivery restrictions)"
                                >
                                  View as Image
                                </a>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Uploaded
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                            <label className="cursor-pointer text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 inline-flex items-center gap-1 transition-colors">
                              <Upload className="w-3 h-3" />
                              {receiptFile ? 'Change Selected' : 'Upload New Receipt'}
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={e => {
                                  const f = e.target.files[0];
                                  if (f) {
                                    setReceiptFile(f);
                                    setReceiptPreview(f.name);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={removingDoc === 'receipt' || fulfilling}
                              onClick={() => handleRemoveDoc('receipt')}
                              className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {removingDoc === 'receipt' ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> Removing...</>
                              ) : (
                                <><Trash2 className="w-3 h-3" /> Remove</>
                              )}
                            </button>
                          </div>

                          {receiptPreview && (
                            <div className="flex items-center justify-between gap-2 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg">
                              <span className="truncate font-semibold">New: {receiptPreview}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptFile(null);
                                  setReceiptPreview(null);
                                }}
                                className="text-amber-700 hover:text-amber-950 font-bold shrink-0"
                                title="Cancel new file selection"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={e => {
                            const f = e.target.files[0];
                            setReceiptFile(f);
                            setReceiptPreview(f?.name || null);
                          }}
                          className="text-[11px] text-slate-600 w-full"
                        />
                      )}
                    </div>

                    {/* Vendor Bill / Invoice */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-[10px] font-black text-slate-600 uppercase">
                        2. Vendor Bill / Invoice
                      </label>
                      {selectedDemandForSummary.invoice_url ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getDocumentViewUrl(selectedDemandForSummary.invoice_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                title="Open original PDF / Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Invoice
                              </a>
                              {selectedDemandForSummary.invoice_url.includes('cloudinary.com') && selectedDemandForSummary.invoice_url.toLowerCase().endsWith('.pdf') && (
                                <a
                                  href={getDocumentImageUrl(selectedDemandForSummary.invoice_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5"
                                  title="Open rendered preview image (bypasses direct PDF delivery restrictions)"
                                >
                                  View as Image
                                </a>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Uploaded
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                            <label className="cursor-pointer text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 inline-flex items-center gap-1 transition-colors">
                              <Upload className="w-3 h-3" />
                              {invoiceFile ? 'Change Selected' : 'Upload New Bill'}
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={e => {
                                  const f = e.target.files[0];
                                  if (f) {
                                    setInvoiceFile(f);
                                    setInvoicePreview(f.name);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={removingDoc === 'invoice' || fulfilling}
                              onClick={() => handleRemoveDoc('invoice')}
                              className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {removingDoc === 'invoice' ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> Removing...</>
                              ) : (
                                <><Trash2 className="w-3 h-3" /> Remove</>
                              )}
                            </button>
                          </div>

                          {invoicePreview && (
                            <div className="flex items-center justify-between gap-2 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg">
                              <span className="truncate font-semibold">New: {invoicePreview}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setInvoiceFile(null);
                                  setInvoicePreview(null);
                                }}
                                className="text-amber-700 hover:text-amber-950 font-bold shrink-0"
                                title="Cancel new file selection"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={e => {
                            const f = e.target.files[0];
                            setInvoiceFile(f);
                            setInvoicePreview(f?.name || null);
                          }}
                          className="text-[11px] text-slate-600 w-full"
                        />
                      )}
                    </div>
                  </div>

                  {(receiptFile || invoiceFile) && (
                    <button
                      type="submit"
                      disabled={fulfilling}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {fulfilling ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Save & Verify Documents</>
                      )}
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSendWhatsAppAlert(selectedDemandForSummary)}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Proof
              </button>

              <button
                type="button"
                onClick={() => setSelectedDemandForSummary(null)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK DOCUMENT UPLOAD */}
      {bulkModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkUploading) setBulkModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Bulk Document Upload
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                      Auto-Match
                    </span>
                  </h3>
                  <p className="text-xs text-blue-100 font-medium">
                    Select multiple invoices or receipts. PDFs are auto-matched by filename or &quot;Other References&quot; inside the PDF.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={() => setBulkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Type Switcher */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Step 1: Choose Document Type
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Select whether you are uploading vendor bills (invoices) or signed delivery receipts.
                </span>
              </div>
              <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setBulkDocType('INVOICE')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    bulkDocType === 'INVOICE'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Vendor Invoices (Bills)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDocType('RECEIPT')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    bulkDocType === 'RECEIPT'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" /> Signed Receipts
                </button>
              </div>
            </div>

            {/* Modal Body / Dropzone */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Dropzone */}
              <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50/80 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-black text-slate-800">
                  Click or drag files here to upload in bulk
                </div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-md">
                  Supports multiple <strong>.pdf</strong>, <strong>.jpg</strong>, <strong>.jpeg</strong>, <strong>.png</strong> files. Any PDF filename works — we automatically read <strong>Other References</strong> inside the PDF (or filename like <span className="font-mono text-blue-700 bg-blue-100/70 px-1 rounded">182.pdf</span>).
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={bulkUploading || bulkScanning}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      autoMatchFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              {/* Scanning Indicator */}
              {bulkScanning && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-indigo-800">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Scanning PDF &quot;Other References&quot; (with OCR fallback for scanned bills)...
                  </span>
                  <span className="font-mono">{bulkScanProgress.current} / {bulkScanProgress.total}</span>
                </div>
              )}

              {/* Match Summary Bar */}
              {bulkFiles.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-800">
                      {bulkFiles.length} File{bulkFiles.length > 1 ? 's' : ''} Selected:
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ {bulkFiles.filter(f => f.isMatched).length} Auto-Matched
                    </span>
                    {bulkFiles.filter(f => !f.isMatched).length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                        ⚠️ {bulkFiles.filter(f => !f.isMatched).length} Need Manual Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bulkMergeSameDemand}
                        disabled={bulkUploading}
                        onChange={(e) => setBulkMergeSameDemand(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Merge same-demand PDFs
                    </label>
                    {!bulkUploading && (
                      <button
                        type="button"
                        onClick={() => setBulkFiles([])}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar when uploading */}
              {bulkUploading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-blue-900">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Uploading {bulkDocType === 'INVOICE' ? 'Invoices' : 'Receipts'} to Cloudinary...
                    </span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success Result Toast */}
              {bulkResultSummary && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Successfully uploaded and linked {bulkResultSummary.updated} documents! Updating records...</span>
                </div>
              )}

              {/* Files Table */}
              {bulkFiles.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[46vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-3">File Name</th>
                        <th className="p-3">PDF Other Ref</th>
                        <th className="p-3">Matched Demand</th>
                        <th className="p-3">School / Institution Name</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkFiles.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors align-top">
                          <td className="p-3 max-w-[200px]">
                            <div className="font-bold text-slate-900 break-words" title={item.name}>
                              {item.name}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{item.size}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {item.isPdf ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-mono font-bold text-slate-800">
                                  {item.pdfOtherRef ? `Ref: ${item.pdfOtherRef}` : 'No Ref Found'}
                                </span>
                                {item.invoiceNo && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {item.invoiceNo}
                                  </span>
                                )}
                                {item.refMatchStatus === 'MATCH' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Matches
                                  </span>
                                )}
                                {item.refMatchStatus === 'MISMATCH' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 whitespace-normal">
                                    ⚠ Mismatch: {item.matchedDemandNumber || `#${item.matchedDemandId}`} ≠ PDF Ref {item.pdfOtherRef}
                                  </span>
                                )}
                                {item.refMatchStatus === 'NOT_IN_LIST' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                    ⚠ Not in Delivered List
                                  </span>
                                )}
                                {item.refMatchStatus === 'NO_REF' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Not in PDF
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Image file</span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.isMatched ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {item.matchedDemandNumber}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {item.matchSource === 'pdf-ocr'
                                    ? 'Via PDF OCR'
                                    : item.matchSource === 'pdf-ref'
                                      ? 'Via PDF Ref'
                                      : 'Via Filename'}
                                </span>
                              </div>
                            ) : (
                              <select
                                value={item.matchedDemandId || ''}
                                onChange={(e) => handleUpdateFileDemand(item.id, e.target.value)}
                                className="p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[220px]"
                              >
                                <option value="">Select Demand...</option>
                                {demands.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.demand_number} ({d.institution_name})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-3 min-w-[240px]">
                            {item.matchedInstitution ? (
                              <div>
                                <div className="font-bold text-slate-800 whitespace-normal break-words leading-snug">
                                  {item.matchedInstitution}
                                </div>
                                {item.matchedPin && <span className="text-[10px] text-slate-500">PIN {item.matchedPin}</span>}
                              </div>
                            ) : (
                              <span className="text-amber-600 font-semibold italic text-[11px]">Unmatched</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {!bulkUploading && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBulkFile(item.id)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remove file from upload"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                {bulkFiles.filter(f => f.matchedDemandId).length} of {bulkFiles.length} ready to upload
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkUploading}
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkUploading || bulkFiles.filter(f => f.matchedDemandId).length === 0}
                  onClick={handleExecuteBulkUpload}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  {bulkUploading ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Confirm & Upload ({bulkFiles.filter(f => f.matchedDemandId).length})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OWNER EXECUTIVE SUMMARY & COMPACT PDF MODAL */}
      {summaryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
          onClick={() => setSummaryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Flavour Base India • Executive Report
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Delivery, Amount & Documentation Summary</span>
                </h2>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  Scope: {selectedDate === 'ALL' ? 'All Dates' : formatDDMMYYYY(selectedDate)} • {selectedUnit === 'ALL' ? 'All Units' : selectedUnit} • {selectedPin === 'ALL' ? 'All PINs' : `PIN ${selectedPin}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadOwnerPdf}
                  disabled={loadingSummary}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Compact PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 bg-slate-50/70">
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Total Demand Generated</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {loadingSummary ? '...' : (ownerSummaryStats?.generated?.count ?? ownerReportData.scopedCount).toLocaleString('en-IN')}
                    <span className="text-xs font-bold text-slate-500 ml-1">Demands</span>
                  </div>
                  <div className="text-xs font-bold text-blue-800 mt-0.5">
                    {(ownerSummaryStats?.generated?.packets ?? ownerReportData.deliveredPackets).toLocaleString('en-IN')} Pkts • ₹{(ownerSummaryStats?.generated?.amount ?? ownerReportData.deliveredAmount).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Total Demand Delivered
                    {ownerSummaryStats?.generated?.count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px]">
                        {Math.round(((ownerSummaryStats?.delivered?.count ?? 0) / ownerSummaryStats.generated.count) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {(ownerSummaryStats?.delivered?.count ?? ownerReportData.scopedCount).toLocaleString('en-IN')}
                    <span className="text-xs font-bold text-slate-500 ml-1">Demands</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">
                    {(ownerSummaryStats?.delivered?.packets ?? ownerReportData.deliveredPackets).toLocaleString('en-IN')} Pkts • ₹{(ownerSummaryStats?.delivered?.amount ?? ownerReportData.deliveredAmount).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pending Delivery</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {loadingSummary ? '...' : (ownerSummaryStats?.pending_delivery?.count ?? 0).toLocaleString('en-IN')}
                    <span className="text-xs font-bold text-slate-500 ml-1">Demands</span>
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {(ownerSummaryStats?.pending_delivery?.packets ?? 0).toLocaleString('en-IN')} Pkts in pipeline
                  </div>
                </div>

                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Docs Pending (Balance)</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {ownerReportData.docPendingCount.toLocaleString('en-IN')}
                    <span className="text-xs font-bold text-slate-500 ml-1">Demands</span>
                  </div>
                  <div className="text-xs font-bold text-amber-800 mt-0.5">
                    Rcpt: {ownerReportData.receiptPendingCount} • Bill: {ownerReportData.billPendingCount} • ₹{ownerReportData.docPendingAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* 1. Last Day Demand & Delivery Status (Serial #1) */}
              {ownerSummaryStats?.last_day && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-600" />
                      <span>1. Last Day Demand &amp; Delivery Status ({formatDDMMYYYY(ownerSummaryStats.last_day.date)})</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-600">
                      Demanded: {ownerSummaryStats.last_day.totals?.demanded_count || 0} ({(ownerSummaryStats.last_day.totals?.demanded_packets || 0).toLocaleString('en-IN')} Pkts) • Delivered: {ownerSummaryStats.last_day.totals?.delivered_count || 0} ({(ownerSummaryStats.last_day.totals?.delivered_packets || 0).toLocaleString('en-IN')} Pkts) • Pending: {ownerSummaryStats.last_day.totals?.pending_count || 0}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                        <tr>
                          <th className="px-4 py-2">NCC Unit</th>
                          <th className="px-4 py-2">Demand Ref</th>
                          <th className="px-4 py-2">Institution</th>
                          <th className="px-4 py-2 text-right">Pkts</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-center">Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const groups = [];
                          (ownerSummaryStats.last_day.demands || []).forEach(d => {
                            const uName = d.unit_name || 'Unassigned';
                            const prev = groups[groups.length - 1];
                            if (prev && prev.unit_name === uName) prev.items.push(d);
                            else groups.push({ unit_name: uName, items: [d] });
                          });
                          return groups.flatMap(grp =>
                            grp.items.map((d, idx) => (
                              <tr key={d.id} className="hover:bg-slate-50">
                                {idx === 0 && (
                                  <td
                                    rowSpan={grp.items.length}
                                    className="px-4 py-2 font-black text-slate-800 bg-slate-50/60 border-r border-slate-200 align-middle whitespace-nowrap"
                                  >
                                    {grp.unit_name}
                                  </td>
                                )}
                                <td className="px-4 py-2 font-mono font-bold text-slate-900">{d.demand_number}</td>
                                <td className="px-4 py-2 font-bold text-slate-900">{d.institution_name}</td>
                                <td className="px-4 py-2 text-right font-mono">{Number(d.packets || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-2 text-right font-mono">₹{Number(d.amount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    d.delivery_status === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : d.delivery_status === 'CANCELLED' || d.delivery_status === 'REJECTED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {d.delivery_status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          );
                        })()}
                        {(ownerSummaryStats.last_day.demands || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-slate-400">No demands found for {formatDDMMYYYY(ownerSummaryStats.last_day.date)}.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Total Items Demanded, Delivered & Balance */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2. Total Items Demanded, Delivered &amp; Balance (Item-wise)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    {(ownerSummaryStats?.item_wise?.length ?? ownerReportData.itemSummary.length)} Item(s)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Item / Menu Pack</th>
                        <th className="px-4 py-2 text-right">Demanded (Qty / Amt)</th>
                        <th className="px-4 py-2 text-right">Delivered (Qty / Amt)</th>
                        <th className="px-4 py-2 text-right">Balance (Qty / Amt)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(ownerSummaryStats?.item_wise?.length > 0 ? ownerSummaryStats.item_wise : ownerReportData.itemSummary.map(it => ({
                        item_name: it.itemName,
                        demanded_packets: it.qty,
                        demanded_amount: it.amount,
                        delivered_packets: it.qty,
                        delivered_amount: it.amount,
                        balance_packets: 0,
                        balance_amount: 0
                      }))).map(it => (
                        <tr key={it.item_name} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-900">{it.item_name}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700">
                            {Number(it.demanded_packets || 0).toLocaleString('en-IN')} / ₹{Number(it.demanded_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">
                            {Number(it.delivered_packets || 0).toLocaleString('en-IN')} / ₹{Number(it.delivered_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-amber-700">
                            {Number(it.balance_packets || 0).toLocaleString('en-IN')} / ₹{Number(it.balance_amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50/70 font-black text-slate-900">
                        <td className="px-4 py-2">TOTAL</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.demanded_packets || 0), 0) ?? ownerReportData.deliveredPackets).toLocaleString('en-IN')} / ₹{(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.demanded_amount || 0), 0) ?? ownerReportData.deliveredAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-800">
                          {(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.delivered_packets || 0), 0) ?? ownerReportData.deliveredPackets).toLocaleString('en-IN')} / ₹{(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.delivered_amount || 0), 0) ?? ownerReportData.deliveredAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-amber-800">
                          {(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.balance_packets || 0), 0) ?? 0).toLocaleString('en-IN')} / ₹{(ownerSummaryStats?.item_wise?.reduce((s, x) => s + (x.balance_amount || 0), 0) ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Delivered To Whom */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. Delivered To Whom</span>
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRecipientViewMode('UNITWISE')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                        recipientViewMode === 'UNITWISE' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Unit-wise ({ownerReportData.unitRecipientSummary.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientViewMode('INSTITUTIONWISE')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                        recipientViewMode === 'INSTITUTIONWISE' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Institution-wise ({ownerReportData.institutionRecipientSummary.length})
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">{recipientViewMode === 'UNITWISE' ? 'NCC Unit / Battalion' : 'Institution (Unit)'}</th>
                        {recipientViewMode === 'UNITWISE' && <th className="px-4 py-2 text-center">Inst.</th>}
                        <th className="px-4 py-2 text-center">Demands</th>
                        <th className="px-4 py-2 text-right">Packets</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Docs (Verified / Pending)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipientViewMode === 'UNITWISE'
                        ? ownerReportData.unitRecipientSummary.map(u => (
                            <tr key={u.key} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-900">
                                {u.unitName} {u.unitCode && <span className="text-[10px] font-mono text-slate-500">({u.unitCode})</span>}
                              </td>
                              <td className="px-4 py-2 text-center font-mono text-slate-600">{u.instCount}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold">{u.demandCount}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700">{u.packets.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">₹{u.amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="text-emerald-700 font-bold">{u.verifiedCount} Ver</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-amber-700 font-bold">{u.demandCount - u.verifiedCount} Pend</span>
                              </td>
                            </tr>
                          ))
                        : ownerReportData.institutionRecipientSummary.map(inst => (
                            <tr key={inst.key} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-900">
                                {inst.institutionName} <span className="text-[10px] font-mono text-slate-500">({inst.unitCode || inst.unitName})</span>
                              </td>
                              <td className="px-4 py-2 text-center font-mono font-bold">{inst.demandCount}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700">{inst.packets.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">₹{inst.amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="text-emerald-700 font-bold">{inst.verifiedCount} Ver</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-amber-700 font-bold">{inst.demandCount - inst.verifiedCount} Pend</span>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Stock Balance & Unit-wise Consumption */}
              {ownerSummaryStats?.stock_status && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. Stock Balance &amp; Unit-wise Consumption</span>
                    </h3>
                    <span className="text-[11px] font-bold text-blue-700">
                      Total Stock: {ownerSummaryStats.stock_status.total_stock_units.toLocaleString('en-IN')} Units (₹{ownerSummaryStats.stock_status.total_stock_value.toLocaleString('en-IN')})
                      {' • '}
                      Last Del ({formatDDMMYYYY(ownerSummaryStats.stock_status.last_delivery_date)}): {ownerSummaryStats.stock_status.last_delivery_packets.toLocaleString('en-IN')} Pkts (₹{ownerSummaryStats.stock_status.last_delivery_amount.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                        <tr>
                          <th className="px-4 py-2">NCC Unit</th>
                          <th className="px-4 py-2 text-right">Day-wise (Last Day)</th>
                          <th className="px-4 py-2 text-right">Weekly (7 Days)</th>
                          <th className="px-4 py-2 text-right">Monthly (Curr Month)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(ownerSummaryStats.stock_status.unit_wise_consumption || []).map(uc => (
                          <tr key={uc.unit_name} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-bold text-slate-900">{uc.unit_name}</td>
                            <td className="px-4 py-2 text-right font-mono">{uc.day_packets.toLocaleString('en-IN')} Pkts / ₹{uc.day_amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-right font-mono">{uc.week_packets.toLocaleString('en-IN')} Pkts / ₹{uc.week_amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{uc.month_packets.toLocaleString('en-IN')} Pkts / ₹{uc.month_amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Documentation Pending Datewise */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. Documentation Pending — Datewise</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">{ownerReportData.datePendingSummary.length} Date(s)</span>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-center">Delivered</th>
                        <th className="px-4 py-2 text-right">Packets</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Rcpt Pend</th>
                        <th className="px-4 py-2 text-center">Bill Pend</th>
                        <th className="px-4 py-2 text-center">Verified</th>
                        <th className="px-4 py-2">Pending Demand Refs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ownerReportData.datePendingSummary.map(dt => (
                        <tr key={dt.date} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">{formatDDMMYYYY(dt.date)}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{dt.demandCount}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700">{dt.packets.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">₹{dt.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-amber-700">{dt.receiptPending}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-amber-700">{dt.billPending}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-emerald-700">{dt.verifiedCount}</td>
                          <td className="px-4 py-2 text-[11px] font-mono text-slate-600 max-w-xs truncate" title={dt.pendingRefs.join(', ')}>
                            {dt.pendingRefs.length > 0 ? dt.pendingRefs.join(', ') : <span className="text-emerald-700 font-sans font-bold">All Verified</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Cancelled & Rejected Demands */}
              <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>6. Cancelled &amp; Rejected Demands</span>
                  </h3>
                  <span className="text-[11px] font-bold text-rose-700">{(ownerSummaryStats?.cancelled_rejected || []).length} Record(s)</span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Demand Ref</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Institution (Unit)</th>
                        <th className="px-4 py-2 text-right">Pkts</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(ownerSummaryStats?.cancelled_rejected || []).map(c => (
                        <tr key={c.id} className="hover:bg-rose-50/30">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">{c.demand_number}</td>
                          <td className="px-4 py-2 font-mono text-slate-600 whitespace-nowrap">{formatDDMMYYYY(c.demand_date)}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800">
                            {c.institution_name} {c.unit_name && <span className="text-[10px] font-mono text-slate-500">({c.unit_name})</span>}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{c.packets.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-mono">₹{c.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">{c.status}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={c.reason}>{c.reason || '-'}</td>
                        </tr>
                      ))}
                      {(ownerSummaryStats?.cancelled_rejected || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-slate-400">No cancelled or rejected demands in this scope.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
