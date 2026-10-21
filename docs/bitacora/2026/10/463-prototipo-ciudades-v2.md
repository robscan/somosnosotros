# 463 · Prototipo: Administración › Ciudades v2, lista general, panel por ciudad con tarjetas de indicadores y alta de ciudades (OL-431)

**Fecha:** 2026-10-21. **Rama:** `prototipo-ciudades-v2`, base `origin/main` (`c29217df`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Solo prototipo:** nada en `src/**`, sin migración y sin variables de entorno. Toca dos scripts de operación (la maqueta y el armazón
del prototipo) y suma uno de evidencia. **Estado:** listo para la revisión del gestor y la firma del founder. Prototipo:
`docs/rediseno/prototipos/ciudades-v2.html`.

## El pedido (founder, 21 de octubre, textual)

«quisiera ver como puedo agregar ciudades en el admin. Por favor mejora el diseño de ciudades, primero lista general y en sub nivel un panel con
KPI's distintos en cards y las cards pueden tener botones para detonar busquedas». Y el orden de las ciudades: «no sigas abriendo querétaro
quedamos Oaxaca y Ciudad de México primero, luego abres querétaro y guadalajara y los que consideres». Parte de lo que hay en producción
(OL-427, bitácora 460; OL-428, bitácora 461) y de lo firmado en OL-425 (bitácora 458). La decisión 2 de la bitácora 460 («cómo pasa una ciudad a
“abierta”: no hay botón») es lo que el founder pide ahora.

## Sobre la pantalla real

- **`maqueta-pantalla.mjs` guarda cinco pantallas más** con la cuenta de administración del respaldo: `/admin/ciudades` (la lista de hoy, con
  Oaxaca investigando y Querétaro detectada), la misma con la hoja «Buscar lugares en Querétaro» abierta (paso `admin-ciudades-hoja`), la bandeja
  de una corrida, Corridas y la hoja de ciudades de la app (el chip de la ciudad en Artistas, paso `hoja-ciudad`), que es la pieza para elegir
  una ciudad. Agenda y la ficha de lugar se quedan esperando la red (el mapa de Mapbox sin red) y no terminan en este árbol: por eso la hoja de
  ciudades sale de Artistas.
- **`prototipo/meter-maqueta.mjs` acepta `--pantallas=a,b,c`** (por omisión, las cinco de OL-425; `admin-paneles.html` no cambia): de esas diez
  maquetas mete el CSS servido (6 hojas, 230 KB, sin @font-face), 907 clases con su hash, el armazón de la vista «tarea», la barra de Atrás y 82
  iconos de producción.
- **Lo que miré antes de dibujar** (capturas del respaldo, 390×844): la lista de hoy es una tarjeta alta por ciudad (cabecera, cifras en dos
  renglones, última investigación y tres renglones-botón), con «Propuestas 5» arriba; a 390 caben dos ciudades por pantalla. La hoja de «Correr»
  (texto, fuentes, tope con ✕, Cancelar · Correr). La portada y su «Últimos 7 días»: tarjetas de indicador con nombre, número grande, tendencia,
  base y cambio, en dos columnas. La hoja de ciudades de la app: título, nota, tarjeta de renglones con pin, nombre y detalle.
- **El teléfono es un marco** (`iframe`, 390×844) con ese CSS; las pantallas se arman con el marcado y las clases de producción:
  `admin.module.css` (`titulo`, `nota`, `grupo`, `fila`, `total`, `pildora`, `etiqueta` con `etiquetaRol` y `destacada`, `indicadores`,
  `indicador`, `nombreIndicador`, `cambio`, `barraEmbudo`, `enlace`, `puede`), `ciudades.module.css` (`ok`, `fallo`, `linea`, `fuentes`),
  `ui/Renglon` (`tarjeta`, `ajuste`), `ui/Boton` (también `pildora` y `flotante`), `ui/Hoja` (con título, plana y con pie), `ui/Buscador` con su
  ✕, `ui/Campo` con `ui/Limpiar` y la hoja de ciudades (`Ciudad.module.css`: `opciones`, `lista`, `buscando`). Lo propio va en clases `pc-…` dentro
  del marco, solo con tokens del sistema (hasta `--espacio-7`): la línea de números con icono de la fila, la cuarta línea de la fila para la barra,
  la pastilla flotante, las áreas nuevas de la tarjeta (estado de la búsqueda, razón, barra y botón), la rejilla de 1280 y el mapa chico.
  Sin tokens ni medidas nuevas (el mapa es 5:2, como «Dónde» en las fichas).

## Las pantallas

| | Pantalla | Qué lleva |
|---|---|---|
| A | **Lista general** | Una fila por ciudad (la `fila` de admin en una tarjeta): nombre y píldora (Abierta, Detectada); tres números con su icono: consultas en 30 días (ojo), lugares (pin), eventos próximos (calendario); a la derecha, en violeta, las propuestas por revisar y el ›; una tercera línea solo si hay algo que decidir («Buscando agendas y eventos · 3 de 10 meses» con su barra; «Una búsqueda falló y otra llegó al tope» en rojo; «Abierta hoy · 3 búsquedas por correr»). La detectada lleva «Abrir» en vez del ›. Al final, Corridas con el crédito. «Añadir ciudad» flota abajo. Variante: con Oaxaca recién abierta. |
| B | **Hoja «Añadir ciudad»** | La hoja de elegir ciudad de la app con un solo campo («Nombre de la ciudad», con ✕). Sin escribir, propone las detectadas («Aguascalientes · Detectada · 9 consultas en 30 días»). Al escribir, Mapbox sugiere ciudades con su estado y país («Oaxaca de Juárez · Oaxaca, México»); las que ya están llevan su píldora y van a su panel («San» → San Luis Potosí y San Miguel de Allende, «Abierta»). Crece a lo alto como la hoja real (abajo va el teclado). |
| C | **La ciudad elegida** | El mismo campo; el mapa chico (5:2) con el centro y el área de 15 km; tres renglones resueltos: el nombre en la app («Oaxaca», «Oaxaca de Juárez, Oaxaca, México», «Cambiar»), la hora («Hora del centro de México · la misma de San Luis Potosí») y el área («15 km alrededor del centro · cuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán»). El botón: «Abrir Oaxaca». «Cambiar» abre el campo con ✕ y el botón cambia con lo que se escribe; vacío dice «Falta el nombre». Variante: Aguascalientes abierta desde su fila, la hoja ya llena. |
| D | **Panel de Oaxaca recién abierta** | Cabecera con el nombre, la píldora y «Abierta hoy, 9:40 am · con Santa Lucía del Camino y Santa Cruz Xoxocotlán». Lugares, Eventos próximos y Artistas en cero, cada una con su botón; «Buscar lugares» es el único violeta. Consultas («se cuentan desde hoy») y Gasto (0,00 · quedan 197,20 de 200 · Corridas ›). Variantes: la hoja «Buscar lugares en Oaxaca» (la de hoy) y, tras «Correr», Lugares «Pendiente · empieza en unos segundos · tope 3,00 USD» con «Cancelar la búsqueda» y ningún violeta mientras espera. |
| E | **Panel de San Luis** | «Por revisar 17» arriba con «Revisar las 17» en violeta; Lugares 71 con su búsqueda «Terminada · 20 oct · 30 propuestos · 13 rechazados · 0,33 USD»; Eventos próximos 64 «Corriendo · 3 de 10 meses · 0,40 de 3,00 USD» con la barra y sin botón; Artistas 686 «Pendiente · espera a la de agendas · tope 2,00 USD» con «Cancelar la búsqueda»; Consultas 125 con su tendencia («▲ 6 esta semana») y Gasto 0,73. |
| F | **Panel de Ciudad de México** | «Por revisar 40»; Lugares «Llegó al tope» con su razón («Se detuvo en el tope de 1,50 USD: leyó 2 de 3 fuentes y faltó la búsqueda web.») y «Buscar lugares»; Eventos «Falló» con su razón en rojo («Se cortó tres veces seguidas al leer la agenda de Cultura.») y «Buscar agendas y eventos»; Artistas sin correr. Variante: la hoja tras el tope, que empieza con «La vez pasada se detuvo…». |
| 1280 | **Panel en escritorio** | La barra de la app y el carril; el panel en la columna ancha (960) y las tarjetas en rejilla de tres: «Por revisar» a lo ancho, las tres búsquedas en fila, Consultas (dos columnas) y Gasto. La lista a 1280 se queda en la columna de 600, con la pastilla al final de la fila. |

## Decisiones para la firma (en frases llanas)

1. **Dos niveles.** La lista dice en qué ciudad entrar; el panel de cada ciudad dice cómo va y corre sus búsquedas. Los tres botones salen de la
   lista y viven en el panel, cada uno en la tarjeta del número que alimenta.
2. **Una fila por ciudad con tres números y su icono** (consultas, lugares, eventos próximos), los mismos iconos que las tarjetas del panel.
   Artistas se queda en el panel: cuatro números con palabras no caben a 390 y los artistas se mueven entre ciudades.
3. **«Propuestas N» entra en las filas:** el número violeta de la derecha son las propuestas por revisar de esa ciudad; en el panel, la tarjeta
   «Por revisar» lleva a la bandeja. Una ciudad, un solo sitio. La portada conserva su renglón en «Pendiente» (lo firmado), directo a la bandeja.
4. **Orden:** primero lo que tiene algo por decidir (propuestas por revisar; una búsqueda que corre, espera, falló o llegó al tope; o recién
   abierta con todo por correr), luego las detectadas, luego el resto; dentro, por consultas. La tercera línea de la fila lo dice en una frase.
5. **«Añadir ciudad» es la pastilla flotante de abajo:** el pulgar llega y no empuja la lista. La hoja es la de elegir ciudad de la app: sin
   escribir ya propone las detectadas; al escribir, Mapbox sugiere ciudades con su estado y país; las que ya están llevan a su panel.
6. **Al elegir, el sistema resuelve todo** (centro, área de 15 km, hora y municipios que cuentan con ella) y la persona solo confirma; el botón dice
   qué hace: «Abrir Oaxaca». Una detectada se abre desde su fila con «Abrir» y la misma hoja, ya llena.
7. **Al abrir, el panel de la ciudad:** el siguiente paso («Buscar lugares») ya está ahí. Atrás vuelve a la lista con la ciudad arriba.
8. **Las tarjetas son las de «Últimos 7 días»** de la portada y, bajo una raya, la búsqueda que las alimenta: su estado con la píldora de Corridas
   y su botón. En cero, solo el número y el botón.
9. **Orden de las tarjetas:** «Por revisar» primero (lo que espera tu decisión, como «Pendiente»); luego Lugares, Eventos próximos y Artistas en el
   orden del founder; al final Consultas y Gasto, que se leen y no se tocan, juntas en una fila.
10. **Un solo botón violeta por pantalla, el siguiente paso:** «Revisar» si hay propuestas; si una búsqueda espera o corre, ninguno; si no, la
    primera búsqueda que falta o que no terminó, en el orden lugares → agendas → artistas.
11. **Los cinco estados en la tarjeta:** Pendiente (con «Cancelar la búsqueda»), Corriendo (barra y gasto, sin botón: no se corre dos veces),
    Terminada, Llegó al tope y Falló (estas dos con su razón en una frase y su botón para volver a correr; la hoja lo recuerda arriba).
12. **«Consultas», no «Personas que consultan»:** la tabla cuenta visitas a Inicio y Lugares sin guardar a nadie; no sabe cuántas personas son.
13. **En escritorio el panel usa la columna ancha** (960, como las fichas) con la rejilla de tres; la lista se queda en la de 600.

## En duda (para el founder)

- **El nombre:** Mapbox llama «Oaxaca de Juárez» a la ciudad; propongo «Oaxaca», como la busca la gente, y que el de Mapbox cuente igual (alias).
  Se cambia en la hoja. ¿O el de Mapbox tal cual?
- **El área y los municipios:** lo que cae a 15 km del centro cuenta con la ciudad (Santa Lucía del Camino y Xoxocotlán con Oaxaca, como Soledad
  con San Luis). ¿Se enseña en el alta o se resuelve sin decirlo?
- **«Investigando»** deja de hacer falta: una ciudad se abre o no, y lo que corre ya se ve en su fila con la barra. ¿Se queda solo para una
  detectada que se investiga sin abrirla (lo que hoy hace el disparador de la base)?
- **Agendas y artistas sin rutina:** hasta OL-429 y OL-430 esos botones fallan al correr («Este botón todavía no tiene rutina»). Con «nada
  apagado ni pronto», ¿se esconden hasta que existan?
- **Tras «Llegó al tope»,** ¿la siguiente búsqueda sigue donde se quedó (la búsqueda web que faltó) o empieza otra vez?
- **¿Una detectada se puede descartar** para que deje de salir, o se queda hasta que se abra?
- **«Revisar»** lleva a la bandeja de una búsqueda, como hoy. Si una ciudad junta propuestas de dos búsquedas, ¿una bandeja por ciudad?

## Diferencias con lo firmado en OL-425 (bitácora 458) y lo que hay en producción

- **La lista deja de llevar los botones.** Lo firmado era una tarjeta por ciudad con sus tres renglones-botón; el founder pidió ahora «primero lista
  general y en sub nivel un panel». Cada ciudad pasa a una fila de tres líneas y los botones al panel.
- **«Propuestas N» ya no es un grupo arriba de Ciudades:** es el número de cada fila y la primera tarjeta del panel. Se conserva lo firmado de que
  las propuestas suben a «Pendiente» de la portada.
- **El orden firmado («las ciudades con algo por decidir primero») se queda** y se amplía: una búsqueda que falló o llegó al tope y una ciudad
  recién abierta también cuentan como algo por decidir.
- **Los botones son botones de texto dentro de las tarjetas,** no renglones, porque el founder lo pidió así («las cards pueden tener botones»). La
  hoja de «Correr» es la de hoy; solo suma la línea «La vez pasada…» cuando la anterior falló o llegó al tope.
- **«Falló» dice su razón en pantalla** (la bitácora 461, decisión 13, lo dejaba para otra pieza): el encargo lo pide en la tarjeta, en una frase.
- **El panel en escritorio usa la columna ancha** aunque Administración es una «tarea» (columna de 600): un tablero de tarjetas necesita las tres
  columnas, como las fichas.
- **Dos piezas nuevas en Administración:** la pastilla flotante (la de las fichas, `Boton` `pildora` `flotante`) y los números con icono en la fila.

## Medidas (medir.js dentro del marco; 390×844, la lista y el panel también a 1280)

| Estado | Nodos | Prof. | Desbordes | Toques < 44 |
|---|---|---|---|---|
| A lista · con Oaxaca | 84 · 99 | 9 | 0 | 0 |
| B sin escribir · «Oaxaca» · «San» | 101 · 117 · 124 | 9 | 0 | 1 · 0 · 0 |
| C Oaxaca · cambiando el nombre · Aguascalientes | 117 · 119 · 117 | 9 · 10 · 9 | 0 | 0 |
| D panel · hoja · pendiente | 46 · 72 · 49 | 8 | 0 | 0 |
| E San Luis | 68 | 8 | 0 | 0 |
| F Ciudad de México · hoja | 63 · 91 | 8 | 0 | 0 |
| 1280: San Luis · Ciudad de México · lista | 102 · 97 · 118 | 8 · 8 · 9 | 0 | 0 |

Ciudades de hoy mide 149 nodos y profundidad 8 (`npm run medir`, s32). El toque de B es el `input` del buscador de la hoja (290×42): es el de
`ui/Buscador` en la hoja de ciudades de producción, igual; la etiqueta entera (44) se toca. Ningún margen negativo.

## Verificación

- Chrome real (playwright-core, el de la Mac), `scripts/ops/auditoria-ui/capturar-ciudades-v2.mjs`: 21 estados capturados y medidos, sin errores
  ni avisos de consola. **Recorrido con toques reales, 32 de 32** (clics de ratón por coordenadas dentro del marco, que fallan si algo tapa el
  botón, y teclas reales): abrir la hoja, las detectadas sin escribir, escribir «Oaxaca» sin perder el foco, la ✕ que vacía y deja el foco, elegir,
  el mapa y la hora, «Cambiar» el nombre con su ✕ («Falta el nombre» sin poder tocarse), «Abrir Oaxaca» al panel con un solo violeta, la hoja de
  «Buscar lugares» con la ✕ del tope y «Correr» con 2,50 (pendiente, sin violeta), cancelar, Atrás a la lista con Oaxaca y su frase, el orden de
  la lista, «Abrir» Aguascalientes desde su fila y su panel, «San» con San Luis primero y su panel, cancelar la de artistas de San Luis,
  «Revisar» (la etiqueta dice que abre la bandeja de hoy), Escape cierra la hoja, la hoja de Ciudad de México tras el tope y, a 390, la página
  sin desplazamiento horizontal y «Notas» que sube la hoja.
- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). Nada en `src/`; `next build` de la maqueta no cambió ningún
  archivo del árbol.

## Capturas (`docs/rediseno/capturas-463/`, Chrome real, 390×844 a 2×; las 17 y 18 a 1280×800; comprimidas con `comprimir.mjs` salvo la 00)

- `00-pagina-entera.png`: el prototipo a 1440 con el selector A–F, el teléfono en San Luis y las notas (medidor 68 nodos, profundidad 8, 28 con
  clase `pc-`; «Esta pantalla» y el comienzo de «Decisiones para la firma»). Va sin comprimir: la paleta apagaba el verde de las píldoras.
- `01-A-lista.png`: San Luis (125 · 71 · 64, 17 en violeta, «Buscando agendas y eventos · 3 de 10 meses» con la barra), Ciudad de México (12 · 0 ·
  3, 40, «Una búsqueda falló y otra llegó al tope» en rojo), Aguascalientes (Detectada, 9 · 1 · 0, «Abrir»), San Miguel de Allende (31 · 43 · 5) y
  Corridas («Crédito: 197,20 USD · vence el 11 de noviembre»); «+ Añadir ciudad» abajo.
- `02-B-anadir-detectadas.png`: la hoja sobre la lista con el campo vacío y Aguascalientes («Detectada · 9 consultas en 30 días · Aguascalientes,
  México»).
- `03-B-anadir-oaxaca.png`: «Oaxaca» con su ✕ y cuatro sugerencias con «Oaxaca, México»: Oaxaca de Juárez, Santa Lucía del Camino, Juchitán de
  Zaragoza y Salina Cruz; la hoja a lo alto.
- `04-B-anadir-san.png`: «San»: San Luis Potosí y San Miguel de Allende con «Abierta», San Cristóbal de las Casas, San Juan del Río y Santa Lucía
  del Camino.
- `05-C-elegida-oaxaca.png`: el mapa con el pin y el círculo punteado; Oaxaca (Oaxaca de Juárez, Oaxaca, México) con «Cambiar», la hora y los 15 km
  con Santa Lucía del Camino y Santa Cruz Xoxocotlán; «Abrir Oaxaca».
- `06-C-cambiando-nombre.png`: el campo «Nombre en la app» con «Oaxaca» y su ✕, la ayuda «Mapbox la llama «Oaxaca de Juárez»; ese nombre cuenta
  igual.» y «Abrir Oaxaca».
- `07-C-aguascalientes.png`: la hoja ya llena desde la fila: Aguascalientes (Aguascalientes, México), la hora, «Cuenta también Jesús María» y
  «Abrir Aguascalientes».
- `08-A-con-oaxaca.png`: la lista con Oaxaca tercera («Abierta hoy · 3 búsquedas por correr»), antes de Aguascalientes y San Miguel.
- `09-D-oaxaca.png`: el panel recién abierto: Lugares 0 con «Buscar lugares» en violeta, Eventos próximos 0 y Artistas 0 con sus botones,
  Consultas 0 («se cuentan desde hoy») y Gasto 0,00 con «Quedan 197,20 de 200» y «Corridas ›».
- `10-D-hoja-buscar-lugares.png`: «Buscar lugares en Oaxaca»: qué hace, las tres fuentes en orden, el tope 3,00 con su ✕, lo estimado y el crédito;
  Cancelar · Correr.
- `11-D-pendiente.png`: tras «Correr», Lugares «Pendiente · Empieza en unos segundos · tope 3,00 USD» con «Cancelar la búsqueda»; los otros dos
  botones en blanco.
- `12-E-san-luis.png`: «Por revisar 17» con «Revisar las 17», Lugares 71 «Terminada» con «Buscar lugares» y Eventos próximos 64 «Corriendo» con la
  barra.
- `13-E-san-luis-abajo.png`: Eventos corriendo, Artistas 686 «Pendiente · Espera a la de agendas · tope 2,00 USD» con «Cancelar la búsqueda»,
  Consultas 125 con su tendencia y «▲ 6 esta semana», y Gasto 0,73.
- `14-F-cdmx.png`: «Por revisar 40», Lugares 0 «Llegó al tope» con su razón y Eventos próximos 3 «Falló» con su razón en rojo.
- `15-F-cdmx-abajo.png`: Artistas 1 («1 por su cuenta») con «Buscar artistas», Consultas 12 («desde hoy, que se abrió») y Gasto 1,71.
- `16-F-hoja-tras-tope.png`: «Buscar lugares en Ciudad de México» que empieza con «La vez pasada se detuvo en el tope de 1,50 USD…».
- `17-E-san-luis-1280.png`: el panel a 1280: «Por revisar» a lo ancho, Lugares, Eventos y Artistas en fila, Consultas a dos columnas con su
  tendencia y Gasto.
- `18-A-lista-1280.png`: la lista a 1280 en la columna de 600, con «Añadir ciudad» al final de la fila.

## Datos

**Reales** (bitácora 461, registro 55 del gestor y el encargo): San Luis, 125 consultas y su búsqueda de lugares del 20 oct (30 propuestas, 13
rechazadas, 17 por revisar, 0,33 USD); San Miguel, 43 lugares tras aceptar las 40 de su búsqueda del 20 oct (0,36 USD; quedan 41 para la
siguiente); Oaxaca y Ciudad de México, abiertas hoy; Aguascalientes, detectada por consultas; el crédito de 200 USD que vence el 11 de noviembre;
los 520 artistas del CAPO. **Inventado y coherente:** lugares, eventos y la tendencia de San Luis; las consultas de las otras ciudades; las
búsquedas de Ciudad de México y la de agendas de San Luis (como se verán cuando existan las rutinas de agendas y artistas). Las sugerencias de
Mapbox son nombres reales de municipios, escritos a mano. Querétaro y Guadalajara solo salen como sugerencias: no se abren aquí.

## Lo que no se hizo

- Código, migración y el cambio de estado de la tabla `ciudades` al abrir: son la pieza siguiente, con la firma.
- La bandeja y Corridas no cambian; en el prototipo, «Revisar» y «Corridas ›» solo dicen a dónde llevan (las de hoy).
- Cerrar o descartar una ciudad, editar sus municipios y mover el centro tocando el mapa: quedan en «En duda».
- El teclado no se simuló: la hoja es `ui/Hoja` de producción, que ya cumple el canon (el campo y el pie sobre el teclado).
