import { useState, useMemo } from 'react'

export function QuotationCalc() {
  const [precioCompra, setPrecioCompra] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [margen, setMargen] = useState('30')

  const result = useMemo(() => {
    const precio = Number(precioCompra)
    const peso = Number(pesoKg)
    const m = Number(margen) / 100

    if (!precio || !peso || isNaN(m)) return null

    const costoBase = precio * 1.04
    const envioArg = 45 * peso
    const costo = costoBase + envioArg
    const precioFinal = costo * (1 + m)
    const ganancia = precioFinal - costo

    return {
      costoBase: Math.round(costoBase * 100) / 100,
      envioArg: Math.round(envioArg * 100) / 100,
      costo: Math.round(costo * 100) / 100,
      precio: Math.round(precioFinal * 100) / 100,
      ganancia: Math.round(ganancia * 100) / 100,
    }
  }, [precioCompra, pesoKg, margen])

  const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-white/40">
        Formula: COSTO = PRECIO_COMPRA * 1.04 + 45 * PESO_KG, PRECIO = COSTO * (1 + MARGEN)
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Precio Compra (USD)</label>
          <input
            type="number"
            step="any"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 rounded-md border border-white/8 bg-tribe-surface-2 px-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-tribe-cyan/40 transition-all data-value"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Peso (kg)</label>
          <input
            type="number"
            step="any"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            placeholder="0.0"
            className="w-full h-10 rounded-md border border-white/8 bg-tribe-surface-2 px-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-tribe-cyan/40 transition-all data-value"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Margen (%)</label>
          <div className="flex gap-1.5">
            {['20', '30'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMargen(m)}
                className={`flex-1 h-10 rounded-md text-sm font-medium transition-all ${
                  margen === m
                    ? 'border border-tribe-cyan/40 bg-tribe-cyan/10 text-tribe-cyan'
                    : 'border border-white/8 bg-tribe-surface-2 text-white/30 hover:text-white/50'
                }`}
              >
                {m}%
              </button>
            ))}
            <input
              type="number"
              value={margen}
              onChange={(e) => setMargen(e.target.value)}
              className="w-16 h-10 rounded-md border border-white/8 bg-tribe-surface-2 px-2 text-sm text-white/70 text-center focus:outline-none focus:border-tribe-cyan/40 transition-all data-value"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-white/5 bg-tribe-surface carbon-bg p-5 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-tribe-cyan rounded-full" />
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Resultado</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ResultRow label="Costo Base (compra * 1.04)" value={usd(result.costoBase)} />
            <ResultRow label="Envio ARG (45 * kg)" value={usd(result.envioArg)} />
          </div>

          <div className="h-px bg-white/5" />

          <ResultRow label="Costo Total" value={usd(result.costo)} large />

          <div className="h-px bg-white/5" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-tribe-green/70 mb-1">Precio al Cliente</p>
              <p className="data-value text-2xl font-bold text-tribe-green">{usd(result.precio)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-tribe-orange/70 mb-1">Ganancia</p>
              <p className="data-value text-2xl font-bold text-tribe-orange">{usd(result.ganancia)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5">{label}</p>
      <p className={`data-value ${large ? 'text-lg' : 'text-sm'} text-white/70`}>{value}</p>
    </div>
  )
}
