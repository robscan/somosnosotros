#!/usr/bin/env bash
# Le dice a Vercel si un commit merece despliegue (vercel.json → ignoreCommand).
# Salida 0 = NO desplegar; salida distinta de 0 = desplegar.
# Solo se salta el despliegue cuando TODO lo que cambió son documentos: la carpeta docs/ y los .md de la raíz.
# El plan gratuito de Vercel admite 100 despliegues al día y el 2026-09-21 se agotaron: más de la mitad eran
# anotaciones en docs/ops que no cambian la app (founder, 2026-09-21: «haz que Vercel ignore los cambios que solo
# tocan documento»).
# Se compara contra el último commit que Vercel desplegó en esa rama; si no lo conoce, contra el commit anterior
# (en un merge, el primer padre: abarca todo lo que trajo el PR). Ante cualquier duda o error de git, se despliega.
set -u
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ]; then
  base="HEAD^"
elif ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  # Vercel clona con poca historia: si el último desplegado ya no está a la vista, no se adivina.
  echo "No se encuentra el último commit desplegado ($base): se despliega."
  exit 1
fi
git diff --quiet "$base" HEAD -- . ':(exclude)docs' ':(exclude,glob)*.md'
estado=$?
if [ "$estado" -eq 0 ]; then
  echo "Solo cambiaron documentos desde $base: no se despliega."
  exit 0
fi
echo "Hay cambios fuera de los documentos (o no se pudo comparar): se despliega."
exit 1
