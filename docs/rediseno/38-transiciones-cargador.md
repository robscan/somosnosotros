# 38 · Transiciones entre pantallas y cargador

**Pieza:** OL-144 / bitácora 179 (B5, renglón L46 de `docs/ops/COLA_DE_PIEZAS.md`). Solo prototipo y este documento: sin código de la app.

**Prototipo:** [`prototipos/transiciones.html`](prototipos/transiciones.html) — abrirlo en el teléfono (o con la ventana angosta) para ver los tres movimientos y el cargador. Tiene un botón «Ver cargador» para aislarlo, y una casilla «Simular “Reducir movimiento”» para probar sin cambiar el ajuste del sistema.

## El pedido del founder (L46)

> Necesitamos agregar animaciones de transición para mejorar la experiencia de consulta entre páginas/dominios principales y entre contenidos de dominio (tabs). También mejorar el cargador de contenido, actualmente es un letrero de cargando del lado izquierdo del sitio, mejor poner favicon centrado y parpadeando o algo así.

Cuatro piezas: transición entre secciones, transición entre pestañas, transición de listado a ficha, y el cargador.

## Qué transición va en cada caso

| Caso | Transición | Por qué esta y no otra |
| --- | --- | --- |
| **Secciones de la barra inferior** (Agenda ↔ Lugares ↔ Artistas) | **Fundido breve**, sin desplazamiento lateral. El contenido nuevo aparece con `opacity: 0 → 1`. | Las tres secciones no tienen una relación de orden entre sí (no es "la siguiente pantalla" ni "la anterior"): deslizarlas de lado sugeriría un orden que no existe y confundiría con la transición de listado→ficha, que sí es direccional. El fundido dice "cambiaste de tema" sin implicar dirección. |
| **Pestañas dentro de una sección** (Todos/Cercanos en Agenda; Lista/Mapa en Lugares) | **Deslizamiento corto** (18 px) en la dirección de la pestaña: si se toca la de la derecha, el contenido entra desde la derecha; si es la de la izquierda, desde la izquierda. | Las pestañas sí tienen un orden visible en la tira (Todos está a la izquierda de Cercanos): el deslizamiento confirma "avancé/retrocedí en la tira", igual que un carrusel. Es la misma idea que ya usa `ui/Pestanas` con el subrayado que se mueve; ahora el contenido lo acompaña. |
| **De listado a ficha** | La ficha **entra desde la derecha** cubriendo el listado; **Atrás la devuelve** deslizándola de vuelta a la derecha, sin recargar nada. | Es la convención ya establecida en `ui/Barra`/`ui/Atras` (regreso a la izquierda, como "retroceder") y coincide con el patrón de navegación jerárquica de iOS que el founder ya eligió para toda la app (ley de Jakob). Al volver no hay cargador: la memoria de pantalla (`useMemoriaPantalla`) ya tiene el listado con su scroll y su pestaña; solo se anima la posición. |

Cuando la ficha se abre por primera vez sí puede mediar un cargador breve (la ruta se está resolviendo en el servidor); al volver, no: los datos ya están en memoria del navegador.

## Duraciones

| Transición | Duración | Curva |
| --- | --- | --- |
| Fundido entre secciones | 200 ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` (salida rápida, llegada suave) |
| Deslizamiento entre pestañas | 200 ms | la misma curva |
| Listado → ficha (y su vuelta) | 220 ms | la misma curva |
| Pulso del cargador | 1.1 s, en bucle mientras dure la espera | `ease-in-out` |

Las tres transiciones de contenido caen dentro de los 150–250 ms pedidos: bastante para notarse, poco para sentirse lento (Doherty: por debajo de 400 ms se percibe como respuesta directa). Usan la misma curva para que la app se sienta de una sola pieza, no tres experimentos distintos.

## El cargador

Sustituye el letrero «Cargando…» de la izquierda por el **símbolo SN** (el mismo del favicon y del icono de instalación, `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`, línea gráfica firmada) **centrado**, con un pulso de opacidad y escala suaves (1 ↔ 0.42 de opacidad, 1 ↔ 0.94 de escala) en vez de "parpadeando" a secas: parpadear del todo (opacity 1↔0) es más agresivo y puede leerse como error o aviso; el pulso suave dice "estoy trabajando" sin gritar.

No lleva renglones ni bloques de esqueleto detrás: el pedido del founder es explícito ("mejor poner favicon centrado… en lugar del letrero"), y con solo el símbolo se cumple más rápido y con menos piezas que mantener. Donde hoy hay esqueletos con forma de lista (`CargandoRaiz`, para que la barra y la navegación no salten), el símbolo puede ir centrado en el hueco del contenido, dejando la cabecera y la navegación fijas como ya hacen — eso no cambia, solo el interior.

## Cómo se haría en Next App Router

**El cargador (`loading.tsx`):** no cambia el mecanismo, solo el componente. `src/app/loading.tsx` y los `loading.tsx` de cada sección ya usan React Suspense de forma automática (App Router muestra el `loading.tsx` más cercano mientras el segmento de la ruta carga). Solo hay que:
1. Cambiar `src/components/ui/Cargando.tsx` y `CargandoRaiz.tsx` para que, en vez de renglones + `<p>Cargando…</p>`, muestren el símbolo SN centrado y pulsando (un componente `SimboloCargando` reutilizable, SVG inline con `currentColor` para que seguir tomando el color de tinta).
2. Nada de JavaScript nuevo: sigue siendo Suspense; el pulso es solo CSS (`@keyframes`), como ya son los esqueletos actuales.

**Las transiciones entre secciones y de listado a ficha:** dos caminos posibles.

- **CSS en `template.tsx`** (el que usa este prototipo y el que se recomienda para empezar): cada segmento de ruta que deba animar su entrada define un `template.tsx` que envuelve a `children` en un `<div>` con una clase que dispara una animación de `opacity`/`transform`. A diferencia de `layout.tsx`, `template.tsx` se vuelve a montar en cada navegación, así que la animación se dispara cada vez — es justo lo que se necesita aquí. Ya existen `src/app/lugares/[id]/template.tsx` y `src/app/artistas/[id]/template.tsx`, pero hoy sirven para otra cosa (comparten el estado de un solo aviso entre la ficha y su lista de eventos, OL-057; revisado al escribir este documento, no animan nada): habría que sumarles la clase de entrada de la ficha ahí mismo, no crear un tercer envoltorio. Nada de bibliotecas nuevas.
- **View Transitions API** (`next/navigation`, disponible como `experimental.viewTransition` en versiones recientes de Next, o el `ViewTransition` de React 19 quien lo tenga): deja que el navegador anime automáticamente el cambio entre el DOM viejo y el nuevo, incluyendo casos que `template.tsx` no cubre bien (por ejemplo, que un elemento compartido —la foto de la tarjeta— vuele de un tamaño a otro entre el listado y la ficha, con `view-transition-name`). Es más vistoso pero:
  - Depende de que el navegador la soporte: Safari de iPhone (el que usa el founder para probar) la agregó apenas en iOS 18; hay que confirmar en qué versión del iPhone del founder se prueba antes de apostar todo a esto.
  - Es más difícil de depurar y de coordinar con `prefers-reduced-motion` (hay que envolver la llamada en la comprobación a mano).

**Recomendación:** empezar con `template.tsx` + CSS (lo que demuestra este prototipo) porque es lo que ya se usa en dos rutas de la app, no depende de soporte de navegador y es trivial de apagar con `prefers-reduced-motion`. Dejar la View Transitions API para una vuelta futura si el founder quiere el efecto de "la foto vuela" entre listado y ficha (eso sí lo pediría a propósito, no es parte de L46).

## Qué no se anima

- **La navegación inferior en sí** (los iconos, la píldora del activo): cambia de color al instante, sin fundido ni deslizamiento. Es un control, no contenido; animarlo compite con la transición del contenido y duplica el aviso de "cambiaste de sección".
- **El scroll al volver de una ficha** (memoria de pantalla): se repone de inmediato, sin animación de desplazamiento; solo la ficha se anima al cerrarse. Animar también el scroll sería redundante y más lento.
- **Los estados de error y los avisos** (`ui/Aviso`): entran y salen tal como ya están definidos (aparecen, no desaparecen solos); no se les suma la curva de estas transiciones porque no son "cambio de pantalla", son mensajes.
- **El primer contenido que carga la página** (la primera vez que se abre la app): no hay "fundido de entrada" en el primer render; eso es carga inicial, no una transición entre dos pantallas ya vistas.
- **Cualquier movimiento cuando `prefers-reduced-motion: reduce` está activo**: las tres transiciones se vuelven cambios instantáneos (sin `animation`/`transition`) y el pulso del cargador se queda en una opacidad fija (0.75) en vez de latir. Es la ley "el gesto de la persona gana" de `docs/PRINCIPIOS_UX.md`, no una opción a discutir.

## Riesgos (Safari iOS)

- **El "atrás" del navegador no es una entrada del historial, es un documento** (ver `docs/heredado` / nota de memoria "Atrás de Safari"): el gesto de borde y el botón "atrás" de Safari en iPhone navegan al documento anterior completo, no a un estado empujado con `pushState` dentro de la misma página. Esto ya lo sabe el enrutador de Next (usa entradas reales), así que la transición de "Atrás" en la ficha debe dispararse por el evento de navegación de Next (`usePathname` cambiando, como hace hoy `template.tsx`), nunca por escuchar `popstate` a mano esperando un estado intermedio que Safari no va a dar.
- **`prefers-reduced-motion` en modo bajo consumo:** iOS a veces activa una reducción de movimiento más agresiva cuando el teléfono está en Modo de bajo consumo; probarlo con y sin ese modo antes de dar la pieza por buena.
- **Animar `opacity`/`transform` es barato; animar cualquier otra propiedad (`width`, `top`, `filter`) no.** Mientras esta pieza se quede en las curvas y propiedades de este documento, Safari en un iPhone de gama media no debería tener tirones. Si más adelante se anima algo más (una foto compartida con View Transitions, por ejemplo), medir en el iPhone del founder antes de firmar.
- **View Transitions API**, si se adopta después, no está disponible en versiones viejas de Safari (llegó en iOS 18): el código debe comprobar `document.startViewTransition` antes de usarla y hacer el cambio normal si no existe, para no romper en un iPhone con una versión anterior.
- **El pulso del cargador con muchos re-renders:** si la sección tarda en de verdad resolver (red lenta), el `loading.tsx` de Next ya se queda montado todo el tiempo que haga falta — el pulso en bucle no tiene límite de repeticiones, así que no hay riesgo de que se "apague" antes de tiempo; solo hay que evitar que el símbolo cargue como imagen aparte (usar el SVG inline, como en este prototipo) para que no tenga su propio parpadeo de carga de red.

## Qué falta para pasar a código

1. Confirmar con el founder, viendo el prototipo en su iPhone (Safari), que el fundido, el deslizamiento y la entrada de la ficha se sienten bien a esas duraciones — es la prueba de esta pieza, antes de tocar código.
2. Sumar la clase de entrada de la ficha a `src/app/lugares/[id]/template.tsx` y `src/app/artistas/[id]/template.tsx` (hoy solo envuelven en `PantallaConAviso`), en vez de crear un tercer envoltorio.
3. Un componente `SimboloCargando` (SVG inline del símbolo SN + la animación de pulso) que reemplace el `<p>Cargando…</p>` en `Cargando.tsx` y `CargandoRaiz.tsx`.
4. `template.tsx` nuevo para el nivel de las tres secciones raíz (Agenda, Lugares, Artistas) que aplique el fundido; revisar que no choque con `useMemoriaPantalla` ni con el `scroll={false}` que ya usan los enlaces de pestañas.
