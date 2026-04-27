import { z } from 'zod'

export const TenantIdSchema = z.string().regex(/^tnt_[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid TenantId (expected tnt_<ULID>)')
export type TenantId = z.infer<typeof TenantIdSchema>

export const SubDomainSchema = z.enum(['telephony', 'customer_engagement', 'ai', 'identity'])
export type SubDomain = z.infer<typeof SubDomainSchema>

export const TenantSchema = z.object({
  id: TenantIdSchema,
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Lower-kebab-case only'),
  displayName: z.string().min(1).max(200),
  createdAt: z.string().datetime(),
  status: z.enum(['active', 'suspended', 'archived']),
  enabledDomains: z.array(SubDomainSchema),
  metadata: z.record(z.unknown()).optional(),
})
export type Tenant = z.infer<typeof TenantSchema>
