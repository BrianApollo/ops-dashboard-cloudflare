/**
 * Dual logger: writes rule execution results to both Airtable and D1.
 * Neither failure should crash execution.
 */

import type { Env } from './types';
import type { RuleExecutionLog } from './rule-types';
import { createRuleExecutionLog } from './airtable';
import { insertRuleExecutionLog } from './d1';

export async function logRuleExecution(
  env: Env,
  log: RuleExecutionLog,
): Promise<void> {
  const [airtableResult, d1Result] = await Promise.allSettled([
    createRuleExecutionLog(env, {
      'Rule Name': log.ruleName,
      'Rule ID': log.ruleId,
      'Executed At': log.executedAt.split('T')[0],
      'Campaigns Evaluated': log.campaignsEvaluated,
      'Campaigns Matched': log.campaignsMatched,
      'Actions Taken': log.actionsTaken,
      Status: log.status,
      Error: log.error || '',
      'Duration (ms)': log.durationMs,
    }),
    insertRuleExecutionLog(env.DB, log),
  ]);

  if (airtableResult.status === 'rejected') {
    console.error('[rule-logger] Airtable log failed:', airtableResult.reason);
  }
  if (d1Result.status === 'rejected') {
    console.error('[rule-logger] D1 log failed:', d1Result.reason);
  }
}
