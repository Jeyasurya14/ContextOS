# 🚨 CRITICAL SECURITY BREACH - REMEDIATION GUIDE

**Date**: March 26, 2026
**Severity**: CRITICAL
**Exposed Secrets**:
1. Slack Application Credentials
2. Slack Signing Secret  
3. PostgreSQL URI (Database Connection String)

---

## ⚠️ IMMEDIATE ACTIONS (Do These NOW)

### Step 1: Revoke Slack Credentials (5 minutes)

1. **Go to Slack API Dashboard**:
   - Visit: https://api.slack.com/apps
   - Sign in with your Slack workspace

2. **Find Your ContextOS App**:
   - Look for "ContextOS" or your app name
   - Click on it

3. **Regenerate Signing Secret**:
   - Go to: Settings → Basic Information
   - Scroll to "App Credentials"
   - Click "Regenerate" next to "Signing Secret"
   - **COPY AND SAVE** the new secret immediately
   - Store it in a password manager (NOT in code)

4. **Regenerate Bot Token**:
   - Go to: Features → OAuth & Permissions
   - Find "Bot User OAuth Token"
   - Click "Regenerate Token"
   - **COPY AND SAVE** the new token (starts with `xoxb-`)
   - Store it in a password manager

5. **Update Your Backend .env File**:
   ```bash
   cd backend
   # Edit .env file with new credentials
   SLACK_BOT_TOKEN=xoxb-your-new-token
   SLACK_SIGNING_SECRET=your-new-signing-secret
   ```

---

### Step 2: Rotate Database Password (5 minutes)

**If using Render.com**:
1. Go to: https://dashboard.render.com
2. Select your PostgreSQL database
3. Go to "Info" tab
4. Click "Rotate Password"
5. Copy the new connection string
6. Update backend/.env:
   ```
   DATABASE_URL=postgresql://new-connection-string
   ```

**If using Railway/Supabase/Other**:
1. Go to your database provider dashboard
2. Find password rotation/reset option
3. Generate new password
4. Update connection string in backend/.env

---

### Step 3: Remove Secrets from Git History

**Option A: Using git-filter-repo (Recommended)**

```bash
# Install git-filter-repo
pip install git-filter-repo

# Create a backup first
cd ..
cp -r contextos contextos-backup

# Go back to repo
cd contextos

# Create a file with patterns to remove
cat > secrets-to-remove.txt << EOF
SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET
DATABASE_URL
postgres://
xoxb-
EOF

# Remove secrets from history
git filter-repo --replace-text secrets-to-remove.txt --force

# Force push to GitHub (THIS WILL REWRITE HISTORY)
git push origin --force --all
git push origin --force --tags
```

**Option B: Using BFG Repo-Cleaner**

```bash
# Download BFG
# Visit: https://rtyley.github.io/bfg-repo-cleaner/

# Create backup
cd ..
cp -r contextos contextos-backup

# Run BFG to remove secrets
java -jar bfg.jar --delete-files ".env" contextos

# Clean up
cd contextos
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

**Option C: Manual Removal (If above don't work)**

```bash
# Remove sensitive commits
git rebase -i HEAD~50  # Adjust number based on when secrets were added

# In the editor, change 'pick' to 'drop' for commits with secrets
# Save and exit

# Force push
git push origin --force --all
```

---

### Step 4: Update Production Environment Variables

**Vercel (Admin Panel)**:
1. Go to: https://vercel.com/dashboard
2. Select your admin project
3. Settings → Environment Variables
4. Update `NEXT_PUBLIC_API_URL` if needed

**Render (Backend)**:
1. Go to: https://dashboard.render.com
2. Select your backend service
3. Environment → Environment Variables
4. Update:
   - `SLACK_BOT_TOKEN` = new token
   - `SLACK_SIGNING_SECRET` = new secret
   - `DATABASE_URL` = new connection string
5. Click "Save Changes"
6. Service will auto-redeploy

---

### Step 5: Verify Security

```bash
# Check no secrets in current code
cd contextos
grep -r "xoxb-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "postgres://" . --exclude-dir=node_modules --exclude-dir=.git

# Should return no results

# Check .gitignore is correct
cat .gitignore | grep -E "\.env$|\.env\.local"

# Should show .env files are ignored
```

---

### Step 6: Restart All Services

```bash
# Restart backend
cd backend
# If using Render, it auto-restarts after env var changes

# Test backend
curl https://your-backend-url.com/health

# Test Slack integration
# Send a test message in Slack to verify new credentials work
```

---

## 🔒 PREVENTION - Never Let This Happen Again

### 1. Update .gitignore

Ensure these are in your `.gitignore`:
```
# Environment files
.env
.env.local
.env.production
.env.*.local
*.env

# Secrets
secrets/
credentials/
*.pem
*.key
```

### 2. Use Environment Variables Only

**NEVER** commit:
- API keys
- Passwords
- Database URLs
- OAuth tokens
- Signing secrets

**ALWAYS** use:
- `.env` files (gitignored)
- Environment variables in deployment platforms
- Secret management services

### 3. Pre-commit Hook

Install git-secrets to prevent future leaks:
```bash
# Install git-secrets
brew install git-secrets  # macOS
# or download from: https://github.com/awslabs/git-secrets

# Set up in your repo
cd contextos
git secrets --install
git secrets --register-aws
git secrets --add 'xoxb-[0-9]+'
git secrets --add 'postgres://[^[:space:]]+'
```

### 4. Regular Security Audits

- Review GitGuardian alerts immediately
- Rotate credentials quarterly
- Audit git history monthly
- Use tools like `truffleHog` to scan for secrets

---

## 📋 Checklist

- [ ] Slack Bot Token regenerated
- [ ] Slack Signing Secret regenerated
- [ ] Database password rotated
- [ ] Backend .env updated with new credentials
- [ ] Git history cleaned (secrets removed)
- [ ] Force pushed to GitHub
- [ ] Render environment variables updated
- [ ] Backend service restarted
- [ ] Slack integration tested
- [ ] Database connection tested
- [ ] .gitignore verified
- [ ] Pre-commit hooks installed
- [ ] GitGuardian alerts resolved

---

## 🆘 If You Need Help

1. **Can't access Slack API**: Contact your Slack workspace admin
2. **Can't rotate database**: Contact your database provider support
3. **Git history issues**: Create a new repo and migrate clean code
4. **Services not working**: Check logs in Render dashboard

---

## ⚡ Quick Commands Reference

```bash
# Check for exposed secrets locally
grep -r "xoxb-" . --exclude-dir={node_modules,.git}
grep -r "postgres://" . --exclude-dir={node_modules,.git}

# View recent commits
git log --oneline -20

# Check what's in .env (should be gitignored)
git ls-files | grep .env

# Force push after cleaning
git push origin --force --all

# Verify secrets are gone from GitHub
# Visit: https://github.com/Jeyasurya14/ContextOS
# Search for "xoxb-" or "postgres://"
```

---

**IMPORTANT**: After completing all steps, reply to the GitGuardian emails to confirm the issues are resolved.
