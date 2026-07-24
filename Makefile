# instance-metric-collector — developer shortcuts. Run `make help` first.
SHELL := /bin/bash
.PHONY: help setup setup-hooks onboard run run-hub test check ci ci-fast ci-smoke doctor docker-build docker-up docker-down docker-smoke ui-install ui-build build

help:
	@echo "instance-metric-collector — common targets"
	@echo ""
	@echo "  make onboard      First-time setup (deps, hooks, optional smoke)"
	@echo "  make setup        Build agent binary (includes UI)"
	@echo "  make setup-hooks  Enable pre-push hook (go test)"
	@echo "  make run          Start Go agent with UI on :8080"
	@echo "  make run-hub      Start Go hub with UI on :8081"
	@echo "  make test         Run Go unit tests"
	@echo "  make check        Same as test"
	@echo "  make ci-fast      Local CI — unit tests only (~1 min)"
	@echo "  make ci-smoke     Local CI — tests + smoke run (~2 min)"
	@echo "  make doctor       Check Go, Node, and optional Docker"
	@echo "  make docker-build Build Docker image"
	@echo "  make docker-up    docker compose up -d --build"
	@echo "  make docker-down  docker compose down"
	@echo "  make docker-smoke Build + run container smoke test"
	@echo ""
	@echo "  make ui-install   npm ci in go/web/frontend"
	@echo "  make ui-build     Build React SPA into go/internal/webui/dist"
	@echo "  make build        Build agent + hub binaries (includes ui-build)"
	@echo ""
	@echo "Examples:"
	@echo "  make onboard"
	@echo "  PROFILE=app make onboard"
	@echo "  make ci-fast"

setup: build

setup-hooks:
	chmod +x tool/setup_git_hooks.sh tool/git_hooks/pre-push 2>/dev/null || true
	bash tool/setup_git_hooks.sh

onboard:
	chmod +x tool/onboard.sh tool/ensure_dev_requirements.sh 2>/dev/null || true
	./tool/onboard.sh

run: build
	METRICS_COLLECTION_INTERVAL=5000 METRICS_UI_ENABLED=true SERVER_PORT=8080 ./go/bin/agent

run-hub: build
	METRICS_COLLECTION_INTERVAL=5000 METRICS_UI_ENABLED=true SERVER_PORT=8081 ./go/bin/hub

test:
	$(MAKE) -C go test

check: test

ci-fast:
	chmod +x tool/ci_local.sh 2>/dev/null || true
	bash tool/ci_local.sh --fast

ci-smoke:
	chmod +x tool/ci_local.sh tool/smoke_local.sh 2>/dev/null || true
	bash tool/ci_local.sh

ci: ci-smoke

doctor:
	chmod +x tool/ensure_dev_requirements.sh 2>/dev/null || true
	bash tool/ensure_dev_requirements.sh --check

docker-build:
	docker compose build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-smoke:
	chmod +x tool/docker_smoke.sh 2>/dev/null || true
	bash tool/docker_smoke.sh

ui-install:
	$(MAKE) -C go ui-install

ui-build:
	$(MAKE) -C go ui-build

build:
	$(MAKE) -C go build
