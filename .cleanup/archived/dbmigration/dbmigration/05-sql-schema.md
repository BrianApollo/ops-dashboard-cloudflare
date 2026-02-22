# SQL Schema Blueprint — Cloudflare D1 (SQLite)

23 tables total. Uses Drizzle ORM syntax for schema definition.
Primary keys: Airtable `rec...` IDs for migrated rows, `crypto.randomUUID()` for new rows.

---

## Drizzle Schema File: `src/db/schema.ts`

```ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// SYSTEM
// ─────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  role:         text('role').notNull(),             // 'Video Editor' | 'Ops' | 'Admin'
  passwordHash: text('password_hash'),              // PBKDF2 — never expose
  email:        text('email').unique(),
  createdAt:    text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const scalingRules = sqliteTable('scaling_rules', {
  id:              text('id').primaryKey(),
  name:            text('name').notNull(),
  ruleScope:       text('rule_scope'),
  selectType:      text('select_type'),
  checkAt:         text('check_at'),
  ifCondition:     text('if_condition'),
  thenAction:      text('then_action'),
  executeActionAt: text('execute_action_at'),
  createdAt:       text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:       text('updated_at'),
});

// ─────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────

export const products = sqliteTable('products', {
  id:            text('id').primaryKey(),
  productName:   text('product_name').notNull(),
  status:        text('status').notNull().default('Preparing'), // 'Active' | 'Preparing' | 'Benched'
  driveFolderId: text('drive_folder_id'),
  createdAt:     text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:     text('updated_at'),
});

// Replaces Airtable attachment arrays for Product Images + Product Logo
export const productAssets = sqliteTable('product_assets', {
  id:        text('id').primaryKey(),             // Airtable attachment id (attXXX)
  productId: text('product_id').notNull().references(() => products.id),
  url:       text('url').notNull(),               // Permanent URL (R2 or Drive)
  filename:  text('filename').notNull(),
  type:      text('type').notNull(),              // 'image' | 'logo'
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─────────────────────────────────────────────────────────────
// INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────

export const profiles = sqliteTable('profiles', {
  id:                     text('id').primaryKey(),
  profileFbId:            text('profile_fb_id').notNull().unique(),
  profileName:            text('profile_name').notNull(),
  profileStatus:          text('profile_status'),
  permanentToken:         text('permanent_token'),          // SENSITIVE
  permanentTokenEndDate:  text('permanent_token_end_date'),
  tokenValid:             integer('token_valid', { mode: 'boolean' }).default(false),
  lastSync:               text('last_sync'),
  hidden:                 integer('hidden', { mode: 'boolean' }).notNull().default(false),
  isMaster:               integer('is_master', { mode: 'boolean' }).notNull().default(false),
  profileEmail:           text('profile_email'),
  profileFbPassword:      text('profile_fb_password'),      // SENSITIVE
  profileEmailPassword:   text('profile_email_password'),   // SENSITIVE
  profile2fa:             text('profile_2fa'),              // SENSITIVE
  profileBirthDate:       text('profile_birth_date'),
  profileLink:            text('profile_link'),
  profileReviewDate:      text('profile_review_date'),
  profileSecurityEmail:   text('profile_security_email'),   // SENSITIVE
  securityEmailPassword:  text('security_email_password'),  // SENSITIVE
  proxy:                  text('proxy'),
  profileYoutubeHandle:   text('profile_youtube_handle'),
  uid:                    text('uid'),
  profileGender:          text('profile_gender'),
  profileLocation:        text('profile_location'),
  profileYearCreated:     text('profile_year_created'),
  adsPowerProfileId:      text('ads_power_profile_id'),
  createdAt:              text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:              text('updated_at'),
});

export const businessManagers = sqliteTable('business_managers', {
  id:                 text('id').primaryKey(),
  bmFbId:             text('bm_fb_id').notNull().unique(),
  bmName:             text('bm_name').notNull(),
  bmStatus:           text('bm_status'),
  verificationStatus: text('verification_status'),
  systemUserId:       text('system_user_id'),          // SENSITIVE
  systemUserToken:    text('system_user_token'),        // SENSITIVE
  systemUserCreated:  text('system_user_created'),
  lastSynced:         text('last_synced'),
  hidden:             integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt:          text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:          text('updated_at'),
});

export const adAccounts = sqliteTable('ad_accounts', {
  id:           text('id').primaryKey(),
  adAccFbId:    text('ad_acc_fb_id').notNull().unique(),
  adAccName:    text('ad_acc_name').notNull(),
  adAccStatus:  text('ad_acc_status'),
  currency:     text('currency'),
  amountSpent:  real('amount_spent').notNull().default(0),
  timezone:     text('timezone'),
  lastSynced:   text('last_synced'),
  hidden:       integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt:    text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:    text('updated_at'),
});

export const pages = sqliteTable('pages', {
  id:          text('id').primaryKey(),
  pageFbId:    text('page_fb_id').notNull().unique(),
  pageName:    text('page_name').notNull(),
  published:   text('published'),
  pageLink:    text('page_link'),
  fanCount:    integer('fan_count').notNull().default(0),
  lastSynced:  text('last_synced'),
  hidden:      integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt:   text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:   text('updated_at'),
});

export const pixels = sqliteTable('pixels', {
  id:            text('id').primaryKey(),
  pixelFbId:     text('pixel_fb_id').notNull().unique(),
  pixelName:     text('pixel_name').notNull(),
  available:     text('available'),
  lastFiredTime: text('last_fired_time'),
  lastSynced:    text('last_synced'),
  hidden:        integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt:     text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:     text('updated_at'),
});

// ─────────────────────────────────────────────────────────────
// INFRASTRUCTURE JUNCTIONS
// ─────────────────────────────────────────────────────────────

export const profileBms = sqliteTable('profile_bms', {
  profileId: text('profile_id').notNull().references(() => profiles.id),
  bmId:      text('bm_id').notNull().references(() => businessManagers.id),
}, (t) => ({ pk: { columns: [t.profileId, t.bmId] } }));

export const profilePages = sqliteTable('profile_pages', {
  profileId: text('profile_id').notNull().references(() => profiles.id),
  pageId:    text('page_id').notNull().references(() => pages.id),
}, (t) => ({ pk: { columns: [t.profileId, t.pageId] } }));

export const bmAdAccounts = sqliteTable('bm_ad_accounts', {
  bmId:        text('bm_id').notNull().references(() => businessManagers.id),
  adAccountId: text('ad_account_id').notNull().references(() => adAccounts.id),
}, (t) => ({ pk: { columns: [t.bmId, t.adAccountId] } }));

export const bmPixels = sqliteTable('bm_pixels', {
  bmId:    text('bm_id').notNull().references(() => businessManagers.id),
  pixelId: text('pixel_id').notNull().references(() => pixels.id),
}, (t) => ({ pk: { columns: [t.bmId, t.pixelId] } }));

export const pixelOwnerBms = sqliteTable('pixel_owner_bms', {
  pixelId: text('pixel_id').notNull().references(() => pixels.id),
  bmId:    text('bm_id').notNull().references(() => businessManagers.id),
}, (t) => ({ pk: { columns: [t.pixelId, t.bmId] } }));

// ─────────────────────────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────────────────────────

export const videoScripts = sqliteTable('video_scripts', {
  id:                 text('id').primaryKey(),
  scriptName:         text('script_name').notNull(),
  productId:          text('product_id').references(() => products.id),
  authorId:           text('author_id').references(() => users.id),
  scriptContent:      text('script_content'),
  isApproved:         integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  needsRevision:      integer('needs_revision', { mode: 'boolean' }).notNull().default(false),
  version:            integer('version'),
  notes:              text('notes'),
  hook:               text('hook'),
  body:               text('body'),
  hookNumber:         integer('hook_number'),
  baseScriptNumber:   integer('base_script_number'),
  createdAt:          text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:          text('updated_at'),
});

export const videos = sqliteTable('videos', {
  id:                  text('id').primaryKey(),
  videoName:           text('video_name').notNull(),
  status:              text('status').notNull().default('todo'),  // Normalized domain value
  format:              text('format').notNull(),                  // 'square' | 'vertical' | 'youtube'
  textVersion:         text('text_version'),                      // 'Text' | 'No Text'
  productId:           text('product_id').references(() => products.id),
  editorId:            text('editor_id').references(() => users.id),
  scriptId:            text('script_id').references(() => videoScripts.id),
  creativeLink:        text('creative_link'),
  notes:               text('notes'),
  scrollstopperNumber: integer('scrollstopper_number'),           // NULL for originals
  createdAt:           text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:           text('updated_at'),
  // NOTE: scriptContent is NOT stored — computed via JOIN to video_scripts
  // NOTE: lastUploadAt is replaced by updatedAt
});

export const campaigns = sqliteTable('campaigns', {
  id:                   text('id').primaryKey(),
  campaignName:         text('campaign_name').notNull(),
  status:               text('status').notNull().default('Preparing'),
  productId:            text('product_id').references(() => products.id),
  platform:             text('platform'),              // Normalized: 'facebook' | 'instagram' | ...
  redtrackCampaignName: text('redtrack_campaign_name'),
  redtrackCampaignId:   text('redtrack_campaign_id'),
  notes:                text('notes'),
  startDate:            text('start_date'),
  endDate:              text('end_date'),
  budget:               real('budget'),
  description:          text('description'),
  // Launch data
  fbCampaignId:         text('fb_campaign_id'),
  fbAdAccountId:        text('fb_ad_account_id'),
  fbAdSetId:            text('fb_ad_set_id'),
  fbAdIds:              text('fb_ad_ids'),             // JSON array as string
  launchProfileId:      text('launch_profile_id'),
  launchedData:         text('launched_data'),         // Full JSON snapshot
  launchedAt:           text('launched_at'),
  // Draft fields
  launchDate:           text('launch_date'),
  launchTime:           text('launch_time'),           // HH:MM
  locationTargeting:    text('location_targeting'),
  websiteUrl:           text('website_url'),
  utms:                 text('utms'),
  adAccUsed:            text('ad_acc_used'),
  pageUsed:             text('page_used'),
  pixelUsed:            text('pixel_used'),
  selectedAdProfileId:  text('selected_ad_profile_id').references(() => adPresets.id),
  cta:                  text('cta'),
  displayLink:          text('display_link'),
  linkVariable:         text('link_variable'),
  draftProfileId:       text('draft_profile_id'),
  reuseCreatives:       integer('reuse_creatives', { mode: 'boolean' }),
  launchAsActive:       integer('launch_as_active', { mode: 'boolean' }),
  createdAt:            text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:            text('updated_at'),
});

export const images = sqliteTable('images', {
  id:            text('id').primaryKey(),
  imageName:     text('image_name').notNull(),
  status:        text('status').notNull().default('new'),
  productId:     text('product_id').references(() => products.id),
  imageType:     text('image_type'),               // 'thumbnail' | 'banner' | 'square' | 'story' | 'other'
  driveFileId:   text('drive_file_id'),
  imageDriveLink: text('image_drive_link'),
  thumbnailUrl:  text('thumbnail_url'),
  width:         integer('width'),
  height:        integer('height'),
  fileSize:      integer('file_size'),
  notes:         text('notes'),
  count:         integer('count').notNull().default(1),
  createdAt:     text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tempImages = sqliteTable('temp_images', {
  id:        text('id').primaryKey(),
  imageName: text('image_name'),
  productId: text('product_id').references(() => products.id),
  driveLink: text('drive_link'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const adPresets = sqliteTable('ad_presets', {
  id:             text('id').primaryKey(),
  presetName:     text('preset_name').notNull(),
  productId:      text('product_id').references(() => products.id),
  primaryText1:   text('primary_text_1'),
  primaryText2:   text('primary_text_2'),
  primaryText3:   text('primary_text_3'),
  primaryText4:   text('primary_text_4'),
  primaryText5:   text('primary_text_5'),
  headline1:      text('headline_1'),
  headline2:      text('headline_2'),
  headline3:      text('headline_3'),
  headline4:      text('headline_4'),
  headline5:      text('headline_5'),
  description1:   text('description_1'),
  description2:   text('description_2'),
  description3:   text('description_3'),
  description4:   text('description_4'),
  description5:   text('description_5'),
  callToAction:   text('call_to_action'),
  beneficiaryName: text('beneficiary_name'),
  payerName:      text('payer_name'),
  createdAt:      text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:      text('updated_at'),
});

export const advertorials = sqliteTable('advertorials', {
  id:               text('id').primaryKey(),
  advertorialName:  text('advertorial_name').notNull(),
  productId:        text('product_id').references(() => products.id),
  advertorialText:  text('advertorial_text'),
  finalLink:        text('final_link'),
  isChecked:        integer('is_checked', { mode: 'boolean' }).notNull().default(false),
  createdAt:        text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:        text('updated_at'),
});

// ─────────────────────────────────────────────────────────────
// CONTENT JUNCTIONS
// ─────────────────────────────────────────────────────────────

export const campaignVideos = sqliteTable('campaign_videos', {
  campaignId: text('campaign_id').notNull().references(() => campaigns.id),
  videoId:    text('video_id').notNull().references(() => videos.id),
}, (t) => ({ pk: { columns: [t.campaignId, t.videoId] } }));

export const campaignImages = sqliteTable('campaign_images', {
  campaignId: text('campaign_id').notNull().references(() => campaigns.id),
  imageId:    text('image_id').notNull().references(() => images.id),
}, (t) => ({ pk: { columns: [t.campaignId, t.imageId] } }));
```

---

## Table Count Summary

| Category | Tables |
|---|---|
| System | users, scaling_rules |
| Products | products, product_assets |
| Infrastructure | profiles, business_managers, ad_accounts, pages, pixels |
| Infrastructure Junctions | profile_bms, profile_pages, bm_ad_accounts, bm_pixels, pixel_owner_bms |
| Content | video_scripts, videos, campaigns, images, temp_images, ad_presets, advertorials |
| Content Junctions | campaign_videos, campaign_images |
| **Total** | **23 tables** |

---

## Indexes to Add

```sql
-- Performance indexes for common queries
CREATE INDEX idx_profiles_profile_fb_id ON profiles(profile_fb_id);
CREATE INDEX idx_profiles_hidden ON profiles(hidden);
CREATE INDEX idx_bms_hidden ON business_managers(hidden);
CREATE INDEX idx_ad_accounts_hidden ON ad_accounts(hidden);
CREATE INDEX idx_pages_hidden ON pages(hidden);
CREATE INDEX idx_pixels_hidden ON pixels(hidden);

CREATE INDEX idx_videos_product_id ON videos(product_id);
CREATE INDEX idx_videos_editor_id ON videos(editor_id);
CREATE INDEX idx_videos_status ON videos(status);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_product_id ON campaigns(product_id);

CREATE INDEX idx_images_product_id ON images(product_id);
CREATE INDEX idx_images_status ON images(status);

CREATE INDEX idx_video_scripts_product_id ON video_scripts(product_id);
CREATE INDEX idx_ad_presets_product_id ON ad_presets(product_id);
CREATE INDEX idx_advertorials_product_id ON advertorials(product_id);
```

---

## D1 Binding (`wrangler.toml` — branch only)

```toml
[[d1_databases]]
binding = "DB"
database_name = "ops-dashboard-db"
database_id = "REPLACE_WITH_ACTUAL_ID"
```

## Drizzle Config (`drizzle.config.ts`)

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
```
