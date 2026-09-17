# 088 · SEO: mapa del sitio, robots, datos para Google, fichas fuera del índice y título repetido en la app instalada (OL-059)

**Fecha:** 2026-09-17 (madrugada) · **Rama:** `seo-indexar`, desde `origin/main` 6249a3e. Solo commits locales, sin push, sin migración. · **Pedido del founder:** revisar el SEO del proyecto, y en el camino, que en la app instalada de escritorio (Chrome, Mac) el título no salga repetido. Gestión de cambios separó el pedido original en dos piezas (mensaje del 2026-09-17, madrugada): esta (SEO, sin depender de nada) y "más datos en `/admin`" aparte (bitácora 089, OL-060, con documento para firma antes de tocar código) — el founder aclaró que lo que quiere de Analytics es más datos en su panel, no publicidad, y ya se cubre sin ningún tercero.

## Causa

El proyecto no tenía `sitemap.ts` ni `robots.ts` (convención de Next App Router): Google no tenía lista de fichas para rastrear ni instrucción de qué no indexar. Tampoco había datos estructurados (JSON-LD) en la ficha de evento, así que una fecha y un lugar no podían salir directo en el buscador. Páginas personales (`/admin`, `/ajustes`, `/perfil`, `/entrar`, fichas de `/personas`) eran indexables. Los filtros por URL en Lugares y Artistas no tenían canonical a la lista base.

Aparte, el founder reportó que en la app instalada desde Chrome en su Mac el título de la ventana se veía repetido: cada pantalla termina su título en " · Somos Nosotros" (bueno para una pestaña normal o un resultado de Google), y el propio sistema (Dock, Exposé) ya suma el nombre con el que se instaló la app — la marca salía dos veces.

## Qué se hizo

- **`src/lib/sitemap.ts`** (nuevo, funciones puras, probadas sin tocar la base): qué lugar, evento o artista entra al mapa del sitio.
  - Lugar: visible y no privado ("Solo tú lo ves").
  - Evento: visible y no terminado (`termina`, columna de la base, misma regla que la agenda).
  - Artista: visible; los traídos del CAPO sin reclamar quedan fuera con un interruptor de una línea (`CAPO_SIN_RECLAMAR_EN_SITEMAP`, hoy apagado) — **pendiente del founder** (junto con lo de privacidad, OL-018): ¿entran al sitemap los 520 artistas del CAPO que no han reclamado su ficha y siguen sin invitación por correo?
  - Cada regla de exclusión (ficha oculta, lugar privado, evento pasado) se filtra también dentro de la función, no solo en la consulta: así se prueba sin PGlite ni servidor.
- **`src/app/sitemap.ts`:** trae lugares/eventos/artistas con `clienteServidor()` (cliente público, RLS — nunca la llave de servicio) y arma el XML con las funciones de arriba. `revalidate = 3600`: sin esto, si en algún build `clienteServidor()` no llega a pedir las cookies, Next puede congelar el mapa como estático en ese momento y no tocarlo hasta el próximo despliegue — una ficha ocultada después seguiría listada.
- **`src/app/robots.ts`:** permite todo salvo `/admin`, `/ajustes`, `/perfil`, `/entrar`, `/avisos`, `/borrado`, `/personas` y `/auth` (el relevo de Apple/Google; su HTML ya llevaba `noindex` propio, esto evita que un buscador ni lo intente); referencia al sitemap.
- **JSON-LD tipo Event en la ficha de evento** (`jsonLdEvento` en `src/lib/eventos.ts`, enganchado en `eventos/[id]/page.tsx`): nombre, fecha de inicio y fin, imagen, si es gratis (`isAccessibleForFree`) y el sitio. Solo datos públicos:
  - la coordenada sale solo si es la de un lugar registrado visible y no privado, o la de un "otro sitio" público; la de un sitio **reservado** nunca sale (la real vive en `eventos_sitio_privado`, aparte, y no se toca aquí);
  - sin precio: `precio` es texto libre ("$150", "taquilla"...) y no hay forma segura de volverlo un número sin inventarlo; mejor omitir el dato que darlo mal a Google;
  - nunca quién va;
  - el `<script>` solo se pinta si `evento.visible && !paso` — exactamente lo que vería alguien sin sesión (si no, `notFound()` ya cortó antes, salvo para el autor o el administrador);
  - el JSON se escapa (`<` → `<` tras `JSON.stringify`) para que un título o descripción con `</script>` no rompa la página.
- **Fuera del índice** (`robots: { index: false, follow: false }` en su metadata): `/admin`, `/admin/[seccion]`, `/admin/personas`, `/ajustes`, `/ajustes/editar`, `/perfil`, `/entrar`, `/borrado`, `/personas/[id]`. La ficha de persona conserva su Open Graph (para que el enlace compartido se vea bien en WhatsApp); lo único nuevo es que Google no la ofrezca en resultados.
- **Canonical en listas con filtro** (`alternates.canonical`): `/lugares` y `/artistas` siempre apuntan a la lista sin filtro — `?tipo=museo` o `?hace=musica` no son una página nueva para Google.
- **Título propio del inicio:** "Agenda cultural de San Luis Potosí · Somos Nosotros" con su descripción; antes heredaba el genérico del layout raíz en la página más importante del sitio.
- **El título repetido en la app instalada de escritorio** (pedido del founder en el camino, mismo tema): abierta desde el icono, el sistema (las ventanas del Dock, Exposé) ya suma el nombre con el que se instaló, y cada pantalla también termina su título en " · Somos Nosotros" — se veía la marca dos veces. `tituloInstalada` (`src/lib/plataforma.ts`) quita esa cola solo cuando `plataformaActual().instalada` es cierto (la misma detección que ya usan los avisos); `TituloInstalada` (nuevo, montado en el layout raíz junto a `RegistroSW`/`MemoriaScroll`) lo aplica tras cada cambio de ruta, porque Next vuelve a poner el título completo en cada pantalla. En una pestaña normal del navegador no toca nada — confirmado en vivo (ver Verificación).

## Verificación

- `npm run lint`: 0 errores (el aviso de siempre, ajeno, en `docs/diseno/logotipo/iconos-sn.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: **334 pruebas, 35 archivos**, todas en verde. Nuevas: `src/lib/sitemap.test.ts` (8 — una ficha oculta, un lugar privado y un evento pasado no salen; un artista del CAPO sin reclamar no sale y uno reclamado sí), 4 en `src/lib/eventos.test.ts` para `jsonLdEvento` (campos mínimos, geo solo si es pública, sin precio inventado, descripción/imagen solo si vienen) y 3 en `src/lib/plataforma.test.ts` para `tituloInstalada` (quita la marca del final, no toca un título que ya no la lleva, nunca deja una ventana en blanco).
- `npm run build`: verde. `/sitemap.xml` y `/robots.txt` construidos; con `next start` local (sin `.env`, así que el sitemap cae a su respaldo seguro de solo páginas fijas — no hay credenciales de Supabase en este árbol) se confirmó el XML y el `robots.txt` reales:
  ```
  User-Agent: *
  Allow: /
  Disallow: /admin
  Disallow: /ajustes
  Disallow: /perfil
  Disallow: /entrar
  Disallow: /avisos
  Disallow: /borrado
  Disallow: /personas
  Disallow: /auth

  Sitemap: https://somosnosotros.org/sitemap.xml
  ```
  (el `/sitemap.xml` con las 5 rutas fijas; con datos reales sumaría cada lugar, evento y artista según las reglas de arriba — probadas aparte).
- **Captura móvil (390×844)**, navegador integrado sobre el mismo `next start` local: el inicio pinta bien, con el título nuevo en la pestaña ("Agenda cultural de San Luis Potosí · Somos Nosotros") y el estado vacío de siempre (sin datos locales); Lugares también, con su aviso ya conocido de falta de token de Mapbox (no hay `.env` en este árbol, nada que ver con esta pieza). No se pudo capturar una ficha de evento real (este árbol no tiene backend con datos; probarlo así exige el respaldo local completo de [[project-somosnosotros]], que no se justificaba para un cambio sin UI visible) — la consola mostró un error genérico de carga de script ajeno a este cambio (mismo aviso con o sin las páginas tocadas; probable intento del service worker o de un prefetch, sin request fallida visible en la red más allá de prefetches de Next abortados) y la pantalla no se vio afectada.
- **`tituloInstalada` en vivo:** confirmado con JavaScript en el navegador integrado que, en una pestaña normal (`display-mode: standalone` en `false`), el título de Lugares se queda completo — "Lugares · Somos Nosotros" — sin tocar. No se pudo forzar el modo instalado desde este navegador (no hay manera de emularlo sin abrir la app real desde el icono, y `plataformaActual()` guarda su respuesta la primera vez que se pide en la pestaña, así que parchar `matchMedia` después no sirve); la transformación en sí queda cubierta por las 3 pruebas de arriba. Falta que el founder lo confirme en su app instalada de escritorio.

## Pendiente

- **Founder:** ¿los 520 artistas del CAPO sin reclamar entran al sitemap, o siguen fuera hasta que reclamen su ficha? (interruptor ya listo, apagado por defecto).
- **Founder:** confirmar en su app instalada de escritorio (Chrome, Mac) que el título ya no se repite — no se pudo forzar el modo "instalado" desde el navegador integrado para verlo en vivo (ver Verificación).
- Verificar en producción, tras el despliegue, que `/sitemap.xml` trae las fichas reales y que una búsqueda en Google Search Console (cuenta del founder, fuera de este repo) lo toma — no se creó cuenta de Search Console en esta pieza, no se pidió.
