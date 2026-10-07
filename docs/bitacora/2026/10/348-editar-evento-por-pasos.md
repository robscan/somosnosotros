# 348 · Editar un evento por pasos

**Pieza:** OL-319 (punto 2 del orden firmado por el founder: «editar evento por pasos (incluye horario por día)»). **Rama:** `editar-evento-por-pasos` (sobre `origin/main` `20fd86d0`). **Fecha:** 2026-10-06. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado con los componentes reales (Chrome), con la app compilada contra el respaldo local y en el simulador de iPhone (Safari, teclado en pantalla); falta el iPhone real. **Trae una migración que solo añade; la aplica el gestor antes de unir** (`20261006150000_editar_evento_sesiones.sql`): sin ella, guardar un evento editado falla («No se pudo guardar el evento completo»).

## Qué se encargó

Que editar un evento deje el formulario de siempre (`FormularioEvento`) y use el flujo por pasos del alta, con el diseño del gestor (por confirmar con el founder): entrar directo en «Revisa» con todo puesto, cada renglón abre la pregunta de siempre y vuelve a «Revisa», «Guardar cambios», la guardia «¿Salir sin guardar?», el horario por día (pasar de un día a varios y ajustar cada día) guardado en la misma transacción, cambiar o quitar el cartel, y no perder nada de lo que la gente tenía.

## Qué hay

- **La misma ruta, `/eventos/<slug>/editar`** (el «Editar» del menú ··· de la ficha no cambia; la dirección vieja con el UUID sigue redirigiendo), ahora monta `EditarEvento` (`src/app/nuevo/evento/EditarEvento.tsx`). La página lee el evento con sus sesiones (`sesiones:eventos_sesiones(inicio, fin)`), el sitio privado si es reservado, los artistas, mis artistas, el cupo de lectura de carteles y los lugares; arma las respuestas con `respuestasAlEditar` (`alEditar.ts`, lógica pura) en la zona en que las guardará el servidor. Solo su autor y la administración; sin sesión, a Entrar y de vuelta.
- **Entra en «Revisa»** (`estadoAlEditar`: la pila empieza en `revisa`): barra «Editar evento» con la ✕ (vuelve a la ficha), el riel gris sin avance, el nombre de título con **«Cambiar nombre»** y, con cartel, la miniatura y **«Cambiar cartel»** debajo; los renglones de siempre (cuándo, dónde, cuánto, quién) con su «Cambiar»; sin cartel, un renglón opcional punteado **«Cartel · Agregar»**; el enlace quieto dice **«Cambiar artistas, descripción o enlace»** si algo de eso ya tiene (si no, «Agregar…»); el pie, **«Guardar cambios»** (o lo que falta: un precio guardado sin número, «taquilla», dice «Falta el precio»).
- **Cada «Cambiar»** abre la pregunta del alta (`Preguntas`, la misma pieza que pinta el alta) con lo de ahora puesto: el nombre con su ✕ y su contador; el día (el calendario abre en el día del evento); la hora; «¿Dónde es?» con el nombre del sitio ya escrito y los tres modos (lugar del directorio, otro sitio confirmado en «¿Es aquí?» con «Usarlo solo en este evento», «Guardarlo como lugar» o «Es un sitio reservado»); el precio con el número de ahora; lo opcional (artistas, descripción, enlace). Al contestar vuelve a «Revisa»; Atrás también, sin cambiar nada.
- **Horario por día:** un evento con sesiones llega con la casilla «Mismo horario todos los días» desmarcada y un renglón por día con sus horas (el día distinto en tinta); «Cambiar cuándo» abre ese paso; se puede cambiar un día, volver a marcar la casilla (el mismo horario cada día: se guardan sin sesiones) o, en un evento de un día, «Dura varios días» y ajustar día por día. «Siguiente» vuelve a «Revisa».
- **Cartel:** «Cambiar cartel» (o «Cartel · Agregar») abre el paso del cartel del alta: el marco «Sube el cartel» con la casilla «Lectura automática» **desmarcada de entrada** (lo puesto no se pisa sin pedirlo) y, si el evento tiene cartel, «Quitar el cartel» en el lugar de «No tengo cartel». El cartel nuevo se sube siempre y vuelve a «Revisa»; con la casilla marcada se lee y lo leído cambia lo que el cartel dice (con el sello «Leído del cartel» para revisarlo), sin quitarle al evento sus artistas si el cartel no nombra ninguno. La administración puede pegar la dirección de una imagen en ese paso (`CampoImagenUrl`, como antes).
- **Guardar:** el formulario escondido manda los mismos campos que el alta (`CamposEvento`, pieza compartida) más la versión (`revision`) y, con horario por día, `sesiones`. `actualizarEvento` valida las sesiones (`validarSesiones`, el error sale junto al cuándo) y guarda siempre con `editar_evento_con_sesiones`. Guardado: vuelve a la ficha sin quedarse en el historial (`useTerminar`, como antes); no hay pantalla «Publicado». Un error del servidor sale sobre el botón y la guardia vuelve; si el evento cambió mientras se editaba, el aviso de siempre con «Ver versión actual en otra pestaña»; un reintento conserva su clave de operación.
- **Guardia:** sin cambios, la ✕ sale sin preguntar; con cambios, «¿Salir sin guardar?» · «Se pierden los cambios que hiciste.» · «Seguir editando» / «Salir sin guardar» (`useSalirSinPublicar` y `PorPasos` aceptan `guardia="guardar"`; el alta no cambia).

## La migración (solo añade)

`supabase/migrations/20261006150000_editar_evento_sesiones.sql`: la función `editar_evento_con_sesiones(p_evento, p_datos, p_privado, p_quien, p_sesiones, p_revision, p_operacion)`, `security invoker`, solo `authenticated`. Con sesiones llama a `guardar_evento_con_sesiones` (OL-311) tal cual; sin ellas (`null`), a `guardar_evento_con_avisos` y, en la misma transacción, borra las sesiones del evento (salvo un reintento `repetido`). Sin evento, error. **Por qué hace falta:** `guardar_evento_con_sesiones` con `p_sesiones` nulo no toca las sesiones; al volver a marcar la casilla quedarían las filas de antes y, como el primer día suele seguir empezando igual, `sesionesVigentes` las seguiría leyendo: la ficha enseñaría un horario por día que ya no existe. No se tocan las funciones de siempre.

## Lo que la gente tenía en el formulario de editar, y dónde sigue

| Salida del `FormularioEvento` | En editar por pasos |
| --- | --- |
| Nombre con ✕ y contador; vacío no se guarda | «Cambiar nombre» → «¿Cómo se llama?» (✕, contador, «Falta el nombre») |
| Cuándo: empieza y termina (`SelectorCuando`), varios días, de madrugada | «Cambiar cuándo» → «¿Qué día es?» (chips, «Otro día», «Dura varios días») → «¿A qué hora?» (chips, «Otra hora», «¿Cuánto dura?», «Sin hora de fin», madrugada del día siguiente) |
| (No existía: horario por día, OL-311) | La casilla «Mismo horario todos los días» y un renglón por día con su hoja |
| Dónde: lugar del directorio, «Estoy aquí», buscar, otro sitio con pin, sitio reservado con dirección exacta, «Agregar lugar» en línea | «Cambiar dónde» → «¿Dónde es?» (directorio, mapa, «Estoy aquí») → «¿Es aquí?» → «No está en el directorio» (solo este evento, guardarlo como lugar, sitio reservado) |
| Sitio reservado: indicaciones y cuántas horas antes se revela | Se conservan tal cual (el formulario de siempre tampoco los cambiaba: venían del alta) |
| La nota «La dirección ya no está disponible por privacidad…» de un reservado vencido | La misma nota en el renglón «Dónde»; se guarda sin dirección si el servidor lo permite (`direccionRetirada`) |
| Quién (artistas, «· tú») | Renglón «Quién» y «Cambiar artistas, descripción o enlace» |
| Cuánto: Gratis, Cooperación solidaria, Con costo y su precio | «Cambiar cuánto» → «¿Cuánto cuesta?» |
| Más: descripción (tope) y enlace | «Cambiar artistas, descripción o enlace» |
| Más: el cartel o una foto («Poner el cartel o una foto», «Cambiar la imagen») | «Cambiar cartel» / «Cartel · Agregar»; además ahora se puede quitar |
| Administración: dirección de una imagen | En el paso del cartel |
| «Guardar cambios», lo que falta, «Guardando…» | El pie de «Revisa» |
| Errores del servidor junto a su dato y el general | Igual, en «Revisa» |
| Conflicto de versión y «Ver versión actual en otra pestaña» | Igual |
| Reintento con la misma clave de operación | Igual |
| Volver a la ficha al guardar | Igual (`useTerminar`) |
| «Volver al evento» de la barra | La ✕ («Cerrar (Volver al evento)»), con la guardia |

**Ocultar / mostrar, borrar (con su confirmación), duplicar con otra fecha, reportar y activar obra colectiva** no vivían en el formulario: están en el menú ··· de la ficha y siguen ahí sin cambios (prueba nueva en `eventos/[id]/page.test.ts`; captura 09). **«Solo yo lo veo»** no existe en el formulario de editar un evento (es del perfil y de los lugares privados); lo más cercano, el sitio reservado y el lugar privado de la cuenta, siguen.

## Qué se retira (nada lo usaba ya)

- `src/app/eventos/FormularioEvento.tsx` y su CSS.
- `src/app/eventos/SelectorCuando.tsx`, su CSS y sus pruebas de componentes (solo lo usaba el formulario); de `lib/cuandoEvento.ts`, `conDias`, `conHoraInicio`, `horasEntre`, `finDelDia` y `HORA_INICIAL`, y sus pruebas (`terminaOtroDia` queda interna de `conHoraFin`).
- `guardado`, `ciudadSitio` y `guardiaTrasError` (`.componentes.test.mjs`): probaban el formulario. Lo que comprobaban lo prueban ahora las de `EditarEvento` (reintento y conflicto, ciudad del pin guardada, guardia tras un error).
- `crearGestosFlyer` (`gestosFlyer.ts`) y la «vigencia» opcional de `useEstoyAqui`: solo los usaba el formulario.
- Medidas en duro: 334 → 332 (`npm run inventario -- --aceptar`; solo bajaron).

## Decisiones del operador (dentro de lo encargado, dichas explícitamente)

1. **«Cambiar nombre» y «Cambiar cartel», con su palabra**, bajo el nombre. En el alta el nombre se cambia con Atrás; al editar se entra en «Revisa» y sin esto el nombre no se podía cambiar (se perdía una salida). «Cambiar» a secas, dos veces en la cabeza, no decía cuál era cuál.
2. **La lectura del cartel nuevo arranca desmarcada** y, marcada, lo leído reemplaza lo que el cartel dice (se ve en «Revisa» con su sello antes de guardar); un cartel sin artistas no quita los del evento.
3. **«Quitar el cartel»** en el paso del cartel (el formulario de siempre no podía quitarlo, solo cambiarlo).
4. **«Guardar cambios» encendido aunque nada haya cambiado** (guarda lo mismo, como antes); apagado y diciendo qué falta solo si algo falta.
5. **La zona horaria de editar sigue la regla del formulario de siempre** (`useZonaDelSitio`: la del lugar; la del punto del sitio, pedida al servidor cuando el punto cambia; la del evento si es un reservado sin dirección). El alta no cambia (ver hallazgos).
6. **Un lugar privado de la cuenta se queda como lugar** (`lugar_id`), como lo guardaba el formulario; no se vuelve sitio reservado como al elegirlo en el alta. Un lugar que ya no está en el directorio queda por contestar («Falta el lugar»), como antes.
7. **Un sitio con dirección y sin pin** dice «Falta el lugar · Poner» (el formulario decía «Confirmar») y abre «¿Dónde es?» con su nombre escrito.
8. **Sin barra de avance** al editar (`avance={0}`: queda el riel gris); no hay recorrido que medir.
9. **Las horas de un día en «Revisa» ya no se parten dentro del rango** («17:00–» y «19:00» en dos renglones a 320): van juntas tras el último « · », como ya iban las de varios días. Cambia también en el alta.
10. **Las acciones del menú ··· de la ficha no se copian en la barra de editar**: no estaban en el formulario y siguen a un toque desde la ficha a la que vuelve la ✕.
11. **Piezas compartidas, no copiadas:** `Preguntas` (las preguntas del evento), `useSitioPorPasos` (lo de «Dónde»), `CamposEvento` (el formulario escondido) y `preguntaDe` en `pasos.ts` salen de `AltaEvento`, que ahora las usa igual (sus 84 pruebas pasan sin cambios).
12. **Respaldo local** (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`): dos eventos de Ana ocultos (no salen en listas ni cuentas: ninguna medición cambió), uno con cartel y otro de tres días con horario por día (`eventos_sesiones`, tres filas); `actualizado_en` en todos los eventos (sin él, «Guardar cambios» pedía volver a abrir) y `editar_evento_con_sesiones` contesta lo guardado (sin guardarlo). `medir` suma la pantalla `s21-editar-evento`.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **158 archivos, 2326 pruebas, en verde**. Nuevas: `nuevo/evento/alEditar.test.ts` (14: todo el evento como respuestas y «Revisa» sin nada pendiente; guardar sin tocar nada guarda el mismo inicio y fin, también sin fin, de madrugada y de varios días; cuándo, costo, los tres modos de dónde con el reservado y su dirección retirada, horas para revelar, horario por día y sus sesiones de vuelta idénticas, sesiones que ya no corresponden, volver a marcar la casilla, «Cambiar» y Atrás desde «Revisa»), `guardado.test.ts` (+3: editar con sesiones, sin ellas con `p_sesiones` nulo, un horario que no cuadra no llega a la base; el conflicto usa la función nueva), `eventos/[id]/page.test.ts` (+3: Editar, Duplicar y Borrar para su autora; Ocultar para la administración; nada para otra cuenta).
- `npm run test:db` (PostgreSQL 17 local): **1648 pruebas, 0 fallos**, 83 migraciones; `editar-evento-sesiones.test.mjs` nueva (reemplaza sesiones, sin ellas las borra, reintento sin tocar nada, un evento sin sesiones no crea filas, un rechazo y un conflicto no dejan nada a medias, sin evento es error, otra cuenta no edita, la administración sí, `anon` no ejecuta).
- Componentes (Playwright, Chrome de la Mac): **`EditarEvento.componentes.test.mjs` nuevo, 18 pruebas** (entra en «Revisa» y guardar sin tocar manda lo mismo y vuelve a la ficha; la guardia sin y con cambios; cuándo; nombre; precio; dónde con otro lugar y con otro sitio en el mapa; ciudad del pin; reservado; horario por día, cambiar un día y volver a marcar la casilla; de un día a varios; quitar y poner cartel; cartel nuevo sin leer y leído; dirección de imagen de la administración; lo opcional; precio sin número; conflicto y error con su clave; a 320 y 390 sin desbordes). Suite completa `npm run test:componentes`: **466 de 466 en verde**.
- `npm run inventario`: sin novedades (332 medidas en duro).
- `npm run medir`: **30 pantallas × 4 anchos, sin novedades** tras anotar `s21-editar-evento` (33/33/67/67 nodos, profundidad 7); teclado sin fallos.

## Capturas (`docs/rediseno/capturas-348/`)

Del simulador iPhone 15 Pro (iOS 26.3, Safari, teclado en pantalla tecleado con toques), con la app compilada contra el respaldo local:

- `01-revisa-al-entrar.png`: «Editar evento» con la ✕; la miniatura del cartel, «Taller de grabado en el barrio», «Cambiar nombre» y «Cambiar cartel» alineados con el nombre; «jue 8 de oct · 17:00–19:00», «Casa de Cultura del Barrio de San Miguelito», «$80», cada uno con «Cambiar»; «Cambiar artistas, descripción o enlace»; «Guardar cambios».
- `02-cambiar-precio-con-teclado.png`: «¿Cuánto cuesta?» con «120» escrito, su ✕, y «Siguiente» sobre el teclado numérico: ni el campo ni el botón quedan tapados.
- `03-revisa-tras-cambiar.png`: de vuelta en «Revisa» con «Gratis».
- `04-salir-sin-guardar.png`: la ✕ con cambios: la hoja «¿Salir sin guardar?», «Se pierden los cambios que hiciste.», «Seguir editando» y «Salir sin guardar» en rojo.
- `05-revisa-horarios-por-dia.png`: «Festival de las Linternas» sin cartel: «Cambiar nombre» bajo el título, «Del 8 al 10 de oct · horarios por día», «Jardín de San Juan de Dios», «Gratis» y el renglón punteado «Cartel · Agregar».
- `06-horario-por-dia.png`: «¿A qué hora, cada día?» con la casilla desmarcada y los tres días; el del viernes, «de 6:00 p.m. a 9:00 p.m.», en tinta; «Del 8 al 10 de oct · 1 día con otro horario»; «Siguiente».
- `07-hoja-de-un-dia.png`: la hoja del sábado con «Empieza» 8:00 p.m. y «Termina» 9:00 p.m. marcados y «Listo».
- `08-guardado-vuelve-a-la-ficha.png`: tras cambiar el sábado y «Guardar cambios», la ficha del evento (el respaldo no guarda: enseña lo de antes) con «Por día» y «Horarios».
- `09-ficha-acciones.png`: el menú ··· de la ficha: Editar, Duplicar con otra fecha, Reportar, Borrar el evento.
- `10-cambiar-el-cartel.png`: el paso del cartel al editar: «Sube el cartel · Será la portada del evento» y «Quitar el cartel» (el respaldo no tiene servicio de lectura: sin casilla; con servicio sale desmarcada, lo prueban los componentes).

Del Chrome de la Mac a 320 (2×, la letra de la app), la misma app:

- `11-revisa-320-chrome.png`: «Revisa» con cartel: el nombre en tres renglones, «Cambiar nombre» y «Cambiar cartel» enteros, «jue 8 de oct ·» y «17:00–19:00» junto en el renglón de abajo.
- `12-cartel-320-chrome.png`: el paso del cartel a 320.
- `13-horario-por-dia-320-chrome.png`: los tres días a 320 (las horas del viernes parten antes de «p.m.»: viene de OL-311).
- `14-revisa-sin-cartel-320-chrome.png`: «Revisa» sin cartel a 320, sin desbordes.

## Qué probar en el iPhone

Con Safari, la web instalada y TestFlight, sobre un evento propio:

1. Ficha → ··· → Editar: entra en «Revisa» con todo; la ✕ sin cambios vuelve a la ficha sin preguntar.
2. Cambiar el nombre, el día y la hora, el lugar (uno del directorio y uno del mapa) y el precio: cada uno vuelve a «Revisa»; con el teclado abierto, el campo y «Siguiente» quedan a la vista.
3. La ✕ con cambios: «¿Salir sin guardar?».
4. Un evento de varios días: «Cambiar cuándo», desmarcar la casilla, cambiar un día, guardar; la ficha dice «Por día» con ese horario. Editarlo otra vez, marcar la casilla y guardar: la ficha ya no dice «Por día».
5. Cambiar el cartel (cámara o carrete), sin lectura y con lectura; quitarlo; ponerle uno a un evento sin cartel.
6. Guardar: vuelve a la ficha con lo nuevo.

## Para el gestor

- **Migración `20261006150000_editar_evento_sesiones.sql` (solo añade): aplicarla antes de unir.** Sin variables de entorno nuevas.
- Vista previa de Vercel: la de la rama `editar-evento-por-pasos` cuando el PR esté abierto.
- **Hallazgo fuera de la pieza:** el alta por pasos lee y guarda las horas de un sitio fuera del directorio en la zona de la ciudad inicial (`zonaSegura(lugar?.zona)`), mientras el servidor guarda en la del punto: un evento en otra zona horaria (España) se publicaría corrido. Editar ya usa la regla buena (`useZonaDelSitio`); llevarla al alta es una línea, pero cambia el alta y no es de este encargo.
- **Hallazgo:** en el horario por día, a 320, las horas de un día distinto (en negrita) parten antes de «p.m.» (OL-311).
