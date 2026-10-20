# 454 · Con el teclado abierto, la lista se ve y se desplaza, y desplazar esconde el teclado (OL-421)

**Fecha:** 2026-10-19. **Rama:** `teclado-buscadores`, desde `origin/main` (`7d9a7f8d`), con `main` traído después hasta `b7ad737c` (#537, OL-422; sin
archivos en común). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Sin migración** y sin variables de entorno nuevas. **Estado:** lista para la revisión del gestor y el «publica»
del founder; falta probarla en su iPhone (pasos al final).

## El pedido

Founder, 19 de octubre, desde su iPhone: «Revisa comportamiento de teclado en buscador hay una lista que no se puede hacer scroll y no se ve
pienso que si usuario hace scroll entonces se debería de ver el contenido y ocultar teclados revisa este y otros casos similares (donde teclado
está afuera y hay más contenido para hacer scroll)». Y después: «Adelante y ojo estaba hablando de la app».

## Cómo se midió

Simulador **iPhone 17 con iOS 27.0** (`8CB4EB13`, estaba apagado y nadie lo usaba), con el **teclado en pantalla** (`ConnectHardwareKeyboard`
en falso mientras duró la prueba; no existía la preferencia y se volvió a borrar) y tecleando con toques. La app compilada contra el respaldo
local de datos inventados (`next build` + `next start` sin `.env`; la sesión inventada de la cuenta de administración para `/admin/personas`).
En **dos entornos**:

- **Safari** del simulador.
- **La app de la tienda** («la app» del founder): el envoltorio de Capacitor de `apps/ios` compilado con `xcodebuild` para el simulador desde
  una **copia en el scratchpad** con `server.url` apuntando a la app local (en el repositorio no cambió nada; la app se desinstaló al final). Es
  la que tiene el teclado en modo `body` (bitácora 336): ni la ventana ni el área visible se encogen y nadie desplaza solo.

Para ver la causa usé un intermediario de medidas en el scratchpad que inyecta un panel con `scrollY`, el área visible, `--teclado`, los
`scrollBy` que pide la página y los eventos de toque, foco y desplazamiento (nunca entró en el repositorio), y al final volví a compilar el
código de `main` para medirlo con el mismo panel.

## Qué pasaba en Buscar (la causa)

Buscar con «de» (KOWAIFEST, el Concierto de la Orquesta, Macario, «Ver 11 más», el grupo Artistas con tres y «Ver 1 más») y el teclado
abierto. Son **dos fallos distintos**, uno por entorno:

1. **En la app de la tienda los últimos resultados quedaban bajo el teclado y no había por dónde subirlos.** La plantilla de Buscar
   (`ui/Plantilla` `.raizSinNav`) no sumaba el alto del teclado (`--teclado`) a su relleno de abajo, como sí lo hacen `.pagina` y los pasos
   (OL-305). En Safari el área visible puede bajar dentro de la ventana y eso lo disimula; en la app no: la página llegaba a su final con el
   grupo Artistas a medias detrás del teclado (captura `02b`: después de dos arrastres, «Orquesta Sinfónica de San Luis Potosí» cortado por el
   teclado y nada más). Es exactamente «una lista que no se puede hacer scroll y no se ve».
2. **En Safari la lista no se movía: cada arrastre la devolvía.** Medido con el código de `main`: durante un arrastre la página bajaba 10 y
   20 px y volvía a 0 en el cuadro siguiente; el panel contó **15 `scrollBy` de la página en un solo arrastre**. Los hacía `ui/useCampoVisible`:
   al moverse el área visible (su `scroll`) vuelve a llevar el campo enfocado a la vista, y el campo de Buscar va en la barra pegada a 6 px del
   borde, menos que los 12 px de aire que el mecanismo exige, así que nunca lo daba por visible y devolvía la página una y otra vez.

Además, en Safari **nada escondía el teclado** al desplazar (solo la tecla de buscar o volver), y en las demás pantallas con buscador pasaba lo
mismo: en Administración › Personas la lista seguía bajo el teclado (captura `03`), y en el nombre del alta de lugar la lista de candidatos se
**abría hacia arriba, encima del campo y de la barra** (captura `05`).

## Lo que cambió

- **`ui/Plantilla.module.css`**: `.raiz` y `.raizSinNav` suman `--teclado` a su relleno de abajo (0 sin campo enfocado). Con eso, en la app el
  último resultado se puede subir hasta quedar sobre el teclado. Sin medidas nuevas: es el mismo token que ya usa `.pagina`.
- **`ui/useTecladoSeSueltaAlDesplazar.ts` (nuevo)**: la regla «desplazar esconde el teclado». Mientras un campo de texto tiene el foco y hay
  teclado (`data-teclado` en `<html>`, la medida única de `useCampoVisible`, que ya cuenta el teclado de la app de la tienda), le quita el foco
  al campo —y con él se va el teclado— cuando:
  - el dedo arrastra **fuera del campo** más de 10 px (un toque con temblor sobre un resultado no cuenta: tocar lo abre);
  - con el dedo **sobre el campo**, la página, el área visible o la lista bajo el dedo se desplazan más de 24 px;
  - Safari **cancela** un toque que empezó fuera del campo (`touchcancel`): lo hace al empezar a desplazar una lista con desplazamiento propio
    (la lista flotante de candidatos) sin mandar ningún movimiento; medido en el simulador.

  Mover el cursor dentro del campo (mantener y arrastrar sobre él) no lo suelta. Solo escucha toques (con ratón no hace nada) y nunca
  `pointerleave`. Con `zona` solo cuentan los toques dentro de ella.
- **`ui/useCampoVisible.ts`** (el mecanismo de OL-305/OL-376, sin tocar sus medidas):
  - **Lo que la persona desplaza con el dedo ya no se corrige**: desde que hay un toque (`touchstart`) hasta que se levanta el dedo, y después,
    si en ese rato se desplazó algo, `asegurar` ya no devuelve la página; vuelve a hacerlo con el siguiente foco o cambio de paso. Lo pegado
    (el pie, `--abajo-visible`) se sigue anclando en cada desplazamiento. Es lo que arregla el punto 2.
  - **`data-arriba-con-teclado`**: con el teclado abierto, el bloque que lo lleva sube hasta arriba de lo libre (bajo la barra) en vez de
    quedar «en el centro». Así, al enfocar el campo, la lista empieza justo debajo y los primeros resultados quedan entre el campo y el teclado.
    Respeta el aire que ya tenía encima (como mucho los 12 px de siempre) para que el título de antes salga entero y no quede una tira cortada.
  - **`leerMarcoVisible()`**: lo que se ve y dónde empieza el bloque de lo fijo, en el marco de las cajas, para quien coloca algo `fixed`
    junto a un campo.
  - La lista flotante del propio campo (`data-lista-flotante`) **no cuenta como algo pegado**: abierta hacia arriba hacía de techo y el campo
    ya no subía al volver a enfocarlo con texto ya escrito.
- **`ui/ListaFlotante.tsx`**: se coloca con `leerMarcoVisible()` cuando el armazón está montado. En Safari de iOS 27, con el área visible
  desplazada, `offsetTop` (132) e `innerHeight` (582) no son los del marco de las cajas (el campo estaba en 145) y la lista creía no tener sitio
  abajo: se abría hacia arriba sobre el campo. Sin el armazón (pruebas viejas) sigue con su cuenta de siempre.
- **Dónde se usa el gancho**: Buscar (`BuscarPantalla`, con `data-arriba-con-teclado` en su `main`), el buscador de Administración
  (`ui/Buscador`, que usan Personas y las secciones; `CampoBuscar` gana la prop `arribaConTeclado`), el nombre de las altas de lugar y de
  artista (con la marca en el campo), «¿Dónde es?» del alta de evento, «¿Dónde está?» del alta de lugar y «Quién» (`eventos/SelectorQuien`)
  (estos tres solo el gancho, sin la marca: ver «Decisiones»).
- **`ui/Hoja` usa el mismo gancho** (con `zona` = el panel) en vez de su `onTouchMove` propio. Mismo comportamiento en Safari (un arrastre
  dentro de la hoja que no sea sobre el campo lo guarda) y ahora **también en la app de la tienda**, donde antes no hacía nada: su condición era
  `useAreaVisible`, que con el teclado de Capacitor vale `null` porque el área visible no cambia. Gana además el umbral de 10 px (antes
  cualquier movimiento soltaba el campo).
- **`PasosClase`**: su campo de búsqueda («Parte de un festival») vive en una `ui/Hoja`, así que ya queda cubierto por la hoja; no lleva nada
  propio.

## Casos similares revisados

| Pantalla | Qué tiene | Qué se hizo |
|---|---|---|
| Buscar | campo en la barra y lista larga | gancho, marca, aire del teclado en `.raizSinNav` y fin de la corrección que devolvía la página |
| Administración › Personas y secciones (`ui/Buscador`) | título, campo y lista | gancho y marca (el campo sube bajo la barra) |
| Alta de lugar y de artista, «¿Cómo se llama?» | campo y lista flotante de candidatos | gancho y marca; la lista se abre abajo |
| Alta de evento, «¿Dónde es?» (`PasosDonde`) | campo, «Estoy aquí» y lista flotante | solo el gancho (ver «Decisiones») |
| Alta de lugar, «¿Dónde está?» | campo de dirección, lista flotante y mapa | solo el gancho |
| «Quién» (`SelectorQuien`, en «¿Quieres agregar algo?» y en la hoja de una actividad) | campo y fichas encontradas debajo | solo el gancho |
| Hojas con buscador (Ciudad, `HojaCiudad` de artista, «Parte de un festival») | campo y lista en `ui/Hoja` | la hoja usa el gancho; ahora también en la app |
| «¿Dónde es?» del formulario de siempre (`HojaDonde`) | capa fija con mapa, campo y lista | **no se tocó**: el mapa se arrastra con el teclado abierto y soltar el campo al mover el mapa es una decisión de producto. Por confirmar |
| Formulario de siempre de artista (`FormularioArtista`) | aviso «Ya tiene ficha» flotante bajo el nombre | **no se tocó**: el aviso se cierra al soltar el foco, así que el gancho lo escondería al primer arrastre. Pieza aparte si se quiere |
| Editar perfil (`ajustes/editar`), Reportar, Entrar, formularios de Administración | campos apilados, sin lista | **no se tocó**: son formularios, no listas; ya tienen el aire del teclado (`.pagina`). Si el founder quiere la regla en todas partes, el gancho se puede montar una sola vez en el armazón (como `useCampoVisible`): pieza aparte, por confirmar |
| Descripción larga (`ui/CampoLargo`) | área de texto en capa fija | **no aplica**: su propio texto se recorre con el dedo; el gancho no la cuenta como lista (y no está montado ahí) |
| Pasos sin lista (nombre del evento, precio…) | campo y pie anclado | sin cambios |

## Pruebas

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**4046** en 230
  archivos), `npm run inventario` (sin novedades) y `npm run medir` (ver abajo), en el árbol sin `.env`.
- `npm run test:componentes`: **644 de 644** en la rama y **647 de 647** con `main` traído (las 3 de más son de OL-422).
- **`ui/useTecladoSeSueltaAlDesplazar.componentes.test.mjs` (nuevo, 11)**, con toques de verdad de Chromium (`Input.dispatchTouchEvent`) y el
  `visualViewport` simulado de siempre: arrastrar la lista suelta el campo y se va el teclado; un toque con temblor no; mover el cursor sobre
  el campo no; con el dedo en el campo, 12 px no y 42 px sí; un `touchcancel` fuera del campo lo suelta; **sin teclado no hace nada**; con
  `zona`, solo dentro; lo que la persona desplaza no lo corrige `useCampoVisible` y, como control, el mismo desplazamiento sin dedo sí; con la
  marca el campo sube bajo la barra y el primer resultado queda sobre el teclado (control: sin la marca no se mueve); la lista flotante se abre
  hacia abajo aunque `offsetTop` e `innerHeight` vengan como en iOS 27; y con la lista ya abierta hacia arriba, volver a enfocar sube el campo.
  **Controles negativos:** con el `useCampoVisible` de `main` fallan las dos de `useCampoVisible`; sin `leerMarcoVisible` falla la de la lista
  flotante («caben los tres candidatos (100 px)»); sin la exclusión de la lista flotante falla la de volver a enfocar.
- **`BuscarPantalla.componentes.test.mjs` (+2)**, ahora con `useCampoVisible` montado como en el armazón y el teclado de la app de la tienda
  simulado (eventos de Capacitor, `<body>` encogido): con doce eventos desplegados, el último se puede subir hasta quedar sobre el teclado
  (control: sin el aire del teclado queda bajo él), y arrastrar los resultados suelta el buscador y se va el teclado.

## Capturas

[`docs/rediseno/capturas-454/`](../../../rediseno/capturas-454/), del simulador a tamaño real (1206×2622, sin comprimir). Abiertas una por una.

**Antes (`main`):**

- `01-antes-safari-buscar-teclado.png` — Safari, Buscar con «de» y el teclado: KOWAIFEST, el Concierto, Macario a medias bajo la píldora
  «localhost» y la barra de flechas; el resto bajo el teclado. Al arrastrar, la lista volvía sola (ver la causa, punto 2).
- `02-antes-app-buscar-teclado.png` — la app de la tienda, lo mismo: «Ver 11 más» justo encima del teclado y el grupo Artistas detrás.
- `02b-antes-app-buscar-al-fondo.png` — la app tras dos arrastres: la página ya en su final y «Orquesta Sinfónica de San Luis Potosí» cortada
  por el teclado; Aaron Cadena, 0Backside0 y «Ver 1 más» no se pueden ver. Es el fallo del founder.
- `03-antes-safari-personas-teclado.png` — Administración › Personas con el teclado: el título, el campo y los filtros arriba; Lucía a medias
  y Marcos bajo la barra de flechas; el resto bajo el teclado.
- `05-antes-safari-alta-lugar-nombre.png` — alta de lugar, «¿Cómo se llama?» con «Cas»: la lista de candidatos abierta **hacia arriba**,
  encima de la barra y de la pregunta, con su tercer renglón cortado justo sobre el campo.

**Después (la rama):**

- `02e-despues-app-buscar-teclado.png` — la app de la tienda, Buscar con «de» y el teclado: igual que antes al enfocar.
- `02c-despues-app-buscar-desplazar-esconde-teclado.png` — la app tras un arrastre: el teclado se fue, el campo ya sin foco y la lista entera
  hasta «Ver 1 más», con aire debajo.
- `02d-despues-app-buscar-enfocar-vuelve-arriba.png` — la app: tras desplazar, tocar el campo otra vez lo enfoca y la pantalla vuelve arriba
  (chips, Eventos, KOWAIFEST…) con el teclado.
- `04-despues-safari-buscar-teclado.png` — Safari, Buscar con «de» y el teclado, con el cursor en el campo.
- `04b-despues-safari-buscar-desplazar-esconde-teclado.png` — Safari tras un arrastre: la lista se desplazó (Eventos pegado bajo la barra,
  el Concierto arriba), el teclado se fue y se ven Artistas y «Ver 1 más».
- `06-despues-safari-personas-teclado.png` — Personas con el teclado: el campo subió hasta arriba, bajo la franja de la hora (el título salió
  entero), y la lista empieza justo debajo: Tú, Ana, Lucía y Marcos sobre el teclado. La barra «Atrás» queda fuera de la vista mientras hay
  teclado (ver «Decisiones», 8) y vuelve al esconderlo (06b).
- `06b-despues-safari-personas-desplazar-esconde-teclado.png` — Personas tras un arrastre: sin teclado y las seis cuentas a la vista.
- `07-despues-safari-alta-lugar-nombre.png` — alta de lugar con «Cas»: el campo arriba y la lista de candidatos **debajo** (las dos Casas y
  «No pude buscar en el mapa…»; sin Mapbox de verdad), «Siguiente» y la tira sobre el teclado.
- `07b-despues-safari-alta-lugar-desplazar-esconde-teclado.png` — tras arrastrar la lista: el teclado se fue, el paso entero con la lista bajo
  el campo y «Siguiente» abajo.
- `07c-despues-safari-alta-lugar-volver-a-enfocar.png` — volver a tocar el campo con «Cas» escrito: el campo sube otra vez y la lista se abre
  abajo (antes de excluir la lista de lo pegado, aquí se quedaba abierta hacia arriba).

## `npm run medir`

**41 pantallas × 4 anchos en 134 s, sin novedades**, sin `.env` (y otra vez con `main` traído: 138 s, sin novedades). Teclado (390×508, de las dos maneras de la bitácora 336): 7 campos en 7
pantallas (`10-entrar`, `s07-alta-lugar`, `s10-buscar`, `s11-alta-artista`, `s16`, `s17` y `s27`), ninguno tapado, y los botones de abajo
(«Falta el nombre», «Buscar otro», «Siguiente») enteros sobre el teclado. Ningún presupuesto cambió: la plantilla solo suma `--teclado`, que sin
campo enfocado vale 0.

## Decisiones y por confirmar

1. **«La app» es la app de la tienda** (TestFlight). Ahí estaba el fallo que se ve en las capturas 02 y 02b; el de Safari era otro (la
   corrección que devolvía la página). Se arreglaron los dos.
2. **La marca `data-arriba-con-teclado` solo en las cuatro superficies del encargo.** En «¿Dónde es?» del alta de evento no la puse: es el paso
   del traspaso de «Estoy aquí» que OL-376 midió con tanto cuidado y mover su campo al enfocar podría cambiar esos tiempos; ahí solo el gancho.
   Por confirmar si se quiere también allí y en «¿Dónde está?».
3. **Umbrales**: 10 px de arrastre fuera del campo (lo que iOS ya trata como desplazamiento y no como toque) y 24 px de desplazamiento con el
   dedo en el campo (el del encargo). Son constantes del gancho, no medidas de maquetación.
4. **Android**: el gancho actúa solo con `data-teclado`, que en Android (ventana que se encoge) no se pone. Ahí no se puede «no ver la lista»
   (la ventana ya mide lo que queda sobre el teclado), pero tampoco esconde el teclado al desplazar. Por confirmar con el teléfono de pruebas.
5. **Montarlo en todas partes** (en el armazón, como `useCampoVisible`) para que los formularios también suelten el teclado al desplazar:
   no lo hice; por confirmar con el founder (ver la tabla).
6. **`HojaDonde`** (el «¿Dónde es?» del formulario de siempre, con el mapa): sin el gancho; por confirmar si mover el mapa debe esconder el
   teclado.
8. **La barra de arriba con el teclado abierto en Personas y en las altas.** Esas páginas no tienen más recorrido que la ventana (el aire del
   teclado no las alarga lo bastante), así que para subir el campo Safari mueve el área visible dentro de la ventana en vez de desplazar la
   página, y la barra pegada se queda arriba, fuera de la vista (lo de «lo fijo se queda atrás» de la bitácora 407). En el alta de lugar ya
   pasaba en `main` (captura 05). Vuelve en cuanto se esconde el teclado. En Buscar no pasa: su campo va dentro de la barra. Por confirmar si
   se quiere la barra a la vista; sería otra pieza (alargar esas páginas con el teclado abierto).
9. **Lo que no pude probar en el simulador**: un iPhone de verdad (el ritmo del dedo real), la web instalada en la pantalla de inicio (se
   porta como Safari sin barra; no la instalé) y Android.

## Para probar en el iPhone del founder

En la **app de TestFlight** y en **Safari**, con la vista previa de la rama o ya publicada:

1. Buscar (la lupa) → escribe «de» o algo con muchos resultados → con el teclado abierto, arrastra la lista hacia arriba: el teclado se
   esconde y la lista llega hasta el último resultado. Toca el campo otra vez: vuelve arriba con el teclado.
2. Toca un resultado con el teclado abierto (sin arrastrar): se abre su ficha.
3. Mantén el dedo en el campo y muévelo para mover el cursor: el teclado no se esconde.
4. Administración › Personas: toca el buscador; el campo sube y la lista empieza justo debajo. Arrastra la lista: se va el teclado.
5. Publicar → Lugar → «¿Cómo se llama?» → escribe «Cas…» (un nombre que ya exista): la lista sale **debajo** del campo. Arrástrala: se va el
   teclado. Vuelve a tocar el campo: la lista sigue debajo.
6. Cambia de ciudad (la hoja «Ciudad») y busca con el teclado: arrastrar la lista lo esconde, también en la app.
