# 044 · Hojas con teclado, salir del alta sin publicar y confirmación de borrado

**Fecha:** 2026-09-15 (noche, tarde) · **Base:** tres retos del founder tras firmar la memoria de pantalla · **PR:** por abrir.

## Lo que pidió el founder
1. En los formularios, cuando una hoja (bottom sheet) abre el teclado, la hoja no recalcula su posición y queda debajo: "te reto a solucionar o decidamos dejar en pantalla completa".
2. Si empieza a crear un evento y toca Atrás, lo escrito se queda en el formulario: limpiar al salir, con una hoja de aviso de que se borrará antes de salir sin publicar.
3. Al borrar un evento creado se abre otro evento o lugar: mostrar confirmación de borrado con estado vacío.

## Qué se hizo
- **Hoja que sigue al teclado** (`ui/Hoja`). En el iPhone, `position: fixed` mide contra la ventana entera aunque el teclado tape la mitad. La hoja ahora escucha el área visible (`window.visualViewport`) y, cuando difiere de la ventana, se coloca en ella (`top` y `height` del área visible); el CSS sigue mandando cuando no hay teclado. Vale para todas las hojas: Dónde es, Dónde está, avisos, instalar. Se queda la hoja, no la pantalla completa.
- **Salir del alta sin publicar** (`lib/guardiaSalida`, `ui/Atras`, `FormularioEvento`). Con algo escrito (nombre, sitio, artista, descripción o foto), Atrás ya no se va: abre la hoja "¿Salir sin publicar? Se borra lo que escribiste." con **Seguir editando** primero y **Salir y borrar** en rojo. Al confirmar, se olvida el borrador y se vuelve. Vale para el alta y para duplicar; editar no cambia.
- **El borrador ya no vuelve solo.** Antes, el alta restauraba siempre lo guardado en el teléfono (por eso "la información se queda"). Ahora solo vuelve cuando se regresa de "Registrar un lugar nuevo" (la hoja deja una señal antes de irse, `eventos/borrador.ts`); en cualquier otro caso el alta empieza limpia. Cerrar la app a medias pierde lo escrito: es la decisión del founder (formulario limpio).
- **Confirmación de borrado** (`/borrado?que=evento|lugar|artista`). Borrar un evento, un lugar o un artista lleva a una pantalla raíz con estado vacío: icono, "Evento borrado", qué pasó ("Ya no aparece en la agenda ni en su lugar. Los Voy que tenía se fueron con él."), **Ir a la agenda** como salida principal y "Publicar otro evento" discreto. Antes, borrar un evento abría la ficha del lugar con un aviso arriba, y borrar un lugar abría la agenda. Se quitaron los avisos viejos `?borrado=` de la agenda, la ficha de lugar y Artistas.
- Hallazgo al construir: una importación circular entre el formulario y su hoja (la señal del borrador) dejaba el alta sin hidratar en desarrollo; la señal vive en `eventos/borrador.ts`.

## Evidencia
- lint, typecheck y 145 pruebas en verde (3 nuevas de la guardia de salida).
- Chrome a 390×844 con usuario desechable: nombre escrito → Atrás abre la hoja; Seguir editando la cierra sin perder nada; Salir y borrar vuelve y el alta reabierta está vacía. `/borrado?que=evento` con su estado vacío.
- Simulador iOS 26.3 (Safari, teclado en pantalla): la hoja "Dónde es" queda encima del teclado con el título, el campo y la lista a la vista; la lista se desplaza dentro de la hoja.

## Queda
- Firma del founder en el iPhone: hoja "Dónde es" con teclado, aviso al salir del alta, borrar un evento.
