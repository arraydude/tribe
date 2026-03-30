# Tribe Order Management

Internal app for managing Tribe Shipping's orders and inventory.

## Running

```bash
npm run dev          # Vite (5173) + API server (3456)
npm run seed         # Seed DB from JSON
npm test             # Correr tests (37 tests)
npm run test:watch   # Tests en modo watch
```

## Tests

37 tests de integración que cubren los flujos financieros críticos. Usan SQLite in-memory (cada test tiene su propia BD aislada, sin state compartido).

- **Stock sell (6)**: transacción atómica (decrementa stock + crea order), rollback en insuficiente, validación de status DISPONIBLE, prevención de oversell, linkeo de stock_item_id
- **Stock balance (8)**: cálculo inversión vs recuperado, exclusión de soft-deleted y de investment orders, balance positivo/negativo, ganancia real (precio - costo), items independientes
- **Investment creation (5)**: creación atómica pedido + stock, order=Tribe/presupuestado=0/CONCAT/tax/debitado, stock=EN TRANSITO/disponible=0, link bidireccional, reutilización cliente Tribe
- **Convert to stock (3)**: conversión de pedido de inversión a stock item, link bidireccional, cálculo de costo por unidad
- **Quotation (9)**: tax 4%, envío $45/kg, márgenes (20/30/50%), redondeo a 2 decimales
- **Orders (6)**: CRUD, resolución de cliente, soft delete, linkeo stock_item_id

## Order Types

### Importación

Tribe compra una parte de un proveedor en USA, la importa a Argentina, y la vende al cliente.

#### Fórmula de costos

```
Compra (USD)                    ← input: precio del proveedor
× 1.01 = Debitado              ← costo banco (1%)
× 1.04 = Subtotal              ← debitado + comisión financiera (4%)
+ Envío ($45/kg)               ← auto desde peso, o input directo
─────────────────────────────
= Costo Total

Costo Total × (1 + margen)    = Presupuestado (override-able)
Presupuestado - Costo Total    = Ganancia
```

- **Compra**: lo que cobra el proveedor (USD)
- **Debitado**: lo que debita el banco/tarjeta (~1% más que compra)
- **Subtotal (Tax 4%)**: debitado × 1.04 — incluye la comisión financiera de Tribe
- **Envío**: $45 USD por kg de peso
- **Costo Total**: subtotal + envío — el costo real para Tribe
- **Margen**: configurable entre 10% y 30%
- **Presupuestado**: precio al cliente (auto-calculado, pero se puede overridear con un precio fijo)
- **Ganancia**: presupuestado − costo total

### Venta de Stock

Tribe vende de su inventario pre-comprado. El costo de compra es 0 (ya se invirtió), la ganancia es el precio de venta completo. Al crear un pedido de stock, se selecciona el item del inventario y el precio se auto-llena según el tipo de cliente.

## Flujo de Stock e Inventario

El ciclo de vida completo de un item de stock tiene 3 fases:

### Fase 1: Inversión (compra + stock atómico)

Desde el dropdown **"+ Nuevo" → "Inversión de Stock"**. El usuario completa: Marca, Item, Variante, Cantidad, Valor de Compra Total.

Al crear se generan **dos registros atómicamente** en una transacción:

1. **Pedido en Seguimiento**: a nombre de "Tribe" (internal), con item = "MARCA ITEM VARIANTE", fecha = hoy, valor_compra = input, tax = compra × 4%, valor_debitado = compra + tax, presupuestado = 0. Aparece como **pérdida** en el dashboard.
2. **Stock item**: status EN TRANSITO, cantidad_disponible = 0, investment_order_id linkeado al pedido.

Ambos registros quedan linkeados bidireccionalmente (order.stock_item_id ↔ stock.investment_order_id).

### Fase 2: Llegada y actualización de costos

Cuando el producto llega, se edita el stock item desde la vista Stock:

1. Se actualiza el **status** (EN TRANSITO → DISPONIBLE)
2. Se carga el **costo de envío** real
3. El **costo por unidad** se auto-calcula: (valor_compra + tax + costo_envio) / cantidad
4. Los **precios por tier** se auto-calculan: Lista (×1.4), Taller (×1.3), EMI (×1.2)
5. La **cantidad disponible** se setea automáticamente = cantidad invertida

El stock queda listo para vender.

### Fase 3: Ventas desde stock

Cada venta crea un pedido nuevo con `is_stock = SI`:

1. Desde cualquier vista, **"+ Nuevo"** → tab **"Venta de Stock"**
2. Se selecciona el **cliente** (combobox con autocompletado)
3. Se selecciona el **item del stock** (solo muestra items con status DISPONIBLE y cantidad > 0)
4. El precio se auto-llena según el tipo del cliente:
   - Cliente `standard` → Precio Lista
   - Cliente `taller` → Precio Taller
   - Cliente `emi` → Precio EMI
5. Se crea el pedido con `stock_item_id` linkeado y el stock se decrementa automáticamente en una transacción
6. La ganancia de cada venta va compensando la pérdida de la inversión original

### Balance por item

El dashboard de stock muestra para cada item:
- **Invertido**: cantidad_invertida × costo_por_unidad
- **Recuperado**: suma de ganancia de todos los pedidos de venta vinculados
- **Balance**: recuperado - invertido (rojo si negativo, normal si positivo)
- **Ventas**: cantidad de pedidos de venta realizados

El KPI **"Balance Total"** muestra la suma de todos los balances.

### Estados del stock item

```
EN TRANSITO → RECIBIDO → DISPONIBLE
```

- **EN TRANSITO**: se compró, se cargó el costo de compra, se trackea
- **RECIBIDO**: llegó al país, se carga costo de envío
- **DISPONIBLE**: se calcularon precios por tier, listo para vender

Solo se puede vender un item en estado DISPONIBLE.

### Tiers de precio por tipo de cliente

| Tipo de cliente | Tier | Margen aprox. |
|---|---|---|
| `standard` | Precio Lista | ~40% |
| `taller` (talleres partner) | Precio Taller | ~30% |
| `emi` | Precio EMI | ~20% |
| `internal` | Costo | 0% |

## Equipo

Dos integrantes: **NAHUE** y **FEDE**. Se asignan a pedidos ("Asignado") y se registra a quién se saldó el pago ("Saldado A").

## Estados de pedido

`TO DO` → `IN PROGRESS` → `RECEIVED BAIRES` → `DONE`

"Saldado" (SI/NO) es independiente del estado — indica si el cliente pagó.

## Origen de datos

Datos originales en `../../ops/spreadsheets/Seguimiento compras Tribe.xlsx`:
- **SEGUIMIENTO** — Pedidos históricos (791 registros)
- **STOCK** — Inventario con precios por tier
- **REPRO** — Licencias BootMod3/Femto (pendiente de migrar)
- **PAQUETES** — Precios de paquetes/bundles
