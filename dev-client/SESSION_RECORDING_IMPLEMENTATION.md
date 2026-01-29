# Session Recording Implementation

## Overview

Session recording is controlled via a PostHog feature flag payload with client-side computation of `shouldRecord` based on build number and user email. This approach avoids PostHog's server propagation delays and the native module's inability to be reconfigured at runtime.

## PostHog Feature Flag Configuration

The `session_recording` feature flag should be configured as follows:

1. **Flag Value**: Always `true` (enabled for all users)
2. **Payload**: JSON object controlling who actually records:

```json
{
  "sequence": 1,
  "enabledBuilds": [327, 328, 9999],
  "enabledEmails": ["*@techmatters.org", "specific@example.com"]
}
```

### Payload Fields

- `sequence` (number): Monotonically increasing. Client ignores payloads with `sequence <= cachedSequence`. This protects against server flapping during propagation.
- `enabledBuilds` (number[]): List of build numbers that should record. Matches against the app's `versionCode` (Android) or `buildNumber` (iOS).
- `enabledEmails` (string[]): Email patterns with glob support. `*` matches any characters. Examples:
  - `*@techmatters.org` - matches any techmatters.org email
  - `test@example.com` - matches exactly that email

## Client-Side Logic

### At App Startup

1. Read cached payload from kvStorage
2. Get user email from Redux state (synchronously available)
3. Get current build number from Expo Constants
4. Compute `shouldRecord = buildMatches(enabledBuilds) || emailMatches(enabledEmails)`
5. Set `isRecording = shouldRecord` (immutable until app restart)
6. Set `wantRecording = shouldRecord`
7. Bootstrap PostHog SDK with `featureFlags: { session_recording: isRecording }`
8. Initialize native session replay with `enableSessionReplay: isRecording`

### During App Runtime

1. Poll for `session_recording` payload changes from PostHog
2. When new payload arrives:
   - If `sequence <= cachedSequence`, ignore (flapping protection)
   - If `sequence > cachedSequence`:
     - Save payload to kvStorage
     - Recompute `wantRecording` based on new payload + current email
     - If `wantRecording !== isRecording`: show restart banner after 5s delay

### On User Login/Logout

1. Recompute `wantRecording` with new email (or no email)
2. If `wantRecording !== isRecording`, show restart banner

## Why Bootstrap Uses `isRecording` (not `wantRecording`)

At startup, `isRecording` and `wantRecording` are identical - both computed from the same cached payload and current email. They only diverge later when:
- A new payload arrives with a higher sequence number
- The user logs in/out (email changes)

The bootstrap serves a specific purpose: **ensuring the PostHog SDK's `linkedFlag` check passes**.

PostHog's session replay has an internal `linkedFlag` feature where recording only activates if a specific feature flag is `true`. By bootstrapping with `session_recording: isRecording`, we ensure:
1. The SDK immediately has the flag value (no async fetch needed)
2. The flag value matches what we configured for the native module
3. The `linkedFlag` check passes when `isRecording` is true

Using `wantRecording` would work identically at startup (same value), but `isRecording` is semantically clearer - it represents "what the native module is actually configured to do."

## State Variables

| Variable | Meaning | When It Changes |
|----------|---------|-----------------|
| `isRecording` | What was configured at startup | Never (until app restart) |
| `wantRecording` | What we currently want | When payload or email changes |
| `showRestartBanner` | Whether to show restart prompt | When `wantRecording !== isRecording` (after 5s) |
| `cachedSequence` | Last processed sequence number | When valid new payload is received |

## Restart Banner

When `wantRecording !== isRecording`:
- A non-dismissible banner appears after 5 seconds
- Message indicates whether recording was enabled or disabled
- Banner only disappears when user restarts the app
- On restart, fresh computation from cached payload aligns `isRecording` with `wantRecording`

## Native Module Limitations

The PostHog React Native session replay native module:
- **CAN** be started at app initialization
- **CANNOT** be stopped or reconfigured without app restart
- This is why we use the "restart to apply" pattern instead of runtime reconfiguration

## Files Modified

- `src/app/PostHog.tsx` - Main implementation
- `src/components/PosthogBanner.tsx` - Restart banner component
- `src/components/SessionReplayDebugContent.tsx` - Debug panel updates

## Testing

To test session recording changes:

1. Set the `session_recording` payload in PostHog with your build number or email
2. Increase the `sequence` number each time you change the payload
3. Wait for the client to receive the new payload (~2 minutes propagation delay)
4. If `wantRecording` changes, you'll see the restart banner
5. Restart the app to apply the new configuration

## Example Workflow

**Enabling recording for a specific build:**

1. Initial payload: `{ "sequence": 1, "enabledBuilds": [], "enabledEmails": [] }`
2. User on build 327 - `shouldRecord = false`, no recording
3. Update payload: `{ "sequence": 2, "enabledBuilds": [327], "enabledEmails": [] }`
4. Client receives new payload, computes `wantRecording = true`
5. Since `wantRecording !== isRecording`, banner appears
6. User restarts app
7. On startup, `isRecording = true`, recording begins
