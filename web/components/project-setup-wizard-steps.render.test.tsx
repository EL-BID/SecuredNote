import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  SetupBrandStep,
  SetupLegalStep,
  SetupWelcomeStep,
} from "./project-setup-wizard-steps"
import { DEFAULT_PROJECT_BRANDING } from "@/lib/project-branding"

const t = (key: string) => key

describe("project-setup-wizard-steps components", () => {
  it("renders welcome step cards", () => {
    render(
      <SetupWelcomeStep
        cards={[
          { icon: () => null, title: "A", desc: "B" },
        ]}
      />,
    )
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("renders brand step fields", () => {
    render(
      <SetupBrandStep
        previewBranding={DEFAULT_PROJECT_BRANDING}
        appName="Demo"
        onAppNameChange={vi.fn()}
        nameError={false}
        onPickLogo={vi.fn()}
        logoDataUrl={null}
        onRemoveLogo={vi.fn()}
        logoError={null}
        primary="#111111"
        accent="#222222"
        background="#333333"
        onPrimaryChange={vi.fn()}
        onAccentChange={vi.fn()}
        onBackgroundChange={vi.fn()}
        t={t}
      />,
    )
    expect(screen.getByLabelText("setup.appName")).toBeInTheDocument()
  })

  it("renders legal step and custom fields", () => {
    render(
      <SetupLegalStep
        disclaimerMode="custom"
        onDisclaimerModeChange={vi.fn()}
        customContent={{
          en: { title: "", body: "" },
          es: { title: "", body: "" },
        }}
        onCustomTranslationChange={vi.fn()}
        disclaimerCustomError={false}
        saveError={null}
        t={t}
      />,
    )
    fireEvent.change(screen.getByLabelText("setup.disclaimerTitle", { selector: "#disclaimer-custom-title-en" }), {
      target: { value: "Legal" },
    })
    expect(
      screen.getByLabelText("setup.disclaimerBody", { selector: "#disclaimer-custom-body-es" }),
    ).toBeInTheDocument()
  })

  it("renders the built-in disclaimer preview when default mode is selected", () => {
    render(
      <SetupLegalStep
        disclaimerMode="default"
        onDisclaimerModeChange={vi.fn()}
        customContent={{
          en: { title: "", body: "" },
          es: { title: "", body: "" },
        }}
        onCustomTranslationChange={vi.fn()}
        disclaimerCustomError={false}
        saveError={null}
        t={t}
      />,
    )

    expect(screen.getByText("disclaimer.title")).toBeInTheDocument()
    expect(screen.getByText("disclaimer.body")).toBeInTheDocument()
  })
})
