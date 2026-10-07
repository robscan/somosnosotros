# 368 · Las sedes de un festival se derivan de sus actos

**Pieza:** OL-339. **Rama:** `festival-sedes`, base `origin/main` (`ce3e7f11`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV).
**Estado:** hecho y probado con la app compilada contra el respaldo local (Chrome de la Mac, 390×844); falta el iPhone del founder. **Sin migración:** las sedes se calculan al leer.

## Qué pidió el founder (2026-10-07)

«Que la o las ubicaciones de un festival se alimenten de las registradas en sus eventos, se muestran todas y se actualizan cuando los eventos las cambian.» Y antes: «Hay festivales que suceden en distintos lugares; sin embargo la ficha de festival solo presenta uno; debemos presentar todos, aunque sea como listado para excluir mapa, o poner un mapa con varios pines y el listado de lugares debajo.»

## Qué cambió

- **`lib/sedesFestival.ts` (nuevo, lógica pura).** `sedesDeFestival(actos, respaldo)`: de los actos publicados, las sedes sin repetir, en el orden de su primer acto, con cuántos actos tiene cada una. Un lugar del directorio es una sede por su id (con nombre, slug, dirección y punto); un sitio fuera del directorio, por su nombre normalizado (sin acentos ni mayúsculas), tomando el punto y la dirección del primer acto que los traiga; un sitio reservado dice su nombre («… · sitio reservado») sin dirección ni punto; un acto sin sitio no es sede. Lo capturado en el festival mismo solo cuenta sin actos que digan dónde (respaldo, con 0 actos). `nombreDeSedes` («Varias sedes» con más de una, el nombre con una, null sin sedes), `VARIAS_SEDES`, `sedesParaLista` (a las listas solo viaja el nombre) y `textoActosEnSede` («3 actividades»).
- **Resuelto una vez, en `nombreSitio`** (`lib/eventos.ts`): `EventoResumen` gana `sedes?` (solo en el marco de un festival con actos que dicen dónde). Con ellas, `nombreSitio` y `sitioEnLista` dicen «Varias sedes» o el nombre de la única; sin ellas, lo de siempre. Así el renglón (`RenglonEvento`), la tarjeta de los carriles, Buscar, «Tus planes», compartir, el .ics y el cartel lo dicen igual sin resolverlo cada pantalla.
- **`lib/cargarSedes.ts` (nuevo, servidor):** `cargarActosDeMarcos` (los actos visibles de unos festivales con su sitio y su lugar anidado, una consulta, `null` si falla: cada pantalla dice lo de antes), `cargarSedes` y `conSedes` (pone las sedes en cada marco de una lista).
- **Quién las carga:** `cargarAgenda` (agenda e Inicio) usa la misma lectura que ya contaba el programa: ahora trae el sitio de cada acto y da `programa` y `sedes` de una vez (sin un viaje de más). Buscar (`accionesBuscar`, que ahora pide también `clase`) y «Tus planes»/Mi perfil (`cargarPersona`, sin pedir la clase: se pregunta por todos, solo un festival tiene actos) con `conSedes`. El .ics (`/calendario`) dice «Varias sedes» o la única con su dirección. El cartel (`carteles/cargar.ts`, campo lugar, máx. 60) dice «Varias sedes». La vista previa al compartir (`generateMetadata`) también.
- **Buscar** halla un festival por cualquiera de sus sedes (`buscarEventos` busca en sus nombres, no en «Varias sedes»).
- **La tarjeta del carril** (`destacados.ts`): el marco de un festival con sedes dice «Varias sedes · 4 actividades» (o «Teatro de la Paz · 2 actividades», o «… · 3 actividades esta semana» en «Esta semana»); sin sedes leídas, su programa como antes.
- **Ficha del festival** (`eventos/[id]/page.tsx`): los actos se piden con el punto de su lugar y de su sitio. El número «Sedes» cuenta las sedes derivadas (con respaldo: un festival sin actos con lugar dice 1). Bloque «Dónde» (`id="donde"`):
  - **Varias sedes:** el mapa con un pin por sede, encuadradas todas (`urlMapaSedes`: la misma imagen estática de Mapbox y proporción del mapa de un pin, `auto` con 40 px de aire, a lo más 25 pines); no es un enlace (no hay un destino). Debajo, un renglón por sede (`Renglon .dato`): pin, nombre y «2 actividades»; las del directorio llevan a su ficha con chevron. **«Cómo llegar»** baja a esa lista (`ui/Salto`, sin apilar historial: comprobado, el historial no crece).
  - **Una sede:** como cualquier evento (mapa con un pin que lleva a «Cómo llegar», nombre, dirección y distancia, enlace a la ficha del lugar), pero con la sede de sus actos y no lo capturado (captura 03: capturado en Aether, sus actos en el MUNI → MUNI).
  - **Sin actos:** lo capturado, como hoy (captura 04).
  - El calendario nativo del iPhone y compartir dicen lo mismo («Varias sedes» o la única).
- **`MapaFicha`** acepta `puntos` (varios pines; sin `href` pinta la imagen en una caja `role="img"`). `Ficha.module.css`: `.tarjeta ul` sin viñetas, junto a `.bloque ul` (una regla, sin bloque nuevo).

## Al día siempre

No se guarda nada derivado y no hay caché de datos de Next (`unstable_cache`/`use cache` no se usan): la ficha y las listas son dinámicas y leen los actos en cada petición. El caché del cliente (`staleTimes.dynamic: 60`) se invalida entero con cualquier `revalidatePath` de una acción (así lo hace Next 16), y editar, crear, ocultar, borrar o publicar un acto ya llaman a `revalidatePath` (editar y crear, además, la del festival). **Comprobado** contra el respaldo: se cambió en memoria el lugar del acto al aire libre al Teatro de la Paz y, al volver a leer la ficha, «Dónde» pasó de tres sedes a dos (CCUB · 2, Teatro de la Paz · 2) — captura 06.

## Decisiones (por confirmar con el founder)

1. **El mapa es la imagen estática de siempre, con varios pines**, no el mapa interactivo de Lugares que pedía el encargo: la ficha nunca cargó Mapbox GL (OL-089, imagen sin JS que sirve el caché) y meterlo solo para esto añadía el peso de la librería a cada ficha de festival y su `quitarMapa` al desmontar. La imagen ya encuadra todos los pines; cada sede se toca desde su renglón. Si el founder quiere tocar los pines, es otra pieza.
2. **Con varias sedes, «Cómo llegar» baja a la lista de sedes** (cada una lleva a su ficha con su «Cómo llegar»); el mapa no es enlace.
3. **Qué actos cuentan:** los publicados y visibles (lo que ve cualquiera), también en la ficha de quien administra el festival, aunque su programa le muestre un acto oculto.
4. **La tarjeta del carril** dice «Varias sedes · 4 actividades» en vez de «Programa registrado: 4 actividades» (bitácora 351, decisión 7: la tarjeta decía el programa porque no se sabía la sede): «Varias sedes · Programa registrado: 4…» se cortaba a 390.
5. **Sin numerar los pines:** los nombres van en la lista; numerarlos pediría un número también en cada renglón.
6. **Buscar pide ahora `clase`:** además de las sedes, una exposición o un festival en Buscar se ven como en Inicio («Hasta el …», sin «Voy»). «Tus planes» no la pide (sigue como lo dejó OL-322).
7. **Fuera:** el JSON-LD del festival sigue con lo capturado en el marco (Google pide una dirección; un festival de varias sedes sería un `location` por sede, otra pieza); «Publicado» tras el alta (el festival nuevo aún no tiene actos con sede al compartir desde ahí); los avisos y Novedades (un marco no tiene «Voy»); las fichas de lugar y de artista y el mapa de Lugares.

## Verificación

- `npm run lint`: sin errores (1 aviso previo en `VisorImagen.componentes.test.mjs`, ajeno). `npm run typecheck`: limpio.
- `npm test`: **182 archivos, 3252 pruebas, en verde**. Nuevas: `lib/sedesFestival.test.ts` (10: sin repetir y con su cuenta; directorio y sitio libre juntos por nombre normalizado, con el punto del acto que lo trae; orden del primer acto aunque lleguen desordenados; sitio reservado sin dirección ni punto; acto sin sitio; respaldo sin actos; «Varias sedes» en `nombreSitio` y `sitioEnLista`; lo que viaja a las listas; la tarjeta del carril; Buscar por sede), `lib/mapaEstatico.test.ts` (+3: varios pines con `auto`, uno solo = el de siempre, sin token o sin puntos nada, tope de 25) y `lib/cargarAgenda.test.ts` (+2: sedes de la misma lectura que el programa; actos sin sitio no ponen sedes).
- `npm run inventario`: sin novedades. `npm run medir`: **35 pantallas × 4 anchos, sin novedades** (en el respaldo del repo los actos del festival están ocultos: `s25-ficha-festival` sigue igual).
- App compilada (`next build && next start -p 3161`) contra una copia del respaldo en el scratchpad (`server.mjs 8861`): el festival de cine y tres actos visibles más un cuarto «Proyección al aire libre» en el Jardín de San Juan de Dios (sitio fuera del directorio); «Muestra de Danza Contemporánea» (capturada en Aether, sus dos actos en el MUNI) y «KOWAIFEST» (sin actos, capturado en ACHE); y una ruta `/__mover` solo en esa copia. Sin errores de página; `scrollWidth` 390. Comprobado por HTTP: el .ics del festival dice `LOCATION:Varias sedes`, el de la muestra «MUNI Museo Universitario UASLP, Av. Manuel Nava 101…», el de KOWAIFEST «ACHE Galería, …»; la descripción al compartir «viernes 16 de octubre · 19:00 · Varias sedes · Gratis»; el cartel (`/api/cartel-nuevo/…?plantilla=tipo-franja`) pinta «Varias sedes».

## Capturas (`docs/rediseno/capturas-368/`)

Chrome de la Mac, 390×844 a 2×, con la letra de la app, sesión inventada de Ana (de ahí «Publicar» en el borrador y «Agregar otra actividad»). **El mapa estático lo contesta la prueba**: un fondo liso de sustituto con un pin violeta por cada `pin-s+…(lng,lat)` de la URL que arma la app, encuadrados como `auto` con su `padding` (sin llave real de Mapbox; la base no es la de Mapbox, los pines sí son los que pide la app). Cada una abierta y mirada:

- `01-festival-arriba-kpi-sedes.png`: cabecera del festival; números «Actos 4 · Costo Gratis · Sedes 3»; «Del 16 al 18 de oct · Programa registrado: 4 actividades»; las cuatro acciones (con «Cómo llegar» activo) y el programa.
- `02-festival-varias-sedes.png`: «Dónde» con el mapa y **tres pines** (CCUB a la izquierda; el Jardín y el Teatro de la Paz, cercanos, a la derecha) y debajo «Centro Cultural Universitario Bicentenario · 2 actividades ›», «Jardín de San Juan de Dios · 1 actividad» (sin chevron: fuera del directorio) y «Teatro de la Paz · 1 actividad ›». La tarjeta termina antes de «Publicado por» y la pastilla «Me interesa» no la tapa.
- `03-festival-una-sede.png`: «Muestra de Danza Contemporánea»: «Dónde» con un pin y «MUNI Museo Universitario UASLP», su dirección y chevron (la sede de sus actos, no Aether, lo capturado).
- `04-festival-sin-actos.png`: KOWAIFEST: «Todavía no hay actividades publicadas» y «Dónde» con lo capturado: ACHE Galería, su dirección y un pin.
- `05-inicio-carril-varias-sedes.png`: Inicio, carril «Festivales y exposiciones»: «Festival de Cine de Invierno · Del 16 al 18 de oct · **Varias sedes · 4 actividades**» y «Muestra de Danza Contemporánea · Del 21 al 22 de oct · MUNI Museo Universitar…» (la segunda tarjeta asoma cortada por el borde, como siempre en un carril).
- `06-festival-tras-mover-un-acto.png`: tras mover en el respaldo el acto al aire libre al Teatro de la Paz y volver a leer la ficha: dos pines y «CCUB · 2 actividades», «Teatro de la Paz · 2 actividades».

## Pendiente

- Probar en el iPhone del founder (Safari) con un festival real de varias sedes («CINEMA: XV Festival de Cine México-Alemania», 11 actos; «Fotovision 31», 15 actos) y uno sin actos («KOWAIFEST»): mirar el encuadre real del mapa de Mapbox con sus pines.
- Las decisiones de arriba, con el founder.
