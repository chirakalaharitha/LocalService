import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineSparkles
} from 'react-icons/hi';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const resetToken = location.state?.resetToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password complexity checks
  const hasMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetToken || !email) {
      setError('Verification session has expired or is invalid. Please restart the password reset process.');
      return;
    }

    if (!hasMinLength) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword
      });

      toast.success(res.data?.message || 'Password reset successfully! Please sign in.');
      navigate('/login', {
        state: {
          email: email.trim().toLowerCase(),
          message: 'Password reset successfully! Please sign in with your new password.'
        }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to reset password. The reset link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full backdrop-blur-xl bg-slate-900/85 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-950/80">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/25 mb-3.5">
            <HiOutlineShieldCheck className="text-2xl text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <HiOutlineSparkles className="text-sm" />
            <span>CREATE NEW PASSWORD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Choose a strong, secure password to protect your LocalFix account
          </p>
        </div>

        {/* Missing Token Warning */}
        {(!resetToken || !email) && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex flex-col gap-2">
            <div className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Session Missing</span>
            </div>
            <p className="text-xs text-amber-200/80">
              No active reset verification found. Please request a new OTP code.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-1 text-teal-400 hover:text-teal-300 font-semibold underline text-xs"
            >
              Start password reset again
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <HiOutlineEyeOff className="text-lg" />
                ) : (
                  <HiOutlineEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Repeat new password"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <HiOutlineEyeOff className="text-lg" />
                ) : (
                  <HiOutlineEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          {/* Password Checklist */}
          {newPassword && (
            <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
              <div className="font-semibold text-slate-400 mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <HiOutlineCheckCircle className="text-sm" />
                  <span>At least 6 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <HiOutlineCheckCircle className="text-sm" />
                  <span>Includes letters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <HiOutlineCheckCircle className="text-sm" />
                  <span>Includes numbers</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <HiOutlineCheckCircle className="text-sm" />
                  <span>Passwords match</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !resetToken || !hasMinLength || !passwordsMatch}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-slate-400">
          Remember your credentials?{' '}
          <Link to="/login" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
