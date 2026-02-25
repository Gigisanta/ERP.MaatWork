# Railway Deployment - Quick Reference Guide

## Production Status

✅ **DEPLOYED**: https://maatwork-production.up.railway.app

## Prerequisites

Before deploying to Railway, ensure you have:
- ✅ Railway account with project created
- ✅ Railway CLI installed (optional but recommended)
- ✅ All code committed to git repository

## Current Configuration (Web Only)

| Setting | Value |
|---------|-------|
| Root Directory | `/` |
| Builder | Nixpacks (auto-detected) |
| Build Command | `pnpm install --frozen-lockfile && pnpm -F @maatwork/types build && pnpm -F @maatwork/utils build && pnpm -F @maatwork/logger build && pnpm -F @maatwork/db build && pnpm -F @maatwork/ui build && pnpm -F @maatwork/web build` |
| Start Command | `pnpm -F @maatwork/web start` |
| Port | 3000 (auto-detected from PORT env var) |

> **NOTE**: Only the Next.js web app is deployed to Railway. The API and analytics services run locally or in a separate environment.

---

## Deployment Procedure

### Option 1: Push to GitHub (Recommended)

```bash
# Push to feature/railway-migration branch
git push origin feature/railway-migration
```

Railway will automatically detect the push and start deployment.

### Option 2: Using Railway CLI

```bash
# Trigger deployment
railway up --detach

# Or redeploy latest
railway redeploy --yes
```

---

## Service Configuration Summary

| Service | Status | Root Directory | Notes |
|---------|--------|-----------------|-------|
| Web (Next.js) | ✅ Active | `/` | Only service deployed to Railway |
| API (Express) | ❌ Not deployed | - | Runs locally or separate env |
| Analytics (Python) | ❌ Not deployed | - | Runs locally or separate env |
| PostgreSQL | Optional | - | Can be added if needed |

---

## Troubleshooting

### Build Fails: "Root Directory Incorrect"

**Symptom:** Error about packages not found or workspace resolution errors

**Solution:**
1. Go to Railway Dashboard → Service → Settings
2. Find "Root Directory" field
3. Change from `apps/api` (or `apps/web`, etc.) to `/`
4. Click "Redeploy"

### Error: 502 Application failed to respond

**Symptom:** Build succeeds but app doesn't respond

**Solution:**
1. **Check start command**: Must be `pnpm -F @maatwork/web start`
2. **Check PORT**: Should be set to 3000 (or let Railway auto-detect)
3. **DO NOT use standalone mode**: Setting `output: 'standalone'` in next.config causes 502 errors
4. Check build logs for completion

### Build Fails: "pnpm command not found"

**Symptom:** Build fails early with pnpm errors

**Solution:**
1. Check that Railway detects pnpm automatically
2. Verify `corepack enable && corepack prepare pnpm@9.10.0 --activate` is in build config
3. Redeploy

### Health Check Fails

**Symptom:** Service starts but health check fails repeatedly

**Solution:**

**Check logs:**
- Railway Dashboard → Service → Logs
- Look for application errors

**Common issues:**

1. **Port not set:**
   - Verify PORT environment variable is configured (should be 3000)
   - Railway auto-detects PORT from the start command

2. **Missing environment variables:**
   - Review required variables for each service
   - Add missing variables and redeploy

3. **Standalone mode issues:**
   - If you set `output: 'standalone'` in next.config.js, remove it
   - Use standard `next start` instead

### Changes Don't Take Effect

**Symptom:** You make changes to code but Railway doesn't reflect them

**Solution:**
1. Click "Redeploy" in Railway Dashboard
2. Or use CLI: `railway up --detach`
3. Check that latest commit is deployed

---

## Railway CLI Commands

```bash
# Trigger new deployment
railway up --detach

# Redeploy latest
railway redeploy --yes

# View logs
railway logs --lines 100

# Open dashboard
railway open

# Check status
railway status

# List deployments
railway deployment list

# Get domain
railway domain
```

---

## Post-Deployment Checklist

- [x] Build completes successfully
- [x] Homepage loads (https://maatwork-production.up.railway.app)
- [x] No 502 errors

---

## Maintenance

### Viewing Logs

```bash
# Via CLI (real-time)
railway logs

# Via CLI (last 100 lines)
railway logs --lines 100

# Via Dashboard
Railway Dashboard → Service → Logs
```

### Updating Services

```bash
# Pull latest changes
git pull origin feature/railway-migration

# Push to trigger deployment
git push origin feature/railway-migration
```

---

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway

---

**Last Updated:** 2026-02-25
**Branch:** feature/railway-migration
**URL:** https://maatwork-production.up.railway.app
