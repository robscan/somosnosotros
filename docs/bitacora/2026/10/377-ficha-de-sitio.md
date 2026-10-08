# 377 · Ficha de sitio: el ángulo siempre abre una ficha; «Cómo llegar» vive en las fichas; todo sitio lleva su punto

**Pieza:** OL-348. **Rama:** `ficha-de-sitio`, base `origin/main` (`b8cac807`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Migración:** `20261008120000_sitio_con_punto.sql` (solo añade una restricción NOT VALID y reemplaza dos funciones; **la aplica el gestor**, ver abajo).
**Estado:** hecho y probado con la app compilada contra una copia del respaldo local (Chrome de la Mac, 390×844), con PostgreSQL 17 local y con pruebas unitarias; falta el iPhone del founder.

## Qué pidió el founder (2026-10-08, textual)

- Sobre el ángulo de las filas de lugar (a veces abría la ficha, a veces cómo llegar): «no es claro lo que va a pasar».
- «estandaricemos siempre que aunque el lugar no esté en catálogo se abra ficha incompleta y de ahí a cómo llegar».
- «No quiero agregar más textos». «Sí para agregar a directorio».
- «no podemos permitir sitios sin coordenadas. Es mandatorio que las tenga.»

## Qué cambió

### 1. Una sola regla para el ángulo

- **`components/TarjetaSede.tsx` (nuevo):** un sitio en una línea (`Renglon .dato`): pin (candado si es reservado), nombre, su meta y, si tiene ficha, el ángulo que la abre. Sin `href`, sin ángulo. Sustituye a `RenglonSede` de la ficha del evento y queda lista para la tarjeta del pin del mapa a pantalla completa (OL-349).
- **Ficha de evento, «Dónde»:** el lugar del directorio abre su ficha (como antes); un sitio fuera del directorio, que antes era un renglón quieto, ahora abre su **ficha de sitio** con ángulo (si el evento se ve y no ha pasado: uno oculto o pasado no arma la ficha, y entonces va sin ángulo). El sitio reservado no cambia (sin ficha; sin sesión, su renglón lleva a Entrar como siempre). «Cómo llegar» sigue siendo la acción redonda de arriba.
- **Ficha de festival, lista de sedes:** cada sede abre su ficha, del directorio o de sitio (`Sede.href`, calculado en `sedesDeFestival`); una reservada, ninguna. Antes los sitios fuera del directorio no tenían ángulo.
- **Ficha de lugar:** la fila de la dirección deja de ser enlace a Google Maps y pierde el ángulo: queda como dato. «Cómo llegar» ya está en las acciones. Sin texto nuevo.
- Agenda, Buscar y «Tus planes»: sus renglones abren la ficha del evento, ninguno enlazaba el lugar; no hubo nada que cambiar. Ningún renglón de la app abre ya un mapa (`google.com/maps` solo queda en `enlaceComoLlegar` y en la acción «Cómo llegar» de la ficha de lugar).

### 2. La ficha de sitio (`/sitios/<slug>`)

- **`lib/sitios.ts` (nuevo, lógica pura):** `slugDeSitio(nombre, ciudad)` (el nombre sin acentos, mayúsculas ni signos, como `slug_de_nombre`, con la ciudad detrás; si el nombre ya termina con ella no se repite), `slugDelEvento`/`hrefSitio` (solo un sitio fuera del directorio, público y con letras) y `eventosDelSitio`.
- **`app/sitios/[slug]/page.tsx` (nuevo):** se arma al vuelo con los eventos visibles y por venir que nombran el sitio; su nombre, dirección y punto salen de ellos con **`sedesDeFestival`** (la misma agrupación por nombre normalizado; no se duplicó). Contenido, con la maquetación de la ficha de lugar y menos bloques: héroe con el símbolo SN y el nombre; acciones **«Cómo llegar»** y, con sesión, **«Agregar al directorio»**; «Próximos eventos · N» con el renglón de siempre (`EventosPorDia`, sin repetir el sitio); «Dónde» con el mapa estático y su pin (el de la ficha de lugar) y la dirección como dato si algún evento la dice. `noindex, nofollow`. Sin eventos (o sin punto) → 404 («Esto ya no está»). La plantilla es la de la ficha de lugar (entrada deslizada y un solo aviso para las pastillas). `/sitios/<slug>` cuenta como ficha en el armazón (`FICHAS`).
- **«Agregar al directorio»** abre `/nuevo/lugar?nombre=…&lat=…&lng=…&ciudad=…`: el alta de lugar ya aceptaba esos parámetros (OL-315) y abre con el nombre puesto y el punto para confirmar en «¿Es aquí?». No hizo falta añadir ninguno.
- `cargarSedes` y la ficha del festival piden ahora también la `ciudad` de cada acto (para el slug).

### 3. Coordenadas obligatorias

- **Servidor (`validarEvento`, crear y editar):** un sitio fuera del directorio sin punto válido se rechaza siempre con el mensaje que ya usaba el flujo, «Confirma la ubicación eligiendo una dirección o poniendo el pin.» (antes solo si traía dirección o medio punto). El marco de un festival queda fuera (`opciones.marco`, que `actualizarEvento` pasa con la clase festival), como en la base.
- **Alta y edición por pasos (`sitioListo`):** un sitio público sin punto ya no cuenta como contestado. Caminos revisados: «¿Dónde es?» → «¿Es aquí?» → «No está en el directorio» siempre trae el punto del candidato (también «Ponle nombre» y «Sí, es aquí» sin nombre); el cartel deja la sede leída «por confirmar» (`pinPendiente`); el que quedaba abierto era **editar o duplicar un evento antiguo con solo el nombre** (`nombreLegacy` sin punto): contaba como contestado y se guardaba sin punto. Ahora «Revisa» dice «Falta el lugar» y el paso «¿Dónde es?» lo pide. `HojaDonde` ya solo la usa el alta de lugar (que siempre pide punto).
- **Base:** `eventos_sitio_con_punto` (abajo).

## La migración `20261008120000_sitio_con_punto.sql`

1. `alter table public.eventos add constraint eventos_sitio_con_punto check (clase = 'festival' or lugar_id is not null or sitio_reservado or (sitio_lat is not null and sitio_lng is not null)) not valid;` con su comentario.
2. **`borrar_lugar_excepcional_admin` (OL-259) reemplazada:** al retirar un lugar dejaba sus eventos con el nombre y sin punto; con la regla, el retiro excepcional habría fallado en cuanto el lugar tuviera eventos. Ahora el evento de un lugar público conserva el punto del lugar (sin dirección, como antes); el de uno oculto o privado (que ya quedaba oculto y como «Lugar retirado») pasa a sitio reservado sin dirección, así su punto nunca se publica.
3. **`publicar_programa` (OL-321) reemplazada:** crea el marco como evento y después lo vuelve festival, así que la excepción del festival le llega tarde; si el primer acto publicado era un sitio reservado, el marco quedaba con su nombre sin punto. Ahora el marco copia ese sitio tal cual: reservado, con la misma dirección privada de ese acto (de la misma persona, que se revela igual). Con un primer acto público, como siempre.

**Distinto del encargo (por confirmar con el gestor):** la regla lleva `clase = 'festival' or …` delante del texto encargado. Sin eso se rompía publicar un festival: `guardar_evento_con_clase`, `relacionar_en_festival` y `festival_de_dos_parecidos` insertan el marco (ya como festival) con el nombre de su primer acto y **sin punto** cuando ese acto es reservado, y `recalcular_festival` reescribe el marco cada vez que cambia su programa. El marco no es un sitio (OL-339: sus sedes salen de sus actos) y cada acto sí cumple la regla. La prueba lo demuestra con la regla estricta.

**Cómo aplicarla y validarla (gestor):**

1. `npm run db:push` con la migración (la regla no revisa las filas que ya existen).
2. Desde ese momento **los eventos antiguos sin punto no se pueden guardar** (ni ocultar, ni editar, ni moverlos de festival) hasta tener el suyo. Para encontrarlos:
   ```sql
   select id, titulo, sitio_texto, ciudad, inicio, visible
   from public.eventos
   where clase <> 'festival' and lugar_id is null and not sitio_reservado and (sitio_lat is null or sitio_lng is null)
   order by inicio;
   ```
3. Al corregirlos (darles punto, pasarlos a un lugar o reservarlos): `alter table public.eventos validate constraint eventos_sitio_con_punto;` (falla con 23514 mientras quede uno).

## Decisiones del operador (por confirmar)

1. **El slug lleva la ciudad** (`/sitios/jardin-de-san-juan-de-dios-san-luis-potosi`): el encargo pedía nombre normalizado + punto cercano, pero un slug sale del nombre y no del punto; con solo el nombre, «Plaza de Armas» de dos ciudades sería una sola ficha con el pin de una. La ciudad es estable y la regla «el país distingue» del founder lo pide. Dentro de una ciudad, mismo nombre = mismo sitio (como en `sedesDeFestival`).
2. **Solo eventos visibles y por venir** en la ficha (como «Próximos eventos» del lugar); los pasados ya no tienen ficha para quien no los publicó. Por eso el ángulo del sitio solo sale si el evento se ve y no ha pasado. Caso borde anotado: una sede de un festival en curso cuyos actos ahí ya pasaron lleva a un 404.
3. **El marco de un festival entra en la lista del sitio** si lo nombra (lo mismo hace la ficha de lugar con los suyos): así el sitio de un festival sin actos también tiene ficha.
4. **Sin números** (Distancia, Eventos, Siguen) y **sin «Publicar un evento aquí»**: un sitio no es un lugar del directorio (no se sigue y el alta de evento pide un lugar). «Menos bloques», como pidió el encargo.
5. **El mapa de las fichas sigue llevando a «Cómo llegar»**: no es un renglón ni tiene ángulo; el encargo solo nombra filas. Si el founder quiere que tampoco, es una línea (`href={null}` en `MapaFicha`).
6. **«Agregar al directorio»** solo con sesión (como pidió el encargo); sin sesión la ficha tiene una sola acción.

## Pendiente (siguiente paso)

- **Religar los eventos al lugar nuevo:** al crearse el lugar desde «Agregar al directorio» los eventos que nombran el sitio **no** pasan solos a ese lugar (siguen como sitio, con su ficha de sitio). Es otra pieza: decidir si se religan solos (mismo nombre y punto a menos de X m) o se ofrece a quien los publicó.
- La tarjeta del pin del mapa a pantalla completa (OL-349) puede usar `TarjetaSede` tal cual.
- Los eventos antiguos sin punto (gestor) y validar la regla.
- Un festival con dos sedes del mismo nombre en ciudades distintas sigue juntándolas en una (como hasta hoy: `sedesDeFestival` agrupa por nombre); su ángulo lleva a la de la ciudad del primer acto.

## Verificación

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**186 archivos, 3375 pruebas**), `npm run inventario` (sin novedades) y `npm run medir` (**37 pantallas × 4 anchos, sin novedades**). Nuevas: `lib/sitios.test.ts` (slug con ciudad, sin repetirla, sin letras; qué eventos tienen ficha; el mismo nombre escrito distinto es el mismo sitio y en otra ciudad otro; armado con `sedesDeFestival`), `sedesFestival.test.ts` (+1: cada sede con su ficha), `eventos.test.ts` (todo sitio pide su pin; el marco no; el reservado no pide punto público), `direccion.acciones.test.ts` (crear y editar sin punto: rechazo y la base no se toca), `gestosFlyer.test.ts` y `alEditar.test.ts` (el de antes sin punto se vuelve a preguntar). Ajustadas las que fijaban la regla vieja y los datos de prueba de las acciones (ahora con punto y ciudad).
- **Medir:** `11-ficha-sitio` nueva (`/sitios/templo-de-san-francisco-san-luis-potosi` del respaldo: 41 nodos a 320/390, 72 a 820/1280; 12 de profundidad). Presupuestos al día: `06-ficha-evento` +1 (el ángulo del sitio), `07`, `08` y `s13` (ficha de lugar) −1 (el ángulo de la dirección). **Teclado intacto:** 7 campos en 7 pantallas, los mismos botones de abajo que antes.
- `npm run test:db` (PostgreSQL 17 local, las 92 migraciones en orden): **1948 pruebas, 0 fallos**. Nueva `sitio-con-punto.test.mjs`: la regla NOT VALID y comentada; altas (sitio con punto, reservado, lugar sí; sin punto o medio punto no, ni por escritura directa); editar no quita el punto; un evento antiguo sin punto (insertado sin la regla en una transacción) no se guarda hasta tener su punto y la regla no se valida mientras quede uno; el marco de un festival sin punto se guarda y se reprograma, y con la regla estricta no; `publicar_programa` con primer acto reservado deja el marco reservado con la misma dirección privada, y con uno público como siempre. Ajustadas las pruebas que creaban sitios sin punto (11 archivos: punto en sus datos; `ciudades-agregadas` y `ciudades-centro-eventos` retiran la regla dentro de su transacción porque cuentan eventos antiguos sin punto) y las que fijaban lo viejo (`evento-direccion`: crear, quitar el pin o desreservar sin pin ya se rechaza; `borrado-excepcional-admin`: el punto del lugar público y el reservado del oculto).

## Capturas (`docs/rediseno/capturas-377/`)

App compilada (`next build && next start`) contra una copia del respaldo local en el scratchpad con el reloj fijo (miércoles 7 de oct, 10:00): el festival de cine y sus actos a la vista, su segundo acto en el Jardín de San Juan de Dios (fuera del directorio), el Festival de las Linternas a la vista en el Jardín y un «Recital de órgano» en el «templo de San Francisco» (escrito en minúsculas). Chrome de la Mac, 390×844 a 2×, sesión inventada de Ana salvo en la 04; `scrollWidth` 390 en todas; sin errores de página (solo el script de Vercel, que no existe en local). **El mapa estático lo contesta la prueba** (fondo liso con un pin violeta por cada pin que pide la app). Cada una abierta y mirada:

- `01-evento-sitio-fuera-del-directorio.png`: concierto en el Templo de San Francisco: «Dónde» con el mapa y el renglón «Templo de San Francisco» / su dirección, **con ángulo** (lleva a `/sitios/templo-de-san-francisco-san-luis-potosi`); arriba, la acción «Cómo llegar».
- `02-ficha-de-sitio.png`: la ficha de sitio: símbolo SN y «Templo de San Francisco»; las dos acciones «Cómo llegar» y «Agregar al directorio»; «Próximos eventos · 2» (hoy el concierto; sáb 10 el recital, escrito distinto y en la misma ficha); asoma «Dónde».
- `03-ficha-de-sitio-donde.png`: más abajo: los dos eventos y «Dónde» con su mapa (la dirección, como dato, queda justo bajo el borde).
- `04-ficha-de-sitio-sin-sesion.png`: sin sesión, solo «Cómo llegar».
- `05-lugar-direccion-sin-angulo.png`: Teatro de la Paz: «Dónde» con el mapa y «Villerías 205 / Centro, 78000…» **sin ángulo**.
- `06-festival-sedes.png`: el festival: «Dónde» con tres pines y la lista «Centro Cultural Universitario Bicentenario · 1 actividad ›», «Jardín de San Juan de Dios · 1 actividad ›» (antes sin ángulo) y «Teatro de la Paz · 1 actividad ›».
- `07-ficha-de-sitio-del-festival.png`: la ficha del Jardín, a la que lleva esa sede: «Próximos eventos · 2» (las Linternas, del 9 al 11, y la charla del festival).
- `08-sitio-que-no-existe.png`: un slug sin eventos: «Esto ya no está» y Atrás (404 de la app).
- `09-agregar-al-directorio.png`: lo que abre «Agregar al directorio»: «Registrar un lugar», «¿Cómo se llama?» con «Templo de San Francisco» ya puesto (el aviso «No pude buscar en el mapa» es del Mapbox sin llave de la prueba; con el punto, el siguiente paso es «¿Es aquí?»).

## Qué probar en el iPhone

1. Una ficha de evento en un sitio fuera del directorio: tocar el renglón del sitio abre su ficha; ahí «Cómo llegar» abre Mapas y «Agregar al directorio» el alta con el nombre y el punto.
2. Un festival de varias sedes (CINEMA, Fotovision): cada sede con ángulo abre su ficha.
3. Una ficha de lugar: la dirección ya no se toca; «Cómo llegar» sigue arriba.
4. Editar un evento antiguo sin punto (después de la migración): «Revisa» dice «Falta el lugar» y pide elegirlo.
