import { useState, useMemo } from 'react'
import type { OrderRow } from '@/lib/api'
import { createColumns } from './columns'
import { ConfirmDialog } from './ConfirmDialog'
import { ConvertToStockDialog } from './ConvertToStockDialog'
import { useDeleteOrder } from '@/hooks/useOrders'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OrdersTableProps {
  data: OrderRow[]
  onEdit: (order: OrderRow) => void
}

const STATUS_FILTERS = ['TO DO', 'IN PROGRESS', 'RECEIVED BAIRES', 'DONE'] as const

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
        toolbar={(table) => (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar cliente..."
              value={(table.getColumn('cliente')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('cliente')?.setFilterValue(e.target.value)}
              className="max-w-[200px]"
            />
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((s) => {
                const isActive = table.getColumn('status')?.getFilterValue() === s
                return (
                  <Button
                    key={s}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => table.getColumn('status')?.setFilterValue(isActive ? undefined : s)}
                  >
                    {s}
                  </Button>
                )
              })}
            </div>
            <Button
              variant={table.getColumn('is_paid')?.getFilterValue() === 'SI' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => {
                const col = table.getColumn('is_paid')
                col?.setFilterValue(col.getFilterValue() === 'SI' ? undefined : 'SI')
              }}
            >
              Saldado
            </Button>
            <Button
              variant={table.getColumn('valor_presupuestado')?.getFilterValue() === 'inversion' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => {
                const col = table.getColumn('valor_presupuestado')
                col?.setFilterValue(col.getFilterValue() === 'inversion' ? undefined : 'inversion')
              }}
            >
              Inversión
            </Button>
            {(table.getColumn('status')?.getFilterValue() ||
              table.getColumn('is_paid')?.getFilterValue() ||
              table.getColumn('valor_presupuestado')?.getFilterValue() ||
              table.getColumn('cliente')?.getFilterValue()) && (
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
        )}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar pedido"
        description={`Vas a eliminar "${deleteTarget?.item}" de ${deleteTarget?.cliente}. Esta accion es reversible (soft delete).`}
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
