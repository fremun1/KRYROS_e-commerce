# KRYROS — Security Dashboard Setup Guide

This guide covers every security task you must complete in external dashboards.
Nothing here requires code changes — copy the steps and follow them exactly.

---

## 1. CLOUDFLARE — WAF, DDoS Protection, Bot Filtering, Rate Limiting

### Step 1 — Create a Cloudflare account
Go to: https://cloudflare.com
Click "Sign Up" → enter your email and a strong password → verify your email.
The FREE plan covers everything you need for WAF, DDoS, and Bot Fight Mode.

### Step 2 — Add your domain to Cloudflare
1. After logging in, click the blue "Add a site" button
2. Type your domain name exactly: `kryros.com`
3. Click "Add site"
4. Select the **Free** plan → click "Continue"

### Step 3 — Review your DNS records
Cloudflare will scan and import your existing DNS records automatically.
You will see a list of records. Confirm these look correct:
- There should be an A record or CNAME record pointing to your Render service
- Do NOT delete any records
- Click "Continue"

### Step 4 — Change your nameservers at your domain registrar
Cloudflare will show you two nameservers. They will look like:
```
ns1.cloudflare.com
ns2.cloudflare.com
```
(Your exact ones will be different — copy from the Cloudflare screen)

Now go to wherever you registered your domain (GoDaddy / Namecheap / Google Domains etc):
1. Log in to your domain registrar
2. Find "Nameservers" or "DNS Settings" for kryros.com
3. Delete the existing nameservers
4. Add the two Cloudflare nameservers exactly as shown
5. Save the changes

Wait 10 minutes to 48 hours. Cloudflare will email you when your domain is active.

### Step 5 — Enable security features (do this AFTER domain goes active)

**WAF (Web Application Firewall):**
1. In Cloudflare dashboard → click your domain → go to Security → WAF
2. Set "Security Level" to **Medium**
3. Turn on "Managed Rules" if available on your plan

**DDoS Protection:**
- This is ON by default. No action needed.

**Bot Fight Mode:**
1. Go to Security → Bots
2. Click "Bot Fight Mode" → toggle it ON
3. This blocks automated bots and scrapers for free

**Rate Limiting:**
1. Go to Security → WAF → Rate Limiting Rules
2. Click "Create rule"
3. Set: If incoming requests match **All incoming requests**
4. Rate: More than **100 requests** per **1 minute** from same IP
5. Action: **Block** for **10 minutes**
6. Click "Deploy"

**HTTPS Enforcement:**
1. Go to SSL/TLS → Overview
2. Set mode to **Full (Strict)**
3. Go to SSL/TLS → Edge Certificates
4. Turn ON "Always Use HTTPS"
5. Turn ON "Automatic HTTPS Rewrites"
6. Turn ON "HTTP Strict Transport Security (HSTS)" → set max-age to 12 months

---

## 2. NEON DATABASE — Restricted Permissions & Backups

### Step 1 — Log in to Neon
Go to: https://neon.tech → log in → open your KRYROS project

### Step 2 — Create a restricted database role
1. In the left sidebar, click **SQL Editor**
2. Run these commands one by one (replace `your_database_name` with your actual database name, and choose a strong password):

```sql
CREATE ROLE kryros_app WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_HERE';

GRANT CONNECT ON DATABASE your_database_name TO kryros_app;

GRANT USAGE ON SCHEMA public TO kryros_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kryros_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kryros_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kryros_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kryros_app;
```

### Step 3 — Get the new restricted connection string
1. Go to **Settings → Connection Details** (or click your branch → Connection string)
2. In the "Role" dropdown, select `kryros_app`
3. Copy the full connection string — it starts with `postgresql://kryros_app:...`

### Step 4 — Update the connection string in Render
1. Go to render.com → your `kryros-backend` service → Environment tab
2. Find `DATABASE_URL`
3. Click the edit (pencil) icon
4. Replace the value with the new `kryros_app` connection string
5. Click "Save Changes" — Render will restart automatically

### Step 5 — Enable automated backups
1. In Neon dashboard → go to **Settings → Billing**
2. If you are on the free plan, upgrade to **Launch ($19/month)**
   - This gives you 7-day point-in-time recovery — this IS your daily backup
3. If already on a paid plan → go to **Branches** and verify "Point-in-time restore" is available

---

## 3. RENDER — Environment Variable Security Audit

### Step 1 — Audit the backend service
1. Go to: https://render.com → log in → click on `kryros-backend`
2. Click the **Environment** tab in the left menu
3. Confirm ALL of these variables exist and are marked as **secret** (show as ●●●●):

```
DATABASE_URL          ← must be secret
JWT_SECRET            ← must be secret
ADMIN_SEED_EMAIL      ← must be secret
ADMIN_SEED_PASSWORD   ← must be secret
BEEM_API_KEY          ← must be secret
BEEM_SECRET_KEY       ← must be secret
CGRATE_USERNAME       ← must be secret
CGRATE_PASSWORD       ← must be secret
NODE_ENV              ← value: production (not secret)
CORS_ORIGINS          ← your domain list (not secret)
```

4. If any are showing their actual values in plain text, click the eye icon next to them to hide them.

### Step 2 — Add the Sentry DSN (once you have it from Step 4 below)
Add these three environment variables:

**For the backend (`kryros-backend` service):**
```
SENTRY_DSN = (paste your backend Sentry DSN here)
```

**For the admin panel (`kryros-admin` service):**
```
NEXT_PUBLIC_SENTRY_DSN = (paste your admin Sentry DSN here)
SENTRY_DSN             = (same DSN)
SENTRY_ORG             = (your Sentry org slug)
SENTRY_PROJECT         = (your Sentry project slug)
SENTRY_AUTH_TOKEN      = (your Sentry auth token for source map uploads)
```

**For the user frontend (`kryros-user-ui` service):**
```
VITE_SENTRY_DSN = (paste your user frontend Sentry DSN here)
```

### Step 3 — Credential rotation schedule (do every 90 days)
Set a calendar reminder every 90 days to:
1. Generate a new strong JWT_SECRET value (use: https://generate-secret.vercel.app/64)
2. Update JWT_SECRET in Render for the backend service
3. Go to Neon → change the `kryros_app` role password
4. Update DATABASE_URL in Render with the new password
5. Render will restart all services automatically

---

## 4. SENTRY — Error Monitoring & Alerts

### Step 1 — Create a Sentry account
Go to: https://sentry.io → click "Get Started Free"
Sign up with your company email.
The **Developer (free)** plan gives you 5,000 errors/month which is enough to start.

### Step 2 — Create three projects
You need one project per service:

**Project 1 — Backend:**
1. Click "Create Project"
2. Platform: **Node.js**
3. Project name: `kryros-backend`
4. Copy the DSN — it looks like: `https://xxxxx@o123456.ingest.sentry.io/123456`
5. Save this DSN — you will put it in Render as `SENTRY_DSN`

**Project 2 — User Frontend:**
1. Click "Create Project"
2. Platform: **React**
3. Project name: `kryros-user-frontend`
4. Copy the DSN
5. Save this DSN — you will put it in Render as `VITE_SENTRY_DSN`

**Project 3 — Admin Panel:**
1. Click "Create Project"
2. Platform: **Next.js**
3. Project name: `kryros-admin`
4. Copy the DSN
5. Save this DSN — you will put it in Render as `NEXT_PUBLIC_SENTRY_DSN`

### Step 3 — Set up alerts
For each project:
1. Go to **Alerts → Create Alert Rule**
2. Choose **Issues** → "A new issue is created" → Alert me: **Immediately**
3. Set notification channel to your email
4. Also create a second rule: "An issue occurs more than **10** times in **1 hour**"
5. Save both rules

### Step 4 — Get auth token (for source map uploads)
1. Go to Settings → Account → API → Auth Tokens
2. Click "Create New Token"
3. Name it `render-deploy`
4. Select scopes: `project:read`, `project:releases`, `org:read`
5. Copy the token → add it to Render as `SENTRY_AUTH_TOKEN`
6. Also add `SENTRY_ORG` = your organisation slug (shown in your Sentry URL)
7. Also add `SENTRY_PROJECT` = `kryros-admin`

---

## 5. CREDENTIAL ROTATION CALENDAR (Every 90 Days)

Set repeating calendar reminders for these tasks:

**Every 90 days:**
- Generate new JWT_SECRET → update in Render backend service
- Change `kryros_app` Neon database password → update DATABASE_URL in Render
- Rotate BEEM_API_KEY and BEEM_SECRET_KEY if your Beem account allows it
- Rotate CGRATE credentials if your CGrate account allows it

**Every 6 months:**
- Review Cloudflare WAF rules and update if needed
- Review which admin accounts have 2FA enabled — enforce for all
- Check Sentry error trends and resolve any recurring issues

**Every year:**
- Review and update all CORS_ORIGINS to remove any unused domains
- Audit all admin panel user accounts and deactivate unused ones

---

## Summary Checklist

Copy this and tick off each item as you complete it:

```
[ ] Cloudflare account created and domain added
[ ] Cloudflare nameservers updated at domain registrar
[ ] Cloudflare WAF enabled (Security Level: Medium)
[ ] Cloudflare Bot Fight Mode enabled
[ ] Cloudflare Rate Limiting rule created (100 req/min → block 10 min)
[ ] Cloudflare HTTPS enforced (Full Strict + Always Use HTTPS)
[ ] Cloudflare HSTS enabled (max-age 12 months)
[ ] Neon restricted role (kryros_app) created
[ ] Neon DATABASE_URL updated in Render with restricted role
[ ] Neon paid plan enabled for point-in-time backups
[ ] Render environment variables audited and all secrets masked
[ ] Render SENTRY_DSN added for backend
[ ] Render VITE_SENTRY_DSN added for user frontend
[ ] Render NEXT_PUBLIC_SENTRY_DSN added for admin panel
[ ] Sentry account created with 3 projects
[ ] Sentry alert rules configured for all 3 projects
[ ] 90-day credential rotation calendar reminder set
```
