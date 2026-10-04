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

25 PNG completos, vistos antes de medir; `recorridos.json` y `mediciones.json`. Barra56, Cabecera52/Agenda96, Chip36 visible/44 tacto, Nav60, gutter20, fecha completa en320, título/texto vacío19/15, botón48, miniatura56/Voy44. Documento sin desborde e imágenes de respaldo incrustadas correctas. Chrome automatizado en viewport móvil, no Safari físico. HTML por `file://` navega sin HTTP/dependencias de src. Sin errores JS ni peticiones externas en el recorrido registrado. Sin suite/build de producción: solo prototipo/documentos con pruebas proporcionales del comportamiento simulado.

## Riesgos y siguiente acción

La restauración desde preferencia se modela sincrónicamente. En la implementación Next, entrada externa sin ciudad podría pintar SLP antes del replace cliente; resolver o aceptar expresamente ese riesgo en su fase de código. Enlaces internos deben llevar ciudad de origen. Formularios, asistencia, fichas, Perfil y servicios no se modelan; controles se conservan y acciones se interceptan, sin escribir en remoto. No usar estas pruebas como evidencia de sesión/SQL/Safari de producción.

**Listo para revisión final del gestor** con commit local y evidencia, antes de mostrarlo al founder. OL270/PR333 permanece congelado y reabierto tras los hallazgos. Después de firma visual del founder, el gestor reserva archivos/pruebas: persistencia A en OL270 y fallback B en OL274. No publicar ni avanzar código con esta luz verde local.
