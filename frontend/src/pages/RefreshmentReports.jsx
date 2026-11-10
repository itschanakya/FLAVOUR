import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, History, Printer, Search, School, TrendingUp, CheckCircle2, Users, IndianRupee, MapPin, Building2, Save, Filter, Layers, FileText, FileSpreadsheet, RefreshCw, Zap, Sparkles, AlertTriangle, X, Mail, Send, Clock, ShieldAlert, ChevronDown, ChevronRight, ChevronUp, CreditCard, Eye, Upload, Paperclip, Check, ExternalLink, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import CustomDateInput from '../components/CustomDateInput';

const formatDate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

const formatDDMMYYYY = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatAmount = (num) => {
  return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getLocalYearMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthLabel = (ym) => {
  if (!ym || !/^\d{4}-\d{2}$/.test(String(ym))) return String(ym || '');
  const [y, m] = String(ym).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
};

const StatCard = ({ icon, label, value, color, sub }) => (
  <div className={`p-4 rounded-xl border border-${color}-200 bg-${color}-50/30`}>
    <div className={`flex items-center gap-2 text-${color}-600 mb-1`}>
      {icon}
      <h4 className="text-[10px] font-black uppercase tracking-widest">{label}</h4>
    </div>
    <p className={`text-2xl font-black text-${color}-900`}>{value}</p>
    {sub && <p className={`text-[9px] font-bold mt-1 text-${color}-700 uppercase`}>{sub}</p>}
  </div>
);

export default function RefreshmentReports({ defaultTab }) {
  const { user, token } = useAuth();
  const isUnit = user?.role === 'UNIT';
  
  const [activeTab, setActiveTab] = useState(() => {
    try {
      if (defaultTab) {
        if (defaultTab === 'ano_bill_returns' && user?.role !== 'UNIT') {
          return 'unitwise_monthly';
        }
        return defaultTab;
      }
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p) {
        if (p === 'ano_bill_returns' && user?.role !== 'UNIT') {
          return 'unitwise_monthly';
        }
        return p;
      }
      const savedTab = sessionStorage.getItem('ncc_reports_active_tab');
      if (savedTab) {
        if (savedTab === 'ano_bill_returns' && user?.role !== 'UNIT') {
          return 'unitwise_monthly';
        }
        return savedTab;
      }
    } catch (e) {}
    return 'unitwise_monthly'; // Default to unitwise monthly summary
  }); // weekly | unitwise_monthly | audit | annual | ano_bill_returns | bill

  useEffect(() => {
    if (defaultTab) {
      if (defaultTab === 'ano_bill_returns' && user?.role !== 'UNIT') {
        setActiveTab('unitwise_monthly');
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [defaultTab, user?.role]);

  useEffect(() => {
    if (user?.role && user.role !== 'UNIT' && activeTab === 'ano_bill_returns') {
      setActiveTab('unitwise_monthly');
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ncc_reports_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);
  const [demands, setDemands] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLandscape, setIsLandscape] = useState(true);
  const [paperSize, setPaperSize] = useState('A4');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [printSpecificWeekKey, setPrintSpecificWeekKey] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  // Re-fetch latest demands and institutions whenever tab is switched or window gains focus
  useEffect(() => {
    fetchData(true);
  }, [activeTab]);

  useEffect(() => {
    const onFocus = () => fetchData(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  
  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [demandsRes, instRes, unitsRes] = await Promise.all([
        fetch('/api/demands', { headers }),
        fetch('/api/institutions', { headers }),
        fetch('/api/units', { headers })
      ]);
      
      const dJson = await demandsRes.json();
      const iJson = await instRes.json();
      const uJson = await unitsRes.json();
      // Exclude CANCELLED and REJECTED demands from all Reports & Analytics views
      const validReportDemands = Array.isArray(dJson)
        ? dJson.filter(d => d && d.status !== 'CANCELLED' && d.status !== 'REJECTED')
        : [];
      setDemands(validReportDemands);
      setInstitutions(Array.isArray(iJson) ? iJson : []);
      setUnits(Array.isArray(uJson) ? uJson : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const body = document.body;
    const printClass = isLandscape ? 'print-landscape' : 'print-portrait';
    const sizeClass = paperSize === 'Legal' ? 'print-legal' : 'print-a4';
    
    body.classList.add(printClass, sizeClass);

    // Inject direct root @page style so Chrome/Edge applies Landscape to 100% of pages (never flips to portrait)
    const existingStyle = document.getElementById('dynamic-print-page-style');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-print-page-style';
    const paperName = paperSize === 'Legal' ? 'legal' : 'A4';
    const orientation = isLandscape ? 'landscape' : 'portrait';
    style.textContent = `@page { size: ${paperName} ${orientation} !important; margin: 10mm 12mm 12mm 12mm !important; }`;
    document.head.appendChild(style);

    setTimeout(() => { window.print(); }, 15);
    
    const handleAfterPrint = () => {
      body.classList.remove(printClass, sizeClass);
      const injected = document.getElementById('dynamic-print-page-style');
      if (injected) injected.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
  };

  const handlePrintWeeklySpecific = (weekKey) => {
    setPrintSpecificWeekKey(weekKey);
    setTimeout(() => {
      const handleRestore = () => {
        setPrintSpecificWeekKey(null);
        window.removeEventListener('afterprint', handleRestore);
      };
      window.addEventListener('afterprint', handleRestore);
      handlePrint();
    }, 10);
  };
  
  const PrintControls = () => (
    <div className="flex flex-wrap items-center gap-4 print:hidden mb-4 bg-white p-2 rounded-xl border border-slate-200">
      <div className="flex items-center gap-2">
        <button onClick={() => setIsLandscape(false)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isLandscape ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Portrait</button>
        <button onClick={() => setIsLandscape(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isLandscape ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Landscape</button>
      </div>
      <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
        <button onClick={() => setPaperSize('A4')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${paperSize === 'A4' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>A4</button>
        <button onClick={() => setPaperSize('Legal')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${paperSize === 'Legal' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Legal</button>
      </div>
      <div className="border-l border-slate-300 pl-4 ml-auto">
        <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg">
          <Printer size={16} /> Print Report
        </button>
      </div>
    </div>
  );

  const PrintHeader = ({ title, period, extraMeta }) => (
    <div className="hidden print:block print-heading w-full">
      <div className="relative w-full flex items-center min-h-[96px] pb-2">
        {/* Company Logo strictly on Far Left Side - Bigger */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center overflow-hidden border-2 border-black rounded-xl bg-[#0d5ea6] p-1.5 shadow-sm">
            <img src="/logo-print.png" alt="Flavour Base Logo" width="96" height="96" decoding="async" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Truly Center-Aligned Title Details */}
        <div className="w-full text-center px-28">
          <h2 className="text-[15pt] font-black uppercase tracking-wider text-black leading-tight">
            FLAVOUR BASE INDIA LLP
          </h2>
          <p className="text-[9.5pt] font-black uppercase tracking-widest text-slate-800 mt-0.5">
            REFRESHMENT PORTAL SYSTEM
          </p>
          <h1 className="text-[12.5pt] font-black uppercase text-black tracking-tight mt-1">
            {title}
          </h1>
        </div>
      </div>

      <div className="w-full flex justify-between items-center text-[8.5pt] font-bold text-black mt-1 pt-1.5 border-t-2 border-black uppercase">
        <div>
          <span>{period}</span>
          {extraMeta && <span className="ml-4 font-bold">{extraMeta}</span>}
        </div>
        <div className="text-right">
          <span>REPORT DATE: <strong className="font-black">{formatDDMMYYYY(new Date())}</strong></span>
        </div>
      </div>
    </div>
  );

  // --- Views ---
  
  const WeeklySummaryView = () => {
    // Group demands by week (Monday-based)
    const filteredDemands = demands.filter(d => selectedGroup === 'All' || d.ncc_group === selectedGroup);
    
    const weeksGrouped = filteredDemands.reduce((acc, d) => {
      if (!d.demand_date) return acc;
      const dateObj = new Date(d.demand_date);
      const day = dateObj.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(dateObj);
      monday.setDate(dateObj.getDate() + diffToMonday);
      const mondayKey = monday.toISOString().split('T')[0];
      
      if (!acc[mondayKey]) acc[mondayKey] = {};
      const inst = d.institution_name || 'UNKNOWN';
      const instData = institutions.find(i => i.institution_name === inst) || {};
      const addrStr = d.complete_address || instData.complete_address || d.google_location || instData.google_location || '';
      const deliveryTime = d.demand_time || '-';
      const demandDate = d.demand_date || '-';
      
      const rowKey = `${inst}_${demandDate}_${deliveryTime}`;

      if (!acc[mondayKey][rowKey]) {
        acc[mondayKey][rowKey] = {
          institution: inst,
          address: addrStr,
          date: demandDate,
          time: deliveryTime,
          days: [0, 0, 0, 0, 0, 0, 0],
          ano: d.ano_cto_name || '-',
        };
      }
      const dayIdx = day === 0 ? 6 : day - 1;
      acc[mondayKey][rowKey].days[dayIdx] += Number(d.total_quantity || 0);
      return acc;
    }, {});

    const sortedWeekKeys = Object.keys(weeksGrouped).sort((a, b) => b.localeCompare(a)).slice(0, 4);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {!printSpecificWeekKey && <PrintControls />}
        {sortedWeekKeys.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No demands found.</div>
        ) : (
          sortedWeekKeys
            .filter(wk => !printSpecificWeekKey || wk === printSpecificWeekKey)
            .map(weekKey => {
            const weekStart = new Date(weekKey);
            const weekDates = Array.from({length: 7}).map((_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            });
            const instData = Object.values(weeksGrouped[weekKey]).sort((a, b) => a.institution.localeCompare(b.institution));
            const dayTotals = [0, 0, 0, 0, 0, 0, 0];
            instData.forEach(row => { row.days.forEach((val, i) => dayTotals[i] += val); });
            const grandTotal = dayTotals.reduce((s, v) => s + v, 0);

            return (
              <div key={weekKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl print:shadow-none print:border-none print:bg-white print:overflow-visible print:rounded-none">
                <PrintHeader title="WEEKLY REFRESHMENT SUMMARY" period={`${weekDates[0]} to ${weekDates[6]}`} />
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-blue-500" />
                    <h3 className="font-black text-sm tracking-widest text-slate-800 uppercase">Program: {weekDates[0]} - {weekDates[6]}</h3>
                  </div>
                  <button onClick={() => handlePrintWeeklySpecific(weekKey)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition-all" title="Print Report">
                    <Printer size={14} /> Print
                  </button>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse min-w-[1200px] table-fixed print:min-w-0 print:w-full print:border print:border-black">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black text-[11px] font-black uppercase text-slate-600">
                        <th className="w-[4%] px-2 py-3.5 text-center print:text-black border border-slate-200 print:border-black">S.NO</th>
                        <th className="w-[20%] px-2 py-3.5 print:text-black border border-slate-200 print:border-black">INSTITUTION & ANO DETAILS</th>
                        <th className="w-[18%] px-2 py-3.5 print:text-black border border-slate-200 print:border-black">ADDRESS</th>
                        <th className="w-[8%] px-2 py-3.5 print:text-black border border-slate-200 print:border-black">DATE</th>
                        <th className="w-[8%] px-2 py-3.5 print:text-black border border-slate-200 print:border-black">TIME</th>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                          <th key={day} className="w-[5%] px-1 py-3 text-center border border-slate-200 print:border-black">
                            <span className="block text-[11px] font-black text-blue-500 print:text-black uppercase">{day}</span>
                            <span className="block text-[9px] font-bold text-slate-500 print:text-slate-700 whitespace-nowrap mt-0.5 uppercase">{weekDates[i]}</span>
                          </th>
                        ))}
                        <th className="w-[7%] px-2 py-3.5 text-center print:text-black text-emerald-600 border border-slate-200 print:border-black">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-black text-xs">
                      {instData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 print:bg-white transition-colors">
                          <td className="px-3 py-3 align-middle text-slate-500 font-normal text-center print:text-black border border-slate-200 print:border-black">{idx + 1}</td>
                          <td className="px-3 py-3 align-middle print:text-black border border-slate-200 print:border-black min-w-[200px]">
                            <div className="font-normal text-slate-800 uppercase">{row.institution}</div>
                            <div className="text-[10px] font-normal text-slate-500 uppercase leading-tight mt-0.5">ANO: {row.ano}</div>
                          </td>
                          <td className="px-3 py-3 align-middle print:border-black text-[10px] font-normal text-slate-500 leading-tight uppercase print:text-black max-w-[200px] border border-slate-200">
                            {row.address || '-'}
                          </td>
                          <td className="px-3 py-3 align-middle print:border-black font-normal text-slate-700 print:text-black whitespace-nowrap border border-slate-200">
                            {formatDate(row.date) || '-'}
                          </td>
                          <td className="px-3 py-3 align-middle print:border-black font-normal text-slate-700 print:text-black whitespace-nowrap border border-slate-200">
                            {row.time || '-'}
                          </td>
                          {row.days.map((val, i) => (
                            <td key={i} className="px-3 py-3 align-middle text-center font-normal text-slate-900 border border-slate-200 print:border-black">
                              <span className={`print:text-black ${val === 0 ? 'text-slate-400' : ''}`}>{val || '-'}</span>
                            </td>
                          ))}
                          <td className="px-3 py-3 align-middle text-center font-normal text-slate-900 border border-slate-200 print:text-black print:border-black bg-emerald-50/10">
                            {row.days.reduce((s, v) => s + v, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-slate-100 print:border-black">
                      <tr className="font-black text-[11px] uppercase text-slate-600">
                        <td colSpan={5} className="px-3 py-3.5 text-right print:text-black border border-slate-200 print:border-black">TOTAL PACKETS</td>
                        {dayTotals.map((tot, i) => (
                          <td key={i} className="px-3 py-3.5 text-center font-normal text-slate-900 border border-slate-200 print:text-black print:border-black">{tot}</td>
                        ))}
                        <td className="px-3 py-3.5 text-center font-normal text-slate-900 border border-slate-200 print:text-black print:border-black">{grandTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const AuditTrailView = () => {
    const isAdmin = user?.role === 'ADMIN';
    const groupBy = 'UNIT';
    const [unitFilter, setUnitFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
    const [invoicePrefix, setInvoicePrefix] = useState('FBI/26-27/');
    const [invoiceStartNo, setInvoiceStartNo] = useState(1000);
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [invoiceDates, setInvoiceDates] = useState({});
    const [invoiceNos, setInvoiceNos] = useState({});
    const [savingInvoices, setSavingInvoices] = useState(false);

    // Sync initial invoice values from fetched demands
    useEffect(() => {
      const initialNos = {};
      const initialDates = {};
      demands.forEach(d => {
        if (d.invoice_no) initialNos[d.id] = d.invoice_no;
        if (d.invoice_date) initialDates[d.id] = d.invoice_date;
      });
      setInvoiceNos(initialNos);
      setInvoiceDates(initialDates);
    }, [demands]);

    // Calculate highest existing serial number globally across ALL demands
    const nextAvailableSerial = useMemo(() => {
      let maxNum = 1000;
      demands.forEach(d => {
        const inv = d.invoice_no;
        if (inv) {
          const match = String(inv).match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= maxNum) maxNum = num + 1;
          }
        }
      });
      return maxNum;
    }, [demands]);

    // Detect duplicate invoice numbers across ALL demands in the system in real time
    const duplicateInvoices = useMemo(() => {
      const counts = {};
      demands.forEach(d => {
        const no = (invoiceNos[d.id] !== undefined ? invoiceNos[d.id] : d.invoice_no);
        if (no && String(no).trim() !== '') {
          const upper = String(no).trim().toUpperCase();
          counts[upper] = (counts[upper] || 0) + 1;
        }
      });
      const dups = new Set();
      Object.entries(counts).forEach(([no, count]) => {
        if (count > 1) dups.add(no);
      });
      return dups;
    }, [demands, invoiceNos]);

    const institutionsMap = useMemo(() => {
      const map = {};
      (institutions || []).forEach(i => {
        if (i && i.id) map[i.id] = i;
      });
      return map;
    }, [institutions]);

    // Available distinct NCC units
    const availableUnits = useMemo(() => {
      return Array.from(new Set(demands.map(d => d.unit_name).filter(Boolean))).sort();
    }, [demands]);

    // Active filtered demands (by Unit, Group and Search)
    const filteredDemands = useMemo(() => {
      return demands.filter(d => {
        if (selectedGroup !== 'All' && d.ncc_group !== selectedGroup) return false;
        if (unitFilter !== 'All' && availableUnits.includes(unitFilter) && d.unit_name !== unitFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mInst = d.institution_name?.toLowerCase().includes(q);
          const mAddr = (d.complete_address || d.google_location || '').toLowerCase().includes(q);
          const mRef = d.demand_number?.toLowerCase().includes(q);
          const mUnit = d.unit_name?.toLowerCase().includes(q);
          const mPurp = d.purpose?.toLowerCase().includes(q);
          const mInv = (invoiceNos[d.id] || d.invoice_no || '')?.toLowerCase().includes(q);
          const mDate = (d.demand_date || '').toLowerCase().includes(q) || formatDDMMYYYY(d.demand_date).toLowerCase().includes(q);
          const mItem = 'refreshment packet'.includes(q) || (d.item_name || '').toLowerCase().includes(q);
          if (!mInst && !mAddr && !mRef && !mUnit && !mPurp && !mInv && !mDate && !mItem) return false;
        }
        return true;
      });
    }, [demands, selectedGroup, unitFilter, searchQuery, invoiceNos]);

    const totalDemandsCount = filteredDemands.length;
    const totalPacketsCount = filteredDemands.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
    const totalCostAmount = filteredDemands.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);

    // Grouping into sections by Unit
    const groupedSections = useMemo(() => {
      const groups = {};

      filteredDemands.forEach(d => {
        const key = d.unit_name || 'Unassigned Unit';
        const title = `NCC Unit: ${key}`;
        const badge = d.ncc_group ? `GP: ${d.ncc_group}` : 'UNIT WISE';

        if (!groups[key]) {
          groups[key] = {
            key,
            title,
            badge,
            items: []
          };
        }
        groups[key].items.push(d);
      });

      Object.values(groups).forEach(g => {
        g.items.sort((a, b) => new Date(a.demand_date) - new Date(b.demand_date));
      });

      return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
    }, [filteredDemands]);

    // Helper: Returns demands in exact visual display order from top to bottom
    const getVisualOrderedDemands = () => {
      const ordered = [];
      groupedSections.forEach(sec => {
        sec.items.forEach(item => ordered.push(item));
      });
      return ordered;
    };

    const parseInvoiceString = (str, fallbackPrefix, fallbackNum) => {
      if (!str || !str.trim()) return { prefix: fallbackPrefix, num: fallbackNum };
      const match = str.trim().match(/^(.*?)(\d+)$/);
      if (match) {
        return { prefix: match[1], num: parseInt(match[2], 10) };
      }
      return { prefix: str.trim(), num: fallbackNum };
    };

    const [autoSaveTimer, setAutoSaveTimer] = useState(null);

    const handleClearAllInvoices = async () => {
      if (!window.confirm("Are you sure you want to completely remove the invoice date and number from ALL currently displayed demands? This will save immediately.")) return;
      
      let nosToUse = { ...invoiceNos };
      let datesToUse = { ...invoiceDates };
      getVisualOrderedDemands().forEach(d => {
        nosToUse[d.id] = '';
        datesToUse[d.id] = '';
      });
      setInvoiceNos(nosToUse);
      setInvoiceDates(datesToUse);

      await handleSaveAllInvoices(nosToUse, datesToUse, false, false);
    };

    const handleSaveAllInvoices = async (customNos = null, customDates = null, isAutoSave = false, autoFillMissing = false) => {
      let nosToUse = { ...(customNos || invoiceNos) };
      let datesToUse = { ...(customDates || invoiceDates) };
      const today = new Date().toISOString().split('T')[0];
      const currentPrefix = invoicePrefix.trim() || 'FBI/26-27/';

      // 1. Collect all invoice numbers globally used across ALL demands in the database
      const globallyUsedInvoices = new Set();
      let maxSerial = parseInt(invoiceStartNo, 10) || 1000;

      demands.forEach(d => {
        const val = (nosToUse[d.id] !== undefined ? nosToUse[d.id] : d.invoice_no);
        if (val && String(val).trim()) {
          const trimmed = String(val).trim();
          globallyUsedInvoices.add(trimmed.toUpperCase());
          const parsed = parseInvoiceString(trimmed, currentPrefix, 0);
          if (parsed.prefix.toUpperCase() === currentPrefix.toUpperCase() && parsed.num >= maxSerial) {
            maxSerial = parsed.num + 1;
          }
        }
      });

      if (autoFillMissing) {
        const orderedList = getVisualOrderedDemands();
        let candidateNum = maxSerial;

        orderedList.forEach(d => {
          const existing = (nosToUse[d.id] !== undefined ? nosToUse[d.id] : d.invoice_no);
          if (!existing || !String(existing).trim()) {
            let candidate = `${currentPrefix}${candidateNum}`;
            while (globallyUsedInvoices.has(candidate.toUpperCase())) {
              candidateNum++;
              candidate = `${currentPrefix}${candidateNum}`;
            }
            globallyUsedInvoices.add(candidate.toUpperCase());
            nosToUse[d.id] = candidate;
            datesToUse[d.id] = datesToUse[d.id] || d.invoice_date || d.demand_date || today;
            candidateNum++;
          }
        });
        setInvoiceNos(nosToUse);
        setInvoiceDates(datesToUse);
      }

      const updateItems = demands.map(d => {
        const customNo = nosToUse[d.id];
        let finalNo = d.invoice_no || null;
        if (customNo !== undefined && customNo !== null) {
          finalNo = String(customNo).trim() !== '' ? String(customNo).trim() : null;
        }

        const customDate = datesToUse[d.id];
        let finalDate = d.invoice_date || d.demand_date || today;
        if (customDate !== undefined && customDate !== null && String(customDate).trim() !== '') {
          finalDate = String(customDate).trim();
        }

        return {
          id: d.id,
          demand_number: d.demand_number,
          demand_ref: d.demand_number,
          invoice_no: finalNo,
          invoice_date: finalDate
        };
      });

      if (updateItems.length === 0) return;

      // 2. Strict client-side duplicate verification before transmitting
      const seen = new Set();
      for (const item of updateItems) {
        if (item.invoice_no) {
          const upper = item.invoice_no.toUpperCase();
          if (seen.has(upper)) {
            if (!isAutoSave) {
              toast.error(`Cannot save: Invoice number "${item.invoice_no}" is repeated! Every demand must have a unique invoice number.`);
            }
            return;
          }
          seen.add(upper);
        }
      }

      try {
        setSavingInvoices(true);
        const res = await fetch('/api/demands/bulk-invoice', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ invoices: updateItems })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          if (!isAutoSave) {
            toast.success('All invoice numbers and dates saved successfully! 💾');
          }
          // Synchronize parent demands state immediately
          setDemands(prev => prev.map(d => {
            const match = updateItems.find(u => u.id === d.id || (u.demand_number && u.demand_number === d.demand_number));
            if (match) {
              return { ...d, invoice_no: match.invoice_no, invoice_date: match.invoice_date };
            }
            return d;
          }));
          // Fresh background synchronization
          fetchData(true);
        } else {
          if (!isAutoSave) toast.error(data.error || 'Failed to save invoices to database.');
        }
      } catch (err) {
        console.error('Invoice save error:', err);
        if (!isAutoSave) toast.error('Error connecting to server while saving invoices.');
      } finally {
        setSavingInvoices(false);
      }
    };

    // 1-Click Auto Generate Serials: NEVER repeats invoice numbers across demands or units
    const handleAutoGenerateInvoices = async () => {
      let currentPrefix = invoicePrefix.trim() || 'FBI/26-27/';
      const today = new Date().toISOString().split('T')[0];

      const newNos = { ...invoiceNos };
      const newDates = { ...invoiceDates };
      const orderedList = getVisualOrderedDemands();
      const targetIds = new Set(orderedList.map(i => i.id));

      // 1. Gather all invoice numbers already assigned outside the current list
      const globallyUsedInvoices = new Set();
      let maxSerial = parseInt(invoiceStartNo, 10) || 1000;

      demands.forEach(d => {
        const isTarget = targetIds.has(d.id);
        const existingVal = (newNos[d.id] !== undefined ? newNos[d.id] : d.invoice_no);

        if (existingVal && String(existingVal).trim()) {
          const trimmed = String(existingVal).trim();
          if (!isTarget || !overwriteExisting) {
            globallyUsedInvoices.add(trimmed.toUpperCase());
          }
          const parsed = parseInvoiceString(trimmed, currentPrefix, 0);
          if (parsed.prefix.toUpperCase() === currentPrefix.toUpperCase() && parsed.num >= maxSerial) {
            maxSerial = parsed.num + 1;
          }
        }
      });

      let candidateNum = maxSerial;

      orderedList.forEach((d) => {
        if (d.status === 'REJECTED' || d.status === 'CANCELLED') {
          newNos[d.id] = 'CANCELLED';
          newDates[d.id] = '';
          return;
        }
        const existingInv = (newNos[d.id] !== undefined ? newNos[d.id] : d.invoice_no);

        if (!overwriteExisting && existingInv && String(existingInv).trim()) {
          const trimmed = String(existingInv).trim();
          newNos[d.id] = trimmed;
          newDates[d.id] = newDates[d.id] || d.invoice_date || d.demand_date || today;
          globallyUsedInvoices.add(trimmed.toUpperCase());
        } else {
          // Find next strictly available serial number
          let candidate = `${currentPrefix}${candidateNum}`;
          while (globallyUsedInvoices.has(candidate.toUpperCase())) {
            candidateNum++;
            candidate = `${currentPrefix}${candidateNum}`;
          }
          globallyUsedInvoices.add(candidate.toUpperCase());
          newNos[d.id] = candidate;
          newDates[d.id] = newDates[d.id] || d.invoice_date || d.demand_date || today;
          candidateNum++;
        }
      });

      setInvoiceNos(newNos);
      setInvoiceDates(newDates);
      await handleSaveAllInvoices(newNos, newDates, false, false);
    };

    const handleManualInvoiceChange = (targetDemandId, newInvNo) => {
      const newNos = { ...invoiceNos, [targetDemandId]: newInvNo };
      setInvoiceNos(newNos);

      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => {
        handleSaveAllInvoices(newNos, invoiceDates, true, false);
      }, 1000);
      setAutoSaveTimer(timer);
    };

    const handleDateChange = (targetDemandId, newDate) => {
      const newDates = { ...invoiceDates, [targetDemandId]: newDate };
      setInvoiceDates(newDates);

      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => {
        handleSaveAllInvoices(invoiceNos, newDates, true, false);
      }, 1000);
      setAutoSaveTimer(timer);
    };

    const exportToExcel = () => {
      const orderedList = getVisualOrderedDemands();
      const exportData = orderedList.map((r, idx) => {
        const instData = institutionsMap[r.institution_id] || {};
        const addrStr = r.complete_address || instData.complete_address || r.google_location || instData.google_location || '';
        const fullAddress = addrStr ? `${r.institution_name}, ${addrStr}` : r.institution_name;
        const itemLabel = 'Refreshment Packet';
        const rate = r.avg_unit_price || (r.total_amount && r.total_quantity ? (r.total_amount / r.total_quantity) : 75.00);
        const invNo = invoiceNos[r.id] !== undefined ? invoiceNos[r.id] : (r.invoice_no || '');
        const invDate = invoiceDates[r.id] !== undefined ? invoiceDates[r.id] : (r.invoice_date || r.demand_date || '');

        const rowObj = {
          'S.NO': idx + 1,
          'DATE OF SUPPLY': formatDDMMYYYY(r.demand_date),
          'DEMAND REF': r.demand_number || '',
          'UNIT': r.unit_name || '',
          'INSTITUTION WITH ADDRESS': fullAddress,
          'PLACE OF SUPPLY': 'DELHI'
        };
        if (isAdmin) {
          rowObj['INVOICE DATE'] = formatDDMMYYYY(invDate);
          rowObj['INVOICE NO'] = invNo;
        }
        rowObj['ITEM'] = itemLabel;
        rowObj['QTY'] = r.total_quantity || 0;
        rowObj['RATE INCL GST'] = rate;
        rowObj['AMOUNT'] = r.total_amount || 0;
        return rowObj;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');
      XLSX.writeFile(workbook, `Monthly_Refreshment_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handlePrintSpecific = (arg1, arg2) => {
      const targetUnit = arg2 || arg1;
      const previousUnitFilter = unitFilter;
      const previousSearch = searchQuery;

      setUnitFilter(targetUnit);
      setSearchQuery('');

      setTimeout(() => {
        const handleRestore = () => {
          setUnitFilter(previousUnitFilter);
          setSearchQuery(previousSearch);
          window.removeEventListener('afterprint', handleRestore);
        };
        window.addEventListener('afterprint', handleRestore);
        handlePrint();
      }, 10);
    };

    const isFiltered = unitFilter !== 'All' || searchQuery !== '';

    return (
      <div className="space-y-6 animate-in fade-in duration-500 w-full">
        {/* Duplicate Warning Banner */}
        {isAdmin && duplicateInvoices.size > 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 text-xs shadow-md print:hidden animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight text-red-800">
                  Duplicate Invoice Number(s) Detected!
                </p>
                <p className="text-[11px] text-red-700 font-medium">
                  The following invoice number(s) are repeated across demands: <strong className="font-mono bg-red-200/80 px-1.5 py-0.5 rounded text-red-950 font-bold">{Array.from(duplicateInvoices).join(', ')}</strong>. Every demand must have a unique invoice number.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoGenerateInvoices}
              disabled={savingInvoices}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              ⚡ Fix & Renumber All Sequentially
            </button>
          </div>
        )}

        {/* Consolidated Compact Control Panel & Toolbar (print:hidden) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-3">
          {/* Row 1: Header Title & Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <History size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  {isAdmin ? 'FLAVOUR BASE INDIA • Monthly Refreshment Summary' : 'Monthly Refreshment Summary'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Summary records grouped by NCC Unit</p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Orientation Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button onClick={() => setIsLandscape(false)} className={`px-2.5 py-1 rounded-md font-bold transition-all ${!isLandscape ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Portrait</button>
                <button onClick={() => setIsLandscape(true)} className={`px-2.5 py-1 rounded-md font-bold transition-all ${isLandscape ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Landscape</button>
              </div>

              {/* Size Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button onClick={() => setPaperSize('A4')} className={`px-2 py-1 rounded-md font-bold transition-all ${paperSize === 'A4' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>A4</button>
                <button onClick={() => setPaperSize('Legal')} className={`px-2 py-1 rounded-md font-bold transition-all ${paperSize === 'Legal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Legal</button>
              </div>

              {/* Admin Invoice Controls: Auto-Generate Serials, Invoice Settings, Save Invoices */}
              {isAdmin && (
                <>
                  {/* 1-Click Auto Generate Serials Button */}
                  <button
                    type="button"
                    onClick={handleAutoGenerateInvoices}
                    disabled={savingInvoices}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Automatically generate sequential invoice numbers for all visible demands and save to database"
                  >
                    <Zap size={14} className="fill-current text-slate-950 shrink-0" />
                    <span className="drop-shadow-xs">Auto-Generate Serials</span>
                  </button>

                  {/* Invoice Generator Settings Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowInvoiceGenerator(!showInvoiceGenerator)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                      showInvoiceGenerator
                        ? 'bg-slate-900 text-amber-400 border-slate-700 shadow-inner'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Configure Invoice Prefix, Starting Serial Number, and Overwrite Options"
                  >
                    <Sparkles size={14} className={showInvoiceGenerator ? 'text-amber-400' : 'text-amber-500'} />
                    <span>{showInvoiceGenerator ? 'Close Settings' : 'Invoice Settings'}</span>
                  </button>

                  {/* Save Invoices Button */}
                  <button
                    type="button"
                    onClick={() => handleSaveAllInvoices(invoiceNos, invoiceDates, false, true)}
                    disabled={savingInvoices}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Save all invoice numbers and dates to database"
                  >
                    <Save size={15} className="fill-current text-white shrink-0" /> 
                    <span className="drop-shadow-xs">{savingInvoices ? 'Saving...' : 'Save Invoices'}</span>
                  </button>
                </>
              )}

              {/* Export Excel */}
              <button
                type="button"
                onClick={exportToExcel}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/25 border border-emerald-400/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet size={15} className="text-emerald-200 shrink-0" /> 
                <span className="drop-shadow-xs">Export Excel (.xlsx)</span>
              </button>

              {/* Print Report */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/25 border border-blue-400/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer size={15} className="text-sky-200 shrink-0" /> 
                <span className="drop-shadow-xs">Print Report</span>
              </button>
            </div>
          </div>

          {/* Optional Visible Invoice Generator Panel (Admin Only) */}
          {isAdmin && showInvoiceGenerator && (
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-xl shadow-lg border border-blue-800/80 space-y-3 print:hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-blue-800/50 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <h4 className="font-black text-xs uppercase tracking-wide text-white">Monthly Summary Invoice Controls & Auto Generator</h4>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full shrink-0">
                  DEFAULT PLACE OF SUPPLY: DELHI
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">Series Prefix:</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      placeholder="FBI/26-27/"
                      className="bg-slate-950/80 border border-blue-600/60 rounded-lg px-2.5 py-1 text-white font-mono font-bold w-32 focus:outline-none focus:border-amber-400 text-xs shadow-inner"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">Start Serial:</label>
                    <input
                      type="number"
                      value={invoiceStartNo}
                      onChange={(e) => setInvoiceStartNo(e.target.value)}
                      placeholder="1000"
                      className="bg-slate-950/80 border border-blue-600/60 rounded-lg px-2.5 py-1 text-white font-mono font-bold w-20 focus:outline-none focus:border-amber-400 text-xs shadow-inner"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-slate-300 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none border-l border-blue-800/80 pl-3">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="rounded border-blue-600 bg-slate-950 text-amber-500 focus:ring-amber-400 accent-amber-500"
                    />
                    <span>Force Overwrite All</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAutoGenerateInvoices}
                    disabled={savingInvoices}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={14} className="fill-current" /> Auto Generate Serials
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllInvoices}
                    disabled={savingInvoices}
                    className="px-3.5 py-1.5 bg-red-500 hover:bg-red-400 text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <X size={14} className="fill-current text-white" /> Clear All Invoices
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAllInvoices(invoiceNos, invoiceDates, false)}
                    disabled={savingInvoices}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} className="fill-current" /> Save Invoices Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Unit Filter & Search */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-1">
            {/* Unit Indicator Badge */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-black text-blue-800 uppercase tracking-wider shrink-0 shadow-xs">
              <School size={15} className="text-blue-600" />
              <span>Unit Wise</span>
            </div>

            {/* Unit Filter Dropdown */}
            <div className="flex-1 min-w-[200px]">
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors shadow-xs"
              >
                <option value="All">🏢 All NCC Units ({availableUnits.length})</option>
                {availableUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 min-w-[220px] relative">
              <input
                type="text"
                placeholder="Search Institution, Demand Ref, Invoice No, Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Clear Filter Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setUnitFilter('All');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer border border-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Report Sections */}
        {groupedSections.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 font-medium">
            No demands matched the selected filter criteria.
          </div>
        ) : (
          groupedSections.map((sec, secIdx) => {
            const secTotalPackets = sec.items.reduce((s, v) => s + (Number(v.total_quantity) || 0), 0);
            const secTotalCost = sec.items.reduce((s, v) => s + (Number(v.total_amount) || 0), 0);

            const secItems = sec.items || [];
            const dateFrom = secItems.length > 0 ? formatDDMMYYYY(secItems[0].demand_date) : '';
            const dateTo = secItems.length > 0 ? formatDDMMYYYY(secItems[secItems.length - 1].demand_date) : '';
            const periodText = (dateFrom && dateTo) ? `PERIOD FROM : ${dateFrom} TO ${dateTo}` : 'PERIOD FROM : ALL DATES';
            let headerUnitName = '2 DELHI ARTY BTY NCC';
            if (unitFilter !== 'All') {
              headerUnitName = unitFilter;
            } else if (groupBy === 'UNIT') {
              headerUnitName = sec.key;
            } else if (secItems.length > 0) {
              const unitsInSec = Array.from(new Set(secItems.map(i => i.unit_name).filter(Boolean)));
              if (unitsInSec.length === 1) {
                headerUnitName = unitsInSec[0];
              } else if (user?.unit_name) {
                headerUnitName = user.unit_name;
              } else if (unitsInSec.length > 1) {
                headerUnitName = unitsInSec[0];
              }
            } else if (user?.unit_name) {
              headerUnitName = user.unit_name;
            }

            const sectionTitleText = `MONTHLY REFRESHMENT SUMMARY - UNIT : ${headerUnitName.toUpperCase()}`;
            const monthMeta = groupBy === 'MONTH' ? `MONTH : ${sec.key.toUpperCase()} • ` : '';
            const extraMetaText = `${monthMeta}TOTAL ENTRIES: ${sec.items.length}`;

            return (
              <div 
                key={sec.key} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-none print:bg-white print:overflow-visible print:w-full print:mb-0 print:break-after-page page-break-after-always print:rounded-none"
                style={secIdx < groupedSections.length - 1 ? { pageBreakAfter: 'always', breakAfter: 'page' } : {}}
              >
                {/* Print Page Header */}
                <PrintHeader 
                  title={sectionTitleText} 
                  period={periodText} 
                  extraMeta={extraMetaText}
                />

                {/* Section Header (Screen Only) */}
                <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                      {groupBy === 'GP' ? <Building2 size={18} /> : groupBy === 'UNIT' ? <School size={18} /> : <Calendar size={18} />}
                    </div>
                    <div>
                      <h3 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                        {sec.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {sec.items.length} demand(s) recorded • {sec.badge}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      {secTotalPackets.toLocaleString()} Pkts
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrintSpecific(sec.key)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      title={`Print report for only ${sec.title}`}
                    >
                      <Printer size={14} className="text-sky-200 shrink-0" />
                      <span>Print This {groupBy === 'GP' ? 'Group' : groupBy === 'UNIT' ? 'Unit' : 'Month'}</span>
                    </button>
                  </div>
                </div>

                {/* Section Table */}
                <div className="overflow-x-auto print:overflow-visible print:w-full">
                  <table className="w-full text-left border-collapse print:min-w-full print:border print:border-black">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black text-[11px] font-black uppercase text-slate-600">
                        <th className="px-3 py-3.5 text-center print:text-black w-10 border border-slate-200 print:border-black">S.NO</th>
                        <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap">DATE OF SUPPLY</th>
                        <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap">DEMAND REF</th>
                        <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap">UNIT</th>
                        <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black">INSTITUTION WITH ADDRESS</th>
                        <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap">PLACE OF SUPPLY</th>
                        {isAdmin && (
                          <>
                            <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[130px]">INVOICE DATE</th>
                            <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[140px]">INVOICE NO</th>
                          </>
                        )}
                        <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap">ITEM</th>
                        <th className="px-3 py-3.5 text-center print:text-black text-emerald-600 border border-slate-200 print:border-black">QTY</th>
                        <th className="px-3 py-3.5 text-right print:text-black text-emerald-600 border border-slate-200 print:border-black">RATE INCL GST</th>
                        <th className="px-3 py-3.5 text-right print:text-black text-emerald-600 border border-slate-200 print:border-black">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-black text-xs">
                      {sec.items.map((row, idx) => {
                        const instData = institutionsMap[row.institution_id] || {};
                        const addressText = row.complete_address || instData.complete_address || row.google_location || instData.google_location || 'Delhi Cantonment, New Delhi';
                        const rate = row.avg_unit_price || (row.total_amount && row.total_quantity ? (row.total_amount / row.total_quantity) : 75.00);
                        const invNo = invoiceNos[row.id] !== undefined ? invoiceNos[row.id] : (row.invoice_no || '');
                        const invDate = invoiceDates[row.id] !== undefined ? invoiceDates[row.id] : (row.invoice_date || '');

                        const isLastRow = idx === sec.items.length - 1;

                        return (
                          <tr 
                            key={row.id || idx} 
                            className={`hover:bg-slate-50/80 print:bg-white transition-colors ${isLastRow ? 'print:break-after-avoid' : ''}`}
                            style={isLastRow ? { pageBreakAfter: 'avoid', breakAfter: 'avoid' } : {}}
                          >
                            <td className="px-3 py-3 text-slate-500 font-normal text-center print:text-black border border-slate-200 print:border-black">{idx + 1}</td>
                            <td className="px-3 py-3 font-normal text-slate-700 print:text-black whitespace-nowrap border border-slate-200 print:border-black">{formatDDMMYYYY(row.demand_date)}</td>
                            <td className="px-3 py-3 font-mono font-medium text-blue-700 print:text-black whitespace-nowrap border border-slate-200 print:border-black">{row.demand_number || '-'}</td>
                            <td className="px-3 py-3 font-normal text-slate-700 print:text-black whitespace-nowrap border border-slate-200 print:border-black">{row.unit_name || '-'}</td>
                            <td className="px-3 py-3 print:text-black border border-slate-200 print:border-black min-w-[200px]">
                              <div className="font-normal text-slate-800 uppercase">{row.institution_name}</div>
                              <div className="text-[10px] font-normal text-slate-500 leading-tight mt-0.5">
                                {addressText}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center font-normal text-slate-700 border border-slate-200 print:border-black">DELHI</td>
                            
                            {isAdmin && (
                              <>
                                {/* INVOICE DATE INPUT (DD/MM/YYYY) */}
                                <td className="px-2 py-2 text-center border border-slate-200 print:border-black min-w-[130px]">
                                  <span className="hidden print:inline font-mono font-medium text-xs text-black">
                                    {formatDDMMYYYY(invDate)}
                                  </span>
                                  <div className="print:hidden">
                                    <CustomDateInput
                                      compact
                                      value={invDate}
                                      onChange={(newIso) => handleDateChange(row.id, newIso)}
                                    />
                                  </div>
                                </td>

                                {/* INVOICE NO INPUT */}
                                {(() => {
                                  const isDuplicate = Boolean(invNo && duplicateInvoices.has(String(invNo).trim().toUpperCase()));
                                  return (
                                    <td className={`px-2 py-2 text-center border ${isDuplicate ? 'bg-red-50/80 border-red-500' : 'border-slate-200'} print:border-black`}>
                                      <span className="hidden print:inline font-mono font-bold text-xs text-black">
                                        {invNo || '-'}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder="Enter Inv No..."
                                        value={invNo}
                                        onChange={(e) => handleManualInvoiceChange(row.id, e.target.value)}
                                        className={`w-full border rounded-lg px-2 py-1 text-xs font-mono font-bold text-center outline-none print:hidden ${
                                          isDuplicate
                                            ? 'bg-red-100 border-red-500 text-red-700 focus:ring-2 focus:ring-red-400'
                                            : 'bg-slate-50 border-slate-200 text-blue-700 focus:border-blue-500'
                                        }`}
                                      />
                                      {isDuplicate && (
                                        <span className="text-[9px] font-black text-red-600 block mt-0.5 print:hidden animate-pulse">
                                          ⚠️ Duplicate!
                                        </span>
                                      )}
                                    </td>
                                  );
                                })()}
                              </>
                            )}

                            {/* ITEM */}
                            <td className="px-3 py-3 text-slate-700 font-normal whitespace-nowrap border border-slate-200 print:border-black">
                              <span>Refreshment Packet</span>
                              {(row.status === 'REJECTED' || row.status === 'CANCELLED') && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-rose-100 text-rose-700 border border-rose-200">
                                  {row.status}
                                </span>
                              )}
                            </td>

                            {/* QTY */}
                            <td className="px-3 py-3 text-center font-normal text-slate-900 print:text-black border border-slate-200 print:border-black">
                              {(row.status === 'REJECTED' || row.status === 'CANCELLED') ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-rose-600 font-black">0</span>
                                  {row.original_quantity > 0 && (
                                    <span className="text-[9px] text-slate-400 line-through print:hidden">
                                      ({row.original_quantity})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                Number(row.total_quantity) || 0
                              )}
                            </td>

                            {/* RATE INCL GST */}
                            <td className="px-3 py-3 text-right font-normal text-slate-700 print:text-black border border-slate-200 print:border-black">
                              ₹{formatAmount(rate)}
                            </td>

                            {/* AMOUNT */}
                            <td className="px-3 py-3 text-right font-bold text-emerald-600 print:text-black border border-slate-200 print:border-black">
                              {(row.status === 'REJECTED' || row.status === 'CANCELLED') ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-rose-600 font-black">₹0.00</span>
                                  {row.original_amount > 0 && (
                                    <span className="text-[9px] text-slate-400 line-through print:hidden">
                                      (₹{formatAmount(row.original_amount)})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                `₹${formatAmount(row.total_amount)}`
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot 
                      className="bg-slate-50 border-t border-slate-200 print:bg-slate-100 print:border-black print:break-before-avoid"
                      style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}
                    >
                      <tr className="font-bold text-slate-800 text-xs">
                        <td 
                          colSpan={isAdmin ? 9 : 7} 
                          className="px-4 py-3.5 text-right uppercase tracking-wider text-slate-700 print:text-black border border-slate-200 print:border-black font-bold"
                        >
                          SUBTOTAL ({sec.title.toUpperCase()})
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold text-emerald-700 print:text-black border border-slate-200 print:border-black">
                          {secTotalPackets.toLocaleString()}
                        </td>
                        <td className="px-3 py-3.5 text-right text-xs font-normal text-slate-500 border border-slate-200 print:border-black">
                          -
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm font-bold text-emerald-700 print:text-black border border-slate-200 print:border-black">
                          ₹{formatAmount(secTotalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })
        )}

        {/* Grand Total Footer if multiple sections */}
        {groupedSections.length > 1 && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 print:bg-slate-200 print:text-black">
            <span className="text-xs uppercase font-black tracking-widest text-slate-300 print:text-black">
              Audit Trail Cumulative Grand Total ({totalDemandsCount} demands)
            </span>
            <div className="flex items-center gap-6">
              <span className="text-sm font-bold">
                Total Packets: <strong className="text-emerald-400 font-black text-base print:text-black">{totalPacketsCount.toLocaleString()}</strong>
              </span>
              <span className="text-sm font-bold">
                Total Cost: <strong className="text-emerald-400 font-black text-base print:text-black">₹{formatAmount(totalCostAmount)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const UnitwiseMonthlySummaryView = () => {
    const isUnitRole = user?.role === 'UNIT';

    // Current month in YYYY-MM
    const [selectedMonth, setSelectedMonth] = useState(getLocalYearMonth());

    // Unit filter: Admin can select any unit or 'All'; Unit role is scoped to their unit
    const [unitFilter, setUnitFilter] = useState(() => {
      if (isUnitRole && user?.unit_name) return user.unit_name;
      return 'All';
    });

    // Institution filter
    const [instFilter, setInstFilter] = useState('All');
    // Funding filter: ALL | STATE | CENTRE
    const [fundingFilter, setFundingFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const institutionsMap = useMemo(() => {
      const map = {};
      (institutions || []).forEach(i => {
        if (i && i.id) map[i.id] = i;
      });
      return map;
    }, [institutions]);

    // Available distinct NCC units
    const availableUnits = useMemo(() => {
      const unitNames = new Set();
      (units || []).forEach(u => { if (u.unit_name) unitNames.add(u.unit_name); });
      (demands || []).forEach(d => { if (d.unit_name) unitNames.add(d.unit_name); });
      return Array.from(unitNames).sort();
    }, [units, demands]);

    // Available institutions under currently selected unit and funding mode
    const availableInstitutions = useMemo(() => {
      return (institutions || []).filter(inst => {
        if (unitFilter !== 'All') {
          const instUnit = inst.unit_name || (units.find(u => u.id === inst.unit_id)?.unit_name);
          if (instUnit !== unitFilter) return false;
        }
        const instType = inst.institution_type || 'STATE';
        if (fundingFilter !== 'ALL' && instType !== fundingFilter) return false;
        return true;
      }).sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || ''));
    }, [institutions, units, unitFilter, fundingFilter]);

    // Auto-reset institution filter if not in available list
    useEffect(() => {
      if (instFilter !== 'All') {
        const exists = availableInstitutions.some(i => String(i.id) === String(instFilter) || i.institution_name === instFilter);
        if (!exists) setInstFilter('All');
      }
    }, [unitFilter, availableInstitutions, instFilter]);

    // Generates list of selectable months ONLY for which demand data actually exists in table
    const monthOptions = useMemo(() => {
      const monthSet = new Set();

      (demands || []).forEach(d => {
        if (d.demand_date) {
          // If unit is filtered, prioritize months that belong to that unit
          if (unitFilter !== 'All' && d.unit_name && d.unit_name !== unitFilter) {
            return;
          }
          const ym = String(d.demand_date).slice(0, 7);
          if (/^\d{4}-\d{2}$/.test(ym)) {
            monthSet.add(ym);
          }
        }
      });

      // If no demands matched for unit, fallback to any month available in all demands
      if (monthSet.size === 0) {
        (demands || []).forEach(d => {
          if (d.demand_date && d.status !== 'CANCELLED') {
            const ym = String(d.demand_date).slice(0, 7);
            if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
          }
        });
      }

      // If still empty (e.g. fresh database without demands), show current month
      if (monthSet.size === 0) {
        monthSet.add(getLocalYearMonth());
      }

      // Sort descending (latest first)
      const sorted = Array.from(monthSet).sort().reverse();

      return sorted.map(ym => {
        const [yStr, mStr] = ym.split('-');
        const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
        const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g. "October 2026"
        return { value: ym, label };
      });
    }, [demands, unitFilter]);

    // Automatically synchronize selectedMonth so it always points to an available month with data
    useEffect(() => {
      if (monthOptions.length > 0) {
        const hasCurrent = monthOptions.some(m => m.value === selectedMonth);
        if (!hasCurrent) {
          setSelectedMonth(monthOptions[0].value);
        }
      }
    }, [monthOptions, selectedMonth]);

    // Filter demands for selected month, unit, institution, group and search
    const filteredDemands = useMemo(() => {
      return (demands || []).filter(d => {
        if (!d.demand_date) return false;

        // Month filter (YYYY-MM)
        const dMonth = String(d.demand_date).slice(0, 7);
        if (selectedMonth && dMonth !== selectedMonth) return false;

        // Group filter
        if (selectedGroup !== 'All' && d.ncc_group !== selectedGroup) return false;

        // Unit filter
        if (unitFilter !== 'All' && d.unit_name !== unitFilter) return false;

        // Institution filter
        if (instFilter !== 'All') {
          if (String(d.institution_id) !== String(instFilter) && d.institution_name !== instFilter) return false;
        }

        // Funding aspect filter: STATE vs CENTRE (master institutionsMap takes priority)
        const currentInstType = institutionsMap[d.institution_id]?.institution_type || d.institution_type || 'STATE';
        if (fundingFilter !== 'ALL' && currentInstType !== fundingFilter) return false;

        // Keep CANCELLED and REJECTED in record with 0 qty/amount for complete audit trail

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const mInst = (d.institution_name || '').toLowerCase().includes(q);
          const mAddr = (d.complete_address || d.google_location || '').toLowerCase().includes(q);
          const mRef = (d.demand_number || '').toLowerCase().includes(q);
          const mUnit = (d.unit_name || '').toLowerCase().includes(q);
          const mInv = (d.invoice_no || '').toLowerCase().includes(q);
          if (!mInst && !mAddr && !mRef && !mUnit && !mInv) return false;
        }

        return true;
      });
    }, [demands, selectedMonth, selectedGroup, unitFilter, instFilter, fundingFilter, searchQuery, institutionsMap]);

    // Group filtered demands by Institution
    const groupedByInstitution = useMemo(() => {
      const groups = {};

      filteredDemands.forEach(d => {
        const key = d.institution_name || (d.institution_id ? `Inst_${d.institution_id}` : 'Unknown Institution');
        const instData = institutionsMap[d.institution_id] || {};
        const addressStr = d.complete_address || instData.complete_address || d.google_location || instData.google_location || 'Delhi Cantonment, New Delhi';
        const instType = instData.institution_type || d.institution_type || 'STATE';

        if (!groups[key]) {
          groups[key] = {
            id: d.institution_id,
            name: d.institution_name || 'Unknown Institution',
            type: instType,
            address: addressStr,
            ano: d.ano_cto_name || instData.ano_cto_name || '-',
            unit_name: d.unit_name || instData.unit_name || '-',
            demands: []
          };
        }
        groups[key].demands.push(d);
      });

      // Sort demands chronologically within each institution by demand_date ASC
      Object.values(groups).forEach(g => {
        g.demands.sort((a, b) => new Date(a.demand_date) - new Date(b.demand_date));
      });

      // Sort institutions alphabetically
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredDemands, institutionsMap]);

    // Real-time 1-click toggle handler directly in summary
    const handleToggleFunding = async (inst) => {
      const current = inst.type || institutionsMap[inst.id]?.institution_type || 'STATE';
      const nextType = current === 'CENTRE' ? 'STATE' : 'CENTRE';

      // 1. Instant Real-time optimistic update in local React state
      setInstitutions(prev => (prev || []).map(i => (i.id === inst.id || i.institution_name === inst.name) ? { ...i, institution_type: nextType } : i));
      setDemands(prev => (prev || []).map(d => (d.institution_id === inst.id || d.institution_name === inst.name) ? { ...d, institution_type: nextType } : d));

      try {
        let res = await fetch(`/api/institutions/${inst.id}/type`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ institution_type: nextType })
        });

        if (res.status === 404) {
          res = await fetch(`/api/institutions/${inst.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              institution_name: inst.name,
              institution_type: nextType
            })
          });
        }

        if (res.ok) {
          toast.success(`${inst.name} is now ${nextType === 'CENTRE' ? '🏛️ CENTRE FUNDED' : '🏢 STATE FUNDED'}`);
        } else {
          toast.error('Failed to update funding type on server');
        }
      } catch (err) {
        console.error('Toggle funding error:', err);
        toast.error('Network error updating funding type');
      }
    };

    const totalDemandsCount = filteredDemands.length;
    const totalPacketsCount = filteredDemands.reduce((s, d) => s + (Number(d.total_quantity) || Number(d.quantity) || 0), 0);
    const totalCostAmount = filteredDemands.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
    const totalInstitutionsCount = groupedByInstitution.length;

    // Excel Export with Merged Institution Cells
    const exportToExcel = () => {
      const exportData = [];
      const merges = [];
      let currentRow = 1; // Row 0 is header

      groupedByInstitution.forEach(inst => {
        const demandCount = inst.demands.length;
        const startRow = currentRow;

        inst.demands.forEach(d => {
          const rate = d.avg_unit_price || (d.total_amount && d.total_quantity ? (d.total_amount / d.total_quantity) : 75.00);

          exportData.push({
            'S.NO': currentRow,
            'INSTITUTION WITH ADDRESS': `${inst.name}${inst.address ? ', ' + inst.address : ''}`,
            'FUNDING TYPE': inst.type || 'STATE',
            'DATE OF SUPPLY': formatDDMMYYYY(d.demand_date),
            'DEMAND REF': d.demand_number || '',
            'UNIT': d.unit_name || inst.unit_name || '',
            'PLACE OF SUPPLY': 'DELHI',
            'INVOICE DATE': formatDDMMYYYY(d.invoice_date),
            'INVOICE NO': d.invoice_no || '',
            'ITEM': 'Refreshment Packet',
            'QTY': Number(d.total_quantity || d.quantity || 0),
            'RATE INCL GST': rate,
            'AMOUNT': Number(d.total_amount || 0)
          });
          currentRow++;
        });

        if (demandCount > 1) {
          // Merge column 1 (INSTITUTION WITH ADDRESS) from startRow to currentRow - 1
          merges.push({
            s: { r: startRow, c: 1 },
            e: { r: currentRow - 1, c: 1 }
          });
          // Merge column 2 (FUNDING TYPE) as well
          merges.push({
            s: { r: startRow, c: 2 },
            e: { r: currentRow - 1, c: 2 }
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      if (merges.length > 0) {
        worksheet['!merges'] = merges;
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Unitwise Monthly Summary');
      const safeUnitStr = unitFilter === 'All' ? 'All_Units' : unitFilter.replace(/[^a-zA-Z0-9]/g, '_');
      const safeFundingStr = fundingFilter === 'ALL' ? '' : `_${fundingFilter}`;
      XLSX.writeFile(workbook, `Unitwise_Monthly_Summary_${selectedMonth}_${safeUnitStr}${safeFundingStr}.xlsx`);
    };

    const monthDateObj = selectedMonth ? new Date(selectedMonth + '-01') : new Date();
    const monthDisplayStr = monthDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    const activeUnitHeader = unitFilter === 'All' ? 'ALL UNITS' : unitFilter.toUpperCase();

    let serialCounter = 1;

    return (
      <div className="space-y-6 animate-in fade-in duration-500 w-full">
        {/* Filters and Control Panel (Hidden during print) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                  Unitwise Monthly Summary
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">
                  Institution-grouped monthly demands with merged institution rows & monthly summary invoices
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchData(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all border border-slate-300 flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                title="Refresh latest demands & institutions from server"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
                <span>Sync Data</span>
              </button>

              <button
                type="button"
                onClick={exportToExcel}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/25 border border-emerald-400/40 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={15} className="text-emerald-200 shrink-0" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/25 border border-blue-400/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} className="text-sky-200 shrink-0" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Quick Funding Mode Tabs (Separate documentation modes) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Documentation Mode:</span>
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFundingFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    fundingFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Modes
                </button>
                <button
                  type="button"
                  onClick={() => setFundingFilter('STATE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    fundingFilter === 'STATE'
                      ? 'bg-emerald-600 text-white shadow-2xs font-black'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span>🏢 State Funded</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFundingFilter('CENTRE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    fundingFilter === 'CENTRE'
                      ? 'bg-indigo-600 text-white shadow-2xs font-black'
                      : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <span>🏛️ Centre Funded</span>
                </button>
              </div>
            </div>
            {fundingFilter !== 'ALL' && (
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                fundingFilter === 'CENTRE'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {fundingFilter === 'CENTRE' ? '🏛️ Army Public School / Sainik School Mode' : '🏢 State Govt & Regular Vacancy Mode'}
              </span>
            )}
          </div>

          {/* Filter Bar: Month, Unit, Funding Mode, Institution, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* 1. Month Picker (Formatted like "May 2026") */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Select Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>
                    📅 {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Unit Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                NCC Unit
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                disabled={isUnitRole}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs ${isUnitRole ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {!isUnitRole && <option value="All">🏢 All NCC Units ({availableUnits.length})</option>}
                {availableUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* 3. Funding Aspect Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Funding Aspect
              </label>
              <select
                value={fundingFilter}
                onChange={(e) => setFundingFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">🌐 All (State + Centre)</option>
                <option value="STATE">🏢 State (Govt/Pvt)</option>
                <option value="CENTRE">🏛️ Centre (APS/Sainik)</option>
              </select>
            </div>

            {/* 4. Institution Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Filter Institution
              </label>
              <select
                value={instFilter}
                onChange={(e) => setInstFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="All">🏫 All Institutions ({availableInstitutions.length})</option>
                {availableInstitutions.map(inst => {
                  const mCount = (demands || []).filter(d => 
                    d.institution_id === inst.id && 
                    String(d.demand_date).slice(0, 7) === selectedMonth &&
                    (unitFilter === 'All' || d.unit_name === unitFilter)
                  ).length;
                  return (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name} {mCount > 0 ? `(${mCount} demands in ${selectedMonth})` : `(0 demands in ${selectedMonth})`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 5. Search Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search School, Ref, Inv No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Canvas & Printable Container */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-none print:bg-white print:overflow-visible print:w-full">
          {/* Print Page Header */}
          <PrintHeader
            title={`MONTHLY REFRESHMENT SUMMARY - UNIT : ${activeUnitHeader}${fundingFilter !== 'ALL' ? ` (${fundingFilter === 'CENTRE' ? 'CENTRE FUND' : 'STATE FUND'})` : ''}`}
            period={`MONTH : ${monthDisplayStr}`}
            extraMeta={`TOTAL INSTITUTIONS: ${totalInstitutionsCount} • TOTAL DEMANDS: ${totalDemandsCount}${fundingFilter !== 'ALL' ? ` • FUND: ${fundingFilter}` : ''}`}
          />

          {/* Table Container */}
          <div className="overflow-x-auto print:overflow-visible print:w-full">
            <table className="w-full text-left border-collapse print:min-w-full print:border print:border-black">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black text-[11px] font-black uppercase text-slate-600">
                  <th className="px-3 py-3.5 text-center print:text-black w-10 border border-slate-200 print:border-black">S.NO</th>
                  <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black min-w-[240px]">INSTITUTION WITH ADDRESS</th>
                  <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap text-center">DATE OF SUPPLY</th>
                  <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap text-center">DEMAND REF</th>
                  <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap text-center">UNIT</th>
                  <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap">PLACE OF SUPPLY</th>
                  <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[120px]">INVOICE DATE</th>
                  <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[120px]">INVOICE NO</th>
                  <th className="px-3 py-3.5 print:text-black border border-slate-200 print:border-black whitespace-nowrap">ITEM</th>
                  <th className="px-3 py-3.5 text-center print:text-black text-emerald-600 border border-slate-200 print:border-black">QTY</th>
                  <th className="px-3 py-3.5 text-right print:text-black text-slate-700 border border-slate-200 print:border-black">RATE INCL GST</th>
                  <th className="px-3 py-3.5 text-right print:text-black text-emerald-600 border border-slate-200 print:border-black">AMOUNT</th>
                </tr>
              </thead>
                {groupedByInstitution.length === 0 ? (
                  <tbody className="divide-y divide-slate-100 print:divide-black text-xs">
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-400 font-medium border border-slate-200">
                        No demand records found for the selected Unit and Month ({monthDisplayStr}).
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  groupedByInstitution.map((inst, instIdx) => {
                    const demandCount = inst.demands.length;

                    return (
                      <tbody
                        key={inst.id || `${inst.name}-${instIdx}`}
                        className="divide-y divide-slate-100 print:divide-black text-xs print:break-inside-avoid"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        {inst.demands.map((row, dIdx) => {
                          const isFirstRowOfInst = dIdx === 0;
                          const currentSerial = serialCounter++;
                          const rate = row.avg_unit_price || (row.total_amount && row.total_quantity ? (row.total_amount / row.total_quantity) : 75.00);

                          return (
                            <tr key={row.id || `${inst.id}-${dIdx}`} className="hover:bg-slate-50/70 print:bg-white transition-colors">
                              {/* S.NO */}
                              <td className="px-3 py-3 text-slate-500 font-bold text-center print:text-black border border-slate-200 print:border-black">
                                {currentSerial}
                              </td>

                              {/* INSTITUTION WITH ADDRESS - MERGED ACROSS ALL DEMANDS OF THIS INSTITUTION */}
                              {isFirstRowOfInst && (
                                <td
                                  rowSpan={demandCount}
                                  className="px-3.5 py-3 text-xs text-slate-900 border border-slate-200 print:border-black align-top bg-white print:bg-white min-w-[240px]"
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="font-bold text-slate-900 uppercase text-xs tracking-tight">{inst.name}</div>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFunding(inst)}
                                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 border cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xs print:border-black ${
                                        (inst.type || 'STATE') === 'CENTRE'
                                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      }`}
                                      title="Click to toggle funding mode between STATE and CENTRE in real-time"
                                    >
                                      {(inst.type || 'STATE') === 'CENTRE' ? '🏛️ CENTRE' : '🏢 STATE'}
                                    </button>
                                  </div>
                                  {inst.address && (
                                    <div className="text-xs text-slate-600 font-normal leading-snug mt-1">
                                      {inst.address}
                                    </div>
                                  )}
                                  {inst.ano && inst.ano !== '-' && (
                                    <div className="text-xs text-blue-700 print:text-black font-semibold mt-1 flex items-center gap-1 leading-snug">
                                      <span>ANO/CTO:</span> <span>{inst.ano}</span>
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* DATE OF SUPPLY */}
                              <td className="px-3 py-3 font-medium text-slate-700 print:text-black text-center whitespace-nowrap border border-slate-200 print:border-black">
                                {formatDDMMYYYY(row.demand_date)}
                              </td>

                              {/* DEMAND REF */}
                              <td className="px-3 py-3 font-mono font-medium text-blue-700 print:text-black text-center whitespace-nowrap border border-slate-200 print:border-black">
                                {row.demand_number || '-'}
                              </td>

                              {/* UNIT */}
                              <td className="px-3 py-3 text-slate-700 print:text-black text-center whitespace-nowrap border border-slate-200 print:border-black">
                                {row.unit_name || inst.unit_name || '-'}
                              </td>

                              {/* PLACE OF SUPPLY */}
                              <td className="px-3 py-3 text-center font-medium text-slate-700 border border-slate-200 print:border-black">
                                DELHI
                              </td>

                              {/* INVOICE DATE - Fetched directly from Monthly Summary record */}
                              <td className="px-3 py-3 text-center border border-slate-200 print:border-black min-w-[120px] font-mono text-slate-700 whitespace-nowrap">
                                {formatDDMMYYYY(row.invoice_date) || '-'}
                              </td>

                              {/* INVOICE NO - Fetched directly from Monthly Summary record */}
                              <td className="px-3 py-3 text-center border border-slate-200 print:border-black min-w-[120px] font-mono font-bold text-blue-700 whitespace-nowrap">
                                {row.invoice_no || '-'}
                              </td>

                              {/* ITEM */}
                              <td className="px-3 py-3 text-slate-700 print:text-black whitespace-nowrap border border-slate-200 print:border-black">
                                <span>Refreshment Packet</span>
                                {(row.status === 'REJECTED' || row.status === 'CANCELLED') && (
                                  <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-rose-100 text-rose-700 border border-rose-200">
                                    {row.status}
                                  </span>
                                )}
                              </td>

                              {/* QTY */}
                              <td className="px-3 py-3 text-center font-bold text-slate-900 print:text-black border border-slate-200 print:border-black">
                                {(row.status === 'REJECTED' || row.status === 'CANCELLED') ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-rose-600 font-black">0</span>
                                    {row.original_quantity > 0 && (
                                      <span className="text-[9px] text-slate-400 line-through print:hidden">
                                        ({row.original_quantity})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  Number(row.total_quantity || row.quantity || 0)
                                )}
                              </td>

                              {/* RATE INCL GST */}
                              <td className="px-3 py-3 text-right font-normal text-slate-700 print:text-black border border-slate-200 print:border-black">
                                ₹{formatAmount(rate)}
                              </td>

                              {/* AMOUNT */}
                              <td className="px-3 py-3 text-right font-bold text-emerald-600 print:text-black border border-slate-200 print:border-black">
                                {(row.status === 'REJECTED' || row.status === 'CANCELLED') ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-rose-600 font-black">₹0.00</span>
                                    {row.original_amount > 0 && (
                                      <span className="text-[9px] text-slate-400 line-through print:hidden">
                                        (₹{formatAmount(row.original_amount)})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  `₹${formatAmount(row.total_amount)}`
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })
                )}

              {/* Grand Total Footer (No Subtotals between Institutions as requested) */}
              {groupedByInstitution.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 print:bg-slate-100 print:border-black font-bold">
                  <tr className="text-xs">
                    <td colSpan={9} className="px-4 py-3.5 text-right uppercase tracking-wider text-slate-800 print:text-black border border-slate-200 print:border-black">
                      GRAND TOTAL ({groupedByInstitution.length} Institutions • {totalDemandsCount} Demands)
                    </td>
                    <td className="px-3 py-3.5 text-center text-sm font-black text-emerald-700 print:text-black border border-slate-200 print:border-black">
                      {totalPacketsCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-normal text-slate-500 border border-slate-200 print:border-black">
                      -
                    </td>
                    <td className="px-3 py-3.5 text-right text-sm font-black text-emerald-700 print:text-black border border-slate-200 print:border-black">
                      ₹{formatAmount(totalCostAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Month Demands Scope Notice */}
          {availableInstitutions.length > groupedByInstitution.length && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 font-medium flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span>
                  Showing <b>{groupedByInstitution.length}</b> of <b>{availableInstitutions.length}</b> {fundingFilter !== 'ALL' ? (fundingFilter === 'CENTRE' ? 'Centre' : 'State') : ''} institutions with demands in <b>{monthDisplayStr}</b>.
                  {availableInstitutions.length - groupedByInstitution.length > 0 && ` (${availableInstitutions.length - groupedByInstitution.length} other registered institution(s) had 0 demands scheduled in this month).`}
                </span>
              </div>
              <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Tip: Select earlier months (e.g. October 2026) to view their demands.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AnnualSummaryView = () => {
    const isUnitRole = user?.role === 'UNIT';
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [unitFilter, setUnitFilter] = useState(() => {
      if (isUnitRole && user?.unit_name) return user.unit_name;
      return 'All';
    });
    const [instFilter, setInstFilter] = useState('All');
    
    const safeDemands = Array.isArray(demands) ? demands : [];
    const safeInstitutions = Array.isArray(institutions) ? institutions : [];

    const availableYears = useMemo(() => {
      const yrs = new Set();
      const filteredDemands = safeDemands.filter(d => selectedGroup === 'All' || d.ncc_group === selectedGroup);
      filteredDemands.forEach(d => {
        if (d.demand_date) yrs.add(new Date(d.demand_date).getFullYear().toString());
      });
      return Array.from(yrs).sort().reverse();
    }, [safeDemands, selectedGroup]);
    
    if (!availableYears.includes(yearFilter) && availableYears.length > 0) {
      setYearFilter(availableYears[0]);
    }

    // Available NCC Units
    const availableUnits = useMemo(() => {
      const unitNames = new Set();
      (units || []).forEach(u => { if (u.unit_name) unitNames.add(u.unit_name); });
      (safeInstitutions || []).forEach(inst => {
        const uName = inst.unit_name || units.find(u => u.id === inst.unit_id)?.unit_name;
        if (uName) unitNames.add(uName);
      });
      return Array.from(unitNames).sort();
    }, [units, safeInstitutions]);

    // Available Institutions under current Unit filter
    const availableInstitutions = useMemo(() => {
      return (safeInstitutions || []).filter(inst => {
        if (unitFilter === 'All') return true;
        const instUnit = inst.unit_name || (units.find(u => u.id === inst.unit_id)?.unit_name);
        return instUnit === unitFilter;
      }).sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || ''));
    }, [safeInstitutions, units, unitFilter]);

    // Auto-reset institution filter if not in available list
    useEffect(() => {
      if (instFilter !== 'All') {
        const exists = availableInstitutions.some(i => String(i.id) === String(instFilter) || i.institution_name === instFilter);
        if (!exists) setInstFilter('All');
      }
    }, [unitFilter, availableInstitutions, instFilter]);

    const schoolStats = useMemo(() => {
      const filteredInstitutions = safeInstitutions.filter(inst => {
        if (selectedGroup !== 'All' && inst.ncc_group !== selectedGroup) return false;
        
        // Unit filter
        if (unitFilter !== 'All') {
          const instUnit = inst.unit_name || (units.find(u => u.id === inst.unit_id)?.unit_name);
          if (instUnit !== unitFilter) return false;
        }

        // Institution filter
        if (instFilter !== 'All') {
          if (String(inst.id) !== String(instFilter) && inst.institution_name !== instFilter) return false;
        }

        return true;
      });
      
      return filteredInstitutions.map(inst => {
        const s1 = inst.strength_1st_year || 0;
        const s2 = inst.strength_2nd_year || 0;
        const s3 = inst.strength_3rd_year || 0;
        const vacancy = s1 + s2 + s3;
        
        const instDemands = safeDemands.filter(d => {
          if (d.institution_id !== inst.id) return false;
          if (d.status === 'CANCELLED' || d.status === 'REJECTED') return false;
          const dYear = new Date(d.demand_date).getFullYear().toString();
          return dYear === yearFilter;
        });

        const unitObj = units.find(u => u.id === inst.unit_id) || (units.length > 0 ? units[0] : {});
        const authClasses1 = unitObj.auth_classes_1 ?? 40;
        const authClasses2 = unitObj.auth_classes_2 ?? 35;
        const authClasses3 = unitObj.auth_classes_3 ?? 35;

        const authPackets1 = s1 * authClasses1;
        const authPackets2 = s2 * authClasses2;
        const authPackets3 = s3 * authClasses3;
        const authPackets = authPackets1 + authPackets2 + authPackets3;

        const packetsDemanded1 = instDemands.reduce((sum, d) => sum + (Number(d.y1_quantity) || 0), 0);
        const packetsDemanded2 = instDemands.reduce((sum, d) => sum + (Number(d.y2_quantity) || 0), 0);
        const packetsDemanded3 = instDemands.reduce((sum, d) => sum + (Number(d.y3_quantity) || 0), 0);
        const packetsDemanded = packetsDemanded1 + packetsDemanded2 + packetsDemanded3;

        const classesHeld1 = instDemands.filter(d => (Number(d.y1_quantity) || 0) > 0).length;
        const classesHeld2 = instDemands.filter(d => (Number(d.y2_quantity) || 0) > 0).length;
        const classesHeld3 = instDemands.filter(d => (Number(d.y3_quantity) || 0) > 0).length;
        const classesHeld = classesHeld1 + classesHeld2 + classesHeld3;
        
        const balanceClasses1 = Math.max(0, authClasses1 - classesHeld1);
        const balanceClasses2 = Math.max(0, authClasses2 - classesHeld2);
        const balanceClasses3 = Math.max(0, authClasses3 - classesHeld3);
        
        const balancePackets1 = authPackets1 - packetsDemanded1;
        const balancePackets2 = authPackets2 - packetsDemanded2;
        const balancePackets3 = authPackets3 - packetsDemanded3;
        const balancePackets = balancePackets1 + balancePackets2 + balancePackets3;

        const utilizationPct = authPackets > 0 ? Math.round((packetsDemanded / authPackets) * 100) : 0;
        const isOverQuota = packetsDemanded > authPackets;
        
        const totalAmount = instDemands.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);

        return {
          ...inst,
          vacancy, 
          s1, s2, s3,
          authClasses1, authClasses2, authClasses3,
          authPackets1, authPackets2, authPackets3, authPackets,
          classesHeld1, classesHeld2, classesHeld3, classesHeld,
          packetsDemanded1, packetsDemanded2, packetsDemanded3, packetsDemanded,
          balanceClasses1, balanceClasses2, balanceClasses3,
          balancePackets1, balancePackets2, balancePackets3, balancePackets,
          utilizationPct, isOverQuota, totalAmount
        };
      }).sort((a, b) => a.institution_name.localeCompare(b.institution_name));
    }, [safeInstitutions, safeDemands, yearFilter, unitFilter, instFilter, selectedGroup, units]);

    const filtered = schoolStats.filter(s => 
      s.institution_name.toLowerCase().includes(search.toLowerCase()) || 
      (s.ano_cto_name && s.ano_cto_name.toLowerCase().includes(search.toLowerCase()))
    );

    const filteredVacancy = filtered.reduce((s, x) => s + x.vacancy, 0);
    const filteredAuthPackets = filtered.reduce((s, x) => s + x.authPackets, 0);
    const filteredPacketsDemanded = filtered.reduce((s, x) => s + x.packetsDemanded, 0);
    const filteredBalancePackets = filteredAuthPackets - filteredPacketsDemanded;
    const filteredUtilization = filteredAuthPackets > 0 ? Math.round((filteredPacketsDemanded / filteredAuthPackets) * 100) : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Filters and Control Panel (Hidden during print) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                <School size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  School Annual Refreshment Summary
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Quota Allocation: Configured Classes per Year (1 Packet/Cadet per Class)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/25 border border-blue-400/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} className="text-sky-200 shrink-0" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Unit, Institution, Year, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* 1. Unit Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                NCC Unit
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                disabled={isUnitRole}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs ${isUnitRole ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {!isUnitRole && <option value="All">🏢 All NCC Units ({availableUnits.length})</option>}
                {availableUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* 2. Institution Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Filter Institution
              </label>
              <select
                value={instFilter}
                onChange={(e) => setInstFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="All">🏫 All Institutions ({availableInstitutions.length})</option>
                {availableInstitutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.institution_name}</option>
                ))}
              </select>
            </div>

            {/* 3. Year Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Select Year
              </label>
              <select 
                value={yearFilter} 
                onChange={e => setYearFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                {availableYears.map(y => <option key={y} value={y}>📅 Year {y}</option>)}
              </select>
            </div>

            {/* 4. Search Filter */}
            <div>
              <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text" 
                  placeholder="Search Institution, ANO..."
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl print:shadow-none print:border-none print:bg-white">
          <PrintHeader 
            title={`SCHOOL REFRESHMENT ANNUAL SUMMARY - YEAR ${yearFilter}${unitFilter !== 'All' ? ` - UNIT: ${unitFilter.toUpperCase()}` : ''}`} 
            period={`YEAR ${yearFilter}`} 
            extraMeta={`TOTAL INSTITUTIONS: ${filtered.length} • TOTAL VACANCY: ${filteredVacancy}`}
          />
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[1200px] print:min-w-full">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-200 print:border-black">
                  <th rowSpan={2} className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200 w-10">No</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase tracking-widest print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200 min-w-[200px]">Institution & ANO Details</th>
                  <th colSpan={4} className="px-2 py-2 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center print:text-black border-r border-b border-slate-200 print:border-black bg-slate-100/50 print:bg-slate-300">Sanctioned Vacancy Strength</th>
                  
                  <th colSpan={5} className="px-2 py-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest text-center print:text-black border-r border-b border-slate-200 print:border-black bg-indigo-50/50 print:bg-slate-300">1st Year Breakdown</th>
                  <th colSpan={5} className="px-2 py-2 text-[10px] font-black text-purple-700 uppercase tracking-widest text-center print:text-black border-r border-b border-slate-200 print:border-black bg-purple-50/50 print:bg-slate-300">2nd Year Breakdown</th>
                  <th colSpan={5} className="px-2 py-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center print:text-black border-r border-b border-slate-200 print:border-black bg-emerald-50/50 print:bg-slate-300">3rd Year Breakdown</th>
                  
                  <th rowSpan={2} className="px-2 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-100 print:bg-slate-200">Total Auth Pkts</th>
                  <th rowSpan={2} className="px-2 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Total Demanded</th>
                  <th rowSpan={2} className="px-2 py-3 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Total Balance</th>
                  <th rowSpan={2} className="px-2 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Util %</th>
                </tr>
                <tr className="bg-white border-b-2 border-slate-300 print:bg-slate-100 print:border-black">
                  <th className="px-1 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">1st Yr</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">2nd Yr</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">3rd Yr</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-800 uppercase text-center border-r border-slate-200 print:border-black print:text-black bg-slate-100/80 print:bg-slate-200">Total</th>
                  
                  <th className="px-1 py-2 text-[9px] font-black text-blue-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Cls</th>
                  <th className="px-1 py-2 text-[9px] font-black text-indigo-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Pkt</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-700 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Cls Held</th>
                  <th className="px-1 py-2 text-[9px] font-black text-emerald-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Demnd</th>
                  <th className="px-1 py-2 text-[9px] font-black text-amber-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Bal Pkt</th>

                  <th className="px-1 py-2 text-[9px] font-black text-blue-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Cls</th>
                  <th className="px-1 py-2 text-[9px] font-black text-purple-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Pkt</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-700 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Cls Held</th>
                  <th className="px-1 py-2 text-[9px] font-black text-emerald-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Demnd</th>
                  <th className="px-1 py-2 text-[9px] font-black text-amber-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Bal Pkt</th>

                  <th className="px-1 py-2 text-[9px] font-black text-blue-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Cls</th>
                  <th className="px-1 py-2 text-[9px] font-black text-emerald-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Auth Pkt</th>
                  <th className="px-1 py-2 text-[9px] font-black text-slate-700 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Cls Held</th>
                  <th className="px-1 py-2 text-[9px] font-black text-emerald-600 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Demnd</th>
                  <th className="px-1 py-2 text-[9px] font-black text-amber-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">Bal Pkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-black">
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-100/40 print:bg-white text-[11px]">
                    <td className="px-2 py-2 font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{idx + 1}</td>
                    <td className="px-3 py-2 border-r border-slate-200 print:border-black">
                      <div className="font-black text-slate-800 uppercase print:text-black truncate">{row.institution_name}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase print:text-slate-700">{row.ano_cto_name || '-'}</div>
                      {row.isOverQuota && <div className="text-[8px] font-black text-rose-500 mt-0.5 print:text-rose-700">⚠️ OVER QUOTA</div>}
                    </td>
                    <td className="px-1 py-2 font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.s1}</td>
                    <td className="px-1 py-2 font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.s2}</td>
                    <td className="px-1 py-2 font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.s3}</td>
                    <td className="px-1 py-2 font-black text-slate-900 text-center border-r border-slate-200 print:border-black print:text-black bg-slate-100/30 print:bg-slate-100">{row.vacancy}</td>
                    
                    {/* 1st Yr */}
                    <td className="px-1 py-2 font-black text-blue-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.authClasses1}</td>
                    <td className="px-1 py-2 font-black text-indigo-400 text-center border-r border-slate-200 print:border-black print:text-black">{row.authPackets1.toLocaleString()}</td>
                    <td className="px-1 py-2 font-black text-slate-700 text-center border-r border-slate-200 print:border-black print:text-black">{row.classesHeld1}</td>
                    <td className="px-1 py-2 font-black text-emerald-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.packetsDemanded1.toLocaleString()}</td>
                    <td className={`px-1 py-2 font-black text-center border-r border-slate-200 print:border-black print:text-black ${row.balancePackets1 < 0 ? 'text-rose-500 bg-rose-50' : 'text-amber-500'}`}>{row.balancePackets1.toLocaleString()}</td>

                    {/* 2nd Yr */}
                    <td className="px-1 py-2 font-black text-blue-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.authClasses2}</td>
                    <td className="px-1 py-2 font-black text-purple-400 text-center border-r border-slate-200 print:border-black print:text-black">{row.authPackets2.toLocaleString()}</td>
                    <td className="px-1 py-2 font-black text-slate-700 text-center border-r border-slate-200 print:border-black print:text-black">{row.classesHeld2}</td>
                    <td className="px-1 py-2 font-black text-emerald-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.packetsDemanded2.toLocaleString()}</td>
                    <td className={`px-1 py-2 font-black text-center border-r border-slate-200 print:border-black print:text-black ${row.balancePackets2 < 0 ? 'text-rose-500 bg-rose-50' : 'text-amber-500'}`}>{row.balancePackets2.toLocaleString()}</td>

                    {/* 3rd Yr */}
                    <td className="px-1 py-2 font-black text-blue-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.authClasses3}</td>
                    <td className="px-1 py-2 font-black text-emerald-400 text-center border-r border-slate-200 print:border-black print:text-black">{row.authPackets3.toLocaleString()}</td>
                    <td className="px-1 py-2 font-black text-slate-700 text-center border-r border-slate-200 print:border-black print:text-black">{row.classesHeld3}</td>
                    <td className="px-1 py-2 font-black text-emerald-600 text-center border-r border-slate-200 print:border-black print:text-black">{row.packetsDemanded3.toLocaleString()}</td>
                    <td className={`px-1 py-2 font-black text-center border-r border-slate-200 print:border-black print:text-black ${row.balancePackets3 < 0 ? 'text-rose-500 bg-rose-50' : 'text-amber-500'}`}>{row.balancePackets3.toLocaleString()}</td>
                    
                    {/* Totals */}
                    <td className="px-2 py-2 font-black text-slate-800 text-center border-r border-slate-200 print:border-black print:text-black bg-slate-50">{row.authPackets.toLocaleString()}</td>
                    <td className="px-2 py-2 font-black text-emerald-600 text-center border-r border-slate-200 print:border-black print:text-black bg-emerald-50/30">{row.packetsDemanded.toLocaleString()}</td>
                    <td className={`px-2 py-2 font-black text-center border-r border-slate-200 print:border-black print:text-black ${row.isOverQuota ? 'text-rose-500 bg-rose-100/50' : 'text-amber-500 bg-amber-50/30'}`}>
                      {row.balancePackets.toLocaleString()}
                    </td>
                    <td className="px-1 py-2 text-center border-r border-slate-200 print:border-black">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${row.isOverQuota ? 'bg-rose-900/50 text-rose-600' : 'bg-slate-100 text-slate-700'} print:bg-white print:text-black`}>
                        {row.utilizationPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:bg-slate-200 print:border-black font-black text-[11px]">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right uppercase tracking-widest text-slate-500 print:text-black">Grand Total</td>
                  <td className="px-1 py-3 text-center text-slate-800 print:text-black">{filteredVacancy}</td>
                  <td colSpan={15} className="px-1 py-3 border-r border-slate-200 print:border-black text-center text-slate-400 font-medium">Yearwise Totals</td>
                  <td className="px-2 py-3 text-center text-slate-800 print:text-black bg-slate-100">{filteredAuthPackets.toLocaleString()}</td>
                  <td className="px-2 py-3 text-center text-emerald-600 print:text-black bg-emerald-50/50">{filteredPacketsDemanded.toLocaleString()}</td>
                  <td className="px-2 py-3 text-center text-amber-500 print:text-black bg-amber-50/50">{filteredBalancePackets.toLocaleString()}</td>
                  <td className="px-1 py-3 text-center text-slate-800 print:text-black">{filteredUtilization}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 5. BILL TRACKING & PAYMENTS (UNITWISE MONTHLY CONSOLE WITH EXPANDABLE INSTITUTIONS)
  // ════════════════════════════════════════════════════════════════════════════
  const BillTrackerView = () => {
    const isUnit = user?.role === 'UNIT';
    const isAdmin = user?.role === 'ADMIN';
    const [month, setMonth] = useState(getLocalYearMonth());
    const [unitPayments, setUnitPayments] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [expandedUnitIds, setExpandedUnitIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | SUBMITTED | PAID
    const [savingAction, setSavingAction] = useState(false);
    const [uploadingAdvice, setUploadingAdvice] = useState(false);

    // 1. Unit Action: Submit Bill to PCDA Modal State
    const [pcdaModal, setPcdaModal] = useState({
      isOpen: false,
      unit: null,
      formData: {
        submission_date: new Date().toISOString().split('T')[0],
        letter_ref: '',
        remarks: ''
      }
    });

    // 2. Admin Action: View Details & Verify Vendor Bank Credit Modal State
    const [adminDetailModal, setAdminDetailModal] = useState({
      isOpen: false,
      unit: null,
      formData: {
        paid_amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'NEFT / RTGS (Bank Transfer)',
        payment_ref: '',
        other_deductions: 0,
        payment_advice_url: '',
        remarks: ''
      }
    });

    // Month options derived from demands
    const monthOptions = useMemo(() => {
      const setM = new Set();
      (demands || []).forEach(d => {
        if (d.demand_date && d.status !== 'CANCELLED' && d.status !== 'REJECTED') {
          const ym = String(d.demand_date).slice(0, 7);
          if (/^\d{4}-\d{2}$/.test(ym)) setM.add(ym);
        }
      });
      const list = Array.from(setM).sort().reverse();
      return list.map(ym => {
        const [y, m] = ym.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        const label = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();
        return { value: ym, label };
      });
    }, [demands]);

    // Automatically synchronize month so it always points to an available month with data
    useEffect(() => {
      if (monthOptions.length > 0) {
        const hasCurrent = monthOptions.some(m => m.value === month);
        if (!hasCurrent) {
          setMonth(monthOptions[0].value);
        }
      }
    }, [monthOptions, month]);

    // Fetch Unit payments from backend
    const fetchUnitPayments = async () => {
      if (!month) return;
      setLoadingUnits(true);
      try {
        const qGroup = selectedGroup !== 'All' ? `&ncc_group=${encodeURIComponent(selectedGroup)}` : '';
        const res = await fetch(`/api/refreshment-bills/unit-payments?month=${encodeURIComponent(month)}${qGroup}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnitPayments(Array.isArray(data) ? data : []);
        } else {
          let errMsg = 'Failed to load Unit payment records.';
          try {
            const errJson = await res.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch (e) {}
          toast.error(errMsg);
          setUnitPayments([]);
        }
      } catch (err) {
        console.error('Fetch unit payments error:', err);
        toast.error('Network error loading Unit payment records.');
        setUnitPayments([]);
      } finally {
        setLoadingUnits(false);
      }
    };

    useEffect(() => {
      fetchUnitPayments();
    }, [month, selectedGroup]);

    // Toggle expand for a unit row
    const toggleExpandUnit = (unitId) => {
      setExpandedUnitIds(prev => {
        const next = new Set(prev);
        if (next.has(unitId)) {
          next.delete(unitId);
        } else {
          next.add(unitId);
        }
        return next;
      });
    };

    // Expand all / collapse all
    const handleToggleExpandAll = () => {
      if (expandedUnitIds.size === filteredUnitPayments.length && filteredUnitPayments.length > 0) {
        setExpandedUnitIds(new Set());
      } else {
        const allIds = new Set(filteredUnitPayments.map(u => u.unit_id));
        setExpandedUnitIds(allIds);
      }
    };

    // Filter by search query & payment status
    const filteredUnitPayments = useMemo(() => {
      return (unitPayments || []).filter(u => {
        // Group filter
        if (selectedGroup !== 'All' && u.ncc_group !== selectedGroup) return false;
        
        // Status filter
        if (statusFilter === 'PAID' && u.payment_status !== 'PAID') return false;
        if (statusFilter === 'SUBMITTED' && u.payment_status !== 'SUBMITTED_TO_PCDA') return false;
        if (statusFilter === 'PENDING' && (u.payment_status === 'PAID' || u.payment_status === 'SUBMITTED_TO_PCDA')) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchUnit = (u.unit_name || '').toLowerCase().includes(q) ||
            (u.unit_code || '').toLowerCase().includes(q) ||
            (u.payment_ref || '').toLowerCase().includes(q) ||
            (u.pcda_letter_ref || '').toLowerCase().includes(q);
          const matchInst = (u.institutions || []).some(inst =>
            (inst.institution_name || '').toLowerCase().includes(q) ||
            (inst.ano_cto_name || '').toLowerCase().includes(q)
          );
          if (!matchUnit && !matchInst) return false;
        }

        return true;
      });
    }, [unitPayments, selectedGroup, statusFilter, searchQuery]);

    // Overall summary metrics including statutory TDS
    const summary = useMemo(() => {
      let unitsCount = 0;
      let totalPkts = 0;
      let totalGross = 0;
      let totalGstTds = 0;
      let totalItTds = 0;
      let totalDeductions = 0;
      let totalNetCredit = 0;
      let totalPaidReceived = 0;
      let paidCount = 0;
      let submittedCount = 0;
      let pendingCount = 0;

      filteredUnitPayments.forEach(u => {
        if (u.total_packets > 0 || u.gross_amount > 0 || u.paid_amount > 0) {
          unitsCount += 1;
        }
        totalPkts += Number(u.total_packets || 0);
        totalGross += Number(u.gross_amount || u.total_amount || 0);
        totalGstTds += Number(u.gst_tds_amount || 0);
        totalItTds += Number(u.it_tds_amount || 0);
        totalDeductions += Number(u.total_deductions || 0);
        totalNetCredit += Number(u.net_credit_amount || u.expected_net_credit || 0);
        totalPaidReceived += Number(u.paid_amount || 0);

        if (u.payment_status === 'PAID') {
          paidCount += 1;
        } else if (u.submitted_to_pcda === 1 || u.payment_status === 'SUBMITTED_TO_PCDA') {
          submittedCount += 1;
        } else {
          pendingCount += 1;
        }
      });

      const totalPendingBalance = Math.max(0, totalGross - totalPaidReceived);

      return {
        unitsCount,
        totalPkts,
        totalGross,
        totalGstTds,
        totalItTds,
        totalDeductions,
        totalNetCredit,
        totalPaidReceived,
        totalPendingBalance,
        paidCount,
        submittedCount,
        pendingCount
      };
    }, [filteredUnitPayments]);

    // ═══ Handlers for Unit PCDA Submission Modal ═══
    const handleOpenPcdaModal = (unit, e) => {
      if (e) e.stopPropagation();
      setPcdaModal({
        isOpen: true,
        unit,
        formData: {
          submission_date: unit.pcda_submission_date || new Date().toISOString().split('T')[0],
          letter_ref: unit.pcda_letter_ref || '',
          remarks: unit.remarks || ''
        }
      });
    };

    const handleClosePcdaModal = () => {
      setPcdaModal({
        isOpen: false,
        unit: null,
        formData: {
          submission_date: new Date().toISOString().split('T')[0],
          letter_ref: '',
          remarks: ''
        }
      });
    };

    const handleSavePcdaSubmit = async (e) => {
      e.preventDefault();
      if (!pcdaModal.unit) return;
      setSavingAction(true);
      try {
        const payload = {
          unit_id: pcdaModal.unit.unit_id,
          month,
          submission_date: pcdaModal.formData.submission_date,
          letter_ref: pcdaModal.formData.letter_ref,
          remarks: pcdaModal.formData.remarks
        };
        const res = await fetch('/api/refreshment-bills/unit-pcda-submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || 'Bill submitted to PCDA recorded successfully!');
          handleClosePcdaModal();
          fetchUnitPayments();
        } else {
          toast.error(data.error || 'Failed to record PCDA submission.');
        }
      } catch (err) {
        console.error('Save PCDA submit error:', err);
        toast.error('Network error recording PCDA submission.');
      } finally {
        setSavingAction(false);
      }
    };

    // ═══ Handlers for Admin View Details & Bank Credit Verification Modal ═══
    const handleOpenAdminDetailModal = (unit, e) => {
      if (e) e.stopPropagation();
      const expectedNet = unit.expected_net_credit || Math.max(0, (unit.gross_amount || unit.total_amount) - (unit.total_deductions || 0));
      setAdminDetailModal({
        isOpen: true,
        unit,
        formData: {
          paid_amount: unit.net_credit_amount > 0 ? unit.net_credit_amount : expectedNet,
          payment_date: unit.payment_date || new Date().toISOString().split('T')[0],
          payment_mode: unit.payment_mode || 'NEFT / RTGS (Bank Transfer)',
          payment_ref: unit.payment_ref || '',
          other_deductions: unit.other_deductions || 0,
          payment_advice_url: unit.payment_advice_url || '',
          remarks: unit.remarks || ''
        }
      });
    };

    const handleCloseAdminDetailModal = () => {
      setAdminDetailModal({
        isOpen: false,
        unit: null,
        formData: {
          paid_amount: 0,
          payment_date: '',
          payment_mode: '',
          payment_ref: '',
          other_deductions: 0,
          payment_advice_url: '',
          remarks: ''
        }
      });
    };

    const handleUploadAdviceFile = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingAdvice(true);
      try {
        const formData = new FormData();
        formData.append('document', file);
        const res = await fetch('/api/refreshment-bills/upload-advice', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setAdminDetailModal(prev => ({
            ...prev,
            formData: {
              ...prev.formData,
              payment_advice_url: data.url
            }
          }));
          toast.success('Payment advice uploaded successfully!');
        } else {
          toast.error(data.error || 'Failed to upload advice.');
        }
      } catch (err) {
        console.error('Upload advice error:', err);
        toast.error('Network error uploading payment advice.');
      } finally {
        setUploadingAdvice(false);
      }
    };

    const handleVerifyVendorCredit = async (e) => {
      e.preventDefault();
      if (!adminDetailModal.unit) return;
      setSavingAction(true);
      try {
        const payload = {
          unit_id: adminDetailModal.unit.unit_id,
          month,
          gross_amount: adminDetailModal.unit.gross_amount || adminDetailModal.unit.total_amount,
          paid_amount: Number(adminDetailModal.formData.paid_amount) || 0,
          payment_date: adminDetailModal.formData.payment_date,
          payment_mode: adminDetailModal.formData.payment_mode,
          payment_ref: adminDetailModal.formData.payment_ref,
          payment_advice_url: adminDetailModal.formData.payment_advice_url,
          other_deductions: Number(adminDetailModal.formData.other_deductions) || 0,
          gst_tds_amount: adminDetailModal.unit.gst_tds_amount,
          it_tds_amount: adminDetailModal.unit.it_tds_amount,
          remarks: adminDetailModal.formData.remarks
        };
        const res = await fetch('/api/refreshment-bills/verify-vendor-credit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || 'Vendor bank credit confirmed & saved successfully!');
          handleCloseAdminDetailModal();
          fetchUnitPayments();
        } else {
          toast.error(data.error || 'Failed to confirm bank credit.');
        }
      } catch (err) {
        console.error('Verify vendor credit error:', err);
        toast.error('Network error confirming bank credit.');
      } finally {
        setSavingAction(false);
      }
    };

    // Export to Excel (Unit summary with Statutory TDS + Institution breakdown)
    const handleExportExcel = () => {
      if (filteredUnitPayments.length === 0) {
        toast.error('No payment records to export.');
        return;
      }

      const rows = [];
      filteredUnitPayments.forEach((u, uIdx) => {
        rows.push({
          'Record Type': 'UNIT SUMMARY',
          'S.No': uIdx + 1,
          'Unit Name': u.unit_name,
          'Unit Code': u.unit_code || '-',
          'NCC Group': u.ncc_group || '-',
          'Month': u.month_label,
          'Institutions Count': u.institutions_count,
          'Total Packets': u.total_packets,
          'Gross Bill (₹)': u.gross_amount || u.total_amount,
          'GST TDS Rate (%)': `${u.gst_tds_rate || 2}%`,
          'GST TDS Amount (₹)': u.gst_tds_amount || 0,
          'IT TDS Rate (%)': `${u.it_tds_rate || 2}%`,
          'IT TDS Amount (₹)': u.it_tds_amount || 0,
          'Other Deductions (₹)': u.other_deductions || 0,
          'Total Deductions (₹)': u.total_deductions || 0,
          'Net Credit (₹)': u.net_credit_amount || u.expected_net_credit || 0,
          'PCDA Submitted': u.submitted_to_pcda ? 'YES' : 'NO',
          'PCDA Submission Date': u.pcda_submission_date ? formatDDMMYYYY(u.pcda_submission_date) : '-',
          'PCDA Letter Ref': u.pcda_letter_ref || '-',
          'Vendor Verified': u.vendor_verified ? 'YES' : 'NO',
          'Payment Status': u.payment_status,
          'Payment Date': u.payment_date ? formatDDMMYYYY(u.payment_date) : '-',
          'Payment Mode': u.payment_mode || '-',
          'Payment Ref / UTR': u.payment_ref || '-',
          'Payment Advice Document': u.payment_advice_url || '-',
          'Remarks': u.remarks || '-'
        });

        (u.institutions || []).forEach((inst, iIdx) => {
          rows.push({
            'Record Type': '  └ Institution Breakdown',
            'S.No': `  ${uIdx + 1}.${iIdx + 1}`,
            'Unit Name': `  ${inst.institution_name}`,
            'Unit Code': inst.ano_cto_name || '-',
            'NCC Group': inst.ano_cto_contact || '-',
            'Month': u.month_label,
            'Institutions Count': `${inst.demand_count} Demands`,
            'Total Packets': inst.total_packets,
            'Gross Bill (₹)': inst.total_amount,
            'GST TDS Rate (%)': '-',
            'GST TDS Amount (₹)': '-',
            'IT TDS Rate (%)': '-',
            'IT TDS Amount (₹)': '-',
            'Other Deductions (₹)': '-',
            'Total Deductions (₹)': '-',
            'Net Credit (₹)': '-',
            'PCDA Submitted': '-',
            'PCDA Submission Date': '-',
            'PCDA Letter Ref': '-',
            'Vendor Verified': '-',
            'Payment Status': inst.payment_status || 'PENDING',
            'Payment Date': inst.bill_submitted ? `Bill Recd (${formatDDMMYYYY(inst.bill_submitted_date)})` : 'Bill Awaited',
            'Payment Mode': '-',
            'Payment Ref / UTR': '-',
            'Payment Advice Document': '-',
            'Remarks': '-'
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Unit_Billing_${month}`);
      XLSX.writeFile(wb, `NCC_Unit_Monthly_Billing_${month}.xlsx`);
      toast.success('Unit monthly billing exported to Excel!');
    };

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <PrintControls />

        {/* ═══ Header & Filter Controls Bar ═══ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs print:hidden space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-2xs">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
                    Unitwise Monthly Bill Tracking & Payments
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Track payments received from NCC Units per month. Click any Unit row to expand institution-wise details.
                  </p>
                </div>
              </div>
            </div>

            {/* Month Selector & Excel Export */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-extrabold text-[11px] text-slate-500">Month:</span>
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="bg-transparent font-black text-xs text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              {monthOptions.length > 0 && (
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                  title="Quick Select Available Demand Month"
                >
                  {monthOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Export Unit Payments and Breakdown to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Slicers & Search Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Payment Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
              {[
                { id: 'ALL', label: `All Units (${summary.unitsCount})` },
                { id: 'PENDING', label: `Pending Submission (${summary.pendingCount})` },
                { id: 'SUBMITTED', label: `Submitted to PCDA (${summary.submittedCount})` },
                { id: 'PAID', label: `Credited / Paid (${summary.paidCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box & Expand All Button */}
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Unit name, code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title={expandedUnitIds.size === filteredUnitPayments.length ? 'Collapse All' : 'Expand All'}
              >
                {expandedUnitIds.size === filteredUnitPayments.length && filteredUnitPayments.length > 0 ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse All</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ 6 Top Summary Metric KPI Cards with TDS Breakdown ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 print:grid-cols-6">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Billed Units</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{summary.unitsCount}</span>
              <span className="text-[10px] font-bold text-slate-400">Units</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-1 truncate">
              Paid: {summary.paidCount} • Sub: {summary.submittedCount} • Bal: {summary.pendingCount}
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block mb-0.5">Total Packets</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-900">{summary.totalPkts.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-bold text-blue-600">Pkts</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-1 truncate">Supplied in {formatMonthLabel(month)}</div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">Gross Bill (100%)</span>
            <div className="text-xl font-black text-slate-900 truncate">₹{formatAmount(summary.totalGross)}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1 truncate">Total supply valuation</div>
          </div>

          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block mb-0.5">TDS Deductions (4%)</span>
            <div className="text-xl font-black text-rose-800 truncate">₹{formatAmount(summary.totalDeductions)}</div>
            <div className="text-[10px] font-bold text-rose-600 mt-1 truncate">
              GST: ₹{formatAmount(summary.totalGstTds)} • IT: ₹{formatAmount(summary.totalItTds)}
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/90 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-0.5">Net Vendor Credit</span>
            <div className="text-xl font-black text-emerald-800 truncate">₹{formatAmount(summary.totalNetCredit)}</div>
            <div className="text-[10px] font-bold text-emerald-600 mt-1 truncate">
              Recd: ₹{formatAmount(summary.totalPaidReceived)}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border shadow-2xs ${summary.totalPendingBalance > 0 ? 'bg-amber-50/70 border-amber-200/90' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${summary.totalPendingBalance > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
              Pending Balance
            </span>
            <div className={`text-xl font-black truncate ${summary.totalPendingBalance > 0 ? 'text-amber-900' : 'text-slate-700'}`}>
              ₹{formatAmount(summary.totalPendingBalance)}
            </div>
            <div className={`text-[10px] font-bold mt-1 truncate ${summary.totalPendingBalance > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              {summary.totalPendingBalance > 0 ? 'Awaiting PCDA Credit' : 'All Clear'}
            </div>
          </div>
        </div>

        {/* ═══ Unitwise Monthly Master Table ═══ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <PrintHeader title="UNITWISE MONTHLY REFRESHMENT BILL SUBMISSION & PAYMENT TRACKER" period={month} />
          
          {loadingUnits ? (
            <div className="p-12 text-center text-slate-500 font-bold bg-white">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Loading Unit payment records for {formatMonthLabel(month)}...
            </div>
          ) : filteredUnitPayments.length === 0 ? (
            <div className="text-center py-16 bg-white p-6">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-900 mb-1">No Unit Demands or Bills Found</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                No refreshment demands were scheduled or delivered for NCC Units in {formatMonthLabel(month)}.
                Try selecting another month from the picker above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-3.5 w-[20%]"># / NCC Unit Details</th>
                    <th className="px-2 py-3.5 text-center w-[7%]">Packets</th>
                    <th className="px-3 py-3.5 text-right w-[11%]">Gross Bill (₹)</th>
                    <th className="px-2 py-3.5 text-right w-[9%] text-rose-700">GST TDS ({filteredUnitPayments[0]?.gst_tds_rate || 2}%)</th>
                    <th className="px-2 py-3.5 text-right w-[9%] text-rose-700">IT TDS ({filteredUnitPayments[0]?.it_tds_rate || 2}%)</th>
                    <th className="px-2 py-3.5 text-right w-[9%] text-rose-800">Total Deduct</th>
                    <th className="px-3 py-3.5 text-right w-[11%] text-emerald-800">Net Credit (₹)</th>
                    <th className="px-3 py-3.5 text-center w-[12%]">PCDA / Bank Status</th>
                    <th className="px-3 py-3.5 text-right w-[10%] print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUnitPayments.map((u, idx) => {
                    const isExpanded = expandedUnitIds.has(u.unit_id);
                    const isPaid = u.payment_status === 'PAID';
                    const isSubmittedToPcda = Number(u.submitted_to_pcda || 0) === 1 || u.payment_status === 'SUBMITTED_TO_PCDA';
                    const isPending = !isPaid && !isSubmittedToPcda;

                    return (
                      <React.Fragment key={u.unit_id}>
                        {/* ─── Unit Master Row (Clickable to toggle expand) ─── */}
                        <tr
                          onClick={() => toggleExpandUnit(u.unit_id)}
                          className={`cursor-pointer transition-colors group select-none ${
                            isExpanded ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Col 1: Expand Chevron + Unit Name & Meta */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleExpandUnit(u.unit_id); }}
                                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                  isExpanded ? 'bg-blue-600 text-white shadow-2xs rotate-180' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={isExpanded ? 'Collapse Institutions' : 'Expand Institutions'}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                                    {u.unit_name}
                                  </h4>
                                  {u.unit_code && (
                                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold border border-slate-200">
                                      {u.unit_code}
                                    </span>
                                  )}
                                  {u.ncc_group && (
                                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-extrabold border border-amber-200">
                                      {u.ncc_group}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{u.institutions_count} {u.institutions_count === 1 ? 'Institution' : 'Institutions'} Supplied</span>
                                  <span>•</span>
                                  <span className="text-blue-600 hover:underline">
                                    {isExpanded ? 'Hide Schools ▲' : 'View Schools ▼'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Supplied Packets */}
                          <td className="px-2 py-3.5 text-center whitespace-nowrap">
                            <span className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-xl shadow-2xs inline-block">
                              {Number(u.total_packets || 0).toLocaleString('en-IN')} Pkts
                            </span>
                          </td>

                          {/* Col 3: Gross Bill Amount (₹) */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap font-black text-xs sm:text-sm text-slate-900">
                            ₹{formatAmount(u.gross_amount || u.total_amount)}
                          </td>

                          {/* Col 4: GST TDS (2%) */}
                          <td className="px-2 py-3.5 text-right whitespace-nowrap font-black text-xs text-rose-700">
                            -₹{formatAmount(u.gst_tds_amount)}
                          </td>

                          {/* Col 5: IT TDS (2%) */}
                          <td className="px-2 py-3.5 text-right whitespace-nowrap font-black text-xs text-rose-700">
                            -₹{formatAmount(u.it_tds_amount)}
                          </td>

                          {/* Col 6: Total Deductions (₹) */}
                          <td className="px-2 py-3.5 text-right whitespace-nowrap font-black text-xs text-rose-800 bg-rose-50/30">
                            -₹{formatAmount(u.total_deductions)}
                          </td>

                          {/* Col 7: Net Vendor Credit (₹) */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap font-black text-xs sm:text-sm text-emerald-700 bg-emerald-50/30">
                            ₹{formatAmount(u.net_credit_amount || u.expected_net_credit)}
                          </td>

                          {/* Col 8: PCDA / Bank Status Badge & Ref */}
                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            {isPaid ? (
                              <div className="space-y-1">
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>CREDITED (PAID)</span>
                                </span>
                                {u.payment_ref && (
                                  <div className="text-[10px] font-mono font-bold text-slate-600 truncate max-w-[130px] mx-auto" title={u.payment_ref}>
                                    UTR: {u.payment_ref}
                                  </div>
                                )}
                                {u.payment_advice_url && (
                                  <a
                                    href={u.payment_advice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 hover:underline"
                                    title="View Payment Advice"
                                  >
                                    <Paperclip className="w-3 h-3 text-emerald-600" />
                                    <span>Bank Advice</span>
                                  </a>
                                )}
                              </div>
                            ) : isSubmittedToPcda ? (
                              <div className="space-y-1">
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  <span>SUBMITTED TO PCDA</span>
                                </span>
                                {u.pcda_submission_date && (
                                  <div className="text-[10px] font-bold text-slate-500">
                                    Date: {formatDDMMYYYY(u.pcda_submission_date)}
                                  </div>
                                )}
                                {u.pcda_letter_ref && (
                                  <div className="text-[10px] font-mono font-bold text-blue-700 truncate max-w-[130px] mx-auto" title={u.pcda_letter_ref}>
                                    Ref: {u.pcda_letter_ref}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>PENDING PCDA</span>
                                </span>
                                <div className="text-[10px] font-bold text-slate-400">Bill at Unit</div>
                              </div>
                            )}
                          </td>

                          {/* Col 9: Action Column */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap print:hidden" onClick={e => e.stopPropagation()}>
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAdminDetailModal(u, e)}
                                className={`px-2.5 py-1.5 rounded-xl font-black text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                                  isPaid
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                }`}
                                title="View bill calculation & verify vendor bank credit"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{isPaid ? 'View Details' : 'Verify Credit'}</span>
                              </button>
                            ) : isUnit ? (
                              <button
                                type="button"
                                onClick={(e) => handleOpenPcdaModal(u, e)}
                                className={`px-2.5 py-1.5 rounded-xl font-black text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                                  u.submitted_to_pcda
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                                }`}
                                title="Record physical bill submission to PCDA / Higher HQ"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>{u.submitted_to_pcda ? 'PCDA Done ✓' : 'Submit PCDA'}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-bold text-xs">-</span>
                            )}
                          </td>
                        </tr>

                        {/* ─── Expandable Nested Row: Institution-wise Details ─── */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-y border-blue-100">
                            <td colSpan={9} className="px-4 py-4 sm:px-8">
                              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <School className="w-4 h-4 text-blue-600" />
                                    <h5 className="font-black text-xs uppercase tracking-wider text-slate-900">
                                      Institution Breakdown for {u.unit_name} — {u.month_label}
                                    </h5>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    {u.institutions.length} Institutions Supplied
                                  </span>
                                </div>

                                {u.institutions.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 font-bold text-xs">
                                    No institutions recorded for this unit.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        <tr>
                                          <th className="px-3 py-2 text-center w-12">S.No</th>
                                          <th className="px-3 py-2">School / Institution & ANO Details</th>
                                          <th className="px-3 py-2 text-center">Demands / Invoices</th>
                                          <th className="px-3 py-2 text-center">Packets</th>
                                          <th className="px-3 py-2 text-right">Amount (₹)</th>
                                          <th className="px-3 py-2 text-center">Physical Bill Status</th>
                                          <th className="px-3 py-2 text-center">Payment Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white">
                                        {u.institutions.map((inst, iIdx) => (
                                          <tr key={inst.institution_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                                              {iIdx + 1}
                                            </td>
                                            <td className="px-3 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-black text-xs text-slate-900 uppercase">
                                                  {inst.institution_name}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${
                                                  inst.institution_type === 'CENTRE'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                  {inst.institution_type === 'CENTRE' ? '🏛️ CENTRE' : '🏢 STATE'}
                                                </span>
                                              </div>
                                              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                                                ANO: {inst.ano_cto_name || 'Assigned ANO'} {inst.ano_cto_contact && `• 📞 ${inst.ano_cto_contact}`}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                                {inst.demand_count} {inst.demand_count === 1 ? 'Demand' : 'Demands'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-black text-slate-900">
                                              {Number(inst.total_packets || 0).toLocaleString('en-IN')} Pkts
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                                              ₹{formatAmount(inst.total_amount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {inst.bill_submitted ? (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                  <span>Recd {inst.bill_submitted_date && `(${formatDDMMYYYY(inst.bill_submitted_date)})`}</span>
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                  <span>Balance</span>
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                                                isPaid || inst.payment_status === 'PAID'
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}>
                                                {isPaid ? 'PAID' : (inst.payment_status || 'PENDING')}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-[11px]">
                                        <tr>
                                          <td colSpan={3} className="px-3 py-2 text-right uppercase tracking-wider text-slate-700">
                                            Subtotal ({u.institutions.length} Institutions)
                                          </td>
                                          <td className="px-3 py-2 text-center font-black text-blue-700">
                                            {Number(u.total_packets || 0).toLocaleString('en-IN')} Pkts
                                          </td>
                                          <td className="px-3 py-2 text-right font-black text-emerald-700">
                                            ₹{formatAmount(u.total_amount)}
                                          </td>
                                          <td colSpan={2} className="px-3 py-2 text-center text-slate-400">
                                            Unit Total
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {filteredUnitPayments.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 print:bg-slate-100 font-black">
                    <tr className="text-xs">
                      <td className="px-3 py-3.5 text-right uppercase tracking-wider text-slate-800">
                        Grand Total ({summary.unitsCount} Units)
                      </td>
                      <td className="px-2 py-3.5 text-center text-blue-700 text-xs sm:text-sm">
                        {summary.totalPkts.toLocaleString('en-IN')} Pkts
                      </td>
                      <td className="px-3 py-3.5 text-right text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        ₹{formatAmount(summary.totalGross)}
                      </td>
                      <td className="px-2 py-3.5 text-right text-rose-700 text-xs sm:text-sm whitespace-nowrap">
                        -₹{formatAmount(summary.totalGstTds)}
                      </td>
                      <td className="px-2 py-3.5 text-right text-rose-700 text-xs sm:text-sm whitespace-nowrap">
                        -₹{formatAmount(summary.totalItTds)}
                      </td>
                      <td className="px-2 py-3.5 text-right text-rose-800 text-xs sm:text-sm whitespace-nowrap bg-rose-50/30">
                        -₹{formatAmount(summary.totalDeductions)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-emerald-700 text-xs sm:text-sm whitespace-nowrap bg-emerald-50/30">
                        ₹{formatAmount(summary.totalNetCredit)}
                      </td>
                      <td className="px-3 py-3.5 text-center text-xs text-slate-600">
                        {summary.paidCount} Paid • {summary.submittedCount} Sub • {summary.pendingCount} Bal
                      </td>
                      <td className="px-3 py-3.5 print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* ═══ Unit Action: Submit Bill to PCDA Modal ═══ */}
        {pcdaModal.isOpen && pcdaModal.unit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <h4 className="font-black text-base tracking-tight flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-300" />
                    <span>Submit Monthly Bill to PCDA / Higher HQ</span>
                  </h4>
                  <p className="text-xs font-bold text-blue-100 mt-0.5">
                    {pcdaModal.unit.unit_name} — {formatMonthLabel(month)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClosePcdaModal}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePcdaSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Gross Bill</span>
                    <span className="text-sm font-black text-slate-900">
                      ₹{formatAmount(pcdaModal.unit.gross_amount || pcdaModal.unit.total_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Packets</span>
                    <span className="text-sm font-black text-blue-700">{pcdaModal.unit.total_packets} Pkts</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Schools</span>
                    <span className="text-sm font-black text-slate-900">{pcdaModal.unit.institutions_count}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
                  Recording PCDA submission informs the vendor that all compiled refreshment bills & supporting documents have been submitted to Higher HQ / PCDA for payment release.
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    PCDA Submission Date *
                  </label>
                  <input
                    type="date"
                    value={pcdaModal.formData.submission_date}
                    onChange={e => setPcdaModal(prev => ({
                      ...prev,
                      formData: { ...prev.formData, submission_date: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    PCDA Letter / Dispatch / Diary Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2DAB/REF/NOV-2026/01 or Diary #9082"
                    value={pcdaModal.formData.letter_ref}
                    onChange={e => setPcdaModal(prev => ({
                      ...prev,
                      formData: { ...prev.formData, letter_ref: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Forwarding Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any diary notes or dispatch remarks..."
                    value={pcdaModal.formData.remarks}
                    onChange={e => setPcdaModal(prev => ({
                      ...prev,
                      formData: { ...prev.formData, remarks: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClosePcdaModal}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingAction ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark PCDA Submitted</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ Admin View Details & Verify Vendor Bank Credit Modal ═══ */}
        {adminDetailModal.isOpen && adminDetailModal.unit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-4 text-white flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h4 className="font-black text-base tracking-tight flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-300" />
                    <span>Unit Monthly Bill & Vendor Bank Credit Verification</span>
                  </h4>
                  <p className="text-xs font-bold text-indigo-200 mt-0.5">
                    {adminDetailModal.unit.unit_name} ({adminDetailModal.unit.ncc_group}) — {formatMonthLabel(month)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAdminDetailModal}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerifyVendorCredit} className="p-6 space-y-4">
                {/* 4 Calculation Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Gross Bill (100%)</span>
                    <span className="text-sm font-black text-slate-900">
                      ₹{formatAmount(adminDetailModal.unit.gross_amount || adminDetailModal.unit.total_amount)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                      {adminDetailModal.unit.total_packets} Packets
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-rose-700 block mb-0.5">
                      GST TDS ({adminDetailModal.unit.gst_tds_rate || 2}%)
                    </span>
                    <span className="text-sm font-black text-rose-900">
                      -₹{formatAmount(adminDetailModal.unit.gst_tds_amount)}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 block mt-0.5">Sec 51 CGST+SGST</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-rose-700 block mb-0.5">
                      IT TDS ({adminDetailModal.unit.it_tds_rate || 2}%)
                    </span>
                    <span className="text-sm font-black text-rose-900">
                      -₹{formatAmount(adminDetailModal.unit.it_tds_amount)}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 block mt-0.5">Sec 194C IT Act</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block mb-0.5">Expected Net Credit</span>
                    <span className="text-sm font-black text-emerald-900">
                      ₹{formatAmount(adminDetailModal.unit.expected_net_credit)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">Net to Vendor A/C</span>
                  </div>
                </div>

                {/* PCDA Submission Status Banner */}
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                  adminDetailModal.unit.submitted_to_pcda
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {adminDetailModal.unit.submitted_to_pcda ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-black">
                        {adminDetailModal.unit.submitted_to_pcda
                          ? 'PCDA Documents Submitted by Unit'
                          : 'Pending Unit Submission to PCDA'}
                      </span>
                      {adminDetailModal.unit.submitted_to_pcda && (
                        <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                          Date: {formatDDMMYYYY(adminDetailModal.unit.pcda_submission_date)}
                          {adminDetailModal.unit.pcda_letter_ref && ` • Ref: ${adminDetailModal.unit.pcda_letter_ref}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {adminDetailModal.unit.vendor_verified === 1 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg font-black text-[10px] border border-emerald-300">
                      ✓ Credit Verified
                    </span>
                  )}
                </div>

                {/* Bank Credit Verification Fields */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h5 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Vendor Bank Credit & Payment Advice Confirmation</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                        Actual Net Credited Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminDetailModal.formData.paid_amount}
                        onChange={e => setAdminDetailModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, paid_amount: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                        Bank Credit Date *
                      </label>
                      <input
                        type="date"
                        value={adminDetailModal.formData.payment_date}
                        onChange={e => setAdminDetailModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, payment_date: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                        Bank Reference / UTR Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR1234567890 / RBI RTGS Ref"
                        value={adminDetailModal.formData.payment_ref}
                        onChange={e => setAdminDetailModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, payment_ref: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                        Other Deductions (if any, ₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminDetailModal.formData.other_deductions}
                        onChange={e => setAdminDetailModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, other_deductions: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Payment Advice Upload */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Bank Payment Advice / Statement Proof (Vendor Upload)
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>{uploadingAdvice ? 'Uploading...' : 'Choose Advice File (PDF/Image)'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleUploadAdviceFile}
                          disabled={uploadingAdvice}
                          className="hidden"
                        />
                      </label>

                      {adminDetailModal.formData.payment_advice_url && (
                        <a
                          href={adminDetailModal.formData.payment_advice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                          <span>View Uploaded Advice</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Vendor Auditor Notes / Verification Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Payment verified in Flavour Base bank account via PCDA credit..."
                      value={adminDetailModal.formData.remarks}
                      onChange={e => setAdminDetailModal(prev => ({
                        ...prev,
                        formData: { ...prev.formData, remarks: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseAdminDetailModal}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction || uploadingAdvice}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingAction ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Verify Bank Credit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AnoBillReturnsView = () => {
    const isAdmin = user?.role === 'ADMIN';
    const [unitFilterId, setUnitFilterId] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | BALANCE | RECEIVED
    const [searchQuery, setSearchQuery] = useState('');
    const [apiBillMap, setApiBillMap] = useState({});
    const [loadingReturns, setLoadingReturns] = useState(false);
    const [sendingBulk, setSendingBulk] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [remarksMap, setRemarksMap] = useState({});
    const [actionBanner, setActionBanner] = useState(null);
    const [expandedInstId, setExpandedInstId] = useState(null);

    const getLocalBillCache = (m) => {
      try {
        const raw = localStorage.getItem(`ncc_ano_bill_returns_${m}`);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    };

    const setLocalBillCache = (m, mapObj) => {
      try {
        localStorage.setItem(`ncc_ano_bill_returns_${m}`, JSON.stringify(mapObj));
      } catch (e) {}
    };

    // Build selectable months from existing demands (latest month with demands selected automatically)
    const monthOptions = useMemo(() => {
      const monthSet = new Set();
      (demands || []).forEach(d => {
        if (d.demand_date && d.status !== 'CANCELLED' && d.status !== 'REJECTED') {
          if (unitFilterId !== 'ALL' && String(d.unit_id) !== String(unitFilterId)) return;
          const ym = String(d.demand_date).slice(0, 7);
          if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
        }
      });
      if (monthSet.size === 0) {
        (demands || []).forEach(d => {
          if (d.demand_date && d.status !== 'CANCELLED' && d.status !== 'REJECTED') {
            const ym = String(d.demand_date).slice(0, 7);
            if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
          }
        });
      }
      if (monthSet.size === 0) {
        monthSet.add(getLocalYearMonth());
      }
      const sorted = Array.from(monthSet).sort().reverse();
      return sorted.map(ym => {
        const [yStr, mStr] = ym.split('-');
        const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
        const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return { value: ym, label };
      });
    }, [demands, unitFilterId]);

    const currentYearMonth = getLocalYearMonth();
    const [month, setMonth] = useState(() => {
      const latestPast = monthOptions.find(m => m.value < currentYearMonth);
      return latestPast?.value || monthOptions[0]?.value || currentYearMonth;
    });
    const isPastMonth = Boolean(month && String(month) < currentYearMonth);

    useEffect(() => {
      if (monthOptions.length > 0 && !monthOptions.some(m => m.value === month)) {
        const latestPast = monthOptions.find(m => m.value < currentYearMonth);
        setMonth(latestPast?.value || monthOptions[0].value);
      }
    }, [monthOptions, month, currentYearMonth]);

    const fetchAnoReturns = async () => {
      if (!month) return;
      setLoadingReturns(true);
      try {
        const qUnit = isAdmin ? `&unit_id=${encodeURIComponent(unitFilterId)}` : '';
        const [anoRes, legacyRes] = await Promise.all([
          fetch(`/api/refreshment-bills/ano-returns?month=${encodeURIComponent(month)}${qUnit}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null),
          fetch(`/api/refreshment-bills?month=${encodeURIComponent(month)}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null)
        ]);

        const merged = {};
        const rMap = {};

        if (legacyRes && legacyRes.ok) {
          const legacyData = await legacyRes.json().catch(() => null);
          if (Array.isArray(legacyData)) {
            legacyData.forEach(b => {
              merged[b.institution_id] = {
                bill_id: b.id,
                bill_submitted: Number(b.bill_submitted) === 1 ? 1 : 0,
                bill_submitted_date: b.bill_submitted_date || null,
                remarks: b.remarks || '',
                last_reminder_sent_at: b.last_reminder_sent_at || null,
                reminder_count: Number(b.reminder_count || 0)
              };
              if (b.remarks) rMap[b.institution_id] = b.remarks;
            });
          }
        }

        if (anoRes && anoRes.ok) {
          const anoData = await anoRes.json().catch(() => null);
          if (Array.isArray(anoData)) {
            anoData.forEach(item => {
              merged[item.institution_id] = {
                ...merged[item.institution_id],
                ...item,
                bill_submitted: Number(item.bill_submitted) === 1 ? 1 : 0
              };
              if (item.remarks) rMap[item.institution_id] = item.remarks;
            });
          }
        }

        const cachedLocal = getLocalBillCache(month);
        const finalMerged = { ...cachedLocal, ...merged };
        Object.keys(cachedLocal).forEach(k => {
          if (cachedLocal[k]?.updatedAt && (!merged[k] || cachedLocal[k].bill_submitted !== merged[k].bill_submitted)) {
            finalMerged[k] = { ...merged[k], ...cachedLocal[k] };
            // Auto-sync unsaved localStorage state back to TiDB database so online & localhost match
            if (month < currentYearMonth) {
              fetch('/api/refreshment-bills/mark-received', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  institution_id: Number(k),
                  month,
                  received: cachedLocal[k].bill_submitted === 1,
                  received_date: cachedLocal[k].bill_submitted_date || new Date().toISOString().split('T')[0],
                  remarks: cachedLocal[k].remarks || ''
                })
              }).catch(() => null);
            }
          }
          if (cachedLocal[k]?.remarks && !rMap[k]) {
            rMap[k] = cachedLocal[k].remarks;
          }
        });
        setApiBillMap(finalMerged);
        setLocalBillCache(month, finalMerged);
        setRemarksMap(prev => ({ ...rMap, ...prev }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingReturns(false);
      }
    };

    useEffect(() => {
      fetchAnoReturns();
    }, [month, unitFilterId]);

    // Build rows from loaded demands + institutions and overlay apiBillMap so data always displays immediately
    const rows = useMemo(() => {
      const instLookup = {};
      (institutions || []).forEach(i => {
        if (i && i.id) instLookup[i.id] = i;
      });
      const unitLookup = {};
      (units || []).forEach(u => {
        if (u && u.id) unitLookup[u.id] = u;
      });

      const grouped = {};
      (demands || []).forEach(d => {
        if (!d.demand_date || d.status === 'CANCELLED' || d.status === 'REJECTED') return;
        if (d.demand_type === 'UNIT_DIRECT') return;
        const ym = String(d.demand_date).slice(0, 7);
        if (month && ym !== month) return;
        if (isAdmin && unitFilterId !== 'ALL' && String(d.unit_id) !== String(unitFilterId)) return;

        const instId = d.institution_id;
        if (!instId) return;
        const instInfo = instLookup[instId] || {};
        const unitInfo = unitLookup[d.unit_id] || unitLookup[instInfo.unit_id] || {};
        const cachedForMonth = getLocalBillCache(month);
        const billOverlay = {
          ...(cachedForMonth[instId] || {}),
          ...(apiBillMap[instId] || {})
        };
        if (cachedForMonth[instId]?.updatedAt && (!apiBillMap[instId] || cachedForMonth[instId].updatedAt >= (apiBillMap[instId].updatedAt || 0))) {
          billOverlay.bill_submitted = cachedForMonth[instId].bill_submitted;
          billOverlay.bill_submitted_date = cachedForMonth[instId].bill_submitted_date;
          billOverlay.remarks = cachedForMonth[instId].remarks || billOverlay.remarks;
          billOverlay.reminder_count = cachedForMonth[instId].reminder_count ?? billOverlay.reminder_count;
          billOverlay.last_reminder_sent_at = cachedForMonth[instId].last_reminder_sent_at || billOverlay.last_reminder_sent_at;
        }

        if (!grouped[instId]) {
          grouped[instId] = {
            institution_id: instId,
            institution_name: d.institution_name || instInfo.institution_name || 'Institution',
            ano_cto_name: d.ano_cto_name || instInfo.ano_cto_name || 'ANO Incharge',
            ano_cto_contact: instInfo.ano_cto_contact || '',
            ano_email: billOverlay.ano_email || instInfo.ano_email || '',
            unit_id: d.unit_id || instInfo.unit_id,
            unit_name: d.unit_name || instInfo.unit_name || unitInfo.unit_name || 'NCC Unit',
            unit_code: d.unit_code || instInfo.unit_code || unitInfo.unit_code || '',
            ncc_group: d.ncc_group || instInfo.ncc_group || unitInfo.ncc_group || '',
            total_packets: 0,
            total_amount: 0,
            demands: [],
            bill_submitted: billOverlay.bill_submitted === 1 ? 1 : 0,
            bill_submitted_date: billOverlay.bill_submitted_date || null,
            remarks: billOverlay.remarks || '',
            last_reminder_sent_at: billOverlay.last_reminder_sent_at || null,
            reminder_count: Number(billOverlay.reminder_count || 0)
          };
        }

        const qty = Number(d.total_quantity || d.quantity || 0);
        const amt = Number(d.total_amount || 0);
        grouped[instId].total_packets += qty;
        grouped[instId].total_amount += amt;
        grouped[instId].demands.push({
          id: d.id,
          demand_number: d.demand_number,
          demand_date: d.demand_date,
          invoice_no: d.invoice_no || '',
          invoice_date: d.invoice_date || '',
          total_quantity: qty,
          total_amount: amt
        });
      });

      Object.values(grouped).forEach(g => {
        g.demands.sort((a, b) => new Date(a.demand_date) - new Date(b.demand_date));
      });

      return Object.values(grouped).sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || ''));
    }, [demands, institutions, units, month, isAdmin, unitFilterId, apiBillMap]);

    const handleMarkReceived = async (item, receivedState) => {
      if (receivedState && !isPastMonth) {
        toast.error('Current ongoing month bill cannot be marked as Received until the month is completed.');
        return;
      }
      const instId = item.institution_id;
      const todayIso = new Date().toISOString().split('T')[0];
      const remarkVal = remarksMap[instId] || '';
      setUpdatingId(instId);

      // 1. Instant Optimistic UI + LocalCache Update
      const updatedEntry = {
        ...(apiBillMap[instId] || {}),
        institution_id: instId,
        bill_submitted: receivedState ? 1 : 0,
        bill_submitted_date: receivedState ? todayIso : null,
        remarks: remarkVal,
        updatedAt: Date.now()
      };
      const nextMap = { ...apiBillMap, [instId]: updatedEntry };
      setApiBillMap(nextMap);
      setLocalBillCache(month, nextMap);

      try {
        let ok = false;
        let msg = '';
        const res = await fetch('/api/refreshment-bills/mark-received', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            institution_id: instId,
            month,
            received: receivedState,
            received_date: todayIso,
            remarks: remarkVal
          })
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          ok = true;
          msg = data.message;
        } else {
          // Fallback to legacy /api/refreshment-bills POST endpoint
          const fbRes = await fetch('/api/refreshment-bills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              institution_id: instId,
              institution: item.institution_name,
              month,
              billSubmitted: receivedState,
              billSubmittedDate: receivedState ? todayIso : null,
              demandPackets: item.total_packets,
              billAmount: item.total_amount,
              paymentStatus: 'PENDING',
              remarks: remarkVal
            })
          }).catch(() => null);
          if (fbRes && fbRes.ok) ok = true;
        }

        const bannerText = msg || (receivedState
          ? `✓ Bill for ${item.institution_name} marked as RECEIVED at Unit. Daily reminders stopped & Confirmation + Thanks message sent to ANO (${item.ano_email || item.ano_cto_name}).`
          : `Bill for ${item.institution_name} reverted to BALANCE (Not Submitted).`);

        setActionBanner({ type: receivedState ? 'success' : 'info', text: bannerText });
        toast.success(bannerText);
      } catch (err) {
        toast.error(err.message || 'Updated locally');
      } finally {
        setUpdatingId(null);
      }
    };

    const handleSendReminder = async (institutionIds = []) => {
      if (!isPastMonth) {
        toast.error('Reminders can only be initiated for completed past months.');
        return;
      }
      const isBulk = institutionIds.length === 0;
      if (isBulk) setSendingBulk(true);
      else setSendingId(institutionIds[0]);

      const nowIso = new Date().toISOString();
      const targetList = isBulk
        ? rows.filter(r => r.bill_submitted === 0)
        : rows.filter(r => institutionIds.map(String).includes(String(r.institution_id)));

      // Optimistic update of reminder count & timestamp
      const nextMap = { ...apiBillMap };
      targetList.forEach(t => {
        const prev = nextMap[t.institution_id] || {};
        nextMap[t.institution_id] = {
          ...prev,
          institution_id: t.institution_id,
          bill_submitted: 0,
          reminder_count: Number(prev.reminder_count ?? t.reminder_count ?? 0) + 1,
          last_reminder_sent_at: nowIso,
          updatedAt: Date.now()
        };
      });
      setApiBillMap(nextMap);
      setLocalBillCache(month, nextMap);

      try {
        const res = await fetch('/api/refreshment-bills/send-reminder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            month,
            unit_id: isAdmin ? unitFilterId : undefined,
            institution_ids: institutionIds
          })
        }).catch(() => null);

        let bannerText = `✉ Military Reminder Letter dispatched to ${targetList.length} Balance ANO(s) on their registered email address.`;
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.message) bannerText = data.message;
        }
        setActionBanner({ type: 'warning', text: bannerText });
        toast.success(bannerText);
      } catch (err) {
        toast.error(err.message || 'Reminder triggered');
      } finally {
        setSendingBulk(false);
        setSendingId(null);
      }
    };

    const filteredRows = rows.filter(r => {
      if (selectedGroup !== 'All' && r.ncc_group !== selectedGroup) return false;
      if (statusFilter === 'BALANCE' && r.bill_submitted === 1) return false;
      if (statusFilter === 'RECEIVED' && r.bill_submitted !== 1) return false;
      if (statusFilter === 'REMINDED' && !(Number(r.reminder_count || 0) > 0)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mInst = (r.institution_name || '').toLowerCase().includes(q);
        const mAno = (r.ano_cto_name || '').toLowerCase().includes(q);
        const mEmail = (r.ano_email || '').toLowerCase().includes(q);
        const mUnit = (r.unit_name || '').toLowerCase().includes(q);
        const mInv = (r.demands || []).some(d => (d.invoice_no || '').toLowerCase().includes(q) || (d.demand_number || '').toLowerCase().includes(q));
        if (!mInst && !mAno && !mEmail && !mUnit && !mInv) return false;
      }
      return true;
    });

    const totalInstCount = rows.length;
    const receivedList = rows.filter(r => r.bill_submitted === 1);
    const balanceList = rows.filter(r => r.bill_submitted === 0);
    const remindedList = rows.filter(r => Number(r.reminder_count || 0) > 0);
    const receivedAmt = receivedList.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const balanceAmt = balanceList.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const totalRemindersSent = rows.reduce((s, r) => s + Number(r.reminder_count || 0), 0);

    const monthDateObj = month ? new Date(month + '-01') : new Date();
    const monthDisplayStr = monthDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
      <div className="space-y-3 animate-in fade-in duration-300 w-full">
        {/* Clean White Compact Control Bar */}
        <div className="bg-white p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 shadow-xs print:hidden flex flex-wrap items-center justify-between gap-2">
          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              title="Billing Month"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {isAdmin && (
              <select
                value={unitFilterId}
                onChange={e => setUnitFilterId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer max-w-[180px]"
                title="NCC Unit"
              >
                <option value="ALL">All Units</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.unit_code || u.unit_name}</option>
                ))}
              </select>
            )}

            <div className="relative flex-1 min-w-[190px] max-w-[300px]">
              <Search size={13} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search institution, ANO, invoice..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {balanceList.length > 0 && (
              <button
                type="button"
                onClick={() => isPastMonth && handleSendReminder([])}
                disabled={!isPastMonth || sendingBulk}
                className={`px-3 py-1.5 font-black uppercase text-[11px] rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
                  !isPastMonth
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95 disabled:opacity-50'
                }`}
                title={!isPastMonth ? 'Reminders can only be initiated for completed past months' : 'Send reminder email to all Balance ANOs'}
              >
                <Send size={12} />
                <span>{sendingBulk ? 'Sending...' : `Remind All (${balanceList.length})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[11px] rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
              title="Print Register"
            >
              <Printer size={12} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 4 Clickable Summary Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Supplied Institutions ({monthDisplayStr})</span>
              {statusFilter === 'ALL' && <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase">Active</span>}
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalInstCount}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-0.5">Click to view all institutions</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(prev => prev === 'RECEIVED' ? 'ALL' : 'RECEIVED')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'RECEIVED'
                ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/25 shadow-sm'
                : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-400 shadow-xs opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Bills Received at Unit</span>
              {statusFilter === 'RECEIVED' && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase">Filtered</span>}
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{receivedList.length} <span className="text-xs font-bold">Institutions</span></div>
            <div className="text-[11px] font-black text-emerald-700 mt-0.5">Verified Value: ₹{formatAmount(receivedAmt)}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(prev => prev === 'BALANCE' ? 'ALL' : 'BALANCE')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'BALANCE'
                ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/25 shadow-sm'
                : 'bg-rose-50/70 border-rose-200 hover:border-rose-400 shadow-xs opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Balance Bill Submission (Awaited)</span>
              {statusFilter === 'BALANCE' && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase">Filtered</span>}
            </div>
            <div className="text-2xl font-black text-rose-800 mt-1">{balanceList.length} <span className="text-xs font-bold">Institutions</span></div>
            <div className="text-[11px] font-black text-rose-700 mt-0.5">Pending Claim Value: ₹{formatAmount(balanceAmt)}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(prev => prev === 'REMINDED' ? 'ALL' : 'REMINDED')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'REMINDED'
                ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-500/25 shadow-sm'
                : 'bg-amber-50/60 border-amber-200 hover:border-amber-400 shadow-xs opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Military Reminders Sent</span>
              {statusFilter === 'REMINDED' && <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[9px] font-black uppercase">Filtered</span>}
            </div>
            <div className="text-2xl font-black text-amber-900 mt-1">{totalRemindersSent} <span className="text-xs font-bold">Emails ({remindedList.length} Inst)</span></div>
            <div className="text-[11px] font-bold text-amber-700 mt-0.5">Sent manually when you click Send Reminder</div>
          </button>
        </div>

        {/* Report Canvas & Printable Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-none print:bg-white print:overflow-visible print:w-full">
          <PrintHeader
            title="MONTHLY COUNTERSIGNED BILL SUBMISSION & BALANCE REGISTER"
            period={`MONTH : ${monthDisplayStr}`}
            extraMeta={`TOTAL INSTITUTIONS: ${filteredRows.length} • RECEIVED: ${receivedList.length} • BALANCE: ${balanceList.length}`}
          />

          <div className="overflow-x-auto print:overflow-visible print:w-full">
            <table className="w-full text-left border-collapse print:min-w-full print:border print:border-black text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black text-[11px] font-black uppercase text-slate-600">
                  <th className="px-3 py-3 text-center print:text-black w-12 border border-slate-200 print:border-black">S.NO</th>
                  <th className="px-3.5 py-3 print:text-black border border-slate-200 print:border-black min-w-[260px]">INSTITUTION</th>
                  <th className="px-3 py-3 text-center print:text-black text-blue-700 border border-slate-200 print:border-black whitespace-nowrap">PACKETS</th>
                  <th className="px-3.5 py-3 text-right print:text-black text-emerald-700 border border-slate-200 print:border-black whitespace-nowrap">BILL AMOUNT (₹)</th>
                  <th className="px-3 py-3 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap">UNIT RECEIPT STATUS</th>
                  <th className="px-3 py-3 print:text-black border border-slate-200 print:border-black min-w-[160px]">UNIT REMARKS</th>
                  <th className="px-3 py-3 text-center border border-slate-200 print:hidden whitespace-nowrap w-[155px]">UNIT ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 print:divide-black text-xs">
                {loadingReturns ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold border border-slate-200 animate-pulse">
                      Loading monthly bill return register...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium border border-slate-200">
                      No supplies / bills found for {monthDisplayStr}.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isReceived = row.bill_submitted === 1;
                    const isExpanded = expandedInstId === row.institution_id;
                    const demandCount = (row.demands || []).length;

                    return (
                      <React.Fragment key={row.institution_id}>
                        <tr
                          onClick={() => setExpandedInstId(prev => prev === row.institution_id ? null : row.institution_id)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded
                              ? 'bg-blue-50/50'
                              : isReceived
                              ? 'bg-emerald-50/15 hover:bg-emerald-50/35'
                              : 'hover:bg-slate-50/80'
                          } print:bg-white`}
                          title="Click row to expand / hide demands & supply dates"
                        >
                          {/* S.NO */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-500 print:text-black border border-slate-200 print:border-black">
                            {idx + 1}
                          </td>

                          {/* INSTITUTION */}
                          <td className="px-3.5 py-2.5 border border-slate-200 print:border-black">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 print:text-black uppercase text-xs tracking-tight">
                                {row.institution_name}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 print:hidden ${
                                isExpanded
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {demandCount} {demandCount === 1 ? 'Demand' : 'Demands'} {isExpanded ? '▴' : '▾'}
                              </span>
                            </div>
                          </td>

                          {/* PACKETS */}
                          <td className="px-3 py-2.5 text-center font-bold text-blue-700 print:text-black border border-slate-200 print:border-black">
                            {Number(row.total_packets || 0).toLocaleString('en-IN')}
                          </td>

                          {/* BILL AMOUNT */}
                          <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 print:text-black border border-slate-200 print:border-black whitespace-nowrap">
                            ₹{formatAmount(row.total_amount)}
                          </td>

                          {/* UNIT RECEIPT STATUS */}
                          <td className="px-3 py-2.5 text-center border border-slate-200 print:border-black">
                            {isReceived ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-0 print:text-black print:p-0">
                                  <CheckCircle2 size={11} className="print:hidden" /> RECEIVED AT UNIT
                                </span>
                                {row.bill_submitted_date && (
                                  <span className="text-[10px] font-semibold text-emerald-700 print:text-black mt-0.5">
                                    On {formatDDMMYYYY(row.bill_submitted_date)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 print:bg-transparent print:border-0 print:text-black print:p-0">
                                  <Clock size={11} className="print:hidden" /> BALANCE (NOT SUBMITTED)
                                </span>
                                <span className="text-[10px] font-semibold text-amber-700 print:text-black mt-0.5">
                                  Reminders Sent: {row.reminder_count || 0}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* UNIT REMARKS */}
                          <td className="px-3 py-2.5 border border-slate-200 print:border-black" onClick={e => e.stopPropagation()}>
                            <span className="hidden print:inline text-xs text-black">{remarksMap[row.institution_id] || '-'}</span>
                            <input
                              type="text"
                              value={remarksMap[row.institution_id] || ''}
                              onChange={e => setRemarksMap(prev => ({ ...prev, [row.institution_id]: e.target.value }))}
                              placeholder="Add receipt note..."
                              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-blue-500 print:hidden"
                            />
                          </td>

                          {/* UNIT ACTION */}
                          <td className="px-3 py-2.5 text-center border border-slate-200 print:hidden" onClick={e => e.stopPropagation()}>
                            {isReceived ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-emerald-700">✓ Taken on Charge</span>
                                <button
                                  type="button"
                                  disabled={updatingId === row.institution_id}
                                  onClick={() => handleMarkReceived(row, false)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-[10px] font-bold cursor-pointer transition-all"
                                  title="Revert to Balance (Pending Submission)"
                                >
                                  Mark as Balance
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-stretch gap-1">
                                <button
                                  type="button"
                                  disabled={!isPastMonth || updatingId === row.institution_id}
                                  onClick={() => isPastMonth && handleMarkReceived(row, true)}
                                  className={`px-3 py-1.5 rounded-lg font-black text-[11px] inline-flex items-center justify-center gap-1 transition-all ${
                                    !isPastMonth
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer active:scale-95 disabled:opacity-50'
                                  }`}
                                  title={!isPastMonth ? 'Inactive for ongoing current month — unlocks after month completion' : 'Mark physical countersigned bill as Received & send Confirmation + Thanks email to ANO'}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>{updatingId === row.institution_id ? 'Saving...' : 'Mark Received'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!isPastMonth || sendingId === row.institution_id}
                                  onClick={() => isPastMonth && handleSendReminder([row.institution_id])}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] inline-flex items-center justify-center gap-1 transition-all ${
                                    !isPastMonth
                                      ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer disabled:opacity-50'
                                  }`}
                                  title={!isPastMonth ? 'Reminders can only be sent for completed past months' : 'Send immediate military reminder email to ANO'}
                                >
                                  <Send size={11} />
                                  <span>{sendingId === row.institution_id ? 'Sending...' : 'Send Reminder Mail'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Sub-Row: All Demands / Invoices & Supply Dates (One row at a time) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 print:hidden">
                            <td colSpan={7} className="px-6 py-3 border border-slate-200">
                              <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-2xs">
                                <div className="px-3.5 py-2 bg-blue-50/80 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  <div className="font-black text-blue-950 uppercase">
                                    Demands & Invoices — {row.institution_name}
                                  </div>
                                  <div className="text-slate-600 font-semibold">
                                    ANO/CTO: <span className="font-bold text-slate-900">{row.ano_cto_name || '-'}</span>
                                    {row.ano_cto_contact ? ` (${row.ano_cto_contact})` : ''}
                                    {row.ano_email ? <span className="ml-2 font-mono text-blue-700">✉ {row.ano_email}</span> : ''}
                                  </div>
                                </div>
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                                      <th className="px-3 py-2 text-center border border-slate-200 w-12">S.NO</th>
                                      <th className="px-3 py-2 border border-slate-200">INVOICE / DEMAND NO.</th>
                                      <th className="px-3 py-2 text-center border border-slate-200">DATE OF SUPPLY</th>
                                      <th className="px-3 py-2 text-center border border-slate-200">PACKETS</th>
                                      <th className="px-3 py-2 text-right border border-slate-200">AMOUNT (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(row.demands || []).map((d, dIdx) => (
                                      <tr key={d.id || dIdx} className="hover:bg-slate-50">
                                        <td className="px-3 py-1.5 text-center font-bold text-slate-500 border border-slate-200">{dIdx + 1}</td>
                                        <td className="px-3 py-1.5 font-mono font-bold text-blue-700 border border-slate-200">{d.invoice_no || d.demand_number}</td>
                                        <td className="px-3 py-1.5 text-center font-medium text-slate-700 border border-slate-200">{formatDDMMYYYY(d.demand_date)}</td>
                                        <td className="px-3 py-1.5 text-center font-bold text-slate-900 border border-slate-200">{Number(d.total_quantity || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-1.5 text-right font-bold text-emerald-700 border border-slate-200">₹{formatAmount(d.total_amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {filteredRows.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 print:bg-slate-100 print:border-black font-bold">
                  <tr className="text-xs">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-slate-800 print:text-black border border-slate-200 print:border-black">
                      GRAND TOTAL ({filteredRows.length} Institutions)
                    </td>
                    <td className="px-3 py-3 text-center text-sm font-black text-blue-700 print:text-black border border-slate-200 print:border-black">
                      {filteredRows.reduce((s, r) => s + Number(r.total_packets || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-3 text-right text-sm font-black text-emerald-700 print:text-black border border-slate-200 print:border-black whitespace-nowrap">
                      ₹{formatAmount(filteredRows.reduce((s, r) => s + Number(r.total_amount || 0), 0))}
                    </td>
                    <td colSpan={2} className="px-3 py-3 text-center text-xs text-slate-600 print:text-black border border-slate-200 print:border-black">
                      Received: {filteredRows.filter(r => r.bill_submitted === 1).length} • Balance: {filteredRows.filter(r => r.bill_submitted === 0).length}
                    </td>
                    <td className="border border-slate-200 print:hidden" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading analytical views...</div>;
  }

  return (
    <div className="space-y-3 w-full px-1 sm:px-2">
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto no-scrollbar gap-1 flex-1">
          {[
            { id: 'weekly', label: 'Weekly Summary Matrix' },
            { id: 'unitwise_monthly', label: 'Unitwise Monthly Summary' },
            { id: 'audit', label: 'Monthly Summary' },
            { id: 'annual', label: 'Annual Quota Summary' },
            ...(isUnit ? [{ id: 'ano_bill_returns', label: 'ANO Bill Returns & Reminders' }] : []),
            { id: 'bill', label: 'Bill Tracking & Payments' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {user?.role === 'ADMIN' && (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-xs shadow-xs focus:outline-none focus:border-blue-500 cursor-pointer shrink-0"
          >
            <option value="All">All NCC Groups</option>
            <option value="Group B">Group B</option>
            <option value="Group C">Group C</option>
          </select>
        )}
      </div>

      {activeTab === 'weekly' && <WeeklySummaryView />}
      {activeTab === 'unitwise_monthly' && <UnitwiseMonthlySummaryView />}
      {activeTab === 'audit' && <AuditTrailView />}
      {activeTab === 'annual' && <AnnualSummaryView />}
      {activeTab === 'ano_bill_returns' && isUnit && <AnoBillReturnsView />}
      {activeTab === 'bill' && <BillTrackerView />}
    </div>
  );
}
