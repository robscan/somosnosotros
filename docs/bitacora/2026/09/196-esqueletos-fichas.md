# 196 · Esqueletos, segunda parte: las tres fichas, la barra de Lugares y los chips de Agenda (OL-161)

**Fecha:** 2026-09-23 · **Rama:** `esqueletos-fichas`, desde `origin/main` (`dc8bb2a`) · **OL:** OL-161 (lo que OL-158 dejó fuera por prudencia). **Modelo:** Sonnet 5. Sin council, workflows ni subagentes.

## Resultado en una línea

Las tres fichas (evento, lugar, artista) pintan su cabecera — foto, nombre, meta, JSON-LD, canonical, candado del sitio reservado, menú de administración — en el HTML inicial; lo que pide una consulta aparte ("quién va", "próximos eventos", "se presenta en") va en `<Suspense>` con esqueletos de renglón. Lugares separa la barra y las pestañas (pintan con solo `lugares`, ya resuelto) del mapa y la lista (`CuerpoLugares`, tras destacados/seguidos/semana, diferidos). Agenda separa los chips (fecha, ciudad, pestañas Todos/Siguiendo) de la lista (tras `cargarAgenda`, diferida) — antes también esperaban esa consulta, como el gestor señaló en la captura 01 de la bitácora 193. Lint, typecheck, 1121 pruebas (9 nuevas) y build en verde; medido con Chrome real (`playwright-core`) contra un arnés temporal, ya borrado, sin Supabase configurado en este árbol de trabajo.

## Qué leí

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-161 en `docs/ops/OPEN_LOOPS.md`, la sección "Carga progresiva y esqueletos" de `docs/PRINCIPIOS_UX.md`, la bitácora [193](193-esqueletos-canon.md) (canon, arnés temporal, lo que quedó pendiente), `src/components/ui/Esqueleto.tsx` (incluida `EsqueletoCabeceraFicha`, construida y sin usar), `src/lib/tandas.ts`, `useCentinela`/`ui/CargarMas`, `src/app/agenda/page.tsx` y `src/app/artistas/page.tsx` (cómo quedaron tras el PR #192), `src/app/eventos/[id]/page.tsx`, `src/app/lugares/[id]/page.tsx`, `src/app/artistas/[id]/page.tsx`, `src/app/lugares/VistaLugares.tsx`, `src/components/AgendaInicio.tsx`.

## Decisión: por qué `EsqueletoCabeceraFicha` sigue sin usarse

El encargo permitía usarla "solo si la cabecera misma esperara". En las tres fichas, `cargarEvento`/`cargarLugar`/`cargarArtista` ya se esperan **antes** de poder decidir `notFound()` o la redirección por slug/UUID — no hay forma de pintar antes de esa consulta, así que la cabecera (foto, nombre, meta) nunca queda detrás de un `<Suspense>` propio: sale con el resto del HTML inicial, sin esqueleto. Lo que sí se difiere son los bloques que piden una consulta **aparte** de esa (quién va, quién sigue, sus eventos/fechas), con esqueletos de renglón (`EsqueletoBloqueTexto`, `EsqueletoRenglones`) del tamaño real. `EsqueletoCabeceraFicha` queda construida para el día en que una ficha necesite pintar antes de tener siquiera el nombre (por ejemplo, si se separara el `notFound`/redirect de una consulta más liviana).

## Fichas: qué se difirió y qué se quedó igual

**Evento** (`src/app/eventos/[id]/page.tsx`): se difieren en `<Suspense>` la línea "Con [artistas]", la línea "Van N personas" (un solo límite, `DatosQuienEvento`) y la sección "Quién va" (`QuienVaDiferido`) — dos límites en total. Las tres consultas que alimentan ambos (`cargarAsistencias`, `cargarQuien`, el conteo `van_por_evento`) se piden una sola vez por petición con `cache()` de React, aunque se usen desde los dos bloques. La barra de acciones ("Voy"/"Me interesa") sigue en el HTML inicial: pide solo mi propio estado (`cargarMiEstado`, una fila), no la lista entera — así no se atrasa por la misma consulta que "Quién va". El candado del sitio reservado (`cargarPrivado`) sigue síncrono, como pide el encargo. El aviso de "Se borra el evento" en el menú ya no dice cuántos "Voy" tiene (ese número ahora se difiere): dice "con los 'Voy' que tenga", sin el número — el menú de administración no puede esperar una consulta aparte.

**Lugar** (`src/app/lugares/[id]/page.tsx`) y **Artista** (`src/app/artistas/[id]/page.tsx`): mismo patrón, simétrico. Se difieren cuánta gente sigue + su próximo evento/fecha (`MetaLugar`/`MetaArtista`, un límite) y la sección completa "Próximos eventos"/"Se presenta en" (`SeccionEventosLugar`/`SeccionFechasArtista`, otro límite) — dos por ficha. `cargarEventos`/`cargarFechas` y el conteo de seguidores se piden una sola vez con `cache()`. Si yo sigo (para el botón Seguir) se pregunta aparte, una fila, y sigue síncrono. El aviso de borrar pierde el conteo exacto por la misma razón que en Evento.

## Lugares: separar la barra de `VistaLugares`

`VistaLugares` armaba su propio `<main>` con `Barra` + `Cabecera` (ciudad, pestañas Todos/tipos) + mapa/lista, todo en un solo componente cliente que recibía `lugares`, `destacados`, `eventosSemana`, `seguidos` y `avisos` ya resueltos desde `page.tsx` — nada pintaba hasta que la consulta combinada entera resolvía. Ahora `page.tsx` espera solo `lugares` (lo que las pestañas necesitan para sus cuentas) y pasa el resto (`destacados`, `eventosSemana`, `seguidos`, `avisos`, `conSesion`) como una promesa sin `await` (`ExtrasLugares`, en `cargarExtras`). `VistaLugares` pinta `Barra` y `Cabecera` al instante con solo `lugares`; el mapa y la lista viven en `CuerpoLugares`, un componente nuevo que hace `use(extras)` dentro de un `<Suspense>` — mientras está pendiente, un `EsqueletoCaja` (nueva variante del canon, una caja que respira sin medida propia) del alto del mapa, o `EsqueletoRenglones` en la vista de lista.

Ese componente diferido también es dueño del encuadre del mapa, la tarjeta elegida y el desplegable de resultados de la búsqueda — todo lo que antes vivía en `VistaLugares` y que solo el mapa usaba. La búsqueda (el campo) y el botón de ubicación siguen en la Cabecera, fuera del `Suspense`: le piden a `CuerpoLugares` que busque o reencuadre a través de un `ref` (`mapaRef`, tipo `InteraccionMapa`) que `CuerpoLugares` rellena al montarse. La razón de usar un `ref` en vez de un efecto reaccionando a un cambio de prop: la regla `react-hooks/set-state-in-effect` (ya activa en este repo) rechaza llamar `setState` dentro de un efecto sin la guarda de un `ref` comparando contra el valor anterior — y aun con esa guarda, hacerlo así habría tardado un repintado de más. Con el `ref`, el toque de la Cabecera actúa en el mismo instante.

La memoria de pantalla (`useMemoriaPantalla`) sigue en `VistaLugares`, sin tocar: vista, tipo (en la URL) y búsqueda siguen reponiéndose igual al volver de una ficha.

## Agenda: los chips fuera del Suspense

Antes, `AgendaInicio` era un solo componente que recibía `eventos`/`seguidos`/`eventosSeguidos`/`asistencias` ya resueltos, y todo el árbol (incluida la `Cabecera` con el chip de fecha, el de ciudad y las pestañas Todos/Siguiendo) esperaba a que `cargarAgenda` — la consulta pesada de eventos — resolviera. La captura 01 de la bitácora 193 ya lo mostraba: la cabecera salía en gris, no solo la lista. Ahora `agenda/page.tsx` no espera `cargarAgenda` (sigue esperando `cargarCiudades`+`usuarioActual`, rápidas): pasa la promesa a `AgendaInicio`, que pinta `Cabecera` al instante (fecha, ciudad, pestañas, lupa — nada de esto necesita los eventos) y difiere la lista en un componente nuevo, `AgendaLista`, con `use(agenda)` dentro de un `<Suspense fallback={<EsqueletoRenglones/>}>`. `mostrados` (cuántos renglones van pintados, para la carga por tandas) sigue viviendo en `AgendaInicio` — no en `AgendaLista` — porque `useMemoriaPantalla` guarda un solo objeto por clave: dos llamadas con la misma clave se pisarían la una a la otra.

## Verificación

```
npm run lint       # 1 advertencia preexistente, sin relación (docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck  # verde
npm test           # 1121 pruebas (90 archivos; 9 nuevas: page.test.ts de las tres fichas), verde
npm run build      # verde
```

**Pruebas nuevas** (`src/app/eventos/[id]/page.test.ts`, `src/app/lugares/[id]/page.test.ts`, `src/app/artistas/[id]/page.test.ts`, 3 cada una): llaman a la función de la página con Supabase de prueba (un cliente encadenable falso, mismo patrón que ya usan `direccion.acciones.test.ts` y el `route.test.ts` de avisos-pendientes) y recorren el árbol de elementos de React que devuelve **sin pintarlo** — evita arrastrar Mapbox o `next/link` con su contexto de router, que no hace falta para esta comprobación. Cada una comprueba: el `<h1>` con el nombre real está en el árbol inicial (no depende de ningún `<Suspense>`), el `<script type="application/ld+json">` está presente y con los datos correctos, hay exactamente dos límites `<Suspense>` (los dos bloques diferidos de esa ficha), una ficha por UUID redirige (308 permanente, `permanentRedirect` simulado) a su slug, y `generateMetadata` trae el `canonical` correcto.

**Mecanismo (medido, `next build && next start -p 4196`), arnés temporal `src/app/arnes196-temporal/` (datos inventados, sin Supabase — no hay uno configurado en este árbol de trabajo; borrado entero antes de comitear, comprobado con `git status`):** páginas mínimas con el mismo patrón que ahora usan las fichas, Lugares y Agenda (cabecera síncrona; el bloque social, el mapa o la lista, tras una espera artificial de 3 s, dentro de un `<Suspense>`) contra un modo "antes" que reproduce el patrón viejo (todo bloqueado por una sola espera). `export const dynamic = "force-dynamic"` en las tres páginas: sin esto, `next build` horneaba la página entera en una sola pasada (con la espera ya resuelta) y no había nada que capturar "a medio cargar" con `next start`. Medido con Chrome real (`playwright-core`, instalado solo en el scratchpad de la sesión; `package.json`/`package-lock.json` intactos, comprobado con `git status`) navegando sin esperar la carga completa (`waitUntil: "commit"`) y sondeando el DOM cada 10 ms hasta que aparece el `<h1>`:

| Ficha | Antes (todo junto) | Después (cabecera separada) |
| --- | --- | --- |
| Evento | 3028 ms | 134 ms |
| Lugar | 3028 ms | 136 ms |
| Artista | 3022 ms | 131 ms |

El tiempo "antes" es, dentro del margen de la espera artificial (3000 ms), el tiempo que tarda en aparecer cualquier cosa propia de la página — nada pinta hasta que la consulta entera resuelve. El tiempo "después" es el tiempo hasta que el `<h1>` real está en el DOM, con el bloque social todavía en `<Suspense>`.

**Capturas reales** (`docs/rediseno/capturas-196/`), 390×844 a `deviceScaleFactor: 2`, `reducedMotion: "reduce"`:

- **`01-ficha-evento-a-medio-cargar.png`:** `Barra` con "Atrás" y el logotipo, el cartel gris respirando, "Evento de prueba" en negro, dos líneas grises de meta y, debajo, tres renglones grises con foto cuadrada y dos líneas de texto (el esqueleto del bloque social) — capturada 600 ms después de que el `<h1>` aparece, con la espera artificial (3 s) todavía corriendo.
- **`02-ficha-evento-cargada.png`:** la misma página, resuelta — "Quién va" con su texto real bajo las mismas dos líneas de meta (todavía grises: en este arnés solo se difiere el bloque social, no las dos líneas de meta que en la ficha real vienen con el evento).
- **`03-ficha-lugar-a-medio-cargar.png`** y **`04-ficha-lugar-cargada.png`:** igual, con "Lugar de prueba" y "Próximos eventos".
- **`05-ficha-artista-a-medio-cargar.png`** y **`06-ficha-artista-cargada.png`:** igual, con "Artista de prueba" y "Se presenta en".
- **`07-lugares-a-medio-cargar.png`:** el logotipo, el chip "San Luis Potosí" y las pestañas "Todos 42 · Museo 12 · Escuela 8" ya pintadas; debajo, una caja gris respirando del alto del mapa (`EsqueletoCaja`) — capturada 600 ms después de que las pestañas aparecen.
- **`08-agenda-chips-lista-esqueleto.png`:** el logotipo, los chips "Seleccionar" y "San Luis Potosí", las pestañas "Todos"/"Siguiendo" ya pintadas; debajo, seis renglones grises (`EsqueletoRenglones`) — antes de esta pieza, según la captura 01 de la bitácora 193, la cabecera entera salía en gris.

Cada PNG se abrió con `Read` y se describe arriba, tal como pide `docs/ops/GESTION_DE_CAMBIOS.md`.

**Correos:** `git diff` (sin commits previos en la rama) y los tres archivos de prueba nuevos, sin ninguna arroba real — solo `analytics@2.0.1` (versión de un paquete de npm en `package-lock.json`, no una dirección de correo).

## Lo que no se tocó

- `src/app/eventos/loading.tsx`, `src/app/lugares/loading.tsx`, `src/app/artistas/loading.tsx` no existen (nunca existieron para estas rutas: el símbolo SN de página completa es de `app/loading.tsx`, la raíz) — no había nada que borrar.
- `package.json` y el lock, intactos: sin dependencias nuevas.
- Sin migraciones.

## Archivos

Nuevos: `src/app/eventos/[id]/page.test.ts`, `src/app/lugares/[id]/page.test.ts`, `src/app/artistas/[id]/page.test.ts`, `docs/rediseno/capturas-196/` (8 PNG), esta bitácora.
Tocados: `src/app/eventos/[id]/page.tsx`, `src/app/lugares/[id]/page.tsx`, `src/app/artistas/[id]/page.tsx`, `src/app/lugares/VistaLugares.tsx`, `src/app/lugares/page.tsx`, `src/app/agenda/page.tsx`, `src/components/AgendaInicio.tsx`, `src/components/ui/Esqueleto.tsx`/`.module.css` (nueva variante `EsqueletoCaja`), `docs/ops/OPEN_LOOPS.md`.
Creado y borrado en la misma sesión (arnés de medición, nunca comiteado): `src/app/arnes196-temporal/`.
