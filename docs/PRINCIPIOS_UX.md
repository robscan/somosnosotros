# Principios de experiencia de somosnosotros

**Origen.** Carta de principios del founder, que vive completa en su herramienta robscan (fuera de este repo porque el repo es público). Aquí va lo que toda pantalla de somosnosotros debe cumplir; la violación silenciosa es el único error prohibido: si una pantalla se aparta de un principio, lo declara por escrito en su bitácora.

**Quién decide.** El founder es experto en UX/UI: cuando señala una fricción es una opinión experta, no una sensación. El agente propone, cuestiona y construye; el founder dirige, decide y firma. No hay pruebas con personas ajenas mientras la experiencia tenga fricciones conocidas.

## Nivel A · siempre activo

1. **UX invisible** (ley de Tesler). Cero tutoriales: el primer flujo real es el onboarding. El sistema hace el trabajo: deduce, rellena, sugiere, evita pasos. El texto habla del mundo de la persona, nunca de la maquinaria. Defaults inteligentes en vez de preguntas tempranas.
2. **Progressive disclosure** (Hick, Miller). Tres capas: (a) lo esencial para decidir, visible; (b) lo que se expande en el mismo sitio al tocarlo; (c) lo que navega a otra pantalla. Cada elemento visible justifica su costo de atención. Lo destructivo, detrás de una capa. Una decisión por pantalla; jamás dos accionables para la misma decisión.
3. **Evidencia, nunca promesa.** La interfaz solo afirma lo que puede probar en ese instante. Los vacíos se diferencian por causa ("aún no hay eventos" no es lo mismo que "sin conexión"). Lo provisional se ve provisional. Los errores dicen la verdad y dan una salida.
4. **El gesto de la persona gana.** Todo automatismo es interrumpible, saltable y degradable. "Reducir movimiento" se respeta por diseño. Nada roba el foco.
5. **Peak-End.** El pico y el final de cada flujo núcleo (publicar un lugar, publicar un evento, decir "Voy", entrar) se escriben antes de pulir el resto. El final negativo también se diseña. Celebración proporcional y escasa.

**Leyes confirmadas por el founder (mismo nivel):**
- **Fitts.** Objetivos de toque de 44 pt como mínimo (`--toque-min`), 48 pt para botones y campos (`--toque`). La acción primaria vive en la zona del pulgar. Con el teclado abierto, el botón principal viaja sobre el teclado. Acciones opuestas nunca contiguas: separadas al menos 14 px.
- **Hick.** Presupuestar por pantalla cuántos caminos y cuánta información hay. Un camino por decisión.
- **Región común.** Campo, error y ayuda forman un solo grupo dentro de una misma frontera. Entre grupos, aire. Los contenedores dicen la verdad sobre la relación.
- **Gradiente de meta.** En flujos de creación, progreso visible con arranque dotado (lo ya resuelto se muestra resuelto), indicador ligero, sin ceremonia.
- **Topografía de navegación.** Lo que navega hacia atrás vive alineado a la izquierda; nunca lo empuja el layout.

## Reglas por pantalla (heredadas de Bob, el operador de diseño de robscan)

- Cuatro estados como mínimo: vacío por causa, carga, error con salida, éxito.
- Toast solo para éxito. Errores en línea, persistentes y específicos por causa.
- Prevención antes que corrección: si un error puede ser imposible por diseño, se diseña así.
- Salir y volver sin perder lo escrito (borrador local en las altas).
- Ningún accionable visible sin utilidad en su estado; deshabilitado con explicación, no oculto.
- Si una acción lleva a un selector nativo (fecha, hora, cámara), se abre directo al toque.
- Cada decisión de interacción se numera con la regla y la ley que la justifican; la auditoría de principios debe encontrar excepciones declaradas, no sorpresas.

## Nivel B · por señal

El catálogo completo de leyes de [lawsofux.com](https://lawsofux.com/) se invoca por nombre cuando una pantalla presenta su señal (Von Restorff: una sola cosa brilla por pantalla; Jakob: convencional por defecto; Doherty: respuesta antes de 400 ms o progreso honesto; Postel: aceptar formatos varios, emitir normalizado; Zeigarnik: lo incompleto se recuerda con los pasos exactos que faltan).

## Nivel C · por aprender

Si el founder menciona una ley, principio o patrón que no está aquí, se aplica en el momento y se le pregunta si quiere integrarlo. Nunca se integra sin su confirmación.
