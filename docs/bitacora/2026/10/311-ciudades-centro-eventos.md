# 311 · Centro de las ciudades que tienen eventos pero ningún lugar

**Pieza:** OL-283. **Rama:** `ciudades-centro-eventos`. **Fecha:** 2026-10-05.
**Estado:** candidato listo para revisión del gestor; sin PR, sin publicar y la migración NO está aplicada a ninguna base remota.

## Qué cambia

Hasta ahora una ciudad solo con eventos (p. ej. una gira con fechas en Morelia, León o Puebla) quedaba con `centroConocido: false`
y usaba el centro de San Luis como respaldo, aunque sus eventos «en otro sitio» sí tienen punto (`sitio_lat`, `sitio_lng`).
Ahora esa ciudad toma como centro el promedio de los puntos públicos de sus eventos vigentes y pasa a `centroConocido: true`
(en la hoja de ciudades se le calcula distancia y puede ser «Estás aquí»). Sin pantallas ni estilos tocados.

Reglas:

- Una ciudad con lugares sigue usando solo sus lugares (no se mezclan los puntos de eventos).
- La ciudad inicial conserva su centro fijo.
- Un evento solo aporta punto si está vigente, visible, SIN lugar (`lugar_id` nulo) y con `sitio_lat`/`sitio_lng` presentes
  y `sitio_reservado` falso. Un sitio reservado nunca aporta coordenadas (privacidad).
- Si la base aún tiene la función vieja (la migración se aplica antes del código, pero por si acaso), los campos nuevos no
  vienen y todo se comporta como hoy.

## Archivos

- `supabase/migrations/20261005130000_ciudades_centro_eventos.sql`: `create or replace function public.ciudades_agregadas(timestamptz)`.
  Misma firma, `security invoker`, `search_path = ''`, mismos permisos (revoke/grant repetidos) y comment actualizado. No toca tablas ni filas.
- `src/lib/ciudades.ts`: el tipo `Agregado` con los tres campos nuevos opcionales y el centro por ciudad (`centroDe`).
  `armarCiudades` en `src/lib/ciudad.ts` no cambia: solo se usa para el respaldo vacío.
- `src/lib/ciudades.test.ts`: seis casos nuevos.
- `supabase/tests/pg/ciudades-centro-eventos.test.mjs` (nuevo) y `ciudades-agregadas.test.mjs` (la lista exacta de campos del contrato ahora incluye los tres nuevos).

## El SQL en llano

La función ya sumaba por ciudad y zona: lugares públicos (con la suma de sus coordenadas) y eventos vigentes y visibles. Ahora, en la
mitad de los eventos, cuenta además cuántos tienen punto público y suma sus latitudes y longitudes, usando
`count(*) filter (where ...)` y `sum(...) filter (where ...)` con la condición «sin lugar, con lat y lng, no reservado». En la mitad
de los lugares esos tres números valen cero. Campos nuevos: `eventos_con_punto`, `ev_lat_suma`, `ev_lng_suma`. Los viejos
(`lugares`, `eventos`, `lat_suma`, `lng_suma`) no cambian de nombre ni de significado, así que el código desplegado hoy sigue funcionando.
La tabla ya impide coordenadas en un sitio reservado (`eventos_reservado_sin_punto_publico`); el filtro de la función es una segunda guarda.

## Pruebas

- `npm run test:db` (PostgreSQL local de control): 78 migraciones aplicadas, 1482 pruebas, 0 fallaron (antes de esta pieza, 1465 en OL-287; esta
  suma 17). Casos: vigente visible sin lugar con punto suma (3 eventos, 2 con punto, suma 40 / -200); sin punto, pasado y oculto no suman;
  reservado (con el check retirado solo dentro de la transacción) no suma; evento con lugar no suma en los campos nuevos; ciudad con lugar conserva
  sus números; corte posterior deja la gira vacía; permisos y propiedades de la función intactos; los tres roles (anon, authenticated, service_role).
- `npx vitest run src/lib/ciudades.test.ts src/lib/ciudad.test.ts`: 34 pruebas correctas (12 de ciudades, 6 nuevas): solo eventos con punto,
  promedio entre zonas, eventos sin punto, con lugares y eventos, ciudad inicial, función vieja sin campos nuevos.
- `npm run typecheck`: correcto. `npm run lint`: 0 errores, 1 aviso que ya existía (`VisorImagen.componentes.test.mjs`).

## Límites

- La migración debe aplicarse en Supabase antes de desplegar el código; no se aplicó a ninguna base remota.
- El centro de una ciudad solo de eventos es el promedio simple por evento: una gira con muchas fechas en un mismo punto pesa más; es solo un centro aproximado.
- Si luego esa ciudad recibe su primer lugar, su centro pasa a ser solo el de sus lugares (regla acordada).
- Sin captura móvil: no hay cambios de pantalla.
