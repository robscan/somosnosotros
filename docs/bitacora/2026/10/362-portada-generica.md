# 362 · La imagen de compartir sin ciudad y «No necesitas cuenta para mirar»

**Pieza:** OL-333. **Rama:** `portada-generica`. **Fecha:** 2026-10-07. **Operador:** Claude Fable 5.1 (agente del gestor de cambios IV).
**Estado:** candidato listo para revisión del gestor; con PR a `main`, sin unir.

## Pedido del founder

«La imagen de compartir sigue diciendo "San Luis Potosí", ¿podemos dejarla genérica? Recuerda que vamos a comenzar a expandir en México. Y dice "sin cuenta para mirar", ¿puede ser más claro? "No necesitas crear una cuenta para mirar".» (2026-10-07, al compartir el sitio por WhatsApp). Continúa OL-290 (CLAUDE.md, 2026-10-05): el catálogo se abre a más ciudades.

## Qué se cambió

1. **La imagen (`public/portada.png`, 1200×630).** El lema de `docs/diseno/logotipo/portada.html` pasa de «Agenda cultural y lugares de San Luis Potosí» a **«Agenda cultural y lugares para conocer gente»**. Todo lo demás igual: fondo hueso, logotipo SMSNSTRS con manos y pies (`public/logotipo.svg`), Bricolage Grotesque condensada a 40 px. No hay otras variantes de tamaño: es la única imagen de compartir.
2. **Quién la usa.** Sitio (`layout.tsx`), Agenda, Lugares y Artistas (Open Graph y Twitter) y, como imagen por omisión cuando no hay foto, las fichas de lugar (`lugares/[id]/page.tsx`) y de artista (`artistas/[id]/page.tsx`). Todas reciben la nueva sin tocar código: es la misma composición sin la ciudad.
3. **El texto.** «Sin cuenta para mirar.» pasa a **«No necesitas cuenta para mirar.»** (la frase del founder en su forma corta, sin «crear»; con dos puntos donde el texto termina en un enlace):
   - `src/app/layout.tsx`: `description`, Open Graph y Twitter (3 sitios).
   - `src/app/agenda/page.tsx`: descripción de Agenda.
   - `src/lib/perfil.ts`: `TEXTO_INVITAR` (el que acompaña al enlace al invitar por WhatsApp o redes).
   - Búsqueda de la misma frase en `src/`, `scripts/`, `apps/`, `supabase/` y `public/`: ya no vive en otro lado. `manifest.ts` nunca la trajo (su descripción termina en «conoce a la gente.»). Las demás coincidencias de «sin cuenta» son comentarios o textos de otra cosa («sin cuenta vinculada» en el panel, etc.), y no se tocan.
4. **Lo que no se tocó.** Los títulos y descripciones por ciudad de OL-059 (Lugares y Artistas) y todo lo que nombra una ciudad como dato.

## Cómo se regeneró la imagen

El método de la bitácora 035 (Chrome sin ventana a partir de `portada.html`), ahora con `playwright-core` y el Chrome real de la Mac (`/Applications/Google Chrome.app`), no un rasterizado a mano:

- `portada.html` pide el logotipo como `logotipo.svg` en su misma carpeta; esa carpeta no lo trae (vive en `public/logotipo.svg`). Se copió a una carpeta temporal junto al HTML y se abrió ahí; la fuente Bricolage viene de Google Fonts y se esperó a `document.fonts.ready` (`document.fonts.check` devolvió `true`: sin ello saldría con la tipografía de respaldo).
- Viewport 1200×630, escala 1, captura PNG.
- **Control del método:** con el lema viejo en la misma carpeta, el mismo método reproduce la imagen vieja casi igual: 6.853 de 756.000 píxeles difieren (0,9 %), todos en los bordes del logotipo y de las letras (suavizado de otra versión de Chrome); la composición y las posiciones coinciden. Se mira a ojo, lado a lado, en las capturas.
- Peso: la vieja pesaba 42.188 bytes, la nueva 23.678 (otro codificador PNG de Chrome; sin pérdida). Comprobada nítida a 2× (2400×1260, 54.912 bytes), con la misma composición.

## Prueba nueva

`src/app/textos-compartir.test.ts` (lee la fuente, como `layout.viewport.test.ts`, porque el layout trae `next/font`): ni `layout.tsx`, ni `agenda/page.tsx`, ni `perfil.ts`, ni `manifest.ts` contienen «San Luis» ni «Sin cuenta»; el layout trae tres veces «No necesitas cuenta para mirar.», Agenda la trae y `TEXTO_INVITAR` termina en «No necesitas cuenta para mirar:»; y la fuente de la imagen lleva el lema nuevo y no nombra una ciudad. No había pruebas que citaran el texto viejo.

## Evidencia (`docs/rediseno/capturas-362/`, cada PNG abierto y mirado)

- `portada-antes-1200x630.png`: la imagen anterior, con «de San Luis Potosí» bajo el logotipo.
- `portada-nueva-1200x630.png`: la imagen nueva a tamaño real; el mismo logotipo y debajo «Agenda cultural y lugares para conocer gente», centrado, mismo gris y tamaño.
- `portada-nueva-2x.png`: a 2400×1260; los trazos del texto y las manos del logotipo salen limpios.
- `tarjeta-al-compartir-antes-despues.png`: cómo se ve la tarjeta de un mensaje (390 px de ancho, a 2×) con la imagen y el texto: antes «… Sin cuenta para mirar.» con la imagen de San Luis Potosí; después «… No necesitas cuenta para mirar.» con la imagen nueva. Es una maqueta de la tarjeta con los textos reales, no una captura de WhatsApp.

## Verificación

`npm run lint` (0 errores; 1 aviso que ya existía en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3082 pruebas, 181 archivos), `npm run inventario` (sin novedades) y `npm run medir` (35 pantallas × 4 anchos, sin novedades): en verde. Sin migraciones ni cambio de pantalla.

## Nota: la vista previa tarda en cambiar

WhatsApp y otras redes guardan la vista previa de un enlace un tiempo (la imagen y el texto). Para ver la imagen nueva al compartir hay que usar un enlace distinto (por ejemplo `https://somosnosotros.org/?v=2`) o esperar a que caduque; en Facebook existe el «Depurador de uso compartido» para forzarlo, y en WhatsApp a veces ayuda compartir el enlace en un chat distinto. El archivo conserva el nombre `portada.png`, así que el enlace de la imagen es el mismo y el navegador o la red pueden seguir mostrando la anterior hasta que renueven su copia.
