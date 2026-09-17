# 061 · Gestión de cambios: lo de la noche guardado, PR #65 al día y reglas para los chats

**Fecha:** 2026-09-16 (noche, cierre) · **Base:** el founder nombró a este chat encargado de operar y gestionar los cambios: «tengo varios chats corriendo en opus, que han generado ajustes en el proyecto a distintos niveles. Revisa y gobierna la gestión de cambios, para que cuando todo llegue a prod no se pierdan ajustes ni capacidades».

## Qué encontré
- **En `main`, sin commit, el trabajo de tres chats:** la app de la tienda (bitácora 057, OL-032), pedir ayuda al volver (058, OL-033) e instalar y avisos (059, OL-034, con los documentos 16 y 17 del rediseño y el prototipo). También CLAUDE.md, DEFINICION.md, PLAN.md y OPEN_LOOPS.md cambiados. La bitácora 057 ya estaba enlazada desde un commit de OPEN_LOOPS, pero el archivo nunca se había guardado.
- **Dos decisiones opuestas en la misma noche.** El chat de Apple registró "app de iPhone en la tienda"; más tarde, en el chat de instalar y avisos, el founder la detuvo («no veo necesario hacer app nativa aún. No suma valor todavía y me entretiene»). Los tres documentos de decisión ya decían lo último; la primera quedó tachada en "Decidido". Coherente: se guardó tal cual.
- **PR #65 (la ✕ de cerrar como icono)** con CI en verde, pero su OPEN_LOOPS parte de `main` sin lo de la noche: añade OL-035 justo donde `main` añade OL-034, y no toca "Last updated". Al mezclar habría chocado.
- **Dos chats seguían corriendo:** "Callout para instalar app" (sobre `main` directo, esperando la firma del founder para hacer un PR) y "Desempatar el orden de eventos a la misma hora" (en su árbol de trabajo, sin commits todavía). El segundo iba a numerar su bitácora sin ver la 060 del PR #65.

## Qué hice
1. **Commit en `main` con todo lo de la noche**, por nombre de archivo (044dc21). Sin push.
2. **Reglas escritas** en [GESTION_DE_CAMBIOS.md](../../ops/GESTION_DE_CAMBIOS.md) y resumidas en CLAUDE.md, para que cada chat nuevo las lea al empezar.
3. **Dos scripts** en `scripts/ops/`: `siguiente-bitacora.sh` (número de bitácora y de OL que siguen, mirando todas las ramas y árboles) y `estado-cambios.sh` (tablero de lo que hay sin guardar, ramas, PR, CI, migraciones).
4. **PR #65:** traje `main` a su rama y resolví OPEN_LOOPS conservando OL-034 y OL-035. Queda listo para el merge cuando el founder lo firme.
5. **Aviso a los dos chats que siguen corriendo:** rama propia, números reservados (Desempatar: bitácora 062 y OL-037), `git add` por nombre, una sola línea en OPEN_LOOPS.

## Visto al pasar
`npm run lint` fallaba en la Mac con 19 650 avisos: eslint entraba a `.claude/worktrees/` (los árboles de los otros chats, con su `node_modules`). El código está limpio y en CI pasa. Arreglo de una línea en la rama `lint-ignora-worktrees` (eslint ignora `.claude/`), sin push; con ella `lint`, `typecheck` y los 178 tests pasan en la Mac.

## Regla nueva que cambia una costumbre (para que el founder la confirme)
Hasta hoy, "commits solo cuando el founder lo pida". Desde hoy, **el commit local del cierre se hace siempre** (no publica nada); **el push y el merge siguen siendo del founder**. Es la única forma de que nada quede en el aire entre chats.

## Pendiente del founder
1. Decir "sube" para el push de `main` (dos commits: lo de la noche y esta gestión).
2. Firmar el PR #65 en su vista previa; con la firma se hace el merge.
4. Decir "sube" también para la rama `lint-ignora-worktrees` (un PR de una línea).
3. Confirmar la regla nueva del commit local.
