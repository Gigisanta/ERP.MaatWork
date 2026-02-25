# Railway Deployment - Quick Reference Guide

## Prerequisites

Before deploying to Railway, ensure you have:
- ✅ Railway account with project created
- ✅ Railway CLI installed (optional but recommended)
- ✅ All code committed to git repository
- ✅ Changes from this fix branch merged to main

## Service Configuration Summary

| Service | Root Directory | Builder | Port | Health Check |
|---------|---------------|----------|-------|--------------|
| PostgreSQL | / | PostgreSQL | 5432 | N/A |
| API (Express) | / | Nixpacks | 3001 | `/health` |
| Web (Next.js) | / | Nixpacks | 3000 | `/` |
| Analytics (Python) | / | Nixpacks | 3002 | `/health` |

**CRITICAL:** Root Directory must be `/` for all services (NOT `apps/`)

---

## Deployment Procedure

### Step 1: Push Changes to Repository

```bash
# Switch to main branch (or target branch)
git checkout main

# Merge the railway-migration branch
git merge feature/railway-migration

# Push to remote
git push origin main
```

### Step 2: Configure Railway Project

#### Option A: Using Railway CLI (Recommended)

```bash
# Login to Railway
railway login

# Initialize project (if not already done)
railway init

# Deploy each service
railway add postgresql
railway add --name=api
railway add --name=web
railway add --name=analytics
```

#### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Open your project
3. For each service:

**For PostgreSQL:**
- Select "PostgreSQL"
- Railway will handle configuration automatically

**For API:**
- Click "New Service" → "Deploy from GitHub repo"
- Select this repository
- Root Directory: `/` (CRITICAL!)
- Builder: Nixpacks (auto-detected)
- Config File: `apps/api/railway.toml`

**For Web:**
- Click "New Service" → "Deploy from GitHub repo"
- Select this repository
- Root Directory: `/` (CRITICAL!)
- Builder: Nixpacks (auto-detected)
- Config File: `apps/web/railway.toml`

**For Analytics:**
- Click "New Service" → "Deploy from GitHub repo"
- Select this repository
- Root Directory: `/` (CRITICAL!)
- Builder: Nixpacks (auto-detected)
- Config File: `apps/analytics-service/railway.toml`

### Step 3: Configure Environment Variables

#### API Service Environment Variables

```bash
# Database
DATABASE_URL=(Click "Ref" button to link to PostgreSQL service)

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=(generate a strong random string)
LOG_LEVEL=info

# Optional
REDIS_URL=(if using Redis for caching)
```

#### Web Service Environment Variables

```bash
# API Connection
NEXT_PUBLIC_API_URL=(API service Railway URL)
API_URL=(API service Railway URL - internal)

# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=(Web service Railway URL)

# Optional
NEXT_PUBLIC_SENTRY_DSN=(for error tracking)
```

#### Analytics Service Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3002
LOG_LEVEL=info

# Database
DATABASE_URL=(Click "Ref" button to link to PostgreSQL service)
```

### Step 4: Deployment Order

Deploy in this order to satisfy dependencies:

1. ✅ **PostgreSQL** - Database (no dependencies)
2. ✅ **API** - Depends on PostgreSQL
3. ✅ **Web** - Depends on API
4. ✅ **Analytics** - Depends on PostgreSQL

### Step 5: Verify Deployment

For each service:

**Check Build Logs:**
- Railway Dashboard → Service → Deployments
- Look for successful build messages
- Check for errors or warnings

**Check Health Status:**
- Green indicator = Healthy
- Yellow indicator = Starting
- Red indicator = Failed

**Test Endpoints:**

```bash
# API
curl https://api-name-production.up.railway.app/health
# Expected: {"status":"healthy",...}

# Web
curl https://web-name-production.up.railway.app/
# Expected: HTML page

# Analytics
curl https://analytics-name-production.up.railway.app/health
# Expected: {"status":"healthy",...}
```

---

## Troubleshooting

### Build Fails: "Root Directory Incorrect"

**Symptom:** Error about packages not found or workspace resolution errors

**Solution:**
1. Go to Railway Dashboard → Service → Settings
2. Find "Root Directory" field
3. Change from `apps/api` (or `apps/web`, etc.) to `/`
4. Click "Redeploy"

### Build Fails: "esbuild not found"

**Symptom:** Build script fails with "esbuild: command not found"

**Solution:**
This should be fixed by moving esbuild to devDependencies. If issue persists:

1. Check `apps/api/package.json`
2. Verify esbuild is in `devDependencies` section
3. Ensure Railway is using the latest commit
4. Redeploy

### Build Fails: "pnpm command not found"

**Symptom:** Build fails early with pnpm errors

**Solution:**
1. Check `nixpacks.toml` for correct pnpm setup
2. Verify `corepack enable && corepack prepare pnpm@9.10.0 --activate` is in `[phases.setup]`
3. Redeploy

### Health Check Fails

**Symptom:** Service starts but health check fails repeatedly

**Solution:**

**Check logs:**
- Railway Dashboard → Service → Logs
- Look for application errors

**Common issues:**

1. **Port not set:**
   - Verify PORT environment variable is configured
   - For API: `PORT=3001`
   - For Web: `PORT=3000`
   - For Analytics: `PORT=3002`

2. **Database connection failed:**
   - Verify DATABASE_URL is referencing PostgreSQL service
   - Click the "Ref" button next to DATABASE_URL input
   - Wait for PostgreSQL to be fully deployed first

3. **Missing environment variables:**
   - Review required variables for each service
   - Add missing variables and redeploy

### Changes Don't Take Effect

**Symptom:** You make changes to code but Railway doesn't reflect them

**Solution:**
Nixpacks should handle this automatically. If issues persist:

1. Click "Redeploy" in Railway Dashboard
2. Or use CLI: `railway up --service=api`
3. Check that latest commit is deployed
4. Verify changes are in the branch Railway is tracking

### Service Crashes on Startup

**Symptom:** Service starts then immediately crashes

**Solution:**

1. **Check application logs** for stack traces
2. **Common causes:**
   - Missing environment variables
   - Database not ready (wait for PostgreSQL)
   - Incorrect build output
   - Missing runtime dependencies

3. **Fixes:**
   - Add missing environment variables
   - Rebuild after PostgreSQL is ready
   - Verify build completed successfully
   - Check nixpacks.toml for missing nixPkgs

---

## Railway CLI Commands

```bash
# List all services
railway services

# View logs for a service
railway logs --service api

# Redeploy a service
railway up --service api

# Open service in dashboard
railway open

# Add environment variable
railway variables set JWT_SECRET=your-secret-here --service api

# View environment variables
railway variables --service api

# Execute command in service (debugging)
railway run "pnpm -F @maatwork/api typecheck" --service api
```

---

## Post-Deployment Checklist

### API Service
- [ ] Build completes successfully
- [ ] Health check passes (green indicator)
- [ ] Can access `/health` endpoint
- [ ] Database connection working (check logs)
- [ ] Can authenticate (test JWT flow)
- [ ] API endpoints respond correctly

### Web Service
- [ ] Build completes successfully
- [ ] Health check passes (green indicator)
- [ ] Homepage loads in browser
- [ ] Can navigate to main pages
- [ ] API calls work from frontend
- [ ] No console errors in browser

### Analytics Service
- [ ] Build completes successfully
- [ ] Health check passes (green indicator)
- [ ] Can access `/health` endpoint
- [ ] `/docs` endpoint shows Swagger UI
- [ ] Can fetch prices via API
- [ ] Database connection working

---

## Maintenance

### Viewing Logs

```bash
# Via CLI (real-time)
railway logs --service api

# Via CLI (last 100 lines)
railway logs --service api -n 100

# Via Dashboard
Railway Dashboard → Service → Logs
```

### Monitoring Resources

- Go to Railway Dashboard → Service → Metrics
- Monitor CPU, Memory, and Network usage
- Set up alerts if needed

### Rolling Back Deployments

```bash
# View deployment history
railway deployments --service api

# Redeploy a specific version
railway up --service api --commit <commit-sha>
```

### Updating Services

```bash
# Pull latest changes
git pull origin main

# Redeploy to Railway
railway up --service api
railway up --service web
railway up --service analytics
```

---

## Cost Optimization

Railway pricing is usage-based. To optimize costs:

1. **Scale down unused services** in development
2. **Use environment variables** to enable/disable features
3. **Set appropriate timeouts** for background jobs
4. **Monitor resource usage** and adjust as needed

---

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Project Docs:** `docs/RAILWAY_DEPLOYMENT_FIX.md`

---

**Last Updated:** 2026-02-24
**Branch:** feature/railway-migration
