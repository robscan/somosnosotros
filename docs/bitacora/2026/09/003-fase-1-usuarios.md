# 003 · Fase 1, usuarios (2026-09-13)

Rama `fase-1-usuarios`. Registro e inicio de sesión sin contraseñas, perfil, borrar cuenta, roles, y la primera migración con las 5 tablas del modelo y sus permisos.

## Qué quedó

- **Migración `supabase/migrations/20260913120000_base.sql`**: tablas `perfiles`, `lugares`, `eventos`, `seguimientos`, `asistencias` (modelo de `docs/PLAN.md`, con límites de largo y checks); `admin_correos` (sin políticas: solo la lee el trigger); trigger que crea el perfil al registrarse (nombre y foto de Google si vienen; rol `admin` si el correo está en `admin_correos`); `es_admin()` para las políticas; `borrar_mi_cuenta()` (borra el usuario de auth; perfil, seguimientos y asistencias caen en cascada; lugares y eventos se quedan sin autor, no se pierden); RLS: lectura pública de lo visible, escritura con sesión, cada quien lo suyo, el admin todo; bucket `fotos` público con carpeta por usuario (`perfiles/<id>/…`), 5 MB, solo imágenes.
- **Sesión por cookies** con `@supabase/ssr`: `src/lib/supabase/servidor.ts` (servidor + `usuarioActual()`), `navegador.ts` (cliente), `src/proxy.ts` (en Next 16 el antiguo middleware se llama proxy) refresca la sesión en cada petición.
- **`/entrar`**: correo → enlace mágico (`signInWithOtp`) o "Continuar con Google". Estados: enviando, enviado ("Revisa tu correo… ábrelo desde este mismo teléfono"), error (correo mal formado, 429 = demasiados intentos, enlace caducado).
- **`/auth/callback`**: cambia el código (o `token_hash`) por sesión y redirige a `siguiente` (solo rutas internas, `rutaSegura`).
- **`/perfil`**: nombre (obligatorio, 60), foto opcional (sube directo a Storage desde el navegador, 5 MB), colonia opcional (60), "sobre mí" (140). Guardar con `useActionState` y validación en servidor (`validarPerfil`). Cerrar sesión. Borrar mi cuenta con confirmación en dos pasos y aviso de qué pasa con lo publicado.
- **Panel**: "Entrar" si no hay sesión; avatar + nombre → `/perfil` si la hay. Aviso "Tu cuenta quedó borrada".
- **Diseño**: variables en `globals.css` (colores, espacios, radio, `--toque: 48px`), componentes `ui/Boton` y `ui/Campo` (etiqueta visible, ayuda y error debajo, `aria-invalid`). Formularios en flujo normal con scroll: el botón nunca queda bajo el teclado (contrato heredado). Inputs a 16px: Safari no hace zoom.
- **Verificación**: lint, typecheck, 14 pruebas (`rutaSegura`, `validarPerfil`, `correoValido` + las de la Fase 0), build. Capturas 390×844 de `/entrar` (vacío y con error de correo) y del panel con "Entrar".
- `npm run db:push` (`scripts/db-push.mjs`): lee `SUPABASE_DB_URL` de `.env`, codifica la contraseña y corre `supabase db push`.

## Tropiezo: la URL de la base no se puede leer de Vercel

La integración Supabase↔Vercel marcó sus variables como *sensibles*; `vercel env pull` devuelve literalmente `[SENSITIVE]`. La migración **no está aplicada todavía**: necesita que el founder ponga `SUPABASE_DB_URL` (Supabase → Connect → Direct connection, con contraseña) en `.env` y se corra `npm run db:push`; después se da de alta su correo en `admin_correos` con una sola línea de SQL (no va a git).

## Pendiente del founder (Supabase → Authentication)

1. **URL Configuration**: Site URL `https://somosnosotros.org`; Redirect URLs: `https://somosnosotros.org/auth/callback`, `https://*.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`.
2. **Google**: en Google Cloud Console crear credenciales OAuth (tipo Web) con redirect `https://<ref>.supabase.co/auth/v1/callback`; pegar Client ID y Secret en Providers → Google.
3. **Correo**: el SMTP por defecto de Supabase manda pocos correos por hora (suficiente para la prueba de la fase; para la ciudad entera, SMTP propio más adelante).

## Prueba de la fase

El founder y una persona más se registran desde el teléfono en menos de un minuto. Sin correr todavía.
