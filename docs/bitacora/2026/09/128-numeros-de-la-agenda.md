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

## Por qué no se toca código todavía

La causa está en funciones SQL (`panel_eventos`, `panel_fichas_conteos`, `tira_destacados`), no en `src/lib`. Según el encargo, eso exige migración, y las migraciones las nombra y revisa el gestor. Se le pidió nombre de migración y visto bueno antes de escribirla (mensaje aparte).

## Qué falta, una vez con nombre de migración

- Cambiar `panel_eventos()` (case `'comunidad'`) y `panel_fichas_conteos()` (rama `'comunidad'`) para comparar con `rol_en(creado_por, creado_en)` en vez de `p.rol`/`perfiles.rol`, igual que ya hace `indicadores_ahora()`.
- Cambiar `tira_destacados()`, CTE `voy`, para comparar con `rol_en(usuario_id, asistencias.creado_en)` en vez de `p.rol`.
- Banco PGlite dedicado (o ampliar `panel_administracion.mjs`/`destacados.mjs`) con el caso de arriba como prueba de regresión permanente.
- Confirmar que el número y la lista/carril, tras el arreglo, salen del mismo criterio en los tres sitios.
