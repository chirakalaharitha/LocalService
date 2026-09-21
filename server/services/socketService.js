const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

let io = null;

const initSocket = (socketIoInstance) => {
  io = socketIoInstance;

  // Socket.IO Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Extract JWT token from handshake auth or authorization header
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      // Verify JWT token with existing secret
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        return next(new Error('Authentication error: Token expired or invalid'));
      }

      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Load user from database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication error: Account has been deactivated'));
      }

      const validRoles = ['CITIZEN', 'STAFF', 'ADMIN'];
      if (!validRoles.includes(user.role)) {
        return next(new Error('Authentication error: Invalid user role'));
      }

      // Attach authenticated user to socket instance
      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket.IO] Authentication middleware error:', error.message);
      next(new Error('Authentication error: Internal server validation failure'));
    }
  });

  // Socket Connection Event
  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const userId = user._id.toString();
    const roleUpper = user.role.toUpperCase();
    const roleLower = user.role.toLowerCase();

    // Automatically join private user rooms (server-enforced security)
    socket.join(`user:${userId}`);
    socket.join(`user_${userId}`); // Legacy support

    // Automatically join role-based rooms
    socket.join(`role:${roleUpper}`);
    socket.join(`role:${roleLower}`);
    socket.join(`role_${roleUpper}`); // Legacy support

    console.log(`[Socket.IO] Authenticated client connected: ${socket.id} | User: ${user.name} (${userId}) | Role: ${roleUpper}`);

    // Allow joining a specific request room with server-side authorization check
    socket.on('join_request', async (requestId) => {
      if (!requestId) return;
      const cleanId = requestId.toString();

      try {
        const Request = require('../models/Request');
        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
        const reqDoc = await Request.findOne(isObjectId ? { $or: [{ _id: cleanId }, { requestId: cleanId }] } : { requestId: cleanId });

        if (!reqDoc) {
          socket.emit('error', { message: 'Service request not found' });
          return;
        }

        // Security check: Citizens cannot join another citizen's private request room
        if (socket.user.role === 'CITIZEN' && reqDoc.citizen && reqDoc.citizen.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Unauthorized: Cannot join private request room of another citizen' });
          return;
        }

        socket.join(`request:${cleanId}`);
        socket.join(`request_${cleanId}`);
        console.log(`[Socket.IO] Socket ${socket.id} (User: ${socket.user.name}) joined request room: ${cleanId}`);
      } catch (err) {
        console.error('[Socket.IO] Error validating request room join:', err.message);
      }
    });

    socket.on('leave_request', (requestId) => {
      if (requestId) {
        const cleanId = requestId.toString();
        socket.leave(`request:${cleanId}`);
        socket.leave(`request_${cleanId}`);
        console.log(`[Socket.IO] Socket ${socket.id} left request room: ${cleanId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} | User: ${user.name} | Reason: ${reason}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

// Targeted Helper Emitters
const emitToUser = (userId, event, data) => {
  if (io && userId) {
    const id = userId.toString();
    io.to(`user:${id}`).to(`user_${id}`).emit(event, data);
  }
};

const emitToRole = (role, event, data) => {
  if (io && role) {
    const upper = role.toUpperCase();
    const lower = role.toLowerCase();
    io.to(`role:${upper}`).to(`role:${lower}`).to(`role_${upper}`).emit(event, data);
  }
};

const emitToRequestRoom = (requestId, event, data) => {
  if (io && requestId) {
    const id = requestId.toString();
    io.to(`request:${id}`).to(`request_${id}`).emit(event, data);
  }
};

const emitGlobal = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Standardized Phase 9 Real-Time Event Emitters
 */

// 1. request:created
const emitRequestCreated = ({ request, citizenId }) => {
  if (!io || !request) return;

  const payload = {
    requestId: request.requestId,
    request: {
      _id: request._id,
      requestId: request.requestId,
      title: request.title,
      category: request.category,
      priority: request.priority,
      status: request.status,
      address: request.address,
      createdAt: request.createdAt,
      location: request.location
    }
  };

  // Send to citizen private room
  if (citizenId) {
    emitToUser(citizenId, 'request:created', payload);
  } else if (request.citizen) {
    const cId = request.citizen._id ? request.citizen._id : request.citizen;
    emitToUser(cId, 'request:created', payload);
  }

  // Send to Admins & Staff
  emitToRole('ADMIN', 'request:created', payload);
  emitToRole('STAFF', 'request:created', payload);
};

// 2. request:statusChanged
const emitRequestStatusChanged = ({
  requestId,
  requestMongoId,
  status,
  previousStatus,
  changedBy,
  note = '',
  resolutionProof = null,
  citizenId,
  staffId,
  request
}) => {
  if (!io) return;

  const effectiveReqId = requestId || request?.requestId;
  const effectiveMongoId = requestMongoId || request?._id;

  const payload = {
    requestId: effectiveReqId,
    requestMongoId: effectiveMongoId,
    status,
    previousStatus,
    changedAt: new Date().toISOString(),
    changedBy: changedBy ? {
      _id: changedBy._id,
      name: changedBy.name,
      role: changedBy.role
    } : null,
    note: note || '',
    resolutionProof: resolutionProof || (request?.resolutionProof || null),
    request: request ? {
      _id: request._id,
      requestId: request.requestId,
      status: request.status,
      priority: request.priority,
      afterImage: request.afterImage || '',
      beforeImage: request.beforeImage || '',
      resolutionNotes: request.resolutionNotes || '',
      resolutionProof: request.resolutionProof || null,
      resolvedAt: request.resolvedAt || null,
      verifiedAt: request.verifiedAt || null,
      updatedAt: request.updatedAt
    } : undefined
  };

  // 1. Notify reporting Citizen
  const targetCitizenId = citizenId || (request?.citizen?._id ? request.citizen._id : request?.citizen);
  if (targetCitizenId) {
    emitToUser(targetCitizenId, 'request:statusChanged', payload);
  }

  // 2. Notify assigned Staff
  const targetStaffId = staffId ||
    (request?.assignedStaff?._id ? request.assignedStaff._id : request?.assignedStaff) ||
    (request?.assignedTo?._id ? request.assignedTo._id : request?.assignedTo);
  if (targetStaffId) {
    emitToUser(targetStaffId, 'request:statusChanged', payload);
  }

  // 3. Notify Admins
  emitToRole('ADMIN', 'request:statusChanged', payload);

  // 4. Broadcast to request viewers in room
  if (effectiveReqId) {
    emitToRequestRoom(effectiveReqId, 'request:statusChanged', payload);
  }
  if (effectiveMongoId) {
    emitToRequestRoom(effectiveMongoId, 'request:statusChanged', payload);
  }
};

// 3. request:updated
const emitRequestUpdated = ({
  requestId,
  requestMongoId,
  changes = {},
  citizenId,
  staffId,
  request
}) => {
  if (!io) return;

  const effectiveReqId = requestId || request?.requestId;
  const effectiveMongoId = requestMongoId || request?._id;

  const payload = {
    requestId: effectiveReqId,
    requestMongoId: effectiveMongoId,
    changes,
    updatedAt: new Date().toISOString(),
    request: request ? {
      _id: request._id,
      requestId: request.requestId,
      title: request.title,
      category: request.category,
      priority: request.priority,
      status: request.status,
      address: request.address,
      updatedAt: request.updatedAt
    } : undefined
  };

  // Notify citizen
  const targetCitizenId = citizenId || (request?.citizen?._id ? request.citizen._id : request?.citizen);
  if (targetCitizenId) {
    emitToUser(targetCitizenId, 'request:updated', payload);
  }

  // Notify assigned staff
  const targetStaffId = staffId ||
    (request?.assignedStaff?._id ? request.assignedStaff._id : request?.assignedStaff) ||
    (request?.assignedTo?._id ? request.assignedTo._id : request?.assignedTo);
  if (targetStaffId) {
    emitToUser(targetStaffId, 'request:updated', payload);
  }

  // Notify Admins
  emitToRole('ADMIN', 'request:updated', payload);

  // Request room
  if (effectiveReqId) {
    emitToRequestRoom(effectiveReqId, 'request:updated', payload);
  }
  if (effectiveMongoId) {
    emitToRequestRoom(effectiveMongoId, 'request:updated', payload);
  }
};

// 4. request:assigned
const emitRequestAssigned = ({
  requestId,
  requestMongoId,
  assignedTo,
  assignedAt,
  request,
  citizenId,
  staffId
}) => {
  if (!io) return;

  const effectiveReqId = requestId || request?.requestId;
  const effectiveMongoId = requestMongoId || request?._id;

  const payload = {
    requestId: effectiveReqId,
    requestMongoId: effectiveMongoId,
    assignedTo: assignedTo ? {
      _id: assignedTo._id,
      name: assignedTo.name,
      email: assignedTo.email
    } : null,
    assignedAt: assignedAt || new Date().toISOString(),
    request: request ? {
      _id: request._id,
      requestId: request.requestId,
      title: request.title,
      category: request.category,
      priority: request.priority,
      status: request.status,
      address: request.address,
      slaDeadline: request.slaDeadline
    } : undefined
  };

  // Target staff member
  const targetStaffId = staffId || (assignedTo?._id ? assignedTo._id : assignedTo);
  if (targetStaffId) {
    emitToUser(targetStaffId, 'request:assigned', payload);
  }

  // Target citizen
  const targetCitizenId = citizenId || (request?.citizen?._id ? request.citizen._id : request?.citizen);
  if (targetCitizenId) {
    emitToUser(targetCitizenId, 'request:assigned', payload);
  }

  // Admins
  emitToRole('ADMIN', 'request:assigned', payload);

  // Request room
  if (effectiveReqId) {
    emitToRequestRoom(effectiveReqId, 'request:assigned', payload);
  }
  if (effectiveMongoId) {
    emitToRequestRoom(effectiveMongoId, 'request:assigned', payload);
  }
};

// 5. feedback:submitted
const emitFeedbackSubmitted = ({ feedback, request, citizen }) => {
  if (!io || !feedback) return;

  const payload = {
    feedback: {
      _id: feedback._id,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      request: feedback.request
    },
    requestId: request?.requestId || feedback.request,
    citizen: citizen ? { _id: citizen._id, name: citizen.name } : undefined
  };

  // Broadcast to Admins
  emitToRole('ADMIN', 'feedback:submitted', payload);

  // Send to assigned staff if present
  const staffId = request?.assignedStaff?._id || request?.assignedStaff;
  if (staffId) {
    emitToUser(staffId, 'feedback:submitted', payload);
  }

  // Request room
  if (request?.requestId) emitToRequestRoom(request.requestId, 'feedback:submitted', payload);
  if (feedback.request) emitToRequestRoom(feedback.request.toString(), 'feedback:submitted', payload);
};

// 6. feedback:updated
const emitFeedbackUpdated = ({ feedback, requestId }) => {
  if (!io || !feedback) return;

  const payload = {
    feedback: {
      _id: feedback._id,
      rating: feedback.rating,
      comment: feedback.comment,
      updatedAt: feedback.updatedAt,
      request: feedback.request
    },
    requestId
  };

  emitToRole('ADMIN', 'feedback:updated', payload);
  if (requestId) emitToRequestRoom(requestId.toString(), 'feedback:updated', payload);
  if (feedback.request) emitToRequestRoom(feedback.request.toString(), 'feedback:updated', payload);
};

// 7. feedback:deleted
const emitFeedbackDeleted = ({ feedbackId, requestId }) => {
  if (!io || !feedbackId) return;

  const payload = { feedbackId, requestId };
  emitToRole('ADMIN', 'feedback:deleted', payload);
  if (requestId) emitToRequestRoom(requestId.toString(), 'feedback:deleted', payload);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToRequestRoom,
  emitGlobal,
  emitRequestCreated,
  emitRequestStatusChanged,
  emitRequestUpdated,
  emitRequestAssigned,
  emitFeedbackSubmitted,
  emitFeedbackUpdated,
  emitFeedbackDeleted
};

