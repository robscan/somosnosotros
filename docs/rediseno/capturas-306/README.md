# Evidencia de OL-274 B · Más adelante

App Next compilada sobre `27bed4d8`, con A/ciudad persistente publicada en
`9fa3d4e5`. Chrome local, viewport320/390×844, Bricolage Grotesque real y reloj
fijo `2026-10-07T16:00:00Z`. Supabase, ubicación y contenido sintéticos; ninguna
escritura remota. El ajuste final del href explícito de la ciudad inicial no
cambia estos estados visuales de otras ciudades.

Los10PNG finales se observaron completos después de resolver los streams y
terminar las transiciones finitas del canon. La cabecera, chip de ciudad, barra
inferior, tarjetas, fechas, ✓ y enlaces reutilizan los componentes vigentes.
No es una prueba física en Safari/iPhone ni una captura de teclado nativo.

| Archivos, cada uno a320 y390 | Estado y observación |
|---|---|
| `mas-adelante-*.png` | León: un evento antiguo fuera de la semana aparece en Más adelante. Tarjeta única sin foto con fondo5:3, fecha y lugar completos, Ver la agenda visible. Fondo350×210 a390 y280×168 a320. |
| `puebla-*.png` | Puebla sin ningún carril: mensaje exacto del Vacio de Agenda, sin pantalla en blanco. |
| `monterrey-*.png` | Tres eventos nuevos visibles en Nuevos; Más adelante ausente. |
| `monterrey-visto-*.png` | La marca local ya vio esos tres eventos: Nuevos vacío y Más adelante con los tres. |
| `merida-*.png` |25eventos candidatos: se eligen los20más cercanos por fecha y después se presenta el grupo con foto primero. La foto del evento25no desplaza a un evento elegido. |

`qa.json` registra los10casos, errores0 y geometría del fondo. La automatización
comprueba que no haya desbordamiento lateral del documento; la fila de filtros
mantiene su desplazamiento horizontal canónico cuando no caben todos los chips.

En ambos anchos se tocó el enlace real de Next **Ver la agenda** de León y se
comprobó Todos sin filtros y el evento. Con A integrada se recorrió Agenda →
Lugares → Artistas → Inicio: la ciudad sigue siendo León y el respaldo reaparece.
`recorridoConA:true` identifica esa comprobación en el JSON. No se infieren datos
de producción de este respaldo local.
