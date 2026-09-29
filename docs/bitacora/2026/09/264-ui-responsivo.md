# 264 · Carril lateral y reglas de tableta y escritorio (OL-236, pieza P7)

**Fecha:** 2026-09-29 · **Rama:** `ui-responsivo`, desde `origin/ui-ficha` (`1e68df23`) · **OL:** OL-236 · **PR:** #«PR» (sin unir; va montado sobre #273, `ui-ficha`, que va sobre #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Octava pieza del plan de OL-227 (doc 50, § 7); usa el armazón de P4, las raíces de P5, la hoja de Lugares de P5b y la ficha de P6.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y las decisiones del founder sobre tableta y escritorio (doc 50, § 11, puntos 2, 16, 21, 23, 39, 40, 54, 55 y 56): la barra de la app a todo lo ancho y única; la navegación como carril lateral en dos grupos (las cuatro secciones arriba, Perfil con su avatar abajo) bajo esa barra, sin esconderse y también en fichas y tareas; la barra de abajo solo en el teléfono; la fila de contexto centrada (también en Lugares) con el panel de 400 y el mapa; fichas con las barras fusionadas y a dos columnas; hojas centradas a 600; la vista `completa` sin barra ni carril. Fuentes: el prototipo firmado (`generar.py`, bloques 2 y 11) y el doc 50 (fila P7; H-07 y H-34 a H-37).

## Lo que había

- Un armazón de dos filas (barra y pantalla) con la navegación fija al pie a todos los anchos: a 1 280, una barra de 60 px de borde a borde con los cinco destinos a 120 px entre sí (H-34), las pastillas de una ficha flotando al centro de la ventana (H-36), las raíces en una columna de 600 y la ficha en una de 640 (H-07), y el panel de Lugares acabando donde empezaba la barra de abajo.
- La regla «esta vista lleva barra y navegación, esta no» escrita dos veces con `:global([data-vista]…)` (en la barra y en la navegación) y cuatro reglas que deshacían la recogida desde 792 (armazón, barra, navegación y «volver arriba»).
- `--gutter` medía sobre el ancho del armazón: con un carril, todo lo centrado quedaría corrido la mitad del carril.
- Las hojas (Cuándo, Filtros, Dónde estás…) subían desde abajo, pegadas al borde, con la misma forma a cualquier ancho.

## Lo que se hizo

### 1. El carril, una columna del armazón (`Armazon.module.css`, `NavSecciones`)
- Desde 792 la rejilla del armazón pasa de dos filas a dos columnas: `"barra barra" / "nav pantalla"`, con el carril en `--ancho-carril-nav` (88). `NavSecciones` (antes `NavInferior`: ya no es «inferior») es el mismo elemento en los dos tamaños: bajo 792, la barra fija al pie de siempre; desde 792, un `position: sticky` bajo la barra (`top: var(--barra-flujo)`, alto `100dvh − var(--barra-flujo)`, sin números sueltos) con filas «cuatro secciones · lo que sobre · Perfil». La marca de sección es la píldora del destino activo, igual que abajo. Con la ventana muy baja (un teléfono de lado) el carril se desplaza dentro de sí.
- **El armazón decide qué se ve, una vez:** dos reglas en `Armazon.module.css` (sin barra ni carril en `completa`; en el teléfono, solo en las raíces) sustituyen a las dos copias con `:global`.
- **Solo el teléfono se recoge:** `Armazon.tsx` no pone `data-recogida` con el carril y lo quita si la ventana crece hasta él (`lib/armazon.CARRIL`, el mismo `min-width: 792px` de las hojas de estilo; una prueba de vitest vigila que sigan siendo el mismo número). Se van las cuatro reglas de CSS que lo deshacían.
- **Abajo:** `--nav-abajo` vale solo la zona segura desde 792 (un `@media` en `globals.css`). Las reglas que lo leen (la raíz, Lugares, la hoja, la pastilla de la hoja, el aviso `Hecho` y «volver arriba») no cambian y el panel de Lugares llega al pie.

### 2. Los cortes de ancho
Teléfono primero y `min-width`: 792 (carril) y 1048 (raíces y fichas a la columna ancha; ficha a dos columnas). El prototipo suma un 624 solo para su fórmula del gutter; en la app no hace falta.
- **El aire de página se mide sobre la pantalla:** `.pantalla` es el contenedor (`container-type: inline-size`), así que `--gutter` ya no cuenta el carril: exacto a 820 (66 a cada lado) y a 1 280 (116), sin restar 88 ni el resto de 24 px del prototipo. Lo fijo, que mide desde el borde de la ventana, suma el carril: `Hecho` (el aviso con Deshacer, que además ya no se estira: 420 como mucho) y «volver arriba».
- **Desde 1048** las raíces y las fichas usan 960 (`--columna` y `--gutter` se dicen de nuevo en `Armazon.module.css`; `.columna` lee `--columna`, así la cabecera de Perfil y sus tarjetas coinciden); las tareas y la pantalla completa siguen con 600.
- **Fila de contexto:** centrada en la pantalla y, desde 792, sin línea propia: la raya es la de la barra, que cruza toda la ventana con el carril debajo (punto 54 del doc 50 y bloque 11 del prototipo).

### 3. La ficha (`Ficha.module.css`, sección 10)
- Desde 792 las pastillas van al final de la fila, junto al borde de la columna (`justify-self: end`), no al centro de la ventana.
- Desde 1048, dos columnas con las mismas áreas de P6: la portada a la izquierda (con sus esquinas) y a la derecha el título (sin velo, en tinta, a 30 px), los avisos y el cuerpo. La hoja de Lugares no cambia: es un panel.

### 4. Las hojas (`ui/Hoja.module.css`)
Desde 792 la hoja es un diálogo de 600 al centro de la ventana, con las cuatro esquinas redondas y sin asa (`display: grid; place-items: center` en el fondo). El cierre, el cuerpo que se desplaza con cabecera fija y el teclado abierto siguen igual. Sirve a Cuándo, Filtros, Dónde estás y a las de las altas.

### 5. Lo que se retiró
- De `Armazon.module.css`, `BarraApp.module.css`, `NavSecciones.module.css` y `Cabecera.module.css` (`.volver`), las cuatro reglas que deshacían la recogida desde 792; de la barra y la navegación, sus `display: none` por vista con `:global([data-vista]…)` y el `display: grid` que la barra volvía a poner desde 792; la raya solo «en lo que no es raíz» de la barra (ahora una, desde 792).
- `PANEL` de `HojaLugares.tsx` (usa `CARRIL`); `NavInferior` (renombrado; los comentarios que decían «barra inferior» ahora dicen «la navegación»).
- `--nav-abajo` **se queda**: lo leen seis reglas del teléfono. Lo que sí desaparece con el carril es lo que lo esquivaba (las reglas de la recogida y su `bottom`).
- La columna de 600 de H-07 solo queda entre 792 y 1047 (tableta) y en las tareas, a propósito.

## Decidí yo (para que el gestor confirme)

1. **La ficha, a dos columnas desde 1048, no desde 792.** El encargo y la nota de P6 decían «desde 792», pero el prototipo firmado la dibuja de una columna a 820 (medido: `grid-template-columns: 732px`, título sobre la portada, pastillas al centro) y de dos desde 1048 (483 + 677); y H-35 dice «desde 1024». Sigo al prototipo.
2. **Las pastillas van al final de la fila desde 792**, como pide el encargo; el prototipo las deja centradas hasta 1048. Así ninguna flota al centro de la ventana a 820 ni a 1 280.
3. **La raya de la barra desde 792 y la fila sin la suya.** El encargo decía «la única línea es la de la fila»; vale en el teléfono. Desde 792 dibujé lo del prototipo (`.cabecera { box-shadow: none }` y el filete en la barra) y lo que aceptó el founder en el punto 54.
4. **`--gutter` medido sobre la pantalla** (`container-type` en `.pantalla`) en vez de restarle el carril a mano: no hay que acordarse del 88 en cada regla, y `completa` (sin carril) sale centrada sola.
5. **Raíces y fichas a 960 desde 1048; las tareas, a 600.** El prototipo lo consigue con topes por pantalla.
6. **La hoja pierde el asa desde 792.** El prototipo la dibuja en el diálogo; no hay borde de abajo del que subirla.
7. **Portada 3:2 también en escritorio.** El prototipo usa 5:3 en la columna; con una sola proporción no hay una regla más.
8. **Solo el teléfono recoge, con un `matchMedia` en `Armazon.tsx`** en vez de cuatro reglas de CSS que lo deshacen: una regla en un sitio.
9. **El alta a 600 en escritorio.** El prototipo la dibuja a 392: aplica dos veces el aire lateral (la caja de 600 y, dentro, el `--gutter` de 104). Lo de la cabecera de la tarea con el título es de P9.
10. **No quité el margen negativo de `ui/Barra`** (la barra de las tareas, H-24 de las tareas; −296 a 1 280, antes −340). La nota de P6 lo pone en P7, la de P4 en P9 (con `.pagina:has(> header:first-child)`) y este encargo pide «0 nuevos»: cambiaría la rejilla de todas las páginas de formulario y el teléfono no puede cambiar.
11. **`entrar` y los textos legales son `tarea`, no `completa`** (el encargo los nombra como `completa`): a 792+ traen la barra y el carril, como traían la barra antes. `completa` es la pared, el mando y el letrero. Si el founder los quiere sin barra ni carril, es una línea en `lib/armazon.ts`.

## Lo que cambia a la vista

- **Desde 792:** el carril de 88 (cuatro secciones arriba, Perfil con su avatar abajo, borde a la derecha) bajo la barra, que lleva ahora su raya de borde a borde; la fila de contexto, centrada y sin raya; las raíces a 960 desde 1048; Lugares con el panel y el mapa hasta el pie; la ficha con las pastillas al final de la fila y, desde 1048, a dos columnas; las hojas como diálogos de 600 al centro.
- **En el teléfono:** nada (ver la comparación píxel a píxel).

## Verificación

- `npm run lint`: 0 errores (la advertencia que ya estaba, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 117 archivos, **1 536** pruebas (1 535 antes). `npm run build` sin variables de entorno, como la CI: verde.
- **Pruebas nuevas** (Chrome real, `node --test`): en `Armazon.componentes.test.mjs` (de 10 a 16), la barra de abajo del teléfono; el carril (88, bajo la barra, del alto de la ventana, cuatro secciones arriba y Perfil al pie, la pantalla es el resto de la rejilla); que sigue al bajar, en fichas y tareas y que la pantalla completa no lo trae; el aire de página (20 en el teléfono, 154 a 820, 204 a 1 280 en raíces y fichas, 384 en tareas, 340 en la pantalla completa; 1 060 deja el aire mínimo); que solo el teléfono recoge y una ventana que crece trae todo de vuelta; y el aviso con Deshacer y «volver arriba» pasando el carril. `Hoja.componentes.test.mjs` (4): abajo en el teléfono; diálogo de 600 al centro con cuatro esquinas y sin asa desde 792; con cabecera fija y pie; y que cierra con la ✕, Escape y tocando fuera. En vitest, el corte de JavaScript y el de la hoja de estilo coinciden. **Comprobado que fallan** sin lo que cuidan: once cambios (el carril sin `sticky`, sin el contenedor de la pantalla, con la recogida, `completa` con barra y carril, fichas y tareas con barra en el teléfono, sin la columna ancha, la hoja sin centrar y con asa, el aviso y «volver arriba» sin pasar el carril, `--nav-abajo` sin la zona segura): cada uno rompe al menos una.
- Pruebas de componente viejas, en verde: Armazon 10/10, Asistencia, HojaLugares, Destacados, FilaEventos, Seguir, BotonIcono, Kpi, Renglon y cargador (69 en total con las nuevas). `cupo`, `guardado` y `nuevos` fallan igual en el código base.
- **Recorrido real** (Chrome, respaldo inventado, 1 280×800): Inicio → Agenda → Lugares → Artistas → Perfil → Inicio tocando el carril (el activo cambia, el carril queda en 56 y 744); Inicio desplazada 700 → una ficha (el carril no se mueve) → Atrás → «+» (alta): sin errores de página.
- **Safari real** (simulador del iPhone 15 Pro, iOS 26.3; no hay un iPad simulado, así que un intermediario local le da a la página un ancho de 1 024 y de 1 280 en el `meta viewport`, y una etiqueta en la esquina dice el ancho): el teléfono sigue con su barra fija al pie; a 1 024, el carril con Perfil al pie, la fila centrada y la lista a 600; a 1 280, la lista a 960, la ficha a dos columnas con las pastillas al final y la hoja de Filtros al centro. `container-type` en `.pantalla`, el carril `sticky` y `@media` funcionan como en Chrome.
- **Teléfono, píxel a píxel** (390×844 a 2×, 18 pantallas, ambas compilaciones con la caché de imágenes tibia): **15 de 18 con 0 píxeles distintos**; Perfil, 57 (0,004 %) y las hojas Filtros y Cuándo, 6 (0,000 %), dispersos.
- **Medidas** (`medir.js` y las medidas de la barra y el carril, 18 pantallas, respaldo inventado, antes → después; iguales a 820 y a 1 280):

  | | Antes | Después |
  |---|---|---|
  | Márgenes negativos | 12 | **12** (0 nuevos: 2 del logotipo de Mapbox, 6 de `ui/Barra` en las tareas y 4 de los `h2` de Ajustes) |
  | Desbordes | 26 | **26** (0 nuevos: 20 de los «+» de las tarjetas redondas de Inicio y 6 del mapa de Mapbox) |
  | Toques de menos de 44 en la pantalla | 6 | **6** (0 nuevos: 2 del logotipo de Mapbox, 3 de Entrar —la etiqueta del campo y los dos enlaces legales— y un `input` de 1×1 oculto) |
  | Fuera de ventana · desplazamiento de lado | 0 · 0 | **0 · 0** |
  | Flotantes al centro de la ventana | 3 (las tres fichas) | **0** |
  | Toques de menos de 44 en la barra y el carril | 0 | **0** (los destinos del carril miden 72×64) |
  | Logotipo fuera del centro | 0 a 0,1 px | **0 a 0,1 px**, con y sin ficha y con «Entrar» o la llave de administración |
  | Carril | no hay | **de la barra al pie de la ventana**: 1 124 de 1 124 a 820×1 180 y 744 de 744 a 1 280×800, al principio y al final de la página (al final 55,6 a 56: el desplazamiento se redondea) |

- **Lo que esta prueba no puede ver:** un iPad real (ni la web instalada con la zona segura de abajo junto a un carril: `--nav-abajo` vale ahí lo que mida `env(safe-area-inset-bottom)`), el teclado abierto sobre una hoja centrada, un «Deshacer» tras un deslizamiento real (se probó con el componente) ni las capas fijas a pantalla completa con datos reales.

## Capturas

`docs/rediseno/capturas-264/` (38 PNG de paleta, 3,3 MB). «Antes» es la compilación de `origin/ui-ficha` y «después» esta rama, ambas con la sesión de una persona inventada del respaldo local; tableta a 820×1 180 (reducida a 1×), escritorio a 1 280×800, teléfono a 390×844 a 2×, Safari del simulador a 1 179×2 556. Cada una abierta y descrita. El recuadro con calles, un parque y un punto violeta de la tarjeta «Dónde» es un fondo de prueba puesto en lugar de la imagen estática de Mapbox (sin token ni red); en las de Safari, donde no se pudo poner, se ve el marco gris con un «?»; el mapa es un fondo liso con los pines de la app.

1. **Inicio, tableta** (`01`): antes, la barra sin raya, la fila con su raya, los carriles en una columna de 600 (empiezan a 110) y la barra de abajo de borde a borde con los cinco destinos a 120 px entre sí. Después, la barra con su raya; a la izquierda el carril (Inicio con píldora violeta, Agenda, Lugares, Artistas y, al pie, Perfil con su «A»); la fila centrada sobre lo que deja el carril y sin raya; los carriles empiezan a 154; sin barra de abajo.
2. **Lugares con la ficha, tableta** (`02`): antes, el panel de 400 pegado al borde de la ventana con la ficha, el mapa a la derecha y la barra de abajo cortando el panel con «Seguir» sobre ella. Después, carril, panel de 400 desde 88 con la ficha completa hasta el pie, mapa desde 488 y «Seguir» centrada en el panel.
3. **Inicio, escritorio** (`03`): antes, columna de 600 al centro (340 a 940) y la barra de abajo con los cinco destinos a 120 px. Después, carril, columna de 960 (204 a 1 164, «Ver mi perfil» en su borde), fila centrada sobre la pantalla y sin raya, raya bajo la barra.
4. **Agenda** (`04`): antes, lista de 600 con las rayas de los días a todo lo ancho y la barra de abajo. Después, la lista a 960 con la marca al borde derecho de la columna, las rayas de los días desde el carril hasta el borde y la fila sin raya.
5. **Lugares** (`05`): antes, el panel pegado a la ventana con «9 lugares» y los renglones cortados por la barra de abajo. Después, carril, panel desde 88 hasta el pie con seis renglones, mapa el resto y la fila centrada.
6. **Lugares con la ficha** (`06`): lo mismo que `02` a 1 280: el panel de 400 con el héroe, los tres números, siete acciones (cinco y dos) y «Próximos eventos», y «Seguir» a 16 del pie del panel.
7. **Artistas** (`07`): antes, la tira «# A F O P» en la columna de 600 y la barra de abajo. Después, carril con Artistas activo, la fila (solo la ciudad) centrada, la tira alineada con la columna de 960, sin raya, y los botones de seguir al borde de la columna.
8. **Perfil** (`08`): antes, la cabecera, el aviso «Falta una línea sobre ti», las tarjetas Voy y Sigo y los días en la columna de 600 (340 a 940), con Perfil activo en la barra de abajo. Después, todo en la columna de 960 (la cabecera y el aviso coinciden con las tarjetas: `.columna` sigue a `--columna`), con Perfil activo en el carril y el avatar en su píldora.
9. **Ficha de evento** (`09`): antes, el héroe de 640 con el título sobre el velo, las tarjetas en 600 y las pastillas «Me interesa» y «Vas» flotando al centro de la ventana. Después, dos columnas: la portada a la izquierda con sus esquinas, el título en tinta a la derecha, tarjetas, acciones, «Dónde» y «Sobre el evento»; las pastillas al final de la fila, con su borde en el de la columna.
10. **Ficha de lugar** (`10`): antes, el héroe de 640 con MUSEO y el título sobre el velo, las siete acciones en una fila y «Seguir» al centro. Después, portada a la izquierda; a la derecha MUSEO en violeta suave, el nombre a 30 px, los tres números, las siete acciones en una sola fila, «Próximos eventos» y «Dónde»; «Seguir» al final de la fila.
11. **Ficha de artista** (`11`): antes, el héroe con el símbolo SN, el avatar, ARTES VISUALES, el nombre y la meta sobre el velo. Después, la portada SN a la izquierda y, a la derecha, el avatar con aro, la etiqueta, el nombre y la meta en tinta, los números, Compartir y Sitio web, «Próximas fechas», «Sobre» y el pie; «Seguir» (persona con «+») al final de la fila.
12. **Alta de evento** (`12`): antes, la cabecera de la tarea (con su raya y la ✕ a 918) y el formulario de 600 a 340. Después, con el carril, la cabecera con la ✕ en el borde de la columna (962) y el formulario de 600 centrado en la pantalla (384 a 984).
13. **Ajustes** (`13`): antes, «Atrás», el título y las tarjetas en 600 (340 a 940). Después, lo mismo centrado en la pantalla (384 a 984), con el carril.
14. **Hoja de Filtros** (`14`): antes, subía desde abajo, pegada al borde, de 600 (340 a 940), con el asa y solo las esquinas de arriba redondas. Después, un diálogo de 600 al centro de la ventana (centro a 640, de 241 a 559 de alto), con las cuatro esquinas redondas y sin asa; el fondo oscurece también la barra y el carril.
15. **Hoja «Dónde estás»** (`15`): antes, al pie (504 a 800) con el asa; después, al centro (262 a 538), con las cuatro esquinas.
16. **Inicio, teléfono** (`16`): antes y después idénticas: «+», logotipo, lupa y campana; la fila; «Tus planes» y «Seleccionados para ti»; la barra de abajo con Inicio activo.
17. **Ficha de evento, teléfono** (`17`): antes y después idénticas: portada a los bordes con «‹» y «···», título sobre el velo, tres números, acciones, «Dónde» y las pastillas al centro.
18. **Safari, teléfono** (`18`): la Agenda en el teléfono (iPhone 15 Pro, iOS 26.3), con la barra de la app arriba, la fila, los días, la barra de abajo fija sobre la barra de Safari.
19. **Safari, ancho de 1 024** (`19`): la Agenda con el carril (Agenda activa, Perfil al pie), la fila centrada, la lista a 600 con las rayas de los días de borde a borde; la etiqueta roja dice `innerWidth=1024 min792=true`.
20. **Safari, ancho de 1 280, ficha** (`20`): la ficha de evento a dos columnas (portada con esquinas, título, números, acciones, «Dónde» con el marco gris de Mapbox sin imagen, «Sobre el evento», «Quién va») con las pastillas al final de la fila y Perfil al pie del carril.
21. **Safari, ancho de 1 280, hoja de Filtros** (`21`): la Agenda a 960 oscurecida y la hoja de Filtros como diálogo al centro.

**Contra las firmadas del prototipo** (`docs/rediseno/capturas-256/`, rama `restructura-ui`): Inicio a 820 y a 1 280 (99 y 101), Lugares y su ficha (100, 102 y 103), Agenda (130), Perfil (109) y las fichas y el alta (105 a 108) tienen la misma estructura: barra con raya, carril en dos grupos, fila centrada sin raya, panel de 400 y mapa, dos columnas con las pastillas a la derecha. Lo que difiere: los datos (el prototipo tiene tres tarjetas en «Tus planes» y tres números en Perfil; la app, los del respaldo); las tarjetas grandes del carril a 190×285 desde 1048 (la app deja 165×248: es de P10); la portada 3:2 y no 5:3 (decisión 7); la hoja sin asa (6); el alta a 600 y con el título fuera de la cabecera (9; el título es de P9); la ficha a 820 en una columna, como el prototipo (medido en él; la firmada de la ficha es solo de escritorio). Artistas, Ajustes y las hojas no tienen captura firmada.

## Anotado para las piezas que siguen

- **P8 (mapa).** Las capas fijas a pantalla completa (`HojaDondeEs`, `HojaDondeLugar`, `CampoLargo`) miden su aire con el ancho de la pantalla, sin el carril: a 1 280 su columna sale de 688 y no de 600 (centrada y sin romper nada; capturado). `Mapa` y la tarjeta «Dónde» no cambian.
- **P9 (altas).** A 792+ la tarea son la barra de la app, el carril, su cabecera propia (56, con raya) y el formulario a 600; `ui/Barra` conserva su margen negativo (−`--gutter`) y `.pagina:has(> header:first-child)` sigue en `globals.css`.
- **P10 (tarjetas y chips).** El prototipo lleva desde 1048 las tarjetas grandes del carril a 190×285; `Destacados.module.css` conserva 165 y 248 a mano: con los tokens `--tarjeta-grande` y `--tarjeta-grande-foto` (ya en `:root`) basta un `@media (min-width: 1048px)` que los cambie, y el esqueleto los sigue.
- **P12 (limpieza).** La propiedad `completa` de `ui/Hoja` y su `.completa` no las usa nadie. `usePunteroFinoAncho` corta en 760 (otro número). Con la ventana más baja que 447 (un teléfono de lado: 852×393) el carril se desplaza dentro de sí y Perfil queda al final del desplazamiento; apretarlo con un corte por alto sería una medida por pantalla y no se hizo. `Hecho` (el aviso) tiene 420 de tope puesto a mano.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin las pruebas, la pieza suma 136 líneas netas (251 añadidas y 115 quitadas; el CSS +118 y el TypeScript +18); las pruebas, 240 (248 y 8).

**Nuevos:** `ui/Hoja.componentes.test.mjs`, esta bitácora y `docs/rediseno/capturas-264/`. **Renombrados:** `NavInferior.tsx` y `.module.css` a `NavSecciones`. **Con cambios:** `globals.css`, `layout.tsx`, `template.tsx` y su CSS, `Armazon` (`.tsx`, `.module.css` y su prueba), `BarraApp.module.css`, `Hecho` (`.tsx` y CSS), `PerfilEnNav`, `MemoriaPantalla` y `MemoriaScroll` (comentarios), `ui/Cabecera.module.css`, `ui/Ficha.module.css`, `ui/Hoja.module.css`, `lugares.module.css`, `HojaLugares` (`.tsx` y CSS), `lib/armazon` (y su prueba), `lib/avisosPreguntados` y `lib/memoriaPantalla` (comentarios); documentos: `docs/diseno/LINEA_GRAFICA.md` (la navegación, «Una columna en cualquier pantalla», la ficha y «El armazón») y `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
