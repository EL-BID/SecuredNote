import "server-only"
import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { serverEnv as env } from "./env"

let dbSingleton: Database.Database | null = null

function ensureDirForFile(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
}

export function getDb(): Database.Database {
  if (dbSingleton) return dbSingleton
  ensureDirForFile(env.SQLITE_PATH)
  const db = new Database(env.SQLITE_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("busy_timeout = 5000")

  db.exec(`
    CREATE TABLE IF NOT EXISTS project_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_expires ON notes (expires_at)
      WHERE expires_at IS NOT NULL;

    CREATE TABLE IF NOT EXISTS password_attempts (
      attempt_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `)

  dbSingleton = db
  return db
}

export function closeDb(): void {
  if (dbSingleton) {
    try {
      dbSingleton.close()
    } catch (err) {
      console.warn("SQLite close failed:", err)
    }
    dbSingleton = null
  }
}

export function pingDb(): void {
  getDb().prepare("SELECT 1").get()
}

const nowSec = () => Math.floor(Date.now() / 1000)

export function purgeExpiredNotes(): number {
  const db = getDb()
  const r = db
    .prepare("DELETE FROM notes WHERE expires_at IS NOT NULL AND expires_at <= ?")
    .run(nowSec())
  return r.changes
}

export function purgeExpiredAttempts(): number {
  const db = getDb()
  const r = db
    .prepare("DELETE FROM password_attempts WHERE expires_at <= ?")
    .run(nowSec())
  return r.changes
}

export function getProjectConfigJson(): string | null {
  const row = getDb()
    .prepare("SELECT data FROM project_config WHERE id = 1")
    .get() as { data: string } | undefined
  return row?.data ?? null
}

export function insertProjectConfigIfAbsent(
  json: string,
): { ok: true } | { ok: false; existing: string } {
  const db = getDb()
  const tx = db.transaction(() => {
    const row = db
      .prepare("SELECT data FROM project_config WHERE id = 1")
      .get() as { data: string } | undefined
    if (row) {
      return { conflict: true as const, data: row.data }
    }
    db.prepare("INSERT INTO project_config (id, data) VALUES (1, ?)").run(json)
    return { conflict: false as const }
  })
  const result = tx()
  if (result.conflict) {
    return { ok: false, existing: result.data }
  }
  return { ok: true }
}

export type StoredNoteRow = {
  data: string
  expires_at: number | null
  created_at: number
}

export function insertNote(
  id: string,
  json: string,
  ttlSeconds: number,
  createdAt: number,
): void {
  const expiresAt = ttlSeconds > 0 ? nowSec() + ttlSeconds : null
  getDb()
    .prepare(
      `INSERT INTO notes (id, data, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    )
    .run(id, json, expiresAt, createdAt)
}

export function getNoteRow(id: string): StoredNoteRow | null {
  purgeExpiredNotes()
  const row = getDb()
    .prepare(`SELECT data, expires_at, created_at FROM notes WHERE id = ?`)
    .get(id) as
    | { data: string; expires_at: number | null; created_at: number }
    | undefined
  if (!row) return null
  if (row.expires_at !== null && row.expires_at <= nowSec()) {
    deleteNote(id)
    return null
  }
  return {
    data: row.data,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }
}

export function deleteNote(id: string): void {
  getDb().prepare("DELETE FROM notes WHERE id = ?").run(id)
}

export function getAttemptCount(attemptKey: string): {
  count: number
  ttlLeft: number
} {
  purgeExpiredAttempts()
  const row = getDb()
    .prepare(
      `SELECT count, expires_at FROM password_attempts WHERE attempt_key = ?`,
    )
    .get(attemptKey) as
    | { count: number; expires_at: number }
    | undefined
  if (!row) return { count: 0, ttlLeft: 0 }
  if (row.expires_at <= nowSec()) {
    getDb()
      .prepare("DELETE FROM password_attempts WHERE attempt_key = ?")
      .run(attemptKey)
    return { count: 0, ttlLeft: 0 }
  }
  return {
    count: row.count,
    ttlLeft: Math.max(0, row.expires_at - nowSec()),
  }
}

export function setAttemptCount(
  attemptKey: string,
  count: number,
  lockoutSeconds: number,
): void {
  const exp = nowSec() + lockoutSeconds
  getDb()
    .prepare(
      `INSERT INTO password_attempts (attempt_key, count, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(attempt_key) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at`,
    )
    .run(attemptKey, count, exp)
}

export function clearAttempts(attemptKey: string): void {
  getDb()
    .prepare("DELETE FROM password_attempts WHERE attempt_key = ?")
    .run(attemptKey)
}
