# 082 · Destacados construido: tira, mapa, menús y migración

**Fecha:** 2026-09-16 (noche) · **Rama:** `destacados` (árbol de trabajo en `.claude/worktrees/destacados`; commit local, sin push) · **Pieza:** OL-052 · **Diseño:** [20](../../../rediseno/20-destacados-flujo-y-estados.md) y la bitácora [079](079-prototipo-destacados.md).

## La firma
El prototipo le encantó al founder. El encargado de gestión de cambios pidió confirmarle las cuatro decisiones con sus opciones antes de construir. Su respuesta, literal: «1A, 2A, 3A, 4A».
- **D1:** en lugares y artistas cuentan quienes van a sus próximos eventos.
- **D2:** desde 3 personas, sin contar a la administración.
- **D3:** «Quitar de destacados» también quita lo que entra por asistentes.
- **Color:** naranja cempasúchil `#d35400`.

La imagen sin foto con el símbolo SN (OL-054, bitácora [081](081-imagen-sin-foto-sn.md)) llegó antes a `main`, así que la regla de «solo con foto» ya no hace falta: todo se puede destacar.

## Qué se hizo
- **Migración `20260917140000_destacados.sql`**, con el nombre que dio el encargado. Solo añade:
  - la tabla `destacados`: un renglón por ficha, elegido o quitado, y `hasta` en lugares y artistas, sin datos de personas. Borrar la ficha borra su renglón. Se lee sin sesión y no tiene reglas de escritura (condición del encargado): solo se escribe con `cambiar_destacado`;
  - `tira_destacados(p_tipo, p_ciudad)`: hasta 8, primero lo elegido (lo más reciente antes) y después lo que tiene al menos 3 «Voy» sin contar a la administración. En la agenda van por día y hora. Nunca algo oculto, privado o que ya pasó (`eventos.termina`, de la zona horaria). Definer, como `van_por_evento`;
  - `cambiar_destacado(p_tipo, p_id, p_estado)`: elegir, quitar o dejar como estaba. Definer; comprueba la administración y, si no, responde `sin_permiso`. Sin permiso de ejecución para anon;
  - `panel_destacados(p_tipo)`: los destacados de todas las ciudades, con nombre y foto. Comprueba la administración por dentro y no la ejecuta anon.

  No toca las funciones del panel que reescribió la zona horaria.
- **Banco `supabase/tests/destacados.mjs`** (PGlite, sesión en UTC): 41 comprobaciones.
  - Cubre la regla con 2, con 3 y con 3 más la administración; D3; la caducidad; la ciudad; lo oculto, privado o pasado, también lo elegido que después se oculta; que la tira no devuelve datos de personas; los permisos de anon, de una persona y de la administración; y la cascada al borrar.
  - Lo detecta: con el mínimo en 2 y la administración contada fallan 6, y sin la comprobación de administración en `cambiar_destacado`, 1.
- **La tira** (`components/Destacados`): título y carril que se desliza, con la siguiente tarjeta asomando.
  - Tarjetas de 220×200 con foto, cuántos van, título y detalle.
  - En Artistas, redondas de 104 px, como su avatar.
  - Con una sola, a lo ancho.
  - Al volver de una ficha, el carril queda donde estaba (se guarda aparte del scroll de la página).
  - **Agenda:** solo en Todos, sin fecha ni búsqueda.
  - **Lugares › Lista:** sin tipo ni búsqueda.
  - **Artistas:** sin filtro ni búsqueda; los destacados se leen aparte porque pueden no estar en la primera página.
- **Mapa:** un destacado va en naranja, 2 px más grande, con línea blanca de 2 px y encima de los demás, y su nombre gana el sitio. La tarjeta del pin dice «Destacado» con el punto naranja.
- **Fichas (administración):** en los tres puntos, «Destacar» con «Dos semanas: hasta el…» o «Hasta que pase el evento», o «Quitar de destacados» con el motivo.
  - Solo sale en lo que puede estar en la tira: visible, un lugar no privado y un evento que no ha pasado.
  - Lo hecho queda en su renglón con Deshacer.
- **Panel:** filtro Destacados con conteo y el motivo en cada renglón, etiqueta naranja «Destacado» en las demás vistas y «Destacar» o «Quitar» con el destello en el menú de cada renglón.
- **Código compartido:**
  - `lib/destacados` (lectura de la tira, tarjetas y textos, con 7 pruebas);
  - la acción `cambiarDestacado` junto a `cambiarVisibilidad`;
  - `cargarDestacado` en las consultas del panel;
  - tokens `--destacado`, `--destacado-texto` y `--destacado-suave`;
  - `IconoDestello`.
- **[Línea gráfica](../../../diseno/LINEA_GRAFICA.md):** el punto destacado del mapa y la tira.

## Lo que cambió frente al prototipo
- **Sin «solo con foto»** ni «Destacar» apagado: lo que no tiene foto lleva la imagen del símbolo (OL-054).
- **En la ficha, lo hecho se queda en el renglón del menú**, con Deshacer, como la respuesta de «Reportar». No hay aviso flotante: el menú es una hoja que se cierra y el aviso se iría con ella.
- **En el panel, como Ocultar:** la hoja se cierra y la etiqueta del renglón es la evidencia. El reverso está en el mismo menú.

## Maquetación
- Cada tarjeta es un grid de hijos directos: `img`, cuántos van (en el área de la foto), `b` y `small`, sin envoltorios.
- La tira de la agenda, con 3 tarjetas: 23 nodos y profundidad 6 (`section`, `ul`, `li`, `a` y el icono de personas con su trazo). Mide 253 px; la primera fila baja de 199 a 452 px.
- **Tras mirarla, un arreglo:** en las redondas el texto se salía de su tarjeta y se montaba en la vecina. `justify-items: center` dejaba cada texto de su ancho natural; ahora se estira al de la tarjeta y se corta con puntos suspensivos.

## Evidencia
- Lint con 0 errores (1 aviso previo en `iconos-sn.mjs`), tipos, 287 pruebas y build en verde.
- **Bancos PGlite con las 32 migraciones:** destacados (41), panel (95), autor y ocultar (68), lectura al crear (50) y zona horaria (44). Todos en verde con la nueva aplicada.
- **Capturas a 390×844** con `next dev` de la rama contra una API falsa local de solo lectura y una sesión de administrador inventada, sin producción:
  - la tira en la Agenda, en Lugares › Lista (con la imagen del símbolo) y en Artistas (redondas);
  - el menú de una ficha con «Quitar de destacados» y, al tocarlo, «Ya no es destacado · Deshacer»;
  - el panel con el filtro Destacados, las etiquetas y el menú del renglón;
  - el mapa con el token público de `.env` (sin imprimirlo; carga en localhost): Casa de la Cultura de Soledad, Teatro de la Paz y Museo Leonora Carrington en naranja, más grandes y con su nombre, y el punto azul de al lado sin rótulo. Al tocar el Teatro, su tarjeta dice «Destacado».
- El puerto de la API falsa lo usaba el respaldo de otro chat («Atrás»). No se tocó; la de esta pieza fue a otro puerto.
- **Tras el primer «listo», el encargado pidió** lectura pública de la tabla sin reglas de escritura, la función de destacar como definer y nada de personas. Se ajustó la migración (se quitó `creado_por`), el banco pasó de 35 a 41 comprobaciones y se volvieron a correr los cinco bancos.
- **Después, el encargado corrigió esa condición y lo aplicó en la rama:** la tabla la lee solo la administración (política `es_admin()`, como las tablas del panel; el menú de la ficha pregunta si la quitó) y `revoke all` a anon, porque la lectura pública dejaba ver el id de fichas ocultas o privadas que se marcaron; la tira y el panel leen por sus funciones definer. El banco comprueba que sin sesión da error, una persona la ve vacía y la administración la lee.
- Al terminar se apagaron los dos servidores, se borraron `.env.local` y la cookie, y se restauró `CLAUDE.md`.

## Queda
- **Antes de mezclar:** aplicar `20260917140000_destacados.sql`. Sin ella la app no se rompe (la tira sale vacía), pero destacar falla.
- Push, PR y producción: el encargado.
- **Firma en el iPhone:** la tira con el dedo, el naranja del mapa, y destacar y quitar desde las fichas y el panel.
