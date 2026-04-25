# Phase 5 — 部署與自動更新

## 1. 總覽

| 產出 | 用途 | 檔名範本 |
|------|------|----------|
| Windows NSIS installer | 主要目標 | `dist/ADA-Setup-<version>-x64.exe` |
| Linux AppImage | 免安裝免解包，跨發行版 | `dist/ada-<version>-x64.AppImage` |
| Linux .deb | Debian/Ubuntu apt | `dist/ada-<version>-amd64.deb` |
| macOS DMG (選用) | 開發者自用 | `dist/ADA-<version>-arm64.dmg` |

---

## 2. 首次打包（本機）

```bash
cd ~/3CX/ada
npm install                  # 拉 electron-updater、electron-builder 等新相依
npm run build                # type-check + vite build
npm run package:linux        # 產 Linux AppImage + deb
npm run package:win          # 產 Windows NSIS installer
# npm run package:mac        # 產 macOS DMG（選用）
# npm run package:all        # 一次 win + linux
```

產物都會在 `dist/` 底下。

### macOS 建 Windows installer 的注意事項

- **符號連結問題**：Windows installer 在 macOS 上用 electron-builder 能建，但 NSIS 工具鏈會下載 Wine。第一次打包會慢（下載 ~100MB）。
- **代碼簽章**：沒 `.pfx` 也會建，但使用者安裝時 SmartScreen 會警告。正式發行請辦一張 Code Signing Cert。

### Linux 建置注意事項

- **libsecret**：打包 deb 不需要，但目標機器要裝 `libsecret-1-0`（已加入 `deb.depends`）
- **圖示**：用的是 `resources/icon.png`（本來是由 `icon.svg` 產生；如果要改設計，編輯 svg 再重跑 `convert` 命令）

---

## 3. 自動更新設定

`electron-updater` 已整合在 ADA 裡（`src/main/updater.ts`）。要啟用線上自動更新，需要：

### 3.1 選一個發佈管道

- **Generic HTTP 伺服器**（最簡單，自己架 nginx / S3 + CloudFront / Azure Blob）
- **GitHub Releases**（公開儲存庫免費，私人需要 GitHub PAT）
- **自家 3CX 主機**（可以把更新檔放在 `engsound.3cx.com.tw/ada/updates/`，若 3CX 管理員允許）

### 3.2 設定 `electron-builder.yml` publish 區塊

編輯 `electron-builder.yml` 取消註解最底下：

```yaml
publish:
  - provider: generic
    url: https://downloads.engsound.com.tw/ada/updates/
    channel: latest
```

然後打包會自動產生 `latest.yml` / `latest-linux.yml` / `latest-mac.yml` 並放到 `dist/`。

### 3.3 把 `dist/` 上傳到發佈網址

```bash
# 範例：上傳到 S3
aws s3 sync dist/ s3://downloads.engsound.com.tw/ada/updates/ \
  --acl public-read \
  --exclude "*" \
  --include "*.exe" \
  --include "*.AppImage" \
  --include "*.deb" \
  --include "latest*.yml"
```

應用啟動 30 秒後會自動 `checkForUpdates()`，使用者也可在設定頁手動點「檢查更新」。有新版時右下角徽章變綠，點「下載」→ 下載完成後點「安裝並重啟」。

### 3.4 版本號規則

編輯 `package.json` 的 `"version"`：語意化版號（0.1.0 → 0.2.0 → 1.0.0）。

```bash
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.x → 0.2.0
npm version major   # 0.x.x → 1.0.0
```

更新版本後重新打包 + 上傳，客戶端會在下次檢查時看到新版。

---

## 4. 代碼簽章（選用但強烈建議）

### 4.1 Windows

買一張 Code Signing Certificate（Sectigo / DigiCert / SSL.com）→ 取得 `.pfx` 檔案。

打包時設環境變數：

```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD="your-pfx-password"
npm run package:win
```

沒簽章 → 使用者裝的時候 Windows SmartScreen 紅色警告「不安全」。
簽章後 → 漸漸建立信譽，最終變安全。

### 4.2 macOS（若有需要）

需要 Apple Developer ID ($99/year)：
```bash
export CSC_LINK=/path/to/mac-developer-id.p12
export CSC_KEY_PASSWORD="..."
export APPLE_ID=your-apple-id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 從 appleid.apple.com 產
npm run package:mac
```

未簽 macOS DMG 使用者第一次打開要**右鍵 → 開啟**繞過 Gatekeeper。

### 4.3 Linux

通常不需要，Linux 沒有中心化的信任鏈。但可以用 GPG 簽 AppImage，進階需求再處理。

---

## 5. CI 範例（GitHub Actions）

`.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Build
        run: npm run build
      - name: Package (Windows)
        if: matrix.os == 'windows-latest'
        env:
          CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
        run: npm run package:win
      - name: Package (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: npm run package:linux
      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.os }}
          path: dist/
```

進階：加 `softprops/action-gh-release` 自動上架到 GitHub Releases。

---

## 6. 給使用者的安裝說明

把下面這段放在 `README-USERS.md` 或部署網頁：

### Windows
1. 下載 `ADA-Setup-X.X.X-x64.exe`
2. 雙擊，SmartScreen 可能警告 → 點「更多資訊」→「仍要執行」（僅第一次）
3. 選安裝位置 → 建立桌面捷徑 → 完成
4. 第一次啟動時會詢問 PBX FQDN，填 `engsound.3cx.com.tw`

### Linux (Ubuntu/Debian)
```bash
sudo apt install ./ada_X.X.X_amd64.deb
ada  # 從終端機啟動，或從 Applications 找
```

### Linux (其他發行版)
```bash
chmod +x ada-X.X.X-x64.AppImage
./ada-X.X.X-x64.AppImage
```

---

## 7. 疑難排解

### 打包 Linux 時錯誤 "snapcraft is not installed"
- electron-builder 預設會試著打 snap，但我們沒要。已在 `electron-builder.yml` 設 `target: [AppImage, deb]` 就不會碰 snap。
- 如果還是錯，確認 `npm` 有裝到最新 electron-builder。

### Windows 包出來太大（>300MB）
- Electron 本身 ~150MB + Chromium
- 是正常的。要縮可以移除 ICU locale data（`electron-builder.yml` 加 `electronLanguages: [en-US, zh-TW]`）

### macOS 雙擊 DMG 出現 "已損毀"
- 這是 Gatekeeper 擋未簽署應用
- 解法：`xattr -cr /Applications/ADA.app`（清掉 quarantine 屬性）
- 或右鍵 → 開啟 → 開啟

### 自動更新檢查總是 "error: 404"
- `latest.yml` / `latest-linux.yml` 沒上傳到 publish URL
- 或 `electron-builder.yml` 的 `publish` 設定跟實際 URL 不符
- 或 HTTPS 憑證問題（伺服器端）
- 手動打開瀏覽器檢查 URL 是否能直接下載 `latest.yml`

### 自動更新「disabled」狀態
- `app.isPackaged` 為 false（dev 模式）—— 這是預期行為，只有打包後才會真的檢查
- 要測試更新，先 `npm run package:linux` 裝上後測

---

## 8. Phase 5 驗收清單

- [ ] `npm run package:linux` 產出 `.AppImage` 和 `.deb`
- [ ] `npm run package:win` 產出 `.exe`（在 macOS 或 Windows 都能跑）
- [ ] 安裝產物後雙擊能啟動
- [ ] 設定頁「關於 ADA」顯示正確版本號
- [ ] 自動更新區塊按「檢查更新」能看到狀態變化（dev 裡會是 disabled）
- [ ] （選用）publish URL 設好後，舊版安裝後能偵測到新版 + 下載 + 安裝

完成 → Phase 5 收工 → ADA 可交付使用者。
