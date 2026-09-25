import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, Edit2, ShieldCheck, Mail, MapPin, Trash2, Eye, EyeOff, Key } from 'lucide-react';

export default function ManageUnits({ embedded = false }) {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [location, setLocation] = useState('Bengaluru');
  const [nccGroup, setNccGroup] = useState('Group B');
  const [unitEmail, setUnitEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('Unit@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchUnits();
    }
  }, [token]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/units', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setUnits(data);
        setError('');
      } else {
        setUnits([]);
        if (data?.error) setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setUnitName('');
    setUnitCode('');
    setLocation('Bengaluru');
    setNccGroup('Group B');
    setUnitEmail('');
    setLoginId('');
    setPassword('Unit@123');
    setShowPassword(false);
    setResetPassword(true);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    setUnitName(unit.unit_name);
    setUnitCode(unit.unit_code);
    setLocation(unit.location || '');
    setNccGroup(unit.ncc_group || 'Group B');
    setUnitEmail(unit.unit_email || '');
    setLoginId(unit.login_id || '');
    setPassword(''); // Blank means keep unchanged
    setShowPassword(false);
    setResetPassword(false);
    setError('');
    setShowModal(true);
  };

  const handleDeleteUnit = async (unit) => {
    if (!unit) return;

    const instCount = unit.institution_count || 0;
    let msg = `Are you sure you want to delete NCC Unit "${unit.unit_name}" (${unit.unit_code})?`;
    if (instCount > 0) {
      msg += `\n\n⚠️ WARNING: This unit currently manages ${instCount} institution(s). Deleting this unit will permanently delete all associated institutions, cadet records, demands, and Unit logins.`;
    }

    if (!window.confirm(msg)) {
      return;
    }

    try {
      const res = await fetch(`/api/units/${unit.id}?force=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete unit.');

      alert(data.message || `NCC Unit '${unit.unit_name}' deleted successfully.`);
      fetchUnits();
    } catch (err) {
      alert(`Failed to delete unit: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingUnit) {
        // Edit Unit
        const res = await fetch(`/api/units/${editingUnit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            unit_name: unitName,
            unit_code: unitCode,
            location,
            ncc_group: nccGroup,
            unit_email: unitEmail,
            login_id: loginId,
            password: password || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`NCC Unit '${unitName}' updated successfully!`);
      } else {
        // Create Unit
        const res = await fetch('/api/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            unit_name: unitName,
            unit_code: unitCode,
            location,
            ncc_group: nccGroup,
            unit_email: unitEmail,
            login_id: loginId,
            password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`NCC Unit '${unitName}' onboarded and Unit login created!`);
      }

      setShowModal(false);
      fetchUnits();

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading NCC Units...</div>;
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manage NCC Units (Battalions & Regiments)</h2>
            <p className="text-sm text-slate-500">Onboard NCC Units, issue Unit logins & manage jurisdiction scopes</p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Onboard New NCC Unit
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">
            Total NCC Units: <span className="font-bold text-slate-800">{units.length}</span>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/20 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Onboard New NCC Unit
          </button>
        </div>
      )}

      {/* UNITS TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-4">Unit Name</th>
                <th className="p-4">NCC Group</th>
                <th className="p-4">Unit Code</th>
                <th className="p-4">Location</th>
                <th className="p-4">Jurisdiction Scope</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.isArray(units) && units.length > 0 ? (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-white/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      {unit.unit_name}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{unit.ncc_group || 'Group B'}</td>
                    <td className="p-4 font-mono font-bold text-blue-600">{unit.unit_code}</td>
                    <td className="p-4 text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {unit.location || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-800 font-semibold">{unit.institution_count || 0} Institutions under jurisdiction</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(unit)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit Unit
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1 transition-all active:scale-95"
                          title="Delete NCC Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-bold">
                    No units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ONBOARD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                {editingUnit ? 'Edit NCC Unit' : 'Onboard NCC Unit & Unit Login'}
              </h3>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Name</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="2 Delhi Arty Bty NCC"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Code</label>
                  <input
                    type="text"
                    required
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    placeholder="2 DAB NCC"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location / HQ Address</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Delhi"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NCC Group</label>
                  <select
                    value={nccGroup}
                    onChange={(e) => setNccGroup(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Group B">Group B</option>
                    <option value="Group C">Group C</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200 space-y-3 mt-4">
                <span className="font-bold text-amber-400 block">Unit Login Credentials</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Unit Email Address</label>
                      <input
                        type="email"
                        required
                        value={unitEmail}
                        onChange={(e) => setUnitEmail(e.target.value)}
                        placeholder="unit@gmail.com"
                        className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Login ID</label>
                      <input
                        type="text"
                        required
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="e.g. unit2_admin"
                        className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs"
                      />
                    </div>
                    {editingUnit && !resetPassword ? (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Password</label>
                        <button
                          type="button"
                          onClick={() => { setResetPassword(true); setPassword(''); setShowPassword(true); }}
                          className="w-full p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all text-left flex items-center gap-2"
                        >
                          <Key className="w-4 h-4" /> Reset Password
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          {editingUnit ? 'New Password' : 'Password'}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required={!editingUnit}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full p-2 pr-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Onboard Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
