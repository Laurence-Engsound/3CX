# ADA Roadmap

| Phase | 目標 | 主要任務 | 完成定義 |
|:-----:|------|---------|---------|
| **1** ✅ | 專案骨架 | Electron + Vue 3 + TypeScript 骨架、IPC 安全通道、設定持久化、Screen Pop URL 引擎、打包設定 | `npm run dev` 啟動成功，`npm run package:win/linux` 產出安裝檔，UI 四個頁面可瀏覽 |
| **2** | 基礎 Softphone | 整合 SIP.js、WSS 連線、REGISTER、outbound/inbound 撥打、音訊進出 | 可以從 ADA 撥給另一分機並雙向通話 |
| **3** | 通話控制 | 保留 / 恢復、靜音、盲轉 (REFER)、諮詢轉接、三方會議、DTMF | 所有 MVP 通話功能可由使用者操作完成 |
| **4** | XAPI 整合 | OAuth 2.0 Client Credentials、WebSocket 事件流、Presence 切換、CDR 查詢 | 可從 UI 切換 Ready/Not Ready 並在 3CX 管理介面看到改變；通話紀錄頁顯示真實 CDR |
| **5** | 部署與自動更新 | electron-updater、代碼簽章（Windows）、AppImage 自動更新、CI（GitHub Actions 或本地）、一般錯誤通報 | 具備 `.exe`、`.AppImage`、`.deb` 成品，可在版本號遞增後讓使用者收到更新提示 |

## 跨 Phase 的持續事項

- **測試**：Phase 2 起加入 Vitest 對 core/ 做單元測試；通話狀態機適合 snapshot 測試
- **i18n**：目前 UI 文字硬編碼在 `zh-TW`，Phase 5 前加入 `vue-i18n` 以便未來切換語系
- **無障礙**：鍵盤操作（Enter 送出、Esc 取消、快捷鍵撥打）
- **安全**：每個 Phase 結束前跑一次 `security-review`，檢查 IPC 表面與外部連線範圍
