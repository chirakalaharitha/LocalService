import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import LocalFixLogo from '../../components/common/LocalFixLogo';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft
} from 'react-icons/hi';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Steps: 'EMAIL' (1), 'OTP' (2), 'RESET' (3), 'SUCCESS' (4)
  const [step, setStep] = useState(location.state?.step || 'EMAIL');
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState(location.state?.resetToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timers & loading states
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300s
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef([]);

  // Focus first OTP input when reaching step 2
  useEffect(() => {
    if (step === 'OTP' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  // 5-minute countdown timer for OTP
  useEffect(() => {
    if (step !== 'OTP' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

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

  // 1. Submit email to send OTP
  const handleEmailSubmit = async (e) => {
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
      setStep('OTP');
      setTimeLeft(300);
      setResendCooldown(60);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to send verification code. Please check the email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP Input Handler
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (timeLeft <= 0) {
      setError('Verification code has expired. Please request a new code.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: otpCode
      });

      toast.success(res.data?.message || 'Code verified successfully!');
      setResetToken(res.data.resetToken);
      setStep('RESET');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);

    try {
      const res = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      toast.success('A new verification code has been dispatched to your email.');
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

  // 5. Submit New Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/reset-password', {
        resetToken,
        newPassword
      });

      toast.success(res.data?.message || 'Password reset successfully!');
      setStep('SUCCESS');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to reset password. The reset session may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Password criteria checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="w-full h-full flex flex-col justify-center items-center py-4 px-4 sm:px-8 lg:px-12 overflow-hidden">
      <div className="w-full max-w-[1250px] mx-auto h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-12 h-full items-stretch overflow-hidden">
          
          {/* LEFT COLUMN: Scrollable Form Area */}
          <div className="h-full overflow-y-auto pr-2 lg:pr-4 flex flex-col justify-center py-4">
            <div className="w-full max-w-md mx-auto">
              
              {/* Error Message Alert */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

          {/* STAGE 1: EMAIL ENTRY */}
          {step === 'EMAIL' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                  Forgot Your Password?
                </h1>
                <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                  Enter your registered email address and we'll help you securely recover your account.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email address"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Reset Code...</span>
                    </>
                  ) : (
                    <span>Send Reset Code</span>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-[#6B666E]">
                <span>Remember your password? </span>
                <Link to="/login" className="font-bold text-[#C65F63] hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* STAGE 2: 6-DIGIT OTP VERIFICATION */}
          {step === 'OTP' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] mb-3 transition"
                >
                  <HiOutlineArrowLeft />
                  <span>Change Email</span>
                </button>

                <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                  Verify Your Email
                </h1>
                <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                  Enter the 6-digit code sent to <strong className="text-[#29252A]">{email}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                    onClick={handleResendOtp}
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

              <div className="pt-2 text-center text-xs text-[#6B666E]">
                <span>Remember your password? </span>
                <Link to="/login" className="font-bold text-[#C65F63] hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* STAGE 3: NEW PASSWORD ENTRY */}
          {step === 'RESET' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                  Create a New Password
                </h1>
                <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                  Your new password must be strong and secure.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#29252A] mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-11 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-3 text-[#9E98A2] hover:text-[#29252A] p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <HiOutlineEyeOff className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                    </button>
                  </div>

                  {/* Requirements checklist */}
                  {newPassword && (
                    <div className="mt-2 p-3 bg-white border border-[#EFE7E0] rounded-xl text-[11px] space-y-1 text-[#6B666E]">
                      <div className="font-semibold text-[#29252A] mb-1">Password requirements:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className={`flex items-center gap-1 ${hasMinLength ? 'text-[#5C9A72] font-semibold' : ''}`}>
                          <HiOutlineCheckCircle />
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${hasUpper ? 'text-[#5C9A72] font-semibold' : ''}`}>
                          <HiOutlineCheckCircle />
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1 ${hasLower ? 'text-[#5C9A72] font-semibold' : ''}`}>
                          <HiOutlineCheckCircle />
                          <span>Lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1 ${hasNumber ? 'text-[#5C9A72] font-semibold' : ''}`}>
                          <HiOutlineCheckCircle />
                          <span>Number</span>
                        </div>
                        <div className={`flex items-center gap-1 ${hasSpecial ? 'text-[#5C9A72] font-semibold' : ''}`}>
                          <HiOutlineCheckCircle />
                          <span>Special character</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#29252A] mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-11 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-3 text-[#9E98A2] hover:text-[#29252A] p-0.5"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <HiOutlineEyeOff className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-[11px]">
                      {passwordsMatch ? (
                        <span className="text-[#5C9A72] font-semibold flex items-center gap-1">
                          <HiOutlineCheckCircle /> Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-600">Passwords do not match</span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !passwordsMatch || !hasMinLength}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition disabled:opacity-50 mt-2"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-[#6B666E]">
                <span>Remember your password? </span>
                <Link to="/login" className="font-bold text-[#C65F63] hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* STAGE 4: SUCCESS STATE */}
          {step === 'SUCCESS' && (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-md">
                <HiOutlineCheckCircle />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                Password Reset Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-[#6B666E] max-w-sm mx-auto">
                Your password has been updated securely. You can now log in with your new credentials.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  state={{ email, message: 'Password reset successfully. Please log in with your new password.' }}
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

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

export default ForgotPassword;
