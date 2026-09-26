import React, { useState, useRef } from 'react';
import {
  Download, Upload, RotateCcw, DatabaseBackup, ShieldOff,
  CheckCircle2, AlertCircle, X, Eye, EyeOff, FileJson,
  Lock, Trash2, Info
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── DataBackupPanel ─────────────────────────────────────────────────────────
export default function DataBackupPanel({ token }) {
  // ── Export state
  const [exporting, setExporting]   = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportErr, setExportErr]   = useState('');

  // ── Import state
  const [importing, setImporting]     = useState(false);
  const [importDone, setImportDone]   = useState(false);
  const [importErr, setImportErr]     = useState('');
  const [importStats, setImportStats] = useState(null);
  const fileRef = useRef(null);

  // ── Reset Demands state
  const [showResetModal, setShowResetModal]   = useState(false);
  const [resetPassword, setResetPassword]     = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [resetting, setResetting]             = useState(false);
  const [resetDone, setResetDone]             = useState(null);  // { message, count }
  const [resetErr, setResetErr]               = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT BACKUP
  // ─────────────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      setExportErr('');
      setExportDone(false);

      const res = await fetch('/api/admin/backup/export', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed.');
      }

      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `refreshment-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportDone(true);
      setTimeout(() => setExportDone(false), 5000);
    } catch (err) {
      setExportErr(err.message);
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORT BACKUP
  // ─────────────────────────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      setImportErr('Please select a valid .json backup file.');
      return;
    }

    try {
      setImporting(true);
      setImportErr('');
      setImportDone(false);
      setImportStats(null);

      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Please use a backup exported from this system.');
      }

      const res = await fetch('/api/admin/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ backup: parsed })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');

      setImportDone(true);
      setImportStats(data.stats);
    } catch (err) {
      setImportErr(err.message);
    } finally {
      setImporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RESET DEMANDS
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!resetPassword.trim()) {
      setResetErr('Please enter the reset password.');
      return;
    }

    try {
      setResetting(true);
      setResetErr('');

      const res = await fetch('/api/admin/demands/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: resetPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed.');

      setResetDone({ message: data.message, count: data.demands_archived });
      setShowResetModal(false);
      setResetPassword('');
    } catch (err) {
      setResetErr(err.message);
    } finally {
      setResetting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Global success banner for reset ──────────────────────────────── */}
      {resetDone && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-emerald-800">{resetDone.message}</div>
            <div className="text-xs text-emerald-600 mt-0.5">
              {resetDone.count} demand(s) moved to deleted records.
            </div>
          </div>
          <button onClick={() => setResetDone(null)} className="ml-auto text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: EXPORT BACKUP                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Export Full Backup</div>
            <div className="text-xs text-slate-500 mt-0.5">Download the entire database as a JSON file for safekeeping.</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Info box */}
          <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
            <span>
              Exports <strong>all tables</strong>: units, institutions, users, demands, catalog, deliveries, bills, inventory, and more.
              Store this file safely — it can be used to fully restore the system.
            </span>
          </div>

          {/* Export success */}
          {exportDone && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Backup downloaded successfully! Check your Downloads folder.
            </div>
          )}
          {exportErr && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4" />
              {exportErr}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : `Export Backup — ${todayLabel()}`}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: IMPORT BACKUP                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Import / Restore Backup</div>
            <div className="text-xs text-slate-500 mt-0.5">Restore the database from a previously exported JSON backup file.</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning box */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              <strong>⚠️ Warning:</strong> Importing will <strong>replace</strong> existing data in each table with the backup's data.
              This action cannot be undone. Export the current data first if needed.
            </span>
          </div>

          {/* Import status */}
          {importDone && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Backup imported successfully!
              </div>
              {importStats && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {Object.entries(importStats).map(([table, stat]) => (
                    <div key={table} className="flex items-center justify-between text-[11px] font-mono px-2 py-1 bg-white rounded border border-emerald-100">
                      <span className="text-slate-600 font-semibold">{table}</span>
                      <span className={stat.error ? 'text-rose-600' : stat.skipped ? 'text-slate-400' : 'text-emerald-700'}>
                        {stat.error ? `Error: ${stat.error}` : stat.skipped ? 'skipped (empty)' : `✓ ${stat.inserted}/${stat.total} rows`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {importErr && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {importErr}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".json"
              ref={fileRef}
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <FileJson className="w-4 h-4" />
              {importing ? 'Importing...' : 'Choose Backup File & Import'}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: RESET ALL DEMANDS                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-rose-50 border-b border-rose-200 px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-rose-800 text-sm">Reset All Demands</div>
            <div className="text-xs text-rose-600 mt-0.5">Move all active demands to deleted records. Requires a daily rotating password.</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Info about the password */}
          <div className="flex items-start gap-3 p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-rose-800">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-1">
              <div><strong>Password format:</strong> <code className="bg-rose-100 px-1 rounded font-mono">Jadugar</code> + today's date in DDMMYYYY</div>
              <div className="text-rose-600">
                Example for today ({todayLabel().replace(/\//g, '')}):&nbsp;
                <code className="bg-rose-100 px-1 rounded font-mono">
                  Jadugar{(() => {
                    const n = new Date();
                    return String(n.getDate()).padStart(2,'0') + String(n.getMonth()+1).padStart(2,'0') + n.getFullYear();
                  })()}
                </code>
              </div>
              <div className="text-rose-500 italic">🔄 Password changes automatically at midnight every day.</div>
            </div>
          </div>

          {/* What happens */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>
              All demand records (PENDING, APPROVED, etc.) will be soft-deleted — their <code className="bg-slate-100 px-1 rounded font-mono">is_deleted</code> flag will be set to <strong>1</strong>.
              They will no longer appear in any demand queues but remain accessible from deleted records.
              This action is logged in Audit Logs.
            </span>
          </div>

          <button
            onClick={() => { setShowResetModal(true); setResetErr(''); setResetPassword(''); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Demands
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RESET MODAL                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-rose-200 overflow-hidden">
            {/* Modal header */}
            <div className="bg-rose-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldOff className="w-5 h-5 text-rose-200" />
                <span className="font-bold text-white">Confirm: Reset All Demands</span>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-rose-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 font-medium">
                ⚠️ This will archive <strong>ALL</strong> active demand records.
                They will be moved to deleted records and removed from all active views.
                This cannot be easily undone.
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  <Lock className="w-3.5 h-3.5 inline mr-1.5 text-rose-500" />
                  Enter Today's Reset Password
                </label>
                <div className="text-xs text-slate-500 mb-2">
                  Format: <code className="bg-slate-100 px-1 rounded font-mono">Jadugar</code> + DDMMYYYY&nbsp;&nbsp;
                  (changes every day)
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={e => { setResetPassword(e.target.value); setResetErr(''); }}
                    placeholder="e.g. Jadugar26092026"
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetErr && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {resetErr}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || !resetPassword.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
