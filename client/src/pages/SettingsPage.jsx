import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineBell,
  HiOutlineSun,
  HiOutlineShieldCheck,
  HiOutlineLogout,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineMail,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineChatAlt2,
  HiOutlineX
} from 'react-icons/hi';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Notification Preferences State (6 items matching screenshot)
  const [notifPrefs, setNotifPrefs] = useState({
    emailAlerts: true,
    inAppNotifications: true,
    statusUpdates: true,
    assignmentUpdates: true,
    resolutionUpdates: true,
    communityUpdates: true
  });

  // Password & Security State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Appearance State
  const [theme, setTheme] = useState('Light (Default)');

  // Account Actions State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Load preferences from API or local storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await API.get('/auth/notification-preferences');
        if (res.data?.success && res.data?.preferences) {
          setNotifPrefs((prev) => ({
            ...prev,
            emailAlerts: res.data.preferences.emailAlerts ?? prev.emailAlerts,
            inAppNotifications: res.data.preferences.inAppNotifications ?? prev.inAppNotifications,
            statusUpdates: res.data.preferences.statusUpdates ?? prev.statusUpdates,
            assignmentUpdates: res.data.preferences.assignmentUpdates ?? prev.assignmentUpdates,
            resolutionUpdates: res.data.preferences.resolutionUpdates ?? prev.resolutionUpdates,
            communityUpdates: res.data.preferences.communityUpdates ?? prev.communityUpdates
          }));
        }
      } catch (err) {
        if (user?.notificationPreferences) {
          setNotifPrefs((prev) => ({
            ...prev,
            emailAlerts: user.notificationPreferences.emailAlerts ?? prev.emailAlerts,
            inAppNotifications: user.notificationPreferences.inAppNotifications ?? prev.inAppNotifications,
            statusUpdates: user.notificationPreferences.statusUpdates ?? prev.statusUpdates,
            assignmentUpdates: user.notificationPreferences.assignmentUpdates ?? prev.assignmentUpdates,
            resolutionUpdates: user.notificationPreferences.resolutionUpdates ?? prev.resolutionUpdates,
            communityUpdates: user.notificationPreferences.communityUpdates ?? prev.communityUpdates
          }));
        }
      }
    };

    if (user) {
      loadPreferences();
    }
  }, [user]);

  // Handle toggles
  const handleTogglePreference = async (key) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key]
    };
    setNotifPrefs(updated);

    try {
      await API.put('/auth/notification-preferences', updated);
      toast.success('Notification preference updated!');
    } catch (err) {
      toast.error('Failed to update preference.');
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.warning('Please enter current and new password.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await API.patch('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data?.success) {
        toast.success('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(res.data?.message || 'Password update failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      toast.warning('Please type DELETE to confirm account removal.');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await API.delete('/auth/account');
      if (res.data?.success) {
        toast.success('Account deleted successfully.');
        logout();
        navigate('/login');
      } else {
        toast.error(res.data?.message || 'Failed to delete account.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Apr 2025';

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans max-w-6xl mx-auto">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
          Manage your account preferences and security settings.
        </p>
      </div>

      {/* Main Grid: 2 Columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Account Information & Notification Preferences */}
        <div className="space-y-6">
          {/* 1. Account Information Card */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7E0]">
              <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                <HiOutlineUser className="text-base" />
              </div>
              <h2 className="text-sm font-bold text-[#29252A]">Account Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Email Address</label>
                <div className="p-2.5 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] text-[#29252A] font-medium truncate">
                  {user?.email || 'haritha@gmail.com'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Phone Number</label>
                <div className="p-2.5 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] text-[#29252A] font-medium">
                  {user?.phone || '+91 98765 43210'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Account Status</label>
                <div className="p-2 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] flex items-center">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D]">
                    Active
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Account Role</label>
                <div className="p-2 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] flex items-center">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#7E22CE] capitalize">
                    {user?.role?.toLowerCase() || 'citizen'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Member Since</label>
                <div className="p-2.5 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] text-[#29252A] font-medium">
                  {joinedDate}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Jurisdiction</label>
                <div className="p-2.5 bg-[#FAF8F6] rounded-xl border border-[#EAE3DC] text-[#29252A] font-medium truncate">
                  {user?.municipality?.name || 'LocalFix'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Notification Preferences Card (6 Toggles matching screenshot) */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7E0]">
              <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                <HiOutlineBell className="text-base" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#29252A]">Notification Preferences</h2>
                <p className="text-[11px] text-[#8C8490]">Choose which notifications you want to receive.</p>
              </div>
            </div>

            <div className="space-y-4 pt-1 text-xs">
              {/* Toggle 1: Email Notifications */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineMail className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">Email Notifications</div>
                    <div className="text-[11px] text-[#8C8490]">Get updates via email</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('emailAlerts')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.emailAlerts ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Email Notifications"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: In-App Notifications */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineBell className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">In-App Notifications</div>
                    <div className="text-[11px] text-[#8C8490]">Get real-time alerts in the app</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('inAppNotifications')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.inAppNotifications ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle In-App Notifications"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.inAppNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Request Status Updates */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineClipboardList className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">Request Status Updates</div>
                    <div className="text-[11px] text-[#8C8490]">Updates on your request status</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('statusUpdates')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.statusUpdates ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Request Status Updates"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.statusUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Request Assignment Updates */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineUserGroup className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">Request Assignment Updates</div>
                    <div className="text-[11px] text-[#8C8490]">When staff is assigned to your request</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('assignmentUpdates')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.assignmentUpdates ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Request Assignment Updates"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.assignmentUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 5: Resolution / Verification Updates */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineCheckCircle className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">Resolution / Verification Updates</div>
                    <div className="text-[11px] text-[#8C8490]">When your request is resolved or verified</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('resolutionUpdates')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.resolutionUpdates ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Resolution Updates"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.resolutionUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 6: Community / Comments Updates */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDECEF] text-[#D84E68] flex items-center justify-center text-sm shrink-0">
                    <HiOutlineChatAlt2 className="text-base" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#29252A]">Community / Comments Updates</div>
                    <div className="text-[11px] text-[#8C8490]">Replies and comments on your requests</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('communityUpdates')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifPrefs.communityUpdates ? 'bg-[#D84E68]' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Community Updates"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                      notifPrefs.communityUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Password & Security, Appearance, Account Actions */}
        <div className="space-y-6">
          {/* 1. Password & Security Card */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7E0]">
              <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                <HiOutlineLockClosed className="text-base" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#29252A]">Password & Security</h2>
                <p className="text-[11px] text-[#8C8490]">Change your password and keep your account secure.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full p-2.5 pr-10 rounded-xl border border-[#EAE3DC] bg-[#FAF8F6] text-[#29252A] placeholder-[#9E98A2] focus:bg-white focus:outline-none focus:border-[#D84E68] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-[#8C8490] hover:text-[#29252A]"
                    aria-label="Toggle Current Password visibility"
                  >
                    {showCurrentPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full p-2.5 pr-10 rounded-xl border border-[#EAE3DC] bg-[#FAF8F6] text-[#29252A] placeholder-[#9E98A2] focus:bg-white focus:outline-none focus:border-[#D84E68] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-[#8C8490] hover:text-[#29252A]"
                    aria-label="Toggle New Password visibility"
                  >
                    {showNewPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full p-2.5 pr-10 rounded-xl border border-[#EAE3DC] bg-[#FAF8F6] text-[#29252A] placeholder-[#9E98A2] focus:bg-white focus:outline-none focus:border-[#D84E68] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-[#8C8490] hover:text-[#29252A]"
                    aria-label="Toggle Confirm Password visibility"
                  >
                    {showConfirmPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2.5 rounded-xl bg-[#D84E68] hover:bg-[#C23C56] text-white font-bold text-xs shadow-md shadow-[#D84E68]/20 transition disabled:opacity-50 cursor-pointer mt-3"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* 2. Appearance Card */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7E0]">
              <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                <HiOutlineSun className="text-base" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#29252A]">Appearance</h2>
                <p className="text-[11px] text-[#8C8490]">Customize your app appearance.</p>
              </div>
            </div>

            <div className="pt-1 text-xs">
              <label className="block text-[11px] font-bold text-[#8C8490] mb-1.5">Theme</label>
              <div className="relative">
                <select
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    toast.info(`Theme set to ${e.target.value}`);
                  }}
                  className="w-full p-2.5 pr-10 rounded-xl border border-[#EAE3DC] bg-[#FAF8F6] text-[#29252A] font-medium text-xs focus:bg-white focus:outline-none focus:border-[#D84E68] cursor-pointer appearance-none"
                >
                  <option value="Light (Default)">Light (Default)</option>
                  <option value="Dark Mode">Dark Mode</option>
                  <option value="Warm Plum">Warm Plum</option>
                  <option value="System">System Default</option>
                </select>
                <div className="absolute right-3.5 top-3 pointer-events-none text-[#8C8490]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Account Actions Card (Matching screenshot) */}
          <div className="bg-white rounded-2xl border border-[#EFE7E0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7E0]">
              <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                <HiOutlineShieldCheck className="text-base" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#29252A]">Account Actions</h2>
                <p className="text-[11px] text-[#8C8490]">Manage your account actions.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#E5A8AD] bg-white text-[#D84E68] hover:bg-[#FDECEF] font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <HiOutlineLogout className="text-base text-[#D84E68]" />
                <span>Logout</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#D84E68] hover:bg-[#C23C56] text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                <HiOutlineTrash className="text-base text-white" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-[#29252A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EFE7E0] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE7E0]">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <HiOutlineTrash />
                <span>Confirm Account Deletion</span>
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>
            <p className="text-xs text-[#6B666E] leading-relaxed">
              This action is permanent and cannot be undone. All your reported issues and profile data will be permanently disabled.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-[#8C8490] mb-1">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2.5 rounded-xl border border-rose-300 text-xs font-bold text-rose-700 bg-rose-50/50 uppercase tracking-wider"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText !== 'DELETE' || deletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
