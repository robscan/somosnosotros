# 055 · Deuda técnica de la revisión del 14 de septiembre

**Fecha:** 2026-09-16 · **Rama:** `deuda-revision` · **Pieza:** cola de OL-031 (reparto de la bitácora [052](052-firma-y-cola-en-marcha.md)); cierra tres de los "queda del informe" de OL-014 ([REVISION_2026-09-14.md](../../ops/REVISION_2026-09-14.md)).

## Qué pidió el founder
Tres pendientes de la revisión de arquitectura del 14 de septiembre: (1) ponerle tope a las consultas que podían chocar con el corte silencioso de 1 000 filas de PostgREST; (2) generar los tipos de la base y tipar los tres clientes de Supabase con ellos; (3) escribir pruebas para `src/lib/avisos.ts`, que no tenía ninguna.

## Qué se hizo

### 1. Consultas sin tope
Revisadas todas las consultas `supabase.from(...)` / `admin.from(...)` de `src/`. A las que podían devolver muchas filas sin límite se les puso un tope explícito con un comentario de una línea; ninguna cambia lo que se ve hoy (las cantidades reales están muy por debajo de los topes puestos). Tocadas:

- `src/lib/ciudades.ts` — lugares y eventos para armar la lista de ciudades: ya tenían `.limit(5000)`, se les puso el comentario de por qué ese número.
- `src/app/lugares/page.tsx` — lugares de una ciudad (no tenía tope): `.limit(1000)`.
- `src/app/page.tsx` — lo que sigue la persona (`.limit(1000)`) y los eventos de los artistas que sigue (`.limit(1000)`).
- `src/app/novedades/consultas.ts` — seguimientos (`.limit(1000)`), asistencias "voy" de la persona (`.limit(1000)`), novedades recientes (`.limit(500)`), eventos nuevos en lugares seguidos (`.limit(500)`), eventos nuevos de artistas seguidos (`.limit(500)`), quién más va a mis eventos (`.limit(1000)`).
- `src/app/artistas/consultas.ts` — quién se presenta en un evento (`.limit(50)`, un cartel no lleva más de unas decenas de nombres) y los artistas ligados a una cuenta (`.limit(50)`).
- `src/app/personas/consultas.ts` — lo que sigue y a lo que va la persona de una ficha (`.limit(1000)` cada una).
- `src/app/artistas/[id]/page.tsx` y `src/app/lugares/[id]/page.tsx` — conteo de "voy" por fecha próxima (solo se usa la cantidad, no la identidad): `.limit(2000)`.
- `src/app/eventos/[id]/page.tsx` — "Quién va" de un evento (necesita venir completa: decide cuántos son "de perfil reservado"): `.limit(2000)`.
- `src/lib/avisos.ts` — perfiles a avisar y ya avisados (dedupe), cartel del evento, seguidores del lugar y de los artistas, "voy" de un evento (cambio y recordatorio), eventos en la ventana del recordatorio: todas con tope de 1 000 a 5 000 según el caso. Estas necesitan venir completas para no dejar a alguien sin avisar o avisarle dos veces; el tope es una red de seguridad documentada, no un corte real a la escala de hoy.
- `src/lib/push.ts` — suscripciones push de las personas a avisar (`.limit(5000)`; hoy siempre se llama con una persona a la vez).

Ninguna se cambió a conteo (`count: "exact", head: true`) porque en todos los casos se usa el contenido de las filas, no solo cuántas hay (los que sí eran solo cantidad ya estaban así desde la revisión del 14, p. ej. `admin/page.tsx` y el conteo de "voy" en la agenda).

### 2. Tipos generados de la base
**No se pudo.** `npx supabase gen types typescript --db-url "$URL" --schema public` (con la cadena de `POSTGRES_URL_NON_POOLING` del `.env`, leída sin imprimirla) falla con `LegacyDockerRunError: docker: command not found (podman also not found)`: esta versión de la CLI (2.117.0, la misma con `npx supabase@latest`) necesita Docker o Podman para generar tipos contra una URL directa, y ninguno de los dos está instalado en esta máquina. Se probó también sin éxito. Documentado aquí para que quien tenga Docker a mano corra el mismo comando y guarde el resultado en `src/lib/supabase/tipos.ts`; los tres clientes (`navegador.ts`, `servidor.ts`, `admin.ts`) se tipan con `createClient<Database>` en cuanto exista ese archivo. No se tocó ningún cliente.

### 3. Pruebas de avisos
`src/lib/avisos.ts` mezclaba lógica pura con llamadas a Supabase. Se extrajeron, sin cambiar el comportamiento, cinco funciones puras ya usadas en su sitio original:
- `lotes` (ya existía, solo se exportó): parte una lista en trozos.
- `superoTopeAvisos(cuenta, tope)`: si ya se pasó el tope de eventos por autor y día.
- `ventanaRecordatorio(horas, ahora)`: la ventana de tiempo del recordatorio, en ISO.
- `pendientesDeAviso(perfiles, yaEnviados)`: quién falta por avisar (tiene un canal activo y no está ya avisado).
- `contenidoPush(tipo, evento, cambio, ahora)`: título, cuerpo y enlace del aviso push según el tipo (antes tres condicionales en línea).

Nuevo `src/lib/avisos.test.ts` con 16 pruebas sobre esas cinco funciones (lotes, tope por autor, ventana de horas, quién queda pendiente, los tres textos de aviso push y el caso sin lugar registrado). Como `avisos.ts` importa `"server-only"` (que fuera de Next siempre lanza), se ajustó `vitest.config.mts` para que ese paquete se resuelva a su propio archivo vacío en las pruebas (la misma condición `react-server` que usa el build real); no cambia nada del código de producción, solo permite probar módulos que ya usan ese guardián.

## Evidencia
`npm run lint && npm run typecheck && npm test` en verde: 23 archivos de prueba, 163 pruebas (147 antes + 16 nuevas). Sin cambios de UI: no aplica captura móvil.

## Queda
- Tipos generados de la base y clientes tipados (bloqueado por falta de Docker/Podman aquí; ver arriba).
- El resto de "queda del informe" de OL-014: escrituras fuera del render, `Boton` con `href` (ya resuelto después por otro PR), un solo chip/buscador en Agenda, poda de `docs/heredado`.
