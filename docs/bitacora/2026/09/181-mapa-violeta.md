# 181 · Mapa sin aros y violeta en la app (OL-146, código de OL-141/doc rediseno/37)

**Fecha:** 2026-09-23 · **Rama:** `mapa-violeta`, desde `origin/main` · **OL:** OL-146 (pieza E5, código) · **Modelo:** Sonnet 5, esfuerzo medio. Sin council, workflows ni subagentes.

## De dónde sale

El founder firmó, sobre el prototipo `docs/rediseno/prototipos/mapa-lugares.html?color=C` y el doc `docs/rediseno/37-color-primario.md` (bitácora 176): «Violeta» como color primario y quitar el doble círculo ("aro") de los pines del mapa, distinguiendo los lugares solo por tamaño y color. Esta pieza pasa esa decisión a código.

## Qué se hizo

### 1. El color primario: violeta `#6d34c8`

- `src/app/globals.css`: `--primario` pasa de `#0f6b7c` (azul petróleo) a `#6d34c8`; `--primario-suave` deja de ser un hex fijo y se deriva con `color-mix(in srgb, var(--primario) 12%, white)`, como proponía el doc 37.
- Sitios con el color escrito a mano (`grep -rn '0f6b7c\|--primario' src public`), fuera de `globals.css`:
  - `src/lib/mapaEstatico.ts` (`COLOR_PIN`, el pin del mapa de referencia de una ficha) y su prueba `src/lib/mapaEstatico.test.ts`, actualizados a `6d34c8`.
  - `src/app/global-error.tsx` (el botón «Intentar de nuevo» de la página de error, que no tiene `globals.css` cargado): actualizado a `#6d34c8`.
  - Todo lo demás (botones, chips, pestañas, píldora de la nav, avisos activos, etc.) usa `var(--primario)`/`var(--primario-suave)` y hereda el cambio sin tocarlo.
- Contraste (doc 37, WCAG 2): 7,1:1 sobre blanco y 6,5:1 sobre `--fondo-contenido` (`#f6f5f1`) — AA de sobra donde el primario lleva texto blanco encima (botones, píldora de la nav, chip activo) y donde es el propio texto (pestaña activa, chip suave). Verde, naranja, rojo y tinta no cambiaron.
- `docs/diseno/LINEA_GRAFICA.md`: sección «El color de acción» reescrita con la fecha 2026-09-23 y la cita del founder; sección «El mapa de Lugares» actualizada a la regla de tamaño/color sin aro (tabla igual a la de doc 37).

### 2. Los pines del mapa: sin aro, tamaño = evento, color = qué es

- **`src/lib/pines.ts` (nuevo):** lógica pura y testeable — `radioPin` (12 px con día, 5 px sin él) y `colorPin` (privado > seguido > destacado > con evento > tinta). La usan tanto `Mapa.tsx` como su prueba, así la regla se comprueba sin levantar Mapbox.
- **`src/components/Mapa.tsx`:**
  - Se quitó la capa `lugares-aro` (el doble círculo) y toda mención al aro en comentarios.
  - `aGeoJSON` ahora recibe también `destacados` (antes solo `seguidos`) y dos juegos de colores (`ColoresPin` para el punto y para el texto, porque el destacado usa `--destacado` en el punto y `--destacado-texto`, más oscuro, en el nombre); calcula `radio`, `colorPunto` y `colorTexto` por lugar con `pines.ts` y los deja en las propiedades del GeoJSON.
  - Las capas (`circle-color`, `text-color`, `circle-radius`) ahora solo leen esas propiedades (`["get", "colorPunto"]`…) en vez de repetir la regla en expresiones `case` de Mapbox: una sola fuente de verdad.
  - Nueva prop `destacados?: string[]` (antes el mapa no pintaba destacados en absoluto: la bitácora 176 lo dejaba pendiente de esta firma).
  - `circle-sort-key`/`symbol-sort-key` (qué gana al chocar dos pines o nombres): ahora seguido > destacado > con evento > el resto (antes no existía el nivel de destacado).
- **`src/app/lugares/VistaLugares.tsx`:** pasa `destacados={enTira}` al `<Mapa>` (ya calculaba esos ids para la tira de destacados; solo faltaba dárselos al mapa). Comentario actualizado (ya no habla de "aro").

### 3. Pruebas

- `src/lib/pines.test.ts` (nuevo, 7 pruebas): tamaño según haya día o no; color tinta por defecto; color de acción con evento; naranja del destacado con y sin día; verde del seguido incluso sobre destacado+evento; gris del privado incluso sobre seguido+destacado+evento.
- `src/lib/mapaEstatico.test.ts`: hex actualizado en la prueba que arma la URL de la Static Images API.

## Verificación

`npm run lint` (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck`, `npm test` (**1047 pruebas**, todas verdes, incluidas las 7 nuevas de `pines.test.ts`) y `npm run build`: verdes. Antes de correr nada hubo que `npm ci` (el árbol no tenía `node_modules`); `package.json` y el lock quedaron intactos (`git status` sin cambios en ninguno de los dos).

### Capturas reales (`docs/rediseno/capturas-181/`), 390×844 a escala 2, abiertas y descritas

Con `next build && next start` y Chrome real (`playwright-core` instalado solo en el scratchpad de la sesión, nunca en el repo), `document.fonts.check('16px "Bricolage Grotesque"')` = `true` en las tres. Mapbox real con el token público del proyecto (nunca copiado a este repo, nunca impreso en esta bitácora); sin Supabase: un arnés temporal (`src/app/arnes181-temporal`, servido solo mientras corrían las capturas y borrado antes de comitear — no aparece en `git status`) alimentó `VistaLugares` con siete lugares inventados para ver los cuatro estados del pin con Mapbox de verdad, sin tocar producción ni copiar `.env` de otra carpeta.

- **`01-mapa-pines-sin-aro.png`:** sin sesión. Cineteca Alameda y Casa del Poeta, puntos chicos en tinta (sin evento). Teatro de la Paz («Hoy») y Museo Laberinto («Sáb»), pines medianos en violeta (con evento, sin ser destacados). Centro de las Artes («Hoy») y MUNI Museo Universitario («Jue»), en naranja (destacados, no seguidos: MUNI conserva el naranja aun con evento, porque destacado gana a "con evento"). Museo Federico Silva, punto chico naranja (destacado, sin evento). Ningún aro en ningún pin. «Entrar» y «Registrar lugar» en violeta; «Todos» activo en violeta.
- **`02-mapa-seguidos.png`:** mismo encuadre, con `seguidos=[Museo Federico Silva, MUNI]`. Los dos pasan a verde — MUNI incluso siendo destacado y con evento («Jue» sigue visible, ya en verde): el seguido gana a destacado y a evento, como pide la regla. Centro de las Artes sigue en naranja (destacado, no seguido). Ningún otro pin cambia.
- **`03-boton-primario-chip-activo.png`:** `/lugares?vista=lista` real de producción, sin datos (sin Supabase configurado, por diseño de la app: `cargar()`/`cargarCiudades()` devuelven vacío en vez de romperse). Se ve el botón primario «Registrar un lugar» (contorno, texto violeta) y el flotante «Registrar lugar» (relleno violeta), la pestaña «Todos» activa en violeta con su marca inferior, el chip «Entrar» violeta y la píldora de «Lugares» activa en la navegación inferior, también violeta con icono blanco.

## Límites

- El arnés (`src/app/arnes181-temporal`) fue solo para las capturas con Mapbox real: no hay respaldo local de datos (PGlite/Supabase) documentado en el repo para esta pieza, así que en vez de montarlo se alimentó `VistaLugares` directamente con datos inventados, sin pasar por Supabase. Quedó borrado antes de comitear.
- No hay una segunda prueba del founder en su iPhone (Safari) todavía: pendiente, como en toda pieza de esta fase.
- El pin con evento cede el color al destacado aunque tenga día (MUNI en naranja/verde con «Jue»): así lo pide la tabla del doc 37 y así se ve en las dos capturas; si el founder prefiere que "con evento" se note siempre aunque sea destacado o seguido, es un cambio de una línea en `colorPin` (`src/lib/pines.ts`).

## Archivos

`src/app/globals.css`, `src/lib/mapaEstatico.ts`, `src/lib/mapaEstatico.test.ts`, `src/app/global-error.tsx`, `src/lib/pines.ts` (nuevo), `src/lib/pines.test.ts` (nuevo), `src/components/Mapa.tsx`, `src/app/lugares/VistaLugares.tsx`, `docs/diseno/LINEA_GRAFICA.md`, `docs/rediseno/capturas-181/` (3 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
