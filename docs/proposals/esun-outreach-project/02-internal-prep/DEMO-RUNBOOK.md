# E.SUN Outreach Project (玉山 Phase 6) — 實機 Demo Runbook

> **內部專用**｜給負責 demo 環境操控的瑛聲工程師（不是主講者）
>
> 主講者用 [DEMO-SCRIPT.md](../01-meeting-pack/DEMO-SCRIPT.md)（話術、節奏、觀眾互動）；
> 工程師用本份（環境配置、操作指令、失誤救援）。
>
> 兩份必須同步演練 — 主講者話術走到哪裡，工程師螢幕就要切到哪裡。

---

## 角色定義

| 角色 | 在會議現場的位置 | 任務 |
|---|---|---|
| **主講者** | 投影幕前 | 講 deck、引導 demo、回應 Q&A — 不操控 demo 環境 |
| **Demo 工程師** | 會議室後方筆電 | 操控 demo 環境、依主講者話術切換螢幕、處理失誤 |
| **後援工程師** | 遠端 standby | 隨時準備接手環境問題（網路斷、VM 掛、3CX 服務無回應） |

**重要**：主講者跟 Demo 工程師之間透過 hand signal 或 short Slack message 同步，不要在台上互相喊話。

---

## 會議當天 T-2 小時環境驗證清單

到會議室後、玉山到場前，逐項打勾：

```
□ 1. 主講者筆電已連會議室投影機，解析度設 1920x1080
□ 2. Demo 工程師筆電已上玉山訪客 WiFi（或 4G 熱點 backup）
□ 3. 兩台筆電都能 SSH 到 Demo Lab（VPN 通）
□ 4. 3CX 管理介面登入正常（admin / 密碼貼在桌面便利貼）
□ 5. 4 個座席帳號（agent01-04）皆已 SoftPhone 登入
□ 6. 致行 Voice Bot 服務 health check OK（curl /health 回 200）
□ 7. 主管帳號（supervisor01）權限驗證 OK
□ 8. 模擬客戶資料庫（10 筆）已載入，每筆對應一個外撥電話號碼
□ 9. 內部測試手機（玉山給的客戶號碼模擬器）已開機，響鈴音量調整
□ 10. 螢幕錄影軟體 (OBS) 已開（萬一 demo 有狀況可事後回放）
□ 11. Backup demo 影片（若實機完全失敗）已開在第二個瀏覽器分頁
□ 12. 每個 demo 的「環境 reset 腳本」已測過，能在 60 秒內 reset 完成
```

---

## Demo 1 — 致行外撥 + 平滑轉真人（5 min）

**目標**：展示 Voice Bot 開場 → 客戶有疑問 → 平滑轉接真人座席 → context 帶過去。

### 環境前置

```yaml
3CX:
  - PBX: pbx01.demo.voxen.local
  - Trunk: simulated SIP Trunk (sip-trunk-sim:5060)
  - Recording: enabled, NAS path: /mnt/recording-demo

座席:
  - agent01@demo.voxen.local — Hot-desking 已登入
  - SoftPhone: 3CX SoftPhone v20

致行 Voice Bot:
  - URL: https://chy-bot.demo.voxen.local/api
  - LLM: 玉山 demo 環境模擬，回答銀行業務常見問題
  - ASR: Azure Speech (ja-tw 中文)
  - TTS: 玉山品牌音色

模擬客戶:
  - 號碼: 0912-XXX-001 (對應「王先生」, 信用卡持卡人, 上月有逾期)
  - 路由規則: 撥出後路由到致行 Bot, 觸發轉人條件: 客戶說「我要找真人」「轉接」「客服」
```

### 操作 Step-by-Step

| 時點 | 主講者話術觸發點 | Demo 工程師動作 | 螢幕顯示 |
|---|---|---|---|
| T+0:00 | 「現在我請工程師展示一通典型外撥…」 | 切螢幕到「外撥控制台」 | VOXEN 編排層 dashboard |
| T+0:10 | （沉默） | 點「Trigger Outbound Call to 0912-XXX-001」 | dashboard 顯示通話 ringing |
| T+0:15 | 「客戶接起電話了」 | 內部測試手機響鈴，工程師接起 | 通話進入 active state |
| T+0:20 | 「致行先做開場」 | （無動作，Bot 自動播） | TTS 播放：「您好王先生，這裡是玉山銀行…」 |
| T+0:50 | 「客戶提問：『我要查我的卡費』」 | 在內部測試手機端講「我要查我的卡費」 | Bot 回應 + 把卡費資訊以 SoftPhone screen pop 推給座席 |
| T+1:30 | 「客戶說『我要找真人』」 | 在內部測試手機端講「我要找真人」 | Bot 偵測到 trigger，啟動轉接 |
| T+1:35 | 「平滑轉接真人 — 座席 agent01 接到通話」 | 切螢幕到 agent01 座席畫面 | OPEN 畫面跳出「來電中」+ 客戶資料已預先載入 |
| T+1:40 | 「重點是 context 已經帶過去」 | 指 OPEN 畫面右側「對話摘要」區塊 | 顯示 Bot 跟客戶的前 90 秒對話摘要 |
| T+2:00 | 「座席接起，無縫接續」 | agent01 SoftPhone 點「Accept」 | 通話 routed to agent01 |
| T+2:05 | 「您好王先生，我是玉山的 Amy…」 | （讓 agent01 真人講一兩句） | 通話持續 |
| T+2:30 | 「Demo 結束」 | 工程師 hang up 通話 | dashboard 顯示通話結束 + 錄音生成 |

### 失誤 Fallback

| 情境 | 救援動作 | 替代話術 |
|---|---|---|
| 致行 Bot 無回應 | 工程師 30 秒內 restart bot service：`systemctl restart chy-bot` | 主講者：「我們同步觀察 Bot service health…請工程師 restart」 |
| 內部測試手機沒響 | 切到 SoftPhone web client 模擬接聽 | 「為了演示順暢，我們改用 web client」 |
| LLM 回答離譜 | 工程師立即 kill 通話、切到 Demo 影片 | 「Demo 環境的 LLM model 是預載輕量版，我用一段預錄影片完整呈現」 |
| 整個環境掛掉 | 切第二瀏覽器分頁的 backup demo 影片（已預載） | 「我們先用預錄畫面呈現，會後可現場到 Lab 看實機」 |

### 環境 Reset（demo 完成後）

```bash
ssh demo-lab
./reset-demo-1.sh
# 預期 60 秒內完成：清掉本次通話 CDR、重置 agent01 狀態、清掉 Bot session
```

---

## Demo 2 — 3CX HA Failover（4 min）

**目標**：實機證明主節點掛掉，活通話不掉、新進通話可接。

⚠ **本 demo 是高風險高回報**：成功 → 玉山 IT 印象深刻；失敗 → 砸鍋。**會議前 24 小時必須完整演練 3 次，且 backup 影片必須準備**。

### 環境前置

```yaml
3CX HA Cluster:
  - 主節點 (active): pbx-ha-01.demo.voxen.local (10.0.0.11)
  - 備節點 (standby): pbx-ha-02.demo.voxen.local (10.0.0.12)
  - Witness: witness.demo.voxen.local (10.0.0.13)
  - 健康檢查: heartbeat 每 5 秒
  - Failover threshold: 3 次 heartbeat 失敗

模擬通話:
  - 在 demo 開始時已先撥通: 內部測試手機 ↔ agent02
  - 通話狀態: active, 已維持 30 秒以上
  - 兩端都在等候被告知 failover 開始

監控大螢幕:
  - Grafana dashboard: HA status / Active calls / Trunk status
  - URL: https://grafana.demo.voxen.local/d/3cx-ha
```

### 操作 Step-by-Step

| 時點 | 主講者話術觸發點 | Demo 工程師動作 | 螢幕顯示 |
|---|---|---|---|
| T+0:00 | 「請各位先注意 — 現在有一通活通話正在進行」 | 切到 Grafana dashboard | 顯示「Active calls: 1」、「Primary: HEALTHY」 |
| T+0:10 | （讓內部測試手機與 agent02 真人對話 5-10 秒，讓玉山「聽得到通話真的在跑」） | （等待） | 通話波形圖在動 |
| T+0:30 | 「現在我刻意讓主節點掛掉」 | 在 terminal 執行：`ssh pbx-ha-01 sudo systemctl stop 3cxpbx` | terminal 顯示 service stopped |
| T+0:35 | 「請各位看 Grafana」 | 切回 Grafana | 「Primary: UNHEALTHY」（紅色）、「Standby: PROMOTING」（黃色） |
| T+1:00 | 「30 秒內，備節點會接手」 | （等待 — 不要急） | T+0:65 左右「Standby: HEALTHY」、「Primary: DOWN」 |
| T+1:10 | 「請各位確認 — 那通活通話還在嗎？」 | 把麥克風指向內部測試手機 | 內部測試手機端聲音可能有 3-5 秒抖動，但通話不掉 |
| T+1:20 | （讓 agent02 講「您好還能聽到嗎？」測試） | （讓對話延續 10 秒） | 通話 active 持續 |
| T+2:00 | 「現在請另一支手機撥打玉山客服分機」 | 用第二支內部測試手機撥打 | 第二通電話成功進入 active state, 新節點接手 |
| T+2:30 | 「整個 failover 30-60 秒完成，玉山對外服務不中斷」 | 指 Grafana RTO 標記 | 顯示 actual RTO 數字 (例如 47 秒) |
| T+3:00 | 「現在我們把主節點救回來，看看回切」 | 執行：`ssh pbx-ha-01 sudo systemctl start 3cxpbx` | service starting |
| T+3:30 | 「等 1 分鐘讓集群同步」 | （等待 + 讓對話結束） | 「Primary: HEALTHY」、「Standby: HEALTHY (active in standby)」 |
| T+3:45 | 「Demo 結束」 | hang up 兩通通話 | dashboard 顯示無 active calls |

### 失誤 Fallback

| 情境 | 救援動作 | 替代話術 |
|---|---|---|
| 主節點 stop 後備節點沒接手 | 60 秒內手動 trigger：`ssh pbx-ha-02 sudo /opt/3cx/promote-to-active.sh` | 「我同步請工程師確認集群狀態…」 |
| 活通話真的掉了 | 立即承認：「在這個 demo 環境通話確實掉了，但這是 Lab 環境的網路特性，正式部署用的是專線」 + 切 backup 影片 | 不要硬掰 |
| Failover 超過 90 秒 | 主講者：「我們等等 — 真實環境通常 30-60 秒，Lab 因為共用 vSwitch 比較慢一些」 | 把延遲歸因環境特性 |
| 整個環境掛掉 | 切 backup 影片（已預載） | 「我用 Lab 預錄影片完整呈現，會後可實機參觀」 |

### 環境 Reset

```bash
ssh demo-lab
./reset-demo-2.sh
# 預期 90 秒內完成：兩節點都重啟、HA 集群同步、清 demo 期間的 CDR
```

---

## Demo 3 — 主管即時介入 + 錄音管理（4 min）

**目標**：展示 Whisper（提示）、Barge-in（介入三方）、Take-over（接手）、錄音稽核日誌。

### 環境前置

```yaml
座席:
  - agent03 (新人) — 故意設為「需要監督」狀態
  - supervisor01 (主管) — 有 Whisper / Barge-in / Take-over 權限

通話模擬:
  - 客戶: 內部測試手機（人扮演「客戶有疑問且 agent03 處理不順」）
  - agent03 表現: 故意「卡住」幾秒，給主管介入空間

錄音管理介面:
  - URL: https://recording-mgmt.demo.voxen.local (玉山現有的，但對接 3CX)
  - 已預先載入 5 筆假錄音作為列表 background
```

### 操作 Step-by-Step

| 時點 | 主講者話術觸發點 | Demo 工程師動作 | 螢幕顯示 |
|---|---|---|---|
| T+0:00 | 「先建立一通 inbound 通話」 | 內部測試手機撥入分機 #500 → routing 到 agent03 | agent03 SoftPhone ringing |
| T+0:10 | 「agent03 接起」 | （讓 agent03 真人接起） | 通話 active |
| T+0:20 | 「客戶提一個複雜問題」 | （讓客戶端 actor 講：「我的房貸提前還款，違約金怎麼算？」） | agent03 卡住 5-10 秒（演技） |
| T+0:35 | 「主管 supervisor01 在大螢幕上看到 agent03 卡住，啟動 Whisper」 | 切到 supervisor01 dashboard，supervisor01 點 agent03 通話的「Whisper」按鈕 | 介面顯示「Whisper Active」 |
| T+0:45 | 「supervisor01 私下提示 agent03，客戶聽不到」 | supervisor01 對自己 mic 講：「跟客戶說違約金是剩餘本金的 1%」 | agent03 SoftPhone 聽到 supervisor01 提示 |
| T+1:00 | 「agent03 把答案傳達給客戶」 | （讓 agent03 講出答案） | 通話進行 |
| T+1:30 | 「但客戶還是有疑問，supervisor01 決定 Barge-in 加入三方通話」 | supervisor01 點「Barge-in」按鈕 | 介面顯示「3-way Active」、客戶端聽得到 supervisor01 |
| T+1:45 | 「supervisor01 跟客戶解釋」 | （supervisor01 直接跟客戶端講） | 三方通話持續 |
| T+2:15 | 「最後，supervisor01 接手通話，agent03 退出」 | supervisor01 點「Take-over」按鈕 | agent03 從通話中移除，supervisor01 跟客戶單獨通話 |
| T+2:30 | 「通話結束，現在看錄音管理」 | hang up 通話、切到錄音管理介面 | 列表多出剛才的通話錄音 |
| T+2:45 | 「錄音稽核日誌完整記錄了 Whisper / Barge-in / Take-over 三個事件」 | 點剛才的錄音、展開「事件時間軸」 | 時間軸顯示 4 個事件節點 + 操作者 ID |
| T+3:00 | 「PCI Pause-Resume 也是同樣機制」 | 切到「事件類型」filter，選 PCI | 顯示 5 筆假 PCI 事件範例 |
| T+3:30 | 「Demo 結束」 | （無） | （無） |

### 失誤 Fallback

| 情境 | 救援動作 |
|---|---|
| Whisper 沒生效（agent03 沒聽到提示） | 主講者：「給工程師調整一下…」+ 工程師檢查 supervisor01 mic permission |
| Barge-in 後客戶聽不到 supervisor01 | 工程師檢查通話橋接，必要時 hang up 重做 |
| 錄音管理介面打不開 | 切備用畫面：showing pre-recorded screenshot 連投影 |

### 環境 Reset

```bash
ssh demo-lab
./reset-demo-3.sh
# 清通話、清剛生成的錄音檔（不要污染 5 筆 background 假錄音）
```

---

## Demo 4 — Last-Agent Routing（備援 demo, 2-3 min）

**目標**：展示 VOXEN 編排層的智能路由 — 客戶曾經跟 agent04 通話過，再撥入時優先路由給同一個 agent。

⚠ 此 demo 為**備援用**：主時段三個 demo 已飽滿，這個只在「Q&A 階段有人問智能路由」或「主時段省下時間」時拿出來。

### 環境前置

```yaml
路由規則:
  - VOXEN 編排層 routing rule: "Last-Agent within 30 days"
  - CRM 中模擬客戶 0912-XXX-002 過去 7 天內曾跟 agent04 通話

座席:
  - agent04 — online + available

模擬:
  - 第一次撥入: 客戶 0912-XXX-002 → 預設路由到 agent04 (因為歷史)
  - 對照組: 客戶 0912-XXX-099 (新號碼) → 路由到群組輪詢
```

### 操作 Step-by-Step

| 時點 | 主講者話術 | Demo 工程師動作 | 螢幕顯示 |
|---|---|---|---|
| T+0:00 | 「示範 VOXEN 智能路由 — 客戶曾撥過的 agent 優先接聽」 | 切到 routing dashboard | 顯示 routing rules |
| T+0:15 | 「先撥一個曾通話過的客戶號碼 — 0912-XXX-002」 | trigger inbound from 0912-XXX-002 | 路由決策視覺化：「0912-XXX-002 → 7 天內曾與 agent04 通話 → route to agent04」 |
| T+0:30 | 「agent04 接起」 | agent04 SoftPhone 接 | 通話 active |
| T+0:45 | hang up | 工程師 hang up | （無） |
| T+0:50 | 「對照組：撥一個新號碼」 | trigger inbound from 0912-XXX-099 | 路由決策：「0912-XXX-099 → 無歷史 → route to 群組輪詢 → agent01 (next available)」 |
| T+1:10 | 「同一邏輯也適用 outbound — 之前接過電話的座席優先撥這個客戶」 | （無動作，純口頭） | （無） |
| T+1:30 | 「Demo 結束」 | hang up | （無） |

### 失誤 Fallback

| 情境 | 救援動作 |
|---|---|
| Last-Agent 沒生效，路由給其他人 | 主講者：「Demo 環境 routing rule 可能要刷新…」+ 切到 backup screenshot 顯示「應該的路由邏輯」 |

---

## 跨 Demo 共通注意事項

### 1. 主講者與工程師的同步信號

- **手勢「OK」** = 工程師動作可以開始
- **手勢「等」(手掌張開)** = 暫停動作，主講者要先講
- **Slack 私訊「next」** = 工程師應切到下一個畫面
- **Slack 私訊「help」** = 主講者遇到狀況，工程師立即看 demo 環境是否有問題

### 2. 玉山 IT 可能會「插入」demo

如果玉山 IT 突然問「能不能 demo 一下 [某個我們沒準備的場景]」：

- **絕對不要當場 improvise** — 環境沒測過，會出大事
- **承諾後續展示**：「這個場景需要稍微調整 demo 環境，我們會在 [具體時間] 安排專場 demo」
- **記錄問題**：Demo 工程師記下，會後 24 小時內排專案 follow up

### 3. 玉山 IT 要求「他們親自試試看」

- **如果是 SoftPhone 操作** — 可允許，把 SoftPhone 桌面控制權短暫交出（玉山 IT 在自己筆電上連 demo 環境）
- **如果是 PBX 管理介面** — 不允許動，他們可以「看 admin 操作」但不要交鍵盤
- **如果要看 source code** — 完全不開放（VOXEN 是商業產品，3CX source 在 escrow）

### 4. 會後 demo lab 開放參觀

- 會議結束後可主動邀請：「歡迎玉山 IT 任何時候到瑛聲 office 來 demo lab 實際操作 — 我們可以安排半天 hands-on」
- 把這個邀請寫進 follow-up email

---

## 文件版本與維護

| 版本 | 日期 | 變更 | 維護人 |
|------|------|------|--------|
| v1.0 | 2026-04-25 | 初版，4 個 demo 完整 runbook | Engagement Manager |

**下次更新觸發點**：
- 第一次正式 demo 後（會根據實戰經驗修正 fallback 路徑）
- 玉山約定具體 demo 日期前，需向 Demo 工程師重新確認環境狀態
- 新增第 5 個 demo 場景時（例如玉山要求看「DR 跨站房演練」）

---

**緊急聯絡**：
- Demo Lab 管理員：[姓名] / [手機] / [Slack DM]
- Lab 24x7 oncall：[ext]
- 後援工程師（會議當天）：[姓名] / [手機]
