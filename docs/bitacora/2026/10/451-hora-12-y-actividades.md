# 451 · La hora en «7:00 pm» en toda la app, «actividades» dentro de un festival, una noche de una sola manera y «Función n de N» contando todas (OL-418)

**Fecha:** 2026-10-19. **Rama:** `hora-12-y-actividades`, base `main` (`0a857d1f`), con `main` traído hasta `4f36b5e8` (OL-415 y OL-417; sin choques salvo OPEN_LOOPS). **Operador:** agente de la pieza (Gestor VII), sin otros agentes.
**Sin migración** y sin variables de entorno nuevas: lo guardado (instantes ISO, horas `time` de los horarios) no cambia, solo cómo se escribe.
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido (founder, 19 de octubre)

«para formato de hora ya me señaló un usuario que 19:00 hrs era confuso, es mejor usar 7:00 pm Ajusta por favor». Y, al aceptar las
recomendaciones de la bitácora 446 («Adelante, tomo tus recomendaciones»): la palabra para lo de dentro de un festival es **«actividades»**; una
noche se dice de una sola manera; «Función n de N» cuenta todas (446, UX 5, 6 y 11; plan en la bitácora 449, §1 y punto 3).

## Lo que cambió

### 1. Una sola hora, en 12 horas, para toda la app

En `src/lib/fechas.ts`:

- **`horaDeReloj("19:00")` → «7:00 pm».** Siempre con minutos y con «am»/«pm» en minúsculas tras un espacio: «9:30 am», «12:00 pm» (mediodía),
  «12:00 am» (medianoche). Recibe la hora de pared en 24 h («HH:MM» o «HH:MM:SS», como la guarda la base).
- **`rangoDeReloj(desde, hasta)`**: guion corto sin espacios; el sufijo una vez si los dos lo comparten («7:00–9:30 pm», «9:00–11:00 am») y
  cada uno el suyo si no («8:00 pm–2:00 am», «11:00 am–2:00 pm»).
- **`horaCorta(iso, zona)`** sigue siendo la hora de un instante en la zona del evento, ahora «7:00 pm». **`reloj24`** («19:00») queda solo para
  comparar horas (si una noche cruza la medianoche, si un fin es el 23:59 de «sin hora de fin»); nunca para leerla.
- **`horasDelEvento(inicio, fin, zona)`**: las horas de un evento en su día: sin fin, la de inicio; con fin el mismo día, el rango; una noche que
  acaba de madrugada, también el rango (ver 3). **`esUnaNoche`** y **`articuloDeHora`** («la 1:00 pm», «las 8:00 pm»).
- `calendario.ts` (`etiquetaHora`, la de los chips y las hojas del alta) ya iba en 12 horas pero con el «p. m.» de `Intl`; ahora es la misma
  función, así todo escribe igual. `cuandoEvento.horasDelDia` usa la misma regla del sufijo.

Todo lo que se lee pasa por ahí:

| Superficie | Antes | Ahora | Dónde |
|---|---|---|---|
| Renglones de Agenda, fichas de lugar y artista, «Publicado» | 19:00–21:00 | 7:00–9:00 pm | `RenglonEvento.tsx` (`horasDelEvento`) |
| Inicio: tarjetas, fila «Ahora» (círculos e historias) | sáb 24 de oct · 12:00 · «20:00» · «Desde 17:30» | … · 12:00 pm · «8:00 pm» · «Desde 5:30 pm» | `destacados.ts`, `ahora.ts` (por `horaCorta`) |
| Número de la fecha en la ficha | 20:00 / sáb 17 oct – dom 18 oct | 8:00 pm / sáb 17 oct | `ficha.ts` |
| Línea bajo el título (taller, festival sin programa) | jue 8 de oct · 17:00 | jue 8 de oct · 5:00–7:00 pm | `claseEvento.ts` |
| Horario del lugar y «Para visitar» | Abre 10:00–18:00 · hasta el dom 8 de nov / 10:00 a.m.–6:00 p.m. | 10:00 am–6:00 pm · hasta el dom 8 de nov (sin «Abre», decisión del founder abajo) | `horarioLugar.ts`, `agendaPorClase.ts`, `eventosFicha.ts` |
| Número «Hoy» de una exposición | 10:00–18:00 | 10:00 am–6:00 pm | `claseEvento.kpisDeExposicion` |
| Alta por pasos: chips, «cada día de…», horarios por día, «Revisa» | 7:00 p.m. · de 8:00 p.m. a 9:00 p.m. · 20:00 → sáb 31 · 02:00 | 7:00 pm · de 8:00 a 9:00 pm · vie 30 de oct · 8:00 pm–2:00 am | `calendario.ts`, `cuandoEvento.ts`, `sesionesEvento.ts`, `fechas.ts` |
| Sesiones en la ficha y en «A mi calendario» | vie 9 de oct · 20:00–21:00 | vie 9 de oct · 8:00–9:00 pm | `sesionesEvento.ts` |
| Cartel generado | 19:00 h (y «19:00 H» en las etiquetas en mayúsculas) | 7:00 pm (también dentro de una etiqueta en mayúsculas: «VIE 16 OCT · 7:00 pm») | `carteles/datos.ts`, `carteles/medir.ts` |
| PDF (presentación e informe) e historial | 8 oct · 19:00 · jue 8 · 19:00 | 8 oct · 7:00 pm · jue 8 · 7:00 pm | `documentos.ts`, `historialFichas.ts` (por `horaCorta`) |
| Push y correo | Mañana · 19:00–21:00 | Mañana · 7:00–9:00 pm | `avisos.ts` (por `formatearCuando`) |
| Grafo de Administración | Datos de las 14:05 | Datos de las 2:05 pm («de la 1:05 pm») | `admin/grafo/datosDe.ts` |
| Nombre de una pared de Pincel sin lugar | Pincel · 22 sep, 13:05 | Pincel · 22 sep, 1:05 pm | `pincel.ts` |

En la etiqueta del número de la fecha (que va en mayúsculas) la hora va tal cual, para que «pm» no se lea «PM»; un rango ahí («Del 21 al 23 de
oct» con «11:00 am–2:00 pm») baja de renglón tras el guion en vez de cortarse con «…» (`ui/Kpi`: solo entre sus trozos, nunca dentro de una hora;
sin `(?<=…)` en la expresión regular, que el Safari de un iPhone viejo no entiende).

### 2. «actividades» para lo de dentro de un festival

| Antes | Ahora | Archivo y línea |
|---|---|---|
| Número de la banda «Actos 3» y, en la línea, «Del … · Programa registrado: 3 actividades» | «Actividades 3» y la línea solo con su cuándo («Del 25 al 27 de oct»); sin actividades, «· Programa por confirmar» | `src/app/eventos/[id]/page.tsx:535` y `:427` |
| 3 actos nuevos (ceja de la tarjeta de Inicio y renglón de Nuevos) | 3 actividades nuevas | `src/lib/series.ts:117` |
| 5 funciones aquí / 5 funciones suyas (bloque de festival en las fichas de lugar y artista) | 5 actividades aquí / 5 actividades suyas | `src/lib/eventosFicha.ts:85` |
| El cartel trae 3 eventos | El cartel trae 3 actividades | `src/app/nuevo/evento/pasos.ts:224` |
| Publicar el festival y 3 eventos (botón de «Revisa») | Publicar el festival y 3 actividades | `src/app/nuevo/evento/Revisa.tsx:79` |
| ¿Sus presentaciones tienen ficha propia? («Publicado» de un festival sin programa) | ¿Sus actividades tienen ficha propia? | `src/app/nuevo/evento/Publicado.tsx:90` |
| Reúne varias presentaciones. («¿Qué es?») | Reúne varias actividades. | `src/lib/eventos.ts:97` |
| jue 29 de oct · acto de Festival X («Lo que publicó» de Administración) | … · actividad de Festival X | `src/lib/panelPublicado.ts:85` |
| … un festival no se suma además de sus actos (PDF del informe) | … además de sus actividades | `src/lib/documentos.ts:251` y `:258` |

No cambian: los nombres de las clases («Festival», «Exposición», «Taller», «Evento»), «evento» cuando es un evento suelto, «Otras funciones» y
«Función n de N» (funciones de una misma obra, ver 4), «6 funciones» de una serie en Inicio, «Programa registrado: N actividades» (ya decía la
palabra) y los nombres internos del código (`actos`, `textoActosNuevos`).

### 3. Una noche se dice de una sola manera

Un evento (o un festival) de una noche que acaba de madrugada es un día con su rango: **«sáb 17 de oct · 8:00 pm–2:00 am»**, nunca «sáb 17 oct –
dom 18 oct», «→ dom 18 de oct · 02:00» ni «Del 17 al 18 de oct».

- **Listas, Revisa, avisos y la ficha larga:** `formatearCuando`, `formatearLargo` y el renglón (`horasDelEvento`).
- **Ficha:** la línea bajo el título lo dice entero; el número de arriba dice el día solo («sáb 17 oct») y la hora en que empieza («8:00 pm»), como
  cualquier evento de un día (el rango entero no cabe en un tercio de ancho: a 390 se cortaba «8:00 pm–2:0…»).
- **Festival con programa de una noche:** su cuándo (`cuandoDePeriodo`, `rangoDelPeriodo`) y la cabecera del bloque en la ficha de su lugar
  («lun 19 de oct · 8:00 pm–2:00 am · 2 actividades aquí»); el sello de su tarjeta, un día («19», no «19–20»).
- Un fin justo a la medianoche sigue siendo el final de su día (la regla de `ultimoDiaDelPeriodo`). La regla «Hasta el … / Del … al …» de OL-410
  se conserva para lo que de verdad dura varios días.

### 4. «Función n de N» cuenta todas

Como «Sesión 2 de 3»: la ficha lee también las funciones hermanas que ya pasaron (una segunda consulta, las 100 más recientes con `termina` antes
de ahora, mismo lugar o sitio escrito; la comparación de títulos sigue en TypeScript, `funcionesHermanas`), así la N es el total. «Otras
funciones» sigue con las que vienen. La última función también lo dice («Función 4 de 4»). Lo de dentro de un festival que se repite (una
película en tres funciones) sigue diciendo «Función»: son funciones de una misma obra.

## Decisiones (y por qué)

1. **Una función y la cadena limpia.** La hora lleva un espacio normal, no uno duro: viaja a compartir, avisos y correos (la regla de OL-309, que
   ya tenía una prueba). Donde podría partirse, lo resuelve quien la pinta: «Revisa» ya la pinta en un bloque que no se parte, el horario del
   lugar un rango por trozo y el número de la ficha entre trozos.
2. **El número de la fecha dice dónde empieza una noche, no su rango.** Ver 3; la línea bajo el título, las listas y «Revisa» dicen el rango.
3. **La cabecera del festival dice el número una vez:** el número de la banda (firmado en OL-351, tres números) se queda y la línea deja de repetirlo.
4. **«Reúne varias presentaciones.»** era la definición que el founder aprobó el 18 de octubre; se cambia por «Reúne varias actividades.» para
   que sea la misma palabra (el founder lo aceptó, abajo).

## Lo que estaba por confirmar (decidido por el founder, 19 de octubre)

El founder aceptó los «por confirmar» como los recomendó el gestor, con un cambio en código:

1. **El formato de los rangos:** se queda el guion en los datos («8:00 pm–2:00 am», el de todos los rangos de la app; el plan de la 449 había
   escrito «8:00 pm a 2:00 am») y «de … a …» en las frases del alta («cada día de 8:00 a 9:00 pm», horarios por día).
2. **«Para visitar» sin «Abre» (el cambio en código).** Con la hora en 12 horas, «Abre 10:00 am–6:00 pm · hasta el dom 8 de …» ya no cabía a 390
   px y se cortaba el mes (OL-410 había elegido 24 h justo por esto). Decisión del founder: quitar la palabra «Abre» en el renglón de «Para
   visitar», en las fichas de lugar y artista (`eventosFicha.lineaParaVisitar`) y en Agenda («Para visitar hoy», `agendaPorClase.cuandoParaVisitar`):
   **«10:00 am–6:00 pm · hasta el dom 8 de nov»**, con el reloj delante. A 390 el mes ya se lee entero (capturas 03 y 10); a 320 se sigue
   cortando «hasta el do…», como antes en 24 h (capturas 10b y 15). No cambia lo que dice una exposición en otro renglón: «Abre hoy 10:00 am–6:00
   pm» en su ficha (`textoHoy`) y en la lista de Exposiciones de Agenda (`notaDeVisita`, tras «Hasta el …»), donde «Abre» dice que esas horas son
   las de hoy.
3. **El recuadro de la fecha** de un evento suelto de una noche se queda solo con el inicio («8:00 pm» y «sáb 17 oct»); el fin lo dicen las listas,
   «Revisa», los avisos y la línea de un festival.
4. **«Reúne varias actividades.»** se queda en «¿Qué es?».
5. **La etiqueta del número con un rango a 320 px** («11:00 a…» / «2:00 pm») se queda como está: también se cortaba en 24 h. Captura 13.

## Verificación

**Segunda vuelta (sin «Abre» en «Para visitar», 19 de octubre):** lint (sin errores), typecheck, las unitarias de `horarioLugar`, `agendaPorClase`,
`agenda`, `eventosFicha` y `claseEvento` (148) y las de componentes de Agenda por clase y de la hoja de Lugares (22) en verde; capturas 03, 10,
10b y 15 rehechas.

**Primera vuelta:**
En el árbol sin `.env`: `npm run lint` (sin errores; un aviso viejo en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test`
(228 archivos, **4033 pruebas** en verde), `npm run inventario` (sin novedades) y `npm run medir` (41 pantallas × 4 anchos, **sin novedades**:
la línea base no cambia). `npm run test:componentes`: 617 de 618; la que falla, «el teclado ya estaba abierto al tocar el renglón»
(`ui/CampoLargo`), es intermitente (pasó en la primera corrida completa y en 1 de 3 sueltas) y no toca nada de esta pieza.

Pruebas nuevas: la hora (mediodía, medianoche, «la/las», rangos con y sin cambio de am/pm, en la zona del evento), `horasDelEvento` y
`esUnaNoche`, una noche en lista/ficha/«Revisa», el festival de una noche con programa (en curso y por venir), el sello de una noche, la etiqueta
del cartel en mayúsculas con «pm», «Datos de la 1:05 pm», «Función 3 de 4» con funciones pasadas (y «Función 3 de 3» en la última) y la ficha
del festival sin programa de una noche (su línea y su número). Las demás pruebas, al día con los textos nuevos.

### Capturas (`docs/rediseno/capturas-451/`, 390×844 a 2×, contra el respaldo local; las de 320 lo dicen)

Con el respaldo local y `RESPALDO_CARTELES=1`, más datos inventados solo para estas capturas (un festival de una noche con dos actividades en Foro
lunaria, los actos del Festival de Cine de Invierno a la vista, una obra con cuatro funciones y dos eventos de varios días; en una copia del
respaldo fuera del repo). La lectura del cartel, simulada.

1. `01-inicio.png`: «Ahora» con «6:00 pm» y «7:00 pm» bajo los círculos; la tarjeta «sáb 24 de oct · 12:00 pm».
2. `02-inicio-festival-de-una-noche.png`: «Festivales y expos» con Noche cumbiera: sello «17» (un día) y «mañana · 8:00 pm».
3. `03-agenda.png`: «6:00–8:00 pm», «7:00–9:00 pm», «Para visitar hoy» con «10:00 am–6:00 pm · hasta el dom 8 de nov» y «… · hasta el dom 15
   de nov» enteros (sin «Abre»), «7:30–9:30 pm».
4. `04-agenda-noche.png`: Noche cumbiera «8:00 pm–2:00 am»; «10:00 am–12:00 pm»; «5:00–7:00 pm · Sesió…».
5. `05-ficha-festival-una-noche.png`: la línea «sáb 17 de oct · 8:00 pm–2:00 am · Foro lunaria» y el número «8:00 pm» / «sáb 17 oct».
6. `06-ficha-festival-con-programa.png`: «Del 25 al 27 de oct» y el número «ACTIVIDADES 3» (sin «Programa registrado» en la línea).
7. `07-ficha-festival-una-noche-con-programa.png`: «lun 19 de oct · 8:00 pm–2:00 am» y «ACTIVIDADES 2».
8. `08-ficha-lugar-actividades-aqui.png`: Foro lunaria: Noche cumbiera «8:00 pm–2:00 am» y el bloque «lun 19 de oct · 8:00 pm–2:00 am · 2
   actividades aquí». (En la del Centro Cultural Universitario Bicentenario se lee «Del 25 al 27 de oct · 2 actividades aquí».)
9. `09-ficha-lugar-horario.png`: MUNI: «Ma–Do / 10:00 am–6:00 pm / Cierra Lu» y «7:00–10:00 pm · 2 van».
10. `10-ficha-lugar-para-visitar.png`: «Para visitar» del MUNI con «10:00 am–6:00 pm · hasta el dom 8 de nov» y «… · hasta el dom 15 de nov»,
    el mes entero a 390.
    `10b-ficha-lugar-para-visitar-320.png`: lo mismo a 320: «10:00 am–6:00 pm · hasta el do…» (se corta, como en 24 h).
11. `11-ficha-funcion-3-de-4.png`: «FUNCIÓN 3 DE 4» (dos ya pasaron), el número «7:00 pm» / «dom 18 oct» y «Otras funciones» con la que viene.
12. `12-ficha-varios-dias-am-pm.png`: el número «11:00 am–» / «2:00 pm» en dos renglones y «Del 21 al 23 de oct».
13. `13-ficha-varios-dias-am-pm-320.png`: lo mismo a 320 («11:00 a…» / «2:00 pm», punto 5).
14. `14-ficha-exposicion-hoy.png`: Ecos de papel: «HOY 10:00 am–» / «6:00 pm».
15. `15-agenda-320.png`: Agenda a 320: «Para visitar hoy» con «10:00 am–6:00 pm · hasta el do…».
16. `16-alta-revisa-madrugada.png`: «Revisa» de Cumbiachella: «vie 30 de oct · 8:00 pm–2:00 am» (antes «20:00 → sáb 31 · 02:00»).
17. `17-cartel-con-hora.png`: cuatro carteles generados (`CARTELES_SALIDA` de `dibujar.test.ts`): «7:00 pm» en el sol, «SON HUASTECO · VIE 16
    OCT · 7:00 pm» en la etiqueta en mayúsculas, la franja «VIE 16 OCT · 7:00 pm» y «10:00 am» en el boleto de varios días.

## Lo que no se tocó

- `src/app/perfil/page.tsx` y `src/app/ajustes/page.tsx` (otra pieza, de Codex).
- La sonda de depuración de la pared de Pincel (`obra/[id]/pared/Pared.tsx`, solo con `?sonda`) sigue con la hora del navegador.
- Los campos de hora nativos de Administración (`<input type="time">`) y lo que se guarda.
- El texto que se le pide al modelo que lee carteles (sigue pidiendo horas en 24 h para guardarlas: no se lee).
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs` y `medir-pantallas.mjs` solo cambian el botón que tocan («7:00 pm»).
