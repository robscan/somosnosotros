# 175 · «Cooperación solidaria» como costo del evento (OL-140)

**Fecha:** 2026-09-23 · **Rama:** `costo-cooperacion`, desde `origin/main` · **OL:** OL-140 (pieza E4) · **Modelo:** Sonnet 5, esfuerzo bajo

## De dónde sale

Pedido del founder: «En costo agrega Cooperación Solidaria». Hasta hoy el costo era gratis o un precio numérico. Hace falta una tercera opción sin cifra.

## Decisión de datos: sin migración

La columna `eventos.precio` ya es texto libre (hasta 60 caracteres, vacío = gratis) y la ficha, el renglón de la agenda, la vista previa al compartir y el resto de lugares donde se muestra el costo ya pintan `precio` tal cual. Por eso «Cooperación solidaria» se guarda en `precio` con ese texto exacto (`COOPERACION_SOLIDARIA` en `lib/eventos.ts`, con `esCooperacion`). No hay migración, los eventos existentes no cambian y el respaldo local y las pruebas de la RPC lo contemplan sin cambios. Gratis sigue siendo `precio = null`, así que los datos estructurados (`isAccessibleForFree`) no lo marcan como gratis.

## Qué se hizo

- `lib/eventos.ts`: la validación lee el campo `cooperacion`; con él el precio queda en «Cooperación solidaria», no pide cifra y gana sobre `gratis`.
- `eventos/acciones.ts`: `cooperacion` entra en las claves que lee el formulario (sin esto se habría perdido en silencio).
- `FormularioEvento.tsx`: el renglón «Cuánto» ofrece Gratis · Cooperación solidaria · Con costo, con el mismo canon y sin texto de ayuda nuevo; el precio numérico solo aparece con «Con costo». También en edición (se reconoce el valor guardado), en el borrador local y al leer un cartel (que nunca marca cooperación).
- Ficha, renglón de la agenda y vista previa al compartir: sin cambios de código, ya muestran `precio`.
- Pruebas: una de `validarEvento` (cooperación, gratis por defecto, precio numérico y prioridad de la cooperación) y una del guardado completo (llega a la RPC como precio).

## Verificación

`npm run lint` (1 warning preexistente), `npm run typecheck`, `npm test` (1040 pruebas) y `npm run build`: verdes. Capturas con `next build && next start`, respaldo local de datos inventados, Chrome real por `playwright-core` en el scratchpad (`package.json` y lock intactos, sin `.env` de otras carpetas), 390×844 a escala 2, Bricolage confirmada. El formulario mandó `gratis=no`, `cooperacion=si`, `precio=` vacío.

### Capturas (`docs/rediseno/capturas-175/`), todas abiertas

- `01-cuanto-opciones`: «Cuánto» abierto con Gratis elegido y las tres opciones: Gratis, Cooperación solidaria, Con costo.
- `02-cuanto-cooperacion-elegida`: «Cooperación solidaria» elegida; el valor del renglón lo dice y no aparece campo de precio.
- `03-cuanto-cerrado`: el renglón cerrado dice «Cooperación solidaria».
- `04-ficha-cooperacion`: la ficha del evento muestra «Cooperación solidaria» con el icono del boleto.
- `05-agenda-renglon`: el renglón del evento en la agenda dice «Cooperación solidaria» donde iría «Gratis» o el precio.

## Qué falta

Nada de código ni migración. Commit local, sin push.
