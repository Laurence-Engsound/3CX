import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'
import { AgentIdSchema } from './Agent.js'
import { QueueIdSchema } from './Queue.js'
import { CustomerRefSchema } from './Customer.js'
import { RecordingRefSchema } from './Recording.js'

export const CallIdSchema = z.string().regex(/^cal_[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid CallId (expected cal_<ULID>)')
export type CallId = z.infer<typeof CallIdSchema>

export const CallStateSchema = z.enum([
  'initiating',     // outbound 撥號中
  'ringing',        // 響鈴
  'ivr',            // IVR 互動
  'bot',            // Voice Bot 互動
  'queued',         // 已進群組等待
  'active',         // 真人接聽中
  'on_hold',        // hold
  'transferring',   // 轉接中
  'conference',     // 三方
  'ended',          // 結束
])
export type CallState = z.infer<typeof CallStateSchema>

export const CallEndReasonSchema = z.enum([
  'caller_hangup',
  'callee_hangup',
  'transfer',
  'timeout',
  'system_error',
  'policy_reject',
  'abandoned_in_queue',
])
export type CallEndReason = z.infer<typeof CallEndReasonSchema>

export const CallEventTypeSchema = z.enum([
  'call.initiating',
  'call.ringing',
  'call.answered',
  'call.ivr.entered',
  'call.ivr.option_selected',
  'call.ivr.exited',
  'call.bot.started',
  'call.bot.utterance',
  'call.bot.intent_detected',
  'call.bot.transferred_to_agent',
  'call.queued',
  'call.agent.assigned',
  'call.agent.whisper.started',
  'call.agent.whisper.ended',
  'call.agent.bargein.started',
  'call.agent.takeover',
  'call.recording.started',
  'call.recording.paused',
  'call.recording.resumed',
  'call.recording.stopped',
  'call.transferred',
  'call.hold',
  'call.unhold',
  'call.ended',
])
export type CallEventType = z.infer<typeof CallEventTypeSchema>

export const CallTimelineEntrySchema = z.object({
  timestamp: z.string().datetime(),
  type: CallEventTypeSchema,
  payload: z.record(z.unknown()).optional(),
  source: z.string(),                                      // adapter id
})
export type CallTimelineEntry = z.infer<typeof CallTimelineEntrySchema>

export const IVRSessionSchema = z.object({
  ivrId: z.string(),
  enteredAt: z.string().datetime(),
  exitedAt: z.string().datetime().optional(),
  selections: z.array(z.object({
    nodeId: z.string(),
    option: z.string(),
    timestamp: z.string().datetime(),
  })),
  exitReason: z.enum(['completed', 'transferred', 'abandoned', 'timeout']).optional(),
})
export type IVRSession = z.infer<typeof IVRSessionSchema>

export const BotSessionSchema = z.object({
  botId: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  turns: z.array(z.object({
    speaker: z.enum(['bot', 'customer']),
    text: z.string(),
    timestamp: z.string().datetime(),
    intent: z.string().optional(),
  })),
  endReason: z.enum(['transferred_to_agent', 'completed', 'fallback', 'error']).optional(),
})
export type BotSession = z.infer<typeof BotSessionSchema>

export const SupervisorInterventionSchema = z.object({
  supervisorId: AgentIdSchema,
  type: z.enum(['whisper', 'bargein', 'takeover']),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
})
export type SupervisorIntervention = z.infer<typeof SupervisorInterventionSchema>

export const AgentInteractionSchema = z.object({
  agentId: AgentIdSchema,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  supervisorInterventions: z.array(SupervisorInterventionSchema).optional(),
})
export type AgentInteraction = z.infer<typeof AgentInteractionSchema>

/**
 * Call — VOXEN canonical core entity for a phone call.
 * All vendor adapters (3CX, Teams, Genesys) must produce/consume this shape.
 * See docs/internal/CANONICAL-MODEL.md §3.5
 */
export const CallSchema = z.object({
  schemaVersion: z.literal('v1'),
  id: CallIdSchema,
  tenantId: TenantIdSchema,
  externalIds: z.record(z.string()),

  direction: z.enum(['inbound', 'outbound', 'internal']),

  caller: z.object({
    phoneNumber: z.string(),                               // E.164
    customerRef: CustomerRefSchema.optional(),
    displayName: z.string().optional(),
  }),

  callee: z.object({
    phoneNumber: z.string().optional(),
    extension: z.string().optional(),
    queueId: QueueIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
  }),

  state: CallStateSchema,
  timeline: z.array(CallTimelineEntrySchema),

  ivr: IVRSessionSchema.optional(),
  bot: BotSessionSchema.optional(),
  agentInteraction: AgentInteractionSchema.optional(),
  recording: RecordingRefSchema.optional(),

  ringingAt: z.string().datetime().optional(),
  answeredAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  durationSec: z.number().nonnegative().optional(),
  ringDurationSec: z.number().nonnegative().optional(),
  endReason: CallEndReasonSchema.optional(),

  sourceAdapterId: z.string(),

  metadata: z.record(z.unknown()).optional(),
})
export type Call = z.infer<typeof CallSchema>
