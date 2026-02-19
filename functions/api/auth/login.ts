/**
 * POST /api/auth/login
 *
 * Server-side login endpoint.
 * - Queries Airtable Users table server-side (API key never leaves the server)
 * - Compares password against stored hash (PBKDF2)
 * - Falls back to plaintext comparison for un-migrated passwords
 * - Returns a signed JWT on success
 * - Rate-limited per IP (5 attempts per 15 minutes per isolate)
 */

import { hashPassword, verifyPassword, createJwt } from '../../lib/auth';

interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  JWT_SECRET: string;
}

// ---------------------------------------------------------------------------
// Per-isolate rate limiter (best-effort; full protection requires CF WAF rules)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  // Lazy cleanup: purge expired entries every check
  if (entry && now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }

  if (!entry) return false;
  return entry.count >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}

// Periodic cleanup to prevent memory leak (runs at most once per minute)
let lastCleanup = 0;
function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Rate limiting
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  cleanupExpired();

  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '900',
      },
    });
  }

  // Parse request body
  let email: string;
  let password: string;
  try {
    const body = await request.json() as { email?: string; password?: string };
    email = body.email?.trim() || '';
    password = body.password || '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Record the attempt before querying (counts toward rate limit even if valid)
  recordAttempt(clientIp);

  // Query Airtable for user by email (server-side — API key stays here)
  // Sanitize: strip all characters outside safe email charset to prevent formula injection
  const safeEmail = email.replace(/[^a-zA-Z0-9@._+\-]/g, '');
  const formula = encodeURIComponent(`{Email} = '${safeEmail}'`);
  const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`;

  const airtableResponse = await fetch(airtableUrl, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!airtableResponse.ok) {
    console.error('Airtable query failed:', airtableResponse.status);
    return new Response(JSON.stringify({ error: 'Authentication service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await airtableResponse.json() as {
    records: Array<{
      id: string;
      fields: Record<string, unknown>;
    }>;
  };

  if (!data.records || data.records.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find matching user record
  let matchedRecord: (typeof data.records)[0] | null = null;

  for (const record of data.records) {
    const storedPassword = record.fields['Password'] as string;
    if (!storedPassword) continue;

    // Try hashed password first (format: "base64salt:base64hash")
    if (storedPassword.includes(':') && storedPassword.length > 30) {
      const valid = await verifyPassword(password, storedPassword);
      if (valid) {
        matchedRecord = record;
        break;
      }
    } else {
      // Fallback: plaintext comparison for un-migrated passwords
      if (storedPassword === password) {
        matchedRecord = record;

        // Auto-migrate: hash the plaintext password and save it back
        const hashed = await hashPassword(password);
        await fetch(
          `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Users/${record.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: { Password: hashed } }),
          }
        );
        break;
      }
    }
  }

  if (!matchedRecord) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract role
  const rawRole = matchedRecord.fields['Role'];
  let role = '';
  if (Array.isArray(rawRole)) {
    role = (rawRole[0] as string) || '';
  } else if (typeof rawRole === 'string') {
    role = rawRole;
  }

  // Create JWT
  const user = {
    id: matchedRecord.id,
    email: matchedRecord.fields['Email'] as string,
    role: role.trim().toLowerCase(),
  };

  const token = await createJwt(user, env.JWT_SECRET);

  // Set HTTP-only cookie AND return token in body (client uses whichever)
  return new Response(
    JSON.stringify({ user, token }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `ops_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
      },
    }
  );
};
