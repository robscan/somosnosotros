# 095 · El cartel, fuera del campo del nombre

**Fecha:** 2026-09-17 · **Rama:** `cartel-aparte` · **OL:** OL-064 · **PR:** pendiente

Dos partes en la misma pieza y el mismo PR: **prototipo firmado** (abajo) y **construido** (al final).

## Qué pidió el founder

2026-09-17, al ver el arreglo del toque de la cámara (bitácora [093](093-toques-en-el-alta-de-evento.md)): «con esa x el riesgo de error aumenta, te propongo sacar el accionable de capturar desde flyer (foto o galería) y ponerlo por separado. De hecho es una funcion estelar, pienso que hay que decirlo desde la descripción que se tiene esa super herramienta».

Gestión de cambios lo convirtió en pieza con prototipo antes que código y firma del founder antes de escribir la pantalla.

## Qué se hizo

- **Prototipo:** [`docs/rediseno/prototipos/cartel-aparte.html`](../../../rediseno/prototipos/cartel-aparte.html), con los tokens y las clases del canon. Seis pantallas de 390×844: la de hoy en producción para comparar, tres variantes y los tres estados de la recomendada (leyendo, leído, falló).
- **Documento:** [`docs/rediseno/22-cartel-aparte.md`](../../../rediseno/22-cartel-aparte.md), con los textos, los estados, qué cambiaría en el código y las tres cosas que falta decidir.

## La recomendación

**Variante A, la tarjeta arriba.** Es la única que cumple las dos cosas que pidió: saca el control del campo apretado *y* se anuncia sola. La B (el cartel como un renglón más del canon) lo saca del campo pero lo vuelve a esconder: queda debajo del nombre y con el mismo peso que Cuándo o Dónde.

Dato comprobado en el simulador que evita trabajo: **no hace falta ofrecer «foto o galería» como dos salidas**. El iPhone ya pregunta por su cuenta (*Photo Library · Take Photo · Choose File*) al tocar el campo de archivo.

## Lo que se vio al mirar el prototipo (disciplina front-visual)

Dos defectos que solo salieron mirando el render, no leyendo el código:

1. La barra fina de espera del estado «Leyendo» **no se veía**: era un `<span>` en línea, y la altura no aplica a un elemento en línea.
2. En el estado «No pude leerlo», el botón «Probar con otra foto» quedaba **pegado al final del texto rojo**, en la misma línea. Ahora va en su propio renglón.

Los dos corregidos y vueltos a mirar.

## Firmado el mismo día

El founder tomó la variante A y con ella dos recortes:

> «Tomo tu recomendación y no agregues más texto a la instrucción, el texto de la tarjeta ancha debe hacer ese trabajo. En el texto debajo de titulo de publicar evento, no digas que basta con nombre y lugar, que llene lo que quiera, no promovemos la creación de eventos incompletos».

Tres decisiones firmes, ya en el prototipo:

1. **Se va la frase de debajo del título** en el alta de evento. La pantalla queda título → tarjeta → formulario; la tarjeta es lo único que explica.
2. **Fuera la promesa de mínimos.** «Con el nombre y dónde basta. Lo demás ya está resuelto.» desaparece. La validación no cambia (se sigue pudiendo publicar con nombre y lugar: «que llene lo que quiera»), pero la pantalla ya no lo invita. «Duplicar evento» conserva su línea, que informa de otra cosa.
3. **Sin línea de separación.** Nada de «o escríbelo tú»: lo que separa los dos caminos es el aire, 24 px.

El prototipo se rehízo con eso y se volvió a mirar: la variante B se retiró (ya está decidido) y quedan la pantalla de hoy, para comparar, y los cuatro estados de la firmada.

---

# Construido

## Qué se escribió

- **`src/app/eventos/TarjetaCartel.tsx` (nuevo).** La tarjeta y sus cuatro estados. Todo el recuadro es el control: el campo de archivo lo cubre entero (348×88 de una tarjeta de 350×90, comprobado en el DOM), así el toque cae en él. Por la misma razón no lleva nada interactivo dentro: «Probar con otra foto» lo dice, pero quien recibe el toque es la tarjeta, y un `<button>` dentro de un `<label>` sería el mismo error de la bitácora 093.
- **`FormularioEvento.tsx`.** La cámara sale del campo del nombre. Un solo estado, `cartel`, lleva en qué va, qué decir y la foto subida; `subir()` ya no coloca el error, lo devuelve, y cada quien lo pinta donde la persona está mirando (el del cartel en la tarjeta, el de «Más» en «Más»).
- **`eventos/nuevo/page.tsx`.** Fuera la frase del alta. «Duplicar evento» conserva la suya.
- **`FormularioCanon.module.css`.** Nace `.cartel`; se retiran `.accionCampo` y `.conAccion`. Comprobado con grep que nadie más las usaba. `.sinIcono` **se queda**: la usa `HojaDondeEs`.
- **`Limpiar`.** Se retira la propiedad `desplazada` y su CSS: solo existía para hacerle sitio a la cámara dentro del campo. Nadie más la usaba.
- **`abrirConError.ts`.** El aviso se busca **dentro del formulario** y no en toda la página, como pidió gestión de cambios. Se le pasa el `formRef`, que ya existía en los tres formularios.

## Dos cosas que solo se vieron mirando la pantalla

1. **El error se decía dos veces.** La tarjeta ponía el titular «No pude leer el cartel» y debajo repetía «No pude leer el cartel. Llena los datos a mano.», porque el servidor mandaba el titular dentro del mensaje. Ahora el servidor manda solo lo que toca hacer.
2. **Fallar al subir no es fallar al leer.** Si la foto no llega a subirse, la tarjeta decía «No pude leer el cartel», que es mentira. Ahora ese caso tiene su propio titular, «No pude usar esa foto», y conserva el motivo real (por ejemplo, que pesa más de 5 MB).

## Verificado

- `npm run lint` (solo el aviso viejo de `iconos-sn.mjs`), `npm run typecheck`, **345 pruebas en 38 archivos**, `npm run build` en verde.
- **La prueba de marcado sigue pasando** (ningún `<label>` con dos campos dentro), y hubo que arreglar `renglones.test.ts`: buscaba `useAbrirConError(setMasAbierto` y ahora el formulario va primero. Se cambió por una expresión que no depende del orden de los argumentos; la prueba hizo su trabajo al fallar.
- **Prueba nueva** `src/lib/avisoALaVista.test.ts` para la regla pura que decide si hay que acercar el aviso. Que la búsqueda quede acotada al formulario no se puede probar en Node sin infraestructura de React: se comprobó en el navegador leyendo el DOM de la pantalla real.
- **Simulador FLOWYA iPhone SE (iOS 26.3), con el dedo, contra el respaldo local.** El toque cae en la tarjeta **en el centro y en la esquina de arriba a la izquierda**. Flujo completo: tocar la tarjeta → elegir foto de la galería → «Leyendo el cartel…» con su barra → formulario lleno (nombre, sáb 26 de sep · 20:00, el lugar, Trío Xochitl, $150) → publicar, y el evento se guarda con todo lo leído. Capturas de los cuatro estados a 375×667 y la de reposo a 390×844.
- **Teclado y foco:** la tarjeta es la tercera parada del tabulador (logotipo, cerrar, tarjeta, nombre), el foco se ve con su aro y el control se llama «Sube el cartel» / «Cambiar el cartel» / «Probar con otra foto» según el estado. El icono va con `aria-hidden`.
- **Compone bien con la pieza anterior (OL-063):** al publicar con una imagen que el servidor rechaza, «Más» se abre solo y la pantalla se mueve al aviso.

## Lo que el entorno de prueba no pudo dar

- **El estado «leído» necesitó instrumentación temporal.** El respaldo local no sabe hacer de modelo de visión (se intentó apuntando `ANTHROPIC_BASE_URL` al respaldo y el SDK no la tomó), así que se devolvió una lectura inventada detrás de una variable de entorno, se miró y **se retiró antes del commit**; comprobado con grep que no queda rastro.
- **La miniatura sale rota en las capturas** porque el respaldo no sirve imágenes de verdad; en producción la dirección es la que Storage acaba de aceptar.
- **Publicar con el cartel subido** pide una dirección `https` y el respaldo sirve por `http`, así que para cerrar el flujo se pegó una dirección de imagen válida. Es la misma limitación de la bitácora 094.

## Lo que sigue

`topes-de-campos` (OL-065, bitácora 096), avisando antes a gestión de cambios.
