# 459 · Administración › Showcase: tablas, candidatos, ficha con rúbrica y evidencias (OL-426)

**Fecha:** 2026-10-20. **Rama:** `admin-showcase`, base `origin/main` (`2b63acce`). **Operador:** agente de la pieza (Gestor VII), sin otros agentes.
**Migración:** `supabase/migrations/20261020130000_showcase.sql` (solo añade; **la aplica el gestor**; no depende de `20261020120000_eventos_procedencia.sql`).
**Variables de entorno:** ninguna. **Estado:** listo para la revisión del gestor.

## El pedido (lo firmado por el founder el 20 de octubre sobre el prototipo OL-425, bitácora 458)

«Firmo», con: «el showcase me gustaría que fuera una sección dentro de administración al igual que ahorita está el grafo y pincel… el panel se
agregue en el mismo nivel»; la presentación de tarjetas con rúbrica de la página del showcase; «Puntaje» como orden por defecto; el destello como
icono; y las tres reglas de gobierno del §4.3 de la investigación del 20 de octubre: solo administración, notas privadas que nunca salen de
Administración, nada publicado sobre un artista sin su consentimiento.

## Qué cambió

**Base (migración `20261020130000_showcase.sql`).** Cuatro tablas, todas con RLS de solo administración (`es_admin()` para leer y escribir;
`anon` sin ningún permiso; la llave de servicio, todo) y comentarios que dicen el porqué:

- `showcase_candidatos` (`artista_id` pk → artistas): `estado` (candidato · revisado · invitado · confirmado · descartado), los cuatro puntajes
  0–2 con null = «sin puntuar», `notas` (hasta 4 000), `actualizado_por` → perfiles y `actualizado_en`. Sin fila, el artista visible es
  candidato implícito: no se insertan 686 filas.
- `showcase_cambios_estado`: cada cambio de estado con quién y cuándo. **Tabla de más respecto al encargo** (por confirmar): sin ella no se
  puede decir «Por ti el 18 oct · antes, revisado el 15 oct» ni el «quién y cuándo» de cada estado en su hoja, como en el prototipo. La
  escribe solo el disparador; nadie la escribe a mano, ni la administración.
- `showcase_evidencias`: señal, tipo, título, **`url` obligatoria** (http o https, dominio con punto, sin espacios ni usuario delante; la base lo
  exige con un check), fecha, fuente, `leida_por` (rutina · persona), `estado` (propuesta · aceptada · rechazada), `decidida_por` y
  `decidida_en` (de más: quién aceptó o rechazó y cuándo), `creado_por`, `creado_en`.
- `lecturas_redes`: red (instagram · facebook · youtube · spotify · otra), seguidores, publicaciones, última publicación, `leido_en`,
  `leido_por` → perfiles; al menos una cifra.
- Tres disparadores (`security definer`, `search_path` vacío, sin EXECUTE para clientes) ponen el autor y la hora con la sesión: nadie escribe a
  nombre de otra cuenta. Índices en todas las claves foráneas.
- Banco nuevo `supabase/tests/pg/showcase.test.mjs`: un visitante no tiene permiso sobre ninguna tabla; una cuenta cualquiera no ve ni
  escribe ni cambia nada; la administración sí; el autor lo pone la base; el registro crece con cada cambio de estado y no con notas ni
  puntajes; aceptar y deshacer una propuesta; los límites (puntajes 3 y −1, estados, señales, tipos, siete direcciones malas, título vacío,
  lecturas sin cifra o negativas); la llave de servicio lee todo; borrar el artista se lleva lo suyo.

**`/admin/showcase` (Candidatos).** `src/app/admin/showcase/page.tsx` y `VistaCandidatos.tsx` (sin datos propios: la prueban los componentes),
`OpcionesLista.tsx`, `Piezas.tsx`, `consultas.ts`, `showcase.module.css`. La lista es todo artista visible del catálogo con su estado; el
buscador con ✕ (`ui/Buscador`, en la URL), chips de disciplina con su cuenta, tres chips de contexto que abren su hoja (Estado con sus cuentas,
Orden con «Puntaje» por defecto, Vista: tarjetas o tabla), la línea «N candidatos · N invitados · N confirmados · pasan al consejo con 5 de 8»
(«N de M candidatos» al filtrar), diez tarjetas y «Ver más» como Personas (cincuenta filas en la tabla). Cada tarjeta: foto o símbolo SN,
nombre (abre la ficha de showcase), disciplina y ciudad, píldora de estado, eventos · foros · festivales **de la base** (eventos visibles,
publicados y sin cancelar del año, lugares distintos y marcos de festival), seguidores · publicaciones · última de la red principal (la de más
seguidores entre las últimas lecturas), píldora de actividad (hasta 10 días «Publica cada semana», hasta 45 «Publica cada mes», si no «Sin
publicar en 45 días»), la rúbrica en color (2 verde, 1 naranja, 0 gris, raya sin puntuar) con «n de 8», la primera línea de las notas,
«Programado por» (los tres foros o festivales que más lo programan y «y N más») y los enlaces Ficha (pública) e Instagram (si `redes` lo trae).
La tabla lleva las trece columnas; en el teléfono se desliza en su caja y a 1280 cabe en el ancho de las fichas (el nombre parte su renglón).
Abajo, **«Exportar para el consejo (CSV)»**: `/api/showcase/csv` (solo administración; a cualquier otro 404; `private, no-store`), la lista
filtrada entera en su orden con rúbrica, estado, cifras, la ficha pública, Instagram y la primera línea de las notas; celdas que empiezan
como fórmula llevan apóstrofo; con BOM para Excel. Sin PDF todavía.

**`/admin/showcase/[artista]` (Ficha).** La cabecera de la ficha de una persona (foto grande, nombre, «Música · San Luis Potosí · ficha
reclamada»); Estado con quién y cuándo y su hoja (cada estado con lo que quiere decir y la última vez que lo tuvo); Rúbrica «n de 8» con una
tarjeta por señal: el resumen que sale solo (circulación de la base con las fechas fuera de su ciudad, actividad de la última lectura, vínculo
de la ficha, obra de lo aceptado), el puntaje a la derecha (tocar la señal abre la hoja 0, 1, 2 con la línea de la rúbrica de cada uno y «Sin
puntuar»), sus evidencias enlazadas (tipo, fuente, fecha, aceptada o rechazada —tachada—, «la leyó una persona / la rutina») y «Añadir
evidencia» (hoja: tipo ya elegido por la señal, qué es, enlace obligatorio, fecha y fuente; el botón dice qué falta; un enlace que no es
http(s) se marca en su campo y no llega al servidor, que lo vuelve a validar, y la base también); «Por revisar» con las propuestas de la
rutina en la tarjeta de «Pendiente» (Rechazar · Aceptar y la línea de lo hecho con «Deshacer»); «En la base · 2026» (el total del año con
cuántos por venir y el último, y un renglón por foro y por festival con su enlace); Redes (la última lectura de cada red con «leída hace N
días», «Añadir lectura» e «Importar CSV» con `artista_slug, red, seguidores, publicaciones, ultima_publicacion, leido_en`, que dice cada fila
que no entra con su línea); Notas privadas (campo con ✕ que se guarda al salir) y la ⓘ (`ui/Ayuda`) que abierta sin señalar nada dice la
rúbrica en tres líneas y explica cada parte; «Más en el manual ›» lleva a `/admin/showcase/manual` (la rúbrica entera y las tres reglas de
gobierno). **Sin «Investigar»**: llega con la rutina (OL-428); no hay nada apagado ni «pronto».

**Portada de Administración.** `GrupoShowcase.tsx`: el grupo «Showcase» con el destello y «686 candidatos · 7 invitados», debajo de Grafo
cultural (dos líneas en `src/app/admin/page.tsx`: un import y `<GrupoShowcase />` antes de `</main>`; el grupo de Ciudades de OL-427 va en la
misma zona y el choque se resuelve poniéndolo antes).

**Piezas compartidas que se tocan (mínimo):** `ui/Ayuda` gana `inicial` (la entrada que enseña antes de señalar nada; el grafo no cambia);
`ui/Buscador.module.css`: el campo llena el alto de su caja y la ✕ mide 44 de ancho; `admin.module.css`: el buscador de las listas del panel
dibuja su borde por dentro (como Buscar) para que el campo mida 44 y se toque entero (se ve igual). Lo pedía `npm run medir`.

**Gobierno (vulnerabilidades del §4.4 que esta pieza cierra):** enlace obligatorio en toda evidencia (pantalla, servidor y base); notas y
puntajes solo para administración (RLS; la API del CSV responde 404 a cualquier otro); quién y cuándo en cada cambio de estado (disparador y
registro); nada en rutas públicas ni en el sitemap (`noindex` en las páginas y en el CSV, ninguna ficha pública lee estas tablas).

## Decisiones que tomé (por confirmar)

1. **La evidencia que añade una persona nace aceptada** (la leyó ella); la de la rutina nace propuesta (el valor por omisión de la base).
2. **«N candidatos» es todo artista visible**, implícitos incluidos (el prototipo decía 29; el encargo pide la lista entera).
3. **«Este año» es el año de la ciudad** (del 1 de enero), como «En la base · 2026» del prototipo; la otra opción, doce meses móviles.
4. **La red de la tarjeta es la de más seguidores** entre las últimas lecturas de cada red, y la píldora de actividad sale de ella.
5. **«Sin publicar en 45 días»** para la píldora gris (el encargo dice «inactivo»; el prototipo, «sin publicar en 30 días»).
6. **La tabla no es la vista por omisión en escritorio**: se elige con «Vista» (el servidor no sabe el ancho; pintar las dos doblaría los nodos).
7. **La cuarta tabla** (`showcase_cambios_estado`) y las dos columnas de decisión de las evidencias.
8. **La ⓘ se aparta con el teclado abierto** (escribiendo las notas): no es una acción del campo y taparía lo que se escribe.
9. ¿La base pone sola la circulación y el vínculo? Hoy el resumen de cada señal lo dice, pero el puntaje sigue siendo a mano («rúbrica a mano»).
10. Las propuestas de evidencias todavía no suben a «Pendiente» de la portada: solo las trae la rutina (OL-428).

## Diferencias con el prototipo y por qué

- Sin «Investigar» ni «Volver a leer» (la rutina, OL-428) ni el renglón «Corridas» (OL-427): fuera del encargo.
- Las propuestas no traen la cita leída (no hay columna para ella; la decidirá la rutina) y su único enlace es el título: con el de la fuente
  debajo, los dos se pisaban el toque (`npm run medir`).
- «Vista» abre una hoja (Tarjetas · Tabla) en vez de cambiar de un toque: los tres chips de contexto abren su hoja, como pinta el prototipo con
  su flecha, y así el lector de pantalla no anuncia un diálogo que no llega.
- Cada señal termina con «Añadir evidencia»: la hoja ya trae el tipo que va con esa señal.
- El resumen de cada señal se arma con la base y con lo aceptado (en el prototipo era un texto escrito).
- En la tabla el nombre largo parte su renglón para que las trece columnas quepan a 1280.
- La portada no lleva la marca «nuevo» del prototipo.

## Verificación (árbol sin `.env`)

- `npm run lint`: sin errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck`: limpio.
- `npm test`: 233 archivos, 4 079 pruebas (nuevas: `src/lib/showcase.test.ts` 21 —suma, actividad, orden, filtros, vista en la URL, enlaces de
  evidencia, CSV de redes y CSV del consejo—; `src/app/api/showcase/csv/route.test.ts` 4; `src/app/admin/showcase/acciones.test.ts` 8).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 100 migraciones aplicadas, 2 081 pruebas, 0 fallos (el banco nuevo
  incluido).
- Componentes (Chrome real, 390×844): `Candidatos.componentes.test.mjs` 6 (lista, buscar con su ✕ sin apilar historial, chips, hoja Estado,
  hoja Orden, tabla) y `[artista]/Ficha.componentes.test.mjs` 7 (cambiar estado, fallo dicho en la hoja, puntaje, evidencia con enlace inválido
  rechazado y una buena, aceptar y deshacer, redes con CSV, notas); y las de `ui/Hoja`, `Ciudad` y Buscar (por el cambio de `ui/Buscador`): 55 de 55.
- `npm run inventario`: sin novedades (ninguna medida en duro nueva, ningún bloque repetido).
- `npm run medir`: 45 pantallas × 4 anchos sin fallos; nuevas `s32-admin-showcase` (261 nodos a 390), `s33-admin-showcase-tabla` (204),
  `s34-admin-showcase-ficha` (181) y `s35-admin-showcase-manual` (74), con la cuenta de administración del respaldo; presupuestos anotados con
  `--aceptar` (solo esos cuatro cambian en `medidas.aceptadas.json`). Con `--letra=2 --solo=showcase`: sin novedades.
- `CLAUDE.md` no cambió con `next build`.

## Capturas (`docs/rediseno/capturas-459/`, Chrome real contra el respaldo, 390×844 a 2×; la 12, 1280×800)

Comparadas con las 05 a 14 del prototipo (bitácora 458): mismas piezas, mismo orden y mismos colores.

- `00-portada-grupo-showcase.png`: Gestionar, Obras colectivas, Grafo cultural y, debajo, «Showcase» con el destello y «7 candidatos · 2 invitados».
- `01-candidatos.png`: buscador, chips Todas 7 · Música 5 · Teatro 1 · Artes visuales 1, Estado · Orden · Vista, la línea de cifras y la tarjeta de
  Feleal (Invitado, 4 eventos · 3 foros · 1 festival, 3,2 mil seguidores, «Publica cada semana», 2 · 1 · 2 · 1 = 6 de 8, la nota y «Programado por»).
- `02-candidatos-buscando.png`: «fel» con su ✕, «1 de 7 candidatos», la tarjeta de Feleal y «Exportar para el consejo (CSV)».
- `03-hoja-orden.png`: «Ordenar por» con Puntaje elegido y el detalle de cada orden.
- `04-hoja-estado-lista.png`: «Ver por estado» con sus cuentas (y el chip «Orden: Nombre» ya elegido, en violeta).
- `05-ficha-arriba.png`: la cabecera de Feleal («ficha reclamada»), Estado «Invitado · Por ti el 18 oct · antes, revisado el 15 oct», Rúbrica 6 de
  8 con Circulación (2) y su evidencia, y el comienzo de Obra.
- `06-hoja-estado.png`: los cinco estados con lo que quieren decir y «por ti el 15 oct» / «el 18 oct».
- `07-ficha-rubrica.png`: Circulación, Obra y Actividad con sus evidencias (una rechazada, tachada) y «Añadir evidencia» en cada una.
- `08-ficha-por-revisar.png`: «Por revisar 2» con el premio y la nota de prensa propuestos por la rutina, y «En la base · 2026».
- `09-ficha-redes-y-notas.png`: Instagram y YouTube «leída hace 4 días», «Añadir lectura», «Importar CSV» y las notas privadas con su ✕.
- `10-ayuda-rubrica.png`: la ⓘ abierta: «Rúbrica» en tres líneas y «Más en el manual ›».
- `11-evidencia-enlace-invalido.png`: «Añadir evidencia · Obra y reconocimiento» con «ftp://…» marcado: «El enlace tiene que empezar con http:// o https://.»
- `12-tabla-escritorio-1280.png`: la tabla con la barra y el carril de la app; las trece columnas caben y «Total» va en violeta.

Herramienta: `scripts/ops/auditoria-ui/capturar-showcase.mjs` (README de la auditoría al día). Datos del respaldo: `respaldo-local/fixture.mjs`
(tablas del showcase con datos inventados y dominios `.example`; ninguna otra pantalla medida cambia).

## Lo que no se hizo

- La rutina «Investigar» con la API y su bandeja (OL-428), las corridas y el crédito (OL-427), el PDF para el consejo y la autopostulación.
- Que la base proponga sola el puntaje de circulación y de vínculo (queda como pregunta, punto 9).

- Al unir con OL-427 (Ciudades, que ya usaba s32 a s35) las cuatro pantallas del showcase pasaron a `s36-admin-showcase`, `s37-admin-showcase-tabla`, `s38-admin-showcase-ficha` y `s39-admin-showcase-manual` en `pantallas-sesion.json` y `medidas.aceptadas.json` (resolución del gestor, 2026-10-20).
