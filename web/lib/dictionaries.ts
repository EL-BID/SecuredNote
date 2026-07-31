export type Locale = "en" | "es"

import en from "@/locales/en.json"
import es from "@/locales/es.json"

export const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  es,
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let s = dictionaries[locale][key] ?? dictionaries.en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}
