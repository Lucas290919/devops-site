'use strict';

/**
 * middleware/auth.js
 *
 * Autenticação via JWT assinado com segredo local (HS256).
 *
 * O token é gerado na rota POST /api/auth/login e deve ser
 * enviado no header:  Authorization: Bearer <token>
 *
 * Payload do token:
 *   { sub: <userId>, email: <email>, iat, exp }
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

// Falha imediatamente se o segredo não estiver definido.
// Usar um fallback hardcoded permitiria que tokens fossem forjados
// com um segredo público em caso de misconfiguration.
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não definida. Configure a variável de ambiente antes de iniciar.');
  process.exit(1);
}

/**
 * Gera um token JWT para o usuário informado.
 * @param {{ id: number|string, email: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: JWT_EXPIRES }
  );
}

/**
 * Middleware de autenticação obrigatória.
 * Popula req.user = { id, email } ou retorna 401.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação ausente.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    req.user = {
      id:    decoded.sub,
      email: decoded.email,
    };

    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado.'
      : 'Token inválido.';
    return res.status(401).json({ message });
  }
}

module.exports = { requireAuth, signToken };
