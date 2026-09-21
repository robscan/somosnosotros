# Bitácora 146: OL-111 · Analítica de Vercel: vistas por página

**Fecha:** 2026-09-21  
**Operador:** Claude Haiku 4.5  
**Rama:** `analitica-vercel` desde `cc1b44a` (origin/main)  
**Estado:** Listo

## Qué se hizo

Instalación e integración de Vercel Analytics en somosnosotros.org para rastrear vistas de página públicas, con protección de privacidad total: sin cookies, sin identificación de personas, sin eventos a medida.

### 1. Instalación de @vercel/analytics

- Versión instalada: **2.0.1** (estable actual)
- Archivos modificados: `package.json`, `package-lock.json`
- El installer no tira cambios en documentos, solo en dependencias.

### 2. Función de limpieza de URLs (privacidad)

**Archivo:** `src/lib/limpiarUrlAnalitica.ts`

Función pura que:
- **Bloquea rutas privadas:** `/admin*`, `/perfil*`, `/ajustes*`, `/invitacion*`, `/reclamar*`, `/entrar*`  
  → Vercel Analytics retorna `null` para estas rutas (no se tracean).
- **Quita parámetros privados de la query string:** `?q=`, `?buscar=`, `?ciudad=`, `?token=`, `?codigo=`  
  → Se envía la ruta limpia sin revelar intereses ni ubicación del usuario.
- **Mantiene parámetros públicos:** otros parámetros de filtrado/tipo se envían normales.

**Pruebas:** `src/lib/limpiarUrlAnalitica.test.ts`
- **27 pruebas, todas pasando:**
  - 8 rutas públicas permitidas ✓
  - 7 rutas privadas bloqueadas ✓
  - 7 parámetros privados removidos ✓
  - 3 casos complejos ✓
  - 2 casos de error ✓

### 3. Integración en el layout

**Archivo:** `src/components/AnalyticsVercel.tsx`

Componente cliente ("use client") que:
- Importa `Analytics` de `@vercel/analytics/next`
- Usa `beforeSend` con la función de limpieza
- Se coloca en `src/app/layout.tsx` como `<AnalyticsVercel />`

**Archivos modificados:**
- `src/app/layout.tsx`: importa y renderiza `<AnalyticsVercel />`
- Comentario en layout explica el uso (OL-111, fecha)

### 4. Aviso de privacidad actualizado

**Archivo:** `src/app/privacidad/page.tsx`

**Cambio exacto:**

```diff
Con las empresas que hacen funcionar el sitio, y solo para eso: Supabase 
(base de datos y acceso), Vercel (servidor), Resend (correos), Mapbox 
(mapa y direcciones) y Anthropic (lectura automática del cartel de un evento, 
solo la imagen que subes).
```

→

```diff
Con las empresas que hacen funcionar el sitio, y solo para eso: Supabase 
(base de datos y acceso), Vercel (servidor) y Vercel Analytics (vistas de 
página, sin cookies ni identificación de personas), Resend (correos), Mapbox 
(mapa y direcciones) y Anthropic (lectura automática del cartel de un evento, 
solo la imagen que subes).
```

**Línea nueva para firma del founder:**

> "Vercel Analytics (vistas de página, sin cookies ni identificación de personas)"

Esta línea se añadió en la sección "Con quién se comparten" del aviso de privacidad. El founder debe firmar antes de publicar. Hoy la página dice que el aviso de privacidad fue actualizado el **16 de septiembre de 2026**; al cambio del founder le toca la fecha de hoy.

## Verificación

**Lint:**
```
✓ Código limpio (1 warning preexistente en iconos-sn.mjs sin cambio en OL-111)
```

**TypeCheck:**
```
✓ Tipos generados sin errores
```

**Tests completos:**
```
Test Files  74 passed (74)
Tests       816 passed (816)
Duration    4.60s
```

**Build:**
```
✓ Build en verde, sin errores
✓ Rutas dinámicas y estáticas renderizadas correctamente
✓ No hay cambios en el output de tamaño: @vercel/analytics es liviano (~2KB comprimido)
```

## Notas técnicas

- Vercel Analytics en el plan gratuito: **50 000 vistas/mes**, sin costo
- En plan Pro (founder): **0.03 USD por cada mil vistas** (bastante barato)
- El script no envía datos en desarrollo (`next dev`), solo en producción
- No hay CSP que bloquee `/_vercel/insights/*` (estudiado en `next.config`)
- Función `limpiarUrlAnalitica` es pura y testeable: cero dependencias externas

## Lo que se envía a Vercel (ejemplos)

✓ `/lugares`  
✓ `/lugares/123`  
✓ `/eventos?tipo=gratuito`  
✓ `/artistas`  

## Lo que NO se envía a Vercel (bloqueado)

✗ `/admin*` (cualquier ruta de administración)  
✗ `/perfil*` (ruta de perfil privado)  
✗ `/ajustes*` (ruta de ajustes)  
✗ `/invitacion/*` (enlaces con token)  
✗ `/reclamar/*` (enlaces de reclamación)  
✗ `/lugares?q=teatro` → se envía como `/lugares` (sin la búsqueda)  
✗ `/eventos?ciudad=slp` → se envía como `/eventos` (sin la ciudad)  

## Commit e integración

Cambios locales en rama `analitica-vercel`. Sin push. Espera instrucciones del gestor para merge.

**Archivos tocados:**
- `package.json`, `package-lock.json` (dependencias)
- `src/lib/limpiarUrlAnalitica.ts` (función nueva)
- `src/lib/limpiarUrlAnalitica.test.ts` (pruebas nuevas)
- `src/components/AnalyticsVercel.tsx` (componente nuevo)
- `src/app/layout.tsx` (integración en layout)
- `src/app/privacidad/page.tsx` (aviso nuevo)

Todos los archivos están listos para commit.
