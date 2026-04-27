import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'
import { AgentIdSchema } from './Agent.js'

export const QueueIdSchema = z.string().regex(/^que_[0-9A-HJKMNP-TV-Z]{26}$/)
export type QueueId = z.infer<typeof QueueIdSchema>

export const RoutingStrategySchema = z.enum([
  'round_robin',
  'longest_idle',
  'skill_based',
  'last_agent',
  'custom',
])
export type RoutingStrategy = z.infer<typeof RoutingStrategySchema>

export const QueueSchema = z.object({
  id: QueueIdSchema,
  tenantId: TenantIdSchema,
  externalIds: z.record(z.string()),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  routingStrategy: RoutingStrategySchema,
  memberIds: z.array(AgentIdSchema),
  enabled: z.boolean(),
  slaTarget: z.object({
    answerWithinSec: z.number().int().positive(),
    targetPercent: z.number().int().min(0).max(100),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
})
export type Queue = z.infer<typeof QueueSchema>
