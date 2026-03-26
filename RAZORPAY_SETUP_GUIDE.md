# Razorpay Integration Guide - ContextOS

Complete guide to set up Razorpay payment gateway with API keys, webhooks, and subscription plans.

---

## Table of Contents
1. [Getting Razorpay API Keys](#1-getting-razorpay-api-keys)
2. [Setting Up Webhooks](#2-setting-up-webhooks)
3. [Creating Payment Plans](#3-creating-payment-plans)
4. [Backend Configuration](#4-backend-configuration)
5. [Testing the Integration](#5-testing-the-integration)

---

## 1. Getting Razorpay API Keys

### Step 1: Create Razorpay Account
1. Go to https://dashboard.razorpay.com/signup
2. Sign up with your business email
3. Complete KYC verification (required for live mode)

### Step 2: Get Test API Keys (For Development)

1. **Login to Razorpay Dashboard**:
   - Visit: https://dashboard.razorpay.com/

2. **Switch to Test Mode**:
   - Look for the toggle at the top right
   - Switch to "Test Mode" (it should show a blue badge)

3. **Generate API Keys**:
   - Go to: Settings → API Keys
   - Or visit: https://dashboard.razorpay.com/app/keys
   - Click "Generate Test Keys" (if not already generated)

4. **Copy Your Keys**:
   ```
   Key ID: rzp_test_XXXXXXXXXXXXXXXX
   Key Secret: YYYYYYYYYYYYYYYYYYYYYYYY
   ```
   
5. **Store Securely**:
   - **NEVER** commit these to git
   - Add to `backend/.env` file only
   - Use environment variables in production

### Step 3: Get Live API Keys (For Production)

⚠️ **Only after KYC verification is complete**

1. Switch to "Live Mode" in dashboard
2. Go to Settings → API Keys
3. Click "Generate Live Keys"
4. Copy and store securely:
   ```
   Key ID: rzp_live_XXXXXXXXXXXXXXXX
   Key Secret: YYYYYYYYYYYYYYYYYYYYYYYY
   ```

---

## 2. Setting Up Webhooks

Webhooks allow Razorpay to notify your backend about payment events in real-time.

### Step 1: Create Webhook Endpoint in Your Backend

Your backend already has a webhook endpoint at:
```
POST /api/v1/billing/webhook
```

This endpoint handles:
- `payment.captured` - Successful payment
- `payment.failed` - Failed payment
- `subscription.activated` - Subscription started
- `subscription.charged` - Recurring payment
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed

### Step 2: Configure Webhook in Razorpay Dashboard

1. **Go to Webhooks Settings**:
   - Visit: https://dashboard.razorpay.com/app/webhooks
   - Or: Settings → Webhooks

2. **Create New Webhook**:
   - Click "+ Add New Webhook"

3. **Configure Webhook URL**:
   
   **For Development (Local Testing)**:
   ```
   URL: https://your-ngrok-url.ngrok.io/api/v1/billing/webhook
   ```
   
   **For Production**:
   ```
   URL: https://your-backend-domain.com/api/v1/billing/webhook
   ```

4. **Select Events**:
   Check these events:
   - ✅ `payment.authorized`
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `subscription.activated`
   - ✅ `subscription.charged`
   - ✅ `subscription.cancelled`
   - ✅ `subscription.paused`
   - ✅ `subscription.resumed`
   - ✅ `subscription.completed`

5. **Set Alert Email** (Optional):
   - Add your email to receive webhook failure alerts

6. **Save Webhook**

7. **Copy Webhook Secret**:
   - After saving, you'll see a "Secret" field
   - Copy this secret (starts with `whsec_`)
   - Add to your `backend/.env`:
   ```bash
   RAZORPAY_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
   ```

### Step 3: Test Webhook (Local Development)

If testing locally, use ngrok to expose your local server:

```bash
# Install ngrok
# Download from: https://ngrok.com/download

# Start your backend
cd backend
uvicorn main:app --reload --port 8000

# In another terminal, start ngrok
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in Razorpay webhook settings
```

---

## 3. Creating Payment Plans

Razorpay supports two types of plans:
1. **Standard Plans** - Fixed pricing
2. **Metered Plans** - Usage-based pricing

### Step 1: Create Plans via Razorpay Dashboard

#### Option A: Using Dashboard UI

1. **Go to Subscriptions**:
   - Visit: https://dashboard.razorpay.com/app/subscriptions/plans
   - Or: Products → Subscriptions → Plans

2. **Create New Plan**:
   - Click "+ Create Plan"

3. **Configure Plan Details**:

   **For Free Plan**:
   ```
   Plan Name: Free Plan
   Plan ID: plan_free (auto-generated, you can customize)
   Billing Amount: ₹0
   Billing Interval: 1 month
   Description: Free tier with basic features
   ```

   **For Pro Plan**:
   ```
   Plan Name: Pro Plan
   Plan ID: plan_pro
   Billing Amount: ₹999
   Billing Interval: 1 month
   Description: Pro tier with advanced features
   Trial Period: 7 days (optional)
   ```

   **For Team Plan**:
   ```
   Plan Name: Team Plan
   Plan ID: plan_team
   Billing Amount: ₹2999
   Billing Interval: 1 month
   Description: Team tier with collaboration features
   Trial Period: 14 days (optional)
   ```

4. **Save Plan**

5. **Copy Plan IDs**:
   - After creating, copy the Plan ID (e.g., `plan_XXXXXXXXXXXXXXXX`)
   - You'll need these for your backend configuration

#### Option B: Using Razorpay API (Programmatic)

Create plans via API:

```bash
# Create Pro Plan
curl -X POST https://api.razorpay.com/v1/plans \
  -u rzp_test_XXXXXXXX:YOUR_KEY_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "period": "monthly",
    "interval": 1,
    "item": {
      "name": "Pro Plan",
      "amount": 99900,
      "currency": "INR",
      "description": "Pro tier with advanced features"
    }
  }'
```

Response:
```json
{
  "id": "plan_XXXXXXXXXXXXXXXX",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "id": "item_XXXXXXXXXXXXXXXX",
    "active": true,
    "name": "Pro Plan",
    "description": "Pro tier with advanced features",
    "amount": 99900,
    "currency": "INR"
  }
}
```

### Step 2: Configure Plans in Your Backend

Update `backend/.env` with your plan IDs:

```bash
# Razorpay Plan IDs
RAZORPAY_PLAN_FREE=plan_free_XXXXXXXX
RAZORPAY_PLAN_PRO=plan_pro_XXXXXXXX
RAZORPAY_PLAN_TEAM=plan_team_XXXXXXXX
```

---

## 4. Backend Configuration

### Step 1: Update Environment Variables

Edit `backend/.env`:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX

# Razorpay Plan IDs
RAZORPAY_PLAN_FREE=plan_free_XXXXXXXX
RAZORPAY_PLAN_PRO=plan_pro_XXXXXXXX
RAZORPAY_PLAN_TEAM=plan_team_XXXXXXXX

# Currency
RAZORPAY_CURRENCY=INR
```

### Step 2: Verify Backend Configuration

Check that your backend config file has Razorpay settings:

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    # ... other settings ...
    
    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_PLAN_FREE: str = ""
    RAZORPAY_PLAN_PRO: str = ""
    RAZORPAY_PLAN_TEAM: str = ""
    RAZORPAY_CURRENCY: str = "INR"
```

### Step 3: Install Razorpay Python SDK

```bash
cd backend
pip install razorpay
pip freeze > requirements.txt
```

### Step 4: Restart Backend

```bash
# Local development
uvicorn main:app --reload --port 8000

# Production (Render will auto-restart after env var changes)
```

---

## 5. Testing the Integration

### Step 1: Test API Keys

Create a simple test script:

```python
# backend/test_razorpay.py
import razorpay
from app.core.config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

# Test: Fetch all plans
try:
    plans = client.plan.all()
    print("✅ Razorpay API connection successful!")
    print(f"Found {len(plans['items'])} plans")
    for plan in plans['items']:
        print(f"  - {plan['item']['name']}: {plan['id']}")
except Exception as e:
    print(f"❌ Error: {e}")
```

Run the test:
```bash
cd backend
python test_razorpay.py
```

### Step 2: Test Subscription Creation

Use Razorpay's test cards:

**Test Card Numbers**:
```
Success: 4111 1111 1111 1111
Failure: 4111 1111 1111 1112
CVV: Any 3 digits
Expiry: Any future date
```

**Test UPI IDs**:
```
Success: success@razorpay
Failure: failure@razorpay
```

### Step 3: Test Webhook

1. **Trigger a test payment** in test mode
2. **Check webhook logs** in Razorpay dashboard:
   - Go to: Settings → Webhooks
   - Click on your webhook
   - View "Recent Deliveries"
3. **Check your backend logs** for webhook processing

### Step 4: Verify Database Updates

After a successful test payment:

```bash
# Check if subscription was created
cd backend
python -c "
from app.core.database import engine
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

async def check():
    async with AsyncSession(engine) as db:
        result = await db.execute(text('SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 5'))
        events = result.fetchall()
        print('Recent billing events:')
        for event in events:
            print(f'  - {event}')

asyncio.run(check())
"
```

---

## 6. Production Checklist

Before going live:

- [ ] Complete KYC verification in Razorpay
- [ ] Switch to Live API keys
- [ ] Update webhook URL to production domain
- [ ] Test with real payment (small amount)
- [ ] Set up webhook monitoring/alerts
- [ ] Configure proper error handling
- [ ] Set up payment reconciliation
- [ ] Add payment retry logic
- [ ] Implement dunning management (for failed payments)
- [ ] Set up customer support for payment issues

---

## 7. Common Issues & Solutions

### Issue 1: Webhook Not Receiving Events

**Solution**:
- Verify webhook URL is publicly accessible
- Check webhook secret is correct in `.env`
- Ensure backend is running
- Check Razorpay webhook logs for delivery status
- Verify firewall/security groups allow Razorpay IPs

### Issue 2: Payment Fails with "Invalid Key"

**Solution**:
- Verify you're using the correct mode (test/live)
- Check API keys are correct in `.env`
- Ensure no extra spaces in keys
- Restart backend after updating keys

### Issue 3: Subscription Not Created

**Solution**:
- Check plan ID exists in Razorpay
- Verify plan is active
- Check customer email is valid
- Review backend logs for errors

### Issue 4: Webhook Signature Verification Failed

**Solution**:
- Ensure webhook secret is correct
- Check you're using the right secret for test/live mode
- Verify request body is not modified before verification

---

## 8. Razorpay Dashboard URLs

**Test Mode**:
- Dashboard: https://dashboard.razorpay.com/
- API Keys: https://dashboard.razorpay.com/app/keys
- Webhooks: https://dashboard.razorpay.com/app/webhooks
- Plans: https://dashboard.razorpay.com/app/subscriptions/plans
- Transactions: https://dashboard.razorpay.com/app/payments

**Documentation**:
- API Docs: https://razorpay.com/docs/api/
- Subscriptions: https://razorpay.com/docs/payments/subscriptions/
- Webhooks: https://razorpay.com/docs/webhooks/
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/

---

## 9. Security Best Practices

1. **Never commit API keys to git**
   - Use `.env` files (gitignored)
   - Use environment variables in production

2. **Always verify webhook signatures**
   - Prevents unauthorized webhook calls
   - Already implemented in backend

3. **Use HTTPS for webhooks**
   - Razorpay requires HTTPS for live mode
   - Use SSL certificates in production

4. **Rotate keys periodically**
   - Regenerate API keys every 6 months
   - Update in all environments

5. **Monitor webhook failures**
   - Set up alerts for failed webhooks
   - Review logs regularly

6. **Implement rate limiting**
   - Prevent abuse of payment endpoints
   - Already implemented in backend

---

## 10. Next Steps

1. ✅ Get Razorpay API keys
2. ✅ Configure webhooks
3. ✅ Create payment plans
4. ✅ Update backend `.env`
5. ✅ Test integration
6. 🔄 Go live after KYC verification

---

**Need Help?**
- Razorpay Support: https://razorpay.com/support/
- Documentation: https://razorpay.com/docs/
- Community: https://community.razorpay.com/
