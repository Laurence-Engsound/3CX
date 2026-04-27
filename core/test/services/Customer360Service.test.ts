import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Customer360Service } from '../../src/services/Customer360Service.js'
import type {
  CustomerLookupAdapter,
  CallHistoryAdapter,
  CallSummary,
  CustomerRef,
  CustomerId,
  AgentId,
  HealthStatus,
} from '../../src/index.js'

// ── Test fixtures ─────────────────────────────────────────────────

const TENANT = 'tnt_01HQR0WMRP4Y3M0000000000ES' as const
const CUSTOMER_ID = 'cust_01HQR0WMRP4Y3M000000000001' as CustomerId
const AGENT_ID = 'agt_01HQR0WMRP4Y3M000000000001' as AgentId

const FIXTURE_CUSTOMER: CustomerRef = {
  id: CUSTOMER_ID,
  tenantId: TENANT,
  displayName: '王先生',
  primaryPhone: '+886912345001',
  segment: 'Standard',
  language: 'zh-TW',
}

const FIXTURE_CALLS: CallSummary[] = [
  {
    callId: 'cal_01HQR0WMRP4Y3M000000000001',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    direction: 'inbound',
    startedAt: '2026-04-22T10:14:33Z',
    endedAt: '2026-04-22T10:18:33Z',
    durationSec: 240,
    endReason: 'caller_hangup',
  },
]

// ── Stub adapters (satisfy the contracts) ────────────────────────

function makeStubLookup(opts: {
  byPhone?: Record<string, CustomerRef>
  byId?: Record<string, CustomerRef>
} = {}): CustomerLookupAdapter {
  return {
    adapterId: 'stub_lookup',
    tenantId: 'shared',
    async start() {},
    async stop() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, checkedAt: new Date().toISOString() }
    },
    async lookupByPhone(phone) {
      return opts.byPhone?.[phone] ?? null
    },
    async lookupById(id) {
      return opts.byId?.[id] ?? null
    },
  }
}

function makeStubHistory(opts: {
  recentCalls?: Record<string, CallSummary[]>
  lastAgent?: Record<string, AgentId>
} = {}): CallHistoryAdapter {
  return {
    adapterId: 'stub_history',
    tenantId: 'shared',
    async start() {},
    async stop() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, checkedAt: new Date().toISOString() }
    },
    async getRecentCalls(customerId) {
      return opts.recentCalls?.[customerId] ?? []
    },
    async getLastAgent(customerId) {
      return opts.lastAgent?.[customerId] ?? null
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────

test('getProfileByPhone returns null when customer not found', async () => {
  const svc = new Customer360Service({
    customerLookup: makeStubLookup(),
    callHistory: makeStubHistory(),
  })
  const profile = await svc.getProfileByPhone('+886900000000')
  assert.equal(profile, null)
})

test('getProfileByPhone returns full profile when customer found', async () => {
  const svc = new Customer360Service({
    customerLookup: makeStubLookup({
      byPhone: { '+886912345001': FIXTURE_CUSTOMER },
    }),
    callHistory: makeStubHistory({
      recentCalls: { [CUSTOMER_ID]: FIXTURE_CALLS },
      lastAgent: { [CUSTOMER_ID]: AGENT_ID },
    }),
  })
  const profile = await svc.getProfileByPhone('+886912345001')
  assert.ok(profile, 'expected profile to be non-null')
  assert.equal(profile.customer.id, CUSTOMER_ID)
  assert.equal(profile.customer.displayName, '王先生')
  assert.equal(profile.recentCalls.length, 1)
  assert.equal(profile.lastAgent, AGENT_ID)
  assert.match(profile.fetchedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('getProfileById uses lookupById, not lookupByPhone', async () => {
  let phoneCalled = false
  const svc = new Customer360Service({
    customerLookup: {
      adapterId: 'stub',
      tenantId: 'shared',
      async start() {},
      async stop() {},
      async healthCheck() {
        return { healthy: true, checkedAt: new Date().toISOString() }
      },
      async lookupByPhone() {
        phoneCalled = true
        return null
      },
      async lookupById() {
        return FIXTURE_CUSTOMER
      },
    },
    callHistory: makeStubHistory(),
  })
  const profile = await svc.getProfileById(CUSTOMER_ID)
  assert.ok(profile)
  assert.equal(profile.customer.id, CUSTOMER_ID)
  assert.equal(phoneCalled, false, 'lookupByPhone must not be called')
})

test('enrichProfile returns lastAgent=null when no agent recorded', async () => {
  const svc = new Customer360Service({
    customerLookup: makeStubLookup(),
    callHistory: makeStubHistory(),  // empty
  })
  const profile = await svc.enrichProfile(FIXTURE_CUSTOMER)
  assert.equal(profile.customer.id, CUSTOMER_ID)
  assert.equal(profile.recentCalls.length, 0)
  assert.equal(profile.lastAgent, null)
})

test('recentCallsLimit option is respected', async () => {
  // Build a 12-call list — should be limited to 5 by service config
  const manyCalls: CallSummary[] = Array.from({ length: 12 }, (_, i) => ({
    callId: `cal_01HQR0WMRP4Y3M00000000${String(i).padStart(4, '0')}`,
    customerId: CUSTOMER_ID,
    direction: 'inbound' as const,
    startedAt: '2026-04-01T10:00:00Z',
  }))

  let limitArg: number | undefined
  const svc = new Customer360Service({
    customerLookup: makeStubLookup({ byPhone: { '+886912345001': FIXTURE_CUSTOMER } }),
    callHistory: {
      adapterId: 'stub',
      tenantId: 'shared',
      async start() {},
      async stop() {},
      async healthCheck() {
        return { healthy: true, checkedAt: new Date().toISOString() }
      },
      async getRecentCalls(_id, limit) {
        limitArg = limit
        return manyCalls.slice(0, limit ?? 10)
      },
      async getLastAgent() {
        return null
      },
    },
    recentCallsLimit: 5,
  })

  const profile = await svc.getProfileByPhone('+886912345001')
  assert.equal(limitArg, 5, 'service must pass configured limit to adapter')
  assert.equal(profile?.recentCalls.length, 5)
})

test('enrichProfile fetches history and last-agent in parallel', async () => {
  // We can't easily verify literal parallelism in node:test, but we can
  // verify both paths fire by tracking call counts.
  let historyCalls = 0
  let agentCalls = 0
  const svc = new Customer360Service({
    customerLookup: makeStubLookup(),
    callHistory: {
      adapterId: 'stub',
      tenantId: 'shared',
      async start() {},
      async stop() {},
      async healthCheck() {
        return { healthy: true, checkedAt: new Date().toISOString() }
      },
      async getRecentCalls() {
        historyCalls++
        return []
      },
      async getLastAgent() {
        agentCalls++
        return null
      },
    },
  })
  await svc.enrichProfile(FIXTURE_CUSTOMER)
  assert.equal(historyCalls, 1)
  assert.equal(agentCalls, 1)
})
