// index.js
// ── Punto de entrada de la aplicación ────────────────────────────
'use strict';

const fs         = require('fs');
const path       = require('path');
const { initDb } = require('./src/db/database');
const { startServer } = require('./src/middleware/grpcServer');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

(async () => {
  await initDb();
  startServer();

  console.log('='.repeat(50));
  console.log('  Sistema de Gestión de Inventarios y Pedidos');
  console.log('  Práctica 13: Capa de Negocios Distribuida');
  console.log('  CodeLink Solutions — UMB Huixquilucan');
  console.log('='.repeat(50));
})();
