import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Building2,
  School,
  Truck,
  Sparkles,
  Lock,
  PhoneCall,
  HelpCircle,
  AlertTriangle,
  BadgeCheck,
  Clock,
  Zap,
  MapPin,
  ChevronRight,
  ChevronDown,
  X,
  FileText
} from 'lucide-react';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('ANO'); // ANO, UNIT, ADMIN, DELIVERY
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ADMIN, UNIT, ANO, DELIVERY
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [loginIdForOtp, setLoginIdForOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const { login, verifyOtp, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Clear any existing session when landing on login page
    if (logout) {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    let interval;
    if (step === 3 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleKeyUp = (e) => {
    if (e.getModifierState && !e.getModifierState('CapsLock')) {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password, selectedRole);
      if (res && res.requires_otp) {
        setLoginIdForOtp(res.login_id);
        if (res.otp) setOtp(res.otp);
        setStep(3);
        setResendTimer(60);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your login details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(loginIdForOtp, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = async (demoEmail, demoPass, targetRole) => {
    const roleKey = targetRole === 'INSTITUTION' ? 'ANO' : targetRole;
    setSelectedRole(roleKey);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      const res = await login(demoEmail, demoPass, roleKey);
      if (res && res.requires_otp) {
        setLoginIdForOtp(res.login_id);
        if (res.otp) setOtp(res.otp);
        setStep(3);
        setResendTimer(60);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password, selectedRole);
      if (res && res.requires_otp) {
        setResendTimer(60);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    {
      id: 'ADMIN',
      title: 'Vendor',
      email: 'ADMIN',
      pass: 'Admin@123',
      subtitle: 'Central Operations • ID: ADMIN • Dispatch & Bill Verification',
      roleTag: 'Vendor',
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/40 hover:border-amber-400',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      icon: Building2,
      accent: '#f59e0b'
    },
    {
      id: 'UNIT',
      title: 'NCC',
      email: '2DABNCC',
      pass: 'Unit@123',
      subtitle: '2 Delhi Arty Bty • ID: 2DABNCC • Quotas & Demands',
      roleTag: 'NCC',
      color: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-500/40 hover:border-blue-400',
      text: 'text-blue-400',
      badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      icon: Shield,
      accent: '#3b82f6'
    },
    {
      id: 'ANO',
      originalRole: 'INSTITUTION',
      title: 'Institute',
      email: 'APS_SV',
      pass: 'Inst@123',
      subtitle: 'APS Shankar Vihar • ID: APS_SV • Roll Calls & Demands',
      roleTag: 'Institute',
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      icon: School,
      accent: '#10b981'
    },
    {
      id: 'DELIVERY',
      title: 'Driver',
      email: '9876543210',
      pass: 'Driver@123',
      subtitle: 'Rajesh Kumar • ID: 9876543210 • Live Delivery Route',
      roleTag: 'Driver',
      color: 'from-cyan-500/20 to-sky-500/20',
      border: 'border-cyan-500/40 hover:border-cyan-400',
      text: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      icon: Truck,
      accent: '#06b6d4'
    }
  ];

  const filteredRoles = activeTab === 'ALL' ? demoRoles : demoRoles.filter(r => r.id === activeTab);

  return (
    <div className="min-h-screen bg-[#070e1a] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* ========================================================================= */}
      {/* ARTISTIC LIVING BACKGROUND CANVAS: Multi-layered Aurora Orbs & Grid Mesh */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep background ambient mesh */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-blue-700/35 to-indigo-600/25 rounded-full blur-[120px] animate-aurora-1"></div>
        <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] bg-gradient-to-br from-amber-500/25 via-yellow-400/20 to-orange-600/20 rounded-full blur-[130px] animate-aurora-2"></div>
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-gradient-to-tl from-emerald-600/25 via-teal-500/20 to-cyan-500/25 rounded-full blur-[140px] animate-aurora-3"></div>
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-purple-600/15 to-pink-500/15 rounded-full blur-[100px]"></div>

        {/* Sophisticated Architectural Coordinate Dot Grid */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '36px 36px'
          }}
        ></div>

        {/* Diagonal Soft Atmospheric Light Beam */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,94,166,0.25),rgba(255,255,255,0))]"></div>
      </div>



      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN SPLIT: Brand & Artistry Showcase (Left) + Portal Card (Right) */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3.5 py-6 sm:py-8 md:py-10 max-w-5xl mx-auto w-full">
        
        {/* ========================================================================= */}
        {/* TOP CENTERPIECE: LOGO AND NAME AT TOP (Universal for Mobile & Desktop) */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8 space-y-3 sm:space-y-4 max-w-2xl w-full">
          
          {/* Logo with Multi-tone Ambient Halo */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-amber-400 to-emerald-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-blue-900/50 bg-[#0d5ea6] flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
              <img 
                src="/logo.png" 
                alt="Flavour Base India Logo" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>

          {/* Headline & Description */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              FLAVOUR BASE
              <span className="block bg-gradient-to-r from-blue-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
                INDIA LLP
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium max-w-xl mx-auto leading-relaxed pt-0.5">
              REFRESHMENT DEMAND AND SUPPLY PORTAL
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER: Ultra-Glassmorphism Sign-In Terminal Card */}
        {/* ========================================================================= */}
        <div className="w-full max-w-sm mx-auto mb-6">
          <div className="relative group">
            {/* Dynamic Aura Rim Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-amber-400 to-indigo-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-700 animate-pulse-border"></div>

            {/* Main Card Container */}
            <div className="relative rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 p-4 sm:p-5 shadow-2xl shadow-black/80 space-y-4">
                
                {/* Portal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-400" />
                      SIGN IN
                    </h2>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      SECURITY LEVEL
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      MAXIMUM
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3 animate-shake">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Login Form */}
                {/* Step 1: Select Role */}
                {step === 1 && (
                  <div className="space-y-4 animate-flip">
                    <div className="text-center mb-6 mt-2">
                      <h3 className="text-white font-bold text-lg">Select Your Role</h3>
                      <p className="text-slate-400 text-xs mt-1">Choose your portal access level to continue</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-1">
                      {[
                        { id: 'ANO', label: 'ANO', sub: 'INSTITUTE', color: 'emerald-400', icon: School },
                        { id: 'UNIT', label: 'UNIT', sub: 'NCC', color: 'blue-400', icon: Shield },
                        { id: 'ADMIN', label: 'ADMIN', sub: 'VENDOR', color: 'amber-400', icon: Building2 },
                        { id: 'DELIVERY', label: 'DELIVERY', sub: 'DRIVER', color: 'cyan-400', icon: Truck }
                      ].map((r) => {
                        const IconComp = r.icon;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedRole(r.id);
                              setError('');
                              setStep(2); // Go to credentials
                            }}
                            className={`p-4 rounded-2xl text-center transition-all duration-300 cursor-pointer border bg-slate-900/50 hover:bg-slate-800 border-white/10 hover:border-${r.color.split('-')[0]}-400 hover:shadow-lg hover:shadow-${r.color.split('-')[0]}-500/20 group flex flex-col items-center gap-3`}
                          >
                            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-slate-300 group-hover:text-white group-hover:scale-110 transition-transform">
                              <IconComp className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-200 tracking-wider leading-tight group-hover:text-white transition-colors">{r.label}</div>
                              <div className="text-[10px] text-slate-500 font-medium group-hover:text-slate-400 mt-0.5">{r.sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2: Credentials Form */}
                {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4 animate-flip">
                  <div className="flex items-center gap-3 mb-2 pb-2 border-b border-white/10">
                    <button 
                      type="button" 
                      onClick={() => { setStep(1); setError(''); }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Change Role"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Selected Role</div>
                      <div className="text-sm font-bold text-blue-400 tracking-wider">{selectedRole}</div>
                    </div>
                  </div>

                  {/* Login ID Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Login ID
                      </label>
                    </div>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-400 transition-colors">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ENTER YOUR ID"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Security Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-400 transition-colors">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyUp}
                        placeholder="ENTER PASSWORD"
                        className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 shadow-inner font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Caps Lock Alert */}
                    {capsLockActive && (
                      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold mt-1.5 px-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Caps Lock is ON</span>
                      </div>
                    )}
                  </div>

                  {/* Remember Me & Terms Acceptance */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500/40 cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs text-slate-300 font-medium">
                        Remember terminal session
                      </span>
                    </label>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      Encrypted Handshake
                    </span>
                  </div>

                  {/* Submit Action Button with Shimmer Gradient */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-400 active:scale-[0.98] border border-blue-400/30"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Authenticating Credentials...</span>
                      </div>
                    ) : (
                      <>
                        <span>SIGN IN</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                )}

                {/* Step 3: OTP Verification */}
                {step === 3 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="mx-auto w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2">
                        <Mail className="w-6 h-6" />
                      </div>
                      <h3 className="text-white font-bold">Two-Factor Authentication</h3>
                      <p className="text-slate-400 text-xs mt-1">We've sent a 6-digit OTP to your registered email.</p>
                      <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-slate-300">
                        <span>Emergency Backup Code:</span>
                        <button
                          type="button"
                          onClick={() => setOtp('123456')}
                          className="font-mono font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900/60 px-2 py-0.5 rounded cursor-pointer border border-emerald-500/30 transition-all hover:scale-105"
                          title="Click to fill backup OTP"
                        >
                          123456 (Click to Fill)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full px-3 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 shadow-inner font-mono"
                      />
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendTimer > 0 || loading}
                        className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors font-semibold"
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98]"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>Verifying OTP...</span>
                        </div>
                      ) : (
                        <>
                          <span>VERIFY & LOGIN</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setStep(2); setOtp(''); }}
                      className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Back to Login
                    </button>
                  </form>
                )}

                {/* ================================================================= */}
                {/* 1-CLICK INTERACTIVE DEMO LOGINS (COLLAPSIBLE TOGGLE) */}
                {/* ================================================================= */}
                <div className="pt-3.5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 text-left flex items-center justify-between transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                          1-Click Demo Credentials
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {showDemoCredentials ? 'Click to collapse demo presets' : 'Need quick test accounts? Click to reveal'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                      <span className="text-[11px] font-semibold">{showDemoCredentials ? 'Hide' : 'Show'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showDemoCredentials ? 'rotate-180 text-amber-400' : 'text-slate-400 group-hover:text-white'}`} />
                    </div>
                  </button>

                  {/* Collapsible Content: Only unhides when clicked */}
                  {showDemoCredentials && (
                    <div className="mt-3.5 space-y-3 animate-flip">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                          Select Role Preset
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Auto-fills & Signs in</span>
                      </div>

                      {/* Role Filter Tabs */}
                      <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-950/70 border border-white/10 text-[10px] font-bold">
                        {['ALL', 'ANO', 'UNIT', 'ADMIN', 'DELIVERY'].map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
                              activeTab === tab
                                ? 'bg-blue-600 text-white shadow-md font-extrabold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Role Cards List */}
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {filteredRoles.map((r) => {
                          const IconComp = r.icon;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleQuickFill(r.email, r.pass, r.id)}
                              className={`w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r ${r.color} border ${r.border} text-left flex items-center justify-between transition-all duration-200 hover:scale-[1.01] hover:shadow-lg cursor-pointer group`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/10 text-white shrink-0 group-hover:scale-110 transition-transform">
                                  <IconComp className={`w-4 h-4 ${r.text}`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-xs ${r.text}`}>
                                      {r.title}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${r.badgeBg}`}>
                                      {r.roleTag}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-300/80 truncate mt-0.5">
                                    {r.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 text-slate-400 group-hover:text-white shrink-0 pl-2">
                                <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                                  Log In
                                </span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>


        </main>

      {/* ========================================================================= */}
      {/* FOOTER: Official Directorate Notice & Helplines */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-3.5 border-t border-white/10 bg-slate-950/50 backdrop-blur-md text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>© 2026 Flavour Base India LLP. All Rights Reserved.</span>
            <span className="hidden md:inline text-slate-600 mx-2">|</span>
            <span className="text-slate-400 hidden md:inline">For Authorized Demand & Supply Operations Only.</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-white transition-colors cursor-pointer underline underline-offset-2"
            >
              Standard Operating Procedures (SOP)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-white transition-colors cursor-pointer underline underline-offset-2"
            >
              Reset Credentials
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* HELP & CREDENTIAL RESET MODAL */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-7 shadow-2xl text-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">System Support & Helplines</h3>
                  <p className="text-xs text-slate-400">Direct Command Assistance & Password Reset</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Unit Headquarters (2 Delhi Arty Bty)
                </div>
                <p className="text-slate-300">
                  For ANO credentials, institution registration, or quota amendments:
                </p>
                <div className="font-mono text-white font-bold">
                  Tel: +91 11-2569-4210 • Email: co2abncc@gmail.com
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Flavour Base India LLP (Vendor Operations)
                </div>
                <p className="text-slate-300">
                  For supply dispatch queries, delivery vehicle coordination, or billing vouchers:
                </p>
                <div className="font-mono text-white font-bold">
                  Toll-Free: 1800-266-7890 • Email: admin@ncc.gov.in
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/10 space-y-1">
                <div className="font-bold text-slate-200">How to Reset Forgotten Passwords</div>
                <p className="text-slate-400">
                  Institution ANOs must contact the Unit Admin officer to regenerate access tokens. HQ and Unit commanders can reset keys directly in the App Settings panel.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
