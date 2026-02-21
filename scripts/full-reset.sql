-- Full D1 database reset: drop all tables including migration tracking
-- Run with: wrangler d1 execute ops-dashboard-db --remote --file=scripts/full-reset.sql
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS campaign_videos;
DROP TABLE IF EXISTS campaign_images;
DROP TABLE IF EXISTS profile_pages;
DROP TABLE IF EXISTS profile_bms;
DROP TABLE IF EXISTS pixel_owner_bms;
DROP TABLE IF EXISTS bm_pixels;
DROP TABLE IF EXISTS bm_ad_accounts;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS video_scripts;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS advertorials;
DROP TABLE IF EXISTS ad_presets;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS temp_images;
DROP TABLE IF EXISTS pixels;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS ad_accounts;
DROP TABLE IF EXISTS business_managers;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS product_assets;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS scaling_rules;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS d1_migrations;
PRAGMA foreign_keys = ON;
