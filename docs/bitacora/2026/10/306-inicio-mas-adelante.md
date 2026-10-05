# 306 · Inicio: Más adelante

**Pieza:** OL-274 B. **Rama reservada:** `inicio-mas-adelante`.
**Fecha:** 2026-10-04. **Estado:** candidato integrado, listo para revisión final
del Gestor de cambios III; todavía no se declara publicado.

## Encargo y autorización

El founder firmó el prototipo y ordenó «Listo. Apruebo, notifica a gestor vamos a
prod». Se transmitió al gestor en el mensaje258. El mensaje259 reservó esta
rama y bitácora306 sobre main posterior a PR339, sin auxiliares. El gestor
registra la firma central, revisa todo y publica A→B con esa autorización.

A (OL-270, PR333) ya fue publicada por el gestor en `9fa3d4e5`. B comenzó sobre
`f653e639` (PR339), guardó código en `e266f8d7` e incorporó A y la base vigente
en `27bed4d8`, sin conflictos. No se altera el prototipo firmado `bb4f4ae1`.
El comprobador de números ve308 como último;306 sigue siendo la reserva expresa
del gestor para esta pieza, no se toma el siguiente libre.

## Problema y cambio

Una ciudad con un único evento futuro podía anunciarlo en el selector pero
mostrar un Inicio sin eventos: quedaba fuera de la semana y no alcanzaba el
mínimo de tres de Nuevos. Ahora, cuando los carriles efectivos de Seleccionados
para ti, Esta semana y Nuevos están vacíos, Inicio muestra **Más adelante**.

- Reutiliza la misma promesa de Agenda y las tarjetas y carriles canónicos.
  No añade consultas, SQL, configuración ni dependencias.
- Elige hasta20 eventos próximos por fecha antes de la presentación existente
  con foto primero y fecha dentro de cada grupo. Excluye todos los IDs de
  `agenda.asistencias`, tanto Voy como Me interesa, ya destinados a Tus planes.
- La condición usa el contenido visible en el cliente: Nuevos cuenta después
  de resolver la marca local. Un Nuevos ya visto puede dar paso al respaldo.
  No añade un esqueleto invisible ni nodos cuando Más adelante no corresponde.
- Cada stream conserva su Suspense independiente. Un contexto sin envoltorio
  DOM confirma resolución y presencia de cada carril. La carga o un error no
  se interpreta como una ausencia confirmada.
- Si todos los carriles están resueltos y vacíos, incluidos lugares, artistas
  y Tus planes cuando hay sesión, muestra el **Vacio existente de Agenda**,
  exportado sin cambiar su cuerpo. No sustituye un Inicio que sí tiene artistas
  o planes por ese vacío.
- **Ver la agenda** lleva a Todos, sin filtros, con la ciudad explícita incluso
  para San Luis Potosí. Esto evita restaurar otra preferencia local al abrir el
  enlace desde una URL explícita de la ciudad inicial.
- Se corrige solo la proporción del fondo de una tarjeta única sin foto:
  `.sola .sinFoto::before` usa el mismo5:3 y alto máximo del canon de la foto.
  El fallo real había sido confirmado por el gestor al revisar el prototipo.

El pedido expreso del founder de **Agregar un lugar cuando el buscador de ciudad
no encuentra resultados** ya está incluido en A publicada. Se conserva en
Inicio, Agenda, Lugares y Buscar; Artistas queda excluido por la decisión
posterior aceptada y registrada en bit297. B no modifica la hoja ni navegación.

## Validación

| Comprobación | Resultado y código |
|---|---|
| Unitarias finales | 1922/1922,137 archivos,8,50s; base integrada con A y enlace explícito final |
| Lint y tipos finales | 0errores; advertencia previa de VisorImagen:171; typecheck correcto |
| Inventario CSS final | Correcto, sin ampliar presupuestos |
| Build y medir finales | Build contra respaldo6s;24pantallas×4anchos=96mediciones,85s sin novedades |
| Componentes focalizados | 26/26:20 Destacados y6 escenarios de Inicio; mismo comportamiento, antes de la conciliación A |
| Integración focalizada con A | 90/90 en inicio/ciudad/ciudades/memoriaPantalla |
| App Next compilada con A | 5estados×320/390,10PNG y qa.json; sin errores ni desbordamiento lateral |

Las dos regresiones puras cubren evento aislado, exclusión de Voy/Me interesa,
tope20 por fecha antes del orden visual y conservación del input. Los seis casos
de componentes comprueban respaldo, supresión con carril normal, Nuevos visto,
artistas/Tus planes, stream pendiente y error. La regresión de tarjeta sin foto
falla antes del CSS (fondo de unos32px frente a210px) y pasa a ambos anchos.

Se observó cada PNG final completo después de renderizar; descripción y medidas
en [capturas-306](../../../rediseno/capturas-306/README.md). El recorrido de Next
con A va de Más adelante en León a Agenda Todos y después a Lugares, Artistas e
Inicio: conserva León y vuelve a mostrar el evento. Enlace, renglón y carril son
reales; los datos, GPS y servicios del entorno son sintéticos. Las capturas son
Chrome local a320/390×844, no una prueba física de Safari/iPhone ni teclado nuevo.
Las transiciones finitas se terminan para registrar un estado estable.

Logs de esta ejecución local en `/tmp/sn-ol274/`; se conserva la evidencia
reutilizable sin repetir suites por el cierre documental. La CI del SHA final
y la vista previa deben terminar correctamente antes de la integración.

## Entrega y siguiente acción

Candidato congelado al enviar la entrega completa con PR y SHA al gestor. El
Gestor III revisa delta, evidencia y riesgos de integración; devuelve juntos
los hallazgos si los hay y, tras aceptarlo y pasar CI, publica B y verifica el
dominio real. La aprobación de producción ya fue otorgada por el founder.
La prueba física del founder se distingue de este cierre técnico.
