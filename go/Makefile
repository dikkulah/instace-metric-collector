.PHONY: build test clean ui-install ui-build ui-sync-dist ui-e2e ui-e2e-update run-hub run-agent release release-binaries release-checksums

GO := go
BIN_DIR := bin
DIST_DIR := dist
FRONTEND_DIR := web/frontend
WEBUI_DIST := internal/webui/dist
HELPERS := ../tool/make_helpers.sh
VERSION ?= dev
LDFLAGS := -s -w
# linux/amd64 linux/arm64 darwin/arm64 windows/amd64
RELEASE_PLATFORMS := linux:amd64 linux:arm64 darwin:arm64 windows:amd64

build: ui-sync-dist
	@bash -c 'source $(HELPERS) && make_step "Compiling Go binaries (agent + hub)"'
	@mkdir -p $(BIN_DIR)
	@$(GO) build -o $(BIN_DIR)/agent ./cmd/agent
	@$(GO) build -o $(BIN_DIR)/hub ./cmd/hub
	@bash -c 'source $(HELPERS) && make_ok "Binaries ready → go/bin/agent, go/bin/hub"'

run-hub: build
	@chmod +x ../tool/run_hub.sh ../tool/kill_port.sh 2>/dev/null || true
	@bash ../tool/run_hub.sh

run-agent: build
	@chmod +x ../tool/run_agent.sh ../tool/kill_port.sh 2>/dev/null || true
	@bash ../tool/run_agent.sh

test: ui-sync-dist
	@bash -c 'source $(HELPERS) && make_step "Running Go unit tests"'
	@$(GO) test ./...
	@bash -c 'source $(HELPERS) && make_ok "All tests passed"'

ui-install:
	@bash -c 'source $(HELPERS) && make_step "Installing UI dependencies (npm ci)"'
	@cd $(FRONTEND_DIR) && npm ci --no-fund --no-audit --loglevel=warn
	@bash -c 'source $(HELPERS) && make_ok "UI dependencies installed"'

ui-build:
	@bash -c 'source $(HELPERS) && make_step "Building React UI (vite)"'
	@cd $(FRONTEND_DIR) && npm run build
	@bash -c 'source $(HELPERS) && make_ok "UI built → web/frontend/dist"'

ui-sync-dist: ui-install ui-build
	@bash -c 'source $(HELPERS) && make_step "Embedding UI for Go binaries"'
	@rm -rf $(WEBUI_DIST)
	@mkdir -p $(WEBUI_DIST)
	@cp -R $(FRONTEND_DIR)/dist/. $(WEBUI_DIST)/
	@bash -c 'source $(HELPERS) && make_ok "UI embedded → internal/webui/dist"'

ui-e2e: ui-sync-dist
	@bash -c 'source $(HELPERS) && make_step "Running Playwright e2e tests"'
	@cd $(FRONTEND_DIR) && npm run test:e2e

ui-e2e-hub: ui-sync-dist
	@bash -c 'source $(HELPERS) && make_step "Running Playwright hub e2e tests"'
	@cd $(FRONTEND_DIR) && npm run test:e2e:hub

ui-e2e-update: ui-sync-dist
	@bash -c 'source $(HELPERS) && make_step "Updating Playwright snapshots"'
	@cd $(FRONTEND_DIR) && npm run test:e2e:update

clean:
	@bash -c 'source $(HELPERS) && make_step "Cleaning build artifacts"'
	@rm -rf $(BIN_DIR) $(DIST_DIR) $(WEBUI_DIST) $(FRONTEND_DIR)/dist
	@bash -c 'source $(HELPERS) && make_ok "Clean complete"'

# Cross-compile outpost-agent and outpost-hub for release (requires ui-sync-dist first).
release: ui-sync-dist release-binaries release-checksums
	@bash -c 'source $(HELPERS) && make_ok "Release artifacts → go/$(DIST_DIR)/"'

release-binaries:
	@bash -c 'source $(HELPERS) && make_step "Cross-compiling release binaries (VERSION=$(VERSION))"'
	@rm -rf $(DIST_DIR) && mkdir -p $(DIST_DIR)
	@set -e; \
	for plat in $(RELEASE_PLATFORMS); do \
		os=$${plat%%:*}; arch=$${plat##*:}; \
		suffix="_$${os}-$${arch}"; \
		agent="outpost-agent$${suffix}"; hub="outpost-hub$${suffix}"; \
		if [ "$$os" = "windows" ]; then agent="$${agent}.exe"; hub="$${hub}.exe"; fi; \
		echo "  $$os/$$arch"; \
		GOOS=$$os GOARCH=$$arch CGO_ENABLED=0 $(GO) build -ldflags "$(LDFLAGS)" -o "$(DIST_DIR)/$$agent" ./cmd/agent; \
		GOOS=$$os GOARCH=$$arch CGO_ENABLED=0 $(GO) build -ldflags "$(LDFLAGS)" -o "$(DIST_DIR)/$$hub" ./cmd/hub; \
	done
	@bash -c 'source $(HELPERS) && make_ok "Binaries written to go/$(DIST_DIR)/"'

release-checksums:
	@bash -c 'source $(HELPERS) && make_step "Writing SHA256 checksums"'
	@test -d $(DIST_DIR) || (echo "missing $(DIST_DIR); run make release-binaries first" && exit 1)
	@cd $(DIST_DIR) && (command -v sha256sum >/dev/null && sha256sum outpost-* > checksums.txt || shasum -a 256 outpost-* > checksums.txt)
	@bash -c 'source $(HELPERS) && make_ok "Checksums → go/$(DIST_DIR)/checksums.txt"'
