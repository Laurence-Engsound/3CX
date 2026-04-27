import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'
import { AgentIdSchema, UserIdSchema } from './Agent.js'

export const RecordingIdSchema = z.string().regex(/^rec_[0-9A-HJKMNP-TV-Z]{26}$/)
export type RecordingId = z.infer<typeof RecordingIdSchema>

export const RecordingFileFormatSchema = z.enum(['wav', 'mp3', 'opus', 'flac'])
export type RecordingFileFormat = z.infer<typeof RecordingFileFormatSchema>

export const RetentionPolicySchema = z.object({
  retainUntil: z.string().datetime(),
  policyName: z.string(),                                  // 'fsc-h113-04-credit-business'
  classification: z.enum(['standard', 'sensitive', 'pci_excluded']),
})
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>

export const LegalHoldSchema = z.object({
  holdId: z.string(),
  caseRef: z.string(),
  appliedAt: z.string().datetime(),
  appliedBy: UserIdSchema,
  approvedBy: UserIdSchema,
  expectedReleaseDate: z.string().datetime().optional(),
})
export type LegalHold = z.infer<typeof LegalHoldSchema>

export const RecordingSegmentSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  type: z.enum(['recorded', 'paused']),
  reason: z.string().optional(),
})
export type RecordingSegment = z.infer<typeof RecordingSegmentSchema>

/**
 * Lightweight reference embedded in Call. Full Recording entity below.
 */
export const RecordingRefSchema = z.object({
  id: RecordingIdSchema,
  uri: z.string().regex(/^voxen:\/\//),                    // VOXEN abstract URI
  storageBackend: z.string(),                              // adapter resolves to actual path
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationSec: z.number().nonnegative().optional(),
  pauseEvents: z.array(z.object({
    pausedAt: z.string().datetime(),
    resumedAt: z.string().datetime().optional(),
    reason: z.enum(['pci', 'manual', 'policy']),
    triggeredBy: AgentIdSchema.optional(),
  })).optional(),
})
export type RecordingRef = z.infer<typeof RecordingRefSchema>

export const RecordingSchema = z.object({
  schemaVersion: z.literal('v1'),
  id: RecordingIdSchema,
  tenantId: TenantIdSchema,
  externalIds: z.record(z.string()),
  callId: z.string(),
  uri: z.string(),
  storageBackend: z.string(),
  fileFormat: RecordingFileFormatSchema,
  fileSizeBytes: z.number().int().nonnegative().optional(),
  durationSec: z.number().nonnegative(),
  bitrateKbps: z.number().int().positive().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  encryptionAtRest: z.enum(['none', 'aes256']),
  retentionPolicy: RetentionPolicySchema,
  legalHold: LegalHoldSchema.optional(),
  segments: z.array(RecordingSegmentSchema),
  createdAt: z.string().datetime(),
  createdBy: z.string(),                                   // adapter id
  accessLog: z.array(z.object({
    accessedAt: z.string().datetime(),
    accessedBy: UserIdSchema,
    purpose: z.string(),
    ipAddress: z.string().ip().optional(),
  })),
})
export type Recording = z.infer<typeof RecordingSchema>
