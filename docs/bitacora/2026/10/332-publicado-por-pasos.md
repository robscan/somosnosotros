# 332 · «Publicado» en el alta por pasos y «Descargar el cartel»

**Pieza:** OL-304. **Rama:** `publicado-por-pasos` (sobre `origin/main` `95659d2b`; unida con `origin/main` hasta `8cc792f5`, que trajo OL-303). **Fecha:** 2026-10-05. **Operador:** Claude Fable 5.1.
**Estado:** hecho y probado en Chrome (headless) con los componentes reales y el servidor simulado, y la ruta de descarga y la ficha contra la app compilada con el respaldo local; falta el iPhone real (lista al final). Sin migraciones. Un cambio aditivo en una acción del servidor (`crearEvento`) y una ruta nueva (`/api/cartel/[id]`).

## Qué se encargó

Pieza 5 del plan de construcción de la bitácora [323](323-publicar-por-pasos.md) («5. Publicado: confirmación grande, el evento como quedó… «Compartir» y «Publicar otro»») y el pedido del founder de la quinta vuelta («ofrece opción de descargar cartel de eventos. Al final del flujo y en la ficha del evento»; sirve para llevarlo a WhatsApp o a Instagram). Hasta ahora el alta por pasos de `/nuevo/evento` terminaba como la de siempre: `crearEvento` redirigía a la ficha con `?nuevo=1`. Prototipo firmado: `docs/rediseno/prototipos/publicar-por-pasos.html` (función `publicado`, CSS `.final`, `.sello-ok`, `.tarjeta`); capturas de referencia `docs/rediseno/capturas-323/sin-16-publicado.png` y `legible-3-publicado.png`.

## Lo que hay

Archivos nuevos:
- `src/app/nuevo/evento/Publicado.tsx` y `Publicado.module.css`: el paso final (sello, «Evento publicado», la tarjeta, el pie).
- `src/components/BotonDescargarCartel.tsx`: «Descargar el cartel», con su prueba de componentes (`BotonDescargarCartel.componentes.test.mjs`).
- `src/app/api/cartel/[id]/route.ts` (+ `route.test.ts`): entrega la imagen del cartel como archivo.
- `src/lib/cartelDescarga.ts` (+ prueba): qué imagen se puede entregar y cómo se llama el archivo.
- `docs/rediseno/capturas-332/` (6 capturas).

Archivos tocados:
- `src/app/eventos/acciones.ts`: `crearEvento` lee el campo escondido `quedarse`; con `quedarse=1` devuelve `{ ok: true, id, slug, href, volver: href }` en vez de redirigir (mismo guardado, mismas validaciones, mismos avisos y la misma revalidación; sin el campo, `redirect(... ?nuevo=1)` como siempre). El tipo `ResultadoEvento` gana `slug?` y `href?`. El formulario de siempre (`FormularioEvento`) y `actualizarEvento` no se tocaron.
- `src/app/nuevo/evento/pasos.ts`: paso `publicado` (en `Paso`), acción `publicado` del reductor, `avance("publicado") = 1`, tipo `Creado` y `eventoPublicado(r, creado, …)`, que arma el `EventoAgenda` de la tarjeta con las respuestas y lo que devolvió el servidor. `usePasosEvento.ts` expone el gesto `publicado`.
- `src/app/nuevo/evento/AltaEvento.tsx`: el formulario escondido manda `quedarse`; al recibir `ok: true` guarda lo creado y pasa a `publicado`; pinta `Publicado`. Se parte en un exterior (`AltaEvento`, que lleva la «vuelta» y la lista de lugares) y un interior (`AltaPorPasos`).
- `src/lib/eventos.ts`: `compartirEvento(e, sitio)` arma `{ url, texto }` (dominio público, texto sin el enlace al final); la ficha lo usa en vez de armarlos ahí, y «Publicado» comparte exactamente lo mismo.
- `src/app/eventos/[id]/page.tsx`: cuarta acción «Cartel» (ver «Decisiones»).
- `src/app/globals.css`: un token, `--sello: 88px`.

## Cómo funciona

**Publicar.** «Publicar» manda el formulario escondido de siempre más `quedarse=1`. La guardia de salida se aparta al publicar (como antes) y no se repone. `crearEvento` publica con la misma RPC atómica y devuelve lo creado. En el cliente, la acción que recibe `useActionState` envuelve a `crearEvento`: si vuelve `ok: true`, guarda `{ id, slug }` y despacha `publicado` en el mismo lote (la tarjeta nunca se pinta sin datos). Si hay un error, nada cambia: «Revisa» con su aviso y la guardia de vuelta.

**«Publicado»** (una columna, hijos directos de `main`, igual que los demás pasos):
1. Un bloque centrado con el sello (círculo verde de 88 con la palomita; crece 200 ms con la curva de siempre y no se anima con «reducir movimiento»), el encabezado **«Evento publicado»** y, en letra suave, «Ya está en la agenda. Así lo ve la gente:». El foco va al encabezado (lo hace `PorPasos`).
2. La tarjeta: el renglón de las listas (`RenglonEvento`, con día y hora: «vie 9 de oct · 19:00», y el sitio) dentro de una caja con borde. Toda la tarjeta es un enlace a la ficha. Con cartel lleva su miniatura; sin cartel, la portada del lugar o el símbolo SN, exactamente como la agenda.
3. El pie: **«Compartir»** (primario; `BotonCompartir` con el texto de la ficha), **«Descargar el cartel»** (secundario, solo con cartel) y **«Publicar otro»** (quieto).
4. Aquí iría, en punteado, la sugerencia de la fase siguiente (exposición o festival que el cartel también anuncia): queda dicho en un comentario de `Publicado.tsx`, todavía no hay modelo de datos para publicarla.

**«Publicar otro»** vuelve a montar el alta con otra `key`: respuestas, cartel subido, errores y la clave de operación de la publicación empiezan de cero (si no, el servidor tomaría el segundo evento por el primero) y `useSalirSinPublicar` arma una guardia nueva contra el formulario vacío. Los lugares que se guardaron en el camino («Guardarlo como lugar») se conservan: viven en el componente exterior.

**«Descargar el cartel»** (`BotonDescargarCartel`): es un enlace de verdad (`<a href="/api/cartel/<id>" download>`, mejora progresiva como `BotonCalendario`) al que el script le añade el flujo: pide el cartel a la ruta, lo guarda en memoria y, si el navegador puede compartir archivos (`navigator.canShare({ files })`, el iPhone), abre la hoja del sistema con la imagen («Guardar imagen», WhatsApp, Instagram); si no, descarga el archivo con el nombre que trae la ruta. Mientras trae el cartel dice «Preparando…» (`aria-busy`); al terminar, «Cartel descargado» cuatro segundos; si la ruta falla, «No se pudo descargar» (nunca saca de la pantalla ni navega a una página de error). Cerrar la hoja de compartir sin elegir nada no es un fallo ni una descarga. Si el sistema no deja abrir la hoja (iOS pide un gesto reciente y la petición tardó), cae en la descarga. En «Publicado» el cartel se trae al montar la pantalla (`precargar`), para que el toque llegue a `share` sin esperar a la red; en la ficha no se precarga (cada precarga es una salida de Storage).

**La ruta `/api/cartel/[id]`**: busca el evento por slug y, si no aparece, por UUID (como la ficha); exige que esté visible y que no haya pasado (lo que ve cualquiera en la ficha) y que la imagen sea del Storage propio, bucket `fotos` (`cartelDescargable`: la misma frontera que `leerCartelAccion` y `optimizable`, sin querys ni escapes de ruta; una imagen de otro dominio, como las que importó el CAPO, no se pide desde el servidor); la trae con `redirect: "error"` y la transmite con su `Content-Type` y `Content-Disposition: attachment; filename="cartel-<slug>.<ext>"` (la extensión sale del tipo; solo jpeg, png, webp, gif y avif, nunca SVG). 404 si no hay nada que entregar; 502 si Storage falla. `Cache-Control: public, max-age=300, s-maxage=3600`.

**En la ficha del evento**: cuarta acción de la fila, «Cartel» (círculo con la flecha de descarga y el letrero debajo), solo si el evento tiene imagen propia descargable, se ve y no ha pasado. Dice «Preparando…», «Descargado» y «No se pudo» en su letrero corto; su nombre accesible es «Descargar el cartel».

## Maquetación

Plana: `Publicado` aporta tres hijos directos de la columna de `PorPasos` (el bloque de la confirmación, la lista de la tarjeta y el pie) y nada más. El bloque de la confirmación es un solo envoltorio con razón de ser: el sello, el título y su frase van juntos con menos aire (`--espacio-3`) que el que separa a un paso de otro (`--espacio-5`). La tarjeta es el `<li>` de siempre del renglón dentro de un `<ul>` con borde y radio; sin `:has()`, sin medidas por pantalla. El sello usa el token `--sello` y su palomita mide el 50 % (para no subir las medidas en duro del inventario).

## Decisiones del operador (las que más conviene revisar)

1. **El sello es verde (`--ok`), no del color de acción.** El encargo decía «del color de acción»; el prototipo firmado (CSS y captura) lo hace verde, y `--ok` es el color de lo ya hecho en la app («Vas», «Sigues»). Seguí lo firmado. Cambiarlo es una línea en `Publicado.module.css`.
2. **El encabezado grande es un `h2`, no un `h1`.** La barra del armazón (`ui/Barra`) siempre pinta el título de la página como `h1` y aquí sigue diciendo «Publicar»; dos `h1` serían peor. El `h2` lleva `tabIndex=-1` y `PorPasos` le da el foco al llegar, igual que a la pregunta de cualquier paso. El prototipo deja la barra sin título; en la app una barra con un `h1` vacío es un encabezado vacío para el lector de pantalla.
3. **No hay Atrás; la barra lleva la ✕.** Lo publicado no se deshace con Atrás (la pila queda solo con `publicado`). La ✕ sale como en cualquier paso: a la pantalla anterior si la hay y, si no, a «/» (la prop `salida`), sin preguntar nada (la guardia ya está apartada). Quien quiere ver el evento toca la tarjeta; quien quiere seguir, «Publicar otro».
4. **`crearEvento` devuelve también `volver: href`.** Sin eso `FormularioEvento` (`terminar(resultado.volver)`) dejaría de compilar y habría que tocarlo; así el formulario de siempre queda exactamente igual. El tipo tiene `slug?` y `href?` opcionales.
5. **«Publicar otro» es una nueva `key`, no una acción del reductor.** Reiniciar el reductor no habría limpiado el cartel que ya se subió, el error del servidor, la clave de operación ni la guardia; remontar lo hace todo. Por eso `pasos.test.ts` no prueba «reiniciar» (no hay tal acción): lo prueba una prueba de componentes (primer paso, avance 0, nada escrito, otra `operacion`, guardia armada).
6. **La tarjeta es el renglón de las listas, no la del prototipo.** El prototipo dibuja un cuadrito con el día y el mes; esa pieza no existe en la app. Usé `RenglonEvento` (con `conDia`) para que lo que se ve sea literalmente lo que verá la gente en la agenda, con su miniatura (cartel, portada del lugar o símbolo SN). La zona de las horas es la del lugar (o la inicial), la misma con que `Revisa` las muestra: un sitio «otro» en otra zona horaria saldría con la hora de la zona inicial en la tarjeta, aunque el servidor la guarda en la del punto (límite que ya tenía «Revisa»; la acción no devuelve la zona).
7. **«Cartel» es la última acción de la ficha, no la que sigue a «Compartir».** El encargo decía «junto a Compartir»; el prototipo y la bitácora 323 la ponen cuarta, después de «Cómo llegar». Seguí lo firmado.
8. **`precargar` en «Publicado» y no en la ficha.** En el iPhone `navigator.share` solo se abre si lo llama un toque reciente; esperar a la red entre el toque y `share` puede hacerlo fallar. Con el archivo ya en memoria el toque llega al instante. En la ficha no se precarga: nadie dijo que fuera a descargar y cada precarga cuesta salida de Storage (cuota agotada el 2026-10-03); allí, si `share` se rechaza por tardanza, cae en la descarga.
9. **`compartirEvento` en `lib/eventos.ts`.** Para que «Compartir» del final y el de la ficha no puedan divergir; la ficha pasa a usarlo (mismas cadenas, probado).
10. **`--sello` como token en `globals.css`.** Sin él, 88 y 44 px en duro subían `medidasEnDuro` de 343 a 347 y el inventario falla.
11. **Pruebas de componentes: un doble de `./Imagen`** (la imagen de las listas es `next/image`, que fuera de Next no corre) y la imagen `sin-foto.png` real servida por el servidor de la prueba.
12. **Aviso para quien corra las pruebas de componentes:** con `CHROME_EXECUTABLE` apuntando al Chrome de la Mac, el proceso de `node --test` no termina tras las pruebas de este archivo (el Chrome real no sale); con el Chromium de Playwright (sin `CHROME_EXECUTABLE`) termina bien. Y con `CAPTURAS` activo, el proceso tampoco terminó una vez (las capturas sí salieron): no lo investigué.

## Pruebas

- `npm test`: 2163 pruebas en 147 archivos (+25 de esta pieza: `pasos.test.ts` +7, `eventos.test.ts` +2, `guardado.test.ts` +3, `cartelDescarga.test.ts` +5, `route.test.ts` +8). Lint sin errores (el aviso de `VisorImagen.componentes.test.mjs` es anterior), typecheck, `npm run inventario` sin novedades (342, igual al aceptado).
- `test:componentes`: 402 pruebas, 0 fallos, ya con `origin/main` unido (394 antes de unirlo; las 8 de más son las de `HojaDonde` de OL-303). De esta pieza: 8 nuevas en `AltaEvento` (57 en total) y 6 nuevas en `BotonDescargarCartel`. Las de `AltaEvento` cubren: publicar manda `quedarse` y se queda en «Evento publicado» (tarjeta con enlace a la ficha por su slug, «Compartir» y «Publicar otro», sin «Descargar» sin cartel, foco en el encabezado, avance completo, sin Atrás, la guardia no pregunta ni al recargar ni con la ✕); «Compartir» manda título, cuándo y dónde y la dirección pública aparte; con cartel, miniatura y «Descargar el cartel» que entrega un archivo `image/png` a la hoja de compartir y dice «Cartel descargado»; «Publicar otro» (primer paso, nada escrito, otra clave de operación, guardia armada de nuevo); un lugar guardado se conserva; el sello crece con movimiento y nada se anima sin él; un error al publicar no llega a «Publicado»; sin desbordes, pie pegado abajo y sin toques menores de 44 a 320 y 390, sin y con cartel (título largo). Las de `BotonDescargarCartel`: con hoja de compartir (preparando, archivo con su nombre y tipo, una sola petición aunque se toque dos veces, vuelve a su texto a los 4 s), sin ella o sin compartir archivos (descarga con el nombre de la ruta), cerrar la hoja (nada se descarga) y hoja bloqueada (cae en la descarga), ruta caída (aviso y reintento), `precargar` y la ficha.
- `npm run medir`: 25 pantallas × 4 anchos, sin novedades. La ficha del evento mide 73/73/104/104 (igual que antes: en la prueba sus imágenes no son del Storage de la prueba y el botón no sale); `s15-alta-evento-pasos` mide 9/9/43/43 sin lectura de carteles (el aceptado, 14/14/48/48, es con ella activa: «bajó», no lo acepté).
- A mano contra la app compilada (`next build` verde) con el respaldo local de la auditoría y un cartel propio en «Storage»: la ficha enseña las cuatro acciones, el enlace «Cartel» descarga `cartel-concierto-de-la-orquesta-sinfonica-de-san-luis-potosi.png`; `curl` a `/api/cartel/<slug>` da 200 con `content-type: image/png`, `content-disposition: attachment` y la caché; un slug que no existe y un evento sin imagen dan 404. Sin errores de página.

## Capturas (`docs/rediseno/capturas-332/`, 390×844 a 2×; las dos de 320 miden 640 de ancho; todas abiertas y revisadas)

1. `332-01-publicado-sin-cartel`: arriba la barra con la ✕ y «Publicar» y la línea violeta de avance completa; el sello verde con la palomita blanca, «Evento publicado» en grande y en gris «Ya está en la agenda. Así lo ve la gente:»; la tarjeta con borde: el símbolo SN gris en su cuadro (el lugar no tiene foto), «Lectura en voz alta», «vie 9 de oct · 19:00» en violeta con su icono y «Teatro de la Paz»; abajo, pegados al borde, «Compartir» violeta y «Publicar otro» subrayado en gris. Igual que `sin-16-publicado` del prototipo salvo el cuadro de la fecha de la tarjeta (decisión 6) y que la barra dice «Publicar».
2. `332-02-publicado-con-cartel`: lo mismo con la miniatura del cartel (morado) en la tarjeta y, entre «Compartir» y «Publicar otro», «Descargar el cartel» secundario con su flecha.
3. `332-03-cartel-descargado`: igual, con el botón diciendo «Cartel descargado» (tras entregar el archivo a la hoja de compartir simulada).
4. `332-04-ficha-con-cartel`: la ficha del evento con el cartel de portada; los tres números (18:00, Gratis, Van) y la fila de acciones: «Compartir», «A mi calendario», «Cómo llegar» y, la cuarta, «Cartel» con la flecha de descarga, todas en una sola fila a 390. Las imágenes rotas del mapa y de la foto del artista son del respaldo sin red.
5. `332-05-publicado-320-sin-cartel` y 6. `332-06-publicado-320-con-cartel`: a 320, sin desbordes; en la 6, el título largo se corta con puntos suspensivos a dos líneas como en cualquier lista.

## Lo que falta / para las piezas siguientes

- La sugerencia en punteado (exposición, festival) y el taller: piden el modelo de datos (`investigaciones/eventos-modelo.md`).
- Llevar `/nuevo` y el «+» a este flujo, y retirar el alta de siempre (pieza 6).
- «Descargar el cartel» para carteles hechos por la plataforma (creador de cartel, fase posterior): el botón ya funciona con cualquier imagen del Storage propio.
- Evaluar con datos si la salida de Storage de las descargas pesa (caché de una hora en el CDN).

## Para probar en el iPhone

1. Con sesión, publicar un evento desde `/nuevo/evento` (sin cartel): ¿se queda en «Evento publicado», con el sello, la tarjeta bien (fecha, sitio) y «Compartir»? ¿Tocar la tarjeta abre la ficha? ¿La ✕ vuelve a donde se estaba?
2. «Compartir»: ¿abre la hoja del sistema con el título, el cuándo y dónde y el enlace?
3. Con cartel (sube uno real): «Descargar el cartel» ¿abre la hoja con la imagen —«Guardar imagen», WhatsApp, Instagram— sin demora? Si Safari la rechaza por tardanza, ¿cae en una descarga a Archivos? Cerrar la hoja sin elegir: ¿no dice «Cartel descargado»?
4. En la app de la tienda (WKWebView) lo mismo: ¿`navigator.share` con archivos funciona ahí?
5. Sin conexión justo antes de tocar «Descargar el cartel»: ¿dice «No se pudo descargar» y deja seguir?
6. «Publicar otro»: ¿vuelve al primer paso vacío? ¿Escribir algo y tocar la ✕ pregunta «¿Salir sin publicar?»? ¿El segundo evento se publica (no lo toma por el primero)?
7. La ficha de un evento con cartel: ¿se ve «Cartel» como cuarta acción sin saltar de renglón? ¿Funciona igual que en «Publicado»?
