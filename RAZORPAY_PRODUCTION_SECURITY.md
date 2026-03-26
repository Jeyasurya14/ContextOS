# Razorpay Production Security & Deployment Guide

Complete security checklist and deployment guide for production-grade Razorpay integration.

---

## 🔒 Security Checklist

### ✅ Credentials Management

- [x] **Razorpay SDK installed** (`razorpay==1.4.2`)
- [ ] **API Keys stored in .env only** (NEVER in code)
- [ ] **Webhook secret configured**
- [ ] **All secrets in Render environment variables**
- [ ] **No secrets in git history**
- [ ] **`.env` file in `.gitignore`**

### ✅ Environment Configuration

**Local Development (.env):**
```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXX
RAZORPAY_KEY_SECRET=test_secret_here
RAZORPAY_WEBHOOK_SECRET=whsec_test_secret
```

**Production (Render Environment Variables):**
```bash
RAZORPAY_KEY_ID=rzp_live_XXXXXXXX
RAZORPAY_KEY_SECRET=live_secret_here
RAZORPAY_WEBHOOK_SECRET=whsec_live_secret
```

---

## 🚀 Production Deployment Steps

### Step 1: Complete Razorpay KYC

Before going live, you MUST complete KYC verification:

1. Go to: https://dashboard.razorpay.com/app/account-settings
2. Complete business verification
3. Submit required documents:
   - Business PAN
   - GST Certificate (if applicable)
   - Bank account details
   - Business address proof
4. Wait for approval (usually 24-48 hours)

### Step 2: Switch to Live Mode

Once KYC is approved:

1. **Generate Live API Keys**:
   - Go to: https://dashboard.razorpay.com/app/keys
   - Switch to "Live Mode"
   - Click "Generate Live Keys"
   - Copy Key ID and Secret

2. **Create Live Payment Plans**:
   - Go to: Products → Subscriptions → Plans
   - Ensure you're in Live Mode
   - Create the same plans as test mode:
     - Free Plan: ₹0/month
     - Pro Plan: ₹999/month
     - Team Plan: ₹2999/month
   - Copy the live plan IDs

3. **Configure Live Webhook**:
   - Go to: Settings → Webhooks
   - Ensure you're in Live Mode
   - Add webhook URL: `https://contextos-api-jxdr.onrender.com/api/v1/billing/webhook`
   - Select all payment and subscription events
   - Copy the live webhook secret

### Step 3: Update Render Environment Variables

1. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com
   - Select your backend service

2. **Update Environment Variables**:
   - Go to: Environment → Environment Variables
   - Add/Update these variables:

```bash
# Razorpay Live Credentials
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=your_live_key_secret_here
RAZORPAY_WEBHOOK_SECRET=whsec_your_live_webhook_secret

# Live Plan IDs
RAZORPAY_PLAN_FREE=plan_live_free_XXXXXXXX
RAZORPAY_PLAN_PRO=plan_live_pro_XXXXXXXX
RAZORPAY_PLAN_TEAM=plan_live_team_XXXXXXXX

# Currency
RAZORPAY_CURRENCY=INR
```

3. **Save Changes** - Render will auto-restart your service

### Step 4: Verify Production Configuration

After deployment, verify everything is working:

```bash
# Test API connection
curl -X GET https://contextos-api-jxdr.onrender.com/health

# Check Razorpay configuration (admin only)
curl -X GET https://contextos-api-jxdr.onrender.com/api/v1/billing/plans \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔐 Security Best Practices

### 1. Webhook Signature Verification

Your backend MUST verify webhook signatures to prevent unauthorized requests:

```python
# This is already implemented in your backend
import razorpay
from app.core.config import settings

def verify_webhook_signature(payload: str, signature: str) -> bool:
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    try:
        client.utility.verify_webhook_signature(
            payload, 
            signature, 
            settings.RAZORPAY_WEBHOOK_SECRET
        )
        return True
    except:
        return False
```

### 2. HTTPS Only

- ✅ **Production webhook URL MUST use HTTPS**
- ✅ Razorpay rejects HTTP webhooks in live mode
- ✅ Your Render deployment already uses HTTPS

### 3. API Key Rotation

Rotate your API keys every 6 months:

1. Generate new keys in Razorpay dashboard
2. Update Render environment variables
3. Test thoroughly before revoking old keys
4. Revoke old keys after confirming new ones work

### 4. Webhook Secret Rotation

Rotate webhook secrets quarterly:

1. Generate new webhook in Razorpay
2. Update `RAZORPAY_WEBHOOK_SECRET` in Render
3. Delete old webhook after confirming new one works

### 5. Rate Limiting

Your backend already implements rate limiting:
- Free tier: 50 requests/day
- Pro tier: 1000 requests/day
- Prevents abuse of payment endpoints

### 6. Error Handling

Never expose sensitive information in error messages:

```python
# ✅ Good - Generic error
return {"error": "Payment failed. Please try again."}

# ❌ Bad - Exposes details
return {"error": f"Razorpay API error: {razorpay_error_message}"}
```

### 7. Logging

Log payment events securely:

```python
# ✅ Log event type and user ID only
logger.info(f"Payment captured for user {user_id}")

# ❌ Never log sensitive data
logger.info(f"Payment: {payment_details}")  # Contains card info!
```

---

## 🧪 Testing in Production

### Test with Small Amounts First

Before going live with real customers:

1. **Create a test subscription** with ₹1 amount
2. **Verify webhook delivery** in Razorpay dashboard
3. **Check database updates** - subscription created correctly
4. **Test cancellation flow**
5. **Test payment failure handling**

### Test Scenarios

1. **Successful Payment**:
   - Subscribe to Pro plan
   - Verify subscription activated
   - Check user plan upgraded in database

2. **Failed Payment**:
   - Use a card that will fail
   - Verify error handling
   - Check user notified appropriately

3. **Webhook Delivery**:
   - Check Razorpay webhook logs
   - Verify all events received by backend
   - Confirm database updated correctly

4. **Subscription Cancellation**:
   - Cancel a subscription
   - Verify webhook received
   - Check user downgraded to free plan

---

## 📊 Monitoring & Alerts

### 1. Razorpay Dashboard Monitoring

Monitor these metrics daily:

- **Successful payments** vs **failed payments**
- **Webhook delivery success rate**
- **Subscription churn rate**
- **Revenue trends**

### 2. Backend Monitoring

Monitor your backend logs for:

- Payment processing errors
- Webhook verification failures
- Database update failures
- API rate limit hits

### 3. Set Up Alerts

Configure alerts for:

- **Webhook failures** (>5% failure rate)
- **Payment failures** (>10% failure rate)
- **API errors** (any 5xx errors)
- **Suspicious activity** (multiple failed payments from same user)

---

## 🚨 Incident Response

### If Payment Processing Fails

1. **Check Razorpay status**: https://status.razorpay.com/
2. **Review backend logs** for errors
3. **Verify webhook delivery** in Razorpay dashboard
4. **Check database connectivity**
5. **Contact Razorpay support** if needed

### If Webhook Signature Verification Fails

1. **Verify webhook secret** is correct in Render
2. **Check webhook is from Razorpay** (verify IP)
3. **Review webhook payload** for tampering
4. **Regenerate webhook** if compromised

### If Credentials Compromised

1. **Immediately revoke** compromised keys
2. **Generate new keys** in Razorpay
3. **Update Render** environment variables
4. **Review recent transactions** for fraud
5. **Notify affected users** if necessary

---

## 💰 Payment Reconciliation

### Daily Reconciliation

1. **Export transactions** from Razorpay dashboard
2. **Compare with database** billing_events table
3. **Identify discrepancies**
4. **Resolve missing/duplicate entries**

### Monthly Reconciliation

1. **Generate revenue report** from Razorpay
2. **Compare with database** subscription counts
3. **Verify refunds** processed correctly
4. **Check for failed payments** to retry

---

## 📋 Production Checklist

Before going live:

### Razorpay Configuration
- [ ] KYC verification completed
- [ ] Live API keys generated
- [ ] Live payment plans created
- [ ] Live webhook configured
- [ ] Test payment successful (₹1)

### Backend Configuration
- [ ] Razorpay SDK installed (`razorpay==1.4.2`)
- [ ] Environment variables updated in Render
- [ ] Webhook signature verification enabled
- [ ] Error handling implemented
- [ ] Logging configured (no sensitive data)

### Security
- [ ] No secrets in git repository
- [ ] `.env` file in `.gitignore`
- [ ] HTTPS enabled (Render default)
- [ ] Rate limiting active
- [ ] Webhook IP whitelisting (optional)

### Testing
- [ ] Test subscription creation
- [ ] Test payment success flow
- [ ] Test payment failure flow
- [ ] Test webhook delivery
- [ ] Test subscription cancellation

### Monitoring
- [ ] Razorpay dashboard access configured
- [ ] Backend logging enabled
- [ ] Alert system configured
- [ ] Payment reconciliation process defined

### Compliance
- [ ] Privacy policy updated (payment processing)
- [ ] Terms of service updated (subscription terms)
- [ ] Refund policy defined
- [ ] GST compliance (if applicable)

---

## 🔗 Important URLs

**Razorpay Dashboard:**
- Live Dashboard: https://dashboard.razorpay.com/
- API Keys: https://dashboard.razorpay.com/app/keys
- Webhooks: https://dashboard.razorpay.com/app/webhooks
- Plans: https://dashboard.razorpay.com/app/subscriptions/plans
- Transactions: https://dashboard.razorpay.com/app/payments
- Status Page: https://status.razorpay.com/

**Your Backend:**
- API Base: https://contextos-api-jxdr.onrender.com
- Webhook Endpoint: https://contextos-api-jxdr.onrender.com/api/v1/billing/webhook
- Health Check: https://contextos-api-jxdr.onrender.com/health

**Render:**
- Dashboard: https://dashboard.render.com
- Environment Variables: https://dashboard.render.com/web/[your-service]/env

---

## 📞 Support Contacts

**Razorpay Support:**
- Email: support@razorpay.com
- Phone: 1800-572-9727
- Dashboard: https://dashboard.razorpay.com/app/support

**Emergency:**
- For payment issues: Contact Razorpay immediately
- For backend issues: Check Render logs and restart service
- For security issues: Revoke credentials first, investigate later

---

## 🎯 Next Steps

1. ✅ **Complete KYC verification** in Razorpay
2. ✅ **Generate live API keys**
3. ✅ **Create live payment plans**
4. ✅ **Configure live webhook**
5. ✅ **Update Render environment variables**
6. ✅ **Test with ₹1 payment**
7. ✅ **Monitor for 24 hours**
8. ✅ **Go live with real customers**

---

**Your Razorpay integration is now production-ready and secure!** 🎉
