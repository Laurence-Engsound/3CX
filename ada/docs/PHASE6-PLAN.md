# Phase 6 — 銀行客戶 SIT 版本

> 目標：500 人銀行客服中心，2 個月內可進 SIT，6 個月內 production。

## 1. 為什麼要轉型

Phase 1-5 的 ADA 是「大視窗 + 內嵌 Web Client」。對個人開發者 / 小團隊夠用，
但對銀行客服中心**不適用**：

- 客服螢幕已被 CRM、工單系統、Email 塞滿，沒空間放大視窗
- 自由座席（hot seating）：500 員工輪流坐，分機跟人走、不跟工作站走
- 自家開發的 softphone 取代 + Genesys 取代為 3CX，使用者期望「**酒吧式**」短橫條
- 銀行 IT 自行部署，需要明確的配置檔 spec
- AD 是企業帳號中樞，必須整合

## 2. 新架構速覽

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🟢 Ready ▾ │ 📞 0912 張三 │ ⏱ 01:23 │ ⏸ 🔇 🔀 👥 ↩ │ ⌨ │ ☰         │
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
   │  - 媒體 sink                              │
   │  - 認證 session                          │
   │  - off-screen 或 display:none            │
   └──────────────────────────────────────────┘
```

控制流：
- **使用者按 Bar 上的「保留」** → ADA 呼叫 `POST /callcontrol/{dn}/participants/{id}/hold` → 3CX 處理
- **3CX 推 WebSocket 事件** → ADA 收到後更新 Bar 狀態（無需操作 webview DOM）
- **媒體**仍由 webview 的 WebRTC 通道處理（這是不變的部分）

## 3. 路線圖（兩個月切八週）

### Week 1 — 砍廢 + Bar 骨架
- 移除所有 `engsound.3cx.com.tw` 寫死字串、改完全 settings driven
- 建立 `BarWindow.vue` 元件 + Main process 的 `barWindow.ts`（無框、always-on-top、可拖移）
- 新增 `WindowManager`：控制三種視窗（Bar / 撥號盤 / 設定）的開關與位置
- Tray icon 為主要進入點

### Week 2 — XAPI 控制完整接入
- 接聽 / 掛斷 / 保留 / 恢復 全走 `POST /callcontrol/{dn}/participants/{id}/{action}`
- Mute 走 webview preload IPC（local mic track on/off）
- 撥號盤浮動視窗（從 Bar 點擊浮出，可釘住）
- DTMF 輸入

### Week 3 — 進階通話控制
- 盲轉（指定目標分機 → REFER）
- 諮詢轉（保留現通話 → 撥第三方 → 確認 → 完成轉接）
- 三方會議
- 轉回原通話（諮詢轉失敗 / 取消時）

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

### Week 7 — 內測 + bug 修
- 在乾淨 Windows VM 上實際安裝測試
- 跟銀行 IT 協調 LDAP schema、SIP credentials API spec
- 完成 InfoSec 文件第一版（SBOM、DFD、Threat Model）
- 內部全套情境測試

### Week 8 — SIT 預備
- Code Signing 套用（cert 應該已到位）
- 最終 release 打包
- SIT 環境部署
- 給銀行的安裝手冊 + 使用者手冊（中文）

## 4. 同步進行的非程式工作

- ☐ Code Signing Cert 申請（OV 等，3-7 天 issue）
- ☐ 跟銀行 IT 確認 AD 屬性 / LDAP 連線權限 / SIP credentials API spec
- ☐ 內部報價架構（賣斷 vs 訂閱單價）
- ☐ Terms of Service / Privacy Policy 草稿
- ☐ 隱私衝擊評估（DPIA）—— 處理通話資料

## 5. 風險與緩解

| 風險 | 機率 | 衝擊 | 緩解 |
|------|:---:|:---:|------|
| Code Signing Cert 卡關 | 中 | 高 | 立刻申請，最壞用 self-signed + 銀行 IT 加白名單 |
| LDAP schema 跟銀行對不上 | 中 | 中 | 配置驅動，支援多種屬性名 |
| 3CX 無法滿足某通話控制 API | 低 | 高 | webview 後備（ADA 取消 Bar、回大視窗） |
| 自由座席登入超過 5 秒 | 中 | 中 | LDAP 預先 cache、SIP creds 本機預載 |
| InfoSec 滲透測試發現嚴重漏洞 | 中 | 高 | 文件提早寫、第三方早期 review |
| Genesys/Zoom 提案被銀行偏好 | 低 | 致命 | 強調本地支援 + 整合深度 + 價格 |

## 6. Out of scope（不要做）

- Supervisor 監聽 / 插話 / wallboard → Phase 7+
- 多 PBX / SaaS multi-tenancy → Phase 8+
- AI 摘要 / transcribe → 加值版
- macOS / Linux 安裝包 → 銀行不需要
- 行動 App → 不在 ADA 範圍

## 7. 已決定不做的折衷

- **Presence 同步**留 local-only（XAPI User scope 限制）—— 銀行如需 supervisor 看 agent 狀態，由 3CX 自家管理介面提供
- **CDR 視圖**用 webview 跳到 3CX Web Client 的 `/call_history`（同樣權限限制）
- **macOS 開發版**保留給開發者自用，不官方支援
