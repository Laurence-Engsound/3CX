// @voxen/crm-mock — entry point
import { MockCrmAdapter, type MockCrmAdapterOptions } from './MockCrmAdapter.js'
import { ESUN_DEMO_CUSTOMERS } from './data/customers.js'
import { buildEsunCallHistory, ESUN_DEMO_AGENTS } from './data/callHistory.js'

export { MockCrmAdapter }
export type { MockCrmAdapterOptions }
export { ESUN_DEMO_CUSTOMERS, ESUN_DEMO_AGENTS }

/**
 * Convenience factory: build a fully-wired mock CRM adapter with the 玉山
 * demo dataset (10 customers + 30 CDRs + last-agent map) preloaded.
 *
 * Caller still needs to call `start()` before use.
 */
export function createEsunMockAdapter(
  options: MockCrmAdapterOptions = {},
): MockCrmAdapter {
  const adapter = new MockCrmAdapter({
    adapterId: 'crm_mock_esun',
    ...options,
    customers: options.customers ?? ESUN_DEMO_CUSTOMERS,
  })
  const { history, lastAgents } = buildEsunCallHistory()
  adapter.loadCallHistory(history, lastAgents)
  return adapter
}
