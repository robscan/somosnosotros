# 173 · Avisos y correos a artistas y usuarios, con boletín quincenal

**Fecha:** 2026-09-23 · **Rama:** `avisos-textos-boletin`, desde `origin/main` (`820b131`) · **OL:** OL-138 · **Modelo:** Sonnet 5, esfuerzo medio · **Solo documento**, sin código de la app y sin encender nada.

## Encargo

L42 (bienvenida), L43 (control de la ficha), L44 (avisos al artista) y el comentario del founder del 2026-09-23: boletín de correo quincenal con eventos sobresalientes y de lugares seguidos, solo a usuarios con actividad reciente, y quitar los correos por cada evento (queda push y dentro de la app).

## Qué se hizo

- [docs/rediseno/28-avisos-y-boletin.md](../../../rediseno/28-avisos-y-boletin.md): inventario de lo que ya se manda (con el archivo que lo dispara), textos completos de cada correo y cada push, criterios medibles, día y hora, qué se apaga y qué queda, y la lista de siete decisiones para firma.
- [prototipos/boletin-quincenal.html](../../../rediseno/prototipos/boletin-quincenal.html): maqueta del boletín con Bricolage y datos inventados.
- Captura real en `docs/rediseno/capturas-173/boletin-quincenal--390x844.png` (Chrome real por `playwright-core`, `document.fonts.check('16px "Bricolage Grotesque"')` → true). **Abierta:** muestra la bandeja arriba (asunto y remitente), «Hola Ana,», la sección «Lo más sobresaliente» con tres eventos y «Van 14 / 9 / 5», «En lugares que sigues» con tres más, y el botón «Ver toda la agenda»; el pie de baja queda justo debajo de los 844 px.

## Lo que salió de leer el código

- Hoy salen **tres avisos por evento**, cada uno por correo y por push, con el mismo motor (`avisosWorker`, cola SQL `avisos_jobs`): nuevo evento (a quien sigue el lugar o un artista), cambió fecha o lugar y recordatorio (a quien dijo «Voy»). Las plantillas de correo están en `src/lib/comunidad.ts`; las de push, en `src/lib/avisos.ts`.
- No existen: bienvenida, aviso de ficha entregada, avisos al artista ni boletín.
- «Sobresaliente» ya tiene una regla en la app: `tira_destacados` (elegido por el administrador o 3 o más «Voy» sin contar administración). Se propone reutilizarla para que agenda y correo coincidan.
- **Decisiones que el founder debe mirar con cuidado** (están en el documento): «sobresalientes *y* de lugares seguidos» puede ser *o* o *y* (con *y* casi nadie recibiría boletín); quien solo tiene correo perdería el aviso de cambio de fecha; la palanca «Por correo» cambia de significado para quien ya la tenía.

## Límites

No se comprobó en la base que cada acción de «actividad reciente» guarde su fecha (queda marcado «por comprobar al construir»). El texto del código de entrada lo manda Supabase Auth y no está en el repo, así que no se revisó. Ningún correo real de personas en el documento: solo `avisos@somosnosotros.org` y ejemplos inventados.

Commits locales en `avisos-textos-boletin`, sin push.
