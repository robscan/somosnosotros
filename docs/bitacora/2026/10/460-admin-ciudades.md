# 460 · Administración › Ciudades: tabla de ciudades, detección por consultas, corridas y bandeja de propuestas (OL-427)

**Fecha:** 2026-10-20. **Rama:** `admin-ciudades`, desde `origin/main` (`2b63acce`). **Operador:** agente de la pieza (Claude) para el Gestor VII,
sin otros agentes. **Migración:** `supabase/migrations/20261020140000_ciudades.sql` (solo añade; la aplica el gestor; no depende de
`20261020130000_showcase.sql`). **Sin variables de entorno nuevas** (usa la llave de servicio que ya existe). **Estado:** lista para la revisión
del gestor y el «publica» del founder.

## El pedido

Founder, 20 de octubre: «hablamos que cada ciudad abierta aparecería en un panel de admin, desde donde se podría detonar con un accionable la
investigación usando API»; «Firmo» sobre el prototipo OL-425 (bitácora 458) con la mira como icono de Ciudades, las ciudades con algo por decidir
primero, las propuestas por revisar en «Pendiente» de la portada y los tres botones en este orden: «Buscar lugares», «Buscar agendas y eventos»,
«Buscar artistas». La rutina que corre con la API es OL-428: aquí cada botón deja una corrida **pendiente** con su tope y la pantalla lo dice así
(«Pendiente de correr · tope 3,00 USD»), sin nada apagado ni «pronto».

## Qué cambió

**La migración (`20261020140000_ciudades.sql`, solo añade):**

- `ciudades` (slug, nombre, `ampliada_de`, centro lat/lng, zoom, zona, `alias`, estado abierta · detectada · investigando · cerrada, `creado_en`).
  La lee todo el mundo; la escribe la administración. Sembrada con **San Luis Potosí** (el centro de `CIUDAD_INICIAL`, alias «Soledad de Graciano
  Sánchez», lo que hoy hace `MISMA_CIUDAD`) y **San Miguel de Allende** (centro = promedio de sus lugares públicos; si no hay, su jardín
  principal), las dos abiertas. La lista de ciudades de la app **no cambia**: se sigue armando con lo publicado (`src/lib/ciudades.ts`).
- `ciudades_vistas` (ciudad, día, consultas; llave ciudad+día): **sin persona**, ni cuenta, ni IP, ni ubicación. Solo la lee la administración.
- `registrar_ciudad_vista(slug) → boolean` (definer, ruta vacía, la llaman anon y cuentas): suma **exactamente 1** por llamada, con techo de
  1 000 000 por ciudad y día, el día en la zona de la ciudad, y **solo a una ciudad que ya está en la tabla** (nadie siembra ciudades por aquí);
  devuelve si contó.
- `rutinas_corridas` (tipo lugares · agendas · artistas · showcase, ciudad, `parametros`, `tope_usd` de 0 a 50, `gasto_usd`, estado pendiente ·
  corriendo · terminada · fallida · cancelada, `resumen`, `creado_por`, `creado_en`, `inicio`, `fin`). Una sola en curso por botón y ciudad
  (índice único parcial). Disparador: correr en una ciudad **detectada** la pone **investigando**.
- `propuestas` (corrida, tipo lugar · evento · artista, fuente, `datos`, estado propuesta · aceptada · rechazada, `motivo_rechazo` duplicado · no
  cultural · fuera de la ciudad · otro, `ficha_id`, `resuelto_por`, `resuelto_en`, `creado_en`). Rechazar exige motivo (restricción); `ficha_id` es
  la ficha que creó al aceptarse: ahí queda la procedencia.
- `configuracion` (clave/valor) con `credito_api_usd` = 200 y `credito_api_vence` = 2026-11-11.
- `panel_ciudades()`, `panel_propuestas(corrida)` y `aceptar_propuesta(propuesta, ficha)`: definer, ruta vacía, sin anon, comprueban el rol por
  dentro. `aceptar_propuesta` crea el lugar o el artista y marca la propuesta **en la misma transacción**; dos llamadas no crean dos fichas.
- Reglas por fila: `ciudades_vistas`, `rutinas_corridas`, `propuestas` y `configuracion`, solo administración (y la llave de servicio).

**La detección (`src/lib/ciudadesVistas.ts`):** Inicio y Lugares, al resolver la ciudad, llaman a `anotarConsulta(ciudad)`, que con `after()` de Next
registra la consulta **después de responder**, con un **cliente anónimo** (la llave pública, sin cookies ni sesión): a la base solo llega el
slug. No cuentan: lo que Next pide de antemano, lo que repinta una acción del servidor (tocar «Me interesa» no es otra consulta), los robots y
abrir una ficha en la hoja de Lugares (`?lugar=`). Si la ciudad resuelta no está en la tabla, se da de alta como **detectada** con lo que la app
ya sabe de ella (nombre, centro si lo conoce, zona) con la llave de servicio, y se cuenta. Fuera de una petición no hace nada y nunca tumba la
página. Inicio y Lugares no cambian de medidas (`medir` igual que en `main`).

**Las pantallas (como el prototipo firmado, con las clases de `admin.module.css`, `ui/Renglon`, `ui/Hoja`, `ui/Campo` con su ✕ y `ui/Boton`):**

- **Portada de Administración:** el grupo **Ciudades** con la mira («2 abiertas · 1 investigando · 1 detectada») al nivel de Grafo cultural, y
  arriba, en **Pendiente**, un renglón por corrida con propuestas por revisar («Lugares de Oaxaca · 5 por revisar · de la corrida del 18 oct») cuya
  cuenta se suma al rótulo. `src/app/admin/page.tsx` y `Pendientes.tsx` cambian lo mínimo (una carga, una prop y el grupo).
- **`/admin/ciudades`:** «Propuestas N» (un renglón por corrida; sin nada, «Nada por revisar · Las propuestas llegan al correr una búsqueda»); una
  tarjeta por ciudad con su píldora, «N consultas en 30 días · N lugares · N eventos próximos · N artistas» (contados como los cuenta la app),
  la última investigación y los tres botones en el orden del founder, cada uno con lo que pasó la última vez («Sin correr», «Pendiente de correr ·
  tope 3,00 USD», «Corriendo · 3 de 10 meses · 0,40 de 3,00 USD» con su barra, «18 oct · 14 propuestos · 9 aceptados · 5 por revisar · 1,10 USD»);
  al final, Corridas con el crédito. **La hoja** de cada botón: qué hace, fuentes en orden, «Tope de gasto (USD)» con su ✕ (3,00 por omisión),
  lo estimado y el crédito; «Cancelar» · «Correr» (crea la corrida pendiente); con una pendiente, la dice y deja «Cancelar la búsqueda»; con una
  corriendo, solo se mira.
- **`/admin/ciudades/propuestas/[corrida]` (la bandeja):** «Lugares de Oaxaca», «Corrida del 18 oct · 14 propuestos · 9 aceptados» y, por fuente,
  la tarjeta de «Pendiente» por propuesta (tipo, nombre, dirección con su ciudad, fuente con enlace, cuándo se leyó; Rechazar a la izquierda,
  Aceptar a la derecha). «Aceptar las N de esta fuente» **solo** si la fuente ya tuvo una tanda aceptada en una corrida anterior del mismo tipo.
  Rechazar abre una hoja con los cuatro motivos (sin motivo no se rechaza). Al decidir queda la línea de lo hecho: «Aceptaste… · Ver ficha»,
  «Rechazaste… · fuera de la ciudad · Deshacer».
  - **Aceptar un lugar** pasa por `validarLugar` (la del alta) y por `lugares_parecidos` (150 m): si hay uno parecido, lo dice («recházala como
    duplicado») y no crea nada. Lo crea a nombre de quien acepta, visible y con su zona; **sin `origen`** (ese campo solo admite `capo` y la
    ficha diría «se tomó del Catálogo de Artistas Potosinos»): la procedencia queda en la propuesta (`ficha_id`, fuente y datos).
  - **Aceptar un artista** crea la ficha mínima (nombre, disciplina o «por completar», ciudad, redes) por `validarArtista`; un nombre repetido en
    la ciudad se dice como duplicado.
  - **Aceptar un evento** lo deja «aceptado» sin ficha («se publica con la rutina de agendas»): el importador (`scripts/instituciones`) corre en la
    Mac y no se puede llamar desde el servidor; **queda por hacer con OL-428**: publicar los eventos `aceptada` sin `ficha_id` por el camino del
    importador.
- **`/admin/corridas`:** «Crédito 200,00 · USD de 200 · vence el 11 de noviembre · N días» y «Gastado · USD en N corridas · ▲ esta semana» (los
  indicadores de la portada); por cuándo (En curso, Esta semana, por mes), cada corrida con su fecha, fuentes, resultados, gasto y píldora
  (Pendiente, En curso, Terminada, Llegó al tope, Falló, Cancelada); la que tiene propuestas lleva a su bandeja. El gasto real lo descuenta OL-428.

**El contrato para OL-428** (`src/lib/propuestas.ts`): `propuestas.datos` de un lugar `{ nombre, tipo?, detalle?, direccion?, lat?, lng?, ciudad?,
redes?, url?, leida? }`, de un artista `{ nombre, disciplina?, detalle?, tipo?, ciudad?, redes?, url?, leida? }` y de un evento `{ titulo, inicio?,
lugar?, url?, leida? }`; `rutinas_corridas.parametros.fuentes` lleva las claves de las fuentes de la hoja (`sic`, `cultura`, `web`…) y
`resumen.avance` (0 a 1) y `resumen.paso` («3 de 10 meses») pintan la barra y el texto de la que corre.

## Decisiones que tomé (por confirmar con el founder o el gestor)

1. **Orden de las ciudades:** primero las que tienen propuestas por revisar o una búsqueda en curso, luego las **detectadas** (falta decidir si se
   investigan: «algo por decidir», como en el prototipo firmado) y luego el resto; en cada grupo, por consultas. El encargo decía «luego por
   consultas»; añadí las detectadas como segundo grupo por la firma.
2. **Cómo pasa una ciudad a «abierta»:** no hay botón (no estaba en el prototipo). Hoy: la siembra abre San Luis y San Miguel; una detectada pasa a
   investigando al correr. Propuesta: al aceptar su primera tanda de lugares, o un toque en la píldora.
3. **La bandeja es por corrida** (`/admin/ciudades/propuestas/[corrida]`), como «Lugares de Oaxaca · de la corrida del 18 oct» del prototipo, y
   Atrás vuelve a Ciudades (también desde Corridas, como en el prototipo).
4. **Lo aceptado no se deshace desde la bandeja:** «Deshacer» solo en un rechazo; lo aceptado lleva «Ver ficha» (la ficha ya existe; se oculta
   desde su menú). El prototipo ponía «Deshacer» en las dos.
5. **`origen` de las fichas creadas:** vacío (ver arriba). Si el founder quiere que la ficha diga de dónde salió, hace falta ampliar `origen` y
   `ORIGENES` (otra pieza: cambia el texto público de la ficha).
6. **Detección contada en el servidor:** quien tiene otra ciudad guardada en su teléfono abre `/`, el servidor pinta San Luis (una consulta para San
   Luis) y la app lo lleva a la suya (otra consulta). Las ciudades nuevas se detectan bien; la cifra de San Luis sale un poco inflada. Si se quiere
   exacta, se cuenta desde el teléfono. Una ciudad **sin nada publicado** (alguien en Querétaro sin lugares) todavía no se detecta: el servidor no
   sabe dónde está nadie; llega con «Ubicación primero» (doc 57 §4.A), que ya puede dar de alta con `registrarVistaCiudad`.
7. **Tope:** de más de 0 y hasta 50 USD por corrida (base y pantalla); 3,00 por omisión en los tres botones (el prototipo ponía 2,00 en artistas).
8. **Fuentes en la bandeja:** primero la que ya tuvo una tanda aceptada (donde está «Aceptar todas»), luego la que trae más, luego por nombre.
9. **Chips de Corridas** (Todas · Ciudades · Showcase): solo salen cuando hay corridas de más de un tipo. «Carteles» no está: la lectura de carteles
   no deja corridas en esta tabla.
10. El punto de Administración en la barra de la app sigue contando solo reclamos y reportes; las propuestas suben a «Pendiente» de la portada.

## Diferencias con el prototipo (capturas 01 a 04 y 13 de `capturas-458`)

- **01 portada:** igual (grupo «Ciudades» con la mira y su detalle bajo «Grafo cultural»), sin la marca «nuevo» del prototipo; además, «Pendiente 5»
  con el renglón de las propuestas arriba (lo firmado).
- **02 Ciudades:** la misma estructura y piezas; Oaxaca va antes que Querétaro (tiene propuestas por revisar), los números de lugares salen de la
  base (el respaldo no tiene lugares en Oaxaca) y la hora va como en toda la app («9:31 am»).
- **03 hoja:** igual (título, texto, tres fuentes con su palomita, tope con ✕, lo estimado y el crédito, Cancelar · Correr).
- **04 bandeja:** igual (Sistema de Información Cultural 3 con «Aceptar las 3 de esta fuente», tarjetas Rechazar · Aceptar); «Ver ficha» en vez de
  «Deshacer» al aceptar; la hoja del motivo es nueva (el prototipo no la dibujó).
- **13 Corridas:** los mismos indicadores y grupos; sin chips (un solo tipo en el respaldo) y «USD de 200» con su fecha.

## Medidas (`npm run medir`, aceptadas)

| Pantalla | Nodos 320 · 390 · 820 · 1280 | Profundidad |
|---|---|---|
| s32-admin-ciudades | 149 · 149 · 183 · 183 | 8 |
| s33-admin-ciudades-hoja (la hoja de Querétaro abierta) | 175 · 175 · 209 · 209 | 8 |
| s34-admin-propuestas | 59 · 59 · 93 · 93 | 7 |
| s35-admin-corridas | 61 · 61 · 95 · 95 | 8 |

El prototipo medía 153/8 (Ciudades), 59/7 (bandeja) y 98/8 (Corridas, con chips y más corridas). Sin desbordes, sin toques menores de 44, nada
tapado; con el teclado (390×508, de las dos maneras), el tope queda a la vista y «Cancelar» · «Correr» sobre el teclado. Las 41 pantallas de antes,
Inicio y Lugares incluidas, dentro de su presupuesto y sin cambiar sus cifras; `medidas.aceptadas.json` solo suma las cuatro nuevas.

## Verificación (árbol sin `.env`)

- `npm run lint` (sin errores; el aviso viejo de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (233 archivos, 4085 pruebas;
  nuevas: `ciudadesAdmin.test.ts` 18 —orden de ciudades y textos de estado—, `propuestas.test.ts` 12, `ciudadesVistas.test.ts` 9),
  `npm run test:db` (100 migraciones, 2108 comprobaciones, 0 fallaron; nueva `supabase/tests/pg/ciudades-admin.test.mjs`: siembra, anon lee
  ciudades y no las escribe, `registrar_ciudad_vista` desde anon suma, no siembra, tiene techo, solo devuelve sí/no y `ciudades_vistas` no guarda
  a nadie; corridas y propuestas solo para administración; tope y corrida única; aceptar crea la ficha una sola vez; rechazar pide motivo),
  `npm run inventario` (sin novedades) y `npm run medir` (arriba). `CLAUDE.md` no cambió con `next build`.
- Componentes (`src/app/admin/ciudades/Ciudades.componentes.test.mjs`, Chrome real, 9 de 9): los botones en orden; «Correr» crea la corrida con el
  tope (3,00 por omisión); la ✕ borra y deja el foco; vacío o 80 no llegan al servidor; Intro corre (y no reabre la hoja: el mismo Intro tocaba el
  botón que recupera el foco, arreglado con `preventDefault`; la prueba fallaba antes del arreglo); el error se queda en la hoja; pendiente se
  cancela, corriendo solo se mira; bandeja: la fuente con tanda primero, «Aceptar las N» solo ahí, aceptar deja «Ver ficha», rechazar pide motivo
  y se deshace, «Aceptar las 2» va una por una, un error se queda en su tarjeta, un evento aceptado espera a la rutina, sin propuestas una frase.
- Respaldo local y Chrome real (`capturar-admin-ciudades.mjs`, toques por coordenadas): portada → Ciudades; hoja; la ✕ (tope vacío y foco en el
  campo); «Correr» con 2,50 guardó `{"tipo":"lugares","ciudad":"queretaro","tope_usd":2.5,"creado_por":…,"parametros":{"fuentes":["sic","cultura",
  "web"]}}`; aceptar, rechazar con «Fuera de la ciudad» y deshacer. **Detección:** Inicio y Lugares hicieron una llamada cada uno a
  `registrar_ciudad_vista` después de responder; la ficha en la hoja (`?lugar=`) y un robot (Googlebot), ninguna. Sin errores de página (solo el
  estilo del mapa de Lugares, que no hay red).

## Capturas (`docs/rediseno/capturas-460/`, Chrome real, 390×844 a 2×, respaldo local, martes 20 de octubre 10:00)

- `01-portada-pendiente.png`: «Pendiente 5» con «Lugares de Oaxaca · 5 por revisar · de la corrida del 18 oct» y debajo Últimos 7 días.
- `02-portada-grupo-ciudades.png`: Gestionar, Obras colectivas, Grafo cultural y Ciudades con la mira: «2 abiertas · 1 investigando · 1 detectada».
- `03-ciudades.png`: Propuestas 5; Oaxaca investigando (Buscar lugares con su resultado, agendas corriendo con su barra, artistas sin correr) y
  Querétaro detectada, «Nunca investigada · detectada el 12 oct», tres veces «Sin correr».
- `04-ciudades-abiertas-y-corridas.png`: San Luis (1 932 consultas, «Última investigación: 1 oct») y San Miguel abiertas; el renglón de Corridas con
  el crédito.
- `05-hoja-buscar-lugares.png`: la hoja de Querétaro con las tres fuentes, el tope 3,00 con su ✕ y Cancelar · Correr.
- `06-hoja-tope-vacio.png`: tras la ✕ y «Correr»: «Escribe el tope en dólares.».
- `07-bandeja.png`: Lugares de Oaxaca; Sistema de Información Cultural 3 con «Aceptar las 3 de esta fuente» y sus tarjetas.
- `08-bandeja-hoja-rechazar.png`: «¿Por qué la rechazas?» con Duplicado, No es cultural, Fuera de la ciudad y Otro.
- `09-bandeja-aceptada.png`: «Aceptaste Foro Cultural La Nopalera · Ver ficha» y «Aceptar las 2 de esta fuente».
- `10-bandeja-rechazada.png`: Búsqueda web 1 y «Rechazaste Patio Escénico Tule · fuera de la ciudad · Deshacer».
- `11-corridas.png`: Crédito 195,60 de 200 (22 días) y Gastado 4,40; En curso (agendas de Oaxaca con su barra), Esta semana y Octubre.

## Lo que no se hizo

- La rutina que corre con la API, el gasto real y su descuento del crédito, publicar los eventos aceptados, que la rutina aprenda de los motivos de
  rechazo: **OL-428**.
- Ninguna pantalla de la app cambia para la persona; la lista de ciudades sigue saliendo de lo publicado.
- No toqué `src/app/admin/showcase/*`, `/api/showcase/*` ni la migración del showcase. El respaldo trae el mismo bloque de la portada que la rama
  del prototipo (`panel_resumen` y compañía, idéntico, para que se una sin choque) y lo de Ciudades al final del archivo.

- Al unir con el showcase, el inventario detectó el mismo bloque CSS en `.motivo > small` (Ciudades) y `.opcion > small` (Showcase): ahora es una sola regla, `admin.menuConDetalle` en `admin.module.css` (icono en dos filas y detalle en la columna del texto), y los cuatro botones la componen con su clase propia (resolución del gestor, 2026-10-20).
