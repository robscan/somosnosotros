# 226 · Colisión de mayúsculas del letrero del correo ligado (OL-199)

**2026-09-25 · Pieza chica, solo renombre, sin cambio de comportamiento.**

## Qué leí

- `docs/ops/OPEN_LOOPS.md`, línea OL-199: `src/app/artistas/LetreroCorreoLigado.tsx` (componente) y
  `letreroCorreoLigado.ts` (lógica, OL-177) solo difieren en mayúsculas; en macOS (sistema de archivos que no
  distingue mayúsculas de minúsculas) TypeScript los confunde y `npm run typecheck` / `npm run build` fallan;
  en Linux pasan porque ahí el sistema de archivos sí distingue.
- Los tres archivos afectados: `LetreroCorreoLigado.tsx`, `letreroCorreoLigado.ts`, `letreroCorreoLigado.test.ts`.
- `grep -rn "letreroCorreoLigado" src` para confirmar que solo esos dos archivos importan el módulo de lógica.

## Qué hice

- `git mv src/app/artistas/letreroCorreoLigado.ts src/app/artistas/letreroCorreoLigadoLogica.ts`
- `git mv src/app/artistas/letreroCorreoLigado.test.ts src/app/artistas/letreroCorreoLigadoLogica.test.ts`
- Actualicé el único import en `letreroCorreoLigadoLogica.test.ts` y el único import en
  `LetreroCorreoLigado.tsx` para apuntar a `./letreroCorreoLigadoLogica`.
- No toqué el archivo de estilos `LetreroCorreoLigado.module.css` (mismo nombre que el componente, sin choque:
  solo el componente lo importa y ambos siguen con mayúscula inicial).
- Sin cambios de comportamiento: la función `siguienteEstadoLetrero` y el tipo `EstadoFinalLetrero` quedan
  igual, solo cambia el nombre del archivo que los contiene.

## Evidencia

En la Mac, worktree `/Users/apple-1/somosnosotros/.claude/worktrees/agent-a31acacb271dca526`, rama
`letrero-mayusculas`:

- `npm run lint`: verde (1 warning ajeno en `docs/diseno/logotipo/iconos-sn.mjs`, no tocado en esta pieza).
- `npm run typecheck`: verde.
  - Nota aparte (no de esta pieza): antes de `npm install --no-save` el typecheck fallaba por dos módulos
    sin instalar en este worktree (`@vercel/analytics/next`, `qrcode`), ya declarados en `package.json` de
    piezas previas (OL-118, analítica de Vercel). No se tocó `package.json` ni `package-lock.json`.
- `npm test`: verde, 98 archivos / 1255 pruebas, incluida `letreroCorreoLigadoLogica.test.ts` con sus 4 casos.
- `npm run build`: verde, `next build` completo, 25 páginas generadas.
- `git diff origin/main...HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'`: sin salida (sin correos en el diff).

Sin capturas: no hay UI nueva ni cambio visual.

## Qué queda

- Nada de esta pieza. Falta que el gestor de cambios revise el PR y decida cuándo unirlo a `main`.
