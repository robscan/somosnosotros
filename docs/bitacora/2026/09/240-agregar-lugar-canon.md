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

## Preguntas abiertas para el founder (elegida la opción más cercana al canon, sin inventar)

1. **Título de la pantalla:** el canon dice «¿Dónde es?»; aquí se dejó «Dónde está» (el título que ya tenía
   `HojaDonde.tsx`, para no romper la continuidad de un texto que la gente ya vio). ¿Debe decir «¿Dónde es?»
   igual que en el evento, o queda mejor «Dónde está» al ser un lugar?
2. **Nombre editable dentro de la hoja:** el canon del evento deja editar el nombre en el propio resumen del pin
   (`draft.nombre` con `<input>`). Aquí se decidió que NO —el nombre vive solo en el campo de arriba del
   formulario, la hoja solo resuelve ubicación— porque editar el nombre dos veces (aquí y en el campo de arriba)
   parecía confuso. ¿Está bien esa lectura, o el founder prefiere poder ajustar el nombre también desde la hoja?

## Evidencia

- `npm run lint`: limpio (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: **1319 pruebas, 107 archivos**, todas en verde — incluidas las movidas (`direccionContexto.test.ts`,
  41), las que cambiaron de import (`gestosFlyer.test.ts`, 23) y las nuevas de esta pieza
  (`src/app/lugares/dondeEstaPantalla.test.ts`, **11 pruebas**: `lugarCercano` con varios casos de distancia —
  dentro, justo en el punto, fuera, el más cercano de varios, radio configurable— y `textoInicialBusqueda` con
  «Buscar»/«Cambiar»).
- `npm run build`: verde (`next build`, Turbopack), sin ninguna ruta `arnes240-temporal` en el árbol final.
- **Correos en el diff:** `git diff | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` y lo mismo sobre los archivos
  nuevos — ninguna dirección.

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

## Cierre

`git status --short` limpio de artefactos de build y sin ningún arnés. Commit local en `agregar-lugar-canon`,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git push -u origin agregar-lugar-canon` y PR abierto
contra `main` (sin unir: lo revisa el founder/gestor con `gh pr checks`).
