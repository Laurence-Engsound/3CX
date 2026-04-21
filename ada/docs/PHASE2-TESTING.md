# Phase 2 — Softphone 測試與除錯指南

> 對應 Code：SIP.js 0.21 + 3CX V20.0 Update 8 (Build 1121)
> 目標：在 ADA 視窗成功 REGISTER 到 `engsound.3cx.com.tw`，並可雙向通話

---

## 1. 啟動前檢查

| 檢查項目 | 怎麼做 |
|---------|-------|
| `npm install` 已重跑 | Phase 2 沒新增相依，但 Phase 1 已加 `sip.js` 到 `package.json`，應該已經裝好。執行 `ls node_modules/sip.js` 確認 |
| 3CX 測試分機已存在 | 進管理介面 → 用戶 → 確認該分機（例如 1000）狀態為「在線」或「離線」（不是「停用」） |
| 已取得分機的 SIP 密碼 | 用戶編輯頁找 Auth ID / Auth Password；若找不到，看 Phase 1 對話紀錄 |
| 麥克風權限（macOS） | 系統設定 → 隱私權 → 麥克風 → 確認「終端機」或「Electron」可勾選 |

---

## 2. 確認 WSS URL 正確

V20 的 WebRTC gateway 預設 URL 是：

```
wss://engsound.3cx.com.tw:443/ws
```

**如果 ADA REGISTER 失敗，第一件事就是確認 WSS URL**。最快的驗證方法是用 3CX 自己的 Web Client：

1. 用 Chrome 打開 `https://engsound.3cx.com.tw/webclient` 並登入
2. 按 `F12` → DevTools → **Network 分頁** → 篩選 `WS`
3. 找到 status 為 `101 Switching Protocols` 的那一條
4. 看它的 `Request URL` —— 那才是真正的 WSS endpoint

如果不是 `wss://engsound.3cx.com.tw:443/ws`，請編輯 `src/core/sip/SipClient.ts` 的 `wsServer()` method：

```typescript
private wsServer(): string {
  const port = this.config.wssPort ?? 443
  return `wss://${this.config.pbxFqdn}:${port}/ws`  // ← 改這裡的路徑
}
```

> 常見變體：`/ws`、`/webclient/api/webRTC/ws`、`/webrtc`

---

## 3. 啟動與測試流程

```bash
cd ~/3CX/ada
npm run dev
```

**首次啟動：**
1. 自動跳到 `/login`
2. 填入分機號 + SIP 密碼 → 按「儲存並登入」
3. 預期看到上方狀態列圓點轉**綠色**，文字變「已註冊」

**第二次啟動：**
- 應該**不會回到登入頁**，App.vue 會從 keychain 抓密碼自動 connect
- 直接停在話機畫面，狀態列顯示「已註冊」

**撥打測試：**
- 用另一支 3CX Web Client 登入別的分機（例如用 `https://engsound.3cx.com.tw/webclient` 登入 1002）
- 在 ADA 撥號盤打 `1002` → 按綠色「撥打」
- 對方應該收到來電，接通後雙向通話

**接聽測試：**
- 用另一台/另一支分機打進 ADA 的分機
- ADA 視窗應該自動切到「來電」畫面，顯示對方號碼
- 按「接聽」→ 通話建立

---

## 4. 常見錯誤與排除

### 4.1 `WSS transport failed: WebSocket connection failed`

**可能原因：**
- WSS URL 路徑錯誤 → 看上面 §2
- 防火牆阻擋 → 確認本機可 `curl -I https://engsound.3cx.com.tw`
- 3CX 的 SSL 憑證過期或自簽 → Chromium 會擋自簽憑證；須在 3CX 管理介面更新成有效憑證

### 4.2 註冊失敗 `401 Unauthorized` / `403 Forbidden`

- **401**：分機號或 SIP 密碼錯誤 —— 回管理介面複製一次
- **403**：常見於 V20 沒打開「允許第三方 SIP 註冊」。進該用戶編輯頁 → 找 `3CX App` 或 `Web Client` 是否被獨佔；可能要切到允許並發 SIP 註冊的設定

### 4.3 註冊成功，但通話沒聲音

按順序檢查：
1. **DevTools Console** 有沒有 `play() rejected`
   - 若有，瀏覽器 autoplay policy 阻擋 → 在 ADA 視窗點任何按鈕一次（觸發 user gesture）後再試
2. **DevTools → chrome://webrtc-internals/**（在 Electron 內無法直接開啟，但可以加 menu shortcut）
3. **檢查麥克風授權**：macOS 可能還沒給 Electron 麥克風權限，第一次 `getUserMedia` 會跳出系統對話框，務必選「允許」
4. 如果有送出去的音訊但對方沒聲音 → STUN/ICE 問題；3CX 內網應該不需要 STUN，但我們加了 Google 的 STUN 作為保險

### 4.4 `Refused to connect to wss://...` (CSP)

CSP 已在 `src/renderer/index.html` 設定允許 `engsound.3cx.com.tw`，**但只允許預設 port 443**。如果您的 WSS 在其他 port（例如 5001），需要在 CSP 加上：

```html
connect-src 'self' https://engsound.3cx.com.tw wss://engsound.3cx.com.tw wss://engsound.3cx.com.tw:5001
```

### 4.5 `getUserMedia` 失敗（Linux）

```bash
pactl list short sources    # 確認 PulseAudio 看得到麥克風
arecord -l                   # 或 ALSA
```

無聲音來源 → 通常是 USB 耳麥沒插好，或 PulseAudio 服務沒啟。

---

## 5. 觀察 SIP traffic（除錯神器）

`SipClient.ts` 在 dev 模式會自動開 `traceSip: true`。在 ADA DevTools → Console 會看到：

```
[2026-04-21T12:34:56.789Z] sip.js:Transport ws://...
SEND →
REGISTER sip:engsound.3cx.com.tw SIP/2.0
...
RECV ←
SIP/2.0 401 Unauthorized
...
```

這就是 SIP 訊息的明文 trace。401 後接著 SIP.js 會自動帶 `Authorization` header 重送 REGISTER，第二次應該收到 `200 OK`。

如果**只看到 SEND 沒看到 RECV**，代表 WSS 根本沒連通；如果看到 RECV 401 但沒看到第二次 SEND，代表帳密 / WSS URL 設定錯。

---

## 6. 完成定義（Done When）

- [ ] 啟動 ADA 後狀態列顯示「已註冊」（綠燈）
- [ ] 從 ADA 撥另一支分機，對方能聽到我，我也能聽到對方
- [ ] 從另一支分機撥 ADA 的分機，視窗自動跳出「來電」UI，可接聽
- [ ] 接聽後可按「靜音」讓對方聽不到自己；按「掛斷」能正常結束
- [ ] 設定頁啟用 Screen Pop + 模板 `https://example.com/?phone={caller}` 後，來電會自動開啟瀏覽器到該 URL

如以上五項全部 OK → Phase 2 通過，可進入 Phase 3（保留 / 轉接 / 會議 / DTMF 完整實作）。
