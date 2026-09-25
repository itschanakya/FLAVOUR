import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  X, CheckCircle, Package, Send, CheckCircle2, Clock, XCircle,
  FileText, FileCheck, Truck, Phone, MessageCircle, MapPin,
  AlertCircle, ArrowRight, ShieldCheck, Loader2, Navigation, Sparkles,
  Building2, CalendarDays, Hash, Calendar, Layers, Eye, EyeOff
} from 'lucide-react';
import { getItemPhoto, formatExpiryDate } from '../pages/ManageCatalog';

export default function DemandDetailSidePanel({ demand, onClose, token }) {
  const { user } = useAuth();
  const { events } = useSSE();
  const [currentDemand, setCurrentDemand] = useState(demand);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);
  const [packetTemplate, setPacketTemplate] = useState(null);
  const [showItems, setShowItems] = useState(true);

  useEffect(() => {
    fetchPacketTemplate();
  }, [token]);

  const fetchPacketTemplate = async () => {
    try {
      const res = await fetch('/api/packets/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPacketTemplate(data);
      }
    } catch (err) {
      console.error('Failed to fetch packet template', err);
    }
  };

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && demand) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [demand, onClose]);

  useEffect(() => {
    setCurrentDemand(demand); // sync null too → triggers early return → panel closes
  }, [demand]);


  useEffect(() => {
    if (!currentDemand?.id) return;
    if (events?.DEMAND_UPDATED && String(events.DEMAND_UPDATED.id) === String(currentDemand.id)) {
      const { delivery_status, dispatched_at, delivered_at } = events.DEMAND_UPDATED;
      setCurrentDemand(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          delivery_status: delivery_status || prev.delivery_status,
          dispatched_at: dispatched_at || prev.dispatched_at,
          delivered_at: delivered_at || prev.delivered_at
        };
      });
      fetchActivities();
    }
  }, [events?.DEMAND_UPDATED, currentDemand?.id]);

  useEffect(() => {
    if (currentDemand?.id) fetchActivities();
  }, [currentDemand?.id]);

  const fetchActivities = async () => {
    if (!currentDemand?.id) return;
    try {
      const res = await fetch(`/api/demands/${currentDemand.id}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      if (res.ok && text) setActivities(JSON.parse(text));
      else setActivities([]);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentDemand?.id) return;
    try {
      const res = await fetch(`/api/demands/${currentDemand.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage })
      });
      const text = await res.text();
      if (res.ok) {
        setNewMessage('');
        fetchActivities();
      } else {
        let errMessage = 'Failed to send message';
        try { errMessage = JSON.parse(text).error || errMessage; } catch (e) { errMessage = text || errMessage; }
        alert(errMessage);
      }
    } catch (err) {
      alert('Network error: Failed to send message');
    }
  };

  const handleUpdateDeliveryStage = async (newStage) => {
    if (!currentDemand?.id || updatingStage) return;
    setUpdatingStage(true);
    try {
      const res = await fetch('/api/delivery/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ demandId: currentDemand.id, deliveryStatus: newStage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update delivery status');
      setCurrentDemand(prev => ({
        ...prev,
        delivery_status: newStage,
        dispatched_at: newStage === 'OUT_FOR_DELIVERY' ? data.timestamp : prev.dispatched_at,
        delivered_at: newStage === 'DELIVERED' ? data.timestamp : prev.delivered_at
      }));
      fetchActivities();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleWhatsAppPartner = (dem) => {
    let rawPhone = (dem.delivery_partner_phone || '').replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    const msg = `Jai Hind, inquiring about NCC refreshment delivery for *${dem.institution_name}* (Demand #${dem.demand_number || 'N/A'}, ${dem.total_quantity || 0} Packets).`;
    const url = rawPhone
      ? `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // ─── COLOR SYSTEM ──────────────────────────────────────────────────────────
  const STATUS_CONFIG = {
    PENDING: { header: 'from-amber-600 via-orange-500 to-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-300', icon: '📋', label: 'Pending Review' },
    APPROVED: { header: 'from-blue-700 via-indigo-600 to-blue-800', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '✅', label: 'Approved' },
    ACCEPTED: { header: 'from-indigo-700 via-violet-600 to-indigo-800', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: '🏭', label: 'Accepted' },
    FULFILLED: { header: 'from-emerald-700 via-teal-600 to-emerald-800', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🎯', label: 'Fulfilled' },
    REJECTED: { header: 'from-rose-700 via-red-600 to-rose-800', badge: 'bg-rose-100 text-rose-800 border-rose-300', icon: '❌', label: 'Rejected' },
    CANCELLED: { header: 'from-slate-600 via-zinc-600 to-slate-700', badge: 'bg-slate-100 text-slate-700 border-slate-300', icon: '🚫', label: 'Cancelled' },
  };

  const DELIVERY_CONFIG = {
    PENDING: { color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/40', dot: 'bg-amber-400', label: 'At Warehouse Depot' },
    OUT_FOR_DELIVERY: { color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/40', dot: 'bg-blue-400', label: 'In Transit (On Route)', pulse: true },
    ARRIVED: { color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-500/40', dot: 'bg-purple-400', label: 'Arrived at Gate / Venue', pulse: true },
    DELIVERED: { color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/40', dot: 'bg-emerald-400', label: 'Delivered & Verified' },
    REJECTED: { color: 'text-rose-300', bg: 'bg-rose-500/20 border-rose-500/40', dot: 'bg-rose-400', label: 'Delivery Failed' },
  };

  const ITEM_COLORS = [
    'bg-violet-50 border-violet-200 text-violet-900',
    'bg-sky-50 border-sky-200 text-sky-900',
    'bg-emerald-50 border-emerald-200 text-emerald-900',
    'bg-amber-50 border-amber-200 text-amber-900',
    'bg-rose-50 border-rose-200 text-rose-900',
    'bg-indigo-50 border-indigo-200 text-indigo-900',
    'bg-teal-50 border-teal-200 text-teal-900',
    'bg-orange-50 border-orange-200 text-orange-900',
  ];

  const QTY_COLORS = [
    'bg-violet-600 text-white',
    'bg-sky-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-indigo-600 text-white',
    'bg-teal-600 text-white',
    'bg-orange-600 text-white',
  ];

  if (!currentDemand) return null;

  const demStatus = currentDemand.status || 'PENDING';
  const statusCfg = STATUS_CONFIG[demStatus] || STATUS_CONFIG.PENDING;

  const currentStage = currentDemand.delivery_status || 'PENDING';
  const delivCfg = DELIVERY_CONFIG[currentStage] || DELIVERY_CONFIG.PENDING;
  const isDelivered = currentStage === 'DELIVERED';
  const isArrived = currentStage === 'ARRIVED';
  const isOutForDelivery = currentStage === 'OUT_FOR_DELIVERY';
  const isRejectedDelivery = currentStage === 'REJECTED';

  const stageIndex = isDelivered ? 3 : isArrived ? 2 : isOutForDelivery ? 1 : 0;
  const progressPercent = stageIndex === 3 ? 100 : stageIndex === 2 ? 68 : stageIndex === 1 ? 36 : 8;
  const isAdmin = user?.role === 'ADMIN';

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <>
      {/* Backdrop — clicking outside closes panel */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-label="Close panel"
      />

      {/* Side Panel — stopPropagation prevents backdrop from firing when clicking inside */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── COLOR-CODED HEADER ────────────────────────────────────────── */}
        <div className={`px-4 py-2 bg-gradient-to-r ${statusCfg.header} flex items-center justify-between shadow-lg shrink-0`}>
          <div className="space-y-0.5 min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{statusCfg.icon}</span>
              <h2 className="text-base font-black text-white">
                {currentDemand.demand_number}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-slate-800 tracking-wide shadow">
                {statusCfg.label}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${statusCfg.subtext} truncate`}>
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentDemand.institution_name || currentDemand.unit_name || user?.unit_name || 'Unit Demand'}</span>
              {currentDemand.demand_date && (
                <span className="shrink-0 opacity-80">• {currentDemand.demand_date}</span>
              )}
            </div>
          </div>

          {/* ── CLOSE BUTTON — big, solid, always visible ──────────────── */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-red-50 hover:text-red-600 transition-all shadow-md border border-white font-black text-base"
            title="Close"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-slate-100 space-y-2">

            {/* ── DEMAND STATUS PILL ROW ───────────────────────────────── */}
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${demStatus === 'FULFILLED' ? 'bg-emerald-50 border-emerald-200' :
              demStatus === 'APPROVED' ? 'bg-blue-50 border-blue-200' :
                demStatus === 'ACCEPTED' ? 'bg-indigo-50 border-indigo-200' :
                  demStatus === 'REJECTED' ? 'bg-rose-50 border-rose-200' :
                    'bg-amber-50 border-amber-200'
              }`}>
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">Demand Status</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black border-2 ${statusCfg.badge}`}>
                {statusCfg.icon} {demStatus}
              </span>
            </div>

            {/* ── LIVE DELIVERY TRACKER ────────────────────────────────── */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white space-y-2 shadow-md border border-slate-700/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg text-blue-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 block">Live Delivery Tracker</span>
                    <span className="text-[10px] text-slate-400 font-medium">Real-time supply movement</span>
                  </div>
                </div>

                {/* Animated status pill */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border backdrop-blur-sm transition-all ${delivCfg.bg} ${delivCfg.color} ${delivCfg.pulse ? 'animate-pulse' : ''}`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${delivCfg.dot}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${delivCfg.dot}`} />
                  </span>
                  {delivCfg.label}
                </span>
              </div>

              {/* 4-Stage Progress Stepper */}
              <div className="relative pt-1 pb-0">
                <div className="absolute top-4 left-4 right-4 h-1 bg-slate-700/80 rounded-full z-0 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isRejectedDelivery
                      ? 'bg-gradient-to-r from-rose-500 to-rose-700'
                      : 'bg-gradient-to-r from-amber-400 via-blue-500 via-purple-500 to-emerald-400'
                      }`}
                    style={{ width: `${isRejectedDelivery ? progressPercent : progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 relative z-10">
                  {/* Warehouse */}
                  <div className="text-center">
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all shadow-sm ${stageIndex >= 0 ? 'bg-amber-500 text-white ring-2 ring-amber-500/30 scale-105' : 'bg-slate-700 text-slate-400'
                      }`}>
                      <Package className="w-3 h-3" />
                    </div>
                    <span className="block text-[9px] font-bold mt-1 text-amber-300">Warehouse</span>
                    <span className="block text-[8px] text-slate-400">Ready</span>
                  </div>

                  {/* In Transit */}
                  <div className="text-center">
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all shadow-sm ${stageIndex >= 1 ? 'bg-blue-500 text-white ring-2 ring-blue-500/30 scale-105' : 'bg-slate-700 text-slate-400'
                      } ${isOutForDelivery ? 'animate-bounce' : ''}`}>
                      <Truck className="w-3 h-3" />
                    </div>
                    <span className="block text-[9px] font-bold mt-1 text-blue-300">In Transit</span>
                    <span className="block text-[8px] text-slate-400 truncate">
                      {currentDemand.dispatched_at ? 'Dispatched' : currentDemand.delivery_partner_name ? 'En route' : 'Assigned'}
                    </span>
                  </div>

                  {/* At Gate */}
                  <div className="text-center">
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all shadow-sm ${stageIndex >= 2 ? 'bg-purple-500 text-white ring-2 ring-purple-500/30 scale-105' : 'bg-slate-700 text-slate-400'
                      } ${isArrived ? 'animate-pulse' : ''}`}>
                      <MapPin className="w-3 h-3" />
                    </div>
                    <span className="block text-[9px] font-bold mt-1 text-purple-300">At Gate</span>
                    <span className="block text-[8px] text-slate-400 truncate">
                      {isArrived || isDelivered ? 'Arrived' : 'Destination'}
                    </span>
                  </div>

                  {/* Delivered */}
                  <div className="text-center">
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all shadow-sm ${stageIndex >= 3 ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/40 scale-105' : 'bg-slate-700 text-slate-400'
                      }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="block text-[9px] font-bold mt-1 text-emerald-300">Delivered</span>
                    <span className="block text-[8px] text-slate-400">
                      {isDelivered ? 'Verified ✓' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps row */}
              {(currentDemand.dispatched_at || currentDemand.delivered_at) && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                  {currentDemand.dispatched_at && (
                    <span>🚚 Dispatched: <strong className="text-blue-300">{formatTimestamp(currentDemand.dispatched_at)}</strong></span>
                  )}
                  {currentDemand.delivered_at && (
                    <span>✅ Delivered: <strong className="text-emerald-300">{formatTimestamp(currentDemand.delivered_at)}</strong></span>
                  )}
                </div>
              )}

              {/* Admin Stage Controller */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Admin Stage Controller:
                    </span>
                    {updatingStage && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                        <Loader2 className="w-3 h-3 animate-spin" /> Syncing live...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { stage: 'PENDING', emoji: '📦', label: 'Warehouse', active: 'bg-amber-500 border-amber-400 ring-amber-300/40' },
                      { stage: 'OUT_FOR_DELIVERY', emoji: '🚚', label: 'In Transit', active: 'bg-blue-600 border-blue-400 ring-blue-300/40' },
                      { stage: 'ARRIVED', emoji: '📍', label: 'At Gate', active: 'bg-purple-600 border-purple-400 ring-purple-300/40' },
                      { stage: 'DELIVERED', emoji: '✅', label: 'Delivered', active: 'bg-emerald-600 border-emerald-400 ring-emerald-300/40' },
                    ].map(({ stage, emoji, label, active }) => (
                      <button
                        key={stage}
                        type="button"
                        disabled={updatingStage}
                        onClick={() => handleUpdateDeliveryStage(stage)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-black transition-all border text-center ${currentStage === stage
                          ? `${active} text-white shadow-md ring-2`
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10'
                          }`}
                      >
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Partner Card */}
              {currentDemand.delivery_partner_name ? (
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-wide block">Assigned Delivery Partner</span>
                      <span className="font-black text-white text-sm">{currentDemand.delivery_partner_name}</span>
                    </div>
                    {currentDemand.delivery_partner_phone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${currentDemand.delivery_partner_phone}`}
                          className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 font-extrabold rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppPartner(currentDemand)}
                          className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-lg transition-colors"
                          title="WhatsApp Driver"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-[11px]">
                    <div>
                      <span className="text-slate-300 font-bold">Vehicle: </span>
                      <span className="font-bold text-white">{currentDemand.delivery_partner_vehicle || 'Standard Dispatch'}</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-bold">Load: </span>
                      <span className="font-black text-amber-300">{currentDemand.total_quantity || 0} Packets</span>
                    </div>
                  </div>
                  {currentDemand.delivery_notes && (
                    <div className="pt-1 text-[11px] text-slate-300 italic bg-black/20 p-2 rounded-lg border border-white/5">
                      <strong>Dispatch Note:</strong> {currentDemand.delivery_notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 p-2.5 rounded-xl border border-dashed border-white/20 text-center text-xs text-slate-300">
                  Driver assignment in progress at Supply Depot.
                </div>
              )}
            </div>

            {/* ── NCC UNIT & PURPOSE ──────────────────────────────────── */}
            {currentDemand.unit_name && (
              <div className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs">
                <span className="text-indigo-600 font-bold uppercase tracking-wide flex items-center gap-1.5 text-[10px]">
                  <ShieldCheck className="w-3 h-3" /> NCC Unit
                </span>
                <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">{currentDemand.unit_name}</span>
              </div>
            )}

            {currentDemand.purpose && (
              <div className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Purpose</span>
                <span className="text-sky-900 font-bold text-[10px]">{currentDemand.purpose}</span>
              </div>
            )}

            {/* Review Remarks */}
            {currentDemand.review_remarks && (
              <div className="px-4 py-3 rounded-2xl bg-orange-50 border-2 border-orange-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Unit Review Rationale
                </span>
                <p className="text-orange-900 italic text-xs">{currentDemand.review_remarks}</p>
              </div>
            )}

            {/* ── ITEMS BREAKDOWN (ALL ITEMS SAVED AS STANDARD REFRESHMENT PACKET) ── */}
            {(() => {
              const DEFAULT_PACKET_ITEMS = [
                { item_name: 'CAKE', unit_price: 10.0, quantity: 1, unit_of_measure: 'NOS', expiry_date: '2026-12-06' },
                { item_name: 'Fruit Juice Pack (200ml)', unit_price: 20.0, quantity: 1, unit_of_measure: 'Tetra Pack', expiry_date: '2026-11-20' },
                { item_name: 'Glucose Biscuit Packet (100g)', unit_price: 10.0, quantity: 1, unit_of_measure: 'Packet', expiry_date: '2027-04-15' },
                { item_name: 'High-Protein Energy Bar', unit_price: 20.0, quantity: 1, unit_of_measure: 'Bar', expiry_date: '2027-02-28' },
                { item_name: 'MUFFIN', unit_price: 11.43, quantity: 1, unit_of_measure: 'NOS', expiry_date: '2026-10-15' },
              ];

              const packetItemsToDisplay = (packetTemplate?.items && packetTemplate.items.length > 0)
                ? packetTemplate.items
                : DEFAULT_PACKET_ITEMS;

              const packetSubtotal = packetTemplate?.subtotal || 71.43;
              const packetGst = packetTemplate?.gst_amount || 3.57;
              const packetGrandTotal = packetTemplate?.grand_total || 75.00;

              // Compute total packets demanded
              const totalPackets = currentDemand.total_quantity ||
                (currentDemand.items?.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0)) || 0;

              // Extract year groups
              const yearGroupSummary = {};
              (currentDemand.items || []).forEach(it => {
                const yg = it.year_group || 'Cadets';
                yearGroupSummary[yg] = (yearGroupSummary[yg] || 0) + (parseInt(it.quantity) || 0);
              });

              return (
                <div className="space-y-3.5">
                  {/* Section Title & Official Cap Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                          Requested Items Breakdown
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Standard Refreshment Packet Allocation
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Price Cap: ≤ ₹75.00
                    </span>
                  </div>

                  {/* Cadet Strength / Year-Group Requisition */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {Object.entries(yearGroupSummary).map(([yearGroup, qty], idx) => (
                      <div
                        key={yearGroup}
                        className={`p-2 rounded-lg border flex items-center justify-between shadow-xs ${ITEM_COLORS[idx % ITEM_COLORS.length]}`}
                      >
                        <div>
                          <span className="text-[9px] font-bold uppercase opacity-70 block">
                            {yearGroup}
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {qty} <span className="text-[10px] font-semibold text-slate-600">Pkts</span>
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shadow-xs ${QTY_COLORS[idx % QTY_COLORS.length]}`}>
                          {qty}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Packets Requisition Banner */}
                  <div className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 shadow-sm">
                    <span className="font-bold text-[10px] text-white uppercase tracking-wide">
                      Total Refreshment Packets
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[10px] shadow-sm">
                      {totalPackets} Pkts
                    </span>
                  </div>


                </div>
              );
            })()}

            {/* ── DELIVERY PROOF & DOCUMENTS ───────────────────────────── */}
            <div className="pt-2 space-y-2 border-t-2 border-dashed border-slate-200">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Vendor Delivery Proof & Documents
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                {currentDemand.delivery_receipt_url ? (
                  <a
                    href={currentDemand.delivery_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 rounded-2xl font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                  >
                    <FileText className="w-4 h-4" /> View Signed Receipt ↗
                  </a>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl font-medium text-xs">
                    <FileText className="w-4 h-4 text-slate-300" /> Receipt: Pending Upload
                  </div>
                )}

                {currentDemand.invoice_url ? (
                  <a
                    href={currentDemand.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded-2xl font-black text-xs transition-all shadow-md shadow-indigo-500/20"
                  >
                    <FileCheck className="w-4 h-4" /> View Bill / Invoice ↗
                  </a>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl font-medium text-xs">
                    <FileCheck className="w-4 h-4 text-slate-300" /> Bill: Pending
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── ACTIVITY TIMELINE ─────────────────────────────────────── */}
          <div className="p-5 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Activity Timeline
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {activities.length} {activities.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {loading ? (
              <div className="text-center text-slate-400 text-xs py-6 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 animate-spin" /> Loading timeline...
              </div>
            ) : activities.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-400 text-xs">
                No activity recorded yet.
              </div>
            ) : (
              <div className="relative pl-7 space-y-3 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-300 before:via-purple-200 before:to-emerald-200">
                {activities.map((act, i) => {
                  const msg = act.message || '';
                  const lowerMsg = msg.toLowerCase();
                  const isStatusChange = act.action_type === 'STATUS_CHANGE';
                  const isApproved = lowerMsg.includes('approved');
                  const isAccepted = lowerMsg.includes('accepted');
                  const isFulfilled = lowerMsg.includes('fulfilled') || lowerMsg.includes('delivered');
                  const isRejected = lowerMsg.includes('rejected') || lowerMsg.includes('cancelled') || lowerMsg.includes('failed');
                  const isDispatch = lowerMsg.includes('transit') || lowerMsg.includes('dispatch');
                  const isArrival = lowerMsg.includes('arrived') || lowerMsg.includes('gate');
                  const isBill = lowerMsg.includes('bill') || lowerMsg.includes('challan') || lowerMsg.includes('collection');
                  const isReceipt = lowerMsg.includes('receipt');

                  const nodeColor =
                    isApproved ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                      isAccepted ? 'bg-blue-500 text-white ring-4 ring-blue-100' :
                        isFulfilled ? 'bg-purple-500 text-white ring-4 ring-purple-100' :
                          isRejected ? 'bg-rose-500 text-white ring-4 ring-rose-100' :
                            isDispatch ? 'bg-sky-500 text-white ring-4 ring-sky-100' :
                              isArrival ? 'bg-violet-500 text-white ring-4 ring-violet-100' :
                                isBill ? 'bg-amber-500 text-white ring-4 ring-amber-100' :
                                  isReceipt ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                                    isStatusChange ? 'bg-indigo-500 text-white ring-4 ring-indigo-100' :
                                      'bg-slate-400 text-white ring-4 ring-slate-100';

                  const cardStyle =
                    isApproved ? 'border-emerald-200 bg-emerald-50/60' :
                      isAccepted ? 'border-blue-200 bg-blue-50/60' :
                        isFulfilled ? 'border-purple-200 bg-purple-50/60' :
                          isRejected ? 'border-rose-200 bg-rose-50/60' :
                            isDispatch ? 'border-sky-200 bg-sky-50/60' :
                              isArrival ? 'border-violet-200 bg-violet-50/60' :
                                isBill ? 'border-amber-200 bg-amber-50/60' :
                                  isReceipt ? 'border-teal-200 bg-teal-50/60' :
                                    'border-slate-200 bg-white';

                  const actDate = act.created_at ? new Date(act.created_at) : null;
                  const dateStr = actDate && !isNaN(actDate)
                    ? `${actDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${actDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : '';

                  return (
                    <div key={i} className="relative group">
                      <div className={`absolute -left-7 top-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 ${nodeColor}`}>
                        {isStatusChange ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-2.5 h-2.5" />}
                      </div>
                      <div className={`p-3 rounded-2xl border-2 ${cardStyle} shadow-xs transition-all hover:shadow-md`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-black text-xs text-slate-800 tracking-tight truncate">
                            {act.user_name || 'System'}
                          </div>
                          <time className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                            {dateStr}
                          </time>
                        </div>
                        <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {act.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── MESSAGE BOX ───────────────────────────────────────────────── */}
        <div className={`p-4 border-t-2 border-slate-200 bg-gradient-to-r ${statusCfg.header}`}>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message or update..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white/90 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-white/60 transition-all font-medium text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2.5 bg-white text-slate-800 rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
