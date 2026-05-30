// index.js
// ── Punto de entrada de la aplicación ────────────────────────────
'use strict';

const fs         = require('fs');
const path       = require('path');
const { initDb } = require('./src/db/database');
const { startServer } = require('./src/middleware/grpcServer');

// Crear directorio de datos si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Inicializar base de datos
initDb();

// Iniciar servidor gRPC (middleware)
startServer();

console.log('='.repeat(50));
console.log('  SmartFarm AI — Servicio de Órdenes v1.0');
console.log('  Práctica 13: Capa de Negocios Distribuida');
console.log('  CodeLink Solutions — UMB Huixquilucan');
console.log('='.repeat(50));
