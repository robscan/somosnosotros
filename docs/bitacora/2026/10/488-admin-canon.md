# 488 · Administración con el canon del front: la comparación y la parte A (OL-456)

**Fecha:** 2026-10-23. **Rama:** `admin-canon`, desde `origin/main` (`85d5c2b8`). **Operador:** agente de la pieza (Claude) para el Gestor VII,
sin otros agentes. **Entrega:** solo la comparación; ningún cambio de la app. **Migración:** ninguna. **Capturas:**
[`docs/rediseno/capturas-488/`](../../../rediseno/capturas-488/) (16 parejas lado a lado y `medidas.json`). **Estado:** la comparación, aprobada («Adelante, y acepto tus
recomendaciones»); la **parte A**, hecha en esta misma rama (abajo), espera la revisión del gestor; la parte B irá en `admin-canon-2`.
**Migración de la parte A:** `20261023120000_admin_ciudad.sql` (solo añade). **Sustituye a OL-452** (prototipo del filtro por ciudad, bitácora 484, rama `admin-filtro-ciudad`), que queda descartada: el filtro por
ciudad sale de esta pieza, con el chip y la hoja de ciudad que ya existen en el front.

## El pedido

El founder, 22 de octubre: «La maquetación para toda la zona de administración no ha seguido los mismos cánones que ya definimos para la versión
de front-end. Comienzo a señalar, por ejemplo, el header, pues no es el mismo… el botón de atrás es diferente. Para el caso del patrón de abajo,
me gustaría que se siguiera el mismo patrón… las mismas secciones de lugares. Y de personas… aproveches recursos como los patrones ya
previamente definidos para que evites arriesgar con nuevas maquetas… evita sobreanidación. Evita contenido basura que fuera heredado. Evita bugs
en general.» Hoy dijo «Adelante» al plan: (1) comparar, (2) un solo cambio que reutiliza, (3) revisar contra el par del front. Esto es el (1).

## Cómo se midió

- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs` guardó las pantallas reales (la app compilada contra el respaldo local, sin `.env` ni
  producción) a 390 × 844. Le sumé las que faltaban: Eventos, Artistas, la ficha de una persona, el panel de una ciudad, Por aprobar, Obras
  colectivas y el manual del grafo; y del front, Lugares, su hoja de ciudad, Artistas, Buscar, la ficha pública de una persona, Perfil,
  Ajustes, la ficha de un artista y Ayuda.
- El respaldo no contestaba las listas de Administración › Lugares, Eventos y Artistas (salían vacías). Le añadí sus contratos
  (`panel_lugares`, `panel_eventos`, `panel_artistas`, `panel_fichas_conteos`, `panel_destacados`) sobre las fichas inventadas, solo con el
  filtro por omisión y la búsqueda. Solo sirve a las capturas; `npm run medir` no mide esas listas.
- `scripts/ops/auditoria-ui/comparar-admin-front.mjs` (nuevo) abre cada pantalla guardada en el Chrome de la Mac, mide con
  `getBoundingClientRect` la cabecera, el botón Atrás, el título, la columna, los primeros renglones y sus separaciones, la barra de abajo, y con
  `medir.js` los nodos, la profundidad y lo que se sale; y pega las dos capturas lado a lado (izquierda Administración, derecha el front).

## Inventario: cada pantalla de Administración y su par del front

| # | Administración | Ruta | Par en el front | Qué pieza usa hoy | Qué pieza usa el par |
|---|---|---|---|---|---|
| 01 | Portada | `/admin` | Ajustes | ui/Barra («Atrás» + logo), rótulos y renglones propios (`admin/fila`), indicadores propios | ui/Barra igual, renglones `ui/Renglon` (ajuste) |
| 02 | Personas | `/admin/personas` | Artistas (lista de gente con foto redonda) | ui/Barra, título, ui/Buscador, fila de chips, renglón propio `admin/persona` | BarraApp, ui/Cabecera con chip de ciudad, `ui/Renglon` lista, ui/Grupo |
| 03 | Ficha de persona | `/admin/personas/[id]` | Ficha pública de persona | ui/Barra, avatar de 144 centrado, renglones de dato | Barra de ficha (Atrás redondo 44 + nombre centrado), cabecera FichaPersona (avatar 72 a la izquierda) |
| 04 | Lugares | `/admin/lugares` | Lugares (lista de la hoja) | ui/Barra, título, ui/Buscador, 6 chips, renglón propio `admin/renglonFicha` | BarraApp, ui/Cabecera (ciudad + Filtros), `ui/Renglon` lista (FilaLugares), ui/Grupo |
| 05 | Eventos | `/admin/eventos` | Agenda | igual que 04, 7 chips | BarraApp, Cabecera (ciudad + Cuándo + Filtros), pestañas, `ui/Renglon` lista (FilaEventos), Grupo por día |
| 06 | Artistas | `/admin/artistas` | Artistas | igual que 04, 6 chips | BarraApp, Cabecera (ciudad), tira de letras, `ui/Renglon` lista (ListaArtistas) |
| 07 | Ciudades | `/admin/ciudades` | Hoja de ciudad de Lugares | ui/Barra, renglón propio por ciudad, botón flotante | ui/Hoja plana con `ui/Renglon` (pin, nombre, cuenta, ✓) |
| 08 | Panel de una ciudad | `/admin/ciudades/[slug]` | Ficha de lugar (números y acciones) | ui/Barra, tarjetas de indicador propias | Barra de ficha, `ui/Kpi`, acciones redondas |
| 09 | Propuestas | `/admin/ciudades/[slug]/propuestas` | **Sin par** (bandeja de aceptar/rechazar) | ui/Barra, tarjetas propias | — |
| 10 | Corridas | `/admin/corridas` | **Sin par** | ui/Barra, indicadores y renglones propios | — |
| 11 | Showcase | `/admin/showcase` | Artistas | ui/Barra, buscador, 3 chips de contexto con flecha, chips de disciplina, tarjetas propias | BarraApp, Cabecera, `ui/Renglon` lista |
| 12 | Ficha del Showcase | `/admin/showcase/[artista]` | Ficha de artista | ui/Barra, avatar de 144 centrado, renglones propios | Barra de ficha (Atrás redondo 48), cabecera con portada, `ui/Kpi` |
| 13 | Por aprobar | `/admin/showcase/por-aprobar` | **Sin par** | ui/Barra, tarjetas de evidencia propias | — |
| 14 | Grafo | `/admin/grafo` | **Sin par** (pantalla oscura propia, firmada en OL-409) | barra propia del grafo con Atrás redondo 44 | — |
| 15 | Obras colectivas | `/admin/obras-colectivas` (y `[id]`) | **Sin par** (formulario de pared) | ui/Barra, formulario propio | — |
| 16 | Manuales (grafo y Showcase) | `/admin/grafo/manual`, `/admin/showcase/manual` | Ayuda | ui/Barra, índice de chips, tarjetas | ui/Barra igual, texto corrido |

Las cuatro de `/admin/ciudades/propuestas/[id]` y `/admin/obras-colectivas/[id]` siguen el mismo armazón que 09 y 15 (no las capturé aparte).

## Lo que encontré, medido (390 × 844)

### La cabecera y el botón Atrás (todas)

- **Administración usa la cabecera de las pantallas de tarea** (`ui/Barra` interior): una píldora «Atrás» de **83 × 44** en x 20, el logotipo
  al centro, 56 de alto; y debajo un título de 26 px en y 68. Es la misma que Ajustes y Ayuda en el front (01 y 16 son idénticas en cabecera).
- **Las pantallas del front que el founder compara usan otras dos:** las listas (Lugares, Agenda, Artistas) llevan la barra de la app (56: +,
  logotipo, buscar, avisos), debajo **ui/Cabecera** con el chip de ciudad (y Cuándo, Filtros) y abajo la barra de secciones (60). Las fichas
  llevan un **Atrás redondo**: 48 × 48 flotando sobre la portada (lugar, artista) o **44 × 44 con el nombre centrado** (persona, `barraSolida`),
  sin logotipo y sin título repetido debajo.
- Comportamiento con el historial: igual en todas (`ui/Atras` y la marca propia del historial); la diferencia es solo de pieza y forma.
- El Grafo ya usa un Atrás redondo de 44 (en x 8, no en el margen de 20 de las demás).

### Las listas: Personas, Lugares, Eventos, Artistas (02, 04, 05, 06)

- **Renglón:** Administración tiene tres renglones propios (`admin/persona`, `admin/renglonFicha`, `admin/fila`) con foto de **48** (cuadrada
  o redonda), el nombre a 17 px y una sola línea de detalle sin iconos; altos de **69 a 142** según cuánto texto envuelva (Lugares 80/69/103/83,
  Eventos 100/142/122/101). El front usa **`ui/Renglon` lista**: foto de **56**, nombre en la letra condensada, una o dos líneas con icono
  (pin, calendario) y la acción redonda a la derecha; altos de **95 a 138**. Ninguna separación entre renglones en los dos (raya de 1 px).
- **Acción a la derecha:** Administración pone los tres puntos (menú de la ficha); el front, Seguir / Voy en círculo. Mismo hueco (44).
- **Filtros:** Administración pone un buscador fijo y una fila de 6 o 7 chips que se desliza (los últimos no se ven sin deslizar: «Sin fecha
  pró…», «Co…»). El front pone, en `ui/Cabecera`, el **chip de ciudad** y un chip **Filtros** que abre `ui/HojaFiltros` con sus cuentas
  (Lugares) o pestañas «Todos / Nuevos» (Agenda). **Ninguna lista de Administración tiene ciudad.**
- **Agrupación y conteo:** el front dice «9 lugares», agrupa («Con eventos · 7», por día en la Agenda, por letra en Artistas) con `ui/Grupo`;
  Administración no agrupa y pone la cuenta dentro de cada chip.
- **Profundidad:** Administración es más plana (7–8 niveles; 43–180 nodos) que el front (10–13; 145–306). No hay sobreanidación en estas
  listas; los envoltorios sin clase que aparecen (`small > span > span`) vienen del renglón compartido y están igual en el front.

### Ficha de persona (03)

- Administración: avatar de **144** centrado, nombre y colonia centrados, grupos «Cuenta» y «Actividad» en tarjetas de renglones. El front:
  cabecera `FichaPersona` (avatar 72 a la izquierda, nombre al lado, Compartir a la derecha), `ui/Kpi` «Va a / Sigue» y la lista de eventos.
- **Bug visible:** «Alta: lun 7 de sep · el lun 7 de sep» (la fecha dos veces): `src/lib/panel.ts` línea 562 junta `diaCorto` y `hace`, y
  pasada una semana `hace` ya devuelve la fecha.

### Portada (01)

- Ya está casi en el canon de Ajustes: rótulos en mayúsculas, renglones con icono, cuenta y ›. Sus indicadores («Últimos 7 días», con tendencia)
  son propios de Administración; el front no tiene par con tendencia.
- **Bug de toque:** «Cómo se cuenta» (el `summary` del bloque del catálogo) mide **324 × 37**: menos de 44 de alto. `medir.js` también marca
  sus párrafos fuera de la caja mientras está cerrado (es un `details`: puede ser falso positivo del medidor).

### Ciudades y su panel (07, 08)

- La lista de ciudades usa un renglón propio con icono de **mira** (el de «Estás aquí») donde la hoja de ciudad del front usa el **pin**; el
  número violeta y «Abrir» son propios. «Ocultar» es un enlace subrayado de texto chico al pie del renglón.
- El panel de la ciudad: tarjetas de indicador con el número a 40 px aunque sea **0**, y su botón dentro; se lee bien pero cada tarjeta mide
  152–218 de alto. Par más cercano: los números de una ficha (`ui/Kpi`, 116 de alto), que no llevan botón.

### Showcase (11, 12, 13)

- La lista usa chips de contexto **con flecha** («Filtros ⌄», «Orden: Puntaje ⌄», «Vista: tarjetas ⌄»); el chip Filtros del front no lleva flecha
  y Orden y Vista no existen en el front. Las tarjetas de candidato son propias (486/389/457 de alto).
- La ficha: avatar de 144 centrado y el nombre como enlace violeta con ›; el front pone la portada arriba con el Atrás redondo y el avatar
  sobre ella. Relleno de abajo de **100** (para la ⓘ flotante).
- Por aprobar y Propuestas (09) comparten la tarjeta «tipo · fuente · Rechazar / Aceptar»; no tienen par.

### Obras colectivas (15)

- **Bug de toque:** el chip de la hora «Cierra a las 13:41» mide **64 × 34**.
- Dos botones que hacen casi lo mismo uno tras otro: «Crear pared aquí» (violeta, con la ubicación) y «Crear obra aquí» (al elegir lugar).
- En el respaldo sale «No pudimos leer el interruptor de Pincel» porque el respaldo no contesta esa lectura; no lo doy por bug de producción.

### Contenido heredado y estilos muertos

- `src/app/admin/admin.module.css` (859 líneas, 58 clases): **ninguna clase sin uso** (revisado clase por clase contra `src/`). Lo que sobra no
  es CSS muerto sino **piezas duplicadas** de las del front: el renglón (`fila`, `persona`, `renglonFicha`, `foto`, `redonda`, `oculta`), el
  rótulo de grupo, la etiqueta (`etiqueta`, `destacada`, `etiquetaRol`) y el vacío.
- Textos que repiten lo que ya se ve: el título de la página bajo la barra («Lugares» con el logotipo encima) y, en la ficha de persona,
  «perfil público» junto a la colonia.

## Las cinco diferencias más graves

1. **La cabecera y el Atrás:** píldora «Atrás» de 83 × 44 con logotipo y título debajo, donde el front, en sus fichas, pone un Atrás redondo de
   44–48 con el nombre en la barra; y en sus listas, la barra de la app con `ui/Cabecera`.
2. **Los renglones:** tres renglones propios con foto de 48 y una línea sin iconos, frente a `ui/Renglon` lista (foto 56, líneas con icono,
   acción redonda) en todo el front.
3. **Los filtros sin ciudad:** buscador y 6–7 chips que se deslizan y se esconden, frente al chip de ciudad + Filtros (hoja con cuentas) de
   `ui/Cabecera`. No se puede ver solo la Ciudad de México.
4. **La ficha de persona y la del Showcase:** avatar de 144 centrado, frente a la cabecera de ficha del front; y el bug de la fecha repetida en
   «Alta».
5. **Toques chicos:** «Cómo se cuenta» (37 de alto) en la portada y la hora de Obras colectivas (34).

## El plan del cambio (paso 2), por pantallas

Un solo cambio que reutiliza; nada nuevo salvo lo marcado.

| Orden | Pantalla(s) | Qué se hace | Qué se borra | Tamaño |
|---|---|---|---|---|
| 1 | Todas | La barra de Administración pasa a la de las fichas del front: **Atrás redondo 44 + título centrado** (`barraSolida`, la de la persona pública), sin logotipo; el `h1` de debajo se quita (el título ya está en la barra). Se hace una vez en el armazón de Administración. | `ui/Barra` en las 17 páginas de admin, `admin/titulo` | M |
| 2 | Lugares, Eventos, Artistas (una sola página, `[seccion]`) | **`ui/Cabecera`** con el **chip de ciudad** (`ChipCiudad`/`HojaCiudades` de `src/components/Ciudad.tsx`) + chip **Filtros** que abre `ui/HojaFiltros` con los filtros de hoy y sus cuentas; el buscador se queda (ui/Buscador, ya es del canon). Renglones con **`ui/Renglon` lista** (FilaLugares / FilaEventos / ListaArtistas como base) y los tres puntos en el hueco de la acción. Conteo «N lugares» arriba de la lista. | `admin/renglonFicha`, `admin/foto`, `admin/redonda`, `admin/oculta`, la fila de chips | M |
| 3 | Personas y su ficha | Lo mismo que 2 para la lista (renglón lista con el avatar). La ficha: cabecera `FichaPersona` del front y los grupos de hoy en `ui/Renglon`. Arreglar «Alta». | `admin/persona`, `admin/avatar` grande | M |
| 4 | Portada | Solo la barra (paso 1) y el toque de «Cómo se cuenta». Los indicadores con tendencia se quedan (no hay par; ya firmados). | — | S |
| 5 | Ciudades | La lista: renglón de la hoja de ciudad (pin en vez de mira). El panel: se queda (sin par), con la barra nueva. | `ciudades/filaCiudad` si el renglón alcanza | S |
| 6 | Showcase, su ficha, Por aprobar, Propuestas, Corridas, Obras, manuales | Solo la barra nueva; la ficha del Showcase con la cabecera de ficha; la hora de Obras a 44. Las tarjetas de evidencia y propuesta se quedan (sin par). | — | S–M |
| — | Grafo | No se toca (pantalla propia firmada; su Atrás ya es redondo). | — | — |

**El filtro por ciudad**, con la pieza del front: el chip y la hoja de ciudad de Lugares, añadiendo «Todas las ciudades» arriba y, solo en
Personas, «Sin ciudad» al final (lo nuevo, y lo único que no existe hoy en la hoja). Lugares, eventos y artistas ya tienen su columna `ciudad`
(texto, obligatoria, San Luis por omisión); las personas no: se deduce de lo que administran (`lugares_cuentas`, `artistas_cuentas`), luego de
lo que publicaron (`creado_por`) y luego de sus «Voy» / «Me interesa»; si nada, «Sin ciudad». Necesita una **migración que solo añade**
(`p_ciudad` con valor por omisión en `panel_lugares`, `panel_eventos`, `panel_artistas`, `panel_personas` y sus conteos, y una función para la
ciudad de una persona). La ciudad elegida vive en `?ciudad=` (memoria de pantalla) y se repite en las cuatro listas mientras dure la sesión.

**Tamaño total estimado:** pasos 1 a 3 con la migración, un PR mediano-grande (la barra en un solo sitio, una página para tres listas y
Personas); 4 a 6, uno chico. **Lo nuevo justificado:** «Todas las ciudades» y «Sin ciudad» en la hoja de ciudad, y el acomodo de los tres puntos
en el hueco de acción de `ui/Renglon` (hoy ese hueco es Seguir / Voy).

## Capturas (izquierda Administración, derecha el front; 390 × 844 a 2×), abiertas y descritas

- `01-portada.png` — Administración: «Atrás» en píldora, logotipo, título, «PENDIENTE 25» con cuatro renglones y los indicadores de 7 días.
  Ajustes: la misma barra y el mismo título; rótulos y renglones de `ui/Renglon` con interruptores.
- `02-personas.png` — Personas: buscador, chips «Todas 3 · Nuevas 0 · Sin entrar 0 · Administración», renglones de 76–81 con avatar de inicial y
  ›. Artistas del front: barra de la app, chip «San Luis Potosí», tira de letras, «6 artistas», grupos por letra, renglones con foto de 56, dos
  líneas con icono y botón de seguir; barra de secciones abajo.
- `03-persona.png` — Ficha de Ana en Administración: avatar de 144 centrado, «Cuenta» y «Actividad», «Alta: lun 7 de sep · el lun 7 de sep». Su
  ficha pública: Atrás redondo y «Ana Rentería» en la barra, avatar a la izquierda, «Va a 2 · Sigue 2», eventos por día.
- `04-lugares.png` — Lugares de Administración: chips «Todos 9 · Destacados 0 · Ocultos 0 · Sin fecha pró…» cortados, nueve renglones con foto de
  48 y tres puntos. Lugares del front: chip de ciudad y Filtros, el mapa, la hoja «9 lugares · Próximos primero», «Con eventos · 7» y renglones
  con dirección y próximo evento.
- `05-eventos.png` — Eventos de Administración: «Próximos 21 · Destacados 0 · Esta semana 15 · Co…», renglones de 100–142 con todo el detalle en
  una línea larga; «Ecos de papel» con «Oculto». Agenda: ciudad, Cuándo, Filtros, pestañas «Todos / Nuevos», grupos por día con su cuenta,
  renglones con hora y lugar en líneas con icono.
- `06-artistas.png` — Artistas de Administración: renglones redondos de 48 con «Música · Rock… · 1 fecha próxima». Artistas del front, como en 02.
- `07-ciudades.png` — Ciudades: renglones con icono de mira, píldora «Abierta / Detectada», tres cifras con icono, número violeta, «Abrir» y
  «Ocultar» subrayado, «Añadir ciudad» flotante. Al lado, la hoja «Ciudades con lugares» del front: «Usar mi ubicación» y San Luis con pin,
  «9 lugares · 18 eventos» y ✓.
- `08-ciudad.png` — Panel de Oaxaca: «Por revisar 5» con «Revisar las 5», tarjetas Lugares 0 (Terminada, «Buscar lugares»), Eventos próximos 0
  (Corriendo, barra), Artistas 0. Ficha del Teatro de la Paz: portada con Atrás y ··· redondos, «Distancia · Eventos · Siguen», acciones
  redondas, próximos eventos y «Seguir» flotante.
- `09-propuestas.png` — Propuestas de Oaxaca: «Aceptar las 5», rótulo de la fuente, tarjetas con «Rechazar / Aceptar». Sin par.
- `10-corridas.png` — Corridas: Crédito 192,29 y Gastado 7,71, «En curso 1» con barra, «Esta semana» con píldoras Terminada / Falló / Llegó al
  tope. Sin par.
- `11-showcase.png` — Showcase: buscador, «Filtros ⌄ · Orden: Puntaje ⌄ · Vista: ta…», chips de disciplina, cifras y «Seleccionar», «Por
  aprobar 5», «Investigar», tarjeta de Feleal con rúbrica. Artistas del front al lado.
- `12-showcase-ficha.png` — Ficha de Feleal en el Showcase: avatar de 144, nombre violeta con ›, «2 por revisar ⌄», Estado y Rúbrica, ⓘ flotante.
  Ficha pública de Feleal: Atrás y ··· redondos sobre la portada, avatar y nombre en ella, «Fechas · Siguen · Lugares», Compartir, próximas fechas.
- `13-por-aprobar.png` — Por aprobar: renglón de Feleal con «2 ›», tarjetas de evidencia con «Si la aceptas: Obra 1 → 2», «Aceptar las 2 de
  Feleal». Sin par.
- `14-grafo.png` — Grafo: pantalla oscura propia con Atrás redondo, título y cuentas, capas, mandos. Sin par.
- `15-obras.png` — Obras colectivas: aviso de Pincel (del respaldo), «Crear pared aquí», formulario con lugar, nombre con ✕, «Cierra a las 13:41»
  en un chip de 34 y «Crear obra aquí». Sin par.
- `16-manual.png` — Manual del grafo: índice de chips subrayados y tarjetas de texto. Ayuda: la misma barra, texto corrido con subtítulos.
- `medidas.json` — todas las medidas por pantalla (cabecera, Atrás, título, columna, renglones, barra de abajo, nodos, profundidad, toques chicos).

## Preguntas para el founder

1. **¿Qué barra quieres en Administración?** Recomiendo la de las fichas del front: Atrás redondo y el nombre de la pantalla al centro, sin
   logotipo ni título repetido debajo. La otra opción es la barra de la app (+, buscar, avisos) con Atrás, como Lugares; pero esa barra no tiene
   Atrás en el front.
2. **¿Los filtros de cada lista pasan a la hoja «Filtros»** (como Lugares), con el chip de ciudad al lado? ¿O se quedan los chips a la vista y
   solo se añade el chip de ciudad delante?
3. **La ciudad de una persona:** ¿la que más se repite entre lo que administra, publica y marca «Voy», y «Sin ciudad» si nada? ¿Y cuenta en una
   sola ciudad o en todas donde tiene algo?
4. **¿La ciudad elegida se recuerda** en las cuatro listas mientras no cierres la app, o hasta que la cambies?
5. **¿El Grafo, el panel de ciudad, Corridas y las bandejas** (Propuestas, Por aprobar) se quedan con su diseño, solo con la barra nueva?

## Parte A: lo que se cambió (2026-10-23)

El founder: «Adelante, y acepto tus recomendaciones para optimizar toda la sección que mencionas, incluido el grafo.» Decisiones que se
aplican: (1) la barra de las fichas en toda Administración; (2) los filtros en la hoja «Filtros», con el chip de ciudad delante; (3) la ciudad de
una persona es la que más se repite entre lo que administra, publica y marca «Voy»; si nada, «Sin ciudad»; cuenta en una sola; (4) la ciudad
elegida se recuerda en las cuatro listas mientras la app esté abierta (`?ciudad=` y una galleta de sesión); (5) todas las pantallas pasan al
canon: esta parte A hace la barra de todas y las cuatro listas con la ficha de persona; la parte B, el resto (Grafo incluido).

**Migración `20261023120000_admin_ciudad.sql`** (solo añade; por aplicar antes de desplegar):

- `ciudad_slug(texto)`: el slug de la ciudad de una ficha, unificado con la tabla `ciudades` (slug, nombre, alias y ciudad ampliada); vacío o
  Soledad, San Luis Potosí (como la app).
- `ciudad_de_persona(uuid)`: la que más se repite entre lo que lleva (`lugares_cuentas`, `artistas_cuentas`), lo que publicó (`creado_por`) y
  sus «Voy» (no «Me interesa»); empate, la de lo más reciente; null si nada. Solo la llaman las funciones del panel (revocada para todos).
- Una versión con `p_ciudad` de `panel_lugares`, `panel_eventos`, `panel_artistas`, `panel_personas`, `panel_fichas_conteos` y
  `panel_personas_conteos`: letra por letra las de hoy más la condición de la ciudad, sin valores por omisión (no chocan con las de hoy, que se
  quedan). Y `panel_en_ciudad` (los destacados de una sección en una ciudad) y `panel_ciudades_de` (la hoja: cada ciudad con su cuenta,
  «Sin ciudad» al final en Personas).
- Banco nuevo `supabase/tests/pg/admin-ciudad.test.mjs`: alias, nombre, Soledad y vacío; con null las listas y las cuentas son las de hoy; con
  una ciudad, solo lo suyo (también lo oculto); la ciudad de Beto (dos «Voy» en San Luis pesan más que un artista en la Ciudad de México), la de
  Ana y la de quien no tiene nada; «Sin ciudad»; la hoja con su orden; y que ni una cuenta cualquiera ni un visitante las leen.

**Qué pieza del front reemplaza a cuál:**

| Antes (propio de Administración) | Ahora (del front) | Dónde |
| --- | --- | --- |
| `ui/Barra` con la píldora «Atrás» (83 × 44), el logotipo y el título repetido debajo | `ui/Barra` con título: el Atrás redondo de las fichas (`AtrasIcono`, 44 × 44, contorno) y el nombre al centro, como la barra sólida de la ficha pública de una persona. Ese nombre es el encabezado de la página; si la página ya trae el suyo (una ficha), la barra lo enseña sin repetirlo al lector de pantalla | las 17 pantallas de Administración |
| Buscador y una fila de 6–7 chips con su cuenta | `ui/Cabecera` con el chip de ciudad (`ui/Chip` contexto) y el chip Filtros, que abre `ui/HojaFiltros` («Mostrar» con cada filtro y su cuenta, «Ver N lugares», Limpiar); el filtro puesto, con su ✕; el buscador debajo | Personas, Lugares, Eventos, Artistas (`CabeceraLista.tsx`) |
| — | La hoja de ciudades de la app (ui/Hoja plana, renglones de `ui/Renglon` con su cuenta y ✓, el campo con ✕ si hay más de 8), con «Todas las ciudades» arriba y, en Personas, «Sin ciudad» al final | las cuatro listas |
| `admin/renglonFicha` (foto 48), `admin/persona`, las etiquetas «Oculto» / «Destacado» | `ui/Renglon` lista (foto 56, título en la letra de las listas, dos líneas de meta) dentro de `ui/Grupo`, con los tres puntos en el hueco de la acción; «Oculto» y «Destacado» al principio de la meta; sin foto, el símbolo SN | las cuatro listas |
| «Ver más» a todo lo ancho | El de `ui/CargarMas` (píldora chica, al centro) | las cuatro listas |
| Avatar de 144 al centro con el nombre debajo | La cabecera de `FichaPersona` (avatar 72 a la izquierda, nombre y colonia al lado) | ficha de una persona, ficha del Showcase |

**Lo que se borró:** `Avatar.tsx` y, de `admin.module.css`, el renglón propio (`renglones`, `persona`, `renglonFicha`, `foto`, `redonda`,
`oculta`) y la cabecera de 144 (`cabecera`, `avatar`): de 859 a 752 líneas, sin clases sin uso. El título repetido bajo la barra, en todas.

**Lo poco nuevo, justificado:** la variante con título de `ui/Barra` (copia la barra sólida de las fichas: Administración es una tarea y desde
792 su barra va bajo la de la app, donde `BarraFicha` no se pega); «Todas las ciudades» y «Sin ciudad» en la hoja; los tres puntos en el
hueco de acción del renglón; y `.listado` en `admin.module.css` (la rejilla de una columna de las listas del front, con la cabecera pegada bajo
la barra).

**Arreglos:**

- «Alta» ya no repite la fecha: pasadas dos semanas dice solo «lun 7 de sep» (`src/lib/panel.ts`, con su prueba).
- «Cómo se cuenta» mide 44 de alto (antes 37).
- El campo de la hora de los chips nativos (`ui/Chip` `ChipNativo`; también el de Cuándo del front) cubre el toque de 44, no los 34 del chip
  sin bordes; su prueba de componente se puso al día. `comparar` lo marca ahora como «se sale de su caja»: es a propósito, como el `::before`
  de los chips que se tocan.
- En el panel de una ciudad el nombre ya no sale dos veces (barra y título): su estado va al principio de la línea de abajo.
- `medir.js` deja de medir lo que guarda un `<details>` cerrado (no se pinta): era un falso «se sale de su caja» en la portada.

**Medido después, contra el par del front** (`A-medidas.json`; `getBoundingClientRect` a 390 × 844):

| | Antes | Después | El front |
| --- | --- | --- | --- |
| Atrás | píldora 83 × 44 en (20, 6) | 44 × 44 en (20, 6) | persona: 44 × 44 en (20, 6) |
| Barra | 56, logotipo; título de 26 px debajo, en y 68 | 56, título de 17 px en la barra | 56, nombre de 17 px en la barra |
| Renglón de Lugares | 69–103, foto 48 | 81–95, foto 56 | 95–161, foto 56 |
| Renglón de Eventos | 100–142 | 95–117 | Agenda: 95–117 |
| Renglón de Personas | 76–81 | 81–95 | Artistas: 95–117 |
| Relleno extra | — | ninguno: barra y cabecera juntas; lo que sigue a la barra empieza a 16, como la cabecera de una ficha | |
| Profundidad | 7–8 | 8–10 | 10–13 |
| Toques de menos de 44 | 2 (portada, Obras) | 0 | 0 |

Los envoltorios sin clase que suben (de 1 a 22 en Lugares) son los `<span>` de la meta de `ui/Renglon`: los mismos que en el front.

**Pruebas:**

- `npm run lint` (2 avisos de antes, ajenos), `npm run typecheck`, `npm test`: 282 archivos, 4 636 pruebas, todas bien.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 110 migraciones, **2 403 pruebas, 0 fallaron** (con el banco nuevo).
- `npm run test:componentes`: 724 pruebas, 723 bien; la que falló era la de `ChipNativo`, que esperaba el campo de 34 de alto: se puso al día y su
  archivo pasa entero (11 de 11). Nueva: `src/app/admin/CabeceraLista.componentes.test.mjs`, cinco pruebas con toques reales (clics de ratón
  por coordenadas), todas bien: la hoja de ciudades con «Todas» y sus cuentas; elegir reemplaza (no apila), conserva la búsqueda, quita la
  página y guarda la galleta; «Todas» la borra; con más de 8, el campo con ✕; «Sin ciudad» en Personas; Filtros con sus cuentas, «Sin lugares»
  apagado, cerrar no aplica y el ✕ quita el filtro.
- `npm run inventario`: sin novedades (las medidas en duro bajaron de 334 a 328, anotado). `npm run medir`: 58 pantallas × 4 anchos, sin
  novedades; se sumaron Lugares, Eventos con ciudad, Artistas, Personas y la portada de Administración (s41–s45), con el teclado comprobado en
  sus buscadores; 14 pantallas bajaron de nodos.
- `next build`: correcto.

**Capturas de la parte A** (tres columnas: antes, después y el par del front; 390 × 844 a 2×), abiertas y descritas:

- `A-01-lugares.png` — antes la píldora «Atrás», el logotipo, «Lugares» grande y la fila de chips cortada; después el Atrás redondo con
  «Lugares» en la barra, «Todas las ciudades» y Filtros pegados debajo, el buscador, «9 lugares» y los renglones de la app con sus tres puntos;
  a la derecha Lugares del front, con la misma fila de ciudad y Filtros.
- `A-02-lugares-hoja-ciudad.png` — la hoja «Ciudades con lugares»: «Todas las ciudades · 9 lugares» con ✓ y San Luis Potosí; al lado, la del front.
- `A-03-lugares-filtros.png` — la hoja Filtros: «Mostrar» con Todos 9, Destacados 0, Ocultos 0, Sin fecha próxima 2, Sin foto 2, Del catálogo 0,
  Limpiar y «Ver 9 lugares»; al lado, la Filtros de Lugares del front con el mismo pie.
- `A-04-artistas-cdmx.png` — `?ciudad=ciudad-de-mexico`: el chip en violeta, «1 artista», Rocío Lozano con el símbolo SN redondo.
- `A-05-eventos.png` — Eventos: la barra, la fila, «21 eventos» y renglones de 95–117 con la fecha en la primera línea y el lugar en la segunda,
  «Oculto» al principio de la meta de «Ecos de papel»; al lado, la Agenda.
- `A-06-personas.png` — Personas: «3 personas» con el renglón de la app («Administración · Abriste la app hoy»); al lado, Artistas.
- `A-07-personas-sin-ciudad.png` — la hoja «Ciudades con personas» con su nota: Todas 3, San Luis Potosí 2 y «Sin ciudad · 1 persona».
- `A-08-persona.png` — la ficha de Ana: barra con su nombre, la cabecera del front (avatar 72, nombre y colonia), «Alta: lun 7 de sep» sin
  repetir; al lado, su ficha pública.
- `A-09-portada.png` — la portada: la barra con «Administración» y «Pendiente» justo debajo; al lado, Ajustes.
- `A-10-ciudad.png` — el panel de Oaxaca: «Oaxaca» en la barra y «Abierta» al principio de su línea, sin el nombre repetido.
- `A-11-showcase-ficha.png` — la ficha de Feleal en el Showcase con la cabecera de ficha (avatar 72 a la izquierda); el resto es de la parte B.
- `A-12-obras.png` — Obras colectivas con la barra nueva; el chip de la hora ya recibe el toque en sus 44.
- `A-medidas.json` — las medidas de antes, después y del front.

**Para la parte B** (rama `admin-canon-2`): el resto de cada pantalla con piezas del front (Ciudades, su panel, Corridas, Propuestas, Showcase y su
ficha, Por aprobar, Obras, manuales y el Grafo).

## Archivos

- `scripts/ops/auditoria-ui/comparar-admin-front.mjs` (nuevo: medidas y capturas lado a lado).
- `scripts/ops/auditoria-ui/maqueta-pantalla.mjs` (17 pantallas más: el resto de Administración y los pares del front).
- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs` (las listas de fichas de Administración con renglones).
- `docs/rediseno/capturas-488/` (16 PNG, 1,9 MB, y `medidas.json`).
- `docs/ops/OPEN_LOOPS.md` (OL-456 en «Ahora», «Last updated»; OL-452 sustituida).

La comparación no tocó la app; ninguna de las dos entregas toca los archivos de OL-451.

Parte A: `supabase/migrations/20261023120000_admin_ciudad.sql`, `supabase/tests/pg/admin-ciudad.test.mjs`, `src/app/admin/CabeceraLista.tsx` y su
prueba, `src/components/ui/Barra.tsx` y `Barra.module.css`, `src/lib/panel.ts` y su prueba, las páginas de `src/app/admin/**`,
`src/app/admin/consultas.ts`, `admin.module.css`, `FichaPersona.module.css`, `Chip.module.css` y su prueba, `CapoComoVa.module.css`, `medir.js`,
`pantallas-sesion.json`, `medidas.aceptadas.json`, `inventario.aceptado.json`, `comparar-admin-front.mjs`, `maqueta-pantalla.mjs`, el respaldo
local y `docs/rediseno/capturas-488/A-*`.
