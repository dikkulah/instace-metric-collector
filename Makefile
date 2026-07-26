# instance-metric-collector — developer shortcuts. Run `make help` first.
SHELL := /bin/bash
.PHONY: help setup setup-hooks onboard run run-hub dev dev-watch test check ci ci-fast ci-smoke doctor docker-build docker-up docker-down docker-smoke ui-install ui-build ui-visual-serve ui-visual-routes ui-visual-stop ui-e2e ui-e2e-hub ui-e2e-update build release clean

help:
	@echo "instance-metric-collector — common targets"
	@echo ""
	@echo "  make onboard      First-time setup (deps, hooks, optional smoke)"
	@echo "  make setup        Build agent binary (includes UI)"
	@echo "  make setup-hooks  Enable pre-push hook (go test)"
	@echo "  make run          Start Go agent with UI on :8080"
	@echo "  make run-hub      Start Go hub with UI on :8081"
	@echo "  make dev          Hub + push agent (operator UI on :8081)"
	@echo "  make dev-watch    Hot reload: Vite :5173 + hub/agent (install air for Go reload)"
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
	@echo "  make ui-visual-serve   DEMO_MODE agent on :18081 for visual tests"
	@echo "  make ui-visual-routes  Print visual test URLs"
	@echo "  make ui-e2e       Playwright visual/interaction tests"
	@echo "  make build        Build agent + hub binaries (includes ui-build)"
	@echo "  make release      Cross-compile outpost-agent/hub (VERSION= tag)"
	@echo "  make clean        Remove generated bin/, dist/, node_modules/"
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
	@chmod +x tool/run_agent.sh tool/kill_port.sh 2>/dev/null || true
	@bash tool/run_agent.sh

run-hub: build
	@chmod +x tool/run_hub.sh tool/kill_port.sh 2>/dev/null || true
	@bash tool/run_hub.sh

dev: build
	@chmod +x tool/dev_stack.sh tool/kill_port.sh 2>/dev/null || true
	@bash tool/dev_stack.sh

dev-watch:
	@chmod +x tool/dev_watch.sh tool/kill_port.sh 2>/dev/null || true
	@bash tool/dev_watch.sh

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

ui-visual-serve:
	chmod +x tool/visual/serve.sh tool/visual/capture.sh 2>/dev/null || true
	bash tool/visual/serve.sh

ui-visual-routes:
	chmod +x tool/visual/capture.sh 2>/dev/null || true
	bash tool/visual/capture.sh --routes-only

ui-visual-stop:
	chmod +x tool/visual/stop.sh 2>/dev/null || true
	bash tool/visual/stop.sh

ui-e2e:
	$(MAKE) -C go ui-e2e

ui-e2e-hub:
	$(MAKE) -C go ui-e2e-hub

ui-e2e-update:
	$(MAKE) -C go ui-e2e-update

build:
	@bash -c 'source tool/make_helpers.sh && make_banner "Building instance-metric-collector"'
	@$(MAKE) -C go build

release:
	@$(MAKE) -C go release VERSION=$(VERSION)

clean:
	$(MAKE) -C go clean
