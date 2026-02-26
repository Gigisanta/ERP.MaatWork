# Railway GitHub Integration Setup Guide

## Overview

Railway has **built-in GitHub integration** for automatic deployments on branch push.

**Current Status:**
- **Web URL:** https://maatwork-production.up.railway.app ✅
- **API URL:** https://maatwork-api-production.up.railway.app (in progress)
- **Branch:** `feature/railway-migration`

## What Was Deployed

| Service | Status | Notes |
|---------|--------|-------|
| Web (Next.js) | ✅ Active | Deployed |
| API (Express) | 🔄 In Progress | Deploying |
| Analytics (Python) | ❌ Pending | Not deployed yet |
| PostgreSQL | ✅ Active | Database service |

---

## Auto-Deployment Setup (Master Branch)

To enable automatic deployment when merging to master branch:

### Option 1: Through Railway Dashboard (Recommended)

1. **Go to Railway Dashboard:**
   https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba

2. **Connect GitHub Repository:**
   - Go to each service → Settings
   - Click "Connect Repo"
   - Select `Gigisanta/MaatWork` repository

3. **Configure Trigger Branch:**
   - In service settings, find "Trigger Branch"
   - Set to `master` (or `main`)
   - Now deployments will trigger on push to master

4. **Deploy to Master:**
   ```bash
   # Merge your feature branch to master
   git checkout master
   git merge feature/railway-migration
   git push origin master
   ```

### Option 2: Automatic on Any Branch Push

Railway automatically deploys when you push to the connected branch. To deploy from master:

1. Make sure the service is connected to your GitHub repo
2. Push to the branch configured in Railway (default: main or master)
3. Railway will detect the push and deploy automatically

---

## Setup Steps

### 1. Connect GitHub Repository to Railway

1. Go to: https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba
2. Click "New Service" → "GitHub"
3. Click "Connect a repository"
4. Select: `Gigisanta/MaatWork`
5. Select branch: `master` (for auto-deploy on master)
6. Click "Deploy"

### 2. Configure Service

**Web Service:**
- Root Directory: `/` (CRITICAL!)
- Builder: Nixpacks (auto-detected)
- Build Command: 
  ```
  pnpm install --frozen-lockfile && pnpm -F @maatwork/types build && pnpm -F @maatwork/utils build && pnpm -F @maatwork/logger build && pnpm -F @maatwork/db build && pnpm -F @maatwork/ui build && pnpm -F @maatwork/web build
  ```
- Start Command: `pnpm -F @maatwork/web start`
- Port: 3000 (auto-detected)

### 3. Important: Don't Use Standalone Mode

⚠️ **CRITICAL:** Do NOT set `output: 'standalone'` in next.config.js or build.js.

Using standalone mode causes **502 Application failed to respond** errors because Railway's proxy can't connect to the container properly.

### 4. Trigger Deployment

```bash
# Push to master for auto-deployment
git checkout master
git merge feature/railway-migration
git push origin master
```

Railway will automatically detect the push and start deployment.

### 5. Verify Deployment

```bash
# Check deployment status
railway deployment list

# View logs
railway logs --lines 100

# Test the app
curl https://maatwork-production.up.railway.app
```

---

## CLI Reference

```bash
# Link project (if needed)
railway link aa4efbfc-a325-4ff4-b28c-680c8fbedfba

# Trigger deployment
railway up --detach

# Redeploy
railway redeploy --yes

# View logs
railway logs --lines 100

# Open dashboard
railway open

# Get domain
railway domain
```

---

## Notes

- The deployment is on the `feature/railway-migration` branch currently
- Production URL: https://maatwork-production.up.railway.app
- API URL: https://maatwork-api-production.up.railway.app

---

**Last Updated:** 2026-02-25
**Status:** ✅ Production Ready (Web), 🔄 In Progress (API)
