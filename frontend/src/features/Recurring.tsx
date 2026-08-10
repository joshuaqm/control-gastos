import { useEffect, useState } from 'react'
import { Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import RecurringFormModal from '@/components/recurring/RecurringFormModal'
import PayModal from '@/components/debts/PayModal'
import { createRecurring, deleteRecurring, fetchRecurring, registerRecurringPayment, updateRecurring, type ApiRecurring } from '@/api/recurring'
import { fetchAccounts, type ApiAccount } from '@/api/accounts'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  yearly: 'Anual',
  interval: 'Cada X días',
}

const freqLabel = (r: Pick<ApiRecurring, 'frequency' | 'interval_days'>) => {
  if (r.frequency === 'interval') {
    return r.interval_days && r.interval_days > 0 ? `Cada ${r.interval_days} días` : 'Cada X días'
  }
  return FREQ_LABELS[r.frequency] ?? r.frequency
}

const fmtDate = (d: string) => {
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const daysUntil = (d: string) => {
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((dt.getTime() - now.getTime()) / 86400000)
}

export default function RecurringScreen({ showToast }: { showToast: ShowToast }) {
  const [recurring, setRecurring] = useState<ApiRecurring[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiRecurring | null>(null)
  const [payTarget, setPayTarget] = useState<ApiRecurring | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [r, a] = await Promise.all([fetchRecurring(), fetchAccounts()])
      setRecurring(r)
      setAccounts(a)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar pagos recurrentes', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const accountName = (id: number | null) =>
    id == null ? '' : (accounts.find(a => a.id === id)?.name ?? '')

  const totalMonthly = recurring
    .filter(r => r.is_active)
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const upcoming = recurring
    .filter(r => r.is_active)
    .map(r => ({ ...r, days: daysUntil(r.next_date) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (r: ApiRecurring) => {
    setEditing(r)
    setModalOpen(true)
  }

  const handleSave = async (data: Parameters<typeof createRecurring>[0]) => {
    try {
      if (editing) {
        await updateRecurring(editing.id, data)
        showToast('Pago recurrente actualizado', 'success')
      } else {
        await createRecurring(data)
        showToast('Pago recurrente registrado', 'success')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    }
  }

  const handleToggle = async (r: ApiRecurring) => {
    try {
      await updateRecurring(r.id, { is_active: !r.is_active })
      showToast(r.is_active ? 'Recurrente pausado' : 'Recurrente activado', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar', 'error')
    }
  }

  const handleDelete = async (r: ApiRecurring) => {
    if (!window.confirm(`¿Eliminar el pago recurrente "${r.name}"?`)) return
    try {
      await deleteRecurring(r.id)
      showToast('Pago recurrente eliminado', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const handleRegister = async (data: { amount: number; account_id: number | null; date: string; description?: string }) => {
    if (!payTarget) return
    try {
      await registerRecurringPayment(payTarget.id, {
        account_id: data.account_id ?? payTarget.account_id,
        date: data.date,
        description: data.description || payTarget.name,
      })
      showToast('Cobro registrado', 'success')
      setPayTarget(null)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar cobro', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pagos Recurrentes</h2>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="text-sm" style={{ color: '#A0A0B8' }}>Total en pagos</p>
          <p className="text-3xl font-bold font-mono mt-1" style={{ color: '#A78BFA' }}>{fmt(totalMonthly)}</p>
          <p className="text-xs mt-2" style={{ color: '#6B6B85' }}>{recurring.filter(r => r.is_active).length} recurrentes activos</p>
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-sm" style={{ color: '#A0A0B8' }}>Próximos cobros</p>
          <div className="flex flex-col gap-1.5 mt-2">
            {upcoming.length === 0 && <p className="text-xs" style={{ color: '#6B6B85' }}>Sin cobros próximos</p>}
            {upcoming.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span style={{ color: '#A0A0B8' }}>{r.name}</span>
                <span className="font-mono" style={{ color: r.days <= 3 ? '#F59E0B' : '#fff' }}>
                  {fmt(r.amount)} · {r.days <= 0 ? 'hoy' : `en ${r.days} d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      ) : recurring.length === 0 ? (
        <div className="py-16 text-center text-sm rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', color: '#6B6B85' }}>
          No hay pagos recurrentes. Agrega suscripciones como Netflix, Spotify o la renta con el botón "Agregar".
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recurring.map(r => {
            return (
              <div key={r.id} className="glass card-hover rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)', opacity: r.is_active ? 1 : 0.55 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <Repeat size={18} style={{ color: '#A78BFA' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs" style={{ color: '#6B6B85' }}>
                        {freqLabel(r)} · {r.category || 'Sin categoría'} · {accountName(r.account_id) || 'Sin cuenta'} · próximo {fmtDate(r.next_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold font-mono" style={{ color: '#EF4444' }}>{fmt(Number(r.amount))}</p>
                      <p className="text-xs" style={{ color: '#6B6B85' }}>{freqLabel(r)?.toLowerCase() ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.is_active && (
                        <button
                          onClick={() => setPayTarget(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
                        >
                          Registrar cobro
                        </button>
                      )}
                      <button onClick={() => handleToggle(r)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: r.is_active ? '#F59E0B' : '#06D6A0' }}>
                        {r.is_active ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#A0A0B8' }}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RecurringFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        recurring={editing}
        accounts={accounts}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <PayModal
        key={`pay-${payTarget?.id ?? 'none'}`}
        open={payTarget !== null}
        title={`Registrar cobro`}
        note={`Genera la transacción por "${payTarget?.name ?? ''}" y avanza la fecha del próximo cobro.`}
        accounts={accounts}
        defaultAmount={payTarget ? Number(payTarget.amount) : undefined}
        requireAccount
        submitLabel="Registrar Cobro"
        onClose={() => setPayTarget(null)}
        onSubmit={handleRegister}
      />

      <button
        onClick={openCreate}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow sm:hidden"
      >
        <Plus size={24} color="white" />
      </button>
    </div>
  )
}