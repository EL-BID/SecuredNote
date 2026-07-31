import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  fixLcovForSonar,
  maybeRunFixLcovCli,
  normalizeSourceFile,
  runFixLcovCli,
} from "./fix-lcov-for-sonar.mjs"

describe("fix-lcov-for-sonar", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secured-lcov-"))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("normalizes source file paths into the web workspace", () => {
    expect(normalizeSourceFile("app/page.tsx")).toBe("web/app/page.tsx")
    expect(normalizeSourceFile("./lib/x.ts")).toBe("web/lib/x.ts")
    expect(normalizeSourceFile("web/app/page.tsx")).toBe("web/app/page.tsx")
    expect(normalizeSourceFile("")).toBe("")
    expect(
      normalizeSourceFile(path.join(tmpDir, "repo", "web", "lib", "x.ts"), {
        repoRoot: path.join(tmpDir, "repo"),
        webRoot: path.join(tmpDir, "repo", "web"),
      }),
    ).toBe("web/lib/x.ts")
    expect(
      normalizeSourceFile(path.join(tmpDir, "repo", "other", "x.ts"), {
        repoRoot: path.join(tmpDir, "repo"),
        webRoot: path.join(tmpDir, "repo", "web"),
      }),
    ).toBe("other/x.ts")
    expect(
      normalizeSourceFile(path.join(tmpDir, "detached-web", "lib", "x.ts"), {
        repoRoot: path.join(tmpDir, "repo"),
        webRoot: path.join(tmpDir, "detached-web"),
      }),
    ).toBe("web/lib/x.ts")
    expect(normalizeSourceFile("./web/app/page.tsx")).toBe("web/app/page.tsx")
  })

  it("rewrites SF paths and writes both sonar lcov outputs", () => {
    const vitestLcov = path.join(tmpDir, "coverage.lcov")
    const webSonarLcov = path.join(tmpDir, "web.lcov")
    const rootSonarLcov = path.join(tmpDir, "root.lcov")

    fs.writeFileSync(
      vitestLcov,
      ["TN:", "SF:app/page.tsx", "DA:1,1", "end_of_record"].join("\n"),
    )

    const result = fixLcovForSonar({
      vitestLcov,
      webSonarLcov,
      rootSonarLcov,
      repoRoot: tmpDir,
      webRoot: path.join(tmpDir, "web"),
    })

    expect(result.rewrittenCount).toBe(1)
    expect(fs.readFileSync(webSonarLcov, "utf8")).toContain("SF:web/app/page.tsx")
    expect(fs.readFileSync(rootSonarLcov, "utf8")).toContain("SF:web/app/page.tsx")
  })

  it("throws when the input lcov file is missing", () => {
    expect(() =>
      fixLcovForSonar({
        vitestLcov: path.join(tmpDir, "missing.lcov"),
        webSonarLcov: path.join(tmpDir, "web.lcov"),
        rootSonarLcov: path.join(tmpDir, "root.lcov"),
      }),
    ).toThrow(/missing/i)
  })

  it("supports the CLI success and error paths", () => {
    const log = vi.fn()
    const logError = vi.fn()
    const exit = vi.fn()

    runFixLcovCli({
      run: () => ({
        fixed: ["TN:", "SF:web/app/page.tsx"].join("\n"),
        rewrittenCount: 2,
        webSonarLcov: "/tmp/web/lcov.info",
        rootSonarLcov: "/tmp/lcov.info",
      }),
      log,
      logError,
      exit,
    })

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("fix-lcov-for-sonar: wrote"),
    )
    expect(logError).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()

    runFixLcovCli({
      run: () => {
        throw new Error("missing file")
      },
      log,
      logError,
      exit,
    })

    expect(logError).toHaveBeenCalledWith("missing file")
    expect(exit).toHaveBeenCalledWith(1)

    runFixLcovCli({
      run: () => {
        throw "plain failure"
      },
      log,
      logError,
      exit,
    })

    expect(logError).toHaveBeenCalledWith("plain failure")
  })

  it("only auto-runs when the argv path matches the module path", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never)

    maybeRunFixLcovCli("/tmp/other-file.mjs", import.meta.url)
    expect(logSpy).not.toHaveBeenCalled()

    maybeRunFixLcovCli(new URL(import.meta.url).pathname, import.meta.url)
    expect(logSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThan(0)
  })
})
