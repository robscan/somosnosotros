# 325 · Canon de los campos por completar: punteado con aire, solo lo obligatorio y renglones sin clave

**Pieza:** OL-297. **Rama:** `canon-pendientes` sobre `origin/main`. **Fecha:** 2026-10-05.
**Estado:** dos vueltas con el founder; la rama sube a `origin/canon-pendientes` (PR #371). **Manda la «Segunda vuelta» (al final)**: lo escrito antes de ella es la primera vuelta (línea violeta de 2 px) y quedó sustituido en lo que la segunda contradice.

## Palabras del founder

Al revisar un prototipo (2026-10-05): «la linea punteada mas acentuada, se ve casi continua pues son pequeños los espacios, además de que puedes colorearla de color accionable, lo mismo que el texto para que se resalte, esto último aplícalo al canon de esos campos por completar por favor».

Corrección posterior, con el trabajo recién empezado: «no me gusta que pintaste todos los elementos del campo vacio de morado… solo linea y texto Falta elegir y elegir. No "Cartel" ni icono.» Vale esta segunda versión: en un renglón pendiente solo van en el violeta de acción (`--primario`, `#6d34c8`) la línea punteada de 2 px, el valor («Falta», «Sin foto»…) y la acción de la derecha; la clave en mayúsculas chicas y el icono siguen grises. En el campo de nombre vacío, solo el borde; placeholder y lupa siguen grises.

## Qué cambió (solo CSS, más una aserción de prueba)

- `src/components/ui/Renglon.module.css`: `.pendiente` pasa de `border-style: dashed` (1 px gris) a `border: 2px dashed var(--primario)`, y `.pendiente > .falta` (el valor) a `var(--primario)`. El relleno del renglón (`.resuelto`) se parte en dos propiedades personalizadas (`--relleno-y: 10px`, `--relleno-x: 14px`, los mismos números de antes) y `.pendiente` descuenta 1 px (`calc(var(--relleno-y) - 1px)`): la caja mide lo mismo y el texto no se mueve. La acción de la derecha cuando es un `Boton` de texto («Agregar», «Cambiar») ya era `--primario`, así que no se tocó; cuando es un `BotonIcono` de contorno (Estoy aquí, la lupa, la cámara) lleva el glifo en tinta y el borde gris, y tampoco se tocó (ver Riesgos).
- `src/components/ui/FormularioCanon.module.css`: `.campoFalta > input` pasa a `border: 2px dashed` en `--primario`, con el relleno lateral descontado (`--relleno-ini: 44px` y `--relleno-fin: 14px`, ahora propiedades de `.campo > input`). Dos reglas: la del grosor y el relleno vale con el campo sin `aria-invalid="true"`; el color violeta, además, sin foco (con foco queda el borde de tinta de siempre, como antes). Un campo con error sigue en rojo y de 1 px sólido: el error gana si coinciden.
- `src/components/ui/Renglon.componentes.test.mjs`: la prueba «resuelto…» ahora comprueba 2 px, el violeta del borde, del valor y de la acción, el gris de la clave y del icono, y que el renglón pendiente mide y coloca el texto igual que uno resuelto.
- `docs/diseno/LINEA_GRAFICA.md` (la regla del renglón `resuelto`): se añade la regla nueva con fecha, sin borrar la anterior.

## Sitios revisados (grep de `dashed` en `src`)

Cambian (campos por completar):

1. `ui/Renglon.module.css` `.pendiente`: lo usan el alta de evento (Dónde, Quién, Más), el alta de lugar (Dónde, Más), el alta de artista (Foto, Portada, Más) y Editar perfil (Foto) mediante `renglon.pendiente`; ningún formulario lo repite por su cuenta.
2. `ui/FormularioCanon.module.css` `.campoFalta > input`: lo usa solo el nombre del alta de evento (el alta de lugar y la de artista no marcan su nombre vacío con esa clase; no se tocó).

No cambian (son otra cosa):

3. `FormularioCanon.module.css` `.cartelPedida` (`border-style: dashed`): la tarjeta del cartel cuando el cupo ya se pidió y no hace nada; no es un campo por completar.
4. `HojaDonde.module.css` `.nombreEditable` (`1.5px dashed var(--primario)` solo abajo): el nombre editable bajo el pin, ya en el color de acción y con otro propósito.
5. Otros valores «Falta» (`renglon.falta`) fuera de un renglón pendiente (Cuándo sin fecha, «Sobre ti: Falta» en Editar perfil, «Por el nombre» de Tipo y de Qué hace) quedan en gris: el founder pidió el cambio para el estado pendiente, y esos renglones no llevan `.pendiente`.

## Medidas antes y después

Respaldo local con datos inventados (puertos 8851 y 3151, no 3100 ni 8842), Chrome de la Mac en modo sin ventana, 390×844 y 320×640 a doble densidad, Bricolage Grotesque cargada en las diez corridas (`document.fonts`: «Bricolage Grotesque loaded»), 0 errores de página, sin desplazamiento horizontal. «Antes» es la compilación de `origin/main` y «después» la de esta rama. Se midieron 58 filas visibles (renglones y campo de nombre) en las cinco pantallas (alta de evento, la misma tras tocar «Publicar», alta de lugar, alta de artista y Editar perfil) a los dos anchos:

- Alto de cada renglón: idéntico. 66 en todos los pendientes a 390; a 320, «Más» del evento y del lugar mide 82,38 en ambas corridas (el valor ocupa dos líneas). El campo de nombre mide 48 en ambas.
- Posición vertical de cada fila, posición horizontal del icono (35) y del valor (71) y alto de la página (844, 683, 640, 816): idénticos. **0 de 58 filas con diferencia de caja.**
- Borde: de `1px dashed rgb(220, 220, 216)` a `2px dashed rgb(109, 52, 200)`; el valor «Falta»/«Sin foto» de `rgb(92, 92, 92)` a `rgb(109, 52, 200)`; clave e icono siguen en `rgb(92, 92, 92)`. Relleno del campo de nombre: de 14 y 44 a 13 y 43 (más el borde de 2: el texto queda en el mismo sitio).
- Contraste del violeta `#6d34c8` sobre blanco: 7,06 a 1 (pasa AA y AAA para texto normal).
- Tocar «Publicar» sin datos no hace nada visible (el botón va apagado y la nota ya dice qué falta): la captura es igual a la de recién abierto, como debe.
- El error rojo: en la vida real solo sale tras un rechazo del servidor, que con el formulario incompleto no ocurre (el botón no envía). Se simuló en el DOM: el campo con `aria-invalid="true"` queda `rgb(179, 38, 30)` de 1 px sólido, y una nota `role="alert"` bajo Dónde sigue en `rgb(179, 38, 30)`. El borde del renglón Dónde sigue sin ponerse rojo (no lo hacía antes tampoco: el rojo del renglón es solo su nota).

## Capturas de la primera vuelta

Solo se conservan las de «antes» (la compilación de `origin/main`), que son la base de la segunda vuelta; las de «después» de esta vuelta (violeta de 2 px) se reemplazaron por las de la segunda.

- `antes-evento-390.png`, `antes-evento-320.png`: alta de evento recién abierta; nombre vacío, Dónde, Quién y Más con punteado gris de 1 px, casi una línea continua, valores en gris; Cambiar, Agregar y los dos botones redondos como siempre.
- `antes-lugar-390.png`: alta de lugar con Dónde y Más pendientes; el nombre lleva el borde de tinta del foco (el campo lo recibe al abrir).
- `antes-artista-390.png`: alta de artista con Foto, Portada y Más pendientes y «Soy yo / es mi grupo» resuelto.
- `antes-editar-perfil-390.png`: Editar perfil con Foto pendiente y «Sobre ti: Falta» gris.

## Pruebas

- `npm run lint`: 0 errores (un aviso previo en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: sin errores.
- Componentes: `Renglon.componentes.test.mjs` 9/9 (con la aserción nueva), `cupo` y `guardado` del alta de evento 15/15.
- `npm run inventario`: sin novedades; medidas en duro 344 (igual que lo aceptado; 2 px no cuenta y los 10, 14, 44 pasaron de una declaración a otra sin sumar).
- `npm run medir -- --solo=alta`: sin novedades (s03, s07 y s11 a 320, 390, 820 y 1280; mismos nodos y profundidad).

## Riesgos y notas

- El valor de los renglones opcionales pendientes («Sin artista», «Descripción, enlace, foto», «Redes, descripción») también se pone violeta, porque comparten `.pendiente > .falta`. Si el founder prefiere que solo lo obligatorio («Falta») lleve color, se separa con una clase propia; hoy se siguió su frase «el valor» sin distinguir.
- Las acciones de icono de los renglones pendientes (Dónde: «Estoy aquí» y la lupa; Foto y Portada: la cámara) son botones de contorno con el glifo en tinta y el borde gris: no son violeta y no se tocaron, porque la corrección del founder hablaba de acciones de texto («Elegir», «Poner»). Si quiere también el glifo violeta, es una línea más en `.pendiente`; decide él.
- Enfocado, el campo de nombre vacío sigue mostrando su punteado de 2 px en tinta (antes, 1 px), no en violeta.

## Segunda vuelta (2026-10-05)

### Palabras del founder y del gestor

- Sobre la captura `despues-evento-390.png` de la primera vuelta: «ok, solo deja en morado elegir y la linea, disminuye grosor, pero aumenta el espacio en blanco entre lineas punteadas» y «con elegir quise decir el accionable». Su «ok» acepta dos propuestas del gestor: que solo lo obligatorio lleve el tratamiento (los opcionales vuelven al punteado gris fino) y que los renglones de las tres altas no muestren su clave.
- Después, con la vuelta a medias: «la linea punteada es agresiva visualmente en ese color, regresemos al color que usabas antes».
- Decisión final: «vamos con opción 2 por favor para campos faltantes, actualiza el canon cuando publiquemos». La opción 2 de su muestrario (`opciones-aire.png`, «Guion 4, aire 5») es gris `--texto-suave` (#5c5c5c), 1 px visible, guion de 4 y aire de 5, con el radio del renglón; acción de la derecha en violeta, valor en tinta, icono gris; opcionales con el punteado gris de siempre.

### Qué cambió

1. **La línea** (`src/components/ui/LineaPorCompletar.module.css`, nuevo): 1 px visible, guion de 4 y aire de 5 (la opción 2 del founder), siguiendo el radio de 8. Es un pseudo-elemento `::after` con `background` de color y una máscara SVG (`mask` y `-webkit-mask`) con un `<rect>` de `stroke-width: 2` y `stroke-dasharray: 4 5` recortado por el borde. La máscara es el token `--linea-por-completar` de `globals.css` (los tokens son el sitio de las medidas en duro). **Para cambiarla hay dos sitios y solo dos**: el color, en la declaración `background` de esa hoja (hoy `var(--texto-suave)`; para volver al violeta, `var(--primario)`), y el grosor, los guiones y el aire en la máscara (`stroke-width` es el doble del grosor visible; `stroke-dasharray`, guion y aire). Los dos módulos la usan con `composes`, sin duplicar reglas.
2. **Por completar y obligatorio** (`Renglon.pendiente`): el borde propio pasa a transparente (la caja no cambia) y la línea la pone el pseudo-elemento; el valor («Falta el lugar») vuelve a tinta como uno resuelto; la acción de la derecha («Agregar», «Cambiar», «Elegir»…) sigue en violeta, que ya lo era; clave e icono, en gris. En el alta de evento lo es «Dónde» (y «Cuándo» si faltara la fecha), en el de lugar «Dónde». El campo de nombre vacío del alta de evento (`campoFalta`) lleva la misma línea y su borde propio, transparente; al enfocarlo la línea se va y queda el borde de tinta de siempre.
3. **Opcional** (`Renglon.opcional`, nueva, una sola declaración): el punteado gris de 1 px de `main` (`--borde`) y el valor en gris. Lo llevan «Quién» y «Más» del evento, «Más» del lugar, Foto, Portada y «Más» del artista, y la Foto de Editar perfil (que así queda idéntica a `main`).
4. **Sin clave a la vista** (`Renglon.sinClave`, nueva): icono | valor | acción, de `--toque` (48) de alto mínimo; la clave sale de la vista y del flujo (misma técnica que `ui/SoloLector`, escrita sin `padding` ni `border` para no repetir su bloque en el inventario) pero sigue en el árbol de accesibilidad como texto del renglón. Se aplica a los renglones de las tres altas (evento, lugar y artista, que también sirven para editarlos); Editar perfil y las demás pantallas no lo llevan.
5. Textos reescritos para que se entiendan sin su clave (todos los demás quedan igual):

| Dónde | Antes | Después |
| --- | --- | --- |
| Evento · Dónde (vacío) | Falta | Falta el lugar |
| Evento · Cuándo (sin fecha) | Falta | Falta la fecha |
| Evento · Más | Descripción, enlace, foto (o imagen) | Más detalles |
| Lugar · Dónde (vacío) | Falta | Sin ubicación |
| Lugar · Tipo (sin nombre escrito) | Por el nombre, con «Cambiar» | Tipo de lugar, en gris, con «Elegir» |
| Lugar · Tipo (con nombre: deducido o elegido) | Museo, con «Cambiar» | Museo (el valor mismo, en tinta), con «Cambiar»; igual que antes |
| Lugar · Más | Descripción, redes, foto | Más detalles |
| Artista · Qué hace (sin nombre escrito) | Por el nombre, con «Cambiar» | Disciplina, en gris, con «Elegir» |
| Artista · Qué hace (con nombre: deducido o elegido) | Música, con «Cambiar» | Música (el valor mismo, en tinta), con «Cambiar»; igual que antes |
| Artista · Foto | Sin foto | Sin foto de perfil |
| Artista · Foto (subiendo) | Subiendo… | Subiendo la foto… |
| Artista · Foto (puesta) | Lista | Foto de perfil lista |
| Artista · Portada (subiendo) | Subiendo… | Subiendo la portada… |
| Artista · Portada (puesta) | Lista | Portada lista |
| Artista · Soy yo / es mi grupo (apagado) | No | Soy yo / es mi grupo |
| Artista · Soy yo / es mi grupo (encendido) | Sí: podrás editar la ficha y publicar sus fechas | Es mi ficha: podrás editar y publicar sus fechas |

Quedan igual por explicarse solos: «Hoy · 19:00» y las demás fechas, el lugar elegido o su dirección, «Sin artista», los nombres de artistas, «Gratis», «Con costo», «Redes, descripción», «Solista» y demás tipos, y la ciudad.

### Medidas antes (`main`) y después (a 390 y 320, Chrome; WebKit coincide)

Compilación contra el respaldo local (puertos 8851 y 3151), Bricolage Grotesque cargada, 0 errores de página.

- Altura de los renglones de las tres altas: de 66 a **48** cada uno («Soy yo / es mi grupo», con la palanca de 45, de 67 a 49). A 320, los que envolvían su valor en dos líneas («Más», 82,38) también miden 48 con el valor en una línea; en el alta de lugar, a 320, «Falta dónde está» y «Tipo según el nombre» envuelven en dos líneas y crecen (se ve en la captura).
- Alto de la página completa: alta de evento 844 a 844 (390) y 683 a 640 (320); alta de artista 844 a 844 y 816 a 690; alta de lugar 844 a 844 y 640 a 640 (el alto mínimo de la ventana manda).
- Campo del nombre: 48 y 48, relleno `0 14 0 44` antes y después (la primera vuelta lo había cambiado; ahora no se toca), borde propio transparente con la línea encima.
- **Editar perfil: idéntico a `main`** (alto, posición, texto, borde y color de cada renglón; 0 diferencias a 390 y a 320).
- Sin desborde en Chrome en ninguna pantalla. En WebKit, la alta de artista y Editar perfil (que no tocamos) dan un `scrollWidth` de 437 en una ventana de 390, sin un solo elemento fuera de ella: es una peculiaridad previa de WebKit con los campos de archivo, no del cambio (la alta de evento sale en 390).
- La máscara se pinta en Chromium y en WebKit (el motor de Safari): las dos capturas muestran la misma línea punteada.
- El error rojo sigue ganando (simulación en el DOM, como en la primera vuelta; el formulario quita `campoFalta` cuando hay error de nombre): campo con `aria-invalid` en `rgb(179, 38, 30)`, 1 px sólido, sin línea; nota de alerta bajo Dónde en el mismo rojo.

### Capturas de la segunda vuelta (`docs/rediseno/capturas-325/`, todas abiertas y miradas)

- `despues-evento-390.png`, `despues-evento-320.png`: alta de evento recién abierta. El nombre vacío y «Dónde: Falta el lugar» llevan la línea gris punteada de 1 px con guion de 4 y aire de 5; «Falta el lugar» en tinta, los botones redondos de siempre; «Cuándo» y «Cuánto» sin cambio de borde; «Sin artista» y «Descripción, enlace, foto» con el punteado fino y claro de antes, en gris; ninguna clave en mayúsculas; filas de 48. A 320 «Descripción, enlace, foto» envuelve en dos líneas y la fila no crece.
- `despues-evento-publicar-390.png`, `despues-evento-publicar-320.png`: tras tocar «Publicar evento» sin datos; igual que la anterior (el botón no envía).
- `despues-evento-error-simulado-390.png`, `despues-evento-error-simulado-320.png`: nombre en rojo sólido sin línea y nota roja «Elige dónde es el evento.» bajo «Falta el lugar», dentro del renglón con la línea gris (la nota en rojo, la línea no).
- `despues-recorte-linea-390.png`: acercamiento de la línea a 2x, para juzgar a ojo el guion y su aire.
- `despues-webkit-evento-390.png`, `despues-webkit-artista-390.png`: las mismas pantallas en WebKit; la línea se pinta igual (la segunda sale más ancha por el desplazamiento horizontal previo de WebKit explicado arriba).
- `despues-lugar-390.png`, `despues-lugar-320.png`: alta de lugar; «Falta dónde está» con la línea gris y botones; «Tipo según el nombre» resuelto; «Descripción, redes, foto» opcional. A 320, los dos primeros valores envuelven en dos líneas.
- `despues-artista-390.png`, `despues-artista-320.png`: alta de artista; «Disciplina según el nombre», «Solista» y «San Luis Potosí» resueltos; «Sin foto de perfil», «Sin portada» y «Redes, descripción» opcionales con el punteado fino; «Soy yo / es mi grupo» con su palanca. (En la de 320 la barra inferior de la captura de página completa tapa un tramo.)
- `despues-editar-perfil-390.png`, `despues-editar-perfil-320.png`: Editar perfil, con su clave en mayúsculas y la foto con el punteado fino gris, igual que en `main`. A 320 el botón «Atrás» se ve acortado («At…»): lo dibuja la cabecera, que esta pieza no toca.

### Pruebas

- `npm run lint`: 0 errores (el aviso previo de `VisorImagen`). `npm run typecheck`: limpio. `npm test`: 1991 pruebas de 140 archivos.
- Componentes: `Renglon.componentes.test.mjs` (9; ahora comprueba la línea gris con máscara, el borde transparente, el valor en tinta, la acción violeta, el opcional gris de 1 px y los 48 de alto sin clave), `cupo`, `guardado`, `guardiaTrasError` y `SalirSinPublicar`: 34 de 34.
- `npm run inventario`: sin novedades (344 medidas en duro y 2 bloques duplicados, iguales a lo aceptado; la primera versión de la clave oculta repetía el bloque de `SoloLector` y un margen negativo sumaba una medida: se reescribieron). `npm run medir -- --solo=alta` y `--solo=editar`: sin novedades; los nodos no cambian (la línea es un pseudo-elemento), así que no hay presupuesto que aceptar ni que bajar.
- Antes de esta vuelta se unió `origin/main` (PR #368 y #369) a la rama; `OPEN_LOOPS.md` se resolvió con `resolver_ol.py` más una comprobación: ninguna línea de `main` falta y la cabecera conserva su cadena sin trozos nuevos repetidos.

### ¿Se distinguen el obligatorio y el opcional?

Sí, a simple vista, aunque por contraste y no por dibujo: el obligatorio es 1 px de `#5c5c5c` con guion de 4 y aire de 5 (la misma línea de la celda 2 del muestrario, comparada contra `despues-recorte-linea-390.png`), y el opcional es el punteado nativo de 1 px de `#dcdcd8`, casi blanco. En `despues-evento-390.png` «Dónde: Falta el lugar» y el nombre vacío se leen como bordes oscuros y «Sin artista» y «Descripción, enlace, foto» como bordes pálidos; no se confunden. Lo que sí se parece es el ritmo de los guiones (los dos son rayas cortas con huecos), así que la diferencia depende del gris: en una pantalla con poco brillo o a pleno sol, el opcional casi desaparece y el obligatorio sigue visible, que es justo lo que se busca. Si el founder quisiera más distancia, el opcional podría ir con puntos (`dotted`) en vez de rayas; no se hizo porque pidió el punteado de siempre.

### Dudas

- **Gris elegido:** «el color de antes» pudo ser `--borde` (el punteado muy claro de `main`) o `--texto-suave`. Se eligió `--texto-suave` (el gris del texto de apoyo): con `--borde` la línea por completar no se distinguiría de la de los opcionales. Es una línea en `LineaPorCompletar.module.css`.
- **Estado «Confirmar»** de «Dónde» del evento (lugar leído del cartel, pin sin confirmar): también lleva la línea gris, porque el renglón no está resuelto; el valor es la dirección leída.
- **El borde del renglón no se pone rojo** al fallar (no lo hacía antes): solo la nota. Si se quiere, es una regla aparte.
- **WebKit** y el `scrollWidth` previo de la alta de artista y de Editar perfil: no es de esta pieza, pero conviene mirarlo en el iPhone.

### Tercera entrega de la segunda vuelta (último ajuste antes de publicar; el founder delegó en el gestor: «haz tus recomendaciones»)

- **Tipo y Disciplina.** En el código, sin nombre escrito el tipo (lugar) queda vacío y la disciplina (artista) también; con nombre escrito, el tipo sale de `deducirTipo` (u «Otro») y la disciplina de `deducirDisciplina` (que siempre devuelve una, «Música» si no hay pista). «Por el nombre» solo se mostraba con el renglón vacío, nunca junto a un valor deducido, así que no se pierde información: el valor deducido ya iba solo. Ahora, vacío: «Tipo de lugar» / «Disciplina» en gris (el color de un opcional sin llenar) con la acción «Elegir»; con algo deducido o elegido: el valor en tinta («Museo», «Música») con «Cambiar», como antes. Comprobado en pantalla escribiendo «Museo de Arte Popular» (Museo · Cambiar) y «Los Cuervos del Norte» (Música · Cambiar, Grupo · Cambiar), a 390 y a 320.
- **Ningún renglón de las tres altas se parte en dos líneas con sus textos por defecto, a 390 y a 320 (Chromium y WebKit).** Medido por renglón (alto del valor entre su interlineado). A 320 se partían tres: «Falta la ubicación» del lugar (junto a los dos botones redondos), «Descripción, enlace, foto» del evento y «Descripción, redes, foto» del lugar. Cambios llanos: «Sin ubicación» (como «Sin artista» y «Sin portada»; el borde punteado y la nota bajo el botón ya dicen que falta) y «Más detalles» en los dos «Más» (el evento y el lugar; el del artista, «Redes, descripción», cabía y se queda). «Más detalles» pierde el recordatorio de qué se puede agregar; al abrir, los campos lo dicen.
- La prueba de componentes del alta de evento (`cupo`) buscaba el renglón por «Descripción, enlace»; ahora lo busca por «Más detalles».
- Capturas rehechas (todas las de «después», para que coincidan con el texto final): `despues-lugar-390.png`, `despues-lugar-320.png` (Sin ubicación, Tipo de lugar con «Elegir», Más detalles, los tres en una línea), `despues-artista-390.png`, `despues-artista-320.png` (Disciplina con «Elegir», el resto igual), `despues-evento-*.png` y `despues-evento-publicar-*.png`/`despues-evento-error-simulado-*.png` (Más detalles), `despues-editar-perfil-*.png` (sin cambio), y nuevas con nombre escrito: `despues-lugar-connombre-390.png`, `despues-lugar-connombre-320.png` («Museo» con «Cambiar»; la nota baja a «Falta dónde está.»), `despues-artista-connombre-390.png`, `despues-artista-connombre-320.png` («Música» y «Grupo» con «Cambiar»; el botón ya violeta). `despues-webkit-lugar-320.png` confirma lo mismo en WebKit.
- Aviso de una corrección mía: en el informe anterior dije que el proceso que quedó escuchando era ajeno. No lo era: era el `next-server` hijo de mi propia compilación (el PID guardado era el del envoltorio); lo detuve al empezar este ajuste.
