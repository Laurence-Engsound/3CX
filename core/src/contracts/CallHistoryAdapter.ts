import type { Adapter } from './Adapter.js'
import type { AgentId } from '../models/Agent.js'
import type { CustomerId } from '../models/Customer.js'

/**
 * CallSummary — lightweight call record for "recent history" queries.
 *
 * Not the full canonical Call model — that's heavy and includes timeline,
 * recording, IVR/bot sessions etc. For customer-context lookups we only need
 * the at-a-glance fields.
 */
export interface CallSummary {
  callId: string                // canonical CallId
  customerId: CustomerId
  agentId?: AgentId             // who handled it (if any)
  direction: 'inbound' | 'outbound' | 'internal'
  startedAt: string             // ISO datetime
  endedAt?: string              // ISO datetime, undefined if still active
  durationSec?: number
  endReason?: string            // canonical CallEndReason as string
  hasRecording?: boolean
}

/**
 * CallHistoryAdapter — contract for any source that can answer
 * "what calls has this customer had recently?" and "who served them last?".
 *
 * Implementations include:
 *   - Call Detail Record (CDR) databases
 *   - Genesys ICON / Interaction Concentrator
 *   - 3CX call log API
 *   - In-memory mocks for demo
 *
 * Used by L5 services (Customer360Service, Last-Agent Routing) to build the
 * customer context view.
 */
export interface CallHistoryAdapter extends Adapter {
  /**
   * Recent calls for a customer, newest first.
   *
   * @param customerId — canonical CustomerId
   * @param limit — max number of calls to return (default: 10)
   * @returns array of CallSummary, may be empty if no history
   */
  getRecentCalls(customerId: CustomerId, limit?: number): Promise<CallSummary[]>

  /**
   * Last agent who served this customer (used for "Last-Agent Routing" pattern).
   *
   * Implementations may apply a recency window — e.g., only consider the last
   * 30 days, or only count answered calls. The window is implementation
   * defined; consumers treat null as "no recent agent / route normally".
   *
   * @param customerId — canonical CustomerId
   * @returns AgentId if the customer has a recent serving agent, null otherwise
   */
  getLastAgent(customerId: CustomerId): Promise<AgentId | null>
}
