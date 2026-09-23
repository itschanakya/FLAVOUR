import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { Building2, School, Clock, CheckCircle2, XCircle, ArrowUpRight, AlertCircle, ShoppingBag } from 'lucide-react';

export default function UnitDashboard() {
  const { user, token } = useAuth();
  const { events } = useSSE();
  const [summary, setSummary] = useState(null);
  const [pendingDemands, setPendingDemands] = useState([]);
  const [institutionsCount, setInstitutionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnitData = useCallback(async () => {
    if (!token) return;
    try {
      // 1. Fetch summary stats
      const sumRes = await fetch('/api/reports/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sumData = await sumRes.json();
      setSummary(sumData);

      // 2. Fetch pending demands
      const demRes = await fetch('/api/demands?status=PENDING', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const demData = await demRes.json();
      setPendingDemands(Array.isArray(demData) ? demData : []);

      // 3. Fetch institutions count
      const instRes = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const instData = await instRes.json();
      setInstitutionsCount(Array.isArray(instData) ? instData.length : 0);

    } catch (err) {
      console.error('Error fetching unit dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    fetchUnitData();
  }, [fetchUnitData]);

  // Real-time SSE updates (seamless, no distracting animations)
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.NEW_NOTIFICATION || events?.timestamp) {
      fetchUnitData();
    }
  }, [events?.DEMAND_UPDATED, events?.NEW_NOTIFICATION, events?.timestamp, fetchUnitData]);

  // Broadcast & Window event listener
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      fetchUnitData();
    };

    window.addEventListener('demand-status-changed', handleRealtimeUpdate);
    window.addEventListener('notification-received', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('demand-status-changed', handleRealtimeUpdate);
      window.removeEventListener('notification-received', handleRealtimeUpdate);
    };
  }, [fetchUnitData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading Unit Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4 sm:p-6 border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 mb-1.5 shadow-xs">
            <Building2 className="w-3.5 h-3.5" />
            NCC Unit HQ Jurisdiction
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            {user?.unit_name || 'NCC Battalion HQ'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Managing <span className="text-blue-600 font-bold">{institutionsCount} Institutions</span> & ANO/CTO Vacancy Strengths
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Link
            to="/unit-demand"
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Refreshment Demand
          </Link>
          <Link
            to="/institutions"
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <School className="w-4 h-4" />
            Manage Institutions
          </Link>
          <Link
            to="/review-demands"
            className="px-3.5 py-2.5 rounded-xl btn-gradient-blue-pink text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Review Demands ({pendingDemands.length})
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-3.5 sm:p-5 border-slate-100">
          <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Requires Action</div>
          <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-br from-amber-500 to-orange-500 bg-clip-text text-transparent">
            {summary?.summary?.PENDING || 0}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 block">Pending Approvals</span>
        </div>
        <div className="glass-card p-3.5 sm:p-5 border-slate-100">
          <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Approved</div>
          <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-br from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            {summary?.summary?.APPROVED || 0}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 block">Sent to Vendor HQ</span>
        </div>
        <div className="glass-card p-3.5 sm:p-5 border-slate-100">
          <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fulfilled</div>
          <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {summary?.summary?.FULFILLED || 0}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 block">Supplied by Vendor</span>
        </div>
        <div className="glass-card p-3.5 sm:p-5 border-slate-100">
          <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rejected</div>
          <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-br from-rose-500 to-red-500 bg-clip-text text-transparent">
            {summary?.summary?.REJECTED || 0}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 block">Declined Demands</span>
        </div>
      </div>

      {/* Pending Reviews Card */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
              Demands Awaiting Unit Approval
              {pendingDemands.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingDemands.length} NEW
                </span>
              )}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Review requested quantities and verify against institution strength</p>
          </div>
          <Link to="/review-demands" className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 shrink-0 self-start sm:self-auto">
            Open Full Review Queue <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Native Card View (< sm) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {pendingDemands.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-medium">
              No pending demands currently require review. Great job!
            </div>
          ) : (
            pendingDemands.map((dem) => (
              <div key={dem.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-blue-600">{dem.demand_number}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {dem.total_quantity} Packets
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{dem.institution_name}</h4>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>📅 {dem.demand_date}</span>
                    <span>•</span>
                    <span className="truncate">{dem.purpose}</span>
                  </div>
                </div>
                <Link
                  to="/review-demands"
                  className="w-full py-2 px-3 rounded-lg btn-gradient-blue-pink text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs mt-1"
                >
                  Review Demand <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-4">Demand Ref</th>
                <th className="p-4">Institution Name</th>
                <th className="p-4">Demand Date</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Total Items</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingDemands.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">
                    No pending demands currently require review. Great job!
                  </td>
                </tr>
              ) : (
                pendingDemands.map((dem) => (
                  <tr key={dem.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-blue-600">{dem.demand_number}</td>
                    <td className="p-4 font-semibold text-slate-900">{dem.institution_name}</td>
                    <td className="p-4 text-slate-700">{dem.demand_date}</td>
                    <td className="p-4 text-slate-800">{dem.purpose}</td>
                    <td className="p-4 text-slate-700 font-semibold">{dem.total_quantity} packets</td>
                    <td className="p-4 text-right">
                      <Link
                        to="/review-demands"
                        className="px-3.5 py-1.5 rounded-lg btn-gradient-blue-pink text-white text-xs font-bold inline-flex items-center gap-1 shadow"
                      >
                        Review Demand
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
