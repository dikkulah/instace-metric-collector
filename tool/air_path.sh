#!/usr/bin/env bash
# Ensure `air` from `go install` is on PATH (GOPATH/bin).
air_on_path() {
  if command -v go >/dev/null 2>&1; then
    local gopath
    gopath="$(go env GOPATH 2>/dev/null || true)"
    if [[ -n "$gopath" ]]; then
      export PATH="${PATH}:${gopath}/bin"
    fi
  fi
  command -v air >/dev/null 2>&1
}

# Ensure embedded SPA matches frontend sources (go:embed reads internal/webui/dist at compile time).
ensure_ui_embedded() {
  local root="$1"
  local dist="$root/go/internal/webui/dist/index.html"
  local frontend="$root/go/web/frontend/src"

  if [[ ! -f "$dist" ]]; then
    make_step "Embedding UI (first run)"
    make -C "$root/go" ui-sync-dist
    return
  fi

  if find "$frontend" -type f -newer "$dist" -print -quit 2>/dev/null | grep -q .; then
    make_step "Frontend changed — rebuilding embedded UI"
    make -C "$root/go" ui-sync-dist
  fi
}
