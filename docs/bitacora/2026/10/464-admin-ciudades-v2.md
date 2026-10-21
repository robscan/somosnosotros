# 464 · Administración › Ciudades v2 en código: lista general, alta de ciudades y panel por ciudad con tarjetas que detonan búsquedas (OL-432)

**Fecha:** 2026-10-21. **Rama:** `admin-ciudades-v2`, desde `origin/main` (`f0856e61`). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** ninguna (todo cabe en `ciudades.estado`, `ciudades.alias` y `ciudades.parametros`, que ya existen).
**Variables de entorno:** ninguna nueva en Vercel (usa `NEXT_PUBLIC_MAPBOX_TOKEN`, la que ya hay; `MAPBOX_API_URL` solo la lee el respaldo local
y solo vale si apunta a 127.0.0.1). **Estado:** lista para la revisión del gestor.

## El pedido

El founder firmó hoy el prototipo OL-431 (`docs/rediseno/prototipos/ciudades-v2.html`, bitácora 463, capturas-463) «con tus propuestas», es
decir, con las siete respuestas del gestor a las dudas del prototipo. Esta pieza lo construye tal cual, sin rediseñar: la lista general, la hoja
«Añadir ciudad» con Mapbox, el panel de cada ciudad con sus tarjetas y botones, la bandeja por ciudad y la ruta vieja que lleva a ella.

## Qué cambió

**Nivel 1 · `/admin/ciudades`, la lista general** (`page.tsx`, `ListaCiudades.tsx`). Una fila por ciudad (la `fila` de admin en una tarjeta):
nombre y píldora (Abierta o Detectada; `investigando` se ve abierta, respuesta 3), los tres números con su icono (consultas en 30 días, lugares,
eventos próximos; cada uno se lee con su nombre), y a la derecha las propuestas por revisar en violeta con el ›. La tercera línea solo cuando hay
algo que decidir (`lineaFila`): «Buscando agendas y eventos · 1 de 3 fuentes» con su barra, «Una búsqueda falló y otra llegó al tope» en rojo,
««Buscar lugares» empieza en unos segundos», «Abierta hoy · 3 búsquedas por correr». Orden (`ordenarCiudades`): primero lo que tiene algo por
decidir (propuestas, una búsqueda que espera, corre, falló o llegó al tope, o todo por correr), luego las detectadas, luego el resto; dentro, por
consultas y nombre. Las ocultas no salen. Una detectada lleva «Abrir» (la hoja ya llena) y, debajo, «Ocultar» (respuesta 6): queda cerrada y su
fila dice «Oculta · No vuelve a salir aunque la consulten» con «Deshacer» hasta salir (la lista se toma al entrar, como la bandeja y
«Pendiente»). Abajo, Corridas con el crédito, como hoy, y la pastilla flotante «Añadir ciudad» (la de las fichas: `Boton` `flotante`, pegada al
pie; desde 792 al final de la fila). «Propuestas N» ya no es un grupo arriba.

**«Añadir ciudad»** (`HojaAnadir.tsx`, `alta.ts`, `mapbox.ts`, acciones `sugerirCiudades`, `resolverCiudad`, `abrirCiudad`). La hoja de elegir
ciudad de la app (`ui/Hoja` plana, `CampoBuscar` con su ✕, `Ciudad.module.css`) con un solo campo. Sin escribir, las detectadas por consultas.
Al escribir (250 ms tras la última tecla), el servidor junta las que ya están —con su píldora; una abierta lleva directo a su panel— y las que
sugiere Mapbox (Geocoding v6, `types=place`, cerca de San Luis y sin filtro de país), con su estado y país. Un municipio que ya cuenta con otra
ciudad sale con su nombre y «Cuenta con Oaxaca» y lleva a ella. Al elegir, el servidor resuelve todo y la persona solo confirma:

- **el nombre en la app** (respuesta 1): el corto («Oaxaca de Juárez» en Oaxaca → «Oaxaca»; «Heroica Puebla de Zaragoza» → «Puebla»), con el de
  Mapbox como detalle y «Cambiar» (el campo «Nombre en la app» con su ✕ y la ayuda «Mapbox la llama «…»; ese nombre cuenta igual»; vacío, el
  botón dice «Falta el nombre» y no se toca). Fuera de México lleva el país, como lo guarda la app («Córdoba, España»);
- **la hora** del punto (`zonaDePunto`), por su nombre de siempre («Hora del centro de México») y comparada con San Luis Potosí («La misma de
  San Luis Potosí», «1 hora menos que…»);
- **el área** (respuesta 2): «15 km alrededor del centro · Cuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán». Los municipios salen de
  preguntarle a Mapbox qué municipio hay en 17 puntos del área (el centro, ocho a medio radio y ocho casi en el borde), del centro hacia fuera,
  sin la ciudad misma. Una ciudad que ya tiene alcaldías (Ciudad de México, OL-429) dice las suyas y su radio («12 km… Solo cuentan
  Cuauhtémoc, Miguel Hidalgo, Coyoacán, Benito Juárez y Álvaro Obregón») y no se buscan municipios. Si Mapbox no contesta, la línea lo dice;
- **el mapa chico** (5:2, como «Dónde»): la imagen estática de Mapbox centrada con el zoom del área y, encima, el círculo punteado y el pin en un
  SVG del mismo tamaño, así se ven aunque la imagen no cargue.

«Abrir Oaxaca» (`abrirCiudad`) crea la fila (slug del nombre corto, nombre corto, alias con el nombre largo **y los municipios del área**, centro,
zoom 13, zona del punto recalculada en el servidor, estado abierta, `parametros` con `radio_km`, `municipios` y `abierta_en`) y entra directo al
panel. Una detectada u oculta se abre **en su misma fila** (conserva sus consultas; el nombre de antes queda de alias). Nunca dos: si ya hay una
abierta con ese nombre o alias, lleva a su panel sin tocar nada; si otra pestaña la dio de alta a la vez (23505), también. Las alcaldías y el
radio que ya tenía una fila no se pisan.

**Nivel 2 · `/admin/ciudades/[slug]`, el panel** (`[slug]/page.tsx`, `TarjetaBusqueda.tsx`, `HojaCorrer.tsx`). Cabecera: nombre, píldora y
`cabeceraCiudad`: «Buscando desde hoy, 9:31 am» si una búsqueda corre, si no «Abierta hoy, 10:00 am» (de `parametros.abierta_en`) o «Detectada
el 12 oct»; y lo que cuenta con ella: «Cuauhtémoc, Miguel Hidalgo y 3 más» (alcaldías) o «con Santa Lucía del Camino y Santa Cruz Xoxocotlán»
(municipios o alias). Las tarjetas son las de «Últimos 7 días» de la portada (`indicador`), en el orden firmado:

- **Por revisar** (solo si hay): número violeta, «De «Buscar lugares» del 19 oct: 14 propuestas, 9 ya aceptadas» (o de cuántas búsquedas) y
  «Revisar las 5» a la bandeja de la ciudad;
- **Lugares** («Ninguno nuevo este mes» / «3 nuevos este mes»), **Eventos próximos** («41 de la agenda de Cultura · 23 de su gente», por
  `eventos.origen`) y **Artistas** («520 del Catálogo CAPO · 166 por su cuenta»), cada una con su número y, bajo una raya, su última búsqueda
  (`lineaBusqueda`, la píldora de Corridas): «Terminada · 19 oct · 14 propuestos · 9 aceptados · 1,10 USD», «Corriendo · 1 de 3 fuentes · 0,40
  de 3,00 USD» con barra y **sin botón**, «Pendiente · Espera a la de agendas · tope 2,00 USD» con **«Cancelar la búsqueda»**, «Llegó al tope ·
  … · 12 esperan a la siguiente · 1,50 USD» con su razón («Se detuvo en el tope de 1,50 USD en 2 de 3 fuentes; la siguiente sigue donde se
  quedó.», respuesta 5) y «Falló» con la suya en rojo (`resumen.error`). Los tres botones van siempre (respuesta 4: si artistas no tiene rutina
  todavía, su corrida queda «Falló · Este botón todavía no tiene rutina.» y la tarjeta lo dice);
- **Consultas** (30 días con su tendencia por semana —solo con cuatro semanas contadas enteras, para no dibujar una tendencia que no existe— y
  «▲ 45 esta semana»; si se cuentan hace poco, «desde el 20 oct» o «se cuentan desde hoy») y **Gasto** («USD en esta ciudad», «Quedan … de 200»,
  «Corridas ›»), juntas en una fila.

**Un solo botón violeta por pantalla** (`siguientePaso`): «Revisar» si hay propuestas; si una búsqueda espera o corre, ninguno; si no, la primera
que falta o que no terminó (falló o llegó al tope), en el orden lugares → agendas → artistas; todo al día, ninguno. Los demás, de contorno. Los
botones abren la hoja de «Correr» de hoy (texto, fuentes, tope con su ✕, estimado, crédito, Cancelar · Correr), que ahora empieza con «**La vez
pasada** se detuvo en el tope…» cuando la anterior falló o llegó al tope. Desde 1048 el panel usa la columna ancha (960) y las tarjetas van de
tres en tres («Por revisar» a lo ancho, las tres búsquedas en fila, Consultas a dos columnas y Gasto). «USD», «am» y «pm» no quedan solos al
partir el renglón (`pegado`, como el prototipo).

**La bandeja por ciudad** (`[slug]/propuestas/page.tsx`, respuesta 7): «Propuestas de Oaxaca», «5 por revisar. Nada se publica hasta que lo
aceptas.» y, por cada búsqueda con algo por revisar, su nombre («Buscar lugares»), lo que trajo («19 oct · 14 propuestos · 9 aceptados») y sus
fuentes como hoy (`Bandeja.tsx`, movida a `ciudades/`, con el rótulo de la fuente en `h3`): «Ver ficha», «Deshacer» y «Aceptar las N de esta
fuente» se conservan. La ruta vieja `/admin/ciudades/propuestas/[id]` lleva a la de su ciudad (así sirven los enlaces de la portada, de Corridas
y los marcadores); solo una corrida sin ciudad se enseña ahí. En la portada, «Pendiente» junta un renglón por ciudad («Propuestas de Oaxaca · 7
por revisar · de 2 búsquedas»), y el grupo Ciudades dice «3 abiertas · 1 detectada · 1 oculta».

**Lo que se conserva:** la red de seguridad de OL-429 (`pedirPasoSiHayVaradas`) en la lista, el panel y Corridas; las acciones de la bandeja;
`crearCorrida` y `cancelarCorrida`. **Lo que se quitó:** `TarjetaCiudad.tsx` (la tarjeta con tres renglones-botón de OL-427) y las funciones que
solo la servían (`cifrasCiudad`, `lineaInvestigacion`, `textoBoton`, `ultimaPorBoton`).

**Una ciudad con otro nombre** (`juntarAlias`): si la detección dio de alta «Oaxaca de Juárez» como detectada y «Oaxaca» la tiene de alias, sus
consultas suman a Oaxaca y no sale aparte; su URL lleva al panel de Oaxaca. Lugares, eventos y artistas de cada ciudad suman los de sus alias
(`conCifras`), contados como los cuenta la app.

## Decisiones por confirmar (founder o gestor)

1. **Los municipios del área van también de alias**, como Soledad con San Luis Potosí: las rutinas cuentan como de la ciudad lo que está en su
   nombre y sus alias (`zonasDe`), así «Cuenta también…» es cierto. Quedan además en `parametros.municipios`, para decirlo en pantalla.
2. **«Abierta hoy, 8:05 am» sale de `parametros.abierta_en`**, que se escribe al abrir desde la hoja. Sin migración, las que ya estaban abiertas
   no lo tienen y su cabecera no dice desde cuándo. Para Oaxaca y Ciudad de México (abiertas hoy por el gestor) basta
   `update ciudades set parametros = parametros || '{"abierta_en": "2026-10-21T14:05:00Z"}' where slug in (…)` con su hora real.
3. **La app no lee `ciudades.alias`** (`ciudadCanonica` usa su lista fija `MISMA_CIUDAD`): si la gente publica en «Oaxaca de Juárez», la app enseña
   esa ciudad aparte de «Oaxaca» (la de lo aceptado en la bandeja). Administración ya las junta; juntarlas en la app es otra pieza.
4. **«Ocultar» va en la línea de abajo de la fila detectada**, como salida discreta (subrayada, gris) que no compite con «Abrir»; la respuesta 6
   se aceptó sin pantalla. La fila crece lo que mide un toque (44).
5. **Al escribir, un municipio que ya cuenta con una ciudad** sale con su nombre y «Cuenta con Oaxaca» (sin píldora) y lleva a ella, en vez de
   proponer abrirlo aparte.
6. **Cada ciudad elegida cuesta 17 o 18 búsquedas de Mapbox** (las muestras del área y su nombre); son de Geocoding, dentro de lo gratuito.
7. **Atribución de los commits:** el encargo pedía «Claude Fable 5.1»; la sesión corre en Claude Opus 5.5 y así va firmado.

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde. `npm test`: 256 archivos,
  4 266 pruebas, todas bien. Nuevas o reescritas: `ciudadesAdmin.test.ts` 33 (estados visibles; la búsqueda de cada botón; «Llegó al tope»;
  la tercera línea de la fila en cada caso; **el orden firmado**, con ocultas fuera y una recién abierta arriba; **un solo violeta**
  (`siguientePaso`); la línea bajo la raya en los cinco estados con su razón y «esperan a la siguiente»; a qué espera una pendiente; la
  cabecera con alcaldías, municipios o alias; «Por revisar»; lo que dice cada número; las consultas y su tendencia; juntar una detectada que
  es otra ciudad; «Pendiente» de la portada por ciudad), `alta.test.ts` 16 (Mapbox leído; **la dirección de prueba solo hacia 127.0.0.1**;
  el nombre corto en México y fuera; alias sin repetir; las 17 muestras dentro del área; municipios del centro hacia fuera; el renglón del
  área con municipios, alcaldías o sin respuesta; el mapa; la hora de México y de fuera; las sugerencias, con «Cuenta con…») y
  `acciones.alta.test.ts` 13 con la tabla y Mapbox simulados (**crea la fila con lo resuelto**; **no crea dos**, por nombre o por alias;
  23505 de otra pestaña; **una detectada se abre en su fila**; una oculta se vuelve a abrir; Ciudad de México conserva alcaldías y radio; sin
  nombre o centro no se abre y sin rol de administración, a entrar; **«Ocultar» la cierra** y «Deshacer» la devuelve, una abierta no se
  oculta; sugerir y resolver).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 2 194 pruebas, 0 fallaron (sin migración nueva; las reglas de
  `ciudades` que usan «Abrir» y «Ocultar» —solo la administración la escribe— ya las prueba `ciudades-admin.test.mjs`).
- `npm run inventario`: sin novedades. `npm run medir -- --aceptar` (51 pantallas × 4 anchos): **solo cambian los presupuestos de Ciudades**
  y ningún otro hallazgo, teclado incluido; después `npm run medir -- --solo=admin` y `--solo=ciud`, **sin novedades**. A 390: s32 lista 113
  nodos (antes 149) y profundidad 9 (la que midió el prototipo firmado: los números con su icono); s33 «Añadir ciudad» 137; s34 bandeja de
  Oaxaca 61 (59); s35 Corridas 82 (61: el respaldo tiene más corridas); nuevas s35a panel de Ciudad de México 62 y s35b panel de Oaxaca con la
  hoja de «Correr» 86, las dos de profundidad 8. El campo de la hoja se toca entero (44: el borde por dentro, como en las listas de
  Administración).
- `npm run test:componentes`: 673 pruebas, 672 bien. Las **13 de Ciudades** (reescritas, Chrome real, toques por coordenadas que fallan si
  algo tapa): la lista (píldoras, números con su nombre, el violeta de las propuestas, la barra, «Abrir» y «Ocultar» de 44, **un solo violeta:
  «Añadir ciudad»**); «Ocultar» y «Deshacer»; la hoja sin escribir, al escribir (una sola petición tras la última tecla) y la ✕ que deja el
  foco; elegir, el mapa, los tres renglones, «Cambiar» con su ✕ y «Falta el nombre», «Abrir Oaxaca» con lo resuelto y al panel; una abierta
  lleva a su panel; «Abrir» desde la fila llena la hoja; el error del servidor deja la hoja; **un solo violeta en el panel** en tres casos;
  los cinco estados bajo la raya y «Cancelar la búsqueda»; la hoja con «La vez pasada…» y «Correr»; el tope; y la bandeja (fuentes en `h3`,
  aceptar, rechazar con motivo, «Deshacer», el evento sin punto). **La que falla es ajena**: `AltaEvento.componentes.test.mjs`, «OL-365: «Ver
  el evento»…», con `net::ERR_HTTP_RESPONSE_CODE_FAILURE` al navegar a la ficha de prueba; falla igual aislada, y la rama no toca
  `src/app/nuevo`, `src/components` ni `globals.css` (`git diff origin/main` vacío ahí).
- Con la letra al doble (`--letra=2 --solo=ciud`): el botón de una tarjeta que no cabía ahora parte su texto en dos renglones. Quedan la
  píldora «Detectada», que a 320 se sale 3 px de su nombre, y la hoja de «Correr» de OL-427 (sin cambios de maquetación aquí): su pie se sale
  13 px a 320 y, con el teclado, el tope queda bajo el pie. Ninguna de las dos se medía antes con letra grande.
- **Recorrido con el respaldo local** (`scripts/ops/auditoria-ui/capturar-admin-ciudades.mjs`, reescrito; app compilada contra el respaldo,
  Mapbox contestado por el respaldo con `MAPBOX_API_URL`, reloj fijo el miércoles 21 de octubre a las 10:00): 15 toques reales, ninguna página
  se desplaza a lo ancho, sin errores de consola, y comprobado en pantalla: el orden de la lista (Oaxaca, Ciudad de México, Querétaro,
  Aguascalientes, San Luis Potosí, San Miguel; ni Zacatecas oculta ni «Oaxaca de Juárez», juntada con Oaxaca); un solo violeta en la lista, en
  el panel recién abierto («Buscar lugares»), con propuestas («Revisar las 5») y ninguno mientras espera; la ✕ que deja el foco; «Falta el
  nombre»; «Abrir Puebla» guarda `slug` «puebla», nombre «Puebla», alias «Heroica Puebla de Zaragoza», «Cuautlancingo», «San Andrés Cholula» y
  «San Pedro Cholula», estado abierta y `parametros` con `radio_km` 15, los municipios y `abierta_en`, y entra a su panel; «Ocultar» y
  «Deshacer» de Querétaro mandan `PATCH …slug=eq.queretaro&estado=eq.detectada` y `…&estado=eq.cerrada`; la ruta vieja de la bandeja lleva a
  `/admin/ciudades/oaxaca/propuestas`; a 1280 la rejilla del panel tiene tres columnas de 315 px.

## Capturas (`docs/rediseno/capturas-464/`, Chrome real, 390×844 a 2×; la 20 y la 21 a 1280×800; comprimidas con `comprimir.mjs` y revisadas a tamaño completo)

- `01-lista.png`: Oaxaca (Abierta; 51 · 0 · 0; **5** en violeta; «Buscando agendas y eventos · 1 de 3 fuentes» con su barra), Ciudad de
  México (12 · 0 · 0; **4**; «Una búsqueda falló y otra llegó al tope» en rojo), Querétaro y Aguascalientes detectadas con «Abrir» a la derecha
  y «Ocultar» debajo, San Luis Potosí (2 262 · 9 · 18) y San Miguel (80 · 0 · 0); Corridas con «Crédito: 193,53 USD · vence el 11 de
  noviembre»; «+ Añadir ciudad» abajo, en violeta.
- `02-anadir-detectadas.png`: la hoja sin escribir sobre la lista: Querétaro (Detectada, 16 consultas en 30 días) y Aguascalientes (9).
- `03-anadir-san.png`: «San» con su ✕: San Luis Potosí y San Miguel de Allende con «Abierta» y su estado, «Santa Lucía del Camino · Cuenta con
  Oaxaca», y San Cristóbal de las Casas, San Juan del Río y San Andrés Cholula con su estado; la hoja a lo alto.
- `04-anadir-puebla.png`: «Pue»: Heroica Puebla de Zaragoza, San Andrés Cholula, San Pedro Cholula y Cuautlancingo, «Puebla, México».
- `05-elegida-puebla.png`: el mapa chico (gris: en el respaldo la imagen de Mapbox no carga) con el área punteada y el pin al centro; «Puebla ·
  Heroica Puebla de Zaragoza, Puebla, México» con «Cambiar»; «Hora del centro de México · La misma de San Luis Potosí»; «15 km alrededor del
  centro · Cuenta también Cuautlancingo, San Andrés Cholula y San Pedro Cholula»; «Abrir Puebla» al pie.
- `06-cambiando-nombre.png`: «Nombre en la app» con «Puebla» y su ✕, y «Mapbox la llama «Heroica Puebla de Zaragoza»; ese nombre cuenta igual.».
- `07-panel-puebla.png`: recién abierta: «Abierta hoy, 10:00 am · con Cuautlancingo, San Andrés Cholula y San Pedro Cholula»; Lugares 0 con
  «Buscar lugares» en violeta; Eventos próximos y Artistas en 0 con sus botones de contorno; Consultas 0 («se cuentan desde hoy») y Gasto 0,00
  («Quedan 193,53 de 200», «Corridas ›»).
- `08-hoja-buscar-lugares.png`: «Buscar lugares en Puebla»: qué hace, las tres fuentes, el tope 3,00 con su ✕, lo estimado y el crédito;
  Cancelar · Correr.
- `09-panel-puebla-pendiente.png`: tras correr con 2,50: Lugares «Pendiente · Espera su turno · tope 2,50 USD» (en el respaldo corre la de
  Oaxaca) con «Cancelar la búsqueda»; ningún violeta.
- `10-lista-con-puebla.png`: Atrás a la lista, donde se había quedado: Puebla tercera con ««Buscar lugares» empieza en unos segundos»; la
  pastilla flota sobre Corridas mientras la lista pasa por debajo.
- `11-abrir-detectada.png`: «Abrir» desde la fila de Aguascalientes: la hoja ya llena, «Cuenta también Jesús María», «Abrir Aguascalientes».
- `12-ocultada.png`: Querétaro con «Oculta», «No vuelve a salir aunque la consulten» y «Deshacer».
- `13-panel-oaxaca.png`: «Buscando desde hoy, 9:31 am · con Santa Lucía del Camino y Santa Cruz Xoxocotlán»; Por revisar 5 («De «Buscar
  lugares» del 19 oct: 14 propuestas, 9 ya aceptadas») con «Revisar las 5» en violeta; Lugares «Terminada · 19 oct · 14 propuestos · 9
  aceptados · 1,10 USD» con «Buscar lugares» de contorno; Eventos próximos «Corriendo · 1 de 3 fuentes · 0,40 de 3,00 USD» con su barra y sin
  botón.
- `14-panel-oaxaca-abajo.png`: Artistas 0 con «Buscar artistas»; Consultas 51 («desde el 12 oct, al abrir Inicio o Lugares») y Gasto 1,50.
- `15-panel-cdmx.png`: «Abierta hoy, 2:48 am · Cuauhtémoc, Miguel Hidalgo y 3 más»; Por revisar 4; Lugares «Llegó al tope · Hoy, 4:06 am · 4
  propuestos · 12 esperan a la siguiente · 1,50 USD» y «Se detuvo en el tope de 1,50 USD en 2 de 3 fuentes; la siguiente sigue donde se
  quedó.»; Eventos próximos «Falló · Hoy, 6:30 am · 0,21 USD» y «Se cortó tres veces seguidas en el mismo paso.» en rojo.
- `16-panel-cdmx-abajo.png`: Artistas 1 («1 por su cuenta») con «Buscar artistas», Consultas 12 («desde hoy») y Gasto 1,71.
- `17-hoja-tras-tope.png`: «Buscar lugares en Ciudad de México», que empieza con «**La vez pasada** se detuvo en el tope de 1,50 USD en 2 de 3
  fuentes; la siguiente sigue donde se quedó.».
- `18-panel-san-luis-consultas.png`: San Luis abajo: lugares y agendas terminadas (2 oct), Eventos próximos 18 («18 de su gente»), Artistas 6
  («6 por su cuenta») con «Buscar artistas» en violeta (la que falta), Consultas 2 262 con su tendencia y «▲ 45 esta semana», Gasto 2,90.
- `19-bandeja-oaxaca.png`: entrando por la ruta vieja: «Propuestas de Oaxaca», «5 por revisar. Nada se publica hasta que lo aceptas.»,
  «Buscar lugares · 19 oct · 14 propuestos · 9 aceptados», «Sistema de Información Cultural 3» con «Aceptar las 3 de esta fuente» y sus
  tarjetas con Rechazar · Aceptar.
- `20-panel-cdmx-1280.png`: la barra y el carril; el panel en la columna ancha: «Por revisar» a lo ancho, Lugares, Eventos y Artistas en fila,
  Consultas a dos columnas y Gasto.
- `21-lista-1280.png`: la lista en la columna de 600 (la de las tareas), con la pastilla al final de la fila, flotando sobre San Miguel
  mientras la lista pasa (al final, bajo Corridas).

**En qué se apartan de capturas-463 y por qué.** Los datos son los del respaldo (inventados) y no los del prototipo, y en el respaldo Oaxaca y
Ciudad de México ya están abiertas (como en producción): la ciudad nueva del recorrido es Puebla («Heroica Puebla de Zaragoza» → «Puebla», el
mismo caso que «Oaxaca de Juárez»). El mapa sale gris: el respaldo no deja salir a Mapbox; el área y el pin, que se dibujan encima, sí (el
prototipo pintaba calles inventadas). Las detectadas llevan «Ocultar» bajo los números (respuesta 6, sin pantalla en el prototipo) y su fila
crece lo que un toque. El detalle de una detectada en la hoja son sus consultas, sin estado ni país (no se guardan al detectarla). La razón de
«Llegó al tope» dice «en 2 de 3 fuentes» y no qué fuente faltó: la rutina deja su paso, no el nombre de la fuente. «Pendiente» dice a qué
espera («Espera su turno», «Espera a la de agendas») o «Empieza en unos segundos». La bandeja pone el nombre de cada búsqueda y lo que trajo
antes de sus fuentes (respuesta 7; el prototipo no la dibujó). No hay píldora «Investigando» (respuesta 3). Por lo demás, los mismos
renglones, tarjetas, píldoras, barra, raya y botones que el prototipo, en las mismas columnas a 390 y a 1280.

## Lo que se dejó fuera

- **Juntar los alias en la app** (decisión 3): es `src/lib/ciudad.ts`, fuera de esta pieza.
- **Corridas** no cambia: sus enlaces a la bandeja por corrida llevan ya a la de la ciudad.
- **Mover el centro, editar los municipios o cerrar una abierta**: no se pidieron.
- **La hoja de «Correr» con la letra al doble** (el pie y el teclado a 320 y 390) y los 3 px de la píldora: ver Evidencia.
- **Ninguna llamada real** a Mapbox, a la API ni a producción desde este árbol.

## Para publicar (gestor)

1. Sin migración ni variables: nada que aplicar. Opcional: anotar `abierta_en` a Oaxaca y Ciudad de México (decisión 2).
2. Tras publicar, en producción: «Añadir ciudad», escribir una ciudad que no esté (Querétaro o Guadalajara, cuando el founder las quiera abrir)
   y mirar que lleguen sugerencias con su estado y que al elegir salgan la hora y los municipios del área (Mapbox real, desde el servidor con
   el token de la app). Cerrar la hoja sin «Abrir» no guarda nada.
