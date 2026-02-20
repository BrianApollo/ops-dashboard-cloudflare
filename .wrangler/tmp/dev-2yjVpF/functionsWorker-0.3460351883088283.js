var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-TLxViA/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-FHAsjg/functionsWorker-0.3460351883088283.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
var PBKDF2_ITERATIONS = 1e5;
var SALT_LENGTH = 16;
var HASH_LENGTH = 32;
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
__name2(arrayBufferToBase64, "arrayBufferToBase64");
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
__name(base64ToArrayBuffer, "base64ToArrayBuffer");
__name2(base64ToArrayBuffer, "base64ToArrayBuffer");
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return `${arrayBufferToBase64(salt.buffer)}:${arrayBufferToBase64(hash)}`;
}
__name(hashPassword, "hashPassword");
__name2(hashPassword, "hashPassword");
async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64)
    return false;
  const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    HASH_LENGTH * 8
  );
  const storedHash = new Uint8Array(base64ToArrayBuffer(hashB64));
  const computedHash = new Uint8Array(hash);
  if (storedHash.length !== computedHash.length)
    return false;
  let match2 = 0;
  for (let i = 0; i < storedHash.length; i++) {
    match2 |= storedHash[i] ^ computedHash[i];
  }
  return match2 === 0;
}
__name(verifyPassword, "verifyPassword");
__name2(verifyPassword, "verifyPassword");
var JWT_EXPIRY_SECONDS = 24 * 60 * 60;
function base64UrlEncode(data) {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64UrlEncode, "base64UrlEncode");
__name2(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(data) {
  const padded = data + "=".repeat((4 - data.length % 4) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}
__name(base64UrlDecode, "base64UrlDecode");
__name2(base64UrlDecode, "base64UrlDecode");
async function getSigningKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(getSigningKey, "getSigningKey");
__name2(getSigningKey, "getSigningKey");
async function createJwt(user, secret) {
  const now = Math.floor(Date.now() / 1e3);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS
    })
  );
  const encoder = new TextEncoder();
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${header}.${payload}`)
  );
  const sig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payload}.${sig}`;
}
__name(createJwt, "createJwt");
__name2(createJwt, "createJwt");
async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3)
    return null;
  const [header, payload, sig] = parts;
  try {
    const encoder = new TextEncoder();
    const key = await getSigningKey(secret);
    const signatureBytes = Uint8Array.from(
      base64UrlDecode(sig),
      (c) => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(`${header}.${payload}`)
    );
    if (!valid)
      return null;
    const decoded = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1e3);
    if (decoded.exp < now)
      return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyJwt, "verifyJwt");
__name2(verifyJwt, "verifyJwt");
function extractToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    const match2 = cookie.match(/(?:^|;\s*)ops_session=([^;]+)/);
    if (match2)
      return match2[1];
  }
  return null;
}
__name(extractToken, "extractToken");
__name2(extractToken, "extractToken");
async function authenticateRequest(request, jwtSecret) {
  const token = extractToken(request);
  if (!token)
    return null;
  const payload = await verifyJwt(token, jwtSecret);
  if (!payload)
    return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role
  };
}
__name(authenticateRequest, "authenticateRequest");
__name2(authenticateRequest, "authenticateRequest");
var RATE_LIMIT_WINDOW_MS = 15 * 60 * 1e3;
var RATE_LIMIT_MAX_ATTEMPTS = 5;
var loginAttempts = /* @__PURE__ */ new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  if (!entry)
    return false;
  return entry.count >= RATE_LIMIT_MAX_ATTEMPTS;
}
__name(isRateLimited, "isRateLimited");
__name2(isRateLimited, "isRateLimited");
function recordAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}
__name(recordAttempt, "recordAttempt");
__name2(recordAttempt, "recordAttempt");
var lastCleanup = 0;
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 6e4)
    return;
  lastCleanup = now;
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}
__name(cleanupExpired, "cleanupExpired");
__name2(cleanupExpired, "cleanupExpired");
var onRequestPost = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  cleanupExpired();
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Too many login attempts. Please try again later." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "900"
      }
    });
  }
  let email;
  let password;
  try {
    const body = await request.json();
    email = body.email?.trim() || "";
    password = body.password || "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  recordAttempt(clientIp);
  const safeEmail = email.replace(/[^a-zA-Z0-9@._+\-]/g, "");
  const formula = encodeURIComponent(`{Email} = '${safeEmail}'`);
  const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Users?filterByFormula=${formula}`;
  const airtableResponse = await fetch(airtableUrl, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  if (!airtableResponse.ok) {
    console.error("Airtable query failed:", airtableResponse.status);
    return new Response(JSON.stringify({ error: "Authentication service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
  const data = await airtableResponse.json();
  if (!data.records || data.records.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid email or password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  let matchedRecord = null;
  for (const record of data.records) {
    const storedPassword = record.fields["Password"];
    if (!storedPassword)
      continue;
    if (storedPassword.includes(":") && storedPassword.length > 30) {
      const valid = await verifyPassword(password, storedPassword);
      if (valid) {
        matchedRecord = record;
        break;
      }
    } else {
      if (storedPassword === password) {
        matchedRecord = record;
        const hashed = await hashPassword(password);
        await fetch(
          `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Users/${record.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ fields: { Password: hashed } })
          }
        );
        break;
      }
    }
  }
  if (!matchedRecord) {
    return new Response(JSON.stringify({ error: "Invalid email or password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const rawRole = matchedRecord.fields["Role"];
  let role = "";
  if (Array.isArray(rawRole)) {
    role = rawRole[0] || "";
  } else if (typeof rawRole === "string") {
    role = rawRole;
  }
  const user = {
    id: matchedRecord.id,
    email: matchedRecord.fields["Email"],
    role: role.trim().toLowerCase()
  };
  const token = await createJwt(user, env.JWT_SECRET);
  return new Response(
    JSON.stringify({ user, token }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `ops_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
      }
    }
  );
}, "onRequestPost");
var onRequestPost2 = /* @__PURE__ */ __name2(async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "ops_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
    }
  });
}, "onRequestPost");
var onRequestGet = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");
var FB_API_VERSION = "v21.0";
var FB_GRAPH_URL = "https://graph.facebook.com";
async function computeAppSecretProof(accessToken, appSecret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(accessToken));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(computeAppSecretProof, "computeAppSecretProof");
__name2(computeAppSecretProof, "computeAppSecretProof");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
var onRequestPost3 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!["admin", "ops"].includes(user.role)) {
    return jsonResponse({ error: "Forbidden \u2014 infrastructure access requires ops or admin role" }, 403);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { action } = body;
  if (action === "graph_call") {
    const endpoint = body.endpoint;
    const method = body.method || "GET";
    const accessToken = body.accessToken;
    const params = body.params || {};
    if (!endpoint || !accessToken) {
      return jsonResponse({ error: "Missing endpoint or accessToken" }, 400);
    }
    const proof = await computeAppSecretProof(accessToken, env.FB_APP_SECRET);
    const allParams = {
      ...params,
      access_token: accessToken,
      appsecret_proof: proof
    };
    let fbResponse;
    if (method === "GET") {
      const qs = new URLSearchParams(allParams);
      const url = `${FB_GRAPH_URL}/${FB_API_VERSION}${endpoint}?${qs}`;
      fbResponse = await fetch(url);
    } else {
      const url = `${FB_GRAPH_URL}/${FB_API_VERSION}${endpoint}`;
      fbResponse = await fetch(url, {
        method: "POST",
        body: new URLSearchParams(allParams)
      });
    }
    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (action === "validate_token") {
    const inputToken = body.inputToken;
    if (!inputToken) {
      return jsonResponse({ error: "Missing inputToken" }, 400);
    }
    const appToken = `${env.FB_APP_ID}|${env.FB_APP_SECRET}`;
    const qs = new URLSearchParams({
      input_token: inputToken,
      access_token: appToken
    });
    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/debug_token?${qs}`;
    const fbResponse = await fetch(url);
    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (action === "exchange_token") {
    const shortLivedToken = body.shortLivedToken;
    if (!shortLivedToken) {
      return jsonResponse({ error: "Missing shortLivedToken" }, 400);
    }
    const qs = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: env.FB_APP_ID,
      client_secret: env.FB_APP_SECRET,
      fb_exchange_token: shortLivedToken
    });
    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/oauth/access_token?${qs}`;
    const fbResponse = await fetch(url);
    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
}, "onRequestPost");
var ADMIN_ROLES = ["Admin", "Ops", "ops", "admin"];
var EDITOR_ROLES = ["Video Editor", "video editor"];
var ADMIN_ONLY_TABLES = /* @__PURE__ */ new Set([
  // Infrastructure table IDs
  "tble3Qky3A2j8LpSj",
  // Profiles (contains FB passwords, tokens, 2FA)
  "tbl1xnWkoju7WG8lb",
  // Business Managers
  "tbltReEL235grY3Im",
  // Ad Accounts
  "tblUwiY8UQVi3yXBU",
  // Pages
  "tblsMDmQedp4B3pB8"
  // Pixels
]);
var EDITOR_READ_ONLY_TABLES = /* @__PURE__ */ new Set([
  "Users",
  "Products",
  "Video Scripts",
  "Ad Presets",
  "Campaigns",
  "Advertorials",
  "Images"
]);
var SENSITIVE_FIELDS = /* @__PURE__ */ new Set([
  "Password",
  "Permanent Token",
  "Profile FB Password",
  "Profile Email Password",
  "Profile 2FA",
  "Security Email Password",
  "System User Token",
  "System User ID",
  "Session Cookie"
]);
function isAdmin(user) {
  return ADMIN_ROLES.includes(user.role);
}
__name(isAdmin, "isAdmin");
__name2(isAdmin, "isAdmin");
function isEditor(user) {
  return EDITOR_ROLES.includes(user.role);
}
__name(isEditor, "isEditor");
__name2(isEditor, "isEditor");
function canAccessTable(user, tableName, method) {
  if (isAdmin(user)) {
    return { allowed: true };
  }
  if (ADMIN_ONLY_TABLES.has(tableName)) {
    return { allowed: false, reason: `Table "${tableName}" requires admin access` };
  }
  if (isEditor(user) && EDITOR_READ_ONLY_TABLES.has(tableName) && method !== "GET") {
    return { allowed: false, reason: `Editors cannot modify "${tableName}"` };
  }
  return { allowed: true };
}
__name(canAccessTable, "canAccessTable");
__name2(canAccessTable, "canAccessTable");
function stripSensitiveFields(records, user) {
  if (isAdmin(user))
    return records;
  return records.map((record) => {
    const cleanFields = {};
    for (const [key, value] of Object.entries(record.fields)) {
      if (!SENSITIVE_FIELDS.has(key)) {
        cleanFields[key] = value;
      }
    }
    return { ...record, fields: cleanFields };
  });
}
__name(stripSensitiveFields, "stripSensitiveFields");
__name2(stripSensitiveFields, "stripSensitiveFields");
var onRequest = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const pathSegments = params.path;
  const airtablePath = pathSegments.join("/");
  const tableName = decodeURIComponent(pathSegments[0] || "");
  const access = canAccessTable(user, tableName, request.method);
  if (!access.allowed) {
    return new Response(
      JSON.stringify({ error: "Forbidden", message: access.reason }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  const url = new URL(request.url);
  const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${airtablePath}${url.search}`;
  const headers = {
    Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
  };
  const fetchOptions = {
    method: request.method,
    headers
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = await request.text();
  }
  const airtableResponse = await fetch(airtableUrl, fetchOptions);
  const responseBody = await airtableResponse.text();
  if (request.method === "GET" && airtableResponse.ok) {
    try {
      const data = JSON.parse(responseBody);
      if (data.records && Array.isArray(data.records)) {
        data.records = stripSensitiveFields(data.records, user);
        return new Response(JSON.stringify(data), {
          status: airtableResponse.status,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch {
    }
  }
  return new Response(responseBody, {
    status: airtableResponse.status,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");
var onRequest2 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!isAdmin(user)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  const pathSegments = params.path;
  const redtrackPath = "/" + pathSegments.join("/");
  const baseUrl = env.REDTRACK_BASE_URL || "https://api.redtrack.io";
  const url = new URL(request.url);
  const redtrackUrl = new URL(`${baseUrl}${redtrackPath}`);
  url.searchParams.forEach((value, key) => {
    redtrackUrl.searchParams.set(key, value);
  });
  redtrackUrl.searchParams.delete("api_key");
  const hasAuthHeader = request.headers.get("X-Redtrack-Auth-Mode") === "bearer";
  const headers = {
    "Content-Type": "application/json"
  };
  if (hasAuthHeader) {
    headers["Authorization"] = `Bearer ${env.REDTRACK_API_KEY}`;
  } else {
    redtrackUrl.searchParams.set("api_key", env.REDTRACK_API_KEY);
  }
  const fetchOptions = {
    method: request.method,
    headers
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = await request.text();
  }
  const response = await fetch(redtrackUrl.toString(), fetchOptions);
  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");
var routes = [
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/facebook/proxy",
    mountPath: "/api/facebook",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/airtable/:path*",
    mountPath: "/api/airtable",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/redtrack/:path*",
    mountPath: "/api/redtrack",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-TLxViA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-TLxViA/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.3460351883088283.js.map
