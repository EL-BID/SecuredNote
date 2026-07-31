import "server-only"
import pino from "pino"
import { getDb, closeDb, purgeExpiredNotes, purgeExpiredAttempts } from "./sqliteStore"
import { serverEnv } from "./env"

const logger = pino({ level: serverEnv.LOG_LEVEL })
let started = false

const PURGE_MS = 60_000

function schedulePurge() {
  setInterval(() => {
    try {
      const n = purgeExpiredNotes()
      const a = purgeExpiredAttempts()
      if (n > 0 || a > 0) {
        logger.debug({ notesRemoved: n, attemptsRemoved: a }, "sqlite purge")
      }
    } catch (e) {
      logger.warn({ e }, "SQLite purge failed")
    }
  }, PURGE_MS)
}

export function startSqliteLifecycle() {
  if (started) return
  started = true
  try {
    getDb()
  } catch (e) {
    logger.error({ e }, "SQLite open failed on startup")
    throw e
  }
  schedulePurge()
  const shutdown = () => {
    try {
      closeDb()
    } catch (e) {
      logger.warn({ e }, "SQLite close failed")
    }
  }
  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)
}
