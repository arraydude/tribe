import { useState, useMemo } from 'react'
import type { OrderRow } from '@/lib/api'
import { createColumns } from './columns'
import { ConfirmDialog } from './ConfirmDialog'
import { useDeleteOrder } from '@/hooks/useOrders'
import { DataTable } from '@/components/ui/data-table'

interface OrdersTableProps {
  data: OrderRow[]
  onEdit: (order: OrderRow) => void
}

export function OrdersTable({ data, onEdit }: OrdersTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null)
  const deleteMutation = useDeleteOrder()

  const columns = useMemo(() => createColumns(onEdit, setDeleteTarget), [onEdit])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        searchKey="cliente"
        searchPlaceholder="Buscar cliente..."
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
    </div>
  )
}
