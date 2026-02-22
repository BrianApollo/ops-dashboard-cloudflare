# Field Map — Airtable → SQL Column Mapping

Naming convention: Airtable `'Title Case'` → SQL `snake_case` → TypeScript `camelCase`
Drizzle handles the TS ↔ SQL mapping automatically.

---

## PROFILES (`tble3Qky3A2j8LpSj`)

| Airtable Field | JS Config Key | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|---|
| *(record id)* | `id` | `id` | TEXT PK | No | Airtable `rec...` ID |
| Profile ID | `profileId` | `profile_fb_id` | TEXT | No | Facebook numeric ID |
| Profile Name | `profileName` | `profile_name` | TEXT | No | |
| Profile Status | `profileStatus` | `profile_status` | TEXT | Yes | |
| Permanent Token | `permanentToken` | `permanent_token` | TEXT | Yes | Sensitive — strip for non-admin |
| Permanent Token End Date | `permanentTokenEndDate` | `permanent_token_end_date` | TEXT | Yes | DATE as ISO string |
| Token Valid | `tokenValid` | `token_valid` | INTEGER | No | BOOLEAN (0/1); compute, don't rely on stored value |
| Linked BM | `linkedBm` | *(junction)* | — | — | → `profile_bms` table |
| Linked Pages | `linkedPages` | *(junction)* | — | — | → `profile_pages` table |
| Last Sync | `lastSync` | `last_sync` | TEXT | Yes | ISO datetime |
| Hidden | `hidden` | `hidden` | INTEGER | No | BOOLEAN DEFAULT 0 |
| Profile Email | `profileEmail` | `profile_email` | TEXT | Yes | |
| Profile FB Password | `profileFbPassword` | `profile_fb_password` | TEXT | Yes | Sensitive |
| Profile Email Password | `profileEmailPassword` | `profile_email_password` | TEXT | Yes | Sensitive |
| Profile 2FA | `profile2fa` | `profile_2fa` | TEXT | Yes | Sensitive |
| Profile Birth Date | `profileBirthDate` | `profile_birth_date` | TEXT | Yes | |
| Profile Link | `profileLink` | `profile_link` | TEXT | Yes | FB URL |
| Profile Review Date | `profileReviewDate` | `profile_review_date` | TEXT | Yes | |
| Profile Security Email | `profileSecurityEmail` | `profile_security_email` | TEXT | Yes | Sensitive |
| Security Email Password | `securityEmailPassword` | `security_email_password` | TEXT | Yes | Sensitive |
| Proxy | `proxy` | `proxy` | TEXT | Yes | |
| Profile YouTube Handle | `profileYoutubeHandle` | `profile_youtube_handle` | TEXT | Yes | |
| UID | `uid` | `uid` | TEXT | Yes | |
| Profile Gender | `profileGender` | `profile_gender` | TEXT | Yes | |
| Profile Location | `profileLocation` | `profile_location` | TEXT | Yes | |
| Profile Year Created | `profileYearCreated` | `profile_year_created` | TEXT | Yes | |
| Linked AdsProfile | `adsPowerProfileId` | `ads_power_profile_id` | TEXT | Yes | AdsPower user_id |

---

## BUSINESS MANAGERS (`tbl1xnWkoju7WG8lb`)

| Airtable Field | JS Config Key | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|---|
| *(record id)* | `id` | `id` | TEXT PK | No | |
| BM ID | `bmId` | `bm_fb_id` | TEXT | No | Facebook numeric BM ID |
| BM Name | `bmName` | `bm_name` | TEXT | No | |
| BM Status | `bmStatus` | `bm_status` | TEXT | Yes | |
| Verification Status | `verificationStatus` | `verification_status` | TEXT | Yes | |
| Linked Profile | `linkedProfile` | *(junction)* | — | — | → `profile_bms` table |
| Linked Ad Accs | `linkedAdAccs` | *(junction)* | — | — | → `bm_ad_accounts` table |
| Linked Pixels | `linkedPixels` | *(junction)* | — | — | → `bm_pixels` table |
| Owned Pixels | `ownedPixels` | *(junction)* | — | — | → `pixel_owner_bms` table |
| System User ID | `systemUserId` | `system_user_id` | TEXT | Yes | Sensitive |
| System User Token | `systemUserToken` | `system_user_token` | TEXT | Yes | Sensitive |
| System User Created | `systemUserCreated` | `system_user_created` | TEXT | Yes | DATE |
| Last Synced | `lastSynced` | `last_synced` | TEXT | Yes | |
| Hidden | `hidden` | `hidden` | INTEGER | No | BOOLEAN DEFAULT 0 |

---

## AD ACCOUNTS (`tbltReEL235grY3Im`)

| Airtable Field | JS Config Key | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|---|
| *(record id)* | `id` | `id` | TEXT PK | No | |
| Ad Acc ID | `adAccId` | `ad_acc_fb_id` | TEXT | No | Facebook numeric ID |
| Ad Acc Name | `adAccName` | `ad_acc_name` | TEXT | No | |
| Ad Acc Status | `adAccStatus` | `ad_acc_status` | TEXT | Yes | |
| Currency | `currency` | `currency` | TEXT | Yes | |
| Amount Spent | `amountSpent` | `amount_spent` | REAL | No | DEFAULT 0 |
| Timezone | `timezone` | `timezone` | TEXT | Yes | |
| Linked BM | `linkedBm` | *(junction)* | — | — | → `bm_ad_accounts` |
| Last Synced | `lastSynced` | `last_synced` | TEXT | Yes | |
| Hidden | `hidden` | `hidden` | INTEGER | No | BOOLEAN DEFAULT 0 |

---

## PAGES (`tblUwiY8UQVi3yXBU`)

| Airtable Field | JS Config Key | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|---|
| *(record id)* | `id` | `id` | TEXT PK | No | |
| Page ID | `pageId` | `page_fb_id` | TEXT | No | Facebook numeric ID |
| Page Name | `pageName` | `page_name` | TEXT | No | |
| Published | `published` | `published` | TEXT | Yes | |
| Page Link | `pageLink` | `page_link` | TEXT | Yes | FB URL |
| Fan Count | `fanCount` | `fan_count` | INTEGER | No | DEFAULT 0 |
| Linked Profiles | `linkedProfiles` | *(junction)* | — | — | → `profile_pages` |
| Last Synced | `lastSynced` | `last_synced` | TEXT | Yes | |
| Hidden | `hidden` | `hidden` | INTEGER | No | BOOLEAN DEFAULT 0 |

---

## PIXELS (`tblsMDmQedp4B3pB8`)

| Airtable Field | JS Config Key | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|---|
| *(record id)* | `id` | `id` | TEXT PK | No | |
| Pixel ID | `pixelId` | `pixel_fb_id` | TEXT | No | Facebook numeric ID |
| Pixel Name | `pixelName` | `pixel_name` | TEXT | No | |
| Available | `available` | `available` | TEXT | Yes | |
| Last Fired Time | `lastFiredTime` | `last_fired_time` | TEXT | Yes | |
| Linked BMs | `linkedBms` | *(junction)* | — | — | → `bm_pixels` |
| Owner BM | `ownerBm` | *(junction)* | — | — | → `pixel_owner_bms` |
| Last Synced | `lastSynced` | `last_synced` | TEXT | Yes | |
| Hidden | `hidden` | `hidden` | INTEGER | No | BOOLEAN DEFAULT 0 |

---

## USERS (`Users`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Name | `name` | TEXT | No | |
| Role | `role` | TEXT | No | 'Video Editor', 'Ops', 'Admin' |
| Password | `password_hash` | TEXT | Yes | PBKDF2 hash — never expose |
| *(none)* | `email` | TEXT | Yes | If needed for D1 auth |

---

## PRODUCTS (`Products`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Product Name | `product_name` | TEXT | No | |
| Status | `status` | TEXT | No | DEFAULT 'Preparing' |
| Drive Link | `drive_folder_id` | TEXT | Yes | Extract folder ID from URL at migration |
| Product Images | *(separate table)* | — | — | → `product_assets` (type='image') |
| Product Logo | *(separate table)* | — | — | → `product_assets` (type='logo') |

**Note:** Airtable attachment objects `{ id, url, filename }` → `product_assets` rows.

---

## VIDEOS (`Videos`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Video Name | `video_name` | TEXT | No | |
| Status | `status` | TEXT | No | Store normalized: 'todo', 'review', 'available', 'used' |
| Format | `format` | TEXT | No | Store normalized: 'square', 'vertical', 'youtube' |
| Text Version | `text_version` | TEXT | Yes | 'Text' or 'No Text' — derive `hasText` boolean in TS |
| Editor | `editor_id` | TEXT FK→users | Yes | Single linked record (first of array) |
| Product | `product_id` | TEXT FK→products | Yes | Single linked record |
| Script | `script_id` | TEXT FK→video_scripts | Yes | Single linked record |
| Creative Link | `creative_link` | TEXT | Yes | Google Drive or Cloudflare URL |
| Notes | `notes` | TEXT | Yes | |
| Scrollstopper Number | `scrollstopper_number` | INTEGER | Yes | NULL for originals |
| Used In Campaign | *(junction)* | — | — | → `campaign_videos` |
| Video Upload | *(not stored)* | — | — | Airtable-managed attachment — handle via R2 |
| Last Upload At | `updated_at` | TEXT | Yes | Auto-managed timestamp |
| Script Content | *(computed)* | — | — | JOIN to video_scripts.script_content |
| *(none)* | `created_at` | TEXT | No | DEFAULT CURRENT_TIMESTAMP |

---

## VIDEO SCRIPTS (`Video Scripts`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Name | `script_name` | TEXT | No | |
| Product | `product_id` | TEXT FK→products | Yes | |
| Author | `author_id` | TEXT FK→users | Yes | |
| Script Content | `script_content` | TEXT | Yes | |
| Approved | `is_approved` | INTEGER | No | BOOLEAN DEFAULT 0 |
| Revision Needed | `needs_revision` | INTEGER | No | BOOLEAN DEFAULT 0 |
| Version | `version` | INTEGER | Yes | |
| Notes | `notes` | TEXT | Yes | |
| Hook | `hook` | TEXT | Yes | |
| Body | `body` | TEXT | Yes | |
| Hook Number | `hook_number` | INTEGER | Yes | |
| Base Script Number | `base_script_number` | INTEGER | Yes | |
| *(none)* | `created_at` | TEXT | No | DEFAULT CURRENT_TIMESTAMP |
| *(none)* | `updated_at` | TEXT | Yes | |

---

## CAMPAIGNS (`Campaigns`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Name | `campaign_name` | TEXT | No | |
| Status | `status` | TEXT | No | DEFAULT 'Preparing' |
| Product | `product_id` | TEXT FK→products | Yes | |
| Platform | `platform` | TEXT | Yes | Normalized: 'facebook', 'instagram', etc. |
| RedTrack Campaign Name | `redtrack_campaign_name` | TEXT | Yes | |
| RedTrack Campaign Id | `redtrack_campaign_id` | TEXT | Yes | |
| Notes | `notes` | TEXT | Yes | |
| Start Date | `start_date` | TEXT | Yes | |
| End Date | `end_date` | TEXT | Yes | |
| Budget | `budget` | REAL | Yes | |
| Description | `description` | TEXT | Yes | |
| FB Campaign ID | `fb_campaign_id` | TEXT | Yes | Populated post-launch |
| FB Ad Account ID | `fb_ad_account_id` | TEXT | Yes | |
| FB Ad Set ID | `fb_ad_set_id` | TEXT | Yes | |
| FB Ad IDs | `fb_ad_ids` | TEXT | Yes | JSON array as string |
| Launch Profile ID | `launch_profile_id` | TEXT | Yes | |
| Launched Data | `launched_data` | TEXT | Yes | Full JSON snapshot |
| Launch Date (timestamp) | `launched_at` | TEXT | Yes | When launched |
| Launch Date (draft) | `launch_date` | TEXT | Yes | Planned launch date |
| Launch Time | `launch_time` | TEXT | Yes | HH:MM format |
| Location Targeting | `location_targeting` | TEXT | Yes | Comma-separated country codes |
| Website Url | `website_url` | TEXT | Yes | |
| UTMs | `utms` | TEXT | Yes | |
| Ad Acc Used | `ad_acc_used` | TEXT | Yes | Ad account FB ID |
| Page Used | `page_used` | TEXT | Yes | Page FB ID |
| Pixel Used | `pixel_used` | TEXT | Yes | Pixel FB ID |
| Selected Ad Profile | `selected_ad_profile_id` | TEXT FK→ad_presets | Yes | |
| CTA | `cta` | TEXT | Yes | |
| Display Link | `display_link` | TEXT | Yes | |
| Link Variable | `link_variable` | TEXT | Yes | |
| Profile ID | `draft_profile_id` | TEXT | Yes | Draft profile selection |
| Reuse Creatives | `reuse_creatives` | INTEGER | Yes | BOOLEAN |
| Launch As Active | `launch_as_active` | INTEGER | Yes | BOOLEAN |
| Videos Used In This Campaign | *(junction)* | — | — | → `campaign_videos` |
| Images Used In This Campaign | *(junction)* | — | — | → `campaign_images` |
| *(none)* | `created_at` | TEXT | No | |
| *(none)* | `updated_at` | TEXT | Yes | |

---

## IMAGES (`Images`)

| Airtable Field | SQL Column | Type | Nullable | Notes |
|---|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No | |
| Image Name | `image_name` | TEXT | No | |
| Status | `status` | TEXT | No | DEFAULT 'new' |
| Product | `product_id` | TEXT FK→products | Yes | |
| Type | `image_type` | TEXT | Yes | 'thumbnail','banner','square','story','other' |
| Drive File ID | `drive_file_id` | TEXT | Yes | |
| Image Drive Link | `image_drive_link` | TEXT | Yes | |
| Thumbnail URL | `thumbnail_url` | TEXT | Yes | |
| Width | `width` | INTEGER | Yes | |
| Height | `height` | INTEGER | Yes | |
| File Size | `file_size` | INTEGER | Yes | Bytes |
| Notes | `notes` | TEXT | Yes | |
| Count | `count` | INTEGER | No | DEFAULT 1 |
| Used In Campaigns | *(junction)* | — | — | → `campaign_images` |
| *(none)* | `created_at` | TEXT | No | |

---

## AD PRESETS (`Ad Presets`)

| Airtable Field | SQL Column | Type | Nullable |
|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No |
| Preset Name | `preset_name` | TEXT | No |
| Product | `product_id` | TEXT FK→products | Yes |
| Primary Text 1-5 | `primary_text_1` … `primary_text_5` | TEXT | Yes |
| Headline 1-5 | `headline_1` … `headline_5` | TEXT | Yes |
| Description 1-5 | `description_1` … `description_5` | TEXT | Yes |
| Call to Action | `call_to_action` | TEXT | Yes |
| Beneficiary Name | `beneficiary_name` | TEXT | Yes |
| Payer Name | `payer_name` | TEXT | Yes |

---

## ADVERTORIALS (`Advertorials`)

| Airtable Field | SQL Column | Type | Nullable |
|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No |
| Advertorial Name | `advertorial_name` | TEXT | No |
| Product | `product_id` | TEXT FK→products | Yes |
| Advertorial Text | `advertorial_text` | TEXT | Yes |
| Final Advertorial Link | `final_link` | TEXT | Yes |
| Advertorial Checked | `is_checked` | INTEGER | No | DEFAULT 0 |

---

## SCALING RULES (`Scaling Rules`)

| Airtable Field | SQL Column | Type | Nullable |
|---|---|---|---|
| *(record id)* | `id` | TEXT PK | No |
| Name | `name` | TEXT | No |
| Rule Scope | `rule_scope` | TEXT | Yes |
| Select | `select_type` | TEXT | Yes |
| Check At | `check_at` | TEXT | Yes |
| If | `if_condition` | TEXT | Yes |
| Then | `then_action` | TEXT | Yes |
| Execute Action At | `execute_action_at` | TEXT | Yes |

---

## Section 11 — HARDCODED VIOLATIONS (Fix Before Migration)

These 2 strings bypass the FIELDS abstraction and will break if not updated:

| File | Line | Hardcoded String | Fix |
|---|---|---|---|
| `src/features/scripts/data.ts` | ~104 | `record.fields['Role']` | Replace with `FIELD_USER_ROLE` constant |
| `src/features/profiles/data.ts` | ~110 | `data.records[0].fields['Profile Record']` | Replace with constant; or make `is_master` column on profiles table |

---

## Config.ts Changes Required

For the infrastructure tables, update string values in `src/features/infrastructure/config.ts`:

```ts
// BEFORE (Airtable field names):
profileName: 'Profile Name',
profileStatus: 'Profile Status',

// AFTER (SQL column names):
profileName: 'profile_name',
profileStatus: 'profile_status',
```

Same pattern applies for all other feature `FIELD_*` constants — update the string values, not the JS keys.
