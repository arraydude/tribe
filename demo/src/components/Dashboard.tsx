import {
  Bar, BarChart, XAxis, YAxis,
  Pie, PieChart, Cell, CartesianGrid,
  ResponsiveContainer, Tooltip, Area, AreaChart,
} from 'recharts'
import type { DashboardStats } from '@/lib/api'

const PIE_COLORS: Record<string, string> = {
  'DONE': '#22c55e',
  'IN PROGRESS': '#f97316',
  'TO DO': '#f59e0b',
  'RECEIVED BAIRES': '#06b6d4',
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 shadow-xl">
      <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p: { value: number; color: string }, i: number) => (
        <p key={i} className="data-value text-sm" style={{ color: p.color }}>
          {usd(p.value)}
        </p>
      ))}
    </div>
  )
}

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
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="PEDIDOS TOTALES" value={counts.total_orders.toString()} delay={0} />
        <KpiCard label="GANANCIA TOTAL" value={usd(profit.total_profit ?? 0)} color="text-tribe-green" delay={1} />
        <KpiCard label="GANANCIA PROMEDIO" value={usd(profit.avg_profit ?? 0)} delay={2} />
        <KpiCard label="EN CURSO" value={pending.toString()} color="text-tribe-orange" delay={3} />
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bestOrder && (
          <div className="relative overflow-hidden rounded-lg border border-tribe-green/20 bg-tribe-green-dim p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-tribe-green via-tribe-green/50 to-transparent" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-tribe-green/70 mb-2">Mayor Ganancia</p>
            <p className="data-value text-2xl font-bold text-tribe-green">{usd(bestOrder.ganancia ?? 0)}</p>
            <p className="text-sm text-white/50 mt-1">{bestOrder.item}</p>
            <p className="text-xs text-white/30 mt-0.5">{bestOrder.cliente}</p>
          </div>
        )}
        {worstOrder && (
          <div className="relative overflow-hidden rounded-lg border border-tribe-red/20 bg-tribe-red-dim p-5 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-tribe-red via-tribe-red/50 to-transparent" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-tribe-red/70 mb-2">Mayor Perdida</p>
            <p className="data-value text-2xl font-bold text-tribe-red">{usd(worstOrder.ganancia ?? 0)}</p>
            <p className="text-sm text-white/50 mt-1">{worstOrder.item}</p>
            <p className="text-xs text-white/30 mt-0.5">{worstOrder.cliente}</p>
          </div>
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Monthly */}
        <div className="lg:col-span-2 rounded-lg border border-white/5 bg-tribe-surface carbon-bg p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-tribe-cyan rounded-full" />
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Ganancia Mensual</h3>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff06" strokeDasharray="none" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#525252', fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#ffffff08' }} tickLine={false} interval={2} />
                <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 9, fill: '#525252', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={1.5} fill="url(#gradArea)" dot={false} activeDot={{ r: 3, fill: '#06b6d4', stroke: '#0a0a0a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-white/5 bg-tribe-surface carbon-bg p-5 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-tribe-amber rounded-full" />
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Estado</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={0} paddingAngle={2}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[entry.status] ?? '#525252'} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]
                  return (
                    <div className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 shadow-xl">
                      <p className="text-xs text-white/70">{d.name}</p>
                      <p className="data-value text-sm text-white font-semibold">{d.value}</p>
                    </div>
                  )
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {statusDistribution.map((s) => (
              <div key={s.status} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[s.status] ?? '#525252' }} />
                <span className="text-[10px] text-white/40">{s.status}</span>
                <span className="data-value text-[10px] text-white/60">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top clients */}
      <div className="rounded-lg border border-white/5 bg-tribe-surface carbon-bg p-5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-tribe-orange rounded-full" />
          <h3 className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Top 10 Clientes por Ganancia</h3>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clientChart} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 9, fill: '#525252', fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#ffffff08' }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#737373', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[0, 3, 3, 0]} barSize={18}>
                {clientChart.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#f97316' : i < 3 ? '#f9731680' : '#f9731640'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, delay }: {
  label: string; value: string; color?: string; delay: number
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/5 bg-tribe-surface carbon-bg p-4 animate-slide-up" style={{ animationDelay: `${delay * 0.06}s` }}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 font-medium">{label}</p>
      <p className={`data-value text-xl font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  )
}
