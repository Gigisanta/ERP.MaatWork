# Railway Deployment - Blocker Requiring Manual Intervention

## Current Status: BLOCKED by Railway Platform Bug

### What Was Completed Successfully:

✅ **All Configuration Files Created and Committed:**
- `apps/api/Dockerfile` - Multi-stage Docker build for Express API
- `apps/web/Dockerfile` - Multi-stage Docker build for Next.js
- `apps/analytics-service/Dockerfile` - Dockerfile for Python FastAPI (newly created)
- `apps/api/railway.toml` - Railway service configuration
- `apps/web/railway.toml` - Railway service configuration
- `apps/analytics-service/railway.toml` - Railway service configuration
- `apps/analytics-service/package.json` - Fixed to remove broken install script
- `nixpacks.toml` - Root nixpacks configuration
- `Railway-Deployment-Manual-Steps.md` - Comprehensive deployment guide

✅ **Railway Project Connected:**
- CLI linked to project `maatwork` (ID: 8156c542-b896-48b8-afd0-192602b02d44)
- PostgreSQL database service already exists and is healthy

✅ **Code Changes Pushed:**
- All configuration files committed and pushed to `feature/railway-migration` branch
- Latest commit: `c4d9932` (docs: add Railway deployment manual steps guide)

### The Problem:

❌ **Railway Build Cache Bug - Cannot Be Resolved via CLI:**

**Symptom:**
The API service is stuck in a deployment loop failing with:
```
Error: Cannot find module '/app/scripts/install-python-deps.js'
```

**Root Cause:**
Railway is using a **cached Dockerfile from an old build** that references a package.json install script that has already been fixed in the current codebase. Despite multiple attempts, Railway continues to use the cached/stale Docker build and ignores all configuration changes.

**Attempted CLI Solutions (ALL FAILED):**
1. Set `RAILWAY_DOCKERFILE_PATH=/apps/api/Dockerfile` - Not taking effect
2. Set `BUILD_COMMAND` and `START_COMMAND` - Not taking effect
3. Set `NO_CACHE=1` and `RAILWAY_BUILDKIT_INLINE_CACHE="0"` - Cache not clearing
4. Added `CACHE_BUST` timestamp variable - Not busting cache
5. Modified Dockerfiles multiple times and pushed changes - Not being used
6. Created multiple new commits to trigger fresh deployment - Still using old cache
7. Used `railway service redeploy` multiple times - Same cached build
8. Used `railway up . --detach` - Same cached build
9. Attempted to create new service - Requires interactive input
10. Researched Railway API - Requires authentication token I don't have

**Research Results:**
This is a **known Railway platform bug** affecting multiple users. Based on Railway Help Station research:
- Multiple users have reported identical cache issues
- The bug prevents Railway from detecting updated Dockerfiles
- CLI commands cannot force a fresh build when this specific caching issue occurs
- The only reliable solution is **manual intervention via Railway web UI**

## Options to Proceed:

### Option A: Provide Railway API Token (Recommended for AI Automation)

If you can provide a Railway Project Access Token, I can:

1. **Delete the stuck `api` service via GraphQL API**
2. **Recreate the `api` service cleanly**
3. **Deploy all services (API, Web, Analytics) via API**
4. **Configure environment variables programmatically**
5. **Run database migrations via API**
6. **Monitor deployment status until all services are healthy**

**How to Create Railway API Token:**
1. Go to: https://railway.com/account
2. Click "Manage API Tokens"
3. Click "Create New Token"
4. Name it: `maatwork-deployment`
5. Select permissions: `Full Access` or `Project Read/Write`
6. Copy the generated token
7. Provide it to me in your next message

### Option B: Manual Web UI Steps (Faster if done by user)

You can complete the deployment manually in ~10-15 minutes:

1. **Access Railway Dashboard:**
   - Go to: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44

2. **Delete Stuck API Service:**
   - Click on `api` service
   - Click "Settings" → "Delete Service"
   - Confirm deletion
   - This will clear all cached builds

3. **Add Fresh API Service:**
   - Click "New Service" → "GitHub Repo"
   - Select: `Gigisanta/MaatWork`
   - Branch: `feature/railway-migration`
   - Service name: `api`
   - **Settings:** Ensure Root Directory is EMPTY (not `/apps/api`)
   - Click "Deploy"

4. **Add Web Service:**
   - Click "New Service" → "GitHub Repo"
   - Select: `Gigisanta/MaatWork`
   - Branch: `feature/railway-migration`
   - Service name: `web`
   - **Settings:** Ensure Root Directory is EMPTY
   - Click "Deploy"

5. **Add Analytics Service (Optional):**
   - Click "New Service" → "GitHub Repo"
   - Select: `Gigisanta/MaatWork`
   - Branch: `feature/railway-migration`
   - Service name: `analytics`
   - **Settings:** Ensure Root Directory is EMPTY
   - Click "Deploy"

6. **Configure Environment Variables:**
   - **API Service:**
     - `DATABASE_URL` → Ref to `postgres` service
     - `JWT_SECRET` → Generate secure random string
     - `PORT` → `3001`
     - `NODE_ENV` → `production`
     - `CORS_ORIGINS` → `https://maat.work,https://api.maat.work`

   - **Web Service:**
     - `NEXT_PUBLIC_API_URL` → Will be available after API deploys
     - `NODE_ENV` → `production`

7. **Configure Custom Domains:**
   - API domain: `api.maat.work`
   - Web domain: `maat.work`

8. **Configure DNS Records:**
   - At your domain registrar
   - Add CNAME record for `api.maat.work`
   - Add CNAME/A record for `maat.work`

9. **Run Database Migrations:**
   - Go to API service → "Deploy" tab
   - Add Pre-Deploy Command: `pnpm -F @maatwork/db migrate`

10. **Verify Deployments:**
   - Check all services show "Running" status
   - Test health endpoints
   - Test application functionality

## What I Need From You:

**Choose one of these options to continue:**

1. **"Provide API token"** - Then I can programmatically complete everything via Railway API
2. **"I'll do the manual steps"** - Then you complete the web UI steps and tell me when ready
3. **"Wait and I'll keep trying CLI approaches"** - Though the current blocker suggests this won't work

## Files Created for Reference:

All configuration files are in the git repository on branch `feature/railway-migration`:

- `Railway-Deployment-Manual-Steps.md` - Detailed manual deployment guide
- `Railway-Deployment-Blocker.md` - This file (current)
- All Dockerfiles and railway.toml files in `apps/*/`

## Next Steps (depending on your choice):

**If you provide API token:**
- I will use Railway GraphQL API to delete/recreate services
- Programmatic deployment of all services
- Automated environment variable configuration
- Database migration execution
- Continuous monitoring until production-ready

**If you complete manual steps:**
- I will configure environment variables via CLI once services are running
- I will run database migrations
- I will verify health checks
- I will test end-to-end functionality
- I will fix any issues that arise during testing

---

**Waiting for your direction on how to proceed...**
