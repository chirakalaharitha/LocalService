const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Request = require('../models/Request');
const User = require('../models/User');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const { createNotification } = require('../services/notificationService');
const {
  sendFeedbackSubmittedStaffEmail,
  sendFeedbackSubmittedAdminEmail
} = require('../services/emailService');
const {
  emitFeedbackSubmitted,
  emitFeedbackUpdated,
  emitFeedbackDeleted
} = require('../services/socketService');

// @desc    Submit feedback & rating after verification
// @route   POST /api/feedback
// @access  Private (CITIZEN)
const submitFeedback = async (req, res, next) => {
  try {
    const { requestId, rating, comment } = req.body || {};

    if (!requestId || rating === undefined || rating === null) {
      return res.status(400).json({ success: false, message: 'Request ID and rating (1-5) are required' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    if (comment && typeof comment === 'string' && comment.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Feedback comment cannot exceed 1000 characters' });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(requestId);
    const query = isObjectId ? { $or: [{ _id: requestId }, { requestId }] } : { requestId };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only the reporting citizen (or admin) can submit feedback
    if (request.citizen.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the reporting citizen can submit feedback for this request' });
    }

    // Feedback should only be submitted on resolved / verified / closed requests
    if (!['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION', 'CITIZEN_VERIFIED', 'CLOSED'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for completed or verified requests'
      });
    }

    const existing = await Feedback.findOne({ request: request._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted for this request' });
    }

    const cleanComment = (comment || req.body.feedback || '').toString().trim();
    const cleanSuggestion = (req.body.suggestion || '').toString().trim();
    const categories = Array.isArray(req.body.categories) ? req.body.categories : [];

    const feedback = await Feedback.create({
      request: request._id,
      citizen: req.user._id,
      staff: request.assignedStaff || request.assignedTo || null,
      municipality: request.municipality || null,
      rating: numRating,
      comment: cleanComment,
      suggestion: cleanSuggestion,
      categories
    });

    // Populate for response
    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('citizen', 'name email profileImage')
      .populate('staff', 'name email phone')
      .populate('request', 'requestId title category status address municipality');

    // Emit Socket.IO event strictly after database write
    emitFeedbackSubmitted({
      feedback: populatedFeedback,
      request,
      citizen: req.user
    });

    // 1. Notify assigned staff (in-app + real email)
    const targetStaffId = request.assignedStaff || request.assignedTo;
    if (targetStaffId) {
      await createNotification({
        recipient: targetStaffId,
        type: NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
        title: 'Citizen Rating Received',
        message: `Citizen rated your work ${numRating}/5 stars on [${request.requestId}].`,
        request,
        actor: req.user._id,
        customEmailFn: (staffUser) => sendFeedbackSubmittedStaffEmail({
          to: staffUser.email,
          staffName: staffUser.name,
          request,
          feedback: populatedFeedback,
          citizenName: req.user.name
        })
      }).catch((err) => console.error('[Feedback Notification Staff Error]:', err.message));
    }

    // 2. Find and notify responsible municipality Admin (in-app + real email)
    let munAdmin = null;
    if (request.municipality) {
      munAdmin = await User.findOne({
        role: 'ADMIN',
        municipality: request.municipality,
        isActive: true
      });
    }
    if (!munAdmin) {
      munAdmin = await User.findOne({ role: 'ADMIN', isActive: true });
    }

    if (munAdmin) {
      await createNotification({
        recipient: munAdmin._id,
        type: NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
        title: 'New Citizen Feedback Received',
        message: `New ${numRating}-star rating received for request [${request.requestId}] in ${request.category}.`,
        request,
        actor: req.user._id,
        customEmailFn: (adminUser) => sendFeedbackSubmittedAdminEmail({
          to: adminUser.email,
          adminName: adminUser.name,
          request,
          feedback: populatedFeedback,
          citizenName: req.user.name
        })
      }).catch((err) => console.error('[Feedback Notification Admin Error]:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: populatedFeedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for a specific request
// @route   GET /api/feedback/request/:requestId
// @access  Private
const getFeedbackByRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(requestId);
    const query = isObjectId ? { $or: [{ _id: requestId }, { requestId }] } : { requestId };

    const request = await Request.findOne(query);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const feedback = await Feedback.findOne({ request: request._id })
      .populate('citizen', 'name email profileImage')
      .populate('request', 'requestId title category status');

    res.status(200).json({
      success: true,
      feedback: feedback || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update citizen's own feedback
// @route   PATCH /api/feedback/:id (or PUT /api/feedback/:id)
// @access  Private (CITIZEN owner)
const updateFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body || {};

    const feedback = await Feedback.findById(id).populate('request', 'requestId title category');
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Strict ownership: only creator of the feedback can update
    if (feedback.citizen.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. You can only modify your own feedback.' });
    }

    if (rating !== undefined && rating !== null) {
      const numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
      }
      feedback.rating = numRating;
    }

    if (comment !== undefined && comment !== null) {
      if (typeof comment === 'string' && comment.trim().length > 1000) {
        return res.status(400).json({ success: false, message: 'Feedback comment cannot exceed 1000 characters' });
      }
      feedback.comment = String(comment).trim();
    }

    await feedback.save();

    const updated = await Feedback.findById(feedback._id)
      .populate('citizen', 'name email profileImage')
      .populate('request', 'requestId title category status');

    emitFeedbackUpdated({
      feedback,
      requestId: feedback.request?._id || feedback.request
    });

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      feedback: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete citizen's own feedback
// @route   DELETE /api/feedback/:id
// @access  Private (CITIZEN owner, ADMIN)
const deleteFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Staff cannot delete feedback; only citizen owner or Admin can delete
    if (feedback.citizen.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot delete another user feedback.' });
    }

    const requestId = feedback.request;
    await feedback.deleteOne();

    emitFeedbackDeleted({
      feedbackId: id,
      requestId
    });

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedbacks overview (Scoped to Admin Municipality)
// @route   GET /api/feedback
// @access  Private (ADMIN)
const getFeedbacks = async (req, res, next) => {
  try {
    const adminMun = req.user.municipality;
    const query = {};

    if (adminMun) {
      query.municipality = adminMun;
    }

    if (req.query.rating) {
      query.rating = parseInt(req.query.rating, 10);
    }

    if (req.query.staffId) {
      query.staff = req.query.staffId;
    }

    let feedbacks = await Feedback.find(query)
      .populate('citizen', 'name email profileImage')
      .populate('staff', 'name email phone')
      .populate({
        path: 'request',
        select: 'requestId title category status department address municipality',
        populate: { path: 'department', select: 'name code' }
      })
      .sort({ createdAt: -1 });

    // Fallback filter by request.municipality in case older records did not have direct municipality set
    if (adminMun) {
      feedbacks = feedbacks.filter((f) => {
        const fMun = f.municipality || f.request?.municipality;
        return !fMun || fMun.toString() === adminMun.toString();
      });
    }

    // Optional category filter
    if (req.query.category && req.query.category !== 'ALL') {
      feedbacks = feedbacks.filter((f) => f.request?.category === req.query.category);
    }

    const total = feedbacks.length;
    const avgRating = total > 0 ? Number((feedbacks.reduce((acc, f) => acc + f.rating, 0) / total).toFixed(2)) : 0;

    const ratingDistribution = {
      5: feedbacks.filter((f) => f.rating === 5).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      1: feedbacks.filter((f) => f.rating === 1).length
    };

    res.status(200).json({
      success: true,
      stats: {
        total,
        avgRating,
        ratingDistribution
      },
      feedbacks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedbacks on requests assigned to logged-in staff member
// @route   GET /api/feedback/staff/my
// @access  Private (STAFF, ADMIN)
const getStaffFeedbacks = async (req, res, next) => {
  try {
    // Find requests assigned to staff
    const assignedRequests = await Request.find({
      $or: [
        { assignedStaff: req.user._id },
        { assignedTo: req.user._id }
      ]
    }).select('_id');

    const requestIds = assignedRequests.map((r) => r._id);

    const feedbacks = await Feedback.find({
      $or: [
        { request: { $in: requestIds } },
        { staff: req.user._id }
      ]
    })
      .populate('citizen', 'name profileImage')
      .populate('request', 'requestId title category status address')
      .sort({ createdAt: -1 });

    const total = feedbacks.length;
    const avgRating = total > 0 ? Number((feedbacks.reduce((acc, f) => acc + f.rating, 0) / total).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      count: total,
      avgRating,
      feedbacks
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByRequest,
  updateFeedback,
  deleteFeedback,
  getFeedbacks,
  getStaffFeedbacks
};

