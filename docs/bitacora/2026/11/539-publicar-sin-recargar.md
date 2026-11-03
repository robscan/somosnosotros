# 539 · OL-506 · «Publicar sin recargar» en código: la tarjeta se queda en su sitio y cambia sola

**Fecha:** 2026-11-02. **Rama:** `publicar-sin-recargar` (desde `origin/main` `28b67262`). **Quién:** operador del Gestor de cambios VIII (agente, árbol
aislado), sin subagentes.
**Manda:** la firma del founder del prototipo de la bitácora [535](535-prototipo-publicar-sin-recargar.md): «Firmo el prototipo de publicar sin
recargar, queda como propones». Las dos preguntas quedan como propuso el gestor: si falla, sin botón «Reintentar» (la frase en rojo y la hoja con
«Publicar otra vez»); «Publicado · hace un momento» mientras la tarjeta siga en su sitio. Contexto: bitácora [529](../10/529-carga-y-rendimiento.md)
parte D y el acta `docs/council/COUNCIL_carga-rendimiento_2026-10-31.md` (M7, condición 10).
**Estado:** hecho. Sin migración ni variables nuevas. No toqué producción, `.env`, `apps/ios`, `public/sw.js` ni `src/lib/carteles/`. Espera revisión
del gestor y el «publica» del founder.

## Qué pasaba

Al tocar «Publicar» la hoja se cerraba, la lista seguía igual 0,7 s (sin señal), luego se pedía entera otra vez (y con ella diez fichas por
prefetch), cada 5 s se preguntaba por el trabajo y, al terminar, otra recarga entera: «Publicado» llegaba 2,6 s después de que la cola terminaba y el
evento saltaba al grupo «Ya en Instagram», fuera de la vista (22 peticiones de refresco en un solo publicar).

## Qué cambió

1. **La lista es la dueña del estado** (`src/app/admin/instagram/ListaInstagram.tsx`). Lo que sabe de cada trabajo vive en `trabajosLista.ts` (puro,
   sin React ni red, probado con vitest): `semillas` (lo que trae el servidor en camino en cada renglón, `enCamino`, que ahora dice también su red y
   si lleva Facebook: `colaPorEvento.ts`), `encolado` + `anotar` (la respuesta `{ ok, id }` de «Publicar»), `conRespuesta` + `fusionar` (lo que dice
   el sondeo), `vigente` (si el trabajo manda sobre lo que dice el servidor), `lineaInstagram`, `lineaFacebook` y `enlaceVer`. La memoria de la
   sesión está en `tiendaTrabajos.ts`: una tienda del módulo con `useSyncExternalStore`, guardada en `sessionStorage` 10 min; en el servidor y al
   hidratar devuelve vacío (nada cambia entre el HTML y el primer pintado).
   - El estado es por evento y por red (`{ instagram?, facebook? }`), no un solo `EstadoTrabajo` por evento como decía el handoff: un evento puede
     tener a la vez su trabajo de Instagram y uno de Facebook (el botón de «Ya en Instagram» o «Reintentar en Facebook»).
   - **¿Cuándo manda el trabajo y cuándo el servidor?** Mientras va, siempre. Al terminar, hasta que la lista se vuelva a pedir y ya lo sepa:
     Instagram, si el evento salió después de que se armó la lista que lo pidió (`publicadoEn` ≥ `desde`; la página pasa `generada`, cuándo armó la
     lista el servidor, y cada renglón `publicadoEn`); Facebook, si la lista ya dice «publicado». Así «Publicar otra vez» sobre algo de «Ya en
     Instagram» también dice «Publicando…» y «Publicado · hace un momento» aunque la lista traiga la publicación vieja.
2. **La hoja avisa qué guardó** (`HojaInstagram.tsx`): `onPublicado({ eventoId, red, id, conFacebook, yaEstaba })` en vez de pedir `router.refresh()`,
   y `onTrabajo(e)` con cada respuesta de su propio sondeo (mientras está abierta). La lista anota el trabajo en el mismo pintado en que la hoja se
   cierra: el renglón ya dice «Publicando…» cuando la hoja desaparece. La ficha del evento (`PublicarDesdeFicha.tsx`) sigue refrescándose como antes
   (al guardar y, con `onTrabajo`, al terminar): la pieza es de la lista de Administración.
3. **El sondeo** (`useAlDia`, con su núcleo en `src/components/instagram/sondeo.ts`, probado con un reloj falso): pregunta `estadosTrabajos(ids)`
   cada 2 s (`REFRESCO_MS`, antes 5) solo mientras haya algo en camino y la pantalla se vea, nunca dos preguntas a la vez, y entrega la respuesta al
   dueño (`alCambiar`) en cuanto algo terminó o pasó a otro intento. `estadosTrabajos` devuelve ahora el trabajo entero (`EstadoTrabajo`: red, error y
   `resultado` con los enlaces), no solo estado e intento. Al volver a la app (`visibilitychange`, `pageshow` persistido) pregunta en seguida y avisa
   (`alVolver`).
4. **Los `router.refresh()`:**
   - salen el de `onPublicado` de la hoja en la lista, el de `aFacebook` (el botón de Facebook de «Ya en Instagram»: la línea la pone el estado) y el
     de `useAlDia` al terminar un trabajo;
   - queda el de volver a la app, con condición: solo si no hay nada en camino y la lista llegó al teléfono hace más de 5 min (`LISTA_VIEJA_MS`, con
     su línea de por qué: el umbral del council de la recarga, OL-500, se decide con datos);
   - siguen como estaban, fuera de esta pieza: la pestaña Semana (`SemanaInstagram` pasa `router.refresh()` a `useAlDia` para los dos avisos; su
     sondeo también va cada 2 s porque comparte `REFRESCO_MS`), `HojaDia`, `HojaSugerencia` y la ficha del evento.
5. **La tarjeta no se mueve** mientras se mira: ni la lista, ni el desplazamiento, ni el contador del grupo («Para publicar · 11» cuenta renglones),
   ni la línea gris de arriba. Cambia la última línea del renglón y, si hay espejo a Facebook, se suma la suya (el renglón crece una línea hacia
   abajo, como en el prototipo: su `top` no cambia). Todo lo demás cambia la próxima vez que la pantalla se pide al servidor.
6. **`ui/Renglon`** (`Renglon.tsx` + `Renglon.module.css`): prop `estado?: "en-camino" | "reintentando" | "hecho" | "fallido"`. Con ella el último
   hijo es el texto de la línea del estado y el renglón la arma: `envuelve`, `role="status"`, `data-estado`, en violeta con el anillo de `ui/Girando`
   (en camino, reintentando), en verde `--ok` con la palomita de `IconoOk` a 1em (hecho) o en rojo `--error` (fallido), en negrita 600; solo esa
   línea se tiñe, el fondo no cambia (`--primario-suave` sigue diciendo «elegido») y el pulsado y el paso del ratón solo tocan el fondo y el título.
   Prop `otraLinea`: una línea debajo que no se tiñe (Facebook, con su propio anillo). Sin componente `ui/Hecho`: no hizo falta.
7. **«Ver»** en el hueco de acción (hermano del enlace): `ui/BotonIcono` de control (44, plano) con el icono nuevo `IconoAbrirFuera`
   (`ui/Iconos`), `aria-label` «Ver en Instagram: <título>», `href` a la publicación (`resultado.instagram.permalink`) o, si no lo trae, a la cuenta
   (`https://www.instagram.com/smsnstrsapp/`, de `CUENTA_INSTAGRAM`), `target="_blank"`, `rel="noopener noreferrer"`, sin prefetch. En el color de
   acción (`.lista > a:not(.frente)`, como los botones de la fila). Si el renglón traía el botón de Facebook, «Ver» manda (uno solo).
8. **Espejo a Facebook:** su propia línea, como hoy: «Facebook: publicando…» con anillo mientras va, «Facebook: publicado» o «Facebook: falta
   permiso» en gris; lo saca del trabajo de Facebook o, si el de Instagram llevaba «También en Facebook», de su `resultado.facebook` al terminar.
9. **Atrás dentro del minuto:** la lista llega de la caché del enrutador con el evento en «Para publicar» y su línea vieja; la tienda de la sesión
   ya dice cómo quedó (mismo pintado, sin saltar) y, si algo seguía en camino, la lista pregunta una vez en seguida (`leerTrabajos` al llegar).
10. **`ui/Girando`** con «reducir movimiento»: `animation: none` (antes giraba despacio, 2,4 s): el anillo queda abierto y quieto.
11. **Frase nueva** en `src/lib/redes/reglas.ts`: `LINEA_PUBLICADO` = «Publicado · hace un momento». Las demás son las de hoy (`textoEnCamino`, la
    de `lineaDeTrabajo` para el fallo). Lo que no se pudo publicar que llega del servidor (fallido en las últimas 24 h, sin publicar después) también
    va en rojo: `Sugerencia.fallido`.

## Parte D de `medir-tiempos.mjs` (el criterio del council)

La app compilada contra el respaldo local (datos inventados, reloj fijo del mié 7 de oct), Fast 3G y CPU ×4, Instagram tardando 8 s, el trabajador
de verdad; «Delirium Pollum» a 420 px del borde. Extendí la parte D (solo el guion; el respaldo ya simulaba la cola, no hubo que tocarlo): un
observador en la página anota al milisegundo la primera señal, el cierre de la hoja, «Publicando…» y «Publicado» en el renglón; el guion le
pregunta al respaldo cada 100 ms cuándo terminó el trabajo; cuenta los refrescos y comprueba el mismo nodo, el mismo `top` y el mismo
desplazamiento en todos los cuadros; y deja de mirar en cuanto el renglón dice «Publicado» (antes esperaba al grupo «Ya en Instagram»). Las dos
corridas con el mismo guion (el antes, con `src` de `origin/main`): `docs/rediseno/capturas-539/tiempos-antes.md` y `tiempos-despues.md`.

| | Antes (`origin/main`) | Después |
| --- | --- | --- |
| Primera señal tras el toque (el botón de la hoja dice «Publicando…») | 6 ms | 6 ms |
| La hoja se cierra | 607 ms | 602 ms |
| El renglón dice «Publicando…» | 1 315 ms (0,7 s sin señal) | 602 ms (el mismo pintado) |
| El trabajo termina en el respaldo | 10 083 ms | 10 076 ms |
| El renglón dice «Publicado» | 12 652 ms (2 569 ms después) | 11 189 ms (**1 113 ms después**) |
| Peticiones de refresco (RSC) tras el toque | **22** | **0** |
| Mismo nodo, mismo `top` (420) y mismo desplazamiento (874) | no: a 857 px, «Ya en Instagram · 2» | **sí, en todos los cuadros** |
| Grupo al final | «Ya en Instagram · 2» | «Para publicar · 11» |

Cuadros del después (cada 500 ms, solo los que cambian):

| t | Hoja | Desplazamiento | Renglón (top) | Mismo nodo | Grupo | Texto |
| --- | --- | --- | --- | --- | --- | --- |
| 10 ms | abierta | 874 | 420 | sí | Para publicar · 11 | … Teatro de la Paz 0 van · 0 les interesa |
| 1 003 ms | — | 874 | 420 | sí | Para publicar · 11 | … Teatro de la Paz Publicando… |
| 11 500 ms | — | 874 | 420 | sí | Para publicar · 11 | … Teatro de la Paz Publicado · hace un momento Facebook: publicado |

Peticiones de React del después: la acción del servidor de «Publicar» (11 → 604 ms) y seis preguntas de `estadosTrabajos` cada 2 s (la última,
10 606 → 11 191 ms, trae «publicado»). Ninguna recarga ni prefetch.

**Señal < 100 ms tras el toque:** la primera señal (el botón «Publicando…» de la hoja) sale a los 6 ms en los dos. La del renglón llega cuando el
servidor acepta el trabajo (0,6 s con esta red), en el mismo pintado en que se cierra la hoja: ya no hay un solo cuadro con la hoja cerrada y el
renglón sin señal (lo prueba también `EspejoFacebook.componentes.test.mjs` con un observador). Ver «Por confirmar» 1.

**«Publicado» < 2 s después de terminar:** 1,1 s. El peor caso con este sondeo es 2 s más lo que tarda la pregunta (0,6 s con Fast 3G): con la red
de un teléfono normal queda alrededor de 2,1 s; la mediana, ~1,6 s.

## Verificación

- `npm run lint` (0 errores; los 2 avisos son de archivos que no toqué), `npm run typecheck`, `npm test` (325 archivos, 5 185 pruebas; nuevas:
  `trabajosLista.test.ts` 7 — sembrado, respuesta de «Publicar», sondeo que entrega estado, fallos, cuándo manda el trabajo, reconciliación al volver,
  memoria de 10 min — y `sondeo.test.ts` 4 con temporizadores falsos — cada 2 s, solo con algo en camino, nunca dos a la vez, al volver en seguida,
  sin refrescar), `npm run test:componentes` (812, todas): `EspejoFacebook.componentes.test.mjs` reescrita para el flujo nuevo (12: la hoja se
  cierra y el renglón dice «Publicando…» en el mismo pintado, 0 refrescos, «Publicado · hace un momento» con «Ver» a los 2 s en el mismo nodo y el
  mismo sitio, la hoja abierta que pregunta cada 2 s, «Reintentando…», Facebook que falla y «Reintentar en Facebook», no se publicó en rojo, el botón
  de Facebook sin recargar, volver a la app con la lista de 4 y de 5 min, Atrás dentro del minuto con desmontar y volver a montar) y 4 nuevas en
  `Renglon.componentes.test.mjs` (la última línea y su color por estado, `role=status`, el fondo igual; «Ver» de 44 hermano del enlace; el anillo
  quieto con «reducir movimiento»; la letra al doble).
- `npm run inventario`: sin novedades. `npm run medir`: 63 pantallas × 4 anchos, sin novedades (no hubo que aceptar nada).
- Parte D de `medir-tiempos.mjs`, arriba.
- Capturas con `scripts/ops/auditoria-ui/capturar-publicar-sin-recargar.mjs` (nuevo; la app de verdad contra el respaldo, como el prototipo con
  `RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_INSTAGRAM_CONEXION=todo`; toques reales por coordenadas; cada recorrido con el respaldo recién levantado):
  «todo en orden», 0 errores de página. En cada estado de la lista comprueba el mismo nodo, `top` 300, el mismo desplazamiento, el grupo «Para
  publicar · 11» y 0 refrescos (`medicion.json`).

## Capturas (`docs/rediseno/capturas-539/`, 390×844 a 2×; cada una abierta y comparada con la de `capturas-535` del mismo estado)

| Captura | Qué se ve | Frente al prototipo (535) |
| --- | --- | --- |
| `01-antes` | La lista; «Delirium Pollum» a 300 px con «0 van · 0 les interesa». Se entró desde Administración, como el founder. | Igual a `01-reposo` (más el botón «subir» flotante, que el prototipo no pintaba). |
| `02-hoja` | «Publicar en Instagram» con «También en Facebook» desmarcada (para ver la línea de Instagram sola en el 05). | Igual a `02-hoja`: la hoja no cambia en esta pieza. |
| `03-publicando` | 0,1 s después de cerrarse la hoja: «Publicando…» en violeta con el anillo, en el mismo sitio. | Igual a `03-en-camino`. |
| `04-reintentando` | «Reintentando…» (Instagram no aceptó la imagen y la cola lo repite), en el mismo sitio. | Igual a `04-reintentando`. |
| `05-publicado` | Palomita y «Publicado · hace un momento» en verde; «Ver» (abrir fuera) a la derecha; el grupo sigue en «Para publicar · 11». | Igual a `05-publicado`. |
| `06a-facebook-falta-permiso` | Instagram publicado y «Facebook: falta permiso» en gris (el paso previo para el espejo). | No está en el prototipo; es el renglón de hoy con la línea nueva. |
| `06-facebook` | Tras «Reintentar en Facebook» en la hoja: la línea verde y «Facebook: publicando…» con su anillo. | Igual a `06-facebook`. |
| `07-facebook-ok` | «Facebook: publicado» en gris; se acabó el sondeo. | Igual a `07-facebook-ok`. |
| `08-fallido` | «No se publicó: hoy ya van 100 publicaciones en Instagram» en rojo, en dos renglones, en el mismo sitio. | Dice lo mismo que `08-fallido`; otro motivo: el respaldo solo puede fallar sin reintento por cupo o permiso (con «imagen» la cola reintenta, que es el 04). |
| `09-atras-cache` | De vuelta a Instagram antes del minuto (Atrás de la barra a Administración y otra vez a Instagram): la lista de la caché (0 peticiones de la lista) y la tarjeta como se dejó, «Publicado · Ver», en «Para publicar · 11». | Igual a `09-atras-cache`. |
| `10-atras-fresco` | La lista pedida otra vez: el evento en «Ya en Instagram · 2» con «Publicación · Hoy, 10:00 am», «Facebook: sin publicar» (se publicó sin Facebook) y su botón de Facebook; «Para publicar» ya no lo tiene. | Dice lo mismo que `10-atras-fresco` (allá se publicó con Facebook). |
| `11-letra` | Letra al doble (`Page.setFontSizes`, como `medir --letra=2`): la línea verde en dos renglones, la palomita en el primero, «Ver» en su hueco sin montarse (el texto llega a 314, «Ver» empieza en 326). | Igual a `11-letra`. |
| `12-quieto` | «Reducir movimiento»: el anillo abierto y quieto (`animation-name: none`, 0 animaciones corriendo). | Igual a `12-quieto`. |

## Decisiones mías (anotadas en el código)

1. El estado por evento y por red, no uno por evento (punto 1).
2. `estado` de `ui/Renglon` toma el texto del último hijo y arma la línea; `otraLinea` para Facebook. Así «solo la última línea» sigue siendo cierto
   con dos trabajos a la vez.
3. `generada` (cuándo armó el servidor la lista) y `publicadoEn` por renglón, para saber cuándo la lista ya sabe de lo publicado desde aquí sin comparar
   relojes del teléfono con los del servidor.
4. La memoria es de la sesión (`sessionStorage`), no de la pestaña viva: sobrevive a recargar la app y a cambiar de pestaña Semana ↔ Eventos.
5. Commit con `Co-Authored-By: Claude Opus 5.5`: es el modelo con el que corrí (el encargo decía Fable 5.1).

## Por confirmar

1. **La señal del renglón a 0,1 s.** El prototipo dibuja la hoja ya cerrada y «Publicando…» a los 0,1 s, pero la hoja solo se cierra cuando el
   servidor acepta el trabajo (0,6 s con Fast 3G; lo que tarda la acción del servidor). Hasta entonces la señal es el botón «Publicando…» de la hoja
   (a los 6 ms). Cerrarla antes (sin esperar al servidor) pondría la señal en el renglón al instante, pero perdería lo que la hoja dice cuando el
   servidor no acepta: «Este evento ya se está publicando. ¿Publicarlo otra vez?», el texto que no cabe o el evento que ya empezó. Lo dejé sin
   cerrarla antes.
2. **Atrás después de 10 min.** Atrás y Adelante del navegador reutilizan la caché del enrutador sin importar el minuto; pasados 10 min la sesión
   olvida el trabajo y la tarjeta volvería a decir su línea vieja hasta que la lista se pida otra vez (otra ciudad, volver a la app con la lista de
   más de 5 min). Es raro y no publica nada dos veces (la hoja pregunta), pero se puede alargar la memoria si el founder lo ve.
3. El sondeo de la pestaña Semana y de la hoja del día también va ahora cada 2 s (comparten `REFRESCO_MS`); siguen refrescando la pantalla como antes.

## Qué debe probar el founder en su iPhone

Administración › Instagram › Eventos: baja hasta un evento, tócalo, «Publicar». La hoja se cierra y el evento dice «Publicando…» en el mismo sitio;
sin moverte, a los pocos segundos dice «Publicado · hace un momento» en verde y a la derecha sale «Ver» (abre la publicación en Instagram). El
evento nunca se va de donde lo dejaste ni cambia el «Para publicar · N». Sal a Administración y vuelve a entrar: sigue igual. Al salir de la app y
volver (más de 5 min después), la lista se pone al día y el evento ya aparece en «Ya en Instagram».
