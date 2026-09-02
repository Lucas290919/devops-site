/**
 * api.js — Chamadas ao backend Node.js / AWS
 *
 * CRUD de projetos: Criar, Listar, Atualizar, Deletar.
 * O backend persiste no DynamoDB e valida o token Cognito.
 *
 * Em modo demo (sem backend), usa localStorage.
 */

const DEMO_PROJECTS_KEY = 'devops_demo_projects';

// ─── Helper HTTP ─────────────────────────────────────────

async function _request(method, path, body = null) {
  const token = await authGetToken();

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Erro ${res.status}`);
  }
  return data;
}

// ─── Projetos ─────────────────────────────────────────────

/**
 * Lista todos os projetos do usuário autenticado.
 */
async function apiGetProjects() {
  if (_isDemo()) return _demoGetProjects();
  return await _request('GET', '/projects');
}

/**
 * Cria um novo projeto.
 * @param {{ name, description, technologies, status }} data
 */
async function apiCreateProject(data) {
  if (_isDemo()) return _demoCreateProject(data);
  return await _request('POST', '/projects', data);
}

/**
 * Atualiza um projeto existente.
 * @param {string} id
 * @param {{ name, description, technologies, status }} data
 */
async function apiUpdateProject(id, data) {
  if (_isDemo()) return _demoUpdateProject(id, data);
  return await _request('PUT', `/projects/${id}`, data);
}

/**
 * Deleta um projeto.
 * @param {string} id
 */
async function apiDeleteProject(id) {
  if (_isDemo()) return _demoDeleteProject(id);
  return await _request('DELETE', `/projects/${id}`);
}

// ─── Modo Demo (localStorage) ─────────────────────────────

function _isDemo() {
  // Se a API_BASE_URL contém localhost e não há indicação de backend real,
  // usa o modo demo para não quebrar na ausência do backend.
  // Você pode forçar modo real removendo esta checagem.
  try {
    return !CONFIG.API_BASE_URL || CONFIG.API_BASE_URL.includes('localhost');
  } catch { return true; }
}

function _demoGetAllProjects() {
  return JSON.parse(localStorage.getItem(DEMO_PROJECTS_KEY) || '[]');
}
function _demoSaveAllProjects(projects) {
  localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(projects));
}

async function _demoGetCurrentUserId() {
  const user = await authGetCurrentUser();
  return user ? (user.id || user.username || user.email) : null;
}

async function _demoGetProjects() {
  const uid = await _demoGetCurrentUserId();
  const all = _demoGetAllProjects();
  return all.filter(p => p.userId === uid);
}

async function _demoCreateProject(data) {
  const uid = await _demoGetCurrentUserId();
  const all = _demoGetAllProjects();
  const project = {
    id:           crypto.randomUUID(),
    userId:       uid,
    name:         data.name,
    description:  data.description || '',
    technologies: data.technologies || [],
    status:       data.status || 'em-andamento',
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };
  all.push(project);
  _demoSaveAllProjects(all);
  return project;
}

async function _demoUpdateProject(id, data) {
  const all = _demoGetAllProjects();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Projeto não encontrado.');

  all[idx] = {
    ...all[idx],
    name:         data.name         ?? all[idx].name,
    description:  data.description  ?? all[idx].description,
    technologies: data.technologies ?? all[idx].technologies,
    status:       data.status       ?? all[idx].status,
    updatedAt:    new Date().toISOString(),
  };
  _demoSaveAllProjects(all);
  return all[idx];
}

async function _demoDeleteProject(id) {
  const all = _demoGetAllProjects().filter(p => p.id !== id);
  _demoSaveAllProjects(all);
  return { deleted: true };
}
