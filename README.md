# devops-site

Site pessoal de portfólio DevOps com autenticação AWS Cognito, CRUD de projetos no DynamoDB e stack Docker-based (NGINX + Node.js).

---

## Índice

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Configuração AWS](#configuração-aws)
- [Rodando localmente com Docker](#rodando-localmente-com-docker)
- [Deploy em EC2](#deploy-em-ec2)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [API Reference](#api-reference)

---

## Visão geral

| Recurso | Tecnologia |
|---------|-----------|
| Frontend | HTML5 / CSS3 / JavaScript (SPA) |
| Servidor web | NGINX 1.27 |
| Backend API | Node.js 20 + Express |
| Autenticação | AWS Cognito (JWT RS256) |
| Banco de dados | AWS DynamoDB |
| Containers | Docker + Docker Compose |

---

## Arquitetura

```
Cliente (browser)
       │
       ▼
  NGINX :80
  ├── / → frontend estático (HTML/CSS/JS)
  └── /api/ → proxy reverso → Node.js :3000
                                    │
                              ┌─────┴──────┐
                        Cognito JWKS   DynamoDB
                        (validação JWT)  (projetos)
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.20
- Conta AWS com permissões para Cognito e DynamoDB

---

## Configuração AWS

### 1. DynamoDB — Criar tabela

```bash
aws dynamodb create-table \
  --table-name devops-site-projects \
  --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=id,AttributeType=S \
  --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

> A tabela usa `userId` como chave de partição e `id` (UUID) como chave de ordenação.
> O modo `PAY_PER_REQUEST` evita custos fixos e é ideal para projetos pessoais.

### 2. Cognito — Criar User Pool

1. Acesse o console AWS → **Cognito** → **Create user pool**
2. Configure:
   - **Sign-in options**: Email
   - **Password policy**: padrão ou personalizado
   - **App client**: crie um client sem secret (para uso em SPA)
3. Anote o **User Pool ID** e o **App client ID**

### 3. IAM — Permissões para o backend

Se rodar em **EC2 com IAM Role** (recomendado), crie uma policy com:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/devops-site-projects"
    }
  ]
}
```

Se rodar **localmente**, use `aws configure` ou exporte as variáveis:

```bash
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
```

---

## Rodando localmente com Docker

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd devops-site

# 2. Configure as variáveis de ambiente do backend
cp backend/.env.example backend/.env
# Edite backend/.env com seus valores reais

# 3. Build e suba os containers
docker compose up --build

# 4. Acesse no browser
#    http://localhost       → site
#    http://localhost/health → status da API
```

Para rodar em background:

```bash
docker compose up -d --build
docker compose logs -f   # acompanhar logs
docker compose down      # parar
```

---

## Deploy em EC2

### 1. Provisionamento (Ubuntu 24.04)

```bash
# Instala Docker e Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
newgrp docker
```

### 2. Copiar o projeto para a EC2

```bash
# Via SCP (substitua <IP_EC2> e <CHAVE_PEM>)
scp -i <CHAVE_PEM> -r devops-site ubuntu@<IP_EC2>:~/devops-site

# Ou clone direto na EC2
git clone <url-do-repo> ~/devops-site
```

### 3. Configurar variáveis de ambiente

```bash
cd ~/devops-site
cp backend/.env.example backend/.env
nano backend/.env   # preencha com dados reais
```

> Se a EC2 tiver uma **IAM Role** com permissões de DynamoDB, as variáveis
> `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` não são necessárias.

### 4. Subir os containers

```bash
docker compose up -d --build
```

### 5. Configurar Security Group da EC2

Abra as portas:
- `80` (HTTP) — origem `0.0.0.0/0`
- `443` (HTTPS) — origem `0.0.0.0/0` *(se usar HTTPS)*
- `22` (SSH) — apenas seu IP

### 6. HTTPS (opcional — Let's Encrypt)

```bash
# Instala Certbot
sudo apt install -y certbot

# Gera certificado (pare o NGINX primeiro)
docker compose stop frontend
sudo certbot certonly --standalone -d SEU_DOMINIO.com

# Coloque os certs em ./nginx/ssl/
sudo cp /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem   nginx/ssl/

# Descomente o bloco HTTPS em nginx/nginx.conf
# Suba novamente
docker compose up -d
```

---

## Variáveis de ambiente

Arquivo: `backend/.env` (copie de `backend/.env.example`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `AWS_REGION` | Sim | Região AWS (ex: `us-east-1`) |
| `COGNITO_USER_POOL_ID` | Sim | ID do User Pool do Cognito |
| `COGNITO_CLIENT_ID` | Sim | App Client ID do Cognito |
| `DYNAMODB_TABLE_PROJECTS` | Não | Nome da tabela (padrão: `devops-site-projects`) |
| `PORT` | Não | Porta do backend (padrão: `3000`) |
| `ALLOWED_ORIGINS` | Não | Origens CORS separadas por vírgula |

> Em **modo dev** (sem `COGNITO_USER_POOL_ID`), a autenticação é desativada e
> um usuário fictício `dev-user` é usado automaticamente.

---

## Estrutura do projeto

```
devops-site/
├── docker-compose.yml
├── README.md
│
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── config.js      # Configurações AWS (Cognito, API URL)
│       ├── auth.js        # Login/cadastro via Cognito
│       ├── api.js         # Chamadas CRUD ao backend
│       └── app.js         # SPA router e lógica da UI
│
├── nginx/
│   └── nginx.conf         # Proxy reverso + frontend estático + segurança
│
└── backend/
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    ├── server.js          # Entry point Express
    ├── middleware/
    │   ├── auth.js        # Validação JWT Cognito (jwks-rsa)
    │   └── errorHandler.js
    ├── lib/
    │   └── dynamo.js      # DynamoDB DocumentClient
    └── routes/
        └── projects.js    # CRUD /api/projects
```

---

## API Reference

Base URL: `http://localhost/api` (via NGINX)

Todos os endpoints exigem o header:
```
Authorization: Bearer <access_token_cognito>
```

### Projetos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/projects` | Lista projetos do usuário |
| `POST` | `/projects` | Cria um novo projeto |
| `PUT` | `/projects/:id` | Atualiza um projeto |
| `DELETE` | `/projects/:id` | Remove um projeto |

**Criar projeto — body:**

```json
{
  "name": "Pipeline CI/CD com GitHub Actions",
  "description": "Automação de build, test e deploy na AWS",
  "technologies": ["GitHub Actions", "Docker", "EC2"],
  "status": "em-andamento"
}
```

**Status válidos:** `em-andamento` | `concluido` | `pausado`

**Healthcheck:**

```
GET /health
```

```json
{ "status": "ok", "timestamp": "2026-08-27T10:00:00.000Z" }
```
