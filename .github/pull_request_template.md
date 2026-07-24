## Summary

<!-- What changed and why (1–3 bullets) -->

## Test plan

- [ ] `make ci-fast` (development PRs)
- [ ] `make ci-smoke` (merge to `main` / milestone PRs)
- [ ] Council veto check — no V1–V20 violations ([`docs/VETO_REGISTRY.md`](docs/VETO_REGISTRY.md))
- [ ] UI strings: locale JSON only (`static/locales/`) — no hardcoded labels (V20)
- [ ] New collector logic has unit tests (V14)
- [ ] No logs, `go/bin/`, `node_modules/`, or secrets committed (V15)

## Phase gate

<!-- If this PR touches Phase 2+ scope (HTTP push, actuator), confirm user approval -->

- [ ] N/A — Phase 1 scope only
- [ ] Phase 2+ — user approval documented (HTTP push V12, dashboard V19, actuator V13)
