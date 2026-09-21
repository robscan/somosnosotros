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
