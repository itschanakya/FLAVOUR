import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Building2,
  School,
  ShoppingBag,
  IndianRupee,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  FileCheck,
  Shield,
  Layers,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  X,
  Coffee,
  History,
  Printer
} from 'lucide-react';
import CustomDateInput from '../components/CustomDateInput';
import DemandDetailSidePanel from '../components/DemandDetailSidePanel';

export default function UnitDemandPage() {
  const { user, token } = useAuth();
  const { events } = useSSE();
  const navigate = useNavigate();

  // Strict role check: This Refreshment Demand Console is exclusively for UNIT
  useEffect(() => {
    if (user && user.role !== 'UNIT') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user && user.role !== 'UNIT') {
    return null;
  }

  // Mode: 'INSTITUTION' (on behalf) or 'UNIT_DIRECT' (direct unit demand)
  const [demandMode, setDemandMode] = useState('UNIT_DIRECT');

  // Institutions list for Option 1
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedInst, setSelectedInst] = useState(null);
  const [instSearch, setInstSearch] = useState('');
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const instDropdownRef = useRef(null);

  // Close institution dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (instDropdownRef.current && !instDropdownRef.current.contains(e.target)) {
        setInstDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredInstitutions = institutions.filter(inst => {
    if (!instSearch.trim()) return true;
    const q = instSearch.toLowerCase();
    return (
      (inst.institution_name && inst.institution_name.toLowerCase().includes(q)) ||
      (inst.ano_cto_name && inst.ano_cto_name.toLowerCase().includes(q)) ||
      (inst.login_id && inst.login_id.toLowerCase().includes(q)) ||
      (inst.pin_code && String(inst.pin_code).includes(q))
    );
  });

  const selectInstitution = (inst) => {
    setSelectedInstId(String(inst.id));
    setSelectedInst(inst);
    setInstSearch('');
    setInstDropdownOpen(false);
    setVenue(inst.complete_address || inst.institution_name || '');
    const s1 = Number(inst.strength_1st_year) || 0;
    const s2 = Number(inst.strength_2nd_year) || 0;
    const s3 = Number(inst.strength_3rd_year) || 0;
    setYear1(s1);
    setYear2(s2);
    setYear3(s3 > 0 ? s3 : 0);
    setTotalDemanded(s1 + s2 + (s3 > 0 ? s3 : 0));
    if (demandPrefix === 'FIRST' && inst.first_demand_day) {
      setDemandDate(getNextDate(inst.first_demand_day));
      setDemandTime(inst.first_demand_time || '08:00');
    } else if (demandPrefix === 'SECOND' && inst.second_demand_day) {
      setDemandDate(getNextDate(inst.second_demand_day));
      setDemandTime(inst.second_demand_time || '08:00');
    }
  };

  // Common Form Fields
  const [demandDate, setDemandDate] = useState(new Date().toISOString().split('T')[0]);
  const [demandTime, setDemandTime] = useState('08:00');
  const [venue, setVenue] = useState('');
  const [purpose, setPurpose] = useState('');

  // Option 1 Form Fields (Institutional On-Behalf)
  const [demandPrefix, setDemandPrefix] = useState('FIRST');
  const [year1, setYear1] = useState('');
  const [year2, setYear2] = useState('');
  const [year3, setYear3] = useState('');
  const [totalDemanded, setTotalDemanded] = useState(0);

  // Option 2 Form Fields (Unit Direct)
  const [packetType, setPacketType] = useState('CUSTOMIZED'); // 'REGULAR' or 'CUSTOMIZED'
  const [customRate, setCustomRate] = useState('60'); // default budget rate below ₹75
  const [totalPackets, setTotalPackets] = useState('100');

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recentUnitDemands, setRecentUnitDemands] = useState([]);
  const [loadingDemands, setLoadingDemands] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState(null);

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

  // Fetch institutions under this unit
  useEffect(() => {
    if (!token) return;
    fetch('/api/institutions', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInstitutions(data);
          if (data.length > 0) {
            setSelectedInstId(String(data[0].id));
            setSelectedInst(data[0]);
            const s1 = Number(data[0].strength_1st_year) || 0;
            const s2 = Number(data[0].strength_2nd_year) || 0;
            const s3 = Number(data[0].strength_3rd_year) || 0;
            setYear1(s1);
            setYear2(s2);
            setYear3(s3 > 0 ? s3 : 0);
            setTotalDemanded(s1 + s2 + (s3 > 0 ? s3 : 0));
            setVenue(data[0].complete_address || data[0].institution_name || '');
            if (data[0].first_demand_day) {
              setDemandDate(getNextDate(data[0].first_demand_day));
              setDemandTime(data[0].first_demand_time || '08:00');
            }
          }
        }
      })
      .catch(err => console.error('Error fetching institutions:', err));
  }, [token]);

  // Fetch Recent Unit Demands
  const fetchRecentDemands = useCallback(async () => {
    if (!token) return;
    setLoadingDemands(true);
    try {
      const res = await fetch('/api/demands?unit_id=' + (user?.unit_id || ''), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentUnitDemands(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDemands(false);
    }
  }, [token, user?.unit_id]);

  useEffect(() => {
    fetchRecentDemands();
  }, [fetchRecentDemands]);

  // Real-time updates
  useEffect(() => {
    if (events?.DEMAND_UPDATED) {
      fetchRecentDemands();
    }
  }, [events, fetchRecentDemands]);

  // Keep selected demand synchronized with recent demands if one is already open
  useEffect(() => {
    if (recentUnitDemands.length > 0) {
      setSelectedDemand(prev => {
        if (prev && recentUnitDemands.some(d => d.id === prev.id)) {
          return recentUnitDemands.find(d => d.id === prev.id);
        }
        return prev;
      });
    }
  }, [recentUnitDemands]);

  // When selected institution changes
  const handleInstitutionChange = (e) => {
    const id = e.target.value;
    setSelectedInstId(id);
    const found = institutions.find(i => String(i.id) === String(id));
    setSelectedInst(found || null);
    if (found) {
      setVenue(found.complete_address || found.institution_name || '');
      const s1 = Number(found.strength_1st_year) || 0;
      const s2 = Number(found.strength_2nd_year) || 0;
      const s3 = Number(found.strength_3rd_year) || 0;
      setYear1(s1);
      setYear2(s2);
      setYear3(s3 > 0 ? s3 : 0);
      setTotalDemanded(s1 + s2 + (s3 > 0 ? s3 : 0));
      if (demandPrefix === 'FIRST' && found.first_demand_day) {
        setDemandDate(getNextDate(found.first_demand_day));
        setDemandTime(found.first_demand_time || '08:00');
      } else if (demandPrefix === 'SECOND' && found.second_demand_day) {
        setDemandDate(getNextDate(found.second_demand_day));
        setDemandTime(found.second_demand_time || '08:00');
      }
    }
  };

  const handlePrefixChange = (prefix) => {
    setDemandPrefix(prefix);
    if (selectedInst) {
      if (prefix === 'FIRST' && selectedInst.first_demand_day) {
        setDemandDate(getNextDate(selectedInst.first_demand_day));
        setDemandTime(selectedInst.first_demand_time || '08:00');
      } else if (prefix === 'SECOND' && selectedInst.second_demand_day) {
        setDemandDate(getNextDate(selectedInst.second_demand_day));
        setDemandTime(selectedInst.second_demand_time || '08:00');
      }
    }
  };

  // Preset Unit Venue default
  useEffect(() => {
    if (demandMode === 'UNIT_DIRECT' && !venue) {
      setVenue(user?.unit_name || '2 Delhi Arty Bty NCC Headquarters, Delhi Cantt');
      setPurpose('Combined Annual Training Camp (CATC) Direct Cadre');
    }
  }, [demandMode, user?.unit_name, venue]);

  // Calculations for Option 1 (Institution)
  const instS1 = Number(selectedInst?.strength_1st_year) || 0;
  const instS2 = Number(selectedInst?.strength_2nd_year) || 0;
  const instS3 = Number(selectedInst?.strength_3rd_year) || 0;
  const instTotalSanctioned = instS1 + instS2 + instS3;
  const instAnnualQuota = instTotalSanctioned * 25;

  const instConsumedQuota = (recentUnitDemands || [])
    .filter(d => String(d.institution_id) === String(selectedInstId))
    .reduce((sum, d) => sum + (Number(d.total_quantity || d.quantity) || 0), 0);
  const instRemainingQuota = Math.max(0, instAnnualQuota - instConsumedQuota);

  const q1 = parseInt(year1) || 0;
  const q2 = parseInt(year2) || 0;
  const q3 = parseInt(year3) || 0;
  const instTotalQty = q1 + q2 + q3;
  const instTotalAmount = (parseInt(totalDemanded) || instTotalQty) * 75;
  const instDemandTotalAmount = instTotalAmount;

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
    if (target > instTotalSanctioned) target = instTotalSanctioned;

    if (instTotalSanctioned === 0) {
      setYear1(0);
      setYear2(0);
      setYear3(0);
      return;
    }

    let y1 = Math.min(instS1, Math.round(target * (instS1 / instTotalSanctioned)));
    let y2 = Math.min(instS2, Math.round(target * (instS2 / instTotalSanctioned)));
    let y3 = instS3 > 0 ? Math.min(instS3, Math.round(target * (instS3 / instTotalSanctioned))) : 0;

    let diff = target - (y1 + y2 + y3);

    if (diff > 0) {
      while (diff > 0) {
        if (y1 < instS1) { y1++; diff--; }
        else if (y2 < instS2) { y2++; diff--; }
        else if (instS3 > 0 && y3 < instS3) { y3++; diff--; }
        else break;
      }
    } else if (diff < 0) {
      while (diff < 0) {
        if (instS3 > 0 && y3 > 0) { y3--; diff++; }
        else if (y2 > 0) { y2--; diff++; }
        else if (y1 > 0) { y1--; diff++; }
        else break;
      }
    }

    setYear1(y1);
    setYear2(y2);
    setYear3(instS3 > 0 ? y3 : 0);
  };

  const handleYearChange = (yearNum, val) => {
    let y1 = yearNum === 1 ? (parseInt(val) || 0) : (parseInt(year1) || 0);
    let y2 = yearNum === 2 ? (parseInt(val) || 0) : (parseInt(year2) || 0);
    let y3 = yearNum === 3 ? (parseInt(val) || 0) : (parseInt(year3) || 0);
    if (yearNum === 1) setYear1(val);
    if (yearNum === 2) setYear2(val);
    if (yearNum === 3) setYear3(val);
    setTotalDemanded(y1 + y2 + (instS3 > 0 ? y3 : 0));
  };

  const handleFetchFromVacancy = () => {
    setYear1(instS1);
    setYear2(instS2);
    setYear3(instS3 > 0 ? instS3 : 0);
    setTotalDemanded(instS1 + instS2 + (instS3 > 0 ? instS3 : 0));
  };

  const handleClear = () => {
    if (demandMode === 'INSTITUTION') {
      setYear1('');
      setYear2('');
      setYear3('');
      setTotalDemanded(0);
    } else {
      setTotalPackets('100');
      setCustomRate('60');
      setPurpose('');
    }
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Calculations for Option 2
  const effectiveRate = packetType === 'REGULAR' ? 75 : (parseFloat(customRate) || 0);
  const unitPacketCount = parseInt(totalPackets) || 0;
  const unitTotalAmount = unitPacketCount * effectiveRate;

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (demandMode === 'UNIT_DIRECT') {
        if (!unitPacketCount || unitPacketCount <= 0) {
          throw new Error('Please specify a positive total packet quantity.');
        }
        if (packetType === 'CUSTOMIZED' && (!effectiveRate || effectiveRate <= 0)) {
          throw new Error('Please specify a valid packet rate in ₹.');
        }
        if (!purpose.trim()) {
          throw new Error('Please specify training event / occasion purpose.');
        }

        const payload = {
          demand_type: 'UNIT_DIRECT',
          packet_type: packetType,
          custom_unit_rate: effectiveRate,
          total_packets: unitPacketCount,
          demand_date: demandDate,
          demand_time: demandTime,
          purpose: purpose.trim(),
          delivery_venue: venue.trim()
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
        if (!res.ok) throw new Error(data.error || 'Failed to submit unit demand');

        setSuccessMsg(`Demand ${data.demand_number} placed successfully! Packets: ${unitPacketCount} @ ₹${effectiveRate.toFixed(2)} (Total: ₹${unitTotalAmount.toLocaleString('en-IN')}).`);
        fetchRecentDemands();
      } else {
        // Institutional on-behalf
        if (!selectedInstId) {
          throw new Error('Please select an institution.');
        }
        if (instTotalQty <= 0) {
          throw new Error('Please enter cadet attendance strength.');
        }

        // Fetch packet item ID
        const catRes = await fetch('/api/catalog', { headers: { Authorization: `Bearer ${token}` } });
        const catalog = await catRes.json();
        const stdItem = Array.isArray(catalog) ? catalog.find(i => i.item_name === 'Standard Refreshment Packet') || catalog[0] : null;

        if (!stdItem) throw new Error('Refreshment item catalog unavailable.');

        const items = [];
        if (q1 > 0) items.push({ item_id: stdItem.id, year_group: '1st Year', quantity: q1 });
        if (q2 > 0) items.push({ item_id: stdItem.id, year_group: '2nd Year', quantity: q2 });
        if (q3 > 0) items.push({ item_id: stdItem.id, year_group: '3rd Year', quantity: q3 });

        const payload = {
          demand_type: 'INSTITUTION',
          institution_id: selectedInstId,
          demand_date: demandDate,
          demand_time: demandTime,
          purpose: `${demandPrefix} DEMAND - Institutional Parade on behalf by Unit HQ`,
          delivery_venue: venue.trim() || selectedInst?.complete_address,
          items
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
        if (!res.ok) throw new Error(data.error || 'Failed to place demand on behalf of institution');

        setSuccessMsg(`Institutional Demand ${data.demand_number} raised on behalf of ${selectedInst?.institution_name} and approved! Total: ${instTotalQty} Pkts (₹${instTotalAmount.toLocaleString('en-IN')}).`);
        fetchRecentDemands();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalJurisdictionPackets = recentUnitDemands.reduce((acc, d) => acc + (Number(d.total_quantity || d.quantity) || 0), 0);
  const totalJurisdictionCost = recentUnitDemands.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0);

  return (
    <div className="space-y-3 pb-4 flex flex-col min-h-[calc(100vh-6.5rem)]">

      {/* 4 Summary Cards - Ultra Compact Single Row Identical to ANO Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {/* Total Packets */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-2.5 sm:p-3 text-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-indigo-100 uppercase">TOTAL PACKETS</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{totalJurisdictionPackets.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-2 bg-white/20 rounded-lg">
            <Coffee className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase">TOTAL COST</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 mt-0.5 font-mono">
              ₹{totalJurisdictionCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase">TOTAL ENTRIES</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 mt-0.5">{recentUnitDemands.length}</div>
          </div>
          <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
            <History className="w-4 h-4" />
          </div>
        </div>

        {/* Unit Profile */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-black tracking-wider text-fuchsia-500 uppercase">PROFILE</div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
              <span>Jurisdiction: <strong className="text-slate-700">{institutions.length} Inst</strong></span>
            </div>
          </div>
          <div className="font-bold text-slate-800 text-xs truncate mt-0.5">{user?.unit_name || '2 DELHI ARTY BTY NCC'}</div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Table (Right) - Full Viewport Vertical Justification Identical to ANO Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 items-stretch flex-1">
        
        {/* LEFT COLUMN: COMPACT NEW DEMAND ENTRY FORM */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">NEW DEMAND ENTRY</h2>
            </div>

            {/* Demand Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                type="button"
                onClick={() => { setDemandMode('UNIT_DIRECT'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1 px-2 text-[10px] font-black rounded-md transition-all cursor-pointer ${demandMode === 'UNIT_DIRECT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                UNIT DIRECT
              </button>
              <button 
                type="button"
                onClick={() => { setDemandMode('INSTITUTION'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1 px-2 text-[10px] font-black rounded-md transition-all cursor-pointer ${demandMode === 'INSTITUTION' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                FOR INSTITUTE
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-2.5">
            <div className="flex-1 flex flex-col justify-between gap-2">
              {demandMode === 'UNIT_DIRECT' ? (
                <>
                  {/* Event / Occasion Purpose */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      TRAINING EVENT / OCCASION PURPOSE
                    </label>
                    <input 
                      type="text" 
                      required
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      placeholder="e.g. Combined Annual Training Camp (CATC) Direct Cadre"
                      className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Packet Type */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">PACKET TYPE</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setPacketType('CUSTOMIZED')}
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${packetType === 'CUSTOMIZED' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        CUSTOMIZED
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPacketType('REGULAR')}
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${packetType === 'REGULAR' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        REGULAR (₹75)
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
                        onChange={setDemandDate}
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
                          onChange={e => setDemandTime(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rate & Packets Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase">RATE PER PKT</label>
                        {packetType === 'REGULAR' ? (
                          <span className="text-[8px] font-bold text-slate-400">Locked</span>
                        ) : (
                          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Budget</span>
                        )}
                      </div>
                      {packetType === 'CUSTOMIZED' ? (
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="1" 
                            max="200"
                            required
                            value={customRate}
                            onChange={e => setCustomRate(e.target.value)}
                            className="w-full pl-5 pr-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <div className="py-1 text-xs font-black text-slate-700 text-center font-mono">₹75.00</div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase">TOTAL PACKETS</label>
                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Direct</span>
                      </div>
                      <input 
                        type="number" 
                        min="1" 
                        required
                        value={totalPackets}
                        onChange={e => setTotalPackets(e.target.value)}
                        className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Option 1: Institutional On-Behalf */}
                  <div className="relative" ref={instDropdownRef}>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>AFFILIATED INSTITUTION</span>
                      {selectedInst && <span className="text-[9px] font-bold text-indigo-600">PIN: {selectedInst.pin_code || '110003'}</span>}
                    </label>
                    <div className="relative group">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                      <input 
                        type="text" 
                        placeholder={selectedInst ? `${selectedInst.institution_name} (Click to change...)` : "Search institution..."}
                        value={instSearch}
                        onChange={(e) => {
                          setInstSearch(e.target.value);
                          if (!instDropdownOpen) setInstDropdownOpen(true);
                        }}
                        onFocus={() => setInstDropdownOpen(true)}
                        className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setInstDropdownOpen(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${instDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {instDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl divide-y divide-slate-100">
                        {filteredInstitutions.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">No institutions found</div>
                        ) : (
                          filteredInstitutions.map(inst => (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => selectInstitution(inst)}
                              className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-indigo-50/70 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">{inst.institution_name}</div>
                                <div className="text-[10px] text-slate-500">ANO: {inst.ano_cto_name || 'N/A'} • Vacancy: {(Number(inst.strength_1st_year)||0)+(Number(inst.strength_2nd_year)||0)+(Number(inst.strength_3rd_year)||0)}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Demand Prefix */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">DEMAND TYPE</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setDemandPrefix('FIRST')}
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${demandPrefix === 'FIRST' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        FIRST DEMAND
                      </button>
                      <button 
                        type="button"
                        onClick={() => setDemandPrefix('SECOND')}
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${demandPrefix === 'SECOND' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
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
                        onChange={setDemandDate}
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
                          onChange={e => setDemandTime(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quota Strip */}
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 grid grid-cols-3 gap-1 text-center">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Sanctioned</span>
                      <span className="text-xs font-black text-slate-800">
                        {(Number(selectedInst?.strength_1st_year) || 0) + (Number(selectedInst?.strength_2nd_year) || 0) + (Number(selectedInst?.strength_3rd_year) || 0)}
                      </span>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Auth Quota</span>
                      <span className="text-xs font-black text-slate-800">
                        {(((Number(selectedInst?.strength_1st_year) || 0) + (Number(selectedInst?.strength_2nd_year) || 0) + (Number(selectedInst?.strength_3rd_year) || 0)) * 25).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Demand Mode</span>
                      <span className="text-xs font-black text-indigo-600 font-mono">ON-BEHALF</span>
                    </div>
                  </div>

                  {/* Cadet Attendance */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">CADET ATTENDANCE</label>
                      <button
                        type="button"
                        onClick={() => {
                          const s1 = Number(selectedInst?.strength_1st_year) || 0;
                          const s2 = Number(selectedInst?.strength_2nd_year) || 0;
                          const s3 = Number(selectedInst?.strength_3rd_year) || 0;
                          setYear1(s1);
                          setYear2(s2);
                          setYear3(s3 > 0 ? s3 : 0);
                          setTotalDemanded(s1 + s2 + (s3 > 0 ? s3 : 0));
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Auto-fill quantities directly from sanctioned cadet vacancy"
                      >
                        Fill Vacancy
                      </button>
                    </div>
                    <div className={`grid ${Number(selectedInst?.strength_3rd_year || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[9px] font-black text-slate-500">1ST YR</label>
                          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {selectedInst?.strength_1st_year || 0}</span>
                        </div>
                        <input 
                          type="number" 
                          min="0" 
                          max={selectedInst?.strength_1st_year || 0}
                          value={year1}
                          onChange={(e) => {
                            const val = e.target.value;
                            setYear1(val);
                            setTotalDemanded((parseInt(val) || 0) + (parseInt(year2) || 0) + (parseInt(year3) || 0));
                          }}
                          className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[9px] font-black text-slate-500">2ND YR</label>
                          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {selectedInst?.strength_2nd_year || 0}</span>
                        </div>
                        <input 
                          type="number" 
                          min="0" 
                          max={selectedInst?.strength_2nd_year || 0}
                          value={year2}
                          onChange={(e) => {
                            const val = e.target.value;
                            setYear2(val);
                            setTotalDemanded((parseInt(year1) || 0) + (parseInt(val) || 0) + (parseInt(year3) || 0));
                          }}
                          className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {Number(selectedInst?.strength_3rd_year || 0) > 0 && (
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="text-[9px] font-black text-slate-500">3RD YR</label>
                            <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Vac: {selectedInst?.strength_3rd_year || 0}</span>
                          </div>
                          <input 
                            type="number" 
                            min="0" 
                            max={selectedInst?.strength_3rd_year || 0}
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
                </>
              )}

              {/* Live Demand Summary: Ultra Compact single-row matching ANO Console */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 rounded-lg p-2 border border-indigo-100/90 shadow-2xs">
                <div className="grid grid-cols-12 items-center gap-1.5">
                  {/* 1. TOTAL QTY */}
                  <div className="col-span-4">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                      TOTAL QTY
                    </label>
                    <div className="flex items-center gap-1">
                      {demandMode === 'UNIT_DIRECT' ? (
                        <input 
                          type="number" 
                          min="1" 
                          value={totalPackets}
                          onChange={(e) => setTotalPackets(e.target.value)}
                          className="w-14 px-1 py-0.5 bg-white border border-indigo-400 focus:border-indigo-600 rounded-md text-sm font-black text-indigo-700 text-center focus:outline-none"
                        />
                      ) : (
                        <span className="text-sm font-black text-indigo-700">{instTotalQty}</span>
                      )}
                      <span className="text-[10px] font-bold text-slate-500">Pkts</span>
                    </div>
                  </div>

                  {/* 2. TOTAL AMOUNT */}
                  <div className="col-span-4 border-l border-indigo-100 pl-1.5">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                      TOTAL AMOUNT
                    </label>
                    <div className="text-xs sm:text-sm font-black text-emerald-600 truncate font-mono">
                      ₹{(demandMode === 'UNIT_DIRECT' ? unitTotalAmount : instTotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* 3. PER PKT AMOUNT */}
                  <div className="col-span-4 border-l border-indigo-100 pl-1.5 text-right">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 truncate" title="Per Packet Amount">
                      PER PKT
                    </label>
                    <div className="text-xs font-black text-slate-800 font-mono">
                      ₹{(demandMode === 'UNIT_DIRECT' ? effectiveRate : 75).toFixed(2)}
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
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Enter complete address..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {errorMsg && <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg shrink-0">{errorMsg}</div>}
            {successMsg && <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded-lg shrink-0">{successMsg}</div>}

            {/* Buttons Row */}
            <div className="flex gap-2 pt-2 shrink-0">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-70 cursor-pointer"
              >
                {submitting ? 'PROCESSING...' : (demandMode === 'UNIT_DIRECT' ? 'PLACE UNIT DEMAND' : 'PLACE DEMAND')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setYear1('');
                  setYear2('');
                  setYear3('');
                  setTotalPackets('100');
                  setCustomRate('60');
                  setVenue('');
                  setPurpose('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                CLEAR
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: DEMAND HISTORY TABLE */}
        <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-full">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">DEMAND HISTORY</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 ml-1">
                {recentUnitDemands.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => fetchRecentDemands()} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDemands ? 'animate-spin' : ''}`} />
                SYNC
              </button>
              <button 
                type="button"
                onClick={() => window.print()} 
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 p-3 flex flex-col">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2 flex-1">
              <thead>
                <tr>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest">NO</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest">DATE & TIME</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest">BENEFICIARY / TYPE</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest">PURPOSE / VENUE</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest">STATUS</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">PKTS</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">RATE</th>
                  <th className="px-3 py-3 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">COST</th>
                  <th className="pr-4 pl-2 py-3 text-center font-black text-slate-400 text-[10px] uppercase tracking-widest">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentUnitDemands.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-28 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <span className="text-sm font-semibold text-slate-400">No demands found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentUnitDemands.map((d, idx) => (
                    <tr 
                      key={d.id} 
                      onClick={() => setSelectedDemand(d)}
                      className="group hover:bg-indigo-50/30 transition-colors cursor-pointer bg-slate-50/40 rounded-xl"
                    >
                      <td className="px-3 py-3 font-bold text-slate-500 text-xs rounded-l-xl">
                        #{idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-black text-slate-800 tracking-tight text-xs">{d.demand_date}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider">{d.demand_time || '08:00 AM'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800 uppercase text-xs truncate max-w-[180px]">
                          {d.demand_type === 'UNIT_DIRECT' ? (d.unit_code || d.unit_name || 'UNIT HQ') : (d.institution_name || 'INSTITUTION')}
                        </div>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold inline-block mt-0.5 ${
                          d.demand_type === 'UNIT_DIRECT' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {d.demand_type === 'UNIT_DIRECT' ? 'UNIT DIRECT' : 'INSTITUTE'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-700 text-xs truncate max-w-[200px]" title={d.purpose || d.delivery_location || d.venue}>
                          {d.purpose || d.delivery_location || d.venue || 'Training Event'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                          d.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          d.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          d.status === 'ACCEPTED' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                          d.status === 'FULFILLED' || d.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-slate-800 text-xs">
                        {d.total_quantity || d.quantity || 0}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600 text-xs">
                        ₹{d.custom_unit_rate ? Number(d.custom_unit_rate).toFixed(2) : (d.avg_unit_price ? Number(d.avg_unit_price).toFixed(2) : '75.00')}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-emerald-600 font-mono text-xs">
                        ₹{Number(d.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="pr-4 pl-2 py-3 text-center rounded-r-xl" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedDemand(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-indigo-600" />
                          <span>View</span>
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

      {/* Demand Detail Side Panel (Slides in on the Right Side of the Margin) */}
      <DemandDetailSidePanel
        demand={selectedDemand}
        onClose={() => setSelectedDemand(null)}
        token={token}
      />
    </div>
  );
}
