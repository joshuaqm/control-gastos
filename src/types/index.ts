export type MovementType = 'gasto' | 'ingreso' | 'transferencia' | 'prestamo_otorgado' | 'prestamo_recibido' | 'pago_deuda' | 'abono_tarjeta' | 'compra_meses' | 'actualizacion_saldo'

export type Currency = 'MXN' | 'USD' | 'EUR'

export interface Transaction {
  id: string
  fecha: string
  fecha_original: string | null
  monto: number
  moneda: Currency
  tipo: MovementType
  categoria: string
  subcategoria: string | null
  descripcion: string | null
  texto_original: string | null
  comercio: string | null
  ubicacion: string | null
  cuenta: string | null
  metodo_pago: string | null
  proyecto: string | null
  viaje: string | null
  etiquetas: string[]
  persona_relacionada: string | null
  prestamo_relacionado: string | null
  transferencia_relacionada: string | null
  movimiento_recurrente: string | null
  meses_total: number | null
  meses_restantes: number | null
  confianza: number | null
  embedding: number[] | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface TransactionInsert {
  fecha?: string
  fecha_original?: string | null
  monto: number
  moneda?: Currency
  tipo: MovementType
  categoria: string
  subcategoria?: string | null
  descripcion?: string | null
  texto_original?: string | null
  comercio?: string | null
  ubicacion?: string | null
  cuenta?: string | null
  metodo_pago?: string | null
  proyecto?: string | null
  viaje?: string | null
  etiquetas?: string[]
  persona_relacionada?: string | null
  prestamo_relacionado?: string | null
  transferencia_relacionada?: string | null
  movimiento_recurrente?: string | null
  meses_total?: number | null
  meses_restantes?: number | null
  confianza?: number | null
  embedding?: number[] | null
}

export interface Loan {
  id: string
  persona: string
  tipo: 'prestamo_otorgado' | 'prestamo_recibido'
  monto_original: number
  saldo_pendiente: number
  descripcion: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  categoria: string
  monto_limite: number
  monto_gastado: number
  periodo: 'mensual' | 'semanal' | 'anual'
  mes: number
  año: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_limite: string | null
  categoria: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CategorySummary {
  categoria: string
  total: number
  porcentaje: number
  color: string
}

export interface MonthlySummary {
  mes: string
  ingresos: number
  gastos: number
  ahorro: number
}

export interface DashboardSummary {
  ingresos_mes: number
  gastos_mes: number
  ahorro: number
  flujo_efectivo: number
  patrimonio: number
  prestamos_pendientes: number
  gastos_por_categoria: CategorySummary[]
  gastos_por_mes: MonthlySummary[]
  ingresos_vs_gastos: MonthlySummary[]
  tendencia_mensual: MonthlySummary[]
  evolucion_ahorro: MonthlySummary[]
}

export interface Insight {
  tipo: 'alerta' | 'oportunidad' | 'tendencia' | 'recordatorio'
  mensaje: string
  severidad: 'baja' | 'media' | 'alta'
  categoria?: string
  monto?: number
  porcentaje?: number
}

export interface AITransactionParse {
  movimientos: {
    tipo: MovementType
    monto: number
    moneda: Currency
    fecha?: string
    categoria: string
    subcategoria?: string
    descripcion?: string
    comercio?: string
    ubicacion?: string
    cuenta?: string
    metodo_pago?: string
    proyecto?: string
    viaje?: string
    etiquetas?: string[]
    persona_relacionada?: string
    meses_total?: number
    meses_restantes?: number
    confianza?: number
  }[]
}
