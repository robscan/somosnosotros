# 468 · El nombre de la marca es «Somos Nosotrxs» en toda la app, desde una sola constante (OL-435)

**Fecha:** 2026-10-21. **Rama:** `marca-nosotrxs`, desde `origin/main` (`eb999989`). **Operador:** agente de la pieza (Claude) para el Gestor VII,
sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna nueva; `CORREO_REMITENTE` sigue igual en Vercel y ya no hace falta
tocarla (ver «Correos»). **Estado:** lista para la revisión del gestor.

## El pedido

Founder, hoy: «el día de ayer compartí la publicación por medio del botón que está en el inicio y compartió el nombre de Somos Nosotros. Necesito
que ya estandaricemos ese texto y que sea Somos Nosotrxs.» Ya lo había decidido en el doc 57 (§ D): «amigxs y Somos Nosotrxs en toda la app».

**Qué vio el founder.** El banner de Inicio ya mandaba a la hoja del teléfono «Somos Nosotrxs» (OL-407), pero lo que comparte es el enlace
`somosnosotros.org`, y WhatsApp o Mensajes pintan la vista previa con el `<title>` y el `og:title`/`og:site_name` de la portada, que decían
«Somos Nosotros» (`layout.tsx` y `page.tsx`). Eso es lo que llegó. Ahora los dos dicen la marca. WhatsApp guarda las vistas previas un tiempo:
un enlace ya compartido puede seguir mostrando el nombre viejo hasta que caduque su caché.

## Qué cambió

**Una sola constante: `src/lib/marca.ts`.** Constantes, nunca variables de entorno (lo decidido en `docs/investigaciones/valores-fijos-respuesta.md`):

- `MARCA = "Somos Nosotrxs"`;
- `MARCA_ANTERIOR = "Somos Nosotros"`, solo para el `alternateName` del JSON-LD (doc 57 § D), para que Google relacione los dos nombres;
- `tituloDePagina(...partes)` → «Grafo cultural · Administración · Somos Nosotrxs», y `SEPARADOR_TITULO`/`SUFIJO_TITULO` (los usa la app
  instalada para quitar la marca del título, OL-059);
- `remitenteCorreo(variable)` y `DIRECCION_AVISOS`: el remitente de los correos.

El dominio, el logotipo SMSNSTRS, el símbolo SN, los slugs, las claves guardadas en el teléfono (`somosnosotros:…`, `sn_entrar`), el UID del
calendario, `MARCA_USER_AGENT` (`SomosNosotrosApp`) y los identificadores de las apps (`org.somosnosotros.app`) **no cambian**.

**Títulos de página (58 sitios en 51 archivos).** Cada `«X · Somos Nosotros»` escrito a mano pasa a `tituloDePagina("X")`, también los armados con
el nombre de la ficha (`tituloDePagina(e.titulo, "Ya pasó")`, `tituloDePagina(obra?.nombre ?? "Obra colectiva", "Administración")`), la página de
baja de avisos (HTML a mano en `avisos/baja/route.ts`) y el título por omisión del sitio. `tituloInstalada` quita `SUFIJO_TITULO` en vez de una
expresión con el nombre.

**Compartir y vista previa de enlaces.** `layout.tsx`: `title`, `applicationName`, `appleWebApp.title`, `openGraph.title`/`siteName` y
`twitter.title`; la portada (`page.tsx`); `siteName` de Agenda, Lugares, Artistas y las fichas de evento, lugar, artista y persona. El banner de
Inicio (`BannerCompartir`) y «Invitar a tus amigxs» de Mi perfil leen la constante (el texto del banner no cambia: ya decía «amigxs»). El texto
de compartir a una persona («Estoy en Somos Nosotrxs, la agenda de la cultura local…», `lib/perfil.ts`) y la descripción de su ficha («Está en…»).

**PWA y JSON-LD.** `manifest.ts`: `name` y `short_name`. `jsonLdSitio`: `name: "Somos Nosotrxs"`, `alternateName: "Somos Nosotros"`. El título
por omisión de un aviso push en `public/sw.js` («somosnosotros» → «Somos Nosotrxs», escrito tal cual: un archivo estático no importa la constante).

**Textos visibles.** Ayuda («¿Qué es Somos Nosotrxs?», subtítulo y descripción), Reglas, Privacidad (`RESPONSABLE.nombre` y «saben que entraste a…»),
el grupo «Somos Nosotrxs» de Ajustes, la hoja «Instala Somos Nosotrxs», la hoja «Vas a salir de Somos Nosotrxs» (`ui/EnlaceExterno`), el nombre
accesible del logotipo («Somos Nosotrxs, ir al inicio»), el `alt` del logotipo en el letrero para imprimir, «Solo quien fundó Somos Nosotrxs cambia
el rol» (Administración › Personas) y «Notificaciones › Somos Nosotrxs» (dónde se activan los avisos en iPhone). Lo que ya decía «Somos Nosotrxs»
a mano (la ceja de «Tu año», el pie de los documentos PDF, su autor y productor) ahora lee la constante.

**Correos.** `lib/correo.ts` (avisos de la app) y `scripts/lib/correo-envio.ts` (envíos desde la Mac) usan `remitenteCorreo(process.env.CORREO_REMITENTE)`:
de la variable solo se toma la dirección y el nombre es siempre la marca. Así el remitente cambia en producción sin tocar Vercel, donde la variable
seguramente dice «somosnosotros <avisos@…>» (`.env.example` lo decía así; ahora dice «Somos Nosotrxs <…>» con la nota). Las invitaciones del CAPO
(`scripts/capo/invitar.ts` y su plantilla `invitacion.md`: asunto, cuerpo y firma) y de agendas de instituciones (`scripts/instituciones/invitar-agendas.ts`:
asuntos, presentación, firma y el `alt` del icono) leen la constante. Las tandas ya enviadas no cambian; el control de reenvíos usa solo el hash
del correo de destino, no el texto, así que el cambio no provoca correos repetidos. Los avisos de evento (nuevo, cambio, recordatorio) no llevan
el nombre.

**Apps nativas** (la próxima compilación lo llevará): iPhone, `Info.plist` (`CFBundleDisplayName`, el nombre bajo el icono, y los textos de los
permisos de cámara y ubicación: «Somos Nosotrxs pide tu cámara…», «…tu ubicación…»), `capacitor.config.ts` (`appName`) y `www/index.html`.
Android, `twa-manifest.json` (`name`, la fuente) y, para que el proyecto generado no se quede atrás, `app/build.gradle` y `res/raw/web_app_manifest.json`;
el nombre bajo el icono sigue siendo `SMSNSTRS` (`launcherName`). La suma `manifest-checksum.txt` ya no cuadraba antes de esta pieza (cambió
la ruta de la llave en `17632b44`): la siguiente compilación con Bubblewrap ofrecerá regenerar el proyecto y saldrá igual. El README de Android
lo dice.

**Línea gráfica.** `docs/diseno/LINEA_GRAFICA.md` fijaba «Somos Nosotros» como nombre escrito (2026-09-14): ahora dice «Somos Nosotrxs» con la
frase del founder de hoy y la del doc 57, y dónde vive la constante.

**Lenguaje incluyente.** No quedaba ningún «amigos» en `src/`, `public/`, `apps/` ni `scripts/` («Invitar a tus amigxs» y «Comparte con tus
amigxs» ya estaban). No cambié otras palabras.

## La prueba que impide que vuelva

`src/lib/marca.test.ts`: fija `MARCA = "Somos Nosotrxs"`, prueba `tituloDePagina` y `remitenteCorreo` (variable vacía, con nombre viejo, solo
dirección, sin dirección), y recorre con `git ls-files --cached --others --exclude-standard` lo de `src/`, `public/`, `apps/` y `scripts/` (lo
nuevo sin comitear cuenta; lo que git ignora, como lo que genera `cap sync` en la Mac, no) buscando `somos\s+nosotros` sin importar mayúsculas
ni saltos de renglón. Excepciones con su razón: `src/lib/marca.ts` (`MARCA_ANTERIOR`), el archivo de OL-434 (abajo) y la carpeta
`scripts/ops/auditoria-ui/prototipo/` (generador del prototipo v3 firmado, OL-227: registro, no llega a nadie). Si una excepción deja de hacer
falta, la prueba pide quitarla. **Control negativo:** un archivo temporal en `src/lib` con «Somos» y «Nosotros» en dos renglones la hizo fallar
con su ruta; borrado.

Las pruebas que comprobaban el nombre leen la constante: las unitarias con `MARCA` (los títulos como `` `Evento de prueba · ${MARCA}` ``, para
seguir comprobando el separador) y las de componentes (`Armazon`, `GiroPortadasAjuste`, `BannerCompartir`) empaquetando `marca.ts` con esbuild,
como ya hace `Imagen.componentes.test.mjs`. `DocumentoPdf` e `Inicio` ya esperaban «Somos Nosotrxs» en datos o texto visible y no los toqué.

## Lo que quedó fuera, y por qué

- **Los tres archivos de OL-434** (otro agente los trabaja ahora): `src/app/admin/ciudades/[slug]/propuestas/page.tsx` sigue con
  `title: "Propuestas · Administración · Somos Nosotros"` (excepción temporal en la prueba: al unir OL-434 hay que cambiarlo por
  `tituloDePagina("Propuestas", "Administración")` y quitar la excepción; la prueba avisa). `src/app/admin/ciudades/Bandeja.tsx` y
  `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs` no llevan el nombre en `origin/main`.
- **El correo del código de acceso** lo manda Supabase Auth con el SMTP de Resend y la plantilla «Magic Link» que el founder configuró en su
  panel (bitácoras 014 y 026; nombre de remitente `somosnosotros`). No vive en el repo: lo cambia el founder en Supabase → Authentication →
  Emails (nombre del remitente y, si la plantilla lo nombra, su texto).
- **Las fichas de App Store Connect y Google Play** (nombre en la tienda, descripción y capturas): las cambia el founder.
- **El mensaje del disparador `proteger_rol`** (`20260917090000_panel_administracion.sql`: «solo quien fundó Somos Nosotros cambia el rol») solo
  sale ante un `update` directo a la base; la pantalla usa su propio texto, ya cambiado. Cambiarlo pide una migración nueva que redefina la
  función; esta pieza va sin migración.
- **Documentos e historial** (`docs/`, bitácoras, prototipos firmados): son registro; no se reescriben.
- **El nombre bajo el icono en iPhone**: «Somos Nosotrxs» tiene 14 letras, como «Somos Nosotros»; iOS lo corta igual que antes. Quien ya instaló
  la web en su inicio conserva el nombre con el que la instaló (iOS no lo actualiza).

## Evidencia

- `npm run lint` (0 errores; el único aviso es previo, en `VisorImagen.componentes.test.mjs`), `npm run typecheck` en verde.
- `npm test`: 263 archivos, **4 323 pruebas**, 0 fallaron (con `src/lib/marca.test.ts`, 4 pruebas).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **2 225 pruebas, 0 fallaron** (sin migración nueva).
- `npm run inventario`: sin novedades. `npm run medir`: 51 pantallas × 4 anchos en 172 s, sin novedades (teclado: 12 campos en 12 pantallas).
- `npm run test:componentes` completo: **676 de 676**.
- Capturas 390×844 a 2× con el respaldo local y Chrome real (`node scripts/ops/auditoria-ui/capturar-marca.mjs . docs/rediseno/capturas-468`,
  sesión de Ana, reloj fijo martes 21 de octubre 10:00), abiertas una por una:
  - `01-inicio-banner-compartir.png`: Inicio, el banner tras el carril estelar con el símbolo SN, «¿Te gusta Somos Nosotrxs?», «Comparte con tus
    amigxs.» y «Compartir» en violeta; tras tocarlo (toque real en su centro, comprobado con `elementFromPoint`) el aviso «Gracias por compartir»
    abajo. La hoja del teléfono, imitada (headless no tiene hoja), recibió `title: "Somos Nosotrxs"`, `text: "¿Te gusta Somos Nosotrxs? Comparte
    con tus amigxs."`, `url: "https://somosnosotros.org"`.
  - `02-ajustes-grupo-marca.png`: Ajustes, el grupo «SOMOS NOSOTRXS» (Instalar la app, Avisar al salir del sitio, Mover las portadas, Ayuda,
    Aviso de privacidad, Reglas de uso) bajo «Cuenta».
  - `03-ayuda-que-es.png`: Ayuda, «Cómo escribirnos y las preguntas más comunes sobre Somos Nosotrxs.» y «¿Qué es Somos Nosotrxs?»; el título
    de la pestaña es «Ayuda · Somos Nosotrxs».
  - `04-lo-que-lee-un-enlace.png`: una tarjeta (rotulada como lectura, no pantalla de la app) con lo que la app sirve a una vista previa de
    enlace: la hoja de compartir de Inicio y de «Invitar a tus amigxs» (título «Somos Nosotrxs»), y de `/`, `/agenda` y una ficha de evento el
    `<title>`, `og:title` y `og:site_name`; en `/`, también `apple-mobile-web-app-title`, `application-name` y el JSON-LD (`name: Somos Nosotrxs`,
    `alternateName: Somos Nosotros`). El manifiesto: `name` y `short_name` «Somos Nosotrxs». Lo que no cabe en la imagen (Ayuda y la página «No
    está») está en `lecturas.json`, todo con «Somos Nosotrxs».
- `OPEN_LOOPS.md`: ninguna línea de `main` se perdió; la cadena de «Last updated» sigue entera detrás del trozo nuevo. Ya traía de `main` tres
  trozos repetidos (OL-389 dos veces, OL-159 tres): no los toqué.

## Decisiones por confirmar

1. **El remitente ignora el nombre de `CORREO_REMITENTE`** y pone siempre la marca (solo toma la dirección). Alternativa: que el founder cambie la
   variable en Vercel y el código la respete tal cual.
2. **`RESPONSABLE.nombre` del aviso de privacidad** pasa a «Somos Nosotrxs» (el doc 57 lo dejó por confirmar «si es un nombre legal»; hoy el
   aviso usa la marca, no una razón social).
3. **`alternateName: "Somos Nosotros"` en el JSON-LD** (doc 57 § D), para que Google relacione los dos nombres; se puede quitar cuando Search
   Console muestre el nombre nuevo.
4. **La carpeta del prototipo v3** (`scripts/ops/auditoria-ui/prototipo/`) queda con el nombre viejo como registro de lo firmado.
