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
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs text-slate-400 font-medium">Loading request tracking details...</div>
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
        <div className="flex items-center gap-2 text-slate-400">
          <Link to="/dashboard" className="hover:text-blue-400 transition">
            Dashboard
          </Link>
          <HiOutlineChevronRight className="text-slate-600 text-xs" />
          <Link to="/my-requests" className="hover:text-blue-400 transition">
            My Requests
          </Link>
          <HiOutlineChevronRight className="text-slate-600 text-xs" />
          <span className="font-mono font-bold text-slate-200">{request.requestId}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/my-requests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition"
          >
            <HiOutlineArrowLeft />
            <span>Back to My Requests</span>
          </Link>

          <button
            onClick={() => generateRequestPDF(request, history, feedback)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
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
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <HiOutlineCheckCircle className="text-2xl" />
                <span>Resolution Verification</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Field staff have completed site work and submitted resolution proof. Please inspect the repair details below and confirm completion.
              </p>
            </div>
            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Pending Verification
            </span>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500">Service Request:</span>{' '}
              <span className="font-bold text-slate-200">{request.title} ({request.requestId})</span>
            </div>
            <div>
              <span className="text-slate-500">Category & Location:</span>{' '}
              <span className="text-slate-300">{request.category} • {request.address}</span>
            </div>
            <div>
              <span className="text-slate-500">Assigned Department:</span>{' '}
              <span className="text-teal-400 font-semibold">{request.department?.name || 'Municipal Works'}</span>
            </div>
            <div>
              <span className="text-slate-500">Resolution Date:</span>{' '}
              <span className="text-slate-300">{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString() : 'Recently Submitted'}</span>
            </div>
          </div>

          {/* Resolution Notes & Proof Preview */}
          {request.resolutionNotes && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">Field Staff Repair Notes:</span>
              <p className="leading-relaxed">{request.resolutionNotes}</p>
            </div>
          )}

          {(request.beforeImage || request.afterImage) && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-slate-400">Before & After Work Comparison:</div>
              <BeforeAfterViewer beforeImage={request.beforeImage} afterImage={request.afterImage} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <HiOutlineCheckCircle className="text-base" />
              <span>Verify Resolution</span>
            </button>
            <button
              onClick={() => setShowReopenModal(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition flex items-center justify-center gap-1.5"
            >
              <HiOutlineExclamation className="text-base" />
              <span>Report Issue / Reject Resolution</span>
            </button>
          </div>
        </div>
      )}

      {/* Citizen Feedback & Rating Section (When Closed / Verified) */}
      {isCitizenOwner && isClosedOrVerified && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HiStar className="text-amber-400 text-lg" />
              <span>{feedback ? 'Your Feedback & Quality Rating' : 'Rate This Service'}</span>
            </h2>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Verified & Closed
            </span>
          </div>

          {feedbackLoading ? (
            <div className="py-6 text-center text-xs text-slate-500">Checking existing feedback...</div>
          ) : feedback && !isEditingFeedback ? (
            /* Display Submitted Feedback */
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-400 text-[11px]">You rated this resolution:</div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-lg">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <HiStar
                        key={s}
                        className={s <= feedback.rating ? 'text-amber-400' : 'text-slate-700'}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-300 ml-2">
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    <HiOutlinePencilAlt />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteFeedback}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition border border-rose-500/30"
                  >
                    <HiOutlineTrash />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {feedback.comment && (
                <div className="pt-2 border-t border-slate-900 text-slate-300 leading-relaxed italic">
                  "{feedback.comment}"
                </div>
              )}

              {feedback.suggestion && (
                <div className="text-xs text-teal-300 bg-teal-950/40 border border-teal-900/60 p-2.5 rounded-lg">
                  <span className="font-semibold text-teal-400">Your Suggestion:</span> {feedback.suggestion}
                </div>
              )}

              {feedback.categories && feedback.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {feedback.categories.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-900/60">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-slate-500">
                Submitted on: {new Date(feedback.createdAt).toLocaleString()}
                {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && ' (edited)'}
              </div>
            </div>
          ) : isEditingFeedback ? (
            /* Edit Feedback Form */
            <form onSubmit={handleUpdateFeedback} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-slate-200">Edit Your Service Rating</div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditRating(s)}
                    className={`p-2.5 rounded-xl border text-xl transition ${
                      s <= editRating
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-md'
                        : 'bg-slate-900 text-slate-600 border-slate-800 hover:text-slate-400'
                    }`}
                    title={`Rate ${s} Star${s > 1 ? 's' : ''}`}
                    aria-label={`${s} Star${s > 1 ? 's' : ''}`}
                  >
                    <HiStar />
                  </button>
                ))}
                <span className="text-xs font-semibold text-amber-400 ml-2">{editRating} Star{editRating > 1 ? 's' : ''}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Feedback Comment (Optional, max 1000 chars):
                </label>
                <textarea
                  rows={3}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Was the issue resolved properly?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50"
                >
                  {submittingFeedback ? 'Updating...' : 'Update Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingFeedback(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Standalone Feedback Submission Form */
            <form onSubmit={handleSubmitStandaloneFeedback} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-300 leading-relaxed">
                Thank you for verifying this service request. Please take a moment to rate the timeliness and quality of the municipal repair.
              </p>

              {feedbackError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {feedbackError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Rating (1 to 5 Stars): <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`p-2.5 rounded-xl border text-xl transition ${
                        s <= rating
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-md'
                          : 'bg-slate-900 text-slate-600 border-slate-800 hover:text-slate-400'
                      }`}
                      title={`Rate ${s} Star${s > 1 ? 's' : ''}`}
                      aria-label={`${s} Star${s > 1 ? 's' : ''}`}
                    >
                      <HiStar />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">{rating} Star{rating > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Feedback Categories */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Feedback Categories (Optional):
                </label>
                <div className="flex flex-wrap gap-2">
                  {feedbackCategoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                        selectedCategories.includes(cat)
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500/60'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Feedback Comment (Optional):
                </label>
                <textarea
                  rows={2}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Share feedback on repair quality, speed, or staff communication..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Improvement Suggestion (Optional):
                </label>
                <textarea
                  rows={2}
                  value={feedbackSuggestion}
                  onChange={(e) => setFeedbackSuggestion(e.target.value)}
                  maxLength={1000}
                  placeholder="How can municipal services be improved next time?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Problem Description Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">Problem Description</h2>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
          {request.description}
        </div>
      </div>

      {/* Location Section */}
      <RequestLocation
        location={request.location}
        address={request.address}
        city={request.city}
        state={request.state}
        pincode={request.pincode}
      />

      {/* Evidence Section */}
      <RequestEvidence
        images={request.images}
        beforeImage={request.beforeImage}
        afterImage={request.afterImage}
      />

      {/* Before & After Proof Viewer (If staff uploaded) */}
      {(request.beforeImage || request.afterImage || request.resolutionNotes) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">Field Resolution Proof</h2>
          <BeforeAfterViewer beforeImage={request.beforeImage} afterImage={request.afterImage} />
          {request.resolutionNotes && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-teal-400">Field Worker Notes: </span>
              {request.resolutionNotes}
            </div>
          )}
        </div>
      )}

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <HiOutlineChatAlt className="text-blue-400 text-lg" />
          <span>Activity Discussion & Updates ({comments.length})</span>
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or question about this request..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={commenting || !newComment.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50"
          >
            {commenting ? 'Posting...' : 'Post'}
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-4">No comments posted yet.</div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{c.user?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{c.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verify Resolution Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineCheckCircle className="text-emerald-400 text-xl" />
              <span>Verify Work & Close Request</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Confirming verification will mark this service request as <strong>Closed</strong>. You can optionally rate the repair now.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Rating (1 to 5 Stars):</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`p-2.5 rounded-xl text-xl border transition ${
                      s <= rating
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-950 text-slate-600 border-slate-800'
                    }`}
                    aria-label={`${s} star rating`}
                  >
                    <HiStar />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Comment (Optional):</label>
              <textarea
                rows={3}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="How was the response speed and repair quality?"
                maxLength={1000}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyResolution}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Confirm & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Request Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineExclamation className="text-rose-400 text-xl" />
              <span>Report Issue / Reopen Request</span>
            </h3>
            <p className="text-xs text-slate-400">
              Please explain why the issue is still unresolved so the field team can be reassigned to inspect.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Reopening: <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                maxLength={1000}
                placeholder="Describe what is still broken or incomplete..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reopening || !reopenReason.trim()}
                onClick={handleReopenRequest}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
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
