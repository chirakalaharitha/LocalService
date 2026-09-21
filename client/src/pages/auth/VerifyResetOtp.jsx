import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineArrowLeft,
  HiOutlineSparkles
} from 'react-icons/hi';

const VerifyResetOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300s
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // 5-minute countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleOtpChange = (index, value) => {
    // Only allow single numeric digit
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (!cleaned) {
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    newOtp[index] = cleaned[cleaned.length - 1]; // take latest char
    setOtp(newOtp);
    setError('');

    // Advance to next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      if (i < pastedData.length) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);
    setError('');

    // Focus last filled digit or final input
    const nextIndex = Math.min(pastedData.length, 5);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is missing. Please return to the previous step.');
      return;
    }

    if (timeLeft <= 0) {
      setError('This verification code has expired. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: fullOtp
      });

      toast.success('Verification successful! Set your new password.');
      navigate('/reset-password', {
        state: {
          email: email.trim().toLowerCase(),
          resetToken: res.data?.resetToken
        }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    if (!email.trim()) {
      setError('Email address is missing. Please go back to enter your email.');
      return;
    }

    setResending(true);
    setError('');

    try {
      const res = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      toast.info(res.data?.message || 'New verification code sent! Check your inbox.');
      setTimeLeft(300); // Reset to 5 min
      setResendCooldown(60); // 60s cooldown for spam protection
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full backdrop-blur-xl bg-slate-900/85 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-950/80">
        
        {/* Back Link */}
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-6 font-medium"
        >
          <HiOutlineArrowLeft className="text-sm" />
          <span>Change Email Address</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/25 mb-3.5">
            <HiOutlineShieldCheck className="text-2xl text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-2">
            <HiOutlineSparkles className="text-sm" />
            <span>SECURITY VERIFICATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verify Code
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Enter the 6-digit verification code sent to
          </p>
          <div className="inline-block mt-1 px-3 py-1 bg-slate-950/70 border border-slate-800 rounded-full text-xs font-medium text-teal-300">
            {email || 'your registered email'}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 6 Individual Numeric Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl bg-slate-950/80 border text-slate-100 transition-all focus:outline-none ${
                  digit
                    ? 'border-teal-500/80 ring-2 ring-teal-500/20 text-teal-300'
                    : 'border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
            ))}
          </div>

          {/* Countdown Timer & Resend Section */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HiOutlineClock className={`text-base ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-teal-400'}`} />
              <span className={timeLeft < 60 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Code expired'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <HiOutlineRefresh className={`text-sm ${resending ? 'animate-spin' : ''}`} />
              <span>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resending
                  ? 'Sending...'
                  : 'Resend Code'}
              </span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6 || timeLeft <= 0}
            className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-slate-400">
          Didn't request this?{' '}
          <Link to="/login" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Return to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyResetOtp;
