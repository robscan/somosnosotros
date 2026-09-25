# 221 · Flyer: al confirmar la dirección se fija el punto y «Listo» se habilita (OL-187)

**Fecha:** 2026-09-25 · **Rama:** `flyer-confirmar-pin`, desde `origin/main` · **OL:** OL-187 · **De dónde sale:**
bug del founder, palabras suyas, sobre el alta de evento con cartel (docs/ops/OPEN_LOOPS.md, entrada OL-182, y
bitácora [217](217-lugar-evento-pantalla-app.md), que dejó la hoja «¿Dónde es?» sin inventar nunca un punto) y
`docs/rediseno/43-lugar-evento-pantalla.md`.

## Qué reportó el founder, textual

> al agregar lugar desde flyer, se leyó bien la dirección, pidió confirmar y seguía estando bien la dirección con
> el nombre escritos en campo, pero no permitía seleccionar listo, el pin no se colocó. El usuario debió borrar los
> campos y volver a buscar.

## La causa, cadena exacta estado → botón

1. `FormularioEvento.tsx`, `leerCartel()`: cuando el cartel trae lugar y dirección, línea 508-510, hace
   `setOtro({ ...o, sitioTexto: v.lugar, direccion: v.direccion, sitioPunto: null, pinPendiente: true })` -el OCR
   nunca geocodifica, solo copia el texto. `sitioPunto` se queda en `null` a propósito.
2. Con `sitioPunto` nulo, `dondeResuelto` (línea 355, `sitioListo(otro)`) es falso pero `dondeVacio` (línea 358)
   también -hay texto- así que `dondeConfirmar` (línea 359) es verdadero: el renglón «Dónde» muestra el botón
   **«Confirmar»** (línea 631-639), no «Falta». Tocarlo solo hace `setHoja(true)` -abre `HojaDondeEs`, nada más.
3. `HojaDondeEs.tsx`, la inicialización de `draft` (línea 116-126): `punto = otro.sitioPunto` (`null`),
   `direccion = otro.direccion` (la del cartel, correcta), `nombre = otro.sitioTexto` (correcto). El `draft` que se
   pinta trae el nombre y la dirección exactos -por eso el founder los vio "bien"- pero `punto: null`.
4. **Nada, en ningún lugar del componente, volvía a buscar esa dirección sola.** La única forma de conseguir un
   punto era: tocar el mapa, usar «Estoy aquí», o escribir en el campo «Nombre o dirección» (`q`) y elegir una
   sugerencia -las tres formas normales de fijar el pin, ninguna automática. Sin que la persona hiciera algo
   nuevo, `draft.punto` seguía en `null` para siempre.
5. `listoHabilitado` (línea 481, sin cambios en esta pieza): `!!draft?.punto && …` -con `punto: null`, «Listo»
   se queda deshabilitado sin decir por qué (a diferencia de la hoja «Agregar lugar» de OL-182, que si tiene su
   propio aviso «Falta la ubicación…», este renglón principal no tenía ninguno).
6. Único escape: borrar el campo `q` y volver a escribir la dirección a mano, para que la búsqueda normal
   (el `useEffect` de `q`, línea ~196) por fin la buscara y ofreciera una sugerencia que sí trae coordenadas -
   exactamente lo que el founder describió como el rodeo que tuvo que hacer.

## El arreglo

`src/app/eventos/dondeEsPantalla.ts`, dos funciones puras nuevas (con sus pruebas):

- **`necesitaConfirmarDireccion(draft)`**: verdadero cuando el `draft` es `"manual"` (nunca un lugar YA
  REGISTRADO, que siempre trae su punto al elegirlo), no tiene punto, y sí tiene una dirección escrita -el estado
  exacto que deja el cartel al leer sin geocodificar.
- **`coincidenciaClara(combinados, direccionLeida)`**: con exactamente un resultado (lugares registrados + Mapbox,
  la misma lista que ya arma `combinarResultados`) lo devuelve. Con varios -**revisión del gestor sobre la primera
  entrega**: Mapbox casi siempre trae más de una sugerencia para una dirección con número (la exacta y otras
  parecidas, de otra colonia o con otro número cerca), así que exigir "exactamente una" dejaba SIN fijarse solo el
  caso real del founder- se acepta la PRIMERA cuya dirección, normalizada con `normalizarNombre` (de
  `@/lib/lugares`, la misma que ya usa `lugaresPorTexto`: sin acentos, minúsculas, sin puntuación, espacios
  colapsados), EMPIEZA por la calle y el número de la dirección leída (la parte antes de la primera coma). Sin un
  número ahí, o si ninguna coincide así, `null` -nunca se adivina entre varias direcciones (regla de OL-182).

`src/app/eventos/HojaDondeEs.tsx`:

- Al montar, si `necesitaConfirmarDireccion(draft)` es verdadero, se pone esa misma dirección en el campo `q`
  (`setQ(draft.direccion)`) -dispara la MISMA búsqueda que si la persona la hubiera escrito, con la ciudad como
  sesgo (ya la usa `buscarConContexto`/`contexto`), sin que nadie tenga que borrar nada.
- Dentro del `useEffect` que ya hacía esa búsqueda (el del campo `q`), al terminar (éxito o error, en el `finally`)
  se comprueba, solo para ESTA primera búsqueda automática (`direccionInicial`, para no repetirlo si la persona
  escribe algo distinto después): si `coincidenciaClara(combinados, direccionInicial.current)` encuentra algo, se
  llama a la función nueva `confirmarDireccionLeida(r)`.
- **`confirmarDireccionLeida`** reutiliza `fijarPuntoDesdeDireccion` -la misma función que ya usaba el campo
  «Dirección» de la hoja «Agregar lugar» (OL-182) para prestar un punto sin cambiar de nombre ni de modo- en vez
  de `elegirLugarLista`/`elegirMapbox` (las que usa la persona al buscar desde cero, y que SÍ reemplazan el
  nombre por el del lugar elegido). Se probó primero con `elegirMapbox` y falló: al ser una sugerencia de
  dirección (`esDireccion`), esa función pone `nombre: ""`, borrando «Foro ficticio» que el cartel ya había
  leído bien -exactamente el dato que el founder dijo que se veía correcto. `fijarPuntoDesdeDireccion` no toca
  `nombre`, solo pone el punto y la dirección resuelta; después se limpia `q` para volver al resumen normal.
- Sin coincidencia clara (cero o varias), no se hace nada más: la búsqueda ya dejó la lista de sugerencias
  abierta (mismo mecanismo de siempre, `ListaFlotante`/`modo`), lista para elegir con un toque -nunca se inventa
  un punto entre varias direcciones parecidas (regla de OL-182, sin tocarla).
- Sin `mapboxToken` (falta la llave), la coincidencia con un lugar YA REGISTRADO (`lugaresPorTexto`, del lado del
  cliente) sigue funcionando igual que en la bitácora 217; solo la coincidencia contra Mapbox necesita el token.

Ningún archivo de OL-182 (`ListaFlotante.tsx`, `MapaDondeEs.tsx`) se tocó: el arreglo vive entero en las dos
funciones puras nuevas y en cómo `HojaDondeEs` las usa.

## ¿Hace falta una migración?

No. Mismo modelo de datos de siempre; esta pieza no guarda nada nuevo, solo consigue el punto que ya se podía
guardar.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

- **Lint:** sin errores (1 warning preexistente y ajeno, `docs/diseno/logotipo/iconos-sn.mjs`).
- **Typecheck:** limpio salvo la colisión de mayúsculas preexistente de macOS entre
  `src/app/artistas/LetreroCorreoLigado.tsx` y `letreroCorreoLigado.ts` (documentada en `OPEN_LOOPS.md`, «Last
  updated»; CI en Linux no la tiene). `npm install` sí hacía falta -el árbol de trabajo llegó sin
  `@vercel/analytics` ni `qrcode` instalados, ajeno a esta pieza- y no tocó `package.json` ni `package-lock.json`
  (comprobado con `git status --short` antes y después).
- **Pruebas:** **1255, 98 archivos** (14 nuevas en `dondeEsPantalla.test.ts`: `necesitaConfirmarDireccion`,
  `coincidenciaClara` -incluida la revisión del gestor: un solo resultado, varios con el primero coincidiendo por
  calle y número (con acentos/mayúsculas/puntuación, para probar que reusa `normalizarNombre`), varios sin ninguna
  coincidencia, y una dirección sin número con varios resultados-, y un bloque «el bug de OL-187, de punta a punta
  con las funciones puras» que reproduce el estado exacto del defecto). Comprobado que fallan sin el arreglo: con
  `dondeEsPantalla.ts` puesto momentáneamente en el estado de `origin/main` (vía `git stash`, aplicado y retirado
  sin tocar nada más), las pruebas nuevas fallan con `necesitaConfirmarDireccion is not a function` /
  `coincidenciaClara is not a function` -las que prueban funciones que ya existían siguen pasando, como debe ser.
- **Build:** `next build` compila -"Compiled successfully"- y falla en el mismo paso de TypeScript por la misma
  colisión de mayúsculas de macOS (no relacionada con esta pieza).

### Capturas reales (`docs/rediseno/capturas-221/`), 390×844, con la fuente Bricolage Grotesque real

Sin `next build && next start` disponible en este entorno (la colisión de mayúsculas de macOS lo bloquea antes de
producir el servidor): mismo mecanismo que la bitácora 217, un arnés temporal (`esbuild`, borrado antes de
comitear, nunca vivió en el repo) que bundlea `FormularioEvento.tsx` -con `HojaDondeEs.tsx` real dentro- y lo
sirve por http local; Chrome real de la Mac vía `playwright-core` (instalados los dos solo en el scratchpad de la
sesión). Con `BASELINE=1`, el mismo arnés arma el bundle leyendo `FormularioEvento.tsx`, `HojaDondeEs.tsx` y
`dondeEsPantalla.ts` desde `origin/main` (`git show`) en vez del árbol de trabajo, para capturar el ANTES real del
arreglo con el mismo código que corre en producción hoy. Mapbox interceptado por red (`page.route`): una sola
sugerencia para «Calle Prueba 123, Ciudad de prueba» (coincidencia clara) o dos, según el caso; sin llave real de
Mapbox ni de Supabase (no se usan en este flujo). Fuente Bricolage Grotesque cargada de verdad desde Google Fonts
(con salida a internet disponible en este entorno) -se ve en las capturas, no es la Arial de respaldo de 217-.
Flujo de cada captura: cartel simulado (mismo lugar/dirección que reporta el founder, "Foro ficticio" / "Calle
Prueba 123, Ciudad de prueba") → botón **Confirmar** del renglón «Dónde» → hoja «¿Dónde es?».

- **`01-antes-confirmar-abierto.png`**: código de `origin/main` (el defecto), justo al abrir la hoja «¿Dónde es?»
  por «Confirmar»: nombre («Foro ficticio») y dirección («Calle Prueba 123, Ciudad de prueba») correctos en el
  resumen, «Listo» apagado (gris) y sin pin en el mapa.
- **`02-antes-tras-esperar.png`**: el mismo estado 1.2 s después, sin ningún cambio -ninguna búsqueda se dispara
  sola: reproduce exacto lo que reportó el founder, incluido que se queda así para siempre sin un gesto nuevo.
- **`01-despues-confirmar-abierto.png`**: con el arreglo, al abrir la hoja el campo de búsqueda se llena solo con
  la dirección leída y por un instante muestra «no está registrado» (la búsqueda de Mapbox aún no responde).
- **`02-despues-tras-esperar.png`**: tras responder Mapbox con una sola coincidencia, el pin queda puesto (morado,
  en el mapa), el campo de búsqueda vuelve a estar vacío y **«Listo» se habilita** (texto morado) -mismo nombre y
  dirección que antes, nunca se sustituyeron.
- **`01-despues-ambiguo-sin-coincidencia-clara.png`** (`AMBIGUO=1`, dos sugerencias para «Calle Prueba 123, Ciudad
  de prueba»: «Avenida Prueba 123…» y «Calle Prueba 456…» -ninguna empieza por «calle prueba 123» normalizado,
  revisión del gestor sobre el primer arreglo, ver más abajo): la lista de sugerencias sigue abierta con las DOS
  opciones visibles y distintas (se ve cada dirección completa en el renglón de abajo de cada una), «Listo» sigue
  apagado y sin pin -tal como pide la regla de OL-182 de nunca inventar ni adivinar un punto entre varias.
  (Revisión del gestor: la primera entrega de esta captura, `01-despues-ambiguo-confirmar-abierto.png`, resultó
  ser BYTE POR BYTE igual a `01-despues-confirmar-abierto.png` -123908 bytes, mismo `sha1sum`- porque ambas se
  tomaban en el mismo instante, justo al abrir la hoja, ANTES de que la búsqueda automática respondiera: en ese
  momento el DOM es idéntico sin importar qué traerá Mapbox después. Se quitó esa captura redundante y se dejó
  solo la de después de esperar, que sí muestra la diferencia real -las dos sugerencias- y es la única que aporta
  algo nuevo sobre el caso ambiguo.)

Ningún `document.documentElement.scrollWidth` mayor que 390 en ninguna de las cinco capturas (comprobado a mano
sobre las imágenes). Consola sin errores de JavaScript propios (solo `404`/`ERR_FAILED` de recursos que el arnés
no sirve -sprites e iconos del estilo de mapa local, sin relación con la lógica de esta pieza).

## Revisión del gestor sobre la primera entrega, en la misma rama

Dos hallazgos sobre el PR #229, corregidos en un segundo commit (sin tocar nada más):

1. **`coincidenciaClara` exigía "exactamente un resultado", y Mapbox casi nunca da uno solo** para una dirección
   con número (trae la exacta y otras parecidas cerca): en el caso real del founder, el punto hubiera seguido sin
   fijarse solo. Corregido: con varios resultados, se acepta el primero cuya dirección normalizada empiece por la
   calle y el número de la dirección leída (ver «El arreglo» arriba, firma nueva `coincidenciaClara(combinados,
   direccionLeida)`), reusando `normalizarNombre` de `@/lib/lugares` en vez de escribir otra normalización.
2. **Dos capturas resultaron ser la misma imagen** (`01-despues-confirmar-abierto.png` y
   `01-despues-ambiguo-confirmar-abierto.png`, 123908 bytes, mismo `sha1sum`): las dos se tomaban en el instante de
   abrir la hoja, antes de que la búsqueda respondiera -en ese momento el DOM no puede diferir, sin importar qué
   traerá Mapbox después. Se quitó la captura redundante y se volvió a capturar el caso ambiguo YA con la lista
   resuelta (`01-despues-ambiguo-sin-coincidencia-clara.png`, con las dos sugerencias distintas visibles) -detalle
   en «Capturas reales» arriba.

## Correos en el diff

```
git diff origin/main...HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'
```

No encontró ninguna dirección.

## Cierre

`git status --short` limpio de artefactos de build y sin ningún arnés (`src/app/arnesNNN-temporal/` nunca se creó
en el repo para esta pieza -el arnés de captura vivió entero en el scratchpad de la sesión, fuera del árbol de
trabajo). Commit local en `flyer-confirmar-pin`, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
`git push -u origin flyer-confirmar-pin` y PR abierto contra `main` (sin unir: lo hace el founder/gestor).
