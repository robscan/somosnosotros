# 435 · El grafo con umbral 1, «sigue a» como línea y sitios sin ficha como nodo (OL-404)

**Fecha:** 2026-10-13. **Rama:** `grafo-relaciones`, base `origin/main` (`9eafafb5`). **Operador:** agente de la pieza (Fable 5.1), sin otros agentes. **Sin migración, sin tablas nuevas y sin variables de entorno nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El origen

El founder revisó al artista DwardNoize en `/admin/grafo`: «2 seguidores, 1 asistencia, 1 fecha, pro no tiene relaciones con otros puntos, debería relacionarse con dos usuarios y un lugar por lo menos». El gestor comprobó la causa con datos reales: su única fecha es un acto del Electric Universe Festival en un **sitio libre** (coordenadas con `sitio_texto`, sin lugar con ficha), su única asistencia quedaba bajo el umbral de 3 y los seguimientos no eran líneas. Decisión del founder: «baja humbral a 1 para grafo y acepto tus otras recomendaciones».

## Lo que se ve

- Un solo «Voy» o «Me interesa» ya dibuja sus líneas (al lugar o sitio, a los artistas del evento, y entre personas cuando coinciden dos).
- **«Sigue a»** es una línea: de una persona a un artista o a un lugar que sigue. Delgada (55 % del grosor) y del color de persona atenuado hacia el fondo; vale 1 y no tiene fecha. Quien solo sigue (sin asistir) ya es un punto anónimo, colocado entre los lugares que sigue y donde más tocan los artistas que sigue.
- **Los sitios sin ficha son un nodo gris** en el suelo, con tamaño de lugar (sus asistencias). Los artistas con eventos ahí flotan sobre el sitio con el mismo halo que sobre un lugar y quedan unidos a él; los asistentes, también. Dos actos del mismo festival se unen aunque uno esté en un lugar con ficha y otro en un sitio (o dos sitios).
- La tarjeta del sitio dice «Sin ficha · dar de alta el lugar» y enlaza a `/nuevo/lugar?nombre=…&lat=…&lng=…` (el alta por pasos ya acepta nombre y punto por la URL; sin nombre en ningún evento, solo el punto).
- Tarjetas: persona «sigue a 1 artista · 1 lugar»; artista y lugar «2 lo siguen»; artista «en 1 sitio sin ficha».
- Árbol: «Sitios sin ficha · N» bajo «Lugares» (que ahora cuenta fichas y sitios). Leyenda: bajo «Lugar», una marca gris «Sitio sin ficha · por dar de alta» (con su ayuda).
- Diagnóstico, dos frases nuevas: «6 personas siguen a alguien; 3 solo siguen, sin asistir aún.» y «4 sitios sin ficha con 5 eventos: cada uno es un lugar por dar de alta.»

## Archivo por archivo

- `src/lib/grafo.ts`: `UMBRAL_ANONIMATO = 1` con comentario de la decisión (13 oct 2026, solo Administración; las personas siguen anónimas: sin id ni nombre, con tramos y posición inventada). Tipos nuevos de línea: `as` artista→sitio, `psit` persona→sitio (asistencia), `psa` y `psl` persona→artista / persona→lugar (seguir), `ls` lugar–sitio y `ss` sitio–sitio (mismo festival). `NodoSitio` (`nombre`, `sinNombre`, `lat`, `lng`, `x`, `z`, `asistentes`, `eventos`, `proximos`, `d`), `NodoArtista.sitios`, `resumen.sitios`, `eventosEnSitios`, `personasSoloSiguen` (y `personasQueSiguen` pasa a significar «siguen a algo»). Lee `sitio_texto` en la consulta de eventos. Una sola «clave de sede» (lugar < N, sitio ≥ N) para pesos de artistas, halos y festivales.
- `src/lib/grafo.test.ts`: 46 pruebas (eran 30): las de umbral pasan a 1; «sigue a» (líneas, sin umbral, orden de filas, seguimiento a algo ausente); sitios (el caso de DwardNoize con exactamente 1 artista→sitio, 1 persona→artista, 1 persona→sitio y 2 persona→artista por seguir; 30 m juntos y 230 m separados; sin dependencia de una rejilla; nombre más repetido y «Sitio sin ficha»; lugar con ficha, sin coordenadas o borrador no crea sitio; tamaño y días; `ls` y `ss`; un artista en lugar y sitio; anonimato); personas que solo siguen (posición por lo que siguen y cerca del centro si nada tiene posición).
- `src/app/admin/grafo/motor.ts`: nodo `sitio` (capa Lugar, gris propio `--g-c-sitio`, y = 0), líneas nuevas, `fino` para «sigue a», filtro «Lugares» incluye sitios y «Sitios sin ficha» es su subfiltro, tarjeta con las cuentas por clase de línea y el enlace de alta, diagnóstico, lentes «mismo sitio» y «puentes» cuentan sitios como sedes, red con sitios en el suelo, cuenta de la barra suma sitios a Lugar.
- `Grafo.tsx` y `Grafo.module.css`: la marca del sitio bajo «Lugar», el enlace de la tarjeta (44 de alto), «Aún no has asistido ni seguido» (antes «Aún no tienes asistencias»: ahora quien solo sigue tiene punto).
- `ayuda.ts` (y el manual, que sale de él): entradas nuevas «Sitio sin ficha» (tarjeta, con ancla `sitios`) y «filtro-sitios»; actualizadas capa Lugar, capa Asistente, Yo, Líneas (leyenda de «sigue a»), Tiempo, Diagnóstico, Solo en sitios libres, Lugares y Asistentes.
- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: un festival inventado con su marco y un acto en un parque sin ficha (a ~22 m del marco) y otro acto en un lugar con ficha; el artista inventado «Ruido Blanco» con su única fecha ahí, una asistencia y dos seguidores (solo los ve la llave de servicio inventada). Comentado OL-404.
- `medidas.aceptadas.json`: `s29-admin-grafo` de 389·389·427·426 a **464·464·502·501** nodos (más filas en el árbol del respaldo: sitios, subfiltro, marca de leyenda y dos frases) y `s30-admin-grafo-manual` de 219·219·253·253 a **227·227·261·261** (tres entradas más). Profundidad igual.

## Decisiones que tomé

- **Agrupar sitios por cercanía, no por rejilla.** Dos eventos sin lugar están en el mismo sitio si están a **50 m o menos**, encadenando (si A está a 40 m de B y B a 40 m de C, son uno). Una rejilla parte en dos lo que está a 30 m cuando justo cae una raya entre ellos (hay una prueba que lo comprueba en cinco latitudes). El orden y el nombre salen de los ids y de un desempate alfabético, así que no dependen del orden de las filas. Posición: el promedio de las coordenadas del grupo. Con unos 40 eventos en sitio libre, el costo es trivial.
- **Nombres de líneas:** en vez de un solo `ps` para seguir (ambiguo: destino artista o lugar), `psa` y `psl`; `as` y `psit` para los destinos sitio; `ls` y `ss` para festivales con sitios.
- **«Sigue a» sin días:** el filtro de tiempo la trata como siempre activa (`d` vacío = activa). Pero no cuenta para que un punto esté «activo en el periodo»: un artista no se queda brillante fuera de periodo solo porque alguien lo sigue; la persona que solo sigue se apaga fuera de periodo. Con «Todo el tiempo», todo cuenta.
- **Estilo de «sigue a»:** más fina y del color de persona mezclado 40 % con el fondo (los tubos instanciados no admiten punteado limpio).
- **Capa y color de los sitios:** dentro de «Lugar» (plegar la capa los pliega). Gris propio: en oscuro, el gris suave con 25 % de blanco; en claro, el gris suave tal cual; siempre más oscuro que el de «por conectar» y mucho más grande (tamaño de lugar).
- **El filtro «Lugares» incluye los sitios** (el padre suma fichas y sitios; el subfiltro «Sitios sin ficha» los aísla). Así las lentes que fijan «Lugares» no los esconden.
- **Los sitios no cuentan como lugares en el diagnóstico de concentración, cúmulos y zonas** (esas frases hablan de lugares con ficha), y por eso hay una frase propia.
- **Solo hay sitio si `lugar_id` es nulo.** Un evento con lugar oculto o privado y coordenadas ya no se coloca por sus coordenadas (antes sí caía en «sitio libre»): no se expone la posición de un lugar privado.
- **Artista en lugar y sitio:** su posición cuenta ambos (queda entre ellos, radio 18) y «Puentes» y «mismo sitio» los tratan como sedes.
- **«Solo en sitios libres» se queda** (artistas sin lugar con ficha, ahora unidos a su sitio).
- Tarjeta con enlace normal (`<a href>`, no navegación de Next): sale del grafo al alta.
- **Privacidad:** admin, con la decisión expresa del founder; en el HTML de la página con la sesión de administración del respaldo no aparece ningún id de persona, ni el correo ni el nombre de la cuenta de administración. Las coordenadas que viajan son las de sitios de eventos, no de personas.

## Verificación

`npm run lint` (0 errores, el aviso de siempre), `npm run typecheck` verde, `npm test`: **219 archivos, 3 899 pruebas** (16 más en `grafo.test.ts`), `npm run inventario`: sin novedades (342 medidas en duro, 1 bloque duplicado aceptado), `npm run medir`: 40 pantallas × 4 anchos, **sin novedades** con los presupuestos nuevos (sin hijos fuera de caja, toques de 44, nada tapado).

**Con el respaldo** (`next build` + `next start` contra el respaldo local y llave de servicio inventada; sin `.env`, sin `.env.local`), Chrome real, 2×, toques con el ratón sobre las coordenadas proyectadas del nodo: 39 nodos (9 lugares, 4 sitios, 14 artistas, 11 personas, 1 «por conectar»). Ruido Blanco queda con **4 conexiones: en 1 sitio sin ficha · 1 asistente · 2 lo siguen**; el Parque Lineal (demo) con 3 (1 artista · 1 lugar del mismo festival · 1 asistente); una persona que solo sigue con «sigue a 1 artista · 1 lugar». Con datos reales no lo comprobé (este árbol no lee producción): DwardNoize debería salir igual en cuanto la pantalla relea la base (botón «Actualizar»).

## Capturas (`docs/rediseno/capturas-435/`, Chrome real, 2×, respaldo local con datos inventados)

1. `00-movil-nube.png` (390×844): la nube al abrir; la leyenda lleva la marca gris «Sitio sin ficha · por dar de alta» bajo «Lugar»; cuatro esferas grises medianas (sitios) y el gris claro y chico de «por conectar» arriba a la derecha.
2. `01-movil-artista-ruido-blanco.png`: el artista elegido; tarjeta «Música · solo en sitios libres · 2 seguidores · 1 asistencia · 1 fecha · 4 conexiones: en 1 sitio sin ficha · 1 asistente · 2 lo siguen»; de él salen una línea blanca gruesa al sitio, otra al asistente y dos finas rosadas a los seguidores; rótulo «Parque Lineal (demo)» sobre el sitio.
3. `02-movil-sitio-dar-de-alta.png`: el sitio elegido; «Sitio sin ficha de lugar · 1 asistencia · 2 eventos · 3 conexiones…» y el enlace subrayado «Sin ficha · dar de alta el lugar» (href con el nombre y el punto).
4. `03-movil-persona-que-solo-sigue.png`: un asistente anónimo que solo sigue: «2 conexiones: sigue a 1 artista · 1 lugar», dos líneas del color de persona atenuado.
5. `04-movil-arbol-sitios-sin-ficha.png`: la hoja «Lentes» con «Lugares 13» (9 fichas + 4 sitios), sus subfiltros y «Sitios sin ficha 4 — cada uno es un lugar por dar de alta» con punto gris.
6. `05-movil-filtro-sitios.png`: el filtro aplicado: solo los sitios grises en la escena (el panel de ayuda enseña «Capa Lugar» porque el ratón quedó encima de la leyenda).
7. `06-movil-lista-diagnostico-sitios.png`: la hoja «Lista» con «6 personas siguen a alguien; 3 solo siguen, sin asistir aún.» y «4 sitios sin ficha con 5 eventos: cada uno es un lugar por dar de alta.», y la lista «Sitios sin ficha · 4».
8. `07-escritorio-artista-ruido-blanco.png` (1280×800): el mismo caso en tres columnas; árbol con «Sitios sin ficha 4», tarjeta, líneas y la lista con Ruido Blanco marcado.

## Lo que no entró

- Un punteado real para «sigue a» (con tubos instanciados no sale limpio): va fina y tenue.
- Una escena aparte por ciudad y los nodos de eventos (siguen fuera, doc 56 § 8).
- Que dar de alta el lugar desde el enlace pase solo los eventos del sitio al lugar nuevo: el alta ya sabe ligar por la clave `sitio` de OL-366, pero esa clave sale de otra tabla (`sitios`) y el grafo hoy no la lee; el enlace lleva nombre y punto.
- El doc 56 (rama `grafo-3d`) sigue diciendo «umbral de 3» y «sin líneas desde Seguir»: no lo toqué (no es de mi pieza); queda desactualizado en esos dos puntos.

## Para el gestor

Nada que aplicar en Supabase ni en Vercel. Conflictos probables: `docs/ops/OPEN_LOOPS.md` (una bala y la cabecera) y `scripts/ops/auditoria-ui/medidas.aceptadas.json` (las dos líneas de presupuesto del final). Para ver el caso real: abrir `/admin/grafo`, pulsar «Actualizar» (la caché es de una hora) y elegir a DwardNoize.
