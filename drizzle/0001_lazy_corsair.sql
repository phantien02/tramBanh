CREATE TABLE `banh_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loai` text NOT NULL,
	`ten` text NOT NULL,
	`thu_tu` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `order_items` ADD `cot` text;--> statement-breakpoint
ALTER TABLE `order_items` ADD `mut` text;--> statement-breakpoint
ALTER TABLE `order_items` ADD `topping` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `ten_nguoi_nhan` text;