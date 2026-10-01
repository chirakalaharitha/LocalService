const mongoose = require('mongoose');
const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Municipality = require('../models/Municipality');
const ActivityLog = require('../models/ActivityLog');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const { createNotification } = require('../services/notificationService');
const {
  sendRequestInProgressEmail,
  sendRequestResolvedCitizenEmail,
  sendRequestResolvedAdminEmail
} = require('../services/emailService');
const { getSlaStatus } = require('../services/slaService');
const { isValidStaffTransition, normalizeStatus } = require('../utils/statusValidator');
const {
  emitRequestStatusChanged,
  emitRequestUpdated
} = require('../services/socketService');

/**
 * Helper to check if request is assigned to current staff user
 */
const isAssignedToUser = (request, userId, role) => {
  if (!request || !userId) return false;
  if (role === 'ADMIN') return true;
  const staffId = userId.toString();
  const staffA = request.assignedStaff?._id ? request.assignedStaff._id.toString() : request.assignedStaff?.toString();
  const staffB = request.assignedTo?._id ? request.assignedTo._id.toString() : request.assignedTo?.toString();
  return staffA === staffId || staffB === staffId;
};

// @desc    Get staff assigned requests & workload stats
// @route   GET /api/staff/requests
// @access  Private (STAFF, ADMIN)
const getAssignedRequests = async (req, res, next) => {
  try {
    const { status, priority, category, municipality, search, sortBy = 'recently_updated', tab } = req.query;

    // Strict staff isolation: Only requests actually assigned to current authenticated staff member
    const staffQuery = {
      $or: [
        { assignedStaff: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    // Category display metadata & colors
    const CATEGORY_META = {
      WATER: { name: 'Water Supply', color: '#38BDF8', icon: '💧' },
      STREET_LIGHT: { name: 'Streetlights', color: '#F59E0B', icon: '💡' },
      ROAD: { name: 'Roads & Potholes', color: '#64748B', icon: '🛣️' },
      GARBAGE: { name: 'Garbage & Sanitation', color: '#10B981', icon: '🗑️' },
      DRAINAGE: { name: 'Drainage', color: '#06B6D4', icon: '🌊' },
      PUBLIC_AREA: { name: 'Parks & Greenery', color: '#059669', icon: '🌳' },
      ELECTRICITY: { name: 'Electricity', color: '#EAB308', icon: '⚡' },
      OTHER: { name: 'Other Civic Issues', color: '#8B5CF6', icon: '🏛️' }
    };

    // 1. Fetch ALL requests assigned to this staff member (unfiltered by search/tab) for real aggregate stats
    const allAssigned = await Request.find(staffQuery)
      .populate('citizen', 'name email phone profileImage')
      .populate('department', 'name code')
      .populate('municipality', 'name code city district state')
      .lean();

    const now = new Date();
    const totalAssigned = allAssigned.length;

    // Compute status stats dynamically from this staff's assigned requests only
    const inProgress = allAssigned.filter(
      (r) => r.status === 'IN_PROGRESS' || r.status === 'ACCEPTED'
    ).length;

    const completed = allAssigned.filter(
      (r) => ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status)
    ).length;

    const overdue = allAssigned.filter(
      (r) => !['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(r.status) && r.slaDeadline && new Date(r.slaDeadline) < now
    ).length;

    const pending = allAssigned.filter(
      (r) => ['PENDING', 'ASSIGNED', 'UNDER_REVIEW'].includes(r.status)
    ).length;

    const highPriority = allAssigned.filter(
      (r) => r.priority === 'HIGH' || r.priority === 'CRITICAL'
    ).length;

    // 2. Request Status Overview (Donut chart data calculated strictly from assigned requests)
    const statusDistribution = [
      { name: 'Pending', count: pending, color: '#38BDF8' },
      { name: 'In Progress', count: inProgress, color: '#FB923C' },
      { name: 'Completed', count: completed, color: '#4ADE80' },
      { name: 'Overdue', count: overdue, color: '#F87171' }
    ];

    // 3. Requests by Category (Bar chart data: ONLY categories with count > 0 for this staff member)
    const categoryCounts = {};
    allAssigned.forEach((r) => {
      const catKey = (r.category || 'OTHER').toUpperCase();
      categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryCounts)
      .filter((catKey) => categoryCounts[catKey] > 0)
      .map((catKey) => ({
        key: catKey,
        name: CATEGORY_META[catKey]?.name || catKey,
        count: categoryCounts[catKey],
        color: CATEGORY_META[catKey]?.color || '#38BDF8',
        icon: CATEGORY_META[catKey]?.icon || '📋'
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Build filtered query for Table / List View
    const query = { ...staffQuery };

    // Status filter
    if (status && status !== 'ALL') {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'OVERDUE') {
        query.status = { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'] };
        query.slaDeadline = { $lt: now };
      } else if (upperStatus === 'IN_PROGRESS' || upperStatus === 'IN PROGRESS') {
        query.status = { $in: ['IN_PROGRESS', 'ACCEPTED'] };
      } else if (upperStatus === 'COMPLETED' || upperStatus === 'RESOLVED') {
        query.status = { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'] };
      } else if (upperStatus === 'PENDING') {
        query.status = { $in: ['PENDING', 'ASSIGNED', 'UNDER_REVIEW'] };
      } else {
        query.status = normalizeStatus(status);
      }
    }

    // Priority filter
    if (priority && priority !== 'ALL') {
      query.priority = priority.toUpperCase();
    }

    // Category filter
    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    // Municipality filter
    if (municipality && municipality !== 'ALL') {
      if (mongoose.Types.ObjectId.isValid(municipality)) {
        query.municipality = municipality;
      } else {
        const foundMun = await Municipality.findOne({
          $or: [
            { code: municipality.toUpperCase() },
            { name: { $regex: municipality, $options: 'i' } }
          ]
        });
        if (foundMun) query.municipality = foundMun._id;
      }
    }

    // Tab filter for My Work
    if (tab && tab !== 'ALL') {
      const upperTab = tab.toUpperCase();
      if (upperTab === 'PENDING') {
        query.status = { $in: ['PENDING', 'ASSIGNED', 'UNDER_REVIEW'] };
      } else if (upperTab === 'IN_PROGRESS') {
        query.status = { $in: ['IN_PROGRESS', 'ACCEPTED'] };
      } else if (upperTab === 'COMPLETED' || upperTab === 'RESOLVED') {
        query.status = { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'] };
      } else if (upperTab === 'OVERDUE') {
        query.status = { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'] };
        query.slaDeadline = { $lt: now };
      }
    }

    // Search query
    if (search && search.trim()) {
      query.$and = [
        {
          $or: [
            { title: { $regex: search.trim(), $options: 'i' } },
            { requestId: { $regex: search.trim(), $options: 'i' } },
            { address: { $regex: search.trim(), $options: 'i' } },
            { city: { $regex: search.trim(), $options: 'i' } }
          ]
        }
      ];
    }

    // Sort options
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    if (sortBy === 'priority') sortOptions = { priority: -1, createdAt: -1 };
    if (sortBy === 'recently_updated') sortOptions = { updatedAt: -1 };

    const requests = await Request.find(query)
      .populate('citizen', 'name email phone profileImage')
      .populate('department', 'name code')
      .populate('municipality', 'name code city district state')
      .sort(sortOptions)
      .lean();

    // Human-readable SLA & date formatting
    const requestsWithSla = requests.map((r) => {
      let humanSla = '-';
      let slaStatus = 'ON_TIME';

      if (['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'].includes(r.status)) {
        humanSla = '-';
        slaStatus = 'ON_TIME';
      } else if (r.slaDeadline) {
        const diffMs = new Date(r.slaDeadline).getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (diffMs <= 0) {
          humanSla = 'Overdue';
          slaStatus = 'OVERDUE';
        } else if (diffDays === 1) {
          humanSla = '1 day left';
          slaStatus = 'NEAR_BREACH';
        } else {
          humanSla = `${diffDays} days left`;
          slaStatus = diffDays <= 2 ? 'NEAR_BREACH' : 'ON_TIME';
        }
      }

      const assignedDate = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '-';

      return {
        ...r,
        slaStatus,
        humanSla,
        assignedDate
      };
    });

    // Recent activity stream (strictly for this staff user)
    let recentActivity = await ActivityLog.find({
      $or: [
        { user: req.user._id },
        { targetType: 'Request', 'metadata.staff': req.user.name }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    if (recentActivity && recentActivity.length > 0) {
      recentActivity = recentActivity.map((act) => {
        const diffMin = Math.round((Date.now() - new Date(act.createdAt).getTime()) / 60000);
        let timeAgo = `${diffMin}m ago`;
        if (diffMin >= 60 && diffMin < 1440) timeAgo = `${Math.round(diffMin / 60)}h ago`;
        else if (diffMin >= 1440) timeAgo = `${Math.round(diffMin / 1440)}d ago`;
        return {
          ...act,
          timeAgo
        };
      });
    } else {
      recentActivity = [];
    }

    res.status(200).json({
      success: true,
      stats: {
        totalAssigned,
        inProgress,
        completed,
        overdue,
        pending,
        pendingCount: pending,
        pendingAcceptance: pending,
        resolved: completed,
        highPriority,
        overdueCount: overdue,
        slaOverdueCombined: `${overdue} / ${overdue}`
      },
      statusDistribution,
      categoryDistribution,
      count: requestsWithSla.length,
      totalCount: totalAssigned,
      requests: requestsWithSla,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single staff request details with timeline & citizen evidence
// @route   GET /api/staff/requests/:id
// @access  Private (STAFF, ADMIN)
const getStaffRequestDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };

    const request = await Request.findOne(query)
      .populate('citizen', 'name email phone profileImage')
      .populate('assignedStaff', 'name email phone profileImage')
      .populate('assignedTo', 'name email phone profileImage')
      .populate('department', 'name code description')
      .populate('municipality', 'name code city district state');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Security check: staff isolation
    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this request as it is not assigned to you.'
      });
    }

    const history = await RequestHistory.find({ request: request._id })
      .populate('user', 'name role profileImage')
      .sort({ createdAt: 1 });

    const reqObj = request.toObject();
    reqObj.slaStatus = getSlaStatus(request.slaDeadline, request.status, request.priority);

    res.status(200).json({
      success: true,
      request: reqObj,
      history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update request status through validated lifecycle transitions
// @route   PATCH /api/staff/requests/:id/status
// @access  Private (STAFF, ADMIN)
const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'New status is required.'
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Security check: staff isolation
    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update requests assigned to you.'
      });
    }

    // Validate lifecycle transition
    const validation = isValidStaffTransition(request.status, status);
    if (!validation.valid) {
      return res.status(409).json({
        success: false,
        message: validation.message
      });
    }

    const previousStatus = request.status;
    const targetStatus = validation.normalizedTarget;

    request.status = targetStatus;
    await request.save();

    const actionName = `STATUS_${targetStatus}`;
    const entryNote = note && note.trim()
      ? note.trim()
      : `Status changed from ${previousStatus} to ${targetStatus} by staff ${req.user.name}`;

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: actionName,
      previousStatus,
      newStatus: targetStatus,
      notes: entryNote
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: targetStatus,
      previousStatus,
      changedBy: req.user,
      note: entryNote,
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    // Notify Citizen and Admin with Database-First Notifications & Emails
    const isResolution = targetStatus === 'RESOLVED' || targetStatus === 'PENDING_VERIFICATION';
    const isInProgress = targetStatus === 'IN_PROGRESS';

    if (isResolution && !request.resolutionEmailSent) {
      request.resolutionEmailSent = true;
      await request.save();

      if (request.citizen) {
        await createNotification({
          recipient: request.citizen,
          type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
          title: 'Your Service Request Has Been Completed',
          message: `Your request [${request.requestId}] has been completed by field staff.`,
          request,
          actor: req.user._id,
          customEmailFn: (citizenUser) => sendRequestResolvedCitizenEmail({
            to: citizenUser.email,
            citizenName: citizenUser.name,
            request,
            resolutionNotes: entryNote
          })
        });
      }

      // Notify responsible municipality Admin
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
        const citizenUser = request.citizen ? await User.findById(request.citizen).select('name') : null;
        await createNotification({
          recipient: munAdmin._id,
          type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
          title: 'Request Completed by Staff',
          message: `Request [${request.requestId}] completed by ${req.user.name} (${request.category}). Location: ${request.address}`,
          request,
          actor: req.user._id,
          customEmailFn: (adminUser) => sendRequestResolvedAdminEmail({
            to: adminUser.email,
            adminName: adminUser.name,
            request: {
              ...request.toObject(),
              citizen: citizenUser
            },
            staffName: req.user.name,
            resolutionNotes: entryNote,
            resolutionDate: new Date()
          })
        });
      }
    } else if (request.citizen) {
      const formattedStatus = targetStatus.replace(/_/g, ' ');
      await createNotification({
        recipient: request.citizen,
        type: isInProgress
          ? (NOTIFICATION_TYPES.REQUEST_IN_PROGRESS || 'REQUEST_IN_PROGRESS')
          : NOTIFICATION_TYPES.REQUEST_STATUS_CHANGED,
        title: isInProgress
          ? 'Work In Progress'
          : 'Request Status Updated',
        message: isInProgress
          ? `Your request [${request.requestId}] is now being worked on by field staff.`
          : `Your request [${request.requestId}] is now ${formattedStatus}.`,
        request,
        actor: req.user._id,
        customEmailFn: isInProgress
          ? (citizenUser) => sendRequestInProgressEmail({
              to: citizenUser.email,
              citizenName: citizenUser.name,
              request
            })
          : null
      });
    }

    res.status(200).json({
      success: true,
      message: `Request status updated to ${targetStatus.replace(/_/g, ' ')}.`,
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add staff work / inspection notes
// @route   POST /api/staff/requests/:id/notes
// @access  Private (STAFF, ADMIN)
const addWorkNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Work note content is required and cannot be empty.'
      });
    }

    if (note.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Work note exceeds maximum allowed length of 2000 characters.'
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add notes to your assigned requests.'
      });
    }

    const historyEntry = await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'WORK_NOTE_ADDED',
      previousStatus: request.status,
      newStatus: request.status,
      notes: note.trim()
    });

    const populatedEntry = await RequestHistory.findById(historyEntry._id).populate(
      'user',
      'name role profileImage'
    );

    // Emit real-time update strictly AFTER database entry creation
    emitRequestUpdated({
      requestId: request.requestId,
      requestMongoId: request._id,
      changes: { workNote: note.trim() },
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    res.status(201).json({
      success: true,
      message: 'Work note added successfully.',
      entry: populatedEntry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit resolution with proof image and resolution notes
// @route   PATCH /api/staff/requests/:id/resolve (and POST /api/staff/requests/:id/resolve)
// @access  Private (STAFF, ADMIN)
const submitResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, resolutionNotes, resolutionNote } = req.body || {};
    const notesContent = (notes || resolutionNotes || resolutionNote || '').trim();

    if (!notesContent || notesContent.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Meaningful resolution notes (minimum 5 characters) are required.'
      });
    }

    if (notesContent.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes exceed maximum allowed length of 2000 characters.'
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only resolve requests assigned to you.'
      });
    }

    // Verify current status allows resolution
    const current = normalizeStatus(request.status);
    if (current !== 'IN_PROGRESS' && current !== 'ACCEPTED') {
      return res.status(409).json({
        success: false,
        message: `Cannot resolve request in ${current.replace(/_/g, ' ')} status. Must be In Progress.`
      });
    }

    // Extract proof images from uploaded files
    let proofImages = [];
    if (req.file) {
      proofImages.push(`/uploads/${req.file.filename}`);
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        proofImages = req.files.map((f) => `/uploads/${f.filename}`);
      } else if (req.files.afterImage) {
        proofImages = req.files.afterImage.map((f) => `/uploads/${f.filename}`);
      }
    }

    const primaryImage = proofImages[0] || request.afterImage || '';

    const previousStatus = request.status;
    request.status = 'PENDING_VERIFICATION';
    request.afterImage = primaryImage;
    request.resolutionNotes = notesContent;
    request.resolvedAt = new Date();
    request.resolutionProof = {
      images: proofImages.length > 0 ? proofImages : (request.afterImage ? [request.afterImage] : []),
      notes: notesContent,
      resolvedAt: new Date()
    };

    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'RESOLUTION_SUBMITTED',
      previousStatus,
      newStatus: 'PENDING_VERIFICATION',
      notes: notesContent,
      images: proofImages
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'PENDING_VERIFICATION',
      previousStatus,
      changedBy: req.user,
      note: notesContent,
      resolutionProof: request.resolutionProof,
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    // Notify Citizen and Admin of Resolution via Database-First Notifications & Real Emails
    if (!request.resolutionEmailSent) {
      request.resolutionEmailSent = true;
      await request.save();

      if (request.citizen) {
        await createNotification({
          recipient: request.citizen,
          type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
          title: 'Your Service Request Has Been Completed',
          message: `Your request [${request.requestId}] has been completed by field staff. Please review resolution and verify.`,
          request,
          actor: req.user._id,
          customEmailFn: (citizenUser) => sendRequestResolvedCitizenEmail({
            to: citizenUser.email,
            citizenName: citizenUser.name,
            request,
            resolutionNotes: notesContent,
            resolutionProof: request.resolutionProof
          })
        });
      }

      // Find and notify responsible municipality Admin (in-app + real email)
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
        const citizenUser = request.citizen ? await User.findById(request.citizen).select('name') : null;
        await createNotification({
          recipient: munAdmin._id,
          type: NOTIFICATION_TYPES.REQUEST_RESOLVED,
          title: 'Request Completed by Staff',
          message: `Request [${request.requestId}] completed by ${req.user.name} (${request.category}). Location: ${request.address}`,
          request,
          actor: req.user._id,
          customEmailFn: (adminUser) => sendRequestResolvedAdminEmail({
            to: adminUser.email,
            adminName: adminUser.name,
            request: {
              ...request.toObject(),
              citizen: citizenUser
            },
            staffName: req.user.name,
            resolutionNotes: notesContent,
            resolutionDate: request.resolvedAt || new Date()
          })
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Resolution submitted successfully. Marked as Pending Verification.',
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept assigned request
// @route   POST /api/staff/requests/:id/accept
// @access  Private (STAFF, ADMIN)
const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this request' });
    }

    const validation = isValidStaffTransition(request.status, 'ACCEPTED');
    if (!validation.valid) {
      return res.status(409).json({
        success: false,
        message: validation.message
      });
    }

    const previousStatus = request.status;
    request.status = 'ACCEPTED';
    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'ACCEPTED',
      previousStatus,
      newStatus: 'ACCEPTED',
      notes: `Staff ${req.user.name} accepted the task assignment.`
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'ACCEPTED',
      previousStatus,
      changedBy: req.user,
      note: `Staff ${req.user.name} accepted the task assignment.`,
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    // Notify Citizen that staff has accepted assignment
    if (request.citizen) {
      await createNotification({
        recipient: request.citizen,
        type: NOTIFICATION_TYPES.REQUEST_STATUS_CHANGED,
        title: 'Request Status Updated',
        message: `Your request [${request.requestId}] is now Accepted by staff.`,
        request,
        actor: req.user._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request accepted successfully',
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject assigned request with reason
// @route   POST /api/staff/requests/:id/reject
// @access  Private (STAFF, ADMIN)
const rejectRequest = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this request' });
    }

    if (['RESOLVED', 'CITIZEN_VERIFIED', 'REJECTED'].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot reject request in ${request.status} status.`
      });
    }

    const previousStatus = request.status;
    request.status = 'PENDING';
    request.assignedStaff = null;
    request.assignedTo = null;
    request.rejectionReason = reason || 'Staff unable to take assignment.';
    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'REJECTED_BY_STAFF',
      previousStatus,
      newStatus: 'PENDING',
      notes: `Staff rejected assignment. Reason: ${request.rejectionReason}`
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'PENDING',
      previousStatus,
      changedBy: req.user,
      note: `Staff rejected assignment. Reason: ${request.rejectionReason}`,
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    res.status(200).json({
      success: true,
      message: 'Assignment rejected. Admin notified to reassign.',
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start work on request & optional before-work proof image
// @route   POST /api/staff/requests/:id/start
// @access  Private (STAFF, ADMIN)
const startWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!isAssignedToUser(request, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const validation = isValidStaffTransition(request.status, 'IN_PROGRESS');
    if (!validation.valid) {
      return res.status(409).json({
        success: false,
        message: validation.message
      });
    }

    let beforeImage = request.beforeImage || '';
    if (req.file) {
      beforeImage = `/uploads/${req.file.filename}`;
    }

    const previousStatus = request.status;
    request.status = 'IN_PROGRESS';
    if (beforeImage) {
      request.beforeImage = beforeImage;
    }
    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'WORK_STARTED',
      previousStatus,
      newStatus: 'IN_PROGRESS',
      notes: 'On-site work initiated by staff.',
      images: beforeImage ? [beforeImage] : []
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'IN_PROGRESS',
      previousStatus,
      changedBy: req.user,
      note: 'On-site work initiated by staff.',
      citizenId: request.citizen,
      staffId: req.user._id,
      request
    });

    res.status(200).json({
      success: true,
      message: 'Work started successfully',
      request
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedRequests,
  getStaffRequestDetails,
  updateRequestStatus,
  addWorkNote,
  acceptRequest,
  rejectRequest,
  startWork,
  submitResolution
};
