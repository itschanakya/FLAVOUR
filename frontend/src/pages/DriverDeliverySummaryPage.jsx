import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import {
  Truck, MapPin, Navigation, Phone, Calendar, Clock,
  CheckCircle2, AlertCircle, Package, RefreshCw, Search,
  ExternalLink, Printer, ClipboardList, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriverDeliverySummaryPage() {
  const { token, user } = useAuth();
  const { events } = useSSE();
  const navigate = useNavigate();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchDriverDemands = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/delivery/driver/demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDemands(Array.isArray(data) ? data : []);
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

  // Real-time SSE updates
  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.timestamp) {
      fetchDriverDemands();
    }
  }, [events?.DEMAND_UPDATED, events?.timestamp, fetchDriverDemands]);

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

  // Summary Metrics
  const totalStops = demands.length;
  const totalAssignedPackets = demands.reduce((acc, d) => acc + (Number(d.total_quantity) || 0), 0);
  const deliveredPackets = demands
    .filter(d => d.delivery_status === 'DELIVERED')
    .reduce((acc, d) => acc + (Number(d.total_quantity) || 0), 0);
  const completedStops = demands.filter(d => d.delivery_status === 'DELIVERED').length;
  const pendingStops = demands.filter(d => d.delivery_status !== 'DELIVERED').length;

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
        const unitMatch = (d.unit_name || '').toLowerCase().includes(term);
        const pinMatch = (d.pin_code || '').toLowerCase().includes(term);
        const demNumMatch = (d.demand_number || '').toLowerCase().includes(term);
        if (!instMatch && !unitMatch && !pinMatch && !demNumMatch) return false;
      }
      return true;
    });
  }, [demands, filterStatus, searchTerm]);

  const activeStop = demands.find(d => d.delivery_status === 'OUT_FOR_DELIVERY') || 
                     demands.find(d => d.delivery_status === 'ARRIVED') ||
                     demands.find(d => d.delivery_status === 'PENDING');

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* HEADER BANNER */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Driver Delivery Manifest
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Vehicle: <strong>{user?.vehicle_no || 'Standard Vehicle'}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Summary of Driver Delivery
          </h1>
          <p className="text-xs text-slate-300 font-medium">
            Institute, Unit, Packets Requisition, Date & Time, and Direct GPS Navigation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeStop && (
            <a
              href={getGoogleMapsUrl(activeStop)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              title={`Start GPS Navigation to next stop: ${activeStop.institution_name}`}
            >
              <Navigation className="w-4 h-4 fill-slate-950" />
              <span>Navigate Next Stop</span>
            </a>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>My Route & Packets</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 flex items-center transition-all"
            title="Print Delivery Manifest"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={fetchDriverDemands}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 flex items-center transition-all"
            title="Refresh Stops"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUICK STATS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Stops
          </span>
          <span className="text-2xl font-black text-slate-900">{totalStops}</span>
          <span className="text-xs text-slate-500 ml-1">Institutions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">
            Total Packets
          </span>
          <span className="text-2xl font-black text-indigo-700">{totalAssignedPackets}</span>
          <span className="text-xs text-slate-500 ml-1">Pkts Load</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">
            Pending Delivery
          </span>
          <span className="text-2xl font-black text-amber-600">{pendingStops}</span>
          <span className="text-xs text-slate-500 ml-1">Stops Left</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
            Delivered
          </span>
          <span className="text-2xl font-black text-emerald-600">{completedStops}</span>
          <span className="text-xs text-slate-500 ml-1">({deliveredPackets} Pkts)</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search school name, unit, PIN code, or demand ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'TRANSIT', 'ARRIVED', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'TRANSIT' ? 'In Transit' : st === 'ARRIVED' ? 'At Gate' : 'Delivered'}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY OF DRIVER DELIVERY TABLE */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              SUMMARY OF DRIVER DELIVERY
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredDemands.length} of {demands.length} Stops
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">INSTITUTE</th>
                <th className="py-3.5 px-4">UNIT</th>
                <th className="py-3.5 px-4 text-center">NO OF PACKETS</th>
                <th className="py-3.5 px-4">DATE AND TIME</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">NAVIGATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                    Loading delivery stops...
                  </td>
                </tr>
              ) : filteredDemands.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                    No delivery stops found.
                  </td>
                </tr>
              ) : (
                filteredDemands.map((dem, idx) => {
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
                      <td className="py-4 px-4 text-center font-black text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-900 text-xs uppercase">
                          {dem.institution_name || dem.unit_name || 'UNKNOWN'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>PIN: {dem.pin_code || 'N/A'}</span>
                          <span>•</span>
                          <span>Ref: #{dem.demand_number}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap" title={dem.unit_name}>
                          {dem.unit_code || dem.unit_name}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-xl bg-slate-900 text-amber-300 font-black text-xs shadow-2xs">
                          {dem.total_quantity || 0} Pkts
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
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
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isDelivered ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                            ✓ DELIVERED
                          </span>
                        ) : isArrived ? (
                          <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 font-black text-[10px] animate-pulse">
                            📍 AT GATE
                          </span>
                        ) : isTransit ? (
                          <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-black text-[10px]">
                            🚚 IN TRANSIT
                          </span>
                        ) : isRejected ? (
                          <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                            ❌ FAILED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-black text-[10px]">
                            📦 PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xs transition-all active:scale-95"
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
    </div>
  );
}
