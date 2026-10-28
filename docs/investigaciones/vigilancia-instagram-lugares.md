# Vigilar el Instagram de los lugares para encontrar eventos nuevos: viabilidad y propuesta

**28 de octubre de 2026.** Solo documento, para decisión del founder; no autoriza código ni migraciones. Sin número de OL ni bitácora asignados (los da el gestor). Fuentes: documentación oficial de Meta y de Anthropic leída hoy (§11), el código del repo en `main` (`58034ad7`) y la memoria de la rutina de redes que hoy se hace a mano.

## 1. El pedido (textual)

«Necesito ver si es viable que tengamos una rutina para revisar las redes sociales de todos los lugares dados de alta e identificar cuando se han publicado nuevos eventos. Las redes sociales de estos lugares acostumbran publicar eventos días antes. En algunos casos son los carteles de eventos ya publicados en las guías oficiales, en otros casos son eventos esporádicos. Pero mi pregunta es si podemos llevar un registro a nivel ID, tal vez, usando la API de Instagram, concentrarnos específicamente en Instagram para identificar los nuevos posts y luego validar si esos posts se refieren a nuevos eventos o carteles para eventos registrados. E incluso saber si son remembranzas o algún otro tipo de contenido para descartar o incluso alertar y derivar en otras actividades. Analiza lo que te digo, cuestiona, identifica áreas de oportunidad y propón».

## 2. Resumen en 10 líneas

1. **Viable, con condiciones.** La API oficial de Instagram tiene una función, *Business Discovery* («descubrir negocios»), que deja leer las publicaciones de **otras cuentas profesionales** (de empresa o de creador) usando nuestra propia cuenta @smsnstrsapp.
2. Cada publicación trae un **ID fijo**: sí se puede llevar el registro por ID y procesar solo lo nuevo, con una llamada por cuenta y por revisión.
3. **No cubre** cuentas personales, privadas ni con restricción de edad, ni **historias** de otras cuentas. Cuántos de los 86 lugares quedan fuera no se sabe hasta probar.
4. Hace falta **un permiso más** en la app de Meta (`instagram_manage_insights`) y que el founder vuelva a autorizar el token. La revisión de Meta (*App Review*) quizá no haga falta: la cuenta es nuestra y el founder tiene rol en la app. Es una duda que se resuelve con la primera llamada.
5. Clasificar cada post con el modelo cuesta del orden de **1,6 centavos de dólar con Sonnet 5.5** o **0,1 centavos con Haiku 5.5**. Con los 86 lugares, unos 10 a 30 USD al mes (estimación).
6. Casi todo se reutiliza: el motor de rutinas, el latido de Supabase, la lectura de carteles, «¿Es este?» (`eventos_parecidos`), la huella de carteles y la bandeja de propuestas con «Aceptar las N».
7. Lo nuevo son **dos tablas** (cuentas vigiladas y posts vistos) y **una rutina**, «Revisar Instagram».
8. El riesgo mayor no es técnico. Es la **carga de revisión** (falsos positivos, duplicados con las guías oficiales) y la cobertura que quede fuera.
9. Raspar Instagram fuera de la API (lo que hoy no funciona desde el servidor) está **prohibido** por sus términos. La API oficial es el único camino automático.
10. Propuesta: una **prueba sin costo de IA** con 10 lugares para saber qué devuelve la API, y luego una **fase 1** con la rutina a mano (un botón) comparada dos semanas contra la rutina manual de lunes y jueves.

## 3. Lo que la API oficial permite y lo que no

**Cómo nos conectamos hoy.** La app de Meta «Somos Nosotrxs Publicador» usa la «API de Instagram con inicio de sesión de Facebook» (`graph.facebook.com`, `src/lib/instagram/api.ts`, versión `v23.0`) con un token de **página** sin caducidad. Según la memoria del gestor, sus permisos son `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management` y `pages_manage_posts`.

| Camino | ¿Sirve para leer posts de los lugares? | Qué pide | Fuente |
|---|---|---|---|
| **Business Discovery** (`GET /{nuestro-ig-id}?fields=business_discovery.username(<cuenta>){media{…}}`) | **Sí, solo de cuentas profesionales.** Las cuentas profesionales con restricción de edad no devuelven nada. | Token con `instagram_basic`, `instagram_manage_insights` y `pages_read_engagement` (y `ads_read` o `ads_management` si el rol de la página viene del portafolio de negocio). Solo con inicio de sesión de Facebook. | [B1], [B2], [P1] |
| Campos de cada post | `id`, `caption` (texto), `media_type`, `media_url`, `permalink`, `timestamp`, `children` (carrusel), `thumbnail_url` y `username` están marcados como **públicos**. `media_url` falta en videos con música con derechos y en reels con la descarga apagada; Meta pide usar `permalink` o `thumbnail_url` en su lugar. | — | [M1] |
| Paginación | Sí, por cursores `before`/`after`, armados a mano. | — | [B2] |
| Cuánto dura `media_url` | **No documentado.** La rutina manual vio que las direcciones del CDN caducan en horas: hay que bajar la imagen en cuanto se detecta. | — | memoria del gestor |
| Límite de llamadas | Business Discovery y Hashtag Search siguen el **límite de la plataforma**: a nivel de app, 200 × usuarios activos por hora. Los límites por usuario no se publican. Error 4 = la app, 17 = el usuario; la cabecera `X-App-Usage` da el porcentaje gastado. | — | [R1] |
| **Hashtag Search** (posts por etiqueta) | Parcial: hasta 30 etiquetas distintas por semana. | Revisión de la app y la función «Instagram Public Content Access». | [H1] |
| **Menciones y etiquetas** (`/tags`, `mentioned_media`, aviso `mentions`) | Solo los posts que **nos etiquetan o mencionan**. No historias, y no avisa si la cuenta que menciona es privada. | Disponible con nuestro tipo de conexión. | [N1] |
| **Webhooks** (avisos que Meta manda solos) | **No.** No hay aviso de «publicación nueva» de cuentas ajenas; los campos son comentarios, menciones, mensajes, métricas de historias propias, etc. | — | [W1], [W2] |
| **oEmbed** (insertar un post en una página) | **No para esto.** Meta prohíbe usar sus datos para cualquier cosa que no sea mostrar el post; prohíbe en particular sacar información para análisis. | — | [O1] |
| **Historias** de otras cuentas | **No.** Ninguna función de lectura ajena las incluye; las menciones en historias tampoco. | — | [N1], [B1] |
| **Páginas de Facebook** ajenas | Solo con «Page Public Content Access», que exige revisión de la app y **verificación del negocio**. Sin eso, solo páginas cuyo administrador tenga rol en nuestra app. | — | [F1] |
| Raspar la web de Instagram | **Prohibido** por los términos: no se puede acceder ni recopilar información de forma automatizada sin permiso explícito. Además es frágil: hoy los endpoints internos devuelven HTML. | — | [T1] |

**Niveles de acceso.** El *acceso estándar* se aprueba solo y vale para usuarios con rol en la app; el *acceso avanzado* exige revisión de la app y verificación del negocio [A1], [P1]. Aquí quien autoriza es el founder (con rol) y el token es de su página. **Duda:** la documentación no dice si Business Discovery con acceso estándar deja leer cuentas ajenas. La descripción del permiso dice que la app «puede descubrir y leer» perfiles y medios de otros negocios [P2]. **Otra duda:** la referencia pide «token de usuario de Facebook» y el nuestro es de página. Las dos se resuelven con una sola llamada de prueba (§9, fase 0).

**Lo que no se puede confirmar sin probar:** qué porcentaje de los 86 lugares tiene cuenta profesional, si `caption` y `media_url` llegan de verdad por Business Discovery (la referencia los marca públicos, pero sus ejemplos solo piden conteos), cuánto vive `media_url` y si una publicación en colaboración aparece con el mismo ID en las dos cuentas.

## 4. Cómo funcionaría

**Rutina «Revisar Instagram»** (un `tipo` más en `rutinas_corridas`, como «Buscar carteles»; un paso hace una sola cosa):

1. **Lista (gratis).** Las cuentas que tocan: los lugares con Instagram en `redes` (el usuario se saca con `normalizarRedes`), ordenadas por la más atrasada.
2. **Una llamada por cuenta** a Business Discovery con `media.limit(12){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,media_type}}`. Los IDs que ya están en la tabla se ignoran. Si la cuenta no es profesional o no existe, se anota su estado y se deja para la rutina manual.
3. **Por cada post nuevo:** se baja la imagen en ese momento (`imagenWeb.bajarImagen`) y se calcula su huella (`carteles/huellaServidor.ts`). Si la huella coincide con el `cartel_huella` de un evento, ya se sabe a qué evento pertenece sin gastar en el modelo.
4. **Clasificar y leer** con el modelo: la imagen (hasta 4 del carrusel), el texto, la fecha del post y los próximos eventos de ese lugar. Se usa el mismo esquema que `src/lib/cartel.ts` (título, fecha, hora, artistas, clase…) más un campo `tipo_post` (§5) y su confianza.
5. **Cruce:** `eventos_parecidos` (mismo día, mismo sitio, título parecido) y la huella. Así se decide si es un evento nuevo, el cartel de uno que ya existe o un cambio.
6. **Salida:** propuestas de `evento` o de `cartel` en la bandeja de siempre (`aceptarPropuesta.ts`, `aceptarCartel.ts`), con `fuente = "Instagram @cuenta"` y el `permalink`. Las alertas van a la administración. Nada se publica sin aceptar.

**Tablas nuevas** (migración que solo añade; solo la administración las lee y solo el servidor escribe):

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `instagram_cuentas` | Qué cuenta se vigila, de quién es y en qué estado está | `usuario` (único), `lugar_id` o `artista_id`, `ig_id`, `estado` (`profesional`, `no_profesional`, `no_existe`, `error`), `revisada_en`, `ultimo_post_en`, `fallos` |
| `instagram_posts` | El registro por ID que pidió el founder | `media_id` (llave), `cuenta`, `permalink`, `publicado_en`, `media_type`, `texto` (recortado), `huella`, `tipo_post`, `confianza`, `evento_id`, `propuesta_id`, `decidido_en`; índice `(cuenta, publicado_en desc)` |

**La primera vez de cada cuenta** se registran sus posts recientes sin clasificar los de más de 14 días, para no gastar en el archivo. Se siembra con las 167 URLs de `vistas.json` de la rutina manual.

**Cadencia:** los lugares publican días antes, así que cada 12 horas basta. Al principio, solo con el botón.

## 5. Qué hacemos con cada tipo de post

| Tipo | Señales | Acción |
|---|---|---|
| **Cartel de evento nuevo** | Fecha del cartel posterior al post; «te esperamos», «boletos», «entrada libre»; ningún parecido en `eventos_parecidos` | Propuesta de `evento` con el cartel |
| **Cartel de un evento ya registrado** | Huella igual, o mismo día, sitio y título parecido | Si el evento no tiene cartel: propuesta de `cartel`. Si tiene el mismo: nada. Si tiene otro: se anota |
| **Programa o cartelera** (varias fechas en una lámina o carrusel) | Varias fechas; carrusel; «programa», «cartelera de noviembre» | Una propuesta por función, con el recorte de su panel (regla de la rutina manual: nunca la misma imagen para fechas distintas) |
| **Cambio** (cancelado, pospuesto, cambio de sede, agotado) | Esas palabras + cruce con un evento registrado | **Alerta** a la administración con el evento enlazado; nunca cambio automático |
| **Remembranza o reseña** de algo que ya pasó | Fecha del cartel anterior al post; «gracias», «así se vivió», «#tbt», fotos de público | Descartar; opcional: marcar que el evento sí ocurrió (§8) |
| **Exposición en curso** | «Visita», «permanece hasta», obra en sala | Si no está: propuesta de exposición; si está: nada |
| **Convocatoria** (open call, beca, casting, inscripción) | Esas palabras, sin fecha de función | Alerta; insumo para la sección de becas pendiente |
| **Aviso del lugar** (horario, cierre, vacaciones) | «Cerrado», «horario» | Alerta para revisar la ficha del lugar |
| **Venta, menú, promoción, otro** | Sin fecha de evento | Descartar y guardar una muestra para auditar |

**Regla de oro heredada de la rutina manual:** el texto y el cartel pueden no coincidir (la demostración de máscaras: el texto decía 23 de octubre y el cartel 27). Manda lo que dice el cartel, y si no coinciden, la propuesta lo dice.

## 6. Costos y límites

Supuestos (no medidos): post 4:5 de 1080 × 1350 = 39 × 49 = **1 911 tokens de imagen** (un token por cada cuadro de 28 × 28 px [V1]); texto, instrucciones y eventos del lugar ≈ 2 600 tokens; salida con algo de razonamiento ≈ 700 tokens. Precios de hoy por millón de tokens [C1].

| Modelo | Entrada / salida (USD por millón) | Costo por post (1 imagen) | Por carrusel de 4 | Con lotes (−50 %) |
|---|---|---|---|---|
| Haiku 5.5 | 0,10 / 0,50 | ≈ 0,0008 | ≈ 0,0014 | ≈ 0,0004 |
| Sonnet 5.5 (el de las rutinas) | 2 / 10 | ≈ 0,016 | ≈ 0,027 | ≈ 0,008 |
| Opus 5.5 | 4 / 20 | ≈ 0,032 | ≈ 0,055 | ≈ 0,016 |

| Volumen (supuesto: 4 posts por semana por lugar, 2 por artista) | Posts al mes | Solo Sonnet | Haiku filtra todo y Sonnet lee el 30 % |
|---|---|---|---|
| 86 lugares | ≈ 1 500 | ≈ 25–30 USD | ≈ 10 USD |
| + 425 artistas | ≈ 5 100 | ≈ 85–100 USD | ≈ 30–35 USD |

| Límite de Meta | Qué significa aquí |
|---|---|
| Una llamada por cuenta y revisión | 86 cuentas cada 12 h = 172 llamadas al día; con artistas, ≈ 1 000 |
| 200 × usuarios por hora a nivel de app [R1] | La app tiene un solo usuario: tomar ≈ 200 por hora como techo prudente y repartir las llamadas. La cabecera `X-App-Usage` avisa antes del corte |
| Límite por usuario | No se publica [R1]: medirlo en la fase 0 |

Comparación: la rutina manual de lunes y jueves cuesta tiempo del founder y del gestor, no dólares. En su primera semana dio 32 eventos de 16 instituciones y 2 de 18 galerías y foros (memoria del gestor).

*Hallazgo lateral:* la página de precios de hoy da la lectura de caché de Sonnet 5.5 a 0,10 USD por millón; `src/lib/rutinas/precios.ts` la tiene en 0,20. El crédito baja de más, no de menos, pero conviene revisarlo.

## 7. Lo que no cierra / riesgos

- **Cobertura.** Las cuentas personales, privadas o con restricción de edad quedan fuera, igual que las historias, donde muchos foros y bares anuncian. La rutina manual sigue para esas cuentas; la automática solo la achica.
- **Lugares sin Instagram en la ficha.** Solo 86 de 613 lugares lo tienen (dato del gestor), y la rutina manual encontró usuarios que no existían o estaban mal escritos. Primero hay que tener los usuarios correctos.
- **Fechas ambiguas.** «Este viernes» sin año, o un cartel reciclado de otra fecha. La referencia es la fecha del post; ante la duda, la propuesta lo dice y no se acepta sola.
- **Duplicados con las guías oficiales.** Los carteles de la Secretaría y de la cartelera de la CDMX ya entran por otras rutinas. `eventos_parecidos` solo cruza mismo día, mismo sitio y título parecido, y ya falló con «Lunaria Foro Expandido» frente a «Foro lunaria» (OL-413). Cada propuesta lleva su «¿Es este?».
- **Falsos positivos.** Promociones de bares que parecen carteles, giras en otras ciudades, posts en colaboración que aparecen en dos cuentas.
- **Carga de la administración.** Con 50 posts al día, la bandeja se llena. Hace falta un umbral de confianza, que lo descartado no aparezca y un resumen diario. La aceptación por guion del gestor (OL-453) sigue disponible.
- **Token y permisos.** Al añadir `instagram_manage_insights` el founder tiene que reautorizar con su contraseña. Si Meta exige acceso avanzado, hace falta verificar el negocio del portafolio «Somos Nosotrxs», que hoy no está verificado.
- **Términos de Meta.** Los datos de la plataforma solo se pueden tratar como lo diga nuestro aviso de privacidad, y hay que borrarlos cuando ya no hagan falta [T2]. Hay que añadir una frase al aviso y borrar el texto y la imagen de lo descartado a los 90 días.
- **Derechos de los carteles.** Publicar el cartel de un lugar ya es práctica de la app, con crédito y enlace. Bajarlo por la API no cambia quién es su autor. Duda que no resuelve la documentación técnica: si conviene pedir permiso a los lugares (el aviso por mensaje directo de la rutina manual ya lo hace en parte).
- **Ritmo y cortes de Meta.** Si se pasa el límite, la API corta por un rato. El motor ya sabe pausar y reintentar.

## 8. Áreas de oportunidad

1. **Buzón de carteles por mención.** Invitar a los lugares y artistas a etiquetar o mencionar a @smsnstrsapp. La API de menciones lo entrega sin depender de Business Discovery; la documentación solo excluye historias y avisos de cuentas privadas [N1] (si llega de cuentas personales públicas es una duda que se prueba en la fase 0). Es la forma más barata de cubrir a quien Business Discovery no ve.
2. **Cambios y cancelaciones.** Un post posterior que dice «cancelado» o «cambio de sede» se enlaza al evento y alerta a la administración. Aceptarlo dispara los avisos de cambio que ya existen para quienes marcaron «Me interesa».
3. **Salud de las cuentas.** El estado de cada cuenta (no existe, no es profesional, sin publicar en 90 días) sale gratis y sirve para corregir fichas.
4. **Showcase.** Business Discovery da `followers_count` y `media_count`, y la cadencia de posts sale del registro. Eso alimenta la rúbrica de «actividad» y `lecturas_redes`, que hoy se llena a mano porque se decidió «nunca desde el servidor» (decisión del founder).
5. **Lugares nuevos.** Un cartel que nombra un recinto que no está en el directorio genera una propuesta de lugar.
6. **«Sí ocurrió».** Una remembranza confirma que el evento se hizo: dato para el grafo cultural, «Tu año» y el historial. Las fotos solo con permiso.
7. **Convocatorias** para la sección de becas y novedades pendiente.
8. **Artistas (425 con Instagram).** Sirve para las fechas donde tocan fuera de los lugares registrados y para «Artistas con eventos esta semana». Muchos tienen cuentas personales, así que la cobertura será menor: va en una fase posterior.
9. Fuera de alcance: **páginas de Facebook** (piden verificación y revisión [F1]) y **etiquetas** (revisión y 30 por semana [H1]).

## 9. Propuesta por fases

**Fase 0 · Prueba de la API (una tarde, 0 USD de IA).** El founder añade `instagram_manage_insights` en la app de Meta y reautoriza el token (si pide `ads_read`, también). El gestor corre un guion en la Mac con 10 cuentas, sin escribir en la base. El guion dice: qué cuentas son profesionales, qué campos llegan (`caption`, `media_url`, `timestamp`, carruseles), cuánto vive `media_url` (volver a pedirla a la hora y al día), si el token de página sirve y el `X-App-Usage`. Si falla por acceso, se sabe si hace falta acceso avanzado antes de escribir código.

**Fase 1 · Una pieza, 10 lugares, con botón.** Las dos tablas, la rutina «Revisar Instagram» en el motor con tope en USD (como «Buscar carteles», tope de 2,00), clasificación con Sonnet 5.5, propuestas en la bandeja y alertas en la misma tarjeta. Diez lugares mezclados: 4 instituciones, 3 foros o colectivos y 3 cafés o bares. **Prueba de cierre:** dos semanas en paralelo a la rutina manual, contando:
- cuántos eventos de la rutina manual encontró también la automática;
- cuántas propuestas fueron basura;
- cuántos duplicados hubo;
- cuánto costó.

Sin cron todavía.

**Fase 2 · Los 86 lugares, cada 12 h.** Latido de Supabase, filtro previo con Haiku, alertas de cambios, resumen diario y borrado a los 90 días.

**Fase 3 · Menciones, artistas y Showcase.** Según lo que muestre la fase 2.

## 10. Decisiones que necesita el founder

1. ¿Autoriza la fase 0 y reautorizar el token con el permiso nuevo (le pedirá su contraseña)?
2. Si Meta exige acceso avanzado: ¿verificar el negocio del portafolio de Meta, o quedarse con menciones y la rutina manual?
3. ¿Qué 10 lugares, o los elige el gestor con la mezcla propuesta?
4. Modelo y presupuesto: ¿Sonnet 5.5 para todo en la fase 1 (≈ 3–5 USD en dos semanas con 10 lugares), o Haiku desde el inicio? ¿Se usa el crédito de 200 USD que vence el 11 de noviembre?
5. Cadencia: ¿cada 12 h basta, o una vez al día en la mañana?
6. Remembranzas: ¿solo descartar, o marcar «sí ocurrió»?
7. ¿Se permite leer seguidores y conteos desde el servidor para el Showcase (cambia la regla de `lecturas_redes`)?
8. ¿Quién acepta las propuestas: la bandeja, o el guion del gestor como en OL-453?
9. ¿Se invita a los lugares a mencionar a @smsnstrsapp (texto nuevo para el mensaje directo)?
10. Una frase nueva en el aviso de privacidad sobre la lectura de publicaciones públicas de cuentas profesionales.

## 11. Fuentes

Leídas el 28 de octubre de 2026.

- [B1] Business Discovery (guía): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery
- [B2] IG User Business Discovery (referencia: permisos, restricción de edad, paginación): https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery
- [M1] IG Media (campos públicos, `media_url` opcional): https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
- [P1] Panorama de la plataforma (inicios de sesión, acceso estándar y avanzado): https://developers.facebook.com/docs/instagram-platform/overview
- [P2] Permiso `instagram_manage_insights`: https://developers.facebook.com/docs/permissions/reference/instagram_manage_insights
- [A1] Niveles de acceso: https://developers.facebook.com/docs/graph-api/overview/access-levels
- [R1] Límites de llamadas: https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- [H1] Hashtag Search: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search
- [N1] Menciones y etiquetas: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/mentions
- [W1] Webhooks: https://developers.facebook.com/docs/instagram-platform/webhooks · [W2] campos: https://developers.facebook.com/documentation/instagram-platform/webhooks/fields
- [O1] oEmbed: https://developers.facebook.com/docs/instagram-platform/oembed
- [F1] Page Public Content Access: https://developers.facebook.com/docs/features-reference/page-public-content-access
- [T1] Condiciones de uso de Instagram, §4.2: https://www.facebook.com/help/instagram/581066165581870
- [T2] Condiciones de la plataforma de Meta, §3.d y §4.c: https://developers.facebook.com/terms/dfc_platform_terms/
- [C1] Precios de la API de Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
- [V1] Visión, tokens por imagen: https://platform.claude.com/docs/en/build-with-claude/vision
- Repo: `src/lib/rutinas/{motor,atender,disparar,carteles,claude,precios,aceptarPropuesta,aceptarCartel}.ts`, `src/lib/cartel.ts`, `src/lib/carteles/huella.ts`, `src/lib/eventosParecidos.ts`, `src/lib/instagram/api.ts`, migraciones `20261012120000`, `20261020130000`, `20261022120000`, `20261028130000` y `20261028140000`.
