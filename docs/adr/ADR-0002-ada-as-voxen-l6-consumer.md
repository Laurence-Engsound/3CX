# ADR-0002: ada 改走 VOXEN PBXAdapter contract（不再直連 3CX）

| 欄位 | 內容 |
|:--|:--|
| **ADR 編號** | ADR-0002 |
| **標題** | ada repositions from standalone Electron app to VOXEN's L6 reference application; vendor coupling moves out of ada into `@voxen/pbx-3cx` adapter |
| **狀態** | Accepted（已採納 · ada Phase 6 起點實作） |
| **提案日期** | 2026-04-27 |
| **採納日期** | 2026-04-27 |
| **決策者** | Laurence Lin（Tech Lead） |
| **影響範圍** | L6 Engagement Layer — FM-L6-AGENT (ada) · 跨 ada 全部 main + renderer 進程 |
| **關聯模組** | ada/src/main/* · ada/src/renderer/* · @voxen/core PBXAdapter contract · @voxen/pbx-3cx adapter |
| **相關 ADR** | ADR-0001（選 Electron）— 不變、繼續成立 |
| **參考資料** | docs/internal/INTEGRATION-PATTERNS.md · @voxen/pbx-3cx README · ada Phase 6 PROJECT-CHARTER |

---

## 1. 背景與脈絡（Context）

### ada 的歷史
ada 從 2026-02 起步開發，當時 VOXEN 平台僅有 SRS 文件、無實作。為了趕 Phase 1-5 的功能交付，ada 採取最直接的整合：

```
ada Main process  →  fetch('https://engsound.3cx.com.tw/callcontrol/...')
                  →  WebSocket('wss://engsound.3cx.com.tw/...')
ada Renderer (webview)  →  3CX Web Client iframe
```

3CX 細節（API endpoints、認證 flow、event payload schema）**直接寫在 ada 的程式碼裡**：

- `ada/src/main/threecxClient.ts` — fetch 呼叫直連
- `ada/src/main/threecxEvents.ts` — WebSocket 訂閱
- `engsound.3cx.com.tw` 寫死字串散布在多個檔案
- 3CX 的 vendor data shapes（`ParticipantInfo`、`CallInfo` 等）直接被 renderer Vue components 讀取

這在 Phase 1-5 的「給 Engsound 自己用」場景沒問題。

### 觸發改變的事件
2026-04-26：VOXEN 平台 scaffold (P0-P5) 完成。
2026-04-27：P6 加入 L5 Customer-360 service 跟 crm-mock adapter，**驗證了 contract-driven 整合 pattern 真的成立**。

同時間：玉山銀行 SOW v0.6 對外稱 ada 為「VOXEN platform L6 Agent Desktop」。但 ada 程式碼裡「VOXEN」一個字都沒有。**SOW 跟 codebase 的承諾不一致**。

### 不解決會怎樣
1. 玉山 IT due diligence 時讀 ada source code，會問「你說 VOXEN platform，那這些直接 fetch 3CX 的程式是什麼？」
2. 未來換 PBX（Genesys / Cisco / Avaya）時，ada 整個重寫
3. VOXEN 平台缺少 production-grade L6 reference，無法說服未來客戶「平台真的在用」
4. 跟 VOXEN philosophical foundation 矛盾 — 「適配廠商，不被廠商綁架」

---

## 2. 決策（Decision）

**從 ada Phase 6 起點開始，ada 重構為 VOXEN 平台的 L6 reference application。**

具體：

### 2.1 ada 從**直連 3CX** 改為**對 PBXAdapter contract 講話**

```
原本:                           新的:
                                
ada Main process                ada Main process
  ↓                               ↓
3CX REST API                    @voxen/core
3CX WebSocket                     ↓ (PBXAdapter interface)
                                @voxen/pbx-3cx
                                  ↓
                                3CX REST API
                                3CX WebSocket
```

ada 不再 import 任何 3CX-specific 型別。所有跟通話控制相關的呼叫透過 `PBXAdapter` interface（`makeCall`, `transferCall`, `hangupCall`, ...）。所有事件透過 `@voxen/core` 的 `EventBus`，consume canonical `Call` / `Event` 型別。

### 2.2 ada 加入 VOXEN monorepo 但 keep electron-vite tooling

`ada/` 加入 `pnpm-workspace.yaml`，宣告 `@voxen/core` 為 dependency（`workspace:^`）。但 ada 維持自己的 electron-vite build chain — 不被 monorepo 的 root tsc / test runner 接管。

理由：electron 專案的 build 流程跟一般 TypeScript library 差異太大（main / preload / renderer 三組編譯），強行統一 tooling 反而徒增複雜度。

### 2.3 ada 升格為 L6 reference application

地位等同於 `@voxen/pbx-3cx` 是 L2 PBX adapter reference、`@voxen/crm-mock` 是 L2 CRM mock reference。  
ada 是 **L6 「real production-quality consumer」 reference**。  
未來新人問「VOXEN 平台 L6 怎麼長」，答案就是「看 ada/」。

### 2.4 漸進式遷移，不一次砍掉重練

ada Phase 6 Week 1「砍廢」階段同時做：

1. 建立 PBXAdapter wrapper layer（main process）
2. 把直接 `fetch('engsound.3cx.com.tw/...')` 改成 `pbxAdapter.makeCall(...)` 一個 use case 一個 use case 換
3. 既有功能在 Week 1 結束前**全部還能跑**（不能 break Phase 1-5 已交付的能力）
4. Week 2 才開始建 Bar UI

---

## 3. 考慮過的替代方案（Alternatives Considered）

### Alt 1: 維持 ada 直連 3CX，不整合 VOXEN
**Rejected.** 理由：
- 跟玉山 SOW 矛盾
- 未來換 PBX 要重寫 ada
- VOXEN 平台失去 L6 reference

### Alt 2: ada 內部建 thin abstraction layer，但不 import @voxen/core
**Rejected.** 理由：
- 重複維護兩套 PBX 抽象（ada 內部 vs @voxen/core）
- 違反 DRY，未來 contract 演進兩邊容易 drift
- 等於承認 VOXEN 平台不堪用，自相矛盾

### Alt 3: 砍掉 ada Phase 1-5 全部，從 @voxen/core 重寫一個 ada-v2
**Rejected.** 理由：
- 風險過高，2 個月內無法回到 Phase 5 等價功能
- 浪費 Phase 1-5 的開發投資
- 漸進式重構（本決策方案）能達到同樣終點，風險低很多

### Alt 4 (本決策): ada 漸進重構為 VOXEN L6 consumer
**Accepted.** 理由：
- 跟 SOW 對齊
- 風險可控（一個 use case 一個 use case 換）
- 完成後 VOXEN 平台多一個 production-grade L6 reference
- 為未來 PBX 切換打底

---

## 4. 結果與影響（Consequences）

### 正面
- **SOW 跟 codebase 一致** — 可禁得起玉山 IT due diligence
- **ada 變成 VOXEN L6 reference** — 平台 pattern 確立威信
- **未來 PBX 切換零成本** — `@voxen/pbx-3cx` 換 `@voxen/pbx-genesys-engage` / `@voxen/pbx-teams`，ada 一行不用改
- **Phase 6 「砍廢」工作順便做完 vendor decoupling** — 一石二鳥
- **跟 P6 的 Customer-360 整合更自然** — ada 已是 @voxen/core consumer，加 `@voxen/crm-mock` 只是再多接一個 adapter

### 負面 / 成本
- **Phase 6 Week 1 工作量略增** — 比原 PHASE6-PLAN v1 多了 vendor decoupling 步驟
- **ada package.json 改動** — 多 `@voxen/core` workspace dep；node_modules 結構從 standalone npm 變成 pnpm workspace（不太可能 break，但需要 install flow 適配）
- **既有 `engsound.3cx.com.tw` 寫死字串清查** — 需 grep 全 codebase，估 30-50 處
- **3CX vendor types 從 ada 程式碼移除** — 移到 `@voxen/pbx-3cx`（其實多半已經在那邊了）

### 中性
- **ada 不再有 Phase 1-5 的「快速 POC」屬性** — 變成 production-grade reference，design 更嚴格
- **renderer (Vue components) 改 import @voxen/core 的 canonical Call type** — 細部 prop interface 都要調整

### 不變
- **Electron 框架選擇不變** — ADR-0001 繼續成立
- **3CX Web Client 仍是 webview 媒體 sink** — 媒體層不換
- **既有 Phase 1-5 功能 inventory 不變** — 只換實作介面

---

## 5. 驗收條件（Acceptance）

ADR-0002 視為實作完成的條件：

- [ ] `grep -r "engsound.3cx.com.tw" ada/src` 回傳 0 個結果
- [ ] `grep -r "import.*from.*'@voxen/core'" ada/src/main` 至少 5 個 import 點
- [ ] ada package.json 含 `"@voxen/core": "workspace:^"`
- [ ] ada Phase 1-5 既有功能 regression test 全綠（不 break 既有能力）
- [ ] Week 2 e2e demo 可跑：incoming call → CRM 查詢 → Bar 顯示客戶（驗證 PBXAdapter + CustomerLookupAdapter 整合）

---

## 6. 後續演化（Evolution）

本 ADR **不阻擋**未來這些演進；如要這樣做需另立 ADR：

- ada 改用其他 build tool（Vite → Tauri / Wails）
- ada 拆 component library 出來變共用
- ada 支援 macOS / Linux
- 媒體層（webview）替換為自家 SIP stack
- ada 服務多 tenant

---

## 7. 版本歷史

| Version | Date | Author | Changes |
|:--|:--|:--|:--|
| 1.0 | 2026-04-27 | Laurence | 初版，搭配 ada Phase 6 PROJECT-CHARTER |
