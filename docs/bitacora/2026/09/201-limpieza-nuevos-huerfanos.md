# 201 · Limpieza: se retira la carga de «Nuevos» que ya no usaba ninguna pantalla (OL-166)

**Fecha:** 2026-09-24 · **Rama:** `limpieza-nuevos-huerfanos`, desde `origin/main` (`8a656da`, con el PR #200 unido después). **Quien lo hace:** el gestor de cambios en la nube (sesión `session_01XrJvzKysk1Y39vzpLGT9HG`), con la orden del founder «une los PRs y limpia» (2026-09-24). Pieza chica anotada al cierre de la jornada 23 («limpieza: `lib/cargarNuevos.ts` y `nuevosVisto.ts` huérfanos»).

## Causa medida

Desde OL-156 (Inicio como raíz, PR #189) la pestaña «Nuevos» de la agenda ya no existe: Nuevos y Cercanos viven como carriles en Inicio, y `AgendaInicio.tsx` manda cualquier enlace viejo a `?pestana=nuevos` a «Todos». Con eso quedaron sin uso:

- `src/lib/cargarNuevos.ts` (56 líneas): límites, campos y validaciones de esa carga. Solo lo importaba la acción `cargarNuevos` de `src/app/accionesAgenda.ts`.
- La acción `cargarNuevos` (53 líneas): ninguna pantalla la llamaba; solo sus pruebas y el simulacro de `src/components/nuevos.componentes.test.mjs` (que no la ejecuta: es un doble para empaquetar `AgendaInicio`, que ya no la importa).
- `src/lib/nuevosVisto.ts` (55 líneas): el corte «visto» de Nuevos. Solo lo importaba su prueba.

Comprobación: `grep` de `cargarNuevos` y `nuevosVisto` en `src/` fuera de pruebas da solo la acción y el comentario de `cargarCercanos.ts`; `cargarCercanos` (la acción viva, usada por `CarrilCercanos.tsx`) no comparte código con lo retirado, salvo el tipo `Decididas`, que `cargarCercanos.ts` ya exportaba.

## Qué cambia

- Borrados: `src/lib/cargarNuevos.ts`, `src/lib/nuevosVisto.ts`, `src/lib/nuevosVisto.test.ts` y `src/app/accionesAgenda.test.ts` (sus 69 pruebas probaban solo `cargarNuevos`).
- `src/app/accionesAgenda.ts`: se quita la acción `cargarNuevos` y su import; `Decididas` se importa de `@/lib/cargarCercanos`. `esperar`, `UUID` y `cargarCercanos` quedan igual.
- `src/lib/cargarCercanos.ts`: solo el comentario que decía «no una función compartida con cargarNuevos.ts», actualizado.
- `nuevos.componentes.test.mjs` no se toca: su doble de `@/app/accionesAgenda` es inerte y la prueba sigue en verde.

Sin migración, sin pantalla que cambie, sin variables de entorno.

## Pruebas

```
npm run lint && npm run typecheck && npm test && npm run build
```

Lint 0 errores (1 warning preexistente en `docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1068 pruebas en 89 archivos**, todas en verde (antes 1137 en 91: la diferencia son exactamente los dos archivos de prueba retirados); build completo, 25 páginas estáticas. Todo en el árbol de trabajo del gestor en la nube tras `npm ci` (`package.json` y `package-lock.json` intactos).

## Lo que queda anotado

- `cargarCercanos` (la acción viva) no tiene pruebas propias: las que existían en `accionesAgenda.test.ts` cubrían solo `cargarNuevos`, aunque la lógica de tiempo de espera y de validación es la misma. Pieza chica sugerida: pruebas de `cargarCercanos` con el mismo banco (contrato de campos, tope de 200, tiempo de espera de 8 s, sesión inválida).
- Las ramas remotas ya unidas a main (46) no se pudieron borrar desde la nube: el proxy de la sesión rechaza el `git push --delete` con 403 (política, no se reintenta). Las borra el founder o el gestor local con `git push origin --delete <rama>`; la lista está en la entrada OL-166 de OPEN_LOOPS.

## Cierre

Commit en `limpieza-nuevos-huerfanos`; PR abierto por el gestor con el permiso de limpieza del founder.
