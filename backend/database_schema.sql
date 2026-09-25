-- =====================================================================
-- NCC CADETS REFRESHMENT MANAGEMENT SYSTEM
-- FULL DATABASE SCHEMA & MASTER SEED DUMP
-- Generated on: 2026-09-25T16:54:12.149Z
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- -----------------------------------------------------
-- Table structure for `users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `email` varchar(255) NOT NULL,
  `login_id` varchar(255) DEFAULT NULL,
  `password_hash` text NOT NULL,
  `role` varchar(255) NOT NULL,
  `unit_id` int DEFAULT NULL,
  `institution_id` int DEFAULT NULL,
  `otp` text DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `login_id` (`login_id`),
  KEY `fk_1` (`unit_id`),
  KEY `fk_2` (`institution_id`),
  KEY `idx_email` (`email`),
  CONSTRAINT `fk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_2` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=120001;

-- -----------------------------------------------------
-- Table structure for `units`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_name` text NOT NULL,
  `unit_code` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `ncc_group` varchar(255) DEFAULT 'Group B',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `unit_code` (`unit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- -----------------------------------------------------
-- Table structure for `institutions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `institutions`;
CREATE TABLE `institutions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `institution_name` text NOT NULL,
  `ano_cto_name` text NOT NULL,
  `ano_cto_contact` text DEFAULT NULL,
  `pin_code` text DEFAULT NULL,
  `strength_1st_year` int DEFAULT '0',
  `strength_2nd_year` int DEFAULT '0',
  `strength_3rd_year` int DEFAULT '0',
  `google_location` text DEFAULT NULL,
  `complete_address` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`unit_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90001;

-- -----------------------------------------------------
-- Table structure for `refreshment_items`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `refreshment_items`;
CREATE TABLE `refreshment_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_name` text NOT NULL,
  `unit_price` double NOT NULL,
  `unit_of_measure` text NOT NULL,
  `is_active` int DEFAULT '1',
  `current_stock` int DEFAULT '100',
  `min_threshold` int DEFAULT '10',
  `expiry_date` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `default_gst_rate` double DEFAULT '5',
  `category` varchar(100) DEFAULT 'Refreshment',
  `last_restocked_at` datetime DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT '2106',
  `optimal_stock` int DEFAULT '200',
  `cost_price` double DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- -----------------------------------------------------
-- Table structure for `packet_templates`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `packet_templates`;
CREATE TABLE `packet_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT 'Standard Refreshment Packet',
  `target_budget` double DEFAULT '75',
  `gst_rate` double DEFAULT '5',
  `is_active` int DEFAULT '1',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001;

-- -----------------------------------------------------
-- Table structure for `packet_template_items`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `packet_template_items`;
CREATE TABLE `packet_template_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `expiry_date` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`template_id`),
  KEY `fk_2` (`item_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`template_id`) REFERENCES `packet_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`item_id`) REFERENCES `refreshment_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- -----------------------------------------------------
-- Table structure for `demands`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `demands`;
CREATE TABLE `demands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `demand_number` varchar(255) NOT NULL,
  `institution_id` int DEFAULT NULL,
  `unit_id` int NOT NULL,
  `raised_by` int NOT NULL,
  `demand_date` text NOT NULL,
  `demand_time` varchar(255) DEFAULT '08:00',
  `purpose` text NOT NULL,
  `status` varchar(255) DEFAULT 'PENDING',
  `reviewed_by` int DEFAULT NULL,
  `review_remarks` text DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `accepted_by` int DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `delivery_receipt_url` text DEFAULT NULL,
  `invoice_url` text DEFAULT NULL,
  `is_deleted` int DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `delivery_partner_id` int DEFAULT NULL,
  `delivery_partner_name` text DEFAULT NULL,
  `delivery_partner_phone` text DEFAULT NULL,
  `delivery_partner_vehicle` text DEFAULT NULL,
  `delivery_status` varchar(255) DEFAULT 'PENDING',
  `dispatched_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL,
  `delivery_rejection_reason` text DEFAULT NULL,
  `bill_collection_status` text DEFAULT NULL,
  `bill_collection_notes` text DEFAULT NULL,
  `invoice_no` text DEFAULT NULL,
  `invoice_date` text DEFAULT NULL,
  `start_km_reading` double DEFAULT NULL,
  `closing_km_reading` double DEFAULT NULL,
  `total_km` double DEFAULT NULL,
  `demand_type` varchar(255) DEFAULT 'INSTITUTION',
  `packet_type` varchar(255) DEFAULT 'REGULAR',
  `custom_unit_rate` double DEFAULT NULL,
  `delivery_venue` text DEFAULT NULL,
  `delivery_sequence` int DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `demand_number` (`demand_number`),
  KEY `fk_1` (`institution_id`),
  KEY `fk_2` (`unit_id`),
  KEY `fk_3` (`raised_by`),
  KEY `fk_4` (`reviewed_by`),
  KEY `fk_5` (`accepted_by`),
  CONSTRAINT `fk_1` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `fk_3` FOREIGN KEY (`raised_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_4` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_5` FOREIGN KEY (`accepted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90001;

-- -----------------------------------------------------
-- Table structure for `demand_items`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `demand_items`;
CREATE TABLE `demand_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `demand_id` int NOT NULL,
  `item_id` int NOT NULL,
  `year_group` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `unit_price_snapshot` double NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`demand_id`),
  KEY `fk_2` (`item_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`demand_id`) REFERENCES `demands_old_notnull` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`item_id`) REFERENCES `refreshment_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=120001;

-- -----------------------------------------------------
-- Table structure for `demand_activity`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `demand_activity`;
CREATE TABLE `demand_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `demand_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action_type` varchar(255) NOT NULL,
  `old_status` text DEFAULT NULL,
  `new_status` text DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`demand_id`),
  KEY `fk_2` (`user_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`demand_id`) REFERENCES `demands_old_notnull` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=180001;

-- -----------------------------------------------------
-- Table structure for `delivery_partners`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `delivery_partners`;
CREATE TABLE `delivery_partners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `vehicle_no` text DEFAULT NULL,
  `assigned_pins` text DEFAULT NULL,
  `is_active` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `login_id` text DEFAULT NULL,
  `password_hash` text DEFAULT NULL,
  `vehicle_type` varchar(255) DEFAULT 'ECO',
  `vehicle_model` varchar(255) DEFAULT 'Maruti Eeco Cargo',
  `load_capacity_packets` int DEFAULT '750',
  `max_travel_km` int DEFAULT '80',
  `rate_per_km` double DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001;

-- -----------------------------------------------------
-- Table structure for `driver_daily_logs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `driver_daily_logs`;
CREATE TABLE `driver_daily_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `log_date` date NOT NULL,
  `start_km` double DEFAULT NULL,
  `end_km` double DEFAULT NULL,
  `total_km` double DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `driver_id` (`driver_id`,`log_date`),
  CONSTRAINT `fk_1` FOREIGN KEY (`driver_id`) REFERENCES `delivery_partners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- -----------------------------------------------------
-- Table structure for `refreshment_bills`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `refreshment_bills`;
CREATE TABLE `refreshment_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` int NOT NULL,
  `month` varchar(255) NOT NULL,
  `bill_submitted` int DEFAULT '0',
  `bill_submitted_date` text DEFAULT NULL,
  `bill_amount` double DEFAULT '0',
  `demand_packets` int DEFAULT '0',
  `payment_status` varchar(255) DEFAULT 'PENDING',
  `payment_date` text DEFAULT NULL,
  `payment_ref` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `institution_id` (`institution_id`,`month`),
  CONSTRAINT `fk_1` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- -----------------------------------------------------
-- Table structure for `bill_collection_events`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bill_collection_events`;
CREATE TABLE `bill_collection_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `event_date` date NOT NULL,
  `event_time` text NOT NULL,
  `message` text DEFAULT NULL,
  `status` varchar(255) DEFAULT 'SCHEDULED',
  `target_pin_codes` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`admin_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- -----------------------------------------------------
-- Table structure for `grievances`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `grievances`;
CREATE TABLE `grievances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_no` varchar(255) NOT NULL,
  `institution_id` int DEFAULT NULL,
  `unit_id` int NOT NULL,
  `demand_id` int DEFAULT NULL,
  `initiated_by` varchar(255) NOT NULL DEFAULT 'ANO',
  `created_by_user_id` int NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'QUALITY',
  `severity` varchar(255) NOT NULL DEFAULT 'MEDIUM',
  `subject` text NOT NULL,
  `description` text NOT NULL,
  `photo_url` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'SUBMITTED_TO_UNIT',
  `unit_remarks` text DEFAULT NULL,
  `forwarded_to_vendor_at` datetime DEFAULT NULL,
  `forwarded_by_user_id` int DEFAULT NULL,
  `vendor_remarks` text DEFAULT NULL,
  `vendor_action_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_user_id` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `ticket_no` (`ticket_no`),
  KEY `fk_1` (`institution_id`),
  KEY `fk_2` (`unit_id`),
  KEY `fk_3` (`demand_id`),
  KEY `fk_4` (`created_by_user_id`),
  KEY `fk_5` (`forwarded_by_user_id`),
  KEY `fk_6` (`resolved_by_user_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_3` FOREIGN KEY (`demand_id`) REFERENCES `demands_old_notnull` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_5` FOREIGN KEY (`forwarded_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_6` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- -----------------------------------------------------
-- Table structure for `grievance_activity`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `grievance_activity`;
CREATE TABLE `grievance_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grievance_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action_type` text NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`grievance_id`),
  KEY `fk_2` (`user_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`grievance_id`) REFERENCES `grievances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- -----------------------------------------------------
-- Table structure for `notifications`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` text NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `link_url` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`user_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90001;

-- -----------------------------------------------------
-- Table structure for `audit_logs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` text NOT NULL,
  `entity_id` int NOT NULL,
  `action` text NOT NULL,
  `performed_by` int NOT NULL,
  `details` text DEFAULT NULL,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`performed_by`),
  CONSTRAINT `fk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=450001;

-- -----------------------------------------------------
-- Table structure for `item_stock_logs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `item_stock_logs`;
CREATE TABLE `item_stock_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `log_type` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `balance_after` int NOT NULL,
  `expiry_date` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `previous_stock` int NOT NULL DEFAULT '0',
  `unit_price` double DEFAULT '0',
  `gst_rate` double DEFAULT '0',
  `total_amount` double DEFAULT '0',
  `indent_id` int DEFAULT NULL,
  `reference_no` varchar(255) DEFAULT NULL,
  `change_type` varchar(50) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`item_id`),
  KEY `fk_2` (`created_by`),
  CONSTRAINT `fk_1` FOREIGN KEY (`item_id`) REFERENCES `refreshment_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90001;

-- =====================================================================
-- MASTER SEED DATA
-- =====================================================================

-- Dumping seed data for `units` (2 rows)
INSERT INTO `units` (`id`, `unit_name`, `unit_code`, `location`, `ncc_group`, `created_at`) VALUES (1, '2 DELHI ARTY BTY NCC', '2 DAB NCC', 'DELHI', 'Group C', 'Wed Sep 23 2026 01:16:35 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `units` (`id`, `unit_name`, `unit_code`, `location`, `ncc_group`, `created_at`) VALUES (30001, '3 DELHI GIRLS BN', '3 DGBN', 'SAFDARJUNG ENCLAVE', 'Group C', 'Wed Sep 23 2026 04:27:50 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;

-- Dumping seed data for `institutions` (38 rows)
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (1, 1, 'APS SHANKAR VIHAR', 'S/O MUKESH RAUTELA', '9717086399', '110010', 50, 50, 0, '28.56105, 77.14124', '100', 'Wed Sep 23 2026 01:16:36 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (30001, 1, 'SHYAMA PRASAD VIDHAYALA', 'S/O MANISHA ', '+91 9717129716', '110003', 25, 25, 0, '28.59689099706038, 77.22561272125365', '17A, Khan Market, Lodhi Estate, New Delhi, Delhi 110003', 'Wed Sep 23 2026 16:14:27 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60001, 1, 'ARMY PUBLIC SCHOOL DAHULA KAUAN SD', 'CAPT BHUPINDER NAUTIYAL', '7678646005', '110010', 0, 26, 26, '', '52', 'Thu Sep 24 2026 14:42:37 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60002, 1, 'ARMY PUBLIC SCHOOL DHAULA KAUN JD', 'S/O KALPESHWAR BAHUGUNA', '9990217644', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:42:39 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60003, 1, 'CHINMAYA VIDHYALAYA SR SEC PUBLIC SCHOOL', 'S/O BHUPENDER Y', '9643473680', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:40 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60004, 1, 'CM SHRI SCHOOL BINDAPUR', 'S/O VAZIR SINGH', '7673987313', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:41 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60005, 1, 'CONVENT OF GAGAN BHARTI SCHOOL', 'CTO RENU BALUNI', '7834838866', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:42:42 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60006, 1, 'DELHI POLICE PUBLIC SCHOOL', 'CTO KRISHAN KUMAR TYAGI', '8376035251', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:42 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60007, 1, 'DR BR AMBEDKAR CM SHRI SCHOOL DWARKA', 'C/O PREM KUMAR', '9013637580', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:43 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60008, 1, 'FAIRFIELD INSTITUTE MANAGEMENT TECH', 'CTO VIKASH KUMAR', '9999336674', '', 0, 53, 53, '', '160', 'Thu Sep 24 2026 14:42:44 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60009, 1, 'GBSSS MOTIBAGH', 'S/O VIKRANT KUMAR', '9802333410', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:45 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60010, 1, 'GOVT BOYS SR SEC SCHOOL GHITORNI', 'S/O RAJ KUMAR', '9718383954', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:46 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60011, 1, 'GOVT BOYS SSS TUGLAKBAD', 'S/O DARAB SINGH', '7014280408', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:42:47 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60012, 1, 'GOVT CO ED SEC SCHOOL RAJAPUR KHURD', 'CTO DINESH SINGH', '8130519916', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:48 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60013, 1, 'GOVT CO ED SSS AMBEDKAR NAGAR', 'S/O GAURAV JANGID', '9782669896', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:49 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60014, 1, 'GOVT CO ED SSS BINDAPUR EXTN DELHI', 'MAJ RAJESH KUMAR', '9910241639', '', 0, 26, 26, '', '52', 'Thu Sep 24 2026 14:42:50 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60015, 1, 'GOVT COED SARVODAYA VIDYALAYA NETAJI RK PURAM', 'S/O JITENDER THAUKAR', '9999385255', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:51 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60016, 1, 'GOVTCOED SR SEC SCHOOL MALIKPUR', 'S/O AMIT SARVANG', '7827204574', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:52 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60017, 1, 'GREEN FIELDS SCHOOL', 'S/O PRAMOD KUMAR', '9212281222', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:53 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60018, 1, 'GURU GOVIND SINGH INDRAPRASTH UNIVERSITY', 'LT SUHAIL AHTESHAM', '9056218531', '', 16, 53, 53, '', '160', 'Thu Sep 24 2026 14:42:54 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60019, 1, 'GURU HARIKISHAN PUBLIC SCHOOL', 'S/O RANJEET SINGH', '9311566467', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:42:54 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60020, 1, 'JAMIA SENIOR SECONDARY SCHOOL', 'S/O ATAUR RAHMAN', '8076028386', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:42:55 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60021, 1, 'JAWAHAR NAVODYA VID JAFARPUR', 'S/O RAJENDER PARSHAD', '9915598797', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:56 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60022, 1, 'JAWAHARLAL NEHRU UNIVERSITY', 'LT GAJENDRA PRATAP SINGH', '9910136414', '', 0, 35, 35, '', '104', 'Thu Sep 24 2026 14:42:57 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60023, 1, 'KENDERIYA VIDAYLAYA RANGPURI', 'CTO AMIT SINGH', '9119173322', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:58 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60024, 1, 'MODEN SCHOOL VASANT VIHAR', 'S/O SOMENDER TOKAS', '9810952999', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:42:59 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60025, 1, 'MODERN SCHOOL BARAKHAMBA', 'S/O MANOJ KUMAR', '8920311008', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:00 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60026, 1, 'MOUNT CARMEL SCHOOL', 'S/O ASHWANI KUMAR SINGH', '9971367089', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:01 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60027, 1, 'PM SHRI KENDERIYA VIDALAYA DELHI CANTT', 'S/O VISHAL GULIA', '9315949563', '', 75, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:02 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60028, 1, 'RAHUL MODEL PUBLIC SCHOOL', 'S/O NITISH CHANDELA', '8112216463', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:03 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60029, 1, 'SARVODAYA BAL VIDHAYALA RAJAKORI', 'LT BAJRANG LAL YADAV', '7673987313', '', 0, 23, 23, '', '46', 'Thu Sep 24 2026 14:43:04 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60030, 1, 'SARVODYA BAL VIDALAYA FATEHPUR BERI', 'S/O AMRIT LAL RAIGAR', '9785483523', '', 0, 50, 50, '', '100', 'Thu Sep 24 2026 14:43:05 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60031, 1, 'SBS AF PREP SCH JHARODA', 'CTO RAVI SANDHU', '8377999692', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:06 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60032, 1, 'SBV VCSG SAKET', 'S/O SHISHUPAL SINGH', '9999115178', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:07 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60033, 1, 'SHAYAMA PRASAD VIDALAYA SR SEC SCHOOL', 'S/O MANISHA', '9717129716', '', 17, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:07 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60034, 1, 'ST THOMAS SR SEC SCHOOL', 'S/O AMIT BHARGAV', '9711361189', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:08 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60035, 1, 'UNIVERSAL PUBLIC SCHOOL', 'S/O DEEPAK CHAUHAN', '8178342414', '', 0, 25, 25, '', '50', 'Thu Sep 24 2026 14:43:09 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `institutions` (`id`, `unit_id`, `institution_name`, `ano_cto_name`, `ano_cto_contact`, `pin_code`, `strength_1st_year`, `strength_2nd_year`, `strength_3rd_year`, `google_location`, `complete_address`, `created_at`) VALUES (60036, 1, 'VIDYA BHAWAN MAHA LODHI ESTATE', 'CTO NISHA GAHLOT', '8700839773', '110003', 25, 25, 0, '', '50', 'Thu Sep 24 2026 14:43:10 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;

-- Dumping seed data for `refreshment_items` (4 rows)
INSERT INTO `refreshment_items` (`id`, `item_name`, `unit_price`, `unit_of_measure`, `is_active`, `current_stock`, `min_threshold`, `expiry_date`, `image_url`, `created_at`, `default_gst_rate`, `category`, `last_restocked_at`, `hsn_code`, `optimal_stock`, `cost_price`) VALUES (1, 'Glucose Biscuit Packet (100g)', 13, 'NOS', 1, 299, 10, '2026-12-22', '/items/biscuit.jpg', 'Wed Sep 23 2026 01:16:36 GMT+0530 (India Standard Time)', 5, 'Refreshment', NULL, '2106', 200, 0) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `refreshment_items` (`id`, `item_name`, `unit_price`, `unit_of_measure`, `is_active`, `current_stock`, `min_threshold`, `expiry_date`, `image_url`, `created_at`, `default_gst_rate`, `category`, `last_restocked_at`, `hsn_code`, `optimal_stock`, `cost_price`) VALUES (2, 'Fruit Juice Pack (200ml)', 19, 'NOS', 1, 159, 10, '2026-12-24', '/items/juice.jpg', 'Wed Sep 23 2026 01:16:37 GMT+0530 (India Standard Time)', 5, 'Refreshment', 'Fri Sep 25 2026 16:51:55 GMT+0530 (India Standard Time)', '2106', 200, 19) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `refreshment_items` (`id`, `item_name`, `unit_price`, `unit_of_measure`, `is_active`, `current_stock`, `min_threshold`, `expiry_date`, `image_url`, `created_at`, `default_gst_rate`, `category`, `last_restocked_at`, `hsn_code`, `optimal_stock`, `cost_price`) VALUES (3, 'High-Protein Energy Bar', 35, 'NOS', 1, 100, 10, '2026-12-22', '/items/energy_bar.jpg', 'Wed Sep 23 2026 01:16:37 GMT+0530 (India Standard Time)', 5, 'Refreshment', NULL, '2106', 200, 0) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `refreshment_items` (`id`, `item_name`, `unit_price`, `unit_of_measure`, `is_active`, `current_stock`, `min_threshold`, `expiry_date`, `image_url`, `created_at`, `default_gst_rate`, `category`, `last_restocked_at`, `hsn_code`, `optimal_stock`, `cost_price`) VALUES (5, 'Mineral Water Bottle (500ml)', 10, 'NOS', 1, 100, 10, '2026-12-22', '/items/water.jpg', 'Wed Sep 23 2026 01:16:37 GMT+0530 (India Standard Time)', 5, 'Refreshment', NULL, '2106', 200, 0) ON DUPLICATE KEY UPDATE `id`=`id`;

-- Dumping seed data for `packet_templates` (1 rows)
INSERT INTO `packet_templates` (`id`, `name`, `target_budget`, `gst_rate`, `is_active`, `updated_at`, `created_at`) VALUES (1, 'Cadet Standard Refreshment Packet', 75, 5, 1, 'Wed Sep 23 2026 01:16:13 GMT+0530 (India Standard Time)', 'Wed Sep 23 2026 01:16:13 GMT+0530 (India Standard Time)') ON DUPLICATE KEY UPDATE `id`=`id`;

-- Dumping seed data for `delivery_partners` (3 rows)
INSERT INTO `delivery_partners` (`id`, `name`, `phone`, `vehicle_no`, `assigned_pins`, `is_active`, `created_at`, `login_id`, `password_hash`, `vehicle_type`, `vehicle_model`, `load_capacity_packets`, `max_travel_km`, `rate_per_km`) VALUES (1, 'Rajesh Kumar', '9876543210', 'DL-01-AB-1234 (Eco Van)', '110010, 110021, 110022', 1, 'Wed Sep 23 2026 01:16:34 GMT+0530 (India Standard Time)', '9876543210', '$2a$10$ovPp9OwZaoNUhcLfzc/YLueyqZhYBQqbnkstUWCiAmc6WPwnCSZny', 'ECO', 'Maruti Eeco Cargo Van', 750, 80, 10) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `delivery_partners` (`id`, `name`, `phone`, `vehicle_no`, `assigned_pins`, `is_active`, `created_at`, `login_id`, `password_hash`, `vehicle_type`, `vehicle_model`, `load_capacity_packets`, `max_travel_km`, `rate_per_km`) VALUES (2, 'Vikram Singh', '9876543211', 'DL-04-XY-5678 (Auto Carrier)', '110001, 110002, 110003', 1, 'Wed Sep 23 2026 01:16:34 GMT+0530 (India Standard Time)', '9876543211', '$2a$10$ovPp9OwZaoNUhcLfzc/YLueyqZhYBQqbnkstUWCiAmc6WPwnCSZny', 'THREE_WHEELER', 'Piaggio Ape Auto Cargo', 450, 50, 8) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `delivery_partners` (`id`, `name`, `phone`, `vehicle_no`, `assigned_pins`, `is_active`, `created_at`, `login_id`, `password_hash`, `vehicle_type`, `vehicle_model`, `load_capacity_packets`, `max_travel_km`, `rate_per_km`) VALUES (3, 'Sunil Sharma', '9876543212', 'DL-08-JK-9012 (Delivery Bike)', '110029, 110030', 1, 'Wed Sep 23 2026 01:16:34 GMT+0530 (India Standard Time)', '9876543212', '$2a$10$ovPp9OwZaoNUhcLfzc/YLueyqZhYBQqbnkstUWCiAmc6WPwnCSZny', 'TWO_WHEELER', 'Hero Splendor Delivery Bike', 100, 40, 5) ON DUPLICATE KEY UPDATE `id`=`id`;

SET FOREIGN_KEY_CHECKS = 1;
