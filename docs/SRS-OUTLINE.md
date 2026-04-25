# 客服中心應用系統需求規格書（公版）

**Standard Requirements Specification — Call Center Application System**

> 版本：v1.1 大綱 (含競品分析增補 + AI 模組)
> 文件性質：產品公版（可衍生為各客戶 Instance）
> 此檔為大綱草案，定稿後產出 .docx 正式版

---

## 0. 文件資訊

- 0.1 文件目的與用途
- 0.2 適用版本（產品 v1.x）
- 0.3 修訂歷史
- 0.4 撰寫團隊與聯絡窗口
- 0.5 機密等級與閱讀對象
- 0.6 相關文件（系統設計書、API 規格書、部署手冊、UAT 計畫）

---

## 1. 系統介紹

- 1.1 產品定位與願景
  - 1.1.1 目標市場（金融業、客服中心、中小企業）
  - 1.1.2 解決什麼問題
  - 1.1.3 核心價值主張
- 1.2 競爭定位（簡述）
- 1.3 名詞定義與縮寫對照表
- 1.4 法規與標準遵循（個資法、金融控股公司法、ISO 27001、PCI DSS 對照）
- **★ 1.5 競爭分析（NEW）**
  - 1.5.1 Aspect / Alvaria 深度比較
  - 1.5.2 Genesys Cloud CX vs Engage 比較
  - 1.5.3 Zoom Contact Center 比較
  - 1.5.4 EVOX 比較（在地競爭）
  - 1.5.5 我們的差異化矩陣

---

## 2. 系統概觀

- 2.1 系統脈絡圖（System Context）
- 2.2 使用者角色
  - 2.2.1 座席（Agent）
  - 2.2.2 主管（Supervisor — 後續版本）
  - 2.2.3 IT 管理員（IT Admin）
  - 2.2.4 系統服務帳號（Service Principal）
- 2.3 整體架構
  - 2.3.1 元件圖（ADA / PBX / CRM / AD / AI Service）
  - 2.3.2 技術堆疊（Electron + Vue + 3CX webview + XAPI）
  - 2.3.3 資料流概觀
- 2.4 部署模型
  - 2.4.1 內網單一部署（Bank typical）
  - 2.4.2 SaaS 多租戶（SMB typical）
  - 2.4.3 混合（Hybrid Cloud）
- 2.5 操作模式
  - 2.5.1 自由座席（Hot Seating）
  - 2.5.2 固定座席（Fixed Seating）
  - 2.5.3 遠端工作（WFH）

---

## 3. 功能模組 — 核心（Standard Edition）

- 3.1 自由座席登入登出（FM-AUTH）
  - 4 種登入方法：LDAP / API / Agent ID / 完全手動
  - 登出與換班流程
- 3.2 SIP 註冊與通話（FM-SIP）
- 3.3 通話控制（FM-CTRL）
  - 接聽 / 掛斷 / 保留 / 恢復 / 靜音
  - 盲轉 / 諮詢轉 / 轉回 / 三方會議
  - DTMF
- 3.4 Screen Pop（FM-POP）
  - URL 模板模式
  - Webhook 模式
  - tel:// 反向協定（CRM → ADA 撥打）
- 3.5 通話紀錄（FM-CDR）
  - XAPI 拉取（依授權）
  - 嵌入 Web Client 紀錄頁（fallback）
- 3.6 Bar UI 與系統列（FM-UI）
  - Softphone Bar（always-on-top）
  - 撥號盤浮動視窗
  - 設定 / 紀錄 / 關於 大視窗
  - 來電中央通知視窗
  - 全域熱鍵清單
- 3.7 設定管理（FM-CONFIG）
  - 配置檔讀取優先序
  - 集中式部署配置
  - 個人偏好設定
- 3.8 自動更新（FM-UPDATE）
  - 啟動檢查 + 手動檢查
  - 下載與安裝流程
  - 強制 / 可選更新
- 3.9 日誌與診斷（FM-LOG）
  - 本機日誌（rotation）
  - 崩潰回報
  - 遠端遙測（opt-in）
- **★ 3.10 通話後處理 ACW (After-Call Work)（NEW）**
  - 通話結束自動進入 ACW 狀態 + 計時
  - Disposition Code 下拉選單（原因碼）
  - ACW 結束自動回 Ready 或維持 Not Ready
  - 寫回 CRM 通話紀錄

---

## 3A. 功能模組 — AI 加值（Pro / Enterprise Edition）

- 3A.1 AI Service Connector（FM-AI-CONN）
  - 抽象層，支援多供應商
  - 雲端 / 地端 / 混合切換
  - 預設供應商與替代方案
- 3A.2 即時逐字稿（FM-AI-STT）
- 3A.3 通話結束摘要（FM-AI-SUM）
- 3A.4 語音信箱逐字稿（FM-AI-VM）
- 3A.5 情緒偵測（FM-AI-SENT）
- 3A.6 法遵字串偵測（FM-AI-COMP）
- 3A.7 知識庫智能推薦（FM-AI-KB）
- 3A.8 即時話術建議（FM-AI-COACH）
- 3A.9 即時翻譯（FM-AI-XLAT）
- **★ 3A.10 Speech Analytics Backend Connector（NEW）**
  - 通話結束後送語音 + 文字到後台分析
  - 後台批次處理：趨勢、合規違規、座席績效
  - 後台儀表板（屬於 Speech Analytics Add-on 的範圍）

---

## 4. 介面規格

- 4.1 ADA ↔ PBX
  - 4.1.1 3CX V20 XAPI REST 端點清單
  - 4.1.2 Call Control WebSocket 事件規格
  - 4.1.3 媒體（WebRTC via webview）
  - 4.1.4 OAuth 2.0 認證流程
  - **★ 4.1.5 Queue / Skill 取得規格（NEW）** — 取得座席所屬隊列與技能
- 4.2 ADA ↔ CRM
  - 4.2.1 Screen Pop URL 模板規格
  - 4.2.2 Webhook 規格（POST JSON schema）
  - 4.2.3 tel:// 反向協定規格
  - 4.2.4 Click-to-Dial 整合範例
- 4.3 ADA ↔ 目錄服務
  - 4.3.1 LDAP 查詢規格（屬性、過濾器）
  - 4.3.2 Active Directory 整合
  - 4.3.3 Azure AD / Microsoft Graph（後續）
- 4.4 ADA ↔ 認證系統
  - 4.4.1 Windows AD 自動帶入
  - 4.4.2 Kerberos / SSO
  - 4.4.3 客製 Bearer Token
- 4.5 ADA ↔ SIP Credentials 後端
  - 4.5.1 集中式 API 規格
  - 4.5.2 DPAPI 本機檔規格
  - 4.5.3 直接資料庫查詢規格（不建議）
- 4.6 ADA ↔ AI 服務
  - 4.6.1 STT 介面（雲端 / 地端）
  - 4.6.2 LLM 介面（OpenAI compatible）
  - 4.6.3 RAG 知識庫介面
- 4.7 使用者介面規格
  - 4.7.1 Bar UI 線框稿與元素規格
  - 4.7.2 撥號盤
  - 4.7.3 來電通知
  - 4.7.4 設定頁
  - 4.7.5 紀錄頁
  - **★ 4.7.6 ACW 狀態 UI 規格（NEW）**
- 4.8 IPC 介面（Main ↔ Renderer ↔ Webview）

---

## 5. 配置參數

- 5.1 ada-config.json 完整 JSON Schema
- 5.2 環境變數覆寫機制
- 5.3 各參數說明 / 預設值 / 範例
- 5.4 客戶常見配置範本
  - 5.4.1 銀行內網部署
  - 5.4.2 SMB SaaS
  - 5.4.3 政府客戶（地端 AI）

---

## 6. 部署模型

- 6.1 環境前置條件
  - 6.1.1 作業系統需求（Win 10 21H2+ / Win 11）
  - 6.1.2 硬體需求（RAM、CPU、網路）
  - 6.1.3 網路與防火牆 port 清單
  - 6.1.4 3CX 版本相容性矩陣
- 6.2 安裝方式
  - 6.2.1 NSIS Installer（個人 / 雙擊）
  - 6.2.2 MSI 包裝（企業 / SCCM）
  - 6.2.3 靜默安裝（unattended）
- 6.3 大規模部署 SOP
  - 6.3.1 配置檔預先部署
  - 6.3.2 SIP credentials 預先加密
  - 6.3.3 Code Signing 信任鏈
  - 6.3.4 群組原則（GPO）建議
- 6.4 升級路徑
- 6.5 降版與回滾
- 6.6 解除安裝清理

---

## 7. 安全模型

- 7.1 認證流程
  - 7.1.1 對 PBX
  - 7.1.2 對 AD
  - 7.1.3 對 CRM API
  - 7.1.4 對 AI 服務
- 7.2 授權矩陣（誰能做什麼）
- 7.3 機敏資料保護
  - 7.3.1 SIP 密碼（DPAPI / API）
  - 7.3.2 Client Secret（DPAPI / OS Keychain）
  - 7.3.3 通話內容（傳輸加密）
  - 7.3.4 AI 上傳資料（去敏）
- 7.4 傳輸加密
- 7.5 稽核日誌
- 7.6 Electron Hardening 對照表
- 7.7 第三方相依授權清單
- 7.8 已知威脅與緩解（連結 STRIDE Threat Model）

---

## 8. 非功能需求

- 8.1 效能基準
  - 8.1.1 自由座席登入時間 ≤ 5 秒
  - 8.1.2 撥打到響鈴 ≤ 1 秒
  - 8.1.3 通話控制按鈕回應 ≤ 500ms
  - 8.1.4 AI Summary 產出 ≤ 5 秒（雲端）/ ≤ 15 秒（地端）
- 8.2 可用性
  - 8.2.1 SLA 99.9% / 24×7
  - 8.2.2 維護視窗
  - 8.2.3 災難復原
- 8.3 可擴展性
  - 8.3.1 單一部署支援 X 同時使用者
  - 8.3.2 PBX 可擴展性界線
- 8.4 相容性
  - 8.4.1 OS 支援矩陣
  - 8.4.2 3CX 版本支援矩陣
  - 8.4.3 瀏覽器（webview）相容性
- 8.5 可維護性
- 8.6 國際化（i18n）
  - 8.6.1 zh-TW / zh-CN / en-US 預設
  - 8.6.2 客製化擴充

---

## 9. 客製化擴展點

- 9.1 客製等級分類
  - 9.1.1 配置層（免費）
  - 9.1.2 Plugin / Webhook 層（中等）
  - 9.1.3 Source code 層（重度，需報價）
- 9.2 已開放擴展點清單
- 9.3 變更管理流程
- **★ 9.4 Plugin SDK 規格（NEW）**
  - 9.4.1 Plugin 載入機制
  - 9.4.2 可呼叫的 ADA API（事件訂閱、UI 注入點、配置存取）
  - 9.4.3 Plugin 安全沙箱
  - 9.4.4 Plugin 簽章與信任鏈
  - 9.4.5 Plugin 範例（簡單範例 + 進階範例）

---

## 10. 部署檢核清單

- 10.1 客戶 IT 部門需備齊事項
- 10.2 標準部署 SOP
- 10.3 部署後驗收測試
- 10.4 上線前 Go/No-Go 清單

---

## 11. AI 隱私與合規（特別章節，金融客戶必看）

- 11.1 資料分類與處理原則
- 11.2 上傳範圍控制
- 11.3 PII 自動去敏
- 11.4 資料殘留與刪除策略
- 11.5 上傳開關與禁用機制
- 11.6 法規對照（個資法、GDPR、ISO 27001）
- 11.7 AI 模型供應商盡職調查（Microsoft / OpenAI / Anthropic / 自架）

---

## 12. 商品版本與授權

- 12.1 版本對照表
  - 12.1.1 Standard
  - 12.1.2 AI Lite
  - 12.1.3 AI Pro
  - 12.1.4 AI Enterprise
  - 12.1.5 **Supervisor Add-on**
    - Monitor / Whisper / Barge
    - 即時 Wallboard
    - 座席 KPI 儀表板
    - 通話評分（Quality Management）
  - **★ 12.1.6 Outbound Campaign Add-on（NEW）**
    - Predictive Dialer
    - Preview Dialer
    - Progressive Dialer
    - 名單管理 + 排程
    - 適用：催收、行銷、調查
  - **★ 12.1.7 Speech Analytics Add-on（NEW）**
    - 後台批次語音分析
    - 趨勢儀表板（客戶常見問題、座席常見錯誤）
    - 合規違規自動偵測
    - 客製評分模型
- 12.2 授權模型
  - 12.2.1 賣斷（一次性 + 維護年費）
  - 12.2.2 訂閱（月 / 年 per-seat）
- 12.3 升降版流程
- 12.4 試用機制

---

## 13. 驗收條件（Acceptance Criteria）

- 13.1 SIT 通過標準
  - 情境列表（按功能模組分組）
  - 每情境的預期行為與通過判定
- 13.2 UAT 通過標準
- 13.3 Production 上線標準
- 13.4 不予驗收的瑕疵分級

---

## 14. 開發里程碑與時程

- 14.1 Phase 6（Standard 版本）
- 14.2 Phase 7（AI Lite + Supervisor Add-on）
- 14.3 Phase 8（AI Pro / Enterprise + 多租戶）
- **★ 14.4 未來路線（Phase 9+）（NEW）**
  - Omnichannel：Chat / Email / Line / WhatsApp（與 3CX V20 整合）
  - Voice Bot / 智能 IVR（與 3CX IVR + LLM 整合）
  - Mobile Companion App（iOS / Android）
  - WFM 第三方整合
  - Marketplace / Plugin 生態
- 14.5 風險與緩解

---

## 附錄

- A. 詞彙表（Glossary）
- B. 配置檔完整範本（含註解 jsonc）
- C. API 規格詳述（OpenAPI 3.0 / AsyncAPI YAML）
- D. UI 線框稿（Bar、撥號盤、來電通知、設定）
- E. 第三方相依授權與 SBOM（CycloneDX）
- **F. ⭐ 客戶導入問卷（Discovery Questionnaire）** — 業務工具
- G. STRIDE Threat Model
- H. Hardening Checklist
- I. UAT 測試案例範本
- J. 變更歷史

---

## v1.1 變更摘要（vs v1.0）

| 章節 | 變更 |
|------|------|
| 1.5 | NEW — 競爭分析（Aspect / Genesys / Zoom / EVOX） |
| 3.10 | NEW — ACW (After-Call Work) 模組 |
| 3A.10 | NEW — Speech Analytics Backend Connector |
| 4.1.5 | NEW — Queue/Skill 取得介面 |
| 4.7.6 | NEW — ACW 狀態 UI 規格 |
| 9.4 | NEW — Plugin SDK 規格 |
| 12.1.5 | 擴充 — Supervisor Add-on（QM、Wallboard、KPI） |
| 12.1.6 | NEW — Outbound Campaign Add-on |
| 12.1.7 | NEW — Speech Analytics Add-on |
| 14.4 | NEW — Phase 9+ 未來路線（Omnichannel、Voice Bot、Mobile、Marketplace） |

---

## 預估文件規模（更新後）

| 章節 | 預估頁數 |
|------|:---:|
| 0-2（前言、概述、競爭分析） | 8-10 |
| 3 + 3A（功能模組 11+10 個） | 15-18 |
| 4（介面規格） | 14-18 |
| 5（配置） | 5-7 |
| 6（部署） | 5-8 |
| 7（安全） | 5-8 |
| 8-10（NFR、客製、檢核、Plugin SDK） | 8-10 |
| 11-12（AI 合規、版本含 3 個 Add-on） | 6-8 |
| 13-14（驗收、時程含未來路線） | 5-7 |
| 附錄 | 10-15 |
| **總計** | **80-110 頁** |
