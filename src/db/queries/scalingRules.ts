/**
 * D1 Query Functions — Scaling Rules
 * READ-ONLY for Phase 3.
 */

import type { DbClient } from '../client';
import { scalingRules } from '../schema';

export async function getAllScalingRules(db: DbClient) {
  return db
    .select()
    .from(scalingRules)
    .orderBy(scalingRules.name);
}
