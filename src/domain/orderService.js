// src/domain/orderService.js
// ── Capa de negocio pura ──────────────────────────────────────────
// REGLA DE ORO: Este módulo NO sabe si los datos vienen de gRPC,
// REST, Kafka o consola. Solo recibe datos, aplica reglas y devuelve
// un resultado. Cero dependencias de transporte o middleware.
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// ── Constantes de negocio ─────────────────────────────────────────
const TAX_RATE           = 0.16;   // IVA 16%
const DISCOUNT_RATE      = 0.10;   // Descuento 10%
const DISCOUNT_THRESHOLD = 5000;   // Monto mínimo para descuento

// ── Estados válidos y sus transiciones ───────────────────────────
const STATE_MACHINE = {
  CREADA:    ['VALIDADA'],
  VALIDADA:  ['APROBADA', 'RECHAZADA'],
  APROBADA:  [],
  RECHAZADA: [],
};

// ── Errores de dominio ────────────────────────────────────────────
class BusinessError extends Error {
  constructor(code, message) {
    super(message);
    this.code    = code;
    this.name    = 'BusinessError';
  }
}

// ── Validaciones de entrada ───────────────────────────────────────
function validateInput(request) {
  if (!request.client_id || request.client_id.trim() === '') {
    throw new BusinessError('INVALID_INPUT', 'El ID de cliente es requerido.');
  }
  if (!request.product_id || request.product_id.trim() === '') {
    throw new BusinessError('INVALID_INPUT', 'El ID de producto es requerido.');
  }
  if (!request.quantity || request.quantity <= 0) {
    throw new BusinessError('INVALID_INPUT', 'La cantidad debe ser mayor a cero.');
  }
  if (!request.unit_price || request.unit_price <= 0) {
    throw new BusinessError('INVALID_INPUT', 'El precio unitario debe ser mayor a cero.');
  }
}

// ── Regla 1: Validación de stock ──────────────────────────────────
function validateStock(product, quantity) {
  if (!product) {
    throw new BusinessError('PRODUCT_NOT_FOUND', 'El producto no existe en el inventario.');
  }
  if (product.stock < quantity) {
    throw new BusinessError(
      'INSUFFICIENT_STOCK',
      `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}.`
    );
  }
}

// ── Regla 2: Cálculo de impuestos y descuentos ────────────────────
function calculateTotals(quantity, unitPrice) {
  const subtotal = quantity * unitPrice;
  const discount = subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0;
  const taxBase  = subtotal - discount;
  const tax      = taxBase * TAX_RATE;
  const total    = taxBase + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    tax:      parseFloat(tax.toFixed(2)),
    total:    parseFloat(total.toFixed(2)),
  };
}

// ── Regla 3: Transición de estados ───────────────────────────────
function transitionState(currentState, nextState) {
  const allowed = STATE_MACHINE[currentState] || [];
  if (!allowed.includes(nextState)) {
    throw new BusinessError(
      'INVALID_TRANSITION',
      `Transición inválida: ${currentState} → ${nextState}.`
    );
  }
  return nextState;
}

// ── Caso de uso principal: Procesar orden ─────────────────────────
function processOrder(request) {
  // Paso A: validar datos de entrada
  validateInput(request);

  // Estado inicial
  let status = 'CREADA';

  // Paso B: verificar stock (CREADA → VALIDADA o RECHAZADA)
  const product = db.getProduct(request.product_id);
  try {
    validateStock(product, request.quantity);
    status = transitionState(status, 'VALIDADA');
  } catch (err) {
    if (err.code === 'PRODUCT_NOT_FOUND' || err.code === 'INSUFFICIENT_STOCK') {
      // Crear orden con estado RECHAZADA y regresar
      const orderId  = uuidv4();
      const totals   = calculateTotals(request.quantity, request.unit_price);
      const order    = {
        id:         orderId,
        client_id:  request.client_id,
        product_id: request.product_id,
        quantity:   request.quantity,
        unit_price: request.unit_price,
        ...totals,
        status:     'RECHAZADA',
      };
      db.createOrder(order);
      return { ...order, message: null, error: err.message };
    }
    throw err;
  }

  // Paso C: calcular montos
  const totals = calculateTotals(request.quantity, request.unit_price);

  // Paso D: transición VALIDADA → APROBADA
  status = transitionState(status, 'APROBADA');

  // Paso E: descontar stock y persistir orden
  const orderId = uuidv4();
  const order   = {
    id:         orderId,
    client_id:  request.client_id,
    product_id: request.product_id,
    quantity:   request.quantity,
    unit_price: request.unit_price,
    ...totals,
    status,
  };

  db.updateStock(request.product_id, request.quantity);
  db.createOrder(order);

  const discountMsg = totals.discount > 0
    ? ` Se aplicó descuento del 10% por compra mayor a $${DISCOUNT_THRESHOLD}.`
    : '';

  return {
    ...order,
    message: `Orden procesada correctamente.${discountMsg}`,
    error:   null,
  };
}

// ── Caso de uso: Consultar orden ──────────────────────────────────
function getOrder(orderId) {
  if (!orderId || orderId.trim() === '') {
    throw new BusinessError('INVALID_INPUT', 'El ID de orden es requerido.');
  }
  const order = db.getOrder(orderId);
  if (!order) {
    throw new BusinessError('ORDER_NOT_FOUND', `La orden ${orderId} no existe.`);
  }
  return { ...order, message: null, error: null };
}

module.exports = { processOrder, getOrder, BusinessError };
