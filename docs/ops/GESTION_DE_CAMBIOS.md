# Gestión de cambios — para que todo llegue a producción sin perder nada

Hay varios chats trabajando a la vez sobre la misma carpeta. Este documento dice cómo se reparte el trabajo para que ningún ajuste se pierda y nada llegue a producción sin verificar. Lo aplica cada chat; lo vigila el chat encargado de gestión de cambios (bitácora [061](../bitacora/2026/09/061-gestion-de-cambios.md)).

## Las reglas (para cada chat)

1. **Cada pieza en su rama.** Código nunca se escribe sobre `main`. Se abre un árbol de trabajo (worktree) o una rama con nombre de la pieza. Un PR por pieza.
2. **Lo que se escribe se guarda.** Antes de cerrar el chat, todo queda en un commit local (código en su rama; documentos de cierre pueden ir en `main` si son solo documentos). Un commit local no publica nada: el push y el merge siguen siendo del founder.
3. **`git add` por nombre, nunca `git add -A`.** Otros chats tienen archivos sin commit en la misma carpeta.
4. **Los números se piden al script.** Antes de crear la bitácora o una entrada nueva en OPEN_LOOPS:
   ```
   scripts/ops/siguiente-bitacora.sh
   ```
   Mira todas las ramas, los árboles de trabajo y lo que está sin commit. Si otro chat ya tomó el número, se toma el siguiente.
5. **OPEN_LOOPS: una línea propia y nada más.** Cada chat añade su entrada OL al inicio de "Ahora" y actualiza el resumen de "Last updated"; si el founder decidió algo, también su línea en "Decidido"; no reescribe entradas de otros chats. Los choques al mezclar los resuelve el encargado, conservando todo lo que cada rama añadió: antes de resolver, mirar **todos** los trozos de `git diff <base>..<rama> -- docs/ops/OPEN_LOOPS.md`, no solo el de arriba (el 2026-09-17 se perdió así una línea de "Decidido" y hubo que reponerla).
6. **Antes de abrir el PR:** traer `main` a la rama (`git merge main`), correr `npm run lint && npm run typecheck && npm test`, build en verde y captura móvil (390×844). El PR dice qué migraciones trae, qué variables de entorno pide y qué debe hacer el founder en Supabase o Vercel.
7. **Decisiones del founder (CLAUDE.md, DEFINICION, PLAN):** las edita solo el chat donde el founder decidió, con la fecha y sus palabras. Si dos chats registran decisiones opuestas en el mismo día, vale la última que dijo el founder y la anterior queda tachada en "Decidido" con su fecha.
8. **Push y merge solo cuando el founder lo pida.** El orden de los merges lo propone el encargado (primero lo que otros PR necesitan; los PR con migración, con el founder aplicándola antes de que se use). Después de cada merge: despliegue de Vercel en verde y OPEN_LOOPS diciendo "en producción".

## Tablero

```
scripts/ops/estado-cambios.sh
```
Dice qué hay sin commit, qué árboles y ramas tienen commits que `main` no tiene, qué PR están abiertos y con qué CI, las últimas migraciones y los números que siguen. Solo lee.

## Cómo cierra el encargado un día

1. Correr el tablero.
2. Guardar en commit lo que quedó sin commit en `main` (por nombre).
3. Por cada PR abierto: traer `main`, resolver OPEN_LOOPS, CI en verde.
4. Proponer al founder el orden de merge y lo que él debe aplicar (migraciones, variables).
5. Bitácora del encargado y OPEN_LOOPS al día.

## Por qué existe (16 de septiembre de 2026)

Esa noche tres chats escribieron sobre `main` sin commit (bitácoras 057, 058 y 059, tres documentos de decisión y OPEN_LOOPS), dos de ellos con decisiones opuestas sobre la app de la tienda en la misma noche, y un PR (#65) tocaba el mismo lugar de OPEN_LOOPS que esos cambios. Nada se perdió, pero por poco. Ver bitácora [061](../bitacora/2026/09/061-gestion-de-cambios.md).
