# LocalFix – Smart Local Service Request & Tracking Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-5.x-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-green.svg)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/socket.io-4.x-black.svg)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**LocalFix** is a full-stack, enterprise-grade civic issue resolution platform developed as a B.Tech Computer Science & Engineering Major Project. It bridges citizens, municipal field engineers, and executive civic administrators through real-time geospatial issue tracking, automated SLA deadline monitoring, before/after visual proof verification, and multi-tier reporting.

---

## 🏛️ System Architecture

```text
                                  +---------------------------------------+
                                  |         React 18 + Vite (SPA)         |
                                  |  Tailwind CSS | Leaflet | Recharts   |
                                  +---------------------------------------+
                                           |                      ^
                         REST API Requests |                      | Real-Time Events
                            (Bearer JWT)   v                      | (Socket.IO)
                                  +---------------------------------------+
                                  |         Node.js + Express.js          |
                                  |   Rate Limiter | Multer | RBAC Guard  |
                                  +---------------------------------------+
                                           |                      |
                    Mongoose Queries (ODM) |                      | Background Notification
                    GeoJSON 2dsphere       v                      v (Mock / SMTP)
                        +----------------------+              +----------------------+
                        |    MongoDB Atlas     |              |      Nodemailer      |
                        |   Document Store     |              |    Email Service     |
                        +----------------------+              +----------------------+
```

---

## 🚀 Key Modules by Role

### 1. Citizen Experience (`/dashboard`, `/requests/create`, `/requests/:id`)
* **Interactive Geo-Tagging**: Browser Geolocation API detection + draggable Leaflet marker on OpenStreetMap.
* **Smart Priority Inference**: Priority suggestion based on issue category, keyword hazard parsing, and community impact.
* **Duplicate Detection Safeguard**: Geospatial 300m radius duplicate scanning warns citizens before posting redundant tickets.
* **Live Status Tracking**: Stepper progress timeline tracking ticket status from `PENDING` to `CITIZEN_VERIFIED`.
* **Visual Work Inspection**: Before/After image comparison viewer with split-slider display.
* **Citizen Verification & Feedback**: Citizens review completed repairs, confirm closure, submit 5-star ratings, or reopen unresolved issues.
* **Public Issue Board**: Civic complaints with upvoting and community comment threads.

### 2. Field Staff Operations (`/staff/dashboard`, `/staff/requests/:id`)
* **Live Workload Queue**: Categorized task list with priority badges and dynamic SLA countdown timers.
* **Acceptance & Escalation**: Accept task or reject with a formal reason for administrative reassignment.
* **Arrival Evidence**: Upload on-site Before-work inspection proof upon arriving at the location.
* **Technical Notes & Resolution**: Upload After-work proof images with repair documentation to trigger `PENDING_VERIFICATION`.

### 3. Executive Administration (`/admin/*`)
* **Executive Control Center**: 14 real-time KPI metrics derived directly from MongoDB (turnaround times, pending SLAs, resolution rates).
* **Workforce Assignment**: Assign tickets to civic departments and field staff members with audit logging.
* **Analytics Engine (`/admin/analytics`)**: Recharts data visualizations (monthly trends, category distributions, SLA compliance tiers, staff performance).
* **Reporting Center (`/admin/reports`)**: Multi-sheet Excel workbook export (`xlsx`) and branded PDF summaries (`jsPDF`).
* **Department Administration (`/admin/departments`)**: Full CRUD operations for departments with referential deletion protection.
* **Platform Configuration (`/admin/settings`)**: Configurable SLA targets (Critical, High, Medium, Low) and safe email status checks.
* **Activity Audit Logs (`/admin/activity-logs`)**: Immutable event logs capturing administrative actions with metadata inspector modal.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, React Router v6, React-Leaflet, Leaflet, Recharts, React Icons, React Toastify |
| **Backend** | Node.js, Express.js, Socket.IO, Multer, Nodemailer, bcryptjs, jsonwebtoken, cors, dotenv |
| **Database** | MongoDB Atlas / Local MongoDB, Mongoose ODM (with GeoJSON `2dsphere` spatial indexing) |
| **Reporting** | SheetJS (`xlsx`), jsPDF (`jspdf` + `jspdf-autotable`) |
| **Security** | JWT authentication, Token-bucket rate limiting, Strict extension/MIME upload validation, Credential-sanitized error middleware |

---

## 📁 Repository Structure

```text
localfix/
├── client/                     # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Common (Navbar, Sidebar), Location, Maps, Requests
│   │   ├── context/            # AuthContext, NotificationContext, SocketContext
│   │   ├── layouts/            # MainLayout (responsive drawer & header)
│   │   ├── pages/              # Citizen, Staff, Admin pages, Landing & Auth
│   │   ├── routes/             # AppRoutes, ProtectedRoute (RBAC)
│   │   ├── services/           # Axios API client, Socket.IO, PDF/Excel exporters
│   │   ├── utils/              # Status badges, date formatting helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json             # Vercel SPA rewrite configuration
│   ├── vite.config.js          # Vite config & API reverse proxy
│   └── package.json
├── server/                     # Node.js + Express Backend API
│   ├── config/                 # db.js (Mongoose connection)
│   ├── controllers/            # auth, request, staff, admin, department, settings, feedback
│   ├── middleware/             # authMiddleware, roleMiddleware, rateLimitMiddleware, uploadMiddleware, errorMiddleware
│   ├── models/                 # User, Request, Department, RequestHistory, Notification, Feedback, SystemSetting, ActivityLog
│   ├── routes/                 # auth, request, staff, admin, department, settings, feedback
│   ├── services/               # socketService, priorityService, slaService, duplicateService, emailService
│   ├── utils/                  # seed.js, testSystem.js, testPhase14-20 suites
│   ├── app.js                  # Express app & route registration
│   ├── server.js               # HTTP + Socket.IO server startup
│   └── package.json
├── .env.example                # Root environment template
├── .gitignore                  # Git ignore rules (secrets & build outputs)
├── README.md                   # Complete project documentation
└── package.json                # Root orchestration package
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB community server or MongoDB Atlas connection URI

### 2. Clone & Install
```bash
git clone https://github.com/your-username/localfix.git
cd localfix

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
cd ..
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Configure `.env` with your values:
```env
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/localfix
JWT_SECRET=your_super_secret_64_char_random_jwt_key
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Optional Nodemailer Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=LocalFix Support <noreply@localfix.org>
```

In `client/`, create `.env`:
```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:5000
VITE_SERVER_URL=http://localhost:5000
```

### 4. Database Seeding
Populate default civic departments, verified Admin, Field Staff, and Citizen demo accounts:
```bash
npm run seed
```

**Default Test Credentials:**
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@localfix.gov.in` | `Admin@123456` |
| **Field Staff** | `staff.water@localfix.gov.in` | `Staff@123456` |
| **Citizen** | `citizen@localfix.org` | `Citizen@123456` |

### 5. Start Development Servers
Start both backend API server and Vite frontend concurrently:
```bash
npm run dev
```
- **Web App**: `http://localhost:5173`
- **REST API**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🧪 Comprehensive Automated Test Suites

The project contains complete automated test suites executing real HTTP requests against MongoDB:

```bash
# Phase 20 Complete System Regression Suite (38 checks)
node server/utils/testPhase20Regression.js

# Phase 10 Full E2E Lifecycle Suite (38 checks)
node server/utils/testSystem.js

# Phase 18 Security & Validation Hardening Suite (28 checks)
node server/utils/testPhase18Security.js

# Phase 17 Departments & System Settings Suite (34 checks)
node server/utils/testPhase17.js

# Phase 16 PDF & Excel Reports Suite (34 checks)
node server/utils/testPhase16.js

# Phase 15 Analytics & Aggregations Suite (24 checks)
node server/utils/testPhase15.js

# Phase 14 Admin Executive Control Suite (51 checks)
node server/utils/testPhase14.js

# Phase 13 Citizen Verification & Feedback Suite (50 checks)
node server/utils/testPhase13.js

# Frontend Production Compilation Test
npm run build --prefix client
```

**Total Verification Tests**: 290+ automated assertions passed across all phases.

---

## 🚢 Cloud Production Deployment Guide

### 1. MongoDB Atlas Configuration
1. Log in to [MongoDB Atlas](https://www.mongodb.com/atlas) and create an M0 free tier cluster.
2. Under **Database Access**, create a user with `readWriteAnyDatabase` privileges.
3. Under **Network Access**, add `0.0.0.0/0` to allow inbound connections from cloud server providers.
4. Copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/localfix?retryWrites=true&w=majority`
5. Note: GeoJSON `2dsphere` spatial indexes are created automatically on startup by Mongoose.

### 2. Backend Deployment (Render or Cloud Service)
1. In [Render](https://render.com/), create a new **Web Service** linked to your repository.
2. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm install --prefix server`
   - **Start Command**: `node server/server.js`
   - **Health Check Path**: `/api/health`
3. Set **Environment Variables**:
   ```text
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   MONGODB_URI=<Your MongoDB Atlas connection string>
   JWT_SECRET=<Random 64-char string>
   CLIENT_URL=https://<your-vercel-domain>.vercel.app
   SERVER_URL=https://<your-render-domain>.onrender.com
   ```
4. Deploy and verify that `GET /api/health` responds with HTTP 200.

### 3. Frontend Deployment (Vercel)
1. In [Vercel](https://vercel.com/), click **Add New Project** and select your repository.
2. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add **Environment Variables**:
   ```text
   VITE_API_URL=https://<your-render-domain>.onrender.com/api
   VITE_SOCKET_URL=https://<your-render-domain>.onrender.com
   VITE_SERVER_URL=https://<your-render-domain>.onrender.com
   ```
4. Deploy. The included `client/vercel.json` ensures all client-side routes redirect seamlessly to `/index.html`.

### 4. CORS & Socket.IO Finalization
- After your Vercel deployment URL is generated, update the `CLIENT_URL` environment variable on Render to match your exact Vercel URL (e.g. `https://localfix.vercel.app`).
- This allows authenticated CORS requests, file uploads, and Socket.IO WebSocket handshakes to function securely.

---

## 🔒 Security Architecture Highlights

- **Zero Secret Commits**: All credentials, tokens, and database passwords reside exclusively in `.env` (ignored by git).
- **Password Protection**: Passwords hashed using bcrypt with 10 salt rounds; excluded from API projections (`select: false`).
- **Server-Side Authorization**: Every administrative and staff route enforces `authenticateUser` + `authorizeRoles`.
- **Resource Ownership**: Citizens are strictly forbidden from viewing, verifying, or commenting on private tickets belonging to other citizens.
- **Upload Hardening**: Whitelist checking for extension and MIME types (JPEG, PNG, WEBP, GIF), path traversal sanitization, null-byte rejection, 5MB file limits.
- **Error Sanitization**: Production error middleware redacts database connection strings and passwords before sending responses.
- **Socket.IO Room Guard**: Server validates token on handshake and verifies ownership before permitting clients to join private ticket rooms.

---

## 📌 Known Limitations & Future Scope

### Current Limitations
1. **Local File Storage**: Uploaded Before/After photos are currently stored on the local filesystem (`server/uploads/`). Free cloud tiers (e.g., Render free tier) use ephemeral disks that reset on service cold restarts.
2. **In-Memory Rate Limiting**: The built-in rate limiter tracks request counts in server memory, which applies per process instance.

### Future Improvements
1. **Cloud Media Storage**: Integrate Amazon S3, Google Cloud Storage, or Cloudinary for persistent external media uploads.
2. **Distributed Rate Limiting**: Back the rate limiting middleware with Redis for multi-instance cluster support.
3. **SMS Alerts**: Integrate Twilio or Fast2SMS for citizen SMS status alerts alongside email and in-app notifications.
4. **Mobile Application**: Port citizen and field staff workflows to React Native for offline GPS capture and camera uploads.

---

## 👨‍💻 Project Information

- **Project Title**: LocalFix – Smart Local Service Request & Tracking Platform
- **Degree**: Bachelor of Technology in Computer Science & Engineering (B.Tech CSE)
- **Year**: 2026
- **Status**: Completed (Phases 1 through 21 fully verified)
