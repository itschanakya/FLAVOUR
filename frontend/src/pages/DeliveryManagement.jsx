import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Truck, MapPin, ArrowUp, ArrowDown, Navigation, Phone, Calendar, Clock,
  CheckCircle2, AlertTriangle, Users, Package, Search,
  Printer, Plus, RefreshCw, X, ArrowUpRight, ExternalLink,
  ShieldCheck, Filter, ChevronRight, UserCheck, MessageCircle,
  Building2, Layers, FileCheck, Gauge
} from 'lucide-react';

export default function DeliveryManagement() {
  const { token, user } = useAuth();
  const { events } = useSSE();

  const [demands, setDemands] = useState([]);
  const [partners, setPartners] = useState([]);
  const [kmLogs, setKmLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState('STOPS'); // 'STOPS' | 'FLEET_LOADS'
  const [selectedPin, setSelectedPin] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPartner, setSelectedPartner] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDemandForAssign, setSelectedDemandForAssign] = useState(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [selectedDemandForSummary, setSelectedDemandForSummary] = useState(null);
  const [missingKmModal, setMissingKmModal] = useState({ open: false, driverId: null, partnerName: '', suggestedKm: 0, startKmInput: '' });

  // Assignment Form State
  const [deliveryMode, setDeliveryMode] = useState('DRIVER'); // 'DRIVER' | 'PORTER' | 'SELF_DELIVERY'
  const [assignPartnerId, setAssignPartnerId] = useState('');
  const [customPartnerName, setCustomPartnerName] = useState('');
  const [customPartnerPhone, setCustomPartnerPhone] = useState('');
  const [customVehicleNo, setCustomVehicleNo] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [startKm, setStartKm] = useState('');
  const [closingKm, setClosingKm] = useState('');
  const [filterByPinOnly, setFilterByPinOnly] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // New Partner Form State
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerVehicle, setNewPartnerVehicle] = useState('');
  const [newPartnerPins, setNewPartnerPins] = useState('');
  const [savingPartner, setSavingPartner] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Live timer tick for delivery countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Demands for Delivery
  const fetchDeliveryData = useCallback(async () => {
    if (!token) return;
    try {
      const [demRes, partRes, kmRes] = await Promise.all([
        fetch('/api/delivery/demands', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/delivery/partners', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/delivery/km-logs', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (demRes.ok) {
        const demData = await demRes.json();
        setDemands(Array.isArray(demData) ? demData : []);
      }
      if (partRes.ok) {
        const partData = await partRes.json();
        setPartners(Array.isArray(partData) ? partData : []);
      }
      if (kmRes && kmRes.ok) {
        const kmData = await kmRes.json();
        setKmLogs(Array.isArray(kmData) ? kmData : []);
      }
    } catch (err) {
      console.error('Error fetching delivery data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load & Polling
  useEffect(() => {
    fetchDeliveryData();
    const interval = setInterval(fetchDeliveryData, 15000);
    return () => clearInterval(interval);
  }, [fetchDeliveryData]);

  // React to SSE demand updates & instant local cross-tab sync
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.timestamp) {
      fetchDeliveryData();
    }
  }, [events?.DEMAND_UPDATED, events?.timestamp, fetchDeliveryData]);

  useEffect(() => {
    const handleSync = () => fetchDeliveryData();
    window.addEventListener('demand-status-changed', handleSync);
    return () => window.removeEventListener('demand-status-changed', handleSync);
  }, [fetchDeliveryData]);

  // Available PIN Codes
  const availablePins = useMemo(() => {
    const pins = new Set();
    demands.forEach(d => {
      if (d.pin_code && d.pin_code !== 'N/A') pins.add(d.pin_code);
    });
    return Array.from(pins).sort();
  }, [demands]);

  // Filtered Demands List
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      // PIN Filter
      if (selectedPin !== 'ALL' && d.pin_code !== selectedPin) return false;

      // Status Filter
      if (selectedStatus !== 'ALL') {
        const dStatus = d.delivery_status || 'PENDING';
        if (dStatus !== selectedStatus) return false;
      }

      // Partner Filter
      if (selectedPartner !== 'ALL') {
        if (String(d.delivery_partner_id) !== String(selectedPartner)) return false;
      }

      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const instMatch = (d.institution_name || '').toLowerCase().includes(term);
        const demNumMatch = (d.demand_number || '').toLowerCase().includes(term);
        const pinMatch = (d.pin_code || '').toLowerCase().includes(term);
        const partnerMatch = (d.delivery_partner_name || '').toLowerCase().includes(term);
        if (!instMatch && !demNumMatch && !pinMatch && !partnerMatch) return false;
      }

      return true;
    });
  }, [demands, selectedPin, selectedStatus, selectedPartner, searchTerm]);

  // Metrics
  const totalPackets = demands.reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);
  const outForDeliveryCount = demands.filter(d => d.delivery_status === 'OUT_FOR_DELIVERY').length;
  const outForDeliveryPackets = demands
    .filter(d => d.delivery_status === 'OUT_FOR_DELIVERY')
    .reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);
  const deliveredCount = demands.filter(d => d.delivery_status === 'DELIVERED').length;
  const deliveredPackets = demands
    .filter(d => d.delivery_status === 'DELIVERED')
    .reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);
  const pendingDispatchCount = demands.filter(d => !d.delivery_status || d.delivery_status === 'PENDING').length;
  const pendingDispatchPackets = demands
    .filter(d => !d.delivery_status || d.delivery_status === 'PENDING')
    .reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0);

  // Generate Google Maps URL
  const getGoogleMapsUrl = (dem) => {
    if (dem.google_location && dem.google_location.startsWith('http')) {
      return dem.google_location;
    }
    const query = `${dem.institution_name}, ${dem.complete_address || ''}, PIN ${dem.pin_code || ''}, India`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Parse date string into timestamp safely (handles both YYYY-MM-DD and DD-MM-YYYY)
  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return 0;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
        } else if (parts[2].length === 4) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
        }
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch {
      return 0;
    }
  };

  // Format date strictly as DD-MM-YYYY
  const formatDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return dateStr || '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        } else if (parts[2].length === 4) {
          return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper to format date nicely
  const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return 'Undated Schedule';
    try {
      const parts = dateStr.split('-');
      let d = null;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (parts[2].length === 4) {
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
      if (d && !isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
      return formatDDMMYYYY(dateStr);
    } catch {
      return dateStr;
    }
  };

  // Relative date pill for header (e.g. TODAY, TOMORROW, DAY AFTER TOMORROW)
  const getDateRelativeTag = (dateStr) => {
    if (!dateStr || dateStr === 'Undated') return null;
    try {
      const ts = parseDateToTimestamp(dateStr);
      if (!ts) return null;
      const now = new Date();
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.round((ts - todayMid) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return { label: 'TODAY', bg: 'bg-emerald-600 text-white ring-2 ring-emerald-200 shadow-xs font-black' };
      } else if (diffDays === 1) {
        return { label: 'TOMORROW', bg: 'bg-blue-600 text-white ring-2 ring-blue-200 shadow-xs font-black' };
      } else if (diffDays === 2) {
        return { label: 'DAY AFTER TOMORROW', bg: 'bg-indigo-600 text-white ring-2 ring-indigo-200 shadow-xs font-black' };
      } else if (diffDays > 2) {
        return { label: `IN ${diffDays} DAYS`, bg: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold' };
      } else if (diffDays === -1) {
        return { label: 'YESTERDAY', bg: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' };
      } else {
        return { label: `${Math.abs(diffDays)} DAYS AGO`, bg: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' };
      }
    } catch {
      return null;
    }
  };

  // Helper to calculate time remaining for delivery
  const getTimeRemaining = (dateStr, timeStr, deliveryStatus) => {
    if (deliveryStatus === 'DELIVERED') {
      return { text: 'Delivered', type: 'delivered', isOverdue: false };
    }
    if (!dateStr || dateStr === 'Undated') {
      return { text: 'No schedule set', type: 'unknown', isOverdue: false };
    }

    try {
      let year, month, day;
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        }
      }

      if (!year || isNaN(month) || !day) {
        return { text: dateStr, type: 'unknown', isOverdue: false };
      }

      let hours = 8;
      let minutes = 0;
      if (timeStr) {
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          hours = parseInt(timeParts[0], 10) || 0;
          minutes = parseInt(timeParts[1], 10) || 0;
        }
      }

      const targetDate = new Date(year, month, day, hours, minutes, 0);
      const diffMs = targetDate.getTime() - currentTime;

      if (diffMs > 0) {
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const remHours = totalHours % 24;
        const remMins = totalMinutes % 60;

        if (days > 1) {
          return { text: `In ${days} days`, type: 'future', isOverdue: false };
        } else if (days === 1) {
          return { text: `Tomorrow (${remHours}h left)`, type: 'future', isOverdue: false };
        } else if (totalHours >= 1) {
          return { text: `${totalHours}h ${remMins}m left`, type: 'near', isOverdue: false };
        } else if (remMins > 0) {
          return { text: `${remMins}m left`, type: 'urgent', isOverdue: false };
        } else {
          return { text: 'Due right now', type: 'urgent', isOverdue: false };
        }
      } else {
        const pastMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
        const pastHours = Math.floor(pastMinutes / 60);
        const pastDays = Math.floor(pastHours / 24);

        if (pastHours < 1) {
          return { text: `Due ${pastMinutes}m ago`, type: 'overdue', isOverdue: true };
        } else if (pastHours < 24) {
          return { text: `Due ${pastHours}h ago`, type: 'overdue', isOverdue: true };
        } else {
          return { text: `${pastDays}d overdue`, type: 'overdue', isOverdue: true };
        }
      }
    } catch {
      return { text: 'Time pending', type: 'unknown', isOverdue: false };
    }
  };

  // Group filtered demands: Datewise -> Unitwise
  const groupedDateAndUnit = useMemo(() => {
    const dateMap = {};

    filteredDemands.forEach(d => {
      const dDate = d.demand_date || 'Undated';
      if (!dateMap[dDate]) {
        dateMap[dDate] = {
          date: dDate,
          totalDemands: 0,
          totalPackets: 0,
          totalAmount: 0,
          units: {}
        };
      }
      dateMap[dDate].totalDemands += 1;
      dateMap[dDate].totalPackets += (Number(d.total_quantity) || 0);
      dateMap[dDate].totalAmount += (Number(d.total_amount) || 0);

      const unitKey = d.unit_name || 'General Unit';
      if (!dateMap[dDate].units[unitKey]) {
        dateMap[dDate].units[unitKey] = {
          unitName: unitKey,
          unitCode: d.unit_code || '',
          nccGroup: d.ncc_group || '',
          demands: [],
          totalPackets: 0,
          totalAmount: 0
        };
      }
      dateMap[dDate].units[unitKey].demands.push(d);
      dateMap[dDate].units[unitKey].totalPackets += (Number(d.total_quantity) || 0);
      dateMap[dDate].units[unitKey].totalAmount += (Number(d.total_amount) || 0);
    });

    // Sort dates so:
    // 1) Today is on the very top
    // 2) Tomorrow is next
    // 3) Day after tomorrow next
    // 4) And so on (upcoming future dates in ascending order)
    // 5) Past dates at the bottom (most recent past date first)
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const sortedDates = Object.keys(dateMap).sort((a, b) => {
      const tsA = parseDateToTimestamp(a);
      const tsB = parseDateToTimestamp(b);

      const isUpcomingA = tsA >= todayMidnight;
      const isUpcomingB = tsB >= todayMidnight;

      // If both are today or in the future: nearest to today first (ascending)
      if (isUpcomingA && isUpcomingB) {
        return tsA - tsB;
      }
      // Upcoming dates always come before past dates
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      // Both are in the past: most recent past date first (descending)
      return tsB - tsA;
    });

    return sortedDates.map(dateKey => {
      const dateEntry = dateMap[dateKey];
      const unitList = Object.values(dateEntry.units).map(u => ({
        ...u,
        demands: [...u.demands].sort((a, b) => {
          const tsA = parseDateToTimestamp(a.demand_date);
          const tsB = parseDateToTimestamp(b.demand_date);
          if (tsA !== tsB) return tsA - tsB;
          return (a.id || 0) - (b.id || 0);
        })
      })).sort((a, b) => a.unitName.localeCompare(b.unitName));
      return {
        ...dateEntry,
        unitList
      };
    });
  }, [filteredDemands]);

  // Grouped Partner Vehicle Loads & Items Summary
  const partnerLoads = useMemo(() => {
    const map = {};

    demands.forEach(d => {
      const pName = d.delivery_partner_name;
      if (!pName) return;

      if (!map[pName]) {
        const matched = partners.find(p => p.id === d.delivery_partner_id || p.name === pName);
        const loadCapacity = matched?.load_capacity_packets || 750;
        const maxTravelKm = matched?.max_travel_km || 80;
        const vehicleModel = matched?.vehicle_model || 'Maruti Eeco Cargo Van';

        map[pName] = {
          name: pName,
          phone: d.delivery_partner_phone || '',
          vehicle: d.delivery_partner_vehicle || 'Standard Vehicle',
          vehicleModel,
          loadCapacity,
          maxTravelKm,
          totalStops: 0,
          totalPackets: 0,
          deliveredPackets: 0,
          pendingPackets: 0,
          deliveredStops: 0,
          pendingStops: 0,
          itemsSummary: {},
          stops: []
        };
      }

      const pkts = Number(d.total_quantity) || 0;
      const isDelivered = d.delivery_status === 'DELIVERED';

      map[pName].totalStops += 1;
      map[pName].totalPackets += pkts;
      if (isDelivered) {
        map[pName].deliveredStops += 1;
        map[pName].deliveredPackets += pkts;
      } else {
        map[pName].pendingStops += 1;
        map[pName].pendingPackets += pkts;
      }

      // Add item breakdown
      (d.items || []).forEach(it => {
        const name = it.item_name || 'Refreshment Packet';
        map[pName].itemsSummary[name] = (map[pName].itemsSummary[name] || 0) + (it.quantity || 0);
      });

      map[pName].stops.push({
        id: d.id,
        institutionName: d.institution_name || d.unit_name || 'Unknown',
        pin: d.pin_code,
        packets: pkts,
        status: d.delivery_status || 'PENDING',
        demandNumber: d.demand_number,
        anoName: d.ano_cto_name,
        anoPhone: d.ano_cto_contact,
        address: d.complete_address,
        googleLocation: d.google_location,
        fullDemand: d
      });
    });

    return Object.values(map);
  }, [demands]);

  // WhatsApp Driver Route & Load Manifest
  const handleWhatsAppDriverManifest = (partner) => {
    let rawPhone = (partner.phone || '').replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;

    let text = `🚚 *NCC REFRESHMENT - VEHICLE LOAD & ROUTE SHEET* 🚚\n\n`;
    text += `Driver: *${partner.name}*\n`;
    text += `Vehicle: *${partner.vehicleModel || 'Maruti Eeco Cargo Van'}* (${partner.vehicle})\n`;
    text += `One Load Capacity: *${partner.loadCapacity || 750} Packets/Day* | Max Distance: *${partner.maxTravelKm || 80} km*\n`;
    text += `Total Stops: *${partner.totalStops} Institutions*\n`;
    text += `Assigned Load: *${partner.totalPackets} Packets* ${partner.totalPackets > (partner.loadCapacity || 750) ? '⚠️ [OVERLOADED]' : ''}\n`;
    text += `Delivered: *${partner.deliveredPackets}* | In-Transit: *${partner.pendingPackets}*\n\n`;

    text += `📋 *ITEM LOAD BREAKDOWN:*\n`;
    const itemEntries = Object.entries(partner.itemsSummary);
    if (itemEntries.length > 0) {
      itemEntries.forEach(([name, qty]) => {
        text += `• ${name}: *${qty} units*\n`;
      });
    } else {
      text += `• Refreshment Packets: *${partner.totalPackets}*\n`;
    }

    text += `\n📍 *DELIVERY STOPS MANIFEST:*\n`;
    partner.stops.forEach((st, idx) => {
      text += `${idx + 1}. *${st.institutionName}* (PIN: ${st.pin})\n`;
      text += `   📦 *${st.packets} Packets* | Status: ${st.status === 'DELIVERED' ? '✅ Delivered' : '⏳ In Transit'}\n`;
      if (st.anoName) text += `   👤 ANO: ${st.anoName} (${st.anoPhone || 'N/A'})\n`;
      if (st.address) text += `   🏫 Address: ${st.address}\n`;
      text += `\n`;
    });

    text += `_Generated via NCC Supply & Logistics Portal_`;

    const url = rawPhone
      ? `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // PIN-based driver matching and odometer calculations
  const driverMatchesPin = (driver, pin) => {
    if (!pin) return true;
    if (!driver.assigned_pins || driver.assigned_pins.trim() === '' || driver.assigned_pins.toUpperCase().includes('ALL')) return true;
    const pins = driver.assigned_pins.split(/[\s,;|]+/).map(p => p.trim());
    return pins.includes(String(pin));
  };

  const pinMatchedDrivers = useMemo(() => {
    if (!selectedDemandForAssign || !selectedDemandForAssign.pin_code) return partners;
    return partners.filter(p => driverMatchesPin(p, selectedDemandForAssign.pin_code));
  }, [partners, selectedDemandForAssign]);

  const displayedDrivers = useMemo(() => {
    return partners;
  }, [partners]);

  const selectedPartnerObj = useMemo(() => {
    if (!assignPartnerId) return null;
    return partners.find(p => String(p.id) === String(assignPartnerId));
  }, [partners, assignPartnerId]);

  const calculatedTotalKm = useMemo(() => {
    const s = parseFloat(startKm);
    const c = parseFloat(closingKm);
    if (!isNaN(s) && !isNaN(c)) {
      return (c - s).toFixed(1);
    }
    return null;
  }, [startKm, closingKm]);

  // Open Assign Modal for single demand
  const handleOpenAssign = (dem) => {
    setSelectedDemandForAssign(dem);
    const mode = dem.delivery_mode || 'DRIVER';
    setDeliveryMode(mode);
    if (mode === 'DRIVER' && dem.delivery_partner_id) {
      setAssignPartnerId(String(dem.delivery_partner_id));
      setCustomPartnerName(dem.delivery_partner_name || '');
      setCustomPartnerPhone(dem.delivery_partner_phone || '');
      setCustomVehicleNo(dem.delivery_partner_vehicle || '');
    } else if (mode === 'DRIVER') {
      const matched = partners.filter(p => driverMatchesPin(p, dem.pin_code));
      if (matched.length === 1) {
        setAssignPartnerId(String(matched[0].id));
        setCustomPartnerName(matched[0].name || '');
        setCustomPartnerPhone(matched[0].phone || '');
        setCustomVehicleNo(matched[0].vehicle_no || '');
      } else {
        setAssignPartnerId('');
        setCustomPartnerName('');
        setCustomPartnerPhone('');
        setCustomVehicleNo('');
      }
    } else if (mode === 'PORTER') {
      setAssignPartnerId('');
      setCustomPartnerName('Handled by Porter');
      setCustomPartnerPhone('Porter Staff');
      setCustomVehicleNo('Porter Transport');
    } else if (mode === 'SELF_DELIVERY') {
      setAssignPartnerId('');
      setCustomPartnerName('Admin Self Delivery');
      setCustomPartnerPhone('');
      setCustomVehicleNo('Admin Direct Handover');
    }
    setStartKm(dem.start_km_reading !== null && dem.start_km_reading !== undefined ? String(dem.start_km_reading) : '');
    setClosingKm(dem.closing_km_reading !== null && dem.closing_km_reading !== undefined ? String(dem.closing_km_reading) : '');
    setFilterByPinOnly(true);
    setDeliveryNotes(dem.delivery_notes || '');
    setAssignModalOpen(true);
  };

  // Handle Partner Dropdown Select
  const handlePartnerSelect = (pId) => {
    setAssignPartnerId(pId);
    if (!pId) {
      setCustomPartnerName('');
      setCustomPartnerPhone('');
      setCustomVehicleNo('');
      return;
    }
    const p = partners.find(part => String(part.id) === String(pId));
    if (p) {
      setCustomPartnerName(p.name);
      setCustomPartnerPhone(p.phone);
      setCustomVehicleNo(p.vehicle_no || '');
    }
  };

  // 1-Click WhatsApp Alert to ANO (Option A: 100% Free Direct Alert)
  const handleSendWhatsAppAlert = (dem) => {
    if (!dem) return;

    // Clean phone number: remove non-numeric chars
    let rawPhone = (dem.ano_cto_contact || '').replace(/\D/g, '');
    if (rawPhone.length === 10) {
      rawPhone = '91' + rawPhone; // Default to India prefix (+91)
    }

    const officer = dem.ano_cto_name ? `${dem.ano_cto_name} Sir/Ma'am` : 'ANO/CTO Officer';
    const demandNo = dem.demand_number || 'N/A';
    const institution = dem.institution_name || 'Institution';
    const packets = dem.total_quantity || 0;
    const partnerName = dem.delivery_partner_name || 'Assigned Delivery';
    const partnerPhone = dem.delivery_partner_phone || 'N/A';
    const partnerVehicle = dem.delivery_partner_vehicle || 'Standard Transport';
    const pin = dem.pin_code && dem.pin_code !== 'N/A' ? `PIN: ${dem.pin_code}` : '';
    const address = dem.complete_address ? dem.complete_address : '';
    const notes = dem.delivery_notes ? `\n📝 *Notes:* ${dem.delivery_notes}` : '';
    const meterNotes = (dem.delivery_mode === 'DRIVER' && dem.start_km_reading) ? `\n🚗 *Starting Odometer:* ${dem.start_km_reading} KM` : '';

    const text = 
`🇮🇳 *NCC REFRESHMENT DISPATCH ALERT* 🇮🇳
*OUT FOR DELIVERY*

Jai Hind ${officer},

Refreshment supply for *${institution}* is now *OUT FOR DELIVERY*.

📦 *Demand Ref:* #${demandNo}
🥪 *Refreshment Packets:* *${packets} Packets*

🚚 *DELIVERY DISPATCH DETAILS:*
• *Mode:* ${dem.delivery_mode === 'PORTER' ? 'Handled by Porter' : (dem.delivery_mode === 'SELF_DELIVERY' ? 'Admin Self Delivery' : 'Fleet Driver')}
• *Delivery Handler:* ${partnerName}
• *Contact Mobile:* ${partnerPhone}
• *Transport:* ${partnerVehicle}${meterNotes}${notes}
${pin ? `• *Location:* ${pin}` : ''}
${address ? `• *Destination Address:* ${address}` : ''}

⚠️ *Action Required:*
Please ensure that the designated NCC Cadet Senior or Staff is available at the reception/ground to verify packet counts and receive the delivery.

_National Cadet Corps - Supply & Logistics Portal_`;

    const encoded = encodeURIComponent(text);
    const url = rawPhone
      ? `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  };

  // Helper for today's local date YYYY-MM-DD
  const getTodayLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Direct dispatch executor without stale React state issues
  const executeDispatch = async (resolvedStartKm, andSendWhatsApp = false) => {
    setAssigning(true);
    try {
      const mode = deliveryMode || 'DRIVER';
      let pName = customPartnerName.trim();
      let pPhone = customPartnerPhone.trim();
      let pVehicle = customVehicleNo.trim();

      if (mode === 'PORTER') {
        pName = 'Handled by Porter';
        pPhone = 'Porter Staff';
        pVehicle = 'Porter Transport';
      } else if (mode === 'SELF_DELIVERY') {
        pName = 'Admin Self Delivery';
        pPhone = '';
        pVehicle = 'Admin Direct Handover';
      }

      const s = (mode === 'DRIVER' && resolvedStartKm !== null && resolvedStartKm !== undefined && resolvedStartKm !== '')
        ? parseFloat(resolvedStartKm)
        : (mode === 'DRIVER' && startKm !== '' ? parseFloat(startKm) : null);
      const c = (mode === 'DRIVER' && closingKm !== '') ? parseFloat(closingKm) : null;
      const t = (s !== null && c !== null) ? Math.max(0, c - s) : null;

      const res = await fetch('/api/delivery/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          demandIds: [selectedDemandForAssign.id],
          deliveryMode: mode,
          partnerId: mode === 'DRIVER' && assignPartnerId ? parseInt(assignPartnerId) : null,
          partnerName: pName,
          partnerPhone: pPhone,
          partnerVehicle: pVehicle,
          deliveryNotes: deliveryNotes.trim(),
          startKm: s,
          closingKm: c,
          totalKm: t
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign delivery');

      const updatedDem = {
        ...selectedDemandForAssign,
        delivery_mode: mode,
        delivery_partner_id: mode === 'DRIVER' && assignPartnerId ? parseInt(assignPartnerId) : null,
        delivery_partner_name: pName,
        delivery_partner_phone: pPhone,
        delivery_partner_vehicle: pVehicle,
        delivery_notes: deliveryNotes.trim(),
        start_km_reading: s,
        closing_km_reading: c,
        total_km: t,
        delivery_status: 'OUT_FOR_DELIVERY'
      };

      setAssignModalOpen(false);
      setMissingKmModal({ open: false, driverId: null, partnerName: '', suggestedKm: 0, startKmInput: '', andSendWhatsApp: false });
      await fetchDeliveryData();

      if (andSendWhatsApp) {
        handleSendWhatsAppAlert(updatedDem);
      }
    } catch (err) {
      alert(err.message || 'Failed to assign delivery');
    } finally {
      setAssigning(false);
    }
  };

  const handleMissingKmSubmit = async () => {
    const rawVal = String(missingKmModal.startKmInput || '').trim();
    if (!rawVal) {
      alert("Please enter today's starting odometer reading.");
      return;
    }
    const enteredKm = parseFloat(rawVal);
    if (isNaN(enteredKm) || enteredKm < 0) {
      alert("Please enter a valid positive starting odometer reading.");
      return;
    }
    
    try {
      const today = getTodayLocalDateStr();
      const driverIdNum = parseInt(missingKmModal.driverId);

      const res = await fetch('/api/delivery/km-logs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          driver_id: driverIdNum, 
          log_date: today, 
          start_km: enteredKm 
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save Start KM');
        return;
      }

      // Optimistically update kmLogs in state
      setKmLogs(prev => {
        const dIdStr = String(missingKmModal.driverId);
        const exists = prev.find(l => String(l.driver_id) === dIdStr);
        if (exists) {
          return prev.map(l => String(l.driver_id) === dIdStr ? { ...l, start_km: enteredKm, log_date: today } : l);
        } else {
          return [...prev, { driver_id: driverIdNum, log_date: today, start_km: enteredKm }];
        }
      });
      setStartKm(String(enteredKm));
      
      const andSendWhatsApp = missingKmModal.andSendWhatsApp;
      setMissingKmModal({ open: false, driverId: null, partnerName: '', suggestedKm: 0, startKmInput: '', andSendWhatsApp: false });
      
      // Directly proceed to dispatch with the saved start KM without re-checking stale state!
      await executeDispatch(enteredKm, andSendWhatsApp);
    } catch (err) {
      alert('Error saving Start KM: ' + (err.message || 'Network error'));
    }
  };

  // Submit Assignment
  const handleSaveAssignment = async (e, andSendWhatsApp = false) => {
    if (e) e.preventDefault();

    if (deliveryMode === 'PORTER' || deliveryMode === 'SELF_DELIVERY') {
      await executeDispatch(null, andSendWhatsApp);
      return;
    }

    if (!customPartnerName.trim()) {
      alert('Please select or enter Delivery Partner Name');
      return;
    }

    if (assignPartnerId) {
      const today = getTodayLocalDateStr();
      const driverLog = kmLogs.find(l => String(l.driver_id) === String(assignPartnerId));

      const hasStartKmInDemand = startKm !== '' || (selectedDemandForAssign?.start_km_reading !== null && selectedDemandForAssign?.start_km_reading !== undefined);
      const hasStartKmInLog = driverLog && driverLog.start_km !== null && driverLog.start_km !== undefined;
      const isAlreadyDispatched = selectedDemandForAssign?.delivery_status === 'OUT_FOR_DELIVERY' || selectedDemandForAssign?.delivery_status === 'DELIVERED';

      if (!hasStartKmInDemand && !hasStartKmInLog && !isAlreadyDispatched) {
        setMissingKmModal({
          open: true,
          driverId: assignPartnerId,
          partnerName: customPartnerName,
          suggestedKm: driverLog ? (driverLog.suggested_start_km || 0) : 0,
          startKmInput: driverLog?.suggested_start_km ? String(driverLog.suggested_start_km) : '',
          andSendWhatsApp
        });
        return;
      }

      const resolvedStart = hasStartKmInDemand
        ? (startKm !== '' ? parseFloat(startKm) : selectedDemandForAssign.start_km_reading)
        : (hasStartKmInLog ? driverLog.start_km : null);

      if (resolvedStart !== null && startKm === '') {
        setStartKm(String(resolvedStart));
      }

      if (startKm !== '' && closingKm !== '') {
        const s = parseFloat(startKm);
        const c = parseFloat(closingKm);
        if (!isNaN(s) && !isNaN(c) && c < s) {
          alert('Closing Meter Reading cannot be less than Starting Meter Reading.');
          return;
        }
      }

      await executeDispatch(resolvedStart, andSendWhatsApp);
      return;
    }

    if (startKm !== '' && closingKm !== '') {
      const s = parseFloat(startKm);
      const c = parseFloat(closingKm);
      if (!isNaN(s) && !isNaN(c) && c < s) {
        alert('Closing Meter Reading cannot be less than Starting Meter Reading.');
        return;
      }
    }

    await executeDispatch(null, andSendWhatsApp);
  };


  const handleMoveSequence = async (partnerStops, stopIndex, direction) => {
    if (direction === 'UP' && stopIndex === 0) return;
    if (direction === 'DOWN' && stopIndex === partnerStops.length - 1) return;

    const newStops = [...partnerStops];
    const swapIndex = direction === 'UP' ? stopIndex - 1 : stopIndex + 1;
    
    // Swap
    const temp = newStops[stopIndex];
    newStops[stopIndex] = newStops[swapIndex];
    newStops[swapIndex] = temp;

    // Build sequence array
    const sequences = newStops.map((st, idx) => ({ id: st.id, delivery_sequence: idx + 1 }));

    // Optimistically update demands state
    setDemands(prev => {
      const updated = [...prev];
      sequences.forEach(seq => {
        const dIdx = updated.findIndex(d => d.id === seq.id);
        if (dIdx > -1) {
          updated[dIdx] = { ...updated[dIdx], delivery_sequence: seq.delivery_sequence };
        }
      });
      return updated.sort((a, b) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0));
    });

    try {
      await fetch('/api/delivery/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sequences })
      });
      fetchDeliveryData();
    } catch (err) {
      alert('Failed to reorder: ' + err.message);
      fetchDeliveryData();
    }
  };

  // Mark Delivery Status with Instant Optimistic UI Updating
  const handleUpdateStatus = async (demandId, newStatus) => {
    // 1. Optimistic update: instantly update demands state so filtered views re-render immediately
    setDemands(prev =>
      prev.map(d => (d.id === demandId ? { ...d, delivery_status: newStatus } : d))
    );
    setSelectedDemandForSummary(prev =>
      prev && prev.id === demandId ? { ...prev, delivery_status: newStatus } : prev
    );

    try {
      const res = await fetch('/api/delivery/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          demandId,
          deliveryStatus: newStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Background sync
      fetchDeliveryData();
    } catch (err) {
      alert(err.message);
      // Revert if error
      fetchDeliveryData();
    }
  };

  // Add New Delivery Partner
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    if (!newPartnerName.trim() || !newPartnerPhone.trim()) {
      alert('Partner Name and Phone are required.');
      return;
    }

    setSavingPartner(true);
    try {
      const res = await fetch('/api/delivery/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPartnerName.trim(),
          phone: newPartnerPhone.trim(),
          vehicle_no: newPartnerVehicle.trim(),
          assigned_pins: newPartnerPins.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewPartnerName('');
      setNewPartnerPhone('');
      setNewPartnerVehicle('');
      setNewPartnerPins('');
      setPartnerModalOpen(false);
      fetchDeliveryData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPartner(false);
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Smart Executive Header with Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 shadow-2xs">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Delivery & Route Logistics
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                Distribution Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time route manifests, driver assignments, and delivery verification
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/documentation"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Go to Documentation Portal for delivered demands"
          >
            <FileCheck className="w-4 h-4" />
            <span>Documentation ↗</span>
          </Link>

          <button
            onClick={() => setPartnerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Users className="w-4 h-4 text-slate-600" />
            Partners ({partners.length})
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Sheet
          </button>
        </div>
      </div>

      {/* FOUR BIG SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Demand Allocation */}
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          title="Click to view all demands and stops"
          className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-xs ${
            selectedStatus === 'ALL'
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white ring-2 ring-slate-900 shadow-md'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              selectedStatus === 'ALL' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              Total Demands
            </span>
            <div className={`p-2 rounded-xl ${
              selectedStatus === 'ALL'
                ? 'bg-white/10 text-white'
                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              {totalPackets.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${
              selectedStatus === 'ALL' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              Packets
            </span>
          </div>
          <div className={`mt-3 pt-2.5 border-t text-xs font-semibold flex items-center justify-between ${
            selectedStatus === 'ALL' ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-500'
          }`}>
            <span>{demands.length} Delivery Stop{demands.length !== 1 ? 's' : ''}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedStatus === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedStatus === 'ALL' ? 'Active Filter' : 'All Routes'}
            </span>
          </div>
        </button>

        {/* Card 2: Ready for Dispatch */}
        <button
          type="button"
          onClick={() => setSelectedStatus('PENDING')}
          title="Click to filter demands ready for dispatch"
          className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-xs ${
            selectedStatus === 'PENDING'
              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-500 shadow-md'
              : 'bg-white hover:bg-amber-50/40 text-slate-800 border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              selectedStatus === 'PENDING' ? 'text-amber-100' : 'text-amber-700'
            }`}>
              Ready for Dispatch
            </span>
            <div className={`p-2 rounded-xl ${
              selectedStatus === 'PENDING'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
              selectedStatus === 'PENDING' ? 'text-white' : 'text-amber-600'
            }`}>
              {pendingDispatchPackets.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${
              selectedStatus === 'PENDING' ? 'text-amber-100' : 'text-slate-500'
            }`}>
              Packets
            </span>
          </div>
          <div className={`mt-3 pt-2.5 border-t text-xs font-semibold flex items-center justify-between ${
            selectedStatus === 'PENDING' ? 'border-white/20 text-amber-100' : 'border-amber-100/70 text-slate-500'
          }`}>
            <span>{pendingDispatchCount} Pending Stop{pendingDispatchCount !== 1 ? 's' : ''}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedStatus === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {selectedStatus === 'PENDING' ? 'Active Filter' : 'Awaiting Load'}
            </span>
          </div>
        </button>

        {/* Card 3: Out for Delivery */}
        <button
          type="button"
          onClick={() => setSelectedStatus('OUT_FOR_DELIVERY')}
          title="Click to filter demands currently out with drivers"
          className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-xs ${
            selectedStatus === 'OUT_FOR_DELIVERY'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-blue-600 shadow-md'
              : 'bg-white hover:bg-blue-50/40 text-slate-800 border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              selectedStatus === 'OUT_FOR_DELIVERY' ? 'text-blue-100' : 'text-blue-700'
            }`}>
              Out for Delivery
            </span>
            <div className={`p-2 rounded-xl ${
              selectedStatus === 'OUT_FOR_DELIVERY'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
            }`}>
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
              selectedStatus === 'OUT_FOR_DELIVERY' ? 'text-white' : 'text-blue-600'
            }`}>
              {outForDeliveryPackets.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${
              selectedStatus === 'OUT_FOR_DELIVERY' ? 'text-blue-100' : 'text-slate-500'
            }`}>
              Packets
            </span>
          </div>
          <div className={`mt-3 pt-2.5 border-t text-xs font-semibold flex items-center justify-between ${
            selectedStatus === 'OUT_FOR_DELIVERY' ? 'border-white/20 text-blue-100' : 'border-blue-100/70 text-slate-500'
          }`}>
            <span>{outForDeliveryCount} Active Route{outForDeliveryCount !== 1 ? 's' : ''}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedStatus === 'OUT_FOR_DELIVERY'
                ? 'bg-white/25 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {selectedStatus === 'OUT_FOR_DELIVERY' ? 'Active Filter' : 'In Transit'}
            </span>
          </div>
        </button>

        {/* Card 4: Completed & Delivered */}
        <button
          type="button"
          onClick={() => setSelectedStatus('DELIVERED')}
          title="Click to filter completed and verified deliveries"
          className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-xs ${
            selectedStatus === 'DELIVERED'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-600 shadow-md'
              : 'bg-white hover:bg-emerald-50/40 text-slate-800 border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              selectedStatus === 'DELIVERED' ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              Delivered & Completed
            </span>
            <div className={`p-2 rounded-xl ${
              selectedStatus === 'DELIVERED'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
              selectedStatus === 'DELIVERED' ? 'text-white' : 'text-emerald-600'
            }`}>
              {deliveredPackets.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${
              selectedStatus === 'DELIVERED' ? 'text-emerald-100' : 'text-slate-500'
            }`}>
              Packets
            </span>
          </div>
          <div className={`mt-3 pt-2.5 border-t text-xs font-semibold flex items-center justify-between ${
            selectedStatus === 'DELIVERED' ? 'border-white/20 text-emerald-100' : 'border-emerald-100/70 text-slate-500'
          }`}>
            <span>{deliveredCount} Completed Stop{deliveredCount !== 1 ? 's' : ''}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedStatus === 'DELIVERED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {selectedStatus === 'DELIVERED' ? 'Active Filter' : 'Verified'}
            </span>
          </div>
        </button>
      </div>

      {/* Unified Navigation & Controls Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2.5 space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left: View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('STOPS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'STOPS'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Stops Manifest ({filteredDemands.length})
            </button>

            <button
              type="button"
              onClick={() => setViewMode('FLEET_LOADS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'FLEET_LOADS'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Fleet & Loads ({partnerLoads.length})
            </button>
          </div>

          {/* Right: Search + PIN + Driver Filters (when viewing Stops) */}
          {viewMode === 'STOPS' && (
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search school, PIN, driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* PIN Code Slicer Dropdown */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                <span className="font-extrabold text-slate-400 text-[10px]">PIN:</span>
                <select
                  value={selectedPin}
                  onChange={(e) => setSelectedPin(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  <option value="ALL">All PINs ({availablePins.length})</option>
                  {availablePins.map(pin => (
                    <option key={pin} value={pin}>PIN {pin}</option>
                  ))}
                </select>
              </div>

              {/* Driver Slicer Dropdown */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Users className="w-3 h-3 text-indigo-500 shrink-0" />
                <span className="font-extrabold text-slate-400 text-[10px]">Driver:</span>
                <select
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="ALL">All Drivers</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Slicer Dropdown */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Filter className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="font-extrabold text-slate-400 text-[10px]">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[145px] truncate"
                >
                  <option value="ALL">All Demands ({demands.length})</option>
                  <option value="PENDING">Ready for Dispatch ({pendingDispatchCount})</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery ({outForDeliveryCount})</option>
                  <option value="DELIVERED">Delivered ({deliveredCount})</option>
                </select>
              </div>

              {/* Reset if active */}
              {(selectedPin !== 'ALL' || selectedStatus !== 'ALL' || selectedPartner !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedPin('ALL');
                    setSelectedStatus('ALL');
                    setSelectedPartner('ALL');
                    setSearchTerm('');
                  }}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                  title="Clear all filters"
                >
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick PIN Code Pills for Fast 1-Click Cluster Filtering */}
        {viewMode === 'STOPS' && availablePins.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
              PIN Clusters:
            </span>
            <button
              onClick={() => setSelectedPin('ALL')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all whitespace-nowrap ${
                selectedPin === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All ({demands.length})
            </button>
            {availablePins.map(pin => {
              const count = demands.filter(d => d.pin_code === pin).length;
              const pkts = demands.filter(d => d.pin_code === pin).reduce((s, d) => s + (Number(d.total_quantity) || 0), 0);
              return (
                <button
                  key={pin}
                  onClick={() => setSelectedPin(pin)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
                    selectedPin === pin
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5" />
                  PIN {pin} ({count} • {pkts} Pkts)
                </button>
              );
            })}
          </div>
        )}
      </div>

      {viewMode === 'FLEET_LOADS' ? (
        /* DRIVER FLEET & VEHICLE LOADS VIEW */
        <div className="space-y-6">
          {partnerLoads.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-900 mb-1">No Delivery Partners Assigned Yet</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Switch to "Institution Stops Manifest" and assign drivers to demands to view vehicle loads and live summaries here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {partnerLoads.map(partner => {
                const percentDelivered = partner.totalPackets > 0
                  ? Math.round((partner.deliveredPackets / partner.totalPackets) * 100)
                  : 0;

                const capacity = partner.loadCapacity || 750;
                const isOverloaded = partner.totalPackets > capacity;
                const loadUtilization = Math.round((partner.totalPackets / capacity) * 100);

                return (
                  <div
                    key={partner.name}
                    className={`bg-white rounded-3xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                      isOverloaded ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/90'
                    }`}
                  >
                    {/* Header: Driver Info & Manifest Actions */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900 leading-tight">
                                {partner.name}
                              </h3>
                              {isOverloaded && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 font-bold text-[10px] animate-pulse">
                                  ⚠️ Overloaded
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-slate-700">{partner.vehicleModel || 'Maruti Eeco'} ({partner.vehicle})</span>
                              {partner.phone && (
                                <a href={`tel:${partner.phone}`} className="text-blue-600 hover:underline flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" /> {partner.phone}
                                </a>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[10px]" title="Vehicle maximum single load limit (15 crates x 50 pkts = 750)">
                                One Load Capacity: <strong>{capacity} Pkts/Day</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-[10px]" title="Maximum safe urban route travel radius">
                                Max Travel: <strong>{partner.maxTravelKm || 80} km</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Manifest to Driver */}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppDriverManifest(partner)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                          title="Send full route manifest & packet breakdown to Driver's WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Manifest</span>
                        </button>
                      </div>

                      {/* Vehicle Capacity Utilization & Load Progress Meter */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700">
                            Vehicle Payload: <strong className={isOverloaded ? 'text-rose-700 text-sm' : 'text-indigo-900 text-sm'}>{partner.totalPackets}</strong> / <strong className="text-slate-600">{capacity} Pkts</strong> ({loadUtilization}%)
                          </span>
                          <span className={`text-[11px] font-bold ${isOverloaded ? 'text-rose-600' : 'text-slate-500'}`}>
                            {isOverloaded ? `Exceeds safe limit by ${partner.totalPackets - capacity} pkts` : `${Math.max(0, capacity - partner.totalPackets)} pkts capacity free`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverloaded ? 'bg-rose-500' : loadUtilization > 85 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, loadUtilization)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-bold text-slate-600">
                            Delivery Drop-offs: {partner.deliveredPackets} / {partner.totalPackets} ({percentDelivered}%)
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {partner.deliveredStops}/{partner.totalStops} Stops Done
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentDelivered}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-2">
                          <span>Stops: <strong>{partner.totalStops} Institutions</strong></span>
                          <span>In Transit: <strong className="text-amber-700">{partner.pendingPackets} Pkts</strong></span>
                          <span>Delivered: <strong className="text-emerald-700">{partner.deliveredPackets} Pkts</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Item Breakdown Summary */}
                    <div className="p-5 border-b border-slate-100 space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        Summary of Items Being Carried in Vehicle
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(partner.itemsSummary).length > 0 ? (
                          Object.entries(partner.itemsSummary).map(([item, qty]) => (
                            <div
                              key={item}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs font-extrabold text-indigo-950 flex items-center gap-2"
                            >
                              <span>{item}</span>
                              <span className="bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-700 font-black">
                                {qty}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            Standard Refreshment Packets ({partner.totalPackets} units)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Stops Manifest List */}
                    <div className="p-5 bg-slate-50/40 space-y-2.5">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Assigned Delivery Stops</span>
                        <span className="text-[10px] text-slate-400 font-bold">{partner.stops.length} Stops</span>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {partner.stops.map((st, sIdx) => {
                          const isDone = st.status === 'DELIVERED';
                          const mapsUrl = getGoogleMapsUrl(st.fullDemand);

                          return (
                            <div
                              key={st.id}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                isDone
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 ${
                                  isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {sIdx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-xs truncate">
                                    {st.institutionName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1 flex-wrap">
                                    {st.fullDemand?.unit_code && (
                                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mr-1" title={st.fullDemand?.unit_name}>
                                        {st.fullDemand.unit_code}
                                      </span>
                                    )}
                                    <span>{formatDDMMYYYY(st.fullDemand?.demand_date) || ''}</span>
                                    {st.fullDemand?.demand_time && <span>• {st.fullDemand.demand_time}</span>}
                                    <span>• PIN {st.pin}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-black text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                  {st.packets} Pkts
                                </span>

                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                  title="Google Maps Navigation"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppAlert(st.fullDemand)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                  title="WhatsApp ANO Alert"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STOPS VIEW: Deliveries List Rendered Datewise and Unitwise */
        <>
          {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">
          Loading delivery logistics...
        </div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 mb-1">No Delivery Demands Found</h3>
          <p className="text-xs text-slate-500 font-medium">Try clearing your filters or PIN code selection.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedDateAndUnit.map(dateGroup => (
            <div key={dateGroup.date} className="space-y-4">
              
              {/* DATE BANNER HEADER (Light Theme) */}
              <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-white rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/25">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-2">
                      <span>SCHEDULED DEMAND DATE</span>
                      {(() => {
                        const tag = getDateRelativeTag(dateGroup.date);
                        return tag ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${tag.bg}`}>
                            {tag.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                      {formatDateDisplay(dateGroup.date)}
                      <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                        {formatDDMMYYYY(dateGroup.date)}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Date-level summary badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-white text-slate-700 font-extrabold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{dateGroup.unitList.length} Unit{dateGroup.unitList.length > 1 ? 's' : ''}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200/80 shadow-2xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>{dateGroup.totalDemands} Demands</span>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 font-black text-xs border border-blue-200 shadow-2xs">
                    {dateGroup.totalPackets.toLocaleString('en-IN')} Packets
                  </span>
                </div>
              </div>

              {/* UNIT SECTIONS FOR THIS DATE */}
              <div className="space-y-6 pl-0 md:pl-2">
                {dateGroup.unitList.map(unitGroup => (
                  <div key={unitGroup.unitName} className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
                    
                    {/* UNIT HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                              {unitGroup.unitName}
                            </h4>
                            {unitGroup.unitCode && (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold border border-slate-200">
                                {unitGroup.unitCode}
                              </span>
                            )}
                            {unitGroup.nccGroup && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold border border-amber-200">
                                {unitGroup.nccGroup}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {unitGroup.demands.length} Delivery Stop{unitGroup.demands.length > 1 ? 's' : ''} for this Battalion
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-black self-end sm:self-auto">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-200 shadow-2xs">
                          {unitGroup.totalPackets} Pkts
                        </span>
                      </div>
                    </div>

                    {/* DEMAND STOPS LIST FOR THIS UNIT (CLICK ROW OR BUTTON TO POP UP SUMMARY CARD) */}
                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      {/* Desktop Table Column Header */}
                      <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 items-center">
                        <div className="col-span-5">Stop & Institution Venue</div>
                        <div className="col-span-2 text-center">Packets / Est. Time</div>
                        <div className="col-span-2 text-center">Delivery Partner</div>
                        <div className="col-span-2 text-center">Live Status</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>

                      {unitGroup.demands.map((dem, idx) => {
                        const isDelivered = dem.delivery_status === 'DELIVERED';
                        const isOut = dem.delivery_status === 'OUT_FOR_DELIVERY';
                        const mapsUrl = getGoogleMapsUrl(dem);
                        const timeRemaining = getTimeRemaining(dem.demand_date, dem.demand_time, dem.delivery_status);

                        return (
                          <div
                            key={dem.id}
                            onClick={() => {
                              if (isDelivered) {
                                setSelectedDemandForSummary(dem);
                              } else if (!dem.delivery_partner_name) {
                                handleOpenAssign(dem);
                              }
                            }}
                            className="p-3 sm:p-4 hover:bg-slate-50/90 transition-colors cursor-pointer group flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-3"
                          >
                            {/* Col 1: Stop Index, Demand Ref, Institution Name & Address (col-span-5) */}
                            <div className="lg:col-span-5 flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-700 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 transition-colors">
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                    {dem.demand_number}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" /> {formatDDMMYYYY(dem.demand_date)}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {dem.demand_time || '08:00'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                                    <MapPin className="w-2.5 h-2.5 text-rose-500" />
                                    PIN {dem.pin_code || 'N/A'}
                                  </span>
                                </div>
                                <h5 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight truncate mt-1 group-hover:text-blue-600 transition-colors">
                                  {dem.institution_name}
                                </h5>
                                <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                                  {dem.complete_address || 'Address provided at registry'}
                                </p>
                              </div>
                            </div>

                            {/* Col 2: Quantity & Live Time Remaining for Delivery (col-span-2) */}
                            <div className="lg:col-span-2 flex lg:flex-col items-center justify-between lg:justify-center text-center">
                              <span className="inline-block text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                {dem.total_quantity || 0} Pkts
                              </span>

                              {/* Time Remaining / Delivery Status Indicator */}
                              {timeRemaining.type === 'delivered' ? (
                                <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-center mt-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Done
                                </div>
                              ) : timeRemaining.isOverdue ? (
                                <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 justify-center mt-1" title="Scheduled delivery time has passed">
                                  <Clock className="w-2.5 h-2.5 text-rose-500" /> {timeRemaining.text}
                                </div>
                              ) : timeRemaining.type === 'urgent' ? (
                                <div className="text-[10px] font-black text-amber-700 flex items-center gap-1 justify-center mt-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-600" /> {timeRemaining.text}
                                </div>
                              ) : (
                                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-center mt-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" /> {timeRemaining.text}
                                </div>
                              )}
                            </div>

                            {/* Col 3: Mode & Handler Assignment (col-span-2) */}
                            <div className="lg:col-span-2 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                              {dem.delivery_mode === 'PORTER' || dem.delivery_partner_name === 'Handled by Porter' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssign(dem)}
                                  className="w-full max-w-[170px] px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-black border border-purple-200 flex items-center justify-center gap-1.5 truncate transition-all shadow-2xs"
                                  title="Click to change delivery mode"
                                >
                                  <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span className="truncate">Porter Assigned</span>
                                </button>
                              ) : dem.delivery_mode === 'SELF_DELIVERY' || dem.delivery_partner_name === 'Admin Self Delivery' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssign(dem)}
                                  className="w-full max-w-[170px] px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-200 flex items-center justify-center gap-1.5 truncate transition-all shadow-2xs"
                                  title="Click to change delivery mode"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Self Delivery</span>
                                </button>
                              ) : dem.delivery_partner_name ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssign(dem)}
                                    className="w-full max-w-[170px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 truncate transition-all shadow-2xs"
                                    title="Click to reassign driver or view/update meter reading"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="truncate">{dem.delivery_partner_name}</span>
                                  </button>
                                  {(dem.total_km !== null && dem.total_km !== undefined) ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                                      <Gauge className="w-3 h-3 text-emerald-600" />
                                      {dem.total_km} KM
                                    </span>
                                  ) : (dem.start_km_reading !== null && dem.start_km_reading !== undefined) ? (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                                      <Gauge className="w-3 h-3 text-slate-400" />
                                      {dem.start_km_reading} KM Start
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssign(dem)}
                                  className="w-full max-w-[170px] px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black border border-dashed border-amber-300 flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95"
                                  title="Click to assign driver, porter, or self delivery"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Assign Mode</span>
                                </button>
                              )}
                            </div>

                            {/* Col 4: Live Status & Quick Action Movement Points (col-span-2) */}
                            <div className="lg:col-span-2 flex flex-col items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                              {isDelivered ? (
                                <span className="w-full max-w-[160px] py-1 px-2 rounded-xl text-[11px] font-black border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center justify-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Delivered
                                </span>
                              ) : dem.delivery_status === 'REJECTED' ? (
                                <span className="w-full max-w-[160px] py-1 px-2 rounded-xl text-[11px] font-black border bg-rose-50 text-rose-800 border-rose-200 flex items-center justify-center gap-1 shadow-2xs">
                                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Rejected
                                </span>
                              ) : dem.delivery_status === 'ARRIVED' ? (
                                <div className="flex items-center gap-1 w-full max-w-[170px]">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(dem.id, 'DELIVERED')}
                                    className="flex-1 py-1 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1"
                                    title="Click to mark physically delivered"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Delivered
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(dem.id, 'REJECTED')}
                                    className="py-1 px-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 transition-all"
                                    title="Click to reject delivery"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : isOut ? (
                                <div className="flex items-center gap-1 w-full max-w-[170px]">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(dem.id, 'ARRIVED')}
                                    className="flex-1 py-1 px-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1"
                                    title="Mark arrived at institution gate"
                                  >
                                    <MapPin className="w-3 h-3" /> In at Gate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(dem.id, 'DELIVERED')}
                                    className="py-1 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black shadow-2xs transition-all active:scale-95"
                                    title="Mark delivered"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="w-full max-w-[160px] py-1 px-2 rounded-xl text-[10px] font-black border bg-amber-50 text-amber-800 border-amber-200 flex items-center justify-center gap-1 text-center shadow-2xs truncate"
                                  title="Ready for Dispatch"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> Ready for Dispatch
                                </span>
                              )}
                            </div>

                            {/* Col 5: Actions Group (col-span-1) */}
                            <div className="lg:col-span-1 flex items-center justify-end gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                                title="Open Google Maps Navigation"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppAlert(dem)}
                                className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                                title="Send WhatsApp Alert to ANO"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {isDelivered && (
                                <Link
                                  to="/documentation"
                                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] transition-colors shadow-2xs flex items-center gap-1 shrink-0"
                                  title="View in Documentation (Summary Card & Verification)"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>Docs ↗</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* POPUP MODAL: Demand Delivery Summary Card (Pops up on click of list item) */}
      {selectedDemandForSummary && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setSelectedDemandForSummary(null)}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border-2 border-slate-200 flex flex-col max-h-[92vh]">
            
            {/* Top Accent Line matching the Summary Card in Screenshot */}
            <div
              className={`h-2.5 w-full ${
                selectedDemandForSummary.delivery_status === 'DELIVERED'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : selectedDemandForSummary.delivery_status === 'OUT_FOR_DELIVERY'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-gradient-to-r from-amber-400 to-orange-400'
              }`}
            />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                  {selectedDemandForSummary.demand_number}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                    selectedDemandForSummary.delivery_status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedDemandForSummary.delivery_status === 'OUT_FOR_DELIVERY'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {selectedDemandForSummary.delivery_status === 'DELIVERED' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                    </>
                  ) : selectedDemandForSummary.delivery_status === 'OUT_FOR_DELIVERY' ? (
                    <>
                      <Truck className="w-3 h-3 text-blue-600" /> Out for Delivery
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Ready for Dispatch
                    </>
                  )}
                </span>

                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-1">
                  <Calendar className="w-3 h-3" /> {formatDDMMYYYY(selectedDemandForSummary.demand_date)}
                  <Clock className="w-3 h-3 ml-1" /> {selectedDemandForSummary.demand_time || '08:00'}
                </div>
              </div>

              <button
                onClick={() => setSelectedDemandForSummary(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                title="Close Summary Card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Exact Replica of the High-Detail Summary Card */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Institution and Battalion */}
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase leading-snug tracking-tight">
                  {selectedDemandForSummary.institution_name}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {selectedDemandForSummary.unit_name} {selectedDemandForSummary.ncc_group ? `• ${selectedDemandForSummary.ncc_group}` : ''}
                </p>
              </div>

              {/* Physical Address, PIN, Google Maps & ANO Contact */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    PIN: {selectedDemandForSummary.pin_code || 'N/A'}
                  </span>

                  <a
                    href={getGoogleMapsUrl(selectedDemandForSummary)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xs transition-transform active:scale-95"
                    title="Open Google Maps Navigation for Delivery Driver"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {selectedDemandForSummary.complete_address || 'Address provided at institution registry.'}
                </p>

                {/* ANO Contact & WhatsApp Alert */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">ANO: {selectedDemandForSummary.ano_cto_name || 'Incharge'}</span>
                  {selectedDemandForSummary.ano_cto_contact ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${selectedDemandForSummary.ano_cto_contact}`}
                        className="font-black text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> {selectedDemandForSummary.ano_cto_contact}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppAlert(selectedDemandForSummary)}
                        className="text-emerald-600 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition-colors"
                        title="Open WhatsApp Alert for ANO"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppAlert(selectedDemandForSummary)}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 hover:underline"
                      title="Share delivery details via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Share WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {/* Refreshments Quantity & Delivery Partner Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                    REFRESHMENTS
                  </div>
                  <div className="text-base font-black text-indigo-950 mt-1">
                    {selectedDemandForSummary.total_quantity || 0} Packets
                  </div>
                  <div className="text-[11px] font-bold text-indigo-700 mt-0.5">
                    ₹{(selectedDemandForSummary.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div
                  className={`border rounded-2xl p-3.5 text-center cursor-pointer transition-colors ${
                    selectedDemandForSummary.delivery_partner_name
                      ? 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/80'
                      : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/80'
                  }`}
                  onClick={() => handleOpenAssign(selectedDemandForSummary)}
                  title="Click to assign or change delivery partner"
                >
                  <div
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      selectedDemandForSummary.delivery_partner_name ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    DELIVERY PARTNER
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1 truncate">
                    {selectedDemandForSummary.delivery_partner_name || '+ Assign Driver'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {selectedDemandForSummary.delivery_partner_name ? 'Click to change' : 'Not assigned yet'}
                  </div>
                </div>
              </div>

              {/* Partner Vehicle, Phone & Meter Readings if assigned */}
              {selectedDemandForSummary.delivery_partner_name && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="font-bold truncate">
                      Vehicle: {selectedDemandForSummary.delivery_partner_vehicle || 'DL-01-AB-1234 (Eco Van)'}
                    </span>
                    {selectedDemandForSummary.delivery_partner_phone && (
                      <a
                        href={`tel:${selectedDemandForSummary.delivery_partner_phone}`}
                        className="font-black text-blue-600 flex items-center gap-1 shrink-0 ml-2"
                      >
                        <Phone className="w-3.5 h-3.5" /> {selectedDemandForSummary.delivery_partner_phone}
                      </a>
                    )}
                  </div>

                  {(selectedDemandForSummary.start_km_reading != null || selectedDemandForSummary.total_km != null) && (
                    <div className="text-xs bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Odometer Log</div>
                          <div className="text-slate-700 font-bold text-[11px] mt-0.5">
                            {selectedDemandForSummary.start_km_reading != null && `Start: ${selectedDemandForSummary.start_km_reading} km`}
                            {selectedDemandForSummary.closing_km_reading != null && ` • Close: ${selectedDemandForSummary.closing_km_reading} km`}
                          </div>
                        </div>
                      </div>
                      {selectedDemandForSummary.total_km != null && (
                        <div className="text-right">
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Total Traveled</div>
                          <div className="text-sm font-black text-emerald-700">{selectedDemandForSummary.total_km} KM</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions & Movement Points */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenAssign(selectedDemandForSummary)}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-xs rounded-xl transition-all shadow-2xs"
              >
                {selectedDemandForSummary.delivery_partner_name ? 'Re-Assign Mode' : 'Assign Mode'}
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsAppAlert(selectedDemandForSummary)}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                title="Send WhatsApp Alert to ANO"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              {/* Admin Live Movement Control Buttons */}
              {selectedDemandForSummary.delivery_status === 'OUT_FOR_DELIVERY' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedDemandForSummary.id, 'ARRIVED')}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                    title="Mark arrived at institution gate"
                  >
                    <MapPin className="w-3.5 h-3.5" /> In at Gate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedDemandForSummary.id, 'DELIVERED')}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                    title="Mark delivered"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                  </button>
                </>
              ) : selectedDemandForSummary.delivery_status === 'ARRIVED' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedDemandForSummary.id, 'DELIVERED')}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                    title="Mark delivered"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedDemandForSummary.id, 'REJECTED')}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1"
                    title="Reject delivery"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              ) : selectedDemandForSummary.delivery_status === 'DELIVERED' ? (
                <span className="py-2 px-3 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-default border border-emerald-200 ml-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered & Completed
                </span>
              ) : selectedDemandForSummary.delivery_status === 'REJECTED' ? (
                <span className="py-2 px-3 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-default border border-rose-200 ml-auto">
                  <X className="w-3.5 h-3.5" /> Delivery Rejected
                </span>
              ) : (
                <span className="py-2 px-3.5 bg-slate-100 text-slate-500 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-not-allowed ml-auto">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Ready for Dispatch
                </span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: Assign Delivery Partner */}
      {assignModalOpen && selectedDemandForAssign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Assign Delivery Partner</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedDemandForAssign.demand_number} • {selectedDemandForAssign.institution_name}
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Specs & Location PIN */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-bold block">No. of Refreshments:</span>
                  <span className="font-black text-indigo-900 text-sm">
                    {selectedDemandForAssign.total_quantity} Packets
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Delivery PIN Code:</span>
                  <span className="font-black text-rose-700 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    PIN {selectedDemandForAssign.pin_code || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              {/* Delivery Mode Selection Tabs */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Select Delivery Fulfillment Mode *
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('DRIVER');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      deliveryMode === 'DRIVER'
                        ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Driver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('PORTER');
                      setAssignPartnerId('');
                      setCustomPartnerName('Handled by Porter');
                      setCustomPartnerPhone('Porter Staff');
                      setCustomVehicleNo('Porter Transport');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      deliveryMode === 'PORTER'
                        ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Porter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('SELF_DELIVERY');
                      setAssignPartnerId('');
                      setCustomPartnerName('Admin Self Delivery');
                      setCustomPartnerPhone('');
                      setCustomVehicleNo('Admin Direct Handover');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      deliveryMode === 'SELF_DELIVERY'
                        ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Self Delivery</span>
                  </button>
                </div>
              </div>

              {/* Mode Specific Body */}
              {deliveryMode === 'DRIVER' ? (
                partners.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black text-slate-700">
                        Select Driver *
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">
                        {partners.length} Available
                      </span>
                    </div>
                    <select
                      value={assignPartnerId}
                      onChange={(e) => handlePartnerSelect(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      <option value="">-- Choose Driver or Type Below --</option>
                      {displayedDrivers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.phone}) — {p.vehicle_no || 'Vehicle'} [{p.vehicle_model || 'Van'}] {p.assigned_pins ? `• PINs: ${p.assigned_pins}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    No registered driver partners found. Please add a driver in Partners Registry or choose Porter / Self Delivery mode.
                  </div>
                )
              ) : deliveryMode === 'PORTER' ? (
                <div className="bg-purple-50/80 p-3.5 rounded-2xl border border-purple-200 space-y-1.5 text-xs text-purple-900">
                  <div className="font-black flex items-center gap-1.5 text-purple-800">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Porter Mode Active</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
                    Details of porter not required. Order will be marked as <strong>"Porter Assigned"</strong>. Live tracking movement points (In Transit → In at Gate → Delivered / Rejected) are managed directly from the Admin console.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5 text-xs text-emerald-900">
                  <div className="font-black flex items-center gap-1.5 text-emerald-800">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Self Delivery Mode Active</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                    Admin direct handover to institution/unit. Order will be marked as <strong>"Self Delivery"</strong>. Live tracking movement points (In Transit → In at Gate → Delivered / Rejected) are managed directly from the Admin console.
                  </p>
                </div>
              )}

              {/* Delivery Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Delivery Instructions / Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Gate No. 2, handover to Cadet Senior at ground..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
                >
                  {assigning ? 'Dispatching...' : 'Dispatch Only'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveAssignment(e, true)}
                  disabled={assigning}
                  className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {assigning ? 'Dispatching...' : 'Dispatch & WhatsApp ANO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manage Delivery Partners */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Delivery Partners Registry</h3>
                  <p className="text-xs text-slate-500 font-medium">Add and manage refreshment delivery drivers</p>
                </div>
              </div>
              <button
                onClick={() => setPartnerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Existing Partners */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Registered Drivers</h4>
              {partners.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-3 text-center bg-slate-50 rounded-xl">
                  No registered delivery partners yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {partners.map(p => (
                    <div key={p.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-black text-slate-900">{p.name}</div>
                        <div className="text-slate-500 font-medium flex items-center gap-3 mt-0.5">
                          <span>Phone: {p.phone}</span>
                          <span>Vehicle: {p.vehicle_no || 'N/A'}</span>
                        </div>
                        {p.assigned_pins && (
                          <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                            Assigned PINs: {p.assigned_pins}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to Add New Partner */}
            <form onSubmit={handleCreatePartner} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Add New Delivery Partner</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Partner / Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9811223344"
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle Description</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-02-CD-5678 (Van)"
                    value={newPartnerVehicle}
                    onChange={(e) => setNewPartnerVehicle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Preferred PIN Codes</label>
                  <input
                    type="text"
                    placeholder="e.g. 110010, 110021"
                    value={newPartnerPins}
                    onChange={(e) => setNewPartnerPins(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPartner ? 'Saving...' : '+ Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MISSING KM MODAL */}
      {missingKmModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-emerald-50">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-emerald-900 text-sm">Odometer Reading Required</h3>
              </div>
              <button onClick={() => setMissingKmModal({ ...missingKmModal, open: false })} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
                <strong className="text-slate-800">{missingKmModal.partnerName}</strong> does not have a Start KM recorded for today. Please enter the starting odometer reading to proceed with dispatch.
              </p>
              
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Today's Start KM</label>
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  placeholder={`Suggested: ${missingKmModal.suggestedKm} KM`}
                  value={missingKmModal.startKmInput}
                  onChange={(e) => setMissingKmModal({ ...missingKmModal, startKmInput: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
                  <span>Last recorded closing meter:</span>
                  <span className="font-bold text-slate-700">{missingKmModal.suggestedKm} KM</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMissingKmModal({ ...missingKmModal, open: false })}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMissingKmSubmit}
                  className="flex-1 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-transform active:scale-95"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY DELIVERY RUN SHEET / GATE PASS (Hidden on screen, rendered on Print) */}
      <div className="hidden print:block font-sans p-6 text-black">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">National Cadet Corps (NCC)</h1>
          <h2 className="text-base font-bold text-slate-700">Refreshment Physical Delivery Run Sheet & Gate Pass</h2>
          <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-xs border p-3 rounded">
          <div><strong>Total Stops:</strong> {filteredDemands.length} Institutions</div>
          <div><strong>Total Refreshments:</strong> {filteredDemands.reduce((s, d) => s + (Number(d.total_quantity) || 0), 0)} Packets</div>
          <div><strong>PIN Filter:</strong> {selectedPin === 'ALL' ? 'All PINs' : selectedPin}</div>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Demand Ref</th>
              <th className="p-2 border">Institution & Address</th>
              <th className="p-2 border">PIN</th>
              <th className="p-2 border">ANO Contact</th>
              <th className="p-2 border text-center">Packets</th>
              <th className="p-2 border">Assigned Driver</th>
              <th className="p-2 border">ANO Signature</th>
            </tr>
          </thead>
          <tbody>
            {filteredDemands.map((dem, idx) => (
              <tr key={dem.id} className="border-b border-slate-200">
                <td className="p-2 border text-center">{idx + 1}</td>
                <td className="p-2 border font-mono font-bold">{dem.demand_number}</td>
                <td className="p-2 border">
                  <div className="font-bold">{dem.institution_name}</div>
                  <div className="text-[10px] text-slate-600">{dem.complete_address}</div>
                </td>
                <td className="p-2 border font-bold">{dem.pin_code}</td>
                <td className="p-2 border">
                  <div>{dem.ano_cto_name}</div>
                  <div className="text-[10px]">{dem.ano_cto_contact}</div>
                </td>
                <td className="p-2 border text-center font-bold">{dem.total_quantity}</td>
                <td className="p-2 border">{dem.delivery_partner_name || 'Unassigned'}</td>
                <td className="p-2 border w-24"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between text-xs pt-8 border-t">
          <div>
            <div>_____________________________</div>
            <div className="font-bold mt-1">Vendor Dispatch Officer</div>
          </div>
          <div>
            <div>_____________________________</div>
            <div className="font-bold mt-1">Delivery Partner Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
