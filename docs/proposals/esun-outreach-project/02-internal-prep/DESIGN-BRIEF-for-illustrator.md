# 玉山 SOW 視覺設計需求 Brief — for 設計師

> **目的**：本文件為「玉山 SOW + Pitch 用視覺架構圖」之設計需求說明書。
> **對象**：瑛聲科技內部設計師 / 外包插畫師。
> **參考**：
> - SOW Draft v0.4 內 Fig 1 / Fig 2 為「**程式自繪結構版**」（清楚但平面）
> - 本 brief 描述「**插畫風 / Pitch 版**」需求 — 給玉山高層 / Sponsor 看的精美視覺
> **參考素材庫建議**：[Storyset](https://storyset.com), [unDraw](https://undraw.co), [Freepik isometric](https://www.freepik.com/free-photos-vectors/isometric), Cisco Network Topology Icons, VMware vSphere Stencils

---

## 共通設計原則

1. **配色對齊 VOXEN 品牌色**
   - Primary: `#2C5282`（深藍 — VOXEN 主色）
   - Accent 1: `#48BB78`（綠 — 沿用 / 既有）
   - Accent 2: `#DD6B20`（橙 — 替換 / 新部署 PBX）
   - Neutral: `#4A5568`（深灰 — 玉山環境）
   - Highlight: `#C53030`（紅 — 關鍵里程碑 / 警示）

2. **三色語意（圖例必標）**
   - 🟠 **橙色** = 替換（Genesys → 3CX）
   - 🔵 **藍色** = 新部署（VOXEN 平台）
   - 🟢 **綠色** = 沿用瑛聲既有資產
   - ⚪ **灰色** = 玉山環境

3. **字型**
   - 中文：Microsoft JhengHei / Noto Sans CJK TC
   - 英文：Calibri / Inter
   - 標題粗體大字，內文清楚可讀

4. **檔案規格**
   - 輸出尺寸：橫式，1920 × 1080（Pitch 簡報用）
   - 來源檔：保留 .ai / .pptx / .figma 原稿
   - 高解析度匯出：PNG @ 300 DPI（印刷可用）+ SVG（向量版）

5. **語言**
   - 主標題、章節：繁體中文
   - 技術術語：保持英文（3CX / SIP / VOXEN / OUTREACH 等）
   - 圖例：中英對照

---

## Fig 1 — 整體系統架構圖

### 訊息層次（給誰看 / 想說什麼）

- **主要受眾**：玉山 IT 主管 + Sponsor
- **要傳達**：5 層分明的整合架構 + 三色語意一目了然 + 「沿用瑛聲既有資產」這個訊息要強
- **看完後該記住**：「VOXEN 平台是新的，但體驗層 / 外撥系統 / 錄音介面都是我們熟悉的瑛聲既有產品」

### 視覺風格建議

- **3D Isometric 等距投影**（類似附件 2 儲能系統圖）
- 每層用半透明色塊區分（不是實線方框）
- 元件用真實插畫 icon（不是純文字方塊）
- 連接線用平滑曲線 + 漸變色

### 必要元件（依層由上而下）

| 層 | 元件 | 說明 | 配色 |
|---|---|---|---|
| **使用者層** | 450 外撥座席 | 帶耳機的人物群（一兩個代表） | 灰底白 |
| | 主管 | 西裝人物 + 監視螢幕 | 灰底白 |
| | 客戶 | 持手機的人物 | 灰底白 |
| | 質檢 / IT / 稽核 | 持文件 + 放大鏡的人物 | 灰底白 |
| **體驗層**<br/>（沿用 OPEN/TeleSA） | 座席桌面 | 桌上型電腦螢幕，螢幕顯示 OPEN UI | 綠 |
| | 主管桌面 | 桌上型電腦 + 儀表板畫面 | 綠 |
| | 錄音管理介面 | 螢幕顯示錄音波形 | 綠 |
| | Wallboard 大螢幕 | 大尺寸電視 + KPI 數字 | 綠 |
| **VOXEN 平台**<br/>（新部署） | 編排層（路由 / 規則 / 對話流） | 互聯節點圖示 / 齒輪 | 藍 |
| | 資料層（客戶 360 / 互動歷程） | 圓柱資料庫 | 藍 |
| | 橫切支柱（資安 / 觀測 / DevOps / 治理 / AI Agent） | 5 個小 icon 排列 | 藍 |
| | 整合 Adapter（3CX / AD / CRM） | 插頭符號 | 藍 |
| **PBX 層** | 3CX V20 PBX | PBX 機箱 + HA Cluster 雙機 | 橙（替換） |
| | 致行（VOXEN OUTREACH） | 機器人頭 + 電話 | 綠（沿用） |
| | OPEN / TeleSA | 伺服器機櫃 + 「OPEN」標籤 | 綠（沿用） |
| **玉山環境** | 玉山 NAS | 儲存櫃 isometric | 灰 |
| | 玉山 AD / SSO | 鑰匙符號 | 灰 |
| | 玉山 CRM | 客戶資料卡 | 灰 |
| | 電信業者 SIP Trunk | 電信塔 + 訊號 | 灰 |
| | 玉山質檢 / 報表系統 | 文件 + 圖表 | 灰 |

### 連接關係（箭頭）

- 使用者層 ↓ 體驗層（操作）
- 體驗層 ↓ VOXEN 平台（API call）
- VOXEN 平台 ↓ PBX 層（控制）
- VOXEN 平台 ↘ 玉山環境（整合）
- PBX 層 ↓ 玉山環境（資料寫入）

### 圖中應有的標題與註腳

- 主標題：「**E.SUN Outreach Project (玉山 Phase 6) — 整體架構**」
- 副標題：「VOXEN + 3CX + 沿用瑛聲既有資產 整合方案」
- 圖例：4 色 + 2 種箭頭（實線 = 資料流 / 虛線 = 整合介面）
- 註腳：「v0.4 草案 — 元件名稱與整合關係依議約版本為準」

---

## Fig 2 — Migration Strategy 流程圖

### 訊息層次

- **主要受眾**：玉山 IT 主管 + Sponsor + 採購窗口
- **要傳達**：「換 VOXEN+3CX 是有計畫、有保險、可控風險」的訊息
- **看完後該記住**：
  1. Genesys 與 VOXEN+3CX 有 **4 個月並行緩衝期**
  2. 全量切換前有 **Pilot 50 席試跑**（爆破半徑小）
  3. 三層風險緩釋疊加 = 風險可控

### 視覺風格建議

- **時間軸（甘特圖）+ 雙泳道（Swim Lane）混合**
- 上泳道：Genesys（紅色，從滿到漸退）
- 下泳道：VOXEN+3CX（綠色，從零到滿）
- 兩泳道在中段重疊 = 並行緩衝期
- 用真實插畫元素：日曆 / 倒數計時 / 安全帽 / 盾牌等
- 三層緩釋設計用「層疊盾牌」視覺強調

### 必要元素

| 元素 | 說明 | 視覺處理 |
|---|---|---|
| 時間軸 | W0 → W26 / 7 個關鍵日期 | 橫軸 + 月份標示 |
| Genesys 泳道 | W0-W9 滿載 / W9-W15 漸退 / W15-W26 standby | 紅色色塊 + 漸層 |
| VOXEN+3CX 泳道 | W0-W6 開發 / W6-W8 測試 / W9 Pilot / W12-W15 擴大 / W15+ 全量 | 綠色色塊 + 漸層 |
| **4 個月並行緩衝期** | 從 06-30 到 11-01 | 雙箭頭 + 盾牌 icon + 大字「4 個月安全墊」 |
| 10 個關鍵里程碑 | M01-M10 | 圓點 + 標籤 |
| Go-live 標誌日 ★ | 2026-06-30 | 大星星 icon |
| Genesys 退場日 ★ | 2026-11-01 | 大星星 icon |
| **三層風險緩釋** | Pilot / Parallel Run / 分批切換 | 3 個層疊盾牌或 3 個編號圓圈 |

### 圖中應有的標題與註腳

- 主標題：「**Migration Strategy — 雙系統並行 + 分批切換**」
- 副標題：「2026-04-26 起算 / Go-live 2026-06-30 / Genesys 退場 2026-11-01（4 個月並行緩衝）」
- 註腳：「三層緩釋疊加 → 即使最壞情況下，影響面也限縮在小範圍 + 可快速回滾」

---

## Pitch 版產出後的整合

設計師完成插畫版本後：

1. **匯出 PNG @ 高解析（≥ 1600px wide）** → 放回 `~/VOXEN/docs/proposals/esun-outreach-project/diagrams/`，命名為：
   - `sow-fig-01-architecture-pitch.png`
   - `sow-fig-02-migration-strategy-pitch.png`
2. **保留來源檔**（.ai / .pptx / .figma） → 放 `~/VOXEN/docs/proposals/esun-outreach-project/diagrams/sources/`
3. **通知瑛聲 SOW 維護人員**（目前是 Claude session 自動產生）→ 在下一版 SOW 之 generator 中將圖檔來源從程式自繪 SVG 切換到設計師版 PNG
4. **同步用於 Pitch Deck** → VOXEN-Pitch-Deck.pptx 可直接嵌入插畫版本，提升整體質感

---

## 預算與時程建議

- **設計工時**：每張圖預估 4-8 小時（含修改 1-2 輪）
- **總時程**：1-2 週（含設計師檔期 + 內部 review）
- **預算範圍**：依設計師日費 — 視內部 / 外包而定

---

## 聯絡

任何問題請聯絡瑛聲業務總監 Eric Lin（laurence_lin@engsound.com.tw）或當前 SOW 維護人員。

— 文件版本：v1.0  ·  日期：2026-04-26  ·  © 瑛聲科技企業股份有限公司
