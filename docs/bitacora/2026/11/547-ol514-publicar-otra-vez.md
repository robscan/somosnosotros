**No publicada:** decisión del founder del 12 de noviembre de 2026 (OL-515 cubre la necesidad).

# 547 · OL-514 · Publicar otra vez una ficha que ya salió en Instagram

**Fecha:** 2026-11-12. **Rama:** `claude/republish-rinoceronte-theater-xfhjza` (desde `origin/main` `fb317db`). **Quién:** un chat en la nube abierto por el founder desde su teléfono. **Migración:** ninguna.

## Qué pidió el founder

«¿Me puedes ayudar a publicar nuevamente el lugar teatro el rinoceronte enamorado? Le faltaba la URL de su Instagram.» La ficha ya tiene su Instagram (`@elrinoenamorado`) y está visible. Entre dos caminos (una consulta a mano, solo esta vez, o una pieza pequeña en la app) eligió: «Pieza pequeña».

## Por qué hacía falta

«Cambiar», en la hoja de un día de Administración › Instagram › Semana, solo lista a quien devuelve `instagram_candidatos`, que deja fuera a quien salió en los últimos 6 meses. La base no impide repetir (`instagram_semana_cambiar` solo rechaza un día que ya salió, una ficha sin material o una «fuera de Instagram»): el límite estaba solo en la lista.

## Qué cambió

1. **«Cambiar» lista aparte a quien ya salió.** Debajo de los candidatos de siempre: «Ya salieron en los últimos 6 meses. Se pueden publicar otra vez:», con cada ficha y «Salió en Instagram hace 9 días» (hoy, ayer, días, semanas o meses). Hasta 20, del más reciente al más viejo. Vale para los días de artista y de lugar.
2. **Elegir uno pide confirmar.** «¿Publicar otra vez a …?»: dice cuándo salió, que vuelve a salir ese día con lo que su ficha dice ahora y que la publicación anterior sigue en Instagram (se borra desde la cuenta). «Sí, publicar otra vez» lo pone en el día (la misma `cambiarDia`); «Mejor no» vuelve a la lista. El día queda con el motivo «Elegido a mano: sale otra vez.»
3. **Quién no aparece ahí:** fichas ocultas o privadas, las que dijeron que no («fuera de Instagram») y las que ya tienen un día programado de hoy en adelante.
4. **La rotación automática no cambia:** el sistema sigue sin elegir solo a nadie que haya salido en 6 meses.

Archivos: `src/app/admin/instagram/semana.ts` (`salieronHacePoco`: lee `instagram_publicaciones`, la ficha, `instagram_fuera` e `instagram_semana` con la sesión de la administración), `src/app/admin/instagram/accionesSemana.ts` (`candidatosDia` devuelve `yaSalieron`; el motivo), `src/lib/instagram/semana.ts` (`lineaYaSalio`), `src/components/instagram/HojaDia.tsx` (el apartado y la confirmación) y sus pruebas.

## Evidencia

- `npm run typecheck`: verde. `eslint` de los cuatro archivos tocados: sin avisos.
- `vitest` de `src/lib/instagram/semana.test.ts` y `src/app/admin/instagram`: 40 pruebas en verde (una nueva, la línea de quien ya salió).
- Prueba de la hoja en Chromium a 390×844 (`HojaDia.componentes.test.mjs`): 12 en verde (una nueva: el apartado, la confirmación, «Mejor no» y «Sí, publicar otra vez»).
- Capturas 390×844 de la prueba (con datos de ejemplo): la lista y la confirmación, en `docs/bitacora/2026/11/547-capturas/` del commit `13c75362` de la rama de la nube (no se traen a `main`: el código no se publica).

## Lo que NO se comprobó

- **Nada contra la base de producción:** este chat no tiene sesión de administración ni llaves. La lectura de `salieronHacePoco` con la sesión real (las políticas de `instagram_publicaciones`, `instagram_fuera` e `instagram_semana` dicen que la administración las lee) queda por probar en la vista previa o en producción.
- No se corrió la suite completa, ni `npm run build`, ni el banco de la base (no hay cambios de SQL).
- No se sabe si la publicación anterior del teatro salió o falló: eso está en la base.

## Reglas del proyecto: lo que quedó fuera de norma

- **No se avisó al chat de gestión de cambios antes de empezar** (regla 0): desde la nube no hay ningún chat gestor al que escribir (todos archivados o en la Mac del founder). El founder pidió la pieza aquí mismo. Los números (OL-514, bitácora 547) salen de `scripts/ops/siguiente-bitacora.sh`, sin reserva del gestor: si el gestor ya los dio a otra pieza, se cambian al integrar.
- La rama la puso el entorno de la nube (`claude/…`), no el gestor.

## Qué sigue

1. Revisión del gestor y «publica» del founder.
2. Ya en producción, el founder: Administración › Instagram › Semana › un día de lugar por salir (o el domingo, «Poner un lugar este día») › «Cambiar» › abajo, Teatro El Rinoceronte Enamorado › «Sí, publicar otra vez». Si quiere que salga en el momento, «Publicar ahora».
3. Borrar a mano en Instagram la publicación anterior, si ya no la quiere.

## Qué pasó después (gestor IX, 2026-11-12)

El gestor revisó la rama de la nube y el founder decidió dejar OL-514 fuera («OL-514: dejarla fuera»): «Publicar otra vez» se puede hacer desde la ficha con OL-515 (bitácora [548](548-ol515-publicar-desde-ficha.md)), sin tocar «Cambiar» ni la rotación de la semana. De esta pieza solo se conserva `lineaYaSalio` (`src/lib/instagram/semana.ts`), que OL-515 usa. Esta bitácora queda como registro del pedido y de lo que se probó.
