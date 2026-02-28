# DepMi — Messaging & OTP Setup Guide

This guide covers the OTP verification stack and WhatsApp Business setup for DepMi.
Read top-to-bottom the first time; use as a reference later.

> **Decision log:** WhatsApp OTP was considered and dropped. WhatsApp is 10x more expensive
> than email and requires weeks of Meta approval. Email + SMS OTP is the correct stack for MVP.
> WhatsApp is reserved for **rich notifications only** (order updates, vendor alerts).

---

## Part 1 — OTP Stack (What We're Using)

### Actual Termii Pricing (verified Feb 2026)

| Channel | Price | Use |
|---------|-------|-----|
| **Email** | $0.0009/msg | Account verification OTP |
| **SMS** | $0.0036/msg | Phone number verification OTP (TIER_0) |
| **WhatsApp** | $0.009/msg | Rich notifications only — NOT for OTP |

### Why Not WhatsApp for OTP

- 10x more expensive than email ($0.009 vs $0.0009)
- 2.5x more expensive than SMS
- Requires Meta Business verification (3–14 days) before a single message can be sent
- OTP is a bad fit for WhatsApp — plain SMS and email are faster to receive and universally understood

### OTP Provider: Termii + Resend

| Task | Provider | Cost |
|------|----------|------|
| **Email OTP** (account verification) | **Resend** | Free (3,000 emails/month) |
| **SMS OTP** (phone verification → TIER_0) | **Termii** | $0.0036/SMS |
| **Rich notifications** (orders, bids, payouts) | **Termii WhatsApp** | $0.009/msg (after Meta setup) |

**Cost at MVP scale (500 users, 500 email OTPs + 300 SMS OTPs):**
- Resend: $0 (within free tier)
- Termii SMS: ~$1.08
- Total OTP cost: **~$1**

---

### Resend Setup (Email OTP — do this first)

1. Sign up at [resend.com](https://resend.com) — free, no card required
2. Add and verify your domain (depmi.com) via DNS TXT record
3. Create an API key → copy to `.env.local`
4. Install: `npm install resend` in `web/`

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@depmi.com
```

### Termii Setup (SMS OTP)

1. Sign up at [termii.com](https://termii.com)
2. Get your API key from the dashboard
3. Register a **Sender ID** ("DepMi") — takes 24–48hrs approval in Nigeria
4. Use the **transactional/DND route** for OTPs (see Part 4)

```bash
TERMII_API_KEY=your_api_key_here
TERMII_SENDER_ID=DepMi
```

---

## Part 2 — OTP Flow in Code

### Email OTP (Resend)

```typescript
// Send OTP
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'DepMi <noreply@depmi.com>',
  to: userEmail,
  subject: 'Your DepMi verification code',
  html: `<p>Your verification code is <strong>${otp}</strong>. Expires in 10 minutes.</p>`,
});
```

### SMS OTP (Termii)

```typescript
// Send OTP via Termii
await fetch('https://api.ng.termii.com/api/sms/otp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.TERMII_API_KEY,
    message_type: 'NUMERIC',
    to: phoneNumber,           // e.g. "+2348012345678"
    from: process.env.TERMII_SENDER_ID,
    channel: 'dnd',            // ALWAYS use 'dnd' for OTPs in Nigeria
    pin_attempts: 3,
    pin_time_to_live: 10,      // minutes
    pin_length: 6,
    pin_placeholder: '< 1234 >',
    message_text: 'Your DepMi code is < 1234 >. Expires in 10 minutes.',
    pin_type: 'NUMERIC',
  }),
});
// Response includes { pinId } — store this to verify against
```

### Verify OTP (Termii)

```typescript
await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.TERMII_API_KEY,
    pin_id: storedPinId,   // from send response
    pin: userEnteredCode,
  }),
});
// Response: { verified: true/false }
```

---

## Part 3 — Meta Business Manager & WhatsApp (For Notifications)

> WhatsApp is NOT used for OTP. This section covers setup for **vendor invite notifications,
> order updates, and payout confirmations** — rich messages sent after Meta is verified.

### What You Need Before You Start

- [ ] A live website (depmi.com or depmi.vercel.app) — Meta checks it
- [ ] A Facebook account (personal, used as admin)
- [ ] A **dedicated phone number** for DepMi (must NOT be on any WhatsApp account currently)
- [ ] Business documents: CAC certificate or utility bill showing DepMi/business name

> A cheap MTN data SIM that has never been on WhatsApp works. You only need it to receive one OTP during registration.

---

### Step-by-Step: Meta Business Manager Verification

#### Step 1 — Create a Meta Business Portfolio
1. Go to [business.facebook.com](https://business.facebook.com)
2. Log in with your personal Facebook account
3. Click **"Create Account"**
4. Enter: Business Name = "DepMi", your name, business email
5. Verify the email Meta sends you

#### Step 2 — Verify Your Business
1. Go to **Business Settings → Security Center → Business Verification**
2. Click **"Start Verification"**
3. Upload one of:
   - CAC certificate (easiest if you have it)
   - Utility bill or bank statement showing business name
4. **Critical:** Name on document = Name in Business Manager = Name on depmi.com footer
5. Typical wait: **3–14 days**. Mismatched names are the #1 cause of rejection.

#### Step 3 — Create a WhatsApp App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. **My Apps → Create App → Business**
3. Link it to your DepMi Business Portfolio
4. Add the **WhatsApp** product to your app

#### Step 4 — Add & Verify Your Business Phone Number
1. **WhatsApp → Getting Started → Add phone number**
2. Enter the dedicated DepMi SIM number
3. Enter the OTP Meta sends to that number
4. Set Display Name: "DepMi" — reviewed by Meta in 1–4 hours

#### Step 5 — Generate a Permanent Token
1. **System Users → Add System User** (role: Admin)
2. Generate token with `whatsapp_business_messaging` permission
3. Save in `.env.local`:

```bash
WHATSAPP_ACCESS_TOKEN=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
```

#### Step 6 — Enable Two-Step Verification
1. **Security Center → Two-Step Verification**
2. Set a 6-digit PIN — required by Meta for number security

---

### WhatsApp Message Templates (Notifications Only)

Go to **WhatsApp Manager → Message Templates → Create Template**.
Submit all at once — approval takes 24–48 hours.

#### Template 1: Vendor Invite Notification (Utility)
- **Name:** `depmi_vendor_invite`
- **Category:** Utility
- **Body:**
```
Hi {{1}}, you've been selected as an exclusive DepMi vendor!

Complete your store setup using the link below. This invite expires in 48 hours.

{{2}}

Welcome to DepMi — Buy Here. Build Here. Grow Here.
```
- **Button:** Visit Website → `{{2}}`

#### Template 2: Order Escrowed (Utility)
- **Name:** `depmi_order_escrowed`
- **Category:** Utility
- **Body:**
```
Hi {{1}}, your DepMi order #{{2}} is confirmed and payment is secured in escrow.

Once you receive your item, confirm delivery in the app to release payment to the seller.

Track your order: depmi.com/orders/{{2}}
```

#### Template 3: Funds Released — for Vendors (Utility)
- **Name:** `depmi_funds_released`
- **Category:** Utility
- **Body:**
```
Great news, {{1}}!

The buyer confirmed receipt of order #{{2}}. Your payment of {{3}} has been released to your account.

You also earned +1 Dep. Your store is now at {{4}} Deps.

View payout: depmi.com/store/payouts
```

> Submit all 3 templates simultaneously. Do NOT resubmit rejected templates immediately
> — fix the issue first, then resubmit with a new name.

---

## Part 4 — DND Routes (Critical for Nigerian SMS)

Numbers on Nigeria's **Do Not Disturb (DND)** registry silently reject promotional SMS.
OTP messages must use the **transactional route** or they will not deliver.

| Provider | How |
|----------|-----|
| **Termii** | Set `channel: "dnd"` in every SMS/OTP API call |
| **Resend** | N/A — email is not affected by DND |
| **WhatsApp** | N/A — WhatsApp is app-to-app |

> If OTPs are not delivering during testing, DND is almost always the cause.

---

## Part 5 — All Environment Variables

```bash
# Resend (email OTP — free tier)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@depmi.com

# Termii (SMS OTP + WhatsApp notifications)
TERMII_API_KEY=your_api_key
TERMII_SENDER_ID=DepMi

# WhatsApp Business API (Meta) — add after Meta setup is complete
WHATSAPP_ACCESS_TOKEN=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id

# Dojah (BVN verification — add at ~seller #25)
DOJAH_APP_ID=your_app_id
DOJAH_SECRET_KEY=your_secret_key
DOJAH_BASE_URL=https://sandbox.dojah.io   # → https://api.dojah.io in production
```

---

## Part 6 — Timelines & What to Do Now

| Task | Time | When |
|------|------|------|
| Sign up for Resend + add domain | 15 min | **Now** — unblocks email OTP immediately |
| Sign up for Termii + get API key | 10 min | **Now** |
| Register Termii Sender ID ("DepMi") | 24–48hr approval | Submit today |
| Create Meta Business Manager | 30 min | Now — starts the clock |
| Submit Meta business verification | 15 min | Now — takes 3–14 days |
| Verify WhatsApp phone number | 10 min | After Meta BM is verified |
| Submit 3 WhatsApp templates | 30 min | Same day as phone number |
| Templates approved | 24–48 hrs | Wait |

**Email OTP and SMS OTP are live the same day. WhatsApp notifications follow in 2–14 days.**

---

## Sources
- [Termii Pricing](https://termii.com/pricing)
- [Termii OTP API Docs](https://developers.termii.com/messaging-api)
- [Resend Docs](https://resend.com/docs)
- [WhatsApp API Access Guide — WATI](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-access/)
- [WhatsApp Onboarding Checklist — Interakt](https://www.interakt.shop/whatsapp-business-api/whatsapp-api-onboarding-checklist/)
- [Meta Template Policy Update July 2025 — YCloud](https://www.ycloud.com/blog/whatsapp-api-message-template-category-guidelines-update/)
