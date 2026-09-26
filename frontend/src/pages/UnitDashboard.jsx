import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import { 
  Building2, School, Clock, CheckCircle2, ArrowUpRight, 
  AlertCircle, IndianRupee, Layers, 
  BarChart3, PieChart as PieChartIcon, 
  PackageCheck, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

export default function UnitDashboard() {
  const { user, token } = useAuth();
  const { events } = useSSE();
  const [demands, setDemands] = useState([]);
  const [institutionsCount, setInstitutionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('institute'); // 'institute' | 'weekly' | 'monthly'

  const fetchUnitData = useCallback(async () => {
    if (!token) return;
    try {
      // 1. Fetch all demands for this unit
      const demRes = await fetch('/api/demands?unit_id=' + (user?.unit_id || ''), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const demData = await demRes.json();
      setDemands(Array.isArray(demData) ? demData : []);

      // 2. Fetch institutions count
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
  }, [token, user?.unit_id]);

  useEffect(() => {
    fetchUnitData();
  }, [fetchUnitData]);

  // Real-time SSE updates
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.NEW_NOTIFICATION || events?.timestamp) {
      fetchUnitData();
    }
  }, [events, fetchUnitData]);

  // Broadcast & Window event listener
  useEffect(() => {
    const handleRealtimeUpdate = () => fetchUnitData();
    window.addEventListener('demand-status-changed', handleRealtimeUpdate);
    window.addEventListener('notification-received', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('demand-status-changed', handleRealtimeUpdate);
      window.removeEventListener('notification-received', handleRealtimeUpdate);
    };
  }, [fetchUnitData]);

  // Computations
  const stats = useMemo(() => {
    let totalAmount = 0;
    let deliveredAmount = 0;
    let pipelineAmount = 0;
    let totalPackets = 0;
    let deliveredPackets = 0;
    let pipelinePackets = 0;

    let pendingCount = 0;
    let approvedCount = 0;
    let deliveredCount = 0;
    let rejectedCount = 0;

    let instPackets = 0;
    let instAmount = 0;
    let unitPackets = 0;
    let unitAmount = 0;

    demands.forEach(d => {
      const qty = Number(d.total_quantity || d.quantity) || 0;
      const amt = Number(d.total_amount) || 0;

      totalAmount += amt;
      totalPackets += qty;

      if (d.status === 'DELIVERED' || d.status === 'FULFILLED') {
        deliveredAmount += amt;
        deliveredPackets += qty;
        deliveredCount++;
      } else if (d.status === 'REJECTED') {
        rejectedCount++;
      } else if (d.status === 'PENDING') {
        pendingCount++;
      } else {
        // APPROVED, ACCEPTED, PREPARING, READY_FOR_DISPATCH, etc.
        pipelineAmount += amt;
        pipelinePackets += qty;
        approvedCount++;
      }

      if (d.demand_type === 'UNIT_DIRECT') {
        unitPackets += qty;
        unitAmount += amt;
      } else {
        instPackets += qty;
        instAmount += amt;
      }
    });

    return {
      totalAmount,
      deliveredAmount,
      pipelineAmount,
      totalPackets,
      deliveredPackets,
      pipelinePackets,
      pendingCount,
      approvedCount,
      deliveredCount,
      rejectedCount,
      totalDemands: demands.length,
      instPackets,
      instAmount,
      unitPackets,
      unitAmount
    };
  }, [demands]);

  // Institute-Wise Demand Breakdown Data
  const instituteChartData = useMemo(() => {
    const instMap = {};
    demands.forEach(d => {
      const isUnit = d.demand_type === 'UNIT_DIRECT';
      const name = isUnit 
        ? `${d.unit_code || d.unit_name || 'Unit HQ'} (Direct Unit Demand)` 
        : (d.institution_name || 'Affiliated Institution');

      if (!instMap[name]) {
        instMap[name] = {
          name,
          packets: 0,
          amount: 0,
          count: 0,
          deliveredPackets: 0,
          approvedPackets: 0,
          isUnitDirect: isUnit,
          latestDate: d.demand_date || ''
        };
      }
      const qty = Number(d.total_quantity || d.quantity) || 0;
      const amt = Number(d.total_amount) || 0;
      instMap[name].packets += qty;
      instMap[name].amount += amt;
      instMap[name].count += 1;
      if (d.status === 'DELIVERED' || d.status === 'FULFILLED') {
        instMap[name].deliveredPackets += qty;
      } else {
        instMap[name].approvedPackets += qty;
      }
    });

    const sorted = Object.values(instMap).sort((a, b) => b.packets - a.packets);
    return sorted.map(item => ({
      ...item,
      label: item.name.length > 20 ? item.name.slice(0, 18) + '…' : item.name
    }));
  }, [demands]);

  // Weekly Trend Chart Data
  const weeklyChartData = useMemo(() => {
    const dayMap = {};
    demands.forEach(d => {
      const dateStr = d.demand_date || (d.created_at ? d.created_at.split('T')[0] : '');
      if (!dateStr) return;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { date: dateStr, packets: 0, amount: 0, count: 0 };
      }
      dayMap[dateStr].packets += Number(d.total_quantity || d.quantity) || 0;
      dayMap[dateStr].amount += Number(d.total_amount) || 0;
      dayMap[dateStr].count += 1;
    });

    const sorted = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(item => {
      const parts = item.date.split('-');
      const d = new Date(parts[0], Number(parts[1]) - 1, parts[2]);
      const formatted = !isNaN(d.getTime()) 
        ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : item.date;
      return {
        ...item,
        label: formatted
      };
    });
  }, [demands]);

  // Monthly Trend Chart Data
  const monthlyChartData = useMemo(() => {
    const monthMap = {};
    demands.forEach(d => {
      const dateStr = d.demand_date || (d.created_at ? d.created_at.split('T')[0] : '');
      if (!dateStr) return;
      const mKey = dateStr.slice(0, 7); // YYYY-MM
      if (!monthMap[mKey]) {
        monthMap[mKey] = { monthKey: mKey, packets: 0, amount: 0, count: 0 };
      }
      monthMap[mKey].packets += Number(d.total_quantity || d.quantity) || 0;
      monthMap[mKey].amount += Number(d.total_amount) || 0;
      monthMap[mKey].count += 1;
    });

    const sorted = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return sorted.map(item => {
      const parts = item.monthKey.split('-');
      const d = new Date(parts[0], Number(parts[1]) - 1, 1);
      const formatted = !isNaN(d.getTime()) 
        ? d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : item.monthKey;
      return {
        ...item,
        label: formatted
      };
    });
  }, [demands]);

  // Active chart dataset
  const activeChartData = useMemo(() => {
    if (chartView === 'institute') return instituteChartData;
    if (chartView === 'weekly') return weeklyChartData;
    return monthlyChartData;
  }, [chartView, instituteChartData, weeklyChartData, monthlyChartData]);

  // Pie Chart: Institution vs Unit Direct
  const categoryChartData = useMemo(() => {
    return [
      { name: 'Institution Demands', value: stats.instPackets, amount: stats.instAmount },
      { name: 'Direct Unit Demands', value: stats.unitPackets, amount: stats.unitAmount }
    ].filter(i => i.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-semibold flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading Unit Executive Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner - Clean Jurisdiction Info without Redundant Header Buttons */}
      <div className="glass-card p-4 sm:p-6 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1.5 shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            NCC Unit HQ Jurisdiction
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {user?.unit_name || 'NCC Battalion HQ'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            <span>Code: <strong className="text-slate-800 font-mono">{user?.unit_code || '2 DAB NCC'}</strong></span>
            <span>•</span>
            <span>Managing <strong className="text-blue-600 font-bold">{institutionsCount} Institutions</strong></span>
            <span>•</span>
            <span>Total Demands Placed: <strong className="text-slate-800 font-bold">{stats.totalDemands}</strong></span>
          </div>
        </div>

        {/* Live Pending Reviews Notification Pill */}
        {stats.pendingCount > 0 ? (
          <Link
            to="/review-demands"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs hover:bg-amber-100 transition-all shadow-xs self-start md:self-auto group"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{stats.pendingCount}</strong> Demands Awaiting Approval
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
              Action Required
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start md:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Review Queue Up-to-Date</span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4 PRIMARY EXECUTIVE METRICS CARDS: AMOUNT, PACKETS, PIPELINE, REACH */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requisition Amount */}
        <div className="glass-card p-4 sm:p-5 border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Budget / Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
            ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
            <span className="text-emerald-700 font-bold">₹{stats.deliveredAmount.toLocaleString('en-IN')} Delivered</span>
            <span>•</span>
            <span className="text-blue-700 font-bold">₹{stats.pipelineAmount.toLocaleString('en-IN')} Approved</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        </div>

        {/* Card 2: Total Refreshment Packets */}
        <div className="glass-card p-4 sm:p-5 border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Packets Demanded
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.totalPackets.toLocaleString('en-IN')} <span className="text-base font-semibold text-slate-500">Pkts</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
            <span className="text-emerald-700 font-bold">{stats.deliveredPackets} Delivered</span>
            <span>•</span>
            <span className="text-blue-700 font-bold">{stats.pipelinePackets} In Progress</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        </div>

        {/* Card 3: Demand Pipeline Status */}
        <div className="glass-card p-4 sm:p-5 border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Demands Status Pipeline
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.approvedCount + stats.deliveredCount} <span className="text-base font-semibold text-slate-500">Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
            <span className="text-blue-700 font-bold">{stats.approvedCount} Approved</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">{stats.deliveredCount} Delivered</span>
            {stats.pendingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-700 font-bold">{stats.pendingCount} Pending</span>
              </>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
        </div>

        {/* Card 4: Institution vs Unit Demand Reach */}
        <div className="glass-card p-4 sm:p-5 border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Jurisdiction Reach
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {institutionsCount} <span className="text-base font-semibold text-slate-500">Institutions</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
            <span className="text-slate-700 font-bold">{stats.instPackets} Inst Pkts</span>
            <span>•</span>
            <span className="text-purple-700 font-bold">{stats.unitPackets} Unit Direct</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ANALYTICS CHARTS SECTION: WEEKLY & MONTHLY TRENDS + CATEGORY SHARE */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart (Left 2 cols): Trend & Institution Analysis */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                {chartView === 'institute' 
                  ? 'Institute-Wise Demand Breakdown' 
                  : 'Demand Volume & Expenditure Trend'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartView === 'institute' 
                  ? 'Total refreshment packets and expenditure demanded by each institution' 
                  : chartView === 'weekly' 
                    ? 'Daily/Weekly breakdown of packets demanded' 
                    : 'Monthly aggregated demand volume and expenditure'}
              </p>
            </div>

            {/* View Selector: Institute Wise / Weekly / Monthly */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setChartView('institute')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  chartView === 'institute' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Institute Wise
              </button>
              <button
                type="button"
                onClick={() => setChartView('weekly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  chartView === 'weekly' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly Trend
              </button>
              <button
                type="button"
                onClick={() => setChartView('monthly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  chartView === 'monthly' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Trend
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full pt-2">
            {activeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No demand records available to plot trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    angle={chartView === 'institute' ? -15 : 0}
                    textAnchor={chartView === 'institute' ? 'end' : 'middle'}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 font-sans max-w-xs">
                            <p className="font-bold text-white border-b border-slate-700 pb-1 leading-snug">
                              {data.name || data.label}
                            </p>
                            {chartView === 'institute' && (
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  data.isUnitDirect ? 'bg-purple-900/80 text-purple-300 border border-purple-700' : 'bg-blue-900/80 text-blue-300 border border-blue-700'
                                }`}>
                                  {data.isUnitDirect ? 'Unit Direct Demand' : 'Institution Demand'}
                                </span>
                              </div>
                            )}
                            <div className="pt-0.5 space-y-1">
                              <p className="text-cyan-400 font-black text-sm flex items-center justify-between">
                                <span>Total Packets:</span>
                                <span>{data.packets} Pkts</span>
                              </p>
                              <p className="text-emerald-400 font-black font-mono flex items-center justify-between">
                                <span>Total Value:</span>
                                <span>₹{Number(data.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </p>
                              {chartView === 'institute' && (
                                <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
                                  <span>Delivered: <strong className="text-emerald-400">{data.deliveredPackets || 0}</strong></span>
                                  <span>In Progress: <strong className="text-amber-400">{(data.packets - (data.deliveredPackets || 0))}</strong></span>
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 pt-0.5">
                                {data.count} demand requisition(s)
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="packets" 
                    radius={[6, 6, 0, 0]} 
                    name="Packets Demanded"
                  >
                    {activeChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartView === 'institute' 
                          ? (entry.isUnitDirect ? '#8b5cf6' : '#2563eb')
                          : '#3b82f6'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Metrics Under Chart */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Demanded</span>
              <span className="text-sm font-black text-slate-800">{stats.totalPackets} Pkts</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Value</span>
              <span className="text-sm font-black text-emerald-600 font-mono">₹{stats.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Fulfillment Rate</span>
              <span className="text-sm font-black text-blue-600">
                {stats.totalPackets > 0 ? `${Math.round((stats.deliveredPackets / stats.totalPackets) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Chart (Right 1 col): Category Share */}
        <div className="glass-card p-4 sm:p-6 border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              Requisition Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown by beneficiary category
            </p>
          </div>

          {/* Donut Chart */}
          <div className="h-56 w-full flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-0.5 border border-slate-700">
                            <p className="font-bold text-slate-300">{data.name}</p>
                            <p className="text-cyan-400 font-black">{data.value} Packets</p>
                            <p className="text-emerald-400 font-mono font-bold">₹{Number(data.amount).toLocaleString('en-IN')}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                <span className="font-bold text-slate-700">Institution Demands</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900">{stats.instPackets} pkts</span>
                <span className="text-[10px] text-slate-400 block font-mono">₹{stats.instAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-bold text-slate-700">Unit Direct Demands</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900">{stats.unitPackets} pkts</span>
                <span className="text-[10px] text-slate-400 block font-mono">₹{stats.unitAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* INSTITUTE-WISE DEMAND BREAKDOWN LEDGER TABLE */}
      {/* =================================================================== */}
      <div className="glass-card border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600" />
              Institute-Wise Demand Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated demand requisition totals, packet distribution, and fulfillment status per institution
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {instituteChartData.length} Beneficiaries Active
            </span>
            <Link
              to="/my-demands"
              className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 transition-all shadow-xs"
            >
              <span>View All Demands</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Institution / Beneficiary</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Requisitions</th>
                <th className="py-3 px-4">Packets Demanded</th>
                <th className="py-3 px-4">Fulfillment Progress</th>
                <th className="py-3 px-4 text-right">Total Expenditure</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {instituteChartData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No demands recorded for this unit yet.
                  </td>
                </tr>
              ) : (
                instituteChartData.map((inst, idx) => {
                  const fulfillmentRate = inst.packets > 0 
                    ? Math.round((inst.deliveredPackets / inst.packets) * 100) 
                    : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{inst.name}</div>
                        {inst.latestDate && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Latest: {inst.latestDate}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {inst.isUnitDirect ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            UNIT DIRECT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                            INSTITUTION
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-black text-slate-800">
                          {inst.count} {inst.count === 1 ? 'Req' : 'Reqs'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {inst.packets.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">Pkts</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {inst.deliveredPackets} Del • {inst.packets - inst.deliveredPackets} Pipeline
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-600">{fulfillmentRate}%</span>
                          <span className="text-slate-400 text-[10px]">{inst.deliveredPackets}/{inst.packets} pkts</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              fulfillmentRate === 100 
                                ? 'bg-emerald-500' 
                                : fulfillmentRate > 0 
                                  ? 'bg-blue-600' 
                                  : 'bg-amber-400'
                            }`}
                            style={{ width: `${fulfillmentRate}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-emerald-600 font-mono text-sm">
                          ₹{inst.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {fulfillmentRate === 100 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Fulfilled
                          </span>
                        ) : inst.approvedPackets > 0 || inst.deliveredPackets > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            <RefreshCw className="w-3 h-3 text-blue-600" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
