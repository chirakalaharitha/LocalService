import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineLocationMarker
} from 'react-icons/hi';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || ''
  });

  const [notifPrefs, setNotifPrefs] = useState({
    inAppNotifications: true,
    emailAlerts: true
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [prefsMsg, setPrefsMsg] = useState('');
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Load preferences directly from MongoDB
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await API.get('/users/me/notification-preferences');
        if (res.data?.success && res.data?.preferences) {
          setNotifPrefs({
            inAppNotifications: res.data.preferences.inAppNotifications ?? true,
            emailAlerts: res.data.preferences.emailAlerts ?? true
          });
        } else if (user?.notificationPreferences) {
          setNotifPrefs({
            inAppNotifications: user.notificationPreferences.inAppNotifications ?? user.notificationPreferences.push ?? true,
            emailAlerts: user.notificationPreferences.emailAlerts ?? user.notificationPreferences.email ?? true
          });
        }
      } catch (err) {
        // Fallback to user object if endpoint returns an error
        if (user?.notificationPreferences) {
          setNotifPrefs({
            inAppNotifications: user.notificationPreferences.inAppNotifications ?? user.notificationPreferences.push ?? true,
            emailAlerts: user.notificationPreferences.emailAlerts ?? user.notificationPreferences.email ?? true
          });
        }
      } finally {
        setLoadingPrefs(false);
      }
    };

    if (user) {
      loadPreferences();
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await updateProfile(formData);
      if (res.success) {
        setProfileMsg('Profile details updated successfully!');
      } else {
        setProfileMsg('Failed to update profile.');
      }
    } catch (err) {
      setProfileMsg('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key]
    };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    setPrefsMsg('');

    try {
      const res = await API.patch('/users/me/notification-preferences', updated);
      if (res.data?.success) {
        setPrefsMsg('Notification preferences saved to database.');
      } else {
        setPrefsMsg('Failed to save preferences.');
      }
    } catch (err) {
      console.error('[ProfilePage] Error saving notification preferences:', err);
      setPrefsMsg('Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <HiOutlineUser className="text-blue-400" />
          <span>Account Profile & Preferences</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage personal contact info, regional location, and automated notification alerts
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
          <HiOutlineLocationMarker className="text-teal-400" />
          <span>Personal Information</span>
        </h2>

        {profileMsg && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            {profileMsg}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address (Read-only)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HiOutlineBell className="text-xl text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">Notification Preferences</h2>
              <p className="text-[11px] text-slate-400">Configure how you receive real-time updates and emails</p>
            </div>
          </div>

          {savingPrefs && (
            <span className="text-[11px] text-blue-400 font-medium animate-pulse">
              Saving to database...
            </span>
          )}
        </div>

        {prefsMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <HiOutlineCheck className="text-emerald-400 text-base" />
            <span>{prefsMsg}</span>
          </div>
        )}

        {loadingPrefs ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Loading saved preferences...
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-800/60 pt-1">
            
            {/* In-App Notifications Toggle */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">In-App Notifications</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Receive live alerts in the navigation bell and instant toast banners
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference('inAppNotifications')}
                className={`relative inline-flex h-6 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.inAppNotifications ? 'bg-blue-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={notifPrefs.inAppNotifications}
                aria-label="Toggle in-app notifications"
              >
                <span
                  className={`pointer-events-none inline-flex h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out items-center justify-center text-[9px] font-bold ${
                    notifPrefs.inAppNotifications
                      ? 'translate-x-8 text-blue-600'
                      : 'translate-x-0 text-slate-600'
                  }`}
                >
                  {notifPrefs.inAppNotifications ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Email Notifications Toggle */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Email Notifications</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Receive email notifications for request status changes and assignments
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference('emailAlerts')}
                className={`relative inline-flex h-6 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.emailAlerts ? 'bg-blue-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={notifPrefs.emailAlerts}
                aria-label="Toggle email notifications"
              >
                <span
                  className={`pointer-events-none inline-flex h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out items-center justify-center text-[9px] font-bold ${
                    notifPrefs.emailAlerts
                      ? 'translate-x-8 text-blue-600'
                      : 'translate-x-0 text-slate-600'
                  }`}
                >
                  {notifPrefs.emailAlerts ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default ProfilePage;
