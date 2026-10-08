# 372 · Publicar ya no falla por «slug duplicado» cuando hay una ficha oculta con el mismo nombre

**Pieza:** OL-343. **Rama:** `slug-oculto-y-ci`, desde `origin/main` (`0a6fd24e`), compartida con OL-344 (bitácora [373](373-ci-interfaz-colgada.md)), un commit por pieza. **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor). **Migración:** `20261008110000_slug_eventos_ocultos.sql` (solo cambia el modo de tres funciones; no se aplicó: la aplica el gestor).
**Manda:** el hallazgo de OL-341 (bitácora [370](370-festival-ya-existe.md), «Hallazgo fuera de la pieza»).

## El fallo

El slug de una ficha nueva lo pone un disparador `before insert` (`eventos_generar_slug`, `lugares_generar_slug`, `artistas_generar_slug`, de las migraciones `20260922140000`, `…160000`, `…170000` y `…200000`). Los tres buscaban un candidato libre con `exists (select 1 from public.<tabla> where slug = candidato …)` **con los permisos de quien publica**, así que esa consulta pasaba por la RLS de lectura. Lo que esa cuenta no ve le parecía libre, el candidato ya existía y el índice único rechazaba la publicación con `23505`.

No era solo de eventos. La prueba nueva lo reprodujo en las tres tablas y en cuatro situaciones:

- **Evento oculto o retirado por la administración** (`visible = false`): otra cuenta publica el mismo título el mismo día.
- **Evento de alguien a quien bloqueaste** (OL-203): la política de lectura lo esconde aunque sea visible.
- **Lugar privado de otra cuenta** (OL-179): cualquiera puede marcar privado su lugar.
- **Artista oculto** por la administración (en otra ciudad, porque en la misma lo para otra regla, `artista_sin_duplicado`).

Antes del arreglo, en el orden real de las 90 migraciones (`npm run test:db`, PostgreSQL 17 local):

```
  x eventos: publicar el mismo título y día que uno oculto no falla por slug duplicado: {"code":"23505","message":"duplicate key value violates unique constraint \"eventos_slug_idx\""}
  x bloqueo: publicar el mismo título que alguien bloqueado no falla: {"code":"23505","message":"duplicate key value violates unique constraint \"eventos_slug_idx\""}
  x lugares: el mismo nombre que un privado ajeno no falla por slug duplicado: {"code":"23505","message":"duplicate key value violates unique constraint \"lugares_slug_idx\""}
  x artistas: el mismo nombre que uno oculto no falla por slug duplicado: {"code":"23505","message":"duplicate key value violates unique constraint \"artistas_slug_idx\""}
  x artistas_generar_slug: security definer, path vacío y sin EXECUTE para anon ni authenticated: {…"prosecdef":false…}
  x lugares_generar_slug: … x eventos_generar_slug: …
x 1923 pruebas: 7 fallaron
```

## El arreglo

`alter function … security definer` en los tres disparadores. Por qué ahí y no en una función nueva que diga «este slug existe»:

- El disparador ya es la única puerta: nadie con sesión tiene EXECUTE sobre él y un trigger no se puede llamar aparte. Lo único que devuelve a quien publica es el slug de su propia fila. Una función aparte que respondiera «existe / no existe» sí dejaría preguntar por fichas ocultas.
- Con SECURITY DEFINER las consultas de dentro corren como la dueña de la tabla, que no pasa por la RLS. Eso incluye `slug_de_evento`, que el disparador de eventos llama: una función normal llamada desde una definer hereda ese usuario.
- `slug_de_evento` **sigue con los permisos de quien llama** (tiene `grant … to authenticated`). Si alguien la invoca aparte, solo ve lo que ya veía; la prueba lo comprueba.
- Es el mismo modo que ya tienen los otros disparadores internos que leen filas ajenas (`eventos_zona_del_lugar`, `lugares_zona_a_sus_eventos`).
- `alter function` conserva el cuerpo, `set search_path = ''`, el dueño, los permisos, los disparadores instalados y el bloqueo consultivo contra altas simultáneas. Solo añade un comentario a cada función.

**Ediciones (`p_excluir_id`):** no cambian. Los tres disparadores son `before insert`: el slug nunca se recalcula al renombrar ni al mover la fecha. La prueba renombra el evento de Beto al título del oculto y mueve su fecha: no falla y el slug queda igual. `slug_de_evento` con `p_excluir_id` de la fila oculta devuelve el slug de esa misma fila (no choca consigo misma).

**Funciones de festival de OL-341:** `unir_a_festival_parecido` no inserta. `festival_de_dos_parecidos` inserta el marco pero ya es SECURITY DEFINER, así que su disparador ya veía todas las filas. Ninguna necesitó cambio.

## Pruebas

- Nueva `supabase/tests/pg/slug-fichas-ocultas.test.mjs`, por el camino real de publicar (`guardar_evento_con_avisos` como `authenticated`). La administración oculta los dos eventos de Ana («noche-de-slug-escondido» y «…-2031-03-14»). Beto publica el mismo título el mismo día y recibe **`noche-de-slug-escondido-2031-03-14-2`**, sin ver ninguno de los ocultos antes ni después. Bloqueo: recibe `tarde-de-slug-bloqueado-2031-03-14`. Lugar privado ajeno: `patio-del-slug-2`. Artista oculto: `duo-del-slug-2`. Después vienen la edición, `p_excluir_id` y el contrato de las tres funciones (definer, path vacío, sin EXECUTE para `anon` ni `authenticated`). `slug_de_evento` sigue sin definer.
- Después del arreglo: `npm run test:db`, **91 migraciones, 1925 pruebas, 0 fallaron** (las de Security Advisor y las de slug de siempre, incluidas).
- La verificación completa de la rama (lint, typecheck, unitarias, inventario, medir) va en la bitácora 373, que la corrió con las dos piezas juntas.

## Para el gestor

- **Aplicar `20261008110000_slug_eventos_ocultos.sql` después de `20261008100000_festival_parecido.sql`.** No pide variables de entorno ni cambios en la app.
- **Hallazgo aparte (no lo toqué):** `artista_sin_duplicado` (disparador `before insert or update`, sin definer) tiene el mismo punto ciego. No ve a un artista oculto de **la misma ciudad**. Antes, ese alta acababa en el `23505` del slug, con el mismo código que su propio error, `artista_duplicado`. Con este arreglo el alta entra con slug `-2` y queda un duplicado del artista oculto. Si la regla debe impedir volver a dar de alta un artista que la administración ocultó, ese disparador también tiene que ver todas las filas. Lo decide el founder: es una regla de producto, no un fallo técnico.
- Sin council, workflows ni agentes; nada aplicado a la base; nada en producción.
