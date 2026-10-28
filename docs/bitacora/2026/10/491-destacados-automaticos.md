# 491 · Destacados automáticos por interés y vistas (OL-459)

**Fecha:** 2026-10-23. **Rama:** `destacados-automaticos`, desde `origin/main` (`063b8643`). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** `supabase/migrations/20261023150000_destacados_automaticos.sql` (solo añade: dos tablas nuevas, una
función nueva y `create or replace` de `tira_destacados` con la misma firma y las mismas columnas), con su banco
`supabase/tests/pg/destacados-automaticos.test.mjs`. **Capturas:** [`docs/rediseno/capturas-491/`](../../../rediseno/capturas-491/). **Estado:** espera la
revisión del gestor.

## El pedido

Founder, 2026-10-23: «Quisiera que los eventos con un me interesa, voy o con más de 5 vistas se formen en destacados de manera automática».
Hasta hoy (doc 20, firmado el 2026-09-16) entraba lo que elige la administración y lo que tiene al menos 3 «Voy».

## La regla, en frases llanas

- Un evento sale en Destacados **solo**, sin que nadie lo elija, si le dio «Voy» al menos una persona, o «Me interesa» al menos una persona, o si su
  ficha tuvo **más de 5 visitas** (6 o más).
- No cuentan los «Voy», «Me interesa» ni visitas de **quien publicó el evento** ni de **la administración** (la administración, con el rol que tenía
  cuando lo marcó, como siempre). Así nadie se destaca solo con su propio «Voy».
- Lo que elige la administración sigue entrando y va **primero**. Lo que la administración **quita** no vuelve a salir, tenga lo que tenga.
- Solo eventos que se ven y no han terminado (sin lugar o en un lugar visible y no privado), como antes.
- **Lugares y artistas no cambian:** siguen entrando por elección o con 3 personas que van a sus eventos. La regla nueva no los toca.

## El orden y el tope

1. Lo elegido por la administración, lo más reciente primero (como antes).
2. Después, por **puntos**: cada «Voy» vale **20**, cada «Me interesa» **10**, cada visita **1**. Un «Voy» pesa lo que dos «Me interesa» o lo que
   veinte visitas; un solo «Me interesa» (10) va antes que un evento que entró solo por 6 visitas, hasta que ese llegue a 10 visitas.
3. A iguales puntos, lo que pasa **antes** (lo que ya está en curso cuenta como «ahora»).
4. **Tope: 8**, el que ya tenía la tira. No crece aunque haya muchos candidatos.

Cambio de presentación que conviene saber: la tira ya no sale ordenada por fecha sino en este orden. Inicio («Destacados» y «Seleccionados para
ti») la toma tal cual (`enOrden`); la tarjeta sigue diciendo su fecha.

## Cómo se cuentan las vistas (sin datos personales)

- La ficha de un evento, después de pintarse, manda un aviso a `POST /api/vista` (`ContarVista`, no pinta nada y la página no espera). Solo lo
  pone para quien no gestiona el evento, si se ve y no ha pasado. Un navegador manejado por un programa (`navigator.webdriver`) no lo manda.
- El servidor descarta lo que no viene del propio sitio (`Sec-Fetch-Site`) y a los robots evidentes (sin agente de usuario o con uno de buscador,
  vista previa de enlaces, `curl`, navegador sin pantalla…).
- **Con cuenta:** el visitante es su id, leído del token sin ir a la red; la base lo usa solo para no contarle dos veces el mismo día y para no
  contar a la administración ni a quien publicó. **Sin cuenta:** una cookie propia, `sn_visita`, con 32 caracteres al azar, `HttpOnly`,
  `SameSite=Lax`, `Secure`, que dura **un día**. Sin IP ni huella del navegador.
- La base (`contar_vista_evento`, `security definer`, **solo la puede llamar la llave de servicio**: nadie suma vistas con la llave pública) guarda
  una fila por visitante, evento y día (el día en la zona del evento) en `vistas_evento (evento_id, dia, clave)`. La clave es un resumen sha256 de
  una **sal secreta** (`vistas_sal`, que nadie lee fuera de la función) + visitante + evento + día: no guarda la cuenta ni la cookie, y no se puede
  unir con otro día ni con otro evento. Las dos tablas tienen RLS sin políticas: solo las funciones de la base las tocan.
- La llamada a la base va en `after` (después de responder). Sin la llave de servicio (local) responde igual y no cuenta.
- Lo que no protege: alguien decidido puede pedir `/api/vista` desde un programa que se haga pasar por Safari y sin cookie, y sumar vistas. Con un
  umbral de 6 es fácil de alcanzar a propósito; la administración puede quitar un destacado. Si pasa, se puede subir el umbral o contar solo
  vistas con cuenta (decisión del founder).

`src/app/privacidad` cambia (fecha: 23 de octubre de 2026): una línea en «Qué datos guardamos» (las visitas a la ficha de un evento, una por persona
al día, sin nombre, cuenta ni IP; para Destacados; sin contar a quien publicó ni a la administración) y «Cookies» ya no dice «solo la de sesión»:
nombra la de un día para no contar dos veces una visita, y quita «ninguna cookie de medición» (sigue «ninguna de rastreo ni de publicidad»).
En el párrafo de Vercel y Google, «Sin cookies de medición» pasa a «Sin sus cookies» (sigue siendo cierto de ellos). El aviso dice que un cambio
en cómo se usan los datos se avisa por correo: **lo decide el founder**.

## El motivo en Administración

`tira_destacados` devuelve un motivo nuevo además de `elegido` y `asistentes`: `interes` y `vistas`. En el renglón del filtro «Destacados» y en el
menú «···» de la ficha (`textoMotivo`) se lee:

- `asistentes` en un evento: «Destacado: 1 va» / «Destacado: 4 van» (antes decía «1 van»).
- `interes`: «Destacado: a alguien le interesa».
- `vistas`: «Destacado: más de 5 visitas a su ficha».

Un evento con «Voy» y «Me interesa» se dice por lo que más pesa (Voy, luego Me interesa, luego visitas). La columna `van` sigue siendo los «Voy»
(sin la administración ni quien lo publicó). No hay otro texto en la app ni en Administración que explicara la regla de «3 Voy».

## Cuántos eventos entrarían hoy

No leí producción. En el banco local (datos sembrados de `test:db`), San Luis Potosí pasa de **0** eventos en la tira por «3 Voy» a **7** (siete
con al menos un «Voy» de alguien que no es la administración ni quien lo publicó; de 107 próximos). En producción las vistas empiezan en cero
el día que se publique, así que al principio solo entran por «Voy» y «Me interesa». La consulta de solo lectura para medirlo por ciudad (sin
vistas, que aún no existen), probada en el banco:

```sql
with proximos as (
  select e.id, e.ciudad, e.creado_por
  from public.eventos e left join public.lugares l on l.id = e.lugar_id
  where e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado))
),
s as (
  select a.evento_id,
    count(*) filter (where a.estado = 'voy') as voy,
    count(*) filter (where a.estado = 'me_interesa') as interesan
  from public.asistencias a join proximos e on e.id = a.evento_id
  where a.usuario_id is distinct from e.creado_por and public.rol_en(a.usuario_id, a.creado_en) <> 'admin'
  group by 1
)
select e.ciudad,
  count(*) as proximos,
  count(*) filter (where d.quitado is false) as elegidos,
  count(*) filter (where d.quitado is null and coalesce(s.voy, 0) >= 3) as hoy_por_3_voy,
  count(*) filter (where d.quitado is null and coalesce(s.voy, 0) >= 1) as con_1_voy,
  count(*) filter (where d.quitado is null and coalesce(s.voy, 0) = 0 and coalesce(s.interesan, 0) >= 1) as solo_me_interesa,
  count(*) filter (where d.quitado is null and (coalesce(s.voy, 0) >= 1 or coalesce(s.interesan, 0) >= 1)) as entran_solos_sin_vistas,
  least(8, count(*) filter (where d.quitado is false or (d.quitado is null and (coalesce(s.voy, 0) >= 1 or coalesce(s.interesan, 0) >= 1)))) as en_la_tira_tope_8
from proximos e
left join public.destacados d on d.evento_id = e.id
left join s on s.evento_id = e.id
group by 1
order by en_la_tira_tope_8 desc, proximos desc;
```

(`hoy_por_3_voy` cuenta los de la regla vieja que no están elegidos; `rol_en` no se puede llamar con la llave pública: correrla en el editor SQL.)

## Archivos

- `supabase/migrations/20261023150000_destacados_automaticos.sql`: `vistas_evento`, `vistas_sal`, `contar_vista_evento(uuid, text, uuid)` (solo
  `service_role`), `tira_destacados` con la regla nueva. `artistas_destacados_novedades` la lee por posición y sigue igual (mismas columnas).
- `src/lib/vistas.ts` (robots, cookie), `src/app/api/vista/route.ts` (+ `route.test.ts`), `src/app/eventos/[id]/ContarVista.tsx` y su lugar en
  `page.tsx` (+ dos comprobaciones en `page.test.ts`: la pone para quien visita, no para la autora de un evento pasado).
- `src/lib/destacados.ts`: `MotivoDestacado`, los textos nuevos de `textoMotivo` (+ `destacados.test.ts`).
- `src/app/privacidad/page.tsx`.

Sin tocar: `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs` (su `tira_destacados` de imitación solo da elegidos; la ficha del respaldo
manda el aviso de vista y, sin llave de servicio, no cuenta) y `supabase/tests/destacados.mjs` (el banco viejo con PGlite, fuera de `test:db`:
sus casos de eventos con 1 o 2 «Voy» que no debían salir ya no valen; los casos de verdad están en el banco nuevo).

## Banco de la función (`destacados-automaticos.test.mjs`, como anon, persona, admin y service_role)

1 «Voy» entra (motivo `asistentes`, van 1) · 1 «Me interesa» entra (`interes`) · 5 vistas no · 6 sí (`vistas`) · 5 anónimas + 1 con cuenta son 6 ·
quitado con 3 «Voy» no · pasado no · el «Voy» de quien lo publicó no cuenta · el de la administración no · otra ciudad y oculto no · elegido
primero · orden: elegido, Voy, Me interesa por cercanía, al final vistas · mismas columnas · un lugar con 1 «Voy» no entra y con 3 personas sí ·
tope de 8 con el elegido primero. Vistas: el mismo visitante el mismo día cuenta una vez (también con cuenta); quien publicó y la administración no
cuentan; evento pasado u oculto no; visitante inválido no; la clave es un resumen de 64 hex sin la cuenta; la tabla solo tiene evento, día y
clave. Permisos: anon, persona y admin no pueden llamar `contar_vista_evento` ni leer `vistas_evento` ni `vistas_sal` (42501); la función es
definer con `search_path` vacío y sin PUBLIC; las dos tablas con RLS. Control negativo: cambiar «5» por «4» en una comprobación la hace fallar.

## Verificación

- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 111 migraciones, **2 489 pruebas, 0 fallaron**.
- `npm run lint` (0 errores; los 2 avisos de siempre, ajenos), `npm run typecheck`, `npm test` (**283 archivos, 4 643 pruebas**), `npm run
  inventario` (sin novedades), `npm run medir` (58 pantallas × 4 anchos, sin novedades), `npm run build` en verde.
- `next start` local: `POST /api/vista` desde «Safari» responde 204 con `sn_visita=<32 hex>; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax` (sin
  `Secure` en http); como Googlebot, 204 sin cookie.
- Capturas a 390×844 (Chrome de la Mac, 2×) de `/privacidad`, sin desborde horizontal (`scrollWidth` 390):
  - `privacidad-vistas.png`: «Qué datos guardamos» con la línea nueva de las visitas entre la ubicación y «Lo que publicas».
  - `privacidad-cookies.png`: «Cookies» con la cookie de un día para las visitas y «Ninguna cookie de rastreo ni de publicidad».

## Por confirmar (gestor y founder)

1. **Pesos** Voy 20 · Me interesa 10 · visita 1.
2. **Tope** 8 (el de siempre). Inicio enseña hasta 12 en su carril estelar: si se quiere llenar, subir a 12 es una línea.
3. **Vistas:** una por visitante y día, cookie de un día sin cuenta, sin contar autor ni administración; umbral 6. Es fácil de inflar a propósito
   (ver arriba).
4. **Autor y administración** tampoco cuentan para «Voy» y «Me interesa» del evento (antes el autor sí contaba para los 3 «Voy»).
5. El aviso de privacidad cambia: ¿se avisa por correo, como promete el propio aviso?
