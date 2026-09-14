# 012 · Fase 5, alcance (2026-09-13)

Rama `fase-5-alcance`. El founder: "anótame en pendiente claves de Resend y continúa con la siguiente fase". Fase 5 del plan: app instalable y avisos push, reportar contenido, panel de administración simple, segunda ciudad.

## Qué quedó

- **Instalable (PWA)**: `src/app/manifest.ts` (nombre, `display: standalone`, iconos 192/512 y maskable generados con PIL, tema claro), `apple-touch-icon` y `appleWebApp` en el layout, `public/sw.js` (service worker: recibe push y abre la página al tocar el aviso; sin caché: la app sigue siendo web), `RegistroSW` silencioso. **Aviso de instalación** discreto en el panel (`InstalarAviso`): solo en móvil, solo si no está instalada, una sola vez (se cierra); en iPhone explica "Compartir → Agregar a inicio", en Android ofrece el diálogo del sistema si el navegador lo da.
- **Push** (`lib/push.ts` con `web-push`; migración 0007 `suscripciones_push` con RLS de "cada quien las suyas"): `enviarPush` manda a todos los teléfonos de las personas y borra suscripciones muertas (404/410). `lib/avisos.ts` ahora manda **push y correo** (cada aviso una vez por persona, si tiene avisos encendidos). En Mi perfil, `ActivarPush`: "Activar avisos en este teléfono" pide permiso y guarda la suscripción; en iPhone exige la app instalada (si no, lo explica); muestra "Avisos activados · Quitar". Llaves VAPID generadas aquí con `web-push generate-vapid-keys` y puestas en `.env` local; **el founder las copia a Vercel** (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- **Reportar** (migración 0008, tabla `reportes` con RLS: reporta quien tiene sesión, lee y atiende solo el admin): enlace discreto "Reportar" en fichas de evento y lugar → motivo (falso, ofensivo, repetido, no cultural, otro) y un renglón opcional → "Gracias. El administrador lo revisa."
- **Panel `/admin`** (solo admin; enlace desde Mi perfil): conteos, reportes pendientes (ver, Ocultar, Marcar atendido), últimos eventos y lugares con Ocultar/Mostrar.
- **Ciudad como campo**: `lib/ciudad.ts` pasa a `CIUDADES` (hoy una: San Luis Potosí) con slug; el inicio acepta `?ciudad=<slug>` (centro del mapa y filtros de lugares y eventos); `eventos.ciudad` (migración 0008) se llena con la del lugar o la inicial; la cabecera ofrece "Ir a <ciudad>" solo si hay más de una. Abrir otra ciudad = agregar una línea.

## Verificación (Android emulado 375×812 y base real; usuarios desechables borrados)

- `manifest.webmanifest`, `sw.js` e iconos servidos; `link rel=manifest` y `apple-touch-icon` en el HTML; service worker registrado (`/sw.js`); aviso de instalación visible en el panel con el texto de Android.
- Rita reporta "Carísimo" como repetido → "Gracias…". Admin de prueba entra a `/admin`: "Reportes pendientes (1) · Está repetido · evento · ver · Reportó Rita Prueba", Ocultar / Marcar atendido → "Nada pendiente".
- Tropiezo: el formulario de Reportar iba dentro del `<p>` del autor (HTML inválido, aviso de hidratación) → contenedor de bloque.
- Lint, typecheck, 52 pruebas, build. **Sin probar en dispositivo**: el push real (requiere permiso de notificaciones y, en iPhone, la app instalada) y el diálogo de instalación de Android.

## Pendiente del founder

1. Copiar de `.env` a Vercel (Production y Preview): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (sensible), `VAPID_SUBJECT`.
2. En el iPhone: instalar la app (Compartir → Agregar a inicio), abrir Mi perfil → "Activar avisos en este teléfono", y decir "Voy" a un evento de mañana: a las 9:00 llega el recordatorio (cuando exista `CRON_SECRET`).
3. Sigue pendiente: llaves de Resend (bitácora 011).
