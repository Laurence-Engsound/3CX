# ADA — Agent Desktop Application

3CX V20 的座席端桌面應用程式（Softphone + Agent Client）。
Electron + TypeScript + Vue 3，支援 Windows 與 Linux。

> 目前版本：**Phase 1 骨架** — 可啟動視窗、UI 骨架完成，尚未串接 SIP 與 XAPI。

---

## 快速開始

### 環境需求

- **Node.js 20 LTS** 以上（含 npm 10）
- **Python 3**（`keytar` 在部分 Linux 發行版編譯時需要）
- Linux 額外：`libsecret-1-dev`、`libx11-dev`、`libxtst6`、`libnotify-bin`
  ```bash
  sudo apt install -y libsecret-1-dev libx11-dev libxtst6 libnotify-bin libnss3 libasound2
  ```
- Windows 額外：**Build Tools for Visual Studio**（含 Desktop C++ workload），
  安裝 `keytar` 原生模組時會用到。

### 安裝相依

```bash
cd ada
npm install
```

> 若 `keytar` 編譯失敗，請先安裝上述系統相依再 `npm rebuild keytar`。

### 開發模式（HMR）

```bash
npm run dev
```

- 開啟 Electron 視窗
- Renderer 透過 Vite 熱更新（edit Vue → 自動 reload）
- Main / Preload 存檔後自動重啟 Electron
- DevTools 預設以 detached 模式開啟

### 型別檢查

```bash
npm run typecheck
```

會同時跑 `tsconfig.node.json`（Main/Preload/Shared）與 `tsconfig.web.json`（Renderer + core）。

### 打包

```bash
# 只打 Windows
npm run package:win

# 只打 Linux (AppImage + deb)
npm run package:linux

# 兩者一起
npm run package:all
```

產物位於 `dist/`。

---

## 目錄結構

詳見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。核心：

```
src/
├── main/       Electron 主程序（視窗、托盤、IPC、設定持久化、金鑰環）
├── preload/    透過 contextBridge 暴露 window.ada 給 Renderer
├── renderer/   Vue 3 UI（views、components、stores）
├── core/       業務邏輯（sip/、threecx/、crm/）— 與 UI 解耦
└── shared/     Main/Preload/Renderer 共用的型別與 IPC 合約
```

---

## 目前完成度

| 區塊 | 狀態 | 備註 |
|------|:---:|------|
| Electron 骨架（Main/Preload/Renderer） | ✅ | 含單一執行個體、托盤 |
| Vue 3 Renderer + 路由 + Pinia | ✅ | 4 個 view：登入/話機/紀錄/設定 |
| 安全 IPC 介面 (`window.ada`) | ✅ | app、settings、screenPop、credentials |
| 設定持久化（electron-store） | ✅ | profile / screenPop / ui |
| 金鑰環（keytar） | ✅ | SIP 密碼以 OS keychain 加密 |
| Screen Pop URL 模板引擎 | ✅ | `{caller}`、`{callId}`、`{direction}` |
| SIP.js UA（註冊、撥打、接聽） | ⏳ | Phase 2 實作 |
| 通話控制（保留、轉接、DTMF） | ⏳ | Phase 3 |
| 3CX XAPI v2 (OAuth + REST + WS) | ⏳ | Phase 4 |
| 自動更新、CI 打包 | ⏳ | Phase 5 |

---

## 3CX 連線參數（專案預設）

- **PBX FQDN**：`engsound.3cx.com.tw`
- **3CX 版本**：V20.0 Update 8 (Build 1121)
- **WSS (SIP)**：預設 443，若 3CX 管理介面有指定其他 port，請至設定頁調整
- **XAPI 基底 URL**：`https://engsound.3cx.com.tw/xapi/v1/`
- **OAuth Token endpoint**：`https://engsound.3cx.com.tw/connect/token`

> 首次啟動時，`Login` 頁會要求輸入分機與 SIP 密碼；密碼會透過 OS 金鑰環加密保存。
> XAPI 的 Client ID / Secret 將在 Phase 4 加入設定頁（需在 3CX 管理介面建立 Integrations → API）。

---

## 疑難排解

### 啟動時視窗空白
1. 確認 `npm run dev` 終端機有 `vite` 的 `Local:` URL
2. 打開 DevTools（自動 detached）看 Console 是否有 CSP 阻擋
3. 若 CSP 阻擋了某個外部資源，編輯 `src/renderer/index.html` 的 `<meta http-equiv="Content-Security-Policy">`

### keytar 編譯失敗（Linux）
```bash
sudo apt install libsecret-1-dev
npm rebuild keytar
```

### 麥克風權限（Linux）
Electron 在 Linux 上不會彈出權限對話框，但仍需 PulseAudio / PipeWire 能擷取麥克風。
```bash
pactl list short sources   # 確認來源存在
```

### Linux 打包成 deb 無法啟動
通常是 `libnss3`、`libasound2` 未安裝：
```bash
sudo apt install libnss3 libasound2 libxtst6 libnotify4
```

---

## 下一步（Phase 2 規畫）

1. 在 `src/core/sip/SipClient.ts` 實作 SIP.js `UserAgent` + `Registerer` + `Inviter`
2. 將 `useCallStore.dial()` / `hangup()` / `toggleMute()` 接到 `SipClient`
3. 加入 remote audio element 到 `PhoneView.vue`，透過 `MediaManager.attachRemote` 播放
4. 加入註冊狀態 → `useAgentStore.setRegistrationState()` 的 pipeline
5. 首輪測試：在 3CX 建立測試分機 → 分機註冊成功 → 內線互撥

準備好就開始 Phase 2！
