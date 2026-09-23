import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Search, PlusCircle, AlertCircle, Send, FileText } from 'lucide-react';

export default function BillCollection() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [message, setMessage] = useState('');
  const [pinCodes, setPinCodes] = useState(''); // Comma separated

  const [delayModal, setDelayModal] = useState(null);
  const [delayMessage, setDelayMessage] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/bill-collection', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventDate || !eventTime) return alert("Date and Time are required");

    try {
      const res = await fetch('/api/bill-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          event_date: eventDate,
          event_time: eventTime,
          message,
          target_pin_codes: pinCodes || 'ALL'
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchEvents();
        setEventDate('');
        setEventTime('');
        setMessage('');
        setPinCodes('');
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to schedule event.");
    }
  };

  const handleDelay = async (e) => {
    e.preventDefault();
    if (!delayModal) return;

    try {
      const res = await fetch(`/api/bill-collection/${delayModal}/delay`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: delayMessage })
      });
      if (res.ok) {
        setDelayModal(null);
        setDelayMessage('');
        fetchEvents();
      }
    } catch (err) {
      alert("Failed to report delay.");
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Bill Collection Scheduler</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Schedule visits to collect physical bills from institutions.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Schedule Visit
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Target PINs</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No events scheduled.</td></tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" /> {new Date(ev.event_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-slate-400" /> {ev.event_time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                        <MapPin className="w-3 h-3" /> {ev.target_pin_codes}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        ev.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        ev.status === 'DELAYED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 max-w-xs truncate">{ev.message || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {ev.status === 'SCHEDULED' && (
                        <button 
                          onClick={() => setDelayModal(ev.id)}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          Report Delay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Schedule Visit
              </h3>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target PIN Codes (Comma separated)</label>
                <input type="text" value={pinCodes} onChange={e => setPinCodes(e.target.value)} placeholder="e.g. 110001, 110002 or leave blank for ALL" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Please keep the bills ready and signed by ANO." rows="3" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 resize-none"></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                  Schedule & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {delayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setDelayModal(null)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Report Delay
              </h3>
              <p className="text-xs text-slate-500 mt-1">Notify institutions that the vendor is running late.</p>
            </div>
            <form onSubmit={handleDelay} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delay Reason / Updated Time</label>
                <input type="text" value={delayMessage} onChange={e => setDelayMessage(e.target.value)} placeholder="e.g. Running 30 mins late due to traffic" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setDelayModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">
                  Send Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
