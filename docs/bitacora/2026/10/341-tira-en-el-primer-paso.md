# 341 · La tira Evento · Lugar · Artista vuelve en el primer paso del alta de evento

**Pieza:** OL-313. **Rama:** `tira-en-el-primer-paso` (sobre `origin/main` `bc1f983d`). **Fecha:** 2026-10-06. **Operador:** Claude Sonnet 5.5 (agente del gestor IV).
**Estado:** hecho y probado en Chrome (headless) con los componentes reales y con la app compilada contra el respaldo local; falta el iPhone real (lista al final). Sin migraciones.

## Qué se encargó

El founder vio en producción, tras OL-312 (bitácora 340): «en “+” ya no aparecen los creadores de lugar y artistas; aunque no estén las nuevas versiones no elimines lo que ya tenemos». Antes, el «+» de Inicio y Agenda abría `/nuevo` con la tira de tipos (Evento · Lugar · Artista) y se podía pasar a registrar un lugar o un artista; ahora abre directo el alta de evento por pasos y esa salida desapareció. Se pidió devolver la tira **solo en el primer paso** («Sube el cartel» y «No tengo cartel»), abajo, donde iría el pie, con «Evento» marcado y «Lugar» y «Artista» como enlaces a `/nuevo?tipo=lugar` y `/nuevo?tipo=artista` (con `?ciudad=` si el flujo la trae), sin duplicar el CSS de la tira de `Alta.tsx`.

## Qué hay

- **`src/app/nuevo/TiraTipos.tsx` + `TiraTipos.module.css` (nuevos):** la tira de siempre, sacada de `Alta.tsx` y de `Alta.module.css` sin cambiar un píxel de su pinta (misma altura de 56 + zona segura, mismos 64 de ancho mínimo, mismo punto debajo del marcado). Una sola pieza para los dos usos: recibe `actual` y `destinos` (una dirección = enlace que reemplaza la entrada y pasa por la guardia de salida; una función = botón con `aria-pressed`; nada = es esta pantalla, con `aria-current="page"`). `role="group"` con nombre «Qué publicar», como hoy.
- **`Alta.tsx` (`/nuevo`, lugar y artista):** usa `TiraTipos` con `evento` como enlace y Lugar y Artista como botones. Se ve y se comporta igual (captura 04 contra la 01 de la bitácora 340: idénticas). Pierde su `useRouter`, su manejador del enlace y el CSS de la tira.
- **`AltaEvento.tsx`:** en el primer paso (no mientras se sube o se lee un cartel: la espera no la lleva) pinta `TiraTipos actual="evento"` con Lugar y Artista como enlaces a `enlaceAltaDeTipo(tipo, ciudad)` (nuevo en `lib/armazon.ts`): `/nuevo?tipo=lugar` y `/nuevo?tipo=artista`, más `&ciudad=<slug>` si la pantalla trae una ciudad conocida (`ciudadContexto`). En cuanto se avanza (o se sube un cartel), la tira desaparece; con Atrás al primer paso vuelve.
- **Maquetación:** la tira es un `footer` hijo directo de la columna de `PorPasos`: así no recibe el aire de los lados ni entra de lado (la regla de la columna excluye a `footer`), y `margin-top: auto` la lleva al fondo aunque el paso sea corto. En la rejilla de `/nuevo` ese margen no hace nada. Sin envoltorios nuevos, sin `:has()` ni medidas por pantalla. El recuadro del cartel y «No tengo cartel» no cambian.
- **Guardia:** la tira pasa por `pedirSalida` como lo hacía «Evento» en `/nuevo`. En el primer paso no hay nada escrito: la guardia deja pasar sin preguntar. Si se vuelve con Atrás al primer paso después de escribir algo, sí pregunta «¿Salir sin publicar?» antes de ir a Lugar o Artista (es lo mismo que hace la ✕).

## Decisiones del operador (dentro de lo encargado, dichas explícitamente)

1. **«Evento» marcado es un `span` con `aria-current="page"`, no un enlace a sí mismo.** El encargo pedía «Evento marcado»; un enlace a la pantalla en que ya se está sería foco de teclado y lector sin salida. Se ve igual que el marcado de `/nuevo` (más oscuro y con su punto).
2. **El lugar también lleva `?ciudad=`.** `enlaceDeAlta` (el «+» de Lugares) no la pone al lugar porque se ubica por su punto; pero `/nuevo` sí la lee para acercar la búsqueda de dirección del lugar (corrección del gestor, PR 249). Como el encargo dice «conservando `?ciudad=`» sin distinguir tipos, uso una función aparte, `enlaceAltaDeTipo`, y dejo `enlaceDeAlta` como estaba.
3. **La tira sale en el primer paso aunque se entre con `?lugar=`, `?artista=` o `?desde=`.** Es el mismo primer paso y antes de OL-312 la tira estaba en todo `/nuevo`. Los enlaces no llevan esos datos: registrar un lugar o un artista es otra tarea.
4. **El presupuesto de nodos de `s15-alta-evento-pasos` sube de 20 a 21** (`medidas.aceptadas.json`). La pantalla venía en 17 (bajó con la bitácora 333 y nadie lo anotó); la tira suma 4 nodos (el `footer` y sus tres tipos): 21. Es el número de hoy a 320 y 390; 55 a 820 y 1280 (antes 54). Profundidad sin cambios (6).
5. **Las dos excepciones de teclado de «Lugar» y «Artista»** siguen igual; solo cambia su texto, que ahora nombra `nuevo/TiraTipos.module.css` donde antes decía `nuevo/Alta.module.css`. En el primer paso los tipos no son botones (son enlaces y un texto) y no hay campo de texto, así que no entran en esa regla.

## Pruebas

- `npm run typecheck`: verde. `npm run lint`: 0 errores, 1 aviso que ya estaba (`VisorImagen.componentes.test.mjs`).
- `npm test` (Vitest): **151 archivos, 2254 pruebas, todas en verde** (+1: `armazon.test.ts` prueba `enlaceAltaDeTipo`, con y sin ciudad).
- Componentes (Playwright con el Chrome de la Mac): `AltaEvento.componentes.test.mjs` + `TiraTipos.componentes.test.mjs`, **86 de 86 en verde**. Nuevas, en `AltaEvento`: el primer paso trae la tira con Evento · Lugar · Artista, Evento con `aria-current` (ni enlace ni botón), Lugar y Artista como enlaces a `/nuevo?tipo=lugar` y `/nuevo?tipo=artista`, de borde a borde y pegada abajo (390 de ancho, termina en el borde de la ventana) y por debajo del recuadro del cartel y de «No tengo cartel»; sin la ciudad cuando el flujo no la trae; con `?ciudad=` en los dos cuando sí; tocar Lugar o Artista sin nada escrito reemplaza la entrada sin preguntar; con «No tengo cartel» la tira no está; con Atrás vuelve; con algo escrito y Atrás pregunta «¿Salir sin publicar?» y solo se va al confirmar; mientras se lee un cartel no está. Nuevo archivo `TiraTipos.componentes.test.mjs` (3): la tira del primer paso (altura 56, anchos de al menos 64, punto solo en el marcado), la guardia limpia y sucia, y la de `/nuevo` (Evento enlace con su ciudad, Lugar y Artista botones, `aria-pressed` y punto que cambian al tocar). Hasta ahora no había prueba de componente de `Alta` (se probaba a mano y por la medición); esta cubre el mismo marcado y estilos que usa.
- `npm run inventario`: sin novedades (334 medidas en duro, 2 bloques duplicados: iguales a lo aceptado; la tira cambió de archivo con las mismas medidas).
- `npm run medir`: 26 pantallas × 4 anchos; el único hallazgo fue el presupuesto de `s15` (21 nodos contra 20), ya anotado; con `--solo=s15` queda «sin novedades». Teclado en 6 pantallas sin fallos. Ningún toque de menos de 44 ni desborde (la tira mide 56).

## Capturas (`docs/rediseno/capturas-341/`, app compilada contra el respaldo local, sesión inventada, letra de la app)

- `01-primer-paso-con-tira.png` (390×844 a 2×): «Publicar» con la ✕; el recuadro punteado «Sube el cartel / Será la portada del evento» y «No tengo cartel»; abajo, de borde a borde, con su raya arriba, la tira EVENTO · LUGAR · ARTISTA: EVENTO más oscuro, un poco más arriba y con su punto debajo; LUGAR y ARTISTA en gris. (Sin la casilla «Lectura automática»: el respaldo no tiene llave de lectura.)
- `02-primer-paso-320.png` (320×568 a 2×, con `?ciudad=san-luis-potosi`): lo mismo, sin desplazamiento a lo ancho; los enlaces de Lugar y Artista llevan `&ciudad=san-luis-potosi` (comprobado en el DOM de esa corrida).
- `03-sin-tira-tras-no-tengo-cartel.png`: «¿Cómo se llama?» con Atrás, la línea de avance corta y el botón «Falta el nombre»: la tira ya no está.
- `04-nuevo-lugar-tira-igual.png`: `/nuevo?tipo=lugar` (Registrar un lugar) con la tira abajo, LUGAR marcado con su punto; idéntica a `capturas-340/01-nuevo-lugar-tira.png`.

En la misma corrida: tocar «Lugar» en el primer paso abre «Registrar un lugar» (`/nuevo?tipo=lugar`) con una entrada reemplazada, no apilada; en `/nuevo` «Evento» sigue siendo el enlace a `/nuevo/evento`; sin errores de página.

## Qué probar en el iPhone

En Safari, en la web instalada y en la app de TestFlight:

1. Inicio o Agenda → «+»: abre «Sube el cartel / No tengo cartel» y, abajo, EVENTO · LUGAR · ARTISTA con EVENTO marcado; la tira queda pegada al fondo sobre la barra de gestos, sin tapar «No tengo cartel».
2. Tocar LUGAR: abre «Registrar un lugar»; ahí tocar EVENTO vuelve al alta por pasos. Igual con ARTISTA. Atrás desde ahí no debe regresar al primer paso dos veces (la entrada se reemplaza).
3. Tocar «No tengo cartel»: la tira desaparece; Atrás del paso la devuelve.
4. Con algo escrito (nombre), Atrás al primer paso y tocar LUGAR: pregunta «¿Salir sin publicar?».
5. Subir un cartel: durante «Leyendo el cartel…» no hay tira.
6. Desde una ficha de lugar («Publicar un evento aquí»), el primer paso muestra la tira igual; la ✕ vuelve a la ficha.

## Pendiente fuera de esta pieza

- Alta de lugar y de artista por pasos (doc 54): cuando existan, esta tira y la de `/nuevo` se volverán a mirar juntas.
