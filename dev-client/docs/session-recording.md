# Session Recording & Feature Flags

## Architecture Overview

```
┌─────────────────┐     HMAC-signed request      ┌─────────────────────┐
│   Mobile App    │ ──────────────────────────►  │  Cloudflare Worker  │
│                 │                              │                     │
│  PostHog.tsx    │  ◄────────────────────────   │  /staging or /prod  │
│                 │     JSON config response     │                     │
└─────────────────┘                              └──────────┬──────────┘
                                                            │
                                                            ▼
                                                 ┌─────────────────────┐
                                                 │   Cloudflare KV     │
                                                 │                     │
                                                 │ • session-recording-│
                                                 │   build-numbers     │
                                                 │ • session-recording-│
                                                 │   email-patterns    │
                                                 └─────────────────────┘
```

## Cloudflare Worker

**Location:** `cloudflare-worker/session-config-worker.js`

> **Note:** This file is NOT part of the mobile client build. It is a standalone Cloudflare Worker
> that must be deployed separately to Cloudflare. The mobile client calls this worker's endpoint
> to fetch configuration.

**Endpoint:** `https://feature-flags.terraso.org/{staging|prod}?t={timestamp}&sig={signature}`

### Deploying the Worker

From the `cloudflare-worker/` directory:

```bash
# Deploy the worker (requires wrangler CLI and Cloudflare login)
wrangler deploy

# Watch live request logs (useful for debugging)
wrangler tail terraso-feature-flags
```

**Prerequisites:**
- Install wrangler: `npm install -g wrangler`
- Login to Cloudflare: `wrangler login`
- Ensure `SHARED_SECRET` is set in Cloudflare dashboard (Settings > Variables)

### Authentication

- HMAC-SHA256 signed requests
- Signature = HMAC(timestamp, SHARED_SECRET)
- Timestamps must be within 5 minutes of current time

### KV Keys

| Key | Format | Examples |
|-----|--------|----------|
| `session-recording-build-numbers` | Comma or newline separated | `9999`, `100-200`, `300-`, `-500` |
| `session-recording-email-patterns` | Glob patterns | `*@techmatters.org`, `user@example.com` |

**Build number patterns:**
- Exact: `999` - matches build 999
- Range: `100-200` - matches builds 100-200 inclusive
- Min only: `300-` - matches builds ≥ 300
- Max only: `-500` - matches builds ≤ 500

### Response Format

```json
{
  "enabledBuilds": ["9999", "100-200"],
  "enabledEmails": ["*@techmatters.org"]
}
```

## When Config is Fetched

**Two separate fetches happen, but they're coupled together:**

| Fetch | What it gets | Used for |
|-------|--------------|----------|
| **Cloudflare fetch** | `enabledBuilds`, `enabledEmails` | Session recording decision |
| **PostHog polling** | `banner_message` flag | In-app banner messages (unrelated to recording) |

**When each runs:**

| Event | Cloudflare | PostHog |
|-------|------------|---------|
| **App startup** | ✅ Defers PostHog init until complete (3s timeout) | ❌ Not yet initialized |
| **App mount** (after PostHog init) | ✅ | ✅ |
| **App comes to foreground** | ✅ | ✅ |
| **Sites screen focus** | ✅ | ✅ |
| **Manual refresh** (debug panel) | ✅ | ✅ |

> **Note:** At app startup, the UI renders immediately. Only PostHog initialization waits for the
> Cloudflare fetch to complete (or timeout after 3s). This ensures we have fresh config before
> making the immutable session recording decision.

### Polling Cycle Details

A "polling cycle" is triggered by any event above (except initial startup) and does:
1. **Cloudflare fetch:** Once at the START of the cycle (for session recording config)
2. **PostHog polling:** Every 1 second for 30 seconds (for `banner_message` flag only)

Both are coupled in the same trigger mechanism.

## Session Recording Decision Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      APP STARTUP                              │
├──────────────────────────────────────────────────────────────┤
│ 1. Fetch config from Cloudflare (3s timeout)                 │
│ 2. Save to kvStorage cache                                   │
│ 3. Compute shouldRecord = buildMatches OR emailMatches       │
│ 4. Initialize PostHog with enableSessionReplay: shouldRecord │
│ 5. This value (isRecording) is IMMUTABLE until restart       │
└──────────────────────────────────────────────────────────────┘
```

### Three State Variables

| Variable | Description | Mutable? |
|----------|-------------|----------|
| `isRecording` | What was computed at startup | No - requires restart |
| `wantRecording` | What we WANT based on latest config | Yes - updates on fetch |
| `nativeActive` | Whether native replay module is running | Reflects actual state |

### Version Indicator Suffix

The version string (e.g., "Version 1.4.3 (9999)") shows recording state:

| Suffix | Meaning |
|--------|---------|
| *(nothing)* | Not recording (all false) |
| `(r)` | Recording normally (all true) |
| `(w)` | Want recording, restart needed to enable |
| `(in)` | Recording but shouldn't be, restart needed to disable |
| `(wi)` | JS ready but native failed to start |
| `(wn)` | Native on but JS missed bootstrap |
| `(i)` | JS thinks recording but native off (hot reload artifact) |
| `(n)` | Native stuck on |

## Session Replay Config

```typescript
sessionReplayConfig: {
  maskAllTextInputs: false,  // Disabled - caused crashes
  maskAllImages: false,      // Disabled - not needed
  captureLog: true,
}
```

Masking is disabled on all platforms because it caused stack-related crashes.

## Key Files

| File | Purpose |
|------|---------|
| `cloudflare-worker/session-config-worker.js` | Cloudflare Worker serving config from KV |
| `cloudflare-worker/wrangler.toml` | Wrangler deployment config (KV bindings) |
| `src/app/posthog/sessionRecordingConfig.ts` | Fetch config with HMAC auth (3s timeout) |
| `src/app/posthog/PostHog.tsx` | Main integration, polling, recording state |
| `src/components/SessionReplayDebugContent.tsx` | Debug panel in settings |
| `src/screens/.../VersionIndicatorComponent.tsx` | Shows recording state suffix |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FEATURE_FLAG_URL` | Cloudflare Worker URL (e.g., `https://feature-flags.terraso.org/staging`) |
| `FEATURE_FLAG_SECRET` | Shared secret for HMAC signing |

**If env vars are missing or fetch fails:**
- Session recording is simply disabled
- Uses cached config if available, otherwise `shouldRecord = false`
- There is NO fallback to PostHog feature flags

## Testing with Script

Use the provided script to test the Cloudflare Worker endpoint:

```bash
# From dev-client directory
./scripts/fetch-feature-flags.sh [staging|prod]
```

**Requirements:**
- Your `dev-client/.env` file must contain:
  - `FEATURE_FLAG_URL` - The worker endpoint (e.g., `https://feature-flags.terraso.org/staging`)
  - `FEATURE_FLAG_SECRET` - The shared secret for HMAC signing

**What it does:**
1. Reads credentials from `.env`
2. Extracts the base URL (strips `/staging` or `/prod` suffix if present)
3. Generates a signed request with current timestamp
4. Fetches and displays the JSON config

**Example output:**
```json
{
  "enabledBuilds": ["330", "9999"],
  "enabledEmails": ["*@techmatters.org"]
}
```
