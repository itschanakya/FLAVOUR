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
  Truck,
  CheckCircle2
} from 'lucide-react';
import { IndianRupee } from 'lucide-react';
import DemandDetailSidePanel from '../components/DemandDetailSidePanel';
import CustomDateInput from '../components/CustomDateInput';
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
        setVenue(inst.institution_name || '');
        
        // Auto-fetch 1st, 2nd, and 3rd year strengths directly from vacancy
        const y1 = inst.strength_1st_year !== undefined && inst.strength_1st_year !== null ? inst.strength_1st_year : 0;
        const y2 = inst.strength_2nd_year !== undefined && inst.strength_2nd_year !== null ? inst.strength_2nd_year : 0;
        const y3 = inst.strength_3rd_year !== undefined && inst.strength_3rd_year !== null ? inst.strength_3rd_year : 0;
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

  const s1 = instDetails?.strength_1st_year || 0;
  const s2 = instDetails?.strength_2nd_year || 0;
  const s3 = instDetails?.strength_3rd_year || 0;
  const totalSanctioned = s1 + s2 + s3;
  
  // Mocking quotas based on sanctioned strength (usually 25 days)
  const annualQuota = totalSanctioned * 25;
  // Calculate consumed from history
  let consumedQuota = 0;
  let totalCost = 0;
  const safeDemands = Array.isArray(recentDemands) ? recentDemands : [];
  safeDemands.forEach(d => {
    consumedQuota += (d.total_quantity || 0);
    totalCost += (d.total_amount || 0);
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
    let y3 = Math.min(s3, Math.round(target * (s3 / totalSanctioned)));

    let diff = target - (y1 + y2 + y3);

    if (diff > 0) {
      while (diff > 0) {
        if (y1 < s1) { y1++; diff--; }
        else if (y2 < s2) { y2++; diff--; }
        else if (y3 < s3) { y3++; diff--; }
        else break;
      }
    } else if (diff < 0) {
      while (diff < 0) {
        if (y3 > 0) { y3--; diff++; }
        else if (y2 > 0) { y2--; diff++; }
        else if (y1 > 0) { y1--; diff++; }
        else break;
      }
    }

    setYear1(y1);
    setYear2(y2);
    setYear3(y3);
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
    if ((parseInt(year3) || 0) > s3) {
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
      if (parseInt(year3) > 0) {
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
        const y3 = instDetails.strength_3rd_year ?? 0;
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
    const y3 = instDetails?.strength_3rd_year ?? 0;
    setYear1(y1);
    setYear2(y2);
    setYear3(y3);
    setTotalDemanded(y1 + y2 + y3);
    setDemandDate(new Date().toISOString().split('T')[0]);
    setDemandTime('08:00');
    setVenue(instDetails?.institution_name || '');
    setError('');
  };

  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to delete this demand?')) {
      // Typically an API call here, for now just removing from state
      setRecentDemands(recentDemands.filter(d => d.id !== id));
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
    <div className="space-y-8 pb-12">

      {/* 4 Summary Cards - Compact 2-Col on Mobile, 4-Col on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Total Packets */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
          <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl w-fit mb-2 sm:mb-4">
            <Coffee className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-black tracking-widest text-indigo-100 uppercase mb-0.5 sm:mb-1">TOTAL PACKETS</div>
            <div className="text-xl sm:text-3xl font-black">{consumedQuota || 5539}</div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl w-fit mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
            <IndianRupee className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400 uppercase mb-0.5 sm:mb-1">TOTAL COST</div>
            <div className="text-xl sm:text-3xl font-black text-slate-800 truncate">₹{(totalCost || 415425).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="p-2 sm:p-3 bg-amber-50 text-amber-500 rounded-xl sm:rounded-2xl w-fit mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
            <History className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400 uppercase mb-0.5 sm:mb-1">TOTAL ENTRIES</div>
            <div className="text-xl sm:text-3xl font-black text-slate-800">{recentDemands.length || 170}</div>
          </div>
        </div>

        {/* Institution Profile */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div>
            <div className="text-[10px] sm:text-[11px] font-black tracking-widest text-fuchsia-500 uppercase mb-1">PROFILE</div>
            <div className="font-bold text-slate-800 text-xs sm:text-base leading-tight truncate">{instDetails?.institution_name || 'Loading...'}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate mt-0.5">{instDetails?.ano_cto_name || 'Loading...'}</div>
          </div>
          <div className="flex justify-between items-end mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">1st</div>
              <div className="text-xs sm:text-sm font-black text-slate-700">{instDetails?.strength_1st_year || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">2nd</div>
              <div className="text-xs sm:text-sm font-black text-slate-700">{instDetails?.strength_2nd_year || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">3rd</div>
              <div className="text-xs sm:text-sm font-black text-slate-700">{instDetails?.strength_3rd_year || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Table (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* LEFT COLUMN: NEW ENTRY FORM */}
        <div className="xl:col-span-4 bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-2.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-sm sm:text-base font-black tracking-widest text-slate-900 uppercase">NEW DEMAND ENTRY</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Institution Search */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">INSTITUTION</label>
              <div className="relative group">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={instDetails?.institution_name || user?.name || ''}
                  readOnly
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Demand Prefix */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">DEMAND TYPE</label>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => handlePrefixChange('FIRST')}
                  className={`flex-1 py-3.5 text-xs font-black rounded-2xl border-2 transition-all duration-300 ${demandPrefix === 'FIRST' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  FIRST DEMAND
                </button>
                <button 
                  type="button"
                  onClick={() => handlePrefixChange('SECOND')}
                  className={`flex-1 py-3.5 text-xs font-black rounded-2xl border-2 transition-all duration-300 ${demandPrefix === 'SECOND' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  SECOND DEMAND
                </button>
              </div>
            </div>

            {/* Date & Time (Strict DD/MM/YYYY) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">DATE</label>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">DD/MM/YYYY</span>
                </div>
                <CustomDateInput 
                  value={demandDate}
                  onChange={(isoVal) => setDemandDate(isoVal)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">TIME</label>
                  <span className="text-[10px] font-bold text-slate-400">12-Hour</span>
                </div>
                <div className="relative group">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <input 
                    type="time" 
                    value={demandTime}
                    onChange={(e) => setDemandTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500 transition-all hover:border-slate-200 tracking-wider"
                  />
                </div>
              </div>
            </div>

            {/* Quota Box */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200/60 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Sanctioned Strength</span>
                <span className="font-black text-slate-800">{totalSanctioned} Cadets</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Auth Quota (25 Org)</span>
                <span className="font-black text-slate-800">{annualQuota.toLocaleString()} Pkts</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500">Consumed / Remaining</span>
                <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{consumedQuota.toLocaleString()} / {remainingQuota.toLocaleString()}</span>
              </div>
            </div>

            {/* Year Inputs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">CADET ATTENDANCE STRENGTH</label>
                <button
                  type="button"
                  onClick={() => {
                    setYear1(s1);
                    setYear2(s2);
                    setYear3(s3);
                    setTotalDemanded(s1 + s2 + s3);
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Auto-fill quantities directly from sanctioned cadet vacancy"
                >
                  <RefreshCw className="w-3 h-3" /> Fetch From Vacancy
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 focus-within:border-indigo-500 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">1ST YEAR</label>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Vac: {s1}</span>
                  </div>
                  <input 
                    type="number" 
                    min="0" 
                    max={s1}
                    value={year1}
                    onChange={(e) => {
                      const val = e.target.value;
                      setYear1(val);
                      setTotalDemanded((parseInt(val) || 0) + (parseInt(year2) || 0) + (parseInt(year3) || 0));
                    }}
                    className="w-full px-2 py-2 bg-white border-2 border-slate-100 rounded-xl text-base font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 focus-within:border-indigo-500 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">2ND YEAR</label>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Vac: {s2}</span>
                  </div>
                  <input 
                    type="number" 
                    min="0" 
                    max={s2}
                    value={year2}
                    onChange={(e) => {
                      const val = e.target.value;
                      setYear2(val);
                      setTotalDemanded((parseInt(year1) || 0) + (parseInt(val) || 0) + (parseInt(year3) || 0));
                    }}
                    className="w-full px-2 py-2 bg-white border-2 border-slate-100 rounded-xl text-base font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 focus-within:border-indigo-500 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">3RD YEAR</label>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Vac: {s3}</span>
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
                    className="w-full px-2 py-2 bg-white border-2 border-slate-100 rounded-xl text-base font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Live Demand Summary: TOTAL QTY & TOTAL AMOUNT on left side, PER PKT AMOUNT on right side */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-2xl p-4 border border-indigo-100/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                {/* LEFT SIDE: TOTAL QTY AND TOTAL AMOUNT */}
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* TOTAL QTY */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      TOTAL QTY
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        min="0" 
                        max={totalSanctioned}
                        value={totalDemanded}
                        onChange={(e) => handleTotalDemandedChange(e.target.value)}
                        className="w-20 px-2 py-1.5 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl text-base font-black text-indigo-700 text-center focus:outline-none shadow-2xs transition-all"
                        title="Edit total demanded packets directly"
                      />
                      <span className="text-xs font-bold text-slate-500">Pkts</span>
                    </div>
                  </div>

                  <div className="h-9 w-px bg-slate-200"></div>

                  {/* TOTAL AMOUNT */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      TOTAL AMOUNT
                    </label>
                    <div className="text-base sm:text-lg font-black text-emerald-600 py-1">
                      ₹{demandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: PER PKT AMOUNT */}
                <div className="text-right shrink-0">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    PER PKT AMOUNT
                  </label>
                  <div className="text-base sm:text-lg font-black text-slate-800 py-1">
                    ₹{perPacketPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                <span>Editable directly or adjusted via year strengths</span>
                <span>Max Sanctioned: <strong className="text-slate-600 font-bold">{totalSanctioned}</strong></span>
              </div>
            </div>

            {/* Training Venue */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">TRAINING VENUE</label>
              <div className="relative group">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase transition-all hover:border-slate-200"
                />
              </div>
            </div>

            {error && <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 p-4 rounded-2xl">{error}</div>}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {submitting ? 'Placing...' : 'PLACE DEMAND'}
              </button>
              <button 
                type="button"
                onClick={handleClear}
                className="px-6 py-4 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                CLEAR
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: REFRESHMENT DEMAND HISTORY */}
        <div className="xl:col-span-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <History className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-base font-black tracking-widest text-slate-900 uppercase">DEMAND HISTORY</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={() => fetchData()} className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm">
                <RefreshCw className="w-3.5 h-3.5" />
                SYNC
              </button>
              <button className="p-2.5 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm">
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 p-4">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="pl-6 pr-2 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                    <input type="checkbox" className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  </th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">NO</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">DATE & TIME</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">INSTITUTION</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">ANO</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">STATUS</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">PKTS</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">RATE</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">COST</th>
                  <th className="px-3 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">DOCUMENTS</th>
                  <th className="pr-6 pl-2 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {recentDemands.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-12 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl">No demands found.</td>
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
                        <div className="font-bold text-slate-800 uppercase text-xs">{instDetails?.institution_name || 'INSTITUTION'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-bold text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-1 rounded-md inline-block">{instDetails?.ano_cto_name || user?.name}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                            dem.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            dem.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            dem.status === 'ACCEPTED' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                            dem.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            'bg-rose-100 text-rose-700 border-rose-200'
                          }`}>
                            {dem.status}
                          </span>
                          {/* Live Physical Delivery Badge */}
                          {dem.delivery_status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Delivered
                            </span>
                          ) : dem.delivery_status === 'OUT_FOR_DELIVERY' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 animate-pulse" title={`Driver: ${dem.delivery_partner_name}`}>
                              <Truck className="w-2.5 h-2.5" /> Out for Delivery
                            </span>
                          ) : dem.delivery_partner_name ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Driver Assigned
                            </span>
                          ) : null}
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
                      <td className="px-3 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {dem.delivery_receipt_url ? (
                            <a
                              href={dem.delivery_receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs"
                              title="View Signed Delivery Receipt"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" /> Receipt
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              Receipt (Pending)
                            </span>
                          )}

                          {dem.invoice_url ? (
                            <a
                              href={dem.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-xs"
                              title="View Bill / Invoice"
                            >
                              <FileCheck className="w-3 h-3 text-indigo-600" /> Bill
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              Bill (Pending)
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedDemand(dem)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all shadow-xs"
                            title="View Demand Details & Verification"
                          >
                            <Eye className="w-3 h-3 text-blue-600" /> View Details
                          </button>
                        </div>
                      </td>
                      <td className="pr-6 pl-2 py-4 rounded-r-2xl text-right" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleDelete(dem.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
