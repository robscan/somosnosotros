# 390 · La fila «Ahora» y las historias en Inicio (OL-359)

**Fecha:** 2026-10-09. **Rama:** `fila-ahora-historias`, base `origin/main` (`2a2256b6`, con la regla de las 3 horas de OL-358). **Operador:** Claude (agente del Gestor V).
**Estado:** código listo para revisión, **sin migración**. Lo firmado está en la bitácora [388](388-prototipo-barra-ahora.md) y en el prototipo `docs/rediseno/prototipos/barra-ahora.html`.

## Qué pidió el founder (textual)

«Bien, aprobado círculo + historias, tarjetas: título + cartel y degradado vivo. Además noté que el icono de me interesa es el mismo de artistas, hay que cambiarlo.» Después: la fila **se va al bajar**, y las tarjetas «título + cartel» son otra pieza (OL-360).

## Lo que se hizo

**La clasificación** (`src/lib/ahora.ts`, lógica pura con pruebas). Sale de la agenda que Inicio ya carga, sin consulta nueva. Un componente de servidor (`inicio/CarrilAhora.tsx`) espera esa misma agenda y manda al teléfono solo los candidatos de los próximos dos días (`candidatosAhora`): cada día de un evento (`ocurrenciasDe`), las exposiciones que inauguran o cierran en esos días, y nunca el festival entero (sus actos sí). El teléfono los ordena cada minuto (`clasificarAhora`):
1. **Ahora:** ya empezó y no terminó (`terminaDe`: con fin, su fin; sin él, 3 h después de empezar).
2. **En un rato:** empieza hoy en menos de 2 h, con la cuenta atrás («En 30 min», «En 1 h 15 min»).
3. **Exposición** que inaugura o cierra hoy: hasta el cierre de su horario de hoy o, sin horario de hoy, hasta las 18:00.
4. **Hoy:** lo que empieza más tarde hoy.
5. **Mañana:** solo si ya no queda nada hoy o desde las 20:00.

El tope es de 8. Dentro de cada grupo se ordena por hora. Cada hora y cada día se leen en la zona del evento.

**La fila** (`inicio/FilaAhora.tsx`). Va debajo de las dos barras y antes de los carriles, en el flujo: al bajar se va.
- Cada círculo lleva el cartel recortado. Sin cartel, el degradado de una paleta propia con el símbolo SN al centro (`inicio/SimboloBlanco.tsx`, con el trazo de `lib/simboloSN.ts`).
- El anillo de «Ahora» gira con `--primario` y `--destacado`. El de «En un rato» y el de las exposiciones es oscuro (`--texto`), y el de lo demás gris (`--borde`).
- El anillo se apaga al ver la historia. Lo visto se recuerda en `sessionStorage`.
- Debajo dice «Ahora», «En 30 min», «Último día», «20:00» o «Mañana 09:00».
- Se recalcula al minuto en punto. Sin nada que mostrar no se pinta nada, ni hueco.
- Con «Reducir movimiento» el anillo no gira.
- Ningún color nuevo: el único token nuevo es una medida, `--circulo-ahora: 72px`.

**Las historias** (`inicio/Historias.tsx`, a pantalla completa por portal en `body`):
- **Fondo:** el cartel entero sobre el degradado vivo de sus colores. Los colores se leen en el teléfono al cargar el cartel (`coloresDeImagen`, lienzo de 16×20 sobre la imagen de `next/image`, que es del mismo origen); la parte pura, `paletaDePixeles`, queda aislada en `lib/coloresCartel.ts` para OL-360. Sin cartel, la historia es tipográfica sobre una paleta propia (Cantera, Xantolo, Huasteca, Real de Catorce, Media Luna, Tangamanga) con el símbolo SN arriba.
- **Partículas:** 36, solo con la historia abierta y visible, y nunca con «Reducir movimiento».
- **Segmentos:** de 6 s. Con «Reducir movimiento» no avanzan solos.
- **Gestos de Instagram:**
  - Un toque a la derecha avanza; uno en el tercio izquierdo retrocede.
  - Mantener el dedo pausa.
  - Deslizar hacia abajo cierra; deslizar de lado cambia de historia.
  - Los arrastres terminan solo con `pointerup` y `pointercancel`, también en `window`, nunca con `pointerleave`.
  - Mientras entra o se va, la capa no recibe toques (`pointer-events: none` hasta `data-abierta`).
- **Teclado:** las flechas pasan, Espacio pausa y Escape cierra. Tab no sale de la historia (focus trap), con `aria-modal`. Al cerrar, el foco vuelve al círculo de la última historia vista.
- **No apila historial ni toca la URL:** al cerrar, Inicio está donde estaba. Mientras está abierta, la página de atrás no se desplaza (`overflow: hidden` en `html`, sin tocar su scroll).
- **Acciones:**
  - **«Ver ficha».**
  - **«Me interesa»** (con sesión): llama a `cambiarAsistencia`, como la pastilla de la ficha. Si falla, vuelve atrás y dice «No se pudo guardar». Sin sesión lleva a entrar y vuelve a la ficha con `?accion=me_interesa`.
  - **«Cómo llegar»:** solo si el sitio es público.

**«Me interesa» con el marcador.** El nuevo `IconoMarcador` (el listón de «guardar»: vacío, y relleno al marcar) sustituye a la estrella en las pastillas de la ficha (`eventos/[id]/Asistencia.tsx`), en la pestaña «Interesan» de `PestanasPersona.tsx` y en las historias. No había otro «Me interesa» con icono. La estrella se queda para Artistas e Inauguración.

## Lo que decidí yo, y por qué

- **«Cómo llegar» por nombre y dirección, no por coordenadas.** La agenda de Inicio no lee latitud ni longitud, y añadirlas cambiaría la consulta y el tipo `EventoResumen` de todas las listas. El enlace es la misma ruta de Google Maps de la ficha (`/maps/dir/?api=1&destination=`), con «sitio, dirección, ciudad». En un sitio reservado no sale (la ficha decide cuándo revelarlo). Si se quieren las coordenadas exactas, es un cambio pequeño en `cargarAgenda` para OL-360.
- **«Me interesa» sin `useAsistenciaEnLista`.** El botón de ese gancho invita a «Voy» (OL-104/106). Aquí la acción es solo «Me interesa», así que se usa la misma acción del servidor que la ficha (`cambiarAsistencia`) con un estado propio y su aviso. Igual que en la ficha, marcar «Me interesa» sobre un «Voy» lo cambia.
- **La lista se congela con la historia abierta:** el reloj de la fila no cambia el orden bajo el dedo, y vuelve a correr al cerrar.
- **El primer pintado usa la hora del servidor** (`ahoraServidor`) y, después, la del teléfono: sin desajuste al hidratar.
- **Sin esqueleto:** la fila llega con su `<Suspense fallback={null}>`. Un esqueleto sería un hueco cuando no hay nada, y la regla es no pintar hueco.
- **El cartel de la historia** va a todo lo ancho con su proporción y, si es muy alto, cabe entero (`object-fit: contain`). La primera versión, con tamaño natural, salía pequeña a 390.
- **Mañana se escribe «Mañana 09:00»:** es la hora con dos cifras de `horaCorta`, la misma de toda la app (el prototipo decía «9:00»).

## Medición

`npm run medir`: Inicio (`01-inicio` y `s01-inicio-sesion`) sube **13 nodos** en los cuatro anchos (354→367 y 356→369 sin sesión; 363→376 y 365→378 con sesión), con la profundidad igual (11). Es la fila con los dos eventos de hoy del respaldo a las 10:00 del reloj fijo: la sección y la lista (2) más unos 5 nodos y medio por círculo (`li`, botón, anillo, imagen o degradado con el símbolo, hora). El presupuesto se ajustó a mano a esas medidas en `medidas.aceptadas.json`. El canon del teclado y el de acciones sobre el teclado no aplican: no hay campos.

## Pruebas

- `src/lib/ahora.test.ts` (15): cada regla, Ahora con y sin fin (3 h), «En un rato» justo a las 2 h, Mañana antes y desde las 20:00 y nunca pasado mañana, exposiciones (último día, inaugura hoy, 18:00 sin horario y cierre de su franja), orden y tope, zona de Madrid, cuenta atrás, rótulos, anillos, candidatos (festival fuera y actos dentro, cartel solo del evento, sitio reservado sin destino, días de un taller con su parte, exposiciones lejanas fuera).
- `src/lib/coloresCartel.test.ts` (7), sobre píxeles sintéticos: azul con naranja, sepia, blanco y negro, transparentes, determinismo y paleta propia estable.
- `src/components/inicio/FilaAhora.componentes.test.mjs` (7, Chrome real):
  - Los anillos en orden; sin nada, la fila no se pinta.
  - Abrir con un toque; derecha, izquierda y flechas; Escape, con el foco de vuelta y los anillos apagados en `sessionStorage`.
  - Cartel y tipográfica con el símbolo SN; sin partículas con «Reducir movimiento»; deslizar abajo cierra y suelta el `overflow`.
  - Mantener pausa y soltar sigue; tocar en la última vuelve a Inicio.
  - «Me interesa» con un toque real (`elementFromPoint` confirma qué hay bajo el dedo), marcador relleno, sin pasar de historia, y un fallo que vuelve atrás.
  - «Ver ficha» y «Cómo llegar», y sin «Cómo llegar» si no hay sitio público.
  - Sin sesión, a entrar con la acción.
  - Tab no sale.

## Prueba con toques reales (navegador integrado, 390×844)

Contra `next dev` y el respaldo local (`scripts/ops/auditoria-ui/respaldo-local`), con cinco eventos de hoy relativos a la hora real añadidos en el scratchpad y carteles locales del prototipo. Ninguna imagen ni dato de producción. Todo con `left_click` por coordenadas, y antes `document.elementFromPoint` en el punto:
- **Círculo:** el de Caracolas devuelve su `IMG` dentro del botón «Ahora: Presentación de Caracolas…»; abre su historia.
- **Avance:** un toque a la derecha pasa de la historia 1 a la 2 y uno a la izquierda vuelve a la 1.
- **Pausa:** mantener (eventos táctiles) la detiene y al soltar sigue en la misma.
- **Cerrar:** deslizar hacia abajo cierra y el foco vuelve al círculo de Caracolas.
- **Acciones:** los centros de «Cerrar», «Ver ficha», «Me interesa» y «Cómo llegar» dan cada uno su propio botón o enlace (ningún velo encima).
- **«Me interesa»:** se marca, dice «Te interesa» y la cuenta lo guarda en el respaldo.
- **«Ver ficha»:** lleva a `/eventos/caracolas`, con el `overflow` de vuelta. El historial solo crece con la ficha: abrir la historia no añadió nada.
- **Teclado:** Mayús+Tab desde la historia da la vuelta a «Cómo llegar».
- **Un hallazgo:** un toque que llega después de que la última historia se cerró sola cae en Inicio (abrió una ficha de «Destacados»). Es lo esperado: la capa ya no está.

## Capturas

[`docs/rediseno/capturas-390/`](../../../rediseno/capturas-390/), Chrome de la Mac con playwright-core, 390×844 a 2×, con sesión (Ana, del respaldo) y sin el indicador de `next dev`. Abiertas una por una:
- `01-fila-ahora-cuatro-estados.png` — la fila corrida un poco, con los cuatro estados:
  - Caracolas, con su cartel y el anillo de «Ahora» (violeta hacia naranja).
  - La canción, ya vista: anillo gris y fino, con «Ahora» debajo.
  - DESIERTO, «En 30 min»: anillo oscuro.
  - La memoria del agua, «Último día»: anillo oscuro, degradado y símbolo SN.
  - Asoma el de las 22:27, con anillo gris.

  Debajo siguen «Tus planes» y «Seleccionados para ti».
- `02-historia-con-cartel.png` — la historia de Caracolas en pausa:
  - Arriba, los segmentos (dos vistos y el tercero empezando), «AHORA» en violeta, «Hasta 21:27 · Centro Cultural Universitario Bic…», el título en dos líneas y la ✕.
  - Al centro, el cartel entero a todo lo ancho, sobre un degradado azul y beige sacado del propio cartel, con partículas.
  - Abajo, «Ver ficha», el marcador vacío y «Cómo llegar».
- `03-historia-sin-cartel-simbolo-sn.png` — «¡Ah, qué la canción!: coro, baile y solistas», tipográfica sobre una paleta propia (rosa a granate), con el símbolo SN arriba a la derecha, «Ahora · Desde 19:37», el título a 44 px en dos líneas y el lugar. El pie oscurecido hace que el blanco se lea.
- `04-historia-pausada.png` — la misma con el dedo puesto: el cuarto segmento se quedó a la mitad. La prueba lee el `transform` de su barra, que no se movió en 1,5 s (`scaleX` 0,5). Las partículas siguen, como en el prototipo.
- `05-me-interesa-marcador.png` — Caracolas tras un toque real en «Me interesa»: el botón es blanco con el marcador relleno en violeta, encima se lee «Te interesa» y la historia no pasó de la tercera.
- `06-inicio-sin-nada-ahora.png` — el respaldo sin eventos de hoy ni de mañana: debajo de las dos barras va directo «Tus planes», sin fila ni hueco.

## Lo que quedó fuera

- Las tarjetas «título + cartel» y la persistencia de los colores del cartel con el evento: OL-360. `paletaDePixeles` ya es la función que correrá al subir el cartel.
- El orden por cercanía dentro de cada grupo (el prototipo tampoco lo tenía).
- La portada de un evento sin cartel como imagen generada (regla «sin foto: símbolo SN», generada y nunca compuesta en vivo). Aquí el círculo sin cartel es un degradado CSS con el símbolo en línea, como el anillo del prototipo. Si el founder lo quiere como imagen, entra con OL-360 (una plantilla más del creador de cartel).
- El supuesto de las exposiciones sin horario (hasta las 18:00) sigue por confirmar con el founder.

## Verificación

`npm run lint && npm run typecheck && npm test && npm run inventario && npm run medir`: ver el informe de entrega (resumen real pegado ahí).
