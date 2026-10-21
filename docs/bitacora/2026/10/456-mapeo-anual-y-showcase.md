# 456 · OL-423 · Mapeo anual de la actividad cultural y showcase en Administración: pendientes, viabilidad y propuesta

**Fecha:** 2026-10-20. **Rama:** `mapeo-anual-showcase`, solo documentación. **Operador:** Gestor VII (Fable 5.1). **Pedido del founder:** listar los pendientes e investigaciones abiertas; investigar si es viable mapear la actividad cultural de todo 2026 localizando las agendas de enero en adelante y lo que organizaron o recibieron los lugares y artistas dados de alta, para nutrir la app con eventos pasados y el showcase; y evaluar el showcase como sección de Administración (viable, administrable, gobernable, escalable), con vulnerabilidades, oportunidades y propuestas. Autorizó crédito de la API.

## Qué se entrega

- [`docs/investigaciones/mapeo-anual-y-showcase.md`](../../../investigaciones/mapeo-anual-y-showcase.md): §2 pendientes (decisiones, cola de código, prototipos, investigaciones, pospuestos); §3 viabilidad del mapeo anual (las once agendas de 2026 localizadas en la página de la Secretaría de Cultura, pesos y páginas, qué cubren y qué no, estado de la base, tres pasos, costo y riesgos); §4 el showcase en Administración (pantallas, modelo de datos, evaluación por criterio, ocho vulnerabilidades, oportunidades, siete piezas en orden); §5 cuatro decisiones.

## Lo comprobado

- `cultura.slp.gob.mx/agenda-cultural/` lista las agendas de enero a octubre de 2026 (y 2024–2025) en `d3dac9gdq8t83x.cloudfront.net/media/archivos/`; los diez PDF responden 200 (2,8 a 13 MB; enero 14 páginas, mayo 40; sin texto extraíble).
- Producción: 383 eventos, todos de septiembre a diciembre de 2026; 364 cargados por la cuenta del founder; 147 con artistas; la tabla `eventos` no tiene `origen` ni `fuente_url`; 71 lugares visibles, 29 con Instagram, 25 institucionales.
- Sin código, sin migración, sin datos tocados.
