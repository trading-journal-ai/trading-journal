ALTER TABLE `executions` ADD `broker_order_key` text;--> statement-breakpoint
CREATE INDEX `executions_account_order_key_idx` ON `executions` (`account_id`,`broker_order_key`);