# Deployment Guide - Vercel + Render + Neon

This document covers the deployment infrastructure and procedures for MaatWork on the new 100% free architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA 100% GRÁTIS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🌐 Vercel (Web)  ──→  🔧 Render (API)  ──→  🗃️ Neon (DB)    │
│      Next.js 15          Express.js            PostgreSQL       │
│      $0/mes               $0/mes                $0/mes          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Platform | Technology | URL | Notes |
|---------|----------|------------|-----|-------|
| Web | Vercel | Next.js 15 | https://maatwork.vercel.app | Auto-deploy on push |
| API | Render | Express.js | https://maatwork-api.onrender.app | Free tier - sleeps after 15min |
| Database | Neon | PostgreSQL | Internal only | Serverless - scale to zero |

## Initial Setup

### 1. Create Neon Database

```bash
# 1. Go to https://console.neon.tech → New Project

# 2. Configure:
Name: maatwork-db
Region: US East (Ohio)
Version: PostgreSQL 15

# 3. Copy the DATABASE_URL
# Format: postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/maatwork?sslmode=require
```

### 2. Create Render API Service

```bash
# 1. Go to https://dashboard.render.com → New → Web Service

# 2. Connect GitHub repository

# 3. Configure:
Name: maatwork-api
Region: Oregon
Branch: main
Runtime: Node
Build Command: pnpm install && pnpm --filter @maatwork/api build
Start Command: node apps/api/dist/index.js
Instance Type: Free

# 4. Add environment variables:
DATABASE_URL=[Neon connection string]
NODE_ENV=production
PORT=10000
NEXT_PUBLIC_APP_URL=https://maatwork.vercel.app

# OR use render.yaml (auto-detected):
# The project includes render.yaml in the root
```

### 3. Create Vercel Web App

```bash
# 1. Go to https://vercel.com/new

# 2. Import GitHub repository

# 3. Configure:
Framework Preset: Next.js
Root Directory: apps/web

# 4. Add environment variables:
NEXT_PUBLIC_API_URL=https://maatwork-api.onrender.app
```

### 4. Configure GitHub Actions Secrets

```
Settings → Secrets and variables → Actions

VERCEL_TOKEN=[from vercel.com/account/tokens]
VERCEL_ORG_ID=[from Vercel dashboard → Settings → General]
VERCEL_PROJECT_ID=[from Vercel dashboard → Settings → General]
RENDER_API_KEY=[from render.com/account/api-keys]
RENDER_SERVICE_ID=[from Render dashboard URL: render.com/web/srv-{SERVICE_ID}]
DATABASE_URL=[from Neon console]
```

## Deployment Methods

### Automatic (GitHub Actions)

Push to `main`/`master` triggers automatic deployment:

```bash
git push origin main
```

The workflow `.github/workflows/deploy.yml` will:
1. Run lint, typecheck, and tests
2. Build all packages
3. Deploy to Vercel (Web)
4. Deploy to Render (API)
5. Run database migrations
6. Verify all services

### Manual

```bash
# Web (Vercel)
cd apps/web
vercel --prod

# API (Render)
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys"
```

## Verification

```bash
# Check Web
curl https://maatwork.vercel.app

# Check API Health
curl https://maatwork-api.onrender.app/health

# Check API with DB
curl https://maatwork-api.onrender.app/ready
```

## Database Migrations

### Local Development

```bash
# Generate migration
cd apps/api
npx prisma migrate dev --name migration_name

# Apply migration
npx prisma migrate deploy
```

### Production (CI/CD)

Migrations run automatically after each deploy via GitHub Actions.

```yaml
# See .github/workflows/deploy.yml - Job "migrate-db"
- name: 🗃️ Run Prisma Migrations
  run: |
    cd apps/api
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Rollback

### Vercel

```bash
vercel rollback [deployment-url]
```

Or from Dashboard: Project → Deployments → ... → Rollback

### Render

From Dashboard: Service → Releases → Rollback

### Neon

Neon maintains automatic backups.

From Console: Project → Backups → Restore

## Troubleshooting

### Web doesn't load
1. Verify NEXT_PUBLIC_API_URL is set in Vercel
2. Check Vercel logs in Dashboard
3. Verify API is running

### API returns 503
1. Verify DATABASE_URL is set in Render
2. Verify /health endpoint responds
3. Service may be sleeping (wait 30-60s)
4. Check Render Dashboard logs

### Database connection error
1. Verify DATABASE_URL is correct (format: postgres://...neon.tech/...?sslmode=require)
2. Verify IP is not blocked (Neon allows all by default)
3. If DB is paused (scale-to-zero), first connection takes longer
4. Check Neon Console logs

## Limits and Considerations

### Vercel (Free)
- 100GB bandwidth/month
- 100 deploys/day
- Edge Network automatic

### Render (Free)
- 750 hours/month
- **Service hibernates after 15 min of inactivity**
- First request after hibernation: 30-60 seconds

### Neon (Free)
- 0.5GB storage
- 100 CU-hrs/month
- **Scale-to-zero**: DB pauses after 5 min of inactivity
- Wake-up time: 1-2 seconds

## Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | $0/month |
| Render | Free | $0/month |
| Neon | Free | $0/month |
| **Total** | | **$0/month** |
