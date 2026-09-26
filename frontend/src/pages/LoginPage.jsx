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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Forgot Password Dialog State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password Dialog, 4: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [loginIdForOtp, setLoginIdForOtp] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [emailSent, setEmailSent] = useState(true);

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

  useEffect(() => {
    let interval;
    if (showForgotModal && forgotStep === 2 && forgotResendTimer > 0) {
      interval = setInterval(() => {
        setForgotResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showForgotModal, forgotStep, forgotResendTimer]);

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

  const maskEmail = (emailStr) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr || '';
    if (emailStr.includes('******')) return emailStr;
    const [localPart, domain] = emailStr.split('@');
    if (localPart.length <= 3) {
      return `${localPart[0]}******@${domain}`;
    }
    const prefix = localPart.slice(0, 2);
    const suffix = localPart.slice(-2);
    return `${prefix}******${suffix}@${domain}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password, selectedRole);
      if (res && res.requires_otp) {
        setLoginIdForOtp(res.login_id);
        setTargetEmail(res.email || email.trim());
        setEmailSent(res.email_sent !== false);
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

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password, selectedRole);
      if (res && res.requires_otp) {
        setTargetEmail(res.email || email.trim());
        setResendTimer(60);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your registered email address or Login ID.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      setForgotMaskedEmail(data.email || forgotEmail.trim());
      setForgotStep(2);
      setForgotResendTimer(60);
    } catch (err) {
      setForgotError(err.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the complete 6-digit OTP.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotEmail.trim(), otp: forgotOtp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP.');
      }
      setForgotStep(3); // Dialog box for New Password & Confirm Password
    } catch (err) {
      setForgotError(err.message || 'Verification failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    if (!forgotNewPassword) {
      setForgotError('Please enter your new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }
      setForgotStep(4); // Success step
    } catch (err) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setForgotLoading(false);
    }
  };

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

                  {/* Forgot Password directly down below Sign In button */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || '');
                        setForgotOtp('');
                        setForgotNewPassword('');
                        setForgotConfirmPassword('');
                        setForgotError('');
                        setForgotStep(1);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-blue-500/10 group"
                    >
                      <KeyRound className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                      <span>Forgot Password?</span>
                    </button>
                  </div>
                </form>
                )}

                {/* Step 3: OTP Verification */}
                {step === 3 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center mb-4 space-y-2.5">
                      <div className="mx-auto w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-1 shadow-inner">
                        <Mail className="w-6 h-6" />
                      </div>
                      <h3 className="text-white font-bold text-lg tracking-tight">Two-Factor Authentication</h3>
                      
                      {/* Prominently mention the recipient email on top */}
                      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-400/30 text-xs text-left space-y-1">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>OTP Sent To Registered Email:</span>
                        </div>
                        <div className="font-mono font-black text-sm text-blue-300 break-all">
                          {maskEmail(targetEmail) || 'your registered email'}
                        </div>
                      </div>

                      <p className="text-slate-400 text-xs leading-relaxed pt-1">
                        Please enter the 6-digit code sent to your email. (Be sure to check your <strong>Inbox</strong> as well as <strong>Spam / Junk</strong> folder).
                      </p>
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
              onClick={() => {
                setForgotEmail(email || '');
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setForgotError('');
                setForgotStep(1);
                setShowForgotModal(true);
              }}
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
                  Unit Headquarters
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
                  Toll-Free: 1800-266-7890
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
      {/* ========================================================================= */}
      {/* FORGOT PASSWORD INTERACTIVE MODAL (OTP & RESET DIALOG BOX) */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-7 shadow-2xl text-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Forgot Password</h3>
                  <p className="text-xs text-slate-400">
                    {forgotStep === 1 && 'Step 1 of 3: Registered Account Email'}
                    {forgotStep === 2 && 'Step 2 of 3: Email OTP Verification'}
                    {forgotStep === 3 && 'Step 3 of 3: Set New Password'}
                    {forgotStep === 4 && 'Complete: Password Updated'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message inside modal */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Enter Registered Email Address */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Registered Email Address or Login ID
                  </label>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Enter your registered email address. We will verify your account and send a 6-digit verification code.
                  </p>
                  <div className="relative pt-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 pt-1 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotError('');
                      }}
                      placeholder="e.g. officer@ncc.gov.in or Login ID"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>SEND OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-400/30 text-xs text-left space-y-1">
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Verification Code Sent To:</span>
                    </div>
                    <div className="font-mono font-black text-sm text-blue-300 break-all">
                      {forgotMaskedEmail}
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Please enter the 6-digit code sent to your email inbox (or spam folder).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 block text-center">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => {
                      setForgotOtp(e.target.value.replace(/\D/g, ''));
                      setForgotError('');
                    }}
                    placeholder="000000"
                    className="w-full px-3 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 font-mono shadow-inner"
                  />
                </div>

                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={forgotResendTimer > 0 || forgotLoading}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer"
                  >
                    {forgotResendTimer > 0 ? `Resend OTP in ${forgotResendTimer}s` : 'Resend OTP'}
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length !== 6}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>VERIFY OTP</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Dialog Box for New Password & Confirm New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>OTP verified successfully! Please choose your new password.</span>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
                    New Security Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={forgotNewPassword}
                      onChange={(e) => {
                        setForgotNewPassword(e.target.value);
                        setForgotError('');
                      }}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => {
                        setForgotConfirmPassword(e.target.value);
                        setForgotError('');
                      }}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {forgotConfirmPassword && (
                    <div className="mt-1.5 text-[11px] font-semibold flex items-center gap-1.5">
                      {forgotNewPassword === forgotConfirmPassword ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotNewPassword || forgotNewPassword !== forgotConfirmPassword}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <span>UPDATE PASSWORD</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success Confirmation */}
            {forgotStep === 4 && (
              <div className="text-center space-y-4 py-3">
                <div className="mx-auto w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-extrabold text-lg">Password Updated!</h4>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-sm mx-auto">
                    Your password has been changed successfully. An email containing your <strong>Login ID</strong> and <strong>New Password</strong> has been delivered to your inbox.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-400/20 text-xs text-left space-y-1">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Account Credentials</div>
                  <div className="text-white font-mono text-xs">
                    Login ID: <strong className="text-blue-300">{forgotEmail}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(forgotEmail);
                    setPassword('');
                    setShowForgotModal(false);
                    setStep(2); // take user to sign-in form
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
