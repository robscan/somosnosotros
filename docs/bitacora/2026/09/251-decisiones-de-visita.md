# 251 · Las decisiones de la visita mandan sobre la página guardada (OL-222)

**Fecha:** 2026-09-26 · **Rama:** `decisiones-de-visita`, desde `origin/main` (85f8f3d) · **OL:** OL-222 (regresión de OL-212) · **Modelo:** Sonnet 5. Sin subagentes, council ni workflows.

## El bug (founder, en producción)

«Ahora estoy viendo eventos a los que ya no voy dentro de mis planes.»

## Causa

`next.config.ts` (`experimental.staleTimes.dynamic: 60`, bitácora 043) reutiliza una página ya vista hasta 60 s, y
Atrás/Adelante la reutiliza siempre. El PR #257 (OL-212, tercera vuelta) aplazó con `after()` los `revalidatePath`
de `cambiarAsistencia`/`cambiarSeguimiento`/`cambiarSeguimientoArtista` cuando se llaman desde listas
(`diferir: true` en `useAsistenciaEnLista.tsx`/`useSeguirEnLista.tsx`), para no repintar la pantalla desde la que se
guarda. Ese aplazamiento hace que la señal que el cliente usaría para refrescar otras rutas ya cargadas (Inicio,
Agenda…) nunca viaje en esa respuesta: quien vuelve a una pantalla ya cargada antes de la decisión (barra inferior
dentro de los 60 s, o Atrás/Adelante, sin límite de tiempo) sigue viendo la copia vieja — «Tus planes» incluida,
con su check.

**Pendiente de verificar en carne propia:** por indicación del gestor (chat de gestión de cambios, 2026-09-26,
mensaje urgente) esta sesión no montó `next build && next start` con sesión contra el respaldo local ni tomó
capturas 390×844 — se prioritizó cerrar el código con sus pruebas y las cuatro comprobaciones en verde. La
reproducción antes/después con Chrome real queda pendiente para el iPhone del founder (o una próxima sesión).

## El arreglo

Un «recuerdo de las decisiones de esta visita», en el cliente, `src/lib/decisionesVisita.ts` (mismo estilo que
`lib/memoriaPantalla.ts`: `sessionStorage`, `Almacen` inyectable para las pruebas, try/catch en cada acceso — muere
con la pestaña, nunca sale del teléfono). Una sola entrada (`somosnosotros:visita`) con la cuenta que decidió
adentro: si otra cuenta entra en la misma pestaña, lo de la anterior no aplica.

**Cómo se corrige (decisión de este operador — el encargo ofrecía dos caminos y pedía elegir y justificar):** en vez
de pasarle a cada lista la hora en que el servidor armó la página —hubiera tocado `CarrilTusPlanes`, `CarrilAgenda`,
cada ficha, Agenda, Artistas y también Lugares/`VistaLugares`, fuera del alcance de esta pieza (expresamente
prohibido tocarlo)—, cada decisión guardada se compara contra lo que trae el servidor: si ya coincide, la página
está al día y la decisión se limpia sola; si no coincide, manda la decisión. Así ningún llamador nuevo se entera de
esto: los dos hooks (`useAsistenciaEnLista`, `useSeguirEnLista`) lo resuelven solos, y todo lo que ya los use queda
corregido — incluida Lugares, sin tocarla. Límite conocido, documentado en el propio archivo: si otro dispositivo
cambiara la misma decisión antes de que el servidor la reflejara aquí, esta pestaña tardaría en verlo; más seguro
que el bug de hoy, que siempre muestra lo viejo.

## Archivos

- **Nuevo** `src/lib/decisionesVisita.ts`: `guardarDecisionAsistencia`/`guardarDecisionSeguir` (al guardar bien, en
  el mismo punto de éxito que usan tanto un toque normal como Deshacer — así Deshacer también queda grabado);
  `corregirAsistencias`/`corregirSeguidos` (puras, se usan al calcular `estado`/`sigo`); `limpiarAsistenciasResueltas`/
  `limpiarSeguidosResueltos` (efecto, cuando llega una foto nueva del servidor); `borrarDecisionesVisita`.
- `src/components/useAsistenciaEnLista.tsx` / `useSeguirEnLista.tsx`: `estado`/`guardado`/`sigo`/`sigoGuardado` usan
  el mapa corregido en vez del que llegó tal cual; al terminar de guardar (antes de `alGuardar`, solo si
  `guardado === true`) se graba la decisión — si la acción falla, nunca se llega a esa línea, así que no se guarda.
- `src/components/inicio/CarrilEventosCliente.tsx`: nuevo prop `tusPlanes` — con él, filtra las tarjetas cuyo
  `estado()` corregido ya es `null` (ni Voy ni Me interesa). Sin él (Estelar, Esta semana, Populares, Nuevos), no
  filtra nada: esos carriles no pierden tarjetas (regla de OL-221).
- `src/components/inicio/CarrilTusPlanes.tsx`: pasa `tusPlanes` a `CarrilEventosCliente`.
- `src/app/ajustes/BotonSalir.tsx`: al cerrar sesión, además de `borrarUbicacionCercana()` (ya existía, OL-095),
  ahora también `borrarDecisionesVisita()` — mismo patrón, un `onSubmit` de cliente antes de la acción de servidor.

## Pruebas

`src/lib/decisionesVisita.test.ts`, 18 casos nuevos en las cuatro categorías del encargo: fusión servidor +
decisiones (incluida Voy → Me interesa → null, y que lo ya reflejado por el servidor se limpia), filtro de Tus
planes (un evento quitado no queda visible, Deshacer lo repone, y — importante — el filtro nunca inventa una
tarjeta ausente del servidor aunque el mapa corregido sí traiga esa clave para otra lista), cuentas distintas
(lo decidido por una cuenta no aplica a otra en la misma pestaña, ni sobrevive a que otra cuenta escriba encima),
y almacenamiento roto o ausente (sin almacén, con un almacén que revienta en cualquier acceso, con JSON inválido).

**Verde:** `npm run lint && npm run typecheck && npm test && npm run build` — 1440 pruebas (114 archivos, las 18
nuevas incluidas), typecheck y build sin errores; lint solo con la advertencia preexistente y ajena de
`docs/diseno/logotipo/iconos-sn.mjs`.

## No tocado

`apps/**`, `ui/ChipFecha`, `ui/SelectorFecha`, `src/app/lugares/VistaLugares.tsx` ni el formulario de eventos
(OL-218 en curso) — por diseño, el arreglo no necesitó tocar ninguno de estos: los hooks bastan.

## Revisión del gestor antes de unir

El recuerdo de la visita manda siempre sobre lo que diga el servidor cuando no coinciden: no compara horas. Eso dejaba un caso roto:

1. Se quita un «Voy» desde una lista, y queda anotado «no voy».
2. Después se vuelve a marcar «Voy» desde la ficha del evento, que no anota nada en el recuerdo.
3. Al volver a Inicio, el «no voy» viejo le ganaba a la decisión más nueva y el evento desaparecía de «Tus planes».

Arreglo: `src/app/eventos/[id]/Asistencia.tsx` y `src/components/Seguir.tsx` (las fichas) llaman `borrarDecisionesVisita()` tras guardar con éxito. Sus acciones revalidan en el acto, sin `diferir`: el router tira sus copias y cada pantalla se vuelve a pedir fresca, así que el recuerdo ya no hace falta y no puede ganarle a lo nuevo.

`npm run lint`, `npm run typecheck` y `npm test` (114 archivos, 1440 pruebas) siguen en verde.
