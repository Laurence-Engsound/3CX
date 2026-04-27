#!/bin/bash
# E.SUN Outreach Project (玉山 Phase 6) — 整理 docs/proposals/esun-outreach-project/ 子資料夾結構
# 在 sandbox 內無法執行 mv (Operation not permitted),所以這份腳本必須由 Laurence 在本機 terminal 執行
#
# 使用方式:
#   cd ~/VOXEN/docs/proposals/esun-outreach-project/
#   bash REORGANIZE-FROM-TERMINAL.sh
#
# 結構規劃:
#   01-meeting-pack/   — 會議當天要帶的檔案 (Pitch, OnePager, Demo Script)
#   02-internal-prep/  — 內部準備、不對外 (Q&A Binder, TCO, 設計稿)
#   03-deliverables/   — 給玉山的正式文件 (SOW v0.6 docx + pdf)
#   04-post-meeting/   — 會後 follow-up (Email 模板等)
#   archive/           — 舊版本歷史檔
#   diagrams/          — 維持原架構圖資料夾

set -e
cd "$(dirname "$0")"

echo "================================================"
echo "E.SUN Outreach Project (玉山 Phase 6) — 資料夾整理"
echo "目前位置: $(pwd)"
echo "================================================"
echo ""

# 確認執行
read -p "確定要整理檔案結構嗎? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "已取消。"
    exit 0
fi

echo ""
echo "[1/6] 建立子資料夾..."
mkdir -p 01-meeting-pack
mkdir -p 02-internal-prep
mkdir -p 03-deliverables
mkdir -p 04-post-meeting
mkdir -p archive

echo "[2/6] 移動會議當天用檔案 → 01-meeting-pack/"
[ -f "VOXEN-Pitch-ESUN-v1.0.pptx" ] && mv "VOXEN-Pitch-ESUN-v1.0.pptx" 01-meeting-pack/
[ -f "VOXEN-Pitch-ESUN-v1.0.pdf" ]  && mv "VOXEN-Pitch-ESUN-v1.0.pdf"  01-meeting-pack/
[ -f "VOXEN-OnePager-ESUN-v1.0.pptx" ] && mv "VOXEN-OnePager-ESUN-v1.0.pptx" 01-meeting-pack/
[ -f "VOXEN-OnePager-ESUN-v1.0.pdf" ]  && mv "VOXEN-OnePager-ESUN-v1.0.pdf"  01-meeting-pack/
[ -f "DEMO-SCRIPT.md" ] && mv "DEMO-SCRIPT.md" 01-meeting-pack/

echo "[3/6] 移動內部準備檔案 → 02-internal-prep/"
[ -f "VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.docx" ] && mv "VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.docx" 02-internal-prep/
[ -f "VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.pdf" ]  && mv "VOXEN-QA-Binder-ESUN-INTERNAL-v1.0.pdf"  02-internal-prep/
[ -f "VOXEN-TCO-ESUN-v1.0.xlsx" ] && mv "VOXEN-TCO-ESUN-v1.0.xlsx" 02-internal-prep/
[ -f "VOXEN-TCO-ESUN-v1.0.pdf" ]  && mv "VOXEN-TCO-ESUN-v1.0.pdf"  02-internal-prep/
[ -f "DESIGN-BRIEF-for-illustrator.md" ] && mv "DESIGN-BRIEF-for-illustrator.md" 02-internal-prep/

echo "[4/6] 移動正式交付物 → 03-deliverables/"
[ -f "VOXEN-SOW-Draft-v0.6-ESUN.docx" ] && mv "VOXEN-SOW-Draft-v0.6-ESUN.docx" 03-deliverables/
[ -f "VOXEN-SOW-Draft-v0.6-ESUN.pdf" ]  && mv "VOXEN-SOW-Draft-v0.6-ESUN.pdf"  03-deliverables/

echo "[5/6] 移動會後追蹤模板 → 04-post-meeting/"
[ -f "FOLLOWUP-EMAIL-TEMPLATE.md" ] && mv "FOLLOWUP-EMAIL-TEMPLATE.md" 04-post-meeting/

echo "[6/6] 移動舊版本到 archive/"
for v in v0.1 v0.2 v0.3 v0.4 v0.5; do
    f="VOXEN-SOW-Draft-${v}-ESUN.docx"
    [ -f "$f" ] && mv "$f" archive/
done
[ -f "VOXEN-Pitch-ESUN-prototype-v0.1.pptx" ] && mv "VOXEN-Pitch-ESUN-prototype-v0.1.pptx" archive/

# 清理 LibreOffice 暫存檔
echo ""
echo "[清理] 移除 LibreOffice 暫存檔..."
rm -f lu*.tmp 2>/dev/null

echo ""
echo "================================================"
echo "✅ 整理完成"
echo "================================================"
echo ""
echo "目前結構:"
echo ""
ls -la
echo ""
echo "01-meeting-pack/ 內容:"
ls -la 01-meeting-pack/ 2>/dev/null | tail -n +2
echo ""
echo "02-internal-prep/ 內容:"
ls -la 02-internal-prep/ 2>/dev/null | tail -n +2
echo ""
echo "03-deliverables/ 內容:"
ls -la 03-deliverables/ 2>/dev/null | tail -n +2
echo ""
echo "04-post-meeting/ 內容:"
ls -la 04-post-meeting/ 2>/dev/null | tail -n +2
echo ""
echo "archive/ 內容:"
ls -la archive/ 2>/dev/null | tail -n +2
echo ""
echo "diagrams/ 維持原樣 (架構圖 SVG/PNG)"
echo ""
echo "================================================"
echo "提醒:"
echo "  - 給玉山的寄件目錄 = 01-meeting-pack/ + 03-deliverables/"
echo "  - 內部 binder + TCO 試算表絕對不要寄出 (在 02-internal-prep/)"
echo "  - 此腳本可重複執行,不會破壞已存在的子目錄"
echo "================================================"
