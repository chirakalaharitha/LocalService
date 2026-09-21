/**
 * SLA Deadline Calculation & Status Manager
 * Rules:
 * CRITICAL -> 4 Hours
 * HIGH -> 12 Hours
 * MEDIUM -> 24 Hours
 * LOW -> 72 Hours
 */

const getSlaHoursByPriority = (priority) => {
  switch (priority) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 12;
    case 'MEDIUM':
      return 24;
    case 'LOW':
      return 72;
    default:
      return 24;
  }
};

const calculateSlaDeadline = (priority, startDate = new Date()) => {
  const hours = getSlaHoursByPriority(priority);
  const deadline = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  return deadline;
};

const getSlaStatus = (slaDeadline, currentStatus, priority = null) => {
  // If request is already resolved or citizen verified, SLA check passes
  if (['RESOLVED', 'CITIZEN_VERIFIED', 'REJECTED'].includes(currentStatus)) {
    return 'ON_TIME';
  }

  if (!slaDeadline) {
    return 'ON_TIME';
  }

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'OVERDUE';
  }

  // If less than 20% of SLA duration remains -> NEAR_BREACH
  const totalHours = priority ? getSlaHoursByPriority(priority) : 24;
  const totalMs = totalHours * 60 * 60 * 1000;
  if (diffMs < totalMs * 0.2) {
    return 'NEAR_BREACH';
  }

  return 'ON_TIME';
};

module.exports = {
  getSlaHoursByPriority,
  calculateSlaDeadline,
  getSlaStatus
};

