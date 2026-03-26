# Vercel Deployment Fix - Admin Dashboard

## Problem
Vercel build fails with `Module not found: Can't resolve '@/lib/api'` even though:
- ✅ Local build works perfectly (`npm run build` succeeds)
- ✅ Root Directory is set to `admin` in Vercel dashboard
- ✅ Webpack path aliases configured in `next.config.js`
- ✅ TypeScript path mappings in `tsconfig.json`
- ✅ JavaScript path mappings in `jsconfig.json`

## Root Cause
Vercel is **not respecting the Root Directory setting** and is still building from the repository root instead of the `admin/` subdirectory.

## Solution: Reconnect Vercel Project

The Root Directory setting may not be applied to existing deployments. You need to either:

### Option 1: Clear Build Cache and Force Redeploy

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Settings** → **General**
3. Scroll to bottom and click **"Clear Build Cache"**
4. Go to **Deployments** tab
5. Click **"Redeploy"** on the latest deployment
6. Select **"Use existing Build Cache: OFF"**

### Option 2: Disconnect and Reconnect Project (Recommended)

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Settings** → **Git**
3. Click **"Disconnect"** to unlink the repository
4. Go back to Vercel Dashboard
5. Click **"Add New Project"**
6. Import your GitHub repository again
7. **During setup**, set:
   - **Root Directory**: `admin`
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: Leave empty (auto-detect)
   - **Output Directory**: Leave empty (auto-detect)
8. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=<your-backend-url>
   NEXT_PUBLIC_SESSION_TIMEOUT=3600000
   NEXT_PUBLIC_ENABLE_AUDIT_LOG=true
   NEXT_PUBLIC_ENABLE_USER_DELETE=false
   NEXT_PUBLIC_ENABLE_BULK_ACTIONS=false
   ```
9. Click **"Deploy"**

### Option 3: Deploy Admin as Separate Vercel Project

Create a completely new Vercel project specifically for the admin dashboard:

1. In Vercel Dashboard, click **"Add New Project"**
2. Select **"Import Git Repository"**
3. Choose your ContextOS repository
4. Give it a different name like `contextos-admin`
5. Set **Root Directory** to `admin`
6. Deploy

## Verification

After redeployment, the build should show:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (7/7)
```

## Why This Happens

Vercel caches project configuration. When you change the Root Directory setting on an existing project, it may not apply to the build environment immediately. The cached configuration continues to use the old root directory (repository root), causing module resolution to fail.

## Current Status

- Local build: ✅ SUCCESS
- Vercel build: ❌ FAILS (not using correct root directory)
- Next action: Clear cache or reconnect project
