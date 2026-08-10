import { useState } from "react"
import { X } from "lucide-react"
import type { ApiReceivable } from "@/api/receivables"
import type { ApiAccount } from "@/api/accounts"

export interface ReceivableFormData {
  person: string
  description?: string | null
  original_amount: number
  account_id?: number | null
  due_date?: string | null
  status?: string
  notes?: string | null
}

export default function ReceivableFormModal({
  open,
  receivable,
  accounts,
  onClose,
  onSave,
}: {
  open: boolean
  receivable: ApiReceivable | null
  accounts: ApiAccount[]
  onClose: () => void
  onSave: (data: ReceivableFormData) => Promise<void>
}) {
  const [person, setPerson] = useState(receivable?.person ?? "")
  const [description, setDescription] = useState(receivable?.description ?? "")
  const [originalAmount, setOriginalAmount] = useState(
    receivable ? receivable.original_amount.toString() : "",
  )
  const [accountId, setAccountId] = useState(
    receivable?.account_id?.toString() ?? "",
  )
  const [dueDate, setDueDate] = useState(
    receivable?.due_date?.slice(0, 10) ?? "",
  )
  const [notes, setNotes] = useState(receivable?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSave = async () => {
    if (!person.trim()) {
      setError("El nombre de la persona es obligatorio")
      return
    }
    if (
      !Number.isFinite(Number(originalAmount)) ||
      Number(originalAmount) <= 0
    ) {
      setError("Ingresa un monto válido")
      return
    }
    if (!accountId && !receivable) {
      setError("Selecciona la cuenta de origen")
      return
    }

    setSaving(true)
    setError("")
    try {
      await onSave({
        person: person.trim(),
        description: description.trim() || null,
        original_amount: Number(originalAmount),
        account_id: accountId ? Number(accountId) : null,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al guardar",
      )
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
          <h3 className="text-lg font-semibold">
            {receivable ? "Editar por cobrar" : "Nuevo por cobrar"}
          </h3>
          <button onClick={onClose} style={{ color: "#6B6B85" }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Persona
            </label>
            <input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Ej. Ana Martínez"
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
              Concepto (opcional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Préstamo para curso"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "#A0A0B8" }}
              >
                Monto
              </label>
              <input
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
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
                Fecha de préstamo
              </label>
              <input
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                type="date"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
            </div>
          </div>

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
              <option value="">Selecciona una cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: "#6B6B85" }}>
              Se descuenta del saldo de la cuenta y se registra como gasto.
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Notas (opcional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>
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
              "Guardar"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
