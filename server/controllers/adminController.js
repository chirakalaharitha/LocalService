const mongoose = require('mongoose');
const Request = require('../models/Request');
const User = require('../models/User');
const Department = require('../models/Department');
const Municipality = require('../models/Municipality');
const RequestHistory = require('../models/RequestHistory');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Feedback = require('../models/Feedback');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const { createNotification } = require('../services/notificationService');
const { sendStaffAssignmentEmail } = require('../services/emailService');
const { calculateSlaDeadline, getSlaStatus } = require('../services/slaService');
const {
  emitToUser,
  emitToRole,
  emitRequestAssigned,
  emitRequestStatusChanged,
  emitRequestUpdated
} = require('../services/socketService');

// @desc    Get Admin Dashboard Stats Overview
// @route   GET /api/admin/dashboard
// @access  Private (ADMIN)
const getDashboardStats = async (req, res, next) => {
  try {
    const adminMun = req.user.municipality;
    const reqScope = adminMun ? { municipality: adminMun } : {};
    const staffScope = adminMun ? { role: 'STAFF', municipality: adminMun } : { role: 'STAFF' };
    const citizenScope = adminMun ? { role: 'CITIZEN', municipality: adminMun } : { role: 'CITIZEN' };
    const userScope = adminMun ? { municipality: adminMun } : {};

    const totalUsers = await User.countDocuments(userScope);
    const totalCitizens = await User.countDocuments(citizenScope);
    const totalStaff = await User.countDocuments(staffScope);
    const activeStaff = await User.countDocuments({ ...staffScope, isActive: true });

    const totalRequests = await Request.countDocuments(reqScope);
    const pendingRequests = await Request.countDocuments({ ...reqScope, status: 'PENDING' });
    const assignedRequests = await Request.countDocuments({ ...reqScope, status: 'ASSIGNED' });
    const inProgressRequests = await Request.countDocuments({ ...reqScope, status: { $in: ['ACCEPTED', 'IN_PROGRESS'] } });
    const resolvedRequests = await Request.countDocuments({ ...reqScope, status: 'RESOLVED' });
    const pendingVerificationRequests = await Request.countDocuments({ ...reqScope, status: { $in: ['RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION'] } });
    const closedRequests = await Request.countDocuments({ ...reqScope, status: { $in: ['CITIZEN_VERIFIED', 'CLOSED'] } });
    const reopenedRequests = await Request.countDocuments({
      ...reqScope,
      $or: [{ status: 'REOPENED' }, { 'verificationIssue.reported': true }]
    });
    const criticalRequests = await Request.countDocuments({
      ...reqScope,
      priority: 'CRITICAL',
      status: { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'] }
    });

    // Compute SLA Overdue & Pending SLA within jurisdiction
    const activeRequests = await Request.find({
      ...reqScope,
      status: { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'] }
    });
    const overdueCount = activeRequests.filter(r => getSlaStatus(r.slaDeadline, r.status, r.priority) === 'OVERDUE').length;
    const pendingSlaRequests = activeRequests.filter(r => getSlaStatus(r.slaDeadline, r.status, r.priority) === 'ON_TIME').length;

    // Real average feedback rating for requests within municipality
    const scopedReqs = await Request.find(reqScope).select('_id');
    const scopedReqIds = scopedReqs.map(r => r._id);
    const feedbacks = await Feedback.find({ request: { $in: scopedReqIds } }).select('rating');
    const totalFeedbacks = feedbacks.length;
    const avgRating = totalFeedbacks > 0
      ? parseFloat((feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedbacks).toFixed(2))
      : 0;

    // Category distribution within jurisdiction
    const categoryStats = await Request.aggregate([
      { $match: reqScope },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Priority breakdown within jurisdiction
    const priorityStats = await Request.aggregate([
      { $match: reqScope },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCitizens,
        totalStaff,
        activeStaff,
        totalRequests,
        pendingRequests,
        assignedRequests,
        inProgressRequests,
        resolvedRequests,
        pendingVerificationRequests,
        closedRequests,
        reopenedRequests,
        criticalRequests,
        overdueCount,
        pendingSlaRequests,
        avgRating,
        totalFeedbacks
      },
      categoryStats,
      priorityStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Users list (Citizens & Staff)
// @route   GET /api/admin/users
// @access  Private (ADMIN)
const getUsers = async (req, res, next) => {
  try {
    const { role, search, status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (req.user.municipality) {
      query.municipality = req.user.municipality;
    }
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'suspended') query.isActive = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .populate('department', 'name code')
      .populate('municipality', 'name code city state country wards')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin register new Staff member
// @route   POST /api/admin/users/staff
// @access  Private (ADMIN)
const createStaffUser = async (req, res, next) => {
  try {
    const { name, fullName, email, phone, password, confirmPassword, department, city, state, pincode } = req.body;
    const staffName = (fullName || name || '').trim();

    if (!staffName || !email || !phone || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, password, and department are required for Staff'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const deptObj = await Department.findById(department);
    if (!deptObj) {
      return res.status(400).json({ success: false, message: 'Invalid department selected' });
    }

    const targetMunicipality = req.user.municipality || req.body.municipality || req.body.municipalityId || null;

    const staffUser = await User.create({
      name: staffName,
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: 'STAFF',
      department: deptObj._id,
      municipality: targetMunicipality,
      ward: (req.body.ward || '').trim(),
      serviceArea: (req.body.serviceArea || '').trim(),
      isActive: true,
      isVerified: true,
      city: city ? city.trim() : (req.user.city || ''),
      state: state ? state.trim() : (req.user.state || ''),
      pincode: pincode ? pincode.trim() : ''
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'STAFF_CREATED',
      targetType: 'User',
      targetId: staffUser._id.toString(),
      metadata: { name: staffUser.name, department: deptObj.name }
    });

    const safeUser = {
      _id: staffUser._id,
      id: staffUser._id,
      name: staffUser.name,
      fullName: staffUser.name,
      email: staffUser.email,
      phone: staffUser.phone,
      role: staffUser.role,
      department: {
        _id: deptObj._id,
        name: deptObj.name,
        code: deptObj.code
      },
      municipality: targetMunicipality,
      ward: staffUser.ward,
      serviceArea: staffUser.serviceArea,
      isActive: staffUser.isActive,
      city: staffUser.city,
      state: staffUser.state,
      pincode: staffUser.pincode,
      createdAt: staffUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status (Activate / Suspend)
// @route   PUT /api/admin/users/:id/status
// @access  Private (ADMIN)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate Admin accounts' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      targetType: 'User',
      targetId: user._id.toString()
    });

    res.status(200).json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'suspended'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or reassign staff & department to request
// @route   POST /api/admin/requests/:id/assign
// @access  Private (ADMIN)
const assignStaff = async (req, res, next) => {
  try {
    const { staffId, departmentId, priority } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const staffUser = await User.findById(staffId);
    if (!staffUser || staffUser.role !== 'STAFF') {
      return res.status(400).json({ success: false, message: 'Invalid staff member selected' });
    }

    if (!staffUser.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign requests to inactive or suspended staff' });
    }

    // Cross-Municipality Jurisdiction Enforcement
    if (req.user.municipality && request.municipality) {
      if (request.municipality.toString() !== req.user.municipality.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot assign requests outside your municipal jurisdiction.'
        });
      }
    }

    if (request.municipality && staffUser.municipality) {
      if (request.municipality.toString() !== staffUser.municipality.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment: Staff member does not belong to the request municipal jurisdiction.'
        });
      }
    }

    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({ success: false, message: 'Invalid department selected' });
      }
      request.department = dept._id;
    }

    const previousStatus = request.status;
    request.assignedStaff = staffUser._id;
    request.assignedTo = staffUser._id;
    if (departmentId) request.department = departmentId;
    if (priority) {
      request.priority = priority;
      request.slaDeadline = calculateSlaDeadline(priority);
    }
    request.status = 'ASSIGNED';
    await request.save();

    // Log history
    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'ASSIGNED',
      previousStatus,
      newStatus: 'ASSIGNED',
      notes: `Assigned to staff ${staffUser.name} (${staffUser.email}).`
    });

    // Notify Staff via Phase 10 Notification Service (DB + Socket.IO + Email)
    await createNotification({
      recipient: staffUser._id,
      type: NOTIFICATION_TYPES.REQUEST_ASSIGNED,
      title: 'New Service Request Assigned',
      message: `Request [${request.requestId}] has been assigned to you. Location: ${request.address}`,
      request,
      actor: req.user._id,
      customEmailFn: (staff) => sendStaffAssignmentEmail({
        to: staff.email,
        staffName: staff.name,
        request,
        assignedAt: new Date()
      })
    });

    // Notify Citizen
    if (request.citizen) {
      await createNotification({
        recipient: request.citizen,
        type: NOTIFICATION_TYPES.REQUEST_STATUS_CHANGED,
        title: 'Request Assigned to Field Staff',
        message: `Your request [${request.requestId}] has been assigned to staff member ${staffUser.name}.`,
        request,
        actor: req.user._id
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'REQUEST_ASSIGNED',
      targetType: 'Request',
      targetId: request.requestId,
      metadata: { staff: staffUser.name, priority: request.priority }
    });

    const updated = await Request.findById(request._id)
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email phone')
      .populate('department', 'name code');

    // Emit real-time assignment & status events strictly AFTER database operations
    emitRequestAssigned({
      requestId: request.requestId,
      requestMongoId: request._id,
      assignedTo: staffUser,
      assignedAt: new Date().toISOString(),
      request: updated,
      citizenId: request.citizen,
      staffId: staffUser._id
    });

    emitRequestStatusChanged({
      requestId: request.requestId,
      requestMongoId: request._id,
      status: 'ASSIGNED',
      previousStatus,
      changedBy: req.user,
      note: `Assigned to staff ${staffUser.name} (${staffUser.email}).`,
      citizenId: request.citizen,
      staffId: staffUser._id,
      request: updated
    });

    res.status(200).json({
      success: true,
      message: `Request assigned to ${staffUser.name} successfully`,
      request: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change request priority manually
// @route   PUT /api/admin/requests/:id/priority
// @access  Private (ADMIN)
const updatePriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }

    const previousPriority = request.priority;
    request.priority = priority;
    request.slaDeadline = calculateSlaDeadline(priority);
    await request.save();

    await RequestHistory.create({
      request: request._id,
      user: req.user._id,
      action: 'PRIORITY_CHANGED',
      notes: `Priority manually changed from ${previousPriority} to ${priority} by Admin.`
    });

    // Emit real-time update strictly AFTER database save
    emitRequestUpdated({
      requestId: request.requestId,
      requestMongoId: request._id,
      changes: { priority, slaDeadline: request.slaDeadline },
      citizenId: request.citizen,
      staffId: request.assignedStaff,
      request
    });

    res.status(200).json({
      success: true,
      message: `Priority updated to ${priority}`,
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Comprehensive Recharts Analytics Data with Filter Support
// @route   GET /api/admin/analytics
// @access  Private (ADMIN)
const getAnalyticsData = async (req, res, next) => {
  try {
    const { startDate, endDate, category, department, status, priority } = req.query;

    const matchFilter = {};
    if (category) matchFilter.category = category.toUpperCase();
    if (status) matchFilter.status = status;
    if (priority) matchFilter.priority = priority.toUpperCase();
    if (department && mongoose.Types.ObjectId.isValid(department)) {
      matchFilter.department = new mongoose.Types.ObjectId(department);
    }
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    // Scope Analytics to Admin Municipal Jurisdiction
    if (req.user.municipality) {
      matchFilter.municipality = req.user.municipality;
    }

    // 1. Overview KPIs
    const totalRequests = await Request.countDocuments(matchFilter);
    const resolvedRequests = await Request.countDocuments({ ...matchFilter, status: { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'] } });
    const closedRequests = await Request.countDocuments({ ...matchFilter, status: { $in: ['CITIZEN_VERIFIED', 'CLOSED'] } });
    const reopenedRequests = await Request.countDocuments({ ...matchFilter, $or: [{ status: 'REOPENED' }, { 'verificationIssue.reported': true }] });
    const criticalRequests = await Request.countDocuments({ ...matchFilter, priority: 'CRITICAL' });

    // SLA Metrics Calculation
    const activeReqs = await Request.find(matchFilter).select('status priority slaDeadline createdAt resolvedAt verifiedAt');
    let overdueCount = 0;
    let pendingSlaCount = 0;
    let totalResolutionHours = 0;
    let resolvedWithTimestampsCount = 0;
    let totalCompletionHours = 0;
    let completedWithTimestampsCount = 0;

    activeReqs.forEach((r) => {
      const sla = getSlaStatus(r.slaDeadline, r.status, r.priority);
      if (sla === 'OVERDUE') overdueCount++;
      if (sla === 'ON_TIME' && !['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'].includes(r.status)) pendingSlaCount++;

      if (r.resolvedAt && r.createdAt) {
        const diffHours = (new Date(r.resolvedAt) - new Date(r.createdAt)) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          totalResolutionHours += diffHours;
          resolvedWithTimestampsCount++;
        }
      }

      if (r.verifiedAt && r.createdAt) {
        const diffHours = (new Date(r.verifiedAt) - new Date(r.createdAt)) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          totalCompletionHours += diffHours;
          completedWithTimestampsCount++;
        }
      }
    });

    const avgResolutionHours = resolvedWithTimestampsCount > 0
      ? parseFloat((totalResolutionHours / resolvedWithTimestampsCount).toFixed(1))
      : 0;

    const avgCompletionHours = completedWithTimestampsCount > 0
      ? parseFloat((totalCompletionHours / completedWithTimestampsCount).toFixed(1))
      : 0;

    const slaComplianceRate = totalRequests > 0
      ? parseFloat((((totalRequests - overdueCount) / totalRequests) * 100).toFixed(1))
      : 100;

    // 2. Category Distribution
    const categoryDistribution = await Request.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Status Breakdown
    const statusBreakdown = await Request.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 4. Priority Distribution
    const priorityDistribution = await Request.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // 5. Department Breakdown
    const departmentDistribution = await Request.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED']] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept'
        }
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$dept.name', 'General / Unassigned'] },
          code: { $ifNull: ['$dept.code', 'GEN'] },
          count: 1,
          resolvedCount: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 6. Monthly Trend (Past 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendFilter = { ...matchFilter };
    if (!trendFilter.createdAt) {
      trendFilter.createdAt = { $gte: sixMonthsAgo };
    }

    const monthlyTrend = await Request.aggregate([
      { $match: trendFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 7. Feedback & Rating Analytics
    const feedbacks = await Feedback.find().select('rating comment createdAt');
    const totalFeedback = feedbacks.length;
    const avgRating = totalFeedback > 0
      ? parseFloat((feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedback).toFixed(2))
      : 0;

    const ratingDistribution = {
      5: feedbacks.filter(f => f.rating === 5).length,
      4: feedbacks.filter(f => f.rating === 4).length,
      3: feedbacks.filter(f => f.rating === 3).length,
      2: feedbacks.filter(f => f.rating === 2).length,
      1: feedbacks.filter(f => f.rating === 1).length
    };

    // 8. Staff Performance Comparison
    const staffPerformance = await User.aggregate([
      { $match: { role: 'STAFF' } },
      {
        $lookup: {
          from: 'requests',
          localField: '_id',
          foreignField: 'assignedStaff',
          as: 'assignedRequests'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          assignedCount: { $size: '$assignedRequests' },
          completedCount: {
            $size: {
              $filter: {
                input: '$assignedRequests',
                as: 'req',
                cond: { $in: ['$$req.status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED']] }
              }
            }
          },
          pendingCount: {
            $size: {
              $filter: {
                input: '$assignedRequests',
                as: 'req',
                cond: {
                  $not: [{ $in: ['$$req.status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED']] }]
                }
              }
            }
          }
        }
      },
      { $sort: { completedCount: -1 } }
    ]);

    res.status(200).json({
      success: true,
      overview: {
        totalRequests,
        resolvedRequests,
        closedRequests,
        reopenedRequests,
        criticalRequests,
        overdueCount,
        pendingSlaCount,
        slaComplianceRate,
        avgResolutionHours,
        avgCompletionHours,
        avgRating,
        totalFeedback
      },
      categoryDistribution,
      statusBreakdown,
      priorityDistribution,
      departmentDistribution,
      monthlyTrend,
      feedbackAnalytics: {
        totalFeedback,
        avgRating,
        ratingDistribution
      },
      staffPerformance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Request Report Data with Filters
// @route   GET /api/admin/reports/requests
// @access  Private (ADMIN)
const getRequestReports = async (req, res, next) => {
  try {
    const {
      category,
      status,
      priority,
      department,
      startDate,
      endDate,
      search,
      limit = 2000
    } = req.query;

    const query = {};
    if (category) query.category = category.toUpperCase();
    if (status) query.status = status;
    if (priority) query.priority = priority.toUpperCase();
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        const d = await Department.findOne({ code: department.toUpperCase() });
        if (d) query.department = d._id;
      }
    }

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

    const requests = await Request.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email phone')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Enrich with Feedback if present
    const reqIds = requests.map(r => r._id);
    const feedbacks = await Feedback.find({ request: { $in: reqIds } }).select('request rating comment');
    const feedbackMap = {};
    feedbacks.forEach(f => {
      feedbackMap[f.request.toString()] = f;
    });

    const formattedData = requests.map(r => {
      const fb = feedbackMap[r._id.toString()] || null;
      const sla = getSlaStatus(r.slaDeadline, r.status, r.priority);

      const resolvedDate = r.resolvedAt || r.resolutionProof?.resolvedAt || null;
      const closedDate = r.citizenVerification?.verifiedAt || (['CLOSED', 'CITIZEN_VERIFIED'].includes(r.status) ? r.updatedAt : null);

      return {
        _id: r._id,
        requestId: r.requestId,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        citizenName: r.citizen?.name || 'N/A',
        citizenEmail: r.citizen?.email || 'N/A',
        citizenPhone: r.citizen?.phone || 'N/A',
        departmentName: r.department?.name || 'Unassigned',
        departmentCode: r.department?.code || 'N/A',
        staffName: r.assignedStaff?.name || 'Unassigned',
        staffEmail: r.assignedStaff?.email || 'N/A',
        address: r.address || '',
        city: r.city || '',
        pincode: r.pincode || '',
        coordinates: r.location?.coordinates || [],
        upvotes: r.upvoteCount || 0,
        createdAt: r.createdAt,
        slaDeadline: r.slaDeadline,
        slaStatus: sla,
        resolvedDate,
        closedDate,
        rating: fb ? fb.rating : (r.citizenVerification?.rating || null),
        feedbackComment: fb ? fb.comment : (r.citizenVerification?.comment || ''),
        isVerified: r.citizenVerification?.verified || false,
        resolutionNotes: r.resolutionNotes || r.resolutionProof?.notes || ''
      };
    });

    res.status(200).json({
      success: true,
      count: formattedData.length,
      filters: { category, status, priority, department, startDate, endDate, search },
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Aggregated Summary Reports (Status, Category, Department, Staff, SLA, Feedback)
// @route   GET /api/admin/reports/summary
// @access  Private (ADMIN)
const getSummaryReports = async (req, res, next) => {
  try {
    const { category, department, priority, status, startDate, endDate } = req.query;

    const matchStage = {};
    if (category) matchStage.category = category.toUpperCase();
    if (status) matchStage.status = status;
    if (priority) matchStage.priority = priority.toUpperCase();
    if (department && mongoose.Types.ObjectId.isValid(department)) {
      matchStage.department = new mongoose.Types.ObjectId(department);
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // 1. Status Report Breakdown
    const totalMatching = await Request.countDocuments(matchStage);
    const statusAgg = await Request.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const statusReport = statusAgg.map(s => ({
      status: s._id,
      count: s.count,
      percentage: totalMatching > 0 ? parseFloat(((s.count / totalMatching) * 100).toFixed(1)) : 0
    }));

    // 2. Category Report
    const categoryAgg = await Request.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED']] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED']] }, 1, 0]
            }
          },
          avgResolutionHours: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED']] },
                    { $gt: ['$resolvedAt', null] }
                  ]
                },
                { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
                null
              ]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);
    const categoryReport = categoryAgg.map(c => ({
      category: c._id,
      total: c.total,
      resolved: c.resolved,
      pending: c.pending,
      avgResolutionHours: c.avgResolutionHours ? parseFloat(c.avgResolutionHours.toFixed(1)) : 0
    }));

    // 3. Department Report
    const departments = await Department.find();
    const departmentReport = await Promise.all(
      departments.map(async d => {
        const dQuery = { ...matchStage, department: d._id };
        const total = await Request.countDocuments(dQuery);
        const resolved = await Request.countDocuments({
          ...dQuery,
          status: { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'] }
        });
        const pending = await Request.countDocuments({
          ...dQuery,
          status: { $in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'] }
        });
        const activeStaff = await User.countDocuments({ department: d._id, role: 'STAFF', isActive: true });

        return {
          departmentId: d._id,
          name: d.name,
          code: d.code,
          totalRequests: total,
          resolvedRequests: resolved,
          pendingRequests: pending,
          activeStaffCount: activeStaff,
          resolutionRate: total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0
        };
      })
    );

    // 4. Staff Performance Report
    const staffMembers = await User.find({ role: 'STAFF' }).populate('department', 'name code');
    const staffReport = await Promise.all(
      staffMembers.map(async s => {
        const sQuery = { ...matchStage, assignedStaff: s._id };
        const assigned = await Request.countDocuments(sQuery);
        const completed = await Request.countDocuments({
          ...sQuery,
          status: { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'] }
        });
        const pending = await Request.countDocuments({
          ...sQuery,
          status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED', 'REOPENED'] }
        });

        // Staff resolution hours
        const resolvedReqs = await Request.find({
          ...sQuery,
          status: { $in: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'] },
          resolvedAt: { $ne: null }
        }).select('createdAt resolvedAt _id');

        let avgHours = 0;
        if (resolvedReqs.length > 0) {
          const totalH = resolvedReqs.reduce((acc, r) => {
            return acc + (new Date(r.resolvedAt) - new Date(r.createdAt)) / 3600000;
          }, 0);
          avgHours = parseFloat((totalH / resolvedReqs.length).toFixed(1));
        }

        // Staff feedbacks
        const staffReqIds = resolvedReqs.map(r => r._id);
        const sFeedbacks = await Feedback.find({ request: { $in: staffReqIds } }).select('rating');
        const avgRating = sFeedbacks.length > 0
          ? parseFloat((sFeedbacks.reduce((acc, f) => acc + f.rating, 0) / sFeedbacks.length).toFixed(2))
          : 0;

        return {
          staffId: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone || 'N/A',
          department: s.department?.name || 'Unassigned',
          departmentCode: s.department?.code || 'N/A',
          isActive: s.isActive,
          totalAssigned: assigned,
          completedRequests: completed,
          pendingRequests: pending,
          avgResolutionHours: avgHours,
          feedbackCount: sFeedbacks.length,
          avgRating: avgRating
        };
      })
    );

    // 5. Feedback Report Data
    const feedbacks = await Feedback.find()
      .populate({
        path: 'request',
        select: 'requestId title category status priority createdAt department',
        populate: { path: 'department', select: 'name code' }
      })
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);

    const feedbackReport = feedbacks.map(f => ({
      _id: f._id,
      requestId: f.request?.requestId || 'N/A',
      title: f.request?.title || 'N/A',
      category: f.request?.category || 'N/A',
      department: f.request?.department?.name || 'Unassigned',
      rating: f.rating,
      comment: f.comment || '',
      citizenName: f.citizen?.name || 'N/A',
      citizenEmail: f.citizen?.email || 'N/A',
      createdAt: f.createdAt
    }));

    // 6. SLA Performance Report
    const slaPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const slaReport = await Promise.all(
      slaPriorities.map(async p => {
        const pQuery = { ...matchStage, priority: p };
        const total = await Request.countDocuments(pQuery);
        const allInP = await Request.find(pQuery).select('status slaDeadline priority createdAt resolvedAt');

        let met = 0;
        let breached = 0;
        let pending = 0;

        allInP.forEach(r => {
          const sla = getSlaStatus(r.slaDeadline, r.status, r.priority);
          if (['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED'].includes(r.status)) {
            if (r.resolvedAt && r.slaDeadline && new Date(r.resolvedAt) <= new Date(r.slaDeadline)) {
              met++;
            } else if (sla === 'OVERDUE') {
              breached++;
            } else {
              met++;
            }
          } else {
            if (sla === 'OVERDUE') {
              breached++;
            } else {
              pending++;
            }
          }
        });

        const compliance = (met + breached) > 0 ? parseFloat(((met / (met + breached)) * 100).toFixed(1)) : 100;

        return {
          priority: p,
          total,
          met,
          breached,
          pending,
          complianceRate: compliance
        };
      })
    );

    res.status(200).json({
      success: true,
      summary: {
        totalRequests: totalMatching,
        statusReport,
        categoryReport,
        departmentReport,
        staffReport,
        feedbackReport,
        slaReport
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Activity Logs
// @route   GET /api/admin/activity-logs
// @access  Private (ADMIN)
const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find()
      .populate('user', 'name role email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current Admin's Municipal Jurisdiction Details
// @route   GET /api/admin/municipality
// @access  Private (ADMIN)
const getAdminMunicipality = async (req, res, next) => {
  try {
    let municipality = null;
    if (req.user.municipality) {
      municipality = await Municipality.findById(req.user.municipality);
    }
    if (!municipality) {
      municipality = await Municipality.findOne({ isActive: true });
      if (municipality && !req.user.municipality) {
        await User.updateOne({ _id: req.user._id }, { municipality: municipality._id });
      }
    }

    res.status(200).json({
      success: true,
      municipality
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Admin's Municipal Jurisdiction Settings
// @route   PUT /api/admin/municipality
// @access  Private (ADMIN)
const updateAdminMunicipality = async (req, res, next) => {
  try {
    let municipalityId = req.user.municipality;
    const { name, code, city, state, country, contactPhone, contactEmail, pincodes, wards } = req.body;

    let municipality = null;
    if (municipalityId) {
      municipality = await Municipality.findById(municipalityId);
    }
    if (!municipality) {
      municipality = await Municipality.findOne({ isActive: true });
    }

    if (!municipality) {
      municipality = new Municipality({
        name: name || 'Guntur Municipal Corporation',
        code: code || 'GMC-01',
        city: city || 'Guntur',
        state: state || 'Andhra Pradesh',
        country: country || 'India'
      });
    }

    if (name) municipality.name = name.trim();
    if (code) municipality.code = code.trim().toUpperCase();
    if (city) municipality.city = city.trim();
    if (state) municipality.state = state.trim();
    if (country) municipality.country = country.trim();
    if (contactPhone !== undefined) municipality.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) municipality.contactEmail = contactEmail.trim();
    if (Array.isArray(pincodes)) municipality.pincodes = pincodes;
    if (Array.isArray(wards)) municipality.wards = wards;

    await municipality.save();

    if (!req.user.municipality || req.user.municipality.toString() !== municipality._id.toString()) {
      await User.updateOne({ _id: req.user._id }, { municipality: municipality._id });
    }

    res.status(200).json({
      success: true,
      message: 'Municipal jurisdiction settings updated successfully',
      municipality
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  createStaffUser,
  toggleUserStatus,
  assignStaff,
  updatePriority,
  getAnalyticsData,
  getActivityLogs,
  getRequestReports,
  getSummaryReports,
  getAdminMunicipality,
  updateAdminMunicipality
};

