import { describe, it, expect } from "vitest"
import { fmt, fmtSigned } from "./format"

describe("fmt", () => {
  it("formats a positive number as MXN currency with cents", () => {
    expect(fmt(1500)).toMatch(/1,500\.00/)
    expect(fmt(1500)).toContain("$")
  })

  it("formats cents", () => {
    expect(fmt(1234.5)).toMatch(/1,234\.50/)
  })

  it("formats a negative amount with its absolute value", () => {
    expect(fmt(-250)).not.toContain("-")
  })

  it("formats thousands separators", () => {
    expect(fmt(1234567)).toMatch(/1,234,567\.00/)
  })
})

describe("fmtSigned", () => {
  it("preserves the sign for a positive amount", () => {
    expect(fmtSigned(1500)).toMatch(/1,500\.00/)
    expect(fmtSigned(1500)).not.toContain("-")
  })

  it("keeps the minus for a negative amount", () => {
    expect(fmtSigned(-500)).toContain("-")
  })
})
