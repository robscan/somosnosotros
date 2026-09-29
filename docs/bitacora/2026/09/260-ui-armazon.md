# 260 · Armazón único: barra de la app, cinco destinos y fila de contexto (OL-232, pieza P4)

**Fecha:** 2026-09-29 · **Rama:** `ui-armazon`, desde `origin/ui-renglon` (`0e7fd34f`) · **OL:** OL-232 · **PR:** #270 (sin unir; va montado sobre #269, `ui-renglon`, que va sobre #268, `ui-botones`) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Cuarta pieza del plan de OL-227 (doc 50, § 7); usa los tokens de P1, los botones de P2 y el renglón de P3.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y las reglas del founder sobre el armazón: barra de la app y fila de contexto son **una región** (mismo blanco, sin raya entre ellas, la única raya va bajo la fila); al jalar hacia abajo lo que asoma entre las dos es blanco, nunca el fondo del listado; nunca una segunda barra con título desde 792; `data-vista` lo pone el layout y el CSS solo lo lee (sin `:has()`); cinco destinos. P4: un solo armazón, la barra única con «+» · Atrás · logotipo · lupa · campana · menú, la fila de contexto pegajosa, sin el flotante `Publicar`, la tira de letras de 44 y `--gutter` en `100cqw` si sale simple. Solo puede cambiar a la vista la barra nueva, el flotante que desaparece, los cinco destinos, una sola cabecera con su raya abajo y la tira; cualquier otra diferencia es un defecto de quien lo hace.

## Lo que había

- **Cada pantalla raíz armaba su barra, su navegación y su flotante** (`<Barra derecha={<Sesion />} />`, `<NavInferior />` y `<Publicar />` en Inicio, Agenda, Artistas, Lugares y Borrado; la barra por página, cuatro destinos).
- **H-04:** la barra del logotipo (56) se iba con el desplazamiento; la cabecera de contexto (60 en Inicio, 104 con pestañas) era pegajosa y escondía su primer renglón al bajar: dos cabeceras, dos comportamientos.
- **H-01, H-08, H-15:** el flotante `Publicar` (fijo, abajo a la derecha) tapaba accionables. Barrido cada 100 px a 390×844: **19** enlaces y botones cubiertos por un flotante (Inicio 2, Agenda 8, Lugares lista 8 —con el conmutador Mapa · Lista incluido—, Artistas 1).
- **H-18:** la tira de letras era otra pieza pegajosa aparte, con `margin-bottom: -44`, escondida hasta llegar a la primera letra, y sus letras medían 34×44 (5 toques menores de 44 en Artistas, 4 en la lista de Lugares).
- `--gutter` medía con `100vw` (H-38: cuenta la barra de desplazamiento clásica).

## Lo que se hizo

### 1. El armazón y sus vistas

`Armazon` (cliente, en el layout, `Armazon.tsx` y `.module.css`): una rejilla de dos filas, la barra y la pantalla (la página tal cual llega; el desplazamiento sigue siendo el de la ventana), con la navegación fija al pie. Pone `data-vista` con `vistaDeRuta(usePathname())` (`lib/armazon.ts`, puro y probado) y el CSS solo lee ese atributo y `data-recogida`. Sin `:has()`. El servidor ya lo escribe en el HTML (`curl` a cinco rutas).

| Vista | Rutas | Teléfono | Desde 792 |
|---|---|---|---|
| `raiz` | `/`, `/agenda`, `/lugares`, `/artistas`, `/perfil`, `/borrado` | barra de la app + navegación; se recogen al bajar | barra a todo lo ancho (no se recoge) + navegación al pie |
| `ficha` | `/eventos/:id`, `/lugares/:id`, `/artistas/:id`, `/personas/:id` | su propia cabecera (`ui/Barra`, sin tocar); sin barra ni navegación de la app | barra de la app con Atrás y el menú; la cabecera propia no se ve |
| `tarea` | altas y ediciones (`…/nuevo`, `…/editar`), `/ajustes/**`, `/entrar`, `/novedades`, `/admin/**`, `/reglas`, `/privacidad`, `/ayuda`, 404 y error | su propia cabecera; sin barra ni navegación de la app | barra de la app sin Atrás ni menú, y debajo su cabecera propia |
| `completa` (cuarta, ver «Decidí yo») | `/obra/:id/pared`, `/obra/:id/mando`, `/artistas/:id/letrero` | sin barra ni navegación | sin barra ni navegación |

Perfil pasa a **raíz** (su «Atrás» y el logotipo chico salen: la barra y la navegación son las de las demás). `/borrado` se queda raíz, como hoy.

### 2. La barra de la app (`BarraApp`, `BarraApp.module.css`)

Tres celdas de una rejilla, `minmax(var(--flanco), 1fr) auto minmax(var(--flanco), 1fr)`: a la izquierda «+», Atrás y administración; en medio el logotipo; a la derecha la lupa, la sesión y el menú. Los dos lados valen lo mismo, así que el logotipo cae en el centro exacto pase lo que pase en ellos (ver el punto 8). Atrás y el menú tienen su lugar desde 792 aunque no haya ficha (`hueco`, dos envoltorios que en el teléfono no existen): la lupa y la campana no se mueven al pasar de una pantalla a otra, como en el prototipo, que los deja `visibility: hidden`. Todo es `BotonIcono` a 44; iconos de 26 (el «+» es un icono nuevo del prototipo, `IconoCrear`). Sticky arriba, blanca, sin raya (desde 792, en las fichas y las tareas, que no traen fila de contexto debajo, lleva la suya para cerrar la región), con la franja de la hora dentro (`--tope`).

- **«+»** lleva a la misma alta que el flotante en cada sección (evento en Inicio, Agenda y Perfil; lugar en Lugares; artista en Artistas) con la ciudad que se ve (`?ciudad=` en evento y artista, como el flotante); fuera de esas secciones, evento. Con o sin sesión, como antes. El prototipo no distingue secciones: es una sola alta genérica; se siguió el comportamiento de hoy.
- **Sesión** (`Sesion` y `AccesoAdmin`, en el servidor, las dos en `Sesion.tsx`): sin sesión «Entrar», con el relleno compacto de `Boton` (55 × 44); con sesión la campana (con su punto) en el lado derecho y, para administración, la llave en el izquierdo, junto al «+» (otro componente porque va en otra celda). La foto de perfil ya no vive arriba: es el quinto destino de la navegación.
- **Lupa:** abre la búsqueda de la pantalla (Inicio, Agenda, Lugares, Artistas la traen y se la prestan a la barra); en una pantalla sin búsqueda propia (Perfil, una ficha) es un enlace a la de Inicio ya abierta y con el cursor (`/?buscar=1`); sin JavaScript también funciona.
- **Atrás y menú desde 792** (`prestamoBarra.ts`, `EnBarra.tsx`): la cabecera interior de la ficha le presta a la barra su Atrás (con la misma marca del historial: `useVolver`, ahora también en `AtrasIcono`) y su menú «···», que se pinta en la barra; desde 792 esa cabecera no se ve (nunca dos barras) y la ficha empieza en el mismo punto.
- **Se recoge** (teléfono, raíces): al bajar más de 120 px con el dedo bajando, la barra sube y la navegación baja (`data-recogida`, un solo atributo: en el prototipo eran dos, `data-compacta` y `data-nav-oculta`, y siempre se movían juntos); vuelven al subir un poco, cerca del inicio, al llegar al final y en cada pantalla nueva; 300 ms de calma tras cada cambio. La fila de contexto sube con ella (`top: var(--barra-vista)`, variable del armazón que también usan los títulos de día); todo con `transform` y `top`, sin cambiar de alto, así el desplazamiento no salta.

### 3. La fila de contexto y la tira

`ui/Cabecera`: una sola cabecera pegajosa bajo la barra (o arriba del todo si la barra se recogió). Ya no esconde su primer renglón (eso lo hace ahora la barra; en pixeles útiles sale igual, ver abajo), ya no lleva la lupa (la de la barra) ni `--fila1`, y publica solo `--alto-cabecera`. La raya va solo abajo de toda la cabecera (las pestañas dejan de pintar la suya). Relleno blanco de 300 px sobre la fila (`::before`, sin recibir toques) para el rebote. `TiraLetras` es ahora la última fila de la cabecera (Artistas y, levantada a `VistaLugares`, la lista de Lugares): sin pegajoso, sin fondo, sin margen negativo y sin esconderse; 44×44 cada letra; `irAlGrupo` recoge la barra antes de medir.

### 4. La navegación de cinco destinos

`NavInferior`: Inicio · Agenda · Lugares · Artistas · Perfil (`DESTINOS` en `lib/armazon.ts`), con la foto de la persona en la píldora de Perfil (`PerfilEnNav`; sin sesión, la figura). Sigue fija al pie (ver «Decidí yo»); se recoge con la barra; cada destino vuelve a la última URL de su sección (Perfil no tiene filtros que recordar).

### 5. Lo que se retiró

`Publicar.tsx` y `.module.css` (el flotante), `IconoPinMas` e `IconoEstrellaMas` (solo los usaba él), el `.raiz` de `ui/Barra` (la barra de raíz por página), `--fila1`, `--cabecera-animacion`, `antesDeSaltar`, el `acciones` de `Cabecera` (nadie lo usaba). **`verOtraVista` (el conmutador Mapa · Lista) se queda hasta P5**, como decidió el gestor: baja al sitio de «Registrar lugar» (16 px sobre la navegación).

### 6. La sesión pasa al layout (lo que cuesta)

La barra y la navegación viven en el layout, que Next no vuelve a pintar al navegar: la campana, «Entrar» y la foto se leen una vez por carga de documento (`usuarioDeLaBarra`, con `cache`: una sola lectura por petición, no una por pieza) y se releen cuando cambia la sesión desde dentro de la app. Comprobado en Chrome con la app compilada: **cerrar sesión** cambia la barra a «Entrar» y Perfil a la figura sin recargar (`revalidatePath("/", "layout")` en `cerrarSesion`, `borrarMiCuenta`, `guardarPerfil`, `marcarNovedadesVistas` y `revalidarFicha` de Administración, que antes revalidaban cada pantalla por separado); **entrar** con el código llama a `router.refresh()` (`useTerminar`, sin tocar) y la barra pasa a la campana sin recargar. Lo que no se relee solo: un cambio de sesión hecho fuera de la app (otra pestaña) y el punto de la campana cuando llegan novedades en mitad de una visita; se ve en la siguiente carga o al refrescar. Consecuencia de servidor: `/ayuda`, `/privacidad`, `/reglas` y «No está» pasan de estáticas a dinámicas (leen la cookie desde el layout); se sirven igual, sin caché de CDN.

### 7. `--gutter` en `100cqw`

Sale simple (una línea en `globals.css` y `container-type: inline-size` en `.armazon`) y se hizo. Chrome: 0 diferencias (las pantallas de teléfono que no llevan barra de la app son idénticas píxel a píxel). **WebKit real** (iPhone SE, iOS 26.3, Safari en el simulador): con una página de prueba, `container-type: inline-size` no atrapa a los hijos `position: fixed` (la navegación, el toast y las hojas siguen anclados a la ventana) y `100cqw` mide el ancho del contenedor (375 → gutter 37,5 con una columna de 300); en la app, el teléfono lee 20 px. Lo que sube por portal a `body` (las hojas) no tiene contenedor y mide la ventana, como antes.

### 8. Corrección tras la revisión del gestor (dos defectos, misma rama)

El gestor no aceptó la primera entrega por dos defectos que se veían en su propio reporte.

**a) El logotipo, en el centro exacto.** Sin sesión quedaba 13,7 px a la izquierda del centro (a 390, 375, 360 y 320, y desde 792 en raíz y ficha): «Entrar» es más ancho que la campana y las columnas fijas dejaban a los dos lados con anchos distintos; con sesión estaba bien y los recién llegados nunca la tienen. Ahora la barra es la rejilla de tres celdas del punto 2: `--flanco` (`--control` + 3,5 rem: la lupa y «Entrar», lo más ancho que llega a haber junto al logotipo) es lo que cada lado reserva como mínimo y lo que sobre se reparte a partes iguales; el centro no depende de lo que haya en los lados ni de si la sesión ya llegó del servidor. En una ventana angosta el que cede es el logotipo, no su posición: a 320 mide 96 px con y sin sesión (antes 120 con sesión y 92,6 sin ella). «Entrar» pasa a 55 × 44 con el relleno compacto que `Boton` ya ofrece (`--boton-relleno`, como `Atras`). La llave de administración, que va en el lado izquierdo, es ahora `AccesoAdmin`, un componente de servidor aparte de `Sesion` (que va en el derecho): con ella los dos lados quedan iguales, sin dejar de estar en su sitio junto al «+». Antes de tocar nada se midió la barra en 14 casos (anchos, con y sin sesión, raíz y ficha; con la app compilada, Chrome real, `centro2.mjs` de la sesión) y se volvió a medir después, con una persona y con una administradora (el respaldo local inventado con rol admin). Desviación del centro del logotipo respecto del centro de la barra, en píxeles (el −0,01 es el redondeo de la rejilla a 1/64 de píxel; a la vista, cero):

| Caso | Antes | Después |
|---|---|---|
| 390, con sesión | −0,01 | −0,01 |
| **390, sin sesión** | **−13,73** | −0,01 |
| 375, sin sesión | −13,73 | −0,01 |
| 360, sin sesión | −13,72 | 0 |
| 320, con sesión | 0 | 0 |
| **320, sin sesión** | **−13,72** | 0 |
| 390 y 320, administradora | (con la llave estaba centrado) | −0,01 y 0 |
| Raíz a 1 280, con / sin sesión | −0,01 / −13,73 | −0,01 / −0,01 |
| Ficha a 792, 1 024 y 1 280 (Atrás y menú a la vista), con sesión | −0,01 | −0,01 |
| **Ficha a 792, 1 024 y 1 280, sin sesión** | **−13,73** | −0,01 |
| Ficha a 1 280, administradora | — | −0,01 |

Con la administradora, el hueco entre el logotipo y lo que tiene a cada lado sale igual a la izquierda y a la derecha (25,8 y 25,8 a 390; 12 y 12 a 320): los dos lados pesan lo mismo. El hueco entre la caja del logotipo y la lupa a 320 sin sesión es de 0,56 px (la lupa dibuja 26 px dentro de sus 44, así que a la vista quedan unos 9).

**WebKit real** (iPhone SE, iOS 26.3): el simulador no tiene ventanas de 320, así que se armó una página de prueba con la barra real (su HTML y sus hojas de estilo, servidas por la app) a 320, 290, 375 y 390. Centro del logotipo: 160,00 de 160, 145,00 de 145, 187,49 de 187,5 y 194,99 de 195, con los dos lados iguales (100 y 100, 100 y 100, 106,3 y 106,3, 113,8 y 113,8) y el logotipo achicándose igual que en Chrome (96 y 66 px a 320 y 290). Y la app real, sin sesión, a 375: «Entrar» compacto y el logotipo al centro (capturas 26 y 27).

**b) Dos logotipos desde 792 en las tareas.** La entrega anterior dejaba, desde 792 y en alta, Ajustes y Entrar, el logotipo de la barra de la app y, debajo, el de la cabecera propia de la tarea: una segunda barra con logotipo que P4 creaba y que no puede esperar a P9. Ahora, desde 792, la cabecera de una tarea no lo repite (`:global([data-vista="tarea"]) .logotipo { display: none }` en el corte de 792 de `ui/Barra.module.css`, leyendo solo `data-vista`, sin `:has()`); le quedan su Atrás (o su ✕) y, debajo, el título de la pantalla. El teléfono no cambia (ahí la cabecera de la tarea es la única barra y lleva el logotipo), ni las fichas (desde 792 no traen cabecera) ni la pantalla completa. Capturas 20 a 23.

**Pruebas nuevas** (`Armazon.componentes.test.mjs`, 7 → 10): el logotipo al centro con sesión, con «Entrar» y con la llave, a 390 y a 320 (seis combinaciones: centro a menos de 0,5 px y sin pisar al «+» ni a la lupa); Atrás y menú a 1 280 con «Entrar» y con la llave (centro a menos de 0,5 px); la lupa y la campana no se mueven cuando llegan Atrás y el menú; y una sola cabecera con logotipo en una tarea (en el teléfono, la de la tarea; desde 792, la de la barra de la app y la ✕ de la tarea sigue). Comprobado que fallan: sin el mínimo de los lados (`1fr auto 1fr`) la de las seis combinaciones falla a 320, y sin la regla de `data-vista="tarea"` falla la de la cabecera.

## Decidí yo (para que el gestor lo confirme)

1. **`data-recogida`** en lugar de los dos atributos del prototipo.
2. **Una cuarta vista, `completa`**: la pared y el mando de una obra colectiva y el letrero para imprimir traen su propia pantalla y, desde 792, la barra de la app los estorbaría (y saldría en el papel).
3. **La lupa** abre la búsqueda de la pantalla y, sin ella, la de Inicio: en el plan nadie tiene la pantalla «Buscar» (doc 50: «la lupa abre la pantalla de búsqueda…, Recientes y atajos»); esto conserva lo que hay.
4. **La navegación sigue `position: fixed`**, no es un área del grid: una pegajosa abajo es justo lo que `MemoriaScroll` documenta que WebKit en modo app repinta mal (bitácora 043), y no quise estrenar eso en el iPhone del founder; el grid tiene dos filas y P7 la vuelve columna.
5. **La fila de contexto ya no se esconde al bajar** (lo hace la barra), y la tira de letras **ya no espera** a la primera letra: es parte de la cabecera y siempre se ve, como en el prototipo firmado (cambia lo que pidió el founder el 2026-09-19).
6. **La sesión en el layout** (punto 6): cuatro pantallas estáticas pasan a dinámicas.
7. **Un envoltorio a cada lado de la barra** (los dos `lado`, más los dos `hueco` desde 792) a cambio de que el logotipo quede siempre al centro exacto, con y sin sesión (punto 8): lo que la revisión pidió, y lo que pedía el prototipo (que reserva las mismas columnas a cada lado). El reparto por columnas fijas de la primera entrega lo había intentado sin envoltorios y no pudo con «Entrar». A 320 el logotipo mide 96 px con o sin sesión; el precio de que la geometría no dependa de la sesión es que con sesión, a 320, pasa de 120 a 96.
8. **La llave de administración es su propio componente de servidor** (`AccesoAdmin`), porque va en el lado izquierdo de la barra y la sesión en el derecho; las dos se suspenden en paralelo y leen al usuario una sola vez (`cache`).

## Lo que cambia a la vista

**A. Lo que el encargo enumera** (capturas 01 a 04, 08 a 15)
- Barra nueva: «+» a la izquierda, logotipo al centro, lupa y campana; la foto pasa a Perfil, en la navegación.
- El flotante desaparece: los accionables que tapaba quedan a la vista (11 → 0 en Inicio, Agenda y Artistas; en la lista de Lugares 8 → 6, ver abajo).
- Cinco destinos; una sola cabecera con su raya abajo; la tira de letras dentro de ella, siempre visible, con letras de 44×44.
- Desde 792: la barra a todo lo ancho con Atrás y el menú en las fichas.

**B. Lo que trae tener un solo armazón**
- Perfil es raíz: barra y navegación en lugar del «Atrás» y el logotipo chico.
- Al bajar, la fila de contexto se queda arriba (antes se escondía) y la navegación se va con la barra: en pixeles útiles sale igual.
- Artistas y la lista de Lugares: la tira siempre visible resta 44 px al reposo (668 → 624 y 624 → 580).
- La lupa de una sección sin búsqueda propia (Artistas con menos de 8, por ejemplo) lleva a la de Inicio.
- Desde 792, las tareas (altas, ajustes…) muestran la barra de la app y, debajo, su cabecera propia sin el logotipo (le quedan su Atrás o su ✕ y, debajo, el título): un solo logotipo, el de la barra.
- «Mis artistas» (Artistas, con sesión) queda debajo de la tira.

**C. Lo que no cambia** (comprobado con una comparación píxel a pixel de las capturas, script de la sesión)
- A 390 son idénticas, píxel a píxel, en página completa también: evento, alta de evento, ajustes, lugar, artista y novedades (las cabeceras de esas vistas no se tocaron).
- A 1280, evento, lugar y artista cambian solo en las filas 6 a 49 (la barra); la ficha empieza en el mismo punto (68 px) y todo lo de abajo es idéntico.
- **La corrección contra la entrega anterior** (30 capturas de las 15 pantallas, a 390 y a 1280, la misma comparación píxel a píxel): las pantallas de teléfono sin barra de la app (evento, alta, ajustes, artista, novedades y las recogidas) son idénticas; en las que la traen cambian unos 250 píxeles del borde del logotipo (su centro no se movió: 194,99 en las dos) y, en tres listas largas, la foto de un cartel que cargó a destiempo (dos capturas de la misma compilación y la misma espera salen idénticas). A 1280 lo único que cambia además del borde del logotipo es el logotipo repetido de las tres tareas de la muestra (alta, Ajustes y Novedades; filas 72 a 96); la lupa y la campana están en el mismo punto que antes.

## Verificación

- `npm run lint`: 0 errores; una advertencia que ya estaba (`docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 114 archivos, **1 484** pruebas (10 nuevas, `lib/armazon.test.ts`: la vista de cada ruta, el «+», la lupa y los cinco destinos). `npm run build` sin variables de entorno, como la CI: verde, 29 páginas.
- **Prueba de componente** (Chrome real con esbuild; no entra en `npm test`): `Armazon.componentes.test.mjs`, **10 de 10**: `data-vista` por ruta, barra y navegación (56 y 60) en la raíz y ninguna en ficha, tarea y completa, recogida y vuelta (barra en −56, navegación en 844, fila en 0), regreso al llegar al final y en cada pantalla nueva, todos los botones a 44, el relleno blanco de 300 px sin tapar la barra y, desde 792, Atrás y menú solo en la ficha (con la lupa y la campana quietas), sin recoger y nada en la pantalla completa; más las tres de la corrección del punto 8 (el logotipo al centro con sesión, con «Entrar» y con la llave a 390 y a 320; en una ficha a 1 280; y una sola cabecera con logotipo en una tarea). Se comprobó que la de la recogida falla si se quita `translateY(-100%)` de la barra y que las dos de la corrección fallan si se quita su arreglo.
- **La app compilada en Chrome** contra el respaldo local (32 comprobaciones, script de la sesión): las de la prueba de componente con la app real más el «+» de cada sección con y sin `?ciudad=`, la lupa en Agenda, Lugares y Perfil, el salto a una letra (la barra se recoge antes de medir y el grupo queda a 103,7 de una cabecera que termina en 104), la memoria de la barra inferior (Agenda vuelve a `/agenda?filtro=siguiendo`), Atrás y el menú de la barra en una ficha a 1280 (el menú abre su hoja y Atrás vuelve a `/agenda`), «Entrar» y la figura sin sesión, y cerrar sesión sin recargar. Todas en verde. Después de la corrección se repitió la medida del centrado en los 14 casos, con persona y con administradora (punto 8), y la auditoría de las 15 pantallas a 390 y a 1 280 contra la entrega anterior (cuadro C).
- **WebKit real** (capturas 16 a 19): Agenda arriba; recogida al bajar con el dedo (barra y navegación fuera, la fila y las pestañas arriba, el ↑ baja); el rebote al jalar (la barra, la fila y las pestañas se mueven juntas y arriba asoma blanco, nunca el fondo del listado); Artistas con la tira dentro de la cabecera. No se probó en WebKit desde 792 (el simulador es un teléfono); la barra corregida sí, a 320, 290, 375 y 390 (punto 8).
- **Medidas** (`medir.js`, 15 pantallas a 390×844, antes / después):

  | | Antes | Después |
  |---|---|---|
  | Toques de menos de 44 | 18 | **4** (todos enlaces de texto dentro de una frase, de P6 y P12); en barras, cabecera, navegación y tira: **0** |
  | Márgenes negativos | 31 | **27** (salen los de las dos tiras y el de la cabecera de Perfil; ninguno nuevo) |
  | Desbordes | 32 | 32 (ninguno nuevo) |
  | Envoltorios / sin estilo | 103 / 30 | **65** / 30 |
  | Nodos | 2 122 | **1 888** |
  | Fuera de la ventana, desplazamiento horizontal | 0 | 0 |

- **Accionables tapados por un flotante** (≥ 50 % de su caja, barrido cada 100 px, script de la sesión): Inicio 2 → **0**, Agenda 8 → **0**, Artistas 1 → **0**, Perfil 0 → 0; **Lugares (lista) 8 → 6, todos por «Ver en mapa»**: el conmutador se queda hasta P5, como se acordó; con él visible, esa lista no llega a 0.
- **Alturas a 390×844** (medidas en el DOM con un script de la sesión):

  | | Antes | Después |
  |---|---|---|
  | Barra | 56, no pegajosa (se iba con la página) | 56, pegajosa; se recoge (visible 0) |
  | Fila de contexto | 60 en Inicio, 104 en Agenda y Lugares; al bajar se compactaba a 0 y 44 | igual, sin compactarse |
  | Navegación | 60, siempre | 60; se recoge |
  | Útil, Inicio (reposo → desplazando) | 668 → 784 | 668 → 784 |
  | Útil, Agenda | 624 → 740 | 624 → 740 |
  | Útil, Artistas | 668 → 740 (la tira, escondida en reposo, sale al llegar a la primera letra) | 624 → 740 (la tira siempre visible) |
  | Útil, Lugares (lista) | 624 → 696 | 580 → 696 |

  («Desplazando» es al 60 % de lo que se puede bajar en cada pantalla: con el respaldo las páginas son cortas y en el final la barra y la navegación vuelven, por la regla del final. Al desplazar sale igual porque la barra y la navegación que se van compensan lo que la fila ya no esconde.)
- `grep`: **0** `:has(` en los archivos del armazón (`Armazon`, `BarraApp`, `Barra`, `Cabecera`, `NavInferior`, `TiraLetras`, `Sesion` y el layout); queda **1** en `globals.css` (`.pagina:has(> header:first-child)`, de las altas: sale con P9). Un solo corte de ancho, **792**, en seis módulos (`Armazon`, `BarraApp`, `Barra`, `Cabecera`, `NavInferior`, `Ficha`): es el de Atrás y el menú que firmó el founder, no una medida por pantalla; **0** medidas por ruta.

## Capturas

`docs/rediseno/capturas-260/` (40 PNG de paleta, 3,6 MB). «Antes» es la compilación de `origin/ui-renglon` y «después» esta rama, ambas con la sesión de `ana@example.com` del respaldo local inventado; cada una abierta y descrita.

1. **Inicio a 390** (`01`): antes, el logotipo a la izquierda, campana y foto a la derecha, la lupa en la fila del chip de ciudad y «Publicar evento» flotando sobre la tarjeta de «Seleccionados para ti», cuatro destinos. Después, «+», logotipo al centro, lupa y campana; el chip de ciudad solo en su fila con la raya debajo; sin flotante; cinco destinos con la «A» de Ana en Perfil. Todo lo demás, en el mismo punto (Tus planes a 340 px en las dos).
2. **Agenda** (`02`): igual, con el «Voy» de la tercera fila que el flotante tapaba ya a la vista.
3. **Lugares, mapa** (`03`): la barra nueva; «Ver en lista» baja al sitio de «Registrar lugar»; el mapa mide lo mismo y la página no se desplaza.
4. **Artistas** (`04`): la tira «# A F O P» como última fila de la cabecera, siempre visible, con la raya debajo (antes escondida hasta la primera letra); el listado baja 44 px; sin «Registrar artista» flotante.
5. **Evento** (`05`), 6. **alta de evento** (`06`) y 7. **Ajustes** (`07`): idénticas antes y después (cabecera propia: Atrás, logotipo y ···; ✕ en el alta).
8. **Inicio con la barra recogida** (`08`): antes, la fila del chip escondida, la navegación a la vista y el flotante; después, la fila del chip pegada arriba del todo, barra y navegación fuera y el ↑ abajo.
9. **Agenda con la barra recogida** (`09`): antes, solo las pestañas pegadas (44) y los títulos de día bajo ellas; después, la fila del chip y las pestañas pegadas (104), los títulos bajo ellas, barra y navegación fuera.
10. **Inicio a 1 280** (`10`): la barra a todo lo ancho, «+» a la izquierda, logotipo al centro de la ventana, lupa y campana a la derecha y los huecos de Atrás y del menú; la navegación de cinco al pie, centrada en la columna; sin flotante.
11. **Evento a 1 280** (`11`): la barra con Atrás junto al «+» y el menú «···» a la derecha; la cabecera propia de la ficha ya no está y la ficha empieza a 68 px, como antes.
12. **Lugares, lista** (`12`): la tira «A C M T» dentro de la cabecera, una sola raya debajo (antes, la tira iba aparte y escondida); «Ver en mapa» abajo a la derecha.
13. **Perfil** (`13`): antes con «Atrás» y el logotipo chico, sin navegación; después raíz, con la barra, la navegación y Perfil activo con la «A» dentro de la píldora.
14. **Sin sesión** (`14`, solo después, recapturada con la corrección): «Entrar» compacto (55 × 44) junto a la lupa; la figura en Perfil; el logotipo en el centro exacto (195 de 195).
15. **Administración** (`15`, solo después, recapturada; persona inventada con rol admin en un respaldo aparte): la llave junto al «+», la lupa y la campana a la derecha, el logotipo centrado.
16. a 19. **WebKit real** (iPhone SE, iOS 26.3, solo después): Agenda (`16`), recogida al bajar (`17`), rebote al jalar (`18`, la barra, la fila y las pestañas se mueven juntas con blanco arriba) y Artistas con la tira (`19`); Safari pone su barra flotante debajo de la nuestra.
20. y 21. **Alta de evento a 1 280×800**, antes y después de la corrección: antes, dos logotipos (el de la barra de la app y, debajo, el de la cabecera de la tarea, con la ✕ a un lado); después, uno solo, y la cabecera de la tarea con su ✕ a la derecha y nada más; el título «Publicar un evento» y el formulario, en el mismo punto (la cabecera de la tarea sigue midiendo 56 y con su raya).
22. y 23. **Ajustes a 1 280×800**, antes y después: igual, el segundo logotipo desaparece y queda «Atrás» a la izquierda; «Ajustes» y las listas, sin moverse.
24. **Sin sesión a 320** (solo después): la ventana más angosta; «Entrar» junto a la lupa y el logotipo, más chico (96 px) pero en el centro exacto (160 de 160), sin pisar al «+» ni a la lupa.
25. **Ficha con administradora a 1 280** (solo después): «+», Atrás y la llave a la izquierda; lupa, campana y el menú «···» a la derecha; el logotipo en el centro de la ventana (640).
26. **WebKit real, la app sin sesión a 375** (solo después): «+», logotipo al centro, lupa y «Entrar» compacto; cinco destinos con la figura en Perfil (sin sesión); Safari pone su barra flotante debajo.
27. **WebKit real, la barra a cuatro anchos** (solo después): la barra de la app sin sesión a 320, 290, 375 y 390 con una raya roja en el centro de cada una y, debajo, lo medido en el propio WebKit (centro del logotipo, ancho del logotipo y de cada lado); el de 390 es más ancho que el teléfono (375) y se corta en pantalla, los números son de la maquetación.

## Anotado para las piezas que siguen

- **P5 (raíces).** (1) La cabecera aún tiene dos filas (chips y pestañas) más el segundo nivel; al quedar una sola (ciudad · Cuándo · Filtros) la fila de contexto mide `--alto-filtros` y `--alto-cabecera` puede ser el token. (2) `verOtraVista` sigue flotando y tapa 6 accionables de la lista de Lugares; con la lista en la hoja se va. (3) `cajaMapa` mide `100dvh − --barra-flujo − --alto-cabecera − --nav-abajo`: P5 la pasa a llenar su área (H-14). (4) La búsqueda: nadie tiene la pantalla «Buscar» del prototipo (recientes, atajos de la semana); hoy la lupa abre la de la sección o la de Inicio (`/?buscar=1`), y la URL se queda con el parámetro. (5) «Mis artistas» queda debajo de la tira.
- **P6 (ficha).** (1) El menú «···» de la ficha se pinta en la barra de la app tras hidratar (no está en el HTML del servidor), así que a 1 280 aparece un instante después de Atrás; la P6 puede prestarlo igual con `prestarALaBarra` o pintarlo en el servidor. (2) `Barra` interior conserva su margen negativo (H-24) y su franja de la hora. (3) La ficha a 792+ pone 8 px de relleno arriba (12 de margen de la cabecera menos los 4 que trae su primera pieza) para empezar en el mismo punto.
- **P7 (responsivo).** (1) La navegación sigue al pie a todos los anchos; el carril lateral la vuelve columna del grid (hoy dos filas: barra y pantalla). (2) Los cortes de ancho: hoy uno, 792, en seis módulos; los de 600 y 1024 se suman con la misma convención (teléfono primero, `min-width` después). (3) `completa` a 792+ no trae barra ni carril.
- **P9 (altas).** A 792+ la tarea conserva su cabecera propia (56, con raya) con solo su Atrás o su ✕, sin logotipo; el prototipo la pinta con el título en medio y la ✕: P9 le pone el título. Y `globals.css .pagina:has(> header:first-child)`, de las altas, sale con P9.
- **P12 (limpieza).** El esqueleto de la lista (`ListaEsqueleto`) dibuja su propia cabecera de mentira (transparente, no blanca).

## Archivos

Sin migraciones ni variables de entorno. En `src` la pieza suma 331 líneas sin las pruebas (787 añadidas y 456 quitadas; el CSS +121 y el TypeScript +210, con la lógica del armazón, la barra y el préstamo) y 347 de pruebas.

**Nuevos:** `lib/armazon.ts` y su prueba, `components/Armazon.tsx`, `.module.css` y su prueba de componente, `BarraApp.tsx` y `.module.css`, `EnBarra.tsx`, `PerfilEnNav.tsx`, `prestamoBarra.ts`, `usuarioDeLaBarra.ts`, esta bitácora y `docs/rediseno/capturas-260/`. **Borrados:** `Publicar.tsx` y `.module.css`. **Con cambios:** `app/layout.tsx`, `globals.css`, `page.tsx` (Inicio), `agenda/page.tsx`, `artistas/page.tsx`, `lugares/page.tsx`, `VistaLugares.tsx` y `lugares.module.css`, `borrado/page.tsx`, `perfil/page.tsx`, las acciones de Novedades, Perfil y Administración (revalidan el layout), `Inicio.tsx`, `ListaArtistas.tsx`, `ListaLugares.tsx`, `AgendaInicio.module.css`, `NavInferior`, `Sesion`, `TiraLetras`, `ui/Atras`, `ui/Barra`, `ui/Cabecera`, `ui/CargandoRaiz`, `ui/Ficha.module.css`, `ui/Iconos` y `ui/Logotipo`; documentos: `docs/diseno/LINEA_GRAFICA.md` (sección «El armazón») y `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
