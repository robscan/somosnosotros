# 322 · Al publicar, no perder lo escrito: borrador y atrás del navegador

**Pieza:** OL-294. **Rama:** `borrador-al-publicar` (base `origin/main` `ee623654`). **Fecha:** 2026-10-05.
**Autorizada por el founder:** 2026-10-05 («arregla ya»). **Estado:** commit local con push; sin PR y sin publicar.

## Qué decía el inventario (doc 53, bitácora 321)

Dos defectos leídos del código, sin ejecutar la app: (A) el borrador del alta de evento ya no vuelve nunca porque nada llama a `avisarQueVuelvo`; (B) el botón de atrás del navegador no consulta la guardia «¿Salir sin publicar?».

## Reproducción antes (Chrome de la Mac, 390×844, app compilada contra el respaldo local, sesión del fixture)

Se escribió el nombre en cada formulario con toques y teclado, y se probó cada gesto. Resultado, igual en los tres formularios salvo donde se indica:

| Gesto | Evento | Lugar | Artista |
| --- | --- | --- | --- |
| Recargar la página | campo vacío (se pierde) | vacío | vacío |
| Cerrar la pestaña y volver | vacío | vacío | vacío |
| Ir a otra sección (documento nuevo) y volver a `/nuevo` | vacío | vacío | vacío |
| Atrás del navegador, llegando por navegación interna (como en la app) | se va a `/` sin hoja ni aviso | igual | igual |
| Atrás del navegador, llegando por documento nuevo | se va a `/` sin hoja ni aviso | igual | igual |
| ✕ de la barra (control) | abre la hoja «¿Salir sin publicar?» | abre | abre |
| `localStorage` tras escribir | `somosnosotros:borrador-evento` con el título | vacío | vacío |

Los dos defectos **se reproducen tal como los describió el inventario**. El evento sí guarda el borrador en el teléfono con cada cambio; al montar el formulario lo borra porque nadie dejó la señal.

## Causa

- **A.** `FormularioEvento.tsx:308-320`: al montar, el borrador solo se lee si `vengoDeRegistrarLugar()` es verdadero y, si no, se llama `olvidarBorrador()`. La señal la dejaba `avisarQueVuelvo()` desde los enlaces «Regístralo» / «Agregar» de la hoja Dónde, que salían del alta hacia `/lugares/nuevo`. El commit `5aa4612d` (OL-173, bitácora 208) rehízo la hoja Dónde para registrar el lugar en el sitio y quitó esos dos enlaces: desde entonces `avisarQueVuelvo` no tiene quién la llame y `tomarLugarNuevo` tampoco quién deje el lugar (`src/app/eventos/borrador.ts`). El guardado sigue corriendo; la lectura nunca.
- **B.** `Atras.tsx:41` consulta la guardia (`pedirSalida`) solo al tocar el botón o la ✕, o con el gesto nativo de la app instalada (`registrarVolverVisible`). El atrás del navegador no pasa por ahí, y no existía ningún `beforeunload`.

## Historia que decide qué se puede arreglar

- **El borrador se apagó a propósito.** Bitácora [044](044-hojas-teclado-salida-y-borrado.md) (2026-09-15, firmada por el founder en el iPhone): «El borrador ya no vuelve solo… solo vuelve cuando se regresa de "Registrar un lugar nuevo"… Cerrar la app a medias pierde lo escrito: es la decisión del founder (formulario limpio)». Bitácora [049](049-salida-estandar-de-las-altas.md) (2026-09-16, firmada): «El alta empieza limpia»; Lugares y Artistas dejan de guardar borrador (lo que el founder rechazó el 15). Decisión 8 de `docs/rediseno/15`.
- Por eso **no se reactivó el borrador.** Lo que el inventario llama defecto A es, en lo esencial, la decisión firmada del 15 y 16 de septiembre: recargar y cerrar pierden lo escrito a propósito. Lo único que cambió es que el camino que sí lo devolvía (volver de registrar un lugar) murió sin avisar con OL-173, y quedó el mecanismo como código muerto.
- El atrás del navegador: en iPhone el atrás de Safari retrocede al documento anterior y ninguna entrada añadida con `pushState` se interpone (memoria del proyecto, «Atrás de Safari»); la bitácora 083 y `Atras.tsx` ya tratan el historial con una marca propia. Atrapar el atrás con entradas falsas está prohibido por el encargo y rompería «filtrar no es navegar».

## Qué se hizo (mínimo)

- `SalirSinPublicar.tsx`: la guardia que ya existía añade un `beforeunload` mientras está puesta. Avisa (con el diálogo propio del navegador, sin texto nuestro) solo si la huella del formulario cambió respecto a cómo se abrió, la misma regla de la hoja. No avisa tras publicar (la acción de cada formulario ya llama `quitarGuardia()`), ni tras «Salir y borrar» (confirmar quita la guardia antes de salir, también cuando la salida es una recarga completa), ni sin cambios. Se quita al desmontar la pantalla.
- `lib/guardiaSalida.ts`: `hayGuardia(g)` para que ese oyente sepa si su guardia sigue puesta.
- No se tocó el borrador, ni `Atras`, ni el formulario, ni ningún texto, ni CSS.

## Pruebas

- `src/lib/guardiaSalida.test.ts`: 4 pruebas (una nueva de `hayGuardia`).
- `src/components/SalirSinPublicar.componentes.test.mjs` (nueva, Chrome real): 5 pruebas: sin cambios no avisa; con cambios avisa y deja de avisar si se vuelve a lo de antes; al publicar no avisa; «Salir y borrar» olvida el borrador, entrega la salida y deja de avisar, y «Seguir editando» conserva todo; al desmontar quita el oyente. Sin el arreglo fallan 3 de las 5 (comprobado quitando el cambio un momento).
- `npm run lint` sin errores (una advertencia de `VisorImagen.componentes.test.mjs`, ya existía), `npm run typecheck` verde, `npm test` 1 985 pruebas en 139 archivos verdes, `npm run inventario` sin novedades, `npm run medir -- --solo=alta` sin novedades (alta de evento 48/48/82/82 nodos, lugar 38/38/72/72, artista 60/60/94/94, dentro de lo aceptado).

## Reproducción después (misma app compilada con el arreglo)

| Gesto | Evento | Lugar | Artista |
| --- | --- | --- | --- |
| Recargar con cambios | el navegador avisa (`beforeunload`); aceptando, el campo vuelve vacío | igual | igual |
| Cerrar la pestaña y volver / otra sección y volver | vacío (decisión del founder) | vacío | vacío |
| Atrás del navegador por documento nuevo | el navegador avisa (`beforeunload`) | igual | igual |
| Atrás del navegador por navegación interna | **sin cambio**: se va sin hoja ni aviso | igual | igual |
| ✕ de la barra | hoja «¿Salir sin publicar?» | igual | igual |

Lo que **no** se pudo arreglar: el atrás del navegador por navegación interna (en Chromium es un `popstate` sin descarga del documento). Solo se atraparía con entradas falsas en el historial, que el encargo prohíbe.

## Capturas (390×844, `docs/rediseno/capturas-322/`, Bricolage Grotesque cargada en todas)

Las capturas no distinguen antes y después: el arreglo es un aviso propio del navegador, que no sale en una captura sin cabeza; la evidencia de ese aviso es el registro de diálogos de la tabla anterior y la prueba de componente.
- `01-evento-escrito.png`: alta de evento con «Concierto de prueba» escrito en el nombre (con su ✕ para limpiar), «Hoy · 19:00», «Dónde: Falta», botón morado claro «Publicar evento» y debajo «Falta dónde es.»; tira Evento · Lugar · Artista al pie.
- `02-evento-tras-recargar.png`: la misma pantalla tras recargar: «Nombre del evento» vacío y «Falta el nombre y dónde es.» Lo escrito se perdió (decisión de 2026-09-15).
- `03-tras-atras-del-navegador.png`: el atrás del navegador con el nombre escrito llevó a Inicio («Tus planes», «Seleccionados para ti») sin ninguna pregunta.
- `04-hoja-salir-sin-publicar.png`: control: la ✕ con cambios abre «¿Salir sin publicar? Se borra lo que escribiste.» con «Seguir editando» y «Salir y borrar».

## Para el founder y el gestor (decisiones que no son mías)

1. **¿Se quiere el borrador de vuelta?** Sería cambiar la decisión firmada del 15 y 16 de septiembre; hoy no hay datos de gente usando la app que la contradigan. Si el rediseño por pasos (análisis 51) lo pide, es una decisión nueva para ese rediseño, con su propio prototipo.
2. **Código muerto del borrador** (`avisarQueVuelvo`, `vengoDeRegistrarLugar`, `tomarLugarNuevo`, `CLAVE_LUGAR`, y el efecto de guardado en `FormularioEvento.tsx:308-352`): sigue guardando en `localStorage` cada cambio del evento y lo borra en el siguiente montaje. Conviene retirarlo o reactivarlo por decisión; no se tocó para no deshacer nada.
3. **Aparte, leído en el código y sin comprobar corriendo:** si «Publicar» devuelve un error del servidor, la acción ya llamó `quitarGuardia()` y los campos siguen en pantalla, pero Atrás o la ✕ salen sin preguntar y se pierde lo escrito. Mismo tipo de pérdida, otra causa; quedó fuera de esta pieza.

## Solo se puede comprobar en un iPhone real

- Que Safari del iPhone (y la app instalada) no muestran el aviso de `beforeunload`: se espera que no, por lo que ahí la pieza no cambia nada; hay que confirmarlo.
- Que el atrás de Safari con navegación interna retrocede al documento anterior sin pasar por la guardia (es lo que dice la nota de la memoria del proyecto; aquí se midió en Chrome).
- Que el aviso del navegador en Chrome de escritorio aparece también con la ventana real (aquí se vio como evento y diálogo en Chrome sin cabeza).
