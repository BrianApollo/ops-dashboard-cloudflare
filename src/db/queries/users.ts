/**
 * D1 Query Functions — Users
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { users } from '../schema';

export async function getAllUsers(db: DbClient, role?: string) {
  if (role) {
    return db.select().from(users).where(eq(users.role, role));
  }
  return db.select().from(users);
}

export async function getUserById(db: DbClient, id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}
