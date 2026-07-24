# Multi-stage build — Go agent + embedded React SPA
FROM node:22-bookworm-slim AS ui
WORKDIR /app
COPY go/web/frontend/package.json go/web/frontend/package-lock.json ./go/web/frontend/
RUN cd go/web/frontend && npm ci
COPY go/web/frontend ./go/web/frontend
RUN cd go/web/frontend && npm run build

FROM golang:1.22-bookworm AS build
WORKDIR /app
COPY go/go.mod go/go.sum ./go/
WORKDIR /app/go
RUN go mod download
COPY go/ ./
COPY --from=ui /app/go/web/frontend/dist ./internal/webui/dist
RUN mkdir -p bin && go build -o bin/agent ./cmd/agent && go build -o bin/hub ./cmd/hub

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl procps \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/go/bin/agent /app/agent
EXPOSE 8080
ENV SERVER_PORT=8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8080/api/metrics/config >/dev/null || exit 1
ENTRYPOINT ["/app/agent"]
