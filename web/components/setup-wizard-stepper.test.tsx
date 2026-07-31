import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SetupWizardStepper } from "./setup-wizard-stepper"

describe("SetupWizardStepper", () => {
  it("renders progress for step 0", () => {
    render(<SetupWizardStepper step={0} />)
    expect(screen.getByLabelText("Step 1 of 4")).toBeInTheDocument()
  })

  it("renders progress for step 3", () => {
    render(<SetupWizardStepper step={3} />)
    expect(screen.getByLabelText("Step 4 of 4")).toBeInTheDocument()
  })
})
