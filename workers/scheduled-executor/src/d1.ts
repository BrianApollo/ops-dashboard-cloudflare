/**
 * D1 client for rule execution logging.
 * Auto-creates the table on first run.
 */

import type { RuleExecutionLog } from './rule-types';

// =============================================================================
// TABLE SETUP
// =============================================================================

export async function ensureRuleLogTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS rule_execution_logs (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        executed_at TEXT NOT NULL,
        campaigns_evaluated INTEGER NOT NULL DEFAULT 0,
        campaigns_matched INTEGER NOT NULL DEFAULT 0,
        actions_taken TEXT,
        status TEXT NOT NULL,
        error TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_rule_exec_rule_id
       ON rule_execution_logs(rule_id)`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_rule_exec_executed_at
       ON rule_execution_logs(executed_at)`,
    )
    .run();
}

// =============================================================================
// INSERT
// =============================================================================

export async function insertRuleExecutionLog(
  db: D1Database,
  log: RuleExecutionLog,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rule_execution_logs
       (id, rule_id, rule_name, executed_at, campaigns_evaluated,
        campaigns_matched, actions_taken, status, error, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      log.id,
      log.ruleId,
      log.ruleName,
      log.executedAt,
      log.campaignsEvaluated,
      log.campaignsMatched,
      log.actionsTaken,
      log.status,
      log.error || null,
      log.durationMs,
    )
    .run();
}

// =============================================================================
// QUERY
// =============================================================================

export async function queryRecentLogs(
  db: D1Database,
  limit = 50,
): Promise<RuleExecutionLog[]> {
  const result = await db
    .prepare(
      `SELECT id, rule_id, rule_name, executed_at,
              campaigns_evaluated, campaigns_matched,
              actions_taken, status, error, duration_ms
       FROM rule_execution_logs
       ORDER BY executed_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all();

  return (result.results || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    ruleId: row.rule_id as string,
    ruleName: row.rule_name as string,
    executedAt: row.executed_at as string,
    campaignsEvaluated: row.campaigns_evaluated as number,
    campaignsMatched: row.campaigns_matched as number,
    actionsTaken: row.actions_taken as string,
    status: row.status as RuleExecutionLog['status'],
    error: (row.error as string) || undefined,
    durationMs: row.duration_ms as number,
  }));
}
