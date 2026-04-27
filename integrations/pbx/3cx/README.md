# @voxen/pbx-3cx

VOXEN PBX adapter for **3CX V20** (瑛聲 Premium Partner integration).

Implements the `PBXAdapter` contract from `@voxen/core` — translates 3CX REST + WebSocket into VOXEN canonical events / commands, maintains a vendor↔canonical id map, and exposes a /health endpoint.

## Layout

```
src/
├── ThreeCXAdapter.ts       PBXAdapter implementation
├── client/
│   └── ThreeCXClient.ts    REST + WebSocket wrapper for 3CX Call Control API v2
├── mappers/
│   ├── call.ts             3CX Call → canonical Call
│   ├── agent.ts            3CX User → canonical Agent
│   └── event.ts            3CX event envelope → canonical Event
├── server/
│   └── healthServer.ts     /health, /ready endpoints (Node http)
├── vendor/
│   └── types.ts            3CX-specific types (subset of public API)
└── index.ts                Main entry — `pnpm dev` runs this

test/
├── mock-3cx-server.ts      In-memory mock 3CX (REST + minimal WS)
├── mappers/*.test.ts       Unit tests for each mapper
└── integration/
    └── smoke.test.ts       End-to-end: mock → adapter → bus
```

## Quickstart

### Run unit + integration tests

```bash
pnpm install                # one-time, from monorepo root
pnpm --filter @voxen/pbx-3cx test
```

### Smoke run (against mock server)

```bash
pnpm --filter @voxen/pbx-3cx smoke
```

Expected output: 2 tests pass — `3CX event → adapter → canonical event on bus` + `unknown event type is dropped silently`.

### Run adapter against a real 3CX

```bash
export THREECX_BASE_URL=https://eSun-pbx.voxen.local:5001
export THREECX_AUTH_TOKEN=<oauth-token>
export THREECX_TENANT_ID=tnt_eSun00000000000000000000
export THREECX_ADAPTER_ID=pbx_3cx_eSun
export THREECX_RECORDING_BACKEND=eSun-nas-primary
export HEALTH_PORT=3000

pnpm --filter @voxen/pbx-3cx dev
# Logs: [bus] system.adapter.started ...
# Health: curl http://localhost:3000/health
```

## Integration Mode (covers all 5 patterns)

| Mode | How it surfaces |
|---|---|
| **M1 Passive Listening** | Subscribe to `call.*` on the bus; observer pattern |
| **M2 Active Routing** | (Forthcoming) HTTP webhook handler that 3CX IVR's `Forward to URL` calls |
| **M3 Dynamic IVR Generation** | (Forthcoming) Wraps 3CX Configuration REST API |
| **M4 Voice Bot Replacement** | Adapter forwards calls to a SIP UA endpoint registered in 3CX |
| **M5 Hybrid Orchestration** | Adapter as B2BUA — out of scope for v0.1 |

See [docs/internal/INTEGRATION-PATTERNS.md](../../../docs/internal/INTEGRATION-PATTERNS.md) for full design.

## Versioning

- `Call` schema: v1
- `Agent` schema: v1
- `Event` schema: v1

Advertised by `healthCheck().supportedSchemas`.

## Limitations (v0.1)

- M2/M3 not yet wired (only M1 + outbound makeCall)
- Mock server uses hand-rolled WS (1-frame text only); production should swap to `ws` package
- ID lookup table is in-memory (no persistence) — adapter restart loses vendor↔canonical map
- No retry / circuit breaker yet
- Recording metadata is `RecordingRef` only; full `Recording` entity write to come

## Reference

- 3CX Call Control API: `reference/3CX Call Control API Endpoint Specification Guide _ 3CX.html`
- 3CX Configuration REST API: `reference/Configuration Rest API Endpoint Specifications _ 3CX.html`
- VOXEN canonical model: `../../../docs/internal/CANONICAL-MODEL.md`
- Integration patterns: `../../../docs/internal/INTEGRATION-PATTERNS.md`
