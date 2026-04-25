# ADR-0001: 選用 Electron 作為 VOXEN Agent Desktop 之實作框架

| 欄位 | 內容 |
|:--|:--|
| **ADR 編號** | ADR-0001 |
| **標題** | Use Electron for VOXEN Agent Desktop instead of native Windows/macOS/Linux applications |
| **狀態** | Accepted（已採納 · 實作中） |
| **提案日期** | 2026-04-20 |
| **採納日期** | 2026-04-22 |
| **決策者** | 技術架構組（Laurence · 產品部） |
| **影響範圍** | L6 Engagement Layer — FM-L6-AGENT (Agent Desktop)、FM-L6-SUP (Supervisor Console)、FM-L6-ADMIN (Admin Portal) |
| **關聯模組** | Ch 17.2 Agent Desktop · Ch 17.5 Supervisor Console · Ch 17.13 Admin Portal |
| **相關 ADR** | 無（本專案第一份 ADR） |
| **參考資料** | Electron Security Checklist、Chromium 相依風險評估、3CX Web Client 相容性測試 |

---

## 1. 背景與脈絡（Context）

VOXEN 需要在客戶端提供豐富的桌面體驗，包含：

- Softphone Bar UI（always-on-top · 無邊框 · 可拖移）
- 嵌入式 Web Client（整合 3CX WebRTC 媒體核心）
- Screen Pop（跨應用連動）
- 本機熱鍵（全域 shortcut）
- DPAPI 加密存放 SIP 密碼
- 桌面通知（系統列 + tray icon）
- 自動更新（客戶 IT 可關閉 / 可延後）

候選實作路徑有三條：

1. **純原生（Native）** — 每平台獨立專案：Windows (C# WPF / WinUI 3)、macOS (Swift)、Linux (Qt / GTK)
2. **跨平台原生框架（Flutter / .NET MAUI / Qt）** — 單一語法，各平台 AOT 編譯
3. **Electron**（Chromium + Node.js） — Web 技術打包成桌面應用

本 ADR 紀錄選 **Electron** 的決定依據。

---

## 2. 決策驅動因素（Decision Drivers）

按重要性排序：

| # | 驅動因素 | 對應考量 |
|:--:|:--|:--|
| 1 | **3CX Web Client 嵌入** | 必須能在桌面應用內嵌入 3CX WebClient（WebRTC + WebSocket），這是 MVP 核心 |
| 2 | **開發速度** | Phase 6 銀行 SIT 只有 8 週 · 需快速迭代 · 無時間分平台重寫 |
| 3 | **人才可得性** | 瑛聲內部前端技術棧為 Vue 3 + TypeScript · 原生 Windows 開發人才稀缺 |
| 4 | **主要平台** | Windows 為首要 · Linux 為次（政府）· macOS 為開發者自用 |
| 5 | **記憶體 / CPU 消耗** | 座席 PC 配置中階（i5 / 8GB）· Electron 基礎耗用 150-300 MB 可接受 |
| 6 | **資安可過銀行 InfoSec** | Chromium 每月更新 · 需有 patch 機制 · 需能通過滲透測試 |
| 7 | **自動更新** | 需支援 differential update + 簽章驗證 · 避免客戶 IT 每次手動派版 |
| 8 | **WebRTC 相容性** | 3CX 仰賴 Chromium 的 WebRTC 實作 · 用原生 WebView 會有版本漂移 |

---

## 3. 選項評估（Options Considered）

### 選項 A — 純原生

| 項目 | 評估 |
|:--|:--|
| 執行效能 | ✅ 最佳（基礎耗用 < 50 MB） |
| 開發速度 | ❌ 最慢 · 三倍工時（Win + Mac + Linux） |
| 3CX 整合 | ⚠️ Windows WebView2 / macOS WKWebView / Linux WebKitGTK 的 WebRTC 實作差異大，3CX 不保證 |
| 人才 | ❌ 需同時招 C# / Swift / Qt 工程師 |
| 更新 | ⚠️ Squirrel.Windows、Sparkle (macOS)、自行實作 Linux —— 三套流程 |
| 長期維護 | ❌ 三份程式碼同步維護 · 缺陷修補三倍 |

### 選項 B — 跨平台原生（Flutter / .NET MAUI）

| 項目 | 評估 |
|:--|:--|
| 執行效能 | ✅ 優於 Electron（AOT 編譯） |
| 開發速度 | 🟡 一份程式碼 · 但 .NET MAUI 桌面成熟度不足、Flutter Desktop 生態弱 |
| 3CX 整合 | ❌ 兩者皆需 webview 包裝 · WebRTC 實作仍依賴平台 native webview · **踩雷風險高** |
| 人才 | 🟡 Flutter / Dart 稀缺 · .NET MAUI 有 WPF 底但桌面新 |
| 更新 | 🟡 .NET MAUI 可用 ClickOnce · Flutter 需自建 |
| 長期維護 | 🟡 社群依賴度高 · Google / Microsoft 戰略漂移風險 |

### 選項 C — Electron（選中）

| 項目 | 評估 |
|:--|:--|
| 執行效能 | 🟡 Chromium 基礎耗用 150-300 MB · 可接受但需監控 |
| 開發速度 | ✅ 最快 · Vue 3 + TypeScript 直接跨平台 |
| 3CX 整合 | ✅ **最佳** · Chromium 同源 · WebRTC 實作完全一致 · 不踩雷 |
| 人才 | ✅ 前端工程師即可開發 · 招募容易 |
| 更新 | ✅ electron-updater 內建 · differential + signature 成熟 |
| 長期維護 | ✅ 一份程式碼三平台 · npm 生態豐富 |
| **資安疑慮** | ⚠️ **需謹慎處理**（見下節） |

---

## 4. 決策（Decision）

**選用 Electron 作為 VOXEN Agent Desktop 之實作框架。**

理由本質：在「3CX Web Client 內嵌」這一 MVP 剛需上，Electron 是**風險最低**的選項。其他所有考量（開發速度、人才、維護）都跟著順。

---

## 5. 資安緩解措施（Security Mitigations）

Electron 被 InfoSec 質疑的主要風險點與我們的對應：

| 風險 | 緩解措施 | 對應章節 |
|:--|:--|:--|
| Chromium 本身漏洞 | 每季強制升級 Electron 至最新 stable · 訂閱 CVE 告警 | Ch 22.6 · Ch 28 |
| Node.js API 暴露於 renderer | `contextIsolation: true` · `nodeIntegration: false` · 透過 preload 嚴格控制 API | Ch 18.7 |
| 惡意 navigate | `setWindowOpenHandler` 阻擋 · CSP 嚴格設定 · webview 限制 src | Ch 18.7 |
| Renderer XSS → RCE | CSP strict · disable eval · Vue `v-html` 禁用 | Ch 18.7 |
| 供應鏈攻擊（npm 套件） | SBOM 自動產生 · SCA 工具（Snyk/Trivy） · 生產版 lock deps | Ch 18.8 · Ch 22.1 |
| 自動更新被中間人 | HTTPS only · 簽章驗證（Code Signing） · 避免 HTTP fallback | Ch 22.4 |
| 記憶體洩漏 · 崩潰 | Crash reporter · 日誌遙測 · 每週重啟原則 | Ch 20.6 |

完整列表詳見 Ch 18 C1 Security 之 Electron Hardening Checklist（對應 Electron Security Checklist 官方清單之逐項勾選）。

---

## 6. 影響（Consequences）

### 正面影響
- Phase 6 銀行 SIT 可於 8 週內交付（已驗證可行）
- 單一程式碼支援 Windows / Linux / macOS
- Vue 3 + TypeScript 前後端一致 · 減少心智負擔
- electron-updater 自動更新機制成熟
- 與 3CX Web Client 相容性最佳（同為 Chromium）
- 豐富的 npm 生態（docx / pdf / crypto / IPC ...）
- 人才招募容易（前端工程師多）

### 負面影響
- 基礎記憶體耗用 150-300 MB（對比原生 < 50 MB）
- 安裝包較大（~150 MB vs 原生 ~30 MB）
- 需持續追蹤 Chromium 安全更新
- Electron 版本升級偶有 breaking change
- 需對 InfoSec 反覆說明安全設計

### 需要接受的限制
- 座席 PC 最低規格提升至 i5 / 8GB（Ch 29.2 已納入）
- Electron 版本鎖定 n-2（保留時間 patch 空間）
- 不追求每個平台 UI 看起來「完全原生」（可接受「現代一致」風格）

---

## 7. 驗證指標（Success Metrics）

本決策的成效將於 Phase 6 結束時評估：

| 指標 | 目標 | 量測方式 |
|:--|:--:|:--|
| Phase 6 如期交付 | ✅ On-time | SIT 環境實際部署 |
| 記憶體耗用（座席 idle） | < 400 MB | 客戶 IT 遙測 |
| 記憶體耗用（通話中） | < 600 MB | 客戶 IT 遙測 |
| 啟動時間 | < 5 秒 | 客戶端遙測 |
| 通過銀行 InfoSec 滲透測試 | 無 High / Critical 漏洞 | 第三方 pentest 報告 |
| 座席滿意度（訓練後） | ≥ 4 / 5 | 使用者調查 |

若任一指標不達標，將觸發本 ADR 之**重新評估**。

---

## 8. 未來觸發重新評估的條件（Re-evaluation Triggers）

當下列情況發生時，需重新審視本決策：

1. Electron 連續 3 個 release 出現 Critical CVE，社群修補緩慢
2. 客戶大量抱怨記憶體佔用（> 20% 客戶）
3. Chromium 內建 WebRTC 出現 3CX 相容性退化
4. Tauri / Wails 等更輕量的 Rust-based 框架成熟，且生態足以支持 VOXEN
5. 轉型 Progressive Web App（PWA）模式足以滿足需求

**再次評估的成本假設：** 若需從 Electron 遷移至另一框架，預估需 6-12 個月開發 + 1-2 個月 pilot，同時需維持雙版本過渡期。

---

## 9. 相關討論紀錄（References）

- 2026-04-10 技術會議：初步評估三個選項
- 2026-04-15 3CX Web Client 嵌入 PoC（Electron vs WebView2）：Electron 勝
- 2026-04-18 與銀行 InfoSec 窗口預先討論 Electron 可接受性：可，但需完整 hardening 文件
- 2026-04-20 架構評審會議（ARB）：通過採用 Electron
- 2026-04-22 正式寫入本 ADR

---

## 10. 本 ADR 的作用說明（Meta — 作為 ADR 模板）

本文件同時作為 **VOXEN ADR 格式模板**。未來所有重大架構決策應依此結構撰寫：

- 背景與脈絡（Context）
- 決策驅動因素（Decision Drivers）
- 選項評估（Options Considered · 至少 2 個選項）
- 決策（Decision）
- 資安 / 合規緩解（若有）
- 影響（Consequences · 含正面、負面、限制）
- 驗證指標（Success Metrics）
- 重新評估觸發條件（Re-evaluation Triggers）
- 相關討論紀錄（References）

**ADR 存放位置**：`/docs/adr/ADR-XXXX-{short-title}.md`

**ADR 編號規則**：依提案先後遞增 · 不保留不用之編號 · 即使被否決也佔一個號（狀態為 `Rejected`）。

**ADR 狀態**：`Proposed` → `Accepted` / `Rejected` → `Superseded by ADR-YYYY`（被後續 ADR 取代）→ `Deprecated`（不再適用）

---

_本 ADR 於 v2.0 SRS 發行時為 Accepted 狀態。_
