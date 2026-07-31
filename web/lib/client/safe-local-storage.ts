/** Best-effort localStorage access (private mode / quota errors). */

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    globalThis.localStorage?.setItem(key, value)
    return true
  } catch (err) {
    console.debug("localStorage.setItem failed", { key, err })
    return false
  }
}

export function safeLocalStorageRemoveItem(key: string): boolean {
  try {
    globalThis.localStorage?.removeItem(key)
    return true
  } catch (err) {
    console.debug("localStorage.removeItem failed", { key, err })
    return false
  }
}

export function safeLocalStorageGetItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch (err) {
    console.debug("localStorage.getItem failed", { key, err })
    return null
  }
}
