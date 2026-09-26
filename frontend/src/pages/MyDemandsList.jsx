import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { FileText, FileCheck, Eye, Search, Calendar, MessageSquare, AlertCircle, CheckCircle, Truck, ClipboardList, Clock, MapPin } from 'lucide-react';

const formatDMY = (dateStr) => {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string') {
    const clean = dateStr.split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function MyDemandsList() {
  const { token } = useAuth();
  const { events } = useSSE();
  const navigate = useNavigate();
  const [demands, setDemands] = useState([]);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusSlicer, setStatusSlicer] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDemands = useCallback(async () => {
    try {
      const res = await fetch('/api/demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDemands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setDemands([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.NEW_NOTIFICATION || events?.timestamp) {
      fetchDemands();
    }
  }, [events?.DEMAND_UPDATED, events?.NEW_NOTIFICATION, events?.timestamp, fetchDemands]);

  useEffect(() => {
    const handleSync = () => fetchDemands();
    window.addEventListener('demand-status-changed', handleSync);
    return () => window.removeEventListener('demand-status-changed', handleSync);
  }, [fetchDemands]);

  const safeDemands = Array.isArray(demands) ? demands : [];
  const countAll = safeDemands.length;
  const countAccepted = safeDemands.filter(d => d.status === 'ACCEPTED').length;
  const countDelivered = safeDemands.filter(d => d.delivery_status === 'DELIVERED').length;
  const countPending = safeDemands.filter(d => d.status === 'PENDING' || d.status === 'SUBMITTED').length;
  const countRejected = safeDemands.filter(d => d.status === 'REJECTED' || d.status === 'CANCELLED').length;

  const filteredDemands = safeDemands.filter((dem) => {
    if (statusSlicer === 'ACCEPTED' && dem.status !== 'ACCEPTED') return false;
    if (statusSlicer === 'DELIVERED' && dem.delivery_status !== 'DELIVERED') return false;
    if (statusSlicer === 'PENDING' && dem.status !== 'PENDING' && dem.status !== 'SUBMITTED') return false;
    if (statusSlicer === 'REJECTED' && dem.status !== 'REJECTED' && dem.status !== 'CANCELLED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = dem.demand_number?.toLowerCase().includes(q);
      const matchPurpose = dem.purpose?.toLowerCase().includes(q);
      const matchDate = dem.demand_date?.toLowerCase().includes(q);
      if (!matchNum && !matchPurpose && !matchDate) return false;
    }

    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your placed demands...</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* TOP SLICER NAVIGATION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        {/* Status Slicer */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-inner">
          <button
            onClick={() => setStatusSlicer('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusSlicer === 'ALL'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
            <span>All Demands</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${statusSlicer === 'ALL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
              {countAll}
            </span>
          </button>

          <button
            onClick={() => setStatusSlicer('ACCEPTED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusSlicer === 'ACCEPTED'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accepted</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${statusSlicer === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
              {countAccepted}
            </span>
          </button>

          <button
            onClick={() => setStatusSlicer('DELIVERED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusSlicer === 'DELIVERED'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Truck className="w-3.5 h-3.5 text-teal-600" />
            <span>Delivered</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${statusSlicer === 'DELIVERED' ? 'bg-teal-50 text-teal-700' : 'bg-slate-200 text-slate-600'
              }`}>
              {countDelivered}
            </span>
          </button>

          <button
            onClick={() => setStatusSlicer('PENDING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusSlicer === 'PENDING'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Review</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${statusSlicer === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-200 text-slate-600'
              }`}>
              {countPending}
            </span>
          </button>

          <button
            onClick={() => setStatusSlicer('REJECTED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusSlicer === 'REJECTED'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${statusSlicer === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'
              }`}>
              {countRejected}
            </span>
          </button>
        </div>

        {/* Search Slicer Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ref, date, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Placed Refreshment Demands</h2>
          <p className="text-sm text-slate-500">Track status of demands placed by your institution</p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredDemands.length} of {demands.length} cadet refreshment requisition(s)
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>State Lock Notice:</strong> Once submitted, demands are locked for your institution. Only your assigned NCC Unit can approve, reject, cancel, or delete a demand.
        </span>
      </div>

      {/* DEMANDS TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-4">Demand Ref</th>
                <th className="p-4">Demand Date</th>
                <th className="p-4">Venue</th>
                <th className="p-4">Total Items</th>
                <th className="p-4">Rate/Pkt</th>
                <th className="p-4">Grand Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Proofs / Bills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDemands.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 font-medium">
                    {demands.length === 0 ? 'No demands placed yet.' : 'No demands match the selected slicer / filter.'}
                  </td>
                </tr>
              ) : (
                filteredDemands.map((dem) => (
                  <tr key={dem.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-blue-600">{dem.demand_number}</td>
                    <td className="p-4 text-slate-700">{formatDMY(dem.demand_date)}</td>
                    <td className="p-4 text-slate-800 font-medium max-w-xs truncate" title={dem.complete_address || dem.purpose}>
                      {dem.complete_address && !/^\d+$/.test(dem.complete_address.trim())
                        ? dem.complete_address 
                        : (dem.purpose || 'Venue HQ')}
                    </td>
                    <td className="p-4 text-slate-700">{dem.total_quantity || 0} items</td>
                    <td className="p-4 text-slate-700 font-medium">₹{dem.total_quantity ? (dem.total_amount / dem.total_quantity).toFixed(2) : '0.00'}</td>
                    <td className="p-4 font-bold text-emerald-600">₹{(dem.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={dem.status} deliveryStatus={dem.delivery_status} demand={dem} />
                        {dem.delivery_partner_name && dem.delivery_status !== 'DELIVERED' && (
                          <span className="text-[10px] font-bold text-slate-500">
                            Handler: {dem.delivery_partner_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {dem.delivery_receipt_url ? (
                          <a
                            href={dem.delivery_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                            title="View Signed Delivery Receipt"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Receipt
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                            Receipt (Pending)
                          </span>
                        )}

                        {dem.invoice_url ? (
                          <a
                            href={dem.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
                            title="View Bill / Invoice"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-indigo-600" /> Bill
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                            Bill (Pending)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-200 p-6 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-mono text-blue-600 font-bold">{selectedDemand.demand_number}</span>
                <h3 className="text-xl font-bold text-slate-900">{selectedDemand.purpose}</h3>
              </div>
              <StatusBadge status={selectedDemand.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Requisition Date:</span>
                <span className="text-slate-800 font-bold text-sm">{formatDMY(selectedDemand.demand_date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">NCC Unit Jurisdiction:</span>
                <span className="text-slate-800 font-bold text-sm">{selectedDemand.unit_name}</span>
              </div>
            </div>

            {/* Review Remarks if any */}
            {selectedDemand.review_remarks && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> NCC Unit Remarks / Decision Rationale
                </span>
                <p className="text-xs text-slate-700 italic">{selectedDemand.review_remarks}</p>
                {selectedDemand.reviewed_by_name && (
                  <p className="text-[11px] text-slate-500 text-right">Reviewed by: {selectedDemand.reviewed_by_name} at {selectedDemand.reviewed_at}</p>
                )}
              </div>
            )}

            {/* Vendor Uploaded Proofs (Receipt & Invoice) */}
            {(selectedDemand.delivery_receipt_url || selectedDemand.invoice_url) && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Vendor Delivery Proof & Documents
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {selectedDemand.delivery_receipt_url && (
                    <a
                      href={selectedDemand.delivery_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
                    >
                      <FileCheck className="w-4 h-4" /> View Signed Receipt
                    </a>
                  )}
                  {selectedDemand.invoice_url && (
                    <a
                      href={selectedDemand.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
                    >
                      <FileText className="w-4 h-4" /> View Bill / Invoice
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Requested Refreshment Breakdown</h4>
              <div className="space-y-2">
                {selectedDemand.items?.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.item_name}</div>
                      <span className="text-slate-500">{item.year_group} • ₹{item.unit_price_snapshot} per {item.unit_of_measure}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-blue-600 block">{item.quantity} {item.unit_of_measure}s</span>
                      <span className="text-emerald-600 font-semibold">₹{(item.quantity * item.unit_price_snapshot).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-500">
                Total Estimated Cost: <span className="text-base font-black text-emerald-600">₹{(selectedDemand.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={() => setSelectedDemand(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
