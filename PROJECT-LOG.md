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
| **M2 Active Routing webhook** | TBD | ⏳ 下一站 | 3CX IVR Forward to URL handler |
| **OPEN/TeleSA Adapter** | TBD | ⏳ 排程中 | 玉山現有資產接入 |
| **Production Event Bus** | TBD | ⏳ 排程中 | NATS / Kafka / Redis Streams 選型 |
| **玉山 Phase 6 Pilot** | 2026-05 ~ 06 | 🟡 等簽約 | 30-50 席 Pilot 上線 |
| **玉山 Phase 6 Go-live** | 2026-06-30 | 🟡 排程 | 450 席全量切換 |

---

## 2026-04-26（今日 — 從 SRS 到能跑的 code）

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

**文件版本**：v1.0
**最後更新**：2026-04-26 20:15（瑛聲總部時區）
**維護人**：Laurence Lin
