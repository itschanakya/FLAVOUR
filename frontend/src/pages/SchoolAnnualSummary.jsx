import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileBarChart,
  Building2,
  School,
  Users,
  PackageCheck,
  PieChart,
  Search,
  Calendar,
  Download,
  Printer,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const formatDMY = (dateStr) => {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string') {
    const clean = dateStr.split('T')[0].split(' ')[0];
    const parts = clean.split('-');
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

export default function SchoolAnnualSummary({ hideHeader = false }) {
  const { token, user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstId, setSelectedInstId] = useState('ALL');

  useEffect(() => {
    if (token) {
      fetchAnnualSummary();
    }
  }, [token, selectedYear]);

  const fetchAnnualSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/annual-summary?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        } else {
          setData([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch annual summary', err);
    } finally {
      setLoading(false);
    }
  };

  const safeData = Array.isArray(data) ? data : [];

  // Filter institutions for Unit / Admin
  const filteredData = safeData.filter(item => {
    if (!item || !item.institution) return false;
    const matchesSearch = item.institution.institution_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.institution.ano_cto_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.institution.pin_code && item.institution.pin_code.includes(searchQuery));
    const matchesInst = selectedInstId === 'ALL' || item.institution.id?.toString() === selectedInstId.toString();
    return matchesSearch && matchesInst;
  });

  // Calculate Unit / Global aggregates
  const totalInstitutions = safeData.length;
  const totalSanctionedCadets = safeData.reduce((acc, curr) => acc + (curr?.institution?.total_sanctioned_strength || 0), 0);
  const totalAnnualQuota = safeData.reduce((acc, curr) => acc + (curr?.annual_quota || 0), 0);
  const totalConsumedPackets = safeData.reduce((acc, curr) => acc + (curr?.total_consumed || 0), 0);
  const totalRemainingQuota = Math.max(0, totalAnnualQuota - totalConsumedPackets);
  const totalFulfilledFinancials = safeData.reduce((acc, curr) => acc + (curr?.total_fulfilled_amount || 0), 0);

  const overallUtilizationPct = totalAnnualQuota > 0
    ? Math.min(100, Math.round((totalConsumedPackets / totalAnnualQuota) * 100))
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={hideHeader ? "space-y-8 w-full" : "p-4 sm:p-6 lg:p-8 space-y-8 w-full"}>
      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-sm">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                {user?.role === 'INSTITUTION' ? 'Institution Annual Summary' : 'NCC Unit Annual School Summary'}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                AY {selectedYear}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">
              {user?.role === 'INSTITUTION'
                ? `Yearly refreshment quota, cadet strength breakdown, and demand history for ${user?.institution_name || 'your institution'}`
                : `Comprehensive annual audit report across all institutions under ${user?.unit_name || 'Unit jurisdiction'}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="2026">Year 2026</option>
            <option value="2025">Year 2025</option>
            <option value="2024">Year 2024</option>
          </select>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer border border-purple-700"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Print Report</span>
          </button>
        </div>
      </div>
      )}

      {/* Filter / Search Bar (For UNIT / ADMIN) */}
      {user?.role !== 'INSTITUTION' && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Institution Name, ANO/CTO Name or PIN Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">All Institutions ({data.length})</option>
              {data.map(item => (
                <option key={item.institution.id} value={item.institution.id}>
                  {item.institution.institution_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main List of Institutions / Single Institution Detail */}
      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200 shadow-xs">
          <div className="animate-spin w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold">Generating Annual Summary Report...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200 shadow-xs space-y-2">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Annual Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No demands or institution records match the selected year {selectedYear} or search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((item) => {
            const inst = item.institution;
            return (
              <div
                key={inst.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-purple-200"
              >
                {/* Institution Banner / Title */}
                <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-purple-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-black text-slate-900">{inst.institution_name}</h2>
                      {inst.pin_code && (
                        <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                          PIN: {inst.pin_code}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded-md uppercase">
                        {inst.unit_name}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                      <span>ANO/CTO: <strong className="text-slate-800">{inst.ano_cto_name}</strong></span>
                      {inst.ano_cto_contact && <span>• Contact: {inst.ano_cto_contact}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">ANNUAL UTILIZATION</div>
                      <div className="text-xs font-black text-purple-700 leading-none">{item.utilization_pct}%</div>
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-purple-200 flex items-center justify-center font-black text-[10px] text-purple-700 bg-purple-50">
                      {item.utilization_pct}%
                    </div>
                  </div>
                </div>

                {/* Cadet Strength & Quota Metrics */}
                <div className="print:hidden px-5 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 bg-slate-50/60 border-b border-slate-100">
                  {/* Strength Breakdown */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">CADET STRENGTH</span>
                    <div className="text-sm font-black text-slate-800 leading-tight">{inst.total_sanctioned_strength} Cadets</div>
                    <div className="flex gap-1 text-[9px] font-bold text-slate-500 pt-0.5">
                      <span className="bg-slate-100 px-1 py-0.2 rounded">1st: {inst.strength_1st_year}</span>
                      <span className="bg-slate-100 px-1 py-0.2 rounded">2nd: {inst.strength_2nd_year}</span>
                      <span className="bg-slate-100 px-1 py-0.2 rounded">3rd: {inst.strength_3rd_year}</span>
                    </div>
                  </div>

                  {/* Auth Quota */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">AUTH QUOTA (25 ORG)</span>
                    <div className="text-sm font-black text-indigo-600 leading-tight">{item.annual_quota.toLocaleString()} Pkts</div>
                    <p className="text-[9px] text-slate-400 font-medium">Sanctioned Annual Quota</p>
                  </div>

                  {/* Packets Consumed */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">PACKETS CONSUMED</span>
                    <div className="text-sm font-black text-emerald-600 leading-tight">{item.total_consumed.toLocaleString()} Pkts</div>
                    <div className="flex gap-1 text-[9px] font-bold text-slate-500 pt-0.5">
                      <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">Y1: {item.year_group_breakdown['1st Year']}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">Y2: {item.year_group_breakdown['2nd Year']}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">Y3: {item.year_group_breakdown['3rd Year']}</span>
                    </div>
                  </div>

                  {/* Quota Remaining */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">REMAINING QUOTA</span>
                    <div className="text-sm font-black text-purple-700 leading-tight">{item.remaining_quota.toLocaleString()} Pkts</div>
                    <p className="text-[9px] text-slate-400 font-medium">Unused Quota Balance</p>
                  </div>

                  {/* Financial Total */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">FULFILLED VALUE</span>
                    <div className="text-sm font-black text-amber-600 leading-tight">
                      ₹{item.total_fulfilled_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">{item.status_counts.FULFILLED} Fulfilled Demands</p>
                  </div>
                </div>

                {/* Demands Table Breakdown */}
                <div className="px-5 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Demands Raised in {selectedYear} ({item.demands.length})
                    </h4>
                    <div className="flex gap-1.5 text-[9px] font-bold">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">Pending: {item.status_counts.PENDING}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">Approved: {item.status_counts.APPROVED + item.status_counts.ACCEPTED}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Fulfilled: {item.status_counts.FULFILLED}</span>
                    </div>
                  </div>

                  {item.demands.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                      No refreshment demands raised by this institution in {selectedYear}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 pl-3.5">DEMAND NO</th>
                            <th className="py-2.5 px-3">DATE</th>
                            <th className="py-2.5 px-3">PURPOSE</th>
                            <th className="py-2.5 px-3">STATUS</th>
                            <th className="py-2.5 px-3 text-center">PACKETS</th>
                            <th className="py-2.5 px-3 text-right pr-3.5">AMOUNT (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {item.demands.map((dem) => (
                            <tr key={dem.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 pl-3.5 font-bold text-blue-700 font-mono">{dem.demand_number}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-600">{formatDMY(dem.demand_date)}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 uppercase">{dem.purpose}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${dem.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    dem.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      dem.status === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        dem.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                  {dem.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{dem.total_qty || 0}</td>
                              <td className="py-2.5 px-3 text-right pr-3.5 font-bold text-emerald-600">
                                ₹{(dem.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
