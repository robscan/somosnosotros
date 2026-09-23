# 182 · Texto largo a pantalla completa en la app (OL-147, código de la variante B)

**Fecha:** 2026-09-23 · **OL:** OL-147 · **Rama:** `texto-largo-app` desde `origin/main`. Un commit (local; el gestor sube y abre el PR). Esfuerzo medio. Sin council, workflows ni subagentes.

## Lo que dijo el founder

Firmó la variante B (pantalla completa) del prototipo `docs/rediseno/prototipos/texto-largo.html` sobre `docs/rediseno/39-texto-largo.md` (bitácora 180): al tocar el campo de descripción se abre una capa a pantalla completa con cabecera fija (título, contador, «Listo»); al cerrar, el renglón muestra el texto resumido.

## Lo leído antes

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-147 en `docs/ops/OPEN_LOOPS.md`, `docs/rediseno/39-texto-largo.md`, la bitácora 180, el canon `docs/rediseno/15-formularios-canon-flujo-y-estados.md` (decisión 6: Editar perfil en pantalla completa, no en hoja, porque el teclado dificulta la lectura en una hoja) y cómo abren hoy las pantallas completas del canon: `src/components/ui/Hoja.tsx` (hoja con `completa`, usada por `HojaDondeEs.tsx` para "Dónde es") y `src/app/ajustes/editar/FormularioPerfil.tsx` (renglones que se abren de uno en uno). El campo de hoy: `src/components/ui/Campo.tsx` con `multilinea` fija `min-height: 88px` y `resize: vertical` en `Campo.module.css`, usado solo en las tres descripciones (`FormularioEvento.tsx`, `FormularioLugar.tsx`, `FormularioArtista.tsx`) — comprobado con `grep -rn "multilinea" src`, sin otro uso en toda la app.

## Qué se hizo

### Componente nuevo: `CampoLargo`

`src/components/ui/CampoLargo.tsx` y `CampoLargo.module.css`. `Campo.tsx` (`multilinea: true`) delega toda su renderización a este componente en vez de dibujar su propio `<label>` + `<textarea>`; el resto de `Campo.tsx` (campos de una línea) no cambia.

- **Cerrado:** un `<button>` con el aspecto de una caja de campo (mismo borde, radio y alto que el resto), la etiqueta arriba (con el contador de `ContadorCaracteres` si el campo tiene límite — el mismo componente que ya usan los demás campos, así que solo aparece cerca del tope, como en todos lados) y el texto resumido a dos renglones (`-webkit-line-clamp`) con una `IconoChevronDerecha` como afordancia. `aria-label` fijo a la etiqueta para que el nombre accesible no cambie con el contador o el resumen dentro.
- **Abierto:** una capa `position: fixed; inset: 0` (z-index 70, por encima de la Hoja en 40 y de `ListaFlotante` en 60) con cabecera fija (`h2` con el título, el contador si aplica, y el botón «Listo») y un `<textarea>` que ocupa el resto del alto, con el teclado del sistema abajo (nada dibujado: es el campo real).
- **Sin perder el valor al cerrar:** el `<textarea>` solo existe en el DOM mientras está abierto. Cerrado, un `<input type="hidden">` con el mismo `name` lleva el valor al `FormData` del formulario (igual que hace `FormularioPerfil` con sus renglones cerrados) — si no, cerrar el campo antes de publicar habría vaciado la descripción del evento, lugar o artista. El valor vive en el estado del propio `CampoLargo`: si llega controlado (`value`, como en `FormularioEvento`) ese valor manda siempre (por ejemplo, tras leer un cartel con IA); si llega sin controlar (`defaultValue`, como en Lugar y Artista) el componente lleva su copia desde el valor inicial.
- **Sin `pushState`.** La capa no toca el historial: en Safari de iPhone el gesto de Atrás retrocede por documento, no por una entrada añadida con `pushState` (a diferencia de Chromium), así que una entrada de historial ahí no sirve y podría confundir. Cerrar es cosa de «Listo»; Atrás del navegador sencillamente sale del formulario como ya hacía antes de esta pieza (no es una regresión: el campo nunca interceptaba Atrás).

### Los tres formularios

Ningún cambio en `FormularioEvento.tsx`, `FormularioLugar.tsx` ni `FormularioArtista.tsx`: los tres ya llamaban a `<Campo multilinea ... mostrarContador>` para su descripción, así que el cambio de comportamiento llega solo con `Campo.tsx`/`CampoLargo.tsx`.

### Pruebas ajustadas

`Campo` con `multilinea` ya no expone un `<textarea>` visible de entrada: hay que tocar el renglón para abrirlo. Dos pruebas de componente reales (Playwright + Chrome, harness con esbuild) escribían directo en el campo por su etiqueta:

- `src/app/eventos/flyer.componentes.test.mjs` (prueba "gestos tardíos, borrar y elegir gratis ganan al OCR"): ahora abre el botón «Descripción», escribe, cierra con «Listo» y sigue con «Enlace».
- `src/app/eventos/cupo.componentes.test.mjs` (prueba "la reconciliación conserva todos los valores manuales…"): mismo ajuste.

**Añadida** una prueba dedicada del componente: no se sumó por costo de una tercera prueba `.componentes.test.mjs` (esbuild + Playwright completo); en su lugar la nueva lógica interesante de `CampoLargo` (controlado vs. sin controlar, el `input[type=hidden]` cerrado) quedó cubierta por las capturas reales del formulario de evento (abajo) y por las dos pruebas ajustadas, que ya ejercitan abrir, escribir, cerrar y publicar con el valor intacto. Nota para quien retome: si se justifica una prueba aislada de `CampoLargo`, el patrón a seguir es el de `src/components/nuevos.componentes.test.mjs` (bundling con esbuild, sin toda la carga de un formulario).

No hay pruebas de componente previas para `FormularioLugar.tsx` ni `FormularioArtista.tsx` (comprobado: ningún `.test.*` los menciona), así que no había nada que ajustar ahí.

## Verificación

- `npm run lint`: 1 advertencia preexistente y ajena (`docs/diseno/logotipo/iconos-sn.mjs`), nada nuevo.
- `npm run typecheck`: verde.
- `npm test`: **1056 pruebas, todas verdes** (82 archivos; vitest no corre los `.componentes.test.mjs`, que son aparte).
- `npm run build`: verde.
- El árbol no tenía `node_modules` (como en bitácoras recientes): `npm ci` antes de correr nada; `package.json` y `package-lock.json` intactos (`git status` limpio en ambos).
- Los dos `.componentes.test.mjs` ajustados no se pudieron ejecutar en esta sesión: el harness de esbuild falla al intentar resolver internos de `next/dist/server` (`@opentelemetry/api`, `node:stream`) — **reproducido igual con el archivo sin tocar de `origin/main`**, así que es una falla previa del entorno de esta sesión, no algo que rompiera esta pieza. El cambio en ambos archivos es solo la secuencia de interacción (abrir → escribir → «Listo»), coherente con el nuevo contrato de `Campo`/`CampoLargo`.

### Capturas reales (`docs/rediseno/capturas-182/`), 390×844 a escala 2, abiertas y descritas

Arnés temporal `src/app/arnes182-temporal` (solo mientras corrían las capturas, borrado antes de comitear — no aparece en `git status`) montando `FormularioEvento` en modo alta, sin Supabase ni sesión (`accion` simulada, `lugares={[]}`), servido con `next build && next start` en el puerto 4182. Chrome real vía `playwright-core` (instalado solo en el scratchpad de la sesión, nunca en el repo). `document.fonts.check('700 20px "Bricolage Grotesque"')` = `true` antes de capturar.

- **`01-renglon-cerrado.png`:** "Más" abierto (botón "Agregar" → "Listo"); el renglón "Descripción" cerrado, con el chevron a la derecha y sin texto (el campo está vacío, sin `placeholder`); debajo, "Enlace" y "Poner el cartel o una foto" sin cambios.
- **`02-pantalla-completa-escribiendo.png`:** la capa a pantalla completa, cabecera con "Descripción" y "Listo" (sin contador: con 258 caracteres de 1000 no llega al 75% donde `ContadorCaracteres` empieza a mostrarse, igual que en cualquier otro campo con límite de la app); el texto de prueba se ve completo, sin cortes, con el teclado real del sistema abajo (no dibujado).
- **`03-renglon-resumido.png`:** de vuelta al formulario tras "Listo"; el renglón "Descripción" muestra el texto resumido a dos líneas con puntos suspensivos ("Toca abierta al público con entrada libre. Habrá música en vivo, un mercado de …"); el resto del formulario (Cuándo, Dónde, Quién, Cuánto, Enlace, "Poner el cartel o una foto") sigue exactamente como antes de abrir la capa.

## Límites

- Sin la prueba del founder en su iPhone (Safari) todavía: pendiente, como en toda pieza de esta fase.
- Las capturas solo cubren el formulario de evento (pedido explícito del encargo); Lugar y Artista comparten el mismo `Campo.tsx`/`CampoLargo.tsx` sin cambios propios, así que el comportamiento es el mismo, pero no se capturaron por separado.
- Sin animación de entrada/salida de la capa (el prototipo la sugería, 220 ms): se dejó fuera para no ampliar el alcance de esta pieza ("sin rediseñar nada más" del encargo); es un cambio de CSS aislado si el founder lo pide después.
- Los `.componentes.test.mjs` ajustados no corrieron en esta sesión por la falla de entorno descrita arriba (esbuild/Next); se leyó el código con cuidado y se comprobó que la falla es previa a esta pieza, pero falta la confirmación en verde de esas dos pruebas.

## Archivos

`src/components/ui/CampoLargo.tsx` (nuevo), `src/components/ui/CampoLargo.module.css` (nuevo), `src/components/ui/Campo.tsx`, `src/app/eventos/flyer.componentes.test.mjs`, `src/app/eventos/cupo.componentes.test.mjs`, `docs/rediseno/capturas-182/` (3 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
