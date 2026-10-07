# 355 · Panel de administración: KPI al día (OL-326)

**Fecha:** 2026-10-07 · **Rama:** `panel-kpi-al-dia`, desde `origin/main` · **Operador:** Claude Fable 5.1 (agente del Gestor de cambios IV) · **Migración:** `20261007090000_panel_fichas_y_aportes.sql` (solo añade; la aplica el gestor antes de desplegar).

## Pedido del founder (2026-10-07)

«Corregir panel de KPI de admin. Hay KPI que ya no se alimentan, ejemplo el de fichas reclamadas: como vinculamos directo, no crece ese número, solo el de artistas que llevan su ficha. Adicional, si ves prudente, agregar algún KPI adelante.»

## Qué pasaba

Una cuenta llega a llevar una ficha por cuatro caminos y solo uno deja un reporte `es_mio`:

| Camino | Qué deja en la base |
|---|---|
| Solicitud que aprueba la administración («Pasarle la ficha») | un reporte `es_mio` y, al aprobar, una fila en `artistas_cuentas` / `lugares_cuentas` |
| Correo ligado (OL-177, `reclamar_si_correo_coincide`) | solo la fila de vínculo; aprueba solo, sin reporte |
| «Soy yo / Es mi grupo» al darse de alta (OL-316, `crearArtista`) | solo la fila de vínculo, creada con la ficha |
| Vínculo que pone la administración | solo la fila de vínculo |

La cifra que ya no se alimenta era **«Solicitaron su ficha»** del bloque *Invitaciones CAPO* (`panel_capo().solicitaron_despues`: cuenta reportes `es_mio`). Los vínculos directos no la mueven; lo que sí crece es «Tienen una cuenta vinculada» y «llevados por su gente» (ambas leen las tablas de vínculo, así que cuentan todos los caminos). No existía un KPI con el nombre literal «fichas reclamadas»; el de las solicitudes es el que el founder describe.

## Auditoría de cada número del panel

«¿Vivo?» se comprobó contra los flujos de hoy: alta por pasos de evento, lugar y artista (OL-312 a 316), correo ligado, «Soy yo», sesiones por día (OL-311), horario de lugar (OL-315), cartel con tope (OL-307). La clase de evento (`clase`) **no está en main**: no hay nada que medir por clase.

| KPI | Fuente | ¿Vivo? | Qué pasa |
|---|---|---|---|
| Personas activas | `indicadores_ahora()`: `cuentas_vistas`, `novedades_vistas_en`, `last_sign_in_at`, `asistencias`, `seguimientos`, `lugares`/`eventos`/`artistas.creado_por`, `reportes` (menos `mas_lecturas`), con `rol_en` | Vivo | Quien hace cualquier cosa abre la app (`cuentas_vistas`), así que las acciones nuevas (novedades, obra colectiva, lectura de cartel) quedan cubiertas por «abrió la app». |
| Coincidencias | `eventos` próximos de 7 días + `asistencias` estado `voy` | Vivo | Las sesiones no cambian `inicio`/`fin` del evento: sigue midiendo igual. |
| Agenda de la semana / lugares con fecha | `eventos` (`visible`, `termina`, `inicio`), `lugares` visibles no privados | Vivo | Los negocios entran desde OL-315 (`cafe_bar`): suben «lugares», es lo esperado. |
| Publica la comunidad | `eventos` próximos con `creado_por` no administradora (`rol_en`) | Vivo | |
| Cómo va la comunidad (embudo) | `panel_comunidad()`: cuentas nuevas de 30 días, hicieron algo en su primera semana, siguen volviendo | Vivo | |
| Gestionar · Personas (nuevas, nunca entraron, correo con problema) | `perfiles`, `auth.users.last_sign_in_at`, `avisos_correo_motivo` | Vivo | |
| Gestionar · Lugares (sin fecha, ocultos, privados) | `lugares`, `eventos` | Vivo | |
| Gestionar · Eventos (sin imagen) | `eventos.imagen` | Vivo | El cartel del alta por pasos sigue guardándose en `imagen`. |
| Gestionar · Artistas (llevados, invitaciones, ocultos) | `artistas_cuentas`, `invitaciones_enviadas`, `artistas.visible` | Vivo | «Llevados» ya contaba todos los caminos (cualquier fila de `artistas_cuentas`). Solo falta decirlo y desglosarlo (ahora, en «Fichas vinculadas»). |
| CAPO · Fichas invitadas / sin cuenta al invitarlas | `invitaciones_enviadas`, `artistas_cuentas` | Vivo | |
| CAPO · **Solicitaron su ficha** | `reportes` `es_mio` posteriores a la invitación | **Torcido: ya no crece** | Los caminos directos no dejan reporte. **Se quita como cifra del bloque** y queda explicado en «Cómo se cuenta» (con el dato, como aparte). |
| CAPO · Tienen una cuenta vinculada | `artistas_cuentas` posteriores a la invitación | Vivo | Cuenta todos los caminos. Sin cambios en `panel_capo()` ni en su esquema. |
| Pendiente (reclamos y reportes) | `reportes` sin atender | Vivo | Solo las solicitudes que no coinciden con ningún correo llegan aquí; es lo esperado. |
| Ficha de persona: «Reclamos y reportes» | `reportes` de esa cuenta | Vivo | Es el historial de solicitudes de esa persona, no una cuenta de vínculos. |

## Qué se hizo

**Corregido**
- **Fichas vinculadas** (grupo nuevo «Fichas»): artistas y lugares con al menos una cuenta ligada, por cualquier camino; cada ficha cuenta una vez. Número, «12 artistas · 2 lugares», «▲ 3 más» frente a hace una semana y la línea de tendencia de 12 semanas, reconstruida de las fechas de los propios vínculos (no necesita foto diaria nueva). Al abrirlo: «3 por solicitud aprobada · 6 por correo ligado · 4 al darse de alta con «Soy yo» · 1 por otra vía · 500 artistas del catálogo por reclamar». Enlaza a la lista «Llevados por su gente». El texto del KPI dice lo que mide y que la vía se **deduce** (no se guarda).
- **CAPO:** «Solicitaron su ficha» sale de las cifras; «Cómo se cuenta» explica por qué y dónde está el desglose.

**Nuevos (tres, todos «por confirmar» por el founder; cada uno sale de datos que ya existen y son agregados)**
1. **Voy y Me interesa** (Últimos 7 días): veces que alguien dijo Voy o Me interesa en 7 días, sin administradores (rol de entonces), contra los 7 anteriores, con el desglose Voy / Me interesa. Sirve a que la gente se conozca: es la demanda detrás de «Coincidencias».
2. **Primera publicación** (Últimos 7 días): cuentas cuya primera publicación (evento, lugar o artista) cayó esta semana, contra la anterior. Sirve a registrar eventos y lugares: cuánta gente nueva pasa de mirar a publicar.
3. **Artistas con foto** (grupo «Fichas»): artistas visibles con foto y su porcentaje; enlaza a «Sin foto». Sin foto una ficha no entra en la tira de artistas destacados (`tira_destacados` pide foto). Sin flecha de cambio: no hay fecha de cuándo se puso una foto.

Layout: el mismo componente de indicadores del panel (mismos tamaños, flecha «▲ 3 más», sin verde ni rojo). «Últimos 7 días» pasa a 6 indicadores (3 filas) y «Fichas» es un grupo aparte de 2. La pieza `ui/Kpi` del brief es la de las fichas públicas (Costo, Van…); el panel nunca la usó (usa `.indicador` de `admin.module.css`), así que no se tocó.

**Cada lectura falla por separado:** `panel_aportes` y `panel_fichas` son funciones propias; si una no responde (o la respuesta no trae todos los números, `leerAportes`/`leerFichas` la rechazan), esa parte lo dice con «Intentar de nuevo» y el resto del panel se ve igual. Sin migración aplicada en producción, el panel sigue mostrando todo lo anterior y esos dos bloques avisan.

## Base de datos (solo añade)

Migración `20261007090000_panel_fichas_y_aportes.sql`: **dos funciones nuevas** de solo lectura, `security definer`, `search_path` vacío, guarda `auth.uid()` + `es_admin()`, `revoke … from public, anon` y `grant … to authenticated`. **No reemplaza ninguna función existente** (`panel_resumen`, `panel_comunidad`, `panel_capo` quedan intactas), no crea tablas ni columnas y no toca datos. Solo devuelven conteos: ni ids de personas ni correos.

La **vía se deduce**, no se guarda: reporte `es_mio` previo de esa cuenta sobre esa ficha → solicitud; ficha creada por esa cuenta en los 2 minutos previos al vínculo → alta; su correo coincide con el contacto que el CAPO capturó para esa ficha → correo ligado; lo demás → otra (típico: la administración la ligó). Se toma la vía de la **primera** cuenta que ligó la ficha.

## Pruebas

- `src/lib/panel.test.ts`: 38 pruebas (11 nuevas): textos, singular y plural, desglose por vía, cambio semanal (más, igual), sin vínculos (sin tendencia inventada), foto con y sin faltantes, nota del grupo, lectura de respuestas incompletas.
- `supabase/tests/pg/panel-fichas-aportes.test.mjs` (36 comprobaciones): un caso por cada vía (solicitud con reporte previo, correo con mayúsculas distintas, alta, administración) para artistas y lugares; la segunda cuenta de una ficha no la cuenta otra vez; una solicitud sin atender no cuenta como vínculo; serie de 12 semanas con fechas fijas; foto (con foto, vacía, oculta); Voy / Me interesa y primeras publicaciones con rol de entonces (cuenta ascendida hace un día: lo anterior cuenta, lo posterior no) y con la administración fuera; guardas (anon, usuario, sin identidad), flags de las funciones y que no salgan ids ni correos; y que la consulta de lectura del gestor dé lo mismo que las funciones. **Control negativo:** quitando la guarda de administración de las dos funciones, 4 comprobaciones fallan; restaurada, pasan. `security-advisor.test.mjs` suma las dos firmas (53) y las denegaciones.
- Verificación: `npm run lint` (0 errores; 1 aviso previo en `VisorImagen.componentes.test.mjs`) · `npm run typecheck` · `npm test` 2387 · `npm run inventario` sin novedades · `npm run medir` 29 pantallas × 4 anchos sin novedades (`/admin` no está en esa lista) · `npm run test:db` 83 migraciones, 1673 pruebas, 0 fallaron.

## Capturas (390×844 y 320, `docs/rediseno/capturas-355/`)

App compilada (`next build && next start -p 3111`) contra un respaldo local con datos inventados (`server.mjs 8852`, Ana como administradora; las funciones `panel_*` devuelven números de ejemplo con la forma real). Cada PNG se abrió y se miró:
- `355-390-01-panel-completo.png` y `355-320-01-panel-completo.png`: Pendiente; «Últimos 7 días» con 6 indicadores en 3 filas (los 4 de siempre con su tendencia y «▲ 7 más»; «Voy y Me interesa» 27 «▲ 8 más» y «Primera publicación» 3 «▲ 2 más», sin tendencia); Cómo va la comunidad; grupo «Fichas» con «Fichas vinculadas 14, 12 artistas · 2 lugares, ▲ 3 más» con su línea y «Artistas con foto 56, de 561 artistas visibles · 10 %»; CAPO con una sola cifra («Tienen una cuenta vinculada 9, 7.6 %»); Gestionar. Sin desbordes: ancho de documento igual al de la ventana en 390 y 320; todos los indicadores del mismo ancho (171 / 136 px) y el mismo alto por fila.
- `355-390-02` y `355-320-02-fichas-vinculadas-abierto.png`: el desglose lila bajo la fila de «Fichas»: la explicación, las cinco líneas por vía y «Ver los artistas llevados ›».
- `355-390-03` y `355-320-03-voy-abierto.png`: «Voy y Me interesa» abierto: «20 Voy · 7 Me interesa · 19 en los 7 días anteriores».
- `355-390-04` y `355-320-04-capo-como-se-cuenta.png`: «Cómo se cuenta» abierto, con el párrafo nuevo de los caminos y el dato de las solicitudes a mano.
- Dos ajustes salieron de mirar la primera tanda: el porcentaje «10 %» quedaba solo en una línea (ahora con espacio de no ruptura) y «Publican por primera vez» ocupaba dos líneas y desalineaba los números de su fila (ahora «Primera publicación»).

## Decisiones por confirmar (founder)

1. **Los tres KPI nuevos** (Voy y Me interesa, Primera publicación, Artistas con foto): ¿se quedan, se quita alguno, o se cambia por otro?
2. **Guardar la vía exacta.** Hoy se deduce y es una inferencia (una ficha ligada por la administración sin solicitud y cuyo correo no coincide cae en «otra vía»). Guardarla exacta pide una columna `via` en `artistas_cuentas` y `lugares_cuentas` y tocar los tres sitios que insertan (`crearArtista`, `reclamar_si_correo_coincide`, «Pasarle la ficha»). Requiere su decisión.
3. **Lugares.** Al dar de alta un lugar no se liga la cuenta (la autoría ya da el mando), así que «lugares vinculados» solo crece por solicitud aprobada o por la administración. ¿Debe contar también el lugar que publicó una cuenta que no es de administración? Hoy no.
4. **Cuentas de administración.** «Fichas vinculadas» cuenta una ficha ligada a una cuenta de administración igual que a cualquier otra (igual que «llevados por su gente» y que la lista «Llevados»). Si prefiere no contarlas, hay que cambiar también esa lista.

## Quedó fuera (límite de tres nuevos o requiere guardar datos nuevos)

- **Lugares con horario** (OL-315): candidato natural, un conteo de `lugares_horarios`; fuera por el tope de tres.
- **Eventos publicados por pasos y cuántos con cartel leído:** no se puede medir sin guardar un dato nuevo por evento (el alta por pasos no deja marca y `lecturas_cartel` solo guarda quién y cuándo, sin ligar el evento). **Requiere decisión del founder.**
- **Eventos por clase** (puntual, exposición, taller, festival): `clase` no está en main.
- Las lecturas de cartel por semana (conteo de `lecturas_cartel`) se pueden sumar cuando se quiera; sirven más al costo que a «que la gente se conozca».

## Para el gestor

**Antes de desplegar:** aplicar la migración `20261007090000_panel_fichas_y_aportes.sql` (solo añade; sin ella, el panel muestra «No pudimos leer…» solo en esos dos bloques). Sin variables nuevas. Nada que hacer en Vercel.

**Lectura de producción** (opcional, para saber con qué números nace): `scripts/ops/panel-fichas-lectura.sql`, un solo `SELECT` sin sesión de administración que da los mismos conteos que las dos funciones (fichas ligadas por vía, solicitudes `es_mio` en total / sin atender / de los últimos 30 días, artistas con foto, Voy y Me interesa, primeras publicaciones). No escribe ni devuelve ids ni correos; una prueba de base compara su resultado con las funciones. Con esas cifras se puede confirmar el diagnóstico: solicitudes `es_mio` en los últimos 30 días cerca de cero frente a fichas ligadas en los últimos 7 días mayor que cero.
