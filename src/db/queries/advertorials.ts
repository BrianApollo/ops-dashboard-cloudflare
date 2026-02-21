/**
 * D1 Query Functions — Advertorials
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { advertorials, products } from '../schema';

const advertorialFields = {
  id:              advertorials.id,
  advertorialName: advertorials.advertorialName,
  productId:       advertorials.productId,
  advertorialText: advertorials.advertorialText,
  finalLink:       advertorials.finalLink,
  isChecked:       advertorials.isChecked,
  createdAt:       advertorials.createdAt,
  productName:     products.productName,
};

export async function getAllAdvertorials(db: DbClient) {
  return db
    .select(advertorialFields)
    .from(advertorials)
    .leftJoin(products, eq(advertorials.productId, products.id));
}

export async function getAdvertorialsByProduct(db: DbClient, productId: string) {
  return db
    .select(advertorialFields)
    .from(advertorials)
    .leftJoin(products, eq(advertorials.productId, products.id))
    .where(eq(advertorials.productId, productId));
}
