# 444 · Festival en una sola ficha, la lectura que no parte un evento, el lugar por su dirección y «¿Qué es?» (OL-413)

**Fecha:** 2026-10-18. **Rama:** `festival-una-ficha`, base `origin/main` (`ef431fdd`). **Operador:** agente de la pieza, sin otros agentes.
**Migración que solo añade, sin aplicar:** `supabase/migrations/20261018120000_festival_sin_programa.sql` (la aplica el gestor antes de unir).
Sin variables de entorno de la app nuevas. **Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido (founder, 18 de octubre)

Subió dos carteles al alta con lectura automática y la lectura dijo «varios eventos» en los dos, con la sede de cada acto por confirmar, cuatro
veces:

- **Cumbiachella, festival cumbiero potosino:** 30/10, 8 pm–2 am, logos de Lunaria (foro expandido) y Roma Lab, con Sonido Satanás, Juan
  Escumbia, Sonido Blasfemo y Vinyl Box. Un solo día, un solo lugar.
- **Trayectos Interactivos 17.10.26:** «Concierto | Cortometraje | Exposición | Charla | Cócteles», «Disonáuta | El Ermitaño | Las brujas de la
  Cañada | Charlemos | Sorpresas», «7 p.m. · 5 de mayo 1100 · Centro Histórico San Luis Potosí». En el directorio ya estaba el Laboratorio Centro
  Histórico en «C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico».

Sus palabras: «es un solo evento con varias presentaciones», «si fuera el caso, pide entrar 4 lugares para cada evento, creo que el sistema
debería preguntar dónde es si no puede leer en el cartel la dirección. Y anotarla 4 veces no facilita el trabajo», «cumbiachella dice que es
festival, es el mismo día y es en el mismo lugar. Aquí el problema es que detecte cuatro eventos cuando solo es uno… Si festival implica llenar 4
fichas por separado de manera forzosa aunque todo pase en el mismo lugar, entonces sí debemos cambiar la definición de festival», «en el caso de
Trayectos Interactivos… la dirección es la del Laboratorio del centro histórico, así que deberíamos sugerir ese [lugar] en la ubicación», «si hay
dudas el sistema podría preguntar al usuario si es festival, galería, o evento, solo cuando el sistema no lo pueda resolver o no sea claro». Y
sobre la definición que le propuso el gestor: **«Adelante con la definición»**.

Las causas que encontró el gestor: `formaLeida` (`cartelPorPasos.ts`) hacía festival todo cartel con dos o más actos; la descripción del esquema
de lectura dejaba que una alineación de una noche se leyera como programa; cada acto llevaba su sede y `faltan` pedía todas; y el lugar se
cruzaba solo por nombre.

## La definición aprobada (aplicada tal cual)

- **Festival = un nombre que reúne varias presentaciones. El programa (actos como fichas separadas) es OPCIONAL.**
- **Un día y un lugar** (Cumbiachella): UNA ficha de clase festival, con su día, su horario (8 p.m.–2 a.m.), su lugar y la alineación en «Quién».
  Conserva lo de festival (cabecera oscura, portada del sistema, la etiqueta «Festival»). Sin actos.
- **Varios días o varias sedes:** festival con programa, como antes, pero los actos **heredan el lugar del festival**, que se pregunta **una sola
  vez**; la sede de cada acto se pide solo si el cartel da sedes distintas, y siempre se puede cambiar una por una.
- **Una noche con varias actividades que no se presenta como festival** (Trayectos Interactivos): **un evento**; las actividades a la
  descripción y quienes se presentan a «Quién».

## Supuestos (decididos por lo más fiel a la definición; dímelo si no)

1. **Trayectos Interactivos es un evento.** El founder no lo dijo en palabras; es lo propuesto y lo coherente con la definición (no se anuncia
   como festival).
2. **«¿Qué es?» tiene cuatro opciones: Evento · Festival · Exposición · Taller o curso.** El founder dijo «festival, galería o evento»; la galería
   es la exposición y el taller se incluye porque es una clase que existe.
3. **Un festival sin programa lleva «Voy»** (no solo «Me interesa»): «Me interesa» en el festival era porque el marco no se vive un día concreto
   (doc 55 §5, punto 2); uno sin programa pasa un día a una hora, como un evento.
4. **«Sin programa» se lista como evento hasta 31 días.** Un festival sin ningún acto publicado de hasta 31 días (los del horario por día) va como
   evento en todas las listas. Uno más largo sin actos (en el respaldo, KOWAIFEST: dos meses) sigue como marco con «Programa por confirmar»: es
   un festival grande anunciado sin programa todavía, no una noche. Un festival cuyos actos están todos ocultos o en borrador cuenta como sin
   programa para quien mira (no tiene actos publicados).
5. **Los nombres de los actos de una noche juntada** van a «Quién» solo si el lector no nombró a nadie aparte; si nombró a alguien, el lector ya
   distinguió quién se presenta y lo demás (en el cartel, «Charlemos», «Sorpresas») va a la descripción con las actividades. Así «Quién» no crea
   artistas que no lo son.

## Lo que se ve ahora

- **Cumbiachella** se lee como un festival de una noche: «¿Cuánto cuesta?» (lo único que el cartel no dice) y «Revisa» con «Festival», «vie 30
  de oct · 20:00 → sáb 31 de oct · 02:00», «Foro lunaria», «Por confirmar», la alineación en «Quién», «Programa · Agregar» (punteado, opcional) y
  el botón «Publicar festival». Nada de sedes por acto.
- **Trayectos Interactivos** se lee como un evento y, como el cartel solo trae la dirección, al llegar a «Dónde» la pantalla de siempre del lugar
  del directorio pregunta **«¿Es en Laboratorio Centro Histórico?»** (su nombre, «C. 5 de Mayo 1100… · lugar del directorio», «Sí, es aquí» y
  «Buscar otro»). Confirmado, sigue «¿Cuánto cuesta?».
- **«¿Qué es?»** sale solo si la lectura no resolvió la clase: cuatro opciones grandes con su frase, sin preselección; tocar una sigue con su paso
  del tiempo. Con la lectura de antes de Trayectos («festival» con cinco actos a la misma hora y nada que lo anuncie como festival) se pregunta.
- **Un festival de varios días** leído del cartel: «El cartel trae 3 eventos», cada acto con «Sede del festival»; «Revisar el festival» pregunta
  «¿Dónde es?» **una vez** y «Revisa» dice «Teatro de la Paz · Sede del festival».
- **El festival sin programa en las listas:** su renglón en su día con su hora (y «Voy») en Agenda y en la ficha de su lugar; en Inicio, en
  «Festivales y expos» con «mañana · 20:00» y su lugar (no en «Esta semana»: un festival, solo en su carril, OL-347); su ficha con la cabecera
  oscura «FESTIVAL», «sáb 17 de oct · 20:00 · Foro lunaria» bajo el título y «20:00 · Costo · Van» en la banda, sin «Programa» vacío, con «Voy».

## Qué cambió, por archivo

**La lectura y el alta**

- `src/lib/cartel.ts`: las descripciones del esquema `Lectura` y el mensaje de sistema. `clase`: festival solo si el cartel se presenta como
  festival, aunque sea de un día; una noche con varias actividades o artistas que no se anuncia como festival es «puntual». `artistas`: la
  alineación de una noche o de un festival de un día va aquí, sin actividades ni rellenos. `actos`: solo para un programa con días o sedes
  distintas. `lugar`/`direccion`: la dirección aunque no diga el nombre del lugar. `descripcion`: las actividades de la noche. Misma estructura:
  nada nuevo que leer en `cartelAFormulario`.
- `src/lib/actosLeidos.ts` (nuevo, puro): **la regla fija** `formaDeActos`: actos el mismo día (o de madrugada del siguiente: «8 pm–2 am») en la
  misma sede o sin sede → `junta` (con los nombres y las actividades aparte: «Concierto: Disonáuta» → actividad y nombre; «Sorpresas» →
  nada); el mismo título varios días seguidos en una sede → `temporada`; días o sedes distintas → `programa`. «Lunaria» y «Foro Lunaria» son
  la misma sede. `nombresParaQuien` (el servidor pasa los nombres de una noche a los artistas para cruzarlos con el directorio) y
  `descripcionDeNoche`.
- `src/lib/lugarDelCartel.ts` (nuevo, puro; ajuste tras la verificación real del gestor): `lugarPorNombre`, el cruce tolerante del nombre del
  lugar: si el nombre completo no cruza con ningún lugar, se prueba cada palabra distintiva (sin acentos ni mayúsculas, sin las genéricas —foro,
  espacio, centro, cultural, casa, galería, museo, teatro, café, bar, expandido, lab, sala, artículos…— y de 4 letras o más), y se acepta solo si
  entre todas dan un único lugar de la ciudad (uno de otra ciudad no cuenta). «Lunaria Foro Expandido» → «Foro lunaria»; «Roma Lab» con dos
  «Roma» → ninguno. El nombre completo manda como siempre (uno, ese; varios, ninguno). Pruebas en `src/lib/lugarDelCartel.test.ts` (6) y en
  `src/app/eventos/cupo.acciones.test.ts` (la acción con la búsqueda simulada).
- `src/lib/direccionCartel.ts` (nuevo, puro): `partirDireccion` (calle y número del primer tramo, sin acentos, sin «C.», «Calle», «Av.», «No.»,
  «#», código postal, ciudad ni país), `mismaDireccion` y `unicoConDireccion` (uno solo o ninguno).
- `src/app/eventos/acciones.ts`: `leerCartelAccion(url, ciudad)` busca el lugar por su dirección cuando el nombre no cruza (`lugarConDireccion`:
  una consulta a `lugares` visibles y públicos con ese número, de la ciudad si se sabe, y la comparación aquí; sin migración) y devuelve
  `sugerido`; pasa los nombres de una noche juntada a los artistas (`nombresParaQuien`). `crearEvento`: un festival **con** actos marcados va a
  `publicar_programa` como antes; **sin** ellos, a `publicarFestivalSinPrograma` (RPC nueva).
- `src/app/nuevo/evento/cartelPorPasos.ts`: `respuestasDelCartel` con la regla de `formaDeActos` (se quita «dos o más actos → festival»; la
  clase es la que dijo la lectura, salvo un programa de días o sedes distintas, que es un festival); una noche juntada da su día, la hora del
  cartel o la del primer acto, los nombres a «Quién» y las actividades a la descripción; la temporada da un evento de varios días con la hora de
  cada uno (`sesiones`, OL-311); el programa lleva la sede leída en el festival (o, si el cartel no dice una general, la que comparten todos sus
  actos) y los actos heredan (`sitio: null`) o, con sedes distintas, la suya. Sin clase leída, un programa de días o sedes distintas es un
  festival y no se pregunta. `claseSinResolver` (cuándo sale «¿Qué es?») y `sugeridoDelCartel` (el candidato de «¿Es en …?»).
- `src/app/nuevo/evento/pasos.ts`: paso nuevo `que` («¿Qué es?») y `Respuestas.claseDudosa` (elegir clase la quita); `Acto.sitio` puede ser
  null (la del festival); `conPrograma`, `sedeDeActo`, `pideDonde` (el «Dónde» se pregunta una vez: en un festival con programa, solo si algún acto
  no tiene sede propia); `faltan`: un festival sin programa pide día, hora y dónde como un evento; `actoListo` ya no pide la sede heredada.
  `Estado.sugerido` y la acción `sugerir`: al llegar a «Dónde» con un lugar propuesto se apilan «¿Dónde es?» y «¿Es en …?» (Atrás o «Buscar
  otro» vuelven a la búsqueda). `preguntaDe("mapa")` dice «¿Es en …?». `sesionesDe` también para un festival sin programa de varias noches.
  `eventoPublicado` lleva la clase y el programa del festival (su renglón en «Publicado» es el de un evento si no tiene actos).
- `src/app/nuevo/evento/PasosEvento.tsx`: `PasoQue`, con `ui/Opcion` como «¿Cuánto cuesta?»; `Preguntas.tsx` lo pinta.
- `src/app/nuevo/evento/PasosDonde.tsx`: «¿Es aquí?» con un lugar del directorio propuesto (`candidato.lugarId`): su nombre, «su dirección ·
  lugar del directorio», y confirmar lo usa; si se arrastra el pin deja de serlo.
- `src/app/nuevo/evento/PasosClase.tsx`: el programa sin «Falta una actividad» (sin actos es un festival sin programa); cada acto dice «Sede del
  festival» (o su nombre) si no tiene una propia; la actividad nueva hereda la sede; una agregada y dejada en blanco se quita al cerrar su hoja.
- `src/app/nuevo/evento/Revisa.tsx`: un festival sin programa con los renglones de un evento (cuándo, dónde) y «Programa · Agregar» (no al
  editar); con programa, su cuándo es el programa, el «Dónde» del festival («Sede del festival») si algún acto lo hereda y «Sedes» si alguno tiene
  la suya. Botón «Publicar festival» o «Publicar el festival y N eventos».
- `src/app/nuevo/evento/CamposEvento.tsx`: manda `actos` solo con programa, cada uno con su sede o la del festival. `clasePorPasos.ts`:
  `sedesDelPrograma` con la heredada, `conSedesPropias`, y el cuándo de un festival sin programa es el de un evento.
- `src/app/nuevo/evento/AltaEvento.tsx`, `useLeerCartel.ts`, `usePasosEvento.ts`, `EditarEvento.tsx`: la ciudad a la lectura, la propuesta del
  lugar y la pregunta «¿Es en …?». `Publicado.tsx`: sin programa, «¿Sus presentaciones tienen ficha propia?» con «Agregar programa».
- `src/app/nuevo/evento/alEditar.ts` y `src/app/eventos/[id]/editar/page.tsx`: un festival guardado sin actividades se edita como un evento (su
  día, su hora, su lugar) y nunca dice «Programa registrado: 0 actividades».
- `src/lib/eventos.ts`: la frase del festival en «¿Cómo ocurre?» y «¿Qué es?»: «Reúne varias presentaciones.»
- `supabase/migrations/20261018120000_festival_sin_programa.sql` (**solo añade**): `publicar_festival_sin_programa(p_datos, p_privado, p_quien,
  p_sesiones, p_operacion)`, con los permisos de quien llama: el alta de siempre (`guardar_evento_con_sesiones`) y la clase festival en la misma
  transacción; un reintento devuelve lo publicado. Hacía falta porque `guardar_evento_con_clase` rechaza un festival nuevo sin actos
  (`festival_por_programa`) y `publicar_programa` exige un acto (`programa_vacio`). Editarlo después funciona con lo de siempre. Prueba PG en
  `supabase/tests/pg/festival-sin-programa.test.mjs` (una noche de 8 pm a 2 am con su alineación y sin actos, el reintento, dos noches con su
  horario por día, editarlo como festival, sin sesión no).

**Las superficies (todo lo que asumía «festival ⇒ actos»)**

- `src/lib/claseEvento.ts`: `festivalComoEvento` (sin actos publicados y de hasta 31 días), `soloInteres(clase, comoEvento)` y
  `lineaDeFestivalSinPrograma` (la línea bajo el título: una noche que cruza la medianoche es un día).
- `src/lib/ocurrencias.ts`: un festival sin programa tiene ocurrencias (su día, o cada uno). `src/lib/agendaPorClase.ts`: `esMarcoConPrograma`;
  `sinPuntoEnCalendario` le da su punto en «Cuándo».
- `src/lib/eventosFicha.ts`: en las fichas de lugar y de artista, un festival de un día sin programa es un renglón en su día (OL-410 lo ponía como
  cabecera con «Programa por confirmar»).
- `src/lib/destacados.ts` y `src/lib/tarjetaInicio.ts`: su tarjeta dice su día y su hora, su lugar (sin «Programa por confirmar») y lleva «Voy»;
  su sello es el de un día. `src/components/RenglonEvento.tsx`, `EventosPorDia.tsx`, `AgendaInicio.tsx`: su renglón con su hora y su «Voy».
- `src/lib/inicio.ts`: «Esta semana» sin festivales (un festival, solo en «Festivales y expos», OL-347; antes bastaba con que el marco no tuviera
  ocurrencias). `src/lib/series.ts`: en «Nuevos» va suelto. `src/lib/ahora.ts`: entra en «Ahora».
- `src/lib/cargarSedes.ts`: `conLoDeSusActos` cuenta el programa de cada festival, así «Tus planes» y los recientes de Buscar saben si no tiene.
  (Buscar ya lo contaba.)
- `src/app/eventos/[id]/page.tsx`: la ficha de un festival sin programa: «cuándo · Costo · Van» en la banda, su día, su hora y su lugar bajo el
  título, sin la sección «Programa» (salvo borradores de su autor), con «Voy» y «Quién va», y «Agregar programa» en el menú de su autor.
- «Ya pasó» (`cargarHistorial`) ya contaba al festival como evento propio: sin cambios.

**El respaldo local y las pruebas**

- `scripts/ops/auditoria-ui/respaldo-local/server.mjs`: contesta la lectura del cartel en `/anthropic/v1/messages` con la que se le deja lista en
  `POST /__lectura` (`{ lectura, archivo }`), y simula Storage (la subida se anota; la URL pública sirve ese archivo). `fixture.mjs`:
  `publicar_festival_sin_programa`, `apartar_lectura_de_cartel` y, solo con `RESPALDO_CARTELES=1`, el Laboratorio Centro Histórico, Foro
  lunaria y «Noche cumbiera (demo)», un festival de una noche sin programa. `npm run medir` no pone ese entorno.
- `scripts/ops/auditoria-ui/capturar-cartel-leido.mjs` (nuevo): compila la app contra el respaldo, la arranca con `ANTHROPIC_BASE_URL` al
  respaldo y una llave inventada (así `lecturaDeCartelActiva()` es verdad y el SDK de verdad pide al respaldo, **sin llamar a la API**) y sube
  los carteles con el selector de archivo del alta. README al día.
- Unitarias nuevas: `src/lib/actosLeidos.test.ts` (12), `src/lib/direccionCartel.test.ts` (10: «5 de mayo 1100» contra «C. 5 de Mayo 1100,
  78339 San Luis Potosí, Mexico», la Casa de Cultura del 1225 no, dos iguales ninguno), `src/app/nuevo/evento/festivalUnaFicha.test.ts` (23: las
  lecturas que daría el modelo para los dos carteles, con el esquema nuevo y con el de antes; la regla de juntar; festival sin programa en
  `faltan`; la sede heredada una vez; «¿Es en …?»; cuándo sale «¿Qué es?»; editar uno guardado; la temporada), `src/lib/festivalSinPrograma.test.ts`
  (7: las listas). En `src/app/eventos/clase.acciones.test.ts`, la publicación con la RPC nueva. Actualizadas porque cambió la regla: las del
  festival de días cortos sin actos (`agendaPorClase`, `eventosFicha`, `page.test.ts`: ahora un festival de dos meses guarda el caso de antes y
  uno de una noche el nuevo), el orden de pasos del chip «Festival» (`clase.test.ts`) y «sin actos marcados» (`clase.test.ts`,
  `clase.acciones.test.ts`).
- Componentes: tres nuevas en `ClasesEvento.componentes.test.mjs` (Cumbiachella hasta «Publicar festival» sin `actos`; «Programa · Agregar» con la
  sede heredada; «¿Qué es?» con cuatro opciones sin preselección y la descripción de la noche), y dos al día (la frase del festival y el chip
  «Festival» que ahora pregunta el día).

## Evidencia

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (226 archivos, 4 005
  pruebas), `npm run inventario` (sin novedades), `npm run test:componentes` (618) y `npm run medir` (40 pantallas × 4 anchos, sin novedades) en
  verde, en un árbol sin `.env`.
- **Verificación real del gestor (18 de octubre, con la API y el esquema de esta rama, sobre los dos carteles):** Cumbiachella salió como festival,
  sin actos, con los cuatro artistas y de 20:00 a 02:00, pero con `lugar` «Lunaria Foro Expandido», que `lugares_con_nombre` no cruza en
  producción (con «Lunaria», sí): de ahí el cruce tolerante de `lib/lugarDelCartel`, que lo resuelve. Trayectos salió como evento puntual, sin
  actos y con la dirección «5 de mayo 1100, Centro Histórico» (el cruce por dirección lo resuelve), pero con `artistas` ["Disonáuta", "El
  Ermitaño", "Las brujas de la Cañada", "Charlemos"]: **límite de la lectura**, «Charlemos» es el nombre de la charla y no de alguien que se
  presenta; no se corrige a la fuerza (se quita a mano en «Quién», desde «Revisa»).
- `npm run test:db` contra un PostgreSQL 17 local temporal (un `initdb` en la carpeta de trabajo, solo 127.0.0.1, detenido al terminar): las 99
  migraciones con la nueva y 2 031 pruebas, 0 fallaron (con la matriz del Security Advisor).
- **Presupuestos de `medir` subidos (decisión del gestor):** la primera corrida falló en `02-agenda` (347 nodos; presupuesto 333),
  `s02-agenda-sesion` (354; 339) y `s14-agenda-nuevos` (209; 208). No es un envoltorio de más: el «Festival de Cine de Invierno» del respaldo
  tiene todos sus actos ocultos (borradores de Ana), así que para quien mira es un festival sin programa de un día y ahora sale como su renglón en
  la Agenda del viernes 16 (+14 nodos: un renglón) y suelto con su «Voy» en «Nuevos» (+1: el botón). Anoté esas tres cifras a mano en
  `medidas.aceptadas.json` (no con `--aceptar`, para no tocar las demás); la segunda corrida, sin novedades. Si prefieres que el respaldo no lo
  enseñe, basta con publicar uno de sus actos en el fixture.
- Capturas en `docs/rediseno/capturas-444/` (Chrome real con playwright-core, `channel: 'chrome'`, 390×844 a 2×, **sin comprimir**), contra el
  respaldo local con `RESPALDO_CARTELES=1`, la app compilada contra él, el reloj fijo el viernes 16 de octubre a las 10:00 y la lectura simulada
  en el respaldo (lo que devolvería el modelo con el esquema nuevo; para «¿Qué es?», la lectura de antes). La sesión es la de Ana. Cada una
  abierta y mirada:
  - `01-cumbiachella-cuanto.png`: tras leer Cumbiachella, lo único que falta: «¿Cuánto cuesta?» con Gratis, Cooperación, Tiene precio y «Dejar
    por confirmar» al pie. El título lleva el aro de foco del navegador de escritorio (el foco lo pone el paso; en el teléfono con el dedo no se
    ve).
  - `02-cumbiachella-revisa.png`: «Revisa» con la miniatura del cartel y «Leído del cartel»: «Festival · Cambiar», «vie 30 de oct · 20:00 → sáb
    31 de oct · 02:00», «Foro lunaria», «Por confirmar», «Sonido Satanás, Juan Escumbia, Sonido Blasfemo y Vinyl Box», «Programa · Agregar» en
    punteado y «Publicar festival». Una sola ficha, ni un renglón de sedes.
  - `03-trayectos-es-en-laboratorio.png`: «¿Es en Laboratorio Centro Histórico?» con el mapa (sin estilo en el respaldo), el pin y la tarjeta
    «Laboratorio Centro Histórico · C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico · lugar del directorio», «Sí, es aquí» y «Buscar otro».
  - `04-trayectos-revisa.png`: «Evento», «Mañana · 19:00», «Laboratorio Centro Histórico», «Gratis», «Disonáuta, El Ermitaño y Las brujas de la
    Cañada», «Parte de un festival · Agregar» y «Publicar».
  - `05-que-es.png`: «¿Qué es?» con Evento («Pasa un día a una hora.»), Festival («Reúne varias presentaciones.»), Exposición y Taller o curso,
    ninguna marcada; sin botón al pie (tocar una sigue).
  - `06-festival-programa-sede-del-festival.png`: «El cartel trae 3 eventos» del Festival de Cine de Otoño (cartel inventado): «vie 13 de nov ·
    6:00 p.m. · Sede del festival», «sáb 14 de nov · 6:00 p.m. · Sede del festival», «dom 15 de nov · 7:00 p.m. · Sede del festival»,
    «Programa registrado: 3 actividades» y «Revisar el festival».
  - `07-festival-donde-una-vez.png`: «¿Dónde es?» una sola vez, con «Teatro Paz» (lo leído) escrito y «Teatro de la Paz · Lugar del directorio».
  - `08-festival-revisa.png`: «Festival», «Del 13 al 15 de nov · Programa registrado: 3 actividades», «Teatro de la Paz · Sede del festival»,
    «Por confirmar» y «Publicar el festival y 3 eventos».
  - `09-ficha-festival-sin-programa.png`: la ficha de «Noche cumbiera (demo)»: cabecera oscura con «FESTIVAL», «sáb 17 de oct · 20:00 · Foro
    lunaria» bajo el título, la banda «20:00 · sáb 17 oct – dom 18 oct», «Costo · Por confirmar», «Van · 0»; «Me interesa» y «Voy».
  - `10-ficha-festival-sin-programa-abajo.png`: «Dónde» con Foro lunaria, «Sobre el evento», «Quién va» y «Publicado por»; ninguna sección
    «Programa».
  - `11-agenda-renglon.png`: Agenda, «Mañana · 2»: la charla y «Noche cumbiera (demo) · 20:00 · Foro lunaria» con su «Voy», como cualquier evento.
  - `12-inicio-festivales-y-expos.png`: Inicio, «Festivales y expos»: la tarjeta «FESTIVAL · Noche cumbiera (demo)» con la portada del sistema,
    sello «oct 17», «mañana · 20:00» y «Foro lunaria» (junto al Festival de Cine de Invierno del respaldo, cuyos actos son borradores de Ana:
    para quien mira tampoco tiene programa).
  - `13-ficha-lugar-renglon.png`: la ficha de Foro lunaria: «Eventos · 1 próximo», «Próximos eventos · 1», «Mañana» con el renglón «Noche cumbiera
    (demo) · 20:00» y su «Voy»; ya no la cabecera «Programa por confirmar».

## Fuera de esta pieza (pendiente)

- **Una obra en días sueltos** (el mismo título el 13 y el 20): sigue como programa de un festival. El evento de varios días con horario por día
  solo admite días seguidos; los sueltos son de un taller, que no es la clase de una obra. Se juntan solo los días seguidos.
- **Convertir un evento ya publicado en festival** desde editar: `guardar_evento_con_clase` lo rechaza (`festival_por_programa`), como antes
  (la hoja «¿Cómo ocurre?» lo deja elegir y el guardado falla). La migración nueva es solo para el alta; editar un festival sin programa sí
  funciona.
- **Los actos del programa no se buscan por dirección** (el cartel no trae una por acto). Solo la sede general.
- **Un programa con todos sus actos desmarcados** se publica ahora como festival sin programa (antes decía «Falta una actividad»): esos actos no
  se guardan como borradores, porque `publicar_programa` exige uno publicado. Si hace falta guardarlos, es otra pieza.
- **La banda de la ficha de una noche que cruza la medianoche** dice «sáb 17 oct – dom 18 oct» (es `kpiCuando`, la misma de un evento suelto de
  8 p.m. a 2 a.m.); la línea bajo el título sí dice un día. Si se quiere un día también en la banda, es otra pieza corta y toca a todos los eventos
  de noche.
- «Revisa» de una noche dice «vie 30 de oct · 20:00 → sáb 31 de oct · 02:00» (la regla de siempre para un fin al día siguiente).

## Dudas para el founder

1. **«Voy» en un festival sin programa** (supuesto 3). Si prefieres que todo festival siga con solo «Me interesa», es una línea.
2. **Hasta 31 días sin programa va como evento** (supuesto 4): un festival de 3 noches en un mismo foro sin desglose sale cada noche en la agenda,
   con «Día n de 3». Uno de más de un mes sin actos sigue como «Programa por confirmar».
3. **«Charlemos» y «Sorpresas»** de Trayectos: con la lectura de antes, «Charlemos» va a la descripción, no a «Quién» (supuesto 5). Con el esquema
   nuevo, la lectura real del gestor puso «Charlemos» en los artistas: es un límite del lector, no se corrige a la fuerza; se quita en «Quién».
4. La migración `20261018120000_festival_sin_programa.sql` va **antes** de unir: sin ella, publicar un festival sin programa dice «No se pudo
   publicar el festival».
