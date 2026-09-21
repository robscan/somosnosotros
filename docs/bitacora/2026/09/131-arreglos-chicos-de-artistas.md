# Bitácora 131 · Arreglos chicos de artistas (OL-096)

**Fecha:** 2026-09-21
**Operador:** Claude Haiku 4.5 (sesión del Gestor de cambios II)
**Rama:** `artistas-arreglos-chicos`
**Base:** `main` (94e0e15)

## Resumen

Cuatro arreglos pequeños en la zona de artistas, uno por commit:

1. **L17:** Enlace de Instagram desde @usuario con www y barra final
2. **L24:** Carril de enlaces con continuidad visual y etiqueta genérica ("Sitio web")
3. **L30:** Opción de quitar la foto (vuelve el símbolo SN)
4. **L35:** Prevenir reclamos duplicados al presionar el botón varias veces

## Cambios por arreglo

### 1. L17: Enlace de Instagram (Commit ebca4d1)

**Problema:** @cinemacuarentena y URLs de Instagram sin www no llevaban al sitio correcto.

**Solución:** Normalizar todas las formas a `https://www.instagram.com/usuario/`

**Archivos:**
- `src/lib/enlaces.ts` — reconocerEnlace normaliza @usuario y URLs de Instagram
- `src/lib/eventos.ts` — enlaceDesdeCartel también lo usa
- Tests actualizados en: enlaces.test.ts, eventos.test.ts, artistas.test.ts, lugares.test.ts, capo.test.ts

**Casos cubiertos:**
- @usuario.con.puntos
- @cinemacuarentena
- https://instagram.com/usuario (sin www)
- https://www.instagram.com/usuario/ (con barra)
- https://www.instagram.com/usuario (sin barra)

### 2. L24: Carril de enlaces (Commit 82fbb58)

**Problema:** Carril de enlaces deforma botones con URLs largas; no se ve que hay más.

**Soluciones:**
1. **CSS:** Cambiar `flex-basis` de 3 a 2.5 elementos para asomar los siguientes
2. **Etiqueta:** Sitios web se rotulan "Sitio web" en lugar de dominio

**Archivos:**
- `src/lib/enlaces.ts` — etiquetaEnlace ahora devuelve "Sitio web"
- `src/components/ui/Ficha.module.css` — ajuste de flex-basis, overflow, text-overflow
- Tests: enlaces.test.ts

#### Corrección posterior del founder (2026-09-21)

**Nuevas palabras del founder:** "El botón que se asoma no se debe cortar con la máscara del padding interno. Que se extienda como lo hemos hecho con slider antes."

**Problema:** Carril de acciones recortado en el margen interno de la página; debe sangrar hasta el borde como el carril de Destacados.

**Solución:** Aplicar patrón de Destacados.module.css al carril:
- `margin-inline: calc(-1 * var(--gutter))` — salirse del margen de la página
- `padding-inline: var(--gutter)` — repone el margen interno
- `scroll-padding-inline: var(--gutter)` — para scroll correcto

**Archivos:**
- `src/components/ui/Ficha.module.css` — `.acciones` con nuevas propiedades margin/padding
- No requiere cambios en flex-basis (100% sigue siendo el ancho del padding-box)
- No requiere cambios en JavaScript

**Verificación:**
- Con 3 o menos acciones: visualmente igual (mismo ancho y alineación)
- Con 4+: primero alineado al margen, último alineado al margen derecho
- Sin scroll horizontal en página
- Funciona en fichas de lugar, evento, persona y borrado

### 3. L30: Quitar la foto (Commit a8ca2b5)

**Problema:** No hay opción de quitar una foto equivocada de un artista.

**Solución:** Botón ✕ al lado de la cámara que limpia la foto (vuelve el placeholder SN).

**Archivos:**
- `src/app/artistas/FormularioArtista.tsx` — agregar botón ✕ en sección de foto
- Usa clase CSS `canon.opciones` para flexbox de acciones

**Comportamiento:**
- El botón aparece solo cuando hay foto cargada
- Al hacer clic, setea `foto` a `null`
- El formulario se actualiza sin anidar contenedores

### 4. L35: Prevenir reclamos duplicados (Commit 36177e5)

**Problema:** Presionar varias veces el botón de reclamo registra varios.

**Solución:** Verificar si existe un reclamo pendiente igual antes de insertar.

**Archivos:**
- `src/app/artistas/acciones.ts` — reclamarArtista verifica deduplicación
- `src/app/artistas/acciones.test.ts` — test de la lógica
- `scripts/capo/capo.test.ts` — ajuste por cambio de URLs de Instagram

**Lógica:**
```
SELECT id FROM reportes WHERE
  tipo='artista' AND
  objeto_id=artistaId AND
  creado_por=usuario AND
  motivo=motivo AND
  atendido=false
```

Si existe: `return { ok: true }` (sin insertar)
Si no: insertar y `return { ok: true }`

**Efecto:** Presionar varias veces siempre devuelve ok=true, nunca error; solo un reclamo en la BD.

## Resultados

**Tests:**
```
Test Files  15 passed (15)
Tests  149 passed (149)
```

**Lint:** 1 warning no relacionado (iconos-sn.mjs)

**TypeScript:** ✓ Sin errores

## Pendientes para el gestor

- Corregir la foto equivocada de Tristana Landeros (L30) — no lo hizo el operador, es solo lectura en producción
- Publicar cuando considere (PR, CI, despliegue)

## Notas de desarrollo

- L35 no requiere migración (solo deduplicación en servidor)
- L24 usa CSS sin JavaScript (flex-basis ajustado)
- L30 reutiliza patrón de acciones de formulario (canon.opciones)
- L17 normaliza Instagram en dos funciones (reconocerEnlace y enlaceDesdeCartel)
