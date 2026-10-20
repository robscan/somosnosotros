# 455 · La ceja de la tarjeta de Inicio no se corta: «7 nuevas» en vez de «7 actividades nuevas» (OL-422)

**Fecha:** 2026-10-19. **Rama:** `ceja-actividades`, base `origin/main` (`7d9a7f8d`). **Operador:** agente de la pieza (Gestor VII), sin otros agentes.
**Sin migración** y sin variables de entorno nuevas.
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido (founder, 19 de octubre, con captura de su iPhone)

«No cabe el letrero de "X" Actividades nuevas». En «Nuevos eventos», la tarjeta mediana de un festival con portada del sistema mostraba la ceja en
dos renglones, «FESTIVAL ·» y debajo «7 ACTIVIDADES NUE», cortada sin puntos suspensivos. Venía de OL-418 (bitácora 451, §2), que cambió «3 actos
nuevos» por «3 actividades nuevas» en `textoActosNuevos`, la misma función para la ceja y para el renglón de la agenda.

Después, el mismo día, el texto corto (palabras del founder, por el gestor): **«Puedes dejar solo 1 nueva. 7 nuevas.»** La ceja dice «FESTIVAL ·» y
debajo «7 NUEVAS» (en singular «1 NUEVA»); el renglón de la agenda sigue diciendo «7 actividades nuevas». (El encargo proponía «+7 actividades»;
esta decisión lo sustituye.)

## Por qué se cortaba

La ceja juntaba sus partes con espacios duros dentro de cada parte («7 actividades nuevas» era una sola palabra para el navegador). Si una parte
no cabía sola en un renglón, no tenía dónde bajar: se salía de su caja y la portada del sistema (`overflow: hidden`) la recortaba en seco. Debajo de
un cartel no se recortaba, pero se salía de la tarjeta encima de la siguiente. Captura 07: «13 ACTIVIDADES NUEV» con el código de antes.

## Lo que cambió

1. **El texto corto, solo en la ceja.** `textoNuevasCorto(n)` en `src/lib/series.ts`: «1 nueva», «7 nuevas». La usa solo `tarjetaDePieza`
   (`src/lib/tarjetaInicio.ts`) para la tarjeta de un festival con actividades nuevas: la ceja es «Festival · 7 nuevas». El renglón de la pestaña
   Nuevos de la agenda (`AgendaInicio.tsx`, `textoActosNuevos`) sigue con «7 actividades nuevas», que ahí cabe (captura 06). Al día los
   comentarios que todavía decían «3 actos nuevos» (`tarjetaInicio.ts`, `inicio.ts`, `AgendaInicio.tsx`).
2. **La ceja nunca se corta** (las dos: dentro de la portada del sistema y debajo del cartel). Un solo componente para su texto, `TextoCeja`
   (`src/components/inicio/PortadaSistema.tsx`, que también usa `TarjetaEvento`):
   - las partes se separan con « · » y el punto se queda pegado a la parte de antes («FESTIVAL ·» / «7 NUEVAS»);
   - cada parte después de la primera va en su trozo (`.parte`, `display: inline-block`): entera mientras quepa en un renglón; si no cabe junto a
     la anterior, baja entera; si ni sola cabe, baja por sus espacios. Sin espacios duros dentro de las partes, sin `nowrap`, sin medidas nuevas;
   - último recurso, `overflow-wrap: anywhere` en la ceja: una palabra que ni sola cabe en su renglón (solo pasa con la letra del teléfono muy
     grande, OL-373) se parte donde llegue en vez de salirse (captura 11).
   - El título no tiene que ceder: si la ceja ocupa un renglón más, primero se achica el campo de las figuras y, si no alcanza, la portada crece
     (la regla de siempre de la portada del sistema, OL-375 y OL-373). Nada se corta ni se pisa: en todas las tallas el título empieza debajo de la
     ceja (lo comprueba la prueba).
3. **Una prueba que lo vigila:** `src/components/inicio/CejaTarjeta.componentes.test.mjs` (corre en `npm run test:componentes`, en la CI). Pinta los
   tres carriles de verdad (`Destacados` en XL, grande y mediana) con ocho cejas: «Festival · 1/7/13 nuevas» (escritas por `textoNuevasCorto`),
   «Festival · 13 actividades nuevas» (la frase larga de antes, para forzar), «Taller · Sesión 12 de 12», «Expo», «Festival · Día 12 de 14» y «6
   funciones», con portada del sistema y, las que no tienen clase, también con cartel. Tres pruebas:
   - a 320, la mediana con «FESTIVAL · 13 NUEVAS» dice ese texto y su texto no sale de su caja ni de la tarjeta;
   - a 320, 390 y 430, ninguna ceja de ninguna talla sale de su caja ni de la tarjeta, el título va debajo y «FESTIVAL · 1/7/13 NUEVAS» ocupan dos
     renglones como mucho en la mediana;
   - a 320 con la letra al doble (32 px, como `npm run medir -- --letra=2`), ninguna ceja sale de su tarjeta.
   Con el código de antes fallan la segunda y la tercera («13 ACTIVIDADES NUEVAS»: el texto sale 24 px de la tarjeta). Con `CEJA_CAPTURAS=<carpeta>`
   guarda las tarjetas en filas por talla y ancho, y con `CEJA_FUENTE=<archivo>` las pinta con esa letra (sin ella, una de palo seco: la Bricolage
   la pone next/font en la app, no en la prueba).
4. **Datos inventados para verlo en la app.** En el respaldo local, con `RESPALDO_NUEVAS=1` (`npm run medir` no lo pone): «Festival Raíces Sonoras
   (demo)», publicado hace 20 días, con siete actividades de hoy, y «Muestra de Danza Contemporánea (demo)», hace 25 días, con una de hoy.
   `scripts/ops/auditoria-ui/capturar-ceja-actividades.mjs` arma la app contra ese respaldo (se niega si hay `.env`), saca las capturas de Inicio y
   de la agenda y mide las cejas del carril.

## Comprobado por talla y ancho

Las tarjetas tienen ancho fijo por talla (132 la mediana, 165 la grande, 280 la XL; crecen desde 1048 px), así que a 320, 390 y 430 cada tarjeta
mide lo mismo; la prueba lo mide igual en los tres.

| Talla | «Festival · 1 nueva» | «Festival · 7 nuevas» | «Festival · 13 nuevas» | Taller · Sesión 12 de 12 / Expo / Día 12 de 14 / 6 funciones | Frase larga («13 actividades nuevas») |
|---|---|---|---|---|---|
| Mediana (Esta semana, Nuevos, Más adelante) | un renglón | «FESTIVAL ·» / «7 NUEVAS» | «FESTIVAL ·» / «13 NUEVAS» | dos renglones las de dos partes, uno las de una | tres renglones, entera (antes: cortada) |
| Grande (Tus planes, Festivales y expos) | un renglón | un renglón | un renglón | un renglón | «FESTIVAL ·» / «13 ACTIVIDADES NUEVAS» (antes: cortada) |
| XL (Destacados) | un renglón | un renglón | un renglón | un renglón | un renglón |

En la app (respaldo local, Chrome de la Mac, 2×), el carril «Nuevos eventos» mide a 390, 320 y 430 lo mismo: «FESTIVAL · 1 NUEVA» en un renglón
(le sobran 5 px) y «FESTIVAL · 7 NUEVAS» en dos (a su renglón más largo le sobran 54 px).

Con la letra al doble, en la mediana: «FESTIVAL ·» / «13» / «NUEVAS», «TALLER ·» / «SESIÓN» / «12 DE 12», y «6 FUNCIONE» / «S» (la palabra sola
no cabe: se parte; antes se cortaba la «S»). Ver «por confirmar».

## Verificación

En el árbol sin `.env`: `npm run lint` (sin errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test`
(230 archivos, **4046 pruebas**), `npm run inventario` (sin novedades: ningún bloque duplicado ni medida en duro nuevos), `npm run medir` (41
pantallas × 4 anchos, sin novedades tras anotar el presupuesto, abajo) y las pruebas de componentes de Inicio (`src/components/inicio/*.componentes.test.mjs`,
36 en verde, las tres nuevas incluidas). `series.test.ts`: la ceja del festival es «Festival · 3 nuevas»; «1 nueva», «7 nuevas», «13 nuevas»;
`textoActosNuevos` sigue en «1 actividad nueva», «7 actividades nuevas».

**Segunda vuelta (la CI, corrida 39355008897, trabajo «interfaz»):** fallaba `Destacados.componentes.test.mjs` («firmada: la clase arriba del
título…»): buscaba la ceja como el primer span con letra espaciada sin otro span dentro y, con `TextoCeja`, encontraba el trozo de la segunda parte
(«SESIÓN 1 DE 4» en vez de «TALLER · SESIÓN 1 DE 4»). Se arregla la prueba, no el componente: la ceja es el span espaciado cuyo padre no está dentro
de otro span espaciado (el trozo hereda el espaciado). Las demás pruebas que buscan la ceja por su espaciado miran los hijos directos o el primero en
orden del documento (el de fuera): no cambian. Suite completa de componentes (`npm run test:componentes`): **634 de 634**; `lint`, `typecheck` y
`npm test` (4046) en verde.

**Presupuesto de `medir` (decide el gestor):** el trozo de la segunda parte es un elemento más por ceja de dos partes: `01-inicio` 372→375 nodos
(374→377 a 820 y 1280; tres cejas de dos partes), `s01-inicio-sesion` y `s28-inicio-banner-compartir` 377→378 (379→380). La profundidad no cambia.
Anotado con `npm run medir -- --aceptar` en `medidas.aceptadas.json` (solo esas tres pantallas cambian). Si el gestor prefiere no subirlo, hay
una forma sin nodos (la primera parte en un `::before` con `attr()` y la ceja en `flex-wrap`), menos clara y con el texto fuera del DOM.

### Capturas (`docs/rediseno/capturas-455/`, PNG sin comprimir, abiertas una por una)

Las de la app: `RESPALDO_NUEVAS=1`, la sesión inventada de Ana, reloj fijo el mié 7 de oct a las 10:00 (el de `medir`), Chrome de la Mac a 2×.
Las imágenes de fuera se contestan con un gris: OCA lleva su cartel del respaldo.

1. `01-inicio-nuevos-390.png` (390×844): «Nuevos eventos»: la Muestra de Danza con «FESTIVAL · 1 NUEVA» en un renglón y el título debajo; OCA;
   a la derecha asoma Raíces Sonoras con «FESTIVAL ·» / «7 NUEVAS» enteros.
2. `02-inicio-nuevos-390-siete.png`: el carril deslizado: Raíces Sonoras entera, sello «oct 21–27», «FESTIVAL ·» / «7 NUEVAS», el título en dos
   renglones, «Del 21 al 27 de oct» y «Varias sedes · 7 activid…».
3. `03-inicio-nuevos-320.png` (320×568): la Muestra de Danza con «FESTIVAL · 1 NUEVA» entera y OCA.
4. `04-inicio-nuevos-320-siete.png`: a 320, Raíces Sonoras con «FESTIVAL ·» / «7 NUEVAS».
5. `05-inicio-nuevos-430.png` (430×932): las tres tarjetas a la vista; las dos cejas enteras.
6. `06-agenda-nuevos-renglon.png`: la pestaña Nuevos de la agenda: «Del 21 al 27 de oct · 7 actividades nuevas» y «Del 22 al 24 de oct · 1
   actividad nueva» (la frase entera, sin cambios).
7. `07-antes-mediana-320.png`: la prueba con el código de antes (mediana a 320, Bricolage): «FESTIVAL · / 13 ACTIVIDADES NUEV» cortada, el mismo
   corte que en el iPhone del founder.
8. `08-mediana-320.png`: lo mismo con el código nuevo: «13 ACTIVIDADES / NUEVAS» entera; «FESTIVAL · 1 NUEVA» en uno; «FESTIVAL ·» / «7 NUEVAS» y
   «13 NUEVAS» en dos; «TALLER ·» / «SESIÓN 12 DE 12»; «FESTIVAL ·» / «DÍA 12 DE 14»; «EXPO»; «6 FUNCIONES» con portada y debajo del cartel.
9. `09-grande-320.png`: la grande: todas en un renglón salvo la frase larga («FESTIVAL ·» / «13 ACTIVIDADES NUEVAS»).
10. `10-xl-320.png`: la XL: todas en un renglón.
11. `11-mediana-320-letra-doble.png`: la mediana con la letra al doble: nada sale de la tarjeta; «13» / «NUEVAS» bajan por su espacio y «6
    FUNCIONE» / «S» se parte.

Las 7 a 11 salen de la prueba con `CEJA_CAPTURAS` y `CEJA_FUENTE` (la Bricolage variable de la Mac del founder); el título del carril dice «Talla …»
y las tarjetas van en filas en vez de deslizarse (mismo ancho de columna que su carril).

## Por confirmar

1. **«Festival · 7 nuevas» también en el nombre del enlace** (lo que lee VoiceOver: «Festival Raíces Sonoras. Festival · 7 nuevas. Del 21 al 27…»):
   usa la misma parte que la ceja. Si se prefiere «7 actividades nuevas» para quien no ve, es una línea en `nombreDeTarjeta`.
2. **Con la letra del teléfono muy grande, una palabra que no cabe sola se parte** («6 FUNCIONE» / «S» en la mediana) en vez de cortarse. La otra
   salida sería un guion («FUNCIO-» / «NES», `hyphens`) o un tope más bajo para la letra de la ceja.
3. **El presupuesto de `medir`** sube 3 nodos en Inicio (arriba).
4. **Fuera de esta pieza, visto en las capturas:** la línea gris de la tarjeta del festival dice «Varias sedes · 7 actividades» (el programa entero)
   y en la mediana se corta con «…» («Varias sedes · 7 activid…», «Teatro de la Paz · 1 acti…»): es la línea de una sola línea con puntos
   suspensivos de siempre, pero repite casi lo que ya dice la ceja.

## Lo que no se tocó

`AgendaInicio.tsx` solo cambia un comentario (el renglón sigue con `textoActosNuevos`). Nada de Buscar, Administración, el paso del nombre del alta,
`ui/useCampoVisible` ni `ui/Hoja`.
