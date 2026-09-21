const Request = require('../models/Request');
const RequestHistory = require('../models/RequestHistory');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const Department = require('../models/Department');
const Municipality = require('../models/Municipality');
const User = require('../models/User');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const { createNotification } = require('../services/notificationService');
const {
  sendNewRequestAdminEmail,
  sendRequestVerifiedEmail
} = require('../services/emailService');
const { calculateSmartPriority } = require('../services/priorityService');
const { calculateSlaDeadline, getSlaStatus } = require('../services/slaService');
const {
  emitToRole,
  emitToUser,
  emitToRequestRoom,
  emitRequestCreated,
  emitRequestStatusChanged,
  emitRequestUpdated
} = require('../services/socketService');

// Utility to generate unique Request ID e.g. LF-2026-001001
const generateRequestId = async () => {
  const count = await Request.countDocuments();
  const nextNumber = 1000 + count + 1;
  const year = new Date().getFullYear();
  return `LF-${year}-${nextNumber}`;
};

// @desc    Create new service request
// @route   POST /api/requests
// @access  Private (CITIZEN, ADMIN)
const createRequest = async (req, res, next) => {
  try {
    const { title, description, category, priority: citizenPriority, address, latitude, longitude, city, state, pincode } = req.body;

    // Backend Input Validation
    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be at least 5 characters long.'
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description is required and must be at least 10 characters long.'
      });
    }

    const validCategories = ['WATER', 'ELECTRICITY', 'ROAD', 'STREET_LIGHT', 'GARBAGE', 'DRAINAGE', 'PUBLIC_AREA', 'OTHER'];
    const normalizedCategory = (category || '').toUpperCase();
    if (!normalizedCategory || !validCategories.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed values: ${validCategories.join(', ')}`
      });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const normalizedPriority = (citizenPriority || 'MEDIUM').toUpperCase();
    if (!validPriorities.includes(normalizedPriority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${validPriorities.join(', ')}`
      });
    }

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Address location is required.'
      });
    }

    // Latitude / Longitude strict validation - do NOT use fake default coordinates
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null || latitude === '') {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (latitude and longitude) are required.'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude/longitude coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.'
      });
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Calculate smart suggested priority
    const suggestedPriority = calculateSmartPriority({
      category: normalizedCategory,
      description,
      citizenUrgency: normalizedPriority
    });

    const finalPriority = normalizedPriority || suggestedPriority;
    const slaDeadline = calculateSlaDeadline(finalPriority);
    const requestId = await generateRequestId();

    // Map category to department
    const deptObj = await Department.findOne({ code: normalizedCategory });

    // Determine Municipality Jurisdiction dynamically
    let reqMunicipality = null;
    if (req.body.municipality || req.body.municipalityId) {
      reqMunicipality = req.body.municipality || req.body.municipalityId;
    } else if (city) {
      const matchedMun = await Municipality.findOne({
        $or: [
          { city: { $regex: new RegExp(`^${city.trim()}$`, 'i') } },
          { name: { $regex: new RegExp(city.trim(), 'i') } },
          { pincodes: pincode ? pincode.trim() : null }
        ],
        isActive: true
      });
      if (matchedMun) reqMunicipality = matchedMun._id;
    }
    if (!reqMunicipality && req.user.municipality) {
      reqMunicipality = req.user.municipality;
    }
    if (!reqMunicipality) {
      const defaultMun = await Municipality.findOne({ isActive: true });
      if (defaultMun) reqMunicipality = defaultMun._id;
    }

    // Store request in MongoDB - Citizen derived strictly from JWT req.user._id
    const newRequest = await Request.create({
      requestId,
      title: title.trim(),
      description: description.trim(),
      category: normalizedCategory,
      priority: finalPriority,
      suggestedPriority,
      status: 'PENDING',
      citizen: req.user._id,
      department: deptObj ? deptObj._id : null,
      municipality: reqMunicipality,
      ward: req.body.ward ? req.body.ward.trim() : '',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      address: address.trim(),
      city: city || req.user.city || '',
      state: state || req.user.state || '',
      pincode: pincode || req.user.pincode || '',
      images,
      slaDeadline
    });

    // Create history entry
    await RequestHistory.create({
      request: newRequest._id,
      user: req.user._id,
      action: 'CREATED',
      newStatus: 'PENDING',
      notes: `Request created with priority ${finalPriority}`
    });

    // Emit real-time request created event strictly AFTER database save
    emitRequestCreated({
      request: newRequest,
      citizenId: req.user._id
    });

    // Notify Citizen with official Phase 10 Database-first notification
    await createNotification({
      recipient: req.user._id,
      type: NOTIFICATION_TYPES.REQUEST_CREATED,
      title: 'Service Request Submitted',
      message: `Your request [${requestId}] has been submitted successfully.`,
      request: newRequest,
      actor: req.user._id
    });

    // Find the responsible municipality Admin dynamically (do NOT send to every Admin)
    let munAdmin = null;
    if (newRequest.municipality) {
      munAdmin = await User.findOne({
        role: 'ADMIN',
        municipality: newRequest.municipality,
        isActive: true
      });
    }
    if (!munAdmin) {
      munAdmin = await User.findOne({ role: 'ADMIN', isActive: true });
    }

    if (munAdmin) {
      // In-app notification + real email to responsible municipality Admin
      await createNotification({
        recipient: munAdmin._id,
        type: NOTIFICATION_TYPES.ADMIN_NEW_REQUEST || 'ADMIN_NEW_REQUEST',
        title: 'New Service Request Received',
        message: `New request [${requestId}] - ${title} (${normalizedCategory}) in ${newRequest.address}.`,
        request: newRequest,
        actor: req.user._id,
        customEmailFn: (adminUser) => sendNewRequestAdminEmail({
          to: adminUser.email,
          adminName: adminUser.name,
          request: newRequest,
          citizen: req.user
        })
      });
    }

    // Notify Admins via live Socket.IO
    const adminNotification = {
      type: 'NEW_REQUEST',
      title: 'New Service Request Submitted',
      message: `[${requestId}] ${title} (${normalizedCategory}) - ${finalPriority} Priority`,
      request: newRequest._id
    };

    if (munAdmin) {
      emitToUser(munAdmin._id, 'newRequest', {
        request: newRequest,
        notification: adminNotification
      });
    }
    emitToRole('ADMIN', 'newRequest', {
      request: newRequest,
      notification: adminNotification
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'REQUEST_CREATED',
      targetType: 'Request',
      targetId: newRequest.requestId,
      metadata: { category: normalizedCategory, priority: finalPriority }
    });

    const populatedReq = await Request.findById(newRequest._id)
      .populate('citizen', 'name email phone')
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      request: populatedReq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in citizen's own requests
// @route   GET /api/requests/my
// @access  Private (CITIZEN)
const getMyRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({ citizen: req.user._id })
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email phone')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    const requestsWithSla = requests.map(r => {
      const obj = r.toObject();
      obj.slaStatus = getSlaStatus(r.slaDeadline, r.status, r.priority);
      return obj;
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests: requestsWithSla
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check nearby requests for duplicate prevention (POST /api/requests/check-duplicate)
// @route   POST /api/requests/check-duplicate
// @access  Private
const checkDuplicate = async (req, res, next) => {
  try {
    const { category, latitude, longitude } = req.body || req.query;

    if (!category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category, latitude, and longitude are required for duplicate check.'
      });
    }

    const normalizedCategory = category.toUpperCase();
    const nearby = await checkDuplicateRequests({
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      category: normalizedCategory,
      radiusMeters: 500
    });

    const matches = nearby.map(r => ({
      requestId: r.requestId,
      title: r.title,
      category: r.category,
      status: r.status,
      address: r.address,
      createdAt: r.createdAt
    }));

    res.status(200).json({
      success: true,
      possibleDuplicate: matches.length > 0,
      matches,
      nearby: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all requests with search, filtering, pagination
// @route   GET /api/requests
// @access  Private (CITIZEN gets own/public, ADMIN gets all)
const getRequests = async (req, res, next) => {
  try {
    const {
      category,
      status,
      priority,
      department,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      page = 1,
      limit = 10,
      scope = 'user'
    } = req.query;

    const query = {};

    // Role-based visibility and municipal jurisdiction enforcement
    if (req.user.role === 'CITIZEN' && scope !== 'public') {
      query.citizen = req.user._id;
    } else if (req.user.role === 'STAFF') {
      query.assignedStaff = req.user._id;
    } else if (req.user.role === 'ADMIN' && req.user.municipality) {
      query.municipality = req.user.municipality;
    }

    if (category) query.category = category.toUpperCase();
    if (status) query.status = status;
    if (priority) query.priority = priority.toUpperCase();
    if (department) query.department = department;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await Request.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email phone')
      .populate('department', 'name code')
      .populate('municipality', 'name code city state country')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    const requestsWithSla = requests.map(r => {
      const rObj = r.toObject();
      rObj.slaStatus = getSlaStatus(r.slaDeadline, r.status, r.priority);
      return rObj;
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      requests: requestsWithSla
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public active issue board
// @route   GET /api/requests/public
// @access  Public
const getPublicIssues = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;

    const query = {
      status: { $nin: ['REJECTED'] }
    };

    if (category) query.category = category.toUpperCase();
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await Request.find(query)
      .select('-citizen -assignedStaff -resolutionNotes -rejectionReason')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check nearby requests for duplicate prevention
// @route   GET /api/requests/nearby
// @access  Private
const getNearbyRequests = async (req, res, next) => {
  try {
    const { longitude, latitude, category } = req.query;

    if (!longitude || !latitude || !category) {
      return res.status(400).json({
        success: false,
        message: 'Longitude, latitude, and category are required'
      });
    }

    const nearby = await checkDuplicateRequests({
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      category: category.toUpperCase()
    });

    res.status(200).json({
      success: true,
      hasDuplicates: nearby.length > 0,
      possibleDuplicate: nearby.length > 0,
      nearby,
      matches: nearby
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get request by ID with timeline history & comments
// @route   GET /api/requests/:id
// @access  Private
const getRequestById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };

    const request = await Request.findOne(query)
      .populate('citizen', 'name email phone profileImage')
      .populate('assignedStaff', 'name email phone profileImage')
      .populate('department', 'name code description')
      .populate('municipality', 'name code city state country wards');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Admin Municipality Jurisdiction Check
    if (req.user.role === 'ADMIN' && req.user.municipality && request.municipality) {
      const reqMunId = request.municipality._id ? request.municipality._id.toString() : request.municipality.toString();
      if (reqMunId !== req.user.municipality.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to view requests outside your municipal jurisdiction.'
        });
      }
    }

    // Citizen Role Ownership Check
    if (req.user.role === 'CITIZEN' && request.citizen && request.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own service requests.'
      });
    }

    // Staff Role Assignment Check
    if (req.user.role === 'STAFF') {
      const assignedId = request.assignedStaff?._id?.toString() || request.assignedStaff?.toString() || request.assignedTo?.toString();
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view requests assigned to other staff members.'
        });
      }
    }

    // Get History timeline
    const history = await RequestHistory.find({ request: request._id })
      .populate('user', 'name role profileImage')
      .sort({ createdAt: 1 });

    // Get Comments
    const comments = await Comment.find({ request: request._id })
      .populate('user', 'name role profileImage')
      .sort({ createdAt: 1 });

    const reqObj = request.toObject();
    reqObj.slaStatus = getSlaStatus(request.slaDeadline, request.status, request.priority);

    res.status(200).json({
      success: true,
      request: reqObj,
      history,
      comments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote / Support community request ("I'm also affected")
// @route   POST /api/requests/:id/upvote
// @access  Private
const toggleUpvote = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const userId = req.user._id;
    const isUpvoted = request.upvotes.includes(userId);

    if (isUpvoted) {
      request.upvotes = request.upvotes.filter(id => id.toString() !== userId.toString());
      request.upvoteCount = Math.max(0, request.upvoteCount - 1);
    } else {
      request.upvotes.push(userId);
      request.upvoteCount += 1;
    }

    const newSuggestedPriority = calculateSmartPriority({
      category: request.category,
      description: request.description,
      upvoteCount: request.upvoteCount
    });

    if (newSuggestedPriority !== request.suggestedPriority) {
      request.suggestedPriority = newSuggestedPriority;
    }

    await request.save();

    emitToRequestRoom(request._id, 'requestUpvoted', {
      requestId: request._id,
      upvoteCount: request.upvoteCount
    });

    res.status(200).json({
      success: true,
      isUpvoted: !isUpvoted,
      upvoteCount: request.upvoteCount,
      suggestedPriority: request.suggestedPriority
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen verify resolution
// @route   POST /api/requests/:id/verify (and PATCH /api/requests/:id/verify)
// @access  Private (CITIZEN)
const verifyResolution = async (req, res, next) => {
  try {
    const { rating, comment } = req.body || {};
    const { id } = req.params;
    const mongoose = require('mongoose');

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Strict ownership verification: only reporting citizen or admin
    if (request.citizen.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the reporting citizen can verify this request' });
    }

    if (request.status === 'CITIZEN_VERIFIED' || request.status === 'CLOSED') {
      return res.status(400).json({ success: false, message: 'Request has already been verified and closed' });
    }

    if (!['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Request cannot be verified in ${request.status.replace(/_/g, ' ')} status. Must be Resolved / Pending Verification.`
      });
    }

    const previousStatus = request.status;
    const now = new Date();

    request.status = 'CLOSED';
    request.verifiedAt = now;
    request.citizenVerification = {
      verified: true,
      verifiedAt: now,
      verifiedBy: req.user._id,
      rating: rating ? parseInt(rating, 10) : undefined,
      comment: comment ? String(comment).trim() : ''
    };

    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'VERIFIED',
      previousStatus,
      newStatus: 'CLOSED',
      notes: `Resolution verified by citizen. Request closed.${rating ? ` Rating: ${rating}/5.` : ''}`
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'CLOSED',
      previousStatus,
      changedBy: req.user,
      note: `Resolution verified by citizen. Request closed.${rating ? ` Rating: ${rating}/5.` : ''}`,
      citizenId: request.citizen,
      staffId: request.assignedStaff,
      request
    });

    // Notify assigned staff (in-app + real email)
    if (request.assignedStaff) {
      await createNotification({
        recipient: request.assignedStaff,
        type: NOTIFICATION_TYPES.REQUEST_VERIFIED,
        title: 'Work Verified by Citizen',
        message: `Citizen verified resolution for [${request.requestId}]. Request is now closed.${rating ? ` Rating: ${rating}/5.` : ''}`,
        request: request,
        actor: req.user._id,
        customEmailFn: (staffUser) => sendRequestVerifiedEmail({
          to: staffUser.email,
          recipientName: staffUser.name,
          request,
          role: 'STAFF',
          rating,
          comment
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
      await createNotification({
        recipient: munAdmin._id,
        type: NOTIFICATION_TYPES.REQUEST_VERIFIED,
        title: 'Request Verified & Closed by Citizen',
        message: `Request [${request.requestId}] has been verified and closed by citizen.${rating ? ` Rating: ${rating}/5.` : ''}`,
        request: request,
        actor: req.user._id,
        customEmailFn: (adminUser) => sendRequestVerifiedEmail({
          to: adminUser.email,
          recipientName: adminUser.name,
          request,
          role: 'ADMIN',
          rating,
          comment
        })
      });
    }

    // Notify admin role via Socket.IO
    emitToRole('ADMIN', 'request:verified', {
      requestId: request._id,
      requestFormattedId: request.requestId,
      rating,
      verifiedAt: now
    });
    emitToRole('ADMIN', 'requestVerified', { requestId: request._id, rating });

    res.status(200).json({
      success: true,
      message: 'Resolution verified successfully! Thank you for your feedback.',
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen reopen request if issue persists
// @route   POST /api/requests/:id/reopen (and PATCH /api/requests/:id/reopen, POST /api/requests/:id/report-issue)
// @access  Private (CITIZEN)
const reopenRequest = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const { id } = req.params;
    const mongoose = require('mongoose');

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A clear reason is required to report an issue or reopen a request.'
      });
    }

    if (reason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Reopen reason cannot exceed 1000 characters.'
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { requestId: id }] } : { requestId: id };
    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.citizen.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the reporting citizen can reopen this request' });
    }

    if (!['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Request cannot be reopened in ${request.status.replace(/_/g, ' ')} status. Must be in Pending Verification / Resolved.`
      });
    }

    const previousStatus = request.status;
    const now = new Date();
    const cleanReason = reason.trim();

    request.status = 'IN_PROGRESS';
    request.verificationIssue = {
      reported: true,
      reason: cleanReason,
      reportedAt: now,
      reportedBy: req.user._id
    };

    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'REOPENED',
      previousStatus,
      newStatus: 'IN_PROGRESS',
      notes: `Reopened by Citizen. Reason: ${cleanReason}`
    });

    // Emit real-time status change strictly AFTER database save and history creation
    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'IN_PROGRESS',
      previousStatus,
      changedBy: req.user,
      note: `Reopened by Citizen. Reason: ${cleanReason}`,
      citizenId: request.citizen,
      staffId: request.assignedStaff,
      request
    });

    if (request.assignedStaff) {
      await createNotification({
        recipient: request.assignedStaff,
        type: NOTIFICATION_TYPES.REQUEST_REOPENED,
        title: 'Request Reopened by Citizen',
        message: `Citizen reported an issue with the resolution of [${request.requestId}]. Reason: ${cleanReason}`,
        request: request,
        actor: req.user._id
      });
    }

    emitToRole('ADMIN', 'request:reopened', {
      requestId: request._id,
      requestFormattedId: request.requestId,
      reason: cleanReason,
      reportedAt: now
    });
    emitToRole('ADMIN', 'requestReopened', { requestId: request._id, reason: cleanReason });

    res.status(200).json({
      success: true,
      message: 'Request reopened and staff notified for re-inspection.',
      request
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  checkDuplicate,
  getRequests,
  getPublicIssues,
  getNearbyRequests,
  getRequestById,
  toggleUpvote,
  verifyResolution,
  reopenRequest
};
