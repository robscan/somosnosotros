# 179 · Transiciones entre pantallas y cargador (OL-144, B5) — prototipo y propuesta

**Fecha:** 2026-09-23 · **OL:** OL-144 · **Rama:** `transiciones-cargador` desde `origin/main` · **Modelo:** Sonnet 5, esfuerzo medio. Solo prototipo y documento: **sin código de la app.** Sin council ni subagentes (costo).

## El pedido (L46, `docs/ops/COLA_DE_PIEZAS.md`)

«Necesitamos agregar animaciones de transición para mejorar la experiencia de consulta entre páginas/dominios principales y entre contenidos de dominio (tabs). También mejorar el cargador de contenido, actualmente es un letrero de cargando del lado izquierdo del sitio, mejor poner favicon centrado y parpadeando o algo así».

## Lo leído antes

`docs/diseno/LINEA_GRAFICA.md` (letra Bricolage Grotesque, símbolo SN del arte final, tokens de color), `docs/PRINCIPIOS_UX.md` (Nivel A: «el gesto de la persona gana» exige respetar «reducir movimiento»), la navegación de hoy (`src/components/NavInferior.tsx` y su CSS: tres destinos con píldora de color detrás del icono activo), el cargador actual (`src/app/loading.tsx` → `CargandoRaiz`, y `src/components/ui/Cargando.tsx`: renglones grises con `<p>Cargando…</p>` a la izquierda), las pestañas (`src/components/ui/Pestanas.tsx`, ya con subrayado que se mueve y un "en camino" con latido) y los `template.tsx` existentes de `lugares/[id]` y `artistas/[id]` (hoy solo comparten el estado de un aviso, OL-057; no animan nada).

## Entrega

1. **Prototipo interactivo** [`docs/rediseno/prototipos/transiciones.html`](../../rediseno/prototipos/transiciones.html), 390×844, Bricolage Grotesque real (`next/font` no aplica fuera de la app; se carga desde Google Fonts como en los demás prototipos). Muestra las tres secciones (Agenda, Lugares, Artistas) con datos de mentira, pestañas dentro de Agenda (Todos/Cercanos) y de Lugares (Lista/Mapa), y una ficha compartida. Controles a un lado: casilla para simular «Reducir movimiento» sin tocar el ajuste del sistema, botón para aislar el cargador (para la captura) y uno para reiniciar.
2. **Documento** [`docs/rediseno/38-transiciones-cargador.md`](../../rediseno/38-transiciones-cargador.md): qué transición va en cada caso y por qué, las duraciones (200 ms secciones y pestañas, 220 ms la ficha, la misma curva `cubic-bezier(0.22, 0.61, 0.36, 1)` en las tres), cómo se haría en Next (`template.tsx` + CSS primero; View Transitions API como posible vuelta futura, con su riesgo de soporte en Safari), qué no se anima (la navegación en sí, el scroll repuesto por la memoria de pantalla, los avisos, la primera carga, y todo si `prefers-reduced-motion` está activo) y los riesgos en Safari iOS (el atrás de Safari navega por documento, no por `pushState`; el modo de bajo consumo puede forzar más reducción de movimiento; solo animar `opacity`/`transform`).

## Lo decidido en el prototipo

- **Entre secciones:** fundido de 200 ms, sin desplazamiento lateral — las tres secciones no tienen orden entre sí.
- **Entre pestañas:** deslizamiento de 18 px en la dirección de la pestaña tocada (200 ms) — las pestañas sí tienen un orden visible en la tira.
- **Listado a ficha:** la ficha entra desde la derecha (220 ms) cubriendo el listado; Atrás la devuelve sin cargador (los datos ya están en memoria; solo se anima la posición).
- **El cargador:** el símbolo SN (el mismo del favicon, `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`) centrado, con un pulso de opacidad y escala suaves (no un parpadeo agresivo de opacidad 1↔0), sin renglones de esqueleto detrás — el pedido del founder es reemplazar el letrero, no sumarle algo más.

## Verificación

Sin build ni pruebas: no hay cambios en `src/`. `package.json` y el lock no se tocaron. Ningún correo real en el prototipo. Playwright-core (ya instalado en el scratchpad de la sesión, fuera del repo) con el Chrome real de la Mac, sirviendo el HTML por `python3 -m http.server` en `127.0.0.1`; en cada página, `document.fonts.check('700 20px "Bricolage Grotesque"')` = `true` antes de capturar.

### Capturas reales (`docs/rediseno/capturas-179/`), abiertas y descritas

- **`01-agenda-inicio.png`** — estado inicial: Agenda, pestaña «Todos» activa (subrayado y texto en azul petróleo), dos eventos de mentira, la píldora de Agenda en la nav.
- **`02-cargador.png`** — el cargador aislado: el símbolo SN en tinta, centrado en el hueco de contenido, cabecera y navegación fijas alrededor (el pulso ya en marcha, capturado 150 ms después de mostrarse).
- **`03-fundido-secciones-medio.png`** — fotograma intermedio del fundido entre secciones (Agenda → Lugares): el listado de Lugares ya visible pero claramente más pálido que su estado final (captura tomada al 20 % de una versión de la animación alargada a 1.6 s solo para este fotograma; la app real sigue en 200 ms).
- **`04-lugares-final.png`** — estado final tras el fundido: Lugares, pestaña «Lista», con Museo Federico Silva y CEART San Luis.
- **`05-deslizamiento-pestanas-medio.png`** — fotograma intermedio del deslizamiento (Lista → Mapa, mismo truco de cámara lenta): el aviso «Mapa (Mapbox no va en este prototipo)» entrando desde la derecha, aún desplazado y más pálido que su lugar final; el subrayado de «Mapa» ya se movió (es instantáneo, no se anima).
- **`06-pestana-mapa-final.png`** — estado final de la pestaña Mapa.
- **`07-listado-a-ficha-medio.png`** — fotograma intermedio de la ficha entrando: la ficha de «Museo Federico Silva» cubre la mayor parte de la pantalla mientras el listado de Lugares todavía asoma en el borde izquierdo (unos 20 px de «Lu…» y «Lis…» visibles); la barra interior («‹ Volver», SMSNSTRS, ⋯) ya está en su sitio.
- **`08-ficha-abierta.png`** — la ficha completamente abierta: foto, título, subtítulo y el texto de ejemplo.
- **`09-atras-listado.png`** — tras tocar «Volver»: de regreso en Lugares, pestaña «Lista» (se conservó, como pide la memoria de pantalla), sin cargador de por medio.

## Límites

- El «mapa» de la pestaña Mapa es un aviso de texto, no Mapbox: no hace falta para probar la transición entre pestañas.
- Las capturas 03, 05 y 07 usan una versión de la animación alargada (1.6 s) inyectada solo para poder fotografiar un instante intermedio con precisión; el prototipo que ve el founder corre siempre a las duraciones reales (200/220 ms) — no hay dos versiones del prototipo, solo dos pasadas del script de captura.
- Falta la firma del founder en su iPhone (Safari) antes de pasar cualquiera de estas tres transiciones o el cargador a código.

## Archivos

`docs/rediseno/prototipos/transiciones.html`, `docs/rediseno/38-transiciones-cargador.md`, `docs/rediseno/capturas-179/` (9 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
