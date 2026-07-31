"use client"

import { cn } from "@/lib/utils"

type SetupStep = 0 | 1 | 2 | 3

const STEPS: SetupStep[] = [0, 1, 2, 3]

type Props = Readonly<{
  step: SetupStep
  className?: string
}>

function dotClass(index: number, step: SetupStep): string {
  if (index === step) return "w-8 bg-accent"
  if (index < step) return "w-1.5 bg-accent/70"
  return "w-1.5 bg-muted-foreground/25"
}

export function SetupWizardStepper({ step, className }: Props) {
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className={cn("space-y-3", className)}>
      <progress
        className="sr-only"
        value={step + 1}
        max={STEPS.length}
        aria-label={`Step ${step + 1} of ${STEPS.length}`}
      />
      <div className="flex items-center gap-2" aria-hidden>
        {STEPS.map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              dotClass(i, step)
            )}
          />
        ))}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted-foreground/15"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-accent/80 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export type { SetupStep }
