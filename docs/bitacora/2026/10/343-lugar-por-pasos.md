# 343 · Alta de lugar por pasos

**Pieza:** OL-315. **Rama:** `lugar-por-pasos` (sobre `origin/main` `d73312ca`). **Fecha:** 2026-10-06. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado con los componentes reales (Chrome), con la app compilada contra el respaldo local y en el simulador de iPhone (Safari, teclado en pantalla); falta el iPhone real y aplicar la migración (lista al final).

## Qué se encargó

Construir el alta de lugar del prototipo firmado `docs/rediseno/prototipos/lugar-artista-por-pasos.html` (casos 1 a 4; acta en la bitácora 342): `/nuevo/lugar` con el mismo armazón que el alta de evento, el horario del lugar en franjas (modelo nuevo, migración que solo añade), el tipo «Café, bar o restaurante», `esNegocio` sin veto, la tira Evento · Lugar · Artista al pie del primer paso y `FormularioLugar` solo para editar. El artista es OL-316 y no se tocó.

## Qué hay

- **Ruta `/nuevo/lugar`** (`src/app/nuevo/lugar/`: `page.tsx`, `AltaLugar.tsx`, `pasos.ts`, `PasosLugar.tsx`, `Revisa.tsx`, `Publicado.tsx`, su CSS). Pide sesión y vuelve a la misma dirección; acepta `?ciudad=`, `?nombre=` (lo que se buscó en Buscar) y `?lat=&lng=` (el dedo sostenido en el mapa de Lugares). El armazón es `PorPasos` (barra, avance, una pregunta por pantalla, pie anclado sobre el teclado, guardia «¿Salir sin publicar?», transiciones); el camino es un reductor puro (`pasos.ts`, con pruebas) como el del evento.
  1. **¿Cómo se llama?** Campo con lupa, ✕ y contador; con 3 letras, una lista flotante con los lugares del directorio que coinciden («Ya tiene ficha · Ir a su ficha», enlace a la ficha) y debajo las sugerencias del mapa (las direcciones dicen «Usar la dirección …», como el formulario de siempre). Tocar una sugerencia trae nombre, punto, dirección, ciudad y, si el mapa o el nombre lo dicen, el tipo (`deducirTipo`). Al pie, bajo «Siguiente» / «Falta el nombre», la tira EVENTO · LUGAR · ARTISTA con «Lugar» marcado (Evento → `/nuevo/evento`, Artista → `/nuevo?tipo=artista`, los dos con `?ciudad=` si la hay); solo en este paso, vuelve con Atrás.
  2. **Confirmar en el mapa, siempre.** Con sugerencia (o con el punto de entrada): «¿Es aquí?», el mapa con el pin arrastrable, la tarjeta con nombre y dirección, «Sí, es aquí» y «Buscar otro». Sin ella: «¿Dónde está?» con el campo «Dirección o referencia» (su lista del mapa, con ✕), «Estoy aquí» (hasta que hay un punto) y tocar el mapa o arrastrar el pin; «Listo» dice «Falta la ubicación» o «Ubicando…». Al mover el pin se pide la dirección del punto. Si un lugar del directorio cae a menos de 150 m: «¿Es este? A 40 m hay un lugar con ficha: … Ir a su ficha». Sin aviso de negocio.
  3. **¿Qué tipo de lugar es?** solo si nada lo dijo: los diez tipos (`ui/Opcion` nueva variante `compacta`, icono de etiqueta), elegir avanza a «Revisa». «Otro» pregunta además **¿Qué es?** (opcional, con ✕ y tope de 60; «Seguir sin decirlo»).
  4. **Revisa:** el nombre de título y renglones sin etiqueta (`Dato` de «Revisa» del evento, que ahora se exporta): dirección («Cambiar» abre «¿Dónde está?» con el pin donde quedó), tipo («Cambiar»), **Ciudad** solo si hubo que pedirla, **Horario** (opcional, punteado fino, «Agregar»; puesto, sus grupos con los días arriba y las horas debajo y «Cierra Lu») y **Foto, descripción o redes** (opcional; puesto, «Foto, descripción y 2 redes»). «Publicar lugar» o lo que falta. Si el servidor encuentra uno parecido a menos de 150 m, «¿Es este?» con sus fichas y «No, es otro: publicar de todos modos».
  5. **Publicado:** sello, «Lugar publicado», el lugar en el renglón de las listas (`RenglonLugar`), una sola sugerencia en punteado «¿Hay algo próximo en …? · Publicar un evento aquí» (→ `/nuevo/evento?lugar=<id>`), «Compartir» (el texto de la ficha, ahora `compartirLugar` en `lib/lugares.ts`; no en un lugar privado) y «Publicar otro».
- **Horario del lugar** (decisiones 2 a 4 del acta). `src/lib/horarioLugar.ts` (con 17 pruebas): `estructurar` ordena por día, une lo que se encima o se toca, agrupa los días con las mismas horas y dice qué días cierra; un cierre a la hora de abrir o antes es al día siguiente (un bar de 8 p.m. a 2 a.m.); `lineasHorario` da «Lu–Vi · 10:00 a.m.–2:00 p.m. y 4:00 p.m.–8:00 p.m.», «Sá · 4:00 p.m.–8:00 p.m.», «Cierra Do»; `horarioDesdeJson` es lo que acepta el servidor. La hoja `HojaHorario` (`src/app/lugares/Horario.tsx`) abre con Ma–Do de 10:00 a 18:00; días Lu–Do en chips; «Abre» y «Cierra» en chips con «Otra hora» (la hoja de horas de siempre; para cerrar, con «día siguiente»); «Agregar otro horario» trae los días libres; la franja anterior se encoge a un renglón con su ✕ y tocarlo la abre; «Listo» en el pie de la hoja (solo se desplaza el cuerpo). `TextoHorario` (sin JavaScript propio) lo pinta en «Revisa», en editar y en la ficha.
- **Migración `supabase/migrations/20261006130000_lugares_horarios.sql` (solo añade; la aplica el gestor antes de unir):** `cafe_bar` en `lugares_tipo_check` (reescrita con la lista vigente más el valor, como la de `plaza`); tabla `public.lugares_horarios` (id, `lugar_id` → lugares on delete cascade, `dias smallint[]` 1–7, `abre`, `cierra`, `creado_en`; checks de días y de abre ≠ cierra), RLS como `eventos_sesiones` (lee quien ve el lugar; escribe `gestiona_lugar`); `guardar_horario_lugar(p_lugar, p_franjas)` reemplaza el horario en una transacción y `crear_lugar_con_horario(p_datos, p_franjas)` da de alta lugar y horario juntos (el autor es quien llama). Prueba PG nueva `supabase/tests/pg/lugares-horarios.test.mjs`.
- **Acciones** (`src/app/lugares/acciones.ts`): `crearLugar` lee `horario` (con franjas, `crear_lugar_con_horario`; sin ellas, el insert de siempre) y `quedarse` (devuelve `{ id, slug, volver }` en vez de ir a la ficha); `actualizarLugar` reemplaza el horario solo si el formulario lo manda; `crearLugarDesdeEvento` acepta `categorias` (un café guardado desde el alta de evento queda como «Café, bar o restaurante»).
- **Negocios:** `esNegocio` desaparece; `deducirTipo` reconoce café, bar, restaurante (nombre o categoría del mapa) como `cafe_bar`, después de lo cultural y antes de la plaza. En el alta de evento, `puedeGuardarComoLugar` solo pide nombre: «Guardarlo como lugar» se ofrece a cualquier sitio con nombre.
- **Enlaces:** `enlaceDeAlta("lugar")`, `enlaceAltaDeTipo("lugar")` y el botón «Agregar un lugar» de la hoja de ciudades van a `/nuevo/lugar` (`enlaceAltaLugar`); `redireccionDeNuevo` y el proxy responden **308** de `/nuevo?tipo=lugar` a `/nuevo/lugar` con ciudad, nombre y punto (comprobado con `curl -sI` sobre `next start`: `308`, `location: /nuevo/lugar?ciudad=queretaro&nombre=Foro`); Entrar dice «Entra para registrar un lugar» y vuelve a Lugares.
- **`/nuevo` queda para el artista** (`Alta.tsx` y `page.tsx`): ya no monta `FormularioLugar`; su tira tiene Evento y Lugar como enlaces y Artista marcado. `TiraTipos` pierde el modo «botón» (ya nadie lo usaba) y gana `enPie`.
- **`FormularioLugar` solo edita** (como `FormularioEvento` tras OL-312), con el renglón **Horario** nuevo (la misma hoja; el horario solo viaja si se tocó). La página de editar carga el horario. Lo que era solo del alta (sugerencias del nombre, «Ya tiene ficha», «¿Es este?», `nombreInicial`, `puntoInicial`, `oculta`) salió de ahí porque ya vive en el alta por pasos.
- **Ficha del lugar:** en «Dónde», bajo la dirección, el horario estructurado con el reloj (consulta aparte, tolerante: si falla, la ficha sale sin horario).

## Lo que la gente ya tenía en el alta de siempre, y dónde sigue

| Salida del `FormularioLugar` de alta | En el alta por pasos |
| --- | --- |
| Nombre con ✕ y contador | «¿Cómo se llama?» |
| Sugerencias del mapa al escribir (y «Usar la dirección …») | Lista bajo el nombre |
| «Ya tiene ficha» / «Ya hay uno con este nombre · Ver» | Lista bajo el nombre («Ir a su ficha») |
| Tipo deducido del nombre o del mapa | Igual; si no, «¿Qué tipo de lugar es?» |
| Dónde: «Estoy aquí» | «¿Dónde está?» |
| Dónde: buscar la dirección y mover el pin (hoja «¿Dónde está?») | «¿Dónde está?» / «¿Es aquí?» (campo, mapa, pin) |
| Tipo con chips y «Otro · ¿Qué es?» | «¿Qué tipo…?» y «¿Qué es?» |
| Descripción (tope 600), redes, foto de portada | «Foto, descripción o redes» |
| Administración: dirección de una imagen y «Solo yo lo veo» | Mismo paso, solo para la administración |
| «¿Es este?» del servidor y «No, es otro: publicar de todos modos» | «Revisa» |
| `?nombre=` (Buscar) y `?lat=&lng=` (dedo sostenido en Lugares) | Arranque del alta (nombre puesto, «¿Es aquí?» con ese punto) |
| Ciudad del punto (mapa, o la de contexto a menos de 50 km) | Igual, y si no, renglón «Ciudad» en «Revisa» |
| Errores del servidor junto a su dato y el general | «Revisa» |
| Guardia «¿Salir sin publicar?» y aviso al recargar | `PorPasos` |
| Tira Evento · Lugar · Artista y la ✕ a Lugares | Pie del primer paso y barra |
| Tras publicar: la ficha con «Publicado · Compartir / Completar» | «Publicado» con «Compartir» y «Publicar un evento aquí»; la ficha sigue diciendo «Aún sin descripción… Completar» a quien la edita |

## Decisiones del operador (dentro de lo encargado, dichas explícitamente)

1. **La tira va dentro del pie del primer paso** (`TiraTipos enPie`), bajo «Siguiente», como en el prototipo. Suelta, el pie y la tira serían dos cosas pegadas abajo, una encima de otra; dentro del pie sube con él sobre el teclado (comprobado en el simulador, captura 02). Es un `div` y no un `footer` (no puede haber un `footer` dentro de otro).
2. **Formato de horas a.m./p.m.** (`etiquetaHora`, el de los chips), como dicen el prototipo y los ejemplos del encargo; `fechas.ts` usa 24 h para los eventos de varios días. Si se prefiere 24 h, es cambiar `textoRango` en `lib/horarioLugar.ts`.
3. **Cerrar al día siguiente se acepta** (Postel; ahora entran bares): un cierre a la hora de abrir o antes cuenta para el día en que abre. Abrir y cerrar a la misma hora no es un horario (la base lo rechaza). Los chips de «Cierra» solo ofrecen horas posteriores a la de abrir; el día siguiente se elige con «Otra hora». Si se cambia la hora de abrir y deja al cierre atrás, el cierre pasa a la primera hora de cerrar posterior (`conAbre`).
4. **Sin tope en la pantalla; 50 franjas como cordura** en el servidor y la base (nadie captura tantas; evita llenar la tabla con una petición).
5. **«Otro» pregunta «¿Qué es?» en su propia pantalla** (opcional, «Seguir sin decirlo»), como la subcategoría del artista en el acta: el formulario de siempre lo pedía y el prototipo no lo dibuja.
6. **«¿Es este?» en el mapa usa el lugar más cercano a menos de 150 m**, sin mirar el nombre, como dice el encargo (`lugarAlLado` ganó el radio como parámetro; el evento sigue con 50 m). El «¿Es este?» del servidor al publicar (nombre parecido + 150 m) sigue igual.
7. **«Estoy aquí» se va de «¿Dónde está?» en cuanto hay un punto** (el campo y el pin siguen): sin eso, el mapa, la tarjeta y «¿Es este?» no cabían a 390 y la tarjeta quedaba bajo el pie.
8. **«Cambiar» la dirección desde «Revisa» abre «¿Dónde está?»** con el pin donde quedó, no la sugerencia de antes (con «Buscar otro», que desde «Revisa» no tendría a dónde volver).
9. **La ciudad:** la del mapa; si no, la de contexto solo a menos de 50 km (`ciudadParaPunto`, la regla de OL-299; sin `?ciudad=`, la de contexto es San Luis Potosí, que solo cuenta si el punto está ahí); si tampoco, el renglón «Ciudad» pendiente con `HojaCiudad` (generalizada: cuenta lugares o artistas). Nunca en silencio.
10. **Alta atómica con horario:** con franjas, `crear_lugar_con_horario` (lugar y horario en una transacción); sin franjas, el insert de siempre, para que el camino del alta de evento (`crearLugarDesdeEvento`) no cambie. Editar: guarda el lugar y luego reemplaza el horario; si eso falla, lo dice en su renglón y volver a guardar lo repite.
11. **El horario no viaja al editar si no se tocó:** guardar la descripción no reescribe el horario (ni depende de la migración).
12. **Editar:** el nombre lleva un lápiz en vez de la lupa (ya no busca), y lo exclusivo del alta salió del formulario.
13. **Chips del horario de un toque a la vista** (la clase `grupo` del alta de evento, reutilizada) y los días de al menos 44 de ancho: con los de 36 del prototipo `npm run medir` marcaba toques de 40×36.
14. **«¿Es este?» del mapa usa la tarjeta de confirmación del evento con su palomita**, como el prototipo (`ic('ok')`).
15. **`ui/Opcion` gana `compacta`** (una línea, del alto de un toque) para los diez tipos; `ui/useAlto` sale de `HojaDonde` para que el pie del primer paso reserve su alto a la lista flotante; `SelectorEnlaces` gana `onCambio` (opcional) para llevar las redes de un paso a otro. Ninguno cambia lo que ya existía.
16. **El simulador de `visualViewport` de `npm run medir`** lee su alto al pedirlo: fijado al instalarse, `ui/Hoja` se colocaba fuera de la vista en el modo «area» (pantalla s19).
17. **La prueba de borrado excepcional de un lugar (OL-259)** lista ahora `lugares_horarios` entre las dependencias revisadas: es el horario del propio lugar (on delete cascade) y se va con él; no cambia el impacto que se confirma.

## Pruebas

- `npm run lint`: 0 errores (1 aviso que ya estaba, `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **154 archivos, 2300 pruebas, en verde**. Nuevas: `lib/horarioLugar.test.ts` (17: una franja, Lu–Vi + Sá–Do, cierre a comer, encimadas, día repetido, todos los días, ninguno, días no seguidos, medianoche, tres franjas, lo que acepta el servidor), `nuevo/lugar/pasos.test.ts` (12: casos 1, 2 y 4, «Otro», tipo a mano, «Buscar otro», punto de entrada, «Cambiar» desde «Revisa», lo que falta, avance), `lugares/acciones.horario.test.ts` (10: `quedarse`, alta con y sin horario, horario rechazado, editar con y sin horario, café desde el evento), página `/nuevo/lugar` y `/nuevo` (3 + 3), proxy 308, `deducirTipo` con café y bar, `usosDisponibles` sin veto, `lugarAlLado` con radio, enlaces del armazón y Entrar.
- `npm run test:db` (Postgres 17 local): **1632 comprobaciones, 0 fallos**, con la migración nueva y su prueba (alta con horario y autor real, días repetidos, medianoche, seis rechazos sin dejar lugar a medias, reemplazo por autora y administración, otra cuenta rechazada, escritura directa, anon sin funciones, lectura con el lugar oculto, cascada).
- Componentes (Playwright, Chrome de la Mac): **`AltaLugar.componentes.test.mjs` nuevo, 16 pruebas**: primer paso con la tira en el pie y la ciudad en los enlaces; caso 1 completo hasta «Publicado» con lo que recibe la acción y «Compartir»; «Ya tiene ficha»; caso 2 con «Estoy aquí», «¿Es este?» a 33 m y los diez tipos; caso 4 (café, sin aviso); «Otro · ¿Qué es?»; horario a 390 y a 320 (tres franjas, días libres en la nueva, franjas encogidas con ✕, «Listo» dentro de la ventana, sin desborde, el JSON que viaja); reabrir y quitar franjas, cerrar sin «Listo»; ciudad pedida lejos y tomada del contexto cerca; foto, descripción y red; lo de la administración; error general con la guardia de vuelta y parecidos con «No, es otro»; punto de entrada; guardia. Además: `FormularioLugar.editar` 8 (2 nuevas de horario), `TiraTipos` 4 (2 nuevas), `AltaEvento` 83 (la del bar ahora ofrece «Guardarlo como lugar»), `Ciudad`, `Mapa`, `HojaDonde`, `PorPasos`: en verde. Se retira `FormularioLugar.ciudad.componentes.test.mjs` (probaba el alta del formulario viejo; sus tres casos de ciudad están en `AltaLugar`).
- `npm run inventario`: sin novedades (334 medidas en duro, 2 bloques duplicados).
- `npm run medir`: ver el resultado completo al final de la entrega. `s07-alta-lugar` es ahora `/nuevo/lugar` (18/18/52/52 nodos, profundidad 6; antes 38 y 9); nuevas `s18-alta-lugar-revisa` (32/32/66/66, 6) y `s19-alta-lugar-horario` (la hoja con dos franjas: 91/91/125/125, 8). Teclado de s07 en los dos modos: el campo y «Falta el nombre» enteros sobre el teclado. Se quitan las excepciones de teclado «botón «Lugar»» y «botón «Artista»» de `/nuevo`: allí ya no son botones (sin uso en la corrida).

## Capturas (`docs/rediseno/capturas-343/`)

Del simulador iPhone 15 Pro (iOS 26.3, Safari, 393×852 a 3×, teclado en pantalla), con la app compilada contra el respaldo local (sesión inventada, sin Mapbox: el mapa dice «No se pudo cargar el mapa» y las búsquedas del mapa fallan):

- `01-primer-paso-con-tira.png`: «Registrar un lugar» con la ✕, «¿Cómo se llama?», el campo vacío con su lupa; abajo el pie con «Falta el nombre» (apagado) y debajo, en el mismo pie, EVENTO · LUGAR · ARTISTA con LUGAR marcado y su punto.
- `02-nombre-con-teclado.png`: con «Casa» escrito y el teclado abierto: el campo (con su ✕) queda a la vista, «Siguiente» y la tira suben juntos sobre la barra del teclado; la lista «Ya tiene ficha» (Casa de Cultura del Barrio de San Miguelito, Casa del Poeta…) se abre hacia arriba porque abajo no cabe.
- `03-ya-tiene-ficha.png`: sin teclado, la lista bajo el campo: dos lugares en morado con «Ya tiene ficha · Ir a su ficha» y «No pude buscar en el mapa. Sigue y búscalo ahí.» (sin Mapbox).
- `04-donde-esta.png`: «¿Dónde está?» con Atrás y el avance en un cuarto: el campo «Dirección o referencia», «Estoy aquí», el mapa (vacío) y «Falta la ubicación» apagado.
- `05-mapa-estoy-aqui.png`: tras «Estoy aquí» (ubicación simulada): «Estoy aquí» se fue, la tarjeta con la palomita dice «Casa · Pin en el mapa» (sin Mapbox no hay dirección), «Si el pin no está en su sitio, arrástralo.» y «Listo» encendido.
- `06-tipo.png`: «¿Qué tipo de lugar es?» con los diez tipos con el icono de etiqueta y su chevron, entre ellos «Café, bar o restaurante» antes de «Plaza, jardín o parque»; el texto centrado con el icono.
- `07-revisa-horario-dos-franjas.png`: «Revisa» con «Casa» de título; «Pin en el mapa · Cambiar», «Galería · Cambiar», el horario «Ma–Vi / 10:00 a.m.–6:00 p.m.», «Sá, Do / 11:00 a.m.–2:00 p.m.», «Cierra Lu» con «Cambiar», y «Foto, descripción o redes · Agregar» punteado; «Publicar lugar».
- `08-hoja-horario-dos-franjas-390.png`: la hoja «¿Qué días abre?» con la franja Ma–Vi encogida (reloj, días, horas y ✕) y la nueva abierta con Sá y Do marcados, 11:00 a.m. y 2:00 p.m.; «Listo» en el pie de la hoja, a la vista.
- `11-publicado.png`: el sello verde, «Lugar publicado», «Ya está en el directorio. Así lo ve la gente:», el renglón de «Casa · Galería · Sin dirección» con el símbolo SN, la sugerencia punteada «¿Hay algo próximo en Casa? · Publicar un evento aquí», «Compartir» y «Publicar otro».

Del Chrome de la Mac (headless, 2×, con la letra de la app), con la misma app compilada:

- `09-hoja-horario-dos-franjas-320-chrome.png` y `-390-chrome.png`: la misma hoja a 320 y 390; a 320 los días van en dos renglones, los chips miden un toque, «Agregar otro horario» asoma y «Listo» queda abajo, a la vista; sin desplazamiento a lo ancho.
- `10-revisa-horario-320-chrome.png` y `-390-chrome.png`: «Revisa» con el horario de dos grupos y «Cierra Lu»; a 320 «Foto, descripción o redes» va en dos renglones sin empujar «Agregar».

## Qué probar en el iPhone

Con Safari, la web instalada y TestFlight, con Mapbox de verdad:

1. Lugares → «+»: «¿Cómo se llama?» con la tira abajo; al escribir, el teclado no tapa el campo ni «Siguiente» ni la tira.
2. Escribir un lugar que el mapa conoce y tocarlo: «¿Es aquí?» con el mapa, el pin arrastrable y la dirección; arrastrar el pin cambia la dirección.
3. Un nombre que el mapa no conoce: «¿Dónde está?», buscar una dirección en el campo (con el teclado abierto, su lista no tapa nada), «Estoy aquí», tocar el mapa.
4. Cerca de un lugar ya registrado: «¿Es este?» con su enlace.
5. «Revisa» → «Horario»: dos o tres franjas, «Otra hora» para cerrar a la 1 a.m.; «Listo» siempre a la vista.
6. «Foto, descripción o redes»: subir una foto con la cámara o el carrete.
7. Publicar, «Compartir», «Publicar un evento aquí» (abre el evento con el lugar puesto).
8. Editar ese lugar: el renglón «Horario» con la misma hoja; la ficha lo enseña en «Dónde».
9. Desde Buscar sin resultados («Registrar …» con el nombre) y sosteniendo el dedo en el mapa de Lugares: el alta abre con el nombre o con «¿Es aquí?» en ese punto.

## Para el gestor

- **Aplicar `20261006130000_lugares_horarios.sql` antes de unir** (el alta con horario, editar el horario y el tipo «Café, bar o restaurante» la necesitan; la ficha sin ella sale sin horario, no se rompe).
- El alta de evento cambia en una cosa: «Guardarlo como lugar» se ofrece también a un café o un bar, y se guarda con su tipo.
- `docs/DEFINICION.md` y `CLAUDE.md` (los negocios entran) los actualiza la rama del acta (OL-314); esta rama no los toca.
- Hallazgo fuera de la pieza: el editor de texto largo (`ui/CampoLargo`, la descripción) no tiene ✕ para limpiar, en ninguna de las tres altas; cambiarlo cambia también el evento y el artista.
