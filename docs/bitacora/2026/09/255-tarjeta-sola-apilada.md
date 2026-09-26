# 255 · Tarjeta sola con la imagen arriba (OL-226)

**Fecha:** 2026-09-26 · **Rama:** `tarjeta-sola-apilada`, desde `origin/main` (`b0ee2f66`) · **OL:** OL-226 · **Modelo:** Sonnet 5. Sin subagentes, council ni workflows.

## Pedido

OPEN_LOOPS, OL-226. Founder, con una foto de su iPhone donde «Tus planes» tenía un solo plan: «acabo de ver esta disposición de card con texto a un lado que muestra los chips súper pequeños, prefiero que siempre se muestre la imagen arriba y el texto abajo para tener espacio suficiente para chips» (Decidido, misma fecha: «Tarjetas: la imagen siempre arriba y el texto abajo»). En la foto, la tarjeta sola salía a lo ancho con una foto chica a la izquierda; encima se amontonaban «Recién agregado» (partido en dos líneas) y «N van», y el check verde tapaba «Recién agregado».

## Lo que ya había

`Destacados.tsx` agrega `styles.uno` cuando la fila trae una sola tarjeta (de cualquier carril: Tus planes, Esta semana, Populares, Nuevos, Cerca de ti, Agenda, Lugares, Artistas…). En `Destacados.module.css`, `.uno` ponía la tarjeta horizontal (foto de 124px a la izquierda, texto a la derecha; `.uno.redondas`, foto de 93px) — exactamente la disposición que el founder acaba de rechazar. Solo `.uno.grande` (Destacados, lo elegido por la administración) ya apilaba: foto de 264px arriba (proporción 5:3) y texto abajo.

## El arreglo

**`.uno` pasa a ser lo que era `.uno.grande`.** En vez de dos disposiciones (`.uno` horizontal y `.uno.grande` apilado), ahora toda tarjeta sola no redonda se apila igual, sin importar si su fila es mediana o grande: foto de 264px arriba (`height:auto; max-height:264px; aspect-ratio:5/3`), título/detalle/sellos abajo. `.uno.grande` queda absorbido y se borra (era idéntico, letra por letra, a lo que `.uno` ya hace ahora). El botón (Voy/Seguir) ya no necesita un ancla propia: al no haber más foto angosta al lado del texto, la esquina superior derecha de siempre (`--espacio-2`/`--espacio-2`, heredada de `.carril > li > button`) cae sola sobre la imagen, sin tapar ningún sello.

**Las redondas de artista quedan fuera de la regla.** El founder no pidió cambiar cómo se ven las redondas — solo que dejaran de deformarse al quedar solas. `.uno.redondas` ahora deshace lo que `.uno` acabaría poniendo (foto de 264px, ancho 100%) y repone exactamente lo que ya tiene cualquier redonda: círculo de 104px (`grid-auto-columns:104px`, `.tarjeta` con fila de foto de 104px, `.foto` a `height:100%` para llenar ese círculo) y el nombre centrado debajo. El botón tampoco necesita ancla propia aquí: hereda `top:-9px; right:-9px` de `.redondas > li > button` de siempre.

**Borrado, no dejado muerto:** las cuatro reglas que sostenían la disposición horizontal (`.uno .tarjeta` con columnas 124px/1fr, `.uno .foto` a 93px, `.uno.redondas .tarjeta` a columnas 93px/1fr, y los dos anclajes de botón con `calc(100% - 124px…)`/`calc(100% - 93px…)`) se quitaron enteras, no se dejaron sin usar.

**Comentarios:** el de `.uno` en el CSS y la frase «con una sola, ocupa el ancho» del JSDoc de `Destacados.tsx` citaban (o daban por hecho) «foto a la izquierda»; los dos se reescribieron citando OL-226 y la frase del founder.

## Archivos

- `src/components/Destacados.module.css`: `.uno`/`.uno.redondas` reescritas (arriba); `.uno.grande` y las reglas horizontales, borradas.
- `src/components/Destacados.tsx`: solo el JSDoc (comportamiento sin cambios).

## Verificación

`npm run lint && npm run typecheck && npm test && npm run build`: 113 archivos, 1474 pruebas, sin advertencias nuevas (la única sigue siendo la preexistente y ajena de `docs/diseno/logotipo/iconos-sn.mjs`); typecheck y build sin errores. Sin pruebas unitarias nuevas: es un cambio de CSS puro, sin lógica — las que ya cubren `Destacados`/`lib/destacados.ts` (`Destacados.componentes.test.mjs`, fuera de `npm test`; `src/lib/destacados.test.ts`) no dependen de esta disposición.

### Capturas reales, antes y después (`docs/rediseno/capturas-255/`)

Respaldo local 100% inventado (Node puro sobre `node:http`, sin dependencias, en el scratchpad de la sesión; nunca tocó producción ni un `.env` real, que no existe en este árbol): imita Auth (`/auth/v1/user`, JWT `HS256` sin firma válida — mismo patrón que las bitácoras 241/248/253) y PostgREST de `perfiles`, `eventos`, `eventos_artistas`, `asistencias`, `lugares`, `seguimientos` y las RPC `van_por_evento`/`tira_destacados`; cualquier otra tabla, vacía. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8823`, borrado al terminar. `next build && next start -p 3100`, Chrome real de la Mac por `playwright-core`, 390×844, `deviceScaleFactor:1`, `document.fonts.ready` esperado antes de cada captura (Bricolage Grotesque condensada se ve en «SMSNSTRS» y en los títulos). Cada escenario se corrió con dos builds completos y separados — uno con el CSS de `origin/main` (antes), otro con el de esta rama (después) — nunca mezclando las dos mitades de un mismo build.

Una cuenta desechable, `planes@example.com`, con Voy en un evento («Recital de poesía en el Centro», publicado ayer: sale «Recién agregado») con 2 «van»; tres eventos públicos más («Función de teatro comunitario» y «Concierto en la plaza», esta semana; «Feria de artesanías potosina», con 5 «van», fuera de esta semana) y un artista con un evento próximo («Artista de Prueba»).

- **`255-1/2-tusplanes-sesion-antes/despues.png`:** Inicio con sesión, «Tus planes» con el único plan. Antes: tarjeta a lo ancho con la foto de 93px a la izquierda, «Recién agregado» partido en dos líneas y «2 van» amontonados junto al check verde. Después: foto arriba (5:3), «Recién agregado» y «2 van» a tamaño normal en la esquina inferior izquierda de la foto, el check verde en la esquina superior derecha sin tapar nada, título y detalle debajo.
- **`255-3/4-estasemana-sinsesion-antes/despues.png`:** «Esta semana» sin sesión, con sus dos tarjetas de siempre (Función de teatro comunitario, Concierto en la plaza) — igual antes y después, mostrando que una fila con dos o más tarjetas no cambió.
- **`255-5/6-populares-sinsesion-antes/despues.png`:** «Populares», sin sesión, con su única tarjeta («Feria de artesanías potosina», 5 van). Antes: horizontal, chip diminuto junto al botón «+». Después: apilada igual que Tus planes.
- **`255-7/8-artistasemana-redonda-antes/despues.png`:** «Artistas con eventos» (redondas), con un solo artista. Antes: círculo achicado a 93px, corrido a la izquierda del nombre (la misma disposición horizontal, deformando el círculo). Después: círculo de 104px sin deformar, con «Artista de Prueba» y su fecha centrados debajo — igual que cualquier otra redonda.

## Cierre

`.env.local`, el respaldo local y `playwright-core` quedaron en el scratchpad de la sesión (nunca en el repo). No se tocó `package.json`/lock, `CLAUDE.md` ni `apps/**`. Commit local en `tarjeta-sola-apilada`, PR abierto contra `main`, sin unir: pendiente `gh pr checks` y que el founder lo pruebe en su iPhone (Safari).

## Segunda vuelta: los sellos, dentro de la imagen (gestor)

Con el PR #264 ya en producción, el founder escribió: «En las fotos compartidas los chips se salen de los márgenes
de imagen. Te vuelvo a llamar la atención respecto a la manera como maquetas. Sin sobre anidar, simplificar
estructura y código. Pulcritud y atención al detalle por favor».

**Causa.** La fila de la foto medía 264px fijos, pero la imagen a lo ancho en 5:3 mide 210px a 390px de pantalla.
Los sellos se alinean al fondo de esa fila y no de la imagen, así que colgaban por debajo de ella: dos sellos
montaban el borde y uno solo flotaba en el hueco. `.uno.grande` ya tenía el mismo defecto. El gestor lo vio en
la revisión y lo dejó pasar porque «ya estaba así». No debió.

**Arreglo.** Tres reglas en lugar de nueve, y ninguna deshace a otra:
- `.uno:not(.redondas)` para la columna a lo ancho;
- la fila de la foto en `auto`, para que mida lo que la imagen;
- la imagen en 5:3 con tope de 264px.

Las redondas quedan fuera con `:not()`, sin reglas que deshagan otras. Desaparecen `grid-template-columns: none`,
las áreas repetidas (la tarjeta base ya las define), `.uno small` y los cuatro `.uno.redondas`. El JSDoc de
`Destacados.tsx` queda en una línea.

**Medido** con `getBoundingClientRect`: build de producción local contra el respaldo inventado de esta bitácora,
Chrome real a 390×844.
- Tus planes con un plan: foto 350×210. «Recién agregado» (126×24) y «2 van» (62×24) quedan dentro de la
  imagen, a 8px del borde izquierdo; «2 van» a 8px del fondo. El check (48×48) queda a 8px de arriba y de la
  derecha.
- Populares con una tarjeta: «5 van» dentro, a 8px de la izquierda y del fondo; el botón a 8px de la esquina.
- Esta semana, con dos tarjetas: fotos de 220×132 como antes, sin cambio.
- Artista sola: círculo de 104×104. El botón flota sobre el perímetro (9px fuera), como decidió el founder el
  2026-09-21 para todas las redondas.

**Capturas:**
- `255-9-tusplanes-sellos-dentro.png`: los dos sellos dentro de la imagen, abajo a la izquierda; el check arriba
  a la derecha; título y fecha debajo.
- `255-10-populares-y-artista-sellos-dentro.png`: Populares con «5 van» dentro de la imagen, y la artista sola
  en su círculo.
