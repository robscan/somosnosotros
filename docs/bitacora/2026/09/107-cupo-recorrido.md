# 107 - Cupo de cartel durante el recorrido

Fecha: 2026-09-18. OL-074. Rama: `codex/cupo-recorrido`.
Base: `04858a436ded2fa8375e01b48987eb8de9eb8c83` (cierre-pendientes).

## Encargo y limites

El gestor reserva este numero y estos archivos para corregir tres fallos de UI:
saldo congelado en la prop inicial, estados que no se reconcilian al volver o
renovar y fecha de renovacion dependiente de la zona del dispositivo.
Se releen CLAUDE, GESTION_DE_CAMBIOS y la decision firmada 23.
El script de numeracion ya ve 109; se conserva la reserva explicita 107.

Solo se modifican FormularioEvento, TarjetaCartel, estadoCartel y sus pruebas;
en acciones.ts, exclusivamente cupoDeCartel. Sin cambios en SQL, pruebas PG,
OPEN_LOOPS, geocoding, guardado de evento ni trabajo de push del otro agente.
No se publica, no se consulta produccion ni se llama a una API de IA.

## Cambios

- El formulario guarda el ultimo cupo confirmado, separado del resultado del
  cartel. Consulta al montar, focus, pageshow y visibilitychange. El reloj
  comprueba el periodo de Mexico cada 30 segundos mientras la pantalla esta
  visible; al cambiar, consulta el servidor, nunca reinicia saldo localmente.
- Consulta antes de subir una foto elegida y al terminar el intento, incluso
  si la lectura falla o lanza. La reserva atomica sigue siendo del servidor.
  No se resta uno al saldo de la prop: se muestra mi_cupo_de_cartel.
- Una revision de consulta descarta respuestas viejas. Props nuevas actualizan
  exclusivamente el cupo, sin remontar el formulario ni restablecer sus campos.
- Al agotarse se retira el selector de lectura; a mano se puede continuar,
  incluso cambiar la imagen sin IA. Una comprobacion previa rechazada conserva
  la imagen anterior; si la foto ya se subio, el fallo conserva la nueva.
- El aviso de 3, 2 o 1 restantes convive con el resultado de lectura o fallo.
  Agotado muestra renovacion y resultado; no ofrece otra foto para leer.
- Consulta fallida o nula: no inventa saldo ni exito. Ofrece reintentar, sin
  camara. Pedir mas solo confirma tras respuesta positiva, protege del doble
  toque y conserva el error si falla. Botones con nombre accesible explicito.
- La fecha toma anio/mes mediante Intl.formatToParts en America/Mexico_City;
  el siguiente mes se construye con Date.UTC y se formatea en UTC.
- cupoDeCartel rechaza tambien una respuesta que contenga datos junto a error.

## Verificacion

- `npm ci --ignore-scripts` local; ningun paquete global ni cambio de lockfile.
  npm aviso de dos vulnerabilidades moderadas heredadas; no se hizo audit fix.
- `npm test`: 46 archivos, 450 pruebas pasan. Incluye 13 mocks nuevos de acciones
  y 12 pruebas de estado (3 nuevas de zona: Tokio, UTC y Mexico).
- `node --test src/app/eventos/cupo.componentes.test.mjs`: 13 recorridos pasan.
  Usa el FormularioEvento y TarjetaCartel reales, CSS real y acciones falsas.
  Cubre saldo real que cambia mas de uno, fallo de modelo, ultimo consumo,
  rechazo de reserva, corte y reintento, peticion fallida/exitosa, props,
  respuesta tardia, montaje con saldo viejo, retorno y cambio de mes en Tokio.
  Compara FormData antes/despues de reconciliar para conservar valores manuales.
- TypeScript: `./node_modules/.bin/tsc --noEmit --incremental false`, correcto.
- ESLint de los siete archivos de codigo/pruebas tocados, correcto.
- Sin ejecutar PG: heredado y fuera de propiedad en este encargo.

Reproduccion del harness con Playwright ya disponible (ajustar rutas al host):

```sh
PLAYWRIGHT_MODULE=/Users/apple-1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
CUPO_SCREENSHOTS=/tmp/cupo-pruebas \
node --test src/app/eventos/cupo.componentes.test.mjs
```

Para el antes, agregar `CUPO_BASELINE_REF=04858a4`: el harness lee los tres
componentes originales con git show, sin cambiar checkout, y solo captura el
recorrido comparable. Sin esa variable se prueba la implementacion actual.

## Revision visual y limites

Se uso front-visual: render, captura completa, lectura de la imagen y medidas.
Antes/despues con el mismo estado y CSS, viewport 390x844 a 3x; tambien 1280x844
a 3x. En el antes fallido desaparece el saldo; en el despues aparece debajo del
fallo, sin tapar el mensaje ni los campos. Agotado ofrece solo Pedir mas; el
error de consulta ofrece Reintentar. Se ajusto su alineacion con el canon ya
existente. Se comprueba ausencia de scroll horizontal y que titular y detalles
queden dentro de la tarjeta, sin superponerse.

Capturas locales: `/tmp/sn-cupo-ui.7tHGkW/antes-inicial.png`, `antes-fallo.png`,
`despues-inicial.png`, `despues-fallo.png`, `despues-leido.png`,
`despues-agotado.png`, `despues-error-cupo.png`, `despues-desktop.png`.
Son evidencia temporal, no archivos incorporados a la app.

El harness usa Arial local estable en ambas capturas, no descarga Bricolage.
Usa sin-foto-ancha.png como imagen ficticia; las hojas de lugar, fecha y artista
estan sustituidas. No valida su contenido, navegacion real Next, autenticacion,
transporte de server actions, Storage, RLS ni iPhone/Safari. Chrome corre con
perfil temporal propio y puerto aleatorio de loopback, bloquea red externa,
y se cierra con su servidor al terminar. No se conecta al navegador personal,
al puerto 3005 del gestor ni agrega rutas dev a la app final.

## Aceptacion entregada al gestor

1. Un consumo, aun fallido, refleja saldo del servidor; no hay descuento ciego.
2. Retorno, props y renovacion reconcilian sin perder campos ni imagen.
3. Agotado no ofrece camara de lectura; manual y peticion/reintento siguen utiles.
4. El aviso de pocas lecturas no queda oculto por el resultado del cartel.
5. La fecha no depende de Tokio ni de parsear cadenas locales de fecha.

Pendiente del gestor: integracion, prueba real del transporte y dispositivo,
despliegue cuando corresponda. Este commit local no cierra OL-074 en produccion.
