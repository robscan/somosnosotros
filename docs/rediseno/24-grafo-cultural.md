# 24 · Grafo cultural: qué es, qué cambia y qué no

**Estado:** PROPUESTA del gestor de cambios, **pendiente de firma del founder**. Nada de esto está construido ni decidido. · **OL:** OL-091 · **Bitácora:** [126](../bitacora/2026/09/126-gestor-ii-relevo-lista-y-grafo.md)

## De dónde sale

2026-09-21, founder, en el chat del gestor: «revises dos chats del proyecto somos nosotros que hice en chatgpt, donde exploro posibilidad de obtener beca leonardo y esto deriva en ajustes de fondo en el proyecto, surge la intención de crear grafos culturales, analiza a profundidad porque esto podría afectar la arquitectura del sitio y se debe añadir a la definición de la página para constituir criterio y redefinir cánones si es necesario».

Leí los dos chats completos (el original y su rama). Aquí solo queda lo que toca al producto; los datos personales y la estrategia de financiamiento del founder no se copian a este repositorio, que es público.

## En una línea

Un **grafo cultural** es guardar no solo fichas sueltas (artistas, lugares, eventos) sino **las relaciones entre ellas y de dónde salió cada una**: «Ana participó en Materia», «Materia ocurrió en el Museo X», «lo dice el cartel que subió Pedro». Con eso la agenda, al llenarse, arma sola el mapa de la cultura de la ciudad y la trayectoria de cada artista.

No es una pantalla ni una base de datos especial. Es una manera de ordenar lo que ya guardamos.

## Lo que ya tenemos: el grafo existe, a medias

| Pieza del grafo | Hoy en la base |
| --- | --- |
| Fichas (nodos) | `artistas` (personas y grupos), `lugares`, `eventos`, `perfiles` |
| «ocurre en» | `eventos.lugar_id` |
| «participa en» | `eventos_artistas` (evento, artista, orden) |
| «gestiona» | `artistas_cuentas`, `lugares_cuentas` |
| «sigue», «va a» | `seguimientos`, `asistencias` |
| «lo eligió el admin» | `destacados` |

La ficha de un artista ya muestra sus eventos y la de un lugar los suyos: la trayectoria ya se arma sola. Los 520 artistas del CAPO y los 48 lugares institucionales ya son nodos esperando conexiones.

**Conclusión de arquitectura: no hay que cambiar de base de datos ni de stack.** Postgres guarda relaciones y las recorre bien a nuestra escala (cientos o miles de fichas por ciudad). Un motor de grafos aparte rompería el «stack decidido» de CLAUDE.md, duplicaría los permisos (hoy viven en las políticas de Supabase) y no daría nada que hoy necesitemos. El cambio es **evolutivo**: columnas y tablas que se añaden, nunca una reescritura.

## Lo que falta para que sea un grafo de verdad: seis huecos

1. **Relaciones con tipo.** Hoy artista–evento solo significa «participa». Falta el papel: presenta, cura, imparte, organiza.
2. **Quién organiza.** Hoy un lugar hace de institución y un «artista» puede ser un colectivo. Recomendación: **no crear un tipo de ficha nuevo todavía**; permitir que un lugar o un artista/colectivo figure como «organiza» de un evento. Si con uso real hace falta la ficha «organización», se añade después.
3. **Eventos dentro de eventos.** Festival de varios días, inauguración con varios actos, el EIMIM del Ceart: un evento «padre» que agrupa a otros. Es el mismo pedido que el founder hizo en su lista del 2026-09-21.
4. **Obras y novedades.** Lo que un artista publica (canción, libro, pintura) y, más adelante, la obra colectiva que deja un evento (Pincel). Hoy la tabla `novedades` solo guarda cambios de eventos para avisos; no sirve para esto.
5. **Evidencia de cada relación.** De dónde salió (lo escribió una persona, lo leyó la IA de un cartel, vino en una agenda enviada por una institución, vino del CAPO) y si alguien lo confirmó. Sin esto no hay «trayectoria verificable» ni manera de corregir a la IA. El bug actual (al leer un cartel, pone como artista a quien publica y no agrega a los artistas del cartel) es exactamente este hueco.
6. **Identidad estable y pública.** Dirección propia y legible por ficha (slug), ciudad en los artistas, y datos para buscadores (schema.org, empezado en OL-059). Sobre CIDOC CRM (el estándar de museos que cita ChatGPT): es un modelo centrado en eventos, y el nuestro ya lo es. **No se implementa**; basta con no contradecirlo y exponer bien schema.org, que es lo que de verdad leen Google y los demás.

## Lo que el grafo NO debe ser: choques con la definición vigente

ChatGPT empuja la idea más lejos de lo que el proyecto admite hoy. Cuatro frenos:

- **Las personas no son nodos.** Los chats proponen medir «cómo circulan las personas por el ecosistema». Choca con «sin rastreo» (aviso de privacidad firmado) y con «ubicación solo si la pide con un botón; sirve para ordenar por cercanía, nada más». Criterio propuesto: **el grafo es de lo público** (artistas, lugares, eventos, organizaciones, obras). Quien asiste solo se cuenta («12 van»); sus gustos y recorridos no se guardan ni se cruzan.
- **Sin ranking por la puerta de atrás.** «Artistas emergentes», «lugares que funcionan como nodos», «conectividad» son puntuaciones. La definición dice «no es red social de likes ni ranking». Criterio propuesto: **las conexiones se muestran, no se puntúan**. Los indicadores agregados (cuánta actividad, qué disciplinas, qué zonas) viven en Administración o en un informe, nunca como orden público de personas.
- **La visión de la beca no es la cola de trabajo.** Siete capas, un SDK «Live», luces, motores, esculturas: sirve para escribir una solicitud de 18 meses, no para decidir qué se construye mañana. Sigue mandando CLAUDE.md: «si una pieza no sirve a registrar usuarios, lugares o eventos, o a que la gente se conozca, no entra» y «una fase a la vez». Pincel sigue donde está (en pausa, pieza aparte); su único lazo con el grafo será, algún día, «este evento dejó esta obra».
- **Captura automática de agendas: sí, con dos candados.** Encaja de lleno (sirve a registrar eventos) y es lo que hace crecer el grafo sin capturistas. Candados: lo que propone la IA **se confirma antes de publicarse como hecho** y el gasto tiene tope (la regla del tope de lecturas, doc 23, ya va en esa línea).

Una contradicción que hay que resolver por escrito: CLAUDE.md dice «sin capacidades nativas de iOS» y la lista del founder del 2026-09-21 aprueba «cámara, nfc, micrófono, acelerómetro, haptics». En la web del iPhone: cámara sí, micrófono sí, movimiento y orientación sí (pidiendo permiso con un toque), **NFC no** (Safari no lo ofrece; Chrome en Android sí) y **vibración no**. Texto propuesto: «capacidades del navegador sí, con permiso y solo cuando ahorran trabajo a la persona; capacidades nativas (app de tienda) no».

## Texto propuesto para `docs/DEFINICION.md` (para firma; no está aplicado)

Añadir al final de **Qué es**:

> Cada evento publicado deja constancia de quién participó, dónde y con quién. Con el tiempo, la agenda arma sola el mapa de la cultura de la ciudad y la trayectoria de sus artistas: eso es el grafo cultural.

Añadir una sección nueva, **Cómo se guarda lo que sabemos (grafo cultural)**:

> - Todo lo que se publica es una ficha (artista o grupo, lugar, evento, obra) y toda ficha se conecta con otras. Una ficha sin conexiones es la excepción, no la norma.
> - Cada conexión dice de qué tipo es (participa, organiza, ocurre en, forma parte de) y de dónde salió (una persona, un cartel leído, una agenda enviada). Lo que propone la IA se confirma antes de publicarse como hecho.
> - El grafo es de lo público. Las personas que asisten no forman parte: solo se cuentan.
> - Las conexiones se muestran, no se puntúan: no hay ranking de artistas ni de lugares.
> - Cada ficha tiene una dirección propia, legible y que no cambia.

Cambiar en **Reglas simples** la línea de ubicación solo si el founder decide ampliar su uso (hoy: «sirve para ordenar por cercanía, nada más»); la brújula de «Cercanos» que pide la lista cabe en esa regla tal como está.

## Qué cánones se tocan

| Canon | Cambio propuesto |
| --- | --- |
| Ficha (artista, lugar, evento) | Una sección de relaciones con el mismo patrón en las tres: artista → dónde y con quién; lugar → quién ha pasado por ahí; evento → forma parte de / incluye. |
| Formularios (canon del alta de lugar) | Al dar de alta, el sistema **propone** conexiones (artistas leídos del cartel, lugar encontrado) y la persona **confirma**. El letrero es «Confirmar», no «Falta», y la ayuda va bajo el campo, no dentro del botón. Coincide con tres bugs de la lista. |
| Buscador | Uno solo sobre todas las fichas, con resultados agrupados por tipo. Coincide con el pedido de buscador unificado. |
| Inicio por intereses | Los intereses son disciplinas que ya existen como dato de las fichas; elegirlos ordena el inicio. No es perfilado: lo elige la persona y lo puede cambiar. |
| No cambian | Maquetación plana, filtrar no es navegar, memoria de pantalla, el contexto ordena y no limita, UX invisible. |

## Camino en pasos chicos

Todas son migraciones que solo añaden; ninguna bloquea los bugs de la lista, que van primero.

1. Ciudad en artistas y dirección legible por ficha (ya pedidos en la lista).
2. Papel y origen en `eventos_artistas` (quién hizo qué, de dónde salió, confirmado o no). Arregla de raíz el bug del cartel.
3. Evento padre (festivales y eventos con varios actos). Con prototipo antes.
4. «Organiza» entre evento y lugar o colectivo.
5. Obras y novedades del artista. Con prototipo antes; se junta con el perfil de artista para compartir.

Cada paso con su prototipo (si toca pantalla), su prueba y su firma, como cualquier pieza.

## Datos de los chats que no verifiqué

Las fechas y montos de convocatorias, las cifras de IberCultura Viva / Mapas Culturais y las capacidades atribuidas a modelos de IA vienen de ChatGPT; no las comprobé. Una de ellas corre prisa según el propio chat: un registro que cerraría el 30 de septiembre de 2026. Conviene que el founder la confirme en la fuente oficial.
