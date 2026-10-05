# 315 · Tipo de lugar «Plaza, jardín o parque»

**Pieza:** OL-287. **Rama:** `tipo-plaza-parque`. **Fecha:** 2026-10-05.
**Estado:** candidato listo para revisión del gestor; sin PR, sin publicar y la migración NO está aplicada a ninguna base remota.

## Qué y por qué

Decisión del founder (2026-10-05): «si agrega plaza o jardín/ parque». Sitios como el Jardín Botánico El Izotal solo cabían en «Otro».
Se añade el tipo `plaza`, con la etiqueta «Plaza, jardín o parque», justo antes de «Otro». Ningún lugar existente cambia de tipo.

## Archivos

- `supabase/migrations/20261005120000_tipo_plaza_parque.sql`: solo amplía `lugares_tipo_check`. Partió de la lista vigente
  (la de `20260914120000_tipos_museo_escuela.sql`; ninguna migración posterior volvió a tocar ese check). Ninguna fila cambia.
  Va ANTES de desplegar el código (si no, dar de alta una plaza falla).
- `src/lib/lugares.ts`: `TIPOS` con `{ valor: "plaza", etiqueta: "Plaza, jardín o parque" }` antes de «Otro». De ahí salen solos el
  tipo `Tipo`, los chips del alta (`FormularioLugar`), los chips del filtro y el filtro `?tipo=` de Lugares, `etiquetaTipo`,
  `tiposPresentes` y `validarLugar`.
- `src/lib/buscarLugares.ts`: `deducirTipo` propone `plaza` con «plaza», «jardín», «parque» o «alameda» (sin acentos ni
  mayúsculas) y con las categorías de Mapbox `park` o `garden`. Va al final: una palabra institucional gana («Teatro del Parque»
  es foro, «Museo del Jardín» es museo).
- Pruebas: `src/lib/lugares.test.ts`, `src/lib/buscarLugares.test.ts` y `supabase/tests/pg/lugares-tipo-plaza.test.mjs` (nuevo).

## Pruebas

- `npx vitest run src/lib/lugares src/lib/buscarLugares src/app/lugares`: 7 archivos, 79 pruebas, todas en verde.
- `npm run test:db` (Postgres local, base desechable): 77 migraciones aplicadas, 1465 pruebas, 0 fallaron; incluye plaza aceptado, los
  ocho tipos anteriores aceptados y `parque` rechazado con 23514.
- `npm run lint`: 0 errores (1 aviso previo en `VisorImagen.componentes.test.mjs`, no tocado). `npm run typecheck`: limpio.

## Desborde de la etiqueta larga (revisado en el CSS, sin captura)

Ningún sitio se rediseñó. Chips del alta (`FormularioCanon .chips`) y del filtro (`Chips envuelve`) envuelven por filas; el renglón de lugar
(`RenglonLugar`, `.envuelve`) envuelve su texto; la etiqueta del héroe (`ficha.etiqueta`) no tiene `nowrap`. El chip «quitar» de la fila de
contexto es `nowrap` y `flex: none`, pero esa fila desliza en horizontal (`overflow-x: auto`) y no desborda la página. Riesgo bajo; falta solo
una mirada real a 320 px cuando haya un lugar de este tipo.

## Límites y sitios que enumeran tipos sin tocar

- `scripts/capo/capo.ts` (`deducirTipoLugar`): importación del catálogo municipal, ya omite museo y escuela; no aplica.
- `scripts/instituciones/instituciones.ts`: acepta cualquier valor de `TIPOS` por su campo `tipo`; sin cambio.
- Respaldo local (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`) y prototipo `generar.py`: datos de ejemplo sin lugares de este tipo.
- No hay iconos por tipo de lugar en el código.
- Existen lugares ya dados de alta como «Otro» que podrían pasar a «Plaza, jardín o parque» (p. ej. El Izotal): es una decisión posterior, fuera de esta pieza.
