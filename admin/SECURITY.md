# Security Guidelines - ContextOS Admin Panel

## Authentication & Authorization

### Admin Access Control
- Only users with `is_admin = true` can access the admin panel
- JWT tokens expire after 30 minutes (configurable)
- Automatic logout on session timeout
- Failed login attempts are logged

### Session Management
- Session timeout: 30 minutes (default)
- Auto-logout on inactivity
- Token refresh on API errors
- Secure token storage in localStorage

## Input Validation & Sanitization

### All User Inputs
- HTML sanitization using DOMPurify
- Email validation with regex
- XSS protection on all text inputs
- SQL injection prevention (backend)

### Data Validation
```typescript
// Example: User data validation
const { valid, errors } = validateUserData({
  full_name: sanitizeInput(name),
  email: email,
  plan: plan
})
```

## Security Headers

### Implemented Headers
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=63072000`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Audit Logging

### Logged Actions
- User login/logout
- User creation/update/deletion
- Settings changes
- Failed authentication attempts

### Log Storage
- Local storage (last 100 entries)
- Console logging in development
- Should be sent to backend in production

### Log Format
```json
{
  "action": "USER_UPDATED",
  "userId": "admin-user-id",
  "targetUserId": "target-user-id",
  "details": { "field": "plan", "oldValue": "free", "newValue": "pro" },
  "timestamp": "2026-03-26T12:00:00.000Z"
}
```

## CORS Configuration

### Allowed Origins
- Development: `http://localhost:3002`
- Production: `https://admin.contextos.com`
- Backend regex: `http://localhost:\d+` (dev only)

## API Security

### Request Interceptors
- Automatic token injection
- Request logging (dev mode)
- Timeout: 30 seconds

### Response Interceptors
- 401 handling with auto-logout
- Error message sanitization
- Retry logic for failed requests

## Environment Variables

### Required Variables
```env
NEXT_PUBLIC_API_URL=https://api.contextos.com
NODE_ENV=production
NEXT_PUBLIC_SESSION_TIMEOUT=1800000
NEXT_PUBLIC_ENABLE_AUDIT_LOG=true
```

### Never Commit
- `.env.local`
- `.env.production`
- API keys or secrets

## Best Practices

### 1. Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### 2. Admin User Management
- Use strong passwords
- Rotate credentials quarterly
- Limit number of admin users
- Review admin access regularly

### 3. Data Protection
- Never log sensitive data
- Sanitize all user inputs
- Validate data on both client and server
- Use HTTPS in production

### 4. Error Handling
- Don't expose stack traces to users
- Log errors securely
- Show generic error messages
- Monitor error rates

## Vulnerability Prevention

### XSS (Cross-Site Scripting)
- ✅ DOMPurify sanitization
- ✅ React's built-in XSS protection
- ✅ Content Security Policy headers
- ✅ Input validation

### CSRF (Cross-Site Request Forgery)
- ✅ SameSite cookies (backend)
- ✅ CORS configuration
- ✅ Token-based authentication

### SQL Injection
- ✅ Parameterized queries (backend)
- ✅ ORM usage (SQLAlchemy)
- ✅ Input validation

### Session Hijacking
- ✅ Secure token storage
- ✅ Session timeout
- ✅ HTTPS only in production
- ✅ Token expiration

## Incident Response

### If Security Breach Detected
1. Immediately revoke all admin tokens
2. Force password reset for all admins
3. Review audit logs for suspicious activity
4. Patch vulnerability
5. Notify affected users
6. Document incident

### Regular Security Audits
- Weekly: Review audit logs
- Monthly: Update dependencies
- Quarterly: Security assessment
- Annually: Penetration testing

## Compliance

### Data Protection
- GDPR compliance for EU users
- Data retention policies
- User data deletion on request
- Audit trail for compliance

### Access Logs
- Maintain for 90 days minimum
- Export for compliance audits
- Secure storage
- Regular review

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables configured
- [ ] Session timeout set appropriately
- [ ] Audit logging enabled
- [ ] Input validation implemented
- [ ] Security headers configured
- [ ] Error boundaries in place
- [ ] Dependencies up to date
- [ ] Admin users have strong passwords
- [ ] Regular security audits scheduled
