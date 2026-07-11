CREATE TABLE `order_phu_kien` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`ten` text NOT NULL,
	`gia` integer NOT NULL,
	`so_luong` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `phu_kien` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ten` text NOT NULL,
	`gia` integer DEFAULT 0 NOT NULL,
	`thu_tu` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `don_qua_tang` integer DEFAULT 0 NOT NULL;