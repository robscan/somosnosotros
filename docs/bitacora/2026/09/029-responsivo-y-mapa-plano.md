# 029 · Una columna para tablet y escritorio; mapa plano con círculos y nombre

**Fecha:** 2026-09-14 · **Rama:** trabajo sin commit sobre `main` (el founder decide el PR) · **Pieza:** OL-005 (Lugares) y maquetación

## Qué pidió el founder
1. Que el sitio, hecho para el teléfono, se vea adaptado en tablet y escritorio **sin subir el esfuerzo de mantenimiento ni generar retrabajo**.
2. Quitó el 3D del mapa en Mapbox Studio: comprobar que el cambio llega y **quitar el botón 3D/2D**.
3. Cambiar el pin por **un círculo simple** en cada lugar.
4. Poner el **nombre del lugar junto al círculo**, como hace Mapbox con sus etiquetas.

## La propuesta responsiva (aplicada)
**Una sola columna en cualquier pantalla.** No hay una maquetación de teléfono y otra de escritorio: es la misma, y lo único que cambia es cuánto aire sobra a los lados.

- En `globals.css` entran tres tokens: `--columna: 600px`, `--al-centro` (lo que sobra a cada lado, negativo en el teléfono) y `--gutter: max(20px, --al-centro)`. En un teléfono de 390 px el gutter vale 20 px, igual que hasta hoy; en un iPad o un monitor crece solo hasta centrar la columna.
- **Regla:** todo gutter horizontal de página se escribe `var(--gutter)`; los rellenos de botones y las sangrías siguen con `--espacio-N`. Se cambiaron 16 usos en 15 archivos; ninguna pantalla cambia en el teléfono (el valor es el mismo).
- **Las barras van a lo ancho; el contenido, en la columna.** Barra superior, nav inferior, barra pegajosa de las fichas, hojas inferiores y cabeceras pegajosas conservan su fondo de borde a borde, y sus hijos se alinean con la columna. El mapa de Lugares llena la pantalla; las pestañas, el botón de ubicación, el aviso y la tarjeta del lugar se alinean con la columna.
- Sin media queries de ancho, sin envoltorios nuevos, sin componentes duplicados (maquetación plana, como pide el founder). Lo único condicionado es `@media (hover: hover)`: con ratón, un renglón se resalta al pasar por encima.
- Las páginas interiores (fichas y formularios) tenían `max-width: 520px`; ahora usan la misma columna de 600 px: una sola medida para toda la app.

Por qué esto y no una nav lateral o dos columnas: cualquier segunda maquetación es una segunda cosa que mantener y que el founder tendría que firmar dos veces; la columna centrada es lo que hacen las apps de lista y agenda en escritorio y no toca ninguna decisión ya firmada.

## El mapa
- **Plano.** El estilo de la cuenta (`FLOWYA_Light`, sobre Mapbox Standard) ya trae `show3dObjects: false`, hecho por el founder en Studio. Del código salen la inclinación de 50°, la capa propia de edificios y el botón 3D/2D (`controlPerspectiva`, `agregarEdificios`, la prop `perspectiva` y su CSS).
- **Círculo y nombre como capas del mapa**, no como elementos encima: una fuente GeoJSON (`lugares`) con una capa `circle` (radio 5, relleno del color de acción con línea blanca de 1.5; el elegido crece a 8; el founder descartó el punto hueco para "sin eventos") y una capa `symbol` con el nombre debajo (13 px, halo blanco, `text-anchor: top`). Mapbox resuelve las colisiones: cuando dos nombres chocan, el de un lugar con eventos gana y el otro se esconde hasta hacer zoom.
- **Toque:** un cuadro de 36 px alrededor del dedo (`queryRenderedFeatures`) sobre círculos y nombres; gana el lugar más cercano. Con ratón, la mano sobre un lugar. Tocar fuera cierra la tarjeta, como antes.
- **Colores** leídos de las variables de diseño (`--primario`, `--fondo`, `--texto`) en tiempo de ejecución: si cambia el color de acción, cambia el mapa.
- **Fuente de los nombres:** `DIN Pro Medium` (existe en la cuenta). El estilo pide "Noto Sans" y esa familia **no existe en la cuenta de Mapbox** (404 en Regular, Medium y Bold): las etiquetas del propio mapa se pintan con la de reserva. Para el founder: en Studio, cambiar la fuente del estilo por una que exista (DIN Pro, Roboto u Open Sans) o subir Noto Sans a la cuenta.
- El estilo conserva `show3dFacades`, `show3dLandmarks` y `show3dTrees` en `true`; con el mapa plano no se ven, pero conviene apagarlos en Studio para no cargarlos.
- Lo que se pierde: los pins eran botones del DOM con `aria-label`; las capas del mapa no llegan al teclado ni al lector de pantalla. La vista Lista es el camino accesible al mismo directorio.

## Cambios técnicos
- `tsconfig.json`: `allowUmdGlobalAccess: true` y `@types/geojson` como dependencia de desarrollo (los tipos de `mapbox-gl` los necesitan para `queryRenderedFeatures`; antes no se usaban).
- `Mapa.tsx` reescrito en la parte de lugares; `Mapa.module.css` sin `.pin*` ni `.perspectiva`; `VistaLugares.tsx` sin `perspectiva`.

## Verificación
- `npm run lint` limpio · `npm run typecheck` limpio · 97 pruebas en verde · `next build` en verde.
- Mirado en el navegador sobre `next dev`: 390×844 (Agenda y Lugares con la tarjeta abierta al tocar un círculo: iguales que ayer salvo el mapa), 820×1180 (Agenda) y 1280×800 (Agenda, Lugares mapa y lista, ficha de Vértika, Artistas): columna centrada, barras a lo ancho, nav y botón flotante alineados con la columna.
- Gate del founder: en el iPhone (Safari) y en un navegador de escritorio.

## Pendiente
- Firma del founder. Si prefiere el nombre **encima** del círculo en vez de debajo, es un cambio de `text-anchor`/`text-offset` de una línea.
- En Studio: fuente del estilo (Noto Sans no existe en la cuenta) y apagar fachadas, hitos y árboles en 3D.
