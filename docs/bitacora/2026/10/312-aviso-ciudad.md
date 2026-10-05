# 312 · Confirmación de cambio de ciudad

**Pieza:** OL-284. **Rama:** `aviso-ciudad`. **Fecha:** 2026-10-04.
**Estado:** candidato terminado para PR/CI y revisión final del Gestor III;
no se declara publicado.

## Encargo y reserva

El founder mantiene todos los compromisos en Tus planes, primero en Inicio,
y propone «Lo que podría ayudar es un toast de confirmación». Se transmitieron
ambas decisiones al Gestor de cambios III. Sus mensajes294/296 reservaron
OL-284/312, esta rama sobre `origin/main` después de PR346, sin ayudantes.
Se esperó ese merge antes de crear rama o tocar código: `0fe0b360`. Después
se concilió por avance directo PR347/`3519a899`, que añade CI paralela.

Tratamiento aprobado: `Hecho` existente, solo texto y `role=status`, siete
segundos, sin botón, estilos, duración ni controles nuevos. «Ciudad cambiada
a León» confirma la elección, sin afirmar ubicación física o carga completa.
El gestor redujo el alcance a Inicio y Lugares, que ya tienen un canal común.
Agenda, Artistas y Buscar conservan su respuesta; sus proveedores no se mueven.

## Implementación

- La elección manual anota una intención efímera con slug y destino exacto.
  El selector confirma solo al coincidir la URL y la ciudad resuelta. Consume
  la marca una vez, incluso con el remonte de Inicio y StrictMode.
- Atrás, abandonar la navegación o salir de la página descartan la intención.
  En Lugares, que conserva el canal, abandonar la ruta confirmada limpia
  exclusivamente el aviso de ciudad. Nunca limpia el aviso de otra acción.
- No se anota intención al elegir la misma ciudad, con GPS, al recuperar la
  preferencia, abrir una URL o recargar. No se persiste una marca del aviso.
- Se usa el canal existente; `Aviso.boton` pasa a opcional. Hecho ya admite
  esa ausencia, sin cambiar su cuerpo ni CSS. Voy y Seguir mantienen un solo
  aviso, sus dueños y la opción Reintentar si falla un guardado.
- Tus planes sigue global y primero. No se filtra, reordena ni se añade un
  salto de scroll. Se conserva Agregar un lugar sin resultados de búsqueda,
  ya incluido en OL-270 A; la excepción vigente de Artistas también sigue.

Solo cambian `Ciudad.tsx`, el tipo de `avisoDePantalla.ts`, sus regresiones,
la prueba existente de Ciudad y esta documentación/evidencia propia.
Sin consultas, SQL, dependencia, configuración o nuevos proveedores.

## Validación y evidencia

| Comprobación | Resultado |
|---|---|
| Reproducción del aviso ausente | El caso manual falló antes de la implementación |
| Unitarias | 1944/1944,138 archivos,9,06s; contrato de aviso sin botón incluido |
| Integración seleccionada | 32/32: Ciudad, Inicio, fila de Lugares y Seguir |
| Selector final | 20/20,19,93s, tras reproducir/corregir aviso viejo al usar Atrás |
| Lint / tipos | Cero errores; warning previo de VisorImagen:171; tipos correctos |
| Build final | Correcto; TypeScript incluido; sin pérdida de SSR por los hooks de ruta |
| Inventario CSS | Sin novedades ni presupuestos cambiados |
| Medir | 24 pantallas×4anchos,86s, sin novedades; iniciales iguales tras la limpieza de Atrás |
| Next compilado final | Uno/tres planes×320/390, más Lugares×320/390; diez PNG y qa.json |

Una corrida de unitarias concurrente con la compilación agotó5s en dos
importaciones de fichas. La repetición sin esa compilación dio1944/1944,
sin aumentar tiempos ni modificar esas pruebas. La limpieza final de Atrás
solo afecta el aviso ya visible: se reutilizan las unitarias y mediciones
iniciales, y se vuelven a probar los20 casos del selector y el build/recorrido
final. La CI del PR verifica íntegro el candidato.

Se comprueban una emisión manual en Inicio/Lugares; ciudad/ruta aún pendientes;
StrictMode y remonte; misma ciudad, GPS, preferencia, entrada explícita, recarga;
Agenda/Artistas/Buscar sin aviso; Back antes y después de resolver; navegación
cancelada. La prueba usa el hook real de Seguir con guardado pendiente, éxito
y fallo: siempre un aviso y Reintentar conservado si corresponde.

Cada PNG final fue observado entero antes de describir y medir. [Capturas y
descripción](../../../rediseno/capturas-312/README.md): el aviso es legible y
queda sobre la navegación. El recorrido confirma que los planes no cambian,
se sustituye el contenido local y el mensaje caduca; recargar o volver no lo
resucita. Datos y servicios inventados, Chrome local, no Safari físico.

## Entrega y siguiente acción

Se entrega PR sin unir, SHA y CI al gestor para que revise todo el cambio.
El candidato queda congelado. El gestor devuelve hallazgos consolidados o
acepta; la publicación de este nuevo ajuste espera el «publica» del founder
según su encargo. Esa aprobación se distingue de la ya registrada para OL-274.
Después de publicar se verifica el dominio real y la prueba física del founder.
