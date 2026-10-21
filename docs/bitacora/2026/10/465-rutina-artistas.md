# 465 · «Buscar artistas» con la API y el botón «Investigar» del Showcase (OL-430)

**Fecha:** 2026-10-21. **Rama:** `rutina-artistas`, desde `origin/main` (`f0856e61`). **Operador:** agente de la pieza (Claude Opus 5.5) para el
Gestor VII, sin otros agentes. **Migración:** ninguna (el estado vive en `rutinas_corridas.parametros`/`resumen`, `propuestas.datos`,
`showcase_evidencias` y `configuracion`, que ya existen). **Variables de entorno:** ninguna nueva. **Estado:** lista para la revisión del gestor; la
primera corrida real la hace el gestor.

## El pedido

El founder: «Me fallaron la solicitud de búsqueda de eventos y artistas en la app» (el botón «Buscar artistas» quedaba «Falló · Este botón todavía
no tiene rutina») y, sobre cómo buscar: «que busque catálogos de artistas como capo primero, luego iremos nutriendo sus fichas». El encargo del
Gestor VII: «Buscar artistas» para una ciudad en el motor de OL-428 con los catálogos primero, y «Investigar» en la ficha del Showcase (la rutina
busca prensa, premios, festivales y obra publicada de un artista y deja evidencias propuestas). Gobierno decidido: solo administración; nada de lo
que escriba la rutina sobre un artista sale de Administración; todo nace propuesta hasta que una persona lo acepta.

## Lo averiguado del Sistema de Información Cultural (SIC)

- Sus datos abiertos (sic.cultura.gob.mx/datos.php) **no tienen CSV de creadores**: `opendata/d/24_artista_directorio.csv`,
  `…gpo_artistico…` y los de estímulos (FONCA, FECA, PACMYC) responden 404. Sí hay `festival` (sin municipio) y `educacion_artistica` (con
  municipio y sitio), en Latin-1 como los de espacios.
- Las listas de **«Grupos artísticos»** y **«Artistas»** están en páginas públicas por estado (`lista.php?table=gpo_artistico&estado_id=24`), en
  UTF-8, en bloques por municipio con el nombre, la disciplina y la ficha de cada uno. San Luis Potosí: 22 grupos en el estado, 17 en el municipio;
  Oaxaca: 20 en Oaxaca de Juárez; Ciudad de México: ninguno. «Artistas» salió vacía en los tres estados; se lee igual por si otro la tiene.
- La ficha de cada grupo trae domicilio, teléfonos y correos: **no se abre**; con la lista basta para una ficha mínima. Uso: el SIC pide «los
  créditos correspondientes»; la propuesta guarda el enlace a su ficha del SIC.

## Qué cambió

**«Buscar artistas»** (`src/lib/rutinas/artistas.ts`, registrada en el motor junto a lugares y agendas). Las claves son las de la hoja de Ciudades
(`padrones`, `festivales`, `web`, sin tocar `ciudadesAdmin.ts`) y el orden es el del founder, los catálogos primero. Un paso hace una tarea:

1. `padrones` · catálogos y padrones oficiales:
   - **SIC** (gratis, `src/lib/rutinas/sicArtistas.ts`): las listas de grupos artísticos y de artistas del estado, filtradas por el municipio de la
     ciudad, sus alias o sus alcaldías; lo de un municipio vacío no entra. El estado sale del centro de la ciudad con Mapbox o, si no, de su nombre
     («San Luis Potosí», «Ciudad de México», «Oaxaca»).
   - **Catálogos guardados**: cada catálogo de artistas de la ciudad en `configuracion` con la clave `catalogos_artistas_<slug con guiones
     bajos>` se lee con la lectura web acotada a su sitio (3 páginas), diciéndole al modelo qué páginas ya se leyeron: la siguiente corrida sigue
     por donde se quedó (recuerda hasta 60 páginas; si un catálogo ya no da páginas nuevas, queda «agotado»). Dos por corrida.
   - **Buscar catálogos** si no hay catálogos que leer o la última búsqueda tiene más de 90 días: 2 búsquedas («catálogo de artistas
     <ciudad>», «directorio de artistas <estado>») y 2 páginas; guarda hasta 3 catálogos nuevos y propone los artistas de lo que abrió. **El CAPO de
     San Luis va sembrado como «importado»**: ya están sus 520 artistas (`scripts/capo`), así que la API no lo relee.
   - **Padrón y estímulos**: el padrón o registro estatal de creadores y las listas de seleccionados del PECDA y del FONCA (SACPC) del año pasado y
     este, con la búsqueda y la lectura acotadas a `gob.mx` (2 búsquedas, 2 páginas o PDF). Solo quienes la lista ubica en la ciudad o en ningún
     municipio.
2. `festivales` · la programación de los festivales de la ciudad (los festivales del estado en el SIC van como pista; 2 búsquedas, 2 páginas;
   solo artistas de la ciudad, no los invitados de fuera) y los grupos representativos de las escuelas y facultades de arte (las escuelas del SIC
   de la ciudad con su sitio: lectura acotada a esos sitios, 3 páginas; sin ellas, 1 búsqueda). Nunca docentes ni estudiantes como personas.
3. `web` · al final, dos búsquedas «artistas de <disciplina> en <ciudad>» de **las dos disciplinas con menos artistas en la ciudad** (las que más
   faltan; en una ciudad nueva, música y artes visuales).

- **Cada candidato** (contrato de `propuestas.datos`, comentado en `src/lib/propuestas.ts`): `nombre`, `disciplina` (una de la app), `detalle` (su
  especialidad, hasta **40** como la ficha), `tipo` (solista · grupo · colectivo), `ciudad` (el nombre), `redes` solo si la fuente las da, `url` de
  la fuente y `leida`; además `municipio` (lo que dijo la fuente) y `obra` (una frase propia de hasta 200 sobre lo que la fuente dice de su obra),
  que **no** van a la ficha mínima que nace al aceptar: quedan para nutrirla después. `fuente` es el nombre con el que agrupa la bandeja: «Sistema de
  Información Cultural», el nombre del catálogo, «Catálogos de artistas», «Padrones y estímulos», «Festivales», «Escuelas de arte», «Búsqueda web».
- **Sin repetidos** (`src/lib/rutinas/nombresArtistas.ts`, contadores en `resumen.descartados`, nunca nombres): `ya_existe` (en `artistas` de la
  ciudad y sus alias, también los ocultos, con sus variantes: «&» como «y» y sin la «y», el nombre artístico entre comillas solo y el nombre sin él,
  y sin el artículo o «Grupo/Colectivo/Banda/Compañía/Ensamble» delante), `ya_propuesto` (en cualquier corrida de la ciudad, o en esta misma),
  `rechazado_antes` (manda sobre lo demás), `fuera_de_la_ciudad` (otro municipio; con alcaldías, otra alcaldía), `sin_fuente` (sin una página que la
  rutina haya visto de verdad no se propone) y `de_mas` (más de 40 por tarea: llegan en la siguiente corrida).
- `resumen`: `paso` («2 de 3 fuentes»), `avance`, `propuestos`, `duplicados`, `errores`, `descartados`, `por_fuente` (propuestos y USD),
  `busquedas_web`, `catalogos_leidos`, `cortadas`, `avisos` y `tope`. El tope corta las llamadas que siguen (lo gratis ya quedó propuesto) y
  Corridas pinta «Llegó al tope» como en las otras rutinas.

**«Investigar»** (`src/lib/rutinas/showcase.ts`, la única rutina sin ciudad: la corrida `showcase` lleva `parametros.artista_id`). Cuatro búsquedas
cortas —premios, becas y convocatorias; prensa; festivales y presentaciones; obra publicada—, cada una **una** búsqueda con el nombre entre comillas,
su disciplina y su ciudad, y como mucho dos páginas, con los sitios de redes bloqueados en las dos herramientas. Propone evidencias en
`showcase_evidencias` con la llave de servicio (`leida_por = 'rutina'`, `estado = 'propuesta'`, sin autor), con su señal (circulación, obra o
actividad: el vínculo con la app sale de la ficha, nunca de la web), su tipo (presentación, obra, premio, beca o prensa: nada de «redes»), una frase
propia, la fuente, el enlace y la fecha si la página la da. Contra el §4.4 de la investigación del 20 de octubre:

- **Nunca inventa:** una evidencia entra solo si su enlace es **la misma página** que la rutina buscó o leyó (no basta el mismo sitio); si no,
  `sin_enlace_verificado`. La base vuelve a exigir el enlace http(s).
- **Homónimos:** el modelo dice qué confirma que es este artista (ciudad, disciplina o las dos); si solo coincide el nombre, `homonimo_dudoso`.
- **Redes:** fuera también si aun así llega (`redes`). **Repetidos:** un enlace rechazado antes no vuelve; el mismo enlace con la misma señal,
  tampoco. Como mucho 6 por llamada y 20 por corrida. Una fecha que no existe queda vacía.
- `resumen`: `paso` («2 de 4 búsquedas»), `avance`, `propuestas`, `descartados`, `por_tema`, `busquedas_web`, `tope`.

**El motor** (`src/lib/rutinas/motor.ts`, lo mínimo): «artistas» junto a lugares y agendas; «showcase» en un registro aparte de rutinas sin ciudad
(no lee `ciudades`); los dos con pasos de hasta 120 s (una llamada que abre catálogos o páginas tarda más que una búsqueda corta; la corrida ya queda
ocupada 320 s y la ruta vive 300). Un tipo sin rutina sigue fallando con «Este botón todavía no tiene rutina».

**La ficha de showcase** (`/admin/showcase/[artista]`): un grupo **«Investigación»** con el renglón «Investigar», justo antes de «Por revisar»
(`InvestigarFicha.tsx`). El renglón dice cómo va: «Prensa, premios, festivales y obra publicada» sin investigar; «Investigando · por empezar ·
0,00 de 1,00 USD»; «Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD» con su barra; «Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD»
(o «todo revisado», «sin evidencias nuevas», «llegó al tope»); «No se pudo investigar el 21 oct · 0,12 USD»; «Cancelada el 21 oct»
(`textoInvestigar` en `src/lib/showcase.ts`). Abre la hoja del prototipo firmado (OL-425): qué hace, «Dónde busca, en este orden», «Tope de gasto
(USD)» con 1,00 y su ✕, el estimado y el crédito que queda, y Cancelar · Investigar; con una en curso, la hoja solo la dice. La acción
`investigar` (`src/app/admin/showcase/acciones.ts`) comprueba que es administración, que el tope vale (`leerTope` de Ciudades, solo importado) y
que no hay otra del mismo artista pendiente o corriendo, crea la corrida con la sesión y pide su primer paso después de responder, como la hoja
«Correr». La ⓘ explica qué hace y cuánto cuesta (`data-ayuda="investigar"`) y el manual tiene su entrada. Al cargar la ficha, si su corrida se
quedó varada, el servidor pide su paso (la red de seguridad de OL-429). Las evidencias que trae llegan a «Por revisar», que ya existía.

**Lo que no cambia:** ninguna pantalla de Ciudades, de Corridas ni de la portada; la hoja de Ciudades para artistas sigue igual; ninguna variable
nueva. `src/lib/propuestas.ts`: solo el comentario del contrato y el tope del detalle de un artista a 40 al aceptarlo (con 60, `validarArtista` no lo
dejaría aceptar); la tarjeta de la bandeja no cambia.

## Costo estimado (precios de la guía de la API: Sonnet 5.5 a 2 USD el millón de entrada, 0,20 la lectura de caché y 10 la salida; búsqueda web, 10 USD cada 1 000; la lectura web, solo sus tokens)

Supuestos a confirmar con la primera corrida real (`resumen.por_fuente.*.usd` y `resumen.por_tema.*.usd`): las reglas, las herramientas y lo que se
le dice de la ciudad (con hasta 200 nombres conocidos) suman unos 4 000 tokens; cada búsqueda trae unos 6 000 y cada página leída hasta 20 000 (en
«Investigar», 10 000); la API relee el contexto en cada vuelta de la búsqueda; el modelo escribe de 1 000 a 3 000 tokens.

| «Buscar artistas» (San Luis, la primera vez) | Llamadas | USD |
|---|---|---|
| SIC (listas del estado) | 0 | 0 |
| Buscar catálogos (2 búsquedas, 2 páginas) | 1 | 0,17–0,21 |
| Padrón y estímulos (2 búsquedas, 2 páginas o PDF) | 1 | 0,17–0,21 |
| Festivales (2 búsquedas, 2 páginas) | 1 | 0,17–0,21 |
| Escuelas de arte (3 páginas) | 1 | 0,12–0,18 |
| Búsqueda web (2 búsquedas, 2 páginas) | 1 | 0,17–0,21 |
| **Corrida** | **5** | **≈ 0,80–1,00** |

Las siguientes corridas leen además uno o dos catálogos guardados (0,15–0,21 cada uno) y no vuelven a buscar catálogos hasta 90 días después:
≈ 0,80–1,25. En el peor caso, con las cinco llamadas cortadas por tiempo, 1,50 estimados. La hoja de Ciudades dice «Se estima entre 1 y 3 USD»: sigue
siendo cierto. **Pasos:** 1 (SIC) + 5 a 7 (una llamada por paso) = de 6 a 8; cada paso con la API tarda de 20 s a 1,5 minutos: de 3 a 8 minutos
encadenados.

| «Investigar» un artista | Llamadas | USD |
|---|---|---|
| Cada tema (1 búsqueda, hasta 2 páginas de 10 000 tokens) | 1 | 0,07–0,09 |
| **Corrida** (4 temas) | **4** | **≈ 0,28–0,36** |

Con todo cortado, el tope de 1,00 lo detiene antes de la cuarta (cada corte se anota en 0,30). La hoja dice «Se estima entre 0,20 y 0,60 USD».
**Pasos:** 4, de 1 a 3 minutos.

## Decisiones por confirmar (founder o gestor)

1. **Sin migración.** «Una a la vez por artista» lo comprueba la acción; la base no lo impide (el índice único de corridas es por ciudad). Dos
   pestañas a la vez podrían dejar dos; cerrarlo del todo sería un índice único parcial en una migración que solo añade.
2. **El detalle de un artista hasta 40** (la ficha), no 60 como decía el encargo; lo que dice la fuente de su obra va aparte, en `datos.obra`.
3. **Tipo: solista, grupo o colectivo** (los tres de la app).
4. **Las claves de la hoja:** `padrones` lleva el SIC, los catálogos, el padrón y los estímulos; `festivales` lleva festivales **y escuelas de
   arte**. La hoja de Ciudades (OL-432) podría decir «Directorios de festivales y escuelas de arte».
5. **El CAPO de San Luis sembrado como «importado»**: la API no lo relee (lo hace mejor y gratis `scripts/capo`); la rutina busca otros catálogos.
6. **Catálogos guardados en `configuracion`**, dos por corrida, recordando las páginas leídas; buscar catálogos nuevos cada 90 días.
7. **Padrón y estímulos acotados a `gob.mx`.** Las listas estatales que no dicen municipio entran con el municipio vacío y decide la administración.
8. **Con alcaldías** (Ciudad de México): fuera solo lo que nombra otra alcaldía; «Ciudad de México» o nada, entra.
9. **Sin una página vista no se propone un artista** (más estricto que lugares, que deja pasar la propuesta sin enlace).
10. **La búsqueda web**, las dos disciplinas con menos artistas en la ciudad.
11. **«Investigar»:** cuatro temas de una búsqueda y dos páginas; el enlace tiene que ser la misma página vista; sin redes; el vínculo nunca de la
    web; 6 por llamada y 20 por corrida; tope por omisión **1,00** (el prototipo decía 0,20) y estimado 0,20–0,60.
12. **El renglón va en un grupo «Investigación» antes de «Por revisar»** (en el prototipo firmado era un botón al pie): lo que trae queda justo
    debajo. El botón de la hoja dice «Investigar» (el prototipo decía «Correr»).
13. **Pasos de 120 s** para artistas e «Investigar».
14. **Sin el respaldo de la API ante un rechazo** (`fallbacks`), como decidió el gestor en la bitácora 461 (punto 4).

## Evidencia (árbol sin `.env`; sin red en las pruebas)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde. `npm test`: **258 archivos, 4 252
  pruebas**, todas bien (4 archivos y 30 pruebas más que `main`). Nuevas: `nombresArtistas.test.ts` 11 (las variantes de un nombre; lo existente,
  propuesto y rechazado; la disciplina; la limpieza; el contrato de `datos` y que aceptarlo pasa `validarArtista`; las disciplinas que faltan),
  `sicArtistas.test.ts` 3 (la lista del SIC por municipio con su forma real y nombres inventados; una lista que no llega; las pistas de festivales
  y escuelas), `artistas.test.ts` 7 de punta a punta con el motor real, la base en memoria, el SIC y la API falsos (**los catálogos primero**: el SIC,
  buscar catálogos y el padrón con `gob.mx`, luego festivales y escuelas, la web al final con las disciplinas que faltan; **sin repetidos** con sus
  contadores exactos; el contrato de `datos`; **los catálogos guardados y reutilizados** en una segunda corrida sin volver a buscar ni repetir; **el
  tope** con «Llegó al tope»; **40 por tarea** y sin la llave de la API; **alcaldías** de Ciudad de México), `rutinas/showcase.test.ts` 4 (**la
  corrida sin ciudad**, que no lee `ciudades`, con sus cuatro búsquedas, las redes bloqueadas y **los textos de la ficha** a medio camino y al
  terminar; **evidencias propuestas** con su señal y **sin inventar**: la página no vista, el homónimo, las redes, lo rechazado y lo que ya tiene,
  contados; el tope; el artista que ya no está y sin la llave), `showcase.test.ts` +3 (cada estado del renglón, la barra, el crédito) y
  `acciones.test.ts` +2 (**«Investigar» crea la corrida y pide el paso**; una a la vez, el tope, solo administración). Cambiadas: el motor y la
  cadena (artistas y showcase ya tienen rutina).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, **2 207 comprobaciones**, 0 fallaron. Banco nuevo
  `supabase/tests/pg/rutina-artistas.test.mjs` (13, sin migración): la administración deja la corrida de showcase sin ciudad y una cuenta cualquiera
  no; «Buscar artistas» sí pide ciudad; el filtro por `parametros->>'artista_id'`; la base deja dos del mismo artista (por eso la acción lo mira); la
  evidencia de la llave de servicio nace propuesta y sin autor; sin enlace http(s) no entra; una cuenta cualquiera no la ve; al aceptarla queda
  quién y cuándo; los catálogos en `configuracion` (una clave con «:» o «-» no cabe); aceptar un artista propuesto crea la ficha mínima y `obra` se
  queda en la propuesta.
- **Ensayo contra PostgreSQL 17 + PostgREST 16 reales** (clúster propio en el scratchpad, puerto 55433, para no tocar la base compartida; las 103
  migraciones; `auth.uid()` como el de Supabase; la llave de servicio y la sesión de administración como JWT; API, SIC y Mapbox falsos), el motor
  real: «Buscar artistas» creada con la sesión de administración, 6 pasos hasta «Terminada» (5 llamadas), «Rosa y Luna» fuera por existir y «Banda
  Rechazada» por rechazada, los catálogos guardados con el `upsert` de PostgREST; aceptar a «Marta Solís» por el camino de la bandeja
  (`entradaDeArtista` → `validarArtista` → `aceptar_propuesta`) crea `{ letras, «Poesía», solista, San Luis Potosí }`; «Investigar» creada con la
  sesión (sus reglas por fila), encontrada por `parametros->>artista_id` antes y después, «4 de 4 búsquedas» hasta «Terminada», su evidencia guardada
  `propuesta`, `rutina`, sin autor; lo que lee la ficha (la última corrida del artista, el crédito, lo gastado) responde. La prueba del ensayo no se
  sube.
- `npm run inventario`: sin novedades. `npm run medir`: 49 pantallas × 4 anchos; cambian solo dos presupuestos, anotados con `--aceptar`:
  `s38-admin-showcase-ficha` de 181 a **190** nodos a 390 (el grupo «Investigación» y su renglón, 9 nodos) y `s39-admin-showcase-manual` de 74 a
  **78** (la entrada «Investigar»); la profundidad no cambia. Con `--letra=2 --solo=showcase`: sin novedades.
- `npm run test:componentes` completo: **672 de 672** (Chrome real), con tres nuevas en la ficha: la hoja dice qué hace y dónde busca, el tope de
  1,00 con su ✕, un tope que no vale no llega al servidor, «Investigar» llama a la acción y cierra; el error de la acción dicho en la hoja; con una
  en curso, el renglón con su barra y la hoja sin tope ni botón.

## Capturas (`docs/rediseno/capturas-465/`, Chrome real con playwright-core contra el respaldo local, 390×844 a 2×, el 21 de octubre a las 10:00)

Herramienta: `scripts/ops/auditoria-ui/capturar-investigar.mjs` (README de la auditoría al día). Datos inventados: las dos corridas, el crédito y
cinco evidencias de Pimpolina los añade un arranque propio (el fixture no cambia). Sin errores de página ni de consola; nada se sale del ancho (390).

- `01-ficha-investigar.png` (Feleal, 250 nodos en el `<main>`): bajo la barra, el grupo «INVESTIGACIÓN» con el renglón de la lupa, «Investigar» y
  «Prensa, premios, festivales y obra publicada» con su flecha; debajo, «POR REVISAR 2» con las dos propuestas de la rutina que ya traía el respaldo
  (la mención estatal y la nota de prensa) y el comienzo de «EN LA BASE · 2026». La ⓘ abajo a la izquierda.
- `02-hoja-investigar.png`: la hoja «Investigar a Feleal»: «Busca en la web premios, becas, prensa, festivales y obra publicada con su nombre, su
  ciudad (San Luis Potosí) y su disciplina. Solo propone lo que dice una página que abrió y leyó, con su enlace; tú lo aceptas. No lee redes.»;
  «Dónde busca, en este orden» con las cuatro palomas violetas; «Tope de gasto (USD)» con «1,00» y su ✕; «Se estima entre 0,20 y 0,60 USD: cuatro
  búsquedas. Al llegar al tope se detiene y guarda lo encontrado. Crédito: 195,10 USD · vence el 11 de noviembre.»; y «Cancelar» · «Investigar»
  (violeta) al pie.
- `05-ayuda-investigar.png`: la ⓘ abierta y el renglón tocado: el panel «Investigar» dice qué hace y cuánto cuesta («cuatro búsquedas con su
  nombre, su ciudad y su disciplina. Cuesta entre 0,20 y 0,60 USD, con un tope que tú eliges (1,00 por omisión)») y «Más en el manual ›»; la hoja
  no se abrió.
- `03-ficha-investigando.png` (0Backside0, 171 nodos): «Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD» (parte en dos renglones) y debajo la
  barra violeta a la mitad; luego «EN LA BASE · 2026», «REDES» y «NOTAS DEL CONSEJO». Sin «Por revisar» (esa corrida inventada no trae
  evidencias).
- `04-ficha-investigado.png` (Pimpolina, 207 nodos): «Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD» y, justo debajo, «POR REVISAR
  5» con «Beca · propuesta por la rutina — Seleccionada en un estímulo estatal a la creación en teatro, 2025», «Presentación · … En el programa de
  un festival de clown en Guadalajara» y el comienzo de la reseña de prensa, cada una con su fuente, su fecha, «leída por la rutina hoy» y
  Rechazar · Aceptar.

## Lo que se dejó fuera

- **Nutrir las fichas** (portada, descripción, redes): es otra etapa («luego iremos nutriendo sus fichas»); lo que sirve queda en `datos.url`,
  `datos.obra` y `datos.municipio`.
- **Las evidencias por revisar en «Pendiente» de la portada:** la portada cuenta filas de `propuestas` por corrida (`propuestasPorRevisar` en
  `ciudadesAdmin.ts` y `panel_ciudades`), y las evidencias viven en `showcase_evidencias`. Subirlas exige tocar `src/app/admin/page.tsx` o los
  archivos de OL-432, así que no se hizo; hoy se ven en «Por revisar» de la ficha. Lo mismo en Corridas: la corrida de «Investigar» sale como
  «Showcase», sin el nombre del artista (`tituloCorrida`, OL-432).
- **Releer el CAPO con la API** y **evidencias de redes** (Instagram pide sesión: siguen por CSV o a mano).
- **Que la lectura web abra los PDF del PECDA:** la guía de la API no lo confirma; si no los abre, la tarea propone lo que digan las páginas. A
  mirar en la primera corrida (`avisos`, `por_fuente.padrones`).
- **Ninguna llamada real** a la API, a Mapbox, al SIC ni a producción desde este árbol (lo averiguado del SIC se leyó con `curl` al scratchpad):
  la primera corrida real es del gestor.

## Para la primera corrida real (gestor)

1. Unir (sin migración ni variables). Antes de Oaxaca, mirar `select slug, nombre, alias from ciudades where slug='oaxaca'`: el SIC la escribe
   «Oaxaca de Juárez»; si ese alias no está, el SIC no trae nada de Oaxaca (lo demás sí).
2. **«Buscar artistas» en San Luis, tope 1,50 USD** (prueba los repetidos contra 686 artistas, el CAPO importado y los 17 grupos del SIC). Qué mirar:
   en Ciudades, «Corriendo · 1 de 3 fuentes · …» con su barra; en la base, `select estado, gasto_usd, resumen from rutinas_corridas where
   tipo='artistas' order by creado_en desc limit 1` (`descartados`, `por_fuente.*.usd` contra la tabla de arriba, `avisos`, `cortadas`) y `select
   valor from configuracion where clave='catalogos_artistas_san_luis_potosi'` (el CAPO importado y lo que encontró); en la bandeja, que cada fuente
   abra su página y que aceptar uno cree su ficha mínima. Después **Oaxaca, tope 2,00**, y Ciudad de México.
3. **«Investigar» con tope 1,00** primero en un artista del Showcase con trayectoria pública conocida (para comparar lo que trae con lo que ya se
   sabe) y luego en uno de nombre común (para ver que descarta homónimos). Qué mirar: la ficha pasa de «Investigando · 1 de 4 búsquedas» a
   «Investigado el … · N evidencias por revisar · … USD»; cada evidencia abre una página que dice lo que dice su título; `resumen.descartados`
   (`homonimo_dudoso`, `sin_enlace_verificado`) y `por_tema.*.usd`. Si aparecen `cortadas`, subir el paso de 120 s o bajar a una página por tema.
4. Para un paso a mano, como siempre: `POST /api/rutinas/correr?esperar=1` con `Authorization: Bearer $CRON_SECRET`.
