/**
 * Rate Limiting Middleware for Sensitive Endpoints
 * In-memory token bucket tracking per IP / user
 */

const rateLimitMap = new Map();

// Periodically clean up expired rate-limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests from this client. Please slow down and try again later.'
} = {}) => {
  return (req, res, next) => {
    // Allow bypassing rate limits during automated tests if header is passed
    if (req.headers['x-test-bypass-rate-limit']) {
      return next();
    }

    const clientIdentifier = req.user?._id?.toString() || req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}${req.path}_${clientIdentifier}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitMap.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      res.set('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        message
      });
    }

    next();
  };
};

module.exports = {
  createRateLimiter,
  authLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  }),
  feedbackLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many feedback submissions. Please slow down.'
  }),
  commentLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many comments submitted. Please slow down.'
  })
};
