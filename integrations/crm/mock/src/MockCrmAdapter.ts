import type {
  Adapter,
  AdapterConfig,
  CustomerLookupAdapter,
  CallHistoryAdapter,
  CallSummary,
  CustomerRef,
  CustomerId,
  AgentId,
  HealthStatus,
  TenantId,
} from '@voxen/core'
import { normalizePhone } from '@voxen/core'
import { ESUN_DEMO_CUSTOMERS } from './data/customers.js'

/**
 * Mock CRM adapter for VOXEN demo / dev / test.
 *
 * Implements both CustomerLookupAdapter and CallHistoryAdapter against
 * an in-memory dataset (玉山 demo customers preloaded).
 *
 * NOT for production use. Spec compliance is "good enough for demo":
 *   - lookupByPhone normalizes input, then exact-matches primaryPhone
 *   - getRecentCalls / getLastAgent return data from in-memory CDR set
 *     (CDR data injected via configure() — see P6.5)
 *
 * Constructor accepts an optional customer overlay for tests that need
 * different fixtures than the 玉山 demo set.
 */
export interface MockCrmAdapterOptions {
  adapterId?: string
  tenantId?: TenantId | 'shared'
  /** Override default customer set (defaults to ESUN_DEMO_CUSTOMERS). */
  customers?: readonly CustomerRef[]
}

export class MockCrmAdapter implements Adapter, CustomerLookupAdapter, CallHistoryAdapter {
  readonly adapterId: string
  readonly tenantId: TenantId | 'shared'

  private readonly customers: readonly CustomerRef[]
  private readonly customersByPhone: Map<string, CustomerRef>
  private readonly customersById: Map<CustomerId, CustomerRef>

  // CallHistory data is loaded by P6.5 — placeholders for now
  private callHistory: ReadonlyMap<CustomerId, readonly CallSummary[]> = new Map()
  private lastAgentByCustomer: ReadonlyMap<CustomerId, AgentId> = new Map()

  private started = false

  constructor(options: MockCrmAdapterOptions = {}) {
    this.adapterId = options.adapterId ?? 'crm_mock_default'
    this.tenantId = options.tenantId ?? 'shared'
    this.customers = options.customers ?? ESUN_DEMO_CUSTOMERS

    // Build lookup indexes once at construction
    this.customersByPhone = new Map(
      this.customers.map((c) => [c.primaryPhone, c]),
    )
    this.customersById = new Map(
      this.customers.map((c) => [c.id, c]),
    )
  }

  // ─── Adapter lifecycle ──────────────────────────────────────────

  async start(): Promise<void> {
    this.started = true
  }

  async stop(): Promise<void> {
    this.started = false
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: this.started,
      message: this.started
        ? `mock crm with ${this.customers.length} customers`
        : 'adapter not started',
      details: {
        customerCount: this.customers.length,
        callHistoryCount: this.callHistory.size,
      },
      supportedSchemas: { CustomerRef: ['v1'], CallSummary: ['v1'] },
      checkedAt: new Date().toISOString(),
    }
  }

  // ─── CustomerLookupAdapter ──────────────────────────────────────

  async lookupByPhone(phone: string): Promise<CustomerRef | null> {
    let normalized: string
    try {
      normalized = normalizePhone(phone)
    } catch {
      return null  // unparseable phone → no match (don't throw on miss)
    }
    return this.customersByPhone.get(normalized) ?? null
  }

  async lookupById(id: CustomerId): Promise<CustomerRef | null> {
    return this.customersById.get(id) ?? null
  }

  // ─── CallHistoryAdapter ─────────────────────────────────────────

  async getRecentCalls(customerId: CustomerId, limit = 10): Promise<CallSummary[]> {
    const all = this.callHistory.get(customerId) ?? []
    return all.slice(0, limit)
  }

  async getLastAgent(customerId: CustomerId): Promise<AgentId | null> {
    return this.lastAgentByCustomer.get(customerId) ?? null
  }

  // ─── Internal: CDR data wiring (filled by P6.5) ────────────────

  /**
   * Inject call-history fixtures. Called by package-level setup or by
   * tests that need custom CDR data.
   */
  loadCallHistory(
    history: ReadonlyMap<CustomerId, readonly CallSummary[]>,
    lastAgents: ReadonlyMap<CustomerId, AgentId>,
  ): void {
    this.callHistory = history
    this.lastAgentByCustomer = lastAgents
  }
}
