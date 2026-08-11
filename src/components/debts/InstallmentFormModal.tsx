import { useState } from "react"
import { X } from "lucide-react"
import type { ApiInstallment } from "@/api/installments"

export interface InstallmentFormData {
  description: string
  monthly_amount: number
  months_total: number
  months_paid: number
  start_date?: string | null
  notes?: string | null
}

const today = () => new Date().toLocaleDateString("en-CA")

export default function InstallmentFormModal({
  open,
  installment,
  onClose,
  onSave,
}: {
  open: boolean
  installment: ApiInstallment | null
  onClose: () => void
  onSave: (data: InstallmentFormData) => Promise<void>
}) {
  const [description, setDescription] = useState(installment?.description ?? "")
  const [monthlyAmount, setMonthlyAmount] = useState(
    installment ? installment.monthly_amount.toString() : "",
  )
  const [monthsTotal, setMonthsTotal] = useState(
    installment ? installment.months_total.toString() : "",
  )
  const [monthsPaid, setMonthsPaid] = useState(
    installment ? installment.months_paid.toString() : "0",
  )
  const [startDate, setStartDate] = useState(
    installment?.start_date?.slice(0, 10) ?? today(),
  )
  const [notes, setNotes] = useState(installment?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const totalAmount = Number(monthlyAmount) * Number(monthsTotal)

  const handleSave = async () => {
    if (!description.trim()) {
      setError("La descripción es obligatoria")
      return
    }
    if (!Number.isFinite(Number(monthlyAmount)) || Number(monthlyAmount) <= 0) {
      setError("Ingresa un monto mensual válido")
      return
    }
    if (!Number.isInteger(Number(monthsTotal)) || Number(monthsTotal) <= 0) {
      setError("Ingresa un número de meses válido")
      return
    }

    setSaving(true)
    setError("")
    try {
      await onSave({
        description: description.trim(),
        monthly_amount: Number(monthlyAmount),
        months_total: Number(monthsTotal),
        months_paid: Number(monthsPaid) || 0,
        start_date: startDate || null,
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
            {installment ? "Editar crédito a meses" : "Nuevo crédito a meses"}
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
              Descripción
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Laptop 12 MSI"
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
                Mensualidad
              </label>
              <input
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
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
                Meses totales
              </label>
              <input
                value={monthsTotal}
                onChange={(e) => setMonthsTotal(e.target.value)}
                type="number"
                min="1"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
            </div>
          </div>

          {installment && (
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "#A0A0B8" }}
              >
                Meses pagados
              </label>
              <input
                value={monthsPaid}
                onChange={(e) => setMonthsPaid(e.target.value)}
                type="number"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
            </div>
          )}

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#A0A0B8" }}
            >
              Fecha de compra
            </label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
          </div>

          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "#C4B5FD",
            }}
          >
            Total:{" "}
            {totalAmount.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}{" "}
            · Saldo ocupado:{" "}
            {monthlyAmount && monthsTotal
              ? (
                  Number(monthlyAmount) *
                  (Number(monthsTotal) - Number(monthsPaid))
                ).toLocaleString("es-MX", {
                  style: "currency",
                  currency: "MXN",
                })
              : "—"}
          </p>

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
