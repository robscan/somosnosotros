#!/usr/bin/env bash
# heredar.sh — copia a docs/heredado/ las POCAS definiciones de Flowya que sirven a
# somosnosotros (registro de usuarios, lugares y eventos; mobile first). Cada archivo heredado recibe un
# bloque de procedencia (repo, ruta, commit, modo). Idempotente: re-ejecutar
# sobreescribe SOLO los archivos heredados (docs/heredado/**), jamás los propios.
#
# Modos del manifiesto:
#   ADOPTAR    — vale tal cual; solo cambia el nombre del producto donde aplique.
#   ADAPTAR    — la estructura vale, el contenido se reescribe por OL cuando se invoque.
#   REFERENCIA — no es ley: se lee para no reinventar; el canon nuevo se escribe aparte.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS=/Users/apple-1/flowya-ios
WEB=/Users/apple-1/flowya-app
IOS_SHA=$(git -C "$IOS" rev-parse --short HEAD)
WEB_SHA=$(git -C "$WEB" rev-parse --short HEAD)
OUT="$ROOT/docs/heredado"
mkdir -p "$OUT"

# manifiesto: repo|ruta_origen|destino_relativo_a_docs/heredado|modo|nota
MANIFEST="$ROOT/docs/heredado/MANIFIESTO.tsv"
cat > "$MANIFEST" <<'TSV'
ios	product-definition/FLOWYA_UX_WRITING_SYSTEM.md	ux/UX_WRITING_SYSTEM.md	ADAPTAR	microcopy, errores, estados vacíos, anti-manipulación; la voz se reescribe en español para una comunidad local
ios	product-definition/FLOWYA_ACCESSIBILITY_SYSTEM.md	ux/ACCESSIBILITY_SYSTEM.md	ADOPTAR	mobile real: luz exterior, targets de pulgar, foco, contraste
ios	docs/design-system/handoff-2026-07-15/navegacion.md	ux/referencia-navegacion-flowya.md	REFERENCIA	solo el shell: mapa siempre visible + sheet inferior como home + cards⇄lista; el resto (MEMORIA/VISOR) no aplica
ios	docs/design-system/handoff-2026-07-15/home.md	ux/referencia-home-flowya.md	REFERENCIA	sheet=home con secciones que no se dibujan si están vacías
web	docs/contracts/CANONICAL_BOTTOM_SHEET.md	front/BOTTOM_SHEET.md	ADOPTAR	peek/medium/expanded, gestos y snap del sheet inferior sobre el mapa
web	docs/contracts/KEYBOARD_AND_TEXT_INPUTS.md	front/KEYBOARD_AND_TEXT_INPUTS.md	ADOPTAR	formularios en móvil: el teclado nunca tapa el botón de guardar
web	docs/contracts/MAPBOX_PLACE_ENRICHMENT.md	mapa/MAPBOX_GEOCODING.md	ADOPTAR	geocodificar UNA vez al crear el lugar, nunca al abrir la ficha
web	docs/contracts/ANTI_DUPLICATE_SPOT_RULES.md	datos/ANTI_DUPLICADOS.md	ADAPTAR	mismo nombre normalizado a <150 m = mismo lugar; aplica a lugares y a eventos (mismo lugar + misma hora)
web	docs/patterns/optimistic-mutations.md	front/optimistic-mutations.md	ADOPTAR	la UI responde al instante al guardar, sin carreras
web	docs/definitions/UI/COMPONENT_LIBRARY_POLICY.md	front/COMPONENT_LIBRARY_POLICY.md	ADOPTAR	todo componente reutilizable a librería, con sus estados
TSV

count=0
while IFS=$'\t' read -r repo src dst modo nota; do
  [ -z "$repo" ] && continue
  case "$repo" in ios) base="$IOS"; sha="$IOS_SHA"; label="flowya-ios";; web) base="$WEB"; sha="$WEB_SHA"; label="flowya-app";; esac
  if [ ! -f "$base/$src" ]; then echo "FALTA: $label/$src" >&2; continue; fi
  mkdir -p "$OUT/$(dirname "$dst")"
  {
    echo "> **HEREDADO** de \`$label/$src\` @ \`$sha\` · **Modo: $modo** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: $nota. Los nombres \"Flowya\"/\"FLOWYA\" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver \`docs/ESTRATEGIA_DE_HERENCIA.md\`)."
    echo
    cat "$base/$src"
  } > "$OUT/$dst"
  count=$((count+1))
done < "$MANIFEST"
echo "heredados: $count archivos → $OUT (ios@$IOS_SHA, web@$WEB_SHA)"
