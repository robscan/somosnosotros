# 472 · Ligar a los artistas con sus eventos del año: cruce mejor por nombre y propuestas de artista desde las agendas (OL-440)

**Fecha:** 2026-10-21. **Rama:** `ligar-artistas`, desde `origin/main` (`cacfd6c5`). **Operador:** agente de la pieza (Claude Opus 5.5) para el
Gestor VII, sin otros agentes. **Migración:** `20261021190000_aceptar_liga_eventos.sql` (solo añade: `create or replace` de `aceptar_propuesta`).
**Variables de entorno:** ninguna. **Pantallas:** ninguna cambia (sin capturas). **Estado:** lista para la revisión del gestor; falta la corrida
real del guion (`--simular` y luego sin él), que solo puede hacer el gestor con el `.env`.

## El pedido

El founder preguntó si el Showcase «ya está alimentado con los eventos que se acaban de subir desde enero» y «si ya nutre a los artistas», y dijo
«arranca» a la propuesta del gestor. Los eventos de las agendas de enero a octubre ya están en producción (`eventos.origen = 'agenda-secult-2026-MM'`),
pero el importador solo ligaba un nombre a la ficha con el **nombre exacto**: de los 254 nombres distintos que la lectura sacó de 271 eventos, 31
tenían ficha (20 artistas ligados en 55 eventos) y los 223 sin ficha se perdían. Esta pieza liga mejor lo que tiene ficha y propone lo que no.

## Qué cambió

**1. El cruce por nombre** (`src/lib/cruceArtistas.ts`, nuevo y puro, con `src/lib/cruceArtistas.test.ts`). Reutiliza `clavesDeNombre` de OL-430
(`src/lib/rutinas/nombresArtistas.ts`) y `normalizarNombre`. Un nombre se cruza por niveles, del más seguro al menos; el primero que da algo
decide y, si da dos fichas, es **ambiguo** y no se liga:

1. **igual**: las formas de OL-430 (acentos, mayúsculas, «y/&», comillas, «Los/Grupo» delante) más sin «Dr.», «Mtra.»…, «y sus» como «y» y, en un
   grupo, sin preposiciones y con la ciudad o «Gobierno del Estado» como una sola marca: «Orquesta Sinfónica de San Luis», «… de San Luis Potosí» y
   «… del Gobierno del Estado de San Luis Potosí» son la misma; «Mariachi de Gobierno del Estado» = «Mariachi del Gobierno del Estado de San Luis
   Potosí»; «Banda Sinfónica del Estado» = «Banda Sinfónica de Gobierno del Estado». Las formas de la ciudad salen de su nombre (entera, «san luis»,
   «potosi», «slp», «s l p») y su gentilicio (`formasDeCiudad`).
2. **parte**: un nombre de un alias, de un lado o del otro: «La Lupita · Irma Zamora» = «La Lupita».
3. **apellidos**: una persona con uno o dos apellidos de más, si lo corto termina en apellido (una lista de nombres de pila evita «José Luis» =
   «José Luis Mendoza» y «Miguel Ángel» = «Miguel Ángel Ortega»). **grupo**: el nombre propio de un grupo (dos palabras propias o más) entero en
   el de otro grupo: «Dr. Chessani y sus Huapangueros de Rioverde» = «Chessani y sus Huapangueros» = «Los Huapangueros de Rioverde»; «Grupo de
   Danza Folclórica X» = «… X del IPBA». No cuenta lo que se lee como persona («Juan Pérez» no es «Juan Pérez y su Banda») ni una institución
   («Escuela Estatal de Iniciación Musical…» no es su orquesta de guitarras).
4. **integrante**: una persona (nombre y apellido) que la ficha de un **grupo o colectivo** nombra en su detalle o su descripción: «Carlos de Santos»
   y «Óscar Loredo» con Pargazz si su ficha los nombra (la tabla no tiene alias; la descripción hace de alias).

Varias personas en un texto («Carlos de Santos y Óscar Loredo») se cruzan cada una; un grupo con «y» («X y Y» de una palabra, «… y sus …») no se
parte. **Nunca por parecido de letras**: una errata de una letra o un nombre acortado (como «Xia» por «Xiadani») quedan aparte (mejor una
propuesta de más, que se rechaza como duplicado, que dos personas en una ficha). Además, `fichaDelTitulo`: la ficha que un **tramo del título**
nombra («Gitanos mexicanos 2ª edición: PARGAZZ» → Pargazz), con el mismo nombre y **la misma disciplina que el evento** (`disciplinaDeEvento`:
concierto → música, obra → teatro, exposición → artes visuales, presentación de libro → letras…); una ficha «por completar» o sin disciplina del
evento no se liga por título.

**2. Las próximas cargas** (`src/lib/cargaEventos.ts` · `artistasDelEvento`, y `scripts/instituciones/importar-eventos.ts`). El importador ya no
compara el nombre exacto: liga con el cruce y con el título, una vez por ficha, y su informe dice cómo («Pargazz (integrante del grupo: «Carlos de
Santos», «Óscar Loredo»)») y trae una sección nueva con los nombres sin ficha, ambiguos u ocultos. No crea artistas: eso lo hace el guion.

**3. El guion para la Mac** (`scripts/instituciones/ligar-artistas.ts`, corre con `correr.mjs`, que acepta el paso nuevo; `entorno.ts` solo cambia
el texto de uso). Lee los JSON privados de la lectura (`eventos-enero.json`, `eventos-2026-02.json`… en la carpeta; ignora los `.lectura.json`) y
de la base los eventos, lugares y artistas de San Luis, las ligas de esos eventos y las propuestas de artista de las corridas de la ciudad (de mil
en mil). Empareja cada fila con su evento: el de las agendas con el mismo título ese día y la hora más cercana o, si la fila no entró por parecida
a uno que ya estaba, ese (`parecidoGuardado`, la regla del importador). Luego:

- **liga** en `eventos_artistas` lo que tiene ficha (cruce y título), sin repetir ligas y con el orden detrás de los que ya tenía el evento;
- por lo que **no tiene ficha**, una corrida `artistas` de San Luis ya **terminada** (a nombre de `--autor`, que debe ser admin; `gasto_usd` 0,
  `tope_usd` 0,01 porque la tabla lo pide mayor que 0; `inicio` = `fin` = ahora; `parametros` y `resumen` con contadores) y **una propuesta por
  artista**: los nombres de más a menos eventos y cada uno cruzado contra lo propuesto (así las variantes se juntan y la forma más usada da el
  nombre). `fuente` «Agenda de la Secretaría de Cultura»; `datos`: `nombre` (hasta 80, cortado en un espacio), `disciplina` (la del nombre o sus
  variantes; si no, la de su papel en la agenda; si no, la que más se repite en sus eventos; si nada, «por_completar»), `detalle` (lo que la agenda
  dice: «Trío de son jarocho», «Clarinete», «Sax soprano», «Solista», «Ensamble alemán»; los ensambles del Estado, «Ensamble del Gobierno del
  Estado»; nunca una frase que atraviese el nombre de otro artista), `tipo` (solista, grupo o colectivo por el nombre, sus variantes o su papel),
  `ciudad` «San Luis Potosí», `redes` [], `url` (el PDF del primer evento), `leida` (la fecha del archivo de la lectura), `eventos` (los ids, por
  fecha) y `variantes` (las otras formas del nombre, si hubo);
- lo **ya propuesto sin decidir** (de cualquier corrida de la ciudad) suma sus eventos a `datos.eventos` de esa propuesta; lo **rechazado** no
  vuelve; un nombre de una **ficha oculta** no se liga ni se propone; uno **ambiguo** no se adivina; uno que **no parece un artista** (un club, una
  asociación o «A.C.», una delegación, una escuela o un museo; «Alumnos/Alumnado…»; «Talleres…», «Compañías…» en plural) no se propone.

`--simular` solo lee e imprime; sin él escribe y, si fallan las propuestas, la corrida queda «fallida» con su razón (las ligas y lo demás siguen).
**Correrlo dos veces no repite nada** (probado): las ligas hechas se saltan, lo propuesto solo suma eventos nuevos y sin propuestas nuevas no hay
corrida nueva. El informe (Markdown) va a `--salida` con el archivo de ids para deshacer.

**4. La migración** (`supabase/migrations/20261021190000_aceptar_liga_eventos.sql`). `create or replace` de `aceptar_propuesta` con la misma firma y
permisos: lo nuevo es que, al crear un **artista**, inserta en `eventos_artistas` los ids de `datos.eventos` **que existen** (lo que no es un uuid o
no es un evento se ignora; `on conflict do nothing`), cada uno con el siguiente orden de su evento, y devuelve `eventos_ligados`. Lo demás, igual
(lugar, evento, propuesta ya decidida). La bandeja (OL-432/434/438) ya la llama: al aceptar una propuesta del guion, la ficha nace ligada a sus
eventos sin tocar la pantalla. `eventos_artistas` no tiene disparadores: ligar no manda avisos.

**5. La base falsa de las pruebas** (`src/lib/rutinas/baseFalsa.ts`): `range(desde, hasta)`, como PostgREST.

## Decisiones por confirmar (gestor o founder)

1. **La fuente es una sola**, «Agenda de la Secretaría de Cultura», y el PDF del primer evento va en `datos.url`. Leí «`fuente` = «Agenda…» + URL
   del PDF» como las dos cosas por separado: así la bandeja las agrupa en una fuente y «Aceptar las N» las toma juntas. Si se quiere la URL en la
   fuente, serían diez fuentes (una por mes) y la columna admite 120 caracteres.
2. **No se proponen 13 nombres que no parecen artistas** (7 alumnados, 4 instituciones o asociaciones, 2 «varios grupos»): quedan en el informe.
3. **La ficha que nombra el título se liga** (con el mismo nombre y la misma disciplina que el evento). El informe la marca «nombrado en el título».
4. **«Gobierno del Estado» = la ciudad en los grupos**: une «Camerata de Gobierno del Estado» con «Camerata de San Luis» (y la Orquesta, el
   Mariachi, la Banda Sinfónica con sus variantes). «Banda de Música» y «Banda Sinfónica» siguen siendo dos.
5. **Una ficha oculta no recibe ligas** (antes el importador sí ligaba una oculta con el nombre exacto): la administración la ocultó por algo.
6. **El guion actualiza `datos.eventos` de propuestas de otras corridas** (p. ej. una de «Buscar artistas» de OL-430 sin decidir): así, al
   aceptarla, también nace con sus eventos.
7. **Los integrantes también se proponen** si no tienen ficha: si la ficha de Pargazz no los nombra, Carlos de Santos y Óscar Loredo llegan como
   propuestas (el evento se liga a Pargazz por el título de todos modos).
8. **Sin parecido de letras**: erratas y variantes de un solo carácter (un plural, una letra doblada) quedan como dos propuestas. Con datos
   reales, unas 5 parejas; el que acepta rechaza la segunda como «duplicado».
9. **`leida` es la fecha del archivo de la lectura** (los `.lectura.json` no guardan cuándo se leyó). **El tope de la corrida es 0,01 USD** (la tabla
   lo pide mayor que 0; una búsqueda terminada no lo enseña).

## Lo que imprimiría `--simular` y el comando para el gestor

Desde la carpeta principal (la que tiene el `.env`), con el id de la cuenta de administración del gestor y el informe en la carpeta privada:

```
cd /Users/apple-1/Proyectos/somosnosotros/somosnosotros && node scripts/instituciones/correr.mjs ligar-artistas \
  /Users/apple-1/Proyectos/somosnosotros/privado/investigaciones/mapeo-anual-2026 --autor <id del admin> --simular \
  --salida /Users/apple-1/Proyectos/somosnosotros/privado/investigaciones/mapeo-anual-2026/ligar-artistas
```

Imprime una línea de cifras («Eventos leídos 1113 (271 nombran artistas, 254 nombres distintos) · emparejados con su evento N (M con uno
parecido que ya estaba) · sin evento K con artistas · se ligarían L (a F fichas; Y ya estaban) · se propondrían P artistas con E eventos ·
propuestas que suman eventos A · rechazados antes R · no parecen artistas 13 · fichas ocultas O · parecidos a varias Z»), **los 20 nombres con
más eventos** con lo que se hace con cada uno («ligado a «…»», «propuesto», «propuesto junto con «…»», «ya propuesto como «…»: se le suman sus
eventos», «no se propone: …») y la ruta del informe completo (por ficha, cada evento que se liga; cada propuesta con disciplina, tipo, detalle y
variantes; lo que no se liga ni se propone, con su razón; y las filas con artistas cuyo evento no está en la base). Para escribir, el mismo
comando **sin `--simular`**. No lo pude correr: este árbol no tiene `.env` y no se lee producción.

**Ensayo en seco con los JSON reales y sin base** (en `node_modules/.cache`, fuera de git): suponiendo que cada fila tiene su evento y que **ningún**
nombre tiene ficha, el guion propondría **230 artistas con 255 eventos** (40 con dos eventos o más; 9 juntan variantes) y dejaría fuera 13. Por
disciplina: música 127, danza 37, letras 26, teatro 22, artes visuales 1, por completar 17; por tipo: 142 solistas, 75 grupos, 13 colectivos;
42 con detalle de la agenda. El primero, la Banda de Música de Gobierno del Estado con 37 eventos («Ensamble del Gobierno del Estado»); la
Orquesta Sinfónica junta sus tres formas (25 eventos), la Camerata dos (22), el Mariachi dos (7). Con la base real, los nombres con ficha
(31, con sus variantes) se ligan en vez de proponerse y lo ya ligado por la carga se salta, así que se esperan **unas 200 propuestas**.

## Evidencia (árbol sin `.env`; nunca producción)

- `npm run lint`: 0 errores (1 aviso que ya estaba, `src/components/VisorImagen.componentes.test.mjs`). `npm run typecheck`: en verde.
- `npm test`: **4 480 unitarias en 267 archivos, 0 fallaron** (127 nuevas): `src/lib/cruceArtistas.test.ts` (77: 26 pares que se unen, 24 que no
  —en los dos sentidos—, varias personas, integrantes, ambiguo, el nivel que manda, el índice que crece, la ciudad, el título y la disciplina del
  evento), `scripts/instituciones/ligar-artistas.test.ts` (48: lectura de la carpeta, emparejado, detalle, disciplina, tipo, lo que no se propone,
  `armarPlan` con un JSON y una base falsos, `leerBase` y `escribirPlan` con la base falsa, la segunda corrida que no repite nada y la corrida
  fallida) y `src/lib/cargaEventos.test.ts` (2 de `artistasDelEvento`). Los nombres de personas de las pruebas son inventados (salvo los ejemplos
  del encargo): la lectura de las agendas es privada.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **104 migraciones, 2 235 pruebas, 0 fallaron**. Banco nuevo
  `supabase/tests/pg/aceptar-liga-eventos.test.mjs` (10): liga los dos eventos que existen e ignora un uuid sin evento, un texto y un número;
  el orden detrás del artista que ya estaba; una cuenta sin administración no acepta; aceptar dos veces no liga dos veces; sin `eventos` o con
  algo que no es una lista, como antes; un evento borrado después de proponer se ignora; una rechazada no crea ficha ni liga. **Control
  negativo:** sin la migración (103), 8 de esas comprobaciones fallan.
- `npm run inventario`: sin novedades. `npm run medir`: 52 pantallas × 4 anchos, sin novedades. `npm run test:componentes`: **686 de 686**.
- `node scripts/instituciones/correr.mjs ligar-artistas <carpeta> --autor … --simular` en este árbol: compila y se detiene en «Falta
  NEXT_PUBLIC_SUPABASE_URL en .env» (sin tocar ninguna base). El importador compila con el cruce nuevo.

## Lo que no se hizo

- Correr el guion contra producción (es del gestor, con el `.env`); tampoco se tocaron pantallas: la bandeja ya muestra las propuestas de artista.
- Unir por parecido de letras (erratas) ni por plural/singular: lo deja a quien acepta (decisión 8).
- Ligar por el título cuando la ficha está «por completar» o el evento no dice su disciplina.
- `src/app/admin/ciudades/*`, `src/lib/propuestas.ts` (OL-438), `src/app/admin/showcase/*` y `src/lib/showcase.ts` (OL-439): sin tocar. El Showcase
  lee `eventos_artistas`, así que en cuanto el gestor corra el guion y se acepten las propuestas, la circulación de OL-437 cuenta esos eventos.
