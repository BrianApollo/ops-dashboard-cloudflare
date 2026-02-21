/**
 * D1 Query Functions — Campaigns
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { campaigns, products } from '../schema';

const campaignFields = {
  id:                   campaigns.id,
  campaignName:         campaigns.campaignName,
  status:               campaigns.status,
  productId:            campaigns.productId,
  platform:             campaigns.platform,
  redtrackCampaignName: campaigns.redtrackCampaignName,
  redtrackCampaignId:   campaigns.redtrackCampaignId,
  notes:                campaigns.notes,
  startDate:            campaigns.startDate,
  endDate:              campaigns.endDate,
  budget:               campaigns.budget,
  description:          campaigns.description,
  fbCampaignId:         campaigns.fbCampaignId,
  fbAdAccountId:        campaigns.fbAdAccountId,
  launchProfileId:      campaigns.launchProfileId,
  launchedData:         campaigns.launchedData,
  launchDate:           campaigns.launchDate,
  launchTime:           campaigns.launchTime,
  locationTargeting:    campaigns.locationTargeting,
  websiteUrl:           campaigns.websiteUrl,
  utms:                 campaigns.utms,
  adAccUsed:            campaigns.adAccUsed,
  pageUsed:             campaigns.pageUsed,
  pixelUsed:            campaigns.pixelUsed,
  selectedAdProfileId:  campaigns.selectedAdProfileId,
  cta:                  campaigns.cta,
  displayLink:          campaigns.displayLink,
  linkVariable:         campaigns.linkVariable,
  draftProfileId:       campaigns.draftProfileId,
  reuseCreatives:       campaigns.reuseCreatives,
  launchAsActive:       campaigns.launchAsActive,
  videoIds:             campaigns.videoIds,
  imageIds:             campaigns.imageIds,
  createdAt:            campaigns.createdAt,
  updatedAt:            campaigns.updatedAt,
  productName:          products.productName,
};

function withParsedIds(campaign: { videoIds: string | null; imageIds: string | null; [key: string]: unknown }) {
  return {
    ...campaign,
    videoIds: JSON.parse(campaign.videoIds ?? '[]') as string[],
    imageIds: JSON.parse(campaign.imageIds ?? '[]') as string[],
  };
}

export async function getAllCampaigns(db: DbClient) {
  const rows = await db
    .select(campaignFields)
    .from(campaigns)
    .leftJoin(products, eq(campaigns.productId, products.id));

  return rows.map(withParsedIds);
}

export async function getCampaignsByProduct(db: DbClient, productId: string) {
  const rows = await db
    .select(campaignFields)
    .from(campaigns)
    .leftJoin(products, eq(campaigns.productId, products.id))
    .where(eq(campaigns.productId, productId));

  return rows.map(withParsedIds);
}

export async function getCampaignById(db: DbClient, id: string) {
  const [campaign] = await db
    .select(campaignFields)
    .from(campaigns)
    .leftJoin(products, eq(campaigns.productId, products.id))
    .where(eq(campaigns.id, id));

  if (!campaign) return null;
  return withParsedIds(campaign);
}
