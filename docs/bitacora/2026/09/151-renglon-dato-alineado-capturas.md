# 151 · Renglón de dato alineado: cierre de evidencia (OL-116)

**Fecha:** 2026-09-22 · **Rama:** `renglon-dato-alineado` · **OL:** OL-116 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

El código de OL-116 (cambio de `align-items:center` a `align-content:center` en cinco módulos CSS, `IconoTablero` → `IconoEscudo` en `Sesion.tsx`) ya estaba correcto desde el commit `385dd01`, pero sin capturas válidas: las de las dos sesiones anteriores mostraban la pantalla «Algo falló» porque el respaldo local no respondía con la forma exacta que cada página pide. El Gestor de cambios II encargó retomar solo para cerrar la evidencia.

## Qué se hizo

1. **`git checkout package.json package-lock.json`** — `playwright-core` no va en el repo; se instaló en el scratchpad de la sesión (`npm i playwright-core` fuera del proyecto).
2. **`git fetch origin && git merge origin/main`** — 242 commits detrás; único conflicto en `docs/ops/OPEN_LOOPS.md` (dos bloques: «Last updated» y «Ahora»), resuelto conservando la versión de main completa y anteponiendo el trozo de OL-116 en una sola línea al frente de cada bloque, sin tocar las entradas existentes. `npm ci`.
3. **Verificación:** `npm run lint` (1 warning preexistente, sin errores), `npm run typecheck` (verde), `npm test` (1001 pruebas, 80 archivos, verde), `npm run build` (verde).
4. **Capturas reales** contra un respaldo local (servidor Node ad-hoc en el scratchpad, sin commitear) que devuelve exactamente los campos que cada página pide: `artistas` (id/slug/nombre/disciplina/detalle/tipo/foto/descripcion/ciudad/redes/creado_por/visible/origen/autor/ubicación), `lugares`, `eventos` (fechas ISO con `Z`, anidados `lugar`/`eventos_artistas`), RPC del panel (`panel_resumen`, `panel_comunidad` con datos; `panel_pendientes` forzada a fallar a propósito para mostrar el renglón de error junto al de la lista), sesión de administrador vía `getClaims()` (con `/auth/v1/.well-known/jwks.json` en 404 para que caiga al respaldo de `/auth/v1/user`).
   - **Primer intento con `.next` contaminado:** tras el merge, `next start` servía chunks `.css`/`.js` de una build anterior mezclados con manifiestos nuevos (500 con `Content-Type: text/plain`); el logotipo se veía como un glifo gigante sin recortar por CSS roto. Causa: un `npm start` viejo seguía escuchando en el puerto 3000 (`EADDRINUSE` silencioso en el intento de reinicio) sirviendo la build vieja aunque `.next` ya se había borrado y reconstruido. Corregido matando los procesos por puerto (`lsof -ti:3000/8990 | xargs kill -9`) antes de reiniciar; confirmado con `curl` que el chunk CSS servía `200 text/css`.
   - `next build && next start`, Chrome real de la Mac vía `playwright-core` desde el scratchpad, viewport 390×844 a `deviceScaleFactor: 2`, `document.fonts.check('16px "Bricolage Grotesque"')` → `true` en las cinco.

### Capturas (`docs/rediseno/capturas-151/`)

- **`01-ajustes.png`:** filas de Ajustes (Editar, Perfil, Por correo, En esta computadora, Entras con…, Cerrar sesión, Invita a tus amigos, Administración) con icono y texto centrados, incluidas las de dos líneas (Perfil, Entras con…). El renglón de Administración usa `IconoTablero` a propósito (nota ya en OPEN_LOOPS: el cambio a escudo es solo en la cabecera de `Sesion.tsx`, no en `ajustes/page.tsx`).
- **`02-admin-lista.png`:** panel de Administración con el renglón de error («No pudimos leer lo pendiente.» + «Intentar de nuevo», de `panel_pendientes` fallando a propósito) junto a los renglones de la lista con datos reales (Personas activas, Coincidencias, Agenda de la semana, Publica la comunidad, y el embudo «Cómo va la comunidad»).
- **`03-ficha-artista.png`:** ficha de «Artista de Prueba» — renglón secundario (pin+ciudad una línea, personas+seguida una línea, calendario+próximo dos líneas con el icono centrado, no arriba).
- **`04-formulario-canon.png`:** alta de lugar — renglones resueltos (DÓNDE de dos líneas, TIPO, MÁS) con icono alineado y el aviso de qué falta bajo cada campo.
- **`05-cabecera-escudo.png`:** cabecera de la agenda con sesión de administrador — escudo visible junto a la campana y el avatar «A», confirmando `IconoEscudo` en `Sesion.tsx`.

Las cinco con `document.fonts.check('16px "Bricolage Grotesque"')` en `true`.

## Qué falta

Nada de código: OL-116 queda cerrada con evidencia real. Commit local en `renglon-dato-alineado`, sin push.
