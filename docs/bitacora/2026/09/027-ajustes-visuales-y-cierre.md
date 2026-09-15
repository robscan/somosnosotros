# 027 · Ajustes visuales del founder y cierre del chat (2026-09-14)

Cinco PR cortos, cada uno pedido por el founder tras ver producción, fusionados por su orden para probar en prod:

- **PR #24** · "Soy yo / es mi grupo" en vez de "Es mi nombre" en la ficha de artista (el texto no dejaba claro que se pide la ficha). Hoja: "¿Eres X?" → "Sí, quiero llevar yo la ficha" · "Sí, y quiero que se quite".
- **PR #25** · Regreso como píldora secundaria con chevron corto (`ui/Atras`), en la barra interior y en las páginas de error. Regla en LINEA_GRAFICA.md.
- **PR #26** · Color de acción: **azul petróleo `#0f6b7c`** en vez de tinta (con la tinta no se distinguía el estado activo de la nav). Publicar, Voy, Seguir, Entrar, nav activa, pestañas y chips activos. Logotipo y texto siguen en tinta; rojo solo para errores.
- **PR #27** · "Publicar evento" con icono en la agenda; mapa de Lugares en perspectiva (50°, edificios en 3D) con botón 3D/2D; el encuadre inicial conserva la inclinación.
- **PR #28** · Nav inferior a 60 px con sombra y píldora del color de acción detrás del icono activo; aviso de ubicación como `ui/Aviso` (tinta sobre blanco, con ✕, persistente).

También en el día: Artistas (PR #21), enlaces reconocidos (PR #22), Entrar con código (PR #23) y el diseño de las pantallas restantes (documentos 10 y 11, prototipo) pendiente de firma.

## Error corregido

En el PR #27, un `git add -A` arrastró al merge dos archivos de otra sesión de Claude que trabaja en la misma carpeta (`scripts/capo/capo.ts` y la migración `20260914060000_capo.sql`, del importador del Catálogo de Artistas Potosinos). Se sacaron del historial con `git rm --cached` (siguen en disco, sin seguimiento); la migración no se aplicó a la base. Regla nueva en la memoria del agente: en esta carpeta solo se añaden los archivos propios, por nombre.

## Estado al cerrar

Producción tiene todo lo anterior. Abierto: firma del founder del documento 10 (pantallas restantes) y luego los PR 2 a 4 (ficha de persona, alta de lugar, ajustes del alta de evento); su prueba del código de Entrar con correo real en el iPhone; Google para después. Todo en OPEN_LOOPS.
