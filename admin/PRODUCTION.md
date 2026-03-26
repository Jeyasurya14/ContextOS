# ContextOS Admin Panel - Production Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Backend API running and accessible
- PostgreSQL database with migrations applied
- Admin user created with `is_admin = true`

## Environment Setup

1. **Create Production Environment File**

```bash
cp .env.example .env.production
```

2. **Configure Environment Variables**

```env
# Production API URL
NEXT_PUBLIC_API_URL=https://api.contextos.com

# Environment
NODE_ENV=production

# Security Settings
NEXT_PUBLIC_SESSION_TIMEOUT=1800000  # 30 minutes
NEXT_PUBLIC_ENABLE_AUDIT_LOG=true

# Feature Flags
NEXT_PUBLIC_ENABLE_USER_DELETE=true
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=false

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Build & Deploy

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings > Environment Variables
```

### Option 2: Docker

```bash
# Build Docker image
docker build -t contextos-admin .

# Run container
docker run -p 3002:3002 \
  -e NEXT_PUBLIC_API_URL=https://api.contextos.com \
  -e NODE_ENV=production \
  contextos-admin
```

### Option 3: Traditional Server

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Start production server
npm start
```

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables properly configured
- [ ] CORS configured on backend for admin domain
- [ ] Session timeout configured (default: 30 minutes)
- [ ] Audit logging enabled
- [ ] Rate limiting enabled on backend
- [ ] Admin users have strong passwords
- [ ] Database backups configured
- [ ] Error logging and monitoring set up

## Post-Deployment

### 1. Verify Deployment

```bash
curl https://admin.contextos.com/api/health
```

### 2. Test Admin Login

- Navigate to https://admin.contextos.com
- Login with admin credentials
- Verify dashboard loads correctly
- Test user management features
- Check audit logs

### 3. Monitor Performance

- Check server logs for errors
- Monitor API response times
- Track user sessions
- Review audit logs regularly

## Maintenance

### Update Dependencies

```bash
npm audit
npm update
npm run build
```

### Database Migrations

```bash
cd ../backend
alembic upgrade head
```

### Backup Strategy

- Daily database backups
- Weekly full system backups
- Audit log exports monthly
- Configuration backups before changes

## Troubleshooting

### Issue: Cannot Login

1. Check backend API is accessible
2. Verify CORS configuration includes admin domain
3. Check user has `is_admin = true` in database
4. Review browser console for errors

### Issue: Session Expires Too Quickly

1. Increase `NEXT_PUBLIC_SESSION_TIMEOUT`
2. Check backend JWT token expiration
3. Verify session storage is working

### Issue: Slow Performance

1. Enable production build optimizations
2. Check API response times
3. Implement caching where appropriate
4. Review database query performance

## Monitoring & Alerts

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Plausible
- **Uptime Monitoring**: UptimeRobot / Pingdom
- **Log Management**: Datadog / LogRocket

### Key Metrics to Monitor

- Login success/failure rate
- API response times
- Error rates
- Active admin sessions
- User management actions
- System resource usage

## Security Best Practices

1. **Access Control**
   - Limit admin access to trusted IPs (optional)
   - Use VPN for remote admin access
   - Implement 2FA (future enhancement)

2. **Audit Logging**
   - Review logs weekly
   - Alert on suspicious activity
   - Export logs for compliance

3. **Regular Updates**
   - Update dependencies monthly
   - Apply security patches immediately
   - Review and rotate credentials quarterly

4. **Backup & Recovery**
   - Test backup restoration monthly
   - Document recovery procedures
   - Maintain offline backups

## Support & Escalation

For production issues:
1. Check logs and error messages
2. Review this documentation
3. Contact backend team if API-related
4. Escalate to DevOps for infrastructure issues
