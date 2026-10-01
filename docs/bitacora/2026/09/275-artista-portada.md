# 275 · Portada de artista (OL-247)

**Fecha:** 2026-09-30 · **Rama:** `artista-portada`, desde `origin/main` · **OL:** OL-247 · **PR:** pendiente (sin unir hasta el «publica» del founder) · **Quién:** operador de la pieza.

## Pedido

Founder, probando producción tras la reestructura: «Falta componente para agregar portada de artista». La ficha de artista pintaba siempre el símbolo SN en el héroe y la tabla no tenía dónde guardar una portada.

## Qué cambió

- `supabase/migrations/20260930120000_artistas_portada.sql`: solo añade `artistas.portada text`, opcional. Las políticas son por fila, no hubo que tocarlas.
- `src/lib/artistas.ts`: `Artista.portada`, `DatosArtista.portada`, error `portada` y validación con la misma regla que la foto (`imagenPermitida`: subida propia, o URL externa solo para la administración o si ya estaba guardada, opción `portadaActual`).
- `src/app/artistas/acciones.ts`: lee y guarda `portada` al crear y editar; al editar consulta `foto, portada` para no romper fichas importadas.
- `src/app/artistas/FormularioArtista.tsx`: renglón «Portada» tras «Foto», con el mismo patrón (miniatura, «Sin portada» / «Subiendo…» / «Lista», cámara para elegir o cambiar, X para quitar, nota de error). Una sola función `subirImagen` sirve a foto y portada. La administración ve en «Más» dos campos de URL (foto y portada). No bloquea publicar.
- `src/components/CampoImagenUrl.tsx`: prop opcional `etiqueta`, para distinguir los dos campos.
- `src/app/artistas/[id]/page.tsx`: pide `portada`; la pasa a `Ficha` y a `Heroe` (con portada la enseña y el avatar sigue encima; sin ella, el símbolo SN). Open Graph y JSON-LD: portada, si no foto, si no la imagen del sitio. «Aún sin descripción, redes ni foto» ya no sale si hay portada.
- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: la Orquesta Sinfónica lleva portada (la del Teatro de la Paz, inventada).
- `src/lib/artistas.test.ts`: dos pruebas nuevas de portada y campo `portada` en los fixtures.

## Medida

- `npm run lint`, `typecheck`: verdes. `npm test`: 1652 pruebas verdes. `npm run test:componentes`: 147 verdes.
- `npm run inventario`: sin novedades.
- `npm run medir`: falló una vez en `s11-alta-artista`, de 52/52/86/86 a 60/60/94/94 nodos (profundidad igual, 9). Son los 8 nodos del renglón nuevo, el mismo coste que el renglón de la foto. Presupuesto subido con `--aceptar` en `medidas.aceptadas.json`; lo confirma el gestor. Las otras 23 pantallas, igual.

## Capturas (`docs/rediseno/capturas-275/`)

Con el respaldo local inventado (nunca producción), sesión de Ana como autora de los artistas de la prueba (cambio temporal del fixture, no incluido).

- `275-01-formulario-sin-portada.png` (390×844): Aaron Cadena. Renglones Foto y Portada con borde discontinuo, «Sin foto» y «Sin portada», cámara en cada uno.
- `275-02-formulario-con-portada.png`: Orquesta Sinfónica. Foto y Portada «Lista» con su miniatura, cámara y X.
- `275-03-ficha-con-portada.png`: el héroe enseña la cúpula del teatro y el avatar redondo con el cartel encima, título y etiqueta sobre la foto.
- `275-04-ficha-sin-portada.png`: sin portada, el símbolo SN grande como hoy, avatar SN.
- `275-05-ficha-con-portada-escritorio.png` (1280×800): la portada a la izquierda, avatar, título y KPI a la derecha, como en lugares.

## Decisiones mías, para que el founder las confirme

- Proporción de la portada: la de la ficha de lugar (la que da `Heroe`); no recorto al subir.
- Icono del renglón Portada: «encuadrar», porque no hay icono de imagen y no inventé uno.
- La URL externa para la administración sigue en «Más», ahora con dos campos con su rótulo.

## Límites

- La subida real a Storage no se probó (el respaldo local no tiene Storage); la ruta es la de siempre (`artistas/<usuario>/portada-<uuid>`) con el bucket `fotos`.
- La migración no se ha aplicado en Supabase: hay que correrla antes de unir, o guardar un artista fallará.
- Crear artista con portada nueva se valida con la misma regla de dominio; no se probó guardar contra base real.
