/**
 * D1 Query Functions — Ad Presets
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { adPresets, products } from '../schema';

const presetFields = {
  id:              adPresets.id,
  presetName:      adPresets.presetName,
  productId:       adPresets.productId,
  primaryText1:    adPresets.primaryText1,
  primaryText2:    adPresets.primaryText2,
  primaryText3:    adPresets.primaryText3,
  primaryText4:    adPresets.primaryText4,
  primaryText5:    adPresets.primaryText5,
  headline1:       adPresets.headline1,
  headline2:       adPresets.headline2,
  headline3:       adPresets.headline3,
  headline4:       adPresets.headline4,
  headline5:       adPresets.headline5,
  description1:    adPresets.description1,
  description2:    adPresets.description2,
  description3:    adPresets.description3,
  description4:    adPresets.description4,
  description5:    adPresets.description5,
  callToAction:    adPresets.callToAction,
  beneficiaryName: adPresets.beneficiaryName,
  payerName:       adPresets.payerName,
  createdAt:       adPresets.createdAt,
  productName:     products.productName,
};

export async function getAllAdPresets(db: DbClient) {
  return db
    .select(presetFields)
    .from(adPresets)
    .leftJoin(products, eq(adPresets.productId, products.id));
}

export async function getAdPresetsByProduct(db: DbClient, productId: string) {
  return db
    .select(presetFields)
    .from(adPresets)
    .leftJoin(products, eq(adPresets.productId, products.id))
    .where(eq(adPresets.productId, productId));
}

export async function getAdPresetById(db: DbClient, id: string) {
  const [row] = await db
    .select(presetFields)
    .from(adPresets)
    .leftJoin(products, eq(adPresets.productId, products.id))
    .where(eq(adPresets.id, id));
  return row ?? null;
}
