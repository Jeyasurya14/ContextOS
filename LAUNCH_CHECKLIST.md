# ContextOS Launch Checklist

## Pre-Launch: Environment Setup

- [ ] Copy `.env.example` to `.env` and fill in all values
- [ ] Generate strong `JWT_SECRET_KEY` (64+ chars)
- [ ] Generate strong `ENCRYPTION_KEY` (exactly 32 bytes)
- [ ] Set `POSTGRES_PASSWORD` to a strong random value
- [ ] Set `REDIS_PASSWORD` to a strong random value
- [ ] Configure GitHub OAuth app (client ID, secret, webhook secret)
- [ ] Configure Notion OAuth integration (client ID, secret, redirect URI)
- [ ] Configure Slack OAuth app (client ID, secret, signing secret)
- [ ] Set `ANTHROPIC_API_KEY`
- [ ] Set Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs)
- [ ] Set `FRONTEND_URL` and `BACKEND_URL` to production domains
- [ ] Update `CORS_ORIGINS` to include production frontend domain
- [ ] Set `DEBUG=false`

## Pre-Launch: SSL / DNS

- [ ] Point domain A record to server IP
- [ ] Obtain SSL certificate (Let's Encrypt or similar)
- [ ] Place `fullchain.pem` and `privkey.pem` in `nginx/certs/`
- [ ] Uncomment HTTPS server block in `nginx/nginx.conf`
- [ ] Enable HTTP→HTTPS redirect in nginx

## Infrastructure

- [ ] `docker compose -f docker-compose.prod.yml up -d` → all services start
- [ ] PostgreSQL healthy: `docker exec contextos-postgres pg_isready`
- [ ] Redis healthy: `docker exec contextos-redis redis-cli ping`
- [ ] Qdrant healthy: `curl http://localhost:6333/healthz`
- [ ] Backend healthy: `curl http://localhost:8000/health`

## Database

- [ ] `alembic upgrade head` → all migrations applied, no errors
- [ ] Verify tables exist: users, projects, integrations, context_chunks, conversations, conversation_messages, teams, team_invitations, billing_events, usage_records

## API Endpoints

### Auth
- [ ] `POST /api/v1/auth/register` → creates user, returns tokens
- [ ] `POST /api/v1/auth/login` → returns access + refresh tokens
- [ ] `GET /api/v1/auth/me` → returns user data with Bearer token
- [ ] `POST /api/v1/auth/refresh` → returns new access token
- [ ] `POST /api/v1/auth/api-key` → generates API key (shown once)

### Integrations
- [ ] `GET /api/v1/integrations/status` → returns connection status for all providers
- [ ] `GET /api/v1/github/connect` → returns GitHub OAuth URL
- [ ] `GET /api/v1/notion/connect` → returns Notion OAuth URL
- [ ] `GET /api/v1/slack/connect` → returns Slack OAuth URL
- [ ] OAuth callbacks work for all three providers

### Query
- [ ] `POST /api/v1/query` with Bearer token → streams SSE response
- [ ] `POST /api/v1/query` with `X-API-Key: ctx_xxx` → streams SSE response
- [ ] SSE events include: thinking, searching, token, sources, done
- [ ] `GET /api/v1/query/conversations` → lists conversations
- [ ] `GET /api/v1/query/conversations/{id}` → returns conversation with messages

### Teams
- [ ] `POST /api/v1/teams` → creates team, user becomes owner
- [ ] `GET /api/v1/teams/me` → returns team info
- [ ] `POST /api/v1/teams/{id}/invite` → returns invitation link
- [ ] `POST /api/v1/teams/invite/accept` → joins team
- [ ] `POST /api/v1/teams/leave` → leaves team

### Billing
- [ ] `POST /api/v1/billing/checkout` → returns Stripe checkout URL
- [ ] `POST /api/v1/billing/portal` → returns Stripe portal URL
- [ ] `GET /api/v1/billing/usage` → returns usage stats
- [ ] `POST /api/v1/billing/webhooks` → accepts Stripe test events (signature verified)

### Rate Limiting
- [ ] Free user blocked after 50 queries/day → 429 with upgrade message
- [ ] Pro user allowed up to 1,000 queries/day
- [ ] Nginx rate limits enforced (auth: 5/min, api: 30/s)

## Frontend

- [ ] `cd frontend && npm install && npm run build` → zero errors
- [ ] Landing page loads at `/`
- [ ] `/register` → creates account → redirects to `/dashboard`
- [ ] `/login` → logs in → redirects to `/dashboard`
- [ ] `/dashboard` → shows stats
- [ ] `/dashboard/chat` → streaming chat works
- [ ] `/dashboard/integrations` → shows 4 integration cards
- [ ] `/dashboard/projects` → create/delete projects
- [ ] `/dashboard/team` → create team / manage members
- [ ] `/dashboard/billing` → plan comparison, upgrade flow
- [ ] `/dashboard/settings` → API key generation, profile display

## VS Code Extension

- [ ] `cd vscode-extension && npm install && npm run compile` → builds OK
- [ ] Extension activates in VS Code
- [ ] API key can be set via command palette
- [ ] Chat sidebar opens and accepts questions
- [ ] Workspace context sync works
- [ ] Streaming responses display correctly

## Security Verification

- [ ] No raw tokens in database (all encrypted with AES-256-GCM)
- [ ] No raw API keys in database (all SHA256 hashed)
- [ ] No raw passwords in database (all bcrypt hashed)
- [ ] No tokens/keys in log output
- [ ] Webhook signature verification working for GitHub, Slack, Stripe
- [ ] CORS restricted to production frontend domain only
- [ ] Security headers present (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] JWT stored in memory only (not localStorage)
- [ ] All user data queries include `WHERE user_id = :user_id`

## Monitoring

- [ ] Request logging middleware active
- [ ] Error tracking captures exceptions
- [ ] Metrics endpoint returns uptime, request counts, latency

## Post-Launch

- [ ] Monitor error rates for first 24 hours
- [ ] Verify Stripe webhooks processing correctly
- [ ] Check Celery worker task completion rates
- [ ] Verify daily query count resets at midnight UTC
- [ ] Run load test with expected traffic patterns
