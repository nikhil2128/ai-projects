#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

check_command() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is required but not installed."
    exit 1
  fi
}

usage() {
  cat <<EOF
${CYAN}Matrimonial App - Local Development${NC}

Usage: ./dev.sh [command]

Commands:
  up        Start all services (PostgreSQL + backend + frontend) via Docker
  down      Stop all services and remove containers
  logs      Tail logs from all services
  native    Run backend & frontend natively (requires local PostgreSQL)
  db        Start only PostgreSQL in Docker
  reset     Stop everything and wipe the database volume
  help      Show this help message

If no command is given, defaults to 'up'.
EOF
}

cmd_up() {
  check_command docker
  info "Starting all services with Docker Compose..."
  docker compose up --build -d
  echo ""
  ok "Services are starting up!"
  echo -e "  ${CYAN}Frontend:${NC}  http://localhost:5180"
  echo -e "  ${CYAN}Backend:${NC}   http://localhost:3100"
  echo -e "  ${CYAN}Database:${NC}  postgresql://postgres:postgres@localhost:5432/matrimonial"
  echo ""
  info "Run './dev.sh logs' to see logs, './dev.sh down' to stop."
}

cmd_down() {
  check_command docker
  info "Stopping all services..."
  docker compose down
  ok "All services stopped."
}

cmd_logs() {
  check_command docker
  docker compose logs -f
}

cmd_native() {
  check_command node
  check_command npm

  if [ ! -f backend/.env ]; then
    if [ -f backend/.env.example ]; then
      cp backend/.env.example backend/.env
      ok "Created backend/.env from .env.example"
    else
      warn "No backend/.env found. Using defaults (localhost PostgreSQL)."
    fi
  fi

  info "Installing dependencies..."
  (cd backend && npm install) &
  (cd frontend && npm install) &
  wait
  ok "Dependencies installed."

  info "Starting backend and frontend..."
  npm run dev
}

cmd_db() {
  check_command docker
  info "Starting PostgreSQL..."
  docker compose up db -d
  ok "PostgreSQL running at localhost:5432"
  echo -e "  ${CYAN}Connection:${NC} postgres://postgres:postgres@localhost:5432/matrimonial"
}

cmd_reset() {
  check_command docker
  warn "This will destroy all database data. Continue? (y/N)"
  read -r confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    docker compose down -v
    ok "All services stopped and volumes removed."
  else
    info "Cancelled."
  fi
}

case "${1:-up}" in
  up)     cmd_up     ;;
  down)   cmd_down   ;;
  logs)   cmd_logs   ;;
  native) cmd_native ;;
  db)     cmd_db     ;;
  reset)  cmd_reset  ;;
  help|-h|--help) usage ;;
  *)
    error "Unknown command: $1"
    usage
    exit 1
    ;;
esac
