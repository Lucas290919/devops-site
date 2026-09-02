# DevOps World — Documentação Completa do Projeto

> Registro completo de tudo que foi construído, as decisões tomadas,
> os erros encontrados e como foram resolvidos.
> Data de criação: 27 de agosto de 2026.

---

## Índice

1. [A Ideia](#1-a-ideia)
2. [Arquitetura Final](#2-arquitetura-final)
3. [Estrutura de Arquivos](#3-estrutura-de-arquivos)
4. [Banco de Dados](#4-banco-de-dados)
5. [Backend — API REST](#5-backend--api-rest)
6. [Frontend — SPA](#6-frontend--spa)
7. [NGINX](#7-nginx)
8. [Docker Compose](#8-docker-compose)
9. [Cronologia de Desenvolvimento](#9-cronologia-de-desenvolvimento)
10. [Erros Cometidos e Soluções](#10-erros-cometidos-e-soluções)
11. [Decisões de Arquitetura](#11-decisões-de-arquitetura)
12. [Como Rodar](#12-como-rodar)
13. [API Reference](#13-api-reference)
14. [Variáveis de Ambiente](#14-variáveis-de-ambiente)
15. [Próximos Passos Sugeridos](#15-próximos-passos-sugeridos)

---

## 1. A Ideia

O **DevOps World** nasceu como um site pessoal de portfólio com tema DevOps. A ideia central era construir uma aplicação completa que:

- **Apresentasse** as principais ferramentas do universo DevOps: Docker, Terraform e AWS, com exemplos de código e explicações práticas.
- **Tivesse autenticação real** — cadastro e login com senha, sem depender de serviços externos.
- **Permitisse gerenciar projetos DevOps pessoais** — um CRUD completo onde o usuário cria, edita, filtra e exclui projetos.
- **Tivesse subtarefas dentro dos projetos** — para detalhar os passos de cada iniciativa, com marcação de conclusão e barra de progresso visual.
- **Fosse executado completamente via Docker** — sem instalar nada além do Docker na máquina.

A estética escolhida foi **dark mode** com gradientes azul/roxo, terminal animado na hero section e visual inspirado em ferramentas CLI reais.

---

## 2. Arquitetura Final

```
Browser
   │
   ▼
NGINX :80  (nginx:1.27-alpine)
   ├── /              → Arquivos estáticos do frontend (HTML/CSS/JS)
   ├── /nginx-health  → Stub local de healthcheck (sem dependência externa)
   └── /api/*         → Proxy reverso ──► Node.js :3000
                                              │
                                    ┌─────────┴─────────┐
                                  MySQL :3306        JWT HS256
                               (devops_site DB)   (autenticação)
```

### Stack de tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Servidor web | NGINX Alpine | 1.27 |
| Runtime backend | Node.js Alpine | 20 |
| Framework API | Express | 4.19.2 |
| Banco de dados | MySQL | 8.4 |
| Driver MySQL | mysql2 | 3.10.1 |
| Autenticação | JWT (jsonwebtoken) | 9.0.2 |
| Hashing de senha | PBKDF2-SHA256 (crypto nativo) | — |
| IDs únicos | UUID v4 | 10.0.0 |
| Orquestração | Docker Compose | v2 |
| Frontend | HTML5 + CSS3 + JavaScript puro | — |
| Fontes | Inter + JetBrains Mono (Google Fonts) | — |

---

## 3. Estrutura de Arquivos

```
devops-site/
│
├── docker-compose.yml          # Orquestração dos 3 serviços
│
├── db/
│   └── init.sql                # DDL + seed + migração automática
│
├── nginx/
│   └── nginx.conf              # Proxy reverso + cache + segurança
│
├── backend/
│   ├── Dockerfile              # Imagem Node.js 20 Alpine (multi-stage)
│   ├── package.json            # Dependências (sem AWS SDK)
│   ├── .env.example            # Template de variáveis de ambiente
│   ├── .gitignore
│   ├── server.js               # Entry point Express
│   ├── lib/
│   │   └── db.js               # Pool de conexões MySQL
│   ├── middleware/
│   │   ├── auth.js             # Validação JWT + signToken
│   │   └── errorHandler.js     # Handler global de erros + 404
│   └── routes/
│       ├── auth.js             # /api/auth/* (register, login, me, PATCH, DELETE)
│       └── projects.js         # /api/projects/* (CRUD + subtasks)
│
└── frontend/
    ├── Dockerfile              # (não usado pelo compose — imagem nginx direta)
    ├── index.html              # SPA completa com todos os modais
    ├── css/
    │   └── style.css           # Design system completo (dark theme)
    └── js/
        ├── config.js           # API_BASE_URL = '/api'
        ├── auth.js             # Autenticação via fetch → /api/auth/*
        ├── api.js              # CRUD de projetos via fetch → /api/projects/*
        └── app.js              # Router SPA, terminal animado, modais, CRUD UI
```

---

## 4. Banco de Dados

### Schema

```sql
-- Banco: devops_site (utf8mb4)

-- Tabela users
CREATE TABLE users (
  id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(254)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,  -- PBKDF2: "salt_hex:hash_hex"
  name       VARCHAR(120)  NOT NULL DEFAULT '',
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela projects
CREATE TABLE projects (
  id           CHAR(36)     PRIMARY KEY,  -- UUID v4
  user_id      INT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  technologies JSON         DEFAULT (JSON_ARRAY()),  -- ex: ["Docker","Terraform"]
  subtasks     JSON         DEFAULT (JSON_ARRAY()),  -- ex: [{"id":"s1","title":"...","done":false}]
  status       ENUM('em-andamento','concluido','pausado') DEFAULT 'em-andamento',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Estrutura de uma subtarefa (JSON)

```json
{
  "id":    "st-1724768400000-ab3x7",
  "title": "Configurar pipeline de build",
  "done":  false
}
```

### Usuário demo (seed)

| Campo | Valor |
|-------|-------|
| Email | `demo@devops.local` |
| Senha | `demo1234` |
| Hash  | PBKDF2-SHA256, 100.000 iterações, salt fixo |

### Migração automática

O `init.sql` detecta se a coluna `subtasks` já existe (para volumes antigos) e executa o `ALTER TABLE` somente se necessário — evitando erros ao reiniciar o compose sem `-v`.

---

## 5. Backend — API REST

### Autenticação

Usa **JWT HS256** com segredo definido em `JWT_SECRET`. O token é gerado no login/registro e enviado pelo frontend no header `Authorization: Bearer <token>`.

A senha é hasheada com **PBKDF2-SHA256** nativo do Node.js (100.000 iterações, salt aleatório de 16 bytes). Formato armazenado: `salt_hex:hash_hex`. A comparação usa `crypto.timingSafeEqual` para evitar timing attacks.

### Endpoints

#### Autenticação (`/api/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/register` | ❌ | Cria conta. Retorna `{token, user}` |
| POST | `/api/auth/login` | ❌ | Login. Retorna `{token, user}` |
| GET | `/api/auth/me` | ✅ | Dados do usuário logado |
| PATCH | `/api/auth/me` | ✅ | Atualiza nome do usuário |
| DELETE | `/api/auth/me` | ✅ | Exclui conta (cascata nos projetos) |

#### Projetos (`/api/projects`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/projects` | ✅ | Lista projetos do usuário |
| POST | `/api/projects` | ✅ | Cria projeto |
| PUT | `/api/projects/:id` | ✅ | Atualiza projeto (campos dinâmicos) |
| DELETE | `/api/projects/:id` | ✅ | Remove projeto |

#### Healthcheck

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Retorna `{status:"ok", timestamp}` |

### Middlewares

- **`requireAuth`** — extrai e valida o JWT. Popula `req.user = {id, email}`.
- **`errorHandler`** — captura qualquer erro lançado nas rotas e retorna JSON padronizado.
- **`notFound`** — 404 para rotas inexistentes.

---

## 6. Frontend — SPA

Single Page Application em JavaScript puro — sem framework (sem React, Vue ou Angular).

### Páginas (sections)

| ID | Nome | Descrição |
|----|------|-----------|
| `page-home` | Home | Hero com terminal animado, cards de tecnologias, pipeline DevOps, CTA |
| `page-docker` | Docker | Explicação, exemplos de Dockerfile e Docker Compose, benefícios |
| `page-terraform` | Terraform | Explicação, exemplo HCL, fluxo write→plan→apply, benefícios |
| `page-aws` | AWS | Grid de serviços (EC2, S3, DynamoDB, Lambda etc.), arquitetura |
| `page-projects` | Meus Projetos | CRUD de projetos com subtarefas (requer login) |

### Modais

| ID | Propósito |
|----|-----------|
| `modal-login` | Formulário de login |
| `modal-register` | Formulário de cadastro (nome + email + senha) |
| `modal-profile` | Editar nome, excluir conta |
| `modal-confirm-delete` | Confirmação antes de excluir conta |
| `modal-project` | Criar/editar projeto |
| `modal-confirm-delete-project` | Confirmação antes de excluir projeto |

### Arquivos JS

| Arquivo | Responsabilidade |
|---------|-----------------|
| `config.js` | `API_BASE_URL = '/api'` |
| `auth.js` | `authSignUp`, `authSignIn`, `authSignOut`, `authGetCurrentUser`, `authUpdateUser`, `authDeleteUser` — tudo via fetch para `/api/auth/*` |
| `api.js` | `apiGetProjects`, `apiCreateProject`, `apiUpdateProject`, `apiDeleteProject` — modo demo via localStorage se backend indisponível |
| `app.js` | Router SPA, terminal animado, navbar, modais, CRUD UI, subtarefas |

### Subtarefas (funcionalidade principal dos cards)

Cada card de projeto exibe:
- **Cabeçalho** com título "Subtarefas" e contador `x/total`
- **Barra de progresso** verde proporcional ao percentual concluído
- **Lista de itens** — clicar marca/desmarca com atualização imediata (UI optimista) e persiste no backend
- **Texto riscado e escurecido** (`text-decoration: line-through` + `opacity: 0.55`) nos itens concluídos
- **Input inline** — digita e pressiona Enter ou clica `+` para adicionar nova subtarefa sem abrir modal

### Logo como botão

O logo **⚙️ DevOpsWorld** na navbar é uma tag `<a>` com `data-page="home"` — clicar navega para a home sem recarregar a página.

---

## 7. NGINX

Arquivo: `nginx/nginx.conf`

### Responsabilidades

- Serve os arquivos estáticos do frontend (HTML, CSS, JS)
- Proxy reverso de `/api/*` → `http://backend:3000`
- **SPA fallback**: `try_files $uri $uri/ /index.html` — qualquer rota desconhecida devolve o `index.html`
- `/nginx-health` — stub local (`return 200 "ok"`) usado pelo healthcheck do Docker, sem depender do backend
- `/health` — proxy para o endpoint de health do backend (uso externo)
- Headers de segurança: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
- Gzip habilitado para JS, CSS, JSON, SVG
- Cache **desabilitado** para `.js` e `.css` (`no-store`) — garante que o browser sempre busca a versão mais recente
- Cache longo (1 ano) para imagens e fontes

---

## 8. Docker Compose

Três serviços em uma rede interna `devops-net`:

```
mysql ──healthcheck──► backend ──depends_on──► frontend
```

| Serviço | Imagem | Porta exposta | Healthcheck |
|---------|--------|---------------|-------------|
| `mysql` | `mysql:8.4` | `3306` (pública) | `mysqladmin ping` |
| `backend` | build local `node:20-alpine` | `3000` (interna) | `wget /health` |
| `frontend` | `nginx:1.27-alpine` | `80` (pública) | `wget /nginx-health` |

O frontend é servido **sem Dockerfile próprio** — a imagem nginx oficial recebe o `nginx.conf` e os arquivos estáticos via volume bind-mount.

Volume `mysql_data` persiste os dados do banco entre restarts.

---

## 9. Cronologia de Desenvolvimento

### Fase 1 — Estrutura inicial (AWS)
O projeto começou com a ideia de usar **AWS Cognito** para autenticação e **DynamoDB** para persistência. Foi criado:
- `index.html` completo com SPA, modais e todas as seções
- `style.css` com design dark moderno
- `config.js` apontando para Cognito
- `auth.js` usando AWS Amplify SDK via CDN
- `api.js` com CRUD em DynamoDB
- Backend Node.js com `@aws-sdk/client-dynamodb`, `jwks-rsa` para validação JWT Cognito
- `nginx.conf` com proxy reverso
- `docker-compose.yml` com dois serviços (frontend + backend)

### Fase 2 — Refatoração para MySQL local
A decisão foi remover toda dependência AWS para testes locais, mantendo a porta aberta para conectar um RDS depois. Mudanças:
- Removidos: `@aws-sdk/*`, `jwks-rsa`, AWS Amplify CDN
- Adicionado: `mysql2`, JWT HS256 local, PBKDF2 nativo
- `lib/dynamo.js` → `lib/db.js` (pool MySQL)
- `middleware/auth.js` reescrito sem Cognito
- `routes/projects.js` reescrito com SQL puro
- `routes/auth.js` criado do zero com register/login/me
- `db/init.sql` criado com DDL + seed
- `docker-compose.yml` ganhou o serviço MySQL

### Fase 3 — Correção dos erros de inicialização
Vários bugs impediram o compose de subir. Todos foram identificados e corrigidos (detalhes na seção 10).

### Fase 4 — UX e autenticação
- Logo virou botão de navegação para home
- Remoção completa do fluxo de confirmação de email — após cadastro, login é automático
- `auth.js` frontend reescrito para chamar o backend local via fetch (sem Amplify)
- `config.js` simplificado para `API_BASE_URL = '/api'`
- NGINX configurado para não cachear JS/CSS

### Fase 5 — Subtarefas
- Coluna `subtasks JSON` adicionada à tabela `projects`
- Backend atualizado para incluir subtasks em todos os endpoints
- Cards de projeto ganharam seção de subtarefas com:
  - Checkbox visual customizado
  - Texto riscado e escurecido nos itens concluídos
  - Barra de progresso
  - Input inline para adicionar novas subtarefas
  - Persistência automática via PUT no backend

---

## 10. Erros Cometidos e Soluções

### Erro 1 — `version:` obsoleto no docker-compose
**Problema:** O campo `version: "3.9"` gerava warning de obsoleto no Docker Compose v2 e em algumas versões causava falha.  
**Solução:** Removido completamente. O Compose v2 não exige mais esse campo.

---

### Erro 2 — Dockerfile com `--frozen-lockfile` sem `package-lock.json`
**Problema:** O Dockerfile do backend usava `npm install --frozen-lockfile`, mas o repositório não tinha `package-lock.json`. O build falhava com erro de lockfile ausente.  
**Solução:** Substituído por `npm install --omit=dev` simples.

---

### Erro 3 — Hash de senha incompatível no seed
**Problema:** O `init.sql` inicial tinha um hash **bcrypt** (`$2b$10$...`) no usuário demo, mas o backend usava **PBKDF2-SHA256**. O login do usuário demo nunca funcionaria — as funções de verificação são incompatíveis.  
**Solução:** Gerado o hash PBKDF2 correto para `demo1234` usando Python3 com o mesmo algoritmo do backend, e atualizado o seed.

---

### Erro 4 — Healthcheck do NGINX dependia do backend
**Problema:** O endpoint `/health` do NGINX fazia proxy para o backend. O healthcheck do Docker apontava para esse endpoint. Se o backend ainda não estava pronto, o healthcheck do NGINX falhava, criando um deadlock na ordem de inicialização.  
**Solução:** Criado `/nginx-health` como stub puro (`return 200 "ok"`) no próprio NGINX, sem proxy. O healthcheck do Docker passou a usar esse endpoint.

---

### Erro 5 — Cache do browser servindo JS antigo
**Problema:** O NGINX estava configurado com `cache: 1y` para todos os arquivos estáticos incluindo `.js`. Após mudanças no `auth.js` e `app.js`, o browser continuava executando as versões antigas em cache. O sintoma visível era a mensagem de erro "Confirme seu e-mail antes de entrar." vindo do código antigo do modo demo, mesmo depois de o código ter sido atualizado no servidor.  
**Solução:**
1. Imediata: abrir em aba anônima ou limpar o cache manualmente.
2. Definitiva: NGINX reconfigurado com `Cache-Control: no-store` para `.js` e `.css`, e cache longo mantido apenas para imagens e fontes.

---

### Erro 6 — Mensagem "Confirme seu e-mail" mesmo sem código de confirmação
**Problema:** Após remover o fluxo de confirmação do código JS, a mensagem continuava aparecendo. A investigação mostrou que a mensagem vinha do **localStorage do browser** — o `auth.js` antigo (modo demo) gravava `confirmed: false` e bloqueava o login via `_demoSignIn`.  
**Solução:** Limpar o localStorage do browser + corrigir o cache do NGINX (ver Erro 5).

---

### Erro 7 — Coluna `subtasks` não existia no banco em execução
**Problema:** Após adicionar a coluna `subtasks` ao `init.sql` e reiniciar o compose **sem** o flag `-v`, o volume MySQL foi reaproveitado. O `init.sql` só é executado na primeira criação do volume, então a coluna nunca foi adicionada ao banco já existente. Todos os endpoints retornavam `Unknown column 'subtasks' in 'field list'`.  
**Solução:**
1. Imediata: `ALTER TABLE projects ADD COLUMN subtasks JSON ...` executado diretamente no container MySQL em execução.
2. Definitiva: Bloco de migração automática adicionado ao `init.sql` — usa `information_schema.COLUMNS` para verificar se a coluna existe antes de tentar criá-la. Funciona tanto em volumes novos quanto em volumes antigos.

---

### Erro 8 — Frontend Dockerfile com `COPY ../nginx/nginx.conf`
**Problema:** O `frontend/Dockerfile` tentava copiar `../nginx/nginx.conf` para dentro da imagem, mas o contexto de build do Docker não permite acessar arquivos fora do diretório especificado em `context:`. Isso causaria falha no `docker build`.  
**Solução:** O frontend passou a usar a imagem `nginx:1.27-alpine` diretamente no compose, sem Dockerfile próprio. O `nginx.conf` e os arquivos estáticos são montados via bind-mount de volumes.

---

## 11. Decisões de Arquitetura

### Por que MySQL em vez de DynamoDB?
O objetivo era ter um ambiente de desenvolvimento local completo, funcional e rápido de iniciar. DynamoDB exige credenciais AWS ou uso do `dynamodb-local` (outra dependência). MySQL roda nativamente em Docker com dados persistentes e é familiar para a maioria dos desenvolvedores. A porta para o RDS (AWS) fica aberta — basta trocar as 4 variáveis `DB_*` no compose.

### Por que PBKDF2 e não bcrypt?
bcrypt é a escolha padrão da indústria para hashing de senhas. No entanto, exigiria adicionar a dependência `bcrypt` (que tem binários nativos compilados, complicando o build Docker). O `crypto` módulo nativo do Node.js implementa PBKDF2 com segurança equivalente para os parâmetros usados (100.000 iterações, SHA-256, 64 bytes de output). A decisão prioriza zero dependências extras. Em produção, migrar para `bcrypt` ou `argon2` seria o caminho recomendado.

### Por que JWT HS256 local em vez de Cognito?
Cognito é um serviço AWS gerenciado excelente para produção, mas requer configuração de User Pool, App Client e variáveis específicas de conta. Para desenvolvimento local e portfólio, JWT com segredo local é suficiente, portátil e não requer conta AWS ativa.

### Por que JavaScript puro no frontend?
O projeto tem foco em DevOps e infraestrutura, não em demonstrar domínio de frameworks frontend. JS puro mantém o projeto simples, sem build step (`npm run build`, Webpack, Vite etc.), o que facilita o desenvolvimento com hot-reload via bind-mount no Docker.

### Por que subtarefas em JSON no MySQL e não em tabela separada?
Uma tabela separada `subtasks` seria mais normalizada, mas exigiria JOINs e queries mais complexas. Como as subtarefas são sempre lidas e escritas junto com o projeto (nunca de forma independente), armazená-las como JSON na coluna `subtasks` é mais simples, performático para este volume de dados e evita a criação de mais endpoints.

---

## 12. Como Rodar

### Requisitos
- Docker Engine >= 24
- Docker Compose v2
- Usuário no grupo `docker`: `sudo usermod -aG docker $USER && newgrp docker`

### Primeira execução

```bash
cd ~/.local/bin/devops-site
docker compose up -d --build
```

Aguarde ~30 segundos para o MySQL inicializar e o backend conectar.

### Verificar status

```bash
docker compose ps
docker compose logs -f
```

### Acessar

- Site: http://localhost
- API health: http://localhost/health
- MySQL (clientes externos): `localhost:3306` — usuário `devops`, senha `devops`

### Usuário demo

| Campo | Valor |
|-------|-------|
| Email | `demo@devops.local` |
| Senha | `demo1234` |

### Reiniciar mantendo dados

```bash
docker compose restart
# ou
docker compose down && docker compose up -d
```

### Reiniciar do zero (apaga banco)

```bash
docker compose down -v
docker compose up -d --build
```

### Atualizar código do backend

```bash
docker compose up -d --build backend
```

### Atualizar frontend (HTML/CSS/JS)

Não precisa rebuild. Os arquivos são montados via volume — basta recarregar o browser com `Ctrl+F5`.

---

## 13. API Reference

Base URL: `http://localhost/api`

Endpoints protegidos exigem: `Authorization: Bearer <token>`

### POST /api/auth/register

```json
// Request
{ "name": "João", "email": "joao@email.com", "password": "minhasenha123" }

// Response 201
{ "token": "eyJ...", "user": { "id": 2, "email": "joao@email.com", "name": "João" } }
```

### POST /api/auth/login

```json
// Request
{ "email": "joao@email.com", "password": "minhasenha123" }

// Response 200
{ "token": "eyJ...", "user": { "id": 2, "email": "joao@email.com", "name": "João" } }
```

### GET /api/projects *(autenticado)*

```json
// Response 200
[
  {
    "id": "uuid-v4",
    "name": "Pipeline CI/CD",
    "description": "...",
    "technologies": ["Docker", "GitHub Actions"],
    "subtasks": [
      { "id": "s1", "title": "Criar workflow", "done": true },
      { "id": "s2", "title": "Configurar deploy", "done": false }
    ],
    "status": "em-andamento",
    "created_at": "2026-08-27T15:00:00",
    "updated_at": "2026-08-27T15:30:00"
  }
]
```

### POST /api/projects *(autenticado)*

```json
// Request
{
  "name": "Novo Projeto",
  "description": "Descrição opcional",
  "technologies": ["Docker", "Terraform"],
  "subtasks": [
    { "id": "s1", "title": "Primeiro passo", "done": false }
  ],
  "status": "em-andamento"
}
```

Status válidos: `em-andamento` | `concluido` | `pausado`

### PUT /api/projects/:id *(autenticado)*

Aceita qualquer subconjunto dos campos. Atualiza apenas os campos enviados. Especialmente útil para atualizar só as subtarefas:

```json
{ "subtasks": [{ "id": "s1", "title": "Primeiro passo", "done": true }] }
```

### DELETE /api/projects/:id *(autenticado)*

```json
// Response 200
{ "deleted": true, "id": "uuid-v4" }
```

---

## 14. Variáveis de Ambiente

Arquivo: `backend/.env` (copie de `backend/.env.example`)

| Variável | Padrão no compose | Descrição |
|----------|------------------|-----------|
| `DB_HOST` | `mysql` | Hostname do MySQL (nome do serviço Docker) |
| `DB_PORT` | `3306` | Porta MySQL |
| `DB_USER` | `devops` | Usuário MySQL |
| `DB_PASSWORD` | `devops` | Senha MySQL |
| `DB_NAME` | `devops_site` | Nome do banco |
| `JWT_SECRET` | `troque-este-segredo-em-producao` | Segredo para assinar tokens JWT |
| `JWT_EXPIRES_IN` | `8h` | Duração do token |
| `PORT` | `3000` | Porta do servidor Node.js |
| `NODE_ENV` | `production` | Ambiente |
| `ALLOWED_ORIGINS` | `http://localhost,...` | Origens CORS permitidas |

**Para produção (RDS):** troque `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` pelo endpoint do RDS. O código do backend não precisa mudar.

---

## 15. Próximos Passos Sugeridos

### Curto prazo
- [ ] Trocar `JWT_SECRET` por um valor forte gerado com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- [ ] Adicionar HTTPS com Let's Encrypt (descomentando o bloco no `nginx.conf`)
- [ ] Migrar hash de senha de PBKDF2 para `argon2` ou `bcrypt`

### Médio prazo
- [ ] Conectar ao RDS MySQL ao invés do container local
- [ ] Adicionar autenticação OAuth (Google, GitHub) usando o backend local como intermediário
- [ ] Implementar paginação na listagem de projetos
- [ ] Adicionar upload de imagem/avatar no perfil (S3)

### Longo prazo
- [ ] Deploy em EC2 com CI/CD via GitHub Actions
- [ ] Infraestrutura provisionada via Terraform (VPC, EC2, RDS, ALB)
- [ ] Monitoramento com CloudWatch ou Prometheus + Grafana
- [ ] Kubernetes (EKS) para orquestração em produção

---

*Documentação gerada em 27 de agosto de 2026.*  
*Projeto desenvolvido inteiramente em uma única sessão de trabalho.*
