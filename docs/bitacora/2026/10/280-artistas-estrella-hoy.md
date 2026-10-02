# 280 · Artistas con eventos esta semana, «Hoy» y fecha en violeta (OL-253)

**Fecha:** 2026-10-01 · **Rama:** `inicio-artistas-estrella`, desde `origin/main` (`af6bf926`) · **OL:** OL-253 · **PR:** #291 contra `main`, sin unir · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Encargo del founder: revivir el carril de artistas con eventos esta semana, marcar los eventos destacados, y llevar «Hoy» y la fecha de lugares y artistas al violeta. Se hizo prototipo, se aprobó y se pasó a código.

**La marca de destacado quedó descartada por el founder (2026-10-01) y queda para después.** Pasó por tres formas el mismo día (flama de trazo en círculo de vidrio, cinta violeta colgante, cinta blanca); ninguna se entendió y el founder pidió quitarla por completo. No queda nada de ella en el PR: ni `MarcaDestacado`, ni el icono, ni los tokens (`--marca-*`, `--sombra-cinta`), ni el dato «destacado» en tarjetas y renglones, ni sus pruebas. Se retiraron también el prototipo (`docs/rediseno/prototipos/ol-253/index.html`, con sus variantes de estrella) y las capturas que la mostraban; siguen en el historial de la rama (`547e476a`) por si se retoma. Lo que se quedó de aquel prototipo son las capturas `03-`, `04-` y `07-` (carril de artistas y contraste de «Hoy»).

Decisiones del founder que sí se aplicaron: «Hoy» con fondo `--primario` y texto `--primario-texto`; el artista que ya sale en «Artistas destacadxs» no se repite; «Lugares con eventos» pasa a «Lugares con eventos esta semana»; fecha violeta en lugares y artistas; `sin-foto.png` para lo que no tiene foto; el carril nuevo va **después** de «Artistas destacadxs».

## 1. Carril «Artistas con eventos esta semana»

Se repone lo mínimo de lo que retiraron P5 (OL-233, `17fad74e`) y OL-243 (`63f4d060`), no el commit entero:

- `lib/cargarEventosSemana.ts` y `lib/eventosSemana.ts`: vuelve el modo `"artistas"` (lectura de `eventos_artistas` por lotes, mismo presupuesto de filas, consultas y tiempo, y el mismo corte exacto de la semana). Restaurados tal cual estaban en `63f4d060^`, con sus pruebas.
- Dos diferencias de fondo con aquel modo: la ficha **sin foto entra igual** (antes «un destacado exige foto», H-03; ahora quien pinta la tarjeta pone el símbolo SN) y toda tarjeta trae `cuando: true`, porque su `detalle` es siempre un día y una hora. Esto vale también para los lugares: un lugar sin portada con evento ya sale en «Lugares con eventos esta semana».
- `app/page.tsx`: `semanaArtistasPromise` = `cargarEventosSemana(…, "artistas", …)` menos los ids que ya están en `artistasDestacadosPromise` (no se repite). `Inicio.tsx`: `slotArtistasSemana`, **después** de «Artistas destacadxs» (así la regla de no repetir se lee de arriba abajo), con el esqueleto redondo (`chica`). El carril usa `CarrilEntidad` tal cual (botón Seguir, memoria de pantalla `inicio-artistas-semana`, «Ver artistas»).
- `Destacados.tsx`: una tarjeta **redonda** (`chica`) sin foto pinta `SIN_FOTO` (`/sin-foto.png`, la imagen ya generada, nunca compuesta en vivo) dentro del círculo; las demás sin foto siguen con el nombre grande sobre fondo suave (H-03). Antes, una redonda sin foto caía en ese fondo con el nombre dentro y salía cuadrada.
- Título «Lugares con eventos» → «Lugares con eventos esta semana» (`page.tsx`).

## 2. «Hoy» en violeta y fecha violeta

- «Hoy» (`selloDeTarjeta` ahora devuelve también `hoy`; `Destacados.module.css`, `.tarjeta > .hoy`): fondo `--primario`, texto `--primario-texto`. Contraste medido (WCAG 2.x): blanco sobre #6d34c8 = **7,06:1**. «N van» y «Te interesa» no cambian. En Agenda no existe el sello «Hoy» (el día va en el título del grupo), así que no cambia nada ahí.
- Fecha en violeta en las tarjetas redondas de lugares y artistas: salió gratis de `cuando: true` (la clase `.cuando` de OL-251 ya existía).

## Pruebas

- `eventosSemana.test.ts` / `cargarEventosSemana.test.ts`: las de artistas restauradas; la de H-03 cambia de sentido (la ficha sin foto entra, con `foto: null` y `cuando: true`).
- `destacados.test.ts`: `selloDeTarjeta` con `hoy`.
- `Destacados.componentes.test.mjs` (+2): «Hoy» `rgb(109, 52, 200)` con texto blanco y «N van» sin tocar; la redonda sin foto con `/sin-foto.png`, `border-radius: 50%` y fecha violeta, y las no redondas sin foto, sin imagen.
- `npm run lint` (solo el aviso previo de `VisorImagen.componentes.test.mjs`), `typecheck`, `test` (1684), `inventario` (sin novedades), `test:componentes` (207 de 207), `medir` (sin novedades tras anotar los presupuestos de abajo): verdes.

### Presupuestos de `medir` frente a `main` (`medidas.aceptadas.json`)

El respaldo local (`respaldo-local/fixture.mjs`) gana tres relaciones evento-artista (0Backside0, Abril Merlot y Aaron Cadena, los tres sin foto, con evento esta semana) para que el carril nuevo se mida con tarjetas SN. Los artistas con cartel ya salen en «Artistas destacadxs» y no se repiten.

| Pantalla | Antes → después (nodos) | Causa |
|---|---|---|
| `01-inicio` | 257 → 295 (+38) | el carril nuevo: encabezado, enlace y 3 tarjetas redondas con botón |
| `s01-inicio-sesion` | 266 → 304 (+38) | lo mismo |
| `05-artistas` | 134 → 143 (+9) | los tres artistas del fixture ahora tienen próxima fecha (su línea de cuándo: 3 nodos cada uno) |
| `09-ficha-artista` | 85 → 100 (+15) y profundidad 9 → 12 | Aaron Cadena ahora tiene un evento próximo en su ficha (la sección de eventos por día; la misma profundidad que las fichas de lugar) |

**Agenda** (`02-agenda`, `s02-agenda-sesion`, `s14-agenda-nuevos`) **vuelve a su valor de `main`** (260, 263 y 180): las +8 de cada una eran de la marca y se fueron con ella. Ningún otro presupuesto cambió y ningún hallazgo de caja, toque, tapado ni margen negativo.

## Capturas (`docs/rediseno/capturas-280/`, 390×844 a 2x, Chrome, build local contra el respaldo de datos inventados con el reloj fijo de `medir`, 2026-10-07 10:00; los carteles son los públicos del respaldo)

- `app-01-inicio-seleccionados.png`: Ana (con sesión). «Tus planes» y «Seleccionados para ti» con sus tarjetas de siempre, sin ninguna marca sobre las fotos; el botón de palomita arriba a la derecha y el rótulo abajo a la izquierda.
- `app-02-inicio-lugares-y-artistas-con-eventos.png`: el orden nuevo. «Artistas destacadxs» (Orquesta Sinfónica «hoy · 18:00», Pimpolina «sáb 10 de oct · 18:00») y, debajo, «Artistas con eventos esta semana» con «Ver artistas» a la derecha: tres círculos con el símbolo SN gris (0Backside0 «Hoy · 19:00», Abril Merlot «Mañana · 19:30», Aaron Cadena «lun 12 de oct · 18:00», fechas en violeta). Quienes tienen cartel salen arriba y no se repiten en el carril de la semana.
- `app-03-inicio-destacados-y-hoy.png`: sin sesión. La tira «Destacados» sin marcas («2 van» en vidrio); debajo, «Esta semana» con el sello «Hoy» ya violeta.
- `app-04-inicio-hoy-violeta.png`: «Esta semana», el sello «Hoy» en píldora violeta con texto blanco sobre el cartel de la Orquesta Sinfónica, junto a «1 va» en vidrio blanco en la tarjeta de al lado.
- `app-05-agenda-sin-marca.png`: Agenda, igual que en `main`: «LXS COLOCAOS», Inauguración, Susurros, Feleal y Master Class con su miniatura, título, hora violeta, sitio y botón, sin nada sobre las fotos.
- Del prototipo se conservan `03-inicio-lugares-y-artistas.png`, `04-inicio-carril-artistas-deslizado.png` y `07-chip-hoy-contraste.png` (el contraste de «Hoy» en sus dos opciones, A elegida).

## Límites y pendientes

- **Marca de destacado: pendiente para después** (decisión del founder). Si se retoma, hay tres intentos que no funcionaron (flama de trazo, cinta violeta, cinta blanca) y la lección de que sobre carteles claros y oscuros a la vez hace falta algo que no dependa del color.
- Ninguna captura de Nuevos (hace falta tener más de dos eventos recién publicados).
- El carril de artistas con pocas tarjetas no se desliza (con tres caben); el desplazamiento y la memoria de pantalla son los de `Destacados`, ya probados.
- Con 3 artistas sin foto el carril sale sin ninguna con foto; en producción, quien tiene foto y evento esta semana sale en «Artistas destacadxs» (hasta 12) y solo repite carril si lo deja fuera el tope.
