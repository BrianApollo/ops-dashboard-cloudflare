CREATE TABLE `ad_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`ad_acc_fb_id` text NOT NULL,
	`ad_acc_name` text NOT NULL,
	`ad_acc_status` text,
	`currency` text,
	`amount_spent` real DEFAULT 0 NOT NULL,
	`timezone` text,
	`last_synced` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ad_accounts_ad_acc_fb_id_unique` ON `ad_accounts` (`ad_acc_fb_id`);--> statement-breakpoint
CREATE TABLE `ad_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`preset_name` text NOT NULL,
	`product_id` text,
	`primary_text_1` text,
	`primary_text_2` text,
	`primary_text_3` text,
	`primary_text_4` text,
	`primary_text_5` text,
	`headline_1` text,
	`headline_2` text,
	`headline_3` text,
	`headline_4` text,
	`headline_5` text,
	`description_1` text,
	`description_2` text,
	`description_3` text,
	`description_4` text,
	`description_5` text,
	`call_to_action` text,
	`beneficiary_name` text,
	`payer_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `advertorials` (
	`id` text PRIMARY KEY NOT NULL,
	`advertorial_name` text NOT NULL,
	`product_id` text,
	`advertorial_text` text,
	`final_link` text,
	`is_checked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `business_managers` (
	`id` text PRIMARY KEY NOT NULL,
	`bm_fb_id` text NOT NULL,
	`bm_name` text NOT NULL,
	`bm_status` text,
	`verification_status` text,
	`system_user_id` text,
	`system_user_token` text,
	`system_user_created` text,
	`last_synced` text,
	`hidden` integer DEFAULT false NOT NULL,
	`ad_account_ids` text,
	`pixel_ids` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_managers_bm_fb_id_unique` ON `business_managers` (`bm_fb_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_name` text NOT NULL,
	`status` text DEFAULT 'Preparing' NOT NULL,
	`product_id` text,
	`platform` text,
	`redtrack_campaign_name` text,
	`redtrack_campaign_id` text,
	`notes` text,
	`start_date` text,
	`end_date` text,
	`budget` real,
	`description` text,
	`fb_campaign_id` text,
	`fb_ad_account_id` text,
	`fb_ad_set_id` text,
	`fb_ad_ids` text,
	`launch_profile_id` text,
	`launched_data` text,
	`launched_at` text,
	`launch_date` text,
	`launch_time` text,
	`location_targeting` text,
	`website_url` text,
	`utms` text,
	`ad_acc_used` text,
	`page_used` text,
	`pixel_used` text,
	`selected_ad_profile_id` text,
	`cta` text,
	`display_link` text,
	`link_variable` text,
	`draft_profile_id` text,
	`reuse_creatives` integer,
	`launch_as_active` integer,
	`video_ids` text,
	`image_ids` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selected_ad_profile_id`) REFERENCES `ad_presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`image_name` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`product_id` text,
	`image_type` text,
	`drive_file_id` text,
	`image_drive_link` text,
	`thumbnail_url` text,
	`width` integer,
	`height` integer,
	`file_size` integer,
	`notes` text,
	`count` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`page_fb_id` text NOT NULL,
	`page_name` text NOT NULL,
	`published` text,
	`page_link` text,
	`fan_count` integer DEFAULT 0 NOT NULL,
	`last_synced` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_page_fb_id_unique` ON `pages` (`page_fb_id`);--> statement-breakpoint
CREATE TABLE `pixels` (
	`id` text PRIMARY KEY NOT NULL,
	`pixel_fb_id` text NOT NULL,
	`pixel_name` text NOT NULL,
	`available` text,
	`last_fired_time` text,
	`last_synced` text,
	`hidden` integer DEFAULT false NOT NULL,
	`owner_bm_ids` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pixels_pixel_fb_id_unique` ON `pixels` (`pixel_fb_id`);--> statement-breakpoint
CREATE TABLE `product_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`type` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`status` text DEFAULT 'Preparing' NOT NULL,
	`drive_folder_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_fb_id` text NOT NULL,
	`profile_name` text NOT NULL,
	`profile_status` text,
	`permanent_token` text,
	`permanent_token_end_date` text,
	`token_valid` integer DEFAULT false,
	`last_sync` text,
	`hidden` integer DEFAULT false NOT NULL,
	`is_master` integer DEFAULT false NOT NULL,
	`profile_email` text,
	`profile_fb_password` text,
	`profile_email_password` text,
	`profile_2fa` text,
	`profile_birth_date` text,
	`profile_link` text,
	`profile_review_date` text,
	`profile_security_email` text,
	`security_email_password` text,
	`proxy` text,
	`profile_youtube_handle` text,
	`uid` text,
	`profile_gender` text,
	`profile_location` text,
	`profile_year_created` text,
	`ads_power_profile_id` text,
	`bm_ids` text,
	`page_ids` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_profile_fb_id_unique` ON `profiles` (`profile_fb_id`);--> statement-breakpoint
CREATE TABLE `scaling_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rule_scope` text,
	`select_type` text,
	`check_at` text,
	`if_condition` text,
	`then_action` text,
	`execute_action_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `temp_images` (
	`id` text PRIMARY KEY NOT NULL,
	`image_name` text,
	`product_id` text,
	`drive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text,
	`email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `video_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`script_name` text NOT NULL,
	`product_id` text,
	`author_id` text,
	`script_content` text,
	`is_approved` integer DEFAULT false NOT NULL,
	`needs_revision` integer DEFAULT false NOT NULL,
	`version` integer,
	`notes` text,
	`hook` text,
	`body` text,
	`hook_number` integer,
	`base_script_number` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`video_name` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`format` text NOT NULL,
	`text_version` text,
	`product_id` text,
	`editor_id` text,
	`script_id` text,
	`creative_link` text,
	`notes` text,
	`scrollstopper_number` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`script_id`) REFERENCES `video_scripts`(`id`) ON UPDATE no action ON DELETE no action
);
