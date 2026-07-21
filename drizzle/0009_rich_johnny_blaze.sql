CREATE TABLE `market_context_days` (
	`session_date_et` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`provenance` text NOT NULL,
	`coverage_status` text NOT NULL,
	`source_version` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_context_days_source_date_idx` ON `market_context_days` (`source`,`session_date_et`);