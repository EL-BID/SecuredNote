export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSqliteLifecycle } = await import("./lib/server/lifecycle")
    startSqliteLifecycle()
  }
}
