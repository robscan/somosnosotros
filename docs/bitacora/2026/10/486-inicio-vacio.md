# 486 · Prototipo: Inicio vacío, una ciudad sin eventos próximos (OL-454)

**Fecha:** 2026-10-22. **Rama:** `inicio-vacio`, base `origin/main` (`5325e236`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Solo prototipo:** nada en `src/**`, sin migración ni variables de entorno. **Estado:** espera la revisión del gestor y la firma del
founder. Prototipo: `docs/rediseno/prototipos/inicio-vacio.html`. Capturas: `docs/rediseno/capturas-486/`.

## El pedido (founder, textual)

«el empty state para inicio en los casos de una ciudad que no tiene eventos ni lugares de la semana, necesitamos trabajarlo porque de momento
solamente se ve la card de compartir si te gusta la aplicación, y en el caso de que existan planes, pues los planes… Hay que agregar un call to
action para que el usuario cree eventos, o lugares, o artistas… Insisto, empty state, ciudad nueva, o vieja, sin eventos».

## Por qué hoy solo se ve el banner (y Tus planes)

Las dos cosas a la vez, según haya sesión (capturas 01 y 02, Querétaro del respaldo: tres lugares, dos artistas, ningún evento próximo):

- **Sin sesión, el aviso sale pero no se nota.** `InicioVacio` (`src/components/Inicio.tsx`) pinta el `Vacio` de `AgendaInicio.tsx` al final de
  la pantalla, debajo del banner: «Próximos días» a 19 px y «Aún no hay eventos próximos en Querétaro. Si sabes de uno, publícalo.» en gris
  chico, sin ningún botón. Lo único con peso en pantalla es el banner de compartir.
- **Con sesión y planes en otra ciudad, el aviso no sale.** `useEstadoCarriles` (`inicio/EstadoCarriles.tsx`) da `vacio` solo si TODOS los
  carriles esperados vienen vacíos, y con sesión cuenta `inicio-tus-planes`. Tus planes no se filtra por ciudad (a propósito, OL-219: un plan
  hecho sigue siendo tuyo), así que los planes de San Luis hacen que Querétaro «no esté vacía»: se ven el banner y Tus planes, y nada más.
- Los demás carriles existen colapsados (sin alto). «Lugares de la semana» y «Artistas de la semana» solo muestran fichas con un evento esta
  semana; «Artistas destacadxs», solo artistas con un evento próximo. Por eso una ciudad con lugares y artistas pero sin agenda no enseña nada
  de lo que sí tiene.

Dos hallazgos más, para la pieza de código:

- **Una ciudad sin ninguna ficha no llega a Inicio.** `cargarCiudades` arma la lista con los lugares, los eventos vigentes y los artistas
  (`ciudades_agregadas` y `ciudades_artistas_agregadas`); `ciudadPorSlug` cae en San Luis Potosí si la ciudad no está. Una ciudad «nueva» de
  verdad abre San Luis sin decirlo. Lo más nuevo que puede estar una ciudad en Inicio es con una sola ficha (Ciudad de México en el respaldo:
  una artista; capturas 03, 10, 11).
- **Una ciudad con solo artistas no tiene centro** (`centroConocido: false`): para medir «lo más cercano» hace falta el centro del catálogo de
  Ciudades (`ciudades.lat/lng`, el de Administración), que sí lo tiene.

## Los estados (390×844, con y sin sesión)

| Caso (respaldo) | Hoy | Propuesta |
|---|---|---|
| 1 · Casi nueva: Ciudad de México, una artista | Banner + «Próximos días» chico; con sesión, banner + Tus planes | Llamado a crear, banner, (Tus planes), «A 358 km, en San Luis Potosí», Artistas (1) |
| 2 · Lugares y artistas, sin eventos: Querétaro | Igual que el 1 | Llamado, banner, (Tus planes), «A 183 km, en San Luis Potosí», Lugares (3), Artistas (2) |
| 3 · Eventos solo más adelante: Zacatecas | «Más adelante» ya sale con sus tres eventos (19 y 26 oct, 9 nov) | **Sin cambios**: ya está cubierto y la ciudad no está vacía |

## Qué pieza existente se reutiliza en cada cosa

Todo con el marcado y las clases de producción (con su hash), sacados de las maquetas reales; el prototipo no dibuja nada a mano.

- **Llamado a crear** = el aviso de vacío de las listas (`Lista.module.css` `.vacio`: su `h2` y su `p`, el mismo de hoy con otro texto) + la
  tira Evento · Lugar · Artista de las altas (`app/nuevo/TiraTipos`, variante `enPie`), con los tres tipos como enlaces a su alta con la ciudad
  puesta (`/nuevo/evento?ciudad=…`, `/nuevo/lugar?ciudad=…`, `/nuevo/artista?ciudad=…`; las tres altas ya leen `ciudad`). Sin sesión, el alta
  ya redirige a Entrar («Entra para publicar») y vuelve a ella (`siguiente`): no hay nada que hacer. Texto: «¿Sabes de algo que pase en
  Querétaro?» / «Aún no hay eventos próximos aquí. Publica el primero, o registra un lugar o a un artista.» Va en el sitio del carril estelar
  (primero), y el banner queda donde está, después.
- **Lo más cercano** = el carril de tarjetas que ya existe (`Destacados` + `TarjetaEvento` mediana: el «Esta semana» de San Luis tal cual),
  con la distancia en el título por `textoDistancia` (`lib/agenda`) sobre `distanciaKm` (`lib/geo`): «A 183 km, en San Luis Potosí», y su
  «Ver la agenda» a la agenda de esa ciudad. La cercanía ordena: es la ciudad más cercana que tiene eventos esta semana, no un filtro.
- **Lo que sí hay en la ciudad** = el carril de avatares de «Lugares de la semana» (`Destacados` + `TarjetaAvatar`, sin foto el símbolo SN),
  titulado «Lugares» y «Artistas», con sus «Ver lugares» / «Ver artistas» a la sección con la ciudad. Solo si la ciudad tiene alguno.
- **Avísame**: no existe seguir una ciudad. Lo que ya existe y sirve: seguir un lugar o a un artista desde su ficha manda el aviso de su próximo
  evento (`avisos`, tipo `nuevo_evento`). Por eso el carril «Lo que sí hay» es también el camino al aviso. **Idea, sin pantalla:** «seguir la
  ciudad» y avisar con el primer evento publicado en ella: pide una tabla nueva y un tipo de aviso más; no se dibuja.
- **Del lado del sistema (propuesta, sin pantalla):** en el cron diario de `/api/rutinas/correr` (12:00), por cada ciudad abierta del catálogo
  con 0 eventos vigentes (`ciudades_agregadas`) y sin corrida de «Buscar agendas y eventos» en los últimos 7 días, crear una corrida `agendas`
  con tope bajo (p. ej. 1 USD; los créditos de API vencen el 11 de noviembre) y sus fuentes guardadas; lo que encuentre llega a la bandeja de
  Ciudades como hoy, sin publicar nada solo.

**Nuevo: nada.** Solo dos cambios de código, ninguno de pantalla: (1) `vacio` deja de contar Tus planes (cuenta solo lo de la ciudad), y (2) el
llamado sale arriba en vez de abajo. Lo único que se ve distinto de su uso de origen es la tira: trae el fondo blanco de las altas y sobre el gris
de Inicio se lee como una franja blanca (capturas 06 y 10); ver la pregunta 3.

## Recomendación (una cosa a la vez, en el orden firmado)

Solo cuando la ciudad no tiene ningún evento próximo, y en este orden: **1) el llamado a crear** (arriba, donde va el estelar), **2) el banner
y Tus planes**, como hoy, **3) lo más cercano**, el carril de la ciudad más cercana con eventos y su distancia, **4) Lugares y Artistas** de la
ciudad si los hay. Eventos siempre antes que lugares y artistas. Avisar por ciudad y la rutina automática quedan como siguiente paso, aparte.

## Prototipo, medida y recorrido

- **Sobre la pantalla real.** `maqueta-pantalla.mjs` guarda 11 pantallas más (Inicio de San Luis, Querétaro, Zacatecas y Ciudad de México con y
  sin sesión, las tres altas con `?ciudad=queretaro` y Entrar con `siguiente`); `--solo=` acepta ahora varios ids separados por comas. Los datos
  de Querétaro y Zacatecas viven en el respaldo solo con `RESPALDO_VACIO=1` (`npm run medir` no cambia). `prototipo/inicio-vacio.mjs` arma el
  prototipo desde esas maquetas con `prototipo/inicio-vacio.plantilla.html` (el armazón: selector de caso, Hoy/Propuesta, sin/con sesión; el
  teléfono en un `iframe` con el CSS servido; las notas). Las clases de la propuesta se buscan en el CSS: si una no existe, falla.
- **Medida del llamado** (medir.js dentro del marco): 7 nodos (div, h2, p, la tira y sus tres enlaces), 0 div o span sin clase, sin
  envoltorios; profundidad de la pantalla 10, igual que hoy. Ningún desborde en ninguna pantalla. Toques de menos de 44: solo los que ya
  existen (la ✕ del banner, 36×36; los enlaces de reglas en Entrar). Los de la tira miden 64×55.
- **Recorrido con toques reales** (`capturar-inicio-vacio.mjs`, clics de ratón por coordenadas en los selectores y dentro del teléfono):
  14 de 14 comprobaciones, ningún error de página. Hoy sin sesión sale «Próximos días»; con sesión no sale y sí Tus planes; Zacatecas ya tiene
  «Más adelante»; el orden de la propuesta (sin sesión: llamado · banner · cercano · Lugares · Artistas; con sesión, Tus planes tras el banner);
  sin sesión «Evento» pasa por Entrar y «Mandarme el código» vuelve al alta de evento; la ✕ vuelve a Inicio; con sesión «Lugar» va directo al
  alta de lugar y su tira pasa a Artista.

## Capturas (`docs/rediseno/capturas-486/`, abiertas una por una)

- `01-hoy-queretaro-sin-sesion.png`: banner y, debajo, «Próximos días» con el texto gris; el resto de la pantalla, vacío.
- `02-hoy-queretaro-con-sesion.png`: banner y Tus planes de San Luis (Charla de la Cristiada, Taller de linóleo); sin aviso de vacío.
- `03-hoy-cdmx-sin-sesion.png`: lo mismo que la 01 en Ciudad de México (su artista no sale en ningún carril).
- `04-hoy-zacatecas-sin-sesion.png`: banner y «Más adelante» con los tres eventos de la ciudad (tarjeta mediana con el símbolo SN).
- `05-hoy-zacatecas-con-sesion.png`: banner, Tus planes y «Más adelante» debajo.
- `06-propuesta-queretaro-sin-sesion.png`: el llamado arriba con la tira (franja blanca), el banner y «A 183 km, en San Luis Potosí» (título en
  dos líneas) con las tarjetas de San Luis.
- `07-propuesta-queretaro-sin-sesion-abajo.png`: el final: las tarjetas, «Lugares» con sus tres avatares y «Artistas» con dos.
- `08-propuesta-queretaro-con-sesion.png`: llamado, banner y Tus planes.
- `09-propuesta-queretaro-con-sesion-abajo.png`: cercano, Lugares y Artistas tras Tus planes.
- `10-propuesta-cdmx-sin-sesion.png`: llamado, banner y «A 358 km, en San Luis Potosí».
- `11-propuesta-cdmx-sin-sesion-abajo.png`: las tarjetas de San Luis y «Artistas» con Rocío Lozano.
- `12-recorrido-entrar.png`: «Entra para publicar» tras tocar «Evento» sin sesión.
- `13-recorrido-alta-evento.png`: el primer paso del alta de evento («Sube el cartel») con la tira en EVENTO.
- `14-recorrido-alta-lugar.png`: con sesión, «¿Cómo se llama?» del alta de lugar con la tira en LUGAR (el campo con el contorno de foco).
- `15-prototipo-1280.png`: la página del prototipo entera: selectores, teléfono y notas con la medida (7 · 10 · 0).

## Preguntas al founder (frases llanas)

1. **¿El llamado arriba de todo, antes del banner de compartir?** Así lo propongo (es lo primero que hay que hacer en una ciudad vacía). ¿O
   prefieres esconder el banner mientras la ciudad no tenga eventos, para que se vea una sola cosa?
2. **¿Mostramos eventos de la ciudad más cercana?** El título dice la distancia («A 183 km, en San Luis Potosí»). ¿Te sirve así, o solo el
   llamado y lo que sí hay en la ciudad?
3. **La tira Evento · Lugar · Artista** es la de las altas tal cual, con su fondo blanco: sobre el gris de Inicio se ve como una franja. ¿La
   dejamos así, le quitamos el fondo en Inicio (una línea de estilo), o prefieres tres botones?
4. **El título del llamado** es el del aviso de vacío de las listas (19 px), más chico que el de los carriles (26 px). ¿Lo subimos al tamaño de
   los carriles para que se note?
5. **Zacatecas** (eventos solo más adelante) ya se ve bien con «Más adelante»: ¿quieres también ahí el llamado a crear, o solo cuando no hay
   ningún evento próximo?
6. **Seguir una ciudad** para avisar con su primer evento no existe; hoy se sigue un lugar o a un artista. ¿Lo abrimos como pieza aparte?
7. **Rutina sola:** cuando una ciudad del catálogo se queda sin eventos, ¿lanzamos «Buscar agendas y eventos» automáticamente, con un tope de
   1 USD por ciudad y por semana?

## Archivos

- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: Querétaro y Zacatecas con `RESPALDO_VACIO=1`.
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs`: 11 pantallas más y `--solo=` con varios ids.
- `scripts/ops/auditoria-ui/prototipo/inicio-vacio.mjs` y `inicio-vacio.plantilla.html` (nuevos): arman el prototipo.
- `scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs` (nuevo): capturas, medida y recorrido.
- `docs/rediseno/prototipos/inicio-vacio.html` (1 MB: el CSS servido y las imágenes de las maquetas, cada una una vez).
- `docs/rediseno/capturas-486/` (15 PNG, 1,2 MB).

Para rehacerlo:

```
RESPALDO_VACIO=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=inicio,alta-evento,alta-lugar,alta-artista,entrar-alta
node scripts/ops/auditoria-ui/prototipo/inicio-vacio.mjs <carpeta>
node scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs <carpeta-capturas>
node scripts/ops/auditoria-ui/comprimir.mjs docs/rediseno/capturas-486 <carpeta-capturas>/*.png
```
