import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TrendingUp } from "lucide-react"
import SummaryCard from "./SummaryCard"

describe("SummaryCard", () => {
  it("renders the title, value and subtitle", () => {
    render(
      <SummaryCard
        title="Patrimonio"
        value="$12,000"
        sub="vs mes anterior"
        icon={TrendingUp}
        color="#7C3AED"
      />,
    )
    expect(screen.getByText("Patrimonio")).toBeInTheDocument()
    expect(screen.getByText("$12,000")).toBeInTheDocument()
    expect(screen.getByText("vs mes anterior")).toBeInTheDocument()
  })

  it("shows a positive trend with percentage", () => {
    render(
      <SummaryCard
        title="Patrimonio"
        value="$12,000"
        sub=""
        trend={5}
        icon={TrendingUp}
        color="#7C3AED"
      />,
    )
    expect(screen.getByText("5% vs mes anterior")).toBeInTheDocument()
  })

  it("shows a negative trend with absolute value", () => {
    render(
      <SummaryCard
        title="Patrimonio"
        value="$12,000"
        sub=""
        trend={-3}
        icon={TrendingUp}
        color="#7C3AED"
      />,
    )
    expect(screen.getByText("3% vs mes anterior")).toBeInTheDocument()
  })
})
