import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SSEContext = createContext();

export function useSSE() {
  return useContext(SSEContext);
}

// Cross-tab broadcast channel for instant multi-window local sync
let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('ncc_demands_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or error:', e);
}

export function SSEProvider({ children }) {
  const { token, user } = useAuth();
  const [events, setEvents] = useState({
    DEMAND_UPDATED: null,
    NEW_NOTIFICATION: null,
    timestamp: 0,
  });

  // Listen to BroadcastChannel for instant same-browser cross-window sync
  useEffect(() => {
    if (!channel) return;
    const handleChannelMessage = (event) => {
      if (event.data?.type === 'DEMAND_UPDATED') {
        const payload = { ...event.data.payload, _ts: Date.now() };
        setEvents(prev => ({ ...prev, DEMAND_UPDATED: payload, timestamp: Date.now() }));
        window.dispatchEvent(new CustomEvent('demand-status-changed', { detail: payload }));
      }
    };
    channel.addEventListener('message', handleChannelMessage);
    return () => {
      channel.removeEventListener('message', handleChannelMessage);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    let eventSource = null;
    let reconnectTimer = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      try {
        eventSource = new EventSource(`/api/stream?token=${token}`);

        eventSource.onopen = () => {
          // SSE connected
        };

        eventSource.addEventListener('DEMAND_UPDATED', (e) => {
          try {
            const data = JSON.parse(e.data);
            const payload = { ...data, _ts: Date.now() };
            setEvents(prev => ({ ...prev, DEMAND_UPDATED: payload, timestamp: Date.now() }));
            window.dispatchEvent(new CustomEvent('demand-status-changed', { detail: payload }));
            if (channel) {
              try {
                channel.postMessage({ type: 'DEMAND_UPDATED', payload });
              } catch (e) {}
            }
          } catch (err) {
            console.error('Error parsing DEMAND_UPDATED:', err);
          }
        });

        eventSource.addEventListener('NEW_NOTIFICATION', (e) => {
          try {
            const data = JSON.parse(e.data);
            setEvents(prev => ({ ...prev, NEW_NOTIFICATION: data, timestamp: Date.now() }));
            window.dispatchEvent(new CustomEvent('notification-received', { detail: data }));
          } catch (err) {
            console.error('Error parsing NEW_NOTIFICATION:', err);
          }
        });

        eventSource.onerror = (e) => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isMounted) {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

      } catch (err) {
        if (isMounted) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token, user]);

  return (
    <SSEContext.Provider value={{ events, setEvents }}>
      {children}
    </SSEContext.Provider>
  );
}
