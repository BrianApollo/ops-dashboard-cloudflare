-- Airtable → D1 Migration
-- Generated: 2026-02-21T07:48:23.009Z
-- Run with: wrangler d1 execute ops-dashboard-db --local --file=scripts/migration.sql

PRAGMA foreign_keys = OFF;

-- ─────────────────────────────── USERS
INSERT OR IGNORE INTO users (id, name, role, email, created_at) VALUES ('recCEQqTXQ5MNlGDG', 'Nadeem', 'Admin', 'nadeem@trustapollo.com', '2025-12-07T18:22:03.000Z');
INSERT OR IGNORE INTO users (id, name, role, email, created_at) VALUES ('recaidhXBfNk3aUQI', 'Nick', 'Admin', 'nick@trustapollo.com', '2025-12-07T18:21:45.000Z');
INSERT OR IGNORE INTO users (id, name, role, email, created_at) VALUES ('recpEWhnPcHgw5NmN', 'Waqar', 'Video Editor', 'waqar@trustapollo.com', '2025-12-07T18:22:03.000Z');
INSERT OR IGNORE INTO users (id, name, role, email, created_at) VALUES ('recqzwPIonv1tIux0', 'Patrick', 'Video Editor', 'patrick@trustapollo.com', '2025-12-07T18:22:03.000Z');
INSERT OR IGNORE INTO users (id, name, role, email, created_at) VALUES ('recuPiSWzgR8m5M5g', 'Jay', 'Admin', 'admin@trustapollo.com', '2025-12-07T18:21:45.000Z');

-- ─────────────────────────────── SCALING RULES
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('recB4xZs4gjAWed4L', 'Global - ROAS Scale Up', 'Global', 'Budget Chnage', 'Midnight', 'Roas is over 1.2 for 3 days', 'Increase Budget by 2x', 'Midnight', '2026-02-20T12:36:59.000Z');
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('recFGB6ESdB68XbmM', 'Override - Temp 1', 'Scoped', 'Budget Chnage', 'Midnight', NULL, NULL, 'Midnight', '2026-02-20T12:36:59.000Z');
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('recHBqTqhn9oexaGq', 'Global - ROAS Scale Down', 'Global', 'Budget Chnage', 'Midnight', 'Roas is under 1 for 2 days', 'Reduce by 50%', 'Midnight', '2026-02-20T12:36:59.000Z');
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('recjUX49RQwxXrYhy', 'Global Max Budget', 'Global', 'Maxiumum Global Budget', 'Midnight', NULL, NULL, 'Midnight', '2026-02-20T13:01:00.000Z');
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('reck326SHJxO5SEcF', 'Override - Temp 2', 'Scoped', 'Status Change', 'Midnight', NULL, NULL, 'Midnight', '2026-02-20T12:52:20.000Z');
INSERT OR IGNORE INTO scaling_rules (id, name, rule_scope, select_type, check_at, if_condition, then_action, execute_action_at, created_at) VALUES ('recyPzXFT9R4iw24P', 'Global - ROAS Turn Off', 'Global', 'Status Change', 'Midnight', 'Roas is under 1 for 3 days', 'Turn Off', 'Midnight', '2026-02-20T13:01:23.000Z');

-- ─────────────────────────────── PRODUCTS
INSERT OR IGNORE INTO products (id, product_name, status, drive_folder_id, created_at) VALUES ('rec3cJmt5H4AENEgZ', 'VitalTac', 'Active', '162A8AYDWybh27A5Z_XJNBtQ4966Vy0N8', '2025-12-25T17:35:14.000Z');
INSERT OR IGNORE INTO products (id, product_name, status, drive_folder_id, created_at) VALUES ('recMS4kpPubp6bHyu', 'GhostWing', 'Active', '1G2H9AGsbyHzD2HVQZeE-XrrDNhGgcSy_', '2025-12-18T21:58:32.000Z');

-- ─────────────────────────────── PRODUCT ASSETS
INSERT OR IGNORE INTO product_assets (id, product_id, url, filename, type, sort_order) VALUES ('attsiNCEgednBPvXG', 'rec3cJmt5H4AENEgZ', 'https://v5.airtableusercontent.com/v3/u/50/50/1771668000000/fy3r7kTPR9VxwRFlB3mQjQ/N4sW3Ds3ydi5JkDs9IWv0vjO7l2mt_uMKMl2d-IDCHhtjEQRO5Xhq2RmzJ1HSvNJ7LKscQTU1HDs3ih_YwSY7ptRwa_lSqfMpF9tbbP1QKjFg7DxyCuLZa8pK747t1jPQ51S5QtjeI8gJX2eM5Tb5w/ao1LD69I70Pu4XkwLCj50SF77_OFca5t3CRHxB5lZ1o', 'e3e56ba8', 'image', 0);
INSERT OR IGNORE INTO product_assets (id, product_id, url, filename, type, sort_order) VALUES ('att16UAHF0DGgoWmR', 'rec3cJmt5H4AENEgZ', 'https://v5.airtableusercontent.com/v3/u/50/50/1771668000000/63mTXw7ekATmuGieEQ2obA/mnoY6Qip7rYPZr1mJCq6Es_Q8eBYHoctFtbJxPcj4KPMAVG1Ri4nhBTtjVOc3lQM5UOolgTHtX8AwfI5fulrs79hIZrlFdB51y_MYEqe6o6yIeFBsJu7-VWE_XkzQ328gUqegXZABy9EOoQe7qod-w/bsKrSxx9YCeMkoLE6pKzLaiqiHuoUGkk0QwHXL_GjQg', 'VitalTac%20-%20Product%20Logo%20-%201', 'logo', 0);
INSERT OR IGNORE INTO product_assets (id, product_id, url, filename, type, sort_order) VALUES ('attDhSM1Iw1G7BsPf', 'recMS4kpPubp6bHyu', 'https://v5.airtableusercontent.com/v3/u/50/50/1771668000000/QVkdMPJA3FtdqTzdbnOUYg/UYo0Xfh8EqqB3vtD-8ihiQyvfaeBAB_MGsITr3SSAoD_Q_MgqMoQGTt0E-R6ph-Aq26i-Jhn5MlwVWYDk5NXa93oOzHzaKAkfFqJhHvhhX0RTmNIUipiKCgzt0-uF991RJVi_kA6CvfhdPJCZ1ZtC2w-bT4Lt5qhDLIIAJ71scppj96HkxJyD8ytbrKnqgqD/BJlojhg_C8jz5mJPS2nJZPlovJFO6txDPQNpXVOzJIA', 'GhostWing_ProductImage_001.png', 'image', 0);
INSERT OR IGNORE INTO product_assets (id, product_id, url, filename, type, sort_order) VALUES ('attwhQV2Lk6yjXjh7', 'recMS4kpPubp6bHyu', 'https://v5.airtableusercontent.com/v3/u/50/50/1771668000000/C00zWkdUkx3FS83VlRqlCg/x5w33vdfHv2bK9zRqF32snNFKFXBzzuhKXhAjlsKMJRjjIS5Xbp8kjcfjrkMZvx-PIs6w9S9KZxEKMKXG2OZgtDKY5PThiUokTUWMHuPdKXUJHgyie13e9b8SLIbYy9dRiHmW8Dl1xJ_s5zIp7ny-ETsNVymeQygAWFQvLkipvU/uS7jTCitNH0GPnQfzqvh71wh9MfhSo4dhH7Fx5gt2nk', 'GhostWing_Logo.png', 'logo', 0);

-- ─────────────────────────────── PROFILES
INSERT OR IGNORE INTO profiles (id, profile_fb_id, profile_name, profile_status, permanent_token, permanent_token_end_date, token_valid, last_sync, hidden, profile_email, profile_fb_password, profile_email_password, profile_2fa, profile_birth_date, profile_link, profile_review_date, profile_security_email, security_email_password, proxy, profile_youtube_handle, uid, profile_gender, profile_location, profile_year_created, ads_power_profile_id, created_at) VALUES ('recLMEyZCvOH8cO8Y', '10101633566343881', 'Charles Drew', 'Active', 'EAAGnkydOWjQBQiaKFyt7EOoOZBN2VlTbhcDxI1810qII2tDkssRlJmnxspMahpfP2EGjul03Wy2YZBNsCSkW3HVZCvW5z5aXDGvcDWQoEmiRamNkSOx1t  Ry1E6Trj1hHlqh91gybqQc5qnlCi8LqKZAkuIMWU7LUYy6Smccx7xxZBc18vZAzdfCQzjvfyOw6rX4TdRaqjES3r45AZDZD', '2026-04-10', 1, '2026-02-09T13:36:45.672Z', 0, NULL, NULL, NULL, NULL, '2026-02-05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-16T16:17:24.000Z');
INSERT OR IGNORE INTO profiles (id, profile_fb_id, profile_name, profile_status, permanent_token, permanent_token_end_date, token_valid, last_sync, hidden, profile_email, profile_fb_password, profile_email_password, profile_2fa, profile_birth_date, profile_link, profile_review_date, profile_security_email, security_email_password, proxy, profile_youtube_handle, uid, profile_gender, profile_location, profile_year_created, ads_power_profile_id, created_at) VALUES ('recPxxUawdPalMABK', '1357257282563561', 'Baliah Hakeem', 'Active', 'EAAGnkydOWjQBQksZA9zMnPTazjn4uBp8KjqrWaigcYOh0yvf6jPXr09vKWHx92ZB3XIpNeh1O9llZCLHs1rPvRFmoz0BmSZC6IqfkEOnmCsKBupVDzGZBn3bjn0Oqn9CYwjTnzZB5tIbomyzfZCmhlbawOehvUennZAf18A3NRIJbKZBaK7S3uTadeCdAfQDUTz4Xuz1rzfU8TXit', '2026-04-18', 1, '2026-02-12T13:46:10.796Z', 0, 'michumwass@hotmail.com', 'Test', 'password', NULL, '2026-02-14', NULL, NULL, 'adasd', 'asdads', NULL, NULL, NULL, 'male', NULL, NULL, NULL, '2025-12-18T04:26:02.000Z');
INSERT OR IGNORE INTO profiles (id, profile_fb_id, profile_name, profile_status, permanent_token, permanent_token_end_date, token_valid, last_sync, hidden, profile_email, profile_fb_password, profile_email_password, profile_2fa, profile_birth_date, profile_link, profile_review_date, profile_security_email, security_email_password, proxy, profile_youtube_handle, uid, profile_gender, profile_location, profile_year_created, ads_power_profile_id, created_at) VALUES ('recrNAkwxspuzyrKS', '25602887219383177', 'Agatha Li', 'Active', 'EAAGnkydOWjQBQvbvL5KuPGQrvyqLZCA0dvzfaseKsxIIUdhrWs5QabZBJSgayfHF3Fbll3wiZASOtaoHyMHQQs8N368iZC2SDIB0ZAupOlUfYcQPDl07RJlfqQCdgQyBeBbYdnTeI36NLZCB0g5EIISxyywGbPZCu3mDNiyhv61MucZAmbDR77sYY38BosyGmZAuLZAtKKexC7qFDVX0Qk', '2026-04-13', 1, '2026-02-13T16:40:18.757Z', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-11T21:30:19.000Z');
INSERT OR IGNORE INTO profiles (id, profile_fb_id, profile_name, profile_status, permanent_token, permanent_token_end_date, token_valid, last_sync, hidden, profile_email, profile_fb_password, profile_email_password, profile_2fa, profile_birth_date, profile_link, profile_review_date, profile_security_email, security_email_password, proxy, profile_youtube_handle, uid, profile_gender, profile_location, profile_year_created, ads_power_profile_id, created_at) VALUES ('recwFAPmY1etXtsPZ', '3490216837796070', 'Badem Yüzbaşıoğlu', NULL, 'EAAGnkydOWjQBQlJabfeQGwzL85gmto6VikyIZBGjXmWZAekZBlThcfNg6FO5H1dgkNTpQKiYiCY2jE3ZBvni6j5tnnqywJnVrmZBP74ENHl9XZBbe5hnsSytvujZBlmuptaZAITo5IoLvOvKaj61WYAjmRS9WR8nPDtRfTdlANA5AW5WbdZBLsekK6N0ReCMDH2ulLZBD4bquqD90KAY8C', '2026-04-12', 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-11T21:33:07.000Z');
INSERT OR IGNORE INTO profiles (id, profile_fb_id, profile_name, profile_status, permanent_token, permanent_token_end_date, token_valid, last_sync, hidden, profile_email, profile_fb_password, profile_email_password, profile_2fa, profile_birth_date, profile_link, profile_review_date, profile_security_email, security_email_password, proxy, profile_youtube_handle, uid, profile_gender, profile_location, profile_year_created, ads_power_profile_id, created_at) VALUES ('reczLxjVH8Zf44gbQ', '26079497185014153', 'Calimbo Nizer', NULL, 'EAAGnkydOWjQBQp8XNhvTZAcvozQIWVe2jdtOa9Wnob0207aKEGorZCtu9xqoKJf2uzq6SZBVaRWAC6kf3s8O9BvfVdxqZAEhdSJpGASiIN0shgsOZBPyuhsOratO7rJ3xTxRXMZCNHGi3BlHTvTr1IRjvbmNE7EziniHwudpPGZBBeWlyxbfc3xegrNzjZCPWZCFn5TyC1fZBZBp0h0', '2026-04-12', 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-11T21:33:05.000Z');

-- ─────────────────────────────── BUSINESS MANAGERS
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('rec6VClEuFbCOojLU', '425577304641019', 'Yogi''s Studio', 'not_verified', 'not_verified', NULL, NULL, NULL, '2026-02-13T16:39:42.120Z', 0, '2025-12-18T04:27:42.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('rec72aRaK6vcdbOpH', '578257188710161', 'Shop A3-Cetas Shipping and Logistics LLC.', 'verified', NULL, NULL, NULL, NULL, NULL, 0, '2025-12-18T04:27:38.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('recOaLTyCBLZ9Hsy5', '1431335941150598', 'Hamid Online Shoping', 'verified', 'verified', NULL, NULL, NULL, '2026-02-12T13:45:42.396Z', 0, '2025-12-16T17:06:09.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('recS7ROC7277QPriA', '1178541291057805', 'Procom 27', 'not_verified', 'not_verified', NULL, NULL, NULL, '2026-02-09T13:36:33.241Z', 0, '2026-02-09T13:33:38.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('recTvry4tfjC0WhRO', '338484523390122', 'Emko', 'not_verified', 'not_verified', NULL, NULL, NULL, '2026-02-13T16:40:01.165Z', 0, '2026-02-09T13:33:40.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('recbzIFxw20LQoNEQ', '544955652549533', 'ExiScale LLC', 'verified', NULL, NULL, NULL, NULL, NULL, 0, '2025-12-17T12:03:08.000Z');
INSERT OR IGNORE INTO business_managers (id, bm_fb_id, bm_name, bm_status, verification_status, system_user_id, system_user_token, system_user_created, last_synced, hidden, created_at) VALUES ('recpt91Fo9emLT3SI', '216808072240922', 'H 551', 'not_verified', 'not_verified', NULL, NULL, NULL, '2026-02-09T13:36:37.217Z', 0, '2026-02-09T13:33:41.000Z');

-- ─────────────────────────────── AD ACCOUNTS
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('rec1LgifmX9jRN2sF', '1199130311363254', 'AA 001', 'DISABLED', 'USD', 33866.92, 'Asia/Bangkok', NULL, 1, '2025-12-17T12:03:19.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('rec1aPtVPPDO4zFwd', '1733240568081812', 'ExiScale-UNLI-2154', 'ACTIVE', 'USD', 2.31, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:27.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('rec5V6XoFbPCMbXgc', '632375055812369', 'AA 009', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:12.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('rec6bLRcHM7oYJUYl', '734811845114135', 'ALPHA-9-1 [NEW]', 'DISABLED', 'USD', 84053.11, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:41.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recANRZI3w8e9dQSx', '1330910061815039', 'A3-02', 'ACTIVE', 'USD', 0, 'America/Los_Angeles', NULL, 0, '2025-12-18T04:27:41.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recBYHZpBCLrsAtj8', '1509036500128700', 'Babu 2', 'ACTIVE', 'USD', 0, 'Asia/Almaty', '2025-12-18T03:46:59.909Z', 0, '2025-12-16T17:06:12.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recCcKPHdSpcoTiSV', '25438494842467269', 'ExiScale-UNLI-2182', 'ACTIVE', 'USD', 3.06, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:35.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recD21Ee5JuPNsohw', '882057940343441', 'Used Acc 1', 'UNSETTLED', 'USD', 4246.79, 'America/Los_Angeles', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:38.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recDHhZwB3nlysqv0', '1393900635434566', 'A3 - 04', 'ACTIVE', 'USD', 0, 'America/Los_Angeles', NULL, 0, '2025-12-18T04:27:40.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recFWIKtYq1ljCktZ', '389517900652911', 'AA 002', 'ACTIVE', 'USD', 1200.52, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:18.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recGknOn3jo8JRsE0', '1325778845837538', 'Emko - 02', 'DISABLED', 'USD', 69125.69, 'Asia/Bangkok', '2026-02-11T21:31:17.674Z', 0, '2026-02-11T21:31:26.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recHVq4562waB3Zjl', '734811845114135', 'ALPHA-9-1 [NEW]', 'Disabled', 'USD', 84053.11, NULL, '2026-02-11T21:31:17.674Z', 0, '2026-02-11T21:31:22.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recIfFWnHsItrDZzC', '1363534231748426', 'ExiScale-UNLI-2112', 'ACTIVE', 'USD', 71157.23, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:30.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recJ17CmUEDiw4ej3', '877520208494177', 'ExiScale-UNLI-2161', 'ACTIVE', 'USD', 3.94, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:28.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recJliI221lGeOzn0', '4153506188232869', 'ExiScale-UNLI-2107', 'ACTIVE', 'USD', 7.16, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:29.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recJvHpqWxmqcrYBW', '743594851788418', 'Babu 4', 'ACTIVE', 'USD', 0, 'Asia/Almaty', '2025-12-18T03:46:59.909Z', 0, '2025-12-16T17:06:11.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recLF8YIhRJSkYwpU', '1325778845837538', 'Emko - 02', 'Disabled', 'USD', 69125.69, NULL, '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:36.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recMn1Cr3NYyPIe0r', '756996346460465', 'Used Acc 2', 'UNSETTLED', 'USD', 3207.51, 'America/Los_Angeles', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:38.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recNGu71a4X6nfdD2', '1383796753484664', 'ExiScale-UNLI-2152', 'UNSETTLED', 'USD', 5.24, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:34.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recOv8bMVHb0okw4E', '1557392835512173', 'ExiScale-UNLI-2098', 'ACTIVE', 'USD', 48575.96, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:31.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recP8M9OR4cvtNIMy', '2672679226415703', 'A3 - 03', 'ACTIVE', 'USD', 0, 'America/Los_Angeles', NULL, 0, '2025-12-18T04:27:40.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recR420JHq9RhYH6t', '2018236295407194', 'ExiScale-UNLI-2151', 'ACTIVE', 'USD', 15.94, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:32.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recRBbhTZWsyK95ho', '799999376063474', 'Shop A3', 'UNSETTLED', 'VND', 21105.81, 'Asia/Barnaul', NULL, 0, '2025-12-18T04:27:42.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recSKg8fTIQErloXf', '1432086421693305', 'A3 -01', 'DISABLED', 'USD', 2121.1, 'Asia/Bangkok', NULL, 0, '2025-12-18T04:27:41.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recT2jX61wSJab3Mn', '1421733505959835', 'ExiScale-UNLI-2111', 'ACTIVE', 'USD', 3.61, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:21.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recTMMhkv4xonVeZB', '798872541994883', 'GhostWing ALPHA-9-2', 'ACTIVE', 'USD', 946494.63, 'Asia/Bangkok', '2026-02-11T21:31:17.674Z', 0, '2026-02-11T21:31:23.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recV4C0Vp7x090NiM', '1000854347604009', 'CC-6', 'DISABLED', 'USD', 2455.17, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2025-12-18T04:27:44.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recWH5EdWjaxyPvyI', '1138755071785842', 'Babu 3', 'ACTIVE', 'USD', 0, 'Asia/Almaty', '2025-12-18T03:46:59.909Z', 0, '2025-12-16T17:06:12.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recX8t4amacRmZsV9', '1557518801881583', 'Emko - 03', 'DISABLED', 'USD', 5554.94, 'Asia/Bangkok', '2026-02-11T21:31:17.674Z', 0, '2026-02-11T21:31:25.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recYX0bKKt8oUWUK0', '741095432411665', 'USD 851736', 'DISABLED', 'USD', 658.34, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:24.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recZb2eO5xfA8xfLY', '1557518801881583', 'Emko - 03', 'Disabled', 'USD', 5554.94, NULL, '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:36.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recZbssOVwJpV4Npf', '798872541994883', 'GhostWing ALPHA-9-2', 'Active', 'USD', 946485.22, NULL, '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:42.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recaQ8toRnAPWVpNc', '1191457669626613', 'Babu 5', 'ACTIVE', 'USD', 0, 'Asia/Almaty', '2025-12-18T03:46:59.909Z', 0, '2025-12-16T17:06:11.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recbWhqFN1wpxOKjG', '982296410387124', 'AA 004', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:16.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('reccTnxF4xBBuzAZw', '695322652476236', 'Conta4', 'DISABLED', 'USD', 1462993.18, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:24.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recdWFTcVF3V3LtU0', '3457560641076134', 'ExiScale-UNLI-2114', 'ACTIVE', 'USD', 4.52, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:33.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recg4QLVXU2b9h9Dx', '807305138589197', 'Babu 1 (Do Not Use)', 'ACTIVE', 'USD', 156.31, 'Asia/Almaty', '2025-12-18T03:46:59.909Z', 0, '2025-12-16T17:06:12.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recjxQ08VcXON0th1', '3742104986049831', 'Emko - 01', 'ACTIVE', 'USD', 83.18, 'America/Los_Angeles', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:37.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('reckhQNqkHOi9bJEq', '1551874566097009', 'ExiScale-UNLI-2153', 'ACTIVE', 'USD', 70171.32, 'Asia/Bangkok', '2026-02-13T10:46:53.599Z', 0, '2026-02-11T21:31:32.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('reclrWhWSDotPMJTz', '1320264039121577', 'AA 007', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:13.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recmRDTpcvfgWbSs1', '475402618616689', 'AA 006', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:14.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recoYFVxElSSXwsct', '1150408229936830', 'AA 008', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:13.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recrSSKQTTgIgpU2J', '584208984329192', 'AA 005', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:15.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recvVfpTvDYTd5BcY', '454376351058985', 'AA 010', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:11.000Z');
INSERT OR IGNORE INTO ad_accounts (id, ad_acc_fb_id, ad_acc_name, ad_acc_status, currency, amount_spent, timezone, last_synced, hidden, created_at) VALUES ('recyCErTZMTGSpjek', '8170364213048341', 'AA 003', 'ACTIVE', 'USD', 0, 'Asia/Bangkok', NULL, 0, '2025-12-17T12:03:17.000Z');

-- ─────────────────────────────── PAGES
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('rec9uf5qgFNEI1ffF', '500098143184127', 'ExiScale Agency', 'Published', 'https://www.facebook.com/500098143184127', 59, NULL, 0, '2025-12-17T12:03:25.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recA618JKf4nsLQP0', '926073760580825', 'Positive Pulse Daily', 'Published', 'https://www.facebook.com/926073760580825', 157, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:15.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recAP7xIwQi3ZA9hc', '883934991474051', 'Shop Now', 'Published', 'https://www.facebook.com/883934991474051', 48, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:14.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recBVptP28Lw9ZY8K', '116467428211646', 'ExiScale Unlimited', 'Published', 'https://www.facebook.com/116467428211646', 32, NULL, 0, '2025-12-17T12:03:27.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recQSwlicPm7urpQh', '831138313424550', 'Shop Smart Today', 'Published', 'https://www.facebook.com/831138313424550', 242, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:15.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recQvB7ncmsJmssZe', '878991571967521', 'Good Vibes Only', 'Published', 'https://www.facebook.com/878991571967521', 4, '2026-02-13T10:46:53.599Z', 0, '2026-02-09T13:33:44.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recW7TEqgnDnutdyR', '160784313794925', 'Boutique Tendance', 'Published', 'https://www.facebook.com/160784313794925', 13, NULL, 0, '2025-12-17T12:03:26.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recf5ExtYDhIP14AQ', '900756833127143', 'AutoLaunch', 'Published', 'https://www.facebook.com/900756833127143', 0, NULL, 0, '2026-02-09T13:41:53.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recfqsjx9uwnPCpN8', '828982023635000', 'The Unstoppable FB Account Solution', 'Unpublished', 'https://www.facebook.com/828982023635000', 6, NULL, 0, '2025-12-17T12:03:24.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recjEdN7f78xM16cm', '951678434687172', 'Innovate Now', 'Published', 'https://www.facebook.com/951678434687172', 13, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:13.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recpBUFJtOxEXBQCp', '122093659736018581', 'ExiScale Unlims', 'Published', 'https://www.facebook.com/122093659736018581', 11, NULL, 0, '2025-12-17T12:03:28.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recr0ZpoKwrXjGOSs', '872856099244462', 'Click & Shop Today', 'Published', 'https://www.facebook.com/872856099244462', 34, '2026-02-13T10:46:53.599Z', 0, '2026-02-09T13:33:46.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recrjdLKygKYm17bH', '882273311638636', 'Click & Share Today', 'Published', 'https://www.facebook.com/882273311638636', 23, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:14.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recu0AVREQnOTOreT', '733512883189550', 'Share this to bring Good Luck', 'Published', 'https://www.facebook.com/733512883189550', 100, '2026-02-13T10:46:53.599Z', 0, '2025-12-16T17:06:15.000Z');
INSERT OR IGNORE INTO pages (id, page_fb_id, page_name, published, page_link, fan_count, last_synced, hidden, created_at) VALUES ('recxVe4HhFMMnUO4v', '574894965714211', 'ExiScale Advertising Experts', 'Published', 'https://www.facebook.com/574894965714211', 1, NULL, 0, '2025-12-17T12:03:24.000Z');

-- ─────────────────────────────── PIXELS
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('rec0J8RsKUvUTJcCp', '2437045530022600', 'The Miracle Cushion', 'Yes', '2026-02-11T12:49:24.000Z', NULL, 0, '2025-12-18T04:27:48.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('rec22MKA9eJYb6cz4', '4288650691367446', 'GentleCut', 'Yes', '2026-02-02T10:53:43.000Z', NULL, 0, '2025-12-18T04:27:50.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('rec4fyrA2WKwoTddP', '1791732014919130', 'Test', 'Yes', NULL, NULL, 0, '2025-12-17T12:03:20.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('rec9SHJt1bjdrU6qP', '493125080289626', 'Hyros Conversions Pixel', 'Yes', '2025-12-17T11:53:08.000Z', NULL, 0, '2025-12-17T12:03:21.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recCYe3IrS3CBX6Kh', '3192525657591882', 'SleepFlex', 'Yes', '2026-02-01T22:23:24.000Z', NULL, 0, '2025-12-18T04:27:48.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recFWS9qEAJFi4m8a', '1791185378427618', 'Regrovix', 'Yes', '2026-02-12T08:28:40.000Z', NULL, 0, '2025-12-18T04:27:46.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recGpiYVfO5KwDNoy', '1736660510374294', 'GlowGuard', 'Yes', '2026-02-02T08:51:22.000Z', NULL, 0, '2025-12-18T04:27:49.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recNVEGc1d6amiGHS', '1126731536104397', 'RedRemedy', 'Yes', '2026-02-02T10:38:49.000Z', NULL, 0, '2025-12-18T04:27:49.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recT9DFgvzCijrQcM', '1658263008373801', 'test 2', 'Yes', NULL, NULL, 0, '2025-12-17T12:03:21.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recYPVAh2jimJYVMb', '1113704979928911', 'test 1', 'Yes', NULL, NULL, 0, '2025-12-17T12:03:22.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recaMT1MY523SuNPN', '616218774850544', 'VitalTac', 'Yes', '2026-02-12T13:37:40.000Z', NULL, 0, '2025-12-18T04:27:45.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('reclXFRQsqzpKYOkh', '940770095293101', 'VitaPulse™', 'Yes', '2026-02-10T18:53:17.000Z', NULL, 0, '2025-12-18T04:27:46.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recnzvqlHXnlSlN9z', '1614792226571402', 'FungiEase', 'Yes', '2026-02-07T21:48:10.000Z', NULL, 0, '2025-12-18T04:27:47.000Z');
INSERT OR IGNORE INTO pixels (id, pixel_fb_id, pixel_name, available, last_fired_time, last_synced, hidden, created_at) VALUES ('recw9tXmyklFCE84E', '683251211069586', 'JointZen™', 'Yes', '2026-02-02T07:05:02.000Z', NULL, 0, '2025-12-18T04:27:47.000Z');

-- ─────────────────────────────── PROFILE ↔ BM
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recLMEyZCvOH8cO8Y', 'recOaLTyCBLZ9Hsy5');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recLMEyZCvOH8cO8Y', 'recS7ROC7277QPriA');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recLMEyZCvOH8cO8Y', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recLMEyZCvOH8cO8Y', 'recTvry4tfjC0WhRO');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recLMEyZCvOH8cO8Y', 'recpt91Fo9emLT3SI');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recPxxUawdPalMABK', 'recOaLTyCBLZ9Hsy5');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recPxxUawdPalMABK', 'rec72aRaK6vcdbOpH');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recPxxUawdPalMABK', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recrNAkwxspuzyrKS', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('recrNAkwxspuzyrKS', 'recTvry4tfjC0WhRO');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('reczLxjVH8Zf44gbQ', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO profile_bms (profile_id, bm_id) VALUES ('reczLxjVH8Zf44gbQ', 'recTvry4tfjC0WhRO');

-- ─────────────────────────────── PROFILE ↔ PAGE
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recA618JKf4nsLQP0');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recA618JKf4nsLQP0');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recA618JKf4nsLQP0');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recA618JKf4nsLQP0');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recA618JKf4nsLQP0');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recAP7xIwQi3ZA9hc');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recAP7xIwQi3ZA9hc');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recAP7xIwQi3ZA9hc');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recAP7xIwQi3ZA9hc');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recAP7xIwQi3ZA9hc');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recQSwlicPm7urpQh');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recQSwlicPm7urpQh');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recQSwlicPm7urpQh');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recQSwlicPm7urpQh');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recQSwlicPm7urpQh');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recQvB7ncmsJmssZe');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recQvB7ncmsJmssZe');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recQvB7ncmsJmssZe');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recQvB7ncmsJmssZe');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recf5ExtYDhIP14AQ');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recjEdN7f78xM16cm');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recjEdN7f78xM16cm');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recjEdN7f78xM16cm');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recjEdN7f78xM16cm');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recjEdN7f78xM16cm');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recr0ZpoKwrXjGOSs');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recr0ZpoKwrXjGOSs');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recr0ZpoKwrXjGOSs');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recr0ZpoKwrXjGOSs');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recrjdLKygKYm17bH');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recrjdLKygKYm17bH');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recrjdLKygKYm17bH');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recrjdLKygKYm17bH');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recrjdLKygKYm17bH');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recPxxUawdPalMABK', 'recu0AVREQnOTOreT');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recLMEyZCvOH8cO8Y', 'recu0AVREQnOTOreT');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recrNAkwxspuzyrKS', 'recu0AVREQnOTOreT');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('reczLxjVH8Zf44gbQ', 'recu0AVREQnOTOreT');
INSERT OR IGNORE INTO profile_pages (profile_id, page_id) VALUES ('recwFAPmY1etXtsPZ', 'recu0AVREQnOTOreT');

-- ─────────────────────────────── BM ↔ AD ACCOUNT
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recV4C0Vp7x090NiM');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recT2jX61wSJab3Mn');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recHVq4562waB3Zjl');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recTMMhkv4xonVeZB');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'reccTnxF4xBBuzAZw');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recYX0bKKt8oUWUK0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recX8t4amacRmZsV9');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recGknOn3jo8JRsE0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'rec1aPtVPPDO4zFwd');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recJ17CmUEDiw4ej3');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recJliI221lGeOzn0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recIfFWnHsItrDZzC');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recOv8bMVHb0okw4E');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'reckhQNqkHOi9bJEq');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recR420JHq9RhYH6t');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recdWFTcVF3V3LtU0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recNGu71a4X6nfdD2');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recCcKPHdSpcoTiSV');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'rec6bLRcHM7oYJUYl');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recZbssOVwJpV4Npf');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recZb2eO5xfA8xfLY');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec6VClEuFbCOojLU', 'recLF8YIhRJSkYwpU');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec72aRaK6vcdbOpH', 'recP8M9OR4cvtNIMy');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec72aRaK6vcdbOpH', 'recDHhZwB3nlysqv0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec72aRaK6vcdbOpH', 'recANRZI3w8e9dQSx');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec72aRaK6vcdbOpH', 'recSKg8fTIQErloXf');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('rec72aRaK6vcdbOpH', 'recRBbhTZWsyK95ho');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recOaLTyCBLZ9Hsy5', 'recaQ8toRnAPWVpNc');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recOaLTyCBLZ9Hsy5', 'recJvHpqWxmqcrYBW');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recOaLTyCBLZ9Hsy5', 'recWH5EdWjaxyPvyI');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recOaLTyCBLZ9Hsy5', 'recBYHZpBCLrsAtj8');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recOaLTyCBLZ9Hsy5', 'recg4QLVXU2b9h9Dx');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recZb2eO5xfA8xfLY');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recLF8YIhRJSkYwpU');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recjxQ08VcXON0th1');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recMn1Cr3NYyPIe0r');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recD21Ee5JuPNsohw');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recV4C0Vp7x090NiM');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'rec6bLRcHM7oYJUYl');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recZbssOVwJpV4Npf');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recX8t4amacRmZsV9');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recGknOn3jo8JRsE0');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recTvry4tfjC0WhRO', 'recTMMhkv4xonVeZB');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recvVfpTvDYTd5BcY');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'rec5V6XoFbPCMbXgc');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recoYFVxElSSXwsct');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'reclrWhWSDotPMJTz');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recmRDTpcvfgWbSs1');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recrSSKQTTgIgpU2J');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recbWhqFN1wpxOKjG');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recyCErTZMTGSpjek');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'recFWIKtYq1ljCktZ');
INSERT OR IGNORE INTO bm_ad_accounts (bm_id, ad_account_id) VALUES ('recbzIFxw20LQoNEQ', 'rec1LgifmX9jRN2sF');

-- ─────────────────────────────── BM ↔ PIXEL (member)
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recaMT1MY523SuNPN');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'reclXFRQsqzpKYOkh');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recFWS9qEAJFi4m8a');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recnzvqlHXnlSlN9z');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recw9tXmyklFCE84E');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'rec0J8RsKUvUTJcCp');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recCYe3IrS3CBX6Kh');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recNVEGc1d6amiGHS');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'recGpiYVfO5KwDNoy');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('rec6VClEuFbCOojLU', 'rec22MKA9eJYb6cz4');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('recbzIFxw20LQoNEQ', 'rec4fyrA2WKwoTddP');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('recbzIFxw20LQoNEQ', 'recT9DFgvzCijrQcM');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('recbzIFxw20LQoNEQ', 'rec9SHJt1bjdrU6qP');
INSERT OR IGNORE INTO bm_pixels (bm_id, pixel_id) VALUES ('recbzIFxw20LQoNEQ', 'recYPVAh2jimJYVMb');

-- ─────────────────────────────── PIXEL ↔ OWNER BM
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('rec0J8RsKUvUTJcCp', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('rec22MKA9eJYb6cz4', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('rec4fyrA2WKwoTddP', 'recbzIFxw20LQoNEQ');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('rec9SHJt1bjdrU6qP', 'recbzIFxw20LQoNEQ');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recCYe3IrS3CBX6Kh', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recFWS9qEAJFi4m8a', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recGpiYVfO5KwDNoy', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recNVEGc1d6amiGHS', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recT9DFgvzCijrQcM', 'recbzIFxw20LQoNEQ');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recYPVAh2jimJYVMb', 'recbzIFxw20LQoNEQ');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recaMT1MY523SuNPN', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('reclXFRQsqzpKYOkh', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recnzvqlHXnlSlN9z', 'rec6VClEuFbCOojLU');
INSERT OR IGNORE INTO pixel_owner_bms (pixel_id, bm_id) VALUES ('recw9tXmyklFCE84E', 'rec6VClEuFbCOojLU');

-- ─────────────────────────────── AD PRESETS
INSERT OR IGNORE INTO ad_presets (id, preset_name, product_id, primary_text_1, primary_text_2, primary_text_3, primary_text_4, primary_text_5, headline_1, headline_2, headline_3, headline_4, headline_5, description_1, description_2, description_3, description_4, description_5, call_to_action, beneficiary_name, payer_name, created_at) VALUES ('rec50ItYdszwgRlnN', 'GhostWing - Default', 'recMS4kpPubp6bHyu', '🚁 Loving My Amazing Military-Grade Drone! Absolute Game-Changer! 🚁
Incredible tactical stealth tech we can finally own - flies perfectly every time!
Silent operation, gorgeous 4K footage, and virtually indestructible. 📸
This brilliant drone revolutionized my photography instantly! 💯
Get yours while they''re still 50% OFF 👉 {{link}}', '🔥 Obsessed With My Incredible GhostWing Drone! Best Purchase Ever! 🔥
This extraordinary military tech completely transformed my videos overnight!
Unbelievably stable, incredibly silent, and captures breathtaking footage effortlessly. 
Thrilled beyond words with every flight! 📸
Join thousands of delighted pilots today 👉 {{link}}', '💫 Revolutionary Flight Technology Just Released! 💫
Finally received my GhostWing and can''t believe what this drone can do. 💯
3x longer battery life than comparable models, built to withstand crashes, and so easy to use. 
Absolutely worth every penny! ⭐
Secure yours at an incredible 50% discount 👉 {{link}}', '⚡ The Most Advanced Drone Ever Made? (See Why Everyone''s Talking About It) ⚡
Everyone needs to see the stunning footage this military-grade tech can capture! 📸
Love how stable it is, love how quiet it is, love everything about it. 🚁
Best tech purchase I''ve made in years! 🚀
Get yours before prices go back up 👉 {{link}}', '🌟 Own Tactical-Grade Flight Technology (While Stock Lasts) 🌟
Can''t believe how incredible this stealth drone is - completely exceeded my expectations!
Perfect size, amazing stability, and built to military specifications. 
So happy I found this game-changing drone! 📱
Join thousands of satisfied flyers today 👉 {{link}}', 'This Military Drone Is Incredible (Wait Till You See The Footage It Captures)', 'The "Ghost Drone" Everyone''s Talking About (Amazing Stability)', 'Special Forces Tech Just Went Public (And It Flies Better Than They Say)', 'This Tactical Drone Changes Everything (See Why It''s Selling Out)', 'The Most Advanced Drone Ever Made (And It Fits In Your Pocket)', 'Capture breathtaking aerial footage like never before with this incredible military drone (You won''t believe your eyes)', 'The tactical stealth drone that''s changing how people think about aerial photography forever', 'Finally, military-grade stability that fits in your pocket (This thing is extraordinary)', 'Meet the silent drone that''s so advanced professionals are switching - now available to everyone', 'The pocket-sized powerhouse that''s making regular consumer drones obsolete', 'Learn More', 'Online Marketing', 'Online Marketing', '2026-01-02T17:16:34.000Z');
INSERT OR IGNORE INTO ad_presets (id, preset_name, product_id, primary_text_1, primary_text_2, primary_text_3, primary_text_4, primary_text_5, headline_1, headline_2, headline_3, headline_4, headline_5, description_1, description_2, description_3, description_4, description_5, call_to_action, beneficiary_name, payer_name, created_at) VALUES ('recgllfhwD5dOoTwP', 'VitalTac - Default', 'rec3cJmt5H4AENEgZ', '🔦 1 Brilliant Tool to Keep You Confident and Prepared (See This)
This next-level flashlight—once reserved for professional use—is now available to anyone who wants powerful, reliable lighting.
Perfect for camping, outdoor adventures, and keeping your home ready during unexpected moments. Crafted with tough aerospace-grade materials and celebrated by 97,000+ happy customers! ⭐⭐⭐⭐⭐
A special introductory offer is live right now—great time to pick one up.
👉 Take a look here: {{link}}', '💡 A Simple, Affordable Way to Get Reliable Emergency Lighting (Amazing Solution)
Now available for everyday families, this impressive professional-grade flashlight delivers powerful, long-lasting light whenever you need it most. It can illuminate up to 2 miles, runs up to 12 hours on a single charge, and is built with durable materials designed to last for years.
✅ Great for outages and emergencies
✅ Ultra-strong titanium construction
✅ Easy USB rechargeable design
✅ 30-day satisfaction guarantee
Thousands of families are already enjoying the extra confidence and peace of mind it provides!
👉 Learn more: {{link}}', '🏆 A Simple Way to Boost Your Emergency Preparedness Before Storm Season
 Great timing—this impressive, high-performance flashlight is now available and families are loving how it helps them feel safe and ready for anything.
Why it’s a favorite:
 🔦 Exceptional brightness and long-range visibility
 🔦 Up to 12 hours of dependable power
 🔦 Waterproof, durable design
 🔦 Ideal for any emergency or outdoor situation
With 97,000+ happy customers and limited-time pricing, it’s a smart upgrade for peace of mind.
 👉 Grab yours: {{link}}', '🎯 Special Forces Veteran Highlights a Flashlight Families Are Loving for Everyday Safety
Now that a once-restricted patent has opened to the public, this powerful, professional-grade flashlight is finally available for anyone who wants reliable lighting and added peace of mind at home or outdoors.
Customers are raving about it for:
✅ Emergency readiness
✅ Camping & weekend adventures
✅ Home safety and nightly use
✅ Long-lasting, dependable performance
With a 4.8/5 rating and 97,000+ happy reviews, it’s quickly becoming a household favorite! 🌟
👉 See why everyone’s talking about it: {{link}}', NULL, 'How to Light Up Targets 2 Miles Away Without Expensive Gear (Try This Now)', 'Wave Goodbye to Weak Flashlights With This 1 Powerful Military Tool', 'Better Than Any Flashlight - Start Fires in 10 Seconds With This Device', 'If You Own a Flashlight, You Need To See This Immediately', 'People Are Freaking Out Over This Flashlight That Can Start Fires', 'A breakthrough tactical beam lets you illuminate objects over 2 miles away using a compact, budget-friendly device.', 'This military-grade flashlight blasts a razor-sharp beam that makes ordinary flashlights look like toys.', 'A next-gen tactical torch delivers extreme brightness and emergency fire-starting power in seconds.', 'A revolutionary tactical upgrade outshines, outlasts, and outperforms every flashlight most people currently own.', 'This viral military-inspired flashlight is shocking users with its intense beam and emergency fire-starting capability.', 'Learn More', 'Online Marketing', 'Online MarketingA', '2025-12-25T17:36:38.000Z');
INSERT OR IGNORE INTO ad_presets (id, preset_name, product_id, primary_text_1, primary_text_2, primary_text_3, primary_text_4, primary_text_5, headline_1, headline_2, headline_3, headline_4, headline_5, description_1, description_2, description_3, description_4, description_5, call_to_action, beneficiary_name, payer_name, created_at) VALUES ('recxJ0tkvlTOsCpNe', 'VitalTac - Clone', 'rec3cJmt5H4AENEgZ', '🔦 1 Brilliant Tool to Keep You Confident and Prepared (See This)
This next-level flashlight—once reserved for professional use—is now available to anyone who wants powerful, reliable lighting.
Perfect for camping, outdoor adventures, and keeping your home ready during unexpected moments. Crafted with tough aerospace-grade materials and celebrated by 97,000+ happy customers! ⭐⭐⭐⭐⭐
A special introductory offer is live right now—great time to pick one up.
👉 Take a look here: {{link}}', '💡 A Simple, Affordable Way to Get Reliable Emergency Lighting (Amazing Solution)
Now available for everyday families, this impressive professional-grade flashlight delivers powerful, long-lasting light whenever you need it most. It can illuminate up to 2 miles, runs up to 12 hours on a single charge, and is built with durable materials designed to last for years.
✅ Great for outages and emergencies
✅ Ultra-strong titanium construction
✅ Easy USB rechargeable design
✅ 30-day satisfaction guarantee
Thousands of families are already enjoying the extra confidence and peace of mind it provides!
👉 Learn more: {{link}}', '🏆 A Simple Way to Boost Your Emergency Preparedness Before Storm Season
 Great timing—this impressive, high-performance flashlight is now available and families are loving how it helps them feel safe and ready for anything.
Why it’s a favorite:
 🔦 Exceptional brightness and long-range visibility
 🔦 Up to 12 hours of dependable power
 🔦 Waterproof, durable design
 🔦 Ideal for any emergency or outdoor situation
With 97,000+ happy customers and limited-time pricing, it’s a smart upgrade for peace of mind.
 👉 Grab yours: {{link}}', '🎯 Special Forces Veteran Highlights a Flashlight Families Are Loving for Everyday Safety
Now that a once-restricted patent has opened to the public, this powerful, professional-grade flashlight is finally available for anyone who wants reliable lighting and added peace of mind at home or outdoors.
Customers are raving about it for:
✅ Emergency readiness
✅ Camping & weekend adventures
✅ Home safety and nightly use
✅ Long-lasting, dependable performance
With a 4.8/5 rating and 97,000+ happy reviews, it’s quickly becoming a household favorite! 🌟
👉 See why everyone’s talking about it: {{link}}', NULL, 'How to Light Up Targets 2 Miles Away Without Expensive Gear (Try This Now)', 'Wave Goodbye to Weak Flashlights With This 1 Powerful Military Tool', 'Better Than Any Flashlight - Start Fires in 10 Seconds With This Device', 'If You Own a Flashlight, You Need To See This Immediately', 'People Are Freaking Out Over This Flashlight That Can Start Fires', 'A breakthrough tactical beam lets you illuminate objects over 2 miles away using a compact, budget-friendly device.', 'This military-grade flashlight blasts a razor-sharp beam that makes ordinary flashlights look like toys.', 'A next-gen tactical torch delivers extreme brightness and emergency fire-starting power in seconds.', 'A revolutionary tactical upgrade outshines, outlasts, and outperforms every flashlight most people currently own.', 'This viral military-inspired flashlight is shocking users with its intense beam and emergency fire-starting capability.', 'Learn More', 'Online Marketing', 'Online MarketingA', '2026-01-14T06:57:23.000Z');

-- ─────────────────────────────── VIDEO SCRIPTS
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec0Yss8mAz7yQc01', 'GhostWing - Script 1013 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'The world is getting dangerous. You need eyes in the sky. But you don''t need to spend thousands on professional surveillance equipment. You just need the GhostWing. This is the new ninety-nine dollar military drone that is changing home security forever. It was created by Captain Adam Scott, a US Army engineer. He developed it for Special Forces missions in the Middle East. They needed to spot threats from miles away without being seen or heard. Adam used a classified "MOT" Optical Technology that captures 4K video from high altitude. It was a game-changer for the military. And now, Adam has declassified it for the American public. This isn''t just a toy. This is a tactical tool. It fits in your pocket, but it deploys in seconds. Send it up to check your property lines. Inspect your roof. Check on your livestock. See what is happening down the road without ever leaving your porch. It is silent. It is fast. And because it was built for the battlefield, it is tough as nails. It uses military nanotechnology to withstand freezing cold and scorching heat. It is completely waterproof. Adam wrote the software to be fail-safe. It has collision detection and an auto-return GPS system. You cannot lose this drone. When the survival and security communities found out about this, they bought the entire stock in forty-eight hours. They know a bargain when they see one. But Adam wants every American home to be secure. So he has tripled production and authorized a fifty percent discount for orders placed today. This is the cheapest insurance policy you will ever buy. But the inventory is disappearing fast. Do not wait until you need it. Get it now. Click the link below to secure your GhostWing at half price.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1013, '2025-12-18T22:07:25.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec1CPxmog7skSU6c', 'VitalTac - Script 1076 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'After 22 years in law enforcement, I stopped keeping my service weapon by the bed.

My wife thought I''d lost my mind. But I''d spent two decades responding to home invasions, and I knew something most people don''t: in the dark, at 2 AM, when your heart''s pounding and your hands are shaking, a gun creates as many problems as it solves.

You have to find it. Load it if it''s not loaded. Disengage the safety. Aim at something you can barely see. Pray you don''t hit your kid walking to the bathroom.

That''s a lot of steps when you have 8 seconds.

Now I reach for something different. Something that ends the threat instantly without a single bullet.

This is VitalTac — a tactical flashlight originally designed for American Special Forces conducting close-quarters combat in zero visibility. Military-grade Cree LEDs producing 20 times the output of commercial lights. A beam that reaches 2 miles. Concentrated intensity that can start fires from pure light alone.

At close range — like a hallway, like a staircase, like a bedroom doorway — it completely overwhelms human vision. The intruder can''t see. Can''t orient. Can''t advance. They''re done. And nobody had to make a split-second life-or-death decision about pulling a trigger.

I''ve seen the aftermath of both scenarios. The homeowner who fired and hit the intruder — and then spent three years in court proving it was justified. The homeowner who fired and missed — and created a hole that went through drywall into his daughter''s room.

And the homeowner with a tactical light. Intruder on the ground. Cops cuff him. Paperwork takes 20 minutes. Everyone goes home.

This technology was restricted to military use for years. Then a Special Forces operator who''d carried this exact light on three combat tours came home, looked at his sleeping kids, and realized American families deserved the same protection.

The military''s lawyers told him the design was classified. So he rebuilt it. Same aerospace-grade titanium — the same alloy on F-35 fighter jets. Same blinding capability. Same indestructible construction. Just modified enough to be 100% legal for civilian ownership.

He calls it VitalTac. And I''ve put it through every test I can imagine.

Dropped it on concrete from six feet. Works perfectly. Submerged it in water for an hour. Works perfectly. Left it in my truck through an Arizona summer — 140 degrees inside that cab. Works perfectly.

The strobe function is the same pattern SWAT teams use during breaches. In a dark room, it''s impossible to look at. The SOS mode can signal rescue teams from miles away.

And the body''s solid enough to use as a striking weapon if someone gets close.

But here''s what concerns me. The US Product Safety Commission wants to reclassify this as military-grade equipment. When that regulation passes — and people I trust say it''s coming soon — no more civilian sales. It''s already banned from Amazon and eBay. The only place left is the official website.

Today, they''re offering 50% off.

Look, I carried a firearm for 22 years. I''m not anti-gun. But I''m also realistic about what happens in the dark when you''re half-asleep and terrified. You need something that works the instant you grab it. Something that doesn''t require aim, doesn''t require decisions, doesn''t create legal nightmares.

VitalTac is what I reach for now. It''s what I bought for my son when he got his own place. It''s what I tell everyone I know.

Click the link below. This isn''t about being paranoid. It''s about being ready.

Because the next time you hear a noise downstairs, you''re either going to respond with something effective — or you''re going to lie there hoping it''s nothing.

Make sure you never have to hope. Click now.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1076, '2026-02-20T11:44:42.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec1OFdUp8bqpBnnR', 'VitalTac - Script 1078 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'I thought my husband was being dramatic. Then someone tried our back door at 3 AM.

For months, I''d rolled my eyes at his "tactical flashlight." Six hundred dollars for something to see in the dark? We have phones. We have lamps. We have the porch light. What were we preparing for, a blackout on Mars?

Then three weeks ago, I woke up to a sound I''ll never forget. The squeak of our screen door. The rattle of someone testing the handle.

My husband was already out of bed. No panic. No fumbling. He grabbed that flashlight from his nightstand and moved to the hallway.

I heard a click. Then a scream.

Not from my husband. From outside.

By the time I got to the window, a man was stumbling across our lawn with his hands over his face. He hit our fence, fell over it, and disappeared.

My husband hadn''t fired a shot. Hadn''t thrown a punch. He''d just pointed a light.

That''s when I finally understood.

VitalTac isn''t a flashlight. It''s what American Special Forces carry into combat — a tactical light so powerful it was classified for years. Military-grade LEDs producing 20 times the brightness of commercial lights. A beam that reaches 2 miles. Intensity concentrated enough to start fires.

At close range, it''s not illumination. It''s a weapon. It completely overwhelms human vision. The intruder couldn''t see, couldn''t orient, couldn''t do anything but run.

And my husband never put our family at legal risk, never risked a bullet going through a wall, never had to make a split-second decision about taking a life.

He just pressed a button.

I''ve learned the story now — how a Special Forces veteran came home and decided to rebuild this technology for families like ours. How the military sent lawyers. How he modified the design just enough to make it legal while keeping every tactical capability intact.

I''ve seen the construction — aircraft-grade titanium, the same material on fighter jets. I''ve watched him demonstrate it: lighting up our entire yard, hitting the strobe that made me look away from 40 feet, using the concentrated beam to start a fire with dry leaves in seconds.

I''ve dropped it myself. It doesn''t break. I''ve left it in the car through summer heat. It works perfectly. This thing is built for moments when failure isn''t an option.

But what I really understood was what he said after that night.

"I had eight seconds. From the sound to him being at our door. Eight seconds with you and the kids upstairs."

Eight seconds.

In eight seconds, you can''t unlock a gun safe, load a weapon, identify your target, and fire accurately. But you can grab something from your nightstand and press a button.

That''s the difference.

Now here''s what worries me. The US Product Safety Commission is working to classify VitalTac as military equipment. When that happens, civilians can''t buy it anymore. Amazon already banned it. eBay too. The only place left is the official website, and right now they''re running 50% off.

I don''t know how long that lasts.

If you''re reading this, if you''ve got kids sleeping upstairs, if you''ve ever woken up to a noise and felt your heart stop — I was you. I thought this was overkill. I thought we were safe enough.

We weren''t. And neither are you.

Click the link below. Get one for your nightstand. Get one for your partner''s side too.

Because eight seconds isn''t enough time to regret not being ready.

Click now.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1078, '2026-02-20T11:44:43.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec1Su2RWsUPCtQQ4', 'GhostWing - Script 1054 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'ADT charges $50 a month to watch your house — that''s $600 a year for cameras that can''t even see past your driveway. This $99 military drone covers your entire property from the sky in crystal clear 4K with no monthly fees, no contract, and you own it forever. It was created for the US Special Forces by Captain Adam Scott, a 44-year-old Army officer and top engineer. He and his team were assigned to develop classified optical equipment for a critical mission in the Middle East. The mission required them to spot enemy positions from miles away without being detected. After months of development, they created a prototype the military called the most successful invention in years. It was the first to ever use the patented MOT military optical technology, meaning it''s at least 20 times more powerful than any drone on the market. 4K video so sharp you can read a license plate from 200 feet up. When Captain Scott saw what this technology could do, he knew everyday Americans needed it for their own protection. He secured all permissions to rebuild it for the public and called it GhostWing. The military paid over $400 for this same technology. GhostWing starts at $99. Captain Scott developed his own software that boosts the drone''s power and control by 120 percent. You press one button and it goes up. Collision detection stops it from hitting anything. The GPS tracks within 900 meters and flies it home if the battery gets low. It''s 73 percent quieter than other drones, which means if someone is on your property, they won''t hear it coming. You see them. They don''t see you. It flies for 15 minutes and covers a 2.7-mile range. That''s your entire neighborhood. The carbon-polymer frame survived a 30-foot drop test and handles 25 times more impact than regular drones. Completely waterproof. Works in rain, snow, heat, anything. Folds smaller than a water bottle. Check your backyard before bed. See who just pulled into your driveway. Keep an eye on your property while you''re away visiting the grandkids. When Captain Scott first launched GhostWing, it spread like wildfire. It sold out within 48 hours with a waitlist of over 10,000 orders. It''s now got 15,000 five-star reviews with a 4.9 rating. Homeowners and retirees across the country have switched from expensive security subscriptions to this. Captain Scott has tripled production and is offering 50 percent off for anyone who orders within the next 24 hours. You save even more when you order multiple units, making it a perfect gift for a neighbor who lives alone or a family member you worry about. There''s a 90-day money-back guarantee so there''s zero risk. My advice, grab one for yourself and a couple more for the people you want to keep safe. Click on the link below this video to visit the official website and order with 50 percent off.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1054, '2026-02-10T06:02:47.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec284NBm6Zp78sK8', 'GhostWing - Script 1031 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'he Pentagon did not want you to see this drone technology. And what happened next proves exactly why.

For over a decade the US military kept a specific type of optical system classified. It was developed by a man named Captain Adam Scott for one purpose. To give our Special Forces the ability to photograph enemy targets from distances that seemed physically impossible. The results were so accurate that commanders started calling it the eye of God.

But classified technology does not stay classified forever.

When Captain Scott retired after serving his country for twenty-two years, he walked away with something the military could not take back. The knowledge inside his head. Every algorithm. Every engineering principle. Every breakthrough that made his optical system the most advanced in the world.

Six months later he unveiled something called GhostWing. And the big drone companies have been trying to figure out how to compete with it ever since.

Here is what makes GhostWing different from every other drone on the market.

It uses MOT military optical technology. This is not marketing speak. This is the actual foundation of what Captain Scott built for combat reconnaissance. The same system that captured images clear enough to identify faces from over five thousand feet away.

He adapted it for civilian use without sacrificing the core capability. We are talking about four-K video quality that makes everything you see on social media look like it was shot through a dirty window.

The stabilization system came directly from Apache helicopter technology. Four years of development went into making sure your footage stays smooth no matter how windy it gets or how shaky your hands are.

But the part that really scares the competition is the price.

Other drones with even close to this capability cost eight hundred dollars. A thousand dollars. Some run over two thousand. Captain Scott priced the GhostWing at ninety-nine dollars because he wanted regular Americans to have access to what he built.

He figured the people who sent him overseas to defend this country deserved to benefit from what he created there.

The GhostWing includes features that would cost extra on any other drone. Automatic collision detection that prevents crashes. GPS return that brings it home if the signal drops. Follow Me mode that tracks your movement and captures footage without you touching a single button. Complete waterproofing that lets it fly in conditions that would destroy consumer drones.

When it first launched the response was overwhelming. Sold out in forty-eight hours. Over ten thousand people on the waiting list. Videos shot with GhostWing started going viral on social media. Professional photographers began switching from equipment that cost twenty times as much.

Captain Scott has finally restocked and he wants to get GhostWing into as many American hands as possible. For the next twenty-four hours he is offering fifty percent off. Buy more than one and the discounts stack even higher.

This is military technology adapted for people who want to capture memories, monitor their property, or simply experience what it feels like to see the world from above. Click the link below this video now to visit the official GhostWing website and claim your discount before inventory runs out again.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1031, '2026-01-18T08:41:58.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec2HhScKjARzWHJ3', 'GhostWing - Script 1039 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'I can barely answer my smartphone, but I just shot professional drone footage that made my daughter cry. This $99 military drone flies itself with one button—and the big drone companies don''t want you to know it exists.

Let me tell you how a 73-year-old man who still uses a flip phone ended up with US Special Forces technology.

GhostWing was created specifically for the Special Forces by Captain Adam Scott, a 44-year-old US Army officer and lead engineer. He and his team were assigned to develop cutting-edge optical equipment for a critical mission in the Middle East. The mission required capturing enemy positions from miles away without ever being detected.

After months of intense research and development, they created a groundbreaking prototype. The results were incredible. It was celebrated as the most successful military invention in recent years. It was the first to ever use the patented MOT military optical technology, meaning it''s at least 20 times more powerful than any commercially available drone.

It can literally capture anything from miles away with stunning 4K quality.

When Adam retired, he realized something important. Most people who want a drone aren''t 20-year-old video game experts. They''re grandparents like me who just want to capture family moments without crashing expensive equipment into trees.

So he rebuilt his military technology with one-button operation. He called it GhostWing.

I pushed one button to launch it. One button to make it follow my grandkids around the backyard. One button to land it. That''s it. My 6-year-old granddaughter was flying it by herself on her second try.

Adam developed software that increases the drone''s power and control by 120%, making it so easy that literally anyone can use it. The "Follow Me" feature captures amazing videos without you touching the controller. GPS tracks within 900 meters and brings it back automatically if signal drops or battery gets low.

The collision detection prevents any crash or damage—I''ve never even come close to hitting anything. It''s completely waterproof and handles freezing cold and scorching heat.

At my grandson''s birthday, I tapped Follow Me and let it work for 45 minutes. The three-legged race. The water balloon fight. Tommy opening presents. My daughter watched the footage and started crying. Said it looked like we hired a Hollywood film crew.

Cost me less than what I used to pay for disposable cameras and developing at the drugstore.

When GhostWing launched, it spread like wildfire in the military community. It sold out within 48 hours and developed a waitlist of over 10,000 orders. Professional photographers have made the switch because the quality rivals equipment costing 15 times as much.

Adam has tripled production and is offering a 50% discount for anyone who orders within the next 24 hours. You can get even deeper discounts by ordering multiple GhostWings, making it a perfect gift.

My advice: grab one for yourself and a few more for your friends and family. Take it from someone who thought he was too old for this. Click on the link below this video to visit the official website and order with 50% off.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1039, '2026-01-18T08:57:50.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec2Q1L5YW5ZVDlhm', 'GhostWing - Script 1084 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'A 68-year-old grandmother flew a military drone on her very first try. No manual. No help. She pressed one button and it flew. That''s the story no big drone company wants you to hear. Because in the six months since, fifteen thousand people have done the exact same thing — and every single one rated it five stars.

Because here''s what they don''t tell you. There are millions of drones sitting in closets right now. Expensive ones. Three hundred, five hundred, eight hundred dollar machines bought with excitement and abandoned after one weekend. You charged it up, opened an app with forty icons and no labels, watched it drift sideways into a tree, and felt like an idiot. Maybe you spent a whole Saturday on YouTube trying to learn. But every tutorial is some 22-year-old kid flying at ninety miles an hour through a parking garage, and none of it applies to you. You asked your grandson for help and he got it in the air for ten minutes, then went home and took the knowledge with him. DJI''s app looks like an airplane cockpit. The cheap ones from the internet flip upside down and die in the grass. And after all that money and frustration, you told yourself drones just aren''t for people like you. That was never true. You didn''t fail. Every drone you tried failed you.

The device that changed everything was never designed for consumers at all. Captain Adam Scott, a 44-year-old US Army officer and lead engineer, was assigned to develop cutting-edge optical equipment for a critical Special Forces mission in the Middle East. His team needed something a soldier could launch in seconds under fire, no training manual, no tech degree. After months of classified development, they created a breakthrough using patented MOT military optical technology — the first device ever to use the technology, making it 20 times more powerful than any commercial drone. It became one of the most celebrated military inventions in recent years. That same technology is now inside GhostWing, and it is the reason a retired teacher in Ohio can unbox it at breakfast and be filming her grandkids by lunch.

GhostWing runs on carbon-polymer nanotechnology with a 120% software power boost that does the flying for you. Tap once and it lifts off, hovers, and waits. Tap the follow-me mode and it tracks you automatically, no controller needed, capturing everything in stunning 4K. The collision detection makes it literally impossible to crash. It sees obstacles and avoids them before you even notice. GPS locks within 900 meters and brings it straight back to your hand when the battery gets low. It''s waterproof. It survives freezing winters and scorching summers. It folds smaller than a water bottle and flies 70% quieter than anything else in the air. Twenty times more powerful than commercial drones, with a 2.7-mile range and 15 minutes of flight time.

Now picture this. Saturday morning, you walk out to the backyard. You unfold GhostWing, press one button, and it rises straight up, smooth and silent. You tap follow-me and walk around your property while it films your roof, your gutters, your fence line. You just saved yourself 300 dollars on an inspection. Sunday, the grandkids come over. You launch it again and capture footage of them playing that looks like a movie. Your daughter watches it back and asks what camera crew you hired. You just smile. Next month on vacation, you get shots of the coastline that make everyone else''s photos look amateur. You check your property at night from inside the house using the live feed. One button. Every time.

Fifteen thousand people already know this feeling. That 4.9-star rating didn''t come from tech experts. It came from retirees, grandparents, and people who swore they''d never figure out a drone. Celebrities, professional photographers, and independent filmmakers have all made the switch — and they''re telling their followers. It sold out in 48 hours the first time. Adam has restocked, but at 50% off — just $99 — this batch won''t last either. You have 24 hours to lock in this price. Order multiple units for even bigger discounts, which makes GhostWing the perfect gift for anyone in your life who gave up on drones. Every order is backed by a 30-day money-back guarantee — zero risk. Tag someone over 55 who needs to see this. Click the link below this video, visit the official site, and get your GhostWing before this deal is taken down.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1084, '2026-02-19T03:25:26.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec378oR7AtXI70kS', 'GhostWing - Script 1032 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'Why are retired Air Force pilots calling this ninety-nine dollar drone the best purchase they have made in years. The answer has everything to do with a classified military project you were never supposed to know about.

For eleven years a man named Captain Adam Scott led a team of engineers developing optical reconnaissance systems for US Special Forces. Their mission was to create technology that could photograph enemy positions from distances that seemed impossible. By the time Captain Scott retired, his system had been deployed on over three hundred classified missions.

What happened next caused serious problems for the drone industry.

Captain Scott took the core technology from his military design and rebuilt it for everyday Americans. He removed the classified components but kept the optical power that made his system legendary. He called it GhostWing.

The first people to notice were his former military colleagues.

Retired pilots started buying GhostWing to capture aerial footage of their properties, their grandkids, their fishing trips. Word spread through veteran communities faster than anyone expected. Within weeks former Marines, Navy SEALs, and Air Force officers were posting videos that looked like they came from professional film crews.

Here is what these trained aviators noticed that regular consumers might miss.

The flight stability on GhostWing matches what they experienced flying million-dollar aircraft. Captain Scott used the same gyroscope principles found in Apache helicopters. Even in fifteen mile per hour winds the footage stays steady.

The optical system uses something called MOT military optical technology. This is not a gimmick. This is the foundation of what Captain Scott built for combat reconnaissance. It captures what professionals call four-K quality video at distances that would be blurry smears on consumer drones.

The collision detection system actually works. GhostWing sees obstacles and avoids them automatically. For pilots trained to trust their instruments, this feature alone made the purchase worthwhile.

And the GPS return function operates exactly like military specifications. If your signal drops or battery runs low, GhostWing calculates the return path and flies itself home. No panic. No lost equipment. No hundred-dollar drone at the bottom of a lake.

All of this for ninety-nine dollars.

That price point is what made former military personnel shake their heads in disbelief. They have seen what this technology costs when the government buys it. They know what equivalent civilian drones sell for at retail. GhostWing delivers comparable performance at a fraction of what anyone expected.

When it first launched the response was overwhelming. Sold out in under forty-eight hours. The waiting list exceeded ten thousand names. Videos started going viral as users posted footage that professional photographers could not believe came from such an affordable device.

Captain Scott has finally caught up with demand and is offering fifty percent off for the next twenty-four hours. Additional discounts apply when you purchase multiple units.

If military veterans trust this technology enough to recommend it to their families, that tells you everything you need to know. Click the link below this video to visit the official GhostWing website and claim your fifty percent discount while supplies last.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1032, '2026-01-18T08:42:48.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec3CIucTL8TlAQSY', 'VitalTac - Script 1052 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'The power went out. No phone signal. Temperature dropping fast.

That''s when most people realize their $20 flashlight isn''t going to cut it.

I want to show you something the military has had for years. A flashlight that can start fires, signal aircraft, and light up terrain from 2 miles away. Special forces operators trusted it in the worst conditions imaginable. And now you can own one.

This is VitalTac.

It started with a soldier named Mike. Twelve years in special operations. He carried a classified tactical light on every mission. In the mountains of Afghanistan, the jungles of South America, and frozen locations he can''t discuss. That flashlight never failed him. Not once.

When Mike came home, he realized something. Civilians are walking around with flashlights that die in the rain. That break when dropped. That can barely light up a backyard. Meanwhile, the technology that could actually save their lives was locked behind military classification.

So he decided to change that.

Mike rebuilt the flashlight from memory. The government sent lawyers. Said he couldn''t sell an exact copy. So he made it better. Optimized it for emergency situations. Added fire-starting capability. Made it even more durable.

The result is VitalTac.

Military-grade Cree LEDs that produce 20 times the power of commercial flashlights. A beam that reaches 2 miles. Enough concentrated heat to ignite kindling in seconds. Aircraft-grade titanium and aluminum body that survives absolutely everything.

Watch this demonstration. That''s VitalTac versus car headlights. Now watch it start a fire from pure light intensity. No matches. No lighter. Just raw power.

I tested one myself. Dropped it in water. Froze it overnight. Threw it off a roof. Ran it over with my truck. It kept working every single time. Because when you''re in an emergency, your gear can''t fail.

There''s a strobe function bright enough to signal search and rescue from miles away. An SOS mode that could mean the difference between being found and being forgotten. This isn''t a flashlight. It''s a survival tool.

But here''s what they don''t want you to know.

The Product Safety Commission is trying to classify VitalTac as military-grade equipment. Right now it''s completely legal to own. But once that classification happens, online sales end. It''s already banned from Amazon and eBay. You can''t find it anywhere except Mike''s official website.

The military version costs $600. Mike could easily charge $300 and sell every unit. But he didn''t build VitalTac for profit. He built it because he believes Americans deserve the same equipment that protects our soldiers.

Right now, today only, VitalTac is available at 50% off.

Think about the last time you needed a flashlight and it let you down. Dim. Dead batteries. Plastic housing cracked. Now imagine having something built for actual survival situations.

I keep one in my car, one in my emergency kit, and one by my bed. Because I''ve seen what happens when people rely on cheap equipment in real emergencies.

Click the link below this video. Go to the official website. See the demonstrations. And get yours while the discount is still active.

You can''t predict when you''ll need it. But when you do, you''ll be glad you have it.

Click now.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1052, '2026-02-19T17:50:20.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec3SK5A8ucpV7FJc', 'VitalTac - Script 1075 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'I watched a grown man cry in the Rockies last September. Not because he was hurt. Because he couldn''t start a fire and hypothermia was setting in.

We''d been hiking together — strangers at the trailhead who''d partnered up. Good weather turned bad. His pack got soaked crossing a river. Matches gone. Lighter dead. Temperature dropping fast.

I pulled out something that looked like an oversized flashlight. He probably thought I was crazy. Until I pointed it at a pile of dry pine needles and counted.

One. Two. Three. Four.

Smoke.

Seven. Eight. Nine.

Flame.

He stared at me like I''d performed actual magic. "What the hell IS that?"

That''s VitalTac. And it saved both our lives that night.

This isn''t camping gear. This is what American Special Forces carry on long-range reconnaissance behind enemy lines — missions where resupply doesn''t exist and your equipment has to perform perfectly or you don''t come home. A 2-mile beam. Military-grade Cree LEDs producing 20 times the output of commercial flashlights. Concentrated light intense enough to ignite kindling without matches, without lighters, without anything but the press of a button.

For years, civilians couldn''t buy this. The technology was classified. Then a Special Forces veteran — 8 years conducting operations in places that don''t officially exist — came home and decided the same gear that kept him alive should protect American families.

The government said no. So he rebuilt it. Same power. Same materials — aircraft-grade titanium and purified aluminum, the exact alloys on fifth-generation stealth fighters. Just modified enough to be completely legal.

I''ve tested mine in conditions that would destroy normal gear. Submerged it in a stream for 10 minutes — works perfectly. Left it outside in a Minnesota winter overnight — works perfectly. My buddy accidentally backed over his with a trailer. Small scuff. Full function.

But here''s what blew my mind the most.

Last month, my truck broke down on a backroad. Middle of nowhere. No cell service. I needed someone to see me from the highway — had to be a quarter mile away at least.

I pointed VitalTac toward the road and hit the SOS strobe.

Two minutes later, headlights. A trucker had seen my signal and pulled over.

"Thought you were a damn lighthouse," he said.

That''s when I understood what this actually is. Fire starter. Rescue beacon. Navigation light. Defensive weapon. All in one indestructible package small enough to clip to your belt.

But you need to know something. The US Product Safety Commission is working to classify this as military-grade equipment. Once that happens — weeks, maybe a month — it''s gone from civilian sale permanently. Amazon already banned it. eBay too. The only way to get one is through the official website.

Right now, they''re doing 50% off. I don''t know how long that holds.

If you hunt. If you camp. If you hike. If you live anywhere the power goes out or help takes time to arrive — you need this. Not want. Need.

I keep one in my pack. One in my truck. One by my door.

Because I''ve seen what happens when the gear fails. I''ve watched a man shiver and cry because he couldn''t make fire.

That''s never going to be me. And it doesn''t have to be you.

Click the link below. Get yours before this window closes.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1075, '2026-02-20T11:44:42.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec3b0yItsWa9xkTh', 'GhostWing - Script 1016 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'Stop.
If you''re over 60 and you''ve already decided drones aren''t for you... you need to see this.
Because everything you believe about drones — that they''re complicated, that they crash, that they''re for young people with fast reflexes —
It''s all true.
Except for one
Because what I''m about to show you is something big drone companies hoped you''d never discover.
See, here''s what most people don''t realize...
Consumer drones weren''t designed for regular people. They were designed by engineers in their twenties... for other people in their twenties.
Tiny joysticks that demand gamer reflexes. Confusing apps with a hundred settings. Controls so sensitive that one wrong twitch sends $800 crashing into a tree.
And when it breaks? They want you to buy another one.
That''s not a flaw in the system. That''s the system working exactly as designed.
But then something changed.
In 2019, Captain Adam Scott — a 44-year-old U.S. Army engineer — was given an unusual mission.
Special Forces needed a drone that anyone could fly. In the dark. Under pressure. With gloves on. With zero training.
The requirement was simple: if a soldier can''t master it in sixty seconds, someone dies.
So Captain Scott did something radical.
He threw out everything the drone industry believed. No complex joysticks. No learning curve. No pilot skill required.
Instead, he built the intelligence into the drone itself.
The result shocked military brass. Soldiers who had never touched a drone were flying precision missions within minutes.
That prototype became GhostWing.
And here''s what makes it different.
You don''t fly GhostWing. You guide it.
One button to take off. One button to land. One button to bring it safely home.
The military-grade optical system is 20 times more powerful than consumer drones. Collision avoidance sees obstacles before you do. GPS tracking monitors everything — if signal weakens or battery drops, GhostWing returns automatically.
It''s waterproof. Impact-resistant. Nearly indestructible.
There''s even a Follow Me mode that captures smooth, cinematic footage of you... Without ever touching the controller.
Imagine capturing your grandkids from angles they''ve never seen. Checking your property without walking a mile. Recording your fishing trip, your golf game, your travels... Without asking a stranger for help.
Or simply experiencing the joy of flight. At any age.
This isn''t about proving anything to anyone. It''s about refusing to let anyone tell you what you can''t do.
When GhostWing first became available to civilians, the response was overwhelming. The first batch sold out in 47 hours. Over 10,000 people joined the waitlist.
Now production has finally caught up.
And to get this technology into as many hands as possible, Captain Scott authorized a 50% discount — but only while this batch lasts.
New drone regulations are being considered in Washington that could limit civilian access to military-grade technology like this.
Once this batch is gone... or those rules take effect... This opportunity disappears.
So here''s my suggestion.
Click the link below this video right now.
See the full GhostWing package, the discount, and everything included.
If it''s not for you, no problem.
But if you''ve ever felt like technology left you behind... GhostWing was designed specifically for you.
Click below. See for yourself.
And discover what it feels like to fly.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1016, '2026-01-05T15:50:55.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec3hI7uisoF40e9T', 'GhostWing - Script 1033 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'A sixty-eight-year-old grandfather from Ohio just went viral with footage everyone assumed required a Hollywood budget. His secret cost ninety-nine dollars.

Harold McKinney had never touched a drone in his life. He barely knew how to send a text message. But when his daughter mentioned that her wedding videographer wanted four thousand dollars just for aerial shots, Harold decided to do something about it.

His research led him to a retired US Army Captain named Adam Scott. For eleven years Captain Scott developed classified optical systems for Special Forces missions overseas. When he retired he rebuilt his military technology for regular Americans and called it GhostWing.

Harold figured ninety-nine dollars was worth the risk.

What happened next put his video on every morning news show in America.

Harold launched the GhostWing at his daughter''s outdoor wedding reception. He tapped the Follow Me button and let it work. For two hours the drone captured every moment without Harold touching a single control. The first dance. The sunset behind the oak trees. His granddaughter catching the bouquet.

When his daughter watched the footage that night she burst into tears. She said it looked like a scene from a movie.

Harold posted a short clip on his Facebook page. Within a week it had eleven million views. Television producers called asking for interviews. Other grandparents started messaging him wanting to know how he did it.

Here is why GhostWing made it possible for someone like Harold.

Captain Scott designed it specifically for people who are not tech experts. The entire system operates through one-button commands. Takeoff. Landing. Follow Me. Return home. You do not need to understand anything about aviation or cameras.

The flight stability uses gyroscope technology from Apache helicopters. Even when Harold got nervous and his hands started shaking, the footage stayed perfectly smooth.

The optical system uses MOT military optical technology, the same foundation Captain Scott built for combat reconnaissance. It captures four-K video quality that professionals spend thousands of dollars to achieve.

And if something goes wrong, the GhostWing handles it automatically. Collision detection steers around obstacles before you even see them. GPS tracking brings it home if the signal drops or the battery runs low. Harold never had a single close call.

The shell is military-grade construction. Waterproof. Temperature resistant. Captain Scott built it to survive conditions that would destroy the drones you find at electronics stores.

When GhostWing first launched it sold out in forty-eight hours. The waiting list topped ten thousand names. Videos like Harold''s started appearing everywhere, shot by regular people who had never owned a drone before.

Captain Scott has finally caught up with demand. For the next twenty-four hours he is offering fifty percent off for new customers. The discounts get deeper when you order multiple units, which makes this the perfect gift for anyone who wants to capture special moments.

Harold''s advice to other grandparents is simple. Stop paying professionals for footage you can create yourself. The technology is finally here for people like us. Click the link below this video to visit the official GhostWing website and claim your fifty percent discount before they sell out again.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1033, '2026-01-18T08:43:21.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec4A3g3CT4ikSW1p', 'GhostWing - Script 1023 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'Big drone companies don''t want anyone over 50 flying drones. But there''s nothing they can do to stop this.
There''s a new military-grade drone that''s so simple to fly, a 72-year-old grandmother had it in the air in under three minutes — her first time ever touching a drone. One button to take off. One button to land. One button to bring it home. No manual. No apps. No confusion.
And the footage? Crystal-clear 4K. The same quality you see in Netflix documentaries.
This breakthrough was created by a small team of engineers — three of them retired military drone specialists, two of them grandparents — who got sick of watching their own families waste hundreds of dollars on complicated drones that crashed, broke, and collected dust in the closet.
The lead engineers, Marcus Chen and David Holloway, knew the technology for stable, silent, crash-proof flight existed. The military had it for years. Hollywood had it. But the big drone companies kept it locked away in machines costing five to ten thousand dollars — and even those required weeks of training.
So Chen and Holloway did something the industry never expected. They reverse-engineered how consumer drones failed — the shaky footage, the wind sensitivity, the fragile frames, the impossible controls — and built something completely different from the ground up.
The result: a tactical-grade drone the size of a water bottle with triple-axis gyroscopic stabilization, whisper-silent military motors, and a reinforced frame that survives crashes onto concrete. They called it the Ghost Wing.
The first time they tested it with a focus group of retirees — average age 67, zero drone experience — every single person flew it successfully within five minutes. One woman, 74 years old, landed it so smoothly she thought it was broken. "That''s it?" she asked.
That''s it.
The Ghost Wing locks onto its position like a hawk. Wind that would send other drones spinning into the neighbor''s pool? It doesn''t flinch. Drop it from 30 feet? Pick it up and keep flying. The brushless motors are so silent you can fly it above a family barbecue without a single person plugging their ears.
Major drone manufacturers tried to acquire the technology. Chen and Holloway refused. They didn''t want it buried in a ten-thousand-dollar machine nobody could afford. Instead, they partnered with independent distributors to bring Ghost Wing directly to consumers — no retail markup, no middlemen.
Using Ghost Wing takes 30 seconds. Unbox it. Charge it. Press one button. You''re flying.
The controller has large, tactile buttons designed for adult hands. A bright screen visible in direct sunlight. No smartphone apps required. No tiny joysticks. No instruction manual needed.
If you''ve ever felt like technology was designed to make you feel old and confused — this wasn''t.
People across the country are switching from overpriced, overcomplicated drones to Ghost Wing for a smarter, simpler way to capture memories from the air.
Right now, Ghost Wing is offering a substantial 50% discount to spread the word — but you''ll need to hurry. The last four shipments sold out in 72 hours. The silent motors come from a single specialized factory and production is limited. Once this batch is gone, the discount goes with it.
And you''re protected for a full 90 days. Fly it. Crash it. Test it. If the Ghost Wing doesn''t blow your mind — if your footage doesn''t make your family ask "how did you do that?" — send it back for a complete refund. No questions. No hassle.
Don''t let another satisfying satisfying moment satisfying slip away because some corporation decided the good technology was too good for regular people.
Click the button below or scan the QR code to claim your 50% discount on Ghost Wing before they''re gone.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1023, '2026-01-11T18:45:13.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec4G9iewakHdkNOD', 'VitalTac - Script 1010 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'Lightsabers are finally a reality—and for the next 72 hours, you have a rare chance to own one before they''re gone for good. This classified military flashlight is basically a lightsaber that fits in your pocket. But I need to warn you: this $600 tactical weapon is NOT a toy—and it''s already sold out THREE times this month alone.
It''s so devastatingly powerful that it melts through steel, ignites fires on command, and has been called "the most dangerous flashlight ever created" by over 47,000 verified buyers. This is the ultimate survival tool that could save your life—or someone you love—when everything else fails.
The flashlight projects an absolutely blinding beam of concentrated light reaching up to 2 miles—visible from space according to one aerospace engineer who tested it. It was designed specifically for American Tier-1 special forces operators to identify enemy positions from miles away and dominate close-quarters combat in total darkness. The kind of missions you''ll never hear about.
It features classified military-grade Cree LED technology that makes it at least 20 TIMES more powerful than anything you can buy at Home Depot or any big-box store. That''s what gives it those terrifying fire-starting capabilities—it literally burns through wood, plastic, and thin metal in seconds. You''re holding the same technology that protects American soldiers in the most dangerous places on Earth.
For years, this exact flashlight was locked behind military clearance. Civilians were completely shut out—until 8 weeks ago, when everything changed.
A decorated 14-year special forces veteran—a man who completed over 200 classified missions—finally left the service. But he couldn''t forget the one piece of equipment that saved his life more times than he could count: this flashlight.
He memorized every detail of its design and technology. Back home, in his garage in Tennessee, he built one from scratch. Within 48 hours, military lawyers showed up at his door. They told him he couldn''t replicate the exact design—or face federal charges.
But instead of backing down, he saw an opportunity. Every frustration he''d had with the military version during actual combat? He fixed it. He made it smaller, lighter, more durable—and even MORE powerful. He adapted it for civilian survival and home defense while keeping every tactical advantage.
After months of legal battles, he won. He secured EXPLICIT permission to manufacture and sell these in the US—making him the ONLY person on Earth legally authorized to do so. He called his creation VitalTac.
VitalTac is now the most powerful flashlight ever made available to American civilians—and 47,000 families already trust it to protect their homes. Watch the difference yourself: it doesn''t just beat car headlights—it makes them look like cheap dollar-store glow sticks.
VitalTac is engineered from the same aerospace-grade purified aluminum and titanium alloy used on $100 million F-35 fighter jets—designed to withstand forces that would crush ordinary flashlights into dust. This thing is virtually indestructible. When the power goes out during the next major storm—and it will—you''ll have light when your neighbors are fumbling in the dark.
It''s completely waterproof. It operates flawlessly in freezing blizzards AND scorching 200-degree heat. You can drop it off a building, run it over with a truck, submerge it in a lake—it will NOT quit on you. We''ve tested it. So have thousands of customers who''ve sent us videos proving it.
Picture this: It''s 2 AM. The power''s been out for 6 hours. There''s a noise outside your daughter''s window. With VitalTac, you don''t just see what''s there—you BLIND anyone who shouldn''t be. Its concentrated beam is powerful enough to cook an egg, start an emergency fire, or signal rescue helicopters from miles away with its built-in strobe and SOS function.
Now here''s what you need to know before you decide—because you won''t have long to think about it.
While completely legal TODAY, VitalTac is under active review by the US Product Safety Commission. They''re pushing to classify it as military-grade defense equipment. Once that happens, it will be PERMANENTLY removed from online sale to civilians. You will not be able to buy it. Period.
That''s exactly why you won''t find VitalTac on Amazon, eBay, or Walmart. Those platforms have already banned it—they''re too afraid of the liability. The ONLY way to get your hands on one is through the official website, while supplies last.
And right now—for the next 72 hours only, or until this batch sells out, whichever comes first—you can claim yours at 50% OFF the normal price. That''s less than what soldiers would pay with their military discount.
But I''ll be honest with you: we''re down to our last 1,200 units, and at this pace, they''ll be gone before the weekend. People are buying 2 and 3 at a time—one for the car, one for the nightstand, one for their bug-out bag.
Click the link in this video right now to secure your VitalTac while you still can. This might be your last chance to own the same technology that protects America''s most elite warriors—before the government decides you''re not allowed to have it anymore.
Don''t be the person who watches this video twice.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1010, '2025-12-25T18:15:57.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec4siGLIwaFhxDD5', 'GhostWing - Script 1034 - Nick', 'recMS4kpPubp6bHyu', 'recaidhXBfNk3aUQI', 'How a ninety-nine dollar military drone is helping property owners protect what matters most. And why big security companies are terrified of what this means.

Ray Collins owns forty-seven acres in rural Tennessee. For years he struggled with trespassers cutting through his land, poachers setting up on his back thirty, and that one stretch of fence line he could never keep an eye on because the terrain made it impossible to reach.

Professional security systems wanted fifteen thousand dollars for camera installation. Drone surveillance services quoted him eight hundred dollars per month.

Then Ray heard about something called GhostWing.

Here is the backstory that explains why this technology exists.

A retired US Army Captain named Adam Scott spent eleven years developing classified optical systems for Special Forces missions. His technology allowed soldiers to photograph enemy positions from distances that seemed physically impossible. When Captain Scott retired he rebuilt that military foundation for everyday Americans and priced it at ninety-nine dollars.

Ray was skeptical until he actually launched it.

The GhostWing uses something called MOT military optical technology. This is not marketing language. This is the actual system Captain Scott built for combat reconnaissance. It captures crystal clear four-K video from heights and distances that make everything visible.

In his first flight Ray discovered three things he had never noticed from ground level. A section of fence that had been cut. A trail that trespassers had worn through his woods. And a tree that was about to fall on his barn.

That ninety-nine dollar investment saved him thousands in potential damage and gave him evidence he could show the sheriff.

But here is what made GhostWing practical for someone managing property.

The Follow Me feature lets you map your fence line while the drone documents everything automatically. The GPS system creates a return path so it comes back even if you lose sight of it. The collision detection prevents it from crashing into trees or power lines.

The battery provides enough flight time to survey acreage that would take hours to walk. The military-grade construction handles rain, cold, and the kind of rough use that comes with actual work.

Ray now flies his GhostWing every Sunday morning. Takes him about fifteen minutes to check his entire property. He has footage archived going back six months that documents everything that happens on his land.

His neighbors started asking questions. Then they started buying their own GhostWings.

Hunters are using them to scout terrain before season opens. Ranchers are checking on livestock in distant pastures. Farmers are inspecting crops for disease and irrigation problems. Rural landowners finally have an affordable way to see their property from the air.

When GhostWing first launched it sold out in forty-eight hours. Over ten thousand people ended up on the waiting list. Property owners across the country realized they had been overpaying for security they could provide themselves.

Captain Scott has finally restocked and is offering fifty percent off for the next twenty-four hours. Order more than one and the discounts increase, which makes this practical for anyone who wants to give one to a neighbor.

Your property deserves protection that does not cost a fortune. Click the link below this video to visit the official GhostWing website and claim your discount before inventory runs out again.', 0, 0, NULL, NULL, NULL, NULL, NULL, 1034, '2026-01-18T08:43:56.000Z');
INSERT OR IGNORE INTO video_scripts (id, script_name, product_id, author_id, script_content, is_approved, needs_revision, version, notes, hook, body, hook_number, base_script_number, created_at) VALUES ('rec51NX59yiMQS5E6', 'VitalTac - Script 1062 - Nick', 'rec3cJmt5H4AENEgZ', 'recaidhXBfNk3aUQI', 'Day three. No phone signal. No trail markers. And my buddy''s leg was broken.

We were supposed to be home by now. Instead, we were twelve miles off-trail in the Cascades with temperatures dropping and no way to call for help.

That''s when I remembered what was in my pack. Something my ex-military neighbor had shoved into my hands before the trip. "You''ll think I''m crazy," he said. "Until you need it."

He was right.

This flashlight saved both our lives. And I''m going to show you exactly how.

First — fire. We had no lighter. Matches got soaked crossing the river. By nightfall, we were shivering and my buddy was going into shock.

I pulled out the VitalTac, aimed it at a pile of dry leaves and pine needles, and within fifteen seconds, smoke. Twenty seconds, flames. The concentrated beam produces enough heat to ignite tinder faster than any ferro rod I''ve ever used.

We had fire. Warmth. A chance.

Second — visibility. That night, I heard movement in the trees. Could''ve been a deer. Could''ve been a mountain lion. I hit the switch and lit up the entire tree line like daylight. Whatever it was — it ran. The beam on this thing reaches two miles. Nothing wants to mess with that.

Third — rescue. The next morning, I saw a helicopter in the distance. Search and rescue. But they were heading the wrong direction. I switched to SOS mode — this rapid strobe pattern designed to be visible from miles away. The pilot turned. Twenty minutes later, we were airlifted out.

My buddy still walks with a limp. But he walks. Because of a flashlight.

This is VitalTac. It was built for American Special Forces operating in environments where failure isn''t an option. The military-grade Cree LEDs are twenty times more powerful than anything at REI. The body is forged from the same titanium alloy they use on stealth fighters. Waterproof. Freezeproof. Literally indestructible.

I''ve since learned more about where it came from. A Special Forces operator who spent years relying on this technology in combat came home and realized civilians had nothing even close. He rebuilt it himself. The government sent lawyers. He modified the design to be legal while keeping every capability intact.

He called it VitalTac. And it''s the most important piece of survival gear I''ve ever owned.

Look at these specs. Fire-starting capability. Two-mile beam distance. Strobe mode that disorients threats. SOS function visible from aircraft. A body that survives anything you can throw at it.

But here''s the problem.

The Product Safety Commission is trying to classify this as military-grade equipment. When that happens, it gets pulled from civilian sale. Permanently. It''s already banned from Amazon and eBay. The only place left to get one is the official website.

And right now — today only — they''re offering 50% off.
