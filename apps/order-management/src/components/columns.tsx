import type { ColumnDef } from '@tanstack/react-table'
import type { OrderRow } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'DONE': { variant: 'default' },
  'IN PROGRESS': { variant: 'secondary' },
  'TO DO': { variant: 'outline' },
  'RECEIVED MIAMI': { variant: 'secondary' },
  'RECEIVED BAIRES': { variant: 'secondary' },
  'READY TO DELIVER': { variant: 'default' },
}

const orderTypeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  importacion: { label: 'IMPORT', variant: 'outline' },
  inversion: { label: 'INVERSION', variant: 'secondary' },
  venta_stock: { label: 'VENTA STOCK', variant: 'default' },
  repro: { label: 'REPRO', variant: 'destructive' },
}

function canConvertToStock(order: OrderRow): boolean {
  return (
    order.order_type === 'importacion' &&
    !order.stock_id &&
    (order.status_name === 'RECEIVED BAIRES' || order.status_name === 'DONE')
  )
}

export function createColumns(onEdit: (order: OrderRow) => void, onDelete: (order: OrderRow) => void, onConvertToStock?: (order: OrderRow) => void): ColumnDef<OrderRow>[] {
  return [
    {
      accessorKey: 'client_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.client_name ?? '—'}</span>,
    },
    {
      accessorKey: 'item',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 max-w-[220px]">
          <span className="truncate text-muted-foreground text-sm">{row.original.item ?? '—'}</span>
          {(row.original.order_type === 'venta_stock' || row.original.order_type === 'inversion') && (
            <Badge variant="outline">STOCK</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'order_type',
      header: 'Tipo',
      cell: ({ row }) => {
        const cfg = orderTypeConfig[row.original.order_type]
        if (!cfg) return <span className="text-muted-foreground/40 text-xs">{row.original.order_type}</span>
        return <Badge variant={cfg.variant} className="text-[10px] px-1.5">{cfg.label}</Badge>
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'quantity',
      header: 'Cant.',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{row.original.quantity ?? '—'}</span>,
    },
    {
      accessorKey: 'quoted_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Presupuesto" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.quoted_price)}</span>,
      filterFn: (row, _, value) => {
        if (value === 'inversion') return !row.original.quoted_price || row.original.quoted_price === 0
        return true
      },
    },
    {
      accessorKey: 'cost',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Compra" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-sm">{usd(row.original.cost)}</span>,
    },
    {
      accessorKey: 'import_cost',
      header: 'Envio',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground/50 text-sm">{usd(row.original.import_cost)}</span>,
    },
    {
      accessorKey: 'profit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ganancia" />,
      cell: ({ row }) => {
        const val = row.original.profit
        if (val == null) return <span className="text-muted-foreground/30">—</span>
        return (
          <span className={`font-mono tabular-nums text-sm font-semibold ${val >= 0 ? 'text-foreground' : 'text-destructive'}`}>
            {usd(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status_name',
      header: 'Estado',
      cell: ({ row }) => {
        const val = row.original.status_name
        if (!val) return '—'
        const cfg = statusConfig[val] ?? { variant: 'outline' as const }
        return <Badge variant={cfg.variant}>{val}</Badge>
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'is_paid',
      header: 'Saldado',
      cell: ({ row }) => {
        return row.original.is_paid
          ? <Badge variant="default">SI</Badge>
          : <span className="text-muted-foreground/40 text-xs">NO</span>
      },
      filterFn: (row, _, value) => {
        if (value === 'SI') return row.original.is_paid === 1
        if (value === 'NO') return row.original.is_paid === 0
        return true
      },
    },
    {
      accessorKey: 'is_settled',
      header: 'Liquidado',
      cell: ({ row }) => {
        return row.original.is_settled
          ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Liquidado" />
          : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/20" title="Pendiente" />
      },
      filterFn: (row, _, value) => {
        if (value === 'SI') return row.original.is_settled === 1
        if (value === 'NO') return row.original.is_settled === 0
        return true
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground text-xs">{row.original.created_at ?? '—'}</span>,
    },
    {
      accessorKey: 'assigned_to_name',
      header: 'Asignado',
      cell: ({ row }) => {
        const val = row.original.assigned_to_name
        return val
          ? <span className="text-primary/60 text-xs uppercase">{val}</span>
          : <span className="text-muted-foreground/20">—</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onConvertToStock && canConvertToStock(row.original) && (
            <Button variant="ghost" size="xs" onClick={() => onConvertToStock(row.original)}>
              → Stock
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
          <Button variant="ghost" size="xs" className="text-destructive" onClick={() => onDelete(row.original)}>
            Borrar
          </Button>
        </div>
      ),
    },
  ]
}
