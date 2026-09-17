# 075 · Lugares y eventos de cualquier país: cada evento con la hora de su zona

**Fecha:** 2026-09-16 (noche) · **Rama:** `cualquier-pais` (commits locales, sin push) · **Pieza:** OL-048 · **Migración:** `20260917100000_zona_horaria.sql` (0029), por aplicar antes de mezclar.

## Qué pidió el founder
La [067](067-artistas-con-ciudad.md) abrió los artistas a cualquier país ("somos context aware, eso es diferente a limitar a un país o ciudad") y dejó pendiente lo mismo para lugares y eventos, porque pedía migración. El founder dio su sí:

> "Te doy mi sí para la pieza de migración, pero comunica con gestión de cambios."

Se avisó al chat de gestión de cambios antes de empezar. Respondió:
- reservó la bitácora 075, OL-048 y el nombre de la migración;
- la migración se aplica antes de que llegue el código, así que tiene que ser compatible con el que corre hoy, y el código nuevo debe aguantar filas sin zona;
- `filtroSinPasar` y la `sin_pasar` del panel tienen que seguir con la misma regla;
- pidió un banco de pruebas con Ciudad de México, Bogotá y Madrid, con cambio de horario, y capturas de Hoy/Mañana.

## Qué dependía de la hora de la Ciudad de México
Toda la app leía y mostraba las horas con un solo reloj (`ZONA` en `lib/fechas.ts`, UTC−6). Un evento en Madrid a las 19:00 se habría visto a las 11:00. El inventario:
- **Leer la hora del formulario** (`localAIso` con "−06:00" fijo) y **rellenarlo al editar**.
- **Mostrar:** la hora del renglón, la ficha, "Próximo" en Lugares y Artistas, Novedades, los avisos y el texto para compartir.
- **Hoy, Mañana y los días:** los títulos de la agenda, el chip de fecha, la hora sugerida (hoy a las 19:00 o mañana), "Esa hora ya pasó".
- **Cuándo se oculta un evento:** sin hora de fin, al acabar su día. Estaba en la app (`eventoPaso`) y en el filtro de la base (`filtroSinPasar`, con las 00:00 de México).
- **El recordatorio de las 9:00:** una tarea diaria de Vercel a las 15:00 UTC, que siempre decía "Hoy".
- **Las búsquedas del alta de lugar**, limitadas a México por eso mismo.

## Qué se hizo
- **Migración 0029:**
  - `lugares.zona` y `eventos.zona`, con el nombre de la zona ("Europe/Madrid"). Lo que ya existe queda en la de la Ciudad de México, que es la de San Luis Potosí. Una zona que no es ("CST", "Marte/Olimpo") no entra.
  - Un evento en un lugar tiene siempre la zona del lugar, la mande quien la mande. Si el lugar cambia de zona, sus eventos cambian con él, sean de quien sean, y **conservan la hora a la vista**: "19:00" sigue siendo las 19:00 en la zona nueva (inicio, fin y cuándo se revela el sitio). Sin eso, un evento de un lugar que pasaba de San Luis a Madrid se veía el «lun 03:00». También se habría movido 1 o 2 horas el de un lugar de Cancún, al volver a guardarse con su zona (lo encontró la revisión del PR #78).
  - `eventos.termina`: la hora de fin o, sin ella, las 00:00 del día siguiente en la zona del evento. La calcula la base y las listas filtran con ella. Así cada evento se oculta con su reloj.
  - **El panel, con la misma regla:** la 0028 había copiado la regla de las listas como `sin_pasar(inicio, fin)`, con el día de México, en 17 lugares de 8 funciones. Esas funciones vuelven a crearse tal cual, salvo `public.sin_pasar(e.inicio, e.fin)`, que pasa a ser `e.termina >= now()`. Un script copió cada función y otro comprobó que solo cambian esos renglones.
  - **Compatible con el código de hoy:**
    - solo añade: columnas con valor por defecto, una función, dos disparadores, dos índices;
    - las funciones del panel conservan su firma y sus permisos;
    - nada se quita: `sin_pasar` se queda, ya sin uso.

    Con el código viejo, todo evento nuevo cae en la zona de México, donde `termina` da lo mismo que `sin_pasar`. Nada cambia hasta que llegue el código nuevo. Todas las escrituras de hoy arman la fila con los datos del formulario, así que ninguna manda `termina`.
- **`lib/fechas.ts`:** cada función recibe la zona del evento. Sin zona (o con `null`), usa la de la ciudad inicial, como hasta hoy.
  - `terminaDe` es la misma cuenta que `eventos.termina`, y `eventoPaso` la usa: la app, las listas y el panel ocultan con la misma regla.
  - La hora del formulario se lee en esa zona, también en los cambios de horario (Madrid adelanta el reloj el 29 de marzo).
  - "Mañana" se cuenta en días de calendario: un día de 25 horas ya no lo confunde.
  - `zonaSegura`: una zona rota no tumba la agenda, cae en la inicial.
- **La zona sale del punto en el mapa** (`lib/zona.ts`), en el servidor al guardar y sin red. Usa `@photostructure/tz-lookup`:
  - licencia CC0, sin dependencias, unos 70 KB;
  - no viaja al teléfono;
  - versión 11.6.1, de agosto, en vez de la publicada el día anterior.

  Se probó con San Luis, Cancún, Tijuana, Costa Rica, Madrid, Canarias y Córdoba (Argentina).
- **Al guardar:**
  - un lugar, la zona de su punto;
  - un evento, la de su lugar o la del pin (el público o el de la dirección reservada);
  - sin pin, la de la ciudad inicial, igual que su ciudad.
- **Pantallas:**
  - agenda: "Hoy" y el chip de fecha con la zona de la ciudad, y cada evento en el día de la suya;
  - la hora del renglón, la ficha, el archivo de calendario;
  - "Próximo" en Lugares y Artistas, Novedades y la ficha de persona.
- **Cada ciudad tiene zona:** la que más se repite entre sus lugares y eventos.
- **Avisos:** el recordatorio dice "Hoy" o "Mañana" según el día en la zona del evento. Antes decía "Hoy" también a un evento de mañana a las 8:00, que cae en sus 24 horas.
- **Alta de lugar sin país:** la búsqueda por nombre y la de direcciones buscan en cualquier país. Las sugerencias por nombre se ordenan por la distancia que da Mapbox: se piden 10 y se muestran las 5 más cercanas, como ya se hacía con las direcciones.
- **De paso, en Novedades:** "Hoy vas" contaba desde las 00:00 del reloj del servidor, que en Vercel es UTC (las 18:00 del día anterior en San Luis). Por eso probablemente caía en "Ayer" hasta las 18:00. Ahora cuenta desde las 00:00 de la zona del evento.

## Evidencia
- **lint** (el aviso viejo del script del logotipo, ajeno), **tipos**, **277 pruebas** y **build** en verde.
  - **Banco por zona:** Ciudad de México, Bogotá y Madrid, más los dos cambios de horario de Madrid (29 mar, 23 horas; 25 oct, 25 horas). En cada uno se prueban la hora del selector de ida y vuelta, "Hoy" un minuto después de la medianoche y "Mañana" uno antes, y `terminaDe`, con los mismos valores que da la base. También se prueba cuándo deja de verse (en ese instante todavía se ve, un minuto después ya no).
  - **El mismo instante en las tres zonas:** "Mañana · 00:30" en Bogotá, "Hoy · 23:30" en San Luis y "Hoy · 07:30" en Madrid.
  - **Filas sin zona** se leen como de la ciudad inicial.
  - **Pruebas nuevas:**
    - Costa Rica y Córdoba;
    - la zona de un punto;
    - agenda y chip de fecha con dos zonas;
    - ciudades con zona;
    - recordatorio Hoy/Mañana;
    - sugerencias por cercanía;
    - formulario en la zona del sitio.
- **La migración en un Postgres local (PGlite)**, sin producción: las 29 migraciones y 39 comprobaciones, entre ellas:
  - la zona por defecto y siete zonas rechazadas;
  - el evento toma la zona del lugar aunque mande otra, también en un lugar privado que no ve;
  - al cambiar la zona del lugar, cambian los eventos de otra persona;
  - `termina` en San Luis, Bogotá, Madrid, Costa Rica, Canarias y los dos cambios de horario;
  - `termina` no se escribe a mano y se lee sin sesión;
  - **el panel con la zona del evento:** hay un evento en Madrid, sin hora de fin, cuyo inicio cae entre el "hoy" de México y el de Madrid, así que la regla vieja y la nueva no coinciden. `panel_eventos` lo trata como `termina`. Los próximos de `panel_fichas_conteos` y del resumen son los de `termina >= now()`.
  - las funciones del panel conservan sus permisos, y una cuenta que no es de administración sigue sin ver sus conteos.

  El banco del panel (`supabase/tests/panel_administracion.mjs`) también pasa con la 0029: 95 comprobaciones.
- **Pantallas a 390×844**, con un respaldo 100 % local (lugares y eventos inventados, sin producción). A las 21:55 del 16 en San Luis, que ya eran las 5:55 del 17 en Madrid:
  - **Madrid, España:** "Hoy · 2" con el jazz a las 19:00 y la lectura a las 20:30; "Mañana", el taller a las 11:00. Con el reloj de México habrían sido "Mañana · 11:00" y "12:30".
  - **San Luis Potosí**, igual que siempre: "Hoy · 20:00" (sin hora de fin, se queda hasta que acaba el día) y "Mañana · 19:00".
  - **Ficha del jazz:** "jueves 17 de septiembre · 19:00 a 21:00".
  - **Lugares de Madrid:** "Próximo: hoy · 19:00" y "hoy · 20:30".
  - **Bogotá, Colombia** (a las 23:04 de allá): "Hoy", la cumbia a las 21:00; "Mañana · 2", la tertulia a las 00:30 y la danza a las 19:00. Con el reloj de México, la tertulia habría salido en "Hoy · 23:30".
  - **Calendario:** `DTSTART:20260917T170000Z` (19:00 en Madrid).
  - Las listas piden `termina.gte`.
- **Sin probar:**
  - guardar de verdad (sería escribir en producción);
  - el formulario con sesión;
  - la búsqueda de Mapbox sin país en vivo (el token solo responde desde el dominio);
  - el iPhone.

## Queda
- **Del gestor, con permiso del founder, en este orden:**
  1. aplicar la migración `20260917100000_zona_horaria.sql`;
  2. mezclar.

  El código lee `zona` y `termina`: sin la migración, las listas se quedan vacías.
- **La hora del recordatorio fuera de México (decisión del founder).** La tarea diaria corre a las 9:00 de San Luis: el plan gratuito de Vercel solo permite una vez al día, con una hora de margen. En otra zona, el recordatorio llega en el mismo instante (a las 17:00 en Madrid) para lo que empieza en las 24 horas siguientes. Ahora dice bien "Hoy" o "Mañana". Para que llegue a las 9:00 de cada zona hay dos salidas:
  - Vercel Pro, con la tarea cada hora;
  - hasta 24 tareas diarias en `vercel.json` (el plan gratuito deja 100), una por hora, cada una para las zonas donde son las 9:00. Pide separar la foto diaria de indicadores del panel, que va en la misma tarea.

  Mientras todo esté en México, no hace falta.
- **Por qué no se partió en dos**, como sugirió el gestor si crecía (alta sin filtro de México y columna, por un lado; cálculos por zona, por otro): abrir el alta a otros países sin los cálculos mostraría mal las horas de esos lugares mientras llega la segunda parte. Es justo lo que la 067 decidió evitar. Son 48 archivos, la mayoría pruebas y llamadas que ahora pasan la zona.
- **El lector de carteles** sigue diciendo "carteles de eventos culturales de San Luis Potosí, México" y calcula "hoy" con el reloj de México.
- **Pendiente para después, de la revisión del PR #78:**
  - en zonas al oeste de Greenwich con cambio de horario a medianoche (Santiago, La Habana), `terminaDe` y `termina` difieren una hora el día del cambio;
  - en Novedades, el "Hoy vas" de un evento al este de México sale bajo "Ayer" (`lib/novedades.ts`, que agrupa con el día de México);
  - agrupar por día eventos de varias zonas puede dar dos títulos "Hoy";
  - sin pin, el alta de lugar busca y abre el mapa en San Luis;
  - si se revierte el PR con la migración aplicada, lo que se cree en un lugar de otra zona queda corrido;
  - editar un evento viejo "en otro sitio" con el pin fuera de la zona de México cambia la hora a la vista sin tocar nada (hoy hay 0 así en producción);
  - en el formulario, `claveConZona` se marca antes de tener la respuesta de la zona y, si la petición falla, no se vuelve a pedir;
  - el panel cae en silencio a la hora de México si falla la lectura de zonas (no revisa `r.error`).
- **Lugares que ya existen:** todos quedan en la zona de la Ciudad de México. Uno en Cancún o Tijuana tomaría su zona al volver a guardarse.
- **De la 067, siguen siendo decisiones del founder:**
  - ciudades con el mismo nombre en el mismo país;
  - abrir en la ciudad aproximada de quien llega de fuera.
- **Hallado al probar la migración, fuera de esta pieza:** el administrador no puede dar de alta un lugar privado. La política de lectura de la 0024 no ve la fila recién creada cuando la app pide su id. Quedó como tarea aparte.

## Arreglos de la revisión del PR #78
El gestor hizo una revisión a fondo: cuatro lentes y cada hallazgo comprobado por un revisor escéptico. Pidió:
- **Importante: la cascada de zona conserva la hora a la vista.** `lugares_zona_a_sus_eventos` ya no mueve solo la zona. Convierte `inicio`, `fin` y `sitio_revelar_desde` con `timezone(nueva, timezone(vieja, hora))`, usando la zona que tenía cada evento. El disparador de eventos vuelve a poner la zona del lugar, que es la misma, así que no deshace nada.
- **Una sola zona en el formulario y en el servidor.** En otro sitio, el formulario leía las horas con la zona guardada, y el servidor, con la del pin. Editar un evento guardado antes de la migración con el pin en Madrid lo corría de hora y mandaba un aviso de cambio falso.
  - `lib/zona.ts` tiene ahora `zonaDelSitio`: la zona del punto, o de la dirección reservada, con la misma cuenta del servidor. Las páginas de editar y duplicar se la pasan al formulario.
  - El formulario pide la zona al servidor (`zonaDelPunto`) cada vez que cambia el pin: hoja o borrador.
  - La hora sugerida sigue a la zona del sitio mientras nadie la toque, al elegir un lugar o un pin. "Hoy/Mañana" y "Esa hora ya pasó" usan esa misma zona.
- **El panel escribe la hora de cada evento en su zona.** `panel_eventos` no devuelve la zona. `admin/consultas` la lee aparte, en tandas de 100, sin tocar SQL, y `detalleEvento` la pasa a `formatearCuando`.
- **El banco de la base, en el repo:** `supabase/tests/zona_horaria.mjs`, con la sesión en UTC (PGlite 0.5 toma la zona del sistema) y el caso de la cascada.

**Evidencia de los arreglos:**
- **Banco:** 42 comprobaciones en verde.
  - La cascada pasa por San Luis → Madrid → Bogotá → Monterrey: se conservan las 19:00, el fin a las 21:00 y la revelación a las 16:00, y `termina` se recalcula a la medianoche de cada zona.
  - Volver a guardar el lugar sin cambiar de zona no mueve nada.
  - **Con la migración de antes**, en una copia temporal, fallan justo las 4 comprobaciones de Madrid y Bogotá: «03:00» y `termina` corrido casi un día. Monterrey pasa por coincidencia (mismo desfase que México). Con `FORZAR_FALLO=1` el banco falla.
  - El banco del panel sigue en 95.
- **Pantallas a 390×844**, con el respaldo local y una sesión de administrador inventada, sin producción:
  - **"Editar evento"** de un picnic en el Retiro guardado con la zona de México: Cuándo dice "dom 20 de sep · 03:00", la hora de Madrid. Al pulsar "Guardar cambios", el servidor intentó guardar el mismo instante (`2026-09-20T01:00Z`) con la zona `Europe/Madrid`. El respaldo rechazó la escritura.
  - **"Publicar un evento"** en un lugar de Madrid, a las 22:38 del 16 en San Luis (6:38 del 17 en Madrid): sugiere "Hoy · 19:00" (el 17). Con el reloj de México habría dicho "Mañana".
- **Verificación:** lint (el aviso viejo), tipos, 278 pruebas y build en verde. Pruebas nuevas: la zona del sitio, y una hora del panel en Madrid.

## Segunda verificación del gestor (b3e9db6)
Confirmó que la cascada conserva la hora a la vista en 8 zonas seguidas, con medias horas y Lord Howe. Pidió dos arreglos antes de aplicar:
- **El hueco del cambio de horario en la cascada.** Convertir inicio y fin por separado podía romper `fin > inicio`. Pasaba cuando el inicio caía en el hueco de la zona nueva: las 02:30 del 29 de marzo no existen en Madrid, Postgres las pasa a las 03:30, y un fin a las 03:00 sí existe, así que quedaba antes. Como el disparador va dentro del guardado del lugar, se deshacía todo (punto, nombre…), también con eventos de otras personas. Ahora, si el fin convertido queda en o antes del inicio convertido, el fin es el inicio convertido más la duración original, contada en segundos.
- **El fin detrás de la hora sugerida.** Al cambiar de zona, `resugerir` movía solo el inicio. Si la sugerencia pasaba al día siguiente, el fin quedaba antes y el servidor rechazaba el evento. Ahora `resugerirCuando` (`lib/fechas.ts`, con pruebas) mueve el fin con la misma duración, como `SelectorCuando` al mover el inicio. El formulario solo cambia lo que siga igual a lo último que pintó.

**Evidencia:**
- **Banco de zona**, con `main` traído (#80 y #82): 31 migraciones y 44 comprobaciones en verde.
  - Un evento de 02:30 a 03:00 que se muda a Madrid el 29 de marzo: el guardado del lugar no se deshace, el inicio pasa a las 03:30 y el fin conserva la media hora (04:00).
  - Con el disparador anterior, en una copia temporal, fallan justo esas 2 comprobaciones (`violates check constraint "eventos_check"`).
- **Verificación:** lint (el aviso viejo), tipos, 280 pruebas y build; bancos en el orden de producción: lectura 42, autor 68, panel 95 y zona 44.
- **Prueba de la sugerencia:** a las 18:00 de Madrid, 19:00–21:00 pasa a mañana 19:00–21:00. Un fin que pasa la medianoche conserva sus horas, y no se toca lo que la persona cambió.
