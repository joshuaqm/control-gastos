import { useEffect, useMemo } from "react"
import { BellOff, CalendarClock, CheckCheck, CreditCard, TrendingUp } from "lucide-react"
import { type ScreenId } from "@/config/navigation"
import { fmt } from "@/utils/format"
import type { Reminder } from "@/utils/dashboardCalc"

const daysLabel = (days: number) =>
  days <= 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`

export default function NotificationsPanel({
  open,
  reminders,
  enabled,
  loading,
  onClose,
  onNavigate,
  onMarkAllRead,
}: {
  open: boolean
  reminders: Reminder[]
  enabled: boolean
  loading: boolean
  onClose: () => void
  onNavigate: (screen: ScreenId) => void
  onMarkAllRead: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const sorted = useMemo(() => [...reminders].sort((a, b) => a.days - b.days), [reminders])

  if (!open) return null

  return (
    <div
      className="absolute right-0 top-12 w-[min(92vw,380px)] glass rounded-2xl shadow-2xl z-50 flex flex-col"
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(18,18,28,0.97)",
        backdropFilter: "blur(20px)",
        maxHeight: "min(480px, 80vh)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          {reminders.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#7C3AED", color: "#fff" }}>
              {reminders.length}
            </span>
          )}
        </div>
        <button
          onClick={onMarkAllRead}
          disabled={reminders.length === 0}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "#A0A0B8" }}
        >
          <CheckCheck size={14} />
          Marcar leídas
        </button>
      </div>

      {!enabled ? (
        <div className="p-6 flex flex-col items-center gap-2 text-center">
          <BellOff size={20} style={{ color: "#6B6B85" }} />
          <p className="text-sm" style={{ color: "#6B6B85" }}>
            Las notificaciones están desactivadas.
          </p>
          <button
            onClick={() => onNavigate("settings")}
            className="text-xs font-medium mt-1"
            style={{ color: "#7C3AED" }}
          >
            Activar en configuración
          </button>
        </div>
      ) : loading && reminders.length === 0 ? (
        <div className="p-6 flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="p-6 flex flex-col items-center gap-2 text-center">
          <p className="text-sm" style={{ color: "#6B6B85" }}>
            No hay notificaciones pendientes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 p-2 overflow-y-auto">
          {sorted.map((r) => {
            const isCredit = r.kind === "credit"
            const isInterest = r.kind === "interest"
            const Icon = isCredit ? CreditCard : isInterest ? TrendingUp : CalendarClock
            const color = isCredit ? "#EF4444" : isInterest ? "#06D6A0" : "#F59E0B"
            return (
              <button
                key={r.id}
                onClick={() => {
                  onMarkAllRead()
                  onNavigate(
                    isCredit ? "debts" : isInterest ? "accounts" : "recurring",
                  )
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-white/5"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs truncate" style={{ color: "#6B6B85" }}>
                    {r.subtitle}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-semibold">{fmt(r.amount)}</p>
                  <p className="text-xs" style={{ color: r.days <= 1 ? "#F87171" : "#FBBF24" }}>
                    {daysLabel(r.days)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}