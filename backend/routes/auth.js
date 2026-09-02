'use strict';

/**
 * routes/auth.js
 *
 * Autenticação local — sem AWS Cognito.
 *
 * Endpoints:
 *  POST /api/auth/register  — cadastra novo usuário
 *  POST /api/auth/login     — autentica e retorna JWT
 *  GET  /api/auth/me        — retorna dados do usuário autenticado
 */

const express    = require('express');
const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');
const { pool }   = require('../lib/db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers de senha (crypto nativo — sem bcrypt) ────────────
// Usa PBKDF2 com SHA-256, 100.000 iterações, salt de 16 bytes.
// Compatível com Node.js >= 15 sem dependências extras.

const HASH_ITER  = 100_000;
const HASH_LEN   = 64;
const HASH_ALGO  = 'sha256';

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, HASH_ITER, HASH_LEN, HASH_ALGO, (err, key) => {
      if (err) return reject(err);
      resolve(key.toString('hex'));
    });
  });
}

async function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate    = await hashPassword(password, salt);
  // Comparação em tempo constante para evitar timing attacks
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

// ─── POST /api/auth/register ──────────────────────────────────

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: 'E-mail inválido.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres.' });
    }

    // Verifica duplicidade
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const passwordHash = await createPasswordHash(password);

    const [result] = await pool.execute(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email.toLowerCase().trim(), passwordHash, (name || '').slice(0, 120)]
    );

    const userId = result.insertId;
    const token  = signToken({ id: userId, email });

    res.status(201).json({
      token,
      user: { id: userId, email: email.toLowerCase().trim(), name: name || '' },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, email, password, name FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      // Mensagem genérica para não revelar se o e-mail existe
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const user  = rows[0];
    const valid = await verifyPassword(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = signToken({ id: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, name, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/auth/me ────────────────────────────────────────

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'O campo "name" é obrigatório.' });
    }

    await pool.execute(
      'UPDATE users SET name = ? WHERE id = ?',
      [name.trim().slice(0, 120), req.user.id]
    );

    res.json({ message: 'Perfil atualizado.' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/auth/me ───────────────────────────────────────

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    // A FK com ON DELETE CASCADE remove os projetos automaticamente
    await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Conta excluída.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
