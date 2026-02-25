# Railway Deployment Strategy - Implementation Summary

## Changes Made

This document summarizes all changes made to fix Railway deployment issues for the MaatWork monorepo.

### 1. Fixed esbuild Dependency Issue ✅

**File:** `apps/api/package.json`

**Problem:** esbuild was incorrectly listed as a `dependency` instead of `devDependency`, causing "esbuild not found" errors during Railway builds.

**Changes:**
- Moved `"esbuild": "^0.27.1"` from `dependencies` to `devDependencies`
- Fixed build script reference from `node scripts/build.js` to `node scripts/build.mjs` (the actual file name)

**Why:** esbuild is a build-time tool, not a runtime dependency. Railway's build process installs devDependencies but production deployments don't need them in the runtime bundle.

---

### 2. Created Nixpacks Configurations ✅

Nixpacks is Railway's recommended build system that auto-detects project types and handles dependencies more reliably than custom Dockerfiles.

#### API Service (Express.js)
**File:** `apps/api/nixpacks.toml`

```toml
[phases.build]
cmds = [
  "corepack enable && corepack prepare pnpm@9.10.0 --activate",
  "pnpm install --frozen-lockfile"
]

[phases.build.nixPkgs]
nodejs = "22"

[phases.start]
cmds = [
  "pnpm -F @maatwork/api build",
  "pnpm -F @maatwork/api start"
]

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
```

#### Web Service (Next.js 15)
**File:** `apps/web/nixpacks.toml`

```toml
[phases.setup]
cmds = ["corepack enable && corepack prepare pnpm@9.10.0 --activate"]

[phases.build]
cmds = [
  "pnpm install --frozen-lockfile",
  "pnpm -F @maatwork/web build"
]

[phases.start]
cmds = ["pnpm -F @maatwork/web start"]

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 300
```

#### Analytics Service (Python FastAPI)
**File:** `apps/analytics-service/nixpacks.toml`

```toml
[phases.setup]
nixPkgs = ["python311", "gcc", "g++", "curl"]

[phases.build]
cmds = ["pip install --no-cache-dir -r requirements.txt"]

[phases.start]
cmds = ["uvicorn main:app --host 0.0.0.0 --port $PORT"]

[deploy]
healthcheckPath = "/health"
```

---

### 3. Updated Railway.toml Files ✅

All `railway.toml` files now use Nixpacks builder instead of Dockerfiles.

**API:** `apps/api/railway.toml`
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
```

**Web:** `apps/web/railway.toml`
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "pnpm -F @maatwork/web start"
healthcheckPath = "/"
```

**Analytics:** `apps/analytics-service/railway.toml`
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
```

---

## Railway Deployment Procedure

### Step 1: Configure Railway Services

For each service (API, Web, Analytics):

1. **Root Directory:** Set to `/` (NOT `apps/`)
   - This is critical for monorepo builds to access shared packages

2. **Builder:** Railway will auto-detect Nixpacks from `nixpacks.toml`
   - Or manually select "Nixpacks" if needed

3. **Environment Variables:**
   ```env
   # Common
   NODE_ENV=production
   PORT=3000  (or 3001 for API, 3002 for Analytics)

   # Database
   DATABASE_URL=(reference PostgreSQL service)

   # API
   JWT_SECRET=...

   # Web
   NEXT_PUBLIC_API_URL=...
   ```

### Step 2: Deployment Order

Deploy in dependency order:

1. **PostgreSQL** (first, already deployed)
2. **API** (depends on DB)
3. **Web** (depends on API)
4. **Analytics** (depends on DB)

### Step 3: Verify Deployment

For each service:
- Check logs in Railway dashboard
- Verify health check passes (green indicator)
- Test endpoints via browser or curl

---

## Benefits of This Approach

### ✅ Nixpacks vs Dockerfiles

| Feature | Nixpacks | Dockerfiles |
|---------|-----------|-------------|
| Cache management | Automatic, no cache busting needed | Manual cache busting required |
| Build speed | Faster (optimized for common stacks) | Slower (full rebuilds) |
| Configuration | Declarative, simple | Complex multi-stage builds |
| Monorepo support | Native workspace handling | Manual symlinking |
| Updates | Auto-detects changes | Requires force rebuild |

### ✅ esbuild Fix

- **Before:** esbuild missing during Railway build → deployment fails
- **After:** esbuild available during build, not in runtime → correct and faster

---

## Known Issues

### Pre-existing Type Error (Not Related to Changes)

The web app has a pre-existing TypeScript error in `proxy.ts`:
```
proxy.ts(34,33): error TS2339: Property 'href' does not exist on type 'string'.
```

This is unrelated to Railway deployment and should be fixed separately.

---

## Troubleshooting

### Build Fails: "Root Directory Incorrect"

**Symptom:** Error about packages not found
**Solution:** Set Root Directory to `/` in Railway dashboard (not `apps/`)

### Build Fails: "esbuild not found"

**Symptom:** Build script fails
**Solution:** Verify esbuild is in `devDependencies` in `apps/api/package.json`

### Build Fails: "Cache Issues"

**Symptom:** Changes don't take effect
**Solution:** With Nixpacks, this should be automatic. If issues persist, click "Redeploy" in Railway dashboard

### Health Check Fails

**Symptom:** Service starts but health check fails
**Solution:** Check logs for actual error, verify PORT environment variable is set

---

## Next Steps for User

1. **Commit these changes:**
   ```bash
   git add apps/api/package.json
   git add apps/api/nixpacks.toml
   git add apps/web/nixpacks.toml
   git add apps/analytics-service/nixpacks.toml
   git add apps/*/railway.toml
   git commit -m "Fix Railway deployment: Use Nixpacks, fix esbuild deps"
   ```

2. **Deploy to Railway:**
   - Delete failed services (keep PostgreSQL)
   - Create new services using the new configuration
   - Set Root Directory to `/` for each service
   - Configure environment variables

3. **Monitor deployment:**
   - Watch build logs for each service
   - Verify health checks pass
   - Test functionality end-to-end

---

## Files Modified/Created

### Modified
- `apps/api/package.json` - Fixed esbuild dependency location

### Created
- `apps/api/nixpacks.toml` - Nixpacks config for API
- `apps/web/nixpacks.toml` - Nixpacks config for Web
- `apps/analytics-service/nixpacks.toml` - Nixpacks config for Analytics

### Updated (rewritten)
- `apps/api/railway.toml` - Changed to use Nixpacks
- `apps/web/railway.toml` - Changed to use Nixpacks
- `apps/analytics-service/railway.toml` - Changed to use Nixpacks

---

## Why This Strategy?

1. **Nixpacks is Railway's recommended approach** - Better cache handling, simpler config
2. **esbuild as devDependency** - Correct semantic usage, reduces bundle size
3. **Root Directory = /** - Critical for monorepo to access shared packages
4. **Sequential deployment** - Ensures dependencies are available when needed

---

**Generated:** 2026-02-24
**Branch:** feature/railway-migration
**Changes:** 6 files modified/created
