# LocalFix Production Deployment Guide

This guide details how to deploy the **LocalFix Backend** on **Render** using Infrastructure-as-Code (Render Blueprint), configure MongoDB Atlas, and connect the frontend client.

---

## Architecture Overview

- **Backend Web Service**: Node.js / Express / Socket.IO deployed on [Render](https://render.com) using `render.yaml`.
- **Database**: MongoDB Atlas (Free M0 Shared Cluster).
- **Frontend Client**: React + Vite SPA deployed on [Vercel](https://vercel.com) (or Render Static Sites).
- **Media Storage**: Local disk storage (`/uploads`) or cloud bucket.
- **Email Service**: SMTP (Gmail App Password, SendGrid, or Mailgun).

---

## Step 1: Set Up MongoDB Atlas Database

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **Free Shared Cluster (M0)** (choose AWS Oregon `us-west-2` to match Render's Oregon region for the lowest latency).
3. **Database Access**:
   - Create a database user (e.g. `localfix_admin`) and generate a secure password.
4. **Network Access**:
   - Go to **Network Access** -> **Add IP Address**.
   - Select **Allow Access from Anywhere (`0.0.0.0/0`)** (Render uses dynamic IP addresses).
5. **Get Connection String**:
   - Click **Connect** -> **Drivers** (Node.js).
   - Copy the URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/localfix?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database credentials.

---

## Step 2: Deploy Backend to Render using Blueprint

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and select **Blueprint**.
3. Connect your GitHub repository:
   ```
   https://github.com/chirakalaharitha/LocalService.git
   ```
4. Render will automatically detect `render.yaml` and display the service plan:
   - **Service**: `localfix-backend` (Web Service, Node, Free plan)
5. Under **Environment Variables**, fill in the required values:
   - `MONGODB_URI`: Paste your MongoDB Atlas connection string from Step 1.
   - `CLIENT_URL`: Your frontend production domain (e.g., `https://your-app.vercel.app` or `*` temporarily).
   - `SERVER_URL`: Your Render backend URL (e.g., `https://localfix-backend.onrender.com`).
   - `SMTP_USER` / `SMTP_PASS` *(Optional)*: Gmail address and 16-character Google App Password if you want real emails.
   - `JWT_SECRET`: Render will automatically generate a secure random 256-bit key.
6. Click **Apply**.
7. Render will build and launch your backend web service!

---

## Step 3: Verify Backend Deployment

Once the Render deployment finishes and displays **Live**:

1. **Test API Health**:
   Open in your browser:
   ```
   https://<your-render-backend>.onrender.com/api/health
   ```
   Expected Response:
   ```json
   {
     "success": true,
     "message": "LocalFix API Server is running smoothly",
     "timestamp": "2026-..."
   }
   ```

2. **Test SMTP Status (Safe Diagnostic)**:
   ```
   https://<your-render-backend>.onrender.com/api/health/email
   ```

3. **Initialize Super Admin Account (One-Time)**:
   In your Render service dashboard:
   - Go to the **Shell** tab.
   - Run:
     ```bash
     node server/scripts/setupAdmin.js
     ```
   - This seeds the initial system administrator account safely.

---

## Step 4: Deploy Frontend (Vercel)

The repository includes a ready-to-use `vercel.json`.

1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import `https://github.com/chirakalaharitha/LocalService.git`.
3. In Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (or keep root with build command `npm run build --prefix client` and output `client/dist`)
4. Add **Environment Variables** in Vercel:
   - `VITE_API_URL`: `https://<your-render-backend>.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://<your-render-backend>.onrender.com`
   - `VITE_SERVER_URL`: `https://<your-render-backend>.onrender.com`
5. Click **Deploy**.
6. Copy your Vercel deployment URL (e.g. `https://localfix-client.vercel.app`) and update `CLIENT_URL` in your Render backend settings so CORS allows requests.

---

## Render Blueprint Specification (`render.yaml`)

```yaml
services:
  - type: web
    name: localfix-backend
    runtime: node
    plan: free
    region: oregon
    buildCommand: npm install --prefix server
    startCommand: node server/server.js
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: HOST
        value: 0.0.0.0
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: CLIENT_URL
        sync: false
      - key: SERVER_URL
        sync: false
      - key: SMTP_HOST
        value: smtp.gmail.com
      - key: SMTP_PORT
        value: 587
      - key: SMTP_SECURE
        value: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: SMTP_FROM
        value: LocalFix Support <noreply@localfix.org>
```

---

## Troubleshooting

- **MongoDB connection timeout**: Make sure `0.0.0.0/0` is added to MongoDB Atlas Network Access whitelist.
- **CORS blocked**: Verify `CLIENT_URL` on Render matches your exact frontend URL without trailing slashes.
- **Render Spin-down**: On Render's Free tier, the web service spins down after 15 minutes of inactivity and takes 30-50s to wake up on the first request.
