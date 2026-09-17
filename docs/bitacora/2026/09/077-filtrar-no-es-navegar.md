# 077 · Filtrar no es navegar: Atrás vuelve a la pantalla anterior, no al filtro anterior (OL-050)

**Fecha:** 2026-09-17 · **Rama:** `filtrar-no-es-navegar`, desde `main` con el panel de administración ya en producción (solo commit local, sin push) · **Reporte del founder:** "Sucede que cuando un administrador navega dentro de Personas (por ejemplo) en Administración y luego presiona algunos chips para filtrar, para después ir atrás, entonces lo que sucede es que el sistema regresa en la selección de chips cuando el comportamiento esperado por el usuario es ir a la sección anterior."

## Causa
- **Qué pasaba:** cada chip de filtro (`ChipEnlace`, en `ui/Chip`) era un `Link` normal, y cada toque apilaba una entrada en el historial. "Atrás" (`ui/Atras`, que usa `router.back()` cuando hay pantalla anterior) y el gesto de atrás del teléfono recorrían esos filtros uno por uno antes de salir de la pantalla.
- **Contraste:** la búsqueda (`ui/Buscador`) ya usaba `router.replace` y no tenía este problema.
- **El contador no estorba:** "Atrás" decide si hay pantalla anterior con un contador de rutas (`Navegacion`) que no mira los parámetros, así que cambiar el filtro nunca lo alteró.
- **Mismo caso:** también apilaban entradas "Ver más" (las páginas de una lista) y las opciones de la hoja de ciudad.

## Qué se hizo
- `ChipEnlace` reemplaza la entrada del historial (`replace`) en vez de apilar una nueva. El filtro sigue en la URL: se comparte y sobrevive al volver de una ficha.
- También con `replace`:
  - "Ver más" de Personas y de las listas del panel (`admin/personas`, `admin/[seccion]`);
  - "Ver más" de Artistas (`ListaArtistas`);
  - las opciones de la hoja de ciudad (`Ciudad`).
- **Alcance:** el cambio vale para todas las listas que usan esos chips. En el panel, Personas, Lugares, Eventos y Artistas. Fuera del panel, los filtros de tipo de Lugares y los de disciplina y detalle de Artistas, donde el gesto de atrás del teléfono tenía el mismo problema.

## Verificación
- lint (0 errores; el aviso ajeno de siempre en `docs/diseno/logotipo/iconos-sn.mjs`), tipos, 258 pruebas y build.
- **En el navegador a 390×844** (`next dev` de la rama, respaldo local de datos inventados y sin llaves reales):
  - Administración → Personas deja el historial en 3 entradas.
  - Tocar "Nuevas" y luego "Sin entrar" cambia la URL (`?filtro=nuevas`, `?filtro=sin_entrar`) y el historial sigue en 3.
  - "Atrás" lleva directo a Administración.
- **La memoria de pantalla se conserva:** Personas → "Sin entrar" → la ficha de una persona → "Atrás" vuelve a Personas con "Sin entrar" elegido y la misma URL; un segundo "Atrás" llega a Administración.
- No se comprobó en pantalla "Ver más", porque los datos de prueba caben en una página. Es la misma propiedad `replace` del enlace (`ui/Boton` la pasa a `Link`) y los tipos la aceptan.

## Queda
- Probar en el iPhone del founder, también con el gesto de atrás de Safari y con la app instalada.
- Push y PR cuando el founder lo pida.
