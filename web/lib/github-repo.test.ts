import { afterEach, describe, expect, it } from "vitest"
import {
  getGithubRepoUrl,
  getGithubRepoUrlFromRuntimeEnv,
} from "./github-repo"

describe("github-repo", () => {
  const prevPublic = process.env.NEXT_PUBLIC_GITHUB_REPO_URL
  const prevRuntime = process.env.PUBLIC_GITHUB_REPO_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = prevPublic
    process.env.PUBLIC_GITHUB_REPO_URL = prevRuntime
  })

  it("returns null when env is empty", () => {
    delete process.env.NEXT_PUBLIC_GITHUB_REPO_URL
    expect(getGithubRepoUrl()).toBeNull()
  })

  it("returns https url when valid", () => {
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = "https://github.com/org/repo"
    expect(getGithubRepoUrl()).toBe("https://github.com/org/repo")
  })

  it("rejects non-http protocols", () => {
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = "ftp://example.com/x"
    expect(getGithubRepoUrl()).toBeNull()
  })

  it("prefers PUBLIC_GITHUB_REPO_URL in runtime helper", () => {
    process.env.PUBLIC_GITHUB_REPO_URL = "https://github.com/runtime/repo"
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = "https://github.com/other/repo"
    expect(getGithubRepoUrlFromRuntimeEnv()).toBe(
      "https://github.com/runtime/repo",
    )
  })

  it("falls back to NEXT_PUBLIC in runtime helper and rejects invalid urls", () => {
    delete process.env.PUBLIC_GITHUB_REPO_URL
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = "notaurl"
    expect(getGithubRepoUrlFromRuntimeEnv()).toBeNull()

    process.env.NEXT_PUBLIC_GITHUB_REPO_URL = "http://github.com/org/repo"
    expect(getGithubRepoUrlFromRuntimeEnv()).toBe("http://github.com/org/repo")
  })

  it("returns null in runtime helper when both env vars are missing", () => {
    delete process.env.PUBLIC_GITHUB_REPO_URL
    delete process.env.NEXT_PUBLIC_GITHUB_REPO_URL

    expect(getGithubRepoUrlFromRuntimeEnv()).toBeNull()
  })
})
