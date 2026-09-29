# 261 · Plantillas raíz: Inicio, Agenda, Artistas, Perfil y la fila de contexto con sus tres hojas (OL-233, pieza P5)

**Fecha:** 2026-09-29 · **Rama:** `ui-raices`, desde `origin/ui-armazon` (`55c2469b`) · **OL:** OL-233 · **PR:** #271 (sin unir; va montado sobre #270, `ui-armazon`, que va sobre #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Quinta pieza del plan de OL-227 (doc 50, § 7); usa los tokens de P1, los botones de P2, el renglón de P3 y el armazón de P4.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código») y las reglas del founder: los enlaces de carril dicen a dónde llevan («Ver mi perfil», «Ver la agenda», «Ver lugares», «Ver artistas»; nunca «Ver todo») y van a la derecha del título; Agenda es una sección de la barra con su fila de contexto y su lista por día, y «Solo lo que sigo» se queda; Cuándo elegido desde Inicio lleva a Agenda con ese valor; filtrar no es navegar. La hoja de Lugares (mapa + lista en hoja) es de la pieza siguiente: Lugares se queda como está.

## Lo que había

- **H-24:** en las raíces, 8 márgenes negativos medidos (los 7 chevrons de los carriles de Inicio, `margin-right: -10px`, y la ✕ del chip de fecha de Agenda, `-8px`). La raíz era un bloque suelto (`.raiz`: alto mínimo y relleno).
- **H-09:** un renglón de evento llegaba a **202,7 px** a 390 (título, hora, sitio con su dirección postal en tres líneas, «N van», «Gratis» en todos); 181,7 en «Siguiendo».
- **H-10:** el título de un día (raya en tinta, 14/6 de aire) y el de una letra en Artistas (gris, sin raya, `li` aria-hidden) eran otros dos estilos; los de carril, un tercero.
- **H-11:** «Todos · Siguiendo» a mitades; los tipos de Lugares y de Artistas y las letras se cortaban a la derecha sin señal.
- **H-16 / Inicio:** nueve carriles (Cerca de ti, Populares y «Artistas con eventos» además de los seis del prototipo firmado) y «Seleccionados para ti» enviaba a `/agenda?filtro=siguiendo`, un filtro que nadie eligió.
- Agenda tenía tres filas de cabecera (chip de fecha, ciudad, pestañas); Artistas hasta cuatro (ciudad, pestañas de disciplina, chips de detalle, letras); Perfil, una barra propia de fichas y pestañas con el número al lado.

## Lo que se hizo

### 1. Plantilla raíz (`globals.css .raiz`)
Una rejilla de una columna con el área `cabecera` y una fila por bloque (`grid-auto-rows: max-content`). La página no lleva aire a los lados: cada bloque pone el suyo (`.columna` en el encabezado de Perfil, `--gutter` en los títulos de grupo y las listas). Sin envoltorios nuevos: `Inicio` pierde el `div.carriles` y su módulo, `ListaArtistas` el `<section>` y su `ul`.

### 2. La fila de contexto y sus hojas (`FilaEventos`, en Inicio y Agenda)
**Ciudad · Cuándo · Filtros** y, después, cada filtro puesto con su ✕ (`ChipQuitar`); el chip de Cuándo va en violeta con su valor. Cada hoja arma su elección aparte y solo la aplica el botón, que dice cuántos eventos da (`Ver 13 eventos`, `Ver 1 evento`, `Sin eventos` apagado); la ✕ o tocar fuera no cambian nada. El número sale de la misma lista que pinta Agenda (`listarAgenda`), no de otra cuenta.
- **Dónde estás** (`Ciudad.tsx`): «Cerca de ti» (ubicación del teléfono → la ciudad de la lista más cercana por su centro, `ciudadMasCercana`; sin permiso lo dice), la ciudad de ahora marcada y «Otra ciudad», que abre un campo con las demás, filtradas sin acentos («queretaro» halla «Querétaro»).
- **Cuándo** (`HojaCuando`, `lib/cuando.ts`): Hoy · Mañana · Fin de semana · Esta semana · Elegir fecha… · Todos los próximos. Los atajos se cuentan desde la fecha de hoy de la ciudad (fin de semana: sábado y domingo de esta semana, desde hoy si ya empezó; esta semana: hoy y seis días más, como el carril). «Elegir fecha…» abre `ui/Calendario` **dentro de la misma hoja**: un toque un día, dos un rango, el mismo día lo quita; punto bajo cada día con eventos; el mes en curso arranca en la semana de hoy.
- **Filtros**: Cuánto (Gratis: sin precio; Cooperación: «Cooperación solidaria»; una, otra o las dos) y Siguiendo (palanca «Solo lo que sigo»). En Artistas: Disciplina y, dentro de una con muchos, el detalle (lo que ya existía, ahora en la hoja; cada chip cambia la URL con `replace` y la hoja queda abierta con el número al día).
- **La tira que sigue (H-11)** (`useTiraQueSigue`, `[data-sigue]` en globals): la fila de chips, la tira de letras y las pestañas de Lugares se deslizan y su borde derecho se desvanece mientras haya más.
- Desde Inicio, Cuándo y Filtros **llevan a Agenda** con eso en la URL (`?desde=&hasta=&cuanto=&filtro=`); en Agenda el estado vive en el teléfono con la memoria de pantalla de siempre (sin apilar historial). Un enlace viejo (`?filtro=siguiendo`) sigue funcionando.

### 3. Inicio: los seis carriles del prototipo
Tus planes · Destacados (o «Seleccionados para ti») · Esta semana · Nuevos eventos · Lugares con eventos · Artistas destacados. Cada uno con su título a la izquierda y su enlace honesto a la derecha, en violeta con su chevron y de 44 de alto (`Destacados`: el título ya no es un enlace). «Ver la agenda» va a `/agenda` con la ciudad, sin `?filtro=siguiendo`.

### 4. Agenda, Artistas y Perfil
- **`ui/Grupo`**: un día o una letra en su `section` con el título pegado bajo la cabecera (`--barra-vista` + `--alto-cabecera`); un solo estilo (H-10). Las letras saltan a su grupo (`irAlGrupo` mide solo la cabecera).
- **Renglón de evento a dos líneas** (`RenglonEvento`, H-09): título hasta dos líneas (para todos los renglones de lista), primera línea «19:00 · $150 · 4 van» (el precio solo si no es gratis) y segunda el nombre del sitio, sin la dirección postal (`sitioEnLista`); cada una corta con puntos suspensivos. `Renglon` pierde su opción `columna`: todos los datos van uno por línea.
- **Artistas**: fila ciudad · Filtros · lo puesto; sin las pestañas de disciplina ni los chips de detalle; letras y grupos por letra.
- **Perfil** (`FichaPersona`, `PestanasPersona`): raíz; avatar de 72; tres tarjetas **Voy · Interesan · Sigo** que hacen de pestañas; los días de «Voy» y los tipos de «Sigo» (Lugares, Artistas) son grupos pegajosos; «Así te ven los demás» es un botón de texto de 44. La ficha de otra persona conserva su cabecera y sus subtítulos; solo cambia el renglón de evento de «Va a», que ahora es de dos líneas (139,7 → 116,7).

### 5. Lo que se retiró
`CarrilCercanos`, `app/accionesAgenda.ts` (`cargarCercanos`) y `lib/cargarCercanos.ts` (solo los usaba ese carril); `carrilPopulares`, `idsUsadosEnAgenda` y `MINIMO_POPULARES` (`lib/inicio`); `ocupaDia` (`lib/calendario`: `ocupaRango` cubre también un solo día); `Inicio.module.css`, `AgendaInicio.module.css`; las pestañas Todos · Siguiendo y `FILTROS` de `lib/agenda`; `repartidas` de `Pestanas`; `columna` de `Renglon`; `.chevron` de `Destacados` (con su margen negativo). Para restaurar lo de Inicio: `git checkout 55c2469b -- src/components/inicio/CarrilCercanos.tsx src/app/accionesAgenda.ts src/lib/cargarCercanos.ts`.

## Decidí yo (para que el gestor confirme)

1. **Seis carriles**: quité «Cerca de ti», «Populares» y «Artistas con eventos» porque el prototipo firmado trae seis (el doc 50 dejaba para P5 decidir el segundo carril de artistas) y con ellos se fue su código. Es lo único con riesgo de veto.
2. **Calendario de Cuándo con flechas** (un mes a la vez): el doc dejaba abierto dos meses seguidos o flechas; reutilicé el calendario de siempre. Los días sin eventos se pueden tocar (el botón dice «Sin eventos» y se apaga), como en el prototipo; en Lugares siguen apagados.
3. **Filtros de Artistas**: solo Disciplina y detalle. «Con fechas próximas» y «Solo a quienes sigo» del prototipo piden consultas nuevas en el servidor (la lista viene paginada): no las hice.
4. **Perfil**: las tarjetas son el control (el prototipo trae también una fila de chips Voy · Me interesa · Sigo: repetía el mismo control y no la puse); dejé **Compartir** junto al engrane (el prototipo solo trae el engrane); el letrero es **«Sigo»**, como el prototipo (el encargo dice «Siguen», que es el KPI de lugar y de artista).
5. **Artistas conserva la dirección postal** en «Próximo:» (renglón de 179,7 px): es el mismo defecto de H-09 pero no lo pedía el encargo (una línea en `artistas/page.tsx`: `sitioEnLista`).
6. `.raiz` como rejilla con el área `cabecera`: el aviso «Tu cuenta quedó borrada» de Agenda, que iba antes de la cabecera, ahora queda debajo (solo con `?cuenta=borrada`).
7. En mi copia del respaldo inventado los eventos gratis llevan precio nulo, como en producción (el del repositorio trae el texto «Gratis»), y hay 12 artistas más, ordenados, para llegar al umbral de los filtros. Las capturas del «antes» y del «después» usan el mismo.

## Lo que cambia a la vista

- **Inicio**: fila de tres chips; título a la izquierda y enlace a la derecha en cada carril; seis carriles (8 px menos de aire entre carriles: se fue el `gap` del contenedor).
- **Agenda**: sin pestañas; fila ciudad · Cuándo · Filtros; títulos de día pegados, en gris con raya suave; renglones de dos líneas (202,7 → 116,7).
- **Artistas**: sin las dos filas de pestañas y chips; Filtros abre una hoja; títulos de letra pegados.
- **Perfil**: avatar 72, tarjetas de números, días pegados, enlace de texto.
- **Las tres hojas** y la **tira de chips** con señal.
- **Lo que no cambia** (comparado píxel a píxel, script de la sesión): Lugares (0,01 % el mapa y 0,06 % la lista: el desvanecido de su tira de tipos y poco más), Ajustes y la hoja de fecha y hora del alta de evento (`SelectorFecha` sobre `Calendario`): idénticos; la primera pantalla de las fichas de lugar y de artista, 0,01 % y 0,03 %; la ficha de otra persona cambia solo en su renglón de evento (4,93 % de los píxeles: el renglón de dos líneas; sus subtítulos de siempre no se mueven).

## Verificación

- `npm run lint`: 0 errores (una advertencia que ya estaba). `npm run typecheck`: verde. `npm test`: 115 archivos, **1 504** pruebas (1 484 antes). `npm run build` sin variables de entorno, como la CI: verde.
- **Pruebas nuevas**: `cuando.test.ts` (los atajos desde una fecha dada —martes, sábado, domingo, cruce de mes y de año—, la etiqueta, el calendario de un toque/dos/quitar y la URL), `agenda.test.ts` (rangos, un evento de varios días, Cuánto, agrupar con `desde`, la URL y `listarAgenda`: lo que dice el botón es lo que trae la lista), `eventos.test.ts` (`sitioEnLista`), `ciudad.test.ts` (`ciudadMasCercana`), `indice.test.ts` (`agruparPorLetra`), y en Chrome real `FilaEventos.componentes.test.mjs` (7: atajos y cuenta, aplicar y cerrar sin aplicar, calendario con puntos y rango, semanas pasadas fuera, Filtros y sus ✕, la fila que avisa que sigue, «Otra ciudad» sin acentos) y `Renglon.componentes.test.mjs` (8: título a dos líneas y dos líneas de meta). **Comprobado que fallan** sin lo que cuidan (seis cambios: las semanas pasadas, el aviso de la tira, el fin de semana de tres días, el rango sin su último día, la dirección postal en la lista, el título sin cortar).
- Pruebas de componente viejas: ChipFecha 9/9, Armazon 10/10, Destacados 9/9, Seguir 3/3, BotonIcono 8/8, cargador 3/3. `cupo` (13), `guardado` (2) y `nuevos` (6) fallan igual en el código base (21, no son de esta pieza).
- **Recorridos reales** contra la app compilada (12, script de la sesión): Inicio → Cuándo → «Mañana» → «Ver 1 evento» llega a `/agenda?desde=` con el chip «Mañana» y solo ese día, y Atrás vuelve a Inicio; filtrar en Agenda no apila historial; ir a una ficha y volver repone Gratis y Esta semana; `?filtro=siguiendo` llega puesto; en Artistas elegir una disciplina no apila historial y la hoja sigue abierta con «Ver 4 artistas»; «Cerca de ti» con y sin permiso; «Otra ciudad». El salto a una letra deja su título a 104,0 de una cabecera que termina en 104.
- **Medidas** (`medir.js`, respaldo inventado, 390×844, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Márgenes negativos en las raíces (Inicio, Agenda, Artistas, Perfil, Lugares) | **8** (Inicio 7, Agenda con día 1) | **0** |
  | Renglón de Agenda, alto máximo | **202,7** (día elegido 139,7; «Siguiendo» 181,7) | **116,7** (los tres) |
  | Renglón de Agenda a 1 280 | 138,8 | 94,8 |
  | Renglón de Perfil | 160,7 | 116,7 |
  | Desbordes en Inicio | 15 | 5 (el «+» de las tarjetas redondas, que flota sobre el borde a propósito: P10) |
  | Envoltorios en Inicio | 22 | 7 |
  | Toques de menos de 44 | 2 (la ✕ de la fecha, «Así te ven los demás») | **0** |

## Capturas

`docs/rediseno/capturas-261/` (32 PNG de paleta, 2,4 MB, a 390×844 a 2× salvo las de 1 280×800). «Antes» es la compilación de `origin/ui-armazon` y «después» esta rama, ambas con la sesión de `ana@example.com` del respaldo local inventado; cada una abierta y descrita.

1. **Inicio** (`01`): antes, solo el chip de ciudad y un chevron pegado a cada título; después, tres chips (ciudad · Cuándo · Filtros) y «Ver mi perfil ›» y «Ver la agenda ›» a la derecha en violeta. Tus planes a 340 px en las dos; lo de abajo sube 8 px.
2. **Inicio desplazado** (`02`): antes, «Nuevos eventos», «Lugares con eventos» y «Artistas destacados» con su chevron y la fila con solo la ciudad; después, la fila de tres chips pegada arriba y «Ver la agenda ›», «Ver lugares ›» y «Ver artistas ›».
3. **Agenda** (`03`): antes, chip de fecha, ciudad y pestañas Todos · Siguiendo; días con raya en tinta; el primer renglón de 202 px con la dirección postal en tres líneas y «Gratis». Después, una sola fila de tres chips; título de día gris con raya suave; renglón de dos líneas («18:00» y «Templo de San Francisco»).
4. **Agenda, un día** (`04`): antes, el chip «sáb 3 oct ✕» y el título largo «sábado 3 de octubre»; después, Cuándo en violeta con «sáb 3 oct» y el título «sáb 3 de oct».
5. **Solo lo que sigo** (`05`): antes, la pestaña Siguiendo; después, «Filtros» con su 1 en un círculo, la fila que se desliza (el chip «Solo lo que sigo ✕» queda a la derecha, tras el desvanecido) y los mismos tres días en renglones de dos líneas.
6. **Agenda desplazada** (`06`): antes, los títulos de día pasaban de largo; después, la fila arriba del todo (la barra recogida) y el título «vie 2 de oct» pegado bajo ella mientras su renglón pasa por debajo, hasta que llega el del día siguiente.
7. **Artistas** (`07`): antes, ciudad, pestañas «Todos 18 · Música 7 · Teatro 4 · Danza 3 · Arte…» cortadas y las letras cortadas en la «H», sin señal; después, ciudad y Filtros, las letras con la «H» desvanecida y los títulos de letra pegados con su raya.
8. **Artistas, una disciplina** (`08`): antes, tres filas (pestañas con Música activa, chips de detalle «Todo 7 · Rock, metal y alternativo 5 · Música académ…» y letras); después, ciudad, Filtros con su 1 y «Música ✕» en violeta con el desvanecido a la derecha, y las letras.
9. **Artistas, hoja Filtros** (`09`, solo después): «Disciplina» (Todos 18, Música 7 activa, Teatro, Danza, Artes visuales) y «Qué música» (Todo 7, Rock, Música académica, Acordeón) sobre la lista; «Limpiar» y «Ver 7 artistas».
10. **Perfil** (`10`): antes, avatar de 96 pegado a la barra, pestañas «Voy a 2 · Sigo 2» con el número al lado, días en gris sin raya y el enlace subrayado de 18 px; después, avatar de 72 con aire arriba, dos tarjetas (Voy 2 en violeta, Sigo 2), días pegados y «Así te ven los demás» como botón de texto.
11. **Dónde estás** (`11`): antes, «Dónde», una frase y una fila «San Luis Potosí · 9 lugares · 13 eventos»; después, la nota «la ciudad ordena, no limita» y una tarjeta con «Cerca de ti», la ciudad de ahora con su palomita y «Otra ciudad».
12. **Cuándo** (`12`): antes, «Selecciona una fecha» con el mes entero, 27 días apagados y «Listo»; después, los seis chips (Elegir fecha… abierto), el calendario dentro de la hoja desde la semana de hoy (28 apagado, 29 hoy, 30) con un punto bajo cada día con eventos, y «Limpiar» y «Ver 13 eventos».
13. **Filtros** (`13`, solo después): «Cuánto» (Gratis, Cooperación), «Siguiendo» («Solo lo que sigo» con su palanca) y «Ver 13 eventos».
14. **Inicio a 1 280** (`14`) y 15. **Agenda a 1 280** (`15`): la fila alineada con la columna, el enlace de cada carril en el borde derecho de la columna y, en Agenda, los títulos de día a todo lo ancho con su texto en la columna y los renglones de dos líneas (antes la meta iba en una fila y crecía con la dirección).
16. **Perfil, pestaña Sigo** (`16`): antes, «Voy a 2 · Sigo 2» con el número al lado, los subtítulos pequeños «Lugares · 1» y «Artistas · 1» en gris y el enlace subrayado; después, las tarjetas Voy y Sigo (Sigo en violeta, la activa) y los títulos «Lugares» y «Artistas» pegados con su raya, como los días de Voy (la cuenta solo sale con dos o más). El renglón del artista sigue con la dirección postal en «Próximo:» (decisión 5).
17. **Ficha de otra persona** (`17`): antes y después con la misma cabecera de 96, las pestañas «Va a 2 · Sigue 1 · Van a lo mismo 1» y los subtítulos de día en gris; solo cambia el renglón de evento: «19:00 · 2 van» y el sitio, en dos líneas en vez de tres (139,7 → 116,7; «Gratis» ya no se repite).

## Anotado para las piezas que siguen

- **Hoja de Lugares.** Lugares conserva `ChipFecha` (un solo día) y sus `Pestanas` de tipos (ahora con la señal de que siguen); al migrar a la fila ciudad · Cuándo · Filtros se puede borrar `ChipFecha` y el modo «filtro» de `SelectorFecha`; el carril «Con eventos esta semana» de su lista (H-16) sigue; `cajaMapa` mide con `--alto-cabecera` (H-14).
- **P6 (ficha).** `FichaPersona` de otra persona conserva su cabecera de 96 y `h3.dia`; el título de grupo de Perfil (`ui/Grupo`) es el que le toca.
- **P7 (responsivo).** Desde 792 la fila de contexto va alineada a la izquierda de la columna; el prototipo la centra en tableta y escritorio. `Grupo` ya pinta su raya a todo lo ancho con el texto en la columna.
- **P10 (tarjetas y chips).** El interior de la tarjeta del carril no se tocó; quedan 5 desbordes por el «+» de las redondas. `ChipContexto` y `ChipQuitar` son los chips de la fila.
- **P12 (limpieza).** La tarjeta de filas (`renglon.tarjeta`, nueva en `Renglon.module.css`) repite la de `ajustes`, `bloqueados` y `admin`; los modos «cercanos» y «nuevos» de `filtrarAgenda`, `agruparPorPublicacion` y `corteNuevos` no los pide ninguna pantalla; el modo «artistas» de `cargarEventosSemana` tampoco; `nuevos.componentes.test.mjs` prueba una pestaña que ya no existe (falla en main).
- **P13 (lenguaje).** «Así te ven los demás» y «Artistas destacados» quedan como estaban.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin las pruebas, la pieza suma 545 líneas netas (1 655 añadidas y 1 110 quitadas; el CSS +407 y −270).

**Nuevos:** `lib/cuando.ts` y su prueba, `components/FilaEventos.tsx` y su prueba de componente, `ui/Calendario.tsx` y `.module.css` (extraído de `SelectorFecha`), `ui/Grupo.tsx` y `.module.css`, `ui/HojaFiltros.tsx` y `.module.css`, `ui/useTiraQueSigue.ts`, esta bitácora y `docs/rediseno/capturas-261/`. **Borrados:** `CarrilCercanos.tsx`, `app/accionesAgenda.ts`, `lib/cargarCercanos.ts`, `Inicio.module.css`, `AgendaInicio.module.css`. **Con cambios:** `globals.css`, `app/page.tsx`, `agenda/page.tsx`, `perfil/page.tsx` y su CSS, `Inicio`, `AgendaInicio`, `Ciudad` (y CSS), `Destacados` (y CSS), `ListaArtistas` (y CSS), `ListaEsqueleto`, `TiraLetras`, `RenglonEvento`, `RenglonLugar`, `RenglonArtista`, `FichaPersona`, `ActividadPersona`, `PestanasPersona`, los cuatro carriles de `inicio/`, `ui/Cabecera`, `ui/Chip`, `ui/Hoja`, `ui/Iconos`, `ui/Pestanas`, `ui/Renglon`, `ui/SelectorFecha`, `ui/ChipFecha` (comentario), `lib/agenda`, `lib/calendario`, `lib/ciudad`, `lib/eventos`, `lib/indice`, `lib/inicio`, `lib/actividad` y sus pruebas; documentos: `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md`, el doc 50 y Lugares (salvo lo compartido).
