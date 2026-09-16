# 048 · La ✕ en los campos de texto

**Fecha:** 2026-09-16 (tarde) · **Base:** pedido del founder ("A los input text debes agregarles un botón de ✕ para que se borren fácilmente") · **PR:** #55.

## Qué se hizo
- **`ui/Limpiar`**: la ✕ redonda dentro del campo, a la derecha, que solo aparece cuando hay texto. Vacía el campo como si la persona hubiera borrado (dispara el evento `input`, así corre el `onChange` de React y todo lo que cuelga de él: sugerencias, guardia de salida, botón que dice qué falta) y deja el foco en el campo, sin cerrar el teclado. El campo le deja sitio solo cuando está (`input:has(+ .limpiar)`).
- **Dónde va** (todos los campos de texto de una línea):
  - Los campos del canon con icono (nombre del evento, del lugar, del artista; Dónde está; Dónde es; Es en otro sitio): la ✕ va después del input, en la misma caja. En el nombre del evento se corre a la izquierda de la cámara.
  - Los campos del cuerpo (`canon.entrada`: precio, qué es, en una palabra, dirección exacta, indicaciones, nombre y colonia del perfil), el de Quién, el de enlaces, el código de entrar, el detalle de Reportar (pasó a controlado) y `ui/Campo` (correo, enlace, dirección de imagen): el input va en una caja mínima (`span.caja`, relativa) con la ✕ al lado.
  - Los buscadores de Lugares (lista y mapa) ya son `CampoBuscar` (`ui/Buscador`), el mismo de Artistas y la agenda, que trae su ✕; se fueron sus dos cajas de búsqueda propias. `CampoBuscar` toma `onFocus` (el mapa abre la lista al enfocar) y su ✕ pasa a ser el icono, no el carácter.
- Fuera: las áreas de texto (descripción) no llevan ✕; se escriben más largo y la ✕ flotando en una esquina estorba más de lo que ayuda.

## Evidencia
- lint, typecheck y 145 pruebas en verde.
- Navegador integrado a 390 con usuario desechable (borrado al final): nombre del evento con la ✕ a la izquierda de la cámara; al tocarla el campo queda vacío, con el foco, y el botón vuelve a decir "falta el nombre"; Quién con la ✕; Es en otro sitio con la ✕; buscador de Lugares en lista con su ✕.

## Firma
Pendiente en el iPhone (probar sobre todo que al tocar la ✕ el teclado no se cierra).
