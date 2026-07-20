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
INDENT="     "
INSET_RULE="${INDENT}-------------------------------------------------------"

banner() {
  echo "${CYAN}------------------------------------------------------------${RESET}"
  echo
  echo "  ${CYAN}■${RESET}  ${BOLD}Trading Journal${RESET} installer"
  echo
  echo "     A local-first trading journal built around the review habit first:"
  echo "     write the recap, see the day in context, and drill into the trade"
  echo "     evidence only when it matters."
  echo
  echo "${CYAN}${INSET_RULE}${RESET}"
}

run_quiet() {
  local label="$1"
  shift
  local status_label="${INDENT}${CYAN}${BOLD}${label}${RESET}${DIM}...${RESET}"

  if [[ -t 1 ]]; then
    local frames=("/" "-" "\\" "|")
    local index=0
    "$@" >"$LOG_FILE" 2>&1 &
    local pid=$!

    printf "\033[?25l"
    printf "%s %s" "$status_label" "${DIM}${frames[$index]}${RESET}"
    while kill -0 "$pid" >/dev/null 2>&1; do
      index=$(((index + 1) % ${#frames[@]}))
      printf "\r%s %s\033[K" "$status_label" "${DIM}${frames[$index]}${RESET}"
      sleep 0.16
    done

    if wait "$pid"; then
      printf "\r%s %s\033[K\033[?25h\n" "$status_label" "${GREEN}done${RESET}"
    else
      printf "\r%s %s\033[K\033[?25h\n\n" "$status_label" "${RED}failed${RESET}"
      echo "The install command failed. Last log lines:"
      echo
      tail -n 80 "$LOG_FILE"
      echo
      echo "Full log: $LOG_FILE"
      exit 1
    fi
  else
    printf "%s" "$status_label"
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
  fi
}

banner
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "${RED}npm was not found.${RESET} Install Node.js 20 or newer first, then run this script again."
  exit 1
fi

run_quiet "Step 1 of 3: Installing dependencies" npm install --no-audit --fund=false

echo "${CYAN}${INSET_RULE}${RESET}"
echo
npm run --silent setup:local

echo
echo "${INDENT}${CYAN}${BOLD}Step 3 of 3: Starting Trading Journal locally${RESET}"
echo
echo "${INDENT}${BOLD}Start and stop${RESET}"
echo "${INDENT}To stop the app: press ${CYAN}Ctrl+C${RESET} in this terminal."
echo "${INDENT}To start it again later: run ${CYAN}npm run --silent dev:start${RESET} from this folder."
echo
npm run --silent dev:start
