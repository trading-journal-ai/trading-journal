CREATE TABLE `ticker_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`symbol` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticker_reviews_account_date_symbol_unq` ON `ticker_reviews` (`account_id`,`date`,`symbol`);
--> statement-breakpoint
CREATE INDEX `ticker_reviews_account_date_idx` ON `ticker_reviews` (`account_id`,`date`);
