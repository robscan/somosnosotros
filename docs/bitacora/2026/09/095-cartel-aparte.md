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

---

# Revisión adversarial: cinco arreglos

Gestión de cambios corrió una revisión de dos lentes con el componente real. Refutó cinco sospechas (elegir la misma foto otra vez, el orden del tabulador, el párrafo «Subiendo…», quedarse sin frase si falta la llave, y la pastilla que «engañaría») y confirmó que el toque no tiene puntos muertos en los cinco estados. Quedaron cinco cosas, dos importantes, y **las dos importantes eran mías**.

## 1. La tarjeta se quedaba colgada para siempre (importante)

Si la promesa de la lectura se rompía —se cae la señal, un 504, la función se agota— la tarjeta se quedaba en «Leyendo el cartel… No cierres la pantalla» con la barrita girando, sin salida y sin nada que hacer más que recargar. Y si lo que se rompía era la subida, `subiendo` se quedaba en `true`: el cartel, «Más» y el botón de publicar, apagados.

**Esto no pasaba en `main`**, y lo rompí yo al mudar el estado: antes ese texto lo pintaba `{leyendo && …}` y el `finally` lo borraba; al pasar el estado a la tarjeta, el `finally` ya no lo alcanzaba.

Arreglo: todo el cuerpo de `leerCartel` dentro de un `try`, con un `catch` que deja la tarjeta en fallo con un motivo honesto («Se cortó a la mitad · Revisa tu conexión y prueba otra vez») y un `finally` que apaga `leyendo`; y `subir()` con su propio `try/finally`, así **no lanza nunca y siempre apaga «Subiendo…»**.

**Comprobado de verdad, no razonado:** con la pantalla cargada en el simulador se tiró el servidor de desarrollo y se subió un cartel. La subida funciona (va al respaldo local) y la lectura se rompe. Antes: girando para siempre. Ahora: «Se cortó a la mitad», con la foto conservada y la salida para reintentar. Captura en la pieza.

## 2. Revivía OL-063, lo que acabábamos de arreglar (importante)

Al repartir los errores por donde mira la persona, se me cayó el `setErrorImagen(null)` del principio de `subir()`, que en `main` sí estaba. Con un aviso viejo pegado, `useAbrirConError` ya no vuelve a dispararse (el error nunca pasa de «no hay» a «hay»), así que el renglón «Más» deja de abrirse solo: exactamente el bug de la bitácora 094. Repuesto.

**Prueba nueva con control negativo** en `renglones.test.ts`: todo aviso propio que abra un renglón tiene que limpiarse al reintentar. Sin el arreglo falla señalando `"errorImagen" abre un renglón y nunca se limpia`. Los otros dos formularios ya cumplían la regla; ahora está escrita.

## 3, 4 y 5

- **El fallo de subida se decía dos y tres veces.** «No pude usar esa foto» + «No se pudo subir la imagen. Intenta con otra.» `subirFoto` ahora devuelve también **por qué** falló (`motivo: "pesa" | "subida"`), sin cambiar su `error`, que los otros dos formularios siguen usando tal cual. Con eso la tarjeta escribe el motivo cuando lo hay («La imagen pesa más de 5 MB. Elige otra.») y lo que toca hacer cuando no («Intenta con otra foto.»), bajo un titular que ya dice que falló.
- **Se perdía la miniatura.** Si ya había un cartel leído y la segunda foto no subía, la tarjeta se quedaba sin foto aunque el formulario conservara la imagen anterior. Ahora la conserva y lo dice: «El cartel de antes se queda».
- **El lector de pantalla no oía el titular.** El `role="status"` solo envolvía el detalle, así que «Leí el cartel» y «No pude…» nunca se anunciaban. Ahora la región viva incluye titular y detalle, con el texto en un solo bloque (la rejilla de la tarjeta pasa de cuatro áreas a dos columnas: más plana y una sola cosa que mover).

## Pruebas nuevas

`src/lib/estadoCartel.test.ts`: las transiciones de la tarjeta salieron del componente a `src/app/eventos/estadoCartel.ts` para poder probarlas. Cubren el corte a mitad, que el fallo de subida no repita el titular, y que la foto anterior sobreviva. **352 pruebas en 39 archivos**, con lint, tipos y build en verde.

## Lo que sigue

`topes-de-campos` (OL-065, bitácora 096), avisando antes a gestión de cambios. Antes va `tope-de-lecturas` (OL-067, bitácora 098), que pidió el founder.
