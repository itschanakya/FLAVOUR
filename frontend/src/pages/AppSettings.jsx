import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings, CalendarClock, Save, CheckCircle2, Key, Building2, School,
  Search, Edit3, ShieldAlert, X, ShoppingBag, Users, MapPin, ExternalLink,
  Truck, Plus, Trash2, Phone, ShieldCheck, Wifi, Eye, EyeOff, Boxes,
  Gauge, AlertCircle, Info, Navigation, Scale, Compass, Map, CalendarDays, History,
  Download, Upload, RotateCcw, DatabaseBackup, Lock, ShieldOff, FileJson
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ManageCatalog from './ManageCatalog';
import ManageUnits from './ManageUnits';
import CustomDateInput from '../components/CustomDateInput';
import DataBackupPanel from '../components/DataBackupPanel';

export const VEHICLE_PRESETS = {
  ECO: {
    type: 'ECO',
    name: 'Maruti Eeco / Eco Van',
    model: 'Maruti Eeco Cargo Van',
    capacity: 750,
    maxKm: 80,
    crates: '15 Standard Crates (50 Pkts/Crate)',
    badge: 'Standard Compact Van',
    color: 'from-blue-600 to-indigo-600',
    description: 'Optimal for multi-stop city routes & school clusters. Safe load: up to 750 packets per run/day with 80 km operational radius.'
  },
  MINI_TRUCK: {
    type: 'MINI_TRUCK',
    name: 'Tata Ace / Chota Hathi',
    model: 'Tata Ace Mini Truck',
    capacity: 1500,
    maxKm: 100,
    crates: '30 Standard Crates (50 Pkts/Crate)',
    badge: 'Mini Commercial Truck',
    color: 'from-amber-600 to-orange-600',
    description: 'High-capacity commercial mini-truck for heavy batch deliveries and consolidated supply points.'
  },
  THREE_WHEELER: {
    type: 'THREE_WHEELER',
    name: 'Three Wheeler / Auto Carrier',
    model: 'Piaggio Ape / Bajaj Maxima',
    capacity: 450,
    maxKm: 50,
    crates: '9 Standard Crates (50 Pkts/Crate)',
    badge: 'Auto Carrier Cargo',
    color: 'from-purple-600 to-indigo-600',
    description: 'Medium load carrier suited for narrow roads and dense urban institutions.'
  },
  TWO_WHEELER: {
    type: 'TWO_WHEELER',
    name: 'Delivery Bike / Two-Wheeler',
    model: 'Motorcycle with Carrier Box',
    capacity: 100,
    maxKm: 40,
    crates: '2 Thermal Boxes (50 Pkts/Box)',
    badge: 'Two-Wheeler Parcel Runner',
    color: 'from-emerald-600 to-teal-600',
    description: 'Rapid dispatch runner for small institutions or top-up demand deliveries.'
  },
  PICKUP_TRUCK: {
    type: 'PICKUP_TRUCK',
    name: 'Bolero Maxi Truck / Large Pickup',
    model: 'Mahindra Bolero Maxi Truck',
    capacity: 2500,
    maxKm: 150,
    crates: '50 Standard Crates (50 Pkts/Crate)',
    badge: 'Heavy Logistics Carrier',
    color: 'from-rose-600 to-red-600',
    description: 'Heavy duty long-haul carrier for wide-area or cross-district bulk institutional transfers.'
  },
  CUSTOM: {
    type: 'CUSTOM',
    name: 'Custom Fleet Vehicle',
    model: 'Custom Vehicle',
    capacity: 500,
    maxKm: 60,
    crates: 'Custom Capacity',
    badge: 'Custom Specification',
    color: 'from-slate-700 to-slate-900',
    description: 'Custom vehicle specifications configured manually by the driver or logistics administrator.'
  }
};

export const formatDDMMYYYY = (isoDate) => {
  if (!isoDate) return '';
  const clean = typeof isoDate === 'string' ? isoDate.split('T')[0] : '';
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
};

export default function AppSettings() {
  const { user, token } = useAuth();
  const role = user?.role || 'INSTITUTION';
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  // Active Tab defaults based on role
  const [activeTab, setActiveTab] = useState(
    (requestedTab && !(role === 'INSTITUTION' && requestedTab === 'my-account'))
      ? (requestedTab === 'inventory' ? 'stock' : requestedTab)
      : (role === 'ADMIN' ? 'units' : role === 'UNIT' ? 'inst-credentials' : role === 'DELIVERY' ? 'driver-account' : 'institution-details')
  );

  useEffect(() => {
    if (requestedTab) {
      if (role === 'INSTITUTION' && requestedTab === 'my-account') {
        setActiveTab('institution-details');
      } else if (requestedTab === 'inventory') {
        setActiveTab('stock');
      } else {
        setActiveTab(requestedTab);
      }
    } else if (role === 'DELIVERY') {
      setActiveTab('driver-account');
    }
  }, [requestedTab, role]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 0. Institution Profile & Details State
  const [institutionData, setInstitutionData] = useState({
    id: '',
    institution_name: '',
    ano_cto_name: '',
    ano_cto_contact: '',
    pin_code: '',
    google_location: '',
    complete_address: '',
    strength_1st_year: 0,
    strength_2nd_year: 0,
    strength_3rd_year: 0,
    ano_email: '',
    login_id: '',
    password: '',
    unit_name: '',
    unit_code: '',
    ncc_group: ''
  });

  // 1. Institution Schedule State
  const [schedule, setSchedule] = useState({
    first_demand_day: 'Wednesday',
    first_demand_time: '08:00',
    second_demand_day: 'Saturday',
    second_demand_time: '08:00'
  });

  // 2. Personal Credentials State (for "My Account" tab)
  const [myCreds, setMyCreds] = useState({
    email: '',
    login_id: '',
    password: ''
  });

  // 3. Admin: Units List & Edit Modal State
  const [unitsList, setUnitsList] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({
    unit_name: '',
    location: '',
    ncc_group: 'Group B',
    unit_email: '',
    login_id: '',
    password: ''
  });

  // 4. Unit: Institutions List & Edit Modal State
  const [instsList, setInstsList] = useState([]);
  const [editingInst, setEditingInst] = useState(null);
  const [instForm, setInstForm] = useState({
    institution_name: '',
    ano_cto_name: '',
    ano_cto_contact: '',
    ano_cto_email: '',
    login_id: '',
    password: ''
  });

  // 5. Admin: Delivery Partners & Reps State
  const [deliveryPartnersList, setDeliveryPartnersList] = useState([]);
  const [editingDeliveryPartner, setEditingDeliveryPartner] = useState(null);
  const [isAddingDeliveryPartner, setIsAddingDeliveryPartner] = useState(false);
  const [showPartnerPassword, setShowPartnerPassword] = useState(false);
  const [deliveryPartnerForm, setDeliveryPartnerForm] = useState({
    name: '',
    phone: '',
    vehicle_no: '',
    vehicle_type: 'ECO',
    vehicle_model: 'Maruti Eeco Cargo Van',
    load_capacity_packets: 750,
    max_travel_km: 80,
    rate_per_km: 0,
    assigned_pins: '',
    login_id: '',
    password: '',
    is_active: 1
  });

  // 6. Driver Profile & Vehicle Fleet Load Capacity State
  const [driverProfile, setDriverProfile] = useState({
    id: '',
    name: '',
    phone: '',
    login_id: '',
    vehicle_no: '',
    vehicle_type: 'ECO',
    vehicle_model: 'Maruti Eeco Cargo Van',
    load_capacity_packets: 750,
    max_travel_km: 80,
    assigned_pins: '',
    password: '',
    metrics: {
      assigned_stops: 0,
      total_load_packets: 0,
      delivered_packets: 0,
      remaining_packets: 0,
      load_capacity_packets: 750,
      remaining_vehicle_capacity: 750,
      utilization_percent: 0,
      is_overloaded: false
    }
  });

  // 7. Driver KM Logs State
  const [kmLogs, setKmLogs] = useState([]);
  const [kmLogDate, setKmLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingKm, setEditingKm] = useState({});
  const [kmStatsModal, setKmStatsModal] = useState({ open: false, driver: null, stats: null, recentLogs: [], loading: false });
  const [kmHistorySubTab, setKmHistorySubTab] = useState('daily-run'); // 'daily-run' or 'km-summary'

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchTabData();
  }, [user, activeTab]);

  const fetchTabData = async () => {
    setError('');
    setSearchTerm('');
    if (activeTab === 'institution-details' && role === 'INSTITUTION') {
      await fetchInstitutionData();
    } else if (activeTab === 'schedule' && role === 'INSTITUTION') {
      await fetchSchedule();
    } else if (activeTab === 'unit-credentials' && role === 'ADMIN') {
      await fetchUnits();
    } else if (activeTab === 'delivery-partners' && role === 'ADMIN') {
      await fetchDeliveryPartners();
    } else if (activeTab === 'inst-credentials' && role === 'UNIT') {
      await fetchInstitutions();
    } else if (activeTab === 'driver-account' && role === 'DELIVERY') {
      await fetchDriverProfile();
    } else if (activeTab === 'km-history' && role === 'ADMIN') {
      await fetchKmLogs(kmLogDate);
    } else if (activeTab === 'my-account' && role !== 'INSTITUTION') {
      await fetchMyCredentials();
    }
  };

  // Fetchers
  const fetchInstitutionData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        const inst = data[0];
        setInstitutionData({
          id: inst.id,
          institution_name: inst.institution_name || '',
          ano_cto_name: inst.ano_cto_name || '',
          ano_cto_contact: inst.ano_cto_contact || '',
          pin_code: inst.pin_code || '',
          google_location: inst.google_location || '',
          complete_address: inst.complete_address || '',
          strength_1st_year: inst.strength_1st_year || 0,
          strength_2nd_year: inst.strength_2nd_year || 0,
          strength_3rd_year: inst.strength_3rd_year || 0,
          ano_email: inst.ano_email || '',
          login_id: inst.login_id || '',
          password: '',
          unit_name: inst.unit_name || '',
          unit_code: inst.unit_code || '',
          ncc_group: inst.ncc_group || ''
        });
        setSchedule({
          first_demand_day: inst.first_demand_day || 'Wednesday',
          first_demand_time: inst.first_demand_time || '08:00',
          second_demand_day: inst.second_demand_day || 'Saturday',
          second_demand_time: inst.second_demand_time || '08:00'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstitutionData = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSaveSuccess(false);

      const targetId = institutionData.id || user?.institution_id;
      if (!targetId) throw new Error("Institution record not found.");

      const res = await fetch(`/api/institutions/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          institution_name: institutionData.institution_name,
          ano_cto_name: institutionData.ano_cto_name,
          ano_cto_contact: institutionData.ano_cto_contact,
          pin_code: institutionData.pin_code,
          google_location: institutionData.google_location,
          complete_address: institutionData.complete_address
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update institution details.');

      setSaveSuccess(true);
      await fetchInstitutionData();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        const inst = data.find(i => i.id == user?.institution_id) || data[0];
        setSchedule({
          first_demand_day: inst.first_demand_day || 'Wednesday',
          first_demand_time: inst.first_demand_time || '08:00',
          second_demand_day: inst.second_demand_day || 'Saturday',
          second_demand_time: inst.second_demand_time || '08:00'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUnitsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInstsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKmLogs = async (date) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/delivery/km-logs?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setKmLogs(data);
      } else {
        console.error('KM Logs error:', data?.error);
      }
    } catch (err) {
      console.error('Error fetching KM logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverKmStats = async (driverId) => {
    try {
      setKmStatsModal(prev => ({ ...prev, open: true, loading: true }));
      const res = await fetch(`/api/delivery/driver/${driverId}/km-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setKmStatsModal({ open: true, driver: data.driver, stats: data.stats, recentLogs: data.recentLogs, loading: false });
      } else {
        alert(data.error || 'Failed to fetch driver stats');
        setKmStatsModal({ open: false, driver: null, stats: null, recentLogs: [], loading: false });
      }
    } catch (err) {
      alert('Error fetching driver stats');
      setKmStatsModal({ open: false, driver: null, stats: null, recentLogs: [], loading: false });
    }
  };

  const handleStartKm = async (driverId, startKm) => {
    if (startKm === null || startKm === undefined || startKm === '') {
      return alert('Please enter a valid Start KM reading');
    }
    try {
      const res = await fetch('/api/delivery/km-logs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driver_id: driverId, log_date: kmLogDate, start_km: startKm })
      });
      if (res.ok) {
        setEditingKm(prev => ({ ...prev, [driverId]: { ...prev[driverId], start: false } }));
        fetchKmLogs(kmLogDate);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save Start KM');
      }
    } catch (err) {
      alert('Error saving Start KM');
    }
  };

  const handleEndKm = async (driverId, endKm) => {
    if (endKm === null || endKm === undefined || endKm === '') {
      return alert('Please enter a valid Closing KM reading');
    }
    try {
      const res = await fetch('/api/delivery/km-logs/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driver_id: driverId, log_date: kmLogDate, end_km: endKm })
      });
      if (res.ok) {
        setEditingKm(prev => ({ ...prev, [driverId]: { ...prev[driverId], end: false } }));
        fetchKmLogs(kmLogDate);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save Closing KM');
      }
    } catch (err) {
      alert('Error saving Closing KM');
    }
  };

  const fetchMyCredentials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/credentials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMyCreds({
          email: data.email || '',
          login_id: data.login_id || '',
          password: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Schedule Save
  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      setError('');
      setSaveSuccess(false);

      const targetInstId = user?.institution_id || institutionData.id;
      if (!targetInstId) {
        throw new Error('Institution ID could not be identified for this session.');
      }

      const res = await fetch(`/api/institutions/${targetInstId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(schedule)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save schedule');

      setSaveSuccess(true);
      await fetchSchedule();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // My Account Save
  const handleSaveMyAccount = async () => {
    try {
      setSaving(true);
      setError('');
      setSaveSuccess(false);

      const res = await fetch('/api/auth/credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(myCreds)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update credentials');

      setSaveSuccess(true);
      setMyCreds(prev => ({ ...prev, password: '' }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Admin: Open Edit Unit Modal
  const handleOpenEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      unit_name: unit.unit_name || '',
      unit_code: unit.unit_code || '',
      location: unit.location || '',
      ncc_group: unit.ncc_group || 'Group B',
      unit_email: unit.unit_email || '',
      login_id: unit.login_id || '',
      password: ''
    });
    setError('');
  };

  // Admin: Save Unit Credentials
  const handleSaveUnitCredentials = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/units/${editingUnit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(unitForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update unit credentials');

      setEditingUnit(null);
      fetchUnits();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Unit: Open Edit Institution Modal
  const handleOpenEditInst = (inst) => {
    setEditingInst(inst);
    setInstForm({
      institution_name: inst.institution_name || '',
      ano_cto_name: inst.ano_cto_name || '',
      ano_cto_contact: inst.ano_cto_contact || '',
      ano_cto_email: inst.ano_email || '',
      login_id: inst.login_id || '',
      password: ''
    });
    setError('');
  };

  // Unit: Save Institution Credentials
  const handleSaveInstCredentials = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/institutions/${editingInst.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          institution_name: instForm.institution_name,
          ano_cto_name: instForm.ano_cto_name,
          ano_cto_contact: instForm.ano_cto_contact,
          ano_cto_email: instForm.ano_cto_email,
          login_id: instForm.login_id,
          password: instForm.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update institution credentials');

      setEditingInst(null);
      fetchInstitutions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Admin: Delivery Partner Handlers
  const fetchDeliveryPartners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/delivery/partners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDeliveryPartnersList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDeliveryPartner = () => {
    setDeliveryPartnerForm({
      name: '',
      phone: '',
      vehicle_no: '',
      vehicle_type: 'ECO',
      vehicle_model: 'Maruti Eeco Cargo Van',
      load_capacity_packets: 750,
      max_travel_km: 80,
      rate_per_km: 0,
      assigned_pins: '',
      login_id: '',
      password: '',
      is_active: 1
    });
    setIsAddingDeliveryPartner(true);
    setEditingDeliveryPartner(null);
    setShowPartnerPassword(false);
    setError('');
  };

  const handleOpenEditDeliveryPartner = (partner) => {
    setEditingDeliveryPartner(partner);
    setIsAddingDeliveryPartner(false);
    setDeliveryPartnerForm({
      name: partner.name || '',
      phone: partner.phone || '',
      vehicle_no: partner.vehicle_no || '',
      vehicle_type: partner.vehicle_type || 'ECO',
      vehicle_model: partner.vehicle_model || 'Maruti Eeco Cargo Van',
      load_capacity_packets: partner.load_capacity_packets || 750,
      max_travel_km: partner.max_travel_km || 80,
      rate_per_km: partner.rate_per_km || 0,
      assigned_pins: partner.assigned_pins || '',
      login_id: partner.login_id || '',
      password: '',
      is_active: partner.is_active !== undefined ? partner.is_active : 1
    });
    setShowPartnerPassword(false);
    setError('');
  };

  // Driver Account Handlers
  const fetchDriverProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/delivery/driver/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriverProfile({
          ...data,
          password: ''
        });
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriverProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSaveSuccess(false);

      const res = await fetch('/api/delivery/driver/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: driverProfile.name,
          vehicle_no: driverProfile.vehicle_no,
          vehicle_type: driverProfile.vehicle_type,
          vehicle_model: driverProfile.vehicle_model,
          load_capacity_packets: driverProfile.load_capacity_packets,
          max_travel_km: driverProfile.max_travel_km,
          password: driverProfile.password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update vehicle settings');

      setSaveSuccess(true);
      setDriverProfile(prev => ({
        ...prev,
        ...data.driver,
        password: ''
      }));
      setTimeout(() => setSaveSuccess(false), 4000);
      fetchDriverProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDriverVehiclePresetChange = (presetKey) => {
    const preset = VEHICLE_PRESETS[presetKey];
    if (preset) {
      setDriverProfile(prev => ({
        ...prev,
        vehicle_type: preset.type,
        vehicle_model: preset.model,
        load_capacity_packets: preset.capacity,
        max_travel_km: preset.maxKm
      }));
    }
  };

  const handleAdminVehiclePresetChange = (presetKey) => {
    const preset = VEHICLE_PRESETS[presetKey];
    if (preset) {
      setDeliveryPartnerForm(prev => ({
        ...prev,
        vehicle_type: preset.type,
        vehicle_model: preset.model,
        load_capacity_packets: preset.capacity,
        max_travel_km: preset.maxKm
      }));
    }
  };

  const handleSaveDeliveryPartner = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const url = isAddingDeliveryPartner
        ? '/api/delivery/partners'
        : `/api/delivery/partners/${editingDeliveryPartner.id}`;
      const method = isAddingDeliveryPartner ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(deliveryPartnerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save delivery partner');

      setEditingDeliveryPartner(null);
      setIsAddingDeliveryPartner(false);
      fetchDeliveryPartners();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeliveryPartner = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove delivery partner "${name}"?`)) return;
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/delivery/partners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete partner');
      fetchDeliveryPartners();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists for search
  const filteredUnits = unitsList.filter(u =>
    (u.unit_name && u.unit_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.unit_code && u.unit_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.login_id && u.login_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.unit_email && u.unit_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInsts = instsList.filter(i =>
    (i.institution_name && i.institution_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.ano_cto_name && i.ano_cto_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.login_id && i.login_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.ano_email && i.ano_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDeliveryPartners = deliveryPartnersList.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.login_id && p.login_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.vehicle_no && p.vehicle_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.assigned_pins && p.assigned_pins.includes(searchTerm))
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[80vh]">
      {/* Left Sidebar - App Manager */}
      <div className="w-full md:w-64 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-6 shadow-sm">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">App Manager</h2>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                {role === 'ADMIN' ? 'Admin Console' : role === 'UNIT' ? 'Unit Console' : 'Institution'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {/* 1. ADMIN TABS */}
            {role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('units')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'units' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Manage NCC Units
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'inventory' || activeTab === 'catalog' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Boxes className="w-4 h-4 text-amber-600" />
                  Inventory
                </button>
                <button
                  onClick={() => setActiveTab('unit-credentials')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'unit-credentials' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Key className="w-4 h-4 text-amber-500" />
                  Units Login Credentials
                </button>
                <button
                  onClick={() => setActiveTab('delivery-partners')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'delivery-partners' ? 'bg-cyan-50 text-cyan-700 font-bold border border-cyan-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Truck className="w-4 h-4 text-cyan-600" />
                  Delivery Partners & Reps
                </button>
                <button
                  onClick={() => setActiveTab('km-history')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'km-history' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  Daily Run & KM Summary
                </button>
                <button
                  onClick={() => setActiveTab('my-account')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'my-account' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                  Admin My Account
                </button>
                <button
                  onClick={() => setActiveTab('data-backup')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'data-backup' ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <DatabaseBackup className="w-4 h-4 text-rose-600" />
                  Data Backup
                </button>
              </>
            )}

            {/* 2. UNIT TABS */}
            {role === 'UNIT' && (
              <>
                <button
                  onClick={() => setActiveTab('inst-credentials')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'inst-credentials' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Key className="w-4 h-4 text-blue-500" />
                  Institutions Login Credentials
                </button>
                <button
                  onClick={() => setActiveTab('my-account')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'my-account' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building2 className="w-4 h-4 text-amber-500" />
                  Unit My Account
                </button>
              </>
            )}

            {/* 3. INSTITUTION TABS */}
            {role === 'INSTITUTION' && (
              <>
                <button
                  onClick={() => setActiveTab('institution-details')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'institution-details' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <School className="w-4 h-4 text-indigo-500" />
                  Institution Details
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  Schedule of Refreshment
                </button>
              </>
            )}

            {/* 4. DELIVERY DRIVER TABS */}
            {role === 'DELIVERY' && (
              <>
                <button
                  onClick={() => setActiveTab('driver-account')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'driver-account' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200 shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Truck className="w-4 h-4 text-amber-600" />
                  Driver Account & Vehicle
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${activeTab === 'catalog' || activeTab === 'stock' ? 'py-3' : 'py-5'}`}>
            <div>
              <h1 className={`font-bold text-slate-800 ${activeTab === 'catalog' || activeTab === 'stock' ? 'text-lg' : 'text-xl'}`}>
                {activeTab === 'units' && 'Manage NCC Units (Battalions & Regiments)'}
                {activeTab === 'catalog' && 'Refreshment Catalog & Standard Packet'}
                {activeTab === 'inventory' && 'Inventory Management'}
                {activeTab === 'stock' && 'Stock Management'}
                {activeTab === 'unit-credentials' && 'Units Login Credentials & Access Control'}
                {activeTab === 'delivery-partners' && 'Delivery Partners & Delivery Reps (Logins & Vehicle Fleets)'}
                {activeTab === 'inst-credentials' && 'Institutions Login Credentials & ANO Passwords'}
                {activeTab === 'institution-details' && 'Institution Details & Delivery Address'}
                {activeTab === 'schedule' && 'Schedule of Refreshment'}
                {activeTab === 'my-account' && 'Account Settings & Login Credentials'}
                {activeTab === 'driver-account' && 'Driver Account & Fleet Load Capacity'}
                {activeTab === 'km-history' && 'Daily Run & KM Summary'}
                {activeTab === 'data-backup' && 'Data Backup & System Reset'}
              </h1>
              <p className={`text-slate-500 ${activeTab === 'catalog' || activeTab === 'stock' || activeTab === 'inventory' ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                {activeTab === 'units' && 'Onboard NCC Units, issue Unit logins & manage jurisdiction scopes.'}
                {(activeTab === 'catalog' || activeTab === 'inventory') && 'Configure catalog items, approved pricing, photos, and Standard ₹75 Refreshment Packet builder.'}
                {activeTab === 'stock' && 'Live stock balance ledger, batch expiry tracking, consumed today metrics, and incoming restock shipments.'}
                {activeTab === 'unit-credentials' && 'View, manage, and reset User ID & Passwords for all NCC Units under headquarters.'}
                {activeTab === 'delivery-partners' && 'Manage Delivery Representatives, Driver Login IDs, Passwords, Vehicle details, and Assigned PIN codes.'}
                {activeTab === 'inst-credentials' && 'Manage User ID, Login Emails & Passwords for ANOs/Schools under this NCC Unit.'}
                {activeTab === 'institution-details' && 'Update your official institution name, ANO/CTO incharge, contact phone, delivery PIN code, Google Maps GPS link, and complete address.'}
                {activeTab === 'schedule' && 'Configure your weekly default days and times for automatic demand placements.'}
                {activeTab === 'my-account' && 'Update your official login email address, username ID, or set a new password.'}
                {activeTab === 'driver-account' && 'Configure your vehicle fleet specifications, maximum daily load capacity (packets), travel distance range, and view real-time payload metrics.'}
                {activeTab === 'km-history' && 'Record and review daily starting and closing odometer readings for all fleet drivers.'}
                {activeTab === 'data-backup' && 'Export a full database backup, restore from a backup file, or reset all demand records.'}
              </p>
            </div>

            {/* Action Buttons & Search Bar */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {(activeTab === 'unit-credentials' || activeTab === 'inst-credentials' || activeTab === 'delivery-partners') && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, phone, user ID..."
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              )}
              {activeTab === 'delivery-partners' && (
                <button
                  onClick={handleOpenAddDeliveryPartner}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Onboard Delivery Rep
                </button>
              )}
              {activeTab === 'km-history' && (
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
                  <button
                    onClick={() => setKmHistorySubTab('daily-run')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${kmHistorySubTab === 'daily-run' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  >
                    <Truck className="w-4 h-4" />
                    Daily Run
                  </button>
                  <button
                    onClick={() => setKmHistorySubTab('km-summary')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${kmHistorySubTab === 'km-summary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  >
                    <History className="w-4 h-4" />
                    KM Summary
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div>
                {/* 0. ADMIN: MANAGE UNITS */}
                {activeTab === 'units' && (
                  <ManageUnits embedded={true} />
                )}

                {/* 0.1 ADMIN: INVENTORY (ITEMS, RATES, PACKETS) */}
                {(activeTab === 'inventory' || activeTab === 'catalog') && (
                  <ManageCatalog embedded={true} initialView="catalog" />
                )}

                {/* 1. ADMIN: UNITS CREDENTIALS TABLE */}
                {activeTab === 'unit-credentials' && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-4">Unit Name</th>
                            <th className="p-4">Unit Code</th>
                            <th className="p-4">Official Email</th>
                            <th className="p-4">User ID / Login ID</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUnits.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-slate-500">
                                No Units found matching your query.
                              </td>
                            </tr>
                          ) : (
                            filteredUnits.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-amber-500" />
                                  {u.unit_name}
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-600">{u.unit_code}</td>
                                <td className="p-4 text-slate-600">{u.unit_email || 'Not configured'}</td>
                                <td className="p-4">
                                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                    {u.login_id || 'N/A'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleOpenEditUnit(u)}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                    Edit Credentials / Password
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 1.5 ADMIN: DELIVERY PARTNERS & REPS CREDENTIALS TABLE */}
                {activeTab === 'delivery-partners' && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-4">Delivery Rep / Partner</th>
                            <th className="p-4">Mobile / Contact</th>
                            <th className="p-4">Vehicle Details</th>
                            <th className="p-4">User ID / Login ID</th>
                            <th className="p-4">Assigned PIN Codes</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDeliveryPartners.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="p-8 text-center text-slate-500">
                                No Delivery Partners found matching your search.
                              </td>
                            </tr>
                          ) : (
                            filteredDeliveryPartners.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 font-bold text-slate-900">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs shrink-0">
                                      <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">{p.name}</div>
                                      <div className="text-[11px] text-slate-400 font-mono">ID: #{p.id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-1.5 text-slate-700 font-mono font-medium">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {p.phone || 'N/A'}
                                  </div>
                                </td>
                                <td className="p-4 text-slate-600 font-medium">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 text-xs">
                                        {p.vehicle_model || 'Maruti Eeco Cargo Van'}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold">
                                        {p.vehicle_no || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                                        Capacity: {p.load_capacity_packets || 750} Pkts/Day
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold">
                                        {p.max_travel_km || 80} km
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
                                    {p.login_id || p.phone}
                                  </span>
                                </td>
                                <td className="p-4">
                                  {p.assigned_pins ? (
                                    <div className="flex flex-wrap gap-1">
                                      {p.assigned_pins.split(',').map((pin, i) => (
                                        <span key={i} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                          {pin.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">All PINs</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {p.is_active ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                      Inactive
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenEditDeliveryPartner(p)}
                                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                      <Key className="w-3.5 h-3.5" />
                                      Edit / Reset Password
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDeliveryPartner(p.id, p.name)}
                                      title="Delete or Deactivate Delivery Rep"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 1.6 ADMIN: DAILY RUN & KM SUMMARY */}
                {activeTab === 'km-history' && (
                  <div className="space-y-6">
                    {kmHistorySubTab === 'daily-run' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-slate-700">Select Date:</label>
                            <div className="w-44">
                              <CustomDateInput
                                value={kmLogDate}
                                onChange={(newDate) => {
                                  setKmLogDate(newDate);
                                  fetchKmLogs(newDate);
                                }}
                                compact={true}
                                className="!text-sm !font-bold !py-2 !px-3 !bg-white !border-slate-300 shadow-sm"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => fetchKmLogs(kmLogDate)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                            title="Refresh Data"
                          >
                            <History className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th className="p-4">Driver & Vehicle</th>
                                  <th className="p-4 w-48">Day Start KM</th>
                                  <th className="p-4 w-48">Day End KM</th>
                                  <th className="p-4 text-center">Total KM</th>
                                  <th className="p-4 text-center">Rate / KM</th>
                                  <th className="p-4 text-center">Total Amount</th>
                                  <th className="p-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {kmLogs.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                                      No drivers found.
                                    </td>
                                  </tr>
                                ) : (
                                  kmLogs.map((log) => (
                                    <tr key={log.driver_id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="p-4 align-top">
                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                          <Truck className="w-4 h-4 text-emerald-500" />
                                          {log.driver_name}
                                          {log.is_active === 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                                          <span>{log.vehicle_no || 'No Vehicle'}</span>
                                        </div>
                                      </td>

                                      <td className="p-4 align-top">
                                        {log.start_km !== null && !editingKm[log.driver_id]?.start ? (
                                          <div className="flex items-center gap-2">
                                            <div className="font-mono font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg inline-block border border-slate-200">
                                              {log.start_km} KM
                                            </div>
                                            <button
                                              onClick={() => setEditingKm(prev => ({ ...prev, [log.driver_id]: { ...prev[log.driver_id], start: true } }))}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              title="Edit Start KM"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 15000"
                                                id={`start_km_${log.driver_id}`}
                                                defaultValue={log.start_km !== null ? log.start_km : (log.suggested_start_km || '')}
                                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleStartKm(log.driver_id, e.target.value);
                                                }}
                                              />
                                              {editingKm[log.driver_id]?.start && (
                                                <button
                                                  onClick={() => {
                                                    const val = document.getElementById(`start_km_${log.driver_id}`).value;
                                                    handleStartKm(log.driver_id, val);
                                                  }}
                                                  className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                                                >
                                                  <Save className="w-4 h-4" />
                                                </button>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                              Suggested: {log.suggested_start_km || 0} KM
                                            </div>
                                          </div>
                                        )}
                                      </td>

                                      <td className="p-4 align-top">
                                        {log.end_km !== null && !editingKm[log.driver_id]?.end ? (
                                          <div className="flex items-center gap-2">
                                            <div className="font-mono font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block border border-emerald-200">
                                              {log.end_km} KM
                                            </div>
                                            <button
                                              onClick={() => setEditingKm(prev => ({ ...prev, [log.driver_id]: { ...prev[log.driver_id], end: true } }))}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              title="Edit End KM"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              step="0.1"
                                              placeholder="e.g. 15120"
                                              id={`end_km_${log.driver_id}`}
                                              defaultValue={log.end_km !== null ? log.end_km : ''}
                                              disabled={log.start_km === null}
                                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:opacity-50"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleEndKm(log.driver_id, e.target.value);
                                              }}
                                            />
                                            {editingKm[log.driver_id]?.end && (
                                              <button
                                                onClick={() => {
                                                  const val = document.getElementById(`end_km_${log.driver_id}`).value;
                                                  handleEndKm(log.driver_id, val);
                                                }}
                                                className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                                              >
                                                <Save className="w-4 h-4" />
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td className="p-4 text-center align-top">
                                        {log.total_km !== null ? (
                                          <span className="font-black text-emerald-600 text-sm">
                                            {log.total_km} KM
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-xs font-medium">--</span>
                                        )}
                                      </td>

                                      <td className="p-4 text-center align-top">
                                        {log.rate_per_km > 0 ? (
                                          <span className="px-2 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded text-xs font-bold">
                                            ₹{log.rate_per_km}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-xs font-medium">--</span>
                                        )}
                                      </td>

                                      <td className="p-4 text-center align-top">
                                        {log.total_km !== null && log.rate_per_km > 0 ? (
                                          <span className="font-bold text-emerald-800 text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                            ₹{(log.total_km * log.rate_per_km).toFixed(2)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-xs font-medium">--</span>
                                        )}
                                      </td>

                                      <td className="p-4 text-right align-top">
                                        <div className="flex flex-col items-end gap-2">
                                          {log.start_km === null ? (
                                            <button
                                              onClick={() => {
                                                const val = document.getElementById(`start_km_${log.driver_id}`).value;
                                                handleStartKm(log.driver_id, val);
                                              }}
                                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                                            >
                                              Log Start KM
                                            </button>
                                          ) : log.end_km === null ? (
                                            <button
                                              onClick={() => {
                                                const val = document.getElementById(`end_km_${log.driver_id}`).value;
                                                handleEndKm(log.driver_id, val);
                                              }}
                                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
                                            >
                                              Log Closing KM
                                            </button>
                                          ) : (
                                            <span className="text-xs font-black text-emerald-500 px-2 py-1 bg-emerald-50 rounded-md">✓ COMPLETED</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-6">
                        {/* Driver Slicer */}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {kmLogs.length === 0 ? (
                            <div className="text-slate-500 text-sm font-medium">No drivers found.</div>
                          ) : (
                            kmLogs.map(driver => (
                              <button
                                key={`slicer_${driver.driver_id}`}
                                onClick={() => fetchDriverKmStats(driver.driver_id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${kmStatsModal.driver?.name === driver.driver_name
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
                                  }`}
                              >
                                <Truck className={`w-4 h-4 ${kmStatsModal.driver?.name === driver.driver_name ? 'text-blue-600' : 'text-slate-400'}`} />
                                <div className="text-left">
                                  <div className="text-sm font-bold">{driver.driver_name}</div>
                                  <div className="text-[10px] font-medium opacity-80">{driver.vehicle_no || 'No Vehicle'}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        {/* Inline Stats Section */}
                        {kmStatsModal.loading ? (
                          <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        ) : kmStatsModal.stats && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-6">
                            {/* Tabular Aggregations */}
                            <div>
                              <h4 className="text-xs font-black text-slate-800 mb-2 uppercase tracking-wide text-slate-500">Summary</h4>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Today */}
                                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
                                  <div className="bg-blue-50/80 border-b border-blue-100 px-3 py-1.5">
                                    <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Today</div>
                                  </div>
                                  <div className="p-3">
                                    <div className="text-lg font-black text-slate-800 leading-none mb-1 flex items-baseline gap-1">
                                      {kmStatsModal.stats.today} <span className="text-[10px] text-slate-400 font-bold">KM</span>
                                    </div>
                                    {kmStatsModal.driver?.rate_per_km > 0 && (
                                      <div className="text-[11px] font-bold text-slate-500 mt-1">₹{(kmStatsModal.stats.today * kmStatsModal.driver.rate_per_km).toFixed(2)}</div>
                                    )}
                                  </div>
                                </div>
                                {/* This Week */}
                                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
                                  <div className="bg-indigo-50/80 border-b border-indigo-100 px-3 py-1.5">
                                    <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">This Week</div>
                                  </div>
                                  <div className="p-3">
                                    <div className="text-lg font-black text-slate-800 leading-none mb-1 flex items-baseline gap-1">
                                      {kmStatsModal.stats.week} <span className="text-[10px] text-slate-400 font-bold">KM</span>
                                    </div>
                                    {kmStatsModal.driver?.rate_per_km > 0 && (
                                      <div className="text-[11px] font-bold text-slate-500 mt-1">₹{(kmStatsModal.stats.week * kmStatsModal.driver.rate_per_km).toFixed(2)}</div>
                                    )}
                                  </div>
                                </div>
                                {/* This Month */}
                                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
                                  <div className="bg-violet-50/80 border-b border-violet-100 px-3 py-1.5">
                                    <div className="text-[10px] font-black uppercase text-violet-700 tracking-wider">This Month</div>
                                  </div>
                                  <div className="p-3">
                                    <div className="text-lg font-black text-slate-800 leading-none mb-1 flex items-baseline gap-1">
                                      {kmStatsModal.stats.month} <span className="text-[10px] text-slate-400 font-bold">KM</span>
                                    </div>
                                    {kmStatsModal.driver?.rate_per_km > 0 && (
                                      <div className="text-[11px] font-bold text-slate-500 mt-1">₹{(kmStatsModal.stats.month * kmStatsModal.driver.rate_per_km).toFixed(2)}</div>
                                    )}
                                  </div>
                                </div>
                                {/* All-Time */}
                                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
                                  <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5">
                                    <div className="text-[10px] font-black uppercase text-slate-700 tracking-wider">All-Time</div>
                                  </div>
                                  <div className="p-3">
                                    <div className="text-lg font-black text-slate-800 leading-none mb-1 flex items-baseline gap-1">
                                      {kmStatsModal.stats.allTime} <span className="text-[10px] text-slate-400 font-bold">KM</span>
                                    </div>
                                    {kmStatsModal.driver?.rate_per_km > 0 && (
                                      <div className="text-[11px] font-bold text-slate-500 mt-1">₹{(kmStatsModal.stats.allTime * kmStatsModal.driver.rate_per_km).toFixed(2)}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recent Logs Table */}
                            <div>
                              <h4 className="text-xs font-black text-slate-800 mb-2 uppercase tracking-wide flex items-center gap-1.5 text-slate-500">
                                <CalendarDays className="w-3.5 h-3.5" /> Recent Activity
                              </h4>
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="max-h-32 overflow-y-auto scrollbar-thin">
                                  <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0">
                                      <tr>
                                        <th className="px-3 py-2">Date</th>
                                        <th className="px-3 py-2">Start</th>
                                        <th className="px-3 py-2">End</th>
                                        <th className="px-3 py-2 text-right">Dist.</th>
                                        <th className="px-3 py-2 text-right">Amt.</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {kmStatsModal.recentLogs.length === 0 ? (
                                        <tr>
                                          <td colSpan="5" className="px-3 py-4 text-center text-slate-500 text-[11px] font-bold">No recent logs found.</td>
                                        </tr>
                                      ) : (
                                        kmStatsModal.recentLogs.map((log, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors text-[11px]">
                                            <td className="px-3 py-2 font-mono font-medium text-slate-700">{formatDDMMYYYY(log.log_date)}</td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{log.start_km !== null ? log.start_km : '--'}</td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{log.end_km !== null ? log.end_km : '--'}</td>
                                            <td className="px-3 py-2 text-right">
                                              {log.total_km !== null ? (
                                                <span className="font-black text-emerald-600">{log.total_km}</span>
                                              ) : '--'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {log.total_km !== null && kmStatsModal.driver?.rate_per_km > 0 ? (
                                                <span className="font-bold text-slate-600 text-[11px]">₹{(log.total_km * kmStatsModal.driver.rate_per_km).toFixed(2)}</span>
                                              ) : '--'}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ DATA BACKUP TAB ═══ */}
                {activeTab === 'data-backup' && role === 'ADMIN' && (
                  <DataBackupPanel token={token} />
                )}

                {/* 2. UNIT: INSTITUTIONS CREDENTIALS TABLE */}
                {activeTab === 'inst-credentials' && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-4">Institution Name</th>
                            <th className="p-4">ANO / CTO Incharge</th>
                            <th className="p-4">ANO Login Email</th>
                            <th className="p-4">User ID / Login ID</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredInsts.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-slate-500">
                                No institutions found under this unit.
                              </td>
                            </tr>
                          ) : (
                            filteredInsts.map((inst) => (
                              <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                                  <School className="w-4 h-4 text-blue-600" />
                                  {inst.institution_name}
                                </td>
                                <td className="p-4 text-slate-800 font-medium">{inst.ano_cto_name}</td>
                                <td className="p-4 text-slate-600 font-mono text-xs">{inst.ano_email || 'Not configured'}</td>
                                <td className="p-4">
                                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                                    {inst.login_id || 'N/A'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleOpenEditInst(inst)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                    Edit Credentials / Password
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2.5 INSTITUTION: INSTITUTION DETAILS & PROFILE FORM */}
                {activeTab === 'institution-details' && role === 'INSTITUTION' && (
                  <form onSubmit={handleSaveInstitutionData} className="space-y-6 max-w-3xl">
                    {saveSuccess && (
                      <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-3 text-sm font-semibold shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        Institution details and cadet strength updated successfully!
                      </div>
                    )}

                    {/* Quick Preview Card */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                          <School className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-slate-900">
                            {institutionData.institution_name || 'Institution Name'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>NCC Unit: <strong className="text-slate-700">{institutionData.unit_name || 'NCC Unit'}</strong> ({institutionData.ncc_group || 'Group B'})</span>
                            {institutionData.pin_code && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-100 flex items-center gap-1">
                                📍 PIN {institutionData.pin_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {institutionData.ano_cto_name && (
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block font-semibold">ANO / CTO Incharge</span>
                          <span className="font-bold text-slate-800">{institutionData.ano_cto_name}</span>
                          {institutionData.ano_cto_contact && (
                            <span className="text-slate-500 block">{institutionData.ano_cto_contact}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Official Institution Details Form */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5 shadow-sm">
                      {/* Institution Name */}
                      <div>
                        <label className="block text-slate-800 text-sm font-semibold mb-1.5">
                          Institution Name
                        </label>
                        <input
                          type="text"
                          required
                          value={institutionData.institution_name}
                          onChange={(e) => setInstitutionData({ ...institutionData, institution_name: e.target.value })}
                          placeholder="e.g. St. Joseph University"
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>

                      {/* ANO / CTO Name and Contact Phone (2-col grid) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-800 text-sm font-semibold mb-1.5">
                            ANO / CTO Name
                          </label>
                          <input
                            type="text"
                            required
                            value={institutionData.ano_cto_name}
                            onChange={(e) => setInstitutionData({ ...institutionData, ano_cto_name: e.target.value })}
                            placeholder="Lt. Rajesh Kumar"
                            className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-800 text-sm font-semibold mb-1.5">
                            Contact Phone
                          </label>
                          <input
                            type="text"
                            value={institutionData.ano_cto_contact}
                            onChange={(e) => setInstitutionData({ ...institutionData, ano_cto_contact: e.target.value })}
                            placeholder="+91 9876543210"
                            className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                          />
                        </div>
                      </div>

                      {/* PIN Code * (6-digit area PIN for bill collection routing) */}
                      <div>
                        <label className="block text-slate-800 text-sm font-semibold mb-1.5">
                          PIN Code <span className="text-rose-500">*</span>
                          <span className="text-xs font-normal text-slate-400 ml-1.5">(6-digit area PIN for bill collection routing)</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          pattern="[0-9]{6}"
                          value={institutionData.pin_code}
                          onChange={(e) => setInstitutionData({ ...institutionData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          placeholder="e.g. 560001"
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono tracking-widest text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                        />
                        {institutionData.pin_code && institutionData.pin_code.length < 6 && (
                          <p className="text-[11px] text-amber-600 mt-1 font-semibold">PIN must be exactly 6 digits ({6 - institutionData.pin_code.length} more needed)</p>
                        )}
                      </div>

                      {/* Google Location (Map Link) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-slate-800 text-sm font-semibold">
                            Google Location (Map Link)
                          </label>
                          {institutionData.google_location && (
                            <a
                              href={institutionData.google_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1"
                            >
                              Open in Maps ↗
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          value={institutionData.google_location}
                          onChange={(e) => setInstitutionData({ ...institutionData, google_location: e.target.value })}
                          placeholder="https://maps.google.com/..."
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                      </div>

                      {/* Complete Address */}
                      <div>
                        <label className="block text-slate-800 text-sm font-semibold mb-1.5">
                          Complete Address
                        </label>
                        <textarea
                          rows={3}
                          value={institutionData.complete_address}
                          onChange={(e) => setInstitutionData({ ...institutionData, complete_address: e.target.value })}
                          placeholder="Enter full address of the institution"
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Sanctioned Cadet Strengths - READ ONLY (Not Editable by Institution) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-base font-bold text-slate-800">
                              Sanctioned Cadet Strengths (Vacancy Quota)
                            </h3>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              Assigned by Unit • View Only
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Defines maximum allowable cadet headcount for refreshments</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Quota</span>
                          <span className="text-lg font-extrabold text-emerald-600">
                            {(parseInt(institutionData.strength_1st_year) || 0) + (parseInt(institutionData.strength_2nd_year) || 0) + (parseInt(institutionData.strength_3rd_year) || 0)} Cadets
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                          <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">1st Year Strength</label>
                          <div className="w-full p-2.5 rounded-lg bg-white border border-blue-200 text-center font-bold text-blue-700 text-lg shadow-sm select-none">
                            {institutionData.strength_1st_year || 0}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-center">
                          <label className="block text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">2nd Year Strength</label>
                          <div className="w-full p-2.5 rounded-lg bg-white border border-indigo-200 text-center font-bold text-indigo-700 text-lg shadow-sm select-none">
                            {institutionData.strength_2nd_year || 0}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-center">
                          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-2">3rd Year Strength</label>
                          <div className="w-full p-2.5 rounded-lg bg-white border border-purple-200 text-center font-bold text-purple-700 text-lg shadow-sm select-none">
                            {institutionData.strength_3rd_year || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving Details...' : 'Save Institution Details'}
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. INSTITUTION: SCHEDULE OF REFRESHMENT */}
                {activeTab === 'schedule' && role === 'INSTITUTION' && (
                  <div className="space-y-8 max-w-2xl">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        First Demand Configuration
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Day of Week</label>
                          <select
                            value={schedule.first_demand_day}
                            onChange={(e) => setSchedule({ ...schedule, first_demand_day: e.target.value })}
                            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                          >
                            {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time</label>
                          <input
                            type="time"
                            value={schedule.first_demand_time}
                            onChange={(e) => setSchedule({ ...schedule, first_demand_time: e.target.value })}
                            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        Second Demand Configuration
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Day of Week</label>
                          <select
                            value={schedule.second_demand_day}
                            onChange={(e) => setSchedule({ ...schedule, second_demand_day: e.target.value })}
                            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                          >
                            {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time</label>
                          <input
                            type="time"
                            value={schedule.second_demand_time}
                            onChange={(e) => setSchedule({ ...schedule, second_demand_time: e.target.value })}
                            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {saveSuccess && (
                          <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold animate-fade-in-up">
                            <CheckCircle2 className="w-4 h-4" />
                            Schedule Saved Successfully
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleSaveSchedule}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70"
                      >
                        {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Save Schedule'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. MY ACCOUNT (PERSONAL CREDENTIALS - ADMIN & UNIT ONLY) */}
                {activeTab === 'my-account' && role !== 'INSTITUTION' && (
                  <div className="space-y-6 max-w-xl">
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1.5 text-sm">Account Login Email</label>
                        <input
                          type="email"
                          required
                          value={myCreds.email}
                          onChange={(e) => setMyCreds({ ...myCreds, email: e.target.value })}
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1.5 text-sm">Login ID / Username</label>
                        <input
                          type="text"
                          required
                          value={myCreds.login_id}
                          onChange={(e) => setMyCreds({ ...myCreds, login_id: e.target.value })}
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1.5 text-sm">Change Password</label>
                        <input
                          type="password"
                          value={myCreds.password}
                          onChange={(e) => setMyCreds({ ...myCreds, password: e.target.value })}
                          placeholder="Leave blank to keep unchanged"
                          className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {saveSuccess && (
                          <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold animate-fade-in-up">
                            <CheckCircle2 className="w-4 h-4" />
                            Account Updated Successfully
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleSaveMyAccount}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70"
                      >
                        {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                        {saving ? 'Updating...' : 'Update My Account'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. DELIVERY DRIVER: DRIVER ACCOUNT & FLEET LOAD CAPACITY */}
                {activeTab === 'driver-account' && (
                  <div className="space-y-6 max-w-4xl">
                    {saveSuccess && (
                      <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Driver profile, fleet vehicle specifications, and load capacity updated successfully!</span>
                      </div>
                    )}

                    {/* TOP VEHICLE HERO CARD WITH LOAD STATUS */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border-2 border-slate-800 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-black text-white">
                                {driverProfile.vehicle_model || 'Maruti Eeco Cargo Van'}
                              </h2>
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                                {VEHICLE_PRESETS[driverProfile.vehicle_type]?.badge || 'Fleet Vehicle'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                              <span>Reg: <strong>{driverProfile.vehicle_no || 'DL-01-AB-1234'}</strong></span>
                              <span>•</span>
                              <span>Driver: <strong>{driverProfile.name}</strong> ({driverProfile.phone})</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active Delivery Fleet
                          </span>
                        </div>
                      </div>

                      {/* 4-Stat Capacity Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block mb-1">
                            One Load Capacity
                          </span>
                          <div className="text-2xl font-black text-white">
                            {driverProfile.load_capacity_packets || 750}
                            <span className="text-xs font-bold text-slate-300 ml-1">Pkts/Day</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {VEHICLE_PRESETS[driverProfile.vehicle_type]?.crates || 'Standard Day Load'}
                          </span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 block mb-1">
                            Max Travel Distance
                          </span>
                          <div className="text-2xl font-black text-white">
                            {driverProfile.max_travel_km || 80}
                            <span className="text-xs font-bold text-slate-300 ml-1">km/Day</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Safe operating route radius
                          </span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block mb-1">
                            Today's Assigned Load
                          </span>
                          <div className="text-2xl font-black text-white">
                            {driverProfile.metrics?.total_load_packets || 0}
                            <span className="text-xs font-bold text-slate-300 ml-1">Pkts</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Across {driverProfile.metrics?.assigned_stops || 0} Delivery Stops
                          </span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block mb-1">
                            Remaining Capacity
                          </span>
                          <div className="text-2xl font-black text-emerald-300">
                            {driverProfile.metrics?.remaining_vehicle_capacity ?? (driverProfile.load_capacity_packets || 750)}
                            <span className="text-xs font-bold text-slate-300 ml-1">Pkts Free</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {driverProfile.metrics?.utilization_percent || 0}% Utilized
                          </span>
                        </div>
                      </div>

                      {/* Live Load Progress Meter */}
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-300">
                            Daily Vehicle Payload Gauge: {driverProfile.metrics?.total_load_packets || 0} / {driverProfile.load_capacity_packets || 750} Packets
                          </span>
                          <span className={driverProfile.metrics?.is_overloaded ? "text-rose-400 font-black" : "text-amber-300 font-black"}>
                            {driverProfile.metrics?.utilization_percent || 0}% Capacity Loaded
                          </span>
                        </div>

                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${driverProfile.metrics?.is_overloaded
                              ? 'bg-rose-500'
                              : (driverProfile.metrics?.utilization_percent || 0) > 85
                                ? 'bg-amber-400'
                                : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                              }`}
                            style={{ width: `${Math.min(100, driverProfile.metrics?.utilization_percent || 0)}%` }}
                          />
                        </div>

                        {driverProfile.metrics?.is_overloaded ? (
                          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs flex items-center gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                              <strong>Warning - Vehicle Overloaded:</strong> Current load ({driverProfile.metrics?.total_load_packets} Pkts) exceeds the rated {driverProfile.load_capacity_packets} Pkts capacity of {driverProfile.vehicle_model}. Please split stops or dispatch with a Mini Truck.
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Safe Load: Vehicle is operating within safe physical weight and cargo bay volume limits.</span>
                          </div>
                        )}
                      </div>
                    </div>




                    {/* DRIVER & VEHICLE EDIT FORM */}
                    <form onSubmit={handleSaveDriverProfile} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <Truck className="w-4 h-4 text-indigo-600" />
                          Update Driver Fleet Vehicle & Credentials
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">ID: #{driverProfile.id || user?.id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Vehicle Fleet Category *</label>
                          <select
                            value={driverProfile.vehicle_type}
                            onChange={(e) => handleDriverVehiclePresetChange(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {Object.entries(VEHICLE_PRESETS).map(([key, preset]) => (
                              <option key={key} value={key}>
                                {preset.name} ({preset.capacity} Pkts / {preset.maxKm} km)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Vehicle Model Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Maruti Eeco Cargo Van"
                            value={driverProfile.vehicle_model}
                            onChange={(e) => setDriverProfile({ ...driverProfile, vehicle_model: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Vehicle Registration Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. DL-01-AB-1234"
                            value={driverProfile.vehicle_no}
                            onChange={(e) => setDriverProfile({ ...driverProfile, vehicle_no: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">
                            One Load Capacity (Packets per Day) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="10"
                              max="10000"
                              placeholder="e.g. 750"
                              value={driverProfile.load_capacity_packets}
                              onChange={(e) => setDriverProfile({ ...driverProfile, load_capacity_packets: parseInt(e.target.value, 10) || 0 })}
                              className="w-full p-3 pr-16 rounded-xl border border-slate-200 bg-white text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              Pkts/Day
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Maximum refreshment packets vehicle can carry in one run. E.g. Maruti Eeco = 750.
                          </span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Max Daily Travel Distance (km) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="5"
                              max="1000"
                              placeholder="e.g. 80"
                              value={driverProfile.max_travel_km}
                              onChange={(e) => setDriverProfile({ ...driverProfile, max_travel_km: parseInt(e.target.value, 10) || 0 })}
                              className="w-full p-3 pr-16 rounded-xl border border-slate-200 bg-white text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              km/Day
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Operating radius allowed per day across school stops. E.g. Maruti Eeco = 80 km.
                          </span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Driver Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rajesh Kumar"
                            value={driverProfile.name}
                            onChange={(e) => setDriverProfile({ ...driverProfile, name: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Mobile Phone (Login ID)</label>
                          <input
                            type="tel"
                            disabled
                            value={driverProfile.phone}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">Login ID is linked to official mobile number.</span>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">Change Password</label>
                          <input
                            type="text"
                            placeholder="Leave blank to keep unchanged"
                            value={driverProfile.password || ''}
                            onChange={(e) => setDriverProfile({ ...driverProfile, password: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">Enter a new password to reset it.</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                          <span>{saving ? 'Saving...' : 'Save Vehicle & Account Settings'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN: EDIT UNIT CREDENTIALS MODAL */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Edit Unit Credentials</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingUnit.unit_name} ({editingUnit.unit_code})</p>
                </div>
              </div>
              <button onClick={() => setEditingUnit(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveUnitCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit Email Address</label>
                <input
                  type="email"
                  required
                  value={unitForm.unit_email}
                  onChange={(e) => setUnitForm({ ...unitForm, unit_email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">User ID / Login ID</label>
                <input
                  type="text"
                  required
                  value={unitForm.login_id}
                  onChange={(e) => setUnitForm({ ...unitForm, login_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reset Password</label>
                <input
                  type="text"
                  value={unitForm.password}
                  onChange={(e) => setUnitForm({ ...unitForm, password: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Enter a new password to reset it for this Unit.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  {saving ? 'Updating...' : 'Save Unit Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIT: EDIT INSTITUTION CREDENTIALS MODAL */}
      {editingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Edit Institution Credentials</h3>
                  <p className="text-xs text-slate-500">{editingInst.institution_name}</p>
                </div>
              </div>
              <button onClick={() => setEditingInst(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveInstCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ANO / CTO Login Email</label>
                <input
                  type="email"
                  required
                  value={instForm.ano_cto_email}
                  onChange={(e) => setInstForm({ ...instForm, ano_cto_email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">User ID / Login ID</label>
                <input
                  type="text"
                  required
                  value={instForm.login_id}
                  onChange={(e) => setInstForm({ ...instForm, login_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reset Password</label>
                <input
                  type="text"
                  value={instForm.password}
                  onChange={(e) => setInstForm({ ...instForm, password: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Enter a new password to reset it for this Institution.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInst(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20"
                >
                  {saving ? 'Updating...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN: ADD OR EDIT DELIVERY PARTNER / REP CREDENTIALS MODAL */}
      {(isAddingDeliveryPartner || editingDeliveryPartner) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {isAddingDeliveryPartner ? 'Onboard New Delivery Partner / Rep' : 'Edit Delivery Partner Credentials'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAddingDeliveryPartner ? 'Create driver profile, vehicle details, and secure login access' : `${editingDeliveryPartner.name} (ID: #${editingDeliveryPartner.id})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddingDeliveryPartner(false); setEditingDeliveryPartner(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveDeliveryPartner} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name / Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={deliveryPartnerForm.name}
                    onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone (Login / OTP) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={deliveryPartnerForm.phone}
                    onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">User ID / Login ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DRIVER_DELHI or 9876543210"
                    value={deliveryPartnerForm.login_id}
                    onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, login_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAddingDeliveryPartner ? 'Password *' : 'Reset Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPartnerPassword ? "text" : "password"}
                      required={isAddingDeliveryPartner}
                      placeholder={isAddingDeliveryPartner ? "Enter secure password" : "Leave blank to keep unchanged"}
                      value={deliveryPartnerForm.password}
                      onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, password: e.target.value })}
                      className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isAddingDeliveryPartner && (
                    <span className="text-[11px] text-slate-400 mt-1 block">Enter a new password to reset it for this driver.</span>
                  )}
                </div>
              </div>

              {/* Vehicle Preset & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Preset Category</label>
                  <select
                    value={deliveryPartnerForm.vehicle_type || 'ECO'}
                    onChange={(e) => handleAdminVehiclePresetChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(VEHICLE_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name} ({preset.capacity} Pkts / {preset.maxKm} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maruti Eeco Cargo Van"
                    value={deliveryPartnerForm.vehicle_model}
                    onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, vehicle_model: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
              </div>

              {/* Load Capacity & Max Travel Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    One Load Capacity (Packets/Day) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="10"
                      max="10000"
                      placeholder="750"
                      value={deliveryPartnerForm.load_capacity_packets}
                      onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, load_capacity_packets: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-2.5 pr-14 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-black"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      Pkts/Day
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Maruti Eeco = 750 (15 Crates × 50 Pkts)</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Max Travel Distance (km/Day) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="5"
                      max="1000"
                      placeholder="80"
                      value={deliveryPartnerForm.max_travel_km}
                      onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, max_travel_km: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-2.5 pr-14 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-black"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      km/Day
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Safe morning multi-stop route radius</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-01-AB-1234"
                    value={deliveryPartnerForm.vehicle_no}
                    onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, vehicle_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Rate Per KM (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      placeholder="e.g. 10"
                      value={deliveryPartnerForm.rate_per_km}
                      onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, rate_per_km: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 pl-8 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-black"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned PIN Codes (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. 110001, 110003, 110010"
                  value={deliveryPartnerForm.assigned_pins}
                  onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, assigned_pins: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="driverActiveToggle"
                  checked={Boolean(deliveryPartnerForm.is_active)}
                  onChange={(e) => setDeliveryPartnerForm({ ...deliveryPartnerForm, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                />
                <label htmlFor="driverActiveToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active for Deliveries (Driver can sign in and accept drop-offs)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddingDeliveryPartner(false); setEditingDeliveryPartner(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/20"
                >
                  {saving ? 'Saving...' : (isAddingDeliveryPartner ? 'Onboard Delivery Partner' : 'Save Driver Credentials')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

