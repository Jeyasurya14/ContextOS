# Razorpay Quick Start - 15 Minutes Setup

Follow these steps to get Razorpay working in 15 minutes.

---

## ⚡ Quick Setup Steps

### 1️⃣ Get API Keys (2 minutes)

1. Go to: https://dashboard.razorpay.com/signup
2. Sign up and login
3. Switch to **Test Mode** (toggle at top right)
4. Go to: **Settings → API Keys**
5. Click **"Generate Test Keys"**
6. Copy both:
   - Key ID: `rzp_test_XXXXXXXX`
   - Key Secret: `YYYYYYYYYYYY`

### 2️⃣ Create Payment Plans (5 minutes)

1. Go to: **Products → Subscriptions → Plans**
2. Click **"+ Create Plan"**

**Create 3 Plans:**

**Free Plan:**
```
Name: Free Plan
Amount: ₹0
Interval: 1 month
```

**Pro Plan:**
```
Name: Pro Plan
Amount: ₹999
Interval: 1 month
Trial: 7 days (optional)
```

**Team Plan:**
```
Name: Team Plan
Amount: ₹2999
Interval: 1 month
Trial: 14 days (optional)
```

3. Copy each Plan ID after creation (e.g., `plan_XXXXXXXX`)

### 3️⃣ Set Up Webhook (3 minutes)

1. Go to: **Settings → Webhooks**
2. Click **"+ Add New Webhook"**

**For Local Testing:**
```
URL: https://your-ngrok-url.ngrok.io/api/v1/billing/webhook
```

**For Production:**
```
URL: https://your-backend-domain.com/api/v1/billing/webhook
```

3. Select these events:
   - ✅ payment.captured
   - ✅ payment.failed
   - ✅ subscription.activated
   - ✅ subscription.charged
   - ✅ subscription.cancelled

4. Click **Save**
5. Copy the **Webhook Secret** (starts with `whsec_`)

### 4️⃣ Update Backend .env (2 minutes)

Edit `backend/.env` and add:

```bash
# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=your_key_secret_here

# Webhook Secret
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Plan IDs (paste the IDs you copied)
RAZORPAY_PLAN_FREE=plan_free_XXXXXXXX
RAZORPAY_PLAN_PRO=plan_pro_XXXXXXXX
RAZORPAY_PLAN_TEAM=plan_team_XXXXXXXX

# Currency
RAZORPAY_CURRENCY=INR
```

### 5️⃣ Install Razorpay SDK (1 minute)

```bash
cd backend
pip install razorpay
pip freeze > requirements.txt
```

### 6️⃣ Restart Backend (1 minute)

```bash
# Stop current backend (Ctrl+C)
# Start again
uvicorn main:app --reload --port 8000
```

### 7️⃣ Test Integration (1 minute)

**Test Card:**
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date (e.g., 12/25)
```

---

## ✅ Verification Checklist

- [ ] Razorpay account created
- [ ] Test API keys obtained
- [ ] 3 payment plans created
- [ ] Webhook configured
- [ ] Backend .env updated with all credentials
- [ ] Razorpay SDK installed
- [ ] Backend restarted
- [ ] Test payment successful

---

## 🚀 Next Steps

1. **Test the payment flow** in your frontend
2. **Check webhook logs** in Razorpay dashboard
3. **Verify subscriptions** are created in database
4. **Complete KYC** for live mode (when ready)
5. **Switch to live keys** for production

---

## 📚 Full Documentation

For detailed information, see: `RAZORPAY_SETUP_GUIDE.md`

---

## 🆘 Need Help?

**Common Issues:**

1. **"Invalid Key" error**
   - Check you're in Test Mode
   - Verify keys are copied correctly
   - No extra spaces in .env file

2. **Webhook not working**
   - Use ngrok for local testing
   - Check webhook URL is accessible
   - Verify webhook secret is correct

3. **Plan not found**
   - Ensure plan IDs are correct
   - Check plans are active in dashboard

**Support:**
- Razorpay Docs: https://razorpay.com/docs/
- Support: https://razorpay.com/support/
