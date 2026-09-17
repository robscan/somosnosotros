# Plan progresivo — somosnosotros

**Fecha:** 2026-09-13 · **Estado:** PROPUESTA · **Ciudad inicial:** San Luis Potosí · **Idioma:** español · **Publican:** administrador + usuarios registrados.
Cada fase deja algo usable en el teléfono. La siguiente fase no empieza hasta que la anterior pase su prueba.

## Fase 0 · Base (1–2 días)

- Proyecto Next.js (App Router, TypeScript) en `robscan/somosnosotros`; Vercel conectado al repo con el dominio somosnosotros.org; Supabase nuevo (proyecto único; región East US); Mapbox GL JS con el estilo claro de la cuenta del founder y token restringido al dominio.
- Español, mobile first, tema claro. Layout base: mapa + panel inferior (el patrón de Flowya que sí sirve).
- Secretos solo en Vercel y Supabase (repo público). CI mínima: lint + typecheck + tests en cada PR.
- **Prueba:** somosnosotros.org abre en el iPhone con el mapa de San Luis Potosí.

## Fase 1 · Usuarios

- Registro e inicio de sesión con Apple, Google o correo (código). Sin contraseñas que recordar. **2026-09-16, founder:** «Mi principal barrera para registro de usuarios sigue siendo envío de código a mail, se ha vuelto muy importante habilitar log in con apple y google»: Apple y Google van primero y el correo queda como alternativa (bitácora 069).
- Perfil: nombre, foto opcional, colonia opcional, una línea "sobre mí". Borrar mi cuenta.
- Roles: `admin` (founder) y `usuario`.
- **Prueba:** el founder y una persona más se registran desde el teléfono en menos de un minuto.

## Fase 2 · Lugares

- Alta de lugar: nombre, tipo (casa de cultura, foro, galería, colectivo, biblioteca, otro), dirección con autocompletado de Mapbox → pin en el mapa ajustable con el dedo, descripción corta, redes/contacto, foto de portada.
- Mapa de la ciudad con pins + lista; ficha del lugar; búsqueda por nombre.
- Anti-duplicados: mismo nombre a menos de 150 m avisa "¿es este?".
- Permisos: cualquier usuario registrado da de alta; edita los suyos; el admin edita u oculta cualquiera.
- **Prueba:** 10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto.

## Fase 3 · Eventos

- Alta de evento ligado a un lugar: título, fecha y hora de inicio (fin opcional), descripción, foto, gratis o precio, enlace externo. "Duplicar evento" para los recurrentes.
- Agenda: **Hoy · Esta semana · Próximos**; los eventos del lugar en su ficha.
- Ficha de evento compartible por WhatsApp (vista previa con imagen y fecha) y "agregar a mi calendario".
- **Prueba:** el primer evento publicado por alguien que no es el founder, y compartido por WhatsApp.

## Fase 4 · Comunidad (el tejido social)

- En cada evento: **"Voy"** y **"Me interesa"**, con la lista de quiénes van (nombre y foto de perfil). Es la forma de conocer gente local.
- Seguir lugares. Perfil público: lugares que sigo, eventos a los que voy.
- Avisos por correo: nuevo evento en un lugar que sigo; recordatorio el día del evento.
- **Prueba:** el founder confirma que dos personas coincidieron en un evento gracias a la plataforma.

## Fase 5 · Alcance (cuando la ciudad ya usa lo anterior)

- App instalable en el teléfono (PWA) y notificaciones push en Android e iPhone.
- Reportar contenido; panel de administración simple.
- Segunda ciudad (la ciudad es un campo desde el día 1).

## Modelo de datos (desde la Fase 0, sin cambiar después)

| Tabla | Campos esenciales |
|---|---|
| `perfiles` | id, nombre, foto, colonia, bio, rol (admin/usuario) |
| `lugares` | id, nombre, tipo, descripción, dirección, lat, lng, ciudad, redes, portada, creado_por, visible |
| `eventos` | id, lugar_id, título, inicio, fin, descripción, imagen, precio, enlace, creado_por, visible |
| `seguimientos` | usuario_id, lugar_id |
| `asistencias` | usuario_id, evento_id, estado (voy / me interesa) |

Permisos (RLS): lectura pública de lo visible; escritura solo con sesión; cada quien edita lo suyo; el admin todo.

## Qué NO entra (para mantenerlo simple)

- Nada de fotos del carrete ni capacidades nativas de iOS; nada de Apple Health; nada de "pasaporte".
- Sin likes, comentarios ni ranking. Los destacados sí entran: lo que elige el administrador y lo que tiene más asistentes, sin contar visitas (founder, 2026-09-16). Sin tienda de apps: la app de iPhone en la tienda se detuvo el 2026-09-16 (decisión del founder); la app es la web instalada en el inicio.
- Sin push antes de la Fase 5; los avisos empiezan por correo.

## Cómo se trabaja

- `docs/ops/OPEN_LOOPS.md` es el estado del proyecto; una bitácora numerada por sesión.
- Un PR por fase o por pieza grande; el founder prueba en Safari del iPhone.
- Antes de decisiones grandes de producto: `council` (el skill ya está en el repo). Para UI: `front-visual` (mirar la pantalla antes de razonar).
