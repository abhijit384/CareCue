import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Mail,
  Lock,
  User as UserIcon,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/services/authClient';
import { useToast } from '@/contexts/ToastContext';
import { ThemeToggle } from '@/lib/theme';

export type AuthScreenMode = 'signup' | 'signin' | 'otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset';

export function checkPasswordRules(password: string) {
  return [
    { id: 'len', label: 'At least 8 characters', valid: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { id: 'num', label: 'One number (0-9)', valid: /[0-9]/.test(password) },
    { id: 'special', label: 'One special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`]/.test(password) },
    { id: 'spaces', label: 'No spaces', valid: password.length > 0 && !/\s/.test(password) },
  ];
}

export function AuthPage() {
  const { login, demoLogin, openOnboarding } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthScreenMode>('signup');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Direct Demo Sign In handler
  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setErrorBanner(null);
    try {
      showToast('Signing in with instant Demo Account...', 'info');
      await demoLogin();
      showToast('Welcome to CareCue Demo! You are now signed in.', 'success');
    } catch (err: any) {
      setErrorBanner(err.message || 'Demo sign in failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Fields
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(600); // 10 minutes (600s)
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown
  const [canResend, setCanResend] = useState(false);

  // Reset errors on mode change
  useEffect(() => {
    setErrorBanner(null);
  }, [mode]);

  // Timers
  useEffect(() => {
    let timer: any = null;
    if (mode === 'otp' || mode === 'forgot_otp') {
      timer = setInterval(() => {
        setResendSeconds(prev => (prev > 0 ? prev - 1 : 0));
        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  const passwordRules = checkPasswordRules(password);
  const allRulesPassed = passwordRules.every(r => r.valid);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Format timer MM:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Sign Up Submit ───
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorBanner('Please fill in all required fields.');
      return;
    }
    if (!allRulesPassed) {
      setErrorBanner('Please meet all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorBanner('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      if (res.success || res.status === 'OTP_SENT') {
        showToast('Verification code sent to your email!', 'success');
        setMode('otp');
        setResendSeconds(600);
        setResendCooldown(60);
        setCanResend(false);
      } else {
        setErrorBanner(res.message || 'Unable to create account.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign In Submit ───
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!email.trim() || !password) {
      setErrorBanner('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.signin({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success && res.user && res.token) {
        showToast(`Welcome back, ${res.user.firstName}!`, 'success');
        await login(res.user, res.token);
      } else if (res.requiresVerification) {
        showToast('Please verify your email to continue.', 'info');
        setMode('otp');
        setResendSeconds(600);
        setResendCooldown(60);
        setCanResend(false);
      } else {
        setErrorBanner(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Verification Submit ───
  const fullOtpString = otpCode.join('');
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (fullOtpString.length !== 6) {
      setErrorBanner('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: fullOtpString,
        purpose: mode === 'forgot_otp' ? 'reset' : 'signup',
      });

      if (res.success || res.verified) {
        if (mode === 'forgot_otp') {
          showToast('Code verified! Enter your new password.', 'success');
          setMode('forgot_reset');
        } else {
          showToast('Email verified successfully!', 'success');
          if (res.user && res.token) {
            await login(res.user, res.token);
          } else {
            openOnboarding();
          }
        }
      } else {
        setErrorBanner(res.message || 'Incorrect verification code.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ───
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorBanner(null);
    setLoading(true);
    try {
      const res = await authClient.resendOtp({
        email: email.trim().toLowerCase(),
        purpose: mode === 'forgot_otp' ? 'reset' : 'signup',
      });
      if (res.success) {
        showToast('A new 6-digit code has been sent.', 'success');
        setResendSeconds(600);
        setResendCooldown(60);
        setCanResend(false);
        setOtpCode(['', '', '', '', '', '']);
      } else {
        setErrorBanner(res.message || 'Could not resend verification code.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Resend failed.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password Email Submit ───
  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!email.trim()) {
      setErrorBanner('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.forgotPassword({ email: email.trim().toLowerCase() });
      if (res.success) {
        showToast('Password reset code sent to your email.', 'info');
        setMode('forgot_otp');
        setResendSeconds(600);
        setResendCooldown(60);
        setCanResend(false);
      } else {
        setErrorBanner(res.message || 'Could not process request.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Password Final Submit ───
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!allRulesPassed) {
      setErrorBanner('Please satisfy all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorBanner('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.resetPassword({
        email: email.trim().toLowerCase(),
        otp: fullOtpString,
        newPassword: password,
        confirmPassword,
      });
      if (res.success) {
        showToast('Password updated successfully! Please sign in.', 'success');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorBanner(res.message || 'Could not update password.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.max(2, b.length))}${c}`)
    : 'your email';

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent-teal flex items-center justify-center shadow-xs">
            <Heart className="w-5 h-5 text-text-inverse" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-text-primary block">CareCue</span>
            <span className="text-[10px] text-text-tertiary font-semibold tracking-wider uppercase block">Clinical Companion</span>
          </div>
        </div>
        <ThemeToggle variant="segmented" />
      </header>

      {/* Main Auth Card Container */}
      <main className="flex-1 flex items-center justify-center py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-xl"
        >
          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-teal/10 text-accent-teal mb-3">
              {mode === 'signup' && <UserIcon className="w-6 h-6" />}
              {mode === 'signin' && <Lock className="w-6 h-6" />}
              {(mode === 'otp' || mode === 'forgot_otp') && <Mail className="w-6 h-6" />}
              {(mode === 'forgot_email' || mode === 'forgot_reset') && <ShieldCheck className="w-6 h-6" />}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {mode === 'signup' && 'Create your account'}
              {mode === 'signin' && 'Welcome back'}
              {(mode === 'otp' || mode === 'forgot_otp') && 'VERIFY YOUR EMAIL'}
              {mode === 'forgot_email' && 'Reset your password'}
              {mode === 'forgot_reset' && 'Set new password'}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {mode === 'signup' && 'Sign up to start building your verified Health Story'}
              {mode === 'signin' && 'Sign in to access your clinical companion'}
              {(mode === 'otp' || mode === 'forgot_otp') && `We sent a 6-digit code to: ${maskedEmail}`}
              {mode === 'forgot_email' && "Enter your email address and we'll send a 6-digit OTP"}
              {mode === 'forgot_reset' && 'Choose a strong new password for your account'}
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-start gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── 1. SIGN UP FORM (DEFAULT) ─── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-secondary">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-text-tertiary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-bg-secondary/70 border border-border-subtle rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">
                  Password Requirements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {passwordRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-1.5 text-[11px]">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.valid ? 'bg-status-consistent/20 text-status-consistent' : 'bg-border-default text-text-tertiary'}`}>
                        {rule.valid ? <Check className="w-2.5 h-2.5" /> : <span className="w-1 h-1 rounded-full bg-text-tertiary" />}
                      </div>
                      <span className={rule.valid ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full px-3 py-2 bg-bg-secondary border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-status-consistent focus:ring-status-consistent/40'
                        : 'border-status-error focus:ring-status-error/40'
                      : 'border-border-default focus:ring-accent-teal/40'
                  }`}
                />
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[11px]">
                    {passwordsMatch ? (
                      <span className="text-status-consistent font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-status-error font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !allRulesPassed || !passwordsMatch}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>

              {/* Instant Demo Sign In Option */}
              <div className="relative my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bg-surface px-2 text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                    Or Instant Access
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading || demoLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-teal-500/15 to-emerald-500/10 border border-accent-teal/30 hover:border-accent-teal hover:bg-accent-teal/20 text-accent-teal-dark font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                {demoLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-accent-teal" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform fill-amber-500/30" />
                )}
                <span>Direct Demo Sign In (1-Click)</span>
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-text-secondary">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="font-bold text-accent-teal hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ─── 2. SIGN IN FORM ─── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-secondary">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot_email')}
                    className="text-[11px] font-medium text-accent-teal hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>

              {/* Instant Demo Sign In Option */}
              <div className="relative my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bg-surface px-2 text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                    Or Instant Access
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading || demoLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-teal-500/15 to-emerald-500/10 border border-accent-teal/30 hover:border-accent-teal hover:bg-accent-teal/20 text-accent-teal-dark font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                {demoLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-accent-teal" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform fill-amber-500/30" />
                )}
                <span>Direct Demo Sign In (1-Click)</span>
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-text-secondary">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-bold text-accent-teal hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ─── 3. EMAIL OTP VERIFICATION SCREEN ─── */}
          {(mode === 'otp' || mode === 'forgot_otp') && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* 6-box OTP Input */}
              <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/, '');
                      const next = [...otpCode];
                      next[idx] = val;
                      setOtpCode(next);
                      if (val && idx < 5) {
                        const nextInput = document.getElementById(`otp-box-${idx + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                        const prevInput = document.getElementById(`otp-box-${idx - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    onPaste={e => {
                      e.preventDefault();
                      const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (paste) {
                        const next = [...otpCode];
                        for (let i = 0; i < paste.length; i++) {
                          next[i] = paste[i];
                        }
                        setOtpCode(next);
                        const focusIdx = Math.min(5, paste.length);
                        document.getElementById(`otp-box-${focusIdx}`)?.focus();
                      }
                    }}
                    className="w-11 h-12 text-center text-lg font-bold bg-bg-secondary border border-border-default rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal"
                  />
                ))}
              </div>

              {/* Countdown Timer */}
              <div className="text-center">
                <p className="text-xs text-text-tertiary">
                  Code expires in <span className="font-mono font-bold text-text-primary">{formatTimer(resendSeconds)}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || fullOtpString.length !== 6 || resendSeconds === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify Email</span>}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-text-tertiary hover:text-text-primary cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResendOtp}
                  className={`font-semibold ${canResend ? 'text-accent-teal hover:underline cursor-pointer' : 'text-text-tertiary cursor-not-allowed'}`}
                >
                  {canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}
                </button>
              </div>
            </form>
          )}

          {/* ─── 4. FORGOT PASSWORD: EMAIL ─── */}
          {mode === 'forgot_email' && (
            <form onSubmit={handleForgotEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Your Account Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Reset Code</span>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-text-tertiary hover:text-text-primary cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ─── 5. FORGOT PASSWORD: NEW PASSWORD ─── */}
          {mode === 'forgot_reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-bg-secondary/70 border border-border-subtle rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">
                  Password Requirements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {passwordRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-1.5 text-[11px]">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.valid ? 'bg-status-consistent/20 text-status-consistent' : 'bg-border-default text-text-tertiary'}`}>
                        {rule.valid ? <Check className="w-2.5 h-2.5" /> : <span className="w-1 h-1 rounded-full bg-text-tertiary" />}
                      </div>
                      <span className={rule.valid ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !allRulesPassed || !passwordsMatch}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
              </button>
            </form>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[11px] text-text-tertiary">
        <p>CareCue &copy; {new Date().getFullYear()} &middot; Grounded Healthcare Companion with Dual-AI Consensus Verification</p>
      </footer>
    </div>
  );
}
