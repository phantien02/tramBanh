CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sdt` text NOT NULL,
	`ten` text NOT NULL,
	`ghi_chu` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_sdt_unique` ON `customers` (`sdt`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`user_id` integer,
	`hanh_dong` text NOT NULL,
	`chi_tiet` text,
	`thoi_diem` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_item_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_item_id` integer NOT NULL,
	`file_path` text NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`ten_mon` text NOT NULL,
	`co_banh` text,
	`so_luong` integer DEFAULT 1 NOT NULL,
	`chu_viet` text,
	`ghi_chu` text,
	`gia` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ma_don` text NOT NULL,
	`customer_id` integer,
	`nguon` text NOT NULL,
	`ngay_gio_nhan` integer NOT NULL,
	`hinh_thuc_nhan` text NOT NULL,
	`dia_chi_ship` text,
	`sdt_nguoi_nhan` text,
	`phi_ship` integer DEFAULT 0 NOT NULL,
	`tong_tien` integer NOT NULL,
	`tien_coc` integer DEFAULT 0 NOT NULL,
	`hinh_thuc_tt` text DEFAULT 'chua_tt' NOT NULL,
	`ghi_chu` text,
	`trang_thai` text DEFAULT 'moi' NOT NULL,
	`ket_thuc_kieu` text,
	`ly_do_huy` text,
	`da_sua` integer DEFAULT 0 NOT NULL,
	`nhac_nho` integer DEFAULT 0 NOT NULL,
	`nguoi_tao` integer NOT NULL,
	`nguoi_lam` integer,
	`nguoi_giao` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nguoi_tao`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nguoi_lam`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nguoi_giao`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_ma_don_unique` ON `orders` (`ma_don`);--> statement-breakpoint
CREATE TABLE `product_sizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`ten_co` text NOT NULL,
	`gia` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ten` text NOT NULL,
	`nhom` text DEFAULT 'Khác' NOT NULL,
	`anh` text,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`ho_ten` text NOT NULL,
	`vai_tro` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);