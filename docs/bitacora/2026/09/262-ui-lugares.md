# 262 · Lugares: la lista en la hoja inferior con la ficha dentro (OL-234, pieza P5b)

**Fecha:** 2026-09-29 · **Rama:** `ui-lugares`, desde `origin/ui-raices` (`2c70c3a9`) · **OL:** OL-234 · **PR:** #272 (sin unir; va montado sobre #271, `ui-raices`, que va sobre #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Sexta pieza del plan de OL-227 (doc 50, § 7); usa los tokens de P1, los botones de P2, el renglón de P3, el armazón de P4 y la fila de contexto de P5.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y las decisiones del founder sobre la hoja: una sola capa y una sola inercia (abre a foto y datos, crece hasta cubrir la pantalla y luego desplaza); el listado de lugares nunca se va (jalarlo lo recoge); la ficha se abre dentro de la hoja al tocar un pin o un renglón, jalarla la recoge a su cabecera y solo se cierra con la ✕; llena, la navegación se esconde y aparece Atrás; toda la información vive dentro de la hoja; la fila de contexto es ciudad · Filtros · activos (Cuándo no va); desde 792 la hoja es el panel izquierdo. Fuentes: el bloque «8. Lugares» del prototipo firmado (`generar.py`, rama `restructura-ui`) y el doc 50.

## Lo que había

- Dos vistas de Lugares (mapa y lista) con un conmutador flotante («Ver en lista» / «Ver en mapa»). La píldora tapaba renglones y sus botones: **11 accionables distintos sin su toque** a lo largo de la lista (prueba de toque; también los tapaban la tira de letras, los chips de la cabecera y la barra).
- Tres filas de cabecera (chip de fecha y ciudad, pestañas de tipo, letras) y el carril «Con eventos esta semana» (H-16); `cajaMapa` medía el alto del mapa con `--alto-cabecera` (H-14).
- Tocar un pin abría una tarjeta con «Ver ficha», y la ficha era otra página (barra Atrás · logotipo · ···) que dejaba el mapa atrás.
- El renglón de artista con la dirección postal en «Próximo:» (179,7 px).

## Lo que se hizo

### 1. La pantalla (`lugares.module.css`, `VistaLugares`)
Una rejilla de dos filas (la fila de contexto y el mapa, `minmax(0, 1fr)`): el mapa llena lo que deja la fila sin calcular su alto (H-14) y acaba donde empieza la navegación; la página no se desplaza. Sobre el mapa solo flota «Mi ubicación» (arriba a la derecha, con su aviso debajo); el logo y la atribución de Mapbox pasan arriba a la izquierda, porque abajo va la hoja. Desde 792, dos columnas: el panel de 400 y el mapa.

### 2. La hoja (`HojaLugares`, `lib/hoja`)
- **Un solo elemento** que cubre la pantalla y desplaza: un hueco transparente arriba (el mapa se ve y se toca a través de él) y el cuerpo blanco. Cada altura es una posición del desplazamiento y la inercia es la del navegador. Al soltar entre dos alturas se asienta en la más cercana (`lib/hoja.ts`, lógica pura); el asa lleva a la siguiente.
- **Alturas medidas en el DOM, no fijas.** Lista: **recogida** (el asa y la cantidad) · **asoma** (dos renglones y medio: el tercero sale cortado a propósito) · **llena**. Ficha: **recogida** (su cabecera) · **media** (foto y datos, con 80 px de lo que sigue) · **llena**. Llena, la barra de la app y la navegación se van (`pedirRecogida`, de `Armazon`) y la hoja enseña su barra de desplazamiento. Jalar hacia abajo la recoge; nunca la cierra.
- **iPhone.** Un desplazador con `pointer-events: none` no desplaza por toque (comprobado en el simulador con una página de prueba): la hoja recibe todos los toques y, para que el mapa reciba los del hueco, en reposo se recorta con `clip-path` (sin recorte mientras se mueve: llegaría tarde y cortaría el borde de arriba).
- La altura y la cabecera compacta se pintan en el DOM (`data-hoja`, `data-compacta`), no en el estado de React: cambian en cada cuadro y no deben volver a pintar la lista.
- **El mapa** no se mueve al arrastrar la hoja, solo al encuadrar (abrir una ficha, buscar, ubicarse) y entonces deja libre lo que ella tapa (`tapaAbajo` en el `padding` de la cámara).
- **Memoria de pantalla:** volver de un evento o de otra pestaña repone la ficha abierta, la altura y el desplazamiento.

### 3. La ficha dentro de la hoja (`FichaHoja`, `fichaEnHoja`, `[id]/CuerpoLugar`)
- El cuerpo de la ficha (datos, acciones, mapa, eventos, autor) salió de `/lugares/[id]/page.tsx` a `CuerpoLugar.tsx`: la página y la hoja pintan **el mismo**. La hoja lo pide a una acción de servidor (`abrirFichaEnHoja`) al tocar un pin o un renglón; mientras llega, el héroe con un esqueleto de tres datos. La acción entra como prop desde `page.tsx` para que los componentes de cliente de la ficha estén en el manifiesto de la ruta; cada pieza (cuerpo, menú, barra de Seguir) va en su propio `<Suspense>`, o la ficha suspendía la ruta entera y la hoja volvía a empezar.
- Cabecera con el asa, la ✕ (con la hoja llena, «Atrás», que vuelve a la media) y «···»; héroe 3:2 con la etiqueta y el título sobre un velo (`Cartel forma="heroe"`). Desplazada, o recogida, la cabecera se vuelve compacta con la portada oscurecida detrás del título. Solo se cierra con la ✕, y la lista vuelve a donde estaba.
- Un Seguir revalida la pantalla: la ficha abierta se vuelve a pedir y no se queda en «Seguir».
- La barra de Seguir (`ui/Seguir`, fija al pie de la ventana) va, dentro de la hoja, en una caja pegajosa de alto 0 con `contain: layout` que la hace suya: sobre la navegación mientras la hoja asoma, al pie cuando está llena, oculta recogida.

### 4. La fila de contexto (`FilaLugares`)
Ciudad · Filtros (desde 8 lugares, el umbral de las pestañas de antes) y cada filtro puesto con su ✕. La hoja Filtros trae Tipo (con la cuenta de cada uno), Con eventos (Esta semana · Hoy) y Siguiendo («Solo lo que sigo»); su botón dice cuántos lugares da (`Ver 4 lugares`, `Ver 1 lugar`, `Sin lugares`). El tipo vive en la URL (`?tipo=`, con `replace`: filtrar no es navegar); lo demás, en el teléfono. La lupa de la barra filtra por nombre la lista y el mapa.

### 5. Lo que se retiró
`ui/ChipFecha` (con su prueba y su CSS), las pestañas de tipo de Lugares (y `PestanaEnlace`, `PanelPestana` y `EnCamino` de `ui/Pestanas`), el conmutador Mapa · Lista y `verOtraVista`, la tarjeta del pin y su «Ver ficha», el carril «Con eventos esta semana» y la tira de letras de la lista, `useAltoHoja`, `SelectorFecha` en modo «filtro» (con `modo`, `diasActivos` y `SelectorFechaCargando`), el modo «desactivar» de `Calendario` y `CalendarioCargando`, `lugaresConEventoElDia`, `textoProximoPin`, `conGrupos` y `letrasPresentes`, la prop `filtros` de `Cabecera`, la presentación «pantalla» de `Mapa` y su toque en vacío, y el `Suspense` de `VistaLugares` (`useResuelta`, compartido con `FilaEventos`). El calendario que apagaba los días sin eventos y el modo «filtro» quedan en `2c70c3a9`.

### 6. Renglón de artista (`sitioEnLista`)
`artistas/page.tsx`, `personas/consultas.ts` y `cargarArtistasDestacados.ts` usan `sitioEnLista` (el sitio por su nombre, sin la dirección postal), como el renglón de evento, y `RenglonArtista` pone «Próximo:» en una línea que corta con puntos suspensivos, como el del lugar. Artistas y Perfil › Sigo: **179,7 → 116,7 px** (título en dos líneas) y 115,8 → 94,8.

## Decidí yo (para que el gestor confirme)

1. **La lupa filtra, no despliega:** busca por nombre en la lista y en el mapa; ya no abre el desplegable de resultados del buscador único (la hoja es la lista). El «Ver todos» del buscador de Inicio sigue llegando con el texto escrito.
2. **«Con eventos» va en Filtros**, como chips, porque Cuándo no va en Lugares; con él se fue el calendario que apagaba los días sin eventos (Lugares era su único usuario; el de Cuándo, en Agenda, deja tocar todos).
3. **Filtros desde 8 lugares** y **un tipo a la vez**, como las pestañas.
4. **La fila centrada desde 792 vale para las cuatro raíces:** comparten `Cabecera`; es el punto 56 del doc, que P7 traería.
5. **La atribución y el logo de Mapbox, arriba a la izquierda** (abajo los tapa la hoja; la licencia pide que se vean). **«Mi ubicación» es lo único que flota:** el conmutador y la tarjeta del pin no tienen sitio en el prototipo.
6. **Al cerrar la ficha la cámara se queda donde estaba** (solo se mueve al abrirla, para que el lugar se vea sobre la hoja).
7. **La ficha llega por una acción de servidor** con el cuerpo de la página tal cual (no se rediseñó: es de P6).
8. **`MenuAcciones` gana `className`** (el botón, para ponerlo en la rejilla de la cabecera) y **`Cartel` gana `forma="heroe"`**.
9. **El «Próximo:» del artista, en una línea:** el encargo pedía `sitioEnLista` (137,7 px); la línea única es mía y sigue lo que dice el doc («dos líneas de meta como máximo»). Vetable: volver a `styles.envuelve` en `RenglonArtista`.
10. **«Media» depende de los datos:** es el fin del primer bloque más 80 px, así que la ficha asoma con 446 a 496 px según el lugar (nueve medidos: la dirección de una o de dos líneas).

## Lo que cambia a la vista

- **Lugares:** fila «ciudad · Filtros»; el mapa a toda la altura con «Mi ubicación» arriba a la derecha; abajo la hoja con «9 lugares» y renglones «Tipo · calle» (con los km si se ordena por cercanía) y «Próximo:». Sin «Ver en lista/mapa», sin tarjeta del pin, sin carril ni letras.
- **Ficha:** se abre dentro de la hoja (foto, datos y Seguir), con el lugar sobre el mapa, no como otra página.
- **Desde 792:** el panel de 400 px a la izquierda, la ficha dentro de él y la fila centrada (en las cuatro raíces).
- **Artistas y Perfil › Sigo:** renglón con «Próximo:» en una línea y sin la dirección postal.
- **Lo que no cambia** (comparado píxel a píxel, script de la sesión, 390×844): `/lugares/:id` a pantalla completa (0,00 a 0,01 %, en Museo del Ferrocarril y Teatro de la Paz, a 390 y a 1 280), Inicio, la hoja Cuándo con calendario de Agenda, Perfil, Ajustes, la hoja de fecha y hora del alta de evento y la ficha de un evento (0,000 %); Agenda, 0,10 %: solo las miniaturas de las fotos.

## Verificación

- `npm run lint`: 0 errores (una advertencia que ya estaba). `npm run typecheck`: verde. `npm test`: 116 archivos, **1 519** pruebas (1 504 antes). `npm run build` sin variables de entorno, como la CI: verde.
- **Pruebas nuevas:** `hoja.test.ts` (12: la altura más cercana, cuándo asentarse y a dónde lleva el asa), `lugares.test.ts` (los filtros de la hoja: tipo, con eventos hoy y esta semana, solo lo que sigo, cuántas elecciones hay puestas) y, en Chrome real a 390×844, `HojaLugares.componentes.test.mjs` (3: las alturas de la lista y la navegación que se va; el mapa recibe los toques del hueco y la hoja los del cuerpo; la ficha abre a media altura, «Atrás», recogida sin cerrar, la ✕ cierra y la lista vuelve a donde estaba desde una altura profunda). **Comprobado que fallan** sin lo que cuidan (tres cambios: tres renglones en vez de dos y medio, sin el recorte del hueco, y cerrar la ficha sin devolver la lista).
- Pruebas de componente viejas: Armazon 10/10, Destacados 9/9, FilaEventos 7/7, Seguir 3/3, BotonIcono 8/8, Renglon 8/8, cargador 3/3 (ChipFecha, 9, se fue con el componente). `cupo` (13), `guardado` (2) y `nuevos` (6) fallan igual en el código base (21, no son de esta pieza).
- **Recorridos reales** contra la app compilada (Chrome, respaldo inventado): Museo → «Ver 4 lugares»; más «Esta semana» → «Ver 1 lugar», y cada chip de la fila quita el suyo; la lupa («muse» → 3 lugares; «zzz» → «Ningún lugar se llama así…»); «Mi ubicación» ordena («los más cercanos primero», «a 50 m»); un pin abre la ficha a media altura; Seguir desde la ficha da «Sigues», «1 persona lo sigue» y el renglón de la lista lo refleja; volver de un evento repone la ficha llena en el mismo desplazamiento (1 132 → 1 132); tras «Atrás», cambiar a Agenda y volver repone la ficha a media altura. Doce aperturas y cierres seguidos, sin fallos ni errores.
- **Detentes** (390×844, 9 lugares): lista recogida **64** px visibles · asoma **302** (64 + 238 = dos renglones y medio de 95) · llena **844** (barra y navegación recogidas); ficha recogida **76** · media **496** (ACHE) o **450** (Museo del Ferrocarril) · llena **844**.
- **Gesto con la rueda de Chrome:** de asoma, +250 llena; −400 recoge; en llena, −2 000 baja hasta recogida sin cerrar; con la ficha, +150 llena (compacta al desplazar), −3 000 la recoge a su cabecera (sigue abierta), +400 vuelve a la media; la ✕ cierra y la lista vuelve a asoma.
- **WebKit real** (simulador del iPhone SE, iOS 26.3, Safari, 375×667 pt): un empujón de 110 pt en 0,15 s lleva de asoma a llena con la inercia nativa (la navegación se va y sale la barra de desplazamiento del sistema); dos hacia abajo la recogen («9 lugares» con su asa) sin cerrarla; un toque en la franja sube de recogida a asoma; tocar un renglón abre la ficha a media altura; un empujón hacia abajo la recoge a su cabecera compacta y sigue abierta; otro corto y uno largo la llevan a llena y la desplazan («Atrás» sobre la portada oscurecida); «Atrás» vuelve a la media y la ✕ cierra y devuelve la lista a asoma. Sin inercia ni toques en el mapa: el token del simulador es falso («No se pudo cargar el mapa»).
- **Medidas** (`medir.js` y prueba de toque, respaldo inventado, 390×844, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Accionables sin su toque en Lugares (prueba de toque, a lo largo de la lista) | **11** distintos (la píldora, la tira de letras, los chips, la barra) | **0 defectos** en siete estados (lista recogida, asoma, llena al principio y al final; ficha media, llena al final y recogida); solo lo que por diseño queda bajo la navegación, tras la hoja llena o tras la barra de Seguir |
  | Botones pegados a 0 px en la lista (`medir.js`) | 16 | 0 |
  | Márgenes negativos (el logo de Mapbox aparte) | 0 en la lista; 2 en la ficha (la barra de la página, −20, y `.accionesRepartidas`, −20) | 0 nuevos; en la ficha queda solo el −20 de `Ficha.module.css .accionesRepartidas`, que ya estaba (P6) |
  | Desbordes y toques de menos de 44 | los del logo y los controles de Mapbox | los mismos, y ninguno nuestro |
  | Envoltorios sin estilo propio en Lugares | 4 (mapa 3, lista 1) | 2 (los de Mapbox); la hoja es `hoja › cuerpo` |
  | Nodos · profundidad | mapa 47 · 9 y lista 177 · 8 (dos pantallas) | 142 · 9 (mapa y lista juntos); con ficha, 208 · 11 |
  | Renglón de artista, alto máximo | 179,7 | 116,7 |

## Capturas

`docs/rediseno/capturas-262/` (29 PNG de paleta, 2,3 MB; 390×844 a 2× salvo las de 1 280×800 y las del simulador, de 750×1 334). «Antes» es la compilación de `origin/ui-raices` y «después» esta rama, ambas con la sesión de `ana@example.com` del respaldo local inventado; cada una abierta y descrita. El recuadro gris con un icono roto de las fichas es la imagen estática de Mapbox, que no carga sin red ni token: igual antes y después.

1. **Lugares** (`01`): antes, chip de fecha y ciudad, pestañas «Todos 9 · Casa de cultura 1 · Museo 4 · Foro 2», el mapa con pines violeta, verdes (los que sigues) y negros, «Mi ubicación» abajo a la izquierda y «Ver en lista» a la derecha. Después, la fila «San Luis Potosí · Filtros», el mismo mapa con sus pines, «Mi ubicación» arriba a la derecha, el logo de Mapbox arriba a la izquierda y la hoja asomando con «9 lugares», dos renglones y el tercero cortado.
2. **Un pin** (`02`): antes, una tarjeta «ACHE Galería · Galería · dom 4 de oct · 18:00 · Inauguración de Uno de Uno» con «Ver ficha» sobre el mapa oscurecido. Después, la ficha de ACHE abierta a media altura dentro de la hoja (foto con la etiqueta GALERÍA y el título, ✕ y ···, dirección, «Nadie lo sigue todavía», «Próximo: dom 4 de oct · 18:00» y «Seguir» sobre la navegación), con su pin centrado en el mapa que queda arriba.
3. **Lista** (`03`): antes, la vista Lista con la cabecera de tres filas (chips, pestañas y letras «A C M T»), el carril «Con eventos esta semana», «9 lugares», grupos por letra y la píldora «Ver en mapa» sobre el renglón de Aether y su botón. Después (hoja llena), sin barra ni navegación: el asa, «9 lugares» y renglones «Tipo · calle» y «Próximo:» con su botón (palomita verde en Aether y en Casa de Cultura, las que sigues).
4. **Lista desplazada** (`04`): antes, la cabecera de tres filas pegada arriba con la «A» subrayada, títulos de letra y «Ver en mapa» sobre el botón de MUNI. Después, la hoja llena al final de la lista (Teatro de la Paz de último) sin nada encima y con aire abajo para la navegación.
5. **Lista recogida** (`05`, solo después): el mapa con sus cinco pines a toda la altura y, sobre la navegación, la franja de 64 px con el asa y «9 lugares».
6. **Ficha** (`06`): antes, otra página con la barra «‹ Atrás · logotipo · ···», la foto con esquinas redondas y su lupa, el título en dos líneas y «Museo» debajo. Después, ficha llena dentro de la hoja: «‹» y «···» sobre la foto (a todo lo ancho, con MUSEO y el título encima sobre un velo), datos, acciones (Cómo llegar, Compartir, Sitio web, Facebook…), el recuadro del mapa, la descripción y «Próximos eventos», con «Seguir» al pie.
7. **Ficha desplazada** (`07`): antes, la barra fija de la página con «Atrás» y el logotipo sobre el contenido. Después, la cabecera compacta (portada oscurecida, «‹», «Museo del Ferrocarril Jesús García …», ···) y, debajo, los mismos datos, «Publicar un evento aquí», «Publicado por una cuenta borrada» y «¿Es tu espacio?», con «Seguir» al pie.
8. **Ficha a media altura** (`08`, solo después): abierta desde un renglón (Museo del Ferrocarril): el mapa arriba con el lugar (pin negro centrado), la foto entera con etiqueta y título, ✕ y ···, la dirección en dos líneas, «Sin eventos próximos · Nadie lo sigue todavía» y «Seguir» sobre la navegación.
9. **Ficha recogida** (`09`, solo después): la cabecera compacta (portada oscurecida, ✕, título, ···) sobre la navegación y el mapa a toda la altura.
10. **Filtros** (`10`, solo después): la hoja con Tipo (Todos 9 activo, Casa de cultura 1, Museo 4, Foro 2, Galería 2), Con eventos (Esta semana, Hoy), Siguiendo («Solo lo que sigo» con su palanca), «Limpiar» y «Ver 9 lugares».
11. **Filtros elegidos** (`11`, solo después): Museo y Esta semana en violeta y el botón «Ver 1 lugar».
12. **Filtrado** (`12`, solo después): la fila «San Luis Potosí · Filtros 2 · Museo ✕» (con el desvanecido a la derecha: «Con eventos esta semana» queda tras él), un pin en el mapa y la hoja con «1 lugar» (MUNI Museo).
13. **Búsqueda** (`13`, solo después): la lupa abierta con «muse» y su ✕ en lugar de la fila, tres pines y la hoja con «3 lugares».
14. **Lugares a 1 280** (`14`): antes, el mapa con la fila (calendario, ciudad, pestañas) y «Ver en lista» flotando; después, la fila «ciudad · Filtros» centrada, el panel de 400 px con «9 lugares» y sus renglones, el mapa a la derecha con «Mi ubicación» arriba, y el panel acaba donde empieza la navegación.
15. **Ficha a 1 280** (`15`): antes, la página de la ficha en una columna de 600 centrada; después, la ficha en el panel (foto con etiqueta y título, ✕ y ···, datos, acciones en una tira que se desliza —«Instagram» cortado a la derecha— y «Seguir» al pie), con el mapa y los pines a la derecha.
16. **Ficha desplazada a 1 280** (`16`, solo después): la cabecera compacta a todo el ancho del panel sobre la descripción, «Próximos eventos», «Publicar un evento aquí» y «Seguir».
17. **WebKit: lista llena** (`17`): tras un empujón corto, sin navegación y con el indicador de desplazamiento del sistema; la barra de Safari al pie.
18. **WebKit: lista recogida** (`18`): tras dos empujones hacia abajo, «9 lugares» con su asa sobre la navegación; el mapa dice que no pudo cargar (token falso del simulador).
19. **WebKit: ficha a media altura** (`19`): ACHE con foto, ✕ y ···, datos y «Seguir» sobre la navegación.
20. **WebKit: ficha recogida** (`20`): la cabecera compacta con la portada oscurecida, ✕, título y ···; sigue abierta.
21. **WebKit: ficha llena desplazada** (`21`): «‹ Atrás», «ACHE Galería» y ··· sobre la portada oscurecida, «Nadie lo sigue todavía», el «Próximo:», las acciones y el recuadro del mapa.

## Anotado para las piezas que siguen

- **P6 (ficha).** La ficha es una sola: `[id]/CuerpoLugar.tsx` (`CuerpoLugar`, `OpcionesLugar`, `SeguirLugar`) la pintan la página y la hoja, y lo que P6 cambie ahí cambia en las dos. Quedan el margen negativo de `Ficha.module.css .accionesRepartidas` (−20) y `ui/Seguir` con su barra fija: tapa el asomo de 80 px a media altura y, con la pastilla «Sigues», la caja `.accion` de `FichaHoja` sobra (la barra podría ir directa). El héroe de la hoja es `Cartel forma="heroe"`; el de la página, la tarjeta de siempre.
- **P7 (responsivo).** Desde 792 la hoja ya es el panel de 400 y la fila va centrada. La navegación sigue siendo la barra de abajo: el panel acaba donde ella empieza (`main.lugares` reserva `--nav-abajo` y la barra de Seguir del panel apoya en `bottom: 0`); con el carril lateral se van los dos.
- **P8 (mapa).** `Mapa` recibe `tapaAbajo` y lo usa en cada encuadre (`flyTo` con `padding.bottom`, `fitBounds` con `bottom`); la cámara no se mueve al arrastrar la hoja. En las pruebas las etiquetas del mapa no salen (los glifos van vacíos). `Mapa` conserva `modo="elegir"` con `valor`, `onCambio`, `centrarEn` y `.mapaEmbebido`, que no usa ninguna pantalla (las hojas «Dónde está» y «Dónde es» traen su propio mapa).
- **P10 (tarjetas y chips).** La fila usa `ChipContexto` y `ChipQuitar`; los tipos y «Con eventos» de la hoja Filtros son `Chip` con `envuelve`.
- **P12 (limpieza).** `SeccionBuscador` (`lib/inicio.ts`) conserva «agenda», «lugares» y «artistas», que ninguna pantalla pasa ya a `BuscadorUnificado` (solo Inicio, con «inicio»). `Lista.module.css` perdió `.grupo`; `useResuelta` lo comparten `FilaEventos` y `VistaLugares`, y otras pantallas siguen con `use(promesa)`.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin las pruebas, la pieza suma 287 líneas netas (1 825 añadidas y 1 538 quitadas; el CSS +97).

**Nuevos:** `lib/hoja.ts` y su prueba, `app/lugares/HojaLugares.tsx` (con su CSS y su prueba de componente), `FichaHoja.tsx` (con su CSS), `FilaLugares.tsx`, `fichaEnHoja.tsx`, `[id]/CuerpoLugar.tsx`, `components/useResuelta.ts`, esta bitácora y `docs/rediseno/capturas-262/`. **Borrados:** `ui/ChipFecha.tsx`, su CSS y su prueba, y `ui/useAltoHoja.ts`. **Con cambios:** `app/lugares/page.tsx`, `VistaLugares.tsx`, `lugares.module.css`, `[id]/page.tsx` (y su prueba), `ListaLugares` (y CSS), `RenglonLugar`, `RenglonArtista`, `Mapa` (y CSS), `Cartel` (y CSS), `Armazon`, `FilaEventos`, `ui/Cabecera` (y CSS), `ui/Calendario` (y CSS), `ui/MenuAcciones`, `ui/Pestanas` (y CSS), `ui/Renglon`, `ui/SelectorFecha`, `eventos/SelectorCuando`, `artistas/page.tsx`, `personas/consultas.ts`, `lib/cargarArtistasDestacados`, `lib/lugares`, `lib/indice`, `lib/calendario` y `lib/artistas` (comentario) y sus pruebas, y comentarios en `template.tsx`, `FormularioArtista.module.css`, `Lista.module.css` y `agenda.test.ts`; documentos: `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
