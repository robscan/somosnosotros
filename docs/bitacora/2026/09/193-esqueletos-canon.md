# 193 · Esqueletos con carga progresiva como canon (OL-158)

**Fecha:** 2026-09-23 · **Rama:** `esqueletos-canon`, desde `origin/main` (`a8132ef`) · **OL:** OL-158 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes (costo). Código, sin migraciones.

## De dónde sale

OPEN_LOOPS, OL-158 (2026-09-23). Founder: «¿ninguna sección carga con skeletons? pensé que lo teníamos como estándar». Hoy cada sección usa `loading.tsx` de página completa (el símbolo SN). Precisión del founder: quiere carga progresiva — que la persona vea la primera línea de contenido ya cargada y el resto llegue después (perezoso), como ya hace Inicio desde OL-156.

Leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-158, la bitácora [191](./191-inicio-segunda.md), y lo que ya existía tras el PR #189: `src/components/CarrilEsqueleto.tsx`/`.module.css` (no vive en `src/components/inicio/`, a pesar de lo que decía el encargo), `src/components/Destacados.module.css` (colapso sin salto), `src/app/agenda/page.tsx`, `src/components/AgendaInicio.tsx`, `src/lib/cargarAgenda.ts`, `src/app/lugares/{page,VistaLugares}.tsx`, `src/components/ListaLugares.tsx`, `src/app/artistas/{page.tsx}`, `src/components/ListaArtistas.tsx`, `src/app/{eventos,lugares,artistas}/[id]/page.tsx`, `src/components/MemoriaPantalla.tsx`.

## Qué se construyó

### 1. El canon: `ui/Esqueleto.tsx`

`src/components/ui/Esqueleto.tsx` + `.module.css`, un solo origen para los bloques grises que respiran: `EsqueletoRenglon`/`EsqueletoRenglones` (foto 64×64, dos líneas — medidas de `Renglon.module.css`, para que la fila real caiga encima sin saltar), `EsqueletoTarjeta` (tamaño grande/mediana/chica — las medidas que ya tenía `CarrilEsqueleto`), `EsqueletoCabeceraFicha` (foto, nombre, dos líneas de meta — construida, no conectada todavía a ninguna ficha, ver "Lo que falta") y `EsqueletoBloqueTexto`. Mismo pulso (`animation: respirar`, 1.2 s), apagado con `prefers-reduced-motion`.

`src/components/CarrilEsqueleto.tsx`/`.module.css` (Inicio, OL-156) se refactorizó para usar `EsqueletoTarjeta` en vez de repetir sus medidas: un solo origen, sin cambiar su comportamiento (mismo `aria-hidden`, mismas clases `grande`/`mediana`/`chica` en la sección para el ajuste de `.chica .carril`).

### 2. Carga progresiva de listas: `lib/tandas.ts` + `useCentinela` + `ui/CargarMas`

- `src/lib/tandas.ts`: lógica pura, sin DOM — `tandaInicial(total, tamano)`, `siguienteTanda(total, mostrados, tamano)`, `tandaAcotada(total, mostradosGuardados, tamano)` (para cuando cambia el total: otro filtro, otra búsqueda, o al restaurar memoria de pantalla). `TANDA_INICIAL = TANDA_SIGUIENTE = 20`. 11 pruebas en `tandas.test.ts`.
- `src/components/useCentinela.ts`: un `<div>` centinela con `IntersectionObserver` (600 px de margen, para que la tanda llegue antes de que la persona vea el final); sin `IntersectionObserver` no observa nada.
- `src/components/ui/CargarMas.tsx`: el final de una lista con más por cargar — el centinela con un esqueleto de la tanda que viene, y "Ver más" siempre en el árbol, como respaldo accesible (no solo para un navegador sin `IntersectionObserver`; también para quien navega con teclado o lector de pantalla).
- `src/components/ListaEsqueleto.tsx`: el `fallback` del `<Suspense>` de Agenda y Artistas — una cabecera genérica (chips, pestañas) más `EsqueletoRenglones`.

### 3. Agenda (`src/components/AgendaInicio.tsx`, `src/app/agenda/page.tsx`)

- `page.tsx`: `Barra` y `NavInferior` ya no esperan nada; `AgendaContenido` (nuevo componente de servidor, la ciudad + `cargarAgenda` + `AgendaInicio` + `Publicar`) vive en su propio `<Suspense>` con `ListaEsqueleto` de `fallback`.
- `AgendaInicio.tsx`: la lista agrupada por día se corta a `mostrados` renglones (`tandaAcotada`/`siguienteTanda`); el centinela y "Ver más" van al final. `mostrados` se guarda en `useMemoriaPantalla` junto con la pestaña, la fecha y la búsqueda — volver de una ficha no colapsa la lista a la primera tanda. Con un día elegido (`fecha`) no se corta: ya es un solo día, corto por sí mismo.

### 4. Artistas (`src/app/artistas/page.tsx`, `src/components/ListaArtistas.tsx`)

- `page.tsx`: mismo patrón que Agenda — `Barra`/`NavInferior` fuera, `ArtistasContenido` en `<Suspense>` con `ListaEsqueleto redonda` (fotos redondas de artista). Se borró `src/app/artistas/loading.tsx`: ya no hace falta, esta ruta no vuelve a mostrar el símbolo SN de página completa.
- `ListaArtistas.tsx`: Artistas ya paginaba de verdad en el servidor (`n` en la URL, "Ver más" pide `n + pagina`); lo nuevo es que el centinela dispara esa misma petición sola (`useTransition` + `router.replace`), con `EsqueletoRenglones` mientras llega. "Ver más" sigue siendo un enlace real (mismo `href`), no solo un botón que ejecuta JavaScript.

### 5. Lugares (`src/components/ListaLugares.tsx`) — parcial, ver "Lo que falta"

`ListaLugares` reparte su lista (ya completa en el teléfono, como siempre) en tandas de 20, con el mismo `useCentinela`/`ui/CargarMas`. Se acota de nuevo cuando cambia el total (otro tipo, Cercanos, una búsqueda). **No** se tocó `src/app/lugares/page.tsx` ni `VistaLugares.tsx`: `VistaLugares` arma su propio `<main>` con la barra (`{barra}`) dentro del mismo árbol que el mapa y la lista — separar "la barra pinta antes que el mapa/la lista" exige mover `<main>` y `Barra` a `page.tsx` y que `VistaLugares` deje de recibirlos como prop, un cambio de forma en un componente grande con estado de mapa que no quise apurar sin poder probarlo con calma. `src/app/lugares/loading.tsx` se queda tal cual.

### 6. Fichas de evento, lugar y artista — no tocadas

Las tres fichas (`src/app/{eventos,lugares,artistas}/[id]/page.tsx`) esperan toda su consulta (incluida la relacional: quién va, quién se presenta, seguidores) antes de pintar nada, exactamente como antes de esta pieza. Dividirlas en "cabecera que pinta primero" + "bloque social en `Suspense`" es viable (la ficha de evento, por ejemplo, separa limpio: `cargarEvento` es la cabecera; `cargarAsistencias`/`cargarQuien`/el conteo/`cargarPrivado` son el bloque que puede esperar) pero toca páginas con lógica sensible (redirecciones por slug/UUID, el candado del sitio reservado, el menú de administración, JSON-LD) sin margen en esta pieza para probarlas con el cuidado que piden. Quedan con su `loading.tsx` de página completa tal cual (`src/app/eventos/loading.tsx` sigue existiendo; lugares y artistas no tenían uno propio a nivel de ficha).

### 7. `docs/PRINCIPIOS_UX.md`

Sección nueva "Carga progresiva y esqueletos (canon, OL-158, bitácora 193)": qué pinta primero, el único origen del esqueleto, cómo se reparten las tandas, cuándo se usa el cargador de página completa, y el estado real de cada sección (incluida la lista de lo que falta) para que quien lea el canon no asuma más de lo que hay.

## Pruebas

`src/lib/tandas.test.ts`: 11 pruebas (tanda inicial con y sin sobra, una lista vacía, un tamaño de tanda propio; siguiente tanda sin pasarse del total, sin negativos; tanda acotada — conserva lo mostrado, nunca menos que la inicial, nunca más que un total que se hizo chico). Lógica pura, sin DOM: no hizo falta un arnés de navegador para probarla.

No se agregaron pruebas de HTML inicial con JSON-LD de una ficha (punto 6 del encargo): las fichas no se tocaron esta vez, así que no hay comportamiento nuevo que cubrir ahí; las pruebas existentes de las fichas siguen pasando tal cual.

## Verificación

```
npm run lint       # 1 advertencia preexistente, sin relación (docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck  # verde
npm test           # 1110 pruebas (87 archivos; 11 nuevas de tandas.test.ts), verde
npm run build      # verde
```

**Mecanismo (`next build && next start`, puerto 4193), arnés temporal `src/app/arnes193-temporal/` (datos inventados, sin Supabase — no hay uno configurado en este árbol de trabajo; borrado entero antes de comitear, comprobado con `git status`):** dos páginas mínimas con el mismo patrón que ahora usan `/agenda` y `/artistas` (`Barra` fuera de cualquier espera; el contenido, tras una espera artificial de 4.5 s, dentro de un `<Suspense>`) contra una tercera que reproduce el patrón "de antes" (todo bloqueado por una sola espera). Medido con Chrome real de la Mac vía `playwright-core` (instalado solo en el scratchpad de la sesión; `package.json`/`package-lock.json` intactos, comprobado con `git status`):

- **Patrón de antes:** nada propio se pinta hasta que la consulta entera resuelve; Next cae al `loading.tsx` de la raíz (el símbolo SN) mientras tanto — exactamente la queja del founder.
- **Patrón de después (Agenda/Artistas):** `Barra` (con el logotipo SMSNSTRS) se ve de inmediato; el resto es `ListaEsqueleto` (cabecera gris + 6 renglones) hasta que la consulta resuelve, sin ningún salto al llegar el contenido real.
- **Lugares (tandas de render, componente real `ListaLugares`, 42 lugares inventados):** con `document.querySelectorAll` se cuentan **20** tarjetas de lugar pintadas al cargar (la tanda inicial) de 42; al tocar "Ver más" (o al centinela) pasan a **40** (la siguiente tanda, sin pasarse de 42). `EsqueletoRenglones` está en el árbol tras la última tarjeta.
- `document.fonts.check('700 20px "Bricolage Grotesque"')` → `true`.

**Capturas reales** (`docs/rediseno/capturas-193/`), 390×844 a `deviceScaleFactor: 2`:

- **`01-mecanismo-agenda-esqueleto-a-medio-cargar.png`:** navegación disparada sin esperarla (`location.href`, para no perder el estado intermedio) y captura a los 900 ms de una consulta simulada de 4.5 s — `Barra` con el logotipo ya pintada, debajo la cabecera gris (dos chips arriba, dos pestañas) y seis renglones grises (foto cuadrada + dos líneas) respirando.
- **`02-mecanismo-agenda-cargada.png`:** la misma página, resuelta — "Contenido real, tras esperar la consulta (4500 ms simulados)." bajo la `Barra`, sin salto de layout respecto a donde estaba el esqueleto.
- **`03-mecanismo-artistas-esqueleto-redondo-a-medio-cargar.png`:** igual que la 01, con `EsqueletoRenglones redonda` (fotos circulares, el criterio de Artistas).
- **`04-mecanismo-antes-a-medio-cargar-en-blanco.png`:** el patrón de antes a los 900 ms de la misma espera de 4.5 s — el símbolo SN centrado (el `loading.tsx` de la raíz) con la barra inferior de navegación, nada propio de la página todavía. La comparación visual directa con la 01: donde antes solo había el símbolo SN, ahora ya hay `Barra` y un esqueleto del tamaño real.
- **`05-lugares-tanda-inicial-20-de-42.png`:** `ListaLugares` real con 42 lugares inventados, alfabético, tira de letras — se ven las primeras tarjetas del grupo "C" (20 pintadas en total, confirmado por conteo de DOM arriba).

Antes de comitear: `git diff` (sin commits todavía en esta rama) sin arrobas; el árbol de trabajo no tenía ningún correo. `git status` limpio salvo lo de esta pieza; `package.json`/`package-lock.json` intactos.

## Lo que falta / no se inventó

- **Lugares:** falta separar `Barra` de `VistaLugares` (que hoy la recibe como prop y arma su propio `<main>`) para que la cabecera y el mapa/lista puedan vivir en un `<Suspense>` propio, igual que Agenda y Artistas. La lista sí reparte en tandas ya.
- **Fichas de evento, lugar y artista:** no se tocaron. El corte cabecera/bloque social es viable (documentado arriba para la de evento) pero pide su propia pieza, con tiempo para probar las redirecciones por slug/UUID, el candado del sitio reservado y el JSON-LD sin prisa.
- `EsqueletoCabeceraFicha` está construida (canon, punto 1 del encargo) pero no conectada a ninguna pantalla todavía: la usará quien haga la pieza de las fichas.
- No se pidió (ni se hizo) tocar `src/app/lugares/loading.tsx` ni `src/app/eventos/loading.tsx`: siguen sirviendo mientras sus rutas no tengan la separación de arriba.

## Archivos

Nuevos: `src/components/ui/Esqueleto.tsx`/`.module.css`, `src/components/ui/CargarMas.tsx`/`.module.css`, `src/components/useCentinela.ts`, `src/components/ListaEsqueleto.tsx`/`.module.css`, `src/lib/tandas.ts`/`.test.ts`, `docs/rediseno/capturas-193/` (5 PNG), esta bitácora.
Tocados: `src/components/CarrilEsqueleto.tsx`/`.module.css`, `src/app/agenda/page.tsx`, `src/components/AgendaInicio.tsx`, `src/app/artistas/page.tsx`, `src/components/ListaArtistas.tsx`, `src/components/ListaLugares.tsx`, `docs/PRINCIPIOS_UX.md`, `docs/ops/OPEN_LOOPS.md`.
Borrados: `src/app/artistas/loading.tsx`.
