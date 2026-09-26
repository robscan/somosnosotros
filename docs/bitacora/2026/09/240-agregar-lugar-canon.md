# 240 · Agregar lugar con el canon de «¿Dónde es?» (OL-211)

**Fecha:** 2026-09-25 · **Rama:** `agregar-lugar-canon`, desde `origin/main` · **OL:** OL-211 · **De dónde sale:**
founder, sobre la ubicación del alta de lugar: «El nuevo canon de seleccionar lugar no se llevó a agregar lugar.
Entiendo que necesita adaptación pero es el canon, úsalo.» El canon es la pantalla completa «¿Dónde es?» del alta
de evento (OL-173, docs/rediseno/43, variante B firmada; arreglos de OL-179, OL-182 y OL-187): mapa Mapbox de
fondo con los lugares registrados como pines, un solo campo «Nombre o dirección», lista flotante que nunca tapa
nada, pin arrastrable con geocodificación inversa, «Estoy aquí», barra de acciones sobre el teclado, sin inventar
ubicaciones.

## Qué había antes

`src/app/lugares/HojaDonde.tsx`: una hoja a media pantalla (`ui/Hoja`) con un campo de dirección y `Mapa.tsx` en
modo «elegir» — ni pines de lugares registrados, ni pin arrastrable con reverse geocoding en vivo, ni «Estoy aquí»
consciente del teclado. Cambios de verdad en caliente sobre el estado del formulario (sin «Atrás no cambia nada»).

## Qué se compartió (sin duplicar la lógica dura)

Antes de escribir nada nuevo, se separó lo genérico de lo propio del EVENTO dentro de la pantalla de OL-173, para
que «Agregar lugar» reusara lo genérico en vez de copiarlo:

- `src/lib/direccionContexto.ts` ← movido tal cual de `src/app/eventos/direccionContexto.ts` (ya era 100 %
  genérico: limpieza de direcciones, ciudad de contexto, `buscarConContexto` con reintento acotado — nada de
  «evento» adentro). Import actualizado en `HojaDondeEs.tsx` y `eventos/nuevo/page.tsx`; su prueba se movió con él
  (`src/lib/direccionContexto.test.ts`, 41 pruebas, sin tocar una línea).
- `src/lib/buscarLugares.ts` ganó `lugaresPorTexto`, `puntoValido`, `consultarMapa` (antes vivían en
  `eventos/direccionEvento.ts`, mezcladas con lo propio de `OtroSitio`) y `combinarResultados`, `modoDePantalla`,
  `altoTeclado` + los tipos `ResultadoBusqueda`/`ResultadoLugarRegistrado`/`ResultadoMapbox`/`ModoPantalla` (antes
  en `eventos/dondeEsPantalla.ts`). `dondeEsPantalla.ts` y `direccionEvento.ts` se quedan solo con lo que de verdad
  depende de `OtroSitio`/el evento (`decidirGuardado`, `necesitaConfirmarDireccion`, `coincidenciaClara`,
  `textoDelSitio`, `sitioListo`, etc.) y re-exportan lo movido para que nada más tuviera que cambiar su import
  (`dondeEsPantalla.test.ts` y `HojaDondeEs.tsx` siguen importando de `./dondeEsPantalla` sin tocar una línea;
  `gestosFlyer.test.ts` sí actualizó dos imports, mecánico).
- `src/components/MapaDondeEs.tsx` y `src/components/ui/ListaFlotante.tsx`: reusados tal cual, sin cambios — ya
  eran genéricos (`MapaDondeEs` ya recibía `lugares`/`onLugar` como props, sin nada de «evento» adentro).

`src/app/eventos/HojaDondeEs.tsx` **no cambió de comportamiento en absoluto**: solo tres líneas de import
apuntando a la nueva ubicación de `lugaresPorTexto`/`puntoValido`/`consultarMapa`/`buscarConContexto`/etc. Capturas
antes/después del alta de evento (ver «Evidencia») lo comprueban con la vista, no solo con el diff.

## La adaptación (founder, OL-211: «necesita adaptación pero es el canon»)

`src/app/lugares/HojaDondeLugar.tsx` (nuevo, reemplaza `HojaDonde.tsx`/`.module.css`, borrados) es la misma
pantalla — cabecera Atrás/Listo, campo, mapa de fondo, lista flotante, «Estoy aquí», resumen del pin — con lo que
cambia porque aquí se está CREANDO (o corrigiendo) un lugar, no eligiendo uno para un evento:

1. **Los lugares registrados no se eligen.** Sus pines en el mapa y sus renglones en la lista (marcados «YA
   EXISTE», igual que HojaDondeEs marca «Privado») solo avisan y llevan a su ficha (`elegirLugarExistente` fija un
   aviso, nunca mueve el pin propio). Además, cualquier punto que la persona fije (buscar, tocar el mapa, arrastrar
   el pin, «Estoy aquí») se compara contra los registrados con `lugarCercano` (`dondeEstaPantalla.ts`, 150 m,
   MISMO radio que `lugares_parecidos` de `lugares/acciones.ts` — pero solo por distancia, sin exigir el mismo
   nombre: es un aviso temprano mientras se elige la ubicación, no el filtro final de duplicados, que sigue
   siendo el de `crearLugar`/«¿Es este?» de siempre, sin tocar).
2. **El nombre no se repite aquí.** Vive en el formulario de fuera; si la hoja se abre por «Buscar» (sin
   ubicación todavía), el campo arranca con ese nombre ya escrito (`textoInicialBusqueda`, founder: «el nombre del
   lugar puede ya venir escrito del formulario») para adelantar la búsqueda; por «Cambiar» arranca vacío. «Listo»
   solo devuelve `{ punto, direccion, ciudad }` — nunca toca el nombre del formulario.
3. **Sin la hoja «Agregar lugar»** (el panel con el interruptor «privado» de OL-179/OL-182): no aplica, ya se
   está registrando un lugar. Sin barra de acciones tampoco: no hay ninguna acción de «agregar» que ofrecer aquí.
4. Canon de formularios respetado en el lado de fuera: `FormularioLugar.tsx` ya seguía el renglón «Dónde»
   resuelto con su valor y «Cambiar»; solo se le enchufó `HojaDondeLugar` en el mismo hueco donde vivía
   `HojaDonde`, con un `onListo` que aplica `punto`/`direccion`/`ciudad` al estado del formulario (antes lo hacía
   `HojaDonde` en caliente con cada tecla).

`FormularioLugar` y las dos páginas que lo montan (`lugares/nuevo/page.tsx`, `lugares/[id]/editar/page.tsx`) ganan
un prop `lugares: LugarResumen[]` (los visibles de la base, misma consulta que ya hace `eventos/nuevo/page.tsx`) —
al editar, se filtra el propio lugar para que no se avise «ya existe» a sí mismo. **Editar lugar usa la misma
pieza**, como pedía el encargo.

`estoyAqui` de `FormularioLugar.tsx` cambió de firma (`estoyAqui()` → `estoyAqui(poner)`, mismo contrato que
`onEstoyAqui` de `HojaDondeEs.tsx`/`FormularioEvento.tsx`): el icono rápido «Estoy aquí» del renglón «Dónde» (sin
abrir la hoja) sigue exactamente igual, llamando `estoyAqui(alMoverPin)`; el botón «Estoy aquí» DENTRO de la hoja
llama `estoyAqui((p) => moverPin(p))`, para mostrar «Ubicando…» mientras resuelve la dirección, igual que el
canon.

## Preguntas al founder, y sus decisiones («Tomo tus recomendaciones»)

1. **Título de la pantalla:** ¿«¿Dónde es?» igual que en el evento, o «Dónde está» (el título que ya tenía
   `HojaDonde.tsx`)? **Decisión del founder:** «¿Dónde está?», con signos de pregunta — un lugar «está», un
   evento «es»; misma forma de pregunta que el canon «¿Dónde es?». Cambiado el `<h2>` y el `aria-label` de
   `HojaDondeLugar.tsx`.
2. **Nombre editable dentro de la hoja:** ¿se puede ajustar el nombre desde ahí, como el resumen del pin del
   evento, o solo vive en el campo de arriba del formulario? **Decisión del founder:** el nombre NO se edita
   dentro de la hoja — solo arranca la búsqueda; corregir la búsqueda no cambia el nombre del formulario. Sin
   cambios de código (ya era así); documentado en el docstring de `HojaDondeLugar.tsx`.

## Correcciones del gestor sobre el PR #249 (revisó con el mapa real, token propio)

**1) La ciudad elegida faltaba en la cascada.** Buscando «Laboratorio de Arte Escénico» en «¿Dónde está?», las
sugerencias venían de Aguascalientes, Pachuca y Ciudad de México. Causa: `HojaDondeLugar` armaba el contexto con
`ciudadDeContexto({ texto: q, posicion: yo ?? posicionTelefono })` **sin** `ciudadChip` — a diferencia del canon
(`HojaDondeEs.tsx`, que sí recibe `ciudadContexto` y lo pasa en la cascada de OL-100: pin → texto → ciudad elegida
→ posición → San Luis Potosí de respaldo). Sin una ciudad elegida ni una posición real (nadie llega a "Agregar
lugar" con el teléfono ya ubicado), el contexto caía en `origen: "inicial"` — y sin una pista real, `bboxParaContexto`
no pone ningún `bbox` a propósito (para no acotar en falso a alguien que en verdad está en otra ciudad), así que
Mapbox buscaba en todo el país.

Arreglo: nueva función pura `contextoDondeEsta(punto, q, ciudadContexto, yo, posicionTelefono)` en
`dondeEstaPantalla.ts` (misma cascada, con pruebas — 5 casos, incluido el defecto reproducido exacto: sin ciudad
elegida ni posición, cae en San Luis Potosí SIN pista real). `HojaDondeLugar` gana el prop `ciudadContexto` y lo
usa ahí; `FormularioLugar` lo recibe y lo pasa. De dónde sale esa ciudad:
- `lugares/nuevo/page.tsx`: `ciudadPorSlug(searchParams.ciudad, ciudades)` — mismo respaldo silencioso a San Luis
  Potosí que ya usa `lugares/page.tsx` (el listado), no el más estricto `ciudadDesdeSlug` del evento (que cae en
  `null` con un slug inválido): aquí no hay otra pista real donde ese `null` proteja algo, y hoy no existe forma
  de llegar a "Agregar lugar" con una ciudad EQUIVOCADA (solo hay una).
- `lugares/[id]/editar/page.tsx`: `ciudadPorNombre(lugar.ciudad, ciudades)` — la ciudad del propio lugar (en la
  práctica no cambia nada: el pin ya puesto siempre manda en la cascada, edita siempre trae uno).

**Pendiente, fuera de esta pieza:** `src/components/Publicar.tsx` (el botón flotante "Registrar lugar") no arma
su `href` con `?ciudad=`, a diferencia de "Publicar evento"/"Registrar artista"; y su único lugar de uso,
`src/app/lugares/VistaLugares.tsx:454` (`<Publicar que="lugar" />`, sin el prop `ciudad`), es justo el archivo que
esta pieza tiene prohibido tocar (OL-210 en curso ahí). Hoy no cambia nada (con una sola ciudad, el respaldo de
`ciudadPorSlug` ya cae en San Luis Potosí), pero si el producto abre otra ciudad, alguien tendrá que enchufar ese
`ciudad` en `VistaLugares.tsx` para que el chip real llegue hasta aquí — anotado para quien cierre OL-210 o el
gestor.

**2) «Los registrados deben salir primero junto a Mapbox, y no desaparecer cuando Mapbox responde.»** Revisando
`combinarResultados`/el cómputo de `combinados` en `HojaDondeLugar.tsx`, la lógica ya es —byte a byte— la MISMA
que usa el canon en producción (`HojaDondeEs.tsx`, sin ningún cambio en esta pieza): los lugares registrados que
coinciden con el texto se calculan con `lugaresPorTexto` de forma pura y síncrona a partir de `q`/`lugares`,
**sin ninguna dependencia de si Mapbox ya respondió, falló, o cuántos resultados trajo** — y `combinarResultados`
los antepone siempre. No se encontró ninguna forma de que el código actual los quite o los reordene.

La explicación más probable, dado que la lógica es idéntica a la del canon que sí funciona en producción: es un
efecto del punto 1. Sin `bbox` (la ciudad elegida faltaba), Mapbox devolvía resultados nacionales sin acotar —
hasta 5, el tope de `descartarSinCalle`— y ese ruido, sumado a la propia falla de mi arnés de pruebas (sin token,
mostraba un error donde el gestor sí tenía resultados reales), hace fácil perder de vista un renglón que en
realidad seguía ahí, primero. Con el punto 1 corregido (un `bbox` real de San Luis Potosí), Mapbox debería volver
a traer solo lo relevante, y el registrado —siempre primero— vuelve a notarse.

Aun así, para no dejarlo solo en una hipótesis: se extrajo el cómputo entero a una función pura y probada,
`resultadosDondeEsta(lugares, q, resultadosMapbox)` en `dondeEstaPantalla.ts`, usada ahora por `HojaDondeLugar`
en vez de repetir el cálculo en el propio componente. La prueba clave (`dondeEstaPantalla.test.ts`): con un lugar
registrado que coincide Y una lista de "resultadosMapbox" ya llena (simulando que Mapbox YA respondió, con varias
sugerencias), el lugar registrado sigue apareciendo, PRIMERO, sin importar cuántos resultados de Mapbox lo
sigan — la garantía queda fija en código, no solo en la memoria de quien lo revisó a mano.

## Segunda corrección del gestor: el MISMO bug, en el campo «Nombre del lugar» del formulario

Verificado con Mapbox real: «¿Dónde está?» ya buscaba bien en San Luis Potosí («YA EXISTE» primero con «Casa del
Poeta», aviso por cercanía con «Ver ficha» funcionando) — pero el campo **«Nombre del lugar»** de arriba, el
combobox de arriba del formulario (`FormularioLugar.tsx`, no `HojaDondeLugar.tsx`), es un autocompletado APARTE,
de antes de OL-211 (founder, 2026-09-16), con su propia búsqueda de Mapbox: llamaba a `sugerirLugares(texto,
mapboxToken, punto ?? yo ?? CIUDAD_INICIAL.centro, sesionRef.current)` **directo, sin `buscarConContexto` ni
`bbox`** — el mismo defecto exacto del punto 1, en un lugar distinto del código. Con «Laboratorio de Arte
Escénico» proponía Aguascalientes, Pachuca y CDMX, y tocar la primera llenaba el nombre Y la dirección con un
lugar de Aguascalientes.

Arreglo, en `FormularioLugar.tsx`:
- La búsqueda de Mapbox de este campo ahora arma su contexto con `contextoDondeEsta(punto, texto, ciudadContexto,
  yo, posicionTelefono)` — la MISMA función de `dondeEstaPantalla.ts` que ya usa "¿Dónde está?" (no una copia) — y
  llama a `buscarConContexto` en vez de `sugerirLugares` a secas: mismo `bbox`, misma cascada, mismo reintento
  acotado. Con versión (`versionBusquedaNombre`) para no pisar una búsqueda más nueva con una vieja que tarda más.
- Los lugares YA REGISTRADOS que coinciden («Ya está registrado: …», el bloque que ya salía primero en la lista,
  con su link a la ficha — founder 2026-09-16, revisado por el gestor 2026-09-21) ahora se calculan con
  `lugaresPorTexto(lugares, texto)` -la MISMA comparación pura que usa la pantalla, sobre el mismo directorio ya
  cargado- en vez de la función RPC `lugares_con_nombre` de antes: dos caminos que hoy deberían dar el mismo
  resultado, mecanismo único. Se quitó la dependencia de `clienteNavegador`/Supabase en el navegador para esto.
- El bloque "Ya está registrado" (con su Link a la ficha) ya salía PRIMERO en la lista, antes de las sugerencias
  de Mapbox, y ya llevaba a la ficha sin adoptar nada (nunca llenó nombre/dirección al tocarlo) — eso ya cumplía
  "sale primero, sin adoptarlo, con su ficha"; no se tocó esa parte de la interfaz, solo de dónde saca los datos.

**Prueba unitaria** (`dondeEstaPantalla.test.ts`, describe nuevo "el mismo que usa el campo «Nombre del lugar»"):
reproduce el caso real reportado -sin ubicación todavía y sin ciudad elegida, cae en San Luis Potosí SIN `bbox`
(el hueco exacto)-, confirma que con la ciudad elegida sí hay un `bbox` real, y que con un punto ya puesto (al
editar) manda el pin sobre el nombre escrito. **3 pruebas nuevas** (25 en total en ese archivo; 1334 en el
proyecto). No hay lógica pura nueva en este campo que no esté ya cubierta por las mismas pruebas de
`contextoDondeEsta`/`lugaresPorTexto` -es la misma función, no una copia-, así que la prueba de regresión real es
compartida entre las dos pantallas: si alguien rompe la cascada, truena en los dos lados.

Sin captura nueva de este arreglo: sin token de Mapbox en este entorno no se puede ver la diferencia (antes y
después caen en el mismo aviso "No pude buscar"/"Falta el token"); el gestor dijo que verifica el mapa real él
mismo.

## Evidencia

- `npm run lint`: limpio (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: **1334 pruebas, 107 archivos**, todas en verde — incluidas las movidas (`direccionContexto.test.ts`,
  41), las que cambiaron de import (`gestosFlyer.test.ts`, 23) y las de `src/app/lugares/dondeEstaPantalla.test.ts`
  (**25 pruebas** tras las dos rondas de corrección del gestor: las 11 originales —`lugarCercano`,
  `textoInicialBusqueda`— más 11 de la primera ronda (`contextoDondeEsta`, 5 casos, incluido el defecto exacto
  que reportó el gestor; `resultadosDondeEsta`, 6 casos, la garantía de que un lugar registrado sigue primero
  aunque Mapbox ya haya respondido) más 3 de la segunda ronda (el mismo `contextoDondeEsta` reproduciendo el caso
  del campo «Nombre del lugar»: sin ubicación ni ciudad elegida cae sin `bbox`, con la ciudad elegida sí lo tiene,
  y con un punto ya puesto manda el pin).
- `npm run build`: verde (`next build`, Turbopack), sin ninguna ruta `arnes240-temporal` en el árbol final.
- **Correos en el diff:** `git diff | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` y lo mismo sobre los archivos
  nuevos — ninguna dirección.
- Se unió `origin/main` a la rama (17 commits; el único choque fue `docs/ops/OPEN_LOOPS.md`, resuelto con
  `scripts/ops/resolver_ol.py` — conserva la entrada OL-211 de esta pieza y el «Last updated» de main).

### Capturas reales (`docs/rediseno/capturas-240/`), 390×844, Bricolage real

El alta pide sesión (`sesionOEntrar` redirige a `/entrar`); sin respaldo local viable en el tiempo de esta pieza,
arnés temporal `src/app/arnes240-temporal/` (dos páginas, `lugar/` y `evento/`, cada una montando el formulario
real con una acción de servidor que no hace nada y una lista de lugares de prueba — una a ~35 m del centro de San
Luis Potosí, «Laboratorio de Arte Escénico», para poder disparar el aviso «ya existe») — **borrado entero antes
del commit**, nunca vivió en el árbol final (`git status --short` limpio, sin rastro en `npm run build`).
`next build && next start -p 3240`.

Sin `playwright-core` disponible en este entorno (instalar y lanzar un Chrome real desde Bash quedó bloqueado por
el aislamiento del árbol de trabajo de esta sesión, a diferencia de las bitácoras 208/217/221): se usó en su
lugar el navegador real de la propia sesión (misma pantalla que ve quien sigue el trabajo en vivo), a 390×844.
Como ese navegador no tiene un «guardar esta captura en un archivo», se probó primero rasterizar el DOM a mano
(`html2canvas`) — salió con las palabras pegadas y superpuestas, el mismo defecto que ya advertía la nota interna
«Captura de PNG real»: la fuente Bricolage sí estaba cargada (confirmado por red, un `.woff2` de `next/font`),
pero la métrica de texto que aproxima esa librería no calza con la real. Se descartó esa vía: cada captura de
verdad (la miniatura PNG que el propio navegador ya genera al tomarla) se extrajo tal cual del registro de la
sesión y se guardó con `sips` a `docs/rediseno/capturas-240/` — el mismo bitmap que se ve en pantalla, sin
redibujar nada. Sin token de Mapbox en este entorno: el mapa sale con el aviso «Falta el token de Mapbox», como ya
aceptaron las bitácoras 208/217/221 para esta misma pantalla; el resto (campo, lista, resumen, avisos, botones) se
ve completo.

- **`01-formulario-antes.png`**: «Registrar un lugar», campo «Nombre del lugar» vacío, «Dónde» con «Falta» y sus
  dos salidas (Estoy aquí / Buscar), tal como pedía el canon de formularios ya vigente.
- **`02-ubicacion-campo-lista-ya-existe.png`**: tras escribir el nombre y tocar «Buscar la dirección», la hoja
  «Dónde está» abre con el campo YA lleno con ese nombre (adelanta la búsqueda) y la lista flotante muestra
  «Laboratorio de Arte Escénico · YA EXISTE» con su dirección — el mismo lugar del directorio, encontrado sin
  Mapbox (comparación pura de texto, `lugaresPorTexto`).
- **`03-ubicacion-aviso-ya-existe.png`**: al tocar ese renglón, la lista se cierra y aparece «"Laboratorio de Arte
  Escénico" ya existe cerca de aquí. Ver ficha» (enlaza a `/lugares/<slug>`) — sin mover ningún pin propio, tal
  como pidió el founder.
- **`04-ubicacion-estoy-aqui-y-aviso.png`**: con el campo limpio y la geolocalización del navegador sustituida a
  mano (mismo truco documentado del proyecto, «Estoy aquí sin Mapbox») a ~11 m del mismo lugar registrado, tocar
  «Estoy aquí» pone el pin propio («Ubicando…», sin token para resolver la dirección) Y dispara el MISMO aviso
  «ya existe» por PROXIMIDAD (`lugarCercano`), sin que la persona haya tocado el renglón — la regla de los 150 m
  funcionando de verdad, no solo al elegir de la lista. «Listo» ya habilitado (morado).
- **`05-formulario-donde-resuelto.png`**: tras «Listo», el formulario vuelve con «Dónde» resuelto («Pin en el
  mapa» — sin token no hay dirección que mostrar, pero el pin sí quedó puesto) y «Cambiar» para reabrir la misma
  hoja; «Publicar lugar» ya habilitado.
- **`06-evento-donde-es-sin-cambios.png`** y **`07-evento-agregar-lugar-barra-sin-cambios.png`**: el alta de
  evento, con el mismo arnés montando `FormularioEvento` real — «¿Dónde es?» abre igual que siempre y, con un
  texto sin coincidencias, la barra «Agregar "Sitio inventado xyz" como lugar» sigue apareciendo igual —
  comprobación visual de que mover la lógica compartida a `src/lib/` no cambió el comportamiento del evento.

Las capturas 02 a 04 son de ANTES de la decisión del founder sobre el título (siguen mostrando «Dónde está», sin
signos de pregunta) — siguen siendo válidas para lo que muestran (lista, aviso, «Estoy aquí»), no se rehicieron
para no reabrir todo el flujo por un solo rótulo. La corrección del título se capturó aparte:

- **`08-titulo-donde-esta-con-signos.png`**: misma pantalla, ya con **«¿Dónde está?»** en la cabecera (y en el
  `aria-label`) — decisión del founder sobre la pregunta de la bitácora.

La ciudad elegida (`ciudadContexto`) y que los registrados no desaparezcan con Mapbox real son correcciones que
dependen de un token de Mapbox de verdad para verse en una captura (sin él, todo cae en el mismo aviso «Falta el
token»); quedan protegidas por las 11 pruebas nuevas de `contextoDondeEsta`/`resultadosDondeEsta` — el gestor
dijo que verifica el mapa real él mismo al final.

## Cierre

`git status --short` limpio de artefactos de build y sin ningún arnés. Commit local en `agregar-lugar-canon`,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git push -u origin agregar-lugar-canon` y PR abierto
contra `main` (sin unir: lo revisa el founder/gestor con `gh pr checks`).
