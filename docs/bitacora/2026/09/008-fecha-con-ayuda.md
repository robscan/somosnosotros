# 008 · La fecha del evento con ayuda (2026-09-13)

Rama `fecha-con-ayuda`. El founder: "la selección de fecha para inicio y fin puede tener más ayuda; cuestiona la solución y mejora".

## Qué estaba mal

Un `datetime-local` para el inicio y otro igual para el fin. En el iPhone es una rueda de cuatro columnas; para el fin obliga a repetir día y hora completos. Para un evento, casi siempre se trata de un día cercano, una hora redonda y una duración de una a tres horas.

## Qué cambió (`SelectorCuando.tsx`)

- **Día con un toque**: Hoy, Mañana, y los siguientes cinco días con nombre ("mar 15", "mié 16"…), más "Otra fecha" (abre un selector de solo fecha).
- **Hora con un toque**: 10:00, 12:00, 16:00 a 21:00, más "Otra hora" (selector de solo hora, pasos de 5 min).
- **Fin como duración**: Sin hora de fin · 1 h · 2 h · 3 h · Otra hora de fin. Al cambiar día u hora, la duración se conserva.
- **Frase de confirmación** en palabras: "domingo, 13 de septiembre, 19:00 a 21:00"; si la hora ya pasó, "· Esa hora ya pasó. ¿Es correcto?".
- Los chips elegidos siempre quedan a la vista (las filas se desplazan de lado).
- Los campos ocultos `inicio` y `fin` no cambian: el servidor valida igual que antes.
- Helpers en `fechas.ts` con pruebas: `proximosDias`, `combinarFechaHora`, `sumarHoras`, `fraseCuando`. 41 pruebas.

## Prueba (usuario desechable, borrado; 390×844)

"2 h" → fin 21:00 y frase "19:00 a 21:00"; "Hoy" → cambia el día y conserva las 2 h; "Otra hora" → aparece el selector de hora con 19:00. Lint, typecheck, build.
