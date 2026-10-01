import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LocalFixLogo from '../../components/common/LocalFixLogo';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineUser,
  HiOutlineBriefcase
} from 'react-icons/hi';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [selectedRoleTab, setSelectedRoleTab] = useState('CITIZEN'); // 'CITIZEN' | 'STAFF'
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;
  const searchParams = location.state?.from?.search || '';

  useEffect(() => {
    if (location.state?.email && !email) {
      setEmail(location.state.email);
    }
    if (location.state?.message && !successMessage) {
      setSuccessMessage(location.state.message);
    }
    if (location.state?.role) {
      setSelectedRoleTab(location.state.role.toUpperCase());
    }
  }, [location.state]);

  // If already authenticated, redirect to respective role dashboard
  useEffect(() => {
    if (user && user.role) {
      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'STAFF') {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const data = await login(email.trim().toLowerCase(), password);
      const userRole = (data?.user?.role || '').toUpperCase();
      toast.success(data?.message || 'Signed in successfully!');

      if (userRole === 'ADMIN') {
        const dest = from && from.startsWith('/admin') ? `${from}${searchParams}` : '/admin/dashboard';
        navigate(dest, { replace: true });
      } else if (userRole === 'STAFF') {
        const dest = from && from.startsWith('/staff') ? `${from}${searchParams}` : '/staff/dashboard';
        navigate(dest, { replace: true });
      } else {
        const dest = from && !from.startsWith('/admin') && !from.startsWith('/staff') && from !== '/login'
          ? `${from}${searchParams}`
          : '/dashboard';
        navigate(dest, { replace: true });
      }
    } catch (err) {
      const resp = err.response?.data;
      const status = err.response?.status;
      let errorMsg = resp?.message || 'Login failed. Please check your email and password.';

      if (status === 401) {
        errorMsg = 'Invalid email or password.';
      } else if (status === 404) {
        errorMsg = 'Account not found. Please check your email address.';
      } else if (!err.response) {
        errorMsg = 'Unable to connect to server. Please check your network or server status.';
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
          <div className="h-full overflow-y-auto pr-2 lg:pr-4 flex flex-col justify-center py-4">
            <div className="w-full max-w-md mx-auto">
              
              <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
                Welcome Back!
              </h1>
              <p className="text-xs sm:text-sm text-[#6B666E] mt-1 mb-6">
                Sign in to continue to your account.
              </p>

          {/* Success Message Alert */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-fadeIn flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-white border border-[#EFE7E0] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-[#9E98A2] text-lg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#6B666E]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#EFE7E0] text-[#C65F63] focus:ring-[#C65F63]"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-bold text-[#C65F63] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-lg shadow-[#C65F63]/30 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#6B666E]">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-[#C65F63] hover:underline">
              Create Account
            </Link>
          </p>

          {/* Quick Context Indicator (Citizen vs Staff Login) */}
          <div className="mt-6 pt-5 border-t border-[#EFE7E0] grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedRoleTab('CITIZEN')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedRoleTab === 'CITIZEN'
                  ? 'bg-[#FDECEF] border-[#C65F63]/40 shadow-xs'
                  : 'bg-white border-[#EFE7E0] hover:border-[#6B4E71]/30'
              }`}
            >
              <div className="text-xs font-bold text-[#29252A] flex items-center gap-1.5">
                <HiOutlineUser className="text-[#C65F63]" />
                <span>Citizen Login</span>
              </div>
              <p className="text-[10px] text-[#6B666E] mt-0.5 leading-tight">
                Report & track civic issues
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRoleTab('STAFF')}
              className={`p-2.5 rounded-xl border text-left transition ${
                selectedRoleTab === 'STAFF'
                  ? 'bg-[#FDECEF] border-[#C65F63]/40 shadow-xs'
                  : 'bg-white border-[#EFE7E0] hover:border-[#6B4E71]/30'
              }`}
            >
              <div className="text-xs font-bold text-[#29252A] flex items-center gap-1.5">
                <HiOutlineBriefcase className="text-[#6B4E71]" />
                <span>Staff Login</span>
              </div>
              <p className="text-[10px] text-[#6B666E] mt-0.5 leading-tight">
                Manage & resolve tasks
              </p>
            </button>
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

export default Login;
