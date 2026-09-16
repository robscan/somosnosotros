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

## Lo que rompió el founder en el iPhone (y la corrección)
Con la app instalada en el inicio, en producción, tras poner Voy y volver con Atrás la agenda salía rota: la cabecera con chips y pestañas y el título del día no se pintaban (quedaba el hueco) y después un bloque blanco tapaba la mitad de arriba. Solo con navegar no pasaba. Lo reproduje en el simulador de iPhone (iOS 26.3) con la app añadida al inicio: en Safari normal no pasa; en modo app sí, y solo cuando la vuelta obliga a pedir la agenda otra vez (Voy, Seguir o Cancelar revalidan `/` y Next tira su copia de historial).

**Causa.** En modo app WebKit repone el scroll por su cuenta al volver, mientras la página todavía es la pantalla de carga (corta). Cuando llega el contenido, la vista del sistema y el documento quedan desincronizados: el documento dice scroll 0 con todo en su sitio, pero la cabecera pegajosa se pinta como un bloque blanco. Cualquier `scrollTo` real lo cura; si no hay movimiento (volver arriba), no se cura solo.

**Corrección (en este PR).** El navegador deja de reponer el scroll (`history.scrollRestoration = "manual"`) y lo hace la app para todas las pantallas: `MemoriaScroll` en el layout guarda el scroll por URL (sessionStorage) y al volver (Atrás, gesto o recarga) espera a que la página tenga altura y lo repone; si la posición no cambia, da un salto de 1 px y vuelve un instante después para que WebKit resincronice. El hook `useMemoriaPantalla` se queda con el estado (pestaña, día, búsqueda, vista) y la última URL de la sección.

**Probado en el simulador, app instalada, con Voy y Cancelar:** vuelta a 800 y a 843 con datos frescos; vuelta a 0 exacto desde el evento de arriba. Tres de tres bien; con la reposición desactivada a propósito, el bloque blanco vuelve a salir. Chrome a 390×844 sigue bien.

## Evidencia
- `npm run lint && npm run typecheck && npm test` en verde (141 pruebas: 5 nuevas de la memoria y 1 del buscador); `npm run build` en verde.
- Servidor local a 390×844: Nuevos + scroll 700 → ficha → Atrás: vuelve a Nuevos y a 700 en 230 ms. Buscar «camerata» halla dos (por título y por artista); «jazz museo» da el vacío con causa; ficha y Atrás devuelven el campo abierto con «camerata» y sin foco. Lugares en Lista a 900 → ficha → Atrás: Lista y 900. Artistas a 1200 → ficha → Atrás: 1200. Desde Artistas, el tab Agenda vuelve a la agenda con su pestaña y su búsqueda.

## Firma
PR #51 en producción por orden del founder ("Manda a prod") y firmado en la app instalada al cierre de la noche.

## Queda
- Nada.
