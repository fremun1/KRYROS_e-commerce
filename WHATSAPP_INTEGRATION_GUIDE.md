# WhatsApp Cloud API Integration Guide for KRYROS

## Overview

This guide explains how to integrate WhatsApp Cloud API into KRYROS for sending order notifications, payment updates, and customer support messages.

---

## What You Need First

### Option A: WhatsApp Cloud API (RECOMMENDED)
- **Cost**: Free tier available (up to 1,000 notifications/month), then $0.005/message
- **Setup Time**: 30 minutes to 1 hour
- **Best for**: Automated order notifications, payment reminders, marketing

### Option B: Just Add Customer Numbers (Manual)
- **Cost**: Free
- **Setup Time**: Instant
- **Best for**: Manual WhatsApp marketing, simple support

**You need Option A (Cloud API) if you want to:**
- Automatically send order confirmations via WhatsApp
- Send payment reminders automatically
- Enable 2-way customer support chat
- Send promotional messages

---

## Step-by-Step: WhatsApp Cloud API Setup

### Step 1: Create Meta Developer Account
1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Select "Other" → "Business"
4. Name your app "KRYROS WhatsApp"
5. Add your Facebook Business Account (or create one)

### Step 2: Setup WhatsApp Product
1. In your app dashboard, click "Add products to your app"
2. Find "WhatsApp" and click "Configure"
3. Click "Get Started"

### Step 3: Get Your Credentials
From the WhatsApp → API Setup page, you will get:

| Credential | Where to Find |
|------------|---------------|
| **Phone Number ID** | In "API Setup" section |
| **Access Token** | In "Temporary access token" (or create a permanent one) |
| **Business Account ID** | In "Business Account" section |

### Step 4: Verify Your Phone Number
1. Go to "Phone Numbers" section
2. Add your business phone number
3. Complete verification (you'll receive an OTP)

### Step 5: Configure Webhooks (for receiving messages)
1. Go to "Configuration" → "Webhooks"
2. Add webhook URL: `https://your-backend-api.com/webhooks/whatsapp`
3. Verify webhook with the provided token

---

## Step-by-Step: Add to KRYROS Admin Panel

I'll create a WhatsApp settings page in your admin panel. Here's what it will include:

### Features:
1. **API Configuration**: Input Phone Number ID, Access Token, Business Account ID
2. **Notification Templates**: Configure messages for:
   - Order confirmation
   - Payment received
   - Payment reminder
   - Order shipped
   - Credit payment due
3. **Test Connection**: Verify your API credentials work
4. **Enable/Disable**: Toggle WhatsApp notifications on/off

### How to Send Messages:

#### Method 1: Automated (Recommended)
The system will automatically send messages when:
- New order is placed
- Payment is received
- Credit payment is due
- Order status changes

#### Method 2: Manual (Just Add Numbers)
You can also just add customer WhatsApp numbers manually and use WhatsApp click-to-chat links on your website.

---

## Quick Start: Just Add WhatsApp Button

If you want the simplest solution first - add a "Chat on WhatsApp" button to your website:

### Implementation:
```html
<a href="https://wa.me/260966423719?text=Hello%20KRYROS%20I%20need%20help">
  <button>Chat on WhatsApp</button>
</a>
```

This creates a clickable button that opens WhatsApp with a pre-filled message.

---

## What Happens Next?

I can help you:

1. **Create WhatsApp Settings Page** in Admin Panel - Add fields to input your API credentials
2. **Create Backend Service** - Node.js service to send WhatsApp messages
3. **Create WhatsApp Widget** - Floating button on customer website
4. **Set Up Auto-Notifications** - Trigger messages on orders, payments

**Which would you like me to implement first?**
