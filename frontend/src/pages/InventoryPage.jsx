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
  Image as ImageIcon,
  ClipboardList,
  Printer,
  RotateCcw,
  X,
  FileText,
  Truck,
  PackageCheck,
  Zap,
  ArrowRight,
  Search
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

export const calculateExpiryDateBalance = (dateStr) => {
  if (!dateStr) {
    return {
      status: 'not_set',
      days: null,
      balanceText: 'No Expiry Set',
      detailText: 'Date not configured',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      pillClass: 'bg-slate-100 text-slate-600',
      pctRemaining: 100,
      isExpired: false,
      isExpiringSoon: false
    };
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return {
      status: 'invalid',
      days: null,
      balanceText: 'Invalid Date',
      detailText: 'Format error',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      pillClass: 'bg-slate-100 text-slate-600',
      pctRemaining: 100,
      isExpired: false,
      isExpiringSoon: false
    };
  }
  const exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = exp - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return {
      status: 'expired',
      days: diffDays,
      balanceText: `-${overdue} ${overdue === 1 ? 'Day' : 'Days'} Balance (Expired)`,
      detailText: `Expired ${overdue} ${overdue === 1 ? 'day' : 'days'} ago`,
      badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-xs',
      pillClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      pctRemaining: 0,
      isExpired: true,
      isExpiringSoon: false
    };
  }
  if (diffDays === 0) {
    return {
      status: 'critical',
      days: 0,
      balanceText: '0 Days Balance (Expires Today)',
      detailText: 'Expires Today!',
      badgeClass: 'bg-red-500 text-white font-black animate-pulse shadow-xs',
      pillClass: 'bg-red-50 text-red-700 border border-red-200',
      pctRemaining: 5,
      isExpired: true,
      isExpiringSoon: true
    };
  }
  if (diffDays <= 7) {
    return {
      status: 'critical_soon',
      days: diffDays,
      balanceText: `+${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} Balance`,
      detailText: `Expiring this week (${diffDays}d left)`,
      badgeClass: 'bg-amber-600 text-white font-black shadow-xs',
      pillClass: 'bg-amber-50 text-amber-900 border border-amber-300',
      pctRemaining: Math.max(10, Math.min(100, Math.round((diffDays / 90) * 100))),
      isExpired: false,
      isExpiringSoon: true
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'warning',
      days: diffDays,
      balanceText: `+${diffDays} Days Balance`,
      detailText: `Expiring soon (${diffDays}d left)`,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      pillClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      pctRemaining: Math.max(20, Math.min(100, Math.round((diffDays / 90) * 100))),
      isExpired: false,
      isExpiringSoon: true
    };
  }
  return {
    status: 'healthy',
    days: diffDays,
    balanceText: `+${diffDays} Days Balance`,
    detailText: `Fresh (${diffDays}d shelf life)`,
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
    pillClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    pctRemaining: Math.max(30, Math.min(100, Math.round((diffDays / 90) * 100))),
    isExpired: false,
    isExpiringSoon: false
  };
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

export default function InventoryPage({ embedded = false, initialView = 'stock' }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'catalog' | 'packet'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialView) {
      setActiveTab(initialView);
    }
  }, [initialView]);

  // Sub-button state: 'ledger' (Live Balances) | 'demand' (Demand Requisition Sheet)
  const [stockSubTab, setStockSubTab] = useState('ledger');

  // Demand Sheet State (Quantities, Rates, GST%, and Batch Expiry Date - starts blank by default)
  const [demandQuantities, setDemandQuantities] = useState({});
  const [demandRates, setDemandRates] = useState({});
  const [demandGsts, setDemandGsts] = useState({});
  const [demandExpiries, setDemandExpiries] = useState({});

  const handleDemandChange = (itemId, val) => {
    setDemandQuantities(prev => ({
      ...prev,
      [itemId]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
    }));
  };

  const handleDemandRateChange = (itemId, val) => {
    setDemandRates(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleDemandGstChange = (itemId, val) => {
    setDemandGsts(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleDemandExpiryChange = (itemId, val) => {
    setDemandExpiries(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleClearDemands = () => {
    setDemandQuantities({});
    setDemandRates({});
    setDemandGsts({});
    setDemandExpiries({});
  };

  const handleFillCatalogRatesForDemand = () => {
    const newRates = {};
    const newGsts = {};
    const newExpiries = {};
    const defaultFutureExp = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    items.forEach(i => {
      newRates[i.id] = String(i.unit_price || 0);
      newGsts[i.id] = String(i.default_gst_rate !== undefined ? i.default_gst_rate : 5.0);
      newExpiries[i.id] = i.expiry_date || defaultFutureExp;
    });
    setDemandRates(newRates);
    setDemandGsts(newGsts);
    setDemandExpiries(newExpiries);
  };

  const handlePrintDemandSheet = () => {
    window.print();
  };

  const demandedItemsCount = Object.values(demandQuantities).filter(q => q !== '' && parseInt(q, 10) > 0).length;
  const totalDemandedUnits = items.reduce((sum, item) => sum + (parseInt(demandQuantities[item.id], 10) || 0), 0);

  // Total basic cost based on user-entered demandRates (or 0 if blank)
  const totalEstimatedDemandCost = items.reduce((sum, item) => {
    const qty = parseInt(demandQuantities[item.id], 10) || 0;
    const rate = demandRates[item.id] !== undefined && demandRates[item.id] !== '' ? parseFloat(demandRates[item.id]) : 0;
    return sum + (qty * rate);
  }, 0);

  // Total GST based on user-entered demandGsts
  const totalEstimatedDemandGst = items.reduce((sum, item) => {
    const qty = parseInt(demandQuantities[item.id], 10) || 0;
    const rate = demandRates[item.id] !== undefined && demandRates[item.id] !== '' ? parseFloat(demandRates[item.id]) : 0;
    const gst = demandGsts[item.id] !== undefined && demandGsts[item.id] !== '' ? parseFloat(demandGsts[item.id]) : 0;
    return sum + (qty * rate * (gst / 100));
  }, 0);

  const totalEstimatedDemandGrand = totalEstimatedDemandCost + totalEstimatedDemandGst;

  // Demand Indent & Restock Workflow state
  const [stockDemands, setStockDemands] = useState([]);
  const [activeDemandIndent, setActiveDemandIndent] = useState(null);
  const [demandActionLoading, setDemandActionLoading] = useState(false);
  const [demandMessage, setDemandMessage] = useState(null);

  const fetchStockDemands = async () => {
    try {
      const res = await fetch('/api/catalog/stock-demands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStockDemands(data);
          const active = data.find(d => d.status === 'DEMAND_GENERATED' || d.status === 'DEMAND_FULFILLED') || data[0] || null;
          setActiveDemandIndent(active);
        }
      }
    } catch (err) {
      console.error('Error fetching stock demands:', err);
    }
  };

  const handleGenerateDemandIndent = async () => {
    const demandItems = Object.entries(demandQuantities)
      .filter(([id, qty]) => qty !== '' && parseInt(qty, 10) > 0)
      .map(([id, qty]) => {
        const itemId = parseInt(id, 10);
        const rVal = demandRates[itemId];
        const gVal = demandGsts[itemId];
        const expVal = demandExpiries[itemId];
        return {
          item_id: itemId,
          demand_quantity: parseInt(qty, 10),
          rate: rVal !== undefined && rVal !== '' ? parseFloat(rVal) : '',
          gst_rate: gVal !== undefined && gVal !== '' ? parseFloat(gVal) : '',
          batch_expiry_date: expVal || ''
        };
      });

    if (demandItems.length === 0) {
      alert('Please enter demand quantity for at least one item.');
      return;
    }

    setDemandActionLoading(true);
    setDemandMessage(null);
    try {
      const res = await fetch('/api/catalog/stock-demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: demandItems,
          notes: 'Standard Stock Replenishment Demand'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate demand indent');

      setDemandMessage({
        type: 'success',
        text: `DEMAND GENERATED! Indent #${data.indent?.indent_number} created with ${data.indent?.total_items} items (${data.indent?.total_units} units).`
      });
      await fetchStockDemands();
    } catch (err) {
      setDemandMessage({ type: 'error', text: err.message });
    } finally {
      setDemandActionLoading(false);
    }
  };

  const handleFulfillDemand = async (indentId) => {
    if (!indentId) return;
    setDemandActionLoading(true);
    setDemandMessage(null);
    try {
      const res = await fetch(`/api/catalog/stock-demands/${indentId}/fulfill`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fulfill demand');

      setDemandMessage({
        type: 'success',
        text: 'DEMAND FULFILLED! Supplies received at refreshment store. Ready to take on charge as stock in.'
      });
      await fetchStockDemands();
    } catch (err) {
      setDemandMessage({ type: 'error', text: err.message });
    } finally {
      setDemandActionLoading(false);
    }
  };

  const handleTakeOnCharge = async (indentId) => {
    if (!indentId) return;
    setDemandActionLoading(true);
    setDemandMessage(null);
    try {
      const res = await fetch(`/api/catalog/stock-demands/${indentId}/take-on-charge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to take demand on charge');

      setDemandMessage({
        type: 'success',
        text: 'DEMAND TAKEN ON CHARGE AS STOCK IN! All demanded items have been added to inventory balances.'
      });
      setDemandQuantities({});
      setDemandRates({});
      setDemandGsts({});
      setDemandExpiries({});
      await fetchCatalog();
      await fetchStockDemands();
    } catch (err) {
      setDemandMessage({ type: 'error', text: err.message });
    } finally {
      setDemandActionLoading(false);
    }
  };

  const handleDirectStockInAllDemanded = async () => {
    const demandItems = Object.entries(demandQuantities)
      .filter(([id, qty]) => qty !== '' && parseInt(qty, 10) > 0)
      .map(([id, qty]) => {
        const itemId = parseInt(id, 10);
        const rVal = demandRates[itemId];
        const gVal = demandGsts[itemId];
        const expVal = demandExpiries[itemId];
        return {
          item_id: itemId,
          demand_quantity: parseInt(qty, 10),
          rate: rVal !== undefined && rVal !== '' ? parseFloat(rVal) : '',
          gst_rate: gVal !== undefined && gVal !== '' ? parseFloat(gVal) : '',
          batch_expiry_date: expVal || ''
        };
      });

    if (demandItems.length === 0) {
      alert('Please enter a demand quantity for at least one item to stock in.');
      return;
    }

    setDemandActionLoading(true);
    setDemandMessage(null);
    try {
      const genRes = await fetch('/api/catalog/stock-demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: demandItems,
          notes: 'Direct Stock-In Requisition'
        })
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Failed to generate demand indent');
      const indentId = genData.indent?.id;

      await fetch(`/api/catalog/stock-demands/${indentId}/fulfill`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      const chargeRes = await fetch(`/api/catalog/stock-demands/${indentId}/take-on-charge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.error || 'Failed to take demand on charge');

      setDemandMessage({
        type: 'success',
        text: `DEMAND TAKEN ON CHARGE AS STOCK IN! ${demandItems.length} items (${genData.indent.total_units} units) restocked to live balance.`
      });
      setDemandQuantities({});
      setDemandRates({});
      setDemandGsts({});
      await fetchCatalog();
      await fetchStockDemands();
    } catch (err) {
      setDemandMessage({ type: 'error', text: err.message });
    } finally {
      setDemandActionLoading(false);
    }
  };

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
  const [stockRate, setStockRate] = useState('');
  const [stockGst, setStockGst] = useState('5.0');
  const [stockDateTime, setStockDateTime] = useState('');
  const [stockExpiryDate, setStockExpiryDate] = useState('');
  const [stockNotes, setStockNotes] = useState('');

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogsItem, setSelectedLogsItem] = useState(null);
  const [stockLogs, setStockLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFlowMetrics, setLogsFlowMetrics] = useState({
    total_flow_in: 0,
    total_flow_out: 0,
    total_wastage: 0,
    current_stock: 0
  });

  // Proper Channel Stock Out / Disposal Modal State
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [selectedStockOutItem, setSelectedStockOutItem] = useState(null);
  const [stockOutQty, setStockOutQty] = useState('1');
  const [stockOutReason, setStockOutReason] = useState('EXPIRED');
  const [stockOutRefNo, setStockOutRefNo] = useState('');
  const [stockOutDate, setStockOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockOutOfficer, setStockOutOfficer] = useState('');
  const [stockOutNotes, setStockOutNotes] = useState('');
  const [submittingStockOut, setSubmittingStockOut] = useState(false);
  const [stockOutError, setStockOutError] = useState('');

  // Global All Stock Logs & Flow Metrics (for History, Wastage, and Expired Sub-Menus)
  const [allStockData, setAllStockData] = useState({
    global_flow_in: 0,
    global_flow_out: 0,
    global_wastage_units: 0,
    global_wastage_amount: 0,
    logs: [],
    itemSummaries: []
  });
  const [loadingAllLogs, setLoadingAllLogs] = useState(false);
  const [historyItemFilter, setHistoryItemFilter] = useState('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySidebarSearch, setHistorySidebarSearch] = useState('');
  const [expiredSubFilter, setExpiredSubFilter] = useState('ALL'); // 'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID'

  const fetchAllStockLogs = async () => {
    setLoadingAllLogs(true);
    try {
      const res = await fetch('/api/catalog/all-stock-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllStockData(data);
      }
    } catch (err) {
      console.error('Error fetching all stock logs:', err);
    } finally {
      setLoadingAllLogs(false);
    }
  };

  // Wastage Requisition / Condemnation Sheet State (Matching Demand Requisition for Stock Out)
  const [wastageQuantities, setWastageQuantities] = useState({});
  const [wastageReasons, setWastageReasons] = useState({});
  const [wastageRefNo, setWastageRefNo] = useState('');
  const [wastageOfficer, setWastageOfficer] = useState('');
  const [wastageNotes, setWastageNotes] = useState('');
  const [wastageActionLoading, setWastageActionLoading] = useState(false);
  const [wastageMessage, setWastageMessage] = useState(null);

  const handleWastageChange = (itemId, val) => {
    setWastageQuantities(prev => ({
      ...prev,
      [itemId]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
    }));
  };

  const handleWastageReasonChange = (itemId, val) => {
    setWastageReasons(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleClearWastage = () => {
    setWastageQuantities({});
    setWastageReasons({});
  };

  const handleBatchStockOutWastage = async () => {
    const validItems = Object.entries(wastageQuantities)
      .filter(([id, q]) => q !== '' && parseInt(q, 10) > 0)
      .map(([id, q]) => ({
        item_id: parseInt(id, 10),
        quantity: parseInt(q, 10),
        reason: wastageReasons[id] || 'WASTAGE',
        notes: wastageNotes || 'Vendor store wastage write-off'
      }));

    if (validItems.length === 0) {
      alert('Please enter at least one item quantity to write off.');
      return;
    }

    setWastageActionLoading(true);
    setWastageMessage(null);
    try {
      const res = await fetch('/api/catalog/stock-out-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: validItems,
          reason: 'WASTAGE',
          reference_no: wastageRefNo || `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          disposal_date: new Date().toISOString().split('T')[0],
          authorized_by: wastageOfficer || 'Warehouse Manager / Store Incharge',
          notes: wastageNotes || 'Vendor Store Stock-Out Requisition Sheet'
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Server error occurred during stock-out processing.');
      }
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to process wastage stock-out.');
      setWastageMessage({ type: 'success', text: data.message });
      setWastageQuantities({});
      fetchCatalog();
      fetchAllStockLogs();
    } catch (err) {
      setWastageMessage({ type: 'error', text: err.message });
    } finally {
      setWastageActionLoading(false);
    }
  };

  // Expired Requisition Sheet State (Matching Demand Requisition for Stock Out)
  const [expiredQuantities, setExpiredQuantities] = useState({});
  const [expiredRefNo, setExpiredRefNo] = useState('');
  const [expiredOfficer, setExpiredOfficer] = useState('');
  const [expiredNotes, setExpiredNotes] = useState('');
  const [expiredActionLoading, setExpiredActionLoading] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState(null);

  const handleExpiredChange = (itemId, val) => {
    setExpiredQuantities(prev => ({
      ...prev,
      [itemId]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
    }));
  };

  const handleAutoFillAllExpired = () => {
    const newExps = {};
    items.forEach(i => {
      if (i.is_expired && (i.current_stock || 0) > 0) {
        newExps[i.id] = String(i.current_stock);
      }
    });
    setExpiredQuantities(newExps);
  };

  const handleClearExpired = () => {
    setExpiredQuantities({});
  };

  const handleBatchStockOutExpired = async () => {
    const validItems = Object.entries(expiredQuantities)
      .filter(([id, q]) => q !== '' && parseInt(q, 10) > 0)
      .map(([id, q]) => ({
        item_id: parseInt(id, 10),
        quantity: parseInt(q, 10),
        reason: 'EXPIRED',
        notes: expiredNotes || 'Expired past shelf-life'
      }));

    if (validItems.length === 0) {
      alert('Please enter at least one expired item quantity to write off.');
      return;
    }

    setExpiredActionLoading(true);
    setExpiredMessage(null);
    try {
      const res = await fetch('/api/catalog/stock-out-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: validItems,
          reason: 'EXPIRED',
          reference_no: expiredRefNo || `EXP-WO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          disposal_date: new Date().toISOString().split('T')[0],
          authorized_by: expiredOfficer || 'Warehouse Manager / Store Incharge',
          notes: expiredNotes || 'Expired inventory written off through vendor console'
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Server error occurred during expired stock-out processing.');
      }
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to process expired stock-out.');
      setExpiredMessage({ type: 'success', text: data.message });
      setExpiredQuantities({});
      fetchCatalog();
      fetchAllStockLogs();
    } catch (err) {
      setExpiredMessage({ type: 'error', text: err.message });
    } finally {
      setExpiredActionLoading(false);
    }
  };

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
    fetchStockDemands();
    fetchAllStockLogs();
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

  // Open Raise Stock Demand Modal
  const handleOpenStockIn = (item) => {
    setSelectedStockItem(item);
    const existingDemand = demandQuantities[item.id];
    setStockQty(existingDemand ? String(existingDemand) : '50');
    setStockRate(demandRates[item.id] !== undefined ? String(demandRates[item.id]) : String(item.unit_price || '25.0'));
    setStockGst(demandGsts[item.id] !== undefined ? String(demandGsts[item.id]) : String(item.default_gst_rate !== undefined ? item.default_gst_rate : '5.0'));
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    setStockExpiryDate(demandExpiries[item.id] || item.expiry_date || future.toISOString().split('T')[0]);
    setStockNotes('Stock replenishment demand');
    setShowStockModal(true);
    setError('');
  };

  // Submit Stock Demand -> Reflects into Demand Console for official indent & stock-in lifecycle
  const handleSubmitStockIn = (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(stockQty, 10);
    if (!qty || qty <= 0) {
      setError('Please enter a valid demand quantity greater than 0.');
      return;
    }

    // Reflect added data as demand in Demand Console
    setDemandQuantities(prev => ({
      ...prev,
      [selectedStockItem.id]: String(qty)
    }));

    if (stockRate !== '') {
      setDemandRates(prev => ({
        ...prev,
        [selectedStockItem.id]: stockRate
      }));
    }

    if (stockGst !== '') {
      setDemandGsts(prev => ({
        ...prev,
        [selectedStockItem.id]: stockGst
      }));
    }

    if (stockExpiryDate) {
      setDemandExpiries(prev => ({
        ...prev,
        [selectedStockItem.id]: stockExpiryDate
      }));
    }

    setShowStockModal(false);

    // Switch view to Demand Console so user sees the reflected demand immediately
    setStockSubTab('demand');
    setDemandMessage({
      type: 'success',
      text: `Demand for ${qty} units of '${selectedStockItem.item_name}' placed! Reflected in Demand Requisition Sheet.`
    });
  };

  // View Stock History Logs with Flow In / Flow Out Metrics
  const handleOpenLogs = async (item) => {
    setSelectedLogsItem(item);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/catalog/${item.id}/stock-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.logs) {
        setStockLogs(Array.isArray(data.logs) ? data.logs : []);
        setLogsFlowMetrics({
          total_flow_in: data.total_flow_in || 0,
          total_flow_out: data.total_flow_out || 0,
          total_wastage: data.total_wastage || 0,
          current_stock: data.current_stock !== undefined ? data.current_stock : (item.current_stock || 0)
        });
      } else if (Array.isArray(data)) {
        setStockLogs(data);
        const tIn = data.filter(l => l.change_type === 'STOCK_IN' || l.log_type === 'STOCK_IN').reduce((s, l) => s + (l.quantity || 0), 0);
        const tOut = data.filter(l => l.change_type === 'STOCK_OUT' || l.log_type !== 'STOCK_IN').reduce((s, l) => s + (l.quantity || 0), 0);
        setLogsFlowMetrics({
          total_flow_in: tIn,
          total_flow_out: tOut,
          total_wastage: item.total_wastage || 0,
          current_stock: item.current_stock || 0
        });
      }
    } catch (err) {
      console.error('Fetch stock logs error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open Stock Out / Disposal Modal (Proper Channel)
  const handleOpenStockOut = (item) => {
    setSelectedStockOutItem(item);
    setStockOutQty('1');
    setStockOutReason(item.is_expired ? 'EXPIRED' : 'WASTAGE');
    setStockOutRefNo(`DISP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    setStockOutDate(new Date().toISOString().split('T')[0]);
    setStockOutOfficer('Quartermaster / ANO');
    setStockOutNotes(item.is_expired ? `Disposal of expired stock past shelf-life (${item.expiry_date})` : 'Condemnation & write-off through proper channel');
    setStockOutError('');
    setShowStockOutModal(true);
  };

  // Submit Stock Out / Disposal Through Proper Channel
  const handleSubmitStockOut = async (e) => {
    e.preventDefault();
    if (!selectedStockOutItem) return;
    const qty = parseInt(stockOutQty, 10);
    if (!qty || qty <= 0) {
      setStockOutError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (qty > (selectedStockOutItem.current_stock || 0)) {
      setStockOutError(`Quantity cannot exceed current stock balance (${selectedStockOutItem.current_stock} ${selectedStockOutItem.unit_of_measure}s).`);
      return;
    }

    setSubmittingStockOut(true);
    setStockOutError('');
    try {
      const res = await fetch(`/api/catalog/${selectedStockOutItem.id}/stock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: qty,
          reason: stockOutReason,
          reference_no: stockOutRefNo,
          disposal_date: stockOutDate,
          authorized_by: stockOutOfficer,
          notes: stockOutNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process stock-out.');
      setShowStockOutModal(false);
      fetchCatalog();
    } catch (err) {
      setStockOutError(err.message);
    } finally {
      setSubmittingStockOut(false);
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

      {/* STOCK MANAGEMENT HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              Stock Management
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                stockSubTab === 'demand'
                  ? 'bg-amber-100 text-amber-900'
                  : stockSubTab === 'history'
                  ? 'bg-indigo-100 text-indigo-900'
                  : stockSubTab === 'wastage'
                  ? 'bg-rose-100 text-rose-900'
                  : stockSubTab === 'expired'
                  ? 'bg-red-100 text-red-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {stockSubTab === 'demand'
                  ? 'Demand Requisition'
                  : stockSubTab === 'history'
                  ? 'Item History & Flow'
                  : stockSubTab === 'wastage'
                  ? 'Wastage & Spoilage Write-Off'
                  : stockSubTab === 'expired'
                  ? 'Expired Batches Monitor'
                  : 'Bal Stock'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {stockSubTab === 'demand'
                ? 'All listed inventory items with demand requisition column. Enter item demand quantities, view old vs new rates, or print sheet.'
                : stockSubTab === 'history'
                ? 'Complete chronological stock audit trail: Total Flow In, Total Flow Out, and all store movements across items.'
                : stockSubTab === 'wastage'
                ? 'Vendor store records of stock written off due to spoilage, handling damage, or transit breakage.'
                : stockSubTab === 'expired'
                ? 'Real-time vendor inventory shelf-life monitor, critical expiry warnings, and stock-out write-offs.'
                : 'Track real-time item stock balances, daily refreshment consumption, batch expiry dates, and incoming restock shipments.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Sub Menu Button Group: 5 Dedicated Sub Menus */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs gap-1">
            {/* 1. Bal Stock */}
            <button
              type="button"
              onClick={() => setStockSubTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockSubTab === 'ledger'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-600" />
              Bal Stock
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {String(items.length).padStart(2, '0')}
              </span>
            </button>

            {/* 2. Demand */}
            <button
              type="button"
              onClick={() => setStockSubTab('demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockSubTab === 'demand'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Demand
              {demandedItemsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-800 font-black">
                  {demandedItemsCount}
                </span>
              )}
            </button>

            {/* 3. Item History */}
            <button
              type="button"
              onClick={() => {
                setStockSubTab('history');
                fetchAllStockLogs();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockSubTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Item History
            </button>

            {/* 4. Wastage */}
            <button
              type="button"
              onClick={() => {
                setStockSubTab('wastage');
                fetchAllStockLogs();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockSubTab === 'wastage'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wastage
              {(() => {
                const totalWastage = items.reduce((sum, i) => sum + (parseInt(i.total_wastage, 10) || 0), 0);
                if (totalWastage > 0) {
                  return (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-800 font-black">
                      {totalWastage}
                    </span>
                  );
                }
                return null;
              })()}
            </button>

            {/* 5. Expired */}
            <button
              type="button"
              onClick={() => setStockSubTab('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockSubTab === 'expired'
                  ? 'bg-red-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Expired
              {expiredItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-red-800 font-black">
                  {expiredItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Action Button: Raise Stock Demand (Directly renders to Demand Console for further demand) */}
          {stockSubTab === 'ledger' && (
            <button
              onClick={() => setStockSubTab('demand')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
              title="Open Demand Console to raise replenishment demand indents"
            >
              <ClipboardList className="w-4 h-4" />
              + Raise Stock Demand
            </button>
          )}

          {/* Action Buttons: Print & Clear (visible in demand view) */}
          {stockSubTab === 'demand' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintDemandSheet}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                title="Print Blank or Filled Demand Requisition Sheet"
              >
                <Printer className="w-4 h-4" />
                Print Demand Sheet
              </button>
              {Object.values(demandQuantities).some(q => q !== '') && (
                <button
                  type="button"
                  onClick={handleClearDemands}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  title="Clear all entered demands back to blank"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Action Button: Refresh Logs (visible in history view) */}
          {stockSubTab === 'history' && (
            <button
              type="button"
              onClick={fetchAllStockLogs}
              disabled={loadingAllLogs}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAllLogs ? 'animate-spin' : ''}`} />
              Refresh Flow Logs
            </button>
          )}

          {/* Action Button: Log Wastage / Write Off Stock (visible in wastage view) */}
          {stockSubTab === 'wastage' && (
            <button
              type="button"
              onClick={() => items.length > 0 && handleOpenStockOut(items[0])}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              + Record Wastage Stock-Out
            </button>
          )}

          {/* Action Button: Dispose Expired Stock (visible in expired view) */}
          {stockSubTab === 'expired' && (
            <button
              type="button"
              disabled={expiredItems.length === 0}
              onClick={() => expiredItems.length > 0 && handleOpenStockOut(expiredItems[0])}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-700/20 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Write Off Expired Stock
            </button>
          )}
        </div>
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

      {/* VIEW 2: DEDICATED STOCK MANAGEMENT LEDGER & DEMAND REQUISITION */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* SUB-VIEW 1: LIVE BALANCES LEDGER */}
          {stockSubTab === 'ledger' && (
            <div className="space-y-4">
              {/* Stock KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* 1. Total Items */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 shadow-2xs">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Total Items</span>
              <div className="text-xl font-black text-indigo-950 mt-0.5">
                {String(items.length).padStart(2, '0')}
              </div>
            </div>

            {/* 2. In Stock */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-2xs">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">In Stock</span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                {String(items.filter(i => i.is_active === 1 && !i.is_expired && !i.is_out_of_stock && !i.is_low_stock).length).padStart(2, '0')}
              </div>
            </div>

            {/* 3. TOTAL VALUE */}
            <div className="p-3 bg-white rounded-2xl border border-teal-300 border-t-4 border-t-teal-600 shadow-2xs">
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider flex items-center justify-between">
                <span>TOTAL VALUE</span>
                <span className="text-teal-600 font-bold text-xs">₹</span>
              </span>
              <div className="text-xl font-black text-teal-700 mt-0.5">
                ₹{items.reduce((sum, i) => {
                  const qty = Number(i.current_stock || 0);
                  const r = Number(i.unit_price || 0);
                  const g = i.default_gst_rate !== undefined && i.default_gst_rate !== null ? Number(i.default_gst_rate) : 5.0;
                  const sub = qty * r;
                  return sum + sub + (sub * (g / 100));
                }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* 4. Consumed Today */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-500 shadow-2xs">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Consumed Today</span>
              <div className="text-xl font-black text-blue-700 mt-0.5">
                {String(items.reduce((acc, i) => acc + (parseInt(i.consumed_today, 10) || 0), 0)).padStart(2, '0')}
              </div>
            </div>

            {/* 5. Low Stock */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 shadow-2xs">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Low Stock</span>
              <div className="text-xl font-black text-amber-700 mt-0.5">
                {String(items.filter(i => i.is_low_stock).length).padStart(2, '0')}
              </div>
            </div>

            {/* 6. Out of Stock */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-rose-500 shadow-2xs">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Out of Stock</span>
              <div className="text-xl font-black text-rose-700 mt-0.5">
                {String(items.filter(i => i.is_out_of_stock).length).padStart(2, '0')}
              </div>
            </div>

            {/* 7. Expired Batches */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-red-600 shadow-2xs">
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block">Expired Batches</span>
              <div className="text-xl font-black text-red-700 mt-0.5">
                {String(expiredItems.length).padStart(2, '0')}
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
                    <th className="p-4 text-right">Rate</th>
                    <th className="p-4 text-center">GST%</th>
                    <th className="p-4 text-right">Total Amount</th>
                    <th className="p-4">Consumed Today</th>
                    <th className="p-4">Stock Health</th>
                    <th className="p-4 text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400 text-xs">
                        No items found in stock ledger.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const isExpired = item.is_expired;
                      const isOutOfStock = item.is_out_of_stock;
                      const isLowStock = item.is_low_stock;
                      const photo = getItemPhoto(item.item_name, item.image_url);
                      const stockQty = Number(item.current_stock || 0);
                      const itemRate = Number(item.unit_price || 0);
                      const itemGst = item.default_gst_rate !== undefined && item.default_gst_rate !== null ? Number(item.default_gst_rate) : 5.0;
                      const itemSub = stockQty * itemRate;
                      const itemTotalAmount = itemSub + (itemSub * (itemGst / 100));

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
                                {stockQty}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.unit_of_measure}s
                              </span>
                            </div>
                          </td>

                          {/* Rate - Live Approved Catalog / Inward Rate */}
                          <td className="p-4 text-right">
                            <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              ₹{itemRate.toFixed(2)}
                            </span>
                          </td>

                          {/* GST% - Live Statutory Rate */}
                          <td className="p-4 text-center">
                            <span className="font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              {itemGst}%
                            </span>
                          </td>

                          {/* Total Amount - True Live Stock Valuation */}
                          <td className="p-4 text-right">
                            <span className="font-black text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                              ₹{itemTotalAmount.toFixed(2)}
                            </span>
                          </td>

                          {/* Consumed Today */}
                          <td className="p-4">
                            <span className="font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {item.consumed_today || 0} units
                            </span>
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
                              {/* Demand Restock Button */}
                              <button
                                onClick={() => handleOpenStockIn(item)}
                                title="Raise stock demand for this item"
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <ClipboardList className="w-3.5 h-3.5" /> Demand Restock
                              </button>

                              {/* History / Logs */}
                              <button
                                onClick={() => {
                                  setStockSubTab('history');
                                  setHistoryItemFilter(item.id.toString());
                                  fetchAllStockLogs();
                                }}
                                title="View item history logs"
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
                {items.length > 0 && (
                  <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan="2" className="p-4 uppercase tracking-wider text-slate-600 font-black">
                        Total Live Inventory Valuation:
                      </td>
                      <td className="p-4 font-black text-slate-900 text-sm">
                        {items.reduce((sum, i) => sum + (i.current_stock || 0), 0)} units
                      </td>
                      <td colSpan="2" className="p-4 text-right font-black text-slate-600 text-xs">
                        Total Stock Valuation (inc. GST):
                      </td>
                      <td className="p-4 text-right font-black text-sm text-emerald-800">
                        ₹{items.reduce((sum, i) => {
                          const qty = Number(i.current_stock || 0);
                          const r = Number(i.unit_price || 0);
                          const g = i.default_gst_rate !== undefined && i.default_gst_rate !== null ? Number(i.default_gst_rate) : 5.0;
                          const sub = qty * r;
                          return sum + sub + (sub * (g / 100));
                        }, 0).toFixed(2)}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

          {/* SUB-VIEW 2: DEMAND REQUISITION SHEET (ALL INVENTORY ITEMS LISTED WITH BLANK DEMAND COLUMN) */}
          {stockSubTab === 'demand' && (
            <div className="space-y-4">
              {/* Printable Official Header (Visible ONLY during print) */}
              <div className="hidden print:block p-6 text-slate-900 border-b-2 border-slate-900 mb-4">
                <div className="text-center">
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    NATIONAL CADET CORPS (NCC)
                  </h2>
                  <h3 className="text-sm font-bold text-slate-700 tracking-wide mt-0.5">
                    REFRESHMENT DEMAND & STORE REQUISITION INDENT
                  </h3>
                  <div className="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-300">
                    <span><strong>HQ / Supply Point:</strong> State Refreshment Hub</span>
                    <span><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Compact Demand KPI Metric Bar (Hidden during print) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 print:hidden">
                <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-slate-500 shadow-2xs flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Catalog Items</span>
                  <span className="text-base font-black text-slate-900">{String(items.length).padStart(2, '0')}</span>
                </div>

                <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 shadow-2xs flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">In Demand</span>
                  <span className="text-base font-black text-amber-800">{String(demandedItemsCount).padStart(2, '0')}</span>
                </div>

                <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-500 shadow-2xs flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Demand Units</span>
                  <span className="text-base font-black text-blue-800">{String(totalDemandedUnits).padStart(2, '0')}</span>
                </div>

                <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-2xs flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Estimated Total</span>
                  <span className="text-base font-black text-emerald-800">{totalEstimatedDemandGrand > 0 ? `₹${totalEstimatedDemandGrand.toFixed(2)}` : '—'}</span>
                </div>
              </div>

              {/* Compact 3-Step Requisition & Stock-In Lifecycle */}
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs space-y-2 print:hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Stock-In Lifecycle:
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      1. Demand Generated &rarr; 2. Demand Fulfilled &rarr; 3. Taken on Charge
                    </span>
                  </div>

                  {demandedItemsCount > 0 && (
                    <button
                      type="button"
                      disabled={demandActionLoading}
                      onClick={handleDirectStockInAllDemanded}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Directly stock in all entered demand items into live inventory in a single click"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      ⚡ Direct Stock In ({totalDemandedUnits} units)
                    </button>
                  )}
                </div>

                {/* 3 Compact Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* STEP 1: DEMAND GENERATED */}
                  <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                    activeDemandIndent?.status === 'DEMAND_GENERATED'
                      ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40'
                      : (activeDemandIndent?.status === 'DEMAND_FULFILLED' || activeDemandIndent?.status === 'TAKEN_ON_CHARGE')
                      ? 'bg-slate-50/80 border-emerald-200 text-slate-700'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                          (activeDemandIndent?.status === 'DEMAND_FULFILLED' || activeDemandIndent?.status === 'TAKEN_ON_CHARGE')
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}>
                          {(activeDemandIndent?.status === 'DEMAND_FULFILLED' || activeDemandIndent?.status === 'TAKEN_ON_CHARGE') ? '✓' : '1'}
                        </span>
                        1. Demand Generated
                      </span>
                      {activeDemandIndent?.status === 'DEMAND_GENERATED' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">Active</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={demandActionLoading || demandedItemsCount === 0}
                      onClick={handleGenerateDemandIndent}
                      className="w-full py-1.5 px-2.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <FileText className="w-3 h-3" />
                      {activeDemandIndent?.status === 'DEMAND_GENERATED' ? 'Re-Generate Indent' : 'Generate Demand'}
                    </button>
                  </div>

                  {/* STEP 2: DEMAND FULFILLED */}
                  <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                    activeDemandIndent?.status === 'DEMAND_FULFILLED'
                      ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400/40'
                      : activeDemandIndent?.status === 'TAKEN_ON_CHARGE'
                      ? 'bg-slate-50/80 border-emerald-200 text-slate-700'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-blue-950 flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                          activeDemandIndent?.status === 'TAKEN_ON_CHARGE'
                            ? 'bg-emerald-600 text-white'
                            : activeDemandIndent?.status === 'DEMAND_FULFILLED'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}>
                          {activeDemandIndent?.status === 'TAKEN_ON_CHARGE' ? '✓' : '2'}
                        </span>
                        2. Demand Fulfilled
                      </span>
                      {activeDemandIndent?.status === 'DEMAND_FULFILLED' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-200 text-blue-900">Arrived</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={demandActionLoading || !activeDemandIndent || activeDemandIndent.status !== 'DEMAND_GENERATED'}
                      onClick={() => handleFulfillDemand(activeDemandIndent?.id)}
                      className="w-full py-1.5 px-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Truck className="w-3 h-3" />
                      Mark Fulfilled
                    </button>
                  </div>

                  {/* STEP 3: DEMAND TAKEN ON CHARGE */}
                  <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                    activeDemandIndent?.status === 'TAKEN_ON_CHARGE'
                      ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/40'
                      : activeDemandIndent?.status === 'DEMAND_FULFILLED'
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-emerald-950 flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                          activeDemandIndent?.status === 'TAKEN_ON_CHARGE'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}>
                          3
                        </span>
                        3. Taken On Charge
                      </span>
                      {activeDemandIndent?.status === 'TAKEN_ON_CHARGE' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">Stocked In</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={demandActionLoading || !activeDemandIndent || activeDemandIndent.status !== 'DEMAND_FULFILLED'}
                      onClick={() => handleTakeOnCharge(activeDemandIndent?.id)}
                      className="w-full py-1.5 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <PackageCheck className="w-3 h-3" />
                      Take on Charge as Stock In
                    </button>
                  </div>
                </div>

                {/* Feedback Notification Alert */}
                {demandMessage && (
                  <div className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 ${
                    demandMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}>
                    <span>{demandMessage.text}</span>
                    <button type="button" onClick={() => setDemandMessage(null)} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Compact Helper Banner */}
              <div className="px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Enter <strong>Demand Units</strong>, <strong>Rate</strong>, <strong>GST%</strong> and <strong>Expiry Date</strong> below:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFillCatalogRatesForDemand}
                    className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer border border-amber-300 transition-all shadow-2xs"
                    title="Quickly fill approved catalog prices and 5% GST as a starting point"
                  >
                    ⚡ Auto-Fill Catalog Rates
                  </button>
                  {(demandedItemsCount > 0 || Object.values(demandRates).some(r => r !== '') || Object.values(demandGsts).some(g => g !== '')) && (
                    <button
                      type="button"
                      onClick={handleClearDemands}
                      className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-amber-900 font-bold text-[11px] cursor-pointer border border-amber-200 transition-all shadow-2xs"
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>

              {/* Demand Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm print:text-xs">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 print:bg-slate-100 print:text-slate-800">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Refreshment Item</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3">Current Stock</th>

                        {/* COLUMN 1: DEMAND (UNITS) - AMBER ACCENT */}
                        <th className="p-3 bg-amber-500/10 border-x border-amber-300 text-amber-950 font-black print:bg-transparent print:border-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 print:hidden"></span>
                            <span>DEMAND (UNITS)</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold normal-case block mt-0.5 print:hidden">
                            Enter Quantity
                          </span>
                        </th>

                        {/* COLUMN 2: RATE (₹) - EMERALD ACCENT */}
                        <th className="p-3 bg-emerald-500/10 border-x border-emerald-300 text-emerald-950 font-black text-right print:bg-transparent print:border-slate-300">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 print:hidden"></span>
                            <span>RATE (₹)</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold normal-case block mt-0.5 print:hidden">
                            Per Unit Rate
                          </span>
                        </th>

                        {/* COLUMN 3: GST % - INDIGO ACCENT */}
                        <th className="p-3 bg-indigo-500/10 border-x border-indigo-300 text-indigo-950 font-black text-center print:bg-transparent print:border-slate-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 print:hidden"></span>
                            <span>GST %</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold normal-case block mt-0.5 print:hidden">
                            Tax Rate
                          </span>
                        </th>

                        {/* COLUMN 4: EXPIRY DATE - PURPLE ACCENT */}
                        <th className="p-3 bg-purple-500/10 border-x border-purple-300 text-purple-950 font-black text-center print:bg-transparent print:border-slate-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500 print:hidden"></span>
                            <span>EXPIRY DATE</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold normal-case block mt-0.5 print:hidden">
                            Batch Shelf Life
                          </span>
                        </th>

                        {/* COLUMN 5: TOTAL AMOUNT */}
                        <th className="p-3 bg-slate-100 text-slate-800 font-black text-right">
                          <span>TOTAL AMOUNT</span>
                          <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                            (inc. GST)
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-slate-400 text-xs">
                            No items found in inventory.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => {
                          const photo = getItemPhoto(item.item_name, item.image_url);
                          const qtyVal = demandQuantities[item.id] !== undefined ? demandQuantities[item.id] : '';
                          const numQty = parseInt(qtyVal, 10) || 0;

                          const rVal = demandRates[item.id] !== undefined ? demandRates[item.id] : '';
                          const hasRate = rVal !== '' && !isNaN(parseFloat(rVal)) && parseFloat(rVal) >= 0;
                          const numRate = hasRate ? parseFloat(rVal) : 0;

                          const gVal = demandGsts[item.id] !== undefined ? demandGsts[item.id] : '';
                          const hasGst = gVal !== '' && !isNaN(parseFloat(gVal)) && parseFloat(gVal) >= 0;
                          const numGst = hasGst ? parseFloat(gVal) : 0;

                          const lineSubtotal = (numQty > 0 && hasRate) ? numQty * numRate : 0;
                          const lineGst = lineSubtotal * (numGst / 100);
                          const lineTotal = lineSubtotal + lineGst;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors print:border-b print:border-slate-200 ${
                                numQty > 0 ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="p-3 text-center text-xs font-bold text-slate-400 print:text-slate-700">
                                {idx + 1}
                              </td>

                              {/* Item with Photo */}
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={photo}
                                    alt={item.item_name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0 print:hidden"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/items/samosa.jpg';
                                    }}
                                  />
                                  <div>
                                    <span className="font-bold text-sm text-slate-900 block print:text-xs">
                                      {item.item_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 print:hidden">
                                      Stock: {item.current_stock || 0} {item.unit_of_measure}s
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Unit of Measure */}
                              <td className="p-3 text-slate-600 font-medium text-xs">
                                {item.unit_of_measure}
                              </td>

                              {/* Current Stock */}
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 print:border-none print:p-0 print:bg-transparent">
                                  {item.current_stock || 0}
                                </span>
                              </td>

                              {/* 1. DEMAND (UNITS) - AMBER ACCENT UI */}
                              <td className="p-2.5 bg-amber-50/40 border-x border-amber-200/70 print:bg-transparent print:border-slate-300">
                                <div className="flex items-center gap-1.5 print:hidden">
                                  <input
                                    type="number"
                                    min="0"
                                    value={qtyVal}
                                    onChange={(e) => handleDemandChange(item.id, e.target.value)}
                                    placeholder="0 units"
                                    className="w-28 px-2.5 py-1.5 rounded-xl bg-white border-2 border-amber-300 text-slate-900 font-black text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 shadow-2xs hover:border-amber-400 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                  />
                                  {qtyVal !== '' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDemandChange(item.id, '')}
                                      title="Reset to blank"
                                      className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs transition-all cursor-pointer shrink-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="hidden print:block font-bold text-center">
                                  {qtyVal !== '' ? `${qtyVal} ${item.unit_of_measure}s` : '________________'}
                                </div>
                              </td>

                              {/* 2. RATE (₹) - EMERALD ACCENT UI WITH OLD RATE & COLOR-CODED DIFF */}
                              <td className="p-2.5 bg-emerald-50/40 border-x border-emerald-200/70 text-right print:bg-transparent print:border-slate-300">
                                {(() => {
                                  const oldRate = Number(item.unit_price || 0);
                                  const diff = hasRate ? (numRate - oldRate) : null;

                                  return (
                                    <div className="flex flex-col items-end print:hidden">
                                      {/* Old Rate reference pill */}
                                      <div className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
                                        <span className="text-slate-400">Old:</span>
                                        <span className="font-bold text-slate-700 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                                          ₹{oldRate.toFixed(2)}
                                        </span>
                                      </div>

                                      {/* New Rate input field */}
                                      <div className="relative inline-flex items-center">
                                        <span className="absolute left-2.5 text-xs text-emerald-700 font-black">₹</span>
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={rVal}
                                          onChange={(e) => handleDemandRateChange(item.id, e.target.value)}
                                          placeholder="0.00"
                                          className="w-24 pl-6 pr-2 py-1.5 text-right text-xs font-black rounded-xl border-2 border-emerald-300 bg-white text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 shadow-2xs hover:border-emerald-400 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                        />
                                      </div>

                                      {/* Visual Diff: Higher (Red), Lower (Green), Same (Yellow) */}
                                      {hasRate && diff !== null && (
                                        <div className="mt-1">
                                          {diff > 0 ? (
                                            <span
                                              title={`New rate is higher than old rate by ₹${diff.toFixed(2)}`}
                                              className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                                            >
                                              ▲ +₹{diff.toFixed(2)} Higher
                                            </span>
                                          ) : diff < 0 ? (
                                            <span
                                              title={`New rate is lower than old rate by ₹${Math.abs(diff).toFixed(2)}`}
                                              className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                            >
                                              ▼ -₹{Math.abs(diff).toFixed(2)} Lower
                                            </span>
                                          ) : (
                                            <span
                                              title="New rate is exactly the same as old rate"
                                              className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                            >
                                              = ₹0.00 Same
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="hidden print:block font-bold text-center">
                                  {hasRate ? `₹${numRate.toFixed(2)}` : '__________'}
                                  <span className="block text-[9px] text-slate-500 font-normal">
                                    (Old: ₹{Number(item.unit_price || 0).toFixed(2)})
                                  </span>
                                </div>
                              </td>

                              {/* 3. GST % - INDIGO ACCENT UI */}
                              <td className="p-2.5 bg-indigo-50/40 border-x border-indigo-200/70 text-center print:bg-transparent print:border-slate-300">
                                <div className="flex items-center justify-center print:hidden">
                                  <div className="relative inline-flex items-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="100"
                                      value={gVal}
                                      onChange={(e) => handleDemandGstChange(item.id, e.target.value)}
                                      placeholder="0"
                                      className="w-16 px-2 py-1.5 text-center text-xs font-black rounded-xl border-2 border-indigo-300 bg-white text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-2xs hover:border-indigo-400 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                    />
                                    <span className="text-xs text-indigo-700 font-black ml-1">%</span>
                                  </div>
                                </div>
                                <div className="hidden print:block font-bold text-center">
                                  {hasGst ? `${numGst}%` : '______'}
                                </div>
                              </td>

                              {/* 4. EXPIRY DATE - PURPLE ACCENT UI */}
                              <td className="p-2.5 bg-purple-50/40 border-x border-purple-200/70 text-center print:bg-transparent print:border-slate-300">
                                <div className="flex items-center justify-center print:hidden">
                                  <input
                                    type="date"
                                    value={demandExpiries[item.id] !== undefined ? demandExpiries[item.id] : ''}
                                    onChange={(e) => handleDemandExpiryChange(item.id, e.target.value)}
                                    className="w-32 px-2 py-1.5 text-xs font-bold rounded-xl border-2 border-purple-300 bg-white text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-500 shadow-2xs hover:border-purple-400 transition-all cursor-pointer"
                                  />
                                </div>
                                <div className="hidden print:block font-bold text-center">
                                  {demandExpiries[item.id] ? demandExpiries[item.id] : '__________'}
                                </div>
                              </td>

                              {/* 5. LINE TOTAL AMOUNT (inc. GST) */}
                              <td className="p-3 text-right">
                                {numQty > 0 && hasRate ? (
                                  <span className="font-black text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 print:bg-transparent print:border-none print:p-0 shadow-2xs">
                                    ₹{lineTotal.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold print:hidden">—</span>
                                )}
                                <div className="hidden print:block font-bold text-center">
                                  {numQty > 0 && hasRate ? `₹${lineTotal.toFixed(2)}` : '__________'}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan="4" className="p-4 text-right uppercase tracking-wider text-slate-600 font-black">
                            Total Demand Requisition:
                          </td>
                          <td className="p-3 bg-amber-50/70 border-x border-amber-200 font-black text-amber-950 text-sm">
                            {totalDemandedUnits > 0 ? `${totalDemandedUnits} units` : '0 units'}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-800 bg-emerald-50/70 border-x border-emerald-200">
                            {totalEstimatedDemandCost > 0 ? `₹${totalEstimatedDemandCost.toFixed(2)}` : '—'}
                          </td>
                          <td className="p-3 text-center text-indigo-700 font-black bg-indigo-50/70 border-x border-indigo-200">
                            {totalEstimatedDemandGst > 0 ? `₹${totalEstimatedDemandGst.toFixed(2)}` : '—'}
                          </td>
                          <td className="p-3 text-center text-purple-700 font-bold bg-purple-50/70 border-x border-purple-200">
                            —
                          </td>
                          <td className="p-4 text-right font-black text-sm text-emerald-800">
                            {totalEstimatedDemandGrand > 0 ? `₹${totalEstimatedDemandGrand.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Printable Signatures Block (Visible ONLY during print) */}
              <div className="hidden print:grid grid-cols-3 gap-8 pt-16 pb-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Prepared by (Storekeeper / Clerk)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Signature & Date</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Verified by (ANO / CTO)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Signature & Stamp</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Sanctioned by (Quartermaster / CO)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Signature & Official Seal</div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: ITEM HISTORY (DYNAMIC STATE-OF-THE-ART STOCK FLOW & LEDGER) */}
          {stockSubTab === 'history' && (
            <div className="space-y-4">
              {/* Dynamic Inflow vs Outflow Visual Meter Bar - Clean White Card */}
              <div className="p-4 bg-white rounded-3xl shadow-sm space-y-3.5 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <History className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 tracking-wide uppercase flex items-center gap-2">
                        State-of-the-Art Stock Movement & Flow Register
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Live Audit Trail
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Visual balance flow, complete timeline of arrivals, cadet dispatches, and proper-channel write-offs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAllStockLogs}
                      disabled={loadingAllLogs}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingAllLogs ? 'animate-spin' : ''}`} />
                      Sync Logs
                    </button>
                  </div>
                </div>

                {/* 4 Colorful KPI Metric Cards on White Background */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center justify-between">
                      <span>TOTAL STOCK INFLOW</span>
                      <span className="text-emerald-600 text-xs font-bold">▲</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      +{allStockData.global_flow_in} <span className="text-xs font-normal text-emerald-700">units</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      All arrivals & indents taken on charge
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-500 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center justify-between">
                      <span>TOTAL STOCK OUTFLOW</span>
                      <span className="text-blue-600 text-xs font-bold">▼</span>
                    </div>
                    <div className="text-2xl font-black text-blue-600 mt-1">
                      -{allStockData.global_flow_out} <span className="text-xs font-normal text-blue-700">units</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      Cadet dispatches, meetings & disposals
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center justify-between">
                      <span>NET LIVE STORE BALANCE</span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    </div>
                    <div className="text-2xl font-black text-indigo-700 mt-1">
                      {items.reduce((s, i) => s + (i.current_stock || 0), 0)} <span className="text-xs font-normal text-indigo-600">units</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      In-store physical verification count
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-rose-500 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center justify-between">
                      <span>TOTAL WASTAGE / LOSS</span>
                      <span className="text-rose-600 text-xs font-bold">⛔</span>
                    </div>
                    <div className="text-2xl font-black text-rose-600 mt-1">
                      {allStockData.global_wastage_units} <span className="text-xs font-normal text-rose-700">units</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      ₹{allStockData.global_wastage_amount.toFixed(2)} write-off valuation
                    </div>
                  </div>
                </div>

                {/* Inflow vs Outflow Visual Ratio Meter */}
                {(() => {
                  const totalFlow = (allStockData.global_flow_in || 0) + (allStockData.global_flow_out || 0);
                  const inPct = totalFlow > 0 ? Math.round((allStockData.global_flow_in / totalFlow) * 100) : 50;
                  const outPct = 100 - inPct;

                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span className="text-emerald-700 font-black">Inflow: {inPct}%</span>
                        <span className="text-slate-500">Total Store Turnover Volume: {totalFlow} units</span>
                        <span className="text-blue-700 font-black">Outflow: {outPct}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex shadow-inner">
                        <div style={{ width: `${inPct}%` }} className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all"></div>
                        <div style={{ width: `${outPct}%` }} className="bg-gradient-to-r from-blue-500 to-rose-400 h-full transition-all"></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2-COLUMN WORKSPACE: LEFT ITEMS DIRECTORY SIDEBAR LIST + RIGHT MOVEMENT AUDIT CONSOLE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* LEFT SIDEBAR: REFRESHMENT ITEMS DIRECTORY LIST */}
                <div className="lg:col-span-4 xl:col-span-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 space-y-3 lg:sticky lg:top-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider block">
                          Items Directory
                        </span>
                        <span className="text-[10px] text-slate-400">Click item to view audit</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {items.length} items
                    </span>
                  </div>

                  {/* Sidebar Item Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySidebarSearch}
                      onChange={e => setHistorySidebarSearch(e.target.value)}
                      placeholder="Filter items by name..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
                    />
                    {historySidebarSearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySidebarSearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sidebar Item List (Scrollable) */}
                  <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
                    {/* All Items Master Option */}
                    <button
                      type="button"
                      onClick={() => setHistoryItemFilter('ALL')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                        historyItemFilter === 'ALL'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md font-black'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          historyItemFilter === 'ALL' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">All Refreshment Items</span>
                          <span className={`text-[10px] ${historyItemFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Complete store ledger
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                        historyItemFilter === 'ALL' ? 'bg-white text-slate-900' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                        {items.length}
                      </span>
                    </button>

                    {/* Filtered Items List */}
                    {items
                      .filter(i => !historySidebarSearch || i.item_name.toLowerCase().includes(historySidebarSearch.toLowerCase()))
                      .map(item => {
                        const isSelected = historyItemFilter === item.id.toString();
                        const photo = getItemPhoto(item.item_name, item.image_url);
                        const summary = (allStockData.itemSummaries || []).find(s => s.id === item.id);
                        const totalIn = summary ? summary.total_in : 0;
                        const totalOut = summary ? summary.total_out : 0;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setHistoryItemFilter(item.id.toString())}
                            className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black'
                                : 'bg-white hover:bg-indigo-50/40 text-slate-800 border-slate-200 hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={photo}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/items/samosa.jpg';
                                }}
                              />
                              <div className="min-w-0">
                                <span className="block truncate text-xs font-bold">
                                  {item.item_name}
                                </span>
                                <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  Live Stock: <strong className={isSelected ? 'text-white' : 'text-slate-800 font-black'}>{item.current_stock || 0}</strong> {item.unit_of_measure}s
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 pl-1.5">
                              <span className={`text-[9px] block font-black ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                +{totalIn} In
                              </span>
                              <span className={`text-[9px] block font-black ${isSelected ? 'text-rose-300' : 'text-rose-600'}`}>
                                -{totalOut} Out
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* RIGHT CONSOLE: LEDGER AUDIT LOGS & MOVEMENT FILTERS */}
                <div className="lg:col-span-8 xl:col-span-8.5 space-y-3">
                  {/* Selected Item Focus Banner (Visible when a specific item is selected) */}
                  {(() => {
                    const selectedItem = items.find(i => i.id.toString() === historyItemFilter);
                    if (!selectedItem) return null;
                    const photo = getItemPhoto(selectedItem.item_name, selectedItem.image_url);
                    const summary = (allStockData.itemSummaries || []).find(s => s.id === selectedItem.id);
                    const totalIn = summary ? summary.total_in : 0;
                    const totalOut = summary ? summary.total_out : 0;
                    const totalLoss = summary ? summary.total_wastage : 0;

                    return (
                      <div className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={photo}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/items/samosa.jpg';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{selectedItem.item_name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {selectedItem.unit_of_measure}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-3">
                              <span>Current Stock: <strong className="text-slate-900 font-black">{selectedItem.current_stock || 0} units</strong></span>
                              <span>Rate: <strong className="text-slate-900">₹{Number(selectedItem.unit_price || 0).toFixed(2)}</strong></span>
                              <span>GST: <strong className="text-slate-900">{selectedItem.default_gst_rate || 5}%</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 border-t-2 border-t-emerald-500 text-center shadow-xs">
                            <span className="text-[9px] uppercase font-black text-emerald-700 block">Total Inflow</span>
                            <span className="text-xs font-black text-emerald-600">+{totalIn}</span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 border-t-2 border-t-blue-500 text-center shadow-xs">
                            <span className="text-[9px] uppercase font-black text-blue-700 block">Total Outflow</span>
                            <span className="text-xs font-black text-blue-600">-{totalOut}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHistoryItemFilter('ALL')}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                          >
                            ✕ All Items
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Filter Controls Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    {/* Movement Type Tabs */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto">
                      {[
                        { id: 'ALL', label: 'All Movements' },
                        { id: 'STOCK_IN', label: 'Inwards (+Inflow)' },
                        { id: 'STOCK_OUT', label: 'Outwards (-Outflow)' },
                        { id: 'WASTAGE', label: 'Wastage (-Loss)' },
                        { id: 'EXPIRED', label: 'Expired (-Loss)' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setHistoryTypeFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            historyTypeFilter === tab.id
                              ? 'bg-white text-slate-900 shadow-xs font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[220px]">
                      <input
                        type="text"
                        value={historySearchTerm}
                        onChange={e => setHistorySearchTerm(e.target.value)}
                        placeholder="Search ref #, indent, officer..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
                      />
                      {historySearchTerm && (
                        <button
                          type="button"
                          onClick={() => setHistorySearchTerm('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comprehensive Chronological Movement Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Refreshment Item</th>
                            <th className="p-3">Movement Type</th>
                            <th className="p-3">Ref / Indent / Order #</th>
                            <th className="p-3 text-center">Flow Quantity</th>
                            <th className="p-3 text-right">Balance Progression</th>
                            <th className="p-3 text-right">Valuation (₹)</th>
                            <th className="p-3">Officer / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const filteredLogs = (allStockData.logs || []).filter(l => {
                              if (historyItemFilter !== 'ALL' && l.item_id.toString() !== historyItemFilter) return false;
                              if (historyTypeFilter !== 'ALL') {
                                if (historyTypeFilter === 'STOCK_IN' && l.change_type !== 'STOCK_IN' && l.log_type !== 'STOCK_IN') return false;
                                if (historyTypeFilter === 'STOCK_OUT' && l.change_type !== 'STOCK_OUT' && l.log_type === 'STOCK_IN') return false;
                                if (historyTypeFilter === 'WASTAGE' && l.log_type !== 'WASTAGE' && l.log_type !== 'DAMAGE') return false;
                                if (historyTypeFilter === 'EXPIRED' && l.log_type !== 'EXPIRED') return false;
                              }
                              if (historySearchTerm) {
                                const term = historySearchTerm.toLowerCase();
                                const matchesRef = (l.reference_no || '').toLowerCase().includes(term);
                                const matchesNote = (l.notes || '').toLowerCase().includes(term);
                                const matchesOfficer = (l.added_by_name || '').toLowerCase().includes(term);
                                const matchesItem = (l.item_name || '').toLowerCase().includes(term);
                                if (!matchesRef && !matchesNote && !matchesOfficer && !matchesItem) return false;
                              }
                              return true;
                            });

                            if (loadingAllLogs) {
                              return (
                                <tr>
                                  <td colSpan="9" className="p-12 text-center text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                    Loading real-time movement history...
                                  </td>
                                </tr>
                              );
                            }

                            if (filteredLogs.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="9" className="p-12 text-center text-slate-400">
                                    No stock movements match the selected filters.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredLogs.map((log, idx) => {
                              const isStockIn = log.change_type === 'STOCK_IN' || log.log_type === 'STOCK_IN';
                              const isWastage = log.log_type === 'WASTAGE' || log.log_type === 'DAMAGE';
                              const isExpired = log.log_type === 'EXPIRED';
                              const photo = getItemPhoto(log.item_name, log.image_url);

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-3 text-center text-slate-400 font-bold">
                                    {idx + 1}
                                  </td>

                                  <td className="p-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                    <div className="font-bold text-slate-800">
                                      {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-slate-400 text-[9px]">
                                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <img src={photo} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                                      <div>
                                        <span className="font-bold text-slate-900 block">{log.item_name || 'Item'}</span>
                                        <span className="text-[10px] text-slate-400">{log.unit_of_measure || 'units'}</span>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block border ${
                                      isStockIn
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : isExpired
                                        ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                                        : isWastage
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-blue-100 text-blue-800 border-blue-300'
                                    }`}>
                                      {log.log_type || (isStockIn ? 'STOCK_IN' : 'STOCK_OUT')}
                                    </span>
                                  </td>

                                  <td className="p-3 font-mono text-[10px] text-slate-700 font-bold">
                                    {log.reference_no || (log.indent_id ? `IND-${log.indent_id}` : 'DIRECT-ENTRY')}
                                  </td>

                                  <td className="p-3 text-center">
                                    <span className={`font-black text-xs ${
                                      isStockIn ? 'text-emerald-700' : 'text-rose-700'
                                    }`}>
                                      {isStockIn ? `+${log.quantity}` : `-${log.quantity}`} {log.unit_of_measure || 'units'}
                                    </span>
                                  </td>

                                  <td className="p-3 text-right">
                                    <span className="font-mono text-slate-500">{log.previous_stock !== undefined ? log.previous_stock : '—'}</span>
                                    <span className="text-slate-400 mx-1">&rarr;</span>
                                    <span className="font-black text-slate-900">{log.balance_after}</span>
                                  </td>

                                  <td className="p-3 text-right font-black text-slate-800">
                                    {log.total_amount ? `₹${Number(log.total_amount).toFixed(2)}` : '—'}
                                  </td>

                                  <td className="p-3">
                                    <div className="text-[11px] text-slate-800 font-medium">{log.notes || '—'}</div>
                                    {log.added_by_name && (
                                      <div className="text-[9px] text-slate-400 mt-0.5">By: {log.added_by_name}</div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 4: WASTAGE & CONDEMNATION REGISTER (WORKFLOW JUST LIKE DEMAND FOR STOCK OUT) */}
          {stockSubTab === 'wastage' && (
            <div className="space-y-4">
              {/* Wastage Summary KPI Bar */}
              {(() => {
                const totalUnitsCondemn = items.reduce((sum, item) => sum + (parseInt(wastageQuantities[item.id], 10) || 0), 0);
                const itemsCondemnCount = Object.values(wastageQuantities).filter(q => q !== '' && parseInt(q, 10) > 0).length;
                const totalLossVal = items.reduce((sum, item) => {
                  const qty = parseInt(wastageQuantities[item.id], 10) || 0;
                  const rate = Number(item.unit_price || 0);
                  const gst = item.default_gst_rate !== undefined ? Number(item.default_gst_rate) : 5.0;
                  const sub = qty * rate;
                  return sum + sub + (sub * (gst / 100));
                }, 0);

                return (
                  <div className="space-y-3">
                    {/* Top KPI Metrics Bar - Pure White Background with Colorful Accents */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-slate-500 shadow-2xs flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Catalog Items</span>
                        <span className="text-base font-black text-slate-900">{String(items.length).padStart(2, '0')}</span>
                      </div>

                      <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-rose-500 shadow-2xs flex items-center justify-between">
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Items in Condemn</span>
                        <span className="text-base font-black text-rose-800">{String(itemsCondemnCount).padStart(2, '0')}</span>
                      </div>

                      <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 shadow-2xs flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Wastage Units</span>
                        <span className="text-base font-black text-amber-800">{String(totalUnitsCondemn).padStart(2, '0')}</span>
                      </div>

                      <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 shadow-2xs flex items-center justify-between">
                        <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">Estimated Loss</span>
                        <span className="text-base font-black text-red-800">{totalLossVal > 0 ? `₹${totalLossVal.toFixed(2)}` : '—'}</span>
                      </div>
                    </div>

                    {/* Vendor Stock-Out / Write-Off Workflow Bar (Matching Demand for Stock Out) */}
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Vendor Warehouse Write-Off & Stock-Out Workflow:
                          </span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            1. Select Damaged / Spoiled Items &rarr; 2. Record Stock Out Voucher &rarr; 3. Deduct from Live Store Balances
                          </span>
                        </div>

                        {itemsCondemnCount > 0 && (
                          <button
                            type="button"
                            disabled={wastageActionLoading}
                            onClick={handleBatchStockOutWastage}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            ⚡ Confirm Stock Out ({totalUnitsCondemn} units)
                          </button>
                        )}
                      </div>

                      {/* Stock-Out Voucher Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Stock-Out Voucher / Ref # *</label>
                          <input
                            type="text"
                            value={wastageRefNo}
                            onChange={e => setWastageRefNo(e.target.value)}
                            placeholder="e.g. WO-2026-001 / SO-2026-01"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Authorized By / Store Manager *</label>
                          <input
                            type="text"
                            value={wastageOfficer}
                            onChange={e => setWastageOfficer(e.target.value)}
                            placeholder="e.g. Warehouse Manager / Store Incharge / Vendor Supervisor"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Disposal / Write-off Reason & Remarks</label>
                          <input
                            type="text"
                            value={wastageNotes}
                            onChange={e => setWastageNotes(e.target.value)}
                            placeholder="Reason for write-off, disposal method..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Feedback Alert */}
                      {wastageMessage && (
                        <div className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 ${
                          wastageMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                        }`}>
                          <span>{wastageMessage.text}</span>
                          <button onClick={() => setWastageMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Wastage Requisition Sheet Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="p-3 w-10 text-center">#</th>
                              <th className="p-3">Refreshment Item</th>
                              <th className="p-3">Unit</th>
                              <th className="p-3">Current Stock</th>
                              <th className="p-3 bg-rose-500/10 border-x border-rose-300 text-rose-950 font-black">
                                WASTAGE QTY TO OUT
                                <span className="text-[10px] text-rose-700 font-bold block normal-case">Enter Quantity</span>
                              </th>
                              <th className="p-3 bg-amber-500/10 border-x border-amber-300 text-amber-950 font-black">
                                DISPOSAL REASON
                                <span className="text-[10px] text-amber-700 font-bold block normal-case">Channel Reason</span>
                              </th>
                              <th className="p-3 text-right">Unit Rate (₹)</th>
                              <th className="p-3 text-center">GST%</th>
                              <th className="p-3 text-right bg-slate-100 font-black text-slate-900">
                                LOSS VALUATION
                                <span className="text-[10px] text-slate-500 block normal-case">(inc. GST)</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => {
                              const photo = getItemPhoto(item.item_name, item.image_url);
                              const qtyVal = wastageQuantities[item.id] !== undefined ? wastageQuantities[item.id] : '';
                              const numQty = parseInt(qtyVal, 10) || 0;
                              const reasonVal = wastageReasons[item.id] || 'WASTAGE';
                              const rate = Number(item.unit_price || 0);
                              const gst = item.default_gst_rate !== undefined ? Number(item.default_gst_rate) : 5.0;
                              const lineSub = numQty * rate;
                              const lineLoss = lineSub + (lineSub * (gst / 100));

                              return (
                                <tr key={item.id} className={numQty > 0 ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'}>
                                  <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2.5">
                                      <img src={photo} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                                      <div>
                                        <span className="font-bold text-sm text-slate-900 block">{item.item_name}</span>
                                        <span className="text-[10px] text-slate-400">Stock: {item.current_stock || 0} {item.unit_of_measure}s</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-600 text-xs font-medium">{item.unit_of_measure}</td>
                                  <td className="p-3">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      {item.current_stock || 0}
                                    </span>
                                  </td>

                                  {/* WASTAGE QTY TO OUT */}
                                  <td className="p-2.5 bg-rose-50/40 border-x border-rose-200">
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.current_stock || 0}
                                        value={qtyVal}
                                        onChange={e => handleWastageChange(item.id, e.target.value)}
                                        placeholder="0 units"
                                        className="w-28 px-2.5 py-1.5 rounded-xl bg-white border-2 border-rose-300 text-rose-950 font-black text-xs focus:ring-2 focus:ring-rose-400 focus:border-rose-500 shadow-2xs"
                                      />
                                      {qtyVal !== '' && (
                                        <button
                                          type="button"
                                          onClick={() => handleWastageChange(item.id, '')}
                                          className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* DISPOSAL REASON */}
                                  <td className="p-2.5 bg-amber-50/40 border-x border-amber-200">
                                    <select
                                      value={reasonVal}
                                      onChange={e => handleWastageReasonChange(item.id, e.target.value)}
                                      className="px-2 py-1.5 text-xs font-bold rounded-xl border-2 border-amber-300 bg-white text-amber-950 focus:ring-2 focus:ring-amber-400"
                                    >
                                      <option value="WASTAGE">WASTAGE - Spoilage / Deterioration</option>
                                      <option value="DAMAGE">DAMAGE - Transit / Ruptured</option>
                                      <option value="CONDEMNED">CONDEMNED - Quality Rejection</option>
                                      <option value="EXPIRED">EXPIRED - Past Shelf-Life</option>
                                      <option value="SPECIAL_ISSUE">SPECIAL ISSUE - Protocol Dispatch</option>
                                    </select>
                                  </td>

                                  <td className="p-3 text-right font-bold text-xs text-slate-800">₹{rate.toFixed(2)}</td>
                                  <td className="p-3 text-center text-xs font-bold text-slate-600">{gst}%</td>
                                  <td className="p-3 text-right">
                                    {numQty > 0 ? (
                                      <span className="font-black text-xs text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                                        ₹{lineLoss.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                            <tr>
                              <td colSpan="4" className="p-3 text-right uppercase font-black text-slate-600">Total Condemnation:</td>
                              <td className="p-3 bg-rose-50/70 border-x border-rose-200 font-black text-rose-950">
                                {totalUnitsCondemn > 0 ? `${totalUnitsCondemn} units` : '0 units'}
                              </td>
                              <td colSpan="3"></td>
                              <td className="p-3 text-right font-black text-rose-800 text-sm">
                                {totalLossVal > 0 ? `₹${totalLossVal.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SUB-VIEW 5: EXPIRED ITEMS REGISTER & CONDEMNATION (STOCK OUT WORKFLOW MATCHING DEMAND) */}
          {stockSubTab === 'expired' && (
            <div className="space-y-4">
              {/* Printable Official Header (Visible ONLY during print) */}
              <div className="hidden print:block p-6 text-slate-900 border-b-2 border-slate-900 mb-4">
                <div className="text-center">
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    NATIONAL CADET CORPS (NCC)
                  </h2>
                  <h3 className="text-sm font-bold text-slate-700 tracking-wide mt-0.5">
                    EXPIRED STORES CONDEMNATION & STOCK-OUT BOARD CERTIFICATE
                  </h3>
                  <div className="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-300">
                    <span><strong>Disposal Order Ref:</strong> {expiredRefNo || 'NCC-COND-EXP-2026-01'}</span>
                    <span><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Expiry Header & Action Controls - Clean White Card */}
              <div className="p-4 bg-white rounded-3xl shadow-sm space-y-3.5 border border-slate-200 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 tracking-wide uppercase flex items-center gap-2">
                        Expired Batches & Shelf-Life Condemnation Registry
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Food Safety Protocol
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Real-time shelf-life tracking for all items, exact date balance countdown, and proper-channel stock-out condemnation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFillAllExpired}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current text-white" />
                      Auto-Select All Expired
                    </button>

                    <button
                      type="button"
                      onClick={handleClearExpired}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      Clear Quantities
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Sheet
                    </button>
                  </div>
                </div>

                {/* 4 Colorful Shelf-Life KPI Cards on White Background */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-red-600 shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block flex items-center justify-between">
                      <span>EXPIRED BATCHES</span>
                      <span className="text-red-500 font-bold">⛔</span>
                    </span>
                    <div className="text-2xl font-black text-red-600 mt-1">
                      {String(items.filter(i => calculateExpiryDateBalance(i.expiry_date).isExpired).length).padStart(2, '0')}{' '}
                      <span className="text-xs font-normal text-red-700">items</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Must be condemned & stocked out</span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block flex items-center justify-between">
                      <span>EXPIRING SOON (≤30 DAYS)</span>
                      <span className="text-amber-500 font-bold">⚠️</span>
                    </span>
                    <div className="text-2xl font-black text-amber-600 mt-1">
                      {String(items.filter(i => {
                        const bal = calculateExpiryDateBalance(i.expiry_date);
                        return bal.isExpiringSoon && !bal.isExpired;
                      }).length).padStart(2, '0')}{' '}
                      <span className="text-xs font-normal text-amber-700">items</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Priority distribution advised</span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block flex items-center justify-between">
                      <span>FRESH & HEALTHY BATCHES</span>
                      <span className="text-emerald-500 font-bold">✅</span>
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      {String(items.filter(i => calculateExpiryDateBalance(i.expiry_date).status === 'healthy').length).padStart(2, '0')}{' '}
                      <span className="text-xs font-normal text-emerald-700">items</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Optimal shelf life (&gt;30 days)</span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block flex items-center justify-between">
                      <span>TOTAL STORE ITEMS</span>
                      <span className="text-indigo-500 font-bold">📦</span>
                    </span>
                    <div className="text-2xl font-black text-indigo-700 mt-1">
                      {String(items.length).padStart(2, '0')}{' '}
                      <span className="text-xs font-normal text-indigo-600">catalog items</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">All items monitored live</span>
                  </div>
                </div>
              </div>

              {/* Sub-Filters Strip: Filter by Shelf-Life Status */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto print:hidden">
                {[
                  { id: 'ALL', label: `All Items (${items.length})` },
                  {
                    id: 'EXPIRED',
                    label: `Expired Only (${items.filter(i => calculateExpiryDateBalance(i.expiry_date).isExpired).length})`,
                    count: items.filter(i => calculateExpiryDateBalance(i.expiry_date).isExpired).length,
                    activeClass: 'bg-rose-600 text-white font-black shadow-xs'
                  },
                  {
                    id: 'EXPIRING_SOON',
                    label: `Expiring Soon ≤30d (${items.filter(i => {
                      const b = calculateExpiryDateBalance(i.expiry_date);
                      return b.isExpiringSoon && !b.isExpired;
                    }).length})`,
                    activeClass: 'bg-amber-500 text-white font-black shadow-xs'
                  },
                  {
                    id: 'HEALTHY',
                    label: `Fresh & Healthy (${items.filter(i => calculateExpiryDateBalance(i.expiry_date).status === 'healthy').length})`,
                    activeClass: 'bg-emerald-600 text-white font-black shadow-xs'
                  },
                  {
                    id: 'NO_DATE',
                    label: `No Expiry Set (${items.filter(i => !i.expiry_date).length})`,
                    activeClass: 'bg-slate-700 text-white font-black shadow-xs'
                  }
                ].map(filterBtn => (
                  <button
                    key={filterBtn.id}
                    type="button"
                    onClick={() => setExpiredSubFilter(filterBtn.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      expiredSubFilter === filterBtn.id
                        ? filterBtn.activeClass || 'bg-white text-slate-900 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {filterBtn.label}
                  </button>
                ))}
              </div>

              {/* Expired Stock-Out Requisition & Proper-Channel Workflow (Matching Demand for Stock In) */}
              {(() => {
                const totalExpiredUnitsCondemn = items.reduce((sum, item) => sum + (parseInt(expiredQuantities[item.id], 10) || 0), 0);
                const expiredSelectedCount = Object.values(expiredQuantities).filter(q => q !== '' && parseInt(q, 10) > 0).length;
                const totalEstimatedLoss = items.reduce((sum, item) => {
                  const qty = parseInt(expiredQuantities[item.id], 10) || 0;
                  const rate = Number(item.unit_price || 0);
                  const gst = item.default_gst_rate !== undefined ? Number(item.default_gst_rate) : 5.0;
                  const sub = qty * rate;
                  return sum + sub + (sub * (gst / 100));
                }, 0);

                const displayedItems = items.filter(item => {
                  const bal = calculateExpiryDateBalance(item.expiry_date);
                  if (expiredSubFilter === 'EXPIRED') return bal.isExpired;
                  if (expiredSubFilter === 'EXPIRING_SOON') return bal.isExpiringSoon && !bal.isExpired;
                  if (expiredSubFilter === 'HEALTHY') return bal.status === 'healthy';
                  if (expiredSubFilter === 'NO_DATE') return !item.expiry_date;
                  return true;
                });

                return (
                  <div className="space-y-3">
                    {/* Execution Bar (3-Step Proper Channel Stock Out) */}
                    {/* Expired Stock-Out & Write-Off Workflow Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2.5 print:hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Vendor Warehouse Expiry Stock-Out Workflow:
                          </span>
                          <span className="text-[10px] text-slate-500 hidden md:inline">
                            1. Select Expired Batches &rarr; 2. Record Disposal Voucher &rarr; 3. Write Off from Live Inventory
                          </span>
                        </div>

                        {expiredSelectedCount > 0 && (
                          <button
                            type="button"
                            disabled={expiredActionLoading}
                            onClick={handleBatchStockOutExpired}
                            className="px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            ⚡ Write Off & Stock Out Selected ({totalExpiredUnitsCondemn} units - ₹{totalEstimatedLoss.toFixed(2)})
                          </button>
                        )}
                      </div>

                      {/* Stock-Out Voucher Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            Stock-Out Voucher / Ref # *
                          </label>
                          <input
                            type="text"
                            value={expiredRefNo}
                            onChange={e => setExpiredRefNo(e.target.value)}
                            placeholder="e.g. EXP-WO-2026-001"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            Authorized By / Store Manager *
                          </label>
                          <input
                            type="text"
                            value={expiredOfficer}
                            onChange={e => setExpiredOfficer(e.target.value)}
                            placeholder="e.g. Store Incharge / Warehouse Manager"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            Write-Off / Disposal Remarks
                          </label>
                          <input
                            type="text"
                            value={expiredNotes}
                            onChange={e => setExpiredNotes(e.target.value)}
                            placeholder="e.g. Expired batch disposed / written off from vendor inventory"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      {expiredMessage && (
                        <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                          expiredMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                        }`}>
                          <span>{expiredMessage.text}</span>
                          <button onClick={() => setExpiredMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Table of ALL Items with DATE BALANCE FOR EXPIRY and Stock Out Qty */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="p-3.5 w-10 text-center">#</th>
                              <th className="p-3.5">Refreshment Item</th>
                              <th className="p-3.5">Unit</th>
                              <th className="p-3.5">Current Stock</th>
                              <th className="p-3.5">Batch Expiry Date</th>
                              {/* PROMINENT COLUMN: DATE BALANCE FOR EXPIRY */}
                              <th className="p-3.5 bg-purple-50/70 border-x border-purple-200 text-purple-950 font-black">
                                DATE BALANCE FOR EXPIRY
                                <span className="text-[10px] text-purple-700 font-bold block normal-case">
                                  Days Balance Left / Overdue
                                </span>
                              </th>
                              {/* CONDEMN QTY (STOCK OUT) */}
                              <th className="p-3.5 bg-rose-500/10 border-x border-rose-300 text-rose-950 font-black">
                                CONDEMN QTY (STOCK OUT)
                                <span className="text-[10px] text-rose-700 font-bold block normal-case">
                                  Units to Deduct
                                </span>
                              </th>
                              <th className="p-3.5 text-right">Unit Rate (₹)</th>
                              <th className="p-3.5 text-right bg-slate-100 font-black text-slate-900">
                                LOSS VALUATION
                                <span className="text-[10px] text-slate-500 block normal-case">(inc. GST)</span>
                              </th>
                              <th className="p-3.5 text-right print:hidden">Stock Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedItems.length === 0 ? (
                              <tr>
                                <td colSpan="10" className="p-10 text-center text-slate-400 text-xs">
                                  No items match the selected shelf-life filter.
                                </td>
                              </tr>
                            ) : (
                              displayedItems.map((item, idx) => {
                                const photo = getItemPhoto(item.item_name, item.image_url);
                                const expiryBal = calculateExpiryDateBalance(item.expiry_date);
                                const isExp = expiryBal.isExpired;
                                const qtyVal = expiredQuantities[item.id] !== undefined ? expiredQuantities[item.id] : '';
                                const numQty = parseInt(qtyVal, 10) || 0;
                                const rate = Number(item.unit_price || 0);
                                const gst = item.default_gst_rate !== undefined ? Number(item.default_gst_rate) : 5.0;
                                const lineSub = numQty * rate;
                                const lineLoss = lineSub + (lineSub * (gst / 100));

                                return (
                                  <tr
                                    key={item.id}
                                    className={`transition-colors ${
                                      isExp
                                        ? 'bg-rose-50/50 hover:bg-rose-50/80'
                                        : numQty > 0
                                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                        : 'hover:bg-slate-50/70'
                                    }`}
                                  >
                                    <td className="p-3.5 text-center font-bold text-slate-400">
                                      {idx + 1}
                                    </td>

                                    {/* Item with Photo */}
                                    <td className="p-3.5">
                                      <div className="flex items-center gap-2.5">
                                        <img
                                          src={photo}
                                          alt=""
                                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/items/samosa.jpg';
                                          }}
                                        />
                                        <div>
                                          <span className={`font-bold text-sm block ${isExp ? 'text-rose-950 font-black' : 'text-slate-900'}`}>
                                            {item.item_name}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            Stock: {item.current_stock || 0} {item.unit_of_measure}s
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Unit */}
                                    <td className="p-3.5 text-slate-600 text-xs font-medium">
                                      {item.unit_of_measure}
                                    </td>

                                    {/* Current Stock */}
                                    <td className="p-3.5">
                                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                        (item.current_stock || 0) === 0
                                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                                          : isExp
                                          ? 'bg-rose-100 text-rose-900 border-rose-300 font-black'
                                          : 'bg-slate-100 text-slate-800 border-slate-200'
                                      }`}>
                                        {item.current_stock || 0}
                                      </span>
                                    </td>

                                    {/* Batch Expiry Date */}
                                    <td className="p-3.5">
                                      {item.expiry_date ? (
                                        <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                          {formatExpiryDate(item.expiry_date)}
                                        </span>
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

                                    {/* DATE BALANCE FOR EXPIRY (STATE-OF-THE-ART BADGE & PROGRESS) */}
                                    <td className="p-3.5 bg-purple-50/30 border-x border-purple-200/80">
                                      <div className="space-y-1">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black tracking-tight ${expiryBal.badgeClass}`}>
                                          {isExp && <ShieldAlert className="w-3 h-3 text-white" />}
                                          {!isExp && expiryBal.isExpiringSoon && <Clock className="w-3 h-3" />}
                                          {!isExp && !expiryBal.isExpiringSoon && expiryBal.status === 'healthy' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                          <span>{expiryBal.balanceText}</span>
                                        </span>

                                        {/* Visual Shelf-Life Bar */}
                                        {item.expiry_date && (
                                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                              style={{ width: `${expiryBal.pctRemaining}%` }}
                                              className={`h-full transition-all ${
                                                isExp
                                                  ? 'bg-rose-600'
                                                  : expiryBal.isExpiringSoon
                                                  ? 'bg-amber-500'
                                                  : 'bg-emerald-500'
                                              }`}
                                            ></div>
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* CONDEMN QTY (STOCK OUT) */}
                                    <td className="p-2.5 bg-rose-50/40 border-x border-rose-200">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="0"
                                          max={item.current_stock || 0}
                                          value={qtyVal}
                                          onChange={e => handleExpiredChange(item.id, e.target.value)}
                                          placeholder="0 units"
                                          className="w-24 px-2.5 py-1.5 rounded-xl bg-white border-2 border-rose-300 text-rose-950 font-black text-xs focus:ring-2 focus:ring-rose-400 focus:border-rose-500 shadow-2xs"
                                        />
                                        {(item.current_stock || 0) > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleExpiredChange(item.id, String(item.current_stock))}
                                            title="Condemn full batch"
                                            className="px-1.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-black cursor-pointer shrink-0"
                                          >
                                            Max
                                          </button>
                                        )}
                                        {qtyVal !== '' && (
                                          <button
                                            type="button"
                                            onClick={() => handleExpiredChange(item.id, '')}
                                            className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs shrink-0"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    </td>

                                    {/* Rate */}
                                    <td className="p-3.5 text-right font-bold text-xs text-slate-800">
                                      ₹{rate.toFixed(2)}
                                    </td>

                                    {/* Loss Valuation */}
                                    <td className="p-3.5 text-right">
                                      {numQty > 0 ? (
                                        <span className="font-black text-xs text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                                          ₹{lineLoss.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>

                                    {/* Action */}
                                    <td className="p-3.5 text-right print:hidden">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {isExp && (
                                          <button
                                            type="button"
                                            disabled={(item.current_stock || 0) <= 0}
                                            onClick={() => handleOpenStockOut(item)}
                                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs hover:scale-[1.02]"
                                            title="Individual proper channel stock out"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Stock Out
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenStockIn(item)}
                                          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-[1.02]"
                                          title="Raise replenishment demand for fresh batch"
                                        >
                                          <ClipboardList className="w-3 h-3" />
                                          Demand Restock
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                            <tr>
                              <td colSpan="5" className="p-3.5 text-right uppercase font-black text-slate-600">
                                Total Expired Condemnation Requisition:
                              </td>
                              <td className="p-3.5 bg-purple-50/70 border-x border-purple-200 font-bold text-purple-900 text-center">
                                {displayedItems.length} items evaluated
                              </td>
                              <td className="p-3.5 bg-rose-50/70 border-x border-rose-200 font-black text-rose-950">
                                {totalExpiredUnitsCondemn > 0 ? `${totalExpiredUnitsCondemn} units` : '0 units'}
                              </td>
                              <td></td>
                              <td className="p-3.5 text-right font-black text-rose-800 text-sm">
                                {totalEstimatedLoss > 0 ? `₹${totalEstimatedLoss.toFixed(2)}` : '—'}
                              </td>
                              <td className="print:hidden"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Printable Official Signatures Block (Visible ONLY during print) */}
              <div className="hidden print:grid grid-cols-3 gap-8 pt-16 pb-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Surveyed & Verified by (Storekeeper)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Signature & Date</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Food Safety Inspector / Medical Officer
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Condemnation Certificate & Stamp</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-2 font-bold text-slate-800">
                    Sanctioned by (Quartermaster / CO)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Official Written Off Seal</div>
                </div>
              </div>
            </div>
          )}
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



      {/* MODAL 2: RAISE STOCK DEMAND / INDENT (REFLECTS INTO DEMAND CONSOLE) */}
      {showStockModal && selectedStockItem && (() => {
        const qtyNum = parseInt(stockQty, 10) || 0;
        const rateNum = stockRate !== '' ? parseFloat(stockRate) || 0 : Number(selectedStockItem.unit_price || 0);
        const gstNum = stockGst !== '' ? parseFloat(stockGst) || 0 : (selectedStockItem.default_gst_rate !== undefined ? Number(selectedStockItem.default_gst_rate) : 5.0);
        const oldRate = Number(selectedStockItem.unit_price || 0);
        const rateDiff = stockRate !== '' ? rateNum - oldRate : 0;
        const subtotal = qtyNum * rateNum;
        const totalEstimatedAmount = subtotal + (subtotal * (gstNum / 100));
        const newBalance = (selectedStockItem.current_stock || 0) + qtyNum;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-amber-600" />
                    Raise Stock Demand / Indent
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item: <strong className="text-slate-800">{selectedStockItem.item_name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Current Store Status Banner */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/40 rounded-xl border border-amber-200 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-800">Current Store Stock</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {selectedStockItem.current_stock || 0} {selectedStockItem.unit_of_measure}s
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-800">Current Approved Rate</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    ₹{oldRate.toFixed(2)}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitStockIn} className="space-y-3.5 text-xs">
                {/* Demand Quantity & Target Expiry */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Demand Quantity (Units) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={stockQty}
                      onChange={e => setStockQty(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Target Shelf-Life Expiry
                    </label>
                    <input
                      type="date"
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      value={stockExpiryDate}
                      onChange={e => setStockExpiryDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Rate & GST */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold">Rate (₹) / Unit</label>
                      {rateDiff !== 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          rateDiff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {rateDiff > 0 ? `+₹${rateDiff.toFixed(2)}` : `-₹${Math.abs(rateDiff).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={stockRate}
                      onChange={e => setStockRate(e.target.value)}
                      placeholder={`₹${oldRate.toFixed(2)}`}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      GST Tax Rate %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={stockGst}
                      onChange={e => setStockGst(e.target.value)}
                      placeholder="5.0"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Demand Requisition Notes / Indent Remarks
                  </label>
                  <input
                    type="text"
                    value={stockNotes}
                    onChange={e => setStockNotes(e.target.value)}
                    placeholder="e.g. Regular vendor restock demand"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Projected Demand Valuation Preview */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Demand Valuation (Inc. GST):</span>
                    <span className="font-black text-slate-900">₹{totalEstimatedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>New Balance after Fulfillment:</span>
                    <span className="font-black text-emerald-700">{newBalance} {selectedStockItem.unit_of_measure}s</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowStockModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Place Demand
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: ITEM HISTORY & FLOW LEDGER (TOTAL FLOW IN, TOTAL FLOW OUT, TRANSACTIONS) */}
      {showLogsModal && selectedLogsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={getItemPhoto(selectedLogsItem.item_name, selectedLogsItem.image_url)}
                  alt={selectedLogsItem.item_name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/items/samosa.jpg';
                  }}
                />
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Item Stock Flow History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item: <strong className="text-slate-800">{selectedLogsItem.item_name}</strong> | Rate: <strong className="text-slate-800">₹{Number(selectedLogsItem.unit_price || 0).toFixed(2)}</strong> | Unit: <strong className="text-slate-800">{selectedLogsItem.unit_of_measure}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOTAL FLOW IN / FLOW OUT KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. TOTAL FLOW IN */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  <span>TOTAL FLOW IN</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-xl font-black text-emerald-950 mt-1">
                  +{logsFlowMetrics.total_flow_in}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                  {selectedLogsItem.unit_of_measure}s received (all time)
                </div>
              </div>

              {/* 2. TOTAL FLOW OUT */}
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between text-rose-800 text-[10px] font-black uppercase tracking-wider">
                  <span>TOTAL FLOW OUT</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                </div>
                <div className="text-xl font-black text-rose-950 mt-1">
                  -{logsFlowMetrics.total_flow_out}
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5 font-medium">
                  {selectedLogsItem.unit_of_measure}s consumed / out
                </div>
              </div>

              {/* 3. CURRENT LIVE BALANCE */}
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                  <span>NET STORE BALANCE</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                </div>
                <div className="text-xl font-black text-indigo-950 mt-1">
                  {logsFlowMetrics.current_stock}
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                  In Stock ({selectedLogsItem.unit_of_measure}s)
                </div>
              </div>

              {/* 4. TOTAL WASTAGE / EXPIRED */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  <span>TOTAL WASTAGE</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                </div>
                <div className="text-xl font-black text-amber-950 mt-1">
                  {logsFlowMetrics.total_wastage}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                  Expired / Damaged write-offs
                </div>
              </div>
            </div>

            {/* Complete Transaction Table */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
              {loadingLogs ? (
                <div className="p-12 text-center text-slate-400 text-xs">Loading item transaction history...</div>
              ) : stockLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No stock movements recorded yet for this item.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Movement Type</th>
                      <th className="p-2.5">Order / Ref #</th>
                      <th className="p-2.5 text-center">Flow Quantity</th>
                      <th className="p-2.5 text-right">Balance After</th>
                      <th className="p-2.5">Officer / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockLogs.map((log) => {
                      const isStockIn = log.change_type === 'STOCK_IN' || log.log_type === 'STOCK_IN';
                      const isWastage = log.log_type === 'WASTAGE' || log.log_type === 'EXPIRED' || log.log_type === 'DAMAGE';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>

                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block ${
                                isStockIn
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isWastage
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {log.log_type || (isStockIn ? 'STOCK_IN' : 'STOCK_OUT')}
                            </span>
                          </td>

                          <td className="p-2.5 font-mono text-[10px] text-slate-700 font-bold">
                            {log.reference_no || (log.indent_id ? `IND-${log.indent_id}` : 'DIRECT')}
                          </td>

                          <td className="p-2.5 text-center">
                            <span
                              className={`font-black text-xs ${
                                isStockIn ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isStockIn ? `+${log.quantity}` : `-${log.quantity}`} {selectedLogsItem.unit_of_measure}s
                            </span>
                          </td>

                          <td className="p-2.5 text-right font-black text-slate-900">
                            {log.balance_after}
                          </td>

                          <td className="p-2.5">
                            <div className="text-[11px] text-slate-800 font-medium">{log.notes || '—'}</div>
                            {log.added_by_name && (
                              <div className="text-[9px] text-slate-400 mt-0.5">By: {log.added_by_name}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                Showing all chronological stock flow events for this item.
              </span>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STOCK OUT / DISPOSAL THROUGH PROPER CHANNEL */}
      {showStockOutModal && selectedStockOutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                    Stock Out / Disposal Through Proper Channel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item: <strong className="text-slate-800">{selectedStockOutItem.item_name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStockOutModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stockOutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {stockOutError}
              </div>
            )}

            {/* Current Balance Bar */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Current Bal Stock</span>
                <span className="text-base font-black text-slate-900">
                  {selectedStockOutItem.current_stock || 0} {selectedStockOutItem.unit_of_measure}s
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Batch Expiry</span>
                <span className={`text-xs font-bold ${selectedStockOutItem.is_expired ? 'text-rose-600' : 'text-slate-700'}`}>
                  {selectedStockOutItem.expiry_date || 'No Expiry Set'}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitStockOut} className="space-y-3.5 text-xs">
              {/* Disposal Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Disposal / Write-Off Reason *
                </label>
                <select
                  value={stockOutReason}
                  onChange={(e) => setStockOutReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                >
                  <option value="EXPIRED">EXPIRED - Past Shelf-Life / Use-By Date</option>
                  <option value="DAMAGE">DAMAGE - Transit Breakage / Packaging Ruptured</option>
                  <option value="WASTAGE">WASTAGE - Food Spoilage / Deterioration</option>
                  <option value="CONDEMNED">CONDEMNED - Quality Rejection by Inspection Board</option>
                  <option value="SPECIAL_ISSUE">SPECIAL ISSUE - Authorized Emergency Protocol Dispatch</option>
                </select>
              </div>

              {/* Sanction Ref No & Quantity in 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Proper Channel Ref / Order # *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockOutRefNo}
                    onChange={(e) => setStockOutRefNo(e.target.value)}
                    placeholder="e.g. SURV/2026/042"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Board Order / Certificate No.</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantity to Out *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedStockOutItem.current_stock || 1}
                    required
                    value={stockOutQty}
                    onChange={(e) => setStockOutQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xs focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Max: {selectedStockOutItem.current_stock || 0} {selectedStockOutItem.unit_of_measure}s
                  </span>
                </div>
              </div>

              {/* Date & Authorizing Officer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Disposal Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={stockOutDate}
                    onChange={(e) => setStockOutDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Authorized Officer *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockOutOfficer}
                    onChange={(e) => setStockOutOfficer(e.target.value)}
                    placeholder="e.g. Capt. Sharma (Quartermaster)"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Remarks / Justification */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Board Remarks & Disposal Proceedings Justification
                </label>
                <textarea
                  rows="2"
                  value={stockOutNotes}
                  onChange={(e) => setStockOutNotes(e.target.value)}
                  placeholder="Official notes: reason for condemnation, disposal method, board members..."
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              {/* Projected Balance preview */}
              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs font-semibold text-rose-950">
                <span>Balance After Stock Out:</span>
                <span className="font-black text-rose-700 text-sm">
                  {Math.max(0, (selectedStockOutItem.current_stock || 0) - (parseInt(stockOutQty, 10) || 0))}{' '}
                  {selectedStockOutItem.unit_of_measure}s
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStockOutModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStockOut || (parseInt(stockOutQty, 10) || 0) <= 0}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {submittingStockOut ? 'Processing Stock Out...' : 'Sanction & Process Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
