import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import LocalFixLogo from '../../components/common/LocalFixLogo';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
import {
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlineCheckCircle
} from 'react-icons/hi';

const VerifyResetOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

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
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (!cleaned) {
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    newOtp[index] = cleaned[cleaned.length - 1];
    setOtp(newOtp);
    setError('');

    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setOtp(arr);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (timeLeft <= 0) {
      setError('The verification code has expired. Please request a new code.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: code
      });

      toast.success(res.data?.message || 'Verification code confirmed!');
      navigate('/reset-password', {
        state: {
          email: email.trim().toLowerCase(),
          resetToken: res.data.resetToken
        },
        replace: true
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid verification code. Please double-check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);

    try {
      const res = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      toast.success(res.data?.message || 'New verification code sent to your email.');
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(300);
      setResendCooldown(60);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center py-4 px-4 sm:px-8 lg:px-12 overflow-hidden">
      <div className="w-full max-w-[1250px] mx-auto h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-12 h-full items-stretch overflow-hidden">
          
          {/* LEFT COLUMN: Scrollable Form Area */}
          <div className="h-full overflow-y-auto pr-2 lg:pr-4 flex flex-col justify-center py-4">
            <div className="w-full max-w-md mx-auto">

              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] mb-3 transition"
              >
            <HiOutlineArrowLeft />
            <span>Change Email</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-1 mb-6">
            Enter the 6-digit verification code sent to <strong className="text-[#29252A]">{email || 'your email'}</strong>.
          </p>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
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
                  className="w-12 h-14 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-black bg-white border-2 border-[#EFE7E0] rounded-2xl text-[#29252A] focus:border-[#C65F63] focus:ring-2 focus:ring-[#C65F63]/10 focus:outline-none transition"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B666E] pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <HiOutlineClock className="text-base text-[#6B4E71]" />
                <span>
                  Code expires in:{' '}
                  <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-600' : 'text-[#29252A]'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="font-bold text-[#C65F63] hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                <HiOutlineRefresh className={resending ? 'animate-spin' : ''} />
                <span>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6 || timeLeft <= 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Verifying Code...' : 'Verify Code'}
            </button>
          </form>

          <div className="pt-5 text-center text-xs text-[#6B666E]">
            <span>Remember your password? </span>
            <Link to="/login" className="font-bold text-[#C65F63] hover:underline">
              Back to Login
            </Link>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Centered Stationary Visual Graphic Panel */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden py-4">
        <AuthVisualPanel
          title="Your Voice Matters"
          subtitle="Report local problems, track progress and stay connected with your community."
          tagline="LocalFix Community"
          imageSrc="/auth_community_card.jpg"
        />
      </div>

    </div>
  </div>
</div>
);
};

export default VerifyResetOtp;
