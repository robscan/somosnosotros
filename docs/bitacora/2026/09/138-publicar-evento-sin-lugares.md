# 138 · Publicar evento en una ciudad sin lugares

**Fecha:** 2026-09-21 · **Rama:** `publicar-evento-sin-lugares` · **OL:** OL-103 · **PR:** pendiente

Encargo urgente y aparte del gestor, misma zona que OL-100 (comparte el alta de evento) pero pieza propia, con su propia rama.

## Bug del founder

«Estoy viendo Agenda/todos con ciudad de méxico activo, Al seleccionar "Publicar Evento" me abre formulario de registrar lugar.»

## Causa medida

En [`src/components/Publicar.tsx:36`](../../../src/components/Publicar.tsx): `href={hayLugares ? "/eventos/nuevo" : "/lugares/nuevo"}`. `hayLugares` salía de [`src/app/page.tsx`](../../../src/app/page.tsx) (una consulta `count` de lugares visibles de la ciudad elegida). Ciudad de México todavía no tiene lugares, así que el botón "Publicar evento" mandaba al alta de **lugar**, sin explicación.

Es una regla de cuando el alta de evento exigía un lugar ya registrado. Hoy el alta de evento admite "otro sitio" (nombre, pin en el mapa, o reservado) sin depender de que exista un lugar en el directorio — la condición quedó desactualizada.

## Qué se hizo

- `src/components/Publicar.tsx`: el botón "Publicar evento" lleva siempre a `/eventos/nuevo`. Se quitó la prop `hayLugares`.
- `src/app/page.tsx`: se quitó la consulta `count` de lugares de la ciudad (`l` en el `Promise.all` de `cargar()`) y el campo `hayLugares` de su valor de retorno — una consulta menos en cada carga de la Agenda.

## Lo comprobado del alta de evento sin ningún lugar (antes de dar el cambio por bueno)

Medido leyendo el código, sin necesidad de datos inventados en local porque el comportamiento no depende de la base sino de props ya cubiertas por el propio código:

- `nuevo/page.tsx` carga **todos** los lugares visibles, de cualquier ciudad (sin filtrar por `ciudad`, regla "el contexto ordena, no limita"). El caso de una lista de lugares literalmente vacía (`lugares={[]}`) solo se da si no hay ningún lugar visible en toda la plataforma — no es el caso real de hoy (San Luis Potosí tiene lugares), pero se comprobó igual porque es el caso límite que puede volver a darse.
- Con `lugares={[]}`, `FormularioEvento` dentro no queda en un callejón sin salida: `lugarId` empieza vacío (`lugares.length === 1` no aplica), `lugar` es `undefined`, Dónde muestra "Falta" y abre la hoja de búsqueda.
- En `HojaDondeEs.tsx`, la vista "lista" con `lugares=[]` no se queda muda: `filtrados` es `[]` y se muestra el texto "Todavía no hay lugares registrados." (línea 266) — pero los dos renglones de salida, **"Es en otro sitio"** y **"Registrar un lugar nuevo"**, están siempre presentes (líneas 273-288), sin depender de la lista de lugares.
- El camino "Es en otro sitio" resuelve Dónde con nombre + pin en el mapa (o dirección reservada), sin tocar la tabla `lugares`; `sitioListo()` no exige ningún lugar del directorio.
- La ciudad del evento sale del punto que la persona pone en el mapa (Mapbox reverse-geocoding en `cambiarOtro`/`elegirDireccion`/`elegirSugerido`, campo `otro.ciudad`), no de la ciudad que estaba elegida en el chip de la Agenda — es independiente de si esa ciudad tiene o no lugares registrados.

**Conclusión: el alta de evento funciona de punta a punta en una ciudad sin ningún lugar registrado.** No se encontró ningún otro fallo en ese recorrido; no hace falta avisar al gestor de nada adicional.

## Verificación

- `npm run lint`: en verde (1 warning preexistente y ajeno, en `docs/diseno/logotipo/iconos-sn.mjs`).
- `npm run typecheck`: en verde.
- `npm test`: 705 pruebas en verde, 7 en rojo preexistentes y ajenas (entorno sin el paquete `pg` instalado en este árbol de trabajo — el mismo caso ya anotado en OPEN_LOOPS por otra pieza).
- `npm run build`: en verde, `/` sigue como ruta dinámica (ƒ).

Sin prueba nueva dedicada: no existía ninguna prueba de `Publicar.tsx` ni de `hayLugares` antes de este cambio (es una simplificación que quita una rama de código y una consulta, no agrega comportamiento nuevo); el riesgo real —quedar en un callejón sin salida con lugares vacíos— ya estaba cubierto por cómo `HojaDondeEs` maneja una lista vacía, medido arriba. La suite completa (705 pruebas) sirve de regresión general.

## Estado

Sin push. Commit local en `publicar-evento-sin-lugares`, rama aparte de `alta-evento-lugar` (OL-100): no se mezclan documentos ni código de las dos piezas.
