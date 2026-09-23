import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  FileSpreadsheet, FileText, Download, Filter, Layers, BarChart3, TrendingUp, ShieldCheck, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CustomDateInput from '../components/CustomDateInput';

export default function ReportsPage() {
  const { user, token } = useAuth();
  const reportRef = useRef();

  const [activeTab, setActiveTab] = useState('cumulative'); // 'cumulative' | 'utilization' | 'periodic'

  // Data states
  const [summary, setSummary] = useState(null);
  const [periodic, setPeriodic] = useState({ monthly: [], weekly: [] });
  const [cumulative, setCumulative] = useState([]);
  const [utilization, setUtilization] = useState([]);

  // Filter dropdown master lists
  const [units, setUnits] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [catalog, setCatalog] = useState([]);

  // Active Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedInst, setSelectedInst] = useState('');
  const [selectedYearGroup, setSelectedYearGroup] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');
  const [invoiceStartNo, setInvoiceStartNo] = useState(1);
  const [invoiceDates, setInvoiceDates] = useState({});
  const [invoiceNos, setInvoiceNos] = useState({});

  const [loading, setLoading] = useState(true);

  const handleGenerateInvoices = () => {
    const newNos = {};
    let currentNo = parseInt(invoiceStartNo, 10) || 1;
    cumulative.forEach((row, idx) => {
      newNos[idx] = `${invoicePrefix}${currentNo.toString().padStart(3, '0')}`;
      currentNo++;
    });
    setInvoiceNos(newNos);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCumulative();
  }, [startDate, endDate, selectedUnit, selectedInst, selectedYearGroup, selectedItem, selectedStatus]);

  const fetchInitialData = async () => {
    try {
      // Summary
      const sumRes = await fetch('/api/reports/summary', { headers: { Authorization: `Bearer ${token}` } });
      setSummary(await sumRes.json());

      // Periodic
      const perRes = await fetch('/api/reports/periodic', { headers: { Authorization: `Bearer ${token}` } });
      setPeriodic(await perRes.json());

      // Utilization
      const utiRes = await fetch('/api/reports/utilization', { headers: { Authorization: `Bearer ${token}` } });
      setUtilization(await utiRes.json());

      // Master options for filters
      if (user.role === 'ADMIN') {
        const uRes = await fetch('/api/units', { headers: { Authorization: `Bearer ${token}` } });
        const uData = await uRes.json();
        setUnits(Array.isArray(uData) ? uData : []);
      }
      const iRes = await fetch('/api/institutions', { headers: { Authorization: `Bearer ${token}` } });
      const iData = await iRes.json();
      setInstitutions(Array.isArray(iData) ? iData : []);

      const cRes = await fetch('/api/catalog', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      setCatalog(Array.isArray(cData) ? cData : []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCumulative = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedUnit) params.append('unit_id', selectedUnit);
      if (selectedInst) params.append('institution_id', selectedInst);
      if (selectedYearGroup) params.append('year_group', selectedYearGroup);
      if (selectedItem) params.append('item_id', selectedItem);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/reports/cumulative?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCumulative(data);
    } catch (err) {
      console.error(err);
    }
  };

  // EXPORT TO EXCEL
  const exportToExcel = () => {
    let exportData = [];
    let fileName = 'NCC_Demand_Report.xlsx';

    if (activeTab === 'cumulative') {
      exportData = cumulative.map((r, idx) => ({
        'S.NO': idx + 1,
        'DATE OF SUPPLY': r.demand_date,
        'UNIT': r.unit_name,
        'INSTITUTION WITH ADDRESS': `${r.institution_name}${r.complete_address ? ', ' + r.complete_address : (r.google_location ? ', ' + r.google_location : '')}`,
        'PLACE OF SUPPLY': 'DELHI',
        'INVOICE DATE': invoiceDates[idx] || '',
        'INVOICE NO': invoiceNos[idx] || '',
        'ITEM': 'Refreshment Packet',
        'QTY': r.quantity,
        'RATE INCL GST': r.unit_price_snapshot,
        'AMOUNT': r.line_total
      }));
      fileName = 'NCC_Cumulative_Demand_Report.xlsx';
    } else if (activeTab === 'utilization') {
      exportData = utilization.map(u => ({
        'NCC Unit': u.unit_name,
        'Institution': u.institution_name,
        'Sanctioned Strength (1st Yr)': u.strength.y1,
        'Sanctioned Strength (2nd Yr)': u.strength.y2,
        'Sanctioned Strength (3rd Yr)': u.strength.y3,
        'Total Sanctioned Cadets': u.strength.total,
        'Demand Raised (1st Yr)': u.raised.y1,
        'Demand Raised (2nd Yr)': u.raised.y2,
        'Demand Raised (3rd Yr)': u.raised.y3,
        'Total Raised Cadets': u.raised.total,
        'Utilization Percentage (%)': `${u.utilization_pct}%`
      }));
      fileName = 'NCC_Institution_Utilization_Report.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, fileName);
  };

  // EXPORT TO PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('NCC_Refreshment_System_Report.pdf');
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF export.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Generating reports & analytics...</div>;
  }

  // Chart data preparation
  const pieColors = ['#f59e0b', '#3b82f6', '#ef4444', '#64748b', '#10b981'];
  const statusPieData = (summary && summary.summary) ? [
    { name: 'Pending', value: summary.summary.PENDING },
    { name: 'Approved', value: summary.summary.APPROVED },
    { name: 'Rejected', value: summary.summary.REJECTED },
    { name: 'Cancelled', value: summary.summary.CANCELLED },
    { name: 'Fulfilled', value: summary.summary.FULFILLED }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytical Insights</h2>
          <p className="text-sm text-slate-500">
            Role-scoped demand metrics, periodic aggregations, institution strength utilization & PDF/Excel exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-slate-900 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Canvas for PDF Capture */}
      <div ref={reportRef} className="space-y-6 p-2">

        {/* SUMMARY KPI BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <span className="text-xs font-semibold text-amber-400 uppercase">Pending</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{summary?.summary?.PENDING || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <span className="text-xs font-semibold text-blue-600 uppercase">Approved</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{summary?.summary?.APPROVED || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <span className="text-xs font-semibold text-rose-600 uppercase">Rejected</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{summary?.summary?.REJECTED || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">Cancelled</span>
            <div className="text-2xl font-black text-slate-700 mt-1">{summary?.summary?.CANCELLED || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Fulfilled</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summary?.summary?.FULFILLED || 0}</div>
          </div>
        </div>

        {/* CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend Bar Chart */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Monthly Demand Expenditure Trend (₹)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodic.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Bar dataKey="total_cost" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Total Cost (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Demand Status Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* REPORT TYPE TABS */}
        <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('cumulative')}
            className={`pb-3 transition-all border-b-2 ${
              activeTab === 'cumulative' ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Filterable Cumulative Demand Report ({cumulative.length} rows)
          </button>

          <button
            onClick={() => setActiveTab('utilization')}
            className={`pb-3 transition-all border-b-2 ${
              activeTab === 'utilization' ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Institution Strength Utilization Report ({utilization.length} institutions)
          </button>
        </div>

        {/* CUMULATIVE TAB FILTERS & TABLE */}
        {activeTab === 'cumulative' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>

              {user.role === 'ADMIN' && (
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">NCC Unit</label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                  >
                    <option value="">All Units</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.unit_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(user.role === 'ADMIN' || user.role === 'UNIT') && (
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Institution</label>
                  <select
                    value={selectedInst}
                    onChange={(e) => setSelectedInst(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                  >
                    <option value="">All Institutions</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>{i.institution_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Year Group</label>
                <select
                  value={selectedYearGroup}
                  onChange={(e) => setSelectedYearGroup(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                >
                  <option value="">All Year Groups</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Refreshment Item</label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                >
                  <option value="">All Catalog Items</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>{c.item_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Invoice Generation Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4">
              <span className="text-blue-800 font-bold text-sm">Invoice Setup:</span>
              <input type="text" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} placeholder="Prefix (e.g. INV-)" className="p-1.5 text-xs rounded border border-blue-200" />
              <input type="number" value={invoiceStartNo} onChange={e => setInvoiceStartNo(e.target.value)} placeholder="Start No." className="p-1.5 text-xs rounded border border-blue-200 w-24" />
              <button onClick={handleGenerateInvoices} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors shadow-sm">Auto Generate Invoice Nos</button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/80 uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3 whitespace-nowrap">S.NO</th>
                      <th className="p-3 whitespace-nowrap">DATE OF SUPPLY</th>
                      <th className="p-3 whitespace-nowrap">UNIT</th>
                      <th className="p-3">INSTITUTION WITH ADDRESS</th>
                      <th className="p-3 text-center whitespace-nowrap">PLACE OF SUPPLY</th>
                      <th className="p-3 text-center whitespace-nowrap">INVOICE DATE</th>
                      <th className="p-3 text-center whitespace-nowrap">INVOICE NO</th>
                      <th className="p-3 whitespace-nowrap">ITEM</th>
                      <th className="p-3 text-right whitespace-nowrap">QTY</th>
                      <th className="p-3 text-right whitespace-nowrap">RATE INCL GST</th>
                      <th className="p-3 text-right whitespace-nowrap">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cumulative.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="p-8 text-center text-slate-500 font-medium text-sm">
                          No demands found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      cumulative.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/50">
                          <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-700 whitespace-nowrap">{row.demand_date}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{row.unit_name}</td>
                          <td className="p-3 text-slate-900 font-semibold min-w-[200px]" title={`${row.institution_name}${row.complete_address ? ', ' + row.complete_address : ''}`}>
                            {row.institution_name}
                            <div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{row.complete_address || row.google_location || 'Address not provided'}</div>
                          </td>
                          <td className="p-3 text-slate-700 text-center font-semibold">DELHI</td>
                          <td className="p-3 text-center min-w-[130px]">
                            <CustomDateInput
                              compact
                              value={invoiceDates[idx] || ''}
                              onChange={val => setInvoiceDates({...invoiceDates, [idx]: val})}
                            />
                          </td>
                          <td className="p-3 text-center min-w-[110px]">
                            <input type="text" value={invoiceNos[idx] || ''} onChange={e => setInvoiceNos({...invoiceNos, [idx]: e.target.value})} className="p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full" placeholder="Inv No." />
                          </td>
                          <td className="p-3 text-slate-800 whitespace-nowrap font-medium">Refreshment Packet</td>
                          <td className="p-3 font-bold text-slate-900 text-right">{row.quantity}</td>
                          <td className="p-3 font-bold text-slate-600 text-right">₹{row.unit_price_snapshot}</td>
                          <td className="p-3 font-bold text-emerald-600 text-right">₹{row.line_total.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* UTILIZATION TAB */}
        {activeTab === 'utilization' && (
          <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/80 uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">Institution Name</th>
                    <th className="p-4">NCC Unit</th>
                    <th className="p-4 text-center">Sanctioned Strength (1st / 2nd / 3rd Yr)</th>
                    <th className="p-4 text-center">Demands Raised (1st / 2nd / 3rd Yr)</th>
                    <th className="p-4 text-center">Cadet Vacancy Utilization %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {utilization.map((u) => (
                    <tr key={u.institution_id} className="hover:bg-white/50">
                      <td className="p-4 font-bold text-slate-900 text-sm">{u.institution_name}</td>
                      <td className="p-4 text-slate-700">{u.unit_name}</td>
                      <td className="p-4 text-center font-mono">
                        <span className="text-blue-600 font-bold">{u.strength.y1}</span> /{' '}
                        <span className="text-indigo-400 font-bold">{u.strength.y2}</span> /{' '}
                        <span className="text-purple-400 font-bold">{u.strength.y3}</span>{' '}
                        <span className="text-slate-500">(Total: {u.strength.total})</span>
                      </td>
                      <td className="p-4 text-center font-mono">
                        <span className="text-blue-600 font-bold">{u.raised.y1}</span> /{' '}
                        <span className="text-indigo-400 font-bold">{u.raised.y2}</span> /{' '}
                        <span className="text-purple-400 font-bold">{u.raised.y3}</span>{' '}
                        <span className="text-emerald-600 font-bold">(Total: {u.raised.total})</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 max-w-xs mx-auto">
                          <div className="flex justify-between font-bold text-xs">
                            <span className="text-slate-700">{u.utilization_pct}% Quota Utilized</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                u.utilization_pct > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${u.utilization_pct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
