# Bitácora 096: Topes de campos (OL-065)

Fecha: 2026-09-18  
Chat: "Topes de campos" (Haiku 4.5)

## Objetivo
Que los formularios de alta y edición de lugar, evento y artista (canon) apliquen en pantalla los mismos límites de longitud que la base de datos (checks en migraciones) y la validación del servidor. Así nadie descubre el error al tocar "Publicar".

## Cambios

### 1. Centralización de topes
- **`src/lib/limites.ts`** (nuevo): Fuente única de topes compartidos:
  - `LIMITES_LUGAR`: nombre (120), descripción (600), dirección (200), detalle (60)
  - `LIMITES_EVENTO`: título (120), descripción (1000), precio (60), sitio (120), dirección (200), indicaciones (300)
  - `LIMITES_ARTISTA`: nombre (80), detalle (40), descripción (600)
  - `LIMITES_PERFIL`: nombre (60), colonia (60), bio (140)
  - Función `topeDe()` para consultar topes por tabla y campo

- `src/lib/lugares.ts`, `src/lib/eventos.ts`, `src/lib/artistas.ts`: Reexportan desde `limites.ts`

### 2. Contador discreto
- **`src/components/ui/ContadorCaracteres.tsx`** (nuevo): Componente que muestra `actual/máximo` al 75% del tope, invisible si hay error
- **`src/components/ui/ContadorCaracteres.module.css`** (nuevo): Estilos mínimos

### 3. Campos con maxLength + contador
- `FormularioLugar.tsx`: 
  - `nombre` con contador en etiqueta
  - `detalle` con contador en línea
  - `descripcion` con `mostrarContador` en `Campo`

- `HojaDonde.tsx` (búsqueda de dirección): `direccion` con maxLength y contador

- `FormularioEvento.tsx`:
  - `titulo` con contador
  - `precio` con contador
  - `descripcion` con `mostrarContador`

- `HojaDondeEs.tsx`:
  - `sitioTexto` con contador
  - `direccion` (público) con contador
  - `direccionPrivada` (reservado) con contador
  - `indicaciones` con contador

- `FormularioArtista.tsx`:
  - `nombre` con contador
  - `detalle` con contador
  - `descripcion` con `mostrarContador`

- `SelectorQuien.tsx` (entrada de artistas en eventos):
  - Campo con maxLength de `LIMITES_ARTISTA.nombre` (antes hardcodeado como 80)
  - Contador discreto

### 4. Estilos para contador
- `src/components/ui/FormularioCanon.module.css`: clase `.contador`
- `src/components/ui/Sugerencia.module.css`: clase `.contador`

### 5. Pruebas
- **`src/lib/limites.test.ts`** (nuevo): 7 tests que verifican:
  - Pantalla + servidor usan los mismos topes (imports desde `eventos.ts`, `lugares.ts`, `artistas.ts`)
  - Valores concretos de cada tope
  - Función `topeDe()` cubre casos conocidos e inexistentes
  - Punto de activación del contador (75%)

Todos los tests pasan; `npm run lint`, `npm run typecheck` y `npm run build` en verde.

## Verificación
- Sin migración: no toca supabase/
- Texto antiguo que exceda tope: se muestra, se pide acortar al guardar (validación servidor)
- Contador aparece solo al ≥75% del tope, se oculta si hay error
- Pantalla y servidor comparten la verdad (topes en `src/lib/limites.ts`)

## Notas
- El componente `ContadorCaracteres` también está disponible para reutilizar en otros campos
- La función `topeDe()` permite inspeccionar topes programáticamente (útil para futuras validaciones)
