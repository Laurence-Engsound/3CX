import type { Adapter } from './Adapter.js'
import type { CustomerId, CustomerRef } from '../models/Customer.js'

/**
 * CustomerLookupAdapter — contract for any source-of-truth that can answer
 * "who is this phone number / customer id?".
 *
 * Implementations include:
 *   - CRM systems (Salesforce, Dynamics, custom DB)
 *   - Customer Data Platforms (CDP)
 *   - In-memory mocks for demo / test
 *
 * Used by L5 services (Customer360Service, Routing) to enrich a call with
 * customer context.
 *
 * See docs/internal/CANONICAL-MODEL.md and docs/internal/INTEGRATION-PATTERNS.md
 * for the broader CRM adapter family.
 */
export interface CustomerLookupAdapter extends Adapter {
  /**
   * Look up a customer by phone number.
   *
   * @param phone — phone number, ideally E.164. Implementations should
   *                normalize before lookup (using @voxen/core's phone utils).
   * @returns CustomerRef if found, null otherwise. Never throws on miss.
   */
  lookupByPhone(phone: string): Promise<CustomerRef | null>

  /**
   * Look up a customer by canonical CustomerId.
   *
   * @param id — canonical CustomerId (cust_<ULID>)
   * @returns CustomerRef if found, null otherwise.
   */
  lookupById(id: CustomerId): Promise<CustomerRef | null>
}
