# Práctica 13 — Capa de Negocios Distribuida
## Sistema de Procesamiento de Órdenes de Compra
### CodeLink Solutions · UMB Huixquilucan · 2026

---

## Descripción

Servicio de procesamiento de órdenes de compra implementado con:
- **Lógica de negocio** (`src/domain/orderService.js`) — completamente aislada del middleware
- **Middleware gRPC** (`src/middleware/grpcServer.js`) — gestiona comunicación de red
- **Persistencia** (`src/db/database.js`) — SQLite con better-sqlite3

## Estructura del proyecto

```
p13/
├── index.js                    # Punto de entrada
├── package.json
├── proto/
│   └── orders.proto            # Contrato gRPC (interface definition)
├── src/
│   ├── domain/
│   │   └── orderService.js     # Lógica de negocio pura (sin middleware)
│   ├── middleware/
│   │   └── grpcServer.js       # Servidor gRPC (capa de transporte)
│   └── db/
│       └── database.js         # Persistencia SQLite
├── test/
│   └── client.test.js          # Cliente gRPC con 3 casos de prueba
└── data/
    └── inventory.db            # SQLite (se genera automáticamente)
```

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Ejecución

### 1. Iniciar el servidor (en una terminal)

```bash
npm start
```

Verás:
```
[DB] Base de datos lista: .../data/inventory.db
[gRPC] Servidor escuchando en puerto 50051
```

### 2. Ejecutar las pruebas (en otra terminal)

```bash
npm test
```

## Casos de prueba incluidos

| Caso | Descripción | Estado esperado |
|------|-------------|-----------------|
| 1 | Laptop x2 @ $12,500 (supera $5,000) | APROBADA con 10% descuento + 16% IVA |
| 2 | Teclado Mecánico (stock = 0) | RECHAZADA por stock insuficiente |
| 3 | product_id vacío | Excepción controlada gRPC INVALID_ARGUMENT |
| Bonus | Mouse x3 @ $450 (sin descuento) | APROBADA sin descuento + 16% IVA |

## Reglas de negocio implementadas

1. **Validación de stock** — si el producto no tiene existencias suficientes, la orden se rechaza
2. **Cálculo de IVA y descuentos** — 16% IVA siempre; 10% descuento si subtotal ≥ $5,000
3. **Máquina de estados** — `CREADA → VALIDADA → APROBADA | RECHAZADA`

## Variables de entorno (opcionales)

```bash
GRPC_PORT=50051       # Puerto del servidor (default: 50051)
SERVER_ADDR=localhost:50051  # Dirección para el cliente de prueba
```
