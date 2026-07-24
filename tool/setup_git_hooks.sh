#!/usr/bin/env bash
# Point this repo at shared git hooks under tool/git_hooks/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x tool/git_hooks/pre-push
git config core.hooksPath tool/git_hooks
echo "Git hooks enabled (core.hooksPath=tool/git_hooks)"
echo "Pre-push runs: make -C go test"
