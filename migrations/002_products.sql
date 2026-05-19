-- Migration 002: Product catalog (categories + products)

CREATE TABLE IF NOT EXISTS `categories` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `parent_id`   INT UNSIGNED   DEFAULT NULL,
  `name`        VARCHAR(200)   NOT NULL,
  `slug`        VARCHAR(200)   NOT NULL,
  `description` TEXT           DEFAULT NULL,
  `image`       VARCHAR(500)   DEFAULT NULL,
  `sort_order`  SMALLINT       NOT NULL DEFAULT 0,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`),
  INDEX `idx_parent` (`parent_id`),
  CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED    DEFAULT NULL,
  `name`        VARCHAR(300)    NOT NULL,
  `slug`        VARCHAR(300)    NOT NULL,
  `description` TEXT            DEFAULT NULL,
  `price`       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `old_price`   DECIMAL(12,2)   DEFAULT NULL,
  `stock`       INT             NOT NULL DEFAULT 0,
  `images`      JSON            DEFAULT NULL,       -- array of image paths
  `specs`       JSON            DEFAULT NULL,       -- key-value specification table
  `is_active`   TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`),
  INDEX `idx_category`  (`category_id`),
  INDEX `idx_active`    (`is_active`),
  INDEX `idx_price`     (`price`),
  FULLTEXT INDEX `ft_search` (`name`, `description`),
  CONSTRAINT `fk_prod_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed example categories
INSERT IGNORE INTO `categories` (name, slug, sort_order) VALUES
  ('Котлы отопительные',          'kotly',          1),
  ('Теплообменники',               'teploobmenniki', 2),
  ('Насосное оборудование',        'nasosy',         3),
  ('Трубопроводная арматура',      'armatura',       4),
  ('Автоматика и контроллеры',     'avtomatika',     5),
  ('Расходные материалы',          'rashodni',       6);
