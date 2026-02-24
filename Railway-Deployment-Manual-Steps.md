# Railway Deployment - Current Status & Manual Steps Required

## Completed via CLI

✅ Railway CLI installed and linked to project `maatwork`
✅ PostgreSQL database service already exists in Railway
✅ API service created in Railway (though currently failing)
✅ Configuration files created:
   - `apps/api/Dockerfile` - Updated to include scripts directory
   - `apps/web/Dockerfile` - Updated to include scripts directory
   - `apps/analytics-service/Dockerfile` - Created new Dockerfile for Python FastAPI
   - `apps/api/railway.toml` - Railway configuration for API service
   - `apps/web/railway.toml` - Railway configuration for Web service
   - `apps/analytics-service/railway.toml` - Railway configuration for Analytics service
   - `apps/analytics-service/package.json` - Fixed to remove broken install script

✅ All configuration changes committed to git and pushed to `feature/railway-migration` branch

## Current Issue (Blocked on CLI)

❌ **Railway deployment is stuck using a cached/broken Docker build**

**Symptom:** API service deployment fails repeatedly with:
```
Error: Cannot find module '/app/scripts/install-python-deps.js'
```

**Root Cause:** Railway is NOT pulling the latest code from GitHub. The deployment is using an old cached Dockerfile that references a package.json which has already been fixed locally.

**Attempted CLI Fixes (FAILED):**
- Set `RAILWAY_DOCKERFILE_PATH=/apps/api/Dockerfile` ✓ (not taking effect)
- Set `BUILD_COMMAND` and `START_COMMAND` environment variables ✓ (not taking effect)
- Modified Dockerfiles to include scripts directory ✓ (not being used)
- Fixed analytics-service package.json ✓ (not being pulled)
- Added `NO_CACHE=1` environment variable ✓ (not clearing cache)
- Multiple redeploy commands executed ✓ (using old code)
- Multiple new commits pushed ✓ (not triggering new deployment)

**Diagnosis:** This is a known Railway cache issue where the platform continues to use cached Docker layers despite configuration changes. The CLI does not have the capability to force a complete cache clear for this specific case.

## Required Manual Steps (Railway Web UI)

You need to complete these steps in the Railway web dashboard:

### Step 1: Access Railway Dashboard
1. Go to: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44
2. Log in to your Railway account

### Step 2: Configure API Service
1. Click on the `api` service
2. Go to the **Settings** tab
3. Verify/Update these settings:
   - **Root Directory**: Leave EMPTY (not `/apps/api`)
   - **Builder**: Should be `Dockerfile`
   - **Config as Code Path**: Should show `/apps/api/railway.toml` (or verify it's using Dockerfile)

### Step 3: Clear Cache and Redeploy API
1. In the API service, click on **Deployments** tab
2. Find the latest deployment and click **Add** (or click **Redeploy**)
3. **CRITICAL**: Before clicking Deploy, click on **Settings** tab → **Variables**
4. Verify `NO_CACHE` is set to `1` (if not, add it)
5. Optionally add `RAILWAY_FORCE_NO_CACHE=1` if available
6. Go back to **Deployments** tab and click **New Deployment** (or Redeploy)
7. Wait for build to complete and verify it uses the new Dockerfile

### Step 4: Check API Deployment Logs
1. Once deployment starts, click on **Logs** tab
2. Verify you see:
   - `Using detected Dockerfile!` message
   - `pnpm install` running successfully
   - No error about `/app/scripts/install-python-deps.js`
3. If deployment succeeds, verify service status shows **Running** 🟢

### Step 5: Add Web Service
1. Click **New Service** → **GitHub**
2. Select repository: `Gigisanta/MaatWork`
3. Select branch: `feature/railway-migration`
4. Service name: `web`
5. Click **Add Service**

### Step 6: Configure Web Service
1. In the new `web` service, go to **Settings** tab
2. Verify settings:
   - **Root Directory**: Leave EMPTY
   - **Builder**: Should be `Dockerfile`
3. Click **Deployments** tab → **New Deployment**

### Step 7: Add Analytics Service (Optional)
1. Click **New Service** → **GitHub**
2. Select repository: `Gigisanta/MaatWork`
3. Select branch: `feature/railway-migration`
4. Service name: `analytics`
5. Click **Add Service**

### Step 8: Configure Analytics Service
1. In the new `analytics` service, go to **Settings** tab
2. Verify settings:
   - **Root Directory**: Leave EMPTY
   - **Builder**: Should be `Dockerfile` (will use `/apps/analytics-service/Dockerfile`)
3. Click **Deployments** tab → **New Deployment**

## Environment Variables Configuration

### API Service Variables
After API is deployed, configure these variables in **Variables** tab:

1. **DATABASE_URL**
   - Click **New Variable**
   - Name: `DATABASE_URL`
   - Click **Ref** button and select `Postgres` service
   - This should auto-fill: `${postgres.DATABASE_URL}`

2. **JWT_SECRET**
   - Name: `JWT_SECRET`
   - Value: Generate a secure random string (32+ characters)
   - Type: Set to **Secret** (🔒)
   - Example value (DO NOT use in production): `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

3. **PORT**
   - Name: `PORT`
   - Value: `3001`
   - Type: Plain

4. **NODE_ENV**
   - Name: `NODE_ENV`
   - Value: `production`
   - Type: Plain

5. **CORS_ORIGINS**
   - Name: `CORS_ORIGINS`
   - Value: `https://maat.work,https://api.maat.work`
   - Type: Plain

### Web Service Variables
After Web is deployed, configure these variables in **Variables** tab:

1. **NEXT_PUBLIC_API_URL**
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://api.maat.work` (or use Railway-generated URL)
   - Type: Plain

2. **NEXT_PUBLIC_ENABLE_ANALYTICS**
   - Name: `NEXT_PUBLIC_ENABLE_ANALYTICS`
   - Value: `false`
   - Type: Plain

3. **NODE_ENV**
   - Name: `NODE_ENV`
   - Value: `production`
   - Type: Plain

## Custom Domains (After All Services Deployed)

### Add Domain for API
1. Go to `api` service → **Settings** → **Networking** → **Public Networking**
2. Click **+ Custom Domain**
3. Domain: `api.maat.work`
4. Click **Add Domain**
5. **Copy the DNS value** shown by Railway (e.g., `xxx.up.railway.app`)
6. Go to your domain registrar (where you bought maat.work)
7. Add DNS record:
   - Type: `CNAME`
   - Name: `api`
   - Value: `[paste Railway's DNS value]`
   - TTL: 300

### Add Domain for Web
1. Go to `web` service → **Settings** → **Networking** → **Public Networking**
2. Click **+ Custom Domain**
3. Domain: `maat.work` (root domain)
4. Click **Add Domain**
5. **Copy the DNS value** shown by Railway
6. Go to your domain registrar
7. Add DNS record:
   - Type: `CNAME` (or `A` if Railway provides IP)
   - Name: `@` (for root domain)
   - Value: `[paste Railway's DNS value]`
   - TTL: 300

**Note:** DNS propagation can take 5-30 minutes (up to 48 hours for some TLDs).

## Database Migrations

After API service is successfully deployed with DATABASE_URL configured:

1. **Manual Migration (via Railway CLI):**
   ```bash
   railway service link api
   railway exec --service api "pnpm -F @maatwork/db migrate"
   ```

2. **Or configure preDeployCommand:**
   - In Railway dashboard for API service
   - Go to **Settings** → **Deploy**
   - Set **Pre-Deploy Command**: `pnpm -F @maatwork/db migrate`

## Verification Steps

After all services are deployed and domains are configured:

1. **Health Checks:**
   - API: Visit `https://api.maat.work/health` → Should return 200 OK
   - Web: Visit `https://maat.work/` → Should load the Next.js app
   - Analytics: Visit `https://[your-analytics-domain]/health` → Should return healthy status

2. **Test End-to-End:**
   - Try to create a user account on https://maat.work
   - Try to login to the app
   - Try to create a contact or perform other actions
   - Verify API calls are working (check browser DevTools Network tab)

3. **Check Logs:**
   - Go to each service → **Logs** tab
   - Verify no errors are present
   - Look for successful startup messages

## Troubleshooting Common Issues

### Issue: Service fails to start after deployment
**Solution:** Check the **Logs** tab for the specific error. Common causes:
- Missing environment variables
- Database connection failed (DATABASE_URL not configured)
- Port conflicts
- Build errors

### Issue: Custom domains show "Pending" status
**Solution:**
1. Verify DNS records are correctly configured at your domain registrar
2. Wait for DNS propagation (use https://dnschecker.org/ to verify)
3. Verify SSL certificate shows "Issued" (not "Pending")
4. If stuck for >1 hour, try removing and re-adding the domain

### Issue: API can't connect to database
**Solution:**
1. Go to API service → **Variables** tab
2. Verify `DATABASE_URL` has the Ref button linking to `postgres` service
3. If missing, delete the variable and add it again using the Ref button

## Next Steps

Once all services are running and healthy:

1. Test the complete application flow
2. Monitor logs for any issues
3. Set up monitoring/alerts if needed
4. Configure backup strategy (Railway includes automatic backups for PostgreSQL)

## Summary

- ✅ All configuration files are ready and committed
- ✅ Railway CLI is linked and can manage services
- ⚠️ **Manual intervention required in Railway web UI** to clear cache and complete deployments
- ⚠️ Web and Analytics services still need to be created via Railway web UI
- ⚠️ Environment variables need to be configured
- ⚠️ Custom domains need to be configured
- ⚠️ DNS records need to be added
- ⚠️ Database migrations need to be run

**What I did:** Created all necessary configuration files (Dockerfiles, railway.toml files, fixed package.json, set up Railway CLI connection, committed all changes).

**What you need to do:** Access Railway web dashboard (https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44) and follow the "Required Manual Steps" section above to complete the deployment.

---

**Project:** maatwork
**Railway Project ID:** 8156c542-b896-48b8-afd0-192602b02d44
**Documentation created:** 2026-02-24
