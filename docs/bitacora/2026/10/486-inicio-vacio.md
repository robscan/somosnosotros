# 486 · Prototipo: Inicio vacío, una ciudad sin eventos próximos (OL-454)

**Fecha:** 2026-10-22. **Rama:** `inicio-vacio`, base `origin/main` (`5325e236`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Prototipo firmado y en código** (sin migración ni variables de entorno). **Estado:** firmado por el founder («solo botón. iguala título de
carril.») y en código en la misma rama; espera la revisión del gestor y el «publica» del founder. Prototipo: `docs/rediseno/prototipos/inicio-vacio.html`. Capturas: `docs/rediseno/capturas-486/`.

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
  una artista; capturas 03 y 08).

## Primera vuelta (resumida)

Propuse, con piezas existentes: el aviso de vacío con la tira Evento · Lugar · Artista de las altas arriba, el banner y Tus planes como hoy, el
carril de la ciudad más cercana con su distancia («A 183 km, en San Luis Potosí») y Lugares y Artistas de la ciudad en avatares, con siete
preguntas. Commit `4b700337`.

## Segunda vuelta: lo que decidió el founder (textual)

«Escondemos el banner cuando ciudad sin eventos. No mostramos eventos de ciudades cercanas para no confundir, sí quita fondo blanco pero ¿cómo
resuelves accesibilidad? ¿si solo dejas "+" en grande y abre en eventos por estar en eventos? no tienes que abrir seguir ciudad, solo lugares de
ciudad como está hoy. Buscar agendas y eventos es señal para abrir ciudad pero la ciudad se abre manual desde admin.»

Con las instrucciones del gestor: un solo botón primario grande con el «+» **y la palabra** (un «+» solo no se entiende ni lo lee bien un lector
de pantalla), al alta de evento con la ciudad puesta.

## Los estados (390×844, con y sin sesión)

| Caso (respaldo) | Hoy | Propuesta |
|---|---|---|
| 1 · Casi nueva: Ciudad de México, una artista | Banner + «Próximos días» chico; con sesión, banner + Tus planes | Llamado con «+ Publicar un evento», sin banner; con sesión, Tus planes debajo |
| 2 · Lugares y artistas, sin eventos: Querétaro | Igual que el 1 | Igual que el 1; lugares y artistas como hoy (no salen: no tienen evento esta semana) |
| 3 · Eventos solo más adelante: Zacatecas | «Más adelante» ya sale con sus tres eventos | **Sin cambios**: ya está cubierto y la ciudad no está vacía |

## La propuesta: qué pieza existente se usa

- **Cuándo:** solo si la ciudad no tiene ningún evento próximo. En código: `vacio` de `useEstadoCarriles` deja de contar `inicio-tus-planes`
  (cuenta solo los carriles de la ciudad).
- **Sin banner de compartir** en esa ciudad; en su sitio (tras el carril estelar, que va colapsado), el llamado. El aviso de vacío de abajo se
  quita: el llamado lo sustituye.
- **El llamado** = el aviso de vacío de las listas (`Lista.module.css` `.vacio`: `h2` «¿Sabes de algo que pase en Querétaro?» y `p` «Aún no hay
  eventos próximos aquí. Publica el primero.») + `ui/Boton` primario como enlace (`claseBoton` por omisión: primario, recta, 48 de alto, a todo
  lo ancho) con `IconoMas` a 20 px y la palabra: **«+ Publicar un evento»**, a `/nuevo/evento?ciudad=queretaro`. El icono y el texto, hijos
  directos del enlace, como en el banner de compartir. Sin sesión, el alta ya redirige a Entrar y vuelve (`siguiente`).
- **Lugar y artista:** en el «+» de la barra, como hoy (lleva al alta de evento y su tira pasa a lugar o artista).
- **Lugares y artistas de la ciudad:** como hoy, sin carril nuevo.
- **Fuera:** el carril de la ciudad más cercana, la tira de tres en Inicio, «seguir ciudad» y la rutina automática.
- **Nuevo: nada.** Es el `Vacio` de hoy con otro texto, un `Boton` existente debajo, y dos condiciones en `Inicio.tsx` (sin banner, el llamado
  arriba). El aviso viejo «Si sabes de uno, publícalo.» ya no hace falta.

## Variante (mi recomendación, una sola)

La misma, con el texto «Aún no hay eventos próximos aquí. Publica el primero, o registra un lugar o a un artista.» y, bajo el botón, el enlace
quieto de `ui/Boton` (`variante="quieto"`: gris, subrayado, 44 de alto) **«Registrar un lugar o a un artista»**, al alta de lugar con la ciudad
puesta (su tira pasa a artista). Por qué: en una ciudad sin agenda lo que más falta suele ser el directorio, y así las otras dos altas no quedan
escondidas en la barra; el botón grande sigue siendo uno solo. Capturas 09, 10 y 12.

## Accesibilidad (comprobada en el marco, `capturas-486/` y `capturar-inicio-vacio.mjs`)

| Qué | Propuesta | Variante |
|---|---|---|
| Nombre accesible | «Publicar un evento» = texto visible; sin `aria-label`; el «+» con `aria-hidden` | Igual; el enlace quieto se llama como se lee |
| Objetivo táctil | 350×48 (≥ 44) | Botón 350×48; enlace quieto 350×44 |
| Contraste del título sobre el gris de Inicio (`#f6f5f1`) | 15,95 : 1 (AA) | Igual |
| Contraste del texto (gris suave) | 6,13 : 1 (AA ≥ 4,5) | Igual; enlace quieto 6,13 : 1 |
| Contraste del texto del botón (blanco sobre `#6d34c8`) | 7,06 : 1 (AA, también AAA) | Igual |
| El botón frente al gris (no texto, ≥ 3) | 6,47 : 1 | Igual |
| Foco visible (Tab de verdad) | Contorno sólido de 2 px separado 2 px, violeta, 6,47 : 1 sobre el gris (el `:focus-visible` de toda la app) | Igual |
| Orden de lectura | h2 → p → «Publicar un evento» | h2 → p → «Publicar un evento» → «Registrar un lugar o a un artista» |

Otra cosa que encontró la prueba: hay **dos enlaces llamados «Publicar un evento»**, el botón y el «+» de la barra (su `aria-label`). Tienen el
mismo nombre y el mismo destino, así que un lector de pantalla no confunde (WCAG 2.4.4); no hace falta cambiarlo.

## Medida y recorrido

- **Medida del llamado** (medir.js en el marco): 5 nodos (div, h2, p, el enlace y su svg; 6 con el enlace quieto), 0 div o span sin clase,
  profundidad de la pantalla 10 como hoy. Sin desbordes. Los únicos toques de menos de 44 son los de Entrar que ya existen (reglas, aviso de
  privacidad).
- **Recorrido con toques reales** (clics de ratón por coordenadas y Tab de verdad): 36 de 36 comprobaciones, sin errores de página. Hoy: sin
  sesión sale «Próximos días»; con sesión no sale y sí Tus planes; Zacatecas ya tiene «Más adelante». Propuesta: solo el llamado, sin banner;
  con sesión, el llamado y Tus planes; Zacatecas no cambia. El botón lleva a `/nuevo/evento?ciudad=queretaro`; sin sesión pasa por Entrar y
  «Mandarme el código» vuelve al alta de evento; la ✕ vuelve a Inicio; con sesión va directo; el «+» de la barra lleva al alta y su tira pasa a
  lugar; en la variante, el enlace quieto va al alta de lugar.

## Idea del founder para Administración (sin pantalla, sin rutina automática)

«Buscar agendas y eventos es señal para abrir ciudad pero la ciudad se abre manual desde admin.» Es decir: en Administración › Ciudades, una
ciudad cuya búsqueda de agendas encuentra eventos es la señal para abrirla, y quien administra la abre a mano. Nada se lanza solo. Tampoco hay
«seguir ciudad»: los avisos siguen saliendo de seguir un lugar o a un artista, como hoy.

## Capturas (`docs/rediseno/capturas-486/`, abiertas una por una)

De hoy (se conservan de la primera vuelta):

- `01-hoy-queretaro-sin-sesion.png`: banner y, debajo, «Próximos días» con el texto gris; el resto, vacío.
- `02-hoy-queretaro-con-sesion.png`: banner y Tus planes de San Luis; sin aviso de vacío.
- `03-hoy-cdmx-sin-sesion.png`: lo mismo que la 01 en Ciudad de México.
- `04-hoy-zacatecas-sin-sesion.png`: banner y «Más adelante» con los tres eventos de la ciudad.
- `05-hoy-zacatecas-con-sesion.png`: banner, Tus planes y «Más adelante».

De la propuesta (nuevas):

- `06-propuesta-queretaro-sin-sesion.png`: sin banner; el título, el texto y el botón violeta a todo lo ancho «+ Publicar un evento»; abajo, vacío.
- `07-propuesta-queretaro-con-sesion.png`: el llamado y debajo Tus planes (Charla de la Cristiada, Taller de linóleo).
- `08-propuesta-cdmx-sin-sesion.png`: el mismo llamado en Ciudad de México.
- `09-variante-queretaro-sin-sesion.png`: el texto con lugar y artista, el botón y debajo «Registrar un lugar o a un artista» subrayado en gris.
- `10-variante-queretaro-con-sesion.png`: la variante con Tus planes debajo.
- `11-propuesta-foco.png`: el botón con el foco del teclado: contorno violeta de 2 px separado del botón.
- `12-variante-foco.png`: lo mismo en la variante, con el enlace quieto debajo.
- `13-recorrido-entrar.png`: «Entra para publicar» tras tocar el botón sin sesión.
- `14-recorrido-alta-evento.png`: el alta de evento («Sube el cartel») tras entrar, con la tira en EVENTO.
- `15-recorrido-barra-alta-lugar.png`: desde el «+» de la barra, el alta de lugar («¿Cómo se llama?») con la tira en LUGAR.
- `16-prototipo-1280.png`: la página del prototipo: selectores (Hoy · Propuesta · Variante), el teléfono y las notas (5 · 10 · 0).

## Preguntas al founder (respondidas: «solo botón. iguala título de carril.»)

1. **¿Propuesta o variante?** Un solo botón «+ Publicar un evento», o el mismo botón con un enlace discreto debajo, «Registrar un lugar o a un
   artista».
2. **El título del llamado** es el del aviso de vacío de las listas (19 px), más chico que el de los carriles (26 px). ¿Se queda así o lo subimos?

## Código (firmado: «solo botón. iguala título de carril.»)

Rama `inicio-vacio`, con `origin/main` unido antes (OPEN_LOOPS resuelto con `resolver_ol.py`, conservando la entrada de OL-453 y todos los
trozos). Solo la propuesta de una acción; nada del enlace de la variante.

- **`src/lib/inicio.ts`**: `ciudadSinEventos(estado)` y `eventosDeCiudadResueltos(estado)`, puras: la ciudad está sin eventos solo si los cuatro
  carriles de eventos (`CARRILES_DE_EVENTOS`) y «Más adelante» dijeron que no tienen nada; un pendiente o un error nunca es vacío. «Tus planes»
  y los carriles de lugares y artistas no cuentan.
- **`inicio/EstadoCarriles.tsx`**: las usa (`vacio`, `resuelto`); `CarrilesDeInicio` ya no necesita `conSesion`.
- **`Inicio.tsx`**: en el sitio del banner (tras el carril estelar), `BannerOLlamado`: mientras no se sabe si hay eventos, nada; con eventos, el
  `BannerCompartir` de siempre; sin ninguno, `PublicarAqui`: el aviso de vacío de las listas (`Lista.module.css` `.vacio`) con su título,
  «¿Sabes de algo que pase en Querétaro?», su texto, «Aún no hay eventos próximos aquí. Publica el primero.», y `ui/Boton` primario como
  enlace con `IconoMas` (oculto al lector, como todo icono) y «Publicar un evento», a `enlaceAltaEvento({ ciudad })`. Sin sesión, el alta ya
  manda a Entrar y vuelve. Se quita el `InicioVacio` viejo del final (y su uso de `Vacio` de `AgendaInicio`, que sigue para Agenda).
- **`Lista.module.css`**: `.vacioInicio h2` con el estilo del título de carril (`--letra-2xl`, interlineado 1,1, como `.destacados h2`; el 700
  y lo condensado ya los da el `h2` de la app). Sin medida suelta.
- Plano: un `div` con clase y tres hijos directos (h2, p, a); dentro del enlace, el svg y el texto. Ningún envoltorio sin clase.
- **Un cambio de tiempo, no de forma:** el banner ya no sale antes de saber si la ciudad tiene eventos (para que en una ciudad vacía no
  aparezca y se vaya). En una ciudad con eventos aparece cuando llega la agenda, a la vez que el carril estelar que tiene encima; su sitio y su
  aspecto no cambian (`npm run medir`: sin novedades, también s28 «inicio-banner-compartir»). Si la agenda fallara, el banner no sale.

### Pruebas

- **Unitarias** (`src/lib/inicio.test.ts`, 3 nuevas): sin eventos aunque haya Tus planes, artistas o lugares; cualquier carril de eventos o «Más
  adelante» con algo la llena; un pendiente o un error nunca es vacío ni está resuelto.
- **Componentes** (`inicio/Inicio.componentes.test.mjs`, 2 nuevas y 2 cambiadas): con Tus planes o artistas sale el llamado y no el banner,
  con el llamado arriba y Tus planes debajo; mientras un carril de eventos no llega no sale ni el banner ni el llamado; al llegar, el texto, el
  enlace «Publicar un evento» (exacto) a `/nuevo/evento?ciudad=puebla` con el «+» `aria-hidden`, h2 → p → a sin nada sin clase, el título a
  26 px, toque ≥ 44, foco con Tab de verdad (contorno sólido de 2 px) y un clic por coordenadas que lleva al alta; con eventos, el banner y
  ningún llamado.
- **La app real** (`capturar-inicio-vacio-codigo.mjs`, compilada contra el respaldo con `RESPALDO_VACIO=1`, clics por coordenadas): 9 de 9.
  Querétaro sin sesión: llamado, sin banner y sin el aviso viejo; título de 26 px, botón de 48, nombre «Publicar un evento», «+» oculto; el
  toque lleva a `/entrar?siguiente=/nuevo/evento?ciudad=queretaro`. Con sesión: el llamado aunque haya Tus planes, sin banner, el llamado arriba
  y Tus planes debajo; el toque lleva al alta de evento con la ciudad («No tengo cartel» en pantalla). San Luis con eventos: el banner y ningún
  llamado.
- **Verificación completa en verde:** `lint` (0 errores; 2 avisos que ya estaban en otros archivos), `typecheck`, `test` (282 archivos, 4 634
  pruebas), `test:db` (2 373 pruebas, PostgreSQL local), `inventario` (sin novedades), `medir` (53 pantallas × 4 anchos, sin novedades),
  `test:componentes` (719 de 719) y `build`.

### Capturas del código (390×844, abiertas)

- `17-codigo-queretaro-sin-sesion.png`: la barra, la fila de Querétaro y, arriba, «¿Sabes de algo que pase en Querétaro?» en dos líneas al
  tamaño de los títulos de carril, el texto gris y el botón violeta a todo lo ancho «+ Publicar un evento»; sin banner; abajo, vacío. Igual que
  la firmada 06/07 con el título más grande.
- `18-codigo-queretaro-con-sesion.png`: lo mismo con la campana y «A» en la barra, y debajo «Tus planes» con sus tarjetas de San Luis, como la
  firmada 07.
- `19-codigo-san-luis-con-eventos.png`: San Luis con eventos como hoy: «Seleccionados para ti» y debajo el banner de compartir; ningún llamado.

## Archivos

- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: Querétaro y Zacatecas con `RESPALDO_VACIO=1` (`npm run medir` no cambia).
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs`: 11 pantallas más (Inicio de las tres ciudades con y sin sesión y de San Luis, las tres altas
  y Entrar) y `--solo=` con varios ids.
- `scripts/ops/auditoria-ui/prototipo/inicio-vacio.mjs` y `inicio-vacio.plantilla.html` (nuevos): arman el prototipo desde las maquetas; las
  clases de la propuesta se buscan en el CSS servido y falla si alguna no existe.
- `scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs` (nuevo): capturas, medida, accesibilidad y recorrido del prototipo.
- `scripts/ops/auditoria-ui/capturar-inicio-vacio-codigo.mjs` (nuevo): la app real contra el respaldo, capturas 17 a 19 y el recorrido.
- Código: `src/lib/inicio.ts`, `src/lib/inicio.test.ts`, `src/components/Inicio.tsx`, `src/components/inicio/EstadoCarriles.tsx`,
  `src/components/inicio/Inicio.componentes.test.mjs`, `src/components/Lista.module.css`.
- `docs/rediseno/prototipos/inicio-vacio.html` (1 MB: el CSS servido y las imágenes de las maquetas, cada una una vez).
- `docs/rediseno/capturas-486/` (19 PNG).

Para rehacerlo:

```
RESPALDO_VACIO=1 node scripts/ops/auditoria-ui/maqueta-pantalla.mjs <carpeta> --solo=inicio,alta-evento,alta-lugar,alta-artista,entrar-alta
node scripts/ops/auditoria-ui/prototipo/inicio-vacio.mjs <carpeta>
node scripts/ops/auditoria-ui/capturar-inicio-vacio.mjs <carpeta-capturas>
node scripts/ops/auditoria-ui/comprimir.mjs docs/rediseno/capturas-486 <carpeta-capturas>/*.png
```
