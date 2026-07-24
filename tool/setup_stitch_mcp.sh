#!/usr/bin/env bash
# One-time Stitch MCP setup for Cursor (API key — no gcloud required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="${HOME}/.config/instance-metric-collector/stitch_api_key"
FARABI_KEY="${HOME}/.config/farabi/stitch_api_key"
MCP_JSON="${ROOT}/.cursor/mcp.json"

echo "=== Instance Metric Collector — Stitch MCP kurulumu ==="
echo ""

if [[ -f "$FARABI_KEY" && -z "${1:-}" ]]; then
  echo "Farabi Stitch key bulundu: $FARABI_KEY"
  echo "Bu key paylaşımlı kullanılabilir (ekstra kurulum gerekmez)."
  echo ""
  read -r -p "Aynı key'i kullan? [Y/n] " USE_FARABI
  if [[ "${USE_FARABI:-Y}" =~ ^[Yy]$|^$ ]]; then
    mkdir -p "$(dirname "$KEY_FILE")"
    cp "$FARABI_KEY" "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "✓ Key kopyalandı: $KEY_FILE"
    export STITCH_API_KEY="$(<"$KEY_FILE")"
  fi
fi

if [[ ! -f "$KEY_FILE" ]]; then
  echo "1) https://stitch.withgoogle.com → Settings → API Keys"
  echo "2) Yeni key oluştur ve kopyala"
  echo ""
  if [[ "${1:-}" != "" ]]; then
    API_KEY="$1"
  else
    read -r -s -p "Stitch API key'i yapıştır (görünmez): " API_KEY
    echo ""
  fi
  if [[ -z "${API_KEY// }" ]]; then
    echo "Hata: API key boş." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$KEY_FILE")"
  printf '%s' "$API_KEY" >"$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "✓ Key kaydedildi: $KEY_FILE (chmod 600)"
  export STITCH_API_KEY="$API_KEY"
fi

if [[ -z "${STITCH_API_KEY:-}" && -f "$KEY_FILE" ]]; then
  export STITCH_API_KEY="$(<"$KEY_FILE")"
fi

echo ""
echo "Bağlantı testi..."
if npx -y @_davideast/stitch-mcp@latest tool list_projects -d '{}' >/dev/null 2>&1; then
  echo "✓ Stitch API yanıt verdi"
else
  echo "⚠ API testi başarısız — key veya kota kontrol et"
fi

if ! grep -q 'run_stitch_mcp.sh' "$MCP_JSON" 2>/dev/null; then
  echo ""
  echo "⚠ .cursor/mcp.json içinde stitch girişi eksik."
fi

echo ""
echo "Sonraki adımlar:"
echo "  1. Cursor → Cmd+Shift+P → Developer: Reload Window"
echo "  2. Settings → MCP → stitch yeşil olmalı"
echo "  3. Chat: \"Stitch project 3503001314210425983 — Containers v2 ekranını güncelle\""
echo ""
echo "OAuth alternatifi: npx @_davideast/stitch-mcp init -c cursor"
