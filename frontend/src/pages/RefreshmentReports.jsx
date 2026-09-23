import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, History, Printer, Search, School, TrendingUp, CheckCircle2, Users, IndianRupee, MapPin, Building2, Save, Filter, Layers, FileText, FileSpreadsheet, RefreshCw, Zap, Sparkles, AlertTriangle } from 'lucide-react';
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

export default function RefreshmentReports() {
  const { user, token } = useAuth();
  
  const [activeTab, setActiveTab] = useState('weekly'); // weekly | audit | annual | bill
  const [demands, setDemands] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLandscape, setIsLandscape] = useState(true);
  const [paperSize, setPaperSize] = useState('A4');
  const [selectedGroup, setSelectedGroup] = useState('All');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [demandsRes, instRes] = await Promise.all([
        fetch('/api/demands', { headers }),
        fetch('/api/institutions', { headers })
      ]);
      
      const dJson = await demandsRes.json();
      const iJson = await instRes.json();
      setDemands(Array.isArray(dJson) ? dJson : []);
      setInstitutions(Array.isArray(iJson) ? iJson : []);
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
    setTimeout(() => { window.print(); }, 500);
    
    const handleAfterPrint = () => {
      body.classList.remove(printClass, sizeClass);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
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
            <img src="/logo.png" alt="Flavour Base Logo" className="w-full h-full object-contain" />
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
      if (!acc[mondayKey][inst]) {
        acc[mondayKey][inst] = {
          institution: inst,
          days: [0, 0, 0, 0, 0, 0, 0],
          ano: d.ano_cto_name || '-',
        };
      }
      const dayIdx = day === 0 ? 6 : day - 1;
      acc[mondayKey][inst].days[dayIdx] += Number(d.total_quantity || 0);
      return acc;
    }, {});

    const sortedWeekKeys = Object.keys(weeksGrouped).sort((a, b) => b.localeCompare(a)).slice(0, 4);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <PrintControls />
        {sortedWeekKeys.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No demands found.</div>
        ) : (
          sortedWeekKeys.map(weekKey => {
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
              <div key={weekKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl print:shadow-none print:border-none print:bg-white">
                <PrintHeader title="WEEKLY REFRESHMENT SUMMARY" period={`${weekDates[0]} to ${weekDates[6]}`} />
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 print:hidden">
                  <Calendar size={18} className="text-blue-500" />
                  <h3 className="font-black text-sm tracking-widest text-slate-800 uppercase">Program: {weekDates[0]} - {weekDates[6]}</h3>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse min-w-[1000px] print:min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black print:border-b-2">
                        <th className="w-[40px] px-2 py-4 text-xs font-black text-slate-500 uppercase text-center print:text-black">No</th>
                        <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase print:text-black">Institution & ANO Details</th>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                          <th key={day} className="w-[80px] px-1 py-4 text-center border-l border-slate-200 print:border-black">
                            <span className="text-xs font-black text-blue-500 block print:text-black">{day}</span>
                            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap print:text-slate-700">{weekDates[i]}</span>
                          </th>
                        ))}
                        <th className="w-[100px] px-1 py-4 text-center text-xs font-black text-emerald-500 uppercase bg-emerald-950/20 border-l border-slate-200 print:bg-slate-200 print:text-black print:border-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-black">
                      {instData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-100/50 print:bg-white">
                          <td className="px-2 py-3 text-sm font-bold text-slate-500 text-center print:text-black">{idx + 1}</td>
                          <td className="px-4 py-3 print:border-black">
                            <div className="font-black text-sm text-slate-800 uppercase print:text-black truncate max-w-[300px]">{row.institution}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase print:text-slate-700">{row.ano}</div>
                          </td>
                          {row.days.map((val, i) => (
                            <td key={i} className="px-2 py-3 text-center border-l border-slate-200 print:border-black">
                              <span className={`text-sm font-black ${val > 0 ? 'text-blue-600' : 'text-slate-700'} print:text-black`}>{val || '-'}</span>
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center text-sm font-black text-emerald-600 bg-emerald-950/10 border-l border-slate-200 print:bg-slate-100 print:text-black print:border-black">
                            {row.days.reduce((s, v) => s + v, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-slate-200 print:border-black print:border-t-2">
                      <tr className="font-black">
                        <td colSpan={2} className="px-4 py-4 text-right uppercase tracking-widest text-slate-500 text-xs print:text-black">Total Packets</td>
                        {dayTotals.map((tot, i) => (
                          <td key={i} className="px-2 py-4 text-center text-blue-600 text-sm border-l border-slate-200 print:text-black print:border-black">{tot}</td>
                        ))}
                        <td className="px-4 py-4 text-center text-emerald-600 text-base bg-emerald-950/30 border-l border-slate-200 print:bg-slate-300 print:text-black print:border-black">{grandTotal}</td>
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
    const totalPacketsCount = filteredDemands.reduce((s, d) => s + (d.total_quantity || 0), 0);
    const totalCostAmount = filteredDemands.reduce((s, d) => s + (d.total_amount || 0), 0);

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
          fetchData();
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

        return {
          'S.NO': idx + 1,
          'DATE OF SUPPLY': formatDDMMYYYY(r.demand_date),
          'DEMAND REF': r.demand_number || '',
          'UNIT': r.unit_name || '',
          'INSTITUTION WITH ADDRESS': fullAddress,
          'PLACE OF SUPPLY': 'DELHI',
          'INVOICE DATE': formatDDMMYYYY(invDate),
          'INVOICE NO': invNo,
          'ITEM': itemLabel,
          'QTY': r.total_quantity || 0,
          'RATE INCL GST': rate,
          'AMOUNT': r.total_amount || 0
        };
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
      }, 300);
    };

    const isFiltered = unitFilter !== 'All' || searchQuery !== '';

    return (
      <div className="space-y-6 animate-in fade-in duration-500 w-full">
        {/* Duplicate Warning Banner */}
        {duplicateInvoices.size > 0 && (
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
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">FLAVOUR BASE INDIA • Monthly Refreshment Summary</h3>
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

          {/* Optional Visible Invoice Generator Panel */}
          {showInvoiceGenerator && (
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

          {/* Row 3: Ultra-Compact Horizontal Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/40">
              <History size={16} className="text-blue-600 shrink-0" />
              <div>
                <div className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Total Demands</div>
                <div className="text-sm font-black text-blue-950 leading-none">{totalDemandsCount}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Total Packets</div>
                <div className="text-sm font-black text-emerald-950 leading-none">{totalPacketsCount.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/40">
              <IndianRupee size={16} className="text-indigo-600 shrink-0" />
              <div>
                <div className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Total Value</div>
                <div className="text-sm font-black text-indigo-950 leading-none">₹{formatAmount(totalCostAmount)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-100 bg-purple-50/40">
              <School size={16} className="text-purple-600 shrink-0" />
              <div>
                <div className="text-[9px] font-black uppercase text-purple-500 tracking-wider">Total Units</div>
                <div className="text-sm font-black text-purple-950 leading-none">{groupedSections.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Sections */}
        {groupedSections.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 font-medium">
            No demands matched the selected filter criteria.
          </div>
        ) : (
          groupedSections.map((sec, secIdx) => {
            const secTotalPackets = sec.items.reduce((s, v) => s + (v.total_quantity || 0), 0);
            const secTotalCost = sec.items.reduce((s, v) => s + (v.total_amount || 0), 0);

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
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-none print:bg-white print:overflow-visible print:w-full print:mb-0 print:break-after-page page-break-after-always"
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
                        <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[130px]">INVOICE DATE</th>
                        <th className="px-3 py-3.5 text-center print:text-black border border-slate-200 print:border-black whitespace-nowrap min-w-[140px]">INVOICE NO</th>
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

                            {/* ITEM */}
                            <td className="px-3 py-3 text-slate-700 font-normal whitespace-nowrap border border-slate-200 print:border-black">
                              Refreshment Packet
                            </td>

                            {/* QTY */}
                            <td className="px-3 py-3 text-center font-normal text-slate-900 print:text-black border border-slate-200 print:border-black">
                              {row.total_quantity}
                            </td>

                            {/* RATE INCL GST */}
                            <td className="px-3 py-3 text-right font-normal text-slate-700 print:text-black border border-slate-200 print:border-black">
                              ₹{formatAmount(rate)}
                            </td>

                            {/* AMOUNT */}
                            <td className="px-3 py-3 text-right font-bold text-emerald-600 print:text-black border border-slate-200 print:border-black">
                              ₹{formatAmount(row.total_amount)}
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
                          colSpan={9} 
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

  const AnnualSummaryView = () => {
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    
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

    const schoolStats = useMemo(() => {
      const filteredInstitutions = safeInstitutions.filter(i => selectedGroup === 'All' || i.ncc_group === selectedGroup);
      
      return filteredInstitutions.map(inst => {
        const cadetStr = (inst.strength_1st_year || 0) + (inst.strength_2nd_year || 0) + (inst.strength_3rd_year || 0);
        const vacancy = cadetStr; // Actual vacancy is total sanctioned strength
        const authClasses = 35;
        const authPackets = vacancy * authClasses;
        
        const instDemands = safeDemands.filter(d => {
          if (d.institution_id !== inst.id) return false;
          if (d.status === 'CANCELLED' || d.status === 'REJECTED') return false;
          const dYear = new Date(d.demand_date).getFullYear().toString();
          return dYear === yearFilter;
        });

        const classesHeld = instDemands.length;
        const packetsDemanded = instDemands.reduce((sum, d) => sum + (d.total_quantity || 0), 0);
        const totalAmount = instDemands.reduce((sum, d) => sum + (d.total_amount || 0), 0);
        const balanceClasses = Math.max(0, authClasses - classesHeld);
        const balancePackets = authPackets - packetsDemanded;
        const utilizationPct = authPackets > 0 ? Math.round((packetsDemanded / authPackets) * 100) : 0;
        const isOverQuota = packetsDemanded > authPackets;

        return {
          ...inst,
          vacancy, authClasses, authPackets, classesHeld, packetsDemanded, totalAmount, balanceClasses, balancePackets, utilizationPct, isOverQuota
        };
      }).sort((a, b) => a.institution_name.localeCompare(b.institution_name));
    }, [safeInstitutions, safeDemands, yearFilter]);

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
        <PrintControls />
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <School size={20} className="text-blue-500" /> School Annual Refreshment Summary
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Quota Allocation: 35 Classes per Year (1 Packet/Cadet per Class)</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text" placeholder="Search Institution, ANO..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 outline-none w-64 focus:border-blue-500"
              />
              <select 
                value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 outline-none font-bold"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:hidden">
          <StatCard icon={<School size={20} />} label="Total Institutions" value={filtered.length} color="blue" />
          <StatCard icon={<Users size={20} />} label="Total Vacancy" value={filteredVacancy} color="indigo" />
          <StatCard icon={<Building2 size={20} />} label="Auth Packets" value={filteredAuthPackets.toLocaleString()} color="purple" />
          <StatCard icon={<CheckCircle2 size={20} />} label="Packets Demanded" value={filteredPacketsDemanded.toLocaleString()} color="emerald" />
          <StatCard icon={<TrendingUp size={20} />} label="Balance Packets" value={filteredBalancePackets.toLocaleString()} color="amber" sub={`Utilization: ${filteredUtilization}%`} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl print:shadow-none print:border-none print:bg-white">
          <PrintHeader title={`SCHOOL REFRESHMENT ANNUAL SUMMARY - YEAR ${yearFilter}`} period={`YEAR ${yearFilter}`} />
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[1200px] print:min-w-full">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-200 print:border-black">
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200 w-10">No</th>
                  <th rowSpan={2} className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase tracking-widest print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Institution & ANO Details</th>
                  <th colSpan={4} className="px-3 py-2 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center print:text-black border-r border-b border-slate-200 print:border-black bg-slate-100/50 print:bg-slate-300">Sanctioned Vacancy Strength</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Auth Classes</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Auth Packets</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Cls Held</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Packets Demanded</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-amber-400 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Bal Classes</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Bal Packets</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center print:text-black border-r border-slate-200 print:border-black bg-slate-50 print:bg-slate-200">Utilization</th>
                </tr>
                <tr className="bg-white border-b-2 border-slate-300 print:bg-slate-100 print:border-black">
                  <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">1st Yr</th>
                  <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">2nd Yr</th>
                  <th className="px-2 py-2 text-[9px] font-black text-slate-500 uppercase text-center border-r border-slate-200 print:border-black print:text-black">3rd Yr</th>
                  <th className="px-2 py-2 text-[9px] font-black text-slate-800 uppercase text-center border-r border-slate-200 print:border-black print:text-black bg-slate-100/80 print:bg-slate-200">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-black">
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-100/40 print:bg-white">
                    <td className="px-3 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{idx + 1}</td>
                    <td className="px-4 py-3 border-r border-slate-200 print:border-black">
                      <div className="font-black text-xs text-slate-800 uppercase print:text-black truncate">{row.institution_name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase print:text-slate-700">{row.ano_cto_name || '-'}</div>
                      {row.isOverQuota && <div className="text-[9px] font-black text-rose-500 mt-0.5 print:text-rose-700">⚠️ OVER QUOTA</div>}
                    </td>
                    <td className="px-2 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.strength_1st_year}</td>
                    <td className="px-2 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.strength_2nd_year}</td>
                    <td className="px-2 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.strength_3rd_year}</td>
                    <td className="px-2 py-3 text-xs font-black text-slate-900 text-center border-r border-slate-200 print:border-black print:text-black bg-slate-100/30 print:bg-slate-100">{row.vacancy}</td>
                    
                    <td className="px-3 py-3 text-xs font-black text-blue-600 text-center border-r border-slate-200 print:border-black print:text-black bg-blue-950/10">{row.authClasses}</td>
                    <td className="px-3 py-3 text-xs font-black text-indigo-400 text-center border-r border-slate-200 print:border-black print:text-black bg-indigo-950/20">{row.authPackets.toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-black text-slate-700 text-center border-r border-slate-200 print:border-black print:text-black">{row.classesHeld}</td>
                    <td className="px-3 py-3 text-xs font-black text-emerald-600 text-center border-r border-slate-200 print:border-black print:text-black bg-emerald-950/20">{row.packetsDemanded.toLocaleString()}</td>
                    
                    <td className="px-3 py-3 text-xs font-black text-amber-500 text-center border-r border-slate-200 print:border-black print:text-black">{row.balanceClasses}</td>
                    <td className={`px-3 py-3 text-xs font-black text-center border-r border-slate-200 print:border-black print:text-black ${row.isOverQuota ? 'text-rose-500 bg-rose-950/30' : 'text-amber-500 bg-amber-950/10'}`}>
                      {row.balancePackets < 0 ? `${row.balancePackets.toLocaleString()} (EXCESS)` : row.balancePackets.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-center border-r border-slate-200 print:border-black">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black ${row.isOverQuota ? 'bg-rose-900/50 text-rose-600 border border-rose-800' : 'bg-slate-100 text-slate-700'} print:bg-white print:text-black`}>
                        {row.utilizationPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:bg-slate-200 print:border-black font-black text-xs">
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-right uppercase tracking-widest text-slate-500 print:text-black">Grand Total</td>
                  <td className="px-2 py-4 text-center text-slate-800 print:text-black">{filteredVacancy}</td>
                  <td className="px-3 py-4 text-center text-blue-600 print:text-black">-</td>
                  <td className="px-3 py-4 text-center text-indigo-400 print:text-black">{filteredAuthPackets.toLocaleString()}</td>
                  <td className="px-3 py-4 text-center text-slate-800 print:text-black">-</td>
                  <td className="px-3 py-4 text-center text-emerald-600 print:text-black">{filteredPacketsDemanded.toLocaleString()}</td>
                  <td className="px-3 py-4 text-center text-amber-500 print:text-black">-</td>
                  <td className="px-3 py-4 text-center text-amber-500 print:text-black">{filteredBalancePackets.toLocaleString()}</td>
                  <td className="px-3 py-4 text-center text-slate-800 print:text-black">{filteredUtilization}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const BillTableRow = ({ inst, sysAgg, billRecord, onSave, isAdmin }) => {
    const [editData, setEditData] = useState({
      id: billRecord?.id,
      billSubmitted: billRecord?.bill_submitted === 1,
      billSubmittedDate: billRecord?.bill_submitted_date || '',
      demandPackets: billRecord?.demand_packets || sysAgg.packets,
      billAmount: billRecord?.bill_amount || sysAgg.amount,
      paymentStatus: billRecord?.payment_status || 'PENDING',
      remarks: billRecord?.remarks || ''
    });

    useEffect(() => {
      setEditData({
        id: billRecord?.id,
        billSubmitted: billRecord?.bill_submitted === 1,
        billSubmittedDate: billRecord?.bill_submitted_date || '',
        demandPackets: billRecord?.demand_packets || sysAgg.packets,
        billAmount: billRecord?.bill_amount || sysAgg.amount,
        paymentStatus: billRecord?.payment_status || 'PENDING',
        remarks: billRecord?.remarks || ''
      });
    }, [
      billRecord?.id, billRecord?.bill_submitted, billRecord?.bill_submitted_date, 
      billRecord?.demand_packets, billRecord?.bill_amount, billRecord?.payment_status, billRecord?.remarks,
      sysAgg.packets, sysAgg.amount
    ]);

    return (
      <tr className="hover:bg-slate-100/40 print:bg-white">
        <td className="px-4 py-4">
          <div className="font-black text-xs text-slate-800 uppercase print:text-black truncate">{inst.institution_name}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase print:text-slate-700">{inst.ano_cto_name || '-'}</div>
        </td>
        <td className="px-4 py-4 text-center font-black text-blue-600 border-l border-slate-200 print:text-black print:border-black bg-slate-50/50 print:bg-slate-100">{sysAgg.packets}</td>
        <td className="px-4 py-4 text-right font-black text-emerald-600 border-r border-slate-200 print:text-black print:border-black bg-slate-50/50 print:bg-slate-100">₹{formatAmount(sysAgg.amount)}</td>
        
        <td className="px-4 py-4 text-center">
          {isAdmin ? (
            <div className="flex flex-col gap-1 items-center">
              <input type="checkbox" checked={editData.billSubmitted} onChange={e => setEditData({...editData, billSubmitted: e.target.checked})} className="w-4 h-4 bg-white border-slate-300 rounded" />
              {editData.billSubmitted && <input type="date" value={editData.billSubmittedDate} onChange={e => setEditData({...editData, billSubmittedDate: e.target.value})} className="bg-slate-50 border border-slate-300 text-[10px] rounded px-1" />}
            </div>
          ) : (
            <span className={`px-2 py-1 rounded text-[10px] font-black ${billRecord?.bill_submitted ? 'bg-emerald-900/50 text-emerald-600' : 'bg-rose-900/50 text-rose-600'} print:text-black print:bg-transparent`}>
              {billRecord?.bill_submitted ? `YES (${formatDate(billRecord.bill_submitted_date)})` : 'NO'}
            </span>
          )}
        </td>
        
        <td className="px-4 py-4 text-center border-l border-slate-200 print:border-black">
          {isAdmin ? (
            <input type="number" value={editData.demandPackets} onChange={e => setEditData({...editData, demandPackets: Number(e.target.value)})} className="bg-slate-50 border border-slate-300 rounded px-2 py-1 w-16 text-center text-xs font-black text-slate-800" />
          ) : (
            <span className="font-black text-xs print:text-black">{billRecord?.demand_packets || '-'}</span>
          )}
        </td>
        
        <td className="px-4 py-4 text-right">
          {isAdmin ? (
            <input type="number" value={editData.billAmount} onChange={e => setEditData({...editData, billAmount: Number(e.target.value)})} className="bg-slate-50 border border-slate-300 rounded px-2 py-1 w-24 text-right text-xs font-black text-slate-800" />
          ) : (
            <span className="font-black text-xs print:text-black">{billRecord?.bill_amount ? `₹${formatAmount(billRecord.bill_amount)}` : '-'}</span>
          )}
        </td>
        
        <td className="px-4 py-4 text-center border-l border-slate-200 print:border-black">
          {isAdmin ? (
            <select value={editData.paymentStatus} onChange={e => setEditData({...editData, paymentStatus: e.target.value})} className={`bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-black outline-none ${editData.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-400'}`}>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
            </select>
          ) : (
            <span className={`px-2 py-1 rounded text-[10px] font-black ${billRecord?.payment_status === 'PAID' ? 'bg-emerald-900/50 text-emerald-600' : 'bg-amber-900/50 text-amber-400'} print:text-black print:bg-transparent`}>
              {billRecord?.payment_status || 'PENDING'}
            </span>
          )}
        </td>
        
        <td className="px-4 py-4">
          {isAdmin ? (
            <input type="text" value={editData.remarks} onChange={e => setEditData({...editData, remarks: e.target.value})} className="bg-slate-50 border border-slate-300 rounded px-2 py-1 w-full text-[10px] text-slate-700" placeholder="Remarks..." />
          ) : (
            <span className="text-[10px] text-slate-500 print:text-slate-700">{billRecord?.remarks || '-'}</span>
          )}
        </td>
        
        {isAdmin && (
          <td className="px-4 py-4 text-center border-l border-slate-200 print:hidden">
            <button onClick={() => onSave(inst.id, inst.institution_name, editData)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/50 text-blue-600 rounded-lg transition-all" title="Save Bill Data">
              <Save size={14} />
            </button>
          </td>
        )}
      </tr>
    );
  };

  const BillTrackerView = () => {
    const [month, setMonth] = useState(getLocalYearMonth());
    const [bills, setBills] = useState([]);
    const [loadingBills, setLoadingBills] = useState(false);
    
    const safeDemands = Array.isArray(demands) ? demands : [];
    const safeInstitutions = Array.isArray(institutions) ? institutions : [];
    const safeBills = Array.isArray(bills) ? bills : [];

    // Derived aggregates from demands for the selected month to aid billing
    const monthDemandsAgg = useMemo(() => {
      const agg = {};
      const filteredDemands = safeDemands.filter(d => selectedGroup === 'All' || d.ncc_group === selectedGroup);
      filteredDemands.forEach(d => {
        if (!d.demand_date) return;
        const dMonth = new Date(d.demand_date).toISOString().slice(0, 7);
        if (dMonth === month && d.status !== 'CANCELLED' && d.status !== 'REJECTED') {
          if (!agg[d.institution_id]) agg[d.institution_id] = { packets: 0, amount: 0 };
          agg[d.institution_id].packets += d.total_quantity || 0;
          agg[d.institution_id].amount += d.total_amount || 0;
        }
      });
      return agg;
    }, [safeDemands, month, selectedGroup]);

    const fetchBills = async () => {
      setLoadingBills(true);
      try {
        const res = await fetch(`/api/refreshment-bills?month=${month}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setBills(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load bills');
        setBills([]);
      } finally {
        setLoadingBills(false);
      }
    };

    useEffect(() => {
      fetchBills();
    }, [month]);
    
    const handleSaveBill = async (instId, instName, data) => {
      try {
        const payload = {
          institution: instName,
          month,
          ...data
        };
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? `/api/refreshment-bills/${data.id}` : '/api/refreshment-bills';
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        toast.success('Bill saved successfully');
        fetchBills();
      } catch (err) {
        toast.error('Failed to save bill');
      }
    };

    const displayedInstitutions = safeInstitutions.filter(i => selectedGroup === 'All' || i.ncc_group === selectedGroup);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PrintControls />
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg print:hidden flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <IndianRupee size={20} className="text-emerald-500" /> Bill Submission & Payment Tracker
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Track monthly bill receipts and payments from institutions.</p>
          </div>
          <input 
            type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-800 outline-none font-bold"
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl print:shadow-none print:border-none print:bg-white">
          <PrintHeader title="MONTHLY BILL SUBMISSION & PAYMENT STATUS" period={month} />
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[1200px] print:min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 print:bg-slate-200 print:border-black">
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase print:text-black">Institution Details</th>
                  <th className="px-4 py-4 text-xs font-black text-blue-600 uppercase text-center print:text-black border-l border-slate-200 print:border-black">System Auth Packets</th>
                  <th className="px-4 py-4 text-xs font-black text-emerald-600 uppercase text-right print:text-black border-r border-slate-200 print:border-black">System Cost (₹)</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase text-center print:text-black">Bill Submitted</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase text-center print:text-black border-l border-slate-200 print:border-black">Billed Packets</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase text-right print:text-black">Billed Amount</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase text-center print:text-black border-l border-slate-200 print:border-black">Payment Status</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase print:text-black">Remarks</th>
                  {user?.role === 'ADMIN' && <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase text-center print:hidden border-l border-slate-200">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-black">
                {displayedInstitutions.map(inst => {
                  const sysAgg = monthDemandsAgg[inst.id] || { packets: 0, amount: 0 };
                  const billRecord = safeBills.find(b => b.institution_id === inst.id) || {};
                  return (
                    <BillTableRow
                      key={inst.id}
                      inst={inst}
                      sysAgg={sysAgg}
                      billRecord={billRecord}
                      onSave={handleSaveBill}
                      isAdmin={user?.role === 'ADMIN'}
                    />
                  );
                })}
              </tbody>
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
    <div className="space-y-6 w-full px-1 sm:px-2">
      <div className="print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Refreshment Reports</h2>
            <p className="text-xs text-slate-500 font-medium">Detailed Weekly, Monthly and Annual refreshment program analytics</p>
          </div>
          {user?.role === 'ADMIN' && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-xs shadow-xs focus:outline-none focus:border-blue-500 cursor-pointer shrink-0"
            >
              <option value="All">All NCC Groups</option>
              <option value="Group B">Group B</option>
              <option value="Group C">Group C</option>
            </select>
          )}
        </div>

        <div className="flex bg-white border border-slate-200 rounded-xl p-1 mb-2">
          {[
            { id: 'weekly', label: 'Weekly Summary Matrix' },
            { id: 'audit', label: 'Monthly Summary' },
            { id: 'annual', label: 'Annual Quota Summary' },
            { id: 'bill', label: 'Bill Tracking & Payments' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'weekly' && <WeeklySummaryView />}
      {activeTab === 'audit' && <AuditTrailView />}
      {activeTab === 'annual' && <AnnualSummaryView />}
      {activeTab === 'bill' && <BillTrackerView />}
    </div>
  );
}
