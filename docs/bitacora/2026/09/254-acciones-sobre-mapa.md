# 254 · Acciones de la ficha arriba del mapa (OL-225)

**Fecha:** 2026-09-26 · **Rama:** `acciones-sobre-mapa`, desde `origin/main` (`8dc07460`, con `main` fusionado hasta `e510ce0c`) · **OL:** OL-225 · **Modelo:** Sonnet 5

## Pedido

Founder, probando la app en TestFlight: «los accionables de ficha deben ir sobre el mapa, no debajo del mapa, así se ven mas». En la ficha de evento la fila de acciones (Compartir, A mi calendario, Cómo llegar) y en la de lugar (Cómo llegar, Compartir…) vivían debajo de `<MapaFicha>`; pasan a vivir arriba, con el mismo contenido y el mismo aspecto.

## Qué se hizo

- `src/app/eventos/[id]/page.tsx` y `src/app/lugares/[id]/page.tsx`: se sube el `<div className={ficha.acciones}...>` para que quede inmediatamente después de `<ul className={ficha.datos}>` y antes de `<MapaFicha>` (antes era al revés). Ningún botón cambia de contenido, clase ni comportamiento — solo el orden en el documento. Un comentario en cada archivo cita el pedido (OL-225).
- **Sin cambios de CSS.** Cada bloque de la ficha (`.datos` y `.acciones` de `components/ui/Ficha.module.css`, `.mapa` de `MapaFicha.module.css`) solo lleva `margin-bottom`, nunca `margin-top` — es el patrón de toda la ficha. Eso quiere decir que el reordén no puede doblar un hueco (dos márgenes sumándose) ni pegar dos elementos (ninguno se queda sin margen): el hueco entre bloques lo pone siempre el que queda arriba. Medido con `getBoundingClientRect()` sobre el build real: antes, datos→mapa 16px / mapa→acciones 16px / acciones→lo siguiente 20px; después, datos→acciones 16px / acciones→mapa 20px / mapa→lo siguiente 16px. Se decidió no perseguir la cifra exacta de "antes": tocar el `margin-bottom` de `.acciones` en `Ficha.module.css` cambiaría también la ficha de artista (comparte esa clase, ver abajo) fuera del encargo de esta pieza, e inventar una clase nueva solo para mover 4px de un lado a otro no se justifica frente a lo simple que ya queda — en las capturas de abajo el ritmo se ve limpio en las dos fichas, sin huecos dobles ni nada pegado.
- **Revisado y sin tocar:** la ficha de artista (`src/app/artistas/[id]/page.tsx`) también usa `ficha.acciones` (su carril de redes) pero no tiene `<MapaFicha>` — no hay nada que reordenar ahí, y no se tocó `Ficha.module.css` ni ese archivo. La barra pegajosa de abajo (Voy/Me interesa en evento, Seguir en lugar) tampoco se tocó.

## Verificación

`npm run lint` (1 warning preexistente de `docs/diseno/logotipo/iconos-sn.mjs`, sin relación, sin errores), `npm run typecheck` (verde), `npm test` (113 archivos, 1452 pruebas, verde — incluye `eventos/[id]/page.test.ts` y `lugares/[id]/page.test.ts`, que no dependen de este orden), `npm run build` (verde).

### Capturas reales (`docs/rediseno/capturas-254/`)

Respaldo local 100% inventado (Node puro, sin dependencias, en el scratchpad de la sesión, nunca en el repo): un evento («Concierto de prueba en el Centro») y un lugar («Centro Cultural de Prueba», San Luis Potosí, misma dirección y coordenadas que el lugar del evento), con «quién va» (2 Voy + 1 Me interesa), un artista y un evento próximo — sin sesión (ficha pública, la barra de abajo queda en su estado "Entrar"). `next build && next start -p 3100` contra ese respaldo, Chrome real de la Mac por `playwright-core`, 390×844, `deviceScaleFactor: 1`. Mapbox no tiene token real ni acceso de red garantizado: el `<img>` de `api.mapbox.com` se sirvió con un SVG propio («mapa de prueba (sin Mapbox)», con un pin, nunca el logotipo del sitio, para no confundir la evidencia con una imagen de marca). `document.fonts.ready` esperado antes de cada captura: Bricolage Grotesque condensada se ve en «SMSNSTRS» y en los títulos.

- **`254-1-evento-antes-viewport.png` / `254-5-lugar-antes-viewport.png` (sin desplazar, antes):** en las dos fichas se alcanza a ver la cabecera, el cartel (símbolo SN, sin foto), el título, los renglones de datos y el mapa completo; los botones de acción (Compartir / A mi calendario / Cómo llegar en evento; Cómo llegar / Compartir en lugar) quedan debajo del pliegue — ni uno se alcanza a ver sin desplazar, tapados por la barra fija de abajo (Voy · Me interesa / Seguir).
- **`254-3-evento-despues-viewport.png` / `254-7-lugar-despues-viewport.png` (sin desplazar, después):** mismo recorte de pantalla (390×844), pero ahora los tres botones (evento) o los dos botones (lugar) se ven completos sin desplazar, justo debajo de los datos; el mapa solo asoma el borde superior antes de la barra fija. Es, literalmente, lo que pidió el founder — antes ningún botón cabía en la primera pantalla, ahora todos caben.
- **`254-2-evento-antes-completa.png` / `254-6-lugar-antes-completa.png` y `254-4-evento-despues-completa.png` / `254-8-lugar-despues-completa.png` (ficha completa, sin recortar):** de arriba a abajo, el mismo contenido en los dos casos (cartel, título, datos, mapa y acciones en el orden que corresponda, descripción, «Quién va» / «Próximos eventos», autor) — confirma que el reordén no agrega ni quita nada, solo intercambia el mapa y la fila de acciones. Las capturas completas de cada ficha miden exactamente el mismo alto antes y después (evento 1303px, lugar 1313px): no hay hueco de más ni de menos en el total de la página.

## Qué falta

Nada de código. Commit local en `acciones-sobre-mapa`, PR abierto contra `main`, sin mezclar: pendiente de revisión del gestor y de que el founder lo pruebe en su iPhone (Safari).
