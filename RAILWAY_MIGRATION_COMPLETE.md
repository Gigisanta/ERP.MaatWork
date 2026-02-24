# Railway Migration - Summary & Next Steps

## ✅ Completed Work

### 1. Dockerfiles Created
- **`apps/api/Dockerfile`** - Multi-stage build for Express API
  - Uses pnpm workspace
  - Builds all required packages (api, db, logger, utils, ui, types)
  - Final image: Alpine Linux with node user

- **`apps/web/Dockerfile`** - Multi-stage build for Next.js
  - Uses pnpm workspace
  - Builds all required packages
  - Standalone output from Next.js config
  - Final image: Alpine Linux with node user

### 2. Railway Configuration
- Created `railway.json` (later removed in favor of GitHub integration)
- Build configuration tested and working
- All packages compile successfully

### 3. Dependencies Fixed
- Downgraded `chalk` from v5.6.2 to v4.1.0 (ESM compatibility)
- Build now completes without errors

### 4. Documentation Updated
- **Created**: `docs/RAILWAY_GITHUB_INTEGRATION.md` - Complete setup guide
- **Removed**: `docs/RAILWAY_SETUP.md` - Outdated setup guide
- **Removed**: `docs/deployment/production-terraform.md` - AWS Terraform docs (deprecated)
- **Removed**: `.github/workflows/deploy-railway.yml` - Manual GitHub Actions workflow
- **Updated**: `docs/README.md` - Deployment section updated

### 5. Key Decision: Railway Native GitHub Integration

Instead of using GitHub Actions + Railway CLI, the recommended approach is to use **Railway's built-in GitHub integration**:

**Benefits:**
- ✅ Zero configuration - No workflow files needed
- ✅ Automatic detection - Detects Dockerfile and builds automatically
- ✅ Instant deployment - Deploys on every push to configured branch
- ✅ Built-in logs - View build and runtime logs in Railway dashboard
- ✅ One-click rollbacks - Instant rollback to previous deployments

---

## 📋 Next Steps (Manual)

Follow the guide in **`docs/RAILWAY_GITHUB_INTEGRATION.md`** to complete setup:

### Step 1: Connect GitHub Repository to Railway

1. Open Railway project: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44
2. Click "New Service" → "GitHub"
3. Click "Connect a repository"
4. Select repository: `Gigisanta/MaatWork`
5. Select branch: `master` (or `feature/railway-migration` for testing)
6. Click "Deploy"

Railway will automatically create services from your repository.

### Step 2: Configure Services (in Railway Dashboard)

After GitHub connection, Railway creates services automatically. Verify these settings:

**API Service:**
- Root Directory: `.` (repo root, not `apps/api`)
- Builder: Dockerfile
- Build Command: Railway should auto-detect
- Start Command: `node apps/api/dist/index.js`
- Health Check: `/health`

**Web Service:**
- Root Directory: `.` (repo root, not `apps/web`)
- Builder: Dockerfile
- Build Command: Railway should auto-detect
- Start Command: `node apps/web/server.js`
- Health Check: `/api/health`

If Root Directory is incorrect, change it in service settings.

### Step 3: Add PostgreSQL Database

In Railway Dashboard:
1. Click "New Service" → "Database" → "PostgreSQL"
2. Service name: `maatwork-db`
3. Click "Create Database"

### Step 4: Link Database to API Service

In Railway Dashboard:
1. Go to API service → "Variables" tab
2. Click "Reference" button next to `DATABASE_URL` field
3. Select `maatwork-db` PostgreSQL database

This will automatically inject the database URL.

### Step 5: Configure Additional Environment Variables

**API Service:**
- `PORT=3001` (set by default, but verify)
- Any other required variables from your environment

**Web Service:**
- `NEXT_PUBLIC_API_URL` - Set to Railway API URL (get from dashboard after deployment)
- Any other required variables

### Step 6: Configure Custom Domains

**API Domain (api.maat.work):**
```bash
# After API is deployed
railway domain --service maatwork-api api.maat.work
```

Then add DNS records to Cloudflare:
- Type: CNAME
- Name: api
- Target: Value from Railway

**Web Domain (maat.work):**
```bash
# After web is deployed
railway domain --service maatwork-web maat.work
```

Then add DNS records to Cloudflare:
- Type: CNAME
- Name: @ (root)
- Target: Value from Railway

Wait up to 24 hours for DNS propagation.

### Step 7: Verify Automatic Deployment

Test that automatic deployment works:

```bash
# Make a small change
echo "# test-$(date +%s)" >> apps/api/README.md

# Commit and push to master
git checkout master
git merge feature/railway-migration
git push origin master
```

Check Railway dashboard - deployment should start automatically.

---

## 📚 Repository Clean-up

All temporary files and outdated documentation have been removed:
- ❌ `railway.json` - Not needed with GitHub integration
- ❌ `scripts/install-python-deps.mjs` - Incomplete file
- ❌ `.github/workflows/deploy-railway.yml` - Using Railway native integration instead
- ❌ `docs/RAILWAY_SETUP.md` - Replaced with integration guide
- ❌ `docs/deployment/production-terraform.md` - AWS migration, no longer relevant

---

## 🎯 Ready for Production

Once you complete steps 1-6 above:
- ✅ Push to `master` branch triggers automatic deployment
- ✅ Railway builds and deploys from your GitHub repo
- ✅ Zero manual intervention needed for future deployments
- ✅ Rollback to previous deployments in one click

---

## 🔗 Useful Links

- **Railway Dashboard**: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44
- **Railway Documentation**: https://docs.railway.com
- **Railway CLI Docs**: https://docs.railway.com/cli
- **Setup Guide**: `docs/RAILWAY_GITHUB_INTEGRATION.md`
- **Railway Status**: https://backboard.railway.com
