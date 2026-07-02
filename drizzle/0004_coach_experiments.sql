CREATE TABLE `coach_experiments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`scope` text NOT NULL,
	`scope_key` text NOT NULL,
	`hypothesis` text NOT NULL,
	`trigger` text NOT NULL,
	`action` text NOT NULL,
	`experiment_scope` text NOT NULL,
	`expires` text NOT NULL,
	`measure` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_experiments_account_scope_key_unq` ON `coach_experiments` (`account_id`,`scope`,`scope_key`);--> statement-breakpoint
CREATE INDEX `coach_experiments_account_status_idx` ON `coach_experiments` (`account_id`,`status`,`updated_at`);
