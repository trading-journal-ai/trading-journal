#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -t 1 ]]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  GREEN="$(printf '\033[32m')"
  BLUE="$(printf '\033[34m')"
  RED="$(printf '\033[31m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""
  DIM=""
  GREEN=""
  BLUE=""
  RED=""
  RESET=""
fi

LOG_FILE=".install-trading-journal.log"

run_quiet() {
  local label="$1"
  shift

  printf "%s" "${DIM}${label}...${RESET}"
  if "$@" >"$LOG_FILE" 2>&1; then
    printf " %s\n" "${GREEN}done${RESET}"
  else
    printf " %s\n\n" "${RED}failed${RESET}"
    echo "The install command failed. Last log lines:"
    echo
    tail -n 80 "$LOG_FILE"
    echo
    echo "Full log: $LOG_FILE"
    exit 1
  fi
}

echo "${BOLD}Trading Journal${RESET}"
echo "${DIM}Local installer${RESET}"
echo
echo "This installs project dependencies and sets up a local database inside this folder."
echo "It does not install anything globally."
echo "You can safely rerun this installer later."
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js 20 or newer first, then run this script again."
  exit 1
fi

run_quiet "Step 1 of 3: Installing dependencies" npm install --no-audit --fund=false

echo
echo "${BLUE}Setup${RESET}"
npm run --silent setup:local

echo
echo "${GREEN}Step 3 of 3: Starting Trading Journal locally${RESET}"
npm run dev
