import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API from '../../services/api';
import MapView from '../../components/location/MapView';
import LocationSearch from '../../components/location/LocationSearch';
import { reverseGeocode } from '../../services/locationService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  HiOutlineLocationMarker,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineOfficeBuilding,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineBell,
  HiOutlineGlobe
} from 'react-icons/hi';

const CATEGORIES = [
  { value: 'ROAD', label: 'Road & Pothole', icon: '🛣️', desc: 'Fix potholes, damaged asphalt and road issues.' },
  { value: 'WATER', label: 'Water Supply', icon: '💧', desc: 'Water leakage, low pressure and supply issues.' },
  { value: 'STREET_LIGHT', label: 'Streetlight', icon: '💡', desc: 'Streetlight not working, damaged or blinking.' },
  { value: 'DRAINAGE', label: 'Drainage', icon: '🌊', desc: 'Blocked drains, sewer leaks and wastewater.' },
  { value: 'GARBAGE', label: 'Garbage & Sanitation', icon: '🗑️', desc: 'Uncollected waste, overflowing community bins.' },
  { value: 'PUBLIC_AREA', label: 'Parks & Greenery', icon: '🌳', desc: 'Park maintenance, fallen trees and public areas.' },
  { value: 'OTHER', label: 'Traffic / Road Sign', icon: '🚦', desc: 'Damaged traffic signals, missing signboards.' },
  { value: 'OTHER', label: 'Stray Animal', icon: '🐕', desc: 'Report stray animals and public safety concerns.' },
  { value: 'OTHER', label: 'Other Civic Issue', icon: '🏛️', desc: 'General civic or municipal maintenance issues.' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', desc: 'Within 72 Hours', color: 'border-slate-300 text-slate-700 hover:border-[#6B4E71]' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Within 24 Hours', color: 'border-blue-300 text-blue-700 hover:border-[#C65F63]' },
  { value: 'HIGH', label: 'High', desc: 'Within 12 Hours', color: 'border-amber-300 text-amber-700 hover:border-[#C65F63]' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Within 4 Hours', color: 'border-rose-300 text-rose-700 hover:border-rose-600' }
];

const CreateRequest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard Step: 1 = Location & Municipality, 2 = Issue Details, 3 = Media & Priority, 4 = Review & Submit
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Location & Municipality States
  const [locationTab, setLocationTab] = useState('pincode'); // 'pincode' | 'city' | 'gps' | 'map' | 'address'
  const [pincodeInput, setPincodeInput] = useState('522265');
  const [cityInput, setCityInput] = useState('');
  const [location, setLocation] = useState({
    lat: 16.0200,
    lng: 80.8500,
    address: 'Station Road, Repalle',
    city: 'Repalle',
    district: 'Bapatla',
    state: 'Andhra Pradesh',
    pincode: '522265'
  });
  const [municipalities, setMunicipalities] = useState([]);
  const [detectedMunicipality, setDetectedMunicipality] = useState(null);
  const [resolutionMeta, setResolutionMeta] = useState(null);
  const [resolvingMuni, setResolvingMuni] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedMuniId, setSelectedMuniId] = useState('');

  // Step 2: Issue Details States
  const [category, setCategory] = useState('STREET_LIGHT');
  const [title, setTitle] = useState('Streetlight not working');
  const [description, setDescription] = useState(
    'Streetlight is not working on the main road near the park, creating safety issues at night.'
  );

  // Step 3: Media & Priority States
  const [images, setImages] = useState([]); // File objects
  const [imagePreviews, setImagePreviews] = useState([]); // Object URLs
  const [priority, setPriority] = useState('MEDIUM');
  const [duplicateCheckStatus, setDuplicateCheckStatus] = useState(null); // null | 'checking' | 'clean' | 'duplicates_found'
  const [duplicateMatches, setDuplicateMatches] = useState([]);

  // Step 4 & Submit States
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null); // null | { requestId, municipalityName, status }
  const [errorMsg, setErrorMsg] = useState('');

  // Read preselected category from URL params or location state
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setCategory(cat.toUpperCase());
    }
  }, [searchParams]);

  // Load active municipalities
  useEffect(() => {
    API.get('/municipalities')
      .then((res) => {
        if (res.data.success && res.data.municipalities) {
          setMunicipalities(res.data.municipalities);
        }
      })
      .catch((err) => console.error('Error fetching municipalities:', err));
  }, []);

  // Location-based Municipality Resolution function
  const resolveLocationToMunicipality = async (locData) => {
    try {
      setResolvingMuni(true);
      const res = await API.post('/municipalities/resolve-location', {
        latitude: locData.lat,
        longitude: locData.lng,
        pincode: locData.pincode,
        city: locData.city,
        district: locData.district
      });

      if (res.data?.success && res.data.municipality) {
        setDetectedMunicipality(res.data.municipality);
        setSelectedMuniId(res.data.municipality._id);
        setResolutionMeta({
          matchType: res.data.matchType,
          confidence: res.data.confidence,
          distanceKm: res.data.distanceKm,
          notes: res.data.notes
        });
      }
    } catch (err) {
      console.warn('Municipality resolution error:', err);
    } finally {
      setResolvingMuni(false);
    }
  };

  // Trigger resolution on initial mount
  useEffect(() => {
    if (location) {
      resolveLocationToMunicipality(location);
    }
  }, []);

  // Pincode Search Handler
  const handlePincodeSearch = async (e) => {
    e?.preventDefault();
    const cleanPin = pincodeInput.trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      toast.error('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setResolvingMuni(true);
    try {
      const res = await API.get(`/municipalities/lookup-pincode/${cleanPin}`);
      if (res.data?.success) {
        if (res.data.configured && res.data.municipality) {
          const m = res.data.municipality;
          const postal = res.data.postal;
          const locName = postal?.locality || m.city;
          const newLoc = {
            ...location,
            pincode: cleanPin,
            city: locName,
            district: postal?.district || m.district,
            state: postal?.state || m.state || 'Andhra Pradesh',
            lat: postal?.latitude || m.latitude || location.lat,
            lng: postal?.longitude || m.longitude || location.lng,
            address: `Pincode ${cleanPin}, ${locName}, ${postal?.district || m.district}`
          };
          setLocation(newLoc);
          setDetectedMunicipality(m);
          setSelectedMuniId(m._id);
          setResolutionMeta({
            isConfigured: true,
            detectedLocation: locName,
            detectedPincode: cleanPin,
            detectedAuthority: m.name,
            routingNote: `Your issue will be routed to ${m.name}.`,
            matchType: res.data.matchType || 'PINCODE'
          });
          toast.success(`Matched to ${m.name}`);
        } else {
          // Unconfigured pincode
          const postal = res.data.postal;
          const locName = postal?.locality || 'Unknown Area';
          setDetectedMunicipality(null);
          setSelectedMuniId('');
          setResolutionMeta({
            isConfigured: false,
            detectedLocation: locName,
            detectedPincode: cleanPin,
            detectedAuthority: 'Not configured yet',
            routingNote: 'Local authority mapping is not configured for this location yet. Please select an available authority from the list or choose on map.'
          });
          toast.warning('Local authority mapping is not configured for this pincode yet.');
        }
      }
    } catch (err) {
      toast.error('Could not lookup pincode.');
    } finally {
      setResolvingMuni(false);
    }
  };

  // City / Town Search Handler
  const handleCitySelect = (m) => {
    const newLoc = {
      ...location,
      city: m.city,
      district: m.district,
      state: m.state || 'Andhra Pradesh',
      lat: m.latitude || location.lat,
      lng: m.longitude || location.lng,
      pincode: m.pincodes?.[0] || location.pincode,
      address: `${m.city}, ${m.district}`
    };
    setLocation(newLoc);
    setDetectedMunicipality(m);
    setSelectedMuniId(m._id);
    setResolutionMeta({
      matchType: 'CITY',
      confidence: 'HIGH',
      distanceKm: 0,
      notes: `Directly matched to ${m.name}`
    });
    toast.success(`Selected ${m.name}`);
  };

  // GPS Current Location Handler
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        try {
          const geo = await reverseGeocode(lat, lng);
          const newLoc = {
            lat,
            lng,
            address: geo?.address || `Coordinates: ${lat}, ${lng}`,
            city: geo?.city || '',
            district: geo?.district || '',
            state: geo?.state || 'Andhra Pradesh',
            pincode: geo?.pincode || '',
            accuracy: pos.coords.accuracy
          };
          setLocation(newLoc);
          await resolveLocationToMunicipality(newLoc);
          toast.success('Current location detected successfully!');
        } catch (err) {
          const fallbackLoc = { ...location, lat, lng };
          setLocation(fallbackLoc);
          await resolveLocationToMunicipality(fallbackLoc);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        toast.error('Unable to retrieve your current location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Map click / drag handler
  const handleMapPositionChange = async ({ lat, lng }) => {
    try {
      const geo = await reverseGeocode(lat, lng);
      const newLoc = {
        lat,
        lng,
        address: geo?.address || location.address,
        city: geo?.city || location.city,
        district: geo?.district || location.district,
        state: geo?.state || location.state,
        pincode: geo?.pincode || location.pincode
      };
      setLocation(newLoc);
      await resolveLocationToMunicipality(newLoc);
    } catch (err) {
      const fallbackLoc = { ...location, lat, lng };
      setLocation(fallbackLoc);
      await resolveLocationToMunicipality(fallbackLoc);
    }
  };

  // Image Upload Handlers
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      toast.error('Maximum 5 evidence images allowed.');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  // Check for Duplicate Requests API
  const handleCheckDuplicates = async () => {
    if (!location?.lat || !location?.lng) {
      toast.error('Please specify the issue location first.');
      return;
    }

    setDuplicateCheckStatus('checking');
    try {
      const res = await API.post('/requests/check-duplicate', {
        category,
        latitude: location.lat,
        longitude: location.lng
      });

      if (res.data?.success) {
        const matches = res.data.matches || res.data.nearby || [];
        if (matches.length > 0) {
          setDuplicateMatches(matches);
          setDuplicateCheckStatus('duplicates_found');
          toast.warning(`${matches.length} similar issue(s) reported nearby.`);
        } else {
          setDuplicateMatches([]);
          setDuplicateCheckStatus('clean');
          toast.success('No duplicate issues found nearby!');
        }
      }
    } catch (err) {
      console.warn('Duplicate check error:', err);
      setDuplicateCheckStatus('clean');
    }
  };

  // Step 4: Submit Final Service Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('address', location.address || 'Address provided');
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      formData.append('city', location.city || detectedMunicipality?.city || '');
      formData.append('district', location.district || detectedMunicipality?.district || '');
      formData.append('state', location.state || detectedMunicipality?.state || 'Andhra Pradesh');
      formData.append('pincode', location.pincode || '');

      // Assign the detected or manually selected municipality ID
      const targetMuniId = manualOverride && selectedMuniId ? selectedMuniId : detectedMunicipality?._id;
      if (targetMuniId) {
        formData.append('municipality', targetMuniId);
        formData.append('municipalityId', targetMuniId);
      }

      images.forEach((file) => {
        formData.append('images', file);
      });

      const res = await API.post('/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.request) {
        const createdReq = res.data.request;
        setSubmissionSuccess({
          requestId: createdReq.requestId,
          id: createdReq._id,
          municipalityName: detectedMunicipality?.name || 'Local Municipality',
          status: createdReq.status || 'PENDING'
        });
        toast.success('Service request submitted successfully!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit service request. Please check all fields.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Render Post-Submission Success Screen
  if (submissionSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE7E0] p-8 sm:p-12 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center text-4xl mx-auto shadow-md shadow-emerald-500/10">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-[#6B4E71] tracking-wider uppercase bg-[#E8D7E6] px-3 py-1 rounded-full">
              Jurisdiction Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
              Your issue has been reported successfully.
            </h1>
            <p className="text-xs sm:text-sm text-[#6B666E] max-w-md mx-auto">
              Our smart routing engine has delivered your request directly to your responsible municipal department.
            </p>
          </div>

          {/* Ticket Information Card */}
          <div className="bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] p-5 text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-2.5">
              <span className="text-xs text-[#6B666E]">Tracking ID:</span>
              <span className="font-mono font-bold text-[#C65F63] text-sm sm:text-base">
                {submissionSuccess.requestId}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-2.5">
              <span className="text-xs text-[#6B666E]">Responsible Authority:</span>
              <span className="font-bold text-[#29252A] text-xs sm:text-sm">
                🏛️ {submissionSuccess.municipalityName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B666E]">Current Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20">
                Submitted
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to={`/requests/${submissionSuccess.id || submissionSuccess.requestId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-lg shadow-[#C65F63]/25 transition text-center"
            >
              View Request
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FAF5F0] hover:bg-[#EFE7E0] text-[#29252A] border border-[#EFE7E0] font-bold text-xs transition text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#29252A] tracking-tight">
            Report Issue
          </h1>
          <p className="text-xs sm:text-sm text-[#6B666E] mt-0.5">
            Submit a civic complaint with precise location-based municipal routing.
          </p>
        </div>

        <Link
          to="/services"
          className="text-xs font-bold text-[#C65F63] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Explore All Civic Services</span>
          <span>→</span>
        </Link>
      </div>

      {/* 4-STEP WIZARD INDICATOR (Matches Reference Specification) */}
      <div className="bg-white rounded-3xl border border-[#EFE7E0] p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { step: 1, title: 'Location & Municipality' },
            { step: 2, title: 'Issue Details' },
            { step: 3, Media: 'Media & Priority', title: 'Media & Priority' },
            { step: 4, title: 'Review & Submit' }
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <div
                key={item.step}
                onClick={() => {
                  if (item.step < currentStep) setCurrentStep(item.step);
                }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer ${
                  isActive
                    ? 'bg-[#C65F63] text-white shadow-md shadow-[#C65F63]/25'
                    : isCompleted
                    ? 'bg-[#E8D7E6] text-[#6B4E71] hover:bg-[#6B4E71]/20'
                    : 'bg-[#FAF5F0] text-[#9E98A2] border border-[#EFE7E0]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-white text-[#C65F63]'
                      : isCompleted
                      ? 'bg-[#6B4E71] text-white'
                      : 'bg-white text-[#9E98A2] border border-[#EFE7E0]'
                  }`}
                >
                  {isCompleted ? '✓' : item.step}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    Step {item.step}
                  </span>
                  <span className="text-xs font-bold truncate block leading-tight">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: LOCATION & MUNICIPALITY */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#29252A] tracking-tight">
                  Where is the issue located?
                </h2>
                <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                  Tell us the exact location of the problem. This helps route your request to the right municipality.
                </p>
              </div>

              {/* Location Method Selection Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0]">
                {[
                  { id: 'pincode', label: 'Pincode' },
                  { id: 'city', label: 'City / Town' },
                  { id: 'gps', label: 'GPS Location' },
                  { id: 'map', label: 'Map' },
                  { id: 'address', label: 'Address' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLocationTab(tab.id)}
                    className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      locationTab === tab.id
                        ? 'bg-[#C65F63] text-white shadow-sm'
                        : 'text-[#6B666E] hover:text-[#29252A]'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: Pincode */}
              {locationTab === 'pincode' && (
                <div className="p-5 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] space-y-3 animate-fadeIn">
                  <label className="block text-xs font-bold text-[#29252A]">
                    Enter Postal Pincode:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pincodeInput}
                      onChange={(e) => setPincodeInput(e.target.value)}
                      placeholder="e.g. 522265 (Repalle), 522201 (Tenali), or 522001 (Guntur)"
                      className="flex-1 bg-white border border-[#EFE7E0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                    />
                    <button
                      type="button"
                      onClick={handlePincodeSearch}
                      disabled={resolvingMuni}
                      className="px-6 py-2.5 bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {resolvingMuni ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {/* Configured Pincode Result Card */}
                  {resolutionMeta && resolutionMeta.isConfigured && (
                    <div className="p-4 rounded-2xl bg-white border border-[#EFE7E0] shadow-sm space-y-2 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-[#FAF5F0] rounded-xl border border-[#EFE7E0]">
                          <span className="text-[10px] text-[#9E98A2] uppercase font-bold block">Detected Location</span>
                          <strong className="text-[#29252A] text-sm">{resolutionMeta.detectedLocation}</strong>
                        </div>
                        <div className="p-2.5 bg-[#FAF5F0] rounded-xl border border-[#EFE7E0]">
                          <span className="text-[10px] text-[#9E98A2] uppercase font-bold block">Detected Pincode</span>
                          <strong className="font-mono text-[#C65F63] text-sm">{resolutionMeta.detectedPincode}</strong>
                        </div>
                        <div className="p-2.5 bg-[#FAF5F0] rounded-xl border border-[#EFE7E0]">
                          <span className="text-[10px] text-[#9E98A2] uppercase font-bold block">Detected Local Authority</span>
                          <strong className="text-[#6B4E71] text-sm">🏛️ {resolutionMeta.detectedAuthority}</strong>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#EFE7E0] text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                        <HiOutlineCheckCircle className="text-emerald-600 text-base shrink-0" />
                        <span>{resolutionMeta.routingNote}</span>
                      </div>
                    </div>
                  )}

                  {/* Unconfigured Pincode Result Card */}
                  {resolutionMeta && !resolutionMeta.isConfigured && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                          <span className="text-[10px] text-amber-700 uppercase font-bold block">Detected Pincode</span>
                          <strong className="font-mono text-amber-900 text-sm">{resolutionMeta.detectedPincode}</strong>
                        </div>
                        <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                          <span className="text-[10px] text-amber-700 uppercase font-bold block">Detected Location</span>
                          <strong className="text-amber-900 text-sm">{resolutionMeta.detectedLocation}</strong>
                        </div>
                        <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200">
                          <span className="text-[10px] text-amber-700 uppercase font-bold block">Local Authority</span>
                          <strong className="text-rose-600 text-sm font-bold">Not configured yet</strong>
                        </div>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {resolutionMeta.routingNote}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLocationTab('map')}
                          className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition shadow-sm flex items-center gap-1.5"
                        >
                          <span>🗺️</span>
                          <span>Select Location on Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationTab('city')}
                          className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition shadow-sm flex items-center gap-1.5"
                        >
                          <span>🏙️</span>
                          <span>Search City / Town</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-[#6B666E]">
                    Try <strong className="text-[#C65F63]">522265</strong> (Repalle), <strong className="text-[#C65F63]">522201</strong> (Tenali), or <strong className="text-[#C65F63]">522001</strong> (Guntur).
                  </p>
                </div>
              )}

              {/* TAB 2: City / Town */}
              {locationTab === 'city' && (
                <div className="p-5 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] space-y-3 animate-fadeIn">
                  <label className="block text-xs font-bold text-[#29252A]">
                    Select City or Municipal Corporation:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {municipalities.map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => handleCitySelect(m)}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          detectedMunicipality?._id === m._id
                            ? 'bg-[#FDECEF] border-[#C65F63] text-[#C65F63] font-bold'
                            : 'bg-white border-[#EFE7E0] text-[#29252A] hover:border-[#6B4E71]/40'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{m.city}</div>
                          <div className="text-[10px] text-[#6B666E]">{m.name}</div>
                        </div>
                        <span className="text-xs font-semibold">{m.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: GPS Location */}
              {locationTab === 'gps' && (
                <div className="p-8 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-white text-[#C65F63] flex items-center justify-center text-3xl mx-auto shadow-sm border border-[#EFE7E0]">
                    📍
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#29252A]">Detect Physical Issue Location</h4>
                    <p className="text-xs text-[#6B666E] max-w-sm mx-auto">
                      Use your device's high-accuracy GPS to automatically identify the responsible municipal authority.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md shadow-[#C65F63]/20 transition disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Acquiring GPS Satellite Lock...</span>
                      </>
                    ) : (
                      <>
                        <span>📍</span>
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 4: Interactive Map */}
              {locationTab === 'map' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-[#6B666E]">
                    <span>Click anywhere on the map or drag the marker to pinpoint the exact issue location.</span>
                    <button
                      type="button"
                      onClick={handleUseCurrentGPS}
                      className="text-[#C65F63] font-bold hover:underline"
                    >
                      Use GPS
                    </button>
                  </div>
                  <div className="h-80 w-full rounded-2xl overflow-hidden border border-[#EFE7E0] shadow-sm">
                    <MapView
                      position={{ lat: location.lat, lng: location.lng }}
                      onPositionChange={handleMapPositionChange}
                      height="100%"
                      pinColor="#C65F63"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: Address */}
              {locationTab === 'address' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] animate-fadeIn">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#29252A] mb-1">
                      Street Address / Landmark:
                    </label>
                    <input
                      type="text"
                      value={location.address}
                      onChange={(e) => setLocation({ ...location, address: e.target.value })}
                      placeholder="e.g. Near Clock Tower, Station Road"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl px-4 py-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#29252A] mb-1">City / Town:</label>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => setLocation({ ...location, city: e.target.value })}
                      placeholder="Tenali"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl px-4 py-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#29252A] mb-1">District:</label>
                    <input
                      type="text"
                      value={location.district}
                      onChange={(e) => setLocation({ ...location, district: e.target.value })}
                      placeholder="Guntur"
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl px-4 py-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                    />
                  </div>
                </div>
              )}

              {/* CONFIRMATION BEFORE ADVANCING */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FAF5F0] via-white to-[#FDECEF] border border-[#EFE7E0] shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-[#6B4E71] uppercase tracking-wider">
                    Jurisdiction Confirmation
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualOverride(!manualOverride)}
                    className="text-xs font-bold text-[#C65F63] hover:underline"
                  >
                    {manualOverride ? 'Use Auto-Detected Authority' : 'Change Authority Manually'}
                  </button>
                </div>

                {resolvingMuni ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#6B4E71]">
                    <div className="w-4 h-4 border-2 border-[#C65F63] border-t-transparent rounded-full animate-spin" />
                    <span>Resolving physical municipal jurisdiction...</span>
                  </div>
                ) : detectedMunicipality ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-white border border-[#EFE7E0] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B666E]">Issue Location:</span>
                        <strong className="text-[#29252A] font-bold">
                          {location.city || detectedMunicipality.city}, Pincode {location.pincode || detectedMunicipality.pincodes?.[0]}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B666E]">Local Authority:</span>
                        <strong className="text-[#6B4E71] font-bold">
                          🏛️ {detectedMunicipality.name}
                        </strong>
                      </div>
                    </div>

                    {/* Green Confirmation Pill */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <HiOutlineCheckCircle className="text-emerald-600 text-lg shrink-0" />
                      <span>✓ Your issue will be routed to {detectedMunicipality.name}.</span>
                    </div>

                    {/* Location Summary Pills */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="bg-white p-2 rounded-xl border border-[#EFE7E0]">
                        <span className="text-[10px] text-[#9E98A2] uppercase block">Pincode</span>
                        <strong className="text-[#29252A]">{location.pincode || '—'}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-[#EFE7E0]">
                        <span className="text-[10px] text-[#9E98A2] uppercase block">City</span>
                        <strong className="text-[#29252A]">{location.city || detectedMunicipality.city}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-[#EFE7E0]">
                        <span className="text-[10px] text-[#9E98A2] uppercase block">District</span>
                        <strong className="text-[#29252A]">{location.district || detectedMunicipality.district}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>No municipal authority confirmed for this location yet.</span>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Please enter a configured pincode (e.g. 522265 for Repalle, 522201 for Tenali, 522001 for Guntur), select a city/town, or choose on the map before continuing.
                    </p>
                  </div>
                )}

                {/* Manual Authority Override Select */}
                {manualOverride && (
                  <div className="pt-2 border-t border-[#EFE7E0]">
                    <label className="block text-xs font-bold text-[#29252A] mb-1">
                      Choose Municipal Authority Manually:
                    </label>
                    <select
                      value={selectedMuniId}
                      onChange={(e) => {
                        setSelectedMuniId(e.target.value);
                        const matched = municipalities.find((m) => m._id === e.target.value);
                        if (matched) {
                          setDetectedMunicipality(matched);
                          setResolutionMeta({
                            isConfigured: true,
                            detectedLocation: matched.city,
                            detectedPincode: matched.pincodes?.[0] || location.pincode,
                            detectedAuthority: matched.name,
                            routingNote: `Your issue will be routed to ${matched.name}.`
                          });
                        }
                      }}
                      className="w-full bg-white border border-[#EFE7E0] rounded-xl p-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                    >
                      <option value="">-- Select Municipality --</option>
                      {municipalities.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.city}, {m.district})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end pt-4 border-t border-[#EFE7E0]">
                <button
                  type="button"
                  onClick={() => {
                    if (!detectedMunicipality) {
                      toast.error('Please resolve and confirm the issue location before advancing.');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="px-6 py-3 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-lg shadow-[#C65F63]/25 transition flex items-center gap-2"
                >
                  <span>Next: Issue Details</span>
                  <HiOutlineArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ISSUE DETAILS */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Main Form Fields (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#29252A] tracking-tight">
                Report a Local Service Problem
              </h2>
              <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                Provide the details of the issue and upload photos (optional).
              </p>
            </div>

            {/* Service Category */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-2">
                Service Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={`${cat.value}-${idx}`}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                      category === cat.value
                        ? 'bg-[#FDECEF] border-[#C65F63] text-[#C65F63] shadow-sm font-bold'
                        : 'bg-[#FAF5F0] border-[#EFE7E0] text-[#29252A] hover:border-[#6B4E71]/40'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-bold leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Title */}
            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Issue Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Streetlight not working"
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white transition"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#29252A]">
                  Detailed Description *
                </label>
                <span className="text-[11px] text-[#9E98A2]">
                  {description.length}/500
                </span>
              </div>
              <textarea
                rows={4}
                required
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the exact issue, surrounding landmarks, and hazard risks..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-2xl p-4 text-xs sm:text-sm text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white transition"
              />
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EFE7E0]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] hover:text-[#29252A] text-xs font-bold transition flex items-center gap-1.5"
              >
                <HiOutlineArrowLeft />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!title.trim() || !description.trim()) {
                    toast.error('Please fill in the title and description.');
                    return;
                  }
                  setCurrentStep(3);
                }}
                className="px-6 py-3 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-lg shadow-[#C65F63]/25 transition flex items-center gap-2"
              >
                <span>Next: Media & Priority</span>
                <HiOutlineArrowRight />
              </button>
            </div>
          </div>

          {/* Right Side Information Panel: "Report Smart. Build Better." */}
          <div className="lg:col-span-4 bg-gradient-to-br from-[#FDECEF] via-white to-[#E8D7E6] rounded-3xl border border-[#EFE7E0] p-6 sm:p-7 flex flex-col justify-between shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold text-[#6B4E71] bg-white px-3 py-1 rounded-full uppercase tracking-wider border border-[#EFE7E0]">
                Civic Impact
              </span>
              <h3 className="text-xl font-black text-[#29252A] tracking-tight mt-3">
                Report Smart. Build Better.
              </h3>
              <p className="text-xs text-[#6B666E] mt-1">
                Your report directly empowers town councils to fix community infrastructure faster.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-[#EFE7E0] shadow-sm">
                <span className="text-xl shrink-0">📍</span>
                <div>
                  <div className="text-xs font-bold text-[#29252A]">Accurate Routing</div>
                  <div className="text-[11px] text-[#6B666E] mt-0.5">
                    Your issue goes to the right municipality based on its physical location.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-[#EFE7E0] shadow-sm">
                <span className="text-xl shrink-0">⚡</span>
                <div>
                  <div className="text-xs font-bold text-[#29252A]">Faster Resolution</div>
                  <div className="text-[11px] text-[#6B666E] mt-0.5">
                    Clear photos and descriptions help authorities dispatch the right field team.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-[#EFE7E0] shadow-sm">
                <span className="text-xl shrink-0">🔔</span>
                <div>
                  <div className="text-xs font-bold text-[#29252A]">Real-time Updates</div>
                  <div className="text-[11px] text-[#6B666E] mt-0.5">
                    Track your complaint live as it moves from Assigned to Resolved.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-[#EFE7E0] shadow-sm">
                <span className="text-xl shrink-0">🏙</span>
                <div>
                  <div className="text-xs font-bold text-[#29252A]">Better Communities</div>
                  <div className="text-[11px] text-[#6B666E] mt-0.5">
                    Cleaner, safer and well-maintained public spaces for every citizen.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white/90 rounded-2xl border border-[#EFE7E0] text-[11px] text-[#6B4E71] font-medium text-center">
              🏛️ LocalFix Municipal Gateway
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: MEDIA & PRIORITY */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#29252A] tracking-tight">
                Upload Media & Set Priority
              </h2>
              <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
                Add evidence photos and check for any existing duplicate reports nearby.
              </p>
            </div>

            {/* Upload Evidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#29252A]">
                  Upload Evidence (Optional)
                </label>
                <span className="text-[11px] text-[#9E98A2]">{images.length}/5 files</span>
              </div>

              <div className="border-2 border-dashed border-[#EFE7E0] rounded-3xl p-6 text-center hover:border-[#C65F63] transition bg-[#FAF5F0] relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white text-[#C65F63] flex items-center justify-center text-2xl shadow-sm">
                    <HiOutlineUpload />
                  </div>
                  <div className="text-xs font-bold text-[#29252A]">
                    Click to upload or drag and drop
                  </div>
                  <p className="text-[11px] text-[#9E98A2]">
                    JPG, JPEG, PNG, WEBP (Max 5MB each)
                  </p>
                </div>
              </div>

              {/* Thumbnails preview */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-[#EFE7E0] group">
                      <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-rose-600 text-white text-xs transition"
                        title="Remove image"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#29252A]">
                Priority Level *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`p-3 rounded-2xl border text-center transition ${
                      priority === p.value
                        ? 'bg-[#C65F63] border-[#C65F63] text-white font-bold shadow-md shadow-[#C65F63]/25'
                        : 'bg-[#FAF5F0] border-[#EFE7E0] text-[#29252A] hover:border-[#C65F63]'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${priority === p.value ? 'text-white/80' : 'text-[#6B666E]'}`}>
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6B666E] italic">
                Priority may be adjusted automatically based on issue details and municipal hazard rules.
              </p>
            </div>

            {/* Duplicate Checking Section */}
            <div className="p-5 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#29252A]">Duplicate Issue Prevention</h4>
                  <p className="text-[11px] text-[#6B666E]">
                    Scan existing tickets in {detectedMunicipality?.name || 'the area'} to avoid submitting duplicate complaints.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckDuplicates}
                  disabled={duplicateCheckStatus === 'checking'}
                  className="px-4 py-2 rounded-xl bg-[#6B4E71] hover:bg-[#5A3F60] text-white text-xs font-bold transition shadow-sm"
                >
                  {duplicateCheckStatus === 'checking' ? 'Scanning Area...' : 'Check for Duplicates'}
                </button>
              </div>

              {duplicateCheckStatus === 'clean' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <HiOutlineCheckCircle className="text-emerald-600 text-base shrink-0" />
                  <span>✓ No similar issue found nearby within 500m.</span>
                </div>
              )}

              {duplicateCheckStatus === 'duplicates_found' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold space-y-2">
                  <div className="flex items-center gap-2">
                    <HiOutlineExclamation className="text-amber-600 text-base shrink-0" />
                    <span>⚠ Similar issue already reported nearby:</span>
                  </div>
                  <div className="divide-y divide-amber-200/60 font-normal">
                    {duplicateMatches.slice(0, 3).map((d) => (
                      <div key={d.requestId} className="py-1.5 flex justify-between items-center text-[11px]">
                        <span>{d.title} ({d.status})</span>
                        <span className="font-mono font-bold text-[#C65F63]">{d.requestId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EFE7E0]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] hover:text-[#29252A] text-xs font-bold transition flex items-center gap-1.5"
              >
                <HiOutlineArrowLeft />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-lg shadow-[#C65F63]/25 transition flex items-center gap-2"
              >
                <span>Next: Review & Submit</span>
                <HiOutlineArrowRight />
              </button>
            </div>
          </div>

          {/* Right Side Info */}
          <div className="lg:col-span-4 bg-[#FAF5F0] rounded-3xl border border-[#EFE7E0] p-6 space-y-4">
            <h4 className="text-xs font-bold text-[#29252A] uppercase tracking-wider">
              Verification Checklist
            </h4>
            <div className="space-y-3 text-xs text-[#6B666E]">
              <div className="flex items-start gap-2">
                <span className="text-[#C65F63] font-bold">✓</span>
                <span>Photographs provide proof for field engineers to bring correct tools.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C65F63] font-bold">✓</span>
                <span>Critical priority is reserved for imminent electrical or health hazards.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C65F63] font-bold">✓</span>
                <span>Duplicate detection ensures faster resolution without split tickets.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {currentStep === 4 && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#EFE7E0] p-6 sm:p-10 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#29252A] tracking-tight">
              Review & Confirm Request
            </h2>
            <p className="text-xs sm:text-sm text-[#6B666E] mt-1">
              Please double check the details below before dispatching to municipal authorities.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Clean Summary Card */}
          <div className="bg-[#FAF5F0] rounded-2xl border border-[#EFE7E0] p-6 space-y-5 text-xs">
            {/* Issue Section */}
            <div className="space-y-2 border-b border-[#EFE7E0] pb-4">
              <span className="text-[10px] font-bold text-[#6B4E71] uppercase tracking-wider block">
                Issue Summary
              </span>
              <div className="text-base font-bold text-[#29252A]">{title}</div>
              <div className="text-[#6B666E] leading-relaxed whitespace-pre-line">{description}</div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-[#EFE7E0] text-[11px] font-bold text-[#C65F63]">
                <span>Category:</span>
                <span>{category}</span>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2 border-b border-[#EFE7E0] pb-4">
              <span className="text-[10px] font-bold text-[#6B4E71] uppercase tracking-wider block">
                Physical Location
              </span>
              <div className="text-xs text-[#29252A] font-semibold">{location.address}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#6B666E] pt-1">
                <div>City: <strong className="text-[#29252A]">{location.city}</strong></div>
                <div>District: <strong className="text-[#29252A]">{location.district}</strong></div>
                <div>State: <strong className="text-[#29252A]">{location.state}</strong></div>
                <div>Pincode: <strong className="text-[#29252A]">{location.pincode}</strong></div>
              </div>
            </div>

            {/* Municipality Jurisdiction */}
            <div className="p-4 rounded-xl bg-white border border-[#EFE7E0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏛️</span>
                <div>
                  <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Assigned Municipal Authority</div>
                  <div className="text-sm font-bold text-[#29252A]">
                    {detectedMunicipality?.name || 'Local Municipality'}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>

            {/* Priority & Evidence */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[10px] text-[#9E98A2] uppercase block">Selected Priority</span>
                <span className="text-xs font-bold text-[#C65F63]">{priority}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9E98A2] uppercase block">Attached Evidence</span>
                <span className="text-xs font-bold text-[#29252A]">{images.length} file(s) attached</span>
              </div>
            </div>
          </div>

          {/* Submission Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#EFE7E0]">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl border border-[#EFE7E0] text-[#6B666E] hover:text-[#29252A] text-xs font-bold transition flex items-center gap-1.5"
            >
              <HiOutlineArrowLeft />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitRequest}
              className="px-8 py-3.5 rounded-2xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-sm shadow-xl shadow-[#C65F63]/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Municipality...</span>
                </>
              ) : (
                <>
                  <span>Submit Service Request</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRequest;
