# 258 · Boton y BotonIcono unificados; glifos de acción (OL-230, pieza P2)

**Fecha:** 2026-09-28 (el encargo) y 2026-09-29 (la entrega, pasada la medianoche) · **Rama:** `ui-botones`, desde `origin/main` (`27841f9f`) · **OL:** OL-230 · **PR:** #268 (sin unir) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Segunda pieza del plan de OL-227 (doc 50, § 7); usa los tokens de P1 (`--control`, `--toque`, `--boton-icono`, `--boton-icono-grande`, `--ok`).

## Pedido

Encargo del Gestor de cambios III, con el mismo criterio de aceptación que P1 («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y la regla permanente de maquetación plana. P2: un solo `Boton` (variantes primario, secundario, texto y peligro; forma recta o píldora; alto 48 o 44; ancho contenido o completo; estados reposo, pulsado, foco visible, deshabilitado con motivo y en camino) y un solo `BotonIcono` (tamaños 44, 48 y 56; relieves plano, elevado y contorno; estado decidido, verde con el glifo blanco); con ellos se rehacen los círculos y los botones que cada módulo dibujaba por su cuenta; glifos de acción nuevos (palomita para Voy, persona con «+» para seguir a un artista, campana con «+» para seguir un lugar); todos los controles de barra a 44 px y los de acción a 48, medidos en el DOM. Solo puede cambiar a la vista lo que el encargo enumera; cualquier otra diferencia es un defecto de quien lo hace.

## Lo que había

- **19 reglas de botón redondo**, cada una con su dibujo: 36, 40, 44, 48 y 56 px; sin relieve, con borde, con sombra suave y con borde más sombra fuerte; glifo en `--texto`, en `--texto-suave` o en `--primario`; pulsado con fondo gris en unos y sin nada en otros. Son los once de la auditoría (`Cabecera.redondo` y `.volver`, `Cerrar`, `ChipFecha.soloIcono`, `Sesion` campana y administración, la ubicación del mapa, `Ficha.iconoBarra`, `.compartirFoto` y `.accionIcono`, `BotonRenglon`; el «Estoy aquí» que el doc llamaba `Mapa.ubicame` ya no existía —P1 quitó esa regla muerta—, sus herederos son los de las dos hojas «Dónde») más los que aparecieron al buscar `border-radius: 50%` sobre un botón: `FichaPersona.accion`, `FormularioCanon.accionIcono`, `admin.puntos`, `Cartel.visorCerrar`, el contador de `obras` y la ✕ que vacía un campo (`Limpiar`).
- **20 reglas de botón con texto**, con alturas de 36, 40, 44 y 48, radio de campo o de píldora y borde de tinta o de `--borde`: `Ficha.primaria`, `.secundario` y `.publicadoBoton`, `AgendaInicio.accion`, `Sesion.entrar`, `FormularioCanon.rehacerCartel`, `Atras`, `CargarMas`, `Desbloquear`, `Borrar.peligro`, `Bloquear.confirmarBoton`, `Reportar.enviar`, `SelectorEnlaces.agregar`, `ActivarAvisos.boton`, `SelectorFecha.listo`, `CompartirFicha.nativo`, `FichaPersona.completa > a`, `MisArtistas.publicar`, `LetreroCorreoLigado.reclamar` y `borrado.accion`; y el propio `Boton`, que medía **51,2 px** y no 48: su relleno vertical de 12 px sumaba a la línea de 25,2 px y al borde.
- **Controles de 40 px** (H-05): `Sesion.entrar`, `Chip.deContexto`, el chip de fecha (cuatro reglas), `Cabecera.redondo`, el campo de búsqueda abierto y su ✕, `Atras` y `Cerrar`; y de 36: «Completar» del perfil, «Activar» de los avisos, «Probar con otra foto», el contador de la obra y la ✕ de los campos.
- El **«+»** era el glifo de Voy, de seguir un lugar y de seguir un artista.
- **`Chip` tenía su propio marcador de «en camino»** (`useLinkStatus`), y `Boton` con enlace ninguno: «Ver más» tocado no decía nada hasta que respondía el servidor.
- El **nombre accesible** de los botones de renglón era fijo por acción («Voy — título»), la corrección de la bitácora 139.

## Lo que se hizo

### 1. `Boton` (`ui/Boton.tsx` y `.module.css`, reescritos)

Un solo botón con texto, `<button>` o, con `href`, `<Link>`. Props: `variante` (`primario`, `secundario`, `texto`, `peligro`), `forma` (`recta` o `pildora`), `alto` (`toque` 48 o `control` 44) y `ancho` (`completo` o `contenido`). Por omisión es el de siempre (primario, recto, 48, completo): los 33 usos que ya había no cambiaron de llamada (salvo el de «Ver ficha» del mapa, que dejó su `className`); la variante que se llamaba `principal` ahora es `primario`, y ninguno la pasaba a mano. Lo que dibuja es lo del prototipo firmado (bloque «4. Controles canónicos» de `docs/rediseno/prototipos/restructura-ui.html`, en la rama `restructura-ui`): radio `--radio` o `--radio-pildora`, 700, gap de 8 entre el icono y el texto, secundario con borde `--borde`, peligro con letra `--error`, texto en `--primario` sin fondo; el alto `control` baja la letra a `--letra-sm` (15 px, la de los chips y la del `.texto` del prototipo). El relleno vertical pasa de 12 a 8 y el alto lo da `min-height`: mide exactamente 48 (o 44) y, con una etiqueta de dos renglones, sigue con aire (el prototipo lo deja en 0 y no dice qué pasa con dos renglones; con 8 no quedan pegados al borde).

- **Estados.** El pulsado y el foco visible ya los da la app entera (`globals.css`: `button:active` a 0,6 y `:focus-visible`), así que ninguna variante los repite. Deshabilitado, `disabled` o `aria-disabled="true"` (cuando el motivo se lee en pantalla y el botón sigue en el orden del foco), a 0,55. En camino: un enlace late solo, con el marcador `EnCamino` (`ui/EnCamino.tsx`, el mismo de `Chip`, que ahora lo importa: se borró su copia); un botón, con `aria-busy`.
- **Composición.** `claseBoton({ variante, forma, alto, ancho })` devuelve las clases para lo que no puede ser un `<button>` ni un `<a>`: la etiqueta «Probar con otra foto» dentro de una tarjeta que ya es el control, o `BotonCompartir`, que recibe su `className`. Vive en un módulo sin `"use client"`, porque las páginas de servidor la llaman.
- **Lo único que se le ajusta desde fuera** son dos variables: `--boton-relleno` y `--boton-hueco` (el hueco entre el icono y el texto), que usa `Atras` (el chevron ya trae su aire por dentro). Se hizo con variables porque dos módulos de la misma fuerza se pisan según el orden en que llegue cada uno a la hoja de estilos (ver el punto 5).
- **Ancho.** `completo` es `display: flex` y su `width: 100%` va en `:where()` (peso cero): si quien lo usa le pone un ancho propio con márgenes a los lados (`ListaArtistas`, «Ver más», que sigue con `width: auto` y el gutter), gana siempre.

### 2. `BotonIcono` (`ui/BotonIcono.tsx` y `.module.css`, nuevos)

El botón redondo de solo icono, `<button>` (con `type="button"` por omisión) o, con `href`, `<Link>`. `tamano`: `control` 44, `accion` 48 o `grande` 56 (con el glifo a 26); `relieve`: `plano` (transparente), `elevado` (blanco, `--sombra`, glifo violeta) o `contorno` (borde `--borde`; solo este relieve lleva borde: con uno transparente en los demás, el punto de aviso de la campana de `Sesion` se corría 1 px, porque sus `top` y `right` se miden desde el borde de dentro; se vio al comparar los rectángulos); `decidido`: `--ok` con el glifo en `--primario-texto` (blanco), va al final del módulo y con la misma fuerza que los relieves, así que nada lo pisa, y pone `aria-pressed`. `aria-label` es obligatorio (sin texto a la vista). No fija la posición, el sitio ni el tamaño del glifo: eso lo decide quien lo usa (cada glifo conserva el tamaño que ya tenía). `claseBotonIcono({ tamano, relieve, decidido })` sirve al círculo de una acción de ficha (un `<span>` dentro de un `<a>` o un `<button>`, con su letrero debajo) y a la etiqueta del campo de archivo (la cámara del perfil y del artista).

### 3. Glifos de acción y nombres

- `IconoPersonaMas` e `IconoCampanaMas` (`ui/Iconos.tsx`) con los trazos del generador del prototipo, 24×24 y trazo de 1,8 como los demás.
- `BotonRenglon` recibe `objeto` (`evento`, `lugar` o `artista`; lo pone el hook que ya sabe qué guarda: `useAsistenciaEnLista` y `useSeguirEnLista`) y dibuja la palomita, la campana con «+» o la persona con «+»; decidido, la palomita blanca sobre verde en los tres. El botón «Seguir» de la ficha de lugar y de artista (`Seguir.tsx`) lleva el mismo glifo.
- **Nombres accesibles.** Dicen el estado: «Voy — título» o «Ya vas — título», «Seguir — nombre» o «Sigues — nombre», y siguen con `aria-pressed`. La bitácora 139 había fijado el nombre porque «Ya no vas» con el botón presionado sonaba al revés: un nombre que dice el estado no lo contradice. Va el título detrás para distinguir un botón de otro en una lista.
- **`IconoEstrellaMas` e `IconoPinMas` no se retiraron**: en el código nunca significaron «seguir»; solo los usa `Publicar` («Registrar artista» y «Registrar lugar»), que retira P4. Se van con él.

### 4. Alturas: barras a 44, acciones a 48

Todo lo que se toca en una barra o cabecera mide 44 (`--control`): la lupa, la ✕ de las altas, el chip de contexto (su `min-height: 40` sobraba: el chip base ya mide 44), el chip de fecha con y sin fecha (la pastilla con fecha mide 44 con un `height` y sus dos botones de 44 sobresalen sobre el borde; antes eran 42 contra 40), el campo de búsqueda abierto y su ✕, «Atrás», «Entrar», «Completar» y la ✕ que vacía un campo (`Limpiar`, de 36 a 44 con el mismo centro: el círculo es transparente, así que no se ve más grande). `--alto-cabecera` pasa de 100 a 104 y su respaldo `--fila1` de 56 a 60 (la fila de chips ya no es de 56 sino de 60), y el esqueleto de la cabecera (`ListaEsqueleto.chip`) sigue al chip. Lo de 48 (`BotonRenglon`, ubicación, volver arriba, «Estoy aquí», compartir sobre el avatar, `Boton`) ya era 48; el `Boton` dejó de medir 51,2.

**Una fila que iba justa.** En Agenda con un día elegido, a 390 px, la fila de la cabecera ya iba sin holgura (la pastilla del día, de 140,3, más 8 de aire y el chip de la ciudad, de 152,8, sumaban 301,1 de los 302 de su columna). La primera compilación con la lupa de 44 le quitó 4 px a esa columna y el chip de la ciudad se cortó («San Luis Pot…»): se vio en la captura y se midió. Ahora `Cabecera.acciones` deja 4 px de aire a su izquierda y no 8: la lupa crece hacia la izquierda y la columna de los chips conserva sus 322 px, así que el chip vuelve a medir 152,8. El único efecto es que, con la fila llena, el aire entre el chip de la ciudad y la lupa es de 4 px (era de 8).

### 5. Lo que no se puede dejar al orden de los módulos

La primera compilación de `Atras` sobre `Boton` (su relleno y su hueco en su propio módulo, con la misma fuerza que los de `Boton`) salió bien en cinco pantallas y mal en otras cinco: en las fichas de lugar y de artista la píldora medía 92 px y no 78, porque en esas rutas el módulo de `Boton` llegaba después que el de `Atras` y pisaba sus dos reglas. Se vio solo en la compilación real, con la comparación antes y después. De ahí (y de un borde transparente que corría 1 px el punto de la campana) salieron cuatro reglas para el código de esta pieza:

1. Un módulo que usa un componente le pone su **sitio** (posición, área de la rejilla, márgenes), nunca su **dibujo**; los componentes no fijan posición ni área.
2. Lo que un componente deja ajustar va por **variable** (`--boton-relleno`, `--boton-hueco`) o pesa **cero** (`:where`), no por una regla de la misma fuerza.
3. Lo que un módulo cambia de un glifo (la ubicación del mapa es oscura y del color de acción con ubicación; «Estoy aquí», la ✕ del visor y el ↑ son oscuros) se pone **en el icono** (`.ubicacion > svg`), que pesa más que el color heredado del botón y no pelea con él.
4. Un componente que otro módulo usa como caja de posición (la campana y su punto de aviso) no lleva un borde que no se ve: cambia el borde de dentro desde el que se miden los `top` y los `right` de lo que lleva.

### 6. Reglas retiradas o reducidas a su sitio

**Círculos (19) → `BotonIcono`:**

| Antes | Después |
|---|---|
| `Cabecera.redondo` (la lupa) | `BotonIcono contorno`, 44 |
| `Cabecera.volver` (↑) | `BotonIcono accion elevado`; queda `position: fixed` y el glifo oscuro |
| `Cerrar` (✕ de las altas) | `BotonIcono contorno` con `href` y `prefetch={false}`; se borra su hoja de estilos |
| `ChipFecha.soloIcono` | `BotonIcono contorno`, 44 (sin el `::before` que estiraba el toque) |
| `Sesion.campana` y `.admin` | `BotonIcono plano` con `href`; queda `.conPunto` (posición del punto) |
| `lugares.ubicacion` | `BotonIcono accion elevado`; queda su sitio y su glifo |
| `Ficha.iconoBarra` (···) | `BotonIcono plano` |
| `Ficha.compartirFoto` | `BotonIcono accion elevado`; queda su esquina |
| `Ficha.accionIcono` (56) | `claseBotonIcono({ grande, elevado })` en las tres fichas y en «Mis artistas»; el estado apagado de «Cómo llegar · sin dirección» se conserva |
| `BotonRenglon` | `BotonIcono accion elevado` con `decidido`; se borra su hoja de estilos |
| `HojaDondeEs.estoyAqui` y `HojaDondeLugar.estoyAqui` | `BotonIcono accion elevado`; queda su sitio y su glifo oscuro |
| `FichaPersona.accion` (×2) | `BotonIcono contorno` |
| `FormularioCanon.accionIcono` | `BotonIcono contorno` (botones) o `claseBotonIcono` (la cámara, un `<label>`); queda `.salida` (su celda) |
| `admin.puntos` | `BotonIcono plano` |
| `Cartel.visorCerrar` | `BotonIcono elevado`, 44, la ✕ oscura |
| `obras.contador button` (36) | `BotonIcono contorno`, 44 |
| `Limpiar.limpiar` (la ✕ de los campos, 36) | `BotonIcono plano`, 44; queda su sitio (`right: 2px`, el mismo centro que con 36 y `6px`) y el glifo suave |

**Botones con texto (20) → `Boton`:**

| Antes | Después |
|---|---|
| `Ficha.primaria`, `.secundario` | `Boton` (primario y secundario en contenido); `Seguir`, `Asistencia`, `EsMiEspacio`, `EsMiNombre` |
| `Ficha.publicadoBoton` | `Boton secundario control contenido` (en las tres fichas; queda su celda) |
| `AgendaInicio.accion` | `Boton secundario contenido` |
| `Sesion.entrar` | `Boton píldora control contenido` |
| `FormularioCanon.rehacerCartel` | `claseBoton(secundario, píldora, control)` sobre la etiqueta; queda su sitio |
| `Atras` | `Boton secundario píldora control` con sus dos variables; sigue siendo chevron y texto: no es un círculo |
| `CargarMas` («Ver más») | `Boton secundario píldora control` |
| `Desbloquear`, `Borrar.peligro` (que también usaba «Borrar la pared», en `BorrarPared`), `Bloquear.confirmarBoton`, `Reportar.enviar`, `SelectorEnlaces.agregar`, `ActivarAvisos.boton`, `SelectorFecha.listo`, `CompartirFicha.nativo`, `FichaPersona.completa > a`, `LetreroCorreoLigado.reclamar` | `Boton` |
| `MisArtistas.publicar` | `Boton texto` (la primera variante `texto` de la app) |
| `borrado.accion` (la salida de «Evento borrado», «Lugar borrado» y «Artista borrado») | `Boton contenido` |

Además salieron de sobra: `BotonRedondo` (el envoltorio de la lupa), `.editar` de `Reclamar`, `lugares.verFicha` (`width: 100%`), el `:active` con fondo gris de cinco círculos (queda el pulsado de toda la app) y el `min-width` de 44 que llevaban varios círculos de 48.

### 7. Lo que queda y por qué

Quedan **31 reglas de botón con dibujo propio** que no son de esta pieza, todas con dueño. Ninguna es un círculo de solo icono suelto: son botones con texto, chips, palancas, enlaces con aspecto de botón y los calendarios.

| Dueño | Reglas que siguen con su dibujo | Por qué no se tocan aquí |
|---|---|---|
| P3 (4) | las tres palancas (`ajustes.palanca`, `HojaDondeEs.palanca`, `FormularioCanon.palanca`) y `Ficha.menuItem` (las filas del menú ···) | `Palanca` es una pieza compartida de P3, y una fila de menú es un renglón |
| P4 (2) | `Publicar.publicar` (el flotante) y `lugares.verOtraVista` (el conmutador Mapa · Lista) | los retira P4 (doc 50, § 5.2 los cuenta entre lo que `Boton` sustituye, pero desaparecen con el armazón nuevo) |
| P6 (1) | «Me interesa» (`eventos/[id]/ficha.module.css` `.interesa`, un enlace subrayado) | la barra de la ficha con sus estados es de P6 |
| P9 (3) | `HojaDondeEs.accionAgregar` (la barra «Agregar lugar»), `FormularioCanon.subir` (elegir la foto del cartel) y `FormularioCanon.cartel` (la tarjeta del cartel) | las altas y la hoja única «Dónde» son de P9 |
| P10 (2) | `Chip.chip` y `SelectorQuien.elegido` | los chips son de P10 |
| P12 (17) | `CompartirFicha` «Copiar» (`.campo button`) y las dos descargas (`.descarga`): fondo `--primario-suave`, sin variante en el canon; `ConsentimientoAvisos` `.si, .no` y `.pildora`: la pregunta de avisos sale al guardar un «Voy» y el respaldo local no guarda esa escritura (ni en `main`), así que su cambio de letra (17 → 18 o 15) no se pudo ver; `admin` `.dejar, .actuar` y `.pildora` (la administración no está en las pantallas medidas); `letrero.imprimirBarra`; `novedades .telefono a` (píldora con letra violeta); `FormularioEntrar.opcion` (Apple y Google: dibujo de marca); los cinco del mando de Pincel (`.opcion`, `.centrar`, `.abrirSafari`, `.orb`, `.tarjeta`); y los «Cancelar» grises y subrayados de las hojas (`Bloquear.cancelar`, `Borrar.enlace`, `Reportar.enlace`): el canon no tiene variante de enlace | limpieza de los duplicados que queden |
| Se conservan (2) | `SelectorFecha.flecha` y `.dia` | doc 50, § 5.2: «se conservan tal cual»; su estado apagado (0,35) lo firmó OL-218 |

Y las ✕ planas de color suave (`Hoja.cerrar`, `Aviso.cerrar`, `ActivarAvisos.cerrar`, los «quitar» de los enlaces y del «cuándo») no son círculos (no llevan radio propio) y siguen igual: P12.

## Lo que cambia a la vista

Sale de comparar, control por control, las dos compilaciones en Chrome real: 50 pantallas y estados a 390×844 y a 1280×800 (y a 820×1180 y 320×568 en los que cambian de forma), con la misma sesión del respaldo local en las dos (el detalle, en «Verificación»). Medida dos veces, la compilación de `main` da **0 diferencias** en elementos, rectángulos y estilos (ruido de referencia): todo lo que sigue lo causa este cambio. **Ningún elemento aparece ni desaparece.** Las diferencias caen en tres grupos: lo que el encargo enumera (A), lo que trae consigo tener un solo botón (B) y lo que el respaldo local no muestra (C: se dibujó solo, con el código de cada lado).

### A. Lo que el encargo enumera

**Controles de barra, de 40 a 44 px** (H-05). Medido en el DOM en el teléfono; en el escritorio da lo mismo.

| Control | Antes | Después | Pantallas |
|---|---|---|---|
| Lupa de la cabecera (`Cabecera.redondo`) | 40×40 | 44×44 | 12 |
| ✕ de las altas (`Cerrar`) | 40×40 | 44×44 | 10 |
| Chip de contexto (la ciudad) | 152,8×40 | 152,8×44 | 13 |
| Chip de fecha sin fecha | 40×40 | 44×44 | 8 |
| Chip de fecha con fecha: la pastilla (y sus dos botones) | 42 (40) | 44 (44) | 1 |
| Campo de búsqueda abierto (y su ✕) | 350×40 (16×40) | 350×44 (16×44) | 2 |
| «Atrás» | 77,3×40 | 78,1×44 | 22 |
| «Entrar» | 74,3×40 | 71,4×44 | 2 |
| «Completar» de Mi perfil | 86,7×36 | 96,7×44 | 1 |
| ✕ que vacía un campo (`Limpiar`) | 36×36 | 44×44 | 3 |
| Campana, administración y ··· | 44×44 | 44×44 | igual |

Como la fila de chips mide ahora 60 y no 56, la cabecera de las pantallas raíz pasa de 100 a 104 (de 56 a 60 en Inicio y Artistas): el contenido baja 4 px y el mapa de Lugares mide 4 px menos (628 → 624). La ✕ de `Limpiar` es transparente y mantiene su centro (24 px del borde), así que no se ve más grande.

**Glifos de acción.**

- «Voy» (renglón y tarjeta de evento): la palomita, en lugar del «+».
- Seguir un lugar: la campana con «+». Seguir a un artista: la persona con «+». El botón «Seguir» de la ficha de lugar y de artista lleva el mismo glifo, a 20 px junto al texto.
- Ya decidido, los tres son la palomita blanca sobre verde (`--ok`). El círculo verde ya era así en «Voy» (corrección del founder, 2026-09-21); ahora lo es también al seguir un lugar o un artista.
- Lo que no se ve pero cambia: el nombre que oye un lector de pantalla dice el estado, «Voy — título» o «Ya vas — título», «Seguir — nombre» o «Sigues — nombre».

### B. Lo que trae tener un solo botón

Con un solo `Boton`, las copias que se parecían al canon del prototipo firmado se le parecen del todo, y las que no, cambian. Medido:

| Qué | Antes | Después | Dónde se midió |
|---|---|---|---|
| Alto de `Boton` (13 primarios de formularios y hojas, 11 secundarios «Publicar un evento aquí» y «Publicar una fecha» de las fichas, «Ver ficha» del mapa) | 51,2 | 48 | 25 botones; los formularios y las fichas quedan 3,2 px más bajos |
| «Cancelar» y «Dejar de seguir» de la ficha; «Sí, y quiero que se quite» de las hojas «¿Es tu espacio?» y «Soy yo» | 17 px, 600 («Cancelar»: 92,8 de ancho) | 18 px, 700 (97,7); «Voy · Ya estás en la lista» se estrecha 4,9 px | ficha de evento, visor y hojas |
| «Añadir» de las redes de las altas | 16 px; apagado: letra gris al 100 % | 18 px; apagado: letra oscura al 55 % | las altas de artista y de lugar |
| «Entrar» de la barra | 17 px, 74,3 de ancho | 15 px, 71,4 | Inicio y Agenda sin sesión |
| «Entrar» de «Siguiendo» (Agenda sin sesión) | 86,6 de ancho, borde de tinta | 78,6, borde `--borde` | Agenda, pestaña Siguiendo |
| «Atrás» | 15 px, 600, 77,3 de ancho | 15 px, 700, 78,1 | 22 pantallas |
| «Enviar reporte» | 17 px, 600, 126,4 de ancho | 15 px, 700, 119,8 | menú ··· › Reportar |
| «Compartir» y «Completar» de la tarjeta «Publicado» | borde de tinta (`--texto`) | borde `--borde`; mismo tamaño y letra | fichas con `?nuevo=1` |
| Círculos flotantes: ubicación del mapa, ↑, «Estoy aquí» (las dos hojas «Dónde») | borde de 1 px (ubicación y ↑) y sombra 0 6 20 al 22 % | sin borde y sombra 0 2 12 al 8 % (la de todos los elevados) | mapa de Lugares, listas con ↑, alta de evento |
| ✕ del visor del cartel | blanco al 90 %, sin sombra | blanco, con la sombra de los elevados | visor de la ficha de evento |
| Glifo del chip de fecha sin fecha y de los ··· de administración | gris (`--texto-suave`) | oscuro (`--texto`), como el de la lupa de al lado | 8 pantallas; los ··· de administración, dibujados solos |
| Botones apagados | opacidad entre 0,4 y 0,7 según el botón | 0,55 en todos | «Añadir», «Listo» y los de la tabla C |
| Al pulsar | fondo gris en la lupa, «Atrás», «Cerrar», ubicación, ↑ y círculos de ficha | se atenúa (0,6), como todos los controles | no se mide: es un estado |

Ya no se pone gris al pulsar la lupa, «Atrás», «Cerrar», la ubicación, el ↑ ni los círculos de las fichas: se atenúan (0,6) como todos los controles de la app. Y el borde de 1 px transparente que ahora llevan los botones con texto (como en el prototipo) no se ve: el alto ya lo cuenta (`box-sizing: border-box`) y su color es transparente.

### C. Lo que el respaldo local no muestra

Estos estados no salen con los datos del respaldo local (piden más de 20 elementos, una persona bloqueada, un aviso pendiente, un cartel que falló, una cuenta con artistas ligados o la administración). Cada uno se dibujó **solo, con el código de `main` y con el de la rama**, en Chrome a 390 px de ancho, y se comparó con el mismo volcado de DOM (12 casos, 143 elementos, 0 que aparecen o desaparecen). Los renglones de más o de menos dependen del texto de cada ejemplo; con textos más cortos no pasa.

| Botón | Antes | Después |
|---|---|---|
| «Ver más» (`CargarMas`) | sin fondo; 95,4×40,4; 16 px, 600 | fondo blanco; 91,6×44; 15 px, 700 |
| «Activar» de los avisos (`ActivarAvisos`) | 78,9×36 | 84,9×44; la columna del texto pierde 6 px (de 163 a 157) y la tarjeta no cambia de alto |
| «Reclamar ficha» (`LetreroCorreoLigado`) | 145,8 de ancho; 16 px | 140,7; 15 px |
| «Sí, bloquear» y «Sí, borrar…» (y el «Sí, borrar» de «Borrar la pared», que usaba la clase de `Borrar`) | 143,0 y 205,1 de ancho | 137,0 y 197,1 (relleno de 20 a 16) |
| «Desbloquear» | 137,0 de ancho; 17 px, 600 | 143,0; 18 px, 700 |
| Chip de la tarjeta del cartel («Probar con otra foto», «Reintentar», «Pedir más») | 36 de alto; letra violeta; «Pedir más» de 97,7 de ancho | 44 de alto (la tarjeta crece 8 px); letra oscura; 105,7 |
| «Publicar» de «Mis artistas» | 67,2 de ancho (relleno de 4) | 77,2 (relleno de 8 y el borde transparente); la columna del nombre pierde 10 px y, en el ejemplo, el nombre pasa de dos a tres renglones (la tarjeta, de 82 a 89) |
| Contador de mandos de una obra (`CampoCupo`) | botones de 36 (el bloque, 112 de alto) | de 44 (128) |
| ··· de una fila de administración (`MenuFicha`) | 44×44, glifo gris | 44×44, glifo oscuro |

## Verificación

Nada se da por hecho sin evidencia: lo que sigue sale de correr los comandos y las mediciones sobre el código tal como queda en la rama (último commit de código, `c9223398`).

### Comandos

- `npm run lint`: 0 errores; una advertencia que ya estaba en `main` (`docs/diseno/logotipo/iconos-sn.mjs`, `'k' is assigned a value but never used`).
- `npm run typecheck`: verde.
- `npm test`: 113 archivos, 1 474 pruebas, verde. No hay pruebas nuevas de `vitest`: la pieza no toca lógica (los nombres accesibles y el orden de las clases se comprobaron en el navegador, abajo).
- `npm run build`, sin variables de entorno como en la CI: verde (29 páginas estáticas).
- Pruebas de componente (Chrome real con esbuild; no entran en `npm test`, que solo toma los `.test.ts`): `BotonIcono.componentes` 8 de 8 (nueva: tamaños de `BotonIcono`, relieves, `decidido` y `aria-pressed`, y también `Boton`: 48 y 44, completo y contenido, apagado con `disabled` y con `aria-disabled`, en camino con `useLinkStatus`, y las clases para una etiqueta), `Destacados` 9 de 9 (con el glifo de cada objeto y el verde de lo decidido), `Seguir` 3 de 3 (con el glifo de «Seguir») y `ChipFecha` 9 de 9: **29 de 29**. Aparte, `nuevos`, `cupo` y `guardado` (21 pruebas) fallan igual con el código de `main` (esperan cosas que ya cambiaron antes de esta pieza) y `cargador` (3) pasa.
- Clases de módulos CSS: un script que resuelve, archivo por archivo, cada `estilos.clase` con el módulo que ese archivo importa. Contra `main` da una sola diferencia, y era real: `BorrarPared` seguía usando la clase `peligro` de `Borrar`, que salió con el botón unificado (habría quedado un botón sin dibujo en la administración de las obras); ahora es un `Boton`. Sin clases nuevas sin uso.

### Comparación en el navegador (antes y después)

Chrome real de la Mac con `playwright-core`, contra el respaldo local inventado (`scripts/ops/auditoria-ui/respaldo-local`, `ana@example.com`; el `.env.local` solo en carpetas de la sesión, nunca en el repo y nunca producción). Dos compilaciones completas y separadas (`origin/main`: antes; esta rama: después), servidas una junto a otra y medidas una tras otra con el mismo volcado: por cada elemento, su rectángulo y 37 estilos calculados, más el orden de apilado en una rejilla de puntos.

- **Alcance:** 50 pantallas y estados (38 de las pantallas de siempre, 3 de «borrado» y 9 con un aviso en la dirección o un toque previo: las fichas con «Publicado», el menú ···, «Reportar», «Soy yo», «¿Es tu espacio?», el compartir del artista y Agenda sin sesión en «Siguiendo») a 390×844 y a 1280×800, y a 820×1180 y 320×568 en los que cambian de forma.
- **Ruido de referencia:** la compilación de `main` medida dos veces, una tras otra y sin nada que cambie los datos en medio (las mismas 50 pantallas y estados, 11 223 elementos): 0 diferencias en elementos, rectángulos, estilos y apilado. Todo lo que sigue lo causa este cambio.
- **Antes contra después:** 0 elementos que aparecen o desaparecen (11 223 elementos comparados); tamaños y estilos que cambian, todos explicados en «Lo que cambia a la vista»; **0 cambios de orden de apilado** (82 115 puntos: en 3 581 cambia qué hay debajo porque un borde o un círculo se movió unos píxeles, pero nunca quién queda encima de quién).
- **Tamaños medidos en el DOM:** 863 botones (`BotonIcono` de 44, de 48 y de 56, `Boton` de 44 y de 48) en las 50 pantallas y estados: **0 fuera de lo que dice su clase**. `BotonIcono` de 44: 173; de 48: 417; de 56: 105.
- **`medir.js`** (toques de menos de 44, desbordes, márgenes negativos, elementos fuera de la ventana y desplazamiento horizontal), 10 pantallas sin sesión y 15 con sesión, a 390, 820 y 1280:

  | | Antes | Después |
  |---|---|---|
  | Toques de menos de 44 (sin sesión / con sesión) | 84 / 84 | 18 / 30 |
  | Desbordes | 14 / 11 | 14 / 11 |
  | Márgenes negativos | 30 / 48 | 30 / 48 |
  | Fuera de la ventana y desplazamiento horizontal | 0 | 0 |

  Los desbordes son los mismos (14 y 11, ya con otro nombre): el «+» sobre la esquina de la foto de cada tarjeta y el compartir sobre el avatar, que sobresalen de su caja a propósito. Ningún margen negativo nuevo (los que hay ya estaban: el de la ✕ de `ChipFecha`, por ejemplo). En las pantallas que recorre `medir.js` no queda ningún toque de menos de 44 en una barra; los que quedan son enlaces de texto de 18 y 21 px de alto (los de términos y privacidad), el enlace de un dato de la ficha (34×44), las palancas de 51×31 (P3), las letras de la tira de letras (34×44: P4) y un campo de archivo escondido de 1×1. Con la búsqueda abierta o con un día elegido (estados que `medir.js` no recorre y la comparación sí) hay además dos ✕ de 44 de alto y solo 16 y 32 de ancho, la del campo de búsqueda y la de la pastilla del día: no son del cambio de 40 a 44 y quedan para P10 y para quien recoja `Buscador`.
- **Recorridos con el navegador** (toques de verdad sobre la compilación de la rama): 28 de 28 comprobaciones en verde. «Atrás» vuelve a la agenda desde una ficha; «Cerrar» con algo escrito pregunta «¿Salir sin publicar?» y sus dos salidas (`Boton` secundario y peligro) hacen lo suyo; el botón de un renglón pasa a «Ya vas — título» (verde, `aria-pressed`) y vuelve a «Voy — título»; «Cancelar» y «Seguir» de las fichas llegan a su manejador; el chip de fecha abre su hoja y «Listo» la cierra; abrir la búsqueda no mueve la cabecera (104 → 104); y la ✕ de un campo mide 44×44 con su centro a 24 px del borde (36×36 con el mismo centro en `main`), vacía el campo y le deja el foco. El respaldo local no guarda «Voy» ni «Seguir» desde la ficha (con el código de `main` la barra vuelve a su estado a los ~80 ms), así que de esos dos toques se comprobó que llegan al manejador, no que se guarden.

### Pruebas puntuales

- **Los componentes que el respaldo local no muestra**, dibujados solos con el código de cada lado y comparados con el mismo volcado: «Ver más», «Sí, bloquear», «Sí, borrar», «Desbloquear», el letrero del correo ligado, los tres chips de la tarjeta del cartel, «Mis artistas», los avisos del teléfono, el contador de mandos y los ··· de administración: 12 casos, 143 elementos, 0 que aparecen o desaparecen (cifras en la tabla C de arriba).
- **El orden de los módulos CSS** (sección 5): la compilación real es la única que lo enseña. «Atrás» medía 92 y no 78 en las fichas de lugar y de artista con las reglas de la misma fuerza en dos módulos; con las dos variables mide 78,1 en las 22 pantallas que lo tienen.
- **«En camino»:** en el navegador, con `useLinkStatus` en «pendiente», un `Boton` con enlace late y uno con `aria-busy` también (prueba de componente); en la app real la navegación de un enlace precargado es instantánea y no se puede ver.
- **Lo que no se pudo medir en el respaldo local** (piden datos que no hay, como una persona bloqueada o una obra): «Sí, borrar» y «Borrar la pared» de la administración con datos reales, y `CampoCupo` dentro de una obra; se dibujaron solos (tabla C).

### Capturas

En `docs/rediseno/capturas-258/`, PNG de paleta (3,4 MB los 46). «Antes» es `origin/main`; «después», esta rama, con el mismo respaldo local y la misma sesión, una detrás de otra. Los eventos del respaldo son relativos al día de hoy (por eso dicen «Hoy» y «Mañana») y la campana lleva su punto violeta porque hay novedades sin ver: pasa igual en las dos versiones. El teléfono es 390×844 (el PNG mide el doble, 780×1688) y el escritorio 1280×800. Cada una se abrió y se miró (junto a su pareja, y con recortes ampliados de los glifos nuevos y del botón de ubicación):

| Archivo `258-…` | Qué se ve | Qué cambió |
|---|---|---|
| `01-inicio-movil-antes` | Inicio con sesión: logotipo, campana con su punto violeta (hay algo nuevo) y avatar «A»; la ciudad y la lupa; carril «Tus planes» con dos tarjetas (la charla de la Cristiada, «hoy · 19:30», y LXS COLOCAOS) con su palomita verde; «Seleccionados para ti» con dos tarjetas altas, la primera ya con «Voy» (verde) y la segunda con el «+» blanco; «Publicar evento» flotante y la navegación con Inicio activo | punto de partida |
| `02-inicio-movil-despues` | La misma pantalla con la rama | la fila de la ciudad y la lupa mide 44 y no 40 (los carriles bajan 4 px); el «+» de la segunda tarjeta es ahora una palomita violeta sobre el círculo blanco; lo ya decidido, igual; la campana y su punto, en el mismo sitio |
| `03-inicio-escritorio-antes` | Inicio a 1280: los dos carriles en la columna de 600 px, con la fila de la ciudad y la lupa arriba; «Publicar evento» flotante y la navegación a todo el ancho | punto de partida |
| `04-inicio-escritorio-despues` | Lo mismo con la rama | la misma fila de 60 y la palomita violeta en la tarjeta sin decidir |
| `05-agenda-movil-antes` | Agenda: en la fila de contexto, el calendario (círculo), la ciudad y la lupa; pestañas «Todos» y «Siguiendo»; la lista por día: «Hoy» con la charla ya con «Voy» verde, «Mañana» con «Cine de barrio» y «jue 1 de oct» con «Delirium Pollum», con el «+» blanco; «Publicar evento» flotante | punto de partida |
| `06-agenda-movil-despues` | Lo mismo con la rama | los tres controles de la fila (calendario, ciudad, lupa) miden 44 y la fila 60, y la lista baja 4 px; el «+» de «Cine de barrio» y de «Delirium Pollum» es la palomita violeta; la charla, en verde, igual |
| `07-agenda-escritorio-antes` | Agenda a 1280: la misma lista en la columna de 600 px, con el círculo de «Voy» a la derecha de cada renglón | punto de partida |
| `08-agenda-escritorio-despues` | Lo mismo con la rama | fila de contexto de 60; palomita violeta en los dos renglones sin decidir |
| `09-lugares-lista-movil-antes` | Lugares, lista: la fila de contexto y las pestañas «Todos 9 · Cercanos · Casa de cultura 1 · Museo 4»; el carril «Con eventos esta semana» (la Casa de Cultura, «Hoy · 19:30», con su palomita verde y el Teatro de la Paz); «9 lugares», letra A con ACHE Galería (foto, dirección, próximo evento y «+») y Aether (sin foto: el símbolo SN); «Ver en mapa» y «Registrar lugar» flotantes | punto de partida |
| `10-lugares-lista-movil-despues` | Lo mismo con la rama | la fila de contexto de 60 y sus controles de 44; el «+» de seguir un lugar es la campana con «+» (ACHE Galería y Aether); la Casa de Cultura, ya seguida, sigue en verde |
| `11-lugares-lista-escritorio-antes` | Lugares a 1280: el carril con cuatro tarjetas (la primera con la palomita verde, las otras con «+»), «9 lugares» y ACHE Galería con su «+»; los flotantes al borde derecho de la columna | punto de partida |
| `12-lugares-lista-escritorio-despues` | Lo mismo con la rama | la campana con «+» en las tres tarjetas y en el renglón; la fila de 60 |
| `13-lugares-mapa-movil-antes` | Lugares, mapa: en este entorno el mapa no carga (no hay token de Mapbox), así que se ve su aviso sobre el fondo claro; encima, «Ver en lista», «Registrar lugar» y, abajo a la izquierda, el botón de ubicación (círculo blanco con un borde gris fino y una sombra marcada) | punto de partida |
| `14-lugares-mapa-movil-despues` | Lo mismo con la rama | el mapa mide 4 px menos; el botón de ubicación pierde el borde y su sombra es la suave de los círculos elevados; el glifo, oscuro y del mismo tamaño y sitio |
| `15-lugares-mapa-escritorio-antes` | El mapa a 1280, sin token: el aviso, los dos flotantes y el botón de ubicación en la esquina de la columna | punto de partida |
| `16-lugares-mapa-escritorio-despues` | Lo mismo con la rama | el botón de ubicación sin borde y con sombra suave; la fila de 60 |
| `17-artistas-movil-antes` | Artistas: la fila con la ciudad; «6 artistas»; por letra, Orquesta Sinfónica de San Luis Potosí (ya seguida, verde), Aaron Cadena, Pimpolina y Feleal, todos con el símbolo SN y el «+» blanco; «Registrar artista» flotante | punto de partida |
| `18-artistas-movil-despues` | Lo mismo con la rama | la fila de la ciudad de 60 (chip de 44); el «+» de seguir a un artista es la persona con «+»; la Orquesta, en verde, igual |
| `19-artistas-escritorio-antes` | Artistas a 1280: la misma lista en la columna de 600 px | punto de partida |
| `20-artistas-escritorio-despues` | Lo mismo con la rama | la persona con «+» en los tres artistas por seguir |
| `21-evento-movil-antes` | Ficha de un evento: «Atrás», el logotipo y los tres puntos; el cartel con su lupa; título, fecha, lugar con su dirección, «Van 2 personas» y «Gratis»; las tres acciones (Compartir, A mi calendario, Cómo llegar); la descripción; y la barra fija con «Voy · Ya estás en la lista» y «Cancelar» | punto de partida |
| `22-evento-movil-despues` | Lo mismo con la rama | «Atrás» mide 44 y no 40, con la letra más negra (600 → 700); «Cancelar» es 5 px más ancho y de letra mayor (18 y no 17), y «Voy · Ya estás en la lista» se estrecha lo mismo; los círculos de las acciones, iguales |
| `23-evento-escritorio-antes` | El mismo evento a 1280: el cartel recortado a la columna de 600 px, los datos, las tres acciones repartidas y la barra al pie con sus botones dentro de la columna | punto de partida |
| `24-evento-escritorio-despues` | Lo mismo con la rama | «Atrás» de 44 y «Cancelar» algo más ancho |
| `25-lugar-movil-antes` | Ficha del Teatro de la Paz: «Atrás», logotipo y ···; foto; nombre y tipo (Foro); dirección, «1 persona lo sigue», «Próximo»; cuatro acciones (Cómo llegar, Compartir, Sitio web, Instagram); la descripción; «Próximos eventos»; y la barra fija con «+ Seguir» | punto de partida |
| `26-lugar-movil-despues` | Lo mismo con la rama | «Atrás» de 44; el botón «Seguir» lleva la campana con «+» y no el «+»; lo demás, igual |
| `27-lugar-escritorio-antes` | La misma ficha a 1280, con la barra «+ Seguir» a lo ancho de la columna | punto de partida |
| `28-lugar-escritorio-despues` | Lo mismo con la rama | «Atrás» de 44 y la campana con «+» en «Seguir» |
| `29-ajustes-movil-antes` | Ajustes: «Atrás» y el logotipo; los grupos «Tu ficha», «Avisos» (con el interruptor de «Por correo» encendido), «Cuenta» y el comienzo de «Somos nosotros»; el correo, enmascarado | punto de partida |
| `30-ajustes-movil-despues` | Lo mismo con la rama | solo cambia «Atrás» (44 y letra más negra); los grupos y los interruptores, iguales |
| `31-ajustes-escritorio-antes` | Ajustes a 1280: los mismos grupos en la columna de 600 px; «En esta computadora» con el aviso de que falta la llave de avisos del respaldo | punto de partida |
| `32-ajustes-escritorio-despues` | Lo mismo con la rama | solo «Atrás» |
| `33-alta-evento-movil-antes` | «Publicar un evento» (alta): el logotipo y la ✕ de cerrar; el campo del nombre («Falta el nombre»); las filas Cuándo («Hoy · 19:00»), Dónde (con la lupa «Buscar el lugar»), Quién, Cuánto y Más; y «Publicar evento» apagado al pie | punto de partida |
| `34-alta-evento-movil-despues` | Lo mismo con la rama | la ✕ mide 44 y no 40; «Publicar evento» (apagado) mide 48 y no 51,2, así que el formulario baja 3 px menos; la lupa de «Dónde» (contorno de 44), igual |
| `35-alta-evento-escritorio-antes` | La alta a 1280: el formulario en la columna de 600 px | punto de partida |
| `36-alta-evento-escritorio-despues` | Lo mismo con la rama | la ✕ de 44 y «Publicar evento» de 48 |
| `37-agenda-con-fecha-movil-antes` | Agenda con el día 29 elegido: la pastilla «mar 29 sep ✕», la ciudad («San Luis Potosí») y la lupa; un solo evento, la charla, con su «Voy» verde | punto de partida |
| `38-agenda-con-fecha-movil-despues` | Lo mismo con la rama | la pastilla y sus dos botones miden 44 (eran 42 y 40), el chip de la ciudad y la lupa también; el nombre de la ciudad sigue entero (con la lupa de 44 y el aire de 8 se cortaba: ver la sección 4) |
| `39-agenda-busqueda-movil-antes` | Agenda con la búsqueda abierta: el campo «Buscar un evento, sitio o artista» a todo lo ancho con su ✕, en lugar de la fila de chips | punto de partida |
| `40-agenda-busqueda-movil-despues` | Lo mismo con la rama | el campo mide 44 y no 40, igual que la fila de chips: al abrirlo la cabecera no se mueve (104 → 104 en el recorrido) |
| `41-perfil-movil-antes` | Mi perfil: «Atrás»; el avatar «A», «Ana Rentería», la colonia y, a la derecha, dos círculos (Ajustes y Compartir); la tarjeta «Falta una línea sobre ti…» con el botón «Completar»; las pestañas «Voy a 2» y «Sigo 2»; dos eventos («Hoy» y «vie 2 de oct») con su «Voy» verde | punto de partida |
| `42-perfil-movil-despues` | Lo mismo con la rama | «Completar» mide 44 y no 36 (96,7 de ancho, no 86,7) y la tarjeta 64 y no 60,5; «Atrás» de 44; los dos círculos, iguales |
| `43-alta-evento-agregar-lugar-movil-antes` | «¿Dónde es?» a pantalla completa con «Teatro» escrito: el campo con su ✕, el mapa (sin token) y el círculo «Estoy aquí» (con sombra marcada) sobre la hoja «Agregar lugar»: Nombre con el foco, Dirección, «Es un lugar privado», «Guardar y usar este lugar» apagado y la nota de qué falta | punto de partida |
| `44-alta-evento-agregar-lugar-movil-despues` | Lo mismo con la rama | «Estoy aquí» con la sombra suave; «Guardar y usar este lugar» de 48 y no 51,2 (la hoja baja 3 px); la ✕ del campo mide 44 (era de 36) y se ve igual |
| `45-borrado-movil-antes` | Tras borrar un evento: la campana con su punto, el ícono del calendario, «Evento borrado», la frase, «Ir a la agenda» (primario) y «Publicar otro evento» | punto de partida |
| `46-borrado-movil-despues` | Lo mismo con la rama | «Ir a la agenda» mide 6 px menos de ancho (129,8 y no 135,8: relleno de 16 y no de 20); el alto, 48, igual |

## Anotado para las piezas que siguen

- **Para todas las piezas: el orden de los módulos CSS no es de fiar** (sección 5 de arriba). Un módulo que usa `Boton` o `BotonIcono` le pone su **sitio** (posición, área de la rejilla, márgenes), nunca su **dibujo**; lo que el componente deja ajustar va por variable (`--boton-relleno`, `--boton-hueco`) o por una regla de peso cero (`:where`), y lo que cambia de un glifo va **en el icono** (`.x > svg`). Una regla de la misma fuerza en otro módulo se ve bien en una compilación y mal en otra, y solo se nota comparando la compilación real (así se vio: «Atrás» medía 92 px en las fichas de lugar y de artista y 78 en el resto).
- **P3 (Renglon, Esqueleto, Palanca y SoloLector).** `BotonRenglon` ya es un `BotonIcono` de 48 con `elevado` y `decidido`, y recibe `objeto` (`evento`, `lugar` o `artista`) para su glifo: `Renglon.module.css` y `Destacados.module.css` solo lo colocan (`grid-area`, `> button`) y no deben volver a darle tamaño ni color. Las tres palancas (51×31 y 44×26) y `Ficha.menuItem` (48 sin borde, un renglón de menú) siguen con su dibujo. El esqueleto de la cabecera (`ListaEsqueleto.chip`) sigue al chip con `--control`; `--alto-cabecera` (104) y el respaldo `--fila1` de `Cabecera` (60) se movieron con él.
- **P4 (armazón, barra y navegación).** `Publicar` (el flotante) y `verOtraVista` (Mapa · Lista) conservan su dibujo: los retira P4. `Cabecera.volver` (el ↑, `position: fixed`) es el mismo `BotonIcono` de 48 que la ubicación del mapa; cuando la barra se recoja al bajar, se va con ella. `Sesion` ya usa `Boton` para «Entrar» y `BotonIcono` de 44 para la campana y la administración: el punto (`.conPunto`) es lo único propio. `Atras` y `Cerrar` usan `Boton` y `BotonIcono` con `prefetch={false}` (como el `<a>` que eran: la pantalla madre no se pide hasta que se vuelve a ella). `--alto-cabecera` y `--fila1` siguen puestos a mano: el grid de P4 los sustituye.
- **P6 (ficha).** `Asistencia` y `Seguir` usan `Boton` para «Voy», «Cancelar», «Seguir» y «Dejar de seguir»; «Me interesa» (`ficha.interesa`) sigue como un enlace subrayado. El círculo de las acciones de ficha (`Ficha.accion > span`) es `claseBotonIcono({ grande, elevado })` puesto en un `<span>` porque va dentro de un `<a>` o un `<button>` con su letrero (nunca un control dentro de otro); si P6 las pasa a botones reales, el círculo pasa a `BotonIcono` y el `<span>` sobra. Las dos pastillas flotantes que dibuja P6 pueden usar `Boton` con `forma="pildora"`, `alto="control"` y, si piden menos aire, `--boton-relleno`.
- **P9 (altas).** Las dos hojas «Dónde» ya comparten el «Estoy aquí» (`BotonIcono` de 48 con el glifo oscuro y el mismo sitio); su barra «Agregar lugar» (`HojaDondeEs.accionAgregar`) y `FormularioCanon.subir` siguen con su dibujo. El botón que dice qué falta usará `aria-disabled="true"` con `aria-describedby`: `Boton` ya lo apaga (0,55) igual que `disabled`, y sin `onClick` (lo dice su documentación).
- **P10 (chips).** `ChipFecha` sin fecha ya es un `BotonIcono` de 44 con contorno; con fecha sigue siendo una composición (`.conFecha.conFecha`, la clase repetida para pesar más que `Chip`, y el `margin: 0 -8px 0 2px` de su ✕, que ya estaban). Los dos botones de la pastilla miden 44 de alto y sobresalen por encima de su borde; el ancho de la ✕ (32) y el de la ✕ del campo de búsqueda abierto (16, de `Buscador`, que se conserva) están por debajo de 44: no son del cambio de 40 a 44 y quedan para P10 y para quien recoja `Buscador`.
- **El 36 del prototipo.** El prototipo firmado define un `.boton.chico` (36 px, píldora, 15 px), pero ninguna de sus pantallas lo usa y el doc 50 (§ 5.2) solo tiene alto de 44 y de 48; por eso «Completar», «Activar», el chip de la tarjeta del cartel y el contador de mandos, que medían 36, pasaron a 44. Si el gestor quiere el 36, es un alto más de `Boton`.
- **P12 (limpieza).** Las 31 reglas de la tabla de la sección 7, con su motivo. Además, los «Cancelar» grises y subrayados (`Bloquear.cancelar`, `Borrar.enlace`, `Reportar.enlace`) y «Me interesa» son enlaces con aspecto de texto: el canon no tiene esa variante (la variante `texto` de `Boton` es violeta y en negrita), así que hay que decidir si la tienen o si pasan a `texto`.
- **`IconoEstrellaMas` e `IconoPinMas`** solo los usa `Publicar` (para registrar un artista o un lugar); se van con él (P4). El encargo pedía retirarlos «donde significaban seguir»: nunca lo significaron.
- **Nombres accesibles.** El estado va en el nombre («Ya vas — título») **y** en `aria-pressed`. La guía de ARIA para botones conmutadores prefiere un nombre que no cambie (lo dice `aria-pressed`); esta pieza sigue el encargo (los textos «Voy» y «Ya vas», «Seguir» y «Sigues»). Si el gestor prefiere el nombre fijo, es una línea en `useAsistenciaEnLista` y otra en `useSeguirEnLista`.
- **Doc 50 (`docs/rediseno/50-restructura-ui.md`, rama `restructura-ui`):** no existe en `main`, así que esta rama no lo toca. Cuatro precisiones para cuando se una:
  1. § 5.2, fila `Boton`: la variante se llama `primario` (no `principal`); añadir `claseBoton()` (las clases de un botón para una etiqueta) y las variables `--boton-relleno` y `--boton-hueco`; y decir que `verOtraVista` y `Publicar` los retira P4, no P2.
  2. § 5.2, fila `BotonIcono`: añadir `claseBotonIcono()` y que el círculo de las acciones de ficha queda en un `<span>` hasta P6; `decidido` pone `aria-pressed`.
  3. § 7, P2: «0 círculos fuera del componente» se cumple para los botones redondos de solo icono (19 → 0); siguen redondos los días y las flechas de `SelectorFecha` (conservados en § 5.2), los avatares, los puntos y los pins, que no son botones de icono.
  4. § 3.2: las ✕ que vacían un campo (`Limpiar`, de 36 px) no estaban en la lista de círculos; ahora son `BotonIcono` de 44, con el mismo centro.

## Archivos

89 archivos en `src` (4 nuevos, 2 borrados y 83 con cambios: 47 de TSX o TS, 33 hojas de estilo y 3 pruebas de componente), más esta bitácora, las capturas, el documento de diseño y `OPEN_LOOPS`; la lista completa con sus cifras, en `git diff --stat origin/main`. En `src` la pieza **resta 263 líneas** (528 añadidas y 791 quitadas, sin contar las pruebas).

- **Nuevos:** `ui/BotonIcono.tsx` y `.module.css`, su prueba `BotonIcono.componentes.test.mjs`, `ui/EnCamino.tsx`, esta bitácora y `docs/rediseno/capturas-258/`.
- **Reescritos:** `ui/Boton.tsx` y `.module.css`, `ui/BotonRenglon.tsx`.
- **Borrados:** `ui/BotonRenglon.module.css` y `ui/Cerrar.module.css`; y del código, `BotonRedondo` (en `Cabecera`) y la copia de «en camino» de `Chip`.
- **A mano** (los botones, los círculos y sus reglas): `ui/Atras`, `ui/Cerrar`, `ui/Cabecera`, `ui/ChipFecha`, `ui/Chip`, `ui/CargarMas`, `ui/CompartirFicha`, `ui/MenuAcciones`, `ui/Limpiar`, `ui/Ficha`, `ui/FormularioCanon`, `ui/Reclamar`, `ui/SelectorFecha`, `ui/Iconos` (los dos glifos), `Sesion`, `AgendaInicio`, `ActivarAvisos`, `Bloquear`, `Borrar`, `Desbloquear`, `Reportar`, `SelectorEnlaces`, `FichaPersona`, `Cartel`, `Seguir`, `Destacados` y `Mapa` (solo comentarios), `useAsistenciaEnLista`, `useSeguirEnLista`, `ListaEsqueleto`, `app/globals.css` (`--alto-cabecera`), las fichas de evento, lugar y artista, `EsMiEspacio`, `EsMiNombre`, `Asistencia`, `VistaLugares`, `lugares.module.css`, las dos hojas «Dónde», `TarjetaCartel`, los formularios de evento, lugar, artista y perfil, `LetreroCorreoLigado`, `MisArtistas`, `borrado` y, en administración, `MenuFicha`, `CampoCupo`, `BorrarPared` y sus hojas de estilo.
- **Pruebas:** `BotonIcono.componentes.test.mjs` (nueva) y los cambios en `Destacados`, `Seguir` y `ChipFecha` (los glifos, el nombre de `next/link` que ahora traen los botones y la consulta de la página de `Seguir`).
- **Documentos:** esta bitácora, `docs/rediseno/capturas-258/` (46 PNG), `docs/diseno/LINEA_GRAFICA.md` (el regreso a 44 y la sección «Botones») y `docs/ops/OPEN_LOOPS.md` (la línea de OL-230 al principio de «Ahora» y el trozo de «Last updated»).
- **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` (solo lo emite el gestor) y el doc 50 (vive en `restructura-ui`: sus precisiones van arriba). Sin migraciones ni variables de entorno.
