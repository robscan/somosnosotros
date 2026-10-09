# 385 · «Voy», «Me interesa» y «Seguir» ya no parpadean al tocarlos

**Pieza:** OL-354. **Rama:** `botones-sin-parpadeo` (sobre `origin/main` `2f691aef`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** hecho y probado en la app compilada contra el respaldo local (servidor lento a 300 ms) y con una prueba de componentes en Chromium; falta el iPhone del founder y la vista previa de Vercel. **Sin migración.**

## Qué reportó el founder (2026-10-08)

«al seleccionar voy, me interesa, seguir, etc., los botones parpadean, como un fade; evita eso, se ve de mala calidad».

## La causa, con evidencia

Era el candidato (a) del encargo: **el latido de espera de `ui/Boton`**. Las pastillas flotantes de las fichas (`Asistencia.tsx`: «Me interesa» y «Voy»; `Seguir.tsx`: «Seguir» de lugar y artista) llevaban `aria-busy={pendiente}` (el `pendiente` de `useTransition`) y `Boton.module.css` anima todo `[aria-busy="true"]` con `latido` (0,9 s, opacidad 1 → 0,55 → 1). Al tocar, la pastilla cambiaba bien a «Vas» / «Te interesa» / «Sigues», pero en el mismo instante empezaba a apagarse; cuando el servidor respondía, `aria-busy` se quitaba y la opacidad volvía a 1 de golpe. Ese bajar despacio y volver de golpe es el «fade». En la ficha de evento latían **las dos** pastillas a la vez (las dos llevaban el mismo `pendiente`).

Los otros dos candidatos se descartaron con la misma grabación:
- (b) remontaje: el nodo del botón se marca antes de tocar y nunca pierde la marca (0 nodos reemplazados en las cuatro escenas). La revalidación de la acción no reemplaza el botón.
- (c) doble cambio de `useOptimistic`: el estado (`aria-pressed` + texto) cambia **una sola vez** al soltar el dedo; al responder el servidor, lo optimista cede a la prop nueva en la misma pintada, sin volver al estado anterior.

Los botones redondos de renglones y carriles (`BotonRenglon`, vía `useSeguirEnLista` y `useAsistenciaEnLista`) no tenían el problema: nunca llevaron `aria-busy`.

**Cómo se grabó:** la app compilada (`next build` + `next start`) contra una copia del respaldo local en el scratchpad que guarda asistencias y seguimientos en memoria y tarda 300 ms en cada escritura; sesión de Ana (`fixture.mjs`); Chrome real a 390×844. En la página, `requestAnimationFrame` apunta en cada cuadro la opacidad calculada del botón (y de lo que lleva dentro), `aria-pressed`, el texto, `aria-busy` y la animación activa; desde fuera, una captura del área del botón cada ~65 ms.

| Escena (antes) | Opacidad mínima | Atenuada | Animación | Estados tras soltar |
|---|---|---|---|---|
| Ficha de evento, «Voy» | 0,654 | de 50 a 333 ms; a los 351 ms, 1 de golpe | `latido` | «Vas» (una vez) |
| Ficha de evento, «Me interesa» | 0,632 | de 39 a 338 ms; a los 356 ms, 1 | `latido` | «Te interesa» (una vez) |
| Ficha de lugar, «Seguir» | 0,678 | de 57 a 323 ms; a los 341 ms, 1 | `latido` | «Sigues» (una vez) |
| Inicio, carril, «Voy» redondo | 1 | — | ninguna | «Ya vas» (una vez) |

| Escena (después) | Cuadros | Opacidad mínima | Animación | `aria-busy` | Estados | Nodos reemplazados |
|---|---|---|---|---|---|---|
| Ficha de evento, «Voy» | 151 | 1 | ninguna | sin | «Vas» | 0 |
| Ficha de evento, «Me interesa» | 151 | 1 | ninguna | sin | «Te interesa» | 0 |
| Ficha de lugar, «Seguir» | 151 | 1 | ninguna | sin | «Sigues» | 0 |
| Inicio, carril, «Voy» redondo | 151 | 1 | ninguna | sin | «Ya vas» | 0 |

## Qué cambió

1. **`src/app/eventos/[id]/Asistencia.tsx` y `src/components/Seguir.tsx`:** las pastillas ya no llevan `aria-busy` (y el `pendiente` de `useTransition` se quitó, con su comentario). Al tocar, lo optimista las deja en su estado final; mientras el servidor confirma no hay ningún cambio visual; si no se pudo guardar, vuelven una vez a como estaban y sale el aviso con Reintentar de siempre. Tocar otra vez sigue siendo un conmutador (cada toque con su número, `lib/toques`), como estaba firmado.
2. **`src/components/ui/Boton.module.css`:** el latido de espera ya no se aplica a un conmutador (`.boton[aria-busy="true"]:not([aria-pressed])`), con el porqué en el comentario, para que un `aria-busy` futuro en «Voy» o «Seguir» no traiga el parpadeo de vuelta. Los botones de envío («Publicando…», «Consultando…») y los enlaces en camino siguen latiendo como antes. `Boton.tsx` lo dice en su comentario.
3. **Lo que no se tocó:** el pulsado de `globals.css` (`button:active` a 0,6 sin transición, mientras el dedo está encima: es la respuesta al toque, no una espera), los chips de filtro en camino (`Chip`, son enlaces de navegación), y «reducir movimiento» (ya apagaba todo; ahora además no hay nada que animar en estos botones). No había transiciones de opacidad ligadas a `disabled` en estos botones; la de `BotonIcono:disabled` (0,55) no se usa en renglones ni carriles.

## Pruebas

- `npm run lint` (solo el aviso viejo de `VisorImagen`), `npm run typecheck`, `npm test` (3405, 187 archivos), `npm run inventario` (sin novedades) y `npm run medir` (37 pantallas × 4 anchos, sin novedades; una primera corrida se agotó en `04-lugares-lista` por carga de la máquina, sola y en la corrida completa siguiente pasó).
- **Prueba nueva de componentes** `src/components/BotonesSinParpadeo.componentes.test.mjs` (Chromium real, 390×844, **sin** «reducir movimiento» para que una animación sí se vea): servidor a 300 ms; graba en cada cuadro la opacidad y el estado desde que se suelta el dedo y exige opacidad 1 en todos y un solo cambio de estado. Seis casos: «Voy» y «Me interesa» de la ficha de evento, «Voy» con fallo del servidor (cambia a «Vas» y vuelve una vez a «Voy», sale Reintentar), «Seguir» de la ficha de lugar, el renglón de lugar y la tarjeta de carril. **Antes del arreglo fallaban los cuatro de las fichas** (opacidad mínima 0,68–0,73 en los 300 ms; salida guardada en el scratchpad); después, los seis en verde. `VER_CUADROS=1` imprime los cuadros.
- De siempre, en verde: `Asistencia`, `BotonIcono` (incluye «un botón, solo con aria-busy» late), `Seguir`, `HojaLugares`, `VistaLugares`, `Destacados`, `Inicio`, `cargador`, `EntradaFicha`, `AltaEvento`.

## Capturas (`docs/rediseno/capturas-385/`)

Tiras de fotogramas de la app compilada (2×), tiempo desde que se soltó el dedo a la izquierda; abiertas y miradas una por una.

- `antes-ficha-evento-voy.png`: a los 5 ms ya dice «Vas» en verde; a los 192 ms las **dos** pastillas están desvaídas (se ve el texto de la lista a través de «Me interesa» y «Vas» es verde claro); a los 322 ms, de vuelta enteras de golpe.
- `antes-ficha-lugar-seguir.png`: «Sigues» a los 4 ms, verde claro a los 176 ms y entero a los 308 ms.
- `despues-ficha-evento-voy.png`: doce fotogramas de 5 a 797 ms, todos iguales: «Me interesa» blanco y «Vas» verde, enteros.
- `despues-ficha-lugar-seguir.png`: «Sigues» igual en todos los fotogramas.
- `despues-inicio-carril-voy.png`: la tarjeta de «Leonora in the morning light» con la palomita en verde, igual de 6 a 748 ms.
- `ficha-390x844-durante-la-espera.png`: la ficha de «Cine de barrio: ciclo Fellini» a 390×844, a los 150 ms de tocar «Voy» (el servidor aún no responde): «Vas» en verde y «Me interesa» enteros, sin atenuar.

## Pendiente

- Probarlo en el iPhone del founder (Safari y la app instalada) con la vista previa de Vercel de la rama.
