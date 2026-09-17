#!/usr/bin/env bash
# Tablero de cambios: qué hay sin guardar, en qué ramas, qué PR están abiertos
# y qué falta para que todo llegue a producción. Solo lee; no cambia nada.
# Uso: scripts/ops/estado-cambios.sh
set -uo pipefail
raiz=$(git rev-parse --show-toplevel)
cd "$raiz"
git fetch --all --prune -q 2>/dev/null || echo "(sin red: se usa lo último que se bajó)"

echo "== main frente a origin/main (adelante / atrás)"
git rev-list --left-right --count main...origin/main | awk '{print "  adelante: "$1"  atrás: "$2}'

echo "== Sin commit en la carpeta principal"
s=$(git status --short); [ -n "$s" ] && echo "$s" | sed 's/^/  /' || echo "  nada"

echo "== Árboles de trabajo de otros chats"
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r a; do
  [ "$a" = "$raiz" ] && continue
  rama=$(git -C "$a" branch --show-current)
  sc=$(git -C "$a" status --short | wc -l | tr -d ' ')
  ad=$(git -C "$a" rev-list --count main..HEAD 2>/dev/null || echo '?')
  echo "  $rama: $ad commits sobre main, $sc archivos sin commit"
done

echo "== Ramas con commits que main no tiene"
for b in $(git branch -a --format='%(refname:short)' --no-merged main | grep -v 'origin/HEAD'); do
  n=$(git rev-list --count main.."$b" 2>/dev/null || echo 0)
  [ "$n" -gt 0 ] && echo "  $b: $n"
done

echo "== PR abiertos"
if command -v gh >/dev/null; then
  gh pr list --state open --json number,headRefName,title,mergeable,statusCheckRollup \
    -q '.[] | "  #\(.number) \(.headRefName) · \(.title) · \(.mergeable) · CI: \([.statusCheckRollup[]? | select(.name=="verificar") | .conclusion] | first // "pendiente")"' 2>/dev/null || echo "  (gh sin sesión)"
else
  echo "  (gh no instalado)"
fi

echo "== Migraciones en el repo (las últimas 3; confirma en OPEN_LOOPS cuáles aplicó el founder)"
ls supabase/migrations | tail -3 | sed 's/^/  /'

echo "== Números que siguen"
"$raiz/scripts/ops/siguiente-bitacora.sh" | sed 's/^/  /'
