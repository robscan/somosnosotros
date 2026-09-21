# Bitácora 136 · Subcategorías de disciplina (OL-101)

**Fecha:** 2026-09-21
**Operador:** Claude Sonnet 5, esfuerzo medio (sesión del Gestor de cambios II)
**Rama:** `subcategorias-disciplina`
**Base:** `origin/main`

## De dónde sale

L47 de la cola: «El catálogo de artistas tiene por ejemplo: artes visuales / fotografía. Pero en el creador de artistas no viene esa sub categoría. Los artistas que se registren y sean fotógrafos no podrán especificarlo, solo podrán decir que son artes visuales. Corrige y agrega la sub categoría para que se pueda seleccionar.» Anotación al aprobar la cola: «el ejemplo lo di con fotografía pero la solución debe solventar casos en los que existen sub categorías o es necesario crear una que no existe».

## Medido (sin tocar código)

- `disciplina` es una lista cerrada de 8 valores; `detalle` (la subcategoría) es texto libre de 40 caracteres, sin sugerencias en el formulario de alta/edición (`FormularioArtista.tsx`).
- La importación del CAPO conoce subcategorías fijas por disciplina (música: 6 géneros; artes visuales: 5 técnicas; teatro/danza: "compañía de..."), pero solo las usa la importación (`scripts/capo/capo.ts`), no el formulario.
- Lectura de producción, solo lectura (`begin…rollback`, `set transaction read only`, solo `select`, sin nombres ni correos; script en el scratchpad de la sesión, `.env` leído sin imprimir la cadena):
  - `disciplinas_con_artistas` y `detalles_de_disciplina` (funciones SQL existentes): `provolatile = 's'` (estables) confirmado antes de considerar llamarlas; finalmente no se llamaron, se usó `select ... group by` directo por ser más simple de auditar.
  - Conteo por disciplina: música 7 subcategorías distintas / 3 sin subcategoría / 309 total; artes visuales 5/3/88; teatro 1/39/52; danza 1/15/28; letras 0/31/31; cine 0/13/13; circo 0/7/7.
  - Hallazgo relevante: una subcategoría de música fuera del catálogo del CAPO ya existe, escrita a mano: "productor de música electrónica y dj" (1 artista, minúsculas). Confirma que el problema ya ocurre, no es hipotético.
- Las funciones SQL ya existentes filtran por ciudad y tienen un umbral mínimo de 3 (pensado para los chips de filtro de la lista, no para sugerir al escribir). Se necesitará una función nueva y aparte, sin ciudad ni umbral, para sugerir "todo lo que ya existe" — es una migración que solo añade, nombre pendiente del gestor.

## Propuesta y prototipo

- Documento: [`docs/rediseno/27-subcategorias-de-disciplina.md`](../../../rediseno/27-subcategorias-de-disciplina.md)
- Prototipo estático (390×844, tokens del canon): [`docs/rediseno/prototipos/subcategorias-disciplina.html`](../../../rediseno/prototipos/subcategorias-disciplina.html) — tres pantallas: disciplina con subcategorías conocidas, escribiendo una que se parece a una existente (se ofrece usarla), y disciplina sin subcategorías todavía (va directo al texto libre).
- Revisado con front-visual antes de mostrarlo: dos fallos visuales encontrados y corregidos mirando la captura (chip activo mal asignado en el marco 1; dos notas de texto traslapadas en el marco 3 por una clase CSS reusada fuera de su contexto de grid).
- Mostrado al founder en un Artifact. **Firmado: «apruebo» (2026-09-21).**

## Código (tras el visto bueno del gestor)

El gestor confirmó recibir la firma (commit `c32af33`) y dio la instrucción de código: nombre de la migración (`supabase/migrations/20260922110000_subcategorias_por_disciplina.sql`, dos reservas antes por nombre pero sin depender de ellas) y las condiciones de la función.

- **`supabase/migrations/20260922110000_subcategorias_por_disciplina.sql`** (sin aplicar: la aplica el gestor). `public.subcategorias_de(p_disciplina text) returns table (detalle text, artistas integer)`, `language sql stable security invoker set search_path = ''`, `where a.visible` (RLS del invocador). Agrupa por `public.normalizar_nombre(detalle)`, devuelve la escritura más usada de cada grupo (no la primera alfabética: se cuenta cuál escritura tiene más artistas dentro del grupo), tope de 40 filas, más usadas primero. `p_disciplina` fuera de la lista cerrada, vacío o sin nada usado → cero filas, sin error. `revoke execute … from public; grant execute … to anon, authenticated;`. Global, no por ciudad (docs/rediseno/27). No toca `detalles_de_disciplina` (se queda con su umbral y su filtro por ciudad, para los chips de la lista).
- **`src/lib/artistas.ts`**: `subcategoriaParecida(existentes, escrito)`, función pura — compara formas normalizadas, exacta o "una es el principio de la otra" (mínimo 3 letras), sin sugerir si ya es exactamente lo mismo que ya existe. 6 casos de prueba en `artistas.test.ts` (acentos/mayúsculas, prefijo en cualquier sentido, sin sugerir lo idéntico, sin confundir palabras cortas ni disciplinas, vacío/una letra, más de una candidata).
- **`src/app/artistas/FormularioArtista.tsx`**: al abrir "Qué hace", si la disciplina elegida ya tiene subcategorías (consulta `subcategorias_de` una vez por disciplina, en caché), aparecen como chips (más usadas primero) con un chip "Otra…"; sin subcategorías conocidas, va directo al texto libre (como antes). Al escribir en "Otra…", si se parece a una ya existente, aviso con "Usar esa". Al cambiar de disciplina se suelta la subcategoría anterior (es de la disciplina, no independiente). Al editar una ficha que ya trae `detalle`, el texto libre empieza abierto (mismo comportamiento que antes de esta pieza). El campo enviado (`name="detalle"`) es el mismo de siempre, visible o en un input oculto según el estado — no cambia cómo se guarda.

### Verificación

- **Banco PGlite** (`supabase/tests/subcategorias_disciplina.mjs`, `PGLITE=/tmp/pglite node supabase/tests/subcategorias_disciplina.mjs`): 45 migraciones aplicadas, **11 comprobaciones en verde** — une variantes de escritura en un solo grupo con la más usada como etiqueta, cuenta artistas de otra ciudad (no filtra por ciudad), no cuenta ocultos, disciplina rara/vacía/sin uso → cero filas, no mezcla disciplinas, `anon` y `authenticated` pueden llamarla, `STABLE`/`security invoker`/`search_path` vacío confirmados en `pg_proc`.
- **`npm run lint && npm run typecheck && npm test`**: lint 0 errores (1 aviso preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **718 pruebas en verde** (24 en `artistas.test.ts`, con los 6 casos nuevos).
- **`npm run build`**: verde, sin rutas nuevas en el árbol final.
- **Verificación visual del componente real** (no solo el prototipo): sin `.env` real ni producción, un servidor local falso (Node, en el scratchpad, nunca commiteado) respondió los dos RPC que llama el formulario (`subcategorias_de`, `artistas_con_nombre`) con datos inventados, y una página de solo desarrollo (`src/app/dev-preview-subcategorias`, creada y borrada en la misma sesión, nunca commiteada) montó `FormularioArtista` sin sesión. Con front-visual, a 390×844, se vieron y probaron con el dedo (clics reales) las tres pantallas del prototipo ya firmado, esta vez con el código real: Artes visuales muestra los 5 chips de subcategoría en el orden esperado (Fotografía, Pintura, Multidisciplina, Gráfica, Escultura) más "Otra…"; al escribir "Foto" con "Otra…" abierto aparece "Ya hay 12 artistas con «Fotografía»" y "Usar esa" la aplica y cierra el texto libre; al cambiar a Artes circenses (sin subcategorías conocidas) se va directo al texto libre y se limpia lo anterior. No quedó captura en PNG en el scratchpad: no hay simulador ni Playwright instalado en este entorno y el panel del navegador no guarda la imagen en disco: la evidencia es la interacción real descrita arriba, verificada mirando cada pantalla (regla front-visual), no solo generada. Si el gestor o el founder piden el archivo PNG en sí, puedo instalar Playwright para producirlo (pieza aparte, cuesta una dependencia nueva).
- Hallazgo aparte, no tocado (fuera de alcance): al montar el formulario en la vista de desarrollo, la consola marca que `Campo` reenvía la prop `mostrarContador` a un elemento del DOM (ya existía antes de esta pieza, confirmado revirtiendo temporalmente los cambios con `git stash`); lo dejo anotado, no lo arreglo aquí.
- No se tocaron los 520 artistas del CAPO ni `detalles_de_disciplina` (la función de los chips de filtro de la lista, que sigue igual).

## Entrega

Commit local (rama `subcategorias-disciplina`, sin push): ver hash en el mensaje al gestor. Migración sin aplicar — la aplica el gestor con autorización del founder.
