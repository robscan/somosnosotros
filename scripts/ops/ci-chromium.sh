#!/usr/bin/env bash
# Chromium (el «headless shell» de playwright-core) y lo que le falta al sistema, para el trabajo «interfaz» de la CI (OL-449).
#
# Antes (OL-344) cada corrida hacía `playwright-core install --with-deps`: `apt-get update` y descargar, cada vez, las fuentes que la imagen de
# GitHub no trae (fonts-freefont-ttf, fonts-ipafont-gothic, fonts-unifont, fonts-wqy-zenhei, las xfonts…, unos 20 MB). Con un espejo de
# Ubuntu lento (50 kB/s, 22 de octubre) los tres intentos de 4 min se agotaban y la CI caía sin que nada estuviera mal.
# Ahora:
#  1. El navegador se baja del CDN de Playwright solo si no está: la CI guarda `~/.cache/ms-playwright` con la versión de playwright-core
#     en la clave, así que con la caché llena no se descarga nada.
#  2. Lo que falta al sistema lo dice playwright-core mismo (`install-deps --dry-run`, sin tocar nada) y de su lista solo cuenta lo que no
#     está instalado (lo que solo tiene una versión más nueva no hace falta para correr).
#  3. Lo que falta se instala de los .deb guardados en `~/.cache/debs-chromium` (caché de la CI), sin red. Solo si ahí no está (la primera
#     vez, o si la imagen cambió), apt lo descarga con tope y reintento, y los .deb quedan en esa carpeta para la siguiente corrida.
#  4. Al final se comprueba que no falte nada; si falta, el paso falla.
# Solo corre en Linux con apt (la CI); en la Mac no hace falta.
set -euo pipefail

DEBS="${DEBS_CHROMIUM:-$HOME/.cache/debs-chromium}"
mkdir -p "$DEBS"

# Reintenta un comando hasta tres veces, cada intento con su tope (`timeout` corta también a sus hijos, sudo y apt-get).
con_tope() {
  local tope="$1"
  shift
  for intento in 1 2 3; do
    if timeout --kill-after=15s "$tope" "$@"; then return 0; fi
    echo "::warning::«$*» no terminó en el intento $intento; se reintenta."
    # Un apt-get que sobreviva al corte dejaría tomado el candado de apt para el siguiente intento.
    sudo pkill -x apt-get || true
    sleep 5
  done
  return 1
}

# Los paquetes que faltan, uno por renglón; «?» si no se pudo saber (apt sin listas, por ejemplo).
faltan() {
  local salida
  salida="$(npx playwright-core install-deps --dry-run chromium-headless-shell 2>&1 || true)"
  if grep -q "All system dependencies are installed" <<<"$salida"; then return 0; fi
  if ! grep -q "Missing system dependencies" <<<"$salida"; then
    echo "?"
    return 0
  fi
  sed -n 's/^  \([a-z0-9][a-z0-9.+-]*\)$/\1/p' <<<"$salida" | while read -r paquete; do
    [ "$(dpkg-query -W -f='${db:Status-Status}' "$paquete" 2>/dev/null || true)" = installed ] || echo "$paquete"
  done
}

instalado() { [ "$(dpkg-query -W -f='${db:Status-Status}' "$1" 2>/dev/null || true)" = installed ]; }

# 1. El navegador.
con_tope 4m npx playwright-core install --only-shell chromium

# 2. Lo que falta.
pendientes="$(faltan)"
if [ -z "$pendientes" ]; then
  echo "Al sistema no le falta nada para Chromium."
  exit 0
fi
echo "Le falta al sistema: $(tr '\n' ' ' <<<"$pendientes")"

# 3a. De la caché, sin red: solo los .deb de paquetes que no están instalados (nunca se baja de versión lo que ya hay).
if [ "$pendientes" != "?" ]; then
  nuevos=()
  for deb in "$DEBS"/*.deb; do
    [ -e "$deb" ] || continue
    instalado "$(dpkg-deb -f "$deb" Package)" || nuevos+=("$deb")
  done
  if [ "${#nuevos[@]}" -gt 0 ]; then
    echo "Instalando ${#nuevos[@]} paquetes guardados en la caché."
    sudo dpkg -i "${nuevos[@]}" || echo "::warning::dpkg no pudo instalar todo lo guardado; se completa con apt."
  fi
  pendientes="$(faltan)"
fi

# 3b. Con apt, solo si aún falta algo. Los .deb descargados se quedan en la carpeta de la caché.
if [ -n "$pendientes" ]; then
  printf 'Acquire::Retries "3";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' | sudo tee /etc/apt/apt.conf.d/99-tope-ci > /dev/null
  mkdir -p "$DEBS/partial"
  apt_opciones=(-o "Dir::Cache::Archives=$DEBS" -o APT::Keep-Downloaded-Packages=true)
  if [ "$pendientes" = "?" ]; then
    # No se supo qué falta: la lista entera, como antes.
    con_tope 6m npx playwright-core install-deps chromium-headless-shell
  else
    # shellcheck disable=SC2086 # un paquete por palabra
    con_tope 6m bash -c "sudo apt-get update && sudo apt-get install -y --no-install-recommends ${apt_opciones[*]} $(tr '\n' ' ' <<<"$pendientes")"
  fi
  # apt deja la carpeta de root (con su candado de 0640): la caché de GitHub la empaqueta como el usuario de la CI.
  sudo rm -rf "$DEBS/partial" "$DEBS/lock"
  sudo chown -R "$(id -u):$(id -g)" "$DEBS"
  pendientes="$(faltan)"
  # Si ni después de instalar se puede simular, vale la instalación completa que acaba de terminar bien (lo de siempre, OL-344).
  if [ "$pendientes" = "?" ]; then
    echo "::warning::No se pudo comprobar con apt qué falta; vale la instalación completa que acaba de terminar."
    pendientes=""
  fi
fi

# 4. Nada puede faltar.
if [ -n "$pendientes" ]; then
  echo "::error::Siguen faltando: $(tr '\n' ' ' <<<"$pendientes")"
  exit 1
fi
echo "Chromium y sus dependencias listos."
