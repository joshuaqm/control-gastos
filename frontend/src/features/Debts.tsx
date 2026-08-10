import { useEffect, useState } from "react"
import {
  CalendarDays,
  CreditCard,
  HandCoins,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react"
import { fetchAccounts, type ApiAccount } from "@/api/accounts"
import {
  createTransaction,
  fetchTransactions,
  type ApiTransaction,
} from "@/api/transactions"
import {
  createDebt,
  deleteDebt,
  fetchDebts,
  payDebt,
  updateDebt,
  type ApiDebt,
} from "@/api/debts"
import {
  collectReceivable,
  createReceivable,
  deleteReceivable,
  fetchReceivables,
  updateReceivable,
  type ApiReceivable,
} from "@/api/receivables"
import {
  createInstallment,
  deleteInstallment,
  fetchInstallments,
  markInstallmentMonths,
  payInstallmentMonth,
  updateInstallment,
  type ApiInstallment,
} from "@/api/installments"
import PayModal, { type PayModalData } from "@/components/debts/PayModal"
import InstallmentFormModal from "@/components/debts/InstallmentFormModal"
import DebtFormModal from "@/components/debts/DebtFormModal"
import ReceivableFormModal from "@/components/debts/ReceivableFormModal"
import { fmt } from "@/utils/format"
import { cardUsed as cardUsedWithMsi, msiOutstanding as msiOutstandingFor } from "@/utils/accountBalance"
import type { ShowToast } from "@/types"

function fmtDate(s: string | null): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function DebtsScreen({ showToast }: { showToast: ShowToast }) {
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [txns, setTxns] = useState<ApiTransaction[]>([])
  const [debts, setDebts] = useState<ApiDebt[]>([])
  const [receivables, setReceivables] = useState<ApiReceivable[]>([])
  const [installments, setInstallments] = useState<ApiInstallment[]>([])
  const [loading, setLoading] = useState(true)

  const [payCreditTarget, setPayCreditTarget] = useState<ApiAccount | null>(
    null,
  )
  const [installmentTarget, setInstallmentTarget] = useState<{
    account: ApiAccount
    installment: ApiInstallment | null
  } | null>(null)
  const [debtTarget, setDebtTarget] = useState<ApiDebt | null>(null)
  const [debtFormOpen, setDebtFormOpen] = useState(false)
  const [payDebtTarget, setPayDebtTarget] = useState<ApiDebt | null>(null)
  const [payMsiTarget, setPayMsiTarget] = useState<ApiInstallment | null>(null)
  const [receivableTarget, setReceivableTarget] =
    useState<ApiReceivable | null>(null)
  const [receivableFormOpen, setReceivableFormOpen] = useState(false)
  const [collectTarget, setCollectTarget] = useState<ApiReceivable | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [accs, txs, ds, rs, is] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchDebts(),
        fetchReceivables(),
        fetchInstallments(),
      ])
      setAccounts(accs)
      setTxns(txs)
      setDebts(ds)
      setReceivables(rs)
      setInstallments(is)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al cargar deudas",
        "error",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const creditAccounts = accounts.filter((a) => a.type === "credit")
  const sourceAccounts = accounts.filter(
    (a) => a.type !== "credit" && a.is_active,
  )
  const otherDebts = debts.filter((d) => d.type !== "credit_card")

  const cardUsed = (id: number) => cardUsedWithMsi(txns, installments, id)
  const cardMsiUsed = (id: number) => msiOutstandingFor(installments, id)

  const accountName = (id: number | null) =>
    id != null ? (accounts.find((a) => a.id === id)?.name ?? "") : ""

  const totalCardDebt = creditAccounts.reduce(
    (sum, a) => sum + cardUsed(a.id),
    0,
  )
  const totalOtherDebt = otherDebts.reduce(
    (sum, d) =>
      sum + Math.max(0, Number(d.original_amount) - Number(d.paid_amount)),
    0,
  )
  const totalReceivable = receivables.reduce(
    (sum, r) =>
      sum + Math.max(0, Number(r.original_amount) - Number(r.collected_amount)),
    0,
  )

  const applyMsiMonthsPaid = async (cardId: number, amount: number) => {
    const active = installments
      .filter((i) => i.account_id === cardId && i.status === "active")
      .sort((a, b) => a.id - b.id)
    let money = amount
    for (const inst of active) {
      if (money < 0.01) break
      const remainingMonths =
        Number(inst.months_total) - Number(inst.months_paid)
      if (remainingMonths <= 0) continue
      const monthly = Number(inst.monthly_amount)
      if (money + 0.005 < monthly) continue
      await markInstallmentMonths(inst.id, 1)
      money -= monthly
    }
  }

  const handlePayCredit = async (data: PayModalData) => {
    if (!payCreditTarget) return
    try {
      await createTransaction({
        date: data.date,
        description: data.description || `Pago tarjeta ${payCreditTarget.name}`,
        amount: data.amount,
        type: "transfer",
        category: "Pagos de tarjeta",
        account_id: data.account_id,
        destination_account_id: payCreditTarget.id,
      })
      if (data.includeMsi) {
        await applyMsiMonthsPaid(payCreditTarget.id, data.amount)
      }
      showToast("Pago de tarjeta registrado", "success")
      setPayCreditTarget(null)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al registrar pago",
        "error",
      )
    }
  }

  const handlePayDebt = async (data: PayModalData) => {
    if (!payDebtTarget) return
    try {
      await payDebt(payDebtTarget.id, {
        amount: data.amount,
        account_id: data.account_id,
        date: data.date,
        description: data.description || `Pago ${payDebtTarget.name}`,
      })
      showToast("Pago de deuda registrado", "success")
      setPayDebtTarget(null)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al registrar pago",
        "error",
      )
    }
  }

  const handleCollect = async (data: PayModalData) => {
    if (!collectTarget) return
    try {
      await collectReceivable(collectTarget.id, {
        amount: data.amount,
        account_id: data.account_id,
        date: data.date,
      })
      showToast("Cobro registrado", "success")
      setCollectTarget(null)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al registrar cobro",
        "error",
      )
    }
  }

  const handlePayMsiMonth = async (data: PayModalData) => {
    if (!payMsiTarget) return
    try {
      await payInstallmentMonth(payMsiTarget.id, {
        account_id: data.account_id,
        date: data.date,
      })
      showToast("Mensualidad pagada", "success")
      setPayMsiTarget(null)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al actualizar",
        "error",
      )
    }
  }

  const handleSaveInstallment = async (
    data: Parameters<typeof createInstallment>[0],
  ) => {
    if (!installmentTarget) return
    try {
      if (installmentTarget.installment) {
        await updateInstallment(installmentTarget.installment.id, data)
        showToast("Crédito a meses actualizado", "success")
      } else {
        await createInstallment({
          ...data,
          account_id: installmentTarget.account.id,
        })
        showToast("Crédito a meses agregado", "success")
      }
      setInstallmentTarget(null)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al guardar",
        "error",
      )
    }
  }

  const handleDeleteInstallment = async (inst: ApiInstallment) => {
    if (!window.confirm(`¿Eliminar el crédito a meses "${inst.description}"?`))
      return
    try {
      await deleteInstallment(inst.id)
      showToast("Crédito a meses eliminado", "success")
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al eliminar",
        "error",
      )
    }
  }

  const handleSaveDebt = async (data: Parameters<typeof createDebt>[0]) => {
    try {
      if (debtTarget) {
        await updateDebt(debtTarget.id, data)
        showToast("Deuda actualizada", "success")
      } else {
        await createDebt(data)
        showToast("Deuda registrada", "success")
      }
      setDebtTarget(null)
      setDebtFormOpen(false)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al guardar",
        "error",
      )
    }
  }

  const handleDeleteDebt = async (debt: ApiDebt) => {
    if (!window.confirm(`¿Eliminar la deuda "${debt.name}"?`)) return
    try {
      await deleteDebt(debt.id)
      showToast("Deuda eliminada", "success")
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al eliminar",
        "error",
      )
    }
  }

  const handleSaveReceivable = async (
    data: Parameters<typeof createReceivable>[0],
  ) => {
    try {
      if (receivableTarget) {
        await updateReceivable(receivableTarget.id, data)
        showToast("Por cobrar actualizado", "success")
      } else {
        await createReceivable(data)
        showToast("Por cobrar registrado", "success")
      }
      setReceivableTarget(null)
      setReceivableFormOpen(false)
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al guardar",
        "error",
      )
    }
  }

  const handleDeleteReceivable = async (r: ApiReceivable) => {
    if (!window.confirm(`¿Eliminar el préstamo a "${r.person}"?`)) return
    try {
      await deleteReceivable(r.id)
      showToast("Por cobrar eliminado", "success")
      await load()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Error al eliminar",
        "error",
      )
    }
  }

  const installmentsFor = (accountId: number) =>
    installments.filter((i) => i.account_id === accountId)

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Deudas</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <p className="text-sm" style={{ color: "#A0A0B8" }}>
            Deuda total
          </p>
          <p
            className="text-3xl font-bold font-mono mt-1"
            style={{ color: "#EF4444" }}
          >
            {fmt(totalCardDebt + totalOtherDebt)}
          </p>
          <div
            className="flex flex-col gap-1 mt-2 text-xs"
            style={{ color: "#6B6B85" }}
          >
            <span>Tarjetas: {fmt(totalCardDebt)}</span>
            <span>Otras deudas: {fmt(totalOtherDebt)}</span>
          </div>
        </div>
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(6,214,160,0.2)" }}
        >
          <p className="text-sm" style={{ color: "#A0A0B8" }}>
            Total por cobrar
          </p>
          <p
            className="text-3xl font-bold font-mono mt-1"
            style={{ color: "#06D6A0" }}
          >
            {fmt(totalReceivable)}
          </p>
          <p className="text-xs mt-2" style={{ color: "#6B6B85" }}>
            {receivables.length} préstamo(s) registrado(s)
          </p>
        </div>
        <div
          className="glass rounded-2xl p-5 col-span-2 lg:col-span-1"
          style={{ border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <p className="text-sm" style={{ color: "#A0A0B8" }}>
            Crédito a meses
          </p>
          <p
            className="text-3xl font-bold font-mono mt-1"
            style={{ color: "#A78BFA" }}
          >
            {fmt(creditAccounts.reduce((s, a) => s + cardMsiUsed(a.id), 0))}
          </p>
          <p className="text-xs mt-2" style={{ color: "#6B6B85" }}>
            Crédito ocupado por MSI
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <CreditCard size={18} style={{ color: "#EF4444" }} /> Tarjetas de
            Crédito
          </h3>
          <button
            onClick={() => setPayCreditTarget(creditAccounts[0] ?? null)}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ opacity: creditAccounts.length ? 1 : 0.4 }}
            disabled={!creditAccounts.length || !sourceAccounts.length}
          >
            Registrar Pago
          </button>
        </div>

        {creditAccounts.length === 0 ? (
          <div
            className="py-10 text-center text-sm rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B85" }}
          >
            No hay tarjetas de crédito. Regístralas en la sección de Cuentas.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {creditAccounts.map((a) => {
              const used = cardUsed(a.id)
              const msi = cardMsiUsed(a.id)
              const limit = a.credit_limit ?? 0
              const available = Math.max(0, limit - used)
              const pendingPct =
                limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
              const cardInstallments = installmentsFor(a.id)
              return (
                <div
                  key={a.id}
                  className="glass card-hover rounded-2xl p-5 relative overflow-hidden"
                  style={{ border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <div
                    className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10"
                    style={{ background: "#EF4444" }}
                  />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.15)" }}
                      >
                        <CreditCard size={20} style={{ color: "#EF4444" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{a.name}</p>
                        <p
                          className="text-xs flex items-center gap-1"
                          style={{ color: "#6B6B85" }}
                        >
                          <CalendarDays size={12} />
                          Corte día {a.cutoff_day ?? "—"} · Pago día{" "}
                          {a.payment_due_day ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="text-2xl font-bold font-mono"
                        style={{ color: "#fff" }}
                      >
                        {fmt(available)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#6B6B85" }}>
                        Crédito disponible
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#F87171",
                      }}
                    >
                      {pendingPct}% usado
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "#6B6B85" }}>
                        Usado en cortes: {fmt(used)}
                      </span>
                      <span style={{ color: "#A78BFA" }}>MSI: {fmt(msi)}</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pendingPct}%`,
                          background: "linear-gradient(90deg,#EF4444,#A78BFA)",
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#6B6B85" }}>
                      Límite: {fmt(limit)}
                    </p>
                  </div>

                  {cardInstallments.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      <p
                        className="text-xs font-medium flex items-center gap-1"
                        style={{ color: "#A78BFA" }}
                      >
                        <Wallet size={12} /> Crédito a meses (MSI)
                      </p>
                      {cardInstallments.map((inst) => {
                        const remaining =
                          Number(inst.months_total) - Number(inst.months_paid)
                        const paidOff = inst.status === "paid" || remaining <= 0
                        return (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between px-3 py-2 rounded-xl"
                            style={{
                              background: "rgba(139,92,246,0.06)",
                              border: "1px solid rgba(139,92,246,0.15)",
                            }}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {inst.description}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "#6B6B85" }}
                              >
                                {fmt(Number(inst.monthly_amount))}/mes ·{" "}
                                {inst.months_paid}/{inst.months_total} meses ·
                                Falta{" "}
                                {fmt(Number(inst.monthly_amount) * remaining)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() =>
                                  setInstallmentTarget({
                                    account: a,
                                    installment: inst,
                                  })
                                }
                                className="p-1 rounded-lg hover:bg-white/10"
                                style={{ color: "#A0A0B8" }}
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setPayMsiTarget(inst)}
                                disabled={paidOff || !sourceAccounts.length}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium"
                                style={{
                                  background: paidOff
                                    ? "rgba(6,214,160,0.12)"
                                    : "rgba(6,214,160,0.15)",
                                  color: paidOff ? "#06D6A0" : "#06D6A0",
                                  cursor: paidOff ? "not-allowed" : "pointer",
                                }}
                                title={
                                  paidOff ? "Liquidado" : "Mensualidad pagada"
                                }
                              >
                                {paidOff ? "Liquidado" : "Pagar mes"}
                              </button>
                              <button
                                onClick={() => handleDeleteInstallment(inst)}
                                className="p-1 rounded-lg hover:bg-white/10"
                                style={{ color: "#F87171" }}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() =>
                        setInstallmentTarget({ account: a, installment: null })
                      }
                      className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                      style={{
                        background: "rgba(139,92,246,0.12)",
                        color: "#A78BFA",
                        border: "1px solid rgba(139,92,246,0.25)",
                      }}
                    >
                      <Plus size={14} /> Crédito a meses
                    </button>
                    <button
                      onClick={() => setPayCreditTarget(a)}
                      disabled={!sourceAccounts.length}
                      className="btn-primary flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <HandCoins size={14} /> Pagar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Landmark size={18} style={{ color: "#F59E0B" }} /> Otras Deudas
          </h3>
          <button
            onClick={() => {
              setDebtTarget(null)
              setDebtFormOpen(true)
            }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <Plus size={14} /> Nueva Deuda
          </button>
        </div>

        {debts.length === 0 || otherDebts.length === 0 ? (
          <div
            className="py-10 text-center text-sm rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B85" }}
          >
            {debts.length === 0
              ? "No hay deudas registradas más allá de las tarjetas."
              : "No hay deudas generales, solo tarjetas de crédito."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {otherDebts.map((d) => {
              const pending = Math.max(
                0,
                Number(d.original_amount) - Number(d.paid_amount),
              )
              const paidPct =
                Number(d.original_amount) > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (Number(d.paid_amount) / Number(d.original_amount)) *
                          100,
                      ),
                    )
                  : 0
              const settled = d.status === "paid" || pending <= 0
              return (
                <div
                  key={d.id}
                  className="glass card-hover rounded-2xl p-5"
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    opacity: settled ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-base font-semibold">{d.name}</p>
                      <p className="text-xs" style={{ color: "#6B6B85" }}>
                        {d.creditor} · Vence {fmtDate(d.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-lg font-bold font-mono"
                        style={{ color: settled ? "#06D6A0" : "#EF4444" }}
                      >
                        {fmt(pending)}
                      </p>
                      <p className="text-xs" style={{ color: "#6B6B85" }}>
                        de {fmt(d.original_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "#6B6B85" }}>Progreso de pago</span>
                      <span style={{ color: settled ? "#06D6A0" : "#F59E0B" }}>
                        {paidPct}% pagado
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${paidPct}%`,
                          background: settled ? "#06D6A0" : "#F59E0B",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!settled && (
                      <button
                        onClick={() => setPayDebtTarget(d)}
                        disabled={!sourceAccounts.length}
                        className="btn-primary flex-1 py-2 rounded-xl text-xs font-medium"
                      >
                        Registrar Pago
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDebtTarget(d)
                        setDebtFormOpen(true)
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#A0A0B8",
                      }}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteDebt(d)}
                      className="py-2 px-3 rounded-xl text-xs flex items-center justify-center transition-colors"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        color: "#F87171",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <HandCoins size={18} style={{ color: "#06D6A0" }} /> Cuentas por
            Cobrar
          </h3>
          <button
            onClick={() => {
              setReceivableTarget(null)
              setReceivableFormOpen(true)
            }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <Plus size={14} /> Nuevo Préstamo
          </button>
        </div>

        {receivables.length === 0 ? (
          <div
            className="py-10 text-center text-sm rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B85" }}
          >
            No hay préstamos por cobrar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {receivables.map((r) => {
              const pending = Math.max(
                0,
                Number(r.original_amount) - Number(r.collected_amount),
              )
              const settled = r.status === "paid" || pending <= 0
              return (
                <div
                  key={r.id}
                  className="glass rounded-2xl p-4 flex items-center justify-between gap-3"
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    opacity: settled ? 0.6 : 1,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.person}</p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "#6B6B85" }}
                    >
                      {r.description || "Sin concepto"} · Vence{" "}
                      {fmtDate(r.due_date)}
                      {r.account_id != null && (
                        <span> · Cuenta: {accountName(r.account_id)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: settled
                          ? "rgba(6,214,160,0.15)"
                          : "rgba(245,158,11,0.15)",
                        color: settled ? "#06D6A0" : "#F59E0B",
                      }}
                    >
                      {settled ? "Pagado" : "Pendiente"}
                    </span>
                    <div className="text-right">
                      <p
                        className="text-base font-bold font-mono"
                        style={{ color: settled ? "#06D6A0" : "#06D6A0" }}
                      >
                        {fmt(pending)}
                      </p>
                      <p className="text-xs" style={{ color: "#6B6B85" }}>
                        de {fmt(r.original_amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!settled && (
                        <button
                          onClick={() => setCollectTarget(r)}
                          disabled={!sourceAccounts.length}
                          className="text-xs px-3 py-1 rounded-lg"
                          style={{
                            background: "rgba(6,214,160,0.12)",
                            color: "#06D6A0",
                          }}
                        >
                          Cobrar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setReceivableTarget(r)
                          setReceivableFormOpen(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10"
                        style={{ color: "#A0A0B8" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteReceivable(r)}
                        className="p-1.5 rounded-lg hover:bg-white/10"
                        style={{ color: "#F87171" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {loading && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(10,10,15,0.6)" }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      )}

      <PayModal
        key={`credit-${payCreditTarget?.id ?? "none"}`}
        open={payCreditTarget !== null}
        title={`Pago tarjeta ${payCreditTarget?.name ?? ""}`}
        note="El pago se registra como una transferencia desde tu cuenta de débito hacia la tarjeta; no se cuenta como ingreso ni gasto."
        accounts={sourceAccounts}
        defaultAmount={
          payCreditTarget ? cardUsed(payCreditTarget.id) : undefined
        }
        requireAccount
        showMsiCheckbox
        submitLabel="Registrar Pago"
        onClose={() => setPayCreditTarget(null)}
        onSubmit={handlePayCredit}
      />

      <PayModal
        key={`debtpay-${payDebtTarget?.id ?? "none"}`}
        open={payDebtTarget !== null}
        title={`Registrar pago`}
        note={`Abono a la deuda "${payDebtTarget?.name ?? ""}".`}
        accounts={sourceAccounts}
        defaultAmount={
          payDebtTarget
            ? Math.max(
                0,
                Number(payDebtTarget.original_amount) -
                  Number(payDebtTarget.paid_amount),
              )
            : undefined
        }
        requireAccount
        submitLabel="Registrar Pago"
        onClose={() => setPayDebtTarget(null)}
        onSubmit={handlePayDebt}
      />

      <PayModal
        key={`collect-${collectTarget?.id ?? "none"}`}
        open={collectTarget !== null}
        title={`Cobrar a ${collectTarget?.person ?? ""}`}
        note="El cobro se registra como un ingreso en la cuenta seleccionada."
        accounts={sourceAccounts}
        defaultAmount={
          collectTarget
            ? Math.max(
                0,
                Number(collectTarget.original_amount) -
                  Number(collectTarget.collected_amount),
              )
            : undefined
        }
        requireAccount
        submitLabel="Registrar Cobro"
        onClose={() => setCollectTarget(null)}
        onSubmit={handleCollect}
      />

      <PayModal
        key={`msi-${payMsiTarget?.id ?? "none"}`}
        open={payMsiTarget !== null}
        title={`Pagar mes: ${payMsiTarget?.description ?? ""}`}
        note={`La mensualidad se registra como una transferencia desde tu cuenta hacia la tarjeta ${accountName(payMsiTarget?.account_id ?? null)} y avanza el crédito a meses.`}
        accounts={sourceAccounts}
        defaultAmount={
          payMsiTarget ? Number(payMsiTarget.monthly_amount) : undefined
        }
        requireAccount
        submitLabel="Pagar Mes"
        onClose={() => setPayMsiTarget(null)}
        onSubmit={handlePayMsiMonth}
      />

      <InstallmentFormModal
        key={
          installmentTarget?.installment?.id ??
          `inst-${installmentTarget?.account.id ?? "none"}`
        }
        open={installmentTarget !== null}
        installment={installmentTarget?.installment ?? null}
        onClose={() => setInstallmentTarget(null)}
        onSave={handleSaveInstallment}
      />

      <DebtFormModal
        key={debtTarget?.id ?? "new-debt"}
        open={debtFormOpen}
        debt={debtTarget}
        onClose={() => {
          setDebtTarget(null)
          setDebtFormOpen(false)
        }}
        onSave={handleSaveDebt}
      />

      <ReceivableFormModal
        key={receivableTarget?.id ?? "new-receivable"}
        open={receivableFormOpen}
        receivable={receivableTarget}
        accounts={sourceAccounts}
        onClose={() => {
          setReceivableTarget(null)
          setReceivableFormOpen(false)
        }}
        onSave={handleSaveReceivable}
      />
    </div>
  )
}
