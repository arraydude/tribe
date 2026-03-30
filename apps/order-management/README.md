# Tribe Order Management

Internal app for managing Tribe Shipping's orders and inventory.

## Running

```bash
npm run dev          # Vite (5173) + API server (3456)
npm run seed         # Seed DB from JSON
```

## Order Types

### Importación

Tribe compra una parte de un proveedor en USA, la importa a Argentina, y la vende al cliente. Los costos se calculan automáticamente: tax (4%), envío ($45/kg), y margen (20-30%).

### Venta de Stock

Tribe vende de su inventario pre-comprado. El costo de compra es 0 (ya se invirtió), la ganancia es el precio de venta completo. Al crear un pedido de stock, se selecciona el item del inventario y el precio se auto-llena según el tipo de cliente.

## Flujo de Stock e Inventario

### 1. Inversión (compra de stock)

Desde la vista **Stock**, se clickea **"+ Inversión"** para registrar una compra de partes. Se carga:
- **Marca** + **Item** + **Variante** (ej: CTS / DOWNPIPE / B58)
- **Cantidad invertida** (cuántas unidades se compraron)
- **Costo por unidad** en USD
- **Precios sugeridos** por tier: Lista (~40% margen), Taller (~30%), EMI (~20%) — se auto-calculan desde el costo pero se pueden ajustar manualmente

La cantidad disponible arranca igual a la invertida.

### 2. Venta desde stock

Desde cualquier vista, se clickea **"+ Nuevo"** y se elige **"Venta de Stock"**:
1. Se selecciona el **cliente** (combobox con autocompletado)
2. Se selecciona el **item del stock** (solo muestra items con disponibles > 0)
3. El precio se auto-llena según el tipo del cliente:
   - Cliente `standard` → Precio Lista
   - Cliente `taller` → Precio Taller
   - Cliente `emi` → Precio EMI
4. Se crea el pedido y el stock se decrementa automáticamente en una transacción

### 3. Tiers de precio por tipo de cliente

| Tipo de cliente | Tier | Margen aprox. |
|---|---|---|
| `standard` | Precio Lista | ~40% |
| `taller` (talleres partner) | Precio Taller | ~30% |
| `emi` | Precio EMI | ~20% |
| `internal` | Costo | 0% |

### 4. Inventario actual

| Marca | Item | Variante | Disponible |
|---|---|---|---|
| CTS | DOWNPIPE | B58 | 8 |
| CTS | DOWNPIPE | S58 | 1 |
| Infinity Design | INTAKE | B58 G42 | 3 |
| Infinity Design | INTAKE | S58 | 1 |
| NGK | Bujias | B58/S58 | 6 |
| Generica | Rejillas | M2 G87 | 4 |

### 5. Dashboard de stock

Muestra KPIs: items en stock, unidades disponibles, valor invertido total, valor actual del stock. Tabla con todos los items, precios por tier, y acciones para editar.

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
