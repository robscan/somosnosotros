# 500 · «Listo» del texto de Instagram no respondía

**Pieza:** OL-468. **Rama:** `instagram-texto-listo`, base `origin/main` (`12ab4582`). **Fecha:** 2026-10-28. **Operador:** Claude (agente del Gestor de cambios VII).
**Manda:** el reporte del founder del 2026-10-28, desde su iPhone: «Al tratar de editar texto de publicación cuando se comparte en Instagram, se va a editor de pantalla completa; al terminar de editar y seleccionar “Listo” para salir de ahí, la selección falla».
**Estado:** hecho en su rama, sin migración ni variables nuevas. Espera revisión del gestor y el «publica» del founder.

## Lo que pasaba (reproducido en el simulador)

iPhone 17e con iOS 27.0, teclado en pantalla, la app compilada de la rama contra el respaldo local (datos inventados, sesión de la cuenta de administración del respaldo). La hoja «Publicar en Instagram» se abrió desde el «···» de la ficha de un evento y desde Administración › Instagram. Probé los tres entornos del iPhone:

| Entorno | ¿Falla «Listo»? |
|---|---|
| Safari | No: el toque cae en «Listo» y la capa se cierra. |
| Web instalada en el inicio | No. |
| **App de la tienda** (Capacitor, `apps/ios`, compilada con `xcodebuild` apuntando a `localhost`) | **Sí**: las dos veces que toqué «Listo» donde se ve. |

En la app de la tienda, la cabecera de la capa (título, contador y «Listo») se **ve** 46 px más abajo de donde **recibe** los toques. Lo medí con un registrador de toques inyectado (no va al repositorio): `touchstart`, `pointerdown`, `click` y `elementFromPoint` en el punto del dedo, más las cajas de la capa y de «Listo», el desplazamiento de la página y del área visible.

- **Qué recibía el toque:** al tocar «Listo» donde se ve (x 344, y 114 en puntos), el `touchstart`, el `pointerup` y el `click` los recibe **`textarea#campo-texto-instagram`**: el cursor salta al «303» del texto y la capa sigue abierta (captura 02). `elementFromPoint` en ese punto también da el área de texto. Para la página, «Listo» está en `top: 47 … 91` (la caja de `getBoundingClientRect`), y tocando ahí (y 69), donde no se ve nada, sí se cierra.
- **Dónde está pintado:** buscando el violeta de «Listo» en la captura del simulador: filas 108–121 pt. La caja dice 47–91. La diferencia es de 46 px, lo mismo que se desplazó la página (`scrollY` 46).
- **Por qué se desplazaba la página** (registro de llamadas a `scrollBy`/`scrollTo`): al salir el teclado, `ui/useCampoVisible` buscaba qué se desplaza para llevar el área de texto a la vista; subía desde el área de texto, salía de la capa fija (que no tiene desplazamiento propio) y encontraba **el cuerpo de la hoja de detrás** (`Hoja.cuerpo`, `overflow-y: auto`), y lo desplazaba (`scrollBy({ top: −30.6, behavior: "smooth" })`, y otra vez al asentarse). Además, el WKWebView de la app (teclado en modo `body`, OL-205) desplaza la página 46 px para revelar el área de texto aunque la página esté quieta bajo la hoja (`html[data-capas]`). Con la página desplazada, lo fijo queda **pintado** 46 px más abajo pero **recibe** los toques en su sitio: es la misma clase de descuadre de lo fijo que ya se midió en iOS 27 (bitácoras 333 y 407).
- **Por qué solo en la hoja:** en el alta y en la edición del evento (la «Descripción» de «¿Quieres agregar algo?») la capa no está dentro de nada que se desplace; `useCampoVisible` ya lo sabía (`enCapaFija`) y no movía nada. Lo probé en la app de la tienda con el código de `main`: «Listo» pintado en 62–75 pt, toque en y 68 → `click` en «Listo», se cierra. El fallo es de la capa dentro de una hoja.
- Las hipótesis del encargo: (1) no hay `transform`, `filter`, `will-change` ni `contain` en ningún ancestro de la capa (comprobado con `getComputedStyle` de cada uno); (2) ningún velo de la hoja recibe el toque: lo recibe el área de texto de la propia capa; (3) no hay `pointerleave` en juego (ni `useTecladoSeSueltaAlDesplazar` ni la capa lo usan, y el `pointerup` llega); (4) «Listo» no queda bajo el teclado: queda arriba, pero pintado lejos de donde se toca.

## Qué cambió (lo mínimo, en las piezas compartidas)

1. **`ui/useCampoVisible` (`desplazable`)**: al buscar lo que se desplaza desde un campo, se detiene en la primera capa fija. Una capa a pantalla completa es su propia pantalla: lo de detrás no la mueve. Así el área de texto de `ui/CampoLargo` dentro de `ui/Hoja` ya no desplaza el cuerpo de la hoja. Fuera de una hoja no cambia nada (ahí ya devolvía `null`). La hoja «¿Dónde es?» y las demás hojas con campos no tienen una capa fija entre el campo y su cuerpo: siguen igual.
2. **`ui/CampoLargo`**:
   - Mientras la capa está abierta, la página de detrás no se mueve: si se desplaza (lo que hace el WKWebView al salir el teclado), se devuelve a donde estaba. Detrás de una capa que lo cubre todo no hay nada que revelar.
   - Al cerrar con «Listo» se repone el desplazamiento de lo que había bajo el renglón (el cuerpo de la hoja o la página), para volver al renglón del texto y no a otra parte: con la capa abierta el renglón sale del cuerpo, el cuerpo se acorta y su desplazamiento se recortaba solo (en Chromium la hoja volvía arriba, a la imagen).
   - Sin envoltorios nuevos ni CSS nuevo.

## Pruebas

- **Prueba nueva con toques reales** (`src/components/instagram/HojaTexto.componentes.test.mjs`, 2 casos): los componentes de verdad (`ListaInstagram` con su `HojaInstagram`, `ui/Hoja`, `ui/CampoLargo`) con `useCampoVisible` montado como en el armazón, el festival del respaldo local (texto largo, la hoja se desplaza hasta el renglón). Abre el texto con el ratón en coordenadas, sube el teclado de dos maneras —como el plugin de la app de la tienda (sus eventos con `keyboardHeight`, el `<body>` encogido) y como Safari (el `visualViewport` se encoge)—, imita el desplazamiento de 46 px del WKWebView, y comprueba: el cuerpo de la hoja de detrás no se mueve; la página vuelve a su sitio; en el centro de «Listo» `elementFromPoint` da «Listo» y está entero sobre el teclado; el toque lo cierra; al volver, la hoja está donde estaba (±20 px: el pie cambia de alto al irse el teclado) y el renglón se ve entero y recibe el toque.
  - **Con el código de `main` falla** en los dos casos: «con el teclado, el cuerpo de la hoja de detrás no se mueve: estaba en 79 px y quedó en 0». Con solo el cambio de `useCampoVisible` falla en «la página de detrás vuelve a su sitio: 46 !== 0». Con el arreglo entero, pasa.
- `ui/CampoLargo.componentes.test.mjs` (7, el alta de siempre): pasan.
- `npm run lint`: 0 errores (2 avisos de antes, en archivos que no toqué). `npm run typecheck`: limpio.
- `npm test`: **4 833 unitarias** en 299 archivos, todas pasan.
- `npm run test:componentes`: **754**, todas pasan (eran 752; +2 de la prueba nueva).
- `npm run inventario`: sin novedades. `npm run medir`: 60 pantallas × 4 anchos, sin novedades. `npm run build`: verde.
- **Simulador, con el arreglo, en la app de la tienda:** «Listo» pintado en 62–75 pt y caja en 47–91 (la página se queda en `scrollY` 0); cuatro de cuatro toques en «Listo» lo reciben y la capa se cierra; con texto escrito («hola», 303 → 308) se vuelve al renglón con 308/2200 y la hoja donde estaba. La «Descripción» de la edición del evento sigue cerrando a la primera.

## Capturas

[`docs/rediseno/capturas-500/`](../../../rediseno/capturas-500/): del simulador iPhone 17e (iOS 27.0), en la app de la tienda compilada contra `localhost`, llevadas a 780×1688 (390×844 a 2×) y comprimidas con `comprimir.mjs`. Abiertas una por una:

- `01-antes-editor-con-teclado.png` — **antes** (código de `main`): el texto abierto con el teclado. Arriba, un hueco blanco de ~46 px bajo la hora: la cabecera («Texto de la publicación», 303/2200, «Listo») está pintada más abajo de lo normal; ahí no es donde recibe los toques.
- `02-antes-tras-tocar-listo.png` — **antes**: tras tocar «Listo» donde se ve. La capa sigue abierta y el cursor azul quedó delante del «303»: el toque lo recibió el área de texto. Es el fallo del founder.
- `03-despues-editor-con-teclado.png` — **después**: la cabecera pegada bajo la hora, sin hueco, con «Listo» en violeta; el texto con «hola» escrito al final (308/2200) y el teclado abajo.
- `04-despues-vuelta-al-renglon.png` — **después**: tras tocar «Listo», la hoja «Publicar en Instagram» en el mismo lugar que antes de abrir: el renglón «Texto de la publicación» con 308/2200 y su resumen a dos líneas, «También en Facebook», la nota y «Publicar» en el pie.
- `05-despues-alta-descripcion-tras-listo.png` — **después**, la otra pieza que usa `ui/CampoLargo`: la edición del evento, «¿Quieres agregar algo?», tras cerrar la «Descripción» con «Listo»: el renglón resumido y el pie «Listo» del paso.

## Lo que queda

- **El iPhone del founder, con la app de la tienda** (TestFlight): el fallo solo se reprodujo ahí. Hace falta una compilación nueva de la app solo si la web no llega sola: la app carga `somosnosotros.org`, así que con el despliegue basta.
- Herramientas de la reproducción (no van al repositorio): el intermediario con el registrador de toques y de llamadas de desplazamiento, la detección del violeta en la captura y la copia de `capacitor.config.ts` apuntando a `localhost` (revertida, sin diff; también el `Package.resolved` que toca `xcodebuild`). Al terminar: la app de prueba desinstalada, el acceso directo de prueba quitado, el simulador apagado y `ConnectHardwareKeyboard` borrado como estaba.
