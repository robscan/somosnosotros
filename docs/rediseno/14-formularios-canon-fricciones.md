# Formularios con el canon · lista de fricciones (v1, firmado el 2026-09-15 con una corrección: Editar perfil en pantalla completa, no en hoja)

**Fecha:** 2026-09-15 · **Pantallas:** alta de evento (`/eventos/nuevo`), alta de artista (`/artistas/nuevo`), hoja Editar perfil (`/ajustes` → Editar) · **Mirada:** capturas 390×844 en el servidor de desarrollo con un usuario desechable · **Vara:** el canon del alta de lugar, firmado el 2026-09-15 (bitácora [039](../bitacora/2026/09/039-alta-de-lugar-canon.md)): un campo arriba con icono y foco, renglones resueltos (icono | clave / valor | acción), salidas por intención cuando falta algo, lo pesado en una hoja, botón que dice qué falta, sin frases de ayuda, iconos con tooltip · **Prototipo:** [prototipos/formularios-canon.html](prototipos/formularios-canon.html) (publicado para el iPhone en https://claude.ai/artifact/Xkr2KNKgss57WtxFR7UgVo) · **Quién decide:** el founder corrige, tacha y firma.

## Diagnóstico

Los tres formularios ya tienen la base del canon (renglones resueltos en las altas; hoja en Editar), pero cada uno se desvía en un punto. **El alta de evento** abre "Dónde" con tres caminos a la vista (desplegable nativo, un enlace y dos píldoras) y ofrece el cartel como una frase suelta. **El alta de artista** lleva etiqueta sobre el campo, una frase de ayuda dentro del renglón de "Qué hace", una fila de foto con otro dibujo y el interruptor "Soy yo" con explicación larga. **Editar perfil** es un formulario de tres campos con etiqueta, sin renglones ni iconos, y expone los tres a la vez cuando lo normal es cambiar uno.

## Resumen por severidad

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| V1 | Alta de evento | "Dónde" abre con un desplegable nativo, un enlace ("¿No está en la lista? Regístralo") y dos píldoras: tres caminos a la vista | Hick · Similitud | Alta | Renglón resuelto con una sola salida cuando falta: la lupa abre la hoja "Dónde es" con los lugares registrados, "Es en otro sitio" (con reservado dentro) y "Registrar un lugar nuevo" |
| V2 | Alta de evento | "¿Tienes el cartel? Súbelo y llenamos todo" como frase suelta sobre el campo | Von Restorff · UX invisible | Media | Icono de cámara dentro del campo del nombre, a la derecha, con tooltip "Leer el cartel"; una frase menos |
| V3 | Alta de evento | Etiqueta "Qué" sobre el campo y subtítulo de dos líneas | Hick | Baja | Sin etiqueta: placeholder "Nombre del evento"; subtítulo de una línea |
| V4 | Alta de evento | "Quién · Añadir quién se presenta" y "+ Más detalles: cartel o foto, descripción, enlace" con otro dibujo (botón punteado) | Similitud | Baja | Renglones como los demás: "Quién · Sin artista · Agregar" y "Más · Descripción, enlace, foto · Agregar" |
| V5 | Alta de evento | "Publicar evento" no dice qué falta | Evidencia | Media | "falta el nombre" / "falta dónde" |
| A1 | Alta de artista | Etiqueta "Nombre" sobre el campo; la frase "cámbialo si no es" dentro del valor de "Qué hace" | Hick · UX invisible | Media | Campo con icono y placeholder "Nombre del artista o grupo"; "Qué hace · Música · Cambiar", sin frase |
| A2 | Alta de artista | La fila "Foto · Opcional · Elegir una foto" tiene otro dibujo que los renglones | Similitud · Conectividad uniforme | Media | Renglón "Foto · Sin foto" con el icono de cámara como acción |
| A3 | Alta de artista | "Soy yo / es mi grupo" con dos líneas de explicación y un interruptor suelto | Hick · Región común | Media | Renglón con interruptor: "Soy yo / es mi grupo · No"; al encender, el valor dice lo que da ("Sí: podrás editar la ficha y publicar sus fechas") |
| A4 | Alta de artista | "+ Más detalles: redes, descripción" como botón punteado | Similitud | Baja | Renglón "Más · Redes, descripción · Agregar" |
| P1 | Editar perfil | Tres campos con etiqueta abiertos a la vez; la foto en una fila propia | Progressive disclosure · Hick | Media | Renglones resueltos (Foto, Nombre, Colonia, Sobre ti) que se abren de uno en uno; "Entras con" como renglón sin acción |
| P2 | Editar perfil | Nada dice si cambió algo antes de Guardar | Evidencia | Baja | Guardar habilitado solo cuando hay un cambio; el renglón cambiado se ve cambiado |

## Detalle por fricción

### V1 · Dónde es, en una hoja
**Qué se ve.** "Dónde" abierto: un `select` nativo "Elige el lugar", debajo "¿No está en la lista? Regístralo y vuelves aquí con él elegido", y dos píldoras "Es en otro sitio" y "Sitio reservado". Con 58 lugares el desplegable nativo es una lista larga sin foto ni dirección.
**Propuesta.** "Dónde" como renglón resuelto. Cuando falta, una sola salida: la lupa, que abre la hoja "Dónde es" con el campo de búsqueda enfocado y la lista de lugares registrados (foto, tipo, calle) que se filtra al escribir; debajo, dos renglones de acción: "Es en otro sitio" (se escribe el nombre del sitio y se pone el pin; ahí mismo el interruptor "Reservado: la dirección solo la ven quienes van") y "Registrar un lugar nuevo" (vuelve con él elegido, como hoy). Con un lugar elegido, el renglón dice su nombre y "Cambiar". Desaparecen el desplegable, el enlace y las píldoras. Cierra la decisión 11 de [11](11-restantes-flujo-y-estados.md) con una forma más simple que los chips: la hoja escala de 6 a 600 lugares. *Hick (un camino), Similitud (la misma hoja que "Dónde está" del alta de lugar), Fitts.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### V2 · El cartel como icono en el campo
**Propuesta.** Dentro del campo del nombre, a la derecha, el icono de cámara con tooltip "Leer el cartel". Al tocarlo se elige la foto y el sistema llena nombre, cuándo, dónde y cuánto, como hoy. La frase desaparece. *Von Restorff (una sola cosa brilla), UX invisible.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### A1 a A4 · Alta de artista al canon
**Propuesta.** Campo con la estrella y placeholder "Nombre del artista o grupo", con foco; "Ya está registrado: …" como aviso con icono (existe); renglones: "Qué hace · Música · Cambiar" (chips al abrir), "Es · Solista · Cambiar", "Foto · Sin foto" con la cámara como acción, "Soy yo / es mi grupo · No" con interruptor (al encender, el valor explica qué da), "Más · Redes, descripción · Agregar". Publicar dice "falta el nombre". *Similitud, Conectividad uniforme, Hick.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P1 y P2 · Editar perfil con renglones
**Propuesta.** La hoja pasa a renglones: "Foto · Tu foto" con la cámara como acción, "Nombre", "Colonia", "Sobre ti" con "Cambiar" que abre el campo dentro del renglón (uno a la vez, con foco), y "Entras con ro…@" como renglón sin acción (con candado). Guardar abajo, habilitado cuando hay un cambio. Lo normal es cambiar una cosa; el que quiera cambiar tres abre tres. *Progressive disclosure, Hick, Similitud con el alta de lugar.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______
