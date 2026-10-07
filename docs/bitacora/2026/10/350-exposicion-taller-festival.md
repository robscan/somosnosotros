# 350 · Exposición, taller y festival en el alta por pasos (modelo y alta)

**Pieza:** OL-321 (punto 4 del orden firmado por el founder: «al llegar a exposición/festival/taller debemos abordar también cómo se mostrarán en inicio y agenda, cómo se considerarán en filtros, etc.»). **Rama:** `exposicion-taller-festival`, apilada sobre `origin/editar-evento-por-pasos` (OL-319, PR #411, sin unir todavía): unir después de él. **Fecha:** 2026-10-06/07. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Manda:** el doc 55 y su prototipo (`docs/rediseno/55-exposicion-festival-taller.md`, `prototipos/exposicion-festival-taller.html`, casos 1 a 5 y 8; rama `origin/doc-55-exposicion-festival-taller`, no copiados aquí), con las decisiones del gestor **por confirmar con el founder**.
**Estado:** hecho y probado con los componentes reales (Chrome), con la app compilada contra el respaldo local y en el simulador de iPhone (Safari); falta el iPhone real. **Trae una migración que solo añade; la aplica el gestor antes de unir** (`20261006160000_eventos_clase.sql`): sin ella, publicar una exposición, un taller, un festival o un evento «Parte de un festival» falla («No se pudo publicar el evento completo»); un evento de siempre se guarda igual que hoy.

## Qué se encargó

El modelo (clase, festival padre, inauguración, horario propio de la exposición) y el alta por pasos de las tres formas nuevas: la clase se propone (cartel o título) y se confirma en «Revisa»; exposición con «¿Cuándo se puede visitar?», horario del lugar o propio e inauguración; taller con «¿Qué días son las sesiones?»; festival con su programa leído del cartel (H6), corrección por acto y publicación atómica, y «Parte de un festival»; las fichas de exposición y festival; editar con lo mismo. Inicio, agenda, Cuándo y filtros quedan para OL-322.

## El modelo (migración que solo añade)

`supabase/migrations/20261006160000_eventos_clase.sql`:

- `eventos.clase` (`puntual` por omisión; todo lo de hoy sigue igual), `eventos.evento_padre_id` y `eventos.inaugura_id` (los dos `on delete set null`) y `eventos.borrador` (un acto del programa registrado sin publicar). Restricciones: un festival no tiene padre ni se liga a sí mismo (sin anidar), solo una exposición tiene inauguración, un borrador siempre es de un festival.
- Disparador `eventos_clase_coherente`: el padre es un festival y la inauguración un acto puntual, los dos **gestionados por quien guarda** (autor o administración); un festival con actos no deja de serlo; solo la administración vuelve borrador un evento que ya existe.
- `eventos_horarios` (igual que `lugares_horarios`; RLS como `eventos_sesiones`): el horario propio de una exposición.
- `recalcular_festival(festival)`: el periodo del marco = del primer acto visible al final del último (`termina`).
- `guardar_evento_con_clase(p_evento, p_datos, p_privado, p_quien, p_sesiones, p_clase, p_revision, p_operacion)`: envuelve sin tocarlas a `guardar_evento_con_sesiones` (alta) y `editar_evento_con_sesiones` (editar, OL-319) y, en la misma transacción, la clase, el festival (uno existente o uno nuevo con solo el nombre, que nace con el sitio y el periodo del acto), el horario propio y la inauguración (un acto puntual publicado con sus avisos, con el mismo sitio, cartel, artistas y precio; si ya existe, cambia su día y su hora). Recalcula el festival al que entra y del que sale. Un reintento (`repetido`) no toca nada más.
- `publicar_programa(p_marco, p_actos, p_operacion)` (H6): los actos marcados con sus avisos, el marco (sin avisos propios; sitio del primer acto publicado y periodo del programa) y los desmarcados como borradores, todo o nada; idempotente por la clave del marco.
- `programa_ocultar_borrador` (uso interno de `publicar_programa`) y `publicar_borrador_de_programa` (desde la ficha del festival), `security definer` con su comprobación: solo el autor, solo un evento visible se vuelve borrador (uno que ocultó la administración nunca se cuela de vuelta).

Cómo se guardan las fechas (agenda, búsquedas, avisos y panel siguen leyendo `inicio`, `fin`, `termina`): **exposición** del primer día de visita a las 00:00 al final del día de cierre (23:59, la regla de «acaba con su último día»); **taller** con sus sesiones en `eventos_sesiones` (días sueltos: la tabla ya lo admitía); **festival** con el periodo de su programa.

## El alta por pasos

- **La clase se propone, no se pregunta** (`lib/eventos.ts`: `claseSugerida(titulo)`, `CLASES`): «exposición/expo/muestra» → exposición; «taller/curso/laboratorio/diplomado» → taller; «festival/encuentro/jornadas/muestra de cine» → festival (palabras enteras, sin acentos; gana la primera que aparece). Mientras nadie la elige, el título la propone; el cartel (`Lectura` con `clase`, `visita`, `sesiones` y `actos`, todo opcional; `formaDelCartel` la limpia) la fija; la hoja «¿Cómo ocurre?» también. En «Revisa», primer renglón con icono de etiqueta («Exposición · Cambiar») que abre la hoja con las cuatro formas y su frase llana (`ui/Opcion` gana `elegida`: la de ahora con su palomita). Cambiarla cambia solo el paso del tiempo (los días de un evento son los de visita o las sesiones de partida) y conserva nombre, dónde, quién, precio y cartel.
- **Exposición** (`PasoVisita`): chips «Desde» / «Hasta» y el calendario de siempre (`ui/Calendario`, banda entre los dos; «Hasta» inclusivo); con el lugar ya conocido, la casilla «Horario del lugar» marcada con su resumen; desmarcarla abre la hoja de franjas de OL-315 (`HojaHorario`, la misma pieza con la pregunta «¿Qué días se puede visitar?»). En «Revisa»: la visita, el horario (propio, del lugar o «Horario por confirmar · Agregar»), «Inauguración · Agregar» (hoja con su día y su hora; no hereda el horario de visita) y el botón «Publicar exposición». Del cartel (caso 1, H1): visita e inauguración llegan llenas y se entra en «Revisa».
- **Taller** (`PasoSesiones`): un toque por día (otro lo quita; `ui/Calendario` gana `sueltos`), «¿A qué hora?» (las horas del prototipo), «Termina» opcional y la casilla «Misma hora todas las sesiones»; desmarcada, un renglón por sesión con su hoja (`HorarioPorDia` de OL-311, tal cual). Un taller de dos o más sesiones manda sus sesiones; de una, se guarda como un evento de un día. «Publicar taller».
- **Festival** (`PasoPrograma`): «El cartel trae N eventos» (o «¿Qué actividades tiene?» armado a mano), cada acto con su casilla (desmarcado = borrador) y su renglón, que abre su hoja: nombre (✕ y contador), día, hora, sede (el paso «Dónde» de siempre, que vuelve al programa: el reductor sabe de qué acto es la sede, `sedeDeActo`) y quién. «Agregar actividad». El pie dice qué falta («Completa «Charla con la directora»»). «Revisa» del marco: «Festival», «Del 12 al 14 de nov · Programa registrado: 2 actividades», «Sedes: … · Por actividad», el precio y «Publicar el festival y 2 eventos» (un solo envío: `publicar_programa`). El servidor cruza la sede de cada acto con el directorio por su nombre (`leerCartelAccion`).
- **Parte de un festival** (todo lo que no es festival): renglón punteado en «Revisa»; la hoja busca entre los festivales propios vigentes (la administración, todos) por nombre (la persona lo elige; nunca por parecido) o crea «Crear «X»» con solo el nombre; «Quitar del festival».
- **Publicado**: «Exposición publicada» / «Taller publicado» / «Festival publicado», la tarjeta con su línea («Del 9 al 31 de oct», «3 sesiones · …», el programa con sus borradores) y una sugerencia en punteado: a una exposición sin inauguración, «Agregar inauguración» (a editar); a un festival, «Agregar otra actividad» (`/nuevo/evento?festival=<id>`, que abre con «Parte de …» puesto; solo con un festival que se puede elegir).
- **Editar** (OL-319): entra con la clase ya confirmada y sus renglones (visita, horario, inauguración, sesiones sueltas, festival); un festival guardado enseña su programa sin cambiarlo aquí (cada acto se edita en su ficha), no ofrece cambiar de clase si tiene actividades y se guarda sin pedir actos.

## La ficha

- **Exposición:** números «Hasta · mar 27 oct», «Hoy · 10:00–18:00» (o «Cerrado», «Horario · Por confirmar», y antes de abrir «Abre · …») y «Costo»; debajo, «Hasta el mar 27 de oct · Abre hoy 10:00 a.m.–6:00 p.m.»; bloque «Horario» (estructurado por `TextoHorario`, con «Horario del lugar» o «Horario de la exposición»; sin ninguno, «Horario por confirmar · Pregunta en el lugar antes de ir») y la inauguración enlazada. Solo «Me interesa» (sin «Voy», sin «Van» ni «Quién va»).
- **Festival:** «Actos», «Costo», «Sedes»; «Del 16 al 18 de oct · Programa registrado: 3 actividades»; «Programa» por día con cada acto en su renglón de siempre (`EventosPorDia`: su ficha y su «Voy»); el autor ve sus borradores con «Publicar» y «Agregar otra actividad». Solo «Me interesa» en el marco.
- **Acto:** «Parte de Festival X» (enlace al marco). **Inauguración:** «Inaugura X». **Taller:** el bloque de sesiones se llama «Sesiones» y dice «Sesión n de N».
- Compartir lleva la línea de la exposición («Hasta el …») o la del festival. «Pasado» sin cambios: cada clase guarda su fin como corresponde.

## Decisiones del operador (por confirmar)

1. **Fin de la exposición a las 23:59 del día de cierre** (la convención de «acaba con su último día»); `termina` la oculta al terminar ese día.
2. **Ocurrencias (OL-320, PR #410, no está en esta rama):** con ese fin, `ocurrenciasDe` repartiría una exposición de hasta 31 días en un renglón por día. Al unir #410, una línea en `ocurrenciasDe`: `if (e.clase === "exposicion" || e.clase === "festival") return [entero(e)];` (una sola ocurrencia en su día de inicio hasta que OL-322 la mueva a «Para visitar»; los actos de un festival y las sesiones de un taller sí se reparten). No toqué `ocurrencias.ts` porque no existe en esta base.
3. **Las listas (agenda, inicio) no saben todavía de la clase** (OL-322): una exposición se lee «Del 9 al 31 de oct · 00:00» en un renglón y un marco de festival sale como un evento más. `RenglonEvento` ya acepta `cuando` para eso (hoy solo lo usa «Publicado»).
4. **El festival pide precio** (el prototipo lo traía opcional): sin él la ficha diría «Gratis» sin que nadie lo dijera, y el precio va también a sus actos.
5. **Solo festivales propios en «Parte de un festival»** (la administración, todos): uno ajeno sería una propuesta pendiente de quien lo administra, que pide un modelo aparte. Lo exige la base.
6. **Borradores** con columna propia (`borrador`) para no confundirlos con lo que ocultó la administración; publicarlos desde la ficha no manda avisos.
7. **Una inauguración en un sitio reservado no se publica** (su dirección y su hora de revelado son de otro evento): la base la rechaza y el renglón no sale con sitio reservado. Quitar la liga de una inauguración no la borra.
8. **El renglón «Evento · Cambiar» y «Parte de un festival · Agregar» salen también en el evento de siempre** (el prototipo, caso 5): «Revisa» gana dos renglones (s21 de `medir`: 33 → 43 nodos).
9. **Horas del taller** («10:00, 11:00, 4:00, 5:00, 6:00») las del prototipo, sin medición todavía. **«Termina»** opcional en el taller (el prototipo solo traía la hora).
10. **El calendario en el paso a 320 px** se toca de 39×44 (como en su hoja desde OL-282): excepción anotada en `medidas.aceptadas.json` solo para s22 y s23 a 320.
11. **Nombres de prueba:** las pruebas del evento de siempre que usaban «Taller» o «Festival» como nombre ahora usan nombres sin esas palabras (el título ya propone la clase).
12. **Avisos:** cada acto publicado cuenta en la cuota de 3 altas con aviso por día (`avisos_origen`); un programa grande avisa de los tres primeros.

## Lo que no hace (OL-322 y siguientes)

Carril «Para visitar», «Para visitar hoy», bloque de festival en la agenda, grupo «Qué» en filtros, números de la agenda; el .ics de una exposición sale como un periodo con hora (00:00–23:59), no «todo el día»; sugerencias H1/H2/H4 (OL-323).

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **161 archivos, 2387 pruebas, en verde**. Nuevas: `lib/claseEvento.test.ts` (28: `claseSugerida`, `formaDelCartel` y `cartelAFormulario` con lecturas inventadas, fechas de la exposición, horario propio → del lugar → por confirmar, «hoy», números, «pasado» por clase, `resumenTaller`, periodo del festival y su rango), `nuevo/evento/clase.test.ts` (21: los tres recorridos en el reductor, cambiar la clase, la sede de un acto y Atrás, el cartel con exposición/taller/festival, editar con la clase), `eventos/clase.acciones.test.ts` (9: la función con la clase, claves derivadas, programa atómico, acto inválido sin nada a medias), `eventos/[id]/page.test.ts` (+2: fichas de exposición y festival), `nuevo/page.test.ts` (+1: `?festival=`).
- `npm run test:db` (PostgreSQL 17 local): **1690 pruebas, 0 fallos**, 84 migraciones; `eventos-clase.test.mjs` nueva (exposición con horario e inauguración y su reintento, editarla, volverla evento; taller en días sueltos; festival nuevo y su periodo; padre ajeno o que no es festival; sin anidar; festival con actos; borrador; programa atómico e idempotente, programa vacío, anon; borradores y administración; RLS del horario).
- Componentes (Playwright, Chrome de la Mac): **`ClasesEvento.componentes.test.mjs` nuevo, 9 pruebas** (exposición sin cartel con inauguración, horario propio desde la casilla, exposición del cartel, taller con hora por sesión, programa del cartel con corrección de sede y borrador, «¿Cómo ocurre?», «Parte de un festival», 320 y 390 sin desbordes). Suite completa `npm run test:componentes`: **475 de 475**.
- `npm run inventario`: sin novedades (332 medidas en duro). `npm run medir`: **35 pantallas × 4 anchos, sin novedades** tras anotar s22-alta-exposicion-visita, s23-alta-taller-sesiones, s24-ficha-exposicion, s25-ficha-festival, s26-editar-exposicion y s21 (+10 nodos por los dos renglones nuevos).

## Capturas (`docs/rediseno/capturas-350/`)

De los componentes reales en Chrome (390, 2×, con la letra de la app; el selector de artistas es un doble vacío):

- `01-cuando-se-puede-visitar.png`: «¿Cuándo se puede visitar?» con el lugar ya puesto: Desde/Hasta, la banda del 9 al 18 de oct y la casilla «Horario del lugar» marcada con «Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu».
- `02-revisa-exposicion-con-inauguracion.png`: «Revisa» de «Exposición Ecos de papel»: Exposición, «Del 9 al 31 de oct», «Horario del lugar» estructurado, «Inauguración · jue 8 de oct · 7:00 p.m.», Teatro de la Paz, Gratis, «Parte de un festival · Agregar» y «Publicar exposición».
- `03-como-ocurre.png`: la hoja «¿Cómo ocurre?» sobre «Revisa» de un evento: las cuatro formas con su frase, «Evento» con su palomita.
- `04-inauguracion-hoja.png`: la hoja «Inauguración» con el calendario, el 8 marcado, «Empieza» 7:00 p.m. y «Listo».
- `05-que-dias-son-las-sesiones.png`: tres sábados marcados, «3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · 10:00 a.m.–12:00 p.m.», la hora, «Termina» y la casilla marcada.
- `06-el-cartel-trae-3-eventos.png`: el programa leído: tres actos marcados, el segundo con «Cineteca Alameda · confirmar la sede» en tinta y el pie «Completa «Charla con la directora»».
- `07-hoja-de-un-acto.png`: la hoja del acto: su nombre con ✕, día, hora, «Cineteca Alameda · confirmar · Poner» y «Listo».
- `08-revisa-festival.png`: «Revisa» del festival a 390 (lo mismo que la 13).
- `10-visita-320.png`, `11-sesiones-320.png`, `12-programa-320.png`, `13-revisa-festival-320.png`: los mismos pasos a 320, sin desbordes; la 13: «Festival», «Del 12 al 14 de nov · Programa registrado: 2 actividades», «Sedes: Teatro de la Paz · Por actividad» y «Publicar el festival y 2 eventos».

De la app compilada contra el respaldo local, en Chrome (sesión inventada de Ana; los eventos de prueba están ocultos, de ahí el aviso rojo):

- `14-ficha-exposicion-390.png`, `17-ficha-exposicion-320.png`: «Hasta mar 27 oct», «Hoy 10:00–18:00», «Costo»; «Hasta el mar 27 de oct · Abre hoy 10:00 a.m.–6:00 p.m.»; «Horario» del lugar; la inauguración; solo «Me interesa»; sin «Quién va».
- `15-ficha-festival-390.png`, `18-ficha-festival-320.png`: «Actos 3», «Costo», «Sedes 2»; «Del 16 al 18 de oct · Programa registrado: 3 actividades»; el programa por día con el «Voy» de cada acto; el borrador «Función de clausura» con «Publicar»; «Agregar otra actividad»; solo «Me interesa».
- `16-ficha-acto-parte-de-390.png`: la ficha de un acto con «Parte de Festival de Cine de Invierno» y su «Voy».
- `19-editar-exposicion-390.png`: editar la exposición: Exposición, «Del 4 al 27 de oct», «Horario del lugar», «Inauguración · sáb 3 de oct · 7:00 p.m.», el lugar, el precio y «Parte de un festival».
- `20-editar-festival-320.png`: editar el festival: «Festival», «Del 16 al 18 de oct · Programa registrado: 3 actividades» sin «Cambiar», el precio y «Guardar cambios».

Del simulador iPhone 15 Pro (iOS 26.3, Safari, la misma app; con el teclado del Mac conectado, así que el teclado en pantalla no sale: la barra de accesorios sí):

- `21-sim-ficha-exposicion.png`: la ficha de la exposición arriba (números y la línea de hoy).
- `22-sim-ficha-festival-programa.png`: el programa por día, «Programa registrado: 3 actividades · 1 borrador», el borrador con «Publicar» y «Agregar otra actividad».
- `23-sim-cuando-se-puede-visitar.png`: «¿Cuándo se puede visitar?» del 9 al 31 de oct, sin lugar todavía (el aviso de «Horario por confirmar»).
- `24-sim-revisa-exposicion.png`: «Revisa» de «Expo Ecos de papel» en el MUNI, con «Horario del lugar» e «Inauguración · Agregar» (tomada mientras entra: los renglones de abajo aún suben).
- `25-sim-visita-con-horario-del-lugar.png`: de vuelta en la visita desde «Revisa»: la casilla «Horario del lugar» marcada con su resumen (el 15 en gris es el resalte del toque al desplazar).
- `26-sim-como-ocurre.png`: «¿Cómo ocurre?» con «Exposición» elegida.
- `27-sim-que-dias-son-las-sesiones.png`: tras elegir «Taller o curso»: tres sábados, «3 sesiones · …», la hora y la casilla.
- `28-sim-revisa-taller.png`: «Revisa» con «Taller o curso», las sesiones, el mismo lugar y precio (se conservaron) y «Publicar taller».
- `29-sim-parte-de-un-festival.png`: «Parte de un festival» con «Cine» escrito y su ✕: el festival propio «Del 16 al 18 de oct» y «Crear «Cine»».
- `30-sim-revisa-evento-con-clase.png`: «Revisa» de un evento de siempre con «Evento · Cambiar» arriba y «Parte de un festival · Agregar» abajo.

## Qué probar en el iPhone

1. «Exposición…» sin cartel: la visita, «Horario del lugar» (con un lugar que lo tenga), la inauguración, publicar; la ficha dice «Hasta el …» y solo «Me interesa».
2. «Taller de…»: tres días, la hora, desmarcar la casilla y cambiar una sesión; la ficha dice «Sesión n de N».
3. Un cartel con un programa (necesita la lectura): corregir la sede de un acto, desmarcar otro, publicar; la ficha del festival y el borrador.
4. «Parte de un festival» con uno propio y con uno nuevo.
5. Cambiar la clase desde «Revisa» y volver.
6. Editar una exposición y un festival.

## Para el gestor

- **Migración `20261006160000_eventos_clase.sql` (solo añade): aplicarla antes de unir.** Sin variables de entorno nuevas.
- **Apilada sobre #411:** unir después de él.
- **Al unir #410 (ocurrencias):** la línea de la decisión 2.
- Respaldo local: el MUNI con horario, la exposición «Ecos de papel» con su inauguración y el «Festival de Cine de Invierno» con tres actos y un borrador, todos de Ana y ocultos (ninguna medición de listas cambia); las RPC nuevas contestan lo creado.
