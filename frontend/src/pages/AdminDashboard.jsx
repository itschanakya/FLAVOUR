import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { 
  ShieldCheck, 
  Truck, 
  ShoppingBag, 
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
  Navigation
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

export default function AdminDashboard() {
  const { token } = useAuth();
  const { events } = useSSE();
  const [summary, setSummary] = useState(null);
  const [approvedDemands, setApprovedDemands] = useState([]);
  const [catalogCount, setCatalogCount] = useState(0);
  const [onboardUnits, setOnboardUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('ALL');
  const [unitSearch, setUnitSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING maps to db status APPROVED
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, TODAY, WEEKLY, MONTHLY

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchAdminData();
    }
  }, [events?.DEMAND_UPDATED]);

  const fetchAdminData = async () => {
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
        setApprovedDemands(demData.filter(d => ['APPROVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED', 'REJECTED'].includes(d.status)));
      } else {
        setApprovedDemands([]);
      }

      // 3. Fetch catalog count
      const catRes = await fetch('/api/catalog', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const catData = await catRes.json();
      setCatalogCount(Array.isArray(catData) ? catData.length : 0);

      // 4. Fetch all onboarded NCC units
      const unitsRes = await fetch('/api/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unitsData = await unitsRes.json();
      setOnboardUnits(Array.isArray(unitsData) ? unitsData : []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (demandId) => {
    if (!window.confirm('Accept this demand for fulfillment?')) return;
    try {
      const res = await fetch(`/api/demands/${demandId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAdminData();
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
      fetchAdminData();
      window.dispatchEvent(new Event('demand-status-changed'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading Admin Console...</div>;
  }

  const fulfilledVal = summary?.financials?.fulfilled_amount || 0;
  const approvedVal = summary?.financials?.approved_amount || 0;

  // Filter units by search keyword
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

  // Filter demands by unit, status, and time
  const safeDemands = Array.isArray(approvedDemands) ? approvedDemands : [];
  const displayedDemands = safeDemands.filter(d => {
    if (selectedUnitId !== 'ALL' && d.unit_id !== selectedUnitId) return false;

    // Status filter (Vendor sees APPROVED as PENDING action)
    if (statusFilter === 'PENDING' && d.status !== 'APPROVED') return false;
    if (statusFilter === 'ACCEPTED' && !['ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'DELIVERED'].includes(d.status)) return false;
    if (statusFilter === 'REJECTED' && d.status !== 'REJECTED') return false;

    // Time filter
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

    return true;
  });

  const selectedUnit = onboardUnits.find(u => u.id === selectedUnitId);

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Layout: ONBOARDED NCC UNITS (20% Width) on the Left Side, Main Content (80% Width) on the Right */}
      <div className="flex flex-col lg:flex-row gap-4 xl:gap-5 items-start">
        
        {/* LEFT SIDE: ONBOARDED NCC UNITS (20% WIDTH) */}
        <div className="w-full lg:w-[20%] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col sticky top-20">
          <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[11px] text-slate-900 tracking-tight uppercase">NCC Units</h3>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                {onboardUnits.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mt-2.5">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search units..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>

          {/* Unit List */}
          <div className="p-2 space-y-1.5 max-h-[calc(100vh-270px)] overflow-y-auto divide-y divide-slate-50">
            {/* "All Units" Filter Option */}
            <button
              onClick={() => setSelectedUnitId('ALL')}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border ${
                selectedUnitId === 'ALL'
                  ? 'bg-amber-500/10 border-amber-300 text-amber-900 font-bold shadow-sm'
                  : 'bg-slate-50/50 hover:bg-slate-100/80 border-transparent text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selectedUnitId === 'ALL' ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-slate-300'}`}></div>
                <span className="text-xs font-bold">All Units (Overview)</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {onboardUnits.length}
              </span>
            </button>

            {filteredUnits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No matching units found.
              </div>
            ) : (
              filteredUnits.map((u) => {
                const isSelected = selectedUnitId === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUnitId(isSelected ? 'ALL' : u.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group pt-2.5 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-400/30'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 border border-amber-200">
                        {u.unit_code}
                      </span>
                      {u.ncc_group && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {u.ncc_group}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Onboarded
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                      {u.unit_name}
                    </h4>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1 truncate font-medium">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.location || 'HQ Location'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        <School className="w-2.5 h-2.5 text-amber-600" />
                        <span>{u.institution_count || 0} Inst</span>
                      </div>
                    </div>

                    {u.unit_email && (
                      <div className="mt-1 text-[9px] text-slate-400 font-mono truncate">
                        {u.unit_email}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-100">
            <Link
              to="/units"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Onboard NCC Units
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE: MAIN OPERATIONS & REFRESHMENT DEMANDS (80% WIDTH) */}
        <div className="w-full lg:w-[80%] flex-1 min-w-0 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-slate-100">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                Vendor Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/admin/delivery-tracking"
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Live Delivery Tracking
              </Link>
              <Link
                to="/units"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Onboard NCC Units
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Packets Demanded</div>
              <div className="text-3xl font-extrabold bg-gradient-to-br from-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-400" />
                {(summary?.financials?.total_packets_demanded || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="glass-card p-5 border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Packets in Transit</div>
              <div className="text-3xl font-extrabold bg-gradient-to-br from-amber-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                <Truck className="w-6 h-6 text-amber-400" />
                {(summary?.financials?.total_packets_in_transit || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="glass-card p-5 border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Delivered</div>
              <div className="text-3xl font-extrabold bg-gradient-to-br from-fuchsia-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-fuchsia-400" />
                {(summary?.financials?.total_packets_delivered || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="glass-card p-5 border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Amount Delivered</div>
              <div className="text-3xl font-extrabold bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-1">
                <IndianRupee className="w-6 h-6 text-emerald-400" />
                {(summary?.financials?.total_amount_delivered || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* REFRESHMENT DEMANDS Table */}
          <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Demands
                  </h3>
                  {selectedUnit && (
                    <p className="text-xs text-slate-500 mt-1">
                      Showing: {selectedUnit.unit_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {selectedUnit && (
                    <button
                      onClick={() => setSelectedUnitId('ALL')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <X className="w-3.5 h-3.5" /> Show All Units
                    </button>
                  )}
                  <Link to="/approved-demands" className="text-xs font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1">
                    View Supply Point <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* SLICERS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                {/* Status Slicer */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {[
                    { val: 'ALL', label: 'All', color: 'text-slate-700' },
                    { val: 'PENDING', label: 'Pending', color: 'text-amber-600' },
                    { val: 'ACCEPTED', label: 'Accepted', color: 'text-emerald-600' },
                    { val: 'REJECTED', label: 'Rejected', color: 'text-rose-600' }
                  ].map(sf => (
                    <button
                      key={sf.val}
                      onClick={() => setStatusFilter(sf.val)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${
                        statusFilter === sf.val 
                          ? `bg-white shadow border border-slate-200 ${sf.color}` 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {sf.label}
                    </button>
                  ))}
                </div>

                {/* Time Slicer */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {['ALL', 'TODAY', 'WEEKLY', 'MONTHLY'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeFilter(tf)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${
                        timeFilter === tf 
                          ? 'bg-white text-blue-700 shadow border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {tf === 'ALL' ? 'All Time' : tf === 'WEEKLY' ? 'This Week' : tf === 'MONTHLY' ? 'This Month' : 'Today'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">Demand Ref</th>
                    <th className="p-4">NCC Unit</th>
                    <th className="p-4">Institution Name</th>
                    <th className="p-4">Demand Date</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Vendor Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedDemands.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                        {selectedUnit 
                          ? `No demands pending vendor action for ${selectedUnit.unit_name}.` 
                          : 'No demands currently pending vendor action.'}
                      </td>
                    </tr>
                  ) : (
                    displayedDemands.map((dem) => (
                      <tr key={dem.id} className="hover:bg-white/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">{dem.demand_number}</td>
                        <td className="p-4 text-slate-700 font-medium">{dem.unit_name}</td>
                        <td className="p-4 font-semibold text-slate-900">{dem.institution_name}</td>
                        <td className="p-4 font-bold text-slate-700 text-xs">{formatDMY(dem.demand_date)}</td>
                        <td className="p-4 font-bold text-emerald-600">₹{(dem.total_amount || 0).toLocaleString('en-IN')}</td>
                        <td className="p-4"><StatusBadge status={dem.status} /></td>
                        <td className="p-4 text-right">
                          {dem.status === 'APPROVED' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAccept(dem.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                title="Accept demand: Will reflect in Supply Point under Slicer 'New Demand Received' and render in Fleet Delivery"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => handleReject(dem.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs inline-flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : dem.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accepted
                            </span>
                          ) : dem.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-lg border border-rose-200">
                              <X className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold uppercase">{dem.status}</span>
                          )}
                        </td>
                      </tr>
                    ))
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
