const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256
const IV_LENGTH = 12

export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ["encrypt", "decrypt"],
  )
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key)
  return arrayBufferToBase64(exported)
}

export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64)
  return await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ["decrypt"],
  )
}

export async function encryptText(
  text: string,
  key: CryptoKey,
): Promise<{ cipher: string; iv: string; salt: string | null }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data,
  )

  return {
    cipher: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    salt: null,
  }
}

export async function encrypt(text: string, keyBase64: string) {
  const keyData = base64ToArrayBuffer(normalizeBase64Url(keyBase64))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt']
  )

  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    cryptoKey,
    data
  )

  return {
    cipher: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    salt: null,
  }
}

export async function decryptText(cipher: string, iv: string, key: CryptoKey): Promise<string> {
  const cipherBuffer = base64ToArrayBuffer(cipher)
  const ivBuffer = base64ToArrayBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer,
    },
    key,
    cipherBuffer,
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

export async function decrypt(
  data: { cipher: string; iv: string; salt: string | null },
  keyBase64: string
) {
  const keyData = base64ToArrayBuffer(normalizeBase64Url(keyBase64))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  )

  const cipherData = base64ToArrayBuffer(data.cipher)
  const ivData = base64ToArrayBuffer(data.iv)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivData },
    cryptoKey,
    cipherData
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

function normalizeBase64Url(keyBase64: string): string {
  return keyBase64.replaceAll("-", "+").replaceAll("_", "/")
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i) ?? 0
  }
  return bytes.buffer
}

/** URL-safe base64 without padding (note link fragment keys). */
export function bytesToBase64Url(buffer: ArrayBuffer): string {
  return arrayBufferToBase64(buffer)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}
