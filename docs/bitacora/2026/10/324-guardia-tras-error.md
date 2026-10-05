# 324 · Si «Publicar» falla en el servidor, «¿Salir sin publicar?» sigue protegiendo lo escrito

**Pieza:** OL-296. **Rama:** `guardia-tras-error` (base `origin/main` `b57f947a`). **Fecha:** 2026-10-05.
**Autorizada por el founder:** 2026-10-05 («Adelante con tus recomendaciones»: primero reproducir, después arreglar). **Estado:** commit local con push; sin PR y sin publicar.

## Qué se sospechaba (bitácora 322, punto 3 de «Para el founder y el gestor»)

Leído en el código y sin comprobar: al tocar «Publicar» la guardia de salida se quita antes de saber el resultado. Si el servidor contesta con un error, los campos siguen en pantalla pero Atrás y la ✕ salen sin preguntar y lo escrito se pierde.

## Cómo se reprodujo

Dos advertencias de método:

- **OL-294 todavía no está en `main`** (vive en `borrador-al-publicar`). Como el encargo pedía comprobar también el aviso `beforeunload` de OL-294, las dos corridas (antes y después) se compilaron con los dos archivos de OL-294 (`SalirSinPublicar.tsx` y `guardiaSalida.ts`) aplicados un momento sobre el árbol, sin commit. Lo que se entrega no los lleva.
- Compilado con `next build && next start` contra el respaldo local (`scripts/ops/auditoria-ui/respaldo-local`) detrás de un proxy de pruebas fuera del repo (puertos 18823, 18824 y 18825; reloj fijo, sesión con la cookie del fixture) que contesta a pedido 500 o 409 a la inserción de lugares y artistas y a la función que guarda eventos. Chrome de la Mac sin cabeza con playwright-core, 390×844, móvil con toque, Bricolage Grotesque cargada (comprobado con `document.fonts`).
- En cada formulario se escribió el nombre (en evento también «Dónde: Teatro de la Paz»; en lugar, el pin en el mapa), se tocó «Publicar» y, con el error a la vista, se probó cada gesto: la ✕ de la barra (¿abre la hoja o se va?) y el aviso `beforeunload` (¿el oyente cancela el evento, como se mide en 322?). La fila «control» es el mismo formulario escrito sin tocar «Publicar».

## Reproducción antes

| Formulario y caso | Campos siguen | Aviso del servidor | `beforeunload` | ✕ de la barra |
| --- | --- | --- | --- | --- |
| Evento, control (sin publicar) | sí | — | avisa | hoja «¿Salir sin publicar?» |
| Lugar, control | sí | — | avisa | hoja |
| Artista, control | sí | — | avisa | hoja |
| **Evento, error 500** (el respaldo tampoco sabe guardar eventos: falla igual sin proxy) | sí | «No se pudo publicar el evento completo. Intenta de nuevo.» | **no avisa** | **sale a `/` sin preguntar** |
| **Lugar, error 500** | sí | «No se pudo guardar el lugar. Intenta de nuevo.» | **no avisa** | **sale a `/lugares` sin preguntar** |
| **Artista, error 500** | sí | «No se pudo guardar. Intenta de nuevo.» | **no avisa** | **sale a `/artistas` sin preguntar** |
| **Artista, nombre repetido (409, `23505`)** | sí | «Ya hay una ficha con ese nombre.» | **no avisa** | **sale a `/artistas` sin preguntar** |
| Lugar, publica bien | — | navega a la ficha | no avisa | — (sin diálogos) |
| Artista, publica bien | — | navega a la ficha | no avisa | — (sin diálogos) |

**La sospecha se reproduce tal como estaba escrita**, en los tres formularios y con los dos tipos de error del servidor (fallo de la base y rechazo por repetido). Los casos que devuelven `{ ok: false }` (validación del servidor, «¿es este?» de lugares parecidos) pasan por el mismo camino.

Dos cosas más que salieron al reproducir:

- **Sin conexión** (el navegador sin red al tocar «Publicar», en artista): no llega ninguna respuesta de la acción, React lanza el error y se pinta la pantalla «Algo falló / Intentar de nuevo» (`06-sin-conexion-algo-fallo.png`). El formulario ya se desmontó: no queda nada en pantalla que proteger, y es otra causa (la pantalla de error de la app). No se tocó; ver Límites.
- **Editar** (evento, lugar, artista): `useSalirSinPublicar` solo lo usa `src/app/nuevo/Alta.tsx`; las pantallas de editar (`[id]/editar/page.tsx`) ni siquiera tienen guardia, así que Atrás y la ✕ nunca preguntaron ahí, antes y después. Estático (con el usuario del respaldo, las rutas de editar redirigen a la ficha y no se pudieron abrir en la corrida). Es otra decisión, no se tocó.

## Causa

Los tres formularios llamaban `quitarGuardia()` dentro de su `action`, antes de enviar, y nada la ponía de vuelta cuando el servidor contestaba un error:

- `src/app/eventos/FormularioEvento.tsx:545` (antes del cambio),
- `src/app/lugares/FormularioLugar.tsx:277`,
- `src/app/artistas/FormularioArtista.tsx:172`.

La guardia solo se vuelve a poner al montar la pantalla (`SalirSinPublicar.tsx:31`, `ponerGuardia(g)`), así que tras un error quedaba el formulario con lo escrito y sin guardia. La acción de crear termina con `redirect(...)` cuando sale bien (`eventos/acciones.ts:112`, `lugares/acciones.ts`, `artistas/acciones.ts:71`): el éxito no devuelve nada al formulario, la pantalla simplemente se desmonta. Por eso se quitaba antes: para no preguntar a quien ya se iba a la ficha (y, con OL-294, para que `beforeunload` no avisara de una salida que publica).

Historia previa: la bitácora 049 puso la guardia de las tres altas en una sola (`Alta.tsx`), y la regla «al publicar se quita» se cumplió al pie de la letra, pero nadie contempló que publicar pudiera no publicar.

## Arreglo (mínimo)

Apartar en vez de quitar: la guardia sale de en medio al tocar «Publicar», como antes, pero se guarda; si el servidor contesta con `ok: false`, vuelve.

- `src/lib/guardiaSalida.ts`: `apartarGuardia()` (guarda la guardia puesta y la deja fuera) y `reponerGuardia()` (la devuelve, una sola vez, si nadie puso otra ni la quitó). `ponerGuardia` descarta lo apartado de una pantalla anterior. `quitarGuardia`, `pedirSalida` y la huella no cambian (así el cambio convive con el `hayGuardia` de OL-294, que está en otro tramo del archivo).
- `FormularioEvento.tsx`, `FormularioLugar.tsx`, `FormularioArtista.tsx`: `quitarGuardia()` pasa a `apartarGuardia()` y un `useEffect` sobre `resultado` llama `reponerGuardia()` cuando no es `ok`. Tres líneas por formulario. Ningún texto, diseño ni CSS.
- Caso bueno intacto: mientras el servidor trabaja y tras un éxito la guardia sigue fuera (sin hoja ni `beforeunload`), exactamente como antes; no se pregunta nada al ir a la ficha.
- No se tocó `SalirSinPublicar.tsx`, `Atras.tsx` ni el borrador (apagado a propósito: bitácoras 044 y 049).

## Pruebas

- `src/lib/guardiaSalida.apartar.test.ts` (nueva, vitest): 6 pruebas de la mecánica (apartada no pregunta; repuesta vuelve con la misma salida; sin guardia no inventa una; una guardia nueva descarta la apartada; «Salir y borrar» tras reponer no resucita; una guardia de una pantalla desmontada no pasa a la siguiente). Archivo aparte para no pisar `guardiaSalida.test.ts`, que OL-294 también edita.
- `src/app/eventos/guardiaTrasError.componentes.test.mjs` (nueva, Chrome real, formulario de evento real dentro de la guardia real, acción simulada, red bloqueada): 5 pruebas. Control sin publicar protege. Error del servidor: el campo sigue, `beforeunload` avisa, la guardia entrega la salida y sale la hoja «¿Salir sin publicar?»; «Seguir editando» conserva todo y «Salir y borrar» sale y deja de avisar. Error y luego éxito: la guardia sale otra vez. Éxito: no pregunta nada. Publicando (la acción no contesta): guardia fuera. Sin el `useEffect` que repone fallan 2 de las 5 (las dos de error; comprobado quitándolo un momento).
- Compatibilidad con OL-294: con sus dos archivos aplicados un momento, su `SalirSinPublicar.componentes.test.mjs` (5) sigue verde junto a las mías, y `guardado` y `cupo` del formulario de evento (15) también: 25 de 25.
- `npm run lint` sin errores (una advertencia ya existente de `VisorImagen.componentes.test.mjs`); `npm run typecheck` verde; `npm test` 1 990 pruebas en 140 archivos verdes; `npm run inventario` sin novedades; `npm run medir -- --solo=alta` sin novedades (alta de evento 48/48/82/82 nodos, lugar 38/38/72/72, artista 60/60/94/94, sin cambio: no se tocó ningún pintado).

## Reproducción después (misma corrida, app compilada con el arreglo)

| Formulario y caso | Campos siguen | `beforeunload` | ✕ de la barra |
| --- | --- | --- | --- |
| Evento, control | sí | avisa | hoja |
| Lugar, control | sí | avisa | hoja |
| Artista, control | sí | avisa | hoja |
| **Evento, error 500** | sí | **avisa** | **hoja «¿Salir sin publicar?», se queda en `/nuevo`** |
| **Lugar, error 500** | sí | **avisa** | **hoja, se queda** |
| **Artista, error 500** | sí | **avisa** | **hoja, se queda** |
| **Artista, nombre repetido** | sí | **avisa** | **hoja, se queda** |
| Lugar, publica bien | — | no avisa | navega a la ficha, sin diálogos |
| Artista, publica bien | — | no avisa | navega a la ficha, sin diálogos |
| Artista, sin conexión | — (pantalla «Algo falló») | — | — (igual que antes: otra causa) |

## Capturas (390×844, `docs/rediseno/capturas-324/`, PNG de la corrida real, Bricolage Grotesque cargada)

La evidencia del «antes» es la tabla de arriba (el estado visual del error es el mismo; lo que cambiaba era que la ✕ se iba). Se abrieron todas:

- `01-evento-error-del-servidor.png`: alta de evento con «Concierto de prueba», «Hoy · 19:00», «Dónde: Teatro de la Paz», «Quién: Sin artista», «Cuánto: Gratis», el aviso rojo «No se pudo publicar el evento completo. Intenta de nuevo.» y el botón morado «Publicar evento»; tira Evento · Lugar · Artista al pie.
- `02-evento-hoja-salir-sin-publicar.png`: lo mismo tras tocar la ✕: fondo atenuado y la hoja «¿Salir sin publicar? Se borra lo que escribiste.» con «Seguir editando» (morado) y «Salir y borrar» (rojo). Antes del arreglo esta hoja no salía.
- `03-lugar-hoja-salir-sin-publicar.png`: alta de lugar («Casa de prueba», «Dónde: Pin en el mapa», «Tipo: Otro») con «No se pudo guardar el lugar. Intenta de nuevo.» y la misma hoja.
- `04-artista-ya-hay-una-ficha.png`: alta de artista («Grupo de prueba», Qué hace Música, Es Grupo, Ciudad San Luis Potosí) con «Ya hay una ficha con ese nombre.» sobre «Publicar artista».
- `05-artista-hoja-salir-sin-publicar.png`: esa misma pantalla tras la ✕, con la hoja.
- `06-sin-conexion-algo-fallo.png`: el caso sin conexión: pantalla «Algo falló. No se pudo cargar esta pantalla. Suele arreglarse al intentar de nuevo.» con «Intentar de nuevo» y «Atrás»; el formulario ya no está.

## Límites

- **El reproductor usa un proxy de pruebas fuera del repo** (contesta 500 o 409 a pedido). El respaldo local no cambió. Lo que no se probó corriendo con la app compilada: el éxito del alta de evento (el respaldo no sabe guardar eventos, siempre falla); el éxito está cubierto por la prueba de componente y por el éxito real de lugar y artista, que usan el mismo gesto.
- **Sin conexión o fallo de red en la propia acción** (la acción lanza en vez de devolver `ok: false`): la app pinta «Algo falló» y se pierde lo escrito, con o sin guardia, porque el formulario se desmonta. Arreglarlo es otra pieza (capturar el fallo de red dentro del formulario y devolverlo como `ok: false`, o que la pantalla de error conserve el borrador); se deja a la decisión del gestor.
- **Editar** no tiene guardia en ninguno de los tres formularios (ver arriba); no es parte de esta pieza.
- Sigue valiendo lo de 322: el atrás del navegador por navegación interna no pasa por la guardia (solo se atraparía con entradas falsas en el historial); el borrador sigue apagado por decisión del founder.
- Tocar «Publicar» y, mientras el servidor trabaja, tocar la ✕ o Atrás sigue saliendo sin preguntar (como antes); lo que cambia es solo el paso posterior a un error.

## Solo se puede comprobar en un iPhone real

- Que la hoja «¿Salir sin publicar?» sale con la ✕ tras un error real del servidor, en Safari y en la app instalada. Es difícil de provocar a mano (el formulario ya impide el nombre repetido antes de enviar; el error del servidor solo aparece si la base falla o dos personas publican a la vez), así que aquí queda cubierto por el reproductor con errores inventados y por la prueba de componente.
- Que el gesto nativo de volver de la app instalada (`registrarVolverVisible` en `Atras.tsx`) también encuentra la guardia repuesta; aquí solo se midió la ✕.
- Que el aviso `beforeunload` (de OL-294) no aparece en Safari del iPhone (se espera que no lo muestre); aquí se midió como evento en Chrome.
