# Table Inventory — All 16 Airtable Tables

## Infrastructure Tables (5)
All use numeric Airtable table IDs. Read + Write. Admin/Ops only.

| Table | Airtable ID | SQL Table | Feature | R/W |
|---|---|---|---|---|
| Profiles | `tble3Qky3A2j8LpSj` | `profiles` | Infrastructure | R/W |
| Business Managers | `tbl1xnWkoju7WG8lb` | `business_managers` | Infrastructure | R/W |
| Ad Accounts | `tbltReEL235grY3Im` | `ad_accounts` | Infrastructure | R/W |
| Pages | `tblUwiY8UQVi3yXBU` | `pages` | Infrastructure | R/W |
| Pixels | `tblsMDmQedp4B3pB8` | `pixels` | Infrastructure | R/W |

## Content Tables (8)
All use table name strings (not IDs). Mix of roles.

| Table | Airtable Name | SQL Table | Feature | R/W | Roles |
|---|---|---|---|---|---|
| Products | `Products` | `products` | Products, Videos, Images, Campaigns | R/W | Admin writes; Editors read |
| Videos | `Videos` | `videos` | Videos | R/W | Editors write own; Ops full |
| Video Scripts | `Video Scripts` | `video_scripts` | Scripts, Videos | R/W | Admin writes; Editors read |
| Images | `Images` | `images` | Images, Campaigns | R/W | Admin writes; Editors read |
| Temp Images | `Temp Images` | `temp_images` | Images (staging) | R/W | Editors write |
| Campaigns | `Campaigns` | `campaigns` | Campaigns, Launch | R/W | Editors write own |
| Ad Presets | `Ad Presets` | `ad_presets` | Ad Presets, Launch | R/W | Admin writes; Editors read |
| Advertorials | `Advertorials` | `advertorials` | Advertorials | R/W | Admin writes; Editors read |

## System Tables (3)

| Table | Airtable Name | SQL Table | Feature | R/W | Roles |
|---|---|---|---|---|---|
| Users | `Users` | `users` | Auth, Videos, Scripts | R only | System |
| Scaling Rules | `Scaling Rules` | `scaling_rules` | Rules/Ops | R/W | Admin/Ops |
| Master Profile | `Master Profile` | *(inline)* | Profiles (config) | R only | System |

**Note:** Master Profile just stores a single linked record (the default profile). In SQL this becomes a simple `is_master` boolean column on the `profiles` table.

---

## Relationship Map

### Infrastructure Relationships
```
profiles ──────────── profile_bms ──────────── business_managers
    │                                                   │
profile_pages                              bm_ad_accounts    bm_pixels
    │                                         │               │
  pages                                  ad_accounts       pixels
                                                          (owner_bm_id FK on pixels)
```

All infrastructure joins are **many-to-many** via junction tables.

| Junction Table | Left | Right | Notes |
|---|---|---|---|
| `profile_bms` | profiles | business_managers | Profile linked to BMs |
| `profile_pages` | profiles | pages | Profile linked to Pages |
| `bm_ad_accounts` | business_managers | ad_accounts | BM linked to Ad Accounts |
| `bm_pixels` | business_managers | pixels | BM linked to Pixels |
| `pixel_owner_bms` | pixels | business_managers | Pixel ownership (usually 1:1 but stored as array in Airtable) |

### Content Relationships
```
users ──────────────┐
                    ├── videos (editor_id FK)
products ───────────┤── videos (product_id FK)
video_scripts ──────┘── videos (script_id FK)

products ─── video_scripts (product_id FK)
users ─────── video_scripts (author_id FK)

products ─── images (product_id FK)
products ─── ad_presets (product_id FK)
products ─── advertorials (product_id FK)
products ─── campaigns (product_id FK)

campaigns ─── campaign_videos (junction)  → videos
campaigns ─── campaign_images (junction)  → images
campaigns ─── ad_presets (selected_ad_profile_id FK)
```

### Product Asset Relationships
```
products ─── product_assets (type: 'image' | 'logo')
```

---

## Tables That Did NOT Exist in Airtable (New in SQL)

| New Table | Purpose |
|---|---|
| `profile_bms` | Junction for Profile ↔ BM |
| `profile_pages` | Junction for Profile ↔ Page |
| `bm_ad_accounts` | Junction for BM ↔ AdAccount |
| `bm_pixels` | Junction for BM ↔ Pixel |
| `pixel_owner_bms` | Junction for Pixel ↔ Owner BM |
| `campaign_videos` | Junction for Campaign ↔ Video |
| `campaign_images` | Junction for Campaign ↔ Image |
| `product_assets` | Replaces Airtable attachment arrays |

---

## Permission Summary (for D1 Query Layer)

| Table | Admin | Ops | Video Editor |
|---|---|---|---|
| profiles | Full | Full (no passwords) | None |
| business_managers | Full | Full (no tokens) | None |
| ad_accounts | Full | Full | None |
| pages | Full | Full | None |
| pixels | Full | Full | None |
| users | Full | Read | Read own |
| products | Full | Read | Read |
| videos | Full | Full | Read + write own |
| video_scripts | Full | Read | Read |
| images | Full | Full | Read |
| temp_images | Full | Full | Write |
| campaigns | Full | Full | Read + write own |
| ad_presets | Full | Read | Read |
| advertorials | Full | Full | Read |
| scaling_rules | Full | Full | None |

**Sensitive fields** stripped from non-admin queries:
- `profiles`: `permanent_token`, `profile_fb_password`, `profile_email_password`, `profile_2fa`, `profile_security_email`, `security_email_password`
- `business_managers`: `system_user_token`, `system_user_id`
- `users`: `password_hash`
