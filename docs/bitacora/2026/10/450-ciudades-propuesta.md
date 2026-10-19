# 450 · OL-417 · Propuesta: ciudades nuevas, ubicación primero y boletín por región

**Fecha:** 2026-10-19. **Rama:** `ciudades-propuesta`, solo documentación. **Operador:** Gestor VII (Fable 5.1). **Pedido del founder:** tras el plan de la bitácora 449 dictó el orden para abrir una ciudad (lugares → alta → agendas → catálogo tipo CAPO), una pantalla de Administración con la lista de ciudades y tres botones que él detona para correr la investigación con la API, «amigxs y Somos Nosotrxs en toda la app», boletín para todos con baja clara y por región según la ubicación de cada persona, y que San Luis Potosí deje de ser la ciudad por omisión: «analiza lo que te digo, identifica áreas de oportunidad, propón y presenta soluciones».

## Qué se entrega

- [`docs/rediseno/57-ciudades-ubicacion-boletin.md`](../../../rediseno/57-ciudades-ubicacion-boletin.md): decisiones textuales, estado actual comprobado, ocho áreas de oportunidad, la propuesta en cuatro partes (ubicación primero, Administración › Ciudades, boletín por región, marca) con el orden de siete piezas y cinco preguntas para la firma.
- Sin código, sin migración, sin datos tocados.

## Lo comprobado para escribirla

- `CIUDAD_INICIAL` y la elección de ciudad en el teléfono (`src/lib/ciudad.ts`); la ubicación solo en `localStorage` (`src/lib/ubicacion.ts`); `perfiles` sin ciudad.
- Producción (solo lectura): 80 cuentas, 11 con correo y 14 con push.
- 133 apariciones de «Somos Nosotros» y 18 de «Somos Nosotrxs» en `src`.
- Secciones de Administración, scripts de carga existentes y la guía de agendas de octubre.

## Por confirmar

Las cinco preguntas del §5 del doc 57 y la lectura de «lugares abiertos» como «ciudades abiertas».
