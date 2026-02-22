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

