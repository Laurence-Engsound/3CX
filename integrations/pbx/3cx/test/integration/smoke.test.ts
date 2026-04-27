/**
 * End-to-end smoke test for the 3CX adapter.
 *
 * Wires up:
 *   Mock 3CX server → ThreeCXAdapter → InProcessEventBus → assertion
 *
 * Verifies:
 *   1. Adapter starts, connects WS, emits system.adapter.started
 *   2. Mock server pushes a 3CX event → adapter translates → canonical event hits the bus
 *   3. Adapter command (makeCall) reaches mock server, returns canonical CallId
 *   4. Health endpoint reports healthy
 *   5. Graceful shutdown
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { request } from 'node:http'
import {
  InProcessEventBus,
  newTenantId,
  type Event,
  type CallId,
  type TenantId,
} from '@voxen/core'
import { ThreeCXAdapter } from '../../src/ThreeCXAdapter.js'
import { startHealthServer } from '../../src/server/healthServer.js'
import { Mock3CXServer } from '../mock-3cx-server.js'

async function fetchJson(url: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    request(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c as Buffer))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try {
          resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null })
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject).end()
  })
}

function waitForEvent(bus: InProcessEventBus, pattern: string, timeoutMs = 2000): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.unsubscribe()
      reject(new Error(`Timeout waiting for event matching "${pattern}"`))
    }, timeoutMs)
    const sub = bus.subscribe(pattern, (event) => {
      clearTimeout(timer)
      sub.unsubscribe()
      resolve(event)
    })
  })
}

test('end-to-end: 3CX event → adapter → canonical event on bus', async () => {
  // ===== Setup =====
  const mock = new Mock3CXServer()
  const { baseUrl, wsUrl } = await mock.start()

  const tenantId: TenantId = newTenantId()
  const bus = new InProcessEventBus()
  const adapter = new ThreeCXAdapter(
    {
      adapterId: 'pbx_3cx_smoke_test',
      tenantId,
      recordingStorageBackend: 'test-nas',
      client: { baseUrl, authToken: 'test-token', wsUrl },
    },
    bus,
  )

  // ===== Act 1: Start adapter, expect system.adapter.started =====
  const startedPromise = waitForEvent(bus, 'system.adapter.started')
  await adapter.start()
  const startedEvent = await startedPromise
  assert.equal(startedEvent.type, 'system.adapter.started')
  assert.equal(startedEvent.sourceAdapterId, 'pbx_3cx_smoke_test')

  // Give WS a moment to fully establish the upgrade
  await new Promise((r) => setTimeout(r, 100))

  // ===== Act 2: Push a 3CX call.ringing event from mock =====
  const vendorCallId = 'X-VENDOR-CALL-001'
  const ringingPromise = waitForEvent(bus, 'call.ringing')
  mock.pushEvent('call.ringing', {
    callId: vendorCallId,
    callerNumber: '0912345678',
    extension: '5001',
  })
  const ringingEvent = await ringingPromise

  assert.equal(ringingEvent.type, 'call.ringing')
  assert.ok(ringingEvent.refs.callId, 'canonical CallId should be assigned')
  assert.match(ringingEvent.refs.callId!, /^cal_[0-9A-HJKMNP-TV-Z]{26}$/)
  assert.equal(ringingEvent.payload['callId'], vendorCallId, 'vendor id preserved in payload')

  // ===== Act 3: Outbound makeCall command =====
  const calId: CallId = await adapter.makeCall('+886287654321', '+886912345678')
  assert.match(calId, /^cal_[0-9A-HJKMNP-TV-Z]{26}$/)
  assert.equal(mock.state.calls.size, 1, 'mock should have received the new call')

  // ===== Act 4: Health check =====
  const health = await startHealthServer({ port: 0, adapter })
  const healthRes = await fetchJson(`${health.url}/health`)
  assert.equal(healthRes.status, 200, 'health endpoint should be 200 OK')
  assert.equal(healthRes.body.healthy, true)
  assert.deepEqual(healthRes.body.supportedSchemas?.Call, ['v1'])

  const readyRes = await fetchJson(`${health.url}/ready`)
  assert.equal(readyRes.status, 200)
  assert.equal(readyRes.body.adapterId, 'pbx_3cx_smoke_test')

  // ===== Cleanup =====
  await health.close()
  await adapter.stop()
  await mock.stop()
})

test('end-to-end: unknown event type is dropped silently', async () => {
  const mock = new Mock3CXServer()
  const { baseUrl, wsUrl } = await mock.start()
  const tenantId: TenantId = newTenantId()
  const bus = new InProcessEventBus()
  const adapter = new ThreeCXAdapter(
    {
      adapterId: 'pbx_3cx_drop_test',
      tenantId,
      recordingStorageBackend: 'test-nas',
      client: { baseUrl, authToken: 'test-token', wsUrl },
    },
    bus,
  )

  await adapter.start()
  await new Promise((r) => setTimeout(r, 100))

  let receivedAny = false
  bus.subscribe('unknown.thing', () => { receivedAny = true })
  bus.subscribe('call.*', () => { receivedAny = true })
  bus.subscribe('agent.*', () => { receivedAny = true })

  mock.pushEvent('unknown.thing', { foo: 'bar' })
  await new Promise((r) => setTimeout(r, 200))

  assert.equal(receivedAny, false, 'unknown event should not produce any canonical event')

  await adapter.stop()
  await mock.stop()
})
