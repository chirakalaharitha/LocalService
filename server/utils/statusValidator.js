/**
 * Status Transition Validator for LocalFix Request Workflow
 */

const normalizeStatus = (status) => {
  if (!status) return '';
  return status.trim().toUpperCase().replace(/\s+/g, '_');
};

const ALLOWED_STAFF_TRANSITIONS = {
  ASSIGNED: ['ACCEPTED', 'IN_PROGRESS'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED', 'RESOLUTION_SUBMITTED', 'PENDING_VERIFICATION']
};

/**
 * Validates whether a staff member can transition a request from currentStatus to targetStatus.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {{ valid: boolean, message: string, normalizedTarget: string }}
 */
const isValidStaffTransition = (currentStatus, targetStatus) => {
  const current = normalizeStatus(currentStatus);
  const target = normalizeStatus(targetStatus);

  if (!current || !target) {
    return {
      valid: false,
      message: 'Both current status and target status are required.',
      normalizedTarget: target
    };
  }

  // Self transition is not allowed
  if (current === target) {
    return {
      valid: false,
      message: `Request is already in ${current} status.`,
      normalizedTarget: target
    };
  }

  const allowed = ALLOWED_STAFF_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    const allowedList = (allowed || []).map((s) => s.replace(/_/g, ' ')).join(', ') || 'None';
    return {
      valid: false,
      message: `Invalid status transition from ${current.replace(/_/g, ' ')} to ${target.replace(/_/g, ' ')}. Allowed next states: ${allowedList}.`,
      normalizedTarget: target
    };
  }

  return {
    valid: true,
    message: 'Valid status transition.',
    normalizedTarget: target
  };
};

module.exports = {
  normalizeStatus,
  ALLOWED_STAFF_TRANSITIONS,
  isValidStaffTransition
};
