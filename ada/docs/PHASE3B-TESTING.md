# Phase 3.B — Web Client 事件偵測與 Screen Pop

## 目標

在 webview 載入的 3CX Web Client 之上**不侵入 3CX、不解析專有協定**的前提下，偵測通話事件，觸發 Screen Pop。

## 工作原理

```
┌──────────────────────────────────────────────────────────┐
│  ADA Renderer (Vue)                                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  <webview> (3CX Web Client)                        │   │
│  │   ↑ preload: out/preload/webview-preload.js        │   │
│  │   preload 觀察 DOM/title → ipcRenderer.sendToHost  │   │
│  └──────────────────┬─────────────────────────────────┘   │
│                     │ webview 'ipc-message' event         │
│                     ▼                                     │
│              useWebclientStore.ingest()                   │
│                     │                                     │
│                     ▼                                     │
│           triggerScreenPop() (若偵測到 call)              │
└──────────────────────────────────────────────────────────┘
```

**關鍵設計：**
- Webview preload 在 3CX Web Client 內執行，擁有 Node.js 整合
- 透過 `ipcRenderer.sendToHost()` 送事件到宿主 `<webview>` 元素
- ADA 主 renderer 以標準 DOM event `ipc-message` 接收
- 偵測邏輯**只靠 title / URL / 簡單 DOM**（穩定度高，跨版本相容）

## 已實作的事件類型

| type | subtype | 觸發時機 |
|------|---------|---------|
| `ready` | — | webview preload 開機完成 |
| `title` | — | `document.title` 變化 |
| `url` | — | 頁面 URL 變化（SPA routing） |
| `console` | warn/error | Web Client 內部 console.warn/error |
| `call` | `incoming` | Title 出現 "Incoming + 號碼" |
| `call` | `started` | Title 只有電話圖示 + 號碼 |
| `call` | `ended` | Title 回到 idle 狀態 |

## 測試流程

```bash
cd ~/3CX/ada
npm run dev
```

### 步驟 1：開啟除錯面板
在 ADA 視窗話機頁工具列按 **🐞** 圖示 → 右側出現「Web Client 事件」面板

### 步驟 2：觀察首批事件
載入 Web Client 後應該立刻看到：
- `preload ready`
- `title → 3CX - Web Client`（或類似）
- `url → https://engsound.3cx.com.tw/webclient/#/...`

### 步驟 3：撥打測試
**撥出**：在 Web Client 撥號盤輸入分機號 → 按撥打

預期事件序列（取決於 3CX 標題格式）：
- `url → ...` 切到通話頁
- `title → 📞 1003 | 3CX`（或類似）
- `call/started 1003` ← **此時應該觸發 Screen Pop**

**接聽**：用另一支分機撥進 1000

預期事件序列：
- `title → Incoming 分機號 | 3CX`
- `call/incoming 1005` ← **Screen Pop 觸發**
- （按接聽後）`title → 📞 1005 | 3CX`
- `call/started` （升級為通話中）

**掛斷**：
- `title → 3CX - Web Client`
- `call/ended`

## 若 Screen Pop 沒觸發

### 1. 確認 Screen Pop 已啟用
- 設定頁 → **啟用來電自動開啟網頁** 打勾
- URL 模板填入，例如 `https://example.com/lookup?phone={caller}`

### 2. 看事件流
- 按 🐞 打開除錯面板
- 撥一通電話
- **如果完全沒有 `call/*` 事件** → title 正則不匹配，需要調整 `webview-preload.ts` 的 `inferCallStateFromTitle()`
- **如果有 `call/incoming` 但 caller 是空的** → regex 抓不到號碼，調整正則

### 3. 調整偵測規則
1. 打開 webview DevTools（按工具列的 ⌘ 按鈕）
2. 在 Console 輸入 `document.title` 觀察各狀態下的 title
3. 把看到的字串模式回報給我，我修改 `inferCallStateFromTitle()`

### 常見 3CX V20 Title 格式（可能）
- Idle: `3CX - Web Client` 或 `1000 - 3CX`
- Ringing: `📞 Incoming from 1005` 或 `(1) 3CX - Web Client`
- In call: `📞 1005 - 00:12` 或 `1005 | 3CX`
- 具體以您環境為準

## 進階：用 DOM 輔助偵測

若 title 不夠穩定，可在 `webview-preload.ts` 加：
1. MutationObserver 監看特定 class（例如 `.incoming-call-modal`）
2. 監聽按鈕點擊（撥打按鈕按下 → outgoing）
3. document 的 ringing audio element 播放事件

每種輔助規則都應獨立發送 `call` 事件，store 負責去重 / 狀態機合併。

## Phase 4 預告

當 XAPI 整合完成後，事件來源會再加一條：3CX WebSocket event stream。它提供**官方且權威**的通話事件（含 call-id、presenter 資訊），會取代 / 覆蓋 title heuristic。Phase 4 起，title 監聽變成 fallback。
