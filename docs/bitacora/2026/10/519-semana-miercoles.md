# 519 · La semana de Instagram se arma sola los miércoles (OL-487)

**Pieza:** OL-487. **Rama:** `semana-miercoles`, base `origin/main` (`88f59b4a`, con OL-479 unido). **Fecha:** 2026-10-29. **Operador:** agente del
Gestor de cambios VII (Opus 5.5, árbol aislado, sin otros agentes).
**Manda:** la decisión del founder sobre la pregunta 1 de la bitácora 511: aceptó la recomendación de que la semana se arme sola los miércoles,
reutilizando el latido que ya existe, **sin cron nuevo**.
**Estado:** hecho, con **una migración** (`20261029230000_semana_miercoles.sql`) y **sin variables nuevas**. Espera revisión del gestor y el
«publica» del founder (aplicar la migración antes de desplegar). No toqué producción, `.env` ni `main`.

Términos (una línea cada uno):
- **Latido:** una tarea de Supabase que corre cada minuto y, si hay algo que hacer, llama a una ruta de la app.
- **La que viene:** la semana de lunes a domingo que sigue a la actual, en la hora de la ciudad.
- **Idempotente:** hacerlo dos veces deja lo mismo que hacerlo una.

## 1. Qué latido y por qué

**`redes-latido`** (OL-465), no `rutinas-latido` (OL-444):
- Ya corre cada minuto y llama a `/api/redes/correr`, la ruta que trabaja la cola de Instagram con la llave de servicio. Lo que arma la semana son
  justo trabajos de esa cola (cada día queda en `redes_trabajos` a su hora): el mismo lugar, la misma ruta, los mismos registros.
- `rutinas-latido` mueve las corridas de rutinas (búsquedas con costo en dólares, propuestas de Ciudades): mezclar ahí la semana de Instagram
  ataría dos cosas que se pausan por separado (`select cron.unschedule('redes-latido')` sigue pausando todo lo de redes, ahora también esto).
- El latido solo llama a la ruta si hay algo vivo (`redes_vivos() > 0`). Por eso lo único que se cambia es `redes_vivos()`: suma las ciudades a
  las que toca armar la semana. Sin ciudades por armar cuenta exactamente lo mismo que antes. Sin `cron.schedule` nuevo.

## 2. Qué hace

- **Cuándo:** un miércoles entre las 9:00 y las 9:59 de la hora de cada ciudad (`ciudades.zona`), a una ciudad **abierta** que tiene **eventos la
  semana que viene** (que empiezan o siguen esa semana) y a cuya semana que viene **le faltan días**. Lo decide la base para despertar al latido
  (`instagram_semana_por_armar(p_ahora)`) y lo vuelve a comprobar la app con el reloj (`tocaArmarLaQueViene`, en `src/lib/instagram/semana.ts`):
  las dos reglas van juntas y lo dicen sus comentarios.
- **Con qué:** la misma función que la pestaña. `cargarSemana` (la pestaña) ahora llama a `armarLoQueFalta(cliente, ciudad, cual, ahora)`, que lee
  los días guardados, arma los que faltan con `armarSemana` y los guarda con `instagram_semana_guardar`. El latido (`armarLasQueVienen`, en
  `src/app/admin/instagram/semana.ts`) llama a esa misma `armarLoQueFalta` con `"viene"`. Nada de la regla está copiado.
- **A nombre de quién:** las funciones de la semana solo responden a la administración (`es_admin()`), y el latido entra con la llave de servicio.
  En vez de copiar su lógica, `instagram_semana_latido(p_funcion, p_args)` llama `instagram_candidatos`, `instagram_sugerencias` o
  `instagram_semana_guardar` tal cual, como si la sesión fuera la de una cuenta de la administración (como `aceptar_propuesta_como`, OL-453): quien
  conectó Instagram; si no, quien tocó la semana por última vez; si no, la más antigua (`instagram_semana_quien_arma`). Del lado de la app,
  `comoAdministracion(db)` manda esas tres por ahí y deja leer las tablas tal cual. Así, lo que se guarda lleva su nombre (`actualizado_por`) y el
  aviso al teléfono de cuando salga cada día le llega a esa cuenta (`pedido_por`), igual que si hubiera abierto la pestaña.
- **Idempotente:** si la que viene ya tiene sus siete días (la armó la pestaña u otra vuelta del latido), no se hace nada; un día que ya tiene su
  fila nunca se toca (`on conflict do nothing` y el candado por ciudad de `instagram_semana_guardar`). Con la semana completa la ciudad deja de
  contar y el latido deja de llamar por ella.
- **Si falla:** la ruta lo anota donde ya anota las fallas de la cola que no son de un trabajo: sus registros de Vercel, con el prefijo de la cola
  («redes: no se pudo armar la semana que viene de Instagram de `<ciudad>`; lo reintenta el latido»): solo el nombre corto de la ciudad, sin
  secretos ni datos de personas. Sigue con la siguiente ciudad y luego con la cola; nunca tumba la llamada. Mientras dure la hora, el latido lo
  vuelve a intentar cada minuto.
- **Un arreglo de paso (también para la pestaña):** antes, si la base no contestaba los candidatos, `candidatos()` devolvía una lista vacía y la
  semana se guardaba con siete descansos para siempre. Ahora `llenar` distingue «la base no respondió» y en ese caso no guarda nada (la pestaña
  enseña los días como «No se programó» y lo reintenta al volver a abrirla; el latido, al minuto). `candidatos()` sigue igual para quien la usa.
- **La ruta** (`src/app/api/redes/correr/route.ts`): una vez por llamada, antes del primer trabajo, `armarLasQueVienen(db, new Date())`. No toqué
  `src/lib/redes/trabajar.ts`.
- **La portada de Administración:** el renglón de Instagram suma, tras «Semana: N de M programadas», lo de la que viene
  (`lineaDeLaQueViene`): **«la que viene, armada el mié 7»** (el día en que se guardó su primer día, la armara el latido o la pestaña); sin armar,
  **«la que viene se arma el miércoles»** hasta las 9:59 del miércoles; y si a las 10:00 sigue sin armarse, **«la que viene no se armó»** (toca
  abrirla). Si la semana actual no tiene días, dice solo lo de la que viene («Semana: la que viene se arma el miércoles»).

## 3. La migración (`20261029230000_semana_miercoles.sql`)

- **Lo único que se cambia:** `redes_vivos()` (misma firma; `create or replace` conserva sus permisos: solo su dueño) suma
  `instagram_semana_por_armar(now())`. Ninguna fila cambia.
- **Solo añade:** `instagram_semana.armada_por` (nula; `pestana` o `latido`; las filas de antes quedan en null; su valor por omisión es `pestana`
  salvo dentro de `instagram_semana_latido`, que marca su transacción con `somosnosotros.armada_por = latido`); `instagram_semana_por_armar`
  (solo `service_role`); `instagram_semana_quien_arma` (interna); `instagram_semana_latido` (solo `service_role`, solo esas tres funciones). Todas
  definer con `search_path = ''`. El cálculo de la hora se hace primero sobre la tabla de ciudades (una decena de filas) y solo mira eventos en la
  hora del miércoles: el resto de los minutos de la semana cuesta lo mismo que antes.

## 4. Comprobado

- `npm run lint`: 0 errores (los 2 avisos son de archivos ajenos). `npm run typecheck`: limpio.
- `npm test`: **5 054 de 5 054** (313 archivos). Nuevas: `src/app/admin/instagram/semana.test.ts` (6, **con el reloj fijo**: **miércoles 9:30 de
  San Luis sin armar → arma los siete días** a nombre de la administración y todo pasa por `instagram_semana_latido`; **jueves 9:30 → no**, aunque
  la base dijera lo contrario; **miércoles 9:30 ya armada → no** y ni siquiera pide candidatos; dos vueltas seguidas guardan una vez; una ciudad
  que falla se anota y la siguiente se arma; la base sin respuesta no arma nada) y 3 en `src/lib/instagram/semana.test.ts` (la hora: 9:00 y 9:59
  sí, 8:59 y 10:00 no, martes y jueves no, la zona de cada ciudad; la línea de la portada en sus tres formas).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **123 migraciones, 2 885 pruebas, 0 fallaron**; con `FORZAR_FALLO=1`
  sale 1 (control negativo). Banco nuevo `supabase/tests/pg/semana-miercoles.test.mjs`: qué ciudades le tocan (miércoles 9:00, 9:30 y 9:59 sí;
  8:59, 10:00, martes y jueves no; Madrid a las 9:30 de Madrid y no a las de San Luis; una ciudad detectada no; una sin eventos no); que visitantes,
  cuentas y la administración no la llaman; que `instagram_semana_latido` devuelve los mismos candidatos y eventos, en el mismo orden, que la
  administración, rechaza cualquier otra función y no la llaman visitantes ni cuentas; que lo que guarda queda `armada_por = latido`, a nombre de
  la administración, con el trabajo en la cola a su nombre; que otra vuelta guarda 0 y la ciudad deja de contar; que no deja sujeto ni marca
  puestos; que la pestaña guarda `pestana` a nombre de quien la abrió; el `check` de `armada_por`; a nombre de quién (conexión, si no la última);
  que `redes_vivos` cuenta las ciudades; y definer, `search_path` y permisos.
  En `redes-en-cola.test.mjs`, una línea: dentro de su transacción (que se deshace) las ciudades abiertas pasan a cerradas antes de «sin trabajos
  listos, el latido no llama a nada», para que esa prueba no falle si alguien la corre un miércoles a las 9 de la mañana.
- `npm run inventario`: sin novedades. `npm run medir` (62 pantallas × 4 anchos): **sin novedades** (s45, la portada, igual: el texto es más largo,
  los nodos no cambian).
- `npm run build` en verde (lo compilan `medir` y el recorrido).
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-semana-miercoles.mjs . <carpeta>`: la app compilada contra el respaldo con el
  reloj fijo el **miércoles 7 de octubre a las 9:30 de San Luis**, el trabajador de verdad llamado como lo llama el latido, con el secreto; Chrome
  real a 2×): **11 de 11, sin errores de página ni de consola** (`capturas-519/recorrido.txt`): antes, la que viene sin días y la portada «se arma
  el miércoles»; tras el latido, **siete días armados por el latido** (lunes artista, martes descanso, miércoles lugar, jueves «Esta semana»,
  viernes artista con fecha el fin, sábado evento, domingo descanso), cada día que publica en la cola, y la portada «armada el mié 7»; otra vuelta
  del latido no cambia nada; la pestaña «La que viene» enseña lo armado y no vuelve a armar; el renglón sin textos cortados ni desplazamiento a lo
  ancho. El respaldo local suma `instagram_semana_por_armar`, `instagram_semana_latido` y `armada_por` (en corto; las reglas reales, en el banco).

## 5. Capturas (`docs/rediseno/capturas-519/`, 390 × 844, cada una abierta)

- `01-portada-se-arma`: la portada de Administración, renglón de Instagram: «@smsnstrsapp · 4 publicadas esta semana · 1 en Facebook · 14 por
  publicar · Semana: 2 de 2 programadas · la que viene se arma el miércoles» (la última parte en su propia línea, sin cortarse).
- `02-portada-armada`: lo mismo tras pasar el latido: «… · Semana: 2 de 2 programadas · la que viene, armada el mié 7».
- `03-la-que-viene`: Administración › Instagram › «La que viene» (San Luis Potosí): «5 programadas · 3 por avisar · el domingo descansa», «Del 12 al
  18 de octubre · 7 días»: el Colectivo Nube de Papel (lun 12, Programado, Falta avisarle), el martes que descansa («No hay eventos ese día»), el
  Museo Leonora Carrington (mié 14), «Del viernes 16 al domingo 18» (jue 15, carrusel de 4) y Valeria Quiroz (vie 16): lo que armó el latido sin
  que nadie abriera la pestaña.

## 6. Decisiones del operador (para el gestor)

1. **`redes-latido`** y no `rutinas-latido` (sección 1).
2. **«Ciudad con eventos»** = abierta en Administración › Ciudades y con al menos un evento visible que empieza o sigue la semana que viene. Una
   ciudad detectada, investigando o cerrada no se arma sola (aunque tenga eventos); la pestaña sí la arma al abrirla, como antes.
3. **A nombre de quién:** quien conectó Instagram (OL-471); si no, quien tocó la semana por última vez; si no, la cuenta de administración más
   antigua. A esa cuenta le llegan los avisos al teléfono de cuando sale cada día.
4. **Reintentos:** si falla, cada minuto hasta las 9:59 (hasta 60 intentos, un renglón de registro por intento). Después la portada dice «la que
   viene no se armó» y se arma al abrir la pestaña. No guardé las fallas en la base: no hay tabla de fallas de la cola que no sean de un trabajo, y
   la portada ya lo dice sola.
5. **La portada** usa la fecha del primer día guardado de la que viene, la armara quien la armara (la pestaña o el latido), con el día de la ciudad
   («mié 7»), sin «hoy».
6. `armada_por` queda para comprobar en producción quién la armó; la pantalla no lo enseña.

## 7. Qué quedó fuera

- Avisar al teléfono cuando el latido arma la semana (hoy solo lo dice la portada).
- Que el latido arme también «esta semana» si nadie la abrió (solo arma la que viene, como pide el encargo).

## 8. Lo que el gestor debe probar en producción

1. Aplicar `20261029230000_semana_miercoles.sql` antes de desplegar (va después de `20261029200000_instagram_semana.sql`).
2. Sin esperar al miércoles: `select * from public.instagram_semana_por_armar((date_trunc('week', now() at time zone 'America/Mexico_City')::date + 2 + time '09:30') at time zone 'America/Mexico_City');`
   debe dar San Luis Potosí (si tiene eventos la semana siguiente y no está armada); con `time '10:00'`, nada.
3. El miércoles después de las 9:00 de San Luis: `select fecha, tipo, armada_por from public.instagram_semana where ciudad = 'san-luis-potosi' order by fecha desc limit 7;`
   debe dar la que viene con `armada_por = latido` (o `pestana` si alguien abrió la pestaña antes). La portada de Administración: «la que viene,
   armada el mié …».
4. Si no se armó: los registros de Vercel de `/api/redes/correr` con «redes: no se pudo armar…».

## 9. Preguntas al founder (frases llanas)

1. La semana se arma sola en **cada ciudad abierta que tenga eventos** la semana que viene (hoy pueden ser San Luis Potosí, San Miguel de Allende y
   las que abras). Cada una publica en @smsnstrsapp a las mismas horas (7:00 pm y 9:00 am). ¿Así, o solo San Luis por ahora?
2. Si un miércoles no se pudo armar sola, la portada dice «la que viene no se armó» y se arma cuando abres la pestaña. ¿Te basta, o quieres un aviso
   al teléfono?
