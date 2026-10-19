# 452 · Gestos y capas: cuatro mecanismos que se comían toques o confirmaban sin querer (OL-419)

**Fecha:** 2026-10-19. **Rama:** `gestos-y-capas`, base `main` (`4f36b5e8`). **Operador:** agente de la pieza (Claude Opus 5.5) para el Gestor VII,
sin otros agentes. **Sin migración** y sin variables de entorno nuevas. **Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido

Founder, 14 de octubre, tras fallar un toque en las historias de su iPhone: «después de fallar el botón en historia, no me deja hacer scroll»,
«gravísimo error», «pide a codex que te ayude a encontrar errores, este y otros de este tipo». La revisión de Codex (privada, fuera del repo;
resumen público en la bitácora [446](446-revision-semana-12-18-oct.md)) encontró cuatro mecanismos de esa familia; el 19 de octubre el founder
aceptó la cola que los arregla juntos (punto 2 de la propuesta de la 446). Antecedente: OL-412, bitácora [443](443-historias-ficha.md).

## Qué cambió

1. **Historias: al tocar «Ver más información» la historia se va en ese momento** (`src/components/inicio/Historias.tsx`). El enlace lleva
   `onNavigate={salir}` en vez del `onClick` que solo quitaba `html[data-historia]`: `salir()` quita esa marca y además cierra la capa (deja de
   recibir toques al instante y se desmonta a los 200 ms), sin esperar a que llegue la ficha. Si la ficha tarda o no llega, Inicio responde y se
   desplaza. `onNavigate` solo avisa de una navegación dentro de la app: abrir el enlace en otra pestaña deja la historia abierta. Lo mismo para
   «Me interesa» sin sesión (lleva a Entrar). Se conserva lo de OL-412: la marca se quita en `salir()`, al desmontar y en `pagehide`.
2. **Una sola pila del fondo para las capas** (`src/lib/bloqueoFondo.ts`, nuevo, sin React). Cada capa se registra con su dueño (`useId`) y el
   elemento que pinta al final del body; solo la de arriba recibe toques y foco; del resto de hijos del body se recuerda el `inert` de antes y se
   repone cuando la pila se vacía, se cierren en el orden que sea (un `inert` ajeno se conserva; lo que llega al body con capas abiertas queda
   inerte). El desplazamiento se bloquea con `html[data-capas]` (regla junto a `html[data-historia]` en `globals.css`), un atributo y no un estilo
   en línea. La usan `ui/Hoja` (sustituye su pila propia, su contador de hojas y su `MutationObserver`) y `CapaMapa` (que ponía y quitaba `inert` y
   `overflow` por su cuenta). Escape y Tab los atiende solo la capa de arriba (`esCapaSuperior`): con el mapa encima de una hoja, Escape cierra el
   mapa y no la hoja. Las historias no entran: su bloqueo es su propio atributo (OL-412), que no lee ni repone el de nadie, y no conviven con hojas
   ni con el mapa (ver «Por confirmar»). El mando de la obra conserva su estilo en línea; las hojas y el mapa ya no lo pisan.
3. **Reordenar enlaces: cancelar no confirma** (`src/components/SelectorEnlaces.tsx`). `pointercancel` llama a `cancelarArrastre` (los renglones
   vuelven a su puesto y el orden queda como estaba); el nuevo orden se confirma solo en `pointerup`. No hay `pointerleave` (Safari táctil lo
   dispara con el dedo aún puesto).
4. **Historias: con el dedo sobre un control el avance espera.** Un puntero abajo sobre un enlace o un botón de la historia («Ver más información»,
   la ✕, «Me interesa», «Cómo llegar») pausa la barra sin capturar el puntero (su clic llega); al soltarlo, la barra sigue cuando llega su clic o,
   si no llega (el dedo salió del control), a los 300 ms; si el navegador cancela el toque, sigue en ese momento. La foto ya pausaba al
   mantenerla. En la última historia una pulsación larga ya no la cierra antes del clic y, en las demás, la historia no cambia bajo el dedo (el
   clic abre la que se ve). La barra también queda quieta mientras la historia entra y se va: al irse por un enlace ninguna otra cuenta como vista.
   **Lo que enseñó el simulador:** en Safari de iPhone, mantener el dedo sobre «Ver más información» levantaba el enlace para arrastrarlo
   (`sim-01`): el sistema se queda el toque (`pointercancel`), la historia sigue sola bajo el dedo y al soltar no hay clic. Con
   `-webkit-user-drag: none` en los enlaces de la historia (`Historias.module.css`, `.acciones a`) ya no se levanta: la historia espera mientras
   el dedo sigue abajo (`sim-02`, siete segundos sobre la última sin que se cierre) y una pulsación de 0,6 s abre la ficha (`sim-03`).

## Pruebas

- **Nuevas:** `src/lib/bloqueoFondo.test.ts` (6, la pila con fakes: mapa→hoja cerrando en los dos órdenes, el portal que sale del body antes de
  darse de baja, `inert` ajeno y tardío, dueño repetido o desconocido); `src/components/CapasFondo.componentes.test.mjs` (3, `CapaMapa` y
  `ui/Hoja` reales: cerrar mapa y luego hoja, hoja y luego mapa, y Escape solo en la de arriba; al final, toque real sobre la ficha y página que se
  desplaza); `src/components/inicio/HistoriasGestos.componentes.test.mjs` (4: la capa suelta toques y desplazamiento al tocar el enlace con la
  navegación pendiente para siempre, y tras eso un toque y un arrastre del dedo sobre Inicio funcionan; pulsación larga en la última historia;
  dedo sobre el enlace al final de una historia; toque cancelado sobre la ✕); `src/components/SelectorEnlaces.componentes.test.mjs` (2: un
  `touchCancel` real conserva el orden, un `touchEnd` lo confirma). Toques reales por coordenadas (CDP o `touchscreen`), mirando antes con
  `elementFromPoint` qué hay en el punto; ningún `element.click()`.
- **Fallan con el código de `main`** (se cambió el archivo por el de `origin/main` y se volvió a poner): las 3 de capas, las 4 de historias y la de
  cancelar el arrastre (la de soltar pasa en las dos, como debe).
- Las de componentes que ya había de `ui/Hoja`, `CapaMapa`, `FilaAhora` e `HistoriasZoom` (31) pasan sin cambios; en `FilaAhora` e
  `HistoriasZoom` el `Link` de prueba solo deja de pasar `onNavigate` al `<a>`.
- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, `npm test` (4 027),
  `npm run inventario` (sin novedades), `npm run medir` (41 pantallas × 4 anchos, sin novedades; corrido otra vez tras la regla de
  `.acciones a`). `npm run test:componentes` completo: 630 de 631; la que falló («OL-365: «Ver el evento»…», `AltaEvento`, no toca nada de
  esta pieza) pasa sola: es inestable con la suite entera en paralelo.

## Evidencia en la app (capturas-452)

`scripts/ops/auditoria-ui/capturar-gestos-capas.mjs` (nuevo, en el patrón de los `capturar-*.mjs`): la app compilada contra el respaldo local,
árbol sin `.env`, Chrome real a 390×844 y 2×, con la sesión de Ana del respaldo y toques táctiles por coordenadas mirando antes qué hay en el punto.

- `01-historia-ver-mas-informacion.png`: la historia del concierto de hoy con «Ver más información», «Me interesa» y «Cómo llegar».
- `02-inicio-con-la-ficha-pendiente.png`: el script retiene toda petición a `/eventos/…`; al tocar «Ver más información», en ese mismo momento:
  la dirección sigue en `/`, la capa ya no está abierta, sin `data-historia`, desplazamiento `visible` y en el centro de la pantalla está
  Inicio, no la historia. Con la ficha aún pendiente, un arrastre del dedo desplaza Inicio (de 0 a 571 px): es la captura.
- `03-ficha-tras-el-boton.png`: al soltar la retención llega la ficha del concierto, que se desplaza con el dedo (de 0 a 399 px).
- `04-mapa-pantalla-completa.png`: la ficha de Teatro de la Paz con su mapa a pantalla completa (estilo vacío del respaldo, un pin): 28 hijos
  del body inertes y `html[data-capas]`. Al cerrarlo con la ✕: 0 inertes, sin `data-capas`, desplazamiento `visible`.
- `05-hoja-sobre-la-ficha.png`: la hoja «¿Es tu espacio?» sobre la misma ficha (fondo inerte y quieto). Al cerrarla, igual que el mapa.
- `06-ficha-libre-tras-cerrar.png`: tras cerrar el mapa y la hoja, la ficha se desplaza con el dedo (de 0 a 405 px).

**Simulador** (iPhone 17, iOS 27, Safari, por su UDID; estaba apagado y se volvió a apagar al terminar), con la app compilada contra el respaldo
local y el reloj real para que salga «Lo de hoy»; sin sesión. Capturas a 3×:

- `sim-01-antes-pulsacion-larga-levanta-el-enlace.png`: antes de la regla de `.acciones a`, mantener el dedo sobre «Ver más información» lo
  levantaba para arrastrarlo y la historia pasaba a la siguiente.
- `sim-02-ultima-historia-tras-7-s-de-pulsacion.png`: con la regla, siete segundos sobre «Ver más información» en la última historia (más que
  su segmento de 6 s): sigue abierta, sin levantar el enlace. Al soltar no hubo clic (una pulsación tan larga no es un toque para Safari) y la
  historia siguió su curso.
- `sim-03-ficha-tras-pulsar-0-6-s.png`: una pulsación de 0,6 s sobre «Ver más información» abre la ficha, que se desplaza con el dedo.
- `sim-04-mapa-abierto.png` y `sim-05-tras-cerrar-el-mapa-se-desplaza.png`: el mapa a pantalla completa de la ficha de un sitio y, al cerrarlo
  con la ✕, la ficha se desplaza. La hoja «¿Es tu espacio?» y el arrastre de enlaces piden sesión y no se probaron en el simulador.
- La navegación pendiente no se pudo retener en Safari del simulador (no hay cómo detener una petición): queda probada en Chrome (arriba y en
  la prueba de componentes).

## Por confirmar

- **Las historias fuera de la pila común.** Siguen con su `html[data-historia]` y sin `inert` en el fondo (el foco ya no sale con Tab y la capa
  es `aria-modal`). Meterlas en la pila sería más uniforme pero toca otra vez el camino que falló en el iPhone del founder; se puede hacer en una
  pieza aparte si el gestor lo prefiere.
- **El agarre de enlaces solo atiende `pointerup` y `pointercancel`.** No se añadió `lostpointercapture`: dependería de que todos los navegadores
  lo manden después de `pointerup`, o el orden nuevo nunca se confirmaría.
- **La espera de 300 ms** tras soltar un control sin clic es una cifra elegida (la del toque corto); no se nota y evita que la barra acabe entre el
  `pointerup` y el clic.
- **Una pulsación muy larga sobre «Ver más información» no abre la ficha en Safari** (siete segundos en el simulador: sin clic). Es como Safari
  trata cualquier enlace; abrirla «a mano» al soltar sería una segunda navegación sin evidencia de que haga falta. Con 0,6 s sí abre.
- **El resto de enlaces de la app** se siguen levantando con una pulsación larga en Safari (es lo normal de iOS); solo se quitó en la historia,
  donde el avance automático lo volvía un fallo.

## Para el founder

Lo que debería notar en su iPhone: al tocar «Ver más información» la historia se va al instante aunque la ficha tarde, y mantener el dedo sobre
el botón ya no deja que la historia se cierre o cambie debajo. Lo demás (mapa y hojas, reordenar enlaces) son fallos que no había visto: no
cambian nada a la vista.
