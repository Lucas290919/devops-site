'use strict';

/**
 * routes/projects.js
 *
 * CRUD de Projetos DevOps — MySQL via pool de conexões.
 *
 * Endpoints:
 *  GET    /api/projects       — lista projetos do usuário autenticado
 *  POST   /api/projects       — cria um novo projeto
 *  PUT    /api/projects/:id   — atualiza um projeto existente
 *  DELETE /api/projects/:id   — remove um projeto
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool }       = require('../lib/db');
const { requireAuth} = require('../middleware/auth');

const router = express.Router();

// Todos os endpoints exigem autenticação
router.use(requireAuth);

// ─── Validação ────────────────────────────────────────────────

const ALLOWED_STATUSES = new Set(['em-andamento', 'concluido', 'pausado']);

function parseProjectPayload(body, isUpdate = false) {
  const { name, description, technologies, subtasks, status } = body || {};

  if (!isUpdate && (!name || typeof name !== 'string' || !name.trim())) {
    const err = new Error('O campo "name" é obrigatório.');
    err.statusCode = 400;
    throw err;
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    const err = new Error('O campo "name" deve ser uma string não vazia.');
    err.statusCode = 400;
    throw err;
  }
  if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
    const err = new Error(`Status inválido. Use: ${[...ALLOWED_STATUSES].join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
  if (technologies !== undefined && !Array.isArray(technologies)) {
    const err = new Error('O campo "technologies" deve ser um array de strings.');
    err.statusCode = 400;
    throw err;
  }
  if (subtasks !== undefined && !Array.isArray(subtasks)) {
    const err = new Error('O campo "subtasks" deve ser um array.');
    err.statusCode = 400;
    throw err;
  }

  return {
    ...(name         !== undefined && { name: name.trim().slice(0, 120) }),
    ...(description  !== undefined && { description: String(description).slice(0, 500) }),
    ...(technologies !== undefined && { technologies: technologies.map(t => String(t).slice(0, 50)) }),
    ...(subtasks     !== undefined && { subtasks: subtasks.map(s => ({
        id:    String(s.id    || ''),
        title: String(s.title || '').slice(0, 200),
        done:  Boolean(s.done),
    }))}),
    ...(status       !== undefined && { status }),
  };
}

// ─── GET /api/projects ────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, description, technologies, subtasks, status, created_at, updated_at
         FROM projects
        WHERE user_id = ?
        ORDER BY created_at DESC`,
      [req.user.id]
    );

    const projects = rows.map(row => ({
      ...row,
      technologies: typeof row.technologies === 'string' ? JSON.parse(row.technologies) : row.technologies,
      subtasks:     typeof row.subtasks     === 'string' ? JSON.parse(row.subtasks)     : (row.subtasks || []),
    }));

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/projects ───────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const payload = parseProjectPayload(req.body, false);
    const id      = uuidv4();
    const now     = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      `INSERT INTO projects (id, user_id, name, description, technologies, subtasks, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        payload.name,
        payload.description  || '',
        JSON.stringify(payload.technologies || []),
        JSON.stringify(payload.subtasks     || []),
        payload.status       || 'em-andamento',
        now,
        now,
      ]
    );

    res.status(201).json({
      id,
      user_id:      req.user.id,
      name:         payload.name,
      description:  payload.description  || '',
      technologies: payload.technologies || [],
      subtasks:     payload.subtasks     || [],
      status:       payload.status       || 'em-andamento',
      created_at:   now,
      updated_at:   now,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/projects/:id ────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Projeto não encontrado.' });
    }

    const payload = parseProjectPayload(req.body, true);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    const fields = [];
    const values = [];

    if (payload.name         !== undefined) { fields.push('name = ?');         values.push(payload.name); }
    if (payload.description  !== undefined) { fields.push('description = ?');  values.push(payload.description); }
    if (payload.technologies !== undefined) { fields.push('technologies = ?'); values.push(JSON.stringify(payload.technologies)); }
    if (payload.subtasks     !== undefined) { fields.push('subtasks = ?');     values.push(JSON.stringify(payload.subtasks)); }
    if (payload.status       !== undefined) { fields.push('status = ?');       values.push(payload.status); }

    values.push(id, req.user.id);

    await pool.execute(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [updated] = await pool.execute(
      'SELECT id, name, description, technologies, subtasks, status, created_at, updated_at FROM projects WHERE id = ?',
      [id]
    );

    const project = {
      ...updated[0],
      technologies: typeof updated[0].technologies === 'string' ? JSON.parse(updated[0].technologies) : updated[0].technologies,
      subtasks:     typeof updated[0].subtasks     === 'string' ? JSON.parse(updated[0].subtasks)     : (updated[0].subtasks || []),
    };

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Projeto não encontrado.' });
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
