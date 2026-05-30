// src/middleware/grpcServer.js
// ── Capa de middleware: servidor gRPC ─────────────────────────────
// Este módulo SOLO gestiona la comunicación de red (serialización,
// deserialización, control de errores distribuidos).
// Delega TODA la lógica de negocio a src/domain/orderService.js
'use strict';

const grpc       = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');

const orderService = require('../domain/orderService');

const PROTO_PATH = path.join(__dirname, '../../proto/orders.proto');
const PORT       = process.env.GRPC_PORT || '50051';

// ── Cargar definición del contrato .proto ─────────────────────────
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase:     true,
  longs:        String,
  enums:        String,
  defaults:     true,
  oneofs:       true,
});
const ordersProto = grpc.loadPackageDefinition(packageDef).orders;

// ── Handler: ProcessOrder ─────────────────────────────────────────
// El middleware recibe la petición gRPC, extrae los datos,
// llama a la lógica de negocio y empaqueta la respuesta.
function processOrderHandler(call, callback) {
  const req = call.request;
  console.log(`[gRPC] ProcessOrder recibido: cliente=${req.client_id}, producto=${req.product_id}, qty=${req.quantity}`);

  try {
    const result = orderService.processOrder({
      client_id:  req.client_id,
      product_id: req.product_id,
      quantity:   req.quantity,
      unit_price: req.unit_price,
    });

    // Empaquetar respuesta gRPC (serialización)
    callback(null, {
      order_id: result.id,
      status:   result.status,
      subtotal: result.subtotal,
      discount: result.discount,
      tax:      result.tax,
      total:    result.total,
      message:  result.message || '',
      error:    result.error   || '',
    });

  } catch (err) {
    // Control de errores distribuidos: el middleware traduce
    // excepciones de dominio a códigos de error gRPC estándar
    console.error(`[gRPC] Error en ProcessOrder: ${err.message}`);

    if (err.name === 'BusinessError') {
      // Error controlado: datos inválidos o regla de negocio
      callback({
        code:    grpc.status.INVALID_ARGUMENT,
        message: err.message,
      });
    } else {
      // Error no esperado: fallo interno del servidor
      callback({
        code:    grpc.status.INTERNAL,
        message: 'Error interno del servidor. Por favor intente más tarde.',
      });
    }
  }
}

// ── Handler: GetOrder ─────────────────────────────────────────────
function getOrderHandler(call, callback) {
  const req = call.request;
  console.log(`[gRPC] GetOrder recibido: orden=${req.order_id}`);

  try {
    const result = orderService.getOrder(req.order_id);
    callback(null, {
      order_id: result.id,
      status:   result.status,
      subtotal: result.subtotal,
      discount: result.discount,
      tax:      result.tax,
      total:    result.total,
      message:  result.message || '',
      error:    result.error   || '',
    });
  } catch (err) {
    console.error(`[gRPC] Error en GetOrder: ${err.message}`);
    callback({
      code:    err.name === 'BusinessError' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
      message: err.message,
    });
  }
}

// ── Iniciar servidor gRPC ─────────────────────────────────────────
function startServer() {
  const server = new grpc.Server();

  server.addService(ordersProto.OrderService.service, {
    ProcessOrder: processOrderHandler,
    GetOrder:     getOrderHandler,
  });

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC] Error al iniciar el servidor:', err);
        process.exit(1);
      }
      console.log(`[gRPC] Servidor escuchando en puerto ${port}`);
    }
  );

  return server;
}

module.exports = { startServer };
