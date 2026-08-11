import { useState } from "react"
import { X } from "lucide-react"
import type { ApiAccount } from "@/api/accounts"

export interface PayModalData {
  amount: number
  account_id: number | null
  date: string
  description?: string
  includeMsi?: boolean
}

const today = () => new Date().toLocaleDateString("en-CA")

export default function PayModal({
  open,
  title,
  note,
  accounts,
  defaultAmount,
  requireAccount,
  submitLabel,
  showMsiCheckbox,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  note?: string
  accounts: ApiAccount[]
  defaultAmount?: number
  requireAccount: boolean
  submitLabel: string
  showMsiCheckbox?: boolean
  onClose: () => void
  onSubmit: (data: PayModalData) => Promise<void>
}) {
  const [amount, setAmount] = useState(
    defaultAmount != null && defaultAmount > 0 ? defaultAmount.toString() : "",
  )
  const [accountId, setAccountId] = useState(accounts[0]?.id.toString() ?? "")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [includeMsi, setIncludeMsi] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSave = async () => {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Ingresa un monto válido")
      return
    }
    if (requireAccount && !accountId) {
      setError("Selecciona la cuenta de origen")
      return
    }

    setSaving(true)
    setError("")
    try {
      await onSubmit({
        amount: amt,
        account_id: requireAccount ? Number(accountId) : null,
        date,
        description: description.trim() || undefined,
        includeMsi: showMsiCheckbox ? includeMsi : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md"
        style={{ border: "1px solid rgba(124,58,237,0.2)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} style={{ color: "#6B6B85" }}>
            <X size={20} />
          </button>
        </div>

        {note && (
          <p
            className="text-xs mb-4 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "#C4B5FD",
            }}
          >
            {note}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Monto
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>

          {requireAccount && (
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "#A0A0B8" }}
              >
                Cuenta de origen
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(26,26,46,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Fecha
            </label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Descripción (opcional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Pago mensual"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>

          {showMsiCheckbox && (
            <label
              className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer"
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              <input
                type="checkbox"
                checked={includeMsi}
                onChange={(e) => setIncludeMsi(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-purple-600"
              />
              <span className="text-xs" style={{ color: "#C4B5FD" }}>
                Este monto incluye las mensualidades de las compras a meses
                (MSI)
              </span>
            </label>
          )}
        </div>

        {error && (
          <div
            className="mt-3 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#F87171",
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(255,255,255,0.06)", color: "#A0A0B8" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
