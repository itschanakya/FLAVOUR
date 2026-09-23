import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, ClipboardList, PlusCircle } from 'lucide-react';
import StandardPacketViewer from '../components/StandardPacketViewer';
import CustomDateInput from '../components/CustomDateInput';

export default function RaiseDemandPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [demandDate, setDemandDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Institutional Drill Parade Refreshments');

  const [selectedItems, setSelectedItems] = useState([
    { item_id: '', year_group: '1st Year', quantity: 10 }
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      // 1. Fetch institution details for vacancy bounds
      let currentInst = null;
      const instRes = await fetch('/api/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const instData = await instRes.json();
      if (instData && instData.length > 0) {
        currentInst = instData[0];
        setInstitution(currentInst);
      }

      // 2. Fetch catalog items
      const catRes = await fetch('/api/catalog', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const catData = await catRes.json();
      setCatalog(catData);
      if (catData.length > 0) {
        const defaultItemId = catData[0].id.toString();
        const initial = [];
        if (currentInst) {
          if ((currentInst.strength_1st_year || 0) > 0) {
            initial.push({ item_id: defaultItemId, year_group: '1st Year', quantity: currentInst.strength_1st_year });
          }
          if ((currentInst.strength_2nd_year || 0) > 0) {
            initial.push({ item_id: defaultItemId, year_group: '2nd Year', quantity: currentInst.strength_2nd_year });
          }
          if ((currentInst.strength_3rd_year || 0) > 0) {
            initial.push({ item_id: defaultItemId, year_group: '3rd Year', quantity: currentInst.strength_3rd_year });
          }
        }
        if (initial.length === 0) {
          initial.push({ item_id: defaultItemId, year_group: '1st Year', quantity: currentInst?.strength_1st_year || 0 });
        }
        setSelectedItems(initial);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (catalog.length === 0) return;
    const existingYears = selectedItems.map(i => i.year_group);
    let nextYear = '1st Year';
    let defaultQty = institution?.strength_1st_year || 0;
    if (!existingYears.includes('1st Year')) {
      nextYear = '1st Year';
      defaultQty = institution?.strength_1st_year || 0;
    } else if (!existingYears.includes('2nd Year')) {
      nextYear = '2nd Year';
      defaultQty = institution?.strength_2nd_year || 0;
    } else if (!existingYears.includes('3rd Year')) {
      nextYear = '3rd Year';
      defaultQty = institution?.strength_3rd_year || 0;
    }
    setSelectedItems([
      ...selectedItems,
      { item_id: catalog[0].id.toString(), year_group: nextYear, quantity: defaultQty }
    ]);
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    if (field === 'year_group') {
      const vacMap = {
        '1st Year': institution?.strength_1st_year || 0,
        '2nd Year': institution?.strength_2nd_year || 0,
        '3rd Year': institution?.strength_3rd_year || 0
      };
      if (vacMap[value] !== undefined) {
        updated[index]['quantity'] = vacMap[value];
      }
    }
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  // LIVE VACANCY CALCULATIONS
  const s1 = institution?.strength_1st_year || 0;
  const s2 = institution?.strength_2nd_year || 0;
  const s3 = institution?.strength_3rd_year || 0;

  const totalRequested = {
    '1st Year': 0,
    '2nd Year': 0,
    '3rd Year': 0
  };

  let grandTotalAmount = 0;

  selectedItems.forEach((row) => {
    const qty = parseInt(row.quantity) || 0;
    if (totalRequested.hasOwnProperty(row.year_group)) {
      totalRequested[row.year_group] += qty;
    }
    const catItem = catalog.find((c) => c.id.toString() === row.item_id.toString());
    if (catItem) {
      grandTotalAmount += qty * 75; // Enforce fixed ₹75 rate globally
    }
  });

  const isY1Exceeded = totalRequested['1st Year'] > s1;
  const isY2Exceeded = totalRequested['2nd Year'] > s2;
  const isY3Exceeded = totalRequested['3rd Year'] > s3;

  const isQuotaExceeded = isY1Exceeded || isY2Exceeded || isY3Exceeded;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isQuotaExceeded) {
      setError('Cannot submit demand: total requested quantity exceeds sanctioned cadet strength.');
      return;
    }

    if (selectedItems.length === 0) {
      setError('At least one refreshment item is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        demand_date: demandDate,
        purpose,
        items: selectedItems.map((it) => ({
          item_id: parseInt(it.item_id),
          year_group: it.year_group,
          quantity: parseInt(it.quantity)
        }))
      };

      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demand.');
      }

      alert(`Demand ${data.demand.demand_number} initiated successfully! Sent to NCC Unit for approval.`);
      navigate('/my-demands');

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading demand form...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => navigate('/my-demands')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
          title="Back to My Placed Demands"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Placed Demands</span>
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Initiate Refreshment Demand</h2>
          <p className="text-sm text-slate-500">
            Submit cadet refreshment requisition to <span className="text-blue-600 font-semibold">{institution?.unit_name}</span>
          </p>
        </div>
      </div>

      {/* LIVE VACANCY QUOTA BANNER */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sanctioned Cadet Strength vs Demand Request (Live Quota Check)
          </span>
          {isQuotaExceeded ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" /> Quota Exceeded!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Within Allowed Vacancy Quota
            </span>
          )}
        </div>

        <div className={`grid grid-cols-1 ${Number(s3) > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
          {/* 1st Year */}
          <div className={`p-3.5 rounded-xl border text-center transition-all ${isY1Exceeded ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-white border-slate-200'
            }`}>
            <span className="text-xs font-semibold text-slate-500">1st Year Cadets</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              <span className={isY1Exceeded ? 'text-rose-600 font-black' : 'text-blue-600'}>{totalRequested['1st Year']}</span>
              <span className="text-xs text-slate-500 font-normal"> / {s1} Sanctioned</span>
            </div>
            <p className="text-[11px] mt-1 text-slate-500">
              {s1 - totalRequested['1st Year'] >= 0
                ? `${s1 - totalRequested['1st Year']} remaining`
                : `${Math.abs(s1 - totalRequested['1st Year'])} OVER LIMIT`}
            </p>
          </div>

          {/* 2nd Year */}
          <div className={`p-3.5 rounded-xl border text-center transition-all ${isY2Exceeded ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-white border-slate-200'
            }`}>
            <span className="text-xs font-semibold text-slate-500">2nd Year Cadets</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              <span className={isY2Exceeded ? 'text-rose-600 font-black' : 'text-indigo-400'}>{totalRequested['2nd Year']}</span>
              <span className="text-xs text-slate-500 font-normal"> / {s2} Sanctioned</span>
            </div>
            <p className="text-[11px] mt-1 text-slate-500">
              {s2 - totalRequested['2nd Year'] >= 0
                ? `${s2 - totalRequested['2nd Year']} remaining`
                : `${Math.abs(s2 - totalRequested['2nd Year'])} OVER LIMIT`}
            </p>
          </div>

          {/* 3rd Year */}
          {Number(s3) > 0 && (
            <div className={`p-3.5 rounded-xl border text-center transition-all ${isY3Exceeded ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-white border-slate-200'
              }`}>
              <span className="text-xs font-semibold text-slate-500">3rd Year Cadets</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                <span className={isY3Exceeded ? 'text-rose-600 font-black' : 'text-purple-400'}>{totalRequested['3rd Year']}</span>
                <span className="text-xs text-slate-500 font-normal"> / {s3} Sanctioned</span>
              </div>
              <p className="text-[11px] mt-1 text-slate-500">
                {s3 - totalRequested['3rd Year'] >= 0
                  ? `${s3 - totalRequested['3rd Year']} remaining`
                  : `${Math.abs(s3 - totalRequested['3rd Year'])} OVER LIMIT`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Standard Refreshment Packet Specification (₹75) with Batch Expiry */}
      <StandardPacketViewer defaultOpen={true} />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* DEMAND FORM */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Demand Requisition Date
              </label>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                DD/MM/YYYY
              </span>
            </div>
            <CustomDateInput
              value={demandDate}
              onChange={(isoVal) => setDemandDate(isoVal)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Parade / Event Purpose
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Combined Annual Training Camp (CATC) Day 1"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* ITEMS SELECTION */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Select Refreshment Items & Year Groups</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-600 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item Line
            </button>
          </div>

          {selectedItems.map((itemRow, index) => {
            const currentItem = catalog.find((c) => c.id.toString() === itemRow.item_id.toString());
            const lineTotal = (parseInt(itemRow.quantity) || 0) * (currentItem?.unit_price || 0);
            const isItemExpired = currentItem?.is_expired;

            return (
              <div key={index} className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center ${
                isItemExpired ? 'bg-rose-50/80 border-rose-300' : 'bg-white/80 border-slate-200'
              }`}>
                {/* Catalog Item select */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Refreshment Item</label>
                  <select
                    value={itemRow.item_id}
                    onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${
                      isItemExpired ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                    }`}
                  >
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.is_expired}>
                        {c.item_name} (₹{c.unit_price} / {c.unit_of_measure})
                        {c.is_expired ? ` ⛔ EXPIRED (${c.expiry_date})` : ''}
                      </option>
                    ))}
                  </select>
                  {isItemExpired && (
                    <span className="text-[10px] font-black text-rose-600 block mt-1">
                      ⛔ EXPIRED on {currentItem.expiry_date} — Cannot place demand.
                    </span>
                  )}
                </div>

                {/* Year Group select */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Year Group</label>
                  <select
                    value={itemRow.year_group}
                    onChange={(e) => handleItemChange(index, 'year_group', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="1st Year">1st Year Cadets</option>
                    <option value="2nd Year">2nd Year Cadets</option>
                    <option value="3rd Year">3rd Year Cadets</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={itemRow.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Line Total & Remove */}
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0">
                  <span className="text-xs font-bold text-emerald-600">₹{lineTotal.toLocaleString('en-IN')}</span>
                  {selectedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY & SUBMIT */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Grand Estimated Cost</span>
            <span className="text-2xl font-black text-emerald-600">₹{grandTotalAmount.toLocaleString('en-IN')}</span>
          </div>

          <button
            type="submit"
            disabled={submitting || isQuotaExceeded}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting Demand...' : 'Submit Demand to NCC Unit'}
          </button>
        </div>
      </form>
    </div>
  );
}
