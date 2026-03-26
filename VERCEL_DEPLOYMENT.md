# Vercel Deployment Guide for ContextOS Admin Dashboard

## Issue
The admin dashboard is located in the `admin/` subdirectory, but Vercel builds from the repository root by default, causing module resolution errors:
```
Module not found: Can't resolve '@/lib/api'
```

## Solution

### **✅ Root Directory Configured Successfully**

The Root Directory has been set to `admin` in Vercel settings.

### **Next Step: Trigger a New Deployment**

To apply the fix, you need to redeploy:

**Option 1: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab in your Vercel project
2. Click the **...** menu on the latest failed deployment
3. Select **Redeploy**

**Option 2: Push a New Commit**
```bash
git commit --allow-empty -m "Trigger Vercel rebuild with admin root directory"
git push origin main
```

**Option 3: Redeploy via Vercel CLI**
```bash
cd admin
vercel --prod
```

**After redeployment, the build will succeed because Vercel will now build from the `admin/` directory and all module paths will resolve correctly.**

### Option 2: Deploy Admin as Separate Project

1. Create a new Vercel project
2. Import the repository
3. During setup, set **Root Directory** to `admin`
4. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` - Your backend API URL
   - `NEXT_PUBLIC_SESSION_TIMEOUT` - Session timeout in ms (default: 3600000)
   - `NEXT_PUBLIC_ENABLE_AUDIT_LOG` - Enable audit logging (true/false)
   - `NEXT_PUBLIC_ENABLE_USER_DELETE` - Enable user deletion (true/false)
   - `NEXT_PUBLIC_ENABLE_BULK_ACTIONS` - Enable bulk actions (true/false)

### Option 3: Use Vercel CLI

```bash
cd admin
vercel --prod
```

## Environment Variables Required

Create these in your Vercel project settings:

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_SESSION_TIMEOUT=3600000
NEXT_PUBLIC_ENABLE_AUDIT_LOG=true
NEXT_PUBLIC_ENABLE_USER_DELETE=false
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=false
```

## Troubleshooting

### Module Resolution Errors
If you see `Module not found: Can't resolve '@/lib/api'`, ensure:
- The Root Directory is set to `admin` in Vercel settings
- The build is running from the admin directory
- TypeScript path aliases are configured in `tsconfig.json`

### Build Command Issues
The default Next.js build commands should work:
- **Build Command**: `npm run build` (or leave empty for auto-detection)
- **Install Command**: `npm install` (or leave empty for auto-detection)
- **Output Directory**: `.next` (or leave empty for auto-detection)

## Verification

After deployment, verify:
1. The app loads at your Vercel URL
2. API calls work (check browser console for CORS issues)
3. Authentication flow works
4. Environment variables are properly set
