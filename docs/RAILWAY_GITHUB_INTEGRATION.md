# Railway GitHub Integration Setup Guide

## Overview

Railway has **built-in GitHub integration** for automatic deployments on branch push.

**Current Status:**
- **Web URL:** https://maatwork-production.up.railway.app ✅ Working (HTTP 200)
- **API URL:** https://maatwork-api-production.up.railway.app ⚠️ Complex Turborepo setup
- **Branch:** `feature/railway-migration`
- **Web URL:** https://maatwork-production.up.railway.app ✅ Working
- **API URL:** https://maatwork-api-production.up.railway.app (needs service creation)
- **Branch:** `feature/railway-migration`

## What Was Deployed

| Service | Status | Notes |
|---------|--------|-------|
| Web (Next.js) | ✅ Active | Deployed and working |
| API (Express) | ⚠️ Needs Setup | Requires manual service creation |
| Analytics (Python) | ⚠️ Needs Setup | Requires manual service creation |
| PostgreSQL | ⚠️ Needs Setup | Requires manual database creation |

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

## Manual Setup Required

Due to Railway's architecture, **new services must be created manually** through the dashboard. Here's what you need to do:

### 1. Create API Service

1. Go to: https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba
2. Click **"New Service"** → **"GitHub"**
3. Select repository: `Gigisanta/MaatWork`
4. Select branch: `feature/railway-migration`
5. **Root Directory:** `apps/api`
6. **Build Command:**
   ```
   pnpm install --frozen-lockfile && pnpm -F @maatwork/types build && pnpm -F @maatwork/utils build && pnpm -F @maatwork/logger build && pnpm -F @maatwork/db build && pnpm -F @maatwork/api build
   ```
7. **Start Command:** `pnpm -F @maatwork/api start`
8. **Port:** `3001`
9. Click **"Deploy"**

### 2. Create Analytics Service (Python)

1. Go to: https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba
2. Click **"New Service"** → **"GitHub"**
3. Select repository: `Gigisanta/MaatWork`
4. Select branch: `feature/railway-migration`
5. **Root Directory:** `apps/analytics-service`
6. **Builder:** Nixpacks (auto-detects Python)
7. **Python Version:** `3.11`
8. **Start Command:** `python main.py`
9. Click **"Deploy"**

### 3. Add PostgreSQL Database

1. Go to: https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba
2. Click **"New Service"** → **"Database"**
3. Select **"PostgreSQL"**
4. Wait for the database to provision
5. Once created, the `DATABASE_URL` will be automatically available to all services

### 4. Connect Database to Services

1. Go to each service (Web, API)
2. Click **"Variables"** tab
3. Add a reference to `DATABASE_URL` from the PostgreSQL service
4. Redeploy each service

### 5. Run Database Migrations

After the database is connected, run migrations:

```bash
# Connect to Railway shell
railway run --service api -- pnpm -F @maatwork/db migrate

# Or use Railway's run command
railway run --service api -- npx drizzle-kit migrate
```

---

## Configuration Files

The following configuration files are already in place:

- `railway.toml` - Root configuration for main service
- `apps/web/railway.toml` - Web service configuration
- `apps/api/railway.toml` - API service configuration
- `apps/analytics-service/railway.toml` - Analytics service configuration
- `railway.json` - Monorepo service definitions

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

## Important Notes

- The deployment is on the `feature/railway-migration` branch currently
- Production URL: https://maatwork-production.up.railway.app
- API URL: https://maatwork-api-production.up.railway.app (after service creation)

---

**Last Updated:** 2026-02-25
**Status:** ⚠️ Setup Required - Manual service creation needed
