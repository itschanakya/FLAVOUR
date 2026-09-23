import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
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
  const totalPackets = demands.reduce((sum, d) => sum + (d.total_quantity || 0), 0);
  const totalAmount = demands.reduce((sum, d) => sum + (d.total_amount || 0), 0);

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
          <Link
            to="/delivery"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet Delivery</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
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
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 items-center">
            <div className="col-span-5">Delivered Institution & Demand</div>
            <div className="col-span-2 text-center">Packets / Value</div>
            <div className="col-span-2 text-center">Delivered By</div>
            <div className="col-span-2 text-center">Documentation Proof</div>
            <div className="col-span-1 text-right">Summary Card</div>
          </div>

          {/* List of Delivered Demands */}
          <div className="divide-y divide-slate-100">
            {filteredDemands.map((dem, idx) => {
              const hasReceipt = Boolean(dem.delivery_receipt_url);
              const hasInvoice = Boolean(dem.invoice_url);
              const isFullyDoc = hasReceipt && hasInvoice;

              return (
                <div
                  key={dem.id}
                  onClick={() => setSelectedDemandForSummary(dem)}
                  className="p-3 sm:p-4 hover:bg-slate-50/90 transition-colors cursor-pointer group flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-3"
                >
                  {/* Col 1: Demand Ref & Institution (col-span-5) */}
                  <div className="lg:col-span-5 flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {dem.demand_number}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {formatDDMMYYYY(dem.demand_date)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                          <MapPin className="w-2.5 h-2.5 text-rose-500" />
                          PIN {dem.pin_code || 'N/A'}
                        </span>
                      </div>
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight truncate mt-1 group-hover:text-indigo-600 transition-colors">
                        {dem.institution_name}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {dem.unit_name} {dem.ncc_group ? `• ${dem.ncc_group}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Col 2: Quantity & Amount (col-span-2) */}
                  <div className="lg:col-span-2 flex lg:flex-col items-center justify-between lg:justify-center text-center">
                    <span className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-xl shadow-2xs">
                      {dem.total_quantity || 0} Pkts
                    </span>
                    <span className="text-xs font-black text-emerald-700 mt-0.5">
                      ₹{(dem.total_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Col 3: Delivery Partner Info (col-span-2) */}
                  <div className="lg:col-span-2 text-center">
                    <div className="text-xs font-extrabold text-slate-800 truncate">
                      {dem.delivery_partner_name || 'Assigned Driver'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                      {dem.delivery_partner_vehicle || 'Delivery Van'}
                    </div>
                  </div>

                  {/* Col 4: Documentation Status (col-span-2) */}
                  <div className="lg:col-span-2 flex items-center justify-center gap-1.5">
                    {isFullyDoc ? (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified & Fully Doc</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{!hasReceipt ? 'Receipt Pending' : 'Bill Pending'}</span>
                      </span>
                    )}
                  </div>

                  {/* Col 5: Open Summary Card (col-span-1) */}
                  <div className="lg:col-span-1 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedDemandForSummary(dem)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs shadow-xs transition-colors flex items-center gap-1 active:scale-95"
                      title="Open Delivery Summary Card & Upload Documents"
                    >
                      <span>Card</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  </div>
                </div>
              );
            })}
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
                        <div className="flex items-center justify-between gap-1.5">
                          <a
                            href={selectedDemandForSummary.delivery_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Receipt
                          </a>
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
                        <div className="flex items-center justify-between gap-1.5">
                          <a
                            href={selectedDemandForSummary.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Invoice
                          </a>
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
    </div>
  );
}
