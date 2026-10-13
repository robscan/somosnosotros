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
