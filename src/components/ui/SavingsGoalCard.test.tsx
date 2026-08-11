import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import SavingsGoalCard from "./SavingsGoalCard"

describe("SavingsGoalCard", () => {
  it("renders the goal name and progress percentage", () => {
    render(
      <SavingsGoalCard
        goal={{ name: "Viaje", current: 2500, goal: 10000, color: "#7C3AED" }}
      />,
    )
    expect(screen.getByText("Viaje")).toBeInTheDocument()
    expect(screen.getByText("25%")).toBeInTheDocument()
    expect(screen.getByText("$2,500 / $10,000")).toBeInTheDocument()
  })

  it("caps the percentage at rendering values without overflow", () => {
    render(
      <SavingsGoalCard
        goal={{
          name: "Meta completa",
          current: 5000,
          goal: 1000,
          color: "#06D6A0",
        }}
      />,
    )
    expect(screen.getByText("Meta completa")).toBeInTheDocument()
  })
})
