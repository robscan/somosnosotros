# 301 · Prototipo de ciudad persistente y Más adelante

Fecha: 2026-10-04. OL-274. Operador: Codex, chat01a1082a. Rama `prototipo-ciudad`, worktree `.claude/worktrees/prototipo-ciudad`, base exacta `e454a334f062d7c03c82438ad106dbbe070e0a64`.

## Encargo y autorización

Founder: «envia propuesta a gestor que te diga que opina y regrese sus propias observaciones, luego que te dé luz verde comienza con el prototipo sin improvisar ui, toma del canon aprobado». Precede su reporte de León/Monterrey/Morelia/Puebla con un evento pero Inicio vacío y ciudad que vuelve a San Luis al cambiar dominio. La persistencia manual ya es requisito expreso. También exige **Agregar un lugar cuando una búsqueda de ciudades no da resultados**, si se muestra buscador, y avisar al gestor que lo pidió así.

Gestor III, mensajes129–130: propuesta recibida, observaciones devueltas y luz verde **solo al prototipo local**; reserva OL274/301, rama/base/archivos exactos. Vacíos actuales, city chip constante, GPS solo ordena/sugiere, URL explícita prioritaria, filtros/scroll solo en su misma ciudad. Más adelante solo si Estelar/Esta semana/Nuevos no tienen eventos, sin repetir Tus planes, sin subtítulo, enlace a Agenda Todos de esa ciudad sin filtros. Sin src/SQL/migración/servicios reales/push/publicación.

Mensaje136: **tope20** y rectificación de cronología global del130. Selección por fecha; al presentar, foto primero y fecha dentro de cada grupo, **canon Destacados intacto**. Aprobó HTML autónomo compilado con React/CSS reales de main y Ciudad/Hoja de `fa828b15`. Auxiliar de lectura ya terminado; no se continuó con ayudantes tras su instrucción. Sin council/workflows.

El script de numeración vio última299/OL272, siguiente300/OL273; no sustituye las reservas del gestor:300/OL273 y302/OL275 son de otras piezas. Se usa301/OL274 reservado explícitamente, sin autoasignación.

## Entrega local

[Prototipo](../../../rediseno/prototipos/ciudad-persistente.html). [Guía, estados, fuentes y límites](../../../rediseno/capturas-301/GUIA.md).97 huellas de fuentes canónicas, recursos incrustados y SHA256 del HTML en `canon-fuentes.json`; fuente React y adaptador de navegación legibles dentro del HTML. CSS sin editar y sin nuevas medidas/controles.

Se reutilizan Armazon/Barra/Nav/Cabecera, Ciudad/Hoja, FilaEventos/FilaLugares, Grupo/RenglonEvento, Boton, **CarrilEventosCliente/Destacados** con sus controles y orden, y los vacíos exactos actuales. Datos de gira: nombre/ciudades/fechas del reporte de solo lectura del gestor; lo demás es sintético, incluido mapa neutral/GPS. No se consultó ni modificó SQL, servicios o producción durante el prototipo. No es la implementación de persistencia o fallback en la app.

Comprobaciones locales:13 del recorrido y3 adicionales. León persiste entre Inicio/Agenda/Lugares/Artistas; recarga/entrada sin ciudad/Logo; URL explícita gana sin sobreescribir preferencia; antigua Agenda SLP no impone filtro a León; misma ciudad recupera Gratis y scroll350 (scroll probado contra el adaptador local); GPS SLP no cambia León; selección mediante el mismo chip vuelve a SLP, incluso elegir la ciudad ya visible guarda preferencia. Las cuatro ciudades reportadas muestran su evento en Inicio y Agenda Todos. B ausente con Esta semana o cero eventos; Tus planes no se duplica;24 candidatos dan20. `Agregar un lugar` comprobado visualmente y por recorrido a320/390 cuando se activa buscador (>8 ciudades del dominio) y no hay coincidencias.

26 PNG completos (25 de propuesta y uno de reproducción aislada de main), vistos antes de medir; `recorridos.json` y `mediciones.json`. Barra56, Cabecera52/Agenda96, Chip36 visible/44 tacto, Nav60, gutter20, fecha completa en320, título/texto vacío19/15, botón48, miniatura56/Voy44. Documento sin desborde e imágenes de respaldo incrustadas correctas. Chrome automatizado en viewport móvil, no Safari físico. HTML por `file://` navega sin HTTP/dependencias de src. Sin errores JS ni peticiones externas en el recorrido registrado. Sin suite/build de producción: solo prototipo/documentos con pruebas proporcionales del comportamiento simulado.

## Riesgos y siguiente acción

La restauración desde preferencia se modela sincrónicamente. En la implementación Next, entrada externa sin ciudad podría pintar SLP antes del replace cliente; resolver o aceptar expresamente ese riesgo en su fase de código. Enlaces internos deben llevar ciudad de origen. Formularios, asistencia, fichas, Perfil y servicios no se modelan; controles se conservan y acciones se interceptan, sin escribir en remoto. No usar estas pruebas como evidencia de sesión/SQL/Safari de producción.

**Listo para revisión final del gestor** con commit local y evidencia, antes de mostrarlo al founder. OL270/PR333 permanece congelado y reabierto tras los hallazgos. Después de firma visual del founder, el gestor reserva archivos/pruebas: persistencia A en OL270 y fallback B en OL274. No publicar ni avanzar código con esta luz verde local.

## Revisión143, aclaración144–145 y segunda entrega

El gestor devolvió `ff593b5d`: tarjeta única sin foto aplastada e Inicio sin eventos en blanco. Descongeló solo los archivos reservados para corregir. Su143/145 sustituye la regla130 del vacío: **reutilizar el Vacio exacto de Agenda en Inicio sin ningún carril**, con su texto y estilo actuales. Corregido; no se creó copy/componente visual distinto. La muestra no tiene destacados de entidades y no carga consultas remotas; implementación deberá evaluar todos los carriles resueltos sin convertir carga/error en vacío.

Reproducción independiente del `Destacados` real de main/e454a334, con un solo evento sintético y CSS original: `reproduccion-main-390.png`; fondo33,84 px. Causa: `.sola .tarjeta` usa fila `auto`; `.sola .foto` tiene aspecto5:3 pero `.sinFoto::before` no. No es evidencia de SQL/sesión/producción. El gestor autoriza solo la diferencia local en HTML: pseudo de la tarjeta sola con `width:100%`, `aspect-ratio:5 /3`, `max-height:var(--tarjeta-sola-foto)`. Render168/210 px a320/390. Fuente CSS real intacta; excepción explícita registrada en huellas. Arreglo en `Destacados.module.css` y prueba queda para fase de código OL274 tras firma/reserva, sin tocarlo ahora.

La duda de la palomita fue aclarada y el gestor la retiró en145, tras comprobar código: normal/varios sin sesión tienen `decidido:false`, `aria-pressed:false` y «Voy — …» violeta/blanco. `IconoOk` es también acción sin marcar en el canon. Solo planes usa true/«Ya vas» verde/blanco y evento solo en Tus planes. Se conserva el glifo. `correcciones.json` registra8 estados a320/390 (normal/varios/planes/sin carriles) con aserciones y reproducción aislada; no duplicación comprobada.

Capturas afectadas rehechas y vistas antes de medir; medidas/huellas regeneradas, recorridos originales comprobados de nuevo por cambios concretos.26 PNG,5JSON y guía en capturas:32 archivos;35 totales en la pieza. Sin cambios ajenos/src/SQL/push ni servicios. **Nueva entrega lista para revisión final**, no mostrada todavía al founder. El candidato anterior y la revisión permanecen en historia, sin borrar el registro.

## Aceptación del gestor151

Gestor III revisó `bb4f4ae108e014b5122a8def662677dd50a8d9eb` y **aceptó OL274 como prototipo**, autorizando mostrarlo al founder con la guía. Confirmó alcance, proporción5:3 a320/390, diferencia autorizada documentada, Vacio de Agenda en Inicio, ambos estados Voy/Ya vas y Agregar un lugar en búsqueda vacía. La aceptación no publica ni inicia código. Siguiente: firma visual del founder; después el gestor delimita A en `hoja-ciudades`/OL270 y B (Más adelante, vacío Inicio y arreglo Destacados) en OL274. Prototipo presentado mediante el navegador de Codex con el URL local y guía. Esta actualización solo documenta el cierre de revisión; HTML/PNG/huellas aceptados no cambian.

## Acceso desde el celular — corrección de la entrega

El founder insiste: «No puedo ver tus prototipos en mi celular». La presentación anterior mediante localhost y archivos locales no era una entrega accesible desde su teléfono. Gestor III, mensaje255, confirma el canal establecido `raw.githack.com` y pide comprobar acceso anónimo y recorrido, y registrarlo aquí. No se necesita otro despliegue ni modificar el HTML.

[Abrir el prototipo desde el celular](https://raw.githack.com/robscan/somosnosotros/d6d9f29d/docs/rediseno/prototipos/ciudad-persistente.html?seccion=inicio&ciudad=leon). Archivo público fijado al commit `d6d9f29d`: HTTP200, `text/html; charset=utf-8`, SHA256 `fd24ef51457af5503bd6502eb0199fc0ab9d6d27579b0937bb17c7c80d03a40f`, idéntico al HTML aceptado y al archivo local. Comprobado sin credenciales mediante HTTP y navegador: Inicio muestra Más adelante; Agenda Todos muestra el evento; Lugares y Artistas conservan León en sus vacíos; regreso a Inicio conserva León y su evento. La primera visita puede mostrar «External Content Notice»: se toca «Open the page», según el canal confirmado por el gestor.

Entregado el enlace HTTPS en este chat. Verificación de navegador de escritorio, no firma ni prueba física del iPhone del founder. El HTML/canon/capturas no cambian; esta corrección de acceso no implementa ni publica A/B en la app y no toca Vercel, SQL ni permisos. Sigue pendiente la firma visual del founder para la fase de código.
