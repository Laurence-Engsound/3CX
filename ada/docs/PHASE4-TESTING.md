# Phase 4 — XAPI 整合測試指南

對應 Code：OAuth Client Credentials → XAPI REST + Call Control WebSocket → XAPI-driven Screen Pop + CDR 視圖
3CX 版本：V20.0 Update 8 (Build 1121)

---

## 1. Phase 4 加了什麼

| 能力 | 狀態 | 備註 |
|------|:---:|------|
| OAuth 2.0 Client Credentials 認證 | ✅ | `/connect/token`，60 分鐘自動續期 |
| XAPI REST 呼叫（CORS 正確處理） | ✅ | Main process 注入 `Access-Control-Allow-*` + OPTIONS → 200 |
| XAPI OData Quick Test | ✅ | `/xapi/v1/Defs?$select=Id` |
| Call Control REST（GET 系列） | ✅ | `/callcontrol`、`/callcontrol/{dn}`、`/callcontrol/{dn}/participants` |
| Call Control WebSocket 事件流 | ✅ | `/callcontrol/ws` + `Authorization: Bearer` header（Main 注入） |
| XAPI-driven Screen Pop | ✅ | 事件 → `getParticipant` → 抽取 caller → 觸發 Pop |
| CDR 通話紀錄（HistoryView） | ✅ | `/xapi/v1/ReportCallLogData` 等候選端點 |
| Presence 同步（Ready/Not Ready → 3CX） | ❌ | **本地狀態切換，不寫回 3CX**。需 Admin role，安全權衡後放棄 |

---

## 2. 一次性設定（3CX 端）

### 建立 Service Principal

1. 3CX Admin Console → **Integrations** → **API**
2. **+ Add** 一個新 Client：
   - **Client ID**：純英數字（例如 `adaclient`），**不可有連字號或大寫**
   - ☑ **Enable access to the 3CX Configuration API** → Department = System Wide, Role = **User**
   - ☑ **Enable access to the 3CX Call Control API** → 選要監控的 Extensions（例如 `Laurence Lin 1000`）
   - ☐ Chat API 不用勾
   - DID Number(s) 留空
3. 按 **Save**
4. 回到編輯頁，按 **Generate API Key** → 複製下來的字串（**只顯示一次**）

**授權要求：** 8SC+ Enterprise license（否則 Call Control 端點都是 404/403）。

### 為什麼 Role 選 User 不選 Admin？

- User scope 已足夠 ADA 所有現有功能：OAuth / XAPI REST 讀取 / Call Control GET / WebSocket 事件 / XAPI Screen Pop
- Admin scope 可寫全 PBX 設定；若 Client Secret 外洩風險極大
- 放棄 Presence 同步換取安全性（詳見 `project_xapi_scope_decision` 記憶）

---

## 3. ADA 端設定

1. 左側 ⚙ **設定** → 下拉到「**3CX API 整合（XAPI）**」區塊
2. ☑ 啟用 XAPI 整合
3. **Client ID**：填 3CX 那邊設的（例如 `adaclient`）
4. **Client Secret**：貼 Generate API Key 得到的字串
5. ☑ ADA 啟動時自動連線
6. 按 **「儲存」**（底下顯示「已儲存」表示寫進 keychain）
7. 按 **「測試連線」** → 綠框 "連線成功；access_token 已取得"
8. 按 **「連線事件流」** → WebSocket 狀態變 `connected`

---

## 4. 驗證四件事

### 4.1 OAuth 可用
設定頁按「測試連線」→ 綠色「連線成功」。

看 Main process terminal 會看到 Vite dev server 還在跑。Renderer DevTools Console 無紅色錯誤。

### 4.2 REST 可用
設定頁按「查看 API 資料」→ 下方顯示 6 個端點的結果：

```
200 /xapi/v1/Defs?$select=Id
200 /callcontrol
200 /callcontrol/adaclient
200 /callcontrol/adaclient/participants  → []（正常，此 route 沒活動）
200 /callcontrol/1000
200 /callcontrol/1000/participants       → 通話中時會有 item
```

全 200 = OK。若任何一個 401 → 回 3CX 確認 Service Principal 的勾選是否還在、並重新 Generate API Key。

### 4.3 WebSocket 事件流
1. 按「連線事件流」→ 狀態徽章 `connected`
2. 撥一通電話（例如從 Web Client 撥 0889）
3. 設定頁的事件流 log 應該在 1 秒內顯示：
   ```
   {"sequence":N,"event":{"event_type":0,"entity":"/callcontrol/1000/participants/M","attached_data":null}}
   ↳ participant 1000/M: {"id":M,"status":"Dialing","dn":"1000",...}
   ```
4. 掛斷後應看到 `event_type: 1`（Remove）

### 4.4 XAPI Screen Pop
1. 設定頁 → Screen Pop 區塊 → ☑ 啟用 + 填模板（例如 `https://www.google.com/search?q={caller}`）
2. ☑ 來電 + ☑ 撥出 都勾
3. 撥一通電話
4. 接通時**系統預設瀏覽器應自動開啟** Google 搜尋該號碼

若沒開 → DevTools Console 看 `[webclient] firePop called` 與 `screenPop config` log，確認 `enabled=true` 且 `triggerOn` 含當前方向。

### 4.5 CDR 通話紀錄
1. 左側 📋 **紀錄**
2. 自動呼叫 XAPI 拉最近 50 筆
3. 顯示時間 / 方向 / 來源 / 目的 / 時長
4. 若「原始回應樣本」區塊展開，可看前 3 筆完整 JSON

**若紀錄頁顯示錯誤訊息**「No known CDR endpoint responded 2xx」→ 這台 3CX 的 CDR endpoint 名稱不在候選列表，需要：
1. 回「設定 → 查看 API 資料」找 `/xapi/v1/$metadata` 回應
2. 搜尋 `EntityType ... CallLog`、`CallHistory`、`Cdr` 等字樣
3. 把正確名稱加到 `XapiClient.listCallHistory` 的 candidates 陣列

---

## 5. 已知限制

### 5.1 Presence 寫回 3CX 不可用
- `PATCH /xapi/v1/Users(id)` → 403 Forbidden（User scope）
- `POST /xapi/v1/Users(id)/Pbx.SetProfile` → 404 Not Found（endpoint 不存在）
- **結論**：ADA 狀態列的 Ready/Not Ready 按鈕目前**只改本地狀態**，不會同步到 3CX
- 想改 3CX 端狀態的使用者，回嵌入的 Web Client 左上角自己改
- 設定頁的「試設 Away / Available」診斷按鈕**保留**，留作未來若有 Admin client 可重用

### 5.2 /xapi/v1/Users 列表 403
- User scope 不能列出所有使用者
- 若需要 User lookup（例如把分機號碼換成 UserId），只能 admin API 或手動記下
- 當前解法：程式碼硬編 UserId = 29（Laurence）用於 debug 按鈕。生產不應如此，改以設定存使用者的內部 Id

### 5.3 XAPI 事件 `attached_data` 為 null
- 事件通知僅帶 entity 路徑，細節要額外 GET
- 我們在收到 upsert 時自動呼叫 `getParticipant` 補足，代價是每通電話多一次 REST round trip
- 對於大量並發（>100 通同時）可能產生負荷；目前規模無虞

### 5.4 Call Control WebSocket 認證靠 Main process 注入
- 瀏覽器 WebSocket API 不能設 Authorization header
- ADA 用 Electron `webRequest.onBeforeSendHeaders` 在 WS upgrade 上注入 `Bearer <token>`
- **重要**：這個 hook 只攔 `wss://` 協定的請求；HTTPS REST 呼叫不受影響（否則會把 fetch 設的 Authorization 覆寫掉，變 401）

---

## 6. 故障排除

### 「連線失敗：Network error: Failed to fetch」
- Main process 沒注入 CORS header，或 dev server 沒重啟
- 重啟 dev server：⌃C 後 `npm run dev`

### 所有 /callcontrol/* 回 401
- Service Principal 的 Call Control API 勾選掉了，或 API Key 過期
- 回 3CX admin 勾回 + **Generate API Key** 重產
- ADA 設定頁貼新 secret + 儲存 + 測試連線

### WebSocket 一直 reconnecting
- Token 過期（60 分鐘）但自動續期失敗
- 設定頁按「測試連線」重新登入 → EventStream 會自動拿到新 token（`destroyEventStream` 會在 testXapi 裡呼叫）

### 事件有進來但 Screen Pop 不觸發
- 設定頁 → Screen Pop → 確認 ☑ 啟用 + URL 模板非空 + `triggerOn` 含當前方向
- DevTools Console 看 `[webclient] firePop` 系列 log

### CDR 紀錄頁空白
- `/xapi/v1/ReportCallLogData` 或其他候選 endpoint 都不存在於此 3CX
- 去 `/xapi/v1/$metadata` 看完整 schema，手動調整 `XapiClient.listCallHistory` 的候選路徑

---

## 7. 架構決策備忘

### 為何放棄「搬 SIP 堆疊到 Main」做 softphone？
- 3CX V20 `/ws/webclient` 是專有協定（非標準 SIP），SIP.js 走不通
- 反推協定成本遠高於 Webview 方案
- 方案：嵌入 3CX Web Client 處理媒體 + XAPI 做座席功能 = Phase 2.B 走到現在的架構

### 為何 CORS 用 Main 注入而非代理？
- 代理方案要把所有 REST 和 WS 都改走 Main IPC，工程量大
- 注入 Access-Control-Allow-* + 強制 OPTIONS 200 是 Electron 標準做法，targeted 只影響 PBX host

### 為何 WS token 走 `webRequest.onBeforeSendHeaders` 而不用 query string？
- 3CX V20 文件明載 Call Control WS 要帶 `Authorization: Bearer` header
- query string `?access_token=...` 曾試過但 3CX 不認
- Main process 的 webRequest hook 是瀏覽器 WebSocket API 能拿到 custom header 的唯一方式

### 為何 REST 不用 query string 傳 token？
- Renderer 的 `fetch()` 能自由設 Authorization header
- 但我們原本的 Main hook 一度把所有 /callcontrol/* 都覆寫 Authorization（包括 REST），導致 401
- 修正後：hook 只攔 `wss://` 協定請求，HTTPS 讓 fetch 自己處理

---

## 8. Phase 4 完成 ✅

剩下的 Task 是 #38 Presence 同步已正式放棄（local-only 設計）。Phase 4 核心全部打通並可靠運作。

後續可進 **Phase 5**：打包 / 自動更新 / 代碼簽章 / CI。
