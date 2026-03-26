# Vercel Environment Variables for Admin Dashboard

## Required Environment Variables

Set these in your Vercel project: **Settings** → **Environment Variables**

### 1. API Configuration (REQUIRED)

```
NEXT_PUBLIC_API_URL
```
**Value:** Your backend API URL
- **Production:** `https://your-backend-api.com` or `https://contextos-api.onrender.com`
- **Example:** `https://contextos-backend.onrender.com`

⚠️ **Important:** This must be your actual backend URL where the API is hosted.

---

### 2. Session Configuration (REQUIRED)

```
NEXT_PUBLIC_SESSION_TIMEOUT
```
**Value:** `3600000`
- Session timeout in milliseconds (1 hour = 3600000ms)
- Adjust as needed for your security requirements

---

### 3. Feature Flags (REQUIRED)

```
NEXT_PUBLIC_ENABLE_AUDIT_LOG
```
**Value:** `true` or `false`
- Enable audit logging for admin actions
- **Recommended:** `true` for production

```
NEXT_PUBLIC_ENABLE_USER_DELETE
```
**Value:** `true` or `false`
- Allow admins to delete users
- **Recommended:** `false` for production (safety)

```
NEXT_PUBLIC_ENABLE_BULK_ACTIONS
```
**Value:** `true` or `false`
- Enable bulk user operations
- **Recommended:** `false` initially

---

### 4. Node Environment (AUTO-SET)

```
NODE_ENV
```
**Value:** `production`
- Vercel automatically sets this to `production`
- You don't need to manually set this

---

## Optional Environment Variables

### Monitoring (Optional)

```
NEXT_PUBLIC_SENTRY_DSN
```
**Value:** Your Sentry DSN for error tracking
- Leave empty if not using Sentry

```
NEXT_PUBLIC_ANALYTICS_ID
```
**Value:** Your analytics tracking ID
- Leave empty if not using analytics

---

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. For each variable:
   - Click **"Add New"**
   - Enter **Key** (e.g., `NEXT_PUBLIC_API_URL`)
   - Enter **Value** (e.g., `https://your-backend.com`)
   - Select environments: **Production**, **Preview**, **Development** (check all)
   - Click **"Save"**

---

## Production Configuration Example

```env
# API
NEXT_PUBLIC_API_URL=https://contextos-backend.onrender.com

# Session
NEXT_PUBLIC_SESSION_TIMEOUT=3600000

# Security & Features
NEXT_PUBLIC_ENABLE_AUDIT_LOG=true
NEXT_PUBLIC_ENABLE_USER_DELETE=false
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=false

# Optional - Leave empty if not using
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ANALYTICS_ID=
```

---

## Important Notes

1. **All variables starting with `NEXT_PUBLIC_`** are exposed to the browser
2. **Never put secrets** in `NEXT_PUBLIC_` variables
3. After adding/changing variables, you must **redeploy** for changes to take effect
4. The backend URL must be accessible from the browser (CORS configured)

---

## Verification

After deployment, check the browser console:
- The app should connect to your backend API
- Check for CORS errors if API calls fail
- Verify environment variables are loaded correctly

---

## Quick Copy-Paste for Vercel

**Minimum Required Variables:**

| Key | Value | Environments |
|-----|-------|--------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com` | Production, Preview, Development |
| `NEXT_PUBLIC_SESSION_TIMEOUT` | `3600000` | Production, Preview, Development |
| `NEXT_PUBLIC_ENABLE_AUDIT_LOG` | `true` | Production, Preview, Development |
| `NEXT_PUBLIC_ENABLE_USER_DELETE` | `false` | Production, Preview, Development |
| `NEXT_PUBLIC_ENABLE_BULK_ACTIONS` | `false` | Production, Preview, Development |
