# 363 · Privacidad de medición y plazo del creador de cartel (OL-334)

**Fecha:** 2026-10-07. **Rama:** `medir-urls-y-plazo`, base `origin/main` `f72a76fd`. Trabajo iniciado por el agente del gestor IV y terminado/revisado por Codex según el relevo. **Estado:** candidato probado localmente, sin unir ni publicar en producción. Sin migraciones ni variables nuevas; sin cambios de interfaz.

Vercel y Google comparten una limpieza de URL: las fichas de personas se agrupan, y los filtros conservan únicamente valores de sus listas cerradas. Las subcategorías libres de artistas se omiten de la medición. Se reutilizan las listas que ya usa la app.

La descarga de cada imagen lleva una señal de cancelación y plazo máximo de 4 segundos, dentro de un presupuesto de 8 segundos compartido con la preparación de la foto. También vencen las lecturas del cuerpo y su validación. Rechazar una respuesta no espera una cancelación que pudiera quedar pendiente. Sin foto válida se conserva el cartel tipográfico.

**Verificación del candidato:** 109 pruebas focalizadas correctas; lint sin errores (una advertencia preexistente en VisorImagen); typecheck correcto; 3.106 unitarias correctas en 181 archivos; inventario sin novedades; compilación local y medición de 35 pantallas por cuatro anchos, sin novedades. Datos inventados y descargas simuladas; sin envíos de analítica reales. No cambia interfaz y no requiere captura nueva. El detalle técnico y los registros de pruebas se conservan en privado.

**Límites:** los plazos no cancelan el trabajo nativo de Sharp que ya comenzó; los límites de bytes, píxeles y la preparación acotada siguen vigentes. Pendiente: revisión del gestor, CI del PR y «publica» del founder.
