import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLocationMarker,
  HiOutlineCheckCircle,
  HiOutlineSparkles
} from 'react-icons/hi';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Password criteria
  const password = formData.password;
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};

    // 1. Full Name Validation
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    // 2. Email Validation
    const trimmedEmail = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    // 3. Phone Validation (allow 10 digits, normalize +91/spaces)
    const rawPhone = formData.phone.trim();
    const cleanPhone = rawPhone.replace(/[\s\-()]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
    if (!cleanPhone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    // 4. Pincode Validation (optional, but if provided must be exactly 6 digits)
    const cleanPincode = formData.pincode.trim();
    if (cleanPincode && !/^[0-9]{6}$/.test(cleanPincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }

    // 5. Password Validation
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    // 6. Confirm Password Validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: cleanPincode,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      const data = await register(payload);
      toast.success(data?.message || 'Verification OTP sent to your registered email.');
      // Redirect citizen to /verify-email to verify OTP
      navigate('/verify-email', {
        state: { email: payload.email }
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err.response?.data);

      const status = err.response?.status;
      const responseData = err.response?.data;
      const responseMessage = responseData?.message;

      // Extract field-level errors if provided by backend
      if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
        const serverFieldErrors = {};
        responseData.errors.forEach((errItem) => {
          if (errItem.field) {
            serverFieldErrors[errItem.field] = errItem.message;
          }
        });
        setFieldErrors(serverFieldErrors);
      }

      if (responseMessage) {
        setError(responseMessage);
      } else if (!err.response) {
        setError('Cannot connect to LocalFix server. Please check your network connection.');
      } else if (status === 409) {
        setError('An account with this email or phone number already exists.');
      } else if (status === 503) {
        setError('Unable to send verification email. Please try again.');
      } else if (status >= 500) {
        setError('Something went wrong on the server. Please try again.');
      } else {
        setError('Please check the highlighted fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 overflow-hidden my-4">
      {/* Ambient background glow */}
      <div className="absolute top-10 left-1/3 w-[560px] h-[560px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-xl w-full backdrop-blur-xl bg-slate-900/85 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-950/80">
        
        {/* Header & LF Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/25 mb-3">
            <span className="text-xl font-black text-white tracking-wider">LF</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-2">
            <HiOutlineSparkles className="text-sm" />
            <span>CITIZEN REGISTRATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Join LocalFix to report, track, and verify civic service requests in your area
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Unified Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <HiOutlineUser className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Haritha Chirakala"
                className={`w-full bg-slate-950/70 border ${fieldErrors.fullName ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
              />
            </div>
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  className={`w-full bg-slate-950/70 border ${fieldErrors.email ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <HiOutlinePhone className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={`w-full bg-slate-950/70 border ${fieldErrors.phone ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Location Details: City, State, Pincode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                City
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Guntur"
                  className={`w-full bg-slate-950/70 border ${fieldErrors.city ? 'border-rose-500' : 'border-slate-800'} rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
              {fieldErrors.city && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Andhra Pradesh"
                className={`w-full bg-slate-950/70 border ${fieldErrors.state ? 'border-rose-500' : 'border-slate-800'} rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
              />
              {fieldErrors.state && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="522001"
                className={`w-full bg-slate-950/70 border ${fieldErrors.pincode ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.pincode}</p>
              )}
            </div>
          </div>

          {/* Password and Confirm Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full bg-slate-950/70 border ${fieldErrors.password ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
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
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full bg-slate-950/70 border ${fieldErrors.confirmPassword ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800'} rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
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
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Dynamic Password Checklist */}
          {formData.password && (
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
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Existing Account Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
