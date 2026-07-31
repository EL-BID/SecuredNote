function parseHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.href
  } catch {
    return null
  }
}

export function getGithubRepoUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim()
  if (!raw) return null
  return parseHttpUrl(raw)
}

export function getGithubRepoUrlFromRuntimeEnv(): string | null {
  const raw =
    process.env.PUBLIC_GITHUB_REPO_URL?.trim() ||
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim()
  if (!raw) return null
  return parseHttpUrl(raw)
}
