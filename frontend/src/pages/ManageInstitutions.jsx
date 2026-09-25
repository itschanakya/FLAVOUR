import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, Plus, MapPin, Edit2, ShieldAlert, FileText, CheckCircle2, Clock, Map, Mail, Phone, Trash2, Eye, EyeOff, Key, School, Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  // Excel Bulk Import & Export state
  const fileInputRef = useRef(null);
  const [excelPreviewData, setExcelPreviewData] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInstitutions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setInstitutions([]);
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
    setS2(inst.strength_2nd_year || 0);
    setS3(inst.strength_3rd_year || 0);
    setError('');
    setShowModal(true);
  };

  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteInst = async (inst, force = false) => {
    const confirmMsg = force
      ? `Are you sure you want to permanently delete "${inst.institution_name}" and all its records? This cannot be undone.`
      : `Delete institution "${inst.institution_name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setDeletingId(inst.id);
    try {
      const url = `/api/institutions/${inst.id}${force ? '?force=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.hasDemands) {
          if (window.confirm(`${data.error}\n\nDo you want to FORCE DELETE this institution and all associated demands?`)) {
            await handleDeleteInst(inst, true);
            return;
          }
        } else {
          alert(data.error || 'Failed to delete institution');
        }
        return;
      }
      alert(data.message || 'Institution deleted successfully.');
      fetchInstitutions();
    } catch (err) {
      alert(err.message || 'Error deleting institution');
    } finally {
      setDeletingId(null);
    }
  };

  // -------------------------------------------------------------
  // EXCEL DOWNLOAD / EXPORT
  // -------------------------------------------------------------
  const handleDownloadExcel = () => {
    const rows = institutions.length > 0
      ? institutions.map(inst => ({
          'INSTITUTION NAME': inst.institution_name || '',
          'PIN CODE': inst.pin_code || '',
          'ANO / CTO INCHARGE': inst.ano_cto_name || '',
          'ANO CONTACT': inst.ano_cto_contact || '',
          'ANO EMAIL': inst.ano_email || '',
          'LOGIN ID': inst.login_id || '',
          '1ST YR STRENGTH': Number(inst.strength_1st_year) || 0,
          '2ND YR STRENGTH': Number(inst.strength_2nd_year) || 0,
          '3RD YR STRENGTH': Number(inst.strength_3rd_year) || 0,
          'TOTAL VACANCY': (Number(inst.strength_1st_year) || 0) + (Number(inst.strength_2nd_year) || 0) + (Number(inst.strength_3rd_year) || 0),
          'COMPLETE ADDRESS': inst.complete_address || '',
          'GOOGLE LOCATION': inst.google_location || ''
        }))
      : [
          {
            'INSTITUTION NAME': 'APS SHANKAR VIHAR',
            'PIN CODE': '110010',
            'ANO / CTO INCHARGE': 'MUKESH RAUTELA (ANO)',
            'ANO CONTACT': '+91 9876543210',
            'ANO EMAIL': 'mukesh@gmail.com',
            'LOGIN ID': 'mukesh@gmail.com',
            '1ST YR STRENGTH': 50,
            '2ND YR STRENGTH': 50,
            '3RD YR STRENGTH': 0,
            'TOTAL VACANCY': 100,
            'COMPLETE ADDRESS': 'Peripheral Rd, opp. Metro Station, Shankar Vihar, New Delhi',
            'GOOGLE LOCATION': 'https://maps.google.com'
          }
        ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 32 }, { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 28 }, { wch: 20 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 30 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Institutions');
    const filename = `NCC_Institutions_List_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // -------------------------------------------------------------
  // EXCEL SAMPLE TEMPLATE DOWNLOAD
  // -------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'INSTITUTION NAME': 'ARMY PUBLIC SCHOOL SHANKAR VIHAR',
        'PIN CODE': '110010',
        'ANO / CTO INCHARGE': 'Lt. Rajesh Kumar',
        'ANO CONTACT': '+91 9876543210',
        'ANO EMAIL': 'ano.aps@gmail.com',
        'LOGIN ID': 'ano_aps',
        '1ST YR STRENGTH': 50,
        '2ND YR STRENGTH': 50,
        '3RD YR STRENGTH': 0,
        'TOTAL VACANCY': 100,
        'COMPLETE ADDRESS': 'Near Shankar Vihar Metro Station, New Delhi 110010',
        'GOOGLE LOCATION': ''
      },
      {
        'INSTITUTION NAME': 'DELHI PUBLIC SCHOOL RK PURAM',
        'PIN CODE': '110022',
        'ANO / CTO INCHARGE': 'Chief Officer A. K. Sharma',
        'ANO CONTACT': '+91 9811223344',
        'ANO EMAIL': 'ano.dps@gmail.com',
        'LOGIN ID': 'ano_dps',
        '1ST YR STRENGTH': 50,
        '2ND YR STRENGTH': 40,
        '3RD YR STRENGTH': 30,
        'TOTAL VACANCY': 120,
        'COMPLETE ADDRESS': 'Sector XII, R. K. Puram, New Delhi 110022',
        'GOOGLE LOCATION': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 35 }, { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 26 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 30 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Institution_Template');
    XLSX.writeFile(workbook, 'NCC_Institutions_Upload_Template.xlsx');
  };

  // -------------------------------------------------------------
  // EXCEL FILE UPLOAD & PARSE
  // -------------------------------------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('The uploaded Excel file has no data rows.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const parsed = rawJson.map((row, idx) => {
          const getVal = (possibleKeys) => {
            for (const key of possibleKeys) {
              const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const instName = getVal(['INSTITUTION NAME', 'Institution Name', 'Institution', 'School Name', 'College Name', 'Name']);
          const pin = getVal(['PIN CODE', 'Pin Code', 'PIN', 'Pincode', 'Postal Code']).replace(/\D/g, '').slice(0, 6);
          const ano = getVal(['ANO / CTO INCHARGE', 'ANO / CTO Incharge', 'ANO Name', 'ANO / CTO Name', 'Incharge', 'ANO']);
          const contact = getVal(['ANO CONTACT', 'Ano Contact', 'Contact', 'Phone', 'Mobile', 'Contact Phone']);
          const email = getVal(['ANO EMAIL', 'Ano Email', 'Email', 'Login Email']);
          const loginId = getVal(['LOGIN ID', 'Login Id', 'Login', 'Username', 'User ID']);
          const s1 = parseInt(getVal(['1ST YR STRENGTH', '1st Yr Strength', '1st Year', 'Strength 1st Year', 'Year 1']) || 0, 10) || 0;
          const s2 = parseInt(getVal(['2ND YR STRENGTH', '2nd Yr Strength', '2nd Year', 'Strength 2nd Year', 'Year 2']) || 0, 10) || 0;
          const s3 = parseInt(getVal(['3RD YR STRENGTH', '3rd Yr Strength', '3rd Year', 'Strength 3rd Year', 'Year 3']) || 0, 10) || 0;
          const address = getVal(['COMPLETE ADDRESS', 'Complete Address', 'Address', 'Institution Address']);
          const googleLoc = getVal(['GOOGLE LOCATION', 'Google Location', 'Location Link', 'Map Link', 'Google Map']);

          return {
            rowNum: idx + 2,
            institution_name: instName,
            pin_code: pin,
            ano_cto_name: ano || 'ANO Incharge',
            ano_cto_contact: contact,
            ano_cto_email: email,
            login_id: loginId,
            strength_1st_year: s1,
            strength_2nd_year: s2,
            strength_3rd_year: s3,
            total_vacancy: s1 + s2 + s3,
            complete_address: address,
            google_location: googleLoc
          };
        }).filter(r => r.institution_name.length > 0);

        if (parsed.length === 0) {
          alert('Could not find valid institutions in the uploaded sheet. Please make sure the sheet includes an "INSTITUTION NAME" column.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setExcelPreviewData(parsed);
        setShowUploadModal(true);
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // -------------------------------------------------------------
  // CONFIRM BULK IMPORT
  // -------------------------------------------------------------
  const handleConfirmBulkImport = async () => {
    if (!excelPreviewData || excelPreviewData.length === 0) return;
    setImporting(true);
    setUploadError('');

    try {
      const res = await fetch('/api/institutions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ institutions: excelPreviewData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk upload failed');

      alert(`✅ Excel Import Completed!\n\n${data.message}`);
      setShowUploadModal(false);
      setExcelPreviewData([]);
      fetchInstitutions();
    } catch (err) {
      console.error('Import error:', err);
      setUploadError(err.message);
    } finally {
      setImporting(false);
    }
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institutions & Cadet Vacancy Strengths</h2>
          <p className="text-sm text-slate-500">Add institutions under your NCC Unit, set 1st/2nd/3rd year cadet quotas & issue ANO login</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Excel Export */}
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 font-bold text-xs shadow-sm transition-all inline-flex items-center gap-2"
            title="Download list of institutions in Excel (.xlsx) with same columns"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Download Sample Template */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 font-bold text-xs shadow-sm transition-all inline-flex items-center gap-2"
            title="Download blank sample Excel template with columns pre-configured"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Sample Template</span>
          </button>

          {/* Upload Excel Button */}
          <label className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Upload Excel</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Manual Add Institution Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Institution
          </button>
        </div>
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
              {(Array.isArray(institutions) ? institutions : []).filter(inst =>
                !pinFilter || (inst.pin_code && inst.pin_code.startsWith(pinFilter))
              ).length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500 font-medium">
                    {pinFilter ? `No institutions found with PIN starting with "${pinFilter}".` : 'No institutions onboarded yet under this NCC Unit.'}
                  </td>
                </tr>
              ) : (
                (Array.isArray(institutions) ? institutions : [])
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
                      <td className="p-4 text-xs">
                        {inst.ano_email ? (
                          <div className="font-mono text-blue-600 font-semibold">{inst.ano_email}</div>
                        ) : (
                          <div className="text-slate-400 italic">No email registered</div>
                        )}
                        {inst.login_id && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {inst.login_id}</div>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600">{inst.strength_1st_year}</td>
                      <td className="p-4 text-center font-bold text-indigo-400">{inst.strength_2nd_year}</td>
                      <td className="p-4 text-center font-bold text-purple-400">{inst.strength_3rd_year}</td>
                      <td className="p-4 text-center font-extrabold text-emerald-600">{total}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(inst)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-xs"
                            title="Edit Institution"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInst(inst)}
                            disabled={deletingId === inst.id}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Delete Institution"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* EXCEL UPLOAD PREVIEW & CONFIRMATION MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-200 p-6 space-y-5 my-6 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Review Excel Import ({excelPreviewData.length} Institution{excelPreviewData.length === 1 ? '' : 's'} Found)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Existing institutions will have their quota strengths and ANO contact updated; new institutions will be onboarded automatically.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  {excelPreviewData.length} Rows Ready
                </span>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Institution Name</th>
                      <th className="p-3">PIN</th>
                      <th className="p-3">ANO Incharge</th>
                      <th className="p-3">ANO Contact / Email</th>
                      <th className="p-3 text-center">1st Yr</th>
                      <th className="p-3 text-center">2nd Yr</th>
                      <th className="p-3 text-center">3rd Yr</th>
                      <th className="p-3 text-center font-bold text-emerald-700">Total Vacancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelPreviewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{row.institution_name}</td>
                        <td className="p-3 font-mono text-slate-600">{row.pin_code || '—'}</td>
                        <td className="p-3 text-slate-800">{row.ano_cto_name}</td>
                        <td className="p-3 text-slate-500">
                          <div>{row.ano_cto_contact || 'No phone'}</div>
                          <div className="text-[10px] text-blue-600 font-mono">{row.ano_cto_email || 'Auto-generated'}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-blue-600">{row.strength_1st_year}</td>
                        <td className="p-3 text-center font-bold text-indigo-500">{row.strength_2nd_year}</td>
                        <td className="p-3 text-center font-bold text-purple-500">{row.strength_3rd_year}</td>
                        <td className="p-3 text-center font-black text-emerald-600">{row.total_vacancy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400">
                  Ensure cadet strength quotas align with sanctioned battalion authorization.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => { setShowUploadModal(false); setExcelPreviewData([]); }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmBulkImport}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Importing {excelPreviewData.length} Institutions...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm & Import ({excelPreviewData.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
