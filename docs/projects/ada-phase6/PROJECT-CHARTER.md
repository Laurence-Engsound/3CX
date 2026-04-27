# ada Phase 6 — Softphone Bar (玉山 SIT 版本) PROJECT CHARTER

| 欄位 | 內容 |
|:--|:--|
| **專案** | ada Phase 6 — Softphone Bar (玉山 SIT 版本) |
| **Charter 版本** | v1.0 |
| **建立日期** | 2026-04-27 |
| **Owner** | Laurence Lin (Tech Lead) |
| **業務 Sponsor** | Eric Lin (業務總監) |
| **目標完工** | 2026-06-22（8 週）|
| **狀態** | 🟢 Active |

---

## 1. Why（為什麼做）

### 業務驅動
玉山銀行客服中心 450 席外撥座席，現有 Genesys + 自家 ADA 大視窗版本，跟銀行業務環境**不相容**：

- 客服螢幕被 CRM、工單系統、Email 塞滿，**無空間放大視窗**
- 自由座席（hot seating）：500 員工輪流坐，分機跟人走、不跟工作站走 — 現行 ADA 不支援
- 玉山 IT 期望「**酒吧式**」short bar UI，所有控制聚焦在 40px 橫條
- AD 是企業帳號中樞，必須整合企業 SSO

### 技術驅動
ada Phase 1-5 為「獨立 Electron 專案，直連 3CX」。VOXEN 平台 scaffold 在 2026-04-26 完成後（@voxen/core + @voxen/pbx-3cx）, ada 繼續 vendor-coupling 跟 SOW 的「VOXEN platform」承諾矛盾。

Phase 6 是**雙重轉型** — UI 形式（大視窗 → Bar）+ 架構定位（獨立 app → VOXEN L6 reference）同時完成。

### 為什麼**現在**做（不是簽約後）
1. **時程 de-risk** — 簽約後 8 週硬幹太緊，現在開始買 1-2 個月安全墊
2. **Demo 能力順帶** — 任何時間玉山臨時要看，可立即展示
3. **L6 reference 補齊** — VOXEN 平台需要 production-grade L6 consumer 證明 pattern
4. **架構討論 momentum** — 接續 P6 Customer-360 的 contract-driven 思路，趁熱建 L6 端

---

## 2. Scope

### ✅ In Scope（做）

**A. UI 重構**
- Softphone Bar (`BarWindow.vue`)：40px always-on-top 橫條
- 三種視窗（Bar / 撥號盤 / 設定）的 `WindowManager`
- Tray icon + 全域熱鍵
- 來電中央通知視窗
- 撥號盤浮出視窗

**B. 架構重構（VOXEN-aligned）**
- 移除所有 vendor-coupling 程式碼（直接 fetch `engsound.3cx.com.tw`）
- ada 改用 `@voxen/core` 的 PBXAdapter contract 進行通話控制
- ada 接 `@voxen/core` 的 EventBus 接收事件
- 加入 `@voxen/crm-mock`（demo / dev）跟 future Customer Lookup 整合
- 更換 ada 為 monorepo 內部 workspace（先 keep 獨立 electron-vite tooling）

**C. 銀行專屬功能**
- LDAP 自由座席登入（`ldapjs`，Main process）
- DPAPI 加密儲存 SIP 密碼（`node-dpapi`，LocalMachine scope）
- IT 部署工具 `ada-encrypt-creds.exe`
- 配置驅動的 auth method 切換（ldap / api / login / manual）

**D. 通話控制（透過 PBXAdapter）**
- 接聽 / 掛斷 / 保留 / 恢復
- 盲轉 / 諮詢轉 / 三方會議
- DTMF 輸入
- Mute（local mic track on/off）

**E. 整合**
- `tel://` 協定註冊
- CRM Webhook 框架（取代靜態 URL 模板）
- 來電 → CRM 查詢 → Bar 顯示客戶資訊 (Customer-360 串接)
- 通知音效（自訂 ringtone）

### ❌ Out of Scope（明確不做）

- **不做 mobile 版本** — 玉山 IT 沒要求
- **不做 macOS 版本** — 金融座席全 Windows
- **不擴展 `@voxen/core`** — 如需新 contract，走獨立 ADR
- **不重寫 Phase 1-5 既有 demo lab 設定** — 純粹擴充，不溯及既往
- **不替換 3CX Web Client 為自家 SIP stack** — webview 仍是媒體 sink，Phase 7+ 再評估
- **不做 supervisor console** — 那是 FM-L6-SUP，獨立專案
- **不做 admin portal** — 那是 FM-L6-ADMIN，獨立專案

---

## 3. Deliverables（交付物）

### 程式 / 檔案
1. **ada v1.0**（Phase 6 完整版）
   - Windows installer（NSIS）
   - 通過全部 acceptance test
2. **`ada-encrypt-creds.exe`** — IT 部署工具
3. **VOXEN monorepo 整合** — `ada/` 加入 pnpm-workspace.yaml（內部 workspace）

### 文件
4. **`ada/docs/PHASE6-PLAN.md` v2** — Week 1-8 工程路線（v1 superseded）
5. **`ada/docs/PHASE6-TESTING.md`** — Phase 6 測試計畫
6. **`ada/docs/DEPLOYMENT-GUIDE.md`** — 玉山 IT 部署手冊
7. **`docs/adr/ADR-0002-ada-as-voxen-l6-consumer.md`** — 架構決策

### Demo capability（每週 milestone）
8. **Week 2 e2e MVP demo** ⭐ — Ada/CRM + Softphone 跑得起來（接玉山 demo 客戶資料）
9. **Week 4 自由座席 demo** — 不同 Windows 帳號自動載入不同 SIP creds
10. **Week 8 SIT-ready** — 玉山 IT environment-acceptable

---

## 4. Success Criteria（成功標準）

| # | 條件 | 驗證方式 |
|:-:|---|---|
| 1 | Bar UI 通過視覺驗收（玉山 IT review）| Screenshot review + live demo |
| 2 | 所有通話控制 API 透過 `@voxen/core` PBXAdapter | grep `engsound.3cx.com.tw` 應為 0 個結果 |
| 3 | 自由座席登入：3 個 Windows 帳號各自映射不同分機 | `ada/docs/PHASE6-TESTING.md` Test 4.1 |
| 4 | DPAPI 加密 round-trip：encrypt → store → decrypt → 3CX register 成功 | Test 5.2 |
| 5 | Week 2 MVP 可 demo：incoming call → CRM 查詢 → Bar 顯示客戶 | live demo |
| 6 | 50 並發 SoftPhone 壓測：Bar 不卡、CPU 不超過 30% | SIPp + Grafana |
| 7 | E2E flow：玉山 IT 環境 mock 上跑通完整通話流程 | SIT 場景測試 |

---

## 5. Timeline / Milestones

```
Week 1 (T+0 ~ T+7) :  砍廢 + Bar 骨架
                       └─ vendor decoupling, BarWindow.vue, WindowManager, Tray
Week 2 (T+8 ~ T+14):  ⭐ MVP demo runnable
                       └─ XAPI 整合 via @voxen/core PBXAdapter,
                          + @voxen/crm-mock 串 Customer-360
Week 3 (T+15~T+21):   進階通話控制
                       └─ 盲轉 / 諮詢轉 / 三方會議
Week 4 (T+22~T+28):   自由座席登入
                       └─ LDAP + auth method matrix
Week 5 (T+29~T+35):   SIP 密碼安全儲存
                       └─ DPAPI + ada-encrypt-creds.exe
Week 6 (T+36~T+42):   UX 完整化
                       └─ 來電通知 / tray / tel:// / CRM webhook
Week 7 (T+43~T+49):   壓測 + 安全審查
                       └─ 50 並發 SIPp + 安全 review
Week 8 (T+50~T+56):   SIT 包裝
                       └─ Installer / 部署文件 / 玉山 IT review
```

T+0 = Charter sign-off 日（暫定 2026-04-28）  
T+56 = 約 2026-06-22

---

## 6. Owner / Team

| 角色 | 人員 |
|:--|---|
| Tech Lead | Laurence Lin |
| 業務 Sponsor | Eric Lin |
| QA / Test | TBD（簽約後玉山指定） |
| 法務 review | 瑛聲法務 |
| DevOps（Installer）| TBD |

---

## 7. Stakeholders

- **玉山銀行 IT 團隊** — 主要 reviewer，部署環境負責
- **玉山銀行客服中心 PM** — UX feedback 來源
- **3CX APAC** — Premium Partner cert + 技術 escalation
- **瑛聲管理層** — 進度回報

---

## 8. Assumptions（預設條件）

1. VOXEN 平台 (@voxen/core + @voxen/pbx-3cx) **不會 break ada 已用的 contract**
2. 玉山 AD schema 跟 standard LDAP 相容，可用 `ldapjs` 直接查
3. 玉山客服 PC 全 Windows 10/11，支援 DPAPI LocalMachine scope
4. 3CX V20 Update 8 的 Call Control API v2 在 SIT 期穩定不大改
5. 簽約後可拿到玉山 demo 環境的 SIP trunk 資訊（不晚於 T+30）

---

## 9. Risks & Mitigation

| # | Risk | Probability | Impact | Mitigation |
|:-:|---|:-:|:-:|---|
| R1 | LDAP 撞玉山 AD schema 差異 | M | H | Week 4 預留 buffer + 提早跟玉山 IT 對 schema |
| R2 | DPAPI cross-PC migration | L | M | LocalMachine scope（per-PC encrypted）|
| R3 | 3CX Call Control API 在 SIT 期 break | L | H | Pin V20 Update 8 + 訂 3CX changelog |
| R4 | VOXEN PBXAdapter contract 在 Phase 6 期間變動 | L | M | 在 ada package.json lock `@voxen/core` 版本 |
| R5 | 8 週時程吃緊 | M | M | Week 7 buffer 已包含；Week 6 UX 可降級 |
| R6 | 5/8 玉山 ad-hoc 要求 demo | H | L | Week 2 MVP 已包含 demo capability |

---

## 10. References

- [ada/docs/PHASE6-PLAN.md](../../../ada/docs/PHASE6-PLAN.md) — v2 工程路線
- [docs/adr/ADR-0002-ada-as-voxen-l6-consumer.md](../../adr/ADR-0002-ada-as-voxen-l6-consumer.md) — 架構決策
- [docs/adr/ADR-0001-electron-over-native.md](../../adr/ADR-0001-electron-over-native.md) — 為什麼用 Electron
- [docs/proposals/esun-outreach-project/03-deliverables/VOXEN-SOW-Draft-v0.6-ESUN.docx](../../proposals/esun-outreach-project/03-deliverables/VOXEN-SOW-Draft-v0.6-ESUN.docx) — 玉山 SOW
- [docs/proposals/esun-outreach-project/02-internal-prep/POC-ENV-ARCHITECTURE.md](../../proposals/esun-outreach-project/02-internal-prep/POC-ENV-ARCHITECTURE.md) — Demo Lab 環境

---

## 11. Sign-off

| 角色 | 簽核 | 日期 |
|:--|:-:|:-:|
| Tech Lead (Laurence) | ⏳ | 2026-04-28 (暫定) |
| 業務 Sponsor (Eric) | ⏳ | 2026-04-28 (暫定) |

---

**版本歷史**

| Version | Date | Author | Changes |
|:--|:--|:--|:--|
| v1.0 | 2026-04-27 | Laurence | 初版 charter，搭配 ADR-0002 + PHASE6-PLAN v2 |
