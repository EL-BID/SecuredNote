import "server-only"
import path from "node:path"
import { z } from "zod"

const schema = z.object({
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SQLITE_PATH: z
    .string()
    .min(1)
    .default(path.join(process.cwd(), "data", "secured-note.db")),
  HSTS_MAX_AGE_SECONDS: z
    .coerce.number()
    .int()
    .min(0)
    .max(63072000)
    .default(31536000),
  HSTS_PRELOAD: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),
  GIT_SHA: z.string().default("dev"),
})

export type ServerEnv = z.infer<typeof schema>
export const serverEnv: ServerEnv = schema.parse({
  ...process.env,
  GIT_SHA: process.env.GIT_SHA || "dev",
})
