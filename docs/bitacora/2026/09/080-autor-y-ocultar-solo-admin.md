# 080 · El autor de una ficha y ocultarla, solo la administración (OL-053)

**Fecha:** 2026-09-16 (noche) · **Rama:** `autor-y-ocultar-solo-admin` (árbol de trabajo `practical-hamilton-833e20`; solo commits locales, sin push) · **Base:** el hallazgo apartado en la bitácora [076](076-crear-lugar-privado.md), confirmado en PGlite con las migraciones de `main`. El número de bitácora, el OL y el nombre de la migración los reservó el encargado de gestión de cambios.

## Qué pasaba
- Las reglas de edición de lugares (`20260916120000_lugares_cuentas.sql`, 0024) y de artistas (`20260914050000_artistas.sql`, 0010) revisan la fila nueva con `gestiona_lugar(id)` y `gestiona_artista(id)`. Esas funciones buscan la ficha en la tabla, y Postgres revisa antes de escribir: leen la fila guardada y nunca ven el autor nuevo.
- Con una petición directa a la API (la app nunca manda `creado_por` al editar):
  - el autor le pasaba su lugar a otra cuenta, o dejaba su artista sin autor;
  - una cuenta ligada que no es la autora no podía borrar el lugar, pero se ponía de autora (`creado_por = auth.uid()`) y entonces sí lo borraba, porque "borra autor o admin" solo mira `creado_por`. Con el lugar se fue el evento que había publicado otra persona. Con un artista pasaba lo mismo. La bitácora [054](054-reclamar-lugares.md) dice que la cuenta ligada edita, pero no oculta ni borra;
  - también servía el upsert de la API.
- Antes de 0024, la regla de lugares miraba `creado_por = auth.uid()` en la fila nueva y lo impedía. Los eventos no tenían el hueco: su regla mira la columna.
- **Ocultar:** la app solo le enseña "Ocultar" y "Volver a mostrar" a la administración, pero la base dejaba ocultar y volver a mostrar al autor (lugares, artistas y eventos) y a la cuenta ligada. Si la administración ocultaba algo por un reporte, quien lo publicó lo volvía a mostrar.

## El arreglo sugerido rompía "Borrar mi cuenta"
El hallazgo proponía un trigger que fallara al cambiar `creado_por` sin `es_admin()`. Así, borrar la cuenta de quien publicó algo falla. La llave foránea (`on delete set null`) deja sus fichas sin autor con un UPDATE que corre como dueña de la tabla, pero con la sesión de quien se borra, que no es administradora. Se comprobó con una sonda en PGlite: dentro de ese UPDATE, `current_user` es `postgres` y `auth.uid()` es la cuenta que se borra. Tampoco pasarían borrar una cuenta desde Supabase ni la llave de servicio (importaciones), que no traen sesión.

## Decisión del founder
La pregunta, en palabras llanas (2026-09-16, noche): hoy solo él ve el botón Ocultar, pero por la API ocultan y vuelven a mostrar quien publicó y la cuenta ligada, también lo que él ocultó por un reporte. ¿Quién debe poder? Respuesta: **«Solo tú»**, la opción recomendada. Ocultar y volver a mostrar lugares, artistas y eventos es solo de la administración, y quien publicó algo lo sigue pudiendo borrar. "Tú" se lee como la administración (`es_admin()`), que es a quien la app ya le enseña el botón.

## Qué se hizo
- **Migración `supabase/migrations/20260917095000_autor_y_visible_solo_admin.sql`, sin aplicar.** Va después de las migraciones de zona horaria (`20260917100000_zona_horaria.sql`) y de lectura al crear (`lectura_al_crear`, que puede volver a llamarse `20260917093000` para aplicarse antes). Crea la función `proteger_autor_y_visible()` y un trigger con ese nombre antes de cada UPDATE de `creado_por` o `visible` en `lugares`, `artistas` y `eventos`, como `proteger_rol`:
  - si pide una cuenta (roles `anon` o `authenticated`) que no es administradora, cambiar `creado_por` da "solo la administración cambia el autor de una ficha" y cambiar `visible`, "solo la administración oculta o vuelve a mostrar una ficha" (código 42501);
  - mandar los mismos valores no estorba;
  - no vigila lo que hace la propia base (la llave foránea al borrar una cuenta, los triggers de la zona horaria), la llave de servicio, las migraciones ni el editor de Supabase: son los mismos a los que no se aplican las reglas por fila. Por eso la función no es `security definer`: `current_user` tiene que ser quien pide;
  - `revoke update (creado_por)` no sirve (hallazgo P2, bitácora [072](072-panel-de-administracion-construido.md)).
- **Banco `supabase/tests/autor_y_visible_solo_admin.mjs`** (PGlite instalado fuera del repo, como los otros bancos):
  - con las migraciones de antes reproduce el fallo, en transacciones que se deshacen;
  - aplica la migración y las que sigan;
  - comprueba que lo que la app hace hoy sigue pasando: altas con RETURNING, "Soy yo", ediciones del autor, de la cuenta ligada y del administrador con las mismas columnas que mandan los formularios, reclamar, pasarle la ficha, borrar lo propio, borrar una cuenta ("Borrar mi cuenta" y desde Supabase), importar con la llave de servicio y, si está entre las migraciones, la zona horaria que se propaga a los eventos del lugar;
  - comprueba que el autor y lo visible solo los cambia la administración: ni el autor ni la cuenta ligada, tampoco por upsert. La cuenta ligada ya no borra, y los eventos de otras personas siguen ahí.
- **Comentarios** de `cambiarVisible` (lugares) y `cambiarVisibleArtista`: decían que decidían el autor o la política; ahora dicen que solo la administración, por el trigger.
- **Sin cambios de pantalla:** ningún botón que ve quien no administra escribe `visible` ni `creado_por`. Se revisó todo lo que escribe en `lugares`, `artistas` y `eventos`: formularios, acciones del panel, el cron y los scripts.

## Verificación
- **Banco nuevo:**
  - 66 comprobaciones en verde con las migraciones de `main`;
  - 68 con la zona horaria y `lectura_al_crear` aplicadas antes, en los dos órdenes posibles: `lectura_al_crear` como `110000` (después de la zona horaria) o como `093000` (antes). `lectura_al_crear` es la de su commit en `crear-lugar-privado`. La zona horaria se probó en dos versiones: la de su commit y la que está en curso sin commit en el árbol `cualquier-pais` (sus eventos conservan la hora a la vista al cambiar la zona del lugar);
  - `FORZAR_FALLO=1` sale con error.
- **Cinco versiones rotas de la migración, cada una detectada por el banco:**
  - `security definer`: 25 fallos;
  - sin la guarda de roles (el arreglo sugerido tal cual): 6, que son borrar la cuenta (desde la app y desde Supabase) y la llave de servicio;
  - sin la comprobación de `visible`: 9;
  - sin los triggers: 25;
  - sin el trigger de eventos: 3.
- **Bancos de las otras piezas con esta migración:** el del panel da 95 comprobaciones y el de `lectura_al_crear`, 42, en las cuatro combinaciones.
- **Código:** lint (0 errores; el aviso ajeno de `docs/diseno/logotipo/iconos-sn.mjs`), tipos, 258 pruebas y build en verde.
- **Sin captura:** no cambia ninguna pantalla; la evidencia es el banco.
- Nada se leyó ni se escribió en producción.

## Visto al pasar (no se tocó)
- Cuando el autor intenta borrar un lugar con eventos de otras personas, la ficha le dice "Si ya no existe, ocúltalo o avisa al administrador", pero el botón Ocultar nunca lo vio (ya era así). Con la decisión solo queda "avisa al administrador": es un cambio de texto para otra pieza de pantalla.
- Si la administración le pasara un lugar privado a otra cuenta, dejaría de ser privado en la siguiente edición de esa cuenta (`privadoPermitido`). No hay camino para pedir lo privado, porque nadie más lo ve.

## Queda
- **Aplicar la migración** `20260917095000_autor_y_visible_solo_admin.sql` cuando lo indique gestión de cambios, después de las de zona horaria y lectura al crear. Se puede aplicar antes de mezclar, porque el código de hoy sigue funcionando. Mientras no se aplique, el hueco sigue abierto en producción.
- **Push, PR y merge:** los lleva gestión de cambios.
- **En el iPhone, sin pantalla nueva que firmar:** comprobar que Ocultar, Volver a mostrar y Pasarle la ficha siguen funcionando desde el panel.
