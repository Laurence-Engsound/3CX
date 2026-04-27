import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MockCrmAdapter,
  ESUN_DEMO_CUSTOMERS,
  ESUN_DEMO_AGENTS,
  createEsunMockAdapter,
} from '../../src/index.js'
import type { CustomerId } from '@voxen/core'

test('lookupByPhone — exact E.164 match returns customer', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  const customer = await adapter.lookupByPhone('+886912345001')
  assert.ok(customer, '+886912345001 should map to 王先生')
  assert.equal(customer.displayName, '王先生')
})

test('lookupByPhone — Taiwan local format normalized to E.164', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  // 0912-345-001 → +886912345001
  const customer = await adapter.lookupByPhone('0912-345-001')
  assert.ok(customer)
  assert.equal(customer.displayName, '王先生')
})

test('lookupByPhone — unknown phone returns null', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  const customer = await adapter.lookupByPhone('+886900000999')
  assert.equal(customer, null)
})

test('lookupByPhone — unparseable input returns null (does not throw)', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  const customer = await adapter.lookupByPhone('not-a-phone')
  assert.equal(customer, null)
})

test('lookupById — direct id lookup works', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  const expected = ESUN_DEMO_CUSTOMERS[0]!
  const customer = await adapter.lookupById(expected.id as CustomerId)
  assert.ok(customer)
  assert.equal(customer.displayName, '王先生')
})

test('lookupById — unknown id returns null', async () => {
  const adapter = new MockCrmAdapter()
  await adapter.start()
  const customer = await adapter.lookupById(
    'cust_01HQR0WMRP4Y3M00000000XXXXX' as CustomerId,
  )
  assert.equal(customer, null)
})

test('healthCheck reports unhealthy before start, healthy after', async () => {
  const adapter = new MockCrmAdapter()
  let h = await adapter.healthCheck()
  assert.equal(h.healthy, false)
  await adapter.start()
  h = await adapter.healthCheck()
  assert.equal(h.healthy, true)
  assert.equal(h.details?.customerCount, 10)
})

test('createEsunMockAdapter — preloaded with玉山 demo dataset', async () => {
  const adapter = createEsunMockAdapter()
  await adapter.start()
  // 王先生 has 4 calls in fixture
  const calls = await adapter.getRecentCalls(
    ESUN_DEMO_CUSTOMERS[0]!.id as CustomerId,
  )
  assert.equal(calls.length, 4)
  assert.equal(calls[0]?.agentId, ESUN_DEMO_AGENTS.agent01)
})

test('getRecentCalls — limit option respected', async () => {
  const adapter = createEsunMockAdapter()
  await adapter.start()
  const calls = await adapter.getRecentCalls(
    ESUN_DEMO_CUSTOMERS[3]!.id as CustomerId,  // 黃太太 has 5 calls
    3,
  )
  assert.equal(calls.length, 3)
})

test('getLastAgent — Demo 4 acceptance: 林小姐 → agent04', async () => {
  const adapter = createEsunMockAdapter()
  await adapter.start()
  const lastAgent = await adapter.getLastAgent(
    ESUN_DEMO_CUSTOMERS[1]!.id as CustomerId,  // 林小姐
  )
  assert.equal(lastAgent, ESUN_DEMO_AGENTS.agent04)
})

test('getLastAgent — unknown customer returns null', async () => {
  const adapter = createEsunMockAdapter()
  await adapter.start()
  const lastAgent = await adapter.getLastAgent(
    'cust_01HQR0WMRP4Y3M00000000XXXXX' as CustomerId,
  )
  assert.equal(lastAgent, null)
})
