import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Truck, CheckCircle2, Calendar, Upload, FileText, FileCheck,
  PackageCheck, IndianRupee, MapPin, RefreshCw,
  School, Package, Users, ChevronDown, ChevronUp,
  ClipboardCheck, AlertCircle, X, Eye, Building2, Layers, Filter,
  Sparkles, AlertTriangle, Search, History
} from 'lucide-react';
import { useSSE } from '../context/SSEContext';

function StatusBadge({ status }) {
  const map = {
    APPROVED: 'bg-amber-100 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-200',
    FULFILLED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status === 'APPROVED' ? <><AlertCircle className="w-3 h-3" /> Awaiting Action</> : 
       status === 'ACCEPTED' ? <><Truck className="w-3 h-3" /> Preparing</> : 
       <><CheckCircle2 className="w-3 h-3" /> Delivered</>}
    </span>
  );
}

function DemandCard({ dem, onPrepare, onSendToFleet, loadingId }) {
  const [expanded, setExpanded] = React.useState(false);

  const cardBorderCls = dem.status === 'ACCEPTED'
    ? 'border-2 border-amber-200 hover:border-amber-300 shadow-sm'
    : dem.status === 'PREPARING'
      ? 'border-2 border-blue-200 hover:border-blue-300 shadow-sm'
      : 'border-2 border-emerald-200 hover:border-emerald-300 shadow-sm';

  const accentLineCls = dem.status === 'ACCEPTED'
    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
    : dem.status === 'PREPARING'
      ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
      : 'bg-gradient-to-r from-emerald-400 to-teal-500';

  return (
    <div className={`bg-white rounded-2xl transition-all overflow-hidden flex flex-col justify-between ${cardBorderCls}`}>
      <div className={`h-2 w-full ${accentLineCls}`} />
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {dem.demand_number}
            </span>
            <div className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {dem.demand_date}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <StatusBadge status={dem.status} />
          </div>
        </div>

        <h4 className="font-extrabold text-sm text-slate-900 uppercase leading-snug tracking-tight mb-0.5">
          {dem.institution_name}
        </h4>
        <p className="text-xs text-slate-500 font-semibold mb-3">
          {dem.unit_name} {dem.ncc_group ? `• ${dem.ncc_group}` : ''}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl p-2.5 text-center shadow-2xs border-2 border-slate-100 bg-slate-50">
            <div className="text-[9px] uppercase tracking-wider text-slate-700 font-bold">Amount</div>
            <div className="text-xs mt-0.5 text-slate-900 font-black">₹{(dem.total_amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-xl p-2.5 text-center border-2 border-slate-100 bg-slate-50">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Quantity</div>
            <div className="text-xs font-black text-slate-800 mt-0.5">{dem.total_quantity || 0} Packets</div>
          </div>
        </div>

        {dem.purpose && (
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 line-clamp-2">
            <strong className="text-slate-800 font-bold">Purpose:</strong> {dem.purpose}
          </p>
        )}

        {dem.items && dem.items.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                {dem.items.length} Item Line{dem.items.length > 1 ? 's' : ''}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expanded && (
              <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden">
                {dem.items.map((item, idx) => (
                  <div key={item.id} className={`px-3 py-2 text-xs flex justify-between ${idx < dem.items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <span className="text-slate-700 font-medium">{item.item_name} <span className="text-slate-400">({item.year_group})</span></span>
                    <span className="font-bold text-slate-900">{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
        {dem.status === 'ACCEPTED' ? (
          <button
            onClick={() => onPrepare(dem.id)}
            disabled={loadingId === dem.id}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            {loadingId === dem.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
            Prepare
          </button>
        ) : dem.status === 'PREPARING' ? (
          <button
            onClick={() => onSendToFleet(dem.id)}
            disabled={loadingId === dem.id}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {loadingId === dem.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
            Send for Fleet Delivery
          </button>
        ) : (
          <span className="w-full py-2.5 px-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl text-center">
            Sent to Fleet
          </span>
        )}
      </div>
    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {shownList.map(dem => (
                <DemandCard
                  key={dem.id}
                  dem={dem}
                  onPrepare={handlePrepare}
                  onSendToFleet={handleSendToFleet}
                  loadingId={loadingId}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      
    </div>
  );
}
