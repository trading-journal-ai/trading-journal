PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trade_id` integer,
	`scope` text DEFAULT 'trade' NOT NULL,
	`scope_key` text,
	`thesis` text,
	`what_went_well` text,
	`what_went_wrong` text,
	`lessons` text,
	`followed_plan` integer,
	`emotional_state` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_journal_entries`("id", "trade_id", "thesis", "what_went_well", "what_went_wrong", "lessons", "followed_plan", "emotional_state", "created_at") SELECT "id", "trade_id", "thesis", "what_went_well", "what_went_wrong", "lessons", "followed_plan", "emotional_state", "created_at" FROM `journal_entries`;--> statement-breakpoint
DROP TABLE `journal_entries`;--> statement-breakpoint
ALTER TABLE `__new_journal_entries` RENAME TO `journal_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;