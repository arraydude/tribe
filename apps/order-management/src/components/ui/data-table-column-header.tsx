import { type Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, CaretUpDown } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3', className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {title}
      {column.getIsSorted() === 'desc' ? (
        <ArrowDown data-icon="inline-end" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUp data-icon="inline-end" />
      ) : (
        <CaretUpDown data-icon="inline-end" />
      )}
    </Button>
  )
}
