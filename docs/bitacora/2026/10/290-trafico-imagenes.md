# 290 · Imágenes adaptadas al tamaño visible (OL-263 / H13)

**Fecha:** 2026-10-03. **Estado:** publicado y comprobado en producción; pendiente firma en Safari físico.

Reserva del Gestor de cambios III en ASIGNACIONES, publicada mediante
[PR307](https://github.com/robscan/somosnosotros/pull/307), CI37165521850 correcto.
Rama `trafico-imagenes`, base `77152806c9eea36cdeb4f12c31a7945308121737`;
worktree `/Users/apple-1/somosnosotros-trafico-imagenes`. Script de numeración:
OL263 y bit290 libres. Sin subagentes.

El founder dijo «publica yb continua» tras pedir conciliar el historial. Continúa
vigente su autorización para publicar entregas de auditoría probadas y revisadas.
El gestor reservó diagnóstico previo al código y aceptó después Next/Image con
caché de al menos 30 días, seis anchos como máximo y una sola calidad. Amplió
expresamente la propiedad a `next.config.ts` (solo images), helper/componente y
pruebas, Cartel/Renglon/Destacados y las dos subidas de importadores que reutilizaban
rutas. El founder confirmó **Supabase Pro**; Vercel todavía sin confirmar.
No se consultó facturación ni se cambiaron planes.

## Punto de continuidad

Registro compartido en main77152806; código Production ee284157; migraciones
hasta20261003160000; H01–H05/OL257–262 cerradas por el gestor tras comprobar catálogo.
PR294, PR295 y TestFlight siguen pausados. Se conservan lugares ocultos distintos
de direcciones reservadas y borrado excepcional que mantiene/desvincula eventos.
No se modifica la rama principal, ASIGNACIONES ni entradas ajenas de OPEN_LOOPS.

## Diagnóstico reproducible

Producción pública, sin sesión, viewport390×844, DPR1 (navegador automatizado,
no Safari físico). Inspección visual: Inicio muestra dos carteles verticales,
chips y botones superpuestos, títulos debajo; Artistas muestra fotos redondas
en filas, con índice de letras y acciones. No se propone cambio de maquetación.

- Inicio:175 elementos img. Carteles visibles165×248 con originales1205×1600,
  1638×2048 y2250×2750. Artistas:101 img; fotos56×56 frente a1280×1280,
  1280×846 o933×1280. Sin srcset. Los conteos del DOM no son descargas.
- Cuatro HEAD de fotos públicas: HTTP200, JPEG y `Cache-Control: no-cache`.
  No-cache permite almacenar y revalidar; no demuestra descarga completa en
  cada visita. No se midió aquí el acierto de caché global ni el consumo facturado.
- Inventario comunicado por gestor:526 objetos,147MB, promedio285kB y máximo4MB.
  No se repitió el inventario ni se publicaron URLs de perfiles.

Simulación local con sharp, WebP calidad78, sin escribir Storage:

| Muestra pública | Original (bytes) | 192 px | 384 px | 768 px | 1280 px |
| --- | ---: | ---: | ---: | ---: | ---: |
| Susurros | 330464 | 7750 | 21358 | 53260 | 93960 |
| Cortometrajes | 406878 | 9298 | 26988 | 69926 | 132198 |
| Chatbot Challenge | 1106054 | 10408 | 30820 | 82200 | 157700 |
| Teatro de la Paz | 382653 | 3372 | 10894 | 57886 | 282532 |

Es una muestra exploratoria, no el ahorro global. El candidato usa calidad75,
por lo que su transferencia se mide aparte.

## Opción aceptada y límites

Recomprimir solo futuras subidas deja los objetos existentes intactos. Caché
sola no reduce la primera descarga. Variantes estáticas necesitan relleno y
coherencia al reemplazar imágenes. Las
[transformaciones de Supabase](https://supabase.com/docs/guides/storage/serving/image-transformations)
requieren Pro o superior y documentan100 originales incluidos y exceso$5/1000.

Se elige el optimizador existente de Next/Vercel: genera las variantes al usarse,
sin relleno, migración ni cambios a originales. La documentación de
[Vercel](https://vercel.com/docs/image-optimization/limits-and-pricing) indica
Hobby5000 transformaciones,300000 unidades de lectura y100000 de escritura por
mes; Pro factura uso y también transferencia/peticiones CDN. Se limita el
conjunto a96/192/384/768/1280/1920, calidad75 y WebP. Caché mínima30d según la
revisión del gestor, frente a24h inicialmente propuestas. El máximo teórico de
526×6=3156 combinaciones de tamaño **no es una previsión mensual**: hay nuevos
archivos, otros formatos negociados, expiraciones y otros componentes. No se
promete coste cero ni evitar cualquier agotamiento de cuota.

[Next](https://nextjs.org/docs/app/api-reference/components/image) usa el mayor
TTL entre origen y minimumCacheTTL. No garantiza una descarga única del original:
pueden repetirse por tamaño, formato o vencimiento. Las URLs nuevas deben cambiar
al cambiar los bytes; los importadores se adaptan antes de activar la caché larga.

## Implementación

- Componente Imagen sin envoltorio: conserva CSS, alt, dimensiones y carga
  diferida. Sizes diferencia renglón, cuatro formas de carril, avatar y héroe.
  El visor conserva el original para acercar.
- Solo optimiza imágenes raster del host público propio y bucket fotos.
  Queries/tokens, otros buckets, dominios externos, Google, blob, SVG y previews
  conservan su presentación directa. No cambia la frontera de escritura H05.
- Servidor: remotePatterns exacto, sin queries ni redirecciones; sin acceso a
  IPs privadas ni SVG; respuesta de origen limitada a5MiB; calidad/tamaños finitos.
- Fallo del optimizador: un intento directo del original sin srcset, sin bucle.
  No vuelve a pedir variantes fallidas cada render; una URL nueva se optimiza.
- La portada decorativa de la barra compacta usa384px y no descarga el original.
  Si ese fondo falla, conserva la base oscura de la barra.
- Las subidas del teléfono ya usan UUID y upsert:false. Los dos importadores
  usaban rutas estables/upsert:true: ahora el nombre incluye SHA-256 de los bytes
  finales, upsert:false y se reutiliza el objeto solo ante códigos explícitos de
  duplicado o respuestas antiguas400/409 con mensaje exacto. Los demás errores fallan.
  No se ejecutan los importadores ni se reescriben registros existentes.

## Verificación y entrega

Candidato verificado:1822 unitarias en133 archivos;39 pruebas de componentes
(Renglon, Destacados, VisorImagen e Imagen); typecheck, build e inventario correctos.
Lint:0 errores y1 aviso anterior (`page` sin usar en la prueba de VisorImagen).
`medir`:24 pantallas ×4 anchos (320/390/820/1280), sin cambiar presupuestos ni CSS.
No se repitió PostgreSQL local porque no cambia SQL; la CI conserva esa suite.

Comparación local de builds de producción con el mismo respaldo de datos y reloj
fijo2026-10-07,390×844 y DPR2, un contexto de navegador nuevo por pantalla. Baseline
H05a8a78dd1 tiene el mismo código que base77152806 (solo difieren documentos).
Se cuentan bytes del cuerpo de respuestas de imágenes, no HTML/JS/cabeceras ni
consumo facturado. Las imágenes públicas sí son reales; API de datos y Mapbox son
simulados, por lo que esta evidencia no valida el mapa. El primer slug de ficha
probado devolvía404 y se descartó; la tabla usa `comparacion-ficha.json`.

| Pantalla | Antes (bytes) | Después (bytes) | Reducción | Peticiones antes/después |
| --- | ---: | ---: | ---: | ---: |
| Inicio | 4402191 | 379556 | 91,4% | 14/14 |
| Artistas | 1357174 | 77382 | 94,3% | 5/8 |
| Ficha Lxs Colocaos | 388851 | 133483 | 65,7% | 3/3 |

Inicio pidió12 variantes (4 HIT y8 MISS locales); Artistas6 (6 HIT reutilizadas)
y la ficha1. No representa una caché global fría: un original usado en dos tamaños
puede producir dos peticiones más pequeñas, como ocurrió en Artistas.

Capturas completas antes/después de las tres pantallas y ficha aDPR3 revisadas:
sin desplazamientos de maquetación; título, acciones y fotos visibles conservados.
El visor muestra el original1290×1594 completo en caja390×482, permite cierre con
Escape y no usa srcset; se esperó `decode()` para no confundir JPEG parcialmente
cargado con recorte. Las pruebas existentes de acercamiento y gestos pasan.
La barra compacta apunta a la variante384. Safari físico sigue pendiente.

Endpoint real de Next local:200 WebP; segunda petición HIT y
`Cache-Control: public, max-age=2592000, must-revalidate`. Rechaza400 otro dominio,
otro bucket, query de token, IP local, ancho193 y calidad80. Publicación debe
comprobar también el servicio real de Vercel, no inferirlo del Next local.

Evidencia persistente local (capturas, JSON, scripts y logs):
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/trafico-imagenes/`.
Pendiente revisión del gestor, PR/CI, despliegue y comprobación del dominio.
Las pruebas del wrapper usan Next/Image real con red sintética; los contratos de
Vercel/caché real se comprueban aparte. Los consumidores mantienen sus pruebas de
maquetación con el doble habitual de Next, sin confundirlo con el optimizador.
No hay pruebas destructivas, mensajes, cuentas nuevas ni escrituras de producción.

Recuperación: revertir este PR devuelve la presentación directa; no hay datos ni
esquema que restaurar. Los importadores no borran originales ni cambian sus URLs
existentes. Safari físico y medición de cuota facturada quedan separados del QA.

## Publicación y comprobación del dominio

Gestor de cambios III revisó140158d8 sin hallazgos bloqueantes y cedió la ventana
con CI verde. PR308 pasó CI37167549828; se marcó listo y se unió mediante merge
commit el2026-10-04 01:21:50UTC (3octubre en México):
`fb49a8ee4553bc28bca7ab7811d00e3d3c54c6d0`.
Production6835359888 terminó correcto en ese SHA. No hubo migración.

En `somosnosotros.org`, Inicio, Artistas y `/eventos/susurros-del-inconsciente`
responden200 e incluyen variantes. Capturas390×844 revisadas en navegador:
carriles y fotos56px cargados con srcset, ficha con portada optimizada y visor con
original1205×1600 completo. La ficha local de Lxs Colocaos no existía bajo ese slug
en producción; se usó el enlace real de Susurros visible en Inicio. El mapa real
de esa ficha también cargó. Prueba de navegación pública, sin sesión de producto,
sin modificar Voy/Seguir ni registros.

Optimizador de producción:200WebP,6942bytes para la muestra192px, HIT en dos
peticiones, `Cache-Control: public, max-age=2592000, must-revalidate`.
Cinco controles negativos devuelven400: dominio ajeno, bucket ajeno, query,
ancho193 y calidad80. `produccion.json` y capturas `produccion-*.png` en la carpeta
de evidencia indicada arriba. La preview6835322581 también se revisó con imágenes
cargadas; su acceso HTTP sin sesión redirige al SSO de Vercel normalmente.

**Seguimiento pedido por el gestor:** revisar en el panel el uso del optimizador
de Vercel durante la primera semana (hasta10octubre); responsable founder/gestor,
plan Vercel todavía sin confirmar. No se contrató nada ni se abrió facturación.
No hay monitor automático configurado ni promesa de vigilancia en segundo plano.
Firma de Safari físico pendiente del founder. Revertir PR308 restaura la carga
original sin restauración de DB/Storage. Cierre documental en PR separado; no
repetir suites locales por ese cambio exclusivo de documentos.
