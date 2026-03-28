# Quick Start: Production Readiness

This guide helps you quickly deploy the optimized ContextOS to production.

## Prerequisites Checklist

- [ ] PostgreSQL 14+ running
- [ ] Redis 7+ running (with password recommended)
- [ ] Qdrant instance (cloud or self-hosted)
- [ ] OpenAI API key configured
- [ ] OAuth app credentials (GitHub, Notion, Slack, etc.)
- [ ] Domain name with SSL certificate
- [ ] Docker & Docker Compose installed (if using containers)

## 5-Minute Local Production Test

```bash
# 1. Clone and setup
cd /path/to/contextos

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your actual values

# 3. Start all services (PostgreSQL, Redis, Qdrant, Backend, Worker, Nginx)
docker-compose -f docker-compose.prod.yml up -d

# 4. Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Update statistics
docker-compose -f docker-compose.prod.yml exec backend python scripts/maintain_db.py --analyze

# 6. Check health
curl http://localhost/health
# Should return {"status":"ok", ...}

# 7. Test the API
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost/api/v1/query -d '{"question":"test"}'
```

## Key Files to Review

1. **`backend/.env`** - All secrets and configuration
2. **`PRODUCTION.md`** - Complete deployment guide
3. **`OPTIMIZATION_SUMMARY.md`** - Detailed list of changes
4. **`docker-compose.prod.yml`** - Production service definitions
5. **`nginx/nginx.conf`** - Reverse proxy with SSL (uncomment HTTPS section)

## Environment Variables You MUST Set

```bash
# Critical - No defaults
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://...
REDIS_PASSWORD=your-secure-password
QDRANT_API_KEY=...

# OAuth (if using integrations)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# ... similarly for Notion, Slack, Linear, Google

# URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
CORS_ORIGINS=https://your-domain.com
```

## Verify Optimizations Are Active

### 1. Check Database Pool
```sql
-- Connect to PostgreSQL and run:
SELECT
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'contextos'
GROUP BY state;
```
Expected: ~20-30 active connections under load

### 2. Check Redis Memory
```bash
redis-cli info memory | grep used_memory_human
```
Expected: < 256MB for light usage

### 3. Check Indexes
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```
Should see indexes like:
- `ix_context_chunks_user_source`
- `ix_conversations_user_updated`
- `ix_conversation_messages_conversation_created`

### 4. Test Caching
Make the same query twice and watch Redis activity:
```bash
redis-cli monitor
```
Should see cache hits on second query for `embed:*` and `intent:*` keys

### 5. Verify Compression
```bash
curl -I -H "Accept-Encoding: gzip" http://localhost/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question":"test"}' \
  --compressed
```
Look for `Content-Encoding: gzip` in response headers

### 6. Check Health Endpoints
```bash
curl http://localhost/health
curl http://localhost/health/ready
curl http://localhost/health/live
curl http://localhost/metrics
```

## Common Production Issues & Fixes

### Issue: "Database connection pool exhausted"
**Fix**: Increase `DATABASE_POOL_SIZE` (default 20) and ensure proper connection cleanup.

### Issue: "Redis connection refused"
**Fix**: Verify Redis is running, check `REDIS_URL` includes password if set.

### Issue: "Qdrant search fails"
**Fix**: Run `alembic upgrade head` to ensure payload indexes exist.

### Issue: "OpenAI rate limit exceeded"
**Fix**: Already has retry logic, consider upgrading OpenAI plan or adding request queuing.

### Issue: 413 Request Entity Too Large
**Fix**: Client upload is limited to 10MB. Request rejection is intentional.

### Issue: 429 Too Many Requests
**Fix**: Check rate limit configuration. For authenticated users, rate limits are per-user, not per-IP.

## Performance Tuning

### For High Load (> 1000 queries/day)

1. **Scale horizontally**:
   ```bash
   # In docker-compose.prod.yml, set deploy.replicas for backend
   deploy:
     replicas: 2
   ```

2. **Increase database pool**:
   ```bash
   DATABASE_POOL_SIZE=40
   DATABASE_MAX_OVERFLOW=50
   ```

3. **Add Redis connection pool**:
   ```bash
   REDIS_MAX_CONNECTIONS=50
   ```

4. **Enable connection pooler**:
   - Deploy PgBouncer between app and PostgreSQL
   - Set `DATABASE_URL` to point to PgBouncer

5. **Monitor slow queries**:
   ```sql
   -- Enable pg_stat_statements in PostgreSQL
   CREATE EXTENSION pg_stat_statements;
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

## Deploying to Render.com

1. Create Web Service for backend
2. Create Static Site for frontend
3. Add PostgreSQL (16), Redis (7), and Qdrant Cloud
4. Set environment variables in Render dashboard
5. Connect to GitHub, deploy main branch
6. Add custom domain and SSL (automatic)

See `PRODUCTION.md` for full details.

## Need Help?

- **Documentation**: See `PRODUCTION.md`
- **Issues**: https://github.com/Jeyasurya14/ContextOS/issues
- **Changes**: See `OPTIMIZATION_SUMMARY.md`

## What Was Optimized

- ✅ Database connection pooling
- ✅ Redis caching (embeddings, intent)
- ✅ Rate limiting (user-based)
- ✅ Compression (gzip)
- ✅ Timeouts (per-endpoint)
- ✅ Retry logic (OpenAI)
- ✅ Health checks with metrics
- ✅ Security headers
- ✅ Middleware ordering
- ✅ Composite database indexes
- ✅ Docker multi-stage builds
- ✅ Nginx reverse proxy
- ✅ Next.js code splitting
- ✅ Image/web font optimization
- ✅ Production deployment guide

You're production-ready! 🚀
