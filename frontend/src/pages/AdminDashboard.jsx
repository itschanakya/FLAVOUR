import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Download,
  Printer,
  Filter,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  School,
  BarChart3
} from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

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

  // Filter States
  const [periodTab, setPeriodTab] = useState('daily'); // 'daily', 'weekly', 'monthly', 'annually'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedUnitId, setSelectedUnitId] = useState('ALL');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('ALL');

  // Chart Presentation States (Default to Bar Chart with Unit Code as requested)
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'area'
  const [chartDimension, setChartDimension] = useState('unit'); // 'unit' (by Unit Code) or 'timeline' (by date)
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    kpis: {},
    daily: [],
    weekly: [],
    monthly: [],
    annually: [],
    unitDistribution: []
  });
  const [unitsList, setUnitsList] = useState([]);
  const [institutionsList, setInstitutionsList] = useState([]);

  useEffect(() => {
    fetchDashboardAnalytics();
    fetchUnits();
    fetchInstitutions();
  }, [selectedYear, selectedUnitId, selectedInstitutionId]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchDashboardAnalytics();
    }
  }, [events?.DEMAND_UPDATED]);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInstitutionsList(data);
      }
    } catch (err) {
      console.error('Failed to load institutions:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnitsList(data);
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  const fetchDashboardAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedUnitId && selectedUnitId !== 'ALL') params.append('unit_id', selectedUnitId);
      if (selectedInstitutionId && selectedInstitutionId !== 'ALL') params.append('institution_id', selectedInstitutionId);

      const res = await fetch(`/api/reports/dashboard-analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export the active period tabular data to Excel
  const exportToExcel = () => {
    const periodName = periodTab.toUpperCase();
    const fileName = `NCC_Refreshment_${periodName}_Report_${selectedYear}.xlsx`;
    const selectedUnitObj = unitsList.find(u => String(u.id) === String(selectedUnitId));
    const unitTitle = selectedUnitObj ? selectedUnitObj.unit_name : 'ALL NCC UNITS';

    const headerRows = [
      ['FLAVOUR BASE INDIA LLP - REFRESHMENT SYSTEM'],
      [`EXECUTIVE ${periodName} DISPATCH & FULFILLMENT REPORT`],
      [`Year: ${selectedYear} | Unit: ${unitTitle} | Export Date: ${formatDMY(new Date())}`],
      []
    ];

    let tableHeaders = [];
    let tableData = [];

    if (periodTab === 'daily') {
      tableHeaders = [
        'S.No', 'Date', 'Day', 'Demands Count', 'Units Active', 'Institutes Active', 
        'Total Packets Demanded', 'Delivered Packets', 'Total Amount (Rs)', 'Delivered Amount (Rs)', 'Status Breakdown'
      ];
      tableData = analyticsData.daily.map((row, idx) => [
        idx + 1,
        row.date_formatted || row.date,
        row.day_name,
        Number(row.demand_count || 0),
        Number(row.unit_count || 0),
        Number(row.institution_count || 0),
        Number(row.total_packets || 0),
        Number(row.delivered_packets || 0),
        Number(row.total_amount || 0),
        Number(row.delivered_amount || 0),
        `Delivered: ${row.delivered_count || 0}, Transit: ${row.transit_count || 0}, Approved: ${row.approved_count || 0}`
      ]);
    } else if (periodTab === 'weekly') {
      tableHeaders = [
        'S.No', 'Week Period', 'Week Number', 'Demands Count', 'Units Active', 'Institutes Active', 
        'Total Packets Demanded', 'Delivered Packets', 'Total Amount (Rs)', 'Delivered Amount (Rs)', 'Status Breakdown'
      ];
      tableData = analyticsData.weekly.map((row, idx) => [
        idx + 1,
        `${row.week_start || ''} - ${row.week_end || ''}`,
        `Week ${row.week_number}`,
        Number(row.demand_count || 0),
        Number(row.unit_count || 0),
        Number(row.institution_count || 0),
        Number(row.total_packets || 0),
        Number(row.delivered_packets || 0),
        Number(row.total_amount || 0),
        Number(row.delivered_amount || 0),
        `Delivered: ${row.delivered_count || 0}, Transit: ${row.transit_count || 0}, Pending: ${row.pending_count || 0}`
      ]);
    } else if (periodTab === 'monthly') {
      tableHeaders = [
        'S.No', 'Month', 'Month Code', 'Demands Count', 'Units Active', 'Institutes Active', 
        'Total Packets Demanded', 'Delivered Packets', 'Total Amount (Rs)', 'Delivered Amount (Rs)', 'Status Breakdown'
      ];
      tableData = analyticsData.monthly.map((row, idx) => [
        idx + 1,
        row.month_name,
        row.month_key,
        Number(row.demand_count || 0),
        Number(row.unit_count || 0),
        Number(row.institution_count || 0),
        Number(row.total_packets || 0),
        Number(row.delivered_packets || 0),
        Number(row.total_amount || 0),
        Number(row.delivered_amount || 0),
        `Delivered: ${row.delivered_count || 0}, Transit: ${row.transit_count || 0}, Approved: ${row.approved_count || 0}`
      ]);
    } else if (periodTab === 'annually') {
      tableHeaders = [
        'S.No', 'Year', 'Demands Count', 'Units Active', 'Institutes Active', 
        'Total Packets Demanded', 'Delivered Packets', 'Total Amount (Rs)', 'Delivered Amount (Rs)', 'Fulfillment Rate %'
      ];
      tableData = analyticsData.annually.map((row, idx) => {
        const rate = row.total_packets > 0 ? Math.round((row.delivered_packets / row.total_packets) * 100) : 0;
        return [
          idx + 1,
          row.year,
          Number(row.demand_count || 0),
          Number(row.unit_count || 0),
          Number(row.institution_count || 0),
          Number(row.total_packets || 0),
          Number(row.delivered_packets || 0),
          Number(row.total_amount || 0),
          Number(row.delivered_amount || 0),
          `${rate}%`
        ];
      });
    }

    // Grand Total Row
    const activeList = analyticsData[periodTab] || [];
    const totalDemands = activeList.reduce((acc, r) => acc + Number(r.demand_count || 0), 0);
    const totalPackets = activeList.reduce((acc, r) => acc + Number(r.total_packets || 0), 0);
    const totalDeliveredPkts = activeList.reduce((acc, r) => acc + Number(r.delivered_packets || 0), 0);
    const totalVal = activeList.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
    const totalDeliveredVal = activeList.reduce((acc, r) => acc + Number(r.delivered_amount || 0), 0);

    const totalRow = [
      'TOTAL',
      '-',
      '-',
      totalDemands,
      '-',
      '-',
      totalPackets,
      totalDeliveredPkts,
      totalVal,
      totalDeliveredVal,
      '-'
    ];

    const sheetData = [...headerRows, tableHeaders, ...tableData, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${periodName}_Report`);
    XLSX.writeFile(wb, fileName);
  };

  const kpis = analyticsData.kpis || {};
  const currentUnitName = selectedUnitId === 'ALL' 
    ? 'All NCC Units' 
    : (unitsList.find(u => String(u.id) === String(selectedUnitId))?.unit_name || 'Selected Unit');

  // Chart Data Preparation: Timeline
  const trendData = useMemo(() => {
    let source = [];
    if (periodTab === 'daily') {
      source = [...analyticsData.daily].reverse();
      return source.map(d => ({
        label: d.unit_codes 
          ? `${d.date_formatted ? d.date_formatted.substring(0, 5) : d.date} [${d.unit_codes}]` 
          : (d.date_formatted ? d.date_formatted.substring(0, 5) : d.date),
        shortDate: d.date_formatted ? d.date_formatted.substring(0, 5) : d.date,
        fullDate: d.date_formatted,
        day: d.day_name,
        unitCodes: d.unit_codes || '',
        demanded: Number(d.total_packets || 0),
        delivered: Number(d.delivered_packets || 0),
        amount: Number(d.delivered_amount || 0)
      }));
    } else if (periodTab === 'weekly') {
      source = [...analyticsData.weekly].reverse();
      return source.map(w => ({
        label: `W${w.week_number}`,
        fullDate: `${w.week_start} - ${w.week_end}`,
        demanded: Number(w.total_packets || 0),
        delivered: Number(w.delivered_packets || 0),
        amount: Number(w.delivered_amount || 0)
      }));
    } else if (periodTab === 'monthly') {
      source = [...analyticsData.monthly].reverse();
      return source.map(m => ({
        label: m.month_name?.substring(0, 3) || m.month_number,
        fullName: m.month_name,
        demanded: Number(m.total_packets || 0),
        delivered: Number(m.delivered_packets || 0),
        amount: Number(m.delivered_amount || 0)
      }));
    } else {
      source = [...analyticsData.annually].reverse();
      return source.map(a => ({
        label: a.year,
        demanded: Number(a.total_packets || 0),
        delivered: Number(a.delivered_packets || 0),
        amount: Number(a.delivered_amount || 0)
      }));
    }
  }, [analyticsData, periodTab]);

  // Chart Data Preparation: By Unit Code
  const unitChartData = useMemo(() => {
    const list = analyticsData.unitDistribution || [];
    return list.map(u => ({
      label: u.unit_code || (u.unit_name ? u.unit_name.substring(0, 10) : 'UNIT'),
      unitCode: u.unit_code || 'UNIT',
      unitName: u.unit_name,
      demanded: Number(u.total_packets || 0),
      delivered: Number(u.delivered_packets || 0),
      amount: Number(u.delivered_amount || 0),
      rate: Number(u.total_packets || 0) > 0 
        ? Math.round((Number(u.delivered_packets || 0) / Number(u.total_packets || 1)) * 100) 
        : 0
    }));
  }, [analyticsData.unitDistribution]);

  const activeChartData = chartDimension === 'unit' ? unitChartData : trendData;

  // Status Pie Chart Data
  const statusPieData = useMemo(() => {
    const list = analyticsData[periodTab] || [];
    let delivered = 0;
    let transit = 0;
    let approved = 0;
    let pending = 0;

    list.forEach(item => {
      delivered += Number(item.delivered_count || 0);
      transit += Number(item.transit_count || 0);
      approved += Number(item.approved_count || 0);
      pending += Number(item.pending_count || 0);
    });

    const res = [];
    if (delivered > 0) res.push({ name: 'Delivered', value: delivered, color: '#10B981' });
    if (transit > 0) res.push({ name: 'In Transit', value: transit, color: '#F59E0B' });
    if (approved > 0) res.push({ name: 'Approved', value: approved, color: '#3B82F6' });
    if (pending > 0) res.push({ name: 'Pending Review', value: pending, color: '#8B5CF6' });
    return res.length > 0 ? res : [{ name: 'No Demands', value: 1, color: '#E2E8F0' }];
  }, [analyticsData, periodTab]);

  // Calculate Active Table Totals
  const activeList = analyticsData[periodTab] || [];
  const grandTotalDemands = activeList.reduce((acc, r) => acc + Number(r.demand_count || 0), 0);
  const grandTotalPackets = activeList.reduce((acc, r) => acc + Number(r.total_packets || 0), 0);
  const grandTotalDeliveredPkts = activeList.reduce((acc, r) => acc + Number(r.delivered_packets || 0), 0);
  const grandTotalAmount = activeList.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
  const grandTotalDeliveredAmount = activeList.reduce((acc, r) => acc + Number(r.delivered_amount || 0), 0);

  return (
    <div className="w-full space-y-6">

      {/* ========================================================================= */}
      {/* SCREEN VIEW ONLY (HIDDEN DURING PRINT)                                     */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-6">

        {/* Top Header Card with Light Modern Styling */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm shadow-indigo-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Operations & Dispatch Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live System
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive multi-period dispatch intelligence, demand fulfillment analytics & printable reports
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation Link to Demands */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/demands"
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 shadow-xs transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Manage Demands
            </Link>
            <button
              onClick={exportToExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download clean Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel Export
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Print official report with logo and heading"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Global Controls & Period Selectors */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Period Tabs: Day-wise, Weekly, Monthly, Annually */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar gap-1">
            {[
              { id: 'daily', label: 'Day-wise (Daily)' },
              { id: 'weekly', label: 'Weekly Summary' },
              { id: 'monthly', label: 'Monthly Report' },
              { id: 'annually', label: 'Annually' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPeriodTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  periodTab === tab.id
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Year & Unit Filter Dropdowns */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="ALL">All Years</option>
              </select>
            </div>

            {/* NCC Unit Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Unit:</span>
              <select
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setSelectedInstitutionId('ALL');
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs max-w-xs cursor-pointer truncate"
              >
                <option value="ALL">All NCC Units (Consolidated)</option>
                {unitsList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.unit_code ? `[${u.unit_code}] ` : ''}{u.unit_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Institution:</span>
              <select
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs max-w-xs cursor-pointer truncate"
              >
                <option value="ALL">All Institutions</option>
                {institutionsList
                  .filter(i => selectedUnitId === 'ALL' || String(i.unit_id) === String(selectedUnitId))
                  .map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchDashboardAnalytics}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Cards (6 Cards, Clean Light UI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Card 1: Total Demands */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Demands</span>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {Number(kpis.total_demands || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              {currentUnitName}
            </div>
          </div>

          {/* Card 2: Total Packets Demanded */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Demanded</span>
              <Package className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-700">
              {Number(kpis.total_packets_demanded || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-1">
              Total packets requested
            </div>
          </div>

          {/* Card 3: Packets in Transit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-amber-600 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>In Transit</span>
              <Truck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              {Number(kpis.total_packets_in_transit || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              Dispatched & on route
            </div>
          </div>

          {/* Card 4: Packets Delivered */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between text-emerald-600 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {Number(kpis.total_packets_delivered || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">
              Verified & completed
            </div>
          </div>

          {/* Card 5: Amount Delivered */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Delivered Value</span>
              <IndianRupee className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 truncate">
              ₹{Number(kpis.total_amount_delivered || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">
              Billed & fulfilled amount
            </div>
          </div>

          {/* Card 6: Fulfillment Rate */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Fulfillment Rate</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700">
              {Number(kpis.total_packets_demanded || 0) > 0 
                ? Math.round((Number(kpis.total_packets_delivered || 0) / Number(kpis.total_packets_demanded || 1)) * 100) 
                : 0}%
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              Completion ratio
            </div>
          </div>
        </div>

        {/* Visual Charts Grid (Interactive Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Chart: Volume Trend (Packets Demanded vs Delivered) with Bar & Unit Code Switcher */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  {chartType === 'bar' ? (
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  )}
                  {chartDimension === 'unit' 
                    ? 'Dispatch & Delivery Volume by Unit Code' 
                    : `Dispatch & Delivery Volume Trend (${periodTab.toUpperCase()})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {chartDimension === 'unit' 
                    ? 'Packets demanded vs packets delivered grouped by NCC Unit Code' 
                    : 'Packets demanded vs packets delivered over the selected timeline'}
                </p>
              </div>

              {/* Chart Mode & Type Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Switcher 1: Group By Unit Code vs Timeline */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 gap-0.5">
                  <button
                    onClick={() => setChartDimension('unit')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartDimension === 'unit'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="View bars grouped by Unit Code"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    By Unit Code
                  </button>
                  <button
                    onClick={() => setChartDimension('timeline')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartDimension === 'timeline'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="View over timeline"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Timeline
                  </button>
                </div>

                {/* Switcher 2: Bar Chart vs Area Trend */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 gap-0.5">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Switch to Bar Chart"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Switch to Area Trend"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trend
                  </button>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              {activeChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                  No data points recorded for this selection.
                </div>
              ) : chartType === 'bar' ? (
                /* BAR CHART (WITH UNIT CODE OR TIMELINE) */
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartData} margin={{ top: 24, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="label" 
                      stroke="#64748B" 
                      fontSize={11} 
                      tickLine={false} 
                      tick={{ fontWeight: 700 }}
                    />
                    <YAxis 
                      stroke="#64748B" 
                      fontSize={11} 
                      tickLine={false} 
                      domain={[0, (dataMax) => Math.max(10, Math.ceil(dataMax * 1.22))]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[210px]">
                            <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1">
                              {data.unitName ? (
                                <div>
                                  <span className="text-blue-700 font-mono font-black">[{data.unitCode}]</span> {data.unitName}
                                </div>
                              ) : (
                                <div>
                                  {data.fullDate || data.label} {data.day && `(${data.day})`}
                                  {data.unitCodes && (
                                    <div className="text-[10px] text-blue-600 font-mono mt-0.5 font-bold">
                                      Unit: {data.unitCodes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-blue-700 font-bold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Packets Demanded:
                              </span>
                              <span>{Number(data.demanded || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-700 font-bold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Packets Delivered:
                              </span>
                              <span>{Number(data.delivered || 0).toLocaleString('en-IN')}</span>
                            </div>
                            {data.amount > 0 && (
                              <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100 text-[11px]">
                                <span>Delivered Value:</span>
                                <span className="font-bold text-slate-900">₹{Number(data.amount || 0).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {data.rate !== undefined && (
                              <div className="text-[10px] font-bold text-emerald-600 text-right">
                                {data.rate}% Fulfilled
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="demanded" name="Packets Demanded" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList 
                        dataKey="demanded" 
                        position="top" 
                        fill="#1D4ED8" 
                        fontSize={11} 
                        fontWeight={800} 
                        offset={6}
                        formatter={(val) => val > 0 ? Number(val).toLocaleString('en-IN') : ''}
                      />
                    </Bar>
                    <Bar dataKey="delivered" name="Packets Delivered" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList 
                        dataKey="delivered" 
                        position="top" 
                        fill="#047857" 
                        fontSize={11} 
                        fontWeight={800} 
                        offset={6}
                        formatter={(val) => val > 0 ? Number(val).toLocaleString('en-IN') : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                /* AREA TREND CHART */
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDemanded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[210px]">
                            <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1">
                              {data.unitName ? (
                                <div>
                                  <span className="text-blue-700 font-mono font-black">[{data.unitCode}]</span> {data.unitName}
                                </div>
                              ) : (
                                <div>
                                  {data.fullDate || data.label} {data.day && `(${data.day})`}
                                  {data.unitCodes && (
                                    <div className="text-[10px] text-blue-600 font-mono mt-0.5 font-bold">
                                      Unit: {data.unitCodes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-blue-700 font-bold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Packets Demanded:
                              </span>
                              <span>{Number(data.demanded || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-700 font-bold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Packets Delivered:
                              </span>
                              <span>{Number(data.delivered || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="demanded" name="Packets Demanded" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDemanded)" />
                    <Area type="monotone" dataKey="delivered" name="Packets Delivered" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDelivered)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Status Breakdown Donut Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
            <div className="mb-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Fulfillment Status Distribution
              </h3>
              <p className="text-xs text-slate-500">Breakdown of demands by execution stage</p>
            </div>

            <div className="h-56 w-full flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabular Reports Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                {periodTab === 'daily' && 'Day-wise Refreshment Dispatch Records'}
                {periodTab === 'weekly' && 'Weekly Consolidated Dispatch Records'}
                {periodTab === 'monthly' && 'Monthly Refreshment Dispatch Records'}
                {periodTab === 'annually' && 'Annual Refreshment Dispatch Records'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete breakdown for {selectedYear} • {currentUnitName} • {activeList.length} periodic records
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Active Table (.xlsx)
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Table
              </button>
            </div>
          </div>

          {/* Tabular Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                {periodTab === 'daily' && (
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Demand Date</th>
                    <th className="p-3.5">Day</th>
                    <th className="p-3.5">Demands</th>
                    <th className="p-3.5">Units</th>
                    <th className="p-3.5">Institutes</th>
                    <th className="p-3.5">Total Packets</th>
                    <th className="p-3.5">Delivered Pkts</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Delivered Amount</th>
                    <th className="p-3.5">Status Breakdown</th>
                  </tr>
                )}

                {periodTab === 'weekly' && (
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Week Period</th>
                    <th className="p-3.5">Week #</th>
                    <th className="p-3.5">Demands</th>
                    <th className="p-3.5">Units</th>
                    <th className="p-3.5">Institutes</th>
                    <th className="p-3.5">Total Packets</th>
                    <th className="p-3.5">Delivered Pkts</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Delivered Amount</th>
                    <th className="p-3.5">Fulfillment Status</th>
                  </tr>
                )}

                {periodTab === 'monthly' && (
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Month</th>
                    <th className="p-3.5">Month Code</th>
                    <th className="p-3.5">Demands</th>
                    <th className="p-3.5">Units</th>
                    <th className="p-3.5">Institutes</th>
                    <th className="p-3.5">Total Packets</th>
                    <th className="p-3.5">Delivered Pkts</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Delivered Amount</th>
                    <th className="p-3.5">Fulfillment Rate</th>
                  </tr>
                )}

                {periodTab === 'annually' && (
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Year</th>
                    <th className="p-3.5">Demands Count</th>
                    <th className="p-3.5">Units Active</th>
                    <th className="p-3.5">Institutes Active</th>
                    <th className="p-3.5">Total Packets Demanded</th>
                    <th className="p-3.5">Packets Delivered</th>
                    <th className="p-3.5">Total Value (₹)</th>
                    <th className="p-3.5">Delivered Value (₹)</th>
                    <th className="p-3.5">Fulfillment %</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-slate-500 font-medium">
                      No records found for the selected {periodTab} period in {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  activeList.map((row, idx) => {
                    const deliveredPct = Number(row.total_packets || 0) > 0
                      ? Math.round((Number(row.delivered_packets || 0) / Number(row.total_packets || 1)) * 100)
                      : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-400">{idx + 1}</td>
                        
                        {periodTab === 'daily' && (
                          <>
                            <td className="p-3.5 font-bold text-blue-700 whitespace-nowrap">
                              {row.date_formatted || row.date}
                            </td>
                            <td className="p-3.5 font-medium text-slate-600 whitespace-nowrap">{row.day_name}</td>
                            <td className="p-3.5 font-semibold text-slate-800">{row.demand_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.unit_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.institution_count}</td>
                            <td className="p-3.5 font-bold text-slate-900">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-600">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-semibold text-slate-700">₹{Number(row.total_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-700">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                {deliveredPct}% Fulfilled
                              </span>
                            </td>
                          </>
                        )}

                        {periodTab === 'weekly' && (
                          <>
                            <td className="p-3.5 font-bold text-blue-700 whitespace-nowrap">
                              {row.week_start} - {row.week_end}
                            </td>
                            <td className="p-3.5 font-medium text-slate-600">Week {row.week_number}</td>
                            <td className="p-3.5 font-semibold text-slate-800">{row.demand_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.unit_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.institution_count}</td>
                            <td className="p-3.5 font-bold text-slate-900">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-600">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-semibold text-slate-700">₹{Number(row.total_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-700">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                {deliveredPct}% Completed
                              </span>
                            </td>
                          </>
                        )}

                        {periodTab === 'monthly' && (
                          <>
                            <td className="p-3.5 font-bold text-blue-700">{row.month_name}</td>
                            <td className="p-3.5 font-mono text-slate-500">{row.month_key}</td>
                            <td className="p-3.5 font-semibold text-slate-800">{row.demand_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.unit_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.institution_count}</td>
                            <td className="p-3.5 font-bold text-slate-900">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-600">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-semibold text-slate-700">₹{Number(row.total_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-700">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                {deliveredPct}% Rate
                              </span>
                            </td>
                          </>
                        )}

                        {periodTab === 'annually' && (
                          <>
                            <td className="p-3.5 font-black text-blue-800">{row.year}</td>
                            <td className="p-3.5 font-semibold text-slate-800">{row.demand_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.unit_count}</td>
                            <td className="p-3.5 font-medium text-slate-600">{row.institution_count}</td>
                            <td className="p-3.5 font-bold text-slate-900">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-600">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-semibold text-slate-700">₹{Number(row.total_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-bold text-emerald-700">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 text-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                {deliveredPct}% Full
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Grand Total Row */}
              {activeList.length > 0 && (
                <tfoot className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3.5 text-xs uppercase" colSpan={periodTab === 'annually' ? 2 : 3}>
                      Grand Total
                    </td>
                    <td className="p-3.5">{grandTotalDemands.toLocaleString('en-IN')}</td>
                    <td className="p-3.5">-</td>
                    <td className="p-3.5">-</td>
                    <td className="p-3.5 text-indigo-900">{grandTotalPackets.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-emerald-700">{grandTotalDeliveredPkts.toLocaleString('en-IN')}</td>
                    <td className="p-3.5">₹{grandTotalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-emerald-800">₹{grandTotalDeliveredAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-xs font-black">
                      {grandTotalPackets > 0 ? Math.round((grandTotalDeliveredPkts / grandTotalPackets) * 100) : 0}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT VIEW ONLY (EXACTLY AS REQUIRED: LOGO ON LEFT, HEADING & PURE DATA) */}
      {/* ========================================================================= */}
      <div className="hidden print:block w-full text-black bg-white">
        
        {/* Official Header with Left Side Logo */}
        <div className="relative w-full flex items-center min-h-[90px] pb-3 border-b-2 border-black">
          {/* Company Logo strictly on Far Left Side */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
            <div className="w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden border-2 border-black rounded-xl bg-white p-1">
              <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Truly Center-Aligned Title Details */}
          <div className="w-full text-center px-24">
            <h1 className="text-xl font-black uppercase tracking-wider text-black leading-tight">
              FLAVOUR BASE INDIA LLP
            </h1>
            <p className="text-[10pt] font-black uppercase tracking-widest text-slate-800 mt-0.5">
              NCC REFRESHMENT DEMAND & SUPPLY SYSTEM
            </p>
            <h2 className="text-[12pt] font-black uppercase text-black tracking-tight mt-1 underline">
              {periodTab === 'daily' && 'DAY-WISE REFRESHMENT DISPATCH & DELIVERY REPORT'}
              {periodTab === 'weekly' && 'WEEKLY CONSOLIDATED REFRESHMENT DISPATCH REPORT'}
              {periodTab === 'monthly' && 'MONTHLY EXECUTIVE REFRESHMENT REPORT'}
              {periodTab === 'annually' && 'ANNUAL CONSOLIDATED REFRESHMENT DISPATCH REPORT'}
            </h2>
          </div>
        </div>

        {/* Print Sub-meta bar */}
        <div className="w-full flex justify-between items-center text-[9pt] font-bold text-black py-2 border-b border-black uppercase">
          <div>
            <span>YEAR: <strong>{selectedYear}</strong></span>
            <span className="ml-6">UNIT: <strong>{currentUnitName}</strong></span>
            <span className="ml-6">PERIOD: <strong>{periodTab.toUpperCase()}</strong></span>
          </div>
          <div>
            <span>REPORT GENERATED: <strong>{formatDMY(new Date())}</strong></span>
          </div>
        </div>

        {/* Clean Printable Table with Official Black Borders */}
        <div className="mt-4 w-full">
          <table className="w-full text-left text-[9pt] border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-black font-black uppercase">
                <th className="border border-black p-2 text-center w-8">#</th>
                {periodTab === 'daily' && (
                  <>
                    <th className="border border-black p-2">Demand Date</th>
                    <th className="border border-black p-2">Day</th>
                    <th className="border border-black p-2 text-center">Demands</th>
                    <th className="border border-black p-2 text-center">Units</th>
                    <th className="border border-black p-2 text-center">Institutes</th>
                    <th className="border border-black p-2 text-right">Packets Demanded</th>
                    <th className="border border-black p-2 text-right">Packets Delivered</th>
                    <th className="border border-black p-2 text-right">Delivered Amount (₹)</th>
                    <th className="border border-black p-2 text-center">Fulfillment %</th>
                  </>
                )}

                {periodTab === 'weekly' && (
                  <>
                    <th className="border border-black p-2">Week Period</th>
                    <th className="border border-black p-2 text-center">Week #</th>
                    <th className="border border-black p-2 text-center">Demands</th>
                    <th className="border border-black p-2 text-center">Units</th>
                    <th className="border border-black p-2 text-center">Institutes</th>
                    <th className="border border-black p-2 text-right">Packets Demanded</th>
                    <th className="border border-black p-2 text-right">Packets Delivered</th>
                    <th className="border border-black p-2 text-right">Delivered Amount (₹)</th>
                    <th className="border border-black p-2 text-center">Fulfillment %</th>
                  </>
                )}

                {periodTab === 'monthly' && (
                  <>
                    <th className="border border-black p-2">Month</th>
                    <th className="border border-black p-2 text-center">Code</th>
                    <th className="border border-black p-2 text-center">Demands</th>
                    <th className="border border-black p-2 text-center">Units</th>
                    <th className="border border-black p-2 text-center">Institutes</th>
                    <th className="border border-black p-2 text-right">Packets Demanded</th>
                    <th className="border border-black p-2 text-right">Packets Delivered</th>
                    <th className="border border-black p-2 text-right">Delivered Amount (₹)</th>
                    <th className="border border-black p-2 text-center">Fulfillment %</th>
                  </>
                )}

                {periodTab === 'annually' && (
                  <>
                    <th className="border border-black p-2 text-center">Year</th>
                    <th className="border border-black p-2 text-center">Demands</th>
                    <th className="border border-black p-2 text-center">Units Active</th>
                    <th className="border border-black p-2 text-center">Institutes Active</th>
                    <th className="border border-black p-2 text-right">Total Packets Demanded</th>
                    <th className="border border-black p-2 text-right">Packets Delivered</th>
                    <th className="border border-black p-2 text-right">Delivered Amount (₹)</th>
                    <th className="border border-black p-2 text-center">Fulfillment %</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="border border-black p-4 text-center font-bold">
                    No data recorded for this period.
                  </td>
                </tr>
              ) : (
                activeList.map((row, idx) => {
                  const rate = Number(row.total_packets || 0) > 0 
                    ? Math.round((Number(row.delivered_packets || 0) / Number(row.total_packets || 1)) * 100) 
                    : 0;

                  return (
                    <tr key={idx} className="border-b border-black">
                      <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                      
                      {periodTab === 'daily' && (
                        <>
                          <td className="border border-black p-2 font-bold">{row.date_formatted || row.date}</td>
                          <td className="border border-black p-2">{row.day_name}</td>
                          <td className="border border-black p-2 text-center font-semibold">{row.demand_count}</td>
                          <td className="border border-black p-2 text-center">{row.unit_count}</td>
                          <td className="border border-black p-2 text-center">{row.institution_count}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-black">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-center font-bold">{rate}%</td>
                        </>
                      )}

                      {periodTab === 'weekly' && (
                        <>
                          <td className="border border-black p-2 font-bold">{row.week_start} - {row.week_end}</td>
                          <td className="border border-black p-2 text-center">W{row.week_number}</td>
                          <td className="border border-black p-2 text-center font-semibold">{row.demand_count}</td>
                          <td className="border border-black p-2 text-center">{row.unit_count}</td>
                          <td className="border border-black p-2 text-center">{row.institution_count}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-black">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-center font-bold">{rate}%</td>
                        </>
                      )}

                      {periodTab === 'monthly' && (
                        <>
                          <td className="border border-black p-2 font-bold">{row.month_name}</td>
                          <td className="border border-black p-2 text-center">{row.month_key}</td>
                          <td className="border border-black p-2 text-center font-semibold">{row.demand_count}</td>
                          <td className="border border-black p-2 text-center">{row.unit_count}</td>
                          <td className="border border-black p-2 text-center">{row.institution_count}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-black">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-center font-bold">{rate}%</td>
                        </>
                      )}

                      {periodTab === 'annually' && (
                        <>
                          <td className="border border-black p-2 text-center font-black">{row.year}</td>
                          <td className="border border-black p-2 text-center font-semibold">{row.demand_count}</td>
                          <td className="border border-black p-2 text-center">{row.unit_count}</td>
                          <td className="border border-black p-2 text-center">{row.institution_count}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.total_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-bold">{Number(row.delivered_packets || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-right font-black">₹{Number(row.delivered_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="border border-black p-2 text-center font-bold">{rate}%</td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {activeList.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-black font-black bg-slate-100">
                  <td className="border border-black p-2 text-center uppercase" colSpan={periodTab === 'annually' ? 1 : 3}>
                    TOTAL
                  </td>
                  <td className="border border-black p-2 text-center">{grandTotalDemands}</td>
                  <td className="border border-black p-2 text-center">-</td>
                  <td className="border border-black p-2 text-center">-</td>
                  <td className="border border-black p-2 text-right font-bold">{grandTotalPackets.toLocaleString('en-IN')}</td>
                  <td className="border border-black p-2 text-right font-bold">{grandTotalDeliveredPkts.toLocaleString('en-IN')}</td>
                  <td className="border border-black p-2 text-right font-black">₹{grandTotalDeliveredAmount.toLocaleString('en-IN')}</td>
                  <td className="border border-black p-2 text-center">
                    {grandTotalPackets > 0 ? Math.round((grandTotalDeliveredPkts / grandTotalPackets) * 100) : 0}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Official Signatures Footer Block */}
        <div className="mt-12 pt-8 w-full flex justify-between items-end text-[9pt] font-black uppercase text-black">
          <div className="text-center w-48 border-t border-black pt-1">
            <span>Prepared By</span>
            <div className="text-[8pt] font-normal lowercase text-slate-700">Vendor Operations Desk</div>
          </div>
          <div className="text-center w-48 border-t border-black pt-1">
            <span>Verified By</span>
            <div className="text-[8pt] font-normal lowercase text-slate-700">NCC Liaison Officer</div>
          </div>
          <div className="text-center w-48 border-t border-black pt-1">
            <span>Authorized Signatory</span>
            <div className="text-[8pt] font-normal lowercase text-slate-700">Flavour Base India LLP</div>
          </div>
        </div>

      </div>

    </div>
  );
}
