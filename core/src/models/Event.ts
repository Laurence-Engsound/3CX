import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'
import { AgentIdSchema } from './Agent.js'
import { QueueIdSchema } from './Queue.js'
import { CustomerIdSchema } from './Customer.js'
import { CallIdSchema, CallEventTypeSchema } from './Call.js'
import { RecordingIdSchema } from './Recording.js'

export const EventIdSchema = z.string().regex(/^evt_[0-9A-HJKMNP-TV-Z]{26}$/)
export type EventId = z.infer<typeof EventIdSchema>

export const AgentEventTypeSchema = z.enum([
  'agent.login',
  'agent.logout',
  'agent.status_changed',
  'agent.skills_updated',
])
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>

export const SystemEventTypeSchema = z.enum([
  'system.adapter.started',
  'system.adapter.stopped',
  'system.adapter.health_changed',
  'system.error',
])
export type SystemEventType = z.infer<typeof SystemEventTypeSchema>

export const EventTypeSchema = z.union([CallEventTypeSchema, AgentEventTypeSchema, SystemEventTypeSchema])
export type EventType = z.infer<typeof EventTypeSchema>

/**
 * Event — append-only time-axis record across entities.
 * Used for: audit log, real-time stream (pub/sub), report ETL source.
 * See docs/internal/CANONICAL-MODEL.md §3.8
 */
export const EventSchema = z.object({
  id: EventIdSchema,
  type: EventTypeSchema,
  tenantId: TenantIdSchema,

  occurredAt: z.string().datetime(),                       // when it actually happened
  ingestedAt: z.string().datetime(),                       // when written to VOXEN

  sourceAdapterId: z.string(),
  sourceCorrelationId: z.string().optional(),              // adapter trace id

  refs: z.object({
    callId: CallIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
    customerId: CustomerIdSchema.optional(),
    queueId: QueueIdSchema.optional(),
    recordingId: RecordingIdSchema.optional(),
  }),

  payload: z.record(z.unknown()),
  payloadSchemaVersion: z.string(),                        // 'v1', 'v2'
})
export type Event = z.infer<typeof EventSchema>
