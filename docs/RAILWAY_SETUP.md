# Railway Deployment Setup Guide

## Current Status

✅ Dockerfiles created for API and Web
✅ Railway.json configuration added
✅ GitHub Actions workflow created
✅ Build configuration working (packages compile successfully)
✅ Project created on Railway: `8156c542-b896-48b8-afd0-192602b02d44`

## Remaining Setup Steps (Manual)

### 1. Add PostgreSQL Database

**Via Railway Dashboard:**
1. Go to: https://railway.com/project/8156c542-b896-48b8-afd0-192602b02d44
2. Click "New Service" button
3. Select "Database" → "PostgreSQL"
4. Click "Create Database"

### 2. Create Services in Dashboard

**API Service:**
1. Click "New Service" button
2. Select "Dockerfile"
3. Service name: `maatwork-api`
4. Click "Create Service"

**Web Service:**
1. Click "New Service" button
2. Select "Dockerfile"
3. Service name: `maatwork-web`
4. Click "Create Service"

### 3. Deploy Services via CLI

After services are created in dashboard, deploy using:

```bash
# Deploy API
railway link 8156c542-b896-48b8-afd0-192602b02d44
railway service link maatwork-api
railway up . --path-as-root --detach

# Deploy Web
railway service link maatwork-web
railway up . --path-as-root --detach
```

### 4. Configure Environment Variables

**API Service:**
1. Go to `maatwork-api` service → "Variables" tab
2. Click "Reference" button next to `DATABASE_URL` field
3. Select the PostgreSQL database
4. Add any additional required variables

**Web Service:**
1. Go to `maatwork-web` service → "Variables" tab
2. Set `NEXT_PUBLIC_API_URL` to the Railway API URL
3. Add any other required environment variables

### 5. Configure Custom Domains

**API Domain (api.maat.work):**
1. Go to `maatwork-api` service → "Settings" tab
2. Click "Domains" → "Add Domain"
3. Enter: `api.maat.work`
4. Railway will show required DNS records
5. Add these records to Cloudflare DNS:
   - Type: CNAME
   - Name: api
   - Target: `<value from Railway>`

**Web Domain (maat.work):**
1. Go to `maatwork-web` service → "Settings" tab
2. Click "Domains" → "Add Domain"
3. Enter: `maat.work`
4. Add DNS records to Cloudflare:
   - Type: CNAME
   - Name: @ (root)
   - Target: `<value from Railway>`

### 6. Setup GitHub Secrets

Add these secrets to your GitHub repository:

```
RAILWAY_TOKEN=your_railway_token
RAILWAY_PROJECT_ID=8156c542-b896-48b8-afd0-192602b02d44
```

Get your Railway token: https://railway.com/account/tokens

### 7. Update GitHub Workflow

Edit `.github/workflows/deploy-railway.yml`:

```yaml
env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  RAILWAY_PROJECT_ID: ${{ secrets.RAILWAY_PROJECT_ID }}
```

Update `RAILWAY_PROJECT_ID` to: `8156c542-b896-48b8-afd0-192602b02d44`

### 8. Merge to Master

Once everything is set up:

```bash
git checkout master
git merge feature/railway-migration
git push origin master
```

This will trigger automatic deployments via GitHub Actions.

## Testing After Deployment

1. Check API health: `https://api.maat.work/health`
2. Check web app: `https://maat.work`
3. Run smoke tests if configured
4. Verify database connectivity

## Troubleshooting

### Build Failures
- Check build logs in Railway dashboard
- Ensure `railway.json` has correct build command
- Verify all dependency packages are built

### Runtime Errors
- Check `DATABASE_URL` is properly referenced
- Verify all environment variables are set
- Check logs in Railway dashboard

### Domain Issues
- Wait up to 24 hours for DNS propagation
- Verify Cloudflare DNS records match Railway requirements
- Check SSL certificate status in Railway dashboard

## Legacy Documentation (Archived)

The following deployment documentation has been archived as MaatWork migrates to Railway:

### Archived Files
- ~~`docs/deployment/production-terraform.md`~~ - Terraform for AWS production deployment

### Active Documentation
- `docs/RAILWAY_SETUP.md` - Current Railway deployment guide (this file)
- `docs/deployment/README.md` - General deployment selection guide (still relevant)
- `docs/deployment/mvp-quickstart.md` - Local Docker development (still relevant)
