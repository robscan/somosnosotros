# 41 · Inicio personalizado y buscador único (C2 + C4)

**Estado:** propuesta y prototipo, sin código. **OL:** OL-150 · **Bitácora:** [185](../bitacora/2026/09/185-inicio-personalizado.md) · **Cola:** [COLA_DE_PIEZAS.md](../ops/COLA_DE_PIEZAS.md), filas C2 y C4, renglones L4 y L28 del anexo. **Prototipo:** [prototipos/inicio-personalizado.html](prototipos/inicio-personalizado.html).

## De dónde sale

Founder, 2026-09-23, literal: «la app debe tener una pantalla de inicio adicional a las que existen, con diferentes carruseles tipo Netflix que se organicen con varios criterios. Eventos destacados, eventos populares, eventos cercanos esta semana, eventos de tus lugares y artistas favoritos, artistas y lugares con eventos esta semana (son algunas ideas). Que cada carrusel ofrezca "Ver todos" y eso abra la sección que corresponda con los listados y filtros de búsqueda como están hoy. Esto refuerza la necesidad de "un solo buscador" para toda la página que organice los resultados según la sección en la que está el usuario.»

L4 (origen más antiguo, misma idea): inicio configurable por intereses elegidos al abrir la cuenta. L28: «el usuario debería sentir que usa el mismo buscador para encontrar todo», con resultados por tipo e intención; pueden seguir siendo 3 buscadores por dentro.

No contradice nada de lo firmado: sigue "el contexto ordena, no limita" (la cercanía ordena, nunca filtra por ciudad), "filtrar no es navegar" (memoria de pantalla), "sin ranking" (los criterios de destacar ya están firmados en doc 20 y en DEFINICION.md — esta pieza los reutiliza, no inventa uno nuevo) y el grafo cultural (doc 24: "inicio por intereses" ya estaba anotado ahí como canon que se toca).

## Dónde vive la pantalla — recomendación

**Es una sección más en la barra inferior, no sustituye a Agenda.** Tres motivos:
1. El founder pidió literalmente "una pantalla de inicio **adicional** a las que existen" — no dijo reemplazar la Agenda actual, que ya funciona como "qué hay hoy y esta semana" (su propio subtítulo en `generateMetadata`, `src/app/page.tsx`).
2. Reemplazar Agenda por un muro de carruseles rompe el caso de uso más común y más simple: alguien sin sesión que solo quiere ver qué hay hoy cerca. Un muro de carruseles es peor para eso (más scroll, menos densidad de eventos por pantalla) y peor para SEO (la lista plana de eventos es lo que indexa Google, OL-059).
3. `NavInferior` ya tiene el patrón de "cada sección vuelve a su última URL" (memoria de pantalla por sección) y el destino activo lleva píldora; añadir una sección más no rompe nada, solo hay que ver si 4 iconos siguen siendo cómodos con el pulgar (hoy son 3: Agenda, Lugares, Artistas).

Propuesta de nombre y posición: **"Para ti"**, primera posición en la barra (antes de Agenda), con el icono de inicio (casa). Alternativa si el founder prefiere no tocar el orden: al final, después de Artistas. Pendiente de su decisión (pregunta 1, abajo).

Sin sesión, "Para ti" sigue existiendo (no es una pantalla que solo aparece al entrar): con menos carruseles (sin "de tus lugares y artistas favoritos", que no aplica) y con una tarjeta arriba invitando a crear cuenta o entrar, en el mismo tono que ya usa `ActivarAvisos` — nunca un muro que bloquea.

## Carruseles: orden y criterio medible

Reglas comunes a todos:
- Máximo 200 eventos/fichas por consulta (el mismo tope que `cargarCercanos`/`cargarNuevos`, doc de la regla en bitácora 130), sin traer más solo para armar un carril.
- Cada tarjeta reutiliza el patrón ya construido en `lib/destacados.ts` (`tarjetaEvento`, `tarjetaLugar`, `tarjetaArtista`): 220×200 px, foto obligatoria (símbolo SN si no hay portada, regla firmada — nunca compuesta en vivo), scroll horizontal con `scroll-snap` (patrón ya usado en `boton-en-carriles.html` y en la tira de Destacados).
- **Un carril vacío no se muestra** (ni título ni hueco, la misma regla que ya rige la tira de Destacados en doc 20): se calcula en el servidor y si no hay nada que mostrar, ese `<section>` no se pinta. Nunca "aún no hay nada aquí" dentro de un carril — eso reserva espacio para lo vacío, que la regla de Destacados ya prohíbe.
- Cada carril lleva su "Ver todos →" que navega a la sección real (Agenda, Lugares o Artistas) **con el filtro ya aplicado** en la URL (mismo patrón que hoy: `?ciudad=`, pestaña de Agenda, chip de tipo en Lugares) — nunca una lista aparte que duplique código de filtrado.

| # | Carril | Con sesión / sin sesión | Con ubicación / sin ubicación | Criterio medible | "Ver todos" abre |
|---|---|---|---|---|---|
| 1 | **De tus lugares y artistas favoritos** | Solo con sesión y con al menos un seguido | No depende de ubicación | Próximos eventos donde `lugar_id` o el artista está en `seguimientos` de la persona, ciudad del chip, no pasados, no ocultos. Ya es la lista `eventosSeguidos` + eventos de lugares seguidos que hoy arma `src/app/page.tsx` (líneas 66-77) para la pestaña "Siguiendo" de Agenda — se reutiliza, no se recalcula. | Agenda, pestaña "Siguiendo" |
| 2 | **Eventos cercanos esta semana** | Con o sin sesión | Solo con ubicación concedida (si no, no se muestra el carril) | Reutiliza `cargarCercanos()` (`src/lib/cargarCercanos.ts`): próximos 7 días, ordenados por distancia real en el teléfono (coordenadas nunca viajan al servidor), todas las ciudades — la cercanía ordena, no filtra por ciudad (regla de bitácora 130). | Agenda, pestaña "Cercanos" |
| 3 | **Eventos destacados** | Con o sin sesión | No depende | Los mismos que hoy arma `leerTira(supabase, "eventos", ciudad)` (doc 20: elegidos por el admin + los de más asistentes desde 3, sin contar administración). Un solo criterio, ya firmado; no se reinventa "destacado" para el inicio. | Agenda, con la tira visible arriba (Todos, sin fecha ni búsqueda) |
| 4 | **Eventos populares** | Con o sin sesión | No depende | Próximos eventos de la ciudad ordenados por `van_por_evento` (RPC que ya existe, cuenta "Voy") de mayor a menor, mínimo 3 asistentes sin contar administración — el mismo umbral que ya usa doc 20 para "más asistentes", para no inventar un segundo criterio de popularidad que compita con Destacados. Si Destacados y Populares comparten evento, no se repite dentro de Populares (se salta al siguiente). | Agenda, Todos, ordenado por popularidad (orden nuevo pequeño en el filtro; hoy Agenda ordena por fecha) |
| 5 | **Artistas y lugares con eventos esta semana** | Con o sin sesión | No depende | Artistas o lugares con al menos un evento visible en los próximos 7 días en la ciudad del chip. Dos carriles chicos (uno de artistas, uno de lugares) o uno mixto — recomendación: dos carriles separados, porque "Ver todos" necesita una sola sección de destino y un carril mixto no puede abrir dos secciones distintas. | Artistas (chip "Esta semana", nuevo) y Lugares (chip "Esta semana", nuevo) |

Orden de arriba hacia abajo en la pantalla: **1 (tus favoritos) → 3 (destacados) → 2 (cercanos) → 4 (populares) → 5 (artistas/lugares esta semana)**. Lo personal primero (si existe), luego lo que ya cura el admin, luego lo geográfico, luego lo social, y al final el descubrimiento de fichas nuevas. Sin sesión, la pantalla empieza directo en 3.

**Sin duplicar seguidos):** un evento que ya salió en el carril 1 no se repite en 2, 3 o 4 (se filtra por id ya visto, igual que "no se muestra un lugar seguido si ya salió antes" pide el encargo). Esto evita que la misma tarjeta se vea tres veces en una pantalla que ya es larga.

## El buscador único

**Un campo en la cabecera de toda la app** (no solo de Agenda): vive en la barra superior (`components/ui/Barra` hoy solo tiene logotipo + sesión) o en la cabecera fija de cada sección, según lo que el founder prefiera (pregunta 2). Al escribir, los resultados salen **agrupados por tipo** (Eventos / Lugares / Artistas), cada grupo con sus primeras 3-5 coincidencias y su propio "Ver todos" hacia la sección con la búsqueda ya en la URL.

**Cómo se reparte con los tres buscadores actuales — no se tiran, se reordenan:**
- El campo de Agenda (`CampoBuscar` en memoria, filtra los eventos ya cargados en el teléfono) y el de Lugares (mismo componente, mismo patrón) siguen existiendo tal cual: siguen siendo lo más rápido cuando la persona ya está dentro de esa sección y solo quiere acotar lo que ve.
- El buscador de la URL (`components/ui/Buscador`, `?q=`) es el que ya sabe pedir al servidor y compartir enlace: es la base técnica del buscador único, extendida para consultar las tres tablas a la vez en vez de una.
- **El buscador único es una capa nueva encima, no un cuarto componente que compite:** mismo campo (`CampoBuscar`), pero el resultado depende de dónde está la persona:
  - **Desde Inicio o desde cualquier pantalla sin lista propia:** los tres tipos se muestran agrupados, en el orden Eventos → Lugares → Artistas (el orden de "qué pasa" antes que "dónde" y "quién", que es como ya piensa la Agenda).
  - **Desde dentro de una sección (Lugares, Artistas, Agenda):** esa sección sale primero y con más resultados (5 en vez de 3); las otras dos aparecen después, más chicas, como atajo ("¿buscabas este artista?"). Es la regla que pide L28 ("que organice los resultados según la sección en la que está el usuario") sin quitarle a cada sección su búsqueda rápida en memoria.
- Internamente pueden seguir siendo 3 consultas (una por tabla, con `ilike` sobre nombre/título, tope 5-8 cada una) hechas en paralelo — no hace falta una tabla de búsqueda combinada ni una extensión nueva de Postgres para esta escala (cientos de fichas por ciudad, mismo argumento de doc 24 sobre no cambiar de stack).

## Qué datos ya existen y cuáles faltan

**Ya existen (nada que migrar para el prototipo ni para una primera versión en código):**
- `seguimientos` (lugar_id, artista_id) → carril 1.
- `cargarCercanos()` → carril 2.
- `leerTira()` / tabla de destacados → carril 3.
- RPC `van_por_evento` → carril 4.
- Eventos por lugar/artista con fecha (`eventos.lugar_id`, `eventos_artistas`) → carril 5 y filtro "esta semana" en Lugares/Artistas (hoy no existe ese chip; es chico: `WHERE` por rango de fecha sobre eventos ya relacionados).
- `CampoBuscar`, `Buscador` (URL) → base del buscador único.

**Falta:**
- Un chip o pestaña "Esta semana" en Lugares y en Artistas (hoy sus filtros son por tipo/disciplina y ciudad, no por fecha de sus eventos).
- Un orden "por popularidad" en Agenda para que "Ver todos" del carril 4 tenga a dónde apuntar (hoy Agenda solo ordena por fecha).
- Un endpoint o función de servidor que arme las 5 listas de golpe para no hacer 5+ consultas sueltas desde el cliente (equivalente a lo que hace `cargar()` en `src/app/page.tsx`, pero con los 5 criterios).
- Búsqueda combinada en servidor que consulte `eventos`, `lugares` y `artistas` en paralelo y devuelva agrupado — hoy cada sección busca solo en su propia tabla.
- Intereses/disciplinas elegidas por la persona (L4) para un futuro carril "de tu disciplina favorita": las disciplinas ya existen como dato de las fichas (doc 24 lo anota), pero no hay campo de "interés elegido" en el perfil. **No entra en esta pieza** (el encargo de hoy no lo pidió como carril fijo, solo lo cita como antecedente) — queda anotado para cuando el founder quiera esa capa.

## Preguntas para el founder

1. ¿"Para ti" va primera en la barra inferior (antes de Agenda) o al final (después de Artistas)? Cambia qué ve la persona al abrir la app la primera vez y si hay que mover el resto de iconos.
2. ¿El buscador único vive siempre visible en la barra superior (un toque menos, ocupa espacio en todas las pantallas) o se abre con una lupa como hoy en Agenda y Lugares (menos ocupado, un toque más)?
3. ¿Los 5 carriles del encargo son fijos para todos o el founder quiere, más adelante, dejar que la persona reordene u oculte los que no le sirven? (Se puede construir fijo ahora y dejar la puerta abierta después; no bloquea nada.)
4. El carril "eventos populares" y "eventos destacados" pueden solaparse mucho al principio (pocos eventos con "Voy"). ¿Está bien que Populares quede corto o vacío las primeras semanas (y por tanto no se muestre), o prefiere fusionar ambos criterios en un solo carril mientras crece el uso?
5. "Esta semana" para el carril 5 y los nuevos chips de Lugares/Artistas: ¿semana de calendario (lunes a domingo) o "próximos 7 días" desde hoy, como ya usa `cargarCercanos`? Se recomienda "próximos 7 días" por consistencia con lo que ya existe.
