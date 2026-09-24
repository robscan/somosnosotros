# 46 · Revisión de seguridad (OL-178)

**Fecha:** 2026-09-24 · **Pedido del founder:** «Revisa posibles brechas de seguridad en todos los casos donde
permitimos a los usuarios inyectar url, corre una revisión del desarrollo para identificar otras brechas de
seguridad.» · **Alcance:** solo documentos — no se tocó código, no hay migraciones nuevas, no se entró a
producción ni a ningún secreto. Todo lo que sigue viene de leer el código y las migraciones del repo (rama
`revision-seguridad`, desde `origin/main`) y de correr pruebas de solo lectura en un árbol propio.

## Resumen ejecutivo

Lo que está bien: cada una de las 33 tablas nuevas del proyecto tiene los permisos por fila (RLS) activados
desde el primer día; las funciones que se saltan esos permisos a propósito (SECURITY DEFINER, más de 70 en
total) llevan de forma consistente la protección recomendada (`search_path` vacío, nombres calificados,
permisos mínimos) desde la revisión OL-077 del 18 de septiembre y en cada migración posterior; el equipo ya se
encontró y cerró dos escaladas de privilegio reales antes de que llegaran a producción (autopromoción a admin,
14 de septiembre; cambiar el autor o esconder una ficha ajena, 16 de septiembre); y el vector que más
preocupaba —lo que la gente pega como enlace, video o cartel— está bien defendido: nunca se arma un `<iframe>`
o un enlace directo con el texto crudo que alguien escribió. Lo que urge: cualquier persona que gestione un
artista, un lugar o un evento (no solo el administrador) puede poner la foto, portada o imagen de esa ficha en
cualquier dominio externo con una sola petición al servidor —la pantalla lo esconde, pero el servidor no lo
exige—, y esa dirección se sirve tal cual en la ficha y en la vista previa que WhatsApp o Facebook muestran al
compartir el enlace (S-01, único hallazgo de gravedad alta). No se encontró ninguna brecha crítica.

## Tabla de hallazgos

| Id | Gravedad | Dónde | Qué pasa | Impacto | Arreglo propuesto | Tamaño | Estado |
|---|---|---|---|---|---|---|---|
| S-01 | **Alta** | `src/lib/artistas.ts:331`, `src/lib/lugares.ts:220`, `src/lib/eventos.ts:303` (validación server), `src/components/CampoImagenUrl.tsx`, usado solo tras `{esAdmin &&…}` en `FormularioArtista.tsx:411`, `FormularioLugar.tsx:436`, `FormularioEvento.tsx:737` | La foto/portada/imagen de una ficha solo se valida en el servidor con `/^https:\/\/[^\s]+$/` (cualquier dirección https, sin espacios); nada exige que sea del Storage propio ni que quien la manda sea administrador. La pantalla esconde el campo de "pegar una URL" a quien no es admin, pero eso es solo la pantalla: una cuenta que gestiona la ficha (autor o cuenta ligada) puede mandar `foto=https://loque-sea.com/x.png` directo al servidor y se guarda. Probado con la regex exacta del código: `/^https:\/\/[^\s]+$/.test("https://evil.example/tracking.png")` → `true`. | Esa dirección se sirve en `<img src>` de la ficha y como `og:image`/`twitter:image` (`src/app/artistas/[id]/page.tsx:206-207`, `lugares/[id]/page.tsx:173-174`, `eventos/[id]/page.tsx:188-189`): cualquier visitante y cualquier vista previa de WhatsApp/Facebook/Twitter al compartir el enlace carga una imagen de un dominio que no eligió el administrador. Mismo patrón, menor alcance, en el avatar propio (`src/lib/perfil.ts:26`, cada quien solo sobre su fila, visible en "quién va"). | Una función compartida (`lib/imagen.ts`) que solo acepte vacío o el prefijo público del Storage propio (mismo criterio que ya usa `leerCartelAccion`, `eventos/acciones.ts:149`), y que la excepción de URL libre solo se acepte cuando el propio server action comprueba `usuarioActual().perfil.rol === "admin"` (no solo la pantalla). | Chico-mediano | Corregido en OL-180 |
| S-02 | Media | `src/lib/enlaces.ts:80` (`reconocerEnlace`) | Un enlace con letras de otro alfabeto que se ven iguales a las latinas (homógrafo) se acepta como "Sitio" sin aviso: `reconocerEnlace("аpple.com")` (la "а" es cirílica, U+0430) → `{red:"sitio", url:"https://xn--pple-43d.com/"}`. | Riesgo de phishing: alguien pega un enlace parecido al de un lugar o patrocinador conocido; nada en la ficha ni en la hoja "Vas a salir de Somos Nosotros" avisa que el dominio es sospechoso, solo se ve raro (punycode). | Rechazar en `reconocerEnlace` cualquier hostname con una etiqueta `xn--` (IDN) o que mezcle alfabetos, con el mismo aviso "No parece un enlace". | Chico | Corregido en OL-180 |
| S-03 | Media | `src/app/api/avisos-pendientes/route.ts`, `src/app/api/recordatorios/route.ts` | El secreto del cron se compara con `!==` en texto plano (`request.headers.get("authorization") !== \`Bearer ${secreto}\``), no en tiempo constante. El propio repo ya usa `timingSafeEqual` para el webhook de Resend (`api/resend/route.ts`) y para el estado de "Entrar" (`lib/entrarCon.ts`, `decidirVuelta`). | Ataque de temporización teórico contra `CRON_SECRET`; poco práctico hoy por el ruido de red de Vercel, pero es una inconsistencia fácil de cerrar. | Usar el mismo patrón `timingSafeEqual` que ya existe en el repo. | Chico | Corregido en OL-180 |
| S-04 | Baja | `src/lib/eventos.ts:259,303` (campo `enlace`, boletos/más información) | No pasa por `reconocerEnlace`: solo antepone `https://` si falta el esquema y limita a 500 caracteres, sin comprobar que el resultado sea una URL bien formada (acepta espacios, por ejemplo). No es explotable: el `https://` forzado neutraliza `javascript:`/`data:`/`vbscript:` — probado: `"javascript:alert(1)"` se guarda como `"https://javascript:alert(1)"`, un enlace roto pero inerte que no ejecuta nada al tocarlo. | Ninguno de seguridad; calidad/consistencia con `reconocerEnlace`. | Reusar `reconocerEnlace`/`new URL()` antes de guardar. | Chico | Corregido en OL-180 |
| S-05 | Baja | `src/lib/enlaces.ts:80` (`reconocerEnlace`) | Acepta URLs con usuario incrustado (`https://ejemplo.com@evil.com`), donde lo que va antes de la `@` no es el dominio real. Ya mitigado en la práctica: `dominioDe()` (`src/lib/enlaces.ts:49`), que usa la hoja "Vas a salir de Somos Nosotros" (`EnlaceExterno.tsx:60`), lee `new URL(href).hostname` y ese campo ignora el usuario incrustado — muestra el dominio verdadero (`evil.com`), no el que engaña. | Bajo: el único lugar que muestra el dominio ya usa la función correcta. Queda como nota por si algún día se muestra la URL cruda en vez de `dominioDe()`. | Rechazar en `reconocerEnlace` toda URL con `username`/`password` no vacíos. | Chico | Corregido en OL-180 |
| S-06 | Baja | `src/lib/enlaces.ts:39` (`limpiarTituloEnlace`) | El título editable de un enlace (OL-168) no quita caracteres de control Unicode invisibles (p. ej. U+202E, que invierte visualmente el texto que sigue); solo recorta a 30 caracteres y colapsa saltos de línea. | Se renderiza como texto plano (React escapa HTML), así que no hay riesgo de inyección; sí se podría usar para que un título "se vea" distinto de lo que dice. | Quitar los caracteres de la categoría Unicode "Cf" (formato) en `limpiarTituloEnlace`. | Chico | Corregido en OL-180 |
| S-07 | Nota | `src/app/avisos/baja/route.ts` | La baja de avisos por correo se ejecuta con un simple `GET` (sin expirar, sin un solo uso) porque Gmail/Yahoo lo exigen así para el botón "Cancelar suscripción" (`List-Unsubscribe-Post`). Efecto secundario conocido en la industria: un antivirus de correo o un escáner de enlaces que visite el enlace antes que la persona la da de baja sin que lo pida. No es un error de esta pieza. | Bajo, informativo. | Ninguno necesario; si molesta, se puede añadir un aviso "¿fuiste tú?" con deshacer desde el perfil. | — | Sin tocar (nota, OL-180 solo cubrió S-01 a S-06) |
| S-08 | Nota | `next.config.ts` | Cabeceras de seguridad con `frame-ancestors 'none'` (evita que otra página nos meta en un iframe) pero sin una `Content-Security-Policy` completa, documentado a propósito en el propio archivo: Next necesita `'unsafe-inline'`/`'unsafe-eval'` para su runtime y Mapbox GL usa `blob:` para sus *workers*; una CSP mal afinada rompería el mapa sin avisar. Sigue siendo cierto hoy. | Bajo: `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options` sí están puestas. | Si se quiere avanzar, probar primero con `Content-Security-Policy-Report-Only` contra el mapa, el video incrustado y el *service worker*, antes de exigirla. | Grande (si se hace) | Sin tocar (nota, OL-180 solo cubrió S-01 a S-06) |
| S-09 | Nota | Cabeceras de producción | No hay `Strict-Transport-Security` explícita en `next.config.ts`. Vercel suele añadirla sola en el dominio de producción, pero esta revisión no pudo comprobarlo en vivo (ver Límites). | — | Comprobar `curl -I https://somosnosotros.org` y añadirla a mano si falta. | Chico | Sin tocar (nota, OL-180 solo cubrió S-01 a S-06) |
| S-10 | Nota | `scripts/instituciones/`, `scripts/capo/` | Corren fuera de línea, a mano, con la llave de servicio — no son parte de lo que toca un visitante. Se revisaron y no se encontró ningún hallazgo; se listan para que conste. | — | Ninguno. | — | Sin tocar (nota, OL-180 solo cubrió S-01 a S-06) |
| S-11 | Nota | `src/lib/cartel.ts` | La lectura de cartel manda la imagen a la API de Claude con una salida forzada a un esquema fijo (`zod`). Un cartel con texto oculto que intente desviar al modelo ("inyección de instrucciones vía imagen") solo podría, en el peor caso, rellenar los campos del formulario con texto falso — nunca ejecutar nada ni saltarse el esquema — y esa propuesta la revisa la persona antes de guardar. Bien mitigado. | — | Ninguno. | — | Sin tocar (nota, OL-180 solo cubrió S-01 a S-06) |

No se encontró ningún hallazgo de gravedad **crítica**.

## Parte 1 · Inventario de dónde entra una URL de una persona

| Punto | Archivo | Validación actual | Veredicto |
|---|---|---|---|
| Reconocer enlace (redes, sitio, @usuario, teléfono) | `src/lib/enlaces.ts` (`reconocerEnlace`) | `javascript:`/`data:`/`vbscript:` se rechazan solos: al no empezar con `http(s)://` se les antepone `https://`, y el resultado no es una URL válida (`new URL` lanza). Dominio validado por regex (`[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}`); `@usuario` solo `[\w.]`; teléfono solo dígitos/espacios/guiones/paréntesis. | Bien, con dos notas: homógrafos (S-02) y userinfo (S-05) |
| Título editable de un enlace | `src/lib/enlaces.ts` (`limpiarTituloEnlace`) | Recorta a 30, colapsa saltos de línea; no quita caracteres de control Unicode invisibles. | Nota (S-06) |
| Normalizar redes (fichas viejas y nuevas) | `src/lib/enlaces.ts` (`normalizarRedes`) | Reutiliza `reconocerEnlace` para cada entrada; tope de 8, sin repetidos. | Bien |
| Texto visible de un enlace | `src/lib/enlaces.ts` (`enlaceVisible`) | Solo quita `http(s)://` al frente; no se usa para decidir a dónde navega. | Bien (uso cosmético, no de seguridad) |
| Video incrustado (YouTube/Vimeo) | `src/lib/video.ts` (`videoEmbedDe`) | El `src` del iframe se arma en el servidor a partir de un id validado por regex (`ID_YOUTUBE`/`ID_VIMEO`), nunca de la URL cruda; lista blanca de host de entrada (`youtube.com`, `youtu.be`, `vimeo.com`…) y de salida (siempre `youtube-nocookie.com`/`player.vimeo.com`); exige `https:`. | Bien |
| `sandbox`/`allow` del reproductor | `src/components/ui/VideoEmbed.tsx` | `sandbox="allow-scripts allow-same-origin allow-presentation"`, `allow="encrypted-media; picture-in-picture"`, `referrerPolicy="strict-origin-when-cross-origin"` — mínimos para YouTube/Vimeo, no genéricos. | Bien |
| Novedades del artista (rama `novedades-artista-fase1`, PR #211) | `src/lib/novedadesArtista.ts`, `src/app/artistas/[id]/novedades/acciones.ts` | Reusa `reconocerEnlace` + `videoEmbedDe` (nunca la URL cruda); solo YouTube en esta fase; el servidor rechaza si `!datos.proveedor` (no confía en el cliente); RLS exige `gestiona_artista` + `publicado_por = auth.uid()`; tope de 5/día por artista con un trigger `check_violation`. | Bien |
| Enlace externo (botón con aviso al salir) | `src/components/ui/EnlaceExterno.tsx` | `target="_blank" rel="noopener noreferrer"`; antes de navegar, una hoja muestra `dominioDe(href)` (el `hostname` real de `new URL`, no el texto crudo). | Bien |
| Enlace de boletos/más información del evento | `src/lib/eventos.ts` (`validarEvento`), `src/app/eventos/acciones.ts`, `src/app/eventos/[id]/page.tsx` (vía `EnlaceExterno`) | Solo antepone `https://` y limita a 500 caracteres; no usa `reconocerEnlace`. Inerte ante esquemas peligrosos por el prefijo forzado (probado). | Baja (S-04) |
| Foto de perfil, foto de artista, portada de lugar, imagen de evento | `src/lib/perfil.ts`, `src/lib/artistas.ts`, `src/lib/lugares.ts`, `src/lib/eventos.ts`; subida real por `src/lib/subirFoto.ts`; URL libre por `src/components/CampoImagenUrl.tsx` | La subida normal va al Storage propio, con ruta, tamaño (5 MB) y tipo MIME fijados por política (ver tabla de Storage). La URL libre (pensada solo para el administrador) **no se comprueba en el servidor**: cualquier `https://` pasa. | **Alta (S-01)** |
| `og:image`/`twitter:image` y metadatos | `src/app/layout.tsx` (estático, sin datos de usuario), `src/app/artistas/[id]/page.tsx`, `lugares/[id]/page.tsx`, `eventos/[id]/page.tsx` (`generateMetadata`) | Usa la API `Metadata` de Next (React la sirve, no concatenación de texto): sin riesgo de romper el atributo aunque el título tenga comillas. La imagen hereda el problema de S-01. | Hereda S-01 |
| JSON-LD de las tres fichas y del sitio | `src/app/layout.tsx:53`, `artistas/[id]/page.tsx:274-275`, `lugares/[id]/page.tsx:233-234`, `eventos/[id]/page.tsx:284,286` | `JSON.stringify(...).replace(/</g, "\\u003c")` antes de `dangerouslySetInnerHTML`. Probado con el valor exacto pedido: un título `Evento </script><script>alert(1)</script>` sale como `"Evento </script><script>alert(1)</script>"` — ningún `<` literal llega al HTML, así que `</script>` nunca se puede formar. | Bien |
| Redirección tras "Entrar" (`siguiente`) | `src/lib/rutas.ts` (`rutaSegura`) | Rechaza lo que no empiece por `/`, y explícitamente `//` y `/\` (los dos trucos clásicos de *open redirect*). Se usa en `entrarCon.ts` (`nuevoIntento`, `leerIntento`) y en la redirección desde el evento (`lugar-evento-pantalla-app`, `crearLugarDesdeEvento`). | Bien |
| Redirección 308 por slug (UUID viejo → dirección de hoy) | `src/proxy.ts`, `src/lib/redireccionSlug.ts` | El slug se genera en la base con un alfabeto fijo (`[^a-z0-9]+` → `-`, migraciones `*_slug.sql`); `destinoConSlug` además codifica con `encodeURIComponent` y siempre antepone `/tabla/`, así que nunca puede empezar por `//`. La redirección se resuelve como absoluta sobre el propio origen de la petición. | Bien |
| `BotonCompartir` (`wa.me?text=`, `navigator.share`) | `src/components/BotonCompartir.tsx` | El texto va con `encodeURIComponent` dentro de la URL de wa.me; `navigator.share` recibe texto plano, no HTML. El texto en sí puede incluir el título de una ficha (dato de usuario), pero solo como texto a compartir, nunca como código. | Bien |
| `ui/CodigoQr` y `lib/qr.ts` | `src/components/ui/CodigoQr.tsx`, `src/lib/qr.ts` | El SVG se genera en el servidor (`qrcode`) y se sirve como `data:image/svg+xml` con `encodeURIComponent`, sin `innerHTML`. Solo codifica URLs propias construidas con `ORIGEN + hrefArtista/hrefLugar` (slug seguro): nunca un dato libre de la persona. | Bien |
| Mapbox: autocompletar dirección | `src/lib/geocodificar.ts`, `src/lib/buscarLugares.ts` | El texto de búsqueda va como parámetro `q` de `URLSearchParams` (codificado automáticamente), nunca concatenado en la ruta. El token público (`NEXT_PUBLIC_MAPBOX_TOKEN`) está pensado para ser público y restringido por dominio en la cuenta de Mapbox (CLAUDE.md); esta revisión no pudo comprobar en vivo que la restricción sigue configurada (ver Límites). | Bien (validación); restricción del token no verificable sin la cuenta de Mapbox |
| Lectura de cartel con IA | `src/lib/cartel.ts`, `src/app/eventos/acciones.ts` (`leerCartelAccion`) | `leerCartelAccion` exige que la URL empiece exactamente por el prefijo público del Storage propio (`${supabaseUrl}/storage/v1/object/public/fotos/`) antes de mandarla a la API — nunca una URL arbitraria de la persona. Tamaño/tipo ya los exige el bucket (5 MB, jpeg/png/webp/heic). Tope diario por persona con `apartar_lectura_de_cartel` (RPC, antes de llamar al modelo, no después). Salida forzada a un esquema `zod`; la persona revisa el formulario antes de guardar (S-11). | Bien |
| `scripts/instituciones`, `scripts/capo` | `scripts/instituciones/instituciones.ts`, `scripts/capo/capo.ts` | Se ejecutan fuera de línea, a mano, con la llave de servicio; no reciben texto de un visitante de la web. | Bien (fuera de la superficie web) |
| Avisos push: URL que abre el aviso | `public/sw.js`, `src/lib/push.ts`, `src/lib/avisos.ts` | `notification.data.url` siempre se arma en el servidor con `hrefEvento`/rutas fijas (`/admin`, etc.), nunca con un texto que mande la persona; `sw.js` solo lee `e.notification.data.url` con `"/"` de respaldo. | Bien |

## Parte 2 · Supabase

### Tablas y RLS

Las 33 tablas del proyecto tienen `enable row level security`; ninguna se quedó sin activarlo.

| Tabla | RLS | Políticas (resumen) |
|---|---|---|
| `perfiles` | Sí | Lectura pública (nombre/foto salen en "quién va"); cada quien edita la suya o admin. `rol` no se puede tocar por UPDATE de columna (`revoke update(rol)`) y el trigger `proteger_rol` lo exige de nuevo. |
| `lugares` | Sí | Lectura: visible, autor o admin. Alta: con sesión, autor = quien la manda. Edita/borra: autor o admin. `creado_por`/`visible` protegidos por el trigger `proteger_autor_y_visible` (solo admin los cambia). |
| `eventos` | Sí | Igual patrón que `lugares`. |
| `eventos_sitio_privado` | Sí | Lectura: autor, admin o con sesión "cuando toca"; escribe/edita/borra: autor o admin. |
| `seguimientos` | Sí | Lectura pública (es la forma de conocer gente); cada quien maneja lo suyo. |
| `asistencias` | Sí | Lectura pública ("voy"/"me interesa"); cada quien maneja lo suyo. |
| `admin_correos` | Sí | Sin políticas (a propósito): solo el trigger `crear_perfil` la lee. |
| `avisos_enviados` | Sí | Sin políticas listadas: acceso solo por funciones SECURITY DEFINER / service role. |
| `suscripciones_push` | Sí | Cada quien ve/guarda/actualiza/borra las suyas (`usuario_id = auth.uid()`). |
| `reportes` | Sí | Cualquiera con sesión reporta lo suyo; solo admin lee y atiende. |
| `artistas` | Sí | Mismo patrón que `lugares`/`eventos` (autor/admin, `proteger_autor_y_visible`). |
| `artistas_cuentas` | Sí | Lectura pública (quién lleva la ficha); alta/baja vía `gestiona_artista`/reclamo. |
| `eventos_artistas` | Sí | Lectura pública; escritura ligada a `gestiona_evento`/`gestiona_artista`. |
| `contactos_importados` | Sí | **Sin ninguna política** (a propósito, Security Advisor OL-095): solo `reclamar_si_correo_coincide`/`artistas_con_mi_correo` (SECURITY DEFINER, leen el correo de `auth.uid()`, nunca un parámetro) y el script del CAPO la tocan. |
| `novedades` | Sí | Cada quien ve las suyas (`usuario_id = auth.uid()`). |
| `invitaciones_enviadas` | Sí | Sin políticas listadas: solo el script del CAPO (service role). |
| `lugares_cuentas` | Sí | Lectura pública; escritura vía `gestiona_lugar`. |
| `cambios_de_rol` | Sí | Solo admin lee (bitácora de `cambiar_rol`). |
| `cuentas_vistas` | Sí | Solo admin lee. |
| `indicadores_diarios` | Sí | Solo admin lee. |
| `destacados` | Sí | Solo admin lee; se escribe por función (`cambiar_destacado`/`tira_destacados`). |
| `topes_de_lectura` | Sí | Solo admin lee; el tope real lo aplican `apartar_lectura_de_cartel`/`mi_cupo_de_cartel` (SECURITY DEFINER). |
| `lecturas_cartel` | Sí | Solo admin lee. |
| `avisos_config` | Sí | Sin políticas listadas: solo funciones/servicio. |
| `avisos_origen` | Sí | Sin políticas listadas: solo funciones/servicio. |
| `avisos_jobs` | Sí | Sin políticas listadas: solo funciones/servicio (cola de avisos). |
| `avisos_entregas` | Sí | Sin políticas listadas: solo funciones/servicio. |
| `avisos_slots` | Sí | Sin políticas listadas: solo funciones/servicio (cupo de envío). |
| `obras_colectivas` | Sí | Lectura según visibilidad del lugar/evento que enlaza (no `using(true)`, revisión de gestión de cambios 2026-09-21); escritura solo admin. |
| `avisos_admin_jobs` | Sí | Sin políticas listadas: solo funciones/servicio. |
| `avisos_admin_entregas` | Sí | Sin políticas listadas: solo funciones/servicio. |
| `ajustes_sitio` | Sí | Cualquiera con sesión lee (Pincel necesita saber si está encendido); solo admin cambia. |
| `agendas_invitaciones_enviadas` | Sí | Sin políticas listadas: solo funciones/servicio. |
| *(pendiente de fusionar)* `novedades_artista` (rama `novedades-artista-fase1`) | Sí | Lectura: visible o quien gestiona la ficha; publica quien gestiona (`publicado_por = auth.uid()`); solo admin oculta; borra autor/gestor o admin. |
| *(pendiente de fusionar, sin tabla nueva)* `artistas_con_mi_correo()` (rama `artistas-mis-fichas-y-reclamo`) | — | Función SECURITY DEFINER, mismo criterio que `reclamar_si_correo_coincide`: lee el correo de `auth.uid()`, nunca un parámetro. |

Las tablas "sin políticas listadas" tienen RLS activado y ninguna política para `anon`/`authenticated`: por defecto Postgres deniega todo, así que solo las funciones SECURITY DEFINER o el cliente con la llave de servicio (`clienteAdmin()`, cron, scripts) pueden tocarlas. Es el mismo patrón, a propósito, que `admin_correos` y `contactos_importados`.

### Funciones SECURITY DEFINER

Más de 70 en total (no ~23: el número creció con cada pieza). Las 51 que existían el 18 de septiembre se revisaron una por una en la migración `20260918130000_security_advisor.sql` (OL-077): todas con `search_path = ''`, nombres calificados (`public.…`), y para cada una se decidió si de verdad necesitaba saltarse RLS (`security definer`) o si bastaba con `security invoker` (ej. `es_admin()`, `gestiona_evento()`, las seis consultas del panel) — y los permisos `EXECUTE` se revocaron y se volvieron a otorgar uno por uno según quién de verdad la llama (`anon`, `authenticated`, `service_role`). Cada función SECURITY DEFINER creada después (avisos fiables, artistas/lugares/eventos con slug, Pincel, avisos de administración, novedades del artista) sigue el mismo patrón: se comprobó migración por migración y ninguna quedó sin `search_path = ''`.

Ninguna función encontrada permite leer o escribir más de lo que su política dejaría hacer por sí misma: las que agregan datos sin identificar personas (`van_por_evento`, `cuenta_seguidores`) repiten la misma condición de visibilidad que la tabla; las del panel exigen `es_admin()` dentro del cuerpo aunque ya corran con permisos de admin; `cambiar_rol()` tiene protecciones explícitas contra autopromoción, autodegradación, degradar al último admin o a un admin "de origen" (`admin_correos`).

### Triggers

- `proteger_autor_y_visible` (lugares, artistas, eventos): cierra un hallazgo real del 16 de septiembre — antes, una cuenta ligada (no autora) podía adueñarse de una ficha o esconderla; ahora solo admin cambia `creado_por`/`visible`.
- `proteger_rol` (perfiles): cierra un hallazgo real del 14 de septiembre — antes, cualquiera podía hacerse admin con una petición directa a la API; ahora `rol` está además protegido por `revoke update(rol)`.
- `novedades_artista_tope`, `pincel_freno`, `obras_colectivas_freno`: frenos de abuso (tope diario, cupo global) que rechazan con un mensaje llano (`check_violation`), no un error genérico.
- `*_generar_slug` (artistas/lugares/eventos): generan el slug con un alfabeto seguro y un bloqueo (`pg_advisory_xact_lock`) contra dos altas iguales a la vez.

### Storage

- Bucket `fotos` (público): tamaño máximo 5 MB, tipos MIME `image/jpeg|png|webp|heic` fijados en el propio bucket (no solo en el cliente); la subida, el reemplazo y el borrado exigen que la ruta empiece por `<perfiles|lugares|artistas>/<mi id>/…`; el listado de metadatos se cerró a "el mío o admin" (`20260918150000_storage_listado_minimo.sql`), aunque la URL pública de un archivo ya subido sigue sirviéndolo (documentado, es cómo funciona un bucket público).
- Bucket `obras` (privado, Pincel): solo administración lee, sube, reemplaza y borra; 2 MB, solo `image/png`.

### Realtime (canal de Pincel)

Las políticas de `realtime.messages` para `broadcast` y `presence` exigen sesión (`to authenticated`) y que la obra colectiva del tema (`obra:<id>`) esté `abierta` y su lugar/evento sean visibles — la misma condición que ya usa la lectura de `obras_colectivas` por la API. Cupo de mandos por obra entre 1 y 20 (columna `cupo_mandos`, con la cuenta hecha en la bitácora 123 para no acercarse al límite de mensajes/segundo de Supabase Realtime).

### Auth

- Apple y Google: sin llaves secretas propias (Supabase valida el `id_token` directamente); `state`/`nonce` aleatorios de 24 bytes, comparación de `state` con `timingSafeEqual`; el intento expira a los 10 minutos (`VIGENCIA_SEGUNDOS`); el relevo (`paginaRelevo`) escapa los campos que repite en el HTML (`&`, `"`, `<`, `>`).
- Enlace mágico por correo (`signInWithOtp`): la respuesta es genérica tanto si el correo ya tenía cuenta como si no (Supabase crea la cuenta sola); no hay enumeración de correos por esta vía. Límite de intentos lo pone Supabase (código 429, ya manejado en la pantalla).
- `borrar_mi_cuenta()`: exige `auth.uid()` no nulo, borra de `auth.users` (perfil, seguimientos y asistencias caen en cascada; lugares/eventos que creó se quedan sin autor, no se pierden).

## Lo que está bien hecho y no hay que tocar

- Las 33 tablas nuevas llevan RLS activado desde su propia migración de alta; ninguna se quedó por fuera.
- Todas las funciones SECURITY DEFINER (más de 70) usan `search_path = ''` y nombres calificados, con permisos `EXECUTE` revisados uno por uno; dos escaladas de privilegio reales (autopromoción a admin, adueñarse/ocultar una ficha ajena) ya se encontraron y se cerraron con revoke + trigger, "cinturón y tirantes".
- `cambiar_rol()` protege contra autopromoción, autodegradación y quedarse sin administradores.
- El video incrustado (`lib/video.ts`) nunca usa la URL cruda: id validado por regex, lista blanca de dominios de entrada y de salida, `sandbox`/`allow` mínimos por proveedor.
- El JSON-LD de las cuatro páginas escapa `<` a `<`, cerrando el vector `</script><script>` — probado con el valor exacto que pedía el encargo.
- Las redirecciones (`rutaSegura`, el proxy 308 por slug) rechazan `//` y `/\`; los slugs se generan en la base con un alfabeto seguro, nunca a partir de texto libre sin filtrar.
- La lectura de cartel exige que la imagen ya esté en el Storage propio antes de mandarla a la API de IA, con cupo diario por persona apartado *antes* de llamar al modelo.
- El bucket `fotos` limita tamaño, tipo y ruta en el propio bucket, no solo en el cliente; el bucket de Pincel es privado y solo admin.
- El canal en vivo de Pincel exige sesión y obra abierta/visible, tanto para pintar como para ver quién espera.
- Entrar con Apple/Google usa `state`/`nonce` con comparación en tiempo constante; el enlace mágico no distingue "correo existe" de "correo no existe".
- El webhook de Resend valida la firma con HMAC, ventana de tiempo y `timingSafeEqual`.
- `npm audit --omit=dev` → **0 vulnerabilidades**. Sin secretos en git: `.env.example` con valores vacíos, ningún `.env*` versionado, `NEXT_PUBLIC_*` son todos valores pensados para ser públicos.
- El `sitemap.xml` usa el cliente con permisos por fila (nunca la llave de servicio): jamás lista una ficha oculta.
- `robots.txt` no bloquea `/admin`/`/perfil`/etc. (eso delataría que existen): cada una lleva su propio `noindex`, y `robots.txt` solo bloquea lo que de verdad conviene que Google ni intente leer (`/avisos`, `/auth`).

## Orden de arreglo propuesto para el gestor

1. **S-01** (alta): función compartida de validación de imagen + comprobación de admin en servidor, en los 4 puntos de llamada (artistas, lugares, eventos, perfil). Chico-mediano, una sola pieza.
2. **S-02 + S-05 + S-06** (media/baja, mismo archivo): endurecer `reconocerEnlace`/`limpiarTituloEnlace` en `lib/enlaces.ts` — homógrafos, userinfo, caracteres de control. Chico, una sola pieza, con sus pruebas ya existentes de `enlaces.test.ts` como base.
3. **S-03** (media): `timingSafeEqual` para `CRON_SECRET` en los dos endpoints de cron. Chico.
4. **S-04** (baja): reusar `reconocerEnlace` para el enlace de boletos del evento. Chico.
5. **S-09** (nota): confirmar HSTS en producción (`curl -I`), sin código de por medio.
6. **S-07, S-08, S-10, S-11**: sin acción por ahora; quedan documentados para que el founder sepa que se revisaron.

## Límites de esta revisión

- Solo documentos: no se ejecutó código contra producción ni contra el proyecto real de Supabase; todo lo de RLS/funciones/Storage/Realtime se leyó de las migraciones del repo, no se comprobó contra la base viva.
- No se pudo verificar en vivo que el token de Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`) siga restringido al dominio `somosnosotros.org` en la cuenta de Mapbox del founder (fuera del repo).
- No se pudo comprobar con `curl` si `somosnosotros.org` en producción manda `Strict-Transport-Security` (este entorno no tiene salida de red a ese dominio, ver `docs/ops/MEMORIA_GESTOR.md`, nota del 24 de septiembre).
- No se corrió la suite completa de pruebas de Postgres (`npm run test:db`, banco local) ni `npm test` completo: la pieza es de solo lectura y no cambia código; se corrieron sí las pruebas existentes de `enlaces.test.ts`, `video.test.ts` y `eventos.test.ts` (63 pruebas, verdes) como base de las pruebas de este documento, y `npm audit --omit=dev`.
- Dos piezas relacionadas con URL/correo viven en ramas todavía no fusionadas (`novedades-artista-fase1`, PR #211; `artistas-mis-fichas-y-reclamo`) y se revisaron con `git show` sobre esas ramas, no sobre `main`: si cambian antes de fusionar, esta revisión no lo reflejará.
- No se intentó ningún ataque real contra producción (sin credenciales, sin acceso): todas las pruebas de este documento son de código y de regex, ejecutadas localmente.
