import type { CustomerLookupAdapter } from '../contracts/CustomerLookupAdapter.js'
import type { CallHistoryAdapter, CallSummary } from '../contracts/CallHistoryAdapter.js'
import type { CustomerRef, CustomerId } from '../models/Customer.js'
import type { AgentId } from '../models/Agent.js'

/**
 * CustomerProfile — unified L5 view that aggregates a customer with their
 * recent interaction history and last serving agent.
 *
 * Returned by Customer360Service. Used as input to:
 *   - Last-Agent Routing (L5)
 *   - Agent Desktop App context panel (L6)
 *   - Voice Bot (致行) for personalized greeting
 */
export interface CustomerProfile {
  /** The customer's master record. */
  customer: CustomerRef
  /** Recent calls, newest first. May be empty. */
  recentCalls: CallSummary[]
  /** AgentId of the last serving agent within the recency window, or null. */
  lastAgent: AgentId | null
  /** ISO datetime when this profile was assembled. */
  fetchedAt: string
}

export interface Customer360ServiceConfig {
  customerLookup: CustomerLookupAdapter
  callHistory: CallHistoryAdapter
  /** Default number of recent calls to fetch per profile. Default: 10. */
  recentCallsLimit?: number
}

/**
 * Customer360Service — L5 orchestration service that builds a unified customer
 * profile from multiple lower-level adapters.
 *
 * Pure orchestration: holds no state, no caching, no side effects. Each call
 * fans out to the underlying adapters in parallel and assembles the result.
 * Caching, retries, and circuit-breaking are concerns for higher layers
 * (or wrapper adapters) — this service stays simple and predictable.
 *
 * See docs/internal/CANONICAL-MODEL.md for the broader L5 service family.
 */
export class Customer360Service {
  private readonly customerLookup: CustomerLookupAdapter
  private readonly callHistory: CallHistoryAdapter
  private readonly recentCallsLimit: number

  constructor(config: Customer360ServiceConfig) {
    this.customerLookup = config.customerLookup
    this.callHistory = config.callHistory
    this.recentCallsLimit = config.recentCallsLimit ?? 10
  }

  /**
   * Build a unified profile from a phone number.
   *
   * The lookup adapter is responsible for normalising the phone number.
   *
   * @returns CustomerProfile, or null if no customer matched the phone.
   */
  async getProfileByPhone(phone: string): Promise<CustomerProfile | null> {
    const customer = await this.customerLookup.lookupByPhone(phone)
    if (!customer) return null
    return this.enrichProfile(customer)
  }

  /**
   * Build a unified profile from a canonical CustomerId.
   *
   * @returns CustomerProfile, or null if the id is not found.
   */
  async getProfileById(customerId: CustomerId): Promise<CustomerProfile | null> {
    const customer = await this.customerLookup.lookupById(customerId)
    if (!customer) return null
    return this.enrichProfile(customer)
  }

  /**
   * Enrich an already-resolved CustomerRef with history + last-agent.
   *
   * Useful when an upstream caller already obtained CustomerRef (e.g., from
   * a routing decision) and just needs the rest of the profile.
   */
  async enrichProfile(customer: CustomerRef): Promise<CustomerProfile> {
    const [recentCalls, lastAgent] = await Promise.all([
      this.callHistory.getRecentCalls(customer.id, this.recentCallsLimit),
      this.callHistory.getLastAgent(customer.id),
    ])
    return {
      customer,
      recentCalls,
      lastAgent,
      fetchedAt: new Date().toISOString(),
    }
  }
}
