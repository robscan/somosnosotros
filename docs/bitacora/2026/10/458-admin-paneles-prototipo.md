# 458 · Prototipo: Administración › Ciudades y Administración › Showcase, al mismo nivel que Grafo y Pincel (OL-425)

**Fecha:** 2026-10-20. **Rama:** `admin-paneles-prototipo`, base `origin/main` (`2b63acce`). **Operador:** agente de la pieza (Gestor VII), sin otros agentes.
**Solo prototipo:** nada en `src/**`, sin migración y sin variables de entorno. Toca dos scripts de operación (la maqueta y el respaldo local).
**Estado:** listo para la revisión del gestor y el VoBo del founder. Prototipo: `docs/rediseno/prototipos/admin-paneles.html`.

## El pedido (founder, 20 de octubre, textual)

«el showcase me gustaría que fuera una sección dentro de administración al igual que ahorita está el grafo y pincel»; «no quise decir que
usáramos el patrón de diseño de grafo, si no que el panel se agregue en el mismo nivel. Me gustas como presentaste los datos»; «Vamos con
prototipo primero siempre»; «hablamos que cada ciudad abierta aparecería en un panel de admin, desde donde se podría detonar con un accionable
la investigación usando API». Fuentes: doc 57 §4.B (Ciudades), investigación del 20 de octubre §4 (`origin/mapeo-anual-showcase`, el
showcase), la página privada del showcase (la presentación que le gustó) y la regla de OL-409: todo prototipo de una pantalla que existe parte
de su maqueta real.

## Sobre la pantalla real

- **`maqueta-pantalla.mjs` conoce Administración.** Cinco pantallas nuevas con la cuenta de administración del respaldo (`cuenta: "admin"`,
  `cookieDe(ADMIN)`): la portada `/admin`, Personas (lista con buscador y chips), la ficha de Ana con la hoja «Hacer administrador» abierta
  (paso `admin-hoja-rol`), Lugares (por el CSS de ui/Campo con su ✕ y la hoja con título) y el grafo (por ui/Ayuda).
- **La portada caía en «Algo falló» contra el respaldo:** una RPC desconocida devuelve `[]` y `indicadores()` leía `desglose` de un arreglo.
  `fixture.mjs` gana `panel_resumen`, `panel_pendientes`, `panel_comunidad`, `panel_aportes`, `panel_fichas` y `panel_capo` con números
  inventados y coherentes (80 cuentas, 71 lugares, 383 eventos, 686 artistas; el CAPO pasa el esquema de zod). Solo los lee `/admin`: ninguna
  pantalla de `medir` cambia (la prueba del respaldo pasa; la maqueta de Agenda se sigue guardando igual).
- **`prototipo/meter-maqueta.mjs`** mete en el prototipo lo que sale de esas maquetas: el CSS servido (cuatro hojas, 221 KB, sin @font-face; la
  letra la trae Google Fonts como en OL-409), 855 clases con su hash, el armazón de la vista «tarea» alrededor de `<main>` y la portada entera,
  la barra de Atrás de Personas como plantilla, 82 iconos de producción pintados con React desde `ui/Iconos` (más el del grafo, «Actualizar» y
  la ⓘ de ui/Ayuda) y `sin-foto-redonda.png` (el símbolo SN). Reemplaza solo lo que está entre marcas; correrlo dos veces da el mismo archivo.
- **El teléfono es un marco** (`iframe`, 390×844) con ese CSS. Las pantallas se arman con el marcado y las clases de producción:
  `admin.module.css` (título, grupo con su cifra, `fila`, `dato`, `total`, `etiqueta` con `etiquetaRol` y `destacada`, `pendiente` con
  `dejar`/`actuar`, `hecho`, `indicador`, `barraEmbudo`, `cabecera` y `avatar` de la ficha de una persona, `menu`/`menuItem`, `puede`, `nota`),
  `ui/Renglon` (tarjeta), `ui/Boton`, `ui/Chip` (filtro y contexto), `ui/Buscador` con su ✕, `ui/Hoja` con título y pie, `ui/Campo` con
  `ui/Limpiar` y `ui/Ayuda`. La portada (A) es la real con dos grupos más. Lo propio va en clases `p-…` dentro del marco, solo con tokens del
  sistema: la tarjeta del showcase y su rúbrica, la tabla, la píldora verde (`--ok`/`--ok-suave`), el aire entre tarjetas seguidas, la línea
  de la última investigación, la barra de avance en su renglón, la ⓘ fija y las opciones con detalle de las hojas. Sin tokens nuevos.

## Las pantallas

| | Pantalla | Qué lleva |
|---|---|---|
| A | **Portada** | La real, con «Ciudades» («2 abiertas · 1 investigando · 1 detectada») y «Showcase» («29 candidatos · 7 invitados») debajo de «Grafo cultural», con el mismo renglón-enlace (icono, nombre, detalle, ›) y una marca «nuevo» del prototipo. |
| B | **Ciudades** | «Propuestas 5» arriba (lo que pide una acción, como «Pendiente»); una tarjeta por ciudad: cabecera con nombre y píldora de estado (como «Tú · Administración» en Personas), consultas en 30 días, lugares, eventos próximos, artistas y la última investigación; debajo, «Buscar lugares», «Buscar agendas y eventos» y «Buscar artistas» en el orden del founder, con pin, calendario y estrella (los de Gestionar) y lo que pasó la última vez. Oaxaca corre agendas: «Corriendo · 3 de 10 meses · 0,40 de 3,00 USD» con la barra del embudo. Al final, el renglón de Corridas con el crédito. |
| B | **Hoja de un botón** | ui/Hoja con título y pie: qué hace, fuentes en orden (catálogo del Sistema de Información Cultural, Cultura del estado y del municipio, búsqueda web), «Tope de gasto (USD)» con su ✕, lo estimado y el crédito; «Cancelar» y «Correr». |
| B | **Propuestas de Oaxaca** | La tarjeta de «Pendiente» por propuesta (tipo, nombre, dirección, fuente con enlace, cuándo se leyó; Rechazar a la izquierda, Aceptar a la derecha), agrupadas por fuente; «Aceptar las 3 de esta fuente» solo en la que ya tuvo una tanda aprobada; al decidir queda la línea de lo hecho con «Deshacer». |
| C | **Showcase › Candidatos** | Buscador con ✕, chips de disciplina con su cuenta, chips de contexto «Estado», «Orden» y «Vista» (abren su hoja), la línea «29 candidatos · 7 invitados · 2 confirmados · pasan al consejo con 5 de 8» y diez tarjetas: foto (símbolo SN), nombre, disciplina, píldora de estado, eventos · foros · festivales, seguidores · publicaciones · última, píldora de actividad, las cuatro señales 0–2 en color (2 verde, 1 naranja, 0 gris) con el total, la nota, «Programado por» y los enlaces Ficha e Instagram. «Ver más (19 más)» y el renglón de Corridas. |
| C | **Tabla** | La lista completa con las mismas columnas (artista, disciplina, estado, las cuatro señales, total, eventos, foros, festivales, seguidores, última publicación); el orden elegido en violeta. En escritorio usa el ancho de las fichas (`--columna-ancha`); en el teléfono se desliza dentro de su caja. |
| D | **Ficha de showcase** | Cabecera de la ficha de una persona (foto grande, nombre, «Música · San Luis Potosí · ficha reclamada»); «Estado: Invitado · por ti el 18 oct · antes, revisado el 15 oct» que abre su hoja (los cinco estados, cada uno con quién y cuándo); «Rúbrica 6 de 8» con una tarjeta por señal: su resumen, su puntaje y sus evidencias enlazadas (tipo, fuente, fecha, «aceptada, la leyó la rutina / una persona»); «Por revisar 2» con lo que propuso «Investigar» en tarjetas de «Pendiente» (tipo, título, la cita leída, fuente, Rechazar/Aceptar); «En la base · 2026» (eventos y foros del año); «Redes, leídas hace 4 días» con «Volver a leer»; notas del consejo con ✕; «Investigar» al pie (hoja: qué busca, dónde, tope con ✕, «Correr»). La ⓘ de abajo a la izquierda es ui/Ayuda: la rúbrica en tres líneas y «Más en el manual ›». |
| E | **Corridas** | Compartida por Ciudades, Showcase y la lectura de carteles (también gasta crédito): «Crédito 187,40 USD de 200 · vence el 11 de noviembre» y «Gastado 12,60 USD en 8 corridas» con los indicadores de la portada; chips Todas · Ciudades · Showcase · Carteles; por cuándo (En curso, Esta semana, Octubre), cada corrida con fecha, parámetros, resultados, gasto y su píldora (En curso, Terminada, Llegó al tope, Del mes). |

En escritorio (1280) el marco mide 1280×800 y se escala a su columna; la pantalla es la misma con la barra de la app arriba y el carril de
secciones a la izquierda, como producción. **Datos:** todo inventado (cifras de redes, puntajes, evidencias con dominio `.example`, notas
neutras, propuestas con nombres y direcciones de Oaxaca inventados, corridas y gastos). Los nombres de artistas son públicos del catálogo, solo
con su disciplina; los foros de «Programado por» son los del respaldo local. Nada privado ni cifras reales de redes.

## Decisiones de diseño que tomé

1. Mismo nivel que Grafo y Pincel: dos grupos al final de la portada con el renglón de siempre. No se toma el diseño del grafo: son listas de
   Administración como Personas.
2. Lo que pide una acción va arriba (como «Pendiente»): en Ciudades, «Propuestas»; las ciudades por lo que hay que decidir (detectadas,
   investigando, abiertas).
3. Una ciudad es una tarjeta de renglones; los tres botones son renglones con icono y texto que dicen lo que pasó la última vez, en vez de
   tres botones en fila (no caben a 390 con «Buscar agendas y eventos»).
4. Correr siempre se decide en una hoja con el tope en USD y el crédito a la vista.
5. La bandeja reutiliza la tarjeta de «Pendiente» y su línea de lo hecho; el aceptar en bloque solo donde la fuente ya tuvo una tanda.
6. Showcase: la presentación de la página privada, con las piezas de la app; estado, orden y vista en chips de contexto que abren hoja.
7. La rúbrica con colores que ya existen; el total en el violeta suave de lo elegido.
8. La ficha de showcase con la cabecera de la ficha de una persona, una tarjeta por señal y las evidencias propuestas aparte.
9. Corridas: una lista, con el crédito arriba.

## Por confirmar (founder)

- «2 abiertas · 1 investigando · 1 detectada»: el encargo decía «2 abiertas · 1 detectada»; con Oaxaca investigando, la segunda abierta es San
  Miguel de Allende (ya tiene lugares y eventos publicados).
- Iconos: la mira de «Usar mi ubicación» para Ciudades y el destello de «Destacar» para Showcase.
- El orden de las ciudades: por lo que hay que decidir (propuesto) o por consultas.
- ¿Las propuestas por revisar suben a «Pendiente» de la portada?
- Orden por defecto del showcase: «Puntaje» (lo añadí a convocatoria, seguidores, última publicación y nombre).
- «Volver a leer» las redes lo corre la rutina desde el Chrome de administración (el servidor no puede leer Instagram): ¿botón, o «Importar CSV»?
- Las notas son ui/Campo con área de texto y su ✕; CampoLargo (pantalla completa) no trae ✕.
- Corridas: se entra desde Ciudades y Showcase y Atrás vuelve ahí. ¿También un renglón en la portada?

## Medidas (medir.js dentro del marco, 390×844; la tabla a 1280)

| Captura | Nodos | Prof. | Desbordes | Toques < 44 |
|---|---|---|---|---|
| A portada | 186 | 8 | 5 | 1 |
| B ciudades | 153 | 8 | 0 | 0 |
| B propuestas | 59 | 7 | 0 | 0 |
| C tarjetas | 426 | 8 | 0 | 1 |
| C tabla, 1280 | 315 | 9 | 0 | 1 |
| D ficha | 182 | 9 | 0 | 0 |
| E corridas | 98 | 8 | 0 | 0 |

La portada real mide 166 nodos y profundidad 8; los dos grupos suman 20. Lo que marca la portada es de producción (el `details` de «Cómo se
cuenta» del CAPO: 5 párrafos fuera de su caja plegada y su `summary` de 37 de alto). El toque de C es el `input` del buscador (24 de alto; se
toca la etiqueta entera); buscando, además la ✕ de `ui/Buscador` mide 16 de ancho: también de producción (Personas tiene la misma), queda
anotado. Las tarjetas y la tabla llevan el área de toque de 44 en el nombre como `a.ficha` de admin.module.css. Las hojas abiertas cuentan como
«tapados» lo que queda detrás del velo, como debe. La hoja de notas del prototipo cuenta en vivo nodos, profundidad y cuántos elementos
llevan una clase `p-…` (A: 2; B: 11; C: 141, la tarjeta del showcase es nueva; D: 11; E: 7).

## Verificación

- Chrome real (playwright-core, el de la Mac): las 14 capturas sin errores ni avisos de consola. Recorrido con toques reales (clics por
  coordenadas dentro del marco), 19 de 19: entrar desde la portada, abrir la hoja de «Buscar lugares», la ✕ del tope, «Correr» cierra,
  aceptar y deshacer una propuesta, «Aceptar las 3 de esta fuente», Atrás con la cuenta al día, buscar con su ✕, la hoja «Orden», el chip de
  disciplina, la ⓘ, la hoja Estado, «Investigar», Escape, la ✕ de las notas y el chip de corridas.
- La página del prototipo a 390: sin desplazamiento horizontal; la hoja de notas sube con «Notas». A 1440 con «Escritorio», el marco a 0,79.
- `npm run lint`: sin errores (un aviso viejo en `VisorImagen.componentes.test.mjs`, ajeno). `npm run inventario`: sin novedades. La prueba
  del respaldo local pasa. `CLAUDE.md` no cambió con `next build`.

## Capturas (`docs/rediseno/capturas-458/`, Chrome real, 390×844 a 2×; la 14 a 1280×800)

- `00-pagina-entera.png`: el prototipo con la portada y la hoja de notas (decisiones, medidor).
- `01-A-portada.png`: Gestionar, Obras colectivas, Grafo cultural y, debajo, Ciudades y Showcase con su marca «nuevo».
- `02-B-ciudades.png`: Propuestas 5; Querétaro detectada (14 consultas, nunca investigada, tres botones «Sin correr»); Oaxaca investigando con
  la barra de agendas.
- `03-B-hoja-buscar-lugares.png`: la hoja de Querétaro con las tres fuentes, el tope 3,00 con su ✕ y Cancelar · Correr.
- `04-B-propuestas-oaxaca.png`: Sistema de Información Cultural 3 con «Aceptar las 3 de esta fuente» y las tarjetas Rechazar · Aceptar.
- `05-C-showcase-tarjetas.png`: buscador, chips de disciplina y de contexto, la línea de cifras y la tarjeta de Sangre de Coyote completa.
- `06-C-buscando.png`: «co» con su ✕: 2 de 29 (Sangre de Coyote y La Clika Colombiana), sin «Ver más».
- `07-C-hoja-orden.png`: «Ordenar por» con Puntaje elegido y el detalle de cada orden.
- `08-D-ficha.png`: cabecera, Estado, Rúbrica 6 de 8 con Circulación (2) y Obra (1) y sus evidencias.
- `09-D-ayuda.png`: el panel de ayuda abierto con la rúbrica en tres líneas.
- `10-D-hoja-estado.png`: los cinco estados, Invitado elegido, cada uno con quién y cuándo.
- `11-D-hoja-investigar.png`: dónde busca, tope 0,20 con su ✕, Cancelar · Correr.
- `12-D-evidencias-y-notas.png`: Por revisar 2 (premio y prensa propuestos, con su cita) y el comienzo de «En la base · 2026».
- `13-E-corridas.png`: crédito y gastado, chips por tipo, «En curso» con su barra y «Esta semana».
- `14-C-tabla-escritorio-1280.png`: la tabla a 1280 con la barra y el carril de la app; las trece columnas caben en el ancho de las fichas.

## Lo que no se hizo

- Código, tablas y migraciones (`showcase_candidatos`, `showcase_evidencias`, `rutinas_corridas`, `ciudades_vistas`, `propuestas`): son las
  piezas siguientes, con el VoBo de este prototipo.
- El motivo al rechazar una propuesta (duplicado, no cultural, fuera de la ciudad, otro, doc 57 §4.B) y exportar para el consejo: no se
  dibujaron; se dicen en las notas de la pieza de código.

## Firma del founder (2026-10-20)

«Firmo», con las cuatro decisiones del agente tal como quedaron: la mira para Ciudades y el destello para Showcase; las ciudades con algo por decidir primero; «Puntaje» como orden por defecto del showcase; las propuestas por revisar suben a «Pendiente» en la portada. Con la firma arrancan las piezas de código: OL-426 (tablas y pantallas del showcase, rúbrica a mano) y OL-427 (ciudades, detección, corridas y bandeja); la rutina con la API después (OL-428).
