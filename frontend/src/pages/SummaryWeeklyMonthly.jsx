import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  BarChart3, 
  Building2, 
  TrendingUp, 
  Package, 
  IndianRupee, 
  CalendarDays, 
  Printer, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function SummaryWeeklyMonthly({ hideHeader = false }) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('MONTHLY'); // 'MONTHLY' | 'WEEKLY'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState({ monthly: [], weekly: [], institutions: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      fetchPeriodicSummary();
    }
  }, [token, selectedYear]);

  const fetchPeriodicSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/weekly-monthly-summary?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          monthly: Array.isArray(json.monthly) ? json.monthly : [],
          weekly: Array.isArray(json.weekly) ? json.weekly : [],
          institutions: Array.isArray(json.institutions) ? json.institutions : []
        });
      }
    } catch (err) {
      console.error('Failed to fetch periodic summary', err);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getMonthName = (monthKey) => {
    if (!monthKey) return '';
    const parts = monthKey.split('-');
    if (parts.length < 2) return monthKey;
    const idx = parseInt(parts[1], 10) - 1;
    return `${monthNames[idx] || parts[1]} ${parts[0]}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const safeMonthly = Array.isArray(data.monthly) ? data.monthly : [];
  const safeWeekly = Array.isArray(data.weekly) ? data.weekly : [];
  const safeInsts = Array.isArray(data.institutions) ? data.institutions : [];

  // Aggregates
  const totalDemands = safeMonthly.reduce((acc, curr) => acc + (curr.demand_count || 0), 0);
  const totalPackets = safeMonthly.reduce((acc, curr) => acc + (curr.total_packets || 0), 0);
  const totalCost = safeMonthly.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);

  const filteredInsts = safeInsts.filter(inst => 
    (inst && inst.institution_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (inst && inst.unit_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={hideHeader ? "space-y-8 w-full" : "p-4 sm:p-6 lg:p-8 space-y-8 w-full"}>
      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {user?.role === 'INSTITUTION' ? 'Institution Refreshment Summary' : 'NCC Unit Weekly & Monthly Summary'}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                Year {selectedYear}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {user?.role === 'INSTITUTION'
                ? `Periodic refreshment demand history and monthly consumption for ${user?.institution_name || 'your institution'}`
                : `Aggregated weekly and monthly refreshment distribution across all institutions under ${user?.unit_name || 'Unit jurisdiction'}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="2026">Year 2026</option>
            <option value="2025">Year 2025</option>
            <option value="2024">Year 2024</option>
          </select>

          <button 
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer border border-blue-700"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">TOTAL DEMANDS RAISED</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {totalDemands} <span className="text-xs font-bold text-slate-400">Demands</span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">In Year {selectedYear}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">TOTAL PACKETS SERVED</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-600 tracking-tight">
            {totalPackets.toLocaleString()} <span className="text-xs font-bold text-slate-400">Pkts</span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">Cadet Refreshment Packets</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">TOTAL EXPENSED VALUE</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">Calculated at Item Rate/Pkt</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'MONTHLY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Monthly Summary
          </button>
          <button
            onClick={() => setActiveTab('WEEKLY')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'WEEKLY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Weekly Breakdown
          </button>
        </div>

        {user?.role !== 'INSTITUTION' && (
          <span className="text-xs font-bold text-slate-400">
            Unit Institutions Mode ({data.institutions.length} Institutions)
          </span>
        )}
      </div>

      {/* TAB 1: MONTHLY SUMMARY */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Monthly Breakdown ({selectedYear})
              </h2>
              <span className="text-xs font-medium text-slate-400">{data.monthly.length} Months Recorded</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-xs font-bold">Loading Monthly Data...</p>
              </div>
            ) : data.monthly.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No Monthly Data Available</p>
                <p className="text-xs text-slate-400">No demands found for the year {selectedYear}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="p-4 pl-6">MONTH</th>
                      <th className="p-4 text-center">DEMANDS</th>
                      <th className="p-4 text-center">PENDING</th>
                      <th className="p-4 text-center">APPROVED / ACCEPTED</th>
                      <th className="p-4 text-center">FULFILLED</th>
                      <th className="p-4 text-center">TOTAL PACKETS</th>
                      <th className="p-4 text-right pr-6">TOTAL AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {data.monthly.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 pl-6 font-black text-slate-900">{getMonthName(row.month_key)}</td>
                        <td className="p-4 text-center font-bold text-slate-800">{row.demand_count}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                            {row.pending_count || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                            {row.approved_count || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                            {row.fulfilled_count || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center font-black text-indigo-600 bg-indigo-50/40 rounded-lg">
                          {(row.total_packets || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right pr-6 font-black text-emerald-600 text-sm">
                          ₹{(row.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY BREAKDOWN */}
      {activeTab === 'WEEKLY' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Weekly Aggregation ({selectedYear})
              </h2>
              <span className="text-xs font-medium text-slate-400">{data.weekly.length} Active Weeks</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-xs font-bold">Loading Weekly Data...</p>
              </div>
            ) : data.weekly.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No Weekly Data Available</p>
                <p className="text-xs text-slate-400">No weekly demand records for {selectedYear}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="p-4 pl-6">WEEK NO</th>
                      <th className="p-4">WEEK DATES (START - END)</th>
                      <th className="p-4 text-center">DEMANDS</th>
                      <th className="p-4 text-center">TOTAL PACKETS</th>
                      <th className="p-4 text-right pr-6">TOTAL AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {data.weekly.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 pl-6 font-black text-blue-600">Week #{row.week_num}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {new Date(row.week_start).toLocaleDateString()} — {new Date(row.week_end).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">{row.demand_count}</td>
                        <td className="p-4 text-center font-black text-indigo-600">{row.total_packets}</td>
                        <td className="p-4 text-right pr-6 font-black text-emerald-600 text-sm">
                          ₹{(row.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSTITUTIONS SUMMARY FOR UNIT & ADMIN ROLES */}
      {user?.role !== 'INSTITUTION' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                All Institutions Summary Breakdown under {user?.unit_name || 'Unit'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Annual demand volume and financial totals per school/college
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-4">INSTITUTION NAME</th>
                  <th className="p-3.5">UNIT</th>
                  <th className="p-3.5 text-center">TOTAL DEMANDS</th>
                  <th className="p-3.5 text-center">PACKETS CONSUMED</th>
                  <th className="p-3.5 text-right pr-4">TOTAL AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInsts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No institutions match your search.
                    </td>
                  </tr>
                ) : (
                  filteredInsts.map((inst) => (
                    <tr key={inst.institution_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-4 font-black text-slate-900">{inst.institution_name}</td>
                      <td className="p-3.5 font-bold text-slate-500">{inst.unit_name}</td>
                      <td className="p-3.5 text-center font-bold text-slate-800">{inst.total_demands}</td>
                      <td className="p-3.5 text-center font-black text-indigo-600">{inst.total_packets || 0}</td>
                      <td className="p-3.5 text-right pr-4 font-black text-emerald-600">
                        ₹{(inst.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
