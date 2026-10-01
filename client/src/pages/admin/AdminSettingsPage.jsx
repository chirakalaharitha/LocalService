import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { toast } from 'react-toastify';
import {
  HiOutlineCog,
  HiOutlineShieldCheck,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineSave,
  HiOutlineRefresh,
  HiOutlineServer,
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi';

const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [muniSaving, setMuniSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  const [municipality, setMunicipality] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    country: 'India',
    contactPhone: '',
    contactEmail: '',
    pincodes: [],
    wards: []
  });
  const [newPincode, setNewPincode] = useState('');
  const [newWard, setNewWard] = useState({ wardNumber: '', name: '', zone: '' });

  const [settings, setSettings] = useState({
    appName: 'LocalFix',
    tagline: 'Smart Local Service Request & Tracking Platform',
    contactEmail: 'support@localfix.gov',
    enableEmailNotifications: true,
    enableInAppNotifications: true,
    maintenanceMode: false,
    maintenanceMessage: 'LocalFix is undergoing scheduled maintenance. Please check back shortly.',
    defaultPageSize: 10,
    slaTargets: {
      CRITICAL: 4,
      HIGH: 12,
      MEDIUM: 24,
      LOW: 72
    },
    supportedCategories: []
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [res, muniRes] = await Promise.all([
        API.get('/admin/settings'),
        API.get('/admin/municipality')
      ]);
      if (res.data.success) {
        setSettings(res.data.settings);
        setEmailStatus(res.data.emailConfigStatus);
      }
      if (muniRes.data.success && muniRes.data.municipality) {
        setMunicipality(muniRes.data.municipality);
      }
    } catch (err) {
      toast.error('Failed to load system settings from server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/admin/settings', settings);
      if (res.data.success) {
        toast.success('System settings saved successfully!');
        setSettings(res.data.settings);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMunicipality = async (e) => {
    e.preventDefault();
    setMuniSaving(true);
    try {
      const res = await API.put('/admin/municipality', municipality);
      if (res.data.success) {
        toast.success(res.data.message || 'Municipal jurisdiction settings saved!');
        if (res.data.municipality) {
          setMunicipality(res.data.municipality);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update municipality settings.');
    } finally {
      setMuniSaving(false);
    }
  };

  const handleAddPincode = (e) => {
    e.preventDefault();
    const code = newPincode.trim();
    if (!code) return;
    if (municipality.pincodes?.includes(code)) {
      toast.info('Pincode already added.');
      return;
    }
    setMunicipality(prev => ({
      ...prev,
      pincodes: [...(prev.pincodes || []), code]
    }));
    setNewPincode('');
  };

  const handleRemovePincode = (code) => {
    setMunicipality(prev => ({
      ...prev,
      pincodes: (prev.pincodes || []).filter(p => p !== code)
    }));
  };

  const handleAddWard = (e) => {
    e.preventDefault();
    if (!newWard.wardNumber.trim() || !newWard.name.trim()) {
      toast.error('Ward Number and Name are required.');
      return;
    }
    setMunicipality(prev => ({
      ...prev,
      wards: [...(prev.wards || []), { ...newWard }]
    }));
    setNewWard({ wardNumber: '', name: '', zone: '' });
  };

  const handleRemoveWard = (idx) => {
    setMunicipality(prev => ({
      ...prev,
      wards: (prev.wards || []).filter((_, i) => i !== idx)
    }));
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-[#6B4E71] animate-pulse">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#EFE7E0] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#29252A] tracking-tight flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center">
              <HiOutlineCog className="text-xl" />
            </div>
            <span>Administrative System Settings</span>
          </h1>
          <p className="text-xs text-[#6B4E71] mt-1">
            Configure municipal jurisdiction, service areas, global application identity & operational parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] text-xs font-semibold border border-[#EFE7E0] transition"
          >
            <HiOutlineRefresh className="text-base" />
            <span>Discard Changes</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#b25155] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <HiOutlineSave className="text-base" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Section 0: Municipal Jurisdiction Configuration */}
      <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7E0] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2">
              <HiOutlineOfficeBuilding className="text-[#C65F63] text-lg" />
              <span>Municipal Jurisdiction & Ward Boundaries</span>
            </h2>
            <p className="text-xs text-[#6B4E71] mt-0.5">
              Configure your civic administrative jurisdiction, recognized postal codes, and service wards
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveMunicipality}
            disabled={muniSaving}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6B4E71] hover:bg-[#583f5e] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <HiOutlineSave className="text-sm" />
            <span>{muniSaving ? 'Saving...' : 'Save Jurisdiction'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Municipality Name *</label>
            <input
              type="text"
              required
              value={municipality.name || ''}
              onChange={(e) => setMunicipality({ ...municipality, name: e.target.value })}
              placeholder="e.g. Guntur Municipal Corporation"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Jurisdiction Code *</label>
            <input
              type="text"
              required
              value={municipality.code || ''}
              onChange={(e) => setMunicipality({ ...municipality, code: e.target.value.toUpperCase() })}
              placeholder="e.g. GMC-01"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] uppercase font-mono focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">City *</label>
            <input
              type="text"
              required
              value={municipality.city || ''}
              onChange={(e) => setMunicipality({ ...municipality, city: e.target.value })}
              placeholder="e.g. Guntur"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">State</label>
            <input
              type="text"
              value={municipality.state || ''}
              onChange={(e) => setMunicipality({ ...municipality, state: e.target.value })}
              placeholder="e.g. Andhra Pradesh"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Official Municipal Hotline</label>
            <input
              type="text"
              value={municipality.contactPhone || ''}
              onChange={(e) => setMunicipality({ ...municipality, contactPhone: e.target.value })}
              placeholder="e.g. 0863-2224202"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Commissioner / Support Email</label>
            <input
              type="email"
              value={municipality.contactEmail || ''}
              onChange={(e) => setMunicipality({ ...municipality, contactEmail: e.target.value })}
              placeholder="commissioner@gunturcorporation.org"
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>
        </div>

        {/* Recognized Pincodes Chips */}
        <div className="pt-2 border-t border-[#EFE7E0]">
          <label className="block text-xs font-semibold text-[#29252A] mb-2">
            Jurisdiction Postal Pincodes:
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {municipality.pincodes?.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF5F0] border border-[#EFE7E0] rounded-lg text-xs font-mono text-[#6B4E71]"
              >
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePincode(p)}
                  className="text-[#6B4E71]/60 hover:text-red-600 transition"
                >
                  ×
                </button>
              </span>
            ))}
            {(!municipality.pincodes || municipality.pincodes.length === 0) && (
              <span className="text-xs text-[#6B4E71]/70 italic">No specific pincodes added.</span>
            )}
          </div>
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value)}
              placeholder="Add pincode e.g. 522002"
              className="flex-1 bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] font-mono"
            />
            <button
              type="button"
              onClick={handleAddPincode}
              className="px-3 py-1.5 rounded-xl bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#6B4E71] hover:text-[#C65F63] text-xs font-semibold border border-[#EFE7E0] transition"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Wards & Service Zones */}
        <div className="pt-2 border-t border-[#EFE7E0]">
          <label className="block text-xs font-semibold text-[#29252A] mb-2">
            Municipal Wards & Zones ({municipality.wards?.length || 0} configured):
          </label>
          <div className="max-h-60 overflow-y-auto mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {municipality.wards?.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#29252A]">{w.wardNumber}: {w.name}</div>
                    <div className="text-[10px] text-[#C65F63] font-medium">{w.zone || 'General Zone'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWard(idx)}
                    className="text-[#6B4E71]/60 hover:text-red-600 p-1 transition"
                  >
                    <HiOutlineTrash className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Ward Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#FAF5F0] p-3 rounded-xl border border-[#EFE7E0]">
            <input
              type="text"
              value={newWard.wardNumber}
              onChange={(e) => setNewWard({ ...newWard, wardNumber: e.target.value })}
              placeholder="Ward e.g. Ward 9"
              className="bg-white border border-[#EFE7E0] rounded-lg py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
            <input
              type="text"
              value={newWard.name}
              onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
              placeholder="Ward Name e.g. Nagarampalem"
              className="bg-white border border-[#EFE7E0] rounded-lg py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
            <input
              type="text"
              value={newWard.zone}
              onChange={(e) => setNewWard({ ...newWard, zone: e.target.value })}
              placeholder="Zone e.g. Central Zone"
              className="bg-white border border-[#EFE7E0] rounded-lg py-1.5 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
            <button
              type="button"
              onClick={handleAddWard}
              className="py-1.5 rounded-lg bg-[#6B4E71] hover:bg-[#583f5e] text-white text-xs font-semibold shadow-sm transition"
            >
              + Add Ward
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: General Platform Configuration */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2 border-b border-[#EFE7E0] pb-3">
            <HiOutlineServer className="text-[#C65F63] text-lg" />
            <span>Platform Identity & Defaults</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Application Name *</label>
              <input
                type="text"
                required
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Official Support / Contact Email *</label>
              <input
                type="email"
                required
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Platform Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Default Table Pagination Limit</label>
              <input
                type="number"
                min="5"
                max="100"
                value={settings.defaultPageSize}
                onChange={(e) => setSettings({ ...settings, defaultPageSize: parseInt(e.target.value) || 10 })}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: SLA Target Times */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2">
              <HiOutlineClock className="text-[#C65F63] text-lg" />
              <span>SLA Turnaround Deadlines (Target Resolution Hours)</span>
            </h2>
            <span className="text-[11px] text-[#6B4E71]">Enforced during request dispatch</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-red-600 uppercase">CRITICAL Priority</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={settings.slaTargets?.CRITICAL || 4}
                  onChange={(e) => setSettings({
                    ...settings,
                    slaTargets: { ...settings.slaTargets, CRITICAL: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 bg-white border border-red-300 rounded-lg py-1 px-2 text-xs text-[#29252A] font-bold text-center"
                />
                <span className="text-xs text-[#6B4E71]">Hours</span>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase">HIGH Priority</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={settings.slaTargets?.HIGH || 12}
                  onChange={(e) => setSettings({
                    ...settings,
                    slaTargets: { ...settings.slaTargets, HIGH: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 bg-white border border-amber-300 rounded-lg py-1 px-2 text-xs text-[#29252A] font-bold text-center"
                />
                <span className="text-xs text-[#6B4E71]">Hours</span>
              </div>
            </div>

            <div className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-[#6B4E71] uppercase">MEDIUM Priority</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={settings.slaTargets?.MEDIUM || 24}
                  onChange={(e) => setSettings({
                    ...settings,
                    slaTargets: { ...settings.slaTargets, MEDIUM: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 bg-white border border-[#EFE7E0] rounded-lg py-1 px-2 text-xs text-[#29252A] font-bold text-center"
                />
                <span className="text-xs text-[#6B4E71]">Hours</span>
              </div>
            </div>

            <div className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-[#6B4E71]/80 uppercase">LOW Priority</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={settings.slaTargets?.LOW || 72}
                  onChange={(e) => setSettings({
                    ...settings,
                    slaTargets: { ...settings.slaTargets, LOW: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 bg-white border border-[#EFE7E0] rounded-lg py-1 px-2 text-xs text-[#29252A] font-bold text-center"
                />
                <span className="text-xs text-[#6B4E71]">Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notification & Email Configuration Status */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2 border-b border-[#EFE7E0] pb-3">
            <HiOutlineMail className="text-[#C65F63] text-lg" />
            <span>Notification Delivery & Mail Transport</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0]">
              <div>
                <span className="text-xs font-bold text-[#29252A]">Email Notifications</span>
                <p className="text-[11px] text-[#6B4E71]">Send status updates & assignments via SMTP</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableEmailNotifications}
                onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                className="w-4 h-4 accent-[#C65F63] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0]">
              <div>
                <span className="text-xs font-bold text-[#29252A]">In-App Live Alerts</span>
                <p className="text-[11px] text-[#6B4E71]">Socket.IO real-time notification popups</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableInAppNotifications}
                onChange={(e) => setSettings({ ...settings, enableInAppNotifications: e.target.checked })}
                className="w-4 h-4 accent-[#C65F63] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Secure SMTP Status Display */}
          {emailStatus && (
            <div className="bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-[#29252A]">Email Infrastructure Status</div>
                <div className="text-[#6B4E71] text-[11px]">
                  Host: <span className="text-[#29252A] font-mono">{emailStatus.host}</span> • Port: <span className="font-mono">{emailStatus.port}</span> • Sender: <span className="font-mono">{emailStatus.from}</span>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                emailStatus.isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {emailStatus.isConfigured ? 'Production SMTP Live' : 'Dev Simulation Mode'}
              </span>
            </div>
          )}
        </div>

        {/* Section 4: Maintenance Mode */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2">
              <HiOutlineExclamation className="text-[#C65F63] text-lg" />
              <span>Platform Maintenance Mode</span>
            </h2>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#EFE7E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C65F63]"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B4E71] mb-1">Maintenance Broadcast Message</label>
            <textarea
              rows="2"
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl py-2 px-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
            />
          </div>
        </div>

        {/* Section 5: Civic Service Categories Overview */}
        <div className="bg-white border border-[#EFE7E0] rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
            <h2 className="text-sm font-bold text-[#29252A] flex items-center gap-2">
              <HiOutlineShieldCheck className="text-[#C65F63] text-lg" />
              <span>Supported Civic Categories</span>
            </h2>
            <span className="text-[11px] text-[#6B4E71]">8 Pre-configured Municipal Domains</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {settings.supportedCategories?.map((cat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-[#29252A]">{cat.name}</div>
                  <div className="text-[10px] text-[#C65F63] font-mono">{cat.code}</div>
                </div>

                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            ))}
          </div>
        </div>

      </form>
    </div>
  );
};

export default AdminSettingsPage;
