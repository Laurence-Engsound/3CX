# VOXEN Customer Engagement Platform

VOXEN 是瑛聲科技自研的 Customer Engagement Platform — 中介層 + 編排引擎，把多元 vendor 系統（PBX / CRM / AI / 業務系統）整合成統一介面。

## Repository Layout

```
VOXEN/
├── core/                      @voxen/core — canonical data model, contracts, event bus
├── integrations/
│   ├── pbx/3cx/              @voxen/pbx-3cx — 3CX V20 adapter (Premium Partner)
│   ├── pbx/teams-phone/      (planned) Microsoft Teams Phone adapter
│   ├── crm/                  (planned) CRM adapters
│   ├── ai/                   (planned) STT / TTS / LLM gateway adapters
│   ├── messaging/            (planned)
│   ├── identity/             (planned) AD / SSO / OAuth
│   └── ...
├── ada/                       Agent Desktop App (Electron + Vue 3) — independent build
├── docs/
│   ├── SRS/                   v3.0 — 35 chapters + 7 appendices
│   ├── proposals/esun-outreach-project/        E.SUN Outreach Project (玉山 Phase 6) — proposal + meeting pack + demo runbook
│   ├── internal/              CANONICAL-MODEL, INTEGRATION-PATTERNS, RESOURCE-INVENTORY
│   └── diagrams/
├── package.json               monorepo root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Quickstart

Requires Node.js ≥ 20 and pnpm ≥ 8.

```bash
# Install all workspace deps
pnpm install

# Type-check everything
pnpm typecheck

# Run all tests
pnpm test

# Run 3CX adapter dev server (against mock — requires no real 3CX)
pnpm dev:3cx

# Run 3CX end-to-end smoke test
pnpm smoke:3cx
```

## Architecture Decisions (v0.1)

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety + Zod schema validation |
| Package manager | pnpm workspaces | Fast, disk-efficient, monorepo-native |
| Test framework | Node `node:test` | Built-in, zero-dep; easily swappable to Vitest |
| Schema validation | Zod | Excellent TS inference, terse, active community |
| Event bus | InProcessEventBus (default) | Single-process pub/sub; swappable to NATS / Kafka later |
| ID format | ULID with type prefix (`cal_`, `agt_`, ...) | Time-sortable, single-system unique, human-readable prefix |
| Module system | ESM (`"type": "module"`, NodeNext) | Modern Node, future-proof |

## Key Documents

Read in this order to understand the platform:

1. [docs/SRS/](docs/SRS/) — full specification (v3.0)
2. [docs/internal/CANONICAL-MODEL.md](docs/internal/CANONICAL-MODEL.md) — what data flows look like inside VOXEN
3. [docs/internal/INTEGRATION-PATTERNS.md](docs/internal/INTEGRATION-PATTERNS.md) — how to plug a new vendor in
4. [core/README.md](core/README.md) — base contracts + utilities
5. [integrations/pbx/3cx/README.md](integrations/pbx/3cx/README.md) — first reference adapter

## Status (2026-04-26)

- ✅ SRS v3.0 complete (35 ch + 7 appx)
- ✅ Canonical Model defined + implemented (`@voxen/core`)
- ✅ Event bus (in-process) implemented
- ✅ ULID + E.164 utilities implemented
- ✅ 3CX adapter scaffold (P0–P5):
  - Mappers (Call / Agent / Event) — 17 unit tests
  - Mock 3CX server (REST + WS)
  - End-to-end smoke test — 2 integration tests
  - Health endpoint
- ✅ Total: **37 / 37 tests passing**, both packages type-check clean
- 🟡 E.SUN Outreach Project (玉山 Phase 6) — 提案 ready, 等開會 (see `docs/proposals/esun-outreach-project/`)
- ⏳ M2 Active Routing webhook (next milestone)
- ⏳ Teams Phone adapter (planned)
- ⏳ CRM / AI / OPEN/TeleSA adapters (planned)
