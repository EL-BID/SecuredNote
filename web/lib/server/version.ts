import "server-only"
import { serverEnv } from "./env"

export const appVersionInfo = {
  name: "secured-note",
  version: "1.0.0",
  gitSha: serverEnv.GIT_SHA,
}
