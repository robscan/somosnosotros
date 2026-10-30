# 525 · OL-493 · Administración más simple: cinco bloques en la portada y la pantalla de Instagram (prototipo, espera firma)

**Fecha:** 2026-10-29. **Rama:** `admin-simple` (desde `origin/main` `3f4b51d1`). **Quién:** operador del Gestor de cambios VII (agente en árbol
aislado, sin subagentes). **Sin código de la app ni migración.** **Estado:** prototipo listo para la firma del founder.

Entrega: `docs/rediseno/prototipos/admin-simple.html` (se abre con doble clic), capturas en `docs/rediseno/capturas-525/`, guiones en
`scripts/ops/auditoria-ui/prototipo/admin-simple.mjs` (arma el prototipo), `admin-simple.plantilla.html` (el armazón) y
`capturar-admin-simple.mjs` (medición, capturas y recorrido); `maqueta-pantalla.mjs` suma diez pantallas `simple-*`.

## El pedido

Founder (2026-10-29): «la versión de admin ya está bastante compleja… simplificar, reestructurar la arquitectura de las secciones… los pendientes
en el primer nivel está muy bien; después los KPIs, podrían caber 3 por fila, cuestiónalo; los KPIs de CAPO ya no aplican… luego gestión;
Instagram con una sola opción; grafo cultural, ciudades y showcase: agrupar diferente… lo va a administrar cualquier administrador sin
experiencia e incluso con pocas habilidades digitales». Y de Instagram: que arranque con la ciudad del administrador, que la conexión ya hecha
no ocupe la pantalla (un botón a la altura del filtro de ciudad) y que la semana vacía muestre la lista de eventos. El gestor propuso la
estructura y él dijo «adelante».

## La misión

Al abrir Administración, una sola pregunta: **¿qué tengo que atender hoy?** Lo demás a un toque, con palabras de todos los días, sin que la
pantalla pida entender el sistema.

## Cómo se hizo

Sobre la pantalla real (regla de OL-409): la app compilada contra el respaldo local (reloj fijo del mié 7 de oct, cuenta de administración,
`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, con y sin `RESPALDO_INSTAGRAM_CONEXION=todo`) y guardada con `maqueta-pantalla.mjs
--solo=simple-`. El prototipo mete esos cuerpos en un `iframe` con el CSS servido tal cual y solo mueve o copia piezas que existen, con sus
clases de producción: `admin/indicador` y su desglose, `Renglon/ajuste` en `Renglon/tarjeta`, el embudo, las cifras del CAPO, `ui/Hoja` con
título, `ui/Cabecera`, `ui/BotonIcono` con el punto de la barra de la app (`Sesion/punto`), `admin/puede`, `ui/Boton`, `Lista/conteo` y el
renglón «Falta material». Esta compilación nombra las clases `<hash>_<clase>` sin el nombre del módulo; el guion deduce el hash de cada módulo
por sus clases (falla si una clase no existe, así nada se inventa). Lo nuevo, en ocho reglas con prefijo `as-`. Símbolo SN del arte final en
las notas.

## La estructura propuesta y lo que medí

| Bloque | Qué tiene | Cambio frente a hoy |
| --- | --- | --- |
| Pendiente | Lo que pide una acción (como hoy) | Ninguno |
| Esta semana en números | Cuatro cuadros y «Ver todos los números» | Antes «Últimos 7 días» con 7 cuadros |
| Gestionar | Personas, Lugares, Eventos, Artistas, Obras colectivas | Obras colectivas entra (en C, va a Herramientas) |
| Difusión | Instagram, Showcase | Dos rótulos de un renglón cada uno → un grupo |
| Herramientas | Ciudades, Rutinas, Grafo cultural | Tres rótulos (y el interruptor y Corridas) → un grupo |

La hoja «Todos los números» (ui/Hoja con título) guarda lo que sale de la portada, sin borrar nada: los otros cuadros de 7 días (Personas
activas, Coincidencias, Agenda de la semana, Publica la comunidad, Primera publicación, y Avisos abiertos en B y C), «Cómo va la comunidad»,
«Fichas» y **«Campañas pasadas»**: el CAPO con su medición entera y la nota «Invitaciones por correo a las fichas del catálogo del CAPO. Ya no
se mandan; su medición se queda».

**Medición** (`capturas-525/medicion.txt` y `.json`; 19 estados × 320, 390, 430, 768 y 1024): **0 textos cortados, 0 desbordes, 0 toques fuera
de la pantalla y 0 toques menores de 44 px en lo nuevo**, en todos. Portada:

| | Rótulos | Pantallas de alto (390) | Nodos |
| --- | --- | --- | --- |
| Hoy | 12 | 3,7 (4,1 a 320) | 238 |
| A, B o C | 5 | 2,0 (2,2 a 320; 1,8 B) | 141 (B 135) |

### ¿Tres por fila es viable? No en el teléfono

Mismo cuadro (`admin/indicador`, sin tocar su relleno ni su letra), medido:

| Ancho | A · 2 por fila: texto / renglones de la frase / alto | B · 3 por fila: texto / renglones / alto |
| --- | --- | --- |
| 320 | 110 px / 3 / 169 px | **62 px / 5 / 222 px; «administración» se sale del cuadro** |
| 390 | 145 px / 2 / 151 px | 85 px / 4 / 186 px |
| 430 | 165 px / 2 / 141 px | 99 px / 3 / 169 px |
| 768 | los cuatro en una fila: 118 px / 3 / 169 px | 169 px / 2 / 141 px |
| 1024 | los cuatro en una fila: 118 px / 3 / 169 px | 169 px / 2 / 141 px |

A 390 los tres cuadros miden 35 px más que los de dos por fila y la frase se vuelve una columna de palabras; a 320 una palabra no cabe. Tres
por fila además obliga a tener tres o seis números (cuatro dejan uno huérfano abajo), así que B saca «Avisos abiertos» a la hoja. En tableta la
rejilla de A (`repeat(auto-fit, minmax(136px, 1fr))`) pone **los cuatro en una sola fila** sin tocar nada, que es mejor que tres más uno. Los
nombres de dos palabras («Personas nuevas», «Voy y Me interesa») se parten en dos renglones en B a 390. **Veredicto: dos por fila en el teléfono,
cuatro por fila desde tableta (A).**

### ¿Cuáles cuatro números mueven decisiones hoy?

De `panel_resumen`, `panel_aportes` y `panel_avisos` (respaldo: 80 cuentas, 37 eventos en 7 días, 18 de 71 lugares con fecha):

- **Personas nuevas** (`gestionar.personas_nuevas`, 3): ¿llega gente? Mueve la difusión. Hoy no tiene comparación con la semana anterior (la base
  no la guarda): el cuadro sale sin «▲».
- **Eventos de la comunidad** (`ahora.comunidad_nuevos`, 3): ¿la gente publica sola? Mueve a quién invitar a publicar. Tampoco trae la cifra de
  la semana anterior.
- **Voy y Me interesa** (`aportes.gestos_ahora`, 18, ▲ 5): ¿la agenda le sirve a alguien?
- **Avisos abiertos** (`avisos.abiertos`, 11 de 48): ¿llegan los avisos? Es un número del producto: una persona de administración no puede hacer
  nada con él esta semana.

Propongo en **C** cambiar el cuarto por **Eventos esta semana** (`ahora.eventos_semana`, 37 «en 18 de 71 lugares», ▲ 2): es el único que la
administración mueve con sus manos (buscar agendas, pedir fechas a los lugares sin fecha). Avisos abiertos se queda en la hoja.

### ¿Showcase es difusión o herramienta?

Difusión. Su propósito es presentar artistas a foros, gestores, becas y mecenas (encargo del 19 de oct): dar a conocer, como Instagram. Su
trabajo de investigación (evidencias por aprobar) ya sube solo a Pendiente. Va con su frase llana: «Artistas para presentar a foros · 16
candidatos · 2 invitados».

### ¿Obras colectivas es gestión?

No. Es Pincel: una actividad que se prende en un evento (pintar juntos sobre una pared proyectada), no una lista de fichas que se revisan. En
Gestionar, junto a Personas y Lugares, una persona sin experiencia esperaría encontrar «las obras» como fichas. En **C** va a Herramientas; en A y
B se queda en Gestionar, como lo propuso el gestor.

### ¿Qué pierde una persona sin experiencia con cada opción?

- **A:** nada de lo que usa a diario; los números de la comunidad, Fichas y CAPO quedan a un toque («Ver todos los números»). Pierde ver el
  embudo sin buscarlo, que hoy está en medio de la portada sin nada que tocar.
- **B:** lee peor los cuadros (frases partidas en 4–5 renglones, una palabra fuera a 320) y pierde un número de la portada.
- **C:** lo mismo que A, más claro: un número que puede mover y Obras colectivas donde están las herramientas. Pierde Avisos abiertos a la vista.
- Rutinas deja de llevar el interruptor en la portada: se prende dentro (Corridas). Es un ajuste que se toca una vez; en la portada confundía.

## Los textos finales de cada renglón

| Grupo | Renglón | Línea de estado (datos del respaldo) |
| --- | --- | --- |
| Gestionar | Personas | 3 nuevas · 6 nunca entraron · 1 correo rebota o se quejó · **80** |
| Gestionar | Lugares | 53 sin fecha próxima · 2 ocultos · 1 privado · **71** |
| Gestionar | Eventos | 41 sin imagen · **383** |
| Gestionar | Artistas | 19 llevados por su gente · 4 ocultos · **686** |
| Gestionar (A, B) / Herramientas (C) | Obras colectivas | Pintar juntos sobre una pared proyectada |
| Difusión | Instagram | @smsnstrsapp · 4 publicadas esta semana · 5 sin material |
| Difusión | Showcase | Artistas para presentar a foros · 16 candidatos · 2 invitados |
| Herramientas | Ciudades | 4 abiertas · 3 detectadas · 1 oculta |
| Herramientas | Rutinas | Completar fichas: apagada · 192,29 USD de crédito |
| Herramientas | Grafo cultural | Mapa en 3D de lugares, artistas y público |

Los cuadros: «Personas nuevas · 3 · cuentas nuevas, de 80», «Eventos de la comunidad · 3 · publicados por gente que no es de administración»,
«Voy y Me interesa · 18 · de 12 personas · ▲ 5 más», «Avisos abiertos · 11 · de 48 que salieron · ▲ 4 más» (C: «Eventos esta semana · 37 · en 18
de 71 lugares · ▲ 2 más»). El rótulo: «Esta semana en números» con «Comparado con la semana anterior». El enlace: «Ver todos los números ›».
Hoy el renglón de Instagram junta seis datos («4 publicadas esta semana · 1 en Facebook · 14 por publicar · Semana: 2 de 2 programadas · la que
viene no se armó · 5 sin material»); queda en tres.

## Instagram

- **La ciudad:** abre con la de la administración: la de la sesión (`sn_admin_ciudad`, OL-456) y, si no hay (sesión nueva), `ciudad_de_persona`
  de quien entra (la que más se repite en lo que publica y marca); si tampoco, la ciudad inicial. «Todas las ciudades» sigue en la hoja. Hoy, en
  una sesión nueva, abre en «Todas las ciudades» con la semana vacía («elige una arriba»: captura 10).
- **La conexión:** sale el bloque «Conexión» (rótulo y renglón de 140 px). En su lugar, un botón redondo de 44 px con el icono de Instagram y
  el punto de la barra de la app: **verde** conectada, **gris** sin conexión, **rojo** dejó de publicar. Al tocarlo, la hoja «Conexión con
  Instagram»: la cuenta, desde cuándo, qué puede en llano («Publicar en Instagram · Publicar en la página de Facebook · Leer otras cuentas para
  completar fichas») y «Reconectar» (secundario). Sin conexión o caducada, el renglón suelto se queda a la vista (sin rótulo, en rojo, con su
  botón), porque sin él no sale nada, y la hoja trae el botón principal.
- **Dónde va el botón (medido):** «a la altura del filtro de ciudad». Si va en la fila junto a la ciudad (P2), la fila ya no cabe: a 390 se
  ven enteros 3 de 4 controles («La que viene» a medias) y a 320, 2 de 4. A la derecha del renglón de las pestañas (P, recomendada) sobra lugar:
  los tres chips siguen como hoy (3 de 3 a 390; 2 de 3 a 320, igual que hoy) y el botón se toca a 320 (recorrido). El primer día de la semana
  sube de 394 a 251 px a 390 (143 px; a 320, de 418 a 251).
- **La pestaña inicial:** «Semana» si tiene algo de hoy al domingo (programado, publicando o una sugerencia); si no, «Eventos». Con la semana
  vacía por falta de material, «Eventos» abre con «Esta semana no hay nada programado: a nadie le alcanza el material», el renglón «Falta
  material» (OL-488, con «Pedírselo» y «Subir yo») y después la lista para publicar uno a mano (simulado sobre San Luis: en el respaldo su
  semana tiene seis programadas).
- **Hallazgo:** con `?ciudad=queretaro`, el chip dice «queretaro» y la lista «No hay eventos por publicar en queretaro»: el nombre se toma de la
  lista de ciudades con eventos en 7 días, que no la incluye. Se arregla en la misma pieza (el nombre sale de `ciudades`).
- **«Caducó»:** hoy no existe ese estado (`estadoConexion` solo sabe de permisos y de la fecha). Se deduce de la cola: el último trabajo de
  Instagram terminó con el error `permiso` (código 190, 102 o 10 de Meta, `lib/instagram/api.ts`) después de `conectado_en`.

## Recorrido con toques reales (`capturas-525/recorrido.txt`): 13 de 13, sin errores de página ni de consola

Abrir Administración (A) → tocar «Voy y Me interesa» (se abre su desglose) → otra vez (se cierra) → «Ver todos los números» → bajar hasta
«Campañas pasadas» y cerrar con la ✕ → abrirla otra vez → tocar el velo (se cierra) → entrar a Instagram por el renglón de Difusión → tocar el
icono de la conexión (la hoja) → cerrarla con la ✕ → «Atrás (Administración)» → a 320 el icono se toca; sin desplazamiento a lo ancho a 390.
Ratón del navegador sobre el punto del elemento (Playwright `click`), nunca `element.click()`.

## Capturas (`docs/rediseno/capturas-525/`, 390 × 844 salvo donde se dice; cada una abierta)

- `00-armazon`: el prototipo a 1440: los selectores, el teléfono con A y las notas (la idea, los cinco bloques, las preguntas).
- `01-portada-hoy`, `01b-…-medio`, `01c-…-fin`: producción: Pendiente 25 (cuatro bandejas), «Últimos 7 días» con 7 cuadros; en medio «Fichas»,
  «Invitaciones CAPO» (120 invitadas, 5 vinculadas, 4.3 %) y Gestionar; al final seis rótulos con un renglón cada uno, el interruptor «Completar
  fichas» y Corridas.
- `02-portada-a`, `02b-…-fin`: Pendiente igual; «Esta semana en números» con los cuatro cuadros dos por fila y «Ver todos los números ›»;
  Gestionar (con Obras colectivas), Difusión (Instagram, Showcase) y Herramientas (Ciudades, Rutinas, Grafo cultural), todo entero.
- `03-portada-a-abierto`: «Voy y Me interesa» con su borde violeta y el desglose debajo («11 Voy · 7 Me interesa · 13 en los 7 días anteriores»).
- `04-todos-los-numeros`, `05-…-fin`: la hoja: «Toca un número…», cinco cuadros de 7 días con su tendencia, el embudo; al final Fichas (27
  vinculadas, 214 con foto) y «Campañas pasadas» con el CAPO y «Cómo se cuenta».
- `06-portada-b`: tres por fila: «Personas / nuevas», «Voy y Me / interesa» en dos renglones; la frase de la comunidad en cuatro.
- `07-portada-c`, `07b-…-fin`: el cuarto cuadro «Eventos esta semana · 37 · en 18 de 71 lugares · ▲ 2 más»; Obras colectivas al final de
  Herramientas.
- `10-instagram-hoy-entrar`: hoy al entrar: «Todas las ciudades», «Conexión» a media pantalla y «Cada ciudad tiene su semana… elige una arriba».
- `11-instagram-hoy-ciudad`: hoy con San Luis: la conexión antes de la semana.
- `12-instagram-conectada`: P: San Luis ya elegido, los tres chips enteros, el icono con punto verde a la derecha de «Semana · Eventos»; la semana
  empieza en Renata Saldaña bajo el resumen.
- `12b-instagram-junto-a-la-ciudad`: P2: el icono tras el chip de ciudad; «La que viene» cortada por el borde.
- `13-hoja-conectada`: «Conexión con Instagram»: @smsnstrsapp, «Página Somos Nosotrxs · conectada desde el 7 de octubre», «Puede» con tres
  palomitas, la nota de cuándo reconectar y «Reconectar» abajo.
- `14-instagram-sin-conexion`, `15-hoja-sin-conexion`: punto gris, el renglón «Sin conexión · Conecta Instagram para publicar» con su botón; la
  hoja con la cuenta con la que hay que entrar y «Conectar Instagram» violeta.
- `16-instagram-caduco`, `17-hoja-caduco`: punto rojo, «Instagram dejó de publicar · La conexión caducó el lun 5 de oct: reconecta»; la hoja dice
  por qué pasa y «Reconectar» violeta.
- `18-instagram-semana-vacia`: «Eventos» elegida, la línea de la semana vacía, «Falta material» (5 artistas sin foto o portada, «Pedírselo o
  subirla tú») y después «15 eventos en los próximos 7 días», «Para publicar · 14».
- `19-hoja-ciudades`: la hoja de hoy: «Todas las ciudades» y San Luis Potosí, 15 eventos cada una (Querétaro no sale: el hallazgo).
- `20`/`21-portada-a`/`b-320`: A con la frase en tres renglones y todo dentro; B con «administración» saliéndose de su cuadro.
- `22`/`23-…-430`: holgado en A; en B los nombres siguen en dos renglones.
- `24`/`25-…-768`, `26-portada-a-1024`: tableta: A con los cuatro cuadros en una fila; B con tres; a 1024 con el carril de secciones.
- `27-instagram-conectada-320`, `27b-instagram-junto-320`: a 320 «La que viene» asoma al final (como hoy) con P; con P2 tampoco «Esta semana».
- `28-instagram-conectada-768`, `29-instagram-semana-vacia-320`: tableta con el icono a la derecha de las pestañas; la semana vacía a 320 entera.

## Recomendación

1. **C**: A (dos por fila en el teléfono, cuatro desde tableta) con «Eventos esta semana» como cuarto número y Obras colectivas en Herramientas.
2. Todo lo demás de la portada, en la hoja «Todos los números»; el CAPO como «Campañas pasadas», con su medición entera.
3. Instagram abre con la ciudad de quien entra y en la pestaña que tiene algo; si la semana está vacía, «Falta material» y la lista de eventos.
4. La conexión, un botón con punto de color a la derecha de las pestañas; a la vista solo cuando falta o caducó.

## Plan de código por piezas (tras la firma)

1. **Portada** (S–M, sin migración): `admin/page.tsx` en cinco bloques; `Indicadores` con la rejilla `auto-fit` y una lista de cuatro claves;
   `renglonesGestionar` y los renglones de Difusión y Herramientas con sus textos; el interruptor de «Completar fichas» se muda a Corridas
   (rótulo «Rutinas»); el renglón de Instagram con tres datos. `npm run medir` (nodos de la portada bajan de 238 a ~141) y pruebas de componentes
   con toques reales del cuadro y su desglose.
2. **Hoja «Todos los números»** (S): `ui/Hoja` con título que pinta `Indicadores` (el resto), `ComunidadComoVa`, Fichas y `CapoComoVa` bajo
   «Campañas pasadas»; se carga al abrir (las consultas del CAPO y del embudo salen de la portada: menos lecturas al entrar). Personas nuevas y
   Eventos de la comunidad sin «▲» hasta que la base guarde la semana anterior (si el founder lo quiere, migración que solo añade dos campos a
   `panel_resumen`).
3. **Instagram: ciudad** (S): `page.tsx` usa `?ciudad`, la galleta y, si no, `ciudad_de_persona(actual.perfil.id)` con el cliente de servicio
   (la función no es de `authenticated`); el nombre del chip sale de `ciudades` (arregla «queretaro»).
4. **Instagram: conexión** (S–M): `ConexionInstagram` en dos piezas: el botón con su punto (al lado de `ui/Pestanas`, dentro de `ui/Cabecera`) y
   la hoja; el renglón suelto solo si `falta`; «caducó» = último `redes_trabajos` de Instagram con error `permiso` después de `conectado_en`
   (lectura nueva, sin migración).
5. **Instagram: pestaña inicial** (S): sin `?pestana`, «Semana» si `semana.dias` tiene algo de hoy en adelante y si no «Eventos»; en «Eventos»,
   con la semana vacía, la línea y el renglón «Falta material» arriba (el mismo `HojaMaterial`).

## Preguntas al founder (frases llanas)

1. ¿Firmas C (dos números por fila, «Eventos esta semana» como cuarto y Obras colectivas en Herramientas), A (la del gestor tal cual) o B (tres
   por fila con tres números)?
2. El cuarto número: ¿«Avisos abiertos» (si llegan los avisos) o «Eventos esta semana» (lo que la administración puede mover buscando agendas)?
3. Personas nuevas y Eventos de la comunidad no se comparan hoy con la semana anterior. ¿Quieres el «▲ 2 más» también en esos dos? Pide un
   cambio chico en la base.
4. Si Instagram deja de publicar, ¿lo subimos también a «Pendiente» de la portada, en rojo?
5. La ciudad de cada administración: ¿la que más se repite en lo que publica y marca (la que ya calcula la app), o que cada quien la elija una
   vez en su perfil?
6. El botón de Instagram: ¿a la derecha de las pestañas (P, no mueve los chips) o junto a la ciudad (P2, la fila deja de caber)?
