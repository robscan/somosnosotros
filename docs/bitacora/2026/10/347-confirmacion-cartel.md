# 347 · Confirmación clara al guardar o descargar el cartel

**Pieza:** OL-318. **Rama:** `confirmacion-cartel` (sobre `origin/main` `83f67794`). **Fecha:** 2026-10-06. **Operador:** Claude Sonnet 5.5 (agente del gestor IV).
**Estado:** hecho y probado en Chrome a 390×844 con los componentes reales (ficha y «Publicado»). Falta el iPhone real (lista al final). Sin migraciones y **sin compilación nueva de TestFlight**: todo vive en la web, y la 1.0 (5) lo verá al desplegarse.

## Qué se encargó

Pedido del founder (2026-10-06, tras probar TestFlight 1.0 (5)): «El cartel ya se guarda en Fotos en iOS, pero hace falta un toast o una animación de guardado que confirme claramente. Ahora cambia el letrero del botón pero no es claro y terminé guardando 3 veces el cartel.» Hasta ahora (OL-317, bitácora 344) el botón solo cambiaba su texto unos segundos («Guardado en Fotos», «Cartel descargado»; en la ficha, «Guardado» / «Descargado»): no se notaba y la gente repetía.

## Qué hay

1. **`ui/Confirmacion` (pieza canon nueva): un aviso flotante de confirmación.** `useConfirmacion()` devuelve `{ avisar, nodo }`; se llama `avisar({ texto })` o `avisar({ texto, fallo: true })` y se pone `{nodo}` en la pantalla. Sale de abajo hacia arriba con el sello de «Publicado» en chico (círculo verde con la palomita, que se **traza**; si falla, círculo rojo con ✕) y el texto llano, dura **2,5 s** y se va solo (los últimos 220 ms se desliza hacia abajo). `role="status"` y `aria-live="polite"`. **Uno a la vez:** uno nuevo reemplaza al que esté a la vista, aunque sea de otra pieza (un registro de módulo; probado con dos hooks). Va en `body` por un portal (la columna de los pasos entra de lado con `transform`, y eso rompería un `position: fixed`), centrado, sin captar toques (`pointer-events: none`).
   - Dónde se pone: sobre el pie del paso (`--alto-pie`, que ya pone `PiePaso`; en «Publicado» queda justo sobre «Compartir»), sobre la pastilla flotante de una ficha («Me interesa · Voy», con `data-flotantes`), o sobre la navegación (`--nav-abajo`). La medida de la pastilla era un trozo de `Hecho`; lo saqué a `ui/useSobreLaPastilla` y ahora lo comparten los dos (sin cambio de comportamiento en `Hecho`).
   - Token nuevo: `--sello-chico: 28px` en `globals.css` (junto a `--sello`).
   - **«Reducir movimiento»:** sin ninguna animación (ni entrada, ni salida, ni palomita trazada): aparece y se quita sin moverse; la palomita se ve completa.
   - **Vibración:** `navigator.vibrate(25)` al confirmar donde exista (Android); un fallo no vibra; sin la API, no pasa nada.
2. **El botón del cartel (`BotonDescargarCartel`) confirma también en sí mismo.** Durante los mismos 2,5 s muestra la **palomita** en vez de la flecha (propiedad nueva `iconoListo`, con el mismo envoltorio que `icono`: en la ficha dentro de su círculo, en «Publicado» sola) y **no responde a toques repetidos**: `aria-disabled="true"` y la lógica (`alTocar` sale si el estado es «preparando» o «listo»; sigue siendo un enlace, sin `disabled`). Pasado el aviso vuelve a su estado y responde otra vez (guardar de nuevo es a propósito). Si falla, el botón **no** se bloquea: se puede reintentar al instante. El letrero del botón conserva su texto de «listo» («Guardado en Fotos», «Cartel descargado»; en la ficha «Guardado» / «Descargado»); la frase completa va en el aviso. Ya no lleva `aria-live` (lo anuncia el aviso, para que no se lea dos veces).
3. **Textos del aviso** (`lib/guardarCartel.ts`, `avisoDelCartel`): en la app con el plugin «Cartel guardado en Fotos» (fallo: «No se pudo guardar»); en la web y en la app vieja «Cartel descargado» (fallo: «No se pudo descargar»). Nunca promete «Fotos» donde no puede.

Archivos nuevos: `src/components/ui/Confirmacion.tsx` (+ `.module.css` y `Confirmacion.componentes.test.mjs`), `src/components/ui/useSobreLaPastilla.ts`, `docs/rediseno/capturas-347/`.
Archivos tocados: `src/components/BotonDescargarCartel.tsx` (+ su prueba de componentes), `src/lib/guardarCartel.ts` (+ su prueba), `src/components/Hecho.tsx` (usa el hook compartido), `src/app/eventos/[id]/page.tsx` y `src/app/nuevo/evento/Publicado.tsx` (pasan `iconoListo`), `src/app/globals.css` (el token), `src/app/nuevo/evento/AltaEvento.componentes.test.mjs` (los dos tests de «Publicado» con cartel).

## Decisiones del operador (las que más conviene revisar)

1. **El encargo chocaba con el CSS en un punto: `aria-disabled` sí apaga el estilo.** El encargo pedía «`aria-disabled` y la lógica, no `disabled` que apague el estilo». Pero `Boton.module.css` ya atenúa `.boton[aria-disabled="true"]` a `opacity: 0.55` (igual que `disabled`) y `Ficha.module.css` pone en gris y sin `pointer-events` a `.accion[aria-disabled="true"]` (la acción «Cómo llegar · sin dirección»). Lo dejé así, porque es el canon del proyecto para «esto no responde» y refuerza el mensaje: **en «Publicado» el botón queda atenuado con su palomita** (se ve «ya hecho») y **en la ficha, el círculo pasa a gris con la palomita**. Si el founder prefiere que no cambie de color, se cambia `aria-disabled` por un `data-listo` en el botón (una línea) y se pierde la señal de «inactivo» para el lector de pantalla; está en las capturas 02, 04 y 06.
2. **Pieza nueva y no `Hecho` ni `Aviso`.** Ya existían `Hecho` (aviso de «algo hecho» con Deshacer, 7 s, para listas) y `Aviso` (alerta persistente con ✕). Ninguno sirve: `Hecho` pide un botón y dura 7 s; `Aviso` no se va solo. `ui/Confirmacion` es el tercero y, a diferencia de `Hecho`, **no lleva botón** (nada que deshacer en guardar un cartel) y es más corto. No toqué las demás confirmaciones.
3. **Un registro de módulo para «uno a la vez» entre piezas** (`quitarLaActiva`), no un proveedor en el layout: así no hay que montar nada en `layout.tsx` (una raíz más) y cada pieza decide dónde pone su `{nodo}`. Costo: dos pantallas que avisaran a la vez desde páginas distintas no existen (una sola está montada), así que alcanza.
4. **Portal a `body` en vez de dejar el aviso en su sitio.** `PorPasos` entra de lado con `transform` (y `overflow-x: clip`): un hijo con `position: fixed` mediría contra esa columna. Con el portal el aviso queda siempre en la ventana. Costo: el aviso no está dentro del árbol del botón para el lector de pantalla (un `status` suelto de `body`, que es lo normal para un aviso).
5. **El botón sigue diciendo su texto de «listo»** junto a la palomita (no vuelve a su letrero de reposo) durante los 2,5 s. Es redundante con el aviso, pero así el botón confirma por sí solo aunque alguien no mire el aviso (la ficha mide ~390 y el aviso está abajo, bajo las pastillas).
6. **El aviso tiene 2,5 s y el botón el mismo tiempo** (la constante `CONFIRMACION_MS` es de la pieza canon y el botón la importa). Los dos relojes son independientes pero salen del mismo número; si algún día se separan, es una constante.
7. **Háptico nativo: no se añadió.** El encargo decía usar `@capacitor/haptics` solo si ya estaba en `apps/ios/package.json`. **No está** (hay `app`, `browser`, `core`, `geolocation`, `ios`, `keyboard` y `push-notifications`), así que no lo añadí: sería otra compilación de TestFlight. En la app de iPhone `navigator.vibrate` no existe, así que ahí no vibra; el aviso, la palomita y el bloqueo de toques sí funcionan. **Pendiente para la próxima compilación nativa:** `@capacitor/haptics` y llamarlo desde `vibrar()` en `ui/Confirmacion.tsx` (hay un comentario con eso).
8. **La ✕ del fallo es `IconoCerrar`**: el set no tiene un icono de error; con fondo rojo (`--error`) se lee como «no». No dibujé uno nuevo.
9. **Prueba con `force`:** Playwright no hace clic en lo que está `aria-disabled` (espera a que se habilite), y una persona sí puede tocarlo. Las pruebas de «toques repetidos» usan `click({ force: true })`.

## Pruebas

- `npm run lint` (solo el aviso anterior de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (2330 en 157 archivos; +2 de esta pieza en `guardarCartel.test.ts`), `npm run inventario` sin novedades (la primera versión subió `medidasEnDuro` en uno por un `min-height: 52px`; ahora es `calc(var(--toque-min) + var(--espacio-2))`), `npm run medir` (29 pantallas × 4 anchos, sin novedades).
- Pruebas de componentes (`npm run test:componentes`):
  - **`Confirmacion.componentes.test.mjs` (9, nuevas):** aparece abajo y centrado con la palomita y su texto, `status` / `aria-live="polite"`, va en `body`, se va solo a los 2,5 s (a los 2 s todavía está); a punto de irse trae `data-saliendo` y no capta toques; **uno a la vez** (reemplaza al anterior, también al de otro hook, y el tiempo corre de nuevo desde el último); fallo con ✕ y fondo rojo, sin vibrar; vibra 25 ms donde hay `navigator.vibrate` y sin la API no pasa nada; **reduced-motion** (ninguna de las tres animaciones, palomita sin trazo a medias, ni al salir; y con movimiento las tres sí están); sobre la pastilla `data-flotantes` sin taparla; sobre el pie (`--alto-pie`); un texto largo se acomoda en 390.
  - **`BotonDescargarCartel.componentes.test.mjs` (15):** las 9 de OL-304/OL-317 (ajustadas: 4,1 s → 2,6 s, la palomita en vez de la flecha, y `locator("a", …)` porque el texto del botón y el del aviso coinciden) más 6 nuevas: web (aviso «Cartel descargado» con palomita, el botón con ✓ y `aria-disabled`, **tres toques más no descargan ni piden otra vez**, a los 2,5 s vuelve a responder), app con plugin (tres toques, una sola imagen al plugin), ficha (palomita en el círculo, letrero «Guardado» / «Descargado», aviso completo), fallos (aviso con `data-fallo`, el botón **no** se bloquea), app vieja («Cartel descargado») y la escena de la ficha con las clases reales (aviso sobre «Me interesa · Voy», debajo de la fila de acciones, y la fila no se mueve).
  - **`AltaEvento.componentes.test.mjs`:** los dos de «Publicado» con cartel (web y app con plugin) ahora comprueban el aviso, la palomita del botón y que **tres toques más no vuelven a descargar ni a guardar**.
  - Corrida completa de `test:componentes` (477 pruebas): todas verdes salvo una prueba de la pieza que dependía del reloj de la máquina; la rehice sin esa dependencia y pasa en tres corridas seguidas.

## Capturas (`docs/rediseno/capturas-347/`; Chrome a 390×844 a 2×, con la letra de la app; todas abiertas y revisadas)

La secuencia del aviso va en tres momentos: **al aparecer** (~0,1 s, sube desde abajo y el sello crece), **asentado** (~0,5 s, palomita completa) y **a punto de irse** (~1,8 s de los 2,5 s).

1. **La ficha** (`347-06-ficha-app-0…3`; la escena usa las clases reales de la ficha —la fila de acciones en círculo, `BotonDescargarCartel` con `corto`, las pastillas «Me interesa · Voy» con `data-flotantes`— y el plugin de Fotos simulado; no es la página completa porque la ficha real necesita servidor y datos):
   - `0-antes`: la fila de cuatro acciones («Compartir», «A mi calendario», «Cómo llegar», «En Fotos») y las dos pastillas al pie.
   - `1-aparece` (~0,1 s): el aviso sube sobre las pastillas, todavía a medio opacar y con el sello verde a medio crecer; el círculo del cartel ya cambió a la palomita gris con «Guardado».
   - `2-asentado` (~0,6 s): «Cartel guardado en Fotos» con el sello verde y la palomita completa, justo sobre «Me interesa · Voy», sin tocarlas ni mover la fila.
   - `3-a-punto-de-irse` (~1,8 s): igual; la salida (220 ms) es lo último de los 2,5 s.
   - `347-07-ficha-app-fallo`: con el permiso negado, el aviso con el sello rojo y la ✕, «No se pudo guardar»; el círculo del cartel **no** se atenúa (el botón sigue disponible) y dice «No se pudo».
2. **«Publicado», web** (`347-02-publicado-web-1-asentado` y `2-a-punto-de-irse`): el aviso «Cartel descargado» sobre el pie, justo encima de «Compartir» (la raya del pie queda debajo); el botón de abajo muestra la palomita gris con «Cartel descargado», atenuado (decisión 1).
3. **«Publicado», app** (`347-04-publicado-app-1-asentado` y `2-a-punto-de-irse`): lo mismo con «Cartel guardado en Fotos» y el botón «Guardado en Fotos» con su palomita.

Las de «Publicado» salen de `AltaEvento.componentes.test.mjs` con `CAPTURAS=<carpeta>` y `FUENTE=<woff2>` (letra de la app); las de la ficha, de `BotonDescargarCartel.componentes.test.mjs` con las mismas variables. Las dos primeras de cada secuencia de «Publicado» se parecen porque la entrada dura 200 ms; la entrada a medio camino está en la ficha (`1-aparece`).

## Para probar en el iPhone (el founder)

1. En la app (TestFlight 1.0 (5)), en la ficha de un evento con cartel: tocar «En Fotos». ¿Sube «Cartel guardado en Fotos» con la palomita sobre «Me interesa · Voy», el círculo del cartel pasa a la palomita y al tocarlo otra vez no pasa nada?, ¿a los dos segundos y medio se va y el botón vuelve a «En Fotos»?
2. En «Publicado» (publicar un evento con cartel desde `/nuevo/evento`): «Guardar en Fotos» → el aviso sube justo sobre «Compartir»; «Guardado en Fotos» con la palomita, atenuado.
3. Ajustes › Somos Nosotros › Fotos: «Nunca» → tocar: ¿aviso con ✕ roja «No se pudo guardar» y el botón **sí** deja reintentar?
4. En Safari del iPhone (no la app): «Cartel» / «Descargar el cartel» → «Cartel descargado» con palomita, igual.
5. Decisión 1: ¿el botón atenuado con palomita se lee como «ya está», o prefieres que no cambie de color?
6. Con «Reducir movimiento» activado (Ajustes › Accesibilidad › Movimiento): el aviso aparece y se va sin moverse.

## Lo que falta / siguiente paso

- **No probé en el simulador de iPhone** (el aviso es web puro y no cambia lo nativo; probé con Chrome a 390 y los componentes reales). Queda el iPhone real.
- **Otras confirmaciones que hoy solo cambian un texto** y que pueden usar `useConfirmacion` en una pieza siguiente (no las cambié aquí): «Copiado» / «Copiar» del enlace en `ui/CompartirFicha.tsx` (se queda dentro de su hoja, por eso sirve mejor la palomita), y el «Descargar QR» del mismo (hoy sin ninguna confirmación: baja el archivo en silencio). Revisar también «Compartir»: no confirma nada, pero la hoja del sistema ya lo dice.
- **Háptico nativo en la app** (decisión 7): `@capacitor/haptics` en la próxima compilación de TestFlight.
