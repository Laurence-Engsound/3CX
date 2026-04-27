import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InProcessEventBus } from '../../src/eventbus/InProcessEventBus.js'
import { newEventId, newCallId, newTenantId } from '../../src/utils/id.js'
import type { Event } from '../../src/models/Event.js'

function makeEvent(type: string): Event {
  return {
    id: newEventId(),
    type: type as Event['type'],
    tenantId: newTenantId(),
    occurredAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    sourceAdapterId: 'test_adapter',
    refs: { callId: newCallId() },
    payload: { test: true },
    payloadSchemaVersion: 'v1',
  }
}

test('publish/subscribe with exact match', async () => {
  const bus = new InProcessEventBus()
  const received: Event[] = []
  bus.subscribe('call.ringing', (e) => { received.push(e) })

  await bus.publish(makeEvent('call.ringing'))
  assert.equal(received.length, 1)
  assert.equal(received[0]?.type, 'call.ringing')
})

test('wildcard pattern matches all sub-events', async () => {
  const bus = new InProcessEventBus()
  const received: string[] = []
  bus.subscribe('call.*', (e) => { received.push(e.type) })

  await bus.publish(makeEvent('call.ringing'))
  await bus.publish(makeEvent('call.answered'))
  await bus.publish(makeEvent('call.ended'))
  await bus.publish(makeEvent('agent.login'))   // should NOT match

  assert.deepEqual(received, ['call.ringing', 'call.answered', 'call.ended'])
})

test('non-matching subscribers do not receive', async () => {
  const bus = new InProcessEventBus()
  const received: Event[] = []
  bus.subscribe('agent.*', (e) => { received.push(e) })

  await bus.publish(makeEvent('call.ringing'))
  assert.equal(received.length, 0)
})

test('unsubscribe removes the handler', async () => {
  const bus = new InProcessEventBus()
  const received: Event[] = []
  const sub = bus.subscribe('call.*', (e) => { received.push(e) })

  await bus.publish(makeEvent('call.ringing'))
  assert.equal(received.length, 1)

  sub.unsubscribe()
  await bus.publish(makeEvent('call.answered'))
  assert.equal(received.length, 1, 'should not receive after unsubscribe')
  assert.equal(bus.subscriberCount(), 0)
})

test('multiple subscribers all receive', async () => {
  const bus = new InProcessEventBus()
  const a: Event[] = []
  const b: Event[] = []
  bus.subscribe('call.*', (e) => { a.push(e) })
  bus.subscribe('call.ringing', (e) => { b.push(e) })

  await bus.publish(makeEvent('call.ringing'))
  assert.equal(a.length, 1)
  assert.equal(b.length, 1)

  await bus.publish(makeEvent('call.ended'))
  assert.equal(a.length, 2)
  assert.equal(b.length, 1, 'b only matches call.ringing')
})

test('handler error does not crash publish', async () => {
  const bus = new InProcessEventBus()
  const received: Event[] = []
  bus.subscribe('call.*', () => { throw new Error('handler boom') })
  bus.subscribe('call.*', (e) => { received.push(e) })

  // Suppress expected console.error during this test
  const origError = console.error
  console.error = () => {}
  try {
    await bus.publish(makeEvent('call.ringing'))
  } finally {
    console.error = origError
  }
  assert.equal(received.length, 1, 'second handler still ran despite first throwing')
})
