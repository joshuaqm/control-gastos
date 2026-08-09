import type { Transaction } from '@/types'
import { fmt } from '@/utils/format'

export default function TransactionRow({ transaction, table = false }: {
  transaction: Transaction
  table?: boolean
}) {
  const t = transaction
  const Icon = t.icon
  const isIncome = t.type === 'income'
  const iconBg = isIncome ? 'rgba(6,214,160,0.15)' : 'rgba(124,58,237,0.12)'
  const iconColor = isIncome ? '#06D6A0' : '#A78BFA'
  const amountColor = isIncome ? '#06D6A0' : '#EF4444'
  const sign = isIncome ? '+' : '-'

  const iconBox = (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${table ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-xl'}`}
      style={{ background: iconBg }}
    >
      <Icon size={table ? 14 : 16} style={{ color: iconColor }} />
    </div>
  )

  if (table) {
    return (
      <div
        className="flex sm:grid sm:grid-cols-5 items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="hidden sm:block text-xs" style={{ color: '#6B6B85' }}>{t.date}</span>
        <div className="flex items-center gap-3">
          {iconBox}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{t.desc}</p>
            <p className="text-xs sm:hidden" style={{ color: '#6B6B85' }}>{t.date}</p>
          </div>
        </div>
        <span className="hidden sm:block text-xs" style={{ color: '#A0A0B8' }}>{t.cat}</span>
        <span className="hidden sm:block text-xs" style={{ color: '#A0A0B8' }}>{t.account}</span>
        <span className="ml-auto text-sm font-mono font-semibold" style={{ color: amountColor }}>
          {sign}{fmt(t.amount)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5 cursor-pointer">
      {iconBox}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.desc}</p>
        <p className="text-xs" style={{ color: '#6B6B85' }}>{t.cat} · {t.account}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono font-semibold" style={{ color: amountColor }}>{sign}{fmt(t.amount)}</p>
        <p className="text-xs" style={{ color: '#6B6B85' }}>{t.date}</p>
      </div>
    </div>
  )
}