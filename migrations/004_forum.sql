-- Migration 004: Forum (threads + replies + reactions)

CREATE TABLE IF NOT EXISTS `forum_threads` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `title`      VARCHAR(300)    NOT NULL,
  `body`       TEXT            NOT NULL,
  `is_pinned`  TINYINT(1)      NOT NULL DEFAULT 0,
  `is_locked`  TINYINT(1)      NOT NULL DEFAULT 0,
  `views`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `replies`    INT UNSIGNED    NOT NULL DEFAULT 0,  -- denormalized counter
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user`    (`user_id`),
  INDEX `idx_pinned`  (`is_pinned`),
  INDEX `idx_created` (`created_at`),
  FULLTEXT INDEX `ft_forum` (`title`, `body`),
  CONSTRAINT `fk_thread_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forum_replies` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `thread_id`  BIGINT UNSIGNED NOT NULL,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `body`       TEXT            NOT NULL,
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_thread` (`thread_id`),
  INDEX `idx_user`   (`user_id`),
  CONSTRAINT `fk_reply_thread` FOREIGN KEY (`thread_id`) REFERENCES `forum_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reply_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`          (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forum_reactions` (
  `thread_id`  BIGINT UNSIGNED DEFAULT NULL,
  `reply_id`   BIGINT UNSIGNED DEFAULT NULL,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `type`       ENUM('like','dislike') NOT NULL DEFAULT 'like',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_thread_reaction` (`thread_id`, `user_id`),
  UNIQUE KEY `uq_reply_reaction`  (`reply_id`,  `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
