ALTER TABLE `banh_options` ADD `phu_thu_kieu` text;--> statement-breakpoint
ALTER TABLE `banh_options` ADD `phu_thu_gia_tri` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `gia_base` integer;--> statement-breakpoint
UPDATE `banh_options` SET `phu_thu_kieu`='phan_tram', `phu_thu_gia_tri`=10 WHERE `loai`='cot' AND `ten` IN ('Chocolate','Matcha','Red Velvet');--> statement-breakpoint
UPDATE `banh_options` SET `phu_thu_kieu`='tien', `phu_thu_gia_tri`=5000 WHERE `loai`='mut' AND `ten` IN ('Đào','Việt quất');--> statement-breakpoint
UPDATE `banh_options` SET `phu_thu_kieu`='tien', `phu_thu_gia_tri`=10000 WHERE `loai`='mut' AND `ten` IN ('Sốt đường đen','Sốt socola');--> statement-breakpoint
UPDATE `banh_options` SET `phu_thu_kieu`='phan_tram', `phu_thu_gia_tri`=10 WHERE `loai`='topping' AND `ten`='Trái cây hỗn hợp theo mùa';--> statement-breakpoint
UPDATE `banh_options` SET `phu_thu_kieu`='phan_tram', `phu_thu_gia_tri`=5 WHERE `loai`='topping' AND `ten` IN ('Trân châu đường đen','Marshmallow','Oreo vụn');