# Contributing

## Branch politikası

| Branch | Kullanım | Minimum CI |
|--------|----------|------------|
| `development` | Günlük entegrasyon | `make ci-fast` |
| `main` | Milestone / release | `make ci-smoke` |

Detay: [`docs/BRANCHES.md`](docs/BRANCHES.md)

## İlk kurulum

```bash
git clone <repo-url>
cd instance-metric-collector
make onboard
```

Non-interactive:

```bash
PROFILE=app make onboard   # setup + hooks + ci-fast
PROFILE=full make onboard  # + smoke test
```

## Günlük workflow

1. `git pull`
2. Değişiklik yap
3. `make ci-fast` (veya pre-push hook otomatik çalıştırır)
4. PR aç → `development` veya `main`

## PR checklist

- [ ] `make ci-fast` geçti (development PR)
- [ ] `make ci-smoke` geçti (main/milestone PR)
- [ ] Council veto kontrolü yapıldı ([`docs/VETO_REGISTRY.md`](docs/VETO_REGISTRY.md))
- [ ] Yeni collector mantığı için unit test eklendi (V14)
- [ ] Log dosyası / `go/bin/` commit edilmedi (V15)

## Council

Agent ve insan katkıdaşlar V1–V20 veto kurallarına uyar. İhlal şüphesi varsa dur ve kullanıcıya sor.

- [`AGENTS.md`](AGENTS.md)
- [`docs/VETO_REGISTRY.md`](docs/VETO_REGISTRY.md)
- [`docs/PHASE_GATES.md`](docs/PHASE_GATES.md)

## Mimari kararlar

Yeni ADR'ler `docs/DECISIONS/` altına eklenir. Kırıcı payload değişiklikleri ADR gerektirir (V6, V7).
