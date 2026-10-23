# 487 · Inicio sin momento en blanco al abrir la app (OL-455)

**Fecha:** 2026-10-23. **Rama:** `inicio-sin-blanco`, base `origin/main` (`8fd89cb4`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. Sin migración ni variables de entorno. **Estado:** en código y medido en local; espera la revisión del gestor y el «publica» del founder.
Capturas: `docs/rediseno/capturas-487/`.

## El pedido (founder, textual)

«noto que al iniciar la app hay un momento en blanco, sin skeletons ni nada. Justo en el inicio.»

## Cómo se midió

Un guion de grabación (en el scratchpad, no en el repo) abre `/` con el Chrome de la Mac sin cabeza, a 390×844 como iPhone, con red 3G rápida
(562 ms de latencia, 1,44 Mbps) y la CPU 4× más lenta, y guarda un cuadro del screencast de CDP en cada cambio de pantalla (cada ~17 ms). De cada
cuadro mide cuánto no es blanco arriba (la barra), en medio y abajo (la navegación), y anota cuándo aparece cada cosa en el DOM. Dos maneras:

- **En frío:** sin caché ni service worker, la primera visita.
- **En caliente:** después de una visita completa (service worker registrado, archivos en la caché), como la app instalada. Nuestro service worker
  no guarda nada (`public/sw.js`, solo avisos push): el documento siempre va a la red y los archivos salen de la caché del navegador.

En producción (https://somosnosotros.org, solo lectura) y en local con `next build && next start` contra el respaldo (datos inventados), con
150 ms de retraso por consulta a la base para parecerse a Vercel ↔ Supabase. También la versión anterior a OL-454 (`96fca5b1`), compilada aparte.

## Lo que se vio (antes)

| Dónde | Blanco total | Primer cuadro | Contenido |
| --- | --- | --- | --- |
| Producción, caliente | 0 → 643 ms | 643 ms: el símbolo SN solo en medio y la navegación; **sin barra** | 1 025 ms (el logotipo de la barra, a los 1 192 ms) |
| Producción, frío | 0 → 3 054 ms | 3 054 ms: barra y navegación, en medio casi nada | 3 403 ms |
| Local, caliente | 0 → 648 ms | 648 ms: SN solo, la barra sin logotipo | 991 ms (logotipo a los 1 191 ms) |
| Local, frío | 0 → 1 914 ms | 1 914 ms: SN solo, sin barra | 2 270 ms |
| `96fca5b1` (antes de OL-454), caliente | 0 → 642 ms | igual que hoy: SN solo | 974 ms |

El blanco **no es nuevo**: la versión de antes de OL-454 hace exactamente lo mismo (captura 06). OL-454 no tocó la carga.

## Las causas

1. **Inicio abría con el cargador de página entera, no con sus esqueletos.** `app/page.tsx` espera la ciudad y la sesión antes de pintar nada, fuera
   de todo `<Suspense>`; mientras, Next pone `app/loading.tsx`, que es el símbolo SN solo en medio (`ui/CargandoRaiz`). Los esqueletos de los carriles
   viven dentro de Inicio y solo llegan con él. Agenda y Artistas no tienen esto: su página no espera y pone `ListaEsqueleto`.
2. **La barra de la app llegaba aparte.** En el layout iba dentro de un `<Suspense>` (por la ciudad de la consulta en las pantallas prerenderizadas).
   React 19.2 saca a un trozo posterior del HTML lo que va en un `<Suspense>` si lo de antes ya pesa más de ~12,8 KB (`progressiveChunkSize`), y
   después lo pone en su sitio con al menos 300 ms de retraso desde el primer pintado (`$RT + 300`, para juntar revelaciones). Nuestro primer HTML
   pesa ~15 KB antes de la barra (cabecera con scripts y el trazo del SN): la barra quedaba fuera. En producción el primer cuadro no la tiene.
3. **El logotipo se volvía a pedir en cada apertura.** `public/logotipo.svg` sale con `Cache-Control: public, max-age=0, must-revalidate`: el teléfono
   pregunta al servidor antes de pintarlo, y la barra sale sin logotipo un viaje de red más (≈ 550 ms con 3G).
4. **En frío, la hoja de estilos frena el primer pintado.** Seis CSS bloquean el pintado y compiten por la red con el JavaScript: el último llega a
   los ~3 s en 3G. No se cambió (ver «Lo que no se cambió»).

Descartadas: la letra (Bricolage va con `display: swap`, el texto se pinta con la del sistema mientras llega), la animación de `template.tsx`
(solo al cambiar de sección, nunca en la primera carga), el service worker (no intercepta nada) y el tiempo del servidor (el primer byte llega en
~0,5 s y el primer trozo trae ya todo lo de arriba).

## El arreglo

- **`app/loading.tsx` elige por ruta** (`components/CargandoPorRuta.tsx`, `usePathname`): en `/` pone `InicioEsqueleto`; en las demás, el SN de
  siempre. `loading.tsx` no recibe la ruta, por eso el componente de cliente.
- **`InicioEsqueleto`** (nuevo, solo composición de piezas que ya existen): la cabecera con sus tres chips en gris (sale de `ListaEsqueleto`, que
  ahora exporta `CabeceraEsqueleto`) y los tres primeros carriles con su `CarrilEsqueleto` (xl, mediana, grande con el título dentro), en el orden y
  con los `fallback` de `Inicio.tsx`. Solo los que llenan el teléfono, para que el primer HTML no crezca.
- **La barra sin `<Suspense>`** (`layout.tsx`): solo sus dos enlaces con ciudad («+» y la lupa) la esperan, cada uno en un `<Suspense>` chico con el
  mismo enlace sin ciudad de `fallback` (`ConCiudad` en `BarraApp.tsx`, el patrón de `Logotipo`). En una pantalla dinámica la ciudad está desde el
  servidor; en «No está» (prerenderizada) se completa en el teléfono, con el botón ya en su sitio.
- **El logotipo un día en caché** (`next.config.ts`: `/logotipo.svg` y `/logotipo-chico.svg` con `public, max-age=86400`). Un logotipo nuevo llega a
  más tardar al día siguiente.

`app/page.tsx` solo cambia su comentario (decía que el cargador de página entera ya no salía en Inicio, y sí salía). Diseño firmado sin cambios:
la barra, los chips y los carriles son los de siempre; lo único que deja de verse en Inicio es el SN solo en medio.

## Después (mismas condiciones, local)

| | Blanco total | Primer cuadro | Contenido |
| --- | --- | --- | --- |
| Local, caliente | 0 → 659 ms | **659 ms: barra con logotipo, chips y carriles en gris** | 988 ms |
| Local, frío | 0 → 1 905 ms | **1 905 ms: barra con logotipo, chips y carriles en gris** | 2 234 ms |

El blanco total (hasta el primer pintado) es el mismo: lo pone la red (el documento y, en frío, las hojas de estilo). Lo que cambia es lo que se
ve en el primer cuadro: antes un SN solo sobre el hueso (≈ 350 ms en caliente, el «momento en blanco» que nota el founder), ahora Inicio en gris,
con la barra entera, que se llena al llegar los datos. El salto al llegar Inicio es el de la fila «Ahora» (sin esqueleto desde OL-359: «si no hay
nada, ni hueco»), igual que antes.

## Prueba que falla si vuelve

`npm run medir` (OL-455): pide `/` como iPhone y mira el HTML hasta el primer trozo escondido (`<div hidden id="S:…">`), que es lo que se pinta antes
de que React revele nada. Ahí tiene que estar `<header class="BarraApp…">` y el esqueleto de un carril (`CarrilEsqueleto … respira`), y no el
símbolo SN. Comprobada contra los HTML guardados: falla con `main` de hoy, con `96fca5b1` y con producción (las tres cosas), y pasa con esta rama.

## Lo que no se cambió (y por qué)

- **`experimental.inlineCss`** (las hojas de estilo dentro del HTML) se probó: en frío el primer cuadro baja de 1 905 a 941 ms, pero en caliente —la
  app instalada— sube de 659 a 860 ms y el contenido de 988 a 1 795 ms, y el HTML pasa de ~200 KB a ~1,2 MB. Empeora justo el caso del founder; no
  va. Si se quiere mejorar la primera visita, es pieza aparte (menos hojas de estilo bloqueando, o precargar menos JavaScript).
- **La pantalla de arranque del iPhone** (`apple-touch-startup-image`): no se pudo medir en un iPhone. Al abrir la web instalada iOS pinta un blanco
  propio hasta el primer pintado de la página; con eso, el blanco del sistema más el de la red es lo que queda. Hacerla pide una imagen por cada
  tamaño de pantalla de iPhone (símbolo SN sobre el color de la app): pieza aparte si el founder sigue notando blanco tras esta.

## Capturas (`docs/rediseno/capturas-487/`)

Cada tira: cuadros del screencast de izquierda a derecha. El primer cuadro de cada tira es el blanco de antes de que la página pinte (es el cuadro
de la pestaña vacía, por eso más chico).

- `01-produccion-caliente-antes.png`: producción hoy, en caliente. Blanco; a los 643 ms el SN solo en medio con la navegación y **sin barra**; a los
  891 ms igual; a los 1 025 ms Inicio con sus carteles (la barra aún sin logotipo).
- `02-local-caliente-antes.png`: `main` en local, en caliente. Blanco; 648 ms el SN solo con «+» y lupa pero sin logotipo; 893 ms igual; 991 ms
  Inicio (carteles aún grises, sin logotipo).
- `03-local-caliente-despues.png`: esta rama, en caliente. Blanco; **659 ms la barra con el logotipo, los tres chips y los carriles en gris**; 890 ms
  igual; 988 ms Inicio con sus carteles y el logotipo.
- `04-local-frio-antes.png`: `main`, en frío. Blanco hasta los 1 914 ms; ahí el SN solo sin barra; a los 2 270 ms Inicio (la letra del sistema: la
  Bricolage aún no llega).
- `05-local-frio-despues.png`: esta rama, en frío. Blanco hasta los 1 905 ms; ahí **la barra y el esqueleto de Inicio**; a los 2 234 ms Inicio.
- `06-version-anterior-caliente.png`: `96fca5b1` (antes de OL-454), en caliente: el mismo SN solo a los 642 ms que hoy. El blanco no lo trajo OL-454.

## Verificación

`npm run lint` (0 errores; 2 avisos viejos en archivos que no se tocaron), `npm run typecheck`, `npm test` (282 archivos, 4 634 pruebas),
`TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (2 373 pruebas, 0 fallaron), `npm run inventario` (sin novedades),
`npm run medir` (53 pantallas × 4 anchos, sin novedades, con la comprobación nueva del primer cuadro), `npm run test:componentes` (719 de 719) y
`npm run build`: todo en verde.

## Cómo lo verá el founder

Tras el «publica», al abrir la app en el iPhone: el blanco del sistema mientras llega la página (eso es del teléfono y de la red, no cambia), y en
seguida la barra con el logotipo y los chips y carriles en gris que se llenan con los carteles, en vez del SN solo en medio sin barra. En la vista
previa de Vercel de la rama se puede ver igual (sin la app instalada: con Safari, recargando `/`).
