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

  const handleCardClick = (catItem) => {
    const existingIndex = menuItems.findIndex(i => i.item_id === catItem.id);
    if (existingIndex >= 0) {
      handleRemoveItem(catItem.id);
    } else {
      const lineCost = (catItem.unit_price || 0) * 1;
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
          quantity: 1,
          line_total: lineCost,
          image_url: catItem.image_url
        }
      ]);
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

      {/* Main Grid: Left Items Selection, Right Menu Editor & Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Available Items Shelf */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                Available Refreshment Items ({catalog.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                1-Click to add item to unit menu. Click again to remove.
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              1-Click Toggle
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto pr-2">
            {catalog.map((item) => {
              const inMenu = menuItems.find(p => String(p.item_id) === String(item.id));
              const inMenuQty = inMenu ? inMenu.quantity : 0;
              const photo = getItemPhoto(item.item_name, item.image_url);

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between select-none ${
                    inMenuQty > 0
                      ? 'bg-amber-50/70 border-amber-500 shadow-md ring-2 ring-amber-400/60 hover:shadow-lg cursor-pointer'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  {/* Photo Header */}
                  <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={photo}
                      alt={item.item_name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        inMenuQty > 0 ? 'scale-110 opacity-90' : 'group-hover:scale-110'
                      }`}
                    />
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                    
                    {/* Item Stock Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs border ${
                        (item.current_stock || 0) > 20
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-amber-500 text-white border-amber-600'
                      }`}>
                        Stock: {item.current_stock || 0}
                      </span>
                    </div>

                    {/* Quantity Badge (If in menu) */}
                    {inMenuQty > 0 && (
                      <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex flex-col items-center justify-center">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-lg shadow-lg border-2 border-white transform scale-110 animate-in zoom-in duration-200">
                          {inMenuQty}
                        </div>
                        <span className="text-[10px] font-bold text-white mt-1 drop-shadow-md bg-black/40 px-2 py-0.5 rounded-md">
                          In Unit Menu
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content Footer */}
                  <div className="p-3 bg-white">
                    <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate" title={item.item_name}>
                      {item.item_name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-slate-500">{item.unit_of_measure}</span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{(item.unit_price || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Menu Chart Editor & Filter */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Unit Filter Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <label className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Select NCC Unit</span>
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => handleUnitSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>-- Select Unit --</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_code ? `${u.unit_code} - ` : ''}{u.unit_name}
                </option>
              ))}
            </select>
          </div>

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
                    {isCustomized ? 'Custom Menu' : 'Default Menu'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveMenu}
                  disabled={saving || menuItems.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Menu</span>
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
                No items in this unit's menu yet. Add items from the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-1">Item</th>
                      <th className="pb-3 text-center w-24">Qty</th>
                      <th className="pb-3 text-right">Total</th>
                      <th className="pb-3 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {menuItems.map(item => {
                      const photoUrl = getItemPhoto(item.item_name, item.image_url);
                      return (
                        <tr key={item.item_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 pl-1">
                            <div className="flex items-center gap-2">
                              <img src={photoUrl} alt={item.item_name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                              <div className="w-24 sm:w-32 truncate">
                                <span className="font-extrabold text-slate-900 block truncate" title={item.item_name}>{item.item_name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">₹{(item.unit_price || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 text-center">
                            <div className="inline-flex items-center justify-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.item_id, Math.max(1, (item.quantity || 1) - 1))}
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-700 bg-white hover:bg-slate-200 shadow-xs cursor-pointer"
                              >-</button>
                              <span className="w-6 text-center font-black text-slate-900 text-[11px]">{item.quantity || 1}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.item_id, (item.quantity || 1) + 1)}
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-700 bg-white hover:bg-slate-200 shadow-xs cursor-pointer"
                              >+</button>
                            </div>
                          </td>

                          <td className="py-2 text-right font-black text-slate-900">
                            ₹{((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
                          </td>

                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.item_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Packet Unit Price</span>
                  <span className="text-lg font-black text-slate-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Statutory Ceiling</span>
                  <span className="text-sm font-bold text-slate-700">₹75.00</span>
                </div>
              </div>

              {isBudgetExceeded ? (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                  Exceeds limit by ₹{(subtotal - targetBudget).toFixed(2)}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  Balanced within statutory budget
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyToAllUnits}
              disabled={copyingAll || menuItems.length === 0}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex justify-center items-center gap-1.5 transition-all border border-slate-200 disabled:opacity-50"
            >
              {copyingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Configuration to All Units</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
