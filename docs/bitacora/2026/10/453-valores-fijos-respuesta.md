# 453 · OL-420 · Respuesta al análisis de valores fijos (operador de Casalo) y plan de desacople

**Fecha:** 2026-10-19. **Rama:** `valores-fijos-respuesta`, solo documentación. **Operador:** Gestor VII (Fable 5.1). **Pedido del founder:** compartió el documento de otro operador de Fable (proyecto Casalo) con los valores fijos del código de somosnosotros y pidió «revisa el listado, dime qué opinas, cuestiona fuertemente, sugiere si ves áreas de oportunidad y lista una solución», para reutilizar el código en ese proyecto.

## Qué se entrega

- [`docs/investigaciones/valores-fijos-respuesta.md`](../../../investigaciones/valores-fijos-respuesta.md): opinión sobre el objetivo (constantes en un módulo, no variables de entorno; lo reutilizable son las piezas sin dominio), tabla con cada afirmación comprobada en `main` (`4f36b5e8`), lo que se le escapó al análisis, la solución en cinco pasos y dos preguntas.
- Sin código, sin migración.

## Lo comprobado

- 106 apariciones de «Somos Nosotros» en 61 archivos fuera de pruebas; `somosnosotros.org` en 39; 85 líneas que nombran San Luis Potosí o `CIUDAD_INICIAL` en 20 archivos, incluido `cartel.ts`.
- `apps/android/twa-manifest.json:20` trae la ruta absoluta del keystore (el keystore vive en `privado/`, fuera de git).
- `direccionContexto.ts` ya expande «cdmx»; `MARCA_USER_AGENT` ya existe en `appNativa.ts`; `NEXT_PUBLIC_MAPBOX_STYLE` y `CORREO_REMITENTE` ya son variables.
- `enlaces.ts:62` es un comentario, no una prueba. `.env.example` no lista `SUPABASE_SERVICE_ROLE_KEY`.

## Por confirmar

Las dos preguntas del §4 y si `marca.ts` se hace dentro de la pieza «Somos Nosotrxs» como se recomienda.
