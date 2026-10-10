# 397 · Al agregar un sitio al directorio, sus eventos pasan al lugar nuevo

**Pieza:** OL-366. **Rama:** `religar-sitio-lugar`, base `origin/main` (`c121be99`; después se trajo `main` hasta `2f77dbf1`). **Fecha:** 2026-10-10. **Operador:** Claude (agente del gestor V).
**Migración:** `20261010100000_religar_sitio_lugar.sql` (solo añade una función y sus permisos; **la aplica el gestor**, ver abajo).
**Estado:** hecho y probado con PostgreSQL 17 local, pruebas unitarias y de componentes, y la app compilada contra una copia del respaldo local (toques de verdad en el navegador integrado y capturas con el Chrome de la Mac); falta el iPhone del founder.

## El pedido

Lo que dejó pendiente OL-348 (bitácora 377). El founder dijo «Sí para agregar a directorio» y la ficha de sitio (`/sitios/<slug>`) ofrece «Agregar al directorio»: el alta de lugar se abre con el nombre, el punto y la ciudad del sitio. Se creaba el lugar, pero los eventos que nombraban ese sitio seguían como sitio suelto, sin ligar con el lugar nuevo. En producción hay 15 eventos vigentes así (bares, cafés y parques; dato del gestor).

## La regla de seguridad (decisión del gestor) y por qué vive en la base

Ligar un evento a un lugar cambia su «Dónde», y cualquiera con sesión puede crear un lugar. Sin regla, alguien podría crear un lugar con el nombre de un sitio concurrido y quedarse con los eventos de otras personas. La regla:

- Al crear el lugar desde un sitio se ligan **solo los eventos que publicó quien lo crea**. Si es la administración, **todos** los del sitio.
- Los eventos de otras personas no se tocan.
- La comprobación está en la base y no solo en la app: así se cumple aunque alguien llame a la API directamente.

La función nueva, `public.religar_sitio_a_lugar(p_lugar uuid, p_eventos uuid[]) returns integer`, es `security definer` con `search_path = ''`. Sus permisos se quitan a todos (`revoke all … from public, anon, authenticated, service_role`) y se dan solo a `authenticated`, como en el retiro excepcional de un lugar. Sin cuenta (`auth.uid()` vacío), error `42501`. Recibe el lugar y la lista de eventos y liga, de esa lista, solo los que cumplen todo esto:

| Comprobación | En SQL |
| --- | --- |
| todavía no tiene lugar | `lugar_id is null` |
| su sitio no es reservado | `not sitio_reservado` |
| se ve (ni oculto, ni retirado por la administración, ni borrador) | `visible` |
| no es el marco de un festival | `clase <> 'festival'` |
| es de quien llama, o quien llama es administración | `creado_por = auth.uid() or public.es_admin()` |
| el punto de su sitio está a 300 m o menos del lugar | `distancia_m(sitio_lat, sitio_lng, lugar.lat, lugar.lng) <= 300` (la misma distancia que usa `lugares_parecidos`) |
| tiene la zona horaria del lugar (decisión mía, ver abajo) | `zona = lugar.zona` |
| el lugar se ve en el directorio (decisión mía, ver abajo) | `lugar.visible and not lugar.privado`; si no, devuelve 0 |

Ligado, el evento queda **como lo deja la app cuando tiene lugar** (`validarEvento` y `ciudadDe` en `eventos/acciones.ts`): `lugar_id` es el del lugar, `ciudad` la del lugar y `sitio_texto`, `sitio_direccion`, `sitio_lat`, `sitio_lng` y `sitio_revelar_desde` quedan vacíos. Se cumple `eventos_direccion_solo_publica` (con lugar, la dirección del sitio tiene que estar vacía) y también `eventos_sitio_con_punto` (un evento con lugar no necesita punto propio). La zona la pone el disparador de siempre (`eventos_zona_del_lugar`) y no cambia, porque se exige que sea la misma. El lugar queda bloqueado (`for share`) mientras se ligan sus eventos: nadie lo oculta, lo hace privado, lo mueve ni lo borra a medias. La función devuelve cuántos ligó. Los eventos que no cumplen se quedan como estaban, sin error.

**No avisa a nadie** (el sitio es el mismo). Hace como el retiro excepcional de un lugar (OL-259): apaga `app.avisos_outbox` solo durante el cambio y deja el valor que había al terminar o si hay un error. Lo que esto provoca en los avisos: los pendientes del evento quedan obsoletos, igual que en cualquier corrección interna (`avisos_encolar`), y el recordatorio de quien dijo «Voy» se vuelve a crear, porque `avisos_recordatorios` solo se salta los que no están obsoletos.

## Qué cambió en la app

1. **La ficha de sitio** (`app/sitios/[slug]`):
   - Las acciones pasan a `AccionesSitio.tsx` (la misma fila de círculos de siempre, sin anidar más).
   - «Agregar al directorio» lleva ahora también la clave del sitio: `/nuevo/lugar?…&sitio=<slug>`.
   - Si el directorio ya tiene un lugar con el mismo nombre normalizado a menos de 150 m del sitio, sale **«Ver en el directorio»** en lugar de «Agregar al directorio», para todos y con o sin sesión: abre ese lugar y así nadie lo duplica. Para buscarlo se usa `lugares_parecidos`, el mismo criterio con que el alta de lugar pregunta «¿Es este?».
   - Con ese lugar y para la administración sale además **«Ligar sus eventos»** (`LigarEventos.tsx`). Llama a la misma función con todos los eventos del sitio y lo dice en el aviso de abajo de la ficha, el de siempre: «1 evento ligado», «3 eventos ligados» o «Ningún evento ligado». Si falla: «No se pudo guardar» con Reintentar. Un segundo toque mientras liga no hace nada.
   - Ningún texto de ayuda nuevo: los letreros dicen lo que hacen y el aviso solo dice el resultado.
2. **El alta de lugar** (`nuevo/lugar`):
   - Lee `?sitio=` (solo si tiene forma de clave: `esSlugDeSitio`), lo conserva hasta publicar en un campo escondido y lo vuelve a pasar si hay que entrar primero.
   - `crearLugar`, ya creado el lugar, liga los eventos de ese sitio (`ligarEventosDelSitio`). También lo hace al recuperar una respuesta perdida, y ligar otra vez no cambia nada. Si ligar falla, el lugar queda publicado igual y queda en el registro del servidor.
   - Si en vez de publicar la persona **elige un lugar que ya existe**, primero se ligan los eventos del sitio a ese lugar (con la misma regla) y después se abre su ficha, como antes. Esto vale para las tres salidas a un lugar existente: «¿Es este?» en el mapa, «¿Es este?» en «Revisa» (parecidos del servidor) y «Ya tiene ficha · Ir a su ficha» al escribir el nombre.
   - Abrir el lugar en otra pestaña (Cmd/Ctrl + clic) es solo mirar: no liga.
   - Sin `sitio`, las tres salidas son los enlaces de siempre.
3. **«Publicado» del alta de lugar (OL-365) no cambia.** Si se ligaron eventos, la ficha del lugar ya los enseña en «Próximos eventos».
4. **Piezas compartidas:**
   - `app/sitios/sitio.ts` (solo servidor): la consulta de los eventos del sitio, la misma para pintar su ficha y para ligar, y `ligarEventosDelSitio`.
   - `app/sitios/acciones.ts`: la acción `ligarSitioALugar(slug, lugar, diferir)`, que la ficha y el alta reciben con sus datos atados en el servidor (`bind`).
   - `lib/sitios.ts`: `esSlugDeSitio`, `eventosParaLigar` (la selección: los del sitio con su agrupación, con punto, sin marco de festival y de quien liga, o todos si es administración; la base lo vuelve a comprobar) y `textoLigados`.
   - `lib/armazon.ts`: `enlaceAltaLugar` acepta `sitio`.

## Decisiones del operador (por confirmar con el gestor)

1. **Dos comprobaciones más estrictas que el encargo.** No amplían la regla; la hacen más estricta:
   - **La zona horaria tiene que ser la del lugar.** Ligado, el evento toma la zona de su lugar. Con otra zona, la hora que se ve cambiaría en silencio: pasaría con una frontera de husos a menos de 300 m o con un evento antiguo que tiene la zona por omisión.
   - **El lugar tiene que verse en el directorio** (visible y no privado): un evento público no se liga a un lugar que nadie más ve.
2. **Solo se ligan los eventos de la ficha** (visibles y por venir). Lo que la persona ve en el sitio es lo que pasa al lugar. Los pasados se quedan con su «Dónde» de siempre (ya no tienen ficha de sitio).
3. **El parámetro se llama `sitio`**, no `desde`: en el alta de evento, `desde` ya es el evento que se duplica (`redireccionDeNuevo`).
4. **Las tres salidas del alta a un lugar existente ligan**, no solo los dos «¿Es este?». «Ya tiene ficha · Ir a su ficha» es la misma elección («la salida es ir a esa ficha, no publicar otra»). Un lugar del mismo nombre en otra ciudad no recibe nada: la base exige 300 m.
5. **«Ver en el directorio» lo ve cualquiera**, también sin sesión, porque solo abre una ficha. «Agregar al directorio» sigue pidiendo sesión.
6. **«Ligar sus eventos» se queda en la ficha del sitio** y avisa allí. La acción revalida después de contestar (`after`). Si la ficha se volviera a pintar en la misma respuesta, sin sus eventos sería «Esto ya no está» y el aviso no se vería. Lo que cuesta: la lista del sitio sigue a la vista hasta salir de la pantalla. «Ver en el directorio» enseña el lugar con sus eventos.

## Qué quedó fuera

- **Ligar los 15 eventos de producción.** Para cada sitio de esos eventos, la administración entra a su ficha. Si el lugar ya está en el directorio con el mismo nombre, toca «Ligar sus eventos». Si no, toca «Agregar al directorio», y al publicar el lugar se ligan todos. Hace falta la migración aplicada.
- Un enlace viejo a la ficha de un sitio cuyos eventos ya pasaron todos al lugar da «Esto ya no está» (no redirige al lugar).
- «Publicado» del alta de lugar sigue diciendo «¿Hay algo próximo…? Publica su primer evento» aunque se hayan ligado eventos (el encargo pedía no tocar «Publicado»).
- Los eventos pasados del sitio (decisión 2).

## La migración `20261010100000_religar_sitio_lugar.sql` (la aplica el gestor)

1. `npm run db:push`. Solo crea la función, su comentario y sus permisos; ninguna fila cambia al aplicarla.
2. Para comprobarla: `select has_function_privilege('authenticated', 'public.religar_sitio_a_lugar(uuid, uuid[])', 'execute'), has_function_privilege('anon', 'public.religar_sitio_a_lugar(uuid, uuid[])', 'execute');` debe dar `t, f`.
3. Sin la migración, la app no se rompe. El lugar se crea igual, sus eventos se quedan como sitio y el fallo queda en el registro del servidor. «Ligar sus eventos» dice «No se pudo guardar». Conviene aplicarla antes de desplegar el código.

## Verificación

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: bien.
- `npm test`: **193 archivos, 3491 pruebas**. Nuevas:
  - `lib/sitios.test.ts`: la clave de un sitio; qué eventos se piden ligar para quien registra el lugar y para la administración, y cuáles nunca; el texto del aviso.
  - `lib/armazon.test.ts`: el enlace del alta con `sitio`.
  - `app/sitios/acciones.test.ts`: la acción liga los propios, o todos con administración. Revalida en el acto, o después con `diferir`. Sin sesión, con datos sin forma o con un lugar que no se ve, no llega a la base. Si la base no puede, `ok: false`.
  - `app/lugares/acciones.sitio.test.ts`: `crearLugar` con `sitio` liga después de crear, también por la ruta con horario y al recuperar una respuesta perdida. Si ligar falla, el lugar queda. Sin `sitio`, o con uno sin forma, no liga. Con un parecido sin confirmar pregunta antes de crear nada.
  - `app/sitios/[slug]/page.test.ts`: las tres variantes de la ficha (agregar, ver en el directorio con o sin sesión, administración), más «sin sesión ni lugar» y «administración sin lugar».
- Componentes en Chromium (`npm run test:componentes`): **573 pruebas, 0 fallos**. Nuevas:
  - `AccionesSitio.componentes.test.mjs` (8): las tres variantes con sus estilos reales a 390 y a 320. Cada círculo mide 44 o más y en su centro está la acción (`elementFromPoint`). Sin desbordes. Toque de verdad en «Ver en el directorio», que va al lugar. Toque de verdad en «Ligar sus eventos»: liga una sola vez aunque se toque dos veces y el aviso dice cuántos (varios o ninguno). Si falla, «No se pudo guardar» y Reintentar. Con la letra de la app (`FUENTE`): una sola fila y cada letrero en dos renglones como mucho.
  - `AltaLugar.componentes.test.mjs` (+4): la clave viaja con lo que se publica y sin ella no. Las tres salidas al lugar existente, tocadas de verdad, ligan y después abren su ficha; un segundo toque no liga dos veces. Cmd/Ctrl + clic no liga. Sin `sitio`, «Ir a su ficha» es el enlace de siempre.
  - Con el Chrome de la Mac, la prueba de OL-365 «Ver el evento, tocado en su sitio» falla (`waitForURL` ante el 404 del servidor de prueba). Con el Chromium de Playwright, que es el de la CI, pasa. No es de esta pieza.
- `npm run test:db`: PostgreSQL 17 local en un puerto propio, base desechable, las **96 migraciones**: **1993 pruebas, 0 fallos**. Nueva `religar-sitio-lugar.test.mjs` (34 comprobaciones):
  - la función: definer, `search_path` vacío, solo con sesión, comentada;
  - anónimo, sin cuenta y el rol de servicio no ligan;
  - a un lugar privado, oculto o que no existe, nada;
  - la autora liga sus dos eventos que cumplen (al lado y a 299 m) y queda como un evento con lugar;
  - no se ligan: el de otra persona, a 500 m, a 301 m, el reservado (aunque su punto privado esté encima del lugar), el que ya tiene lugar, el marco de un festival, el oculto y el de otra zona horaria;
  - otra persona no liga los de la autora;
  - la administración liga el de otra persona, pero no los que no cumplen;
  - la segunda vez, cero;
  - no encola el aviso «cambió el lugar» y devuelve el interruptor de avisos como estaba;
  - con dos transacciones a la vez, la que llega después espera el candado de la fila y no pisa el lugar que puso la otra.

  **Controles negativos.** Quitar la condición del autor y subir el radio a 1000 m hace fallar 7 comprobaciones. Quitar «visible», el festival, la zona y la del lugar visible y no privado hace fallar 10. Después la migración se restauró idéntica.
- `npm run inventario`: sin novedades. `npm run medir`: **37 pantallas × 4 anchos, sin novedades**. Ningún presupuesto cambia: la ficha de sitio del respaldo (`11-ficha-sitio`) sigue con «Agregar al directorio» y el mismo DOM.
- **Toques de verdad en el navegador integrado** (390×844, clic por coordenadas después de comprobar con `elementFromPoint` qué hay ahí), con la app compilada contra la copia del respaldo:
  1. Ana toca la tarjeta del sitio en el «Dónde» de su recital y llega a la ficha del sitio.
  2. Toca «Agregar al directorio». El alta abre con el nombre puesto y `sitio` en el formulario.
  3. Pasa por «¿Es aquí?», el tipo (Otro, «Templo») y «Publicar lugar».
  4. En «Lugar publicado» toca «Ver el lugar»: el lugar trae su recital.
  5. El concierto de Marcos sigue como sitio y su ficha dice «Ver en el directorio». Al tocarlo se abre el lugar.
  6. Rosa (administración) toca «Ligar sus eventos»: aviso «1 evento ligado». En el lugar quedan los dos eventos y la ficha del sitio da «Esto ya no está».

## Capturas (`docs/rediseno/capturas-397/`)

Cómo se hicieron:

- La app compilada (`next build` y `next start`) contra una **copia del respaldo local en el scratchpad**. La copia de esta pieza guarda en memoria el lugar que se crea y contesta `lugares_parecidos` y `religar_sitio_a_lugar` con la misma regla que la base (la de verdad se prueba en PostgreSQL). Tiene además una cuenta de administración (Rosa) y el «Recital de órgano» de Ana en el «templo de San Francisco», escrito en minúsculas, junto al concierto de Marcos en el mismo sitio.
- El respaldo del repositorio no cambia.
- Chrome de la Mac a 390×844 y 2×, con toques de verdad en el centro de cada cosa, comprobados con `elementFromPoint`.
- El mapa estático lo contesta la prueba: fondo liso y un pin violeta. Sin errores de página.
- Cada captura se abrió y se miró.

Las capturas:

- `01-sitio-agregar-al-directorio.png`: la ficha del sitio para Ana. Arriba «Templo de San Francisco» sobre el símbolo SN. Las acciones «Cómo llegar» y «Agregar al directorio». «Próximos eventos · 2»: hoy el concierto de Marcos (18:00) y el martes 13 el recital de Ana (19:00). Abajo asoma «Dónde» con su pin.
- `02-lugar-nuevo-proximos-eventos.png`: el lugar recién creado. Rótulo «OTRO» y el nombre. «Aún sin descripción, redes ni foto. Completar». Números: Distancia –, Eventos «1 próximo», Siguen 0. Las acciones «Cómo llegar» y «Compartir». «Próximos eventos · 1»: el recital de Ana, el único de los dos que es suyo.
- `03-evento-donde-en-el-lugar.png`: el recital: su «Dónde» es ahora el renglón «Templo de San Francisco», con ángulo al lugar (`/lugares/templo-de-san-francisco`). Ya no es el sitio con su dirección.
- `04-sitio-ver-en-el-directorio.png`: la ficha del sitio, abierta desde el concierto de Marcos. «Cómo llegar» y **«Ver en el directorio»** en lugar de «Agregar al directorio». Queda «Próximos eventos · 1» con el concierto (no era de Ana, no se ligó). En «Dónde», el mapa con su pin y «Calle Jardín Guerrero 7».
- `05-sitio-admin.png`: la misma ficha para la administración: «Cómo llegar», «Ver en el directorio» y **«Ligar sus eventos»** (icono de enlace), en una fila.
- `06-sitio-admin-ligados.png`: después del toque, el aviso de abajo dice «1 evento ligado». La ficha no se volvió a pintar.
- `07-lugar-con-los-dos.png`: el lugar con «Eventos: 2 próximos» y «Próximos eventos · 2»: el concierto de hoy y el recital del martes.
- `08-publicado-sin-cambios.png`: «Lugar publicado» del alta, igual que en OL-365: sello verde, la tarjeta del lugar («Otro · Sin dirección», porque el Mapbox de la prueba no da dirección), «Publicar un evento aquí» en punteado, «Ver el lugar» y «Compartir».

## Qué probar en el iPhone (después de aplicar la migración)

1. En un evento propio en un sitio fuera del directorio: tocar el sitio, «Agregar al directorio» y publicar el lugar. El lugar enseña ese evento en «Próximos eventos» y el «Dónde» del evento es el lugar.
2. Si en el mismo sitio había eventos de otras personas, la ficha del sitio sigue con ellos y dice «Ver en el directorio».
3. Con la cuenta de administración, en esa ficha: «Ligar sus eventos». El aviso dice cuántos y el lugar los enseña.
