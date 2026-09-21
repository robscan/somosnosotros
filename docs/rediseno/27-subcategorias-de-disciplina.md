# 27 · Subcategorías de disciplina

**Estado:** **firmado por el founder el 2026-09-21** («apruebo»). · **OL:** OL-101 · **Bitácora:** [136](../bitacora/2026/09/136-subcategorias-de-disciplina.md)

## De dónde sale

L47 de la cola (2026-09-21), founder: «El catálogo de artistas tiene por ejemplo: artes visuales / fotografía. Pero en el creador de artistas no viene esa sub categoría. Los artistas que se registren y sean fotógrafos no podrán especificarlo, solo podrán decir que son artes visuales. Corrige y agrega la sub categoría para que se pueda seleccionar.» Y al aprobar la cola, el mismo día: «el ejemplo lo di con fotografía pero la solución debe solventar casos en los que existen sub categorías o es necesario crear una que no existe.»

## Lo medido (sin tocar nada)

- **`disciplina`** es una lista cerrada de 8 valores (`src/lib/artistas.ts`, `DISCIPLINAS`). **`detalle`** es la subcategoría: texto libre, máximo 40 caracteres (`LIMITES_ARTISTA.detalle`), columna `text` en `artistas` (migración `20260914050000_artistas.sql`).
- El alta y la edición (`FormularioArtista.tsx`) ya tienen el renglón "Qué hace" con los chips de disciplina y, debajo, un campo de texto libre para el detalle — pero ese campo no muestra ni sugiere lo que ya existe. Quien escribe "fotografía" no sabe si ya hay 12 artistas con esa palabra exacta o si acaba de inventar una variante.
- La importación del CAPO (`scripts/capo/capo.ts`) sí conoce subcategorías por disciplina, porque las lee de la ruta de la página del catálogo municipal: música tiene 6 géneros (`GENEROS`), artes visuales tiene 5 técnicas (`VISUALES`: pintura, fotografía, escultura, gráfica, multidisciplina), teatro y danza tienen "compañía de teatro/danza". Circo, cine y letras no traen ninguna. Este mapa es fijo y solo lo usa la importación; el formulario no lo lee.
- **Conteo real en producción** (solo lectura, `select` dentro de `begin…rollback`, sin nombres ni correos):

  | Disciplina | Subcategorías distintas | Sin subcategoría | Total |
  | --- | --- | --- | --- |
  | Música | 7 | 3 | 309 |
  | Artes visuales | 5 | 3 | 88 |
  | Teatro | 1 | 39 | 52 |
  | Danza | 1 | 15 | 28 |
  | Letras | 0 | 31 | 31 |
  | Cine | 0 | 13 | 13 |
  | Circo | 0 | 7 | 7 |

  Las de música y artes visuales son las 6+5 del CAPO. Pero ya hay una séptima en música que **nadie del CAPO puso ahí**: *"productor de música electrónica y dj"*, un solo artista, texto libre, minúsculas — alguien ya escribió una subcategoría nueva a mano, exactamente el caso que el founder quiere resolver bien. Es la prueba de que el problema es real hoy, no hipotético.
- Las funciones SQL `disciplinas_con_artistas(ciudad)` y `detalles_de_disciplina(ciudad, disciplina, minimo)` ya existen (migración `20260914110000_orden_y_filtros.sql`), son `stable` (confirmado `provolatile = 's'` en producción, no escriben nada) y ya están expuestas a `anon`/`authenticated`. Hoy las usa la lista de Artistas para los chips de filtro, con un mínimo de 3 apariciones — ese umbral es correcto para filtrar (una subcategoría con un solo artista no merece chip en la lista), pero es demasiado alto para sugerir durante el alta: ahí interesa toda subcategoría que ya exista, aunque sea una.
- Filtro y lista son **por ciudad** (cada función recibe `p_ciudad`). Una subcategoría ("fotografía") no es un dato de una ciudad: es del vocabulario de la disciplina. Si San Luis Potosí ya tiene "fotografía" y mañana alguien se registra en otra ciudad, debe encontrarla igual — la regla del founder de que el contexto ordena pero no limita ([[feedback-contexto-ordena-no-limita]]) aplica también aquí. La propuesta no filtra por ciudad.

## La propuesta

**No se toca el esquema.** `detalle` sigue siendo el mismo campo de texto libre que ya existe; no hace falta tabla ni columna nueva. Lo que falta es que, al escribir, la persona vea lo que ya existe y pueda usarlo o apartarse de él a propósito — nunca por no saber que ya estaba.

1. **Elegir la disciplina** (como hoy, sin cambio: chips de la lista cerrada).
2. **Si esa disciplina ya tiene subcategorías usadas**, aparecen como chips, las más usadas primero (música y artes visuales las tendrían hoy; teatro/danza solo "compañía de teatro/danza"; circo, cine y letras ninguna — ahí se salta directo al paso 3). Un chip "Otra" al final abre el campo de texto.
3. **Al escribir una subcategoría nueva**, si lo tecleado se parece a una que ya existe (mismo texto sin acentos ni mayúsculas, o muy cercano), se sugiere esa en vez de crear otra: "¿Es lo mismo que **Fotografía**?" con un toque para usarla. Se compara con `normalizarNombre` (la misma función que ya evita artistas duplicados en este mismo formulario, decisión 5 del doc 08) — nada nuevo que aprender, mismo patrón.
4. **Si no se parece a nada**, el texto escrito se guarda tal cual, exactamente como hoy: la ficha queda usable al instante para quien la escribió, sin esperar a nadie. Eso ya funciona porque `detalle` siempre fue de texto libre; lo único que cambia es que antes de guardarla, la persona vio que no existía.
5. **Aparte, para el administrador:** hoy no hay forma de unir "foto" con "Fotografía" si ya se colaron las dos, ni de corregir una subcategoría en varias fichas a la vez. Eso es una pieza propia (un buscador/renombrador en el panel de administración) — no entra aquí. Esta pieza reduce cuánto se necesitará esa herramienta; no la reemplaza.

### De dónde sale la lista de "lo que ya existe"

Se necesita una función nueva y aparte de `detalles_de_disciplina` (esa se queda igual, la sigue usando la lista con su umbral de 3 y su filtro por ciudad): una que devuelva **todas** las subcategorías de una disciplina, sin importar cuántos artistas la usan y sin filtrar por ciudad. Es una migración que solo añade (`create or replace function`, `stable`, sin tocar la tabla). El nombre lo da el gestor.

### Qué NO cambia

- El límite de 40 caracteres del campo, la validación, y que el detalle sea opcional.
- Los 520 artistas del CAPO: esta pieza no los toca (siguen con su origen `capo` y sus subcategorías tal como se importaron).
- El grafo cultural (doc 24): las disciplinas/subcategorías siguen siendo un campo de la ficha del artista, no una ficha en sí ni una conexión. Cuando llegue la pieza de "intereses" del grafo, esta lista de subcategorías reales es justo el vocabulario que necesitaría — no se construye aquí, pero esta pieza no le estorba: al contrario, con el catálogo más limpio (menos "foto"/"Fotografia"/"fotografia" repetidos) esa pieza futura parte de mejores datos.

## Ver también

Prototipo estático: [`prototipos/subcategorias-disciplina.html`](prototipos/subcategorias-disciplina.html).
