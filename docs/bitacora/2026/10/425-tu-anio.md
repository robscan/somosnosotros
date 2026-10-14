# 425 · «Tu año» como imagen para compartir (OL-394, pieza 3 de 5 del historial)

**Fecha:** 2026-10-12. **Rama:** `tu-anio`, base `origin/main` (`939badc1`, ya con el historial de OL-390). **Operador:** Claude (agente del gestor VI). **Sin migración y sin tablas nuevas.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## El encargo

Lo que firmó el founder la noche del 12 de octubre en `docs/rediseno/prototipos/tu-anio-propuestas.html` (OL-392, bitácora 423, rama `tu-anio-propuestas`), «Te acepto porque no es importante ahora. Vamos a avanzar», tal como la segunda propuesta: **P año · F publicación 4:5 · C calma · E crema · D cifras y lo más · N nombre y foto · Q solo quien gestiona · O en la sección**. La imagen con el creador de cartel que ya existe, la ruta que la dibuja, la vista previa con «Compartir» y «Guardar», el botón en la sección (Trayectoria, Historial) y en Mi perfil, y la medición.

## Lo que se ve

- **El botón «Tu año»** (píldora violeta suave con el regalo, `.boton-ano` del prototipo): al final de «Trayectoria» en la ficha del artista y de «Historial» en la del lugar, solo si quien mira puede editar la ficha (autor, cuenta ligada o administración, el mismo `puedeEditar` de la página) y hay al menos un evento pasado de este año; y al pie de **Mi perfil**, sobre «Así te ve la gente», si la persona dijo «Voy» a algo que ya pasó este año. Sin sesión o ajeno, nada.
- **La vista previa** (`/tu-anio`, `/artistas/<slug>/tu-anio`, `/lugares/<slug>/tu-anio`): pantalla completa sobre la banda oscura (`--banda`), arriba Atrás, «Tu 2026» y la ✕ (las dos vuelven como `ui/Atras`: a la pantalla anterior o, sin ella, a la ficha o al perfil); al centro la imagen a 720 de ancho; abajo, anclados, **«Compartir»** (violeta) y **«Guardar»**. Sin «Publicación / Historia» ni «Otra pinta».
- **La imagen** (1080×1350, JPEG): crema `#f4efd6`, tinta `#1a1a1a`, gris `#5c5c5c`; arriba la foto redonda de 96 y el nombre con la ceja «SOMOS NOSOTRXS» / «ARTISTA · …» / «LUGAR · …»; el número a 440 (interlineado 0,82, −0,03 em) con su frase a 50 y «Tu 2026 · del 17 sep al 12 oct» en gris; a la derecha la figura de las portadas del sistema de 300; los secundarios a 96 con su palabra en mayúsculas; una línea de «lo más» a 38; el símbolo SN y «somosnosotros.org».

## Código, archivo por archivo

- **`src/lib/tuAnio.ts`** (nuevo, lógica pura) y **`tuAnio.test.ts`** (20 pruebas): `delAnio` (lo que empezó este año en la zona de la ficha), `zonaDelAnio` (la del lugar, si no la del evento más reciente, si no la de San Luis), `hayTuAnio`, `textoDesde` («del 17 sep al 12 oct»), `diaMes`, `cifra` (hasta 9 999 sin separador, después «12,500»), `resumirTuAnio` (las cifras y «lo más» por sujeto), `cejaDe`, `claseDeFigura`, `hrefTuAnio`, `hrefVistaTuAnio`, `nombreTuAnio` («tu-2026-feleal.jpg»), `versionTuAnio` (la `v` de la dirección) y `textoAlternativo`. Las cuentas de lugares y artistas son `lugaresDeTrayectoria` y `artistasDelHistorial` de `historialFichas.ts` (OL-390), y el mes más movido sale de `agruparPorMes`: no se agrupa dos veces.
  - **Persona:** eventos a los que dijo «Voy» y ya pasaron; lugares con ficha distintos; artistas distintos. «Donde más fuiste» (el lugar más repetido, «N veces»); si ningún lugar repite, «A quien más viste»; si tampoco, «El mes más movido».
  - **Artista:** fechas («fechas en 2 lugares»), lugares, cuántos fueron (los «Voy» de `van_por_evento`); «Donde más tocó» → «Con quien más» (nunca él mismo) → el mes.
  - **Lugar:** eventos («eventos con 4 artistas»), artistas, cuántos fueron; «Quien más pasó» → el mes.
  - Una cifra en 0 no se pinta; sin nada que repita, no hay línea de «lo más»; el color es el violeta primario en la persona y `respaldoDe(id)` en las fichas (artistas y lugares no guardan color).
- **`src/lib/carteles/plantillas/tuAnio.tsx`** (nuevo): la composición «calma» para satori (`dibujarTuAnio`), `figuraTuAnio` (la composición de `composicionDe` con `paleta(color)`, como `figura` del prototipo) y `tamanoHero` (el número baja de 440 de 4 en 4 hasta que cabe en su columna de 580, con `anchoTexto` de `medir.ts`). Los textos van ya partidos con `ajustar`/`ajustarRenglon` y `renglones` de `piezas.tsx`; el nombre hasta dos renglones; «lo más» baja de 38 a 28 y, si ni así, corta el nombre con «…». **La figura sí se pudo dibujar:** las composiciones solo dan `<circle>`, `<rect>` y `<polygon>`, que se pasan a elementos de React dentro de un `<svg>` que satori admite.
- **`src/lib/carteles/dibujar.ts`**: `prepararFotoTuAnio` (recorte cuadrado de 192) y `dibujarImagenTuAnio` (la misma rasterización del cartel: fuentes, sharp, JPEG 90 sin submuestreo; foto solo si es JPEG/PNG/WebP admitido y llega a tiempo; si no, sin foto).
- **`src/lib/carteles/generar.ts`**: `generarTuAnio` (trae la foto con `traerImagen`, solo del Storage propio, y dibuja).
- **`src/lib/carteles/tuAnio.test.ts`** (9 pruebas): 1080×1350 con y sin foto, a 720, cifras de cuatro y cinco dígitos, nada fuera del lienzo ni encimado, una foto que no es imagen se ignora, sin «lo más» ni secundarios.
- **`src/lib/cargarHistorial.ts`**: exporta `COLUMNAS_PASADO`, `FilaPasado` y `completar` (antes privados) para leer lo pasado de la persona igual que el de las fichas.
- **`src/lib/cargarTuAnio.ts`** (nuevo, `server-only`): `cargarPasadosPersona` (asistencias `voy` con `eventos!inner` visible, no borrador y `termina < ahora`, tope 1 000, `cache()`) y `cargarTuAnio(que, id)`: la persona de la sesión; el artista o el lugar por slug o UUID, si quien mira es admin, autor o cuenta ligada (`artistas_cuentas` / `lugares_cuentas`); null si no, o si no hay nada este año.
- **`src/app/api/tu-anio/route.ts`** (nuevo) y **`route.test.ts`** (9 pruebas, con la lectura y el dibujo reales y un cliente de prueba): sujeto inválido, sin sesión, ajeno, sin `id` o sin nada este año → 404; la persona, el autor, la cuenta ligada y la administración → 200 JPEG 1080×1350; `ancho` al más cercano de 360/720/1080; caché `private, max-age=86400`; con `descarga=1`, `Content-Disposition` y `no-store`. No llama a ninguna API externa.
- **`next.config.ts`**: `/api/tu-anio` en `outputFileTracingIncludes` (las letras se leen con `fs`, como el cartel).
- **`src/components/PantallaTuAnio.tsx`** (servidor) y **`VistaTuAnio.tsx` + `.module.css`** (cliente): lo de arriba. La imagen de 1080 se pide al abrir la pantalla (Safari solo abre la hoja dentro del mismo toque); «Compartir» usa `navigator.share({ files })` si `navigator.canShare({ files })`, y si no guarda; «Guardar» como `BotonDescargarCartel` (el plugin de Fotos en la app, un `blob:` descargado en la web; es un enlace de verdad con `download`), con el aviso flotante de `ui/Confirmacion` («Imagen guardada en Fotos», «Imagen descargada», «No se pudo guardar»). Rejilla plana de tres filas, el pie `position: sticky` abajo con la zona segura; solo tokens.
- **`src/app/tu-anio/page.tsx`**, **`src/app/artistas/[id]/tu-anio/page.tsx`**, **`src/app/lugares/[id]/tu-anio/page.tsx`** (nuevos): `noindex`; sin sesión a Entrar; sin permiso o sin año, `notFound()`.
- **`src/lib/armazon.ts`** (+ prueba): las tres rutas son vista `completa` (sin barra de la app ni navegación, como el letrero).
- **`src/components/BotonTuAnio.tsx` + `.module.css`** (nuevos) y **`ui/Iconos`**: `IconoRegalo` (el del prototipo).
- **`src/components/Historial.tsx` + `.module.css`**: prop `tuAnio` (la dirección o null) y el botón al final del `<details>`.
- **`src/app/artistas/[id]/page.tsx`** y **`src/app/lugares/[id]/CuerpoLugar.tsx`**: la sección de lo pasado recibe `puedeEditar` y pasa `tuAnio` si además `hayTuAnio`. Pruebas: 4 en la del artista y 3 en la del lugar (autor y administración con botón; sin sesión o ajeno sin él; solo lo del año pasado, sin él).
- **`src/app/perfil/page.tsx` + `perfil.module.css`**: `TuAnioPerfil` en su `<Suspense>`, sobre «Así te ve la gente». **`src/app/perfil/page.test.ts`** (nuevo, 3 pruebas).
- **`src/lib/medir.ts`** (+ 2 pruebas): `tu_anio: { que: persona|artista|lugar, medio: hoja|guardado }`; cerrar la hoja (`AbortError`) no se mide.
- **Respaldo local** (`respaldo-local/fixture.mjs`, datos inventados): cuatro «Voy» pasados más de Marcos (seis en total: tres en ACHE, dos en el Bicentenario, uno en el Jardín de San Juan de Dios) y Marcos ligado a Feleal y a ACHE Galería. Ana no cambia: las pantallas que se miden son las suyas.

## Decisiones que tomé

1. **Una sola letra, la condensada negra** (wdth 75, wght 800), en toda la imagen; lo suave va en gris. El prototipo usaba la condensada en pesos de 500 a 800 y solo existe como archivo la de 800; probé la media (600, ancho normal) para «Donde más fuiste:» y el dominio y rompía la familia (se veía más ancha y ajena). No bajé la fuente variable: habría sido una descarga.
2. **La línea del periodo va a 50, no a 32.** En el CSS del prototipo `.desde` decía 32, pero `.calma .hero-num p` le ganaba: lo que se firmó (la captura 01) está a 50, y así quedó.
3. **El pie sigue a lo último con 48 de aire**, como en la captura firmada, y no pegado al pie del lienzo (el CSS tenía un `margin-top: auto` que no hacía nada). Con menos datos el hueco queda abajo, como en el prototipo.
4. **«Lo más» cae cuando no repite:** el prototipo enseñaba el lugar más visitado aunque fuera una vez; el encargo pide «N veces» si repite y, si no, la siguiente caída. El mes más movido solo sale si hay más de un mes y el ganador tiene más de uno.
5. **El periodo cuenta lo que empezó este año**, y el botón solo sale si hay algo de este año (lo pasado del año anterior daría un «0»).
6. **La figura usa `paleta(color)`** como el prototipo (`Portadas.paleta`), no `paletaDeBase`: la base sale del color de origen igual que en Inicio. Elige la composición el id del perfil o de la ficha: cada quien tiene la suya (la del founder no será la misma que la del prototipo, que usaba la clave «persona»).
7. **El dominio del pie es somosnosotros.org** (el del encargo y del prototipo); el cartel de evento sigue con `DOMINIO_CARTEL` (somosnosotrxs.org).
8. **La vista previa es vista «completa»** del armazón: fondo oscuro de lado a lado, sin barra de la app ni navegación, también en tableta y escritorio.
9. **La imagen de 1080 se pide al abrir** y se reutiliza para compartir y guardar (una sola vez); se usa la dirección cacheable, no la de descarga, y el archivo se nombra en el teléfono.

## Lo que el founder debe confirmar

- La letra única en negra condensada (decisión 1) y la línea del periodo a 50 (decisión 2).
- somosnosotros.org en el pie (y no somosnosotrxs.org como el cartel).
- Que la figura cambie por persona y por ficha (decisión 6).
- El sitio del botón en Mi perfil: al pie, sobre «Así te ve la gente» (el perfil no tiene una sección «Tus planes» abierta como la del prototipo; el botón no reordena nada).
- La caída de «lo más» (decisión 4).

## Capturas (`docs/rediseno/capturas-425/`)

La app compilada (`next build` + `next start`) contra una copia del respaldo local en el scratchpad, sin ninguna imagen de fuera y con tres fotos inventadas (degradados hechos con sharp) servidas por la misma copia como si fueran del Storage: la de Marcos, la de Feleal y la portada de ACHE. Todo lo que no era `127.0.0.1` se cortó en el navegador. **Ni una lectura a producción.** Chrome de la Mac con playwright-core, 390×844 a 2×, toques reales por coordenadas, cero errores de página. Abiertas una por una:

- `01-perfil-boton-tu-anio`: Mi perfil de Marcos: «Mis artistas» con Feleal, los números Voy 2 · Sigo 1, sus dos planes próximos y, debajo, **«Tu año»** a lo ancho con el regalo; después «Así te ve la gente» y la barra de navegación.
- `02-vista-previa-persona`: fondo oscuro, «Tu 2026» con Atrás y ✕; la imagen: la foto de Marcos, «6 eventos a los que fuiste», «Tu 2026 · del 19 sep al 12 oct», la figura del taller (triángulos en ritmo, violeta), «2 LUGARES · 4 ARTISTAS», «Donde más fuiste: ACHE Galería · 3 veces», SN y el dominio; abajo «Compartir» (violeta) y «Guardar».
- `03-trayectoria-feleal-boton-tu-anio`: la trayectoria de Feleal abierta (Marcos la gestiona): los dos lugares, octubre y septiembre con «2 fueron» / «1 fue» y, al final, **«Tu año»**; después «Novedades».
- `04-vista-previa-artista`: Feleal: «ARTISTA · SOMOS NOSOTRXS», «4 fechas en 2 lugares», la figura del festival (círculos en ritmo, ocre y negro: el respaldo de su id es un amarillo, banda clara), «2 LUGARES · 5 FUERON», «Donde más tocó: ACHE Galería · 2 veces».
- `05-historial-ache-boton-tu-anio`: el historial de ACHE abierto: «Han pasado por aquí · 4», octubre y septiembre y, al final, **«Tu año»**; después «Dónde».
- `06-vista-previa-lugar`: ACHE: «LUGAR · SOMOS NOSOTRXS», «3 eventos con 4 artistas», «del 27 sep al 12 oct», la figura de la exposición (cuadros en ritmo, azul), «4 ARTISTAS · 4 FUERON», «Quien más pasó: 0Backside0 · 2 veces» (empata con Feleal; gana por nombre, como en el historial).
- `07-trayectoria-feleal-sin-boton-ana`: la misma trayectoria vista por Ana, que no la gestiona: termina en el último renglón, **sin botón**. Para Ana, `/api/tu-anio?que=artista&id=feleal` y `?que=persona` (no tiene «Voy» pasados) dan 404, y `/artistas/feleal/tu-anio` enseña «Esto ya no está» sin ninguna imagen (el código es 200 porque la página ya empezó a enviarse cuando se llama a `notFound()`, como las otras fichas).
- `08-vista-previa-guardado`: tras tocar «Guardar»: el aviso «Imagen descargada» con su palomita sobre los botones. Comprobado en la misma corrida: con la hoja (sustituida para ver qué recibe) «Compartir» le pasa **un archivo `tu-2026.jpg`, `image/jpeg`, 87 KB**, con el título «Tu 2026»; sin poder compartir archivos, «Compartir» descarga `tu-2026.jpg`; «Guardar» descarga `tu-2026.jpg` de 1080×1350; Atrás (sin pantalla anterior) lleva a `/perfil`.
- `09-imagen-persona-1080`, `10-imagen-artista-feleal-1080`, `11-imagen-lugar-ache-1080`: las tres imágenes tal cual salen de `/api/tu-anio` a 1080×1350 (200, `image/jpeg`, unos 100 ms: SVG 5-7 ms, rasterizar 92-97 ms), pasadas a PNG. Sin sesión, `?que=persona` da 404.
- `12-imagen-con-los-datos-de-la-firmada`: la plantilla con los datos de la captura firmada (Robscan, 36, 19 lugares, 42 artistas, MAC 5 veces) y la figura de la clave «persona», sin foto (sale de la prueba de la plantilla).
- `13-imagen-cifras-de-cuatro-digitos`: «1000» a su tamaño menor que 440 sin tocar la figura, «311» y «12,500» abajo y un nombre larguísimo en «lo más» cortado con «…».

**Comparación con `capturas-423/01-imagen-tu-2026-calma-crema-4x5.png`** (con la 12 al lado): la misma figura (los triángulos anidados), la misma composición y los mismos tamaños; el número, la frase y el periodo quedan a menos de 10 px de su sitio en la firmada; los secundarios y la línea de «lo más», unos 8 px más abajo; el pie en el mismo sitio. Diferencias: (1) «Donde más fuiste:» y el dominio en la negra condensada gris en vez del peso 500/600 (más oscuros); (2) sin foto, la cabecera es de una línea más baja y todo sube 15 px (la firmada tenía foto); (3) en la app la figura la elige el id del perfil, así que la del founder puede no ser la de los triángulos anidados (la de Marcos, captura 09, es el ritmo de triángulos).

## Verificación

`npm run lint && npm run typecheck && npm test && npm run build && npm run inventario && npm run medir`, en verde, en el árbol de la rama:

- **lint:** 0 errores, 1 aviso que ya estaba en `main` (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- **typecheck:** limpio.
- **test:** 207 archivos, **3 736 pruebas** en verde; 51 nuevas: 20 de `lib/tuAnio`, 9 de la plantilla, 9 de la ruta, 4 de la ficha del artista, 3 de la del lugar, 3 de Mi perfil, 2 de `medir` y 1 del armazón.
- **build:** en verde; las cuatro rutas nuevas (`/api/tu-anio`, `/tu-anio`, `/artistas/[id]/tu-anio`, `/lugares/[id]/tu-anio`).
- **inventario:** sin novedades: 130 archivos, 1 bloque duplicado (aceptado 1) y **342 medidas en duro (aceptadas 342)**; ninguna medida nueva fuera de los tokens.
- **medir:** 38 pantallas × 4 anchos en 124 s, **sin novedades** (las pantallas medidas son las de Ana, que no gestiona ninguna ficha ni tiene «Voy» pasados: ningún botón nuevo en ellas).
- **Capturas:** 13, cero errores de página.

## Lo que no entra aquí

- El formato historia 9:16, «Otra pinta» y «Q cualquiera» (no firmados).
- La marca «se canceló» (pieza 2, OL-391): hoy todo lo pasado cuenta como realizado.
- El currículo y el reporte en PDF (pieza 4) y lo anterior a la app e integrantes (pieza 5).
