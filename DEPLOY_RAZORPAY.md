# Deploy Razorpay to Production - Quick Guide

Your Razorpay credentials are now secure in `backend/.env`. Follow these steps to deploy to production.

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Update Render Environment Variables

1. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com
   - Sign in and select your backend service

2. **Navigate to Environment Variables**:
   - Click on your service name
   - Go to: **Environment** tab (left sidebar)
   - Scroll to **Environment Variables** section

3. **Add Razorpay Variables**:
   Click **"Add Environment Variable"** for each:

```bash
# Variable Name: RAZORPAY_KEY_ID
# Value: [Paste your Key ID from backend/.env]

# Variable Name: RAZORPAY_KEY_SECRET
# Value: [Paste your Key Secret from backend/.env]

# Variable Name: RAZORPAY_WEBHOOK_SECRET
# Value: [Paste your Webhook Secret from backend/.env]

# Variable Name: RAZORPAY_PLAN_FREE
# Value: [Paste your Free Plan ID from backend/.env]

# Variable Name: RAZORPAY_PLAN_PRO
# Value: [Paste your Pro Plan ID from backend/.env]

# Variable Name: RAZORPAY_PLAN_TEAM
# Value: [Paste your Team Plan ID from backend/.env]

# Variable Name: RAZORPAY_CURRENCY
# Value: INR
```

4. **Save Changes**:
   - Click **"Save Changes"** button at the bottom
   - Render will automatically redeploy your service (takes ~2-3 minutes)

### Step 2: Verify Deployment

Wait for the deployment to complete, then test:

```bash
# Check if backend is running
curl https://contextos-api-jxdr.onrender.com/health

# Should return: {"status": "healthy"}
```

### Step 3: Test Razorpay Integration

1. **Go to your frontend**: https://contextos.learnmade.in
2. **Login** with your account
3. **Try to upgrade** to Pro plan
4. **Use test card**:
   ```
   Card: 4111 1111 1111 1111
   CVV: 123
   Expiry: 12/25
   ```
5. **Verify** subscription created successfully

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend health check passes
- [ ] Can access billing page in frontend
- [ ] Test payment succeeds
- [ ] Webhook received (check Razorpay dashboard)
- [ ] User plan upgraded in database
- [ ] No errors in Render logs

---

## 🔍 Check Render Logs

To view logs and verify Razorpay is working:

1. Go to Render Dashboard
2. Select your backend service
3. Click **"Logs"** tab
4. Look for:
   - `Razorpay client initialized`
   - `Webhook received: payment.captured`
   - `Subscription created for user: [user_id]`

---

## 🆘 Troubleshooting

### Issue: "Invalid Key" Error

**Solution:**
1. Verify you copied the correct keys from `backend/.env`
2. Check for extra spaces in Render environment variables
3. Ensure you're using test keys (start with `rzp_test_`)
4. Restart the service manually if needed

### Issue: Webhook Not Received

**Solution:**
1. Check webhook URL in Razorpay dashboard
2. Verify it's: `https://contextos-api-jxdr.onrender.com/api/v1/billing/webhook`
3. Check webhook secret matches in Render
4. Review webhook logs in Razorpay dashboard

### Issue: Payment Fails

**Solution:**
1. Check Razorpay dashboard for error details
2. Verify plan IDs are correct
3. Ensure you're in Test Mode
4. Try a different test card

---

## 📊 Monitor Your Deployment

### Razorpay Dashboard
- Payments: https://dashboard.razorpay.com/app/payments
- Webhooks: https://dashboard.razorpay.com/app/webhooks
- Plans: https://dashboard.razorpay.com/app/subscriptions/plans

### Render Dashboard
- Logs: https://dashboard.render.com/web/[your-service]/logs
- Metrics: https://dashboard.render.com/web/[your-service]/metrics
- Events: https://dashboard.render.com/web/[your-service]/events

---

## 🎯 Next Steps

1. ✅ Deploy to Render (follow steps above)
2. ✅ Test payment flow
3. ✅ Monitor for 24 hours
4. ✅ Complete KYC for live mode (when ready)
5. ✅ Switch to live keys for production

---

## 🔒 Security Reminder

**NEVER commit these to git:**
- ❌ `backend/.env` (contains real secrets)
- ❌ API keys
- ❌ Webhook secrets
- ❌ Database passwords

**ALWAYS use:**
- ✅ Environment variables in Render
- ✅ `.env` files locally (gitignored)
- ✅ `.env.example` for templates (no real secrets)

---

**Your Razorpay integration is now production-ready and secure!** 🎉

For detailed security information, see: `RAZORPAY_PRODUCTION_SECURITY.md`
