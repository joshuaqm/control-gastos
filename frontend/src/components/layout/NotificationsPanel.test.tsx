import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import NotificationsPanel from "./NotificationsPanel"
import type { Reminder } from "@/utils/dashboardCalc"

const reminder: Reminder = {
  id: "credit-4",
  kind: "credit",
  title: "Pago tarjeta Banorte",
  subtitle: "Corte día 10 · pago día 16",
  amount: 500,
  days: 1,
}

const baseProps = {
  open: true,
  reminders: [reminder],
  enabled: true,
  loading: false,
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onMarkAllRead: vi.fn(),
}

describe("NotificationsPanel", () => {
  it("renders nothing when closed", () => {
    render(<NotificationsPanel {...baseProps} open={false} />)
    expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument()
  })

  it("shows a reminder list with a badge count", () => {
    render(<NotificationsPanel {...baseProps} />)
    expect(screen.getByText("Pago tarjeta Banorte")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("shows the disabled state", () => {
    render(<NotificationsPanel {...baseProps} enabled={false} />)
    expect(
      screen.getByText("Las notificaciones están desactivadas."),
    ).toBeInTheDocument()
  })

  it("shows the empty state", () => {
    render(<NotificationsPanel {...baseProps} reminders={[]} loading={false} />)
    expect(
      screen.getByText("No hay notificaciones pendientes."),
    ).toBeInTheDocument()
  })

  it("navigates and marks all read when a reminder is clicked", () => {
    render(<NotificationsPanel {...baseProps} />)
    fireEvent.click(screen.getByText("Pago tarjeta Banorte"))
    expect(baseProps.onNavigate).toHaveBeenCalledWith("debts")
    expect(baseProps.onMarkAllRead).toHaveBeenCalled()
  })
})
