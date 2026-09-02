'use strict';

/**
 * middleware/errorHandler.js
 *
 * Middlewares centralizados de tratamento de erros:
 *  - notFound: responde 404 para rotas inexistentes
 *  - errorHandler: captura erros lançados em qualquer rota
 */

/**
 * Rota não encontrada (404).
 */
function notFound(req, res) {
  res.status(404).json({
    message: `Rota não encontrada: ${req.method} ${req.path}`,
  });
}

/**
 * Handler global de erros (deve ser o último middleware registrado).
 * @param {Error} err
 */
function errorHandler(err, req, res, _next) { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);

  // Erros de validação do body JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
  }

  // Erros de CORS
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }

  // Erro genérico
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || 'Erro interno do servidor.',
  });
}

module.exports = { notFound, errorHandler };
