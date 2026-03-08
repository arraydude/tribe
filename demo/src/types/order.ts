export interface Order {
  id: number
  stock: string | null
  cliente: string | null
  item: string | null
  cantidad: number | null
  valorPresupuestado: number | null
  fechaCompra: string | null
  valorCompra: number | null
  valorDebitado: number | null
  tax: number | null
  costoEnvio: number | null
  peso: number | null
  status: string | null
  saldado: string | null
  asignado: string | null
  ganancia: number | null
  saldadoA: string | null
  observaciones: string | null
}
