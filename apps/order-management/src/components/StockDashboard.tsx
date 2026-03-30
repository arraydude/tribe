import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useStockItems } from '@/hooks/useOrders'
import type { StockItem } from '@/lib/api'
import { StockForm } from './StockForm'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

function createStockColumns(onEdit: (item: StockItem) => void): ColumnDef<StockItem>[] {
  return [
    {
      accessorKey: 'marca',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.marca}</span>,
    },
    {
      accessorKey: 'item',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => <span className="text-sm">{row.original.item}</span>,
    },
    {
      accessorKey: 'variante',
      header: 'Variante',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.variante ?? '—'}</span>,
    },
    {
      accessorKey: 'cantidad_invertida',
      header: 'Invertido',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{row.original.cantidad_invertida}</span>,
    },
    {
      accessorKey: 'cantidad_disponible',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disponible" />,
      cell: ({ row }) => (
        <Badge variant={row.original.cantidad_disponible > 0 ? 'default' : 'outline'}>
          {row.original.cantidad_disponible}
        </Badge>
      ),
    },
    {
      accessorKey: 'costo_por_unidad',
      header: 'Costo/U',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.costo_por_unidad)}</span>,
    },
    {
      accessorKey: 'precio_lista',
      header: 'P. Lista',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.precio_lista)}</span>,
    },
    {
      accessorKey: 'precio_taller',
      header: 'P. Taller',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.precio_taller)}</span>,
    },
    {
      accessorKey: 'precio_emi',
      header: 'P. EMI',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.precio_emi)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="xs" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
    },
  ]
}

export function StockDashboard() {
  const { data: items, isLoading } = useStockItems()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)

  const columns = useMemo(() => createStockColumns((item) => {
    setEditingItem(item)
    setFormOpen(true)
  }), [])

  const kpis = useMemo(() => {
    if (!items) return { inStock: 0, unitsAvailable: 0, invested: 0, stockValue: 0 }
    return {
      inStock: items.filter((i) => i.cantidad_disponible > 0).length,
      unitsAvailable: items.reduce((sum, i) => sum + i.cantidad_disponible, 0),
      invested: items.reduce((sum, i) => sum + i.cantidad_invertida * i.costo_por_unidad, 0),
      stockValue: items.reduce((sum, i) => sum + i.cantidad_disponible * i.costo_por_unidad, 0),
    }
  }, [items])

  if (isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-20">Cargando stock...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-wider text-foreground">
          Inventario de Stock
        </h2>
        <Button size="sm" onClick={() => { setEditingItem(null); setFormOpen(true) }}>
          + Inversión
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Items en Stock</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.inStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Unidades Disponibles</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.unitsAvailable}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Valor Invertido</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.invested)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Valor en Stock</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.stockValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={items ?? []}
        searchKey="marca"
        searchPlaceholder="Buscar por marca..."
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setEditingItem(null); setFormOpen(false) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item de Stock' : 'Nueva Inversión'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modificar los datos del item de stock.' : 'Registrar una nueva inversión de stock.'}
            </DialogDescription>
          </DialogHeader>
          <StockForm
            item={editingItem}
            onDone={() => { setEditingItem(null); setFormOpen(false) }}
            onCancel={() => { setEditingItem(null); setFormOpen(false) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
