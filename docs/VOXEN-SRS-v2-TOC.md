# VOXEN SRS v2.0 — 目錄與寫作藍圖

> 這份檔案是 v2.0 的**寫作藍圖**與**進度追蹤**。正式交付物是 `VOXEN-SRS-v2.docx`。
> 狀態標記：✅ 已完成 · 🔄 撰寫中 · ⬜ 待撰寫
> Phase 標記：`P6` Phase 6 銀行 SIT · `P7` Phase 7 AI Lite · `P8+` Phase 8 之後 · `V` 願景

---

## Part I — 導讀（~48 頁）

- ⬜ **Ch 1** 文件資訊與修訂歷程 (8p)
- ⬜ **Ch 2** Executive Summary (5p) — 嵌圖 #1 主架構
- ⬜ **Ch 3** 產品願景與定位 (12p)
- ⬜ **Ch 4** 目標市場與競品地景 (15p)
- ⬜ **Ch 5** 詞彙與縮寫 (8p)

## Part II — 架構（~97 頁）

- ⬜ **Ch 6** 架構總覽 (15p) — 嵌圖 #2 脈絡、#1 主架構
- ⬜ **Ch 7** 分層責任與邊界 (25p) — 嵌圖 #7 依賴規則
- ⬜ **Ch 8** 橫切關注點 C1-C6 (20p)
- ⬜ **Ch 9** 平台營運 P1-P4 (10p)
- ⬜ **Ch 10** 資料流與事件流 (15p) — 嵌圖 #4 時序、#6 資料流、#8 事件流
- ⬜ **Ch 11** 部署架構模型 (12p) — 嵌圖 #3 部署、#11 3-tier

## Part III — L1 整合層（~60-80 頁）

- ⬜ **Ch 12** L1 整合層模組群
  - 12.1 概論與適配器設計原則
  - 12.2 PBX Adapter 群（5 adapters）`P6→P10`
  - 12.3 CRM Adapter 群（6 adapters）`P6→P10`
  - 12.4 AI Provider Adapter 群（8 adapters）`P7→P8`
  - 12.5 Directory & SSO Adapter 群（6 adapters）`P6→P9`
  - 12.6 Messaging Platform Adapter 群（6 adapters）`P8→P10`
  - 12.7 Email Platform Adapter 群（3 adapters）`P9`
  - 12.8 Data Export Adapter 群（7 adapters）`P8→P10`
  - 12.9 Financial Service Adapter 群（3 adapters）`P6→P10`

## Part IV — L2 資料與身分基礎（~40-50 頁）

- ⬜ **Ch 13** L2 資料與身分基礎模組群
  - 13.1 概論與資料模型總覽
  - 13.2 Customer 360（FM-L2-C360）`P8`
  - 13.3 Interaction Archive（FM-L2-ARCH）`P7`
  - 13.4 Knowledge Base 核心（FM-L2-KB）`P8`
  - 13.5 KB Authoring Workflow（FM-L2-KB-AUTH）`P9`
  - 13.6 **Audit Log Service**（FM-L2-AUDIT）`P6` ← 升級為一級公民
  - 13.7 Identity Vault（FM-L2-ID-VAULT）`P9`
  - 13.8 Feature Store（FM-L2-FS）`P10`
  - 13.9 Data Catalog（FM-L2-CAT）`P10`
  - 13.10 Master Data Management（FM-L2-MDM）`P10`

## Part V — L3 互動核心（~80-100 頁）

- ⬜ **Ch 14** L3 互動核心模組群
  - 14.1 概論與 Channel 抽象契約
  - 14.2 Voice Channel 群 `P6`
  - 14.3 Chat Channel `P8`
  - 14.4 Email Channel `P9`
  - 14.5 SMS Channel `P8`
  - 14.6 WhatsApp Channel `P8`
  - 14.7 Line Channel `P8`
  - 14.8 Facebook / Instagram Channel `P9`
  - 14.9 Video Channel `P10`
  - 14.10 Social Listening Channel `P11`
  - 14.11 Media Pipeline `P7`
  - 14.12 Recording Engine `P6`
  - 14.13 PCI Pause-Resume `P6`
  - 14.14 Consent Management `P6`
  - 14.15 Unified Inbox `P9`

## Part VI — L4 智能層（~80-100 頁）

- ⬜ **Ch 15** L4 智能層模組群 — 嵌圖 #5 AI 管線
  - 15.1 概論與 AI Service Registry
  - 15.2 AI Service Connector `P7`
  - 15.3 語音智能群（STT · TTS · Biometric）`P7→P10`
  - 15.4 語言理解群（Summary · VM · RAG · Translation · Prompt）`P7→P8`
  - 15.5 分析智能群（Sentiment · Topic · SAC）`P8`
  - 15.6 預測智能群（Forecast · NBA · Fraud · Churn）`P10→P11`
  - 15.7 合規智能群（Compliance Detect · PII Redaction）`P7→P8`
  - 15.8 輔助智能群（Coach · KB Rec）`P8`

## Part VII — L5 編排層（~60-75 頁）

- ⬜ **Ch 16** L5 編排層模組群
  - 16.1 概論與規則 vs AI 分界
  - 16.2 Routing Engine `P7`
  - 16.3 Flow Designer `P9`
  - 16.4 Business Rules Engine `P8`
  - 16.5 Journey Orchestrator `P10`
  - 16.6 Campaign Orchestrator `P8`
  - 16.7 Event Bus `P7`
  - 16.8 Scheduler `P7`
  - 16.9 Answering Machine Detection `P8`
  - 16.10 Predictive / Progressive / Preview Dialer `P8`

## Part VIII — L6 體驗層（~130-160 頁 — 本 SRS 最大章）

- ⬜ **Ch 17** L6 體驗層模組群
  - 17.1 概論與角色分類
  - 17.2 Agent Desktop 群 `P6`
  - 17.3 Agent Copilot `P8`
  - 17.4 Personal Dialer `P6→P8`
  - 17.5 Supervisor Console `P7→P8`
  - 17.6 Quality Management Workbench `P7→P8`
  - 17.7 Customer Self-service `P8→P11`
  - 17.8 Post-call Survey `P7`
  - 17.9 NPS / VoC `P8`
  - 17.10 Gamification `P10`
  - 17.11 Agent Wellness `P11`
  - 17.12 WFM Lite `P9→P10`
  - 17.13 Admin Portal `P7`
  - 17.14 Developer Portal `P9`
  - 17.15 Partner Portal `P10`
  - 17.16 Customer Identification & Auth `P9`

## Part IX — 橫切關注點（~84 頁）

- ⬜ **Ch 18** C1 Security (20p) — 嵌圖 #10 信任邊界
- ⬜ **Ch 19** C2 Governance & Compliance (20p)
- ⬜ **Ch 20** C3 Observability (12p)
- ⬜ **Ch 21** C4 Multi-tenancy (10p)
- ⬜ **Ch 22** C5 DevOps Lifecycle (12p)
- ⬜ **Ch 23** C6 Global Readiness (10p)

## Part X — 平台營運（~41 頁）

- ⬜ **Ch 24** P1 Developer Platform (15p)
- ⬜ **Ch 25** P2 Commerce & Billing (10p)
- ⬜ **Ch 26** P3 Customer Success (8p)
- ⬜ **Ch 27** P4 Partner Ecosystem (8p)

## Part XI — 非功能需求（~42 頁）

- ⬜ **Ch 28** 非功能需求 (20p)
- ⬜ **Ch 29** 部署與 Sizing (12p) — 嵌圖 #9 Sizing
- ⬜ **Ch 30** DR / BCP (10p)

## Part XII — 版本、授權、驗收（~25 頁）

- ⬜ **Ch 31** 版本授權矩陣 (10p)
- ⬜ **Ch 32** 驗收標準 (15p)

## Part XIII — 路線圖（~40 頁）

- ⬜ **Ch 33** 短期交付計畫 (15p)
- ⬜ **Ch 34** 長期戰略地圖 (15p)
- ⬜ **Ch 35** 風險與緩解 (10p)

## 附錄（~108 頁）

- ⬜ Appendix A — 競品深度分析 (15p)
- ⬜ Appendix B — 配置檔完整參考 (12p)
- ⬜ Appendix C — API / Event Catalog (30p)
- ⬜ Appendix D — 資料模型全集 (20p)
- ⬜ Appendix E — 稽核欄位 Schema (8p)
- ⬜ Appendix F — 詞彙表 (8p)
- ⬜ Appendix G — 法規映射 (15p)

---

## 11 張架構圖對應

| 圖號 | 圖名 | 已完成 | 嵌入章節 |
|:--:|:--|:--:|:--|
| #1 | 主架構（6×6×4）| ✅ | Ch 6.2 |
| #2 | 系統脈絡 | ✅ | Ch 6.1 |
| #3 | 部署模型 × 4 | ✅ | Ch 11.2 |
| #4 | 通話時序 | ✅ | Ch 10.1 |
| #5 | AI 管線 | ✅ | Ch 15.1 |
| #6 | 資料流全景 | ✅ | Ch 10 |
| #7 | 層級依賴 | ✅ | Ch 7.7 |
| #8 | 事件流拓樸 | ✅ | Ch 10.6 |
| #9 | Sizing 對照 | ✅ | Ch 29.2 |
| #10 | 信任邊界 + STRIDE | ✅ | Ch 18 |
| #11 | 3-tier 網路 | ✅ | Ch 11.3 |

---

## 寫作批次規劃

| 批次 | 內容 | 預估工時 | 交付 |
|:--:|:--|:--:|:--|
| B7-A | Part I 導讀（本批）| 4-6 hr | Ch 1-5 完整 |
| B7-B | Part II 架構 | 6-8 hr | Ch 6-11 完整 |
| B7-C | Part III-IV (L1-L2) | 8-10 hr | 模組逐一 FR |
| B7-D | Part V (L3) | 8-10 hr | 模組逐一 FR |
| B7-E | Part VI-VII (L4-L5) | 8-10 hr | 模組逐一 FR |
| B7-F | Part VIII (L6) | 10-12 hr | 最大章 |
| B7-G | Part IX-X 橫切 + 營運 | 6-8 hr | |
| B7-H | Part XI-XIII NFR + 路線圖 | 5-6 hr | |
| B7-I | 附錄 A-G | 6-8 hr | |
| B7-J | 校對 + PDF 輸出 | 2-3 hr | 交付 |
| **合計** | | **63-81 hr** | |

---

## 交叉引用規則

- 章節互引用格式：`（詳 Ch X.Y）`
- 圖引用格式：`（見 Fig X）`
- 模組引用格式：`FM-L{層}-{領域}`
- FR 編號格式：`FR-{模組簡碼}-{序號}`（例：FR-PD-01、FR-AUDIT-03）
