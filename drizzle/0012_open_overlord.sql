CREATE TABLE `execution_fees` (
	`execution_id` integer NOT NULL,
	`fee_type` text NOT NULL,
	`amount` real NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`execution_id`, `fee_type`),
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `execution_fees_type_idx` ON `execution_fees` (`fee_type`);
--> statement-breakpoint
INSERT INTO `execution_fees` (`execution_id`, `fee_type`, `amount`, `source`)
SELECT `id`, 'REPORTED_TOTAL', `fees`, 'legacy'
FROM `executions` WHERE `fees` > 0;
