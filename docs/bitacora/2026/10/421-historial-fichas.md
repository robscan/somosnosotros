# 421 · El historial en la ficha del artista y en la del lugar (OL-390, pieza 1 de 5 del historial)

**Fecha:** 2026-10-12. **Rama:** `historial-fichas`, base `origin/main` (`d5cc52cc`). **Operador:** Claude (agente del gestor VI). **Sin migración y sin tablas nuevas.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## El encargo

Lo que firmó el founder el 12 de octubre a las 15:50 en el prototipo `docs/rediseno/prototipos/historial-propuestas.html` (OL-389, bitácora 420, rama `historial-propuestas`), «tal como la propuesta»: **H1 plegado · H2 propio · H3 por mes · H4 · H5 · K1 todos · Q1 fotos**. Lo que ya pasó se queda en la ficha, aparte y plegado bajo lo que viene, y cada renglón abre la ficha del evento en pasado (OL-383) sin parecer activo (OL-388: «claramente que sean pasados y no se perciban activos»). Todo sale de `eventos`, `eventos_artistas`, `lugares`, `artistas` y `asistencias`. Lo pasado cuenta como realizado; la marca «se canceló» es la pieza 2 y aquí no entra.

## Lo que se ve

**Ficha del artista.** Debajo de «Próximas fechas» y de «Publicar una fecha», el renglón **«Trayectoria»** con «4 fechas · 2 lugares» en gris y el caret, cerrado al abrir la ficha. Al tocarlo:
- **«Se ha presentado en · 2»**: la fila de fotos redondas (60 px) de los lugares con ficha de sus fechas pasadas, con el nombre en dos líneas y «2 veces» si repite; por veces y luego por nombre; se desliza de lado; cada una abre la ficha del lugar. Sin portada, el círculo oscuro con el símbolo SN en blanco. Las fechas en un sitio sin ficha cuentan en la trayectoria pero no salen en la fila; si ningún lugar tiene ficha, la fila no sale.
- **Por mes, lo más reciente primero** («Octubre de 2026», «Septiembre de 2026»). Cada renglón es `ui/Renglon` como «Próximas fechas»: miniatura del cartel (o el SN) apagada, título en gris, «sáb 10 · 20:00» con el calendario (si duró varios días, «del mar 22 al jue 24»), el sitio con el pin y, si es un acto de festival, « · Festival Otoño Sonoro» en gris; si hubo otros artistas, «con Abril Merlot, 0Backside0 y 1 más». A la derecha, «2 fueron» / «1 fue» si alguien dijo «Voy»; si no, el chevrón en gris. Nunca «Voy» ni «Me interesa».
- **K1:** el número «Lugares» cuenta los lugares con ficha de todas sus fechas visibles, pasadas y por venir. Con fechas próximas baja a «Próximas fechas» (antes no llevaba a ningún lado); sin ellas, baja a «Trayectoria» **y la abre**; sin lugares con ficha, no lleva a ningún lado. «Fechas» y «Siguen» no cambian.

**Ficha del lugar** (a pantalla completa y dentro de la hoja de Lugares, que usan el mismo `CuerpoLugar`). Debajo de «Próximos eventos» y «Publicar un evento aquí», **«Historial»** con «3 eventos · 4 artistas». Al abrir: **«Han pasado por aquí · 4»** con las fotos de los artistas (sin foto, el SN oscuro), «2 veces», cada uno a su ficha; y los eventos pasados por mes, como arriba pero sin la línea del sitio; si es un acto de festival, el festival en su propia línea con el icono de etiqueta; la línea de personas lista los artistas del evento («Feleal, Abril Merlot, 0Backside0, Rocío…»). Los números del lugar no cambian.

Sin nada pasado, la sección no existe (ni en el artista ni en el lugar).

## Qué cuenta como pasado

`termina < ahora` (la columna `eventos.termina`, la misma regla que `eventoPaso` y `filtroSinPasar`), solo `visible = true` y `borrador = false`. Un acto de festival es un evento propio; el marco del festival también entra en el historial de su lugar (como el «13 eventos» del CC200 en el prototipo, que contaba el marco). Una exposición cuenta una vez, en el mes de su inicio. Consulta aparte de la de próximos, en `<Suspense>`, ordenada por `inicio` de lo más reciente a lo más viejo, con tope de **200**; si el tope se llena, la cabecera dice «200+ fechas» / «200+ eventos». Después, en paralelo: los artistas de esos eventos (`eventos_artistas` con su artista, en tandas de 100 ids por la URL), el título de sus festivales y cuántos dijeron «Voy».

## Código, archivo por archivo

- **`src/lib/historialFichas.ts`** (nuevo, lógica pura) y **`historialFichas.test.ts`** (17 pruebas): `cabeceraTrayectoria` / `cabeceraHistorial` (singulares, sin la segunda cuenta si es 0, «200+»), `listaCon` («A», «A y B», «A, B y 2 más»), `textoFueron`, `cuandoPasado` («jue 8 · 19:00», «del mar 6 al mié 7» con `esDeVariosDias`), `agruparPorMes` (mes del inicio en la zona del evento, lo más reciente primero, también dentro del mes), `lugaresDeTrayectoria` y `artistasDelHistorial` (por veces y por nombre con `localeCompare("es")`), `otrosArtistas`, `contarLugares` (K1) y `saltoLugares`. Se llama así y no `historial.ts` porque `src/lib/historial.ts` ya existe: es la marca de navegación de Atrás (OL-055).
- **`src/lib/cargarHistorial.ts`** (nuevo, `server-only`): `cargarTrayectoria(artistaId)` y `cargarHistorialLugar(lugarId)`, las dos con `cache()` de React (los números y la sección las piden desde `<Suspense>` distintos y es una sola lectura por petición). Cuántos fueron sale de **una sola llamada a la RPC `van_por_evento`**, la misma que da el «Fueron N» de la ficha del evento en pasado, y no de leer `asistencias` fila por fila como `cargarFechas`: con 200 eventos la lectura directa podía pasar del corte de 1 000 filas de PostgREST, y la RPC cuenta también a quien tiene el perfil reservado, igual que la ficha del evento.
- **`src/components/ui/Plegado.tsx` + `Plegado.module.css`** (nuevos): el `<details>` del «Ya pasó» del festival (OL-383), sacado a algo compartido: el renglón con `h2`, la cuenta en `small` y el caret que gira; dentro, los títulos de grupo (`h3`) y de fila (`p`) en gris y los renglones apagados (foto en gris, título y cuándo en `--texto-suave`). La regla de la foto apagada pide que el enlace tenga su `small` de datos, para que la fila de fotos quede a color.
- **`src/app/eventos/[id]/ficha.module.css`**: el bloque `.yaPaso` (55 líneas) se queda en `composes: plegado from "…/ui/Plegado.module.css"`. **`page.tsx` del evento no se toca**: OL-388 (`pasado-enlazado`, aún sin unir) cambia esa página justo debajo del `<details>` del festival y así no hay choque al unir. La captura 13 enseña que el festival se ve igual. Cuando OL-388 esté en `main`, el festival puede pasar a usar `<Plegado>` directamente (cambio de diez líneas, sin cambio visual).
- **`src/components/Historial.tsx` + `Historial.module.css`** (nuevos): la sección entera para las dos fichas (`de="artista"` o `de="lugar"`), en una rejilla plana: `p` + `ul` de la fila y, por mes, `h3` + `ul` de renglones, hijos directos del `<details>`. El CSS propio: la fila de fotos (rejilla en columnas que se desliza, sin margen negativo: no sangra hasta el borde como en el prototipo, porque el inventario no acepta márgenes negativos), «2 fueron» (el número arriba, la palabra debajo, en gris), el chevrón en gris y el sitio que cede junto al festival (en `ui/Renglon` lo que no es lo último de la línea no se encoge; sin esto «· Festival Otoño Sonoro» desaparecía detrás de «Centro Cultural Universitario Bicentenario»).
- **`src/app/artistas/[id]/page.tsx`**: `KpisArtista` lee también la trayectoria (K1 y el salto); `SeccionTrayectoria` nueva, en su `<Suspense>` (sin esqueleto: mientras llega no se adivina si existe) entre «Próximas fechas» y «Novedades».
- **`src/app/lugares/[id]/CuerpoLugar.tsx`**: `SeccionHistorialLugar` en su `<Suspense>`, entre «Próximos eventos» y «Dónde».
- **`src/components/ui/Salto.tsx`**: si el destino es un `<details>`, lo abre antes de bajar (también al llegar con `#trayectoria` en la URL).
- **`src/lib/imagen.ts`** + **`public/sin-foto-redonda.png`** (180×180, 2,4 KB): el círculo oscuro con el SN blanco, generado una vez con `docs/diseno/logotipo/sin-foto-sn.mjs` (línea nueva; las otras tres imágenes salen idénticas). Nunca compuesto en vivo.
- **`src/app/globals.css`**: token `--avatar-historial: 60px`.
- **Pruebas de página:** `artistas/[id]/page.test.ts` (5 nuevas: sin pasadas no hay sección; con pasadas sale «Trayectoria» con «3 fechas · 1 lugar»; «Lugares» cuenta pasadas y próximas y baja a «fechas»; sin próximas baja a «trayectoria»; sin lugares con ficha no baja) y `lugares/[id]/page.test.ts` (2 nuevas: sin pasados no hay sección; con pasados, «3 eventos · 2 artistas»). Los dos cuentan ahora tres `<Suspense>` en vez de dos.
- **Respaldo local** (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`, solo datos inventados): 8 eventos pasados (ids `bbbb0003-…`) en ACHE Galería y el Centro Cultural Universitario Bicentenario, de este mes y del anterior: «Noche de acordeón y guitarra» con cuatro artistas y dos «Voy», un festival que ya pasó («Festival Otoño Sonoro») con dos actos, una fecha en un sitio sin ficha (Jardín de San Juan de Dios); una artista nueva, **Rocío Lozano** (de la Ciudad de México, para que no entre en Artistas de San Luis, y sin fechas próximas); asistencias de Marcos y de una cuenta sin perfil, nunca de Ana (su perfil y sus novedades se miden). Ninguna pantalla medida los enseña: Teatro de la Paz, el Museo del Ferrocarril y Aaron Cadena no cambian.

## Decisiones que tomé

1. **`historialFichas.ts` en vez de `historial.ts`** (el nombre ya lo usa la navegación).
2. **Cuántos fueron con `van_por_evento`** (ver arriba) en vez de leer `asistencias`.
3. **Varios días con la regla de siempre (`esDeVariosDias`).** En el prototipo la clase magistral de Leo Traeger (del mar 6 a las 12:00 al mié 7 a las 11:30) decía «del mar 6 al mié 7»; con la regla de la app (si termina al día siguiente antes de la hora en que empezó, es un día) dice «mar 6 · 12:00», igual que su ficha. Hay una prueba con ese caso.
4. **La ceja del festival en el lugar lleva el icono de etiqueta**, no el pin del prototipo: un festival no es un sitio y la ficha del evento ya usa la etiqueta para «Parte de …». En el artista va como en el prototipo, tras el sitio y en gris.
5. **La miniatura es el cartel o el SN**, nunca la portada del lugar (en «Próximas fechas» un evento sin cartel enseña la foto de su lugar; en lo pasado sería la misma foto repetida y el encargo pide «cartel o SN»).
6. **«Lugares» con próximas baja a «Próximas fechas»** (antes no bajaba a ningún lado), como el prototipo.
7. **El marco de un festival cuenta en el historial de su lugar** (como en el prototipo).
8. **Sin esqueleto mientras llega la sección:** el `fallback` es nada, para no enseñar un renglón de algo que quizá no existe.
9. **La fila de fotos no sangra al borde de la pantalla** (el prototipo usaba margen negativo, que el inventario prohíbe): empieza y termina en el margen del contenido.

## Lo que el founder debe confirmar

- La ceja del festival con el icono de etiqueta en el historial del lugar (decisión 4).
- «Lugares» que ahora baja a «Próximas fechas» cuando hay próximas (decisión 6).
- Que el marco de un festival cuente como un evento más en el historial de su lugar (decisión 7): en el CC200 son «13 eventos» con el marco; sin él serían 12.
- La regla «realizado salvo "se canceló"» sigue pendiente para la pieza 2; hoy todo lo pasado cuenta.

## Capturas (`docs/rediseno/capturas-421/`, 390×844 a 2×)

La app compilada (`next build` + `next start`) contra una copia del respaldo local en el scratchpad de la sesión, con dos cambios solo en esa copia: sin `imagenes.json` (ni una imagen de fuera) y seis imágenes inventadas (degradados con una forma, hechas con sharp) servidas por el mismo respaldo para las portadas de ACHE y del Bicentenario, las fotos de Feleal y Abril Merlot y los carteles de dos eventos. Todo lo que no era `127.0.0.1` se cortó en el navegador. **Ni una lectura a producción.** Sin sesión. Toques reales por coordenadas (centro de la caja, con el elemento centrado para que la pastilla «Seguir» no lo tape). Cero errores de página. Abiertas una por una:

- `01-feleal-arriba-lugares-3`: la ficha de Feleal arriba: «Fechas · 1 próxima», «Siguen · 0», **«Lugares · 3»** (Teatro de la Paz de su fecha próxima, más ACHE y el Bicentenario de las pasadas); abajo, «Próximas fechas · 1» y el renglón «Trayectoria · 4 fechas · 2 lugares» asomando.
- `02-feleal-trayectoria-plegada`: «Próximas fechas · 1» con su renglón, «Publicar una fecha» y, plegado, **«Trayectoria» con «4 fechas · 2 lugares» y el caret hacia abajo**; después «Novedades».
- `03-feleal-trayectoria-abierta`: abierta (caret hacia arriba): **«Se ha presentado en · 2»** con ACHE Galería («2 veces», foto naranja) y «Centro Cultu-ral Universit…» (foto verde, nombre partido con guion y cortado en dos líneas); **«Octubre de 2026»** con «Noche de acordeón y guitarra», el cartel en gris, «sáb 10 · 20:00», ACHE Galería, «con Abril Merlot, 0Backside0 y 1 más» y **«2 fueron»** a la derecha; **«Septiembre de 2026»** empieza debajo. Títulos en gris.
- `04-feleal-trayectoria-septiembre`: septiembre: «Feleal: acordeón en ACHE» (dom 27, chevrón gris), **«Feleal y Abril Merlot a dúo»** (mar 22 · 19:00; «Centro Cultural Universit… · Festival Oto…», los dos cortados con puntos suspensivos; «con Abril Merlot»; **«1 fue»**) y «Feleal en el Jardín de San Juan de Dios» (un sitio sin ficha: no está en la fila de arriba).
- `05-feleal-salto-lugares-a-proximas`: tras tocar «Lugares» con fechas próximas, la ficha baja a «Próximas fechas» (la página no da para dejarla arriba del todo: queda donde acaba el desplazamiento) y la trayectoria sigue plegada.
- `06-rocio-sin-proximas-lugares-2`: Rocío Lozano (Canción · Solista · Ciudad de México, sin foto: el SN): «Fechas · Ninguna», **«Lugares · 2»**, «Aún no tiene fechas publicadas…», «Publicar una fecha» y «Trayectoria · 2 fechas · 2 lugares» plegada.
- `07-rocio-salto-lugares-abre-trayectoria`: tras tocar «Lugares», la ficha baja a **«Trayectoria», ya abierta**: ACHE y el Bicentenario en la fila, «Noche de acordeón y guitarra» con «con Feleal, Abril Merlot y 1 más» y «2 fueron», y en septiembre «Rocío Lozano: canciones de ida y vuelta» (lun 28 · 19:30, el sitio cortado con puntos suspensivos).
- `08-merlot-2-fueron-y-con`: la trayectoria de Abril Merlot abierta: «2 fechas · 2 lugares»; «2 fueron» con «con Feleal, 0Backside0 y 1 más»; el dúo con «1 fue», «con Feleal» y el festival tras el sitio.
- `09-ache-historial-plegado`: ACHE Galería: «Próximos eventos» (el taller de linóleo y la inauguración de Custom Art Toy, con su «Voy»), «Publicar un evento aquí» y **«Historial · 3 eventos · 4 artistas»** plegado; después «Dónde».
- `10-ache-historial-abierto`: **«Han pasado por aquí · 4»**: 0Backside0 (SN oscuro, «2 veces»), Feleal («2 veces»), Abril Merlot y Rocío Lozano (SN oscuro); octubre: «Noche de acordeón y guitarra» con «Feleal, Abril Merlot, 0Backside0, Rocío…» y «2 fueron», «Retratos de barrio en vivo» (mié 7, 0Backside0); septiembre: «Feleal: acordeón en ACHE». Sin línea del sitio.
- `11-ccub-historial-festival`: el Bicentenario: «4 eventos · 4 artistas»; los actos con **«Festival Otoño Sonoro» en su línea, con el icono de etiqueta**; el marco del festival como un renglón más, «del mar 22 al jue 24».
- `12-ache-en-la-hoja-de-lugares`: la ficha de ACHE dentro de la hoja de Lugares (`/lugares?lugar=ache-galeria`): los números, «Próximos eventos · 2», «Publicar un evento aquí» y abajo el renglón «Historial»: el mismo cuerpo.
- `13-festival-ya-paso-sin-cambios`: la ficha del «Festival Otoño Sonoro»: «Programa registrado: 2 actividades · ninguna por venir» y **«Ya pasó · 2 actividades»** abierto con sus dos días y los actos apagados («19:00 · ya pasó»): igual que antes de sacar el patrón a `ui/Plegado`.

## Verificación

`npm run lint && npm run typecheck && npm test && npm run build && npm run inventario && npm run medir`, en verde (salida 0), en el árbol de la rama:

- **lint:** 0 errores, 1 aviso que ya estaba en `main` (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- **typecheck:** limpio.
- **test:** 203 archivos, **3 677 pruebas** en verde; nuevas: 17 en `lib/historialFichas.test.ts`, 5 en la ficha de artista y 2 en la de lugar.
- **build:** en verde.
- **inventario:** sin novedades: 1 bloque duplicado (aceptado 1; el que ya había) y **342 medidas en duro (aceptadas 342)**: no subió nada, no hizo falta `--aceptar`. Las dos repeticiones que aparecieron a medio camino (el título de la fila igual al `h3` de `ui/Plegado`, y el nombre de dos líneas igual a uno de `PulsacionEnMapa`) se quitaron: el `p` de la fila toma la regla del `h3`, y el nombre se parte con guion (`hyphens: auto`) en vez de por cualquier letra.
- **medir:** 38 pantallas × 4 anchos, sin novedades. Las fichas que se miden no cambian: Teatro de la Paz 95/126, Museo del Ferrocarril 81/112, Aaron Cadena 69/100, la ficha en la hoja 167/165, Artistas 146/148, el festival 122/155 (no tiene nada pasado en el respaldo, así que no hay pantalla medida con la sección: no se inventó ninguna). Dice «1 pantallas bajaron de nodos»: es `s24-ficha-exposicion` (84 contra 86 aceptados), que ya venía así de `main` (anotado en las bitácoras 418 y 419); no se anotó porque `--aceptar` reescribe los presupuestos de todas.
- **Capturas:** 13, cero errores de página (arriba).

## Lo que no entra aquí

- La marca «se canceló» y no contarlo (pieza 2), «Tu año» (pieza 3), el currículo y el reporte en PDF (pieza 4), lo anterior a la app e integrantes (pieza 5).
- «Ya fui» para las exposiciones (Y1, OL-377).
- Pasar el festival a `<Plegado>` en su `page.tsx` (cuando OL-388 esté en `main`).
