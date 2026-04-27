# Phase 6 — 銀行客戶 SIT 版本（v2 · VOXEN-aligned）

> 目標：玉山銀行 450 人客服中心，2 個月內可進 SIT，6 個月內 production。
>
> **Charter**: [docs/projects/ada-phase6/PROJECT-CHARTER.md](../../docs/projects/ada-phase6/PROJECT-CHARTER.md)
> **架構決策**: [ADR-0002](../../docs/adr/ADR-0002-ada-as-voxen-l6-consumer.md)

| 版本 | 日期 | 狀態 | 變更 |
|:--|:--|:--|:--|
| v1 | 2026-04 | **Superseded** | 假設 ada 為獨立 Electron 專案，直連 3CX |
| **v2** | **2026-04-27** | **Active** | ada 升格為 VOXEN L6 reference application；Week 1 加入 vendor decoupling；Week 2 為 MVP demo milestone |

> **v1 何時 superseded？** VOXEN 平台 scaffold 在 2026-04-26 完成、P6 Customer-360 在 2026-04-27 完成，ada Phase 6 的最佳起點不再是「擴充獨立 ada」，而是「ada 升級為 VOXEN L6 consumer」。詳見 ADR-0002。

---

## 1. 為什麼要轉型

### 業務面
Phase 1-5 的 ADA 是「大視窗 + 內嵌 Web Client」。對個人開發者 / 小團隊夠用，但對銀行客服中心**不適用**：

- 客服螢幕已被 CRM、工單系統、Email 塞滿，沒空間放大視窗
- 自由座席（hot seating）：500 員工輪流坐，分機跟人走、不跟工作站走
- 自家開發的 softphone 取代 + Genesys 取代為 3CX，使用者期望「**酒吧式**」短橫條
- 銀行 IT 自行部署，需要明確的配置檔 spec
- AD 是企業帳號中樞，必須整合

### 架構面（v2 新增）
Phase 1-5 的 ada 寫死跟 3CX 對話。VOXEN 平台 scaffold 已 boot，ada 應該升格為 **VOXEN L6 reference application**：

- ada 改透過 `@voxen/core` 的 PBXAdapter contract 跟 PBX 對話
- ada 不再 import 3CX-specific 型別
- ada 跟 `@voxen/crm-mock`（dev/demo）跟未來真 CRM adapter 對話
- 玉山 SOW 對外稱「VOXEN platform L6 Agent Desktop」可禁得起 due diligence

詳見 [ADR-0002](../../docs/adr/ADR-0002-ada-as-voxen-l6-consumer.md)。

---

## 2. 新架構速覽

### UI 形式（不變 from v1）
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🟢 Ready ▾ │ 📞 0912 王先生 │ ⏱ 01:23 │ ⏸ 🔇 🔀 👥 ↩ │ ⌨ │ ☰      │
└─────────────────────────────────────────────────────────────────────┘
   ↑ Softphone Bar (40px, always-on-top)
                                                           ╲
                                                            ╲ 點擊
   ┌──────────────┐                                          ▼
   │  撥號盤      │        ┌───────────────────────────────────┐
   │  (浮出)      │        │  設定 / 紀錄 / 關於 (大視窗，可關) │
   └──────────────┘        └───────────────────────────────────┘

   ┌──────────────────────────────────────────┐
   │ ⚪ ⚪ ⚪  3CX Web Client (隱藏背景)         │
   │  - 媒體 sink（不變）                       │
   │  - 認證 session                          │
   │  - off-screen 或 display:none            │
   └──────────────────────────────────────────┘
```

### 控制流（v2 重大變更）
```
原 v1:
  Bar 按「保留」 → ada 直接 fetch('https://engsound.3cx.com.tw/...')

v2:
  Bar 按「保留」 → ada Main 呼叫 pbxAdapter.holdCall(callId)
                → @voxen/pbx-3cx 翻譯 → 3CX REST API
                → 3CX 處理
                → 3CX WebSocket 事件
                → @voxen/pbx-3cx 翻譯成 canonical Event
                → @voxen/core EventBus
                → ada Main 訂閱
                → 更新 Bar 狀態
```

媒體仍由 webview 的 WebRTC 通道處理（**不變**）。

### 資料來源（v2 新增）
```
來電響鈴
  → @voxen/core EventBus 收到 'call.ringing' 事件
  → ada Main 呼叫 customer360Service.getProfileByPhone(callerPhone)
  → @voxen/crm-mock (or future real CRM) 回傳 CustomerProfile
  → Bar 顯示「王先生 / VIP / 上次 agent01 / 4 通歷史」
```

⭐ **這就是 Week 2 MVP demo milestone — 「ada/CRM + Softphone 跑得起來」**

---

## 3. 路線圖（兩個月切八週）

### Week 1 — 砍廢 + Bar 骨架 + **VOXEN 整合**（v2 加重）
- [v1] 移除所有 `engsound.3cx.com.tw` 寫死字串、改完全 settings driven
- [**v2 NEW**] **Vendor decoupling** — 把直接 3CX API 呼叫移到 `@voxen/pbx-3cx`，ada 改透過 `@voxen/core` PBXAdapter
- [**v2 NEW**] ada 加入 pnpm-workspace 內，宣告 `@voxen/core` workspace dep
- [**v2 NEW**] ada Main 建立 PBXAdapter wrapper layer
- [v1] 建立 `BarWindow.vue` 元件 + Main process 的 `barWindow.ts`（無框、always-on-top、可拖移）
- [v1] 新增 `WindowManager`：控制三種視窗（Bar / 撥號盤 / 設定）的開關與位置
- [v1] Tray icon 為主要進入點

**Week 1 Acceptance**: 
- ada 既有 Phase 1-5 功能 regression test 全綠（**不能 break**）
- `grep -r "engsound.3cx.com.tw" ada/src` 為 0
- Bar 視窗能拖移、tray icon 能呼出

### Week 2 — XAPI 控制 + ⭐ MVP demo runnable（v2 加重）
- [v1 → 改] 接聽 / 掛斷 / 保留 / 恢復 全走 `pbxAdapter.{answer/hangup/hold/resume}` （**不再**直接 fetch 3CX）
- [v1] Mute 走 webview preload IPC（local mic track on/off）
- [v1] 撥號盤浮動視窗（從 Bar 點擊浮出，可釘住）
- [v1] DTMF 輸入
- [**v2 NEW**] **接 `@voxen/crm-mock`** — 來電 → `customer360Service.getProfileByPhone()` → Bar 顯示客戶
- [**v2 NEW**] ⭐ **MVP demo milestone**: incoming call → CRM 查詢 → Bar 顯示「王先生 + 上次 agent01 + 4 通歷史」可 live demo

**Week 2 Acceptance**:
- 玉山 demo 客戶 (10 人) 來電全部能正確顯示
- 通話控制 5 個動作（接 / 掛 / hold / resume / DTMF）跑通
- 玉山 IT 任何時候要看，**5 分鐘內可開展示**

### Week 3 — 進階通話控制
- 盲轉（指定目標分機 → REFER）
- 諮詢轉（保留現通話 → 撥第三方 → 確認 → 完成轉接）
- 三方會議
- 轉回原通話（諮詢轉失敗 / 取消時）

**全部透過 PBXAdapter contract，不直接碰 3CX**

### Week 4 — 自由座席登入
- LDAP 模組（Main process，用 `ldapjs`）
- 配置驅動的 auth method 切換（ldap / api / login / manual）
- 啟動流程：Windows username → LDAP → 分機號 → SIP creds → 3CX REGISTER
- 登出流程：3CX session 斷 → Bar 變灰 → 等下個使用者

### Week 5 — SIP 密碼安全儲存
- DPAPI LocalMachine 模組（native node-dpapi）
- IT 部署用 CLI 工具：`ada-encrypt-creds.exe` 給每台 PC 預先加密
- API 模式：HTTPS GET 密碼（with Kerberos / Bearer auth）
- 全域熱鍵（`globalShortcut`）

### Week 6 — UX 完整化
- 來電中央通知視窗（圖示 + 鈴聲 + 接聽/拒絕按鈕）
- 通知音效（自訂 ringtone 設定）
- 系統列圖示 + 右鍵選單
- `tel://` 協定註冊（從瀏覽器/Outlook 點電話直接撥）
- CRM Webhook 框架（取代靜態 URL 模板）

### Week 7 — 內測 + 壓測 + 安全審查
- 在乾淨 Windows VM 上實際安裝測試
- 跟玉山 IT 協調 LDAP schema、SIP credentials API spec
- 完成 InfoSec 文件第一版（SBOM、DFD、Threat Model）
- 50 並發 SoftPhone 壓測（SIPp + Grafana）
- 內部全套情境測試

### Week 8 — SIT 預備
- Code Signing 套用（cert 應該已到位）
- 最終 release 打包
- SIT 環境部署
- 給玉山的安裝手冊 + 使用者手冊（中文）

---

## 4. VOXEN 整合的具體影響（v2 新增）

### ada 程式碼結構變更

```
原 (v1):
  ada/src/main/
    threecxClient.ts          ← 直接 fetch 3CX
    threecxEvents.ts          ← 直接訂 WebSocket
    callController.ts         ← 用 threecxClient

v2:
  ada/src/main/
    voxenIntegration.ts       ← NEW. 初始化 @voxen/pbx-3cx + EventBus
    callController.ts         ← 改用 PBXAdapter contract
    customerLookup.ts         ← NEW. 用 Customer360Service
    [刪除] threecxClient.ts
    [刪除] threecxEvents.ts
```

### ada package.json 變更

```diff
{
  "name": "ada",
  "dependencies": {
+   "@voxen/core": "workspace:^",
+   "@voxen/pbx-3cx": "workspace:^",
+   "@voxen/crm-mock": "workspace:^"
  }
}
```

`@voxen/crm-mock` 在 dev / demo / SIT 階段使用；玉山 production 階段會替換為真實 CRM adapter（待 Discovery 階段對齊 spec）。

### ada 加入 monorepo workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'core'
  - 'integrations/*/*'
  - 'ada'        # ← 新增
```

ada 維持自己的 electron-vite tooling，不被 monorepo root tsc / test 接管。

---

## 5. 同步進行的非程式工作

- ☐ Code Signing Cert 申請（OV 等，3-7 天 issue）
- ☐ 跟玉山 IT 確認 AD 屬性 / LDAP 連線權限 / SIP credentials API spec
- ☐ Terms of Service / Privacy Policy 草稿
- ☐ 隱私衝擊評估（DPIA）—— 處理通話資料
- ☐ **[v2 NEW]** 預先準備 `@voxen/pbx-3cx` 跟 ada 的整合測試環境（mock 3CX server 已存在於 `integrations/pbx/3cx/test/`）

---

## 6. 風險與緩解

| 風險 | 機率 | 衝擊 | 緩解 |
|------|:---:|:---:|------|
| Code Signing Cert 卡關 | 中 | 高 | 立刻申請，最壞用 self-signed + 玉山 IT 加白名單 |
| LDAP schema 跟玉山對不上 | 中 | 中 | 配置驅動，支援多種屬性名 |
| 3CX 無法滿足某通話控制 API | 低 | 高 | webview 後備（取消 Bar、回大視窗） |
| 自由座席登入超過 5 秒 | 中 | 中 | LDAP 預先 cache、SIP creds 本機預載 |
| InfoSec 滲透測試發現嚴重漏洞 | 中 | 高 | 文件提早寫、第三方早期 review |
| **[v2 NEW]** Week 1 vendor decoupling 撞到隱性 coupling | 中 | 中 | 漸進式換、保留 regression test、發現一個處理一個 |
| **[v2 NEW]** `@voxen/core` API 在 Phase 6 期間異動 | 低 | 中 | ada package.json lock 版本，新版透過 PR 升 |
| Genesys/Zoom 提案被玉山偏好 | 低 | 致命 | 強調本地支援 + 整合深度 + 價格 |

---

## 7. Out of scope（不要做）

- Supervisor 監聽 / 插話 / wallboard → Phase 7+
- 多 PBX / SaaS multi-tenancy → Phase 8+
- AI 摘要 / transcribe → 加值版
- macOS / Linux 安裝包 → 玉山不需要
- 行動 App → 不在 ada 範圍
- **[v2 NEW]** 不擴展 `@voxen/core` — 如需新 contract 走獨立 ADR

---

## 8. 已決定不做的折衷

- **Presence 同步**留 local-only（XAPI User scope 限制）—— 玉山如需 supervisor 看 agent 狀態，由 3CX 自家管理介面提供
- **CDR 視圖**用 webview 跳到 3CX Web Client 的 `/call_history`（同樣權限限制）
- **macOS 開發版**保留給開發者自用，不官方支援
- **[v2 NEW]** **3CX Web Client 仍是 webview 媒體 sink** — 不取代為自家 SIP stack。Phase 7+ 再評估 SIP.js 替代方案

---

## 9. 給未來讀者的提醒

如果你 6 個月後讀這份 plan 而 v3 還沒出：

- ada 已完成 Phase 6，是 **VOXEN 平台 L6 reference application**
- 想看 L6 怎麼跟 VOXEN 平台整合？讀 `ada/src/main/voxenIntegration.ts`
- 想加新 PBX 支援？實作 `PBXAdapter` interface（看 `@voxen/pbx-3cx` 抄）
- 想加新 CRM 支援？實作 `CustomerLookupAdapter` + `CallHistoryAdapter`（看 `@voxen/crm-mock` 抄）
- 任何架構疑問，先翻 `docs/adr/` 找答案
