# 432 · El grafo cultural en Administración (OL-401)

**Fecha:** 2026-10-13. **Rama:** `grafo-admin`, base `origin/main` (`9f81f2b0`). **Operador:** agente de la pieza (Fable 5.1), sin otros agentes. **Sin migración, sin tablas nuevas y sin variables de entorno nuevas.**
**Estado:** lista para el «publica» del founder.

## El encargo

Founder, 2026-10-13: «no hagas distinciones ahora, solo piensa en admin, no en público. Acepto las propuestas que haces para admin. Construye ahorrando tokens usando agentes.» Es el prototipo `grafo-3d.html` (doc 56, rama `grafo-3d`, bitácora 424, OL-393) llevado a la app, **solo para quien administra**: `/admin/grafo`, con los datos reales leídos en el servidor.

## Lo que se ve

Una pantalla de tarea (en el teléfono, con su propia barra y Atrás a Administración; desde 792, con la barra de la app y el carril) con la rejilla del prototipo: **barra · árbol · escena · lista**. Hasta 1047 el árbol («Lentes») y la lista son hojas que suben sobre la escena; desde 1048 son columnas de 272 y 320. Todo lo del prototipo está: las seis lentes de diagnóstico, «Filtrar», el tiempo (ventana y «Hasta»), los ajustes, «Mapa» y «Red», «Desde arriba», el mando de cámara, la tarjeta del elegido con sus conexiones y «a dos pasos», los rótulos, el diagnóstico en frases, «Copiar lista» y el botón «Claro». Fondo oscuro con los tokens de la banda; «Claro» lo pasa al tono del contenido. Desde Administración, un grupo «Grafo cultural» con su renglón (mismo patrón que «Obras colectivas»).

## Archivo por archivo

- `src/lib/grafo.ts` (`server-only`). `construirGrafo(filas, hoy)`: lógica pura, sin Supabase, sin `Math.random`, y con todo ordenado por id (el orden en que lleguen las filas no cambia el resultado). Proyección a 1 unidad = 10 m con logaritmo pasados 10 km; lugares con seguidores, asistentes, eventos, próximos y días; artistas con halo (28 + 11·√k, ángulo áureo + índice del lugar) si tocan en un lugar, radio 18 si tocan en varios, sitio libre (15 a 35) o anillo exterior (800 a 950, y entre −120 y 120 de alto); personas anónimas (sin id, nombre, foto ni enlace; orden barajado por un hash del id que no se guarda; `tramo` y no número; posición inventada); y las seis clases de línea (`a`, `pl`, `pa`, `aa`, `ll`, `pp`) sin duplicados, con el **umbral de 3** para todas las de personas. `cargarGrafo()`: seis lecturas con `clienteAdmin()` de 1 000 en 1 000 (`range`), solo las columnas que se usan, envueltas en `unstable_cache` (`["grafo-admin"]`, una hora): diez administradores que lo abren cuestan una lectura por hora.
- `src/lib/grafo.test.ts`: 27 pruebas de la lógica pura (proyección, tamaños, artista en uno y en dos lugares, sitios libres, sueltos, personas sin id ni nombre, tramos, umbral de 3, líneas entre iguales sin duplicar, determinismo y orden de filas).
- `src/app/admin/grafo/page.tsx` (servidor): sin sesión pide entrar (`/entrar?siguiente=/admin/grafo`), quien no es admin vuelve a `/` (lo mismo que las demás secciones); si la lectura falla, «No pudimos leer el grafo.» con «Intentar de nuevo». Lleva `noindex`.
- `src/app/admin/grafo/Grafo.tsx` (`"use client"`): el armazón en JSX (barra, árbol, escena, lista, mando, botones). Carga el motor con `import("./motor")` dentro de un `useEffect` y lo destruye al desmontar; si el navegador no tiene WebGL, lo dice.
- `src/app/admin/grafo/motor.ts`: **el prototipo pasado a TypeScript con la misma lógica** (cámara de órbita propia, selección por el nodo más cercano al dedo, «Red» con fuerzas, lentes, diagnóstico, tiempo). three.js vive solo aquí. Esferas `SphereGeometry(1, 48, 32)` en una sola malla instanciada, `MeshStandardMaterial` (rugosidad 0,38, metal 0,05), las tres luces de estudio, `ACESFilmicToneMapping`. Se dibuja solo cuando algo cambia. `destruir()` quita las escuchas, libera geometrías, materiales y el contexto de WebGL. `window.grafo` conserva `medirFps()`, `medirRender()` y `estresar(n)` (más `quitarEstres()`).
- `src/app/admin/grafo/Grafo.module.css`: una rejilla con áreas, tokens de `globals.css` (`--banda`, `--sobre-banda*`, `--fondo-contenido`, `--primario`, `--destacado`, `--radio*`, `--espacio-*`, `--letra-*`, `--control`, `--sombra-flotante`, `--z-*`…) y ninguna medida en duro nueva (`medidasEnDuro` sigue en 342).
- `src/app/admin/grafo/IconoGrafo.tsx` y `src/app/admin/page.tsx` (el grupo «Grafo cultural»).
- `package.json` / `package-lock.json`: `three` 0.186.1 (dependencia real) y `@types/three`.
- Respaldo local: `fixture.mjs` y `server.mjs` ganan una cuenta de administración inventada (`ADMIN`, solo en `mi_perfil`: ninguna lista cambia) y unas filas que **solo ve quien lee con la llave de servicio inventada** (`extrasServicio`): tres personas con «Voy» en tres eventos (el umbral se ve), una con uno solo, una que solo sigue y seis artistas sin eventos. `medir-pantallas.mjs` pone la llave de servicio inventada y acepta `"cuenta": "admin"` en una pantalla. `pantallas-sesion.json` suma `s29-admin-grafo` y `medidas.aceptadas.json` solo su presupuesto (381 · 381 · 418 · 414 nodos, profundidad 11).

## Decisiones que tomé

- **Colores de la nube de los tokens, no sueltos:** en claro son `--primario`, `--texto` y `--destacado`; en oscuro, lugares y asistentes son esos mismos mezclados un 20 % con blanco (como los del prototipo) y el gris de «por conectar» sale de `--texto-suave`. El motor los lee del CSS y pone `--g-c-*` en la pantalla, así leyenda, árbol y escena dicen lo mismo.
- **Columnas desde 1048, no 792** (como en el prototipo): con el carril de la app a 820 la escena se quedaba con ~100 px entre el árbol y la lista. De 792 a 1047 son hojas.
- **Nada de `innerHTML` con lo que viene de la base** (nombres, ciudad, disciplina): el árbol y la lista se arman con `textContent`. Solo las frases fijas con números usan HTML.
- **Todo lo que se toca mide 44** (`--control`): filas, píldoras, mando, «Copiar lista» y los interruptores (dibujados como pista y perilla, de 44 de alto). El prototipo tenía filas de 36 y botones de 40.
- Las hojas cerradas llevan `inert` (no reciben toque ni foco); el rótulo del elegido se queda dentro de la escena; «Red» no usa azar (los nodos que empiezan encimados se separan con una dirección que sale de su número); el mando no se deja de repetir con `pointerleave` (Safari) sino con `pointerup`/`pointercancel`; las flechas del teclado no se roban cuando el foco está en un campo.
- **La posición de una persona se deriva de todos sus eventos con lugar o sitio** (como pide el encargo), también los de menos de 3 asistencias; el umbral solo corta las **líneas**. Si quiere que el punto tampoco se coloque por esos eventos, es una línea en `construirGrafo`.
- Lo que no cabe en React sin reescribirlo: el árbol y la lista, que el prototipo pinta imperativamente, se siguen pintando así dentro de dos contenedores que React no toca (un `useEffect` y un motor). Es lo mínimo y mantiene la lógica aprobada.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba en `main`). `npm run typecheck`: verde. `npm test`: 214 archivos, **3 838 pruebas** (27 nuevas). `npm run inventario`: sin novedades (342 medidas en duro, 1 bloque duplicado aceptado). `npm run medir`: 39 pantallas × 4 anchos, **sin novedades** (la nueva, `s29-admin-grafo`, sin hijos fuera de su caja, sin toques menores de 44 y sin accionables tapados; el resto de presupuestos no se movió).
- **Tamaño** (`.next/diagnostics/route-bundle-stats.json`): `/admin/grafo` abre con 868 082 bytes de JS sin comprimir, **sin three**; three.js es un trozo aparte de 580 153 bytes (145 888 comprimidos con gzip), que ninguna ruta trae en su primera carga: solo se descarga al abrir el grafo. Contra un `origin/main` compilado igual, **Inicio** (`/`) pasa de 999 737 a 999 764 bytes (+27, el nombre del trozo nuevo en el manifiesto del paquete, igual en todas las rutas): no creció.
- **Cuadros por segundo** (Chrome real en la Mac, M4 Pro, GPU Metal, 1280×800 a 2×, arrastrando la cámara 3 s con `window.grafo.medirFps()`): **60 fps** en movimiento y en reposo (el tope de la pantalla); `medirRender()` 0,07 ms por cuadro con 29 nodos y 36 líneas. Con los datos de hoy (≈750 nodos) el prototipo midió 57 a 99 fps; no repetí esa medición con datos reales porque este árbol no lee producción. La prueba que cuenta es la del iPhone, con la vista previa de la rama.
- **Toques reales:** el lugar de la captura 02 se eligió con un clic del ratón en las coordenadas proyectadas del nodo, no con `seleccionar()`.
- **Privacidad, comprobada en el HTML que recibe el navegador** (`curl` con la sesión de administración del respaldo): ninguno de los ids de personas del respaldo, ningún nombre de perfil, ningún correo y ninguna llave de servicio aparecen en la página ni en el paquete (`.next/static`). Sin sesión, `/admin/grafo` manda a `/entrar?siguiente=/admin/grafo`; con la cuenta de una persona normal, a `/`.
- **Umbral de 3 con los datos del respaldo:** de los 36 trazos, 12 son artista–lugar y 6 artista–artista (sin umbral) y **18 son de personas** (9 persona–lugar, 3 persona–artista y 6 persona–persona), todos de los tres eventos con 3 asistencias; el evento con 1 solo «Voy» no genera ninguno y la persona que solo sigue no se dibuja. **Con los datos reales de hoy no pude contar cuántas líneas quedan:** este árbol no lee producción. Se verá en la cabecera de la pantalla («N conexiones») la primera vez que un administrador la abra; el doc 56 contaba 36 + 84 + 15 = 135 líneas de personas sin umbral con 13 personas y 67 asistencias, y casi todas caerán porque casi ningún evento llega a 3.

## Capturas (`docs/rediseno/capturas-432/`, Chrome real, 2×, respaldo local con datos inventados)

1. `01-movil-nube.png` (390×844): la nube al abrir: lugares violeta, artistas blancos, asistentes naranja, anillos de 1 km, el nodo gris «por conectar» arriba a la derecha, leyenda, «Lentes» y «Lista» abajo a la izquierda, «Red» y «Desde arriba» sobre el mando.
2. `02-movil-lugar-elegido.png`: un lugar elegido con un toque real; su tarjeta arriba (tipo y ciudad, seguidores, asistencias, eventos, «7 conexiones: 4 artistas · 3 asistentes · a dos pasos, 5»), el nodo en blanco con su anillo, sus vecinos con rótulo y el resto atenuado.
3. `03-movil-hoja-lentes.png`: la hoja «Lentes de diagnóstico» abierta sobre la escena velada, con las seis preguntas y «Filtrar» (Todo, Lugares por tipo, Artistas por disciplina).
4. `04-movil-lente-puentes-lista.png`: la lente «¿Quién une lugares distintos?» aplicada: sube la hoja de la lista con el diagnóstico en frases, «Puentes · 4», «Copiar lista» y los cuatro artistas con los lugares que unen.
5. `05-movil-lente-puentes-red.png`: esa misma lente con la hoja cerrada: la lectura «Red» (el botón dice «Mapa»), los puentes y sus lugares en primer plano y lo demás apagado.
6. `06-movil-lista-diagnostico.png`: la hoja «Lista» sin lente: las cuatro frases del diagnóstico («5 de cada 10 artistas no tienen ningún evento registrado…») y «Todo · 22» ordenado por tamaño.
7. `07-horizontal-nube.png` (844×390): en horizontal, con la barra de la app y el carril; la escena, la leyenda en una línea, los botones y el mando.
8. `08-escritorio-nube.png` (1280×800): tres columnas (lentes y filtros a la izquierda, escena en medio, diagnóstico y lista a la derecha), con la barra y el carril de la app.
9. `09-escritorio-artista-elegido.png`: un artista elegido en escritorio: tarjeta («en 3 lugares», «9 conexiones: toca con 3 artistas · 3 asistentes · a dos pasos, 5»), rótulos de sus vecinos y su renglón marcado en la lista.
10. `10-escritorio-claro.png`: lo mismo en tema claro (el botón dice «Oscuro»): fondo en el tono del contenido, esferas en violeta, tinta y naranja.

Sin nombres de personas reales (respaldo inventado; los asistentes salen anónimos de todas formas). **No hay captura de la entrada en Administración:** el respaldo local no tiene las funciones del panel (`panel_resumen`, etc.) y `/admin` ya falla contra él; la entrada se comprobó con el tipado y leyendo el JSX (un `Link` a `/admin/grafo` en un grupo propio, como «Obras colectivas»). El founder la verá en la vista previa.

## Lo que no entró y por qué

- **Las lecturas de «cambios en el tiempo» con papel y procedencia de cada relación** (hueco 2 del doc 24): la base no lo tiene; sería la primera migración si esto crece.
- **Una escena por ciudad** (propuesta del doc 56): sigue el logaritmo del prototipo para lo lejano (San Miguel de Allende).
- **La versión pública:** el founder pidió solo administración.
- **Nodos de eventos, rutas de personas, obras y novedades:** siguen fuera, como en el doc 56 § 8.
- **La entrada de la lente «zonas» a más de 400 celdas:** el disco instanciado admite 400 (el prototipo, igual); hoy son ~120.

## Para el gestor

- **Nada en Supabase ni en Vercel:** sin migración y sin variables nuevas (usa `SUPABASE_SERVICE_ROLE_KEY`, que ya existe en Vercel). Hay que dejar `SUPABASE_SERVICE_ROLE_KEY` en el entorno de la vista previa de la rama para que la pantalla lea; sin ella dice «No pudimos leer el grafo.».
- Conflictos probables: `docs/ops/OPEN_LOOPS.md` (una bala y la cabecera) y `scripts/ops/auditoria-ui/medidas.aceptadas.json` (una línea de presupuesto al final del bloque de presupuestos).
- Revisar en el iPhone del founder, Safari y app instalada, con la vista previa de la rama: el gesto con dos dedos, las hojas, el rendimiento con los ~750 nodos reales y que el rótulo largo no se corte.

## Revisión de la sesión del grafo (13 de oct, 12:48)

Hallazgo al leer `grafo.ts`: la lectura de `asistencias` pedía `order=id`, y esa tabla no tiene columna `id` (su llave es usuario + evento). Contra la base real, en solo lectura, PostgREST responde 400 «column asistencias.id does not exist»: en producción la pantalla habría dicho «No pudimos leer el grafo». El respaldo local no lo detecta porque acepta cualquier orden. Corregido en `46d75dda`: `asistencias` se ordena por `usuario_id, evento_id`; `eventos_artistas` ya iba por su par; `seguimientos` sí tiene `id`. Las 27 pruebas siguen en verde. Lección para el respaldo: rechazar `order=` por columnas que la tabla no tiene.

## Segunda vuelta (13 de oct, tarde): plegar capas, «Yo» y qué significan Mapa y Red

El founder, probando el grafo en su iPhone: «probando grafo, que se pueda plegar lugares y artistas, en asistentes que pueda activarme a mi.» y, después, «En diagpostico incluye que significa red y mapa». Misma rama y mismo PR (#511); sin OL ni bitácora nuevos. Partí de `59130da1` (los dos commits del gestor sobre el orden de `asistencias` quedaron como estaban).

### Qué cambia

- **Capas plegables.** Cada renglón de la leyenda (Lugar, Artista, Asistente) es ahora un botón con `aria-pressed` (la misma fila tocable, de 44 de alto). Plegada, la capa desaparece de la escena (sus esferas y **todas** las líneas que la tocan), de la lista (`visible[]`), de los conteos del árbol («Todo») y de las cuentas de la barra, que solo suman lo que está a la vista (por ejemplo «20 nodos · 19 conexiones · 13 artistas · 7 asistentes» con Lugares plegado); el punto de la leyenda queda hueco y el texto apagado. El tamaño de lo que queda no cambia. El nodo «por conectar» y los artistas sueltos van con la capa Artista. El estado se guarda en `localStorage` (`grafo-admin:capas`, en `try/catch`: sin almacenamiento o con datos ilegibles se empieza con todo desplegado). Plegar la capa del elegido le quita la selección; la tarjeta y «a dos pasos» solo cuentan vecinos de capas a la vista.
- **Lentes y capas plegadas.** Cada lente declara las capas que necesita (zonas, islas y festivales: Lugar; «siempre en el mismo sitio» y «por conectar»: Artista; puentes: Lugar y Artista). Si alguna está plegada, la lente la despliega y lo dice en una línea bajo el título de su lista: «Se desplegó la capa Lugar para esta lente.» La capa queda desplegada al quitar la lente (y recordada).
- **«Yo» entre los asistentes.** Un interruptor «Yo» (píldora con `aria-pressed`) junto a la capa Asistente. Encendido: el punto de quien mira se marca con un anillo fino del color de persona y el rótulo «Tú», y la cámara vuela a él (`volarA`). Si la capa Asistente estaba plegada, se despliega; el nombre «Tú» también sale en su tarjeta y en la lista. Los demás asistentes siguen anónimos. El estado de «Yo» se recuerda en el teléfono (al volver a abrir, queda marcado sin volar). Sin asistencias, el interruptor queda apagado y desactivado y la leyenda dice «Aún no tienes asistencias».
- **Cómo se sabe cuál es su punto sin romper el anonimato.** `armarGrafo` (la lógica pura de `construirGrafo`) devuelve, aparte del `Grafo`, `indicePorUsuario` (id de la cuenta → índice en `personas`); `cargarGrafo()` lo guarda en la caché del servidor junto al grafo. `page.tsx` toma el id de `usuarioActual()`, busca su índice y pasa a `Grafo.tsx` solo `yo: number | null`. El mapa nunca viaja. Su posición sale de los lugares a los que va, como la de todos (nada de IP ni de ubicación). Tres pruebas nuevas en `grafo.test.ts`: cada usuario con asistencias tiene un punto distinto y quien solo sigue no tiene; **las props que recibe el componente (el grafo y el número) no contienen ningún uuid** (se serializan y se busca el patrón; el mapa privado, en cambio, sí los lleva: por eso se queda en el servidor); y `armarGrafo` y `construirGrafo` dan lo mismo.
- **Qué significan Mapa y Red.** El bloque «Diagnóstico» abre con dos líneas, una por lectura, con la activa en negrita; al pulsar «Red» / «Mapa» cambia la negrita sin repintar la lista. «Mapa: cada lugar en su sitio real, a escala; los artistas flotan sobre el lugar donde más tocan y los asistentes, debajo, cerca de los lugares a los que van. Dos puntos juntos están juntos en la ciudad, no necesariamente relacionados.» «Red: la posición la dan las conexiones, no el sitio: lo que se relaciona se atrae y lo más conectado queda al centro; los cúmulos sueltos quedan aparte y los lugares sin ninguna línea, en el anillo de fuera.»
- **Un arreglo al paso:** quitar una lente dejaba puesto el filtro que ella había fijado (por ejemplo «Lugares»: los artistas desaparecían), un hábito heredado del prototipo; ahora `quitarLente` devuelve el filtro a «Todo».
- Respaldo local: la cuenta de administración inventada va ahora a dos eventos con 3 o más asistencias (su punto tiene líneas) y hay una segunda cuenta de administración sin ninguna asistencia (`ADMIN_SIN`) para el aviso. `s29-admin-grafo` pasa de 381 · 381 · 418 · 414 a **395 · 395 · 432 · 428 nodos** (la leyenda ganó botones y el diagnóstico, dos párrafos); profundidad igual (11). Es lo único que se movió en `medidas.aceptadas.json`.

### Verificación de esta vuelta

`npm run lint` (0 errores, el mismo aviso de `main`), `npm run typecheck`, `npm test` (214 archivos, **3 841 pruebas**: 30 en `grafo.test.ts`), `npm run inventario` (sin novedades, 342 medidas en duro, un bloque duplicado aceptado) y `npm run medir` (39 pantallas × 4 anchos, **sin novedades**; a la primera falló el toque de «Yo» por medir 39 de ancho y se le puso `min-width` de 44). Sin `.env` en el árbol. Con el respaldo local y Chrome real a 390×844 (toques con el ratón sobre los botones): con Lugares plegado la barra dice «20 nodos · 19 conexiones» y las 19 líneas que quedan son las que no tocan lugares; al recargar la página sigue plegado (`localStorage`); con Asistentes plegado, «22 nodos · 18 conexiones»; con «Yo» la cámara queda en el punto (objetivo −158, −76, 86 a 520 de distancia); el HTML de la página no contiene ningún uuid ni el nombre de la cuenta de administración (solo la palabra «Tú»); la cuenta sin asistencias ve el interruptor desactivado y el aviso; la negrita pasa de «Mapa» (700) a «Red» (700) y la otra queda en 400.

### Capturas nuevas (`docs/rediseno/capturas-432/`, 390×844 a 2×, respaldo local)

11. `11-movil-leyenda-lugares-plegado.png`: la nube con la capa Lugar plegada: desaparecen los violetas y sus líneas, quedan artistas y asistentes con sus líneas entre ellos; la barra dice «20 nodos · 19 conexiones», el punto de «Lugar» está hueco y su texto apagado.
12. `12-movil-lente-despliega-lugares.png`: con Lugar plegado y recargada la página, se aplica «¿Qué lugares no comparten artista con nadie?»: la capa se despliega (barra «29 nodos · 42 conexiones») y bajo «Islas · 4» dice «Se desplegó la capa Lugar para esta lente.»
13. `13-movil-leyenda-asistentes-plegado.png`: con la capa Asistente plegada: lugares y artistas con sus líneas, sin ningún naranja; la barra «22 nodos · 18 conexiones · 9 lugares · 13 artistas» y el punto de «Asistente» hueco con su texto apagado.
14. `14-movil-yo-tu.png`: «Yo» encendido (la píldora en blanco): la cámara vuela al punto de la cuenta de administración del respaldo, que lleva un anillo fino del color de persona y el rótulo «Tú» encima; los demás asistentes, anónimos, y las líneas del punto a los lugares y artistas de sus eventos.
15. `15-movil-lectura-mapa.png`: la hoja «Lista» en la lectura «Mapa»: en el bloque «Diagnóstico» la línea «Mapa: cada lugar en su sitio real…» en negrita y la de «Red» normal, una raya, y debajo las cuatro frases calculadas.
16. `16-movil-lectura-red.png`: la misma hoja después de pulsar «Red»: ahora la negrita es la de «Red: la posición la dan las conexiones…» y la de «Mapa» queda normal.
17. `17-movil-yo-sin-asistencias.png`: con una cuenta de administración sin asistencias, la leyenda enseña «Yo» desactivado (atenuado) y debajo «Aún no tienes asistencias».

### Dudas para el founder

- La leyenda ocupa ahora tres filas de 44 de alto (para que cada capa se toque bien) más la píldora «Yo»: en el teléfono en vertical cabe, pero en horizontal (390 de alto) cubre buena parte de la escena. Si molesta, se puede pasar «Capas» a una fila de píldoras arriba de la escena o al árbol de «Lentes».
- Una lente que despliega una capa la deja desplegada al quitar la lente. ¿Prefiere que vuelva a plegarse?

