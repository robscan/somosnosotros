# 169 · Pincel: «Borrar la pared» fiable — la hora registrada manda, la instantánea vieja no vuelve (OL-134)

**Fecha:** 2026-09-22 · **OL:** OL-134 · **Rama:** `pincel-borrar-fiable` desde `origin/main` (`9e372b0`) · **Commit:** uno (local; el gestor sube y abre el PR). Sin migración. Sin council ni subagentes.

## Lo que dijo el founder (literal, en producción, tras #165)

«Al seleccionar borrar pared no se borra, ya se mantiene composición guardada eso mejoró.» Y después: «al entrar a pared en otro dispositivo se sigue viendo lo pintado». Escenario exacto (gestor): mismo dispositivo, cuenta admin: proyectó la pared, navegó atrás a Administración, recargó (vio la miniatura), tocó «Borrar la pared», confirmó, le dijo «hecho»; al volver a entrar a la pared seguía la pintura.

## Causa (reproducida con el respaldo local y el flujo real, Chrome real)

El borrado de OL-126 dependía de dos cosas a la vez: (1) que el «borrar» por el canal llegara a una pared **abierta en ese momento** (Administración lo manda después de registrar la hora en `obras_colectivas.borrado_pared_en`); (2) que al arrancar, la pared repusiera la instantánea del bucket **sin mirar** esa hora. En el flujo del founder la pared no estaba abierta al borrar (había vuelto a Administración; en el iPhone una pestaña de fondo además queda congelada y pierde el socket), así que el aviso no tuvo receptor; y al reabrirla, la instantánea vieja volvió a pintarse. Lo mismo desde otro dispositivo: misma instantánea, mismo fondo.

Reproducción antes del arreglo (script en el scratchpad de la sesión, dos pestañas contra el respaldo):

- Caso 1, las dos pestañas vivas: a la pared llega «borrar», se limpia y sube el lienzo vacío. Funcionaba.
- Caso 2, la pared cerrada al borrar y reabierta después: Administración dice «La pared quedó limpia», el respaldo registra el `borrar` sin ningún receptor, y la pared reabierta repone **48 251 píxeles pintados** con «instantánea de fondo: 50 KB». Es el bug del founder. Seis segundos después, igual.
- Caso 3, hora registrada sin aviso por el canal (el aviso se pierde): la pared no se limpia nunca.

La política de lectura no era la causa: `obras_colectivas` se lee con `es_admin()` o con lugar visible y no privado (o sin lugar) y evento visible, la misma condición con la que la pared puede abrirse; en el escenario del founder la sesión es admin y `select borrado_pared_en` devuelve la fila. El orden en Administración (registrar y luego avisar) tampoco: el aviso salía bien, solo que sin nadie escuchando.

## Arreglo en tres partes, sin migración

**(a) La acción de servidor borra la instantánea.** `borrarPared` (`acciones.ts`), tras registrar la hora, hace `storage.from("obras").remove([<id>/pared.png])` con la sesión de administración (política «obras: administración borra», el mismo patrón que `borrarObra`) y revalida la ficha: la miniatura «La pared, hasta ahora» desaparece con el archivo. Mejor esfuerzo: la hora registrada ya manda por sí sola.

**(b) La pared no repone una instantánea anterior al borrado.** Al arrancar lee a la vez `borrado_pared_en` y la lista del bucket (`list`, con `updated_at`) y solo descarga y pinta el fondo si `instantaneaVigente(subidaEn, borradoParedEn)`: subida después del borrado. Si hay borrado y no hay hora de subida legible, no se repone. El último borrado registrado queda como «ya aplicado» (el lienzo arranca limpio). La miniatura de Administración (`cargarInstantanea`) sigue la misma regla. Cubre el hueco entre registrar y borrar el archivo, y una subida tardía de otra pared abierta.

**(c) La pared no depende del aviso.** Una sola función `revisarBorrado(origen)` consulta `borrado_pared_en` (una fila) y, si `hayBorradoPendiente(registrado, ultimoAplicado)` — más reciente que el último aplicado —, limpia el lienzo, lo anota en la sonda como «borrar (canal | visible | revisión)» y sube el lienzo vacío. La llaman el «borrar» del canal (que ahora solo adelanta la revisión), `visibilitychange` al volver a ser visible (pestaña congelada en iOS, cañón apagado) y la revisión periódica de cada 5 s (`REVISAR_BORRADO_MS`, el mismo tic que ya revisaba la instantánea: primero el borrado, después la subida, para no subir la pintura vieja). Desaparece la ventana de un minuto de OL-126 (`VENTANA_BORRADO_MS`, `borradoReciente`): la hora registrada manda; un «borrar» de un mando por su cuenta sigue sin borrar nada porque no hay hora nueva. Ninguna revisión toca el lienzo hasta que el arranque leyó borrado y fondo (`fondoListo`).

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` 80 archivos, 1021/1021 ✓ (16 pruebas nuevas: `hayBorradoPendiente`, `instantaneaVigente`, `REVISAR_BORRADO_MS`) · `npm run build` ✓.
- Chrome real (playwright-core con el Chrome de la Mac), 1280×800, respaldo local, dos pestañas, con `?sonda=1`. Los cuatro casos tras el arreglo:
  - Caso 1 (viva): «borrar (canal)», 0 píxeles, «instantánea subida (borrado): 23 KB»; la miniatura de Administración desaparece al instante y, tras recargar, vuelve **vacía** (la pared viva subió el lienzo en blanco).
  - Caso 2 (el del founder): la pared reabierta arranca con **0 píxeles** y la sonda dice «sin instantánea (Administración borró la pared 5:11:43 p.m.)»; la miniatura de Administración no está, ni tras recargar.
  - Caso 3 (sin aviso): a los 6,5 s la pared está en 0 píxeles con «borrar (revisión) de admin».
  - Caso 4 (instantánea vieja todavía en el bucket, borrado 2 s posterior): 0 píxeles y «instantánea anterior al borrado (subida 5:12:03 p.m., borrado 5:12:05 p.m.): no se repone».

### Capturas reales (`docs/rediseno/capturas-169/`), abiertas y descritas

- `01-pared-antes-de-borrar.png`: la pared con un trazo negro en zigzag y una franja naranja de aire; la sonda dice «instantánea subida (periodica): 50 KB».
- `02-pared-viva-tras-borrar.png`: la misma pared, en blanco, con el punto naranja del mando; la sonda: «instantánea subida (borrado): 23 KB · último borrar (canal) de 11111111 · dibujo 4 ms».
- `03-pared-reabierta-borrada-con-la-pared-cerrada.png`: el caso del founder tras el arreglo — la pared reabierta, en blanco; la sonda: «sin instantánea (Administración borró la pared 5:11:43 p.m.)».
- `04-pared-sin-aviso-se-limpia-en-la-revision.png`: pared en blanco; la sonda: «último borrar (revisión) de admin · dibujo 6 ms» y «instantánea subida (borrado): 23 KB».
- `05-instantanea-anterior-al-borrado-no-se-repone.png`: pared en blanco; la sonda: «instantánea anterior al borrado (subida 5:12:03 p.m., borrado 5:12:05 p.m.): no se repone».
- `06-administracion-tras-borrar-sin-miniatura.png`: la ficha de la obra en Administración, página completa, con una instantánea vieja todavía en el bucket (subida 23:12:03 Z) y un borrado posterior registrado (23:12:05 Z): datos, cupo, botones y el QR con su enlace e «Imprimir», y ninguna miniatura «La pared, hasta ahora» (medido: sin `img` de instantánea; la única `figure` es la del QR).

## Límites

- La prueba es con el respaldo local (Storage y Realtime imitados) y Chrome; en producción el archivo lo borra la política «obras: administración borra» ya aplicada en OL-126 (sin migración nueva). Lo que solo puede confirmar el founder: repetir su flujo en el iPhone y en otro dispositivo.
- Una pared abierta tarda hasta 5 s en limpiarse si no le llega el aviso; si le llega, es inmediato.

## Archivos

`src/lib/pincel.ts`, `src/lib/pincel.test.ts`, `src/app/obra/[id]/pared/Pared.tsx`, `src/app/admin/obras-colectivas/acciones.ts`, `src/app/admin/obras-colectivas/consultas.ts`, `src/app/admin/obras-colectivas/[id]/BorrarPared.tsx` (comentario), `docs/rediseno/capturas-169/` (6 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
