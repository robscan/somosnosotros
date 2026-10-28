# 492 · La tira de destacados pasa de 8 a 12 (OL-460)

**Fecha:** 2026-10-23. **Rama:** `destacados-tope-12`, desde `origin/main` (`4a981bca`, con OL-459 unido, #578). **Operador:** agente de la pieza
(Claude) para el Gestor VII, sin otros agentes. **Migración:** `supabase/migrations/20261023160000_destacados_tope_12.sql` (solo `create or
replace` de `tira_destacados`). **Estado:** espera la revisión del gestor.

## El pedido

Tras OL-459 (bitácora 491), el founder decidió subir el tope: «12 está bien» y «publica».

## Qué cambia

- `tira_destacados` es idéntica a la de `20261023150000_destacados_automaticos.sql` salvo `limit 12` (antes 8) y sus dos comentarios. La firma,
  las columnas (`id, motivo, hasta, van`), la regla, el orden y los permisos no cambian.
- El tope no vive en TypeScript: la app toma lo que da la base. Dos comentarios que decían «la tira de 8» (`src/lib/destacados.ts`,
  `src/app/admin/[seccion]/MenuFicha.tsx`) ahora dicen 12.

## Dónde se ve y por qué no rompe el diseño

- **Inicio** («Destacados» y «Seleccionados para ti»): `carrilDestacados` y `carrilEstelar` ya cortan en `TOPE_ESTELAR = 12`. Es un carril con
  desplazamiento horizontal: con 12 tarjetas solo hay más que desplazar.
- **Artistas destacadxs** (`artistas_destacados_novedades`): ya cortaba el carril en 12 y lee la tira por posición. No cambia. Ahora caben hasta 12
  elegidos; antes, desde el noveno, un elegido solo entraba si tenía novedad.
- **Lugares**: la tira pinta en naranja los lugares destacados en el mapa y la lista. Con 12 hay más puntos naranjas, pero la disposición no cambia.
- **Agenda** y **Artistas**: no leen la tira (sus destacados viven en Inicio).
- **Administración** (filtro «Destacados» y menú «···»): son renglones de una lista. Salen los que estén.

## Banco

- `destacados-automaticos.test.mjs`: 13 candidatos dan 12, con el elegido primero, y queda fuera uno de los de menos puntos (los que entraron solo
  por 6 visitas).
- `destacados-novedades.test.mjs`: el borde heredado del tope (antes «la novena elección entra como novedad») pasa a 12. Con 13 elegidos, el carril
  de artistas se llena con 12 elegidos y la elección 13 no sale. Si a uno se le quita la foto, quedan 11 elegidos y la elección 13 entra por su
  novedad. El elegido del caso «al vencer la novedad» pasa del artista 29 al 33, porque 29 ya está entre los 13.
- Control negativo: sin la migración nueva fallan esas 4 comprobaciones (tope 8).

## Verificación

`TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (113 migraciones, **2 519 pruebas, 0 fallaron**), `npm run lint` (0
errores, los 2 avisos de siempre), `npm run typecheck`, `npm test` (286 archivos, 4 681 pruebas), `npm run test:componentes` (725, 0 fallaron),
`npm run inventario` (sin novedades), `npm run medir` (60 pantallas × 4 anchos, sin novedades) y `npm run build` en verde. Sin capturas nuevas: no
cambia ninguna pantalla, solo cuántas tarjetas puede traer la tira (el respaldo local imita la tira solo con elegidos).
