const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

// Load environment variables - authoritatively prioritize server/.env
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '../.env');

let loadedEnvPath = null;
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: true });
  loadedEnvPath = serverEnvPath;
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  loadedEnvPath = rootEnvPath;
}

// Print safe diagnostic status (NEVER log password, OTP, JWT secret, or tokens)
console.log('====================================================');
console.log('      LOCALFIX BACKEND – SMTP DIAGNOSTIC STATUS     ');
console.log('====================================================');
console.log(`Environment file loaded: ${loadedEnvPath || 'None found'}`);
console.log(`SMTP configured: ${Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim() && process.env.SMTP_PASS && process.env.SMTP_PASS.trim())}`);
console.log(`SMTP host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
console.log(`SMTP port: ${process.env.SMTP_PORT || '587'}`);
console.log(`SMTP user configured: ${Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim())}`);
console.log('====================================================');

const connectDB = require('./config/db');
const app = require('./app');
const { initSocket } = require('./services/socketService');
const { verifyEmailTransporter } = require('./services/emailService');

// Connect Database
connectDB();

// Diagnostic verification of SMTP Transporter
verifyEmailTransporter();

const server = http.createServer(app);

// Initialize Socket.IO with production-safe CORS
const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
  return rawOrigins.split(',').map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      const allowed = parseAllowedOrigins();
      if (allowed.includes('*') || allowed.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`Socket.IO CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

initSocket(io);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 LocalFix Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO initialized & ready for events`);
  console.log(`=================================================`);
});

