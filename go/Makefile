.PHONY: build test clean ui-install ui-build ui-sync-dist

GO := go
BIN_DIR := bin
FRONTEND_DIR := web/frontend
WEBUI_DIST := internal/webui/dist

build: ui-sync-dist
	mkdir -p $(BIN_DIR)
	$(GO) build -o $(BIN_DIR)/agent ./cmd/agent
	$(GO) build -o $(BIN_DIR)/hub ./cmd/hub

test:
	$(GO) test ./...

ui-install:
	cd $(FRONTEND_DIR) && npm ci

ui-build:
	cd $(FRONTEND_DIR) && npm run build

ui-sync-dist: ui-build
	rm -rf $(WEBUI_DIST)
	mkdir -p $(WEBUI_DIST)
	cp -R $(FRONTEND_DIR)/dist/. $(WEBUI_DIST)/

clean:
	rm -rf $(BIN_DIR) $(WEBUI_DIST) $(FRONTEND_DIR)/dist
