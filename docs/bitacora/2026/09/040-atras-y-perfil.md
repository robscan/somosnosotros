# 040 · Atrás genérico y ajustes al perfil desde el iPhone

**Fecha:** 2026-09-15 · **Rama:** `atras-y-perfil` → [PR #41](https://github.com/robscan/somosnosotros/pull/41), fusionado y en producción el mismo día · **Pieza:** OL-019 (corrección del founder tras probar el PR #39 en su iPhone)

## Qué pidió el founder
Con la captura de Mi perfil en su iPhone: (1) Ajustes y Compartir son acciones y deben vivir en la misma región; (2) el resumen en números en una sola línea, manteniendo la diferencia de tamaños, con aspecto de pestañas y una línea horizontal en la base que las relacione; (3) el botón de atrás decía "Agenda" pero la navegación no es lineal (se llega a una ficha desde un lugar, un artista o un enlace): que sea un atrás genérico.

## Qué se hizo
- **Atrás genérico** (`ui/Atras`, ahora cliente): dice "Atrás" y vuelve a la pantalla anterior de verdad (`router.back()`). `components/Navegacion` (en el layout, no pinta nada) cuenta las pantallas vistas en la pestaña en `sessionStorage`; si la pestaña no ha visto otra pantalla de la app (enlace compartido, app recién abierta), Atrás lleva a la pantalla madre de siempre (`href`). El nombre del nivel se conserva en el `aria-label`. Vale para todas las barras interiores sin tocar las páginas.
- **Cabecera de la ficha de persona**: Ajustes (solo la mía) y Compartir juntos, arriba a la derecha junto al nombre; la colonia debajo. Grid de dos filas: foto | nombre + acciones; foto | colonia.
- **Resumen en números como pestañas en una línea** (`PestanasPersona`): "3 Voy a · 2 Sigo · 1 Van a lo mismo" con el número grande y la etiqueta chica en línea base, una raya común abajo y la elegida con la raya del color de acción, como los filtros de la agenda. Se desliza si no cabe.
- Prototipo v4 y decisiones 5 y 13 de [13](../../rediseno/13-novedades-perfil-alta-flujo-y-estados.md) actualizados.

## Verificación
Lint, typecheck, 134 pruebas y build en verde. Mirado a 390×844 con un usuario desechable (borrado al terminar): Mi perfil con los dos iconos juntos arriba a la derecha y "3 Voy a · 2 Sigo" en una línea con la raya. Atrás: Lugares → Casa del Poeta → evento → Atrás vuelve a la Casa del Poeta (antes iba a Agenda). Enlace directo en una pestaña nueva: el contador arranca en 1 y Atrás lleva a la pantalla madre. Trampa conocida: si el navegador duplica la pestaña (window.open o "Duplicar"), copia el contador y Atrás puede salir de la app; en el iPhone un enlace compartido abre limpio.

## Corrección posterior (mismo día)
El founder probó en el iPhone: Atrás funciona; los números estaban al revés. Ahora es "Voy a 2 · Sigo 6" (etiqueta y luego el número grande). [PR #42](https://github.com/robscan/somosnosotros/pull/42).

- "Así te ven los demás" no cambiaba nada: la ficha pública redirigía a Mi perfil cuando era la propia. Ahora la muestra como la ven los demás (sin Ajustes ni coincidencias), con el aviso y Atrás a Mi perfil. [PR #43](https://github.com/robscan/somosnosotros/pull/43).

- **Doble línea al pie y limpieza** (aviso del founder: "no dejes basura, optimiza y limpia"): el pie "Así te ven los demás" tenía borde superior encima del borde del último renglón; se quita. Revisión de clases sin uso módulo por módulo (con el alias real de cada importador): `.dato` en la hoja de reserva (que pasa a `ReservaPerfil.module.css`, porque `AvisosPerfil` ya no la usa), `.editar` en `EditarPerfil.module.css` y `.peligro` en `ajustes.module.css`; quitadas. Medido Mi perfil en el navegador: 107 nodos, profundidad 9 (contando los trazos de los iconos), cero envoltorios de layout sin función (los seis `span` sin clase con un solo hijo son icono + texto en los renglones de la agenda, no envoltorios). [PR #44](https://github.com/robscan/somosnosotros/pull/44).

## Pendiente
- Firma del founder en el iPhone.
