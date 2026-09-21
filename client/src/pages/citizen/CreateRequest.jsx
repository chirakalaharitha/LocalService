import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import LocationPicker from '../../components/location/LocationPicker';
import { HiOutlinePhotograph, HiOutlineExclamationCircle, HiOutlineSparkles, HiOutlineCheck, HiOutlineOfficeBuilding } from 'react-icons/hi';

const categories = [
  { value: 'WATER', label: 'Water Leakage / Supply Issue' },
  { value: 'ELECTRICITY', label: 'Electricity & Power Problems' },
  { value: 'ROAD', label: 'Road Damage & Potholes' },
  { value: 'STREET_LIGHT', label: 'Street Light Failures' },
  { value: 'GARBAGE', label: 'Garbage & Sanitation' },
  { value: 'DRAINAGE', label: 'Drainage & Sewage Leaks' },
  { value: 'PUBLIC_AREA', label: 'Public Area Maintenance' },
  { value: 'OTHER', label: 'Other Civic Problems' }
];

const CreateRequest = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'WATER',
    priority: 'MEDIUM'
  });

  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMuniId, setSelectedMuniId] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const [location, setLocation] = useState(null); // { lat, lng, address, city, state, pincode, accuracy }
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Duplicate Check Modal State
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    API.get('/municipalities')
      .then(res => {
        if (res.data.success && res.data.municipalities) {
          setMunicipalities(res.data.municipalities);
          if (res.data.municipalities.length > 0) {
            setSelectedMuniId(res.data.municipalities[0]._id);
          }
        }
      })
      .catch(err => console.error("Error fetching municipalities:", err));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  // Perform Duplicate Check before submitting
  const checkDuplicates = async () => {
    if (!location?.lat || !location?.lng) return false;
    try {
      const res = await API.get('/requests/nearby', {
        params: {
          latitude: location.lat,
          longitude: location.lng,
          category: formData.category
        }
      });
      if (res.data.success && (res.data.hasDuplicates || res.data.possibleDuplicate)) {
        const matches = res.data.nearby || res.data.matches || [];
        if (matches.length > 0) {
          setDuplicates(matches);
          setShowDuplicateModal(true);
          return true;
        }
      }
    } catch (err) {
      console.error("Duplicate check error:", err);
    }
    return false;
  };

  const executeSubmission = async () => {
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);
      data.append('priority', formData.priority);
      data.append('address', location.address.trim());
      data.append('city', location.city || '');
      data.append('state', location.state || '');
      data.append('pincode', location.pincode || '');
      data.append('latitude', location.lat);
      data.append('longitude', location.lng);
      if (selectedMuniId) data.append('municipalityId', selectedMuniId);
      if (selectedWard) data.append('ward', selectedWard);

      images.forEach(img => {
        data.append('images', img);
      });

      const res = await API.post('/requests', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        navigate(`/requests/${res.data.request._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit service request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setError('Please fill in title and detailed description.');
      return;
    }

    if (!location || location.lat === null || location.lng === null || !location.address?.trim()) {
      setError('Please select and confirm the location of the issue.');
      return;
    }

    const hasDupes = await checkDuplicates();
    if (!hasDupes) {
      await executeSubmission();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Report a Local Service Problem</h1>
        <p className="text-xs text-slate-400 mt-1">Submit civic complaints with accurate location mapping and proof photos</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        
        {/* Title & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Problem Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Severe water pipeline leakage on main road"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Municipal Jurisdiction & Ward Selection */}
        {municipalities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <HiOutlineOfficeBuilding className="text-teal-400 text-sm" />
                <span>Municipal Jurisdiction *</span>
              </label>
              <select
                value={selectedMuniId}
                onChange={(e) => {
                  setSelectedMuniId(e.target.value);
                  setSelectedWard('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {municipalities.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Ward / Service Area (Optional)
              </label>
              {(() => {
                const currentMuni = municipalities.find(m => m._id === selectedMuniId);
                const wards = currentMuni?.wards || [];
                return (
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Detect from GPS / Central --</option>
                    {wards.map(w => (
                      <option key={w.wardNumber} value={w.wardNumber}>
                        {w.wardNumber} - {w.name} ({w.zone || 'Zone'})
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>
        )}

        {/* Description & Citizen Urgency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Detailed Problem Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the issue, landmarks, hazard level, and how long it has been present..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Perceived Urgency
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">Low - General Maintenance</option>
              <option value="MEDIUM">Medium - Normal Attention</option>
              <option value="HIGH">High - Severe Impact</option>
              <option value="CRITICAL">Critical - Immediate Hazard</option>
            </select>
            <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-1.5">
              <HiOutlineSparkles className="text-sm shrink-0 mt-0.5" />
              <span>Smart engine auto-calculates final priority based on keyword & hazard analysis.</span>
            </div>
          </div>
        </div>

        {/* Location Picker Section */}
        <div className="pt-2 border-t border-slate-800">
          <LocationPicker location={location} onChange={setLocation} />
        </div>

        {/* File Image Upload */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Upload Problem Photos (Optional, Max 5)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition disabled:opacity-50"
        >
          {loading ? 'Submitting Request...' : 'Submit Service Request'}
        </button>
      </form>

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
              <HiOutlineExclamationCircle className="text-2xl" />
              <span>Similar Issue Already Reported Nearby</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              We detected <span className="font-bold text-white">{duplicates.length}</span> active report(s) in this immediate vicinity under the same category.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {duplicates.map((d) => (
                <div key={d._id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-blue-400">{d.requestId}: {d.title}</div>
                  <div className="text-[11px] text-slate-400">{d.address} • Status: {d.status}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              Would you like to support the existing report to boost its priority, or continue creating a new request?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  navigate(`/requests/${duplicates[0]._id}`);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                View Existing Issue
              </button>

              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  executeSubmission();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition"
              >
                Continue Creating New
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreateRequest;

