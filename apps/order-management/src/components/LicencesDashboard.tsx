import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useLicences } from '@/hooks/useOrders'
import type { Licence } from '@/lib/api'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

const usd = (val: number | null) =>
  val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const truncateCode = (code: string | null) => {
  if (!code) return '—'
  if (code.length <= 12) return code
  return `${code.slice(0, 8)}...${code.slice(-4)}`
}

const LICENCE_TYPES = ['bootmod3', 'femto', 'xhp'] as const

type StatusFilter = 'all' | 'disponibles' | 'usadas'
type TypeFilter = 'all' | typeof LICENCE_TYPES[number]

const columns: ColumnDef<Licence>[] = [
  {
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.original.type
      const variant = type === 'bootmod3' ? 'default' : type === 'femto' ? 'secondary' : 'outline'
      return <Badge variant={variant}>{type}</Badge>
    },
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground" title={row.original.code ?? undefined}>
        {truncateCode(row.original.code)}
      </span>
    ),
  },
  {
    accessorKey: 'cost',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Costo" />,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">{usd(row.original.cost)}</span>
    ),
  },
  {
    accessorKey: 'is_used',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant={row.original.is_used ? 'outline' : 'default'}>
        {row.original.is_used ? 'Usada' : 'Disponible'}
      </Badge>
    ),
  },
  {
    accessorKey: 'is_settled',
    header: 'Saldado',
    cell: ({ row }) =>
      row.original.is_settled ? (
        <Badge variant="default">SI</Badge>
      ) : (
        <span className="text-muted-foreground/40 text-sm">NO</span>
      ),
  },
  {
    id: 'car',
    header: 'Auto',
    cell: ({ row }) => {
      const { car_brand, car_model } = row.original
      if (!car_brand && !car_model) return <span className="text-muted-foreground/40 text-sm">—</span>
      return <span className="text-sm">{[car_brand, car_model].filter(Boolean).join(' ')}</span>
    },
  },
]

export function LicencesDashboard() {
  const { data: licences, isLoading } = useLicences()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filteredData = useMemo(() => {
    if (!licences) return []
    let result = licences

    if (statusFilter === 'disponibles') {
      result = result.filter((l) => !l.is_used)
    } else if (statusFilter === 'usadas') {
      result = result.filter((l) => l.is_used)
    }

    if (typeFilter !== 'all') {
      result = result.filter((l) => l.type === typeFilter)
    }

    return result
  }, [licences, statusFilter, typeFilter])

  const kpis = useMemo(() => {
    if (!licences) return { total: 0, disponibles: 0, usadas: 0, valorTotal: 0 }
    return {
      total: licences.length,
      disponibles: licences.filter((l) => !l.is_used).length,
      usadas: licences.filter((l) => l.is_used).length,
      valorTotal: licences.reduce((sum, l) => sum + l.cost, 0),
    }
  }, [licences])

  if (isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-20">Cargando licencias...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold tracking-wider text-foreground">
        Licencias
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total Licencias</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Disponibles</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.disponibles}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Usadas</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{kpis.usadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Valor Total</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(kpis.valorTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(['all', 'disponibles', 'usadas'] as const).map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'Todas' : f === 'disponibles' ? 'Disponibles' : 'Usadas'}
            </Button>
          ))}
        </div>

        <div className="w-px bg-border mx-1" />

        <div className="flex gap-1">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            Todos
          </Button>
          {LICENCE_TYPES.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="code"
        searchPlaceholder="Buscar por code..."
      />
    </div>
  )
}
