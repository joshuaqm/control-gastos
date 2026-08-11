import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import AddTransactionModal from '@/components/transactions/AddTransactionModal'
import { fetchTransactions, deleteTransaction, type ApiTransaction } from '@/api/transactions'
import { fetchAccounts, type ApiAccount } from '@/api/accounts'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

type TxFilter = 'all' | 'income' | 'expense' | 'transfer'

const filterLabels: Record<TxFilter, string> = {
  all: 'Todos',
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
}

const PAGE_SIZE = 10

const BUDGET_META: Record<string, { label: string; color: string }> = {
  need: { label: 'Necesidad', color: '#3B82F6' },
  want: { label: 'Deseo', color: '#F59E0B' },
  save: { label: 'Ahorro', color: '#06D6A0' },
}

const fmtDate = (d: string) => {
  const dt = new Date(`${d.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const todayStamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function BudgetChip({ budgetType }: { budgetType: string | null }) {
  if (!budgetType) return null
  const meta = BUDGET_META[budgetType]
  if (!meta) return null
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

export default function TransactionsScreen({ showToast }: { showToast: ShowToast }) {
  const [txs, setTxs] = useState<ApiTransaction[]>([])
  const [accs, setAccs] = useState<ApiAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<TxFilter>('all')
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiTransaction | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([fetchTransactions(), fetchAccounts()])
      setTxs(t)
      setAccs(a)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar transacciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => {
    const set = new Set<string>()
    txs.forEach(t => { if (t.category) set.add(t.category) })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [txs])

  const filtered = useMemo(() => {
    let list = txs
    if (filter !== 'all') list = list.filter(t => t.type === filter)
    if (catFilter) list = list.filter(t => t.category === catFilter)
    if (fromDate) list = list.filter(t => (t.date ?? '') >= fromDate)
    if (toDate) list = list.filter(t => (t.date ?? '') <= toDate)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(t => (t.description ?? '').toLowerCase().includes(q))
    return [...list].sort(
      (a, b) =>
        (b.date || '').localeCompare(a.date || '') || (b.id ?? 0) - (a.id ?? 0),
    )
  }, [txs, filter, catFilter, search, fromDate, toDate])

  useEffect(() => { setPage(1) }, [filter, catFilter, search, fromDate, toDate])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pages)
  const pageTxs = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const accountName = (id: number | null) =>
    id == null ? '' : (accs.find(a => a.id === id)?.name ?? '')

  const openEdit = (t: ApiTransaction) => {
    setEditing(t)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (t: ApiTransaction) => {
    if (!window.confirm(`¿Eliminar el movimiento "${t.description}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteTransaction(t.id)
      showToast('Movimiento eliminado', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  const exportCSV = () => {
    if (!filtered.length) {
      showToast('No hay movimientos para exportar', 'info')
      return
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Clasificación 50/30/20', 'Cuenta', 'Monto']
    const rows = filtered.map(t => [
      t.date,
      t.type,
      t.description,
      t.category ?? '',
      BUDGET_META[t.budget_type ?? '']?.label ?? '',
      t.type === 'transfer'
        ? `${accountName(t.account_id) || '?'} → ${accountName(t.destination_account_id) || '?'}`
        : accountName(t.account_id),
      t.type === 'income' ? Number(t.amount) : t.type === 'transfer' ? Number(t.amount) : -Number(t.amount),
    ])
    const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacciones_${todayStamp()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const transfer = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + Number(t.amount), 0)
    return { income, expense, transfer }
  }, [filtered])

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transacciones</h2>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
        >
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={filter === f ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#A0A0B8' }}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <span className="text-xs" style={{ color: '#6B6B85' }}>Del</span>
          <input
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            type="date"
            className="bg-transparent text-xs outline-none"
            style={{ color: '#fff' }}
          />
          <span className="text-xs" style={{ color: '#6B6B85' }}>al</span>
          <input
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            type="date"
            className="bg-transparent text-xs outline-none"
            style={{ color: '#fff' }}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[160px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <Search size={14} style={{ color: '#6B6B85' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por descripción…"
            className="bg-transparent w-full text-xs outline-none"
            style={{ color: '#fff' }}
          />
        </div>
        {(filter !== 'all' || catFilter || fromDate || toDate || search) && (
          <button
            onClick={() => { setFilter('all'); setCatFilter(''); setFromDate(''); setToDate(''); setSearch('') }}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex gap-4 text-xs">
        <span style={{ color: '#06D6A0' }}>Ingresos: <span className="font-mono font-semibold">{fmt(totals.income)}</span></span>
        <span style={{ color: '#EF4444' }}>Gastos: <span className="font-mono font-semibold">{fmt(totals.expense)}</span></span>
        <span style={{ color: '#60A5FA' }}>Transferencias: <span className="font-mono font-semibold">{fmt(totals.transfer)}</span></span>
      </div>

      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="hidden sm:grid grid-cols-6 px-5 py-3 text-xs font-medium" style={{ color: '#6B6B85', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span>Fecha</span><span>Descripción</span><span>Categoría</span><span>Cuenta</span><span className="text-right">Monto</span><span />
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
          </div>
        ) : pageTxs.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#6B6B85' }}>
            {txs.length === 0 ? 'No hay movimientos registrados todavía.' : 'Ningún movimiento coincide con los filtros.'}
          </div>
        ) : (
          pageTxs.map(t => {
            const isIncome = t.type === 'income'
            const isTransfer = t.type === 'transfer'
            const amountColor = isIncome ? '#06D6A0' : isTransfer ? '#60A5FA' : '#EF4444'
            const sign = isIncome ? '+' : isTransfer ? '' : '−'
            const accountCell = isTransfer
              ? `${accountName(t.account_id) || '?'} → ${accountName(t.destination_account_id) || '?'}`
              : accountName(t.account_id) || '—'
            return (
              <div
                key={t.id}
                className="flex sm:grid sm:grid-cols-6 sm:items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="hidden sm:block text-xs" style={{ color: '#6B6B85' }}>{fmtDate(t.date)}</span>
                <div className="flex-1 min-w-0 sm:flex-none">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs sm:hidden" style={{ color: '#6B6B85' }}>{fmtDate(t.date)}</span>
                    <span className="text-xs sm:hidden" style={{ color: '#6B6B85' }}>{t.category ?? 'Sin categoría'}</span>
                    <BudgetChip budgetType={t.budget_type} />
                  </div>
                </div>
                <span className="hidden sm:block text-xs" style={{ color: '#A0A0B8' }}>{t.category ?? '—'}</span>
                <span className="hidden sm:block text-xs" style={{ color: '#A0A0B8' }}>{accountCell}</span>
                <span className="text-sm font-mono font-semibold flex-shrink-0 sm:text-right" style={{ color: amountColor }}>
                  {sign}{fmt(t.amount)}
                </span>
                <div className="flex gap-1.5 flex-shrink-0 justify-end">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                    title="Editar"
                    style={{ color: '#A0A0B8' }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                    title="Eliminar"
                    style={{ color: '#F87171' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#6B6B85' }}>
            {filtered.length > PAGE_SIZE
              ? `${(curPage - 1) * PAGE_SIZE + 1}–${Math.min(curPage * PAGE_SIZE, filtered.length)} de ${filtered.length}`
              : `${filtered.length} movimientos`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={curPage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
            >
              ← Anterior
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                style={n === curPage ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={curPage >= pages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => { setEditing(null); setModalOpen(true) }}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow"
      >
        <Plus size={24} color="white" />
      </button>

      <AddTransactionModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        transaction={editing}
        onClose={closeModal}
        onAdd={() => {
          showToast(editing ? 'Movimiento actualizado' : 'Movimiento registrado', 'success')
          load()
        }}
      />
    </div>
  )
}