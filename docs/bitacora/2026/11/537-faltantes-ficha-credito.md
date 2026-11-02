# 537 · OL-504 · Dos faltantes chicos: el crédito en la hoja del día y la ficha que se corría de lado

**Fecha:** 2026-11-02. **Rama:** `faltantes-ficha-credito` (desde `origin/main` `8c974c2a`). **Quién:** operador del Gestor de cambios VIII (agente, árbol aislado), sin subagentes.
**Manda:** los dos pendientes del cierre del 29 de octubre que el relevo del gestor anotó como chicos (bitácora [532](532-relevo-gestor-viii.md), punto 7): «vista previa de la hoja del día sin el crédito» y «un bloque de la ficha se sale a 1280». Los dos venían de la bitácora [523](../10/523-portada-credito.md) (OL-491).
**Estado:** hecho. Sin migración, sin variables nuevas. No toqué producción, `.env` ni llaves. Espera revisión del gestor y el «publica» del founder.

## 1. El crédito de la portada en la hoja del día

**Qué pasaba.** La publicación de una ficha (lugar o artista) en la semana de Instagram sale con el texto de `textoDeFicha` (`src/lib/instagram/ficha.ts`), que desde OL-491 cambia la línea «Foto: @cuenta» por el crédito de la portada («Foto: Pablo Pérez · CC BY-SA 4.0 …») cuando la ficha tiene portada y crédito. La hoja del día (`src/components/instagram/HojaDia.tsx`) armaba su vista previa con `textoArtista`/`textoLugar` sin ese paso: enseñaba «Foto: @cuenta» y publicaba otra cosa.

**El cambio (sin consultas nuevas).**
- `prepararDia` (`src/app/admin/instagram/accionesSemana.ts`) ya cargaba la ficha con `cargarFicha`, la misma lectura que usa el trabajador, que trae `portada_credito`. Ahora el contenido del día lleva `credito` (solo si hay portada, la misma condición que `textoDeFicha`).
- `HojaDia` envuelve el texto armado con `conCreditoDeFoto(texto, c.credito)` para artistas y lugares. Así el texto del sistema de la hoja es letra por letra el que arma el trabajador: lo de la cuenta quitada (sin la cuenta, el crédito sigue y va tras «Lee su ficha…») sale igual.
- Lo que se manda no cambia: si la administración no reescribe el texto, la hoja manda `texto: null` (el texto armado es igual al que se ve) y el trabajador lo vuelve a armar con `textoDeFicha`, con el mismo crédito. Si la administración lo reescribe, manda lo escrito, como antes.

**Prueba de componente** (`HojaDia.componentes.test.mjs`, nueva): un artista con crédito con dirección; el texto de la hoja tiene la línea «Foto: Pablo Pérez · CC BY-SA 4.0 (https://…)», ya no «Foto: @nubedepapel», y la cuenta sigue mencionada; el renglón del texto lo enseña; al quitar la etiqueta el crédito sigue; «Publicar ahora» manda `texto: null`. Sin el cambio en `HojaDia` la prueba falla (lo comprobé quitándolo).

## 2. La ficha de lugar que se corría de lado

**Qué era.** La nota de la bitácora 523 («a 1280 … un `div` de `ui/EntradaFicha` (la ficha “cerrada”, fuera de la vista) que ya se salía a lo ancho») no es un bloque mal maquetado de la ficha quieta: medida ya quieta, a 390, 768, 1048 y 1280, la ficha de lugar no se sale ni un píxel. Es la **entrada** de la ficha. `ui/EntradaFicha` (doc 38, OL-148) arranca «cerrada», con `transform: translateX(100%)`, un ancho entero fuera de la vista a la derecha, y se desliza 220 ms hasta su sitio. Mientras tanto, como nada recorta a lo ancho entre la ficha y la ventana (`.pantalla` › `.armazon` › `body`, todo `overflow-x: visible`), la ficha desplazada agranda la página: a 1280 la página llega a medir 2 472 de ancho (el doble menos el carril de la navegación), y con la rueda o el trackpad se puede correr de lado. Pasa a todos los anchos (780 de 390, 1 536 de 768, 2 008 de 1048), en la ficha de lugar y en la de artista (la misma plantilla). `medir` no lo veía porque mide con movimiento reducido (sin entrada) y ya quieta; la captura de 523 midió en el primer instante a 1280 y lo vio.

**El arreglo (una regla, maquetación plana, sin envoltorios).** En `src/components/Armazon.module.css`:

```css
.armazon[data-vista="ficha"] > .pantalla {
  overflow-x: clip;
}
```

La pantalla de una ficha recorta lo que se salga a lo ancho. `clip` no la vuelve contenedor de desplazamiento (a diferencia de `hidden`): lo pegado (la portada pegada desde 1048, la barra de la ficha, «Seguir») sigue pegándose a la ventana y lo fijo no cambia. La entrada se ve igual (la ficha sigue deslizándose desde el borde derecho); solo deja de agrandar la página. No toqué `EntradaFicha` ni la animación firmada. Safari lo soporta desde la 16; uno más viejo lo ignora y queda como antes.

**Comprobado** con la app compilada contra el respaldo local y Chrome real, la entrada a 1/50 de su velocidad (CDP `Animation.setPlaybackRate`, 11 s) y un muestreo del ancho de la página en cada cuadro desde antes de que exista la ficha:

| ancho | antes: mayor ancho de la página / se corre de lado | después |
|---|---|---|
| 390 | 780 / 186 px | 390 / 0 |
| 768 | 1 536 / 360 px | 768 / 0 |
| 1048 | 2 008 / 460 px | 1 048 / 0 |
| 1280 | 2 472 / 426 px | 1 280 / 0 |

Y lo demás sigue igual: ya quieta, las cajas de `main` y de cada bloque de la ficha (cabecera, portada, columna, flotantes) y el alto de la página son idénticos antes y después a los cuatro anchos, y con la página bajada 600 px los elementos pegados y fijos están en el mismo sitio (comparación en el guion, `medidas-antes.json` contra `medidas-despues.json`, que quedaron en el scratchpad de la sesión).

## 3. Capturas (`docs/rediseno/capturas-537/`)

`scripts/ops/auditoria-ui/capturar-faltantes-ficha-credito.mjs <árbol> <salida> <antes|despues>`: la app compilada contra el respaldo local (`RESPALDO_HISTORIAL=1 RESPALDO_INSTAGRAM_SEMANA=1`, datos inventados, sesión de la administración del respaldo; un arranque propio le pone al museo Leonora Carrington (demo), el lugar de «hoy» en la semana, un crédito inventado con dirección), Chrome real a 2×, toques reales (ratón en el centro, comprobado con `elementFromPoint`). Antes = el mismo guion con los dos archivos del arreglo quitados y la app recompilada.

- `antes-01-hoja-dia-renglon-texto-390.png` / `despues-01-…`: Administración › Instagram › hoy (el museo), la hoja con el renglón «Texto de la publicación»: 676/2200 antes, 739/2200 después (el crédito es más largo que «@cuenta»). El resto de la hoja no cambia.
- `antes-02-hoja-dia-texto-abierto-390.png`: el texto abierto antes: «Foto: @museoleonoracarrington.demo».
- `despues-02-hoja-dia-texto-abierto-390.png`: después: «Foto: Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Museo_Leonora_demo.jpg)», tras «Más en @museoleonoracarrington.demo». Es la única línea distinta (diff del texto en el guion).
- `antes-03-ficha-lugar-1280.png` / `despues-03-…`: el Teatro de la Paz a 1280×800, ya quieto: iguales (carril, portada a la izquierda, columna a la derecha, «Seguir»).
- `antes-04-ficha-lugar-390.png` / `despues-04-…`: la misma ficha a 390×844: iguales.
- `antes-06-ficha-lugar-1280-entrando.png` / `despues-06-…`: a mitad de la entrada (ralentizada): la ficha llega desde la derecha y se corta en el borde, igual en las dos.
- `antes-07-ficha-lugar-1280-entrando-corrida-de-lado.png`: lo mismo tras pedir a la página que se corra 500 px a la derecha (la rueda): **antes se corre 426 px**: el carril de la navegación y el «+» quedan fuera a la izquierda, la barra de arriba se acaba antes del borde derecho y aparece una franja vacía. Chrome sin cabeza no pinta la barra de desplazamiento horizontal, así que la evidencia es esta página corrida y el ancho medido.
- `despues-07-…`: lo mismo después: no se corre (0 px); la ficha sigue entrando en su sitio.

## 4. Comprobaciones

- `npm run lint`: 0 errores (los 2 avisos de siempre, en `capturar-inicio-vacio.mjs` y `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: correcto.
- `npm test`: 320 archivos, 5 148 pruebas correctas.
- `npm run test:componentes`: 803 pruebas, 0 fallaron (una nueva).
- `npm run inventario`: sin novedades.
- `npm run medir`: 63 pantallas × 4 anchos, sin novedades. No hubo que aceptar ninguna medida: el recorte no añade nodos ni profundidad, y la ficha quieta mide lo mismo.

## 5. Por confirmar

- **¿Recortar también el resto de pantallas?** Lo dejé solo en las fichas (`data-vista="ficha"`), lo mínimo para este fallo. Recortar `.pantalla` en todas escondería de la vista un desborde futuro de cualquier pantalla, pero también de quien mide a mano; `medir` lo seguiría viendo (mide hijos fuera de la caja de su padre).
- **La ficha antes de hidratar.** `EntradaFicha` sale del servidor «cerrada» (fuera de la vista) y solo entra cuando React corre: con una red lenta la ficha no se ve hasta entonces (con movimiento reducido sí, por el CSS). No es de esta pieza; si se quiere, que la entrada solo exista al llegar desde un listado.
