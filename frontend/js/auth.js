/**
 * auth.js — Autenticação via backend local (JWT)
 *
 * Sem AWS Cognito. Sem verificação de e-mail.
 * Comunica-se com /api/auth/* do backend Node.js.
 */

// ─── Estado em memória ──────────────────────────────────────
const TOKEN_KEY = 'devops_token';
const USER_KEY  = 'devops_user';

// ─── Helpers HTTP ───────────────────────────────────────────

async function _authPost(path, body) {
  const res  = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
  return data;
}

async function _authGet(path) {
  const token = authGetTokenSync();
  const res   = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
  return data;
}

// ─── Funções públicas ───────────────────────────────────────

/**
 * Cadastra um novo usuário.
 * Salva token e usuário no localStorage.
 */
async function authSignUp(name, email, password) {
  const data = await _authPost('/auth/register', { name, email, password });
  _saveSession(data.token, data.user);
  return data.user;
}

/**
 * Faz login e salva a sessão.
 */
async function authSignIn(email, password) {
  const data = await _authPost('/auth/login', { email, password });
  _saveSession(data.token, data.user);
  return data.user;
}

/**
 * Encerra a sessão local.
 */
async function authSignOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Retorna o usuário da sessão atual (localStorage) ou null.
 */
async function authGetCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Retorna o token JWT armazenado (síncrono).
 */
function authGetTokenSync() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Retorna o token JWT (assíncrono — compatível com api.js).
 */
async function authGetToken() {
  return authGetTokenSync();
}

/**
 * Atualiza o nome do usuário no backend e na sessão local.
 */
async function authUpdateUser(attributes) {
  const token = authGetTokenSync();
  if (!token) throw new Error('Não autenticado.');

  const res  = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(attributes),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);

  // Atualiza o usuário salvo localmente
  const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  if (attributes.name) user.name = attributes.name;
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return data;
}

/**
 * Deleta a conta do usuário e limpa a sessão.
 */
async function authDeleteUser() {
  const token = authGetTokenSync();
  if (!token) throw new Error('Não autenticado.');

  const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erro ${res.status}`);
  }

  await authSignOut();
}

// ─── Helpers de sessão ──────────────────────────────────────

function _saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ─── Extratores de exibição ─────────────────────────────────

function authGetDisplayName(user) {
  if (!user) return 'Usuário';
  return user.name || user.email || 'Usuário';
}

function authGetEmail(user) {
  if (!user) return '';
  return user.email || '';
}
