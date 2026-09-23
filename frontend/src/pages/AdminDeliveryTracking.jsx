import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, Clock, Map, Navigation, ArrowRight, User, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const formatDMY = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

function AdminDeliveryTracking() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Fetch Drivers
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/delivery/partners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch drivers');
      const activeDrivers = data.filter(d => d.is_active === 1);
      setDrivers(activeDrivers);
      if (activeDrivers.length > 0 && !selectedDriver) {
        setSelectedDriver(activeDrivers[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Demands for Selected Driver
  useEffect(() => {
    if (selectedDriver) {
      fetchDriverDemands(selectedDriver.id);
    } else {
      setDemands([]);
    }
  }, [selectedDriver]);

  const fetchDriverDemands = async (partnerId, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/delivery/driver/demands?partner_id=${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch demands');
      
      // Filter for active demands or today's demands
      setDemands(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Parse timeline events based on demands
  const buildTimeline = () => {
    if (!demands || demands.length === 0) return [];
    
    // Sort demands by sequence and status
    const sorted = [...demands].sort((a, b) => {
      if (a.delivery_sequence !== b.delivery_sequence) return a.delivery_sequence - b.delivery_sequence;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const timeline = [];

    // 1. Warehouse Departure
    // Find the earliest dispatched_at time
    const dispatchedDemands = sorted.filter(d => d.dispatched_at);
    if (dispatchedDemands.length > 0) {
      const earliestDispatch = dispatchedDemands.reduce((min, d) => 
        new Date(d.dispatched_at) < new Date(min.dispatched_at) ? d : min
      , dispatchedDemands[0]);

      // Calculate total packets for the trip
      const totalPackets = sorted.reduce((sum, d) => sum + (parseInt(d.total_quantity) || 0), 0);

      timeline.push({
        id: 'warehouse_start',
        type: 'DEPARTURE',
        title: 'Started Route from Warehouse',
        time: new Date(earliestDispatch.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: formatDMY(earliestDispatch.dispatched_at),
        icon: <Map className="w-4 h-4 text-indigo-600" />,
        bgColor: 'bg-indigo-100',
        lineColor: 'bg-indigo-500',
        demand: { total_quantity: totalPackets } // Add this so it renders in the card
      });
    }

    // 2. Deliveries
    sorted.forEach((dem) => {
      let type, title, time, date, icon, bgColor, lineColor;
      const demandDate = formatDMY(dem.demand_date);

      if (dem.delivery_status === 'DELIVERED') {
        type = 'DELIVERED';
        title = `Delivered at ${dem.institution_name}`;
        const t = dem.delivered_at ? new Date(dem.delivered_at) : null;
        time = t ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time';
        date = t ? formatDMY(t) : demandDate;
        icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
        bgColor = 'bg-emerald-100';
        lineColor = 'bg-emerald-500';
      } else if (dem.delivery_status === 'ARRIVED') {
        type = 'ARRIVED';
        title = `Arrived at ${dem.institution_name}`;
        time = 'Currently At Location';
        date = demandDate;
        icon = <MapPin className="w-4 h-4 text-amber-600" />;
        bgColor = 'bg-amber-100';
        lineColor = 'bg-amber-400';
      } else if (dem.delivery_status === 'OUT_FOR_DELIVERY') {
        type = 'IN_TRANSIT';
        title = `In Transit to ${dem.institution_name}`;
        const t = dem.dispatched_at ? new Date(dem.dispatched_at) : null;
        time = t ? `Left previous stop at ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In Transit';
        date = demandDate;
        icon = <Truck className="w-4 h-4 text-blue-600" />;
        bgColor = 'bg-blue-100';
        lineColor = 'bg-blue-400 border border-blue-400 border-dashed';
      } else {
        type = 'PENDING';
        title = `Pending: ${dem.institution_name}`;
        time = `Scheduled: ${dem.demand_time}`;
        date = demandDate;
        icon = <Clock className="w-4 h-4 text-slate-400" />;
        bgColor = 'bg-slate-100';
        lineColor = 'bg-slate-300';
      }

      timeline.push({
        id: `dem_${dem.id}`,
        type, title, time, date, icon, bgColor, lineColor,
        demand: dem
      });
    });

    return timeline;
  };

  const timelineEvents = buildTimeline();

  // Calculate Odometer Stats
  let startKm = null;
  let currentKm = null;
  if (demands && demands.length > 0) {
    const started = demands.filter(d => d.start_odometer_reading);
    if (started.length > 0) {
      startKm = Math.min(...started.map(d => parseInt(d.start_odometer_reading) || Infinity));
    }
    const delivered = demands.filter(d => d.delivery_odometer_reading);
    if (delivered.length > 0) {
      currentKm = Math.max(...delivered.map(d => parseInt(d.delivery_odometer_reading) || 0));
    }
  }
  const totalDistance = (startKm !== null && currentKm !== null && currentKm > startKm) ? currentKm - startKm : 0;
  
  const totalPackets = demands.reduce((sum, d) => sum + (parseInt(d.total_quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col md:flex-row justify-start items-start md:items-center mb-6 gap-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Navigation className="w-7 h-7 text-indigo-600" />
              Live Delivery Tracking
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Monitor active drivers and delivery routes in real-time.
            </p>
          </div>
          
          <button 
            onClick={() => selectedDriver && fetchDriverDemands(selectedDriver.id, true)}
            disabled={refreshing || !selectedDriver}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 mt-2 md:mt-0"
          >
            {refreshing ? (
              <span className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            Refresh Status
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 font-medium text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR: DRIVERS LIST (20% WIDTH) */}
          <div className="w-full lg:w-[20%] shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col sticky top-20">
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                  Active Fleet
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {drivers.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] custom-scrollbar divide-y divide-slate-50 p-2 space-y-1.5">
                {loading && !drivers.length ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading...</div>
                ) : drivers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No drivers.</div>
                ) : (
                  drivers.map(driver => (
                    <button
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2 border ${
                        selectedDriver?.id === driver.id 
                          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm' 
                          : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        selectedDriver?.id === driver.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs truncate">{driver.name}</div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Truck className="w-2.5 h-2.5" /> {driver.vehicle_no || 'No Vehicle'}
                        </div>
                      </div>
                      {selectedDriver?.id === driver.id && (
                        <ArrowRight className="w-3 h-3 text-indigo-500 ml-auto shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE TIMELINE (80% WIDTH) */}
          <div className="w-full lg:w-[80%]">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
              
              {/* Timeline Header */}
              {selectedDriver && (
                <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/30 rounded-t-3xl">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {selectedDriver.name}'s Current Route
                    </h2>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                      <Truck className="w-4 h-4" /> {selectedDriver.vehicle_model} ({selectedDriver.vehicle_no})
                    </p>
                  </div>
                  
                  {/* Center Odometer Stats */}
                  <div className="flex-1 flex justify-center min-w-[300px]">
                    <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-full px-5 py-2 gap-5">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Reading</span>
                        <span className="text-sm font-black text-slate-700">{startKm !== null ? startKm : '--'} <span className="text-[10px] font-semibold text-slate-400">km</span></span>
                      </div>
                      
                      <div className="flex flex-col items-center px-5 border-x border-slate-100">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Trip Distance</span>
                        <span className="text-base font-black text-indigo-600">{totalDistance > 0 ? totalDistance : '--'} <span className="text-xs font-semibold text-indigo-400">km</span></span>
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Reading</span>
                        <span className="text-sm font-black text-slate-700">{currentKm !== null ? currentKm : '--'} <span className="text-[10px] font-semibold text-slate-400">km</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {demands.filter(d => d.delivery_status === 'DELIVERED').length} / {demands.length} Delivered
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline Body */}
              <div className="p-6 md:p-8 flex-1">
                {loading && !refreshing ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                    <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Locating driver...
                  </div>
                ) : !selectedDriver ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                    Select a driver from the left to view their live route.
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium flex-col gap-2">
                    <Navigation className="w-8 h-8 opacity-50" />
                    No active route or demands found for {selectedDriver.name}.
                  </div>
                ) : (
                  <div className="flex flex-row overflow-x-auto pb-10 pt-6 px-4 gap-0 w-full custom-scrollbar">
                    {timelineEvents.map((event, index) => {
                      const isLast = index === timelineEvents.length - 1;
                      return (
                        <div key={event.id} className="relative flex-1 min-w-[200px] shrink-0 pb-2">
                          {/* Horizontal Line */}
                          {!isLast && (
                            <div className={`absolute top-[1.15rem] left-1/2 w-full h-0.5 ${event.lineColor} z-0`} />
                          )}
                          
                          {/* Icon Node */}
                          <div className={`relative w-8 h-8 md:w-9 md:h-9 rounded-full ${event.bgColor} border-4 border-white shadow-sm flex items-center justify-center z-10 mx-auto mb-4`}>
                            {event.icon}
                          </div>

                          {/* Content */}
                          <div className={`mx-2 bg-white border rounded-2xl p-3 shadow-sm transition-all hover:shadow-md ${
                            event.type === 'IN_TRANSIT' ? 'border-blue-200 ring-2 ring-blue-50' : 
                            event.type === 'ARRIVED' ? 'border-amber-200 ring-2 ring-amber-50' : 
                            'border-slate-200'
                          }`}>
                            <div className="flex flex-col gap-0.5 mb-2">
                              <h3 className={`font-black text-[11px] md:text-xs text-center line-clamp-2 min-h-[32px] leading-tight ${
                                event.type === 'DELIVERED' ? 'text-emerald-900' :
                                event.type === 'IN_TRANSIT' ? 'text-blue-900' :
                                event.type === 'ARRIVED' ? 'text-amber-900' : 'text-slate-700'
                              }`}>
                                {event.title}
                              </h3>
                              <div className="text-center mt-1">
                                <span className="block text-xs font-bold text-slate-900">{event.time}</span>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase tracking-wider">{event.date}</span>
                              </div>
                            </div>
                            
                            {event.demand && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col items-center gap-1 text-[10px]">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <span className="font-bold">Items:</span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-mono">{event.demand.total_quantity} pkts</span>
                                </div>
                                {(event.type === 'DELIVERED' && event.demand.delivery_odometer_reading) && (
                                  <div className="flex items-center gap-1 text-slate-600">
                                    <span className="font-bold">Odo:</span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-mono">{event.demand.delivery_odometer_reading} km</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDeliveryTracking;
