import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import { getDocumentViewUrl, getDocumentImageUrl } from '../utils/documentViewer';
import {
  FileCheck, CheckCircle2, Calendar, Upload, FileText,
  IndianRupee, MapPin, RefreshCw, School, Package, Users,
  ChevronDown, ChevronUp, AlertTriangle, X, Eye, Building2,
  Layers, Filter, Search, Phone, MessageCircle, ExternalLink,
  Printer, ArrowUpRight, Truck, Clock, ShieldCheck, Download, Gauge
} from 'lucide-react';

export default function DocumentationPage() {
  const { token } = useAuth();
  const { events } = useSSE();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPin, setSelectedPin] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [docFilter, setDocFilter] = useState('BALANCE'); // 'BALANCE' | 'FULLY_DOCUMENTED'
  
  // Modals
  const [selectedDemandForSummary, setSelectedDemandForSummary] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  // Bulk Upload State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDocType, setBulkDocType] = useState('INVOICE'); // 'INVOICE' | 'RECEIPT'
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
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
        // Filter demands that are delivered or fulfilled
        const deliveredOnly = (Array.isArray(data) ? data : []).filter(
          d => d.delivery_status === 'DELIVERED' || d.status === 'FULFILLED'
        );
        setDemands(deliveredOnly);
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

  // Available filter options
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
        unitMap.set(code, {
          code: code,
          name: d.unit_name
        });
      }
    });
    return Array.from(unitMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [demands]);

  // Filtered demands
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
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
  }, [demands, selectedPin, selectedUnit, docFilter, searchTerm]);

  // Overall counts
  const totalDelivered = demands.length;
  const balanceCount = demands.filter(d => !d.delivery_receipt_url || !d.invoice_url).length;
  const fullyDocumentedCount = demands.filter(d => d.delivery_receipt_url && d.invoice_url).length;
  const totalPackets = demands.reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);
  const totalAmount = demands.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);

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
        status: 'FULFILLED',
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

  const autoMatchFiles = (rawFiles) => {
    const newItems = Array.from(rawFiles).map((file, idx) => {
      const key = extractDemandKey(file.name);
      let matchedDemand = null;

      if (key?.full) {
        matchedDemand = demands.find(d => (d.demand_number || '').toUpperCase() === key.full.toUpperCase());
      }
      if (!matchedDemand && key?.num) {
        const candidates = demands.filter(d => {
          const m = (d.demand_number || '').match(/(\d+)$/);
          const dNum = m ? parseInt(m[1], 10) : d.id;
          return dNum === key.num || d.id === key.num;
        });
        if (candidates.length === 1) matchedDemand = candidates[0];
      }

      return {
        id: `${file.name}-${idx}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        matchedDemandId: matchedDemand ? matchedDemand.id : '',
        matchedDemandNumber: matchedDemand ? matchedDemand.demand_number : '',
        matchedInstitution: matchedDemand ? matchedDemand.institution_name : '',
        matchedPin: matchedDemand ? matchedDemand.pin_code : '',
        isMatched: Boolean(matchedDemand)
      };
    });

    setBulkFiles(prev => [...prev, ...newItems]);
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
    setBulkProgress({ current: 0, total: readyFiles.length });

    const batchSize = 10;
    let totalUpdated = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < readyFiles.length; i += batchSize) {
        const chunk = readyFiles.slice(i, i + batchSize);
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
          totalUpdated += data.updated || chunk.length;
        } else {
          failedCount += chunk.length;
        }

        setBulkProgress({ current: Math.min(i + chunk.length, readyFiles.length), total: readyFiles.length });
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
        <div className="flex items-center gap-2 shrink-0">
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
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
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
                    {u.code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset button */}
          {(selectedPin !== 'ALL' || selectedUnit !== 'ALL' || docFilter !== 'BALANCE' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedPin('ALL');
                setSelectedUnit('ALL');
                setDocFilter('BALANCE');
                setSearchTerm('');
              }}
              className="px-2 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
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
      ) : (
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
                {filteredDemands.map((dem, idx) => {
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
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                        1. Signed Delivery Receipt
                      </label>
                      {selectedDemandForSummary.delivery_receipt_url ? (
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
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                        2. Vendor Bill / Invoice
                      </label>
                      {selectedDemandForSummary.invoice_url ? (
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
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
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
                    Select multiple invoices or receipts. Files with demand reference (e.g., DEM-2026-182) will auto-match.
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
                  Supports multiple <strong>.pdf</strong>, <strong>.jpg</strong>, <strong>.jpeg</strong>, <strong>.png</strong> files. Filenames with demand ref (e.g. <span className="font-mono text-blue-700 bg-blue-100/70 px-1 rounded">DEM-2026-182.pdf</span> or <span className="font-mono text-blue-700 bg-blue-100/70 px-1 rounded">182.pdf</span>) auto-link.
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={bulkUploading}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      autoMatchFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              {/* Match Summary Bar */}
              {bulkFiles.length > 0 && (
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-100 rounded-2xl border border-slate-200">
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
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3">File Name</th>
                        <th className="p-3">Matched Demand</th>
                        <th className="p-3">Institution / Stop</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkFiles.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]" title={item.name}>
                              {item.name}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{item.size}</span>
                          </td>
                          <td className="p-3">
                            {item.isMatched ? (
                              <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {item.matchedDemandNumber}
                              </span>
                            ) : (
                              <select
                                value={item.matchedDemandId || ''}
                                onChange={(e) => handleUpdateFileDemand(item.id, e.target.value)}
                                className="p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[180px]"
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
                          <td className="p-3">
                            {item.matchedInstitution ? (
                              <div>
                                <div className="font-bold text-slate-800 truncate max-w-[200px]">{item.matchedInstitution}</div>
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
    </div>
  );
}
