# VOXEN 整合架構 — 既有系統怎麼掛進 VOXEN

**版本**：v0.1
**日期**：2026-04-26
**用途**：定義 VOXEN 與外部系統（PBX、CRM、AD、AI 服務、業務系統）整合的通用 pattern。新增任何一個 adapter 都應依此文件設計。
**主例**：3CX IVR 整合（其他 adapter 比照辦理）

---

## 一、VOXEN 整合哲學（三句話）

1. **VOXEN 是「中介層」，不是「替換層」** — 既有系統能用就讓它繼續用，VOXEN 透過 adapter 介接它，不要求對方改 code
2. **Adapter 是邊界翻譯機** — 把 vendor-specific（3CX-specific、Teams-specific）的事件 / 命令翻譯成 VOXEN canonical model，core 層看到的世界永遠一致
3. **事件驅動 + 命令式 RPC 雙軌** — 上行用 event（adapter → VOXEN bus），下行用 command（VOXEN → adapter），互不混淆

---

## 二、整合的四個層次

任何外部系統跟 VOXEN 介接，都會落在以下 1-4 層的某幾個層次：

```
┌─────────────────────────────────────────────────────┐
│  L4  AI 層 — 共用 LLM / STT / TTS                    │  AI 服務
│      （致行 voice bot 需要這層）                      │
├─────────────────────────────────────────────────────┤
│  L3  資料層 — Customer 360 / CDR / Recording 共享     │  CRM / NAS / Vector DB
├─────────────────────────────────────────────────────┤
│  L2  控制層 — Call Control API / Webhook / RPC        │  Adapter 主戰場
│      （IVR 路由決策、Hot-desking、Whisper 觸發）       │
├─────────────────────────────────────────────────────┤
│  L1  訊號 / 媒體層 — SIP / RTP / WebRTC               │  PBX 自己處理
│      （VOXEN 通常不碰這層，由 3CX 處理）               │
└─────────────────────────────────────────────────────┘
```

**重要原則**：能用 L1（讓 PBX 自己處理）就不要拉到 L2 或 L3。
拉得越上層，VOXEN 的責任越大，效能 / 穩定度的責任也越重。

---

## 三、3CX IVR 整合的五種模式（從淺到深）

以「玉山外撥客戶接起 → IVR 詢問身份 → 路由到對應業務群」為例：

### 模式 1：Passive Listening（被動監聽，最淺）

```
客戶  ─┐
       ├──→  3CX IVR 自己跑（不變）  ──→ 業務群分機
3CX  ──┘                  │
                          │ events 流出
                          ↓
                  ┌───────────────┐
                  │ VOXEN 編排層  │  訂閱：call.*, ivr.*
                  │  (passive)   │  動作：寫入 customer 360 / 報表
                  └───────────────┘
```

- **VOXEN 角色**：訂閱者（observer）
- **3CX 設定**：沒有改動，IVR 流程跑既有設定
- **整合介面**：3CX Call Control API v2 的 event stream（WebSocket）
- **適用情境**：玉山現有 IVR 已經夠好，VOXEN 只想加觀測 / 報表 / 客戶 360 同步
- **延遲**：低（毫秒級）
- **VOXEN 失效時**：3CX 完全不受影響

### 模式 2：Active Routing（主動路由）

```
客戶  ─→  3CX IVR  ─→ "Forward to URL" ─→ VOXEN 編排層
                                              │
                          ┌───────────────────┘
                          ↓
                       決策（Last-Agent、技能、優先級）
                          │
                          ↓ HTTP response 回 3CX
3CX  ──→ "Transfer to extension/queue" ──→ 業務群
```

- **VOXEN 角色**：路由決策者
- **3CX 設定**：IVR 某節點設定 `HTTP Action` 指到 VOXEN endpoint
- **整合介面**：HTTP REST（VOXEN 提供 `/route-decision` endpoint）
- **適用情境**：複雜路由 — Last-Agent Routing、客戶優先級、跨群組負載平衡
- **延遲**：50-200ms（HTTP round-trip）
- **VOXEN 失效時**：要設 fallback — 3CX 走預設路由（例如 round-robin）

### 模式 3：Dynamic IVR Generation（動態生成 IVR）

```
業務需求 ──→ VOXEN ──→ 3CX Management API ──→ 動態建立/修改 IVR
                                                      ↓
                                              IVR 生效供呼叫
```

- **VOXEN 角色**：IVR 生成 / 編輯者
- **3CX 設定**：VOXEN 透過 admin API 寫 IVR config
- **整合介面**：3CX Management REST API
- **適用情境**：行銷 campaign 動態 IVR、A/B test、夜間 / 假日 IVR 自動切換
- **延遲**：N/A（離線設定，不影響通話延遲）
- **風險**：IVR 設定錯誤會影響真實業務，必須有 staging 驗證

### 模式 4：Voice Bot Replacement（致行接手 IVR 節點）

```
客戶  ─→  3CX IVR
              │
              ├─→ 「按 1」     ─→ 既有業務群
              ├─→ 「按 2」     ─→ 既有業務群
              └─→ 「按 9 或說話」 ─→ Forward to 致行 Bot
                                          │
                                          ↓
                                  致行 (VOXEN 內) 對話
                                          │
                                          ↓ 結束後可 ↘
                                      Transfer 回 3CX 業務群
```

- **VOXEN 角色**：對話 handler（致行 Bot 在 VOXEN 內）
- **3CX 設定**：IVR 某節點 forward 到 致行 SIP endpoint
- **整合介面**：SIP（致行作為 SIP UA 接通話）+ VOXEN 內部 event bus
- **適用情境**：客戶不想按鍵想用講的、IVR 樹太深想簡化
- **延遲**：致行回應 1-2 秒（含 ASR + LLM + TTS）
- **失效**：致行掛了 → IVR 走 fallback 節點（轉真人）

### 模式 5：Hybrid Orchestration（VOXEN 編排層接管）

```
客戶  ─→  VOXEN 編排層 (作為 SIP B2BUA)
              │
              ├─→ 部分流程：致行 Bot 對話
              ├─→ 部分流程：傳統 IVR menu
              ├─→ 部分流程：直接轉真人
              └─→ 整通話的 state 由 VOXEN 維持
                                          │
                          所有元件 ←─────┘─────→ 客戶
                          (3CX、致行、真人)
```

- **VOXEN 角色**：通話的 master controller，3CX 只負責 SIP/RTP 訊令
- **3CX 設定**：所有外撥 / 進線都先到 VOXEN 編排層
- **整合介面**：SIP B2BUA + Call Control API + 內部 orchestration engine
- **適用情境**：複雜業務（多階驗證、AI 助理、真人協作三段式）— 對應E.SUN Outreach Project Demo 1
- **延遲**：跟通話本身的延遲一致
- **失效**：VOXEN 編排層必須 HA + 高度穩定 — 等於從「中介」變「核心」，責任最大

---

## 四、選擇模式的決策矩陣

```
                          需要 VOXEN 介入越深 →
              ┌─────────────────────────────────────────┐
   失敗風險   │  M1 Passive  │ M2 Active  │ M3 Dynamic │
   越低 ↑    │  ━━━━━━━━━━ │ ━━━━━━━━  │ ━━━━━━━━  │
              │  M4 Voice Bot │ M5 Hybrid Orchestration │
              └─────────────────────────────────────────┘

                  選擇原則
   ┌─────────────────────────────────────────┐
   │ 1. 從最淺的模式開始（M1）               │
   │ 2. 確認業務需求真的需要更深，再升級     │
   │ 3. 不要「為了用 VOXEN 而 over-engineer」 │
   │ 4. 有 fallback 才能升到 M2 以上         │
   └─────────────────────────────────────────┘
```

**E.SUN Outreach Project的選擇**：以 M2 + M4 為主（路由由 VOXEN 決策、致行 Bot 接手 IVR 開頭部分），M5 留給未來 phase。

---

## 五、Adapter 通用設計框架（contract-first）

以下是任何新 adapter（不只 PBX、也包含 CRM / AD / NAS / AI）的通用契約。

### 5.1 抽象介面（VOXEN core 定義）

```typescript
// VOXEN/core/contracts/Adapter.ts

interface Adapter<TConfig, TEvent, TCommand, TState> {
  // 生命週期
  initialize(config: TConfig): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  healthCheck(): Promise<HealthStatus>

  // 上行：訂閱外部系統的事件
  subscribe(filter: EventFilter, handler: (event: TEvent) => void): Subscription

  // 下行：對外部系統下命令
  execute(command: TCommand): Promise<CommandResult>

  // 查詢：取得當前狀態
  query<R>(query: TStateQuery): Promise<R>
}

// 子類型：PBX adapter
interface PBXAdapter extends Adapter<PBXConfig, CallEvent, PBXCommand, PBXState> {
  // PBX-specific：通話控制
  makeCall(from: string, to: string, options?: CallOptions): Promise<CallId>
  transferCall(callId: CallId, target: string): Promise<void>
  hangupCall(callId: CallId): Promise<void>

  // IVR 相關
  injectIVRDecision(callId: CallId, decision: IVRDecision): Promise<void>
  queryIVRState(callId: CallId): Promise<IVRState>
}
```

### 5.2 Canonical Data Model（VOXEN 內部統一格式）

```typescript
// VOXEN/core/models/Call.ts

interface Call {
  id: CallId                    // VOXEN 自產 UUID
  externalId: string            // 3CX 的 Call ID（保留以便 trace）
  source: 'inbound' | 'outbound'
  caller: { phoneNumber: string, customerId?: string }
  callee: { extension?: string, agentId?: string, queueId?: string }
  state: CallState              // 標準化的 state machine
  timeline: CallEvent[]         // 所有 event 的歷史
  metadata: Record<string, any> // 自由欄位
}

enum CallState {
  Ringing, Answered, OnHold, IVR, BotInteraction,
  AgentInteraction, Transferring, Ended
}

interface CallEvent {
  type: string                  // 'call.ringing', 'call.ivr.option_selected'...
  timestamp: ISODateTime
  payload: any
  source: AdapterId
}
```

**重要**：`Call` 不知道下面是 3CX 還是 Teams 還是 Avaya — 這是 VOXEN core 的核心抽象。

### 5.3 Event Taxonomy（事件命名規範）

統一命名讓不同 adapter 的事件可被 VOXEN core 一致處理：

| Event 類別 | 範例 |
|-----------|------|
| `call.*` | `call.ringing`, `call.answered`, `call.hangup`, `call.transferred` |
| `call.ivr.*` | `call.ivr.entered`, `call.ivr.option_selected`, `call.ivr.exited` |
| `call.bot.*` | `call.bot.started`, `call.bot.utterance`, `call.bot.intent_detected` |
| `call.agent.*` | `call.agent.assigned`, `call.agent.whisper`, `call.agent.bargein` |
| `call.recording.*` | `call.recording.started`, `call.recording.paused`, `call.recording.stopped` |
| `agent.*` | `agent.login`, `agent.logout`, `agent.status_changed` |
| `customer.*` | `customer.identified`, `customer.profile_updated` |

### 5.4 配置（Declarative）

```yaml
# VOXEN/config/adapters.eSun.yaml

adapters:
  pbx_3cx_eSun:
    type: 3cx
    version: v20-update-8
    endpoint:
      url: https://eSun-pbx.voxen.local:5001
      auth: oauth2
      credentials_ref: vault://eSun/3cx-pbx
    events_subscribed:
      - call.*
      - agent.*
    commands_allowed:
      - makeCall
      - transferCall
      - hangupCall
      - injectIVRDecision
    health_check:
      interval: 30s
      timeout: 5s
    retry:
      max_attempts: 3
      backoff: exponential

  crm_eSun:
    type: rest_api_generic
    base_url: https://eSun-crm.intranet.local/api/v2
    auth: bearer_token
    credentials_ref: vault://eSun/crm
    cache_ttl: 60s
```

---

## 六、從零實作一個整合 — 7 步 checklist

新增任何一個 adapter（不只 IVR），按以下步驟：

```
□ 1. 釐清業務需求 — 落在 L1/L2/L3/L4 哪一層？選哪個整合模式（M1-M5）？
□ 2. 寫 contract — 定義這個 adapter 的 Config / Event / Command / State type
□ 3. Canonical 對映 — 對應到 VOXEN canonical model（Call / Agent / Customer）
□ 4. 實作 adapter — 翻譯機本體（vendor-specific ↔ canonical）
□ 5. 加 health check / fallback / retry
□ 6. 寫整合測試（mock vendor 環境 + 實機環境兩套）
□ 7. 加 observability（logs、metrics、traces）
```

每步都用 git PR 隔離，方便 review。

---

## 七、3CX IVR 整合 — 具體實作骨架

以「模式 2：Active Routing」為例，完整 code skeleton：

### 7.1 在 3CX admin 設定 IVR

```
IVR 名稱: eSun-Outbound-Routing
IVR 結構:
  └─ Welcome Prompt
     └─ HTTP Action
        URL: https://voxen-orch.eSun.local/api/v1/route
        Method: POST
        Body: { callId: %CALLID%, caller: %CALLERID%, dialed: %DIALEDNUMBER% }
        Wait for response: max 5 seconds
        On response: Forward to extension {response.extension}
        On timeout: Forward to extension 8001 (default queue)
```

### 7.2 VOXEN 編排層接收 webhook

```typescript
// VOXEN/integrations/pbx/3cx/IVRRouteHandler.ts

import { CallId, RouteDecision, Customer360Service, RoutingEngine } from '@voxen/core'

@Controller('/api/v1/route')
export class IVRRouteHandler {

  constructor(
    private customer360: Customer360Service,
    private routingEngine: RoutingEngine,
    private eventBus: EventBus
  ) {}

  @Post()
  async route(@Body() req: RouteRequest): Promise<RouteResponse> {
    // 1. Emit 事件到 VOXEN bus
    await this.eventBus.emit('call.ivr.routing_requested', {
      callId: req.callId,
      caller: req.caller,
      dialed: req.dialed
    })

    // 2. 拉客戶 360（從 CRM adapter）
    const customer = await this.customer360.lookup(req.caller)

    // 3. 跑路由引擎（Last-Agent / 技能群 / 優先級）
    const decision: RouteDecision = await this.routingEngine.decide({
      caller: req.caller,
      customer,
      dialed: req.dialed,
      timeOfDay: new Date()
    })

    // 4. 回應 3CX
    return {
      extension: decision.targetExtension,
      reason: decision.reasoning  // 給 3CX log 用
    }
  }
}
```

### 7.3 設 fallback 與 health check

```typescript
// VOXEN/integrations/pbx/3cx/3CXAdapter.ts

class ThreeCXAdapter implements PBXAdapter {

  async healthCheck(): Promise<HealthStatus> {
    try {
      // 透過 3CX Management API 檢查 PBX 狀態
      const status = await this.callControlApi.getSystemStatus()
      return { healthy: status.allServicesUp, details: status }
    } catch (err) {
      return { healthy: false, error: err.message }
    }
  }

  // ...其他 methods
}

// VOXEN core 定期跑 health check
// 若 3CX adapter unhealthy → 編排層自動進入 degradation mode
//   → IVR 的 HTTP Action timeout → 走 3CX 的 default route（不依賴 VOXEN）
```

### 7.4 觀測（Prometheus metrics）

```typescript
import { Counter, Histogram } from 'prom-client'

const ivrRoutingRequests = new Counter({
  name: 'voxen_ivr_routing_requests_total',
  help: 'IVR routing requests received',
  labelNames: ['adapter', 'result']
})

const ivrRoutingDuration = new Histogram({
  name: 'voxen_ivr_routing_duration_seconds',
  help: 'IVR routing decision latency',
  labelNames: ['adapter']
})

// 在 IVRRouteHandler 裡用：
const timer = ivrRoutingDuration.startTimer({ adapter: '3cx' })
const decision = await this.routingEngine.decide(...)
timer()
ivrRoutingRequests.inc({ adapter: '3cx', result: 'success' })
```

---

## 八、其他 adapter 套用同一框架

| 外部系統 | 整合層 | 推薦模式 | Adapter 路徑 |
|---------|-------|---------|-------------|
| **3CX IVR** | L2（控制） | M1+M2+M4 混搭 | `integrations/pbx/3cx/` |
| **Teams Phone** | L2 | M1+M2 | `integrations/pbx/teams-phone/` |
| **Genesys**（替代前的並行） | L2 | M1（只訂閱） | `integrations/pbx/genesys/` |
| **OPEN/TeleSA** | L2+L3 | webhook + REST | `integrations/business/open-telesa/` |
| **玉山 NAS（錄音）** | L3（資料） | SMB/NFS write | `integrations/storage/smb/` |
| **玉山 AD/SSO** | L2 | LDAP / OAuth2 | `integrations/identity/ldap/` |
| **玉山 CRM** | L3 | REST polling + webhook | `integrations/crm/eSun-crm/` |
| **Azure OpenAI** | L4 | REST + streaming | `integrations/ai/azure-openai/` |
| **Azure Speech (STT/TTS)** | L4 | gRPC | `integrations/ai/azure-speech/` |
| **本地 Whisper** | L4 | local API | `integrations/ai/whisper-local/` |
| **致行 Voice Bot** | L4 | SIP + gRPC | `integrations/ai/chy-voicebot/` |

每個 adapter 都按「五-七節」的 contract-first → 7 步 checklist 走，不要 ad-hoc。

---

## 九、整合 anti-patterns（不要這樣做）

### ❌ 在 VOXEN core 寫 vendor-specific 邏輯

```typescript
// ❌ BAD
if (call.adapterType === '3cx') {
  // 3CX 特有邏輯
} else if (call.adapterType === 'teams') {
  // Teams 特有邏輯
}
```

→ Vendor-specific 邏輯應該封在 adapter 層，core 看到的應該都是 canonical model。

### ❌ Adapter 直接呼叫其他 adapter

```typescript
// ❌ BAD — 3CX adapter 直接 call CRM adapter
class ThreeCXAdapter {
  async handleCallRinging(call: Call) {
    const customer = await this.crmAdapter.lookup(call.caller)  // ❌
  }
}
```

→ Adapter 之間透過 event bus 解耦，避免 N×N 依賴。

### ❌ 把整合邏輯寫在 IVR / 3CX admin

```yaml
# ❌ BAD — IVR 直接呼叫 CRM
3CX IVR Action: HTTP call to https://crm.eSun.local/customer-lookup
```

→ 應該透過 VOXEN 編排層中介，避免 IVR 直接知道 CRM 的存在。

### ❌ Sync 阻塞外部呼叫

```typescript
// ❌ BAD — IVR webhook 等 5 秒做 LLM 推論
@Post()
async route(req) {
  const llmDecision = await this.llm.complete(req)  // 5 秒
  return { extension: llmDecision.extension }
}
```

→ 同步路徑只做毫秒級決策，需要 LLM 等慢的處理交給後台 async 跑。

---

## 十、開發優先建議

依「對E.SUN Outreach Project推進的幫助度」排序：

1. **VOXEN core 的 Adapter contract + Event bus** — 一切的基礎，先寫
2. **3CX Adapter (PBX) — M1 Passive + M2 Active Routing** — E.SUN Outreach Project核心
3. **OPEN/TeleSA Adapter** — 玉山現有資產的接入
4. **AD/SSO Adapter (LDAP)** — 認證打通
5. **CRM Adapter** — Customer 360 拉資料
6. **致行 Voice Bot Adapter** — Demo 1 場景
7. **NAS Storage Adapter** — 錄音歸檔
8. **AI Adapter (Azure OpenAI / Whisper)** — Bot 後端

---

## 文件版本

| 版本 | 日期 | 變更 |
|------|------|------|
| v0.1 | 2026-04-26 | 初版，3CX IVR 為主例 |

**下次更新觸發**：
- 第一個 adapter 實作完成後 → 把實戰學到的補入「7 步 checklist」與「anti-patterns」
- 新增 PBX adapter（如 Teams Phone）時 → 在「八、其他 adapter」段補對映表
- VOXEN core contract 變動時 → 同步更新「五、5.1 抽象介面」段
