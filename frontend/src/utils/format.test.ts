import { describe, it, expect } from "vitest"
import { fmt } from "./format"

describe("fmt", () => {
  it("formats a positive number as MXN currency without decimals", () => {
    expect(fmt(1500)).toMatch(/1,500/)
    expect(fmt(1500)).toContain("$")
  })

  it("formats a negative amount with its absolute value", () => {
    expect(fmt(-250)).not.toContain("-")
  })

  it("formats thousands separators", () => {
    expect(fmt(1234567)).toMatch(/1,234,567/)
  })
})
