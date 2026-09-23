import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Building2,
  School,
  ShoppingBag,
  FileCheck,
  BarChart3,
  LogOut,
  UserCheck,
  PlusCircle,
  FileText,
  Clock,
  Layers,
  History,
  Sun,
  Settings,
  Truck,
  Receipt,
  ClipboardList,
  Monitor,
  Smartphone,
  Navigation
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useSSE } from '../context/SSEContext';

export default function Layout({ children }) {
  const { user, token, logout, loginAsDemoRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { events } = useSSE();
  const location = useLocation();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [billNoticeCount, setBillNoticeCount] = useState(0);
  const [supplyPointCount, setSupplyPointCount] = useState(0);
  const [adminDemandsCount, setAdminDemandsCount] = useState(0);
  const [fleetDeliveryCount, setFleetDeliveryCount] = useState(0);
  const [documentationCount, setDocumentationCount] = useState(0);
  const [unitReviewCount, setUnitReviewCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-detect and manual toggle state for Laptop (PC) vs Mobile View
  const [isMobileView, setIsMobileView] = useState(() => {
    try {
      const saved = localStorage.getItem('ncc_view_mode');
      if (saved) return saved === 'mobile';
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      }
    } catch (e) {}
    return false;
  });

  // Listen to screen resize if user hasn't explicitly overridden view
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('ncc_view_mode');
      if (!saved && typeof window !== 'undefined') {
        setIsMobileView(window.innerWidth < 768);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDeviceView = (targetMode) => {
    const toMobile = targetMode !== undefined ? targetMode : !isMobileView;
    setIsMobileView(toMobile);
    try {
      localStorage.setItem('ncc_view_mode', toMobile ? 'mobile' : 'desktop');
    } catch (e) {}
  };

  // Track badges cleared by user click or visit until new counts arrive (like notification bell)
  const [clearedBadges, setClearedBadges] = useState(() => {
    try {
      const saved = localStorage.getItem('cleared_nav_badges') || sessionStorage.getItem('cleared_nav_badges');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const getRawBadgeCount = (path) => {
    if (path === '/dashboard' && user?.role === 'ADMIN') return adminDemandsCount;
    if (path === '/approved-demands') return supplyPointCount;
    if (path === '/delivery') return fleetDeliveryCount;
    if (path === '/documentation') return documentationCount;
    if (path === '/review-demands') return unitReviewCount;
    if (path === '/bills') return billNoticeCount;
    return 0;
  };

  const handleClearBadge = (path, e) => {
    if (e) {
      e.stopPropagation();
    }
    const currentCount = getRawBadgeCount(path);
    setClearedBadges(prev => {
      const updated = {
        ...prev,
        [path]: { clearedAt: Date.now(), count: currentCount }
      };
      try {
        localStorage.setItem('cleared_nav_badges', JSON.stringify(updated));
        sessionStorage.setItem('cleared_nav_badges', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // Automatically turn off badge once user is checking / visiting the page (like a notification)
  useEffect(() => {
    if (location.pathname === '/bills' && billNoticeCount > 0) {
      handleClearBadge('/bills');
    } else if (location.pathname === '/approved-demands' && supplyPointCount > 0) {
      handleClearBadge('/approved-demands');
    } else if (location.pathname === '/review-demands' && unitReviewCount > 0) {
      handleClearBadge('/review-demands');
    } else if (location.pathname === '/dashboard' && user?.role === 'ADMIN' && adminDemandsCount > 0) {
      handleClearBadge('/dashboard');
    } else if (location.pathname === '/delivery' && fleetDeliveryCount > 0) {
      handleClearBadge('/delivery');
    } else if (location.pathname === '/documentation' && documentationCount > 0) {
      handleClearBadge('/documentation');
    }
  }, [location.pathname, billNoticeCount, supplyPointCount, unitReviewCount, adminDemandsCount, fleetDeliveryCount, documentationCount, user?.role]);

  const handleRoleSwitch = async (role) => {
    setSwitching(true);
    try {
      await loginAsDemoRole(role);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const role = user?.role || 'INSTITUTION';

  const navItems = {
    ADMIN: [
      { path: '/dashboard', label: 'Demands', icon: BarChart3 },
      { path: '/approved-demands', label: 'Supply Point', icon: Truck },
      { path: '/delivery', label: 'Fleet Delivery', icon: Truck },
      { path: '/admin/delivery-tracking', label: 'Live Tracking', icon: Navigation },
      { path: '/documentation', label: 'Documentation', icon: FileCheck },
      { path: '/reports', label: 'Reports & Analytics', icon: Layers },
      { path: '/inventory', label: 'Inventory', icon: ClipboardList },
      { path: '/bill-collection', label: 'Bill Collection', icon: Receipt }
    ],
    UNIT: [
      { path: '/dashboard', label: 'Unit Dashboard', icon: BarChart3 },
      { path: '/unit-demand', label: 'Refreshment Demand', icon: ShoppingBag },
      { path: '/institutions', label: 'Institutions & Vacancy', icon: School },
      { path: '/review-demands', label: 'Review Demands Queue', icon: FileCheck },
      { path: '/reports', label: 'Reports & Analytics', icon: Layers }
    ],
    INSTITUTION: [
      { path: '/dashboard', label: 'Refreshment Demand', icon: ShoppingBag },
      { path: '/demand-history', label: 'Demand History', icon: History },
      { path: '/summary', label: 'Weekly / Monthly Summary', icon: BarChart3 },
      { path: '/school-summary', label: 'School Annual Summary', icon: Layers },
      { path: '/bills', label: 'Bill Submission', icon: Receipt }
    ],
    DELIVERY: [
      { path: '/dashboard', label: 'My Route & Packets', icon: Truck },
      { path: '/driver-summary', label: 'Delivery Summary', icon: ClipboardList }
    ]
  };

  const mobileNavItems = {
    ADMIN: [
      { path: '/dashboard', label: 'Overview', icon: BarChart3 },
      { path: '/approved-demands', label: 'Supply', icon: Truck },
      { path: '/delivery', label: 'Fleet', icon: Truck },
      { path: '/admin/delivery-tracking', label: 'Live', icon: Navigation },
      { path: '/inventory', label: 'Inventory', icon: ClipboardList },
      { path: '/bill-collection', label: 'Bills', icon: Receipt },
      { path: '/reports', label: 'Reports', icon: Layers }
    ],
    UNIT: [
      { path: '/dashboard', label: 'Home', icon: BarChart3 },
      { path: '/unit-demand', label: 'Demand', icon: ShoppingBag },
      { path: '/review-demands', label: 'Review', icon: FileCheck },
      { path: '/institutions', label: 'Institutes', icon: School },
      { path: '/reports', label: 'Reports', icon: Layers }
    ],
    INSTITUTION: [
      { path: '/dashboard', label: 'Demand', icon: ShoppingBag },
      { path: '/demand-history', label: 'History', icon: History },
      { path: '/bills', label: 'Bills', icon: Receipt },
      { path: '/summary', label: 'Summary', icon: BarChart3 },
      { path: '/school-summary', label: 'Annual', icon: Layers }
    ],
    DELIVERY: [
      { path: '/dashboard', label: 'My Route', icon: Truck },
      { path: '/driver-summary', label: 'Summary', icon: ClipboardList },
      { path: '/settings', label: 'Account', icon: Settings }
    ]
  };

  const itemColorStyles = {
    '/dashboard': {
      active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border-blue-600',
      inactive: 'text-blue-950 hover:text-blue-700 hover:bg-blue-50/90 border-blue-200/80 hover:border-blue-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-blue-600 group-hover:scale-110'
    },
    '/unit-demand': {
      active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border-blue-600',
      inactive: 'text-blue-950 hover:text-blue-700 hover:bg-blue-50/90 border-blue-200/80 hover:border-blue-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-blue-600 group-hover:scale-110'
    },
    '/driver-summary': {
      active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 border-emerald-600',
      inactive: 'text-emerald-950 hover:text-emerald-700 hover:bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-emerald-600 group-hover:scale-110'
    },
    '/demand-history': {
      active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 border-emerald-600',
      inactive: 'text-emerald-950 hover:text-emerald-700 hover:bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-emerald-600 group-hover:scale-110'
    },
    '/summary': {
      active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 border-amber-500',
      inactive: 'text-amber-950 hover:text-amber-700 hover:bg-amber-50/90 border-amber-200/80 hover:border-amber-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-amber-600 group-hover:scale-110'
    },
    '/school-summary': {
      active: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30 border-purple-600',
      inactive: 'text-purple-950 hover:text-purple-700 hover:bg-purple-50/90 border-purple-200/80 hover:border-purple-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-purple-600 group-hover:scale-110'
    },
    '/bills': {
      active: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/30 border-rose-600',
      inactive: 'text-rose-950 hover:text-rose-700 hover:bg-rose-50/90 border-rose-200/80 hover:border-rose-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-rose-600 group-hover:scale-110'
    },
    '/approved-demands': {
      active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 border-emerald-600',
      inactive: 'text-emerald-950 hover:text-emerald-700 hover:bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-emerald-600 group-hover:scale-110'
    },
    '/delivery': {
      active: 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-500/30 border-cyan-600',
      inactive: 'text-cyan-950 hover:text-cyan-700 hover:bg-cyan-50/90 border-cyan-200/80 hover:border-cyan-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-cyan-600 group-hover:scale-110'
    },
    '/documentation': {
      active: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 border-indigo-600',
      inactive: 'text-indigo-950 hover:text-indigo-700 hover:bg-indigo-50/90 border-indigo-200/80 hover:border-indigo-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-indigo-600 group-hover:scale-110'
    },
    '/inventory': {
      active: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/30 border-teal-600',
      inactive: 'text-teal-950 hover:text-teal-700 hover:bg-teal-50/90 border-teal-200/80 hover:border-teal-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-teal-600 group-hover:scale-110'
    },

    '/institutions': {
      active: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 border-indigo-600',
      inactive: 'text-indigo-950 hover:text-indigo-700 hover:bg-indigo-50/90 border-indigo-200/80 hover:border-indigo-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-indigo-600 group-hover:scale-110'
    },
    '/review-demands': {
      active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 border-amber-500',
      inactive: 'text-amber-950 hover:text-amber-700 hover:bg-amber-50/90 border-amber-200/80 hover:border-amber-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-amber-600 group-hover:scale-110'
    },
    '/reports': {
      active: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/30 border-violet-600',
      inactive: 'text-violet-950 hover:text-violet-700 hover:bg-violet-50/90 border-violet-200/80 hover:border-violet-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-violet-600 group-hover:scale-110'
    },
    '/bill-collection': {
      active: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30 border-rose-600',
      inactive: 'text-rose-950 hover:text-rose-700 hover:bg-rose-50/90 border-rose-200/80 hover:border-rose-400 bg-white/90',
      iconActive: 'text-white',
      iconInactive: 'text-rose-600 group-hover:scale-110'
    },
    '/settings': {
      active: 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/30 border-slate-900',
      inactive: 'text-slate-800 hover:text-slate-900 hover:bg-slate-100/90 border-slate-200/90 hover:border-slate-400 bg-white/90',
      iconActive: 'text-amber-400',
      iconInactive: 'text-slate-600 group-hover:scale-110'
    }
  };

  const currentNav = navItems[role] || [];

  const fetchBadgeCounts = async () => {
    if (!token) return;
    if (role === 'ADMIN') {
      try {
        const res = await fetch('/api/demands', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAdminDemandsCount(data.filter(d => d.status === 'APPROVED').length);
            setSupplyPointCount(data.filter(d => d.status === 'ACCEPTED' || d.status === 'PREPARING').length);
            setFleetDeliveryCount(data.filter(d => d.status === 'READY_FOR_DISPATCH').length);
            setDocumentationCount(data.filter(d => d.status === 'DELIVERED').length);
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else if (role === 'UNIT') {
      try {
        const res = await fetch('/api/demands?status=PENDING', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setUnitReviewCount(data.length);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
  }, [role, token, location.pathname]);

  useEffect(() => {
    if (events?.DEMAND_UPDATED || events?.NEW_NOTIFICATION) {
      fetchBadgeCounts();
      if (role === 'INSTITUTION' && token) {
        checkBillSchedules();
      }
    }
  }, [events?.DEMAND_UPDATED, events?.NEW_NOTIFICATION]);

  useEffect(() => {
    const handleStatusChange = () => {
      fetchBadgeCounts();
      if (role === 'INSTITUTION' && token) {
        checkBillSchedules();
      }
    };

    window.addEventListener('demand-status-changed', handleStatusChange);
    window.addEventListener('notification-received', handleStatusChange);
    return () => {
      window.removeEventListener('demand-status-changed', handleStatusChange);
      window.removeEventListener('notification-received', handleStatusChange);
    };
  }, [role, token]);

  useEffect(() => {
    if (role === 'INSTITUTION' && token) {
      checkBillSchedules();
    }
  }, [role, token, location.pathname]);

  const checkBillSchedules = async () => {
    try {
      const res = await fetch('/api/bill-collection/my-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const events = await res.json();
        if (Array.isArray(events)) {
          const activeOrDelayed = events.filter(e => e && (e.status === 'DELAYED' || e.status === 'SCHEDULED')).length;
          setBillNoticeCount(activeOrDelayed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getConsoleMeta = () => {
    switch (role) {
      case 'ADMIN':
        return {
          badgeLabel: 'HQ Vendor Admin',
          badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200/90',
          dotStyle: 'bg-amber-500',
          subTitle: 'State Refreshment Supply Point',
          jurisdiction: ''
        };
      case 'UNIT':
        return {
          badgeLabel: 'Unit Command Console',
          badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200/90',
          dotStyle: 'bg-blue-500',
          subTitle: user?.unit_name || '2 DELHI ARTY BTY NCC',
          jurisdiction: 'Group C • Delhi'
        };
      case 'INSTITUTION':
        return {
          badgeLabel: 'ANO / Institution Portal',
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
          dotStyle: 'bg-emerald-500',
          subTitle: user?.institution_name || 'APS SHANKAR VIHAR',
          jurisdiction: 'Under 2 Delhi Arty Bty'
        };
      case 'DELIVERY':
        return {
          badgeLabel: 'Fleet Delivery Console',
          badgeStyle: 'bg-cyan-50 text-cyan-800 border-cyan-200/90',
          dotStyle: 'bg-cyan-500',
          subTitle: user?.name || 'Driver Route Management',
          jurisdiction: 'Live GPS & Route Deliveries'
        };
      default:
        return {
          badgeLabel: role,
          badgeStyle: 'bg-slate-50 text-slate-700 border-slate-200',
          dotStyle: 'bg-slate-400',
          subTitle: 'Refreshment System',
          jurisdiction: ''
        };
    }
  };

  const consoleMeta = getConsoleMeta();

  return (
    <div className={`flex flex-col bg-[#F8FAFC] text-slate-900 font-sans antialiased ${
      isMobileView
        ? 'fixed inset-0 h-[100dvh] w-full overflow-hidden'
        : 'min-h-screen w-full'
    }`}>
      {/* Top Header - Unified Professional Military / Institutional Government Grade */}
      <header className="shrink-0 z-40 bg-white border-b border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] print:hidden max-w-full">
        {/* Tier 1: Identity, Console Details, Right-aligned Temp Demo & Account */}
        <div className="w-full px-2.5 sm:px-6 lg:px-8 xl:px-10 max-w-full">
          <div className="min-h-[3.75rem] sm:min-h-[4.5rem] py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4 max-w-full">

            {/* Left: Emblem + System Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-slate-200 shadow-xs shrink-0 flex items-center justify-center bg-[#0d5ea6] transition-transform hover:scale-105 duration-200">
                <img src="/logo.png" alt="Flavour Base Logo" className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col min-w-0">
                <h1 className="font-extrabold text-xs sm:text-base tracking-tight text-slate-900 leading-none truncate">
                  NCC REFRESHMENT SYSTEM
                </h1>
              </div>
            </div>

            {/* Center: Main Navigation (Visible in Laptop/PC View) */}
            {!isMobileView && (
              <nav className="hidden lg:flex items-center justify-center gap-1.5 xl:gap-2.5 mx-4 flex-1">
                {(Array.isArray(currentNav) ? currentNav : []).map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    (item.path === '/dashboard' && location.pathname === '/') ||
                    (item.path === '/demand-history' && location.pathname === '/my-demands');
                  const isSupplyPoint = item.path === '/approved-demands';
                  const isReviewQueue = item.path === '/review-demands';
                  const isBills = item.path === '/bills';
                  const rawBadgeCount = isSupplyPoint ? supplyPointCount : (isReviewQueue ? unitReviewCount : (isBills ? billNoticeCount : 0));

                  const clearedInfo = clearedBadges[item.path];
                  let isCleared = false;
                  if (clearedInfo) {
                    if (typeof clearedInfo === 'object' && clearedInfo.count !== undefined) {
                      isCleared = rawBadgeCount <= clearedInfo.count;
                    } else {
                      isCleared = true;
                    }
                  }
                  const badgeCount = isCleared ? 0 : rawBadgeCount;

                  const colorConfig = itemColorStyles[item.path] || {
                    active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border-blue-600 font-bold',
                    inactive: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90 border-slate-200 bg-white/90',
                    iconActive: 'text-white',
                    iconInactive: 'text-slate-500 group-hover:scale-110'
                  };

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleClearBadge(item.path)}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-[11px] xl:text-xs font-bold border transition-all duration-200 shrink-0 ${isActive ? colorConfig.active : colorConfig.inactive
                        }`}
                    >
                      {Icon && (
                        <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isActive ? colorConfig.iconActive : colorConfig.iconInactive
                          }`} />
                      )}
                      <span className="tracking-tight">{item.label}</span>
                      {badgeCount > 0 && (
                        <span
                          onClick={(e) => handleClearBadge(item.path, e)}
                          title="Click to clear badge"
                          className={`px-1.5 py-0.5 text-[9px] font-black rounded-full leading-none shadow-xs animate-pulse cursor-pointer hover:opacity-80 transition-opacity ${
                            isActive ? 'bg-white text-rose-600 ring-1 ring-white/60' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right: Actions, AD Profile Menu & Device Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Notification Bell */}
              <NotificationBell />

              {/* AD Profile Avatar & Menu (Contains App Settings & Logout) */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer ring-2 ring-blue-500/20"
                  title="Account & Settings"
                >
                  {role === 'ADMIN' ? 'AD' : (role === 'UNIT' ? 'UN' : (role === 'INSTITUTION' ? 'IN' : 'AD'))}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">ID: {user?.login_id || user?.email || 'ADMIN'}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>App Settings</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PC / Mobile Icons Only on Right Corner */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-xs" title="Device View">
                <button
                  type="button"
                  onClick={() => toggleDeviceView(false)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    !isMobileView
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Laptop / Desktop PC View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleDeviceView(true)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isMobileView
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Mobile Phone View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Main Content Area - Full Width Fluid Canvas */}
      <main className={`flex-1 w-full bg-[#F8FAFC] ${
        isMobileView
          ? 'overflow-y-auto overflow-x-hidden pt-3 pb-6 px-3 sm:px-4'
          : 'py-5 px-4 sm:px-6 lg:px-8 xl:px-10'
      } print:p-0 print:m-0 print:bg-white print:overflow-visible`}>
        <div className="w-full space-y-6 print:space-y-0">
          {children}
        </div>
      </main>

      {/* Frozen Bottom Navigation Dock for Mobile View with Small Fonts */}
      {isMobileView && (
        <div
          className="shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-1.5 shadow-[0_-3px_12px_rgba(0,0,0,0.07)] z-50 print:hidden"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
        >
          <nav className="flex items-center justify-around w-full max-w-md mx-auto gap-0.5">
            {(Array.isArray(mobileNavItems[role] || currentNav) ? (mobileNavItems[role] || currentNav) : []).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/') ||
                (item.path === '/demand-history' && location.pathname === '/my-demands');
              const isSupplyPoint = item.path === '/approved-demands';
              const isReviewQueue = item.path === '/review-demands';
              const isBills = item.path === '/bills';
              const rawBadgeCount = isSupplyPoint ? supplyPointCount : (isReviewQueue ? unitReviewCount : (isBills ? billNoticeCount : 0));
              const clearedInfo = clearedBadges[item.path];
              const isCleared = clearedInfo ? (typeof clearedInfo === 'object' && clearedInfo.count !== undefined ? rawBadgeCount <= clearedInfo.count : true) : false;
              const badgeCount = isCleared ? 0 : rawBadgeCount;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleClearBadge(item.path)}
                  className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'text-blue-600 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold bg-rose-500 text-white rounded-full leading-none py-0.5 animate-pulse">
                        {badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight text-center leading-tight mt-1 truncate max-w-full">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
