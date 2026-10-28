# 495 · Un festival en Instagram y Facebook: programa, artistas de sus actos y precio (OL-463)

**Fecha:** 2026-10-27. **Rama:** `instagram-festival`, base `origin/main` (`9a6ee6cb`). **Operador:** agente de la pieza (Gestor VII), sin otros
agentes. **Estado:** en código, espera la revisión del gestor. **Sin migración** y sin variables nuevas. Capturas: `docs/rediseno/capturas-495/`.

## El pedido

- Founder, 27 de octubre, al probar «Cultura Mística» (un festival con 11 actos): «no se etiquetan a todos los artistas. Además el festival se
  publicó como gratis pero hay diferentes precios en cada evento».
- Encargo del gestor: artistas del marco y de todos sus actos sin repetir (etiquetas y menciones, con el tope de Instagram); precio del festival
  derivado de sus actos, nunca «Gratis» por omisión; el programa en el texto después de 📍, recortado si no cabe; el festival como un solo renglón
  en la lista de Instagram; revisar exposiciones y talleres con sesiones.

## La causa

Un festival (clase `festival`, el marco) solo tiene ligados en `eventos_artistas` a quien lo organiza; los artistas de cada acto están ligados al
acto (`eventos.evento_padre_id` = el marco). El marco no suele tener `precio` y `armarTexto` ponía «Gratis» a todo lo que no tenía precio. La hoja
y el texto trataban al festival como un evento suelto, y la lista sugería el marco y cada acto por separado.

## Qué cambió

### El texto (`src/lib/instagram/texto.ts`, puro: lo usan la hoja en el teléfono y la acción en el servidor)

- **`artistasDe(e)`**: en un festival, los del marco y los de todos sus actos, sin repetir (por id; si no, por usuario o nombre). Orden: primero los
  que tienen Instagram (son los que se etiquetan); entre ellos, los del marco (quien organiza) y luego los de más actos; los demás después, en el
  orden del programa. Un evento suelto sigue con los suyos.
- **Etiquetas en la foto** (`etiquetasDeLaFoto`): el lugar y esos artistas, hasta **20** (`TOPE_ETIQUETAS_FOTO`, el tope de Instagram);
  `etiquetasQueNoCaben` dice cuántas sobran y la hoja lo dice en una nota («Instagram deja etiquetar a 20: van primero las de más actividades y N
  cuentas quedan fuera»).
- **Menciones**: cada @ **una sola vez** (la primera vez que sale) y como mucho 19 (la invitación lleva @smsnstrsapp: 20 en total). Quien ya está en
  el título del acto («Meditación con Martha Franco») no se repite: va solo su @.
- **Precio** (`precioDelTexto`, `precioDeActos`): el precio escrito del marco, tal cual. Sin precio (o si el marco dice gratis y hay actos que
  cobran), el de sus actos: todos gratis → «Entrada libre»; gratis y con costo → «Entrada libre · actividades con cooperación ($80–$130)» (el
  rango si hay cantidades); todos con costo → el rango («$80–$130») o su texto común («Cooperación solidaria»); actos sin precio (por confirmar) y
  ninguno que cobre → **nada** (no se sabe). Un evento de costo opcional (exposición, taller, festival, acto, inauguración; `costoOpcional`, OL-411)
  sin precio **no dice ninguno** (su ficha dice «Por confirmar»), y «Por confirmar» escrito tampoco. Un evento suelto sin precio sigue con «Gratis»
  (su costo era obligatorio: vacío es que eligió gratis).
- **Programa**: después de 📍 y el precio, un renglón por día con la hora, el acto y su artista: «Vie 9 · 5:30 pm Meditación con Martha Franco
  @marthafranco · 6:30 pm Taller de escritura con Gustoño · 9:00 pm Charla de tarot con @luna.arcana». Solo lo que falta (un festival en curso no
  repite lo que ya pasó); un acto con funciones sale en cada día. Debajo, «Con @…» con quien organiza. Si no cabe en 2 200 caracteres: primero los
  títulos cortos (`tituloCorto`, sin el nombre del festival delante) y luego menos actividades con «y N actividades más»; la cabeza, la invitación y
  las etiquetas siempre van.
- **Sesiones** (taller u horario por día): el cuándo dice sus sesiones y no un rango que parece diario a la hora de la primera: «3 sesiones: vie 9 ·
  5:00–7:00 pm, dom 11 · 6:00–8:00 pm y mar 13 de oct · 5:00–7:00 pm» (con la misma hora, una vez al final); si ya pasó alguna, «Quedan 2
  sesiones: …». Exposiciones y festivales siguen con su periodo.
- `yaDice(texto, nombre)`: si un texto ya dice un nombre (palabras enteras, sin acentos ni @), para no repetirlo.

### Lo que lee el servidor (`src/app/admin/instagram/datos.ts`)

- `cargarParaHoja`: en un festival lee sus actos publicados (visibles, no borrador, no cancelados, no retirados), con sus artistas, sus sesiones y su
  precio; el 📍 sale de las sedes de sus actos como en la app (`sedesDeFestival`: la única con su @, o «Varias sedes»); si no se pudieron leer, el
  festival se publica como antes. Además `opcional` (`costoOpcional` con su padre y si inaugura algo) y las sesiones (`eventos_sesiones` con fin).
- `cargarSugerencias`: lee los actos de los festivales de la lista (una consulta más, `eventos` por `evento_padre_id`) y con
  **`unRenglonPorFestival`** (`src/lib/instagram/elegir.ts`, pura) deja **un solo renglón por festival**, con «· 11 actos» en su cuándo; sus actos no
  se sugieren aparte mientras el festival esté en la lista. Un acto cuyo festival no está (oculto, terminado) sale como cualquier evento, y desde el
  «···» de su ficha se puede publicar siempre. La portada («M por publicar») y las ciudades cuentan ya con el festival agrupado. Si los actos no se
  pudieron leer, la lista va como antes.

### Lo demás

- **Facebook** (`src/lib/facebook/texto.ts`): quita los @ de todos los artistas del festival (también los de los actos); si el nombre ya está en el
  mismo tramo del programa, quita el @ sin repetir el nombre («Meditación con Martha Franco · …»).
- **Etiquetas en la foto** (`src/lib/instagram/api.ts`): con más de 10, en dos alturas alternadas (0.84 y 0.94) para que no se encimen.
- `acciones.ts`: acepta hasta 60 etiquetas quitadas (antes 20; un festival puede traer más).
- `HojaInstagram`: la nota de las etiquetas que no caben. Nada más cambia en la hoja.
- **La ficha del festival en la app no dice «Gratis»**: sin precio dice «Costo · Por confirmar» (OL-411, `textoCosto`), y las tarjetas y renglones
  no dicen costo si no lo hay (`costoEnLista`). Comprobado en `src/app/eventos/[id]/page.tsx` y en la captura 10; no se cambió.
- **Respaldo local**: `RESPALDO_FESTIVAL_IG=1` suma «Cultura Mística (demo)»: un marco en Aether sin precio, de pasado mañana a dentro de cuatro
  días, con quien lo organiza y once actos (gratis, $80, $100, $130) con nueve artistas (siete con Instagram; dos en dos actos). `npm run medir` no
  lo usa. La API de mentira apunta en el registro lo que llega a Instagram (`  instagram: {caption, user_tags}`).

## Texto armado por el código (Cultura Mística (demo), del respaldo)

```
Cultura Mística (demo)
Del 9 al 11 de oct
📍 Aether @aether.slp · San Luis Potosí
Entrada libre · actividades con cooperación ($80–$130)

Vie 9 · 5:30 pm Meditación con Martha Franco (demo) @marthafranco.demo · 6:30 pm Taller de escritura con Gustoño (demo) · 9:00 pm Charla de tarot con @luna.arcana.demo
Sáb 10 · 11:00 am Yoga kundalini con Paloma Ríos (demo) · 1:00 pm Mercadito místico · 5:00 pm Ceremonia de cacao con @sahumerio.demo · 7:00 pm Lectura de cartas con @ixchel.ramos.demo · 9:00 pm Tambores al atardecer con @tamborancestral.demo
Dom 11 · 12:00 pm Astrología básica con @rocio.mendoza.demo · 6:00 pm Concierto de cuencos con @oraculo.sonoro.demo · 8:30 pm Fogata y cantos de cierre con Tambor Ancestral (demo) y Martha Franco (demo)

Con @culturamistica.demo

Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).

#SanLuisPotosi #AgendaCultural #Festival #Musica #SomosNosotrxs
```

956 de 2 200 caracteres, 10 menciones (cada una una vez) y 9 etiquetas en la foto. En Facebook, el mismo texto con los nombres sin @, el enlace a la
ficha y la invitación de la página.

## Comprobado

- `npm run lint` (0 errores; los 2 avisos son de archivos ajenos), `npm run typecheck`, `npm test` (**4 737 pruebas** en 291 archivos; nuevas:
  `festival.test.ts` —artistas unidos sin repetir y en orden, tope de 20 etiquetas y 20 menciones con 27 cuentas, cada @ una vez, precio derivado en
  todos sus casos, el del marco que manda, costo opcional sin precio, programa por día, en curso solo lo que falta, quitar una etiqueta, programa
  recortado con títulos cortos y «y N actividades más» sin perder la invitación ni las etiquetas, funciones en cada día, Facebook sin @ ni nombres
  repetidos, sesiones de un taller, `yaDice`—; `unRenglonPorFestival` y `textoActos` en `elegir.test.ts`; las etiquetas en dos alturas en
  `api.test.ts`), `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (**2 556 pruebas, 0 fallaron**), `npm run inventario`
  (sin novedades), `npm run test:componentes` (**733 de 733**, con las 3 nuevas), `npm run medir` (60 pantallas × 4 anchos, **sin novedades**: el respaldo de siempre no cambia y s46/s47 miden lo mismo) y `npm run build`. Tras unir `origin/main` (`9a6ee6cb`, sin choques fuera de OPEN_LOOPS).
- **Componentes con toques reales** (`src/components/instagram/HojaFestival.componentes.test.mjs`, 3 de 3, con las filas del festival del respaldo):
  el festival como un renglón con «11 actos»; la hoja con las nueve etiquetas en orden, el precio de sus actos, el programa con cada @ una vez y el
  contador; quitar @luna.arcana.demo la saca del programa (queda su nombre) y «Publicar» manda lo quitado y el mismo texto.
- **Recorrido en la app** (`node scripts/ops/auditoria-ui/capturar-instagram-festival.mjs . <carpeta>`, Chrome real, la app compilada contra el
  respaldo con `RESPALDO_FESTIVAL_IG=1` y las APIs de mentira): **18 de 18 bien, sin errores de página ni de consola**: el festival es un solo
  renglón con «11 actos» y ninguno de sus actos va aparte; nueve etiquetas (lugar, quien organiza y los siete con Instagram), el precio de sus actos,
  el programa por día y cada @ una vez; quitar una etiqueta; publicar en las dos: Instagram recibe el texto de la hoja y ocho etiquetas, Facebook el
  programa con nombres y sin @; el «···» de un acto ofrece «Publicar en Instagram» y su hoja lleva su precio ($130); el taller con sus tres sesiones
  y su precio; la exposición sin precio sin «Gratis»; la ficha del festival con «Por confirmar»; **a 320, 390 y 430 sin textos cortados ni
  desplazamiento a lo ancho** (la lista y la hoja, arriba y abajo).

## Capturas (`docs/rediseno/capturas-495/`, 390 × 844, cada una abierta)

- `01-lista-festival`: «Para publicar» en San Luis Potosí; «Cultura Mística (demo)» en un renglón: «Del 9 al 11 de oct · 11 actos», «Aether»,
  «Sin cartel · 0 van · 0 les interesa». Ninguno de sus actos en la lista; abajo «Ya en Instagram» con Susurros.
- `02-hoja-festival`: la hoja con el diseño de Crear cartel del festival, «Otro diseño» y las primeras etiquetas (@aether.slp,
  @culturamistica.demo, @marthafranco.demo, @tamborancestral.demo).
- `03-hoja-etiquetas`: las nueve etiquetas con su ✕, «Ubicación: San Luis Potosí», el texto (956/2200), «También en Facebook» y «Publicar».
- `04-texto-programa`: el texto a pantalla completa: título, «Del 9 al 11 de oct», 📍 Aether @aether.slp, «Entrada libre · actividades con
  cooperación ($80–$130)», el programa de vie 9, sáb 10 y dom 11, «Con @culturamistica.demo», la invitación y las etiquetas.
- `05-etiqueta-quitada`: sin @luna.arcana.demo, con «Volver a etiquetar»; el contador pasa a 957 (queda «Luna Arcana (demo)» en el programa).
- `06-publicado`: la imagen y «Instagram: publicado · Ver», «Facebook: publicado · Ver», «Listo».
- `07-acto-menu`: la ficha de «Charla de tarot» con su «···»: «Publicar en Instagram · En @smsnstrsapp» después de «Destacar».
- `08-taller-sesiones`: el texto del taller de grabado: «3 sesiones: vie 9 · 5:00–7:00 pm, dom 11 · 6:00–8:00 pm y mar 13 de oct · 5:00–7:00 pm» y
  «$300».
- `09-exposicion-sin-precio`: «Un mundo para mí», «Hasta el dom 8 de nov», el MUNI con su @ y ningún precio (antes decía «Gratis»).
- `10-ficha-festival`: la ficha del festival en la app: «Actividades 11 · Costo Por confirmar · Sedes 1» (no dice «Gratis»; no cambió).

## Decisiones por confirmar (founder o gestor)

1. **Quien organiza va primero** entre las etiquetas (antes que los de más actos): es el marco. El encargo decía «prioriza los que tienen @; si
   sobran, los de más actos».
2. **«Gratis» del marco con actos que cobran**: se lee como «la entrada es libre» y se dice el resto («Entrada libre · actividades con cooperación
   ($80–$130)»). Cualquier otro precio escrito del marco manda tal cual. El encargo decía «si el marco tiene precio, úsalo».
3. **Actos sin precio** (por confirmar) y ninguno que cobre: el texto no dice precio, en vez de «Entrada libre».
4. **El precio va antes del programa** (en la cabeza, como en lo firmado): Instagram enseña solo las primeras líneas antes de «más», y el precio es
   lo que más se pregunta. El programa va después.
5. **«11 actos»** en el renglón, como dice el encargo; la app dice «actividades» en la ficha del festival («Actividades 11», «3 actividades» por
   sede). ¿Se dice igual en los dos lados?
6. **La ficha del festival** sigue con «Costo · Por confirmar» cuando el marco no tiene precio: no decía «Gratis», así que no se tocó. Se podría usar
   ahí el precio derivado de sus actos (la misma `precioDeActos`) si el founder lo quiere.
7. **Varias sedes**: si los actos son en varios lugares, el 📍 dice «Varias sedes · Ciudad» (como la app) y no se etiqueta a ningún lugar; el lugar
   de cada acto no sale en el programa (alargaría mucho el texto).
8. **Precio de un taller**: el texto dice el precio escrito tal cual («$300»); la app no sabe si es por sesión o por todo el taller (cada quien lo
   escribe a su modo, p. ej. «$300 por las tres sesiones»). No se cambió.
9. Una exposición sin precio ya no dice «Gratis» en Instagram (su ficha dice «Por confirmar»): si de verdad es de entrada libre, hay que escribirlo
   en su precio.

## Lo que el gestor debe probar en producción

1. Unir (sin migración ni variables nuevas).
2. Administración › Instagram en San Luis Potosí: «Cultura Mística» debe salir en un solo renglón con «· 11 actos» y ninguno de sus actos aparte.
3. Abrir su hoja: las etiquetas deben ser el lugar, quien lo organiza y los artistas de sus actos con Instagram; el texto con el precio de sus actos
   (no «Gratis») y el programa por día. Publicar (también en Facebook) y comprobar en las dos que salen los nombres y, en Instagram, las etiquetas.
4. Si una cuenta es privada, Instagram la rechaza y la publicación sale sin etiquetas (lo dice la hoja): conviene quitar antes las cuentas que no se
   sabe si son públicas.
