# Destacados · flujo, estados y decisiones (v1: para la firma del founder)

**Fecha:** 2026-09-16 (noche) · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Canon:** memoria de pantalla (bitácora [043](../bitacora/2026/09/043-memoria-de-pantalla-y-buscador.md)), menú de los tres puntos ([19](19-administracion-flujo-y-estados.md), decisión 10), [línea gráfica](../diseno/LINEA_GRAFICA.md) · **Prototipo navegable:** [prototipos/destacados.html](prototipos/destacados.html) (publicado para el iPhone en https://claude.ai/artifact/DojyjHo44BgwM3xj2e4zwc) · **Quién firma:** el founder.

**En corto:** una tira de tarjetas con foto arriba de la Agenda, de la lista de Lugares y de Artistas, con lo que elige el admin y lo que tiene más asistentes. Se desliza con el dedo, se va cuando la persona ya busca algo y no existe si no hay destacados. En el mapa, los destacados van en naranja cempasúchil. El admin destaca y quita desde los tres puntos. No se cuentan visitas.

## Lo que pidió y decidió el founder (2026-09-16, noche)

- **Pedido:** «Con el objetivo de facilitar la consulta de la información propongo una sección de destacados en la parte superior de cada sección de listado (Agenda, mapa y artistas) donde aparezcan los elementos mas visitados además de que podemos crear una opción para admin para que seleccione destacados y se coloquen también en esa sección, esta sección puede tener el formato de un slider con la foto de portada y la información relevante según el caso, que opinas?»
- **Opinión dada:** sí a lo que elige el admin; lo más visitado no, por ahora. Hoy no hay visitas que contar, choca con «ni ranking» de la [definición](../DEFINICION.md), siempre ganarían los mismos y contar visitas es un dato nuevo que toca el aviso de privacidad. En vez de un slider que avanza solo, una tira que se desliza con el dedo.
- **Decisión:** «Son los destacados que elige adin + los que tienen mas asistentes, en el mapa color destacado (propón uno), Acepto tu propuesta de duración para destacados. Si no hay destacados la sección se oculta».

## Lo medido (16 de septiembre, somosnosotros.org a 390×844, sin sesión)

| Sección | Filas que se ven hoy | Con la tira | Fichas con foto |
|---|---|---|---|
| Agenda | 4 (la primera empieza en 199 px) | unas 2: la tira mide 251 px | 74 de 86 eventos próximos (algunos con la foto de su lugar) |
| Lugares, lista | 5 (257 px) | unas 3 | 47 de 58 |
| Artistas | 4 o 5 (218 px) | unas 2 | 62 de los primeros 103 |
| Lugares, mapa | todo el mapa | sin tira: el color va en el punto | — |

Asistentes hoy: 12 «voy», todos de la administración (bitácora [070](../bitacora/2026/09/070-panel-de-administracion-diseno.md)). Con las reglas de abajo, al principio solo saldría lo que elija el admin.

## Qué entra en la tira

1. **Lo que elige el admin**, mientras dure: un evento, hasta su día; un lugar o un artista, dos semanas.
2. **Lo que tiene más asistentes:** personas que marcaron «Voy», desde 3 y sin contar a la administración (D2). En un evento cuentan quienes van; en un lugar o un artista, quienes van a sus próximos eventos (D1).
3. **Solo fichas con foto.** Un evento sin cartel usa la foto de su lugar, como ya hace su renglón.
4. **Hasta 8 tarjetas.** Primero lo elegido, lo más reciente antes, y después por asistentes. En la agenda, todo por día y hora.
5. **Solo la ciudad que se ve** (chip de ciudad), y nunca algo oculto o que ya pasó.
6. **Lo que el admin quita** deja de salir aunque tenga asistentes, por lo que duraría un destacado (D3).

## Dónde y cuándo se ve

- **Agenda:** debajo de las pestañas, solo en Todos, sin fecha elegida y sin búsqueda.
- **Lugares › Lista:** debajo de los chips, con Todos y sin búsqueda. Cerca de mí no la quita: ordena, no filtra.
- **Artistas:** debajo de los chips, con Todos y sin búsqueda.
- **Lugares › Mapa:** sin tira. Los destacados van en naranja, más grandes y encima de los demás, y su nombre gana el espacio. Al tocar uno, la tarjeta del lugar dice «Destacado».
- **Sin destacados:** la sección no existe, ni título ni hueco.
- **Con uno solo:** la tarjeta ocupa el ancho, con la foto a la izquierda (93 px de alto en vez de 251).

## La tarjeta

| | Evento | Lugar | Artista |
|---|---|---|---|
| Foto | su cartel o la de su lugar | portada | foto |
| Sobre la foto | «14 van», si alguien va | — | — |
| Título | hasta 2 renglones | hasta 2 renglones | hasta 2 renglones |
| Debajo | día · hora · lugar | «Próximo: día · hora», o su tipo | «Próximo: día · hora», o su disciplina |

Mide 220 × 200 px y la siguiente asoma 138 px. Tocarla abre la ficha; al volver, la tira y la lista siguen donde estaban.

## El color: naranja cempasúchil

- **`--destacado: #d35400`**, para el punto del mapa. Contrasta 3.8:1 con el fondo del mapa y 3.2:1 con los parques; se pide 3:1.
- **`--destacado-texto: #a94400`**, para el nombre en el mapa y la palabra «Destacado». Contrasta 5.5:1 con el fondo de la app; se pide 4.5:1.
- **`--destacado-suave: #fbebdd`**, fondo de la etiqueta en el panel.
- **Por qué este:**
  - Se separa mucho del azul petróleo de los demás lugares, también con daltonismo: diferencia de color de 103 en visión normal, 82 con deuteranopia y 65 con protanopia. El rosa mexicano, en cambio, bajaba a 5 con protanopia.
  - No se confunde con el rojo de error (diferencia de 26) ni con el verde de «Voy».
  - Es la flor del Xantolo de la Huasteca potosina.
- **El color nunca va solo:** el punto también es más grande y va encima.

## Estados

| ID | Estado | Qué se ve |
|---|---|---|
| T1 | Con destacados | «Destacados» y la tira, con la siguiente tarjeta asomando |
| T2 | Uno solo | Una tarjeta a lo ancho, con la foto a la izquierda |
| T3 | Sin destacados | Nada: la lista empieza como hoy |
| T4 | La persona ya busca algo (otra pestaña, fecha, búsqueda o filtro) | Sin tira |
| T5 | Cargando | Llega con la lista, sin espera propia |
| T6 | No se pudieron leer los destacados | Sin tira; la lista sigue. Excepción declarada: la tira es un atajo, no la tarea |
| M1 | Mapa | Puntos naranjas, más grandes y encima, con su nombre |
| M2 | Punto destacado tocado | La tarjeta del lugar con «Destacado» |
| A1 | Admin, ficha con foto | En los tres puntos, «Destacar» y debajo «Dos semanas: hasta el mié 30 de sep» (un evento: «Hasta el jue 17 de sep») |
| A2 | Admin, ficha destacada | «Quitar de destacados» y debajo el motivo: «Destacado hasta el vie 25 de sep» o «Destacado: 14 van» |
| A3 | Admin, ficha sin foto | «Destacar» apagado, con «Necesita foto» |
| A4 | Después de destacar o quitar | Aviso «Destacado hasta el mié 30 de sep» o «Ya no es destacado», con Deshacer |
| A5 | Panel › Lugares › filtro Destacados | Conteo en el filtro; cada renglón con su etiqueta: «Destacado hasta el…» o «Destacado · 14 van a sus eventos» |

## Decisiones

1. **Una tira que se desliza con el dedo, sin avance automático.** *El gesto gana; Reduce Motion por diseño.*
2. **La siguiente tarjeta asoma.** Dice que hay más sin flechas ni puntos. *UX invisible.*
3. **La tira se va cuando la persona ya busca algo:** otra pestaña, una fecha, la búsqueda o un filtro. *Progressive disclosure: una sola cosa a la vez.*
4. **Sin destacados, no hay sección.** *Decisión del founder; lo vacío no se rellena.*
5. **Solo fichas con foto.** La tira es de fotos; una tarjeta sin foto se leería como un hueco. *Evidencia.*
6. **Destacar vive en los tres puntos, junto a Ocultar**, en la ficha y en el panel: donde el admin ya decide sobre una ficha. *Colocar por intención.*
7. **Destacar no pregunta.** Dice antes hasta cuándo y después da Deshacer. *Prevención antes que corrección; aviso solo para el éxito.*
8. **Se apaga solo.** Nadie tiene que acordarse de quitar un destacado. *UX invisible.*
9. **El motivo se ve donde decide el admin** (menú y panel), no en la tarjeta pública. *Evidencia sin ruido.*
10. **En el mapa, color, tamaño y orden de dibujo.** *Contraste de objetos gráficos; el color no va solo.*
11. **No se cuentan visitas.** Solo «Voy», que ya se guarda y cuyo conteo ya se ve en la agenda. *Nada nuevo que declarar en el aviso de privacidad.*
12. **La memoria de pantalla alcanza a la tira:** al volver de una ficha, la tira y la lista quedan donde estaban. *Canon de la bitácora 043.*

## Para firmar

- **D1 · En lugares y artistas, «más asistentes» son quienes van a sus próximos eventos.** Recomendado. La otra lectura, quienes los siguen, es otro dato y no fue lo que dijiste.
- **D2 · Desde 3 personas, sin contar a la administración.** Recomendado, igual que los indicadores del panel. Con 1 o 2, la tira se llenaría de tus propios «Voy».
- **D3 · «Quitar de destacados» también sirve para lo que entra por asistentes.** Recomendado. Sin esto, la única salida sería ocultar la ficha.
- **El color:** naranja cempasúchil, u otro.
- **Correcciones** al prototipo, tras probarlo en el iPhone.

## Para construir (después de la firma)

- **Migración**, con el nombre que asigne gestión de cambios al construirla y solo para añadir:
  - una tabla `destacados` con la ficha, hasta cuándo, quién y cuándo, y si se eligió o se quitó;
  - lectura pública de lo vigente y escritura solo de la administración;
  - una función de lectura que junta lo elegido con lo que tiene asistentes, con las reglas de arriba, en un viaje por sección.
- **Tokens** `--destacado`, `--destacado-texto` y `--destacado-suave` en `globals.css`, y su párrafo en la [línea gráfica](../diseno/LINEA_GRAFICA.md).
- **Un componente para las tres listas**, con la memoria de pantalla del desplazamiento horizontal.
- **Mapa:** la propiedad `destacado` en cada punto; color, radio y orden de dibujo según esa propiedad; su nombre con prioridad.
- **Menús:** Destacar y Quitar en `MenuAcciones` de las tres fichas y en `MenuFicha` del panel; el filtro Destacados en el panel.
- **Qué pide al founder:** aplicar la migración antes de mezclar. No hay variables nuevas y el aviso de privacidad no cambia, porque no se guarda ningún dato nuevo de las personas.
- **Una sola pieza**, probada en el iPhone.

## Qué no entra

- Contar visitas o vistas de fichas.
- Avance automático de la tira, flechas o puntos de página.
- Destacados en Novedades o en los avisos.
- Posiciones, números de ranking o «lo más popular».
- Elegir una fecha exacta al destacar: para alargar, se quita y se vuelve a destacar.
