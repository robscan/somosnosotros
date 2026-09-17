# 072 · Iconos en Voy, Me interesa y Seguir; la agenda sin Calendario al deslizar

**Fecha:** 2026-09-16 (noche) · **Rama:** `iconos-acciones` (commit local, sin push) · **Pieza:** OL-046.

## Qué pidió el founder
Tras ver el prototipo de la bitácora [071](071-prototipo-deslizar.md):

> "Ok, quita calendario de agenda, está de más. Vi que agregaste icono a voy y me interesa, úsalo también en los botones de las fichas, lo mismo para seguir en lugares y artistas."

## Qué se hizo
1. **Prototipo v1.1** ([deslizar.html](../../../rediseno/prototipos/deslizar.html), mismo enlace: https://claude.ai/artifact/7jPHxXrKV3CMiDoXS5Jf2B).
   - En su propuesta, un evento ya solo muestra Voy y Me interesa al deslizar.
   - Las notas dicen "Voy · Me interesa", y la pregunta de "tres botones" pasa a "¿Las acciones caben bien bajo el pulgar?".
2. **Ficha de evento** (`Asistencia.tsx`), los iconos del prototipo:
   - **Voy** lleva la palomita (`IconoOk`) y **Me interesa** la estrella (`IconoEstrella`), con sesión y sin ella.
   - En el estado elegido cada acción conserva su icono: "Voy" ya tenía la palomita; "Me interesa" pasa de palomita a estrella.
3. **Ficha de lugar y de artista** (`Seguir.tsx`): **Seguir** lleva el "+" (`IconoMas`), con sesión y sin ella. "Sigues" conserva la palomita.
4. **Estilos:** separación entre icono y texto en `.primaria` (`Ficha.module.css`) y en `.interesa` (ficha de evento). Los otros botones con `.primaria` ("Es mi espacio", "Soy yo") no llevan icono y no cambian.

Sin migración.

## Evidencia
- lint (el aviso viejo del script del logotipo, ajeno), typecheck, 212 pruebas y build en verde.
- **Mirado a 390×844** con el build de la rama servido en local, sin sesión:
  - **Ficha de ΚΟΣΜΟΣ:** la barra muestra "☆ Me interesa" (la estrella sin subrayar, el texto subrayado como antes) y "✓ Voy" en el botón lleno.
  - **Ficha de Casa del Poeta:** "+ Seguir" a lo ancho.
  - **Ficha de Abdiel El Andromeda:** el botón Seguir trae el trazo del "+".
- **Sin mirar en pantalla:** los estados elegidos ("✓ Voy", "☆ Me interesa", "✓ Sigues"). Piden decir Voy o seguir con una cuenta, y eso escribe en producción. El cambio ahí es solo el icono de Me interesa.

## Firma pendiente
- En el iPhone del founder: la barra del evento, sin y con decisión, y Seguir en un lugar y un artista.
- En el prototipo: la agenda con solo Voy y Me interesa.

Push, PR y merge los gestiona el chat de gestión de cambios.
