import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
  HiOutlineLockClosed,
  HiOutlineBell,
  HiOutlineSave
} from 'react-icons/hi';

const StaffSettingsPage = () => {
  const { user, updateUser } = useAuth();

  const [activeDuty, setActiveDuty] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyApp, setNotifyApp] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.warning('Please enter current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await API.patch('/users/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
          Staff Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
          Manage your field account, duty schedule and notification preferences.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#29252A] border-b border-[#EFE7E0] pb-3">
          Officer Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-bold text-[#8C8490] uppercase block mb-1">
              Full Name
            </span>
            <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] font-semibold text-[#29252A] flex items-center gap-2">
              <HiOutlineUser className="text-base text-[#C65F63]" />
              <span>{user?.name || '—'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#8C8490] uppercase block mb-1">
              Official Email
            </span>
            <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] font-semibold text-[#29252A] flex items-center gap-2">
              <HiOutlineMail className="text-base text-[#C65F63]" />
              <span>{user?.email || '—'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#8C8490] uppercase block mb-1">
              Department
            </span>
            <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] font-semibold text-[#29252A] flex items-center gap-2">
              <HiOutlineOfficeBuilding className="text-base text-[#C65F63]" />
              <span>{user?.department?.name || 'Department not assigned'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#8C8490] uppercase block mb-1">
              Phone Number
            </span>
            <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] font-semibold text-[#29252A] flex items-center gap-2">
              <HiOutlinePhone className="text-base text-[#C65F63]" />
              <span>{user?.phone || '—'}</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[11px] font-bold text-[#8C8490] uppercase block mb-1">
              Assigned Municipality / Jurisdiction
            </span>
            <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] font-semibold text-[#29252A] flex items-center gap-2">
              <HiOutlineOfficeBuilding className="text-base text-[#C65F63]" />
              <span>{user?.municipality?.name || user?.city || 'Jurisdiction not assigned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Duty Status & Notifications Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#29252A] border-b border-[#EFE7E0] pb-3">
          Field Operations & Dispatch Alerts
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EFE7E0]">
            <div>
              <div className="font-bold text-[#29252A]">Active Field Duty Status</div>
              <div className="text-[11px] text-[#8C8490]">Available for automated issue assignments and urgent dispatch.</div>
            </div>
            <input
              type="checkbox"
              checked={activeDuty}
              onChange={(e) => {
                setActiveDuty(e.target.checked);
                toast.info(`Field Duty status: ${e.target.checked ? 'Active' : 'Standby'}`);
              }}
              className="w-4 h-4 accent-[#C65F63] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EFE7E0]">
            <div>
              <div className="font-bold text-[#29252A]">Critical SLA Breach Alerts</div>
              <div className="text-[11px] text-[#8C8490]">Receive immediate SMS and notification when a task is near breach.</div>
            </div>
            <input
              type="checkbox"
              checked={notifySms}
              onChange={(e) => setNotifySms(e.target.checked)}
              className="w-4 h-4 accent-[#C65F63] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EFE7E0]">
            <div>
              <div className="font-bold text-[#29252A]">Daily Summary Digest</div>
              <div className="text-[11px] text-[#8C8490]">Receive email morning report with all pending requests.</div>
            </div>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="w-4 h-4 accent-[#C65F63] rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#29252A] border-b border-[#EFE7E0] pb-3">
          Change Account Password
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-[11px] font-bold text-[#8C8490] uppercase mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] focus:bg-white focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8C8490] uppercase mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] focus:bg-white focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8C8490] uppercase mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full p-2.5 rounded-xl border border-[#EFE7E0] bg-[#FAF6F2] focus:bg-white focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <HiOutlineSave className="text-base" />
            <span>{savingPassword ? 'Saving...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* Account Actions Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-[#EFE7E0]">
          <div className="w-8 h-8 rounded-full bg-[#361E38] text-white flex items-center justify-center text-base shrink-0 shadow-xs">
            <HiOutlineSave className="hidden" />
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#29252A]">Account Actions</h2>
            <p className="text-[11px] text-[#8C8490]">Manage your account actions.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
          <button
            type="button"
            onClick={() => {
              const { logout } = useAuth;
              window.location.href = '/login';
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#E5A8AD] text-[#C65F63] hover:bg-[#FDECEF] font-bold text-xs transition cursor-pointer shadow-xs"
          >
            <span>Logout</span>
          </button>

          <button
            type="button"
            onClick={() => toast.info('Staff account deletion requires administrator approval.')}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffSettingsPage;
