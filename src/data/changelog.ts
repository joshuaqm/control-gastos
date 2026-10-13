export type ChangeKind = 'fix' | 'feature'

export interface ChangeItem {
  id: string
  kind: ChangeKind
  title: string
  description: string
}

export interface Release {
  version: string
  date: string
  title: string
  summary: string
  items: ChangeItem[]
}

/** Versión actual de las notas. Al cambiarla, la modal de novedades vuelve a mostrarse. */
export const CHANGELOG_VERSION = '1.2'

export const CHANGELOG: Release[] = [
  {
    version: '1.2',
    date: '2026-10-12',
    title: 'Integridad financiera y finanzas compartidas',
    summary:
      'Correcciones de exactitud en saldos, presupuestos y tarjetas, además del nuevo módulo de finanzas compartidas.',
    items: [
      {
        id: 'FEAT-02',
        kind: 'feature',
        title: 'Finanzas compartidas',
        description:
          'Nuevo módulo "Compartido": agrega amigos, crea cuentas en común (pozo), registra préstamos entre amigos y metas compartidas.',
      },
      {
        id: 'FEAT-01',
        kind: 'feature',
        title: 'Modo oculto de importes',
        description:
          'Oculta todos los montos con un toque desde el ícono del ojo en la barra superior. No altera tus datos.',
      },
      {
        id: 'BUG-01',
        kind: 'fix',
        title: 'Registro de recurrentes descuenta del saldo',
        description:
          'Al registrar un pago recurrente ahora sí se descuenta de la cuenta, usa la fecha efectiva y evita registros duplicados del mismo día.',
      },
      {
        id: 'BUG-02',
        kind: 'fix',
        title: 'Rendimiento real de intereses',
        description:
          'El ajuste de rendimiento usa un cálculo incremental que respeta tus ajustes manuales y ahora permite rendimientos negativos (pérdidas).',
      },
      {
        id: 'BUG-03',
        kind: 'fix',
        title: 'Saldo de tarjetas de crédito estable',
        description:
          'Los ajustes de interés ya no modifican el saldo de las tarjetas de crédito; su deuda sigue derivándose de las transacciones y MSI.',
      },
      {
        id: 'BUG-04',
        kind: 'fix',
        title: 'Cálculo de intereses en tarjetas',
        description:
          'Se evita que las tarjetas de crédito reciban ajustes de rendimiento que descuadraban su deuda pendiente.',
      },
      {
        id: 'BUG-05',
        kind: 'fix',
        title: 'Recordatorios de tarjetas precisos',
        description:
          'El recordatorio de pago usa la deuda real pendiente (incluyendo compras a meses) en lugar de un estimado.',
      },
      {
        id: 'BUG-06',
        kind: 'fix',
        title: 'Paginación en móvil',
        description:
          'La paginación de transacciones se adapta a pantallas pequeñas con elipsis, sin encimarse y conservando la navegación.',
      },
      {
        id: 'BUG-07',
        kind: 'fix',
        title: 'Gráfica de interés teórico por cuenta',
        description:
          'La gráfica de rendimiento teórico ahora muestra barras apiladas por cuenta, con leyenda y total.',
      },
      {
        id: 'BUG-08',
        kind: 'fix',
        title: 'Gastos sin categoría en presupuestos',
        description:
          'El desglose de presupuesto incluye una fila "Sin categoría" con el gasto del periodo que no tiene categoría asignada.',
      },
    ],
  },
]
