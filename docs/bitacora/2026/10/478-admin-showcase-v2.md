# 478 · Showcase v2 en código: «Por aprobar», indicador, chevrones, hoja de filtros, grupos guardados y seleccionar para investigar (OL-446)

**Fecha:** 2026-10-22. **Rama:** `admin-showcase-v2`, base `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Migración:** `supabase/migrations/20261022140000_showcase_grupos.sql` (solo añade), con su banco. Sin variables de entorno nuevas.
**Estado:** lista para la revisión del gestor.

## El encargo

Lo firmado hoy por el founder en OL-443 (prototipo `showcase-v2.html`, bitácora 475, PR #563) con las siete respuestas del gestor: Disciplina se
queda además como fila de chips a la vista (1); Origen solo CAPO / no CAPO (2); grupos solo como filtros con nombre (3); sin «Aceptar todas»
global (4); rechazar pide motivo (5); aceptar una señal fijada a mano no la cambia y lo dice (6); los chips en 0 se esconden (7).

**Cambio del founder a media pieza, textual:** «Solo quita CAPO, ya no es nuestra referencia. Nuestro catálogo ya es mucho más grande.» Se quitó el
filtro «Origen» de la hoja y de «Más filtros», sin sustituirlo. Busqué menciones de CAPO como referencia en el Showcase (`src/app/admin/showcase`,
`src/lib/showcase*.ts`, `src/app/api/showcase`): no hay ninguna en pantalla. Quedan fuera de esta pieza la rutina de artistas
(`src/lib/rutinas/artistas.ts`, de OL-444, que siembra el catálogo CAPO de San Luis como fuente ya importada) y la tarjeta «CAPO» de la portada de
Administración (`CapoComoVa`, que no es del Showcase); si el founder quiere quitarlas también, es otra pieza.

## Lo que se hizo

- **«Por aprobar»** (`/admin/showcase/por-aprobar`, `por-aprobar/page.tsx` y `Hallazgos.tsx`): todas las evidencias `propuesta` agrupadas por
  artista, del que más puntaje tiene al que menos (el orden se toma al abrir y no cambia mientras se trabaja). Cada grupo: el renglón del artista
  (foto, disciplina, estado, «7 de 8 · con todo, 8», cuántas le quedan y el chevron derecho a su ficha) y sus hallazgos con «Si la aceptas: Obra
  1 → 2 · total 7 → 8» en verde, o «No cambia el puntaje: Circulación está fijada a mano en 2», «… Obra ya está en 1» o «… Circulación se cuenta
  con sus eventos en la base». Primero los que suben. Aceptar · Rechazar · Deshacer ahí mismo; «Aceptar las N de <artista>» bajo cada grupo con
  dos o más; no hay «Aceptar todas». **Rechazar abre una hoja con el motivo** (Duplicado · No es esta persona · No es relevante · Otro). La
  cuenta de arriba, el puntaje de cada renglón y «con todo» se rehacen en el teléfono con la misma regla al decidir. Vacío: «Nada por aprobar» y
  la salida «Investigar desde la lista ›». Se llega desde el renglón de la lista, el indicador de cada tarjeta (baja al artista, `#a-<id>`) y
  «Pendiente» de la portada.
- **La regla de lo que cambia** (`src/lib/showcasePorAprobar.ts`): la de OL-437. Solo la obra sale de evidencias aceptadas, así que se recalcula
  con `propuestaObra` y lo aceptado; circulación, actividad y vínculo salen de la base y aceptar no los mueve (se dice por qué). Lo fijado a mano
  manda y aceptar no lo suelta (respuesta 6).
- **Indicador** en la tarjeta: la línea violeta de lo que hay por revisar es ahora un enlace a todo lo ancho (44 de alto) con su chevron derecho.
  En la ficha, el aviso «2 por revisar ⌄» bajo el nombre baja hasta «Por revisar» (sin navegar ni apilar historial; el título recibe el foco).
- **Chevrones con una regla**: derecho entra a otra pantalla (el nombre de la ficha, ahora en violeta, abre la ficha pública; los renglones de
  Por aprobar); abajo abre una hoja o baja en la misma pantalla («Invitado»/estado, «Investigar» en la lista y en la ficha, «2 por revisar», «Más
  filtros»).
- **Filtros en una sola hoja** (`FiltrosShowcase.tsx` sobre `ui/HojaFiltros`; lógica pura en `src/lib/showcaseFiltros.ts`): «Tus grupos»; a la
  vista Puntaje (3, 4, 5, 6 o más), Actividad en redes (15, 30, 90 días; sin publicar en 90), Cuenta en la app, Circulación este año (con
  eventos, 2 o 4 foros, con festival) y Disciplina; en «Más filtros» Estado, Investigación (sin investigar, hace más de 30 días, en 30 días, con
  evidencias por revisar) y Solista o grupo (grupo cuenta grupo y colectivo). Cada chip dice cuántos quedarían con lo demás puesto; los de 0 se
  esconden salvo el que está puesto. Lo elegido es un borrador: «Ver N artistas» lo pone en la URL; la ✕ no aplica nada. **Disciplina se queda
  además como fila a la vista** y Estado entra a la hoja. Arriba, Filtros (con cuántos hay puestos) · Orden · Vista.
- **Lo puesto** en su fila con su ✕ (Disciplina no se repite: tiene su fila) y «Guardar como grupo»; quitar no apila historial. La línea de
  cifras: «7 de 692 artistas · 5 pasan al consejo con 5 de 8» (sin filtro, «692 artistas · …»: dice «artistas» en vez de «candidatos», como el
  prototipo). Los filtros viven en la URL (`puntaje`, `actividad`, `cuenta`, `circ`, `disciplina`, `estado`, `inv`, `tipo`), así que la memoria de
  pantalla al volver de una ficha sigue igual. El CSV para el consejo usa los mismos filtros.
- **Grupos** = filtros con nombre (`showcase_grupos`): el sistema propone el nombre («Música con cuenta, 4+») en un campo con su ✕; sin nombre el
  botón dice «Falta el nombre». Guardado, un solo chip con su nombre y «Editar grupo», que abre su hoja: cambiar el nombre o «Borrar el grupo»
  (los filtros siguen puestos). Quien cumpla el filtro después entra solo.
- **Seleccionar** (`ListaSeleccionable.tsx`, `TarjetaCandidato.tsx`): «Seleccionar» en la línea de cifras; la casilla «Seleccionar a los N (los N
  filtrados)» (`ui/Casilla`); la casilla de cada tarjeta sobre su foto, y tocar la tarjeta también marca (no navega); elegida, en el violeta
  suave; al pie, una barra fija con «Cancelar» y un solo violeta: «Elige a quién investigar», «Investigar a 5 · hasta 5,00 USD» o «Son 75: elige
  hasta 60». Abre la hoja de Investigar de OL-439 (`HojaLote`, ahora exportada) con «Los 5 que elegiste» y sus nombres; al mandarlos la lista
  sale de Seleccionar. Lo elegido vive en la pantalla, no en la URL.
- **Portada de Administración**: «Evidencias del showcase · 5 por aprobar · de 2 artistas, investigados hoy» primero en «Pendiente», con su
  cuenta (que suma a la de Pendiente) y a «Por aprobar». `Pendientes.tsx` lleva ese renglón a su `href`; los de Ciudades siguen a su bandeja.
- **De paso, para toda la app**: las filas de chips que envuelven llevan 12 entre filas (`Chip.module.css`, `.envuelve { row-gap }`). Con 8 los
  toques de 44 de dos renglones se tocaban; medido en la hoja Filtros del respaldo: 12 px entre filas con chips de 36. La prueba de `ui/Chip`
  pasa de «un renglón cada 44» a «cada 48».

## Lo que toca de otras piezas

- **Las acciones de aceptar/rechazar no cambian** (`acciones.ts`, de OL-445): `accionesPorAprobar.ts` (nuevo) llama a `decidirEvidencia` tal
  cual para aceptar, rechazar y deshacer. Lo nuevo es aparte: `rechazarConMotivo` llama a `decidirEvidencia(…, "rechazada")` y después guarda
  `motivo_rechazo`; `aceptarVarias` la llama una por una. Si OL-445 cambia lo que hace aceptar (por ejemplo, ligar eventos), lo hereda sin tocar
  nada aquí. Ojo: si OL-445 hace que aceptar una evidencia de circulación mueva el puntaje, la frase «Circulación se cuenta con sus eventos en la
  base» dejaría de ser cierta y habría que ajustar `efectoAlAceptar`.
- Ningún archivo de OL-444 (`src/lib/rutinas/*`, `src/app/api/rutinas/*`, `src/app/admin/ciudades/*`).
- `consultas.ts` del Showcase: el artista trae `tipo`; las investigaciones traen `terminadas` (la última terminada de cada artista, de siempre,
  para el filtro «Investigación»); `cargarPorAprobar`, `cargarResumenPorAprobar` y `cargarGrupos`, nuevas.

## La migración `20261022140000_showcase_grupos.sql` (solo añade)

- `showcase_grupos (id, nombre 1–80 letras, filtros jsonb objeto de hasta 2 000 bytes, creado_por, creado_en)`: solo administración
  (`es_admin()`), anon sin permiso; autor y hora los pone un disparador.
- `showcase_evidencias.motivo_rechazo` con su `check` (`duplicado`, `no_es_esta_persona`, `no_relevante`, `otro`) y otro `check` que solo lo
  admite en una rechazada; un disparador lo borra cuando deja de estarlo (Deshacer y aceptar la limpian solos).
- Banco `supabase/tests/pg/showcase-grupos.test.mjs` (21 comprobaciones): anon, una cuenta cualquiera y la administración; límites del nombre y
  de los filtros; el motivo solo en rechazadas, se borra al deshacer y al aceptar, rechazar con motivo en una escritura; el disparador no se llama
  desde fuera. Al final borra lo suyo (los bancos comparten la base).

## Decisiones por confirmar (frases cortas)

1. La lista dice «artistas» en lugar de «candidatos» en la línea de cifras (como el prototipo firmado).
2. Disciplina no sale en la fila de lo puesto: ya se ve en su propia fila.
3. «Otro» como motivo no pide texto: se elige y ya.
4. La hoja Filtros es un borrador (como la de Artistas de la app): nada cambia hasta «Ver N artistas».
5. Seleccionar no se ofrece en la vista de tabla.
6. El renglón «Por aprobar» de la lista dice «las trajo la rutina hoy/ayer» solo si alguna investigación de esos artistas terminó en los últimos
   90 días (lo que lee la lista); si no, lo omite.
7. La foto del renglón del artista en Por aprobar mide 40 (la columna del icono más su aire), como el prototipo; no hay token propio.

## Evidencia

- `npm run lint` (0 errores; el aviso que queda es de `VisorImagen.componentes.test.mjs`, ajeno) · `npm run typecheck` · `npm test`: **270
  archivos, 4 530 pruebas**, todas bien (nuevas: `showcaseFiltros.test.ts` 9 y `showcasePorAprobar.test.ts` 8; `showcase.test.ts` al día).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **105 migraciones, 2 262 pruebas, 0 fallaron**.
- `npm run inventario`: sin novedades.
- `npm run medir`: 53 pantallas × 4 anchos sin desbordes, toques de menos de 44 ni accionables tapados. Presupuestos nuevos, solo del Showcase
  (`--aceptar`, diff revisado): s36 lista 294 → 310, s37 tabla 240 → 250, s38 ficha 194 → 202 (el aviso y la línea de lo que cambia), s40 Por
  aprobar nueva con 74; profundidad igual (8, 9, 8, 8).
- `npm run test:componentes` (Chrome): **706 pruebas, 704 bien**. Falla `Chip` hasta actualizarla (la de 44 → 48, ya hecha y en verde) y la de
  OL-365 del alta de eventos («Ver el evento» → `net::ERR_HTTP_RESPONSE_CODE_FAILURE`), que ya fallaba antes de esta rama (bitácora 470) y no
  carga nada de este diff. Nuevas o al día, con toques reales por coordenadas: la lista (17: la hoja Filtros con sus cuentas, los chips en 0
  escondidos, «Más filtros», aplicar sin apilar historial, quitar con la ✕; guardar, renombrar y borrar un grupo; seleccionar por casilla y por
  tarjeta, «Seleccionar a los 5», la barra, la hoja con «Los 5 que elegiste» y mandar; el indicador y el renglón «Por aprobar»); la ficha (15:
  lo que cambia al aceptar y el orden, aceptar y deshacer, rechazar con motivo y cerrar sin rechazar, «Aceptar las 2», el aviso que baja sin
  navegar); Por aprobar (3, nueva: los renglones con «con todo», aceptar sube a 8 de 8 y baja las cuentas, deshacer, «Aceptar las 2 de Itzel
  Mora», rechazar con motivo).
- Recorrido sobre la app compilada contra el respaldo local (`scripts/ops/auditoria-ui/capturar-admin-showcase-v2.mjs`): todas las
  comprobaciones bien y sin errores de página ni de consola. El respaldo suma tres hallazgos de Abril Merlot y un grupo guardado.

## Capturas (`docs/rediseno/capturas-478/`, abiertas una por una y comparadas con capturas-475)

- `01-lista.png`: Filtros · Orden · Vista, la fila de disciplinas, «7 artistas · 2 invitados · 1 confirmado · 2 pasan al consejo» con
  «Seleccionar», «Por aprobar 5 ›» antes de «Investigar ⌄» y Feleal con «2 evidencias por revisar ›». Como 01-A de 475 más la fila de
  disciplinas (respuesta 1).
- `02-lista-indicador.png`: el indicador de Feleal tocable, con su chevron (y 0Backside0 sin indicador).
- `03-hoja-filtros.png`: Tus grupos (Música con cuenta, 4+ 1), Puntaje, Actividad, Cuenta y Circulación con sus cuentas; 12 entre filas. Como 03-B.
- `04-hoja-filtros-elegidos.png`: con «4 o más» y Música; Disciplina deja solo «Todas 2 · Música 2» (los de 0, escondidos).
- `05-hoja-mas-filtros.png`: «Más filtros» abierto (chevron arriba): Estado, Investigación y Solista o grupo; **sin Origen**. «Ver 2 artistas».
- `06-lista-filtrada.png`: Filtros 2 en violeta, Música en su fila, «4 puntos o más ✕» y «Guardar como grupo»; «2 de 7 artistas · 2 pasan al
  consejo con 5 de 8». Como 07-C.
- `07-guardar-grupo.png`: el resumen «4 puntos o más · Música · Hoy, 2 artistas» y el nombre propuesto «Música, 4+» con su ✕. Como 08-C.
- `08-grupo-puesto.png`: un solo chip «Música con cuenta, 4+ ✕» y «Editar grupo». Como 09-C/02-A.
- `09-editar-grupo.png`: la hoja del grupo: el nombre con su ✕, «Borrar el grupo» y «Guardar el nombre».
- `10-seleccionar.png`: «Seleccionar a los 7 · 2 elegidos», Feleal elegida en el violeta suave con su casilla, y la barra «Cancelar · Investigar
  a 2 · hasta 2,00 USD» dentro de los márgenes. Como 11-D.
- `11-hoja-investigar-elegidos.png`: «Investigar a 2», «Los 2 que elegiste · Feleal, 0Backside0», el tope con su ✕ y el total. Como 13-D (sin
  crédito: el respaldo no lo tiene).
- `12-por-aprobar.png`: «5 evidencias de 2 artistas · las trajo la rutina hoy», Feleal «7 de 8 · con todo, 8 · 2 ›», la mención en verde y la
  nota «No cambia…», «Aceptar las 2 de Feleal». Como 15-E.
- `13-por-aprobar-aceptada.png`: Feleal «8 de 8 · 1 ›», «Aceptaste … · Obra 1 → 2» con Deshacer; Abril Merlot «3 de 8 · con todo, 5». Como 17-E.
- `14-hoja-motivo.png`: «¿Por qué la rechazas?» con los cuatro motivos (nuevo: respuesta 5).
- `15-portada-pendiente.png`: Pendiente 25 con «Evidencias del showcase · 5 por aprobar · de 2 artistas, investigados hoy · 5 ›» primero. Como 20-F.
- `16-ficha.png`: «Feleal ›» en violeta, «2 por revisar ⌄», Invitado con el chevron abajo. Como 21-G.
- `17-ficha-por-revisar.png`: Por revisar 2 con lo que cambia y «Aceptar las 2». Como 23-G.
- `18-lista-filtrada-1280.png`, `19-por-aprobar-1280.png`, `20-ficha-1280.png`: lo mismo en la columna de 600 de Administración.

## Archivos

- Nuevos: `src/lib/showcaseFiltros.ts` (+ prueba), `src/lib/showcasePorAprobar.ts` (+ prueba), `src/app/admin/showcase/{FiltrosShowcase,
  Hallazgos,ListaSeleccionable,TarjetaCandidato}.tsx`, `accionesGrupos.ts`, `accionesPorAprobar.ts`, `por-aprobar/page.tsx` (+ prueba de
  componentes), `[artista]/AvisoPorRevisar.tsx`, la migración y su banco, `scripts/ops/auditoria-ui/capturar-admin-showcase-v2.mjs`.
- Cambian: `src/lib/showcase.ts` (la vista con los filtros, los datos del candidato para filtrar, la línea de cifras, `RUTA_POR_APROBAR`),
  `VistaCandidatos.tsx`, `OpcionesLista.tsx`, `InvestigarLote.tsx`, `consultas.ts`, `page.tsx` de la lista y de la ficha, `EstadoFicha.tsx` e
  `InvestigarFicha.tsx` (chevron abajo), `showcase.module.css`, `src/app/api/showcase/csv/route.ts`, `src/app/admin/page.tsx`,
  `src/app/admin/Pendientes.tsx`, `src/components/ui/Chip.module.css` (+ su prueba), el respaldo local, `pantallas-sesion.json` y
  `medidas.aceptadas.json`.
- Se borra `[artista]/PorRevisar.tsx` (lo sustituye `Hallazgos` en modo ficha).

## Lo que quedó fuera

- Mantener presionado para editar un grupo desde la hoja Filtros: se edita desde «Editar grupo» con el grupo puesto.
- «Guardar los 5 como grupo» (lista fija): fuera por la respuesta 3.
- Aprender de los motivos de rechazo en la rutina: el motivo se guarda; usarlo es otra pieza.

Sin council, workflows ni subagentes.
