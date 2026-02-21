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
  bmIds:                  text('bm_ids'),                   // JSON array of BM record IDs
  pageIds:                text('page_ids'),                 // JSON array of Page record IDs
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
  adAccountIds:       text('ad_account_ids'),          // JSON array of Ad Account record IDs
  pixelIds:           text('pixel_ids'),               // JSON array of Pixel record IDs
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
  ownerBmIds:    text('owner_bm_ids'),                 // JSON array of owner BM record IDs
  createdAt:     text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:     text('updated_at'),
});


// ─────────────────────────────────────────────────────────────
// CONTENT — Ad Presets (declared before campaigns due to FK reference)
// ─────────────────────────────────────────────────────────────

export const adPresets = sqliteTable('ad_presets', {
  id:              text('id').primaryKey(),
  presetName:      text('preset_name').notNull(),
  productId:       text('product_id').references(() => products.id),
  primaryText1:    text('primary_text_1'),
  primaryText2:    text('primary_text_2'),
  primaryText3:    text('primary_text_3'),
  primaryText4:    text('primary_text_4'),
  primaryText5:    text('primary_text_5'),
  headline1:       text('headline_1'),
  headline2:       text('headline_2'),
  headline3:       text('headline_3'),
  headline4:       text('headline_4'),
  headline5:       text('headline_5'),
  description1:    text('description_1'),
  description2:    text('description_2'),
  description3:    text('description_3'),
  description4:    text('description_4'),
  description5:    text('description_5'),
  callToAction:    text('call_to_action'),
  beneficiaryName: text('beneficiary_name'),
  payerName:       text('payer_name'),
  createdAt:       text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:       text('updated_at'),
});

// ─────────────────────────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────────────────────────

export const videoScripts = sqliteTable('video_scripts', {
  id:               text('id').primaryKey(),
  scriptName:       text('script_name').notNull(),
  productId:        text('product_id').references(() => products.id),
  authorId:         text('author_id').references(() => users.id),
  scriptContent:    text('script_content'),
  isApproved:       integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  needsRevision:    integer('needs_revision', { mode: 'boolean' }).notNull().default(false),
  version:          integer('version'),
  notes:            text('notes'),
  hook:             text('hook'),
  body:             text('body'),
  hookNumber:       integer('hook_number'),
  baseScriptNumber: integer('base_script_number'),
  createdAt:        text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:        text('updated_at'),
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
  scrollstopperNumber: integer('scrollstopper_number'),
  createdAt:           text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:           text('updated_at'),
});

export const campaigns = sqliteTable('campaigns', {
  id:                   text('id').primaryKey(),
  campaignName:         text('campaign_name').notNull(),
  status:               text('status').notNull().default('Preparing'),
  productId:            text('product_id').references(() => products.id),
  platform:             text('platform'),
  redtrackCampaignName: text('redtrack_campaign_name'),
  redtrackCampaignId:   text('redtrack_campaign_id'),
  notes:                text('notes'),
  startDate:            text('start_date'),
  endDate:              text('end_date'),
  budget:               real('budget'),
  description:          text('description'),
  fbCampaignId:         text('fb_campaign_id'),
  fbAdAccountId:        text('fb_ad_account_id'),
  fbAdSetId:            text('fb_ad_set_id'),
  fbAdIds:              text('fb_ad_ids'),             // JSON array as string
  launchProfileId:      text('launch_profile_id'),
  launchedData:         text('launched_data'),         // Full JSON snapshot
  launchedAt:           text('launched_at'),
  launchDate:           text('launch_date'),
  launchTime:           text('launch_time'),
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
  videoIds:             text('video_ids'),             // JSON array of Video record IDs
  imageIds:             text('image_ids'),             // JSON array of Image record IDs
  createdAt:            text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:            text('updated_at'),
});

export const images = sqliteTable('images', {
  id:             text('id').primaryKey(),
  imageName:      text('image_name').notNull(),
  status:         text('status').notNull().default('new'),
  productId:      text('product_id').references(() => products.id),
  imageType:      text('image_type'),
  driveFileId:    text('drive_file_id'),
  imageDriveLink: text('image_drive_link'),
  thumbnailUrl:   text('thumbnail_url'),
  width:          integer('width'),
  height:         integer('height'),
  fileSize:       integer('file_size'),
  notes:          text('notes'),
  count:          integer('count').notNull().default(1),
  createdAt:      text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tempImages = sqliteTable('temp_images', {
  id:        text('id').primaryKey(),
  imageName: text('image_name'),
  productId: text('product_id').references(() => products.id),
  driveLink: text('drive_link'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const advertorials = sqliteTable('advertorials', {
  id:              text('id').primaryKey(),
  advertorialName: text('advertorial_name').notNull(),
  productId:       text('product_id').references(() => products.id),
  advertorialText: text('advertorial_text'),
  finalLink:       text('final_link'),
  isChecked:       integer('is_checked', { mode: 'boolean' }).notNull().default(false),
  createdAt:       text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:       text('updated_at'),
});

