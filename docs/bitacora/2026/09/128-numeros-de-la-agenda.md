# 128 · Números de la agenda que no cuadran (medición, sin tocar código)

**Fecha:** 2026-09-21 · **Rama:** `agenda-numeros` · **OL:** OL-093 · **Pieza:** A2 de la cola del gestor

## De dónde sale

L1 y L27 de la lista que el founder pegó el 2026-09-21 en «Gestor de cambios II»:

> L1: «Error en los números de coincidencias y publica la comunidad. Dice 1 y 2 respectivamente pero no muestra resultados al dar TAP. Me huele a una regresión, pues antes esos números eran correctos y luego al convertir a admins usuarios se fueron a 0. En todo caso, si se hubieran mantenido por estadística, deberían mostrar los eventos a los que se refieren. Revisa bitácora.»

> L27: «Evento de hoy con tres asistentes y destacado no salía en el slider.»

## La causa: el mismo defecto, no arreglado del todo, en dos sitios

La bitácora [101](../../2026/09/101-indicadores-rol-de-entonces.md) (OL-070, 2026-09-17) ya documentó este mecanismo: `indicadores_ahora()` y `panel_comunidad()` comparaban cada fila contra el rol de **hoy** de la cuenta (`perfiles.rol`), no contra el rol que tenía **cuando actuó**. Ascender a alguien borraba retroactivamente su actividad pasada de los indicadores. El arreglo fue la función `public.rol_en(perfil, fecha)` (migración `20260917170000_indicadores_rol_de_entonces.sql`), aplicada a `indicadores_ahora()` y `panel_comunidad()`.

Esa misma bitácora, en su sección «Otros tres lugares con el mismo patrón», **avisó y dejó sin tocar** tres sitios, entre ellos `tira_destacados()` — «un "voy" de alguien ascendido después deja de contar para lo destacado, aunque el evento siga igual de concurrido» — y no incluyó ahí `panel_eventos()`/`panel_fichas_conteos()`, que tienen el defecto gemelo.

**El contador y la lista, hoy, comparan con criterios distintos:**

| | Contador / carril | Lista / badge |
|---|---|---|
| «Publica la comunidad» (L1) | `indicadores_ahora()`, CTE `comunidad`: `rol_en(creado_por, creado_en) <> 'admin'` — el rol **cuando publicó** | `panel_eventos()` filtro `comunidad` y `panel_fichas_conteos()`: `p.rol <> 'admin'` — el rol **de hoy** |
| Carril de Destacados, por asistentes (L27) | — | `tira_destacados()`, CTE `voy`: `p.rol <> 'admin'` — el rol **de hoy** (nunca se arregló) |

Si alguien dijo «voy» o publicó siendo usuario y **después** lo ascienden a administrador, el contador (con `rol_en`) lo sigue contando correctamente, pero la lista o el carril (con `p.rol` de hoy) lo excluye — ahí es donde «el número dice 2 y no se ve nada», y donde un evento con 3 asistentes reales cae a 2 y desaparece del carril de Destacados aunque nada haya cambiado en el evento.

## Medido, no supuesto

**Producción (solo lectura, sin escribir nada):**
- `indicadores_ahora()` ahora mismo: `coincidencias: 0`, `comunidad: 2`.
- Los 2 eventos que cuenta «Publica la comunidad» (`rol_en` al momento de crearlos) son exactamente los mismos 2 que devolvería `panel_eventos(filtro='comunidad')` (`rol` de hoy): sus autores no han cambiado de rol desde que publicaron, así que hoy no hay discrepancia visible — el código sigue roto, solo que ningún autor de un evento de comunidad ha cambiado de rol *todavía*. Las dos cuentas que sí ascendieron (bitácora 101, 2026-09-17) no son autoras de ninguno de los 2 eventos actuales.
- Ningún evento de "hoy" (huso `America/Mexico_City`) tiene actualmente ninguna asistencia (`van_total: 0` en los dos eventos de hoy), así que el caso exacto de L27 no es reproducible en vivo ahora mismo; venía de una prueba anterior del founder.
- `cambios_de_rol` solo tiene 2 filas, ambas ascensos a administrador del 2026-09-17 (bitácora 101); ninguna baja de admin a usuario registrada — la sospecha del founder de que fue "admins a usuarios" no cuadra con el historial, pero el mecanismo real (usuario que asciende a admin) es el de la bitácora 101 y sigue vigente en dos funciones que ese arreglo no tocó.

**Reproducción limpia en PGlite (banco nuevo, ver «Verificación»):** evento de hoy, 3 personas dicen «voy» siendo usuarios normales, el fundador asciende a una de ellas a administrador **después**. Resultado:
- Las 3 asistencias siguen intactas en la tabla (`asistencias`, sin cambios).
- `tira_destacados('eventos', 'San Luis Potosí')` **antes** de ascender: `[{motivo: 'asistentes', van: 3}]` — el evento sale.
- `tira_destacados('eventos', 'San Luis Potosí')` **después** de ascender a una de las 3 personas: `[]` — el evento **desaparece del carril**, con `van` cayendo de 3 a 2 (bajo el umbral), aunque las 3 asistencias reales siguen ahí. Reproduce exactamente L27.

## Por qué no se tocó código de inmediato

La causa está en funciones SQL (`panel_eventos`, `panel_fichas_conteos`, `tira_destacados`), no en `src/lib`. Según el encargo, eso exige migración, y las migraciones las nombra y revisa el gestor. Se le pidió nombre de migración y visto bueno antes de escribirla. Respuesta del gestor: nombre reservado `supabase/migrations/20260921100000_rol_de_entonces_en_listas.sql`, con cuatro condiciones (ver abajo).

## L1, comprobado con la propia cuenta del founder (pedido del gestor)

El gestor pidió no dar L1 por explicado sin reproducir «1 y 2, y al tocar nada» con la cuenta real del founder. Localizado en el código: las tarjetas «Coincidencias» y «Publica la comunidad» se pintan en [`src/app/admin/Indicadores.tsx`](../../../../src/app/admin/Indicadores.tsx), con los datos que arma `indicadores()` en [`src/lib/panel.ts`](../../../../src/lib/panel.ts) a partir de `panel_resumen()` (RPC, `cargarResumen` en [`src/app/admin/consultas.ts`](../../../../src/app/admin/consultas.ts)). El primer toque abre el desglose de la misma tarjeta (sin navegar); el enlace «Ver los eventos de…» de ahí abajo navega a `/admin/eventos?filtro=semana` o `?filtro=comunidad`, que carga [`src/app/admin/[seccion]/page.tsx`](../../../../src/app/admin/%5Bseccion%5D/page.tsx) vía `cargarFichas` → RPCs `panel_eventos`/`panel_fichas_conteos`.

Con la identidad real del founder simulada en una transacción de solo lectura contra producción (`set_config('request.jwt.claim.sub', <su id>)`, sin escribir nada, `rollback` al final — nunca se leyó ni imprimió su correo ni ninguna llave), **ahora mismo** todo cuadra: `panel_resumen().ahora` da `coincidencias: 0, comunidad: 2`; `panel_fichas_conteos('eventos').comunidad` también da `2`; `panel_eventos(filtro='comunidad')` devuelve exactamente esos 2 eventos, no una lista vacía. Tampoco hay ningún UI bug: `leerLista`/`hrefLista` usan los mismos nombres de filtro (`FILTROS.eventos` en `panel.ts`) que `panel_eventos`, y la página no traga errores en silencio (`error` → `Reintentar`).

Es decir: el «1 y 2, nada al tocar» exacto **no es reproducible en vivo en este momento** — los números de ahora (0 y 2) no son los que él vio, y el número 2 de "comunidad" sí tiene su lista completa. Encontré, además, un candidato nuevo que no es el mecanismo de rol: `eventos_semana` = 39 pero `panel_eventos` pagina de 30 en 30 (`PAGINA_PANEL`); el enlace de «Coincidencias» va al filtro `semana` genérico (no a una vista de solo los eventos con 2+ voy — bitácora 101 ya dejó esa ambigüedad como pregunta abierta al founder), así que el evento concreto que motiva la tarjeta puede quedar fuera de la primera página sin "Ver más". No es "cero resultados", pero si el founder buscaba justo ese evento entre 30 sin encontrarlo, pudo sentirse como "no muestra nada". El mecanismo de rol de hoy vs. `rol_en` (que sí arregla esta migración) es real y medido con reproducción limpia, pero para el instante exacto que describe el founder no hay evidencia que lo confirme más allá de la lógica: alguna cuenta cuya actividad contaba para "comunidad" o "coincidencias" en ese momento pudo tener otro rol entonces del que tiene ahora, y `cambios_de_rol` no muestra ningún cambio reciente que lo explique — o el founder vio el hueco de paginación de arriba. Recomendación al gestor/founder: la próxima vez que pase, una captura con hora exacta cerraría la duda del todo.

## El tercer sitio que la bitácora 101 dejó sin tocar

La bitácora 101 (comentario de la migración `20260917170000`) nombra explícitamente dos sitios sin arreglar: el filtro `'nuevas'` de `panel_personas()` y `tira_destacados()`. Confirmado en el código: `panel_personas()` (`supabase/migrations/20260917100000_zona_horaria.sql`), filtro `'nuevas'`, seguía comparando `p.rol <> 'admin' and p.creado_en >= now() - interval '7 days'` — rol de **hoy**, no `rol_en(p.id, p.creado_en)`. Es la pantalla **Personas** (`/admin/personas`), no la agenda ni Destacados. El gestor pidió meterlo en esta misma migración («no merece pieza propia»), así que entra aquí (ver abajo), junto con `panel_personas_conteos()` (el badge del chip «Nuevas»), que tiene el mismo defecto exacto y no se menciona en el pedido del gestor pero es el mismo patrón que motiva toda la pieza: dejarlo suelto habría repetido L1 en una tercera pantalla.

## La migración

Nombre reservado por el gestor: `supabase/migrations/20260921100000_rol_de_entonces_en_listas.sql`. Cinco `create or replace function` más un ayudante nuevo, sin tocar tablas ni datos:
- `panel_eventos()`, case `'comunidad'`, y `panel_fichas_conteos()`, rama `'comunidad'`: `p.rol <> 'admin'` → `public.rol_en_para_admin(p.id, e.creado_en) <> 'admin'`.
- `tira_destacados()`, CTE `voy`: `p.rol <> 'admin'` → `public.rol_en(p.id, a.creado_en) <> 'admin'` (directo, es `security definer`).
- `panel_personas()`, filtro `'nuevas'`: `p.rol <> 'admin'` → `public.rol_en(p.id, p.creado_en) <> 'admin'` (directo, también `security definer`).
- `panel_personas_conteos()`, rama `'nuevas'`: mismo cambio (ampliación propia, ver arriba).

**Primera versión rechazada por el gestor:** propuse `grant execute on function public.rol_en(uuid, timestamptz) to authenticated`, para que `panel_eventos()`/`panel_fichas_conteos()` (que son `security invoker` desde el endurecimiento del Security Advisor, `20260918130000`, y por tanto corren con los privilegios de quien las llama) pudieran llamar a `rol_en()`. El gestor lo bloqueó: `rol_en()` lee `perfiles` y `cambios_de_rol` sin ninguna guarda de quién pregunta, así que ese grant habría dejado que cualquier cuenta con sesión preguntara por RPC el rol de cualquier otra en cualquier momento — justo lo que el Advisor cerró el 2026-09-18. **Corrección:** un ayudante mínimo, `public.rol_en_para_admin(p_perfil uuid, p_ts timestamptz)`, `security definer`, que solo delega en `rol_en()` cuando `public.es_admin()` es cierto (si no, devuelve `null`); `revoke ... from public, anon` y `grant ... to authenticated, service_role` solo sobre ese ayudante. `panel_eventos()`/`panel_fichas_conteos()` llaman al ayudante; `tira_destacados()` y `panel_personas()`/`panel_personas_conteos()` siguen `security definer` (el Security Advisor no los puso en `invoker`), así que llaman a `rol_en()` directo, sin necesitar el ayudante. Mismas firmas, mismo `security`/`search_path` que hoy en las cinco funciones (copiado de la definición vigente tras el Advisor, no de cuando se escribieron por primera vez; verificado línea por línea con `diff` contra los archivos de origen).

## Verificación

- **PGlite, banco nuevo** `supabase/tests/agenda_numeros.mjs`, aplicando las 44 migraciones en su orden real: reproduce L27 (evento de hoy, 3 «voy» de usuarios normales; se asciende a uno de ellos a admin después; `tira_destacados` mantiene `van: 3` y el evento sigue en el carril, con las 3 asistencias intactas), L1 (evento «de comunidad» publicado por una usuaria, se la asciende después; `panel_resumen().ahora.comunidad` no cambia, `panel_eventos(filtro='comunidad')` lo sigue mostrando, `panel_fichas_conteos` coincide con el número y el tamaño de la lista), el tercer sitio (`panel_personas`/`panel_personas_conteos`, filtro y badge `'nuevas'`, mismo patrón antes/después de ascender) y dos negativos pedidos por el gestor: `rol_en_para_admin()` devuelve `null` para una cuenta que nunca fue administradora, y `rol_en()` le sigue dando "permission denied" (el EXECUTE no se amplió a `authenticated`). **18 comprobaciones en verde.**
- Los bancos PGlite existentes que corren en este entorno siguen en verde tras la migración final: `destacados.mjs` (53/53), `panel_como_va.mjs` (7/7), `indicadores_rol_de_entonces.mjs` (27/27), `autor_y_visible_solo_admin.mjs` (68/68), `tope_de_lecturas.mjs` (34/34). `panel_administracion.mjs` y `zona_horaria.mjs` fallan con o sin esta migración (comprobado quitándola y volviendo a ponerla): errores de entorno ya existentes en este árbol de trabajo, ajenos a esta pieza.
- `npm run lint`: verde (1 aviso preexistente y ajeno). `npm run typecheck`: verde. `npm test`: **690 en verde, 7 en rojo** (mismos 7 preexistentes, `scripts/test-db.test.ts`, sin `pg` instalado en este árbol — ver abajo). `npm run build`: verde.
- Sin captura móvil: esta pieza no cambia ninguna pantalla, solo la comparación de rol dentro de cinco funciones SQL y un ayudante nuevo — igual que la bitácora 101, no aplica `front-visual`.

## Un aparte que el gestor pidió anotar: `panel_resumen()` es `volatile`

Al medir L1 con la identidad simulada del founder (ver abajo) llamé a `panel_resumen()`, que es `language plpgsql` sin `stable` (volatile por defecto) y escribe por dentro (`insert into indicadores_diarios (...) on conflict (dia) do nothing`). La llamada estaba dentro de mi `begin ... rollback`, así que no quedó nada escrito, pero no debí llamarla sin comprobar antes su volatilidad. El gestor lo confirmó y pidió dejarlo anotado aquí. Desde entonces, protocolo para cualquier lectura de producción: `begin ... rollback`, `set local role authenticated` + `set_config('request.jwt.claims'/'request.jwt.claim.sub', ..., true)`, comprobar `provolatile` en `pg_proc` antes de llamar cualquier función, y si es `volatile` probarla solo en PGlite, nunca en producción.

## Un aparte, fuera de esta pieza

Este árbol de trabajo no tenía el paquete `pg` instalado en `node_modules` (hacía falta para leer producción con Node); se resolvió apuntando `NODE_PATH` a `node_modules` de un árbol de trabajo hermano, solo para lectura, sin instalar nada nuevo aquí ni tocar la carpeta de otro chat más que para leer su `node_modules`. Es probablemente la misma causa de que `scripts/test-db.test.ts` falle en este entorno (usa `pg` vía `scripts/test-db.mjs`): no es un hallazgo de esta pieza, se anota para quien revise.
