# 259 · Renglon único con cuatro pieles, Esqueleto derivado, Palanca y SoloLector compartidos (OL-231, pieza P3)

**Fecha:** 2026-09-29 · **Rama:** `ui-renglon`, desde `origin/ui-botones` (`91decb46`) · **OL:** OL-231 · **PR:** #269 (sin unir; va montado sobre #268, `ui-botones`) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Tercera pieza del plan de OL-227 (doc 50, § 7); usa los tokens de P1 (`--foto-renglon`, `--control`, `--toque-min` y los de letra de listas) y los botones de P2.

## Pedido

Encargo del Gestor de cambios III, con el criterio de P1 y P2 («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y la regla permanente de maquetación plana (rejilla con áreas, sin envoltorios que no aporten, sin márgenes negativos). P3: un solo `Renglon` con cuatro pieles (`lista`, `dato`, `ajuste`, `resuelto`) que sustituya las cuatro rejillas de hoy (H-33); que el texto de un dato ya no se meta bajo el botón (H-17); el esqueleto de lista derivado del renglón; `Palanca`, `SoloLector` e `IconoEnCirculo` compartidos, con las copias de doc 50 § 3.3 borradas; y cerrar las reglas de botón que la bitácora 258 asigna a P3. Solo puede cambiar a la vista H-17, los altos unificados y la palanca; cualquier otra diferencia es un defecto de quien lo hace.

## Lo que había

- **Cinco rejillas para el mismo renglón «visual | texto | acción»** (H-33): `Renglon .frente` (foto de 64, aire de 12, con `.renglon` como cáscara del `li`), `Ficha .dato` (columna de 22, aire de 10), `ajustes .fila` (24 y 12), `FormularioCanon .resuelto` (24 y 12) y `Esqueleto .renglon` (64 copiado a mano).
- **H-17:** `white-space: nowrap` en cada dato de la meta. Con el respaldo local, **12 renglones** se salían de su columna y se metían bajo el botón (2 a 390 px y 10 a 320 px; el doc habla de 16 con datos de producción).
- **Tres copias del interruptor** (`ajustes` y `FormularioCanon`, de 51×31, iguales; `HojaDondeEs`, de 44×26) y siete botones `role="switch"` escritos a mano: ninguno llegaba a 44 de alto.
- `.soloLector` ×3 (`SelectorEnlaces`, `ChipFecha`, `SelectorFecha`), cada una con `margin: -1px`; el círculo gris de 64 (`.icono`) ×3 (`Borrar`, `Bloquear`, `borrado`) y un cuarto uso que lo pedía prestado (`BorrarPared`).
- `.cambiar`, el botón de texto del canon, en 15 acciones de renglones resueltos (más el «Usar esa» del aviso de artista parecido) y en 3 enlaces de Novedades.

## Lo que se hizo

### 1. `ui/Renglon` (`.tsx` y `.module.css`)

Una sola regla de rejilla (`.frente, .dato, .ajuste, .resuelto`): tres columnas (visual | texto | acción), dos filas de texto y, debajo, el cuerpo. **Cada hijo va a su área por lo que es, sin clases de sitio:** el primero es lo visual, `b` el texto principal, `small` el secundario y todo lo demás (enlace, botón, palanca, valor con chevron) la acción; esa última regla pesa cero (`:where`), así que quien nombra su área (`.cuerpo` y `.nota` de un resuelto) siempre gana. Las pieles solo cambian medidas y letra:

| Piel | Qué es | Medidas y letra (las de hoy, salvo lo marcado) | Sitios |
|---|---|---|---|
| `lista` | foto, título, datos con icono y botón hermano del enlace | foto **56** (`--foto-renglon`; era 64), título y meta con los tokens de letra de listas | Agenda, Lugares, Artistas, Inicio, fichas y perfil (componente `Renglon`; `RenglonEvento`, `RenglonLugar` y `RenglonArtista` quedan como adaptadores de datos) |
| `dato` | icono, principal, secundario y enlace | alto mínimo **44** (era 40), icono y texto a 32 | 15 filas de las fichas de evento, lugar y artista |
| `ajuste` | icono, etiqueta, detalle y chevron, valor o palanca | 52 de alto, columna de 24, aire de 14 | Ajustes, Avisos, Perfil, Instalar, Cerrar sesión y Aviso al salir |
| `resuelto` | icono, clave sobre valor y acción; cuerpo debajo | 60 de alto, columna de 24, borde de 1 | 19 filas de las altas y ediciones de evento (5), lugar (3), artista (6) y perfil (5) |

Estados, solo los que la app usa: pulsado (el de toda la app, y la fila entera en la lista, como antes), `pendiente` y `abierto` (un resuelto), `apagado` (un ajuste sin acción). **`elegido` (`aria-current`) existe en la lista desde el 2026-09-14 pero ningún componente lo pone todavía** (comprobado con `grep` en todo `src`): se conserva la regla que el founder pidió y no se activa en ninguna otra piel.

**H-17.** Cada dato de la meta es un `<span>` con su icono y su texto en otro `<span>` (o `<b>`), con `min-width: 0` y `max-width: 100%`: el que es una sola línea se corta con puntos suspensivos dentro de su columna, y la dirección (`.envuelve`, que ya se partía) sigue partiéndose, ahora también si trae una palabra larguísima. Un flex con el texto suelto recorta sin puntos suspensivos (se probó en Chrome): por eso el envoltorio del texto.

Los botones de acción de los resueltos son `Boton variante="texto" alto="control"` (el dibujo era el de `.cambiar`); los de la lista ya eran `BotonIcono` (P2).

### 2. `Esqueleto` derivado

`EsqueletoRenglon` dibuja el mismo `li` de lista con barras grises en lugar de foto, título y meta: usa las clases de `Renglon.module.css` (`.lista`, `.frente`, `.foto`), así que el alto, la foto, el aire y el filete son los suyos y no lleva una sola medida propia (las barras miden el alto de la letra que sustituyen, con los tokens). `EsqueletoDato` (nuevo) hace lo mismo con el dato de una ficha y sustituye a tres envoltorios idénticos (`EsqueletoMetaLugar`, `EsqueletoMetaArtista`, `EsqueletoDatosQuien`), que ponían un bloque de texto en la columna del icono (una barra de 22 px). Las tarjetas y el carril (`EsqueletoTarjeta` y `CarrilEsqueleto`, con 220, 132, 165, 248 y 104 escritos a mano) son de la pieza de tarjetas, no de esta.

### 3. `Palanca`, `SoloLector` e `IconoEnCirculo`

- **`ui/Palanca`** (`encendida`, `aria-label` obligatorio): un botón `role="switch"`. Se ve en **51×31** (el riel y la perilla de 27 del prototipo firmado, bloque «4») y se toca en **51×45**: siete píxeles de aire arriba y abajo para llegar a 44 sin márgenes negativos ni una capa que el medidor no cuenta. El anillo de foco rodea el riel, no la caja. Sustituye a las tres copias y a los siete botones a mano; el movimiento reducido ya lo apaga `globals.css`, así que su regla propia sobraba. Un renglón la coloca solo (`[role="switch"]` es una acción); `ReservaPerfil` le da su área con una regla.
- **`ui/SoloLector`** (`<span>` con `clip-path: inset(50%)`, sin margen negativo): sustituye a las tres copias; el `<p>` de los dos anuncios pasa a `<span>` (un anuncio en vivo no necesita ser un párrafo).
- **`ui/IconoEnCirculo`** (64, gris, adorno): sustituye a las tres copias y al préstamo de `BorrarPared`; el aire de 8 de abajo pasa a `margin-top` del título de cada composición.

### 4. Reglas de botón que la bitácora 258 asigna a P3

| Regla | Después |
|---|---|
| `ajustes.palanca`, `FormularioCanon.palanca`, `HojaDondeEs.palanca` | **Cerradas:** una sola `Palanca` |
| `FormularioCanon.cambiar` (no estaba en la tabla de 258) | **Cerrada:** `Boton` de texto en las 15 acciones de los renglones resueltos y en «Usar esa» |
| `Ficha.menuItem` (las filas del menú ···) | **No se toca; pasa a P6.** El prototipo firmado no dibuja ese menú: la piel `ajuste` trae un icono de 24 (una sangría de 36 px en filas que hoy sangran 4), letra en negrita y 52 de alto, y ninguna de las tres diferencias está entre las que el encargo permite. Lo decide P6 al rehacer «Más» de la ficha |
| `SeccionNovedades` (Publicar, Editar y Ver más, que usaban `.cambiar`) | Pasan a su propia clase `.accion` en su módulo. Se probó `Boton` de texto y **reacomoda la cabecera y el pie** (el enlace era un elemento flex con el texto arriba de su caja de 44; el botón lo centra: el título bajaba 10 px). Anotado para P6 |

## Lo que cambia a la vista

**A. Lo que el encargo enumera**
- **H-17:** a 320 px, «Próximo: dom 4 de oct · 18:00» ya no corre bajo la campana de seguir (queda «Próximo: dom 4 de oc…»), «Música académica y …» se corta en su columna y la dirección larga de un lugar o de un artista se parte en vez de esconderse bajo el botón (capturas 10 y 11).
- **Alto de la lista:** la foto baja de 64 a 56; los renglones que mandaba la foto miden 8 px menos (Artistas: 89 → 81) y los demás no cambian de alto. Dos renglones bajan una línea entera («Inauguración de Uno de Uno», 116,7 → 93,7, y «Museo Nacional de la Máscara», 116,7 → 94,8) porque con 8 px más de columna su último dato cabe en la línea de arriba.
- **Alto del dato:** cada fila de dato de una ficha mide como mínimo 44 (era 40): +4 px por fila de una línea.
- **Palanca:** se toca en 51×45. La de «Lugar privado» (44×26) pasa a 51×31. Las filas con palanca y una sola línea de detalle crecen 1,7 px en Ajustes y 5 en «Soy yo / es mi grupo» (60 → 65).

**B. Lo que trae tener una sola rejilla y un solo botón**
- Aire unificado del dato: icono, texto y acción a 12 (era 10). El texto arranca en el mismo sitio (32 px), pero el texto de un dato sin acción termina 2 px antes: en la ficha de evento de la captura 4, la dirección se parte una palabra antes.
- «Cambiar», «Agregar» y «Listo» de las altas quedan 1 px a la izquierda: el `Boton` trae un borde transparente de 1 px.
- El esqueleto de un dato de ficha ya muestra un icono y una línea (era un tope gris de 22 px en la columna del icono).

**C. Lo que no cambia** (comprobado): el menú ···, el estado pulsado y el de ratón encima del renglón (mismos valores calculados), la hoja «Perfil» con su palanca, el anillo de foco de la palanca, los renglones abiertos de las altas y el resto de posiciones de todas las pantallas medidas (tabla de abajo).

## Verificación

Nada se da por hecho sin evidencia: lo que sigue sale de correr los comandos y las mediciones sobre el código tal como queda en la rama.

- `npm run lint`: 0 errores; una advertencia que ya estaba en `main` (`docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 113 archivos, 1 474 pruebas, verde. `npm run build`, sin variables de entorno como en la CI: verde (29 páginas estáticas).
- **Pruebas de componente** (Chrome real con esbuild; no entran en `npm test`): `Renglon.componentes` **7 de 7** (nueva: la foto de 56 y el esqueleto de lista y de dato con el mismo alto que su fila, 81 y 44; ningún dato pasa del borde de su columna aunque sea larguísimo y el largo se corta con puntos suspensivos; las pieles `dato`, `ajuste` y `resuelto` con sus medidas, sus áreas y sus estados; la palanca en 51×45 con riel de 51×31 y perilla de 27 que recorre 20; `SoloLector` sin sitio e `IconoEnCirculo` de 64). Se comprobó que la del H-17 falla si se quita el corte con puntos suspensivos. Las demás siguen igual: `BotonIcono` 8/8, `Destacados` 9/9, `Seguir` 3/3, `ChipFecha` 9/9 y `cargador` 3/3; `nuevos` (6), `cupo` (13) y `guardado` (2) fallan igual con el código base (`nuevos`, comprobado).
- **Clases de módulos CSS:** un script que resuelve, archivo por archivo, cada `estilos.clase` con el módulo que ese archivo importa. Encontró un uso que había que pasar (`BorrarPared` seguía usando el `.icono` de `Borrar`); sin clases que falten ni clases nuevas sin uso.
- **Cifras con el respaldo local inventado** (Chrome real, `playwright-core`; dos compilaciones separadas, `origin/ui-botones` antes y esta rama después; el `.env.local` solo en carpetas de la sesión, nunca en el repo):

  | | Antes | Después |
  |---|---|---|
  | **H-17:** renglones de lista que se salen de su columna (248 medidos: 10 pantallas × 320, 390, 820 y 1 280 px) | **12** (2 a 390, 10 a 320) | **0** |
  | `medir.js`, desbordes (17 pantallas con sesión × 3 tamaños; móvil) | 20 | 17 (Artistas: 3 → 0; los demás son los de siempre, el compartir sobre el avatar y los carriles de acciones) |
  | Toques de menos de 44 | 23 | 17: **0 palancas** (4 → 0) y el «ver» de un dato pasa de 34×44 a 44×44; quedan la tira de letras (P4), enlaces de texto de 18 a 21 px de alto dentro de una frase (P6 y P12) y los campos de archivo escondidos de 1×1 |
  | Márgenes negativos | 34 | **32** (salen los dos `-1px` de `SoloLector`; ninguno nuevo) |
  | Envoltorios sin estilo | 29 | 16 (los `span` de un solo chevron de Ajustes, 8 → 0) |
  | Nodos | 1 638 | 1 659 (+21: el envoltorio del texto de cada dato de la meta) |
  | Fuera de la ventana y desplazamiento horizontal | 0 | 0 |
- **Posiciones, texto por texto y control por control** (mismo volcado antes y después, a 390 px): Ajustes, Editar perfil y las tres altas: solo cambian las filas con palanca y el 1 px de los botones de texto; fichas de evento, lugar y artista: cada dato +4 px, acumulados; Agenda, Lugares, Artistas y Perfil: foto −8 y el texto −8 a la izquierda.
- **Dibujados solos con el código de cada lado** (lo que el respaldo local no muestra): «Novedades» de una ficha de artista (idénticas al píxel con `.accion`; con `Boton` de texto se movían) y «Usar esa» dentro del aviso «Ya hay N artistas con…» (misma caja y mismo alto; 2 px más de ancho por el borde transparente).

## Capturas

`docs/rediseno/capturas-259/` (22 PNG de paleta, 1,9 MB): cada par es «antes» (`origin/ui-botones`) y «después» (esta rama), con la sesión de `ana@example.com` del respaldo local inventado; cada una abierta.

1. **Agenda a 390** (`01`): las dos tarjetas de «Hoy · 2» con su hora, su dirección en tres líneas y el precio; la foto mide 56 y el texto sube 8 px a la izquierda; lo demás, igual.
2. **Lugares, lista a 390** (`02`): «Con eventos esta semana», ACHE Galería y Aether; foto de 56; el «Próximo» de cada uno cabe.
3. **Artistas a 390** (`03`): la Orquesta Sinfónica con su dato de disciplina y su próxima fecha; foto redonda de 56; en «antes» el dato de disciplina llega al borde del botón, en «después» queda dentro.
4. **Ficha de evento a 390** (`04`): los datos (hora, lugar con su dirección, «Con…», quién va y precio); cada fila mide 44 como mínimo y el texto arranca en el mismo sitio.
5. **Ficha de lugar a 390** (`05`): dirección, «1 persona lo sigue» y «Próximo…» con su «ver»; +4 px por fila.
6. **Ajustes a 390, página entera** (`06`): las tres palancas (Por correo encendida, En el teléfono apagada, Avisar al salir encendida) con el mismo riel de 51×31; las filas con palanca, hasta 2 px más altas.
7. **Alta de evento a 390** (`07`): Cuándo, Dónde (pendiente, con su lupa), Quién, Cuánto y Más; iguales, con «Cambiar» y «Agregar» 1 px a la izquierda.
8. **Agenda a 1 280** (`08`) y 9. **Ajustes a 1 280** (`09`): la misma columna centrada; solo la foto de 56 y, en Ajustes, la palanca.
10. **Lugares, lista a 320** (`10`) y 11. **Artistas a 320** (`11`): el H-17 a la vista. «Antes»: «Próximo: dom 4 de oct · 18:00» y «Próximo: hoy · 18:00 · Templo…» corren bajo el botón; «después»: la línea de un solo renglón se corta con puntos suspensivos y la dirección se parte dentro de su columna.

## Anotado para las piezas que siguen

- **P6 (ficha).** (1) `Ficha.menuItem` y las filas del menú ··· (`Bloquear.enlace` es una copia); (2) el dato conserva la letra de hoy (17 px en peso 500) y no la del prototipo (19 px en 700, la del título de la lista): es una decisión de diseño de la ficha; (3) el enlace de un dato («ver», «Entrar») sigue gris de 15 px, ahora de 44×44; el prototipo pone el chevron y toda la fila es el enlace; (4) `SeccionNovedades.accion` (Publicar, Editar y Ver más) pasa a `Boton` de texto cuando se rehaga la cabecera y el pie con la línea base; (5) el dato con avatares apilados (`pila`) del prototipo no existe todavía.
- **P9 (altas).** (1) Las tres notas sueltas bajo el campo del nombre (`FormularioLugar`, `FormularioArtista`, `FormularioNovedad`) usan `renglon.nota` fuera de un renglón, como antes usaban `canon.cuerpoNota`: son `canon.notaCampo`; (2) las filas de palanca de las hojas (`ReservaPerfil.interruptor`, `HojaDondeEs.filaPrivado`, `InterruptorPincel`) son la piel `ajuste sola` del prototipo, con icono; hoy solo comparten la palanca; (3) `FormularioCanon.salida` (la cámara: una etiqueta con el campo de archivo escondido) queda ahí.
- **P10 (chips).** `.estado` («Te interesa») y `.sello` («Solo tú lo ves») viven en `Renglon.module.css` hasta que `Chip` los sustituya.
- **P12 (limpieza).** Otras filas parecidas que este encargo no nombra: `admin .fila`, `.dato` y `.menuItem`, `bloqueados .fila`, `SelectorCuando .fila`, `MisArtistas`; y la composición `.confirmar` de `Borrar` y `Bloquear`, que sigue repetida aunque el círculo ya sea uno.
- **Meta de dos líneas.** El prototipo recorta la meta del renglón a dos líneas con puntos suspensivos; hoy la dirección de un evento se parte en las líneas que necesite (hasta cuatro con las direcciones largas del respaldo local). Recortarla esconde texto y no está entre lo que el encargo permite; si el founder la quiere, es una línea (`-webkit-line-clamp: 2` en `.envuelve`).
- **`Boton` de texto y `--boton-relleno`.** La variante `texto` de `Boton` fija su relleno en su propia regla y no lee la variable `--boton-relleno` (las otras variantes sí): si algo necesita menos relleno en una variante de texto, hay que enseñársela (una línea).
- **Doc 50 (`docs/rediseno/50-restructura-ui.md`, rama `restructura-ui`):** no existe en `main`; precisiones para cuando se una: § 5.2, fila `Renglon`: las pieles son las clases de `Renglon.module.css`; el componente `Renglon` solo dibuja la de lista (las otras tres son un `<li>`, un enlace o un botón con la clase), y `EsqueletoDato` es nuevo; fila `Palanca`: caja de 51×45, riel de 51×31; § 3.3: `.palanca`, `.soloLector` ×3 e `.icono` ×3 quedan resueltas; § 7, P3: «16 renglones» con datos de producción; con el respaldo local son 12; `Ficha.menuItem` pasa a P6.

## Archivos

85 archivos (22 son capturas): 32 nuevos (9 de `src`, esta bitácora y las 22 capturas), 1 borrado y 52 con cambios; la lista completa, en la comparación con `origin/ui-botones`. En `src` la pieza **resta 54 líneas** (857 añadidas y 911 quitadas, sin contar la prueba): el CSS baja 94 (456 y 550) y el TSX sube 40 por los cuatro componentes compartidos.

**Nuevos:** `ui/Renglon.tsx` y `.module.css`, `ui/Palanca.tsx` y `.module.css`, `ui/SoloLector.tsx` y `.module.css`, `ui/IconoEnCirculo.tsx` y `.module.css`, `ui/Renglon.componentes.test.mjs`, esta bitácora y `docs/rediseno/capturas-259/`. **Borrado:** `components/Renglon.module.css`. **Reescritos:** `RenglonEvento`, `RenglonLugar`, `RenglonArtista` (adaptadores de datos), `ui/Esqueleto.tsx` y `.module.css`. **Renglones:** las tres fichas (`eventos/[id]`, `lugares/[id]`, `artistas/[id]`), `ajustes/page.tsx`, `InstalarApp`, `BotonSalir`, `AvisoSalidaAjuste`, `AvisosPerfil`, `ReservaPerfil` y los cuatro formularios (`FormularioEvento`, `FormularioLugar`, `FormularioArtista`, `FormularioPerfil`). **Copias retiradas:** `.palanca` (`ajustes`, `FormularioCanon`, `HojaDondeEs`), `.soloLector` (`SelectorEnlaces`, `ChipFecha`, `SelectorFecha`), `.icono` (`Borrar`, `Bloquear`, `borrado`), `.dato`, `.suave` y `.datoEnlace` de `Ficha`, `.fila`, `.valor` y `.apagada` de `ajustes`, y de `FormularioCanon` todo lo del resuelto (`.renglones`, `.resuelto`, `.pendiente`, `.abierta`, `.miniatura`, `.clave`, `.valor`, `.falta`, `.cambiar`, `.opciones`, `.cuerpo`, `.cuerpoNota`); `FormularioCanon` conserva su campo, su cartel, su cuerpo (chips, entrada, subir) y la cámara (`.salida`). **Documentos:** `docs/diseno/LINEA_GRAFICA.md` (sección «Renglones y palanca») y `docs/ops/OPEN_LOOPS.md` (la línea de OL-231 al principio de «Ahora» y el trozo de «Last updated»). **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50. Sin migraciones ni variables de entorno.
