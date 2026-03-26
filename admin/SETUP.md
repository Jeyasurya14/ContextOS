# ContextOS Admin Dashboard - Setup Guide

Complete guide to set up and deploy the admin dashboard.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Backend API running
- Admin user created in database

---

## 1. Install Dependencies

```bash
cd admin
npm install
```

This will install:
- Next.js 14
- React 18
- Tailwind CSS
- Axios (API client)
- Zustand (state management)
- Lucide React (icons)
- Recharts (charts - if needed)

---

## 2. Environment Configuration

Create `.env.local` in the `admin` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production:
```env
NEXT_PUBLIC_API_URL=https://api.contextos.com
```

---

## 3. Database Setup

### Run Migration

```bash
cd backend
alembic upgrade head
```

This adds the `is_admin` field to the users table.

### Create Admin User

Option 1: SQL Query
```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'your-admin@email.com';
```

Option 2: Python Script
```python
# backend/scripts/create_admin.py
from app.core.database import get_db
from app.models.user import User
from sqlalchemy import select

async def make_admin(email: str):
    async for db in get_db():
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.is_admin = True
            await db.commit()
            print(f"✓ {email} is now an admin")
        else:
            print(f"✗ User {email} not found")
```

---

## 4. Run Development Server

```bash
cd admin
npm run dev
```

Access at: **http://localhost:3002**

Default ports:
- Frontend (user app): 3000
- Backend API: 8000
- Admin Dashboard: 3002

---

## 5. Login to Admin Dashboard

1. Navigate to `http://localhost:3002`
2. Enter admin credentials (email + password)
3. You'll be redirected to `/dashboard`

---

## 6. Features Available

### Dashboard (`/dashboard`)
- Platform statistics
- User metrics (total, active, inactive)
- Plan distribution
- Integration stats
- Context chunks count
- Conversations count

### User Management (`/dashboard/users`)
- View all users with pagination
- Search by email or name
- Filter by plan (free, pro, team)
- Filter by status (active, inactive)
- Edit user details
- Change user plan
- Activate/deactivate users
- Grant/revoke admin access
- Delete users

### Integrations (`/dashboard/integrations`)
- View all integrations across users
- Filter by provider (GitHub, Notion, Slack)
- Monitor sync status
- View chunk counts
- Track last sync times

---

## 7. Production Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
```bash
git add admin/
git commit -m "Add admin dashboard"
git push origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your repository
- Set root directory to `admin`
- Add environment variable: `NEXT_PUBLIC_API_URL`
- Deploy

3. **Configure Custom Domain**
- Add domain: `admin.contextos.com`
- Update DNS records as instructed
- Enable HTTPS (automatic)

### Option 2: Netlify

1. **Build the app**
```bash
cd admin
npm run build
```

2. **Deploy**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

3. **Configure**
- Set build directory to `admin`
- Set publish directory to `.next`
- Add environment variables

### Option 3: Docker

Create `admin/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t contextos-admin .
docker run -p 3002:3002 -e NEXT_PUBLIC_API_URL=https://api.contextos.com contextos-admin
```

---

## 8. Security Best Practices

### 1. IP Whitelisting
Add to backend CORS configuration:
```python
# backend/app/core/config.py
ADMIN_ALLOWED_IPS = ["your-office-ip", "your-home-ip"]
```

### 2. Rate Limiting
```python
# backend/app/api/routes/admin.py
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.get("/users")
@limiter.limit("100/hour")
async def list_users(...):
    ...
```

### 3. Audit Logging
```python
# Log all admin actions
logger.info(
    "Admin action: {action} by {admin_id} on {resource}",
    action="delete_user",
    admin_id=current_admin.id,
    resource=user_id
)
```

### 4. Two-Factor Authentication (Future)
- Add 2FA requirement for admin users
- Use TOTP (Google Authenticator)

---

## 9. Monitoring

### Backend Logs
```bash
# View admin actions
grep "Admin" backend/logs/app.log
```

### Frontend Analytics
- Add Google Analytics
- Track admin page views
- Monitor admin actions

---

## 10. Troubleshooting

### Issue: Cannot login
**Solution:**
- Verify user has `is_admin = true` in database
- Check backend logs for authentication errors
- Verify API URL is correct

### Issue: 403 Forbidden on API calls
**Solution:**
- Ensure JWT token is valid
- Check user has admin privileges
- Verify CORS settings allow admin domain

### Issue: Blank page after login
**Solution:**
- Check browser console for errors
- Verify API endpoints are accessible
- Check network tab for failed requests

---

## 11. Maintenance

### Update Dependencies
```bash
cd admin
npm update
```

### Database Backups
```bash
# Backup before admin actions
pg_dump contextos_db > backup_$(date +%Y%m%d).sql
```

### Monitor Admin Activity
```sql
-- View recent admin actions (if audit table exists)
SELECT * FROM admin_audit_log 
ORDER BY created_at DESC 
LIMIT 100;
```

---

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Check browser console
- Review API responses in Network tab
- Contact: admin@contextos.com

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment
3. ✅ Run database migration
4. ✅ Create admin user
5. ✅ Test locally
6. ✅ Deploy to production
7. ✅ Configure custom domain
8. ✅ Set up monitoring
9. ✅ Enable security features

**Admin dashboard is ready to use!** 🎉
