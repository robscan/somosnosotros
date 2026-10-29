# 520 · La semana de Instagram solo publica con material, señala lo que falta y deja publicar hoy (OL-488)

**Pieza:** OL-488. **Rama:** `instagram-material`, base `origin/main` (`a7c2483e`) más `semana-miercoles` (OL-487, PR #610, `c69f858b`). **Fecha:**
2026-10-29. **Operador:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado, sin otros agentes).
**Manda:** el founder, el 29 de octubre, al usar la pestaña «Semana»: (1) «En la semana en curso, para los días de hoy y los anteriores, dice sin
publicación. Debería haber alguna publicación opcional para que la pueda detonar manualmente»; (2) «En el caso de León Marinero, no trae portada y eso
no se debería de permitir. O le conseguimos una portada o no mostramos esa publicación. Primero confirmar que tenemos material visual; si no,
conseguirlo; si no, cambiar la publicación. Lo que vamos a promocionar es lo que está registrado… es una manera de promover que los artistas entren
y completen sus perfiles para que sean publicados. Lo mismo con los lugares». Lo acordado con el gestor: requisito duro de material, renglón «Falta
material» con «Pedírselo» y «Subir yo», y los días de esta semana con «Publicar ahora».
**Estado:** hecho, con **una migración** (`20261029240000_instagram_material.sql`) y **sin variables nuevas**. Espera revisión del gestor y el
«publica» del founder (aplicar la migración antes de desplegar; va después de `20261029230000_semana_miercoles.sql`). No toqué producción, `.env`
ni `main`. El añadido del founder de las 16:20 («Publicando» más visible) va en su propio commit y en la sección 9.

Términos (una línea cada uno):
- **Material:** la foto y la portada de un artista, la portada de un lugar o el cartel de un evento, **guardadas en el Storage de la app** (lo único
  que la tarjeta de Instagram puede bajar y dibujar).
- **Sugerencia:** lo que la regla de la semana pondría ese día (artista, lugar, evento o «Esta semana»), calculado con la misma función que arma la
  semana.
- **Quien lleva la ficha:** las cuentas ligadas («Soy yo / es mi grupo», «¿Es tu espacio?») y quien la creó, si no es de la administración.

## 1. Por qué «León Marinero no traía portada»

`instagram_candidatos` (OL-479) ya pedía foto **y** portada al artista. Lo que pasaba: la tarjeta solo puede bajar imágenes del Storage propio
(`cartelDescargable`, `src/lib/cartelDescarga.ts`); una portada pegada de otra página (la administración puede hacerlo, OL-262) contaba como «tiene
portada», pero al dibujar no se podía bajar y la tarjeta salía con la imagen de relleno del símbolo SN. No pude ver la ficha de León Marinero en
producción (no la toco): si su portada no está en el Storage de la app, es este caso; si no la tenía, ya no habría entrado. Ahora material es lo que la
app sí puede usar, en la base (`instagram_material_propio`, que usa la gramática de `imagen_origen_permitido`: solo el bucket `fotos` del proyecto) y
en la app (`cartelDescargable`), y «Falta material» dice aparte «Su portada es de otra página: hay que subirla a la app».

## 2. Qué hace

- **Requisito duro de material.** Artista: foto y portada propias; lugar: portada propia; evento: cartel propio. Lo que no cumple no entra a la
  semana (ni la pestaña ni el latido del miércoles), ni a la sugerencia de un día, ni a «Cambiar» (eventos sin cartel fuera de su lista; la base
  rechaza una ficha sin material en `instagram_semana_cambiar`), ni al carrusel «Esta semana». Un día de evento que solo tiene eventos sin cartel
  descansa y lo dice: «Ningún evento de ese día tiene cartel.» (antes de «No hay eventos ese día.»). Y el trabajador de la cola no publica una ficha
  sin material aunque algo se colara: el día queda «No se publicó» con «Le falta su foto o su portada en la app: no se publicó con la imagen de
  relleno. Súbela o pídesela en «Falta material».» (`conMaterial` en `trabajar.ts`, `fichaConMaterial` en `ficha.ts`).
- **Los días que ya pasaron** sin publicación van en **una línea gris**, sin miniatura ni hoja: «Mié 7 · antes de armar la semana» (si no se armó),
  «· nadie con material», «· quitado» o «· no se programó». Lo publicado y lo que falló se quedan como estaban (lo que falló dice por qué y deja
  «Publicar ahora» desde su hoja).
- **De hoy en adelante**, un día sin publicación (no se armó porque su hora ya había pasado, o descansaba porque nadie tenía material) trae la
  **sugerencia de la regla**: su miniatura, su nombre, «Hoy · 9:00 am · Esta semana» y «Sin programar: publícalo ahora» (o «prográmalo»), en violeta.
  Al tocarlo, la hoja de la sugerencia (`HojaSugerencia`): la imagen, por qué, y **«Publicar ahora»** (solo hoy: encola ya en `redes_trabajos` y pide
  el primer intento) o **«Programar»** (si su hora no ha pasado: sale sola a su hora). Si nadie lo toca, ese día no sale nada. El domingo sigue
  descansando.
- **Nadie con material:** el renglón dice **«Nadie con material para hoy»** (o «para el mié 14»), con lo que pedía la regla («Mié 14 · 7:00 pm ·
  Lugar») y «Falta material: ve quién se quedó fuera», que abre «Falta material». Un día de evento sin carteles dice por qué («Ningún evento de ese
  día tiene cartel.»).
- **«Falta material»**, al final de la semana (y de «La que viene»): «6 artistas y 2 lugares con fecha se quedaron fuera por falta de foto o portada»
  · «Pedírselo o subirla tú». La hoja (`HojaMaterial`), en tres vistas sin apilar historial:
  - la lista: nombre, qué falta («Falta la portada», «Falta la foto y la portada», «Su portada es de otra página: hay que subirla a la app»), su
    próxima fecha («Próxima fecha: dom 11 · Íñigo Montalvo: guitarra sola») y quién la lleva («La lleva Marcos» / «Nadie lleva la ficha»);
  - la ficha: **«Pedírselo»** (si alguien la lleva) y **«Subir yo»**; si nadie la lleva, solo «Subir yo»;
  - «Subir yo»: solo los huecos que faltan (la foto redonda y la portada 3:2), con la espera de subida de toda la app (OL-353) y la reducción en el
    teléfono (OL-352); el botón dice lo que falta («Falta la portada») hasta que se sube, y luego «Guardar». Al guardar vuelve a la lista sin esa
    ficha («Museo Leonora Carrington ya tiene su material: entra a la semana.») y la semana la toma.
- **«Pedírselo»:** a cada cuenta que lleva la ficha le llega, **una sola vez por ficha y semana**, el aviso **dentro de la app** (Novedades, con el
  icono de la cámara: «Completa tu portada y te presentamos en Instagram» · el nombre de la ficha · «Toca para completar tu ficha») y **al teléfono**
  (título: el nombre de la ficha; debajo, la razón, como los avisos de OL-480). Los dos abren **la edición de su ficha**. El aviso de Novedades se va
  solo en cuanto la ficha ya tiene lo que le faltaba. Lenguaje llano e incluyente: «te presentamos», no «serás publicado».
- **La portada de Administración:** la línea de la semana suma «· 7 sin material» cuando hay fichas con fecha que se quedan fuera (sin tocar
  `src/app/admin/page.tsx`: lo dice `resumenDeLaPortada`).

## 3. La migración (`20261029240000_instagram_material.sql`)

- **Lo que se reemplaza (misma firma, `create or replace` conserva los permisos; ninguna fila cambia):** `instagram_candidatos` (con material
  propio) e `instagram_semana_cambiar` (rechaza una ficha o un evento sin material, `22023`).
- **Solo añade:** `instagram_material_propio(url)` (interna); `instagram_quien_lleva(tipo, ficha)` (interna); `instagram_falta_material(ciudad,
  lunes)` (solo responde a la administración; próxima fecha desde ahora y en los 30 días desde ese lunes); la tabla `instagram_material_pedidos`
  (una fila por persona, `on delete cascade` con su perfil y con la ficha; RLS: cada quien lee lo suyo y la administración todo; nadie escribe a mano);
  `instagram_pedir_material(tipo, ficha, lunes)` (una vez por ficha y semana, `23505`; si nadie la lleva, `P0002`; devuelve a quién avisar) e
  `instagram_semana_programar(ciudad, día, ahora)` (de hoy en adelante, no domingo, «ahora» solo hoy, sin «ahora» solo si su hora no pasó; comprueba
  el material de nuevo; toma un día que descansaba o quedó sin trabajo, nunca uno que ya sale, salió o se quitó). Todas con `search_path = ''`.
- Pruebas que ajusté por la regla nueva: en `instagram-semana.test.mjs` y `semana-miercoles.test.mjs` las fotos de prueba pasan a ser del Storage del
  proyecto (con `https://x.test/…` ya no serían material); `security-advisor.test.mjs` suma las tres funciones nuevas que llama la administración;
  `borrado-excepcional-admin.test.mjs` suma `instagram_material_pedidos` a lo que cuelga de un lugar (no cambia el impacto que se confirma).

## 4. Comprobado

- `npm run lint`: 0 errores (los 2 avisos de siempre son de archivos ajenos). `npm run typecheck`: limpio.
- `npm test`: **5 073 de 5 073** (314 archivos). Nuevas: 3 en `src/lib/instagram/semana.test.ts` (eventos sin cartel o con uno ajeno fuera del día y
  del carrusel; la sugerencia de hoy aunque su hora pasó, nada en domingo ni fuera de la semana, lo ya usado no se repite; los textos de los renglones
  nuevos) y 1 en `src/lib/redes/trabajar.test.ts` (sin material no se publica; con él, sí).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **126 migraciones, 2 981 pruebas, 0 fallaron**. Banco nuevo
  `supabase/tests/pg/instagram-material.test.mjs`: **un artista con fecha y sin portada no sale; con portada y foto, sí**; la portada de otra página
  tampoco; «Falta material» con qué falta, su próxima fecha y quién la lleva (la cuenta ligada y la autora; lo que dio de alta la administración no
  cuenta); «Pedírselo» una vez por semana, `P0002` sin nadie, `22023` si ya tiene material, cada quien lee lo suyo y nadie más; con su portada entra
  y deja de faltar; «Cambiar» sin material, no; «Programar»: domingo, día pasado, «ahora» de otro día, sin material (lugar, artista, evento y
  carrusel), cuenta cualquiera y día ya ocupado, no; programado a su hora a nombre de quien lo programó; el día que descansaba se toma; «Publicar
  ahora» hoy sale ya; definer, `search_path`, permisos y RLS. **Control negativo:** sin la migración el banco se cae (la lista de lo que cuelga de un
  lugar y `instagram_material_propio` no existe).
- `npm run test:componentes`: **788 de 788** (4 nuevas en `HojaMaterial.componentes.test.mjs`, toques reales con `elementFromPoint`: la lista;
  «Pedírselo» pide con su lunes y no se vuelve a ofrecer; sin nadie, solo «Subir yo»; «Guardar» dice lo que falta hasta subir cada hueco y al
  guardar vuelve a la lista sin esa ficha).
- `npm run inventario`: sin novedades. `npm run medir` (62 pantallas × 4 anchos): todo igual salvo las de Instagram, con el presupuesto anotado
  (`--aceptar`): **s48** (la semana) 81 → **78** nodos a 390 (la línea gris pesa menos que un renglón) y **s49** 91 → **142**: en los datos de
  `medir` (miércoles, día de lugar, sin lugares con material) el renglón de hoy ahora dice «Nadie con material para hoy» y abre «Falta material», una
  lista más larga que la hoja del descanso de antes. Un hallazgo de paso que corregí: dentro de la hoja, `ui/Grupo` ponía el aire de la pantalla a
  los lados y a 1280 se salía 120 px de su caja; la lista de «Falta material» va suelta.
- `npm run build` en verde (lo compilan `medir` y el recorrido).
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-instagram-material.mjs . docs/rediseno/capturas-520`: la app compilada contra el
  respaldo con `RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1 RESPALDO_IG_MATERIAL=1`, el reloj fijo el **jueves 8 de octubre a las 10:30 de San
  Luis**, el trabajador de verdad y la API de Instagram de mentira; Chrome real a 2×, toques por coordenadas): **30 de 30, sin errores de página ni de
  consola** (`capturas-520/recorrido.txt`, con lo que había bajo el dedo en cada toque; 33 con las del añadido de la sección 9): el miércoles gris;
  hoy con la sugerencia y solo «Publicar ahora» (su hora pasó); el trabajo en la cola ya y el renglón «Publicando…» (y luego, solo, «Publicado»); «Falta material» con Íñigo (lo lleva Marcos), el
  Ferrocarril (portada de otra página) y quien nadie lleva (solo «Subir yo»); «Pedírselo» deja el pedido para Marcos y ya no se ofrece; la que viene
  con «Nadie con material para el mié 14»; «Subir yo» la portada del museo (subida de verdad al Storage del respaldo) y vuelve sin él; el mié 14 pasa
  a sugerir al museo, «Programar» lo deja en la cola a las 7:00 pm y el renglón dice «Programado»; la portada de Administración con «· 7 sin
  material»; Marcos ve su aviso en Novedades y abre `/artistas/inigo-montalvo-demo/editar`; a 320 y 390 sin textos cortados, sin toques menores de 44
  y sin desplazamiento a lo ancho.
- El respaldo suma lo de esta pieza en corto (`instagram_falta_material`, `instagram_pedir_material`, `instagram_semana_programar`, el material en
  `instagram_candidatos` y en «Cambiar», el PATCH de la foto y la portada de una ficha y la marca `RESPALDO_IG_MATERIAL`). Sus carteles del historial
  son URLs del Storage de producción, que la app local no puede bajar: por eso, en el respaldo, varios días de evento de la que viene dicen «Ningún
  evento de ese día tiene cartel.» (en producción esos carteles sí son material).

## 5. Capturas (`docs/rediseno/capturas-520/`, 390 × 844 salvo donde se dice; cada una abierta)

- `01-semana-esta`: «Del 5 al 11 de octubre»: Renata (lun 5, Publicado), Los Ecos (mar 6, Publicado), **«Mié 7 · antes de armar la semana»** en gris,
  **«El domingo 11 · Hoy · 9:00 am · Esta semana · carrusel de 3 · Sin programar: publícalo ahora»** en violeta y Valeria Quiroz (vie 9).
- `01b-semana-esta-abajo`: el sábado (Concierto en el andén), el domingo que descansa y al final **«Falta material · 6 artistas y 2 lugares con
  fecha se quedaron fuera por falta de foto o portada · Pedírselo o subirla tú»**.
- `02-sugerencia-hoy`: la hoja: el cartel, «El domingo 11», por qué («Carrusel de 3 imágenes…»), «Su hora (hoy a las 9:00 am) ya pasó: con «Publicar
  ahora» sale ya en @smsnstrsapp. Si no lo tocas, ese día no sale nada.» y «Publicar ahora» anclado.
- `03-publicando-hoy`: tras «Publicar ahora», el renglón de hoy con la portada del carrusel y **«Publicando…» con su cargador** (el anillo violeta
  del añadido, sección 9).
- `03b-publicado-solo`: el mismo renglón, **sin recargar la página**: «Publicado · 0 visitas · 0 van · Ver», ya sin cargador.
- `03c-eventos-publicando`: la pestaña «Eventos», tras «Publicar» en «LXS COLOCAOS: La última fogueada»: su renglón con **«Publicando…» y el
  cargador**.
- `03d-eventos-publicado-solo`: sin recargar, el evento ya en «Ya en Instagram» con «Publicación · Hoy, 10:30 am» y «Facebook: publicado».
- `04-falta-material`: la lista: 0Backside0, Abril Merlot (foto y portada), el Museo del Ferrocarril («Su portada es de otra página: hay que subirla a
  la app»), el museo Leonora Carrington («La lleva Ana») y Pimpolina, cada una con su próxima fecha.
- `05-ficha-inigo`, `06-pedido`: Íñigo: «Falta la portada.», «Próxima fecha: dom 11 · Íñigo Montalvo: guitarra sola.», «La lleva Marcos…» con
  «Subir yo» y «Pedírselo»; después, «Se lo pedimos hoy: le mandamos a Marcos el aviso en la app y en su teléfono.» y solo «Subir yo».
- `07-viene-nadie`: la que viene: «**Nadie con material para el mié 14** · Mié 14 · 7:00 pm · Lugar · Falta material: ve quién se quedó fuera».
- `08-subir-yo`, `09-portada-subida`, `10-guardado`: el museo: el hueco de la portada y «Elegir la portada»; la portada subida con «Cambiar la
  portada», «Volver» y «Guardar»; de vuelta en la lista, «Museo Leonora Carrington (demo) ya tiene su material: entra a la semana.» y él ya no está.
- `11-viene-museo`, `12-sugerencia-programar`, `13-viene-programado`: el mié 14 sugiere al museo («Sin programar: prográmalo»), su hoja con
  «Programar» («sale sola el mié 14 a las 7:00 pm»), y el renglón ya con su tarjeta, «Programado» y «Falta avisarle».
- `14-portada-admin`: «@smsnstrsapp · 6 publicadas esta semana · 3 en Facebook · 13 por publicar · Semana: 5 de 5 programadas · la que viene, armada
  el jue 8 · **7 sin material**».
- `15-novedades-marcos`: Novedades de Marcos, «Hoy»: el icono de la cámara, «Completa tu portada y te presentamos en Instagram», «Íñigo Montalvo
  (demo)», «Toca para completar tu ficha».
- `16-semana-320`, `17-falta-320`, `18-ficha-320`: a 320, la semana (las líneas parten sin cortarse), la lista de «Falta material» y la ficha de
  Íñigo ya pedida.

## 6. Decisiones del operador (para el gestor)

1. **Material = Storage propio**, no solo «tiene algo escrito» (sección 1). Si hoy hay fichas reales con portada de otra página, salen en «Falta
   material» como «de otra página».
2. **«Subir yo» se hace en una hoja dentro de Administración › Instagram** (solo los huecos que faltan y «Guardar»), en vez de mandar al formulario
   completo de editar la ficha: es una sola cosa a la vez y «vuelve» solo. La edición completa sigue en la ficha.
3. **Quien lleva la ficha** = cuentas ligadas y su autor si no es de la administración (la administración da de alta fichas de otros, como el CAPO).
4. **Una vez por ficha y semana** (el lunes de la semana que se está viendo), una fila por persona en `instagram_material_pedidos`.
5. **«Próxima fecha» desde ahora:** lo de esta semana que ya pasó no cuenta como fecha.
6. **Los días pasados que fallaron** se quedan como renglón normal (dicen por qué y su hoja deja «Publicar ahora»); en gris solo lo que no tuvo nada.
7. **Una sugerencia no se guarda** hasta «Programar» o «Publicar ahora»: si nadie la toca, el día queda sin publicación, como pidió el founder
   («opcional»).
8. Sin aviso al teléfono a la administración cuando alguien completa su ficha (la ficha entra sola a la semana siguiente o a la sugerencia del día).

## 7. Qué quedó fuera

- Que la sugerencia de un día se pueda **cambiar** antes de programarla (hoy se programa la de la regla y luego se cambia desde su día, como cualquier
  otro).
- Pedir la descripción o el Instagram que falte (la lista lo dice: «También le falta la descripción para entrar»), solo foto y portada.

## 8. Preguntas al founder (frases llanas)

1. ¿León Marinero tenía una portada pegada de otra página (por ejemplo, de su Instagram)? Si sí, ya sale en «Falta material» como «de otra página».
   ¿Te late que la regla sea «la imagen tiene que estar guardada en la app»?
2. «Subir yo» se hace en una hoja ahí mismo, solo con la foto o la portada que faltan. ¿Te sirve así, o prefieres que abra la edición completa de la
   ficha?
3. «Pedírselo» le llega a quien lleva la ficha una vez por semana. ¿Una vez por semana está bien, o solo una vez y ya?
4. Si un día de esta semana no tiene publicación y no la tocas, ese día no sale nada. ¿Así, o quieres que lo de hoy salga solo al rato?

## 9. Añadido del founder (16:20): «Publicando» más visible (commit aparte)

**Manda:** «Pon el estado "Publicando" para las publicaciones de Instagram más visible en el admin y si se puede agrega un cargador». Lo que pasó: al
publicar desde Administración › Instagram, «Publicando» se veía poco y se quedó así aunque la cola ya había terminado (el trabajo `aa1a2c09` falló al
primer intento, la cola lo repitió al minuto y publicó; la pantalla no se refrescó).

- **El cargador** (`ui/Girando`): un anillo que gira, del violeta de lo que pide atención, con su texto en negritas; una vuelta por segundo (con
  «reducir movimiento», despacio). Va en el renglón del evento de la lista («Publicando…», «Facebook: publicando…»), en la hoja del evento
  («Instagram: publicando…»), en el renglón del día de la semana y en la hoja del día. **«Reintentando…»** cuando la cola va en otro intento (un
  fallo pasajero anotado, `fallos ≥ 1`, o más de un intento): `leerEstadoTrabajo` lo lee de `intentos` y `fallos`, que ahora se piden en todas las
  lecturas de la cola de esas pantallas.
- **La pantalla se entera sola:** mientras algo va en camino, la lista de eventos y la semana preguntan **cada 5 s** por esos trabajos
  (`estadosTrabajos`, una consulta chica: estado e intento de unos cuantos ids) y, en cuanto uno termina o pasa a otro intento, se vuelven a pedir
  (`router.refresh()`): «Publicado» con su enlace o el error con su frase, sin recargar (`useAlDia`). Las hojas (del evento y del día) preguntan
  también cada 5 s (antes, 20 s: `REFRESCO_MS`). Además, al volver a la app: `visibilitychange` y `pageshow` cuando la página vuelve de la memoria
  del navegador (en el iPhone, una app instalada que vuelve del fondo no siempre avisa con el primero). Sin nada en camino no se pregunta nada. No
  hay canal en tiempo real para la cola de OL-465 (la cola vive en la base y la mira el latido), así que es preguntar.
- **Por qué se quedaba:** no lo pude reproducir con la cola de prueba (allí el refresco cada 20 s sí llegaba). Lo más probable es que la pantalla
  estuviera en el fondo o en una app instalada que volvió sin avisar (`visibilitychange` no saltó) y que el siguiente refresco tardara hasta 20 s;
  con la pregunta cada 5 s, el `pageshow` y el refresco al cambiar el intento, eso queda cubierto. Si se vuelve a ver, el gestor puede mirar en
  `redes_trabajos` el `actualizado_en` de ese trabajo contra la hora en que se tomó la captura.
- **Comprobado:** `npm test` **5 075 de 5 075** (2 nuevas en `reglas.test.ts`: «Reintentando…» y la cola por evento con sus trabajos vivos; la de
  `leerEstadoTrabajo` suma `reintentando`); `npm run test:componentes` **789 de 789** (en `EspejoFacebook.componentes.test.mjs`, con el reloj de
  Playwright y toques reales: la hoja pregunta a los 5 s y no antes; el renglón «Publicando…» lleva su cargador, a los 5 s pregunta y, sin cambio,
  no refresca; al terminar, se refresca una vez y el cargador se va; sin nada en camino no pregunta más; y una nueva: el trabajo pasa a otro intento
  → «Reintentando…» con su cargador → publicado). En el recorrido (`capturas-520`, ahora **33 de 33**): el renglón de hoy con «Publicando…» y el
  cargador pasa solo a «Publicado» **sin ninguna carga de página**, y lo mismo un evento de la lista que pasa solo a «Ya en Instagram» (`03`,
  `03b`, `03c`, `03d`). `npm run medir -- --solo=admin-instagram`: sin novedades (el cargador solo sale mientras se publica). `lint`, `typecheck` e
  `inventario`, limpios.
