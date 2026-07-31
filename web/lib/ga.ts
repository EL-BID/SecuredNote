const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/i

export function getSafeGa4MeasurementId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  if (!raw || !GA4_PATTERN.test(raw)) return null
  return raw
}
