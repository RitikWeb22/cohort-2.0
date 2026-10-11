# Floorly (FreelanceOS) - Production Deployment Guide

This guide walks you through deploying the **Frontend to Vercel** and the **Backend to Render**.

---

## 1. Backend Deployment on Render

### Step 1: Create a Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Connect your GitHub repository (`cohort-2.0`).
3. Fill in the deployment settings:
   - **Name**: `floorly-backend` (or your preferred name)
   - **Region**: Choose the closest region (e.g., Singapore / Frankfurt / Oregon)
   - **Branch**: `qa-audit` (or `main`)
   - **Root Directory**: `resume-projects/freelancer-os/server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: `Free` (or Starter)

### Step 2: Configure Environment Variables on Render
Under the **Environment Variables** section, add the following:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimisations |
| `PORT` | `10000` | Render standard web port |
| `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/floorly` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | *(Random 32+ character string)* | e.g. generate via `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `GEMINI_API_KEY` | `AQ...` | Your Google Gemini API Key |
| `AI_PRIMARY_MODEL`| `gemini-1.5-flash` | Primary AI model |
| `AI_FALLBACK_MODEL`| `gemini-1.5-pro` | Fallback model |
| `FRONTEND_URL` | `https://your-floorly-frontend.vercel.app` | Your Vercel frontend domain (update after Vercel deploy) |
| `BILLING_ENABLED` | `false` | Keep `false` until gateway approval |
| `REDIS_URL` | *(Optional)* | Redis URL if using cloud Redis (e.g. Upstash) |

### Step 3: Verify Backend
Once deployed, verify by opening:
`https://<your-render-service>.onrender.com/health`
Expected response:
```json
{
  "status": "healthy",
  "database": { "status": "connected" },
  "cache": { "status": "connected" },
  "version": "1.0.0"
}
```

---

## 2. Frontend Deployment on Vercel

### Step 1: Import Project to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** > **Project**.
2. Select your GitHub repository (`cohort-2.0`).
3. In **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `resume-projects/freelancer-os/client`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)

### Step 2: Configure Environment Variables on Vercel
Under **Environment Variables**, add:

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com` |

*(Do not append `/api/v1` - the API client handles routing automatically).*

### Step 3: Deploy & Link
1. Click **Deploy**.
2. Once complete, copy your Vercel deployment URL (e.g. `https://floorly-client.vercel.app`).
3. Return to **Render** and update `FRONTEND_URL` to match this URL, then trigger a redeploy so CORS connects seamlessly.

---

## 3. Post-Deployment Checklist

- [ ] Open frontend Vercel URL and navigate to `/register` or `/login`.
- [ ] Test client creation, proposal generation, and invoice downloads.
- [ ] Verify page reload on any route (e.g. `/dashboard`, `/proposals`) doesn't throw a 404 (`vercel.json` SPA rewrite handles this).
- [ ] Check Network tab to confirm all requests point to `https://<your-backend>.onrender.com/api/v1/*`.
