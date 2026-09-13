# 005 · Alta de lugar sin teclear (2026-09-13)

Rama `fase-2b-alta-invisible`. Respuesta al feedback del founder tras la Fase 2: "está bien como un inicio, pero no proporciona ayuda para cumplir la tarea; no hay UX invisible". El alta pedía once campos y no deducía ninguno.

## Qué cambió

- **Nombre primero, y el sistema encuentra el lugar.** `src/lib/buscarLugares.ts`: Mapbox Search Box (sugerir + recuperar con un `session_token` por formulario; tipos `poi,address`; país MX; español; cercanía al centro). Escribes "Teatro de la Paz" y aparece el teatro real con su dirección; un toque llena dirección, pin y tipo. Antes se usaba Geocoding v6, que solo conoce calles.
- **Tipo deducido** (`deducirTipo`): de las categorías de Mapbox o de palabras del nombre (biblioteca, galería/museo, casa de cultura/centro cultural, teatro/foro/auditorio, colectivo/taller). Se puede cambiar; si la persona lo elige a mano, ya no se toca.
- **"Estoy aquí"**: GPS del teléfono → pin; y la dirección se deduce del pin con la búsqueda inversa (`direccionDesdePunto`). Lo mismo al arrastrar el pin o tocar el mapa. Si el teléfono niega la ubicación, lo dice y ofrece tocar el mapa.
- **Aviso de duplicado al escribir el nombre**, no al final: migración 0003 `lugares_con_nombre(p_nombre)` (visibles, nombre normalizado que contiene lo escrito, mínimo 4 letras). Muestra "Ya está registrado:" con enlace y "si es otro con el mismo nombre, sigue adelante". El aviso de 150 m al publicar sigue.
- **Publicar con dos datos**: nombre y ubicación (el tipo va deducido). Descripción, redes y foto quedan plegados bajo "+ Agregar descripción, redes o foto (puedes hacerlo después)". En edición se muestran todos.
- **Después de publicar**: la ficha abre con "Publicado. Ya está en el mapa." y dos botones: "Registrar otro lugar" (para cargar los diez de corrido) y "Completar detalles" (si faltan). Cuando faltan detalles, la ficha lo recuerda al autor con un enlace a editar.
- **Borrador en el teléfono** (`localStorage`): nombre, tipo, dirección y pin se guardan al escribir y se recuperan si sales a medias; se borra al publicar.

## Tropiezos

- Tres avisos `react-hooks/set-state-in-effect`: la deducción del tipo y la limpieza de listas pasaron al manejador de escritura; la restauración del borrador va en `requestAnimationFrame` (el servidor no conoce el borrador).
- El borrador no se recuperaba: (1) el efecto que guarda corría al montar con campos vacíos y pisaba lo guardado → solo se guarda tras intentar restaurar y nunca vacío; (2) una guarda de "ya restauré" en un ref se rompía con el doble montaje de React en desarrollo → cada pasada programa su restauración y la limpieza cancela la anterior.

## Prueba contra la base real (usuario desechable, borrado al final; 390×844)

- Escribir "Teatro de la Paz" → 5 lugares sugeridos, el primero "Teatro de La Paz · Villerias 205, 78000 San Luis Potosí". Un toque: pin en el teatro (22.1509, −100.9740), dirección y tipo "Foro". Publicar → ficha con "Publicado", "Registrar otro lugar", "Completar detalles". **Tres toques en total.**
- Escribir "teatro de la" en un alta nueva → "Ya está registrado: Teatro de La Paz · Foro · …" mientras se escribe; tipo deducido "foro".
- "Estoy aquí" con ubicación negada → "No se pudo leer tu ubicación. Toca el mapa donde está el lugar."
- Borrador: "Galeria Nido" → salir al mapa → volver: nombre y tipo "Galería" recuperados.
- Lint, typecheck, 29 pruebas, build.

## Prueba de la fase (sigue siendo la de la Fase 2)

10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto.
