import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventSchema } from '@voxen/core/models'
import { newTenantId, newCallId } from '@voxen/core/utils'
import {
  mapEventType,
  mapVendorEventToCanonical,
} from '../../src/mappers/event.js'
import type { ThreeCXEventEnvelope } from '../../src/vendor/types.js'

const CTX = {
  adapterId: 'pbx_3cx_test',
  tenantId: newTenantId(),
}

test('mapEventType translates known 3CX events', () => {
  assert.equal(mapEventType('call.ringing'), 'call.ringing')
  assert.equal(mapEventType('call.answered'), 'call.answered')
  assert.equal(mapEventType('call.held'), 'call.hold')
  assert.equal(mapEventType('call.resumed'), 'call.unhold')
  assert.equal(mapEventType('ivr.optionSelected'), 'call.ivr.option_selected')
  assert.equal(mapEventType('agent.statusChanged'), 'agent.status_changed')
})

test('mapEventType returns undefined for unknown event', () => {
  assert.equal(mapEventType('something.unknown'), undefined)
})

test('mapVendorEventToCanonical produces valid canonical Event', () => {
  const canonicalCallId = newCallId()
  const envelope: ThreeCXEventEnvelope = {
    event: 'call.ringing',
    timestamp: '2026-04-26T14:35:18Z',
    seq: 42,
    data: { callId: 'A1B2-vendor-id', extension: '5001' },
  }
  const ctx = {
    ...CTX,
    vendorToCanonicalCallId: (vid: string) =>
      vid === 'A1B2-vendor-id' ? canonicalCallId : undefined,
  }

  const event = mapVendorEventToCanonical(envelope, ctx)
  assert.ok(event, 'event should be produced')
  assert.equal(event!.type, 'call.ringing')
  assert.equal(event!.refs.callId, canonicalCallId)
  assert.equal(event!.sourceCorrelationId, '42')
  assert.equal(event!.payloadSchemaVersion, 'v1')
  assert.equal(event!.payload['extension'], '5001')

  const result = EventSchema.safeParse(event)
  assert.equal(result.success, true,
    result.success ? '' : `Validation: ${JSON.stringify(result.error.issues, null, 2)}`)
})

test('mapVendorEventToCanonical drops unknown events', () => {
  const envelope: ThreeCXEventEnvelope = {
    event: 'unknown.thing',
    timestamp: '2026-04-26T14:35:18Z',
    seq: 1,
    data: {},
  }
  const event = mapVendorEventToCanonical(envelope, CTX)
  assert.equal(event, undefined)
})

test('mapVendorEventToCanonical handles missing call lookup', () => {
  const envelope: ThreeCXEventEnvelope = {
    event: 'call.ringing',
    timestamp: '2026-04-26T14:35:18Z',
    seq: 1,
    data: { callId: 'unknown' },
  }
  const event = mapVendorEventToCanonical(envelope, CTX)
  assert.ok(event, 'event still produced')
  assert.equal(event!.refs.callId, undefined)
})
