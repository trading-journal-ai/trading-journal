CREATE INDEX IF NOT EXISTS `import_batches_account_imported_idx` ON `import_batches` (`account_id`,`imported_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trades_account_entry_idx` ON `trades` (`account_id`,`entry_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `trades_account_symbol_entry_idx` ON `trades` (`account_id`,`symbol`,`entry_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `executions_trade_executed_idx` ON `executions` (`trade_id`,`executed_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `executions_account_executed_idx` ON `executions` (`account_id`,`executed_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `journal_entries_account_scope_key_idx` ON `journal_entries` (`account_id`,`scope`,`scope_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `journal_entries_trade_idx` ON `journal_entries` (`trade_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `attachments_trade_idx` ON `attachments` (`trade_id`);
