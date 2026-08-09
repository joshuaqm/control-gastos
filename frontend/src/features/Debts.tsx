import { debts, receivables } from '@/data/mockData'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

export default function DebtsScreen({ showToast }: { showToast: ShowToast }) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Deudas</h2>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
        <p className="text-sm" style={{ color: '#A0A0B8' }}>Total de deudas pendientes</p>
        <p className="text-4xl font-bold font-mono mt-1" style={{ color: '#EF4444' }}>{fmt(133900)}</p>
        <p className="text-xs mt-2" style={{ color: '#6B6B85' }}>Pagado este mes: {fmt(2400)}</p>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Deudas Activas</h3>
        <div className="flex flex-col gap-3">
          {debts.map(d => {
            const paidPct = Math.round(((d.original - d.pending) / d.original) * 100)
            return (
              <div key={d.id} className="glass card-hover rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold">{d.name}</p>
                    <p className="text-xs" style={{ color: '#6B6B85' }}>{d.creditor} · Vence {d.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono" style={{ color: '#EF4444' }}>{fmt(d.pending)}</p>
                    <p className="text-xs" style={{ color: '#6B6B85' }}>de {fmt(d.original)}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#6B6B85' }}>Progreso de pago</span>
                    <span style={{ color: d.color }}>{paidPct}% pagado</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${paidPct}%`, background: d.color }} />
                  </div>
                </div>
                <button
                  onClick={() => showToast('Pago registrado exitosamente', 'success')}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Registrar Pago
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Cuentas por Cobrar</h3>
        <div className="flex flex-col gap-3">
          {receivables.map(r => (
            <div key={r.id} className="glass rounded-2xl p-4 flex items-center justify-between" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs" style={{ color: '#6B6B85' }}>Vence {r.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full" style={{
                  background: r.status === 'Pendiente' ? 'rgba(245,158,11,0.15)' : 'rgba(6,214,160,0.15)',
                  color: r.status === 'Pendiente' ? '#F59E0B' : '#06D6A0',
                }}>
                  {r.status}
                </span>
                <p className="text-base font-bold font-mono" style={{ color: '#06D6A0' }}>{fmt(r.amount)}</p>
                <button
                  onClick={() => showToast('Cobro registrado', 'success')}
                  className="text-xs px-3 py-1 rounded-lg"
                  style={{ background: 'rgba(6,214,160,0.12)', color: '#06D6A0' }}
                >
                  Cobrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}