# 396 · «Publicado» sin ofrecer cartel cuando ya lo hay, y con dos salidas

**Pieza:** OL-365. **Rama:** `publicado-salidas`, base `origin/main` (`4ea2d779`). **Fecha:** 2026-10-09. **Operador:** Claude (agente del gestor V). **Sin migración.**

## El pedido

Founder, 2026-10-09: «Acabo de crear un evento con cartel y al final me dice que si quiero crear un cartel. Si ya existe no debería de sugerirlo. Además debe ser claro como salir de ahí. Ahora viene compartir y crear otro. Con compartir y ver el evento está bien.»

## Qué cambió

- **`nuevo/evento/Publicado.tsx`**: «Crea su cartel» (OL-324, siempre visible desde OL-336) sale solo si el evento **no** tiene cartel propio. «Cartel propio» es `conCartel`, que el alta ya calculaba como `!!cartel.subido` (la imagen que subió la persona en el primer paso, o la del evento duplicado; nunca la portada del lugar, que solo pinta la tarjeta). Sin cartel propio sigue como en OL-336: caja en punteado sola, o línea quieta tras otra sugerencia.
- **El pie**: «Ver el evento» (principal; abre la ficha reemplazando «Publicado» en el historial, igual que el creador de carteles) y «Compartir» (secundario). Con cartel propio sigue «Descargar el cartel» («Guardar en Fotos» en la app), debajo. «Publicar otro» se quitó. Con la sugerencia de OL-323 en punteado, «Ver el evento» baja a secundario (la regla de la bitácora 323, que antes valía para «Compartir»).
- **`AltaEvento.tsx`**: sin `onOtro` ni el remontaje con `key` que lo servía; la lista de lugares guardados en el camino se conserva para ese mismo alta.
- **Edición de evento**: no tiene pantalla «Publicado» (al guardar vuelve a la ficha); nada que cambiar.
- **Altas de lugar y de artista**: las dos tenían «Publicar otro»; se quitó y, para que la salida sea clara, entra «Ver el lugar» / «Ver el artista» (secundario, abre la ficha reemplazando «Publicado») junto a «Compartir». Su sugerencia en punteado («Publicar un evento aquí», «Agrega una foto» / «Publicar una fecha») queda como estaba. `AltaLugar` y `AltaArtista` pierden el remontaje con `key`.

## Pruebas

- `AltaEvento.componentes.test.mjs`: sin cartel, «Ver el evento» (principal, a la ficha), «Compartir» secundario, ni «Publicar otro» ni descarga, y con «Crea su cartel»; con cartel propio, ni la caja ni la línea de «Crea su cartel», las mismas dos salidas y la descarga. Prueba nueva: toque real (ratón en el centro del botón, comprobado con `elementFromPoint`) sobre «Ver el evento» a 390×844, que navega a `/eventos/lectura-en-voz-alta-ab11`. «Compartir» ya se toca así en la prueba de su texto. Se quitaron las tres pruebas de «Publicar otro».
- `Sugerencias.componentes.test.mjs`: el arnés expone `window.desmontar()` (salir de «Publicado» sin navegar) en lugar de «Publicar otro» para comprobar que ignorar la sugerencia la anota; las segundas vueltas abren página nueva. H1 (con cartel leído) ya no espera «Crear su cartel». `claseCompartir` pasa a `claseVer`.
- `AltaLugar` / `AltaArtista`: «Ver el lugar» → `/lugares/lugar-nuevo`, «Ver el artista» → `/artistas/artista-nuevo`, sin «Publicar otro».

## Verificación

`npm run lint` (0 errores; 1 aviso previo en `VisorImagen`), `npm run typecheck`, `npm test` (190 archivos, 3444 pruebas), `npm run inventario` (sin novedades), `npm run medir` (37 pantallas × 4 anchos, sin novedades: «Publicado» no está entre las medidas; ningún presupuesto cambia). Componentes de las tres altas, de clases y de sugerencias: 144 pruebas, 0 fallos.

## Capturas (`docs/rediseno/capturas-396/`, 390×844 a 2×, letra Bricolage)

Salen del arnés de componentes (el alta real con su CSS en Chromium, con `CAPTURAS` y `FUENTE`); no levanté `next dev` con respaldo local: el arnés recorre la misma alta hasta «Publicado» sin servidor de datos.

- `396-01-publicado-con-cartel-antes.png`: código de `origin/main`. Evento publicado con su cartel y aun así la caja «Crea su cartel»; pie «Compartir» / «Descargar el cartel» / «Publicar otro».
- `396-02-publicado-con-cartel-despues.png`: el mismo evento: sin «Crea su cartel»; pie «Ver el evento» (morado) / «Compartir» / «Descargar el cartel».
- `396-03-publicado-sin-cartel.png`: evento sin cartel (símbolo SN): la caja «Crea su cartel» sigue; pie «Ver el evento» / «Compartir».
