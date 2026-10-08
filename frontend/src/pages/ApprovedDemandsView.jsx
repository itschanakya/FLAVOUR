import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Truck, CheckCircle2, Calendar, Upload, FileText, FileCheck,
  PackageCheck, IndianRupee, MapPin, RefreshCw,
  School, Package, Users, ChevronDown, ChevronUp, ChevronRight,
  ClipboardCheck, AlertCircle, X, Eye, Building2, Layers, Filter,
  Sparkles, AlertTriangle, Search, History, Printer
} from 'lucide-react';
import { useSSE } from '../context/SSEContext';

function StatusBadge({ status, deliveryStatus, demand }) {
  const dStatus = deliveryStatus || demand?.delivery_status;
  const mainStatus = status || demand?.status;

  if (dStatus === 'DELIVERED' || mainStatus === 'DELIVERED' || mainStatus === 'FULFILLED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered & Verified
      </span>
    );
  }
  if (dStatus === 'REJECTED' || mainStatus === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" /> Rejected
      </span>
    );
  }
  if (dStatus === 'ARRIVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 animate-bounce">
        <MapPin className="w-3 h-3 text-purple-600" /> At Gate
      </span>
    );
  }
  if (dStatus === 'OUT_FOR_DELIVERY' || mainStatus === 'OUT_FOR_DELIVERY') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
        <Truck className="w-3 h-3 text-blue-600" /> In Transit
      </span>
    );
  }
  if (mainStatus === 'READY_FOR_DISPATCH') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Package className="w-3 h-3 text-amber-600" /> Ready for Dispatch
      </span>
    );
  }
  if (mainStatus === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
        <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
      <AlertCircle className="w-3 h-3 text-amber-600" /> {mainStatus}
    </span>
  );
}

const fmtDMY = (d) => {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (d || '');
};

const dayNum = (key) => {
  const m = String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN;
};

const weekdayOf = (key) => {
  const n = dayNum(key);
  return isNaN(n) ? '' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(n * 86400000).getUTCDay()];
};

const dateBadge = (key) => {
  const t = new Date();
  const todayKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  const diff = dayNum(key) - dayNum(todayKey);
  if (isNaN(diff)) return null;
  if (diff < 0) return { label: `Overdue ${-diff}d`, cls: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (diff === 0) return { label: 'Today', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (diff === 1) return { label: 'Tomorrow', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { label: `In ${diff}d`, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
};

function DemandRow({ dem, onPrepare, onSendToFleet, loadingId, isSelected, onToggle, eligibleForBulk }) {
  const [expanded, setExpanded] = React.useState(false);
  const menu = dem.unit_menu && dem.unit_menu.length > 0 ? dem.unit_menu : null;
  const lines = !menu && dem.items && dem.items.length > 0 ? dem.items : null;
  const canExpand = !!(menu || lines);

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition-colors align-middle">
        <td className="p-3.5 text-center">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-30"
            checked={isSelected}
            onChange={() => onToggle(dem.id)}
            disabled={!eligibleForBulk}
            title={eligibleForBulk ? "Select demand" : "Only ACCEPTED or PREPARING demands can be selected"}
          />
        </td>
        <td className="p-3.5 whitespace-nowrap">
          <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            {dem.demand_number}
          </span>
        </td>
        <td className="p-3.5 font-extrabold text-slate-900 uppercase text-xs min-w-[180px]">{dem.institution_name}</td>
        <td className="p-3.5 text-slate-600 font-semibold text-xs">
          {dem.unit_name}{dem.ncc_group ? ` • ${dem.ncc_group}` : ''}
        </td>
        <td className="p-3.5 text-slate-600 text-xs max-w-[260px]">
          <div className="line-clamp-2" title={dem.purpose}>{dem.purpose || '—'}</div>
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Layers className="w-3 h-3" />
              {menu ? `Packing Menu (${menu.length})` : `${lines.length} Item Line${lines.length > 1 ? 's' : ''}`}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </td>
        <td className="p-3.5 text-right font-black text-slate-800 whitespace-nowrap">{(dem.total_quantity || 0).toLocaleString('en-IN')}</td>
        <td className="p-3.5 text-right font-black text-emerald-700 whitespace-nowrap">₹{(dem.total_amount || 0).toLocaleString('en-IN')}</td>
        <td className="p-3.5 whitespace-nowrap">
          <StatusBadge status={dem.status} deliveryStatus={dem.delivery_status} demand={dem} />
          {menu && (dem.stock_charged_off ? (
            <div className="text-[10px] font-bold text-emerald-600 mt-1">Stock charged off ✓</div>
          ) : (
            <div className="text-[10px] font-bold text-amber-700 mt-1">Charge-off on prepare</div>
          ))}
        </td>
        <td className="p-3.5 text-right whitespace-nowrap">
          {dem.status === 'ACCEPTED' ? (
            <button
              onClick={() => onPrepare(dem.id)}
              disabled={loadingId === dem.id}
              className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {loadingId === dem.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
              Prepare &amp; Charge-Off
            </button>
          ) : dem.status === 'PREPARING' ? (
            <button
              onClick={() => onSendToFleet(dem.id)}
              disabled={loadingId === dem.id}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {loadingId === dem.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              Send to Fleet
            </button>
          ) : (
            <span className="py-2 px-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl inline-block">Sent to Fleet</span>
          )}
        </td>
      </tr>
      {expanded && canExpand && (
        <tr className="bg-indigo-50/40">
          <td colSpan="9" className="px-5 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
              {menu ? menu.map((m, idx) => (
                <div key={m.item_id || idx} className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{m.item_name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({m.qty_per_packet} / pkt)</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Stock: {m.current_stock ?? '—'}</span>
                    <span className="font-black text-indigo-700">{m.total_needed} {m.unit_of_measure || 'units'}</span>
                  </div>
                </div>
              )) : lines.map((item, idx) => (
                <div key={item.id || idx} className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-700 font-medium">{item.item_name} <span className="text-slate-400">({item.year_group})</span></span>
                  <span className="font-bold text-slate-900">{item.quantity}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ApprovedDemandsView() {
  const { token } = useAuth();
  const { events } = useSSE();
  const [demands, setDemands] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
    const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [newDemandFilter, setNewDemandFilter] = useState('ALL'); // 'ALL' | 'ACCEPTED' | 'APPROVED'
  const [unitSearch, setUnitSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, WEEKLY, MONTHLY, ANNUALLY

  // Bulk Actions State
  const [selectedDemandIds, setSelectedDemandIds] = useState(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  
  const [expandedDates, setExpandedDates] = useState({});

  const fetchDemands = useCallback(async (silent = false) => {
    if (!silent) {
       const cached = sessionStorage.getItem('approved_demands_cache');
       if (cached) {
         setDemands(JSON.parse(cached));
       } else {
         setLoading(true);
       }
    }
    try {
      const res = await fetch('/api/demands', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('approved_demands_cache', JSON.stringify(data));
        setDemands(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  const fetchUnits = useCallback(async () => {
    const cached = sessionStorage.getItem('approved_units_cache');
    if (cached) setUnits(JSON.parse(cached));
    
    try {
      const res = await fetch('/api/units', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        sessionStorage.setItem('approved_units_cache', JSON.stringify(data));
        setUnits(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchDemands();
    fetchUnits();
  }, [fetchDemands, fetchUnits]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchDemands(true);
    }
  }, [events?.DEMAND_UPDATED, fetchDemands]);

  // Extract unique NCC Groups (GP)
  const availableGroups = useMemo(() => {
    const groupsSet = new Set();
    units.forEach(u => { if (u.ncc_group) groupsSet.add(u.ncc_group); });
    demands.forEach(d => { if (d.ncc_group) groupsSet.add(d.ncc_group); });
    return Array.from(groupsSet).sort();
  }, [units, demands]);

  const passesTimeFilter = useCallback((d, filter) => {
    if (filter === 'ALL') return true;
    if (!d.demand_date) return true;
    const dDate = new Date(d.demand_date);
    if (isNaN(dDate.getTime())) return true;
    
    const now = new Date();
    
    if (filter === 'WEEKLY') {
      // Current week (Sunday to Saturday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return dDate >= startOfWeek && dDate <= endOfWeek;
    } 
    if (filter === 'MONTHLY') {
      // Current month
      return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    }
    if (filter === 'ANNUALLY') {
      // Current year
      return dDate.getFullYear() === now.getFullYear();
    }
    return true;
  }, []);

  // Units filtered by selectedGroup
  const filteredUnitsList = useMemo(() => {
    if (selectedGroup === 'ALL') return units;
    return units.filter(u => u.ncc_group === selectedGroup);
  }, [units, selectedGroup]);

  const handleGroupChange = (newGroup) => {
    setSelectedGroup(newGroup);
    if (newGroup !== 'ALL' && selectedUnit !== 'ALL') {
      const u = units.find(unit => String(unit.id) === String(selectedUnit));
      if (u && u.ncc_group !== newGroup) {
        setSelectedUnit('ALL');
      }
    }
  };

  // Filter demands by Group (GP) and Unit and Time
  const isActiveDate = (dDate) => {
    if (!dDate) return false;
    const dStr = String(dDate).split('T')[0].split(' ')[0];
    const today = new Date().toISOString().split('T')[0];
    const diff = Math.floor(new Date(dStr).getTime()/86400000) - Math.floor(new Date(today).getTime()/86400000);
    return diff === 0 || diff === 1;
  };

  const baseFilteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (selectedGroup !== 'ALL') {
        const dGroup = d.ncc_group || units.find(u => u.id === d.unit_id)?.ncc_group;
        if (dGroup !== selectedGroup) return false;
      }
      if (selectedUnit !== 'ALL') {
        if (String(d.unit_id) !== String(selectedUnit)) return false;
      }
      if (!passesTimeFilter(d, timeFilter)) return false;
      
      return true;
    });
  }, [demands, units, selectedGroup, selectedUnit, timeFilter, passesTimeFilter]);

  const activeFilteredDemands = useMemo(() => baseFilteredDemands.filter(d => isActiveDate(d.demand_date)), [baseFilteredDemands]);

  const preparingList = activeFilteredDemands.filter(d => d.status === 'PREPARING');
  const acceptedList = activeFilteredDemands.filter(d => d.status === 'ACCEPTED');
  const historyList = baseFilteredDemands.filter(d => ['READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED'].includes(d.status));

  // Demands currently active in Supply Point
  const inSupplyPointList = activeFilteredDemands.filter(d => d.status === 'ACCEPTED' || d.status === 'PREPARING');

  const shownList = useMemo(() => {
    if (newDemandFilter === 'ACCEPTED') return acceptedList;
    if (newDemandFilter === 'PREPARING') return preparingList;
    if (newDemandFilter === 'HISTORY') return historyList;
    return inSupplyPointList;
  }, [newDemandFilter, inSupplyPointList, acceptedList, preparingList, historyList]);

  const filteredDemands = shownList;

  const eligibleForBulk = (d) => d.status === 'ACCEPTED' || d.status === 'PREPARING';
  
  const toggleSelection = (demandId) => {
    const next = new Set(selectedDemandIds);
    if (next.has(demandId)) {
      next.delete(demandId);
    } else {
      next.add(demandId);
    }
    setSelectedDemandIds(next);
  };

  const toggleSelectAll = () => {
    const activeGroupKey = Object.keys(groupedDemands).find(k => k.startsWith(timeFilter + '-' + selectedGroup + '-' + selectedUnit));
    // Actually, we just need to get the flat list of displayed demands to select them
    // To make it simple, we just select from filteredDemands
    const eligibleDemands = filteredDemands.filter(eligibleForBulk);
    if (eligibleDemands.length === 0) return;
    
    const allSelected = eligibleDemands.every(d => selectedDemandIds.has(d.id));
    const next = new Set(selectedDemandIds);
    if (allSelected) {
      eligibleDemands.forEach(d => next.delete(d.id));
    } else {
      eligibleDemands.forEach(d => next.add(d.id));
    }
    setSelectedDemandIds(next);
  };

  const handleBulkPrepare = async () => {
    // Only process 'ACCEPTED' selected demands
    const prepareIds = Array.from(selectedDemandIds).filter(id => demands.find(d => d.id === id)?.status === 'ACCEPTED');
    if (prepareIds.length === 0) return;
    
    if (!window.confirm(`Prepare & Charge-off ${prepareIds.length} demands?`)) return;
    
    setIsBulkLoading(true);
    try {
      const promises = prepareIds.map(id =>
        fetch(`/api/demands/${id}/prepare`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json().then(data => { if (!res.ok) throw new Error(data.error); return data; }))
      );
      await Promise.all(promises);
      fetchDemands();
      // Keep other selections, just remove the prepared ones so they don't get selected again if we refresh state
      const next = new Set(selectedDemandIds);
      prepareIds.forEach(id => next.delete(id));
      setSelectedDemandIds(next);
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(`Bulk prepare failed: ${err.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkSendToFleet = async () => {
    // Only process 'PREPARING' selected demands
    const sendIds = Array.from(selectedDemandIds).filter(id => demands.find(d => d.id === id)?.status === 'PREPARING');
    if (sendIds.length === 0) return;
    
    if (!window.confirm(`Send ${sendIds.length} demands to Fleet?`)) return;
    
    setIsBulkLoading(true);
    try {
      const promises = sendIds.map(id =>
        fetch(`/api/demands/${id}/ready-for-dispatch`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json().then(data => { if (!res.ok) throw new Error(data.error); return data; }))
      );
      await Promise.all(promises);
      fetchDemands();
      const next = new Set(selectedDemandIds);
      sendIds.forEach(id => next.delete(id));
      setSelectedDemandIds(next);
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(`Bulk send to fleet failed: ${err.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handlePrepare = async (demandId) => {
    setLoadingId(demandId);
    try {
      const res = await fetch(`/api/demands/${demandId}/prepare`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDemands();
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSendToFleet = async (demandId) => {
    setLoadingId(demandId);
    try {
      const res = await fetch(`/api/demands/${demandId}/ready-for-dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDemands();
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };



  // Date-wise grouping: nearest date first
  const dateKeyOf = (d) => String(d.demand_date || '').split('T')[0].split(' ')[0];
  const dateGroups = useMemo(() => {
    const sorted = [...shownList].sort((a, b) => {
      const ka = dateKeyOf(a), kb = dateKeyOf(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      return String(a.demand_number || '').localeCompare(String(b.demand_number || ''));
    });
    const groups = [];
    sorted.forEach(d => {
      const k = dateKeyOf(d);
      const last = groups[groups.length - 1];
      if (last && last.key === k) last.items.push(d);
      else groups.push({ key: k, items: [d] });
    });

    const todayStr = new Date().toISOString().split('T')[0];
    groups.sort((ga, gb) => {
      const isPastA = ga.key < todayStr;
      const isPastB = gb.key < todayStr;

      if (isPastA && !isPastB) return 1;
      if (!isPastA && isPastB) return -1;
      
      if (isPastA && isPastB) {
        return gb.key.localeCompare(ga.key);
      }
      
      return ga.key.localeCompare(gb.key);
    });

    return groups;
  }, [shownList]);
  
  const [visibleLimit, setVisibleLimit] = useState(5);
  const visibleDateGroups = dateGroups.slice(0, visibleLimit);

  const initializedDatesRef = useRef(new Set());

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setExpandedDates(prev => {
      let changed = false;
      const next = { ...prev };
      dateGroups.forEach(g => {
        if (!initializedDatesRef.current.has(g.key)) {
          next[g.key] = g.key >= todayStr;
          initializedDatesRef.current.add(g.key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [dateGroups]);

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // All active demands in Supply Point across all units (for sidebar badges)
  const allSupplyPointDemands = useMemo(() => {
    return demands.filter(d => {
      if (d.status !== 'ACCEPTED' && d.status !== 'PREPARING') return false;
      if (!passesTimeFilter(d, timeFilter)) return false;
      return true;
    });
  }, [demands, timeFilter, passesTimeFilter]);

  // Precompute demand counts per unit in Supply Point
  const unitStatsMap = useMemo(() => {
    const stats = {};
    allSupplyPointDemands.forEach(d => {
      const uid = String(d.unit_id);
      if (!stats[uid]) stats[uid] = { total: 0, preparing: 0, accepted: 0, packets: 0 };
      stats[uid].total += 1;
      stats[uid].packets += (Number(d.total_quantity) || 0);
      if (d.status === 'PREPARING') stats[uid].preparing = (stats[uid].preparing || 0) + 1;
      if (d.status === 'ACCEPTED') stats[uid].accepted += 1;
    });
    return stats;
  }, [allSupplyPointDemands]);

  const displayedUnitsList = useMemo(() => {
    let list = filteredUnitsList;
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      list = list.filter(u => 
        (u.unit_code || '').toLowerCase().includes(q) || 
        (u.unit_name || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const countA = unitStatsMap[String(a.id)]?.total || 0;
      const countB = unitStatsMap[String(b.id)]?.total || 0;
      if (countB !== countA) return countB - countA;
      return (a.unit_code || a.unit_name || '').localeCompare(b.unit_code || b.unit_name || '');
    });
  }, [filteredUnitsList, unitSearch, unitStatsMap]);

  const activeUnitObj = useMemo(() => {
    if (selectedUnit === 'ALL') return null;
    return units.find(u => String(u.id) === String(selectedUnit));
  }, [units, selectedUnit]);

  const handlePrintDate = (dateKey, items) => {
    const printWindow = window.open('', '_blank');
    const totalPackets = items.reduce((s, d) => s + (Number(d.total_quantity || d.quantity || d.total_packets || 0)), 0);
    const dateFormatted = fmtDMY(dateKey);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - Demands for ${dateFormatted}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; -webkit-print-color-adjust: exact; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; margin-top: 5px; }
            @media print {
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Refreshment Demands</h1>
              <div class="subtitle">Date: <strong>${dateFormatted}</strong></div>
            </div>
            <div style="text-align: right; font-size: 14px;">
              Total Demands: <strong>${items.length}</strong><br/>
              Total Packets: <strong>${totalPackets.toLocaleString('en-IN')}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No.</th>
                <th style="width: 15%">Date</th>
                <th style="width: 15%">Demand No</th>
                <th style="width: 35%">Institute</th>
                <th style="width: 20%">NCC Unit</th>
                <th style="width: 10%">No Packets</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((dem, index) => {
                const institute = dem.demand_type === 'UNIT_DIRECT' ? (dem.unit_code || dem.unit_name || '—') : (dem.institution_name || '—');
                const packets = Number(dem.total_quantity || dem.quantity || dem.total_packets || 0).toLocaleString('en-IN');
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${dateFormatted}</td>
                    <td>${dem.demand_number || '—'}</td>
                    <td>${institute}</td>
                    <td>${dem.unit_name || '—'}</td>
                    <td>${packets}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="w-full space-y-5">

      {/* Unified Single Top Bar: Header, Filter Slicers & Pipeline Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                Supply Point
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black shadow-2xs">
                {inSupplyPointList.length} In Supply Point
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Demands accepted from Admin for depot preparation & dispatch to Fleet Delivery
            </p>
          </div>
        </div>

        {/* Center: Slicer Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setNewDemandFilter('ALL')}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-2 ${
              newDemandFilter === 'ALL'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Active in Supply Point</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              newDemandFilter === 'ALL' ? 'bg-black/20 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {inSupplyPointList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNewDemandFilter('ACCEPTED')}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-2 ${
              newDemandFilter === 'ACCEPTED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted (Pending Prep)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              newDemandFilter === 'ACCEPTED' ? 'bg-black/20 text-white' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {acceptedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNewDemandFilter('PREPARING')}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-2 ${
              newDemandFilter === 'PREPARING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Preparing</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              newDemandFilter === 'PREPARING' ? 'bg-black/20 text-white' : 'bg-blue-100 text-blue-900'
            }`}>
              {preparingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNewDemandFilter('HISTORY')}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-2 ${
              newDemandFilter === 'HISTORY'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History (Dispatched)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              newDemandFilter === 'HISTORY' ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Right: Quick Pipeline Navigation Links */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/delivery"
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Go to Fleet Delivery (Driver Route Manifest)"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet Delivery ↗</span>
          </Link>

          <Link
            to="/documentation"
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Go to dedicated Documentation Portal (Receipts, Bills, Proof)"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Documentation Portal ↗</span>
          </Link>
        </div>
      </div>

      {/* New Filter Bar for Time Slicer & NCC Unit Dropdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Time Slicer */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar gap-1 shrink-0">
          {[
            { val: 'ALL', label: 'All Time' },
            { val: 'WEEKLY', label: 'Weekly' },
            { val: 'MONTHLY', label: 'Monthly' },
            { val: 'ANNUALLY', label: 'Annually' }
          ].map(tf => (
            <button
              key={tf.val}
              type="button"
              onClick={() => setTimeFilter(tf.val)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                timeFilter === tf.val 
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* NCC Unit Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500">NCC Unit:</span>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full md:w-64 truncate"
          >
            <option value="ALL">All Units</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.unit_code ? `[${u.unit_code}] ` : ''}{u.unit_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-Column Layout: Left Sidebar (Units List) + Right Content (Demands) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT SIDEBAR: UNITS LIST */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3 sticky top-4">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  NCC Units
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {units.length} Registered Units
                </p>
              </div>
            </div>
            <button 
              onClick={() => { fetchDemands(); fetchUnits(); }}
              title="Refresh demands and units"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Optional Group (GP) Filter inside Sidebar */}
          {availableGroups.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 px-2.5 py-1.5 rounded-xl text-xs">
              <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold text-slate-400 text-[10px]">GP:</span>
              <select
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer w-full truncate"
              >
                <option value="ALL">All Groups ({availableGroups.length})</option>
                {availableGroups.map(gp => (
                  <option key={gp} value={gp}>{gp}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box in Sidebar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search unit code or name..."
              value={unitSearch}
              onChange={e => setUnitSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {unitSearch && (
              <button
                type="button"
                onClick={() => setUnitSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Units Navigation List */}
          <div className="space-y-1 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {/* All Units Option */}
            <button
              type="button"
              onClick={() => setSelectedUnit('ALL')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between border ${
                selectedUnit === 'ALL'
                  ? 'bg-slate-900 text-white font-black border-slate-900 shadow-xs'
                  : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-bold border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">All Units</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                selectedUnit === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {allSupplyPointDemands.length} Active
              </span>
            </button>

            {/* Individual Units */}
            {displayedUnitsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                No units match "{unitSearch}"
              </div>
            ) : (
              displayedUnitsList.map(u => {
                const isSelected = String(selectedUnit) === String(u.id);
                const stats = unitStatsMap[String(u.id)];
                const hasDemands = stats && stats.total > 0;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnit(isSelected ? 'ALL' : String(u.id))}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex flex-col gap-0.5 border ${
                      isSelected
                        ? 'bg-blue-600 text-white font-black border-blue-600 shadow-xs'
                        : hasDemands
                          ? 'bg-blue-50/40 hover:bg-blue-50/80 text-slate-800 font-bold border-blue-200/80'
                          : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {u.unit_code || u.unit_name}
                      </span>
                      {hasDemands ? (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                          isSelected 
                            ? 'bg-white/25 text-white' 
                            : 'bg-emerald-500 text-white shadow-2xs'
                        }`}>
                          {stats.total} {stats.total === 1 ? 'Demand' : 'Demands'}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          0
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] truncate flex items-center justify-between ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      <span className="truncate">{u.unit_name}</span>
                      {u.ncc_group && (
                        <span className="shrink-0 ml-1 font-mono text-[9px] opacity-80">
                          {u.ncc_group}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: DEMAND CARDS & CONTENT */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Active Unit Filter indicator */}
          {selectedUnit !== 'ALL' && activeUnitObj && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 font-medium">Filtering by Unit: </span>
                  <strong className="text-blue-950 font-black">{activeUnitObj.unit_code || activeUnitObj.unit_name}</strong>
                  <span className="text-slate-500 text-[11px] ml-1.5 truncate">({activeUnitObj.unit_name})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnit('ALL')}
                className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 hover:bg-blue-100/60 text-blue-700 font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <X className="w-3 h-3" /> Clear Filter
              </button>
            </div>
          )}

          {/* Demand Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 animate-pulse h-64">
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-5 bg-slate-100 rounded w-2/3" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-14 bg-slate-100 rounded-xl" />
                    <div className="h-14 bg-slate-100 rounded-xl" />
                    <div className="h-14 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : shownList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 p-6 shadow-xs">
              <PackageCheck className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-900 mb-1">
                No Demands in Supply Point
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                {selectedUnit !== 'ALL' 
                  ? `There are currently no active demands in Supply Point for ${activeUnitObj?.unit_code || 'the selected unit'}.`
                  : 'Accepted demands from Admin will appear here ready for warehouse packet preparation and dispatch.'}
              </p>
              {(newDemandFilter !== 'ALL' || selectedGroup !== 'ALL' || selectedUnit !== 'ALL') && (
                <button
                  onClick={() => { setNewDemandFilter('ALL'); setSelectedGroup('ALL'); setSelectedUnit('ALL'); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {selectedDemandIds.size > 0 && (
                <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center justify-between">
                  <div className="text-sm font-bold text-indigo-800">
                    {selectedDemandIds.size} demand(s) selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkPrepare}
                      disabled={isBulkLoading || !Array.from(selectedDemandIds).some(id => demands.find(d => d.id === id)?.status === 'ACCEPTED')}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Prepare Selected
                    </button>
                    <button
                      onClick={handleBulkSendToFleet}
                      disabled={isBulkLoading || !Array.from(selectedDemandIds).some(id => demands.find(d => d.id === id)?.status === 'PREPARING')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Send Selected to Fleet
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 w-10 text-center"></th>
                      <th className="p-3.5">Demand Ref</th>
                      <th className="p-3.5">Institution</th>
                      <th className="p-3.5">NCC Unit</th>
                      <th className="p-3.5">Purpose</th>
                      <th className="p-3.5 text-right">Packets</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleDateGroups.map(g => {
                      const badge = dateBadge(g.key);
                      const gPkts = g.items.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
                      const gAmt = g.items.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
                      return (
                        <React.Fragment key={g.key}>
                          <tr className="bg-slate-100/90 cursor-pointer" onClick={() => toggleDate(g.key)}>
                            <td colSpan="9" className="px-3.5 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <input 
                                  type="checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => {
                                    const eligible = g.items.filter(eligibleForBulk);
                                    if (!eligible.length) return;
                                    const allSel = eligible.every(d => selectedDemandIds.has(d.id));
                                    const next = new Set(selectedDemandIds);
                                    eligible.forEach(d => allSel ? next.delete(d.id) : next.add(d.id));
                                    setSelectedDemandIds(next);
                                  }}
                                  checked={g.items.filter(eligibleForBulk).length > 0 && g.items.filter(eligibleForBulk).every(d => selectedDemandIds.has(d.id))}
                                  disabled={g.items.filter(eligibleForBulk).length === 0}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                  title="Select all eligible demands in this date"
                                />
                                {expandedDates[g.key] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="font-extrabold text-slate-800 text-xs">{fmtDMY(g.key)} · {weekdayOf(g.key)}</span>
                                {badge && <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badge.cls}`}>{badge.label}</span>}
                                <span className="text-[11px] font-bold text-slate-500">{g.items.length} demand{g.items.length > 1 ? 's' : ''} · {gPkts.toLocaleString('en-IN')} packets · ₹{gAmt.toLocaleString('en-IN')}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePrintDate(g.key, g.items); }}
                                  className="ml-auto p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs flex items-center gap-1.5"
                                  title="Print demands for this date"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Print List</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedDates[g.key] && g.items.map(dem => (
                            <DemandRow
                              key={dem.id}
                              dem={dem}
                              onPrepare={handlePrepare}
                              onSendToFleet={handleSendToFleet}
                              loadingId={loadingId}
                              isSelected={selectedDemandIds.has(dem.id)}
                              onToggle={toggleSelection}
                              eligibleForBulk={eligibleForBulk(dem)}
                            />
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {visibleLimit < dateGroups.length && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center">
                    <button
                      onClick={() => setVisibleLimit(v => v + 5)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    >
                      Load More Dates ({dateGroups.length - visibleLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      
    </div>
  );
}
