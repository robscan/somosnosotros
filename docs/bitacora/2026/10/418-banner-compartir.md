# 418 · El banner para compartir la app en Inicio y Destacados en XL+ (OL-387)

**Fecha:** 2026-10-12. **Rama:** `banner-compartir`, base `origin/main` (`567f202e`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## Lo que se lleva a la app

Lo que firmó el founder el 12 de octubre a las 12:40 en el prototipo `docs/rediseno/prototipos/inicio-propuestas.html` (rama `prototipo-banner-compartir`, bitácora 417), preajuste **«Firmada»**: «B1 tras Destacados · B2 símbolo · D2 XL+». Lo que no dijo queda como lo propuso el gestor en la 417: visitas contadas en el teléfono por día distinto, la × lo esconde 30 días, tras compartir no vuelve, «Nosotrxs» tal cual.

1. **D2 · Destacados en XL+** («aprovecha para crecer proporcionalmente un poco más el carril de destacados/seleccionados para ti»). El carril estelar («Destacados» o «Seleccionados para ti») pasa de 248×310 a **280×350** (4:5): se ve una tarjeta y un cuarto. El título bajo el cartel a **21 px** (antes 19), las líneas de abajo siguen a 17; dentro de la portada del sistema, el título a **26 px** (antes 24), la zona con 16 de relleno como ya estaba. No hay tamaño nuevo: cambian los tokens del tamaño `xl` (`--tarjeta-xl` = la grande × 280/165, `--letra-portada-xl` a 26 y `--letra-titulo-xl` nuevo, 21). Desde 1048 px la XL+ crece con la grande en la misma proporción: **322,4×403** (antes 285,6×357). El esqueleto de carga usa los mismos tokens, así que mide lo mismo. La imagen pide `(min-width: 1048px) 323px, 280px`.
2. **B1 y B2 · El banner** (`src/components/inicio/BannerCompartir.tsx` + `.module.css`). A lo ancho con el aire de los carriles (20 a los lados, 32 arriba), fondo violeta claro (`--primario-suave`), esquinas de 12, relleno de 16, una sola rejilla plana: a la izquierda un círculo blanco de 44 con el **símbolo SN** en violeta (26 de ancho); «¿Te gusta Somos Nosotrxs?» (18 px, 800, ancho de título) y debajo «Compártela con tus amigxs.» (15 px); arriba a la derecha una × de 36 (se toca de 44) con el nombre «Cerrar»; abajo, a lo ancho, «Compartir» (44 de alto, píldora violeta, con el icono de compartir). Va en `Inicio.tsx` justo después del carril estelar y antes de «Tus planes», **solo con sesión**.
3. **Cuándo sale** (`src/lib/visitasInicio.ts`, con pruebas). Ver «La regla de visitas» abajo.
4. **Compartir.** Con la hoja del teléfono (`navigator.share`): título «Somos Nosotrxs», texto «¿Te gusta Somos Nosotrxs? Compártela con tus amigxs.» y el enlace `https://somosnosotros.org`. Si la persona cierra la hoja sin compartir, el banner se queda y no cuenta. Si compartió, el banner se va con el aviso «Gracias por compartir» y no vuelve. Sin hoja (escritorio), copia `https://somosnosotros.org` y avisa «Enlace copiado» (el banner también se va). Si la hoja falla por otra razón, copia el enlace. Los avisos son los de siempre de Inicio (`PantallaConAviso`, el canal único de avisos, OL-284).
5. **La ×** quita el banner y avisa «Cerrado: no vuelve a salir en 30 días» con «Deshacer», como el prototipo (captura 09 de la 417); «Deshacer» lo devuelve tal como estaba.

## La regla de visitas, en palabras llanas

- El teléfono anota, cada vez que alguien con sesión abre Inicio, **qué día es** (el día de la ciudad). Si ya lo había anotado ese día, no anota nada: recargar o volver diez veces el mismo día cuenta como una.
- Guarda como mucho los últimos 10 días distintos.
- El banner sale **desde el tercer día distinto** («más de 2 veces»): el día 1 y el día 2 no sale; el día 3 sí.
- La × lo esconde **30 días** (vuelve el día 30 después de cerrarlo).
- Tras compartir (o copiar el enlace), **no vuelve nunca** en ese teléfono.
- Todo vive en el teléfono (`localStorage`, una sola llave: `somosnosotros:inicio-compartir`). Sin red, sin tabla, sin migración: el servidor no sabe nada de las visitas de nadie. Si el teléfono no deja guardar (modo privado, almacenamiento bloqueado o lleno), el banner no sale: sin memoria no se podría recordar la ×.
- Se decide después del primer pintado (como «lo nuevo» de Nuevos eventos): el servidor pinta Inicio sin banner y el teléfono lo añade si toca. Cuando no toca, no ocupa nada.

## Medición (`npm run medir`)

- Inicio con sesión (`s01-inicio-sesion`) **no cambia** (368 nodos, 370 desde 820): el navegador de la medición nunca abrió Inicio antes, así que el banner no sale.
- Para que el banner sí se mida, una pantalla nueva: **`s28-inicio-banner-compartir`**, Inicio con sesión en la tercera visita (dos días ya guardados; paso `banner-compartir` en `medir-pantallas.mjs`). Mide **377 nodos (379 desde 820)**, 9 más que sin banner, profundidad 11. Presupuesto anotado a mano en `medidas.aceptadas.json`. Pasa todas las reglas (toques de 44, nada fuera de su caja, sin margen negativo: la × se corre 6 hacia la esquina con `top`/`right` y no con margen) y también con `--letra=2`.
- La medición completa dice «1 pantallas bajaron de nodos»: es `s24-ficha-exposicion` (84 contra 86 aceptados), que esta pieza no toca; ya venía así de `main`. No se anotó (el `--aceptar` reescribe los presupuestos de todas).

## Código

- `src/lib/visitasInicio.ts` (nuevo) y `visitasInicio.test.ts` (10 pruebas): leer y validar lo guardado, anotar el día, decidir, cerrar 30 días, marcar compartido, sin almacenamiento no sale; y el pequeño almacén externo (`useSyncExternalStore`) con el que el banner sabe si está a la vista.
- `src/components/inicio/BannerCompartir.tsx` + `.module.css` (nuevos) y `BannerCompartir.componentes.test.mjs` (5 pruebas en Chrome real).
- `src/components/Inicio.tsx`: el banner tras el carril estelar, solo con sesión.
- `src/app/globals.css`: `--tarjeta-xl` (280/165), `--letra-portada-xl` (26), `--letra-titulo-xl` (21, nuevo). `src/components/inicio/TarjetaEvento.module.css` (el título de la XL a 21), `PortadaSistema.module.css`, `Destacados.module.css`, `CarrilEsqueleto.tsx` (comentarios), `src/lib/imagenOptima.ts` (+ prueba).
- Pruebas actualizadas: `Destacados.componentes.test.mjs` (XL+ 280×350 y 322,4×403; título 21 y 26) e `Inicio.componentes.test.mjs` (el estelar en 280×350; prueba nueva que fija el orden: banner tras el estelar y antes de «Tus planes»; con un día previo no sale; sin sesión no sale).
- `scripts/ops/auditoria-ui/medir-pantallas.mjs`, `pantallas-sesion.json`, `medidas.aceptadas.json`: la pantalla `s28`.

No se tocaron los archivos de OL-385 (`src/lib/inicio.ts`, `agenda.ts`, `series.ts`, `CarrilNuevos.tsx`, `CarrilAgenda.tsx`, `src/app/eventos/[id]/page.tsx`) ni `src/app/page.tsx` (Inicio ya recibe `conSesion` y la zona).

## Verificación

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (201 archivos, 3635 pruebas), `npm run build` y `npm run medir` (38 pantallas con la `s28`, sin novedades; también `--solo=inicio --letra=2`, sin novedades).
- **Componentes** (Chrome de la Mac, playwright-core): `BannerCompartir` (5), `Inicio` (10) y `Destacados` (26), en verde.
  - Banner: con dos días guardados sale el tercero, a 20 de cada lado, 32 arriba, relleno 16, esquinas 12; círculo de 44 blanco con el SN de 26 en violeta; título 18/800 y texto 15; × de 36 a 10 de la esquina; «Compartir» de 318×44 en píldora con icono; orden Destacados → banner → Tus planes. No sale con un día, con tres visitas el mismo día, cerrado hasta mañana, ya compartido ni sin almacenamiento; sale el día en que termina el descanso. La × lo quita, avisa y guarda `cerradoHasta` = hoy + 30; «Deshacer» lo devuelve. Sin hoja: copia `https://somosnosotros.org`, «Enlace copiado», se va y queda compartido. Con hoja: le pasa título, texto y enlace; compartida, «Gracias por compartir» y se va; cancelada (`AbortError`), se queda, no copia y no cuenta. Todos los toques por coordenadas.

## Capturas (`docs/rediseno/capturas-418/`)

La app compilada contra el respaldo local (`scripts/ops/auditoria-ui/respaldo-local`, datos inventados), reloj fijo el lun 12 de oct a las 10:00, la sesión inventada de Ana, en el Chrome de la Mac a 390×844 (2×), con los días de visita puestos en el teléfono antes de abrir. Sin `.env.local`: las variables del respaldo se pasan al compilar y al arrancar. **Ni una lectura a producción:** `/_next/image` se contesta en el navegador con las imágenes del prototipo firmado (carpeta `inicio-propuestas/` de su rama) y todo lo de fuera se corta; por eso algunos carteles no son de su evento (como en la 413). Guion en el scratchpad de la sesión. Abiertas una por una y comparadas con las 02, 03 y 05 de `capturas-417`.

- `01-arriba-destacados-xl-plus-280.png` — Inicio arriba: «Ahora» y «Seleccionados para ti» en XL+ (280×350): una tarjeta y un cuarto, «Master Class - 9° Festival de Cine UASLP» a 21 px en dos líneas, la fecha en violeta y el lugar en gris. Como la 02 del prototipo.
- `02-banner-tras-destacados-tercera-visita.png` — tercera visita: justo bajo el carril, el banner con el SN en su círculo blanco, «¿Te gusta Somos Nosotrxs?», «Compártela con tus amigxs.», la × y «Compartir»; luego «Tus planes». Como la 05 del prototipo (la pinta firmada «símbolo»).
- `03-segunda-visita-sin-banner.png` — segunda visita: tras el carril va directo «Tus planes».
- `04-cerrado-no-vuelve-en-30-dias.png` — tras la ×: el banner se fue y abajo el aviso «Cerrado: no vuelve a salir en 30 días · Deshacer».
- `05-enlace-copiado.png` — sin hoja de compartir (escritorio): tras «Compartir», el banner se fue y abajo «Enlace copiado».

## Por confirmar con el founder

1. **Copiar el enlace (escritorio) cuenta como compartir:** el banner se va y no vuelve. Si se prefiere que solo la hoja del teléfono cuente, es una línea.
2. **El aviso tras compartir** dice «Gracias por compartir» (el brief pedía «un aviso corto» sin texto). La hoja del teléfono no dice si de verdad se envió: se da por hecho al no cancelarla.
3. **«Nosotrxs»** tal cual en el banner y en el texto que se comparte (la marca es «Somos Nosotros»; la 417 lo dejó por confirmar).
4. **El conteo es por teléfono, no por cuenta:** dos cuentas en el mismo teléfono comparten conteo, y la misma persona en dos teléfonos empieza de cero en cada uno. Por cuenta haría falta una columna en la base.
5. **La XL+ desde 1048 px crece con la grande** (322,4×403), como la XL de la 413 (por confirmar 1 de esa bitácora). Si en tableta y escritorio la quiere fija en 280, es un token.

## Lo que no entra aquí

Las otras pintas (suave, violeta) y posiciones del banner (tras «Tus planes», al final) no se firmaron. Medir cuántas personas comparten no entra (BotonCompartir solo mide las fichas; compartir la app no se mide).

## Nota del gestor al unir (2026-10-12, 12:50)

Al traer `main` (con OL-385) la CI falló en `npm run inventario`: `medidasEnDuro` subió de 333 a 342 (las 9 son del banner: 44 px del círculo del símbolo y del toque de la ×, 36 px de la × visible, 26 px del símbolo, 6 y 2 px de ajustes). Cada rama pasaba sola con su propia línea base; juntas, no. Aceptadas con `npm run inventario -- --aceptar` (342). Los 44 y 36 podrían ser tokens (`--toque-min`, `--sello-chico`): queda como mejora chica.
