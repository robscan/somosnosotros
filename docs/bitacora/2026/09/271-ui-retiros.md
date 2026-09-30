# 271 · P12 Retiros y deudas: lo que sobra después de la reestructura (OL-243)

**Fecha:** 2026-09-30 · **Rama:** `ui-retiros`, desde `origin/ui-proteccion` (`2428b975`) · **OL:** OL-243 · **PR:** #281 (sin unir; va montado sobre #280, `ui-proteccion`, que va sobre #279, #278, #277, #276, #275, #274, #273, #272, #271, #270, #269 y #268, y sobre #266, `restructura-ui`) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Pieza P12 del plan de OL-227 (doc 50, § 7 y § 10).

## Pedido

Encargo del Gestor de cambios III con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código»): comprobar uno por uno los retiros del doc 50 § 10 y hacer los que falten; pagar las «Deuda (P12)» que dejó P11; bajar el inventario sin inventar abstracciones; recoger las notas de P12 de las bitácoras 259 a 270; y dejar el repositorio sin una sola prueba en rojo. La interfaz no cambia a la vista salvo lo que se buscó (tres arreglos del DOM y un salto menos en Lugares) y una raya del admin que explico más abajo.

## Retiros del doc 50 § 10, uno por uno

Comprobados con `grep` sobre `src`, `scripts` y `package.json`.

| Retiro | Estado | Qué había y qué se hizo |
|---|---|---|
| `ui/Tarjeta.tsx` y su CSS | Ya estaba | Sin archivo ni coincidencias. |
| Flotante `Publicar` | Ya estaba | Sin coincidencias: el «+» vive en la barra. `BotonPublicar` es el botón de las tres altas, otra cosa. |
| `verOtraVista` | Ya estaba | Sin coincidencias. |
| `HojaDondeLugar` | Ya estaba | Sin coincidencias; la hoja es `HojaDonde`. |
| `MapaDondeEs` | **No, con motivo** | Se comparte lo que era igual: ya no tiene CSS propio (usa `Mapa.module.css`; se borró `MapaDondeEs.module.css`) ni copia de los ayudantes (`lib/mapa.ts`: estado, radio del toque, color de diseño). Sigue siendo un componente porque hace otro trabajo: el de Lugares tiene cinco capas (sombra, círculos, nombres, nombre del elegido y pines con su día), colores por seguidos y destacados y un encuadre que respeta la hoja; el de «¿Dónde es?» tiene dos capas y un pin que se arrastra con tres salidas (lugar, punto de interés, punto libre). Juntarlos pide un `modo` que parte cada efecto en dos: más código, no menos. |
| `.palanca` | Ya estaba | Un solo dibujo: `ui/Palanca.module.css`. |
| `.soloLector` | Ya estaba | Uno solo: `ui/SoloLector.module.css`. |
| `.icono` | Ya estaba | Quedan dos y no se parecen (el icono de la app en `HojaInstalar`, la píldora de `NavSecciones`). |
| `.tarjeta` duplicada | Hecho | La de admin era copia de `renglon.tarjeta`: fuera (admin y obras colectivas usan la de `ui/Renglon`); las de `ajustes` y `bloqueados` ya no estaban. Las que quedan (`MisArtistas`, `PestanasPersona`, `ActivarAvisos`, el mando) no repiten cuatro declaraciones de otra. |
| «Filas parecidas» | **Hecho en parte** | Hecho: `.confirmar` de Borrar y de Bloquear y la página `/borrado` son una sola composición, `ui/Confirmar.module.css` (Bloquear solo suma su ancho de texto y su error); los formularios de lugar y de artista toman de `FormularioCanon` lo que repetían; `Sugerencia`, `SeccionNovedades`, `FichaPersona`, `Ciudad` y `HojaFiltros` comparten el vacío y la nota de la hoja; `VideoEmbed` usa `Incrustado`. No: `admin .fila/.dato/.menuItem`, `bloqueados .fila`, `SelectorCuando .fila` y `MisArtistas`. Cada una difiere de la piel de `Renglon` en 2 a 8 px (alto, columnas, huecos) y unirlas mueve pantallas; van con la revisión de renglones que pida el founder. |
| `AgendaInicio.accion` | Ya estaba | `AgendaInicio` no tiene CSS propio. |
| `publicadoBoton` | Hecho | El botón de «Publicado» es un `ui/Boton`; `ui/Ficha` exporta `CIRCULO` y `BOTON_PUBLICADO` y las tres fichas los usan (cada una definía su copia). `.publicadoBoton` queda solo como el sitio del botón en su celda. |
| `Sesion.entrar` | Ya estaba | `Sesion.module.css` solo tiene `.conPunto` y `.punto`. |
| `--al-centro` | Ya estaba | Sin coincidencias. |
| `@media (max-width: 340px/350px)` | Ya estaba, salvo uno | Solo queda el del mando de la obra colectiva (`mando.module.css`, 350 px: el orbe de 128 a 104, el hueco de 6 y la letra de las tarjetas de 14 a 12). Un equivalente fluido cambia los 375 px (los iPhone mini) entre 351 y 390 px: el orbe bajaría de 128 sin que nadie lo pidiera. Se queda hasta que el founder mire ese mando. |
| `--alto-mediana/grande/chica`, `--alto-hoja` duplicado | Ya estaba | Sin coincidencias. |
| `--alto-filtros` | Hecho | Sin uso (la fila mide 52): fuera de `globals.css`. |
| `.raiz` y `.pagina` globales | Hecho | `ui/Plantilla.module.css` (`.raiz`, `.raizSinNav`, `.pagina`, `.paginaContenido`), la rejilla escrita una vez con su área `cabecera`; 33 archivos la importan. Fuera también `.a-lo-ancho`, que nadie usaba. |
| Ruta `/agenda` | **No se retira** | Agenda volvió a la barra (doc 50, punto 61): el § 10 quedó viejo en esto (ver «Para el doc 50»). |

Lo que agrega la última frase del § 10 para la v3 (tarjeta intermedia del pin, lupa sobre la portada, barra de acciones al pie de la ficha, filete bajo la barra de la app) no venía en el encargo y no lo revisé. El logotipo en las barras de ficha y de tarea sí lo miré: se queda, porque quitarlo cambia unas diez pantallas del teléfono (ver «Anotado»).

## Deudas de P11 pagadas

- **`z-index: 1` ×3** (`lugares.module.css` `.ubicacion` y `.avisoMapa`, `Ficha.module.css` `.titulo`): el token `--z-sobre` (1: sobre su vecino dentro de la misma caja). Excepciones del JSON: 3 → 0.
- **Colores en 12 archivos** (`obras`, `FichaHoja`, `HojaLugares`, `mando`, `pared`, `Cartel`, `Mapa`, `MapaDondeEs`, `ui/Hoja`, `Incrustado`, `Palanca`, `VideoEmbed`): los blancos son `--fondo` y el `rgba(255, 255, 255, 0.9)` de la pared y del mando es el `--vidrio` que ya existía; el resto ganó un token con nombre llano en `globals.css`: `--velo-hoja`, `--fondo-visor`, `--fondo-video`, `--fondo-audio`, `--fondo-pared`, `--barra-desplazamiento`, `--sombra-asa`, `--sombra-punto`, `--sombra-perilla`, `--sistema-azul-halo`, `--contorno-tinta`, `--contorno-tinta-clara` y, del mando de la obra, `--mando-brillo`, `--mando-anillo`, `--mando-aviso`, `--mando-brillo-ok`, `--mando-anillo-ok`. `color-mix(in srgb, X n%, transparent)` da los mismos bytes que el `rgba` de antes (comprobado). **El hueso `#fbfaf8` de la pared de la obra (y del marco de su instantánea) no es `--fondo`** aunque la nota de P11 lo diga: son 4 a 7 niveles y la pared se veía más blanca (la comparación lo cazó: 95,7 % de la captura); por eso tiene su token, `--fondo-pared`, y da 0,000 %. El `--vidrio` es 0,92 y no 0,9 de opacidad: en la captura no cambia un píxel (sobre un trazo negro serían 5 niveles de 255). Quedan las 5 «Permanente» (los botones de Apple y de Google, el letrero impreso, el azul de iOS de `HojaInstalar`, el QR y la máscara de `[data-sigue]`).
- **Márgenes negativos ×5:** `SalirSinPublicar` y `EnlaceExterno` reparten su aire con un envoltorio y `gap`; en admin, `.nota` pierde el suyo (y el rótulo con nota debajo deja 4: `.conNota`), la franja de chips ocupa las tres columnas de la página y el menú `···` ya no se sale del aire de la hoja. Quedan los 3 «Permanente» (la ✕ de `SelectorQuien`, la de `Aviso` y el chevron del mando).
- **DOM ×3:** Perfil a 320 px (la cabecera se reparte con un hueco que baja con la ventana, `min(--espacio-4, 4.5cqw)`, y un nombre largo parte donde puede), «Mi ubicación» a 320×568 (la hoja asoma ya no pasa de lo que deja libre al botón: `alturaAsoma(pide, llena, libre)` en `lib/hoja.ts`, con pruebas, y `libre` sale de la geometría del propio botón, sin medir por pantalla) y el chip de ciudad de Buscar (8 px de aire debajo: el título pegajoso ya no le pisa 1 px del toque). Excepciones del DOM: 11 → 8, todas «Permanente».
- **Tokens nuevos de tamaño** que salieron de quitar números en duro: `--asa-ancho`, `--asa-alto`, `--columna-icono` y `--letra-campo`.

## Cifras, antes → después

| | Antes (P11) | Después |
|---|---|---|
| Bloques duplicados (`npm run inventario`) | 17 | **2** |
| Medidas en duro | 414 | **344** |
| Excepciones de estilo: `z-index` · color · margen negativo | 3 · 17 · 8 | **0 · 5 · 3** (las 8 «Permanente») |
| Excepciones del DOM (`medir`) | 11 | **8** («Permanente») |
| Archivos y reglas de CSS | 104 · 1 213 | 102 · 1 174 |
| Nodos y profundidad de las 23 pantallas (`medir`) | presupuesto de P11 | sin cambios (`--aceptar` no movió el JSON) |
| Pruebas de Vitest | 119 archivos · 1 602 | 119 archivos · **1 585** |
| Pruebas de componente (`test:componentes`) | 117 · 21 en rojo | **111 · 0 en rojo** |
| Cambio en `src` desde `2428b975` | | 149 archivos, +730 −1 557 |

Las 2 duplicadas que quedan son coincidencias, no diseño: `Cartel .imagen` y `MapaFicha .mapa img` («llena su caja, `cover`»: cuatro declaraciones) y la elipsis de una línea de `Destacados` y de `HojaDonde` (el modo estándar de CSS). Una clase compartida sería un módulo nuevo para cuatro líneas. Las 344 medidas: 108 son de 14, 10 y 6 px y 24 de 28 y 22 (fuera de la escala de 4: espacio propio de cada pieza); el resto es geometría de cada una (iconos, avatares, el mando y la pared de la obra colectiva, el admin), sin token que las nombre. Las 70 que se fueron eran números que ya tenían token, tamaños repetidos que ahora tienen el suyo y CSS que se borró con el código que lo usaba.

## Notas de P12 de las bitácoras 259 a 270

- **Hecho:** `?q=` de Artistas entero (la página, `ListaArtistas`, `filtroDesdeUrl`, la tira de letras que se escondía, «Nadie se llama…» y el nombre de `hrefNuevo`; `next.config.ts` manda `/`, `/agenda`, `/lugares` y `/artistas` con `?q=` a `/buscar?q=` con un 308, comprobado con `curl`); `CampoBuscar.onFocus` y `.className`; `Buscador.clave`; `EventoAgenda.artistas` (ahora `EventoBuscable`, solo de Buscar); los modos «cercanos» y «nuevos» de `filtrarAgenda`, `agruparPorPublicacion`, `corteNuevos` y lo que colgaba de ellos (`Filtro`, `puntoDe`, `DIAS_NUEVOS`, `LIMITE_NUEVOS`, `zonaDelEntorno`, los títulos de publicación); el modo «artistas» de `cargarEventosSemana`; `completa` de `ui/Hoja`; `usePunteroFinoAncho` y `ui/Pestanas` (nadie las usaba); `IconoLista`, `IconoMapa` e `IconoSitio`; la latitud y la longitud que ya nadie leía en las consultas de eventos; `ordenarArtistas`, `filtrarArtistas` y compañía, sin llamadores; `Tarjeta.foto` es `string | null` (el relleno lo pone `Renglon`; los recientes de Buscar guardan `null` y aceptan los viejos); `ListaEsqueleto` usa la cabecera de verdad y no dibuja la suya; `tipo` de Lugares es del teléfono y la URL solo lo refleja (abajo).
- **Ya estaba:** `SeccionBuscador` (se fue con `BuscadorUnificado`), `nombreSitio` sin uso (`destacados.ts` ya no lo importa; lo usan otros cinco archivos), `pedirRecogida` y `armazon:recogida` (solo aparecen como «retirados» en la línea de OL-240 de OPEN_LOOPS, que no se toca).
- **`tipo` de Lugares:** vive en el estado de la pantalla y se lee de la URL con `useSearchParams` (no como propiedad del servidor): la lista y el mapa cambian al instante, `replaceState` deja la URL para compartir, y Atrás, otra ciudad o un enlace lo respetan. Medido con el navegador (elegir «Museo» y tocar «Ver»): antes, la pantalla pedía `/lugares?tipo=museo` al servidor (una petición de página); ahora, ninguna (solo las tres precargas de fichas de siempre), con la lista en 4 renglones a los 250 ms y, tras ir a Agenda y volver, la misma URL, los mismos 4 renglones y el historial en 3 en las dos versiones.
- **No: los saltos «Ver la agenda / Ver lugares / Ver artistas / Ver mi perfil»** de Inicio quedan como están (un `Link` que apila). Medido en las dos versiones: Inicio (historial 2) → salto (3) → Atrás vuelve a Inicio una sola vez y no a un segundo Inicio; con `replace` no se añadiría entrada (el historial se quedaría en 2) y el primer Atrás sacaría de la app, lo contrario de lo que pide el encargo. Si el founder los quiere sin apilar de todos modos, es un `replace` en `Destacados.tsx` (una línea).
- **No: unir `Mapa` y `MapaDondeEs`** (ver la tabla).
- **Retirados** `auditar.mjs`, `resumir.mjs` y `medidas.mjs` (la prueba `medir` dice lo mismo y además falla); quedan `capturar-prototipo.mjs` y `medir-prototipo.mjs`; el README de la carpeta y la cabecera de `medir.js` lo dicen. `docs/rediseno/30-boton-en-carriles.md` lleva una nota de una línea: el botón elevado ya no existe en las listas.
- **No lo hice** (no estaba en el encargo): la fila de chips de los formularios (`FormularioCanon .chips`) sin el aire de 4 px de la de `ui/Chip` (unirlas mueve 4 px los formularios), y la barra de desplazamiento de la hoja llena, que la tapan la barra y la fila.

## Las 21 pruebas que fallaban en `main`

Eran de componente (`*.componentes.test.mjs`: Node, esbuild y Chrome; no corren en la CI ni con `npm test`) y no arrancaban por un error de empaquetado: `FormularioEvento` importa `useAvisosTelefono`, que trae `pushCliente` y de ahí `perfil/acciones` con `next/cache`, que en el navegador no existe. Las pruebas ahora simulan `useAvisosTelefono` (una línea) y `cupo` (13) y `guardado` (2) pasan; en `cupo` dos búsquedas por nombre eran ambiguas («Descripción» de la hoja y del campo, dos «Listo») y se precisaron. `nuevos` (6) probaba una pestaña que ya no existe: se retiró con su archivo. Nuevo `npm run test:componentes` (con `CHROME_EXECUTABLE` el Chrome de la Mac). Resultado: 111 de 111.

## Lo que cambia a la vista

1. **Perfil a 320 px:** la cabecera cabe (los dos botones redondos terminan en el borde de la tarjeta de abajo, no 2 px pasados); a 390 es idéntica.
2. **«Mi ubicación» a 320×568:** la hoja asoma 26 px más abajo y el botón se ve entero; a 390×844 es idéntica.
3. **Buscar:** lo que sigue al chip de ciudad baja 4 px (medido: las filas de arriba iguales y las de abajo iguales corridas 8 píxeles de captura).
4. **Lugares:** elegir un tipo ya no espera al servidor.
5. **Menú `···` del admin:** la raya sobre «Ocultar» ya no llega de borde a borde: se detiene en el aire de los lados (20 px), como la raya del pie de las hojas. Es lo que deja quitar el margen negativo sin tocar `ui/Hoja`; 160 píxeles de captura, nada más cambia. Si se prefiere de borde a borde, esa excepción vuelve como «Permanente».

Todo lo demás, 0,00 %.

## Decidí yo (para que el gestor confirme)

- Los saltos «Ver …» y los dos mapas se quedan (arriba, con su porqué); el `@media 350` del mando se queda.
- **El menú del admin con la raya inset** (punto 5 de arriba).
- **Colores:** el hueso de la pared con su token en vez de `--fondo` (la nota de P11 decía que era lo mismo; no lo es) y el `--vidrio` que ya existía (0,92) para el `rgba(255, 255, 255, 0.9)` de la pared y del mando, en vez de un token nuevo para dos puntos de opacidad.
- **La comparación de píxeles es contra el conjunto de corridas de antes,** no contra una sola: unas pantallas (el mapa, los degradados, la animación del logotipo) salen en 2 a 4 variantes distintas entre corridas de la misma compilación. Una pantalla vale «igual» si cada corrida de después es idéntica, píxel por píxel, a alguna de antes.
- **Las pruebas de componente no entran a la CI** (piden Chrome y esbuild, y nadie lo había pedido): quedan como script.

## Verificación

- **Verde:** `npm run lint` (0 avisos), `npm run typecheck`, `npm test` (119 archivos, 1 585 pruebas), `npm run build`, `npm run test:componentes` (111 de 111), `npm run inventario` («sin novedades»; 2 bloques y 344 medidas aceptados con `--aceptar`, el diff solo baja esas dos cifras) y `npm run medir` (23 pantallas × 4 anchos, 56 s, «sin novedades»; con `--aceptar` el JSON no cambia).
- **Píxeles, 390×844 a 2×, página entera, reloj fijo, respaldo inventado:** antes = la base exportada (`2428b975`, su propia compilación), 4 corridas; después = esta rama, 3 corridas (más 2 y 2 para el admin). De las 35 pantallas, **28 salen idénticas a una variante de antes** (Inicio solo, con ciudad, con Cuándo y con Filtros abiertos y con sesión; Agenda con ciudad y con sesión; la ficha de evento, también con «Voy»; la de artista; Lugares con la hoja llena; las tres altas; Perfil, Editar perfil, Ajustes, Bloqueados, Novedades, Borrado, Entrar, Ayuda, Privacidad, Reglas, el 404, una persona y el esqueleto de Artistas), **5 con ruido** y **2 buscadas** (Buscar y Buscar con `?q=`: arriba de la fila 244 idéntico y de ahí para abajo idéntico corrido 8 píxeles). El ruido: `agenda-esqueleto`, el pulso del logotipo (salto máx. 10); `artistas`, 33 píxeles de la barra; `lugar` (la ficha de lugar), 7 de 8 corridas idénticas y una con 143 píxeles en el borde de los círculos de los botones (salto máx. 18); `lugares`, el borde de los pines; `lugares-ficha`, la cámara del mapa: el pin sale en tres posiciones en 10 corridas de antes y en tres en 10 de después, dos en común (una propia de cada lado). Hojas: salir sin publicar, enlace externo, bloquear y borrar, iguales o ruido; admin: el panel, personas, una persona, obras y el listado de lugares, iguales.
- **La obra colectiva** (fuera de esas 35: sus pantallas piden un admin y una obra del respaldo del admin; sin movimiento, `prefers-reduced-motion`, para que las ondas de «Entrando…» no cambien de fase): el mando a 390×844 y la pared a 390×844, 0,000 %; el mando a 320×568, 86 píxeles de borde de círculo (salto máx. 6).
- **Lo que la comparación cazó y se arregló (tres):** el ancho del texto de la confirmación se llamaba `--ancho-texto`, que ya existe (la variación de ancho de la letra): el párrafo de Borrar y de `/borrado` perdió su tope; ahora es `--ancho-parrafo`. La franja de chips del admin perdió su margen de abajo en cero (8 px). Y el hueso de la pared, que pasé a `--fondo` y no es igual (arriba).
- **Redirecciones** (`curl` a la compilación): `/agenda?q=flauta`, `/lugares?q=museo`, `/artistas?q=ana` y `/?q=hola` dan 308 a `/buscar?q=…`; `/artistas` y `/agenda` dan 200.
- **CI (#281):** `verificar` en verde en 3 min 11 s (lint, typecheck, pruebas, `build`, `inventario` y `medir`); el despliegue de la vista previa de Vercel, en verde.

## Capturas

`docs/rediseno/capturas-271/`, PNG de paleta con el reloj fijo y el respaldo inventado (las abrí una por una):
1. **`271-01-perfil-320-antes.png`:** Perfil a 320×568: «Ana Rentería» en dos líneas (su borde izquierdo en x = 216 de 640) y los botones de ajustes y compartir llegan hasta x = 603, 4 píxeles de captura (los 2 px de CSS) pasados del borde de la tarjeta «Falta una línea sobre ti», que acaba en 599.
2. **`271-02-perfil-320-despues.png`:** lo mismo, con el nombre en x = 213 (el hueco de la cabecera bajó de 16 a 14,4 px) y los botones terminando en 599, alineados con la tarjeta.
3. **`271-03-perfil-390-igual-antes-y-despues.png`:** Perfil a 390×844, idéntico antes y después (el mismo hash de píxeles): el nombre en una línea, los botones alineados con la tarjeta y con la fila de «Mañana».
4. **`271-04-ubicacion-320-antes.png`:** Lugares a 320×568: la hoja asoma con su borde en y = 308 (154 px de CSS) y tapa la mitad de abajo del botón de ubicación (de 240 a 335).
5. **`271-05-ubicacion-320-despues.png`:** el borde de la hoja en y = 360 (180 px de CSS, 26 más abajo): el botón se ve entero, con mapa debajo; la lista arranca 52 px de captura más abajo («9 lugares» a 443 y no a 391).
6. **`271-06-ubicacion-390-antes.png`** y 7. **`271-07-ubicacion-390-despues.png`:** Lugares a 390×844: el mapa con sus pines, el botón arriba a la derecha y la hoja asomando con «9 lugares», «ACHE Galería» y «Aether»; iguales a la vista (difieren 1 484 píxeles en el borde de los pines, el ruido del mapa).
8. **`271-08-buscar-390-antes.png`:** Buscar: campo y ✕, el chip «San Luis Potosí», el título «Esta semana» a y = 257 con su raya a 297 y los tres atajos (Hoy, Fin de semana, Gratis) de 330 a 401.
9. **`271-09-buscar-390-despues.png`:** igual de arriba; del chip hacia abajo todo 8 píxeles de captura (4 de CSS) más abajo: el título a 265, la raya a 305 y los atajos de 338 a 409.
10. **`271-10-menu-admin-antes.png`:** hoja «Casa de Cultura del Barrio de San Miguelito» del listado de lugares del admin: «Ver la ficha», «Editar», «Destacar» con «Dos semanas: hasta el mié 21 de oct» y una raya de borde a borde sobre «Ocultar del mapa».
11. **`271-11-menu-admin-despues.png`:** la misma hoja; la raya va de x = 40 a 740, con el aire de la hoja a cada lado. Es lo único distinto.

## Anotado para las piezas que siguen

- **La barra de tarea con el logotipo** (doc 50 § 10: «el logotipo en las barras de ficha y de tarea» se retira en la v3): sigue puesto. A 320 px «Atrás» se recorta a «At…» (medido en `/ajustes/bloqueados`) porque el logotipo le come el sitio. Quitarlo cambia unas diez pantallas del teléfono; el prototipo firmado muestra «Atrás · título · ···». Decisión del gestor.
- **P13 lenguaje incluyente.** Rótulos con masculino genérico en la app: «Invita a tus amigos» (Ajustes), «Artistas invitados» y «Todos los artistas invitados ya tenían una cuenta vinculada» (panel del admin), el título del carril «Artistas destacados» (el prototipo dice «destacadxs»). Lo de P10 sigue pendiente: «Te interesa», «Hoy», «1 va», «N van», «Quitar {texto}», «Solo tú lo ves». Y lo de P11: los nombres accesibles de los controles de Mapbox salen en inglés («Toggle attribution», «Mapbox homepage»; la opción `locale` del mapa los traduce).
- **Las 344 medidas y las 8 excepciones «Permanente»** son el piso de hoy; el README de la prueba dice cómo se baja el número (`npm run inventario -- --aceptar`, después de mirar el diff).

## Para el doc 50 (no lo toqué)

- § 10: `/agenda` no se retira (Agenda volvió a la barra, punto 61); `HojaDondeLugar`, `ui/Tarjeta`, el flotante `Publicar`, `verOtraVista`, `.palanca` y `.soloLector` duplicados, `--al-centro`, los tokens `--alto-*` y `Sesion.entrar` ya no existen; `.raiz` y `.pagina` son `ui/Plantilla.module.css`; `MapaDondeEs` no se absorbe (comparte CSS y ayudantes con `Mapa`); queda un `@media (max-width: 350px)`, el del mando.
- § 7: fila P12 de la tabla de piezas, hecha; § 9: las cifras aceptadas de hoy son 2 bloques duplicados y 344 medidas en duro.

## Archivos

Sin migraciones ni variables de entorno. **Nuevos:** esta bitácora, `docs/rediseno/capturas-271/`, `src/components/ui/Plantilla.module.css`, `src/components/ui/Confirmar.module.css` (antes `Borrar.module.css`) y `src/lib/mapa.ts`. **Borrados:** `scripts/ops/auditoria-ui/auditar.mjs`, `resumir.mjs` y `medidas.mjs`; `src/components/ui/Pestanas.tsx` y su CSS; `src/components/usePunteroFinoAncho.ts`; `MapaDondeEs.module.css`; `VideoEmbed.module.css`; `nuevos.componentes.test.mjs`. **Con cambios:** el resto de `src` (retiros de código, tokens y plantillas), `next.config.ts` (los 308), `package.json` (`test:componentes`), `scripts/ops/auditoria-ui/` (los dos JSON de cifras y excepciones, `README.md`, `medir.js`, `capturar-prototipo.mjs`), `docs/rediseno/30-boton-en-carriles.md`, `docs/ops/OPEN_LOOPS.md` y un aviso sin uso de `docs/diseno/logotipo/iconos-sn.mjs`.
