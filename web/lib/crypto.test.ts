import { afterEach, describe, expect, it, vi } from "vitest"
import {
  bytesToBase64Url,
  decrypt,
  decryptText,
  encrypt,
  encryptText,
  exportKey,
  generateKey,
  importKey,
} from "./crypto"

async function exportKeyBase64Url(): Promise<string> {
  const key = await generateKey()
  const raw = await crypto.subtle.exportKey("raw", key)
  return bytesToBase64Url(raw)
}

describe("crypto", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("round-trips text with url-safe key encoding", async () => {
    const keyBase64 = await exportKeyBase64Url()

    const payload = await encrypt("hola mundo confidencial", keyBase64)
    const plain = await decrypt(payload, keyBase64)

    expect(plain).toBe("hola mundo confidencial")
    expect(payload.salt).toBeNull()
  })

  it("rejects tampered ciphertext", async () => {
    const keyBase64 = await exportKeyBase64Url()

    const payload = await encrypt("secreto", keyBase64)
    const tampered = { ...payload, cipher: payload.cipher.slice(0, -4) + "AAAA" }

    await expect(decrypt(tampered, keyBase64)).rejects.toThrow()
  })

  it("generateKey exportKey importKey and encryptText/decryptText round-trip", async () => {
    const key = await generateKey()
    const exported = await exportKey(key)
    expect(exported.length).toBeGreaterThan(10)

    const payload = await encryptText("via CryptoKey", key)
    const imported = await importKey(exported)
    const plain = await decryptText(payload.cipher, payload.iv, imported)
    expect(plain).toBe("via CryptoKey")
  })

  it("bytesToBase64Url produces url-safe output", async () => {
    const key = await generateKey()
    const raw = await crypto.subtle.exportKey("raw", key)
    const url = bytesToBase64Url(raw)
    expect(url).not.toMatch(/[+/=]/)
  })

  it("treats missing decoded code points as zero bytes", async () => {
    const atobSpy = vi
      .spyOn(globalThis, "atob")
      .mockReturnValue({ length: 16, codePointAt: () => undefined } as unknown as string)

    const imported = await importKey("AQ")

    expect(imported).toBeInstanceOf(CryptoKey)
    expect(atobSpy).toHaveBeenCalled()
  })
})
