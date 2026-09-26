# 253 · Tus planes al instante (OL-224)

**Fecha:** 2026-09-26 · **Rama:** `tus-planes-al-instante`, desde `origin/main` (92fb7b27) · **OL:** OL-224 · **Modelo:** Sonnet 5. Sin subagentes, council ni workflows.

## Pedido

OPEN_LOOPS, OL-224. Founder, en producción: «Cuando pongo que voy en un evento destacado, no se visualiza de inmediato en "tus planes" tengo que entrar a otra sección y regresar».

## Lo que ya había

`CarrilTusPlanes.tsx` (servidor) arma «Tus planes» con `carrilTusPlanes()` (`lib/inicio.ts`, Voy + Me interesa por fecha) y se lo pasa a `CarrilEventosCliente`, el mismo componente que usan Destacados/Seleccionados, Esta semana, Populares y Nuevos. Desde OL-212 (PR #257), Voy/Me interesa desde una lista guarda con `diferir: true` (revalidación aplazada con `after()`, para no repintar la fila donde se tocó) y desde OL-222 (bitácora 251) `lib/decisionesVisita.ts` corrige el estado que muestra cada renglón con lo decidido en esta visita, comparando contra lo que trae el servidor — pero su encargo pedía explícitamente «no añadas tarjetas nuevas a Tus planes desde el cliente»: una tarjeta recién decidida en OTRA fila no aparecía en Tus planes hasta la próxima visita fresca (más de 60 s, o una navegación que no fuera Atrás). Eso es exactamente el bug de hoy.

## El arreglo

**Agregar la tarjeta, no solo corregir el estado.** `guardarDecisionAsistencia` (`lib/decisionesVisita.ts`) gana un quinto parámetro opcional, `tarjeta: TarjetaConFecha | null` — la foto mínima de la tarjeta decidida (id, href, foto, título, detalle, van, reciente, y ahora también `inicio`/`fin`/`zona`, nuevos en `TarjetaConFecha`, `lib/destacados.ts`, para poder ordenar y saber si el evento sigue vigente sin volver a pedirle nada al servidor). Se guarda junto con la decisión, y se conserva aunque un toque posterior no traiga una tarjeta fresca (cambiar Voy → Me interesa, o un Deshacer que repite el mismo toque, no deben perderla).

`tarjetasTusPlanes(cuenta, servidor, ahora)` (nueva, pura) agrega, al final de lo que ya trae el servidor y en su lugar por fecha (`compararEventos`, el mismo orden de agenda), las tarjetas guardadas cuyo evento el servidor todavía no incluye — solo si siguen vigentes (`eventoPaso`, el mismo criterio que el resto de la app: con hora de fin o, sin ella, hasta acabar el día). Una página fresca que ya la traiga gana siempre (no se agrega una segunda). `CarrilEventosCliente` la llama antes de su filtro de siempre (OL-222: una tarjeta que la persona quita sale al instante) — así, con `tusPlanes`, primero se agrega lo nuevo y luego se filtra lo quitado, en un solo paso.

**Que se entere aunque el toque haya sido en OTRO componente.** Tocar Voy en «Destacados» y ver el cambio en «Tus planes» (otra tira, montada aparte, con su propio `useAsistenciaEnLista`) no es un cambio de props de React: nada en «Tus planes» cambiaría por sí solo. `lib/decisionesVisita.ts` se expone como un external store de `useSyncExternalStore` (mismo patrón que `lib/avisoSalida.ts`): `suscribirseDecisionesVisita` + `crudoDecisionesVisita` (el texto crudo del recuerdo, solo para detectar el cambio). Cada escritura avisa (`notificarCambioDecisionesVisita`, dentro de `escribir()` y de `borrarDecisionesVisita()`), y `CarrilEventosCliente` se suscribe solo cuando `tusPlanes` es cierto — las demás filas no lo necesitan, ya reflejan su propio toque con `asistencia.estado`.

**La fila vacía deja de estarlo sola.** `CarrilTusPlanes` ya montaba `CarrilEventosCliente` aunque `tarjetas` llegara vacía (con sesión); `Destacados` colapsa sin hueco solo si de verdad no hay nada que pintar (`tarjetas.length === 0`). Con la primera tarjeta agregada por el cliente, dejó de estarlo — sin ningún caso especial nuevo.

**`useAsistenciaEnLista.tsx`:** `EventoLista` gana los campos de `TarjetaConFecha` como opcionales (`Partial<Omit<TarjetaConFecha, "id"|"titulo">>`) — los trae completos una tarjeta de carril (`Destacados` llama `boton(t)` con la tarjeta entera); un renglón de Agenda o de una ficha (`EventoAgenda`, sin `href`/`foto`/`detalle`) no los trae, y por eso nunca guarda tarjeta — ningún llamador nuevo tiene que enterarse de esto, mismo espíritu que OL-222. Al guardar bien, `tarjetaDe(e)` arma la foto (o `null` si falta algo) y se manda junto con la decisión.

## Un bug real, encontrado al reproducir con Chrome (no en las pruebas unitarias)

Con el código de arriba, el recorrido "Voy en Destacados → ir a Agenda → volver a Inicio (dentro de 60 s)" **perdía la tarjeta agregada**. Causa: Agenda usa el mismo `useAsistenciaEnLista`, con datos frescos de verdad (la propia consulta de Agenda ya trae el evento recién decidido) — y su `useEffect` llama `limpiarAsistenciasResueltas(cuenta, decididas)`, que borra CUALQUIER decisión cuyo estado ya coincida con lo que trajo esa pantalla — incluida la tarjeta, que Inicio (con su copia de hasta 60 s, o Atrás) todavía no había llegado a usar. Una pantalla ajena confirmaba el estado antes de que la interesada llegara a leerlo.

**Arreglo:** `limpiarAsistenciasResueltas` ya no borra una decisión que trae tarjeta (la deja «dormida» junto a su estado — inofensiva, `tarjetasTusPlanes` nunca agrega una decisión en `null`, y aquí el estado siempre coincide con lo decidido). Nueva `limpiarTarjetasTusPlanesResueltas(cuenta, servidor)`, disparada solo por `CarrilEventosCliente` (con `tusPlanes`) en un efecto cuando SU PROPIA lista de servidor cambia: si esa lista fresca ya trae el evento, ahí sí se borra la decisión completa — es la única pantalla que puede confirmar que ya no hace falta.

## Archivos

- `src/lib/destacados.ts`: nuevo `TarjetaConFecha` (`Tarjeta` + `inicio`/`fin`/`zona`); `tarjetaEvento()` los llena y devuelve ese tipo (sigue siendo un `Tarjeta` válido en todos lados: superconjunto).
- `src/lib/decisionesVisita.ts`: `guardarDecisionAsistencia` gana `tarjeta` (quinto parámetro, conserva la ya guardada si no llega una nueva); `tarjetasTusPlanes` (agregar, pura); `limpiarTarjetasTusPlanesResueltas` (nueva limpieza específica); `limpiarAsistenciasResueltas` ya no toca una decisión con tarjeta; `suscribirseDecisionesVisita`/`crudoDecisionesVisita` (external store).
- `src/components/useAsistenciaEnLista.tsx`: `EventoLista` con los campos de `TarjetaConFecha` opcionales; `tarjetaDe()`; guarda la tarjeta junto con la decisión al guardar bien.
- `src/components/inicio/CarrilEventosCliente.tsx`: con `tusPlanes`, se suscribe al recuerdo de la visita (`useSyncExternalStore`), agrega con `tarjetasTusPlanes` antes de filtrar, y limpia con `limpiarTarjetasTusPlanesResueltas` en un efecto.
- `src/components/inicio/CarrilTusPlanes.tsx`: solo el comentario (la fila vacía ya no es un caso especial).
- `src/lib/destacados.test.ts`: la única prueba que comparaba `tarjetaEvento(...)` con `toEqual` exacto, ampliada con los tres campos nuevos.
- `src/lib/decisionesVisita.test.ts`: pruebas nuevas (detalle abajo).

## No tocado

`apps/**`, `src/app/.well-known/**` (OL-223, en curso), `src/app/eventos/[id]/page.tsx` y `src/app/lugares/[id]/page.tsx` (OL-225, en curso), `package.json`/lock. `Destacados.tsx`, `CarrilAgenda.tsx`, `CarrilCercanos.tsx`, `EventosPorDia.tsx`, `ActividadPersona.tsx`: por diseño, el arreglo no necesitó tocarlos — todos ya pasan por `tarjetaEvento`/`useAsistenciaEnLista`, así que «cualquier fila de Inicio» (incluida «Cerca de ti», que no usa `CarrilEventosCliente`) queda cubierta sin cambios propios.

## Pruebas

`src/lib/decisionesVisita.test.ts`, 23 casos nuevos:

- **Tus planes al instante** (13): agregar en su lugar por fecha; la fila vacía deja de estarlo; sin nada decidido devuelve el servidor tal cual (misma referencia); sin duplicados; la página fresca gana (foto/van al día, no la guardada); cambio Voy → Me interesa (conserva la tarjeta); quitar (no se agrega); deshacer un quitar sin tarjeta fresca (repone la guardada); solo eventos futuros (uno terminado no se agrega); un evento ya empezado pero no terminado sigue vigente; cuentas distintas; sin cuenta; almacenamiento roto o ausente.
- **Aviso de cambios / `useSyncExternalStore`** (4): una escritura avisa a quien esté suscrito y deja de avisar al desuscribirse; un almacén roto no avisa (no llegó a guardarse nada); `crudoDecisionesVisita` cambia con cada escritura y se vacía al borrar; sin almacén, siempre `""`.
- **La decisión con tarjeta sobrevive a otra pantalla** (6, el bug de Agenda): `limpiarAsistenciasResueltas` no la borra aunque el estado ya coincida; sin tarjeta sigue limpiando igual que antes (sin cambio de comportamiento para lo que ya cubría OL-222); `limpiarTarjetasTusPlanesResueltas` sí la borra cuando la propia fila de Tus planes ya trae el evento (y no duplica mientras tanto); no toca lo que esa fila todavía no trae; sin cuenta/servidor/almacén roto no rompe.

**Verde:** `npm run lint && npm run typecheck && npm test && npm run build` — 113 archivos, 1474 pruebas (1451 + 23 nuevas); typecheck y build sin errores; lint solo con la advertencia preexistente y ajena de `docs/diseno/logotipo/iconos-sn.mjs`.

## Reproducción real, antes y después (Chrome de la Mac vía `playwright-core`, 390×844)

**Entorno:** `npm ci` en este árbol (no traía `node_modules`; con `next build`, Turbopack no sigue un symlink a `node_modules` de otro árbol — "Symlink … points out of the filesystem root" — así que hizo falta instalar aquí). Respaldo local 100 % inventado (`node:http` puro, sin dependencias, en el scratchpad; nunca tocó producción ni el `.env` real, que no existe en este árbol): imita Auth (JWT `HS256` sin firma válida — mismo patrón que las bitácoras 241/248 — y PostgREST para `perfiles`, `lugares`, `eventos`, `asistencias`, `seguimientos` y las RPC `van_por_evento`/`tira_destacados`; cualquier otra tabla, siempre vacía — igual que la bitácora 248, que dejó "Artistas destacados" sin datos por no hacer falta). `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8823`, borrado al terminar. `next build && next start -p 3100`.

Dos cuentas desechables `*@example.com`: `planes@example.com` (ya con Voy en «Cumbia Fantasma en vivo», +2 días, y Me interesa en «Concierto Sinfónica de la UASLP», +5 días) y `sinplanes@example.com` (mismo lugar, sin ninguna asistencia). Dos eventos más, sin decidir: «Noche de Jazz en Aurora» (+3 días, en la tira de Destacados) y «Feria del Libro Potosino» (+4 días, en Esta semana). Antes de cada corrida, `GET /__reset` repone las asistencias iniciales.

Capturas en `docs/rediseno/capturas-253/` (abiertas y descritas aquí):

- **`253-1-cuentaA-antes.png`:** Inicio, cuenta con planes. «Tus planes» trae Cumbia Fantasma (Voy, check verde) y Concierto Sinfónica (Te interesa). Destacados muestra «Noche de Jazz en Aurora» sin decidir (botón «+»).
- **`253-2-cuentaA-despues-voy-destacados.png`:** al tocar Voy en «Noche de Jazz en Aurora» (Destacados), aparece **al instante** en Tus planes, entre Cumbia (+2 d) y donde iría Sinfónica (+5 d) — en su lugar por fecha, sin recargar nada. Aviso «Vas a «Noche de Jazz en Aurora»» con Deshacer.
- **`253-3-cuentaA-tras-agenda-y-vuelta.png`:** tras ir a Agenda por la barra y volver a Inicio (menos de 60 s): Noche de Jazz **sigue** en Tus planes. Este paso reprodujo el bug de la sección anterior antes del arreglo (desaparecía); con el arreglo, se queda.
- **`253-4-ficha-me-interesa.png`:** ficha de «Feria del Libro Potosino» (llegada desde su tarjeta en Esta semana, otra fila), con «Me interesa» ya elegido («Guardado en Mi perfil»).
- **`253-5-cuentaA-tras-atras-desde-ficha.png`:** de vuelta a Inicio con Atrás desde esa ficha: Tus planes trae las cuatro tarjetas, las cuatro en su lugar por fecha (comprobado también leyendo el DOM, no solo por la captura, que recorta por el ancho de 390 px): Cumbia (+2), Noche de Jazz (+3), Feria del Libro (+4, con su chip «Te interesa»), Sinfónica (+5).
- **`253-6-cuentaA-quitar-voy.png`:** al tocar de nuevo el check de «Noche de Jazz» (ahora desde la propia fila de Tus planes), sale al instante; aviso «Ya no vas a «Noche de Jazz en Aurora»» con Deshacer.
- **`253-7-cuentaA-deshacer.png`:** Deshacer repone la tarjeta; Tus planes vuelve a las cuatro (comprobado leyendo el DOM: Cumbia, Noche de Jazz, Feria del Libro, Sinfónica, en ese orden).
- **`253-8-cuentaB-sin-planes-antes.png`:** cuenta sin ninguna asistencia: no hay fila «Tus planes» (colapsada, sin hueco).
- **`253-9-cuentaB-fila-aparece.png`:** al tocar Voy en «Cumbia Fantasma en vivo» (Esta semana), la fila «Tus planes» **aparece** con esa única tarjeta y su check — el caso «sin planes previos».

Los pasos 5 y 7 se verificaron además leyendo directamente los títulos de las tarjetas del DOM (`section:has(h2 "Tus planes") >> li b`), no solo por la captura recortada: confirmó el orden exacto de las cuatro tarjetas en ambos casos.

## Cierre

`.env.local`, el respaldo local y `playwright-core` quedaron en el scratchpad de la sesión (nunca en el repo). No se tocó `package.json`/lock ni `CLAUDE.md`. PR abierto contra `main`, sin unir; queda pendiente `gh pr checks` y la firma del founder con su iPhone real (Safari), como manda el proceso.
