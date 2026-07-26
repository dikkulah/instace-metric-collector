#!/usr/bin/env bash
# Shared friendly output for Makefile targets.

if [[ -t 1 ]]; then
  MAKE_BOLD='\033[1m'
  MAKE_DIM='\033[2m'
  MAKE_GREEN='\033[32m'
  MAKE_CYAN='\033[36m'
  MAKE_YELLOW='\033[33m'
  MAKE_BLUE='\033[34m'
  MAKE_RESET='\033[0m'
else
  MAKE_BOLD='' MAKE_DIM='' MAKE_GREEN='' MAKE_CYAN='' MAKE_YELLOW='' MAKE_BLUE='' MAKE_RESET=''
fi

make_banner() {
  local title="$1"
  shift
  echo ""
  echo -e "${MAKE_BOLD}${MAKE_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${MAKE_RESET}"
  echo -e "${MAKE_BOLD}  ${title}${MAKE_RESET}"
  echo -e "${MAKE_BOLD}${MAKE_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${MAKE_RESET}"
  while [[ $# -ge 2 ]]; do
    local label="$1"
    local url="$2"
    shift 2
    echo -e "  ${MAKE_DIM}${label}:${MAKE_RESET} ${MAKE_BLUE}${url}${MAKE_RESET}"
  done
  echo ""
}

make_step() {
  echo ""
  echo -e "${MAKE_BOLD}${MAKE_YELLOW}▶${MAKE_RESET} ${MAKE_BOLD}$1${MAKE_RESET}"
}

make_ok() {
  echo -e "${MAKE_GREEN}✓${MAKE_RESET} $1"
}

make_info() {
  echo -e "${MAKE_DIM}  $1${MAKE_RESET}"
}

make_hint() {
  echo -e "${MAKE_DIM}  Tip: $1${MAKE_RESET}"
}
