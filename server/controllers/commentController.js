const Comment = require('../models/Comment');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const { emitToRequestRoom, emitToUser } = require('../services/socketService');

// @desc    Add comment to request
// @route   POST /api/requests/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { message } = req.body;
    const requestId = req.params.id;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment message is required' });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Role-based authorization: Citizens can only comment on their own requests, Staff on assigned requests
    if (req.user.role === 'CITIZEN' && request.citizen && request.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only comment on your own service requests.'
      });
    }

    if (req.user.role === 'STAFF') {
      const assignedId = request.assignedStaff?.toString() || request.assignedTo?.toString();
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only comment on requests assigned to you.'
        });
      }
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => `/uploads/${file.filename}`);
    }

    const comment = await Comment.create({
      request: requestId,
      user: req.user._id,
      message,
      attachments
    });

    const populatedComment = await Comment.findById(comment._id).populate('user', 'name role profileImage');

    // Broadcast comment to request room via Socket.IO
    emitToRequestRoom(requestId, 'newComment', { comment: populatedComment });

    // Notify request owner if commenter is Staff/Admin, or notify Staff if commenter is Citizen
    if (req.user.role === 'CITIZEN' && request.assignedStaff) {
      const notif = await Notification.create({
        user: request.assignedStaff,
        type: 'COMMENT',
        title: 'New Comment on Request',
        message: `${req.user.name} commented on [${request.requestId}]: ${message.substring(0, 40)}...`,
        request: request._id
      });
      emitToUser(request.assignedStaff, 'newNotification', notif);
    } else if ((req.user.role === 'STAFF' || req.user.role === 'ADMIN') && request.citizen.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        user: request.citizen,
        type: 'COMMENT',
        title: 'Update from Staff / Official',
        message: `${req.user.name} commented on [${request.requestId}]: ${message.substring(0, 40)}...`,
        request: request._id
      });
      emitToUser(request.citizen, 'newNotification', notif);
    }

    res.status(201).json({
      success: true,
      comment: populatedComment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addComment };

