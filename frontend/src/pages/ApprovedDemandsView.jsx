import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Truck, CheckCircle2, Calendar, Upload, FileText, FileCheck,
  PackageCheck, IndianRupee, MapPin, RefreshCw,
  School, Package, Users, ChevronDown, ChevronUp,
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

function DemandRow({ dem, onPrepare, onSendToFleet, loadingId }) {
  const [expanded, setExpanded] = React.useState(false);
  const menu = dem.unit_menu && dem.unit_menu.length > 0 ? dem.unit_menu : null;
  const lines = !menu && dem.items && dem.items.length > 0 ? dem.items : null;
  const canExpand = !!(menu || lines);

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition-colors align-middle">
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
          <td colSpan="8" className="px-5 py-3">
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

  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demands', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDemands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/units', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setUnits(data);
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
      fetchDemands();
    }
  }, [events?.DEMAND_UPDATED, fetchDemands]);

  // Extract unique NCC Groups (GP)
  const availableGroups = useMemo(() => {
    const groupsSet = new Set();
    units.forEach(u => { if (u.ncc_group) groupsSet.add(u.ncc_group); });
    demands.forEach(d => { if (d.ncc_group) groupsSet.add(d.ncc_group); });
    return Array.from(groupsSet).sort();
  }, [units, demands]);

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

  // Filter demands by Group (GP) and Unit
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (selectedGroup !== 'ALL') {
        const dGroup = d.ncc_group || units.find(u => u.id === d.unit_id)?.ncc_group;
        if (dGroup !== selectedGroup) return false;
      }
      if (selectedUnit !== 'ALL') {
        if (String(d.unit_id) !== String(selectedUnit)) return false;
      }
      return true;
    });
  }, [demands, units, selectedGroup, selectedUnit]);

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

  const preparingList = filteredDemands.filter(d => d.status === 'PREPARING');
  const acceptedList = filteredDemands.filter(d => d.status === 'ACCEPTED');
  const historyList = filteredDemands.filter(d => ['READY_FOR_DISPATCH', 'DELIVERED', 'FULFILLED'].includes(d.status));

  // Demands currently active in Supply Point
  const inSupplyPointList = filteredDemands.filter(d => d.status === 'ACCEPTED' || d.status === 'PREPARING');

  const shownList = useMemo(() => {
    if (newDemandFilter === 'ACCEPTED') return acceptedList;
    if (newDemandFilter === 'PREPARING') return preparingList;
    if (newDemandFilter === 'HISTORY') return historyList;
    return inSupplyPointList;
  }, [newDemandFilter, inSupplyPointList, acceptedList, preparingList, historyList]);

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
    return groups;
  }, [shownList]);

  // All active demands in Supply Point across all units (for sidebar badges)
  const allSupplyPointDemands = useMemo(() => {
    return demands.filter(d => d.status === 'ACCEPTED' || d.status === 'PREPARING');
  }, [demands]);

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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
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
                    {dateGroups.map(g => {
                      const badge = dateBadge(g.key);
                      const gPkts = g.items.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
                      const gAmt = g.items.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
                      return (
                        <React.Fragment key={g.key}>
                          <tr className="bg-slate-100/90">
                            <td colSpan="8" className="px-3.5 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="font-extrabold text-slate-800 text-xs">{fmtDMY(g.key)} · {weekdayOf(g.key)}</span>
                                {badge && <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badge.cls}`}>{badge.label}</span>}
                                <span className="text-[11px] font-bold text-slate-500">{g.items.length} demand{g.items.length > 1 ? 's' : ''} · {gPkts.toLocaleString('en-IN')} packets · ₹{gAmt.toLocaleString('en-IN')}</span>
                                <button
                                  onClick={() => handlePrintDate(g.key, g.items)}
                                  className="ml-auto p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs flex items-center gap-1.5"
                                  title="Print demands for this date"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Print List</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {g.items.map(dem => (
                            <DemandRow
                              key={dem.id}
                              dem={dem}
                              onPrepare={handlePrepare}
                              onSendToFleet={handleSendToFleet}
                              loadingId={loadingId}
                            />
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      
    </div>
  );
}
