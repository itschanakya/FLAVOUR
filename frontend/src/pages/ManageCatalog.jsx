import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Package,
  History,
  ArrowUpRight,
  ShieldAlert,
  Info,
  Check,
  RefreshCw,
  Boxes,
  Upload,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export const getItemPhoto = (itemName, customImageUrl) => {
  if (customImageUrl && typeof customImageUrl === 'string' && customImageUrl.trim() !== '') {
    return customImageUrl;
  }
  if (!itemName) return '/items/samosa.jpg';
  const name = itemName.toLowerCase();
  if (name.includes('samosa') || name.includes('tea')) return '/items/samosa.jpg';
  if (name.includes('juice') || name.includes('tetra') || name.includes('fruit')) return '/items/juice.jpg';
  if (name.includes('biscuit') || name.includes('glucose') || name.includes('cookie')) return '/items/biscuit.jpg';
  if (name.includes('energy') || name.includes('bar') || name.includes('protein')) return '/items/energy_bar.jpg';
  if (name.includes('muffin') || name.includes('cake')) return '/items/muffin.jpg';
  if (name.includes('water') || name.includes('bottle') || name.includes('mineral')) return '/items/water.jpg';
  return '/items/samosa.jpg';
};

export const formatExpiryDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const getExpiryStatus = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { expired: true, label: `Expired ${Math.abs(diffDays)}d ago` };
  if (diffDays === 0) return { expired: true, label: 'Expires Today' };
  if (diffDays <= 15) return { expiringSoon: true, label: `${diffDays}d left` };
  return { valid: true, label: `${diffDays}d left` };
};

export default function ManageCatalog({ embedded = false, initialView = 'catalog' }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(initialView || 'catalog'); // 'catalog' | 'stock' | 'packet'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialView) {
      setActiveTab(initialView);
    }
  }, [initialView]);

  // Catalog Item Photo state
  const [itemImageUrl, setItemImageUrl] = useState('/items/samosa.jpg');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState('');



  const handlePhotoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadPhotoError('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/catalog/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
      setItemImageUrl(data.imageUrl);
    } catch (err) {
      console.error('Photo upload error:', err);
      setUploadPhotoError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Item Form / Edit state
  const [editingItem, setEditingItem] = useState(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [stockQty, setStockQty] = useState('50');
  const [stockDateTime, setStockDateTime] = useState('');
  const [stockExpiryDate, setStockExpiryDate] = useState('');
  const [stockNotes, setStockNotes] = useState('');

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogsItem, setSelectedLogsItem] = useState(null);
  const [stockLogs, setStockLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Item Form state
  const [itemName, setItemName] = useState('');
  const [unitPrice, setUnitPrice] = useState('25.0');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Packet');
  const [initialStock, setInitialStock] = useState('100');
  const [minThreshold, setMinThreshold] = useState('10');
  const [itemExpiryDate, setItemExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Packet Builder State
  const [packetData, setPacketData] = useState(null);
  const [packetItems, setPacketItems] = useState([]);
  const [packetName, setPacketName] = useState('Standard Refreshment Packet');
  const [savingPacket, setSavingPacket] = useState(false);

  // Toast / Alerts
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const addToast = () => {}; // Toast notifications removed per user request

  useEffect(() => {
    fetchCatalog();
    fetchPacketTemplate();
  }, []);

  // Set default stock in date & time whenever stock modal opens
  useEffect(() => {
    if (showStockModal) {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setStockDateTime(localISO);

      // Default stock expiry date: 90 days ahead
      const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      setStockExpiryDate(future.toISOString().split('T')[0]);
      setStockNotes('Fresh batch restock');
      setStockQty('50');
    }
  }, [showStockModal]);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);

        // Check for expired items to alert the user
        const expiredList = data.filter(i => i.is_expired);
        if (expiredList.length > 0) {
          addToast(
            `⚠️ Alert: ${expiredList.length} item(s) are EXPIRED (${expiredList.map(i => i.item_name).join(', ')}). They are blocked from refreshment packets.`,
            'error'
          );
        }
      }
    } catch (err) {
      console.error('Fetch catalog error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPacketTemplate = async () => {
    try {
      const res = await fetch('/api/packets/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPacketData(data);
        setPacketName(data.template?.name || 'Standard Refreshment Packet');
        if (Array.isArray(data.items)) {
          setPacketItems(data.items.map(it => ({
            item_id: it.item_id.toString(),
            quantity: it.quantity || 1,
            expiry_date: it.expiry_date || ''
          })));
        }
      }
    } catch (err) {
      console.error('Fetch packet template error:', err);
    }
  };

  // Open Create / Reset Form
  const handleOpenCreate = () => {
    setEditingItem(null);
    setItemName('');
    setItemImageUrl('/items/samosa.jpg');
    setUploadPhotoError('');
    setUnitPrice('25.0');
    setUnitOfMeasure('Packet');
    setInitialStock('100');
    setMinThreshold('10');
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setItemExpiryDate(future);
    setIsActive(true);
    setError('');
  };

  // Open Edit / Populate Form
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setItemImageUrl(item.image_url || getItemPhoto(item.item_name));
    setUploadPhotoError('');
    setUnitPrice(item.unit_price.toString());
    setUnitOfMeasure(item.unit_of_measure);
    setMinThreshold((item.min_threshold || 10).toString());
    setItemExpiryDate(item.expiry_date || '');
    setIsActive(item.is_active === 1);
    setError('');
  };

  // Submit Create / Edit Item
  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingItem) {
        const res = await fetch(`/api/catalog/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            item_name: itemName,
            unit_price: parseFloat(unitPrice),
            unit_of_measure: unitOfMeasure,
            min_threshold: parseInt(minThreshold, 10),
            expiry_date: itemExpiryDate || null,
            is_active: isActive,
            image_url: itemImageUrl
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleOpenCreate();
      } else {
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            item_name: itemName,
            unit_price: parseFloat(unitPrice),
            unit_of_measure: unitOfMeasure,
            initial_stock: parseInt(initialStock, 10),
            min_threshold: parseInt(minThreshold, 10),
            expiry_date: itemExpiryDate || null,
            image_url: itemImageUrl
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleOpenCreate();
      }

      fetchCatalog();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete '${item.item_name}' from the refreshment catalog?\n\nThis will remove the item and its stock logs.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/catalog/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message || `Item '${item.item_name}' deleted.`, 'success');
      fetchCatalog();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Stock In Modal
  const handleOpenStockIn = (item) => {
    setSelectedStockItem(item);
    setShowStockModal(true);
    setError('');
  };

  // Submit Stock In
  const handleSubmitStockIn = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!stockExpiryDate) {
        throw new Error('Please select a New Expiry Date for the incoming stock.');
      }
      if (stockExpiryDate <= todayStr) {
        throw new Error('New Expiry Date must be a future date.');
      }

      const res = await fetch(`/api/catalog/${selectedStockItem.id}/stock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: parseInt(stockQty, 10),
          expiry_date: stockExpiryDate,
          created_at: stockDateTime,
          notes: stockNotes
        })
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Failed to record stock shipment.');

      addToast(`Added +${stockQty} units to ${selectedStockItem.item_name}. New Expiry: ${stockExpiryDate}`, 'success');
      setShowStockModal(false);
      fetchCatalog();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // View Stock History Logs
  const handleOpenLogs = async (item) => {
    setSelectedLogsItem(item);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/catalog/${item.id}/stock-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStockLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // PACKET BUILDER CALCULATIONS
  const availableItems = items.filter(i => i.is_active === 1);
  const expiredItems = items.filter(i => i.is_expired);

  const calculatePacketSummary = () => {
    let subtotal = 0;
    const resolvedItems = packetItems.map(pi => {
      const it = items.find(i => i.id.toString() === pi.item_id.toString());
      const price = it ? it.unit_price : 0;
      const qty = parseInt(pi.quantity, 10) || 1;
      const lineTotal = price * qty;
      subtotal += lineTotal;
      const isExp = it ? it.is_expired : false;
      const expDate = pi.expiry_date || (it ? it.expiry_date : '');
      return {
        ...pi,
        item: it,
        price,
        lineTotal,
        is_expired: isExp,
        resolvedExpiry: expDate
      };
    });

    const gstRate = 5.0;
    const gstAmount = parseFloat((subtotal * 0.05).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    const target = 75.0;
    const diff = parseFloat((grandTotal - target).toFixed(2));

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      gstRate,
      gstAmount,
      grandTotal,
      target,
      diff,
      resolvedItems
    };
  };

  const packetSummary = calculatePacketSummary();

  // Packet Items Handlers
  const handleAddPacketItem = () => {
    // Find first non-expired active item
    const validItem = availableItems.find(i => !i.is_expired);
    if (!validItem) {
      alert('No valid non-expired catalog items available! Please add stock with a fresh expiry date first.');
      return;
    }
    setPacketItems(prev => [
      ...prev,
      { item_id: validItem.id.toString(), quantity: 1, expiry_date: validItem.expiry_date || '' }
    ]);
  };

  const handleRemovePacketItem = (idx) => {
    setPacketItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePacketItemChange = (idx, field, val) => {
    setPacketItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      // If changing item_id, inherit its current expiry date
      if (field === 'item_id') {
        const found = items.find(i => i.id.toString() === val.toString());
        if (found) {
          copy[idx].expiry_date = found.expiry_date || '';
        }
      }
      return copy;
    });
  };

  const handleCardClick = (catItem) => {
    if (catItem.is_expired) {
      addToast(`Cannot add '${catItem.item_name}': Expired on ${catItem.expiry_date}! Please restock first.`, 'error');
      return;
    }

    setPacketItems(prev => {
      const existingIdx = prev.findIndex(p => p.item_id.toString() === catItem.id.toString());
      if (existingIdx !== -1) {
        // ONE CLICK ADD, AGAIN REMOVE FROM LIST
        addToast(`Removed '${catItem.item_name}' from packet`, 'info');
        return prev.filter((_, i) => i !== existingIdx);
      } else {
        addToast(`Added '${catItem.item_name}' to packet (+₹${catItem.unit_price})`, 'success');
        return [
          ...prev,
          {
            item_id: catItem.id.toString(),
            quantity: 1,
            expiry_date: catItem.expiry_date || ''
          }
        ];
      }
    });
  };

  // Save Packet Composition
  const handleSavePacket = async () => {
    setSavingPacket(true);
    try {
      if (packetItems.length === 0) {
        throw new Error('Please add at least one item to the refreshment packet.');
      }

      // Check for expired items in packet
      const hasExp = packetSummary.resolvedItems.some(i => i.is_expired);
      if (hasExp) {
        throw new Error('Cannot save packet: Contains expired items! Please remove or restock expired items.');
      }

      // Enforce statutory budget ceiling: Price NOT MORE THAN ₹75.00
      if (packetSummary.grandTotal > 75.00) {
        throw new Error(`Standard Refreshment Packet price cannot exceed ₹75.00! Current cost with 5% GST is ₹${packetSummary.grandTotal.toFixed(2)}. Please adjust item selection or quantity.`);
      }

      const res = await fetch('/api/packets/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: packetName,
          target_budget: 75.0,
          gst_rate: 5.0,
          items: packetItems
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast('Standard Refreshment Packet (₹75) saved successfully! Visible to ANO and Unit.', 'success');
      fetchPacketTemplate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPacket(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* EXPIRED ITEMS WARNING BANNER */}
      {expiredItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900">
                ⚠️ {expiredItems.length} Refreshment Item(s) Expired!
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Expired items are <strong className="underline">strictly blocked</strong> from being added to packets or cadet demands: {' '}
                <span className="font-semibold text-rose-950">
                  {expiredItems.map(i => `${i.item_name} (Expired: ${i.expiry_date})`).join(', ')}
                </span>.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-rose-700 bg-white/80 px-3 py-1.5 rounded-xl border border-rose-200 self-start sm:self-center">
            Click "Stock In" to Restock with Fresh Expiry Date
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {initialView === 'stock' ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                Stock & Inventory Management
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 font-bold">
                  Live Balances
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Track real-time item stock balances, daily refreshment consumption, batch expiry dates, and incoming restock shipments.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            

            <button
              onClick={() => setActiveTab('packet')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'packet'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Standard Refreshment Packet (₹75)
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-600/30 text-white">
                5% GST Included
              </span>
            </button>
          </div>
        )}

        {/* Top Action Button */}
        {(activeTab === 'stock' || initialView === 'stock') && (
          <button
            onClick={() => items.length > 0 && handleOpenStockIn(items[0])}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Restock / Stock In
          </button>
        )}
      </div>

      {/* VIEW 1: REFRESHMENT CATALOG ITEMS (SIDE-BY-SIDE: FORM ALWAYS VISIBLE ON LEFT, TABLE ON RIGHT) */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: ALWAYS VISIBLE +ADD / EDIT CATALOG ITEM FORM */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  {editingItem ? (
                    <>
                      <Edit2 className="w-5 h-5 text-amber-500" />
                      Edit Catalog Item
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-amber-500" />
                      Add Catalog Item
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingItem ? `Editing: ${editingItem.item_name}` : 'Upload photo, set approved rate & batch expiry'}
                </p>
              </div>

              {editingItem && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitItem} className="space-y-3.5 text-xs">
              {/* Item Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Glucose Biscuit Packet (100g)"
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Price & Unit of Measure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Approved Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Accounting Unit *</label>
                  <input
                    type="text"
                    required
                    value={unitOfMeasure}
                    onChange={e => setUnitOfMeasure(e.target.value)}
                    placeholder="e.g. PKT, NOS, BTL, BOX"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Opening Stock & Low Alert (for new items) */}
              {!editingItem && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Opening Stock (Units)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={initialStock}
                      onChange={e => setInitialStock(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Low Stock Alert Below</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={minThreshold}
                      onChange={e => setMinThreshold(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Expiry Date */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Batch Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={itemExpiryDate}
                  onChange={e => setItemExpiryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Active Toggle (for editing) */}
              {editingItem && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-800">
                    Active for Cadet Demand Placement
                  </label>
                </div>
              )}

              {/* UPLOAD ITEM PHOTO AT THE BOTTOM (NO PRESETS) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    Item Photo
                  </label>
                  {uploadingPhoto && (
                    <span className="text-[10px] text-blue-600 font-bold animate-pulse">
                      Uploading...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-300 shadow-2xs bg-white shrink-0 flex items-center justify-center">
                    <img
                      src={itemImageUrl || '/items/samosa.jpg'}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/items/samosa.jpg';
                      }}
                    />
                  </div>

                  {/* Upload From PC Button & URL Input */}
                  <div className="flex-1 space-y-1.5">
                    <label className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo From PC</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Or paste image URL..."
                      value={itemImageUrl}
                      onChange={e => setItemImageUrl(e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {uploadPhotoError && (
                  <p className="text-[11px] text-rose-600 font-bold">{uploadPhotoError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Catalog Item' : '+ Add Item to Catalog'}
                </button>
                {editingItem && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT SIDE: ALL ADDED CATALOG ITEMS IN TABLE */}
          <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-500" />
                  All Added Catalog Items ({items.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any item to reflect and edit its details in the left form
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {items.filter(i => i.is_active === 1 && !i.is_expired).length} Active
                </span>
                {expiredItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {expiredItems.length} Expired
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-14">Photo</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Accounting Unit</th>
                    <th className="p-3">Unit Rate</th>
                    <th className="p-3">Batch Expiry</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                        No catalog items added yet. Use the form on the left to add items.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const isExpired = item.is_expired;
                      const isEditingThis = editingItem && editingItem.id === item.id;
                      const photo = getItemPhoto(item.item_name, item.image_url);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenEdit(item)}
                          title={`Click to load ${item.item_name} into the form on left`}
                          className={`cursor-pointer transition-all duration-150 select-none ${
                            isEditingThis
                              ? 'bg-amber-100/90 border-l-4 border-amber-500 ring-1 ring-amber-400/50 shadow-xs'
                              : isExpired
                              ? 'bg-rose-50/40 hover:bg-rose-100/60'
                              : 'hover:bg-amber-50/70'
                          }`}
                        >
                          {/* Photo Thumbnail */}
                          <td className="p-3">
                            <img
                              src={photo}
                              alt={item.item_name}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/items/samosa.jpg';
                              }}
                            />
                          </td>

                          {/* Item Name */}
                          <td className="p-3">
                            <span className={`font-bold text-xs ${isExpired ? 'text-rose-950 line-through' : 'text-slate-900'}`}>
                              {item.item_name}
                            </span>
                            {isExpired && (
                              <span className="block text-[9px] font-black text-rose-600 uppercase tracking-tight">
                                ⛔ Expired ({item.expiry_date})
                              </span>
                            )}
                          </td>

                          {/* A/U (Account Unit) */}
                          <td className="p-3">
                            <span className="font-extrabold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                              {item.unit_of_measure || 'PKT'}
                            </span>
                          </td>

                          {/* Approved Price */}
                          <td className="p-3 font-extrabold text-xs text-slate-900">
                            ₹{item.unit_price?.toFixed(2)}
                          </td>

                          {/* Expiry Date */}
                          <td className="p-3">
                            {item.expiry_date ? (
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{formatExpiryDate(item.expiry_date)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Not set</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                                Expired
                              </span>
                            ) : item.is_active === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions: Delete */}
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item);
                              }}
                              title="Delete item from catalog"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

        </div>
      )}

      {/* VIEW 2: DEDICATED STOCK & INVENTORY MANAGEMENT LEDGER */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Stock KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{items.length}</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">In Stock</span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                {items.filter(i => i.is_active === 1 && !i.is_expired && !i.is_out_of_stock && !i.is_low_stock).length}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Consumed Today</span>
              <div className="text-xl font-black text-blue-700 mt-0.5">
                {items.reduce((acc, i) => acc + (i.consumed_today || 0), 0)}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Low Stock</span>
              <div className="text-xl font-black text-amber-700 mt-0.5">
                {items.filter(i => i.is_low_stock).length}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Out of Stock</span>
              <div className="text-xl font-black text-red-700 mt-0.5">
                {items.filter(i => i.is_out_of_stock).length}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Expired Batches</span>
              <div className="text-xl font-black text-rose-700 mt-0.5">
                {expiredItems.length}
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">Refreshment Item</th>
                    <th className="p-4">Unit of Measure</th>
                    <th className="p-4">Stock Balance</th>
                    <th className="p-4">Consumed Today</th>
                    <th className="p-4">Batch Expiry Date</th>
                    <th className="p-4">Inventory Health</th>
                    <th className="p-4 text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                        No items found in inventory.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const isExpired = item.is_expired;
                      const isOutOfStock = item.is_out_of_stock;
                      const isLowStock = item.is_low_stock;
                      const photo = getItemPhoto(item.item_name, item.image_url);

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isExpired
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Item with Photo */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={photo}
                                alt={item.item_name}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/items/samosa.jpg';
                                }}
                              />
                              <div>
                                <span className={`font-bold text-sm ${isExpired ? 'text-rose-950 line-through' : 'text-slate-900'}`}>
                                  {item.item_name}
                                </span>
                                {isExpired && (
                                  <span className="block text-[10px] font-black text-rose-600 uppercase tracking-tight">
                                    ⛔ EXPIRED ({item.expiry_date}) - Restock to enable
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Unit of Measure */}
                          <td className="p-4 text-slate-600 font-medium text-xs">
                            {item.unit_of_measure}
                          </td>

                          {/* Stock Balance */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-black text-sm px-3 py-1 rounded-xl border ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {item.current_stock || 0}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.unit_of_measure}s
                              </span>
                            </div>
                          </td>

                          {/* Consumed Today */}
                          <td className="p-4">
                            <span className="font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {item.consumed_today || 0} units
                            </span>
                          </td>

                          {/* Expiry Date */}
                          <td className="p-4">
                            {item.expiry_date ? (
                              <button
                                type="button"
                                onClick={() => handleOpenStockIn(item)}
                                title="Click to restock or update batch expiry date"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02] shadow-2xs cursor-pointer ${
                                  isExpired
                                    ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                    : 'bg-slate-100/90 text-slate-800 border-slate-200 hover:bg-slate-200/80'
                                }`}
                              >
                                <Calendar className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-600' : 'text-slate-500'}`} />
                                <span className="font-semibold tracking-tight">{formatExpiryDate(item.expiry_date)}</span>
                                {(() => {
                                  const st = getExpiryStatus(item.expiry_date);
                                  if (!st) return null;
                                  return (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                        isExpired
                                          ? 'bg-rose-600 text-white'
                                          : st.expiringSoon
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {st.label}
                                    </span>
                                  );
                                })()}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenStockIn(item)}
                                className="text-amber-600 font-bold text-xs hover:underline cursor-pointer"
                              >
                                + Set Expiry Date
                              </button>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5" /> Expired
                              </span>
                            ) : isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-600" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> In Stock
                              </span>
                            )}
                          </td>

                          {/* Stock Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Stock In Button */}
                              <button
                                onClick={() => handleOpenStockIn(item)}
                                title="Add incoming stock shipment & update expiry date"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Stock In
                              </button>

                              {/* History / Logs */}
                              <button
                                onClick={() => handleOpenLogs(item)}
                                title="View stock ledger and history logs"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                              >
                                <History className="w-4 h-4" />
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
        </div>
      )}

      {/* TAB 2: REFRESHMENT PACKET BUILDER (₹75 Allowance Assistant with 5% GST) */}
      {activeTab === 'packet' && (
        <div className="space-y-3">
          {/* COMPACT SINGLE-ROW PACKET BUDGET STATUS BAR (LOW VERTICAL PROFILE) */}
          <div
            className={`px-4 py-2.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
              packetSummary.diff === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : packetSummary.diff < 0
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs ${
                  packetSummary.diff === 0
                    ? 'bg-emerald-600'
                    : packetSummary.diff < 0
                    ? 'bg-amber-500'
                    : 'bg-rose-600'
                }`}
              >
                {packetSummary.diff === 0 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="font-black text-slate-900 uppercase tracking-tight">
                  Standard Target: ₹75.00
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-white/90 border border-slate-200 text-slate-700">
                  5% GST Included
                </span>
                <span className="text-slate-400 font-bold hidden sm:inline">•</span>
                <span className="font-bold">
                  {packetSummary.diff === 0
                    ? '✅ Perfect Match (₹75.00 Cap Met)'
                    : packetSummary.diff < 0
                    ? `⚠️ Under Budget: ₹${packetSummary.grandTotal.toFixed(2)} (₹${Math.abs(packetSummary.diff).toFixed(2)} remaining)`
                    : `⚠️ Excess Amount: ₹${packetSummary.grandTotal.toFixed(2)} (₹${packetSummary.diff.toFixed(2)} Exceeds ₹75.00 Limit!)`}
                </span>
              </div>
            </div>

            {/* Compact Breakdown metrics */}
            <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1 rounded-xl border border-slate-200 self-start sm:self-center shrink-0 text-xs">
              <span className="text-[11px] text-slate-500">
                Base: <strong className="text-slate-800">₹{packetSummary.subtotal.toFixed(2)}</strong>
              </span>
              <span className="text-slate-300 font-bold">+</span>
              <span className="text-[11px] text-slate-500">
                GST: <strong className="text-slate-800">₹{packetSummary.gstAmount.toFixed(2)}</strong>
              </span>
              <span className="text-slate-300 font-bold">=</span>
              <span
                className={`font-black text-xs px-2 py-0.5 rounded-md ${
                  packetSummary.diff === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : packetSummary.diff < 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                ₹{packetSummary.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 2-COLUMN SPLIT POS/BUILDER WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDE (7 Cols on LG): AVAILABLE ITEMS SHELF (Small Summary Cards with Photos & Rates) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-500" />
                    Available Refreshment Items ({items.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1-Click to add item to packet. Click again to remove from packet.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  1-Click Toggle
                </span>
              </div>

              {/* Grid of Small Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {items.map((item) => {
                  const isExp = item.is_expired;
                  const inPacket = packetItems.find(p => p.item_id.toString() === item.id.toString());
                  const inPacketQty = inPacket ? inPacket.quantity : 0;
                  const photo = getItemPhoto(item.item_name, item.image_url);

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isExp && handleCardClick(item)}
                      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between select-none ${
                        isExp
                          ? 'bg-rose-50/50 border-rose-200 opacity-75 cursor-not-allowed'
                          : inPacketQty > 0
                          ? 'bg-amber-50/70 border-amber-500 shadow-md ring-2 ring-amber-400/60 hover:shadow-lg cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      {/* Photo Header */}
                      <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={photo}
                          alt={item.item_name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/items/samosa.jpg';
                          }}
                        />
                        
                        {/* Price Badge Over Image */}
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-slate-900/85 backdrop-blur-md text-white font-black text-xs shadow-md border border-white/20">
                          ₹{item.unit_price?.toFixed(2)}
                        </div>

                        {/* Selected in packet counter badge */}
                        {inPacketQty > 0 && (
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] shadow-md flex items-center gap-1 animate-in zoom-in-50">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Added to Packet</span>
                          </div>
                        )}

                        {/* Expired Overlay */}
                        {isExp && (
                          <div className="absolute inset-0 bg-rose-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase shadow-md flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Expired - Blocked
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className={`font-black text-xs leading-snug tracking-tight ${isExp ? 'text-rose-900' : 'text-slate-900'}`}>
                            {item.item_name}
                          </h4>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Unit: <span className="text-slate-700 font-bold">{item.unit_of_measure}</span>
                          </div>
                        </div>

                        {/* Stock & Expiry mini pill */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className={item.current_stock <= 0 ? 'text-rose-600 font-black' : 'text-slate-500'}>
                            Stock: <strong className="text-slate-800">{item.current_stock || 0}</strong>
                          </span>
                          {item.expiry_date && (
                            <span className={`font-mono font-bold ${isExp ? 'text-rose-600' : 'text-slate-500'}`}>
                              Exp: {formatExpiryDate(item.expiry_date)}
                            </span>
                          )}
                        </div>

                        {/* 1-Click Toggle Action Button */}
                        <button
                          type="button"
                          disabled={isExp}
                          className={`w-full py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                            isExp
                              ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                              : inPacketQty > 0
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-orange-500/20'
                          }`}
                        >
                          {inPacketQty > 0 ? (
                            <>
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Click to Remove</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>1-Click Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE (5 Cols on LG): CONFIGURED PACKET & REAL-TIME AMOUNT */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Selected Packet Items ({packetItems.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Items assembled in each cadet refreshment packet
                  </p>
                </div>

                {packetItems.length > 0 && (
                  <button
                    onClick={() => setPacketItems([])}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Items in Packet List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                {packetSummary.resolvedItems.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-600">No Items In Packet Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Click any refreshment card on the left to add items into the packet.
                    </p>
                  </div>
                ) : (
                  packetSummary.resolvedItems.map((row, idx) => {
                    const photo = getItemPhoto(row.item?.item_name, row.item?.image_url);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-2xs ${
                          row.is_expired
                            ? 'bg-rose-50 border-rose-300'
                            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Thumbnail & Name */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={photo}
                            alt={row.item?.item_name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/items/samosa.jpg';
                            }}
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate">
                              {row.item?.item_name || 'Refreshment Item'}
                            </h5>
                            <div className="text-[10px] text-slate-500 font-medium">
                              ₹{row.price} × {row.quantity} = <strong className="text-slate-900">₹{row.lineTotal.toFixed(2)}</strong>
                            </div>
                            {row.resolvedExpiry && (
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Exp: {formatExpiryDate(row.resolvedExpiry)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity Increment/Decrement Controls */}
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = (parseInt(row.quantity, 10) || 1) - 1;
                              if (newQty <= 0) {
                                handleRemovePacketItem(idx);
                              } else {
                                handlePacketItemChange(idx, 'quantity', newQty);
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors"
                          >
                            -
                          </button>

                          <span className="w-6 text-center font-black text-xs text-slate-800">
                            {row.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const newQty = (parseInt(row.quantity, 10) || 1) + 1;
                              handlePacketItemChange(idx, 'quantity', newQty);
                            }}
                            className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-black text-xs flex items-center justify-center transition-colors shadow-2xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePacketItem(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          title="Remove from packet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Price Calculation Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Base Items Total</span>
                  <span className="font-bold text-slate-800">₹{packetSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>GST Rate (5%)</span>
                  <span className="font-bold text-slate-800">+ ₹{packetSummary.gstAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-700">Packet Total Amount</span>
                    <div className="text-[10px] text-slate-400 font-medium">Standard Target: ₹75.00</div>
                  </div>
                  <span
                    className={`text-xl font-black ${
                      packetSummary.diff === 0
                        ? 'text-emerald-600'
                        : packetSummary.diff < 0
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    ₹{packetSummary.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Save Packet Button */}
              <button
                type="button"
                onClick={handleSavePacket}
                disabled={savingPacket || packetItems.length === 0 || packetSummary.resolvedItems.some(i => i.is_expired)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
              >
                {savingPacket ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Configuration...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Save Standard Refreshment Packet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 2: STOCK IN / INCOMING SHIPMENT WITH NEW EXPIRY DATE */}
      {showStockModal && selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                  Stock In / Add Stock
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Item: <strong className="text-slate-800">{selectedStockItem.item_name}</strong>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Current Balance card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400">Current Balance</span>
                <div className="text-base font-black text-slate-800">
                  {selectedStockItem.current_stock || 0} {selectedStockItem.unit_of_measure}s
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400">Current Expiry</span>
                <div
                  className={`text-xs font-bold mt-1 ${
                    selectedStockItem.is_expired ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {selectedStockItem.expiry_date || 'None'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitStockIn} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantity to Add *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Date & Time of Entry
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={stockDateTime}
                    onChange={e => setStockDateTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Mandatory New Expiry Date */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <label className="block text-emerald-950 font-black mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  New Expiry Date (Renew Batch) *
                </label>
                <input
                  type="date"
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  required
                  value={stockExpiryDate}
                  onChange={e => setStockExpiryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-950 font-bold focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-emerald-700 mt-1 block">
                  Adding stock updates the item's active expiry date and restores it to active if expired.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Batch No. / Supplier Notes
                </label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={e => setStockNotes(e.target.value)}
                  placeholder="e.g. Batch #NCC-2026-SEP, Fresh dairy supply"
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Projected Balance preview */}
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-between">
                <span>New Stock Balance:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {(selectedStockItem.current_stock || 0) + (parseInt(stockQty, 10) || 0)}{' '}
                  {selectedStockItem.unit_of_measure}s
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? 'Recording Stock...' : 'Confirm Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STOCK LOGS & AUDIT TRAIL */}
      {showLogsModal && selectedLogsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Stock Movement Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Item: <strong className="text-slate-800">{selectedLogsItem.item_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading stock history...</div>
              ) : stockLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No stock movements recorded yet for this item.
                </div>
              ) : (
                stockLogs.map(log => (
                  <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.log_type === 'STOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.log_type}
                        </span>
                        <span className="font-bold text-slate-800">
                          {log.log_type === 'STOCK_IN' ? `+${log.quantity}` : `-${log.quantity}`} units
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{log.notes || 'No notes'}</p>
                      {log.expiry_date && (
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Batch Expiry: {log.expiry_date}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-800">
                        Bal: {log.balance_after}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
