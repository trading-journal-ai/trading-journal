ALTER TABLE `executions` ADD `broker_execution_key` text;--> statement-breakpoint
ALTER TABLE `executions` ADD `canonical_execution_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `executions_broker_execution_key_account_unq` ON `executions` (`broker_execution_key`,`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `executions_canonical_execution_key_account_unq` ON `executions` (`canonical_execution_key`,`account_id`);
