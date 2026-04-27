import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'

export const CustomerIdSchema = z.string().regex(/^cust_[0-9A-HJKMNP-TV-Z]{26}$/)
export type CustomerId = z.infer<typeof CustomerIdSchema>

/**
 * CustomerRef — Telephony 視角下的客戶簡明 reference。
 * 完整 Customer 360 由 Customer Engagement sub-domain 維護。
 */
export const CustomerRefSchema = z.object({
  id: CustomerIdSchema,
  tenantId: TenantIdSchema,
  displayName: z.string().optional(),
  primaryPhone: z.string(),                  // E.164
  segment: z.string().optional(),            // 'VIP', 'Standard', 'Risk'
  language: z.string().optional(),           // BCP-47, e.g., 'zh-TW'
  lastContactAt: z.string().datetime().optional(),
})
export type CustomerRef = z.infer<typeof CustomerRefSchema>
