import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import TricolorSpinner from '../components/TricolorSpinner';
import { 
  Building2, 
  IndianRupee, 
  ArrowUpRight, 
  CheckCircle2, 
  Search, 
  MapPin, 
  School, 
  PlusCircle, 
  X,
  Filter,
  Package,
  Navigation,
  ClipboardList,
  Clock,
  Layers,
  ShoppingBag,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const formatDMY = (dateStr) => {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string') {
    const cleanDate = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
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

export default function AdminDemandsPage() {
  const { token } = useAuth();
  const { events } = useSSE();
  const [summary, setSummary] = useState(null);
  const [demands, setDemands] = useState([]);
  const [onboardUnits, setOnboardUnits] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  
  // Filter States
  const [selectedUnitId, setSelectedUnitId] = useState('ALL');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('ALL');
  const [unitSearch, setUnitSearch] = useState('');
  const [demandSearch, setDemandSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING, ACCEPTED, REJECTED, ALL
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, TODAY, WEEKLY, MONTHLY
  const [dateFilter, setDateFilter] = useState(null); // 'YYYY-MM-DD' or null
  const [sortAsc, setSortAsc] = useState(true); // nearest date first
  const [collapsedDates, setCollapsedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Bulk Actions State
  const [selectedDemandIds, setSelectedDemandIds] = useState(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  useEffect(() => {
    fetchDemandsData();
  }, []);

  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchDemandsData();
    }
  }, [events?.DEMAND_UPDATED]);

  const fetchDemandsData = async () => {
    try {
      // 1. Fetch summary stats
      const sumRes = await fetch('/api/reports/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sumData = await sumRes.json();
      setSummary(sumData);

      // 2. Fetch demands for supply point dispatch
      const demRes = await fetch('/api/demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const demData = await demRes.json();
      if (Array.isArray(demData)) {
        setDemands(demData.filter(d => ['APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED'].includes(d.status)));
      } else {
        setDemands([]);
      }

      // 3. Fetch all onboarded NCC units
      const unitsRes = await fetch('/api/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unitsData = await unitsRes.json();
      setOnboardUnits(Array.isArray(unitsData) ? unitsData : []);

      // 4. Fetch all institutions for institution filter
      const instRes = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const instData = await instRes.json();
      setInstitutions(Array.isArray(instData) ? instData : []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (demandId) => {
    if (!window.confirm('Accept this demand for fulfillment? It will move to Supply Point for packing and dispatch.')) return;
    try {
      const res = await fetch(`/api/demands/${demandId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDemandsData();
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (demandId) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/demands/${demandId}/admin-reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: reason || 'Rejected by Vendor/Admin.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDemandsData();
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(err.message);
    }
  };

  const resetAllFilters = () => {
    setSelectedUnitId('ALL');
    setSelectedInstitutionId('ALL');
    setStatusFilter('ALL');
    setTimeFilter('ALL');
    setDateFilter(null);
    setDemandSearch('');
    setSelectedDemandIds(new Set());
  };

  const handleBulkAccept = async () => {
    if (selectedDemandIds.size === 0) return;
    if (!window.confirm(`Accept ${selectedDemandIds.size} demands for fulfillment?`)) return;
    
    setIsBulkLoading(true);
    try {
      const promises = Array.from(selectedDemandIds).map(id =>
        fetch(`/api/demands/${id}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json().then(data => { if (!res.ok) throw new Error(data.error); return data; }))
      );
      await Promise.all(promises);
      fetchDemandsData();
      setSelectedDemandIds(new Set());
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(`Bulk accept failed: ${err.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedDemandIds.size === 0) return;
    const reason = window.prompt(`Reason for rejecting ${selectedDemandIds.size} demands:`);
    if (reason === null) return;
    
    setIsBulkLoading(true);
    try {
      const promises = Array.from(selectedDemandIds).map(id =>
        fetch(`/api/demands/${id}/admin-reject`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ reason: reason || 'Rejected by Vendor/Admin.' })
        }).then(res => res.json().then(data => { if (!res.ok) throw new Error(data.error); return data; }))
      );
      await Promise.all(promises);
      fetchDemandsData();
      setSelectedDemandIds(new Set());
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(`Bulk reject failed: ${err.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Filter institutions available based on selected Unit
  const availableInstitutions = useMemo(() => {
    let list = institutions;
    if (selectedUnitId !== 'ALL') {
      list = list.filter(inst => String(inst.unit_id) === String(selectedUnitId));
    }
    return list;
  }, [institutions, selectedUnitId]);

  // Filter units by search keyword in sidebar
  const safeUnits = Array.isArray(onboardUnits) ? onboardUnits : [];
  const filteredUnits = safeUnits.filter(u => {
    const q = unitSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.unit_name && u.unit_name.toLowerCase().includes(q)) ||
      (u.unit_code && u.unit_code.toLowerCase().includes(q)) ||
      (u.location && u.location.toLowerCase().includes(q)) ||
      (u.ncc_group && u.ncc_group.toLowerCase().includes(q))
    );
  });

  // Filter demands by unit, institution, status, time, and keyword search
  const safeDemands = Array.isArray(demands) ? demands : [];
  const baseDemands = safeDemands.filter(d => {
    // 1. Unit filter
    if (selectedUnitId !== 'ALL' && String(d.unit_id) !== String(selectedUnitId)) {
      return false;
    }

    // 2. Institution filter
    if (selectedInstitutionId !== 'ALL') {
      if (d.demand_type === 'UNIT_DIRECT') return false;
      if (String(d.institution_id) !== String(selectedInstitutionId)) return false;
    }

    // 3. Status filter (Vendor sees APPROVED as PENDING action)
    if (statusFilter === 'PENDING' && d.status !== 'APPROVED') return false;
    if (statusFilter === 'ACCEPTED' && !['ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED'].includes(d.status)) return false;
    if (statusFilter === 'REJECTED' && d.status !== 'REJECTED') return false;

    // 4. Time filter
    if (timeFilter !== 'ALL') {
      const dDate = new Date(d.demand_date);
      const now = new Date();
      if (timeFilter === 'TODAY') {
        if (dDate.toDateString() !== now.toDateString()) return false;
      } else if (timeFilter === 'WEEKLY') {
        const diffTime = Math.abs(now - dDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (timeFilter === 'MONTHLY') {
        const diffTime = Math.abs(now - dDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }
    }

    // 5. Search query
    if (demandSearch.trim()) {
      const q = demandSearch.toLowerCase().trim();
      const matchRef = d.demand_number && d.demand_number.toLowerCase().includes(q);
      const matchInst = d.institution_name && d.institution_name.toLowerCase().includes(q);
      const matchUnit = d.unit_name && d.unit_name.toLowerCase().includes(q);
      if (!matchRef && !matchInst && !matchUnit) return false;
    }

    return true;
  });

  const eligibleForBulk = (d) => d.status === 'APPROVED';

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
    const eligibleDemands = displayedDemands.filter(eligibleForBulk);
    if (eligibleDemands.length === 0) return;
    
    // If all currently displayed eligible demands are selected, unselect them
    const allSelected = eligibleDemands.every(d => selectedDemandIds.has(d.id));
    const next = new Set(selectedDemandIds);
    if (allSelected) {
      eligibleDemands.forEach(d => next.delete(d.id));
    } else {
      eligibleDemands.forEach(d => next.add(d.id));
    }
    setSelectedDemandIds(next);
  };

  // --- Date-wise priority: sort, chips and groups ---
  const dateKeyOf = (d) => String(d.demand_date || '').split('T')[0].split(' ')[0];
  const now0 = new Date();
  const todayKey = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}-${String(now0.getDate()).padStart(2, '0')}`;
  const dayNum = (key) => {
    const m = String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN;
  };
  const cmpDemand = (a, b) => {
    const ka = dateKeyOf(a), kb = dateKeyOf(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    const ta = String(a.demand_time || ''), tb = String(b.demand_time || '');
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a.demand_number || '').localeCompare(String(b.demand_number || ''));
  };

  // Date chips come from demands before the date chip filter is applied
  const dateChips = useMemo(() => {
    const map = {};
    baseDemands.forEach(d => {
      const k = dateKeyOf(d);
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).sort().map(k => ({ key: k, count: map[k] }));
  }, [baseDemands]);

  const displayedDemands = baseDemands
    .filter(d => !dateFilter || dateKeyOf(d) === dateFilter)
    .sort((a, b) => (sortAsc ? cmpDemand(a, b) : cmpDemand(b, a)));

  const dateGroups = [];
  displayedDemands.forEach(d => {
    const k = dateKeyOf(d);
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.key === k) last.items.push(d);
    else dateGroups.push({ key: k, items: [d] });
  });
  const pktsOf = (d) => Number(d.total_packets || d.total_quantity || d.quantity || 0);

  const dateBadge = (key) => {
    const diff = dayNum(key) - dayNum(todayKey);
    if (isNaN(diff)) return null;
    if (diff < 0) return { label: `Overdue ${-diff}d`, cls: 'bg-rose-100 text-rose-700 border-rose-200' };
    if (diff === 0) return { label: 'Today', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (diff === 1) return { label: 'Tomorrow', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: `In ${diff}d`, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };
  const weekdayOf = (key) => {
    const n = dayNum(key);
    return isNaN(n) ? '' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(n * 86400000).getUTCDay()];
  };
  const shortDate = (key) => {
    const m = String(key).match(/^\d{4}-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}-${m[1]}` : key;
  };
  const stepDate = (dir) => {
    if (dateChips.length === 0) return;
    const idx = dateFilter ? dateChips.findIndex(c => c.key === dateFilter) : -1;
    let next;
    if (idx === -1) next = dir > 0 ? 0 : dateChips.length - 1;
    else next = Math.min(dateChips.length - 1, Math.max(0, idx + dir));
    setDateFilter(dateChips[next].key);
  };

  const selectedUnit = onboardUnits.find(u => String(u.id) === String(selectedUnitId));
  const selectedInstitution = institutions.find(i => String(i.id) === String(selectedInstitutionId));

  // Status count counters for quick pill badges
  const pendingCount = safeDemands.filter(d => d.status === 'APPROVED').length;
  const acceptedCount = safeDemands.filter(d => ['ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED'].includes(d.status)).length;
  const rejectedCount = safeDemands.filter(d => d.status === 'REJECTED').length;

  const hasActiveFilters = selectedUnitId !== 'ALL' || selectedInstitutionId !== 'ALL' || statusFilter !== 'ALL' || timeFilter !== 'ALL' || !!dateFilter || demandSearch.trim() !== '';

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <TricolorSpinner size="h-14 w-14" />
        <div className="text-slate-600 font-bold text-sm mt-4">Loading Refreshment Demands Console...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Layout: ONBOARDED NCC UNITS (Sidebar) on the Left, Demands Console on the Right */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* MOBILE TOGGLE FOR SIDEBAR */}
        <div className="lg:hidden w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-sm text-slate-800">Filter NCC Units</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            {isSidebarOpen ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        {/* LEFT SIDE: ONBOARDED NCC UNITS SIDEBAR */}
        <div className={`${isSidebarOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex-col sticky top-20`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 tracking-tight uppercase">NCC Units</h3>
                  <p className="text-[10px] text-slate-500">Filter demands by unit</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                {onboardUnits.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search unit name or code..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Unit List */}
          <div className="p-2.5 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-slate-50">
            {/* "All Units" Filter Option */}
            <button
              onClick={() => {
                setSelectedUnitId('ALL');
                setSelectedInstitutionId('ALL');
              }}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                selectedUnitId === 'ALL'
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-transparent text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedUnitId === 'ALL' ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-slate-300'}`}></div>
                <div>
                  <span className="text-xs font-bold block">All Units (Overview)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Show demands from all units</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                {safeDemands.length}
              </span>
            </button>

            {filteredUnits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No matching units found.
              </div>
            ) : (
              filteredUnits.map((u) => {
                const isSelected = String(selectedUnitId) === String(u.id);
                const unitDemandsCount = safeDemands.filter(d => String(d.unit_id) === String(u.id)).length;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedUnitId('ALL');
                        setSelectedInstitutionId('ALL');
                      } else {
                        setSelectedUnitId(String(u.id));
                        setSelectedInstitutionId('ALL');
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-300 shadow-sm ring-2 ring-blue-400/20'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800 border border-blue-200">
                          {u.unit_code}
                        </span>
                        {u.ncc_group && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {u.ncc_group}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {unitDemandsCount} Demands
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {u.unit_name}
                    </h4>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1 truncate font-medium">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.location || 'HQ Location'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-bold text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded">
                        <School className="w-2.5 h-2.5 text-blue-600" />
                        <span>{u.institution_count || 0} Inst</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-slate-50/90 border-t border-slate-100">
            <Link
              to="/settings?tab=units"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Manage / Onboard Units
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE: MAIN OPERATIONS & REFRESHMENT DEMANDS */}
        <div className="w-full flex-1 min-w-0 space-y-6">
          {/* Header Banner & Mini Summary - Clean Light Design */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/90 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* Title Section */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700 hidden sm:block">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Refreshment Demands Console
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review & manage official refreshment demands
                </p>
              </div>
            </div>

            {/* Compact Summary Cards - Flex in center */}
            <div className="flex items-center flex-wrap gap-2 xl:gap-3 flex-1 xl:justify-center">
              <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl px-3.5 py-2 min-w-[140px]">
                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                  <ClipboardList className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Demands</div>
                  <div className="text-sm font-black text-slate-900 leading-none mt-0.5">{safeDemands.length} <span className="text-[10px] text-slate-500 font-medium">{(summary?.financials?.total_packets_demanded || 0).toLocaleString('en-IN')} pkts</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200 rounded-xl px-3.5 py-2 min-w-[140px]">
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Pending Action</div>
                  <div className="text-sm font-black text-amber-700 leading-none mt-0.5">{pendingCount} <span className="text-[10px] font-medium opacity-80">review req</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 rounded-xl px-3.5 py-2 min-w-[140px]">
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">In Supply</div>
                  <div className="text-sm font-black text-emerald-700 leading-none mt-0.5">{acceptedCount} <span className="text-[10px] font-medium opacity-80">active</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl px-3.5 py-2 min-w-[140px]">
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Value</div>
                  <div className="text-sm font-black text-slate-900 leading-none mt-0.5">₹{(summary?.financials?.total_amount_delivered || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/approved-demands"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                Go to Supply Point
              </Link>
              <Link
                to="/admin/delivery-tracking"
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                Live Tracking
              </Link>
            </div>
          </div>

          {/* Demands Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col gap-4">
              
              {/* Row 1: Title & Unit/Inst Dropdowns */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    Demands List
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                    {displayedDemands.length} shown
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* UNIT FILTER DROPDOWN */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500">Unit:</span>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => {
                        setSelectedUnitId(e.target.value);
                        setSelectedInstitutionId('ALL');
                      }}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
                    >
                      <option value="ALL">All Units ({onboardUnits.length})</option>
                      {onboardUnits.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.unit_code ? `[${u.unit_code}] ` : ''}{u.unit_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* INSTITUTION FILTER DROPDOWN */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <School className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500">Institution:</span>
                    <select
                      value={selectedInstitutionId}
                      onChange={(e) => setSelectedInstitutionId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[190px] truncate"
                    >
                      <option value="ALL">All Institutions ({availableInstitutions.length})</option>
                      {availableInstitutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institution_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Tags Display */}
              {(selectedUnitId !== 'ALL' || selectedInstitutionId !== 'ALL') && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-slate-400">Active Filters:</span>
                  {selectedUnit && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <Building2 className="w-3 h-3 text-blue-600" />
                      Unit: {selectedUnit.unit_name}
                      <button
                        onClick={() => {
                          setSelectedUnitId('ALL');
                          setSelectedInstitutionId('ALL');
                        }}
                        className="hover:text-blue-950 ml-0.5 cursor-pointer"
                        title="Remove unit filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedInstitution && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <School className="w-3 h-3 text-indigo-600" />
                      Institution: {selectedInstitution.institution_name}
                      <button
                        onClick={() => setSelectedInstitutionId('ALL')}
                        className="hover:text-indigo-950 ml-0.5 cursor-pointer"
                        title="Remove institution filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Row 2: Status, Time, Date Filters & Search */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                
                {/* Left side: Slicers & Dates */}
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                  {/* Status Slicer */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar gap-1 shrink-0">
                    {[
                      { val: 'ALL', label: `All` },
                      { val: 'PENDING', label: `Pending (${pendingCount})` },
                      { val: 'ACCEPTED', label: `Accepted (${acceptedCount})` },
                      { val: 'REJECTED', label: `Rejected (${rejectedCount})` }
                    ].map(sf => (
                      <button
                        key={sf.val}
                        onClick={() => setStatusFilter(sf.val)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === sf.val 
                            ? `bg-white shadow-xs text-blue-700 border border-slate-200 font-extrabold` 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        {sf.label}
                      </button>
                    ))}
                  </div>

                  {/* Time Slicer */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar gap-1 shrink-0">
                    {[
                      { val: 'ALL', label: 'All Time' },
                      { val: 'TODAY', label: 'Today' },
                      { val: 'WEEKLY', label: 'This Week' },
                      { val: 'MONTHLY', label: 'This Month' }
                    ].map(tf => (
                      <button
                        key={tf.val}
                        onClick={() => setTimeFilter(tf.val)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          timeFilter === tf.val 
                            ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>

                  {/* Date Strip */}
                  {dateChips.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 lg:flex-none">
                      <button onClick={() => stepDate(-1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer shrink-0" title="Previous date">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setDateFilter(null)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border cursor-pointer shrink-0 ${!dateFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        All dates
                      </button>
                      {dateChips.map(c => {
                        const b = dateBadge(c.key);
                        const active = dateFilter === c.key;
                        return (
                          <button
                            key={c.key}
                            onClick={() => setDateFilter(active ? null : c.key)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border cursor-pointer shrink-0 ${active ? 'bg-blue-600 text-white border-blue-600' : (b && b.label.startsWith('Overdue') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}`}
                            title={`${formatDMY(c.key)} ${weekdayOf(c.key)}`}
                          >
                            {shortDate(c.key)} <span className="opacity-70">({c.count})</span>
                          </button>
                        );
                      })}
                      <button onClick={() => stepDate(1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer shrink-0" title="Next date">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side: Search & Reset */}
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto mt-2 xl:mt-0">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ref, institute, unit..."
                      value={demandSearch}
                      onChange={(e) => setDemandSearch(e.target.value)}
                      className="w-full sm:w-64 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
                    />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Table */}
            {selectedDemandIds.size > 0 && (
              <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center justify-between">
                <div className="text-sm font-bold text-indigo-800">
                  {selectedDemandIds.size} demand(s) selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkReject}
                    disabled={isBulkLoading}
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-50"
                  >
                    Reject Selected
                  </button>
                  <button
                    onClick={handleBulkAccept}
                    disabled={isBulkLoading}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    Accept Selected
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm relative">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                        onChange={toggleSelectAll}
                        checked={displayedDemands.filter(eligibleForBulk).length > 0 && displayedDemands.filter(eligibleForBulk).every(d => selectedDemandIds.has(d.id))}
                        disabled={displayedDemands.filter(eligibleForBulk).length === 0}
                        title="Select/Deselect all pending demands in view"
                      />
                    </th>
                    <th className="p-3.5">Demand Ref</th>
                    <th className="p-3.5">NCC Unit</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Institution Name</th>
                    <th className="p-3.5">
                      <button onClick={() => setSortAsc(v => !v)} className="inline-flex items-center gap-1 uppercase font-bold tracking-wider cursor-pointer hover:text-slate-800" title={sortAsc ? 'Nearest date first (click to reverse)' : 'Farthest date first (click to reverse)'}>
                        Demand Date {sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    </th>
                    <th className="p-3.5">Packets</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Vendor Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedDemands.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-500 font-medium">
                        No demands matching the selected criteria.
                        {hasActiveFilters && (
                          <div className="mt-2">
                            <button
                              onClick={resetAllFilters}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              Reset filters to show all demands
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    dateGroups.map((g) => {
                      const badge = dateBadge(g.key);
                      const collapsed = !!collapsedDates[g.key];
                      const gPkts = g.items.reduce((s, d) => s + pktsOf(d), 0);
                      const gAmt = g.items.reduce((s, d) => s + Number(d.total_amount || 0), 0);
                      return (
                    <React.Fragment key={g.key}>
                      <tr className="bg-slate-100/90 cursor-pointer select-none" onClick={() => setCollapsedDates(p => ({ ...p, [g.key]: !p[g.key] }))}>
                        <td colSpan="10" className="px-3.5 py-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                            <span className="font-extrabold text-slate-800 text-xs">{formatDMY(g.key)} · {weekdayOf(g.key)}</span>
                            {badge && <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badge.cls}`}>{badge.label}</span>}
                            <span className="text-[11px] font-bold text-slate-500">{g.items.length} demand{g.items.length > 1 ? 's' : ''} · {gPkts.toLocaleString('en-IN')} packets · ₹{gAmt.toLocaleString('en-IN')}</span>
                          </div>
                        </td>
                      </tr>
                      {!collapsed && g.items.map((dem) => (
                      <tr key={dem.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-30"
                            checked={selectedDemandIds.has(dem.id)}
                            onChange={() => toggleSelection(dem.id)}
                            disabled={!eligibleForBulk(dem)}
                            title={eligibleForBulk(dem) ? "Select demand" : "Only pending demands can be selected"}
                          />
                        </td>
                        <td className="p-3.5 font-mono font-bold text-blue-600 whitespace-nowrap">
                          {dem.demand_number}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium whitespace-nowrap">
                          {dem.unit_name}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                            dem.demand_type === 'UNIT_DIRECT' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {dem.demand_type === 'UNIT_DIRECT' ? 'UNIT' : 'INSTITUTE'}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {dem.demand_type === 'UNIT_DIRECT' ? (dem.unit_code || dem.unit_name || '—') : (dem.institution_name || '—')}
                        </td>
                        <td className="p-3.5 font-medium text-slate-600 whitespace-nowrap">
                          {formatDMY(dem.demand_date)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {(dem.total_packets || dem.total_quantity || dem.quantity || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700 whitespace-nowrap">
                          ₹{(dem.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <StatusBadge status={dem.status} deliveryStatus={dem.delivery_status} demand={dem} />
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {dem.status === 'APPROVED' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAccept(dem.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Accept demand: Will reflect in Supply Point for dispatch"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => handleReject(dem.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs inline-flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : dem.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accepted
                            </span>
                          ) : dem.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-lg border border-rose-200">
                              <X className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold uppercase">{dem.status}</span>
                          )}
                        </td>
                      </tr>
                      ))}
                    </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
