import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/services/authClient';
import { useToast } from '@/contexts/ToastContext';

interface PasswordRule {
  id: string;
  label: string;
  valid: boolean;
}

export function checkPasswordRules(password: string): PasswordRule[] {
  return [
    { id: 'len', label: 'At least 8 characters', valid: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { id: 'num', label: 'One number (0-9)', valid: /[0-9]/.test(password) },
    { id: 'special', label: 'One special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`]/.test(password) },
    { id: 'spaces', label: 'No spaces', valid: password.length > 0 && !/\s/.test(password) },
  ];
}

export function AuthModal() {
  const { 
    isAuthModalOpen, 
    authModalMode, 
    closeAuthModal, 
    openAuthModal, 
    openOnboarding, 
    login,
    demoLogin,
  } = useAuth();

  const { showToast } = useToast();

  const [mode, setMode] = useState(authModalMode);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setErrorBanner(null);
    try {
      showToast('Signing in with instant Demo Account...', 'info');
      await demoLogin();
      showToast('Welcome to CareCue Demo! You are now signed in.', 'success');
      closeAuthModal();
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP Fields
  const [otpCode, setOtpCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setMode(authModalMode);
    setErrorBanner(null);
  }, [authModalMode, isAuthModalOpen]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if ((mode === 'otp' || mode === 'forgot_otp') && resendSeconds > 0) {
      timer = setInterval(() => {
        setResendSeconds(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, resendSeconds]);

  if (!isAuthModalOpen) return null;

  const passwordRules = checkPasswordRules(password);
  const allRulesPassed = passwordRules.every(r => r.valid);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // ─── Sign In Submit ───
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setLoading(true);
    try {
      const res = await authClient.signin(email, password);
      if (res.status === 'OTP_REQUIRED') {
        setMode('otp');
        setResendSeconds(60);
        setCanResend(false);
        showToast('Email not yet verified. Please enter the verification code.', 'info');
      } else if (res.user && res.token) {
        login(res.user, res.token);
        showToast(`Welcome back, ${res.user.firstName}!`, 'success');
        closeAuthModal();
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign Up Submit ───
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      setErrorBanner('Please satisfy all password security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorBanner('Passwords do not match.');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      await authClient.signup({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      });
      setMode('otp');
      setResendSeconds(60);
      setCanResend(false);
      showToast(`Verification code sent to ${email}`, 'success');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Verification Submit ───
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setErrorBanner('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      const purpose = mode === 'forgot_otp' ? 'reset' : 'signup';
      const res = await authClient.verifyOtp(email, otpCode, purpose);

      if (purpose === 'signup') {
        if (res.user && res.token) {
          login(res.user, res.token);
        } else if (res.user) {
          login(res.user, `sess-${Date.now()}`);
        }
        showToast('Account verified! Welcome to CareCue.', 'success');
        closeAuthModal();
        openOnboarding();
      } else {
        setMode('forgot_reset');
        showToast('Code confirmed. Enter your new password.', 'info');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Invalid verification code.');
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
      const purpose = mode === 'forgot_otp' ? 'reset' : 'signup';
      await authClient.resendOtp(email, purpose);
      setResendSeconds(60);
      setCanResend(false);
      showToast('A new 6-digit verification code has been dispatched.', 'info');
    } catch (err: any) {
      setErrorBanner(err.message || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password Request ───
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorBanner('Please enter your account email.');
      return;
    }
    setErrorBanner(null);
    setLoading(true);
    try {
      await authClient.forgotPassword(email);
      setMode('forgot_otp');
      setResendSeconds(60);
      setCanResend(false);
      showToast('If an account exists, a reset code has been sent.', 'info');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to request reset code.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Password Submit ───
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      setErrorBanner('Please satisfy all password security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorBanner('Passwords do not match.');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      await authClient.resetPassword({
        email,
        otp: otpCode,
        newPassword: password,
        confirmPassword,
      });
      showToast('Password reset successful! Please sign in.', 'success');
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent-teal/15 flex items-center justify-center text-accent-teal-dark">
            <ShieldCheck className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
              CareCue Security
            </span>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {(mode === 'otp' || mode === 'forgot_otp') && 'Email Verification'}
              {mode === 'forgot_email' && 'Reset Password'}
              {mode === 'forgot_reset' && 'Create New Password'}
            </h2>
          </div>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-4 p-3 rounded-xl bg-status-safety-bg border border-status-safety/30 flex items-start gap-2.5 text-xs text-status-safety animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* ─── 1. SIGN IN FORM ─── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot_email')}
                  className="text-xs text-accent-teal hover:underline font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Instant Demo Sign In Option */}
            <div className="relative my-3">
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

            <div className="pt-3 border-t border-border-subtle text-center text-xs text-text-secondary">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-accent-teal font-bold hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ─── 2. SIGN UP FORM ─── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Choose Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Password Rules Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1.5 animate-in fade-in">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    PASSWORD REQUIREMENTS
                  </p>
                  {passwordRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-2 text-[11px]">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.valid ? 'bg-emerald-500 text-white' : 'bg-border-default text-text-muted'}`}>
                        {rule.valid ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />}
                      </div>
                      <span className={rule.valid ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
              />
              {confirmPassword.length > 0 && (
                <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-status-safety'}`}>
                  {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="rounded border-border-default text-accent-teal focus:ring-accent-teal"
                />
                <span>I accept the healthcare privacy policy and terms.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark disabled:opacity-40 disabled:cursor-not-allowed text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Send Verification Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Instant Demo Sign In Option */}
            <div className="relative my-3">
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

            <div className="pt-2 text-center text-xs text-text-secondary">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-accent-teal font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ─── 3. OTP VERIFICATION FORM ─── */}
        {(mode === 'otp' || mode === 'forgot_otp') && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-border-subtle text-xs text-text-secondary">
              We sent a secure 6-digit verification code to <span className="font-semibold text-text-primary">{email}</span>. Valid for 10 minutes.
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-xl bg-bg-primary border border-border-default text-text-primary font-bold focus:outline-hidden focus:border-accent-teal"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark disabled:opacity-40 disabled:cursor-not-allowed text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Verify & Continue</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-text-muted">
                {canResend ? 'Code expired or not received?' : `Resend available in ${resendSeconds}s`}
              </span>
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={handleResendOtp}
                className="text-accent-teal font-bold hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* ─── 4. FORGOT PASSWORD EMAIL ─── */}
        {mode === 'forgot_email' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-text-secondary">
              Enter your email address and we'll send a 6-digit verification code to reset your password.
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark disabled:opacity-40 text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Send Reset Code</span>
            </button>

            <div className="text-center pt-2 text-xs">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-accent-teal font-semibold hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ─── 5. RESET PASSWORD FORM ─── */}
        {mode === 'forgot_reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New secure password"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Rules Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1.5 animate-in fade-in">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    PASSWORD REQUIREMENTS
                  </p>
                  {passwordRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-2 text-[11px]">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.valid ? 'bg-emerald-500 text-white' : 'bg-border-default text-text-muted'}`}>
                        {rule.valid ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />}
                      </div>
                      <span className={rule.valid ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
              />
              {confirmPassword.length > 0 && (
                <p className={`text-[11px] font-semibold mt-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-status-safety'}`}>
                  {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark disabled:opacity-40 disabled:cursor-not-allowed text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
