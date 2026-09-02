'use strict';

/**
 * lib/db.js
 *
 * Pool de conexões MySQL via mysql2/promise.
 * Todas as rotas importam `pool` e chamam pool.execute() diretamente.
 *
 * Configuração via variáveis de ambiente (ver .env.example):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'devops',
  password:           process.env.DB_PASSWORD || 'devops',
  database:           process.env.DB_NAME     || 'devops_site',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'Z',          // armazena datas em UTC
  decimalNumbers:     true,
});

// Testa a conexão assim que o módulo é carregado
pool.getConnection()
  .then(conn => {
    console.log(`✅ MySQL conectado — ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'devops_site'}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Falha ao conectar no MySQL:', err.message);
  });

module.exports = { pool };
