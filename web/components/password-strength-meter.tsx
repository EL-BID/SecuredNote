'use client'

import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'
import { useLocale } from '@/lib/locale-provider'

type StrengthLevel = 'very-weak' | 'weak' | 'acceptable' | 'strong' | 'very-strong'

type SuggestionKey =
  | 'sug.min12'
  | 'sug.mixedCase'
  | 'sug.numbers'
  | 'sug.symbols'
  | 'sug.patterns'

type PasswordStrengthMeterProps = Readonly<{
  password: string
}>

function scoreLength(password: string, score: number, suggestionKeys: SuggestionKey[]): number {
  let next = score
  if (password.length >= 8) next += 1
  if (password.length >= 12) next += 1
  if (password.length >= 16) next += 1
  if (password.length < 12) suggestionKeys.push('sug.min12')
  return next
}

function scoreCharacterClasses(password: string, score: number, suggestionKeys: SuggestionKey[]): number {
  let next = score
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    next += 1
  } else {
    suggestionKeys.push('sug.mixedCase')
  }
  if (/\d/.test(password)) {
    next += 1
  } else {
    suggestionKeys.push('sug.numbers')
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    next += 1
  } else {
    suggestionKeys.push('sug.symbols')
  }
  return next
}

function applyCommonPatternPenalty(password: string, score: number, suggestionKeys: SuggestionKey[]): number {
  const commonPatterns = [
    /^(123|abc|qwerty|password|admin)/i,
    /(.)\1{2,}/,
    /^[a-z]+$/i,
    /^\d+$/,
  ]
  if (commonPatterns.some((p) => p.test(password))) {
    suggestionKeys.push('sug.patterns')
    return Math.max(0, score - 2)
  }
  return score
}

function scoreToPresentation(score: number): {
  level: StrengthLevel
  value: number
  color: string
} {
  if (score <= 1) return { level: 'very-weak', value: 20, color: 'bg-red-500' }
  if (score === 2) return { level: 'weak', value: 40, color: 'bg-orange-500' }
  if (score === 3) return { level: 'acceptable', value: 60, color: 'bg-yellow-500' }
  if (score === 4) return { level: 'strong', value: 80, color: 'bg-lime-500' }
  return { level: 'very-strong', value: 100, color: 'bg-green-500' }
}

function calculateStrength(password: string): {
  level: StrengthLevel
  value: number
  color: string
  suggestionKeys: SuggestionKey[]
} {
  if (!password) {
    return {
      level: 'very-weak',
      value: 0,
      color: 'bg-gray-300',
      suggestionKeys: [],
    }
  }

  const suggestionKeys: SuggestionKey[] = []
  let score = 0
  score = scoreLength(password, score, suggestionKeys)
  score = scoreCharacterClasses(password, score, suggestionKeys)
  score = applyCommonPatternPenalty(password, score, suggestionKeys)
  const { level, value, color } = scoreToPresentation(score)
  return { level, value, color, suggestionKeys }
}

const levelKey: Record<StrengthLevel, string> = {
  'very-weak': 'strength.veryWeak',
  weak: 'strength.weak',
  acceptable: 'strength.acceptable',
  strong: 'strength.strong',
  'very-strong': 'strength.veryStrong',
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useLocale()
  const strength = useMemo(() => calculateStrength(password), [password])

  if (!password) return null

  const label = t(levelKey[strength.level])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('strength.label')}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="relative">
        <progress
          className="sr-only"
          value={strength.value}
          max={100}
          aria-label={label}
        />
        <Progress value={strength.value} className="h-2" aria-hidden />
        <div
          className={`absolute inset-0 h-full rounded-full transition-all ${strength.color}`}
          style={{ width: `${strength.value}%` }}
          aria-hidden
        />
      </div>
      {strength.suggestionKeys.length > 0 && strength.value < 60 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900 dark:bg-yellow-950">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
            {t('strength.suggestionsTitle')}
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-yellow-700 dark:text-yellow-300">
            {strength.suggestionKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { calculateStrength }
export type { StrengthLevel }
