import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Coffee, 
  History, 
  Building2, 
  Search, 
  Trash2, 
  RefreshCw, 
  Printer,
  Calendar,
  MapPin,
  Clock,
  FileText,
  FileCheck,
  Eye,
  Pencil,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { IndianRupee } from 'lucide-react';
import DemandDetailSidePanel from '../components/DemandDetailSidePanel';
import CustomDateInput from '../components/CustomDateInput';
import StatusBadge from '../components/StatusBadge';
import { useSSE } from '../context/SSEContext';

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

const formatTimeDisplay = (timeStr, fallbackDateStr) => {
  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const clean = timeStr.trim();
    if (clean.includes('AM') || clean.includes('PM')) return clean;
    const parts = clean.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1].padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
    }
    return clean;
  }
  if (fallbackDateStr) {
    const d = new Date(fallbackDateStr);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
  }
  return '08:00 AM';
};

export default function InstitutionDashboard() {
  const { user, token } = useAuth();
  const { events } = useSSE();
  const [instDetails, setInstDetails] = useState(null);
  const [recentDemands, setRecentDemands] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState(null);
  
  // Form State
  const [demandPrefix, setDemandPrefix] = useState('FIRST');
  const [year1, setYear1] = useState('');
  const [year2, setYear2] = useState('');
  const [year3, setYear3] = useState('');
  const [totalDemanded, setTotalDemanded] = useState('');
  const [demandDate, setDemandDate] = useState(new Date().toISOString().split('T')[0]);
  const [demandTime, setDemandTime] = useState('08:00');
  const [venue, setVenue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDemandsHistory = useCallback(async () => {
    if (!token) return;
    try {
      const demRes = await fetch('/api/demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (demRes.ok) {
        const demData = await demRes.json();
        setRecentDemands(Array.isArray(demData) ? demData : []);
      }
    } catch (err) {
      console.error('Error fetching demand history:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time SSE listener
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.NEW_NOTIFICATION || events?.timestamp) {
      fetchDemandsHistory();
    }
  }, [events?.DEMAND_UPDATED, events?.NEW_NOTIFICATION, events?.timestamp, fetchDemandsHistory]);

  // Window event & BroadcastChannel listener (updates only when actual event occurs, no awkward polling loop)
  useEffect(() => {
    const handleDemandStatusChange = () => {
      fetchDemandsHistory();
    };
    window.addEventListener('demand-status-changed', handleDemandStatusChange);
    window.addEventListener('notification-received', handleDemandStatusChange);

    return () => {
      window.removeEventListener('demand-status-changed', handleDemandStatusChange);
      window.removeEventListener('notification-received', handleDemandStatusChange);
    };
  }, [fetchDemandsHistory]);

  const getNextDate = (dayName) => {
    if (!dayName) return new Date().toISOString().split('T')[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetIdx = days.indexOf(dayName);
    if (targetIdx === -1) return new Date().toISOString().split('T')[0];
    
    const now = new Date();
    const currentIdx = now.getDay();
    let daysUntil = targetIdx - currentIdx;
    if (daysUntil <= 0) daysUntil += 7;
    
    now.setDate(now.getDate() + daysUntil);
    return now.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    try {
      // 1. Fetch institution details
      const instRes = await fetch(`/api/institutions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const instData = await instRes.json();
      if (instData && instData.length > 0) {
        const inst = instData[0];
        setInstDetails(inst);
        setVenue(inst.complete_address || inst.institution_name || '');
        
        // Auto-fetch 1st, 2nd, and 3rd year strengths directly from vacancy
        const y1 = inst.strength_1st_year !== undefined && inst.strength_1st_year !== null ? inst.strength_1st_year : 0;
        const y2 = inst.strength_2nd_year !== undefined && inst.strength_2nd_year !== null ? inst.strength_2nd_year : 0;
        const y3 = Number(inst.strength_3rd_year || 0) > 0 ? inst.strength_3rd_year : 0;
        setYear1(y1);
        setYear2(y2);
        setYear3(y3);
        setTotalDemanded(y1 + y2 + y3);

        // Auto-populate based on FIRST demand (default)
        if (inst.first_demand_day) {
          setDemandDate(getNextDate(inst.first_demand_day));
          setDemandTime(inst.first_demand_time || '08:00');
        }
      }

      // 2. Fetch demands
      await fetchDemandsHistory();

      // 3. Fetch catalog
      const catRes = await fetch('/api/catalog', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const catData = await catRes.json();
      setCatalog(Array.isArray(catData) ? catData : []);

    } catch (err) {
      console.error(err);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const s1 = Number(instDetails?.strength_1st_year) || 0;
  const s2 = Number(instDetails?.strength_2nd_year) || 0;
  const s3 = Number(instDetails?.strength_3rd_year) || 0;
  const totalSanctioned = s1 + s2 + s3;
  
  // Mocking quotas based on sanctioned strength (usually 25 days)
  const annualQuota = totalSanctioned * 25;
  // Calculate consumed from history
  let consumedQuota = 0;
  let totalCost = 0;
  const safeDemands = Array.isArray(recentDemands) ? recentDemands : [];
  safeDemands.forEach(d => {
    consumedQuota += (Number(d.total_quantity) || 0);
    totalCost += (Number(d.total_amount) || 0);
  });
  const remainingQuota = annualQuota - consumedQuota;

  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const defaultItem = safeCatalog.find(c => c.item_name === 'Standard Refreshment Packet') || safeCatalog[0];
  const perPacketPrice = defaultItem ? Number(defaultItem.unit_price || 75.00) : 75.00;
  const demandTotalAmount = (parseInt(totalDemanded) || 0) * perPacketPrice;

  const totalStrInput = (parseInt(year1) || 0) + (parseInt(year2) || 0) + (parseInt(year3) || 0);

  const handleTotalDemandedChange = (val) => {
    setTotalDemanded(val);
    if (val === '') {
      setYear1('');
      setYear2('');
      setYear3('');
      return;
    }
    let target = parseInt(val);
    if (isNaN(target)) target = 0;
    if (target < 0) target = 0;
    if (target > totalSanctioned) target = totalSanctioned;

    if (totalSanctioned === 0) {
      setYear1(0);
      setYear2(0);
      setYear3(0);
      return;
    }

    // Distribute proportionally across sanctioned vacancies
    let y1 = Math.min(s1, Math.round(target * (s1 / totalSanctioned)));
    let y2 = Math.min(s2, Math.round(target * (s2 / totalSanctioned)));
    let y3 = s3 > 0 ? Math.min(s3, Math.round(target * (s3 / totalSanctioned))) : 0;

    let diff = target - (y1 + y2 + y3);

    if (diff > 0) {
      while (diff > 0) {
        if (y1 < s1) { y1++; diff--; }
        else if (y2 < s2) { y2++; diff--; }
        else if (s3 > 0 && y3 < s3) { y3++; diff--; }
        else break;
      }
    } else if (diff < 0) {
      while (diff < 0) {
        if (s3 > 0 && y3 > 0) { y3--; diff++; }
        else if (y2 > 0) { y2--; diff++; }
        else if (y1 > 0) { y1--; diff++; }
        else break;
      }
    }

    setYear1(y1);
    setYear2(y2);
    setYear3(s3 > 0 ? y3 : 0);
  };

  const adjustTotal = (delta) => {
    const current = parseInt(totalDemanded) || totalStrInput;
    const next = Math.max(0, Math.min(totalSanctioned, current + delta));
    handleTotalDemandedChange(next);
  };

  const handlePrefixChange = (prefix) => {
    setDemandPrefix(prefix);
    if (instDetails) {
      if (prefix === 'FIRST' && instDetails.first_demand_day) {
        setDemandDate(getNextDate(instDetails.first_demand_day));
        setDemandTime(instDetails.first_demand_time || '08:00');
      } else if (prefix === 'SECOND' && instDetails.second_demand_day) {
        setDemandDate(getNextDate(instDetails.second_demand_day));
        setDemandTime(instDetails.second_demand_time || '08:00');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (totalStrInput === 0) {
      setError('Please enter cadet strength.');
      return;
    }
    
    if (totalStrInput > totalSanctioned) {
      setError('Total attending exceeds sanctioned strength.');
      return;
    }

    if ((parseInt(year1) || 0) > s1) {
      setError(`1st Year quantity (${year1}) exceeds sanctioned strength (${s1}).`);
      return;
    }
    if ((parseInt(year2) || 0) > s2) {
      setError(`2nd Year quantity (${year2}) exceeds sanctioned strength (${s2}).`);
      return;
    }
    if (s3 > 0 && (parseInt(year3) || 0) > s3) {
      setError(`3rd Year quantity (${year3}) exceeds sanctioned strength (${s3}).`);
      return;
    }

    if (catalog.length === 0) {
      setError('No refreshment items available in catalog.');
      return;
    }

    setSubmitting(true);
    try {
      const items = [];
      const defaultItem = catalog.find(c => c.item_name === 'Standard Refreshment Packet') || catalog[0];

      if (parseInt(year1) > 0) {
        items.push({
          item_id: defaultItem.id,
          year_group: '1st Year',
          quantity: parseInt(year1)
        });
      }
      if (parseInt(year2) > 0) {
        items.push({
          item_id: defaultItem.id,
          year_group: '2nd Year',
          quantity: parseInt(year2)
        });
      }
      if (s3 > 0 && parseInt(year3) > 0) {
        items.push({
          item_id: defaultItem.id,
          year_group: '3rd Year',
          quantity: parseInt(year3)
        });
      }

      const payload = {
        demand_date: demandDate,
        demand_time: demandTime,
        purpose: `${demandPrefix} DEMAND - ${venue}`,
        items: items
      };

      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit demand.');

      // Broadcast instant local cross-window notification
      try {
        window.dispatchEvent(new CustomEvent('demand-status-changed', { detail: data }));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const syncChan = new BroadcastChannel('ncc_demands_sync');
          syncChan.postMessage({ type: 'DEMAND_UPDATED', payload: data });
          syncChan.close();
        }
      } catch (e) {
        console.warn('Cross-tab broadcast warning:', e);
      }

      // Refresh data and reset to vacancy
      if (instDetails) {
        const y1 = instDetails.strength_1st_year ?? 0;
        const y2 = instDetails.strength_2nd_year ?? 0;
        const y3 = Number(instDetails.strength_3rd_year || 0) > 0 ? (instDetails.strength_3rd_year ?? 0) : 0;
        setYear1(y1);
        setYear2(y2);
        setYear3(y3);
        setTotalDemanded(y1 + y2 + y3);
      }
      fetchData();
      alert(`Demand initiated successfully!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    const y1 = instDetails?.strength_1st_year ?? 0;
    const y2 = instDetails?.strength_2nd_year ?? 0;
    const y3 = Number(instDetails?.strength_3rd_year || 0) > 0 ? (instDetails?.strength_3rd_year ?? 0) : 0;
    setYear1(y1);
    setYear2(y2);
    setYear3(y3);
    setTotalDemanded(y1 + y2 + y3);
    setDemandDate(new Date().toISOString().split('T')[0]);
    setDemandTime('08:00');
    setVenue(instDetails?.complete_address || instDetails?.institution_name || '');
    setError('');
  };

  const handleDelete = async (id, demandNumber) => {
    if (window.confirm(`Are you sure you want to delete demand ${demandNumber || '#' + id}?`)) {
      try {
        const res = await fetch(`/api/demands/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to delete demand');
        }
        fetchData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4 flex flex-col min-h-[calc(100vh-6.5rem)]">

      {/* 4 Summary Cards - Ultra Compact Single Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {/* Total Packets */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-2.5 sm:p-3 text-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-indigo-100 uppercase">TOTAL PACKETS</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{(consumedQuota || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="p-2 bg-white/20 rounded-lg">
            <Coffee className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase">TOTAL COST</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 mt-0.5 font-mono">₹{(totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase">TOTAL ENTRIES</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 mt-0.5">{recentDemands.length}</div>
          </div>
          <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
            <History className="w-4 h-4" />
          </div>
        </div>

        {/* Institution Profile */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-black tracking-wider text-fuchsia-500 uppercase">PROFILE</div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
              <span>1st: <strong className="text-slate-700">{instDetails?.strength_1st_year || 0}</strong></span>
              <span>2nd: <strong className="text-slate-700">{instDetails?.strength_2nd_year || 0}</strong></span>
              {s3 > 0 && <span>3rd: <strong className="text-slate-700">{instDetails?.strength_3rd_year || 0}</strong></span>}
            </div>
          </div>
          <div className="mt-0.5 flex flex-col gap-0.5 min-w-0">
            <div className="font-extrabold text-slate-900 text-xs truncate" title={instDetails?.institution_name}>
              {instDetails?.institution_name || 'Loading...'}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 truncate flex items-center gap-1">
              <span className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded text-[9px] text-indigo-700 font-black">
                ANO: {instDetails?.ano_cto_name || user?.name || 'N/A'}
              </span>
              {(instDetails?.contact_number || instDetails?.ano_mobile || instDetails?.phone) && (
                <span className="text-[9px] text-slate-400 font-medium">
                  • {instDetails?.contact_number || instDetails?.ano_mobile || instDetails?.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Table (Right) - Full Viewport Vertical Justification */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 items-stretch flex-1">
        
        {/* LEFT COLUMN: COMPACT NEW ENTRY FORM */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full min-h-[700px]">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <div className="w-2 h-4 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">NEW DEMAND ENTRY</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-2.5">
            <div className="flex-1 flex flex-col justify-between gap-2">
              {/* Institution Search */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">INSTITUTION</label>
                <div className="relative group">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    value={instDetails?.institution_name || user?.name || ''}
                    readOnly
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Demand Prefix */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">DEMAND TYPE</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handlePrefixChange('FIRST')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all ${demandPrefix === 'FIRST' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    FIRST DEMAND
                  </button>
                  <button 
                    type="button"
                    onClick={() => handlePrefixChange('SECOND')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all ${demandPrefix === 'SECOND' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    SECOND DEMAND
                  </button>
                </div>
              </div>

              {/* Date & Time (Strict DD/MM/YYYY) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">DATE</label>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">DD/MM/YYYY</span>
                  </div>
                  <CustomDateInput 
                    value={demandDate}
                    onChange={(isoVal) => setDemandDate(isoVal)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TIME</label>
                    <span className="text-[9px] font-bold text-slate-400">12-Hour</span>
                  </div>
                  <div className="relative group">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <input 
                      type="time" 
                      value={demandTime}
                      onChange={(e) => setDemandTime(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quota Strip - Compact 3-col info */}
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 grid grid-cols-3 gap-1 text-center">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Sanctioned</span>
                  <span className="text-xs font-black text-slate-800">{totalSanctioned}</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Auth Quota</span>
                  <span className="text-xs font-black text-slate-800">{annualQuota.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Consumed / Rem</span>
                  <span className="text-xs font-black text-indigo-600 font-mono">{consumedQuota.toLocaleString()} / {remainingQuota.toLocaleString()}</span>
                </div>
              </div>

              {/* Year Inputs */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">CADET ATTENDANCE</label>
                  <button
                    type="button"
                    onClick={() => {
                      setYear1(s1);
                      setYear2(s2);
                      setYear3(s3 > 0 ? s3 : 0);
                      setTotalDemanded(s1 + s2 + (s3 > 0 ? s3 : 0));
                    }}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors inline-flex items-center gap-1"
                    title="Auto-fill quantities directly from sanctioned cadet vacancy"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Fill Vacancy
                  </button>
                </div>
                <div className={`grid ${s3 > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[9px] font-black text-slate-500">1ST YR</label>
                      <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {s1}</span>
                    </div>
                    <input 
                      type="number" 
                      min="0" 
                      max={s1}
                      value={year1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setYear1(val);
                        setTotalDemanded((parseInt(val) || 0) + (parseInt(year2) || 0) + (s3 > 0 ? (parseInt(year3) || 0) : 0));
                      }}
                      className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[9px] font-black text-slate-500">2ND YR</label>
                      <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {s2}</span>
                    </div>
                    <input 
                      type="number" 
                      min="0" 
                      max={s2}
                      value={year2}
                      onChange={(e) => {
                        const val = e.target.value;
                        setYear2(val);
                        setTotalDemanded((parseInt(year1) || 0) + (parseInt(val) || 0) + (s3 > 0 ? (parseInt(year3) || 0) : 0));
                      }}
                      className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {s3 > 0 && (
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[9px] font-black text-slate-500">3RD YR</label>
                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {s3}</span>
                      </div>
                      <input 
                        type="number" 
                        min="0" 
                        max={s3}
                        value={year3}
                        onChange={(e) => {
                          const val = e.target.value;
                          setYear3(val);
                          setTotalDemanded((parseInt(year1) || 0) + (parseInt(year2) || 0) + (parseInt(val) || 0));
                        }}
                        className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Live Demand Summary: Ultra Compact single-row */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 rounded-lg p-2 border border-indigo-100/90 shadow-2xs">
                <div className="grid grid-cols-12 items-center gap-1.5">
                  {/* 1. TOTAL QTY */}
                  <div className="col-span-4">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                      TOTAL QTY
                    </label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        min="0" 
                        max={totalSanctioned}
                        value={totalDemanded}
                        onChange={(e) => handleTotalDemandedChange(e.target.value)}
                        className="w-14 px-1 py-0.5 bg-white border border-indigo-400 focus:border-indigo-600 rounded-md text-sm font-black text-indigo-700 text-center focus:outline-none"
                        title="Edit total demanded packets directly"
                      />
                      <span className="text-[10px] font-bold text-slate-500">Pkts</span>
                    </div>
                  </div>

                  {/* 2. TOTAL AMOUNT */}
                  <div className="col-span-4 border-l border-indigo-100 pl-1.5">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                      TOTAL AMOUNT
                    </label>
                    <div className="text-xs sm:text-sm font-black text-emerald-600 truncate font-mono">
                      ₹{demandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* 3. PER PKT AMOUNT */}
                  <div className="col-span-4 border-l border-indigo-100 pl-1.5 text-right">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate" title="Per Packet Amount Including GST">
                      PER PKT
                    </label>
                    <div className="text-xs font-black text-slate-800 font-mono">
                      ₹{perPacketPrice.toFixed(2)}
                    </div>
                    <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 inline-block">
                      INCL. GST
                    </span>
                  </div>
                </div>
              </div>

              {/* Training Venue */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  TRAINING VENUE (COMPLETE ADDRESS)
                </label>
                <div className="relative group">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Enter complete address..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {error && <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg shrink-0">{error}</div>}

            {/* Buttons */}
            <div className="flex gap-2 pt-2 shrink-0">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-70 cursor-pointer"
              >
                {submitting ? 'Placing...' : 'PLACE DEMAND'}
              </button>
              <button 
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                CLEAR
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: REFRESHMENT DEMAND HISTORY */}
        <div className="xl:col-span-9 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full min-h-[520px]">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <History className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">DEMAND HISTORY</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fetchData()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer">
                <RefreshCw className="w-3 h-3" />
                SYNC
              </button>
              <button className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all shadow-xs cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto p-3">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="pl-6 pr-2 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                    <input type="checkbox" className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  </th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">NO</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">DATE & TIME</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">TYPE</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">INSTITUTION</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">ANO/UNIT</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">STATUS</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">PKTS</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">RATE</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">COST</th>
                  <th className="pr-6 pl-2 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentDemands.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-28 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <span className="text-sm font-semibold text-slate-400">No demands found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentDemands.map((dem, idx) => (
                    <tr 
                      key={dem.id} 
                      onClick={() => setSelectedDemand(dem)}
                      className="group hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    >
                      <td className="pl-6 pr-2 py-4 rounded-l-2xl" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors" />
                      </td>
                      <td className="px-3 py-4 font-bold text-slate-500 text-xs">#{idx + 1}</td>
                      <td className="px-3 py-4">
                        <div className="font-black text-slate-800 tracking-tight text-xs">{formatDMY(dem.demand_date)}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider">{formatTimeDisplay(dem.demand_time, dem.created_at)}</div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-block ${
                          dem.demand_type === 'UNIT_DIRECT' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {dem.demand_type === 'UNIT_DIRECT' ? 'UNIT DIRECT' : 'INSTITUTE'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-bold text-slate-800 uppercase text-xs">{instDetails?.institution_name || dem.institution_name || 'INSTITUTION'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-bold text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-1 rounded-md inline-block">
                          {dem.demand_type === 'UNIT_DIRECT' || !dem.ano_cto_name || /^\d+$/.test(String(dem.ano_cto_name).trim())
                            ? 'UNIT ADM'
                            : (dem.ano_cto_name || instDetails?.ano_cto_name || user?.name)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={dem.status} deliveryStatus={dem.delivery_status} demand={dem} />
                          {dem.delivery_partner_name && dem.delivery_status !== 'DELIVERED' && (
                            <span className="text-[10px] font-bold text-slate-500">
                              Handler: {dem.delivery_partner_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{dem.total_quantity || 0}</div>
                      </td>
                      <td className="px-3 py-4 font-bold text-slate-500 text-xs">
                        ₹{dem.total_quantity ? (dem.total_amount / dem.total_quantity).toFixed(2) : '0.00'}
                      </td>
                      <td className="px-3 py-4 font-black text-emerald-600 text-right">
                        ₹{(dem.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="pr-6 pl-2 py-4 text-center rounded-r-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDemand(dem)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer"
                            title="Edit / View Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(dem.id, dem.demand_number)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 shadow-2xs transition-all cursor-pointer"
                            title="Delete Demand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
      <DemandDetailSidePanel 
        demand={selectedDemand} 
        onClose={() => setSelectedDemand(null)} 
        token={token} 
      />
    </div>
  );
}
