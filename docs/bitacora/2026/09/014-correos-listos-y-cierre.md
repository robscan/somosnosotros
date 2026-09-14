# 014 · Correos listos y cierre de la sesión larga (2026-09-14)

Sin rama: solo operación y documentos. Cierra la sesión que construyó las 6 fases (bitácoras 001–013).

## Qué se hizo hoy

- **Avisos por correo activos.** El founder puso `RESEND_API_KEY`, `CORREO_REMITENTE` y `CRON_SECRET` en Vercel (Production). Redeploy con commit vacío para que el sitio las leyera. Correo de prueba desde `avisos@somosnosotros.org` (Resend 200) y `/api/recordatorios` con el secreto → 1 evento, 1 enviado (el recordatorio de "Carísimo" al founder). El founder confirmó: "funciona".
- **Push**: las tres llaves VAPID ya estaban en Vercel (las puso el founder desde `.env`).
- **Correos de entrar por Resend**: el founder configuró SMTP propio en Supabase (Authentication → Emails → SMTP). Valores: remitente `avisos@somosnosotros.org`, nombre `somosnosotros`, host `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = llave de Resend. Primer intento: "No se pudo enviar el enlace" (Supabase 500 "Error sending confirmation email"); diagnóstico con un handshake SMTP directo (la llave local autenticaba: 235) → la contraseña guardada estaba mal; corregida y verificado con `signInWithOtp` sin error. Plantillas en español entregadas para Magic Link y Confirm signup, con `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` (nuestro `/auth/callback` acepta `token_hash`; así el enlace sirve aunque se abra en otro navegador).
- **Entregabilidad**: el primer correo a Gmail cayó en no deseado. SPF y DKIM de Resend correctos en el DNS de Vercel; faltaba DMARC → el founder agregó `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:avisos@somosnosotros.org` (resuelve en Vercel, 1.1.1.1 y 8.8.8.8). El dominio no recibe correo (sin MX en la raíz), así que los reportes DMARC no llegan a ningún buzón; no importa con `p=none`.
- Limpieza: la prueba de SMTP con `robscan@gmail.com` creó una cuenta duplicada sin uso (la real del founder es la de me.com); borrada. Hallazgo: ya hay una **segunda persona registrada** (cuenta de gmail, entró el 14 de septiembre) → la prueba pendiente de la Fase 1 quedó cubierta.
- Herramientas: el Chrome del founder se puede mirar solo en pestañas que yo abro (con su sesión); la app "Supabase Studio" (Chrome app) se pudo ver en segundo plano con permiso de lectura para revisar la pantalla de SMTP.

## Estado al cerrar

Las 6 fases están en producción. Llaves completas en Vercel (Mapbox, Supabase, Anthropic, VAPID, Resend, CRON_SECRET). Lo que sigue es en el teléfono y con gente: instalar la app, activar avisos push, y las pruebas de las Fases 4 y 5. Segunda ciudad: cuando el founder la nombre. WhatsApp: propuesta abierta.
