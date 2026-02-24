# Railway GitHub Integration Setup Guide

## Overview

Railway has **built-in GitHub integration** for automatic deployments - this is the recommended approach, not GitHub Actions workflows.

## Setup Steps

### 1. Connect GitHub Repository to Railway

1. Go to: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44
2. Click "New Service" → "GitHub"
3. Click "Connect a repository"
4. Select: `Gigisanta/MaatWork`
5. Select branch: `master` (or `feature/railway-migration`)
6. Click "Deploy"

This will create services automatically from GitHub with proper build configuration.

### 2. Configure Services

After connecting GitHub, Railway will create services automatically:

**API Service:**
- Root Directory: `.` (repo root)
- Builder: Dockerfile
- Build Command: `pnpm run build --filter=@maatwork/api`
- Start Command: `node apps/api/dist/index.js`

**Web Service:**
- Root Directory: `.` (repo root)
- Builder: Dockerfile
- Build Command: `pnpm run build --filter=@maatwork/web`
- Start Command: `node apps/web/server.js`

### 3. Add PostgreSQL Database

**Via Dashboard:**
1. Click "New Service" → "Database" → "PostgreSQL"
2. Service name: `maatwork-db`
3. Click "Create Database"

**Via CLI (non-interactive):**
```bash
# Create database service
railway add --service maatwork-db --database postgres
```

### 4. Configure Environment Variables

**API Service:**
```bash
# Reference PostgreSQL database
railway variable --service maatwork-api set DATABASE_URL

# Set other variables
railway variable --service maatwork-api set PORT=3001
```

**Web Service:**
```bash
# Set API URL (get from Railway dashboard after API is deployed)
railway variable --service maatwork-web set NEXT_PUBLIC_API_URL=https://<api-domain>
```

### 5. Configure Custom Domains

**API Domain (api.maat.work):**
```bash
railway domain --service maatwork-api api.maat.work
```

**Web Domain (maat.work):**
```bash
railway domain --service maatwork-web maat.work
```

Then add DNS records to Cloudflare:
- **API**: CNAME `api` → Railway value
- **Web**: CNAME `@` → Railway value

### 6. Remove Manual GitHub Actions Workflow

Since Railway handles deployments automatically:

```bash
rm .github/workflows/deploy-railway.yml
git add .github/workflows/deploy-railway.yml
git commit -m "chore: remove manual GitHub Actions workflow (using Railway native integration)"
git push
```

## Final Verification

After setup, verify automatic deployment works:

```bash
# Make a small change
echo "# test" >> apps/api/README.md

# Commit and push
git add apps/api/README.md
git commit -m "test: verify automatic deployment"
git push origin master
```

Then check Railway dashboard - deployment should start automatically.

## Benefits of Railway Native Integration

1. **Zero Configuration** - No GitHub Actions workflow needed
2. **Automatic Detection** - Detects Dockerfile and builds automatically
3. **Instant Deployment** - Deploys on every push to configured branch
4. **Built-in Logs** - View build and runtime logs in Railway dashboard
5. **One-Click Rollbacks** - Instant rollback to previous deployment

## CLI Reference for Non-Interactive Setup

```bash
# Link project
railway link 8156c542-b896-48b8-afd0-192602b02d44

# Set variables (non-interactive)
railway variable --service <service> set KEY=value

# Add domain (non-interactive)
railway domain --service <service> <domain>

# Deploy (non-interactive)
railway up . --detach

# Get service status
railway service status --all
```
