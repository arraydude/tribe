# Tribe Order Management

Internal app for managing Tribe Shipping's orders and inventory.

## Running

```bash
npm run dev          # Vite (5173) + API server (3456)
npm run seed         # Seed DB from JSON
npm test             # Correr tests (27 tests)
npm run test:watch   # Tests en modo watch
```

## Tests

27 tests de integración que cubren los flujos financieros críticos. Usan SQLite in-memory (cada test tiene su propia BD aislada, sin state compartido).

- **Stock sell (6)**: transacción atómica (decrementa stock + crea order), rollback en insuficiente, validación de status DISPONIBLE, prevención de oversell, linkeo de stock_item_id
- **Stock balance (6)**: cálculo inversión vs recuperado, exclusión de soft-deleted, balance positivo/negativo, items independientes
- **Quotation (9)**: tax 4%, envío $45/kg, márgenes (20/30/50%), redondeo a 2 decimales
- **Orders (6)**: CRUD, resolución de cliente, soft delete, linkeo stock_item_id

## Order Types

### Importación

Tribe compra una parte de un proveedor en USA, la importa a Argentina, y la vende al cliente. Los costos se calculan automáticamente: tax (4%), envío ($45/kg), y margen (20-30%).

### Venta de Stock

Tribe vende de su inventario pre-comprado. El costo de compra es 0 (ya se invirtió), la ganancia es el precio de venta completo. Al crear un pedido de stock, se selecciona el item del inventario y el precio se auto-llena según el tipo de cliente.

## Flujo de Stock e Inventario

El ciclo de vida completo de un item de stock tiene 3 fases:

### Fase 1: Compra e importación (pedido de inversión)

Tribe compra partes a un proveedor para tener en stock. Esto se registra como un pedido de importación con **valor presupuestado = 0** (no hay cliente, es una inversión propia):

1. Se crea el pedido con los costos conocidos: **valor de compra** + **valor debitado** (1%) + **tax** (4%)
2. Se trackea el estado de la importación cambiando el **Item Status** (TO DO → IN PROGRESS → RECEIVED BAIRES → DONE) y actualizando el **tracking**
3. Una vez llega al país, se carga el **costo de envío** (costo de importación basado en peso)
4. Este pedido aparece como **pérdida** en el seguimiento (se gastó plata sin vender nada todavía)

### Fase 2: Registro en stock

Una vez que el producto llega y se conoce el costo total real (compra + tax + envío), se registra en el inventario:

1. Desde la vista **Stock**, se clickea **"+ Inversión"**
2. Se carga: **Marca** + **Item** + **Variante** (ej: CTS / DOWNPIPE / B58)
3. **Cantidad invertida** = unidades compradas
4. **Costo por unidad** = costo total real / cantidad
5. **Precios sugeridos** por tier se auto-calculan:
   - Lista (~40% margen), Taller (~30%), EMI (~20%)
   - Se pueden ajustar manualmente

La cantidad disponible arranca igual a la invertida.

### Fase 3: Ventas desde stock

Cada venta crea un pedido nuevo con `is_stock = SI`:

1. Desde cualquier vista, **"+ Nuevo"** → tab **"Venta de Stock"**
2. Se selecciona el **cliente** (combobox con autocompletado)
3. Se selecciona el **item del stock** (solo muestra items con disponibles > 0)
4. El precio se auto-llena según el tipo del cliente:
   - Cliente `standard` → Precio Lista
   - Cliente `taller` → Precio Taller
   - Cliente `emi` → Precio EMI
5. Se crea el pedido y el stock se decrementa automáticamente en una transacción
6. La ganancia de cada venta va compensando la pérdida de la inversión original

### Tiers de precio por tipo de cliente

| Tipo de cliente | Tier | Margen aprox. |
|---|---|---|
| `standard` | Precio Lista | ~40% |
| `taller` (talleres partner) | Precio Taller | ~30% |
| `emi` | Precio EMI | ~20% |
| `internal` | Costo | 0% |

### Inventario actual

| Marca | Item | Variante | Disponible |
|---|---|---|---|
| CTS | DOWNPIPE | B58 | 8 |
| CTS | DOWNPIPE | S58 | 1 |
| Infinity Design | INTAKE | B58 G42 | 3 |
| Infinity Design | INTAKE | S58 | 1 |
| NGK | Bujias | B58/S58 | 6 |
| Generica | Rejillas | M2 G87 | 4 |

### Dashboard de stock

Muestra KPIs: items en stock, unidades disponibles, valor invertido total, valor actual del stock. Tabla con todos los items, precios por tier, y acciones para editar.

### Pendiente: link inversión → stock

Actualmente la fase 1 (pedido de inversión) y la fase 2 (item de stock) no están conectados en la app. El pedido de inversión no sabe que generó un item de stock, y el item de stock no sabe de qué pedido vino. Falta:
- Tipo de pedido "Inversión de Stock" (presupuestado=0, sin cliente, trackea la importación)
- Conversión automática: cuando el pedido llega y se conoce el costo total, convertirlo en item de stock con un click
- Link bidireccional: stock_item ↔ pedido de inversión

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
