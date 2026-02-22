# Write Operations — All 47 Airtable Writes to Re-implement

Every one of these must have an equivalent D1 query in `src/db/queries/`.
Total: **12 creates, 32 updates, 3 deletes** across 11 tables.

---

## PROFILES (8 writes)

| # | Function | HTTP | Fields Written | Trigger | File |
|---|---|---|---|---|---|
| 1 | validateProfileToken | PATCH | `token_valid`, `permanent_token_end_date` | "Check Token" button | useInfraActions.ts ~88 |
| 2 | refreshProfileToken | PATCH | `permanent_token`, `permanent_token_end_date`, `token_valid` | "Refresh" button | useInfraActions.ts ~146 |
| 3 | syncProfileData (update) | PATCH | `profile_fb_id`, `profile_name`, `profile_status`, `token_valid` | Sync button | useInfraActions.ts ~380 |
| 4 | syncProfileData (activate) | PATCH | `profile_status`, `token_valid` | Sync button | useInfraActions.ts ~390 |
| 5 | updateLastSync | PATCH | `last_sync` | After sync completes | useInfraActions.ts ~606 |
| 6 | toggleItemHidden | PATCH | `hidden` | "Hide Profile" button | useInfraActions.ts ~658 |
| 7 | updateProfileSetup | PATCH | `profile_email`, `profile_fb_password`, `profile_email_password`, `profile_2fa`, `profile_birth_date`, `profile_link`, `profile_review_date`, `profile_security_email`, `security_email_password`, `proxy`, `profile_youtube_handle`, `uid`, `profile_gender`, `profile_location`, `profile_year_created` | Setup form save | useInfraActions.ts ~668 |
| 8 | linkAdsPowerProfile | PATCH | `ads_power_profile_id` | AdsPower Connect → Save | useInfraActions.ts ~693 |

**D1 queries needed:** `updateProfile(id, fields)`, `createProfile(fields)` (for sync)

---

## BUSINESS MANAGERS (5 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 9 | saveSystemUserToken | PATCH | `system_user_token`, `system_user_created` | "Paste Token" dialog save |
| 10 | generateSystemUserToken | PATCH | `system_user_id`, `system_user_token`, `system_user_created` | "Generate Token" button |
| 11 | syncBmData (update) | PATCH | `bm_status`, `verification_status`, `last_synced` + update `profile_bms` junction | Sync |
| 12 | toggleItemHidden | PATCH | `hidden` | Hide button |
| 13 | createBm (during sync) | POST | `bm_fb_id`, `bm_name`, `bm_status`, `hidden=false` + insert `profile_bms` | Sync creates new BM |

**D1 queries needed:** `updateBm(id, fields)`, `createBm(fields)`, `upsertProfileBm(profileId, bmId)`

---

## AD ACCOUNTS (3 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 14 | syncAdAccount (update) | PATCH | `ad_acc_status`, `currency`, `amount_spent`, `timezone`, `last_synced` + update `bm_ad_accounts` | Sync |
| 15 | toggleItemHidden | PATCH | `hidden` | Hide button |
| 16 | createAdAccount (during sync) | POST | `ad_acc_fb_id`, `ad_acc_name`, `ad_acc_status`, `currency`, `amount_spent`, `timezone` + insert `bm_ad_accounts` | Sync creates new AdAccount |

**D1 queries needed:** `updateAdAccount(id, fields)`, `createAdAccount(fields)`, `upsertBmAdAccount(bmId, adAccId)`

---

## PAGES (3 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 17 | syncPage (update) | PATCH | `published`, `fan_count`, `page_link`, `last_synced` + update `profile_pages` | Sync |
| 18 | toggleItemHidden | PATCH | `hidden` | Hide button |
| 19 | createPage (during sync) | POST | `page_fb_id`, `page_name`, `published`, `fan_count`, `page_link` + insert `profile_pages` | Sync creates new Page |

**D1 queries needed:** `updatePage(id, fields)`, `createPage(fields)`, `upsertProfilePage(profileId, pageId)`

---

## PIXELS (3 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 20 | syncPixel (update) | PATCH | `last_fired_time`, `available`, `last_synced` + update `bm_pixels` | Sync |
| 21 | toggleItemHidden | PATCH | `hidden` | Hide button |
| 22 | createPixel (during sync) | POST | `pixel_fb_id`, `pixel_name`, `last_fired_time`, `available` + insert `bm_pixels` + insert `pixel_owner_bms` | Sync creates new Pixel |

**D1 queries needed:** `updatePixel(id, fields)`, `createPixel(fields)`, `upsertBmPixel(bmId, pixelId)`, `upsertPixelOwner(pixelId, bmId)`

---

## VIDEOS (8 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 23 | updateVideo | PATCH | `video_name`, `status`, `format`, `text_version`, `editor_id`, `product_id`, `creative_link`, `notes` | Video detail edit |
| 24 | updateVideoStatus (bulk) | PATCH batch | `status` | Bulk approve/archive |
| 25 | updateVideoUsage (bulk) | PATCH batch | `status`, `used_in_campaign` via junction | Mark used in campaign |
| 26 | updateVideosBatch | PATCH batch | Custom fields | Generic batch update |
| 27 | deleteVideo | DELETE | — | Single video delete |
| 28 | deleteVideos (bulk) | DELETE batch | — | Bulk video delete |
| 29 | createVideo | POST | `video_name`, `status`, `format`, `text_version`, `editor_id`, `product_id`, `script_id`, `scrollstopper_number` | Create single video |
| 30 | createVideoBatch | POST batch | Same as createVideo × N | Bulk create (script assignment) |
| 31 | updateVideoAfterUpload | PATCH | `creative_link`, `status` | After Cloudflare upload |

**D1 queries needed:** `updateVideo(id, fields)`, `updateVideos(ids, fields)`, `deleteVideo(id)`, `deleteVideos(ids)`, `createVideo(fields)`, `createVideos(records[])`

**Note on batch operations:** Airtable limited to 10 per request. In SQL, use a single transaction — no chunking needed.

---

## CAMPAIGNS (7 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 32 | updateCampaignRedtrackId | PATCH | `redtrack_campaign_id`, `redtrack_campaign_name` | Save RedTrack data |
| 33 | updateCampaignName | PATCH | `campaign_name` | Rename campaign |
| 34 | updateLaunchData | PATCH | `fb_campaign_id`, `fb_ad_account_id`, `launch_profile_id`, `status`, `launched_at`, `launched_data` + insert `campaign_images` | After FB launch success |
| 35 | updateCampaignStatus | PATCH | `status` | Status change |
| 36 | updateCampaignMedia | PATCH | `campaign_videos` junction, `campaign_images` junction | Link creatives |
| 37 | createCampaign | POST | `campaign_name`, `product_id`, `status` | Create new campaign |
| 38 | saveCampaignDraft | PATCH | All draft fields (20+ fields — see field map) | Save draft |
| 39 | addImageIdsToCampaign | PATCH | Insert rows into `campaign_images` | Add images post-launch |

**D1 queries needed:** `updateCampaign(id, fields)`, `createCampaign(fields)`, `upsertCampaignVideo(campaignId, videoId)`, `upsertCampaignImage(campaignId, imageId)`

---

## AD PRESETS (2 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 40 | updateAdPreset | PATCH | All copy fields (primary texts, headlines, descriptions, CTA, compliance) | Edit preset |
| 41 | createAdPreset | POST | `preset_name`, `product_id`, optional copy fields | Create preset |

---

## ADVERTORIALS (2 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 42 | createAdvertorial | POST | `advertorial_name`, `product_id`, `advertorial_text`, `final_link` | Create new advertorial |
| 43 | updateAdvertorial | PATCH | `is_checked`, `advertorial_name`, `advertorial_text`, `final_link` | Update/check advertorial |

---

## PRODUCTS (4 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 44 | createProduct | POST | `product_name`, `status`, `drive_folder_id` | Create product (+ creates Drive folder) |
| 45 | uploadAsset | PATCH | Insert row into `product_assets` (type='image' or 'logo') | Upload product image/logo |
| 46 | deleteAsset | PATCH | Delete row from `product_assets` | Delete product image/logo |
| 47 | updateProductStatus | PATCH | `status` | Change product status |

**Note:** `uploadAsset` / `deleteAsset` go to the `product_assets` table, not a field on `products`. This is a behavioral change from Airtable attachment fields.

---

## IMAGES (2 writes)

| # | Function | HTTP | Fields Written | Trigger |
|---|---|---|---|---|
| 48 | createImage | POST | `image_name`, `product_id`, `image_drive_link`, `count` | Create image record after upload |
| 49 | deleteTempImage | DELETE | — | Delete temp image record |

---

## Summary by Table

| Table | Create | Update | Delete | Total |
|---|---|---|---|---|
| profiles | 1 | 7 | 0 | 8 |
| business_managers | 1 | 4 | 0 | 5 |
| ad_accounts | 1 | 2 | 0 | 3 |
| pages | 1 | 2 | 0 | 3 |
| pixels | 1 | 2 | 0 | 3 |
| videos | 2 | 4 | 2 | 8 |
| campaigns | 1 | 6 | 0 | 7 |
| ad_presets | 1 | 1 | 0 | 2 |
| advertorials | 1 | 1 | 0 | 2 |
| products | 1 | 3 | 0 | 4 |
| images | 1 | 0 | 1 | 2 |
| **TOTAL** | **12** | **32** | **3** | **47** |

---

## D1 Query Files to Create

```
src/db/queries/
  profiles.ts        — getProfiles, getProfileById, updateProfile, createProfile
  business_managers.ts
  ad_accounts.ts
  pages.ts
  pixels.ts
  junction_infrastructure.ts — upsert/delete for all 5 infrastructure junctions
  videos.ts          — includes batch operations
  video_scripts.ts
  campaigns.ts       — includes junction operations
  products.ts        — includes product_assets
  images.ts
  ad_presets.ts
  advertorials.ts
  scaling_rules.ts
  users.ts
```
