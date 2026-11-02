# 535 · OL-502 · Prototipo de «publicar sin recargar»: la tarjeta se queda en su sitio y cambia sola (espera firma)

**Fecha:** 2026-11-02. **Rama:** `prototipo-publicar-sin-recargar` (desde `origin/main` `2a9bd2c5`). **Quién:** Gestor de cambios VIII (Fable 5.1,
sesión `local_de64d008`), como pidió el founder el 31 de octubre («prototipo antes que código… lo hace el gestor»). **Sin código de la app ni
migración.** **Estado:** prototipo listo para la firma del founder.

Entrega: `docs/rediseno/prototipos/publicar-sin-recargar.html` (se abre con doble clic; 850 KB porque lleva dentro las dos maquetas reales),
capturas en `docs/rediseno/capturas-535/`, guiones en `scripts/ops/auditoria-ui/prototipo/publicar-sin-recargar.mjs` (arma el prototipo),
`publicar-sin-recargar.plantilla.html` (el armazón, los estados y las notas) y `capturar-publicar-sin-recargar.mjs` (capturas y la comprobación del
`top`).

## El pedido

Pieza (c) del plan de carga de OL-497 (bitácora 529, parte D): hoy, al tocar «Publicar», la hoja se cierra, no pasa nada visible durante medio
segundo, la pantalla se recarga entera dos veces (45 consultas y 10 prefetch cada una), «Publicado» llega hasta 5 s tarde y el evento salta al
grupo «Ya en Instagram», fuera de la vista. El council del 31 de octubre (acta `docs/council/COUNCIL_carga-rendimiento_2026-10-31.md`, M7 y
condición 10) pidió prototipo antes que código con estos estados: en camino, reintentando, publicado, fallido, con espejo a Facebook, al volver
con Atrás (`staleTimes` 60), letra grande y «reducir movimiento»; y que el handoff fije dueño del estado, sondeo, los `router.refresh` que quedan,
el contador del grupo, el estado nuevo en `ui/Renglon`, «Ver» en el hueco de acción, `Hecho` con enlace y `role=status`.

Decisiones ya tomadas por el founder («acepto tus recomendaciones», 31 de octubre): la tarjeta se queda en su sitio y cambia sola (sin velo, sin
recargar); sondeo de `estadosTrabajos` solo mientras haya algo en camino (no hay canal realtime); «Ver» abre la publicación en Instagram.

## Cómo se hizo

Sobre la pantalla real (regla de OL-409): la app compilada contra el respaldo local (reloj fijo del mié 7 de oct de 2026, cuenta de
administración, `RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_INSTAGRAM_CONEXION=todo`) y guardada con `maqueta-pantalla.mjs --solo=simple-ig-eventos,igc-hoja`
en un árbol sin `.env` (40 s en total). Las dos maquetas van enteras dentro del prototipo (JSON) y se cargan en el marco con `srcdoc`; el prototipo
**solo toca el renglón del evento que se publica** («Delirium Pollum, clown y pantomima con Pimpolina», Teatro de la Paz, el sexto de «Para
publicar»), con las clases de producción: la última línea de `ui/Renglon` (`envuelve`), el anillo de `ui/Girando` (el mismo de hoy), el hueco de
acción del renglón con un `ui/BotonIcono` de control (44, plano: el mismo que el botón de Facebook en «Ya en Instagram») y el verde de lo decidido
(`--ok`, como `SemanaInstagram/hecho`). Lo nuevo son cinco reglas con prefijo `pr-`: la línea verde con palomita, la línea roja, el enlace en el
hueco de acción y «sin movimiento». Un botón «▶ Reproducir» recorre antes → hoja → publicando (0,1 s) → publicado con los tiempos reales.

El guion de capturas comprueba que el renglón quede en el mismo `top` en los ocho estados de la lista: **300 px en los ocho** (`medicion.json`,
`mismoTop: true`, 0 errores de página). Es el criterio de aceptación que pedirá el código (mismo nodo, mismo `top`).

## Los estados y lo que se ve

| Captura | Estado | Qué se ve |
| --- | --- | --- |
| `01-reposo` | Antes | La lista tal cual la sirve la app; el evento con su línea de señal («0 van · 0 les interesa»). |
| `02-hoja` | La hoja | «Publicar en Instagram» como hoy; no cambia en esta pieza. |
| `03-en-camino` | 0,1 s después del toque | La hoja se fue; el renglón sigue en el mismo sitio y su última línea dice «Publicando…» con el anillo violeta. |
| `04-reintentando` | La cola repite | «Reintentando…» en el mismo sitio (la frase de OL-488). |
| `05-publicado` | Publicado | Palomita y «Publicado · hace un momento» en verde; a la derecha, «Ver» (icono de abrir fuera) lleva a la publicación en Instagram. El grupo sigue diciendo «Para publicar · 11». |
| `06-facebook` | Con espejo a Facebook | Dos líneas: la verde de Instagram y «Facebook: publicando…» con su anillo. |
| `07-facebook-ok` | Los dos publicados | «Facebook: publicado» en gris; se acabó el sondeo. |
| `08-fallido` | No se publicó | «No se publicó: Instagram no aceptó la imagen» en rojo, en el mismo sitio; tocar la tarjeta abre la hoja con «Publicar otra vez» (como hoy). |
| `09-atras-cache` | Atrás antes del minuto | La lista llega de la caché, pero la tarjeta vuelve a decir «Publicado · Ver» sin saltar. |
| `10-atras-fresco` | Atrás pasado el minuto | La pantalla de siempre: el evento en «Ya en Instagram · 2» con «Publicación · Hoy, 11:52 am» y «Facebook: publicado»; «Para publicar · 10»; la línea gris «· 2 ya en Instagram». |
| `11-letra` | Letra al doble | La línea verde envuelve en dos renglones; la palomita queda en el primero; «Ver» sigue en su hueco sin montarse. |
| `12-quieto` | Con «reducir movimiento» | El anillo no gira (queda abierto); la palabra sigue diciendo que algo pasa. |
| `00-escena-1440` | El armazón | El teléfono y la hoja de notas con las decisiones y el handoff. |

## Decisiones del prototipo (quedan así si el founder no dice otra cosa)

1. **La tarjeta no se mueve mientras la persona mira.** Ni la lista, ni el scroll, ni el contador del grupo («Para publicar · 11» cuenta
   renglones), ni la línea gris de arriba. Todo cambia la próxima vez que la pantalla se pide al servidor (otra pestaña, otra ciudad, Atrás pasado
   el minuto).
2. **«Ver» en el hueco de acción** del renglón, hermano del enlace (nunca un enlace dentro del enlace), 44 × 44, icono de «abrir fuera», con
   `aria-label` «Ver en Instagram: <título>», `target="_blank"` y `rel="noopener noreferrer"`.
3. **El estado solo tiñe la última línea**: violeta con anillo (en camino, reintentando), verde con palomita (publicado), rojo (fallido). No cambia
   el fondo del renglón (`--primario-suave` ya significa «elegido») y manda sobre pulsado y hover.
4. **Si falla, sin botón nuevo**: la frase en rojo (la de hoy, `lineaDeTrabajo`) y la hoja, que ya sabe reintentar.
5. **«Publicado · hace un momento»** mientras la tarjeta siga en su sitio; en «Ya en Instagram» va como hoy («Publicación · Hoy, 11:52 am»).
6. **Con «reducir movimiento» el anillo no gira** (hoy gira despacio, 2,4 s).

## Handoff para el código (OL por reservar al firmar)

- **Dueño del estado:** `ListaInstagram` guarda `trabajos: Record<eventoId, EstadoTrabajo>`, sembrado con lo que ya trae el servidor (`enCamino`
  de cada sugerencia) y con la respuesta de `publicarEnInstagram` / `publicarEnFacebook` (`{ ok, id }`). La hoja avisa con `onPublicado(id)` en vez
  de pedir `router.refresh()`. La señal «Publicando…» se pinta al cerrar la hoja (antes de que el sondeo diga nada): < 100 ms tras el toque.
- **Sondeo:** `useAlDia` pregunta `estadosTrabajos(ids)` cada 2 s (hoy 5) solo mientras haya algo en camino, y entrega el estado nuevo al dueño en vez
  de refrescar. Al volver a la app pregunta una vez por los ids que recuerda (sessionStorage, 10 min) y solo hace `router.refresh()` si no hay nada
  en camino y la lista tiene más de 5 min (el umbral del council de la recarga, OL-500, se decide con datos; mientras, 5).
- **Los `router.refresh()` que quedan:** el de `aFacebook` en la lista (sale: la línea de Facebook la pone el estado), el de `onPublicado` de la
  hoja (sale), el de `useAlDia` al terminar un trabajo (sale) y el de volver a la app (se queda con la condición de arriba). `HojaDia` y
  `HojaSugerencia` son de la pestaña Semana: no se tocan en esta pieza.
- **`ui/Renglon`:** prop `estado?: "en-camino" | "reintentando" | "hecho" | "fallido"` que tiñe la última línea y le pone `role="status"`; sin cambiar
  el fondo. **`ui/Hecho`:** variante con texto y enlace («Publicado · Ver»), reutilizable en la hoja al reabrirla. **`ui/Girando`:** con
  `prefers-reduced-motion: reduce`, sin giro.
- **Atrás dentro del minuto** (`staleTimes.dynamic: 60`): la lista llega de la caché con el evento aún en «Para publicar» y su línea vieja; el dueño
  reconcilia con sessionStorage + `estadosTrabajos` y la tarjeta queda como se dejó, sin saltar.
- **Criterio de aceptación** (parte D de `medir-tiempos.mjs`): mismo nodo y mismo `top` del renglón antes y después; señal < 100 ms tras el toque;
  0 peticiones RSC de refresco al publicar; «Publicado» < 2 s después de `terminado_en`; toques reales en la app instalada del simulador; capturas
  390×844 de cada estado, también con `--letra=2`.
- **Archivos:** `src/app/admin/instagram/ListaInstagram.tsx`, `src/components/instagram/useAlDia.ts`, `src/components/instagram/HojaInstagram.tsx`,
  `src/components/ui/Renglon.tsx` + css, `src/components/ui/Hecho.tsx`, `src/components/ui/Girando.module.css`, `src/lib/redes/reglas.ts`
  (`REFRESCO_MS`). Sin migración.

## Por confirmar con el founder

1. Si falla, ¿basta con la frase en rojo y la hoja (como hoy), o quieres un botón «Reintentar» en el hueco de acción?
2. ¿«Publicado · hace un momento» o la hora exacta desde el primer momento?

## Evidencia

- Maquetas reales: `maqueta-pantalla.mjs` compiló la app contra el respaldo en 26 s y guardó `simple-ig-eventos` e `igc-hoja` (353 y 467 KB).
- `capturar-publicar-sin-recargar.mjs`: 13 capturas (12 estados a 390×844 ×2 y el armazón a 1440), `medicion.json` con el `top` del renglón en cada
  estado (300 px en los ocho estados de la lista; 500 en «Atrás pasado el minuto» porque el renglón ya está en otro grupo; 256 con letra grande,
  que lo centra para la captura), 0 errores de página. Cada captura abierta y mirada por el gestor.
- Sin código de la app: no aplica lint ni pruebas; el árbol del prototipo no tiene `.env`.
