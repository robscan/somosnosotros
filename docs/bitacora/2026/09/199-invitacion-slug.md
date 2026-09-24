# 199 · Los correos de invitación a reclamar ficha usan el slug, no el UUID viejo (OL-164)

**Fecha:** 2026-09-23 · **Rama:** `invitacion-slug`, desde `origin/main`.

Bug del founder: los correos que invitan a los artistas del CAPO a reclamar su ficha ("Soy yo / es mi
grupo", `scripts/capo/invitar.ts`) seguían armando el enlace con el UUID del artista aunque la ficha
ya tiene su dirección legible por slug desde OL-114/OL-119 (migración `20260922140000_artistas_slug`).
Causa exacta: `urlFicha(artistaId)` solo recibía el UUID, y la consulta de `candidatosPendientes`
(`contactos_importados` → `artistas!inner(nombre, visible)`) no traía la columna `slug`.

## Qué se hizo

- `scripts/capo/invitar.ts`: la consulta de `candidatosPendientes` ahora trae también
  `artistas!inner(nombre, visible, slug)`; el tipo `FilaContacto` y `artistaDe` llevan `slug`; el tipo
  `Candidato` gana el campo `slug?: string | null`.
- `urlFicha(artistaId, slug?)` arma `https://somosnosotros.org/artistas/<slug>` cuando hay slug, y
  `.../artistas/<id>` (el UUID) solo si el artista aún no tiene uno (respaldo, no debería pasar con la
  migración de slugs ya aplicada, pero no rompe si pasa).
- `armarCorreo(nombre, artistaId, slug?, variante?)` pasa el slug a `urlFicha`; las dos llamadas de
  `main()` (ensayo y envío real) mandan `c.slug` / `primero.slug`.
- `scripts/capo/invitacion.md` actualizado: la liga se describe como `.../artistas/<slug>`, con la nota
  de que sin slug cae al UUID y el proxy lo redirige con 308 (OL-123, bitácora 158).
- Pruebas en `scripts/capo/invitar.test.ts`: separé el caso "con slug" del caso "sin slug (respaldo)"
  tanto en `urlFicha` como en `armarCorreo`; las demás pruebas del correo se ajustaron para comprobar
  el enlace con slug (el caso normal) además del enlace con UUID (el caso de respaldo).

### Antes y después del enlace generado (datos inventados)

Artista `Vitalis`, `artistaId = "abc-123"`:

- **Antes:** `armarCorreo("Vitalis", "abc-123")` → `url = "https://somosnosotros.org/artistas/abc-123"`
  (el UUID, siempre, aunque el artista ya tuviera slug).
- **Después, con slug** (`armarCorreo("Vitalis", "abc-123", "vitalis")`):
  `url = "https://somosnosotros.org/artistas/vitalis"`.
- **Después, sin slug** (`armarCorreo("Vitalis", "abc-123")`, artista aún sin migrar):
  `url = "https://somosnosotros.org/artistas/abc-123"` — mismo respaldo de antes, no se rompe.

## Punto 2 del encargo: el correo a instituciones y otros correos del servidor

Revisé `scripts/instituciones/invitar-agendas.ts` (el guion que invita a las instituciones a mandar su
agenda) y todo lo que arma enlaces con `somosnosotros.org/` en `src/lib/` y `scripts/`:

- `scripts/instituciones/invitar-agendas.ts` ya arma el enlace con `urlFicha(slug)` →
  `${SITIO}/lugares/${slug}` (línea 116-117), leyendo el slug de `agendas.json` (línea 56, columna
  propia) o de la consulta a `lugares` cuando hay más de un miembro (líneas 156, 185, 201). No usa el
  UUID en ningún caso: **nada que corregir aquí**.
- `src/lib/calendario.ts` arma la URL del evento en el `.ics` con `hrefEvento(e)`
  (`src/lib/eventos.ts`), que ya usa el slug cuando lo tiene y cae al UUID solo si falta (mismo patrón
  que `hrefArtista`): nada que corregir, y de todas formas no es un correo de invitación.
- El resto de referencias a `somosnosotros.org/` en `src/lib/` son de pruebas (`*.test.ts`) o de
  `estructurados.ts`/`enlaces.ts`, que ya reciben la URL ya armada (con slug) desde las páginas.
- El único correo real que arma el servidor con enlaces de ficha es `src/app/api/resend/route.ts`
  (webhook de rebotes/quejas): no arma URLs de ficha, solo apaga avisos; no aplica aquí.

Conclusión del punto 2: **solo `scripts/capo/invitar.ts` tenía el bug**; el guion de instituciones ya
usaba slug desde que se escribió.

## Punto 3: los correos ya enviados con el enlace viejo siguen funcionando

Comprobado con `curl -sI` contra producción (solo lectura, sin tocar datos), con un UUID real de un
artista visible (`Paulina Lucciotto`, tomado del enlace "Publicar una fecha" en su propia ficha
pública, que expone su `artista_id` en la query del botón):

```
$ curl -sI https://somosnosotros.org/artistas/5f02174f-cccc-47f7-8fb9-b1530c620594
HTTP/2 308
location: /artistas/paulina-lucciotto
refresh: 0;url=/artistas/paulina-lucciotto
```

Confirmado: el proxy (`src/proxy.ts` + `src/lib/redireccionSlug.ts`, OL-123) sigue redirigiendo con 308
cualquier `/artistas/<uuid>` a su slug. Los correos de invitación ya mandados con el enlace viejo por
UUID (antes de esta pieza) siguen abriendo la ficha correcta; no hace falta reenviar nada.

## Pruebas

```
npm run lint && npm run typecheck && npm test
```
Verdes: lint 0 errores (1 warning preexistente sin relación,
`docs/diseno/logotipo/iconos-sn.mjs`), typecheck limpio, **1123 unitarias, 90 archivos** (0 rotas; las
de `scripts/capo/invitar.test.ts` pasaron de 4 a 9, con el caso de slug y el de respaldo sin slug en
`urlFicha` y en `armarCorreo`).

```
npm run build
```
Verde: build completo, proxy y rutas dinámicas compilados; `CLAUDE.md`/`AGENTS.md` intactos tras el
build.

Sin cambios de UI ni de pantalla: sin captura móvil (esta pieza es un guion de servidor, no toca
`src/app` visual; regla de pruebas focalizadas por costo, founder 2026-09-18).

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna
dirección: los ejemplos del diff son nombres y UUID inventados (`Vitalis`, `abc-123`), sin correos.

## Cierre

Sin envío real ni escritura en producción; sin tocar `.env` ajeno. Commit local en `invitacion-slug`,
sin push (lo sube el gestor).
