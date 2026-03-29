import {
  Bar, BarChart, XAxis, YAxis,
  Pie, PieChart, Cell, CartesianGrid,
  Area, AreaChart,
} from 'recharts'
import type { DashboardStats } from '@/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

function usd(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function usdCompact(val: number) {
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}k`
  return `$${val.toFixed(0)}`
}

interface DashboardProps {
  data: DashboardStats
}

const monthlyConfig = {
  total: { label: 'Ganancia', color: 'var(--chart-1)' },
} satisfies ChartConfig

const statusConfig = {
  DONE: { label: 'Done', color: 'var(--chart-1)' },
  'IN PROGRESS': { label: 'In Progress', color: 'var(--chart-2)' },
  'TO DO': { label: 'To Do', color: 'var(--chart-3)' },
  'RECEIVED BAIRES': { label: 'Received', color: 'var(--chart-4)' },
} satisfies ChartConfig

const clientConfig = {
  total: { label: 'Ganancia', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function Dashboard({ data }: DashboardProps) {
  const { counts, profit, topClients, monthly, statusDistribution, bestOrder, worstOrder } = data

  const pending = counts.in_progress_count + counts.todo_count + counts.received_count

  const monthlyChart = monthly.map((m) => ({
    month: m.month.slice(2),
    total: Math.round(m.profit * 100) / 100,
  }))

  const clientChart = topClients.map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
    total: Math.round(c.total_profit * 100) / 100,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pedidos Totales</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{counts.total_orders}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Ganancia Total</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(profit.total_profit ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Ganancia Promedio</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl">{usd(profit.avg_profit ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>En Curso</CardDescription>
            <CardTitle className="font-mono tabular-nums text-xl text-primary">{pending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bestOrder && (
          <Card>
            <CardHeader>
              <CardDescription>Mayor Ganancia</CardDescription>
              <CardTitle className="font-mono tabular-nums text-2xl">{usd(bestOrder.ganancia ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{bestOrder.item}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{bestOrder.cliente}</p>
            </CardContent>
          </Card>
        )}
        {worstOrder && (
          <Card>
            <CardHeader>
              <CardDescription>Mayor Perdida</CardDescription>
              <CardTitle className="font-mono tabular-nums text-2xl text-destructive">{usd(worstOrder.ganancia ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{worstOrder.item}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{worstOrder.cliente}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Monthly */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ganancia Mensual</CardTitle>
            <CardDescription>Evolución de ganancia por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyConfig} className="h-[260px] w-full">
              <AreaChart data={monthlyChart} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} interval={2} />
                <YAxis tickFormatter={usdCompact} tickLine={false} axisLine={false} width={50} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area dataKey="total" type="monotone" fill="var(--color-total)" fillOpacity={0.3} stroke="var(--color-total)" strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie data={statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={0} paddingAngle={2}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={`var(--color-${entry.status})`} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top clients */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes por Ganancia</CardTitle>
          <CardDescription>Clientes con mayor ganancia acumulada</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={clientConfig} className="h-[320px] w-full">
            <BarChart data={clientChart} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tickFormatter={usdCompact} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={[0, 3, 3, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
