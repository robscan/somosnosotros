# 433 · Panel de ayuda del grafo («Info View») y manual (OL-402)

**Fecha:** 2026-10-13. **Rama:** `grafo-ayuda`, base `origin/main` (`5de9f172`). **Operador:** agente de la pieza (Fable 5.1), sin otros agentes. **Sin migración, sin tablas nuevas y sin variables de entorno nuevas.**
**Estado:** lista para el «publica» del founder.

## El pedido

Founder, 2026-10-13: «Una herramienta de tutorial, cuando el usuario se coloque sobre un elemento que en una ventana pequeña aparezca a que se refiere o para que sirve. Además un enlace de manual de uso por si hace falta, la ventana a la que me refiero es similar a la que usa Ableton live en el extremo inferior izquierdo […] ahí mandaríamos definiciones como las de red y mapa y todas las definiciones específicas de componente, esto con la intención de limpiar la interfaz de textos innecesarios, atendiendo al progressive disclosure basado en intención de usuario.» Aceptó tres recomendaciones: mecanismo común poblado solo con el grafo; panel fijo (no burbuja junto al cursor); manual dentro de la app generado del mismo diccionario.

**Añadido el mismo día (gestor):** el founder eligió el MAC en el grafo, le dio «Seguir» en la app y al volver seguía en «0 seguidores»: `cargarGrafo` está en caché de una hora. Acepta «un botón Actualizar en el grafo (solo admin): invalida la caché y recarga al momento» y «una línea con la hora del cálculo». Misma rama y mismo PR.

## Lo que se ve

- **Panel de ayuda**, abajo a la izquierda de la escena (caja de hasta 320 px, fondo y borde del tema del grafo, también en claro): el **nombre del control en negrita** y dos o tres líneas que dicen qué es y para qué sirve. Cambia al instante al pasar el ratón (o el foco del teclado) por cualquier control con `data-ayuda` y se queda con el último, como Ableton. Abajo, «Más en el manual ›» si la entrada tiene más que contar y, si no hay nada elegido o la entrada no tiene más, un «Manual» discreto. Se pliega con la ⓘ (44×44) a solo la ⓘ. Con ratón abre abierto y recuerda si lo plegaste; sin ratón (teléfono) empieza plegado.
- **Teléfono, «modo ayuda»:** la ⓘ lo enciende y abre el panel; mientras está encendido, tocar un control lo explica y **no lo usa** (sin pulsación larga). Volver a tocar la ⓘ lo apaga y todo vuelve a responder. En el teléfono vertical el panel sube la leyenda y se queda sobre los botones «Lentes · Lista»; en horizontal (alto ≤ 520) va junto a la leyenda.
- **Manual** (`/admin/grafo/manual`): una página con la barra y el Atrás de las tareas de Administración, una línea de qué es la pantalla, un índice de bloques y una tarjeta por entrada (La barra · Lecturas · Lentes · Filtrar · Capas y Yo · Tiempo · Ajustes · Cámara · Lo elegido · Diagnóstico), generada del mismo diccionario del panel con el texto largo (`detalle`). Enlace «Manual» en la barra del grafo (desde 792 de ancho) y «Volver al grafo» al pie.
- **Actualizar y la hora (pedido del gestor):** un botón de dos flechas en círculo en la barra del grafo (44×44, `data-ayuda="actualizar"`) que vuelve a leer la base al momento, y al pie de la lista «Datos de las 14:05: N eventos · N seguimientos · N asistencias» (o «Datos del 12 oct, 14:05» si fue otro día), en la hora de Ciudad de México.
- **Limpieza acordada:** fuera de la pantalla quedan las dos explicaciones de Mapa y Red al inicio del Diagnóstico, las dos notas largas de Ajustes, la nota larga de Tiempo, la línea de la leyenda sobre las líneas y los subtítulos de las seis lentes. Se quedan los nombres y los controles. Los textos **no se inventaron de nuevo: se mudaron** al diccionario (los largos, a `detalle`).

## Archivo por archivo

- `src/components/ui/useAyuda.ts` (mecanismo común): tipos `EntradaAyuda` / `DiccionarioAyuda`; `claveDe(blanco)` (el `data-ayuda` del propio control o del ancestro más cercano, lógica pura) y `dentroDelPanel`; el hook `useAyuda(raiz, memoria)` con **un solo oyente por pantalla** sobre el contenedor (por delegación: los renglones que el motor repinta también cuentan). `pointerover` (no el táctil) y `focusin` cambian la clave; en modo ayuda, `pointerdown`, `pointerup` y `click` se capturan (`preventDefault` + `stopPropagation`) para los controles con clave. Si hay ratón se detecta con `matchMedia("(hover: hover)")` y se recuerda en `localStorage` (con `try/catch` y respaldo en memoria); en el servidor y al hidratar está plegado.
- `src/components/ui/Ayuda.tsx` + `Ayuda.module.css`: el panel (`<Ayuda raiz diccionario manual memoria className />`). No sabe nada del grafo. Una rejilla de una celda donde el cuerpo y la ⓘ comparten sitio; colores de `--g-opaco`, `--g-borde`, `--g-texto`, `--g-suave` si la pantalla los define y, si no, de los tokens de la app; `aria-live="polite"`. En modo ayuda, los `input/select` dentro de un control con clave no reciben el toque (llega a su renglón).
- `src/app/admin/grafo/ayuda.ts`: el diccionario (**53 entradas**: la pantalla, barra, Mapa, Red, Desde arriba, lentes, las seis lentes, Filtrar y sus nueve filas, tres capas, Yo, Tiempo, Ventana, Hasta, Ajustes y sus cuatro controles, siete botones de cámara, tarjeta, líneas, punto «por conectar», Diagnóstico, Lista, renglón, Copiar lista, Actualizar y «Datos de…»), `BLOQUES` (el orden del manual) y `seccionesManual()` (lo que pinta la página).
- `src/app/admin/grafo/manual/page.tsx` + `Manual.module.css`: la página del servidor, misma guardia que `/admin/grafo` (sin sesión pide entrar; quien no es admin vuelve a `/`), `noindex`.
- `src/app/admin/grafo/Grafo.tsx`, `Grafo.module.css`, `motor.ts`: `data-ayuda` en cada control (en el motor, con `conAyuda(elemento, "clave")`; el botón Red/Mapa cambia su clave según a qué lectura lleva; la tarjeta cambia a «por conectar» con el nodo resumen), la columna `.pila` (leyenda, panel y botones), el enlace «Manual» y el botón «Actualizar» en la barra, los textos mudados quitados, la línea de datos al pie de la lista. `crearMotor` recibe `calculadoEn`.
- `src/app/admin/grafo/acciones.ts` (`"use server"`): `actualizarGrafo()`: si no hay sesión o el rol no es admin, **no hace nada** (`{ ok: false }`); si lo es, `updateTag("grafo-admin")` y `revalidatePath("/admin/grafo")`. `src/app/admin/grafo/datosDe.ts`: `textoDatosDe(calculadoEn, ahora)`, lógica pura (hora de Ciudad de México).
- `src/lib/grafo.ts`: `cargarGrafo` ahora lleva `tags: ["grafo-admin"]` (la clave y la hora de caché no cambian) y guarda `calculadoEn` (el instante ISO del cálculo, fuera de `armarGrafo`, que sigue siendo pura y determinista).
- `src/app/admin/grafo/page.tsx`, `IconoGrafo.tsx` (`IconoActualizar`): pasar `calculadoEn`; el icono.
- Pruebas nuevas: `useAyuda.test.ts` (5), `ayuda.test.ts` (8), `datosDe.test.ts` (4), `acciones.test.ts` (4).
- `scripts/ops/auditoria-ui/pantallas-sesion.json` y `medidas.aceptadas.json`: la pantalla `s30-admin-grafo-manual` y los presupuestos.

## Decisiones que tomé

- **`updateTag`, no `revalidateTag`:** en Next 16, desde una acción del servidor `updateTag` expira la etiqueta al instante (`revalidateTag` pide un perfil y deja servir lo viejo mientras recalcula). Es lo que pide «recarga al momento».
- **`extraido` es solo la fecha** (`AAAA-MM-DD`), no la hora del cálculo, así que la hora sale de un campo nuevo `calculadoEn` que pone `cargarGrafo` (no `construirGrafo`: se queda sin reloj).
- **El motor se vuelve a montar solo si cambia `calculadoEn` o `yo`**, y el lienzo lleva `key={calculadoEn}`: la primera versión de «Actualizar» fallaba porque `destruir()` suelta el contexto de WebGL y un lienzo ya usado no vuelve a dibujar («este navegador no puede dibujar»). Con el lienzo nuevo por montaje, funciona; con la caché al día (`router.refresh()` sin datos nuevos) no hay remonte. Al actualizar, la cámara y lo elegido vuelven a empezar; las capas plegadas y «Yo» se recuerdan.
- **En el teléfono el panel no se recuerda abierto** (el encargo decía recordarlo): ahí «abierto» es «modo ayuda» y recordarlo dejaría la pantalla sin responder al volver a entrar. Con ratón sí se recuerda.
- **«Manual» en la barra solo desde 792:** en el teléfono las cuentas de la barra ya quedaban en «29 nodos · 42 co…» y un botón más las borraba; el panel trae siempre su enlace «Manual». El botón de Actualizar sí va siempre.
- **Texto del panel vacío en el teléfono:** «Toca un control para saber qué hace. Toca ⓘ otra vez para volver a usar la pantalla.» (el encargo decía «Toca ⓘ y luego…»: esa frase solo se vería con el panel ya abierto). En escritorio, «Pasa el ratón por un control para saber qué hace.»
- **`texto` ≤ 150 caracteres** (prueba): a 210 px de ancho en el teléfono son cinco o seis líneas; lo largo va a `detalle`, solo para el manual. `detalle` y `manual` (el ancla) siempre van juntos (prueba).
- **Las pruebas leen los archivos:** cada clave usada en `Grafo.tsx` y `motor.ts` existe en el diccionario y cada entrada del diccionario la usa algún control; los textos mudados ya no están en la pantalla; el manual lista cada entrada una vez, con anclas únicas.
- **Se quedaron los rótulos de las capas** («Lugar · en su posición real»…) y las líneas pequeñas de los filtros («flotan sobre el lugar donde más tocan»…): el encargo decía «solo esto, no quites nada más». Son candidatos a la siguiente limpieza si el founder quiere.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba en `main`). `npm run typecheck`: verde. `npm test`: 219 archivos, **3 879 pruebas** (21 nuevas en cuatro archivos). `npm run inventario`: sin novedades (342 medidas en duro, 1 bloque duplicado aceptado). `npm run medir`: **40 pantallas × 4 anchos, sin novedades**.
- **Presupuestos:** `s29-admin-grafo` baja de 395 · 395 · 432 · 428 a **389 · 389 · 427 · 426** nodos (se fueron cuatro notas y las dos lecturas del Diagnóstico y entraron el panel, el botón y el enlace); profundidad 11 igual. Pantalla nueva `s30-admin-grafo-manual`: **219 · 219 · 253 · 253** nodos, profundidad 7 (el respaldo la sostiene: la página no lee datos). A la primera `medir` marcó que a 320 px los botones «Lentes · Lista» salían 3 px de la columna (antes iban sueltos): se arregló con `min-width: min-content`.
- **Comprobado con Chrome real contra el respaldo local** (toques con `touchscreen.tap` y el ratón en coordenadas): en escritorio, al pasar por «Red» el panel dice «Red» y trae «Más en el manual ›»; sobre una lente, su entrada; sobre «Actualizar», la suya; plegar con la ⓘ y recargar deja plegado. En teléfono, el panel empieza plegado; la ⓘ lo abre en modo ayuda; tocar «Red» la explica y el botón **no cambia** (sigue «Red», sin pulsar); tocar la capa «Lugar» la explica y **no se pliega**; al apagar el modo, «Red» sí cambia a «Mapa». **Actualizar de punta a punta** (app compilada con el reloj real): al abrir, «Datos de las 16:46»; un minuto después, recargando sin tocar nada, sigue «16:46» (la caché); tras el botón, «16:47», sin errores en la consola. Un administrador que no lo es no puede: `actualizarGrafo` devuelve `ok: false` sin invalidar (prueba con sesión nula, «usuario» y «editor»).

## Capturas (`docs/rediseno/capturas-433/`, Chrome real, 2×, respaldo local con datos inventados y el reloj del navegador fijo)

1. `01-escritorio-panel-red.png` (1280×800): el ratón sobre «Red»: abajo a la izquierda, el panel con «Red», su texto de dos líneas y «Más en el manual ›»; en la barra «Manual», «Claro» y el botón de Actualizar.
2. `02-escritorio-panel-lente.png`: la lente «¿Quién une lugares distintos?» aplicada y el ratón sobre su renglón: el panel dice qué hace y trae «Manual» (esa entrada no tiene más); la lista, «Puentes · 4», y al pie «Datos del 13 oct, 16:47: 28 eventos · 6 seguimientos · 22 asistencias.».
3. `03-escritorio-actualizar-y-hora.png`: el ratón sobre el botón de dos flechas: el panel «Actualizar» con la frase del gestor; al pie de la lista, «Datos de las 10:00: 28 eventos · 6 seguimientos · 22 asistencias.».
4. `04-movil-plegado.png` (390×844): el panel plegado, solo la ⓘ sobre «Lentes · Lista»; en la barra, las cuentas recortadas («29 nodos · 42 co…»), «Claro» y el botón de actualizar.
5. `05-movil-modo-ayuda-red.png`: con el modo ayuda encendido y «Red» tocado: el panel abierto con «Red» y «Más en el manual ›», la ⓘ dentro; el botón «Red» no se activó.
6. `06-movil-manual.png` (390×844) y `06b-movil-manual-completo.png` (página entera): el manual en el teléfono, con Atrás y el logotipo, el título, la línea de qué es, el índice de bloques en píldoras y las tarjetas por entrada.
7. `07-horizontal-panel.png` (844×390): con el panel abierto («Desde arriba»): leyenda y panel lado a lado, «Lentes · Lista» debajo y el mando a la derecha.
8. `08-escritorio-manual.png` (1280×800): el manual en escritorio, en columna de lectura bajo la barra de la app.

Sin nombres de personas reales.

## Lo que no entró

- **Adoptar el panel en el resto de la app:** pieza aparte (decisión del gestor); el mecanismo está listo en `ui/` y solo el grafo lo usa.
- **Pulsación larga** y **burbuja junto al cursor:** descartadas por el gestor y el founder.
- **Medir el panel plegado con el teclado de iOS o en Safari/iPhone real:** solo Chrome con emulación táctil; el iPhone lo probará el founder con la vista previa.
- **Tipografía en el manual para texto muy largo en pantallas de 320:** medido sin desbordes, pero no revisado a ojo a 320.

## Para el gestor

- **Nada que aplicar:** sin migración ni variables. «Actualizar» usa la misma llave de servicio que el grafo.
- Conflictos probables: `docs/ops/OPEN_LOOPS.md` (una bala y la cabecera), `scripts/ops/auditoria-ui/medidas.aceptadas.json` y `pantallas-sesion.json` (últimas líneas).
- Revisar en el iPhone: el modo ayuda (los toques explican; la ⓘ lo apaga), que el panel plegado no estorbe a «Lentes · Lista», y «Actualizar» (la hora cambia y el grafo se vuelve a dibujar).
