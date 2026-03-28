# Production Deployment Guide

This guide covers optimizing and deploying ContextOS to production.

## Prerequisites

- **Python**: 3.10+ (3.11 recommended)
- **Node.js**: 18+ (20 recommended)
- **PostgreSQL**: 14+
- **Redis**: 7+
- **Qdrant**: 1.9+ (or use Qdrant Cloud)
- **Docker** (optional but recommended)

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Application
APP_NAME=ContextOS
APP_VERSION=2.0.0
ENVIRONMENT=production
DEBUG=false

# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30
DATABASE_POOL_TIMEOUT=60

# Redis
REDIS_URL=redis://host:6379/0
REDIS_MAX_CONNECTIONS=20

# Qdrant
QDRANT_HOST=https://your-qdrant-instance.cloud.qdrant.io
QDRANT_PORT=6333
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION=context_chunks

# JWT
JWT_SECRET_KEY=<generate-with-openssl-or-32-chars>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Encryption (for OAuth tokens)
ENCRYPTION_KEY=<generate-32-bytes>

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.1

# OAuth Integrations (configure as needed)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_REDIRECT_URI=https://your-domain.com/api/v1/integrations/github/callback

NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=https://your-domain.com/api/v1/integrations/notion/callback

SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_REDIRECT_URI=https://your-domain.com/api/v1/integrations/slack/callback

LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
LINEAR_WEBHOOK_SECRET=...
LINEAR_REDIRECT_URI=https://your-domain.com/api/v1/integrations/linear/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.com/api/v1/integrations/google/callback

# Billing (optional - Razorpay)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# URLs
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com,https://your-admin-domain.com

# Rate Limits (per day)
RATE_LIMIT_FREE=50
RATE_LIMIT_PRO=1000
RATE_LIMIT_TEAM=5000
```

### Generate Secure Keys

```bash
# JWT Secret (32+ chars)
openssl rand -hex 32

# Encryption Key (32 bytes)
openssl rand -hex 32
```

## Deployment Options

### Option 1: Docker (Recommended)

Build and run with Docker Compose:

```bash
# Backend
cd backend
docker build -t contextos-backend -f Dockerfile .
docker run -p 8000:8000 --env-file .env contextos-backend

# With Docker Compose (recommended)
docker-compose up -d
```

Docker Compose includes:
- PostgreSQL
- Redis
- Qdrant (or connect to Qdrant Cloud)
- Backend API
- Celery workers
- Flower (task monitoring)

### Option 2: Render.com

1. Connect your GitHub repo
2. Create a Web Service for backend:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add all environment variables
3. Create a Static Site for frontend:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/.next/standalone`
4. Add PostgreSQL, Redis, and Qdrant as separate services

### Option 3: AWS/GCP/Azure

Use ECS, Cloud Run, or App Service:

```bash
# Build for container
docker build -t contextos-backend .

# Push to registry
docker tag contextos-backend gcr.io/your-project/contextos-backend
docker push gcr.io/your-project/contextos-backend

# Deploy to your cloud provider
```

## Performance Optimizations

### Database

1. **Connection Pooling**: Already configured with optimal pool size
2. **Indexes**: Run the migration to add production indexes:
   ```bash
   cd backend
   alembic upgrade head
   ```
3. **Analyze**: After migration, run:
   ```bash
   alembic -x analyze=true upgrade head
   ```

### Caching

- Redis is used for:
  - Query result caching
  - Intent classification caching
  - Embedding caching
  - Rate limiting
  - Celery broker/results

Ensure Redis has enough memory (recommended: 2GB+).

### LLM Configuration

- Using OpenAI with configurable models
- Default: `gpt-4o`
- Embeddings: `text-embedding-3-small`
- Temperature: 0.1 (low for factual responses)
- Max tokens: 2000 per response

### Rate Limiting

Rate limits are user-based (not IP-based for authenticated users):

- Free: 50 queries/day
- Pro: 1000 queries/day
- Team: 5000 queries/day

Adjust in `backend/.env` or config.

## Security Hardening

### Already Implemented

- CORS with whitelist
- Security headers (HSTS, CSP, XSS protection, etc.)
- JWT token authentication
- API key authentication for VS Code extension
- Request size limits (10MB max)
- SQL injection prevention (SQLAlchemy ORM)
- Rate limiting
- Trusted host validation
- Password hashing with bcrypt
- Encryption for OAuth tokens

### Production Checklist

- [ ] Use HTTPS only (SSL certificates)
- [ ] Set `DEBUG=false`
- [ ] Use strong JWT_SECRET_KEY
- [ ] Use strong ENCRYPTION_KEY
- [ ] Enable database connection SSL
- [ ] Regularly rotate secrets
- [ ] Monitor rate limits and abuse
- [ ] Set up audit logging
- [ ] Implement WAF (Cloudflare, AWS WAF, etc.)
- [ ] Enable database backups
- [ ] Use VPC/private networking for databases

## Monitoring & Observability

### Health Checks

- `GET /health` - Comprehensive health check
- `GET /health/ready` - Readiness check (K8s)
- `GET /health/live` - Liveness check
- `GET /metrics` - Application metrics

### Logging

Logs use `loguru` with structured logging. Ensure logs are captured:
- stdout/stderr for containerized deployments
- Use external logging service (Papertrail, Datadog, etc.)

### Metrics Monitored

- Request count per endpoint
- Error rate
- P95 latency
- Database connection pool stats
- Redis connection stats
- Qdrant vector search stats
- System CPU/memory/disk

### Alerting

Set up alerts for:
- 5xx error rate > 1%
- P95 latency > 5 seconds
- Database connection pool exhausted
- Redis memory > 80%
- Qdrant unavailable
- Rate limit spikes (potential abuse)

## Background Workers

Celery workers handle async tasks:

```bash
# Start workers
cd backend
celery -A app.workers.celery_app worker --loglevel=info --concurrency=4

# Start beat for scheduled tasks
celery -A app.workers.celery_app beat --loglevel=info

# Flower for monitoring
celery -A app.workers.celery_app flower --port=5555
```

Scheduled tasks:
- Notion sync: every 30 minutes
- Slack sync: every hour
- Linear sync: every hour
- Google Drive sync: every hour

## Scaling

### Horizontal Scaling

- Backend API is stateless - scale horizontally behind load balancer
- Use shared Redis for rate limiting and caching
- Database connection pool: adjust based on total connections across instances
  - Formula: `pool_size * num_instances + max_overflow` should be < PostgreSQL `max_connections`

### Vertical Scaling

- Increase `DATABASE_POOL_SIZE` (default: 20)
- Increase `REDIS_MAX_CONNECTIONS` (default: 20)
- Increase Celery worker concurrency (default: 4)

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooler (PgBouncer) for many connections
- Consider managed PostgreSQL (RDS, Cloud SQL, Neon)

### Qdrant Scaling

- Use Qdrant Cloud for managed service
- Local Qdrant can be clustered for high availability
- Monitor vector count and RAM usage

## Frontend Optimization

### Build

```bash
cd frontend
npm ci --only=production
npm run build
```

### Standalone Output

Next.js standalone output bundles all dependencies into a single folder:

```bash
# Output in frontend/.next/standalone
# Can run standalone: node server.js
```

### CDN

Deploy frontend to:
- Vercel (recommended)
- Cloudflare Pages
- AWS Amplify
- Netlify

Enable:
- Image optimization
- Gzip/Brotli compression
- Edge caching
- Global CDN

## Troubleshooting

### Common Issues

1. **Database connection pool exhausted**
   - Increase `DATABASE_POOL_SIZE`
   - Reduce `pool_timeout`
   - Check for long-running transactions

2. **Redis connection errors**
   - Check Redis is running
   - Verify `REDIS_URL`
   - Increase `REDIS_SOCKET_TIMEOUT`

3. **Qdrant search slow**
   - Ensure payload indexes exist
   - Check vector dimension matches (1536)
   - Monitor RAM usage

4. **OpenAI rate limits**
   - Implement exponential backoff (already done)
   - Consider increasing token limits on OpenAI account
   - Implement request queuing

5. **High memory usage**
   - Check for connection leaks
   - Monitor Celery worker memory
   - Reduce `max_overflow` if necessary

### Performance Tuning

```python
# For high-latency environments, increase timeouts:
DATABASE_POOL_TIMEOUT=60
REDIS_SOCKET_TIMEOUT=10
OPENAI_TIMEOUT=60
```

## Maintenance

### Daily

- Monitor error logs
- Check rate limit usage
- Verify backups are running

### Weekly

- Review slow queries (PostgreSQL `pg_stat_statements`)
- Check index usage
- Review Redis memory usage
- Monitor Celery task queue

### Monthly

- Update dependencies
- Security patches
- Review and clean up old data
- Analyze performance trends

## Support

- GitHub Issues: https://github.com/Jeyasurya14/ContextOS/issues
- Documentation: See README.md
