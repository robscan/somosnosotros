# 325 · Canon de los campos por completar: punteado más marcado y en el color de acción

**Pieza:** OL-297. **Rama:** `canon-pendientes` sobre `origin/main`. **Fecha:** 2026-10-05.
**Estado:** commit y push de la rama; sin PR y sin publicar.

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

## Capturas (`docs/rediseno/capturas-325/`, todas abiertas y miradas)

- `antes-evento-390.png`, `antes-evento-320.png`: alta de evento recién abierta; nombre vacío, Dónde, Quién y Más con punteado gris de 1 px, casi una línea continua, valores en gris; Cambiar, Agregar y los dos botones redondos como siempre.
- `despues-evento-390.png`, `despues-evento-320.png`: lo mismo con el punteado violeta de 2 px que se lee como guiones; «Falta», «Sin artista» y «Descripción, enlace, foto» en violeta; «DÓNDE», «QUIÉN», «MÁS», los iconos y el placeholder «Nombre del evento» en gris; los renglones resueltos (Cuándo, Cuánto) sin cambio. A 320, «Más» envuelve el valor en dos líneas y la caja mide igual que antes.
- `despues-evento-publicar-390.png`, `despues-evento-publicar-320.png`: tras tocar «Publicar evento» sin datos; igual que la anterior.
- `despues-evento-error-simulado-390.png`, `despues-evento-error-simulado-320.png`: el campo de nombre en rojo sólido y la nota roja «Elige dónde es el evento.» bajo Dónde (simulación en el DOM); los demás pendientes en violeta.
- `antes-lugar-390.png`, `despues-lugar-390.png`, `despues-lugar-320.png`: alta de lugar con Dónde y Más pendientes. El nombre queda con el borde de tinta de enfoque (el campo lleva el foco al abrir) y sin marca de faltante, como antes.
- `antes-artista-390.png`, `despues-artista-390.png`, `despues-artista-320.png`: alta de artista con Foto, Portada y Más pendientes, Soy yo / es mi grupo resuelto. (En la de 320 la barra inferior de la captura de página completa tapa un tramo de «Más»; es el efecto de la barra fija en esa captura, no del cambio.)
- `antes-editar-perfil-390.png`, `despues-editar-perfil-390.png`, `despues-editar-perfil-320.png`: Editar perfil con Foto pendiente; «Sobre ti: Falta» sigue gris por no ser pendiente. A 320 el botón «Atrás» de la cabecera se ve acortado («At…»); lo dibuja la cabecera, que esta pieza no toca, y no se verificó si ya pasaba antes.

## Pruebas

- `npm run lint`: 0 errores (un aviso previo en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: sin errores.
- Componentes: `Renglon.componentes.test.mjs` 9/9 (con la aserción nueva), `cupo` y `guardado` del alta de evento 15/15.
- `npm run inventario`: sin novedades; medidas en duro 344 (igual que lo aceptado; 2 px no cuenta y los 10, 14, 44 pasaron de una declaración a otra sin sumar).
- `npm run medir -- --solo=alta`: sin novedades (s03, s07 y s11 a 320, 390, 820 y 1280; mismos nodos y profundidad).

## Riesgos y notas

- El valor de los renglones opcionales pendientes («Sin artista», «Descripción, enlace, foto», «Redes, descripción») también se pone violeta, porque comparten `.pendiente > .falta`. Si el founder prefiere que solo lo obligatorio («Falta») lleve color, se separa con una clase propia; hoy se siguió su frase «el valor» sin distinguir.
- Las acciones de icono de los renglones pendientes (Dónde: «Estoy aquí» y la lupa; Foto y Portada: la cámara) son botones de contorno con el glifo en tinta y el borde gris: no son violeta y no se tocaron, porque la corrección del founder hablaba de acciones de texto («Elegir», «Poner»). Si quiere también el glifo violeta, es una línea más en `.pendiente`; decide él.
- Enfocado, el campo de nombre vacío sigue mostrando su punteado de 2 px en tinta (antes, 1 px), no en violeta.
