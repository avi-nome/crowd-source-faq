#!/bin/bash
# ============================================================
# Yaksha FAQ Portal — Full Stack Runner
# Usage: ./run.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR"

FONT="\033[94m"
OK="\033[92m"
WARN="\033[93m"
ERROR="\033[91m"
RESET="\033[0m"

log()  { echo -e "${FONT}[yaksha]${RESET} $1"; }
ok()   { echo -e "${OK}[✔]${RESET} $1"; }
warn() { echo -e "${WARN}[!]${RESET} $1"; }
die()  { echo -e "${ERROR}[✘]${RESET} $1" >&2; exit 1; }

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  warn "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
  ok "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Check backend health ────────────────────────────────────
wait_for_backend() {
  local max_wait=20
  local waited=0
  log "Waiting for backend to be ready..."
  while [ $waited -lt $max_wait ]; do
    local status=$(curl -sf --max-time 2 http://localhost:6767/api/health 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('db','?'))" 2>/dev/null || echo "waiting")
    if [ "$status" = "connected" ]; then
      ok "MongoDB connected"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
    echo -n "."
  done
  warn "Backend DB not connected after ${max_wait}s — continuing anyway"
}

# ── Start backend ──────────────────────────────────────────
start_backend() {
  log "Starting backend..."
  cd "$ROOT/backend"
  npm run dev &
  BACKEND_PID=$!
  ok "Backend PID $BACKEND_PID"
}

# ── Start frontend ─────────────────────────────────────────
start_frontend() {
  log "Starting frontend..."
  cd "$ROOT/frontend"
  npm run dev &
  FRONTEND_PID=$!
  ok "Frontend PID $FRONTEND_PID"
}

# ── Check and kill existing processes ──────────────────────────
kill_existing() {
  local killed=0
  for port in 5173 6767; do
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      warn "Killing existing process on port $port (PID $pid)"
      kill -9 $pid 2>/dev/null || true
      killed=1
    fi
  done
  [ $killed -eq 1 ] && sleep 1 && ok "Cleared."
}

check_url_alive() {
  curl -sf --max-time 2 http://localhost:5173 > /dev/null 2>&1
}

# ── Main ───────────────────────────────────────────────────
echo ""
log "Yaksha FAQ Portal"
echo ""

if check_url_alive; then
  warn "Frontend already live on 5173 — clearing ports"
  kill_existing
else
  ok "Port 5173 is free"
fi

start_backend
wait_for_backend
start_frontend

echo ""
ok "Backend  →  http://localhost:6767"
ok "Frontend →  http://localhost:5173"
echo ""
log "Press Ctrl+C to stop"
echo ""

# Wait indefinitely (scripts run in background)
wait
