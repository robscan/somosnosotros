# 501 · Historial del lugar y Trayectoria del artista, escalables (OL-469, prototipo)

**Fecha:** 2026-10-28. **Rama:** `historial-escalable`, desde `origin/main` (`12ab4582`). **Gestor:** Gestor de cambios VII (operador: agente Claude). **Sin código de la app ni migración.** Solo el prototipo, el respaldo local con un historial grande y los guiones de captura.
**Estado:** prototipo, espera firma. El código va después de la firma.

## El encargo

El founder, el 28 de octubre, mirando en su iPhone la ficha del Museo Leonora Carrington: «se dice "han pasado por aquí 9" y luego aparecen círculos de artistas en carrusel pero no se puede navegar. Solo se muestran 5 de 9. Luego debajo hay una lista larga (depende del año) y al final de la lista las opciones de tu año y el reporte. Debemos pensar mejor este diseño para que sea escalable y fácil de consultar. Las opciones de tu año y el reporte no están muy accesibles y el botón del reporte sucede lo mismo que con artistas: no se desplaza con slide y solo se ve una parte del botón». Y sobre el dato: «En museo Leonora Carrington se dice 40 eventos con nueve artistas, pero aparecen exposiciones colectivas y eventos que pudieron tener artistas y no se detectaron… podríamos especificar artistas registrados en el catálogo».

Lo firmado que no se deshace: OL-390 (bitácora 420/421: H1 plegado bajo lo próximo, H2 «Trayectoria» / «Historial», H3 por mes, H4 «2 fueron», H5 con quién, K1, Q1 fotos), OL-394 («Tu año», solo para quien gestiona, «O en la sección») y OL-396 («Presentación» / «Informe», «O junto a "Tu año"»). La propuesta conserva todo eso; lo que cambia es **dónde** van «Tu año» y el PDF (arriba de la sección en vez de al final; sigue «junto a Tu año» y «en la sección») y **cuánto** se ve a la vez (un año, de 20 en 20). Se dice aquí para que la firma lo cubra.

## 1. Diagnóstico: por qué el carril no se desplaza y el «Informe» queda cortado

**La causa no es la fila ni `ui/Plegado`.** `Plegado.module.css` no tiene ningún `overflow` (el encargo sospechaba un `overflow: hidden` que cortara el `overflow-x: auto`: no existe; el guion busca cualquier antepasado de la fila con `overflow-x: hidden | clip` y no hay ninguno), no hay velo ni manejo de `pointer`. Es la rejilla del cuerpo de la ficha:

- `src/components/ui/Ficha.module.css`, `.cuerpo`: `display: grid` **sin `grid-template-columns`**. Tiene una sola columna implícita de ancho `auto`, que no puede ser más angosta que el contenido mínimo de sus hijos.
- El `<details>` de `ui/Plegado` es un hijo de esa rejilla con `overflow: visible`, así que su ancho mínimo es el de lo que lleva dentro.
- Dentro va la fila de fotos (`Historial.module.css`, `.fila`: `grid-auto-flow: column` con columnas fijas de 72 px y 12 entre ellas). Como no es hija directa de la rejilla (está dentro del `<details>`), su `overflow-x: auto` no la vuelve «encogible»: aporta su ancho entero. Con 9 artistas, 9 × 72 + 8 × 12 = **744 px**.
- La columna crece a 744 en una pantalla de 390. La fila mide lo que sus fotos (`scrollWidth = clientWidth = 744`): **no tiene nada que desplazar**. Lo que se mueve con el dedo es **la página entera, de lado** (el documento mide 764 de ancho).
- «Tu año» e «Informe» son dos columnas iguales de ese ancho: «Tu año» de 20 a 388 px y «Informe» **de 396 a 764** (solo asoma su borde). Lo que viene después del plegado («Dónde», el mapa, «Sobre») también toma los 744 y se sale; y los títulos largos de la lista no se parten ni se cortan con puntos suspensivos: se salen por la derecha.
- Por qué no salió en OL-390: con 4 fotos la fila medía 4 × 72 + 3 × 12 = 324 y cabía en los 350 del contenido. Falla desde **5** (408 px). En la Trayectoria de un artista pasa igual (8 lugares → 660 px).

**Demostrado** con la app real compilada contra el respaldo local (`capturar-historial-escalable.mjs`, Chrome de la Mac, 390 × 844 y una pasada a 320 y 430, con la sesión de quien gestiona y sin ella). El plegado se abre con un toque de ratón en la parte visible de su renglón, comprobado antes con `elementFromPoint` (hoy el centro del renglón cae fuera de la pantalla: el renglón también mide 744); el carril se arrastra con un gesto táctil real de Chrome (`Input.synthesizeScrollGesture`, el dedo de derecha a izquierda). Luego se repite todo con **una sola regla de prueba inyectada en la página** (no en el código): `[data-cuerpo] { grid-template-columns: minmax(0, 1fr) }`.

| 390 × 844, Museo (Ana) | Hoy | Con la regla |
| --- | --- | --- |
| Columna del cuerpo | 744 px | 350 px |
| Plegado | 744 px | 350 px |
| Fila (contenido / caja) | 744 / 744 | 744 / 350 |
| Fotos a la vista | 4 enteras y 1 asomando, de 9 | 4 enteras y 1 asomando, de 9 |
| Tras deslizar: la fila se movió | 0 px | 394 px |
| Tras deslizar: la página se corrió de lado | 374 px | 0 px |
| «Tu año» / «Informe» | 20–388 / **396–764** | 20–191 / 199–370 |
| Ancho del documento | 764 | 390 |

A 320 y 430 pasa lo mismo (a 320 también «Tu año» queda cortado: 20–388); en el artista, plegado de 660 y «Presentación» de 354 a 680. Cero errores de página. Todo en `capturas-501/diagnostico.json`. Medido en Chrome; la causa es el algoritmo de tamaño de la rejilla, igual en Safari, pero no se repitió en el Safari del simulador.

**Arreglo de higiene (no aplicado en esta pieza):** en `src/components/ui/Ficha.module.css`, `.cuerpo { grid-template-columns: minmax(0, 1fr); }` (la columna mide la pantalla, como ya hace `.ficha`). Es una línea, protege toda la ficha (cualquier fila que se deslice dentro de una sección) y no cambia nada de lo que hoy cabe. La alternativa más estrecha, `min-width: 0` en `.plegado`, solo arregla esta sección. Se puede publicar antes del rediseño (pregunta 4).

## 2. El respaldo local con un historial grande

`RESPALDO_HISTORIAL=1` (`respaldo-local/fixture.mjs`; `npm run medir` no lo pone, así ninguna pantalla medida cambia): el **Museo Leonora Carrington (demo)** (nombre y dirección reales; todo lo demás inventado), de Ana, con **84 eventos pasados** en tres años (48 de 2026, 26 de 2025, 10 de 2024): un tercio sin artistas ligados (exposiciones colectivas, visitas, talleres: el caso del founder) y el resto con **nueve artistas con ficha**; y **Valeria Quiroz (demo)**, de Ana, con 30 fechas pasadas en **8 lugares con ficha** y una en un jardín sin ficha. Dos eventos próximos en el museo y uno de Valeria. Fotos y carteles dibujados (`respaldo-local/fotos-historial.mjs`) que el respaldo sirve; con la marca también las portadas de los lugares de San Luis, y las maquetas cortan todo lo que no sea `127.0.0.1`: ni una imagen ni una lectura de producción. `maqueta-pantalla.mjs` suma diez pantallas `hist-*` (las dos fichas con y sin sesión, la hoja del PDF, el «···», y Agenda, Artistas y Lugares por las piezas que se reutilizan).

## 3. El prototipo: `docs/rediseno/prototipos/historial-escalable.html`

Armazón de propuestas sobre la pantalla real: `prototipo/historial-escalable.mjs` arma cada estado en Chrome con el DOM de la maqueta (abre el plegado, mueve o cambia piezas de producción con sus clases con hash; falla si una clase no existe) y la plantilla de al lado pone los selectores (pantalla · variante y estado · 320/390/430/1280), el teléfono (`iframe`), las notas con la recomendación y las preguntas, y el medidor. Dentro del teléfono se puede abrir y cerrar el plegado, deslizar el carril, tocar «Ver los 9», un año, «Ver más», «Informe» / «Presentación», el «···» y la ✕ de las hojas. 25 estados en tres pantallas.

### Las decisiones y sus opciones

- **F · Quiénes pasaron.** F1 (recomendada): el **carril de avatares de Inicio** («Artistas de la semana», `Destacados/carril` + `Destacados/avatar` + `TarjetaAvatar`, con sus medidas: 88 px, columnas de 108, 8 entre ellas, se detiene en cada uno) que llega al borde derecho de la pantalla, así asoma el siguiente; arriba, «Han pasado por aquí» y a su derecha **«Ver los 9 ›»** (`Destacados/verTodo`, el «Ver todos» de cada carril), que abre una **hoja** (`ui/Hoja`) con los nueve en el **renglón de Artistas** tal cual (foto, nombre, disciplina, «Seguir») y, donde Artistas dice lo próximo, sus **veces aquí**. Hasta 12 en el carril; la hoja, todos. F2: la fila de hoy (60 px) arreglada, con «Ver los 9». F3: sin fila, solo el renglón con «Ver los 9».
- **El número.** La cuenta del renglón dice **«84 eventos · 9 artistas registrados»** y la hoja lo explica en una línea: «los que tienen ficha en el catálogo y están en algún evento de aquí. Una exposición colectiva o un evento sin artistas ligados no suma». En el artista, la hoja de lugares: «8 lugares con ficha. Una fecha en un sitio sin ficha cuenta en la trayectoria, pero no aquí».
- **L · La lista.** L1 (recomendada): **un chip por año con su cuenta** (`ui/Chip` en su fila que se desliza: «2026 · 48», «2025 · 26», «2024 · 10»), el más reciente elegido; debajo ese año por mes, como hoy, **de 20 en 20 con «Ver más»** (`ui/CargarMas` con `ui/Boton`; en la app la tanda siguiente también llega sola al bajar). Con un solo año no hay chips. Elegir un año no apila nada en Atrás (filtrar no es navegar) y al volver de la ficha de un evento el año, la tanda y el lugar vuelven igual (`useMemoriaPantalla`). L2: el año en curso por mes y los anteriores plegados con su cuenta (`ui/Plegado` dentro de la sección). L3: todo por mes, de 20 en 20, sin años.
- **A · «Tu año» e «Informe».** A1 (recomendada): **lo primero al abrir la sección**, a lo ancho y enteros (la fila de `Historial/botones`, dos columnas si caben, una bajo otra si no: a 320). A2: en el «···» de la ficha, dos renglones arriba de Editar («Tu año 2026», «Informe de actividad», `Renglon/ajuste` con los iconos de hoy). En las dos, para quien no gestiona la ficha no existen.
- **La Trayectoria del artista** usa la misma pieza: «Se ha presentado en» con «Ver los 8» y el carril con las portadas de los lugares (como «Lugares de la semana»), los años («2026 · 13», «2025 · 12», «2024 · 5») y «Tu año» / «Presentación» arriba.

### Qué se reutiliza y qué es nuevo

Se reutiliza tal cual: `ui/Plegado` (la sección y, en L2, cada año), el carril y la tarjeta de avatar de Inicio, `Destacados/verTodo`, `ui/Chip` y su fila, `ui/CargarMas` y `ui/Boton`, `ui/Hoja`, `RenglonArtista` y `RenglonLugar` (`ui/Renglon`), la hoja del PDF (`DocumentoPdf`), `BotonTuAnio`, el «···» (`ui/MenuAcciones` con `Renglon/ajuste`) y los renglones de lo pasado de OL-390 sin cambios.

Nuevo, en ocho reglas con prefijo `he-` (en código irían en `Historial.module.css`) y solo en la propuesta: la cabecera de la fila con «Ver los N» a la derecha; el carril más ancho que su caja por la derecha (`width: calc(100% + var(--gutter))`, **sin margen negativo**, que el inventario no acepta) para que asome el siguiente como en Inicio; «9 veces» en gris en la línea de la novedad del avatar; el aire de los chips; «Tu año» y el PDF en columnas que pasan a filas cuando no caben (a 320 el icono de «Presentación» se aplastaba a 2 px), con el icono que nunca se encoge; el año plegado un escalón más chico que «Historial»; y la lista de la hoja sin viñetas ni el aire doble de `Grupo/lista`. Más la regla de higiene.

## 4. Medición

Medidor del prototipo (como `medir.js`) a 390, 320 y 430 en los 20 estados de la propuesta y sus opciones: **cero** textos cortados en la sección y las hojas (sin contar los cortes a propósito de `ui/Renglon`, del nombre de dos líneas del avatar y del título corto de la barra), cero desbordes horizontales, cero toques fuera de la pantalla, cero toques menores de 44 px en lo nuevo (el chip cuenta su `::before` de 44) y cero `div` o `span` sin clase en lo nuevo; profundidad 12 (13 en L2). Fuera de la sección, a 320, «Distancia» se corta en la cabecera de la ficha, como hoy (la cabecera no se toca). Todo en `capturas-501/medidas.json`.

| 390 × 844 | Nodos de la pantalla | Renglones | Alto de la sección abierta | Desborde | Toques fuera |
| --- | --- | --- | --- | --- | --- |
| Museo, hoy | 1 138 | 84 | 8 927 px (a 744 de ancho) | sí | 92 |
| Museo, propuesta (Ana) | 390 | 20 | 2 641 px | no | 0 |
| Museo, segunda tanda | 617 | 40 | 4 796 px | no | 0 |
| Museo, L2 años plegados | 1 150 | 48 a la vista | 5 623 px | no | 0 |
| Valeria, hoy | 557 | 30 | 4 151 px (a 660) | sí | 36 |
| Valeria, propuesta (Ana) | 319 | 13 | 2 167 px | no | 0 |

Hoy los nodos y el alto crecen con cada evento (y la consulta tiene tope de 200: «200+»); con L1 la pantalla carga como mucho 12 avatares, los chips y 20 renglones por tanda, tenga el lugar 80 o 800 eventos.

## 5. Recorrido con toques reales

`capturar-historial-escalable-prototipo.mjs` (Chrome de la Mac, el prototipo abierto desde el disco): el dedo desliza el carril (gesto táctil real) **0 → 232 px y la página no se corre**; «Ver los 9» abre la hoja con 9 renglones; la ✕ vuelve a la sección; el chip «2025» cambia la lista a ese año (primer mes, diciembre de 2025); «Ver más» trae la segunda tanda (40 renglones de 2026); en L2, tocar «2025» abre su año y tocarlo otra vez lo pliega; «Informe» abre su hoja y la hoja cabe en la pantalla; en el artista, «Ver los 8» y «Presentación» abren las suyas. Cada toque en el centro de su caja, comprobado antes con `elementFromPoint` dentro del marco. Cero errores de página; 14 de 14 comprobaciones y 60 de 60 en la medición.

## 6. Capturas (`docs/rediseno/capturas-501/`, 2×; abiertas una por una)

La app real, hoy (sesión de Ana):
- `app-01-lugar-plegado`: el museo arriba: portada, «Museo», los tres números, Cómo llegar / Compartir / Instagram, «Próximos eventos · 2» y, abajo, «Historial» plegado.
- `app-02-lugar-fila`: abierto: «84 eventos · 9 artistas», «Han pasado por aquí · 9» con cinco fotos (la quinta cortada) y los títulos largos de la lista saliéndose por la derecha («Lectura en voz alta con Taller de Grabado La P…»); la página ya está corrida 20 px.
- `app-03-lugar-tras-deslizar`: tras el gesto del dedo sobre la fila: la fila sigue igual; lo que se movió es la página entera (se ven Ximena… Valeria a la derecha y los títulos y la barra cortados a la izquierda).
- `app-04-lugar-final`: al final de los 84 renglones: «Tu año» ocupa todo lo ancho y de «Informe» solo asoma el borde; la tarjeta «Dónde» y su mapa también se salen.
- `app-05-con-la-regla-tras-deslizar`: la misma ficha con la regla de prueba: el plegado cabe, el dedo desplazó la fila (se ven Maripaz, Taller de Grabado, Teodoro, Valeria) y los títulos se parten en dos líneas.
- `app-06-con-la-regla-final`: con la regla, al final: «Tu año» e «Informe» enteros, uno junto al otro; «Dónde» y «Sobre el lugar» caben.
- `app-07-artista-fila`: la Trayectoria de Valeria: «30 fechas · 8 lugares», cinco lugares (el quinto cortado) y la página corrida.
- `app-08-artista-final`: al final de sus 30 fechas: «Tu año» entero, «Presentación» fuera; «Sobre» y su texto también se salen.
- `app-09-lugar-320-final`: a 320, también «Tu año» queda cortado.

El prototipo (`p-…`, el teléfono del armazón):
- `p-lugar-hoy-plegado`, `p-lugar-hoy-fila`, `p-lugar-hoy-final`, `p-artista-hoy-fila`, `p-artista-hoy-final`: las maquetas reales sin tocar; el fallo se repite dentro del marco (la fila de cinco fotos cortada, los títulos que se salen, «Tu año» y la píldora de «Informe» / «Presentación» fuera).
- `p-lugar-r-plegado`: plegado, «84 eventos · 9 artistas registrados».
- `p-lugar-r-ana`: la propuesta con la sesión de Ana: «Tu año» e «Informe» arriba, «Han pasado por aquí» con «Ver los 9 ›», tres avatares de 88 y el cuarto asomando con «9 veces» / «8 veces» en gris, los chips «2026 48 · 2025 26 · 2024 10» y octubre de 2026.
- `p-lugar-r-ana-320`: a 320, «Tu año» e «Informe» uno bajo otro, enteros; el carril asoma el tercero.
- `p-lugar-r-ana-430`: a 430, igual que a 390 con el cuarto avatar más visible.
- `p-lugar-r-sin-sesion`: sin sesión: sin botones; empieza por «Han pasado por aquí».
- `p-lugar-r-carril-movido`: el carril al final (Taller de Grabado La Piedra con el SN, Teodoro, Valeria «3 veces»).
- `p-lugar-r-todos` y `p-lugar-r-todos-320`: la hoja «Han pasado por aquí» con su línea de qué cuenta y los nueve renglones (foto, disciplina, «9 veces» con el calendario, «Seguir»); a 320 los nombres van en dos líneas.
- `p-lugar-r-2025`: el chip «2025 26» elegido y diciembre de 2025 (Visita guiada nocturna, Valeria Quiroz, Lectura con Íñigo Montalvo…).
- `p-lugar-r-ver-mas`: tras el renglón 20, «Ver más» al centro y luego «Dónde».
- `p-lugar-r-tanda-2`: la segunda tanda, con otro «Ver más».
- `p-lugar-r-informe`: la hoja del PDF real (periodo Octubre · 2026 · Todo, Carta / A4, «Descargar PDF») entera sobre la sección.
- `p-lugar-f2`: la fila de hoy de 60 px, arreglada, con «Ver los 9»: caben cuatro y media.
- `p-lugar-f3`: sin fila: «Han pasado por aquí · 9» y «Ver los 9», luego los chips.
- `p-lugar-l2`: al final de 2026, «2025 · 26 eventos» y «2024 · 10 eventos» plegados.
- `p-lugar-l3`: sin chips: la sección pasa del carril a octubre de 2026.
- `p-lugar-a2` y `p-lugar-a2-menu`: sin botones en la sección; el «···» abierto con «Tu año 2026» e «Informe de actividad» arriba de Editar, Reportar y Borrar el lugar.
- `p-artista-r-ana`, `p-artista-r-ana-320`, `p-artista-r-sin-sesion`: la Trayectoria con la misma pieza: «Tu año» y «Presentación» (a 320 uno bajo otro, el icono entero), «Se ha presentado en» con «Ver los 8», ACHE, el Bicentenario, el MUNI en el carril, «2026 13 · 2025 12 · 2024 5».
- `p-artista-r-todos`: la hoja de los ocho lugares con el renglón de Lugares (tipo y calle) y «4 veces», sin lo próximo.
- `p-artista-r-2025`: sus fechas de 2025 (diciembre en el museo, noviembre en la Casa del Poeta, octubre en Aether…).
- `p-artista-r-presentacion`: la hoja de la Presentación (Carta / A4, «Descargar PDF»).
- `recorrido-01-carril-deslizado` … `recorrido-05-informe`: el carril tras el dedo (Colectivo Nube de Papel, Los Ecos, Ximena al frente, la barra sin moverse), la hoja de los nueve, el chip 2025, el año 2025 abierto en L2 y la hoja del Informe.

## 7. La recomendación (F1 · L1 · A1)

- Quiénes pasaron: el carril de Inicio, que se desliza de verdad y asoma el siguiente, con «Ver los 9» que abre la lista completa; el número dice «9 artistas registrados».
- La lista: un chip por año y ese año de 20 en 20; nunca más de 20 renglones de golpe, y volver de un evento repone el año y dónde estaba.
- «Tu año» e «Informe»: arriba de la sección, enteros, solo para quien gestiona la ficha.
- La Trayectoria del artista, igual.

## 8. Preguntas al founder

1. ¿Firmas F1 · L1 · A1? Si no, ¿qué cambias? (F2 la fila de hoy arreglada o F3 sin fila; L2 años plegados o L3 todo junto con «Ver más»; A2 en el «···».)
2. ¿«9 artistas registrados» te basta o prefieres «9 artistas con ficha»? En el artista, ¿«8 lugares» o «8 lugares con ficha»?
3. En la hoja de «Ver los 9», ¿se queda el «Seguir» de cada artista (como en Artistas) o solo la lista?
4. El arreglo de una línea que hace que la fila se deslice y el «Informe» quepa, ¿sale ya, antes del rediseño?

## 9. El plan de código (tras la firma)

1. **Higiene, aparte y primero si el founder lo pide:** `.cuerpo { grid-template-columns: minmax(0, 1fr); }` en `ui/Ficha.module.css`; prueba de componente que mida que la fila se desplaza y la ficha no desborda con 9 fotos.
2. **Datos:** `cargarHistorialLugar` / `cargarTrayectoria` devuelven también la cuenta por año (consulta de cuentas sin el tope de 200) y los eventos de un año en tandas de 20 (acción del servidor o ruta con `anio` y `desde`); la cuenta de artistas sigue siendo la de los ligados con ficha, ahora dicha.
3. **`Historial.tsx`:** el carril con `Destacados/carril` + `Destacados/avatar` y `TarjetaAvatar` (tope 12) y la cabecera con «Ver los N» (a partir de 4); una hoja cliente nueva (`HojaPresencias`) con `ui/Hoja` y `RenglonArtista` / `RenglonLugar` (con las veces en lugar de lo próximo); los chips de año y la lista por tandas en un componente cliente con `useMemoriaPantalla` (año, tanda y desplazamiento) y sin `pushState`; `Historial/botones` arriba, con columnas que pasan a filas; los textos «artistas registrados». Las ocho reglas `he-` a `Historial.module.css`.
4. **Pruebas:** `historialFichas.test.ts` (cuentas por año, tandas), `Historial.test.ts` (botones arriba; sin sesión no hay), componentes con toques reales (deslizar, «Ver los N», chip, «Ver más», volver y reponer); `npm run medir` con una pantalla nueva del historial grande; captura móvil.
5. Sin migración (salvo que la cuenta por año pida una RPC para no leer cientos de filas; se decide al medir).

## Verificación de esta entrega

Solo documentos y guiones de prueba (sin código de la app): `eslint` en los seis guiones tocados sin avisos; la prueba del respaldo (`fixture-ciudades.test.ts`) en verde; las maquetas compiladas contra el respaldo sin `.env`; diagnóstico y recorrido en verde y cero errores de página.

Guiones: `scripts/ops/auditoria-ui/capturar-historial-escalable.mjs` (el diagnóstico en la app), `scripts/ops/auditoria-ui/prototipo/historial-escalable.mjs` y `.plantilla.html` (el prototipo), `scripts/ops/auditoria-ui/capturar-historial-escalable-prototipo.mjs` (capturas, medición y recorrido), `respaldo-local/fotos-historial.mjs`; `respaldo-local/fixture.mjs` y `maqueta-pantalla.mjs` con lo de OL-469 tras su marca.
