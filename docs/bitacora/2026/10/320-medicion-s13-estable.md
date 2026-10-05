# 320 · La medición `s13-lugares-ficha-en-hoja` deja de ser intermitente

**Fecha:** 5 de octubre de 2026. **OL:** OL-292. **Rama:** `medicion-s13-estable` (desde `origin/main`, rebasada sobre `7c403995`).
**Pieza:** estabilizar `npm run medir` en la pantalla `s13-lugares-ficha-en-hoja` (ficha de Teatro de la Paz dentro de la hoja de Lugares). Solo toca la prueba (`scripts/ops/auditoria-ui/medir-pantallas.mjs`); la app no cambia.

## Síntoma

En la CI (job `interfaz`) esa pantalla fallaba de vez en cuando y pasaba al repetir sin cambios: «168 nodos, el presupuesto es 167» y «fuera-de-la-caja … `span.Mapa/pulso.mapboxgl-marker`». Casos conocidos: PR #304 a 320 px (ver ASIGNACIONES, «Incidente de secuencia») y PR #359 a 390 px.

## Causa

La ficha abierta marca su lugar como `elegido` y `Mapa.tsx` (efecto «Un pulso al elegir un lugar», líneas 407-429) pone un marcador de Mapbox con un anillo (`span.pulso`, `Mapa.module.css` líneas 51-77) que se quita solo en su evento `animationend` (`el.addEventListener("animationend", () => anillo?.remove(), { once: true })`). Dura medio segundo y vive en el DOM: un nodo más y, por ser un marcador de Mapbox colocado con `transform`, una caja fuera de la de su padre.

`aquietar()` (`medir-pantallas.mjs`, línea 97) esperaba «ninguna animación con fin» mirando `document.getAnimations()` (`playState === "running"`). Con la máquina cargada, `getAnimations()` ya da la animación por `finished` uno o varios cuadros **antes** de que el navegador despache el `animationend` que retira el marcador. En ese hueco `aquietar()` decide que todo está quieto y `medir.js` cuenta el anillo.

Medido con una sonda (temporal, no se comitea) que repite la pantalla a los cuatro anchos a la vez, con el procesador del navegador frenado (CDP `Emulation.setCPUThrottlingRate` ×8) y registra los eventos de animación con su hora. Un caso real, a 390 px:

- `pulsoNace` 4083 ms (el marcador entra al DOM) · `animationstart` 4811 ms (la animación empieza **730 ms después**: cuadros retrasados) · `aquieto` 5575 ms: `getAnimations()` dice `finished`, el marcador sigue en el DOM (nodos 168) · `animationend` 5674 ms (100 ms **después** de que la prueba diera la pantalla por quieta; el marcador sale en ese instante).

Es una carrera de la prueba contra el despacho de un evento, no un defecto de la app: en el teléfono el anillo se retira solo a los 500 ms y nadie lo mide.

## Antes

Reproducido en local con `npm run medir -- --solo=s13` en bucle (20 corridas, cuatro navegadores en paralelo como en la CI): **1 fallo de 20** (corrida 15: 1280 px, «166 nodos, el presupuesto es 165» y `fuera-de-la-caja` del mismo `span.Mapa/pulso`, saliendo 373 px por abajo). Con la sonda y el procesador frenado (×6 y ×8; 130 rondas × 4 anchos = 520 casos), **2 casos** llegaron a `aquietar` con el anillo todavía puesto (uno a 390 px con 168 nodos, el mismo síntoma de la CI; el otro, el de la traza de arriba). Sin frenar, 40 corridas a 1280 px y 30 rondas × 4 anchos: 0 (la pantalla tarda menos de 2 s y sobra margen).

## Cambio

`aquietar()` ya no se fía solo de las animaciones: además espera a que el anillo del pulso **no esté en el DOM** (`document.querySelector('.mapboxgl-marker[class*="__pulso"]')`, con `.mapboxgl-marker` para no confundirlo con los pulsos del símbolo de carga). Es lo determinista: el estado quieto de esa pantalla es «el pulso ya se retiró»; el nodo del anillo nunca es parte de lo que se presupuesta ni se mide, así que el presupuesto (167 · 167 · 165 · 165) y las excepciones quedan **iguales**. No se sube ningún presupuesto ni se añade una excepción genérica; el comentario de `aquietar` explica el porqué.

No es tapar el síntoma: la condición nueva espera exactamente la causa (el marcador vivo), con el mismo tope de 25 vueltas de 30 cuadros que ya existía, y la pantalla que no se aquieta sigue fallando con «la pantalla no se aquietó».

## Después

- `npm run medir -- --solo=s13` 30 veces seguidas: **0 fallos de 30** (cada una con cuatro anchos).
- Sonda con el procesador frenado ×8, 120 rondas × 4 anchos (480 casos): **0** con el anillo puesto al aquietar (antes, 2 de 520).
- `npm run medir` completo: 24 pantallas × 4 anchos, 68 s, «sin novedades».
- `npm run lint` (0 errores; 3 avisos que ya estaban) y `npm run typecheck` en verde.

## Riesgos

- Una pantalla futura con un pulso que no se retire nunca (p. ej. el efecto no vuelve a quitar el marcador) ahora falla con «la pantalla no se aquietó», que es lo correcto: en la app sería un marcador atascado.
- Si se renombrara la clase `.pulso` de `Mapa.module.css`, la condición dejaría de ver el anillo y volvería la intermitencia; el comentario de `aquietar` y el de `Mapa.tsx` lo nombran.
