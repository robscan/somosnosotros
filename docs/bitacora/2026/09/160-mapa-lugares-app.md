# 160 · Mapa de lugares en la app (B1), según el doc 35 firmado (OL-125)

**Fecha:** 2026-09-22
**Rama:** `mapa-lugares-app` (creada desde `origin/main`, `053396a`; confirmada con `git branch --show-current` antes del primer commit; traído `main` después, sin conflictos)
**Pieza:** OL-125 y bitácora 160, reservadas por el gestor (Gestor de cambios II). No se tocó `src/app/obra/**` ni `ui/Ficha.module.css`.

## Qué pedía

[Doc 35](../../../rediseno/35-mapa-de-lugares.md), firmado por el founder el 2026-09-22, sección «Qué toca en el código cuando se firme»: botón de ubicación (mismo componente que el ↑ de los listados), encuadre inicial (lugares de la semana y destacados; con ubicación, los cinco cercanos), pines con «Hoy»/día y aro de resalte, hoja corta al tocar un pin, y «Cercanos» fuera de las pestañas del mapa.

**Cambio del founder después de firmar (2026-09-22), literal:** «ahora los lugares en rojo son los destacados. Pero creo que de cara al usuario es más útil que se resalten los seguidos.» Así que el resalte (naranja y aro) pasa de los destacados a los seguidos; sin sesión, sin resalte. Actualicé el doc 35 y el prototipo con este cambio antes de tocar código (commit `4ffd11d`): nueva decisión al inicio con sus palabras, tabla de pines, y una captura nueva del prototipo (`capturas-35/prototipo-seguidos--390x844.png`) que contrasta un destacado sin seguir (Centro de las Artes: se pinta como cualquiera) contra un destacado+seguido (Museo Federico Silva) y un solo-seguido (MUNI).

## Qué se hizo (commit `8e11dc3`, antes del merge de `main`)

- **`src/lib/fechas.ts`:** `diaPin(inicio, ahora, zona)` — «Hoy» si el evento es hoy, el día en tres letras con acento (Lun…Dom) si cae en la ventana de «esta semana» (misma regla que `tramo`), o `null` fuera de ella. Prueba en `fechas.test.ts`.
- **`src/lib/lugares.ts`:**
  - `lugaresEncuadreInicial(lugares, destacados, centro, ahora)` — los lugares con evento en la ventana de `diaPin` y los destacados; con menos de tres, se completa con los más cercanos al centro de la ciudad hasta llegar a seis (`MIN_ENCUADRE_INICIAL`/`TOPE_ENCUADRE_INICIAL`). Tres pruebas en `lugares.test.ts`.
  - `textoProximoPin(p, ahora)` — «Hoy · 20:00 · Orquesta Sinfónica de SLP»: el próximo evento para la hoja del pin, con el nombre del evento y sin el prefijo «Próximo:» de la lista.
  - `ProximoEvento` gana el campo `titulo` (lo necesita `textoProximoPin`); actualicé su único productor con `titulo` opcional en el tipo, `conProximo()`, y las dos consultas que lo alimentan: `src/app/lugares/page.tsx` (el `select` de `cargar()`) y `src/app/personas/consultas.ts` (`conProximos()`, para que la ficha de persona siga siendo consistente). Sin esto, `conProximo` habría dejado `titulo` como `undefined` en tiempo de ejecución sin que TypeScript lo notara (el `as` de esas consultas no comprueba la forma real).
- **`src/components/Mapa.tsx`:**
  - Nueva capa `CAPA_ARO` (círculo sin relleno, solo borde naranja) y `CAPA_DIA` (símbolo con el texto «Hoy»/día, centrado, blanco) además de las capas de punto y nombre ya existentes.
  - El radio y el color de cada pin ahora dependen de `dia` (16 px si lo hay) y `seguido` (7 px sin día, con el naranja y el aro), no de `destacado`: la prop `destacados` del componente se quitó, y en su lugar `seguidos?: string[]` decide el resalte (sin sesión, llega vacío).
  - **El encuadre de «todos los lugares al abrir» ya no lo decide el mapa por su cuenta** (antes: `fitBounds` sobre el array completo la primera vez que había datos). Ahora ese cálculo vive en quien llama (`lugaresEncuadreInicial`) y llega por el prop `encuadre`, ya usado para la búsqueda; le añadí un flag `paraBusqueda?: boolean` para diferenciar el relleno de arriba (más aire cuando hay una lista de resultados encima) del encuadre inicial o de «cercanos».
  - **El punto azul de ubicación ya no centra el mapa por su cuenta** (antes: `flyTo` fijo a zoom 14 cada vez que cambiaba `ubicacion`). Ahora solo dibuja el marcador; la cámara la decide `encuadre` (persona + los cinco lugares más cercanos), calculado por quien llama.
- **`src/components/ui/useAltoHoja.ts` (nuevo):** mide el alto real de la hoja abierta (`ui/Hoja`, que pinta en un portal al final del `body`) subiendo por el DOM real con `closest('[role="dialog"]')` desde un `ref` puesto en un hijo de la hoja, y lo publica en `--alto-hoja`. Mismo patrón que `useAltoBarraFija` (sin prueba: es un hook de DOM puro, como su hermano).
- **`src/app/lugares/VistaLugares.tsx` y `lugares.module.css`:**
  - Botón de ubicación propio (`IconoUbicacion`, 48 px redondo con borde y sombra flotante, como `.volver` de `ui/Cabecera`), abajo a la izquierda del mapa; pide la ubicación con `leerUbicacionCercana()`, calcula los cinco lugares más cercanos del tipo elegido con `ordenarLugares` y encuadra persona+cercanos; si ya hay ubicación, solo vuelve a centrar. No toca el tipo elegido (a diferencia de «Cercanos» en Lista, que sí lo suelta).
  - Con la hoja del pin abierta, el botón sube justo por encima con `--alto-hoja` menos lo que la caja del mapa ya deja libre sobre la navegación (`max(0px, var(--alto-hoja) - var(--alto-nav) - env(safe-area-inset-bottom))`), sin taparse nunca.
  - La tarjeta del pin pasa de un `<Link>` flotante a una hoja corta con `ui/Hoja`: foto, nombre, tipo (y «Destacado» si aplica), próximo evento con `textoProximoPin`, y «Ver ficha» a lo ancho (`ui/Boton`). Tocar el mapa la cierra (ya lo hacía `Hoja`); no apila historial.
  - «Cercanos» sale de las pestañas del mapa (queda solo en la vista Lista, donde ordena los renglones); la sección sigue llamándose «Lugares».
  - Encuadre inicial calculado una sola vez al montar (`useState` perezoso) con `lugaresEncuadreInicial(lugaresDelTipo, enTira, ciudad.centro)`.
- Sin migraciones: el encuadre y el resalte se resuelven con lo que ya cargaba `page.tsx` (`eventosSemana`/`conProximo` y `seguidos`), más el `titulo` añadido a la consulta de eventos.

## Evidencia

- `npm run lint && npm run typecheck && npm test` en verde (969 pruebas, incluidas las 4 nuevas de `diaPin` y `lugaresEncuadreInicial`) y `npm run build` en verde, antes y después de traer `main` (sin conflictos en el merge, salvo dos líneas de `OPEN_LOOPS.md` que se resolvieron solas).
- **Capturas del prototipo** (ya entregadas en el commit del doc, `4ffd11d`): los cuatro estados a 390×844 reales (Chrome de la Mac vía `playwright-core`, `document.fonts.check('16px "Bricolage Grotesque"')` = `true`), incluida la nueva `prototipo-seguidos--390x844.png` que muestra el Centro de las Artes (destacado, sin seguir) pintado como cualquier lugar con evento, mientras el Museo Federico Silva y el MUNI (seguidos) llevan el naranja y el aro.
- **Capturas de la app real**, con `next build && next start` contra un respaldo local (Node en el scratchpad, sin red, con los doce lugares del prototipo, sus eventos de esta semana relativos al reloj real, una sesión inventada y dos seguimientos): abrí las cuatro antes de entregarlas.
  - `app-mapa-sin-sesion--390x844.png`: botón de ubicación redondo abajo a la izquierda, sin «Cercanos» en las pestañas del mapa, «Registrar lugar» visible. **Sin token de Mapbox en este árbol** (no existe `.env`; no lo copié, según la regla): el lienzo dice «Falta el token de Mapbox» en vez de pintar el mapa — límite real del entorno, no del código. El diseño de los pines (color, aro, día) se verificó en su lugar con el prototipo (SVG, sin Mapbox) y con las pruebas unitarias de `diaPin`/`lugaresEncuadreInicial`; no pude verificarlo contra el propio Mapbox GL en esta pieza.
  - `app-mapa-con-sesion--390x844.png`: mismo estado, con el avatar de sesión arriba a la derecha; confirma que el botón de ubicación y la ausencia de «Cercanos» no dependen de la sesión.
  - `app-lista-con-sesion--390x844.png`: «Cercanos» presente en la Lista; fechas reales del respaldo («jue 24 de sep», «mañana», «hoy»); al bajar, el Museo Federico Silva y el MUNI muestran el botón «Sigues» (check verde, `aria-pressed`), confirmando que `seguidos` llega de punta a punta (sesión → `seguimientos` → `page.tsx` → `VistaLugares` → `Mapa`/`ListaLugares`).
  - `app-lista-cercanos-negado--390x844.png`: al tocar «Cercanos» sin permiso de geolocalización (Chrome headless lo niega), sale el aviso real «No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono.», el mismo camino que usa ahora el botón del mapa.
- Comparé cada estado contra el prototipo firmado (`docs/rediseno/prototipos/mapa-lugares.html`, después del cambio de seguidos) antes de dar esto por bueno.

## Límites

- **Sin token de Mapbox en este árbol de trabajo:** no pude ver el mapa real (círculos, aros, texto del día) renderizado por Mapbox GL, solo el aviso «Falta el token». El comportamiento de las capas (radio, color, aro, texto) está cubierto por: (a) el prototipo SVG actualizado, con capturas reales; (b) `diaPin`/`lugaresEncuadreInicial` con pruebas unitarias; (c) lectura del código de `agregarCapas()` en `Mapa.tsx` contra la tabla de pines del doc 35. Falta la verificación visual con Mapbox de verdad — pendiente para quien tenga el token (Vercel/`.env`) o para el founder en su iPhone.
- No pude probar el botón de ubicación pidiendo geolocalización real (el navegador de prueba la niega siempre): sí se probó el camino de «negado», que es real.
- El respaldo local no implementa el `select` embebido que usa `cargarEventosSemana` (`lugar:lugares!inner(...)`); responde vacío para esa consulta en vez de simularlo, así que la tira de «esta semana» sobre la Lista no se vio en las capturas — no afecta al mapa ni es parte de esta pieza (la función ya tolera un carril vacío por diseño).
- «Ninguno destacado + ninguno con evento esta semana → completar con cercanos hasta seis» no se probó con datos reales de producción (solo con la prueba unitaria y los doce lugares del prototipo, que ya tienen seis con evento o destacados).

## Pendiente

- Revisión del gestor; prueba del founder en su iPhone (Safari), con Mapbox real, de los cuatro estados: sin sesión, con sesión y seguidos resaltados, con ubicación, pin tocado.
- Aplicar la migración solo si el gestor decide que hace falta una consulta agregada en el servidor para el encuadre o el resalte a mayor escala (hoy se resuelve con lo que ya cargaba la página; no se creó `supabase/migrations/20260922210000_mapa_lugares_semana.sql`).
