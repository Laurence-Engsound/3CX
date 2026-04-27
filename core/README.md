# @voxen/core

VOXEN platform core — canonical data model, adapter contracts, in-process event bus.

## Layout

```
src/
├── models/        Canonical entity Zod schemas + inferred types
├── contracts/     Adapter / PBXAdapter / IEventBus interfaces
├── eventbus/      InProcessEventBus implementation (default)
└── utils/         ULID id generator, E.164 phone normalizer
```

## Usage

```typescript
import { CallSchema, type Call } from '@voxen/core/models'
import { newCallId } from '@voxen/core/utils'
import { InProcessEventBus } from '@voxen/core/eventbus'

const bus = new InProcessEventBus()
const call: Call = { id: newCallId(), tenantId: 'tnt_xyz', /* ... */ }
const validated = CallSchema.parse(call)  // throws if invalid
```

## See Also

- [CANONICAL-MODEL.md](../docs/internal/CANONICAL-MODEL.md) — full data model rationale
- [INTEGRATION-PATTERNS.md](../docs/internal/INTEGRATION-PATTERNS.md) — how to write an Adapter
