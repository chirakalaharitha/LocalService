import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff
} from 'react-icons/hi';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  // Clear success message when typing or update if redirected with state
  useEffect(() => {
    if (location.state?.email && !email) {
      setEmail(location.state.email);
    }
    if (location.state?.message && !successMessage) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  // If already authenticated, redirect to appropriate role dashboard immediately
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
    setIsUnverified(false);
    setSuccessMessage('');
    setLoading(true);

    try {
      const data = await login(email.trim().toLowerCase(), password);
      const userRole = (data?.user?.role || '').toUpperCase();
      toast.success(data?.message || 'Signed in successfully!');

      // Dynamic role-based redirection directly from MongoDB role
      if (userRole === 'ADMIN') {
        const dest = from && from.startsWith('/admin') ? from : '/admin/dashboard';
        navigate(dest, { replace: true });
      } else if (userRole === 'STAFF') {
        const dest = from && from.startsWith('/staff') ? from : '/staff/dashboard';
        navigate(dest, { replace: true });
      } else {
        const dest = from && !from.startsWith('/admin') && !from.startsWith('/staff') && from !== '/login'
          ? from
          : '/dashboard';
        navigate(dest, { replace: true });
      }
    } catch (err) {
      const resp = err.response?.data;
      const status = err.response?.status;
      let errorMsg = resp?.message || 'Login failed. Please check your email and password.';

      if (status === 401) {
        errorMsg = resp?.message || 'Invalid email or password.';
      } else if (status === 403) {
        if (resp?.isUnverified) {
          setIsUnverified(true);
          errorMsg = resp?.message || 'Your account is not activated yet. Please verify your email.';
        } else {
          errorMsg = resp?.message || 'Your account is currently inactive. Please contact the administrator.';
        }
      } else if (status === 404) {
        errorMsg = resp?.message || 'Account not found. Please check your email address.';
      } else if (!err.response) {
        errorMsg = 'Unable to connect to server. Please check your internet or server status.';
      }

      setError(errorMsg);
      toast.error(errorMsg);
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
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/25 mb-3">
            <span className="text-2xl font-black text-white tracking-wider">LF</span>
          </div>
          <div className="text-lg font-black tracking-tight text-white">
            LocalFix
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            Welcome Back
          </h1>
        </div>

        {/* Success Alert Banner (from activation or reset) */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <span className="text-base leading-none mt-0.5">✅</span>
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
            {isUnverified && (
              <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-right">
                <button
                  type="button"
                  onClick={() => navigate('/verify-email', { state: { email: email.trim().toLowerCase() } })}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow transition"
                >
                  <span>Verify Email Now →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Create Account Link */}
        <p className="mt-7 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
