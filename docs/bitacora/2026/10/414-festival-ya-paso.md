# 414 · El festival con «Ya pasó» aparte y la ficha en pasado de un acto (OL-383)

**Fecha:** 2026-10-12. **Rama:** `festival-ya-paso`, desde `origin/main` (`152ea11a`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder y verlo en su iPhone.

## El encargo

Founder (2026-10-12): «dentro de un festival se ven actos que ya pasaron … lo pasado se queda, pero separado y sin enlaces rotos». Sobre el prototipo: «Re apruebo esta propuesta, pero ojo con los errores que te dije, no reconstruyas la pantalla completa para no echar a perder lo que está bien en prod» y la firma «X1 como pasado · X2» (prototipo `docs/rediseno/prototipos/inicio-propuestas.html`, rama `prototipo-inicio-propuestas`, bitácora 408, capturas 15 a 17). Hoy el programa del CINEMA lista 11 actos (5 ya pasaron) y cada pasado abre «Esto ya no está».

Solo cambian el programa del festival, «Ya pasó» y la ficha de un evento que ya pasó. Cabecera, KPI, acciones, «Dónde» y pie de la ficha del festival quedan como en producción.

## Lo que cambió

- **`src/lib/programaFestival.ts` (nuevo):**
  - `programaDeFestival(actos, ahora)` parte el programa en `porVenir` y `pasados` con la regla de siempre (`eventoPaso`: su fin o, sin fin, 3 h después de empezar; OL-358), cada lado en su orden.
  - `textoProgramaConPasados(total, porVenir)` da «Programa registrado: 11 actividades · 6 por venir» si alguno ya pasó; sin pasados, la línea de siempre; sin nada por venir, «· ninguna por venir».
  - `textoActividades(n)` da «5 actividades».
  - `vistaDeFicha(...)` decide cómo se abre una ficha: `viva` (la de siempre), `pasado` o `no-existe` («Esto ya no está»).
- **Ficha del festival, «Programa»:** solo los actos por venir (`EventosPorDia`, con su «Voy» como hoy), y debajo «Programa registrado: N actividades · M por venir». Lo de los borradores y «Agregar otra actividad» sigue igual. El KPI «Actos» y la línea de la cabecera siguen contando todos.
- **Ficha del festival, «Ya pasó» (X2, plegado):** después de «Programa», un `<details>` cerrado al abrir la ficha, con «Ya pasó», «N actividades» debajo y el caret a la derecha (gira al abrir). Se abre sin JS y el estado no se guarda. Al abrirlo salen los actos pasados por día, con el mismo renglón (`RenglonEvento`):
  - sin «Voy»;
  - «· ya pasó» tras la hora, como en la captura 17 del prototipo;
  - la foto en gris al 70 %, y el título y la hora en el gris del texto suave.
  
  Cada renglón enlaza a la ficha del acto (X1). Si no hay actos pasados, no hay sección. Estilos en `ficha.module.css` («Ya pasó» de un festival), rejilla con áreas en el `summary` y los días como hijos directos del `details` (sin envoltorio).
- **La ficha de un evento que ya pasó (X1):** para quien no lo gestiona, un evento visible, no borrador y ya pasado deja de dar `notFound()` y se pinta en pasado:
  - el chip «Ya pasó» en la cabecera, junto a la clase cuando la tiene («Festival · Ya pasó»);
  - el cuándo en pasado: «Fue · 19:00» sobre el día; una exposición dice «Cerró» y «Abrió» en vez de «Hasta» y el horario de hoy;
  - solo «Compartir»: sin «Voy» / «Me interesa» (la barra de abajo), «A mi calendario» ni «Cómo llegar»; el cartel para descargar ya no salía en lo pasado;
  - sin «Quién va»; el tercer número dice «Fueron» y ya no baja a esa sección;
  - lo demás tal cual: cartel, descripción, «Dónde» con su lugar, artistas, «Parte de {festival}».

  Un borrador o un evento oculto que ya pasó sigue en «Esto ya no está». Quien lo publicó y la administración lo ven como antes, con su aviso; si el evento se ve, el aviso dice ahora «Este evento ya pasó: los demás lo ven en pasado, sin «Voy» ni «Cómo llegar».» (antes decía que solo lo veían ellos, y ya no es cierto).
- **Dirección reservada (OL-257):** se mantiene. La sesión a la que la base aún deja consultar la dirección (hasta 2 h tras el fin) la ve, con su aviso, ahora en la ficha en pasado. Sin sesión, o con la ventana vencida, la ficha en pasado dice «La dirección ya no está disponible por privacidad», sin «Entra para ver la dirección» (en pasado no hay nada que revelar). Una respuesta privada inesperada sin sesión no se pinta.
- **Metadatos:** de un evento pasado, el título es «{título} · Ya pasó · Somos Nosotros» y la descripción «Ya pasó: fue el {día} · {hora}.», con su canonical. Sin imagen ni tarjeta para compartir: se mantiene la decisión del 2026-09-14 («un evento que ya pasó no se anuncia al compartir»). Sin `noindex` nuevo, y el JSON-LD y las migajas siguen solo para lo que no ha pasado.
- **No se tocó:** la inauguración pasada de una expo (OL-380, PR #488, queda sin enlace hasta revisarla con el historial), las fichas de lugar y artista (historial, pieza siguiente) ni los componentes de Inicio (OL-382). El PR #488 toca el mismo `page.tsx` en otras líneas; el bloque de estilos nuevo va antes de la sección 3 de `ficha.module.css` para no chocar con su sección 4 al final.

## Pruebas

- `src/lib/programaFestival.test.ts` (7):
  - los 11 actos del CINEMA (`2026-09-30T00:00Z` a `2026-10-25T02:00Z`, America/Mexico_City) con «ahora» el 12 de octubre a las 11:00 de San Luis: 5 pasados, 6 por venir, la línea «Programa registrado: 11 actividades · 6 por venir» y «5 actividades»;
  - el borde de las 3 h y el fin;
  - las líneas sin pasados y sin nada por venir;
  - la regla de la ficha: pasado visible → en pasado; oculto o borrador → «no existe»; quien gestiona → la de siempre; dirección reservada con sesión → en pasado.
- `src/app/eventos/[id]/page.test.ts`:
  - «dirección reservada tras el fin (OL-257)» ajustado: oculto y sin acceso, sigue en 404; visible y sin acceso, la ficha en pasado sin la dirección (tres casos); en pasado no hay «Quién va».
  - Nuevo «la ficha en pasado (OL-383)» (5):
    - el evento pasado lleva el chip, «Fue · …», «Compartir» y nada de calendario, «Voy», «Cómo llegar» ni «Quién va»;
    - un borrador u oculto sigue en 404;
    - los metadatos;
    - el festival con 3 pasados y 3 por venir («Programa» con los 3 por venir, la línea, el `details` cerrado con «Ya pasó · 3 actividades», los 3 renglones con «ya pasó» y sin botón, el KPI «Actos» en 6);
    - un festival sin pasados no lleva «Ya pasó».
- **Unida con `origin/inauguracion-pasada` (PR #488, OL-380)**, como pedía el encargo. Hubo tres choques y en los tres quedaron los dos lados: los `import` de `page.tsx` (`renglonLigado` junto a `programaFestival`), los dos `describe` nuevos al final de `page.test.ts` y las dos líneas de `OPEN_LOOPS.md` (la de OL-383 arriba). Tras unir, siguen en verde lint, tipos, `npm test` (199 archivos, 3601 pruebas) y build. Si #488 entra primero, este PR solo trae lo de OL-383; si no entra, este PR la arrastra: avisar al gestor.
- Antes de unir, en verde: `npm run lint` (0 errores; 1 aviso que ya estaba, en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (198 archivos, 3594 pruebas) y `npm run build`.

## Capturas (390×844, `docs/rediseno/capturas-414/`)

Con `next build` + `next start` de la rama contra un respaldo Node local sin red: filas inventadas, sin sesión (visitante), carteles SVG hechos por el respaldo. Un `.env.local` temporal llevaba la URL del respaldo y una llave pública inventada; ya está borrado. Capturas con playwright-core y el Chrome de la Mac. El festival inventado tiene 6 actos: 3 pasados (7, 8 y 10 de octubre) y 3 por venir (13, 15 y 17).

- `01-festival-ya-paso-plegado.png`: el final de «Programa», con los 3 por venir y su «Voy». Debajo, «Programa registrado: 6 actividades · 3 por venir» y el renglón «Ya pasó / 3 actividades» con el caret abajo, cerrado. Le siguen «Dónde» como en producción y «Me interesa» flotando. Medido: el `details` cerrado al cargar y su renglón de 44 px. Corresponde a la captura 15 del prototipo.
- `02-festival-ya-paso-abierto.png`: tras un toque real en el renglón, «Ya pasó» abierto (caret arriba) con los 3 actos por día. Cada uno lleva la foto en gris, el título y «19:00 · ya pasó» en gris y el sitio, sin «Voy». Medido: cada renglón enlaza a `/eventos/<su slug>`; título y hora en `rgb(92, 92, 92)` (texto suave) y la foto con `grayscale(1)`. Corresponde a las capturas 16 y 17 del prototipo: renglones de producción, sin chevrón, como en «Programa».
- `03-acto-en-pasado.png`: la ficha del primer acto, abierta tocando su renglón (antes, «Esto ya no está»). Lleva:
  - la cabecera de siempre con el chip «YA PASÓ»;
  - los números «FUE · 19:00 / mié 7 oct», «COSTO / Gratis» y «FUERON / 0»;
  - solo «Compartir»;
  - «Parte de Festival de prueba: cine en la ciudad», «Dónde» con su lugar y «Sobre el evento»;
  - sin barra de «Voy» abajo.

  Medido: el título de la pestaña es «Función de apertura: cortometrajes invitados · Ya pasó · Somos Nosotros»; en la página no aparecen «Voy», «Me interesa», «A mi calendario», «Cómo llegar» ni «Esto ya no está», ni la sección «Quién va».

## Por confirmar

1. **«Fueron N»** en el tercer número de un evento suelto o un taller en pasado: cuenta quienes dijeron «Voy», que no es lo mismo que haber ido. Con 0 dice «Fueron 0». Las alternativas son quitar el número (quedan dos) o «Iban». Decidí «Fueron» porque el encargo lo sugería y va con el «Ya fui» de Y1.
2. **El chip** es uno solo, «Festival · Ya pasó», no dos chips: así `ui/Heroe` no cambia.
3. **Exposición en pasado:** «Cerró {día}» y «Abrió {día}» en vez de «Hasta» y el horario de hoy. Esto no venía en el prototipo: lo decidí yo.
4. **«· ya pasó» en cada renglón** de la sección «Ya pasó» repite el título de la sección. Lo dejé porque la captura 17 (X1 «como pasado») lo trae. Quitarlo es borrar `nota="ya pasó"`.
5. **El aviso para el autor** de un evento pasado y visible cambió de texto (el viejo decía que solo lo veían él y la administración).
6. **Metadatos:** «{título} · Ya pasó · Somos Nosotros», sin imagen. Antes era «Evento · Somos Nosotros».
7. **Un festival que ya terminó entero** queda con «Programa» vacío, la línea «… · ninguna por venir» y «Ya pasó» plegado. Quizá convenga abrirlo de entrada en ese caso.
8. **«Dónde» del festival** sigue contando en cada sede todas sus actividades, también las pasadas («3 actividades»). Es como en producción y no lo toqué.
