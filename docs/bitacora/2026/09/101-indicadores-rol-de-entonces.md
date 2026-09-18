# 101 · El rol de entonces, no el de hoy

**Fecha:** 2026-09-17 · **Rama:** `indicadores-rol-de-entonces`, desde `origin/main` a59d676 · **OL:** OL-070 · **PR:** pendiente

## De dónde sale

El founder revisó `/admin` después de que "Cómo va la comunidad" quedó en producción y reportó: «Los números de coincidencias y publica la comunidad en administración no me cuadran». Investigando el código (sin poder leer producción desde este árbol de trabajo), encontré que "Coincidencias" a propósito no cuenta el «voy» de una cuenta administradora (N2, documento 18) — pero el conteo por evento que se ve en la lista a la que lleva la tarjeta sí cuenta a todos, lo que puede parecer inconsistente si el founder prueba la app con su propia cuenta.

Gestión de cambios confirmó esa hipótesis en producción, y de paso confirmó que "Publica la comunidad" marcaba **0**, pero lo leyó como el valor correcto («todavía no ha publicado nadie que no sea administración»). Se lo dije al founder así.

El founder contestó:

> «No es correcto, hay por lo menos 2 publicaciones de comunidad, aunque a ver, las hizo un usuario que acabo de convertir en Admin, ¿eso las eliminó?»

Sí. Gestión de cambios lo confirmó en producción: a las 20:26 UTC de hoy se ascendieron 2 cuentas a administradoras, y lo que esas cuentas habían hecho antes de serlo dejó de contar: 2 eventos, 1 lugar, 3 artistas y 1 «voy». Y `panel_comunidad()` (el embudo "Cómo va la comunidad") tenía el mismo defecto: las dos cuentas se dieron de alta en los últimos 30 días, así que también desaparecieron de "se registraron" y de "hicieron algo".

## La causa

`indicadores_ahora()` y `panel_comunidad()` decidían quién es administrador con una consulta al rol de **hoy** (`perfiles.rol`), aplicada sobre filas de cualquier fecha (eventos publicados hace semanas, "voy" de hace días, el alta de una cuenta hace 20 días). Ascender a alguien cambia su rol de hoy, así que de un momento a otro toda su actividad pasada deja de contar — no porque la actividad haya cambiado, sino porque cambió quién es hoy.

N2 del documento 18 («los indicadores de la comunidad no cuentan a los administradores») dice, en sus propias palabras, por qué: «si no, tu propia actividad infla todo». Es una regla sobre la actividad de un administrador **mientras lo es** — no sobre borrar del registro lo que alguien hizo antes de serlo.

## Instrucciones de gestión de cambios

Rumbo: «el rol de entonces, no el de hoy». Números: rama `indicadores-rol-de-entonces` desde el `origin/main` del momento (a59d676), bitácora **101**, **OL-070**, migración `20260917170000_indicadores_rol_de_entonces.sql`. `cambios_de_rol` (de la migración del panel, 20260917090000) ya guarda cada cambio real de rol con su fecha — sale sin ningún dato nuevo que guardar. Condiciones: arreglar `indicadores_ahora()` (comunidad, coincidencias y su desglose) y `panel_comunidad()` (el embudo) en la misma migración; si aparecía otra función con el mismo patrón (rol de hoy sobre datos históricos), avisar antes de tocarla; banco PGlite con, como mínimo, una cuenta que publicó antes de ser admin y cuenta, lo que publicó después y no cuenta, una cuenta de origen que nunca cuenta, el mismo juego para «voy»/coincidencias, y el embudo con una cuenta ascendida dentro de los 30 días, con su control negativo; decir en la bitácora que los números del founder van a cambiar al mezclar («Publica la comunidad» deja de ser 0); commit local, sin push — la migración la revisa y la aplica gestión de cambios.

## Qué se hizo

- **`public.rol_en(perfil, fecha)`** (función nueva, `security definer`, sin permiso para nadie salvo otras funciones `security definer`): el rol de una cuenta en un momento dado. Como el rol es binario (`admin`/`usuario`), antes de su primer cambio registrado en `cambios_de_rol` la cuenta tenía el rol contrario a ese cambio; sin ningún cambio registrado, el rol de hoy vale para cualquier fecha (una cuenta de origen, o una que nunca cambió — así lo confirmó gestión de cambios: «las cuentas admin sin historial son las de origen»).
- **`indicadores_ahora()`:** la CTE `admins` (quién es administrador hoy) se quita; `van` (quién dijo «voy», para Coincidencias) y `comunidad` (quién publicó, para Publica la comunidad) comparan cada fila contra `rol_en(quien, la_fecha_de_esa_fila)` en vez de contra el rol de hoy. `con_2`, `con_3_a_5`, `con_6_o_mas`, `mayor` y `personas_que_publican` heredan el arreglo sin tocarlos, porque parten de `van`/`comunidad`. El resto de la función —"Personas activas", "cuentas", la agenda— no se tocó.
- **`panel_comunidad()`:** `nuevas` compara el rol de cada cuenta contra su propio `creado_en` (el rol que tenía al registrarse), no contra el de hoy. `hizo_algo`, `con_edad` y `volvio` ya parten de `nuevas`, así que heredan el arreglo también sin tocarlos.
- **Otros tres lugares con el mismo patrón, encontrados al revisar todas las funciones que comparan contra `rol = 'admin'`/`rol <> 'admin'`, reportados a gestión de cambios pero sin tocar** (fuera del encargo, a la espera de decisión):
  - `gente`/`senales` de `indicadores_ahora()` (el indicador "Personas activas"): ascender a alguien lo saca por completo de "activas" aunque haya abierto la app o dicho "voy" esta semana antes de ser admin.
  - `personas_nuevas` en `panel_resumen()` y el filtro `'nuevas'` de `panel_personas()`: mismo mecanismo sobre altas de cuenta de los últimos 7 días.
  - `tira_destacados()` (migración de destacados, la tira pública de "lo que tiene más asistentes" en Agenda/Lugares/Artistas): un «voy» de alguien ascendido después deja de contar para lo destacado, aunque el evento siga igual de concurrido.

## Verificación

- **Banco nuevo**, `supabase/tests/indicadores_rol_de_entonces.mjs`: una cuenta (Ascendida) publica un evento y dice «voy» en otro **antes** de ser administradora, la ascienden (con `cambiar_rol`, y el registro de `cambios_de_rol` movido a mano a hace 10 días, igual que se mueve `perfiles.creado_en` en los otros bancos), y publica otro evento y dice «voy» en otro **después**. Un admin de origen (sin fila en `cambios_de_rol`) publica y dice «voy» también, como control de que nunca cuenta. **15 comprobaciones en verde:** `rol_en` directo (antes/después/de origen/nunca cambió), `comunidad` con solo lo de antes de ascender, `coincidencias` con solo el evento con 2 «voy» de antes, el desglose, y el embudo con la cuenta ascendida en "registradas" y "hicieron_algo".
- **Control negativo** (a mano, sin comitear): `rol_en` mutado para ignorar la fecha y devolver siempre el rol de hoy —reproduce el error tal cual—, y el banco falla exactamente en las 7 comprobaciones que dependen del arreglo (comunidad, coincidencias, desglose, registradas, hicieron_algo), con los mismos síntomas que reportó el founder (comunidad y coincidencias en 0). Restaurado desde respaldo y confirmado idéntico; el banco vuelve a sus 15 en verde.
- Los 5 bancos PGlite que ya existían, con las 34 migraciones (la nueva incluida): `panel_administracion.mjs` 95/95, `panel_como_va.mjs` 7/7, `autor_y_visible_solo_admin.mjs` 68/68, `destacados.mjs` 53/53, `zona_horaria.mjs` 44/44 — sin ninguna comprobación rota por el cambio (revisado a mano: ninguna de sus pruebas de coincidencias/comunidad involucra una cuenta que cambió de rol antes de esa comprobación).
- `npm run lint && npm run typecheck && npm test`: verdes, **353 pruebas**, sin cambios en `src/` (la pieza es solo SQL).
- `npm run build`: verde.

Sin captura móvil: esta pieza no cambia ninguna pantalla, solo los números que ya se calculaban — no aplica `front-visual`.

## Pendiente

- Mandar el hash a gestión de cambios para que revise la migración, la aplique y suba la rama.
- Cuando esté en producción, confirmar con el founder que "Publica la comunidad" y "Coincidencias" ya reflejan lo de antes de ascender a las dos cuentas.
- Preguntarle al founder si, además de este arreglo, quiere que la pantalla explique la diferencia entre la tarjeta de "Coincidencias" y la lista de eventos a la que lleva (las dos opciones que se le propusieron antes de este hallazgo siguen sin elegir).
- Decidir, con gestión de cambios, si los otros tres lugares con el mismo patrón (Personas activas, personas nuevas, destacados por asistentes) se corrigen igual.
