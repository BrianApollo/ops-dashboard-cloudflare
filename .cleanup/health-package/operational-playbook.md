# Operational Playbook: ops-dashboard-cloudflare

**Date:** February 22, 2026
**Audience:** Developers, DevOps, On-call engineers

---

## Table of Contents
1. [Local Development](#1-local-development)
2. [Environment Variables](#2-environment-variables)
3. [Deployment (Cloudflare Pages)](#3-deployment-cloudflare-pages)
4. [Where Logs Live](#4-where-logs-live)
5. [Proxy Architecture](#5-proxy-architecture)
6. [Debugging Airtable Errors](#6-debugging-airtable-errors)
7. [Debugging Auth Issues](#7-debugging-auth-issues)
8. [Debugging Facebook API Issues](#8-debugging-facebook-api-issues)
9. [Common Error Patterns](#9-common-error-patterns)

---

## 1. Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with access to the Pages project

### Start the Vite dev server only (frontend, no serverless functions)
```bash
npm run dev
```
This starts the React app at `http://localhost:5173`. API calls to `/api/*` will fail unless you also run the Cloudflare functions proxy (see below).

### Start with Cloudflare Pages Functions (recommended for full local dev)
```bash
npx wrangler pages dev -- npm run dev
```
Or, if the `wrangler.toml` is configured with a dev command:
```bash
npm run pages:dev
```
This runs the React app **and** the Cloudflare serverless functions locally. API calls to `/api/airtable/*`, `/api/facebook/*`, etc. will be intercepted by the local Wrangler runtime and forwarded to real external APIs using your local `.dev.vars` secrets.

### Setting up local secrets
Create a `.dev.vars` file in the project root (this file is gitignored). It mirrors the Cloudflare Pages environment variables:

```
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
FACEBOOK_APP_ID=your_fb_app_id_here
FACEBOOK_APP_SECRET=your_fb_app_secret_here
JWT_SECRET=your_jwt_secret_here
CLOUDFLARE_IMAGES_ACCOUNT_ID=your_cf_images_account_id
CLOUDFLARE_IMAGES_API_TOKEN=your_cf_images_token
REDTRACK_API_KEY=your_redtrack_key
ADSPOWER_API_KEY=your_adspower_key
GOOGLE_DRIVE_API_KEY=your_google_drive_key
```

**Never commit `.dev.vars` to git.**

### Build for production (verify before deploy)
```bash
npm run build
```
Expected: build completes in ~3.3 seconds, output in `dist/`. Watch for the 1,145 kB bundle size warning — this is a known pre-existing issue (see `risk-and-debt-log.md`).

### Type check without building
```bash
npx tsc --noEmit
```

---

## 2. Environment Variables

### Where secrets live

| Environment | Location |
|---|---|
| Local development | `.dev.vars` file (project root, gitignored) |
| Production / Preview | Cloudflare Pages dashboard → Settings → Environment Variables |

### Required environment variables

| Variable | Purpose | Who Uses It |
|---|---|---|
| `AIRTABLE_API_KEY` | Authenticates all Airtable API calls | `functions/api/airtable/[[route]].ts` |
| `AIRTABLE_BASE_ID` | Identifies the Airtable base (database) | `functions/api/airtable/[[route]].ts` |
| `JWT_SECRET` | Signs and verifies user authentication tokens | `core/auth/` + auth Cloudflare function |
| `FACEBOOK_APP_ID` | Facebook OAuth app identity | `functions/api/facebook/[[route]].ts` |
| `FACEBOOK_APP_SECRET` | Facebook OAuth secret | `functions/api/facebook/[[route]].ts` |
| `CLOUDFLARE_IMAGES_ACCOUNT_ID` | Cloudflare Images account | `functions/api/images/[[route]].ts` |
| `CLOUDFLARE_IMAGES_API_TOKEN` | Cloudflare Images upload auth | `functions/api/images/[[route]].ts` |
| `REDTRACK_API_KEY` | Redtrack analytics API auth | `functions/api/redtrack/[[route]].ts` |
| `ADSPOWER_API_KEY` | AdsPower browser profile management | `functions/api/adspower/[[route]].ts` |
| `GOOGLE_DRIVE_API_KEY` | Google Drive asset access | `functions/api/drive/[[route]].ts` |

### Frontend environment variables (VITE_ prefix, exposed to browser)

| Variable | Purpose | Default |
|---|---|---|
| `VITE_DATA_PROVIDER` | Selects data provider mode (always `airtable` in production) | `airtable` |

**Note:** Any variable prefixed with `VITE_` is bundled into the client JavaScript. Never put secrets in `VITE_` variables.

---

## 3. Deployment (Cloudflare Pages)

### Automatic deployment
The project is connected to a Git repository. Pushing to the `main` branch triggers an automatic Cloudflare Pages build and deployment.

### Manual deployment
```bash
npm run build
npx wrangler pages deploy dist/ --project-name=ops-dashboard-cloudflare
```

### Deployment configuration
See `wrangler.toml` for:
- Project name
- Build command
- Output directory
- Routes configuration

### Preview deployments
Every branch push creates a preview deployment at a unique URL (e.g., `https://[branch-name].ops-dashboard-cloudflare.pages.dev`). Use these to test changes before merging to main.

### Checking deployment status
```bash
npx wrangler pages deployment list --project-name=ops-dashboard-cloudflare
```

---

## 4. Where Logs Live

### Cloudflare Pages Functions logs (production)
1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com)
2. Select the account → **Pages** → `ops-dashboard-cloudflare`
3. Go to **Functions** tab → **Real-time logs** for live streaming
4. Go to **Deployments** → select a deployment → **Functions** for historical logs

### Local development logs
Wrangler prints function logs directly to the terminal running `wrangler pages dev`.

### React app logs (browser)
All React/frontend errors appear in the browser's developer console (F12 → Console). Network request details (including API calls to `/api/*`) appear in the **Network** tab.

### What to look for in logs

| Log pattern | What it means |
|---|---|
| `Airtable error: 422` | Request body malformed — check field names match Airtable schema |
| `Airtable error: 401` | `AIRTABLE_API_KEY` is wrong or expired |
| `Airtable error: 403` | The key doesn't have permission for that base or table |
| `Airtable error: 429` | Rate limited — Airtable allows 5 req/sec per base |
| `Facebook error: 190` | Facebook user token expired — needs re-auth |
| `Facebook error: 200` | Permission missing on the Facebook app |
| `JWT expired` | User's session token is old — they need to log in again |

---

## 5. Proxy Architecture

**All external API calls go through Cloudflare Pages Functions.** The React app never talks to Airtable, Facebook, etc. directly.

### How it works

```
React app                      Cloudflare Edge Function          External API
─────────────────────────────────────────────────────────────────────────────
fetch('/api/airtable/          →  functions/api/airtable/        →  Airtable
  [baseId]/[table]')               [[route]].ts                     REST API
                                   (reads AIRTABLE_API_KEY
                                    from CF environment)

fetch('/api/facebook/          →  functions/api/facebook/        →  Facebook
  graph/[version]/[endpoint]')      [[route]].ts                     Graph API
                                   (reads FACEBOOK_APP_SECRET)
```

### Proxy function location
All proxy functions are in:
```
functions/api/
├── airtable/[[route]].ts     catches /api/airtable/**
├── facebook/[[route]].ts     catches /api/facebook/**
├── images/[[route]].ts       catches /api/images/**
├── drive/[[route]].ts        catches /api/drive/**
├── redtrack/[[route]].ts     catches /api/redtrack/**
└── adspower/[[route]].ts     catches /api/adspower/**
```

The `[[route]]` pattern in Cloudflare Pages Functions is a wildcard — it catches all sub-paths. So `/api/airtable/v0/appXXX/Campaigns` is handled by `functions/api/airtable/[[route]].ts`.

### Adding a new external integration
1. Create `functions/api/[service]/[[route]].ts`
2. Add the API key to Cloudflare Pages environment variables (and `.dev.vars` locally)
3. Call `/api/[service]/...` from `features/[service]/api.ts` in the React app

---

## 6. Debugging Airtable Errors

### Step 1: Check the browser Network tab
- Open DevTools (F12) → Network tab
- Filter by `/api/airtable`
- Look at the request URL, request body, and response body

### Step 2: Check Cloudflare Function logs
- The proxy function logs the Airtable response status and body on error
- Look for the raw Airtable error message (it's usually descriptive)

### Step 3: Common Airtable error causes

**"Unknown field name"**
The field name in the request body doesn't match Airtable exactly. Airtable field names are case-sensitive and space-sensitive. Check the Airtable base schema.

**"Record not found"**
The record ID passed in the URL doesn't exist in that table. May be a stale ID from a deleted record.

**"INVALID_RECORDS"**
A required Airtable field is missing from the request, or a linked-record field received a plain string instead of an array of record IDs.

**Pagination not returning all records**
All Airtable list calls must use `fetchAllAirtableRecords()` from `src/lib/airtable-helpers.ts`. If a data.ts file is calling Airtable directly without pagination, it will only return the first 100 records. Search for `offset` in `features/` to find any non-paginated calls.

### Step 4: Test the Airtable call directly
Use the Airtable API directly with curl to isolate whether the issue is in the proxy or in the request:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE?maxRecords=3"
```

---

## 7. Debugging Auth Issues

### Architecture
Authentication is JWT-based. The flow is:
1. User submits credentials on `LoginPage.tsx`
2. Credentials sent to an auth Cloudflare function
3. Function validates credentials and returns a signed JWT
4. JWT is stored in the React app (localStorage or memory — check `core/auth/`)
5. All subsequent API calls include the JWT in the `Authorization` header
6. The Cloudflare proxy functions may verify the JWT before forwarding to external APIs

### "Not logged in" / redirect to login
- Check browser localStorage for the JWT token key
- Check the JWT expiry (`exp` claim) — decode at [jwt.io](https://jwt.io) to inspect
- If expired, the user must log in again

### "403 Forbidden" after logging in
- The user is authenticated but lacks the required permission role
- Check `core/permissions/` for permission definitions
- Check what role the user has in the Airtable `Users` table

### JWT_SECRET mismatch
If `JWT_SECRET` in Cloudflare environment differs from what signed the token, all token verifications fail. Ensure the same value is used consistently across all environments.

### Debugging steps
1. Check browser DevTools → Application → Local Storage — is there a token?
2. Copy the token and decode at jwt.io — is it expired? Is the payload correct?
3. Check the Cloudflare function logs — is it receiving the token in the Authorization header?
4. Verify `JWT_SECRET` in Cloudflare Pages environment variables matches the expected value

---

## 8. Debugging Facebook API Issues

### Token expiry (most common issue)
Facebook user tokens expire after ~60 days. When they expire, all Facebook API calls return error code `190`.

**To fix:**
- The token refresh flow is in `features/facebook/` — trigger it from the Manage page
- Or manually generate a new long-lived token via the Facebook Developer console and update it in Airtable (wherever tokens are stored)

### Rate limiting
Facebook has per-app and per-user API rate limits. Error code `4` or `17` indicates rate limiting. The app should back off and retry.

### Permission errors (error code `200`)
The Facebook app does not have the required permission scope. This usually means the app review was not completed for a specific permission. Check the Facebook Developer console → App Review → Permissions.

### API version deprecation
If Facebook deprecated the API version in use, all calls to that endpoint return a deprecation warning or error. Check `functions/api/facebook/[[route]].ts` for the API version string (e.g., `v19.0`).

---

## 9. Common Error Patterns

### "fetchAllAirtableRecords is not a function"
A file is importing the helper incorrectly. Correct import:
```typescript
import { fetchAllAirtableRecords } from '../../lib/airtable-helpers';
```

### "AirtableRecord is not defined"
A file defines its own `AirtableRecord` type or imports from the wrong location. Correct import:
```typescript
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';
```

### Blank page on load
1. Open browser console — look for JavaScript errors
2. Check if the Vite build output in `dist/` is valid
3. Check if Cloudflare Pages served the `index.html` — Network tab, first request

### Page loads but data doesn't appear
1. Check Network tab for failed `/api/*` requests (red status codes)
2. Check Cloudflare Function logs for the failing endpoint
3. Verify environment variables are set in Cloudflare dashboard

### Build fails with TypeScript errors
```bash
npx tsc --noEmit
```
Read the error — most TypeScript errors in this codebase are either missing type imports from `lib/airtable-types.ts` or incorrect prop types on components.
