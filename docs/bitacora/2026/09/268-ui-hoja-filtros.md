# 268 · Hoja de Lugares: la lista bajo sus filtros y la hoja que responde al filtrar (OL-240)

**Fecha:** 2026-09-30 · **Rama:** `ui-hoja-filtros`, desde `origin/ui-altas` (`20a11c8c`) · **OL:** OL-240 · **PR:** #278 (sin unir; va montado sobre #277, `ui-altas`, que va sobre #276, #275, #274, #273, #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Pieza entre P9 y P10, sobre lo que el founder decidió el 2026-09-30 (doc 50, puntos 12, 36 y 58).

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y dos decisiones del founder: **1.** la lista nunca tapa sus filtros: con la lista llena la hoja sube solo hasta debajo de la fila de contexto (ciudad · Filtros · activos), que queda a la vista; la barra de la app se recoge al bajar y vuelve al subir como en cualquier raíz; la navegación se esconde como hoy; la ficha llena sigue cubriendo toda la pantalla («la lista vive bajo sus filtros; la ficha es una página»). **2.** la hoja responde al filtrar (Filtros, cambiar de ciudad, quitar un chip): recogida sube a asoma, asoma o llena se quedan; la cantidad dice lo que quedó; el mapa encuadra lo que queda, sin moverse si nada cambió. Nada más cambia.

## Lo que había

- La hoja llena cubría la ventana entera (`z-index` sobre la barra y la fila; su «llena» era el cuerpo en lo alto de la hoja): con la lista llena no se veía la ciudad, ni Filtros, ni los chips activos. Prueba de toque, lista llena: **4 accionables sin su toque** (los dos chips de la fila, «Mi ubicación» y la atribución de Mapbox).
- Filtrar cambiaba «9 lugares» por «4 lugares» pero la hoja recogida seguía recogida y el mapa no se movía. Al **cambiar de ciudad** la cámara se quedaba en la anterior: con Guadalajara (4 lugares) el mapa seguía en San Luis Potosí y no salía ni un pin (`inicial` se calcula una vez, al montar, y la pantalla no se vuelve a montar al cambiar de ciudad).

## Lo que se hizo

### 1. La lista vive bajo sus filtros; la ficha es una página
- **`lib/hoja.ts`, `alturaLlena`** (pura, con su prueba): el desplazamiento con el que el cuerpo llega a su techo. El techo de la ficha es lo alto de la hoja (cubre todo, como estaba firmado); el de la lista es el borde de arriba del mapa, que empieza justo bajo la fila (`[data-techo-hoja]`, lo lee `HojaLugares.medir` en el DOM: sin constantes, y la fila puede medir lo que mida). `estadoEn`, `destinoAlAsentar` y el asa no cambian: solo cambia el número de «llena».
- **`HojaLugares.module.css`:** el `z-index` de la lista queda **bajo** la barra y la fila (`--z-pegajoso − 1`); el de la ficha, sobre ellas como antes (`.hoja[data-ficha]`). La lista pasa por debajo de las dos, sin cambiar el tamaño de la hoja (nada se recalcula al recoger la barra).
- **La barra sigue el desplazamiento de la lista** (`Armazon`): `alDesplazar(y, alFinal)` es ahora el mismo para la página y para la hoja llena; el armazón oye `armazon:hoja` (`avisarHoja`, en lugar de `pedirRecogida`) con `{ llena, pagina, y, alFinal }`. Con la lista llena, «y» cuenta desde donde llenó: la barra se recoge tras bajar más de 120 px, vuelve al subir un poco, al pasar cerca de arriba y al llegar al final, con las mismas reglas de siempre. Con la ficha (`pagina`) se va entera, como hoy. Al dejar de llenar, todo vuelve (forzado, sin esperar a la calma).
- **`data-llena`** (armazón) esconde solo la navegación mientras la hoja llene (`NavSecciones.module.css`), sin depender de que la barra esté recogida: así «la navegación se esconde como hoy» y la barra puede volver al subir.
- **La fila sube con la barra** (`lugares.module.css`): la página no se desplaza en Lugares, así que el `sticky` de `ui/Cabecera` no la lleva; con `data-recogida` se traslada `--recogida` (lo que mide la barra). El hueco que deja lo cubre la lista.
- **`cubre`** (lo que la hoja tapa del mapa) ya no pasa de lo que taparía en asoma (o media, con ficha): llena tapa todo el mapa y no se ve, y con la fila a la vista ahora se puede filtrar con la lista llena; el mapa se encuadra para cuando la hoja baje.

### 2. La hoja responde al filtrar
- **`detenteAlFiltrar`** (pura, con su prueba): recogida → asoma; asoma, media y llena se quedan.
- **`HojaLugares` expone `mostrarLista()`** por `ref` (`Manejo`, que ya usaba la ficha): si la lista está recogida sube a asoma **de un salto** (como la ficha al abrirse) y en todos los casos avisa cómo quedó (`alAsentar`). Sin alturas (el panel) o con la ficha a la vista no sube.
- **`VistaLugares`:** `mostrarResultado(puntos)` deja los puntos por encuadrar y llama a la hoja; la cámara va en cuanto la hoja avisa cuánto tapa (`porEncuadrar` reemplaza a `irAlLugar` y sirve también a la ficha). `cambiar` (Filtros y chips ✕) compara lo que queda con lo que se veía: si es lo mismo, la hoja sube pero la cámara no se mueve (`null`). El cambio de ciudad lo ve un efecto sobre `ciudad.slug` y encuadra lo visible de la ciudad nueva (con lo que además se arregla que la cámara se quedara en la anterior).

### 3. Lo que se retiró
`pedirRecogida` y su evento `armazon:recogida` (los reemplaza `avisarHoja`/`armazon:hoja`), el `z-index` único de `.hoja` sobre la barra y la fila, `recogida` (ref de `HojaLugares`, ahora `llenaAvisada`), el `Math.min(y, llena)` de `cubre`, `irAlLugar` de `VistaLugares` (ahora `porEncuadrar`) y las aserciones de la prueba de componente que decían «llena cubre la pantalla». Comprobado con `grep`: ninguna referencia queda a lo retirado, y no hay clases huérfanas nuevas.

### 4. Un error que salió al probar
La primera versión subía la hoja con el desplazamiento animado del navegador. Con la lista nueva llegando por la red (el tipo vive en la URL) el aviso de tamaño de la hoja y una pausa del navegador a mitad del ascenso la devolvían a recogida: con la respuesta del servidor sin demora, **3 de 4 veces se quedaba recogida** y la otra subía, bajaba y volvía a subir. Se sube de un salto (arriba, `mostrarLista`); con la respuesta demorada 0, 120 y 300 ms, cuatro veces cada una, **12 de 12 terminan en asoma**, sin rebote.

## Decidí yo (para que el gestor confirme)

1. **La barra sigue al desplazamiento de la lista «como en cualquier raíz»**: mismas reglas (120 px, 60, 6) y misma calma; y vuelve también al llegar al final de la lista, como en cualquier raíz. Es mi lectura de «se recoge al bajar y vuelve al subir»; vetable: la barra se quedaría a la vista con la lista llena (quitando `alDesplazar` del aviso de la lista).
2. **La ficha llena se lleva la barra entera** (`pagina`), como hoy, aunque la hoja va sobre ella y no se ve: la barra sigue sin poder tocarse ni leerse tras la ficha.
3. **La hoja sube de un salto**, no animada: es lo único que resistió a la red lenta (ver 4), llega a la vez que la lista nueva y va bajo el cierre de la hoja Filtros. Vetable si se quiere la subida animada: `mostrarLista` volvería a `irA` y habría que proteger `asentar` y el aviso de tamaño mientras dura.
4. **`tipo` viaja por la URL:** al elegirlo, la hoja sube al momento y la lista nueva llega ~180 ms después (con el servidor local); durante ese instante se ve la lista anterior en asoma. Los demás filtros (Con eventos, Siguiendo) y los chips no tienen ese salto. Pasarlo a estado local lo evitaría (P12).
5. **Sin cambio en lo que se ve** (p. ej. «Ver 9 lugares» sin haber tocado nada): la hoja sube igual (el botón pidió ver la lista) y la cámara se queda (diez pines en el mismo píxel).
6. **Una ciudad sin lugares** deja la cámara donde estaba (no hay qué encuadrar); el vacío ya lo explica la hoja.
7. **`cubre` con llena = lo de asoma:** con la lista llena se puede filtrar y el mapa, oculto, se encuadra para cuando la hoja baje.
8. **El techo de la lista es `[data-techo-hoja]`** (el mapa, en `VistaLugares`), un atributo como los que la hoja ya lee de la ficha (`data-ficha-hoja`, `data-cuerpo`), en vez de una `ref` que pasar (el compilador de React no deja medir una `ref` que llega como prop dentro de un `useCallback`).
9. **La barra de desplazamiento de la hoja llena** ocupa toda la ventana y la barra y la fila la tapan arriba: cosmético (en el iPhone es la del sistema, al desplazar).

## Lo que cambia a la vista

- **Lista llena:** la barra y la fila (ciudad · Filtros · chips) quedan arriba y la lista corre por debajo; la navegación se va. Ya no hay que bajar la hoja para cambiar un filtro.
- **Lista llena, desplazada:** la barra se recoge y la fila queda arriba de todo; al subir un poco, la barra vuelve.
- **Filtrar, quitar un chip o cambiar de ciudad** con la hoja recogida: sube a asoma, la cantidad dice lo que quedó y el mapa encuadra esos lugares.
- **Lo que no cambia:** la ficha llena cubre toda la pantalla (**0,000 %** de píxeles distintos), la ficha a media altura y recogida (0,000 %), el panel de 400 a 1 280 (0,000 %) y la lista asomando y recogida (0,11 %: medio píxel de encuadre del mapa, porque `cubre` ya no pasa de asoma).

## Verificación

- `npm run lint`: 0 errores (la advertencia de siempre, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 119 archivos, **1 594** pruebas (1 588 antes; +6: `alturaLlena` 3 y `detenteAlFiltrar` 3). `npm run build` verde con las variables del respaldo local y **sin variables**, como la CI.
- **Pruebas de componente en Chrome:** `HojaLugares` 9 de 9 (la primera reescrita, dos nuevas: la fila sube con la barra recogida, y «al filtrar»), `Armazon` 17 de 17 (una nueva: la hoja llena esconde la navegación, la lista presta su desplazamiento y la ficha se lleva la barra); `Destacados` 9, `FilaEventos` 7, `Seguir` 4, `BotonIcono` 8, `Hoja` 4, `Kpi` 4, `Renglon` 8 y `cargador` 3 pasan. `cupo` (13), `guardado` (2) y `nuevos` (6) fallan igual que en la base (21).
- **Comprobado que las pruebas fallan** sin lo que cuidan (seis cambios, uno por vez): la lista sobre la fila (`z-index`), llena sin mirar la fila, recogida que no sube al filtrar, la ficha que no se lleva la barra, la barra que no vuelve al subir y la fila que no sube con la barra.
- **Detentes** (390×844, 9 lugares, respaldo inventado, rueda de Chrome; lo que se ve del cuerpo, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Lista recogida (sobre la navegación) | 64 | 64 |
  | Lista asoma | 302 | 302 |
  | Lista llena, al principio (hasta el pie de la ventana) | 844 (el cuerpo empieza en 0) | **728** (empieza en 116, bajo la fila: barra 56 + fila 60) |
  | Ficha recogida · media · llena | 76 · 357 · 844 | 76 · 357 · 844 |

- **Rueda de Chrome** (la app compilada, `estado`): de asoma, +300 se asienta en llena (y = 604, cuerpo en 116, barra y fila a la vista, navegación fuera); +150 más recoge la barra y la fila queda en 0–60; al llegar al final la barra vuelve; −60 la mantiene; −300 vuelve a llena; −2 000 baja hasta recogida sin cerrar. La ficha con la rueda: media, llena (cubre todo, barra y fila fuera) y recogida, como antes.
- **Medidas** (`medir.js` y prueba de toque, 390×844 y 1 280×800, antes → después): márgenes negativos **0 → 0** en los ocho estados; desbordes **2 → 2** (el lienzo y los controles de Mapbox); toques de menos de 44 **1 → 1** (el logotipo de Mapbox); nodos y profundidad iguales (141 · 9 la lista, 222 · 9 con ficha). Accionables sin su toque, lista llena al principio: **4 → 2** (los chips de la fila ya se tocan; quedan «Mi ubicación» y la atribución de Mapbox, tras la hoja llena por diseño); al final de la lista, 4 (los dos anteriores y dos renglones bajo la barra y la fila pegadas, que se alcanzan desplazando, como en cualquier raíz); el resto, igual que antes (asoma y recogida 2 bajo la navegación, ficha media 5 bajo la navegación, panel 0). Ninguno nuevo sin explicación por diseño.
- **Safari real** (simulador iPhone SE, iOS 26.3, 375×667 pt, la app compilada): de asoma, un empujón de 170 pt en 0,15 s llega a llena y sigue por **inercia** hasta el final de la lista; con la lista llena la fila queda a la vista arriba (bajo la barra al principio; con la barra recogida al desplazar, y la barra vuelve al arrastrar 70 pt hacia abajo); desde recogida, elegir Museo sube a asoma con «4 lugares» y quitar el chip con su ✕ sube a asoma con «9 lugares»; la ficha llena cubre toda la pantalla, «Atrás» la deja en media y la ✕ la cierra devolviendo la lista donde estaba. Sin mapa (el token del simulador es falso) no se ve el encuadre.
- **El mapa** (Chrome, respaldo de dos ciudades): con «Museo» los cuatro pines quedan por encima de la hoja y bajo la fila; con Guadalajara, los cuatro de Guadalajara (antes ninguno a la vista); con «Ver 9 lugares» sin cambios, los diez centros de pines no se mueven.
- **Lo que esta prueba no puede ver:** el iPhone del founder (la sensación de la subida de un salto), el mapa en Safari y un servidor real más lento que el local.

## Capturas

`docs/rediseno/capturas-268/` (21 PNG de paleta, 1,3 MB; teléfono a 390×844 a 2×, escritorio a 1 280×800, Safari del simulador a 750×1 334). «Antes» es la compilación de `origin/ui-altas`, «después» esta rama; ambas con el respaldo local inventado (con una segunda ciudad, Guadalajara, solo para la prueba del cambio de ciudad) y la sesión de `ana@example.com`. Cada una abierta y descrita.

1. **Lista llena** (`01`): antes, la hoja llena cubre todo: el asa, «9 lugares» y los renglones desde arriba, sin barra ni fila. Después, la barra (+, logotipo, lupa y campana) y la fila «San Luis Potosí ▾ · Filtros» con su raya, y debajo el asa, «9 lugares» y los renglones.
2. **Lista llena, desplazada** (`02`): antes, la lista al final (Teatro de la Paz, con aire para la navegación) sin nada encima. Después, la barra recogida y la fila «San Luis Potosí · Filtros» arriba de todo, con los renglones pasando por debajo (uno a medias bajo la raya).
3. **Ficha llena** (`03`, idénticas): la cabecera compacta sobre la portada oscurecida («‹», «Museo del Ferrocarril Jesú…», «···»), las acciones cortadas, «Próximos eventos», «Publicar un evento aquí», «Dónde» (el recuadro roto es la imagen estática de Mapbox, que no carga sin red), «Sobre el lugar», «Publicado por una cuenta borrada», «¿Es tu espacio?» y «Seguir» al pie; cubre toda la pantalla, sin barra, fila ni navegación.
4. **Recogida** (`04`): la barra, la fila y el mapa con nueve pines (cinco violeta, uno verde, tres negros), «Mi ubicación» arriba a la derecha, el logo de Mapbox arriba a la izquierda y, sobre la navegación, la franja «9 lugares».
5. **Filtro elegido** (`05`): antes, la fila con «Filtros 1» y el chip violeta «Museo ✕»; la hoja sigue recogida con «4 lugares» y el mapa en el encuadre de antes (los cuatro pines sueltos por la pantalla). Después, la misma fila; la hoja subió a asoma con «4 lugares», Casa del Poeta, MUNI y el tercer renglón cortado, y el mapa encuadra los cuatro pines (tres negros juntos arriba a la derecha y uno violeta a la izquierda), todos sobre la hoja.
6. **Elegir ciudad** (`06`): la hoja «Dónde estás» sobre el mapa oscurecido, con «Guad» escrito en «Otra ciudad» y la fila «Guadalajara · 4 lugares».
7. **Ciudad cambiada** (`07`): antes, la fila dice «Guadalajara» pero el mapa está vacío (la cámara sigue en San Luis Potosí) y la hoja sigue recogida con «4 lugares». Después, la hoja subió a asoma con Casa de la Cultura Jalisciense, Galería del Instituto Cabañas y Museo Cabañas, y el mapa encuadra los cuatro pines de Guadalajara (negros, sin eventos).
8. **Panel a 1 280** (`08`, idénticas): la barra con el logotipo, la lupa y la campana, el carril (Inicio, Agenda, Lugares activo, Artistas, Perfil), la fila «San Luis Potosí · Filtros» centrada, el panel de 400 con «9 lugares» y sus renglones y el mapa a la derecha con sus pines.
9. **Safari: recogida con un chip** (`09`): la barra, la fila con «Filtros 1» y «Museo ✕», el mapa con «No se pudo cargar el mapa. Revisa el token de Mapbox.» (token falso del simulador) y la franja «4 lugares» sobre la navegación y la barra de Safari.
10. **Safari: chip quitado** (`10`): la fila «San Luis Potosí · Filtros» y la hoja ya en asoma con «9 lugares», ACHE, Aether y el tercer renglón cortado.
11. **Safari: lista llena** (`11`): la barra y la fila arriba y, debajo, los renglones (ACHE primero); sin navegación.
12. **Safari: lista desplazada** (`12`): tras el empujón, sin barra, con la fila arriba bajo la hora y los renglones (Casa del Poeta a Museo Nacional de la Máscara) corriendo por debajo.
13. **Safari: fin de la lista** (`13`): la inercia llegó al final (Teatro de la Paz, aire abajo); la barra volvió a estar a mano sobre la fila.
14. **Safari: filtro elegido** (`14`): «Filtros 1» y «Museo ✕» en la fila y la hoja en asoma con «4 lugares» (Casa del Poeta, MUNI y el tercero cortado).
15. **Safari: ficha llena** (`15`): la ficha de Casa del Poeta cubre la pantalla (cabecera compacta, «Dónde» con el recuadro de mapa estático sin cargar, «Publicado por una cuenta borrada», «¿Es tu espacio?» y «Seguir»), sin barra, fila ni navegación.

## Anotado para las piezas que siguen

- **P10 (tarjetas y chips).** La fila ya se usa con la lista llena: si P10 cambia su alto (hoy 60), «llena» sube hasta donde termine (se mide, sin constante). `ChipContexto` y `ChipQuitar` siguen igual. El techo de la lista es `data-techo-hoja` en el mapa de `VistaLugares` (`CuerpoLugares`): no quitarlo.
- **P12 (retiros).** `tipo` en la URL obliga a que la lista nueva llegue después de que la hoja suba (decisión 4): con un `tipo` local con la URL como reflejo no habría salto. `Armazon`: `pedirRecogida` y `armazon:recogida` ya no existen (si algún documento o script los nombra, actualizarlo); el armazón ahora tiene `data-llena` además de `data-recogida`. La barra de desplazamiento de la hoja llena arranca arriba de todo y la tapan la barra y la fila (decisión 9): si molesta, la hoja podría empezar bajo la fila con el mismo contrato, a costa de medir su alto al recoger la barra.

## Para el doc 50 (no lo toqué)

- Punto 12 y 58: la lista queda con tres alturas (recogida · asoma · llena) y **llena se detiene bajo la fila de contexto**, que queda siempre a la vista; la barra se recoge al bajar y vuelve al subir como en cualquier raíz; la navegación se esconde; la ficha llena cubre toda la pantalla.
- Punto nuevo (decisión del founder, 2026-09-30): al filtrar (Filtros, chip ✕, ciudad), la lista recogida sube a asoma; en asoma o llena se queda; la cantidad dice lo que quedó y el mapa encuadra los lugares que quedan, sin moverse si nada cambió.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin las pruebas, la pieza suma +163 y −58 líneas (neto +105; el CSS +11); las pruebas, +186 y −28.

**Nuevos:** esta bitácora y `docs/rediseno/capturas-268/`. **Con cambios:** `lib/hoja.ts` (y su prueba), `components/Armazon.tsx` (con su CSS y su prueba de componente), `components/NavSecciones.module.css`, `app/lugares/HojaLugares.tsx` (con su CSS y su prueba de componente), `app/lugares/VistaLugares.tsx` y `app/lugares/lugares.module.css`; documentos: `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
