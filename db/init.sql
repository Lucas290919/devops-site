-- =============================================================================
-- db/init.sql
-- Script de inicialização do banco de dados devops_site.
-- Executado automaticamente pelo container MySQL na primeira vez que sobe.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS devops_site
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE devops_site;

-- -----------------------------------------------------------------------------
-- Tabela: users
-- Armazena os usuários da aplicação.
-- A senha é armazenada como hash bcrypt — NUNCA em texto puro.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email      VARCHAR(254)    NOT NULL,
  password   VARCHAR(255)    NOT NULL COMMENT 'hash bcrypt',
  name       VARCHAR(120)    NOT NULL DEFAULT '',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tabela: projects
-- CRUD de projetos DevOps vinculados a um usuário.
-- technologies armazena um array JSON (ex: ["Docker","Terraform"]).
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
  KEY idx_projects_user_id (user_id),
  KEY idx_projects_status  (status),
  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migração: adiciona subtasks caso o volume já exista sem a coluna
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'devops_site'
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

-- -----------------------------------------------------------------------------
-- Dados de teste
-- Usuário demo com senha "demo1234"
-- Hash gerado com PBKDF2-SHA256, 100.000 iterações, 64 bytes — mesmo algoritmo do backend.
-- Formato: <salt_hex>:<hash_hex>
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO users (id, email, password, name) VALUES
  (1, 'demo@devops.local',
   'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4:d7d7f9796c770a1c58869d7ad9afd63381301f313cb3fce981a02a75b8feb4e75299912ffb6643f6612cff9a2d9084b55cbee5fb07b3163065a3668b85876146',
   'Demo User');

INSERT IGNORE INTO projects (id, user_id, name, description, technologies, subtasks, status) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 1,
   'Pipeline CI/CD com GitHub Actions',
   'Automação de build, test e deploy na AWS usando GitHub Actions e Docker.',
   JSON_ARRAY('GitHub Actions','Docker','Node.js'),
   JSON_ARRAY(
     JSON_OBJECT('id','s1','title','Criar workflow de build','done',true),
     JSON_OBJECT('id','s2','title','Configurar testes automatizados','done',false),
     JSON_OBJECT('id','s3','title','Deploy automático para EC2','done',false)
   ),
   'em-andamento'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 1,
   'Infraestrutura como Código com Terraform',
   'Provisionamento de VPC, EC2 e RDS na AWS via Terraform.',
   JSON_ARRAY('Terraform','AWS','EC2','RDS'),
   JSON_ARRAY(
     JSON_OBJECT('id','s4','title','Criar módulo VPC','done',true),
     JSON_OBJECT('id','s5','title','Provisionar instância EC2','done',true),
     JSON_OBJECT('id','s6','title','Configurar RDS MySQL','done',true)
   ),
   'concluido'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 1,
   'Monitoramento com Prometheus e Grafana',
   'Stack de observabilidade com métricas, alertas e dashboards.',
   JSON_ARRAY('Prometheus','Grafana','Docker Compose'),
   JSON_ARRAY(
     JSON_OBJECT('id','s7','title','Subir stack com Docker Compose','done',true),
     JSON_OBJECT('id','s8','title','Criar dashboards no Grafana','done',false)
   ),
   'pausado');
