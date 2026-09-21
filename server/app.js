const express = require('express');
const cors = require('cors');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const requestRoutes = require('./routes/requestRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const municipalityRoutes = require('./routes/municipalityRoutes');

const app = express();

// Trust reverse proxy headers (Render, Heroku, Cloudflare) for client IP & secure protocol
app.set('trust proxy', 1);

// Production-ready CORS with origin normalization and multi-client support
const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
  return rawOrigins.split(',').map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    const allowed = parseAllowedOrigins();
    if (allowed.includes('*') || allowed.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files static directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LocalFix API Server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Safe SMTP Diagnostic endpoint (never leaks credentials)
app.get('/api/health/email', async (req, res) => {
  const { verifyEmailTransporter } = require('./services/emailService');
  const isConfigured = Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_USER.trim() &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS.trim()
  );

  if (!isConfigured) {
    return res.status(200).json({
      success: false,
      smtpConfigured: false,
      smtpConnection: false,
      error: 'SMTP credentials (SMTP_USER / SMTP_PASS) not configured in server/.env'
    });
  }

  const check = await verifyEmailTransporter();
  if (check.ready) {
    return res.status(200).json({
      success: true,
      smtpConfigured: true,
      smtpConnection: true,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      sender: process.env.SMTP_FROM || process.env.SMTP_USER
    });
  }

  return res.status(200).json({
    success: false,
    smtpConfigured: true,
    smtpConnection: false,
    error: check.error || 'SMTP authentication failed',
    code: check.code || 'SMTP_CONNECT_FAILED'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/municipalities', municipalityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/settings', settingsRoutes);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;

