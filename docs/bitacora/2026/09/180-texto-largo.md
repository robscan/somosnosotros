# 180 · Texto largo a pantalla completa (OL-145, B6) — prototipo y propuesta

**Fecha:** 2026-09-23 · **OL:** OL-145 · **Rama:** `texto-largo` desde `origin/main` (`122673c`) · **Commit:** uno (local; el gestor sube y abre el PR). Solo prototipo y documento: **sin código en `src/`.** Esfuerzo bajo. Sin council, workflows ni subagentes.

## Lo que dijo el founder (literal, renglón L19)

«Al escribir textos largos mejor mostrar el campo de texto más grande a pantalla completa, para evitar que se corte el texto. Es decir cuando se seleccione campo de texto largo entonces se expande el campo o solo se muestra ese campo (probemos)».

## Lo leído antes

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-145 en `docs/ops/OPEN_LOOPS.md` (reservada junto con OL-143 y OL-144 el 2026-09-23), `docs/PRINCIPIOS_UX.md` y `docs/rediseno/15-formularios-canon-flujo-y-estados.md` (decisiones 3, 6, 7 y 8: renglones con el mismo dibujo, "Editar perfil" en pantalla completa, la hoja que sigue al teclado y la salida con algo escrito). El campo de hoy en `src/app/eventos/FormularioEvento.tsx`, `src/app/lugares/FormularioLugar.tsx` y `src/app/artistas/FormularioArtista.tsx`: los tres usan `Campo.tsx` con `multilinea`, que en `Campo.module.css` fija `min-height: 84px` y `resize: none` — el campo no crece, el texto se corta y solo se ve con scroll dentro de la caja. Límites de `src/lib/limites.ts`: evento 1000 caracteres, lugar y artista 600.

## El prototipo

`docs/rediseno/prototipos/texto-largo.html`, dos teléfonos con botones de estado (sin depender de escribir de verdad, para que la captura sea repetible):

- **Variante A** (crece en su sitio): el `<textarea>` ajusta su alto a `scrollHeight` en cada tecla, sin tope, y la pantalla hace scroll para dejar el cursor visible sobre el teclado dibujado.
- **Variante B** (pantalla completa): el renglón "Descripción" (icono, etiqueta, vista previa a tres líneas) abre una capa con cabecera fija (título, contador, "Listo"), el texto ocupa el alto libre y el teclado dibujado queda abajo; "Listo" cierra y el renglón vuelve a mostrar el texto resumido.

El teclado es el mismo patrón que ya existe en `docs/rediseno/prototipos/novedades-perfil-alta.html` (filas de teclas dibujadas, sin funcionalidad real). El contador solo aparece porque el campo de hoy ya lo tiene (`mostrarContador` en `Campo.tsx`).

## Verificación

- Solo prototipo y documentos: sin cambios en `src/`. `npm run lint` y `npm run typecheck` no aplican a un HTML suelto; el archivo no se sirve desde Next. `package.json` y `package-lock.json` intactos: `playwright-core` se instaló con `npm install --no-save` dentro del scratchpad de la sesión (fuera del repo), nunca en la carpeta del proyecto.
- Capturas reales 390×844 (elemento `.telefono`), Chrome real de la Mac vía `playwright-core` (`executablePath` al `Google Chrome.app` instalado), `document.fonts.check('700 20px "Bricolage Grotesque"')` = `true` antes de capturar.
- Sin correos ni datos reales: el texto de ejemplo es inventado (una toca con cooperación voluntaria).

## Capturas reales (`docs/rediseno/capturas-180/`), abiertas y descritas

- `01-variante-a-vacio.png`: campo vacío, sin foco, alto mínimo (84 px), contador en "0 / 1000", placeholder "Qué va a pasar, quién toca, qué trae".
- `02-variante-a-foco.png`: mismo campo con foco y el teclado dibujado ya visible abajo; el campo no cambió de alto porque no hay texto.
- `03-variante-a-creciendo.png`: 125 caracteres escritos; el campo creció a cuatro renglones, el resto del formulario (dos campos simulados y "Publicar evento") bajó pero sigue visible completo sobre el teclado.
- `04-variante-a-limite.png`: 900+ caracteres; el campo creció tanto que el principio del texto ya no cabe arriba del encuadre — hay que subir para verlo, y el resto del formulario (los campos simulados, el botón "Publicar evento") queda fuera de la pantalla capturada, tapado por el propio campo. Es el mismo síntoma que hoy (texto que no se ve completo de un vistazo) con menos pasos para notarlo.
- `05-variante-b-cerrado.png`: el renglón "Descripción" resuelto y vacío, con el mismo dibujo de icono | etiqueta / valor que el resto del canon (línea `renglon-b`).
- `06-variante-b-abriendo.png`: la capa abierta sin texto, cabecera con "Descripción", "0 / 1000" y "Listo", teclado abajo, cursor listo para escribir.
- `07-variante-b-escribiendo.png`: 464 caracteres; el texto completo se ve de corrido, sin cortes, con el contador actualizado en la cabecera; el teclado no tapa nada porque el contador vive arriba, no al pie.
- `08-variante-b-cerrada.png`: capa cerrada, renglón con el texto resumido a tres líneas y puntos suspensivos ("Toca abierta al público… Entrada…"); el resto del formulario (campos simulados, "Publicar evento") vuelve a estar completo.

## Ajuste durante la construcción

La primera versión ponía el contador de la variante B al pie de la capa (`pie-pc`), debajo del `<textarea>` con `flex:1`; al abrir el teclado dibujado (que se dibuja aparte, pegado al fondo del teléfono) el contador quedaba tapado detrás de él. Se movió el contador a la cabecera, junto al título y "Listo", donde no compite nunca con el teclado. Se relee `07-variante-b-escribiendo.png` después del cambio para confirmar que el contador se ve.

## Recomendación

B (pantalla completa): ver `docs/rediseno/39-texto-largo.md` — resuelve el corte de raíz porque el alto del campo deja de depender de cuánto se escribió, y no inventa un patrón nuevo (ya es cómo se edita el perfil y cómo abre "Dónde es" en el canon). A solo disfraza el corte: con el texto cerca del tope el campo crecido no cabe en la pantalla y hay que desplazarse para verlo entero, la captura 04 lo muestra.

## Límites

- El prototipo simula el teclado y los estados con botones; no hay `<textarea>` real recibiendo tecleo de un teclado de iPhone de verdad — falta la prueba del founder en su teléfono (regla del proyecto: ninguna fase/pieza pasa sin esa prueba).
- Ninguno de los tres formularios reales se tocó: esto es solo la comparación para que el founder elija antes de construir.

## Archivos

- `docs/rediseno/prototipos/texto-largo.html`
- `docs/rediseno/39-texto-largo.md`
- `docs/rediseno/capturas-180/01-variante-a-vacio.png` … `08-variante-b-cerrada.png`
- Este documento
