/**
 * Types for the Manage page.
 *
 * Facebook campaign data fetched via Graph API for the selected profile.
 */

// =============================================================================
// AD ACCOUNT
// =============================================================================

export interface FbAdAccount {
  id: string;           // Format: act_XXXXXXXXX
  name: string;
  account_id: string;   // Numeric ID without act_ prefix
  account_status: number;
  currency: string;
  business_name?: string;
}

// =============================================================================
// CAMPAIGN (with insights)
// =============================================================================

export interface FbManageCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  daily_budget?: string;      // In cents
  lifetime_budget?: string;   // In cents
  objective: string;
  created_time: string;
  updated_time: string;
  // Insights (if available for date range)
  insights?: {
    data?: Array<{
      spend?: string;
      purchase_roas?: Array<{ value: string }>;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>;
  };
  // Local enrichment
  adAccountId: string;
  adAccountName: string;
}

// =============================================================================
// AD REVIEW
// =============================================================================

export interface FbAdReview {
  id: string;
  name: string;
  effective_status: string;
  ad_review_feedback?: {
    global?: Record<string, string>;
  };
}

export interface AdReviewResult {
  campaignId: string;
  campaignName: string;
  adAccountId: string;
  ads: FbAdReview[];
}

// =============================================================================
// FILTERS
// =============================================================================

export type DatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_30d';

export interface ManageFilters {
  search: string;
  adAccountId: string;   // 'all' or specific account id
  status: 'all' | 'ACTIVE' | 'PAUSED';
  datePreset: DatePreset;
}
