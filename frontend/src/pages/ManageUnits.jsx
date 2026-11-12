import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Plus, Edit2, ShieldCheck, Mail, MapPin, Trash2, Eye, EyeOff,
  Key, ChevronDown, ChevronUp, ChevronRight, GraduationCap, Phone, Search,
  X, Check, ExternalLink, School
} from 'lucide-react';

export default function ManageUnits({ embedded = false }) {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsts, setLoadingInsts] = useState(false);
  const [error, setError] = useState('');

  // Expanded Units State (Set of unit IDs)
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  // Per-unit search query: { [unitId]: 'query' }
  const [unitSearch, setUnitSearch] = useState({});

  // Unit Modal State (Create / Edit Unit)
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [location, setLocation] = useState('Delhi');
  const [nccGroup, setNccGroup] = useState('Group B');
  const [unitEmail, setUnitEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('Unit@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [submittingUnit, setSubmittingUnit] = useState(false);

  // Institution Modal State (Create / Edit Institution)
  const [showInstModal, setShowInstModal] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [instTargetUnitId, setInstTargetUnitId] = useState(null);
  const [instName, setInstName] = useState('');
  const [instType, setInstType] = useState('STATE');
  const [anoName, setAnoName] = useState('');
  const [anoContact, setAnoContact] = useState('');
  const [anoEmail, setAnoEmail] = useState('');
  const [instLoginId, setInstLoginId] = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [showInstPassword, setShowInstPassword] = useState(false);
  const [resetInstPassword, setResetInstPassword] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [completeAddress, setCompleteAddress] = useState('');
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [s3, setS3] = useState(0);
  const [submittingInst, setSubmittingInst] = useState(false);
  const [instError, setInstError] = useState('');

  useEffect(() => {
    if (token) {
      fetchUnits();
      fetchInstitutions();
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
      console.error('Fetch units error:', err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      setLoadingInsts(true);
      const res = await fetch('/api/institutions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInstitutions(data);
        }
      }
    } catch (err) {
      console.error('Fetch institutions error:', err);
    } finally {
      setLoadingInsts(false);
    }
  };

  // Group institutions by unit_id
  const institutionsByUnit = useMemo(() => {
    const map = {};
    if (Array.isArray(institutions)) {
      institutions.forEach(inst => {
        const uId = inst.unit_id;
        if (!map[uId]) map[uId] = [];
        map[uId].push(inst);
      });
    }
    return map;
  }, [institutions]);

  // Expand / Collapse toggles
  const toggleExpand = (unitId) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedUnits(new Set(units.map(u => u.id)));
  };

  const collapseAll = () => {
    setExpandedUnits(new Set());
  };

  // -------------------------------------------------------------
  // UNIT MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateUnit = () => {
    setEditingUnit(null);
    setUnitName('');
    setUnitCode('');
    setLocation('Delhi');
    setNccGroup('Group B');
    setUnitEmail('');
    setLoginId('');
    setPassword('Unit@123');
    setShowPassword(false);
    setResetPassword(true);
    setError('');
    setShowUnitModal(true);
  };

  const handleOpenEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitName(unit.unit_name || '');
    setUnitCode(unit.unit_code || '');
    setLocation(unit.location || '');
    setNccGroup(unit.ncc_group || 'Group B');
    setUnitEmail(unit.unit_email || '');
    setLoginId(unit.login_id || '');
    setPassword('');
    setShowPassword(false);
    setResetPassword(false);
    setError('');
    setShowUnitModal(true);
  };

  const handleDeleteUnit = async (unit) => {
    if (!unit) return;
    const instCount = (institutionsByUnit[unit.id] || []).length || unit.institution_count || 0;
    let msg = `Are you sure you want to delete NCC Unit "${unit.unit_name}" (${unit.unit_code})?`;
    if (instCount > 0) {
      msg += `\n\n⚠️ WARNING: This unit currently manages ${instCount} institution(s). Deleting this unit will permanently delete all associated institutions, cadet records, demands, and Unit logins.`;
    }
    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`/api/units/${unit.id}?force=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete unit.');
      alert(data.message || `NCC Unit '${unit.unit_name}' deleted successfully.`);
      await Promise.all([fetchUnits(), fetchInstitutions()]);
    } catch (err) {
      alert(`Failed to delete unit: ${err.message}`);
    }
  };

  const handleSubmitUnit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittingUnit(true);

    try {
      const upperUnitName = (unitName || '').trim().toUpperCase();
      if (editingUnit) {
        const res = await fetch(`/api/units/${editingUnit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            unit_name: upperUnitName,
            unit_code: unitCode.trim().toUpperCase(),
            location,
            ncc_group: nccGroup,
            unit_email: unitEmail.trim().toLowerCase(),
            login_id: loginId.trim(),
            password: password || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`NCC Unit '${upperUnitName}' updated successfully!`);
      } else {
        const res = await fetch('/api/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            unit_name: upperUnitName,
            unit_code: unitCode.trim().toUpperCase(),
            location,
            ncc_group: nccGroup,
            unit_email: unitEmail.trim().toLowerCase(),
            login_id: loginId.trim(),
            password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`NCC Unit '${upperUnitName}' onboarded and Unit login created!`);
      }

      setShowUnitModal(false);
      await Promise.all([fetchUnits(), fetchInstitutions()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingUnit(false);
    }
  };

  // -------------------------------------------------------------
  // INSTITUTION MODAL HANDLERS (EDIT & ADD)
  // -------------------------------------------------------------
  const handleOpenEditInst = (inst) => {
    setEditingInst(inst);
    setInstTargetUnitId(inst.unit_id);
    setInstName((inst.institution_name || '').toUpperCase());
    setInstType(inst.institution_type === 'CENTRE' ? 'CENTRE' : 'STATE');
    setAnoName(inst.ano_cto_name || '');
    setAnoContact(inst.ano_cto_contact || '');
    setAnoEmail(inst.ano_email || '');
    setInstLoginId(inst.login_id || '');
    setInstPassword('');
    setShowInstPassword(false);
    setResetInstPassword(false);
    setPinCode(inst.pin_code || '');
    setGoogleLocation(inst.google_location || '');
    setCompleteAddress(inst.complete_address || '');
    setS1(inst.strength_1st_year || 0);
    setS2(inst.strength_2nd_year || 0);
    setS3(inst.strength_3rd_year || 0);
    setInstError('');
    setShowInstModal(true);
  };

  const handleOpenAddInst = (unitId) => {
    setEditingInst(null);
    setInstTargetUnitId(unitId);
    setInstName('');
    setInstType('STATE');
    setAnoName('');
    setAnoContact('');
    setAnoEmail('');
    setInstLoginId('');
    setInstPassword('Inst@123');
    setShowInstPassword(false);
    setResetInstPassword(true);
    setPinCode('');
    setGoogleLocation('');
    setCompleteAddress('');
    setS1(0);
    setS2(40);
    setS3(30);
    setInstError('');
    setShowInstModal(true);
  };

  const handleToggleInstType = async (inst, e) => {
    if (e) e.stopPropagation();
    const nextType = inst.institution_type === 'CENTRE' ? 'STATE' : 'CENTRE';
    try {
      const res = await fetch(`/api/institutions/${inst.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ institution_type: nextType })
      });
      if (res.ok) {
        setInstitutions(prev => prev.map(item => item.id === inst.id ? { ...item, institution_type: nextType } : item));
      }
    } catch (err) {
      console.error('Toggle type error:', err);
    }
  };

  const handleDeleteInst = async (inst, e) => {
    if (e) e.stopPropagation();
    const upperName = (inst.institution_name || '').toUpperCase();
    if (!window.confirm(`Are you sure you want to delete institution "${upperName}"?\n\nThis will remove the institution and its associated login.`)) return;

    try {
      const res = await fetch(`/api/institutions/${inst.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete institution');
      alert(`Institution "${upperName}" deleted successfully.`);
      await Promise.all([fetchUnits(), fetchInstitutions()]);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSubmitInst = async (e) => {
    e.preventDefault();
    setInstError('');
    setSubmittingInst(true);

    try {
      const upperName = (instName || '').trim().toUpperCase();
      if (!upperName) throw new Error('Institution name is required.');

      if (editingInst) {
        const res = await fetch(`/api/institutions/${editingInst.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            institution_name: upperName,
            institution_type: instType,
            ano_cto_name: anoName,
            ano_cto_contact: anoContact,
            pin_code: pinCode,
            google_location: googleLocation,
            complete_address: completeAddress,
            strength_1st_year: s1,
            strength_2nd_year: s2,
            strength_3rd_year: s3,
            ano_cto_email: anoEmail,
            login_id: instLoginId,
            password: instPassword || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update institution');
        alert(`Institution "${upperName}" details updated successfully!`);
      } else {
        const res = await fetch('/api/institutions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            unit_id: instTargetUnitId,
            institution_name: upperName,
            institution_type: instType,
            ano_cto_name: anoName,
            ano_cto_contact: anoContact,
            ano_cto_email: anoEmail,
            login_id: instLoginId,
            password: instPassword,
            pin_code: pinCode,
            google_location: googleLocation,
            complete_address: completeAddress,
            strength_1st_year: s1,
            strength_2nd_year: s2,
            strength_3rd_year: s3
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to onboard institution');
        alert(`Institution "${upperName}" onboarded under unit successfully!`);
      }

      setShowInstModal(false);
      await Promise.all([fetchUnits(), fetchInstitutions()]);
    } catch (err) {
      setInstError(err.message || 'Error saving institution');
    } finally {
      setSubmittingInst(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Loading NCC Units...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manage NCC Units (Battalions & Regiments)</h2>
            <p className="text-sm text-slate-500">Onboard NCC Units, issue Unit logins & manage jurisdiction scopes</p>
          </div>

          <button
            onClick={handleOpenCreateUnit}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Onboard New NCC Unit
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500">
              Total NCC Units: <span className="font-bold text-slate-900">{units.length}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="text-xs font-semibold text-slate-500">
              Total Institutions: <span className="font-bold text-slate-900">{institutions.length}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-300">/</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          <button
            onClick={handleOpenCreateUnit}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Onboard New NCC Unit
          </button>
        </div>
      )}

      {/* UNITS & INSTITUTIONS TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center"></th>
                <th className="p-4">Unit Name</th>
                <th className="p-4">NCC Group</th>
                <th className="p-4">Unit Code</th>
                <th className="p-4">Location</th>
                <th className="p-4">Jurisdiction Scope</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.isArray(units) && units.length > 0 ? (
                units.map((unit) => {
                  const unitInsts = institutionsByUnit[unit.id] || [];
                  const isExpanded = expandedUnits.has(unit.id);
                  const searchVal = (unitSearch[unit.id] || '').toLowerCase().trim();

                  const filteredInsts = searchVal
                    ? unitInsts.filter(inst =>
                        (inst.institution_name || '').toLowerCase().includes(searchVal) ||
                        (inst.ano_cto_name || '').toLowerCase().includes(searchVal) ||
                        (inst.pin_code || '').includes(searchVal) ||
                        (inst.complete_address || '').toLowerCase().includes(searchVal)
                      )
                    : unitInsts;

                  return (
                    <React.Fragment key={unit.id}>
                      {/* UNIT ROW */}
                      <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}>
                        {/* Expand / Collapse Chevron */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(unit.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse institutions' : 'Expand institutions'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600 font-bold" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Unit Name */}
                        <td className="p-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                            <button
                              type="button"
                              onClick={() => toggleExpand(unit.id)}
                              className="text-left font-black hover:text-indigo-600 cursor-pointer uppercase transition-colors"
                            >
                              {unit.unit_name}
                            </button>
                          </div>
                        </td>

                        {/* NCC Group */}
                        <td className="p-4 font-semibold text-slate-700">{unit.ncc_group || 'Group B'}</td>

                        {/* Unit Code */}
                        <td className="p-4 font-mono font-bold text-blue-600">{unit.unit_code}</td>

                        {/* Location */}
                        <td className="p-4 text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {unit.location || 'N/A'}
                          </span>
                        </td>

                        {/* Jurisdiction Scope - Clickable Badge to Expand/Collapse */}
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => toggleExpand(unit.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                            }`}
                            title={`Click to ${isExpanded ? 'collapse' : 'view and edit'} ${unitInsts.length} institutions`}
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{unitInsts.length} Institutions under jurisdiction</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-60" />
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUnit(unit)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit Unit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(unit)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                              title="Delete NCC Unit"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-TABLE: INSTITUTIONS UNDER THIS UNIT */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-indigo-200">
                          <td colSpan="7" className="p-4 sm:p-6 space-y-4">
                            {/* Subtable Header Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                    Institutions under {unit.unit_name}
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-black">
                                      {unitInsts.length} Total
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    Review jurisdiction schools, inspect cadet vacancies, and click "Edit" to modify any institution details.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Search Filter within this Unit */}
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={unitSearch[unit.id] || ''}
                                    onChange={(e) => setUnitSearch({ ...unitSearch, [unit.id]: e.target.value })}
                                    placeholder="Filter by school, PIN, ANO..."
                                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-48 sm:w-64 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                {/* Add Institution to Unit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddInst(unit.id)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Institution
                                </button>
                              </div>
                            </div>

                            {/* Institutions List Table */}
                            {filteredInsts.length === 0 ? (
                              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs font-bold space-y-2">
                                <School className="w-8 h-8 text-slate-300 mx-auto" />
                                <div>
                                  {unitInsts.length === 0
                                    ? `No institutions mapped under ${unit.unit_name} yet.`
                                    : 'No institutions match your search query.'}
                                </div>
                                {unitInsts.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddInst(unit.id)}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Onboard First Institution
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100/90 text-[10.5px] font-black uppercase text-slate-600 border-b border-slate-200">
                                    <tr>
                                      <th className="p-3 w-10 text-center">#</th>
                                      <th className="p-3">Institution Name & Address</th>
                                      <th className="p-3">ANO / CTO Incharge</th>
                                      <th className="p-3">PIN & Geotag</th>
                                      <th className="p-3 text-center">Cadet Strength</th>
                                      <th className="p-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredInsts.map((inst, iIdx) => {
                                      const totalStrength = (inst.strength_1st_year || 0) + (inst.strength_2nd_year || 0) + (inst.strength_3rd_year || 0);
                                      return (
                                        <tr key={inst.id} className="hover:bg-indigo-50/20 transition-colors">
                                          {/* Serial Number */}
                                          <td className="p-3 text-center font-bold text-slate-400">{iIdx + 1}</td>

                                          {/* School / Institution Name & Type */}
                                          <td className="p-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-black text-slate-900 text-xs uppercase">
                                                {(inst.institution_name || '').toUpperCase()}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => handleToggleInstType(inst, e)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer border ${
                                                  inst.institution_type === 'CENTRE'
                                                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                                }`}
                                                title="Click to toggle between STATE and CENTRE"
                                              >
                                                {inst.institution_type === 'CENTRE' ? 'CENTRE' : 'STATE'}
                                              </button>
                                            </div>
                                            {inst.complete_address && (
                                              <div className="text-[11px] text-slate-500 font-medium truncate max-w-sm mt-0.5">
                                                {inst.complete_address}
                                              </div>
                                            )}
                                          </td>

                                          {/* ANO / Caretaker Details */}
                                          <td className="p-3">
                                            <div className="font-bold text-slate-800">{inst.ano_cto_name || 'ANO Incharge'}</div>
                                            {inst.ano_cto_contact && (
                                              <a
                                                href={`tel:${inst.ano_cto_contact}`}
                                                className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                                              >
                                                <Phone className="w-3 h-3" /> {inst.ano_cto_contact}
                                              </a>
                                            )}
                                            {inst.ano_email && (
                                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                                <Mail className="w-3 h-3 text-slate-400" /> {inst.ano_email}
                                              </div>
                                            )}
                                          </td>

                                          {/* PIN & Geotag Status */}
                                          <td className="p-3">
                                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                              PIN {inst.pin_code || '—'}
                                            </span>
                                            <div className="mt-1">
                                              {inst.google_location ? (
                                                <a
                                                  href={
                                                    inst.google_location.startsWith('http')
                                                      ? inst.google_location
                                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inst.google_location)}`
                                                  }
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold hover:bg-emerald-100"
                                                >
                                                  <MapPin className="w-3 h-3 text-emerald-600" /> GPS Geotag
                                                </a>
                                              ) : (
                                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                                                  Pending Geotag
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* Cadet Strengths */}
                                          <td className="p-3 text-center">
                                            <div className="font-black text-slate-900 text-xs">{totalStrength} Cadets</div>
                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                              1st: {inst.strength_1st_year || 0} • 2nd: {inst.strength_2nd_year || 0} • 3rd: {inst.strength_3rd_year || 0}
                                            </div>
                                          </td>

                                          {/* Actions: Edit & Delete */}
                                          <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditInst(inst)}
                                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                                                title="Edit Institution details, ANO contact, strengths, and login credentials"
                                              >
                                                <Edit2 className="w-3 h-3" /> Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => handleDeleteInst(inst, e)}
                                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                                                title="Delete Institution"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                    No NCC Units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. ONBOARD / EDIT NCC UNIT MODAL                              */}
      {/* ============================================================= */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 p-6 space-y-5 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                {editingUnit ? 'Edit NCC Unit' : 'Onboard NCC Unit & Unit Login'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Name *</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value.toUpperCase())}
                    placeholder="e.g. 2 DELHI ARTY BTY NCC"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 uppercase font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Code *</label>
                  <input
                    type="text"
                    required
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 2 DAB NCC"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 uppercase font-mono font-bold focus:outline-none focus:border-amber-500"
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

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-4">
                <span className="font-bold text-amber-600 block">Unit Login Credentials</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Unit Email *</label>
                    <input
                      type="email"
                      required
                      value={unitEmail}
                      onChange={(e) => setUnitEmail(e.target.value)}
                      placeholder="unit@gmail.com"
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Login ID *</label>
                    <input
                      type="text"
                      required
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="e.g. unit2_admin"
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-mono"
                    />
                  </div>
                  {editingUnit && !resetPassword ? (
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Password</label>
                      <button
                        type="button"
                        onClick={() => { setResetPassword(true); setPassword(''); setShowPassword(true); }}
                        className="w-full p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer"
                      >
                        <Key className="w-4 h-4" /> Reset Password
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        {editingUnit ? 'New Password' : 'Password *'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={!editingUnit}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full p-2 pr-9 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
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
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUnit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {submittingUnit ? 'Saving...' : editingUnit ? 'Update Unit' : 'Onboard Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. EDIT / ADD INSTITUTION DETAILS MODAL                        */}
      {/* ============================================================= */}
      {showInstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-200 p-6 space-y-4 bg-white shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  {editingInst ? 'Edit Institution Details' : 'Onboard Institution Under Unit'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update school name, funding classification, ANO contact, strengths, and login credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {instError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {instError}
              </div>
            )}

            <form onSubmit={handleSubmitInst} className="space-y-4 text-xs">
              {/* Institution Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Institution / School Name * (Auto Capitalized)
                  </label>
                  <input
                    type="text"
                    required
                    value={instName}
                    onChange={(e) => setInstName(e.target.value.toUpperCase())}
                    placeholder="e.g. ST. GREGORIOS SCHOOL DWARKA"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 uppercase font-black focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Funding Classification</label>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STATE">STATE (Govt / Pvt Aid)</option>
                    <option value="CENTRE">CENTRE (APS / Sainik)</option>
                  </select>
                </div>
              </div>

              {/* ANO Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ANO / Caretaker Name *</label>
                  <input
                    type="text"
                    required
                    value={anoName}
                    onChange={(e) => setAnoName(e.target.value)}
                    placeholder="e.g. Lt. Rajesh Kumar"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ANO Mobile / Contact</label>
                  <input
                    type="text"
                    value={anoContact}
                    onChange={(e) => setAnoContact(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="110010"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Geotag & Complete Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Google Maps Geotag / Coordinates
                  </label>
                  <input
                    type="text"
                    value={googleLocation}
                    onChange={(e) => setGoogleLocation(e.target.value)}
                    placeholder="e.g. 28.587138, 77.050059 or maps.app.goo.gl/..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Complete Postal Address</label>
                  <input
                    type="text"
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    placeholder="e.g. Sector 11, Dwarka, New Delhi"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Cadet Vacancy / Strengths */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Cadet Authorized Strength / Vacancy</span>
                  <span className="font-black text-indigo-700 text-xs">
                    Total: {Number(s1 || 0) + Number(s2 || 0) + Number(s3 || 0)} Cadets
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">1st Year Cadets</label>
                    <input
                      type="number"
                      min="0"
                      value={s1}
                      onChange={(e) => setS1(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">2nd Year Cadets</label>
                    <input
                      type="number"
                      min="0"
                      value={s2}
                      onChange={(e) => setS2(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">3rd Year Cadets</label>
                    <input
                      type="number"
                      min="0"
                      value={s3}
                      onChange={(e) => setS3(parseInt(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* ANO Login Credentials */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <span className="font-bold text-indigo-900 block">ANO Portal Login Credentials</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Login Email *</label>
                    <input
                      type="email"
                      required
                      value={anoEmail}
                      onChange={(e) => setAnoEmail(e.target.value)}
                      placeholder="ano@school.edu.in"
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Login ID *</label>
                    <input
                      type="text"
                      required
                      value={instLoginId}
                      onChange={(e) => setInstLoginId(e.target.value)}
                      placeholder="e.g. ano_dwarka"
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-mono"
                    />
                  </div>
                  {editingInst && !resetInstPassword ? (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Password</label>
                      <button
                        type="button"
                        onClick={() => { setResetInstPassword(true); setInstPassword(''); setShowInstPassword(true); }}
                        className="w-full p-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-indigo-600" /> Reset Password
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        {editingInst ? 'New Password' : 'Password *'}
                      </label>
                      <div className="relative">
                        <input
                          type={showInstPassword ? 'text' : 'password'}
                          required={!editingInst}
                          value={instPassword}
                          onChange={(e) => setInstPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full p-2 pr-9 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowInstPassword(!showInstPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        >
                          {showInstPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInstModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInst}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {submittingInst ? 'Saving...' : editingInst ? 'Update Institution' : 'Onboard Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
