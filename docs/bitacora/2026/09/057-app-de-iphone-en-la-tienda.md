# 057 · App de iPhone en la tienda: identificador y ficha en Apple

**Fecha:** 2026-09-16 (noche) · **Base:** pedido del founder: "abre navegador para acceder a apple developer y me ayudes a configurar la app para lanzar en la tienda".

## Decisiones del founder
- **La app va a la App Store.** Cambia la regla "sin app de tienda en V1" (DEFINICION, PLAN y CLAUDE.md al día).
- **Forma: app pequeña con piezas del iPhone.** Abre somosnosotros.org y suma solo avisos del sistema, entrar con Apple, enlaces de somosnosotros.org que abren la app, pantalla sin conexión y agregar al calendario. Todo lo demás sigue siendo la web. Motivo: Apple rechaza las apps que solo muestran la web en un marco (regla 4.2 de revisión: la app debe ir "beyond a repackaged website") y dentro de una app no llegan los avisos web.
- **Valores:** identificador `org.somosnosotros.app`, nombre "Somos Nosotros", idioma principal español (México), código interno (SKU) `somosnosotros-ios`.

## Hecho en Apple
El founder entró con su Apple ID en el navegador integrado; lo demás lo hice yo con su sí a cada alta.
- **Cuenta:** Apple Developer Program personal, equipo `AT53235M7U`; en la tienda el desarrollador aparece como "Oscar Muñiz Blanco". En esta Mac están Xcode 26.2 (la versión mínima que Apple exige desde el 28 de abril de 2026) y el certificado de distribución del equipo.
- **Identificador** (Certificates, Identifiers & Profiles): "Somos Nosotros" · `org.somosnosotros.app`, explícito, con Push Notifications, Sign In with Apple y Associated Domains.
- **Ficha** (App Store Connect): "Somos Nosotros", iOS, Spanish (Mexico), SKU `somosnosotros-ios`, acceso completo. Apple ID de la app: `6812916453`. El nombre quedó apartado.
- Sin llaves todavía: la de avisos (APNs) y la de entrar con Apple se crean cuando se construya la app.

## Qué pide Apple y qué falta
Revisión del código contra las reglas de revisión, sin cambios en el repo.

1. **Entrar para el revisor.** Solo hay código de 8 dígitos por correo (`src/app/entrar/`), sin contraseña ni cuenta de prueba, y Apple exige darle al revisor una forma de entrar. El enlace del correo abre Safari y no la app; eso se resuelve con los enlaces que abren la app.
2. **Moderación** (regla 1.2: filtrar, reportar, bloquear y contacto publicado). Ya hay "Reportar" en lugares, eventos y artistas, y el admin oculta esas fichas. **Falta:**
   - reportar el perfil de una persona (`src/app/personas/[id]/page.tsx`);
   - bloquear a una persona;
   - que el admin oculte o suspenda a una persona;
   - un aviso al admin cuando llega un reporte (`src/app/reportes.ts` solo lo guarda).
3. **Avisos.** Hoy son avisos web (`src/lib/push.ts`, `public/sw.js`) y dentro de una app no llegan. Hace falta guardar el token del iPhone y mandar por APNs desde `src/lib/avisos.ts` y el cron de `src/app/api/recordatorios/route.ts`.
4. **Soporte y contacto.** Apple pide una liga de soporte y `/soporte` no existe. El único correo que recibe es el del aviso de privacidad; `hola@` y `avisos@` del dominio no reciben.
5. **Aviso de privacidad al día con el código** (`src/app/privacidad/page.tsx`):
   - la ubicación también se usa en "Cercanos" y "Estoy aquí", y este manda las coordenadas a Mapbox;
   - dice "Sin rastreo", pero Mapbox GL manda métricas de rendimiento por omisión (`src/components/Mapa.tsx`);
   - dice que la cuenta se borra en Mi perfil y está en Ajustes;
   - no dice que las fotos subidas siguen públicas al borrar la cuenta;
   - hay que revisar "Reclamar esta ficha" ahora que entró el PR #62.
6. **Icono de la tienda:** 1024×1024 sin transparencia. Los PNG de `public/` tienen canal alfa; `docs/diseno/logotipo/iconos.py` genera tamaños.
7. **La app de iPhone:**
   - proyecto de Xcode;
   - `/.well-known/apple-app-site-association` en el sitio (hoy da 404);
   - enlaces externos (`target="_blank"`: Google Maps, redes, enlace del evento) hacia Safari;
   - el `.ics` de `src/app/eventos/[id]/calendario/route.ts` hacia el calendario;
   - textos de permiso de ubicación y cámara;
   - pantalla sin conexión.
8. **Ficha en App Store Connect:**
   - subtítulo y categorías;
   - derechos sobre contenido de terceros: fotos del CAPO y carteles de redes (lo declara el founder);
   - clasificación por edad, con las preguntas nuevas sobre redes sociales;
   - gratis y solo México, así no aplica el trámite de la Unión Europea;
   - privacidad, textos y capturas de 6.9" (1320×2868);
   - datos para el revisor.

## Orden propuesto
1. **Web (un PR):** moderación, soporte, aviso de privacidad, entrada del revisor, métricas de Mapbox apagadas, icono 1024.
2. **App de iPhone (un PR):** proyecto de Xcode, avisos por APNs, entrar con Apple, enlaces que abren la app, calendario y pantalla sin conexión.
3. **Ficha y TestFlight** en el iPhone del founder; después, envío a revisión.
