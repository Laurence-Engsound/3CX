#!/usr/bin/env bash
# ============================================================
# VOXEN Migration — RUN FROM YOUR LOCAL TERMINAL
# (NOT from inside Cowork — Cowork sandbox blocks unlink ops)
#
# Pre-condition: Cowork session that has VOXEN/ mounted should
# be CLOSED before running this (otherwise file locks may interfere).
#
# What this does:
#   1. Cleans the partial copies Cowork left in VOXEN/
#   2. Moves real .git + ada/ from 3CX/ to VOXEN/ (preserves history)
#   3. Restructures docs into 3 clean buckets via git mv
#   4. Verifies + leaves uncommitted for your review
#   5. Leaves 3CX/ ready to be deleted (you do the final rm -rf)
#
# Run with:
#   bash ~/VOXEN/MIGRATE-FROM-TERMINAL.sh
# ============================================================

set -euo pipefail

SRC=~/3CX
DST=~/VOXEN

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  VOXEN Migration  ·  3CX/ → VOXEN/                    ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  Pre-flight checks                                    ║"
echo "╚═══════════════════════════════════════════════════════╝"

[ -d "$SRC" ] || { echo "ERROR: $SRC not found"; exit 1; }
[ -d "$DST" ] || { echo "ERROR: $DST not found"; exit 1; }
[ -d "$SRC/.git" ] || { echo "ERROR: $SRC/.git not found"; exit 1; }
[ -d "$SRC/ada" ] || { echo "ERROR: $SRC/ada not found"; exit 1; }

echo "  ✓ $SRC and $DST both exist"
echo "  ✓ $SRC/.git and $SRC/ada exist"

cd "$SRC"
PRE_LOG=$(git log -1 --oneline)
PRE_M=$(git status --short | grep -c '^.M\|^M.' || true)
PRE_U=$(git status --short | grep -c '^??' || true)
echo "  ✓ Pre-state: HEAD=$PRE_LOG  WIP: M=$PRE_M U=$PRE_U"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 1: Clean Cowork's partial copies in VOXEN/      ║"
echo "╚═══════════════════════════════════════════════════════╝"
# These are leftover copies from a failed mv during Cowork session
# Safe to delete because the originals in 3CX/ are intact
[ -d "$DST/.git" ] && rm -rf "$DST/.git" && echo "  ✓ Removed VOXEN/.git (partial copy)"
[ -d "$DST/ada" ] && rm -rf "$DST/ada" && echo "  ✓ Removed VOXEN/ada (partial copy)"

# Cowork-created skeleton dirs that need to be empty before move-ins
rmdir "$DST/docs/diagrams" 2>/dev/null && echo "  ✓ Removed empty docs/diagrams"
rmdir "$DST/docs/adr" 2>/dev/null && echo "  ✓ Removed empty docs/adr"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 2: Move .git + ada/ wholesale (preserves history)║"
echo "╚═══════════════════════════════════════════════════════╝"
mv "$SRC/.git" "$DST/.git"
echo "  ✓ .git moved"

mv "$SRC/ada" "$DST/ada"
echo "  ✓ ada/ moved (incl. node_modules, src, docs, all)"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 3: Verify git intact in new location            ║"
echo "╚═══════════════════════════════════════════════════════╝"
cd "$DST"
POST_LOG=$(git log -1 --oneline)
POST_M=$(git status --short | grep -c '^.M\|^M.' || true)
POST_U=$(git status --short | grep -c '^??' || true)
[ "$POST_LOG" = "$PRE_LOG" ] || { echo "FAIL: HEAD mismatch"; exit 1; }
echo "  ✓ HEAD intact: $POST_LOG"
echo "  ✓ WIP intact: M=$POST_M U=$POST_U (was M=$PRE_M U=$PRE_U)"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 4: Re-create skeleton dirs                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
mkdir -p docs/diagrams docs/adr integrations/pbx/3cx/reference
echo "  ✓ docs/diagrams docs/adr integrations/pbx/3cx/reference"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 5: VOXEN platform docs → docs/                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
# Mix of tracked and untracked. Use plain mv; git add -A later picks up renames.
for f in \
    VOXEN-SRS-v1.docx \
    VOXEN-SRS-v2.docx \
    VOXEN-Pitch-Deck.pptx \
    VOXEN-EXTENSIBILITY-MANIFESTO.md \
    VOXEN-PHILOSOPHICAL-FOUNDATION.md \
    VOXEN-SRS-v2-TOC.md \
    SRS-OUTLINE.md \
    ARCHITECTURE.md \
; do
    if [ -e "ada/docs/$f" ]; then
        mv "ada/docs/$f" "docs/"
        echo "  ✓ $f"
    fi
done

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 6: diagrams/ + adr/ contents → docs/            ║"
echo "╚═══════════════════════════════════════════════════════╝"
for d in diagrams adr; do
    if [ -d "ada/docs/$d" ]; then
        # Move all visible + hidden contents
        ( cd "ada/docs/$d" && shopt -s dotglob nullglob; for x in *; do mv -- "$x" "../../../docs/$d/"; done )
        rmdir "ada/docs/$d"
        echo "  ✓ ada/docs/$d/* → docs/$d/"
    fi
done

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 7: 3CX vendor docs → integrations/pbx/3cx/ref/  ║"
echo "╚═══════════════════════════════════════════════════════╝"
DST_REF="integrations/pbx/3cx/reference"
for base in \
    "3CX Call Control API Endpoint Specification Guide _ 3CX" \
    "Call Control API Configuration Guide _ 3CX" \
    "Configuration Rest API Endpoint Specifications _ 3CX" \
    "How to Use 3CX Configuration API" \
; do
    if [ -e "ada/docs/${base}.html" ]; then
        mv "ada/docs/${base}.html" "$DST_REF/"
        echo "  ✓ ${base}.html"
    fi
    if [ -d "ada/docs/${base}_files" ]; then
        mv "ada/docs/${base}_files" "$DST_REF/"
        echo "  ✓ ${base}_files/"
    fi
done

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 8: Verify 3CX/ source folder                    ║"
echo "╚═══════════════════════════════════════════════════════╝"
REMAINING=$(ls -A "$SRC" 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" = "0" ]; then
    echo "  ✓ 3CX/ is empty"
    echo ""
    echo "  You can now safely run:    rm -rf $SRC"
else
    echo "  ⚠ 3CX/ still has $REMAINING items:"
    ls -la "$SRC"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 9: Final structure                              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo "--- VOXEN/ top-level ---"
ls -1 "$DST" | head -20
echo ""
echo "--- VOXEN/docs/ (platform docs) ---"
ls "$DST/docs/"
echo ""
echo "--- VOXEN/docs/diagrams/ count ---"
ls "$DST/docs/diagrams/" | wc -l
echo ""
echo "--- VOXEN/ada/docs/ (ADA-specific docs remain here) ---"
ls "$DST/ada/docs/"
echo ""
echo "--- VOXEN/integrations/pbx/3cx/reference/ ---"
ls "$DST/integrations/pbx/3cx/reference/" 2>&1 | head -20

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Step 10: Git status (NOT auto-committed)             ║"
echo "╚═══════════════════════════════════════════════════════╝"
cd "$DST"
git status --short | head -50

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ Migration complete. Repo + history preserved in VOXEN/."
echo ""
echo "  Review:"
echo "    cd $DST && git status && git diff --stat"
echo ""
echo "  When happy, commit:"
echo "    cd $DST && git add -A && git commit -m 'Restructure: 3CX/ → VOXEN/'"
echo ""
echo "  Final cleanup (when verified):"
echo "    rm -rf $SRC"
echo "    rm $DST/MIGRATE-FROM-TERMINAL.sh"
echo "═══════════════════════════════════════════════════════════"
