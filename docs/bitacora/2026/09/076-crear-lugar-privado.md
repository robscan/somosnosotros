# 076 · El administrador no podía crear un lugar privado (OL-049)

**Fecha:** 2026-09-16 (noche) · **Rama:** `crear-lugar-privado` (árbol de trabajo `reverent-germain-8bb38f`; solo commit local, sin push) · **Base:** hallazgo del 2026-09-16 al probar las migraciones en PGlite.

## Qué pasaba
- Al crear un lugar con "Solo yo lo veo", el administrador veía "No se pudo guardar el lugar. Intenta de nuevo." y no quedaba nada guardado. La base respondía `new row violates row-level security policy for table "lugares"`.
- La app guarda con `insert(...).select("id").single()` (`crearLugar` en `src/app/lugares/acciones.ts`). En la base eso es un INSERT … RETURNING, y con RETURNING Postgres exige que la fila nueva pase también la regla de lectura.
- Desde la migración de reclamar lugares (`20260916120000_lugares_cuentas.sql`, 0024, en producción desde el 2026-09-16), esa regla es `(visible and not privado) or gestiona_lugar(id)`, y `gestiona_lugar` busca el lugar en la tabla por su id.
- **Causa exacta:** Postgres revisa la fila nueva antes de escribirla, así que ninguna búsqueda por id la encuentra. Se comprobó volviendo `gestiona_lugar` volatile: sigue fallando. No es la instantánea de `stable`, y cambiar la volatilidad no lo arregla.
- Lo público pasaba por la primera mitad de la regla; lo privado y lo oculto, no. Antes de 0024 la regla miraba las columnas de la fila (`creado_por = auth.uid() or es_admin()`) y funcionaba.

## Qué se revisó (PGlite con las 28 migraciones de `main`)
| Alta o cambio | Antes del arreglo |
|---|---|
| Lugar privado con RETURNING (administrador) | falla |
| El mismo, dentro de un WITH, como arma la consulta la API de Supabase | falla |
| Lugar oculto con RETURNING (administrador o usuario) | falla |
| Lugar público con RETURNING | pasa |
| Lugar privado sin RETURNING, o con `RETURNING 1` (sin columnas) | pasa |
| Artista oculto con RETURNING | falla: la misma trampa desde la migración 0010, latente porque la app no crea artistas ocultos |
| Evento oculto con RETURNING | pasa: su regla mira las columnas |
| Dirección de un sitio reservado con RETURNING, y con upsert | pasa: `gestiona_evento` busca el evento, que ya está guardado |
| Volver privado u ocultar un lugar con RETURNING | pasa: la fila ya existe |

Las demás reglas con funciones de búsqueda (`eventos_artistas`, `lugares_cuentas`, `artistas_cuentas`) buscan la ficha padre, ya guardada, y se leen con `using (true)`: sin problema.

## Qué se hizo
- **Migración `supabase/migrations/20260917093000_lectura_al_crear.sql`, sin aplicar.** Cambia solo la expresión de dos reglas de lectura, con `alter policy`:
  - lugares: `(visible and not privado) or creado_por = auth.uid() or es_admin() or gestiona_lugar(id)`;
  - artistas: `visible or creado_por = auth.uid() or es_admin() or gestiona_artista(id)`.

  Primero se mira la propia fila (su autor o el administrador), como antes de 0024. `gestiona_*` queda para las cuentas ligadas, que solo existen sobre fichas ya guardadas. Para lo ya guardado nada cambia: `gestiona_*` ya incluía al autor y al administrador.
- **Nombre de la migración:** propuesto al chat de gestión de cambios, que no había respondido al cerrar esta bitácora. Va después de `20260917090000_panel_administracion.sql` (ya aplicada) y antes de `20260917100000_zona_horaria.sql` (sin commit en el árbol `cualquier-pais`). Si la de zona horaria se aplicara primero, `db push` pediría `--include-all` para esta. Sin número en la cabecera, para no chocar con el "0029" de la zona horaria.
- **Banco de pruebas `supabase/tests/lectura_al_crear.mjs`**, como el del panel (PGlite instalado fuera del repo):
  - con las migraciones de antes reproduce el fallo;
  - aplica la migración y las que sigan;
  - compara lo que ve cada quien de lo ya guardado (sin sesión, dos usuarias, una cuenta ligada y el administrador): las mismas fichas antes y después;
  - comprueba que lo privado u oculto se crea y se devuelve, que nadie más lo ve (tampoco en la búsqueda por nombre ni en el aviso de duplicado), que un usuario no puede marcar privado y que la cuenta ligada sigue leyendo y editando.

## Verificación
- **Banco nuevo:** 42 comprobaciones en verde.
- **Cinco versiones rotas de la migración**, cada una detectada por el banco:
  - vacía: 8 fallos (el alta);
  - regla abierta a todos: 11 (lo privado se ve);
  - sin las cuentas ligadas: 5;
  - solo lugares: 2 (artistas);
  - privado visible para cualquiera: 8.

  `FORZAR_FALLO=1` también sale con error.
- **Banco del panel** con la migración nueva: 29 migraciones y 95 comprobaciones en verde.
- **Código:** lint (0 errores; el aviso ajeno de `docs/diseno/logotipo/iconos-sn.mjs`), tipos, 258 pruebas y build en verde.
- **Sin captura de pantalla:** el cambio no toca pantallas, y no hay Supabase local. El respaldo de datos inventados no aplica permisos por fila, así que una captura no probaría nada. La prueba es el banco, que corre sobre Postgres.
- Nada se leyó ni se escribió en producción.

## Hallazgo aparte (no se tocó; tarea propuesta)
Las reglas de edición de lugares (0024) y artistas (0010) usan `gestiona_*` también para validar la fila nueva, pero la función lee la fila guardada. Quien gestiona una ficha puede cambiar `creado_por` llamando a la API directamente. Una cuenta ligada que no es la autora puede hacerse autora y después borrar el lugar, y con él los eventos que otras personas publicaron ahí. Se comprobó en PGlite. La app no lo ofrece: solo el administrador cambia el autor, al pasar la ficha. Arreglo propuesto: un trigger como `proteger_rol` (el `revoke` por columna no sirve, ver 072). Quedó como tarea aparte ("Block changing creado_por in lugares and artistas").

## Queda
- **El founder aplica la migración** `20260917093000_lectura_al_crear.sql` (`npm run db:push` desde esta rama, o después de mezclar). No depende de código nuevo: el arreglo vale en cuanto se aplica.
- **Firma en el iPhone:** crear un lugar con "Solo yo lo veo" y ver que abre su ficha.
- Push, PR y merge cuando el founder lo diga.
