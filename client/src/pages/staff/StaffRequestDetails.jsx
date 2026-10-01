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

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!workNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await API.post(`/staff/requests/${request._id}/notes`, {
        note: workNote.trim()
      });
      if (res.data.success) {
        toast.success('Work progress note recorded.');
        setShowNoteModal(false);
        setWorkNote('');
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record work note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      toast.error('Please enter meaningful resolution notes (min 5 characters).');
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
        toast.success('Resolution recorded successfully! Sent to citizen for verification.');
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
        <div className="w-10 h-10 border-4 border-[#C65F63] border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs text-[#6B666E] font-medium">Loading staff task details...</div>
      </div>
    );
  }

  if (errorStatus || !request) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-[#B85450] rounded-2xl flex items-center justify-center text-3xl mx-auto">
          <HiOutlineExclamationCircle />
        </div>
        <h2 className="text-xl font-bold text-[#29252A]">
          {errorStatus === 403 ? 'Access Restricted' : 'Request Not Found'}
        </h2>
        <p className="text-xs text-[#6B666E] max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
        <Link
          to="/staff/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#EFE7E0] hover:bg-[#FAF5F0] text-[#29252A] text-xs font-semibold"
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/staff/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6B4E71] hover:text-[#C65F63] transition"
        >
          <HiOutlineArrowLeft className="text-base" />
          <span>Back to Staff Workload</span>
        </Link>

        <span className="text-xs font-mono text-[#9E98A2]">
          Assigned to your field profile
        </span>
      </div>

      {/* Main Request Header Card */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7E0] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono font-bold text-[#C65F63] text-sm tracking-wide">
                {request.requestId}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  request.priority === 'CRITICAL'
                    ? 'bg-[#FDECEF] text-[#B85450] border border-[#B85450]/20'
                    : request.priority === 'HIGH'
                    ? 'bg-amber-50 text-[#D49A4A] border border-[#D49A4A]/20'
                    : 'bg-[#FAF5F0] text-[#6B4E71] border border-[#EFE7E0]'
                }`}
              >
                {request.priority} Priority
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#FAF5F0] text-[#29252A] border border-[#EFE7E0]">
                {request.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#29252A] mt-2 tracking-tight">
              {request.title}
            </h1>
          </div>

          <div className="self-start sm:self-auto flex items-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase border shadow-xs ${
                request.status === 'RESOLVED' || request.status === 'CITIZEN_VERIFIED'
                  ? 'bg-emerald-50 text-[#5C9A72] border-emerald-200'
                  : request.status === 'IN_PROGRESS'
                  ? 'bg-[#E8D7E6] text-[#6B4E71] border-[#6B4E71]/30'
                  : request.status === 'ACCEPTED'
                  ? 'bg-amber-50 text-[#D49A4A] border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {request.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Citizen Contact Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="flex items-center gap-3 bg-[#FAF5F0] p-3.5 rounded-2xl border border-[#EFE7E0]">
            <div className="w-8 h-8 rounded-xl bg-[#FDECEF] text-[#C65F63] flex items-center justify-center text-base">
              <HiOutlineUser />
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Reporting Citizen</div>
              <div className="font-bold text-[#29252A]">{request.citizen?.name || 'Citizen'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF5F0] p-3.5 rounded-2xl border border-[#EFE7E0]">
            <div className="w-8 h-8 rounded-xl bg-[#E8D7E6] text-[#6B4E71] flex items-center justify-center text-base">
              <HiOutlinePhone />
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Citizen Phone</div>
              <div className="font-bold text-[#29252A]">
                {request.citizen?.phone ? (
                  <a href={`tel:${request.citizen.phone}`} className="text-[#C65F63] hover:underline">
                    {request.citizen.phone}
                  </a>
                ) : (
                  'Not provided'
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF5F0] p-3.5 rounded-2xl border border-[#EFE7E0]">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#5C9A72] flex items-center justify-center text-base">
              <HiOutlineOfficeBuilding />
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Assigned Authority</div>
              <div className="font-bold text-[#29252A] truncate">
                {request.municipalitySnapshot?.name || request.municipality?.name || 'Local Municipality'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFE7E0]">
          <div className="text-xs text-[#6B666E]">
            Assigned on: {new Date(request.createdAt).toLocaleDateString()}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {request.status === 'ASSIGNED' && (
              <button
                onClick={handleAccept}
                className="px-4 py-2 rounded-xl bg-[#5C9A72] hover:bg-emerald-600 text-white font-bold text-xs shadow-xs"
              >
                Accept Task
              </button>
            )}

            {request.status === 'ACCEPTED' && (
              <button
                onClick={() => setShowStartModal(true)}
                className="px-4 py-2 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md shadow-[#C65F63]/20 flex items-center gap-1.5"
              >
                <HiOutlinePlay />
                <span>Start Work</span>
              </button>
            )}

            {request.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#EFE7E0] hover:bg-[#FAF5F0] text-[#29252A] font-bold text-xs flex items-center gap-1.5"
                >
                  <HiOutlinePencilAlt />
                  <span>Add Note</span>
                </button>

                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#6B4E71] hover:bg-[#583f5e] text-white font-bold text-xs shadow-md shadow-[#6B4E71]/20 flex items-center gap-1.5"
                >
                  <HiOutlineCheckCircle />
                  <span>Mark Resolved</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description & Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Description Card */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider">
            Issue Description
          </h3>
          <p className="text-xs sm:text-sm text-[#29252A] leading-relaxed whitespace-pre-wrap">
            {request.description}
          </p>

          <div className="pt-3 border-t border-[#EFE7E0] space-y-2 text-xs">
            <div className="flex items-start gap-2 text-[#6B666E]">
              <HiOutlineLocationMarker className="text-base text-[#C65F63] shrink-0 mt-0.5" />
              <span className="text-[#29252A] font-medium leading-relaxed">{request.address}</span>
            </div>
            {request.landmark && (
              <div className="text-[11px] text-[#9E98A2] pl-6">
                Landmark: {request.landmark}
              </div>
            )}
          </div>
        </div>

        {/* Evidence Photo */}
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider">
            Reported Photo Evidence
          </h3>
          {request.images && request.images.length > 0 ? (
            <div className="rounded-2xl overflow-hidden border border-[#EFE7E0] bg-[#FAF5F0] max-h-56 cursor-pointer group relative">
              <img
                src={request.images[0]?.url || request.images[0]}
                alt="Civic Issue Evidence"
                onClick={() => setPreviewImage(request.images[0]?.url || request.images[0])}
                className="w-full h-56 object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-[#29252A]/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                Click to Enlarge
              </div>
            </div>
          ) : (
            <div className="h-44 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] flex flex-col items-center justify-center text-[#9E98A2] text-xs">
              <HiOutlinePhotograph className="text-3xl mb-1" />
              <span>No image provided with this complaint</span>
            </div>
          )}
        </div>
      </div>

      {/* Before & After Work Verification */}
      {(request.beforeImage || request.afterImage) && (
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider">
            Before & After Work Verification
          </h3>
          <BeforeAfterViewer
            beforeImage={request.beforeImage}
            afterImage={request.afterImage}
            resolutionNotes={request.resolutionNotes}
          />
        </div>
      )}

      {/* Map Card */}
      {hasCoordinates && (
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider flex items-center gap-2">
              <HiOutlineGlobe />
              <span>Geocoded Site Coordinates</span>
            </h3>
            <span className="text-[11px] font-mono text-[#9E98A2]">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>
          <div className="h-64 rounded-2xl overflow-hidden border border-[#EFE7E0]">
            <MapView
              latitude={latitude}
              longitude={longitude}
              address={request.address}
              municipality={request.municipalitySnapshot?.name || request.municipality?.name}
            />
          </div>
        </div>
      )}

      {/* Status History & Audit Log */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-xs">
        <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider">
          Task Timeline & Work Logs ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#9E98A2]">
            No status change events recorded yet
          </div>
        ) : (
          <div className="space-y-3 border-l-2 border-[#EFE7E0] ml-3 pl-4">
            {history.map((h) => (
              <div key={h._id} className="relative space-y-1">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#C65F63] border-2 border-white" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#29252A]">{h.action?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-[#9E98A2]">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
                {h.notes && (
                  <p className="text-xs text-[#6B666E] leading-relaxed bg-[#FAF5F0] p-2 rounded-xl border border-[#EFE7E0]">
                    {h.notes}
                  </p>
                )}
                <div className="text-[10px] text-[#9E98A2]">
                  Logged by: {h.user?.name || 'Staff'} ({h.user?.role || 'STAFF'})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Citizen Feedback (If Resolved and Rated) */}
      {feedback && (
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#6B4E71] uppercase tracking-wider flex items-center gap-1.5">
              <HiStar className="text-amber-400 text-lg" />
              <span>Citizen Satisfaction Rating</span>
            </h3>
            <div className="flex items-center gap-1 text-amber-400 text-sm">
              {[1, 2, 3, 4, 5].map((s) => (
                <HiStar key={s} className={s <= feedback.rating ? 'text-amber-400' : 'text-slate-300'} />
              ))}
              <span className="font-bold text-[#29252A] ml-1">{feedback.rating}/5</span>
            </div>
          </div>
          {feedback.comment && (
            <p className="text-xs text-[#6B666E] italic bg-[#FAF5F0] p-3 rounded-xl border border-[#EFE7E0]">
              "{feedback.comment}"
            </p>
          )}
        </div>
      )}

      {/* Start Work Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleStartWorkSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <h3 className="font-bold text-[#29252A] text-base">Record Initial Inspection</h3>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Before-Work Photo / Initial Site Inspection:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBeforeFile(e.target.files[0] || null)}
                className="w-full text-xs text-[#29252A] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FDECEF] file:text-[#C65F63] hover:file:bg-[#FDECEF]/80"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E] hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={starting}
                className="flex-1 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25"
              >
                {starting ? 'Recording...' : 'Commence Work'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Work Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleAddNoteSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <h3 className="font-bold text-[#29252A] text-base">Add Field Progress Note</h3>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Work Note:
              </label>
              <textarea
                rows={3}
                required
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="e.g. Procured replacement pipes, excavation commenced..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E] hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNote}
                className="flex-1 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/25"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Resolved Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-[#29252A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={handleResolveSubmit}
            className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
              <h3 className="font-bold text-[#29252A] text-base">Submit Repair Resolution</h3>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="text-[#9E98A2] hover:text-[#29252A]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                Resolution Actions Taken * (min 5 characters):
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the work completed to fix this problem..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] placeholder-[#9E98A2] focus:outline-none focus:border-[#C65F63] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1.5">
                After-Work Photo Evidence (Optional):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAfterFile(e.target.files[0] || null)}
                className="w-full text-xs text-[#29252A] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FDECEF] file:text-[#C65F63] hover:file:bg-[#FDECEF]/80"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7E0] text-xs font-bold text-[#6B666E] hover:bg-[#FAF5F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolving}
                className="flex-1 py-2.5 rounded-xl bg-[#6B4E71] hover:bg-[#583f5e] text-white text-xs font-bold shadow-md shadow-[#6B4E71]/25"
              >
                {resolving ? 'Submitting...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-[#29252A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2">
            <img src={previewImage} alt="Enlarged Evidence" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#29252A]/60 text-white flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffRequestDetails;
