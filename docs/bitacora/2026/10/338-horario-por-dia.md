# 338 · Prototipo: horario de un evento de varios días, igual cada día o ajustado día por día

**OL-310 · 2026-10-06 · Gestor de cambios IV (Fable 5.1) · rama `prototipo-horario-por-dia` · prototipo `docs/rediseno/prototipos/horario-por-dia.html`**

## De dónde viene

Al probar «Dura varios días» el founder vio «Termina» con horas y preguntó si no debería pedirse la hora por día. Datos de producción (2026-10-06): 0 eventos de varios días con horas entre 274 visibles; 239 sin hora de fin. Lo decidido ese día: en varios días se pregunta el horario del primer día y se aplica al resto (OL-309, ya en producción: «¿A qué hora, cada día?» con resumen), con una casilla «Mismo horario todos los días» marcada de entrada; solo si se desmarca aparecen los demás días para ajustar cada uno. La casilla y el ajuste día por día son esta pieza, porque piden el modelo de sesiones.

## Lo firmado (comentarios del founder en el prototipo, 2026-10-06: «cool, aceptada esta propuesta»)

- Debajo de los chips «Empieza»/«Termina» del paso en varios días, la **casilla «Mismo horario todos los días»** (ui/Casilla), marcada de entrada, sin línea de fechas (el resumen de abajo ya las dice) y con nombre que puede partirse en dos renglones en pantallas angostas (corrección del founder: «se rompe ese checkbox en ancho pequeño»).
- **Al desmarcarla**, los chips comunes se van y aparece **un renglón por día** (canon ui/Renglon sin clave: icono de calendario, día en negrita, sus horas debajo, «Cambiar»), todos con el horario común. Tocar un día abre una **hoja de media pantalla** con «Empieza» y «Termina» solo de ese día y «Listo». El día que se apartó del horario común lleva sus horas en tinta y negrita; los demás, en gris. El resumen de abajo dice «Del 9 al 11 de oct · 1 día con otro horario» (o «cada día igual»). Con la casilla desmarcada el pie dice «Siguiente».
- **Volver a marcarla** devuelve a todos el horario común.
- **Lo que se guarda**: con la casilla marcada, igual que hoy (inicio del primer día, fin del último). Con días distintos, la **tabla de sesiones** (una fila por día con su inicio y fin), que es el mismo modelo del taller con sesiones del plan; la ficha enseña los días con sus horas.

## Construcción

Va como **OL-311** (bitácora 339): migración que solo añade (`eventos_sesiones`), el paso con la casilla, la lista y la hoja, la ficha con las sesiones, y el resto de la app sin cambios (el evento sigue con su inicio y fin de siempre para la agenda y las búsquedas; que la agenda lo muestre cada día que tiene sesión queda anotado como pieza aparte).
