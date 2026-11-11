import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Truck, ChevronLeft, ChevronRight, MapPin, ArrowUp, ArrowDown, Navigation, Phone, Calendar,
  Package, RefreshCw, CheckCircle2, Clock, Share2, ArrowLeftRight, X, CheckSquare, Square
} from 'lucide-react';

const dateKey = (d) => (typeof d === 'string' ? d.split('T')[0] : '');
const fmtDate = (iso) => {
  const p = (iso || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso || 'Undated';
};
const dayName = (iso) => {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });
  } catch (e) {
    return '';
  }
};

const mapsUrl = (dem) => {
  if (dem.google_location && dem.google_location.startsWith('http')) return dem.google_location;
  const q = `${dem.institution_name}, ${dem.complete_address || ''}, PIN ${dem.pin_code || ''}, India`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const STATUS_STYLE = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_FOR_DELIVERY: 'bg-blue-50 text-blue-700 border-blue-200',
  ARRIVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function Distribution() {
  const { token } = useAuth();
  const { events } = useSSE();
  const [demands, setDemands] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transferModal, setTransferModal] = useState({ open: false, ids: [] });
  const [transferring, setTransferring] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const ts = Date.now();
      const headers = { Authorization: `Bearer ${token}` };
      const [dRes, pRes] = await Promise.all([
        fetch(`/api/delivery/demands?t=${ts}`, { headers }),
        fetch(`/api/delivery/partners?t=${ts}`, { headers })
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        setDemands(Array.isArray(d) ? d : []);
      }
      if (pRes.ok) {
        const p = await pRes.json();
        setPartners(Array.isArray(p) ? p : []);
      }
    } catch (err) {
      console.error('Distribution fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.timestamp) fetchData();
  }, [events?.DEMAND_UPDATED, events?.timestamp, fetchData]);

  const [showDays, setShowDays] = useState(false);
  const [mode, setMode] = useState('DRIVER'); // DRIVER (Car) | PORTER | SELF_DELIVERY

  const MODES = [
    { key: 'DRIVER', label: 'CAR' },
    { key: 'PORTER', label: 'PORTER' },
    { key: 'SELF_DELIVERY', label: 'SELF DELIVERY' }
  ];

  // Demands assigned by admin for the chosen delivery mode
  const assigned = useMemo(
    () => demands.filter(d => {
      const m = d.delivery_mode || 'DRIVER';
      if (m !== mode) return false;
      return mode === 'DRIVER' ? Boolean(d.delivery_partner_id) : Boolean(d.delivery_partner_id || d.delivery_partner_name);
    }),
    [demands, mode]
  );

  // Days that have assignments (quick chips)
  const days = useMemo(() => {
    const map = {};
    assigned.forEach(d => {
      const k = dateKey(d.demand_date);
      if (!map[k]) map[k] = { date: k, stops: 0, packets: 0 };
      map[k].stops += 1;
      map[k].packets += Number(d.total_quantity) || 0;
    });
    return Object.values(map).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [assigned]);

  const localToday = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  // Default to today on first load
  useEffect(() => {
    if (!selectedDate) setSelectedDate(localToday());
  }, [selectedDate]);

  // Left / right arrow: move to previous / next calendar day (any date)
  const shiftDate = (delta) => {
    const dt = new Date(`${selectedDate || localToday()}T00:00:00`);
    dt.setDate(dt.getDate() + delta);
    setSelectedDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  };

  const sortStops = (arr) => arr.sort((a, b) => {
    const sa = Number(a.delivery_sequence) || 0;
    const sb = Number(b.delivery_sequence) || 0;
    if (sa !== sb) return sa - sb;
    return (a.id || 0) - (b.id || 0);
  });

  // Cards: Car -> every active driver partner; Porter / Self -> grouped by name
  const cards = useMemo(() => {
    const dayStops = assigned.filter(d => dateKey(d.demand_date) === selectedDate);
    if (mode === 'DRIVER') {
      return partners
        .filter(p => !['PORTER', 'SELF_SERVICE'].includes(p.vehicle_type))
        .map(p => ({
          key: `p${p.id}`,
          vehicle_no: p.vehicle_no,
          name: p.name,
          phone: p.phone,
          stops: sortStops(dayStops.filter(d => String(d.delivery_partner_id) === String(p.id)))
        }));
    }
    const groups = {};
    dayStops.forEach(d => {
      const nm = d.delivery_partner_name || (mode === 'PORTER' ? 'Porter' : 'Self Delivery');
      if (!groups[nm]) groups[nm] = { key: nm, vehicle_no: mode === 'PORTER' ? 'PORTER' : 'SELF DELIVERY', name: nm, phone: d.delivery_partner_phone || '', stops: [] };
      groups[nm].stops.push(d);
    });
    return Object.values(groups).map(g => ({ ...g, stops: sortStops(g.stops) }));
  }, [assigned, partners, selectedDate, mode]);

  const moveStop = async (stops, idx, dir) => {
    const swap = dir === 'UP' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= stops.length) return;
    const next = [...stops];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const sequences = next.map((s, i) => ({ id: s.id, delivery_sequence: i + 1 }));

    setSavingId(stops[idx].id);
    setDemands(prev => prev.map(d => {
      const s = sequences.find(x => x.id === d.id);
      return s ? { ...d, delivery_sequence: s.delivery_sequence } : d;
    }));
    try {
      const res = await fetch('/api/delivery/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sequences })
      });
      if (!res.ok) { let m = 'Failed to save order'; try { const j = await res.json(); if(j && j.error) m = j.error; } catch(e){} throw new Error(m); }
    } catch (err) {
      alert(err.message);
      fetchData();
    } finally {
      setSavingId(null);
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const toggleSelectAll = (stops) => {
    const ids = stops.filter(s => (s.delivery_status || 'PENDING') !== 'DELIVERED').map(s => s.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => (allSelected ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
  };

  // All places a demand can be sent to: every active car + Porter + Self Delivery
  const transferTargets = useMemo(() => {
    const cars = partners
      .filter(p => p.is_active !== 0 && !['PORTER', 'SELF_SERVICE'].includes(p.vehicle_type))
      .map(p => ({
        key: 'D:' + p.id,
        mode: 'DRIVER',
        partnerId: p.id,
        title: p.name ? `${p.name} - ${p.vehicle_no || 'CAR'}` : (p.vehicle_no || 'CAR'),
        sub: p.vehicle_model || 'Delivery Vehicle',
        phone: p.phone
      }));
    return [
      ...cars,
      { key: 'PORTER', mode: 'PORTER', partnerId: null, title: 'PORTER', sub: 'Handled by Porter' },
      { key: 'SELF_DELIVERY', mode: 'SELF_DELIVERY', partnerId: null, title: 'SELF DELIVERY', sub: 'Admin Direct' }
    ];
  }, [partners]);

  const currentTargetKey = (d) => {
    const m = d.delivery_mode || 'DRIVER';
    if (m === 'DRIVER') return 'D:' + d.delivery_partner_id;
    return m;
  };

  const doTransfer = async (ids, target) => {
    if (!ids.length || !target) return;
    setTransferring(true);
    const snapshot = demands;
    const car = target.mode === 'DRIVER' ? partners.find(p => p.id === target.partnerId) : null;
    // Optimistic update so the card moves instantly
    setDemands(prev => prev.map(d => {
      if (!ids.includes(d.id)) return d;
      if (target.mode === 'DRIVER') {
        return { ...d, delivery_mode: 'DRIVER', delivery_partner_id: target.partnerId, delivery_partner_name: car?.name || d.delivery_partner_name, delivery_partner_phone: car?.phone || '', delivery_partner_vehicle: car?.vehicle_no || '', delivery_sequence: 9999 };
      }
      return {
        ...d,
        delivery_mode: target.mode,
        delivery_partner_id: null,
        delivery_partner_name: target.mode === 'PORTER' ? 'Handled by Porter' : 'Admin Self Delivery',
        delivery_partner_phone: target.mode === 'PORTER' ? 'Porter Staff' : 'Self Service Rep',
        delivery_sequence: 9999
      };
    }));
    try {
      const res = await fetch('/api/delivery/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ demandIds: ids, targetMode: target.mode, targetPartnerId: target.partnerId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to transfer demand');
      if (data.skipped && data.skipped.length) alert(`${data.skipped.length} delivered demand(s) were not moved.`);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      setTransferModal({ open: false, ids: [] });
      // Switch the tab so the admin sees where the demand landed
      if (target.mode !== mode) setMode(target.mode);
      await fetchData();
    } catch (err) {
      setDemands(snapshot);
      alert(err.message || 'Failed to transfer demand');
    } finally {
      setTransferring(false);
    }
  };

  const shareList = (partner, stops) => {
    const titleName = partner.name
      ? (partner.vehicle_no && partner.vehicle_no !== partner.name ? `${partner.name} - ${partner.vehicle_no}` : partner.name)
      : (partner.vehicle_no || 'DRIVER');
    let text = `🚚 *DISTRIBUTION LIST - ${titleName}*\n📅 ${fmtDate(selectedDate)} (${dayName(selectedDate)})\n\n`;
    stops.forEach((s, i) => {
      text += `${i + 1}. *${s.institution_name}* - ${s.total_quantity || 0} Pkts\n   PIN ${s.pin_code}\n   ${mapsUrl(s)}\n`;
    });
    let phone = (partner.phone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="p-12 text-center font-bold text-slate-500">Loading distribution...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-600" /> Distribution
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Day-wise delivery list of each partner. Use ▲ ▼ to set which stop is delivered first — drivers see the same order.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-fit">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
              mode === m.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-black text-blue-900 focus:outline-none"
            />
            <span className="text-xs font-bold text-blue-700">{dayName(selectedDate)}</span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(localToday())}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white"
          >
            Today
          </button>
          {days.length > 0 && (
            <button
              onClick={() => setShowDays(v => !v)}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              {showDays ? 'Hide Days' : `Show Days (${days.length})`}
            </button>
          )}
        </div>
        {showDays && days.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-3.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
            {days.map(dy => (
              <button
                key={dy.date}
                onClick={() => setSelectedDate(dy.date)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all ${
                  selectedDate === dy.date
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {fmtDate(dy.date)} ({dy.stops} • {dy.packets} Pkts)
              </button>
            ))}
          </div>
        )}
      </div>

      {mode !== 'DRIVER' && cards.length === 0 && (
        <div className="text-center text-xs text-slate-400 italic py-8 bg-white rounded-2xl border border-dashed border-slate-200">
          No {mode === 'PORTER' ? 'Porter' : 'Self Delivery'} demands on {fmtDate(selectedDate)}
        </div>
      )}

      {/* Partner columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {cards.map(partner => {
          const stops = partner.stops;
          const total = stops.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
          return (
            <div key={partner.key} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 flex-nowrap overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="font-black text-sm text-slate-900 whitespace-nowrap uppercase">
                  {partner.name || 'DRIVER'}
                  {partner.vehicle_no && partner.vehicle_no !== partner.name ? (
                    <span className="font-extrabold text-slate-600"> - {partner.vehicle_no}</span>
                  ) : ''}
                </span>
                {partner.phone && (
                  <a href={`tel:${partner.phone}`} className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 whitespace-nowrap">
                    <Phone className="w-3 h-3" />{partner.phone}
                  </a>
                )}
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap">{stops.length} Stops</span>
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-black flex items-center gap-1 whitespace-nowrap">
                  <Package className="w-3 h-3" />{total} Pkts
                </span>
                <button
                  onClick={() => toggleSelectAll(stops)}
                  disabled={stops.length === 0}
                  className="ml-auto px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[10px] font-black flex items-center gap-1 shrink-0"
                  title="Select all stops of this car"
                  >
                  <CheckSquare className="w-3 h-3" /> All

                </button>

                <button
                  onClick={() => shareList(partner, stops)}
                  disabled={stops.length === 0}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0"
                  title="Send this day's list on WhatsApp"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>

              <div className="p-3 space-y-2 flex-1">
                {stops.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 italic py-8">
                    Nothing assigned on {selectedDate ? fmtDate(selectedDate) : 'this day'}
                  </div>
                ) : stops.map((s, i) => {
                  const st = s.delivery_status || 'PENDING';
                  return (
                    <div key={s.id} className={`p-2.5 rounded-xl border bg-white flex items-center gap-2 ${selectedIds.includes(s.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => toggleSelect(s.id)}
                        disabled={st === 'DELIVERED'}
                        className="shrink-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                        title="Select for transfer"
                      >
                        {selectedIds.includes(s.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        st === 'DELIVERED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                      }`}>
                        {st === 'DELIVERED' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-slate-900 truncate">{s.institution_name}</div>
                        <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-1.5">
                          {s.unit_code && <span className="font-bold text-indigo-700">{s.unit_code}</span>}
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />PIN {s.pin_code}</span>
                          {s.demand_time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.demand_time}</span>}
                        </div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded border text-[9px] font-black ${STATUS_STYLE[st] || STATUS_STYLE.PENDING}`}>
                          {st.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTransferModal({ open: true, ids: [s.id] })}
                        disabled={st === 'DELIVERED'}
                        className="shrink-0 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-30 active:scale-95 transition-all"
                        title="Switch to another car / Porter / Self Delivery"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {s.total_quantity || 0} Pkts
                        </span>
                        <div className="flex items-center gap-1">
                          <a
                            href={mapsUrl(s)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200"
                            title="Navigate"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => moveStop(stops, i, 'UP')}
                            disabled={i === 0 || savingId === s.id}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                            title="Deliver earlier"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveStop(stops, i, 'DOWN')}
                            disabled={i === stops.length - 1 || savingId === s.id}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                            title="Deliver later"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating multi-select transfer bar */}
      {selectedIds.length > 0 && !transferModal.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]">
          <span className="text-xs font-black">
            {selectedIds.length} selected ({demands.filter(d => selectedIds.includes(d.id)).reduce((s, d) => s + (Number(d.total_quantity) || 0), 0)} Pkts)
          </span>
          <button
            type="button"
            onClick={() => setTransferModal({ open: true, ids: selectedIds })}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Transfer destination dialog */}
      {transferModal.open && (() => {
        const moving = demands.filter(d => transferModal.ids.includes(d.id));
        const currentKeys = new Set(moving.map(currentTargetKey));
        const hideKey = currentKeys.size === 1 ? Array.from(currentKeys)[0] : null;
        const totalPk = moving.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-amber-600" /> Transfer {moving.length} demand{moving.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[240px]">
                    {moving.length === 1 ? moving[0].institution_name : `${totalPk} packets total`}
                  </p>
                </div>
                <button type="button" onClick={() => setTransferModal({ open: false, ids: [] })} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {transferTargets.filter(t => t.key !== hideKey).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    disabled={transferring}
                    onClick={() => doTransfer(transferModal.ids, t)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all disabled:opacity-50"
                  >
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-slate-900">{t.title}</span>
                      <span className="block text-[10px] text-slate-500 font-semibold truncate">{t.sub}{t.phone ? ` • ${t.phone}` : ''}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
              {transferring && <p className="text-center text-[11px] font-bold text-slate-500">Saving...</p>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
