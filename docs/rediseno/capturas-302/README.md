# Artistas con novedades — prototipo de OL-275

2026-10-04. Base `e454a334`. Solo propuesta local, con datos e imágenes sintéticos.

Abre [el prototipo autónomo](../prototipos/artistas-novedades.html). No necesita servidor, `src`, conexión, cuenta ni llaves. «Escenarios del prototipo» cambia los casos; «Ver artistas» abre la lista. Tocar una tarjeta con sello abre la ficha y deja visible su novedad exacta. Atrás regresa a la pantalla de origen.

Las capturas ocultan el laboratorio mediante `captura=1`; las pantallas de producto y sus dimensiones son las mismas. Todos los reproductores dicen «de muestra» y no reproducen ni contactan proveedores. Seguir solo cambia un estado de la sesión del prototipo.

## Casos

| Control | Qué comprobar |
|---|---|
| Novedades vigentes | Luna y Colectivo Luz, elegidos, antes que Mar Sol, Mateo y el Ensamble; video y audio; elegidos con novedad sin duplicarse. |
| Día 8 | Desaparecen todos los sellos y las candidatas por novedad; las dos elegidas permanecen. Las novedades siguen en sus fichas. |
| Último audio oculto / borrado | Mar Sol vuelve a su video anterior vigente. Mateo pasa antes por tener una novedad visible más reciente. |
| Sin otra novedad vigente | Mar Sol sale del carril; sigue en el directorio. |
| Elegida sin novedad | Luna permanece elegida, sin sello. |
| Solo respaldo actual | Sin elegidos ni novedades vigentes, aparece una candidata del respaldo actual. |
| Más de 12 candidatas | Se muestran 12, con elegidos primero y sin duplicados. |

Nora Luna no tiene foto: no entra en el carril; sí lleva el sello de video en su renglón y ficha. El Ensamble tiene nombre de **80** caracteres y detalle de **40**, los límites actuales de `LIMITES_ARTISTA`.

## Capturas revisadas

Cada fila existe a **320×844** y **390×844** (`-320.png`, `-390.png`).

| Prefijo | Pantalla y resultado |
|---|---|
| `01-carril-video` | Primeras tarjetas elegidas; sello violeta sobre la imagen. |
| `02-carril-audio` | Desplazamiento del carril hasta Mar Sol y Mateo; ambos «Nuevo audio». |
| `03-ficha-audio-novedad` | Llegada desde Mar Sol a `n3`, sin reproducción automática. |
| `04-ficha-audio-cabecera` | La misma ficha arriba: sello del canon bajo el héroe, con ancho de contenido. |
| `05-lista` | Renglones con sello de video y audio; nombre al límite con elipsis del canon. |
| `06-ficha-sin-foto` | Nora con el símbolo SN y «Nuevo video». |
| `07-dia8-carril` | Solo elegidas, sin sellos. |
| `08-dia8-lista` | Directorio sin sellos vencidos. |
| `09-recalculo-visible` | Borrar la última novedad restaura la visible anterior y recalcula el orden. |
| `10-respaldo` | Tarjeta única con el tamaño `.sola` actual. |
| `11-nombre-largo` | Ficha con nombre y detalle al límite, sin desborde horizontal. |

## Canon y medición

Se compiló React y el CSS real de la base, sin editar ningún archivo de `src`. Componentes: `Armazon`, `BarraApp`, `NavSecciones`, `Destacados`, `RenglonArtista`, `ui/Chip`, `ui/Ficha`, `ui/Heroe`, `ui/BarraFicha`, `ui/Kpi`, `ui/Boton` y `SeccionNovedades`.

El sello usa `ui/Chip variante="sello"`: **14 px**, peso **700**, radio `--radio-pildora`, padding horizontal `--espacio-2`, vertical de **3 px**. Medido en ambos anchos: video **85,11×25,59 px**; audio **85,63×25,59 px**. En tarjeta se reutiliza `.hoy` (`--primario`/`--primario-texto`); en lista y ficha, el sello normal (`--vidrio`/`--texto`). El único CSS nuevo de producto es de colocación: ancho de contenido del sello de ficha y margen del ancla. Bricolage Grotesque real y recursos del sitio incluidos en el HTML.

Hay tres adaptaciones temporales del código leído, declaradas en [canon-fuentes.json](canon-fuentes.json): sello de tarjeta, sello del renglón y ancla de novedad. Navegación, datos, selección, seguimiento y reproductores están simulados. Los hashes permiten cotejar las 88 fuentes reales usadas; el JSX del prototipo queda incluido como texto dentro del HTML.

[mediciones.json](mediciones.json): 20 estados medidos, ancho del documento igual al viewport en todos, Bricolage cargada, cero errores de navegador y cero peticiones externas. Chrome headless. Además se comprobaron el tope, orden, deduplicación, foto requerida, exclusión de fichas de control ocultas/restringidas, retiro y frontera estricta de 7 días (vigente un milisegundo antes; vencida en el límite exacto).

Esto verifica el prototipo. La consulta real, RLS, costo, caché y Safari físico corresponden a la fase de código, después de la firma del founder y de la forma de consulta reservada por el gestor.
