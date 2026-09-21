# 145 · Alta de lugar y de artista al canon

**Fecha:** 2026-09-21 · **Rama:** `alta-lugar-artista-canon`, desde `origin/main` con el PR #133 (`99114bc`) · **OL:** OL-110 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Encargada por el founder («si, abre») tras el recorrido de OL-109 (bitácora 144, doc [33-friccion-formularios.md](../../../rediseno/33-friccion-formularios.md)): dos fricciones de las tres pantallas del canon (F1 y F2).

Arranqué avisando al chat de gestión de cambios («Gestor de cambios II») y esperé su visto bueno antes de tocar nada. Confirmó números (OL-110/bitácora 145), rama (`alta-lugar-artista-canon` desde `origin/main` con el PR #133 ya dentro) y el método de capturas (respaldo local de OL-109, copiado a mi scratchpad y adaptado).

## Qué pedía el encargo

1. **F2 — sugerencias y "Ya está registrado" flotan.** En el alta de lugar, la lista de sugerencias y el aviso "Ya está registrado" empujaban Dónde, Tipo, Más y el botón hacia abajo (`FormularioLugar.module.css:.flotante` no tenía `position` real). Usar `ui/ListaFlotante` (PR #133) tal cual, sin copiarla. Revisar lo mismo en el aviso de nombre repetido de `FormularioArtista`.
2. **F1 / B7 — la ayuda de qué falta sale del botón.** En `FormularioLugar`, `FormularioArtista` y `FormularioPerfil` el patrón viejo (`canon.faltaBoton`, un `<small>` dentro de `<Boton>`) seguía sin aplicar el canon ampliado que el founder firmó al aceptar OL-100 (2026-09-21): *"Si en el campo, es ayuda para recuperarse del error en el contexto, aplica como canon para todos los formularios."* El alta de evento ya lo hacía así; faltaba llevarlo a estos tres.
3. **Maquetación:** rejillas con `minmax(0, 1fr)`, `min-width: 0`, sin envoltorios de más, y ninguna clase del canon con `grid-area` fuera de su rejilla.

## Código

### F2 — `ui/ListaFlotante` en lugar y artista

**`FormularioLugar.tsx`:** la lista de sugerencias de Mapbox y el aviso "Ya está registrado" (antes dos bloques normales del documento) se unieron en una sola `<ListaFlotante>` anclada al campo del nombre — mismo patrón que `HojaDondeEs.tsx` (el estado "Buscando…", el aviso y las opciones viven dentro de la misma lista flotante, como sus propios `<li>`). `sugerenciasAbiertas` combina `buscando || recuperando || sugeridos.length>0 || existentes.length>0`, con un `sugerenciasCerradas` que se resetea al volver a escribir el nombre (para que tocar fuera o Escape —que ya trae `ListaFlotante`— la cierre hasta la próxima letra). El campo del nombre lleva ahora `role="combobox"` con `aria-expanded`/`aria-controls`/`aria-autocomplete`. `FormularioLugar.module.css` perdió la clase `.flotante` (nunca flotaba de verdad pese al nombre) y ganó `.avisoFlotante` (mismo texto que `HojaDondeEs.module.css`, para "Buscando…"/"Trayendo la ubicación…" dentro de la lista).

**`FormularioArtista.tsx`:** el aviso "Ya está registrado" (sin lista de sugerencias en esta pantalla, solo el aviso de nombre repetido) se envolvió igual en `<ListaFlotante>`, anclada al campo del nombre, con su propio `avisoRepetidoCerrado`/`alEscribirNombre` para reabrir al escribir de nuevo.

**Medido, no solo mirado** (`getBoundingClientRect`, caso `medir-no-empuja.mjs` del scratchpad): con el nombre ya escrito (sin "Falta el nombre" de por medio), comparé los rects de Tipo, Más y el botón **antes** de que apareciera el aviso (nombre sin coincidencia) y **después** (nombre igual a un lugar ya registrado) — `top`/`left` idénticos en los tres (`{"iguales": true}`). El aviso se pinta encima (portal, `position: fixed`, z-index 60), nunca desplaza nada debajo.

### F1 / B7 — la ayuda bajo el campo o el renglón

Mismo patrón que `FormularioEvento.tsx` (`canon.cuerpoNota`, sin `role="alert"` cuando no es un error de servidor):

- **`FormularioLugar.tsx`:** "Falta el nombre." bajo el campo del nombre (cuando no hay error de servidor); "Falta dónde está." bajo el renglón Dónde (cuando no hay error ni aviso de ubicación). El botón "Publicar lugar" ya no lleva `<small>` con `canon.faltaBoton`.
- **`FormularioArtista.tsx`:** "Falta el nombre." bajo el campo del nombre; el aviso "Ya está registrado" (ya flotante, ver F2) sigue siendo la ayuda de ese caso. Botón "Publicar artista" sin `<small>`.
- **`FormularioPerfil.tsx`:** el helper `renglon()` ganó un quinto parámetro opcional `notaFalta`, mostrado bajo el renglón cerrado cuando no hay error de servidor; usado en Nombre ("Falta el nombre."). Botón "Guardar" sin `<small>`.
- **`FormularioCanon.module.css`:** se quitó `.faltaBoton` (sin usos en todo el árbol tras el cambio, confirmado con grep) y se actualizó el comentario de cabecera del canon (punto 5) para describir el patrón nuevo.

### Maquetación

No hizo falta ninguna rejilla nueva: `canon.cuerpoNota` (con `grid-area: cuerpo`) se reutiliza en dos contextos ya existentes en el propio canon —dentro de `.resuelto` (que sí define esa área, como ya hacía `FormularioEvento`) y, para el campo del nombre en lugar/artista, como hermano de un `<label>` sin ningún `display: grid` alrededor (mismo patrón que el campo del nombre de `FormularioEvento.tsx`, donde `grid-area` no tiene efecto por no estar dentro de una rejilla — solo aporta el tipo de letra/color). Ninguna clase del canon se usó con `grid-area` dentro de una rejilla que no define esa área. `ListaFlotante` ya trae su propia maquetación (`ListaFlotante.module.css`), no se tocó.

## Verificación

```
npm run lint && npm run typecheck && npm test
```

- **Lint:** verde (1 warning preexistente y ajeno en `docs/diseno/logotipo/iconos-sn.mjs`, no tocado).
- **Typecheck:** verde.
- **Test:** 789/789 en verde. Este árbol de trabajo no traía el paquete `pg` instalado (mismo hallazgo que OL-100/bitácora 135 y OL-104/bitácora 139): `npm install pg --no-save` (nada versionado) deja la suite completa en verde, no son fallos de esta pieza.
- **Build:** `npm run build` verde, 42 rutas.

## Evidencia visual: respaldo local y capturas PNG reales

**Cómo se vio la app:** copié (sin editarlos en su sitio) el respaldo local Node puro y los scripts de captura por CDP que dejó el operador de OL-109 en su scratchpad (bitácora 144) — `backend.mjs` (imita `/auth/v1/token`, `/auth/v1/user` y las RPC/tablas de solo lectura que necesitan estos tres formularios, con una sesión de administrador inventada y datos al tope de longitud, entre ellos un lugar y un artista con nombres que coinciden exactamente con los que se escriben en las capturas de "ya existe"/"repetido"), `cdp.mjs` (helpers de Chrome headless por CDP: abrir pestaña, cookie de sesión, emular tamaño, medir desbordes, capturar PNG) y adapté `capturar.mjs` a un guión propio (`capturar-110.mjs`) con los seis casos de esta pieza. `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4181` y una llave pública falsa) solo en este árbol de trabajo, nunca el `.env` real. Chrome headless con su propio perfil, puerto de depuración propio (9334) y puerto de app propio (3178) para no chocar con otro operador.

**Un tropiezo del método, para quien lo reuse:** construí primero con `npm run build` (para el veredicto de arriba) *antes* de crear `.env.local` — Next.js sustituye `process.env.NEXT_PUBLIC_*` por literales en la compilación, en cualquier archivo (cliente o servidor), así que ese build llevaba las variables vacías incrustadas y la sesión/las consultas al respaldo local no funcionaban en ninguna pantalla (parecía que "Ya está registrado" nunca aparecía). Reconstruir con `.env.local` ya puesto lo resolvió. Aparte, `Input.dispatchKeyEvent` con `key: "Backspace"` no borra nada en este Chrome headless (medido: cero efecto tras repetirlo); un triple clic (selecciona todo el valor, comportamiento nativo del campo) seguido de escribir encima con eventos de texto sí reemplaza la selección — es lo que usé para vaciar el campo Nombre del perfil.

**Seis capturas** (390×844 y una a 320×568), en [`docs/rediseno/capturas-110/`](../../../rediseno/capturas-110/):

| Captura | Qué prueba |
| --- | --- |
| [`lugar-alta-antes--390x844.png`](../../../rediseno/capturas-110/lugar-alta-antes--390x844.png) | F1: formulario vacío, "Falta el nombre." bajo el campo y "Falta dónde está." bajo Dónde; el botón solo dice "Publicar lugar". |
| [`lugar-alta-existe--390x844.png`](../../../rediseno/capturas-110/lugar-alta-existe--390x844.png) | F2: nombre al tope de longitud igual a un lugar ya registrado (`Centro Cultural Comunitario de las Artes Escénicas y Visuales del Barrio de Tequisquiapan`, 89 caracteres) → "Ya está registrado" flota encima de Tipo, sin desplazarlo. |
| [`lugar-alta-existe--320x568.png`](../../../rediseno/capturas-110/lugar-alta-existe--320x568.png) | Lo mismo, al ancho más chico soportado: sigue flotando, sin desborde. |
| [`artista-alta-vacio--390x844.png`](../../../rediseno/capturas-110/artista-alta-vacio--390x844.png) | F1 en artista: "Falta el nombre." bajo el campo; el botón solo dice "Publicar artista". |
| [`artista-alta-repetido--390x844.png`](../../../rediseno/capturas-110/artista-alta-repetido--390x844.png) | F2 en artista: nombre al tope (`Ensamble Comunitario de Cuerdas y Percusiones del Altiplano Potosino`, 68 caracteres) igual a uno ya registrado → aviso flotando encima de "Es"/Ciudad, sin desplazarlos. |
| [`perfil-editar-falta--390x844.png`](../../../rediseno/capturas-110/perfil-editar-falta--390x844.png) | F1 en perfil: Colonia y Sobre ti al tope de longitud, Nombre vaciado → "Falta el nombre." bajo el renglón Nombre; "Guardar" sin texto adentro. |

**Medición de desbordes** (`getBoundingClientRect`/`scrollWidth` vs `clientWidth`, en `medidas.json` del scratchpad): **0 elementos fuera del viewport y ningún scroll horizontal** en las 6 capturas, con los datos al tope de longitud citados arriba.

**Medición de que Tipo y el botón no se mueven al aparecer el aviso** (pedida explícitamente por el gestor): comparé los mismos rects (Tipo, Más, botón) con el nombre ya escrito, antes y después de que el aviso "Ya está registrado" aparezca (mismo nombre en dos momentos, para no mezclar el efecto con que desaparezca "Falta el nombre."): `top`/`left` **idénticos** en los tres — `{"tipo":{"top":354,"left":20},"mas":{"top":428,"left":20},"boton":{"top":510,"left":20}}` en ambos momentos (`medir-no-empuja.json` del scratchpad).

**Límite declarado:** sin token de Mapbox en este árbol (nunca se copia uno real a la carpeta de un operador), así que la lista de sugerencias de Mapbox nunca se vio con resultados reales; lo que sí se vio y se midió es el aviso "Ya está registrado" (viene de la RPC `lugares_con_nombre`/`artistas_con_nombre`, no de Mapbox), que es exactamente el caso que F2 pedía corregir.

## Estado

Commit local en `alta-lugar-artista-canon`, sin push (Vercel en su tope diario de despliegues). Sin migración. `.env.local` y el respaldo/scripts de captura quedan fuera del repo (ignorados por `.gitignore`, y los scripts en el scratchpad de esta sesión, no en el árbol de trabajo). Aviso "listo" al gestor.
