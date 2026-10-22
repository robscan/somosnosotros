# 475 · Prototipo: Showcase v2, panel «Por aprobar», filtros para clasificar, seleccionar para investigar y mandos más claros (OL-443)

**Fecha:** 2026-10-22. **Rama:** `prototipo-showcase-v2`, base `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Solo prototipo:** nada en `src/**`, sin migración y sin variables de entorno. Toca dos scripts de operación (la maqueta y el armazón
del prototipo) y suma uno de evidencia. **Estado:** listo para la revisión del gestor y la firma del founder. Prototipo:
`docs/rediseno/prototipos/showcase-v2.html`.

## El pedido (founder, 22 de octubre, textual)

- «Para showcase haz una lista de cosas por aprobar de artistas. Actualmente tengo que entrar a cada artista para aprobar hallazgos podría nunca
  darme cuenta. Puedes agregar un indicador de validaciones pendientes en la ficha también. Pero sí necesito un panel general para ver todo lo que
  hay sin estar navegando entre fichas.»
- «Haz que en ficha de artistas de showcase el nombre de artista se vea seleccionable, puedes agregar un angle también, porque ahora no es claro
  que me lleva a un sub nivel.»
- «En donde dice candidato el angle debe indicar que es drop down, es decir que apunte para abajo.»
- «Permite que seleccione o agrupe artistas para detonar búsquedas. Además ahora solo puedo filtrar por disciplina pero conforme vaya filtrando por
  puntaje quiero dejar solo los que tienen más de 4 puntos por ejemplo o los activos en los últimos 15 días, o los que tienen cuenta vinculada.
  Analiza y propón filtros para que sea más fácil detonar búsquedas y clasificar artistas de modo que se pueda lograr la tarea de impulsar y
  reconocer artistas destacados y originales.»

Parte de lo que hay en producción: bitácoras 459 (Showcase), 465 (Investigar), 469 (puntajes propuestos) y 471 (Investigar en lote).

## Sobre la pantalla real

- **`maqueta-pantalla.mjs` guarda tres pantallas más** con la cuenta de administración del respaldo: `/admin/showcase` (la lista de hoy),
  `/admin/showcase/feleal` (la ficha con sus dos evidencias por revisar) y la misma con la hoja de Estado abierta (paso `admin-showcase-estado`).
  La hoja Filtros de Artistas (`ui/HojaFiltros`) no se pudo guardar: con los siete artistas del respaldo Artistas no enseña «Filtros», y Agenda se
  queda esperando el mapa. Su CSS (`HojaFiltros/bloque`) ya viene en el paquete compartido y su pie es el de `ui/Hoja`.
- **`prototipo/meter-maqueta.mjs`**, con la lista del Showcase entre las pantallas, mete también las fotos chicas de sus tarjetas (`IMG.fotos`, por
  slug, menos de 40 KB): Feleal, 0Backside0 y la Orquesta. Con `--pantallas=admin,admin-personas,admin-persona-hoja,admin-lugares,admin-grafo,
  admin-ciudades,admin-ciudades-hoja,admin-showcase,admin-showcase-ficha,admin-showcase-estado`: 4 hojas de CSS (236 KB, sin @font-face), 951
  clases con su hash, el armazón de la vista «tarea», la barra de Atrás y 82 iconos de producción. `admin-paneles.html` y `ciudades-v2.html` no
  cambian (sin la lista del Showcase no hay `IMG.fotos`).
- **Lo que miré antes de dibujar** (390×844 del respaldo): la lista ya pinta en violeta «2 evidencias por revisar» en la tarjeta (OL-439), pero
  como texto, sin mando; arriba van dos filas de chips (disciplinas, y Estado · Orden · Vista); la ficha pone el nombre como título sin mando y el
  renglón «Invitado» con el chevron derecho aunque abre una hoja; «Por revisar» está casi al final de la ficha, después de la rúbrica y de
  Investigación. En la portada, «Pendiente» ya junta las propuestas de las rutinas de Ciudades (renglón por corrida).
- **El teléfono es un marco** (`iframe`, 390×844) con ese CSS; las pantallas se arman con el marcado y las clases de producción:
  `showcase.module.css` (`tarjeta`, `foto`, `nombre`, `disciplina`, `estado`, `cifra`, `circula`, `redes`, `actividad`, `investiga`, `rubrica`,
  `senal`, `total`, `chica`, `boton`, `seguida`, `investigarLote`, `barraInvestigar`, `totalLote`, `menu`, `opcion`, `hueco`, `exportar`, `ok`,
  `tachada`), `admin.module.css` (`titulo`, `grupo`, `conNota`, `nota`, `fila`, `total`, `etiqueta`, `etiquetaRol`, `destacada`, `enlace`,
  `pendientes`, `pendiente`, `ficha`, `dejar`, `actuar`, `principal`, `hecho`, `nada`, `vacio`, `cabecera`, `avatar`, `menu`, `menuItem`,
  `menuConDetalle`, `barraEmbudo`, `verMas`), `ui/Chip` (contexto con su cuenta, quitar, filtro con cuenta, envuelve), `ui/Buscador` con su ✕,
  `ui/Hoja` con título y pie, `HojaFiltros/bloque`, `ui/Boton`, `ui/Campo` con `ui/Limpiar` y `ui/Renglon`. La portada es la de producción tal cual,
  con un renglón más. Lo propio va en clases `ps-…` dentro del marco, solo con tokens del sistema: la línea de cifras con «Seleccionar», el
  indicador tocable, la casilla (la de `ui/Casilla`, copiada con su prefijo: ninguna pantalla de Administración la sirve), la casilla de cada
  tarjeta, la barra de los elegidos, «Más filtros», el renglón del artista con foto en Por aprobar, la línea de lo que cambia al aceptar, el nombre
  como enlace y el aviso de la ficha. Sin tokens ni medidas nuevas (la foto del renglón del artista mide 40, como los avatares de Personas).

## Las pantallas

| | Pantalla | Qué lleva |
|---|---|---|
| A | **Lista** | La de hoy con tres cambios: arriba solo **Filtros · Orden · Vista** (Disciplina y Estado entran a la hoja); la línea de cifras con **«Seleccionar»** a la derecha; el renglón **«Por aprobar 26 ›»** antes de «Investigar»; y en cada tarjeta la línea violeta «3 evidencias por revisar» **tocable a todo lo ancho, con su chevron**, que abre Por aprobar en ese artista. «Investigar» pasa al chevron abajo (abre una hoja). Variante: con el grupo «Música con cuenta, 4+» puesto (un solo chip con su ✕). |
| B | **Hoja Filtros** | `ui/HojaFiltros`: «Tus grupos» primero; Puntaje (Todos · 3, 4, 5 o 6 o más), Actividad en redes (publicó en 15, 30 o 90 días; sin publicar en 90), Cuenta en la app (con cuenta vinculada · sin cuenta), Circulación este año (con eventos · en 2 o en 4 foros o más · con festival) y Disciplina; **«Más filtros»** con el chevron abajo guarda Estado, Investigación (sin investigar · hace más de 30 días · en 30 días · con evidencias por revisar), Origen (Catálogo CAPO, PECDA, SIC, Agendas, La app) y Solista o grupo. **Cada chip dice cuántos quedarían** con lo demás puesto. Abajo, Limpiar y «Ver 7 artistas». Variantes: sin nada, con tres puestos, con «Más filtros» abierto. |
| C | **Lista filtrada** | Lo puesto en su fila con su ✕ («4 puntos o más ✕», «Publicó en 15 días ✕», «Música ✕») y al final **«Guardar como grupo»**; la línea «7 de 692 artistas · 5 pasan al consejo con 5 de 8». La hoja «Guardar como grupo» resume los filtros («hoy, 7 artistas») y **propone el nombre** («Música activos en 15 días, 4+») en un campo con su ✕; sin nombre, el botón dice «Falta el nombre». Guardado: un solo chip con el nombre del grupo. |
| D | **Seleccionar** | La casilla «Seleccionar los 8 filtrados» arriba; en cada tarjeta, su casilla sobre la foto (tocar la tarjeta también marca; elegida, en el violeta suave); al pie, la barra con «Cancelar» y **un solo violeta que dice qué hace**: «Elige a quién investigar», «Investigar a 5 · hasta 5,00 USD», «Son 75: elige hasta 60». Abre la hoja de Investigar de hoy (OL-439) con «Los 5 que elegiste», el tope con su ✕ y el total. Al correr: «Investigando a 5 · 0 de 5 terminados» con su barra y las cinco tarjetas «Investigando · empieza en unos segundos». |
| E | **Por aprobar** | Nivel propio (`/admin/showcase/por-aprobar`): «26 evidencias de 9 artistas · las trajo la rutina ayer. Solo cuenta lo que aceptas.» Un grupo por artista: su renglón (foto, nombre, disciplina, estado, «7 de 8 · con todo, 8», cuántos quedan y el chevron derecho a su ficha) y sus hallazgos con la tarjeta de «Pendiente» de siempre más **lo que cambia**: «Si la aceptas: Obra 1 → 2 · total 7 → 8» en verde, o «No cambia el puntaje: Circulación está fijada a mano en 2». Primero los que suben el puntaje. Al aceptar, la línea de lo hecho («Aceptaste … · Obra 1 → 2» con «Deshacer») y el renglón sube a 8 de 8; **«Aceptar las 2 de Feleal»** bajo cada grupo con dos o más. Vacío: «Nada por aprobar · cuando investigues a alguien, lo que encuentre llega aquí» con la salida a la lista. |
| F | **Portada** | La de producción con un renglón más en «Pendiente»: **«Evidencias del showcase · 26 por aprobar · de 9 artistas, investigados ayer»**, con su cuenta; el número de Pendiente las suma (20 → 46). |
| G | **Ficha** | El **nombre en el color de acción con su chevron derecho** (abre la ficha pública); debajo, el aviso **«2 por revisar» con el chevron abajo** (baja hasta Por revisar); el estado **con el chevron abajo** (abre la hoja de hoy); Investigar, también con el chevron abajo; Por revisar con lo que cambia al aceptar y «Aceptar las 2». Variantes: la hoja de Estado, ya en Por revisar, y Abril Merlot (candidata, «3 por revisar»). |
| 1280 | **Escritorio** | Todo en la columna de 600 de Administración, con el carril; la barra de selección al pie de la columna. |

## Decisiones para la firma (en frases llanas)

1. **«Por aprobar» es una pantalla propia del Showcase**: todo lo que trajo la rutina, de todos los artistas, sin entrar a ninguna ficha. Se llega
   por tres lados: el renglón arriba de la lista, la línea violeta de cada tarjeta y un renglón nuevo en «Pendiente» de la portada.
2. **Agrupado por artista**, y cada grupo empieza con el renglón del artista, que entra a su ficha. Los grupos se ordenan por el puntaje de cuando
   se abrió la pantalla (lo más cerca del consejo, primero); lo que se acepta no los mueve mientras se trabaja.
3. **Cada hallazgo dice qué cambia si lo aceptas** (la señal y el total, en verde) o por qué no cambia. El renglón del artista adelanta el total
   «con todo». Dentro del grupo, primero lo que sube el puntaje.
4. **«Aceptar las N de Feleal»** bajo cada grupo con dos o más, en gris (el violeta es de cada «Aceptar»). No hay «Aceptar las 26».
5. **El indicador** es la línea que ya existía en la tarjeta, ahora tocable con su chevron; en la ficha, el aviso «2 por revisar» bajo el nombre.
6. **Una regla para los chevrones:** el derecho entra a otra pantalla; el de abajo abre una hoja o baja en la misma pantalla. Por eso cambian
   «Candidato» (el estado), «Investigar» (en la lista y en la ficha) y «Más filtros».
7. **El nombre de la ficha** va en violeta con su chevron derecho y abre la ficha pública.
8. **Filtros en una sola hoja**, la de Artistas de la app; arriba quedan Filtros (con cuántos hay puestos), Orden y Vista. Disciplina y Estado
   entran a la hoja.
9. **Lo puesto se ve arriba con su ✕** y quitarlo no apila historial; la línea de cifras cuenta «7 de 692 artistas · 5 pasan al consejo».
10. **Cada chip de la hoja dice cuántos quedarían**, así nunca se elige a ciegas un filtro que vacía la lista.
11. **Lo más usado a la vista y lo demás en «Más filtros»**, que se abre solo si algo de ahí está puesto.
12. **Un grupo es un filtro con nombre**, no una lista fija: quien lo cumpla mañana entra solo. El sistema propone el nombre; se cambia en el campo.
    Puesto, ocupa un solo chip.
13. **Seleccionar para investigar**: casillas en las tarjetas, «Seleccionar los N filtrados» y la barra al pie con un solo violeta que dice qué
    hace y cuánto puede costar; abre la hoja de Investigar de hoy con los elegidos.
14. **Los filtros se combinan con «y»** y en cada bloque se elige uno.
15. **De paso**: las filas de chips que envuelven llevan 12 entre filas en vez de 8 (con 8, el toque de 44 de una fila pisa el de la siguiente y
    miden 43; le pasa hoy a la hoja Filtros de Artistas). El cambio iría en `Chip.module.css` (`.envuelve`) para toda la app.

### Los filtros y por qué (una línea cada uno)

- **Puntaje mínimo**: la rúbrica ya resume las cuatro señales; «5 o más» es la línea del consejo.
- **Actividad en redes**: distingue a quien trabaja hoy de quien solo tiene un perfil; sale de la última lectura de sus redes.
- **Cuenta en la app**: con cuenta se le puede escribir y actualiza su ficha; sin cuenta es a quien invitar primero.
- **Circulación este año**: que varios foros lo programen es la señal más difícil de inflar, y sale de la base sin investigar.
- **Disciplina**: el consejo decide por disciplinas y la investigación busca distinto en cada una.
- **Estado**: para ver solo a los invitados o esconder a los descartados.
- **Investigación**: para no pagar dos veces la misma búsqueda y encontrar a quien nunca se ha investigado.
- **Origen**: quien llegó por la app ya se mueve solo; los del catálogo CAPO esperan que alguien los mire.
- **Solista o grupo**: el showcase arma noches distintas con unos y otros.

## En duda (para el founder)

- **Disciplina y Estado salen de la vista directa** y entran a la hoja: hoy las disciplinas están a un toque; con la hoja, a dos. ¿Se queda la
  fila de disciplinas además?
- **Origen**: la base solo guarda «CAPO» (`artistas.origen`). PECDA, SIC y «agendas» se deducirían de la fuente de la propuesta que creó la ficha
  (rutina de artistas, OL-440) y «la app» de quién la creó. ¿Vale la pena, o basta CAPO / no CAPO?
- **Un grupo de personas elegidas a mano** (lista fija): propongo solo filtros con nombre; si hace falta, sería «Guardar los 5 como grupo» en la
  barra de los elegidos.
- **Borrar o renombrar un grupo** no está dibujado: ¿mantener presionado en la hoja («Renombrar · Borrar») o una pantalla de grupos?
- **«Aceptar las 26»** (como la bandeja de Ciudades, OL-438) se dejó fuera a propósito: cada hallazgo cambia un puntaje. ¿Lo quieres?
- **Rechazar con razón** («duplicado», «no es esta persona») serviría para que la rutina aprenda. ¿Lo pedimos?
- **Lo fijado a mano manda**: aceptar un hallazgo de una señal fijada no cambia el puntaje. ¿O al aceptar se pregunta si se suelta lo fijado?
- **Chips con cero** (PECDA 0, Descartado 0 con algunos filtros): se ven con su 0 y se pueden tocar (la lista dice «Nadie con estos filtros. Quita
  uno de arriba.»). ¿O se esconden los que dan cero?

## Datos

**Reales** (bitácoras 459 a 471 y el encargo): 692 artistas en el catálogo; 26 evidencias propuestas por la rutina ayer; las cuatro señales, sus
niveles y la línea del consejo (5 de 8); el tope de 1,00 USD por artista y el límite de 60 por orden. **Del respaldo local** (inventados): Feleal,
0Backside0, Pimpolina, Abril Merlot, la Orquesta, Aaron Cadena y Rocío Lozano, con sus fotos de prueba; las dos evidencias de Feleal y sus dos
aceptadas. **Inventados aquí**: los demás nombres (Los Tecolotes del Desierto, Itzel Mora, Colectivo Tierra Adentro, Marisol Ybarra, Ruido Blanco
Ensamble y el resto del catálogo, con una semilla fija), cómo se reparten las 26 evidencias entre nueve artistas, sus títulos y fuentes (dominios
`.example`) y las cifras de cada artista. Con ellas se cuentan los filtros: cada número de la hoja sale de la misma lista de 692.

## Medidas (medir.js dentro del marco; 390×844, y cuatro estados a 1280)

| Estado | Nodos | Prof. | Desbordes | Toques < 44 |
|---|---|---|---|---|
| A lista · con grupo | 402 · 317 | 8 | 0 | 1 · 1 |
| B Filtros · final · elegidos · más | 488 · 488 · 388 · 440 | 8 | 0 | (hoja abierta) |
| C filtrada · guardar · guardado | 302 · 325 · 296 | 8 | 0 | 1 · (hoja) · 1 |
| D seleccionar · cinco · todos · hoja · investigando | 309 · 314 · 318 · 340 · 320 | 8 | 0 | 3 · 3 · 3 · (hoja) · 1 |
| E por aprobar · abajo · una · las 2 · vacío | 319 · 319 · 317 · 314 · 23 | 8 | 0 | 0 |
| F portada | 210 | 8 | 5 | 1 |
| G ficha · estado · por revisar · candidata | 115 · 143 · 115 · 109 | 8 | 0 | 0 · (hoja) · 0 · 0 |
| 1280: filtrada · cinco · por aprobar · ficha | 336 · 348 · 353 · 149 | 8 | 0 | 1 · 3 · 0 · 0 |

La lista de hoy mide 294 nodos y profundidad 8 con siete tarjetas (`npm run medir`, s36); el prototipo pinta diez, como la página real. Ninguna
profundidad pasa de 8 y no hay margen negativo. Los toques que quedan, uno por uno:

- **El campo del buscador** (`input[search]` 290×42) en todas las listas: es el de `ui/Buscador` tal cual; en el marco mide 42 con la letra de
  Google Fonts y la etiqueta entera (44) se toca. En la app real `npm run medir` no lo marca.
- **Con una hoja abierta** (B, C-guardar, D-hoja, G-estado), lo que queda detrás del velo (chips de arriba, nombres de las tarjetas): el velo
  recibe el toque, como debe; nada de la hoja mide menos de 44.
- **Seleccionando** (D), la casilla y el nombre de la tarjeta que queda debajo de la barra fija de los elegidos (Feleal): la barra recibe el toque
  ahí; en la tarjeta de arriba (Los Tecolotes) los dos pasan de 44.
- **La portada** (F): el «Cómo se cuenta» de CAPO (324×37) y cinco párrafos de su `details` cerrado son de la portada de producción, sin cambios
  (la maqueta real marca el mismo «Cómo se cuenta»).
- La ficha mide menos que la real (194) porque el prototipo no pinta Redes ni Notas del consejo, que no cambian.

## El recorrido con toques reales

`node scripts/ops/auditoria-ui/capturar-showcase-v2.mjs <carpeta>`: 45 de 45 comprobaciones con clics de ratón por coordenadas y teclas reales,
sin errores de página. Filtros (la hoja, «5 o más» y el botón que dice su cuenta, «Más filtros», «Sin investigar», «Ver …» cierra, lo puesto arriba
con su ✕, el chip cuenta 2, «N de 692 artistas»); quitar con la ✕; guardar grupo (el nombre propuesto «Artistas, 5+», la ✕, «Falta el nombre»,
escribir, un solo chip, «Tus grupos» lo trae elegido, Escape cierra); seleccionar (sin nadie «Elige a quién investigar», tocar la tarjeta y la
casilla, un solo violeta, todos y ninguno, la hoja con su tope, al correr se cierra y dice «Investigando a 1»); Por aprobar (26 de 9, «Obra 1 → 2 ·
total 7 → 8», aceptar, 8 de 8, la cuenta baja, Deshacer, «Aceptar las 2 de Feleal», rechazar, entrar a la ficha de Pimpolina con «3 por revisar» y
Atrás); la ficha (la hoja de Estado, elegir Revisado, el aviso baja a Por revisar, el nombre abre la ficha pública); la portada (Pendiente 46 y su
renglón); el indicador de la tarjeta abre Por aprobar en Feleal; la búsqueda con su ✕; a 390 sin desplazamiento horizontal y con «Notas».

## Capturas (`docs/rediseno/capturas-475/`, abiertas una por una)

- `00-pagina-entera.png`: el prototipo a 1440: el selector A–G con sus variantes, el teléfono en Por aprobar y la hoja de notas (medidor 319 · 8).
- `01-A-lista.png`: la lista: buscador, Filtros · Orden · Vista, «692 artistas · 10 invitados · 4 confirmados · 9 pasan al consejo con 5 de 8» con
  «Seleccionar», Por aprobar 26, Investigar con el chevron abajo y la tarjeta de Los Tecolotes con «3 evidencias por revisar ›».
- `02-A-lista-con-grupo.png`: Filtros 3 en violeta y un solo chip «Música con cuenta, 4+ ✕»; «8 de 692 artistas · 4 pasan al consejo».
- `03-B-filtros.png` y `04-B-filtros-final.png`: la hoja Filtros arriba (Tus grupos, Puntaje, Actividad) y al final (Cuenta, Circulación,
  Disciplina, «Más filtros» cerrado), con Limpiar y «Ver 692 artistas».
- `05-B-filtros-elegidos.png`: con «4 o más», «Publicó en 15 días» y Música puestos: cada chip con su cuenta nueva, «Ver 7 artistas».
- `06-B-mas-filtros.png`: «Más filtros» abierto (chevron arriba): Estado, Investigación, Origen y Solista o grupo.
- `07-C-filtrada.png`: lo puesto con su ✕ y «Guardar como grupo»; «7 de 692 artistas · 5 pasan al consejo».
- `08-C-guardar-grupo.png`: la hoja con el resumen («4 puntos o más · Publicó en 15 días · Música · Hoy, 7 artistas») y el nombre propuesto
  «Música activos en 15 días, 4+» con su ✕.
- `09-C-guardado.png`: un solo chip con el nombre del grupo.
- `10-D-seleccionar.png`: «Seleccionar los 8 filtrados · O toca cada tarjeta», las casillas vacías y la barra «Cancelar · Elige a quién investigar».
- `11-D-cinco-elegidos.png` y `12-D-los-filtrados.png`: cinco y ocho elegidos, en el violeta suave; «Investigar a 5 · hasta 5,00 USD» y «a 8».
- `13-D-hoja-investigar.png`: «Investigar a 5»: la nota, «Los 5 que elegiste» con sus nombres, el tope 1,00 con su ✕, «5 artistas · hasta 5,00 USD ·
  crédito 192,40», Cancelar · «Investigar a los 5».
- `14-D-investigando.png`: «Investigando a 5 · 0 de 5 terminados · hasta 5,00 USD» con su barra; la tarjeta «Investigando · empieza en unos segundos».
- `15-E-por-aprobar.png` y `16-E-por-aprobar-abajo.png`: Los Tecolotes con el premio que sube Obra arriba y lo que no cambia debajo; más abajo,
  «Aceptar las 2 de Feleal» y el grupo de Itzel Mora.
- `17-E-tras-aceptar-una.png` y `18-E-tras-aceptar-las-2.png`: Feleal «8 de 8» con «Aceptaste … · Obra 1 → 2» y Deshacer; con las dos, sin botón.
- `19-E-nada-por-aprobar.png`: «Nada por aprobar» y «Investigar desde la lista ›».
- `20-F-portada.png`: Pendiente 46 con «Evidencias del showcase · 26 por aprobar» antes de las propuestas de Ciudades.
- `21-G-ficha.png`, `22-G-hoja-estado.png`, `23-G-por-revisar.png`: Feleal en violeta con su chevron, «2 por revisar ⌄», Invitado con el chevron
  abajo; la hoja de los cinco estados; Por revisar con «Si la aceptas: Obra 1 → 2 · total 7 → 8» y «Aceptar las 2».
- `24-G-ficha-candidata.png`: Abril Merlot, candidata, «3 por revisar», rúbrica 3 de 8 (todo propuesto).
- `25-C-filtrada-1280.png`, `26-D-cinco-elegidos-1280.png`, `27-E-por-aprobar-1280.png`, `28-G-ficha-1280.png`: lo mismo a 1280, en la columna
  de 600 con el carril; la barra de los elegidos al pie de la columna.

## Archivos

- `docs/rediseno/prototipos/showcase-v2.html` (nuevo).
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs` (tres pantallas y un paso más) y `scripts/ops/auditoria-ui/prototipo/meter-maqueta.mjs` (las
  fotos de las tarjetas).
- `scripts/ops/auditoria-ui/capturar-showcase-v2.mjs` (nuevo): capturas, medidas y recorrido.
- `docs/rediseno/capturas-475/` (29 PNG).
- `docs/ops/OPEN_LOOPS.md`: la línea de OL-443 en «Ahora» y el «Last updated».

Sin council, workflows ni subagentes.
