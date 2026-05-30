// src/db/database.js
// ── Persistencia con SQLite (better-sqlite3) ──────────────────────
'use strict';
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH  = path.join(DATA_DIR, 'inventory.db');

let db;
function getDb() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDb() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id    TEXT PRIMARY KEY, name TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0, price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      subtotal REAL NOT NULL, discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0, total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREADA',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const count = database.prepare('SELECT COUNT(*) as c FROM products').get();
  if (count.c === 0) {
    const ins = database.prepare('INSERT INTO products (id,name,stock,price) VALUES (?,?,?,?)');
    ins.run('PROD-001','Laptop HP 15',      10, 12500.00);
    ins.run('PROD-002','Monitor Dell 27"',   5,  6800.00);
    ins.run('PROD-003','Teclado Mecanico',   0,  1200.00);
    ins.run('PROD-004','Mouse Inalambrico', 20,   450.00);
    console.log('[DB] Inventario inicial cargado.');
  }
  console.log('[DB] Base de datos lista:', DB_PATH);
  return database;
}

function getProduct(id)   { return getDb().prepare('SELECT * FROM products WHERE id=?').get(id); }
function updateStock(pid,qty){ getDb().prepare('UPDATE products SET stock=stock-? WHERE id=?').run(qty,pid); }
function createOrder(o)   { getDb().prepare(`INSERT INTO orders (id,client_id,product_id,quantity,unit_price,subtotal,discount,tax,total,status) VALUES (@id,@client_id,@product_id,@quantity,@unit_price,@subtotal,@discount,@tax,@total,@status)`).run(o); }
function updateOrderStatus(id,status){ getDb().prepare('UPDATE orders SET status=? WHERE id=?').run(status,id); }
function getOrder(id)     { return getDb().prepare('SELECT * FROM orders WHERE id=?').get(id); }

module.exports = { initDb, getProduct, updateStock, createOrder, updateOrderStatus, getOrder };
