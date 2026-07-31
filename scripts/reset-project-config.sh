#!/usr/bin/env bash
# Reset the instance setup wizard by deleting the project_config row in SQLite.
# Requires a running Docker Compose stack (default) or --local for dev without Docker.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CONTAINER="${COMPOSE_CONTAINER_NAME:-secured-note-app}"
SQLITE_PATH="${SQLITE_PATH:-/data/secured-note.db}"
SERVICE="${COMPOSE_SERVICE_NAME:-app}"
MODE="docker"

usage() {
  cat <<'EOF'
Usage: scripts/reset-project-config.sh [OPTIONS]

Delete the project_config row so the setup wizard appears again on next visit.

Options:
  --local       Use sqlite3 on the host against SQLITE_PATH (dev without Docker)
  --dry-run     Show the planned actions without executing them
  -h, --help    Show this help

Environment (from shell or .env in repo root):
  COMPOSE_CONTAINER_NAME   Docker container name (default: secured-note-app)
  SQLITE_PATH              SQLite file path (default: /data/secured-note.db)
  COMPOSE_SERVICE_NAME     Compose service to restart (default: app)

After reset, restart the app so in-memory state reloads. This script restarts
the Compose service automatically in Docker mode.

Examples:
  ./scripts/reset-project-config.sh
  SQLITE_PATH=web/data/secured-note.db ./scripts/reset-project-config.sh --local
EOF
}

load_env() {
  local env_file="$ROOT_DIR/.env"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    CONTAINER="${COMPOSE_CONTAINER_NAME:-$CONTAINER}"
    SQLITE_PATH="${SQLITE_PATH:-$SQLITE_PATH}"
  fi
}

run_or_echo() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

reset_sql_docker() {
  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "Error: container '$CONTAINER' is not running." >&2
    echo "Start the stack from $ROOT_DIR: docker compose up -d" >&2
    exit 1
  fi

  if docker exec "$CONTAINER" sh -c "command -v sqlite3 >/dev/null 2>&1"; then
    echo "Deleting project_config row in $CONTAINER ($SQLITE_PATH) via sqlite3..."
    run_or_echo docker exec "$CONTAINER" sqlite3 "$SQLITE_PATH" \
      "DELETE FROM project_config WHERE id = 1;"
  else
    echo "Deleting project_config row in $CONTAINER ($SQLITE_PATH) via node..."
    run_or_echo docker exec "$CONTAINER" node -e "
      const Database = require('better-sqlite3');
      const path = process.env.SQLITE_PATH || '$SQLITE_PATH';
      const db = new Database(path);
      const r = db.prepare('DELETE FROM project_config WHERE id = 1').run();
      console.log('deleted rows:', r.changes);
    "
  fi

  echo "Restarting Compose service '$SERVICE'..."
  run_or_echo docker compose -f "$ROOT_DIR/docker-compose.yml" restart "$SERVICE"
}

reset_sql_local() {
  if [[ ! -f "$SQLITE_PATH" ]]; then
    echo "Error: SQLite file not found: $SQLITE_PATH" >&2
    exit 1
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "Error: sqlite3 not found on host. Install sqlite3 or use Docker mode." >&2
    exit 1
  fi

  echo "Deleting project_config row in $SQLITE_PATH (local)..."
  run_or_echo sqlite3 "$SQLITE_PATH" "DELETE FROM project_config WHERE id = 1;"
  echo "Restart your dev server (pnpm dev) so the app reloads configuration."
}

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) MODE="local"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

load_env

case "$MODE" in
  docker) reset_sql_docker ;;
  local) reset_sql_local ;;
esac

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. No changes were made."
else
  echo "Done. Open the app in a fresh browser session; the setup wizard should appear."
fi
