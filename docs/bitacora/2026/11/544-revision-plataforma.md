# 544 · OL-511 · Revisión completa de la plataforma · parte B: experiencia, maquetación y calidad

**Fecha:** 2026-11-09. **Rama:** `revision-plataforma` (desde `origin/main` `c57f7269`). **Quién:** operador B del Gestor de cambios IX, por el pedido del founder del 9 de noviembre («una revisión completa sobre toda la plataforma para identificar brechas de seguridad, o riesgos además de áreas de oportunidad dentro de la experiencia, la maquetación o cualquier otro elemento que identifiques»). **Solo lectura: no cambia ni una línea de código, CSS ni scripts. Sin migración.** La parte A (seguridad y riesgos) va aparte y fuera del repo; de esta parte salió **1 nota pasada a seguridad**.

## Cómo se revisó
- La app compilada contra el respaldo local (datos inventados, reloj fijo el miércoles 7 de octubre de 2026 a las 10:00), en el árbol sin `.env`, con el Chrome real de la Mac (playwright-core) a 390×844 (2×), y las principales a 768×1024 y 1280×800. Sin sesión, con la sesión inventada de Ana (y la de Marcos mirando a Ana) y como administración inventada. Toques reales por coordenadas para los recorridos (filtro, volver de una ficha, Buscar, hojas, «+» sin sesión, Atrás desde un enlace directo), estados de carga (respuestas de React retrasadas 4 s), sin conexión (contexto sin red), letra del sistema al doble (`Page.setFontSizes`).
- Producción pública **sin sesión** (somosnosotros.org), solo mirando: Inicio de San Luis, Ciudad de México y Aguascalientes, Agenda, Lugares, Artistas y Buscar. Nunca perfiles ni Administración.
- Datos de producción: consultas de solo lectura (`begin read only; … rollback;`); aquí van solo cuentas.
- `npm run inventario`, `npm run medir`, `npm run medir -- --letra=2` y `medir-tiempos.mjs --corridas=3 --sin-publicar`.
- Cada captura se abrió y se miró. Las de página completa repiten la barra inferior a media altura y no cargan las imágenes perezosas: es la forma de capturar, no la app (lo comprobé en producción bajando hasta el carril, captura 49).

## 1. Resumen

**32 hallazgos: P0 0 · P1 1 · P2 12 · P3 19.** Ninguna tarea principal quedó sin poder completarse ni se perdió lo escrito en el recorrido.

Los cinco de mayor provecho para la experiencia:
1. **B-02 · Carriles con la misma foto repetida.** En producción, los eventos sin cartel muestran la portada de su lugar: «Nuevos eventos» de San Luis enseña dos tarjetas seguidas con la misma foto del Teatro de la Paz. El 85 % de los eventos por venir de San Luis (119 de 140) no tiene cartel. *Costo: mediano (pide prototipo y firma) + la rutina de carteles para San Luis (B-26).*
2. **B-01 · Buscar no deja borrar lo escrito de un toque (P1, por confirmar).** Con texto, la única ✕ cierra Buscar; para cambiar la búsqueda hay que borrar letra por letra. Rompe «la ✕ en todo campo con texto, sobre todo buscadores»; el código lo decidió así a propósito. *Costo: chico.*
3. **B-11 · Una ciudad con lugares y casi sin eventos se ve vacía.** Aguascalientes tiene 40 lugares y 1 evento: Inicio enseña el aviso para compartir y una tarjeta, y ninguno de sus 40 lugares. *Costo: mediano, pide prototipo.*
4. **B-03 · El «Voy» sin decidir es una palomita.** En Agenda cada renglón lleva una ✓ morada aunque no vayas; el que sí vas es un círculo verde. La ✓ ya dice «hecho». *Costo: mediano, pide prototipo.*
5. **B-06 · Sin conexión no dice que es la conexión ni deja salir.** «No se pudo cargar · Suele arreglarse al intentar de nuevo», sin barra ni navegación y con la letra del sistema. *Costo: chico.*

## 2. Hallazgos

Gravedad: **P0** una tarea principal no se puede completar o se pierde lo escrito; **P1** rompe una regla del founder o estorba a diario; **P2** conviene; **P3** nota. Costo: chico (horas), mediano (un día), grande (varios días o prototipo y firma).

### Recorrido y pantallas

**B-01 · P1 (por confirmar) · provecho alto · Buscar.** Con texto escrito no hay ✕ para borrarlo: la única ✕ es «Cerrar (Inicio)», que saca de Buscar. Para buscar otra cosa hay que borrar letra por letra. Regla: la ✕ en todo campo con texto, sobre todo buscadores. Evidencia: `11-buscar-con-texto-390.png` (campo con «teatro» y solo la ✕ de cerrar; el único botón de la barra se llama «Cerrar (Inicio)»); `src/app/buscar/BuscarPantalla.tsx:205` pasa `borrar={false}` y `src/components/ui/Buscador.tsx:18` lo explica («Buscar no la lleva: junto a su campo va la de cerrar»). Por confirmar: si esa decisión fue del founder, baja a P3. Arreglo: la ✕ de borrar dentro del campo (la de `CampoBuscar`) y la salida como «Cancelar» con letra o con la flecha de Atrás, para no tener dos ✕ juntas. Costo: chico.

**B-02 · P2 · provecho alto · Inicio y Agenda (tarjetas y renglones).** Un evento sin cartel enseña la portada de su lugar; cuando dos eventos son en el mismo lugar, el carril repite la foto y parecen el mismo. Regla: UX invisible (la tarjeta debe distinguir a simple vista) y «sin foto, el símbolo SN». Evidencia: `46-prod-inicio-misma-foto-390.png` (producción, «Nuevos eventos»: «El Perra Madre…» y «La Rondalla…», la misma foto del Teatro de la Paz); `50-prod-agenda-actos-repetidos-390.png` (Agenda en producción: la foto de la Casa de Cultura en cinco renglones). Arreglo: prototipo con dos opciones sobre la tarjeta real (la portada del lugar con un sello que diga que es el lugar, o la imagen sin cartel con el símbolo SN y el color del lugar) y, sobre todo, carteles (B-26). Costo: mediano + prototipo y firma.

**B-03 · P2 · provecho medio · Agenda, Perfil, fichas de lugar y artista (renglón de evento).** El botón de «Voy» sin decidir es una ✓ morada sin fondo; decidido, un círculo verde con ✓. La ✓ suelta se lee como «ya está». Regla: iconos convencionales. Evidencia: `03-agenda-sesion-390.png` (las ✓ moradas de «Concierto…» y «Macario…», que Ana no ha marcado, y el círculo verde de «Charla…», que sí; su nombre accesible es «Ya vas — Charla…»). Arreglo: el estado sin decidir como contorno vacío (círculo o «+») y el decidido como ahora. Costo: mediano, pide prototipo.

**B-04 · P2 · provecho medio · Ficha de lugar.** Las tres tarjetas de datos de arriba salen aunque no haya dato: «Distancia –», «Eventos Ninguno», «Siguen 0». Ocupan lo primero que se ve para decir que no hay nada. Regla: lo vacío se dice, no se rellena; una cosa a la vez. Evidencia: `17-ficha-lugar-390.png` (Museo del Ferrocarril: las tres vacías); `18-ficha-lugar-768.png` (Teatro de la Paz: «Distancia –»). Arreglo: cada tarjeta solo si tiene dato (la distancia solo con ubicación concedida). Costo: chico.

**B-05 · P2 · provecho medio · Artistas (lista).** La línea «Próximo: sáb 10 de oct · 6:00 pm · Tea» se corta a media palabra y sin «…». Regla: frases llanas (un texto mocho no se entiende). Evidencia: `09-artistas-linea-cortada-390.png`; `src/components/ui/Renglon.module.css:139-140` («la línea se recorta al borde (`overflow`)»). Arreglo: el lugar del próximo evento en su propia línea o con elipsis. Costo: chico.

**B-06 · P2 · provecho medio · Sin conexión.** Sin red, navegar o recargar deja «No se pudo cargar · Suele arreglarse al intentar de nuevo» en la letra del sistema, sin barra ni navegación: no dice que falta conexión y la única salida es reintentar. Regla: UX invisible (el sistema sabe que no hay red y debe decirlo); Atrás nunca se queda sin salida. Evidencia: `32-sin-conexion-390.png`; `public/sin-conexion.html:86-87`, `src/app/error.tsx:20-21`. Arreglo: «Sin conexión» cuando `navigator.onLine` es falso, reintento solo al volver la red, y un enlace a Inicio. Costo: chico.

**B-07 · P2 · provecho medio · Espera al abrir Agenda y fichas.** Mientras llega la pantalla, Agenda enseña solo el símbolo SN al centro y una ficha una página blanca con el SN arriba, sin barra. Inicio ya tiene su esqueleto (OL-455). Regla: velocidad percibida; la barra no debe desaparecer. Evidencia: `30-cargando-agenda-390.png`, `31-cargando-ficha-390.png` (respuestas retrasadas 4 s); `src/app/eventos/loading.tsx` (solo `<Cargando />`). Arreglo: esqueleto de renglones en Agenda y de cabecera y datos en la ficha. Costo: mediano.

**B-08 · P2 · provecho medio · Agenda a 1280.** Los renglones ocupan todo el ancho: unos 1 000 px entre el título y su ✓. Regla: una cosa a la vez (el ojo pierde de qué renglón es el botón). Evidencia: `05-agenda-sesion-1280.png`. Arreglo: el ancho máximo de lectura que ya usan Lugares y la ficha. Costo: chico.

**B-09 · P3 · provecho bajo · Botones flotantes que tapan texto.** A 1280 «Me interesa · Vas» quedan sobre el texto de «Sobre el evento» (`14-ficha-evento-sesion-1280.png`); a 390 la flecha «volver arriba» tapa el nombre del último artista de Inicio (`49-prod-inicio-flotante-tapa-390.png`, «Carlos Alejandro Guevara Requena»). Arreglo: margen al final del contenido igual al alto del flotante. Costo: chico.

**B-10 · P2 · provecho medio · Mapa de Lugares.** En producción, en el centro de San Luis hay unos treinta puntos encimados: no se distinguen ni se pueden tocar uno por uno. Regla: zonas de toque de 44; el sistema hace el trabajo. Evidencia: `47-prod-lugares-puntos-encimados-390.png`. Arreglo: agrupar puntos cercanos en un círculo con el número que se abre al acercar. Costo: mediano.

**B-11 · P2 · provecho alto · Inicio de una ciudad con lugares y casi sin eventos.** Aguascalientes: 40 lugares dados de alta y 1 evento; Inicio solo enseña el aviso para compartir y una tarjeta. Los lugares no aparecen. Regla: UX invisible y «el contexto ordena, no limita». Evidencia: `48-prod-inicio-aguascalientes-390.png`; consulta: Aguascalientes 40 lugares, 0 con evento por venir en su ficha. Arreglo: carril «Lugares de la ciudad» cuando no hay eventos de la semana (y el llamado a publicar de OL-454). Costo: mediano, pide prototipo.

**B-12 · P3 · Aviso «¿Te gusta Somos Nosotrxs?» antes que el contenido.** En una ciudad sin carril destacado, lo primero que se ve es pedir que se comparta. Evidencia: `48-prod-inicio-aguascalientes-390.png`. Arreglo: el aviso siempre después del primer carril con contenido. Costo: chico.

**B-13 · P3 · Ficha de persona.** La etiqueta «VAN A LO MI…» sale cortada a 390. Evidencia: `21-ficha-persona-390.png`. Arreglo: «En común». Costo: chico.

**B-14 · P3 · «Esto ya no está».** La misma página dice «Puede que ya haya pasado, que lo hayan borrado…» para una ruta mal escrita y para «Tu año» sin eventos este año. Evidencia: `33-no-existe-390.png`; `src/components/PantallaTuAnio.tsx:16`. Arreglo: un texto propio para «Tu año» vacío. Costo: chico.

### Consistencia y accesibilidad

**B-15 · P2 · provecho medio · Letra del sistema al doble.** `npm run medir -- --letra=2` falla en 10 sitios (la CI solo corre la letra de fábrica): Novedades a 320 (un botón sale 57 px de su caja) y, en Administración, grafo, ciudades, corridas, la hoja de correr, showcase (dos a 390) e Instagram. Regla: WCAG 1.4.4, la que se midió en OL-373. Evidencia: salida de `medir --letra=2` (abajo, «Verificación»); `35-novedades-letra2-320.png`. Arreglo: arreglar los diez y sumar `--letra=2` a la CI. Costo: mediano.

**B-16 · P3 · Inicio con letra al doble.** La fila Ciudad · Cuándo · Filtros no cabe (Filtros queda fuera de vista) y las horas de las historias dicen «6:00 p…». Evidencia: `34-inicio-letra2-390.png`. Costo: chico.

**B-17 · P3 · Reducir movimiento.** Dos desplazamientos por código piden `behavior: "smooth"`, que la regla global de `globals.css:442` no alcanza: `src/components/ui/Cabecera.tsx:36` y `src/components/ui/abrirConError.ts:24`. Arreglo: `sinMovimiento()` de `lib/movimiento.ts`. Costo: chico.

**B-18 · P3 · Foto de perfil rota.** Los avatares son `<img>` sin respaldo: si la foto no carga sale el icono de imagen rota (lo provocó la foto inventada del respaldo). Evidencia: `22-perfil-390.png` (barra inferior y cabecera de Ana); `src/components/PerfilEnNav.tsx:15`, `src/app/eventos/[id]/QuienVa.tsx:79`, `src/components/FichaPersona.tsx:50`. Arreglo: `onError` al símbolo SN. Costo: chico.

### Maquetación en el código

**B-19 · P3 · `:has()` en componentes.** 21 reglas en 7 módulos de `ui/` (p. ej. `src/components/ui/Renglon.module.css:196-229`). El armazón firmado (doc 50) prohibió `:has()` en el armazón, no en componentes; se anota para que no crezca. Costo: —.

**B-20 · P3 · Inventario.** `npm run inventario` sin novedades: 148 archivos, 2 001 reglas, 328 medidas en duro aceptadas y 1 bloque duplicado. Página más larga: `src/app/eventos/[id]/page.tsx` (1 011 líneas), candidata a partirse. Costo: —.

### Velocidad percibida e imágenes

**B-21 · P2 · provecho medio · Fotos grandes como avatar.** La foto de artista (hasta 1 600 px, `src/lib/imagen.ts:22`) se sirve tal cual en avatares de unos 40 px: «Artistas» de la ficha de evento y «Mis artistas» de Perfil. Egreso de Supabase (la cuota se agotó el 3 de octubre). Evidencia: `src/app/eventos/[id]/page.tsx:176`, `src/app/perfil/MisArtistas.tsx:34`. Arreglo: el optimizador (`ui/Imagen`) con `sizes` del avatar. Costo: chico.

**B-22 · P3 · Tiempos.** `medir-tiempos` (Fast 3G, CPU ×4, 3 corridas): Inicio en frío, contenido a 2,09 s (1,79 s en la bitácora 529, +16 %), completa 5,23 s; ficha de evento 2,09 s; en caliente 0,5–0,8 s. Navegación Inicio → Administración 1,38 s. El JavaScript subió ~3 KB. Sin regresión clara; se anota la cifra. Costo: —.

### Calidad del código y pruebas que faltan

**B-23 · P3 · Una rutina sin prueba.** `src/lib/rutinas/aceptarFicha.ts` (82 líneas, la usan `lib/propuestas.ts` y `aceptarPropuesta.ts`, escribe fichas en producción) no tiene ninguna prueba. Las demás rutinas sí (propia o de lado). Costo: chico.

**B-24 · P3 · Zona horaria fija fuera de las fechas de eventos.** Las fechas de eventos ya usan la zona de cada uno (`src/lib/fechas.ts`), pero quedan fijas en `America/Mexico_City`: el mes del cupo de lectura (`src/app/eventos/estadoCartel.ts:43`), el grafo de Administración (`src/app/admin/grafo/datosDe.ts:4`) y los casos de carteles (`src/lib/carteles/casos.ts:16`). Hoy todas las zonas en la base son esa (2 716 eventos y 649 lugares). Costo: chico, cuando se abra otra zona.

**B-25 · P3 · Lint.** `npm run lint` da 2 avisos (variables sin usar en `scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs:69` y `src/components/VisorImagen.componentes.test.mjs:173`). Costo: chico.

### Datos (producción, solo cuentas)

**B-26 · P2 · provecho alto · Carteles, portadas y fotos.** Eventos por venir sin cartel: San Luis 119 de 140 (85 %), Oaxaca 38 de 47, San Miguel de Allende 13 de 68, Ciudad de México 25 de 421. Por origen: 184 de 656 de las rutinas, 11 de 22 de personas. Lugares sin portada: 545 de 649 (San Miguel 58/58, Aguascalientes 40/40, Oaxaca 83/89, Ciudad de México 295/340, San Luis 69/122). Artistas sin foto: 687 de 1 087 (y 1 000 sin portada, 449 sin descripción, 77 «por completar»). Arreglo: correr «Buscar carteles» (OL-509, gratis primero) sobre San Luis y Oaxaca. Costo: mediano.

**B-27 · P3 · Actos con el mismo nombre que su festival.** 5 actos por venir se llaman igual que su festival (uno: NAZA, 14 actividades); en Agenda se lee «NAZA» dentro de «NAZA». Evidencia: `50-prod-agenda-actos-repetidos-390.png`. Costo: chico (la rutina de agendas pone el título del acto).

**B-28 · P3 · Lo demás está limpio o casi.** 0 lugares sin coordenadas y 0 sin zona; 0 lugares repetidos por nombre en su ciudad; 1 par de eventos idénticos (pasado); 3 nombres de artista repetidos (6 fichas); 6 eventos de más de 120 días; 1 evento por venir a las 00:00; 10 por venir sin lugar; 11 títulos por venir todo en mayúsculas; 81 títulos de más de 80 caracteres (el más largo, 114) y 33 nombres de lugar de más de 50 (el más largo, 96); 0 descripciones por venir con teléfono o correo (23 entre los pasados).

### Textos

**B-29 · P3 (por confirmar) · Dominio con «o» a la vista.** Ayuda, Reglas y Privacidad escriben «somosnosotros.org/…» (`src/app/ayuda/page.tsx:48`, `src/app/reglas/page.tsx:47`, `src/app/privacidad/page.tsx:27,78`) y la imagen de «Tu año» firma `somosnosotros.org` (`src/lib/carteles/plantillas/tuAnio.tsx:33`), mientras los demás carteles usan `somosnosotrxs.org` (`src/lib/carteles/tokens.ts:60`). La regla del 21 de octubre pide la x en el dominio visible; la del 10 de octubre la dejaba solo en el cartel. Costo: chico.

**B-30 · P3 · Ayuda y Ajustes nombran cosas que no están.** Ayuda dice «toca «Publicar evento»» y el botón es un «+» sin letrero (`51-ayuda-390.png` frente a `01-inicio-sesion-390.png`); Ajustes promete el boletín «cuando exista» (`23-ajustes-390.png`). Costo: chico.

### Lo que falta para crecer

**B-31 · P3 · Mapa del sitio.** `src/app/sitemap.ts:21-25` pide 5 000 filas por tabla (hoy 1 087 artistas, 649 lugares, 678 eventos por venir) y no incluye las fichas de `/sitios/`. Costo: chico, antes de llegar al tope.

**B-32 · P3 · Ciudad nueva.** Abrir una ciudad hoy no rompe nada de fechas (las zonas viajan con cada evento), pero se ve vacía mientras no haya eventos (B-11) y sin carteles (B-26). La diferencia entre la app de la tienda y la web no se pudo ver aquí (ver «No pude revisar»).

## 3. Propuesta de piezas (en este orden)

1. **Directo, chico — «Retoques de la semana»:** B-04 (datos vacíos de la ficha de lugar), B-05 (línea cortada), B-06 (sin conexión), B-08 (ancho de Agenda en escritorio), B-09 y B-12 (flotantes y aviso de compartir), B-13, B-14, B-17, B-18, B-21 (avatares por el optimizador), B-25. Un día entre todos.
2. **Por confirmar con el founder y directo:** B-01 (la ✕ de Buscar) y B-29 (dominio con x). Horas cada uno.
3. **Datos, sin código nuevo:** B-26 y B-27: correr «Buscar carteles» sobre San Luis y Oaxaca y corregir los actos de NAZA. Lo pide el gestor a la rutina.
4. **Letra grande:** B-15 y B-16 juntos, con `--letra=2` en la CI. Un día.
5. **Prototipo y firma:** B-02 (tarjeta sin cartel), B-03 (estado del «Voy»), B-11 (Inicio de ciudad casi vacía) en un solo prototipo sobre la pantalla real; B-07 (esqueletos) y B-10 (agrupar puntos del mapa) cada uno con su captura antes/después.
6. **Notas sin pieza:** B-19, B-20, B-22, B-23, B-24, B-28, B-30, B-31, B-32.

## 4. Lo que ya estaba bien y se comprobó
- **Filtrar no es navegar:** abrir «Cuándo» en Agenda no suma historial (2 antes y 2 después) — `04-agenda-hoja-cuando-390.png`.
- **Memoria de pantalla:** Agenda bajada 1 600 px → ficha → Atrás vuelve a 1 600 px; Artistas igual (429 px).
- **Atrás nunca sin salida:** una ficha abierta desde un enlace (historial de 1) tiene «Atrás» y lleva a Inicio.
- **«+» sin sesión:** lleva a «Entra para publicar» con el alta como siguiente paso (`29-mas-sin-sesion-390.png`).
- **No quitar salidas:** la tira Evento · Lugar · Artista está en las tres altas (`26`–`28`).
- **Teclado:** `npm run medir` comprueba 16 campos en 16 pantallas con el área visible de 390×508: ninguno tapado y los botones de abajo visibles sobre el teclado.
- **Toques, desbordes y apilamiento:** `npm run medir` sin novedades en 63 pantallas × 4 anchos (320, 390, 820, 1280).
- **La ✕ en los demás campos:** todos los campos de texto de las altas, Entrar, Ajustes y Administración pasan por `ui/Campo`, `CampoLargo`, `CampoBuscar` o llevan `Limpiar`; solo Buscar la apaga (B-01).
- **Sin foto, el símbolo SN:** artistas sin foto en producción («Artistas de la semana», captura 49), ficha de artista sin portada (`19`), eventos sin imagen en Agenda (`03`).
- **Nombres accesibles:** en las 101 capturas (local y producción) no apareció un control visible sin nombre ni una imagen sin `alt` (la página declara `lang="es"`).
- **Reducir movimiento:** la regla global de `globals.css:442` y `lib/movimiento.ts` para lo que anima por código (salvo B-17).
- **Hojas:** Ciudad («Usar mi ubicación», ciudades con eventos) y Filtros («Ver 25 eventos y 2 para visitar») — `37`, `38`.
- **Administración:** portada con pendientes y números de la semana, Ciudades, bandeja, Instagram, grafo, corridas, personas, lugares, eventos, artistas, showcase a 390 y la portada a 1280 sin desbordes (`39`–`43`); una cuenta que no es admin vuelve a Inicio.
- **Textos prohibidos y lenguaje:** ni «sin fines de lucro» ni «directorio de San Luis» en `src`, `public` ni `apps`; «amigxs», «destacadxs» y «Somos Nosotrxs» en lo visto.
- **SEO:** fichas de evento, lugar y artista con `generateMetadata`, JSON-LD y Open Graph; `robots.ts` y `sitemap.ts` vigentes.
- **Pruebas:** 327 archivos y 5 200 pruebas; `fechas` y `zona` con prueba; `npm run test:db` en la CI.
- **Producción, datos:** ningún lugar sin coordenadas ni sin zona, ningún evento con fin antes del inicio.

## 5. Capturas (`docs/rediseno/capturas-544/`, 52 archivos, 5,7 MB)
Local = respaldo con datos inventados; prod = somosnosotros.org sin sesión. 390×844 salvo que diga otro ancho.

| Archivo | Qué se ve |
| --- | --- |
| 01-inicio-sesion-390 | Inicio de Ana: historias, «Seleccionados para ti», barra con «+», lupa y campana |
| 02-inicio-sin-sesion-390 | Inicio sin sesión: «Destacados», sin campana |
| 03-agenda-sesion-390 | Agenda de Ana: ✓ moradas sin decidir y el círculo verde de «Ya vas» (B-03) |
| 04-agenda-hoja-cuando-390 | Hoja «Cuándo» abierta; el historial no creció |
| 05-agenda-sesion-1280 | Agenda en escritorio: renglones a todo el ancho (B-08) |
| 06-lugares-sesion-390 | Lugares: mapa (sin estilo en local) y hoja con «10 lugares» |
| 07-lugares-sesion-1280 | Lugares en escritorio: lista a la izquierda y mapa |
| 08-artistas-sesion-390 | Artistas: tira de letras y lista (el orden lo da el respaldo local; en producción es alfabético) |
| 09-artistas-linea-cortada-390 | Acercamiento: «Próximo: … · Tea» cortado (B-05) |
| 10-buscar-vacio-390 | Buscar sin texto: ciudad y «Hoy · Fin de semana · Gratis» |
| 11-buscar-con-texto-390 | Buscar con «teatro»: sin ✕ de borrar, solo la de cerrar (B-01) |
| 12-buscar-sin-resultados-390 | «Nada con «zzqxw»» y «Registrar a «zzqxw» como artista» |
| 13-ficha-evento-sin-sesion-390 | Ficha de evento completa sin sesión (el mapa estático no carga en local) |
| 14-ficha-evento-sesion-1280 | Ficha en escritorio: «Me interesa · Vas» sobre el texto (B-09) |
| 15-ficha-festival-390 | Ficha de festival: actividades, costo, sedes, programa |
| 16-ficha-exposicion-390 | Ficha de exposición: «Hasta», horario de hoy, «Me interesa» |
| 17-ficha-lugar-390 | Ficha de lugar: «Distancia –», «Eventos Ninguno», «Siguen 0» (B-04) |
| 18-ficha-lugar-768 | Ficha de lugar a 768 con «Distancia –» |
| 19-ficha-artista-sin-foto-390 | Ficha de artista sin portada ni foto: símbolo SN |
| 20-ficha-sitio-390 | Ficha de sitio (Templo de San Francisco) |
| 21-ficha-persona-390 | Ficha de Ana vista por Marcos: «VAN A LO MI…» cortado (B-13) |
| 22-perfil-390 | Perfil de Ana: avatar roto por la foto inventada (B-18) |
| 23-ajustes-390 | Ajustes: Tu ficha, Avisos («cuando exista»), Cuenta |
| 24-novedades-390 | Novedades de Ana |
| 25-entrar-390 | Entrar con correo |
| 26-alta-evento-390 | Alta de evento: «Sube el cartel», «No tengo cartel», tira Evento · Lugar · Artista |
| 27-alta-lugar-390 | Alta de lugar: «¿Cómo se llama?» y «Falta el nombre» |
| 28-alta-artista-390 | Alta de artista: lo mismo |
| 29-mas-sin-sesion-390 | El «+» sin sesión: «Entra para publicar» |
| 30-cargando-agenda-390 | Esperando Agenda: solo el símbolo SN (B-07) |
| 31-cargando-ficha-390 | Esperando una ficha: página blanca con el SN arriba, sin barra (B-07) |
| 32-sin-conexion-390 | Sin red: «No se pudo cargar», sin navegación (B-06) |
| 33-no-existe-390 | «Esto ya no está» (B-14) |
| 34-inicio-letra2-390 | Inicio con la letra al doble: Filtros fuera de vista, «6:00 p…» (B-16) |
| 35-novedades-letra2-320 | Novedades a 320 con la letra al doble (B-15) |
| 36-ficha-evento-letra2-390 | Ficha de evento con la letra al doble |
| 37-hoja-ciudad-390 | Hoja de ciudades |
| 38-hoja-filtros-390 | Hoja de Filtros con su botón de resultado |
| 39-admin-portada-390 | Administración: pendientes y números |
| 40-admin-ciudades-390 | Administración › Ciudades |
| 41-admin-bandeja-390 | Propuestas de Oaxaca |
| 42-admin-instagram-390 | Administración › Instagram (sin conexión a Instagram en local) |
| 43-admin-portada-1280 | Administración en escritorio |
| 44-inicio-sesion-768 | Inicio a 768 |
| 45-inicio-sesion-1280 | Inicio a 1280 con el carril lateral |
| 46-prod-inicio-misma-foto-390 | Prod: «Nuevos eventos» con la misma foto dos veces (B-02) |
| 47-prod-lugares-puntos-encimados-390 | Prod: mapa de San Luis con los puntos del centro encimados (B-10) |
| 48-prod-inicio-aguascalientes-390 | Prod: Inicio de Aguascalientes, aviso de compartir y una tarjeta (B-11, B-12) |
| 49-prod-inicio-flotante-tapa-390 | Prod: «Artistas de la semana» con el SN y la flecha flotante sobre un nombre (B-09) |
| 50-prod-agenda-actos-repetidos-390 | Prod: Agenda con «NAZA» dentro de «NAZA» y la misma foto en varios renglones (B-02, B-27) |
| 51-ayuda-390 | Ayuda: «toca «Publicar evento»» (B-30) |
| 52-ajustes-cuenta-390 | Ajustes abajo: Cerrar sesión, Somos Nosotrxs, «Borrar mi cuenta» |

## 6. Lo que no pude revisar
- **El iPhone y el teclado de iOS de verdad:** todo fue Chrome de escritorio imitando un iPhone; el teclado se cubre con la comprobación de `medir` (390×508 y `visualViewport` simulado), no con Safari.
- **La app de la tienda (Capacitor) y la de Android:** no las abrí; lo que hacen distinto de la web (Fotos nativas, APNs) queda sin revisar en esta parte.
- **El mapa real:** en local el estilo es un fondo liso; el mapa de producción solo se vio en Lugares (captura 47).
- **Speed Insights (Vercel) y Search Console (Google):** viven en paneles de la cuenta del founder. Preguntas: ¿qué pantalla tiene el peor INP y el peor LCP en el percentil 75 de los últimos 28 días? ¿Cuántas fichas están «Rastreada: actualmente sin indexar» o «Descubierta: actualmente sin indexar», y hay errores de datos estructurados en Eventos?
- **Estados de error del servidor** (base caída, cuota de Supabase agotada): no se pueden provocar sin tocar el respaldo; se vio el error del cliente (B-06).
- **Lectura de cartel con la API:** no se recorrió la lectura simulada paso a paso; la cubren `capturar-cartel-leido.mjs` y la bitácora 444.

## Verificación
- `npm run lint`: 0 errores, 2 avisos (B-25). `npm run typecheck`: sin errores. `npm test`: 327 archivos, 5 200 pruebas, todas pasan.
- `npm run inventario`: sin novedades. `npm run medir`: 63 pantallas × 4 anchos en 209 s, sin novedades.
- `npm run medir -- --letra=2`: 10 fallos (B-15):
  ```
  fuera-de-la-caja · s09-novedades · p.novedades/telefono > button · 320: sale 57 px
  fuera-de-la-caja · s29-admin-grafo · Grafo/barra > Grafo/acciones · 320: 27 px
  fuera-de-la-caja · s32-admin-ciudades y s33 · admin/etiqueta.destacada · 320: 3 px
  fuera-de-la-caja · s35-admin-corridas · ciudades/credito > li · 320: 39 px
  fuera-de-la-caja · s35b-admin-ciudad-hoja · Hoja/pie > Boton/primario · 320: 13 px
  toque · s36-admin-showcase · showcase/nombre · 320: 42×218
  tapado · s37-admin-showcase-tabla · a bajo Cabecera · 320
  fuera-de-la-caja · s40-admin-showcase-por-aprobar · showcase/todas · 320 y 390: 57 px
  fuera-de-la-caja · s47-admin-instagram-hoja · ContadorCaracteres · 320: 12 px
  ```
- `git diff --stat origin/main...HEAD`: solo esta bitácora y `docs/rediseno/capturas-544/`.
- Los procesos propios (respaldo en 8844 y app en 3144) se detuvieron por su PID; el árbol no lleva `.env`.
