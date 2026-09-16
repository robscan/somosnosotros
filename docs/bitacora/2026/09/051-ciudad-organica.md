# 051 · La ciudad se deduce de las altas: crecimiento orgánico

**Fecha:** 2026-09-16 (tarde) · **Base:** decisión del founder sobre la propuesta de la bitácora 050: "No pongamos alta de ciudad. Que se deduzca de las altas de los usuarios, pero sí se debe ver esa lista aunque solo tengamos una. Y sí se permiten altas fuera de San Luis. Que crezca la plataforma de manera orgánica." · **PR:** #60.

## La regla
1. **No hay alta de ciudad.** La ciudad de un lugar la dice Mapbox al ubicarlo (al elegir la sugerencia, al buscar la dirección o al poner el pin) y se guarda con el lugar. Un evento en otro sitio toma la ciudad de su pin; un evento en un lugar, la del lugar. Si no se supo, San Luis Potosí.
2. **Las ciudades salen de los lugares que hay.** Cada lugar suma a su ciudad (el centro del mapa es el promedio de sus lugares) y cada evento próximo también. San Luis Potosí es la inicial: siempre está y va primera. Ya no hay lista fija en `lib/ciudad.ts` (queda como reserva cuando no hay base).
3. **La lista se ve siempre**, aunque haya una sola ciudad: el chip de ciudad abre la hoja "Dónde" en la agenda y ahora también en Lugares (mapa y lista), con "58 lugares · 85 eventos" por ciudad y la frase "Registra un lugar en otra ciudad y aparecerá aquí".
4. **Curación mínima del área metropolitana**: Mapbox separa Soledad de Graciano Sánchez de la capital; para la gente son una sola ciudad, así que se unifican al guardar (`ciudadCanonica`). La tabla es corta y crece cuando haga falta.

## Qué se hizo
- `lib/ciudad.ts`: `ciudadCanonica`, `slugDeCiudad`, `armarCiudades` (pura, probada) y `ciudadPorSlug`/`ciudadPorNombre` sobre la lista que se le pase. `lib/ciudades.ts`: `cargarCiudades` desde la base (lugares visibles no privados y eventos próximos).
- Mapbox devuelve la ciudad en el contexto del resultado: `geocodificar` (sugerencias y punto → `lugarDesdePunto`) y `buscarLugares` (lugar recuperado) la traen; la recuperación pide español.
- Alta de lugar: `ciudad` viaja escondida y se valida (`validarLugar`); Dónde está y el pin la actualizan. Alta de evento: `ciudad` del pin en otro sitio (`cambiarOtro` la pide a Mapbox al poner o mover el pin); el servidor la usa si no hay lugar.
- `components/Ciudad` (chip + hoja) compartido por la agenda y Lugares; la agenda y Lugares cargan las ciudades de la base y resuelven `?ciudad=` contra ellas.
- **Una vuelta atrás al probar:** quité el filtro de país de Mapbox para "todo el mundo" y, buscando "Teatro de la Paz" desde San Luis, Mapbox puso dos teatros de Madrid antes que el de Villerías. Volvió `country: mx`: hoy se puede registrar en cualquier ciudad de México; abrir a otros países es quitar un parámetro cuando Mapbox ordene mejor o haya demanda.

## Lo que queda fuera (dicho, no hecho)
- **Artistas** siguen todos en San Luis Potosí: un artista no tiene punto del que deducir ciudad. Cuando haga falta, el alta puede tomar la ciudad en la que la persona está navegando.
- Los lugares ya registrados conservan "San Luis Potosí" (correcto: todos están ahí).

## Evidencia
- lint, typecheck y 147 pruebas en verde (2 nuevas: slugs y curación; ciudades a partir de lugares y eventos).
- Navegador integrado a 390 con usuario desechable (borrado al final): al elegir una sugerencia de Madrid el campo escondido dice "Madrid" y la dirección es la de Madrid; con el país restaurado, "Teatro de la Paz" vuelve a ser el de Villerías; la hoja "Dónde" en la agenda lista "San Luis Potosí · 58 lugares · 85 eventos"; el chip de ciudad aparece en el mapa de Lugares.

## Firma
Firmado por el founder en el iPhone (2026-09-16, tarde): "Te firmo todo".
