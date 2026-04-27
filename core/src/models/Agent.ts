import { z } from 'zod'
import { TenantIdSchema } from './Tenant.js'

export const AgentIdSchema = z.string().regex(/^agt_[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid AgentId (expected agt_<ULID>)')
export type AgentId = z.infer<typeof AgentIdSchema>

export const GroupIdSchema = z.string().regex(/^grp_[0-9A-HJKMNP-TV-Z]{26}$/)
export type GroupId = z.infer<typeof GroupIdSchema>

export const UserIdSchema = z.string().regex(/^usr_[0-9A-HJKMNP-TV-Z]{26}$/)
export type UserId = z.infer<typeof UserIdSchema>

export const AgentStatusSchema = z.enum([
  'available',       // 可接 call
  'busy',            // 通話中
  'acw',             // After Call Work — 後處理
  'away',            // 短暫離開
  'dnd',             // Do Not Disturb
  'offline',         // 未登入
  'training',        // 訓練中（不接 call）
])
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const SkillSchema = z.object({
  code: z.string().min(1).max(64),       // e.g., 'cn-tw', 'credit_card'
  proficiency: z.number().int().min(1).max(5),
  certifiedAt: z.string().datetime().optional(),
})
export type Skill = z.infer<typeof SkillSchema>

export const DeviceRefSchema = z.object({
  type: z.enum(['softphone', 'desk_phone', 'mobile', 'web_browser']),
  identifier: z.string(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
})
export type DeviceRef = z.infer<typeof DeviceRefSchema>

export const AgentSchema = z.object({
  id: AgentIdSchema,
  tenantId: TenantIdSchema,
  externalIds: z.record(z.string()),
  displayName: z.string().min(1).max(200),
  employeeId: z.string().optional(),
  userId: UserIdSchema.optional(),
  groupIds: z.array(GroupIdSchema),
  status: AgentStatusSchema,
  statusReason: z.string().optional(),
  statusUpdatedAt: z.string().datetime(),
  skills: z.array(SkillSchema),
  currentDevice: DeviceRefSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
})
export type Agent = z.infer<typeof AgentSchema>
