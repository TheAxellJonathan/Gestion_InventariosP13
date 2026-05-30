// test/client.test.js
// ── Cliente gRPC de prueba — 3 casos requeridos por la práctica ───
'use strict';

const grpc        = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');
const path         = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/orders.proto');
const SERVER_ADDR = process.env.SERVER_ADDR || 'localhost:50051';

const packageDef  = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const ordersProto = grpc.loadPackageDefinition(packageDef).orders;
const client      = new ordersProto.OrderService(
  SERVER_ADDR,
  grpc.credentials.createInsecure()
);

// ── Utilidad: formatear resultado en consola ──────────────────────
function printResult(caseNum, description, err, response) {
  console.log('\n' + '='.repeat(55));
  console.log(`  CASO ${caseNum}: ${description}`);
  console.log('='.repeat(55));

  if (err) {
    console.log(`  ✗ Error gRPC capturado:`);
    console.log(`    Código:  ${err.code}`);
    console.log(`    Mensaje: ${err.details}`);
  } else {
    console.log(`  ✓ Respuesta recibida:`);
    console.log(`    ID Orden:  ${response.order_id}`);
    console.log(`    Estado:    ${response.status}`);
    console.log(`    Subtotal:  $${response.subtotal.toFixed(2)}`);
    console.log(`    Descuento: $${response.discount.toFixed(2)}`);
    console.log(`    IVA 16%:   $${response.tax.toFixed(2)}`);
    console.log(`    TOTAL:     $${response.total.toFixed(2)}`);
    if (response.message) console.log(`    Mensaje:   ${response.message}`);
    if (response.error)   console.log(`    Error:     ${response.error}`);
  }
}

// ── CASO 1: Orden válida (debe responder APROBADA) ────────────────
// Laptop HP 15 x 2 unidades @ $12,500 = $25,000
// Supera $5,000 → aplica 10% descuento → IVA 16% sobre monto neto
function caso1() {
  return new Promise(resolve => {
    const request = {
      client_id:  'CLI-001',
      product_id: 'PROD-001',  // Laptop HP 15 — stock: 10
      quantity:   2,
      unit_price: 12500.00,
    };

    client.ProcessOrder(request, (err, response) => {
      printResult(1, 'Orden válida con descuento aplicado (APROBADA)', err, response);
      resolve();
    });
  });
}

// ── CASO 2: Sobregiro de stock (debe responder RECHAZADA) ─────────
// Teclado Mecánico — stock: 0 → debe rechazarse
function caso2() {
  return new Promise(resolve => {
    const request = {
      client_id:  'CLI-002',
      product_id: 'PROD-003',  // Teclado Mecánico — stock: 0
      quantity:   5,
      unit_price: 1200.00,
    };

    client.ProcessOrder(request, (err, response) => {
      printResult(2, 'Orden con stock insuficiente (RECHAZADA)', err, response);
      resolve();
    });
  });
}

// ── CASO 3: Datos corruptos / ID inválido ─────────────────────────
// product_id vacío → el middleware debe lanzar excepción controlada
function caso3() {
  return new Promise(resolve => {
    const request = {
      client_id:  'CLI-003',
      product_id: '',           // ID inválido → excepción controlada
      quantity:   1,
      unit_price: 500.00,
    };

    client.ProcessOrder(request, (err, response) => {
      printResult(3, 'Datos corruptos / ID de producto vacío (EXCEPCIÓN CONTROLADA)', err, response);
      resolve();
    });
  });
}

// ── CASO BONUS: Orden sin descuento (monto < $5,000) ─────────────
function casoBonus() {
  return new Promise(resolve => {
    const request = {
      client_id:  'CLI-004',
      product_id: 'PROD-004',  // Mouse Inalámbrico — stock: 20
      quantity:   3,
      unit_price: 450.00,      // Total: $1,350 < $5,000 → sin descuento
    };

    client.ProcessOrder(request, (err, response) => {
      printResult('BONUS', 'Orden válida sin descuento por monto menor a $5,000', err, response);
      resolve();
    });
  });
}

// ── Ejecutar todos los casos en secuencia ─────────────────────────
async function runAllTests() {
  console.log('\n');
  console.log('  PRÁCTICA 13 — Pruebas de Integración Distribuida');
  console.log('  Servicio de Procesamiento de Órdenes');
  console.log('  CodeLink Solutions — UMB Huixquilucan');
  console.log('  Conectando a:', SERVER_ADDR);

  await caso1();
  await caso2();
  await caso3();
  await casoBonus();

  console.log('\n' + '='.repeat(55));
  console.log('  Pruebas completadas.');
  console.log('='.repeat(55) + '\n');

  client.close();
}

runAllTests().catch(console.error);
