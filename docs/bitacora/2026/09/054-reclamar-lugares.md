# 054 · Reclamar lugares, como ya se reclaman los artistas

**Fecha:** 2026-09-16 (noche) · **Base:** OL-015 (1b) de la cola repartida (bitácora [052](052-firma-y-cola-en-marcha.md)).

## Qué pidió
Que un lugar se pueda reclamar igual que un artista. Hoy los 13 lugares del catálogo (CAPO) y los 48 institucionales no tienen dueño: los edita solo el administrador. Quien lleva el espacio de verdad tiene que poder pedir la ficha, y con ella editarla. Mismo mecanismo que Artistas: tabla de cuentas ligadas, regla de permisos, acción de reclamar, letrero discreto al final de la ficha y solo con sesión, y el botón del administrador para pasarle la ficha a esa cuenta.

## Qué se hizo
- **Migración `supabase/migrations/20260916120000_lugares_cuentas.sql` (0024), POR APLICAR.** No se corrió `npm run db:push`: la aplica el coordinador. Trae la tabla `lugares_cuentas` (`lugar_id`, `perfil_id`, `creado_en`; llaves, índice por perfil y RLS calcados de `artistas_cuentas`), la función `gestiona_lugar(uuid)` (autor, cuenta ligada o admin) y las políticas de `lugares`: la lectura y la edición pasan por `gestiona_lugar`, y "privado" sigue siendo solo del administrador. Los eventos no cambian: ligar un lugar no da mando sobre lo que otras personas publican ahí, igual que ligar un artista no da mando sobre sus fechas. Los reportes ya aceptaban tipo `lugar` y los motivos `es_mio` y `retirar` desde la migración 0010, así que no hubo que tocar sus restricciones.
- **`reclamarLugar`** en `src/app/lugares/acciones.ts`, copia de `reclamarArtista`: escribe un reporte (`tipo: lugar`, motivo `es_mio` o `retirar`) con la cuenta de quien lo pide.
- **`EsMiEspacio`** (`src/app/lugares/[id]/EsMiEspacio.tsx`): letrero discreto "¿Es tu espacio?" al final de la ficha, en gris y subrayado, que abre la hoja con el mismo dibujo y el mismo tono que "Soy yo / es mi grupo": por qué (con el origen dentro, si la ficha vino de un catálogo), "Sí, quiero llevar yo la ficha", "Sí, y quiero que se quite", y al final evidencia y no promesa: "El administrador lo revisa y te escribe a t…@…". Solo se ofrece con sesión y a quien todavía no puede editar (sin sesión no se ofrece, para no invitar a reclamos ajenos).
- **La ficha deja editar a la cuenta ligada** (`src/app/lugares/[id]/page.tsx` y `.../editar/page.tsx`): `puedeEditar` = admin, autor o ligado. Borrar se separa en `puedeBorrar` (admin o autor), que es lo que permite la política de la base; el aviso de ficha oculta ya nombra a la cuenta ligada.
- **Panel del administrador:** `ligarArtistaDesdeAdmin` pasa a ser `ligarFichaDesdeAdmin(tipo, …)` y sirve para artista y lugar: liga la cuenta, le pasa la autoría y marca el reporte atendido. El botón "Pasar la ficha a esta cuenta" ahora sale también en los reportes de lugar, y el motivo se lee según la ficha ("Dice que es su espacio y quiere llevar la ficha").
- **Sin CSS repetido:** `EsMiNombre.module.css` se movió a `src/components/ui/Reclamar.module.css` y lo usan los dos letreros.
- **Pruebas** en `src/lib/reportes.test.ts` para lo que es lógica pura: `etiquetaMotivo` (el mismo motivo leído según la ficha, y los motivos de reportar que no cambian), `pideLlevarLaFicha` (solo `es_mio` y solo en artista y lugar) y que el formulario de reportar sigue sin aceptar los motivos de reclamo.

## Evidencia
- `npm run lint`, `npm run typecheck`, `npm test` (152 pruebas, 22 archivos) y `npm run build` en verde.
- Mirado a 390×844 en la ficha de la Casa del Poeta Ramón López Velarde, con el servidor de desarrollo de esta rama contra la base de producción: **sin sesión no aparece nada nuevo** al final de la ficha; forzando el letrero en local para mirar el dibujo, "¿Es tu espacio?" queda bajo "Publicado por …", y al tocarlo emerge la hoja con "¿Llevas tú Casa del Poeta Ramón López Velarde?", el porqué y los dos botones. Después se quitó el forzado y la ficha volvió a no mostrar nada sin sesión.
- La migración todavía no está aplicada y la ficha aguanta: la consulta a `lugares_cuentas` devuelve error, se lee como "nadie ligado" y la pantalla se pinta igual (ni un error en el registro del servidor).

## Queda
- **Aplicar la migración `20260916120000_lugares_cuentas.sql`** (la aplica el coordinador; si otra rama mete antes su migración, el número 0024 se corre).
- Probar el camino entero con sesión una vez aplicada: pedir la ficha desde una cuenta, verla en /admin, "Pasar la ficha a esta cuenta" y editar el lugar desde esa cuenta. No se pudo hacer aquí (exige una cuenta de prueba y correo).
- Mirar la hoja en un lugar del CAPO, para leer el texto con origen ("Esta ficha se tomó del Catálogo de Artistas Potosinos…").
- Decisión pendiente para el founder: hoy la cuenta ligada edita el lugar pero no puede ocultarlo ni borrarlo, y los eventos que otras personas publican en su espacio siguen siendo de ellas. Si quiere que quien lleva el lugar tenga más mando, se dice y se cambia la regla.

## Firma pendiente
El founder, en su iPhone, después de aplicar la migración: ver el letrero al final de una ficha sin dueño con su sesión, pedir la ficha y atender el reporte desde /admin.
