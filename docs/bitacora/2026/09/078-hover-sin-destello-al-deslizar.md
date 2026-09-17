# 078 · Listados en la web: la acción de deslizar ya no asoma al pasar el ratón (OL-051)

**Fecha:** 2026-09-16 (noche) · **Rama:** `hover-deslizar`, desde `main` (commit local, sin push) · **Reporte del founder:**

> "En versión web de listados, al entrar y salir de estado hover se muestra por milisegundos el swipe action. Revisa y corrige bug en coordinación con chat de gestión de cambios."

Se avisó al chat de gestión de cambios antes de empezar y al terminar.

## Causa
- En los listados deslizables (agenda, Lugares, Artistas), la acción ("Me interesa", "Seguir") vive detrás del renglón. El renglón la tapa con su fondo ([074](074-deslizar-en-las-listas.md)).
- Al pasar el ratón, el renglón se pinta blanco con la marca azul a la izquierda. Esa marca se dibujaba con `background: linear-gradient(…)`. La forma corta `background` deja el color de fondo **transparente** y pinta todo con la imagen.
- `Renglon.module.css` anima el color de fondo en 120 ms. Al salir, la imagen se quita de golpe y el color vuelve de transparente a hueso en esos 120 ms: el renglón transparentaba y la acción de atrás asomaba. Al pasar de un renglón al siguiente, se ve en el que se deja.
- **Medido en el navegador**, con los datos inventados de siempre y sin producción. Las transiciones del renglón iban de `rgb(246, 245, 241)` a `rgba(0, 0, 0, 0)` al entrar, y de vuelta al salir.
- **Visto:** con la transición alargada a 4 s solo en el navegador de prueba, al salir del renglón de "Son huasteco" asomaba "Me interesa" a la derecha.

## Qué se hizo
- `ui/Deslizable.module.css`: en el hover, el blanco va en `background-color`, siempre opaco. La marca va en `background-image`, con un degradado transparente salvo los 3 px azules. El renglón se ve igual que antes y el color ya no pasa por transparente. Un comentario explica por qué, para que no vuelva.
- Sin cambios en el teléfono: la regla vive en `@media (hover: hover)`.

## Evidencia
- lint (el aviso viejo del script del logotipo, ajeno), tipos, 258 pruebas y build en verde.
- **Navegador, en escritorio**, build local contra el respaldo de datos inventados:
  - agenda: las transiciones del fondo van de `rgb(246, 245, 241)` a `rgb(255, 255, 255)` y de vuelta, en los dos renglones y en los dos sentidos. Nunca pasan por transparente;
  - con la transición alargada a 4 s, a la mitad de la salida no asoma nada, y el hover se ve igual (blanco, marca y título azules);
  - Lugares: lo mismo, sin que asome "Seguir".
  - **con teclado** (lo pidió el gestor): Tab pasa por los renglones con su contorno de foco, sin ninguna transición de fondo, también con la transición alargada. La acción no asoma, y sus botones quedan fuera del Tab mientras el renglón está cerrado (`tabIndex=-1`, `aria-hidden`).
- **390×844:** la agenda igual que antes (sin hover en el teléfono).
- **Con el dedo en el simulador** (iPhone SE, iOS 26.3, Safari, la misma build local; estaba apagado y se apagó al final):
  - deslizar "Son huasteco" a la izquierda abre "Me interesa" pegado al borde, como antes;
  - tocar el renglón abierto lo cierra y se queda en la lista;
  - no queda ningún resaltado pegado tras el toque.

## Queda
- **Firma del founder** en la web: pasar el ratón por la agenda, Lugares y Artistas.
- **"Voy" al deslizar:** el founder notó que en la agenda solo sale "Me interesa". Así quedó en la propuesta que aceptó (074: Voy se queda en la ficha, con el recordatorio). Se le preguntó si agregar Voy; no eligió ninguna opción, así que no se cambió.
