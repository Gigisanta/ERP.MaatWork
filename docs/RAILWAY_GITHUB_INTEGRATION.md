# Railway GitHub Integration Setup Guide

## Overview

Rail-in GitHub integrationway has **built** for automatic deployments. 

**Current Status:** ✅ **DEPLOYED**
- **URL:** https://maatwork-production.up.railway.app
- **Branch:** `feature/railway-migration`
- **Service:** Web (Next.js) only

## What Was Deployed

| Service | Status | Notes |
|---------|--------|-------|
| Web (Next.js) | ✅ Active | Only service deployed |
| API (Express) | ❌ Not deployed | Runs locally |
| Analytics (Python) | ❌ Not deployed | Runs locally |
| PostgreSQL | Optional | Can be added if needed |

## Setup Steps

### 1. Connect GitHub Repository to Railway

1. Go to: https://railway.com/project/aa4efbfc-a325-4ff4-b28c-680c8fbedfba
2. Click "New Service" → "GitHub"
3. Click "Connect a repository"
4. Select: `Gigisanta/MaatWork`
5. Select branch: `feature/railway-migration`
6. Click "Deploy"

### 2. Configure Service

After connecting GitHub, Railway will create a service. Configure it:

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

**Correct next.config.js:**
```javascript
// DON'T use output: 'standalone'
module.exports = {
  // ... other config
  // output: 'standalone',  // REMOVE THIS!
};
```

**Correct start command:**
```bash
# CORRECT - Use standard next start
pnpm -F @maatwork/web start

# WRONG - This causes 502 errors
node .next/standalone/apps/web/server.js
```

### 4. Trigger Deployment

```bash
# Push to the configured branch
git push origin feature/railway-migration
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

## Common Issues and Solutions

### 502 Application Failed to Respond

**Cause:** App starts but Railway proxy can't connect

**Solution:**
1. Check start command is `pnpm -F @maatwork/web start`
2. Remove `output: 'standalone'` from next.config
3. Ensure PORT is set to 3000
4. Check build logs for errors

### Build Fails: Package Not Found

**Cause:** Root Directory is wrong

**Solution:**
1. Go to Railway Dashboard → Service → Settings
2. Set Root Directory to `/` (not `apps/web`)
3. Redeploy

### Build Fails: pnpm Not Found

**Cause:** Railway can't detect pnpm

**Solution:**
1. Ensure pnpm is in package.json
2. Check that corepack is enabled
3. Try adding to build command: `corepack enable && pnpm install`

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

## Benefits of Railway Native Integration

1. **Zero Configuration** - No GitHub Actions workflow needed
2. **Automatic Detection** - Detects Node.js/pnpm and builds automatically
3. **Instant Deployment** - Deploys on every push to configured branch
4. **Built-in Logs** - View build and runtime logs in Railway dashboard
5. **One-Click Rollbacks** - Instant rollback to previous deployment

---

## Notes

- Only the Next.js web app is deployed. API and analytics run locally or in separate environments.
- The deployment is on the `feature/railway-migration` branch
- Production URL: https://maatwork-production.up.railway.app

---

**Last Updated:** 2026-02-25
**Status:** ✅ Production Ready
