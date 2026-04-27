# VOXEN Canonical Data Model

**版本**：v0.1
**日期**：2026-04-26
**用途**：定義 VOXEN core 內部使用的「平台中性、vendor 無關」資料模型。所有 adapter 都必須對映到此模型。
**讀者**：VOXEN core 與 adapter 開發者、架構審查者
**對應 SRS**：Ch 13（L2 資料與身分基礎）— 本文件是工程層的具現化

---

## 一、文件範圍與不在範圍

### 在範圍

- 8 個核心 entity 的完整 TypeScript interface 定義
- 每個 entity 的欄位語意、必填 / 選填、值域
- ID 與識別碼策略
- Vendor mapping（3CX、Teams Phone、Genesys）
- 版本演進規則
- 多 tenant 隔離策略
- Adapter 開發者 quickstart

### 不在範圍

- 資料庫 schema（DBA 依本文件設計，但本文件不規範儲存細節）
- API contract（API 設計引用本模型，但 API spec 在另一份文件）
- UI 模型（前端可能再做一次 view-model 轉換）
- AI / vector 資料（AI 模組有自己的 sub-domain canonical，獨立文件）

---

## 二、設計原則

### 2.1 平台中性（Vendor-Agnostic）

VOXEN core 不應出現任何 vendor-specific 名詞。範例對照：

| ❌ 不要 | ✅ 要 |
|---|---|
| `call.threeCxCallId` | `call.id` + `call.externalIds['3cx']` |
| `agent.teamsUserPrincipalName` | `agent.id` + `agent.externalIds['teams']` |
| `call.genesysQueueName` | `call.queue.id` + `call.queue.name` |

### 2.2 ID 設計（ULID 而非 UUID）

VOXEN 自己發行的 ID 一律用 **ULID**（128-bit）：

- 前 48-bit 為 millisecond timestamp → **時序可排**（資料庫 index 友善、log 易讀）
- 後 80-bit 為 random
- 字串表示 26 字元，base32（無 ambiguous chars）
- 範例：`01HXY8K3JQ5G7Z9V2N4M8P6R3T`

**Vendor 的原始 ID** 保留在 `externalIds: Record<string, string>` 欄位，永不丟棄（debug、對帳必要）。

### 2.3 Lossy OK，但 Core 必須一致

- Vendor-specific 的細節欄位可以丟棄，或塞進 `metadata: Record<string, unknown>` bag
- 但 core 業務邏輯（路由、報表、AI）只看 canonical 欄位，不准 peek metadata
- Metadata 是「保險櫃」不是「公用儲物間」

### 2.4 Bounded Context（DDD）

VOXEN 不追求一張大 schema 涵蓋一切。不同 sub-domain 有自己的 canonical：

| Sub-domain | 主 entity | 文件 |
|---|---|---|
| **Telephony**（本文件主軸） | Call、Agent、Queue、Recording、Event | 本文件 |
| **Customer Engagement** | Customer、Interaction（含 chat、email） | （另文件） |
| **AI / Knowledge** | KnowledgeChunk、Embedding、AgentSession | （另文件） |
| **Identity & Access** | Tenant、User、Role、Policy | （另文件） |

跨 sub-domain 透過 ID reference（不直接內嵌）。

### 2.5 版本化（Versioned）

- Canonical model 會演進，每個 entity 都有 schema version
- 新增 optional 欄位 → 不算 breaking change，不需 bump major
- 改名 / 改型別 / 刪欄位 → breaking change，bump major（`Call.v1` → `Call.v2`）
- Adapter 必須在 health check 時 advertise 支援的版本

---

## 三、八大核心 Entity

### 3.1 Tenant（多客戶隔離邊界）

```typescript
interface Tenant {
  /** ULID, e.g., 'tnt_01HXY8K3...' */
  id: TenantId
  /** 短 slug，給人讀的（不可改名） */
  slug: string                  // 'eSun', 'engsound', 'demo-lab'
  displayName: string           // '玉山銀行', '瑛聲科技內部'
  createdAt: ISODateTime
  status: 'active' | 'suspended' | 'archived'
  /** 此 tenant 開通的 sub-domain */
  enabledDomains: SubDomain[]
  /** 預留 metadata（如：產業別、區域、合約 ID） */
  metadata?: Record<string, unknown>
}
```

**設計理由**：
- 所有其他 entity 都帶 `tenantId`，確保資料完全隔離
- 玉山 = 1 個 tenant，瑛聲內部 demo lab = 另 1 個 tenant
- 跨 tenant 查詢需要顯式跨 tenant 權限（預設拒絕）

---

### 3.2 Agent（座席）

```typescript
interface Agent {
  id: AgentId                   // ULID
  tenantId: TenantId
  externalIds: Record<string, string>  // { '3cx': '101', 'teams': 'user@eSun.tw' }

  /** 顯示名稱（中文 / 英文）*/
  displayName: string
  /** 員工編號 / 工號 */
  employeeId?: string
  /** 對應的 user identity（指向 Identity sub-domain）*/
  userId?: UserId
  /** 所屬群組 / 部門 */
  groupIds: GroupId[]

  /** 即時狀態 */
  status: AgentStatus
  statusReason?: string         // 'lunch', 'meeting', 'training'
  statusUpdatedAt: ISODateTime

  /** 技能標籤（用於 skill-based routing）*/
  skills: Skill[]

  /** Hot-desking：目前登入的實體裝置 */
  currentDevice?: DeviceRef

  createdAt: ISODateTime
  updatedAt: ISODateTime
  metadata?: Record<string, unknown>
}

enum AgentStatus {
  Available = 'available',     // 可接 call
  Busy = 'busy',               // 通話中
  AfterCallWork = 'acw',       // 後處理
  Away = 'away',               // 短暫離開
  DoNotDisturb = 'dnd',        // 勿擾
  Offline = 'offline',         // 未登入
  Training = 'training',       // 訓練中（不接 call）
}

interface Skill {
  code: string                 // 'cn-tw', 'credit_card', 'mortgage'
  proficiency: 1 | 2 | 3 | 4 | 5
  certifiedAt?: ISODateTime
}

interface DeviceRef {
  type: 'softphone' | 'desk_phone' | 'mobile' | 'web_browser'
  identifier: string           // MAC / Browser fingerprint / phone serial
  ipAddress?: string
  userAgent?: string
}
```

---

### 3.3 Queue / Group（路由群組）

```typescript
interface Queue {
  id: QueueId
  tenantId: TenantId
  externalIds: Record<string, string>

  name: string                 // '玉山信用卡客服群', 'Outreach 北區'
  description?: string

  /** 路由策略 */
  routingStrategy: RoutingStrategy

  /** 群組成員（agent ID 列表）*/
  memberIds: AgentId[]

  /** 是否啟用 */
  enabled: boolean

  /** 預設 SLA 目標 */
  slaTarget?: {
    answerWithinSec: number    // 例：30 秒接聽率目標
    targetPercent: number      // 例：80%
  }

  createdAt: ISODateTime
  updatedAt: ISODateTime
  metadata?: Record<string, unknown>
}

enum RoutingStrategy {
  RoundRobin = 'round_robin',
  LongestIdle = 'longest_idle',
  SkillBased = 'skill_based',
  LastAgent = 'last_agent',     // 客戶之前接過的 agent 優先
  Custom = 'custom',            // 走 RoutingEngine 的 custom rule
}
```

---

### 3.4 Customer（客戶 — Telephony 視角）

> ⚠ 完整 Customer 360 在 Customer Engagement sub-domain，本文件只描述 Telephony 用得到的 subset。

```typescript
interface CustomerRef {
  id: CustomerId               // ULID（指向 Customer sub-domain）
  tenantId: TenantId
  /** 來電顯示對到的客戶資訊（snapshot at call time）*/
  displayName?: string         // '王先生', 'Eric Lin'
  primaryPhone: string         // '0912345678'
  segment?: string             // 'VIP', 'Standard', 'Risk'
  language?: string            // 'zh-TW', 'en'
  /** 上次跟我們的接觸時間 */
  lastContactAt?: ISODateTime
}
```

**設計理由**：
- 完整的 Customer 模型由 CRM Adapter / Customer Engagement domain 維護
- Telephony 路徑只需要「夠用的識別資訊」即可，避免 over-fetch

---

### 3.5 Call（通話 — 本模型核心）

```typescript
interface Call {
  schemaVersion: 'v1'

  id: CallId                   // ULID（VOXEN 自發）
  tenantId: TenantId
  externalIds: Record<string, string>  // 各 vendor 的原 call ID

  /** 來電方向 */
  direction: 'inbound' | 'outbound' | 'internal'

  /** 主叫方 */
  caller: {
    phoneNumber: string        // E.164 normalized: '+886912345678'
    customerRef?: CustomerRef  // 解析後的客戶
    displayName?: string       // 來電顯示
  }

  /** 被叫方 */
  callee: {
    phoneNumber?: string       // 撥打的號碼（outbound）
    extension?: string         // 內部分機（inbound 解析後）
    queueId?: QueueId          // 進入的群組
    agentId?: AgentId          // 最終接通的座席
  }

  /** 通話狀態（finite state machine）*/
  state: CallState
  /** 狀態變化時序（永不刪除，append-only）*/
  timeline: CallTimelineEntry[]

  /** IVR 互動（如有經過）*/
  ivr?: IVRSession

  /** Bot 互動（如有經過）*/
  bot?: BotSession

  /** Agent 互動（如有接通真人）*/
  agentInteraction?: AgentInteraction

  /** 錄音（reference 而非檔案）*/
  recording?: RecordingRef

  /** 主要時間戳 */
  ringingAt?: ISODateTime
  answeredAt?: ISODateTime
  endedAt?: ISODateTime

  /** 計費 / 統計用 */
  durationSec?: number          // answeredAt 到 endedAt
  ringDurationSec?: number      // ringingAt 到 answeredAt
  endReason?: CallEndReason

  /** 來源 adapter（debug + audit）*/
  sourceAdapterId: AdapterId    // 'pbx_3cx_eSun', 'pbx_teams_eSun'

  metadata?: Record<string, unknown>
}

enum CallState {
  Initiating = 'initiating',    // outbound 撥號中
  Ringing = 'ringing',          // 響鈴中
  IVR = 'ivr',                  // IVR 互動中
  Bot = 'bot',                  // Voice Bot 互動中
  Queued = 'queued',            // 已進群組等待
  Active = 'active',            // 真人接聽中
  OnHold = 'on_hold',           // hold
  Transferring = 'transferring',// 轉接中
  Conference = 'conference',    // 三方通話
  Ended = 'ended',
}

enum CallEndReason {
  CallerHangup = 'caller_hangup',
  CalleeHangup = 'callee_hangup',
  Transfer = 'transfer',
  Timeout = 'timeout',
  SystemError = 'system_error',
  PolicyReject = 'policy_reject',  // 例：黑名單
  AbandonedInQueue = 'abandoned_in_queue',
}

interface CallTimelineEntry {
  timestamp: ISODateTime
  type: CallEventType            // 'call.ringing', 'call.ivr.option_selected'...
  payload?: Record<string, unknown>
  source: AdapterId
}

interface IVRSession {
  ivrId: string                  // VOXEN 內部的 IVR design ID
  enteredAt: ISODateTime
  exitedAt?: ISODateTime
  /** 客戶在 IVR 中的選擇序列 */
  selections: Array<{
    nodeId: string
    option: string
    timestamp: ISODateTime
  }>
  exitReason?: 'completed' | 'transferred' | 'abandoned' | 'timeout'
}

interface BotSession {
  botId: string                  // 'chy-voicebot-v2'
  startedAt: ISODateTime
  endedAt?: ISODateTime
  /** 對話 turn 序列（精簡版，完整在 AI sub-domain）*/
  turns: Array<{
    speaker: 'bot' | 'customer'
    text: string
    timestamp: ISODateTime
    intent?: string              // detected intent
  }>
  endReason?: 'transferred_to_agent' | 'completed' | 'fallback' | 'error'
}

interface AgentInteraction {
  agentId: AgentId
  startedAt: ISODateTime
  endedAt?: ISODateTime
  /** 主管介入事件（whisper / barge / take-over）*/
  supervisorInterventions?: Array<{
    supervisorId: AgentId
    type: 'whisper' | 'bargein' | 'takeover'
    startedAt: ISODateTime
    endedAt?: ISODateTime
  }>
}

interface RecordingRef {
  id: RecordingId
  /** VOXEN 抽象 URI（不是 vendor path）*/
  uri: string                   // 'voxen://recording/2026-04-26/01HXY8K3...'
  /** 實際儲存後端（給 adapter 用）*/
  storageBackend: string        // 'eSun-nas-primary'
  startedAt: ISODateTime
  endedAt?: ISODateTime
  durationSec?: number
  /** 暫停 / 恢復事件（如 PCI Pause）*/
  pauseEvents?: Array<{
    pausedAt: ISODateTime
    resumedAt?: ISODateTime
    reason: 'pci' | 'manual' | 'policy'
    triggeredBy?: AgentId
  }>
}
```

---

### 3.6 Recording（錄音 — 詳細 entity）

```typescript
interface Recording {
  schemaVersion: 'v1'

  id: RecordingId
  tenantId: TenantId
  externalIds: Record<string, string>

  /** 對應的通話 */
  callId: CallId

  /** 儲存資訊 */
  uri: string                    // VOXEN 抽象 URI
  storageBackend: string         // 'eSun-nas-primary'
  fileFormat: 'wav' | 'mp3' | 'opus' | 'flac'
  fileSizeBytes?: number
  durationSec: number
  bitrateKbps?: number

  /** 完整性 */
  sha256?: string                // 防篡改 hash
  encryptionAtRest: 'none' | 'aes256'

  /** 法遵 */
  retentionPolicy: RetentionPolicy
  legalHold?: LegalHold          // Legal Hold 狀態

  /** 音訊段落（PCI Pause 等造成的分段）*/
  segments: Array<{
    startSec: number
    endSec: number
    type: 'recorded' | 'paused'
    reason?: string
  }>

  /** 稽核 */
  createdAt: ISODateTime
  createdBy: AdapterId
  accessLog: Array<{
    accessedAt: ISODateTime
    accessedBy: UserId
    purpose: string
    ipAddress?: string
  }>
}

interface RetentionPolicy {
  retainUntil: ISODateTime       // 預設刪除日期
  policyName: string             // 'fsc-h113-04-credit-business' (金管會 H113-04 信用業務)
  classification: 'standard' | 'sensitive' | 'pci_excluded'
}

interface LegalHold {
  holdId: string
  caseRef: string                // 案件編號
  appliedAt: ISODateTime
  appliedBy: UserId
  approvedBy: UserId             // maker-checker
  expectedReleaseDate?: ISODateTime
}
```

---

### 3.7 Interaction（廣義客戶接觸 — 跨頻道）

> 為「跨頻道客戶 360」預留。Phase 6 主要用 Call，Interaction 在玉山 Phase 6 後的 omnichannel 階段啟用。

```typescript
interface Interaction {
  schemaVersion: 'v1'

  id: InteractionId
  tenantId: TenantId

  /** 接觸類型 */
  channel: 'voice_call' | 'chat' | 'email' | 'sms' | 'social_media' | 'video'

  /** 跟具體 entity 的 reference（依 channel 不同）*/
  callId?: CallId                // when channel === 'voice_call'
  chatSessionId?: string
  emailMessageId?: string
  // ...

  /** 共通欄位 */
  customerRef: CustomerRef
  agentId?: AgentId
  startedAt: ISODateTime
  endedAt?: ISODateTime
  outcome?: InteractionOutcome
  satisfactionScore?: number     // 1-5
  topicTags?: string[]           // 'card_inquiry', 'complaint'

  metadata?: Record<string, unknown>
}

enum InteractionOutcome {
  Resolved = 'resolved',
  Escalated = 'escalated',
  FollowUpScheduled = 'follow_up_scheduled',
  Abandoned = 'abandoned',
}
```

---

### 3.8 Event（時間軸事件 — 跨 entity）

> Event 是跨 entity 的時間軸記錄，用於：稽核日誌、即時 stream（pub/sub）、報表 ETL 來源。

```typescript
interface Event<TPayload = Record<string, unknown>> {
  /** ULID — 自帶時序 */
  id: EventId
  /** Event 類型，遵循「五-5.3 Event Taxonomy」命名 */
  type: CallEventType | AgentEventType | CustomerEventType | SystemEventType
  tenantId: TenantId

  /** 事件時間（不是寫入時間，是事件實際發生時間）*/
  occurredAt: ISODateTime
  /** 寫入 VOXEN 的時間（給 latency 分析用）*/
  ingestedAt: ISODateTime

  /** 來源 */
  sourceAdapterId: AdapterId
  sourceCorrelationId?: string   // adapter 端的 trace ID

  /** 跟主要 entity 的關聯（讓 query 能 join）*/
  refs: {
    callId?: CallId
    agentId?: AgentId
    customerId?: CustomerId
    queueId?: QueueId
    recordingId?: RecordingId
    interactionId?: InteractionId
  }

  /** 事件 payload（type-safe 由 type 決定）*/
  payload: TPayload

  /** Schema version of payload */
  payloadSchemaVersion: string   // 'v1', 'v2'
}

type CallEventType =
  | 'call.initiating'
  | 'call.ringing'
  | 'call.answered'
  | 'call.ivr.entered'
  | 'call.ivr.option_selected'
  | 'call.ivr.exited'
  | 'call.bot.started'
  | 'call.bot.utterance'
  | 'call.bot.intent_detected'
  | 'call.bot.transferred_to_agent'
  | 'call.queued'
  | 'call.agent.assigned'
  | 'call.agent.whisper.started'
  | 'call.agent.whisper.ended'
  | 'call.agent.bargein.started'
  | 'call.agent.takeover'
  | 'call.recording.started'
  | 'call.recording.paused'
  | 'call.recording.resumed'
  | 'call.recording.stopped'
  | 'call.transferred'
  | 'call.hold'
  | 'call.unhold'
  | 'call.ended'

// Agent / Customer / System event 類型同樣枚舉，本文略
```

---

## 四、Vendor Mapping 對照表

### 4.1 Call entity 對映

| VOXEN canonical | 3CX | Microsoft Teams | Genesys Engage |
|---|---|---|---|
| `id` | n/a (VOXEN 自發 ULID) | n/a | n/a |
| `externalIds['3cx']` | `Call.GUID` | — | — |
| `externalIds['teams']` | — | `call.id` (Graph) | — |
| `externalIds['genesys']` | — | — | `interactionId` |
| `direction` | `Type` (Inbound/Outbound) | `direction` | `iScript.Direction` |
| `caller.phoneNumber` | `CallerNumber` | `from.identity.phoneNumber` | `ANI` |
| `callee.extension` | `DialedNumber` | `to.identity` | `DNIS` |
| `state` | `CallState` (mapping table) | `state` | `connectionState` |
| `ringingAt` | `RingingTime` | `setupTimestamp` | `eventCreatedAt` |
| `answeredAt` | `AnsweredTime` | `answeredTimestamp` | `acceptedAt` |
| `endedAt` | `EndTime` | `endedTimestamp` | `disconnectedAt` |
| `recording.uri` | `RecordingPath` (轉成 voxen:// URI) | `recordings[0].contentUrl` | `recordingURI` |

### 4.2 Agent entity 對映

| VOXEN canonical | 3CX | Microsoft Teams | Genesys Engage |
|---|---|---|---|
| `externalIds['3cx']` | `User.Number` (extension) | — | — |
| `externalIds['teams']` | — | `userPrincipalName` | — |
| `externalIds['genesys']` | — | — | `agentId` |
| `displayName` | `User.FirstName + LastName` | `displayName` | `agentName` |
| `status` | `Presence` (mapping) | `presence.availability` | `agentState` |
| `skills` | (3CX 沒原生，VOXEN 自管) | (Teams 沒原生) | `skillSet` |

### 4.3 CallState enum 對映

```
VOXEN State    | 3CX                | Teams              | Genesys
---------------|--------------------|--------------------|------------------
Initiating     | Routing            | Establishing       | Initialized
Ringing        | Ringing            | Notification       | Alerting
IVR            | IVR (custom)       | (透過 IVR app)     | IVR
Bot            | (透過 SIP transfer)| (透過 bot app)     | Voice Application
Queued         | Routing→Queue      | (透過 queue)       | Queued
Active         | Established        | Established        | Connected
OnHold         | OnHold             | OnHold             | Held
Transferring   | Transferring       | Transferring       | Transferring
Conference     | Conference         | Conference         | Conferenced
Ended          | Disconnected       | Terminated         | Disconnected
```

---

## 五、ID 與識別碼策略

### 5.1 ID 格式

| Entity | ID Prefix | Format | 範例 |
|---|---|---|---|
| Tenant | `tnt_` | ULID | `tnt_01HXY8K3JQ5G7Z9V2N4M8P6R3T` |
| Agent | `agt_` | ULID | `agt_01HXY8K9...` |
| Queue | `que_` | ULID | `que_01HXY8KA...` |
| Customer | `cust_` | ULID | `cust_01HXY8KB...` |
| Call | `cal_` | ULID | `cal_01HXY8KC...` |
| Recording | `rec_` | ULID | `rec_01HXY8KD...` |
| Event | `evt_` | ULID | `evt_01HXY8KE...` |
| Interaction | `int_` | ULID | `int_01HXY8KF...` |

### 5.2 ID 不變性（Immutability）

- ID 一旦建立 **永不修改**，永不重用
- 即使 entity 邏輯刪除（soft delete），ID 也保留在 audit trail
- vendor 端的 ID 變更不影響 VOXEN canonical ID

### 5.3 ID 跨 tenant 全域唯一

- ULID 的 random 部分保證全域唯一性
- 但業務查詢必須 `WHERE tenantId = ?` 隔離（防止 cross-tenant 洩漏）

### 5.4 externalIds 結構

```typescript
externalIds: Record<string, string>
// 例：
// {
//   '3cx': '{A1B2C3D4-E5F6-7890-...}',
//   'genesys': '5051234567890123',  // 過渡期同時存在
//   'crm_eSun': 'CUST-2026-04-12345' // CRM 端 ID
// }
```

- Key 是 adapter ID（不是 vendor 名稱通名，要明確到 instance）
- 多 adapter 同時對映同一個 entity（過渡期常見）

---

## 六、版本演進策略

### 6.1 加欄位（Forward Compatible）

新增 optional 欄位 → 不算 breaking change：

```typescript
// v1
interface Call {
  schemaVersion: 'v1'
  // ... existing fields
  /** v1.1 新增 — 客戶情緒分析（optional）*/
  sentimentScore?: number
}
```

舊版 adapter 不會寫這個欄位 → 讀取者要容忍 undefined。

### 6.2 改 / 刪欄位（Breaking Change）

```typescript
// v2 — direction 從 string 改為 enum object
interface Call_v2 {
  schemaVersion: 'v2'
  direction: {
    type: 'inbound' | 'outbound' | 'internal'
    subtype?: 'cold_transfer' | 'warm_transfer'
  }
  // ...
}
```

- 必須 bump major（v1 → v2）
- 同時保留 v1 schema 一段時間（建議 ≥ 6 個月）
- Adapter 在 health check 中 advertise 支援的版本：

```typescript
healthCheck() returns {
  supportedSchemas: {
    Call: ['v1', 'v2'],
    Agent: ['v1']
  }
}
```

### 6.3 Deprecation Timeline

```
T+0       新版發布（v2 與 v1 並存）
T+90 天   v1 被標記 deprecated（log warning）
T+180 天  v1 read-only（不接受新寫入）
T+365 天  v1 完全移除
```

---

## 七、多 Tenant 隔離策略

### 7.1 強制 tenantId

每個 entity 必帶 `tenantId`，無 default。Repository 層強制：

```typescript
// ❌ BAD — 無 tenant scope
const calls = await callRepo.findByCustomer(customerId)

// ✅ GOOD — 強制 tenant scope
const calls = await callRepo.findByCustomer({ tenantId, customerId })
```

### 7.2 Adapter 與 Tenant 的關係

預設：1 adapter instance = 1 tenant。
特例：共享 adapter（如 OpenAI Gateway）服務多 tenant，內部以 tenant header 路由。

```yaml
adapters:
  pbx_3cx_eSun:
    type: 3cx
    tenantId: tnt_eSun        # 專屬玉山
    # ...

  ai_openai_shared:
    type: openai
    sharedAcrossTenants: true # 多 tenant 共用
    perTenantQuota:
      tnt_eSun: 1000000  # tokens/day
      tnt_demo: 10000
```

### 7.3 跨 tenant 查詢（Special Case）

只有 `system_admin` role 可跨 tenant 查詢，需顯式：

```typescript
await eventRepo.findAcrossTenants({
  type: 'call.recording.started',
  occurredAfter: yesterday,
  requiresPolicy: 'cross-tenant-audit-v1',  // 必須有 policy 授權
})
```

審計日誌記錄所有跨 tenant 查詢。

---

## 八、Adapter 開發者 Quickstart

### 8.1 寫一個新 PBX Adapter 的步驟

```typescript
// 1. 實作 PBXAdapter interface
import { PBXAdapter, Call, CallEvent, Tenant } from '@voxen/core'

class MyVendorAdapter implements PBXAdapter {

  // 2. Vendor → Canonical 翻譯
  private mapVendorCallToCanonical(vendorCall: VendorCall): Call {
    return {
      schemaVersion: 'v1',
      id: this.idGenerator.newCallId(),  // 注意：自發 ULID，不沿用 vendor ID
      tenantId: this.tenantId,
      externalIds: {
        [this.adapterId]: vendorCall.callId  // 保留原 ID
      },
      direction: this.mapDirection(vendorCall.type),
      caller: {
        phoneNumber: this.normalizePhone(vendorCall.from)
      },
      callee: {
        extension: vendorCall.to
      },
      state: this.mapState(vendorCall.state),
      timeline: [],  // 從 event stream 累積
      ringingAt: vendorCall.ringingAt,
      sourceAdapterId: this.adapterId,
    }
  }

  // 3. 訂閱 vendor 事件，翻譯後 emit 到 VOXEN bus
  async subscribe(handler: EventHandler): Promise<Subscription> {
    return this.vendorClient.onEvent((vendorEvent) => {
      const canonicalEvent = this.mapEvent(vendorEvent)
      handler(canonicalEvent)
    })
  }

  // 4. 接收 VOXEN command，翻譯後呼叫 vendor API
  async makeCall(from: string, to: string): Promise<CallId> {
    const vendorResponse = await this.vendorClient.placeCall({
      caller: from,
      callee: to,
    })
    return this.idGenerator.newCallId()  // VOXEN 自發 ID
  }

  // 5. Health check
  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: await this.vendorClient.ping(),
      supportedSchemas: {
        Call: ['v1'],
        Agent: ['v1'],
      }
    }
  }
}
```

### 8.2 Phone Number 正規化（共用 utility）

VOXEN 一律用 E.164 格式：`+886912345678`（無空格、無連字號）。

```typescript
import { normalizePhone } from '@voxen/core/utils'

normalizePhone('0912345678')              // → '+886912345678'
normalizePhone('+886-912-345-678')        // → '+886912345678'
normalizePhone('+1 (415) 555-1234')       // → '+14155551234'
```

### 8.3 必填欄位 validation

每個 adapter 寫入 canonical 時，core 會跑 schema validation：

```typescript
import { CallSchema } from '@voxen/core/schemas'

const result = CallSchema.safeParse(canonicalCall)
if (!result.success) {
  throw new InvalidCanonicalDataError(result.error)
}
```

Schema 用 Zod / io-ts 實作（待選型），給型別 + runtime 雙保險。

---

## 九、Anti-Patterns

### 9.1 ❌ 在 core 看到 vendor 名詞

```typescript
// ❌ BAD
function chargeForCall(call: Call) {
  if (call.threeCxAccountCode) {       // ← 不要！
    // ...
  }
}

// ✅ GOOD
function chargeForCall(call: Call) {
  const accountCode = call.metadata?.accountCode  // 從 canonical metadata 取
}
```

### 9.2 ❌ 沿用 vendor 的 ID 當 canonical ID

```typescript
// ❌ BAD
const canonicalCall: Call = {
  id: vendor3cxCall.guid,        // ← 不要！
  // ...
}

// ✅ GOOD
const canonicalCall: Call = {
  id: idGenerator.newCallId(),
  externalIds: { '3cx': vendor3cxCall.guid },
  // ...
}
```

### 9.3 ❌ 把 metadata 當公用欄位用

```typescript
// ❌ BAD — 業務邏輯讀 metadata
if (call.metadata?.priority === 'vip') {
  routeToVipQueue(call)
}

// ✅ GOOD — 加正式 canonical 欄位
interface Call {
  // ...
  priority?: 'standard' | 'high' | 'vip'  // 加到 canonical
}
```

### 9.4 ❌ 直接修改 timeline（必須 append-only）

```typescript
// ❌ BAD
call.timeline = call.timeline.filter(e => e.type !== 'call.error')  // 刪了某個 event

// ✅ GOOD
call.timeline.push({
  timestamp: now(),
  type: 'call.error.acknowledged',
  payload: { acknowledgedBy: userId },
})
```

### 9.5 ❌ 跨 entity 內嵌完整物件（要用 reference）

```typescript
// ❌ BAD — Call 內嵌完整 Agent
interface Call {
  agent?: Agent  // 整個 Agent 物件
}

// ✅ GOOD — Call 只存 reference
interface Call {
  callee: { agentId?: AgentId }
}

// 需要 Agent 詳情時 join
const agent = await agentRepo.findById(call.callee.agentId)
```

---

## 十、與 SRS Ch 13 的對應

| SRS Ch 13 章節 | 本文件對應段 | 備註 |
|---|---|---|
| 13.1 資料模型總覽 | 三、八大核心 Entity | SRS 給概念，本文件給 TypeScript |
| 13.2 識別碼策略 | 五、ID 與識別碼策略 | 補上 ULID prefix table |
| 13.3 主要實體（Call/Agent...） | 3.5 Call、3.2 Agent... | 完整 interface 定義 |
| 13.4 資料生命週期 | 3.6 Recording 的 retentionPolicy | 含金管會 H113-04 對應 |
| 13.5 多 Tenant 隔離 | 七、多 Tenant 隔離策略 | 補上 cross-tenant 查詢 policy |
| 13.6 資料品質 | 八、Adapter 開發者 Quickstart | Schema validation 機制 |

**結論**：SRS Ch 13 是「規格層」，本文件是「實作層」。當兩者衝突時，**本文件優先**（因為更貼近 code），但需同步更新 SRS。

---

## 十一、待決事項（Open Questions）

| # | 議題 | 影響 | 預計決策時間 |
|---|---|---|---|
| 1 | Schema validation library 選型（Zod / io-ts / ajv） | adapter 寫法 | 2026-05 |
| 2 | Event bus 技術選型（NATS / Kafka / RabbitMQ / Redis Streams） | event 投遞延遲 / 持久化 | 2026-05 |
| 3 | Customer entity 完整定義（屬於 Customer Engagement domain） | 跨 sub-domain 引用一致性 | 2026-Q3 |
| 4 | AI sub-domain 的 canonical（KnowledgeChunk / AgentSession） | Copilot Phase II 整合 | 2026-Q3 |
| 5 | Multi-region 部署時 ULID 的 monotonicity | 跨 region event 排序 | 2026-Q4 |

---

## 文件版本

| 版本 | 日期 | 變更 |
|---|---|---|
| v0.1 | 2026-04-26 | 初版，8 個核心 entity + vendor mapping + ID 策略 + 版本演進 |

**下次更新觸發**：
- 第一個 adapter 實作完成 → 把實戰學到的 corner case 補入 anti-patterns
- 新增 Customer Engagement / AI sub-domain canonical → 補入「二、設計原則 §2.4 Bounded Context」
- Open Questions 任一項決議 → 更新對應段並關閉條目
