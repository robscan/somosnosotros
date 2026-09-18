# 112 - Flyer, direccion y prioridad del gesto manual

Fecha: 2026-09-18. OL-078. Rama: `codex/flyer-direccion`. Base: `286e117`.
Reserva explicita del gestor, confirmada por `scripts/ops/siguiente-bitacora.sh`.

La primera entrega `c9c0574` se describe abajo como historial. La continuacion
"Correccion de round-trip" al final sustituye su serializacion y amplia el alcance
a persistencia estructurada. No integrar la primera entrega sola.

## Encargo y limites

Se releen CLAUDE, GESTION_DE_CAMBIOS y front-visual. Propiedad limitada a
FormularioEvento, HojaDondeEs, helpers nuevos y pruebas. Sin cambios en acciones
de guardado, SQL, pruebas PG, OPEN_LOOPS, estilos compartidos ni rutas de desarrollo.
El gestor integra por separado revision/idempotencia de `d30e841`; no se trae
ese cambio ni Nuevos/Entrar `83abf5c` a esta rama.

## Cambios y aceptacion

1. OCR solo completa grupos intactos. Valores iniciales y borradores restaurados
   quedan protegidos; escribir, borrar, cambiar de opcion o volver al mismo valor
   invalida respuestas posteriores. Fecha/hora, precio/gratis, artista, titulo,
   descripcion, enlace y ubicacion tienen proteccion independiente.
2. La subida del flyer no cambia la imagen hasta conocer la respuesta de lectura.
   Un rechazo sinCupo entre consulta y RPC conserva la anterior o la elegida
   despues. El fallo normal del modelo conserva el flyer aceptado; una respuesta
   desconocida por corte no confirma su reemplazo. Sigue reconciliandose el saldo
   real del servidor, sin descuento local. Una URL manual aun incompleta tambien
   cuenta como gesto; se permite cambiar imagen mientras espera el OCR.
3. Nombre y direccion se editan separados con el canon existente. La direccion
   del OCR alimenta las sugerencias al abrir Donde; ninguna opcion coloca pin
   automaticamente, incluso si solo hay una. Seleccionar fija coordenadas y
   ciudad; volver a escribir elimina el pin anterior. No se adivina una ubicacion.
4. Lugares registrados se buscan por nombre y direccion. La busqueda externa usa
   sugerirLugares/recuperarLugar con la misma sesion Search Box; direcciones usan
   buscarDirecciones. Se reutilizan geocodificar, buscarLugares y Mapa, sin editarlos.
   Resultados fuera de rango se descartan y HTTP fallido se distingue de cero
   resultados. Una busqueda posterior recupera el recorrido.
5. Versiones de gesto descartan forward, retrieve, reverse y GPS obsoletos.
   Un pin manual puede completar direccion/ciudad por reverse mientras siga
   vigente; editar, cambiar reserva, seleccionar otra opcion o cerrar lo invalida.
   Si reverse falla, queda el pin elegido, sin inventar una direccion nueva.
6. Reservar mueve direccion y punto separados a los campos privados y limpia
   los publicos. Desreservar no publica los datos privados. El alias permanece;
   OCR tardio no deshace la reserva. No se intenta separar automaticamente una
   direccion que la persona haya escrito dentro del propio alias.
7. El formulario entrega sitio_lat/lng para un sitio publico y privado_lat/lng
   solo en reservado. El contrato existente de `src/app/eventos/[id]/page.tsx`,
   lineas 128-129, construye Como llegar con esos puntos y oculta el enlace privado
   sin acceso. Se reviso ese contrato, no se modifico ni se probo guardando en DB.

## Pruebas

- `npm test`: 49 archivos, 518 pruebas correctas, incluidas 12 del helper nuevo.
- `node --test src/app/eventos/flyer.componentes.test.mjs src/app/eventos/cupo.componentes.test.mjs`:
  32 recorridos correctos (19 flyer + 13 cupo). Componentes reales: FormularioEvento,
  HojaDondeEs, SelectorCuando, SelectorQuien y Mapa. Cubre campos previos/tardios,
  borrador, cuota rechazada, imagen posterior, ambiguedad, coordenadas, reserva,
  errores recuperables y respuestas tardias de los cuatro recorridos de ubicacion.
- Tres expectativas heredadas de cupo se actualizan deliberadamente: OCR no pisa
  titulo manual; sinCupo y corte sin respuesta no reemplazan imagen anterior.
- `./node_modules/.bin/tsc --noEmit --incremental false`: correcto.
- `npm run lint`: sin errores; warning previo en docs/diseno/logotipo/iconos-sn.mjs:57
  por variable k no usada. Lint de archivos de esta pieza, sin warnings.
- `git diff --check`: correcto. Sin ejecutar ni modificar PG.
- `npm ci --ignore-scripts` local, sin cambiar lockfile. Avisos heredados de dos
  vulnerabilidades moderadas y engine de una dependencia; sin audit fix/globales.

Reproducir en este host:

```sh
PLAYWRIGHT_MODULE=/Users/apple-1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
FLYER_SCREENSHOTS=/tmp/sn-flyer-112 \
node --test src/app/eventos/flyer.componentes.test.mjs src/app/eventos/cupo.componentes.test.mjs
```

Para el antes: solo flyer.componentes.test.mjs con `FLYER_BASELINE_REF=286e117`.
Lee los dos componentes mediante git show, sin mover checkout ni rama.

## Revision visual

Capturas completas miradas antes/despues, viewports 390x844 y 1280x844, ambos 3x.
En el antes, nombre y direccion estaban juntos y no habia pin; en el despues,
la direccion tiene campo propio y sugerencia antes del mapa. Tras seleccionarla,
el marcador aparece dentro del lienzo. Se conservan hoja, jerarquia y botones;
no hay rediseno ni CSS nuevo. Medidas del harness comprueban ausencia de scroll
horizontal, separacion vertical de entrada/lista/mapa y marcador dentro del mapa.

| Captura en /tmp/sn-flyer-112 | Comprobacion visual |
| --- | --- |
| antes-direccion-390.png / antes-direccion-1280.png | Estado previo, sin sugerencia ni pin |
| despues-direccion-390.png / despues-direccion-1280.png | Nombre, direccion, sugerencia y mapa separados; sin superposicion |
| despues-pin-390.png / despues-pin-1280.png | Pin visible dentro del mapa tras seleccion |
| despues-reservado-390.png | Alias y direccion privada separados; interruptor activo |

## Limites de evidencia y entrega

Chrome headless aislado, perfil temporal propio y servidor de loopback en puerto
aleatorio, distintos del navegador personal y del puerto 3005 del gestor. El
harness cierra sus contextos, navegador, servidor y carpeta temporal al terminar.
No hay rutas dev en la app final. Capturas temporales fuera de git.

Mapbox GL y el marcador son reales, pero el estilo es un fondo local sin calles;
geocoding/Search Box son respuestas interceptadas. Arial local sustituye Bricolage
en ambos lados. No se descargan tiles ni fuentes. OCR, cuota, GPS, subida y zona
son dobles; toda red externa no simulada se bloquea. Sin secretos/env de produccion,
backend real, datos reales, API de IA ni publicacion.

Pendiente del gestor: mezclar con el guardado atomico, verificar transporte real,
persistencia y Como llegar tras guardar, cartografia real y Safari/iPhone antes de
su gate correspondiente. Este commit local no declara OL-078 cerrado en produccion.

## Correccion de round-trip (continuacion OL-078)

El gestor detecto que la primera entrega concatenaba nombre y direccion en
sitio_texto y al recargar trataba todo como alias. Cambiar direccion duplicaba la
anterior; reservar podia conservar la direccion en el alias publico. No estaba
cubierto por las pruebas iniciales, que no remontaban desde datos persistidos.

Por autorizacion explicita se mezclo `codex/cierre-pendientes` en `ad6cc4c`, sin
conflictos. OPEN_LOOPS llego integro del merge; no se agrego OL-078 ni se edito.
Se preservan revisionInicial, hidden revision, operacionEvento y errores de
conflicto. `b1068ec` posterior no se trae: el gestor repetira su nueva prueba de
guardado sobre el merge final. Tampoco se modifican fotos ni acceso a flyers;
esa decision de privacidad queda fuera de esta pieza.

### Contrato final

- Migracion nueva `20260918160000_evento_direccion.sql`: sitio_direccion nullable,
  maximo 200, sin default ni backfill. NULL significa sin direccion estructurada;
  no se intenta identificar ni separar texto humano por puntos, comas o numeros.
- sitio_texto persiste exclusivamente el nombre/alias nuevo. Nombre y direccion
  se componen al mostrar, no al enviar. Al editar se cargan por separado, tambien
  despues de guardar y remontar. Los borradores anteriores se tratan conservadoramente.
- Un texto legacy intacto permanece igual. Solo al cambiar direccion/reserva
  se pide un nombre publico nuevo: se muestra el anterior como referencia local
  y se vacia el campo del alias, sin publicar automaticamente el texto anterior.
  Una edicion explicita del nombre ya cuenta como revision manual.
- Una direccion publica estructurada exige lat/lng validos en UI y DTO; CHECK
  exige ambos no-NULL en la tabla y conserva los CHECK de rango existentes. El
  CHECK publico/privado exige NULL en reservado y en lugar registrado. Otro CHECK
  impide que un reservado conserve coordenadas publicas.
- Direccion privada nueva, conversion de publico a reservado, cambio de direccion
  privada o retirada de un punto existente requieren el par en guardar_evento_completo.
  La RPC compara contra lo persistido: no confia en un hidden para decidir si el
  dato es legacy. Solo una direccion privada intacta con ambos NULL conserva la
  excepcion. Fallar revierte evento, privado y artistas en la misma transaccion.
  Esta guarda privada vive en la RPC; no se cambia el contrato de escritura directa
  de la tabla privada ni se agrega un trigger ajeno a esta coordinacion.
- sitio_pin_pendiente bloquea en DTO y UI; cerrar con X, Escape o fondo no confirma
  ubicacion ni rehabilita el envio. Listo permanece deshabilitado. El propio action
  del formulario tambien comprueba el estado antes de crear/reutilizar operacion.
  Error/ningun resultado conserva lo escrito, sin pin viejo. Elegir una sugerencia
  o poner un pin manual confirma; cerrar no descarta ese pin ya elegido aunque
  invalide una respuesta reverse aun pendiente. Eliminar expresamente la direccion
  publica permite volver a nombre solo, sin publicar coordenadas antiguas.
- Reservar mueve la direccion estructurada al privado y elimina direccion/punto
  publicos. Desreservar no copia los privados de vuelta. Legacy intacto sin pin,
  tanto publico como privado, sigue editable.

### RPC, outbox y propiedad

181600 reemplaza solo guardar_evento_completo, a partir de 181100: conserva firma
de seis argumentos, SECURITY INVOKER, search_path vacio, grants, identidad,
propiedad, revision, operacion idempotente y cerrojos/relaciones de artistas.
Agrega la columna a INSERT/UPDATE y a deteccion de cambio de donde. Clientes viejos
que omitan la clave en p_datos no borran la direccion publica estructurada existente;
un NULL explicito si la retira. No se editaron 181100, 181400 ni acciones.ts.

Segun coordinacion del gestor, 181400 usa guardar_evento_con_avisos, wrapper de
seis argumentos que enciende/restaura app.avisos_outbox y llama a esta RPC interior.
El trigger de outbox consulta sitio_direccion via to_jsonb para tolerar el orden de
migraciones. No se copia el opt-in en 181600. La suite local no tiene 181400 ni
su wrapper: su prueba integrada corresponde al gestor. No se agregan direcciones
a snapshots de avisos; src/lib/avisos.ts queda sin cambios.

**Pendiente imprescindible en acciones.ts (propiedad de Astra/gestor):** agregar
`sitio_direccion` y `sitio_pin_pendiente` a las claves de leer(formData). El segundo
es `si`/`no` y solo sirve a validacion; no se persiste. validarEvento ya devuelve
sitio_direccion y el error correspondiente; filaEvento propaga el dato mediante
su spread existente. No se cambia la generacion de UUID ni la revision. Hasta
incorporar esas claves, este formulario y las acciones no estan integrados de
punta a punta: la accion filtraria la direccion y perderia la guarda de pendiente.

### Lectura y presentacion

Selects de agenda, artistas, personas, novedades y lugares incorporan el campo;
nombreSitio compone solo si no es reservado. La ficha muestra direccion separada
del nombre y conserva Como llegar desde las coordenadas. Calendario usa direccion
estructurada publica y solo alias para reservado. JSON-LD usa la direccion nueva;
legacy sin direccion estructurada ya no inventa un streetAddress desde el alias.
Los campos privados nunca alimentan nombreSitio, calendario ni JSON-LD.

### Evidencia final

- Unit/mocks: `npm test`, 55 archivos y 558 pruebas correctas. DTO, presentacion, JSON-LD, calendario real con cliente simulado,
  legacy y estado pendiente; suite completa ejecutada de nuevo.
- Componentes reales: 27 recorridos flyer + 13 cupo. Se desmonta/remonta en modo
  editar despues de una accion falsa que usa validarEvento y conserva los datos
  estructurados. Se prueba cambiar direccion, guardar otra vez y reservar tras
  recarga, ademas de HTTP/ningun resultado, cierre por las cuatro vias y legacy
  privado intacto/editado. Se preservan las pruebas originales de gestos y cuotas.
- PG local: 41 migraciones, 525 comprobaciones correctas; incluye 30 nuevas de
  direccion, round-trip real, permisos, CHECK, revision/idempotencia y legacy.
  Comando: `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres npm run test:db`.
  El runner crea y elimina su base sn_test_* y roles; no se arranca/apaga el
  servidor local compartido. No se conecta a Supabase real ni produccion.
- Build local sin configuracion Supabase/Mapbox ni claves IA; typecheck incluido.
  Lint sin errores; permanece el warning ajeno de iconos-sn.mjs:57.
- Capturas de viewport 390x844 y 1280x844, 3x, en `/tmp/sn-flyer-112-roundtrip`:
  despues-direccion-390/1280, despues-pin-390/1280, despues-reservado-390,
  roundtrip-edicion-390, roundtrip-reservado-1280 y legacy-error-390 (todas .png).
  Se ven direccion nueva sin duplicado, alias separado del privado y error legacy
  sin pin ni confirmacion falsa. Mismo canon, sin CSS nuevo. Se conserva el antes
  inicial en /tmp/sn-flyer-112. La cabecera del harness refleja alta/edicion.
- Chrome y servidor propios se cierran al terminar. Geocoder, Search Box, GPS,
  OCR y Storage siguen simulados; mapa real con estilo local sin calles. La accion
  falsa omite la imagen local al validar porque no es URL Storage, y no prueba
  artistas, transporte real de acciones ni outbox. PG prueba persistencia aparte.
  Los cierres de hoja se prueban con el mapa cargado; Safari y cartografia real
  quedan para el gestor, al igual que la privacidad de imagen pendiente de decision.

No hay publicacion ni escritura en produccion. Antes de desplegar se requiere
la integracion de acciones, wrapper/outbox y prueba parental de guardado, aplicar
la migracion por el responsable autorizado y repetir el recorrido real.
