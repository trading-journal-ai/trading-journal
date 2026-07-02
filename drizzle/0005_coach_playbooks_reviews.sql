CREATE TABLE `coach_playbooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`title` text DEFAULT 'Trading Playbook' NOT NULL,
	`body` text NOT NULL,
	`rubric` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_playbooks_account_unq` ON `coach_playbooks` (`account_id`);--> statement-breakpoint
CREATE TABLE `coach_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`scope` text NOT NULL,
	`scope_key` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payload_json` text NOT NULL,
	`review_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_reviews_account_scope_key_unq` ON `coach_reviews` (`account_id`,`scope`,`scope_key`);--> statement-breakpoint
CREATE INDEX `coach_reviews_account_status_idx` ON `coach_reviews` (`account_id`,`status`,`updated_at`);
