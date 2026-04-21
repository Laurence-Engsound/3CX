# ADA — Agent Desktop Application 架構文件

> Phase 1 骨架版本 ‧ 對應 3CX V20.0 Update 8 (Build 1121)
> Target FQDN: `https://engsound.3cx.com.tw`

---

## 1. 專案目標

打造一套座席端桌面應用程式 (Agent Desktop Application, 簡稱 **ADA**)，整合 3CX PBX 並提供：

1. **Softphone**：透過 WebRTC 直接註冊為 SIP 分機，可撥打與接聽
2. **通話控制**：保留、靜音、轉接（盲轉 / 諮詢轉）、三方會議、DTMF
3. **座席狀態**：Ready / Not Ready，整合 3CX Queue
4. **通話紀錄 (CDR)**：透過 3CX API 查詢個人通話歷史
5. **Screen Pop**：來電時依設定的 URL 模板開啟瀏覽器頁面

支援平台：**Windows 10/11** 與 **Linux (Ubuntu/Debian/RHEL 系)**。

---

## 2. 技術堆疊

| 層級 | 技術 | 原因 |
|------|------|------|
| 應用框架 | **Electron 30+** | 跨平台、內建 Chromium 提供成熟 WebRTC |
| 語言 | **TypeScript 5+** (strict mode) | 型別安全，降低 IPC 與通話狀態機的錯誤 |
| 建置工具 | **electron-vite** | 主程序、Preload、Renderer 三邊熱更新 |
| UI 框架 | **Vue 3** + `<script setup>` | 使用者指定 |
| 狀態管理 | **Pinia** | Vue 官方推薦，支援 TypeScript |
| 樣式 | **Tailwind CSS 3** | 快速建構座席 UI |
| SIP 堆疊 | **SIP.js 0.21+** | 業界標準、與 3CX WebRTC Gateway 相容 |
| 打包 | **electron-builder** | Windows NSIS + Linux AppImage/deb |

---

## 3. Electron 三程序模型

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                        │
│  - BrowserWindow 管理      - 系統托盤 (Tray)                      │
│  - 自動更新 (auto-updater) - shell.openExternal (Screen Pop)     │
│  - 全域快捷鍵              - 設定持久化 (electron-store)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ IPC (contextBridge)
┌──────────────────────▼──────────────────────────────────────────┐
│                     Preload Script                               │
│  - 透過 contextBridge 暴露 window.ada API                         │
│  - 不直接暴露 Node.js / Electron API 給 Renderer                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ window.ada.*
┌──────────────────────▼──────────────────────────────────────────┐
│                  Renderer (Vue 3 App)                            │
│  - UI 元件 (撥號盤、通話視窗、CDR、設定)                          │
│  - Pinia stores (callStore, agentStore, settingsStore)           │
│  - core/ 模組 (SIP.js、XAPI、Screen Pop URL 模板引擎)             │
│  - WebRTC PeerConnection 與 MediaStream 在 Renderer 內處理       │
└─────────────────────────────────────────────────────────────────┘
```

**重要設計原則：**

- **WebRTC 在 Renderer 處理**：因為 Chromium 的 `getUserMedia` / `RTCPeerConnection` 只能在 Renderer 取得，所以 SIP.js 的整個 user agent 也跑在 Renderer。
- **Main 不碰通話邏輯**：Main 只處理 OS 層級的事務（視窗、托盤、外部 URL 開啟、自動更新）。
- **Preload 為單一安全閘**：Renderer 不啟用 `nodeIntegration`，所有跨程序呼叫都走 `contextBridge`。

---

## 4. 與 3CX 的整合策略（Hybrid）

3CX V20 提供兩條互補的整合管道，ADA **同時使用兩者**：

### 4.1 媒體路徑（Media Path）— SIP.js + WebRTC

- **協定**：SIP over WSS (WebSocket Secure) + SRTP via WebRTC
- **端點**：`wss://engsound.3cx.com.tw:5001` （或 V20 預設 443，依實際 PBX 設定為準）
- **責任**：
  - REGISTER 為 SIP 分機
  - INVITE / 200 OK / ACK / BYE 通話建立與終結
  - re-INVITE 用於保留 (hold)、轉接 (REFER)
  - DTMF (RFC 2833 / SIP INFO)
  - Mute（在 Renderer 端調整 `MediaStreamTrack.enabled`）
- **驗證**：使用 3CX 分機的 SIP 帳號 / 密碼，或 3CX 提供的 Web Provisioning 連結

### 4.2 控制路徑（Control Path）— Call Control API v2 (XAPI)

- **協定**：HTTPS REST + WebSocket 事件流
- **端點**：`https://engsound.3cx.com.tw/xapi/v1/...`、`wss://engsound.3cx.com.tw/callcontrol/...`
- **驗證**：OAuth 2.0 Client Credentials Flow（3CX V20 已改為此機制）
- **責任**：
  - 取得 Token：`POST /connect/token`
  - 取得分機 / 使用者資料
  - 切換座席狀態（Ready / Not Ready / Lunch / Wrap-up …）
  - 查詢 Queue 狀態與其他座席的 Presence
  - 訂閱事件流（來電通知、隊列變動）
  - 查詢 CDR / Call Log

### 4.3 為何兩者都需要？

| 功能需求 | 只用 SIP.js？ | 只用 XAPI？ | 兩者並用 |
|---------|:-----------:|:----------:|:------:|
| 撥打/接聽通話（音訊） | ✅ | ❌（無媒體） | ✅ |
| 保留 / 靜音 / DTMF | ✅ | ⚠️ 部分 | ✅ |
| 座席 Ready / Not Ready | ❌ | ✅ | ✅ |
| Queue 狀態 / 其他座席 Presence | ❌ | ✅ | ✅ |
| 個人 CDR 查詢 | ❌ | ✅ | ✅ |
| 來電 Screen Pop（取主叫號碼即可） | ✅ | ✅ | ✅ |

**結論**：媒體必須走 SIP.js / WebRTC；3CX 企業功能必須走 XAPI。兩者並存是 V20 ADA 的標準作法。

---

## 5. 專案目錄結構

```
ada/
├── package.json
├── electron.vite.config.ts          # electron-vite 主設定
├── tsconfig.json                    # 根 tsconfig（references 指向各子 tsconfig）
├── tsconfig.node.json
├── tsconfig.web.json
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── .editorconfig
├── electron-builder.yml             # 打包設定 (Windows + Linux)
│
├── docs/
│   └── ARCHITECTURE.md              # 本文件
│
├── resources/                       # 應用圖示 (icon.ico, icon.png)
│
├── build/                           # electron-builder 額外資源
│
└── src/
    ├── main/                        # Electron Main Process
    │   ├── index.ts                 # 進入點：建立 BrowserWindow、註冊 IPC
    │   ├── window.ts                # 主視窗工廠
    │   ├── tray.ts                  # 系統托盤
    │   ├── ipc.ts                   # IPC handler 註冊中心
    │   └── shell.ts                 # shell.openExternal 包裝（Screen Pop）
    │
    ├── preload/                     # Preload script
    │   └── index.ts                 # contextBridge 暴露 window.ada API
    │
    ├── renderer/                    # Vue 3 應用
    │   ├── index.html
    │   └── src/
    │       ├── main.ts              # Vue 進入點
    │       ├── App.vue              # 根元件 + 路由 outlet
    │       ├── router.ts            # vue-router 設定（簡單頁面切換）
    │       ├── style.css            # Tailwind entrypoint
    │       ├── components/
    │       │   ├── Sidebar.vue      # 側邊功能列
    │       │   ├── StatusBar.vue    # 連線/註冊狀態列
    │       │   └── Dialer.vue       # 撥號盤（佔位）
    │       ├── views/
    │       │   ├── LoginView.vue    # 登入 / 分機設定
    │       │   ├── PhoneView.vue    # Softphone 主畫面
    │       │   ├── HistoryView.vue  # CDR / 通話紀錄
    │       │   └── SettingsView.vue # 設定（Screen Pop URL 模板等）
    │       ├── stores/
    │       │   ├── settings.ts      # 設定 store
    │       │   ├── agent.ts         # 座席狀態 store
    │       │   └── call.ts          # 通話狀態 store
    │       └── composables/
    │           └── useIpc.ts        # 包裝 window.ada
    │
    ├── core/                        # 與 UI 框架無關的業務邏輯
    │   ├── sip/
    │   │   ├── SipClient.ts         # SIP.js UA 包裝（Phase 2 實作）
    │   │   ├── CallSession.ts       # 單通通話狀態機
    │   │   ├── MediaManager.ts      # 麥克風 / 喇叭裝置
    │   │   └── types.ts
    │   ├── threecx/
    │   │   ├── XapiClient.ts        # OAuth + REST 包裝
    │   │   ├── EventStream.ts       # WebSocket 事件流
    │   │   ├── AgentState.ts        # Ready/NotReady 抽象
    │   │   └── types.ts
    │   └── crm/
    │       └── ScreenPop.ts         # URL 模板引擎
    │
    └── shared/                      # Main / Preload / Renderer 共用
        ├── ipc-api.ts               # IPC 介面型別
        └── types.ts                 # 共用領域型別（CallState、AgentStatus…）
```

---

## 6. 開發階段路線圖

| Phase | 範圍 | 完成定義 |
|-------|------|---------|
| **1** | 專案骨架 ✓ | `npm run dev` 可開啟視窗、Vue UI 顯示、可打包出 Windows + Linux 安裝檔 |
| 2 | 基礎 Softphone | 可登入、註冊到 3CX、雙向撥打、聽見/被聽見 |
| 3 | 通話控制 | 保留、靜音、盲轉、諮詢轉、會議、DTMF |
| 4 | XAPI 整合 | OAuth 登入、Ready/NotReady、CDR 查詢、事件流 |
| 5 | Screen Pop & 部署 | URL 模板、設定持久化、自動更新、CI 打包 |

---

## 7. 安全考量（Phase 1 起就要遵守）

1. **Renderer 不啟用 nodeIntegration**：`contextIsolation: true`、`sandbox: true`（除非 SIP.js 有相容性需求才放寬）
2. **Preload 只暴露白名單 API**：所有 `window.ada.*` 必須在 `shared/ipc-api.ts` 定義型別
3. **3CX 帳號密碼以 OS 安全儲存**：使用 `keytar` 或 `safeStorage`，不存明文
4. **Screen Pop URL 模板的參數要做 URL encoding**：避免使用者輸入的號碼破壞 URL 結構
5. **CSP**：Renderer 端設定 Content Security Policy，限制可連線的 origin 為 3CX FQDN

---

## 8. 後續閱讀

- [3CX V20 Call Control API 文件](https://www.3cx.com/docs/call-control-api/)
- [SIP.js 官方文件](https://sipjs.com/)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-vite 文件](https://electron-vite.org/)
