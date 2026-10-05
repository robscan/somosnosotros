# 317 · Las fichas distinguen «no existe» de «falló la lectura»

**Fecha:** 5 de octubre de 2026. **OL:** OL-289. **Rama:** `fichas-fallo-lectura` (desde `origin/main`, sin commits nuevos de `main` al cerrar).
**Pieza:** SEO etapa D, ajuste mínimo, autorizada por el founder el 2026-10-05. Diagnóstico de producción hecho antes; esta pieza arregla solo lo que ese diagnóstico encontró. Ver [investigación SEO](../../../investigaciones/seo.md), «Las respuestas de eventos retirados requieren diagnóstico».

## Causa

Una ficha inexistente, vencida u oculta responde 200 con `noindex` y «Esto ya no está» porque `src/app/loading.tsx` hace que Next envíe la respuesta antes de que la página llame a `notFound()`. **Eso se queda como está** (no se quita `loading.tsx` ni se cambia el 200).

El defecto: las tres fichas (`eventos/[id]`, `artistas/[id]`, `lugares/[id]`) cargaban la fila con `maybeSingle()` y leían solo `data`, nunca `error` (y devolvían `null` sin cliente). Si la base falla (el 2026-10-03 la API respondía 402 por cuota), una ficha viva caía por el mismo camino que una inexistente: `notFound()`, `noindex`, pantalla «Esto ya no está». Google podía sacar páginas buenas del índice y la persona leía que la ficha no existía.

## Arreglo

- **`src/lib/leerFicha.ts` (nuevo).** `leerFicha(recurso, porSlug, porId)` distingue tres casos: *encontrada* (devuelve la fila), *no existe* (sin error y sin fila, por slug y, si el texto es UUID, por id: `null`, la página sigue llamando a `notFound()` como hoy) y *falló la lectura* (error de la consulta en cualquiera de las dos, promesa rechazada o cliente no disponible: lanza `Error("No pudimos cargar la ficha.")`). `maybeSingle()` devuelve error también cuando hay más de una fila: cuenta como fallo. Mismo patrón que `leer` de `cargarAgenda.ts` (OL-267): `console.warn("[ficha] lectura no disponible: <recurso>")` sin la respuesta remota ni datos de la ficha.
- **Las tres cargas** (`cargarEvento`, `cargarArtista`, `cargarLugar` en `CuerpoLugar.tsx`) usan `leerFicha`; sin cliente lanzan (antes `null`). Los demás consumidores de `cargarLugar`/`cargarFicha` (hoja de Lugares, `fichaEnHoja.tsx`) ya tratan una promesa rechazada como «fallo» en la hoja (`abrirFicha(...).then(..., () => poner("fallo"))`), así que no cambia su comportamiento visible.
- **`generateMetadata` de cada ficha** captura el fallo y devuelve `{}`: rigen entonces las etiquetas del sitio (título «Somos Nosotros»), sin `noindex` ni canonical. Se midió primero la alternativa más simple, dejar que la excepción salga de `generateMetadata`: Next descarta **todas** las etiquetas, incluido el título (la respuesta salía sin `<title>`); por eso se captura. El cuerpo de la página sí lanza y lo recoge `src/app/error.tsx` existente («Algo falló», «Intentar de nuevo» y «Ver la agenda»); no se inventó pantalla nueva.

## Medición real (aplicación compilada, no supuesta)

`next build && next start` contra el respaldo local inventado (`scripts/ops/auditoria-ui/respaldo-local`, reloj fijo del 2026-10-07 de `npm run medir`, llaves y token inventados; puertos 3161 y 8861). La base «fallando» fue un servidor mínimo del scratch que contesta 402 JSON a cualquier petición, en el mismo puerto del respaldo. `curl` como iPhone Safari y como `Googlebot/2.1`: **los dos agentes dieron exactamente el mismo resultado en las 12 combinaciones**, así que la tabla no los separa. «Marca 404» = el flujo trae `NEXT_HTTP_ERROR_FALLBACK;404` (la pantalla «Esto ya no está»). Ficha existente: `concierto-de-la-orquesta-sinfonica-de-san-luis-potosi`, `aaron-cadena`, `teatro-de-la-paz`; inexistente: `no-existe-fallo-289`.

| Caso | Ficha | Antes | Después |
| --- | --- | --- | --- |
| (a) existente, base sana | evento / artista / lugar | 200, sin robots, título propio, h1 propio | igual |
| (b) inexistente, base sana | evento | 200, `noindex`, «Evento · Somos Nosotros», marca 404 | igual |
| | artista | 200, `noindex`, «Artista · Somos Nosotros», marca 404 | igual |
| | lugar | 200, `noindex`, «Lugar · Somos Nosotros», marca 404 | igual |
| (c) existente, base fallando (402) | evento | **200, `noindex`**, «Evento · Somos Nosotros», marca 404 (parece inexistente) | 200, **sin robots**, «Somos Nosotros», sin marca 404 |
| | artista | **200, `noindex`**, «Artista · Somos Nosotros», marca 404 | 200, **sin robots**, «Somos Nosotros», sin marca 404 |
| | lugar | **200, `noindex`**, «Lugar · Somos Nosotros», marca 404 | 200, **sin robots**, «Somos Nosotros», sin marca 404 |
| (c′) existente, base inalcanzable (conexión rechazada), solo Googlebot | evento / artista / lugar | no medido antes | 200, sin robots, «Somos Nosotros», sin marca 404 |

Pantalla de (c) después, en Chrome real 390×844 (iPhone UA), una por ficha: h1 «Algo falló», botón «Intentar de nuevo» presente, 0 `meta robots`, 0 `link canonical`. Captura abierta y vista (`Algo falló` / «No se pudo cargar esta pantalla. Suele arreglarse al intentar de nuevo.» / botón morado / «Atrás»); no es una pieza de UI nueva, por eso no se guarda PNG en el repo.

Variante intermedia medida y descartada: con la excepción saliendo de `generateMetadata` también no había `noindex`, pero tampoco `<title>` (ver arriba).

## Pruebas

- **Nuevas, 23:** `src/lib/leerFicha.test.ts` (8: slug sin UUID, no existe con y sin UUID, error por slug sin segunda consulta, error por UUID, error con datos de relleno, promesa rechazada sin detalle, traza sin respuesta remota) y, en cada `page.test.ts`, un bloque de 5 (sin fila y sin error = `NOT_FOUND` y título de inexistente; error de la consulta lanza y no es `notFound`; error con datos de relleno; sin cliente; `generateMetadata` ante fallo = `{}`).
- **Control negativo:** con el código de `main` y las pruebas nuevas, 12 fallos (4 por ficha; la quinta, «sin fila = notFound», es una guarda que ya pasaba). Con el arreglo, 43/43 en los 4 archivos (8 + 17 + 10 + 8), 0,99 s.
- `npm run lint`: 0 errores, 1 aviso previo (`VisorImagen.componentes.test.mjs:171`, fuera de alcance). `npm run typecheck`: correcto. No se corrió la suite completa (acuerdo del encargo).

## Límites y lo que queda

- **No hay 5xx.** `loading.tsx` ya envió el 200 antes de que se sepa del fallo; ni Googlebot lo evita (también 200). La pantalla de error la pinta el límite de error del cliente tras hidratar; el HTML inicial trae el esqueleto «Cargando» con el título del sitio. Lo que se consigue: sin `noindex`, sin canonical equivocado y sin la pantalla «No está». Riesgo residual: una página 200 con título genérico durante la caída; Google puede volver a rastrear después, pero no se prometió nada sobre su índice. Un 5xx real exigiría quitar `loading.tsx` en estas rutas: otra decisión.
- **Mismo defecto en cargas secundarias, sin tocar:** evento: `cargarPrivado` (si falla, un evento pasado con dirección reservada cae en `notFound()` con `noindex`), `cargarMiEstado`, `cargarAsistencias` y `cargarTotalVan` (un fallo se lee como «0 van»); artista: `cargarLigadas` (un fallo se lee como «sin cuentas ligadas»), «¿lo sigo?», `cargarFechas`, novedades; lugar: «¿lo sigo?» y `lugares_cuentas` en `cargarFicha` (un fallo quita el permiso de editar sin avisar), `cargarEventos`. También las páginas `editar/` repiten `maybeSingle()` sin leer `error`, pero llevan `noindex` por diseño y exigen sesión.
- Sin SQL, variables nuevas, producción, UI, PR ni publicación. Procesos y servidores del scratch detenidos al terminar.
