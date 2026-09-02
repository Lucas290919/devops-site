'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const projectsRouter = require('./routes/projects');
const authRouter     = require('./routes/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ─── App ──────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origem não permitida — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Middlewares globais ───────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Rotas ────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',     authRouter);
app.use('/api/projects', projectsRouter);

// ─── Tratamento de erros ─────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Inicialização ────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Backend devops-site rodando na porta ${PORT}`);
  console.log(`   MySQL : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'devops_site'}`);
  console.log(`   Modo  : ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
