import { describe, it, expect, afterEach } from "vitest"
import { fmt, fmtSigned, setAmountsHidden, HIDDEN_AMOUNT } from "./format"

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

describe("hidden amounts mode", () => {
  afterEach(() => setAmountsHidden(false))

  it("masks fmt and fmtSigned while hidden, without altering values", () => {
    setAmountsHidden(true)
    expect(fmt(1500)).toBe(HIDDEN_AMOUNT)
    expect(fmtSigned(-500)).toBe(HIDDEN_AMOUNT)
  })

  it("restores the original formatting when shown again", () => {
    setAmountsHidden(true)
    expect(fmt(1500)).toBe(HIDDEN_AMOUNT)
    setAmountsHidden(false)
    expect(fmt(1500)).toMatch(/1,500\.00/)
    expect(fmtSigned(-500)).toContain("-")
  })
})
