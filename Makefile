# instance-metric-collector — developer shortcuts. Run `make help` first.
SHELL := /bin/bash
.PHONY: help setup setup-hooks onboard run run-hub test check ci ci-fast ci-smoke doctor docker-build docker-up docker-down docker-smoke

help:
	@echo "instance-metric-collector — common targets"
	@echo ""
	@echo "  make onboard      First-time setup (deps, hooks, optional smoke)"
	@echo "  make setup        Resolve Maven dependencies (package, skip tests)"
	@echo "  make setup-hooks  Enable pre-push hook (mvn test)"
	@echo "  make run          Start Spring Boot app"
	@echo "  make run-hub      Start with hub mode (local agent in /hub.html)"
	@echo "  make test         Run unit tests"
	@echo "  make check        Same as test"
	@echo "  make ci-fast      Local CI — unit tests only (~1 min)"
	@echo "  make ci-smoke     Local CI — tests + smoke run (~2 min)"
	@echo "  make doctor       Check Java 21 and Maven wrapper"
	@echo "  make docker-build Build Docker image"
	@echo "  make docker-up    docker compose up -d --build"
	@echo "  make docker-down  docker compose down"
	@echo "  make docker-smoke Build + run container smoke test"
	@echo ""
	@echo "Examples:"
	@echo "  make onboard"
	@echo "  PROFILE=app make onboard"
	@echo "  make ci-fast"

setup:
	chmod +x tool/ensure_dev_requirements.sh 2>/dev/null || true
	bash tool/ensure_dev_requirements.sh --check
	./mvnw -B -q -DskipTests package

setup-hooks:
	chmod +x tool/setup_git_hooks.sh tool/git_hooks/pre-push 2>/dev/null || true
	bash tool/setup_git_hooks.sh

onboard:
	chmod +x tool/onboard.sh tool/ensure_dev_requirements.sh 2>/dev/null || true
	./tool/onboard.sh

run: setup
	./mvnw spring-boot:run

run-hub: setup
	./mvnw spring-boot:run -Dspring-boot.run.arguments="--metrics.hub.enabled=true --metrics.collection.interval=5000"

test:
	./mvnw -B test

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
