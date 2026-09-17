# 065 · Todo a producción: cinco ramas encadenadas, verificadas y mezcladas en orden

**Fecha:** 2026-09-16 (noche, madrugada del 17) · **Base:** el founder: «todos los chats terminaron, revisa cuidadosamente y gestiona todos los commits y PRs, ayúdame a llegar a main sin pérdida, señala hallazgos».

## Qué había
- `main` local con tres commits sin publicar (documentos de la noche y reglas de gestión de cambios).
- Cinco ramas: `lint-ignora-worktrees` (sin PR), `x-de-cerrar-icono` (PR #65), `orden-estable-agenda` (PR #66), `proxima-fecha-artistas` (PR #67, sale encima del #66) e `instalar-y-avisos` (39 archivos, sin PR ni CI).
- Cada rama tocaba el mismo punto de OPEN_LOOPS; el código no chocaba en ninguna (probado con una mezcla de ensayo).

## Qué se hizo
1. **Cadena en local:** cada rama trae a la anterior (lint → #65 → #66 → #67 → instalar) y OPEN_LOOPS unido a mano en cada paso, con las entradas OL-034 a OL-038 y el resumen de arriba completo.
2. **Verificación del conjunto** en la rama final: lint, tipos, 206 pruebas y build en verde.
3. **Dos revisiones de código** aparte: la rama grande de instalar y avisos, y los PR 65, 66 y 67. Sin nada que rompa producción.
4. **Publicación por el founder desde su terminal** (la app bloquea a este chat el push, abrir PR y mezclar): push de `main` y las cinco ramas; PR #68 (lint) y #69 (instalar y avisos) abiertos con cuerpos preparados; merges en orden #65, #66, #67 (el #68 se marcó mezclado solo) y, con CI y vista previa en verde, el #69.
5. **Vercel:** `main` desplegado en verde tras cada merge.

## Hallazgos
- **De la rama instalar y avisos** (segundo orden): el tope de 4 s del service worker reporta "apagado" a quien ya activó; "Ajustes del iPhone" debería ser "Configuración" en español de Latinoamérica (medir); el enlace mágico del correo pierde la intención de Voy al abrir otra pestaña; el iPad recibe los pasos del iPhone; `ORIGEN` copiado por octava vez; faltan pruebas de `intencionAvisos` y del borrado de suscripción.
- **De los PR de orden:** la lista de Lugares tiene la misma falla que arregló el #67 en Artistas; sin sesión `eventos_artistas` devuelve vacío con la llave pública (políticas, no de estos PR).
- **Del proceso:** los tres PR decían "firma en el iPhone" y se mezclaron sin ella por decisión del founder; la rama de instalar no se pudo probar dentro de la app instalada ni en Android. Tres SVG nuevos en `docs/diseno/logotipo/LogoFinal/` aparecieron en la carpeta principal sin commit; no se tocaron.

## Pendiente del founder
1. Probar en el iPhone lo de #65 a #69 con producción; Android si puede.
2. Decir si los SVG de `LogoFinal/` entran al repo.
3. Confirmar la regla del commit local al cerrar (OL-036).
4. Push de este cierre: `git push origin main`.
