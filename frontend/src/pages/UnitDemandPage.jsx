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
  X
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

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Top Banner with Integrated Mode Selector */}
      <div className="glass-card p-3 sm:p-4 border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Refreshment Demand Console
          </h1>
        </div>

        {/* Integrated Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setDemandMode('UNIT_DIRECT');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-1.5 px-4 rounded-lg font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${demandMode === 'UNIT_DIRECT'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Demand for Unit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDemandMode('INSTITUTION');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-1.5 px-4 rounded-lg font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${demandMode === 'INSTITUTION'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <School className="w-4 h-4" />
            <span>Demand for Institution</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Jurisdiction:</span>
          <span className="px-3 py-1.5 rounded-xl bg-white text-slate-800 font-extrabold text-xs border border-slate-200 shadow-xs truncate max-w-[200px]">
            {user?.unit_name || '2 DELHI ARTY BTY NCC'}
          </span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center gap-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-semibold flex items-center gap-3 animate-shake shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content: Compact Form (Left 28%) & Expanded Table Data (Right 72%) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Main Form Container - Compact 28% */}
        <div className="w-full lg:w-[28%] shrink-0 glass-card p-4 border-slate-200 shadow-sm space-y-3.5">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* =============================================================== */}
            {/* OPTION 1 CONTENT: DEMAND FOR INSTITUTION ON THEIR BEHALF */}
            {/* =============================================================== */}
            {demandMode === 'INSTITUTION' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Searchable Institution Combobox */}
                <div className="relative" ref={instDropdownRef}>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-emerald-600" />
                      Select Affiliated Institution
                    </span>
                    {selectedInst && (
                      <span className="text-[10px] font-bold text-slate-400">
                        PIN: {selectedInst.pin_code || '110003'}
                      </span>
                    )}
                  </label>

                  {/* Search Input & Dropdown Trigger */}
                  <div className="relative group">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder={selectedInst ? `${selectedInst.institution_name} (Click to search...)` : "Search institution by name, ANO, or PIN..."}
                      value={instSearch}
                      onChange={(e) => {
                        setInstSearch(e.target.value);
                        if (!instDropdownOpen) setInstDropdownOpen(true);
                      }}
                      onFocus={() => setInstDropdownOpen(true)}
                      className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {instSearch && (
                        <button
                          type="button"
                          onClick={() => setInstSearch('')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setInstDropdownOpen(prev => !prev)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={instDropdownOpen ? "Close list" : "Open list"}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${instDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Active Selected Institution Pill */}
                  {selectedInst && !instSearch && (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-900 truncate">
                        {selectedInst.institution_name}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded ml-2 shrink-0">
                        ANO: {selectedInst.ano_cto_name || 'N/A'}
                      </span>
                    </div>
                  )}

                  {/* Dropdown Results Menu */}
                  {instDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl divide-y divide-slate-100 animate-fadeIn">
                      {filteredInstitutions.length === 0 ? (
                        <div className="p-4 text-center text-xs font-semibold text-slate-400">
                          No institutions found matching "{instSearch}"
                        </div>
                      ) : (
                        filteredInstitutions.map(inst => {
                          const isSelected = String(inst.id) === String(selectedInstId);
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => selectInstitution(inst)}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-emerald-50/70 transition-colors cursor-pointer ${
                                isSelected ? 'bg-emerald-50/90 font-bold' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                  {inst.institution_name}
                                  {isSelected && (
                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-2">
                                  <span>ANO: {inst.ano_cto_name || 'N/A'}</span>
                                  <span>•</span>
                                  <span>PIN: {inst.pin_code || '110003'}</span>
                                  <span>•</span>
                                  <span>Vacancy: {(Number(inst.strength_1st_year) || 0) + (Number(inst.strength_2nd_year) || 0) + (Number(inst.strength_3rd_year) || 0)}</span>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>



                {/* =============================================================== */}
                {/* COMMON FIELDS: DATE, TIME & VENUE */}
                {/* =============================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Delivery Date (DD/MM/YYYY)
                    </label>
                    <CustomDateInput
                      value={demandDate}
                      onChange={setDemandDate}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Delivery Time (12-Hour)
                    </label>
                    <input
                      type="time"
                      value={demandTime}
                      onChange={e => setDemandTime(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Delivery Location / Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="Enter exact battalion / institution delivery location"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs"
                  />
                </div>

                {/* Demand Type Toggle */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Demand Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDemandPrefix('FIRST')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${demandPrefix === 'FIRST'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      FIRST DEMAND
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemandPrefix('SECOND')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${demandPrefix === 'SECOND'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      SECOND DEMAND
                    </button>
                  </div>
                </div>

                {/* Cadet Attendance Steppers */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Cadet Attendance Strength
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-extrabold border border-slate-200">
                        <span>Total Auth: {(selectedInst?.strength_1st_year || 0) + (selectedInst?.strength_2nd_year || 0) + (selectedInst?.strength_3rd_year || 0)}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-semibold text-slate-500">1st: {selectedInst?.strength_1st_year || 0}</span>
                        <span className="font-semibold text-slate-500">2nd: {selectedInst?.strength_2nd_year || 0}</span>
                        {Number(selectedInst?.strength_3rd_year || 0) > 0 && (
                          <span className="font-semibold text-slate-500">3rd: {selectedInst?.strength_3rd_year}</span>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shadow-inner ${instTotalQty > 0 ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        Total Demanded: {instTotalQty}
                      </span>
                    </div>
                  </div>
                  <div className={`grid grid-cols-1 ${Number(selectedInst?.strength_3rd_year || 0) > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                        <span>1ST YEAR</span>
                        <span className="text-slate-500 font-mono">Max: {selectedInst?.strength_1st_year || 50}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={selectedInst?.strength_1st_year || 50}
                        value={year1}
                        onChange={e => setYear1(e.target.value)}
                        placeholder="0"
                        className="w-full text-lg font-black text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                        <span>2ND YEAR</span>
                        <span className="text-slate-500 font-mono">Max: {selectedInst?.strength_2nd_year || 50}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={selectedInst?.strength_2nd_year || 50}
                        value={year2}
                        onChange={e => setYear2(e.target.value)}
                        placeholder="0"
                        className="w-full text-lg font-black text-slate-900 focus:outline-none"
                      />
                    </div>

                    {Number(selectedInst?.strength_3rd_year || 0) > 0 && (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>3RD YEAR</span>
                          <span className="text-slate-500 font-mono">Max: {selectedInst?.strength_3rd_year || 0}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={selectedInst?.strength_3rd_year || 0}
                          value={year3}
                          onChange={e => setYear3(e.target.value)}
                          placeholder="0"
                          className="w-full text-lg font-black text-slate-900 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* OPTION 2 CONTENT: DEMAND FOR UNIT (DIRECT WITH CUSTOM RATE) */}
            {/* =============================================================== */}
            {demandMode === 'UNIT_DIRECT' && (
              <div className="space-y-6 animate-fadeIn">
                {/* =============================================================== */}
                {/* COMMON FIELDS: DATE, TIME & VENUE */}
                {/* =============================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Delivery Date (DD/MM/YYYY)
                    </label>
                    <CustomDateInput
                      value={demandDate}
                      onChange={setDemandDate}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Delivery Time (12-Hour)
                    </label>
                    <input
                      type="time"
                      value={demandTime}
                      onChange={e => setDemandTime(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Delivery Location / Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="Enter exact battalion / institution delivery location"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs"
                  />
                </div>

                {/* Packet Type Selection: Simple Clean Buttons */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Select Packet Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPacketType('CUSTOMIZED')}
                      className={`py-3 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${packetType === 'CUSTOMIZED'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Customized Packet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPacketType('REGULAR')}
                      className={`py-3 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${packetType === 'REGULAR'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Regular Packet (₹75)</span>
                    </button>
                  </div>
                </div>

                {/* Rate & Total Packets Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rate per packet */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                        Rate Per Packet (₹)
                      </label>
                      {packetType === 'REGULAR' && (
                        <span className="text-[11px] font-bold text-slate-400">Locked @ ₹75</span>
                      )}
                    </div>

                    {packetType === 'CUSTOMIZED' ? (
                      <div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-extrabold text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="200"
                            required
                            value={customRate}
                            onChange={e => setCustomRate(e.target.value)}
                            placeholder="e.g. 50 or 60"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-base focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
                          {['40', '45', '50', '55', '60', '65', '70'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCustomRate(p)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${customRate === p
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              ₹{p}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 rounded-xl bg-slate-50 text-slate-800 font-black text-lg border border-slate-200">
                        ₹75.00
                      </div>
                    )}
                  </div>

                  {/* Total Number of Packets */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Total No. of Packets
                      </label>
                      <span className="text-[11px] font-bold text-blue-600">Direct Delivery</span>
                    </div>

                    <div>
                      <input
                        type="number"
                        min="1"
                        required
                        value={totalPackets}
                        onChange={e => setTotalPackets(e.target.value)}
                        placeholder="e.g. 100 or 250"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-base focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Add:</span>
                        {['50', '100', '150', '200', '300', '500'].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setTotalPackets(cnt)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${totalPackets === cnt
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purpose / Occasion */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Training Event / Occasion Purpose
                  </label>
                  <input
                    type="text"
                    required
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Annual Training Camp (ATC), Cadre Shooting, Special Parade..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs"
                  />
                </div>
              </div>
            )}



            {/* =============================================================== */}
            {/* LIVE SUMMARY TOTAL BAR */}
            {/* =============================================================== */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Total Refreshment Requisition
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {demandMode === 'UNIT_DIRECT' ? unitPacketCount : instTotalQty}
                  </span>
                  <span className="text-xs font-bold text-slate-300">Packets</span>
                  <span className="text-slate-500 mx-1">•</span>
                  <span className="text-xs font-semibold text-slate-300">
                    @ ₹{(demandMode === 'UNIT_DIRECT' ? effectiveRate : 75).toFixed(2)}/pkt
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block">
                  Total Amount
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  ₹{(demandMode === 'UNIT_DIRECT' ? unitTotalAmount : instTotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-3.5 px-6 rounded-xl font-extrabold text-white text-sm shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${demandMode === 'UNIT_DIRECT'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600'
                  }`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Processing Demand Submission...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {demandMode === 'UNIT_DIRECT' ? 'PLACE UNIT DIRECT DEMAND' : 'PLACE INSTITUTION DEMAND'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setYear1('');
                  setYear2('');
                  setYear3('');
                  setTotalPackets('100');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="py-3.5 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>CLEAR</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent Demands Placed in this Jurisdiction (Right 72% Expanded Table) */}
        <div className="w-full lg:w-[72%] flex-1 min-w-0 glass-card p-4 sm:p-5 border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Recent Demands Placed in this Jurisdiction
              </h3>
              <p className="text-xs text-slate-500">Live feed of demands created directly by Unit or on behalf of institutions. Click any row to track on right margin.</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{recentUnitDemands.length} Records</span>
          </div>

          {loadingDemands ? (
            <div className="py-6 text-center text-xs text-slate-400 font-semibold">Loading recent records...</div>
          ) : recentUnitDemands.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">No recent demands found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Demand No</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Beneficiary</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3 text-right">Packets</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentUnitDemands.map(d => (
                    <tr 
                      key={d.id} 
                      onClick={() => setSelectedDemand(d)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-bold text-blue-600 group-hover:text-indigo-600 font-mono">
                        {d.demand_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          d.demand_type === 'UNIT_DIRECT' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {d.demand_type === 'UNIT_DIRECT' ? 'UNIT DIRECT' : 'INSTITUTE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[240px]">
                        {d.demand_type === 'UNIT_DIRECT'
                          ? (d.unit_code || d.unit_name || 'Unit HQ')
                          : (d.institution_name || 'Institution')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {d.demand_date} • {d.demand_time || '08:00 AM'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {d.total_quantity || d.quantity || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{d.custom_unit_rate ? Number(d.custom_unit_rate).toFixed(2) : (d.avg_unit_price ? Number(d.avg_unit_price).toFixed(2) : '75.00')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 font-mono">
                        ₹{Number(d.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          d.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          d.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedDemand(d)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                          title="View Details & Live Tracking"
                        >
                          <Eye className="w-3 h-3 text-indigo-600" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
