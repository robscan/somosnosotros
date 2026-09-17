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
- Cada tarjeta es un grid de hijos directos: `img`, `b`, `small` y, al final, cuántos van (el grid lo pone sobre la foto), sin envoltorios.
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

## Revisión adversarial y correcciones
El encargado subió la rama al [PR #86](https://github.com/robscan/somosnosotros/pull/86) y la revisó con tres lentes: la seguridad de la migración, la app y que la mezcla no perdiera nada. Antes, ajustó los permisos de la tabla (161c055): la lee solo la administración, porque la lectura pública dejaba ver ids de fichas ocultas o privadas. Correcciones hechas encima de su commit:
- **Se sumaban «Voy», no personas (rompía D2).** En lugares y artistas, una persona con «Voy» en tres eventos contaba como 3. Ahora hay un conteo de personas distintas por lugar y por artista, sin la administración y con solo próximos eventos visibles, unido con `left join`; ya no hay subconsultas por fila. El banco esperaba 5 en el foro y son 3 personas; se corrigió y se añadió el caso de una persona en tres eventos.
- **Deshacer podía no deshacer.** El menú deducía el estado de la tira y de un renglón que podía estar vencido. Ahora sale de lo decidido vigente (`estadoVigente`: con el plazo vencido cuenta como nada). Lo elegido se ofrece quitar aunque no quepa entre los 8, y Deshacer repone el plazo que había (`cambiar_destacado` recibe `p_hasta`). Hay pruebas de los cuatro casos.
- **Menores:**
  - los eventos en lugares privados u ocultos ya no entran ni cuentan para artistas;
  - `cambiar_destacado` avisa con tipo, ficha o estado nulos, en vez de borrar;
  - en el panel, Destacar y Ocultar tienen cada uno su espera («Ocultando…» salía al destacar), y Destacar no se ofrece en lugares privados;
  - las tarjetas anchas usan la imagen ancha del símbolo;
  - las fechas del menú van en la zona de la ficha;
  - en la tira, el anillo de foco ya no se recorta y el lector oye el título antes que «14 van». En Lugares, la regla `.lista ul` de la lista le quitaba ese relleno a la tira (se vio en pantalla); ahora solo toca su propia lista (`.lista > ul`);
  - la memoria de la tira se guarda cada 100 ms como mucho;
  - fuera un margen que no hacía nada;
  - OPEN_LOOPS con las fechas en orden.
- **Verificado después:**
  - banco de destacados con 49 comprobaciones (si se vuelven a sumar «Voy» o se deja pasar lo de lugares privados, fallan 8) y los otros cuatro en verde;
  - 11 pruebas de `lib/destacados`;
  - lint con 0 errores, tipos, 291 pruebas y build;
  - capturas a 390×844 contra la API falsa: la tira en la Agenda, en Lugares (imagen ancha del símbolo y, con el teclado, el anillo de foco entero) y en Artistas; en la ficha de un lugar, «Destacar · Dos semanas: hasta el mié 30 de sep», «Quitar de destacados» y «Ya no es destacado · Deshacer», que vuelve atrás.
- **Para después (en OL-052):**
  - lo quitado, lo elegido fuera de los 8 y lo elegido oculto no salen en `panel_destacados`;
  - el panel calcula la tira por cada ciudad;
  - la Agenda solo ve destacados dentro de sus 300 eventos;
  - restando conteos se puede inferir cuántos administradores van;
  - «Próximo:» en la tarjeta de artista.

## Segunda verificación y correcciones
El encargado subió a8a1cba al PR #86 y la verificó. Confirmó el conteo de personas, la privacidad (eventos en lugares privados, artistas ocultos), los permisos, los nulos y casi todo Deshacer. Quedaban cinco cosas, corregidas encima:
- **Deshacer no reponía la prioridad** (lo vieron dos lentes por separado). `cambiar_destacado` borra e inserta, y `creado_en` volvía a ser la de ahora. Como la tira ordena lo elegido por esa fecha y se queda con 8, Quitar → Deshacer mandaba lo repuesto al frente y podía sacar a otro.
  - Ahora la función recibe también `p_creado_en`: nulo por defecto, solo al reponer, ni futuro ni infinito.
  - Deshacer manda la fecha tal como la dio la base, con sus microsegundos.
  - El banco comprueba que la tira queda idéntica tras Quitar → Deshacer, con uno fuera y otro dentro de los 8.
- **`p_hasta` sin límites:** aceptaba 100 años, `infinity` o fechas pasadas. Ahora va por venir y de dos semanas como mucho; si no, `destacado_no_valido`. La acción comprueba lo mismo antes de llamar (`fechasValidas`).
- **«Destacar» en eventos que nunca pueden salir:** los de lugares privados u ocultos y, en el panel, los que ya pasaron. La ficha y el panel usan la regla de la tira (`puedeDestacarse`); el panel lee si el lugar de cada evento se ve junto con su zona.
- **El panel decía otra cosa que la ficha** con lo elegido fuera de los 8: ofrecía «Destacar» y, al tocarlo, lo renovaba y lo pasaba al frente. Ahora los dos deciden con lo decidido vigente (`decididoVigente`, antes `estadoVigente`), que la administración lee de la tabla para los renglones que se ven, en tandas de 100.
- **La memoria del carril** cancelaba el guardado pendiente al desmontar. Ahora lo hace, con la URL donde se deslizó, porque al irse la URL ya puede ser la de la ficha. El carril usa un ref con limpieza (React 19), así que también vale si la tira aparece después del primer render.
- **Verificado:**
  - banco de destacados con 53 comprobaciones. Mutaciones: sin reponer la fecha fallan 2 (el que estaba fuera entra primero y saca a otro), sin límites al plazo falla 1 y sin límites a la fecha, 1. Los otros cuatro bancos, en verde (95, 68, 50, 44);
  - 13 pruebas de `lib/destacados`, 293 en total; lint con 0 errores; tipos; build;
  - con la API falsa a 390×844, en el panel: un elegido fuera de la tira dice «Quitar de destacados · Destacado hasta el dom 27 de sep», igual que su ficha, y un lugar privado y un evento en él no ofrecen «Destacar», ni en el panel ni en la ficha;
  - en la ficha, Quitar manda plazo y fecha vacíos, y Deshacer, los de antes (`2026-09-13T18:00:00.123456+00:00`);
  - en la Agenda, al quitar la tira justo después de deslizar, la posición (232) se guarda al instante y la tira vuelve ahí.

## Queda
- **Antes de mezclar:** aplicar `20260917140000_destacados.sql`. Sin ella la app no se rompe (la tira sale vacía), pero destacar falla.
- Push, PR y producción: el encargado.
- **Firma en el iPhone:** la tira con el dedo, el naranja del mapa, y destacar y quitar desde las fichas y el panel.
