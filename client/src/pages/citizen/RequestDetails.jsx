import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { joinRequestRoom, leaveRequestRoom } from '../../services/socket';
import { toast } from 'react-toastify';
import RequestHeader from '../../components/requests/RequestHeader';
import RequestLocation from '../../components/requests/RequestLocation';
import RequestEvidence from '../../components/requests/RequestEvidence';
import RequestMetadata from '../../components/requests/RequestMetadata';
import StatusTimeline from '../../components/requests/StatusTimeline';
import RequestNotFound from '../../components/requests/RequestNotFound';
import BeforeAfterViewer from '../../components/requests/BeforeAfterViewer';
import { generateRequestPDF } from '../../services/pdfExporter';
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentDownload,
  HiOutlineCheckCircle,
  HiOutlineChevronRight,
  HiOutlineChatAlt,
  HiOutlineExclamation,
  HiOutlineTrash,
  HiOutlinePencilAlt,
  HiStar
} from 'react-icons/hi';

const RequestDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [request, setRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Comment State
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSuggestion, setFeedbackSuggestion] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Feedback State
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editSuggestion, setEditSuggestion] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const feedbackCategoryOptions = [
    'Service Quality',
    'Staff Behaviour',
    'Resolution Quality',
    'Response Time',
    'Other'
  ];

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const fetchFeedback = useCallback(async (reqTargetId) => {
    const target = reqTargetId || id;
    try {
      setFeedbackLoading(true);
      const res = await API.get(`/feedback/request/${target}`);
      if (res.data.success && res.data.feedback) {
        setFeedback(res.data.feedback);
        setEditRating(res.data.feedback.rating);
        setEditComment(res.data.feedback.comment || '');
      } else {
        setFeedback(null);
      }
    } catch (err) {
      console.warn('Fetch Feedback Error:', err.message);
    } finally {
      setFeedbackLoading(false);
    }
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage('');
    try {
      const res = await API.get(`/requests/${id}`);
      if (res.data.success) {
        const reqData = res.data.request;
        setRequest(reqData);
        setHistory(res.data.history || []);
        setComments(res.data.comments || []);

        if (['CITIZEN_VERIFIED', 'CLOSED', 'RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(reqData.status)) {
          fetchFeedback(reqData._id);
        }
      }
    } catch (err) {
      console.error('Fetch Request Details Error:', err);
      const status = err.response?.status || 500;
      setErrorStatus(status);
      setErrorMessage(
        err.response?.data?.message || 'The service request you are looking for does not exist or is no longer available.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Real-time socket updates for request tracking & feedback
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
            resolvedAt: payload.request?.resolvedAt || (['RESOLVED', 'RESOLUTION_SUBMITTED'].includes(payload.status) ? payload.changedAt : prev.resolvedAt),
            verifiedAt: payload.request?.verifiedAt || (['CITIZEN_VERIFIED', 'CLOSED'].includes(payload.status) ? payload.changedAt : prev.verifiedAt),
            updatedAt: payload.changedAt || new Date().toISOString()
          };
        });

        setHistory((prevHistory) => {
          // Prevent duplicate history insertion
          const isDuplicate = prevHistory.some(
            (h) => (h.action === `STATUS_${payload.status}` || h.newStatus === payload.status) &&
                   (payload.previousStatus ? h.previousStatus === payload.previousStatus : true)
          );
          if (isDuplicate) return prevHistory;

          const entry = {
            _id: 'rt_' + Date.now(),
            action: `STATUS_${payload.status}`,
            previousStatus: payload.previousStatus,
            newStatus: payload.status,
            notes: payload.note || `Status transitioned to ${payload.status}`,
            createdAt: payload.changedAt || new Date().toISOString(),
            user: payload.changedBy || { name: 'System / Staff', role: 'STAFF' }
          };
          return [...prevHistory, entry];
        });

        if (['CITIZEN_VERIFIED', 'CLOSED'].includes(payload.status)) {
          fetchFeedback(targetMongoId);
        }
      }
    };

    const handleFeedbackSubmitted = (payload) => {
      if (payload.feedback && (payload.requestId === id || payload.feedback.request === id || payload.feedback.request === request?._id)) {
        setFeedback(payload.feedback);
        setEditRating(payload.feedback.rating);
        setEditComment(payload.feedback.comment || '');
      }
    };

    const handleFeedbackUpdated = (payload) => {
      if (payload.feedback && (payload.requestId === id || payload.feedback.request === id || payload.feedback.request === request?._id)) {
        setFeedback(payload.feedback);
        setEditRating(payload.feedback.rating);
        setEditComment(payload.feedback.comment || '');
        setIsEditingFeedback(false);
      }
    };

    const handleFeedbackDeleted = (payload) => {
      if (payload.requestId === id || payload.requestId === request?._id) {
        setFeedback(null);
        setIsEditingFeedback(false);
      }
    };

    socket.on('request:statusChanged', handleStatusChanged);
    socket.on('feedback:submitted', handleFeedbackSubmitted);
    socket.on('feedback:updated', handleFeedbackUpdated);
    socket.on('feedback:deleted', handleFeedbackDeleted);

    return () => {
      leaveRequestRoom(id);
      if (request?.requestId) leaveRequestRoom(request.requestId);
      if (request?._id) leaveRequestRoom(request._id.toString());
      socket.off('request:statusChanged', handleStatusChanged);
      socket.off('feedback:submitted', handleFeedbackSubmitted);
      socket.off('feedback:updated', handleFeedbackUpdated);
      socket.off('feedback:deleted', handleFeedbackDeleted);
    };
  }, [socket, id, request?.requestId, request?._id, fetchFeedback]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const res = await API.post(`/requests/${id}/comments`, { message: newComment });
      if (res.data.success) {
        setComments((prev) => [...prev, res.data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommenting(false);
    }
  };

  const handleVerifyResolution = async () => {
    setVerifying(true);
    try {
      const res = await API.patch(`/requests/${id}/verify`, { rating, comment: feedbackComment });
      if (res.data.success) {
        setShowVerifyModal(false);
        // Also record feedback if rating provided
        if (rating) {
          await API.post('/feedback', {
            requestId: request?._id || id,
            rating,
            comment: feedbackComment,
            suggestion: feedbackSuggestion,
            categories: selectedCategories
          }).catch(() => {});
        }
        toast.success('Resolution verified and closed successfully! Thank you for confirming.');
        await fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReopenRequest = async () => {
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason why the issue is not resolved.');
      return;
    }
    setReopening(true);
    try {
      const res = await API.patch(`/requests/${id}/reopen`, { reason: reopenReason.trim() });
      if (res.data.success) {
        toast.info('Request has been reopened and returned to field staff.');
        setShowReopenModal(false);
        setReopenReason('');
        await fetchDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reopen failed. Please try again.');
    } finally {
      setReopening(false);
    }
  };

  const handleSubmitStandaloneFeedback = async (e) => {
    e.preventDefault();
    setFeedbackError('');
    setSubmittingFeedback(true);
    try {
      const res = await API.post('/feedback', {
        requestId: request?._id || id,
        rating,
        comment: feedbackComment.trim(),
        suggestion: feedbackSuggestion.trim(),
        categories: selectedCategories
      });
      if (res.data.success) {
        toast.success('Feedback submitted successfully!');
        setFeedback(res.data.feedback);
        setEditRating(res.data.feedback.rating);
        setEditComment(res.data.feedback.comment || '');
        setEditSuggestion(res.data.feedback.suggestion || '');
        setFeedbackComment('');
        setFeedbackSuggestion('');
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Failed to submit feedback.');
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleUpdateFeedback = async (e) => {
    e.preventDefault();
    if (!feedback?._id) return;
    setSubmittingFeedback(true);
    try {
      const res = await API.patch(`/feedback/${feedback._id}`, {
        rating: editRating,
        comment: editComment.trim()
      });
      if (res.data.success) {
        toast.success('Feedback review updated successfully!');
        setFeedback(res.data.feedback);
        setIsEditingFeedback(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedback?._id) return;
    if (!window.confirm('Are you sure you want to delete your feedback review?')) return;
    try {
      const res = await API.delete(`/feedback/${feedback._id}`);
      if (res.data.success) {
        toast.info('Feedback review deleted.');
        setFeedback(null);
        setIsEditingFeedback(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete feedback.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#C65F63] border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs text-[#6B666E] font-medium">Loading request tracking details...</div>
      </div>
    );
  }

  if (errorStatus || !request) {
    return <RequestNotFound message={errorMessage} />;
  }

  const isCitizenOwner = user && (request.citizen?._id === user._id || request.citizen === user._id);
  const isPendingVerification = ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(request.status);
  const isClosedOrVerified = ['CITIZEN_VERIFIED', 'CLOSED'].includes(request.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar: Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#6B666E]">
          <Link to="/dashboard" className="hover:text-[#C65F63] transition font-semibold">
            Dashboard
          </Link>
          <HiOutlineChevronRight className="text-[#9E98A2] text-xs" />
          <Link to="/requests" className="hover:text-[#C65F63] transition font-semibold">
            My Requests
          </Link>
          <HiOutlineChevronRight className="text-[#9E98A2] text-xs" />
          <span className="font-mono font-bold text-[#C65F63]">#{request.requestId}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#FAF5F0] text-[#29252A] border border-[#EFE7E0] text-xs font-bold transition shadow-sm"
          >
            <HiOutlineArrowLeft />
            <span>Back to My Requests</span>
          </Link>

          <button
            onClick={() => generateRequestPDF(request, history, feedback)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDECEF] hover:bg-[#F8DCE2] text-[#C65F63] border border-[#C65F63]/30 text-xs font-bold transition shadow-sm"
          >
            <HiOutlineDocumentDownload className="text-base" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Primary Header Card */}
      <RequestHeader request={request} />

      {/* Resolution Verification Section (When Pending Verification) */}
      {isCitizenOwner && isPendingVerification && (
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7E0] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-base">
                <HiOutlineCheckCircle className="text-2xl text-emerald-600" />
                <span>Resolution Verification</span>
              </div>
              <p className="text-xs text-[#6B666E] leading-relaxed">
                Field staff have completed site work and submitted resolution proof. Please inspect the repair details below and confirm completion.
              </p>
            </div>
            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-[#FDECEF] text-[#C65F63] border border-[#C65F63]/20">
              Pending Verification
            </span>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE7E0] text-xs">
            <div>
              <span className="text-[#6B666E]">Service Request:</span>{' '}
              <span className="font-bold text-[#29252A]">{request.title} (#{request.requestId})</span>
            </div>
            <div>
              <span className="text-[#6B666E]">Category & Location:</span>{' '}
              <span className="text-[#29252A]">{request.category} • {request.address}</span>
            </div>
            <div>
              <span className="text-[#6B666E]">Assigned Department:</span>{' '}
              <span className="text-[#6B4E71] font-bold">{request.department?.name || 'Municipal Works'}</span>
            </div>
            <div>
              <span className="text-[#6B666E]">Resolution Date:</span>{' '}
              <span className="text-[#29252A]">{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString() : 'Recently Submitted'}</span>
            </div>
          </div>

          {/* Resolution Notes */}
          {request.resolutionNotes && (
            <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] text-xs text-[#29252A] space-y-1">
              <span className="font-bold text-[#6B4E71] uppercase tracking-wider text-[10px]">Field Staff Repair Notes:</span>
              <p className="leading-relaxed">{request.resolutionNotes}</p>
            </div>
          )}

          {(request.beforeImage || request.afterImage) && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-[#6B666E]">Before & After Work Comparison:</div>
              <BeforeAfterViewer beforeImage={request.beforeImage} afterImage={request.afterImage} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <HiOutlineCheckCircle className="text-base" />
              <span>Verify Resolution</span>
            </button>
            <button
              onClick={() => setShowReopenModal(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5"
            >
              <HiOutlineExclamation className="text-base" />
              <span>Report Issue / Reject Resolution</span>
            </button>
          </div>
        </div>
      )}

      {/* Citizen Feedback & Rating Section (When Closed / Verified) */}
      {isCitizenOwner && isClosedOrVerified && (
        <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-4">
            <h2 className="text-base font-black text-[#29252A] flex items-center gap-2">
              <HiStar className="text-amber-500 text-lg" />
              <span>{feedback ? 'Your Feedback & Quality Rating' : 'Rate This Service'}</span>
            </h2>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Verified & Closed
            </span>
          </div>

          {feedbackLoading ? (
            <div className="py-6 text-center text-xs text-[#6B666E]">Checking existing feedback...</div>
          ) : feedback && !isEditingFeedback ? (
            /* Display Submitted Feedback */
            <div className="p-5 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[#6B666E] text-[11px]">You rated this resolution:</div>
                  <div className="flex items-center gap-1.5 text-amber-500 text-lg">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <HiStar
                        key={s}
                        className={s <= feedback.rating ? 'text-amber-500' : 'text-slate-300'}
                      />
                    ))}
                    <span className="text-xs font-bold text-[#29252A] ml-2">
                      {feedback.rating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditRating(feedback.rating);
                      setEditComment(feedback.comment || '');
                      setIsEditingFeedback(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF5F0] text-[#29252A] border border-[#EFE7E0] text-xs font-bold transition"
                  >
                    <HiOutlinePencilAlt />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteFeedback}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200"
                  >
                    <HiOutlineTrash />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {feedback.comment && (
                <div className="pt-2 border-t border-[#EFE7E0] text-[#29252A] leading-relaxed italic">
                  "{feedback.comment}"
                </div>
              )}

              {feedback.suggestion && (
                <div className="text-xs text-[#6B4E71] bg-[#E8D7E6]/40 border border-[#6B4E71]/20 p-3 rounded-xl">
                  <span className="font-bold text-[#6B4E71]">Your Suggestion:</span> {feedback.suggestion}
                </div>
              )}

              <div className="text-[10px] text-[#9E98A2]">
                Submitted on: {new Date(feedback.createdAt).toLocaleString()}
                {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && ' (edited)'}
              </div>
            </div>
          ) : isEditingFeedback ? (
            /* Edit Feedback Form */
            <form onSubmit={handleUpdateFeedback} className="space-y-3 bg-[#FAF5F0] p-5 rounded-2xl border border-[#EFE7E0]">
              <div className="text-xs font-bold text-[#29252A]">Edit Your Service Rating</div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditRating(s)}
                    className={`p-2.5 rounded-xl border text-xl transition ${
                      s <= editRating
                        ? 'bg-amber-100 text-amber-600 border-amber-300 shadow-sm'
                        : 'bg-white text-slate-400 border-[#EFE7E0] hover:text-amber-500'
                    }`}
                    title={`Rate ${s} Star${s > 1 ? 's' : ''}`}
                    aria-label={`${s} Star${s > 1 ? 's' : ''}`}
                  >
                    <HiStar />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-600 ml-2">{editRating} Star{editRating > 1 ? 's' : ''}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#29252A] mb-1">
                  Feedback Comment (Optional):
                </label>
                <textarea
                  rows={3}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Was the issue resolved properly?"
                  className="w-full bg-white border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-5 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submittingFeedback ? 'Updating...' : 'Update Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingFeedback(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#EFE7E0] text-[#6B666E] font-bold text-xs hover:bg-[#FAF5F0] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Standalone Feedback Submission Form */
            <form onSubmit={handleSubmitStandaloneFeedback} className="space-y-4 bg-[#FAF5F0] p-5 rounded-2xl border border-[#EFE7E0]">
              <p className="text-xs text-[#6B666E] leading-relaxed">
                Thank you for verifying this service request. Please take a moment to rate the timeliness and quality of the municipal repair.
              </p>

              {feedbackError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {feedbackError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#29252A]">
                  Select Rating (1 to 5 Stars): <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`p-2.5 rounded-xl border text-xl transition ${
                        s <= rating
                          ? 'bg-amber-100 text-amber-600 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-400 border-[#EFE7E0] hover:text-amber-500'
                      }`}
                      title={`Rate ${s} Star${s > 1 ? 's' : ''}`}
                      aria-label={`${s} Star${s > 1 ? 's' : ''}`}
                    >
                      <HiStar />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 ml-2">{rating} Star{rating > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#29252A]">
                  Feedback Comment (Optional):
                </label>
                <textarea
                  rows={2}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Share feedback on repair quality, speed, or staff communication..."
                  className="w-full bg-white border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-6 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Problem Description Section */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
        <h2 className="text-base font-black text-[#29252A] border-b border-[#EFE7E0] pb-3">Problem Description</h2>
        <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] text-xs text-[#29252A] leading-relaxed whitespace-pre-line">
          {request.description}
        </div>
      </div>

      {/* Location Section */}
      <RequestLocation
        location={request.location}
        address={request.address}
        city={request.city}
        district={request.district || request.municipalitySnapshot?.district || request.municipality?.district}
        state={request.state}
        pincode={request.pincode}
        municipality={request.municipality || request.municipalitySnapshot}
      />

      {/* Evidence Section */}
      <RequestEvidence
        images={request.images}
        beforeImage={request.beforeImage}
        afterImage={request.afterImage}
      />

      {/* Status Timeline & Metadata Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatusTimeline currentStatus={request.status} history={history} />
        </div>
        <div>
          <RequestMetadata request={request} />
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-black text-[#29252A] flex items-center gap-2 border-b border-[#EFE7E0] pb-3">
          <HiOutlineChatAlt className="text-[#C65F63] text-lg" />
          <span>Activity Discussion & Updates ({comments.length})</span>
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or question about this request..."
            className="flex-1 bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl px-4 py-2.5 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={commenting || !newComment.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#B35256] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {commenting ? 'Posting...' : 'Post'}
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <div className="text-xs text-[#6B666E] italic py-4 text-center bg-[#FAF5F0] rounded-xl border border-[#EFE7E0]">
              No comments posted yet.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#29252A]">{c.user?.name || 'User'}</span>
                  <span className="text-[10px] text-[#9E98A2]">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[#6B666E] leading-relaxed">{c.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verify Resolution Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-[#29252A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-[#29252A] flex items-center gap-2">
              <HiOutlineCheckCircle className="text-emerald-600 text-xl" />
              <span>Verify Work & Close Request</span>
            </h3>

            <p className="text-xs text-[#6B666E] leading-relaxed">
              Confirming verification will mark this service request as <strong>Closed</strong>. You can optionally rate the repair now.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-2">Rating (1 to 5 Stars):</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`p-2.5 rounded-xl text-xl border transition ${
                      s <= rating
                        ? 'bg-amber-100 text-amber-600 border-amber-300'
                        : 'bg-[#FAF5F0] text-slate-300 border-[#EFE7E0]'
                    }`}
                    aria-label={`${s} star rating`}
                  >
                    <HiStar />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">Feedback Comment (Optional):</label>
              <textarea
                rows={3}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="How was the response speed and repair quality?"
                maxLength={1000}
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] focus:outline-none focus:border-[#C65F63]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#EFE7E0] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyResolution}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Confirm & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Request Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-[#29252A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-md w-full bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-[#29252A] flex items-center gap-2">
              <HiOutlineExclamation className="text-rose-600 text-xl" />
              <span>Report Issue / Reopen Request</span>
            </h3>
            <p className="text-xs text-[#6B666E]">
              Please explain why the issue is still unresolved so the field team can be reassigned to inspect.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#29252A] mb-1">
                Reason for Reopening: <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                maxLength={1000}
                placeholder="Describe what is still broken or incomplete..."
                className="w-full bg-[#FAF5F0] border border-[#EFE7E0] rounded-xl p-3 text-xs text-[#29252A] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF5F0] border border-[#EFE7E0] text-[#6B666E] text-xs font-bold hover:bg-[#EFE7E0] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reopening || !reopenReason.trim()}
                onClick={handleReopenRequest}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {reopening ? 'Reopening...' : 'Submit Reopen Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;
