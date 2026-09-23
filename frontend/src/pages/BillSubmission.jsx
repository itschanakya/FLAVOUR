import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Receipt, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2, BellRing, Sparkles } from 'lucide-react';

export default function BillSubmission() {
  const { token } = useAuth();
  const { events } = useSSE();
  const [billEvents, setBillEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token]);

  // Real-time update on notification or event change
  useEffect(() => {
    if (events?.NEW_NOTIFICATION || events?.DEMAND_UPDATED) {
      fetchEvents();
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/bill-collection/my-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBillEvents(data);
        } else {
          setBillEvents([]);
        }
      }
    } catch (err) {
      console.error('Fetch bill schedule error:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeEvents = Array.isArray(billEvents) ? billEvents : [];
  const delayedEvents = safeEvents.filter(e => e && e.status === 'DELAYED');
  const scheduledEvents = safeEvents.filter(e => e && e.status === 'SCHEDULED');

  return (
    <div className="w-full space-y-6">
      {/* Page Title Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bill Collection Visits</h1>
              {delayedEvents.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 rounded-full animate-pulse flex items-center gap-1">
                  <BellRing className="w-3 h-3" /> Delay Reported
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Physical bill collection schedules & live vendor notifications for your PIN area
            </p>
          </div>
        </div>

        <button
          onClick={fetchEvents}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Refresh Schedule
        </button>
      </div>

      {/* Live Notification Banner if Delay is reported */}
      {delayedEvents.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-5 rounded-3xl shadow-lg shadow-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-amber-200 animate-bounce" />
            Vendor Delay Notice Received
          </div>
          {delayedEvents.map(d => (
            <p key={d.id} className="text-xs font-bold text-amber-50 pl-7">
              • Visit scheduled on <strong className="text-white">{new Date(d.event_date).toLocaleDateString()}</strong> at <strong className="text-white">{d.event_time}</strong> for PIN ({d.target_pin_codes}): <span className="bg-white/20 px-2 py-0.5 rounded text-white">{d.message || 'Vendor is running late'}</span>
            </p>
          ))}
        </div>
      )}

      {/* Main Schedule List */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold text-xs animate-pulse">
          Loading active collection schedules...
        </div>
      ) : billEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center shadow-sm space-y-3">
          <Calendar className="w-16 h-16 text-slate-200 mx-auto" />
          <h2 className="text-lg font-extrabold text-slate-700">No Upcoming Bill Collections</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            There are currently no bill collection visits scheduled for your institution's PIN code.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {billEvents.map((ev) => {
            const isDelayed = ev.status === 'DELAYED';
            return (
              <div 
                key={ev.id} 
                className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row items-start gap-5 transition-all ${
                  isDelayed 
                    ? 'border-amber-300 ring-4 ring-amber-500/10 shadow-md shadow-amber-500/5' 
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <div className={`p-4 rounded-2xl shrink-0 ${isDelayed ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                  <Calendar className="w-7 h-7" />
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {new Date(ev.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-extrabold text-slate-500 mt-1">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {ev.event_time}</span>
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> PIN: {ev.target_pin_codes}</span>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      isDelayed 
                        ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {ev.status}
                    </span>
                  </div>

                  {ev.message && (
                    <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                      isDelayed 
                        ? 'bg-amber-50/80 text-amber-900 border border-amber-200/60' 
                        : 'bg-slate-50 text-slate-700 border border-slate-100'
                    }`}>
                      {isDelayed ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      <span>{ev.message}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
