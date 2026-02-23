/**
 * Scheduled Executor Worker
 *
 * Runs on cron triggers:
 *   - 17:00 UTC (midnight GMT+7): execute pending scheduled actions + evaluate midnight rules
 *   - Every hour: evaluate rules with custom schedules (no-op if no rules match)
 *
 * HTTP endpoints:
 *   - POST /run         — manually trigger scheduled actions
 *   - POST /run-rules   — manually trigger ALL rule evaluation (?dry=true for safe testing)
 *   - POST /run-rules/:id — trigger a single rule by Airtable record ID
 *   - GET  /rule-logs   — recent execution logs from D1
 *   - GET  /            — health check
 */

import type { Env } from './types';
import { executeScheduledActions } from './executor';
import { evaluateRules } from './rule-evaluator';
import { queryRecentLogs } from './d1';
import { ensureRuleLogTable } from './d1';

// =============================================================================
// HELPERS
// =============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// =============================================================================
// WORKER
// =============================================================================

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cronTime = new Date(event.scheduledTime);
    const utcHour = cronTime.getUTCHours();

    // Existing scheduled actions — only at midnight GMT+7 (17:00 UTC)
    if (utcHour === 17) {
      ctx.waitUntil(
        executeScheduledActions(env)
          .then((r) =>
            console.log(
              `[scheduled] ${r.total} actions, ${r.success} success, ${r.failed} failed`,
            ),
          )
          .catch((err) => console.error('[scheduled] error:', err)),
      );
    }

    // Rule evaluation — runs for rules matching the current hour
    ctx.waitUntil(
      evaluateRules(env, { currentUtcHour: utcHour })
        .then((r) =>
          console.log(
            `[rules] Evaluated ${r.rulesEvaluated} rules, ${r.totalActions} actions taken`,
          ),
        )
        .catch((err) => console.error('[rules] error:', err)),
    );
  },

  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dry') === 'true';

    // POST /run — manually trigger scheduled actions
    if (url.pathname === '/run' && request.method === 'POST') {
      try {
        const result = await executeScheduledActions(env);
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({ error: errorMessage(err) }, 500);
      }
    }

    // POST /run-rules — manually trigger ALL rule evaluation
    if (url.pathname === '/run-rules' && request.method === 'POST') {
      try {
        const result = await evaluateRules(env, { force: true, dryRun });
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({ error: errorMessage(err) }, 500);
      }
    }

    // POST /run-rules/:ruleId — trigger a single rule
    const singleRuleMatch = url.pathname.match(/^\/run-rules\/(.+)$/);
    if (singleRuleMatch && request.method === 'POST') {
      try {
        const result = await evaluateRules(env, {
          ruleId: singleRuleMatch[1],
          force: true,
          dryRun,
        });
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({ error: errorMessage(err) }, 500);
      }
    }

    // GET /rule-logs — recent execution logs from D1
    if (url.pathname === '/rule-logs' && request.method === 'GET') {
      try {
        await ensureRuleLogTable(env.DB);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const logs = await queryRecentLogs(env.DB, limit);
        return jsonResponse({ logs });
      } catch (err) {
        return jsonResponse({ error: errorMessage(err) }, 500);
      }
    }

    // GET / — health check
    return jsonResponse({ name: 'ops-scheduled-executor', status: 'ok' });
  },
};
