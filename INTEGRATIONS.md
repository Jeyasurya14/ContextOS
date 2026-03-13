# ContextOS Integrations Setup Guide

This document explains how to set up all integrations for ContextOS.

## Overview

ContextOS supports the following integrations:
- **GitHub** - Sync code repositories for context
- **Notion** - Sync workspace pages and databases
- **Slack** - Sync workspace messages and channels
- **Razorpay** - Payment processing for Pro/Team plans
- **VS Code Extension** - Direct IDE integration

## Required Environment Variables

### Backend (.env)

Copy `backend/.env.example` to `backend/.env` and configure:

#### Database & Infrastructure
```bash
DATABASE_URL=postgresql+asyncpg://contextos:your_password@localhost:5432/contextos
REDIS_URL=redis://localhost:6379/0
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

#### Security
```bash
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key!!
```

#### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:8000/api/v1/integrations/github/callback`
4. Copy Client ID and Secret:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

#### Notion OAuth
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Set Redirect URI to: `http://localhost:8000/api/v1/integrations/notion/callback`
4. Copy credentials:
```bash
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:8000/api/v1/integrations/notion/callback
```

#### Slack OAuth
1. Go to https://api.slack.com/apps
2. Create a new app
3. Add OAuth Redirect URL: `http://localhost:8000/api/v1/integrations/slack/callback`
4. Add Bot Token Scopes: `channels:history`, `channels:read`, `users:read`, `team:read`
5. Copy credentials:
```bash
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
```

#### Razorpay Payment
1. Go to https://dashboard.razorpay.com/
2. Get API keys from Settings → API Keys
3. Create subscription plans and copy Plan IDs
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_PRO_PLAN_ID=plan_xxxxx
RAZORPAY_TEAM_PLAN_ID=plan_xxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### OpenAI
```bash
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o
```

#### URLs
```bash
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Frontend (.env.local)

Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## OAuth Flow

### How OAuth Works in ContextOS

1. **User clicks "Connect GitHub"** on `/dashboard/integrations`
2. Frontend calls `/api/v1/integrations/github/connect` to get OAuth URL
3. Frontend redirects user to GitHub OAuth page
4. User authorizes the app on GitHub
5. GitHub redirects to backend: `/api/v1/integrations/github/callback?code=xxx&state=xxx`
6. Backend exchanges code for access token
7. Backend saves integration to database
8. Backend redirects to frontend: `/dashboard/integrations?success=github&username=xxx`
9. Frontend shows success toast and refreshes integrations list

### Callback URLs

**IMPORTANT:** When setting up OAuth apps, use these exact callback URLs:

- **GitHub:** `http://localhost:8000/api/v1/integrations/github/callback`
- **Notion:** `http://localhost:8000/api/v1/integrations/notion/callback`
- **Slack:** `http://localhost:8000/api/v1/integrations/slack/callback`

For production, replace `http://localhost:8000` with your backend domain.

## Testing Integrations

### 1. Start Services
```bash
# Terminal 1 - Database
docker-compose up -d postgres redis qdrant

# Terminal 2 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### 2. Test OAuth Flow
1. Go to http://localhost:3000/dashboard/integrations
2. Click "Connect" on any integration
3. Authorize on the OAuth provider
4. Verify you're redirected back with success message
5. Check that integration appears as "Connected"

### 3. Test Sync
1. Click "Sync Now" on a connected integration
2. Check backend logs for sync progress
3. Verify context chunks are created in Qdrant

### 4. Test Billing
1. Go to http://localhost:3000/dashboard/billing
2. Click "Upgrade to Pro"
3. Complete Razorpay test payment
4. Verify plan upgrade in dashboard

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/api-keys` - Generate API key

### Integrations
- `GET /api/v1/integrations` - List all integrations
- `GET /api/v1/integrations/github/connect` - Get GitHub OAuth URL
- `GET /api/v1/integrations/github/callback` - GitHub OAuth callback
- `DELETE /api/v1/integrations/github/disconnect` - Disconnect GitHub
- `POST /api/v1/integrations/github/sync` - Trigger GitHub sync
- (Same pattern for Notion and Slack)

### Context & Query
- `GET /api/v1/context/stats` - Get context statistics
- `DELETE /api/v1/context/all` - Clear all context
- `POST /api/v1/query` - AI query with streaming

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Teams
- `GET /api/v1/teams/me` - Get my team
- `POST /api/v1/teams` - Create team
- `POST /api/v1/teams/{id}/invite` - Invite member
- `DELETE /api/v1/teams/{id}/members/{user_id}` - Remove member

### Billing
- `GET /api/v1/billing/usage` - Get usage stats
- `POST /api/v1/billing/create-order` - Create Razorpay order
- `POST /api/v1/billing/verify-payment` - Verify payment

## Troubleshooting

### OAuth Redirect Mismatch
**Error:** "Redirect URI mismatch"
**Solution:** Ensure callback URLs in OAuth app settings match exactly:
- Local: `http://localhost:8000/api/v1/integrations/{provider}/callback`
- Production: `https://your-domain.com/api/v1/integrations/{provider}/callback`

### Integration Not Showing as Connected
**Error:** Integration shows "Not Connected" after OAuth
**Solution:** 
1. Check backend logs for errors
2. Verify database has integration record
3. Check that `is_active=true` in database
4. Refresh integrations page

### Sync Not Working
**Error:** Sync button does nothing
**Solution:**
1. Check Celery worker is running: `celery -A app.workers.celery_app worker --loglevel=info`
2. Check Redis is running: `redis-cli ping`
3. Check backend logs for worker errors

### Payment Not Processing
**Error:** Razorpay payment fails
**Solution:**
1. Verify Razorpay keys are correct
2. Use test mode keys for development
3. Check webhook URL is configured in Razorpay dashboard
4. Verify plan IDs match your Razorpay plans

## Production Deployment

### Environment Variables
Update all URLs to production domains:
```bash
FRONTEND_URL=https://your-frontend.com
BACKEND_URL=https://api.your-domain.com
CORS_ORIGINS=https://your-frontend.com
```

### OAuth Callback URLs
Update all OAuth apps with production callback URLs:
- GitHub: `https://api.your-domain.com/api/v1/integrations/github/callback`
- Notion: `https://api.your-domain.com/api/v1/integrations/notion/callback`
- Slack: `https://api.your-domain.com/api/v1/integrations/slack/callback`

### Security
- Use strong JWT_SECRET_KEY (min 32 chars)
- Use strong ENCRYPTION_KEY (exactly 32 bytes)
- Enable HTTPS for all endpoints
- Set DEBUG=False in production
- Use production Razorpay keys

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Check frontend console for errors
3. Verify all environment variables are set
4. Test OAuth flow step by step
