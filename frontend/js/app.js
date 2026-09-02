/**
 * app.js — Lógica principal da SPA
 *
 * Responsável por:
 * - Roteamento de páginas
 * - Terminal animado
 * - Modais (login, cadastro, perfil, projetos)
 * - CRUD de projetos
 * - Estado do usuário na navbar
 */

// ═══════════════ INICIALIZAÇÃO ═══════════════

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupTerminal();
  setupNavbar();
  setupModals();
  setupAuthForms();
  setupProfileActions();
  setupProjectActions();
  await initSession();
});

// ═══════════════ NAVEGAÇÃO SPA ═══════════════

let _currentPage = 'home';

function setupNavigation() {
  // Cliques em links com data-page
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  // Menu mobile
  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-links')?.classList.toggle('open');
  });
}

function navigateTo(page) {
  // Verifica se a página de projetos precisa de autenticação
  if (page === 'projects') {
    authGetCurrentUser().then(user => {
      if (!user) { openModal('modal-login'); return; }
      _doNavigate(page);
    });
    return;
  }
  _doNavigate(page);
}

function _doNavigate(page) {
  _currentPage = page;

  // Esconde todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Mostra a página alvo
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Atualiza links ativos
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Fecha menu mobile
  document.getElementById('nav-links')?.classList.remove('open');

  // Scroll ao topo
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Carrega projetos ao entrar na página
  if (page === 'projects') loadProjects();
}

// ═══════════════ TERMINAL ANIMADO ═══════════════

const TERMINAL_SEQUENCES = [
  {
    cmd: 'docker build -t my-app:latest .',
    lines: [
      '<span class="info">Step 1/6 : FROM node:18-alpine</span>',
      '<span class="info">Step 2/6 : WORKDIR /app</span>',
      '<span class="info">Step 3/6 : COPY package*.json .</span>',
      '<span class="info">Step 4/6 : RUN npm install</span>',
      '<span class="success">✓ Successfully built a1b2c3d4e5f6</span>',
      '<span class="success">✓ Successfully tagged my-app:latest</span>',
    ]
  },
  {
    cmd: 'terraform plan',
    lines: [
      '<span class="info">Refreshing Terraform state...</span>',
      '',
      '<span class="info">Plan: 3 to add, 0 to change, 0 to destroy.</span>',
      '<span class="success">+ aws_instance.web</span>',
      '<span class="success">+ aws_security_group.web_sg</span>',
      '<span class="success">+ aws_eip.web_ip</span>',
    ]
  },
  {
    cmd: 'aws ecs update-service --cluster prod --service app --force-new-deployment',
    lines: [
      '<span class="info">Updating service...</span>',
      '<span class="info">Waiting for service to stabilize...</span>',
      '<span class="success">✓ Service app updated successfully</span>',
      '<span class="success">✓ Running tasks: 2/2</span>',
    ]
  },
];

let _terminalIdx = 0;

function setupTerminal() {
  playTerminalSequence();
}

async function playTerminalSequence() {
  const cmdEl    = document.getElementById('terminal-cmd');
  const outputEl = document.getElementById('terminal-output');
  if (!cmdEl || !outputEl) return;

  const seq = TERMINAL_SEQUENCES[_terminalIdx % TERMINAL_SEQUENCES.length];
  _terminalIdx++;

  // Limpa output anterior
  outputEl.innerHTML = '';
  cmdEl.textContent = '';

  // Digita o comando
  await typeText(cmdEl, seq.cmd, 40);
  await sleep(400);

  // Exibe as linhas de output
  for (const line of seq.lines) {
    await sleep(200);
    const div = document.createElement('div');
    div.innerHTML = line || '&nbsp;';
    outputEl.appendChild(div);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // Aguarda e repete
  await sleep(3500);
  await clearTerminal(cmdEl, outputEl);
  playTerminalSequence();
}

async function clearTerminal(cmdEl, outputEl) {
  // Apaga o comando de trás para frente
  while (cmdEl.textContent.length > 0) {
    cmdEl.textContent = cmdEl.textContent.slice(0, -1);
    await sleep(15);
  }
  outputEl.innerHTML = '';
}

function typeText(el, text, delay = 50) {
  return new Promise(resolve => {
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(interval); resolve(); }
    }, delay);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════ NAVBAR ═══════════════

function setupNavbar() {
  // Scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Avatar dropdown — clique fora fecha
  document.addEventListener('click', (e) => {
    const navUser = document.getElementById('nav-user');
    if (navUser && !navUser.contains(e.target)) {
      document.getElementById('user-dropdown')?.classList.remove('open');
    }
  });

  document.getElementById('btn-login')?.addEventListener('click', () => openModal('modal-login'));
  document.getElementById('btn-register')?.addEventListener('click', () => openModal('modal-register'));
  document.getElementById('hero-login-btn')?.addEventListener('click', () => openModal('modal-register'));
  document.getElementById('cta-register-btn')?.addEventListener('click', () => openModal('modal-register'));
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
  document.getElementById('btn-profile')?.addEventListener('click', (e) => {
    e.preventDefault(); openProfileModal();
  });
}

// ═══════════════ SESSÃO ═══════════════

async function initSession() {
  const user = await authGetCurrentUser();
  if (user) updateNavUser(user);
  else showAuthButtons();
}

function updateNavUser(user) {
  const name  = authGetDisplayName(user);
  const email = authGetEmail(user);
  const initial = (name.charAt(0) || 'U').toUpperCase();

  document.getElementById('user-avatar').textContent = initial;
  document.getElementById('user-name').textContent = name;

  document.getElementById('nav-auth').classList.add('hidden');
  document.getElementById('nav-user').classList.remove('hidden');
  document.getElementById('nav-projects').classList.remove('hidden');
}

function showAuthButtons() {
  document.getElementById('nav-auth').classList.remove('hidden');
  document.getElementById('nav-user').classList.add('hidden');
  document.getElementById('nav-projects').classList.add('hidden');
}

async function handleLogout() {
  try {
    await authSignOut();
    showAuthButtons();
    navigateTo('home');
    showToast('Até logo!', 'success');
  } catch (err) {
    showToast('Erro ao sair: ' + err.message, 'error');
  }
}

// ═══════════════ MODAIS ═══════════════

function setupModals() {
  // Overlay e botões de fechar
  document.getElementById('modal-overlay')?.addEventListener('click', closeAllModals);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal(btn.dataset.close);
    });
  });

  // Troca entre login e cadastro
  document.getElementById('link-to-register')?.addEventListener('click', (e) => {
    e.preventDefault(); closeModal('modal-login'); openModal('modal-register');
  });
  document.getElementById('link-to-login')?.addEventListener('click', (e) => {
    e.preventDefault(); closeModal('modal-register'); openModal('modal-login');
  });
}

function openModal(id) {
  closeAllModals();
  document.getElementById(id)?.classList.add('active');
  document.getElementById('modal-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  // Se não há mais modais abertos, remove overlay
  const openModals = document.querySelectorAll('.modal.active');
  if (openModals.length === 0) {
    document.getElementById('modal-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  document.getElementById('modal-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ═══════════════ FORMULÁRIOS DE AUTH ═══════════════

function setupAuthForms() {
  // Login
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const btnText  = document.querySelector('#btn-login-submit .btn-text');
    const btnLoad  = document.querySelector('#btn-login-submit .btn-loading');

    hideError(errorEl);
    setLoading(btnText, btnLoad, true);

    try {
      const user = await authSignIn(email, password);
      updateNavUser(user);
      closeAllModals();
      showToast('Bem-vindo de volta! 👋', 'success');
      document.getElementById('form-login').reset();
    } catch (err) {
      showError(errorEl, translateAuthError(err.message));
    } finally {
      setLoading(btnText, btnLoad, false);
    }
  });

  // Cadastro — faz login direto após criar a conta (sem confirmação de e-mail)
  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl  = document.getElementById('register-error');
    const btnText  = document.querySelector('#btn-register-submit .btn-text');
    const btnLoad  = document.querySelector('#btn-register-submit .btn-loading');

    hideError(errorEl);

    if (password.length < 8) {
      showError(errorEl, 'A senha deve ter no mínimo 8 caracteres.'); return;
    }

    setLoading(btnText, btnLoad, true);

    try {
      // Cria a conta e já faz login em seguida
      await authSignUp(name, email, password);
      const user = await authSignIn(email, password);
      updateNavUser(user);
      closeAllModals();
      showToast('Conta criada! Bem-vindo, ' + (name || email) + '! 🚀', 'success');
      document.getElementById('form-register').reset();
    } catch (err) {
      showError(errorEl, translateAuthError(err.message));
    } finally {
      setLoading(btnText, btnLoad, false);
    }
  });
}

// ═══════════════ PERFIL ═══════════════

function setupProfileActions() {
  // Salvar perfil (nome)
  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const name    = document.getElementById('profile-name-input').value.trim();
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    hideError(errorEl);
    hideError(successEl);

    if (!name) { showError(errorEl, 'O nome não pode estar vazio.'); return; }

    try {
      await authUpdateUser({ name });
      document.getElementById('profile-display-name').textContent = name;
      document.getElementById('user-name').textContent = name;
      document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
      showSuccess(successEl, 'Nome atualizado com sucesso!');
      showToast('Perfil atualizado!', 'success');
    } catch (err) {
      showError(errorEl, err.message);
    }
  });

  // Abrir confirmação de exclusão de conta
  document.getElementById('btn-delete-account')?.addEventListener('click', () => {
    closeModal('modal-profile');
    openModal('modal-confirm-delete');
  });

  // Confirmar exclusão de conta
  document.getElementById('btn-confirm-delete-account')?.addEventListener('click', async () => {
    try {
      await authDeleteUser();
      closeAllModals();
      showAuthButtons();
      navigateTo('home');
      showToast('Conta excluída. Até logo!', 'success');
    } catch (err) {
      closeAllModals();
      showToast('Erro ao excluir conta: ' + err.message, 'error');
    }
  });
}

async function openProfileModal() {
  const user    = await authGetCurrentUser();
  if (!user) { openModal('modal-login'); return; }

  const name  = authGetDisplayName(user);
  const email = authGetEmail(user);

  document.getElementById('profile-display-name').textContent = name;
  document.getElementById('profile-display-email').textContent = email;
  document.getElementById('profile-name-input').value = name;
  document.getElementById('profile-avatar-lg').textContent = name.charAt(0).toUpperCase();
  document.getElementById('profile-error')?.classList.add('hidden');
  document.getElementById('profile-success')?.classList.add('hidden');

  openModal('modal-profile');
}

// ═══════════════ PROJETOS (CRUD) ═══════════════

let _allProjects = [];
let _activeFilter = 'all';
let _deletingProjectId = null;

function setupProjectActions() {
  // Botões de novo projeto
  ['btn-new-project', 'btn-empty-project'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openProjectModal());
  });

  // Salvar projeto
  document.getElementById('form-project')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSaveProject();
  });

  // Confirmar exclusão de projeto
  document.getElementById('btn-confirm-delete-project')?.addEventListener('click', async () => {
    if (!_deletingProjectId) return;
    try {
      await apiDeleteProject(_deletingProjectId);
      _allProjects = _allProjects.filter(p => p.id !== _deletingProjectId);
      closeModal('modal-confirm-delete-project');
      renderProjects(_allProjects);
      showToast('Projeto excluído.', 'success');
    } catch (err) {
      closeModal('modal-confirm-delete-project');
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
    _deletingProjectId = null;
  });

  // Filtros
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeFilter = btn.dataset.filter;
      applyFilter();
    });
  });
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando...</div>';

  try {
    _allProjects = await apiGetProjects();
    renderProjects(_allProjects);
  } catch (err) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--accent-red);">Erro ao carregar projetos: ${err.message}</div>`;
  }
}

function applyFilter() {
  if (_activeFilter === 'all') {
    renderProjects(_allProjects);
  } else {
    renderProjects(_allProjects.filter(p => p.status === _activeFilter));
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="projects-empty" id="projects-empty">
        <div class="empty-icon">&#128193;</div>
        <h3>${_activeFilter === 'all' ? 'Nenhum projeto ainda' : 'Nenhum projeto nesta categoria'}</h3>
        <p>${_activeFilter === 'all' ? 'Crie seu primeiro projeto DevOps!' : 'Tente outro filtro.'}</p>
        ${_activeFilter === 'all' ? '<button class="btn btn-primary" id="btn-empty-project">+ Criar Projeto</button>' : ''}
      </div>`;
    // Re-bind do botão recriado
    document.getElementById('btn-empty-project')?.addEventListener('click', () => openProjectModal());
    return;
  }

  grid.innerHTML = projects.map(project => projectCardHTML(project)).join('');

  // Bind dos botões de editar e deletar
  grid.querySelectorAll('.btn-edit-project').forEach(btn => {
    btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
  });
  grid.querySelectorAll('.btn-delete-project').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteProject(btn.dataset.id, btn.dataset.name));
  });
}

function projectCardHTML(p) {
  const techTags = (p.technologies || []).map(t => {
    const cls = t.toLowerCase().replace('/', '');
    return `<span class="tech-tag ${cls}">${t}</span>`;
  }).join('');

  const date = p.updatedAt || p.updated_at
    ? new Date(p.updatedAt || p.updated_at).toLocaleDateString('pt-BR')
    : new Date(p.createdAt || p.created_at).toLocaleDateString('pt-BR');

  const statusLabels = {
    'em-andamento': 'Em Andamento',
    'concluido':    'Concluído',
    'pausado':      'Pausado',
  };

  // Subtarefas
  const subtasks   = p.subtasks || [];
  const doneCount  = subtasks.filter(s => s.done).length;
  const total      = subtasks.length;
  const pct        = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const subtasksHTML = subtasks.map(s => `
    <div class="subtask-item ${s.done ? 'done' : ''}"
         data-project-id="${p.id}"
         data-subtask-id="${escHtml(s.id)}"
         onclick="toggleSubtask(this)">
      <div class="subtask-checkbox">${s.done ? '✓' : ''}</div>
      <span class="subtask-text">${escHtml(s.title)}</span>
    </div>`).join('');

  const progressBar = total > 0 ? `
    <div class="subtasks-bar">
      <div class="subtasks-bar-fill" style="width:${pct}%"></div>
    </div>` : '';

  return `
    <div class="project-card" data-id="${p.id}">
      <div class="project-card-header">
        <h3>${escHtml(p.name)}</h3>
        <div class="project-card-actions">
          <button class="btn-icon btn-edit-project" data-id="${p.id}" title="Editar">✏️</button>
          <button class="btn-icon btn-delete btn-delete-project" data-id="${p.id}" data-name="${escHtml(p.name)}" title="Excluir">🗑️</button>
        </div>
      </div>
      ${p.description ? `<p class="project-desc">${escHtml(p.description)}</p>` : ''}
      <div class="project-techs">${techTags}</div>

      <div class="subtasks-section">
        <div class="subtasks-header">
          <span class="subtasks-title">Subtarefas</span>
          ${total > 0 ? `<span class="subtasks-progress">${doneCount}/${total}</span>` : ''}
        </div>
        ${progressBar}
        <div class="subtasks-list" data-project-id="${p.id}">
          ${subtasksHTML}
        </div>
        <div class="subtask-add">
          <input class="subtask-add-input"
                 type="text"
                 placeholder="Nova subtarefa..."
                 maxlength="200"
                 data-project-id="${p.id}"
                 onkeydown="if(event.key==='Enter') addSubtask(this)" />
          <button class="subtask-add-btn" onclick="addSubtask(this.previousElementSibling)" title="Adicionar">+</button>
        </div>
      </div>

      <div class="project-footer">
        <span class="status-badge ${p.status}">${statusLabels[p.status] || p.status}</span>
        <span>Atualizado em ${date}</span>
      </div>
    </div>`;
}

// ─── Toggle de conclusão de subtarefa ────────────────────────

async function toggleSubtask(el) {
  const projectId  = el.dataset.projectId;
  const subtaskId  = el.dataset.subtaskId;
  const project    = _allProjects.find(p => p.id === projectId);
  if (!project) return;

  // Atualiza localmente imediato (UI optimista)
  const subtask = (project.subtasks || []).find(s => s.id === subtaskId);
  if (!subtask) return;
  subtask.done = !subtask.done;

  // Atualiza o DOM imediatamente
  el.classList.toggle('done', subtask.done);
  el.querySelector('.subtask-checkbox').textContent = subtask.done ? '✓' : '';
  el.querySelector('.subtask-text').style.textDecoration = subtask.done ? 'line-through' : '';

  // Atualiza contagem e barra de progresso no card
  _refreshSubtaskProgress(projectId, project.subtasks);

  // Persiste no backend
  try {
    await apiUpdateProject(projectId, { subtasks: project.subtasks });
  } catch (err) {
    // Reverte se falhar
    subtask.done = !subtask.done;
    el.classList.toggle('done', subtask.done);
    el.querySelector('.subtask-checkbox').textContent = subtask.done ? '✓' : '';
    showToast('Erro ao salvar: ' + err.message, 'error');
  }
}

// ─── Adicionar nova subtarefa ─────────────────────────────────

async function addSubtask(inputEl) {
  const title     = (inputEl.value || '').trim();
  const projectId = inputEl.dataset.projectId;
  if (!title) return;

  const project = _allProjects.find(p => p.id === projectId);
  if (!project) return;

  const newSub = {
    id:    'st-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title,
    done:  false,
  };

  // Atualiza localmente
  if (!project.subtasks) project.subtasks = [];
  project.subtasks.push(newSub);
  inputEl.value = '';

  // Renderiza nova subtarefa no DOM sem recriar o card todo
  const list = document.querySelector(`.subtasks-list[data-project-id="${projectId}"]`);
  if (list) {
    const div = document.createElement('div');
    div.className = 'subtask-item';
    div.dataset.projectId = projectId;
    div.dataset.subtaskId = newSub.id;
    div.setAttribute('onclick', 'toggleSubtask(this)');
    div.innerHTML = `<div class="subtask-checkbox"></div><span class="subtask-text">${escHtml(newSub.title)}</span>`;
    list.appendChild(div);
  }

  _refreshSubtaskProgress(projectId, project.subtasks);

  // Persiste
  try {
    await apiUpdateProject(projectId, { subtasks: project.subtasks });
  } catch (err) {
    // Reverte
    project.subtasks = project.subtasks.filter(s => s.id !== newSub.id);
    list?.lastElementChild?.remove();
    showToast('Erro ao salvar subtarefa: ' + err.message, 'error');
  }
}

// ─── Atualiza contador e barra de progresso no card ──────────

function _refreshSubtaskProgress(projectId, subtasks) {
  const card  = document.querySelector(`.project-card[data-id="${projectId}"]`);
  if (!card) return;

  const total     = subtasks.length;
  const doneCount = subtasks.filter(s => s.done).length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const counter = card.querySelector('.subtasks-progress');
  if (counter) {
    counter.textContent = `${doneCount}/${total}`;
  } else if (total > 0) {
    const header = card.querySelector('.subtasks-header');
    if (header) {
      const span = document.createElement('span');
      span.className = 'subtasks-progress';
      span.textContent = `${doneCount}/${total}`;
      header.appendChild(span);
    }
  }

  const bar = card.querySelector('.subtasks-bar-fill');
  if (bar) {
    bar.style.width = pct + '%';
  } else if (total > 0) {
    const section = card.querySelector('.subtasks-section');
    const header  = card.querySelector('.subtasks-header');
    if (section && header) {
      const barWrap = document.createElement('div');
      barWrap.className = 'subtasks-bar';
      barWrap.innerHTML = `<div class="subtasks-bar-fill" style="width:${pct}%"></div>`;
      header.insertAdjacentElement('afterend', barWrap);
    }
  }
}

function openProjectModal(id = null) {
  const titleEl = document.getElementById('modal-project-title');
  const idInput = document.getElementById('project-id');
  const errorEl = document.getElementById('project-error');

  // Limpa o formulário
  document.getElementById('form-project').reset();
  document.querySelectorAll('#project-techs input[type="checkbox"]').forEach(cb => cb.checked = false);
  errorEl?.classList.add('hidden');

  if (id) {
    // Modo edição
    const project = _allProjects.find(p => p.id === id);
    if (!project) return;

    titleEl.textContent = 'Editar Projeto';
    idInput.value = id;
    document.getElementById('project-name').value = project.name;
    document.getElementById('project-description').value = project.description || '';
    document.getElementById('project-status').value = project.status;

    // Marca as tecnologias
    document.querySelectorAll('#project-techs input[type="checkbox"]').forEach(cb => {
      cb.checked = (project.technologies || []).includes(cb.value);
    });
  } else {
    // Modo criação
    titleEl.textContent = 'Novo Projeto';
    idInput.value = '';
  }

  openModal('modal-project');
}

async function handleSaveProject() {
  const id          = document.getElementById('project-id').value;
  const name        = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();
  const status      = document.getElementById('project-status').value;
  const technologies = [...document.querySelectorAll('#project-techs input[type="checkbox"]:checked')]
                         .map(cb => cb.value);
  const errorEl = document.getElementById('project-error');
  const btnText = document.querySelector('#btn-save-project .btn-text');
  const btnLoad = document.querySelector('#btn-save-project .btn-loading');

  hideError(errorEl);
  if (!name) { showError(errorEl, 'O nome do projeto é obrigatório.'); return; }

  setLoading(btnText, btnLoad, true);

  try {
    const data = { name, description, technologies, status };

    if (id) {
      // Atualiza
      const updated = await apiUpdateProject(id, data);
      const idx = _allProjects.findIndex(p => p.id === id);
      if (idx !== -1) _allProjects[idx] = { ..._allProjects[idx], ...updated };
      showToast('Projeto atualizado!', 'success');
    } else {
      // Cria
      const created = await apiCreateProject(data);
      _allProjects.unshift(created);
      showToast('Projeto criado! 🚀', 'success');
    }

    closeModal('modal-project');
    applyFilter();
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    setLoading(btnText, btnLoad, false);
  }
}

function confirmDeleteProject(id, name) {
  _deletingProjectId = id;
  document.getElementById('delete-project-name').textContent = name;
  openModal('modal-confirm-delete-project');
}

// ═══════════════ UTILITÁRIOS DE UI ═══════════════

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}
function showSuccess(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setLoading(textEl, loadEl, loading) {
  if (!textEl || !loadEl) return;
  textEl.classList.toggle('hidden', loading);
  loadEl.classList.toggle('hidden', !loading);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyCode(btn) {
  const block = btn.closest('.code-block').querySelector('code');
  const text  = block.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  }).catch(() => {
    btn.textContent = 'Erro';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  });
}

function translateAuthError(msg) {
  const map = {
    'User already exists':            'Este e-mail já está cadastrado.',
    'Incorrect username or password': 'E-mail ou senha incorretos.',
    'Attempt limit exceeded':         'Muitas tentativas. Aguarde alguns minutos.',
    'Password did not conform':       'A senha não atende aos requisitos de segurança.',
    'User does not exist':            'Usuário não encontrado.',
  };
  for (const [key, value] of Object.entries(map)) {
    if (msg.includes(key)) return value;
  }
  return msg;
}
