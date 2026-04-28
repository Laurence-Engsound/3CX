# VOXEN Platform — 工作紀錄

> 此文件按時序記錄 VOXEN 平台 + E.SUN Outreach Project的工作項目與里程碑。
>
> **維護方式**：每完成一個重要 milestone 或產出新的 deliverable 時，於本文檔最上方對應的日期區塊新增條目。新一日工作開始時，於最上方新增 `## YYYY-MM-DD` 標題。
>
> 時間以 24 小時制記錄（瑛聲總部時區）。

---

## 整體里程碑摘要

| 階段 | 日期 | 狀態 | 主要產出 |
|---|---|---|---|
| **VOXEN SRS v3.0** | Pre-2026-04-25 | ✅ 完成 | 35 章 + 7 附錄 + 12 架構圖 |
| **E.SUN Outreach Project SOW 迭代 v0.1 → v0.6** | 2026-04-26 上午 | ✅ 完成 | 14 主章 + 4 附錄 docx + PDF |
| **E.SUN Outreach Project Pitch + 配套 (One-Pager / Q&A / TCO)** | 2026-04-26 中午 | ✅ 完成 | 25 頁 Pitch + Speaker Notes + 浮水印 PDF |
| **Dry Run / Demo Runbook / POC 準備** | 2026-04-26 下午 | ✅ 完成 | 排練手冊 + 4 demo runbook + lab 拓樸 |
| **玉山 Outreach Email + 議程** | 2026-04-26 下午 | ✅ 完成 | 待 Laurence 寄出 |
| **VOXEN 整合架構文件** | 2026-04-26 下午-晚間 | ✅ 完成 | INTEGRATION-PATTERNS + CANONICAL-MODEL + RESOURCE-INVENTORY |
| **VOXEN 平台 scaffold (P0–P5)** | 2026-04-26 晚間 | ✅ 完成 | monorepo + @voxen/core + @voxen/pbx-3cx，**37/37 tests 在 Mac 跑通** |
| **eSun → ESUN 命名正名 + GitHub repo rename** | 2026-04-27 | ✅ 完成 | 130 處 text + 18 檔 + 1 資料夾；GitHub `3CX` → `VOXEN` |
| **VOXEN scaffold push GitHub** | 2026-04-27 | ✅ 完成 | github.com/Laurence-Engsound/VOXEN (private) |
| **VOXEN P6 — L5 Customer-360 service + crm-mock** | 2026-04-27 | ✅ 完成 | 第一個 L5 service；雙 contract pattern 驗證；**59/59 tests** |
| **ada Phase 6 — Charter + ADR-0002 + PLAN v2** | 2026-04-27 | ✅ 完成 | ada 升格為 VOXEN L6 reference application |
| **ada Phase 6 W1D1-D5 — VOXEN platform 真實連線** | 2026-04-28 上午 | ✅ 完成 | ada → @voxen/* → real 3CX V20 (HTTP + WS 雙綠) |
| **M2 Active Routing webhook** | TBD | ⏳ 下一站 | 3CX IVR Forward to URL handler |
| **OPEN/TeleSA Adapter** | TBD | ⏳ 排程中 | 玉山現有資產接入 |
| **ada Phase 6 W1D6 → W2D7 — Bar 完整鏈路 + ⭐ MVP demo milestone** | 2026-04-28 上午 | ✅ 完成 | Week 1+2 一日連衝完成；charter T+14 → 實際 T+0；W2-ACCEPTANCE.md 驗收通過 |
| **Production Event Bus** | TBD | ⏳ 排程中 | NATS / Kafka / Redis Streams 選型 |
| **玉山 Phase 6 Pilot** | 2026-05 ~ 06 | 🟡 等簽約 | 30-50 席 Pilot 上線 |
| **玉山 Phase 6 Go-live** | 2026-06-30 | 🟡 排程 | 450 席全量切換 |

---

## 2026-04-28（ada Phase 6 Week 1+2 完整連衝 — ⭐ MVP demo milestone 達成 14× 提前）

### 上午 08:30 → 11:30 ｜ ada Phase 6 W1D6 → W2D7 一日衝完 9 天份進度

| 時間 | 動作 | 產出 |
|---|---|---|
| 08:30 | **W1D6** — ada main subscribe EventBus '*'，每筆 canonical event console log | (in voxenIntegration.ts) |
| 08:50 | **W1D7** — Softphone Bar 視窗骨架（820×40 frameless always-on-top, screen-saver z-order）+ bar.html 獨立 entry + Vue3 BarView 第一刀 | barWindow.ts / bar.html / bar-main.ts / BarView.vue |
| | ↳ 三輪 UX 修：寬度 600→820、`<button>` 取代 `<span>`、explicit `<div class="drag-handle">` 解 6 buttons + draggable 並存問題 | — |
| 09:15 | **W2D1** — main → Bar IPC 橋接（'voxen:event' channel 經 contextBridge 暴露 `window.voxen.onEvent`）；evt counter 即時跳動 | preload + ipc-api 加 VoxenApi |
| 09:35 | **W2D2** — 接 `@voxen/crm-mock` + `Customer360Service`；boot 後 3 秒 synthetic lookup 王先生 → 推 customer card 到 Bar | setupCustomer360() in voxenIntegration |
| 09:55 | **W2D3** — event buffer (50 events ring) 解「Bar mount 在 system.adapter.started 之後 evt=0」；EventBus subscriber 加 call.* → 自動 Customer-360 lookup | replay on did-finish-load |
| 10:15 | **W2D4** — Bar 6 button 全部接通 `window.voxen.invokeBarAction(action)` → `ipcMain.handle('voxen:invoke-action')` → PBXAdapter (transfer 已存在) 或 stub log；Bar 加 `act` debug cell 顯示 ok/err | shared/ipc-api 加 BarAction type |
| 10:35 | **W2D5** — `src/main/phone.ts` 純函式 `normalizePhoneTW`：E.164/TW intl/local 09xx/landline/SIP+tel URI/extension 過濾；**22/22 smoke test 過**；voxenIntegration 加 `lastCustomerProfile` 一格快取，setBarWindow did-finish-load 重播（Bar 重開後客戶卡立刻回來）| phone.ts + test/phone.smoke.mjs |
| 10:50 | **W2D6** — BarView 從 3 態硬編 → 5 態 state machine（`offline/ready/ringing/busy/acw`）；純函式 `applyEventToStatus` 18 條轉換；ringing 黃色 1Hz 脈動動畫；ACW 5s timer auto→ready；**18/18 FSM smoke test 過** | BarView.vue (+90) + test/bar-status-fsm.smoke.mjs |
| 11:15 | **W2D7** — synthetic call-flow driver `src/main/demoEvents.ts`（VOXEN_DEMO_FLOW=1 啟動，63s 跑完王先生 + 李太太 兩 case）；`docs/W2-ACCEPTANCE.md` 完整驗收報告（5-min screencast runbook 含時間軸） | demoEvents.ts + W2-ACCEPTANCE.md |
| 11:30 | 🎉 **Week 2 MVP demo milestone 達成** — Charter 預估 T+14（2026-05-12），實際 T+0；驗收 3 項：玉山 10 客戶 ✅ / 通話 5 動作 IPC ✅（contract 擴充 W3+）/ 5 分鐘可開展示 ✅ | — |

### 今日技術突破（W1D6 → W2D7）

1. **Vite multi-entry frameless window** — `bar.html` 獨立 input 繞過 App.vue 的 router redirect 與 layout 干擾；preload 共用，window-scoped 邏輯走 `window.voxen.*`
2. **Drag region + clickable button 並存** — 整 bar `-webkit-app-region: drag`，`.actions/.action-btn` opt-out `no-drag`，explicit `<div class="drag-handle">` 占滿剩餘空間（解了「找不到地方拖」）
3. **Late-mount race condition 雙料解法** — event ring buffer (50) + lastCustomerProfile 一格快取，都在 `did-finish-load` 重播（Bar 在 system.adapter.started 之後才掛上、客戶卡在電話進行中重開 Bar 都不再消失）
4. **Phone normalization 兩相設計** — `@voxen/core/utils/phone` 是「knowingly phone, throw on invalid」；ada/main/phone.ts 是「unknown payload, return null」（IPC event payload 不可信）。Code comment 說明關係，避免重複/漂移
5. **State machine 用純函式** — `applyEventToStatus(prev, event) → next` 完全 side-effect free，可單獨拿出來跑 18-case smoke test 不用 JSDOM
6. **Synthetic event driver = 銷售級利器** — `VOXEN_DEMO_FLOW=1 pnpm dev` 63 秒可跑完整 demo（包含 hold/unhold/abandoned/ACW timer），不用協調活線路。Pitch deck 直接配影片

### 關鍵架構價值

- **VOXEN 標準路徑全程驗證**：platform → IPC → renderer 全綠，跨 PBX 換 adapter 完全不影響上層
- **Charter 8 週路線圖第 2 週 ⭐ MVP milestone 從 T+14 提前到 T+0 — 14× 加速**
- **ada bundle 含 @voxen/* + ws + crm-mock** — VOXEN platform 跟 ada 一起 ship，後續開源也是同一 bundle
- **Customer-360 全鏈路證明**：crm-mock 10 玉山客戶 → phone normalize → Customer360Service → IPC → Bar 渲染卡片，整條沒有手動接線

### 早晨 06:00 → 06:35 ｜ 開機儀式 + dev-server fix

| 時間 | 動作 | 產出 |
|---|---|---|
| 06:00 | 早安 + VOX/ZEN 哲學儀式（每日例行）| — |
| 06:30 | 發現 dashboard 點 .md 連結中文亂碼（python http.server 沒送 utf-8 charset） | 診斷 |
| 06:35 | 寫 `tools/dev-server.py` — 取代 http.server，14 種 text 檔強制 utf-8 + no-cache | commit `b747dbb` |

### 早晨 06:35 → 08:05 ｜ ada Phase 6 Week 1 連衝 5 天進度

| 時間 | 動作 | 產出 |
|---|---|---|
| 06:50 | **W1D1** — ada 接 pnpm monorepo + 加 `@voxen/core` + `@voxen/pbx-3cx` deps | commit `9332b9f` |
| | ↳ 順手修 3 個 pre-existing typecheck bug（`webview-preload` DOM lib / `NodeJS.Platform` / settings type cast） | — |
| 07:00 | **W1D2** — `voxenIntegration.ts` 第一個真實 `@voxen/*` import + `InProcessEventBus` 實例化；vite config 排除 `@voxen/*` from externalize（解決 ESM/CJS 衝突）| commit `c33f335` |
| 07:08 | **W1D3** — 從 ada settings 讀 profile，組 `ThreeCXAdapterConfig`，實例化 `ThreeCXAdapter`（不啟動，待 token） | commit `b589f5d` |
| 07:25 | **W1D4** — main 端自己跑 OAuth（從 keychain 讀 clientSecret → POST `/connect/token` → access_token）| commit `b28f11a` |
| | ↳ 嘗試 `adapter.start()` 撞到三道牆：WebSocket global 不存在 / ws optional deps (bufferutil) / mock-only WS path → 標 W1D5 | — |
| 07:45 | **W1D5** — 在 `@voxen/pbx-3cx` 加 `wsHeaders` config (Bearer 走 Upgrade header)、constructor safety net 'error' listener、ThreeCXAdapter 訂 client error → republish 為 `system.adapter.error` 事件 | commit `2f99aab` |
| 07:55 | **W1D5 收尾** — 修 `pingPath` config + 順手修發現的 HTTPS-blind bug（`node:http.request` → `fetch`）| commit `15eb537` |
| 08:03 | 🎉 **healthCheck 全綠**：`httpReachable: true` + `wsConnected: true` — ada → @voxen/pbx-3cx → real 3CX V20 雙通道完整 | — |

### 早晨 06:32 → 06:42 ｜ 玉山 outreach PDF 產出

| 時間 | 動作 | 產出 |
|---|---|---|
| 06:32 | Outreach readiness 盤點，所有 placeholder 待填 | — |
| 06:42 | `MEETING-AGENDA-PROPOSAL.pdf` 產出（pandoc → docx → LibreOffice，與既有 SOW PDF 同工作流）| `01-meeting-pack/MEETING-AGENDA-PROPOSAL.pdf` |

### 今日技術突破

1. **ESM/CJS 邊界** — `@voxen/*` workspace packages 是 pure ESM，但 ada main 是 CJS。修法：vite `externalizeDepsPlugin({ exclude: ['@voxen/core', '@voxen/pbx-3cx'] })`，bundling 時做 ESM→CJS 轉換
2. **Electron Node 20 沒有 WebSocket global** — `@voxen/pbx-3cx` 改 import `ws` 套件
3. **EventEmitter unhandled 'error' 會 crash main process** — `ThreeCXClient` constructor 加 default no-op error listener 當 safety net
4. **真 3CX V20 WebSocket 必須 Bearer in Upgrade header** — `ws` 套件支援 `new WebSocket(url, { headers: ... })`，比 ada 既有的 Electron webRequest hack 乾淨多了
5. **`node:http` HTTPS-blind** — `ThreeCXClient.requestJson()` 改用 `fetch`（順手解：未來所有 REST 命令對 HTTPS 3CX 才能成功）

### 影響

- VOXEN 平台**第一次**從「規格 + 測試」進入「production-grade L6 consumer 真實連線」
- 8 週 Charter 預估的 W2 ⭐ MVP demo milestone（「Ada/CRM + Softphone runnable」）— **Week 1 結束前已具備技術可行性**
- ada bundle 11 → 244 kB（@voxen/* + ws 進入二進位）— **VOXEN platform 真實隨 ada 出貨**

---

## 2026-04-27（VOXEN P6 + ada Phase 6 規劃）

### 早晨 → 中午 ｜ 玉山案命名正名 + GitHub 整理

| 時間 | 動作 | 產出 |
|---|---|---|
| 早上 | eSun → ESUN 全面正名 — 130 處 text + 18 個檔案 + 1 資料夾 (`docs/proposals/eSun/` → `esun-outreach-project/`) | rename script + commits |
| 中午 | VOXEN scaffold (P0-P5) + 玉山案資料夾首次 push GitHub | commit chain |
| 下午 | GitHub repo rename `Laurence-Engsound/3CX` → `Laurence-Engsound/VOXEN` | repo rename + 本地 origin 更新 |

### 下午 → 晚間 ｜ VOXEN P6 + ada Phase 6 規劃

| 時間 | 動作 | 產出 |
|---|---|---|
| 下午 | 架構大討論 — 4 層金字塔（L1 core / L2 adapters / L3 apps / L4 deployments）；Copilot for Genesys Lab 規劃（暫緩）；Pattern 1 monorepo + CODEOWNERS 拍板 | 對話記錄 |
| 晚間 | **VOXEN P6** — L5 Customer-360 service + `@voxen/crm-mock` adapter（10 玉山假客戶 + 30 CDR + last-agent map）；**59/59 tests 全綠**；驗證雙 contract pattern | commit `873390f` |
| 晚間 | **ada Phase 6 PROJECT-CHARTER + ADR-0002 + PHASE6-PLAN v2** — ada 升格為 VOXEN L6 reference application；8 週路線圖；Week 2 為 ⭐ MVP demo milestone | commit `83a4c35` |
| 晚間 | dashboard 加第 7 個 tab `ada Phase 6` — 倒數、8 週路線圖、success criteria、quick links | (在同一 commit) |

---

## 2026-04-26（從 SRS 到能跑的 code）

### 早晨 06:30 → 12:00 ｜ 玉山 SOW 迭代

| 時間 | 動作 | 產出 |
|---|---|---|
| 06:32 | SOW Draft v0.1（13 主章 + 4 附錄初版） | `archive/VOXEN-SOW-Draft-v0.1-ESUN.docx` |
| 09:52 | SOW v0.2 — 整合 Laurence 9 點修正（CTO→IT 團隊、FM-* codes、錄音介面歸屬等） | `archive/...v0.2.docx` |
| 10:09 | SOW v0.3 — Service Level & Support Architecture 章節擴展 | `archive/...v0.3.docx` |
| 10:21 | 設計簡介文件給插畫師（DESIGN-BRIEF） | `02-internal-prep/DESIGN-BRIEF-for-illustrator.md` |
| 10:23 | SOW v0.4 — 補完 TCO 5 年對比附錄 | `archive/...v0.4.docx` |
| 10:27 | Migration Strategy isometric prototype 草圖 | `diagrams/sow-fig-02-iso-prototype.svg` |
| 10:31 | Migration Strategy 正式版圖（三階段 Pilot/雙軌/切換） | `diagrams/sow-fig-02-migration-strategy.svg` |
| 10:33 | SOW v0.5 — 嵌入 isometric 圖、補入 Source Code Escrow 段 | `archive/...v0.5.docx` |
| 11:26 | Pitch Deck Prototype v0.1（3 頁試 玉山 視覺風格） | `archive/VOXEN-Pitch-ESUN-prototype-v0.1.pptx` |
| 11:56 | 4 個現場 Demo 腳本（致行外撥 / HA Failover / 主管介入 / Last-Agent） | `01-meeting-pack/DEMO-SCRIPT.md` |
| 11:57 | 整體架構圖（Fig 1，5 層整合，玉山 teal palette） | `diagrams/sow-fig-01-architecture.svg` |
| 11:58 | **SOW v0.6 — 最終版**（recolored 玉山 teal、isometric 圖嵌入） | `03-deliverables/VOXEN-SOW-Draft-v0.6-ESUN.docx` |

### 中午 13:00 → 13:20 ｜ 提案三件套 + 浮水印

| 時間 | 動作 | 產出 |
|---|---|---|
| 13:00 | **Pitch Deck v1.0 — 完整版**（25 頁，玉山品牌視覺，含 Speaker Notes） | `01-meeting-pack/VOXEN-Pitch-ESUN-v1.0.pptx` |
| 13:01 | Executive One-Pager A4（給未到場長官的 leave-behind） | `01-meeting-pack/VOXEN-OnePager-ESUN-v1.0.pptx` |
| 13:08 | 內部 Q&A 深度準備本（21 頁，T/C/R/E/P/S 六系列共 25+ 題） | `02-internal-prep/VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.docx` |
| 13:12 | 3 年 TCO 對照試算表（6 sheet、160 公式、零錯誤） | `02-internal-prep/VOXEN-TCO-ESUN-v1.0.xlsx` |
| 13:14 | 5 個 PDF 統一加浮水印（對外 Pitch/SOW/OnePager 淺青；對內 QA Binder/TCO 紅色） | `*.pdf` |
| 13:16 | 24 小時 Follow-up Email 模板（含 Action Items 表 + 三種變體） | `04-post-meeting/FOLLOWUP-EMAIL-TEMPLATE.md` |
| 13:51 | 本機 reorganize — 子資料夾結構（01-meeting-pack / 02-internal-prep / 03-deliverables / 04-post-meeting / archive） | `REORGANIZE-FROM-TERMINAL.sh` 已執行 |

### 下午 14:00 → 14:20 ｜ Dry Run + POC + Outreach

| 時間 | 動作 | 產出 |
|---|---|---|
| 14:03 | Dry Run Playbook（內部排練手冊，12 頁，含 32 題刁鑽 mock Q&A + 評估表） | `02-internal-prep/VOXEN-DryRun-Playbook-ESUN-INTERNAL-v1.0.docx` |
| 14:06 | Demo Runbook（4 個 demo 實機操作手冊，給 Demo 工程師用） | `02-internal-prep/DEMO-RUNBOOK.md` |
| 14:07 | POC 環境拓樸圖（5 層 + 14 VM 規格） | `02-internal-prep/POC-ENV-ARCHITECTURE.svg` |
| 14:09 | POC 環境配套說明（網段 / 硬體 / 自動化腳本 / 成本） | `02-internal-prep/POC-ENV-ARCHITECTURE.md` |
| 14:10 | POC 驗收標準書（5 維度 25 項 criteria，給玉山的） | `03-deliverables/POC-ACCEPTANCE-CRITERIA.md` |
| 14:18 | 玉山 Outreach Email 草稿（三個提案時段 + Hybrid 形式） | `01-meeting-pack/OUTREACH-EMAIL-DRAFT.md` |
| 14:19 | Meeting Agenda 提案（90 分鐘 hybrid 議程） | `01-meeting-pack/MEETING-AGENDA-PROPOSAL.md` |
| 14:20 | Pre-meeting Logistics Checklist（寄信前 / T-3 / T-1 / 當天 / 會後分段） | `01-meeting-pack/PRE-MEETING-CHECKLIST.md` |

### 下午-晚間 14:35 → 18:10 ｜ VOXEN 整合架構文件

| 時間 | 動作 | 產出 |
|---|---|---|
| 14:35 | Resource Inventory v0.1 框架（13 大類，pre-fill 已知 10%、待填 80 cells） | `docs/internal/RESOURCE-INVENTORY.md` |
| 14:55 | INTEGRATION-PATTERNS — 5 種整合模式 (M1 Passive / M2 Active Routing / M3 Dynamic IVR / M4 Voice Bot / M5 Hybrid)，3CX IVR 為主例 | `docs/internal/INTEGRATION-PATTERNS.md` |
| 18:10 | CANONICAL-MODEL — 8 entity TypeScript interface、vendor mapping (3CX/Teams/Genesys)、ID 策略 (ULID prefix)、版本演進規則、5 個 anti-patterns | `docs/internal/CANONICAL-MODEL.md` |

### 晚間 19:20 → 19:50 ｜ VOXEN scaffold P0–P5

| 時間 | 動作 | 產出 |
|---|---|---|
| 19:20 | **P0** monorepo 骨架（package.json、pnpm-workspace.yaml、tsconfig.base.json、.gitignore、.npmrc） | root configs |
| 19:21 | **P1** core/ Tenant + Agent + Queue + Customer entity Zod schema | `core/src/models/{Tenant,Agent,Queue,Customer}.ts` |
| 19:22 | core/ Recording + Call entity（Call 是核心，含 timeline、IVR/Bot/Agent session、Recording ref） | `core/src/models/{Recording,Call}.ts` |
| 19:23 | core/ Event entity + models index | `core/src/models/{Event,index}.ts` |
| 19:24 | core/ utils/id (ULID generator + 10 typed prefix) + utils/phone (E.164 normalizer)；contracts (Adapter / PBXAdapter / IEventBus) | `core/src/{utils,contracts}/` |
| 19:25 | core/ src/index.ts main entry + eventbus index | `core/src/{index.ts, eventbus/index.ts}` |
| 19:27 | **InProcessEventBus** 實作（pattern matching wildcard、handler 錯誤隔離） | `core/src/eventbus/InProcessEventBus.ts` |
| 19:27 | core/ unit tests — utils/id (5)、utils/phone (7)、eventbus (6) | `core/test/**/*.test.ts` |
| 19:28 | **P2** 3CX vendor types (subset of public API) | `integrations/pbx/3cx/src/vendor/types.ts` |
| 19:29 | 3CX agent + event mappers | `integrations/pbx/3cx/src/mappers/{agent,event}.ts` |
| 19:30 | 3CX mapper unit tests — call (7)、agent (5)、event (5) | `integrations/pbx/3cx/test/mappers/*.test.ts` |
| 19:31 | 3CX call mapper（含 vendor → canonical Call、recording URI 轉換、duration 計算、end reason 推斷） | `integrations/pbx/3cx/src/mappers/call.ts` |
| 19:34 | **P3 + P4** ThreeCXAdapter（PBXAdapter 完整實作、vendor↔canonical id map） | `integrations/pbx/3cx/src/ThreeCXAdapter.ts` |
| 19:34 | healthServer (`/health` + `/ready` Node http endpoints) | `integrations/pbx/3cx/src/server/healthServer.ts` |
| 19:34 | 3CX 主入口 (`pnpm dev:3cx`、graceful shutdown) | `integrations/pbx/3cx/src/index.ts` |
| 19:35 | **P5** end-to-end smoke test（mock → adapter → bus 完整鏈路驗證） | `integrations/pbx/3cx/test/integration/smoke.test.ts` |
| 19:46 | Mock 3CX server（內含手寫 RFC 6455 WebSocket server，零外部 dep） | `integrations/pbx/3cx/test/mock-3cx-server.ts` |
| 19:46 | ThreeCXClient（REST + WebSocket client，含 typed event surface） | `integrations/pbx/3cx/src/client/ThreeCXClient.ts` |
| 19:50 | README × 3（root + core + 3cx），記錄技術棧、quickstart、limitations | `README.md` × 3 |

### 晚間 20:00 → 20:30 ｜ 本機 install + 驗證

| 時間 | 動作 | 結果 |
|---|---|---|
| ~20:00 | Laurence 在 Mac 跑 `pnpm install`（清掉 sandbox 留下的 broken symlinks） | 200+ packages 安裝完成 |
| ~20:05 | `pnpm typecheck` | 兩個 package 都 clean ✅ |
| ~20:10 | `pnpm test` | **37 / 37 passing** ✅（core 18 + 3cx 19） |
| 20:15 | 寫本 PROJECT-LOG.md | （現在） |

---

## Pre-2026-04-25（先前 sessions 累積成果）

來自 auto-memory 與 git 歷史，個別 timestamp 無法精確還原：

### VOXEN SRS v3.0
- 35 主章節（Ch 1 文件資訊 → Ch 35）
- 7 附錄（A 術語 → G）
- 12 架構圖（SVG + PNG）— Fig 1 整體架構、Fig 2 部署模型、Fig 5 AI 管線、Fig 7 事件拓樸、Fig 12 AI Agent 視角等
- ADR-0001 範例
- Architecture Extensibility Manifesto
- Philosophical Foundation (VOX + ZEN)
- 多次小版本迭代 v2.0 → v2.17 → v3.0 (定版)

### 結構決策
- E.SUN Outreach Project命名：「致行 (OUTREACH)」中英文對映
- VOXEN 根目錄結構：`docs/` + `ada/` + `core/` + `integrations/{pbx,crm,ai,messaging,collab,...}/`
- ADA 技術棧：Electron + TypeScript + Vue 3，Win + Linux only
- ADA 整合策略：SIP.js / WebRTC for media + Call Control API v2 for control
- 3CX 環境：V20 Update 8 on AWS，FQDN engsound.3cx.com.tw
- 競爭情境：對手是 status quo（不是別的廠商）

### Pitch Deck v1.0 (VOXEN 平台對外提案)
- 10 頁 VOX + ZEN philosophy

### E.SUN Outreach Project前期定義
- 規模：450 outbound 座席 + 212 並發 Voice Bot
- Go-live：2026-06-30
- Genesys EOL：2026-11-01
- Sponsor / 主對接：玉山 IT 團隊
- 採購模式：直接議約，跳 POC 改 PAT + Pilot Production Run 50 席 / 2 週

---

## 維護指引

當下次新增條目時：

1. 在最上方對應的日期下新增子節（依時段：早晨 / 中午 / 下午 / 晚間）
2. 用相同的表格格式（時間 ｜ 動作 ｜ 產出）
3. 新一天工作開始時，新增 `## YYYY-MM-DD（短描述）` 標題置於最上方（在「整體里程碑摘要」之下、現有最新日期之上）
4. 重大里程碑（影響 6 個月以上的決策、客戶簽約、Production 上線）要同步更新「整體里程碑摘要」表
5. 廢棄的工作可以加 `~~刪除線~~` 但不要刪掉條目（保留歷史）

---

**文件版本**：v1.2
**最後更新**：2026-04-28 08:10（瑛聲總部時區）
**維護人**：Laurence Lin

**版本歷史**
- v1.2 (2026-04-28) — 加 2026-04-28 (ada Phase 6 W1D1-D5 連衝)、加 2026-04-27 (P6 Customer-360 + ada-phase6 規劃)、整體里程碑表更新 6 列
- v1.1 (2026-04-27) — eSun → ESUN 命名正名替換（隱含於 rename batch）
- v1.0 (2026-04-26) — 初版
