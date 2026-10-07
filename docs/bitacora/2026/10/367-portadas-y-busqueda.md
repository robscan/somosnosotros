# 367 · Portadas viejas en Buscar y festivales distinguidos en los resultados

**Pieza:** OL-338. **Rama:** `portadas-y-busqueda`, desde `origin/main` (`ce3e7f11`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV). **Sin migraciones.**
**Manda:** el founder, en su iPhone (2026-10-07): «Cuando se cambia portada de evento revisa que se actualice en listados; por ejemplo en el buscador siguen apareciendo las portadas anteriores. Además distingue festivales de eventos normales en resultados.»
**Estado:** hecho y probado con lógica pura, con los componentes reales (Chrome) y con la app compilada contra el respaldo local (390×844); falta el iPhone del founder con la vista previa de la rama.

## Cómo se reprodujo

App compilada (`next build && next start -p 3151`) contra una copia del respaldo local (`scripts/ops/auditoria-ui/respaldo-local`) en el scratchpad, con dos cambios que no van al repo: la exposición «Ecos de papel» y el «Festival de Cine de Invierno» con tres de sus actos a la vista, y una ruta `/__cambiar` que cambia un dato de una fila en memoria (como si alguien hubiera cambiado la portada). Chrome de la Mac con playwright-core, 390×844 a 2×. El recorrido: buscar «fellini», abrir «Cine de barrio: ciclo Fellini», cambiar su portada mientras se está en la ficha, Atrás, borrar el texto (Recientes), recargar `/buscar` y volver a escribir «fellini».

| Paso | Antes | Después |
| --- | --- | --- |
| 1. Buscar «fellini» | vieja (aún no cambia) | vieja (aún no cambia) |
| 2. Atrás desde la ficha (memoria de pantalla) | **vieja** | nueva |
| 3. Borrar el texto: Recientes | **vieja** | nueva |
| 4. Recargar `/buscar`: Recientes | **vieja** | nueva |
| 5. Volver a escribir «fellini» | **vieja** | nueva |

Sin errores de página en ninguna corrida.

## Las causas, con su evidencia

1. **Los Recientes guardaban la foto y nunca se ponían al día.** `guardarReciente` apunta en `localStorage` la foto, el nombre y la meta de lo que se abre desde Buscar, y la lista se pintaba tal cual para siempre (pasos 3 y 4; capturas 03 y 04). **Arreglo:** al abrir Buscar, una acción nueva, `vigentesDeRecientes` (`app/accionesBuscar.ts`), trae lo de hoy de esos cinco como mucho (tres lecturas por id, solo las de los tipos que hay, con las mismas reglas de visibilidad que la búsqueda y sin el corte de «ya pasó») y `guardarRecientesAlDia` (`lib/recientesBusqueda.ts`) los reescribe: foto, nombre, meta, lo que es y dirección (la de un lugar abierto desde Lugares sigue siendo la del mapa). El que ya no se ve (oculto o borrado) sale de la lista; si la lectura falla, nada cambia. La lista ahora se suscribe a los cambios (`suscribirseRecientes`), así se repinta sola.
2. **Una respuesta se reusaba para el mismo texto sin volver a pedirla.** La búsqueda solo se pedía si lo escrito no era lo de la última respuesta. La memoria de pantalla (`sessionStorage`) repone esa respuesta al volver de una ficha, y la respuesta se quedaba en el estado al borrar el texto: volver (paso 2, capturas 01 y 02) o escribir lo mismo otra vez (paso 5; en la corrida de antes, la memoria repuso la respuesta vieja incluso tras recargar `/buscar`) enseñaba la portada de antes. **Arreglo:** cada respuesta lleva la edición del campo en la que se pidió (`edicion`, sube con cada letra) y `pedidoDeBusqueda` (`lib/buscarUnificado.ts`) decide: otro texto, `buscar` (tras la espera de siempre); el mismo texto de otra edición (la memoria al volver, o borrar y escribir igual), `refrescar`: se ve lo que había y se pide otra vez sin espera, sin «Buscando…», sin cerrar lo desplegado y sin contarla como búsqueda nueva en la medición (OL-325).
3. **La descarga del cartel subido tenía la misma dirección después de cambiarlo.** `/api/cartel/<slug>` responde con `Cache-Control: public, max-age=300, s-maxage=3600` (una hora en el CDN de Vercel, cinco minutos en el teléfono; `app/api/cartel/[id]/route.ts`): tras «Usar como cartel» o subir otro, «Descargar el cartel» de la ficha podía bajar el anterior hasta una hora. No se pudo ver en el respaldo (la ruta solo entrega imágenes del Storage de producción); la evidencia es la cabecera y que la dirección no dependía de la imagen. **Arreglo:** `hrefCartelSubido` (`lib/cartelDescarga.ts`) le pone `?v=` con un resumen corto (FNV-1a) de la dirección de la imagen; la ficha y «Publicado» se la pasan a `BotonDescargarCartel` (`imagen`). La ruta no lee `v` y la caché se conserva (la cuota de salida del Storage es la que se agotó el 2026-10-03).

## Lo que se revisó y no era causa

- **La caché del enrutador de Next en el teléfono** (`staleTimes.dynamic: 60` y Atrás). Las dos acciones que cambian la portada (`actualizarEvento` y `usarComoCartel`) llaman a `revalidatePath`; en Next 16.3.8 una acción que revalida vacía la caché de Atrás (`invalidateBfCache`) y la de páginas ya vistas (`invalidateEntirePrefetchCache`; `node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js`, y la guía de `revalidatePath`: «it also causes all previously visited pages to refresh»). Inicio, Agenda, las fichas de lugar y de artista y Tus planes se vuelven a pedir.
- **Datos guardados en el servidor.** No hay `unstable_cache`, `"use cache"` ni `revalidateTag`; las páginas son todas dinámicas (`ƒ` en la tabla de rutas de `next build`, salvo `manifest`, `robots` y el `sitemap` de una hora). Los únicos `fetch` con `revalidate` son el de las fotos que dibuja el cartel (dirección propia de cada imagen) y el de los proveedores de entrada.
- **El optimizador de imágenes** (`/_next/image`, 30 días). Toda subida tiene nombre nuevo: `subirFoto` y «Usar como cartel» con `crypto.randomUUID()` y `upsert: false`; los scripts de fotos con el resumen del contenido (`rutaConContenido`). La dirección cambia con la imagen, y la variante también.
- **`og:image` al compartir:** sale de `e.imagen ?? lugar.portada` en cada petición y cambia de dirección con la imagen. Lo que WhatsApp ya guardó de un enlace compartido antes es suyo; no lo controla la app.
- **Tus planes** guarda en la pestaña una tarjeta mínima solo mientras el servidor no trae ese evento (OL-224); cuando lo trae, manda la del servidor.
- **El alcance de las revalidaciones** de `usarComoCartel` (la ficha, Inicio y el lugar) es más corto que el de editar (que además revalida Artistas y los artistas del evento). Hoy no importa, por lo de arriba; **por confirmar** si se unifica para cuando Next deje de vaciar toda la caché (la propia guía dice que es temporal). No se tocó.

## Festivales y exposiciones en los resultados

- La búsqueda pide la `clase` de cada evento (la agenda ya la pide; está en producción desde OL-321) y cuenta el programa de los festivales encontrados, como la agenda (una lectura más, solo si hay alguno; si falla, sin él).
- Un festival y una exposición salen con su tarjeta de siempre (`tarjetaConClase`, la de OL-342): sus días (`cuandoDeTarjeta`: «Del 16 al 18 de oct» con el fin a las 00:00 del 19 leído con `ultimoDiaDelPeriodo`; «Hasta el mar 27 de oct») y, en el festival, «Programa registrado: N actividades» en vez de la sede de su primer acto.
- En su grupo («Eventos»), el sello de siempre (`Chip` `sello`, como la novedad de un artista en su renglón) al principio de la primera línea: «Festival», «Exposición». Como mejor resultado o en Recientes, donde el renglón ya lleva su tipo delante («Evento · …»), lo que es va en ese sitio: «Festival · Del 16 al 18 de oct · …», sin sello.
- Un taller y un evento suelto, como siempre (el carril de Inicio tampoco nombra al taller). Un acto de un festival no dice de cuál es: el renglón de la agenda tampoco lo dice (lo dice el bloque).

## Decisiones por confirmar

1. **Dónde va lo que es:** sello en el grupo y, con el tipo delante (mejor resultado, Recientes), «Festival · …» en vez de «Evento · …». Alternativa: sello también ahí, junto a «Evento ·».
2. **Un reciente que ya no se ve se quita** de la lista (antes llevaba a una ficha que no abre).
3. **Poner al día no cuenta como búsqueda** en la medición `busqueda` (OL-325): ni la memoria al volver ni borrar y escribir lo mismo.
4. **Unificar las revalidaciones** de las acciones de evento (ver arriba), para cuando Next lo necesite.

## Archivos

- `src/app/accionesBuscar.ts`: columnas comunes, `clase` y programa en la búsqueda, `vigentesDeRecientes`.
- `src/lib/buscarUnificado.ts`: `CLASES_NOMBRADAS`, `metaConTipo` con la clase, `pedidoDeBusqueda`.
- `src/lib/recientesBusqueda.ts`: `clase` en el reciente, `recientesAlDia`, `guardarRecientesAlDia`, `suscribirseRecientes`.
- `src/app/buscar/BuscarPantalla.tsx`: edición del campo, refresco silencioso, recientes al día, sello.
- `src/lib/cartelDescarga.ts` (`hrefCartelSubido`), `src/components/BotonDescargarCartel.tsx` (`imagen`), `src/app/eventos/[id]/page.tsx` y `src/app/nuevo/evento/Publicado.tsx` (le pasan la imagen).

## Pruebas

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (182 archivos, 3253 pruebas en verde), `npm run inventario` (sin novedades) y `npm run medir` (35 pantallas × 4 anchos, sin novedades).
- Unitarias nuevas: `app/accionesBuscar.test.ts` (la búsqueda pide la clase; festival con «Del 15 al 18 de oct» y su programa, exposición con «Hasta el mar 27 de oct», evento y taller sin nombre; el festival sin programa si la cuenta falla; `vigentesDeRecientes` con la foto de hoy, `null` para el que no se ve, `null` entero si falla, nada que preguntar con ids que no son UUID); `lib/recientesBusqueda.test.ts` (al día, quitar, el lugar del mapa, escribir y avisar solo si cambió, `clase` legible); `lib/buscarUnificado.test.ts` (`pedidoDeBusqueda` en sus cuatro casos, `metaConTipo` con la clase); `lib/cartelDescarga.test.ts` (la dirección cambia con la imagen y es estable con la misma).
- Componentes (Chrome, `npm run test:componentes`): `BuscarPantalla` 9 de 9 (cuatro nuevas: volver con la memoria repone y vuelve a pedir sin «Buscando…»; borrar y escribir lo mismo vuelve a buscar; los recientes se ponen al día y el que ya no se ve sale; el sello del festival en su grupo y «Festival ·» como mejor resultado), `BotonDescargarCartel` y `AltaEvento` (su prueba de «Publicado» espera ahora `?v=`): 108 de 108.

## Capturas (`docs/rediseno/capturas-367/`, 390×844 a 2×)

Cada una abierta y mirada.

- `01-antes-atras-portada-vieja.png`: Buscar con «fellini» tras volver de la ficha, antes del arreglo: el renglón de «Cine de barrio: ciclo Fellini» con la foto vieja (la fachada roja de la Casa de Cultura) aunque la portada ya era otra.
- `02-despues-atras-portada-nueva.png`: lo mismo con el arreglo: el renglón con la portada nueva (el cartel morado de «OCA»), sin «Buscando…».
- `03-antes-recientes-portada-vieja.png`: el campo vacío, antes: «Recientes» con la foto vieja.
- `04-despues-recientes-portada-nueva.png`: el campo vacío, después: «Recientes» con la portada nueva; debajo, «Esta semana» como siempre.
- `05-festival-y-evento.png`: «cine»: «Mejor resultado» con «Cine de barrio: ciclo Fellini» («Evento · vie 9 de oct · 10:00 · …») y en «Eventos» la «Master Class - 9° Festival de Cine UASLP» (un evento: «jue 15 de oct · 12:00 · Centro Cultural Universit…», sin sello) y el «Festival de Cine de Invierno» con el sello **Festival** y «Del 16 al 18 de oct · Programa regis…».
- `06-exposicion-y-evento.png`: «muni»: «Ecos de papel» con el sello **Exposición** y «Hasta el mar 27 de oct · MUNI M…», y «LXS COLOCAOS: La última fogueada» sin sello («dom 11 de oct · 19:00 · MUNI…»).
- `07-festival-mejor-resultado.png`: «festival de cine de invierno»: el festival como mejor resultado con «Festival · Del 16 al 18 de oct · Programa registr…».

## Qué falta

- Probarlo en el iPhone del founder con la vista previa de la rama: cambiar la portada de un evento ya abierto desde Buscar y mirar Recientes, Atrás y la descarga del cartel.
- Las cuatro decisiones por confirmar.
