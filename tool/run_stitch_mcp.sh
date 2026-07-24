#!/usr/bin/env bash
# MCP wrapper: loads Stitch API key then starts @_davideast/stitch-mcp proxy.
set -euo pipefail

PROJECT_KEY="${HOME}/.config/instance-metric-collector/stitch_api_key"
FARABI_KEY="${HOME}/.config/farabi/stitch_api_key"

if [[ -z "${STITCH_API_KEY:-}" ]]; then
  if [[ -f "$PROJECT_KEY" ]]; then
    STITCH_API_KEY="$(<"$PROJECT_KEY")"
  elif [[ -f "$FARABI_KEY" ]]; then
    STITCH_API_KEY="$(<"$FARABI_KEY")"
  fi
  export STITCH_API_KEY
fi

if [[ -z "${STITCH_API_KEY:-}" ]]; then
  echo "stitch-mcp: STITCH_API_KEY yok." >&2
  echo "  ./tool/setup_stitch_mcp.sh" >&2
  echo "  veya Farabi key: ~/.config/farabi/stitch_api_key" >&2
  echo "  veya: export STITCH_API_KEY=\"...\"" >&2
  exit 1
fi

exec npx -y @_davideast/stitch-mcp@latest proxy
