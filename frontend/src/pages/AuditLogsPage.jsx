import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { History, Shield, User, Clock, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/reports/audit-logs?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    (l.action && l.action.toLowerCase().includes(search.toLowerCase())) ||
    (l.details && l.details.toLowerCase().includes(search.toLowerCase())) ||
    (l.actor_name && l.actor_name.toLowerCase().includes(search.toLowerCase())) ||
    (l.entity_type && l.entity_type.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Trail Log</h2>
          <p className="text-sm text-slate-500">
            Immutable log of every action (creation, review, approval, rejection, cancellation, soft delete, fulfillment)
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or actor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/80 uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Action</th>
                <th className="p-4">Performed By (Actor)</th>
                <th className="p-4">Action Details Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-medium font-sans">
                    No audit log entries matching search query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-4 font-bold text-blue-600">{log.entity_type} #{log.entity_id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        log.action === 'APPROVED' ? 'bg-blue-500/20 text-blue-300' :
                        log.action === 'FULFILLED' ? 'bg-emerald-500/20 text-emerald-300' :
                        log.action === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' :
                        log.action === 'CANCELLED' ? 'bg-slate-500/20 text-slate-700' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-800 font-sans">
                      <div className="font-bold">{log.actor_name}</div>
                      <span className="text-[11px] text-slate-500">{log.actor_email} ({log.actor_role})</span>
                    </td>
                    <td className="p-4 text-slate-700 font-sans">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
