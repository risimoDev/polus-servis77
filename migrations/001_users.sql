-- Migration 001: Users and sessions
-- Run: mysql -u root -p polus_servis < migrations/001_users.sql

CREATE TABLE IF NOT EXISTS `users` (
  `id`                BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(100)       NOT NULL,
  `email`             VARCHAR(255)       NOT NULL,
  `password_hash`     VARCHAR(255)       NOT NULL,
  `phone`             VARCHAR(30)        DEFAULT NULL,
  `role`              ENUM('user','manager','admin') NOT NULL DEFAULT 'user',
  `email_verified_at` DATETIME           DEFAULT NULL,
  `created_at`        DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`          VARCHAR(64)    NOT NULL,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `ip`          VARCHAR(45)    DEFAULT NULL,
  `user_agent`  TEXT           DEFAULT NULL,
  `expires_at`  DATETIME       NOT NULL,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user`    (`user_id`),
  INDEX `idx_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `email`      VARCHAR(255) NOT NULL,
  `token`      VARCHAR(64)  NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default admin (password: change_me_now!)
-- INSERT INTO users (name, email, password_hash, role)
-- VALUES ('Администратор', 'admin@polus-servis77.ru', '$2y$12$...', 'admin');
