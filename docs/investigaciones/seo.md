# Estado del SEO y plan de mejoras

**Auditoría:** 4 de octubre de 2026. **Sitio:** [Somos Nosotros](https://somosnosotros.org/). **Reserva documental:** OL-277 / [bitácora 304](../bitacora/2026/10/304-investigacion-seo.md).

El sitio tiene una base técnica favorable y aparece bien en las búsquedas de marca y de un artista observadas. **Todavía no hay evidencia suficiente para afirmar que tiene buen posicionamiento general:** no apareció en la primera página de dos búsquedas locales relevantes y no se dispone de métricas históricas de Search Console. La prioridad es medir la búsqueda orgánica y corregir los problemas técnicos comprobados antes de ampliar contenido o páginas por ciudad.

El founder pidió analizar sin modificar código y, después, entregar el reporte al gestor, conservarlo con las investigaciones y comenzar mejoras únicamente con su luz verde. Gestor III autorizó guardar este documento y, tras su entrega, dos arreglos técnicos de la etapa A. B, C y D siguen como propuestas. Guardar el informe no autoriza publicarlo ni implementar las demás etapas.

## Alcance y confianza de la evidencia

Se revisaron producción, el sitemap completo y 28 rutas de muestra, incluidas páginas generales, fichas, variantes de ciudad y controles de evento vencido e inexistente. El código se contrastó con `origin/main` en `a5ad0838d4de06fa79f6fb9161edb918abc24d46`; el checkout principal estaba limpio pero atrasado y no se usó como prueba del código vigente. La auditoría fue de solo lectura.

Las observaciones de Google se hicieron en México con resultados no personalizados. Son una fotografía de esas consultas, no posición media, tendencia, tráfico ni prueba de causalidad. La muestra de fichas no representa todo el catálogo. Los conteos siguientes corresponden a la respuesta del sitemap, no a páginas indexadas.

| Evidencia | Resultado observado | Qué permite concluir |
| --- | --- | --- |
| `somos nosotros agenda cultural` | Agenda primer resultado web; portada segundo | La marca se encuentra en esa consulta |
| `Avith Ortega San Luis Potosí` | Ficha del artista primer resultado web | Hay visibilidad puntual por nombre propio |
| `agenda cultural San Luis Potosí` | El proyecto no apareció en la primera página | Hay una oportunidad de descubrimiento local; no se conoce la posición posterior |
| `eventos culturales San Luis Potosí hoy` | El proyecto no apareció en la primera página | Mismo límite para una intención de búsqueda cercana al producto |
| Consulta `site:somosnosotros.org` | Aparecieron fichas y otras páginas, incluida Entrar | Existe indexación; no mide cobertura total ni ranking |

Google advierte que [los resultados de `site:` no son exhaustivos](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site). No se deduce una tasa de indexación de esa consulta.

## Base técnica comprobada

- HTTPS funciona; HTTP y `www` redirigen al dominio principal con 308. Un enlace antiguo de evento por UUID también redirige con 308 a su slug.
- Las fichas muestreadas tienen título, descripción y canonical. El documento declara español. Se encontraron datos estructurados WebSite, Place, Person o PerformingGroup, Event y BreadcrumbList según la página.
- [robots.txt](https://somosnosotros.org/robots.txt) permite el rastreo general, bloquea `/avisos` y `/auth` y anuncia el sitemap.
- [sitemap.xml](https://somosnosotros.org/sitemap.xml) ofreció **891 URL: 66 fichas de lugares, 661 de artistas, 157 de eventos y 7 páginas generales**. No enumera variantes `?ciudad`.
- [Entrar](https://somosnosotros.org/entrar) y [Buscar](https://somosnosotros.org/buscar) respondieron con `noindex,nofollow` tanto en meta como en `X-Robots-Tag`.

Estas capacidades facilitan rastrear y comprender el sitio. No garantizan que todas las páginas sean indexadas ni que aparezcan entre los primeros resultados.

## Hallazgos y prioridades

### Medir resultados antes de prometer posicionamiento

La sesión de Search Console disponible durante la auditoría no mostró una propiedad de `somosnosotros.org`. Esto no demuestra que no exista en otra cuenta. No se obtuvieron clics, impresiones, CTR, posición media, consultas ni exclusiones de indexación. Vercel Analytics está instalado, pero no aporta ese diagnóstico del buscador.

**Recomendación:** localizar la propiedad existente o verificar el dominio con el permiso correspondiente. Tomar una línea base de 28 días y un periodo comparable si hay historial; separar marca de búsquedas genéricas y agrupar páginas generales, eventos, artistas y lugares. Revisar sitemap, indexación y resultados enriquecidos. La [documentación de rendimiento de Search Console](https://support.google.com/webmasters/answer/7576553?hl=es) explica las métricas; el promedio de posición no equivale a una posición fija para toda persona.

**Responsable de la operación:** gestor/founder. Este encargo no autoriza registrar propiedades, modificar DNS, cambiar cuentas ni enviar URL a buscadores.

### Lugares depende de JavaScript para sus enlaces de catálogo

El HTML inicial de [Lugares](https://somosnosotros.org/lugares), solicitado con Googlebot, contenía aproximadamente 13 palabras de contenido y **ningún enlace a una ficha de lugar**. La lista y sus enlaces aparecen en el navegador después de JavaScript.

El código explica la diferencia: [VistaLugares](../../src/app/lugares/VistaLugares.tsx) llama a [useResuelta](../../src/components/useResuelta.ts), cuyo estado empieza en `null` y se resuelve en un efecto del cliente. Mientras tanto devuelve un esqueleto en vez del cuerpo con [ListaLugares](../../src/components/ListaLugares.tsx). [Google puede renderizar JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), por lo que esta observación no prueba que las fichas no se indexen. Sí identifica una dependencia evitable para descubrir enlaces y contenido del directorio.

**Recomendación B, pendiente:** entregar enlaces públicos útiles desde el servidor conservando mapa, hoja, filtros y navegación. El sitemap ayuda al descubrimiento, pero no reemplaza el contexto de los enlaces internos. Hace falta una propuesta técnica antes de código para no bloquear la pantalla con extras de sesión ni duplicar la lista.

### La intención local necesita una propuesta de contenido

Inicio, Agenda, Lugares y Artistas no tienen un H1 de página en el HTML revisado. Los títulos y descripciones de directorios son neutrales y se repiten entre ciudades. Las variantes de ciudad válidas conservan su parámetro en canonical, aunque el sitemap no las enumera. La neutralidad de metadatos responde también a la memoria de ciudad de la pantalla; cambiarla sin conciliar servidor y cliente puede describir una ciudad distinta de la mostrada.

**Recomendación C, pendiente:** definir URL, título, encabezado y contenido útil para ciudades con oferta real. Decidir indexación de páginas vacías antes de añadirlas al sitemap. No generar variantes de todos los filtros ni páginas locales con texto repetido. Coordinar con OL-270/274 y el modelo de Eventos, incluidos sus prototipos y decisiones del founder.

La ausencia de H1 es una mejora semántica propuesta, no una causa demostrada del posicionamiento observado.

### Algunas fichas necesitan información propia confirmada

En las cinco fichas de artistas muestreadas, [Paulina Lucciotto](https://somosnosotros.org/artistas/paulina-lucciotto) presentó la descripción «Ficha por completar» y poco contenido propio. No se extrapola ese caso a las 661 URL de artistas.

**Recomendación editorial:** completar fichas prioritarias con biografía, disciplinas, trayectoria, redes y próximas actividades respaldadas por fuentes. Para lugares, explicar qué ofrecen y cómo visitarlos cuando exista información confirmada. El trabajo editorial necesita lote, fuentes y autorización de datos separados; no se deben inventar biografías o rellenar ausencias para SEO.

### La URL estructurada del evento difiere de su canonical

De seis eventos activos revisados, cinco emitían Event. Los cinco usaban una URL con UUID en el marcado aunque canonical apuntaba al slug. [La ficha del evento](../../src/app/eventos/[id]/page.tsx) pasa `id` pero omite `slug` a `jsonLdEvento`; [el serializador](../../src/lib/eventos.ts) ya acepta `slug`. Es una inconsistencia comprobada, aunque el UUID redirige correctamente y no se ha demostrado daño en ranking.

**A1 autorizada:** pasar el slug existente para que `Event.url` coincida con canonical. Mantener redirecciones antiguas y protección de direcciones reservadas. No ampliar el esquema ni modificar registros. Los datos estructurados deben describir la página y cumplir los [requisitos de Event de Google](https://developers.google.com/search/docs/appearance/structured-data/event); no garantizan un resultado enriquecido.

La muestra [Apertura: Juana](https://somosnosotros.org/eventos/9-festival-de-cine-uaslp-apertura-juana) originalmente no emitía Event: su sede estaba escrita «Centro Cultural Universitario Bicenteario» y carecía de dirección pública. **Actualización posterior a la entrega:** el gestor informó que corrigió dos vínculos al CC200 con autorización del founder. Se comprobó de nuevo Apertura: responde 200 y ya emite Event con la dirección pública del CC200. Su `Event.url` todavía usa UUID. El hallazgo original se conserva como antecedente; no se presenta la corrección de datos como trabajo de este operador.

### Las respuestas de eventos retirados requieren diagnóstico

El control inexistente `/eventos/no-existe-seo-audit-20261004` y el evento vencido `/eventos/lxs-colocaos-la-ultima-fogueada` respondieron HTTP 200, `noindex` y una estructura sin evento público. El código llama a `notFound` para estos casos. **Hipótesis:** podría existir un caso de soft 404 asociado a la respuesta transmitida; no se confirmó la causa ni se deduce eliminación de datos.

**D pendiente:** reproducir en aplicación compilada con agentes humano y Googlebot, separando inexistente, vencido, oculto y fallo de backend. Proponer después el ajuste mínimo de estado HTTP/indexación. Un archivo histórico público sería una decisión de producto distinta.

Entrar aún apareció en Google pese al `noindex` actual. Revisar último rastreo y canonical en Search Console antes de cambiar otra cosa: la observación puede corresponder a una versión anterior.

### El sitemap puede publicarse incompleto ante una falla

[La ruta del sitemap](../../src/app/sitemap.ts) usa `data ?? []` y no comprueba errores de sus cuatro consultas. Una respuesta con error puede producir un catálogo parcial con éxito aparente. Es un riesgo identificado en código; el sitemap descargado durante la auditoría no mostró un fallo de backend.

**A2 autorizada y decidida por el gestor:** si falla cualquiera de las consultas, responder con error 5xx en lugar de un 200 parcial. Sin cliente configurado, conservar las páginas generales como hoy. Probar cada consulta fallando por separado, sin publicar detalles internos del error.

El `.limit(5000)` no demuestra por sí mismo ausencia de un límite del servidor de datos. No se observó un corte en esta muestra; topes y paginación quedan fuera de A. El límite de URL por archivo del protocolo sitemap y un eventual límite de consulta son problemas distintos.

## Plan autorizado y etapas propuestas

| Etapa | Estado y entrega | Archivos y cierre |
| --- | --- | --- |
| D0 guardar investigación | Autorizada, OL-277 / bit304, rama `investigacion-seo`, base `a5ad0838` o posterior | Este documento, una fila en índice, bit304 y solo entrada/cabecera propias de OPEN_LOOPS. Diff y enlaces; commit local congelado para revisión |
| A1 URL de Event | Autorizada después de entregar D0, OL-278 / bit305, rama `seo-eventos-sitemap` desde `origin/main` | Solo pasar slug en la ficha y regresiones en `eventos.test.ts`: URL canónica, compatibilidad UUID y dirección reservada |
| A2 errores del sitemap | Misma reserva A; política decidida por gestor | `app/sitemap.ts`, `lib/sitemap.ts` y `lib/sitemap.test.ts`. Fallos de cada consulta, resultado completo y ausencia de cliente; sin paginación |
| B enlaces de Lugares en servidor | Propuesta técnica después de cerrar A; código pendiente | SSR con enlaces slug públicos; hidratación sin duplicados; filtros, lista, mapa/hoja y clics modificados conservados; sin exponer ocultos/privados. Revisión 320/390 si se autoriza UI |
| C páginas locales y fichas | Pendiente de decisiones y prototipos de ciudad/modelo; editorial aparte | Contenido propio y suficiente; contrato de canonical/indexación de vacíos; fuentes y permiso para datos |
| D soft 404 y rendimiento | Diagnóstico después de B, pendiente | Reproducción de estados; medir rendimiento antes de proponer optimizaciones; históricos fuera del ajuste mínimo |

A se entrega como PR sin unir, con SHA, CI completa y vista previa. Durante la corrección se usarán pruebas focalizadas; los controles del candidato siguen el protocolo del proyecto, reutilizando evidencia del mismo código cuando corresponda. No requiere SQL, variables nuevas, cambios de privacidad, analítica adicional ni escrituras de producción. **El gestor publica con la autorización aplicable del founder.**

## Datos que faltan para evaluar el resultado

PageSpeed API respondió 429 por cuota: no hay puntuación de rendimiento válida ni Core Web Vitals medidos. Bing mostró un desafío de acceso que no se resolvió; su posicionamiento permanece sin comprobar. Tampoco se midieron backlinks. No se afirma que esas áreas estén bien o mal.

Cuando exista información, evaluar LCP, INP y CLS con datos de campo y comparar por dispositivo. Los [Core Web Vitals de Google](https://developers.google.com/search/docs/appearance/core-web-vitals) orientan esa medición; una prueba aislada de laboratorio no sustituye la experiencia real agregada.

El cierre de A se mide por sus contratos técnicos, no por una promesa de tráfico. Para valorar descubrimiento orgánico después de publicar, comparar periodos equivalentes de Search Console, separar marca y búsquedas locales, y registrar cambios de oferta/eventos que puedan afectar resultados. La línea base aún está pendiente.

## Fuentes y continuidad

La evidencia pública descargada de la auditoría se mantuvo temporalmente en `/tmp/somosnosotros-seo-20261004`. **No se incorpora HTML ni RSC al repositorio:** este documento conserva síntesis, URL públicas, conteos y base de código. La evidencia temporal puede desaparecer; los resultados son una instantánea fechada, no un monitor permanente.

Antecedente: [indexación del catálogo, documento 36](../rediseno/36-indexar-catalogo.md). Sus estados y los de las bitácoras históricas no sustituyen las respuestas actuales de producción. Para retomar, leer [asignaciones](../ops/ASIGNACIONES.md), [gestión de cambios](../ops/GESTION_DE_CAMBIOS.md) y [OPEN_LOOPS](../ops/OPEN_LOOPS.md), comprobar Git y la reserva vigente. La autorización de D0/A se recibió directamente en Gestor de cambios III el 4 de octubre de 2026; detalles de entrega en bit304 y, para el código posterior, bit305.
