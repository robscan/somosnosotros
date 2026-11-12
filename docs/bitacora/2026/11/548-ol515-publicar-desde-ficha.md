# 548 · OL-515 · «Publicar en Instagram» desde la ficha de un lugar o de un artista

**Fecha:** 2026-11-12. **Rama:** `publicar-desde-ficha` (desde `origin/main` `fb317db2`). **Quién:** operador del Gestor de cambios IX, rehaciendo la primera versión que escribió un chat en la nube en la rama `claude/republish-rinoceronte-theater-xfhjza` (commits `13c75362` OL-514 y `4a9e894e` OL-515; traída por archivos, nunca con merge). **Migración:** `supabase/migrations/20261112100000_redes_encolar_ficha.sql` (solo añade, idempotente; **la aplica el gestor antes de unir**: el código nuevo la necesita).

## Qué pidió el founder

En el chat de la nube: «Y agrega otra pieza que permita publicar desde la ficha del lugar y el artista. Así como ya pasa con el evento.» Hoy, al gestor, tras su revisión: «sí a 2, 3 y 4»; el 2 era «OL-515: no publicarla así. La rehago como pieza chica reutilizando la hoja del evento (texto editable, quitar etiqueta, apagar Facebook), con la función en la base, pruebas y capturas reales, y sin el rótulo «de la semana» cuando es a mano», y el 3, «OL-514: dejarla fuera».

## Qué cambió

1. **El renglón «Publicar en Instagram»** en el «···» de la ficha de un artista y de un lugar (también en la ficha que se abre dentro de la hoja de Lugares): solo la administración, solo si la ficha se ve y no dijo que no (si dijo que no, sigue «Fuera de Instagram»). Dice cómo va: «En @smsnstrsapp», «Salió en Instagram hace 9 días» o «Publicando…».
2. **La hoja no es una pantalla nueva:** es la vista previa y los mandos de la hoja de un día de la semana, sacados a una pieza compartida (`src/components/instagram/MandosPublicacion.tsx`) que ahora usan las dos hojas: a quién se etiqueta (chip con su ✕ y «Volver a etiquetar»), la ubicación, el texto (`ui/CampoLargo`, con su contador) y «También en Facebook»; y los chips «Publicación 4:5 / Historia 9:16» (`ChipsFormato`). `HojaDia` usa la pieza sin cambiar lo que enseña (sus 11 pruebas siguen en verde). El texto que arma el sistema sale de una sola función (`textoDeDestacado`, en `lib/instagram/destacado.ts`), la misma del trabajador (`textoDeFicha`) y de las dos hojas.
3. **Lo que va en el pedido**, como el de la semana: `{ tipo, facebook, texto?, quitadas? }` (el trabajador ya lo respeta con `propioDe` y `quitadasDe`). Botón «Publicar ahora»; si ya salió antes, «Publicar otra vez», que pide confirmar («Sí, publicar otra vez» / «Mejor no»: la anterior sigue en Instagram y se borra desde la cuenta). Lo decidido antes de confirmar (la etiqueta quitada, el texto) se mantiene. Si la semana ya la tiene programada, lo avisa; si ya va en camino, lo dice y no hay botón ni mandos.
4. **Sin el rótulo «de la semana» cuando es a mano.** El rótulo solo está en la tarjeta (la razón en versalitas arriba del nombre, `RAZON` de `lib/instagram/ficha.ts`; el texto nunca lo dijo). Un trabajo sin día de la semana (sin `pedido.casilla`) dibuja la tarjeta y su historia con `RAZON_A_MANO`: «Artista» / «Lugar» (la misma ceja, sin «de la semana»). La vista previa de la hoja pide lo mismo (`/api/instagram/ficha/<id>?…&rotulo=0`): enseña exactamente lo que saldrá.
5. **La cola, por una función de la base y no con la llave de servicio.** `redes_encolar_ficha(p_tipo, p_ficha, p_pedido, p_repetir)`: `security definer`, `search_path` vacío, solo `authenticated` y `service_role`; exige `es_admin()`; la ficha tiene que existir (23503), verse (el lugar, no ser privado), no estar en `instagram_fuera` y, el artista, tener su foto propia (`instagram_material_propio`) (22023); candado `pg_advisory_xact_lock` por ficha; si ya hay un trabajo de esa ficha en cola o publicándose que no espera a un día por venir de la semana → `{ "duplicado": <id> }`; si ya salió y no se confirma → `{ "repetido": <cuándo> }`; si no, guarda (`instagram`, `4x5`, pedido limpio: solo `tipo`, `facebook`, `texto`, `quitadas`; `casilla` o `eventos` se rechazan) y devuelve `{ "id": … }`. `publicarFicha` la llama con la sesión de la administración (`colaFicha.ts`); `clienteAdmin` ya no se usa para esto. Añadida a la lista de administración del banco del Security Advisor.
6. **El trabajador y los avisos:** el aviso al terminar de un trabajo sin evento ni día abre la ficha (`/artistas/<id>`, `/lugares/<id>`; de la nube); su marca de origen en Facebook es `trabajo-<id>`. «Volver a publicar lo que se quedó sin salir» vuelve a mandar estos trabajos por la función nueva, con su mismo pedido y ya confirmados (si va en camino cuenta como «ya iba»).
7. **La vista previa** (`/api/instagram/ficha/[id]?tipo=…&formato=…&rotulo=0`): solo la administración (404 a los demás), de la nube, con `rotulo=0`.

Archivos nuevos: `accionesFicha.ts` (`prepararFicha`, `publicarFicha`) y su prueba, `colaFicha.ts`, `acciones.volver.test.ts`, `HojaFicha.tsx` y su prueba de componentes, `MandosPublicacion.tsx`, la ruta de la vista previa, la migración y su banco (`supabase/tests/pg/redes-encolar-ficha.test.mjs`), el guion de capturas (`scripts/ops/auditoria-ui/capturar-publicar-desde-ficha.mjs`). Tocados: `HojaDia.tsx` (usa la pieza compartida), `PublicarDesdeFicha.tsx`, las fichas (`artistas/[id]/page.tsx`, `lugares/[id]/CuerpoLugar.tsx`), `admin/instagram/semana.ts` (`enInstagramDeFicha`), `acciones.ts` (el reintento), `lib/instagram/ficha.ts` y `destacado.ts`, `lib/redes/trabajar.ts`, `herramientas.ts` y `reglas.ts`, el respaldo local (`redes_encolar_ficha` en memoria) y `medir` (pantalla `s50-ficha-publicar-instagram`).

## Qué cambió respecto a la versión de la nube

| Nube (`4a9e894e`) | Ahora |
| --- | --- |
| OL-514 en la misma rama (`salieronHacePoco`, «Ya salieron…» en `HojaDia`, «Elegido a mano: sale otra vez») | Fuera. Solo `lineaYaSalio` y su prueba; la bitácora 547 queda como registro, marcada «No publicada» |
| Hoja propia, solo lectura: el texto del sistema, sin quitar etiqueta ni apagar Facebook | Los mandos de `HojaDia`, compartidos (`MandosPublicacion`): texto editable, quitar etiqueta, Facebook, historia 9:16 |
| La tarjeta decía «Lugar/Artista de la semana» | A mano: «Lugar» / «Artista»; la vista previa igual |
| El trabajo se guardaba con la llave de servicio (`clienteAdmin().from("redes_trabajos").insert`), sin candado | `redes_encolar_ficha` con la sesión: candado por ficha, duplicado y repetido en la base |
| Pedido fijo `{ facebook: true, tipo }` | `{ tipo, facebook, texto, quitadas }` desde la hoja |
| El reintento llamaba a `publicarFicha` (sin su pedido) | Por la función, con el pedido del trabajo caído |
| Sin prueba del trabajador sin día de la semana ni de las acciones; capturas con la tarjeta en blanco | Pruebas del trabajador, de las acciones, del reintento, banco de la función y capturas reales con la tarjeta dibujada |

## Decisiones por confirmar (gestor y founder)

- **El rótulo a mano: «Artista» / «Lugar».** El cambio más chico que respeta Repisa: la misma línea en versalitas, sin «de la semana». Otras opciones: quitar la línea (la tarjeta subiría el nombre) o poner la disciplina/tipo (ya va justo debajo, en la ceja: se repetiría). Ver la captura 09.
- **«Volver al texto del sistema»** aparece en la hoja de la ficha cuando el texto se cambió a mano (es la forma útil de «limpiar» un texto largo). En la hoja del día no lo puse para no tocar lo que enseña una pantalla firmada; si se quiere en las dos, es pasarle una función.
- **La ✕ del texto:** el campo de texto largo de la app (`ui/CampoLargo`, canon de OL-147) se abre a pantalla completa con «Listo» y no tiene ✕ de borrar todo; no lo cambié aquí porque lo usan todos los formularios. La ✕ que sí está es la de quitar la etiqueta. Si el founder quiere ✕ en `CampoLargo`, pieza aparte.
- **Publicar a mano no toca la semana:** si la semana ya la tiene programada, la hoja lo avisa pero no la quita (saldría las dos veces; se cambia en la pestaña Semana). Cuenta como «salió» para la rotación (6 meses).
- **El reintento manda `p_repetir`:** lo caído ya se había confirmado al pedirlo; si entre tanto salió por otro lado, sale otra vez. Si se prefiere que no, es cambiar `true` por `false` en `volverAPublicar`.
- **El pedido con `casilla` se rechaza** (22023) en vez de limpiarse en silencio: así un error de la app se nota.

## Capturas (`docs/rediseno/capturas-548/`, 390×844 a 2×)

Guion: `node scripts/ops/auditoria-ui/capturar-publicar-desde-ficha.mjs . docs/rediseno/capturas-548`. La app compilada contra el respaldo local (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, reloj fijo en el miércoles 7 de octubre de 2026, sesión de la administración), Chrome real con la letra de la app (Bricolage comprobada), la API de Instagram y la página de Facebook de mentira del respaldo, y el trabajador de verdad. Todas abiertas y miradas.

- `01-lugar-menu.png`: Museo Leonora Carrington (demo), «···» abierto: «Publicar en Instagram · En @smsnstrsapp» entre «Ocultar del mapa» y «Reportar».
- `02-lugar-hoja.png`: la hoja: chips 4:5 / 9:16, la tarjeta Repisa dibujada por el servidor con «LUGAR» (sin «de la semana»), «Sale ahora en @smsnstrsapp, con su historia.», la etiqueta @museoleonoracarrington.demo con su ✕, «Ubicación: San Luis Potosí», el texto (676/2200) y «Publicar ahora» en el pie.
- `03-lugar-hoja-abajo.png`: la misma hoja al fondo: el texto y «También en Facebook» marcado, «Publicar ahora» entero en el pie.
- `04-lugar-texto-teclado.png`: el texto abierto a pantalla completa con el área visible encogida 336 px (el iPhone con su teclado; Chromium no lo saca: el rectángulo gris lo marca): «Listo» y el contador (699/2200) a la vista, lo escrito al final del texto.
- `05-artista-menu.png`: Renata Saldaña (demo), que salió el lunes: el renglón dice «Salió en Instagram ayer».
- `06-artista-hoja-salio.png`: su hoja: «ARTISTA» en la tarjeta (con su próxima fecha), «Salió en Instagram ayer. Sale ahora…», etiquetada e invitada como coautora, y el botón «Publicar otra vez».
- `07-artista-otra-vez.png`: la confirmación: «¿Publicar otra vez a Renata Saldaña (demo)?», que la anterior sigue en Instagram y se borra desde la cuenta, «Mejor no» y «Sí, publicar otra vez».
- `08-artista-programado.png`: Íñigo Montalvo (demo), con la semana ya armada: «La semana de Instagram ya la tiene programada para el vie 9 de oct: si la publicas ahora, saldrá también ese día…».
- `09-tarjetas-semana-y-a-mano.png`: las tarjetas del servidor juntas, la de la semana («LUGAR DE LA SEMANA», «ARTISTA DE LA SEMANA») y la publicada a mano («LUGAR», «ARTISTA»); lo demás, idéntico. Las JPEG sueltas: `tarjeta-*.jpg`.
- `10-lugar-menu-salio.png`: después de «Publicar ahora» y de que el trabajador lo publicara en el Instagram de mentira: el renglón dice «Salió en Instagram hoy».
- `recorrido.txt`: cada toque y lo que había bajo el dedo; «todo bien», sin errores de página ni de consola.

De punta a punta en el respaldo (captura 10): el trabajo quedó en la cola sin evento ni casilla, con el pedido `{"tipo":"lugar","facebook":true,"texto":null,"quitadas":[]}`; el trabajador lo publicó y anotó la publicación 4:5 y su historia 9:16 a nombre del lugar, las dos con su cuenta etiquetada.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | 0 errores (2 avisos que ya estaban, en archivos no tocados) |
| `npm run typecheck` | bien |
| `npm test` | 331 archivos, **5 231 pruebas en verde**. Nuevas: `accionesFicha.test.ts` (10: no admin, id inválido, no existe, oculta, fuera de Instagram, sin material, texto que no cabe, duplicado, repetido sin y con confirmar, frases de la base, que no se usa la llave de servicio y el pedido limpio), `acciones.volver.test.ts` (2: el reintento por la función con su pedido; duplicado como «ya iba»; rechazo como «no se pudo»), `trabajar.test.ts` (+3: un lugar y un artista **sin `casilla`** publican tarjeta 4:5 e historia sin «de la semana» y con su cuenta etiquetada, anotan `instagram_publicaciones`, espejan en Facebook con `utm_campaign=trabajo-<id>`, no tocan `instagram_semana` y avisan con la dirección de la ficha; texto propio, `quitadas` y sin Facebook; y la semana sigue dibujando con el rótulo), `reglas.test.ts` (el aviso), `semana.test.ts` (`lineaYaSalio`) |
| `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` | **3 152 comprobaciones, 0 fallaron**. Banco nuevo `redes-encolar-ficha.test.mjs` (la migración aplicada dos veces; sin sesión, cuenta normal, admin, pedido limpio y a su nombre, no existe, tipo inválido, oculto, privado, fuera, sin foto, foto ajena, `casilla` y `eventos` rechazados, pedido no objeto, duplicado en cola y publicándose, repetido y con confirmar, el día de la semana por venir no cuenta y el que ya toca sí, dos toques a la vez en dos conexiones guardan uno, definer con ruta vacía y solo `authenticated`/`service_role`); `security-advisor` con la función en la lista de administración |
| `npm run test:componentes` | **819 de 819** (6 nuevas de `HojaFicha` y las 11 de `HojaDia` con la pieza compartida) |
| `npm run inventario` | sin novedades |
| `npm run medir` | 64 pantallas × 4 anchos, **sin novedades**. Pantalla nueva `s50-ficha-publicar-instagram` (la ficha del Teatro de la Paz con la hoja abierta) con su presupuesto anotado; una excepción de toque a 320 para el chip de quitar la etiqueta (`ui/Chip`, el mismo de las otras hojas: 155×36 a 320; por confirmar si se agranda en todas) |
| Capturas (guion de arriba) | todo bien, sin errores de página |

## Lo que NO se comprobó

- Nada contra producción (ni lecturas): la migración la aplica el gestor; ni Instagram ni Facebook de verdad.
- El teclado de iOS de verdad (en Chromium, el área visible simulada como en `medir`); el canon del teclado de `CampoLargo` no cambió.

## Qué debe comprobar el gestor en producción tras aplicar la migración

1. Que existe la función y sus permisos: `select proname, prosecdef, proconfig from pg_proc where proname = 'redes_encolar_ficha';` (definer, `search_path=""`) y que `anon` no la ejecuta (`has_function_privilege('anon', 'public.redes_encolar_ficha(text,uuid,jsonb,boolean)', 'execute')` = false).
2. Que la aplicación de nuevo no falla (es `create or replace`).
3. Con la vista previa de Vercel de la rama y la cuenta de administración: abrir una ficha de lugar › «···» › «Publicar en Instagram»: la tarjeta dice «LUGAR» (no «de la semana»), los mandos están y el renglón dice cómo va. No publicar.
4. **De punta a punta con el Teatro El Rinoceronte Enamorado, cuando el founder lo diga** (su ficha ya tiene Instagram): ficha › «···» › «Publicar en Instagram» › (si ya salió) «Publicar otra vez» › «Sí, publicar otra vez». Luego, solo lectura: el trabajo en `redes_trabajos` con `lugar_id` del teatro, `evento_id` nulo y `pedido` sin `casilla`; que pase a `publicado`; dos filas nuevas en `instagram_publicaciones` (4x5 y 9x16) con su cuenta etiquetada; la de `facebook_publicaciones` si Facebook iba marcado; el aviso al teléfono abre la ficha del teatro. En Instagram, la tarjeta dice «LUGAR». La publicación anterior, si el founder ya no la quiere, se borra a mano desde la cuenta.
5. Que la semana de Instagram sigue igual (sus trabajos llevan `casilla`; su tarjeta sigue con «… de la semana»).

## Qué sigue

1. Revisión del gestor; aplicar la migración; «publica» del founder.
2. Por confirmar con el founder: el rótulo a mano (captura 09) y la ✕ de `CampoLargo`; con el gestor: el chip de quitar a 320 (36 de alto).
