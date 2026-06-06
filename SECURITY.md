# Security Configuration Guide

This document lists all environment variables and post-audit action items.

---

## 🔴 Remaining Action Items (Require Local Git Access)

### 1. Rotate Firebase API Key
The `google-services.json` has been **deleted from HEAD**. However, the key
`AIzaSyBO13zY5tyNH-_aoDTo7-AVQqgYkzkDe3Y` still exists in **git history**.

**Step A — Rotate the key now:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials → find key for project `notification-237bf`
3. Click **Regenerate** → confirm → update in CI/CD env vars

**Step B — Purge git history (run locally):**
```bash
pip install git-filter-repo
git filter-repo --path kryros_mobile_app/android/app/google-services.json --invert-paths
git push origin main --force
# Verify: git log --all --full-history -- kryros_mobile_app/android/app/google-services.json
# (should return nothing)
```

### 2. Activate Security CI Workflow
The SAST workflow is ready at `docs/security-workflow.yml`. To activate it, generate
a new PAT with `repo` + `workflow` scope at https://github.com/settings/tokens,
then run:
```bash
mkdir -p .github/workflows
cp docs/security-workflow.yml .github/workflows/security.yml
git add .github/workflows/security.yml
git commit -m "security: activate SAST workflow"
git push
```

### 3. Rotate GitHub PAT
The PAT used for development was exposed. Generate a new one at
https://github.com/settings/tokens — select `repo` + `workflow` scopes.

---

## Security Audit Status — All Checks

| Category | Check | Status |
|---|---|---|
| Auth | bcrypt 12-round hashing | ✅ PASS |
| Auth | JWT 15min access token | ✅ PASS |
| Auth | Refresh tokens SHA-256 hashed | ✅ PASS |
| Auth | Session timeout 30min | ✅ PASS |
| Auth | Edge JWT expiry check | ✅ FIXED |
| Auth | RBAC guards | ✅ PASS |
| Auth | Failed login lockout (5 attempts/15min) | ✅ PASS |
| Auth | httpOnly + SameSite=Strict cookies | ✅ PASS |
| Auth | Non-enumerable password reset | ✅ PASS |
| Input | ValidationPipe whitelist:true | ✅ PASS |
| Input | SQL injection (Prisma ORM) | ✅ PASS |
| Input | XSS (CSP + React escaping) | ✅ PASS |
| Input | CSRF (SameSite=Strict) | ✅ PASS |
| Input | CORS dev-tunnel gating | ✅ FIXED |
| Input | Magic-byte image validation | ✅ PASS |
| Backend | Env vars validated at startup | ✅ PASS |
| Backend | No hardcoded credentials | ✅ PASS |
| Backend | Stack traces hidden | ✅ PASS |
| Backend | Debug mode disabled in prod | ✅ PASS |
| Backend | google-services.json removed | ✅ FIXED |
| Frontend | Source maps disabled | ✅ PASS |
| Frontend | Edge route protection | ✅ PASS |
| Headers | X-Frame-Options: DENY | ✅ PASS |
| Headers | CSP implemented | ✅ PASS |
| Headers | HSTS + preload | ✅ PASS |
| Headers | Referrer-Policy strict | ✅ PASS |
| Headers | Permissions-Policy | ✅ PASS |
| Headers | no-store on API routes | ✅ PASS |
| Build | Dependabot (npm + Flutter) | ✅ FIXED |
| Build | SAST workflow | ⏳ NEEDS workflow-scope PAT |
| Critical | Firebase key rotation | 🔴 DO NOW — rotate + purge history |
| Critical | GitHub PAT rotation | 🔴 DO NOW |

---

## Required Environment Variables

### Backend (Render)
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL — include `?sslmode=require` in production |
| `JWT_SECRET` | ✅ | Min 32 chars random string |
| `NODE_ENV` | ✅ | `production` on Render |
| `REDIS_URL` | ✅ | Redis for rate-limit + brute-force lockout |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary dashboard |
| `TOTP_ENCRYPTION_KEY` | ✅ | 32-byte hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_SEED_EMAIL` | Optional | Initial super admin email |
| `ADMIN_SEED_PASSWORD` | Optional | Initial super admin password |
| `SENTRY_DSN` | Optional | Error tracking |

### Admin Panel (Render/Vercel)
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL |
| `NODE_ENV` | ✅ | `production` |

### Flutter Mobile App (CI/CD)
| Variable | Required | Description |
|---|---|---|
| `FIREBASE_API_KEY` | ✅ | **ROTATED** Firebase key |
| `FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | ✅ | `notification-237bf` |
| `FIREBASE_STORAGE_BUCKET` | ✅ | Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | ✅ | Sender ID |
| `FIREBASE_APP_ID` | ✅ | App ID |
| `FIREBASE_VAPID_KEY` | ✅ | Web push VAPID key |

### GitHub Actions Secrets
| Secret | Description |
|---|---|
| `SNYK_TOKEN` | Free tier at snyk.io |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |
