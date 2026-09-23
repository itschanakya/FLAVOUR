import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, Plus, MapPin, Edit2, ShieldAlert, FileText, CheckCircle2, Clock, Map, Mail, Phone, Trash2, Eye, EyeOff, Key } from 'lucide-react';

export default function ManageInstitutions() {
  const { token } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInst, setEditingInst] = useState(null);

  // Form fields
  const [instName, setInstName] = useState('');
  const [anoName, setAnoName] = useState('');
  const [anoContact, setAnoContact] = useState('');
  const [anoEmail, setAnoEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [completeAddress, setCompleteAddress] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('Inst@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [s1, setS1] = useState(45);
  const [s2, setS2] = useState(35);
  const [s3, setS3] = useState(25);
  const [pinFilter, setPinFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInstitutions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingInst(null);
    setInstName('');
    setAnoName('');
    setAnoContact('');
    setAnoEmail('');
    setPinCode('');
    setGoogleLocation('');
    setCompleteAddress('');
    setLoginId('');
    setPassword('Inst@123');
    setShowPassword(false);
    setResetPassword(true);
    setS1(0);
    setS2(40);
    setS3(30);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInst(inst);
    setInstName(inst.institution_name);
    setAnoName(inst.ano_cto_name);
    setAnoContact(inst.ano_cto_contact || '');
    setAnoEmail(inst.ano_email || '');
    setPinCode(inst.pin_code || '');
    setGoogleLocation(inst.google_location || '');
    setCompleteAddress(inst.complete_address || '');
    setLoginId(inst.login_id || '');
    setPassword('');
    setShowPassword(false);
    setResetPassword(false);
    setS1(inst.strength_1st_year || 0);
    setS2(inst.strength_2nd_year);
    setS3(inst.strength_3rd_year);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingInst) {
        // Edit strength & details
        const res = await fetch(`/api/institutions/${editingInst.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            institution_name: instName,
            ano_cto_name: anoName,
            ano_cto_contact: anoContact,
            pin_code: pinCode,
            google_location: googleLocation,
            complete_address: completeAddress,
            strength_1st_year: s1,
            strength_2nd_year: s2,
            strength_3rd_year: s3,
            ano_cto_email: anoEmail,
            login_id: loginId,
            password: password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('Institution updated successfully.');
      } else {
        // Onboard institution + ANO credentials
        const res = await fetch('/api/institutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            institution_name: instName,
            ano_cto_name: anoName,
            ano_cto_contact: anoContact,
            ano_cto_email: anoEmail,
            pin_code: pinCode,
            google_location: googleLocation,
            complete_address: completeAddress,
            login_id: loginId,
            password,
            strength_1st_year: parseInt(s1),
            strength_2nd_year: s2,
            strength_3rd_year: s3
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`Institution '${instName}' onboarded and ANO credentials created!`);
      }

      setShowModal(false);
      fetchInstitutions();

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading institutions list...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institutions & Cadet Vacancy Strengths</h2>
          <p className="text-sm text-slate-500">Add institutions under your NCC Unit, set 1st/2nd/3rd year cadet quotas & issue ANO login</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 font-bold text-sm shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Institution & ANO Login
        </button>
      </div>

      {/* PIN Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">📍</span>
          <input
            type="text"
            value={pinFilter}
            onChange={(e) => setPinFilter(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Filter by PIN code..."
            maxLength={6}
            className="pl-8 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-mono focus:outline-none focus:border-blue-400 w-52"
          />
        </div>
        {pinFilter && (
          <button onClick={() => setPinFilter('')} className="text-xs text-slate-400 hover:text-rose-500 font-semibold">✕ Clear</button>
        )}
        {pinFilter && (
          <span className="text-xs text-slate-500">
            Showing institutions in PIN <span className="font-bold text-blue-600">{pinFilter}</span>
          </span>
        )}
      </div>

      {/* INSTITUTIONS TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-4">Institution Name</th>
                <th className="p-4">PIN Code</th>
                <th className="p-4">ANO / CTO Incharge</th>
                <th className="p-4">ANO Email / Login</th>
                <th className="p-4 text-center">1st Yr Strength</th>
                <th className="p-4 text-center">2nd Yr Strength</th>
                <th className="p-4 text-center">3rd Yr Strength</th>
                <th className="p-4 text-center">Total Vacancy</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {institutions.filter(inst =>
                !pinFilter || (inst.pin_code && inst.pin_code.startsWith(pinFilter))
              ).length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500 font-medium">
                    {pinFilter ? `No institutions found with PIN starting with "${pinFilter}".` : 'No institutions onboarded yet under this NCC Unit.'}
                  </td>
                </tr>
              ) : (
                institutions
                  .filter(inst => !pinFilter || (inst.pin_code && inst.pin_code.startsWith(pinFilter)))
                  .map((inst) => {
                  const total = (inst.strength_1st_year || 0) + (inst.strength_2nd_year || 0) + (inst.strength_3rd_year || 0);
                  return (
                    <tr key={inst.id} className="hover:bg-white/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        <div>{inst.institution_name}</div>
                        {inst.complete_address && <div className="text-xs text-slate-400 font-normal mt-0.5 max-w-[200px] truncate">{inst.complete_address}</div>}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-mono text-xs font-bold tracking-widest">
                          📍 {inst.pin_code || <span className="text-slate-400">—</span>}
                        </span>
                      </td>
                      <td className="p-4 text-slate-800">
                        <div>{inst.ano_cto_name}</div>
                        <span className="text-xs text-slate-500">{inst.ano_cto_contact || 'No contact'}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-blue-600">{inst.ano_email || 'N/A'}</td>
                      <td className="p-4 text-center font-bold text-blue-600">{inst.strength_1st_year}</td>
                      <td className="p-4 text-center font-bold text-indigo-400">{inst.strength_2nd_year}</td>
                      <td className="p-4 text-center font-bold text-purple-400">{inst.strength_3rd_year}</td>
                      <td className="p-4 text-center font-extrabold text-emerald-600">{total}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(inst)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit Strength
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 p-6 space-y-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600" />
                {editingInst ? 'Edit Cadet Sanctioned Strength' : 'Onboard New Institution'}
              </h3>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. St. Joseph University"
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ANO / CTO Name</label>
                  <input
                    type="text"
                    required
                    value={anoName}
                    onChange={(e) => setAnoName(e.target.value)}
                    placeholder="Lt. Rajesh Kumar"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={anoContact}
                    onChange={(e) => setAnoContact(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* PIN Code - mandatory */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PIN Code <span className="text-rose-500">*</span>
                  <span className="ml-2 text-[10px] font-normal text-slate-400">(6-digit area PIN for bill collection routing)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 560001"
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {pinCode && pinCode.length < 6 && (
                  <p className="text-[10px] text-amber-500 mt-1 font-semibold">PIN must be exactly 6 digits ({6 - pinCode.length} more needed)</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Google Location (Map Link)</label>
                  <input
                    type="text"
                    value={googleLocation}
                    onChange={(e) => setGoogleLocation(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Complete Address</label>
                  <textarea
                    rows={2}
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    placeholder="Enter full address of the institution"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200 mt-4 space-y-3">
                <span className="font-bold text-amber-400 block">ANO/CTO Login Credentials</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">ANO Login Email</label>
                    <input
                      type="email"
                      required={!editingInst}
                      value={anoEmail}
                      onChange={(e) => setAnoEmail(e.target.value)}
                      placeholder="Enter ANO login email"
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Login ID</label>
                    <input
                      type="text"
                      required={!editingInst}
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="Enter login ID"
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  
                  {editingInst && !resetPassword ? (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Password</label>
                      <button
                        type="button"
                        onClick={() => { setResetPassword(true); setPassword(''); setShowPassword(true); }}
                        className="w-full p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all text-left flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" /> Reset Password
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {editingInst ? 'New Password' : 'Password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!editingInst}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full p-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sanctioned Strengths */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                <span className="font-bold text-blue-800 block">Sanctioned Cadet Strength (Defines Vacancy Quota)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">1st Year Strength</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={s1}
                      onChange={(e) => setS1(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-blue-200 text-center font-bold text-blue-700 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">2nd Year Strength</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={s2}
                      onChange={(e) => setS2(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-indigo-200 text-center font-bold text-indigo-700 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">3rd Year Strength</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={s3}
                      onChange={(e) => setS3(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-purple-200 text-center font-bold text-purple-700 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
                <div className="text-right text-[11px] text-emerald-600 font-bold">
                  Total Vacancy Quota: {s1 + s2 + s3} Cadets
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 font-bold shadow-lg shadow-blue-600/20"
                >
                  {submitting ? 'Saving...' : editingInst ? 'Update Strength' : 'Create Institution'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
