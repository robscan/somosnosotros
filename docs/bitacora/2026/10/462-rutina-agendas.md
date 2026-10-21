# 462 · «Buscar agendas y eventos» con la API, publicación de los eventos aceptados y la cadena de pasos que se corta (OL-429)

**Fecha:** 2026-10-21. **Rama:** `rutina-agendas`, desde `origin/main` (`c29217df`). **Operador:** agente de la pieza (Claude) para el Gestor VII,
sin otros agentes. **Migración:** `20261021120000_ciudades_parametros.sql` (solo añade `ciudades.parametros`, pedida por el gestor a media
pieza). **Variables de entorno:** ninguna nueva. **Estado:** lista para la revisión del gestor; la primera corrida real la hace el gestor.

## El pedido

El founder: «Me fallaron la solicitud de búsqueda de eventos y artistas en la app» (los botones existían y quedaban «Falló · Este botón todavía
no tiene rutina»). Esta pieza hace el de **agendas y eventos**; el de artistas es OL-430. El encargo del Gestor VII, en cinco partes: la rutina
«Buscar agendas y eventos» en el motor de OL-428; publicar el evento que la administración acepta en la bandeja; encontrar y arreglar por qué
la cadena de pasos de San Luis se quedó parada la noche del 20; una red de seguridad que no espere al cron diario; y dos limpiezas de la rutina
de lugares (etiquetas HTML en nombres del SIC y «Dirección:,» en direcciones).

Dos precisiones del founder llegaron a media pieza por el gestor (21 de octubre, textuales):

- «Para ciudad de México enfoquemos en zonas más turísticas y partamos de guías culturales que ya existen, no vamos por todas las delegaciones,
  si no por las que tienen más oferta.» → parámetros por ciudad (`alcaldias`, `guias`, `radio_km`) en una columna nueva, leídos por las dos
  rutinas; las guías son la primera fuente.
- «que revise las agendas de gobierno y otras conocidas primero» → el orden obligatorio de las fuentes de agendas: gobierno, conocidas
  (guías, universidades y museos), búsqueda web al final.

## La cadena de pasos que se corta

**Lo que pasó.** La corrida de lugares de San Luis creada desde la hoja a las 21:12 corrió su primer paso (el SIC) y se quedó `corriendo` con
`paso = "2 de 3 fuentes"`, `turno 1`, `ocupada_hasta` nulo e `intentos 0`, siete minutos sin pasos, hasta que el gestor pidió uno a mano.

**Lo que se descartó, con prueba.** La lógica del motor no pierde corridas: una simulación con el motor real y la base en memoria (San Miguel
corriendo, las tres corridas de San Luis pendientes —lugares, agendas y artistas, como las creó el founder—, varias peticiones a la vez y en
órdenes al azar) terminó bien en 600 de 600 órdenes; en la suite queda una versión corta (40 órdenes, `cadena.test.ts`). Cada paso que toma
una corrida pide exactamente uno más, y una petición que no encuentra nada solo se apaga cuando todo lo que queda está ocupado por otro paso
que, al terminar, pedirá el suyo. `after()` de Next 16 espera las tareas (las corre al cerrar la respuesta y las sostiene con `waitUntil`);
el `fetch` encadenado se espera dentro de la tarea; la ruta encadena siempre que el paso tomó una corrida, también si terminó por tiempo;
`origenPropio` en producción devuelve siempre `https://somosnosotros.org`; y la siguiente llamada nunca ve su corrida «ocupada», porque el paso
la suelta (`ocupada_hasta` nulo) antes de pedir el siguiente.

**La causa.** La cadena es un solo hilo sin comprobación: cada paso pedía el siguiente **una sola vez** (`dispararPaso`, 10 s, sin
reintento) y, si esa petición se perdía, `dispararPaso` devolvía «falló» sin dejar rastro en el registro, la ruta lo ignoraba y nadie la
volvía a pedir hasta el cron del día siguiente. Esa noche la pérdida coincidió con la puesta en producción de #546 (unido a las 21:09:07; las
corridas de San Luis se crearon a las 21:12): una petición que llega mientras el dominio cambia de despliegue, o una función nueva que tarda
en arrancar, es justo la que se pierde. Desde aquí no se ve el registro de Vercel de esa noche para saber cuál de las dos fue; la prueba
reproduce el estado exacto que vio el gestor perdiendo esa petición (`cadena.test.ts`, «reproduce lo de San Luis»).

**El arreglo** (los dos con prueba en `cadena.test.ts`, de punta a punta: la red falsa entrega cada POST a la ruta real con el motor real):

1. **Reintento y rastro** (`src/lib/rutinas/disparar.ts`): hasta tres intentos (8 s cada uno, pausas de 1 y 3 s) dentro del tiempo que le
   queda a la función (la ruta le pasa `hasta`, para no pasarse de su `maxDuration`); un 401 no se reintenta (el secreto no cambia); la
   respuesta se cierra sin leerla; si no se logra, una línea en el registro con el motivo («rutinas: no se pudo pedir el paso (respondió 404);
   lo retoma Ciudades o el cron»), nunca el secreto ni la dirección.
2. **Red de seguridad sin esperar al cron** (`src/lib/rutinas/rescate.ts`, `pedirPasoSiHayVaradas` en `src/app/admin/ciudades/consultas.ts`):
   al cargarse **Ciudades** (y Corridas, con la misma función) se miran las corridas del panel; si hay una **varada** —una `corriendo` que
   nadie trabaja (`ocupada_hasta` vencido o nulo) y que no avanza desde hace más de 2 minutos, o una `pendiente` creada hace más de 2 minutos—,
   el servidor pide un paso por cada una (tres como mucho) con `after()` y `CRON_SECRET`, como la hoja «Correr». Para saber cuándo avanzó, el
   motor deja `resumen.actualizada` en cada paso (si falta, cuenta `inicio`). Ninguna pantalla cambia ni espera.

## Qué cambió

**«Buscar agendas y eventos»** (`src/lib/rutinas/agendas.ts`, registrada en el motor junto a `lugares`: un tipo nuevo de tarea, el mismo
motor). Las fuentes, en el orden del founder:

1. `agenda-cultura` · **agendas de gobierno**: la agenda mensual de la Secretaría de Cultura del estado y la del municipio, y las de institutos
   y museos públicos. San Luis queda sembrada con su página índice (`https://cultura.slp.gob.mx/agenda-cultural/`, la escribe la rutina la
   primera vez, sin migración). Ciudad de México: su cartelera (una guía en `*.gob.mx` se trata como agenda de gobierno). Una ciudad sin
   agendas de gobierno guardadas las busca primero en sitios `gob.mx` (búsqueda web acotada, 3 búsquedas, 2 páginas).
2. `guias` · **agendas conocidas**: las guías de `ciudades.parametros.guias` (la bandeja agrupa lo de cada guía con su nombre).
3. `universidades-museos`: las guardadas o, la primera vez, una búsqueda (2 búsquedas, 2 páginas) que guarda lo que encuentra.
4. `web`, **al final**: «agenda cultural <ciudad> <mes año>» y «eventos culturales <ciudad> esta semana», 2 páginas.

- **Lo guardado** queda en `configuracion` con la clave **`agendas_<slug con guiones bajos>`** (`agendas_san_luis_potosi`): la tabla solo admite
  `^[a-z0-9_]+$`, así que `agendas:<slug>` no cabía. El valor: `{ actualizado, fuentes: [{ url, nombre, tipo: pdf|html|indice, clave, mes,
  leida }] }`, ordenadas por fuente. La corrida del mes siguiente no vuelve a buscar: mira el índice (gratis) por si hay un mes nuevo, no relee
  un PDF ya leído entero (`leida`) ni uno de un mes pasado, y relee las páginas (cambian). Cada búsqueda añade como mucho 3 agendas nuevas y se
  guardan hasta 8 por fuente.
- **Un índice se lee gratis** (`src/lib/rutinas/indiceAgendas.ts`): cada enlace a un PDF con su título, su fecha de publicación y su nombre de
  archivo; valen las del mes en curso y el siguiente, y los programas sin mes publicados en los últimos 40 días. Comprobado contra la página
  real de Cultura de San Luis (descargada hoy, no se guarda en el repo): de 25 PDF toma justo dos, `oct_2026.pdf` («OCTUBRE», publicado el
  30 de septiembre) y el programa de Xantolo (13 de octubre); deja fuera leyes, planes y meses pasados. Si una página no se deja leer así, se
  la pasa a la API.
- **Un paso, una cosa**: el primero es gratis (publica lo aceptado sin evento, siembra y arma la lista); luego un índice, una búsqueda o una
  lectura por paso. Un **PDF** se lee como documento de la API por su URL (`URLPDFSource`), por trozos de 7 días (del día 1 del mes, o de hoy,
  al fin del mes; un PDF sin mes, 31 días), con marca de caché en el documento: el primer trozo lo escribe y los siguientes lo leen a una
  décima parte. Si un trozo se corta por tiempo, se parte en dos y se vuelve a pedir. Una **página** se lee con la lectura web acotada a su
  sitio (de hoy a 45 días, una lectura). El paso de agendas dura hasta 200 s (leer un PDF de imágenes tarda); por eso la ruta pasa a
  `maxDuration = 300` y una corrida reclamada queda ocupada 320 s (antes 70): más que lo que puede vivir la función.
- **Lo que se le pide al modelo** (`SISTEMA_AGENDAS` fijo, para que la caché sirva; Sonnet 5.5, esfuerzo bajo, como lugares): eventos con
  día y hora exactos, una fila por función, solo los días pedidos y la ciudad (municipios o alcaldías), exposiciones como «Inauguración: …»,
  el lugar con su nombre EXACTO si es uno de los registrados (se le da la lista), descripción de una o dos frases propias, precio («Gratis» o
  el texto). Entrega por una herramienta estricta (`entregar_agenda`: `eventos` y `agendas`), validada otra vez con zod. Lo que lee son datos,
  no instrucciones. `llamarConEntrega` en `claude.ts` es ahora la llamada de las dos rutinas (`buscarConApi` de lugares la usa igual).
- **Qué se propone y qué no** (contadores en `resumen.descartados`, nunca nombres): `sin_hora` (sin día y hora exactos), `pasado` (antes de
  ahora), `fuera_de_la_ciudad` (otro municipio; con alcaldías, que no nombre ninguna en municipio, dirección o lugar), `rechazado_antes` (mismo
  título normalizado y día que algo rechazado en la ciudad), `ya_propuesto` (lo mismo, propuesto o aceptado), `ya_existe` (en `eventos`: el
  mismo título a la misma hora, o la regla de `eventos_parecidos` —el mismo día, en el mismo sitio, con un título parecido— con
  `parecidoGuardado`, también lo oculto; al publicar se pregunta además a `eventos_parecidos` en la base) y `de_mas` (más de 60 por tarea).
  `resumen` lleva también `por_fuente` (propuestos y USD de cada fuente), `agendas_leidas`, `busquedas_web`, `cortadas`, `publicados` y
  `sin_publicar` (lo aceptado sin evento que se publicó al empezar), `avisos` y `tope`.
- **Lo propuesto** (`propuestas.datos`, contrato ampliado en `src/lib/propuestas.ts`): `{ titulo, inicio, fin?, lugar, direccion?, municipio?,
  precio?, descripcion?, ciudad, url, leida }`; `fuente` es el nombre de la fuente («Agendas de gobierno», «Universidades y museos», «Búsqueda
  web» o el nombre de la guía) y `datos.url` la agenda.

**Publicar un evento aceptado** (`src/lib/rutinas/publicarEvento.ts`, desde `aceptarPropuesta`). Por el camino del importador de la Mac, con
su lógica llevada a `src/lib/cargaEventos.ts` (pura, sin `server-only`: el script la importa de ahí; `scripts/instituciones/instituciones.ts`
la reexporta para sus pruebas y `importar-eventos.ts` la toma directo; el empaquetado del script sigue sin `server-only`):

- Antes de aceptar se arma y se comprueba: el lugar registrado con ese nombre en la ciudad (`resolverLugar`) o, si no hay, el sitio con su
  punto de Mapbox **dentro del área de la ciudad** (`ubicarSitio` compartido: por nombre y por dirección, contrastados con `elegirPunto`);
  lo que mandaría el formulario (`formularioDeEvento`: gratis, «Cooperación solidaria» en su casilla, precio; «Entrada libre» y parecidos
  pasan a «Gratis» con `precioDeAgenda`) por `validarEvento` en la zona del lugar o de la ciudad; «¿Es este?» con `eventos_parecidos` y el
  mismo título a la misma hora. **Si no se puede publicar, no se acepta** y la tarjeta lo dice en una frase, en su sitio (el `role="alert"`
  que ya tenía): «No se publicó: «Foro X» no está en el directorio y el mapa no lo encuentra en San Luis Potosí. Recházala o da de alta el
  lugar.»; o «Ya está «…» ese día en ese sitio: recházala como duplicado.»; o «No se publicó: ese evento ya pasó. Recházala.».
- Si se puede: `aceptar_propuesta` con la sesión (la base exige el rol), el evento se inserta **con la llave de servicio y sin sesión** (no
  crea avisos: ni el outbox de quienes siguen el lugar ni el aviso de la administración, porque el autor es la cuenta que aceptó), con
  `origen = 'rutina-agendas'` y `fuente_url` = la agenda, y la propuesta queda ligada a su evento (`ficha_id`, con la llave de servicio).
  «Ver ficha» lleva al evento. Si dos pestañas aceptan a la vez, la que no liga borra el evento que sobra.
- La línea de lo hecho dice «Aceptaste …», como un lugar (antes: «… · se publica con la rutina de agendas»). Si el evento se aceptó pero no
  se pudo insertar en ese momento, la línea añade «no se pudo publicar ahora: se publica con la siguiente corrida de agendas», y así es: **al
  empezar cada corrida de agendas de la ciudad se publican las propuestas de evento aceptadas sin evento** (las de antes de esta pieza, si las
  hay, y las que fallaron al insertar), con quien las aceptó como autor.

**Parámetros por ciudad** (migración `20261021120000_ciudades_parametros.sql`: `ciudades.parametros jsonb not null default '{}'`, un objeto de
hasta 20 000 bytes; las reglas por fila de `ciudades` no cambian; `src/lib/ciudadParametros.ts` los lee y limpia; lo que no se entiende se
ignora). Los usan las dos rutinas:

- `radio_km` manda sobre el radio que sale del zoom (área de la ciudad, caja de Mapbox y de los lugares conocidos).
- `alcaldias`: el CSV del SIC se filtra por su municipio (`nom_mun`) contra las alcaldías; lo de otras fuentes pasa si su municipio o su
  dirección (la de la fuente o la que dio Mapbox) nombra una, y si no, cuenta en `descartados.fuera_de_la_ciudad`; al modelo se le dice «Solo
  cuentan estas alcaldías: … En municipio pon la alcaldía».
- `guias`: en «Buscar lugares», una tarea por guía **antes** del SIC (lectura web acotada a su sitio, 3 lecturas), con `por_fuente.guias`;
  en agendas, las guías de gobierno (`*.gob.mx`) van con las agendas de gobierno y las demás como agendas conocidas.
- Datos de Ciudad de México (ejemplo de la prueba del banco y de `agendas.test.ts`, no van en la migración; los carga el gestor):
  `{"alcaldias": ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"], "radio_km": 12, "guias": [{"nombre":
  "Cartelera de la Secretaría de Cultura de la Ciudad de México", "url": "https://cartelera.cdmx.gob.mx/"}, {"nombre": "Cultura UNAM", "url":
  "https://www.cultura.unam.mx/"}, {"nombre": "Time Out México", "url": "https://www.timeoutmexico.mx/ciudad-de-mexico"}, {"nombre":
  "Chilango", "url": "https://www.chilango.com/"}, {"nombre": "Local.mx", "url": "https://local.mx/"}, {"nombre": "Dónde Ir", "url":
  "https://dondeir.com/"}, {"nombre": "Turismo de la Ciudad de México", "url": "https://mexicocity.cdmx.gob.mx/"}]}`.

**Dos limpiezas de «Buscar lugares»** (`src/lib/rutinas/candidatos.ts`): todo texto que entra por cualquier fuente pierde las etiquetas HTML y
las entidades (`textoLimpio`: «Centro Cultural Juan Ignacio <i>Juani </i>Torres» → «… Juani Torres»; el SIC limpia el nombre antes de buscar
repetidos), y la dirección pierde los rótulos «Dirección:», «Domicilio:», «Ubicación:» o «Sede:» y las comas sueltas del principio y del final
(`limpiarDireccion`: «Dirección:, Av. Venustiano Carranza 1815» → «Av. Venustiano Carranza 1815»).

**El precio de la caché de Sonnet 5.5** (`precios.ts`): la lectura de caché estaba en 0,10 USD por millón y la guía de la API dice 0,20;
corregido para que el crédito no baje de menos (importa ahora: los trozos de un PDF se leen de la caché).

**Lo que no cambia:** ninguna pantalla nueva ni rediseñada; la hoja de Ciudades sigue igual (OL-431 la rediseña aparte); artistas y showcase
siguen «Falló · Este botón todavía no tiene rutina» (OL-430); ninguna variable de entorno nueva.

## Costo estimado por corrida de agendas (precios de la guía de la API: Sonnet 5.5, 2 USD el millón de entrada, 2,50 la escritura de caché, 0,20 su lectura, 10 la salida; búsqueda web, 10 USD cada 1 000)

Supuestos (a confirmar con `resumen.por_fuente.*.usd` en la primera corrida real): un PDF mensual de imágenes de unas 40 páginas son unos
60 000 tokens; un programa suelto, unos 30 000; una página leída, hasta 30 000; cada trozo de 7 días entrega unos 2 000–3 000 tokens.

| Tarea (San Luis, hoy 21 de octubre) | Llamadas | USD |
|---|---|---|
| Preparar e índice de Cultura (gratis) | 0 | 0 |
| Programa de Xantolo (31 días, 5 trozos) | 5 | ≈ 0,15 (escritura 0,08 + lecturas 0,03 + salida 0,04) |
| Agenda de octubre (2 trozos) | 2 | ≈ 0,22 |
| Agenda de noviembre, cuando salga (5 trozos) | 5 | ≈ 0,40 |
| Buscar universidades y museos (la primera vez) | 1 | ≈ 0,15 |
| Leer hasta 3 agendas de universidades y museos | 3 | ≈ 0,30 |
| Búsqueda web | 1 | ≈ 0,15 |
| **Corrida** | **12–17** | **≈ 1,00–1,40** |

El mes siguiente, sin búsqueda de universidades y sin releer PDF leídos: ≈ 0,60–1,00. Ciudad de México con sus siete guías (una de gobierno y
seis conocidas, una lectura cada una) más universidades y web: ≈ 1,20–1,80. La hoja dice «Se estima entre 1 y 5 USD»: sigue siendo cierto.

**Pasos para una ciudad típica (San Luis):** 1 (preparar) + 1 (índice) + 5 (Xantolo) + 2 (octubre) + [5 noviembre] + 1 (buscar universidades)
+ hasta 3 (sus páginas) + 1 (web) = de 14 a 19 pasos. Cada paso con la API tarda de 20 s a 2 minutos: de 10 a 25 minutos encadenados. Si la
cadena se corta, la retoman Ciudades o Corridas al abrirlas (2 minutos sin avanzar) o el cron diario.

## Decisiones por confirmar (founder o gestor)

1. **Clave `agendas_<slug>`** (con guiones bajos): la tabla `configuracion` no admite «:» ni «-».
2. **Paso de agendas de 200 s, `maxDuration = 300` y corrida ocupada 320 s** (antes 45 s, 60 y 70): leer un PDF de imágenes no cabe en 45 s.
   Un paso que se cae deja la corrida ocupada hasta 320 s antes de que otro la retome (lugares sigue con pasos de 45 s).
3. **Red de seguridad también en Corridas**, no solo en Ciudades (la misma función; ninguna pantalla cambia), y **también las pendientes**
   de más de 2 minutos (su primer paso se perdió).
4. **Un evento que no se puede publicar no se acepta** (la tarjeta dice por qué y se puede rechazar), en vez de aceptarlo sin evento.
5. **Lo pasado y lo rechazado se comparan por título normalizado y día**; lo existente, por el mismo título a la misma hora y la regla de
   `eventos_parecidos` (mismo día, mismo sitio, título parecido).
6. **PDF por trozos de 7 días** (un programa sin mes, 31 días; una página, 45 días en una lectura); un trozo cortado se parte en dos.
7. **Las guías en `*.gob.mx` cuentan como agendas de gobierno** (la cartelera de Ciudad de México va primero).
8. **Con alcaldías, un evento o lugar que no nombra ninguna (ni en su municipio, ni en su dirección, ni en la que dio Mapbox) queda fuera**;
   un lugar sin municipio o con el de la ciudad entera («Ciudad de México») se decide al ubicarlo.
9. **La descripción y el precio vienen de la agenda** (descripción propia del modelo; «Entrada libre» → «Gratis»); el enlace del evento es la
   agenda si es https.
10. **Los programas sueltos** (Xantolo, Semana Santa) **cuentan si se publicaron en los últimos 40 días.**
11. **El precio de la lectura de caché de Sonnet 5.5 a 0,20** (estaba en 0,10).

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde. `npm test`: 254 archivos,
  4 222 pruebas, todas bien. Nuevas o cambiadas: `cadena.test.ts` 5 (sin pérdidas termina sola; **reproduce el estado de San Luis** perdiendo
  la petición del segundo paso con un solo intento: `corriendo`, «2 de 3 fuentes», turno 1, `ocupada_hasta` nulo, intentos 0; el reintento lo
  arregla; tres pérdidas dejan la línea en el registro sin el secreto; **la red de seguridad de Ciudades la termina**; 40 órdenes al azar con
  varias corridas y peticiones a la vez sin perder ninguna), `disparar.test.ts` +4 (reintenta un 404 y un tropiezo de red; tres fallos,
  «falló» y la línea; un 401 no se reintenta; no se pasa del tiempo de la función), `atender.test.ts` (el encadenado recibe el tiempo que le
  queda), `rescate.test.ts` 3, `agendas.test.ts` 9 (orden gobierno → universidades y museos → web con el índice gratis y los PDF por trozos;
  documento por URL con marca de caché; lo de hoy en adelante, sin hora, pasado, fuera, existente, propuesto y rechazado; el contrato de
  `datos`; agendas guardadas y **reutilizadas** en una segunda corrida: solo la página y la búsqueda web, nada repetido; **publicación de lo
  aceptado sin evento**; Ciudad de México con su cartelera primero, sus guías y sus alcaldías; el tope; el trozo cortado partido en dos; sin
  llave), `publicarEvento.test.ts` 4 (**lugar registrado**; **sitio con punto** de Mapbox y cooperación en su casilla; **sin punto** —o fuera
  de la ciudad, o sin Mapbox— no se publica y lo dice; parecido, misma hora, pasado, ilegible y la base caída), `lugaresParametros.test.ts` 2
  (las guías primero con la lectura acotada a su sitio, solo las alcaldías, el radio que manda; **sin parámetros, igual que antes**),
  `limpiezas.test.ts` 3, `indiceAgendas.test.ts` 3, `ciudadParametros.test.ts` 3, `cargaEventos.test.ts` 2, `precios.test.ts` +1, el motor
  (agendas ya no es «sin rutina»; artistas y showcase sí) y `propuestas.test.ts` (la línea de lo hecho). Las 52 del importador
  (`scripts/instituciones`) siguen bien con la lógica movida.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, 2 194 comprobaciones, 0 fallaron. Banco nuevo
  `supabase/tests/pg/ciudades-parametros.test.mjs`: la columna (jsonb, no nula, `'{}'`), las ciudades sembradas sin parámetros, la
  administración y la llave de servicio la escriben, anon y una cuenta sin rol no, todos la leen, solo un objeto y con techo de tamaño, y el
  ejemplo de Ciudad de México.
- `npm run inventario`: sin novedades. `npm run medir`: 49 pantallas × 4 anchos, **sin novedades** (Ciudades, su hoja, la bandeja y Corridas,
  s32 a s35, con las mismas cifras de la bitácora 461: 149 · 175 · 59 · 61 nodos a 390; la red de seguridad no cambia nada en pantalla: el
  respaldo local no tiene `CRON_SECRET`, así que su corrida de ejemplo «corriendo» solo deja «falta CRON_SECRET» en el registro).
  `npm run test:componentes` completo: **669 de 669** (Chrome real), con la prueba de la bandeja reescrita: un evento sin punto no se publica y
  su tarjeta lo dice (y sigue con Rechazar); aceptado, «Aceptaste …» y «Ver ficha» lleva al evento.
- **Captura** `docs/rediseno/capturas-462/462-bandeja-eventos.png` (390×844 a doble densidad, Chrome real con playwright-core, Bricolage del
  build): la bandeja de una corrida de agendas de San Luis con los componentes y el CSS reales, el título y la nota de `tituloBandeja` y
  `notaBandeja` («Agendas y eventos de San Luis Potosí», «Corrida del 21 oct · 4 propuestos») y las acciones del servidor sustituidas (como en
  la prueba de componentes; sin la barra de Atrás, que no cambia). De arriba abajo: en «Agendas de gobierno», «Aceptaste Recital de guitarra»
  con «Ver ficha» (publicado al aceptar; antes decía «· se publica con la rutina de agendas» y no tenía enlace); la tarjeta de «Xantolo en el
  jardín» con la frase en rojo en su sitio, «No se publicó: «Jardín de San Juan de Dios» no está en el directorio y el mapa no lo encuentra en
  San Luis Potosí. Recházala o da de alta el lugar.», y sus dos botones; «Aceptaste Cierre de octubre · no se pudo publicar ahora: se publica
  con la siguiente corrida de agendas» (la nota cuando el evento no se pudo insertar en ese momento); y, en «Universidades y museos», una
  tarjeta sin decidir. Nada se sale del ancho ni se monta. Los datos son inventados.
- Comprobado contra la página real de Cultura de San Luis (descargada hoy al scratchpad, sin la API): el lector de índices toma
  `oct_2026.pdf` y el programa de Xantolo de 25 PDF.
- Los dos scripts del importador se empaquetan con esbuild como en `correr.mjs` y no arrastran `server-only`.

## Lo que se dejó fuera

- **Proponer el lugar que no existe** («si un lugar no existe, te propone darlo de alta», dice la hoja de agendas): no se hizo. Un evento en un
  sitio sin ficha se propone con el sitio como lo escribe la agenda y, al aceptarlo, se publica con su punto de Mapbox o se avisa. Proponer
  ese sitio como `lugar` en la misma corrida es otra pieza chica.
- **Artistas de los eventos**: la agenda nombra a quienes se presentan, pero no se ligan (el importador solo liga nombres exactos con ficha;
  aquí no se pidieron). Va con OL-430.
- **Ninguna llamada real** a la API, a Mapbox ni a producción desde este árbol: la primera corrida real es del gestor.

## Para la primera corrida real (gestor)

1. Unir, aplicar la migración `20261021120000_ciudades_parametros.sql` y comprobar `select parametros from ciudades limit 3` (todas `{}`);
   cargar los de Ciudad de México con el JSON de arriba (`update ciudades set parametros = '…' where slug = 'ciudad-de-mexico'`).
2. **Primero San Luis, «Buscar agendas y eventos», tope 2,00 USD.** Qué mirar: en Ciudades el botón pasa a «Corriendo» con su barra; en los
   registros de Vercel, ninguna línea «rutinas: no se pudo pedir el paso» (si sale, la red de seguridad la retoma al abrir Ciudades: basta
   recargar la página pasados 2 minutos). En la base: `select valor from configuracion where clave = 'agendas_san_luis_potosi'` (el índice, el
   PDF de octubre y el de Xantolo, luego `leida`); `select estado, gasto_usd, resumen from rutinas_corridas order by creado_en desc limit 1`
   (`por_fuente.*.usd` contra la tabla de arriba, `descartados`, `cortadas`, `avisos`). En la bandeja: aceptar un evento en un lugar
   registrado (debe decir «Aceptaste …» y «Ver ficha» debe llevar al evento, con `origen = 'rutina-agendas'`) y uno en un sitio sin ficha (o
   se publica con su punto o dice por qué no).
3. Después Ciudad de México con tope 2,50 USD (siete guías). Si aparecen `cortadas` en los PDF, bajar `DIAS_POR_TROZO` a 5.
4. Para un paso a mano, como siempre: `POST /api/rutinas/correr?esperar=1` con `Authorization: Bearer $CRON_SECRET`.
