# Phase 2.B — Webview 架構轉向

> 背景：3CX V20 沒有公開傳統 SIP over WebSocket 端點給第三方
> 策略：ADA 內嵌 3CX Web Client，媒體與 SIP 信令交由 Web Client 處理，
> ADA 專注於做座席功能的外殼（Screen Pop、Ready 切換、CDR、XAPI）

---

## 1. 為什麼放棄純 SIP.js？

在 Phase 2 我們診斷過程中確認：

| 嘗試 | 結果 |
|------|------|
| `wss://fqdn:443/ws` | `WebSocket close code 1006` — 端點不存在 |
| `wss://fqdn/ws/webclient?sessionId=…&pass=…` | `Sec-WebSocket-Protocol 'sip' 未被接受` — 此端點跑 3CX 專有協定，非 SIP |
| `wss://fqdn/webrtc` & `/webrtc/ws` | `1006` — 端點不存在 |

3CX 管理介面 → **Advanced → Parameters** 顯示：
- `ALLOW_MYPHONE_WEBRTC_ENDPOINT = 1`（啟用）
- `WEBRTC_SIP_BINDING_INTERFACE = 127.0.0.1`（**只綁本機**，外部無法直連）
- `WEBRTC_SIP_PORT = 5063`（內部 port）

意即 3CX V20 的 WebRTC SIP gateway 只接受**自家 Web Client 從 `/ws/webclient` 走專有協定**進來，
第三方 SIP over WSS 在 V20 已被關閉。

## 2. 新架構：Hybrid Webview + XAPI

```
┌──────────────────────────────────────────────────────────────────┐
│                   ADA Electron Main Window                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ StatusBar: Ready/Not Ready 切換、PBX 連線資訊              │    │
│  ├──────────┬────────────────────────────────────────────────┤    │
│  │          │                                                 │    │
│  │ Sidebar  │   <webview src="https://fqdn/webclient">        │    │
│  │  話機    │   ─────────────────────────────────────────     │    │
│  │  紀錄    │   ▸ 3CX 自家 Web Client 完整運作                │    │
│  │  設定    │   ▸ 撥號、接聽、保留、轉接都由它處理              │    │
│  │          │   ▸ 媒體 (getUserMedia + WebRTC) 由它處理        │    │
│  │          │   ▸ 登入憑證存在 partition:persist:3cx           │    │
│  │          │                                                 │    │
│  └──────────┴────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 並行：XAPI 做座席 / CDR / Screen Pop 事件
        ▼
┌──────────────────────────────────────────────────────────────────┐
│    3CX V20 Call Control API (OAuth) + WebSocket 事件流            │
└──────────────────────────────────────────────────────────────────┘
```

## 3. 取捨 (Trade-offs)

### 優點
- **立即可用**：1 天內完成 Phase 2.B，可以打電話了
- **功能完整**：3CX Web Client 已是成熟產品，通話所有功能（保留、轉接、會議、DTMF、多線）都自帶
- **升級穩定**：3CX 日後升級 V21、V22，只要 Web Client 在就繼續能用
- **低維護**：我們不用追著 3CX 的協定變化跑

### 缺點
- **UI 自由度低**：撥號盤、通話中畫面都是 3CX 的設計，我們無法客製
- **事件橋接需努力**：要偵測「來電」「掛斷」等事件觸發 Screen Pop，需在 webview 注入腳本讀 DOM 或 postMessage
- **3CX 改版風險**：若 3CX 改 Web Client UI，注入的選擇器可能失效
- **打包需登入一次**：部署到新機器時使用者仍要在 webview 內輸入 3CX 帳密

## 4. Phase 2.B 做完的範圍

- [x] `window.ts` 啟用 `webviewTag: true`、授予 media/notifications 權限
- [x] `PhoneView.vue` 主體改為 `<webview>` 指向 Web Client，附工具列（重新整理、DevTools）
- [x] `LoginView.vue` 只要求 PBX FQDN（真正登入在 webview 內）
- [x] `App.vue` 不再嘗試 SIP 自動註冊
- [x] `StatusBar.vue` 移除 SIP 註冊狀態，改顯示 PBX 目標
- [x] `webview` 使用 `partition="persist:3cx"` → 登入 session 持久化，下次啟動免登入

## 5. 尚未做的（Phase 3.B 以後）

- [ ] 透過 webview preload script 監聽 3CX Web Client 的通話事件
- [ ] 觸發 Screen Pop（偵測 incoming call → 抓主叫號碼 → `triggerScreenPop()`）
- [ ] Ready / Not Ready 同步：按 ADA 的 Ready 按鈕 → XAPI `SetPresence`
- [ ] CDR 視圖：Phase 4 接 XAPI 讀個人通話紀錄
- [ ] 全域快捷鍵：⌘⇧D 開啟撥號、⌘⇧A 接聽
- [ ] 通話完成通知：桌面通知整合

## 6. 驗收流程

```bash
cd ~/3CX/ada
npm run dev
```

預期行為：
1. 視窗開啟（寬度預設 1200px，容納 Web Client）
2. 若未設定過 FQDN → 登入頁
3. 填 `engsound.3cx.com.tw` → 按「儲存並開啟 Web Client」
4. 切到話機頁，看到 3CX Web Client 登入畫面
5. 在 webview 內用分機 + Web Client 密碼登入
6. 登入後可撥打 / 接聽；麥克風會跳授權對話框第一次，允許即可
7. 關掉 ADA 再開 → 不用再登入（partition 保留）

## 7. 故障排除

### Webview 一片空白
- DevTools → webview 內部 → Console 看錯誤
- 通常是 3CX 憑證問題或 FQDN 拼錯

### 麥克風按鈕灰色
- macOS：系統設定 → 隱私權 → 麥克風 → 允許 Electron
- 若仍失敗：Electron permission handler 記在 `window.ts`，可 log 所有 permission 請求除錯

### 想重新登入 3CX
- ADA 設定 → 修改分機設定 → 按儲存
- 或刪除 Electron 的 partition 資料：
  - macOS: `~/Library/Application Support/ada/Partitions/3cx/`
  - Linux: `~/.config/ada/Partitions/3cx/`

### 畫面比例不對
- Webview 的最小寬度是 Web Client 設計的最小寬度；ADA 主視窗預設 `1200×780`
- 若需更小視窗，調整 `window.ts` 的 `width / height / minWidth / minHeight`
