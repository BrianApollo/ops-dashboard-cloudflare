var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/airtable.ts
var AIRTABLE_BASE_URL = "https://api.airtable.com/v0";
async function airtableRequest(env, table, path, options) {
  const url = `${AIRTABLE_BASE_URL}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable ${response.status}: ${text}`);
  }
  return response.json();
}
__name(airtableRequest, "airtableRequest");
async function getMasterProfileToken(env) {
  const masterData = await airtableRequest(env, "Master Profile", "");
  if (!masterData.records.length) {
    throw new Error("No master profile configured");
  }
  const linkedProfileIds = masterData.records[0].fields["Profile Record"];
  if (!linkedProfileIds?.length) {
    throw new Error("Master profile has no linked profile");
  }
  const profileData = await airtableRequest(
    env,
    "Profiles",
    `/${linkedProfileIds[0]}`
  );
  const token = profileData.fields["Permanent Token"];
  if (!token) {
    throw new Error("Master profile has no permanent token");
  }
  return token;
}
__name(getMasterProfileToken, "getMasterProfileToken");
async function fetchPendingActions(env) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const formula = encodeURIComponent(
    `AND({Status} = 'Pending', IS_BEFORE({Scheduled At}, DATEADD('${today}', 1, 'days')))`
  );
  const url = `?filterByFormula=${formula}`;
  const allRecords = [];
  let offset;
  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const data = await airtableRequest(env, "Schedule", fetchUrl);
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}
__name(fetchPendingActions, "fetchPendingActions");
async function updateScheduleRecord(env, recordId, fields) {
  await airtableRequest(env, "Schedule", `/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}
__name(updateScheduleRecord, "updateScheduleRecord");

// src/facebook.ts
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
async function updateCampaignBudget(campaignId, dailyBudgetCents, accessToken, appSecret) {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${campaignId}`;
  const response = await fetch(url, {
    method: "POST",
    body: new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      daily_budget: String(dailyBudgetCents)
    })
  });
  const data = await response.json();
  if (data.error) {
    return { success: false, response: data };
  }
  return { success: true, response: data };
}
__name(updateCampaignBudget, "updateCampaignBudget");
async function updateCampaignStatus(campaignId, status, accessToken, appSecret) {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${campaignId}`;
  const response = await fetch(url, {
    method: "POST",
    body: new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      status
    })
  });
  const data = await response.json();
  if (data.error) {
    return { success: false, response: data };
  }
  return { success: true, response: data };
}
__name(updateCampaignStatus, "updateCampaignStatus");

// src/executor.ts
async function executeScheduledActions(env) {
  console.log("[executor] Fetching master profile token...");
  const accessToken = await getMasterProfileToken(env);
  console.log("[executor] Got token, fetching pending actions...");
  const actions = await fetchPendingActions(env);
  console.log(`[executor] Found ${actions.length} pending action(s)`);
  if (actions.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }
  const results = await Promise.allSettled(
    actions.map((action) => executeAction(action, accessToken, env))
  );
  let success = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      success++;
    } else {
      failed++;
    }
  }
  console.log(`[executor] Done: ${actions.length} total, ${success} success, ${failed} failed`);
  return { total: actions.length, success, failed };
}
__name(executeScheduledActions, "executeScheduledActions");
async function executeAction(action, accessToken, env) {
  const { id, fields } = action;
  const campaignId = fields["Campaign Id"];
  const type = fields.Type;
  const execute = fields.Execute;
  console.log(`[executor] Processing action ${id}: type=${type}, campaign=${campaignId}, execute=${execute}`);
  if (!campaignId || !type || !execute) {
    console.log(`[executor] Action ${id}: missing required fields`);
    await safeUpdate(env, id, {
      Status: "Failed",
      Response: JSON.stringify({ error: "Missing required fields: Campaign Id, Type, or Execute" })
    });
    return false;
  }
  await safeUpdate(env, id, { Status: "Running" });
  try {
    let result;
    if (type === "Budget Change") {
      const dollars = parseFloat(execute);
      if (isNaN(dollars) || dollars <= 0) {
        throw new Error(`Invalid budget value: ${execute}`);
      }
      const cents = Math.round(dollars * 100);
      console.log(`[executor] Action ${id}: setting budget to ${cents} cents for campaign ${campaignId}`);
      result = await updateCampaignBudget(campaignId, cents, accessToken, env.FB_APP_SECRET);
    } else if (type === "Status Change") {
      const status = execute.toUpperCase();
      if (status !== "ACTIVE" && status !== "PAUSED") {
        throw new Error(`Invalid status value: ${execute}. Must be ACTIVE or PAUSED`);
      }
      console.log(`[executor] Action ${id}: setting status to ${status} for campaign ${campaignId}`);
      result = await updateCampaignStatus(campaignId, status, accessToken, env.FB_APP_SECRET);
    } else {
      throw new Error(`Unknown action type: ${type}`);
    }
    console.log(`[executor] Action ${id}: FB API result:`, JSON.stringify(result));
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await safeUpdate(env, id, {
      Status: result.success ? "Success" : "Failed",
      "Executed At": today,
      Response: JSON.stringify(result.response)
    });
    return result.success;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[executor] Action ${id} error:`, errorMessage);
    await safeUpdate(env, id, {
      Status: "Failed",
      "Executed At": (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      Response: JSON.stringify({ error: errorMessage })
    });
    return false;
  }
}
__name(executeAction, "executeAction");
async function safeUpdate(env, recordId, fields) {
  try {
    await updateScheduleRecord(env, recordId, fields);
  } catch (err) {
    console.error(`[executor] Failed to update record ${recordId}:`, err);
  }
}
__name(safeUpdate, "safeUpdate");

// src/index.ts
var src_default = {
  /**
   * Cron trigger handler — runs at the scheduled time.
   */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      executeScheduledActions(env).then((result) => {
        console.log(
          `Scheduled execution complete: ${result.total} total, ${result.success} success, ${result.failed} failed`
        );
      }).catch((err) => {
        console.error("Scheduled execution error:", err);
      })
    );
  },
  /**
   * HTTP handler — for manual triggering and health checks.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const result = await executeScheduledActions(env);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response(
      JSON.stringify({ name: "ops-scheduled-executor", status: "ok" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// .wrangler/tmp/bundle-JTZXPJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
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
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-JTZXPJ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
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
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
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
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
