import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, Ban, Trash2, Filter, FileText, FileCheck,
  School, Calendar, ArrowRight, IndianRupee, ChevronDown,
  ChevronUp, Users, Package, MessageSquare, ShieldCheck,
  AlertTriangle, Clock3, Inbox, RefreshCw, Eye, Truck, Phone
} from 'lucide-react';
import DemandDetailSidePanel from '../components/DemandDetailSidePanel';
import StandardPacketViewer from '../components/StandardPacketViewer';
import { useSSE } from '../context/SSEContext';

const STATUS_CONFIG = {
  ALL: { 
    label: 'All', 
    color: 'text-slate-700', 
    bg: 'bg-slate-100', 
    border: 'border-slate-300',
    badge: 'bg-slate-200 text-slate-700',
    active: 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20' 
  },
  PENDING: { 
    label: 'Pending', 
    color: 'text-amber-700', 
    bg: 'bg-amber-50', 
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    active: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30' 
  },
  APPROVED: { 
    label: 'Approved', 
    color: 'text-blue-700', 
    bg: 'bg-blue-50', 
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800',
    active: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' 
  },
  REJECTED: { 
    label: 'Rejected', 
    color: 'text-rose-700', 
    bg: 'bg-rose-50', 
    border: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-800',
    active: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/30' 
  },
  CANCELLED: { 
    label: 'Cancelled', 
    color: 'text-purple-700', 
    bg: 'bg-purple-50', 
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-800',
    active: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/30' 
  },
  FULFILLED: { 
    label: 'Fulfilled', 
    color: 'text-emerald-700', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30' 
  },
};

function StatusPill({ status }) {
  const cfg = {
    PENDING:   { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock3 className="w-3 h-3" />, label: 'Pending Review' },
    APPROVED:  { cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <ShieldCheck className="w-3 h-3" />, label: 'Approved' },
    REJECTED:  { cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
    CANCELLED: { cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Ban className="w-3 h-3" />, label: 'Cancelled' },
    FULFILLED: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Fulfilled' },
  }[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DemandCard({ dem, onAction, onDelete, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = dem.status === 'PENDING';
  const canCancel = ['PENDING', 'APPROVED'].includes(dem.status);
  const total = dem.total_amount || 0;
  const totalQty = (dem.items || []).reduce((s, i) => s + i.quantity, 0);

  return (
    <div className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden
      ${isPending ? 'border-amber-200 shadow-md shadow-amber-500/5 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-300'
                  : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all
        ${isPending ? 'bg-amber-400' : dem.status === 'APPROVED' ? 'bg-blue-500' : dem.status === 'FULFILLED' ? 'bg-emerald-500' : 'bg-slate-300'}`}
      />

      <div className="pl-5 pr-5 pt-5 pb-4 cursor-pointer" onClick={() => onClick(dem)}>
        {/* Top Row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <School className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{dem.demand_number}</span>
              <StatusPill status={dem.status} />
            </div>
            <h3 className="text-base font-black text-slate-900 leading-tight truncate">{dem.institution_name}</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{dem.purpose}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </div>
            <div className="text-sm font-bold text-slate-800">{dem.demand_date}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> Amount
            </div>
            <div className="text-sm font-bold text-emerald-700">₹{total.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Units
            </div>
            <div className="text-sm font-bold text-blue-700">{totalQty}</div>
          </div>
        </div>

        {/* Physical Delivery Status Banner for Unit */}
        {dem.delivery_status === 'OUT_FOR_DELIVERY' && (
          <div className="mb-4 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white animate-pulse">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-black text-blue-950 block">Out for Delivery (In Transit)</span>
                <span className="text-[11px] text-blue-700 font-semibold">
                  Driver: {dem.delivery_partner_name} • {dem.delivery_partner_vehicle || 'Vehicle'}
                </span>
              </div>
            </div>
            {dem.delivery_partner_phone && (
              <a
                href={`tel:${dem.delivery_partner_phone}`}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 bg-white hover:bg-blue-100 text-blue-700 font-extrabold text-[10px] rounded-lg border border-blue-200 flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> {dem.delivery_partner_phone}
              </a>
            )}
          </div>
        )}

        {dem.delivery_status === 'DELIVERED' && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-black text-emerald-950 block">Physically Delivered & Verified</span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Delivered by: {dem.delivery_partner_name || 'Driver'} {dem.delivered_at ? `at ${dem.delivered_at}` : ''}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {dem.total_quantity || 0} Pkts
            </span>
          </div>
        )}

        {/* Expandable Items */}
        {dem.items && dem.items.length > 0 && (
          <div className="mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                {dem.items.length} Item Line{dem.items.length > 1 ? 's' : ''} Requested
              </span>
              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expanded && (
              <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                {dem.items.map((item, idx) => (
                  <div key={item.id} className={`flex items-center justify-between px-3 py-2.5 text-xs ${idx < dem.items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <span className="font-semibold text-slate-800">{item.item_name}</span>
                      <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{item.year_group}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">{item.quantity} × ₹{item.unit_price_snapshot}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Remarks (if any) */}
        {dem.review_remarks && (
          <div className="mb-4 flex gap-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-600 italic">{dem.review_remarks}</span>
          </div>
        )}

        {/* Delivery Proof Documents */}
        {(dem.delivery_receipt_url || dem.invoice_url) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {dem.delivery_receipt_url && (
              <a
                href={dem.delivery_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors"
              >
                <FileCheck className="w-4 h-4 text-emerald-600" /> Receipt
              </a>
            )}
            {dem.invoice_url && (
              <a
                href={dem.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors"
              >
                <FileText className="w-4 h-4 text-indigo-600" /> Invoice
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
          {isPending && (
            <>
              <button
                onClick={() => onAction(dem, 'APPROVE')}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md hover:shadow-emerald-500/25"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => onAction(dem, 'REJECT')}
                className="flex-1 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-rose-200 transition-all hover:shadow-sm"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {canCancel && (
            <button
              onClick={() => onAction(dem, 'CANCEL')}
              className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-amber-200 transition-all"
            >
              <Ban className="w-4 h-4" /> Revoke
            </button>
          )}
          <button
            onClick={() => onDelete(dem)}
            title="Soft-delete"
            className="ml-auto p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-400 border border-slate-100 hover:border-rose-200 transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ demand, action, onClose, onConfirm, processing }) {
  const [remarks, setRemarks] = useState('');
  if (!demand || !action) return null;

  const config = {
    APPROVE: {
      title: 'Authorize Demand',
      subtitle: 'This will forward the demand to the Admin Vendor for supply.',
      headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      btnCls: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25',
      icon: <CheckCircle2 className="w-8 h-8" />,
      required: false,
    },
    REJECT: {
      title: 'Reject Demand',
      subtitle: 'Provide a clear reason — the institution will be notified.',
      headerBg: 'bg-gradient-to-r from-rose-600 to-rose-500',
      btnCls: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/25',
      icon: <AlertTriangle className="w-8 h-8" />,
      required: true,
    },
    CANCEL: {
      title: 'Revoke / Cancel',
      subtitle: 'Cancel this demand and archive it from the active queue.',
      headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      btnCls: 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/25',
      icon: <Ban className="w-8 h-8" />,
      required: false,
    },
  }[action];

  const handleSubmit = () => {
    if (processing) return;
    if (config.required && !remarks.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    onConfirm(remarks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header */}
        <div className={`${config.headerBg} text-white px-7 py-6`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              {config.icon}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">{config.title}</h3>
              <p className="text-sm opacity-80 mt-0.5">{config.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="p-7 space-y-5">
          {/* Demand Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demand Ref</span>
              <span className="font-mono text-xs font-bold text-slate-600">{demand.demand_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution</span>
              <span className="text-sm font-bold text-slate-900">{demand.institution_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Value</span>
              <span className="text-base font-black text-emerald-600">₹{(demand.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="flex justify-between items-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <span>Remarks / Rationale</span>
              {config.required && <span className="text-rose-500 font-bold">* Required</span>}
            </label>
            <textarea
              rows="3"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                action === 'APPROVE' ? 'e.g., Verified parade schedule and cadet strength. Approved for procurement.'
                : action === 'REJECT' ? 'State reason for rejection clearly...'
                : 'Reason for revocation...'
              }
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={processing}
              onClick={handleSubmit}
              className={`flex-1 px-5 py-3 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 ${config.btnCls} ${processing ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {processing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <>Confirm <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewDemandsQueue() {
  const { token, user } = useAuth();
  const { events } = useSSE();
  const [demands, setDemands] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDemand, setViewDemand] = useState(null);

  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/demands';
      if (statusFilter !== 'ALL') url += `?status=${statusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDemands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.timestamp) {
      fetchDemands();
    }
  }, [events?.DEMAND_UPDATED, events?.timestamp, fetchDemands]);

  useEffect(() => {
    const handleStatusChange = () => {
      fetchDemands();
    };
    window.addEventListener('demand-status-changed', handleStatusChange);
    return () => {
      window.removeEventListener('demand-status-changed', handleStatusChange);
    };
  }, [fetchDemands]);

  const handleAction = async (demand, action) => {
    setSelectedDemand(demand);
    setReviewAction(action);
  };

  const handleConfirm = async (remarks) => {
    if (!selectedDemand || !reviewAction || processing) return;
    setProcessing(true);
    try {
      const endpoint = reviewAction === 'CANCEL'
        ? `/api/demands/${selectedDemand.id}/cancel`
        : `/api/demands/${selectedDemand.id}/review`;
      const payload = reviewAction === 'CANCEL'
        ? { remarks }
        : { action: reviewAction, remarks };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Immediate local multi-window dispatch
      try {
        window.dispatchEvent(new CustomEvent('demand-status-changed', { detail: { id: selectedDemand.id, action: reviewAction, ...data } }));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const syncChan = new BroadcastChannel('ncc_demands_sync');
          syncChan.postMessage({ type: 'DEMAND_UPDATED', payload: { id: selectedDemand.id, action: reviewAction, ...data } });
          syncChan.close();
        }
      } catch (e) {}

      setSelectedDemand(null);
      setReviewAction(null);
      fetchDemands();
    } catch (err) {
      alert(err.message);
      setSelectedDemand(null);
      setReviewAction(null);
      fetchDemands();
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (dem) => {
    if (!window.confirm(`Soft-delete ${dem.demand_number}? Audit trail will be preserved.`)) return;
    try {
      const res = await fetch(`/api/demands/${dem.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      try {
        window.dispatchEvent(new CustomEvent('demand-status-changed', { detail: { id: dem.id, status: 'DELETED' } }));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const syncChan = new BroadcastChannel('ncc_demands_sync');
          syncChan.postMessage({ type: 'DEMAND_UPDATED', payload: { id: dem.id, status: 'DELETED' } });
          syncChan.close();
        }
      } catch (e) {}

      fetchDemands();
    } catch (err) {
      alert(err.message);
    }
  };

  const counts = {};
  for (const st of Object.keys(STATUS_CONFIG)) {
    counts[st] = st === 'ALL' ? demands.length : demands.filter(d => d.status === st).length;
  }
  const pendingCount = demands.filter(d => d.status === 'PENDING').length;

  return (
    <div className="w-full space-y-5">
      {/* Page Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] mb-1.5 border border-blue-200 shadow-sm">
              <School className="w-3.5 h-3.5 text-blue-600" /> Unit Command Portal
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Demand Authorization
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Review and authorize refreshment requisitions from institutions under your jurisdiction.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm shadow-amber-500/20">
                <Inbox className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-amber-800 leading-none">{pendingCount}</div>
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">Awaiting Review</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Standard Refreshment Packet (₹75) Specification with Expiry Dates */}
      <StandardPacketViewer defaultOpen={false} />

      <div className="px-0 md:px-0 space-y-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all duration-200 ${
                statusFilter === st ? cfg.active : `border-slate-200 ${cfg.color} ${cfg.bg} hover:border-slate-300`
              }`}
            >
              {cfg.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === st ? 'bg-white/25' : 'bg-slate-200 text-slate-600'}`}>
                {st === 'ALL' ? demands.length : demands.filter(d => d.status === st).length}
              </span>
            </button>
          ))}
          <button onClick={fetchDemands} className="ml-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all flex items-center gap-2 text-xs font-bold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Demands Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 bg-slate-100 rounded-xl" />
                  <div className="h-14 bg-slate-100 rounded-xl" />
                  <div className="h-14 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : demands.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Clear!</h3>
            <p className="text-slate-500 font-medium">No demands matching <span className="font-bold">'{statusFilter}'</span> status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {demands.map(dem => (
              <DemandCard
                key={dem.id}
                dem={dem}
                onAction={handleAction}
                onDelete={handleDelete}
                onClick={setViewDemand}
              />
            ))}
          </div>
        )}
      </div>

      <ActionModal
        demand={selectedDemand}
        action={reviewAction}
        onClose={() => { setSelectedDemand(null); setReviewAction(null); }}
        onConfirm={handleConfirm}
        processing={processing}
      />

      <DemandDetailSidePanel
        demand={viewDemand}
        onClose={() => setViewDemand(null)}
        token={token}
      />
    </div>
  );
}
