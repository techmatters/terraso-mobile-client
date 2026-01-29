/**
 * Terraso Feature Flags Worker
 *
 * Returns feature flag configuration from KV store.
 * Requires signed requests to prevent casual abuse.
 *
 * Request format:
 *   GET /{env}?t={timestamp}&sig={signature}
 *
 *   - env: "staging" or "prod"
 *   - t: Unix timestamp (seconds)
 *   - sig: HMAC-SHA256(timestamp, SHARED_SECRET) as hex string
 *
 * Examples:
 *   GET /staging?t=1234567890&sig=abc123...
 *   GET /prod?t=1234567890&sig=abc123...
 *
 * KV Namespaces (bound to Worker):
 *   - FEATURE_FLAGS_STAGING (for staging)
 *   - FEATURE_FLAGS_PROD (for production)
 *
 * KV Keys (values separated by comma or newline, spaces ignored):
 *   - "session-recording-build-numbers": e.g., "327,328,9999" or "327\n328\n9999"
 *   - "session-recording-email-patterns": e.g., "*@techmatters.org,*@example.com"
 */

// How old a timestamp can be (in seconds) before rejecting
const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes

export default {
  async fetch(request, env) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse URL
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, ''); // Remove leading slash
    const timestamp = url.searchParams.get('t');
    const signature = url.searchParams.get('sig');

    // Determine environment from path
    let kv;
    if (path === 'staging') {
      kv = env.FEATURE_FLAGS_STAGING;
    } else if (path === 'prod') {
      kv = env.FEATURE_FLAGS_PROD;
    } else {
      return new Response('Invalid path. Use /staging or /prod', { status: 400 });
    }

    // Validate required parameters
    if (!timestamp || !signature) {
      return new Response('Missing required parameters: t, sig', { status: 400 });
    }

    // Validate timestamp is recent
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > MAX_TIMESTAMP_AGE_SECONDS) {
      return new Response('Timestamp expired or invalid', { status: 401 });
    }

    // Verify signature
    const expectedSignature = await computeHmac(timestamp, env.SHARED_SECRET);
    if (signature !== expectedSignature) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Fetch config from KV
    try {
      const [emailPatterns, buildNumbers] = await Promise.all([
        kv.get('session-recording-email-patterns'),
        kv.get('session-recording-build-numbers'),
      ]);

      // Parse values separated by comma or newline (spaces ignored)
      // Build numbers can be: exact (999), range (100-200), min (300-), max (-500)
      // Return as strings to preserve range syntax
      const parseList = (str) =>
        str ? str.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0) : [];

      const config = {
        enabledBuilds: parseList(buildNumbers),
        enabledEmails: parseList(emailPatterns),
      };

      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      return new Response('Internal error', { status: 500 });
    }
  },
};

/**
 * Compute HMAC-SHA256 of message using secret, return as hex string
 */
async function computeHmac(message, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
