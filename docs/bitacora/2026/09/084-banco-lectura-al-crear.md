# 084 · El banco de lectura al crear, también con lo privado que no es del administrador (OL-049)

**Fecha:** 2026-09-16 (noche) · **Rama:** `banco-lectura-al-crear` (árbol de trabajo propio; commit local, sin push) · **Base:** la revisión adversarial de gestión de cambios sobre el [PR #80](https://github.com/robscan/somosnosotros/pull/80) (bitácora [076](076-crear-lugar-privado.md)) y el pedido del founder: «estoy interesado en la mejora propuesta adelante».

## Qué faltaba
- **Tres reglas rotas pasaban el banco.** El banco `supabase/tests/lectura_al_crear.mjs` solo tenía lugares privados del administrador. El revisor de gestión de cambios encontró tres reglas de lectura rotas que lo pasaban en verde:
  - **m10:** lo privado solo lo ve la administración;
  - **m11:** la cuenta ligada no ve el lugar privado que tiene ligado;
  - **m13:** el autor no ve su propio lugar privado.

  Con cualquiera de ellas, una administradora a la que se le quita el rol desde el panel perdería sus mapeos privados, o una cuenta ligada perdería el lugar privado que lleva.
- **"Nadie más lo ve" podía pasar en falso.** Mirar quién ve una fila con el id vacío daba "no lo ve", así que el banco decía "nadie más lo ve" aunque la creación hubiera fallado.
- **El fallo de antes no se probaba con la consulta de la app.** Solo se reproducía con `INSERT … RETURNING` simple, no con la forma en que supabase-js arma la consulta (`with pgrst_source as (…)`).

## Qué se hizo
Solo en `supabase/tests/lectura_al_crear.mjs`, sin migración ni código de la app:
- **Datos nuevos:**
  - Olga, que ya no administra, con dos lugares privados: "Mapeo de Olga", visible, y "Terreno de Olga", oculto;
  - "Casona Privada", del administrador, ligada a Carla.

  Olga entra en la comparación de lo que ve cada quien antes y después de la migración.
- **Comprobaciones nuevas:**
  - Olga sigue viendo sus dos mapeos;
  - Carla ve el privado que tiene ligado;
  - ni sin sesión, ni Ana, ni Luis ven ninguno de los tres;
  - Carla no ve los de Olga, ni Olga el de Carla.
- **Sin id, falla:** mirar quién ve una fila sin id cuenta como fallo y dice por qué ("la creación falló").
- **El fallo de antes, como lo manda la app:** también se reproduce con la consulta de supabase-js.

## Verificación
- **Banco en la rama:** 50 comprobaciones en verde, con las 31 migraciones de `main`, zona horaria incluida (PR #78, traído a la rama antes de repetir todo). `FORZAR_FALLO=1` sale con error.
- **Versiones rotas de la migración:** m10, m11 y m13 tal cual las dio gestión de cambios, más las cinco de la bitácora 076. En todas, artistas lleva la regla real. La misma prueba, con el banco de `main` y con el nuevo:

  | Versión | Banco de `main` | Banco nuevo |
  |---|---|---|
  | La real | 42 en verde | 50 en verde |
  | Vacía | 8 fallos | 20 fallos |
  | Regla abierta a todos | 11 | 16 |
  | Sin cuentas ligadas | 5 | 6 |
  | Solo lugares | 2 | 5 |
  | Privado visible para cualquiera | 8 | 13 |
  | m10 · privado solo admin | **pasa** | 4 |
  | m11 · el ligado no ve el privado | **pasa** | 2 |
  | m13 · el autor no ve su privado | **pasa** | 4 |

  - **Por qué fallan las tres nuevas:** con m11, Carla pierde "Casona Privada". Con m10 y m13, además, Olga pierde "Mapeo de Olga" y "Terreno de Olga".
  - **Por qué suben las cuentas:** con la migración vacía y con "solo lugares" hay más fallos porque cada "quién lo ve" sin id ahora sale en rojo con su motivo.
- **Otros bancos:** el del panel da 95, el de autor y ocultar 68 y el de zona horaria 44, en verde.
- **Código:** lint (0 errores; el aviso ajeno de `docs/diseno/logotipo/iconos-sn.mjs`), tipos, 280 pruebas y build en verde.
- **Sin pantallas:** el cambio es solo del banco. Nada se leyó ni se escribió en producción.

## Queda
- Push, PR y merge los lleva gestión de cambios.
