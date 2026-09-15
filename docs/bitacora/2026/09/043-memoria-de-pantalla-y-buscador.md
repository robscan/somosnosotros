# 043 · Memoria de pantalla y buscador de eventos

**Fecha:** 2026-09-15 (noche) · **Base:** decisiones 17 y 18 de [02-inicio-flujo-y-estados.md](../../../rediseno/02-inicio-flujo-y-estados.md) · **PR:** por abrir cuando el founder lo pida.

## Lo que dijo el founder
Al navegar la agenda y tocar un evento, volver hacía reset del scroll y tardaba en cargar; en una agenda larga, localizar el punto de lectura es fricción. Que se guarde la posición, y también la pestaña si partió de una. El mismo canon para Lugares y Artistas. Y hace falta un buscador de eventos.

## Qué encontré (producción, Chrome a 390×844)
- Atrás desde la ficha vuelve en ~100 ms y al mismo scroll: Next reutiliza la pantalla guardada (su caché de historial). **Pero la pestaña se pierde siempre** (Nuevos → Todos), porque vivía en estado de React que se desmonta.
- Cuando en la ficha se toca Voy o Seguir, la acción revalida `/` y esa caché se tira: al volver se vuelve a pedir la agenda al servidor (pantalla de carga, ~0.3–0.5 s de servidor) y el scroll se pierde. Es el caso del founder, que prueba Voy en las fichas.
- La ficha no tiene barra inferior: la vuelta es Atrás o el gesto del iPhone. No pude reproducir en Safari (el "Permitir JavaScript desde eventos de Apple" está apagado); la prueba en el iPhone es del founder.

## Qué se hizo
- **Memoria de pantalla** (`src/lib/memoriaPantalla.ts`, `src/components/MemoriaPantalla.tsx`): una entrada por URL en sessionStorage con el estado del listado y el scroll. Al montar, el estado guardado se aplica antes de pintar (sin parpadeo) y el scroll se repone en cuanto la lista está en su sitio, después de que Next lleve la página arriba. El scroll se guarda al vuelo, un guardado por cuadro, y solo mientras la URL siga siendo la de la pantalla (el "arriba" de Next al irse a una ficha no se guarda). Sin sessionStorage (modo privado) no rompe nada.
- **Agenda** recuerda pestaña, día, búsqueda y si el campo está abierto. **Lugares** recuerda Mapa · Lista, lo escrito y el scroll (el tipo ya iba en la URL). **Artistas** recuerda el scroll (todo su filtro va en la URL).
- **Barra inferior**: cada sección vuelve a la última URL vista en ella (Artistas con su disciplina, Lugares con su tipo), como las pestañas del teléfono; al llegar, la pantalla repone su estado y su scroll.
- **Buscador de eventos**: lupa como chip redondo a la derecha de los chips de fecha y ciudad; al tocarla el campo ocupa esa fila con el mismo alto (la cabecera pegajosa no se mueve), con foco; la ✕ cierra y borra. Filtra al vuelo por título, sitio y artista (la agenda ahora trae los nombres de quien se presenta), sin acentos, todas las palabras escritas. Vacío por causa con salida. Al volver de una ficha no roba el foco (el teclado solo sale cuando la lupa acaba de abrir el campo).
- El campo de búsqueda pasa a `CampoBuscar` (mismo aspecto en Artistas y en la agenda) y se esconde la ✕ que Safari y Chrome pintan en `type="search"` (había dos ✕).
- `experimental.staleTimes.dynamic: 60` en `next.config.ts`: al cambiar de sección con la barra inferior, una página vista hace menos de un minuto se reutiliza sin esperar al servidor. Publicar, Voy, Seguir y borrar ya revalidan sus rutas, así que no se ve nada viejo. **Es una decisión aparte y reversible** si el founder ve algo raro.

## Evidencia
- `npm run lint && npm run typecheck && npm test` en verde (141 pruebas: 5 nuevas de la memoria y 1 del buscador); `npm run build` en verde.
- Servidor local a 390×844: Nuevos + scroll 700 → ficha → Atrás: vuelve a Nuevos y a 700 en 230 ms. Buscar «camerata» halla dos (por título y por artista); «jazz museo» da el vacío con causa; ficha y Atrás devuelven el campo abierto con «camerata» y sin foco. Lugares en Lista a 900 → ficha → Atrás: Lista y 900. Artistas a 1200 → ficha → Atrás: 1200. Desde Artistas, el tab Agenda vuelve a la agenda con su pestaña y su búsqueda.

## Queda
- Prueba del founder en el iPhone (Safari y, si la usa, la app instalada): volver por Atrás y por el gesto, con y sin Voy en la ficha.
- Commit y PR cuando el founder lo pida.
