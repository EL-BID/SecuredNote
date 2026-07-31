#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = path.resolve(webRoot, "..")
const vitestLcov = path.join(webRoot, "coverage", "lcov.info")
const webSonarLcov = path.join(webRoot, "lcov.info")
const rootSonarLcov = path.join(repoRoot, "lcov.info")
const defaultRoots = Object.freeze({ repoRoot, webRoot })

export const normalizeSourceFile = (inputPath, roots) => {
  const resolvedRoots = roots ?? defaultRoots
  const normalized = inputPath.trim().replaceAll("\\", "/")

  if (!normalized) {
    return normalized
  }

  if (normalized.startsWith("web/")) {
    return normalized
  }

  if (path.isAbsolute(normalized)) {
    const relativeToRepo = path
      .relative(resolvedRoots.repoRoot, normalized)
      .replaceAll("\\", "/")
    if (!relativeToRepo.startsWith("..")) {
      return relativeToRepo
    }

    const relativeToWeb = path
      .relative(resolvedRoots.webRoot, normalized)
      .replaceAll("\\", "/")
    if (!relativeToWeb.startsWith("..")) {
      return `web/${relativeToWeb}`
    }
  }

  if (normalized.startsWith("./web/")) {
    return normalized.slice(2)
  }

  if (normalized.startsWith("./")) {
    return `web/${normalized.slice(2)}`
  }

  return `web/${normalized}`
}

export function fixLcovForSonar({
  vitestLcov: inputPath = vitestLcov,
  webSonarLcov: webOutputPath = webSonarLcov,
  rootSonarLcov: rootOutputPath = rootSonarLcov,
  repoRoot: repoRootOverride = repoRoot,
  webRoot: webRootOverride = webRoot,
} = {}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`fix-lcov-for-sonar: missing ${inputPath}`)
  }

  let rewrittenCount = 0
  const fixed = fs
    .readFileSync(inputPath, "utf8")
    .split("\n")
    .map((line) => {
      if (!line.startsWith("SF:")) {
        return line
      }

      const sourceFile = line.slice(3)
      const nextPath = normalizeSourceFile(sourceFile, {
        repoRoot: repoRootOverride,
        webRoot: webRootOverride,
      })
      if (nextPath !== sourceFile) {
        rewrittenCount += 1
      }
      return `SF:${nextPath}`
    })
    .join("\n")

  fs.writeFileSync(webOutputPath, fixed)
  fs.writeFileSync(rootOutputPath, fixed)

  return {
    fixed,
    rewrittenCount,
    webSonarLcov: webOutputPath,
    rootSonarLcov: rootOutputPath,
  }
}

export function runFixLcovCli({
  run = fixLcovForSonar,
  log = console.log,
  logError = console.error,
  exit = process.exit,
} = {}) {
  try {
    const result = run()
    log(
      `fix-lcov-for-sonar: wrote ${result.webSonarLcov} and ${result.rootSonarLcov} (${result.fixed.split("\n").length} lines, ${result.rewrittenCount} rewritten paths)`
    )
  } catch (error_) {
    logError(error_ instanceof Error ? error_.message : String(error_))
    exit(1)
  }
}

export function maybeRunFixLcovCli(argv1 = process.argv[1], moduleUrl = import.meta.url) {
  if (argv1 === fileURLToPath(moduleUrl)) {
    runFixLcovCli()
  }
}

maybeRunFixLcovCli()
