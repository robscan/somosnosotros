# 126 · Gestor de cambios II: relevo, lista del founder y grafo cultural

**Fecha:** 2026-09-21 · **Chat:** «Gestor de cambios II» (`local_ffd34d86-6c74-4f3a-b5f5-8879b4c446ed`, Fable 5.1) · **OL:** OL-091 · Solo documentos; ningún cambio en producción.

## Relevo

- Leídos ASIGNACIONES, GESTION_DE_CAMBIOS, MEMORIA_GESTOR y OPEN_LOOPS. Id de sesión anotado en el relevo de ASIGNACIONES (`9ed7f8b`).
- OL-065 (topes de campos) ya estaba cerrado por el gestor saliente: PR #111 unido (`c78d68a`), CI de main en verde, despliegue de producción correcto, rama sin nada fuera de main. No se repitió nada.
- Avisos (OL-086): el gestor saliente anotó la confirmación del founder de que sí le llegan (`a29e887`); comprobado en el repositorio.
- Este chat no puede editar la carpeta principal con las herramientas de edición (el sistema lo bloquea por estar en un árbol de trabajo). Los documentos se editan en el árbol del gestor, se suben con `git push origin HEAD:main` y después se pone al día la carpeta principal con `git pull --ff-only`.

## OL-090 · Barra inferior despegada

- Reporte del founder: «el footer se despega del bottom en viewport», «derivado de estos últimos ajustes», «Bug observado en app de ios» (la web instalada en el iPhone).
- Revisión del gestor: `NavInferior` es `position: fixed; bottom: 0`. Medido en Chromium a 375×812 contra producción (/artistas): la barra queda pegada arriba, en medio y al fondo, sin desborde horizontal. No se reproduce fuera de WebKit. Sospechosos: lo que entró en los PR #105 a #111 (cabecera que se esconde, botón ↑, tira de letras, altos de Lugares, mapa en fichas) y el modo instalado de iOS.
- Reservado OL-090 / 125, rama `nav-inferior-pegada`. Chat nuevo «Barra inferior despegada (OL-090)» (`local_8a84c7ff-562c-4974-a0ae-fdde5b37f388`), puesto en Sonnet 5 con esfuerzo medio antes de darle el visto bueno (comprobado con sus datos de sesión). Pedido del founder del mismo día: un chat nuevo por tarea, con su modelo asignado.

## La lista del founder

- 54 comentarios (bugs y mejoras) pegados en el chat. Copiados enteros y convertidos en piezas en [`docs/ops/COLA_DE_PIEZAS.md`](../../../ops/COLA_DE_PIEZAS.md): tanda A (8 piezas de bugs), B (6 mejoras definidas), C (8 de producto, con propuesta o prototipo antes) y D (3 de investigación y operación). **Propuesta: nada encargado hasta el OK del founder.**
- Dato encontrado al preparar la cola: `src/lib/cartel.ts` lee los carteles con `claude-opus-5`, el modelo caro; la pieza A1 mide si uno más barato lee igual.

## Grafo cultural (OL-091)

- Leídos completos los dos chats del founder en ChatGPT (el original y su rama, 26 turnos entre los dos) desde su Chrome, en una pestaña propia que se cerró al terminar. No se copió al repositorio nada personal ni de la estrategia de financiamiento: el repositorio es público.
- Análisis y texto propuesto para la definición en [`docs/rediseno/24-grafo-cultural.md`](../../../rediseno/24-grafo-cultural.md). En corto: el grafo ya existe a medias en la base; no cambia el stack; se añade por pasos; cuatro frenos (personas fuera del grafo, sin ranking, la visión de la beca no es la cola, la IA propone y una persona confirma).
- `DEFINICION.md` no se tocó: espera la firma del founder.

## Pendiente

- Founder: OK a la cola (o cambios), firma o corrección del texto del doc 24, y confirmar si «shield» en L32 es la hoja («sheet»).
- Gestor: al recibir el OK, reservar números y abrir los chats de la primera tanda (A1 a A5), cada uno con su modelo; revisar la entrega de OL-090 cuando llegue.

## Jornada 2026-09-21 (noche) → 2026-09-22 (madrugada)

Todo con permiso explícito del founder por PR y despliegue de Vercel comprobado. Migraciones aplicadas por el gestor tras revisarlas (43 → **54**).

- Publicado: PR #129 (OL-092), #130 y #133 (OL-100), #131/#132/#134/#135/#136 (docs), #137 (Vercel ignora docs), #138 (OL-106), #139 (OL-110), #140 (botón decidido en verde), #141 (OL-113), #142 (OL-112), #143 (OL-114, migración `artistas_slug`), #144 (OL-115, `avisos_admin`), #145 (Pincel bloque 3: canal privado `20260922130000`, cupo y fila, mando calcado del prototipo firmado), #146 (grosor por arrastre), #147 (OL-117, permiso del sensor en iPhone), #148 (OL-118, QR con `qrcode`), #149 (OL-119, slugs de lugares y eventos, dos migraciones), #150 (OL-120, siete ajustes de Pincel tras la prueba del founder).
- Abierto a la espera de permiso: [PR #151](https://github.com/robscan/somosnosotros/pull/151) (OL-121, tope global e interruptor «Pincel apagado»; migración `20260922180000_pincel_freno.sql` ya aplicada).
- Cortafuegos de Vercel: reglas «Freno a publicar y leer carteles» (`/eventos`, POST) y «Freno a Pincel» (`/obra`, 30/min por IP), rellenadas por el gestor en el Chrome del founder y publicadas por él.
- Decisiones del founder anotadas en OPEN_LOOPS «Decidido»: Pincel cupo/fila sin turnos, grosor arrastrando el punto, `qrcode`, slugs en todo, frenos de Pincel, siete ajustes del mando (eje, alcance ±30°/±20°, punto tenue, Centrar, encender en verde, QR chico, grosor en iOS), escudo como icono de Administración.
- Evidencia rechazada y rehecha: OL-106, OL-110, OL-113, OL-109, OL-115 (capturas sin la fuente o con la rejilla rota); Pincel mando (dos veces; la buena salió al calcar el prototipo firmado y capturar con Chrome real por `playwright-core`); OL-116 (dos veces: quitó `align-items` en vez de añadir `align-content`; luego «capturas» que eran la pantalla «Algo falló»); OL-118 (impresión fuera de la hoja).
- Hallazgos para los siguientes: el respaldo local devuelve arreglos siempre; `next dev` no hidrata para capturas (`next build && next start`); el clon SVG del DOM no espera las fuentes (usar Chrome real); realtime-js manda los broadcast como marcos binarios; Safari táctil manda `pointerleave` al primer movimiento; la redirección `permanentRedirect` tras `loading.tsx` sale como `<meta refresh>` con 200, no 308 (pieza chica); `db push` exige tener en local todas las migraciones aplicadas.
- Lentitud reportada por el founder (~03:20): base sin bloqueos y consultas en milisegundos, servidor en 0.3–0.8 s, app cargando en 1 s; lo único lento eran fotos del almacén de Supabase (1.7–2 s cada una) y la mitigación automática de Vercel desafió 1.6 mil peticiones en el día. Se resolvió sola.
- Guiones del gestor (scratchpad, fuera del repo): `resolver_ol.py` ahora acepta cabeceras reordenadas por uniones anteriores y entradas que la rama alarga.

### Pendiente al cierre del 2026-09-22

- Founder: permiso para el PR #151; probar en el iPhone los ajustes de Pincel (sentido, alcance, latencia, grosor) y el interruptor; el correo a instituciones (pieza «envío» sin abrir); fichas por completar (pegar textos de Canto Quetzal y Laboratorio Centro Histórico); OL-111 (analítica) sin entrega, con la línea del aviso de privacidad para su firma.
- Gestor: OL-116 (renglón de dato + escudo) a la espera de capturas válidas; piezas chicas anotadas: cierre por `pg_advisory_xact_lock` en `artistas_generar_slug`, redirección 308 real desde UUID, fotos por el CDN de Vercel, y las de la lista anterior (subcategorías admin, «N artistas nuevos por confirmar», etc.).
- Cola sin empezar: B1, B4, B5, B6; C1–C8; pasos 2–5 del grafo. Limpieza con permiso: ramas y carpetas `codex/*` de piezas publicadas.

## Jornada 22 (noche): cierre

Publicado con permiso del founder, todo con despliegue de Vercel comprobado y dominio en 200: PR #163 (OL-130, título de la pared sigue al lugar), #164 (OL-131, avisos en la computadora: tres causas medidas), #165 (OL-132, Pincel: mando fijo, grosor en vivo, ping de latencia, filtro de saltos), #166 (OL-116, renglones alineados y escudo), #167 (OL-133, icono de Administración: llave inglesa en cabecera y Ajustes), #168 (OL-134, «Borrar la pared» fiable: el servidor borra la instantánea y la pared consulta la hora del borrado), #169 (OL-135, la pared en proporción 16:9, unida con OL-134), #170 (OL-136, llegada de un mando nuevo: «Entrando…», pulso del punto y letrero «Nombre entró»). Último merge `ce5e98d`.

Incidencias: OL-116 traía siete PNG sueltos en la raíz y dos entradas de OPEN_LOOPS unidas en una línea (repuesto desde main); #165 chocó con main en los imports de `pincel.test.ts` (`UMBRAL_AJUSTE_PX` ya no existe); OL-135 chocó con OL-134 en `Pared.tsx` y la unión la hizo el operador con verificación repetida. Al publicar una rama que vive en la carpeta de un operador que ya cambió de rama, worktree propio (`gestor-titulo-obra`, `gestor-borrar-fiable`).

Pendiente del founder: probar en el iPhone y el cañón (borrar con la pared cerrada, pared vertical, llegada de un mando, sonda con «ida y vuelta al servidor» y «salto ignorado»); decidir si el área 16:9 lleva borde; repetir «Activar» avisos en su Chrome; lo anotado en OPEN_LOOPS de la tarde (DMARC, remitente, rebotes, fichas, plan de Supabase). Operadores en espera: Pincel (`local_23fc79ff`), avisos (`local_01172234`), renglones (`local_6e668930`). Siguiente libre: OL-137 / 172.
