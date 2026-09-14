# 006 · Fase 3, eventos (2026-09-13)

Rama `fase-3-eventos`. Publicar eventos en los lugares, agenda Hoy · Esta semana · Próximos, ficha compartible por WhatsApp con vista previa y "agregar a mi calendario", duplicar para los recurrentes. Con la lente de la bitácora 005: lo mínimo para publicar es dónde, qué y cuándo.

## Qué quedó

- **`src/lib/fechas.ts`**: la ciudad vive en America/Mexico_City (UTC−6 fijo desde 2022). El selector del teléfono da hora local sin zona → `localAIso` la fija a la ciudad; `isoALocal` de vuelta. `formatearCuando` ("Hoy · 19:00", "Mañana · 19:00–21:00", "sáb 26 de sep · 19:00"), `formatearLargo` para la ficha, `tramo` (hoy/semana/próximos; lo que empezó hace menos de 3 h sigue en hoy), `sugerirInicio` (hoy 19:00 antes de las 18; si no, mañana), `aFechaIcs`.
- **`src/lib/eventos.ts`**: `validarEvento` (lugar válido, título, fecha obligatoria: "sin fecha no se publica", fin después del inicio, gratis por defecto y precio obligatorio si no es gratis, enlace completado con https), `textoCompartir`.
- **`/eventos/nuevo`** (`FormularioEvento`): Dónde (viene puesto desde la ficha del lugar con `?lugar=`; select si se llega desde la agenda; enlace a registrar el lugar si no está), Qué, Cuándo (`datetime-local` con valor sugerido; "+ Agregar hora de fin"), Cuánto (Gratis / Con costo), cartel opcional, descripción y enlace plegados. **Dos acciones: título y publicar.** `?desde=id` duplica: mismo título, lugar, descripción, imagen y precio, fecha nueva sugerida.
- **`/eventos/[id]`**: imagen, título, fecha larga, precio, lugar (enlace) y dirección; **Compartir por WhatsApp** (hoja nativa del teléfono si existe, si no `wa.me`), **Agregar a mi calendario** (`/eventos/[id]/calendario` devuelve un `.ics`; el iPhone lo abre en Calendario), Cómo llegar, Más información. `generateMetadata` con Open Graph (título, "fecha · lugar · precio", imagen del evento o portada del lugar) para la vista previa de WhatsApp. Editar, Duplicar con otra fecha, Ocultar (admin).
- **Agenda en el panel** (`Agenda.tsx` + `Pestanas.tsx`): pestañas Agenda | Lugares; grupos Hoy · Esta semana · Próximos con tarjetas (cuándo en rojo, título, lugar · precio); "+ Publicar un evento" (manda a registrar el lugar si no hay ninguno). Vacío dicho: "Aún no hay eventos próximos. Si sabes de uno, publícalo." Cabecera con "N eventos · M lugares".
- **Ficha del lugar**: sección Eventos con los próximos y "+ Publicar un evento aquí".
- Inicio carga lugares y eventos visibles (desde 3 h atrás, máximo 200) en el servidor.
- 39 pruebas (10 nuevas de fechas y eventos). Sin migración: la tabla `eventos` y sus políticas ya estaban desde la Fase 1.

## Prueba contra la base real (usuario desechable, borrado al final; 390×844)

- Desde la ficha de "Casa 1100" (lugar real del founder): el formulario abre con el lugar puesto y la fecha sugerida (mañana 19:00). Escribir "Noche de jazz" y publicar → ficha con "Publicado", botones de compartir, calendario y cómo llegar. `og:title`, `og:description` ("lunes, 14 de septiembre, 19:00 · Casa 1100 · Gratis") y `og:url` presentes.
- `/eventos/[id]/calendario` → `text/calendar` con DTSTART/DTEND en UTC, SUMMARY, LOCATION y URL.
- Inicio: "1 evento · 2 lugares", pestaña Agenda con "Esta semana → Mañana · 19:00 · Noche de jazz · Casa 1100 · Gratis".
- Duplicar: formulario con título y lugar puestos y fecha nueva. Ficha del lugar con el evento y el botón.

## Prueba de la fase

El primer evento publicado por alguien que no es el founder, y compartido por WhatsApp.
