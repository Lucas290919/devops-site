/**
 * config.js — Configurações do frontend
 *
 * API_BASE_URL usa caminho relativo (/api) para funcionar tanto
 * em desenvolvimento local (via NGINX proxy) quanto em produção,
 * sem precisar alterar este arquivo ao fazer deploy.
 */
const CONFIG = {
  // URL base da API — relativo ao domínio atual (proxy NGINX em /api/)
  API_BASE_URL: '/api',
};
