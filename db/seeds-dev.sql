-- =============================================================================
-- db/seeds-dev.sql
-- Dados de demonstração para ambiente LOCAL de desenvolvimento.
--
-- NÃO execute este script em produção.
--
-- Como usar:
--   docker exec -i devops-site-mysql mysql -u devops -p devopsSite < db/seeds-dev.sql
--
-- Usuário criado: demo@devops.local / demo1234
-- Hash: PBKDF2-SHA256, 100.000 iterações, 64 bytes (mesmo algoritmo do backend).
-- Formato: <salt_hex>:<hash_hex>
-- =============================================================================

USE devopsSite;

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
