import { afterEach, describe, expect, it, vi } from "vitest"

describe("ga", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    vi.resetModules()
  })

  it("returns null for missing or invalid ids", async () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "bad"
    const { getSafeGa4MeasurementId } = await import("./ga")
    expect(getSafeGa4MeasurementId()).toBeNull()

    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    expect(getSafeGa4MeasurementId()).toBeNull()
  })

  it("returns trimmed valid ids", async () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "  G-TEST1234  "
    const { getSafeGa4MeasurementId } = await import("./ga")
    expect(getSafeGa4MeasurementId()).toBe("G-TEST1234")
  })
})
