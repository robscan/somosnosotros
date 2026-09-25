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
- **`coincidenciaClara(combinados)`**: con exactamente un resultado (lugares registrados + Mapbox, la misma lista
  que ya arma `combinarResultados`) lo devuelve; con cero o con más de uno, `null` -nunca se adivina entre varias
  direcciones (regla de OL-182).

`src/app/eventos/HojaDondeEs.tsx`:

- Al montar, si `necesitaConfirmarDireccion(draft)` es verdadero, se pone esa misma dirección en el campo `q`
  (`setQ(draft.direccion)`) -dispara la MISMA búsqueda que si la persona la hubiera escrito, con la ciudad como
  sesgo (ya la usa `buscarConContexto`/`contexto`), sin que nadie tenga que borrar nada.
- Dentro del `useEffect` que ya hacía esa búsqueda (el del campo `q`), al terminar (éxito o error, en el `finally`)
  se comprueba, solo para ESTA primera búsqueda automática (`direccionInicial`, para no repetirlo si la persona
  escribe algo distinto después): si hay una `coincidenciaClara` entre lo encontrado, se llama a la función nueva
  `confirmarDireccionLeida(r)`.
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
- **Pruebas:** **1252, 98 archivos** (11 nuevas en `dondeEsPantalla.test.ts`: `necesitaConfirmarDireccion`,
  `coincidenciaClara`, y un bloque «el bug de OL-187, de punta a punta con las funciones puras» que reproduce el
  estado exacto del defecto). Comprobado que fallan sin el arreglo: con `dondeEsPantalla.ts` puesto momentáneamente
  en el estado de `origin/main` (vía `git stash`, aplicado y retirado sin tocar nada más), 11 de las pruebas nuevas
  fallan con `necesitaConfirmarDireccion is not a function` / `coincidenciaClara is not a function` -las otras 23
  (sobre funciones que ya existían) siguen pasando, como debe ser.
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

- **`01-antes-confirmar-abierto.png` / `02-antes-tras-esperar.png`** (código de `origin/main`, el defecto): nombre
  y dirección correctos en el resumen, «Listo» apagado (gris) y sin pin en el mapa -esperar 1.2 s no cambia nada
  (ninguna búsqueda se dispara sola): reproduce exacto lo que reportó el founder.
- **`01-despues-confirmar-abierto.png`**: con el arreglo, al abrir la hoja el campo de búsqueda se llena solo con
  la dirección leída y por un instante muestra «no está registrado» (la búsqueda de Mapbox aún no responde).
- **`02-despues-tras-esperar.png`**: tras responder Mapbox con una sola coincidencia, el pin queda puesto (morado,
  en el mapa), el campo de búsqueda vuelve a estar vacío y **«Listo» se habilita** (texto morado) -mismo nombre y
  dirección que antes, nunca se sustituyeron.
- **`01-despues-ambiguo-confirmar-abierto.png` / `02-despues-ambiguo-tras-esperar.png`** (`AMBIGUO=1`, dos
  sugerencias para la misma dirección): ningún punto se fija solo -«Listo» se queda apagado-, la lista de
  sugerencias queda abierta con las dos opciones para elegir con un toque, tal como pide la regla de OL-182 de
  nunca inventar ni adivinar un punto.

Ningún `document.documentElement.scrollWidth` mayor que 390 en ninguna de las seis capturas (comprobado a mano
sobre las imágenes). Consola sin errores de JavaScript propios (solo `404`/`ERR_FAILED` de recursos que el arnés
no sirve -sprites e iconos del estilo de mapa local, sin relación con la lógica de esta pieza).

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
