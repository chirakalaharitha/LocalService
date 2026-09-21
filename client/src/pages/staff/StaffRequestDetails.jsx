import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { joinRequestRoom, leaveRequestRoom } from '../../services/socket';
import { toast } from 'react-toastify';
import MapView from '../../components/location/MapView';
import BeforeAfterViewer from '../../components/requests/BeforeAfterViewer';
import {
  HiOutlineArrowLeft,
  HiOutlineLocationMarker,
  HiOutlineGlobe,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePencilAlt,
  HiOutlinePlay,
  HiOutlineExclamationCircle,
  HiOutlineUser,
  HiOutlinePhone,
  HiStar
} from 'react-icons/hi';

const StaffRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [request, setRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);

  // Modals & Action States
  const [showStartModal, setShowStartModal] = useState(false);
  const [beforeFile, setBeforeFile] = useState(null);
  const [starting, setStarting] = useState(false);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [workNote, setWorkNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [afterFile, setAfterFile] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Preview Image Lightbox
  const [previewImage, setPreviewImage] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    setErrorMessage('');
    setErrorStatus(null);
    try {
      const res = await API.get(`/staff/requests/${id}`);
      if (res.data.success) {
        setRequest(res.data.request);
        setHistory(res.data.history || []);

        try {
          const reqIdParam = res.data.request.requestId || res.data.request._id;
          const fRes = await API.get(`/feedback/request/${reqIdParam}`);
          if (fRes.data.success && fRes.data.feedback) {
            setFeedback(fRes.data.feedback);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Fetch staff request details failed:', err);
      const status = err.response?.status || 500;
      setErrorStatus(status);
      setErrorMessage(
        err.response?.data?.message || 'Unable to load service request details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Real-time socket event listeners for staff request details
  useEffect(() => {
    if (!socket) return;

    joinRequestRoom(id);
    if (request?.requestId && request.requestId !== id) {
      joinRequestRoom(request.requestId);
    }
    if (request?._id && request._id.toString() !== id) {
      joinRequestRoom(request._id.toString());
    }

    const handleStatusChanged = (payload) => {
      const targetReqId = request?.requestId;
      const targetMongoId = request?._id?.toString();

      const isMatch =
        payload.requestId === id ||
        payload.requestMongoId === id ||
        (targetReqId && payload.requestId === targetReqId) ||
        (targetMongoId && (payload.requestMongoId === targetMongoId || payload.requestId === targetMongoId));

      if (isMatch) {
        setRequest((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            resolutionNotes: payload.request?.resolutionNotes !== undefined
              ? payload.request.resolutionNotes
              : (payload.note || prev.resolutionNotes),
            afterImage: payload.request?.afterImage || prev.afterImage,
            resolutionProof: payload.resolutionProof || payload.request?.resolutionProof || prev.resolutionProof,
            resolvedAt: payload.request?.resolvedAt || (payload.status === 'RESOLVED' ? payload.changedAt : prev.resolvedAt),
            verifiedAt: payload.request?.verifiedAt || (payload.status === 'CITIZEN_VERIFIED' ? payload.changedAt : prev.verifiedAt),
            updatedAt: payload.changedAt || new Date().toISOString()
          };
        });

        setHistory((prevHistory) => {
          const entry = {
            _id: 'rt_' + Date.now(),
            action: `STATUS_${payload.status}`,
            previousStatus: payload.previousStatus,
            newStatus: payload.status,
            notes: payload.note || `Status transitioned to ${payload.status}`,
            createdAt: payload.changedAt || new Date().toISOString(),
            user: payload.changedBy || { name: 'Staff / Admin', role: 'STAFF' }
          };
          return [...prevHistory, entry];
        });
      }
    };

    const handleUpdated = (payload) => {
      const targetReqId = request?.requestId;
      const targetMongoId = request?._id?.toString();

      const isMatch =
        payload.requestId === id ||
        payload.requestMongoId === id ||
        (targetReqId && payload.requestId === targetReqId) ||
        (targetMongoId && (payload.requestMongoId === targetMongoId || payload.requestId === targetMongoId));

      if (isMatch) {
        setRequest((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(payload.changes || {}),
            ...(payload.request || {}),
            updatedAt: payload.updatedAt || new Date().toISOString()
          };
        });
        if (payload.changes?.workNote) {
          setHistory((prevHistory) => {
            const entry = {
              _id: 'rt_' + Date.now(),
              action: 'WORK_NOTE_ADDED',
              previousStatus: request?.status,
              newStatus: request?.status,
              notes: payload.changes.workNote,
              createdAt: payload.updatedAt || new Date().toISOString(),
              user: { name: 'Staff Member', role: 'STAFF' }
            };
            return [...prevHistory, entry];
          });
        }
      }
    };

    const handleFeedbackEvent = (payload) => {
      const targetReqId = request?.requestId;
      const targetMongoId = request?._id?.toString();
      const pReqId = payload.requestId || payload.request?._id || payload.request?.requestId;
      if (pReqId === id || pReqId === targetReqId || pReqId === targetMongoId) {
        setFeedback(payload.feedback || null);
      }
    };

    socket.on('request:statusChanged', handleStatusChanged);
    socket.on('request:updated', handleUpdated);
    socket.on('feedback:submitted', handleFeedbackEvent);
    socket.on('feedback:updated', handleFeedbackEvent);
    socket.on('feedback:deleted', () => setFeedback(null));

    return () => {
      leaveRequestRoom(id);
      if (request?.requestId) leaveRequestRoom(request.requestId);
      if (request?._id) leaveRequestRoom(request._id.toString());
      socket.off('request:statusChanged', handleStatusChanged);
      socket.off('request:updated', handleUpdated);
      socket.off('feedback:submitted', handleFeedbackEvent);
      socket.off('feedback:updated', handleFeedbackEvent);
      socket.off('feedback:deleted');
    };
  }, [socket, id, request?.requestId, request?._id]);

  // Handle Accept
  const handleAccept = async () => {
    try {
      const res = await API.post(`/staff/requests/${request._id}/accept`);
      if (res.data.success) {
        toast.success('Task accepted and moved to in-progress.');
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept task');
    }
  };

  // Handle Start Work Submit
  const handleStartWorkSubmit = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const formData = new FormData();
      if (beforeFile) formData.append('beforeImage', beforeFile);

      const res = await API.post(`/staff/requests/${request._id}/start`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Work commenced! Initial inspection recorded.');
        setShowStartModal(false);
        setBeforeFile(null);
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start work');
    } finally {
      setStarting(false);
    }
  };

  // Handle Add Work Note Submit
  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!workNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await API.post(`/staff/requests/${request._id}/notes`, {
        note: workNote.trim()
      });
      if (res.data.success) {
        toast.success('Field note added to task log.');
        setShowNoteModal(false);
        setWorkNote('');
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add work note');
    } finally {
      setSavingNote(false);
    }
  };

  // Handle Resolution Submit
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      toast.error('Please enter descriptive resolution notes (minimum 5 characters).');
      return;
    }
    setResolving(true);
    try {
      const formData = new FormData();
      if (afterFile) formData.append('afterImage', afterFile);
      formData.append('resolutionNotes', resolutionNotes.trim());

      const res = await API.patch(`/staff/requests/${request._id}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Resolution submitted successfully! Awaiting citizen verification.');
        setShowResolveModal(false);
        setAfterFile(null);
        setResolutionNotes('');
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit resolution');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs text-slate-400 font-medium">Loading staff task details...</div>
      </div>
    );
  }

  if (errorStatus || !request) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center text-3xl mx-auto">
          <HiOutlineExclamationCircle />
        </div>
        <h2 className="text-xl font-bold text-white">
          {errorStatus === 403 ? 'Access Restricted' : 'Request Not Found'}
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
        <Link
          to="/staff/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          <HiOutlineArrowLeft />
          <span>Back to Staff Workload</span>
        </Link>
      </div>
    );
  }

  const coords = request.location?.coordinates || [];
  const longitude = coords[0] !== undefined ? Number(coords[0]) : null;
  const latitude = coords[1] !== undefined ? Number(coords[1]) : null;
  const hasCoordinates = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/staff/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <HiOutlineArrowLeft className="text-base" />
          <span>Back to Staff Workload</span>
        </Link>

        <span className="text-xs font-mono text-slate-500">
          Assigned to you
        </span>
      </div>

      {/* Main Request Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono font-bold text-blue-400 text-sm tracking-wide">
                {request.requestId}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  request.priority === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : request.priority === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {request.priority} Priority
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {request.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-2 tracking-tight">
              {request.title}
            </h1>
          </div>

          <div className="self-start sm:self-auto flex items-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase border shadow-sm ${
                request.status === 'RESOLVED' || request.status === 'CITIZEN_VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : request.status === 'IN_PROGRESS'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse'
                  : request.status === 'ACCEPTED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}
            >
              {request.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Citizen Contact Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-base">
              <HiOutlineUser />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Reporting Citizen</div>
              <div className="font-bold text-slate-200 mt-0.5">{request.citizen?.name || 'Citizen'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-base">
              <HiOutlinePhone />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Contact Phone</div>
              <div className="font-bold text-slate-200 mt-0.5">{request.citizen?.phone || 'Not provided'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-base">
              <HiOutlineClock />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Reported At</div>
              <div className="font-bold text-slate-200 mt-0.5">
                {new Date(request.createdAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Workflow Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Field Work Action Center
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute stage transitions, record on-site observations, and upload completion proof.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {request.status === 'ASSIGNED' && (
              <>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
                >
                  Accept Assignment
                </button>
                <button
                  onClick={() => setShowStartModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition"
                >
                  Start Work Immediately
                </button>
              </>
            )}

            {request.status === 'ACCEPTED' && (
              <button
                onClick={() => setShowStartModal(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition flex items-center gap-1.5"
              >
                <HiOutlinePlay />
                <span>Start On-Site Work</span>
              </button>
            )}

            {request.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
                >
                  <HiOutlinePencilAlt className="text-blue-400 text-sm" />
                  <span>Add Work Note</span>
                </button>

                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition flex items-center gap-1.5"
                >
                  <HiOutlineCheckCircle className="text-base" />
                  <span>Submit Resolution Proof</span>
                </button>
              </>
            )}

            {(request.status === 'RESOLVED' || request.status === 'CITIZEN_VERIFIED') && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <HiOutlineCheckCircle className="text-base text-emerald-400" />
                <span>Work Completed (Awaiting Citizen Verification)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Problem Description & Citizen Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Civic Problem Description
          </h2>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950 p-4 rounded-xl border border-slate-800">
            {request.description}
          </p>
        </div>

        {/* Citizen Submitted Proof Images */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Citizen Evidence
          </h2>
          {request.images && request.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {request.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreviewImage(img)}
                  className="group relative rounded-xl overflow-hidden aspect-video border border-slate-800 bg-slate-950 focus:outline-none"
                >
                  <img
                    src={img}
                    alt={`Citizen photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                    🔍 View
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
              No photos attached by citizen.
            </div>
          )}
        </div>
      </div>

      {/* Location & Interactive Read-Only Map */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <HiOutlineLocationMarker className="text-blue-400 text-xl" />
            <h2>Reported Issue Location</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : 'Coordinates N/A'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <HiOutlineOfficeBuilding className="text-blue-400 text-sm" />
              <span>Street Address</span>
            </div>
            <div className="font-semibold text-slate-200 mt-0.5 break-words">
              {request.address || 'Location pinpointed on map'}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">City</div>
                <div className="font-medium text-slate-300 truncate">{request.city || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">State</div>
                <div className="font-medium text-slate-300 truncate">{request.state || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Pincode</div>
                <div className="font-mono text-slate-300 truncate">{request.pincode || '—'}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <HiOutlineGlobe className="text-teal-400 text-sm" />
              <span>GPS Coordinates</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Latitude</div>
                <div className="text-blue-400 font-bold">{latitude !== null ? latitude.toFixed(6) : 'N/A'}</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Longitude</div>
                <div className="text-teal-400 font-bold">{longitude !== null ? longitude.toFixed(6) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 7 Reusable Read-only Map */}
        {hasCoordinates && (
          <div className="pt-2">
            <MapView
              position={{ lat: latitude, lng: longitude }}
              readOnly={true}
              label="Reported Incident Location"
              subLabel={request.address}
              height="300px"
              zoom={16}
              pinColor="#0d9488"
            />
          </div>
        )}
      </div>

      {/* Resolution Proof Card (if resolved) */}
      {(request.beforeImage || request.afterImage || request.resolutionNotes) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Field Resolution Proof
          </h2>
          <BeforeAfterViewer beforeImage={request.beforeImage} afterImage={request.afterImage} />
          {request.resolutionNotes && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-teal-400">Resolution Notes: </span>
              {request.resolutionNotes}
            </div>
          )}
        </div>
      )}

      {/* Citizen Feedback & Verification Status (Read-Only for Staff) */}
      {(feedback || request.citizenVerification?.verified || request.verificationIssue?.reported) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Citizen Verification & Feedback</span>
            <span className="text-[11px] text-slate-500 lowercase font-normal italic">Read-only audit</span>
          </h2>

          {request.verificationIssue?.reported && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <HiOutlineExclamationCircle className="text-sm shrink-0" />
                <span>Citizen Reported Issue During Verification</span>
              </div>
              <p className="text-slate-300 text-xs mt-1">"{request.verificationIssue.reason}"</p>
              {request.verificationIssue.reportedAt && (
                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  Reported: {new Date(request.verificationIssue.reportedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {request.citizenVerification?.verified && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2">
              <HiOutlineCheckCircle className="text-emerald-400 text-base shrink-0" />
              <div>
                <span className="font-bold text-emerald-300">Resolution Verified & Accepted by Citizen</span>
                {request.citizenVerification.verifiedAt && (
                  <span className="text-[11px] text-slate-400 ml-2 font-mono">
                    ({new Date(request.citizenVerification.verifiedAt).toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          )}

          {feedback && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rating Awarded by Citizen:</span>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <HiStar key={s} className={s <= feedback.rating ? 'text-amber-400 text-sm' : 'text-slate-800 text-sm'} />
                  ))}
                  <span className="font-bold text-white ml-1">{feedback.rating}/5</span>
                </div>
              </div>
              {feedback.comment && (
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 text-[11px] block mb-1">Citizen Comment:</span>
                  <p className="text-slate-200 leading-relaxed italic">"{feedback.comment}"</p>
                </div>
              )}
              <div className="text-[10px] text-slate-500 pt-1">
                Submitted on {new Date(feedback.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Timeline History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
          Chronological Activity Timeline
        </h2>

        {history.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">No status history recorded yet.</div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {history.map((entry, idx) => (
              <div key={entry._id || idx} className="relative flex items-start gap-4 pl-1">
                <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-teal-500 flex items-center justify-center text-[10px] text-teal-400 z-10 shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-slate-200">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                      {entry.notes}
                    </p>
                  )}
                  {entry.user && (
                    <div className="text-[10px] text-slate-500 pt-1">
                      Logged by: {entry.user.name} ({entry.user.role})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Work Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleStartWorkSubmit}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Start On-Site Work?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will transition request <span className="font-mono text-blue-400 font-bold">{request.requestId}</span> to <span className="font-bold text-teal-400">IN PROGRESS</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Before-Work Site Photo (Optional):
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setBeforeFile(e.target.files[0])}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={starting}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {starting ? 'Starting...' : 'Confirm Work Started'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Work Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddNoteSubmit}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Add Inspection / Work Note</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log progress observations, parts required, or intermediate site status.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Work Note * :
              </label>
              <textarea
                rows={4}
                required
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="e.g. Inspected valve coupling. Excavation completed. Replacement pipe ordered..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNote || !workNote.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Save Work Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submit Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleResolveSubmit}
            className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Mark Request as Resolved</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Make sure on-site work is completed. Provide detailed resolution notes and upload completed repair photos.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resolution Notes (Required) * :
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken, repaired parts, and tested results..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                After-Work Proof Image (Recommended) :
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAfterFile(e.target.files[0])}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolving || !resolutionNotes.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {resolving ? 'Submitting...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700">
            <img src={previewImage} alt="Evidence Zoom" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRequestDetails;
