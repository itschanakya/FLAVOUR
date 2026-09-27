import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Package,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Layers,
  Copy,
  Info,
  Clock,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { getItemPhoto } from '../pages/InventoryPage';

export default function UnitMenuManager() {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingAll, setCopyingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Item to Menu Form
  const [newItemId, setNewItemId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  // 1. Fetch all Units & Catalog
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [unitsRes, catRes] = await Promise.all([
        fetch('/api/units', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/catalog', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const unitsData = await unitsRes.json();
      const catData = await catRes.json();

      const unitList = Array.isArray(unitsData) ? unitsData : [];
      setUnits(unitList);

      // Filter catalog to active items excluding composite standard packet
      const rawCatalog = Array.isArray(catData) ? catData : [];
      const filteredCatalog = rawCatalog.filter(
        i => i.is_active === 1 && i.item_name !== 'Standard Refreshment Packet'
      );
      setCatalog(filteredCatalog);

      if (filteredCatalog.length > 0) {
        setNewItemId(String(filteredCatalog[0].id));
      }

      if (unitList.length > 0 && !selectedUnitId) {
        setSelectedUnitId(String(unitList[0].id));
        setSelectedUnit(unitList[0]);
      }
    } catch (err) {
      console.error('Error fetching units or catalog:', err);
      setErrorMsg('Failed to load units or inventory items.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedUnitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Fetch Menu for Selected Unit
  const fetchUnitMenu = useCallback(async (unitId) => {
    if (!unitId) return;
    setLoadingMenu(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/units/${unitId}/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMenuItems(Array.isArray(data.items) ? data.items : []);
        setIsCustomized(Boolean(data.is_customized));
        setSelectedUnit(data.unit || null);
      } else {
        throw new Error(data.error || 'Failed to fetch unit menu');
      }
    } catch (err) {
      console.error('Fetch unit menu error:', err);
      setErrorMsg(err.message);
    } finally {
      setLoadingMenu(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedUnitId) {
      fetchUnitMenu(selectedUnitId);
    }
  }, [selectedUnitId, fetchUnitMenu]);

  // Handle unit selection change
  const handleUnitSelect = (id) => {
    setSelectedUnitId(id);
    const u = units.find(item => String(item.id) === String(id));
    if (u) setSelectedUnit(u);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Menu item modification
  const handleQuantityChange = (itemId, qty) => {
    const val = parseInt(qty, 10);
    if (isNaN(val) || val <= 0) return;
    setMenuItems(prev =>
      prev.map(it => {
        if (it.item_id === itemId) {
          const lineCost = (it.unit_price || 0) * val;
          return { ...it, quantity: val, line_total: lineCost };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (itemId) => {
    setMenuItems(prev => prev.filter(it => it.item_id !== itemId));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemId) return;
    const catItem = catalog.find(i => String(i.id) === String(newItemId));
    if (!catItem) return;

    const existingIndex = menuItems.findIndex(i => i.item_id === catItem.id);
    if (existingIndex >= 0) {
      // Increment quantity
      handleQuantityChange(catItem.id, (menuItems[existingIndex].quantity || 1) + newItemQty);
    } else {
      const lineCost = (catItem.unit_price || 0) * newItemQty;
      setMenuItems(prev => [
        ...prev,
        {
          id: 0,
          unit_id: parseInt(selectedUnitId, 10),
          item_id: catItem.id,
          item_name: catItem.item_name,
          unit_price: catItem.unit_price,
          unit_of_measure: catItem.unit_of_measure,
          current_stock: catItem.current_stock,
          quantity: newItemQty,
          line_total: lineCost
        }
      ]);
    }
    setNewItemQty(1);
  };

  // Calculations
  const subtotal = menuItems.reduce((sum, it) => sum + (it.unit_price || 0) * (it.quantity || 1), 0);
  const targetBudget = 75.0;
  const isBudgetExceeded = subtotal > targetBudget;

  // Save Unit Menu
  const handleSaveMenu = async () => {
    if (!selectedUnitId) return;
    if (menuItems.length === 0) {
      setErrorMsg('Menu chart must contain at least one item.');
      return;
    }

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        items: menuItems.map(it => ({
          item_id: it.item_id,
          quantity: parseInt(it.quantity, 10) || 1
        }))
      };

      const res = await fetch(`/api/units/${selectedUnitId}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save menu chart');

      setSuccessMsg(`Menu chart for ${selectedUnit?.unit_name || 'Unit'} successfully saved!`);
      setIsCustomized(true);
      fetchUnitMenu(selectedUnitId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy Menu to All Units
  const handleCopyToAllUnits = async () => {
    if (menuItems.length === 0) return;
    if (!window.confirm(`Copy this menu composition to ALL ${units.length} NCC units? Existing menus will be replaced.`)) {
      return;
    }

    setCopyingAll(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        items: menuItems.map(it => ({
          item_id: it.item_id,
          quantity: parseInt(it.quantity, 10) || 1
        }))
      };

      for (const u of units) {
        await fetch(`/api/units/${u.id}/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      setSuccessMsg(`Successfully applied this menu chart to all ${units.length} NCC units!`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to copy menu to all units.');
    } finally {
      setCopyingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading NCC Units and Menu configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold mb-2 backdrop-blur-xs border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Internal Console • Restricted Visibility</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Dedicated Unit Refreshment Menu Charts
            </h2>
            <p className="text-xs md:text-sm text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Configure the exact stock items & ingredients that compose 1 standard refreshment packet for each NCC Unit. 
              When demands are prepared at Supply Point, these items are automatically charged off from Stock Management.
            </p>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Statutory Packet Ceiling</span>
            <span className="text-2xl font-black text-amber-300">₹75.00</span>
            <span className="text-[10px] text-blue-200 block mt-0.5">Fixed Cadet Rate</span>
          </div>
        </div>
      </div>

      {/* Info Notice on Privacy & Visibility */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Strict Operational Visibility Rule:</strong>
          <span className="ml-1">
            Cadets, Institutions, and Units only see the aggregate <strong>"Standard Refreshment Packet of ₹75/-"</strong>. 
            The raw inventory breakdown configured below is strictly confidential to HQ Vendor Admin and the Supply Point preparation team.
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-800">×</button>
        </div>
      )}

      {/* Main Grid: Left Unit Selector, Right Menu Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: NCC Units Selection Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Select NCC Unit</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {units.length} Units
              </span>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {units.map(u => {
                const isSelected = String(u.id) === String(selectedUnitId);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUnitSelect(String(u.id))}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {u.unit_code || u.unit_name}
                      </span>
                      {u.ncc_group && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.ncc_group}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {u.unit_name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Menu Chart Editor for Selected Unit */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
            {/* Editor Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedUnit?.unit_name || 'Selected Unit'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCustomized 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isCustomized ? 'Custom Dedicated Menu' : 'Default Standard Template'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Items making up 1 cadet refreshment packet for this unit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToAllUnits}
                  disabled={copyingAll || menuItems.length === 0}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all border border-slate-200 disabled:opacity-50"
                  title="Apply this exact menu configuration to all units"
                >
                  {copyingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy to All Units</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMenu}
                  disabled={saving || menuItems.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Menu Chart</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            {loadingMenu ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading unit menu...</span>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No items in this unit's menu yet. Add items below.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-1">Item Details</th>
                      <th className="pb-3 text-center">In-Stock Balance</th>
                      <th className="pb-3 text-center">Unit Price</th>
                      <th className="pb-3 text-center w-28">Qty / Packet</th>
                      <th className="pb-3 text-right">Line Total</th>
                      <th className="pb-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {menuItems.map(item => {
                      const photoUrl = getItemPhoto(item.item_name, item.image_url);
                      return (
                        <tr key={item.item_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 pl-1">
                            <div className="flex items-center gap-3">
                              <img
                                src={photoUrl}
                                alt={item.item_name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <span className="font-extrabold text-slate-900 block">{item.item_name}</span>
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  Per {item.unit_of_measure || 'unit'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (item.current_stock || 0) <= 20 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.current_stock ?? 'N/A'} in stock
                            </span>
                          </td>

                          <td className="py-3 text-center font-bold text-slate-800">
                            ₹{(item.unit_price || 0).toFixed(2)}
                          </td>

                          <td className="py-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.item_id, Math.max(1, (item.quantity || 1) - 1))}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-black text-slate-900">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.item_id, (item.quantity || 1) + 1)}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="py-3 text-right font-black text-slate-900">
                            ₹{((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
                          </td>

                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.item_id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtotal & Budget Ceiling Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Packet Unit Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900">₹{subtotal.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ packet</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div className="text-left hidden sm:block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Statutory Ceiling</span>
                  <span className="text-sm font-bold text-slate-700">₹75.00</span>
                </div>
              </div>

              <div>
                {isBudgetExceeded ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Exceeds ₹75.00 limit by ₹{(subtotal - targetBudget).toFixed(2)}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Balanced within statutory budget
                  </span>
                )}
              </div>
            </div>

            {/* Add New Item to Menu Form */}
            <form onSubmit={handleAddItem} className="pt-4 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight block mb-2">
                + Add Item from Inventory Catalog
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7">
                  <select
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {catalog.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.item_name} (₹{c.unit_price} / {c.unit_of_measure}) — {c.current_stock ?? 0} in stock
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 shrink-0">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
