import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const { events } = useSSE();

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
    const interval = setInterval(() => {
      if (token) fetchNotifications();
    }, 30000); // poll every 30s as fallback
    return () => clearInterval(interval);
  }, [token]);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Pleasant double-chime (Ding-Dong) sound
      const now = audioCtx.currentTime;

      // Note 1: High chime (E6 ~ 1318.5 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: Lower chime (B5 ~ 987.77 Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.log('Audio play blocked or unavailable:', e);
    }
  };

  useEffect(() => {
    if (events?.NEW_NOTIFICATION) {
      playBeep();
      fetchNotifications();
    }
  }, [events?.NEW_NOTIFICATION]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => n.id === id ? { ...n, is_read: 1 } : n) : []);
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, is_read: 1 })) : []);
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await fetch(`/api/notifications/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications', error);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link_url) {
      navigate(notif.link_url);
    }
    setIsOpen(false);
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => n && !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all duration-300 ${
          unreadCount > 0 
            ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60 hover:scale-105'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Bell className={`w-5 h-5 sm:w-6 sm:h-6 ${unreadCount > 0 ? 'animate-ring drop-shadow-md' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 bg-white text-rose-600 text-[10px] font-black rounded-full ring-2 ring-rose-500 flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              {safeNotifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-80 p-2 space-y-1">
            {safeNotifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No notifications
              </div>
            ) : (
              safeNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${notif.is_read ? 'bg-transparent hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm ${notif.is_read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{notif.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                    {!notif.is_read && (
                      <button
                        onClick={(e) => markAsRead(notif.id, e)}
                        className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center"
                      >
                        <Check className="w-3 h-3 mr-0.5" /> Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
