// src/db/database.js
// ── Persistencia con SQLite (sql.js — sin dependencias nativas) ───────
'use strict';
const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH  = path.join(DATA_DIR, 'inventory.db');

let db;

async function getDb() {
  if (!db) {
    const SQL = await initSqlJs();
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
  }
  return db;
}

function save() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, db.export());
}

async function initDb() {
  const database = await getDb();
  database.run(`
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
  const [{ values }] = database.exec('SELECT COUNT(*) FROM products');
  if (values[0][0] === 0) {
    database.run('INSERT INTO products VALUES (?,?,?,?)', ['PROD-001','Laptop HP 15',      10, 12500.00]);
    database.run('INSERT INTO products VALUES (?,?,?,?)', ['PROD-002','Monitor Dell 27"',   5,  6800.00]);
    database.run('INSERT INTO products VALUES (?,?,?,?)', ['PROD-003','Teclado Mecanico',   0,  1200.00]);
    database.run('INSERT INTO products VALUES (?,?,?,?)', ['PROD-004','Mouse Inalambrico', 20,   450.00]);
    save();
    console.log('[DB] Inventario inicial cargado.');
  }
  console.log('[DB] Base de datos lista:', DB_PATH);
  return database;
}

function getProduct(id) {
  const db_ = db;
  const res = db_.exec('SELECT * FROM products WHERE id=?', [id]);
  if (!res.length) return null;
  const [col, row] = [res[0].columns, res[0].values[0]];
  return Object.fromEntries(col.map((c, i) => [c, row[i]]));
}

function updateStock(pid, qty) {
  db.run('UPDATE products SET stock=stock-? WHERE id=?', [qty, pid]);
  save();
}

function createOrder(o) {
  db.run(
    `INSERT INTO orders (id,client_id,product_id,quantity,unit_price,subtotal,discount,tax,total,status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [o.id, o.client_id, o.product_id, o.quantity, o.unit_price, o.subtotal, o.discount, o.tax, o.total, o.status]
  );
  save();
}

function updateOrderStatus(id, status) {
  db.run('UPDATE orders SET status=? WHERE id=?', [status, id]);
  save();
}

function getOrder(id) {
  const res = db.exec('SELECT * FROM orders WHERE id=?', [id]);
  if (!res.length) return null;
  const [col, row] = [res[0].columns, res[0].values[0]];
  return Object.fromEntries(col.map((c, i) => [c, row[i]]));
}

module.exports = { initDb, getProduct, updateStock, createOrder, updateOrderStatus, getOrder };
