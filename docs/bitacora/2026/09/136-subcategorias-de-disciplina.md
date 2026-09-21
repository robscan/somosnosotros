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

## Siguiente paso

Aviso al gestor con la firma antes de escribir código (regla del proyecto). Código pendiente de su instrucción.
