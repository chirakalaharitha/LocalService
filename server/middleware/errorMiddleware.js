const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format: ${err.value}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Mongoose Duplicate Key (11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `A record with this ${field} already exists.` : 'Duplicate entry error.';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }

  // Handle Multer file upload errors
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file exceeds maximum allowed limit (5MB).'
      : err.message || 'File upload error occurred.';
  }

  // Handle file filter rejection
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only image files') || err.message.includes('Invalid filename'))) {
    statusCode = 400;
  }

  // Sanitize message to guarantee no connection credentials or internal secrets leak
  message = message.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb://[REDACTED]@');

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };

