# 213 · Revisión de seguridad de todo el desarrollo (OL-178)

**Fecha:** 2026-09-24 · **Rama:** `revision-seguridad`, desde `origin/main` (SHA de partida `a599c75`) ·
**Pedido del founder:** «Revisa posibles brechas de seguridad en todos los casos donde permitimos a los
usuarios inyectar url, corre una revisión del desarrollo para identificar otras brechas de seguridad.» ·
**Alcance:** solo documentos — sin código, sin migraciones nuevas, sin producción, sin secretos.

## Método

1. Se leyó primero lo obligatorio: `CLAUDE.md`, `docs/DEFINICION.md`, `docs/ops/GESTION_DE_CAMBIOS.md`,
   `docs/rediseno/09-enlaces-flujo-y-estados.md`, `docs/rediseno/44-novedades-artista.md` §3, `next.config.ts`,
   `vercel.json`, `public/sw.js`, y se buscó en `docs/ops/MEMORIA_GESTOR.md` con
   `grep -n -i "seguridad\|advisor"` — encontró el contexto del Security Advisor de Supabase (49 WARN/4 INFO en
   el 18 de septiembre, ya con una pasada de corrección aplicada ese mismo día) y las notas recientes sobre
   capturas y el proxy de red de este entorno.
2. **Parte 1 (URLs que mete la gente):** se leyó archivo por archivo cada punto listado en el encargo
   (`src/lib/enlaces.ts`, `src/lib/video.ts`, `ui/VideoEmbed`, `src/lib/novedadesArtista.ts` en la rama
   `novedades-artista-fase1` vía `git show`, `ui/EnlaceExterno`, el enlace de boletos del evento, las fotos y
   portadas, el `og:image`/JSON-LD de las cuatro páginas, las redirecciones, `BotonCompartir`, `ui/CodigoQr`,
   Mapbox, la lectura de cartel, los guiones de instituciones/CAPO y las notificaciones push), y para cada uno
   se armó o se corrió una prueba concreta con el valor de entrada que pedía el encargo (ver bitácora del
   documento, tabla de la Parte 1).
3. **Parte 2 (el resto):** se listaron las 59 migraciones de `supabase/migrations/` con `grep` (tablas,
   `enable row level security`, `security definer`, `using (true)`, `to anon`) y se leyeron las migraciones
   clave completas (`20260913120000_base.sql`, `20260917095000_autor_y_visible_solo_admin.sql`,
   `20260914080000_rol_solo_admin.sql`, `20260918130000_security_advisor.sql`,
   `20260922130000_pincel_canal_y_cupo.sql`, `20260922140000_artistas_slug.sql` y las de Storage); se leyeron
   las acciones de servidor de artistas/lugares/eventos/admin/avisos y las cuatro rutas de `src/app/api/*`.
4. Dos piezas mencionadas en el encargo viven en ramas sin fusionar: `novedades-artista-fase1` (PR #211) y
   `artistas-mis-fichas-y-reclamo` (PR pendiente, bitácora 212) — se leyeron con
   `git show origin/<rama>:<archivo>`, sin traerlas a esta rama.

## Qué se ejecutó

```
npm ci                                                    # sin salida, sin errores
npm audit --omit=dev                                      # "found 0 vulnerabilities"
npx vitest run src/lib/enlaces.test.ts src/lib/video.test.ts src/lib/eventos.test.ts
                                                            # 3 archivos, 63 pruebas, verdes
```

Pruebas de concepto en Node, fuera del árbol de trabajo (`scratchpad/pruebas/`, no comiteadas), con las
funciones puras copiadas tal cual del código para no depender de un bundler:

- `reconocerEnlace` contra `javascript:alert(1)`, `javascript:alert(1)//x.com`, `//evil.com`,
  `data:text/html,<script>…`, `vbscript:msgbox(1)`, un homógrafo cirílico (`аpple.com`), un dominio con
  espacio de ancho cero, un userinfo (`https://example.com@evil.com`) y un intento de `%2F%2F`: los cuatro
  esquemas peligrosos se rechazan solos (el prefijo `https://` forzado los vuelve URLs inválidas); el
  homógrafo se acepta como `xn--pple-43d.com` (S-02); el userinfo se acepta pero `dominioDe()` (la que se
  muestra en la hoja "Vas a salir") lee el `hostname` real, no el userinfo (S-05, ya mitigado).
- La regex de `foto`/`portada`/`imagen`/avatar (`/^https:\/\/[^\s]+$/`, igual en los cuatro archivos) probada
  contra `https://evil.example/tracking.png`: se acepta (S-01, el hallazgo de gravedad alta de este
  documento).
- El JSON-LD: `JSON.stringify({name: "Evento </script><script>alert(1)</script>"}).replace(/</g,"\\u003c")`
  → `{"name":"Evento </script><script>alert(1)</script>"}`, sin ningún `<` literal.

## Qué se encontró

Un hallazgo de gravedad **alta** (S-01: la foto/portada/imagen de una ficha solo exige "https, sin espacios"
en el servidor; la restricción a solo administración es de pantalla, no del servidor), dos de gravedad
**media** (S-02, homógrafos en `reconocerEnlace`; S-03, comparación no constante del secreto de cron), tres de
gravedad **baja** (S-04, S-05, S-06) y cinco **notas** informativas (S-07 a S-11). Ningún hallazgo crítico.
Detalle completo, con archivo y línea, tabla de hallazgos, inventario de la Parte 1, tabla de tablas de
Supabase con su RLS y el orden de arreglo propuesto: `docs/rediseno/46-revision-seguridad.md`.

Lo que ya está bien y no necesita arreglo (resumen; detalle en el documento): RLS activado en las 33 tablas
desde su propia migración de alta; más de 70 funciones SECURITY DEFINER, todas con `search_path = ''` desde la
revisión OL-077 (18 de septiembre) y en cada migración posterior; dos escaladas de privilegio reales que el
propio equipo ya encontró y cerró antes de esta revisión (autopromoción a admin, 14 de septiembre; adueñarse u
ocultar una ficha ajena, 16 de septiembre); el video incrustado y el JSON-LD, con pruebas concretas contra
inyección; las redirecciones, resistentes a *open redirect*; el bucket de fotos, con tamaño/tipo/ruta fijados
en el propio bucket; el canal en vivo de Pincel, exigiendo sesión y obra abierta/visible; `npm audit` limpio y
sin secretos en git.

## Límites de esta revisión (lo que no se pudo comprobar sin producción)

- Todo lo de RLS, funciones, Storage y Realtime se leyó de las migraciones del repo; no se comprobó contra el
  proyecto real de Supabase (sin credenciales, y no correspondía en una pieza de solo documentos).
- No se pudo verificar en vivo que el token de Mapbox siga restringido al dominio en la cuenta del founder
  (vive fuera del repo).
- No se pudo comprobar con `curl` si producción manda `Strict-Transport-Security`: este entorno no tiene
  salida de red al dominio `somosnosotros.org` (403 del proxy, ya documentado en `MEMORIA_GESTOR.md`, nota del
  24 de septiembre).
- No se corrió la suite completa (`npm test`, `npm run test:db` contra Postgres local): se corrieron las
  pruebas existentes de los tres archivos centrales a este encargo (enlaces, video, eventos — 63 verdes) y
  `npm audit`, suficiente para una revisión que no cambia código (regla de pruebas focalizadas por costo,
  `GESTION_DE_CAMBIOS.md`).
- Las dos piezas en ramas sin fusionar (`novedades-artista-fase1`, `artistas-mis-fichas-y-reclamo`) se
  revisaron tal como están hoy en esas ramas; si cambian antes de fusionarse, esta revisión no lo reflejará.
- No se intentó ningún ataque real contra producción: todas las pruebas de este documento son de código,
  ejecutadas localmente contra las funciones puras del repo.

## Cierre

Sin push ni PR abierto por este chat (push sí, al terminar, porque el encargo lo pide explícitamente; sin PR,
como en el resto de piezas — lo abre el founder o el gestor si hace falta). Commit local en
`revision-seguridad` con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
