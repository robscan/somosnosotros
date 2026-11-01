# 530 · OL-498 · La portada de Administración deja de esperar: `instagram_falta_material` reescrita y la portada por bloques

**Fecha:** 2026-10-31. **Rama:** `admin-sin-espera` (desde `origin/main` `8c53dd74` con `origin/carga-rendimiento`, la auditoría OL-497).
**Quién:** operador del Gestor de cambios VII (agente en árbol aislado, sin subagentes, council ni workflows). **Migración:**
`20261029310000_falta_material_rapida.sql` (reemplaza una función con la misma firma; no toca tablas ni permisos). **Sin variables de entorno
nuevas.** **Estado:** listo para revisar; falta la medición de la función en producción (la hace el gestor) y la prueba del founder en su iPhone.

> Palabras que se repiten (cada una en una línea):
> - **Bloque**: cada parte de la portada que llega por su cuenta (Pendiente, los números, las cuentas de Gestionar, la línea de cada renglón).
> - **Armazón**: lo que se pinta antes que los datos: la barra, los títulos y los renglones fijos.
> - **Espera** o **esqueleto**: la forma gris de lo que viene, del mismo tamaño, para que nada salte al llegar.
> - **`Suspense`**: la pieza de React que manda la pantalla por partes; cada bloque en el suyo.
> - **Prefetch**: lo que Next adelanta en segundo plano al ver un enlace.
> - **En camino**: el renglón tocado mientras el servidor responde (`ui/EnCamino`).

## El pedido

El founder siente que la sección de Administración «toma bastante tiempo antes de mostrar algo». El gestor midió en producción, con la
identidad de la administración, que `instagram_falta_material('san-luis-potosi', <lunes>)` tarda **3 648 ms** (2 880 341 bloques leídos para 14
filas) y `panel_resumen()` ~180 ms, y que la portada espera a la función dentro de su `Promise.all` antes de pintar nada. El encargo: reescribir la
función (misma firma, mismo resultado, < 50 ms en el banco), partir la portada por bloques sin cambiar lo firmado, los dos parches de 30 minutos del
acta del council (condición 9) y medir antes y después.

## 1 · `instagram_falta_material` sin recorrer todos los eventos por cada ficha (commit `2b9d4354`)

**Por qué era lenta.** Para cada artista o lugar sin material (900 de 950 en el banco: el Catálogo CAPO casi no tiene fotos) buscaba su próxima
fecha con un `join lateral` sobre **toda** la tabla `eventos` por fecha, preguntando en cada evento si la ficha estaba en él y convirtiendo su hora
con su zona (`p_desde::timestamp at time zone e.zona`, por fila: así el índice de `inicio` no sirve para acotar). Crece al cuadrado.

**Cómo va ahora** (migración `supabase/migrations/20261029310000_falta_material_rapida.sql`, `create or replace` con la misma firma, las mismas
columnas, `security definer`, `search_path = ''`, solo `es_admin()`, `authenticated` y `service_role` con permiso y `anon` sin él):

1. Primero el conjunto chico: los eventos visibles (no borrador, no cancelados, no retirados) de la ventana de 30 días desde `p_desde`. Se leen por
   el índice `eventos_inicio_idx` con un margen de un día en UTC (las zonas van de −12 a +14 h) y se recortan con los límites exactos (desde el
   lunes a medianoche en su zona, o desde ahora si la semana ya empezó; hasta 30 días después), calculados **una vez por zona distinta**.
2. De esos eventos, sus artistas (`eventos_artistas`) y sus lugares (`lugar_id`), y la primera fecha de cada ficha (`distinct on`).
3. Solo sobre esas fichas: qué les falta y qué más, la ciudad (el slug de cada texto de ciudad se calcula una vez, no por fila), lo publicado en 6
   meses (dos `exists` por índice en vez de un `or`), el orden y el tope de 100.
4. Solo sobre las 100 que salen: quién la lleva y si ya se le pidió esa semana.

Un empate exacto de hora entre dos eventos de la misma ficha se resuelve ahora por el id del evento (antes quedaba al azar del plan).

**Mismo resultado, comprobado de dos maneras:**

- Prueba nueva `supabase/tests/pg/instagram-sin-material-rapida.test.mjs`: crea una copia de la función de antes (su cuerpo tal cual está en la
  migración `20261029240000`, en un esquema de prueba) y compara las dos **fila por fila, todas las columnas**, en todas las ciudades del banco y en
  tres semanas (la pasada, esta y la que viene), sobre los datos de las pruebas anteriores y un juego propio que toca cada caso: la ficha y su
  próxima fecha en ciudades distintas (y la primera fecha en otra ciudad con una posterior aquí, que no sale), eventos ocultos, cancelados, en
  borrador y retirados, lo que ya pasó esta semana, los cuatro bordes de la ventana en Kiritimati (+14 h) y Pago Pago (−11 h), lugares privados u
  ocultos, quien dijo que no, publicadas hace 1 y 7 meses, el pedido de la semana, quién la lleva y 105 fichas con la misma fecha (el tope de 100 y
  el desempate por nombre). Además comprueba la firma, las columnas, `security definer`, `search_path` y los permisos. Corre dentro de una
  transacción que se deshace: no deja datos ni el esquema para las pruebas que siguen. **3 068 pruebas, 0 fallaron.**
- En el banco de la auditoría (`banco-funciones.mjs`, 700 artistas y 1 500 eventos): 24 comparaciones (seis ciudades × cuatro semanas, 701 filas),
  **0 distintas**.

**Cuánto tarda** (Postgres 17 en la Mac, sesión de la administración, rol `authenticated`, mediana):

| | Antes | Ahora |
| --- | --- | --- |
| Banco ×1 (700 artistas, 1 500 eventos) | 437 ms · 1 246 127 bloques | **5,2 ms** · 1 230 bloques |
| Banco ×10 (7 000 artistas, 15 000 eventos) | 64 704 ms · 128 276 101 bloques (45,7 s en la bitácora 529) | **22,8 ms** · 6 894 bloques |
| Producción (lo mide el gestor) | 3 648 ms · 2 880 341 bloques · 14 filas | objetivo < 150 ms |

Para medir en producción, la misma consulta de la condición 1 del acta: `select set_config('request.jwt.claims', '{"sub":"<uuid del admin>",
"role":"authenticated"}', true); set local role authenticated; explain (analyze, buffers) select count(*) from public.instagram_falta_material(
'san-luis-potosi', '2026-10-26');` y comprobar que el plan no diga `One-Time Filter: false` ni `(never executed)`.

Los `explain (analyze, buffers)` del cuerpo de la función (el mismo texto de cada migración, preparado con `$1`/`$2` y ejecutado como su dueño,
que es como corre `security definer`), banco ×1, `san-luis-potosi`, lunes 2026-10-26:

<details><summary>Antes: 618 ms, 1 246 127 bloques (el <code>Index Scan</code> sobre <code>eventos</code> corre 935 veces, una por ficha)</summary>

```
Limit (actual time=617.405..618.890 rows=100 loops=1)
  Buffers: shared hit=1246127
  ->  Result (actual time=617.404..618.886 rows=100 loops=1)
        Buffers: shared hit=1246127
        ->  Sort (actual time=617.126..617.131 rows=100 loops=1)
              Sort Key: prox.inicio, "*SELECT* 1".nombre, "*SELECT* 1".id
              Sort Method: quicksort  Memory: 62kB
              Buffers: shared hit=1245423
              ->  Result (actual time=5.258..617.082 rows=138 loops=1)
                    One-Time Filter: (es_admin() AND (('2026-10-26'::cstring)::date IS NOT NULL))
                    Buffers: shared hit=1245423
                    ->  Nested Loop Anti Join (actual time=5.226..616.929 rows=138 loops=1)
                          Join Filter: ((ip.artista_id = "*SELECT* 1".id) OR (ip.lugar_id = "*SELECT* 1".id))
                          Rows Removed by Join Filter: 5520
                          Buffers: shared hit=1245421
                          ->  Nested Loop (actual time=5.216..616.684 rows=138 loops=1)
                                Buffers: shared hit=1245420
                                ->  Append (actual time=0.006..7.642 rows=935 loops=1)
                                      Buffers: shared hit=31
                                      ->  Subquery Scan on "*SELECT* 1" (actual time=0.006..4.990 rows=700 loops=1)
                                            Buffers: shared hit=20
                                            ->  Nested Loop Anti Join (actual time=0.006..4.952 rows=700 loops=1)
                                                  Join Filter: (f_1.artista_id = a.id)
                                                  Buffers: shared hit=20
                                                  ->  Seq Scan on artistas a (actual time=0.003..2.205 rows=700 loops=1)
                                                        Filter: (visible AND (cardinality(array_remove(ARRAY[CASE WHEN (COALESCE(btrim(foto), ''::text) = ''::text) THEN 'foto'::text WHEN (NOT instagram_material_propio(foto)) THEN 'foto_ajena'::text ELSE NULL::text END, CASE WHEN (COALESCE(btrim(portada), ''::text) = ''::text) THEN 'portada'::text WHEN (NOT instagram_material_propio(portada)) THEN 'portada_ajena'::text ELSE NULL::text END], NULL::text)) > 0))
                                                        Buffers: shared hit=20
                                                  ->  Seq Scan on instagram_fuera f_1 (actual time=0.000..0.000 rows=0 loops=700)
                                      ->  Subquery Scan on "*SELECT* 2" (actual time=0.008..2.619 rows=235 loops=1)
                                            Buffers: shared hit=11
                                            ->  Nested Loop Anti Join (actual time=0.008..2.605 rows=235 loops=1)
                                                  Join Filter: (f_2.lugar_id = l.id)
                                                  Buffers: shared hit=11
                                                  ->  Seq Scan on lugares l (actual time=0.005..1.278 rows=235 loops=1)
                                                        Filter: (visible AND (NOT privado) AND (cardinality(array_remove(ARRAY[CASE WHEN (COALESCE(btrim(portada), ''::text) = ''::text) THEN 'portada'::text WHEN (NOT instagram_material_propio(portada)) THEN 'portada_ajena'::text ELSE NULL::text END], NULL::text)) > 0))
                                                        Rows Removed by Filter: 15
                                                        Buffers: shared hit=11
                                                  ->  Seq Scan on instagram_fuera f_2 (actual time=0.000..0.000 rows=0 loops=235)
                                ->  Subquery Scan on prox (actual time=0.651..0.651 rows=0 loops=935)
                                      Filter: ((ciudad_slug("*SELECT* 1".ciudad) = 'san-luis-potosi'::text) OR (ciudad_slug(prox.ciudad) = 'san-luis-potosi'::text))
                                      Rows Removed by Filter: 0
                                      Buffers: shared hit=1245389
                                      ->  Limit (actual time=0.645..0.645 rows=0 loops=935)
                                            Buffers: shared hit=1245151
                                            ->  Index Scan using eventos_inicio_idx on eventos e (actual time=0.645..0.645 rows=0 loops=935)
                                                  Filter: ((NOT borrador) AND (NOT cancelado) AND (NOT retirado_por_admin) AND (inicio < (((('2026-10-26'::cstring)::date + 30))::timestamp without time zone AT TIME ZONE zona)) AND (inicio >= GREATEST(((('2026-10-26'::cstring)::date)::timestamp without time zone AT TIME ZONE zona), now())) AND CASE WHEN ("*SELECT* 1".tipo = 'artista'::text) THEN (ANY (id = (hashed SubPlan 4).col1)) ELSE (lugar_id = "*SELECT* 1".id) END)
                                                  Rows Removed by Filter: 1355
                                                  Buffers: shared hit=1245151
                                                  SubPlan 4
                                                    ->  Bitmap Heap Scan on eventos_artistas ea (actual time=0.001..0.001 rows=2 loops=700)
                                                          Recheck Cond: (artista_id = "*SELECT* 1".id)
                                                          Heap Blocks: exact=629
                                                          Buffers: shared hit=2029
                                                          ->  Bitmap Index Scan on eventos_artistas_artista_idx (actual time=0.000..0.000 rows=2 loops=700)
                                                                Index Cond: (artista_id = "*SELECT* 1".id)
                                                                Buffers: shared hit=1400
                          ->  Materialize (actual time=0.000..0.001 rows=40 loops=138)
                                Buffers: shared hit=1
                                ->  Seq Scan on instagram_publicaciones ip (actual time=0.002..0.006 rows=40 loops=1)
                                      Filter: ((estado = 'publicada'::text) AND (creado_en >= (now() - '6 mons'::interval)))
                                      Buffers: shared hit=1
                    SubPlan 2
                      ->  Aggregate (actual time=0.001..0.001 rows=1 loops=138)
                            ->  Seq Scan on instagram_material_pedidos m (actual time=0.000..0.000 rows=0 loops=138)
                                  Filter: (((artista_id = "*SELECT* 1".id) OR (lugar_id = "*SELECT* 1".id)) AND (semana = ('2026-10-26'::cstring)::date))
        SubPlan 1
          ->  Index Scan using perfiles_pkey on perfiles p (actual time=0.000..0.000 rows=0 loops=100)
                Index Cond: (id = (instagram_quien_lleva("*SELECT* 1".tipo, "*SELECT* 1".id))[1])
Planning:
  Buffers: shared hit=35
Planning Time: 0.451 ms
Execution Time: 618.924 ms
```
</details>

<details><summary>Ahora: 4,3 ms, 1 230 bloques (un solo <code>Bitmap Index Scan</code> de 158 eventos)</summary>

```
Subquery Scan on c (actual time=2.543..4.187 rows=100 loops=1)
  Buffers: shared hit=1230
  CTE previos
    ->  Result (actual time=0.037..0.065 rows=158 loops=1)
          One-Time Filter: (es_admin() AND (('2026-10-26'::cstring)::date IS NOT NULL))
          Buffers: shared hit=49
          ->  Bitmap Heap Scan on eventos e (actual time=0.009..0.031 rows=158 loops=1)
                Recheck Cond: ((inicio >= GREATEST((((('2026-10-26'::cstring)::date)::timestamp without time zone AT TIME ZONE 'UTC'::text) - '1 day'::interval), now())) AND (inicio < ((((('2026-10-26'::cstring)::date + 30))::timestamp without time zone AT TIME ZONE 'UTC'::text) + '1 day'::interval)) AND visible)
                Filter: ((NOT borrador) AND (NOT cancelado) AND (NOT retirado_por_admin))
                Heap Blocks: exact=44
                Buffers: shared hit=47
                ->  Bitmap Index Scan on eventos_inicio_idx (actual time=0.006..0.006 rows=158 loops=1)
                      Index Cond: ((inicio >= GREATEST((((('2026-10-26'::cstring)::date)::timestamp without time zone AT TIME ZONE 'UTC'::text) - '1 day'::interval), now())) AND (inicio < ((((('2026-10-26'::cstring)::date + 30))::timestamp without time zone AT TIME ZONE 'UTC'::text) + '1 day'::interval)))
                      Buffers: shared hit=3
  CTE ventana
    ->  Hash Join (actual time=0.095..0.171 rows=155 loops=1)
          Hash Cond: (p.zona = p_1.zona)
          Join Filter: ((p.inicio < (((('2026-10-26'::cstring)::date + 30))::timestamp without time zone AT TIME ZONE p_1.zona)) AND (p.inicio >= GREATEST(((('2026-10-26'::cstring)::date)::timestamp without time zone AT TIME ZONE p_1.zona), now())))
          Rows Removed by Join Filter: 3
          Buffers: shared hit=49
          ->  CTE Scan on previos p (actual time=0.037..0.041 rows=158 loops=1)
                Buffers: shared hit=6
          ->  Hash (actual time=0.055..0.055 rows=1 loops=1)
                Buckets: 1024  Batches: 1  Memory Usage: 9kB
                Buffers: shared hit=43
                ->  HashAggregate (actual time=0.054..0.055 rows=1 loops=1)
                      Group Key: p_1.zona
                      Batches: 1  Memory Usage: 24kB
                      Buffers: shared hit=43
                      ->  CTE Scan on previos p_1 (actual time=0.000..0.046 rows=158 loops=1)
                            Buffers: shared hit=43
  CTE proxima
    ->  Unique (actual time=0.371..0.391 rows=195 loops=1)
          Buffers: shared hit=59
          ->  Sort (actual time=0.371..0.377 rows=296 loops=1)
                Sort Key: "*SELECT* 1".tipo, "*SELECT* 1".ficha, "*SELECT* 1".inicio, "*SELECT* 1".evento
                Sort Method: quicksort  Memory: 59kB
                Buffers: shared hit=59
                ->  Append (actual time=0.205..0.299 rows=296 loops=1)
                      Buffers: shared hit=59
                      ->  Subquery Scan on "*SELECT* 1" (actual time=0.205..0.275 rows=141 loops=1)
                            Buffers: shared hit=59
                            ->  Hash Join (actual time=0.205..0.270 rows=141 loops=1)
                                  Hash Cond: (ea.evento_id = v.id)
                                  Buffers: shared hit=59
                                  ->  Seq Scan on eventos_artistas ea (actual time=0.002..0.030 rows=1200 loops=1)
                                        Buffers: shared hit=10
                                  ->  Hash (actual time=0.201..0.201 rows=155 loops=1)
                                        Buckets: 1024  Batches: 1  Memory Usage: 25kB
                                        Buffers: shared hit=49
                                        ->  CTE Scan on ventana v (actual time=0.095..0.192 rows=155 loops=1)
                                              Buffers: shared hit=49
                      ->  Subquery Scan on "*SELECT* 2" (actual time=0.001..0.012 rows=155 loops=1)
                            ->  CTE Scan on ventana v_1 (actual time=0.000..0.006 rows=155 loops=1)
                                  Filter: (lugar_id IS NOT NULL)
  CTE sin
    ->  Append (actual time=0.378..1.854 rows=188 loops=1)
          Buffers: shared hit=520
          ->  Nested Loop Anti Join (actual time=0.378..0.666 rows=71 loops=1)
                Join Filter: (f_2.artista_id = a.id)
                Buffers: shared hit=272
                ->  Nested Loop (actual time=0.374..0.533 rows=71 loops=1)
                      Buffers: shared hit=272
                      ->  CTE Scan on proxima p_2 (actual time=0.372..0.403 rows=71 loops=1)
                            Filter: (tipo = 'artista'::text)
                            Rows Removed by Filter: 124
                            Buffers: shared hit=59
                      ->  Index Scan using artistas_pkey on artistas a (actual time=0.002..0.002 rows=1 loops=71)
                            Index Cond: (id = p_2.ficha)
                            Filter: (visible AND (cardinality(array_remove(ARRAY[CASE WHEN (COALESCE(btrim(foto), ''::text) = ''::text) THEN 'foto'::text WHEN (NOT instagram_material_propio(foto)) THEN 'foto_ajena'::text ELSE NULL::text END, CASE WHEN (COALESCE(btrim(portada), ''::text) = ''::text) THEN 'portada'::text WHEN (NOT instagram_material_propio(portada)) THEN 'portada_ajena'::text ELSE NULL::text END], NULL::text)) > 0))
                            Buffers: shared hit=213
                ->  Seq Scan on instagram_fuera f_2 (actual time=0.000..0.000 rows=0 loops=71)
          ->  Nested Loop Anti Join (actual time=0.040..1.182 rows=117 loops=1)
                Join Filter: (f_3.lugar_id = l.id)
                Buffers: shared hit=248
                ->  Nested Loop (actual time=0.022..0.580 rows=117 loops=1)
                      Buffers: shared hit=248
                      ->  CTE Scan on proxima p_3 (actual time=0.002..0.011 rows=124 loops=1)
                            Filter: (tipo = 'lugar'::text)
                            Rows Removed by Filter: 71
                      ->  Index Scan using lugares_pkey on lugares l (actual time=0.004..0.004 rows=1 loops=124)
                            Index Cond: (id = p_3.ficha)
                            Filter: (visible AND (NOT privado) AND (cardinality(array_remove(ARRAY[CASE WHEN (COALESCE(btrim(portada), ''::text) = ''::text) THEN 'portada'::text WHEN (NOT instagram_material_propio(portada)) THEN 'portada_ajena'::text ELSE NULL::text END], NULL::text)) > 0))
                            Rows Removed by Filter: 0
                            Buffers: shared hit=248
                ->  Seq Scan on instagram_fuera f_3 (actual time=0.000..0.000 rows=0 loops=117)
  CTE slugs
    ->  Subquery Scan on x (actual time=0.135..0.204 rows=4 loops=1)
          Buffers: shared hit=4
          ->  HashAggregate (actual time=0.052..0.053 rows=4 loops=1)
                Group Key: s_1.ciudad
                Batches: 1  Memory Usage: 24kB
                ->  Append (actual time=0.000..0.036 rows=376 loops=1)
                      ->  CTE Scan on sin s_1 (actual time=0.000..0.007 rows=188 loops=1)
                      ->  CTE Scan on sin s_2 (actual time=0.000..0.010 rows=188 loops=1)
  ->  Limit (actual time=2.339..2.346 rows=100 loops=1)
        Buffers: shared hit=526
        ->  Sort (actual time=2.339..2.343 rows=100 loops=1)
              Sort Key: s.proxima_inicio, s.nombre, s.id
              Sort Method: quicksort  Memory: 62kB
              Buffers: shared hit=526
              ->  Nested Loop Left Join (actual time=2.198..2.312 rows=138 loops=1)
                    Join Filter: (NOT (sp.c IS DISTINCT FROM s.proxima_ciudad))
                    Rows Removed by Join Filter: 564
                    Filter: ((sf.s = 'san-luis-potosi'::text) OR (sp.s = 'san-luis-potosi'::text))
                    Rows Removed by Filter: 50
                    Buffers: shared hit=526
                    ->  Nested Loop Left Join (actual time=2.197..2.258 rows=188 loops=1)
                          Join Filter: (NOT (sf.c IS DISTINCT FROM s.ciudad))
                          Rows Removed by Join Filter: 564
                          Buffers: shared hit=526
                          ->  Hash Right Anti Join (actual time=1.992..2.003 rows=188 loops=1)
                                Hash Cond: (ip_1.lugar_id = s.id)
                                Buffers: shared hit=522
                                ->  Seq Scan on instagram_publicaciones ip_1 (actual time=0.001..0.005 rows=40 loops=1)
                                      Filter: ((estado = 'publicada'::text) AND (creado_en >= (now() - '6 mons'::interval)))
                                      Buffers: shared hit=1
                                ->  Hash (actual time=1.983..1.984 rows=188 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 53kB
                                      Buffers: shared hit=521
                                      ->  Hash Right Anti Join (actual time=1.949..1.961 rows=188 loops=1)
                                            Hash Cond: (ip.artista_id = s.id)
                                            Buffers: shared hit=521
                                            ->  Seq Scan on instagram_publicaciones ip (actual time=0.002..0.013 rows=40 loops=1)
                                                  Filter: ((estado = 'publicada'::text) AND (creado_en >= (now() - '6 mons'::interval)))
                                                  Buffers: shared hit=1
                                            ->  Hash (actual time=1.933..1.933 rows=188 loops=1)
                                                  Buckets: 1024  Batches: 1  Memory Usage: 53kB
                                                  Buffers: shared hit=520
                                                  ->  CTE Scan on sin s (actual time=0.379..1.907 rows=188 loops=1)
                                                        Buffers: shared hit=520
                          ->  CTE Scan on slugs sf (actual time=0.001..0.001 rows=4 loops=188)
                                Buffers: shared hit=4
                    ->  CTE Scan on slugs sp (actual time=0.000..0.000 rows=4 loops=188)
  SubPlan 6
    ->  Index Scan using perfiles_pkey on perfiles p_4 (actual time=0.000..0.000 rows=0 loops=100)
          Index Cond: (id = (instagram_quien_lleva(c.tipo, c.id))[1])
  SubPlan 7
    ->  Aggregate (actual time=0.000..0.000 rows=1 loops=100)
          ->  Seq Scan on instagram_material_pedidos m (actual time=0.000..0.000 rows=0 loops=100)
                Filter: ((artista_id = c.id) AND (semana = ('2026-10-26'::cstring)::date))
  SubPlan 8
    ->  Aggregate (actual time=0.000..0.000 rows=1 loops=100)
          ->  Seq Scan on instagram_material_pedidos m_1 (actual time=0.000..0.000 rows=0 loops=100)
                Filter: ((lugar_id = c.id) AND (semana = ('2026-10-26'::cstring)::date))
Planning:
  Buffers: shared hit=60
Planning Time: 0.495 ms
Execution Time: 4.258 ms
```
</details>

## 2 · La portada por bloques (commit `833798d0`)

Lo firmado (variante C, bitácoras 525 y 526) no cambia: los cinco bloques en su orden, sus textos y «@smsnstrsapp · 4 publicadas esta semana · 5
sin material» en el renglón de Instagram (se queda, como recomendó el council, M5). Lo que cambia es **cuándo** llega cada cosa:

- **El armazón** (`src/app/admin/PortadaAdmin.tsx`): la barra, los títulos de los cinco bloques, «Ver todos los números ›» y los renglones de
  Gestionar, Difusión y Herramientas (con su nombre y su enlace: ya se pueden tocar) se pintan en cuanto se sabe que quien entra es de la
  administración (una lectura, `usuarioActual`). Las líneas de Grafo cultural y Obras colectivas son fijas y salen ya.
- **Cada bloque en su `Suspense`** (`src/app/admin/page.tsx`), y cada uno hace solo sus lecturas:

  | Bloque | Lo que lee | Su espera |
  | --- | --- | --- |
  | Pendiente | `panel_pendientes`, `panel_ciudades` (propuestas), `showcase_evidencias` (por aprobar), `redes_trabajos` + `instagram_conexion` | su título y tres renglones grises |
  | Esta semana en números | `panel_resumen`, `panel_aportes` | el título, la nota y cuatro cuadros grises |
  | Gestionar (cuentas y líneas) | `panel_resumen` (la misma lectura que los números) | los cuatro renglones con su línea y su cuenta en gris |
  | Línea de Instagram | `instagram_publicaciones` (conteo) y `instagram_falta_material` | la línea en gris |
  | Línea de Showcase | dos conteos | la línea en gris |
  | Líneas de Ciudades y Rutinas | `panel_ciudades` (la misma de Pendiente), `configuracion` | la línea en gris |

  Todas las lecturas salen a la vez al entrar (la página crea las promesas y cada bloque espera las suyas). **Nada espera a
  `instagram_falta_material`**: el `Promise.all` de `portada.ts` se partió en `cargarInstagramPendiente` (Pendiente) y `cargarInstagramLinea` (la
  línea). Pendiente llega cuando están sus cuatro lecturas juntas: nunca «Nada pendiente» y medio segundo después un renglón rojo (M6).
- **Errores por bloque, en llano**: si falla una de las lecturas de Pendiente que no son los reportes (las propuestas, el showcase o el último
  trabajo de Instagram), ya no dice «Nada pendiente»: dice **«No pudimos leer todo lo pendiente.»** con «Intentar de nuevo». Los demás siguen como
  estaban («No pudimos leer los números.», «No pudimos leer Voy y Me interesa.», «No pudimos leer las ciudades»); una lectura que falla nunca tumba
  a otro bloque.
- **Los esqueletos con la forma de lo que llega.** Tres piezas nuevas en `ui/Esqueleto`: `EsqueletoLinea` (una línea dentro de su texto, del alto de
  su letra; con `muestra`, un texto del largo típico, invisible y fuera del lector de pantalla, que solo da la medida: la barra gris se parte en
  renglones donde se partirá el de verdad, porque a 390 la línea de Instagram, la de Showcase, la de Rutinas y la de Personas ocupan dos),
  `EsqueletoAjuste` (una fila de Ajustes en gris) y `EsqueletoRenglones` con varias líneas de meta. Los cuadros de los números en espera son el mismo
  cuadro con sus mismas piezas (nombre, cifra, base y cambio) en gris. Medido con la captura: **los títulos no se mueven ni un píxel** entre la
  espera y lo que llega, los cuadros miden lo mismo (177, 177, 141 y 141 px a 390) y cada renglón mide lo mismo con su línea en gris que con su texto.
- **La espera de `/admin`** (`admin/loading.tsx` → `EsperaAdmin`): en la portada, el mismo armazón con todo en gris (antes, siete barras sin forma);
  en las listas, las siete barras de siempre. Es un componente de cliente a propósito: con la espera en el servidor, su árbol viajaba dentro de los
  datos de **cada** pantalla de Administración (+20 KB medidos en Instagram); así vive una vez en el JavaScript, en la caché del teléfono.
- **La memoria de scroll** (`MemoriaScroll`) repone el desplazamiento cuando no queda nada con `aria-busy` en la página: las esperas de Pendiente y
  de los números lo llevan, las líneas no (miden lo mismo con texto o sin él). Así, al volver con Atrás, repone cuando ya llegaron Pendiente y los
  números, no antes (acta, huecos).
- **Un ajuste de aire**: la regla que separa las propuestas por revisar de los reclamos (`.porRevisar + *`, 12 px) también se le aplicaba al título
  «Esta semana en números». Con los bloques, mientras llegan los números hay un marcador de React entre los dos y el título saltaba 8 px al llegar.
  Ahora la regla no toca al título (`.porRevisar + :not(h2)`): ese título deja sus 20 px, como todos los demás. Es el único cambio de medida (pregunta 2).
- `RenglonShowcase.tsx` se va: su renglón es uno más del armazón y su línea, un bloque.

## 3 · Los parches del acta (commits `833798d0` y `507d4293`)

- **`src/app/admin/instagram/loading.tsx`**: la espera propia de Administración › Instagram, con la forma de la pantalla: la barra de verdad
  (Atrás a Administración), el chip de la ciudad, las dos pestañas y el botón de la conexión en gris y renglones grises de cuatro líneas, como los de
  la lista. Ya no se ve la espera de la portada ni las siete barras.
- **`prefetch={false}` en el renglón «Instagram»** de la portada (M8). Ver la nota de la medición: en este montaje el prefetch no corría la pantalla
  de Instagram, y quitarlo retrasa su espera gris (pregunta 1).
- **`EnCamino` en los renglones `ajuste` de Administración**: los de la portada, los de Pendiente, Corridas, Obras colectivas, Showcase (Hallazgos,
  ficha, Por aprobar, candidatos), la ficha de una corrida y el renglón «Administración» de Ajustes. Mientras el servidor responde, la fila se tiñe
  del fondo suave y su chevron late en el color de acción (sin movimiento con `prefers-reduced-motion`); el marcador no se ve ni se lee. Medido: la
  señal del toque llega a los **9 ms** (antes, con el toque rápido, 1 142 ms sin ninguna señal).

## 4 · Medido antes y después

`scripts/ops/auditoria-ui/medir-tiempos.mjs` (de la auditoría, con tres cambios: `--solo` acepta varias pantallas; «contenido» de la portada es
**Pendiente a la vista**, `data-bloque="pendiente"` con la portada nueva y toda la pantalla con la de antes, y solo cuenta lo que se ve, no lo que
React tiene escondido en un `div hidden`; y la navegación anota la **señal del toque**: la espera o el renglón en camino). La app compilada contra el
respaldo local, Chrome de la Mac como iPhone a 390×844 con Fast 3G y CPU ×4, 5 corridas, mediana. «Caliente» = la app instalada (el JavaScript ya
está en el teléfono). **Antes**: `origin/main` + la auditoría, con la función a 3 648 ms (lo que midió el gestor en producción). **Después**: esta
rama, con la función a 150 ms (el tope que se espera en producción); y una corrida más con la función todavía a 3 648 ms, para ver que la portada ya
no la espera.

**Con 80 ms por consulta:**

| | Antes | Después (función 150 ms) | Después, función aún a 3 648 ms |
| --- | --- | --- | --- |
| **Administración, app instalada:** primer pintado (FCP) | 4 196 ms | **660 ms** | 648 ms |
| Pendiente a la vista | 4 163 ms | **935 ms** | 930 ms |
| Contenido completo (último cambio) | 4 163 ms | **935 ms** | 4 080 ms (llega la línea de Instagram) |
| **Administración, primera visita:** FCP · Pendiente · completo | 4 192 · 4 161 · 4 552 ms | 1 800 · 1 779 · 3 974 ms | 1 928 · 1 905 · 4 450 ms |
| En el servidor: Pendiente en el HTML · fin del HTML | 4 108 · 4 200 ms | **370 · 604 ms** | 374 · 4 105 ms |
| Consultas · cadena en serie más larga | 22 · 5 | 22 · 5 | 22 · 5 |
| Inicio → Administración (botón de la barra): espera · Pendiente | 42 · 4 732 ms | 53 · **1 363 ms** | 55 · 1 349 ms |
| **Instagram, app instalada:** FCP · contenido · completo | 4 348 · 4 304 · 4 342 ms | **652 · 929 · 955 ms** | 652 · 4 284 · 4 311 ms |
| Instagram, primera visita: FCP · contenido · completo | 4 312 · 4 275 · 5 244 ms | 1 596 · 1 887 · 5 177 ms | 1 924 · 4 282 · 5 528 ms |
| En el servidor: contenido · consultas · cadena | 4 287 ms · 26 · 7 | 787 ms · 26 · 7 | 4 291 ms · 26 · 7 |
| Administración → Instagram (su renglón): señal del toque · espera gris · contenido | 36 · 36 · 5 148 ms | **9** · 614 · **1 467 ms** | 9 · 617 · 4 364 ms |
| … tocado en cuanto se ve: señal · espera · contenido | **1 142** · 1 142 · 5 141 ms | **10** · 617 · 1 915 ms | 9 · 616 · 4 361 ms |

**Con 30 ms por consulta** (si Vercel y Supabase están en la misma región; antes y después con la misma función que arriba):

| | Antes | Después |
| --- | --- | --- |
| Administración, app instalada: FCP · Pendiente · completo | 3 896 · 3 863 · 3 863 ms | **648 · 933 · 933 ms** |
| Administración, en el servidor: Pendiente en el HTML · fin | 3 848 · 3 887 ms | **166 · 349 ms** |
| Instagram, app instalada: FCP · contenido | 3 960 · 3 925 ms | **648 · 923 ms** |
| Inicio → Administración: Pendiente | 4 474 ms | **1 366 ms** |
| Administración → Instagram: señal · contenido | 34 · 4 748 ms | **9** · 1 470 ms |

Lo que se lee en las tablas:

- **El primer pintado de la portada baja de ~4,2 s a ~0,65 s** con la app instalada y Pendiente se ve a los ~0,93 s, **también si la función
  siguiera lenta** (columna derecha): ya nada la espera. Antes, el primer pintado era igual al contenido porque la espera de siete barras no tiene
  texto (no cuenta como pintado). La red del teléfono simulada (562 ms de ida y vuelta) pone ~0,6 s fijos que ninguna pieza quita: por eso 30 y 80
  ms por consulta dan casi lo mismo en el navegador.
- **Instagram mejora por la función**, no por los bloques: su pantalla sigue esperando entera (la pieza (d) del plan); con la función aún lenta, sigue
  en 4,3 s.
- Las consultas y la cadena en serie no cambian (22 y 5 en la portada): se reordenó quién espera a quién, no cuántas lecturas hay.
- **Lo que costó**: los datos de React en el HTML de la portada suben de 44,1 a 57,3 KB (el armazón, las esperas y lo que llega) y los de Instagram de
  44,9 a 51,6 KB (su espera propia); el JavaScript, de 255,9 a 270,2 KB en la portada y de 282,3 a 299,6 KB en Instagram (la espera de la portada
  y los esqueletos, que viven en el cliente; en la app instalada están en la caché).
- **`prefetch={false}`**: en la corrida de antes, durante los 1,5 s que el renglón de Instagram estuvo a la vista, el servidor **no** corrió la
  pantalla de Instagram (las consultas de esa pantalla salen una sola vez, después del toque): el prefetch de una ruta dinámica se detiene en la
  primera espera (`loading.tsx`). Con `prefetch={false}` la espera gris de Instagram llega a los ~615 ms en vez de ~35 ms; el toque sí responde a los
  9 ms con el renglón en camino. Pregunta 1.

Crudo: `tiempos.json` y `tiempos.md` de cada corrida en la carpeta temporal de la sesión (no en el repo); las cifras de arriba son sus medianas.

## Capturas (`docs/rediseno/capturas-530/`, 390×844 a 2×)

`scripts/ops/auditoria-ui/capturar-admin-sin-espera.mjs` (nuevo): la app compilada contra el respaldo local a través de un intermediario que frena a
mano las lecturas de un bloque, Chrome real, toques reales. Su recorrido (`recorrido.txt`): siete comprobaciones, todas bien.

- `01-solo-pendiente.png` — el instante en que solo llegó Pendiente (a los 145 ms en el servidor): «Pendiente 25» con sus cuatro renglones; los
  números en cuatro cuadros grises con su título y su nota; más abajo, Gestionar con sus líneas y cuentas en gris.
- `02-completa.png` — la misma pantalla completa: los cuatro cuadros con su número; los títulos en el mismo sitio (402, 844, 1 150 y 1 355 px).
- `03-renglon-en-camino.png` — el renglón de Instagram recién tocado, con el servidor frenado 1,5 s: la fila tintada (en Chrome, además, su resaltado
  azul del toque) y el chevron en el color de acción; las líneas de Showcase, Ciudades y Rutinas ya llegaron.
- `04-instagram-espera.png` — la espera propia de Instagram: la barra con Atrás, el chip, las pestañas y el botón en gris y renglones de cuatro líneas.
- `05-instagram.png` — Instagram ya cargada (pestaña Semana), para comparar la forma con la espera.
- `06-portada-espera.png` — la espera al entrar desde Ajustes (`admin/loading.tsx`): el armazón de la portada entero en gris.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | 0 errores (2 avisos de antes, en archivos que no toqué) |
| `npm run typecheck` | bien |
| `npm test` | 319 archivos, 5 142 pruebas, todas bien |
| `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` | 130 migraciones, 3 068 pruebas, 0 fallaron |
| `npm run inventario` | sin novedades (medidas en duro 328 de 328: las esperas usan tokens) |
| `npm run medir` (320, 390, 820 y 1 280) | 63 pantallas, sin novedades: no hubo que tocar ningún presupuesto (s45, s45a y s46–s49 iguales) |
| `npm run medir -- --letra=2 --solo=admin` | ninguno en la portada (s45, s45a) ni en Instagram (s46, s48, s49); 9 hallazgos en otras pantallas de Administración que esta pieza no toca (Grafo, Ciudades, Corridas, Showcase, la hoja de Instagram) |
| `npm run test:componentes` | 802 pruebas, todas bien |
| `capturar-admin-sin-espera.mjs` | 7 de 7; un error de consola de una imagen del respaldo en otro puerto (dato de prueba, no de la app) |

## Lo que no pude medir

- **La función en producción**: lo mide el gestor con la consulta de arriba (objetivo < 150 ms).
- **El iPhone del founder con su red**: la prueba final es la vista previa de Vercel en su teléfono: que Pendiente se vea antes que todo y que nada
  salte.

## Preguntas al founder

1. **El renglón de Instagram ya no se adelanta** (lo pidió el acta del council para que pasar por encima no hiciera trabajar a la base). Medido:
   aquí ese adelanto no corría la pantalla cara, solo traía su forma gris; sin él, al tocar Instagram la fila se tiñe al instante (9 ms), pero la
   pantalla gris de Instagram tarda ~0,6 s en aparecer en vez de ~0,04 s. ¿Lo dejamos así o volvemos a adelantarlo?
2. **Un aire de 8 px**: cuando hay propuestas de las rutinas por revisar, el título «Esta semana en números» quedaba a 12 px de la tarjeta de arriba
   (una regla pensada para otra cosa); ahora queda a 20 px, como todos los demás títulos. ¿Está bien?
3. **«No pudimos leer todo lo pendiente.»**: es la frase nueva cuando una de las lecturas de Pendiente falla (antes decía «Nada pendiente» aunque no
   hubiera podido leerlo todo). ¿La frase te sirve?
