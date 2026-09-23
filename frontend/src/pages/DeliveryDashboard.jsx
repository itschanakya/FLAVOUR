import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Truck, MapPin, Navigation, Phone, MessageCircle, Calendar, Clock,
  CheckCircle2, XCircle, AlertTriangle, Package, Camera, Upload,
  FileText, FileCheck, DollarSign, ChevronDown, ChevronUp, RefreshCw,
  Search, ShieldCheck, UserCheck, Check, ExternalLink, X, Send,
  ClipboardList
} from 'lucide-react';

export default function DeliveryDashboard() {
  const { token, user } = useAuth();
  const { events } = useSSE();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [demands, setDemands] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // Default to ALL stops so driver sees their full manifest
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDemands, setExpandedDemands] = useState({});
  const [showSummary, setShowSummary] = useState(() => searchParams.get('tab') === 'summary' || searchParams.get('summary') === 'true');


  useEffect(() => {
    if (searchParams.get('tab') === 'summary' || searchParams.get('summary') === 'true') {
      setShowSummary(true);
    }
  }, [searchParams]);

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDemandForReject, setSelectedDemandForReject] = useState(null);
  const [rejectionPreset, setRejectionPreset] = useState('School Closed / Sunday / Holiday');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Bill Collection Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedDemandForBill, setSelectedDemandForBill] = useState(null);
  const [collectionStatus, setCollectionStatus] = useState('SIGNED_CHALLAN');
  const [collectionRemarks, setCollectionRemarks] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingBill, setSubmittingBill] = useState(false);

  // Receipt Upload State
  const [uploadingReceiptId, setUploadingReceiptId] = useState(null);

  // Fetch driver assigned demands and vehicle profile
  const fetchDriverDemands = useCallback(async () => {
    if (!token) return;
    try {
      const [demRes, profRes] = await Promise.all([
        fetch('/api/delivery/driver/demands', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/delivery/driver/profile', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (demRes.ok) {
        const data = await demRes.json();
        setDemands(Array.isArray(data) ? data : []);
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        setDriverProfile(profData);
      }
    } catch (err) {
      console.error('Error fetching driver demands:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDriverDemands();
  }, [fetchDriverDemands]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.timestamp) {
      fetchDriverDemands();
    }
  }, [events?.DEMAND_UPDATED, events?.timestamp, fetchDriverDemands]);

  useEffect(() => {
    const handleSync = () => fetchDriverDemands();
    window.addEventListener('demand-status-changed', handleSync);
    return () => window.removeEventListener('demand-status-changed', handleSync);
  }, [fetchDriverDemands]);

  // Toggle Items Expand
  const toggleExpand = (id) => {
    setExpandedDemands(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Format Demand Date (DD/MM/YYYY) and Time (12-Hour)
  const formatDemandDateTime = (dateStr, timeStr) => {
    if (!dateStr) return { formattedDate: 'N/A', formattedTime: '' };
    let formattedDate = dateStr;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (e) {
      formattedDate = dateStr;
    }

    let formattedTime = timeStr || '';
    if (formattedTime) {
      try {
        const [h, m] = formattedTime.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        formattedTime = `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
      } catch (e) {
        formattedTime = timeStr;
      }
    }

    return { formattedDate, formattedTime };
  };

  // Google Maps URL
  const getGoogleMapsUrl = (dem) => {
    if (dem.google_location && dem.google_location.startsWith('http')) {
      return dem.google_location;
    }
    const query = `${dem.institution_name}, ${dem.complete_address || ''}, PIN ${dem.pin_code || ''}, India`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // WhatsApp ANO Direct Alert
  const handleWhatsAppAno = (dem) => {
    let rawPhone = (dem.ano_cto_contact || '').replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;

    const officer = dem.ano_cto_name ? `${dem.ano_cto_name} Sir/Ma'am` : 'ANO/CTO Officer';
    const text = `Jai Hind ${officer},\n\nI am ${user?.name || 'your delivery partner'} delivering NCC Refreshments for *${dem.institution_name}* (Demand #${dem.demand_number}, *${dem.total_quantity || 0} Packets*).\n\nMy Vehicle: *${user?.vehicle_no || 'Standard Vehicle'}*\nMobile: *${user?.phone || ''}*\n\nPlease confirm availability for reception & handover.`;
    const url = rawPhone
      ? `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Update Status directly (OUT_FOR_DELIVERY, ARRIVED, DELIVERED)
  const handleUpdateStatus = async (demandId, newStatus) => {
    let start_odometer = null;
    let delivery_odometer = null;

    if (newStatus === 'OUT_FOR_DELIVERY') {
      const reading = window.prompt("Please enter the Starting Odometer (Speedometer) reading in km before leaving:");
      if (reading === null) return; // User cancelled
      if (!reading.trim() || isNaN(reading)) {
        alert("Valid odometer reading is required to start the delivery.");
        return;
      }
      start_odometer = reading.trim();
    } else if (newStatus === 'DELIVERED') {
      const reading = window.prompt("Please enter the Ending Odometer (Speedometer) reading in km for this delivery:");
      if (reading === null) return; // User cancelled
      if (!reading.trim() || isNaN(reading)) {
        alert("Valid odometer reading is required to complete the delivery.");
        return;
      }
      delivery_odometer = reading.trim();
    }

    try {
      const payload = {
        demandId,
        status: newStatus
      };
      if (start_odometer) payload.start_odometer = start_odometer;
      if (delivery_odometer) payload.delivery_odometer = delivery_odometer;

      const res = await fetch('/api/delivery/driver/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Optimistic update
      setDemands(prev => prev.map(d => {
        if (d.id === demandId) {
          return { ...d, delivery_status: newStatus };
        }
        return d;
      }));
      fetchDriverDemands();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Rejection Submit
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedDemandForReject) return;
    setSubmittingReject(true);

    const fullReason = rejectionNotes.trim()
      ? `${rejectionPreset}: ${rejectionNotes.trim()}`
      : rejectionPreset;

    try {
      const res = await fetch('/api/delivery/driver/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          demandId: selectedDemandForReject.id,
          status: 'REJECTED',
          rejectionReason: fullReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark rejection');

      setRejectModalOpen(false);
      setSelectedDemandForReject(null);
      setRejectionNotes('');
      fetchDriverDemands();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReject(false);
    }
  };

  // Upload Physical Receipt File or Camera Photo
  const handleUploadReceipt = async (demandId, file) => {
    if (!file) return;
    setUploadingReceiptId(demandId);

    const formData = new FormData();
    formData.append('demandId', demandId);
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/delivery/driver/upload-receipt', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload receipt');

      setDemands(prev => prev.map(d => {
        if (d.id === demandId) {
          return { ...d, delivery_receipt_url: data.receiptUrl };
        }
        return d;
      }));
      alert('✅ Signed delivery receipt uploaded successfully!');
      fetchDriverDemands();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingReceiptId(null);
    }
  };

  // Submit Bill Collection Note
  const handleSaveBillCollection = async (e) => {
    e.preventDefault();
    if (!selectedDemandForBill) return;
    setSubmittingBill(true);

    try {
      const res = await fetch('/api/delivery/driver/bill-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          demandId: selectedDemandForBill.id,
          collectionStatus,
          remarks: collectionRemarks.trim(),
          paymentRef: paymentRef.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bill collection note');

      setBillModalOpen(false);
      setSelectedDemandForBill(null);
      setCollectionRemarks('');
      setPaymentRef('');
      alert('✅ Bill collection note recorded and sent to HQ Admin!');
      fetchDriverDemands();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingBill(false);
    }
  };

  // Metrics Calculations
  const totalAssignedPackets = demands.reduce((acc, d) => acc + (Number(d.total_quantity) || 0), 0);
  const deliveredPackets = demands
    .filter(d => d.delivery_status === 'DELIVERED')
    .reduce((acc, d) => acc + (Number(d.total_quantity) || 0), 0);
  const remainingPackets = totalAssignedPackets - deliveredPackets;
  const totalStops = demands.length;
  const completedStops = demands.filter(d => d.delivery_status === 'DELIVERED').length;
  const progressPercent = totalAssignedPackets > 0 
    ? Math.round((deliveredPackets / totalAssignedPackets) * 100) 
    : 0;

  // Vehicle Load Capacity & Travel Logic (e.g. Maruti Eeco = 750 Pkts / 80 km)
  const oneLoadCapacity = driverProfile?.load_capacity_packets || user?.load_capacity_packets || 750;
  const maxTravelKm = driverProfile?.max_travel_km || user?.max_travel_km || 80;
  const vehicleModel = driverProfile?.vehicle_model || user?.vehicle_model || 'Maruti Eeco Cargo Van';
  const vehicleReg = driverProfile?.vehicle_no || user?.vehicle_no || 'DL-01-AB-1234';
  const isOverloaded = totalAssignedPackets > oneLoadCapacity;
  const remainingCapacity = Math.max(0, oneLoadCapacity - totalAssignedPackets);
  const capacityPercent = Math.min(100, Math.round((totalAssignedPackets / oneLoadCapacity) * 100));

  // Filtered Demands
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      const st = d.delivery_status || 'PENDING';
      if (filterStatus === 'PENDING' && st !== 'PENDING') return false;
      if (filterStatus === 'TRANSIT' && st !== 'OUT_FOR_DELIVERY') return false;
      if (filterStatus === 'ARRIVED' && st !== 'ARRIVED') return false;
      if (filterStatus === 'DELIVERED' && st !== 'DELIVERED') return false;
      if (filterStatus === 'REJECTED' && st !== 'REJECTED') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const instMatch = (d.institution_name || '').toLowerCase().includes(term);
        const pinMatch = (d.pin_code || '').toLowerCase().includes(term);
        const demNumMatch = (d.demand_number || '').toLowerCase().includes(term);
        if (!instMatch && !pinMatch && !demNumMatch) return false;
      }
      return true;
    });
  }, [demands, filterStatus, searchTerm]);

  return (
    <div className="space-y-5 pb-16 max-w-4xl mx-auto">
      {/* DRIVER HERO HEADER (Mobile & Desktop Optimized) */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-3 sm:p-5 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Driver Active On Duty
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-mono">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white mt-1">
                {user?.name || 'Delivery Partner'}
              </h1>
              
              {/* VEHICLE CAPACITY & SPECS OPTIONS */}
              <div className="mt-2 w-full sm:w-auto relative inline-block">
                <select
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-[10px] sm:text-xs font-bold text-white pl-3 pr-8 py-1.5 rounded-lg sm:rounded-xl outline-none focus:ring-2 focus:ring-white/30 appearance-none cursor-pointer shadow-xs transition-colors"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1em'
                  }}
                  onChange={(e) => {
                    if (e.target.value === 'account') {
                      navigate('/settings?tab=driver-account');
                    } else {
                      // Revert selection if user just wanted to view info
                      e.target.value = 'vehicle';
                    }
                  }}
                  defaultValue="vehicle"
                >
                  <option value="vehicle" className="text-slate-800 bg-white font-bold">🚚 {vehicleModel} ({vehicleReg})</option>
                  <option value="capacity" className="text-slate-800 bg-white font-bold">📦 One Load Capacity: {oneLoadCapacity} Pkts/Day</option>
                  <option value="travel" className="text-slate-800 bg-white font-bold">📍 Max Travel: {maxTravelKm} km/Day</option>
                  <option value="account" className="text-blue-700 bg-blue-50 font-black">⚙️ Account & Vehicle Settings ↗</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchDriverDemands}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl border border-white/10 flex items-center gap-1.5 self-start transition-all shrink-0"
            >
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Refresh <span className="hidden sm:inline">Stops</span>
            </button>
          </div>

          {/* VEHICLE LOAD CAPACITY GAUGE */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-white/10 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1 sm:gap-1.5 truncate pr-2">
                <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">Vehicle Load Utilization:</span>
                <span className="sm:hidden">Load:</span> <strong className="text-white">{totalAssignedPackets}</strong> / <strong>{oneLoadCapacity} Pkts</strong> <span className="opacity-75">({capacityPercent}%)</span>
              </span>
              <span className={`font-black text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded sm:rounded-md shrink-0 ${
                isOverloaded 
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {isOverloaded 
                  ? `⚠️ +${totalAssignedPackets - oneLoadCapacity} pkts` 
                  : `${remainingCapacity} pkts left`}
              </span>
            </div>

            <div className="w-full h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isOverloaded ? 'bg-rose-500' : capacityPercent > 85 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, capacityPercent)}%` }}
              />
            </div>

            {isOverloaded && (
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-rose-950/70 border border-rose-500/40 text-[9px] sm:text-[11px] text-rose-200 font-bold flex items-start sm:items-center gap-1.5 sm:gap-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-tight">
                  Load Warning: Current assigned route ({totalAssignedPackets} Packets) exceeds your vehicle's safe capacity limit of {oneLoadCapacity} Packets ({Math.round(oneLoadCapacity / 50)} crates).
                </span>
              </div>
            )}
          </div>

          {/* Route Delivery Progress Meter */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-white/10 space-y-2 sm:space-y-2.5">
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
              <span className="font-extrabold text-slate-200 truncate pr-2">
                <span className="hidden sm:inline">Route Drop-off Progress:</span>
                <span className="sm:hidden">Progress:</span> <strong className="text-amber-300">{deliveredPackets}</strong> / <strong>{totalAssignedPackets} Pkts</strong> <span className="hidden sm:inline">Delivered</span>
              </span>
              <span className="font-black text-emerald-400 shrink-0">
                {progressPercent}% <span className="hidden sm:inline">Completed</span>
              </span>
            </div>

            <div className="w-full h-2 sm:h-3 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-1 sm:gap-2 pt-1.5 sm:pt-2 border-t border-white/10 text-center">
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate">Cap</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-amber-300">{oneLoadCapacity}</div>
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate">Load</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-white">{totalAssignedPackets}</div>
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate">Done</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-emerald-300">{deliveredPackets}</div>
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate">Left</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-cyan-300">{remainingPackets}</div>
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate">Stops</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-indigo-300">{completedStops}/{totalStops}</div>
              </div>
            </div>

            {/* Delivery Summary Toggle Bar */}
            <div className="pt-2 sm:pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowSummary(prev => !prev)}
                className={`px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95 border ${
                  showSummary
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/20'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
              >
                <ClipboardList className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{showSummary ? 'Hide Summary' : 'Summary'}</span>
                {showSummary ? <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>

              <Link
                to="/driver-summary"
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition-all"
              >
                <span className="hidden sm:inline">Full Summary Page</span>
                <span className="sm:hidden">Full Page</span>
                <ExternalLink className="w-3 h-3 text-cyan-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY OF DRIVER DELIVERY (Only visible ON CLICK of Delivery Summary) */}
      {showSummary && (
        <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm overflow-hidden transition-all">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
                  SUMMARY OF DRIVER DELIVERY
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  Route Manifest Overview: Institute, Unit, Packet Allocations, Date & Time
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {(() => {
                const activeStop = demands.find(d => d.delivery_status === 'OUT_FOR_DELIVERY') || 
                                   demands.find(d => d.delivery_status === 'ARRIVED') ||
                                   demands.find(d => d.delivery_status === 'PENDING');
                if (!activeStop) return null;
                return (
                  <a
                    href={getGoogleMapsUrl(activeStop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                    title={`Start GPS Navigation to next stop: ${activeStop.institution_name}`}
                  >
                    <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Navigate Next Stop</span>
                  </a>
                );
              })()}
              <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-black text-amber-300">
                {demands.length} Stops
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs font-black text-emerald-300">
                {totalAssignedPackets} Total Packets
              </span>
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all ml-1"
                title="Hide Delivery Summary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Manifest Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">INSTITUTE</th>
                <th className="py-3 px-4">UNIT</th>
                <th className="py-3 px-4 text-center">NO OF PACKETS</th>
                <th className="py-3 px-4">DATE AND TIME</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">NAVIGATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demands.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                    No delivery stops assigned to driver yet.
                  </td>
                </tr>
              ) : (
                demands.map((dem, idx) => {
                  const { formattedDate, formattedTime } = formatDemandDateTime(dem.demand_date, dem.demand_time);
                  const isDelivered = dem.delivery_status === 'DELIVERED';
                  const isArrived = dem.delivery_status === 'ARRIVED';
                  const isTransit = dem.delivery_status === 'OUT_FOR_DELIVERY';
                  const isRejected = dem.delivery_status === 'REJECTED';
                  const mapsUrl = getGoogleMapsUrl(dem);

                  return (
                    <tr 
                      key={dem.id}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isDelivered ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-xs uppercase">
                          {dem.institution_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>PIN: {dem.pin_code || 'N/A'}</span>
                          <span>•</span>
                          <span>Ref: #{dem.demand_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                          {dem.unit_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-xl bg-slate-900 text-amber-300 font-black text-xs shadow-2xs">
                          {dem.total_quantity || 0} Pkts
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-black text-slate-800 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        {formattedTime && (
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formattedTime}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isDelivered ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                            ✓ DELIVERED
                          </span>
                        ) : isArrived ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[10px] animate-pulse">
                            📍 AT GATE
                          </span>
                        ) : isTransit ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[10px]">
                            🚚 IN TRANSIT
                          </span>
                        ) : isRejected ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                            ❌ FAILED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px]">
                            📦 PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xs transition-all active:scale-95"
                          title={`Open Google Maps GPS Navigation to ${dem.institution_name}`}
                        >
                          <Navigation className="w-3.5 h-3.5 text-cyan-200" />
                          <span>Navigate</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {demands.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-xs text-slate-800">
                  <td colSpan="3" className="py-3 px-4 text-right uppercase text-[11px] text-slate-500">
                    Total Load Manifest:
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-indigo-700 font-black text-sm">
                      {totalAssignedPackets.toLocaleString()} Pkts
                    </span>
                  </td>
                  <td colSpan="3" className="py-3 px-4 text-slate-500 text-[11px]">
                    Across {demands.length} Delivery Stops
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search school name, PIN code, or demand ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            📋 All Stops ({demands.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
            }`}
          >
            📦 Warehouse ({demands.filter(d => !['OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'REJECTED'].includes(d.delivery_status)).length})
          </button>
          <button
            onClick={() => setFilterStatus('TRANSIT')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'TRANSIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
          >
            🚚 In Transit ({demands.filter(d => d.delivery_status === 'OUT_FOR_DELIVERY').length})
          </button>
          <button
            onClick={() => setFilterStatus('ARRIVED')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'ARRIVED'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
            }`}
          >
            📍 At Gate ({demands.filter(d => d.delivery_status === 'ARRIVED').length})
          </button>
          <button
            onClick={() => setFilterStatus('DELIVERED')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'DELIVERED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            ✅ Delivered ({demands.filter(d => d.delivery_status === 'DELIVERED').length})
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
            }`}
          >
            ❌ Failed / Incomplete ({demands.filter(d => d.delivery_status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* ASSIGNED STOPS LIST */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 font-bold text-sm">
          Loading assigned delivery stops...
        </div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-2">
          <Truck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-900">No Delivery Stops in this Category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus === 'ALL'
              ? 'You do not have any active refreshment demands assigned to your route yet.'
              : 'Try switching filters to view all stops on your route.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDemands.map((dem, idx) => {
            const isDelivered = dem.delivery_status === 'DELIVERED';
            const isArrived = dem.delivery_status === 'ARRIVED';
            const isTransit = dem.delivery_status === 'OUT_FOR_DELIVERY';
            const isRejected = dem.delivery_status === 'REJECTED';
            const mapsUrl = getGoogleMapsUrl(dem);
            const isExpanded = !!expandedDemands[dem.id];

            return (
              <div
                key={dem.id}
                className={`bg-white rounded-3xl border-2 transition-all shadow-xs overflow-hidden ${
                  isDelivered
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : isRejected
                    ? 'border-rose-300 bg-rose-50/10'
                    : isArrived
                    ? 'border-purple-300 ring-2 ring-purple-100'
                    : isTransit
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Status Banner */}
                <div className={`px-4 py-2 flex items-center justify-between text-xs font-black ${
                  isDelivered
                    ? 'bg-emerald-500 text-white'
                    : isRejected
                    ? 'bg-rose-500 text-white'
                    : isArrived
                    ? 'bg-purple-600 text-white animate-pulse'
                    : isTransit
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span>
                      {isDelivered
                        ? '✅ HANDED OVER & DELIVERED'
                        : isRejected
                        ? '❌ DELIVERY FAILED / REJECTED'
                        : isArrived
                        ? '📍 ARRIVED AT INSTITUTION GATE'
                        : isTransit
                        ? '🚚 IN TRANSIT - EN ROUTE'
                        : '📦 READY AT SUPPLY DEPOT'}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] opacity-90">
                    #{dem.demand_number}
                  </span>
                </div>

                {/* Clickable Summary Header */}
                <div 
                  className="p-4 md:p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(dem.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">
                        {dem.institution_name}
                      </h2>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        {dem.unit_name} {dem.ncc_group ? `• ${dem.ncc_group}` : ''}
                      </p>
                    </div>

                    {/* Total Packets Badge */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-3 py-1.5 text-center flex-shrink-0 shadow-sm">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block">
                        To Deliver
                      </span>
                      <span className="text-base font-black text-indigo-950">
                        {dem.total_quantity || 0} Pkts
                      </span>
                    </div>
                  </div>

                  {/* Quick Summary Row: PIN, Date, Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <span className="inline-flex items-center gap-1 font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-sm">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" /> PIN {dem.pin_code || 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 flex-wrap bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Date: <strong className="text-slate-800">{formatDemandDateTime(dem.demand_date, dem.demand_time).formattedDate}</strong></span>
                      {dem.demand_time && (
                        <>
                          <span className="text-slate-300">•</span>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Time: <strong className="text-slate-800">{formatDemandDateTime(dem.demand_date, dem.demand_time).formattedTime}</strong></span>
                        </>
                      )}
                    </span>
                  </div>
                  
                  {/* Expand Icon Hint */}
                  <div className="w-full mt-2 -mb-2 flex justify-center text-slate-300">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* EXPANDABLE FULL DETAILS */}
                {isExpanded && (
                  <div className="p-3 md:p-4 pt-3 border-t border-slate-100 bg-slate-50/30 space-y-2.5">
                    {/* Destination Full Address & GPS */}
                    <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm space-y-2">
                      <p className="text-[11px] text-slate-700 font-medium leading-tight flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{dem.complete_address || 'Address registered at NCC Unit headquarters.'}</span>
                      </p>

                      {/* BIG GOOGLE MAPS NAVIGATION BUTTON (Crucial for Drivers!) */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                        <span>OPEN GOOGLE MAPS GPS NAVIGATION</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                      </a>
                    </div>

                    {/* ANO Contact & Actions */}
                    <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wide block leading-none mb-1">
                          Institution Officer / ANO Contact
                        </span>
                        <span className="font-black text-slate-900 text-xs">
                          {dem.ano_cto_name || 'Designated ANO Officer'}
                        </span>
                        {dem.ano_cto_contact && (
                          <span className="text-[10px] text-emerald-800 font-bold ml-2">
                            (Ph: {dem.ano_cto_contact})
                          </span>
                        )}
                      </div>

                      {/* Direct Call & WhatsApp Buttons */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                        {dem.ano_cto_contact && (
                          <a
                            href={`tel:${dem.ano_cto_contact}`}
                            className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppAno(dem)}
                          className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Item Breakdown Accordion (Nested) */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-black text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-indigo-600" />
                          Refreshment Breakdown ({dem.items?.length || 0} items)
                        </span>
                      </div>
                      <div className="p-2.5 divide-y divide-slate-100 space-y-1.5">
                        {dem.items?.map((it, iIdx) => (
                          <div key={iIdx} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">{it.item_name} <span className="text-[9px] text-slate-400">({it.year_group})</span></span>
                            <span className="font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {it.quantity} {it.unit_of_measure}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rejection Reason Notice if status was rejected */}
                    {dem.delivery_rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex flex-col gap-1">
                        <div className="font-black flex items-center gap-1 text-rose-700">
                          <AlertTriangle className="w-3 h-3" /> Delivery Failed Reason:
                        </div>
                        <p className="font-semibold italic leading-tight">{dem.delivery_rejection_reason}</p>
                      </div>
                    )}

                    {/* Bill Collection Notes if recorded */}
                    {dem.bill_collection_notes && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex flex-col gap-1">
                        <div className="font-black flex items-center gap-1 text-amber-800">
                          <DollarSign className="w-3 h-3" /> Bill Collection Recorded:
                        </div>
                        <p className="font-semibold leading-tight">{dem.bill_collection_notes}</p>
                      </div>
                    )}

                    {/* Signed Delivery Receipt Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                        {dem.delivery_receipt_url ? (
                          <a
                            href={dem.delivery_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>View Signed Receipt</span>
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">
                            Receipt: Not yet uploaded
                          </span>
                        )}
                      </div>

                      {/* Camera Photo / Upload Signed Receipt Button */}
                      <label className={`w-full sm:w-auto cursor-pointer px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        uploadingReceiptId === dem.id
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-white active:scale-95'
                      }`}>
                        <Camera className="w-3 h-3 text-amber-400" />
                        <span>{dem.delivery_receipt_url ? 'Re-Upload Receipt' : 'Upload Receipt'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleUploadReceipt(dem.id, e.target.files[0])}
                          disabled={uploadingReceiptId === dem.id}
                        />
                      </label>
                    </div>

                    {/* DRIVER STAGE CONTROLS (Delivered, Arrived, Transit, Reject, Bill Drop) */}
                    <div className="pt-2.5 border-t border-slate-200 space-y-1.5 mt-2">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        Driver Actions:
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {/* Step 1: Out for Delivery */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(dem.id, 'OUT_FOR_DELIVERY')}
                          className={`py-1.5 px-2 rounded-lg font-black text-[10px] text-center transition-all border ${
                            isTransit
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          🚚 In Transit
                        </button>

                        {/* Step 2: Arrived at Gate */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(dem.id, 'ARRIVED')}
                          className={`py-1.5 px-2 rounded-lg font-black text-[10px] text-center transition-all border ${
                            isArrived
                              ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          📍 At Gate
                        </button>

                        {/* Step 3: Delivered */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(dem.id, 'DELIVERED')}
                          className={`py-1.5 px-2 rounded-lg font-black text-[10px] text-center transition-all border ${
                            isDelivered
                              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 shadow-sm'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          ✅ Delivered
                        </button>

                        {/* Step 4: Reject / Failed Delivery */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDemandForReject(dem);
                            setRejectModalOpen(true);
                          }}
                          className={`py-1.5 px-2 rounded-lg font-black text-[10px] text-center transition-all border ${
                            isRejected
                              ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200 shadow-sm'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          ❌ Failed
                        </button>
                      </div>

                      {/* Bill Collection Drop Message Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDemandForBill(dem);
                          setBillModalOpen(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98 mt-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Drop Bill Collection Note / Signed Challan Status</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Mark Delivery Incomplete / Rejected */}
      {rejectModalOpen && selectedDemandForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Mark Delivery Failed / Rejected</h3>
                  <p className="text-xs text-slate-500">{selectedDemandForReject.institution_name}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Select Reason for Non-Delivery:
                </label>
                <select
                  value={rejectionPreset}
                  onChange={(e) => setRejectionPreset(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="School Closed / Sunday / Holiday">School Closed / Sunday / Holiday</option>
                  <option value="ANO / Designated Staff Unavailable">ANO / Designated Staff Unavailable</option>
                  <option value="Gate Security Denied Entry">Gate Security Denied Entry</option>
                  <option value="Packet Count Discrepancy / Rejected by School">Packet Count Discrepancy / Rejected by School</option>
                  <option value="Road Block / Heavy Rain / Vehicle Issue">Road Block / Heavy Rain / Vehicle Issue</option>
                  <option value="Order Rescheduled by Institution">Order Rescheduled by Institution</option>
                  <option value="Other Issue">Other Reason (Type Below)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Additional Notes / Remarks:
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Called ANO Sir at 9:30 AM, informed they will collect tomorrow."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submittingReject ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Drop Bill Collection Note */}
      {billModalOpen && selectedDemandForBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Bill & Challan Collection Note</h3>
                  <p className="text-xs text-slate-500">{selectedDemandForBill.institution_name}</p>
                </div>
              </div>
              <button
                onClick={() => setBillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Collection Status:
                </label>
                <select
                  value={collectionStatus}
                  onChange={(e) => setCollectionStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="SIGNED_CHALLAN">Signed Delivery Challan Collected</option>
                  <option value="BILL_SIGNED">Bill Signed & Stamped by ANO / Principal</option>
                  <option value="CHEQUE_COLLECTED">Payment Cheque Collected</option>
                  <option value="CASH_COLLECTED">Payment Cash Collected</option>
                  <option value="BILL_DROPPED">Bill Dropped at Office - Payment Awaited</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Cheque No. / Payment Ref (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #459201 or Cash Receipt"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Driver Message / Remarks for Vendor HQ:
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Challan handed over to accounts clerk Mr. Sharma, will process in monthly batch."
                  value={collectionRemarks}
                  onChange={(e) => setCollectionRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBillModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submittingBill ? 'Saving...' : 'Drop Collection Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
