# 542 · OL-509 · «Buscar agendas»: contar por trozo y reintentar, dos fuentes de San Luis sin la API, apagar fuentes por ciudad y carteles gratis antes de pagar

**Fecha:** 2026-11-04. **Rama:** `agendas-fuentes-gratis` (desde `origin/main` `bcf21df0`). **Quién:** operador del Gestor de cambios VIII, tras el «Adelante con OL-509» del founder. **Sin migración.**

## Por qué
La revisión de la corrida de San Luis del 2 de noviembre encontró que la rutina leyó bien lo que leyó (87 % de precisión), pero: se saltó el trozo del 3 al 8 del PDF mensual (31 eventos) con `errores` 0 y sin aviso; dio por vacía la página `/eventos/` de Cultura (traía 7 eventos con cartel); gastó 0,08 USD en «universidades y museos» por cero eventos; la búsqueda web costó 0,039 USD por evento (9 veces el PDF), y «Buscar carteles» pagó 0,5–0,8 USD por cartel cuando 14 de 15 estaban en sitios que se leen gratis. Esta pieza lleva a la rutina las reglas que le faltaban de las diez con que se puso al día la agenda el 4 de noviembre.

## Qué cambió

### 1. Cada trozo contado y el vacío reintentado (`agendas.ts`)
- `resumen.trozos`: una entrada por cada tarea `leer` ejecutada con la API (las cortadas por tiempo no: se parten y cuentan sus mitades). Contrato:
  ```
  trozos: Array<{ fuente: string;      // el archivo del PDF («nov_2026.pdf») o el dominio de la página
                  desde: "AAAA-MM-DD"; hasta: "AAAA-MM-DD";
                  parte?: number;       // la parte de un listado HTML largo
                  leidos: number;       // los eventos que entregó la API
                  propuestos: number;   // las propuestas nuevas que salieron de ese trozo
                  reintentado?: true }> // es la segunda lectura del mismo trozo
  trozos_vacios: number                 // trozos de un PDF del mes vacíos dos veces
  ```
  Los últimos 60; sin nombres de eventos (el archivo del PDF sí: es la fuente).
- Un trozo de un PDF **del mes** (`fuente.mes`) que vuelve con cero eventos sin error ni corte se pide otra vez, una sola, como tarea al frente de la fila, con la línea «La lectura anterior de estas mismas fechas no entregó ningún evento: revisa con cuidado todo el PDF, también sus páginas finales («Varios», «Talleres», «Exposiciones»)». Si vuelve vacío: aviso «Trozo sin eventos: nov_2026.pdf del 2026-11-04 al 2026-11-10» y `trozos_vacios` + 1.
- El encargo de todo PDF dice ahora: «Las páginas finales del PDF que agrupan por tipo («Talleres», «Exposiciones», «Varios») también valen: saca de ellas lo que caiga en estas fechas» (en noviembre seis eventos se perdieron por venir ahí).
- Corridas (la línea de cada corrida, `detalleCorrida`) añade «1 trozo sin eventos» cuando los hay. Captura `02-corridas-trozo-sin-eventos.png`.

### 2. El catálogo de Cultura sin la API (`catalogoCultura.ts`, tipo `catalogo`)
- No es Squarespace sino Django: `?format=json` devuelve el mismo HTML, así que se lee la lista (`/eventos/`, `?page=2`… mientras la página enlace a la siguiente) y cada ficha (`og:title`, `og:image` en cloudfront, la categoría, el lugar del enlace a `/lugares/`, dirección y municipio del enlace al mapa, la fecha bajo el título y el texto). Una petición cada 1,5 s con el cliente de la cartelera; lo que no cabe sigue en `cursor.libre`.
- Filas: un día con hora → una fila; una exposición con periodo y hora → una fila con `termina`; un periodo con hora (un ciclo de cine) → una fila por día de hoy en adelante (la rutina las junta en una propuesta con sesiones); sin hora → `sin_hora` (la hora del texto solo vale si es de un día); una ficha que junta lo de otro («Cartelera de la Cineteca Alameda») no se propone. Clase: talleres → taller; exposiciones → exposición; lo demás puntual (la inauguración de un día la decide la rutina por el título).
- Todo pasa por `proponer` con la ficha como `url` y `datos.ficha_fuente`, su `og:image` como `imagen` (cartel al aceptar) y la fuente «Catálogo de eventos de la Secretaría de Cultura de San Luis Potosí». Lo propuesto antes desde una ficha no se vuelve a pedir.

### 3. Turismo del estado por la API de «The Events Calendar» (`eventosTribe.ts`, tipo `tribe`)
- Lector genérico de `wp-json/tribe/events/v1/events?start_date&end_date&per_page=50&page=N` (con `total_pages`): otra ciudad solo guarda la URL base con tipo `tribe`.
- La hora: `start_date` va en hora local aunque `timezone` diga «UTC+0» (Enjambre a las 21:00 en el Teatro del Pueblo y El Cascanueces a las 20:30 en el Teatro de la Paz son horas de función; `utc_start_date` repite la misma cifra, así que el sitio no guarda UTC de verdad).
- `all_day` → `sin_hora`; imagen `image.url` (WebP casi siempre: `imagenAdmitida` acepta WebP y `prepararCartel` lo convierte a JPEG al aceptar); descripción sin HTML y limpia; `venue.city` como municipio (la Fiesta del Huapango en San Ciro de Acosta queda `fuera_de_la_ciudad` por el camino de siempre).
- Solo lo cultural. Categorías del sitio el 4 de noviembre: `concierto` (122), `congresos-convenciones-y-exposiciones` (8), `culturales` (49), `deportivos` (24), `ferias-y-festivales` (91), `religiosos` (8), `teatro` (30). Fuera, si solo trae categorías que casan con `deport|carrera|maraton|civic|congreso|convencion|negocio|empresarial|comercial|expo-venta` («Corre x tu marca», deportivos). Lo dudoso entra (sin categoría, `religiosos`, `ferias-y-festivales`): decide la bandeja.
- Semilla con clave `guias` y nombre «Eventos de Turismo de San Luis Potosí». Las guardadas con clave `guias` ahora se leen (antes solo las guías de los parámetros).

### 4. Lo guardado en producción se convierte (aviso del gestor)
En producción `agendas_san_luis_potosi` tiene `https://cultura.slp.gob.mx/eventos/` como `html` de `universidades-museos` y `https://eventos.visitasanluispotosi.com/` como `html` de `web`. `completarConSemillas` (en el primer paso de cada corrida, no solo la primera vez) añade la semilla que falte y convierte la guardada de otra forma: el catálogo por su página `/eventos/` del mismo sitio, Turismo por su dominio; queda con el tipo, la clave, la URL (la base de la API) y el nombre de la semilla. La portada `cultura.slp.gob.mx/`, eticket.mx y thehypeslp.mx se quedan como estaban (`web`). Sin esto, al apagar `universidades-museos` y `web` se perderían las dos. Prueba: «lo de producción se convierte…» en `agendasLibres.test.ts`.

### 5. Apagar fuentes por ciudad
`ciudades.parametros.fuentes_fuera: string[]` (`leerFuentesFuera` en `src/lib/fuentesFuera.ts`, sin imports para que lo lean la rutina y la hoja sin un ciclo `ciudadesAdmin` ↔ `propuestas`). En el primer paso, lo apagado se salta con «Fuente apagada para esta ciudad: Universidades y museos» (también `guias`). La hoja de «Buscar agendas y eventos» lo muestra sin la marca, en gris, con «· apagada para esta ciudad» (captura `01-hoja-agendas-fuentes-apagadas.png`). **No se escribió el valor de San Luis.** El JSON exacto para el SQL del gestor:
```json
{ "fuentes_fuera": ["universidades-museos", "web"] }
```
p. ej. `update ciudades set parametros = parametros || '{"fuentes_fuera": ["universidades-museos", "web"]}'::jsonb where slug = 'san-luis-potosi';` (hoy `parametros` de San Luis es `{}`).

### 6. Carteles gratis antes de pagar (`carteles.ts`, `imagenWeb.ts`)
Entre el primer paso y la primera llamada pagada, pasos sin la API leen la página de cada evento sin cartel con `enlace` (`bajarPagina`: solo esa dirección, https pública, redirecciones solo dentro del mismo sitio, HTML, topes), toman su `og:image` (o `twitter:image`) y, si `bajarImagen` la acepta (JPEG/PNG/WebP) y mide 600 px de ancho o más (`ANCHO_MINIMO_CARTEL`, `anchoDeImagen`), la proponen como `cartel` con costo 0, fuente «Página del evento» y `datos.gratis: true`. No se acepta sola. Solo lo que sigue sin propuesta va a las llamadas pagadas; `resumen.gratis` cuenta lo que salió sin la API.

### 7. Descripciones limpias
`limpiarDescripcion` (en `candidatos.ts`, junto a `textoLimpio`) quita correos, direcciones web sueltas, teléfonos de 10 dígitos (con o sin separadores, paréntesis o +52) y las frases «informes / reservaciones / boletos / inscripciones / llama al … / en … / : …» hasta el punto; se aplica en `proponer` a toda descripción (API, cartelera, catálogo, tribe). Pruebas con los dos casos del 2 de noviembre («…incluye pincel; inscripciones al 444 …» y «…Compañía UNA; boletos al 444 …», con el número cambiado: el repositorio es público).

## Lo que cuesta cada fuente en San Luis ahora
| Fuente | Antes (2 nov) | Ahora |
|---|---|---|
| Índice de la Agenda Cultural | 0 | 0 |
| PDF del mes (API, por trozos) | ≈ 0,007 USD por evento | igual, más un reintento por trozo vacío (a precio de caché: el PDF va con `cache_control`) |
| Catálogo de Cultura `/eventos/` | con la API, y 0 eventos (la lectura web lo dio por vacío) | 0 USD (servidor) |
| Turismo (eventos.visitasanluispotosi.com) | dentro de la búsqueda web | 0 USD (API pública) |
| Universidades y museos | 0,08 USD por 0 eventos | 0 cuando el gestor ponga `fuentes_fuera` |
| Búsqueda web | 0,039 USD por evento | 0 cuando el gestor ponga `fuentes_fuera` |
| Carteles | 0,5–0,8 USD cada uno | 0 los que salen del `og:image`; el resto como antes |

## Comprobaciones
- `npm run lint`: 0 errores (2 avisos de antes, ajenos: `capturar-inicio-vacio.mjs` y `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: verde.
- `npm test`: 327 archivos, 5200 pruebas en verde. Nuevas: `agendasLibres.test.ts` (9: lista y ficha del catálogo, una página tribe con un evento cultural con hora, uno de deportes y uno sin hora, la conversión de lo guardado en producción, la corrida de San Luis con `fuentes_fuera` y las dos fuentes gratis de punta a punta, la corrida siguiente sin volver a pedir fichas, la hoja y Corridas, el reintento del trozo vacío una vez y solo una), `limpiarDescripcion.test.ts` (3), «carteles gratis antes de pagar» en `carteles.test.ts` (og:image aceptada, rechazada por tamaño y página sin og:image), `fuentes_fuera` en `ciudadParametros.test.ts`. Ajustadas: `agendas.test.ts` (las semillas nuevas se piden, «4 de 4 fuentes», lo guardado con el catálogo y Turismo; la comprobación «sin nombres» deja fuera `trozos`, que nombra el archivo «Programa_Xantolo_2026.pdf»), `agendasFormas.test.ts` (lo mismo), `carteles.test.ts` (el paso gratis antes del primero pagado), `ciudadesAdmin.test.ts` (`fuentesFuera`).
- `npm run inventario`: sin novedades. `npm run medir`: 63 pantallas × 4 anchos, sin novedades.
- Capturas (`docs/rediseno/capturas-542/`, 390×844 a 2×, Chrome real contra el respaldo local, sin errores de página; guion `scripts/ops/auditoria-ui/capturar-fuentes-apagadas.mjs`):
  - `01-hoja-agendas-fuentes-apagadas.png`: la hoja de «Buscar agendas y eventos en San Luis Potosí»: «Agenda de la Secretaría de Cultura del estado y del municipio» con su marca violeta; «Universidades y museos · apagada para esta ciudad» y «Búsqueda web: «agenda cultural San Luis Potosí» · apagada para esta ciudad» en gris y sin marca; el tope y «Correr» como siempre.
  - `02-corridas-trozo-sin-eventos.png`: Corridas con la corrida de agendas de San Luis «Hoy, 9:31 am · 3 fuentes · 0 propuestos · 1 trozo sin eventos · 0,42 USD».

## Prueba real de solo lectura (4 de noviembre, `npx tsx scripts/ops/prueba-agendas-gratis.ts 2026-11-04`)
Sin `.env`, sin base, sin la API; 17 peticiones con la calma. Del 2026-11-04 al 2026-12-19:
- **Catálogo de Cultura:** 14 fichas (13 en la página 1 y 1 en la 2), las 14 leídas; 8 con día y hora dentro de los 45 días (14 funciones: la proyección de Naza son 7 días), las 8 con cartel (`og:image`); 5 sin hora (exposiciones y periodos sin hora: «Greta de la Cineteca», «Espacio: La nueva frontera», la Casa del Terror, la de los Scouts, la inauguración de «Anatomía del montruo» (así en el sitio)) y 1 listado («Cartelera de la Cineteca Alameda»). Ejemplos para cruzar:
  - Proyección del documental Naza — 2026-11-05 18:00 — Cineteca Alameda San Luis Potosí
  - Otaku Potosino 2026 — 2026-11-07 17:00 — Teatro de la Paz
  - Aires revolucionarios — 2026-11-07 19:30 — Centro de Difusión Cultural Raúl Gamboa
- **Turismo (The Events Calendar):** 8 eventos en una página; 7 culturales con hora y con imagen, 1 fuera por deportes («Corre x tu marca»). Categorías: concierto 4, teatro 2, culturales 1, ferias-y-festivales 1, deportivos 1, sin categoría 1. Ejemplos:
  - La Fiesta del Huapango — 2026-11-13 17:00 — San Ciro de Acosta (queda fuera de la ciudad al proponer)
  - Enjambre — 2026-11-13 21:00 — Teatro Parque Tamgamanga I (San Luis Potosí)
  - El Extraño Mundo de Jack, Sinfónico — 2026-11-20 19:00 — Teatro de la Paz (San Luis Potosí)

## Pendientes
- El SQL de `fuentes_fuera` en San Luis (gestor) y, en la primera corrida después de unir, ver en `configuracion` la conversión del catálogo y de Turismo.
- Rasterizar páginas del PDF para sacar carteles gratis: no entra (no hay pdf→imagen en el servidor).
- `resumen.libres` y `resumen.trozos` solo se ven en el resumen guardado (la administración muestra los trozos vacíos en Corridas y los avisos); si el gestor quiere un informe por trozo en pantalla, es otra pieza.

## Desviaciones
- `?format=json` no se usa: el sitio de Cultura no es Squarespace (es Django) y devuelve el mismo HTML.
- Un periodo con hora del catálogo (Naza, del 5 al 11 a las 18:00) se propone como una fila por día, igual que la cartelera de Ciudad de México; la rutina las junta en UNA propuesta con sesiones. La ficha no da las funciones exactas por día (el texto dice 16:30, 18:00 y 19:30 el 5; 17:30 y 19:00 el 6): la administración lo ve en la bandeja.
- `ParametrosCiudad.fuentes_fuera` quedó opcional en el tipo (lo lee siempre `leerParametrosCiudad`) para no tocar las pruebas que arman parámetros a mano.
- El cliente con la calma es el de la cartelera (`clienteCartelera().traer`), con su User-Agent «somosnosotrxs.org (lector de cartelera…)».
- `limpiarDescripcion` corta la frase de contacto hasta el punto: en «Boletos: https://… También en taquilla.» se va también «También en taquilla».
- Captura de pantalla adicional (no la pedía el encargo) por la regla del proyecto de evidencia móvil en todo cambio de pantalla.

## Preguntas
1. ¿`religiosos` y `ferias-y-festivales` de Turismo entran como dudosos (hoy sí) o se quieren fuera por slug como los deportes?
2. ¿La portada `cultura.slp.gob.mx/` guardada como `web` se borra de lo guardado al apagar `web`, o se deja por si se vuelve a encender?
