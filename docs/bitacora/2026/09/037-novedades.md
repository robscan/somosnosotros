# 037 · Novedades

**Fecha:** 2026-09-15 · **Rama:** `novedades` → [PR #38](https://github.com/robscan/somosnosotros/pull/38), fusionado y en producción el mismo día · **Pieza:** OL-019, PR A (diseño firmado en [13](../../rediseno/13-novedades-perfil-alta-flujo-y-estados.md), decisiones 1 a 4)

## Qué pidió el founder
Una sección de notificaciones "para formar las notificaciones que el usuario podría estarse perdiendo". Firmó el diseño el mismo día tras dos correcciones, con la redacción "Van a lo mismo".

## Qué se hizo
- **Base** (`20260915140000_novedades.sql`, aplicada a producción): `perfiles.novedades_vistas_en` (cuándo abrió la sección) y tabla `novedades` (solo `cambio`, con detalle cuando/donde/ambos; la lee cada quien, la escribe el servidor). Todo lo demás se calcula.
- **Cálculo** (`app/novedades/consultas.ts · cargarNovedades`): nuevo en los lugares que sigue y nueva fecha de los artistas que sigue (últimos 14 días, no publicados por la persona, no pasados); cambios de fecha o lugar en lo que va (los guarda `avisarCambioEvento` para todos los que van, tengan o no avisos); "Hoy vas"; "Van a lo mismo · Ana y Luis" (quién más dijo Voy a lo que va, últimos 14 días; los perfiles reservados no salen porque la base ya los esconde). Cada novedad lleva su fecha y `nueva` si es posterior a la última visita. Puro y con pruebas en `lib/novedades.ts`: grupos Hoy · Ayer · Esta semana · Hace más, textos.
- **Pantalla** `/novedades`: interior con regreso a Agenda; renglones con icono por causa (calendario con más, reloj, campana, personas), "qué pasó" en gris (del color de acción si es nuevo), el evento y cuándo; punto en lo no visto; tocar abre la ficha. Cuatro vacíos por causa: sin sesión (invitación a entrar), no sigue nada (Ver lugares · Ver artistas), nada nuevo (con cuántos sigue) y la lista. Al pie, solo si el teléfono está apagado: "Esto te llega por correo. En el teléfono aún no · Activar" (lleva a la hoja de avisos; en el PR B irá a Ajustes). Al pintarse, `MarcarVistas` guarda la fecha y el punto de la campana se apaga.
- **Campana** en la barra raíz (`components/Sesion`): con sesión, entre el logotipo y el avatar, con punto del color de acción si hay algo no visto; sin número; sin sesión no hay campana. La barra raíz pasa a grid de tres columnas (logotipo, campana, sesión), sin envoltorios.
- Iconos nuevos: campana y teléfono.

## Verificación
Lint, typecheck, 134 pruebas y build en verde. Mirado a 390×844 con un usuario desechable (sigue la Casa del Poeta y va a la Banda del Estado, a la que también va el founder; borrado al terminar): campana con punto en la agenda; Novedades con "Hoy · Van a lo mismo · robscan", "Ayer · Nuevo en Casa del Poeta…" y "Nueva fecha de Banda De Música Del Estado"; al volver a la agenda el punto ya no está (aria-label "Novedades"). Maquetación: el renglón es un enlace con cuatro hijos directos en grid con areas.

## Pendiente
- El cálculo corre en cada pantalla raíz con sesión (cinco consultas): si se nota, guardar la última novedad por persona en la base.
- PR B (Ajustes y Mi perfil con resumen en números) y PR C (alta de lugar canon).
- Firma del founder en el iPhone.
