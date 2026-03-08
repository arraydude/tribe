# Tribe Shipping — Order Management POC

Sistema CRUD para gestión de pedidos de Tribe Shipping, reemplazando el Excel (`Seguimiento compras Tribe.xlsx`) con una app web con persistencia, validación y seguridad de datos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Base de datos | SQLite (better-sqlite3), WAL mode |
| Backend | Hono + @hono/node-server (TypeScript, puerto 3456) |
| Frontend | Vite 7 + React 19 + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui (estilo new-york, dark mode) |
| Tablas | TanStack Table v8 (sort, filtros, paginación) |
| Data fetching | TanStack Query v5 (cache, invalidación automática) |
| Charts | Recharts (Area, Bar, Pie) |
| Formularios | useState (campos controlados) |
| Fuentes | Bebas Neue (display), JetBrains Mono (datos), Outfit (body) |

## Arquitectura

```
Browser (:5173)  →  Vite proxy /api/*  →  Hono server (:3456)  →  SQLite (tribe.db)
```

En desarrollo, Vite sirve el frontend y proxea `/api` al servidor Hono. Ambos se levantan con un solo comando.

## Cómo correrlo

```bash
cd demo
npm install          # instalar dependencias
npm run seed         # importar datos del Excel (767 pedidos, 151 clientes)
npm run dev          # levanta frontend (:5173) + backend (:3456)
```

### Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `concurrently "vite" "tsx watch server/index.ts"` | Frontend + backend juntos |
| `dev:client` | `vite` | Solo frontend |
| `dev:server` | `tsx watch server/index.ts` | Solo backend (hot reload) |
| `seed` | `tsx server/seed.ts` | Importar orders.json → SQLite |
| `build` | `tsc -b && vite build` | Build de producción |

## Estructura del proyecto

```
demo/
├── server/
│   ├── index.ts              # Hono app, CORS, rutas montadas
│   ├── db.ts                 # Conexión SQLite, schema, prepared statements
│   ├── seed.ts               # Importación: orders.json → SQLite
│   ├── tsconfig.json
│   └── routes/
│       ├── orders.ts         # CRUD de pedidos
│       ├── dashboard.ts      # Stats pre-computados
│       └── quotation.ts      # Calculadora de cotización
├── src/
│   ├── main.tsx              # Entry: QueryClientProvider
│   ├── App.tsx               # Router de vistas (state-based)
│   ├── index.css             # Design system: tokens, animaciones, texturas
│   ├── lib/
│   │   └── api.ts            # Fetch client tipado + interfaces
│   ├── hooks/
│   │   └── useOrders.ts      # React Query hooks (CRUD + dashboard)
│   ├── components/
│   │   ├── Dashboard.tsx     # KPIs + charts (desde API)
│   │   ├── OrdersTable.tsx   # Tabla con búsqueda, filtros, acciones
│   │   ├── columns.tsx       # Definición de columnas + actions
│   │   ├── OrderForm.tsx     # Formulario crear/editar pedido
│   │   ├── QuotationCalc.tsx # Cotizador en vivo
│   │   ├── ConfirmDialog.tsx # Modal de confirmación
│   │   └── ui/              # Componentes shadcn/ui
│   └── data/
│       └── orders.json       # Datos exportados del Excel (seed)
├── scripts/
│   └── export.py             # Excel → JSON (openpyxl)
├── tribe.db                  # Base de datos SQLite
├── vite.config.ts            # Proxy /api → :3456
└── package.json
```

## Base de datos

### Mejoras vs Excel

- Tabla `clients` separada (normalización, nombres consistentes)
- Booleans reales (`is_stock`, `is_paid`) en vez de strings "SI"/"NO"
- CHECK constraints en `status` y `type`
- Soft deletes (`deleted_at`) — nunca se pierde data
- Timestamps automáticos (`created_at`, `updated_at`)
- Foreign keys con integridad referencial

### Schema

```sql
CREATE TABLE clients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  type        TEXT DEFAULT 'standard'
              CHECK(type IN ('standard','taller','emi','internal')),
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id           INTEGER NOT NULL REFERENCES clients(id),
  item                TEXT NOT NULL,
  cantidad            REAL DEFAULT 1,
  link_compra         TEXT,
  valor_presupuestado REAL,
  fecha_compra        TEXT,
  valor_compra        REAL,
  valor_debitado      REAL,
  tax                 REAL,
  costo_envio         REAL,
  peso                REAL,
  status              TEXT DEFAULT 'TO DO'
                      CHECK(status IN ('TO DO','IN PROGRESS','RECEIVED BAIRES','DONE')),
  is_stock            INTEGER DEFAULT 0,
  is_paid             INTEGER DEFAULT 0,
  asignado            TEXT,
  ganancia            REAL,
  paid_to             TEXT,
  tracking            TEXT,
  observaciones       TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  deleted_at          TEXT
);
```

### Tipos de cliente

| Tipo | Descripción |
|------|-------------|
| `standard` | Cliente regular |
| `taller` | Taller/shop (Bavarian Motorsport, ADM Team Auto, etc.) |
| `emi` | Socio/interno |
| `internal` | Compras propias de Tribe (TRIBE, NERF) — excluidas de métricas de ganancia |

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/orders` | Listar pedidos (excluye borrados). Query: `?search=&status=&paid=&sort=&dir=` |
| `GET` | `/api/orders/:id` | Detalle de un pedido |
| `POST` | `/api/orders` | Crear pedido. Acepta `cliente` (string) o `client_id`. Crea cliente automáticamente si no existe |
| `PUT` | `/api/orders/:id` | Editar pedido. Merge con valores existentes |
| `DELETE` | `/api/orders/:id` | Soft-delete (marca `deleted_at`) |
| `GET` | `/api/dashboard/stats` | KPIs, top clientes, datos mensuales, distribución de estado, mejor/peor pedido |
| `POST` | `/api/quotation/calculate` | Calcular cotización: `{ precio_compra, peso_kg, margen? }` |
| `GET` | `/api/clients` | Listar todos los clientes |

## Frontend

### Vistas

Navegación basada en estado (sin React Router), 5 vistas:

**Dashboard** — KPIs (pedidos totales, ganancia total/promedio, en curso) + cards de mayor ganancia/pérdida + chart de ganancia mensual (AreaChart) + distribución de estado (PieChart) + top 10 clientes (BarChart horizontal).

**Pedidos** — Tabla paginada (30 por página) con búsqueda global, filtro por estado y saldado. Columnas: cliente, item, cantidad, presupuesto, compra, envío, ganancia (verde/rojo), estado (badge), saldado, fecha, asignado, acciones (editar/borrar).

**Nuevo Pedido** — Formulario completo: cliente, item, valores financieros, status, toggles stock/saldado, tracking, observaciones.

**Editar Pedido** — Mismo formulario pre-poblado con datos existentes.

**Cotizador** — Calculadora en vivo con la fórmula de Tribe. Inputs: precio compra, peso (kg), margen (%). Botones rápidos para 20% y 30%.

### Diseño

Tema oscuro "motorsport telemetry":
- Fondo `#0a0a0a` con textura noise overlay
- Cards con textura carbon fiber (dot grid)
- Colores: naranja M-Sport (`#f97316`), verde ganancia (`#22c55e`), rojo pérdida (`#ef4444`), cyan datos (`#06b6d4`)
- Animaciones staggered en carga (slide up, fade in)
- Scrollbar customizado

## Fórmula de cotización

```
COSTO_BASE = PRECIO_COMPRA × 1.04        # precio + 4% fee de tarjeta
ENVIO_ARG  = 45 × PESO_KG                # $45/kg fijo Miami → Argentina
COSTO      = COSTO_BASE + ENVIO_ARG
PRECIO     = COSTO × (1 + MARGEN)
GANANCIA   = PRECIO − COSTO
```

| Tipo de cliente | Margen |
|----------------|--------|
| Standard | 30% |
| Taller / Habitual | 20% |

## Seguridad de datos

- **Soft deletes**: los pedidos borrados se marcan con `deleted_at`, nunca se eliminan de la DB
- **Confirmación**: modal antes de cualquier borrado
- **Validación**: cliente e item son campos obligatorios
- **Timestamps**: `created_at` y `updated_at` automáticos en cada pedido
- **Foreign keys**: integridad referencial entre orders y clients
- **WAL mode**: mejor rendimiento de lectura concurrente en SQLite

## Pipeline de importación

```
Excel (.xlsx)  →  export.py (openpyxl)  →  orders.json  →  seed.ts  →  SQLite
```

1. `scripts/export.py` lee la hoja "SEGUIMIENTO COMPRAS TRIBE" del Excel y exporta a JSON
2. `server/seed.ts` lee el JSON, normaliza nombres de clientes (Title Case), clasifica tipos (internal para TRIBE/NERF), y carga todo en SQLite dentro de una transacción

El seed limpia la DB antes de importar (idempotente).
