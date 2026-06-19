#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -t 1 ]]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  GREEN="$(printf '\033[32m')"
  CYAN="$(printf '\033[36m')"
  BLUE="$(printf '\033[34m')"
  RED="$(printf '\033[31m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""
  DIM=""
  GREEN=""
  CYAN=""
  BLUE=""
  RED=""
  RESET=""
fi

LOG_FILE=".install-trading-journal.log"

banner() {
  echo "${CYAN}------------------------------------------------------------${RESET}"
  echo "  ${CYAN}■${RESET}  ${CYAN}${BOLD}Trading Journal${RESET} ${DIM}installer${RESET}"
  echo
  echo "     ${DIM}A local-first trading journal built around the review habit first:${RESET}"
  echo "     ${DIM}write the recap, see the day in context, and drill into the trade${RESET}"
  echo "     ${DIM}evidence only when it matters.${RESET}"
  echo "${CYAN}------------------------------------------------------------${RESET}"
}

run_quiet() {
  local label="$1"
  shift

  printf "%s" "${CYAN}${BOLD}${label}${RESET}${DIM}...${RESET}"
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

banner
echo
echo "  Installs project dependencies"
echo "  Sets up a local database inside this folder"
echo "  Safe to rerun later"
echo
echo "${CYAN}------------------------------------------------------------${RESET}"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "${RED}npm was not found.${RESET} Install Node.js 20 or newer first, then run this script again."
  exit 1
fi

run_quiet "Step 1 of 3: Installing dependencies" npm install --no-audit --fund=false

echo
echo "${BLUE}${BOLD}Setup${RESET}"
npm run --silent setup:local

echo
echo "${CYAN}${BOLD}Step 3 of 3: Starting Trading Journal locally${RESET}"
echo "Local app: ${BLUE}http://localhost:3000${RESET}"
echo "${DIM}If port 3000 is already in use, Next.js will print the available localhost URL below.${RESET}"
echo
echo "${BOLD}Start and stop${RESET}"
echo "  To stop the app: press ${CYAN}Ctrl+C${RESET} in this terminal."
echo "  To start it again later: run ${CYAN}npm run dev${RESET} from this folder."
echo
npm run dev
