# SAST Setup Guide

## 1. Enable GitHub CodeQL (Automated Security Scanning)

CodeQL is GitHub's built-in SAST scanner — it detects SQL injection, XSS, path traversal,
and dozens of other vulnerability patterns automatically on every push and PR.

### Option A — GitHub UI (easiest, no PAT scope needed)
1. Go to your repo → **Security** tab → **Code security and analysis**
2. Enable **CodeQL analysis** → GitHub sets everything up automatically

### Option B — Manual workflow file (copy and commit)
Create the file `.github/workflows/codeql.yml` with the content below.
Requires a PAT with the `workflow` scope, or commit directly in the GitHub UI.

```yaml
name: "CodeQL Security Scan"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: "0 8 * * 1"   # Every Monday 08:00 UTC

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ "javascript-typescript" ]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

---

## 2. Add eslint-plugin-security to Backend

Install the plugin:
```bash
cd Backend
npm install --save-dev eslint-plugin-security
```

Add to `Backend/.eslintrc.js` (or your eslint config):
```js
module.exports = {
  // ... existing config
  plugins: ['security'],
  extends: [
    // ... existing extends
    'plugin:security/recommended',
  ],
  rules: {
    // Downgrade to warn for rules that have many false positives in NestJS
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
  },
};
```

Then run:
```bash
npx eslint src/ --ext .ts
```

---

## 3. Database User Permissions (Production Checklist)

- **Migrations**: Run with a privileged DB user (e.g., `postgres`)
- **Application runtime**: Use a restricted DB user with only DML permissions:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kryros_app;
  REVOKE CREATE, DROP, TRUNCATE ON ALL TABLES IN SCHEMA public FROM kryros_app;
  ```
- Store the runtime DB URL in `DATABASE_URL` env var using the restricted user credentials

## 4. Redis in Production

Set `REDIS_URL` environment variable in your production deployment (Render, Railway, etc.):
```
REDIS_URL=redis://username:password@your-redis-host:6379
```

Without this, the failed-login lockout counter resets on every server restart,
allowing brute-force attacks to bypass the 5-attempt rate limit.
