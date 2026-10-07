# 358 · Seguridad: sharp con el parche y validación de las imágenes del cartel

**Pieza:** OL-329 (hallazgo P1 de Codex en la revisión OL-327). **Rama:** `seguridad-sharp` (sobre `origin/main`). **Fecha:** 2026-10-07. **Operador:** Claude Sonnet 5.5 (agente del gestor IV).
**Estado:** hecho y probado en la Mac; sin unir (espera el «publica» del founder). Sin cambios de producto, sin migraciones, sin variables nuevas.

## El hallazgo

`package-lock.json` fijaba **sharp 0.35.4** (entró con OL-324, el creador de cartel, PR #415, ya en `main`). `npm audit --omit=dev` marcaba [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) (alta): afecta a sharp anterior a 0.35.5 (librsvg anterior a 2.63.2) y permite, en Linux glibc y bajo ciertas condiciones del ejecutable de Node, ejecutar código. Codex añadió dos cosas (evidencia en `.buzon/tmp-codex/`: `npm-audit-main.json` y `sharp-svg.log`):

1. `src/lib/carteles/dibujar.ts` usa los decodificadores de sharp con la foto del evento, del artista o del lugar, y un SVG de 106 bytes entraba al **lector SVG** con `sharp(buffer).stats()` (librsvg 2.62.91, sin pedir nada especial).
2. El generador (`generar.ts`) aceptaba cualquier respuesta con `Content-Type: image/*` sin comprobar el formato real antes de decodificar.

## Qué se hizo

**1. Sharp 0.35.5.** `package.json` (`^0.35.5`) y `package-lock.json` (`npm install sharp@^0.35.5`; solo cambian sharp y sus binarios por plataforma). `npm ls sharp` da 0.35.5 también en `next` (deduplicado). En la Mac: `require('sharp').versions` da `rsvg 2.63.2`, `vips 8.18.7`. `npm audit --omit=dev` ya no marca sharp. Quedan dos avisos que no son de esta pieza (ver «Pendiente»).

**2. Validar el formato real antes de decodificar** (`src/lib/carteles/imagenSegura.ts`, nuevo):

- Se admite solo lo que el bucket `fotos` deja subir y sharp lee sin más: **JPEG, PNG y WebP**, reconocidos por sus **bytes mágicos** (no por `Content-Type` ni extensión). El bucket también admite HEIC, pero la sharp de prebuilds no lo decodifica: cae a «sin foto», como antes. GIF, AVIF, TIFF y **SVG** se rechazan.
- Tope de peso: 6 MB (el bucket admite 5; es el tope que ya traía `generar.ts`). Tope de píxeles: 40 megapíxeles (una foto de 8000 × 5000 cabe; una bomba de descompresión no), con `sharp(buffer, { limitInputPixels })` en todo lo que viene de fuera y con comprobación del ancho × alto de `metadata()`.
- Además, el formato que lee sharp debe coincidir con el que dicen los bytes (un archivo con encabezado de PNG que sharp tomara por otra cosa se rechaza). `imagenAdmitida` solo lee la cabecera; no decodifica los píxeles.

**3. Dónde se aplica.**

- `generar.ts`, `traerImagen` (ahora exportada, con `traer` y `supabaseUrl` inyectables para probarla): pide **solo** URLs del Storage propio con `cartelDescargable` (el mismo filtro de `imagenesPorOrden`, repetido aquí porque esta función es la que sale a la red; `next.config.ts` ya solo permite ese host y esa ruta para imágenes), sin redirecciones, **corta la descarga** al pasar el tope (antes bajaba el cuerpo entero a memoria y medía después) y descarta lo que no pasa `imagenAdmitida`. El `Content-Type` ya no se exige ni se fía. Si una imagen se descarta, el generador prueba la siguiente de la lista y, si ninguna sirve, el cartel sale sin foto (plantillas tipográficas). Lo que se guarda en la memoria del proceso ya está validado.
- `dibujar.ts`: defensa en profundidad. `dibujarCartel` vuelve a llamar a `imagenAdmitida` con lo que reciba (quien lo llame mañana sin pasar por `generar.ts` queda cubierto) y `tonoDominante` y `prepararFoto` abren con `limitInputPixels`. El SVG que arma satori **sí** se rasteriza (es nuestro): la validación es del material de entrada, no de la salida.

## Pruebas (18 nuevas)

- `imagenSegura.test.ts` (7): bytes mágicos de JPEG, PNG y WebP; no reconoce SVG, GIF, AVIF, texto ni cuerpos cortos; admite los tres formatos válidos; rechaza el SVG, un cuerpo que no es un PNG (también con encabezado de PNG y basura detrás), un JPEG que pasa del tope de peso y un PNG de 42 megapíxeles que pesa poco (bomba de descompresión).
- `generar.test.ts` (7): JPEG, PNG y WebP válidos del Storage propio pasan; un SVG se rechaza aunque venga como `image/png` o `image/svg+xml`; un cuerpo que dice `image/png` y no lo es se rechaza; un JPEG con `Content-Type` equivocado pasa (cuentan los bytes); lo que pasa del tope de peso se rechaza; una URL de otro host, la IP de metadatos de la nube y otro bucket del propio proyecto se rechazan **sin pedirse** (el `fetch` falso no se llama); una respuesta 404 da null.
- `dibujar.test.ts` (4): un SVG, un falso PNG y una imagen válida con demasiados píxeles salen **byte a byte iguales** al cartel sin foto; un JPEG válido sí cambia el cartel. La matriz de dibujo de OL-324 (12 plantillas × 2 formatos × con y sin foto × casos) sigue en verde: 391 pruebas.

`npm run lint` (una advertencia que ya estaba, en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (172 archivos, 2996 pruebas), `npm run inventario` («sin novedades») y `npm run medir` (35 pantallas × 4 anchos, «sin novedades») en verde.

**Paquete de la función en Vercel.** `.next/server/app/api/cartel-nuevo/[id]/route.js.nft.json`: 301 archivos, **35,3 MB** rastreados con sharp 0.35.5 (OL-324 anotó ~33 MB con la 0.35.4; la diferencia cabe en la otra versión de las bibliotecas nativas), lejos del tope de 250 MB.

## Decisiones del operador

- **Tope de peso 6 MB, no 8:** el bucket ya limita a 5 MB y `generar.ts` ya usaba 6; no tiene sentido admitir más de lo que el proyecto deja subir.
- **No se admite AVIF ni GIF:** el bucket no los deja subir (solo JPEG, PNG, WebP y HEIC), así que admitirlos solo ampliaría la superficie sin beneficio.
- **El origen se vuelve a comprobar en `traerImagen`** aunque `imagenesPorOrden` ya filtraba: así la función que sale a la red no depende de que su llamador haya filtrado.
- **`Content-Type` deja de exigirse:** Storage lo guarda como lo mande el cliente; los bytes son la verdad.

## Pendiente (no es de esta pieza)

`npm audit --omit=dev` aún marca `source-map-js` (alta, GHSA-68fv-2mgg-jv7q; `npm audit fix` la resuelve sin cambio mayor) y `fflate` (moderada, vía satori; la salida que propone npm es bajar satori a 0.32.0, un cambio mayor). Ninguna toca las imágenes de fuera; el gestor decide si abre una pieza.
