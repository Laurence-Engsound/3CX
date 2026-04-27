/**
 * E2E smoke test — Customer360Service + MockCrmAdapter wired together.
 *
 * Validates the headline acceptance criteria from ESUN-MASTER-CHECKLIST P1-D02:
 *   "CRM mock 可查 0912-XXX-001 王先生"
 * Plus Demo 4 last-agent routing: "0912-XXX-002 → agent04"
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Customer360Service } from '@voxen/core'
import { createEsunMockAdapter, ESUN_DEMO_AGENTS } from '../../src/index.js'

test('e2e: 0912-345-001 → 王先生 + agent01 + 4 通歷史', async () => {
  // Wire up — single mock adapter satisfies both contracts
  const mock = createEsunMockAdapter()
  await mock.start()

  const svc = new Customer360Service({
    customerLookup: mock,
    callHistory: mock,
  })

  // Use Taiwan local format — service should pass through, adapter normalises
  const profile = await svc.getProfileByPhone('0912-345-001')

  assert.ok(profile, 'profile should be non-null for 王先生')
  assert.equal(profile.customer.displayName, '王先生')
  assert.equal(profile.customer.primaryPhone, '+886912345001')
  assert.equal(profile.customer.segment, 'Standard')
  assert.equal(profile.recentCalls.length, 4)
  assert.equal(profile.lastAgent, ESUN_DEMO_AGENTS.agent01)

  // fetchedAt should be a valid ISO datetime within last few seconds
  const fetched = Date.parse(profile.fetchedAt)
  assert.ok(!Number.isNaN(fetched))
  assert.ok(Date.now() - fetched < 5000, 'fetchedAt should be recent')

  await mock.stop()
})

test('e2e: 0912-345-002 → 林小姐, last agent = agent04 (Demo 4 acceptance)', async () => {
  const mock = createEsunMockAdapter()
  await mock.start()
  const svc = new Customer360Service({
    customerLookup: mock,
    callHistory: mock,
  })

  const profile = await svc.getProfileByPhone('+886912345002')
  assert.ok(profile)
  assert.equal(profile.customer.displayName, '林小姐')
  assert.equal(
    profile.lastAgent,
    ESUN_DEMO_AGENTS.agent04,
    'Demo 4 acceptance: 0912-XXX-002 should route to agent04',
  )
})

test('e2e: VIP 何小姐 has 3 calls, all served by agent01', async () => {
  const mock = createEsunMockAdapter()
  await mock.start()
  const svc = new Customer360Service({
    customerLookup: mock,
    callHistory: mock,
  })

  const profile = await svc.getProfileByPhone('+886912345010')
  assert.ok(profile)
  assert.equal(profile.customer.displayName, '何小姐')
  assert.equal(profile.customer.segment, 'VIP')
  assert.equal(profile.recentCalls.length, 3)
  // VIP 客戶綁定資深 agent01
  for (const c of profile.recentCalls) {
    assert.equal(c.agentId, ESUN_DEMO_AGENTS.agent01)
  }
  assert.equal(profile.lastAgent, ESUN_DEMO_AGENTS.agent01)
})

test('e2e: 0912-345-099 (未在客戶名單) → null', async () => {
  const mock = createEsunMockAdapter()
  await mock.start()
  const svc = new Customer360Service({
    customerLookup: mock,
    callHistory: mock,
  })
  const profile = await svc.getProfileByPhone('+886912345099')
  assert.equal(profile, null)
})

test('e2e: enrichProfile path — already-resolved customer', async () => {
  const mock = createEsunMockAdapter()
  await mock.start()
  const svc = new Customer360Service({
    customerLookup: mock,
    callHistory: mock,
  })

  // 先 lookup，拿到 ref
  const customer = await mock.lookupByPhone('0912-345-004')  // 黃太太 Risk
  assert.ok(customer)

  // 再 enrich
  const profile = await svc.enrichProfile(customer)
  assert.equal(profile.customer.displayName, '黃太太')
  assert.equal(profile.customer.segment, 'Risk')
  assert.equal(profile.recentCalls.length, 5)  // Risk 客戶 5 通
  assert.equal(profile.lastAgent, ESUN_DEMO_AGENTS.agent04)
})
