import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineArrowLeft,
  HiOutlineSparkles
} from 'react-icons/hi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/forgot-password', { email: trimmedEmail });
      toast.success(res.data?.message || 'Verification code sent! Please check your email.');
      // Navigate to OTP verification page with email in state
      navigate('/verify-reset-otp', { state: { email: trimmedEmail } });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to send verification code. Please check the email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full backdrop-blur-xl bg-slate-900/85 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-950/80">
        
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-6 font-medium"
        >
          <HiOutlineArrowLeft className="text-sm" />
          <span>Back to Sign In</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/25 mb-3.5">
            <HiOutlineKey className="text-2xl text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <HiOutlineSparkles className="text-sm" />
            <span>ACCOUNT RECOVERY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Enter your registered email address (Citizen, Staff, or Admin). We'll send a 6-digit verification code to reset your password.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="name@domain.com"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending Code...</span>
              </>
            ) : (
              <span>Send Verification Code</span>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
