import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from 'react-toastify';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineTrash
} from 'react-icons/hi';
import { getProfileImageUrl } from '../utils/imageUrl';

// Delicate botanical/floral watermark matching the design system
const FloralWatermark = ({ className = "w-32 h-32" }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
  >
    <path
      d="M190 190 C150 150 120 160 90 190"
      stroke="#C65F63"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeOpacity="0.3"
    />
    <path
      d="M170 170 C140 120 100 130 60 170"
      stroke="#C65F63"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.25"
    />
    <path
      d="M140 140 C120 90 90 90 40 130"
      stroke="#6B4E71"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeOpacity="0.2"
    />
    <path
      d="M110 110 C80 60 60 70 20 90"
      stroke="#6B4E71"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.2"
    />
    <ellipse cx="145" cy="115" rx="14" ry="7" transform="rotate(-35 145 115)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="115" cy="85" rx="12" ry="6" transform="rotate(-40 115 85)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="85" cy="65" rx="10" ry="5" transform="rotate(-45 85 65)" fill="#E8D7E6" stroke="#6B4E71" strokeWidth="1.2" strokeOpacity="0.4" />
    <ellipse cx="170" cy="145" rx="14" ry="7" transform="rotate(-30 170 145)" fill="#FDECEF" stroke="#C65F63" strokeWidth="1.2" strokeOpacity="0.4" />
    <circle cx="145" cy="115" r="2.5" fill="#C65F63" fillOpacity="0.4" />
    <circle cx="115" cy="85" r="2" fill="#C65F63" fillOpacity="0.4" />
    <circle cx="85" cy="65" r="1.8" fill="#6B4E71" fillOpacity="0.4" />
  </svg>
);

const ProfilePage = () => {
  const { user, updateProfile, updateUser } = useAuth();
  const [profileUser, setProfileUser] = useState(user);
  const [imgError, setImgError] = useState(false);

  // Always fetch fresh profile from MongoDB to avoid stale cache or missing department/jurisdiction details
  useEffect(() => {
    let isMounted = true;
    const fetchFreshUser = async () => {
      try {
        const res = await API.get('/auth/me');
        if (res.data?.success && res.data.user && isMounted) {
          setProfileUser(res.data.user);
          if (updateUser) {
            updateUser(res.data.user);
          }
        }
      } catch (err) {
        console.error('Failed to load fresh user data', err);
      }
    };
    fetchFreshUser();

    const socket = getSocket();
    const handleUserUpdate = () => {
      fetchFreshUser();
    };
    socket.on('user:updated', handleUserUpdate);

    return () => {
      isMounted = false;
      socket.off('user:updated', handleUserUpdate);
    };
  }, []);

  const activeUser = profileUser || user;

  const [formData, setFormData] = useState({
    name: activeUser?.name || '',
    phone: activeUser?.phone || '',
    address: activeUser?.address || '',
    city: activeUser?.city || '',
    state: activeUser?.state || 'Andhra Pradesh',
    pincode: activeUser?.pincode || ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Sync form data whenever activeUser updates
  useEffect(() => {
    if (activeUser) {
      setFormData({
        name: activeUser.name || '',
        phone: activeUser.phone || '',
        address: activeUser.address || '',
        city: activeUser.city || '',
        state: activeUser.state || 'Andhra Pradesh',
        pincode: activeUser.pincode || ''
      });
    }
  }, [activeUser]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile(formData);
      if (res.success) {
        toast.success('Profile details updated successfully!');
        setIsEditing(false);
        // Refresh local state with updated response
        if (res.user) {
          setProfileUser(res.user);
        }
      } else {
        toast.error('Failed to update profile.');
      }
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('profileImage', file);
    setUploadingPhoto(true);

    try {
      const res = await API.post('/auth/profile-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        toast.success('Profile photo updated!');
        const newImg = res.data.profileImage || res.data.user?.profileImage;
        if (newImg) {
          setProfileUser(prev => ({ ...prev, profileImage: newImg }));
          if (updateUser) {
            updateUser({ profileImage: newImg });
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const res = await API.delete('/auth/profile-image');
      if (res.data?.success) {
        toast.success('Profile photo removed!');
        setProfileUser(prev => ({ ...prev, profileImage: '' }));
        if (updateUser) {
          updateUser({ profileImage: '' });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isStaff = (activeUser?.role || '').toUpperCase() === 'STAFF';

  const joinedDate = activeUser?.createdAt
    ? new Date(activeUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const jurisdictionName = activeUser?.municipality?.name || activeUser?.municipality?.city || activeUser?.city || 'Jurisdiction not assigned';

  const avatarInitials = activeUser?.name?.trim()
    ? activeUser.name.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase()
    : 'LF';

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#29252A] tracking-tight">
          My Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#7D7682] font-medium mt-0.5">
          Manage your personal information, address, and account details.
        </p>
      </div>

      {/* Grid: Left Avatar Card + Right Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Avatar & Account Summary Card (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#EFE7E0] p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col items-center text-center">
            {/* Avatar Circle with Soft Tinted Ring */}
            <div className="relative w-28 h-28 rounded-full p-1.5 bg-[#FAF5F0] border-2 border-[#FDECEF] shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FDECEF] flex items-center justify-center text-3xl font-black text-[#C65F63]">
                {activeUser?.profileImage && !imgError ? (
                  <img
                    src={getProfileImageUrl(activeUser.profileImage)}
                    alt={activeUser.name || 'User'}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  avatarInitials
                )}
              </div>
            </div>

            {/* Change / Remove Photo Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FAF5F0] hover:bg-[#FDECEF] text-[#C65F63] border border-[#EFE7E0] text-[11px] font-bold transition shadow-2xs">
                <HiOutlineCamera className="text-xs" />
                <span>{uploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>

              {activeUser?.profileImage && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF5F0] hover:bg-red-50 text-red-600 border border-[#EFE7E0] text-[11px] font-bold transition shadow-2xs"
                  title="Remove profile photo"
                >
                  <HiOutlineTrash className="text-xs" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {/* User Name & Role */}
            <h2 className="text-lg font-extrabold text-[#29252A] mt-3">
              {activeUser?.name || 'User'}
            </h2>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20 mt-1">
              <HiOutlineUser className="text-xs" />
              <span className="capitalize">{activeUser?.role ? activeUser.role.toLowerCase() : 'citizen'}</span>
            </div>

            <div className="text-[11px] text-[#8C8490] font-medium mt-1">
              Member since: {joinedDate}
            </div>
          </div>

          {/* Account Information Box inside left card */}
          <div className="mt-6 pt-5 border-t border-[#EFE7E0] space-y-2.5 text-xs">
            <div className="text-[11px] font-bold text-[#29252A] uppercase tracking-wider mb-2">
              Account Information
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-[#8C8490]">Role:</span>
              <span className="font-bold text-[#29252A] capitalize">
                {activeUser?.role ? activeUser.role.toLowerCase() : 'citizen'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-[#8C8490]">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeUser?.isActive !== false
                  ? 'bg-emerald-50 text-[#5C9A72] border border-emerald-200'
                  : 'bg-rose-50 text-[#B85450] border border-rose-200'
              }`}>
                {activeUser?.isActive !== false ? 'Active' : 'Suspended'}
              </span>
            </div>

            {!isStaff && (
              <div className="flex justify-between items-center py-1">
                <span className="text-[#8C8490]">Jurisdiction:</span>
                <span className="font-bold text-[#29252A] truncate max-w-[150px]" title={jurisdictionName}>
                  {jurisdictionName}
                </span>
              </div>
            )}
          </div>

          {/* Floral graphic watermark at bottom left of card */}
          <div className="absolute -bottom-6 -left-6 pointer-events-none">
            <FloralWatermark className="w-28 h-28 transform scale-x-[-1]" />
          </div>
        </div>

        {/* RIGHT COLUMN: Work Information (for Staff), Personal Info & Contact Info */}
        <div className="lg:col-span-8 space-y-6">


          {/* Personal Information Card */}
          <div className="bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7E0]">
              <div className="flex items-center gap-2">
                <HiOutlineUser className="text-lg text-[#C65F63]" />
                <h3 className="text-base font-extrabold text-[#29252A]">
                  Personal Information
                </h3>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <HiOutlinePencil className="text-sm" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: activeUser?.name || '',
                        phone: activeUser?.phone || '',
                        address: activeUser?.address || '',
                        city: activeUser?.city || '',
                        state: activeUser?.state || 'Andhra Pradesh',
                        pincode: activeUser?.pincode || ''
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#29252A] text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="personal-info-form"
                    disabled={savingProfile}
                    className="px-4 py-1.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <form id="personal-info-form" onSubmit={handleProfileSubmit} className="space-y-3.5 text-xs pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={activeUser?.email || ''}
                    className="w-full bg-[#FAF6F2] border border-[#EFE7E0] rounded-xl p-2.5 text-[#8C8490] cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">City / Town</label>
                  <input
                    type="text"
                    value={formData.city}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    readOnly={!isEditing}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 12-4-123, Brodipet, Guntur"
                    className={`w-full border rounded-xl p-2.5 text-[#29252A] font-medium focus:outline-none transition ${
                      isEditing
                        ? 'bg-white border-[#C65F63] shadow-2xs'
                        : 'bg-[#FAF6F2] border-[#EFE7E0]'
                    }`}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EFE7E0]">
              <HiOutlineMail className="text-lg text-[#C65F63]" />
              <h3 className="text-base font-extrabold text-[#29252A]">
                Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Email</label>
                <div className="p-2.5 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] text-[#29252A] font-medium truncate">
                  {activeUser?.email || '—'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8490] mb-1">Phone</label>
                <div className="p-2.5 bg-[#FAF6F2] rounded-xl border border-[#EFE7E0] text-[#29252A] font-medium">
                  {formData.phone || activeUser?.phone || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
