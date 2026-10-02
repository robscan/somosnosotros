# 280 · Artistas con eventos esta semana, cinta en los destacados, «Hoy» y fecha en violeta (OL-253)

**Fecha:** 2026-10-01 · **Rama:** `inicio-artistas-estrella`, desde `origin/main` (`af6bf926`) · **OL:** OL-253 · **PR:** contra `main`, sin unir · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Encargo del founder en dos tiempos: prototipo (`docs/rediseno/prototipos/ol-253/index.html`, capturas `docs/rediseno/capturas-280/01-` a `07-`) y, aprobado, el código (capturas `app-01-` a `app-05-`). Decisiones del founder sobre el prototipo: la marca de destacado no es una estrella (la estrella ya es la pestaña Artistas); en un primer código fue una flama de trazo en un círculo de vidrio, y **el mismo día (2026-10-01) el founder la descartó por ilegible y pidió una cinta colgante violeta**, sin círculo, como un separador de libro (ver 2); «Hoy» opción A (fondo `--primario`, texto `--primario-texto`); sin marca dentro de la tira «Destacados»; el artista que ya sale en «Artistas destacadxs» no se repite; «Lugares con eventos» pasa a «Lugares con eventos esta semana»; fecha violeta en lugares y artistas; `sin-foto.png` para lo que no tiene foto.

## 1. Carril «Artistas con eventos esta semana»

Se repone lo mínimo de lo que retiraron P5 (OL-233, `17fad74e`) y OL-243 (`63f4d060`), no el commit entero:

- `lib/cargarEventosSemana.ts` y `lib/eventosSemana.ts`: vuelve el modo `"artistas"` (lectura de `eventos_artistas` por lotes, mismo presupuesto de filas, consultas y tiempo, y el mismo corte exacto de la semana). Restaurados tal cual estaban en `63f4d060^`, con sus pruebas.
- Dos diferencias de fondo con aquel modo: la ficha **sin foto entra igual** (antes «un destacado exige foto», H-03; ahora quien pinta la tarjeta pone el símbolo SN) y toda tarjeta trae `cuando: true`, porque su `detalle` es siempre un día y una hora. Esto vale también para los lugares: un lugar sin portada con evento ya sale en «Lugares con eventos esta semana».
- `app/page.tsx`: `semanaArtistasPromise` = `cargarEventosSemana(…, "artistas", …)` menos los ids que ya están en `artistasDestacadosPromise` (no se repite). `Inicio.tsx`: `slotArtistasSemana`, **después** de «Artistas destacadxs» (orden pedido por el founder el mismo día: primero lo elegido, luego lo de la semana, y así la regla de no repetir se lee de arriba abajo), con el esqueleto redondo (`chica`). El carril usa `CarrilEntidad` tal cual (botón Seguir, memoria de pantalla `inicio-artistas-semana`, «Ver artistas»).
- `Destacados.tsx`: una tarjeta **redonda** (`chica`) sin foto pinta `SIN_FOTO` (`/sin-foto.png`, la imagen ya generada, nunca compuesta en vivo) dentro del círculo; las demás sin foto siguen con el nombre grande sobre fondo suave (H-03). Antes, una redonda sin foto caía en ese fondo con el nombre dentro y salía cuadrada.
- Título «Lugares con eventos» → «Lugares con eventos esta semana» (`page.tsx`).

## 2. Cinta en los eventos destacados

Decisión del founder (2026-10-01): la flama de trazo no se lee (a 17 px se veía como una gota; de relleno, peor) → cinta colgante, sin círculo ni vidrio, que cuelga del borde superior de la foto como un separador de libro. Primero violeta; **el founder la pidió blanca** porque la violeta no se veía sobre la imagen (mismo día).

- `ui/Iconos.tsx`: `IconoCinta` (viewBox 22×30, `M0 0h22v30l-11-7-11 7z`, relleno `currentColor`, sin trazo; con `width`/`height` 22×30 para que su proporción sea la del dibujo y el alto salga del ancho). `IconoFlama` se quita: ya nadie la usa.
- `ui/MarcaDestacado.tsx` + `.module.css`: la cinta en `--primario-texto` (blanco, el token que ya existe) con `filter: drop-shadow(var(--sombra-cinta))` (token nuevo; primero `0 1px 1px rgba(0,0,0,.25)`, subido a `0 1px 2px rgba(0,0,0,.45)` porque sobre las miniaturas claras apenas se notaba el borde), `role="img"` con nombre «Destacado». Sin círculo. Quien la lleva le da su sitio (el área de su rejilla) y su ancho (`--marca-ancho`: `--marca-tarjeta` 22 px o `--marca-renglon` 14 px, `globals.css`).
- **Tarjetas** (`Destacados.module.css`): hijo del `<a>` en el área de la foto (`1 / 1`), pegada al borde superior (sin margen arriba) y a `--espacio-2` del borde izquierdo: 22×30. Sin `position: absolute` ni márgenes negativos.
- **Renglones de Agenda** (`ui/Renglon.tsx`, prop `destacado`; `Renglon.module.css`): hijo de `.frente` en el área `foto`, colgando del borde superior de la miniatura con `--espacio-2` a la izquierda: 14×19 (la proporción de 22×30 sobre la miniatura de 56 px). Ni el renglón ni el título ni la meta se mueven (lo comprueba la prueba).
- Qué es «destacado»: los ids de `agenda.destacados` (`tira_destacados('eventos', ciudad)`). `tarjetaEvento(e, ahora, destacado)` lo copia a la tarjeta (`destacado`, solo cuando es verdad); `CarrilAgenda` lo pide para «Esta semana», «Nuevos eventos» y, con sesión y seguimientos, «Seleccionados para ti» (que mezcla destacados con lo que se sigue). **No lleva marca la tira «Destacados» misma** (todos lo son), ni «Tus planes» (agenda personal; no recibe la tira). `AgendaLista` y `AgendaNuevos` pasan `destacado` a `RenglonEvento`.

## 3. «Hoy» en violeta y fecha violeta

- «Hoy» (`selloDeTarjeta` ahora devuelve también `hoy`; `Destacados.module.css`, `.tarjeta > .hoy`): fondo `--primario`, texto `--primario-texto`. Contraste medido (WCAG 2.x): blanco sobre #6d34c8 = **7,06:1**. «N van» y «Te interesa» no cambian. En Agenda no existe el sello «Hoy» (el día va en el título del grupo), así que no cambia nada ahí.
- Fecha en violeta en las tarjetas redondas de lugares y artistas: salió gratis de `cuando: true` (la clase `.cuando` de OL-251 ya existía).

## Pruebas

- `eventosSemana.test.ts` / `cargarEventosSemana.test.ts`: las de artistas restauradas; la de H-03 cambia de sentido (la ficha sin foto entra, con `foto: null` y `cuando: true`).
- `destacados.test.ts`: `selloDeTarjeta` con `hoy`; `destacado` solo si se pide.
- `Destacados.componentes.test.mjs` (+3): «Hoy» `rgb(109, 52, 200)` con texto blanco y «N van» sin tocar; la cinta a 22×30, a 8 px del borde izquierdo y a 0 del superior, sin cruzar botón ni rótulo, relleno blanco `rgb(255, 255, 255)`, fondo transparente y sombra de `--sombra-cinta`; la redonda sin foto con `/sin-foto.png`, `border-radius: 50%` y fecha violeta; las no redondas sin foto, sin imagen. `Renglon.componentes.test.mjs` (+1): la cinta a 14×19, a 8 px a la izquierda y a 0 arriba, dentro de la miniatura, sin mover el renglón.
- `npm run lint` (solo el aviso previo de `VisorImagen.componentes.test.mjs`), `typecheck`, `test` (1685), `inventario` (sin novedades), `test:componentes` (209 de 209), `medir` (sin novedades tras anotar los presupuestos de abajo; el cambio de flama a cinta no movió ninguna medida: mismos nodos y profundidad): verdes.

### Presupuestos de `medir` que subieron, uno por uno (`medidas.aceptadas.json`)

El respaldo local (`respaldo-local/fixture.mjs`) gana tres relaciones evento-artista (0Backside0, Abril Merlot y Aaron Cadena, los tres sin foto, con evento esta semana) para que el carril nuevo se mida con tarjetas SN. Los artistas con cartel ya salen en «Artistas destacadxs» y no se repiten.

| Pantalla | Antes → después (nodos) | Causa |
|---|---|---|
| `01-inicio` | 257 → 295 (+38) | el carril nuevo: encabezado, enlace y 3 tarjetas redondas con botón |
| `s01-inicio-sesion` | 266 → 308 (+42) | lo mismo, más dos marcas en «Seleccionados para ti» (Master Class y DESIERTO; 2 nodos cada una: el contenedor y su svg) |
| `02-agenda` | 260 → 268 (+8) | 4 marcas en los renglones destacados (2 nodos cada una) |
| `s02-agenda-sesion` | 263 → 271 (+8) | ídem |
| `s14-agenda-nuevos` | 180 → 188 (+8) | ídem |
| `05-artistas` | 134 → 143 (+9) | los tres artistas del fixture ahora tienen próxima fecha (su línea de cuándo: 3 nodos cada una) |
| `09-ficha-artista` | 85 → 100 (+15) y profundidad 9 → 12 | Aaron Cadena ahora tiene un evento próximo en su ficha (la sección de eventos por día; la misma profundidad que las fichas de lugar) |

Ningún otro presupuesto cambió y ningún hallazgo de caja, toque, tapado ni margen negativo.

## Capturas (`docs/rediseno/capturas-280/app-*.png`, 390×844 a 2x, Chrome, build local contra el respaldo de datos inventados con el reloj fijo de `medir`, 2026-10-07 10:00; los carteles son los públicos del respaldo)

- `app-01-inicio-seleccionados-con-cinta.png`: Ana (con sesión). «Tus planes» sin marca; «Seleccionados para ti» con la cinta blanca de muesca en V colgando del borde superior de la foto, a la izquierda, en «Master Class» y en «DESIERTO», con su sombra suave (se lee con claridad sobre el cartel oscuro de Master Class; en DESIERTO la foto tiene un borde blanco arriba y allí la cinta se distingue por su sombra y su muesca); el botón de palomita arriba a la derecha, sin cruzarse.
- `app-02-inicio-lugares-y-artistas-con-eventos.png`: el nuevo orden. «Artistas destacadxs» (Orquesta Sinfónica «hoy · 18:00», Pimpolina «sáb 10 de oct · 18:00», con el botón de seguir o palomita arriba a la derecha) y, debajo, «Artistas con eventos esta semana» con «Ver artistas» a la derecha: tres círculos con el símbolo SN gris (0Backside0 «Hoy · 19:00», Abril Merlot «Mañana · 19:30», Aaron Cadena «lun 12 de oct · 18:00», fechas en violeta). Quienes tienen cartel salen arriba y no se repiten en el carril de la semana.
- `app-03-inicio-destacados-sin-marca.png`: sin sesión. La tira «Destacados» no lleva flama en ninguna tarjeta («2 van» sigue en vidrio); debajo, «Esta semana» con el sello «Hoy» ya violeta.
- `app-04-inicio-hoy-violeta.png`: «Esta semana», el sello «Hoy» en píldora violeta con texto blanco sobre el cartel de la Orquesta Sinfónica, junto a «1 va» en vidrio blanco en la tarjeta de al lado.
- `app-05-agenda-cinta-en-miniatura.png`: Agenda; «LXS COLOCAOS» con la cinta blanca de 14×19 colgando del borde superior de su miniatura, a 8 px del borde izquierdo (sobre el cartel claro se distingue por su sombra y su muesca); las demás filas (Inauguración, Susurros, Feleal) sin marca, con título, hora violeta y sitio en su sitio.

## Límites y pendientes

- Ninguna captura de Nuevos (hace falta tener más de dos eventos recién publicados) ni de «Tus planes» con marca (no la lleva). Las capturas `app-01`, `app-02` y `app-05` se rehicieron al cambiar la marca a cinta blanca y el orden de Inicio (las de la flama y la cinta violeta se retiraron); `app-03` y `app-04` no cambian. Sobre fotos muy claras la cinta blanca se apoya solo en su sombra: si el founder la ve floja, el ajuste es el token `--sombra-cinta`.
- El carril de artistas con pocas tarjetas no se desliza (con tres caben); el desplazamiento y la memoria de pantalla son los de `Destacados`, ya probados.
- Con 3 artistas sin foto el carril sale sin ninguna con foto; en producción, quien tiene foto y evento esta semana sale en «Artistas destacadxs» (hasta 12) y solo repite carril si lo deja fuera el tope.
- Las capturas del prototipo (`docs/rediseno/capturas-280/0*.png`) se conservan junto a las de la app.
