# Campaign Launch Logic — Complete Reference

> This document describes the **entire** campaign launching flow in `ops-dashboard-cloudflare`.
> Another AI agent should be able to read this and replicate the launch process with 100% accuracy.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Map](#2-file-map)
3. [Data Structures](#3-data-structures)
4. [Prelaunch Phase](#4-prelaunch-phase)
5. [Redtrack Integration](#5-redtrack-integration)
6. [Facebook Infrastructure](#6-facebook-infrastructure)
7. [Validation](#7-validation)
8. [Input Mapping](#8-input-mapping)
9. [Launch Execution Pipeline](#9-launch-execution-pipeline)
10. [Facebook API Calls](#10-facebook-api-calls-v210)
11. [Post-Launch Persistence](#11-post-launch-persistence)
12. [Step-by-Step Flow](#12-step-by-step-flow)
13. [Configuration Constants](#13-configuration-constants)
14. [Error Handling & Retries](#14-error-handling--retries)

---

## 1. Architecture Overview

The system follows a **FACADE → BRIDGE → ENGINE** pattern across three lifecycle phases:

```
PRELAUNCH (data prep + user input)
    ↓
LAUNCH (Facebook campaign execution)
    ↓
POSTLAUNCH (persist to database)
```

The **facade** is `useCampaignLaunchController` — it composes every sub-hook and exposes a single unified interface to the UI. The **bridge** is `useLaunchExecution` — it connects prelaunch state to the launch engine and postlaunch persistence. The **engine** is `fbLaunchRunner` — a pure state machine that talks to the Facebook Graph API.

---

## 2. File Map

| Layer | File | Purpose |
|-------|------|---------|
| Controller (Facade) | `useCampaignLaunchController.ts` | Composes all hooks, single UI interface |
| Selection State | `useLaunchSelectionState.ts` | Video/image selection, flags |
| Draft State | `useLaunchDraftState.ts` | Form state, field initialization |
| Media State | `useLaunchMediaState.ts` | Filters available videos/images |
| Redtrack | `useLaunchRedtrack.ts` | Campaign lookup, URL auto-populate |
| FB Infrastructure | `useLaunchFacebookInfra.ts` | Fetches ad accounts, pages, pixels |
| Validation | `useLaunchValidation.ts` | 12 validation checks across 4 groups |
| Auto-Save | `useLaunchAutoSave.ts` | Debounced draft persistence |
| Prelaunch Uploader | `usePrelaunchUploader.ts` | Video library check + upload before launch |
| Execution (Bridge) | `useLaunchExecution.ts` | Bridges prelaunch → launch → postlaunch |
| Pipeline | `useRunLaunchPipeline.ts` | Validates, maps input, calls FB runner |
| Runner (Engine) | `fbLaunchRunner.ts` | State machine: upload → campaign → ads |
| API Layer | `fbLaunchApi.ts` | Raw Facebook Graph API calls |
| Input Mapper | `mapToFbLaunchInput.ts` | Transforms draft → Facebook input format |
| Post-Launch | `writeLaunchSnapshot.ts` | Saves launch metadata to DB |
| Redtrack API | `/features/redtrack/api.ts` | Redtrack campaign/lander/offer fetching |

---

## 3. Data Structures

### Campaign Draft (form state)

```typescript
CampaignDraft {
  // Identity
  name: string;                     // Campaign name
  productId?: string;               // Product ID
  campaignId?: string;              // DB campaign record ID

  // Facebook Infrastructure
  adAccountId: string | null;       // e.g. "act_123456"
  pageId: string | null;            // Facebook Page ID
  pixelId: string | null;           // Facebook Pixel ID

  // Redtrack
  redtrackCampaignId: string;       // Redtrack campaign hex ID
  redtrackCampaignName: string;     // Redtrack campaign name

  // Ad Preset (text copy)
  adPresetId: string | null;        // Selected ad preset record ID
  primaryTexts: string[];           // Ad body texts
  headlines: string[];              // Ad headlines
  descriptions: string[];           // Ad descriptions
  beneficiaryName?: string;         // EU DSA compliance
  payerName?: string;               // EU DSA compliance
  cta?: string;                     // Call to action (e.g. "Shop Now")

  // Delivery
  budget: string;                   // Daily budget in dollars (e.g. "50")
  startDate: string;                // YYYY-MM-DD or empty for immediate
  startTime: string;                // HH:MM or empty
  geo: string;                      // Comma-separated country codes (e.g. "US,CA")
  ctaOverride: string;              // Override CTA from preset

  // URL & Tracking
  websiteUrl: string;               // Landing page URL
  utms: string;                     // UTM parameters string
  displayLink: string | null;       // Display link override
  linkVariable: string;             // Value for {{link}} replacement
}
```

### Facebook Launch Input (what goes to the engine)

```typescript
FbLaunchInput {
  campaign: {
    name: string;
    objective: 'OUTCOME_SALES';
    status: 'ACTIVE' | 'PAUSED';
    dailyBudget: number;            // IN CENTS (e.g. 5000 = $50)
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP';
  };

  adSet: {
    name: string;
    optimizationGoal: 'OFFSITE_CONVERSIONS';
    billingEvent: 'IMPRESSIONS';
    status: 'ACTIVE' | 'PAUSED';
    targeting: {
      geoLocations: { countries: string[] };  // e.g. ['US', 'CA']
      ageMin: 18;
      ageMax: 65;
    };
    promotedObject: {
      pixelId: string;
      customEventType: 'PURCHASE';
    };
    startTime: number | null;       // Unix timestamp in SECONDS, null = immediate
    beneficiaryName?: string;
    payerName?: string;
  };

  adCreative: {
    websiteUrl: string;             // Landing page URL
    urlTags: string;                // UTM params
    cta: string;                    // FB format: 'SHOP_NOW', 'LEARN_MORE', etc.
    bodies: string[];               // Primary texts
    titles: string[];               // Headlines
    descriptions: string[];         // Descriptions
    advantagePlusEnabled: boolean;   // Advantage+ Creative toggle
    beneficiaryName?: string;
    payerName?: string;
  };

  media: Array<{
    type: 'video' | 'image';
    name: string;
    url: string;                    // Source file URL
    fbVideoId?: string;             // If already in FB library
    fallbackUrl?: string;           // Backup URL (same as url for us)
  }>;

  infrastructure: {
    adAccountId: string;            // "act_XXXXX"
    pageId: string;
    pixelId: string;
    accessToken: string;            // Facebook permanent token from profile
  };

  options: {
    checkLibraryFirst: boolean;     // true if reuseCreatives enabled
    forceReupload: boolean;         // false
    uploadBatchSize: 10;
    adBatchSize: 25;
    tickIntervalMs: 10000;
    maxTicks: 15;
    maxRetries: 3;
    maxStaleTicks: 5;
  };
}
```

---

## 4. Prelaunch Phase

### Selection State (`useLaunchSelectionState`)
- `selectedVideoIds: Set<string>` — which videos the user picked
- `selectedImageIds: Set<string>` — which images the user picked
- `reuseCreatives: boolean` — reuse videos already in FB library (default: **true**)
- `launchStatusActive: boolean` — launch as ACTIVE or PAUSED (default: **true**)

### Draft State (`useLaunchDraftState`)
- Initializes from the campaign record on first load
- Special logic: changing `adAccountId` resets `pixelId` and `pageId` to null
- When `websiteUrl` changes manually, clears the auto-populate flag (so Redtrack doesn't overwrite it)

### Media State (`useLaunchMediaState`)
- Filters product's videos: only `status === 'available'` or `status === 'review'`
- Excludes YouTube-format videos
- Merges with prelaunch uploader state to add `inLibrary`, `fbVideoId`, `uploadStatus` fields
- Images: filters product's images where status is `'available'` or unused

### Auto-Save (`useLaunchAutoSave`)
- Debounces 2 seconds after any draft change
- Saves full draft + `selectedProfileId` + `reuseCreatives` + `launchStatusActive`
- States: `idle → pending → saving → saved` (or `error`)

### Prelaunch Uploader (`usePrelaunchUploader`)
- **Check Library**: Fetches ALL videos from the FB ad account, matches by name
- **Upload Videos**: Batch upload in groups of 10, staggered by 1 second
- **Poll Processing**: Every 5 seconds, up to 60 attempts (5 minutes)
- Per-video state machine: `idle → queued → uploading → processing → ready` (or `failed`)

---

## 5. Redtrack Integration

### API Details
- Base: `https://api.redtrack.io`
- Auth: `?api_key=Hu3zMvCKDSKADZ3tTVar` (query param)
- Proxied through `/api/redtrack` in the app

### Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/campaigns?page=X&per=Y` | GET | List all campaigns (paginated) |
| `/campaigns/{id}` | GET | Get campaign details (contains streams with landers/offers) |
| `/landings/{id}` | GET | Get landing page URL |
| `/offers/{id}` | GET | Get offer details |

### Campaign Details Response
```json
{
  "_id": "hex_string",
  "name": "Campaign Name",
  "trackback_url": "https://domain.com/click?s1={{s1}}&s2={{s2}}&click_id={{click_id}}",
  "status": "active",
  "streams": [{
    "stream": {
      "landings": [{ "id": "lander_hex_id" }],
      "offers": [{ "id": "offer_hex_id" }]
    }
  }]
}
```

### Lander Response
```json
{
  "_id": "hex_string",
  "name": "Lander Name",
  "url": "https://example.com/lander-page",
  "status": "active"
}
```

### Auto-Population Flow
1. User selects a Redtrack campaign in the dropdown
2. App fetches campaign details → extracts first lander ID from `streams[0].stream.landings[0].id`
3. Fetches lander details → gets `url` field
4. Auto-populates:
   - `draft.websiteUrl` = lander URL
   - `draft.utms` = tracking params extracted from trackback URL
5. Replaces `{{link}}` placeholder in `primaryTexts`, `headlines`, `descriptions` with the lander URL

### Tracking Parameters
Extracted from the `trackback_url` template — the macros like `{{s1}}`, `{{click_id}}` become UTM params for Facebook URL tags.

---

## 6. Facebook Infrastructure

### Fetching Flow (`useLaunchFacebookInfra`)
1. User selects a **Profile** (which has a `permanentToken`)
2. App calls `useFacebookAds(permanentToken)` to fetch **ad accounts**
3. User selects an **ad account** → app fetches **pixels** and **pages** for that account
4. User selects a **pixel** and a **page**

### Data Format
```typescript
InfraOption {
  id: string;          // Internal DB ID
  name: string;        // Display name
  externalId?: string; // Facebook ID (e.g. "act_123", pixel ID, page ID)
  status: string;
}
```

---

## 7. Validation

### 4 Validation Groups, 12 Total Checks

**Group 1: Assets (4 checks)**
1. Ad preset selected
2. `{{link}}` replaced in all texts (no remaining `{{link}}` placeholders)
3. At least 1 creative (video or image) selected
4. All selected media have valid statuses (videos must be `review` or `available`)

**Group 2: Infrastructure (3 checks)**
5. Ad account selected
6. Page selected
7. Pixel selected

**Group 3: Delivery (3 checks)**
8. Budget > 0
9. Start date set
10. Location targeting set (geo field not empty)

**Group 4: System (1 check)**
11. Campaign name not empty

The Launch button is **disabled** unless `allChecksPass === true`.

---

## 8. Input Mapping

### File: `mapToFbLaunchInput.ts`

This transforms the draft form state into the `FbLaunchInput` the engine needs.

### Helper Functions

**`toFacebookCta(cta: string) → string`**
```
"Learn More"  → "LEARN_MORE"
"Shop Now"    → "SHOP_NOW"
// Uppercase, spaces → underscores
```

**`parseStartTime(startDate, startTime) → number | null`**
```
// Combines "2026-02-21" + "14:30" → Unix timestamp in seconds
// Returns null if no date (means "start immediately")
```

**`parseGeoTargets(geo: string) → string[]`**
```
// Splits by comma/space, uppercases
// Defaults to ['US'] if empty
// "US,CA,UK" → ['US', 'CA', 'UK']
```

**`parseBudgetToCents(budget: string) → number`**
```
// Parses float, multiplies by 100, rounds
// "50.99" → 5099
// "50" → 5000
```

### Mapping Rules

| Draft Field | FB Input Field | Transform |
|-------------|----------------|-----------|
| `name` | `campaign.name` | Direct |
| — | `campaign.objective` | Always `'OUTCOME_SALES'` |
| `launchStatusActive` | `campaign.status` / `adSet.status` | `true` → `'ACTIVE'`, `false` → `'PAUSED'` |
| `budget` | `campaign.dailyBudget` | `parseBudgetToCents()` |
| — | `campaign.bidStrategy` | Always `'LOWEST_COST_WITHOUT_CAP'` |
| `geo` | `adSet.targeting.geoLocations.countries` | `parseGeoTargets()` |
| `startDate` + `startTime` | `adSet.startTime` | `parseStartTime()` |
| — | `adSet.targeting.ageMin` | Always `18` |
| — | `adSet.targeting.ageMax` | Always `65` |
| — | `adSet.optimizationGoal` | Always `'OFFSITE_CONVERSIONS'` |
| — | `adSet.billingEvent` | Always `'IMPRESSIONS'` |
| `pixelId` | `adSet.promotedObject.pixelId` | Direct |
| — | `adSet.promotedObject.customEventType` | Always `'PURCHASE'` |
| `websiteUrl` | `adCreative.websiteUrl` | Direct (fallback: `example.com`) |
| `utms` or Redtrack params | `adCreative.urlTags` | Direct |
| `ctaOverride` or preset CTA | `adCreative.cta` | `toFacebookCta()` |
| `primaryTexts` or preset | `adCreative.bodies` | Direct (fallback: default text) |
| `headlines` or preset | `adCreative.titles` | Direct |
| `descriptions` or preset | `adCreative.descriptions` | Direct |
| — | `adCreative.advantagePlusEnabled` | Always `true` |
| Preset `beneficiaryName` | `adCreative.beneficiaryName` / `adSet.beneficiaryName` | Direct |
| Preset `payerName` | `adCreative.payerName` / `adSet.payerName` | Direct |
| Selected videos | `media[]` | `{ type: 'video', name, url: creativeLink, fbVideoId? }` |
| Selected images | `media[]` | `{ type: 'image', name, url: imageDriveLink }` |
| `reuseCreatives` | `options.checkLibraryFirst` | Direct |
| — | `options.forceReupload` | Always `false` |

---

## 9. Launch Execution Pipeline

### Phase 1: Validation & Prep (`useRunLaunchPipeline`)
1. Validate profile, ad account, page, pixel are all present
2. Filter selected media to only items with valid URLs
3. Call `mapToFbLaunchInput()` to build the input object
4. Pass to `fbLaunchRunner.launch()`

### Phase 2: Launch Engine (`fbLaunchRunner`)

The runner is a **state machine** with these phases:

```
idle → checking → uploading → creating_campaign → creating_ads → polling/complete
```

#### Per-Media-Item State Machine

**Videos:**
```
queued → uploading → processing → ready → creating_ad → done
                                    ↓
                                  failed → queued (retry, up to 3x)
```

**Images:**
```
ready → creating_ad → done
  ↓
failed → ready (retry, up to 3x)
```

#### Detailed Step Sequence

**Step 1: Check Library** (if `reuseCreatives` is true)
- `GET /{adAccountId}/advideos?fields=id,title,status,picture&limit=100`
- Paginate through ALL videos in the ad account
- Match by video `title` against our video `name`
- If match found AND status is ready: set `fbVideoId` and `thumbnailUrl`, skip upload

**Step 2: Upload Videos** (for videos NOT in library)
- Batch upload in groups of `uploadBatchSize` (10)
- Stagger each batch by 1 second
- API: `POST / (batch endpoint)` with each item as:
  ```
  method: POST
  relative_url: {adAccountId}/advideos
  body: file_url={videoUrl}&title={videoName}
  ```
- On success: extract `id` from response → set `fbVideoId`, move to `processing`
- On failure: retry up to 3 times, then mark `failed`

**Step 3: Create Campaign**
- `POST /{adAccountId}/campaigns`
- Body:
  ```
  name={campaignName}
  objective=OUTCOME_SALES
  status=ACTIVE|PAUSED
  special_ad_categories=[]
  daily_budget={budgetInCents}
  bid_strategy=LOWEST_COST_WITHOUT_CAP
  ```
- Returns `{ id: "campaign_id" }`

**Step 4: Create Ad Set**
- `POST /{adAccountId}/adsets`
- Body:
  ```
  name={campaignName}
  campaign_id={campaignId from step 3}
  optimization_goal=OFFSITE_CONVERSIONS
  billing_event=IMPRESSIONS
  status=ACTIVE|PAUSED
  targeting={"geo_locations":{"countries":["US"]},"age_min":18,"age_max":65}
  promoted_object={"pixel_id":"{pixelId}","custom_event_type":"PURCHASE"}
  start_time={unixTimestamp or omit for immediate}
  dsa_beneficiary={beneficiaryName}  (if EU DSA)
  dsa_payor={payerName}              (if EU DSA)
  ```
- Returns `{ id: "adset_id" }`

**Step 5: Tick Loop (Polling + Ad Creation)**
- Initial delay: **8 seconds** (let Facebook start processing uploads)
- Then runs up to **15 ticks**, each **10 seconds** apart
- Each tick does:
  1. **Poll processing videos**: `GET /{adAccountId}/advideos?filtering=[{field:"id",operator:"IN",value:[...ids]}]&fields=id,status,picture`
     - If `video_status` is ready AND `picture` exists → mark `ready`
  2. **Create ads** for all `ready` items (batch of 25)
  3. **Retry** any failed uploads
  4. **Check stale ticks** — if no progress for 5 consecutive ticks, exit
  5. **Check completion** — if all items are `done`, exit

**Step 6: Create Ads** (within tick loop)
- Batch API: `POST / (batch endpoint)` with up to 25 ads per call
- Each ad in the batch:
  ```
  method: POST
  relative_url: {adAccountId}/ads
  body: name={adName}&adset_id={adSetId}&status={status}&creative={creativeJSON}
  ```

#### Creative JSON Structure

**For Videos:**
```json
{
  "name": "Creative-{videoName}",
  "object_story_spec": {
    "page_id": "{pageId}",
    "video_data": {
      "video_id": "{fbVideoId}",
      "image_url": "{thumbnailUrl}",
      "call_to_action": {
        "type": "SHOP_NOW",
        "value": { "link": "{websiteUrl}" }
      }
    }
  },
  "url_tags": "{utmParams}",
  "asset_feed_spec": {
    "bodies": [{ "text": "Primary text 1" }, { "text": "Primary text 2" }],
    "titles": [{ "text": "Headline 1" }, { "text": "Headline 2" }],
    "descriptions": [{ "text": "Description 1" }],
    "optimization_type": "DEGREES_OF_FREEDOM"
  },
  "degrees_of_freedom_spec": {
    "creative_features_spec": {
      "advantage_plus_creative": {
        "enroll_status": "OPT_IN"
      }
    }
  }
}
```

**For Images:**
```json
{
  "name": "Creative-{imageName}",
  "object_story_spec": {
    "page_id": "{pageId}",
    "link_data": {
      "picture": "{imageUrl}",
      "link": "{websiteUrl}",
      "call_to_action": {
        "type": "SHOP_NOW",
        "value": { "link": "{websiteUrl}" }
      }
    }
  },
  "url_tags": "{utmParams}",
  "asset_feed_spec": { ... },
  "degrees_of_freedom_spec": { ... }
}
```

> Key difference: videos use `video_data` with `video_id` + `image_url` (thumbnail).
> Images use `link_data` with `picture` + `link`.

### Phase 3: Post-Launch (`useLaunchExecution`)
- On success → calls `writeLaunchSnapshot()` (see section 11)
- Returns `{ success, campaignId, adSetId, error? }`

---

## 10. Facebook API Calls (v21.0)

All calls go to `https://graph.facebook.com/v21.0/`.
Auth: `access_token={permanentToken}` query param on every request.

| Operation | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| Create Campaign | POST | `/{adAccountId}/campaigns` | name, objective, status, daily_budget, bid_strategy, special_ad_categories |
| Create Ad Set | POST | `/{adAccountId}/adsets` | name, campaign_id, optimization_goal, billing_event, status, targeting, promoted_object, start_time |
| Upload Videos (batch) | POST | `/` (batch) | Each item: `{adAccountId}/advideos` with `file_url` + `title` |
| Check Library | GET | `/{adAccountId}/advideos` | fields=id,title,status,picture, limit=100, paginated |
| Poll Video Status | GET | `/{adAccountId}/advideos` | fields=id,status,picture, filtering=[IN on IDs] |
| Create Ads (batch) | POST | `/` (batch) | Each item: `{adAccountId}/ads` with name, adset_id, status, creative |

### Batch Request Format
```json
POST https://graph.facebook.com/v21.0/
Content-Type: application/json

{
  "access_token": "{token}",
  "batch": [
    {
      "method": "POST",
      "relative_url": "act_123456/advideos",
      "body": "file_url=https://example.com/video.mp4&title=My Video"
    },
    {
      "method": "POST",
      "relative_url": "act_123456/advideos",
      "body": "file_url=https://example.com/video2.mp4&title=My Video 2"
    }
  ]
}
```

### Rate Limiting
- Extracts `x-app-usage` header from responses
- Tracks rate but does not explicitly throttle
- Batch sizes (10 uploads, 25 ads) serve as implicit throttling

---

## 11. Post-Launch Persistence

### File: `writeLaunchSnapshot.ts`

After a successful launch, saves a complete snapshot:

**Actions:**
1. Updates video records — marks succeeded videos as `Status = 'Used'`, adds campaign ID to `usedInCampaigns`
2. Updates image records — adds campaign ID to `usedInCampaigns`
3. Builds and saves a launch snapshot JSON blob to the campaign record

### Launch Snapshot Structure
```typescript
{
  version: 1,
  launchedAt: "2026-02-21T14:30:00.000Z",

  config: {
    campaignName: string,
    budget: number,           // dollars
    budgetCents: number,      // cents
    geo: string[],            // ['US', 'CA']
    startDate?: string,
    startTime?: string,
    websiteUrl: string,
    utms?: string,
    ctaOverride?: string,
    launchStatus: 'ACTIVE' | 'PAUSED'
  },

  facebook: {
    adAccountId: string,
    pageId: string,
    pixelId: string,
    campaignId?: string,      // FB campaign ID
    adSetId?: string,         // FB ad set ID
    adIds: string[]           // All created FB ad IDs
  },

  profile: {
    id: string,
    name: string
  },

  adPreset?: {
    id: string,
    name: string,
    primaryTexts: string[],
    headlines: string[],
    descriptions: string[],
    callToAction: string
  },

  redtrack?: {
    campaignId: string,
    campaignName: string
  },

  media: {
    summary: {
      videosAttempted: number,
      videosSucceeded: number,
      videosFailed: number,
      imagesAttempted: number,
      imagesSucceeded: number,
      imagesFailed: number
    },
    videos: {
      succeeded: [{ localId, name, fbMediaId?, thumbnailUrl?, adId? }],
      failed: [{ localId, name, error, failedAt: 'upload' | 'ad-creation' }]
    },
    images: {
      succeeded: [{ localId, name, adId? }],
      failed: [{ localId, name, error, failedAt: 'ad-creation' }]
    }
  },

  result: {
    success: boolean,
    partialSuccess: boolean,
    dryRun: false,
    adsAttempted: number,
    adsCreated: number,
    adsFailed: number,
    completedAt: "ISO string",
    errors: [{ mediaId, mediaName, stage, message }]
  }
}
```

### Save Call
Calls `updateLaunchData()` with:
- Campaign record ID
- FB campaign ID
- FB ad account ID
- Launch profile ID
- Full snapshot JSON
- Succeeded image IDs

---

## 12. Step-by-Step Flow

Here is the complete launch flow from start to finish:

```
 1. User opens campaign → useCampaignLaunchController loads all data
 2. User fills prelaunch form → draft auto-saves every 2 seconds
 3. User selects a Profile → fetches FB ad accounts for that profile's token
 4. User selects Ad Account → fetches pixels and pages for that account
 5. User selects Page + Pixel
 6. User selects Redtrack Campaign → auto-populates websiteUrl + UTMs
 7. User selects an Ad Preset → loads primaryTexts, headlines, descriptions, CTA
 8. User selects videos/images → marked for launch
 9. (Optional) User clicks "Check Library" → videos matched by name in FB account
10. (Optional) User clicks "Upload" → videos uploaded to FB before launch
11. Validation runs continuously → Launch button enabled when all 12 checks pass
12. User clicks Launch
13.   → useLaunchExecution.launch() called
14.   → useRunLaunchPipeline validates all fields present
15.   → mapToFbLaunchInput() converts draft → FbLaunchInput
16.   → fbLaunchRunner.launch() starts the state machine
17.     → Check Library (if reuseCreatives=true)
18.     → Upload videos not in library (batch of 10, staggered 1s)
19.     → Create Campaign (POST /{adAccountId}/campaigns)
20.     → Create Ad Set (POST /{adAccountId}/adsets)
21.     → Wait 8 seconds for FB to process uploads
22.     → Tick loop (up to 15 ticks, 10s each):
23.       → Poll video processing status
24.       → Create ads for ready items (batch of 25)
25.       → Retry failures (up to 3x)
26.       → Exit if all done OR 5 stale ticks
27.     → Return FbLaunchState with results
28.   → writeLaunchSnapshot() saves metadata to DB
29.   → Update video records (mark as "Used")
30.   → Update image records
31.   → Return { success, campaignId, adSetId }
```

---

## 13. Configuration Constants

### Upload Options
| Constant | Value | Description |
|----------|-------|-------------|
| Upload batch size | 10 | Videos uploaded per batch |
| Stagger delay | 1000ms | Delay between upload batches |
| Max retries | 3 | Retries per failed upload |
| Poll interval (prelaunch) | 5000ms | Check processing status |
| Max poll attempts | 60 | 5 minutes total polling |

### Launch Options
| Constant | Value | Description |
|----------|-------|-------------|
| Initial poll delay | 8000ms | Wait before first tick |
| Tick interval | 10000ms | Time between ticks |
| Max ticks | 15 | Maximum polling iterations |
| Ad batch size | 25 | Ads created per batch call |
| Max stale ticks | 5 | Exit if no progress |
| Max retries | 3 | Retries per failed item |

### Facebook Defaults
| Setting | Value |
|---------|-------|
| Graph API version | v21.0 |
| Campaign objective | OUTCOME_SALES |
| Bid strategy | LOWEST_COST_WITHOUT_CAP |
| Optimization goal | OFFSITE_CONVERSIONS |
| Billing event | IMPRESSIONS |
| Custom event type | PURCHASE |
| Age range | 18-65 |
| Default geo | US |
| Advantage+ Creative | OPT_IN |

### Draft Auto-Save
| Setting | Value |
|---------|-------|
| Debounce delay | 2000ms |
| Redtrack cache stale time | 5 minutes |

---

## 14. Error Handling & Retries

### Validation Errors (pre-launch, block launch)
- Missing profile/ad account/page/pixel → user must select
- No media with valid URLs → user must select media
- `{{link}}` not replaced → user must populate Redtrack or manually replace
- Budget = 0 → user must enter a positive number
- No geo targeting → defaults to US, but user should set

### Upload Errors (during launch)
- Failed upload → automatic retry up to 3 times
- After 3 retries → marked as `failed`, other items continue
- Video fallback URL = same as primary URL (Cloudflare URLs are reliable)

### Ad Creation Errors (during launch)
- HTTP error in batch → mark affected items as `failed`
- Retry up to 3 times
- Partial success is possible (some ads created, some failed)

### Timeout / Stale Handling
- If no new items complete for 5 consecutive ticks → exit early
- If max 15 ticks reached → exit with whatever completed
- Result reports `partialSuccess: true` if some but not all ads created

### Post-Launch Errors
- DB save failure → does NOT fail the launch itself
- Video/image record updates → fire-and-forget
- Snapshot save failure tracked but doesn't roll back Facebook entities

### Manual Retry
- UI has retry buttons: `retryItem(name)` or `retryFailed()`
- Resets retry count to 0
- Determines correct state to resume from (queued vs processing vs ready)
- Restarts tick loop if it was stopped
