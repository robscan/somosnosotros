#!/usr/bin/env bash
# Dice qué número de bitácora y qué número de OL siguen, mirando TODAS las ramas
# (locales y remotas), todos los árboles de trabajo y los archivos sin commit.
# Uso: scripts/ops/siguiente-bitacora.sh
set -euo pipefail
raiz=$(git rev-parse --show-toplevel)
cd "$raiz"

refs=$(git for-each-ref --format='%(refname)' refs/heads refs/remotes | grep -v '/HEAD$' || true)
arboles=$(git worktree list --porcelain | awk '/^worktree /{print $2}')

# Bitácoras: nombres de archivo NNN-*.md en docs/bitacora/AAAA/MM/
{
  for ref in $refs; do git ls-tree -r --name-only "$ref" -- docs/bitacora 2>/dev/null || true; done
  for a in $arboles; do ls "$a"/docs/bitacora/*/*/ 2>/dev/null || true; done
} | sed -E 's#.*/##' | grep -oE '^[0-9]{3}-' | tr -d '-' | sort -n | uniq > /tmp/sn-bitacoras.$$

ultima=$(tail -1 /tmp/sn-bitacoras.$$ || echo 000)
printf 'Última bitácora vista: %s → la siguiente es %03d\n' "$ultima" "$((10#$ultima + 1))"

# OL: números OL-NNN en OPEN_LOOPS de todas las ramas y árboles
{
  for ref in $refs; do git show "$ref:docs/ops/OPEN_LOOPS.md" 2>/dev/null || true; done
  for a in $arboles; do cat "$a/docs/ops/OPEN_LOOPS.md" 2>/dev/null || true; done
} | grep -oE 'OL-[0-9]{3}' | sed 's/OL-//' | sort -n | uniq > /tmp/sn-ol.$$

ultimo_ol=$(tail -1 /tmp/sn-ol.$$ || echo 000)
printf 'Último OL visto: OL-%s → el siguiente es OL-%03d\n' "$ultimo_ol" "$((10#$ultimo_ol + 1))"
rm -f /tmp/sn-bitacoras.$$ /tmp/sn-ol.$$
