/**
 * Scheduled Executor Worker
 *
 * Runs on a cron trigger at midnight GMT+7 (17:00 UTC).
 * Fetches all pending scheduled actions from Airtable,
 * executes them via Facebook Graph API, and logs results.
 *
 * Also exposes POST /run for manual triggering during development.
 */

import type { Env } from './types';
import { executeScheduledActions } from './executor';

export default {
  /**
   * Cron trigger handler — runs at the scheduled time.
   */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      executeScheduledActions(env)
        .then((result) => {
          console.log(
            `Scheduled execution complete: ${result.total} total, ${result.success} success, ${result.failed} failed`,
          );
        })
        .catch((err) => {
          console.error('Scheduled execution error:', err);
        }),
    );
  },

  /**
   * HTTP handler — for manual triggering and health checks.
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // POST /run — manually trigger execution
    if (url.pathname === '/run' && request.method === 'POST') {
      try {
        const result = await executeScheduledActions(env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // GET / — health check
    return new Response(
      JSON.stringify({ name: 'ops-scheduled-executor', status: 'ok' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  },
};
