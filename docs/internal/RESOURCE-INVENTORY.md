# 瑛聲科技 / VOXEN 平台 — Resource Inventory

**用途**：盤點瑛聲現有的資源、工具、系統、設備、人力、知識資產，作為 VOXEN 平台後續開發優先序與技術選型的決策依據
**版本**：v0.1（草稿，待 Laurence 校正）
**日期**：2026-04-26
**維護人**：Laurence Lin

> **使用說明**：所有 `(待填)` 的 cell 請 Laurence 補上。已 pre-fill 的部分若有錯，直接覆寫。
>
> **下次更新時機**：每季 review 一次，或新增重大資源時即時補。

---

## A. PBX / 語音基礎設施

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| 3CX V20 主環境 | ✅ 已有 | Update 8 on AWS · `engsound.3cx.com.tw` | 主環境，可 demo / 測試用 |
| 3CX Premium Partner 認證 | ✅ 已有 | 完整 Premium 等級權益 | 直通原廠 escalation channel |
| 3CX 其他環境（測試 / DR） | (待填) | 數量 / 用途 / 規格 | 是否有獨立 demo lab？ |
| SIP Trunk 供應商與帳號 | (待填) | 中華電信 / 是方 / 其他？容量？ | 影響 demo 與 POC 的對外撥打能力 |
| SBC 硬體 | (待填) | 廠牌 / 型號 / 數量 | AudioCodes？Oracle？無？ |
| 測試話機（IP Phone） | (待填) | Yealink / Polycom / 其他？數量 | demo + POC 用 |
| SoftPhone 軟體 | (待填) | 3CX SoftPhone / Bria / Linphone？ | 跨平台覆蓋情況 |
| 內部分機 / 號碼配置 | (待填) | 內部測試號段範圍 | demo + 內部測試用 |

---

## B. Speech / AI 服務（STT、TTS、LLM、NLU）

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| **STT（語音辨識）** | | | |
| Azure Speech | (待填) | 帳號？月用量？支援 zh-TW？ | 目前 Copilot Phase II 是否在用？ |
| Google Speech-to-Text | (待填) | 同上 | |
| 本地 ASR 模型 | (待填) | Whisper / 其他開源？硬體？ | 玉山若要 on-prem 就會用到 |
| **TTS（語音合成）** | | | |
| Azure / Google TTS | (待填) | 玉山品牌音色是否已客製？ | One-Pager 提到「玉山品牌音色」 |
| 本地 TTS 模型 | (待填) | VITS / Coqui / 其他？ | |
| **LLM** | | | |
| OpenAI 帳號 | (待填) | API key 容量 / 月度配額 / 模型可用 | GPT-4o / mini / o1 / o3 等 |
| Azure OpenAI | (待填) | endpoint / 模型 / 可用 region | 玉山 prefer Azure（Microsoft 體系）？ |
| 本地 LLM | (待填) | Llama / Qwen / Mistral？ 硬體（GPU 規格）？ | 玉山若要絕對 on-prem 就會用到 |
| **NLU / Dialog** | | | |
| 對話流程設計工具 | (待填) | 是否自研？或用 Rasa / Dialogflow？ | 致行 Bot 的後端 |
| 知識庫（KB / RAG） | (待填) | 玉山 Copilot 是否已建？技術棧？ | LangChain / LlamaIndex / 自研？ |

---

## C. IVR / Voice Bot 平台

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| 致行 Voice Bot 平台 | ✅ 已有 | (待填細節：架構、語言、部署位置) | E.SUN Outreach Project要用 |
| 致行 — 客戶端部署 | (待填) | 已部署於哪些客戶？ | 案例累積 |
| IVR 流程設計工具 | (待填) | 視覺化編輯器？文字 DSL？ | 玉山 IT 是否需要自己改 IVR？ |
| TTS prompt 庫存 | (待填) | 通用 prompt 集數量、是否分主題？ | reusable assets |
| 對話資料 / training corpus | (待填) | 有沒有累積的對話 dataset？ | 之後 fine-tune 用 |

---

## D. CTI / Adapter

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| 3CX Call Control API v2 | ✅ 已決定使用 | 文件齊全 | 玉山 ADA 整合策略已定 |
| SIP.js / WebRTC SDK | ✅ 已決定使用 | 開源 | 玉山 ADA 媒體層用 |
| Genesys 整合經驗 | (待填) | 過去E.SUN Outreach Project用過？文件 / 程式碼留存？ | reusable for future Genesys 替代案 |
| Avaya / Cisco 整合經驗 | (待填) | 是否有歷史專案？ | 多 PBX adapter 設計經驗 |
| Microsoft Teams Phone 整合 | (待填) | 是否已有 PoC？ | 下一個專案會用到 |
| WebRTC gateway / SBC | (待填) | 自架 Janus / Kurento？ | 跨網段 NAT 穿透 |

---

## E. 瑛聲既有產品 / 模組

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| **OPEN / TeleSA**（客服中心業務系統） | ✅ 已有 | (待填：技術棧、版本、deployment 模式) | 部署於玉山 450 user |
| OPEN — 其他客戶部署 | (待填) | 哪些客戶？規模？ | reusable for 玉山以外 |
| **VOXEN Copilot**（AI 副駕） | ✅ 已有 | (待填：Phase II 進度、技術架構) | 玉山 Phase II 進行中 |
| **VOXEN 平台**（新發展） | 🟡 規劃中 | SRS v3.0 已完成；實作未開始 | 本盤點要支援的主軸 |
| Wallboard / 報表系統 | (待填) | 是否有現成可整合 3CX？ | demo 第 4 個 wow factor |
| **致行 Voice Bot** | ✅ 已有 | 同 C 段 | |
| 其他 SaaS / 工具 | (待填) | 瑛聲是否有其他產品線？ | 完整盤點 |

---

## F. 雲基礎設施

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| AWS 帳號 | ✅ 已有 | 3CX 主環境部署於此 | (待填：region、月度支出規模) |
| Azure 帳號 | (待填) | 是否有？容量？ | LLM Gateway 可用 |
| GCP 帳號 | (待填) | 是否有？ | |
| 自有 IDC / co-location | (待填) | 是否有自家機房？位置？頻寬？ | demo lab 可能在這裡 |
| 其他雲（OCI / Linode / DigitalOcean） | (待填) | | |

---

## G. 開發工具 / DevOps

| 項目 | 狀態 | 規格 / 細節 | 備註 |
|------|------|------------|------|
| Git repo | (待填) | GitHub / GitLab / 自架 Gitea？組織帳號？私有 repo 配額？ | VOXEN 程式碼 host 在哪 |
| CI/CD 平台 | (待填) | GitHub Actions / Jenkins / GitLab CI？ | 自動化 build / test / deploy |
| Container registry | (待填) | Docker Hub / GitHub Container Registry / Harbor？ | |
| Kubernetes / Docker 平台 | (待填) | 自管 K8s？AWS EKS？docker-compose？ | VOXEN 部署模型 |
| Infrastructure as Code | (待填) | Terraform / Ansible / Pulumi？ | |
| 監控 | (待填) | Prometheus / Datadog / New Relic / Zabbix？ | 內部已有？ |
| 日誌集中 | (待填) | ELK / Splunk / Loki？ | |
| 錯誤追蹤 | (待填) | Sentry / Rollbar / 自架？ | |
| Secret management | (待填) | Vault / AWS Secrets Manager / 1Password？ | |

---

## H. 現有客戶部署 / 案例庫

| 客戶 | 部署的瑛聲產品 | 規模 | 狀態 / 備註 |
|------|---------------|------|------------|
| **玉山銀行** | OPEN/TeleSA + Copilot Phase II | 450 user + Copilot 進行中 | Phase 6 評估中 |
| 其他金融業客戶 | (待填) | (待填) | 可作為 case study reference |
| 電信 / ISP 客戶 | (待填) | (待填) | |
| 政府 / 公部門 | (待填) | (待填) | |
| 電商 / 零售 | (待填) | (待填) | |
| 醫療 / 保險 | (待填) | (待填) | |
| 製造業 | (待填) | (待填) | |
| 其他 | (待填) | (待填) | |

---

## I. 人力 / 技能盤點

| 角色 | 現有人數 | 經驗深度 | 可調度比例 | 備註 |
|------|---------|---------|-----------|------|
| **SIP / RTP / VoIP 工程師** | (待填) | (待填) | (待填) | E.SUN Outreach Project核心，台灣稀缺人才 |
| **前端工程師** — Vue 3 | (待填) | (待填) | (待填) | ADA 主棧 |
| 前端 — React / Angular | (待填) | (待填) | (待填) | 玉山 OPEN 用什麼？ |
| **後端 / 平台工程師** | (待填) | Node / Java / .NET / Go？ | (待填) | VOXEN core |
| **AI / ML 工程師** | (待填) | 對 LLM / RAG / fine-tune 經驗 | (待填) | Copilot + 致行 backend |
| **DevOps / SRE** | (待填) | (待填) | (待填) | |
| **資安工程師** | (待填) | (待填) | (待填) | 銀行案 critical |
| **PM / Engagement Manager** | (待填) | Laurence + ? | — | |
| **業務 / Sales** | (待填) | Eric Lin + ? | — | |
| **法務 / 法遵顧問** | (待填) | 內部 / 外聘？ | — | 銀行案要 |
| **設計 / UX** | (待填) | (待填) | (待填) | ADA UI |
| **客服 / 顧問** | (待填) | (待填) | (待填) | 客戶 onboard 與 support |
| **總計工程人力** | (待填) | — | — | |

---

## J. 知識資產 / 文件

| 資產 | 位置 | 狀態 |
|------|------|------|
| VOXEN SRS v3.0 | `~/VOXEN/docs/SRS/` | ✅ 完整 |
| VOXEN 12 張架構圖 | `~/VOXEN/docs/diagrams/` | ✅ 完整 |
| E.SUN Outreach Project完整提案包 | `~/VOXEN/docs/proposals/esun-outreach-project/` | ✅ 完整 |
| Copilot Phase II 技術文件 | (待填) | (待填) |
| OPEN/TeleSA 系統文件 | (待填) | (待填) |
| 致行 Voice Bot 技術文件 | (待填) | (待填) |
| 過往案例 study（可對外） | (待填) | (待填) |
| 內部 onboarding / training 教材 | (待填) | (待填) |
| 跟 3CX 原廠的 Premium Partner 文件 | (待填) | (待填) |
| 技術 blog / whitepaper（瑛聲對外） | (待填) | (待填) |

---

## K. SaaS / Software License

| 軟體 | 已有？ | 用途 |
|------|-------|------|
| Office 365 / Google Workspace | (待填) | Email / 文件 |
| Slack / Teams | (待填) | 內部溝通 |
| Notion / Confluence | (待填) | 知識管理 |
| Jira / Asana / Linear | (待填) | 專案管理 |
| Figma / Adobe Creative Cloud | (待填) | 設計 |
| CRM（Salesforce / HubSpot / Pipedrive） | (待填) | 業務追蹤 |
| 1Password / Vault / Bitwarden | (待填) | 密碼 / Secret |
| Zoom / Webex | (待填) | 會議 |
| GitHub Copilot / ChatGPT Plus / Claude | (待填) | 開發輔助 |

---

## L. 硬體 / 實體設備 / 場域

| 項目 | 規格 / 數量 | 備註 |
|------|------------|------|
| 瑛聲總部位置 | (待填) | 台北 / 新北 / 其他？ |
| 其他 office | (待填) | 是否有分部？ |
| Demo Lab 位置與規模 | (待填) | 自有 / co-location？ |
| GPU 工作站（for AI / LLM） | (待填) | 數量 / 規格 |
| 公司會議室 | (待填) | 數量 / 容量 |
| 投影 / 視訊會議設備 | (待填) | 是否能在玉山總部 demo 也能 hybrid？ |
| 員工筆電配備（標準規格） | (待填) | macOS / Windows / Linux 比例 |
| 客戶到訪空間 | (待填) | 是否能接待玉山參觀 demo lab？ |

---

## M. Partnership / 關係資產

| 對象 | 關係狀態 | 備註 |
|------|---------|------|
| **3CX** | Premium Partner | escalation channel 直通 |
| Microsoft（Teams、Azure、Copilot） | (待填) | Microsoft Partner？認證等級？ |
| AWS Partner | (待填) | Tier？ |
| Google Cloud Partner | (待填) | |
| 中華電信 / 電信業者 | (待填) | SIP Trunk 合作關係 |
| AudioCodes / Oracle SBC | (待填) | reseller？ |
| 玉山銀行（核心客戶） | Copilot Phase II 進行中 | Phase 6 評估中 |
| 其他金融業 | (待填) | |
| 學術界 / 研究機構 | (待填) | 是否有合作 paper / project？ |
| 其他 SI / 系統整合商 | (待填) | 是否有 sub-contractor 關係？ |

---

## N. 對 VOXEN 主線開發的影響評估

完成上方盤點後，依以下框架判斷 VOXEN 開發優先序：

### N.1 「現在馬上能做」的（資源具備）

依 pre-fill 的部分，目前能立即啟動的：

- ✅ ADA scaffold — Electron + TS + Vue 3 技術棧已定，假設前端工程師可調度
- ✅ 3CX Adapter 設計與雛形 — 3CX Premium Partner + 已有環境 + Call Control API
- ✅ SRS-driven design review — 文件已備齊

### N.2 「需要補資源才能做」的

依 `(待填)` 結果決定：

- ⚠️ **AI / LLM 整合**：取決於是否有 OpenAI / Azure 帳號 + AI 工程師人月
- ⚠️ **本地 LLM**：取決於是否有 GPU 工作站 + ML 工程師
- ⚠️ **Multi-PBX Adapter**：取決於是否有 Teams Phone / Avaya / Cisco 過往經驗或測試環境
- ⚠️ **DevOps 自動化**：取決於現有 CI/CD 平台與容器化成熟度

### N.3 「需要外部協助 / 採購」的

- 🛒 SBC 硬體（如未有）— 約 NT$ 80-180 萬一次性
- 🛒 GPU 工作站（如要本地 LLM）— 約 NT$ 30-100 萬
- 🛒 SIP/RTP 工程師招募（如人力不足）— 招募週期 3-6 個月
- 🛒 多元客戶試水溫（如金融案例不足）— 業務開拓 6-12 個月

### N.4 建議優先序（依資源約束）

完成本 inventory 後，會以「資源 × 對E.SUN Outreach Project幫助度」雙軸評分，產出建議的 Q2-Q4 開發 roadmap。

---

## 完成本 inventory 後的下一步

1. **Laurence 填妥所有 `(待填)` cells**（建議花 2-3 小時集中盤點，必要時拉 Eric Lin / 技術 Lead 共同 review）
2. **共同檢視 N 段「資源 vs 開發優先序」**（需要會議形式討論，30-60 分鐘）
3. **決定 Q2-Q4 開發 roadmap**（產出獨立的 ROADMAP.md 文件）
4. **依 roadmap 啟動第一個模組開發**（最可能是 ADA scaffold）

---

## 文件版本

| 版本 | 日期 | 變更 | 維護人 |
|------|------|------|--------|
| v0.1 | 2026-04-26 | 初版骨架，pre-fill 已知部分 | Laurence Lin |
