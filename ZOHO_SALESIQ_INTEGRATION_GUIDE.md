# Zoho SalesIQ Integration Guide

**Date:** July 14, 2026  
**Status:** ✅ Integrated

---

## What is Zoho SalesIQ?

Zoho SalesIQ is a **live chat and customer engagement platform** that allows you to:
- 💬 Provide real-time customer support via live chat
- 📊 Track visitor behavior and engagement
- 🎯 Automate customer interactions with chatbots
- 📱 Support customers across web and mobile
- 🔔 Send targeted notifications and offers
- 📈 Gather customer insights and analytics

---

## Integration Details

### Location
The Zoho SalesIQ widget has been integrated into the **User-UI** application at the global level, making it available on every page of your KRYROS storefront.

**File Modified:** `User-UI/index.html`

### How It Works

1. **Initialization Script** (lines 28-31):
   ```html
   <script>
     window.$zoho = window.$zoho || {};
     $zoho.salesiq = $zoho.salesiq || { ready: function() {} };
   </script>
   ```
   This initializes the Zoho SalesIQ object in the global scope.

2. **Widget Script** (line 32):
   ```html
   <script id="zsiqscript" src="https://salesiq.zohopublic.com/widget?wc=siq35ac1d01a6322adf375247d72b0111bc837e378e079d701078990a9fdac54132" defer></script>
   ```
   This loads the actual widget from Zoho's servers. The `wc` parameter contains your unique widget code.

### Widget Code
Your unique Zoho SalesIQ widget code is:
```
siq35ac1d01a6322adf375247d72b0111bc837e378e079d701078990a9fdac54132
```

---

## Features Available

### 1. **Live Chat**
- Visitors can start a chat conversation with your support team
- Chat widget appears as a floating button in the bottom-right corner
- Customizable appearance and behavior

### 2. **Visitor Tracking**
- See who is visiting your site in real-time
- Track visitor pages, time spent, and interactions
- Identify high-value visitors

### 3. **Proactive Engagement**
- Send targeted chat invitations to visitors
- Trigger messages based on visitor behavior
- Offer assistance at the right moment

### 4. **Chatbots & Automation**
- Set up automated responses for common questions
- Route chats to the right team members
- Reduce response time with pre-written responses

### 5. **Analytics & Reporting**
- Track chat volume, response times, and satisfaction
- Identify trends in customer inquiries
- Measure ROI of your support efforts

---

## How to Configure Zoho SalesIQ

### Step 1: Access Your Zoho SalesIQ Dashboard
1. Go to [https://salesiq.zoho.com](https://salesiq.zoho.com)
2. Log in with your Zoho account
3. Select your account/organization

### Step 2: Configure Chat Settings
1. Click **Settings** in the left sidebar
2. Customize:
   - **Widget Appearance**: Color, position, size
   - **Chat Behavior**: Auto-greet messages, offline messages
   - **Team Settings**: Add support agents, set availability
   - **Routing Rules**: Direct chats to specific teams

### Step 3: Set Up Automation (Optional)
1. Go to **Automation** → **Chat Rules**
2. Create rules to:
   - Send proactive messages to visitors
   - Trigger responses based on visitor behavior
   - Route chats based on department/product

### Step 4: Monitor Live Chats
1. Go to **Chats** to see all conversations
2. Respond to visitors in real-time
3. View chat history and customer profiles

### Step 5: View Analytics
1. Go to **Analytics** to see:
   - Chat volume and trends
   - Response times
   - Customer satisfaction ratings
   - Visitor engagement metrics

---

## Deployment Instructions

### On Your Server

1. **Pull the latest code:**
   ```bash
   cd /app/User-UI && git fetch origin && git reset --hard origin/main
   ```

2. **Rebuild the User-UI:**
   ```bash
   cd /app/User-UI && pnpm install && pnpm build && pm2 restart user-ui
   ```

3. **Verify the widget is loaded:**
   - Open your KRYROS storefront in a browser
   - Look for the Zoho SalesIQ chat widget in the bottom-right corner
   - You should see a chat button or icon

### Testing

1. **Test the widget:**
   - Visit your storefront
   - Click the chat widget
   - Send a test message
   - Check if it appears in your Zoho SalesIQ dashboard

2. **Mobile testing:**
   - Test on mobile devices
   - Ensure the chat widget displays correctly
   - Verify chat functionality on mobile

---

## Customization Options

### Change Widget Position
You can customize the widget position by adding configuration to the initialization script. Contact Zoho support for advanced customization options.

### Change Widget Code
If you need to update the widget code (e.g., if you have multiple Zoho accounts):
1. Update the `wc` parameter in the script URL in `User-UI/index.html`
2. Rebuild and redeploy

### Disable Widget Temporarily
To temporarily disable the widget:
1. Comment out the script tag in `User-UI/index.html`
2. Rebuild and redeploy

---

## Troubleshooting

### Widget Not Appearing
1. **Check browser console** for errors (F12 → Console)
2. **Verify internet connection** - widget requires external connection
3. **Clear browser cache** - hard refresh (Ctrl+Shift+R)
4. **Check Zoho account status** - ensure your Zoho SalesIQ account is active

### Chat Messages Not Sending
1. **Check internet connection**
2. **Verify Zoho SalesIQ account is active**
3. **Check browser privacy settings** - some extensions may block the widget
4. **Try a different browser** to isolate issues

### Widget Blocking Content
1. The widget is positioned to not block important content
2. If it's interfering with your UI, contact Zoho support for positioning options

---

## Security & Privacy

### Data Protection
- Zoho SalesIQ uses industry-standard encryption for all communications
- Chat data is stored securely on Zoho's servers
- Comply with GDPR and other privacy regulations

### Visitor Privacy
- Visitors can see that they're chatting with your support team
- No personal data is collected without consent
- Visitors can opt-out of chat at any time

---

## Support & Resources

### Zoho SalesIQ Documentation
- [Official Zoho SalesIQ Help](https://www.zoho.com/salesiq/help/)
- [Widget Customization Guide](https://www.zoho.com/salesiq/help/widget-customization.html)
- [API Documentation](https://www.zoho.com/salesiq/help/api.html)

### Contact Zoho Support
- Email: support@zoho.com
- Phone: Available in your Zoho account
- Chat: Available in your Zoho SalesIQ dashboard

---

## Next Steps

1. ✅ **Integration Complete** - Widget is now live on your KRYROS storefront
2. 📋 **Configure Settings** - Customize the widget appearance and behavior
3. 👥 **Add Support Agents** - Invite your team to handle chats
4. 🤖 **Set Up Automation** - Create chat rules and automate responses
5. 📊 **Monitor Analytics** - Track performance and customer satisfaction

---

## Files Modified

- `User-UI/index.html` - Added Zoho SalesIQ initialization and widget scripts

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-07-14 | 1.0 | Initial integration of Zoho SalesIQ widget |

---

**Status:** ✅ Ready for Production
