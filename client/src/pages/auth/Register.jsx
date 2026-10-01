import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LocalFixLogo from '../../components/common/LocalFixLogo';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLocationMarker,
  HiOutlineCheckCircle
} from 'react-icons/hi';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Kerala',
  'Gujarat',
  'Delhi',
  'Rajasthan',
  'Uttar Pradesh',
  'West Bengal',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Bihar',
  'Odisha',
  'Assam'
];

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    pincode: '',
    agreeTerms: true
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Password validation criteria
  const password = formData.password;
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
  const passwordsMatch = password.length > 0 && password === formData.confirmPassword;

  const criteriaPassed = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLevel = criteriaPassed <= 2 ? 'Weak' : criteriaPassed <= 4 ? 'Medium' : 'Strong';
  const strengthColor =
    criteriaPassed <= 2
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : criteriaPassed <= 4
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};

    // 1. Full Name
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    // 2. Email
    const trimmedEmail = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    // 3. Phone (10 digits)
    const rawPhone = formData.phone.trim();
    const cleanPhone = rawPhone.replace(/[\s\-()]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
    if (!cleanPhone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    // 4. Password
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    // 5. Confirm Password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // 6. Address
    if (!formData.address.trim()) {
      errors.address = 'Address is required.';
    }

    // 7. City / Town
    if (!formData.city.trim()) {
      errors.city = 'City or town is required.';
    }

    // 8. Pincode (optional/6-digit)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be 6 digits.';
    }

    // 9. Terms
    if (!formData.agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please review the highlighted fields.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone,
        password: formData.password,
        role: 'CITIZEN',
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state,
        pincode: formData.pincode ? formData.pincode.trim() : undefined
      };

      const res = await register(payload);

      toast.success(res?.message || 'Welcome to LocalFix! Account created successfully.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const resp = err.response?.data;
      const status = err.response?.status;
      let errorMsg = resp?.message || 'Registration failed. Please verify your details.';

      if (status === 409 || errorMsg.toLowerCase().includes('already exists')) {
        errorMsg = 'An account with this email or phone number already exists.';
      }

      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center py-4 px-4 sm:px-8 lg:px-12 overflow-hidden">
      <div className="w-full max-w-[1250px] mx-auto h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-12 h-full items-stretch overflow-hidden">
          
          {/* LEFT COLUMN: Scrollable Form Area */}
          <div className="h-full overflow-y-auto pr-2 lg:pr-4 flex flex-col py-4">
            <div className="w-full max-w-xl mx-auto my-auto">

              <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                Create Your LocalFix Account
              </h1>
              <p className="text-xs sm:text-sm text-[#6B666E] mt-1 mb-6">
                Join your community and help improve local services.
              </p>

          {/* Form Top Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`w-full bg-white border ${fieldErrors.fullName ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={`w-full bg-white border ${fieldErrors.email ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <HiOutlinePhone className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className={`w-full bg-white border ${fieldErrors.phone ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Password *
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={`w-full bg-white border ${fieldErrors.password ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-11 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
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
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
              )}

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2 p-2.5 bg-white border border-[#EFE7E0] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6B666E]">Password strength:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${strengthColor}`}>
                      {strengthLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#9E98A2]">
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={`w-full bg-white border ${fieldErrors.confirmPassword ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-11 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
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
              {formData.confirmPassword && (
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

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Address *
              </label>
              <div className="relative">
                <HiOutlineLocationMarker className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your street address"
                  className={`w-full bg-white border ${fieldErrors.address ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
                />
              </div>
              {fieldErrors.address && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.address}</p>
              )}
            </div>

            {/* City, State, Pincode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Tenali"
                  className={`w-full bg-white border ${fieldErrors.city ? 'border-rose-500' : 'border-[#EFE7E0]'} rounded-xl py-2.5 px-3 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">
                  State *
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-[#29252A] focus:outline-none focus:border-[#C65F63] transition"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="522201"
                  className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 px-3 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#6B666E]">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="rounded border-[#EFE7E0] text-[#C65F63] focus:ring-[#C65F63]"
                />
                <span>I agree to the Terms of Service and Privacy Policy</span>
              </label>
              {fieldErrors.agreeTerms && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.agreeTerms}</p>
              )}
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Already have an account? Login */}
          <p className="mt-6 text-center text-xs text-[#6B666E]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#C65F63] hover:underline">
              Login
            </Link>
          </p>

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

export default Register;
