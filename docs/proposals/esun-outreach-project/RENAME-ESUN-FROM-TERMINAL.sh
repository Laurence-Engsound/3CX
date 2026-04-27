#!/bin/bash
# E.SUN Outreach Project — Phase 2 Rename: 檔案 + 資料夾
# ─────────────────────────────────────────────────────────────────
# 用途：將「玉山案」資料夾與檔名從 eSun-Outreach 體系正名為 ESUN 體系
#
# 使用方式：
#   cd ~/VOXEN
#   bash docs/proposals/eSun/RENAME-ESUN-FROM-TERMINAL.sh
#
# 設計原則：
#   1. 自動偵測 — tracked 用 git mv，untracked 用純 mv
#   2. 每一步都 idempotent — 找不到舊檔就 skip
#   3. 結束時印出 git status 讓 Laurence 確認
#
# Phase 1 (文字內容替換) 已由 sandbox 完成
# Phase 2 (此腳本) — 真正動到 filesystem 的 rename
# ─────────────────────────────────────────────────────────────────

set -e
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "❌ 必須在 git repo 內執行 — 請 cd 到 ~/VOXEN 後再跑"
    exit 1
}

REPO_ROOT="$(pwd)"
OLD_DIR="docs/proposals/eSun"
NEW_DIR="docs/proposals/esun-outreach-project"

echo "════════════════════════════════════════════════════════════════"
echo "  E.SUN Outreach Project — Phase 2 Rename (本機執行)"
echo "════════════════════════════════════════════════════════════════"
echo "  Repo:    $REPO_ROOT"
echo "  舊資料夾: $OLD_DIR"
echo "  新資料夾: $NEW_DIR"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 檢查舊資料夾存在
if [ ! -d "$OLD_DIR" ]; then
    echo "⚠️  $OLD_DIR 不存在 — 可能已經 rename 過。檢查 $NEW_DIR..."
    if [ -d "$NEW_DIR" ]; then
        echo "✅ $NEW_DIR 已存在，無事可做。"
        exit 0
    else
        echo "❌ 兩個資料夾都不存在，請確認 working directory 正確。"
        exit 1
    fi
fi

read -p "確定要執行 rename 嗎？(y/N): " final_confirm
if [[ ! "$final_confirm" =~ ^[Yy]$ ]]; then
    echo "已取消。"
    exit 0
fi

echo ""
echo "── Step 1/3：在舊資料夾內 rename 個別檔案 ──"
cd "$OLD_DIR"

# Helper: 自動偵測 tracked / untracked，選對的方式 rename
smart_mv() {
    local src="$1"
    local dst="$2"
    if [ ! -f "$src" ]; then
        echo "  skip      $src (not found)"
        return 0
    fi
    # 判斷是否 git tracked (回到 repo root 用相對路徑問)
    local rel_src="$OLD_DIR/$src"
    if (cd "$REPO_ROOT" && git ls-files --error-unmatch "$rel_src" >/dev/null 2>&1); then
        echo "  git mv    $src"
        echo "        →   $dst"
        git mv "$src" "$dst"
    else
        echo "  mv        $src    (untracked)"
        echo "        →   $dst"
        mv "$src" "$dst"
    fi
}

# ── 01-meeting-pack ──
smart_mv "01-meeting-pack/VOXEN-Pitch-eSun-Outreach-v1.0.pptx"     "01-meeting-pack/VOXEN-Pitch-ESUN-v1.0.pptx"
smart_mv "01-meeting-pack/VOXEN-Pitch-eSun-Outreach-v1.0.pdf"      "01-meeting-pack/VOXEN-Pitch-ESUN-v1.0.pdf"
smart_mv "01-meeting-pack/VOXEN-OnePager-eSun-Outreach-v1.0.pptx"  "01-meeting-pack/VOXEN-OnePager-ESUN-v1.0.pptx"
smart_mv "01-meeting-pack/VOXEN-OnePager-eSun-Outreach-v1.0.pdf"   "01-meeting-pack/VOXEN-OnePager-ESUN-v1.0.pdf"

# ── 02-internal-prep ──
smart_mv "02-internal-prep/VOXEN-QA-Binder-eSun-INTERNAL-v1.0.docx"      "02-internal-prep/VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.docx"
smart_mv "02-internal-prep/VOXEN-QA-Binder-eSun-INTERNAL-v1.0.pdf"       "02-internal-prep/VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.pdf"
smart_mv "02-internal-prep/VOXEN-TCO-eSun-v1.0.xlsx"                     "02-internal-prep/VOXEN-TCO-ESUN-v1.0.xlsx"
smart_mv "02-internal-prep/VOXEN-TCO-eSun-v1.0.pdf"                      "02-internal-prep/VOXEN-TCO-ESUN-v1.0.pdf"
smart_mv "02-internal-prep/VOXEN-DryRun-Playbook-eSun-INTERNAL-v1.0.docx" "02-internal-prep/VOXEN-DryRun-Playbook-ESUN-INTERNAL-v1.0.docx"
smart_mv "02-internal-prep/VOXEN-DryRun-Playbook-eSun-INTERNAL-v1.0.pdf"  "02-internal-prep/VOXEN-DryRun-Playbook-ESUN-INTERNAL-v1.0.pdf"

# ── 03-deliverables ──
smart_mv "03-deliverables/VOXEN-SOW-Draft-v0.6-eSun-Outreach.docx"  "03-deliverables/VOXEN-SOW-Draft-v0.6-ESUN.docx"
smart_mv "03-deliverables/VOXEN-SOW-Draft-v0.6-eSun-Outreach.pdf"   "03-deliverables/VOXEN-SOW-Draft-v0.6-ESUN.pdf"

# ── archive ──
smart_mv "archive/VOXEN-SOW-Draft-v0.1-eSun-Outreach.docx"  "archive/VOXEN-SOW-Draft-v0.1-ESUN.docx"
smart_mv "archive/VOXEN-SOW-Draft-v0.2-eSun-Outreach.docx"  "archive/VOXEN-SOW-Draft-v0.2-ESUN.docx"
smart_mv "archive/VOXEN-SOW-Draft-v0.3-eSun-Outreach.docx"  "archive/VOXEN-SOW-Draft-v0.3-ESUN.docx"
smart_mv "archive/VOXEN-SOW-Draft-v0.4-eSun-Outreach.docx"  "archive/VOXEN-SOW-Draft-v0.4-ESUN.docx"
smart_mv "archive/VOXEN-SOW-Draft-v0.5-eSun-Outreach.docx"  "archive/VOXEN-SOW-Draft-v0.5-ESUN.docx"
smart_mv "archive/VOXEN-Pitch-eSun-Outreach-prototype-v0.1.pptx" "archive/VOXEN-Pitch-ESUN-prototype-v0.1.pptx"

cd "$REPO_ROOT"

echo ""
echo "── Step 2/3：rename 整個資料夾 ──"
# 偵測整個資料夾是否 tracked
if git ls-files --error-unmatch "$OLD_DIR" >/dev/null 2>&1; then
    echo "  git mv    $OLD_DIR"
    echo "        →   $NEW_DIR"
    git mv "$OLD_DIR" "$NEW_DIR"
else
    echo "  mv        $OLD_DIR    (untracked)"
    echo "        →   $NEW_DIR"
    mv "$OLD_DIR" "$NEW_DIR"
fi

echo ""
echo "── Step 3/3：清理 LibreOffice 暫存鎖檔 + .DS_Store ──"
find "$NEW_DIR" -name ".~lock.*" -type f 2>/dev/null | while read lock; do
    echo "  rm    $lock"
    rm -f "$lock"
done
find "$NEW_DIR" -name ".DS_Store" -type f 2>/dev/null | while read ds; do
    echo "  rm    $ds"
    rm -f "$ds"
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Rename 完成"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "── 目前資料夾結構 ──"
ls -la "$NEW_DIR" | head -20
echo ""
echo "── git status (新資料夾) ──"
git status --short "$NEW_DIR" 2>/dev/null | head -40
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  下一步建議"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  整個 $NEW_DIR 都是新加入的 (untracked)。"
echo "  建議分兩個 commit："
echo ""
echo "  Commit 1：把整個玉山案資料夾納入 git 管理"
echo "    git add docs/proposals/esun-outreach-project/"
echo "    git commit -m \"docs(proposals): add E.SUN Outreach Project proposal materials\""
echo ""
echo "  Commit 2：dashboard / log 等之前文字替換過的檔案"
echo "    git add docs/platform-dashboard.html team-status.json PROJECT-LOG.md"
echo "    git commit -m \"chore: rename 玉山案 to E.SUN Outreach Project across dashboard\""
echo ""
echo "  完成後 dashboard 重新整理：http://localhost:8000/docs/platform-dashboard.html"
echo ""
echo "════════════════════════════════════════════════════════════════"
