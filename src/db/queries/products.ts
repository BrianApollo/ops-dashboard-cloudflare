/**
 * D1 Query Functions — Products
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { products, productAssets } from '../schema';

export async function getAllProducts(db: DbClient) {
  const rows = await db.select().from(products);
  const assets = await db.select().from(productAssets);

  return rows.map((product) => ({
    ...product,
    assets: assets.filter((a) => a.productId === product.id),
  }));
}

export async function getProductById(db: DbClient, id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;

  const assets = await db
    .select()
    .from(productAssets)
    .where(eq(productAssets.productId, id));

  return { ...product, assets };
}
