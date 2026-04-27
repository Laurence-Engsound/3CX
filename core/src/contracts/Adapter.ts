import type { TenantId } from '../models/Tenant.js'

export interface HealthStatus {
  healthy: boolean
  message?: string
  details?: Record<string, unknown>
  /** Adapter advertises which canonical schema versions it can produce. */
  supportedSchemas?: Record<string, string[]>  // e.g., { Call: ['v1'], Agent: ['v1'] }
  checkedAt: string                            // ISO datetime
}

export interface AdapterConfig {
  /** Globally unique adapter instance ID. e.g., 'pbx_3cx_eSun', 'pbx_teams_eSun' */
  adapterId: string
  /** Tenant this adapter serves. (Use a sentinel for shared adapters.) */
  tenantId: TenantId | 'shared'
  /** Adapter type discriminator. e.g., '3cx', 'teams', 'genesys', 'rest_api_generic' */
  type: string
  /** Vendor-specific connection / auth settings. Schema validated per-adapter. */
  vendor: Record<string, unknown>
}

/**
 * Base contract for any adapter (PBX, CRM, AD, AI, ...).
 * Sub-domains extend with capability-specific methods (see PBXAdapter).
 */
export interface Adapter {
  readonly adapterId: string
  readonly tenantId: TenantId | 'shared'

  /** Lifecycle */
  start(): Promise<void>
  stop(): Promise<void>

  /** Observability */
  healthCheck(): Promise<HealthStatus>
}
