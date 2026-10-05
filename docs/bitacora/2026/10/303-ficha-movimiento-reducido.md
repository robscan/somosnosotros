# 303 · Ficha visible con movimiento reducido — OL-276

**Fecha:**2026-10-04. **Rama:** `ficha-movimiento-reducido`. **Base:** origin/main `a5ad0838d4de06fa79f6fb9161edb918abc24d46`. **Worktree:** `.claude/worktrees/ficha-movimiento-reducido`. **Operador:** Codex `01a108e1-7881-7420-85d0-9ce1947405c1`.

## Encargo

Durante la QA de OL-275, entrar directamente o recargar una ficha con «reducir movimiento» dejaba la pantalla en blanco. El frame completo se miró antes de medir: main.x=320/390, documento640/780. Gestor III confirmó la causa y reservó esta pieza en mensaje189: afecta a todas las fichas y debe publicarse antes de OL-275. Rama propia desde origin/main, únicamente EntradaFicha.tsx/CSS, regresión y documentación propia. Sin ayudantes, rediseño, SQL ni producción. Se leyeron memoria/reservas/gestión/estado/contexto; se verificó base vigente y siguiente303/OL-276.

## Causa y arreglo

El servidor no tiene matchMedia y emite clase cerrada. El primer render cliente, con movimiento reducido, nacía quieta. React conserva el atributo SSR diferente y ningún efecto cambiaba después el estado quieta: quedaba translateX(100%) permanentemente. La navegación desde una tarjeta montaba en cliente y sí funcionaba.

El estado inicial ahora coincide en ambos lados (cerrada). El efecto pasa a quieta si la preferencia es reducir movimiento y a abierta si es normal, en el primer cuadro. El CSS reducido da transform:none desde el primer pintado, aun antes de JavaScript. Se conserva la entrada normal de220ms y su liberación a quieta/tope400ms, necesaria para las acciones fijas. No cambian layouts, copys ni campos. La ficha de evento no usa este envoltorio; se prueba como control.

## Evidencia

- Reproducción con SSR/hydrateRoot reales del componente previo:8 casos,2 fallos en movimiento reducido (uno por ancho);6 correctos. No se trata de createRoot sin SSR.
- Regresión corregida:8 casos de hidratación/montaje más2 de primer pintado SSR sin JavaScript, a320/390. Comprueba ausencia de errores de hidratación, ficha en pantalla, ancho y acción fija al pie.
- Lint/tipos correctos; único warning heredado VisorImagen.componentes.test.mjs:171.137 archivos/1889 unitarias de la base correctas.
- Build correcto e inventario/24 pantallas×4 anchos correctos (98s), sin alterar presupuestos. PostgreSQL no se repite porque no hay cambios SQL ni de acceso a datos.
- [Evidencia visual](../../../rediseno/capturas-303/README.md):36 recorridos reales sobre la app compilada,12 PNG completos mirados. Artista/lugar/evento, entrada directa/recarga/tarjeta y ambas preferencias. Sin desborde horizontal ni transform residual, sin errores de navegador. Datos/imágenes simulados, sin escrituras ni acceso a Supabase remoto.

**Estado:** corrección lista para PR sin unir/revisión final del gestor, que decide su publicación prioritaria. SHA/CI/preview se entregan por el mismo canal. Safari del iPhone físico todavía no probado.
