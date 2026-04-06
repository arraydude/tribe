import { useState, useMemo } from 'react'
import type { OrderRow } from '@/lib/api'
import { createColumns } from './columns'
import { ConfirmDialog } from './ConfirmDialog'
import { ConvertToStockDialog } from './ConvertToStockDialog'
import { useDeleteOrder } from '@/hooks/useOrders'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface OrdersTableProps {
  data: OrderRow[]
  onEdit: (order: OrderRow) => void
}

const STATUS_FILTERS = [
  'TO DO',
  'IN PROGRESS',
  'RECEIVED MIAMI',
  'RECEIVED BAIRES',
  'READY TO DELIVER',
  'DONE',
] as const

const ORDER_TYPE_FILTERS = [
  { value: 'importacion', label: 'Importacion' },
  { value: 'venta_stock', label: 'Venta Stock' },
  { value: 'inversion', label: 'Inversion' },
  { value: 'repro', label: 'Repro' },
] as const

export function OrdersTable({ data, onEdit }: OrdersTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null)
  const [convertTarget, setConvertTarget] = useState<OrderRow | null>(null)
  const deleteMutation = useDeleteOrder()

  const columns = useMemo(
    () => createColumns(onEdit, setDeleteTarget, setConvertTarget),
    [onEdit]
  )

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        toolbar={(table) => {
          const statusFilter = table.getColumn('status_name')?.getFilterValue()
          const isPaidFilter = table.getColumn('is_paid')?.getFilterValue()
          const orderTypeFilter = table.getColumn('order_type')?.getFilterValue()
          const clientFilter = table.getColumn('client_name')?.getFilterValue()

          const hasActiveFilters = statusFilter || isPaidFilter || orderTypeFilter || clientFilter

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Buscar cliente..."
                value={(clientFilter as string) ?? ''}
                onChange={(e) => table.getColumn('client_name')?.setFilterValue(e.target.value)}
                className="max-w-[200px]"
              />

              {/* Status filters */}
              <div className="flex items-center gap-1">
                {STATUS_FILTERS.map((s) => {
                  const isActive = statusFilter === s
                  return (
                    <Button
                      key={s}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        table.getColumn('status_name')?.setFilterValue(isActive ? undefined : s)
                      }
                    >
                      {s}
                    </Button>
                  )
                })}
              </div>

              {/* Order type filters */}
              <div className="flex items-center gap-1">
                {ORDER_TYPE_FILTERS.map(({ value, label }) => {
                  const isActive = orderTypeFilter === value
                  return (
                    <Button
                      key={value}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() =>
                        table.getColumn('order_type')?.setFilterValue(isActive ? undefined : value)
                      }
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>

              {/* Paid filter */}
              <Button
                variant={isPaidFilter === 'SI' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => {
                  const col = table.getColumn('is_paid')
                  col?.setFilterValue(col.getFilterValue() === 'SI' ? undefined : 'SI')
                }}
              >
                Saldado
              </Button>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    table.resetColumnFilters()
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar pedido"
        description={`Vas a eliminar "${deleteTarget?.item}" de ${deleteTarget?.client_name}. Esta accion es reversible (soft delete).`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConvertToStockDialog
        order={convertTarget}
        open={!!convertTarget}
        onClose={() => setConvertTarget(null)}
      />
    </div>
  )
}
