# 112 - Flyer, direccion y prioridad del gesto manual

Fecha: 2026-09-18. OL-078. Rama: `codex/flyer-direccion`. Base: `286e117`.
Reserva explicita del gestor, confirmada por `scripts/ops/siguiente-bitacora.sh`.

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
