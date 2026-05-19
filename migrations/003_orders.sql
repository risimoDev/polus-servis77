-- Migration 003: Orders and payments

CREATE TABLE IF NOT EXISTS `orders` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED DEFAULT NULL,
  `name`        VARCHAR(100)    NOT NULL,
  `phone`       VARCHAR(30)     NOT NULL,
  `email`       VARCHAR(255)    DEFAULT NULL,
  `address`     VARCHAR(500)    DEFAULT NULL,
  `items`       JSON            NOT NULL,           -- [{product_id, name, price, qty}]
  `total`       DECIMAL(12,2)   NOT NULL,
  `status`      ENUM('new','confirmed','shipping','done','cancelled') NOT NULL DEFAULT 'new',
  `payment_id`  VARCHAR(255)    DEFAULT NULL,       -- Yookassa payment UUID
  `payment_url` VARCHAR(1000)   DEFAULT NULL,       -- redirect URL for payment
  `notes`       TEXT            DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user`       (`user_id`),
  INDEX `idx_status`     (`status`),
  INDEX `idx_payment`    (`payment_id`),
  INDEX `idx_created`    (`created_at`),
  CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_history` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   BIGINT UNSIGNED NOT NULL,
  `status`     VARCHAR(50)     NOT NULL,
  `comment`    TEXT            DEFAULT NULL,
  `created_by` BIGINT UNSIGNED DEFAULT NULL,        -- user (admin) who made the change
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order` (`order_id`),
  CONSTRAINT `fk_hist_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
