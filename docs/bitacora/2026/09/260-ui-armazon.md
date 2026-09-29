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

Una rejilla plana con áreas: «+» · administración · logotipo · lupa · sesión (cinco columnas en el teléfono, con un hueco a cada lado del logotipo para que quede al centro) y, desde 792, «+» · Atrás · administración · logotipo · lupa · sesión · menú (siete). Todo es `BotonIcono` a 44; iconos de 26 (el «+» es un icono nuevo del prototipo, `IconoCrear`). Sticky arriba, blanca, sin raya, con la franja de la hora dentro (`--tope`).

- **«+»** lleva a la misma alta que el flotante en cada sección (evento en Inicio, Agenda y Perfil; lugar en Lugares; artista en Artistas) con la ciudad que se ve (`?ciudad=` en evento y artista, como el flotante); fuera de esas secciones, evento. Con o sin sesión, como antes. El prototipo no distingue secciones: es una sola alta genérica; se siguió el comportamiento de hoy.
- **Sesión** (`Sesion`, en el servidor): sin sesión «Entrar»; con sesión la campana (con su punto) y, para administración, la llave, que va junto al «+» (el hueco de la izquierda). La foto de perfil ya no vive arriba: es el quinto destino de la navegación.
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

## Decidí yo (para que el gestor lo confirme)

1. **`data-recogida`** en lugar de los dos atributos del prototipo.
2. **Una cuarta vista, `completa`**: la pared y el mando de una obra colectiva y el letrero para imprimir traen su propia pantalla y, desde 792, la barra de la app los estorbaría (y saldría en el papel).
3. **La lupa** abre la búsqueda de la pantalla y, sin ella, la de Inicio: en el plan nadie tiene la pantalla «Buscar» (doc 50: «la lupa abre la pantalla de búsqueda…, Recientes y atajos»); esto conserva lo que hay.
4. **La navegación sigue `position: fixed`**, no es un área del grid: una pegajosa abajo es justo lo que `MemoriaScroll` documenta que WebKit en modo app repinta mal (bitácora 043), y no quise estrenar eso en el iPhone del founder; el grid tiene dos filas y P7 la vuelve columna.
5. **La fila de contexto ya no se esconde al bajar** (lo hace la barra), y la tira de letras **ya no espera** a la primera letra: es parte de la cabecera y siempre se ve, como en el prototipo firmado (cambia lo que pidió el founder el 2026-09-19).
6. **La sesión en el layout** (punto 6): cuatro pantallas estáticas pasan a dinámicas.
7. **Sin sesión, el logotipo queda 14 px a la izquierda del centro** (medido a 390 y a 375) porque «Entrar» es más ancho que la campana; con sesión queda centrado (195 de 195; con la llave de administración igual, porque ocupa el hueco de la izquierda). A 320 el logotipo se achica dentro de su columna (93 px sin sesión) en vez de pasar bajo la lupa. Centrarlo siempre pide un envoltorio a cada lado.

## Lo que cambia a la vista

**A. Lo que el encargo enumera** (capturas 01 a 04, 08 a 15)
- Barra nueva: «+» a la izquierda, logotipo al centro, lupa y campana; la foto pasa a Perfil, en la navegación.
- El flotante desaparece: los accionables que tapaba quedan a la vista (19 → 0 en Inicio, Agenda y Artistas; ver abajo Lugares).
- Cinco destinos; una sola cabecera con su raya abajo; la tira de letras dentro de ella, siempre visible, con letras de 44×44.
- Desde 792: la barra a todo lo ancho con Atrás y el menú en las fichas.

**B. Lo que trae tener un solo armazón**
- Perfil es raíz: barra y navegación en lugar del «Atrás» y el logotipo chico.
- Al bajar, la fila de contexto se queda arriba (antes se escondía) y la navegación se va con la barra: en pixeles útiles sale igual.
- Artistas y la lista de Lugares: la tira siempre visible resta 44 px al reposo (668 → 624 y 624 → 580).
- La lupa de una sección sin búsqueda propia (Artistas con menos de 8, por ejemplo) lleva a la de Inicio.
- Desde 792, las tareas (altas, ajustes…) muestran la barra de la app y, debajo, su cabecera propia (con su logotipo): dos logotipos hasta que P9 le ponga título a la barra de tarea.
- «Mis artistas» (Artistas, con sesión) queda debajo de la tira.

**C. Lo que no cambia** (comprobado con una comparación píxel a pixel de las capturas, script de la sesión)
- A 390 son idénticas, píxel a píxel, en página completa también: evento, alta de evento, ajustes, lugar, artista y novedades (las cabeceras de esas vistas no se tocaron).
- A 1280, evento, lugar y artista cambian solo en las filas 6 a 49 (la barra); la ficha empieza en el mismo punto (68 px) y todo lo de abajo es idéntico.

## Verificación

- `npm run lint`: 0 errores; una advertencia que ya estaba (`docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 114 archivos, **1 484** pruebas (10 nuevas, `lib/armazon.test.ts`: la vista de cada ruta, el «+», la lupa y los cinco destinos). `npm run build` sin variables de entorno, como la CI: verde, 29 páginas.
- **Prueba de componente** (Chrome real con esbuild; no entra en `npm test`): `Armazon.componentes.test.mjs`, **7 de 7**: `data-vista` por ruta, barra y navegación (56 y 60) en la raíz y ninguna en ficha, tarea y completa, recogida y vuelta (barra en −56, navegación en 844, fila en 0), regreso al llegar al final y en cada pantalla nueva, todos los botones a 44 y el logotipo al centro, el relleno blanco de 300 px sin tapar la barra y, desde 792, Atrás y menú solo en la ficha, sin recoger y nada en la pantalla completa. Se comprobó que la de la recogida falla si se quita `translateY(-100%)` de la barra.
- **La app compilada en Chrome** contra el respaldo local (32 comprobaciones, script de la sesión): las de la prueba de componente con la app real más el «+» de cada sección con y sin `?ciudad=`, la lupa en Agenda, Lugares y Perfil, el salto a una letra (la barra se recoge antes de medir y el grupo queda a 103,7 de una cabecera que termina en 104), la memoria de la barra inferior (Agenda vuelve a `/agenda?filtro=siguiendo`), Atrás y el menú de la barra en una ficha a 1280 (el menú abre su hoja y Atrás vuelve a `/agenda`), «Entrar» y la figura sin sesión, y cerrar sesión sin recargar. Todas en verde.
- **WebKit real** (capturas 16 a 19): Agenda arriba; recogida al bajar con el dedo (barra y navegación fuera, la fila y las pestañas arriba, el ↑ baja); el rebote al jalar (la barra, la fila y las pestañas se mueven juntas y arriba asoma blanco, nunca el fondo del listado); Artistas con la tira dentro de la cabecera. No se probó en WebKit desde 792 (el simulador es un teléfono).
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

`docs/rediseno/capturas-260/` (32 PNG de paleta, 3,1 MB). «Antes» es la compilación de `origin/ui-renglon` y «después» esta rama, ambas con la sesión de `ana@example.com` del respaldo local inventado; cada una abierta y descrita.

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
14. **Sin sesión** (`14`, solo después): «Entrar» en la barra; la figura en Perfil; el logotipo 14 px a la izquierda del centro.
15. **Administración** (`15`, solo después; persona inventada con rol admin en un respaldo aparte): la llave junto al «+», el logotipo centrado.
16. a 19. **WebKit real** (iPhone SE, iOS 26.3, solo después): Agenda (`16`), recogida al bajar (`17`), rebote al jalar (`18`, la barra, la fila y las pestañas se mueven juntas con blanco arriba) y Artistas con la tira (`19`); Safari pone su barra flotante debajo de la nuestra.

## Anotado para las piezas que siguen

- **P5 (raíces).** (1) La cabecera aún tiene dos filas (chips y pestañas) más el segundo nivel; al quedar una sola (ciudad · Cuándo · Filtros) la fila de contexto mide `--alto-filtros` y `--alto-cabecera` puede ser el token. (2) `verOtraVista` sigue flotando y tapa 6 accionables de la lista de Lugares; con la lista en la hoja se va. (3) `cajaMapa` mide `100dvh − --barra-flujo − --alto-cabecera − --nav-abajo`: P5 la pasa a llenar su área (H-14). (4) La búsqueda: nadie tiene la pantalla «Buscar» del prototipo (recientes, atajos de la semana); hoy la lupa abre la de la sección o la de Inicio (`/?buscar=1`), y la URL se queda con el parámetro. (5) «Mis artistas» queda debajo de la tira.
- **P6 (ficha).** (1) El menú «···» de la ficha se pinta en la barra de la app tras hidratar (no está en el HTML del servidor), así que a 1 280 aparece un instante después de Atrás; la P6 puede prestarlo igual con `prestarALaBarra` o pintarlo en el servidor. (2) `Barra` interior conserva su margen negativo (H-24) y su franja de la hora. (3) La ficha a 792+ pone 8 px de relleno arriba (12 de margen de la cabecera menos los 4 que trae su primera pieza) para empezar en el mismo punto.
- **P7 (responsivo).** (1) La navegación sigue al pie a todos los anchos; el carril lateral la vuelve columna del grid (hoy dos filas: barra y pantalla). (2) Los cortes de ancho: hoy uno, 792, en seis módulos; los de 600 y 1024 se suman con la misma convención (teléfono primero, `min-width` después). (3) `completa` a 792+ no trae barra ni carril.
- **P9 (altas).** A 792+ la tarea lleva la barra de la app y debajo la suya con el logotipo chico; el prototipo la pinta con título y ✕. Y `globals.css .pagina:has(> header:first-child)`, de las altas, sale con P9.
- **P12 (limpieza).** El esqueleto de la lista (`ListaEsqueleto`) dibuja su propia cabecera de mentira (transparente, no blanca).

## Archivos

Sin migraciones ni variables de entorno. En `src` la pieza suma 310 líneas sin las pruebas (756 añadidas y 446 quitadas; el CSS +113 y el TypeScript +197, con la lógica del armazón, la barra y el préstamo) y 292 de pruebas.

**Nuevos:** `lib/armazon.ts` y su prueba, `components/Armazon.tsx`, `.module.css` y su prueba de componente, `BarraApp.tsx` y `.module.css`, `EnBarra.tsx`, `PerfilEnNav.tsx`, `prestamoBarra.ts`, `usuarioDeLaBarra.ts`, esta bitácora y `docs/rediseno/capturas-260/`. **Borrados:** `Publicar.tsx` y `.module.css`. **Con cambios:** `app/layout.tsx`, `globals.css`, `page.tsx` (Inicio), `agenda/page.tsx`, `artistas/page.tsx`, `lugares/page.tsx`, `VistaLugares.tsx` y `lugares.module.css`, `borrado/page.tsx`, `perfil/page.tsx`, las acciones de Novedades, Perfil y Administración (revalidan el layout), `Inicio.tsx`, `ListaArtistas.tsx`, `ListaLugares.tsx`, `AgendaInicio.module.css`, `NavInferior`, `Sesion`, `TiraLetras`, `ui/Atras`, `ui/Barra`, `ui/Cabecera`, `ui/CargandoRaiz`, `ui/Ficha.module.css`, `ui/Iconos` y `ui/Logotipo`; documentos: `docs/diseno/LINEA_GRAFICA.md` (sección «El armazón») y `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
