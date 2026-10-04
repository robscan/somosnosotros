# 302 · Artistas con novedades en destacados — OL-275

**Fecha:** 2026-10-04. **Rama:** `prototipo-novedades`. **Base:** `origin/main` `e454a334f062d7c03c82438ad106dbbe070e0a64`. **Worktree:** `.claude/worktrees/prototipo-novedades`. **Operador:** Codex, chat `01a108e1-7881-7420-85d0-9ce1947405c1`.

## Encargo y límites

El founder pidió leer la asignación de Gestor III, entenderla y preguntarle las dudas. Se leyeron memoria, gestión, reservas, contexto de producto, estado de Git y antecedentes de novedades (doc 44 y migraciones vigentes). La carpeta principal estaba nueve commits atrás; la reserva nueva estaba en el registro local del gestor y su mensaje completo en «Gestor de cambios III», sesión `local_004a210b-4803-4298-bd64-2666df33576c`.

El mensaje reserva OL-275/302, rama/base/worktree y archivos de prototipo. Primera fase: carril, renglón y ficha con «Nuevo video» para YouTube/Vimeo y «Nuevo audio» para SoundCloud/Bandcamp/Mixcloud. Una novedad visible destaca por 7 días desde su publicación; la última decide el sello. Primero elegidos, después novedades por recencia, tope 12 y sin duplicados. Prototipo local; no `src`, SQL, producción, push ni agentes adicionales. La segunda fase necesita firma del founder y consultar al gestor la forma de la consulta y su migración que solo añade.

Se consultaron cuatro bordes directamente al gestor en Claude, por autorización expresa del founder. Su respuesta confirmó:

- La foto sigue siendo necesaria para entrar al carril. Sin foto, el sello vive en lista y ficha.
- El respaldo de próximos eventos por seguidores se usa solo cuando no hay elegidos ni novedades vigentes; se acepta un carril corto.
- Al ocultar/borrar la última novedad, se recalcula con la anterior visible que conserve menos de 7 días. Un elegido manual permanece y cambia o pierde solo el sello.
- `ui/Chip variante="sello"` con el tratamiento de «Hoy» en tarjeta; el mismo sello sin control separado en lista y ficha.
- HTML autónomo compilado con React/CSS reales de main; tocar abre la novedad exacta sin reproducción automática. Autorizó crear la rama y empezar.

El comprobador `bash scripts/ops/siguiente-bitacora.sh` confirmó última 301/OL-274 y siguientes 302/OL-275. No se tomó ningún número nuevo.

## Entrega

[Prototipo autónomo](../../../rediseno/prototipos/artistas-novedades.html), con un laboratorio de escenarios separado de las pantallas. Recursos, Bricolage y retratos SVG sintéticos incluidos: el HTML abre sin servidor ni conexión. Se conservaron los estilos canónicos de tarjetas, renglones, héroe, KPI, barras y acciones. La pastilla Seguir usa el mismo marcado y `ui/Boton` que la ficha actual; su efecto está simulado.

La revisión visual detectó el sello de la ficha estirado por la rejilla de avisos; se corrigió su colocación con `justify-self:start`. Se repitieron únicamente las comprobaciones del prototipo después de esa corrección y de conciliar la pastilla Seguir con el canon. Ningún archivo real de producto se editó.

[Guía y evidencia](../../../rediseno/capturas-302/README.md): 22 PNG a 320×844/390×844, medidas e inventario de 92 fuentes reales con sus hashes. Todas las capturas finales se abrieron para revisión visual. Carril con foto sintética, elegidos+novedades; ambos tipos de sello; mismo artista en lista/ficha; ficha sin foto; día 8; recálculo al borrar; respaldo y textos al límite 80/40.

## Corrección tras revisión del gestor

Gestor III revisó `ad64310f` y aceptó la regla, el orden, los sellos de tarjeta/lista/ficha y la llegada a la novedad. Devolvió un único desvío de canon: la ciudad de la cabecera era una píldora violeta de muestra, sin el pin ni la flecha actuales. Se incorporó el `ChipCiudad` real en Inicio y Artistas, con su CSS sin cambios. Ubicación fija sintética, sin permiso ni GPS. Se regeneraron y abrieron las 14 capturas afectadas a 320/390; se reutilizaron las ocho capturas de fichas intactas. Se actualizó el inventario de fuentes (92) y se verificaron de nuevo los mismos 20 estados; no se ejecutó ninguna suite de la app.

El laboratorio del HTML abre, cambia escenarios y se puede cerrar; su selector tiene un nombre accesible explícito. Ver artistas y Atrás a la lista funcionan. Ningún hijo de los renglones rebasa el enlace contenedor. Gestor III aceptó el candidato corregido `ca665a7bc27dc7324f52569f23a007be96d8005e`: comprobó las capturas de carril a 390 y lista a 320, los sellos y el truncado del nombre largo. Autorizó presentarlo al founder con la guía; el HTML y sus pruebas quedan congelados. Se preparó la vista local `http://127.0.0.1:8275/artistas-novedades.html`, y la apertura del prototipo y la guía quedó encolada en esta tarea de Codex. Se solicitó la firma mediante pregunta accionable; pendiente de respuesta.

## Verificación y alcance de la evidencia

- 20 estados medidos sin scroll horizontal del documento; Bricolage real cargada.
- Orden elegido/novedad, 12 máximos, sin duplicados, foto necesaria y exclusión de controles ocultos/restringidos.
- Frontera temporal: un milisegundo antes de cumplir 7 días todavía hay sello; exactamente a los 7 días desaparece.
- Ocultar o borrar el último audio de Mar Sol repone su video anterior vigente; sin otra novedad sale; la elegida Luna permanece sin novedad.
- Tarjeta de Mar Sol abre la ficha con `novedad=n3`, y su reproductor de muestra queda visible. No reproducción automática.
- Cero errores de navegador y cero solicitudes HTTP externas; datos, servicios y navegación simulados.
- Solo documentación/prototipo: sin build de Next ni suites de la app. Revisión de diff, enlaces y alcance antes del commit.

**Estado:** prototipo aceptado por Gestor III en `ca665a7b` y presentado al founder; pendiente de su firma visual. No se afirma que la funcionalidad exista en producción. No hay migración ni propuesta SQL final: antes de fase 2, revisar consulta, permisos, costo y caché con el gestor. Safari físico todavía no probado para esta propuesta.


## Firma y propuesta SQL de fase 2

El founder firmó en Gestor III, mensaje174: «Te firmo ajuste a artistas con novedades». El gestor asignó en175 la rama `novedades-destacados` desde main actual, su worktree y, en177, la migración **`20261005090000_destacados_novedades.sql`**. Se creó la rama desde `a5ad0838d4de06fa79f6fb9161edb918abc24d46`. Antes de editar `src` o crear la migración en el repositorio, el gestor revisa esta propuesta. La migración remota la aplica él antes de unir el código. Sin ayudantes.

El problema de acceso móvil quedó resuelto por [el enlace HTTPS fijo](https://raw.githack.com/robscan/somosnosotros/d6d9f29d/docs/rediseno/prototipos/artistas-novedades.html), idéntico al HTML aceptado. Registro previo local `0eea0615` en `prototipo-novedades`, con guía y comprobación a390×844. Si raw.githack muestra «Open the page», ese botón abre el prototipo. La firma posterior sustituye el estado pendiente anterior.

### Propuesta concreta, todavía sin código de aplicación

Añadir dos RPC en vez de modificar `tira_destacados`: el carril recibe como máximo12 identificadores y el resumen de su novedad; la lista solicita en lote solo los ids cargados, también sin traer textos, URLs ni autores. La ficha reutiliza sus novedades ya cargadas para el sello. La propuesta revisada conserva elegidos → novedades → asistentes y hereda el límite interno8 de la tira actual. Se conserva la consulta de fechas y el respaldo actuales, usado solo cuando los tres grupos de la RPC del carril quedan vacíos. Elegidos y asistentes salen de `tira_destacados` con su posición original (`WITH ORDINALITY`), sin copiar su cálculo ni desempates. La novedad no mueve la posición de un elegido; un artista que era de asistentes y tiene novedad sale una vez en el grupo de novedades.

Las RPC son `security definer` porque `destacados` está deliberadamente cerrado a visitantes. No se abre esa tabla ni se alteran políticas: se exige artista visible y ciudad exacta, novedad visible y menos de168 horas (frontera estricta; no futuras), con bloqueo del emisor respetado y la excepción administrativa actual. La tabla artistas no tiene una columna `privado`: su retirada se representa con `visible=false`, que se excluye incluso para su autor o administración. Las novedades ocultas tampoco dan sello a quien puede gestionarlas. Borrar/ocultar devuelve la anterior visible aún vigente; orden de empate por id, sin duplicados.

**Revisión179 de Gestor III:** la propuesta inicial fue devuelta por perder asistentes y duplicar el cálculo de `van`; aclaró que `quitado=true` vigente también veta la entrada por novedad. SQL corregido abajo: usa la tira actual como única fuente, conserva los tres grupos y filtra ese veto editorial. El gestor confirmó el índice parcial (barato, escrituras raras, preparado para crecimiento) y todos los archivos listados. Sigue sin autorización de `src` hasta revisar este SQL corregido. El límite interno8 se conserva; con más de8 elegidos puede dejar fuera una elección y, si esa ficha tiene novedad, entrar por ese grupo. Se informa esta limitación antes de cualquier cambio a la función actual; no se altera su límite.

**Archivos necesarios para confirmar alcance:** el cargador real es `src/lib/cargarArtistasDestacados.ts` (no `inicio.ts`); `artistas.ts` para el resumen opcional, `novedadesArtista.ts` para elegir/sellar, `destacados.ts`, `Destacados.tsx`, `RenglonArtista.tsx`, carga de `src/app/artistas/page.tsx`, ficha/SeccionNovedades y sus pruebas. Las acciones de novedades hoy solo invalidan la ficha: se necesitan además Inicio y Artistas después de publicar/editar/ocultar/borrar, para que la regla sea inmediata y el sello cambie. No caché compartida de resúmenes que dependen del bloqueo de la cuenta. Archivos confirmados por el gestor en179; todavía se espera la aceptación final del SQL antes de editarlos.

### Costo medido de la propuesta inicial (sustituida)

PG17.11 temporal y aislado en loopback,75 migraciones de main aplicadas,520 artistas,13 novedades con emisor de muestra y5 destacados vigentes. Datos sintéticos; no es una medición de Supabase. `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` de cada RPC, tres muestras por rol; sesiones reales de muestra para persona y admin. Se separa la primera ejecución de las dos calientes.

| Rol | RPC | Primera ms | Calientes ms | Filas | Bloques compartidos calientes |
|---|---|---:|---|---:|---:|
| anon | actual | 4.553 | 1.027 / 0.827 | 5 | 51 |
| anon | nueva | 1.877 | 1.139 / 1.272 | 12 | 64 |
| anon | lote50 | 0.377 | 0.352 / 0.375 | 13 | 29 |
| persona | actual | 0.864 | 0.754 / 0.636 | 5 | 51 |
| persona | nueva | 1.001 | 1.000 / 1.519 | 12 | 116 |
| persona | lote50 | 0.337 | 0.489 / 0.444 | 13 | 81 |
| admin | actual | 1.021 | 0.731 / 0.943 | 5 | 51 |
| admin | nueva | 1.287 | 1.248 / 0.980 | 12 | 88 |
| admin | lote50 | 0.305 | 0.401 / 0.355 | 13 | 53 |

`actual` es `tira_destacados('artistas', 'San Luis Potosí')`; `nueva`, `artistas_destacados_novedades`; `lote50`, los resúmenes de50 ids. La nueva trae12 y la anterior5, por lo que no son prestaciones idénticas. Plan de entrada `Function Scan`, con trabajo interno incluido en tiempo/buffers. No se afirma un ahorro de red ni de costo remoto a partir de esta muestra. El banco y los planes completos están en `/private/tmp/sn-ol275/`; no contienen datos reales.

### SQL completo propuesto para la migración reservada

```sql
-- Propuesta OL-275; aún no es la migración del repositorio.
-- Solo añade dos lecturas y un índice; tira_destacados y escrituras actuales intactas.
create index novedades_artista_visibles_recencia_idx
  on public.novedades_artista (creado_en desc, artista_id, id desc)
  include (proveedor, publicado_por) where visible;

-- Resumen público de la última novedad VISIBLE aún vigente, por ciudad y lote de artistas.
-- ids null: ciudad; ids vacíos: nada. Empates deterministas, 168 horas exactas.
create function public.novedades_recientes_artistas(p_ciudad text, p_ids uuid[] default null)
returns table (artista_id uuid, novedad_id uuid, proveedor text, creado_en timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (n.artista_id) n.artista_id, n.id, n.proveedor, n.creado_en
  from public.novedades_artista n
  join public.artistas a on a.id = n.artista_id
  where a.visible and a.ciudad = p_ciudad
    and (p_ids is null or a.id = any(p_ids))
    and n.visible
    and n.creado_en > now() - interval '168 hours' and n.creado_en <= now()
    and (public.es_admin() or not public.bloqueado_por_mi(n.publicado_por))
  order by n.artista_id, n.creado_en desc, n.id desc;
$$;
revoke all on function public.novedades_recientes_artistas(text, uuid[]) from public;
grant execute on function public.novedades_recientes_artistas(text, uuid[]) to anon, authenticated, service_role;
comment on function public.novedades_recientes_artistas(text, uuid[]) is
  'OL-275: última novedad visible y no bloqueada de artistas públicos de una ciudad; máximo una por artista, vigente menos de 168 horas. Sin títulos, URLs ni autores.';

-- La decisión editorial privada se lee aquí, sin abrir su tabla a visitantes.
-- Elegidos → novedades → asistentes; orden heredado de la tira; máximo12 con foto.
-- El respaldo existente de próximos/seguidores queda en la aplicación solo si los tres grupos de esta tira quedan vacíos.
create function public.artistas_destacados_novedades(p_ciudad text)
returns table (id uuid, motivo text, hasta timestamptz, van integer, novedad_id uuid, proveedor text, novedad_creado_en timestamptz)
language sql stable security definer set search_path = '' as $$
  with tira as materialized (
    -- Única fuente de la decisión, asistentes y orden existentes; conserva su tope interno8.
    select t.id, t.motivo, t.hasta, t.van, t.posicion, a.nombre
    from public.tira_destacados('artistas', p_ciudad)
      with ordinality as t(id, motivo, hasta, van, posicion)
    join public.artistas a on a.id = t.id
    where a.visible and a.ciudad = p_ciudad and nullif(btrim(a.foto), '') is not null
  ),
  ultimas as materialized (
    select * from public.novedades_recientes_artistas(p_ciudad)
  ),
  candidatas as (
    select t.id, t.nombre, t.motivo, t.hasta, t.van, 0 as grupo, t.posicion,
      n.novedad_id, n.proveedor, n.creado_en as novedad_creado_en
    from tira t left join ultimas n on n.artista_id = t.id
    where t.motivo = 'elegido'
    union all
    select a.id, a.nombre, 'novedad', n.creado_en + interval '168 hours', 0, 1, null::bigint,
      n.novedad_id, n.proveedor, n.creado_en
    from ultimas n join public.artistas a on a.id = n.artista_id
    where a.visible and a.ciudad = p_ciudad and nullif(btrim(a.foto), '') is not null
      and not exists (select 1 from tira t where t.id = a.id and t.motivo = 'elegido')
      and not exists (select 1 from public.destacados d
        where d.artista_id = a.id and d.quitado and d.hasta > now())
    union all
    select t.id, t.nombre, t.motivo, t.hasta, t.van, 2, t.posicion,
      null::uuid, null::text, null::timestamptz
    from tira t
    where t.motivo = 'asistentes' and not exists (select 1 from ultimas n where n.artista_id = t.id)
  )
  select c.id, c.motivo, c.hasta, c.van, c.novedad_id, c.proveedor, c.novedad_creado_en
  from candidatas c
  order by c.grupo,
    case when c.grupo = 1 then c.novedad_creado_en end desc nulls last,
    c.posicion nulls last, c.nombre, c.id
  limit 12;
$$;
revoke all on function public.artistas_destacados_novedades(text) from public;
grant execute on function public.artistas_destacados_novedades(text) to anon, authenticated, service_role;
comment on function public.artistas_destacados_novedades(text) is
  'OL-275: artistas visibles de la ciudad con foto; elegidos, novedades vigentes por recencia y asistentes; veto editorial vigente, máximo12 sin duplicados. No cambia la tira de eventos o lugares.';
```

### Pruebas PG previstas

- Anonymous, persona, autor/ligado, administración y service_role: solo artista visible de la ciudad; ninguna novedad oculta da sello, incluso con permiso de gestión. Bloqueo del emisor y excepción administrativa actual.
- Última visible por creado_en/id, los cinco proveedores, futuro excluido y frontera exacta de168 horas; ocultar/borrar devuelve la anterior vigente o deja sin sello.
- Elegidos primero en su orden actual, con y sin novedades, máximo12 y sin duplicar; al vencer la novedad un elegido permanece. Foto necesaria en carril, sin foto conservada en lote.
- Lote vacío, ids repetidos, otra ciudad y artista oculto no filtran datos; RPC no devuelve URLs, textos, títulos ni autores.
- `tira_destacados` de eventos/lugares y permisos/escrituras existentes sin cambios; tipos de `destacados` cerrados a visitantes.

**Estado de fase2:** propuesta lista para revisión de Gestor III, que confirma SQL, índice, el borde de quitar manualmente y archivos. No se escribió `src` ni la migración reservada; no hubo aplicación remota ni push. Las unitarias/componentes/PG del código, `medir` y capturas320/390 se ejecutan después de aceptar la propuesta e implementar.


### Nueva medida tras revisión179

Mismo banco y volumen (520/13/5), sin duplicar cálculo de asistentes: la RPC nueva llama a la tira actual. `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, tres muestras por rol.

| Rol | Primera ms | Calientes ms | Filas | Bloques compartidos calientes |
|---|---:|---|---:|---:|
| anon | 6.984 | 2.115 / 1.907 | 12 | 105 |
| persona | 2.228 | 2.278 / 1.824 | 12 | 157 |
| admin | 1.959 | 1.858 / 2.104 | 12 | 129 |

La primera ejecución anónima incluye compilación/caché de la composición (6,984ms); calientes1,824–2,278ms con12 filas. El costo es mayor que la propuesta inicial porque se conserva el cálculo actual completo, sin duplicarlo. Planes íntegros en `/private/tmp/sn-ol275/costo-sql-v2.json`; SQL vigente en el bloque anterior y `/private/tmp/sn-ol275/propuesta.sql`.

Pruebas PG adicionales confirmadas por el gestor: quitado con novedad vigente excluido del carril; artista con tres asistentes después de las novedades; elegido con novedad una vez, como elegido y con sello; tope12 con los tres grupos mezclados. Los sellos de lista/ficha indican la publicación, independientemente del veto del carril.

**Entrega revisada:** lista para revisión final del SQL; no `src`, migración en repo, push ni operación remota. El gestor confirma el SQL y decide la limitación heredada de8 antes de programar.
