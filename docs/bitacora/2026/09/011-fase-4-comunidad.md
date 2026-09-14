# 011 · Fase 4, comunidad (2026-09-13)

Rama `fase-4-comunidad`. El founder cerró la Fase 3 ("Cierra y avanza"). Fase 4 del plan: "Voy" y "Me interesa" con la lista de quiénes van, seguir lugares, perfil público, avisos por correo.

## Qué quedó

- **Migración 0006**: `perfiles.avisos` (encendido por defecto), tabla `avisos_enviados` (usuario, evento, tipo) para no repetir avisos (RLS sin políticas: solo el servidor), índices en `asistencias(evento_id, estado)` y `seguimientos(lugar_id)`. Las tablas `asistencias` y `seguimientos` existían desde la Fase 1 con sus políticas.
- **Ficha del evento** (`Asistencia.tsx`): botones "Voy" / "Me interesa" con respuesta instantánea (`useOptimistic` + `useTransition`; contrato heredado de mutaciones optimistas), resumen en palabras ("Van 2: Luis y Ana", "Va Ana"), lista de quiénes van con foto y enlace a su perfil público, y cuántas personas tienen interés. Sin sesión, los botones llevan a entrar con la intención en la URL (`?accion=voy`) y **la ficha la aplica sola al volver** (directo en la base y redirección a la URL limpia; llamar la acción del servidor durante el render no está permitido, tropiezo corregido).
- **Ficha del lugar** (`Seguir.tsx`): "Seguir" / "✓ Siguiendo" optimista, con "N personas lo siguen"; misma intención `?accion=seguir` al entrar.
- **Perfil público** `/personas/[id]`: foto, nombre, colonia, sobre mí, "Va a" (eventos próximos con "Voy") y "Sigue". Los autores de lugares y eventos enlazan a su perfil.
- **Mi perfil**: secciones "Voy a" y "Sigo", enlace al perfil público, y la casilla "Avisarme por correo…".
- **Avisos por correo** (`lib/avisos.ts`, `lib/correo.ts` con Resend por HTTP; `lib/supabase/admin.ts` con la llave de servicio, solo servidor): (a) nuevo evento en un lugar que sigo: al publicar, `after()` de Next manda el aviso a quienes siguen el lugar sin retrasar la respuesta; (b) recordatorio el día del evento: `/api/recordatorios` (Vercel Cron a las 9:00 de la ciudad, `vercel.json`) manda el aviso a quienes dijeron "Voy" a eventos de las próximas 24 h. Cada aviso una sola vez por persona, y solo si tiene los avisos encendidos. Textos en `lib/comunidad.ts` con pruebas. **Sin llave no se manda nada** (y todo lo demás funciona igual).

## Verificación (390×844, base real, usuarios desechables borrados)

- Ana entra desde `/entrar` con la intención "Voy" sobre el evento real "Carísimo" → al volver ya aparece "✓ Voy · Va Ana". Cambia a "Me interesa" → "Nadie ha dicho que va… A 1 persona le interesa." Vuelve a "Voy".
- Luis entra, ve "Va Ana", toca "Voy" → "Van 2: Luis y Ana". En Casa 1100 toca "Seguir" → "✓ Siguiendo · 1 persona lo sigue".
- `/personas/<Ana>`: "Va a: Carísimo · Casa 1100", "Sigue: todavía nada". `/perfil` de Luis: "Voy a: Carísimo", "Sigo: Casa 1100", casilla de avisos.
- Lint, typecheck, 49 pruebas, build. Los correos no se probaron (sin llave de Resend).

## Pendiente del founder (para los avisos)

1. Cuenta en resend.com; verificar el dominio somosnosotros.org (registros DNS que Resend indica); crear una llave de API.
2. En Vercel (sensibles, Production): `RESEND_API_KEY`, `CORREO_REMITENTE` (ej. `somosnosotros <avisos@somosnosotros.org>`), y `CRON_SECRET` (una cadena larga al azar) para que Vercel pueda llamar `/api/recordatorios`.
3. Prueba de la fase: el founder confirma que dos personas coincidieron en un evento gracias a la plataforma.
