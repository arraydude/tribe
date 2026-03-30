import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useStockItems, useStockBalance } from '@/hooks/useOrders'
import type { StockItem, StockBalance } from '@/lib/api'
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

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'DISPONIBLE': return 'default'
    case 'EN TRANSITO': return 'secondary'
    case 'RECIBIDO': return 'outline'
    default: return 'outline'
  }
}

function createStockColumns(onEdit: (id: number) => void): ColumnDef<StockBalance>[] {
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
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
      accessorKey: 'total_invertido',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invertido" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.total_invertido)}</span>,
    },
    {
      accessorKey: 'total_recuperado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Recuperado" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{usd(row.original.total_recuperado)}</span>,
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const val = row.original.balance
        return (
          <span className={`font-mono tabular-nums font-semibold text-sm ${val < 0 ? 'text-destructive' : 'text-foreground'}`}>
            {usd(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'ventas_count',
      header: 'Ventas',
      cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{row.original.ventas_count}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="xs" onClick={() => onEdit(row.original.id)}>
          Editar
        </Button>
      ),
    },
  ]
}

export function StockDashboard() {
  const { data: items, isLoading: itemsLoading } = useStockItems()
  const { data: balanceData, isLoading: balanceLoading } = useStockBalance()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)

  const columns = useMemo(() => createStockColumns((id) => {
    const fullItem = items?.find((i) => i.id === id) ?? null
    setEditingItem(fullItem)
    setFormOpen(true)
  }), [items])

  const kpis = useMemo(() => {
    if (!balanceData) return { inStock: 0, unitsAvailable: 0, invested: 0, stockValue: 0, balanceTotal: 0 }
    return {
      inStock: balanceData.filter((i) => i.cantidad_disponible > 0).length,
      unitsAvailable: balanceData.reduce((sum, i) => sum + i.cantidad_disponible, 0),
      invested: balanceData.reduce((sum, i) => sum + i.total_invertido, 0),
      stockValue: balanceData.reduce((sum, i) => sum + i.cantidad_disponible * i.costo_por_unidad, 0),
      balanceTotal: balanceData.reduce((sum, i) => sum + i.balance, 0),
    }
  }, [balanceData])

  const isLoading = itemsLoading || balanceLoading

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
          + Inversion
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
        <Card size="sm">
          <CardHeader>
            <CardDescription>Balance Total</CardDescription>
            <CardTitle className={`font-mono tabular-nums text-xl ${kpis.balanceTotal < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {usd(kpis.balanceTotal)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={balanceData ?? []}
        searchKey="marca"
        searchPlaceholder="Buscar por marca..."
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setEditingItem(null); setFormOpen(false) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item de Stock' : 'Nueva Inversion'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modificar los datos del item de stock.' : 'Registrar una nueva inversion de stock.'}
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
