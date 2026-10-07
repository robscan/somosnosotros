# 366 · Foto propia en el creador de cartel y siempre una opción sin imagen

**Pieza:** OL-337 (sigue a OL-324 y OL-336, bitácoras [353](353-creador-de-cartel.md) y [365](365-cartel-arreglos.md)). **Rama:** `cartel-foto-propia` (sobre `origin/main` `ce3e7f11`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV).
**Estado:** hecho y probado con la app compilada contra el respaldo local (Chrome de la Mac a 390 y 320, subida real al Storage del respaldo) y con pruebas de componentes; falta el iPhone del founder (cámara y carrete de verdad) y la vista previa de Vercel. **Sin migración.**

## Qué pidió el founder (2026-10-07, tras probar en su iPhone)

«Permite que el usuario pueda subir una imagen (foto para que se ponga en cartel); siempre incluir una opción sin imagen (cartel tipográfico)».

## Qué cambió

1. **«Usar otra foto» en «¿Cuál te gusta?»** (`FotoDelCartel.tsx`). Arriba de las cuatro opciones, con el patrón del enlace quieto del paso y la cámara delante; dice «Poner una foto» si el evento no tiene ninguna imagen. Es una etiqueta con el campo de archivo escondido (`accept="image/*"`, el `canon.salida` de la cámara del perfil): en el iPhone ofrece cámara o carrete. Con la foto puesta, el renglón cambia a su miniatura, «Tu foto» y «Quitar la foto».
   - **Sube como el cartel del alta:** `subirFoto("lugares", <quien mira>, "cartel-foto", archivo, "foto")`, o sea, bucket `fotos`, carpeta `lugares/<id>/cartel-foto-<uuid>.jpg`, reducida en el teléfono a 1600 px y JPEG, y el tope de 5 MB antes de reducir. Lo que manda la base no cambia: la RLS de Storage ya deja subir a la carpeta propia.
   - **El servidor la comprueba antes de usarla** (`comprobarFotoPropia` en `acciones.ts`). Solo responde a quien gestiona el evento. La dirección tiene que ser de la carpeta de quien mira (`esFotoPropia`: un archivo directo, sin subcarpetas, escapes ni consultas, y nunca un `cartel-generado-`). Además la baja con `traerImagen`, así que pasa por lo mismo que cualquier imagen del cartel (OL-329): bytes de JPEG, PNG o WebP, 6 MB y 12 Mpx. Bajarla ahí deja la foto en la caché del servidor; en el respaldo, las miniaturas ya no la piden otra vez (`imagen;dur=0`).
   - **Si algo falla, un aviso corto** debajo de la acción y todo sigue igual: «La foto pesa más de 5 MB. Elige otra.» o «No se pudo subir la foto. Intenta con otra.» (los de `subirFoto`), o «Esa foto no se pudo usar. Prueba con otra.».
   - **La foto va primera en los diseños.** Viaja en la URL de cada imagen del cartel (`?foto=`): las cuatro miniaturas, la vista previa, la descarga y «Usar como cartel del evento» (`usarComoCartel(…, { foto, sinFoto })`). En el servidor, `imagenesDelCartel` (`cargar.ts`) la pone delante del orden de siempre (foto del evento, portada o foto del artista, portada del lugar). Si no es de quien mira, la ignora y el cartel sale como sin ella, nunca roto. El orden de `imagenesPorOrden` no cambia.
   - **Se recuerda con lo demás.** La memoria de pantalla guarda paso, tanda, diseño, formato, título y ahora `foto`. `reponerRecordado` (`src/lib/carteles/memoria.ts`, puro) comprueba cada dato y solo repone una foto de la carpeta de quien mira: si lo guardado en la pestaña era de otra cuenta, no la usa. Por eso la foto sobrevive a «Ver otros diseños», al formato, a «Acortar título» y a volver a la pantalla. «Quitar la foto» vuelve al orden de siempre.
   - **Si el evento no tenía ninguna imagen**, con la foto propia las tandas pasan a ser las de «hay imagen» (entra «cine a sangre» y una por tanda va sin foto). La página las manda ya calculadas (`tandasConFoto`). Si ya tenía imagen, son las mismas.
2. **Siempre una opción sin imagen** (`elegir.ts`). Sigue habiendo cuatro de familias distintas mientras se pueda, ordenadas por afinidad y con la memoria del lugar primero. Si hay imagen, una de las cuatro de cada tanda se dibuja en su versión sin foto (`Eleccion.sinFoto`, `?sinfoto=1`), donde la fecha o la letra es la imagen. Vale para las tres tandas de «Ver otros diseños». Sin ninguna imagen ya lo son todas. **Cuál es la tipográfica** (`sinFotoDe`): la de más afinidad entre las que tienen versión sin foto, con la afinidad medida sin foto (lo que corta el título sin foto cuenta en contra: `recortanSinFoto`, que ahora calcula `ofrecer`). No cuenta la primera de la tanda, que es la que mejor encaja y conserva la foto; con una foto propia recién puesta, la persona la espera ahí. Si hay empate, gana la que va antes. Solo si ninguna otra puede ir sin foto, va la primera. La miniatura sin foto lo dice al lector de pantalla («…, sin foto»).
3. **Medición** (lista cerrada de `src/lib/medir.ts`): `cartel_foto_puesta` (subió y sirve) y `cartel_foto_quitada`, sin datos: nunca el archivo, su nombre, su dirección ni el evento.
4. **«Usar como cartel del evento» con foto propia:** se guarda como hoy (`cartel-generado-<uuid>.jpg`, imagen del evento, fila en `carteles_generados`), dibujado con la misma foto (o sin ella, si se eligió la tipográfica). La foto propia subida se queda en el Storage como cualquier imagen del evento.

## Decisiones del operador (por confirmar)

1. **«Usar otra foto» arriba de la rejilla, no en el pie con «Ver otros diseños» y «No me gusta ninguno».** La foto cambia las cuatro opciones: va antes de ellas, se ve sin bajar y, puesta, su estado («Tu foto · Quitar la foto») se lee antes de los diseños. El pie se queda con las salidas (otra tanda, ninguno). Mismo enlace quieto y centrado que los del pie.
2. **La tipográfica no es nunca la primera de la tanda** (salvo que sea la única que puede ir sin foto). El encargo decía «la de más afinidad entre las sin foto»; si se aplica tal cual, casi siempre sería la primera, y justo tras poner su foto la persona vería el mejor diseño sin ella.
3. «Usar otra foto» si el evento ya tiene imagen y «Poner una foto» si no.
4. Para cambiar la foto hay que quitarla y poner otra (dos toques): con la foto puesta el renglón no ofrece «Cambiar».
5. La foto que no pasa la comprobación del servidor ya subió y **no se borra**. Lo mismo vale para la foto propia que al final no se usa (se descargó un cartel sin «Usar como cartel», o se quitó). Hoy nada se borra del bucket. Si conviene limpiarlas, la marca `cartel-foto-` del nombre permite encontrarlas: por ejemplo, borrar al quitarla o al salir del creador sin usarla, o una tarea que borre las `cartel-foto-*` de más de N días que no sean imagen de ningún evento. **No implementado: lo decide el founder.**
6. La tercera tanda puede repetir familia (doce plantillas de seis familias, como antes de esta pieza). La regla de la sin foto vale igual en ella.

## Pruebas

- `npm run lint` (solo el aviso viejo de `VisorImagen`), `npm run typecheck`, `npm test` (**3262**, 182 archivos), `npm run inventario` (sin novedades: el campo escondido usa `canon.salida` en vez de repetir el bloque de `PasoCartel`) y `npm run medir` (35 pantallas × 4 anchos, sin novedades; el creador no está en `medir`). `next build` en verde.
- **Nuevas:**
  - `elegir.test.ts`: en cinco casos (con imagen, museo, foro con memoria, plaza con seis artistas y títulos que se cortan), cada tanda tiene exactamente una sin foto, de las que pueden ir sin foto; las dos primeras tandas son de cuatro familias; «Ver otros diseños» trae las mismas tandas, vuelta incluida; la primera conserva la foto; la tipográfica es la de más afinidad, con el empate a la que va antes; lo que se corta sin foto cuenta; los casos borde de `sinFotoDe`; sin imagen, todas sin foto.
  - `fotoPropia.test.ts`: `esFotoPropia` (otra cuenta, otro bucket, otro dominio, subcarpetas, `..`, `%2e`, consultas, ocultos, `cartel-generado-`, demasiado larga); `hrefCartel` y `parametrosCartel` con `foto` y `sinfoto`; `imagenesDelCartel` (primera y sin repetir, el evento sin imágenes pasa a «hay imagen», la de otra cuenta se ignora, la tipográfica sin ninguna); al dibujar, la primera imagen que se pide es la foto propia; y la memoria de pantalla con foto (repone todo, no repone la de otra cuenta, mide la tanda con las tandas que tocan, lo viejo o roto cae a lo de siempre).
  - `medir.test.ts`: los dos eventos sin datos y que rechazan archivo, dirección o evento.
- **Componentes** (`CreadorCartel.componentes.test.mjs`, Chrome real, con las acciones y `subirFoto` como dobles): seis casos.
  1. La acción va arriba de la rejilla, con `accept="image/*"`, y una de las cuatro va sin foto.
  2. Poner la foto la sube a `lugares/<quien mira>` con el prefijo `cartel-foto`, la comprueba, mide `cartel_foto_puesta` y la lleva en las tres con foto. La foto sigue en otra tanda, en la vista previa, en historia, en la descarga y en «Usar como cartel».
  3. La opción sin foto se dibuja y se usa sin foto.
  4. Recargar repone la foto y la tanda; «Quitar la foto» la quita y lo mide.
  5. Si la foto no sirve o no sube, sale el aviso y las miniaturas no cambian.
  6. En un evento sin imagen dice «Poner una foto».

  También pasan las de `PorPasos` y `BotonDescargarCartel` (37/37 las tres).
- **App compilada contra el respaldo local** (`next build && next start`, respaldo del repo más un intermediario que contesta Storage, ya decodifica el `FormData` con que sube el navegador; sesión inventada de Ana). La subida es real: el teléfono reduce la foto, la sube al Storage del respaldo, el servidor la baja y la valida, y se dibuja. Tandas que se vieron:
  - **Taller con foto del evento.** Antes: cine-sangre · tipo-franja (sin foto) · feria-picado · deco-arco. Con la foto propia: las mismas, y las tres con foto llevan la propia. Otra tanda: cine-banda · tipo-fecha (sin foto) · feria-boleto · deco-sol. Al recargar, igual.
  - **Ecos de papel, sin ninguna imagen.** Antes: las cuatro sin foto. Con la foto propia: galería-marco · deco-arco (sin foto) · cine-sangre · tipo-franja. Al quitarla, las de antes.
  - **Un texto con nombre `.jpg`:** sale el aviso y las miniaturas no cambian.
  - Carteles de tamaño real: 120 a 156 KB, `foto` 43–62 ms y `raster` 130–163 ms.

## Capturas (`docs/rediseno/capturas-366/`)

Abiertas y miradas una por una. Las fotos están hechas aquí (degradados con sol y cerros; la «foto propia» en turquesa y rosa), sin terceros.

- `366-390-01-con-imagen-antes`: «¿Cuál te gusta?» del taller con «Usar otra foto» arriba y la foto cálida del evento en tres. La segunda (tipográfico franja) va sin foto, con la fecha girada en la franja roja.
- `366-390-02-con-foto-propia`: el renglón «Tu foto · Quitar la foto» y la foto propia en cine a sangre, feria papel picado y deco arco. La paleta sigue a la foto (azul noche y crema). Tipográfico franja sigue sin foto.
- `366-320-02-con-foto-propia`: lo mismo a 320. El renglón cabe en una línea.
- `366-390-03-otra-tanda-con-foto`: «Ver otros diseños» con la foto propia: cine banda, deco sol y feria boleto la llevan; tipográfico fecha va sin foto («9 OCT» en grande).
- `366-390-05-asi-queda-historia`: «Así queda» de cine banda en historia 9:16 con la foto propia.
- `366-390-06-sin-imagen-antes`: Ecos de papel sin ninguna imagen: «Poner una foto» y cuatro tipográficas (galería, deco con «OCT 2026», cine banda y tipográfico franja).
- `366-390-07-sin-imagen-con-foto-propia`: la foto propia en galería marco, cine a sangre y tipográfico franja; deco arco queda sin foto.
- `366-390-08-no-sirve`: tras elegir un archivo que no es imagen: «Esa foto no se pudo usar. Prueba con otra.» en rojo bajo la acción y las cuatro iguales.
- `carteles/` (JPEG de tamaño real, como se descargan, con la foto propia): `366-foto-propia-cine-sangre-4x5` (la foto a sangre, la paleta en azul noche), `366-foto-propia-deco-arco-9x16` (la foto entonada en sepia dentro del arco) y `366-foto-propia-zine-cinta-4x5` (la foto en duotono rosa con cinta y sello). Nada se encima y el sello se lee.

**Lo flojo:** entre «Usar otra foto» y la rejilla queda el aire de la columna de `PorPasos`, el mismo que separa los enlaces del pie. En la historia de cine banda queda mucho fondo vacío abajo, que es lo que tapa Instagram (como en la 353).

## Pendiente

- El iPhone del founder: la hoja de cámara o carrete, una foto HEIC de verdad (Safari la pasa a JPEG al reducirla), el aviso y «Usar como cartel» con foto propia en la vista previa de Vercel. «Usar» no se puede probar en el respaldo: en HTTP la app no acepta la URL del cartel subido, como en la 365.
- Decidir si se borran las fotos propias que no se usan (decisión 5).
