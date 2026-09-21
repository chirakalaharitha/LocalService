const Notification = require('../models/Notification');

// @desc    Get user notifications with pagination
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { recipient: req.user._id },
        { user: req.user._id }
      ]
    };

    if (req.query.unreadOnly === 'true') {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('request', 'requestId title category status priority')
        .populate('actor', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        $or: [{ recipient: req.user._id }, { user: req.user._id }],
        isRead: false
      })
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { recipient: req.user._id },
        { user: req.user._id }
      ],
      isRead: false
    });

    res.status(200).json({
      success: true,
      count,
      unreadCount: count
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read (and PUT /api/notifications/:id/read)
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [
        { recipient: req.user._id },
        { user: req.user._id }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access unauthorized'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all (and PUT /api/notifications/read-all)
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        $or: [
          { recipient: req.user._id },
          { user: req.user._id }
        ],
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
