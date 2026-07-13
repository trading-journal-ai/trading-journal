CREATE TABLE `journal_entry_tags` (
	`journal_entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`journal_entry_id`, `tag_id`),
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
