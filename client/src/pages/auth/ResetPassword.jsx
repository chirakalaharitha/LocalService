import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import LocalFixLogo from '../../components/common/LocalFixLogo';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetToken) {
      setError('Verification session has expired or is invalid. Please restart the password reset process.');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError('Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/reset-password', {
        email: email ? email.trim().toLowerCase() : undefined,
        resetToken,
        newPassword
      });

      toast.success(res.data?.message || 'Password reset successfully!');
      setIsSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to reset password. The reset authorization may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center py-4 px-4 sm:px-8 lg:px-12 overflow-hidden">
      <div className="w-full max-w-[1250px] mx-auto h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-12 h-full items-stretch overflow-hidden">
          
          {/* LEFT COLUMN: Scrollable Form Area */}
          <div className="h-full overflow-y-auto pr-2 lg:pr-4 flex flex-col justify-center py-4">
            <div className="w-full max-w-md mx-auto">

          {!isSuccess ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                  Create a New Password
                </h1>
                <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                  Your new password must be strong and secure.
                </p>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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

                  {/* Password Checklist */}
                  {newPassword && (
                    <div className="mt-2 p-3 bg-white border border-[#EFE7E0] rounded-xl text-[11px] space-y-1 text-[#6B666E]">
                      <div className="font-semibold text-[#29252A] mb-1">Password requirements:</div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
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
          ) : (
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
                  state={{ email, message: 'Password reset successfully. Please sign in with your new password.' }}
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

export default ResetPassword;
