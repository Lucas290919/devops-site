-- =============================================================================
-- db/init.sql
-- Script de inicialização do banco de dados devopsSite.
-- Executado automaticamente pelo container MySQL na primeira vez que sobe.
--
-- Dados de demonstração NÃO estão aqui — use db/seeds-dev.sql localmente.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS devopsSite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE devopsSite;

-- -----------------------------------------------------------------------------
-- Tabela: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email      VARCHAR(254)    NOT NULL,
  password   VARCHAR(255)    NOT NULL COMMENT 'PBKDF2-SHA256 — formato: salt_hex:hash_hex',
  name       VARCHAR(120)    NOT NULL DEFAULT '',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tabela: projects
-- technologies e subtasks são arrays JSON.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id           CHAR(36)        NOT NULL COMMENT 'UUID v4',
  user_id      INT UNSIGNED    NOT NULL,
  name         VARCHAR(120)    NOT NULL,
  description  TEXT,
  technologies JSON            NOT NULL DEFAULT (JSON_ARRAY()),
  subtasks     JSON            NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Array de {id, title, done}',
  status       ENUM('em-andamento','concluido','pausado')
                               NOT NULL DEFAULT 'em-andamento',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_projects_user_id  (user_id),
  KEY idx_projects_status   (status),
  KEY idx_projects_created  (created_at),
  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migração: adiciona subtasks caso o volume já exista sem a coluna
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'devopsSite'
    AND TABLE_NAME   = 'projects'
    AND COLUMN_NAME  = 'subtasks'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE projects ADD COLUMN subtasks JSON NOT NULL DEFAULT (JSON_ARRAY()) AFTER technologies',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
