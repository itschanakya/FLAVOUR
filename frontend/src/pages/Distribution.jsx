import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Truck, ChevronLeft, ChevronRight, MapPin, ArrowUp, ArrowDown, Navigation, Phone, Calendar,
  Package, RefreshCw, CheckCircle2, Clock, Share2, ArrowLeftRight, X, CheckSquare, Square, Printer,
  Sparkles, RotateCcw, Lock, Unlock, AlertTriangle, Compass, Settings, ExternalLink, QrCode, Layers, Check
} from 'lucide-react';
import {
  DEFAULT_WAREHOUSE,
  parseLatLng,
  getCachedWarehouseDistance,
  clearDistanceCache,
  solveNearestFirstClient,
  solveKamSeKamKmClient as solveShortestKmClient,
  generateMultiPartMapsLinksClient,
  haversineRoadEstimate
} from '../utils/routeOptimizer';

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

  // Warehouse settings
  const [warehouse, setWarehouse] = useState(() => {
    try {
      const saved = localStorage.getItem('fb_warehouse_depot');
      return saved ? JSON.parse(saved) : DEFAULT_WAREHOUSE;
    } catch (_) {
      return DEFAULT_WAREHOUSE;
    }
  });
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState(() => {
    try {
      const saved = localStorage.getItem('fb_warehouse_depot');
      return saved ? JSON.parse(saved) : DEFAULT_WAREHOUSE;
    } catch (_) {
      return DEFAULT_WAREHOUSE;
    }
  });
  const [savingWarehouse, setSavingWarehouse] = useState(false);

  // Warehouse distance state
  const [distances, setDistances] = useState({});
  const [refreshingDistances, setRefreshingDistances] = useState(false);

  // Per-Car Routing settings: { [partnerKey]: { mode: 'najdik' | 'kam_km', schoolTimeAware: boolean, departureTime: string } }
  const [carSettings, setCarSettings] = useState({});
  const [lockedStopIds, setLockedStopIds] = useState(() => {
    try {
      const saved = localStorage.getItem('locked_delivery_stops');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Auto-Plan Modal state
  const [autoPlanModal, setAutoPlanModal] = useState({
    open: false,
    loading: false,
    applying: false,
    plan: null,
    respectLocks: true,
    schoolTimeAware: false
  });

  // Geotag warning & quick fix modal
  const [showNoGeoBanner, setShowNoGeoBanner] = useState(true);
  const [geotagModal, setGeotagModal] = useState({ open: false, stop: null, inputVal: '', resolving: false, error: '' });

  // Route calculation in progress
  const [optimizingKey, setOptimizingKey] = useState(null);

  // Fetch initial data & warehouse
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const ts = Date.now();
      const headers = { Authorization: `Bearer ${token}` };
      const [dRes, pRes, wRes] = await Promise.all([
        fetch(`/api/delivery/demands?t=${ts}`, { headers }),
        fetch(`/api/delivery/partners?t=${ts}`, { headers }),
        fetch(`/api/delivery/warehouse?t=${ts}`, { headers })
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        setDemands(Array.isArray(d) ? d : []);
      }
      if (pRes.ok) {
        const p = await pRes.json();
        setPartners(Array.isArray(p) ? p : []);
      }
      if (wRes.ok) {
        const wContentType = wRes.headers.get('content-type') || '';
        if (wContentType.includes('application/json')) {
          const w = await wRes.json();
          if (w.warehouse) {
            setWarehouse(w.warehouse);
            setWarehouseForm(w.warehouse);
            localStorage.setItem('fb_warehouse_depot', JSON.stringify(w.warehouse));
          }
        }
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
    if (events?.WAREHOUSE_SETTINGS_UPDATED) fetchData();
  }, [events?.DEMAND_UPDATED, events?.WAREHOUSE_SETTINGS_UPDATED, events?.timestamp, fetchData]);

  const [showDays, setShowDays] = useState(false);
  const [mode, setMode] = useState('DRIVER'); // DRIVER (Car) | PORTER | SELF_DELIVERY

  const MODES = [
    { key: 'DRIVER', label: 'CAR' },
    { key: 'PORTER', label: 'PORTER' },
    { key: 'SELF_DELIVERY', label: 'SELF DELIVERY' }
  ];

  // Save locked stops to localStorage
  const toggleLock = (stopId) => {
    setLockedStopIds(prev => {
      const next = prev.includes(stopId) ? prev.filter(x => x !== stopId) : [...prev, stopId];
      try { localStorage.setItem('locked_delivery_stops', JSON.stringify(next)); } catch (e) { }
      return next;
    });
  };

  // Demands assigned by admin for chosen delivery mode
  const assigned = useMemo(
    () => demands.filter(d => {
      const m = d.delivery_mode || 'DRIVER';
      if (m !== mode) return false;
      return mode === 'DRIVER' ? Boolean(d.delivery_partner_id) : Boolean(d.delivery_partner_id || d.delivery_partner_name);
    }),
    [demands, mode]
  );

  // Days that have assignments
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

  const localTomorrow = () => {
    const n = new Date();
    n.setDate(n.getDate() + 1);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!selectedDate) setSelectedDate(localToday());
  }, [selectedDate]);

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

  // Calculate warehouse distances for stops on current day
  useEffect(() => {
    if (!demands.length || !warehouse) return;
    const currentDayStops = demands.filter(d => dateKey(d.demand_date) === selectedDate);
    const distMap = {};
    currentDayStops.forEach(s => {
      const coords = parseLatLng(s.google_location);
      if (coords) {
        distMap[s.id] = getCachedWarehouseDistance(warehouse, coords);
      } else {
        distMap[s.id] = { distanceKm: 0, durationMin: 0, noGeotag: true };
      }
    });
    setDistances(distMap);
  }, [demands, selectedDate, warehouse]);

  const refreshDistances = () => {
    setRefreshingDistances(true);
    clearDistanceCache();
    const currentDayStops = demands.filter(d => dateKey(d.demand_date) === selectedDate);
    const distMap = {};
    currentDayStops.forEach(s => {
      const coords = parseLatLng(s.google_location);
      if (coords) {
        distMap[s.id] = getCachedWarehouseDistance(warehouse, coords);
      } else {
        distMap[s.id] = { distanceKm: 0, durationMin: 0, noGeotag: true };
      }
    });
    setDistances(distMap);
    setTimeout(() => setRefreshingDistances(false), 300);
  };

  // Stops without geotag for warning banner
  const unassignedNoGeo = useMemo(() => {
    const dayStops = demands.filter(d => dateKey(d.demand_date) === selectedDate);
    return dayStops.filter(s => !parseLatLng(s.google_location));
  }, [demands, selectedDate]);

  // Cards: Car -> every active driver partner; Porter / Self -> grouped by name
  const cards = useMemo(() => {
    const dayStops = assigned.filter(d => dateKey(d.demand_date) === selectedDate);
    if (mode === 'DRIVER') {
      return partners
        .filter(p => !['PORTER', 'SELF_SERVICE'].includes(p.vehicle_type))
        .map(p => {
          const pStops = sortStops(dayStops.filter(d => String(d.delivery_partner_id) === String(p.id)));
          return {
            key: `p${p.id}`,
            partnerId: p.id,
            vehicle_no: p.vehicle_no,
            name: p.name,
            phone: p.phone,
            stops: pStops
          };
        });
    }
    const groups = {};
    dayStops.forEach(d => {
      const nm = d.delivery_partner_name || (mode === 'PORTER' ? 'Porter' : 'Self Delivery');
      if (!groups[nm]) groups[nm] = { key: nm, partnerId: null, vehicle_no: mode === 'PORTER' ? 'PORTER' : 'SELF DELIVERY', name: nm, phone: d.delivery_partner_phone || '', stops: [] };
      groups[nm].stops.push(d);
    });
    return Object.values(groups).map(g => ({ ...g, stops: sortStops(g.stops) }));
  }, [assigned, partners, selectedDate, mode]);

  // Compute live tour metrics per car
  const carTourMetrics = useMemo(() => {
    const map = {};
    cards.forEach(card => {
      const cfg = carSettings[card.key] || { mode: 'najdik', schoolTimeAware: false, departureTime: '07:00' };
      const stopsWithGeo = card.stops.map(s => {
        const c = parseLatLng(s.google_location);
        return {
          ...s,
          lat: c ? c.lat : warehouse.lat + 0.05,
          lng: c ? c.lng : warehouse.lng + 0.05
        };
      });

      // Active mode tour
      const tour = cfg.mode === 'kam_km'
        ? solveShortestKmClient(stopsWithGeo, warehouse, { departureTime: cfg.departureTime })
        : solveNearestFirstClient(stopsWithGeo, warehouse, { schoolTimeAware: cfg.schoolTimeAware, departureTime: cfg.departureTime });

      // Comparison for alternative mode
      const altTour = cfg.mode === 'kam_km'
        ? solveNearestFirstClient(stopsWithGeo, warehouse, { schoolTimeAware: cfg.schoolTimeAware, departureTime: cfg.departureTime })
        : solveShortestKmClient(stopsWithGeo, warehouse, { departureTime: cfg.departureTime });

      map[card.key] = {
        tour,
        altKm: altTour.totalKm,
        altName: cfg.mode === 'kam_km' ? 'Nearest First' : 'Shortest Distance (Min Km)',
        departureTime: cfg.departureTime || '07:00',
        mode: cfg.mode || 'najdik',
        schoolTimeAware: Boolean(cfg.schoolTimeAware)
      };
    });
    return map;
  }, [cards, carSettings, warehouse]);

  // Optimize route for a single car
  const optimizeCarRoute = async (card, requestedMode = null, schoolTimeAwareOverride = null) => {
    const partnerKey = card.key;
    const currentCfg = carSettings[partnerKey] || { mode: 'najdik', schoolTimeAware: false, departureTime: '07:00' };
    const targetMode = requestedMode !== null ? requestedMode : currentCfg.mode;
    const targetSchoolTime = schoolTimeAwareOverride !== null ? schoolTimeAwareOverride : currentCfg.schoolTimeAware;

    setOptimizingKey(partnerKey);
    try {
      const res = await fetch('/api/delivery/optimize-car-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partnerId: card.partnerId,
          date: selectedDate,
          mode: targetMode,
          schoolTimeAware: targetSchoolTime,
          departureTime: currentCfg.departureTime || '07:00'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to optimize route');

      setCarSettings(prev => ({
        ...prev,
        [partnerKey]: {
          ...currentCfg,
          mode: targetMode,
          schoolTimeAware: targetSchoolTime
        }
      }));

      await fetchData();
    } catch (err) {
      alert(err.message || 'Route optimization error');
    } finally {
      setOptimizingKey(null);
    }
  };

  // Global "Optimize All Routes"
  const optimizeAllCars = async () => {
    const carCards = cards.filter(c => c.partnerId && c.stops.length > 0);
    if (!carCards.length) {
      alert('No active cars with assigned stops found for this date.');
      return;
    }
    setOptimizingKey('ALL');
    try {
      for (const card of carCards) {
        const cfg = carSettings[card.key] || { mode: 'najdik', schoolTimeAware: false, departureTime: '07:00' };
        await fetch('/api/delivery/optimize-car-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            partnerId: card.partnerId,
            date: selectedDate,
            mode: cfg.mode || 'najdik',
            schoolTimeAware: cfg.schoolTimeAware || false,
            departureTime: cfg.departureTime || '07:00'
          })
        });
      }
      await fetchData();
      alert(`Routes for all ${carCards.length} vehicles have been successfully optimized and set.`);
    } catch (err) {
      alert('Error setting routes: ' + err.message);
    } finally {
      setOptimizingKey(null);
    }
  };

  // Auto-Plan Assignment Trigger
  const handleTriggerAutoPlan = async () => {
    setAutoPlanModal(prev => ({ ...prev, open: true, loading: true, plan: null }));
    try {
      const res = await fetch('/api/delivery/auto-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: selectedDate,
          respectLocks: autoPlanModal.respectLocks,
          schoolTimeAware: autoPlanModal.schoolTimeAware
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate auto plan');
      setAutoPlanModal(prev => ({ ...prev, plan: data.plan, loading: false }));
    } catch (err) {
      alert(err.message || 'Auto plan error');
      setAutoPlanModal(prev => ({ ...prev, open: false, loading: false }));
    }
  };

  // Apply Auto-Plan to Database
  const handleApplyAutoPlan = async () => {
    if (!autoPlanModal.plan || !autoPlanModal.plan.carPlans) return;
    setAutoPlanModal(prev => ({ ...prev, applying: true }));
    try {
      const res = await fetch('/api/delivery/apply-auto-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ carPlans: autoPlanModal.plan.carPlans })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply auto plan');

      setAutoPlanModal({ open: false, loading: false, applying: false, plan: null, respectLocks: true, schoolTimeAware: false });
      await fetchData();
      alert(data.message || 'Auto Plan successfully applied!');
    } catch (err) {
      alert(err.message || 'Error applying plan');
      setAutoPlanModal(prev => ({ ...prev, applying: false }));
    }
  };

  // Manual move stop UP / DOWN
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
      if (!res.ok) { let m = 'Failed to save order'; try { const j = await res.json(); if (j && j.error) m = j.error; } catch (e) { } throw new Error(m); }
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
      if (target.mode !== mode) setMode(target.mode);
      await fetchData();
    } catch (err) {
      setDemands(snapshot);
      alert(err.message || 'Failed to transfer demand');
    } finally {
      setTransferring(false);
    }
  };

  // Save Warehouse Settings
  const saveWarehouseSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingWarehouse(true);
    try {
      localStorage.setItem('fb_warehouse_depot', JSON.stringify(warehouseForm));
      setWarehouse(warehouseForm);

      try {
        const res = await fetch('/api/delivery/warehouse', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(warehouseForm)
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.warehouse) {
            setWarehouse(data.warehouse);
            localStorage.setItem('fb_warehouse_depot', JSON.stringify(data.warehouse));
          }
        }
      } catch (netErr) {
        console.warn('Backend warehouse sync error:', netErr);
      }

      setWarehouseModalOpen(false);
      clearDistanceCache();
      refreshDistances();
      alert('Warehouse Depot settings successfully saved!');
    } catch (err) {
      alert(err.message || 'Error saving warehouse settings');
    } finally {
      setSavingWarehouse(false);
    }
  };

  // Quick geotag resolver & save
  const resolveAndSaveGeotag = async () => {
    if (!geotagModal.inputVal || !geotagModal.stop) return;
    setGeotagModal(prev => ({ ...prev, resolving: true, error: '' }));
    try {
      const instId = geotagModal.stop.institution_id;
      const instName = geotagModal.stop.institution_name;
      const rawInput = geotagModal.inputVal.trim();

      // Client-side instant parsing
      const clientParsed = parseLatLng(rawInput);
      const formattedCoords = clientParsed
        ? `${clientParsed.lat.toFixed(6)}, ${clientParsed.lng.toFixed(6)}`
        : rawInput;

      let saved = false;

      // 1. Dedicated endpoint POST /api/delivery/resolve-geotag
      try {
        const res = await fetch('/api/delivery/resolve-geotag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            institution_id: instId,
            institution_name: instName,
            google_location: rawInput
          })
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) saved = true;
        }
      } catch (netErr) {
        console.warn('resolve-geotag route warning:', netErr);
      }

      // 2. Fallback: PUT /api/institutions/:id (standard existing endpoint)
      if (!saved && instId) {
        try {
          const res2 = await fetch(`/api/institutions/${instId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              google_location: formattedCoords
            })
          });
          if (res2.ok) saved = true;
        } catch (e2) {
          console.warn('PUT institutions fallback warning:', e2);
        }
      }

      // Update React state immediately so user sees the change without delay
      setDemands(prev => prev.map(d => {
        if ((instId && d.institution_id === instId) || (instName && d.institution_name === instName) || d.id === geotagModal.stop.id) {
          return { ...d, google_location: formattedCoords };
        }
        return d;
      }));

      setGeotagModal({ open: false, stop: null, inputVal: '', resolving: false, error: '' });
      clearDistanceCache();
      fetchData();
    } catch (err) {
      setGeotagModal(prev => ({ ...prev, resolving: false, error: err.message || 'Geotag save failed' }));
    }
  };

  // WhatsApp Share with multi-part Google Maps directions & route sequencing
  const shareList = (partner, stops) => {
    const titleName = partner.name
      ? (partner.vehicle_no && partner.vehicle_no !== partner.name ? `${partner.name} - ${partner.vehicle_no}` : partner.name)
      : (partner.vehicle_no || 'DRIVER');

    const m = carTourMetrics[`p${partner.partnerId || partner.id}`] || {};
    const tour = m.tour || {};
    const mapParts = generateMultiPartMapsLinksClient(stops, warehouse);

    let text = `🚚 *DISTRIBUTION LIST - ${titleName}*\n`;
    text += `📅 ${fmtDate(selectedDate)} (${dayName(selectedDate)})\n`;
    text += `🏭 *DEPOT:* ${warehouse.name || 'Manesar Sector 1'}\n`;
    text += `⏰ *DEPARTURE:* ${m.departureTime || '07:00'} AM\n`;
    text += `📍 *TOTAL ROUTE:* ${tour.totalKm || 0} km • ${Math.floor((tour.totalTourMin || 0) / 60)}h ${(tour.totalTourMin || 0) % 60}m (${stops.length} Stops)\n\n`;

    stops.forEach((s, i) => {
      const distInfo = distances[s.id] || {};
      const legDist = s.leg_km || (distInfo.distanceKm ? `${distInfo.distanceKm} km` : '—');
      const eta = s.eta || '08:00';
      text += `${i + 1}. *${(s.institution_name || '').toUpperCase()}* - ${s.total_quantity || 0} Pkts\n`;
      text += `   ⏰ ETA: ${eta} | Leg: ${legDist} (${distInfo.distanceKm || '—'} km from depot)\n`;
      text += `   PIN ${s.pin_code || '—'}${s.ano_cto_contact ? ' | 📞 ' + s.ano_cto_contact : ''}\n`;
      text += `   ${mapsUrl(s)}\n\n`;
    });

    if (tour.returnLeg) {
      text += `🏁 *RETURN TO WAREHOUSE:* ${tour.returnLeg.address}\n`;
      text += `   Return Time: ${tour.returnLeg.returnTime} (${tour.returnLeg.distanceKm} km return leg)\n\n`;
    }

    if (mapParts.length > 0) {
      text += `🗺️ *GOOGLE MAPS NAVIGATION (FULL ROUTE):*\n`;
      mapParts.forEach(p => {
        text += `${p.label}:\n${p.url}\n\n`;
      });
    }

    let phone = (partner.phone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Pure Black & White Portrait Delivery Run Sheet (A4) with QR codes & return row
  const printPartnerManifest = (partner, stops) => {
    if (!stops || stops.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Please allow popups to print delivery run sheet.');
      return;
    }

    const totalPackets = stops.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
    const dateFormatted = fmtDate(selectedDate);
    const weekday = dayName(selectedDate);
    const driverTitle = partner.name || 'DRIVER';
    const vehicleTitle = partner.vehicle_no || 'CAR';

    const m = carTourMetrics[`p${partner.partnerId || partner.id}`] || {};
    const tour = m.tour || {};
    const mapParts = generateMultiPartMapsLinksClient(stops, warehouse);

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Delivery Run Sheet - ${driverTitle} (${vehicleTitle}) - ${dateFormatted}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 10mm 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
            }
            .screen-action-bar {
              margin-bottom: 12px;
              padding: 8px 12px;
              background: #ffffff;
              border: 1.5px solid #000000;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: 700;
            }
            .print-button {
              background: #000000;
              color: #ffffff;
              border: none;
              padding: 6px 18px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 12px;
              cursor: pointer;
            }
            .header-bar {
              border-bottom: 2px solid #000000;
              padding-bottom: 6px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .org-title {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000000;
              margin: 0;
            }
            .doc-subtitle {
              font-size: 10.5px;
              font-weight: 800;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-top: 2px;
            }
            .meta-box {
              text-align: right;
              font-size: 10px;
              color: #000000;
              font-weight: 600;
            }
            .meta-box strong {
              color: #000000;
              font-size: 11px;
              font-weight: 900;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 8px;
              background-color: #ffffff;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 6px 10px;
              margin-bottom: 10px;
            }
            .summary-col label {
              display: block;
              font-size: 8px;
              font-weight: 800;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .summary-col .val {
              font-size: 11px;
              font-weight: 900;
              color: #000000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #000000;
              padding: 5px 6px;
              text-align: left;
              vertical-align: middle;
              color: #000000;
            }
            th {
              background-color: #f2f2f2;
              color: #000000;
              font-weight: 900;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              border: 1.5px solid #000000;
            }
            .seq-cell {
              text-align: center;
              font-weight: 900;
              font-size: 11px;
              width: 30px;
              background-color: #ffffff;
            }
            .inst-title {
              font-weight: 900;
              font-size: 11px;
              color: #000000;
            }
            .inst-addr {
              font-size: 8.5px;
              color: #000000;
              margin-top: 1px;
            }
            .wh-tag {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              border: 1px solid #000000;
              padding: 1px 4px;
              margin-top: 2px;
            }
            .pkts-cell {
              text-align: center;
              font-weight: 900;
              font-size: 12px;
              color: #000000;
              background-color: #ffffff;
              width: 55px;
            }
            .eta-cell {
              text-align: center;
              font-weight: 900;
              font-size: 10.5px;
              width: 70px;
            }
            .eta-sub {
              font-size: 8px;
              font-weight: normal;
              margin-top: 1px;
            }
            .pin-cell {
              text-align: center;
              font-weight: 900;
              font-size: 9.5px;
              width: 60px;
            }
            .unit-cell {
              text-align: center;
              font-weight: 800;
              font-size: 9.5px;
              width: 70px;
            }
            .contact-cell {
              font-size: 9px;
              width: 110px;
              color: #000000;
            }
            .contact-name {
              font-weight: 800;
              color: #000000;
            }
            .contact-phone {
              color: #000000;
              font-weight: 800;
            }
            .sign-cell {
              width: 100px;
              height: 36px;
              background-color: #ffffff;
              text-align: center;
              vertical-align: bottom;
              padding-bottom: 2px;
            }
            .sign-prompt {
              font-size: 8px;
              font-weight: 700;
              color: #000000;
              border-top: 1px dashed #000000;
              padding-top: 2px;
            }
            .total-row {
              background-color: #f2f2f2 !important;
              color: #000000 !important;
              font-weight: 900;
              font-size: 10.5px;
            }
            .total-row td {
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              color: #000000 !important;
            }
            .return-row {
              background-color: #ffffff;
              border: 1.5px solid #000000;
              font-weight: 900;
              font-size: 10px;
            }
            .qr-section {
              margin-top: 10px;
              margin-bottom: 10px;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 8px;
              page-break-inside: avoid;
            }
            .qr-grid {
              display: flex;
              gap: 16px;
              align-items: center;
              justify-content: space-around;
            }
            .qr-card {
              text-align: center;
            }
            .qr-card img {
              border: 1px solid #000000;
              padding: 2px;
            }
            .qr-card .qr-label {
              font-size: 9px;
              font-weight: 900;
              margin-top: 3px;
              text-transform: uppercase;
            }
            .footer-signatures {
              margin-top: 12px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              page-break-inside: avoid;
            }
            .sign-box {
              border-top: 1.5px solid #000000;
              padding-top: 4px;
              text-align: center;
              font-size: 9.5px;
              font-weight: 900;
              color: #000000;
            }
            .sign-box .note {
              font-size: 8px;
              color: #000000;
              margin-top: 2px;
              font-weight: 600;
            }
            @media print {
              .screen-action-bar {
                display: none !important;
              }
              body {
                color: #000000 !important;
                background: #ffffff !important;
              }
              * {
                color: #000000 !important;
                border-color: #000000 !important;
              }
              th, .total-row, .total-row td {
                background-color: #f2f2f2 !important;
                color: #000000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="screen-action-bar">
            <span>🖨️ <strong>Pure Black & White Portrait Delivery Run Sheet</strong> (A4 Format)</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-size: 10px; font-weight: normal; color: #444;">(Shortcut: Ctrl + P)</span>
              <button id="printManifestBtn" class="print-button" type="button" onclick="window.focus(); window.print();">Print / Save PDF</button>
            </div>
          </div>

          <div class="header-bar">
            <div>
              <h1 class="org-title">NCC Refreshment Supply & Distribution</h1>
              <div class="doc-subtitle">Daily Delivery Run Sheet & Gate Pass • Driver Route Manifest</div>
            </div>
            <div class="meta-box">
              <div>Delivery Date: <strong>${dateFormatted} (${weekday})</strong></div>
              <div>Generated: <strong>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-col">
              <label>Assigned Driver</label>
              <div class="val">${driverTitle}</div>
            </div>
            <div class="summary-col">
              <label>Vehicle / Car No</label>
              <div class="val">${vehicleTitle}</div>
            </div>
            <div class="summary-col">
              <label>Departure From Depot</label>
              <div class="val">${m.departureTime || '07:00'} AM</div>
            </div>
            <div class="summary-col">
              <label>Total Refreshment Load</label>
              <div class="val">${totalPackets.toLocaleString('en-IN')} Pkts (${stops.length} Stops)</div>
            </div>
            <div class="summary-col">
              <label>Total Route Distance</label>
              <div class="val">${tour.totalKm || 0} km • ${Math.floor((tour.totalTourMin || 0) / 60)}h ${(tour.totalTourMin || 0) % 60}m</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th>Institution Name & Address</th>
                <th style="width: 70px; text-align: center;">ETA / Leg</th>
                <th style="width: 55px; text-align: center;">PIN</th>
                <th style="width: 65px; text-align: center;">Unit</th>
                <th style="width: 55px; text-align: center;">Packets</th>
                <th style="width: 110px;">ANO / Contact</th>
                <th style="width: 100px; text-align: center;">Receiver Sign & Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${stops.map((s, idx) => {
      const pkts = Number(s.total_quantity) || 0;
      const addr = s.complete_address ? `<div class="inst-addr">${s.complete_address}</div>` : '';
      const anoName = s.ano_cto_name ? `<div class="contact-name">${s.ano_cto_name}</div>` : '<div class="contact-name">ANO / Caretaker</div>';
      const anoPhone = s.ano_cto_contact ? `<div class="contact-phone">Tel: ${s.ano_cto_contact}</div>` : '';
      const unitBadge = s.unit_code || s.unit_name || '—';
      const whDist = s.wh_distance_km ? `<div class="wh-tag">${s.wh_distance_km} km from depot</div>` : '';
      return `
                  <tr>
                    <td class="seq-cell">${idx + 1}</td>
                    <td>
                      <div class="inst-title">${(s.institution_name || '').toUpperCase()}</div>
                      ${addr}
                      ${whDist}
                    </td>
                    <td class="eta-cell">
                      <strong>${s.eta || '—'}</strong>
                      <div class="eta-sub">${s.leg_km !== undefined ? `Leg: ${s.leg_km} km` : ''}</div>
                    </td>
                    <td class="pin-cell">${s.pin_code || '—'}</td>
                    <td class="unit-cell">${unitBadge}</td>
                    <td class="pkts-cell">${pkts}</td>
                    <td class="contact-cell">
                      ${anoName}
                      ${anoPhone}
                    </td>
                    <td class="sign-cell">
                      <div class="sign-prompt">Sign & Stamp</div>
                    </td>
                  </tr>
                `;
    }).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: right; padding-right: 10px; font-weight: 900;">
                  TOTAL REFRESHMENT LOAD (${stops.length} STOPS):
                </td>
                <td class="pkts-cell" style="font-weight: 900; font-size: 13px;">
                  ${totalPackets.toLocaleString('en-IN')}
                </td>
                <td colspan="2" style="font-size: 9px; font-weight: 800; padding-left: 8px;">
                  Verified & Dispatched in Full
                </td>
              </tr>
              ${tour.returnLeg ? `
                <tr class="return-row">
                  <td class="seq-cell" style="background: #f2f2f2;">🏁</td>
                  <td colspan="4">
                    <strong>RETURN: Central Warehouse Depot (${warehouse.name})</strong>
                    <div class="inst-addr">${tour.returnLeg.address}</div>
                  </td>
                  <td class="eta-cell" colspan="3" style="text-align: right; padding-right: 10px;">
                    Expected Return In-Time: <strong>${tour.returnLeg.returnTime}</strong>
                    <span style="font-size: 8.5px; margin-left: 6px;">(${tour.returnLeg.distanceKm} km return leg)</span>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          ${mapParts.length > 0 ? `
            <div class="qr-section">
              <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; text-align: center;">
                📱 Scan QR Code on Driver Phone for Google Maps Turn-By-Turn Route Navigation
              </div>
              <div class="qr-grid">
                ${mapParts.map(p => `
                  <div class="qr-card">
                    <img src="${p.qrUrl}" alt="${p.label}" width="84" height="84" />
                    <div class="qr-label">${p.label}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="footer-signatures">
            <div class="sign-box">
              Driver Route Clearance (${driverTitle})
              <div class="note">Packets counted & accepted for delivery</div>
            </div>
            <div class="sign-box">
              Warehouse Dispatch Manager
              <div class="note">Dispatched as per daily demand manifest</div>
            </div>
            <div class="sign-box">
              Central Gate Security
              <div class="note">Vehicle out-time & gate pass verified</div>
            </div>
          </div>

          <script>
            function triggerPrint() {
              try {
                window.focus();
                window.print();
              } catch (err) {
                console.error('Print trigger error:', err);
              }
            }
            var btn = document.getElementById('printManifestBtn');
            if (btn) {
              btn.addEventListener('click', triggerPrint);
            }
            window.addEventListener('load', function() {
              setTimeout(triggerPrint, 300);
            });
            setTimeout(triggerPrint, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      try {
        if (printWindow && !printWindow.closed) {
          const doc = printWindow.document;
          const btn = doc ? doc.getElementById('printManifestBtn') : null;
          if (btn) {
            btn.onclick = function () {
              try {
                printWindow.focus();
                printWindow.print();
              } catch (err) {
                console.error(err);
              }
            };
            btn.addEventListener('click', function () {
              try {
                printWindow.focus();
                printWindow.print();
              } catch (err) {
                console.error(err);
              }
            });
          }
          printWindow.focus();
          printWindow.print();
        }
      } catch (err) {
        console.warn('Opener direct print trigger:', err);
      }
    }, 400);
  };

  if (loading) {
    return <div className="p-12 text-center font-bold text-slate-500">Loading distribution...</div>;
  }

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-600" /> Distribution & Route Planning
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Automatic warehouse distance, nearest-neighbour route optimization, and balanced car assignment.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Warehouse Settings Button */}
          <button
            type="button"
            onClick={() => setWarehouseModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Edit warehouse depot location & routing settings"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Depot:</span> {warehouse.name.split(',')[0]}
            <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Refresh Distances Button */}
          <button
            type="button"
            onClick={refreshDistances}
            disabled={refreshingDistances}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Recalculate road distances from warehouse"
          >
            <Compass className={`w-3.5 h-3.5 text-blue-600 ${refreshingDistances ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh Distances</span>
          </button>

          {/* Global "Optimize All Routes" */}
          <button
            type="button"
            onClick={optimizeAllCars}
            disabled={optimizingKey === 'ALL'}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Run Nearest-First route optimization across all cars"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-indigo-600 ${optimizingKey === 'ALL' ? 'animate-spin' : ''}`} />
            <span>Optimize All Routes</span>
          </button>

          {/* Global "Auto Plan" button */}
          <button
            type="button"
            onClick={handleTriggerAutoPlan}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Auto-assign orders across cars with geographic clustering"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto Plan</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh demands & drivers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Geotag Warning Banner for stops without geotags */}
      {showNoGeoBanner && unassignedNoGeo.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-black">{unassignedNoGeo.length} stops missing GPS Geotags</strong> (Excluded from automated routing).
              <span className="text-[11px] block text-amber-800 mt-0.5">
                Stops without GPS coordinates cannot be road-optimized. Set coordinates to include them.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setGeotagModal({ open: true, stop: unassignedNoGeo[0], inputVal: '', resolving: false, error: '' })}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black cursor-pointer shadow-2xs"
            >
              Set Geotag
            </button>
            <button
              type="button"
              onClick={() => setShowNoGeoBanner(false)}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold px-1.5 py-0.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-fit">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${mode === m.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
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
              className="bg-transparent text-xs font-black text-blue-900 focus:outline-none cursor-pointer"
            />
            <span className="text-xs font-bold text-blue-700">{dayName(selectedDate)}</span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(localToday())}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${selectedDate === localToday()
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(localTomorrow())}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${selectedDate === localTomorrow()
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
          >
            Tomorrow
          </button>
          {days.length > 0 && (
            <button
              onClick={() => setShowDays(v => !v)}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all cursor-pointer ${selectedDate === dy.date
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

      {/* Partner Columns (Cars) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {cards.map(partner => {
          const stops = partner.stops;
          const totalPackets = stops.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
          const metrics = carTourMetrics[partner.key] || {};
          const tour = metrics.tour || {};
          const isOptimizing = optimizingKey === partner.key || optimizingKey === 'ALL';
          const cfg = carSettings[partner.key] || { mode: 'najdik', schoolTimeAware: false, departureTime: '07:00' };

          return (
            <div key={partner.key} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              {/* Car Card Header */}
              <div className="px-3 py-2.5 bg-slate-50/90 border-b border-slate-200 space-y-2">
                <div className="flex items-center gap-2 flex-nowrap overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap">
                    {stops.length} Stops
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-black flex items-center gap-1 whitespace-nowrap">
                    <Package className="w-3 h-3" />{totalPackets} Pkts
                  </span>

                  <button
                    onClick={() => toggleSelectAll(stops)}
                    disabled={stops.length === 0}
                    className="ml-auto px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Select all stops of this car"
                  >
                    <CheckSquare className="w-3 h-3" /> All
                  </button>

                  <button
                    type="button"
                    onClick={() => printPartnerManifest(partner, stops)}
                    disabled={stops.length === 0}
                    className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                    title="Print portrait delivery run sheet for this driver"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>

                  <button
                    onClick={() => shareList(partner, stops)}
                    disabled={stops.length === 0}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Send this day's list on WhatsApp"
                  >
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>

                {/* Route Metrics & Mode Selector Row */}
                {stops.length > 0 && (
                  <div className="pt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-[11px] flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-cyan-400" />
                        {tour.totalKm || 0} km • {Math.floor((tour.totalTourMin || 0) / 60)}h {(tour.totalTourMin || 0) % 60}m
                      </span>

                      {/* Mode Toggle: Nearest First vs Min Distance */}
                      <button
                        type="button"
                        onClick={() => optimizeCarRoute(partner, cfg.mode === 'kam_km' ? 'najdik' : 'kam_km')}
                        disabled={isOptimizing}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-400 text-[10px] font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
                        title="Click to toggle between Nearest First and Min Distance"
                      >
                        <Layers className="w-3 h-3 text-indigo-600" />
                        {cfg.mode === 'kam_km' ? 'Mode: Min Km' : 'Mode: Nearest First'}
                      </button>

                      {/* School Time Aware Option */}
                      <button
                        type="button"
                        onClick={() => optimizeCarRoute(partner, null, !cfg.schoolTimeAware)}
                        disabled={isOptimizing}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${cfg.schoolTimeAware
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        title="Toggle School Time Priority"
                      >
                        🕒 School Time {cfg.schoolTimeAware ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Comparison line for the other mode */}
                      {metrics.altKm !== undefined && (
                        <span className="text-[10px] text-slate-500 font-semibold" title={metrics.altName}>
                          Alternative: <strong className="text-slate-700">{metrics.altKm} km</strong>
                        </span>
                      )}

                      {/* Set Route Button */}
                      <button
                        type="button"
                        onClick={() => optimizeCarRoute(partner)}
                        disabled={isOptimizing}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Re-order stops starting with stop closest to warehouse"
                      >
                        <RotateCcw className={`w-3 h-3 ${isOptimizing ? 'animate-spin' : ''}`} />
                        <span>Set Route</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stops List */}
              <div className="p-3 space-y-2 flex-1">
                {stops.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 italic py-8">
                    Nothing assigned on {selectedDate ? fmtDate(selectedDate) : 'this day'}
                  </div>
                ) : (
                  <>
                    {stops.map((s, i) => {
                      const st = s.delivery_status || 'PENDING';
                      const isLocked = lockedStopIds.includes(s.id);
                      const distInfo = distances[s.id] || {};
                      const hasGeotag = Boolean(parseLatLng(s.google_location));

                      return (
                        <div
                          key={s.id}
                          className={`p-2.5 rounded-xl border bg-white flex items-center gap-2 transition-all ${selectedIds.includes(s.id)
                              ? 'border-blue-400 ring-2 ring-blue-100'
                              : isLocked
                                ? 'border-indigo-200 bg-indigo-50/20'
                                : 'border-slate-200'
                            }`}
                        >
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSelect(s.id)}
                            disabled={st === 'DELIVERED'}
                            className="shrink-0 text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                            title="Select for transfer"
                          >
                            {selectedIds.includes(s.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                          </button>

                          {/* Stop Number Badge */}
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${st === 'DELIVERED'
                                ? 'bg-emerald-600 text-white'
                                : i === 0
                                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                                  : 'bg-slate-800 text-white'
                              }`}
                            title={i === 0 ? 'Stop #1: Nearest to Depot' : `Stop #${i + 1}`}
                          >
                            {st === 'DELIVERED' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                          </span>

                          {/* Stop Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900 truncate uppercase">
                                {(s.institution_name || '').toUpperCase()}
                              </span>
                              {/* Warehouse Distance Badge */}
                              {hasGeotag && distInfo.distanceKm > 0 ? (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-slate-100 text-slate-700 border border-slate-300"
                                  title={`Road distance from warehouse (${warehouse.name})`}
                                >
                                  📍 {distInfo.distanceKm} km • {distInfo.durationMin} min
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setGeotagModal({ open: true, stop: s, inputVal: '', resolving: false, error: '' })}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 cursor-pointer"
                                  title="Click to set GPS Geotag"
                                >
                                  ⚠️ Pending Geotag
                                </button>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-1.5 mt-0.5">
                              {s.unit_code && <span className="font-bold text-indigo-700">{s.unit_code}</span>}
                              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />PIN {s.pin_code}</span>
                              {s.demand_time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.demand_time}</span>}

                              {/* Leg & ETA info if available */}
                              {s.eta && (
                                <span className="text-slate-700 font-bold bg-blue-50 px-1 rounded border border-blue-200">
                                  ETA: {s.eta}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-black ${STATUS_STYLE[st] || STATUS_STYLE.PENDING}`}>
                                {st.replace(/_/g, ' ')}
                              </span>

                              {/* Odd time flag */}
                              {s.is_odd_time && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1 rounded">
                                  ⚠️ Check Delivery Time
                                </span>
                              )}

                              {/* Late warning */}
                              {s.is_late && (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-1 rounded">
                                  ⚠️ Late vs Demand Time
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lock / Pin Button */}
                          <button
                            type="button"
                            onClick={() => toggleLock(s.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isLocked
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-600 border-slate-200'
                              }`}
                            title={isLocked ? 'Stop is LOCKED (Auto-Plan will not move it)' : 'Click to LOCK this stop'}
                          >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Transfer Button */}
                          <button
                            type="button"
                            onClick={() => setTransferModal({ open: true, ids: [s.id] })}
                            disabled={st === 'DELIVERED'}
                            className="shrink-0 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                            title="Switch to another car / Porter / Self Delivery"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Right Column: Packets & Up/Down Arrows */}
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
                                title="Navigate in Google Maps"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => moveStop(stops, i, 'UP')}
                                disabled={i === 0 || savingId === s.id}
                                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Deliver earlier"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveStop(stops, i, 'DOWN')}
                                disabled={i === stops.length - 1 || savingId === s.id}
                                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Deliver later"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Final Non-Deliverable Row: "Return to Warehouse" */}
                    {tour.returnLeg && (
                      <div className="p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-between text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                            🏁
                          </span>
                          <div>
                            <div className="font-black text-slate-900">Return to Warehouse</div>
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
                              {tour.returnLeg.address}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900">
                            ETA: {tour.returnLeg.returnTime}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {tour.returnLeg.distanceKm} km return leg
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Multi-Select Transfer Bar */}
      {selectedIds.length > 0 && !transferModal.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]">
          <span className="text-xs font-black">
            {selectedIds.length} selected ({demands.filter(d => selectedIds.includes(d.id)).reduce((s, d) => s + (Number(d.total_quantity) || 0), 0)} Pkts)
          </span>
          <button
            type="button"
            onClick={() => setTransferModal({ open: true, ids: selectedIds })}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Transfer Destination Modal */}
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
                <button type="button" onClick={() => setTransferModal({ open: false, ids: [] })} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
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
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all disabled:opacity-50 cursor-pointer"
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

      {/* Auto Plan Preview Modal */}
      {autoPlanModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Auto Plan Assignment Preview
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Review planned car clusters, balanced packet counts, and route distances before applying.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoPlanModal(prev => ({ ...prev, open: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options Toggle Bar inside Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoPlanModal.respectLocks}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoPlanModal(prev => ({ ...prev, respectLocks: val }));
                  }}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <span>Respect manually locked stops</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoPlanModal.schoolTimeAware}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoPlanModal(prev => ({ ...prev, schoolTimeAware: val }));
                  }}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <span>Prioritize School Timings</span>
              </label>

              <button
                type="button"
                onClick={handleTriggerAutoPlan}
                disabled={autoPlanModal.loading}
                className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${autoPlanModal.loading ? 'animate-spin' : ''}`} />
                <span>Recalculate Plan</span>
              </button>
            </div>

            {autoPlanModal.loading ? (
              <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
                <RotateCcw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Computing geographical clusters & road routes...</span>
              </div>
            ) : autoPlanModal.plan ? (
              <div className="space-y-4">
                {/* Summary Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-indigo-600 block">Total Cars</span>
                    <span className="text-base font-black text-indigo-950">{autoPlanModal.plan.summary.totalCars}</span>
                  </div>
                  <div className="bg-cyan-50 border border-cyan-200 p-2.5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-cyan-600 block">Total Stops</span>
                    <span className="text-base font-black text-cyan-950">{autoPlanModal.plan.summary.totalStops}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-emerald-600 block">Total Packets</span>
                    <span className="text-base font-black text-emerald-950">{autoPlanModal.plan.summary.totalPackets}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-amber-700 block">Estimated Km</span>
                    <span className="text-base font-black text-amber-950">{autoPlanModal.plan.summary.totalKm} km</span>
                  </div>
                </div>

                {/* Per-Car Breakdown Cards */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Car Allocation Preview:</h4>
                  {autoPlanModal.plan.carPlans.map((cp, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 transition-all space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-black text-xs text-slate-900">
                            {cp.driver_name} - {cp.vehicle_no}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-black">
                            {cp.totalStops} Stops
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-900 font-black">
                            {cp.totalPackets} Pkts
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black">
                            {cp.totalKm} km • {Math.floor((cp.totalDurationMin || 0) / 60)}h {(cp.totalDurationMin || 0) % 60}m
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Area Coverage: <strong>{cp.areaDescription}</strong></span>
                        {cp.returnLeg && (
                          <span className="ml-auto text-slate-700">
                            Return ETA: <strong>{cp.returnLeg.returnTime}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {autoPlanModal.plan.unassignedNoGeo && autoPlanModal.plan.unassignedNoGeo.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
                    ⚠️ {autoPlanModal.plan.unassignedNoGeo.length} stops without GPS coordinates were excluded from auto-clustering.
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAutoPlanModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAutoPlan}
                disabled={autoPlanModal.loading || autoPlanModal.applying || !autoPlanModal.plan}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{autoPlanModal.applying ? 'Applying...' : 'Apply Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Settings & Geotag Map Picker Modal */}
      {warehouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-600" />
                  Warehouse Depot & Routing Settings
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Set warehouse coordinates for distance computation and return loops.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWarehouseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveWarehouseSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">Depot / Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="e.g. Manesar Sector 1, Gurgaon"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">Address Details</label>
                <input
                  type="text"
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  placeholder="Sector 1, IMT Manesar, Gurugram, Haryana"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-700 mb-1">Latitude (Lat) *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={warehouseForm.lat}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">Longitude (Lng) *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={warehouseForm.lng}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => setWarehouseForm(DEFAULT_WAREHOUSE)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  Reset to Manesar Sector 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setWarehouseForm(prev => ({
                          ...prev,
                          lat: parseFloat(pos.coords.latitude.toFixed(6)),
                          lng: parseFloat(pos.coords.longitude.toFixed(6))
                        }));
                      });
                    } else {
                      alert('Geolocation is not supported by your browser.');
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] cursor-pointer"
                >
                  📍 Use My Current Location
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${warehouseForm.lat},${warehouseForm.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> View on Maps
                </a>
              </div>

              {/* Embedded Map Preview */}
              <div className="rounded-xl overflow-hidden border border-slate-300 h-44 bg-slate-100 relative">
                <iframe
                  title="Warehouse Geotag Preview"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${warehouseForm.lng - 0.01}%2C${warehouseForm.lat - 0.01}%2C${warehouseForm.lng + 0.01}%2C${warehouseForm.lat + 0.01}&layer=mapnik&marker=${warehouseForm.lat}%2C${warehouseForm.lng}`}
                  style={{ border: 0 }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWarehouse}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingWarehouse ? 'Saving...' : 'Save Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Geotag Quick Fix Modal */}
      {geotagModal.open && geotagModal.stop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Set GPS Geotag
                </h3>
                <p className="text-[11px] text-slate-500 font-bold truncate max-w-[240px] mt-0.5">
                  {geotagModal.stop.institution_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeotagModal({ open: false, stop: null, inputVal: '', resolving: false, error: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-black text-slate-700">
                Enter Lat, Lng or Google Maps Link:
              </label>
              <input
                type="text"
                value={geotagModal.inputVal}
                onChange={(e) => setGeotagModal(prev => ({ ...prev, inputVal: e.target.value, error: '' }))}
                placeholder="e.g. 28.561285, 77.141532 or maps.app.goo.gl/..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400">
                You can paste a WhatsApp Google location pin or raw decimal coordinates.
              </p>
              {geotagModal.error && (
                <p className="text-[11px] text-rose-600 font-bold">{geotagModal.error}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGeotagModal({ open: false, stop: null, inputVal: '', resolving: false, error: '' })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resolveAndSaveGeotag}
                disabled={geotagModal.resolving || !geotagModal.inputVal.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer shadow-xs disabled:opacity-50"
              >
                {geotagModal.resolving ? 'Resolving...' : 'Save Geotag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
