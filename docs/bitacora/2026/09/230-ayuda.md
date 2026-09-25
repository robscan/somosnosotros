# 230 · Página /ayuda, URL de soporte de App Store (OL-201)

**Fecha:** 2026-09-25 · **Rama:** `ayuda`, desde `origin/main`.

## Pedido

OPEN_LOOPS, OL-201 (2026-09-25): Apple exige una URL de soporte con forma de contacto para la ficha de la
app en App Store Connect. Página pública `/ayuda`: contacto (`hola@somosnosotros.org`), preguntas frecuentes
cortas y enlace a `/privacidad`. Textos para firma del founder.

## Dónde

- **`src/app/ayuda/page.tsx`** (nueva): la página. Calcada de `src/app/privacidad/page.tsx` y
  `src/app/reglas/page.tsx` — mismo canon (`Barra` con volver, `.pagina`, `.titulo`/`.subtitulo` globales) y
  reutiliza `src/app/privacidad/legal.module.css` (`styles.texto`) tal cual, sin CSS nuevo.
- **`src/components/ui/Iconos.tsx`**: `IconoAyuda` (signo de interrogación en un círculo), un icono
  convencional más en la lista ya existente — no había ninguno para "ayuda"; sigue el mismo dibujo de trazo
  (24×24) y el mismo truco del punto relleno (`r="0.6" fill="currentColor"`) que ya usa `IconoPendiente`.
- **`src/app/ajustes/page.tsx`**: un renglón «Ayuda» nuevo en el grupo «Somos Nosotros», junto a «Aviso de
  privacidad» y «Reglas de uso» (el sitio natural: ahí ya viven los enlaces legales/de soporte).
- **`src/lib/sitemap.ts`**: `/ayuda` sumada a `RUTAS_ESTATICAS`, después de `/privacidad`.
- **`src/lib/sitemap.test.ts`**: la prueba de rutas fijas actualizada con la URL nueva.

## Qué dice la página (verificado en el código, no supuesto)

Cada respuesta se comprobó contra el código real antes de escribirla:

- **Cómo escribirnos:** `hola@somosnosotros.org` (enlace `mailto:`) — ya es la dirección pública del proyecto,
  usada como `VAPID_SUBJECT` por defecto en `src/lib/push.ts:18`. No se usó el correo personal del founder que
  lleva `/privacidad` (`oscar@agenciaparadigma.com`, el responsable legal de datos): son dos preguntas
  distintas — soporte de la app vs. derechos ARCO — y la instrucción de esta pieza pedía específicamente la
  dirección del proyecto.
- **Qué es Somos Nosotros:** tomado de `docs/DEFINICION.md` («Qué es» y «Reglas simples»).
- **Cómo publico un evento:** confirmado en `src/app/eventos/nuevo/page.tsx` (requiere sesión, redirige a
  `/entrar` si no la hay) y `src/lib/cartel.ts` (`leerCartel`: si hay cartel, se leen título, fecha, hora,
  lugar, dirección, precio y artistas, y la persona los revisa en el formulario antes de publicar).
- **Cómo reclamo mi ficha de artista:** confirmado en `src/app/artistas/[id]/EsMiNombre.tsx` («Soy yo / es mi
  grupo», con las dos salidas «llevar la ficha» / «que se quite», y aviso de que el administrador escribe al
  correo si hace falta revisar).
- **Cómo sigo y activo avisos:** confirmado en `src/components/Seguir.tsx` («Seguir» en la ficha de lugar o
  artista, con la pregunta de avisos por correo o push tras el toque).
- **Cómo borro mi cuenta:** confirmado en `src/app/ajustes/page.tsx` (botón «Borrar mi cuenta» al final,
  componente `Borrar`) y `src/app/perfil/acciones.ts:59` (`borrarMiCuenta`, rpc `borrar_mi_cuenta`) — se borra
  cuenta, perfil, seguidos y asistencias; lo publicado se queda sin el nombre de autor.
- **Cómo reporto algo incorrecto:** confirmado en `src/components/ui/MenuAcciones.tsx` (menú «···» de la barra
  interior) y `src/components/Reportar.tsx` (motivo + detalle opcional, revisión del administrador).

## Textos propuestos (para firma del founder)

> **Ayuda**
> Cómo escribirnos y las preguntas más comunes sobre Somos Nosotros.
>
> **Cómo escribirnos**
> Manda un correo a hola@somosnosotros.org y te respondemos.
>
> **¿Qué es Somos Nosotros?**
> Un directorio de los lugares culturales de San Luis Potosí y su agenda de eventos, para que la gente de la
> ciudad se entere de qué hay y se conozca. Sin fines de lucro; lo publican el administrador y quienes se
> registran.
>
> **¿Cómo publico un evento?**
> Con tu cuenta, toca «Publicar evento», elige el lugar y pon fecha y hora. Si subes una foto del cartel, la
> app intenta leer el título, la fecha, el lugar y los artistas por ti; tú revisas y ajustas antes de publicar.
>
> **¿Cómo reclamo mi ficha de artista?**
> Si ya existe una ficha con tu nombre, ábrela y toca «Soy yo / es mi grupo»: puedes pedir llevarla tú o pedir
> que se quite. El administrador la revisa y, si hace falta, te escribe a tu correo.
>
> **¿Cómo sigo artistas y lugares, y activo avisos?**
> En la ficha de un lugar o un artista, toca «Seguir». Te preguntamos si quieres avisos de sus eventos nuevos,
> por correo o con notificaciones del teléfono; lo cambias cuando quieras en Ajustes.
>
> **¿Cómo borro mi cuenta?**
> Entra a Ajustes y, al final, toca «Borrar mi cuenta». Se borran tu correo, tu perfil, lo que sigues y a qué
> eventos vas; lo que publicaste se queda para la comunidad, sin tu nombre.
>
> **¿Cómo reporto algo incorrecto?**
> En la ficha del lugar, evento, artista o perfil, abre el menú «···» y toca «Reportar»: eliges el motivo y,
> si quieres, agregas un detalle. El administrador lo revisa.
>
> (Al final:) Aviso de privacidad: somosnosotros.org/privacidad

Metadatos: `title: "Ayuda · Somos Nosotros"`, `description: "Cómo usar Somos Nosotros: publicar un evento,
seguir lugares y artistas, avisos, borrar tu cuenta y cómo escribirnos."` Sin `robots: {index:false}` (a
diferencia de `/ajustes`): indexable, como `/privacidad` y `/reglas`; no bloqueada en `src/app/robots.ts`.

## Dónde se enlaza

Desde **Ajustes** (`/ajustes`), grupo «Somos Nosotros», junto a «Aviso de privacidad» y «Reglas de uso» —
el único sitio del código donde ya vivían los enlaces legales/de soporte (no hay pie de página aparte en esta
app; se revisó y no se inventó un sitio nuevo). La propia página `/ayuda` enlaza a `/privacidad` al final,
igual que `/privacidad` y `/reglas` se enlazan entre sí.

## Un problema de ambiente encontrado (no de esta pieza)

Al correr la verificación por primera vez, `npm run typecheck` y `npm run build` fallaban en el árbol de
`main` (comprobado también en `/Users/apple-1/somosnosotros`, sin ningún cambio mío): `@vercel/analytics` y
`qrcode` están en `package.json`/`package-lock.json` pero no estaban instalados en ningún `node_modules` de
esta Mac — `src/components/AnalyticsVercel.tsx` (importado desde `layout.tsx`) y `src/lib/qr.ts` no resolvían.
No es nada de esta pieza: son dependencias de otro trabajo ya en `main` (rama `analitica-vercel`) sin
`npm install` corrido después. Instalé esas dos con `npm install @vercel/analytics@2.0.1 qrcode@1.5.4
--no-save` (ya fijadas en el lockfile; `--no-save` para no tocar `package.json` ni `package-lock.json` —
verificado con `md5` antes y después, sin cambio) para poder correr la evidencia de esta pieza. Aparte, en
algún momento de la sesión el `node` de Homebrew de la Mac se rompió (`dyld: Library not loaded:
libicui18n.74.dylib`, un `icu4c` actualizado por otra sesión concurrente) — usé el `node` de `/usr/local/bin`
(intacto) con `PATH="/usr/local/bin:$PATH"` para los cuatro comandos. Y el disco de la Mac se quedó sin
espacio (119 Mi libres) al instalar un `node_modules` completo propio en el árbol de trabajo (`npm ci`, 553M);
lo borré de inmediato y usé en su lugar `cp -Rc` (clonefile de APFS, copy-on-write, ~8 Mi reales) del
`node_modules` de `/Users/apple-1/somosnosotros` — un enlace simbólico no sirve, Turbopack lo rechaza
(«Symlink … points out of the filesystem root»). Ninguno de los tres (paquetes, `node` roto, disco lleno) es
un cambio de esta pieza ni queda en el árbol de la rama; se lo aviso al gestor de cambios por si otro chat
tropieza con lo mismo.

## Evidencia

```
npm run lint && npm run typecheck && npm test && npm run build
```

Las cuatro en verde (con las salvedades de ambiente de arriba): lint 0 errores (1 warning preexistente sin
relación, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1255 pruebas, 98 archivos**, todas en
verde (incluida `sitemap.test.ts` actualizada); build completo — `○ /ayuda` sale como ruta estática en la
tabla final.

Captura real (390×844, `deviceScaleFactor: 2`) con `next build && next start` (puerto 4230) y **Chrome real**
de la Mac vía `playwright-core` (`channel: "chrome"`, scratchpad de la sesión) — no el navegador del sistema
de esta herramienta. Fuente Bricolage cargada (se ve condensada en el logotipo y los títulos).

En `docs/rediseno/capturas-230/`:

- **`01-ayuda.png`:** arriba de la página — barra con «Atrás» y el logotipo, título «Ayuda», el contacto
  (`hola@somosnosotros.org` como enlace) y las dos primeras preguntas.
- **`02-ayuda-final.png`:** el resto de las preguntas, hasta el enlace final a «Aviso de privacidad:
  somosnosotros.org/privacidad».

El renglón «Ayuda» en Ajustes no se capturó aparte: esa pantalla exige sesión de Supabase y este entorno no
tiene credenciales para entrar; se verificó leyendo `src/app/ajustes/page.tsx` (el `<Link href="/ayuda">`
queda entre los de privacidad y reglas, con el mismo marcado `styles.fila`).

`git diff origin/main -- src/app/ayuda/page.tsx src/app/ajustes/page.tsx src/components/ui/Iconos.tsx
src/lib/sitemap.ts src/lib/sitemap.test.ts | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` solo encontró
`hola@somosnosotros.org`.

## Lo que no se tocó

`src/app/privacidad/page.tsx`, `src/app/reglas/page.tsx` (solo leídos, como modelo), `apps/**`,
`src/app/auth/**`, `package.json`, `package-lock.json`. Sin dependencia nueva declarada, sin migración.

## Cierre

`git status --short` en la rama, limpio salvo lo de esta pieza. Commit local en `ayuda`; push y PR #236
contra `main` (https://github.com/robscan/somosnosotros/pull/236), sin unir (lo une el gestor).
