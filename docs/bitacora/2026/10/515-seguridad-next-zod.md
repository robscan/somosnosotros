# 515 · OL-483 · Subir Next.js y zod por los avisos de seguridad publicados

**Fecha:** 2026-10-29. **Rama:** `seguridad-next-zod` (desde `origin/main` `945be550`). **Quién:** operador del Gestor VII (Claude Opus 5.5, árbol de trabajo aislado, sin agentes). R1 del barrido de seguridad OL-482. Sin migración ni variables de entorno.

## Versiones

| Paquete | Antes | Después |
|---|---|---|
| `next` | 16.3.8 | **16.4.3** (la última de 16.4) |
| `eslint-config-next` | 16.3.8 | **16.4.3** (va con `next`; la de desarrollo) |
| `zod` | 4.6.5 | **4.6.7** (la última de 4.6) |

`package.json` y `package-lock.json` cambian solo en esos tres paquetes y en los `@next/*` que arrastran (`@next/env`, `@next/swc-*`, `@next/eslint-plugin-next`).

## Avisos que se van (`npm audit --omit=dev`)

Antes: 4 avisos (1 crítico, 1 alto, 2 moderados). Después: 2 moderados.

- `next` 16.0.0–16.4.0, **crítico**, se va con 16.4.1 y siguientes: ejecución remota de código en la optimización de imágenes con SVG (GHSA-2464-fhr4-w9xw), denegación de servicio en el App Router con acciones del servidor (GHSA-p3m5-59mp-jv5r) y ejecución remota de código en funciones `use cache` que devuelven arreglos tipados (GHSA-673q-mjm6-r5xr). Nos tocaba el de las acciones del servidor (25 archivos con `"use server"`). El de imágenes ya lo frenaba `dangerouslyAllowSVG: false` (`src/lib/imagenOptima.ts`); `use cache` no se usa.
- `zod` <4.6.6, **alto**: memoria agotada al validar colecciones enormes con límite de tamaño (GHSA-mrhx-c7xc-m3w5). Lo arregla 4.6.6 («check array, set and map size bounds before parsing elements»).

## Lo que queda en `npm audit` (no se arregla aquí)

- En producción (`--omit=dev`): **`fflate` 0.7.3, moderado** (bucle infinito al leer un ZIP64 malformado, GHSA-px8p-9vwx-vf98), que entra por `satori` 0.35.1 (el creador de cartel). Su arreglo de `npm audit` es bajar `satori` a 0.32 (cambio mayor). Nosotros no le damos a `satori` ningún ZIP: lee fuentes TTF del repo.
- Solo desarrollo (`npm audit` completo; no llegan a Vercel): `vitest` 3.2.7 con **`vite` 6.4.3 (alto)**, **`tinypool` 1.1.1 (crítico)** y `@vitest/mocker` (moderado). En total quedan 6 (2 críticos, 1 alto, 3 moderados); antes eran 8 (3 críticos, 2 altos, 3 moderados). Subir `vitest` es otra pieza.

## Notas de la versión que nos tocan

Leídas en GitHub: v16.4.0 (948 líneas), v16.4.1 (solo los tres avisos), v16.4.2 y v16.4.3 (arreglos de Turbopack portados); zod v4.6.6 y v4.6.7 (esta solo sube el número).

- **Nombres de clase de los módulos CSS más cortos** («Turbopack: shorten CSS module class names», vercel/next.js#97944, en 16.4.0). En la app compilada `Calendario-module__skZJqa__dia` pasa a ser `skZJqa_dia` (el hash de la ruta del archivo; con `_` delante si empieza por cifra: `_7y7WFW_kpi`); en `next dev` siguen largos. Sin opción para volver a lo de antes. A la app no le afecta (nada en `src` lee nombres de clase; las pruebas de componentes usan `[class*=…]` con la clase local y pasan), pero **rompió `npm run medir`**: ver abajo.
- **`proxy.ts`**: «detect proxy.ts correctly with compound pageExtensions» y «Don't load the app-page runtime in proxy.ts» (16.4.3). No usamos `pageExtensions`; la build sigue listando «ƒ Proxy (Middleware)» y `medir`, que pasa por las redirecciones del proxy, sale sin novedades.
- **Acciones del servidor**: «Return client errors for unrecognized Server Actions», «Fix Server Actions hanging after navigation to PPR pages», «Handle Server Actions on dynamic PPR fallback routes». No usamos PPR; nada cambia en nuestro código.
- **`after()`**: «propagate repeated tag revalidation from after()». Lo usan las acciones de avisos, perfil, sitios, lugares, artistas y administración; las pruebas pasan igual.
- **`next/image`**: rechaza respuestas internas vacías o que no sean 2xx, vuelve AVIF a estar disponible y no comparte el socket de quien pide. Nuestra configuración (`CONFIG_IMAGENES`: solo webp, `qualities: [75]`, sin SVG, sin IP local) es válida igual.
- **Caché**: `unstable_cache` (`src/lib/grafo.ts`) y `updateTag` siguen existiendo con la misma firma; `revalidateTag` hacia cachés propias no se usa.
- **Tipos de rutas**: «merge cacheLife types into next/cache instead of shadowing it». `next typegen && tsc --noEmit` sin errores.
- **`htmlLimitedBots`** (`next.config.ts`, copiado de `html-bots.js` con la advertencia de revisarlo al subir Next): el patrón de Next 16.4.3 es idéntico al de 16.3.8 (`diff` vacío) y la opción sigue en el esquema de configuración. Solo se actualizó la versión en el comentario.
- **zod 4.6.6**: los límites de tamaño de arreglos, conjuntos y mapas se comprueban antes de leer los elementos (un arreglo de más ya no da un error por elemento) y los tipos de `z.record` cambian de forma interna. Nuestras pruebas y el typecheck pasan sin tocar nada.

## Cambio que hubo que hacer (fuera de la app)

`npm run medir` falló con la versión nueva (6 «toque», 1 «tapado», 1 «primer-cuadro»): las excepciones de `medidas.aceptadas.json` se escriben con el nombre del archivo («button.Calendario/dia», «lugares/ubicacion») y el primer cuadro de Inicio busca `<header class="BarraApp`; con los nombres cortos no coinciden. No era un cambio de la pantalla: mismos nodos, misma profundidad.

Arreglo, solo en las herramientas de medir (`scripts/ops/auditoria-ui/`):

- `clases-css.mjs` (nuevo): saca de los mapas de fuentes del servidor de la app compilada (`.next/server/**/*.js.map`, donde cada módulo CSS sale como `[project]/src/…/Calendario.module.css [app-ssr] (css module)` con su tabla de clases) la tabla hash → archivo (140 módulos), y devuelve los nombres cortos a su forma larga.
- `medir-pantallas.mjs`: usa esa tabla en lo que vuelve de cada pantalla y del teclado, y en el HTML del primer cuadro; si la tabla saliera vacía, lo avisa.
- `README.md` de la carpeta: lo explica. Los guiones sueltos de captura que buscan `Archivo-module__…` en una app compilada (`capturar-alta-cartel-existente*.mjs`, `comparar-admin-front.mjs`, `prototipo/*.mjs`) ya no lo encontrarían; no se tocaron (no corren en la CI) y el README dice cómo pasarlos.

Código de la app: ninguno. `next.config.ts`: solo el comentario de la versión. No se tocó `src/app/admin/instagram/**`, `src/lib/redes/**` ni `src/lib/instagram/**`.

## Comprobación

| Comprobación | Resultado |
|---|---|
| `npm run lint` | 0 errores, 2 avisos de variables sin usar en `capturar-inicio-vacio.mjs` y `VisorImagen.componentes.test.mjs` (ya estaban en `main`) |
| `npm run typecheck` | sin errores |
| `npm test` | 309 archivos, 4986 pruebas en verde |
| `npm run test:db` (`sn_control` local) | 2772 pruebas, 0 fallaron |
| `npm run inventario` | sin novedades |
| `npm run medir` | con 16.4.3 y sin el arreglo: 8 fallos (los de arriba); con el arreglo: **60 pantallas × 4 anchos, sin novedades** (y el teclado en sus 16 pantallas) |
| `npm run test:componentes` | 775 pruebas en verde |
| `npm run build` (desde cero, sin `.next`) | «Next.js 16.4.3 (Turbopack)», compila y genera las 42 páginas estáticas, sin errores ni avisos |
| `next start -p 3977` sobre la build contra el respaldo local, Chromium a 390×844 con el reloj de la prueba | Inicio, ficha de evento (`/eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi`), Agenda y Administración (con la sesión de administración del respaldo): HTTP 200, 0 errores de consola ni de página; el servidor sin errores ni avisos |

Sobre la prueba con `next start`: con el reloj del navegador sin fijar (el servidor con el reloj de la prueba, 7 de octubre, y el navegador en el día real) Inicio y Agenda dan el error 418 de React (el texto de las fechas no coincide al hidratar); con los dos relojes iguales, como hace `medir`, no aparece. Es la prueba, no la versión. Tampoco cuentan los 404 de `/_vercel/insights`, que solo existe en Vercel.

Las capturas 390×844 no hacen falta: `npm run medir` dice «sin novedades».
