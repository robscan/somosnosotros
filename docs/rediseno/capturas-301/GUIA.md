# OL-274 · Ciudad persistente y Más adelante

Prototipo local para revisión del Gestor III y después firma del founder. No cambia la app. Reserva: mensaje130 del Gestor III, 2026-10-04; aclaración de orden/tope: mensaje136. Rama `prototipo-ciudad`, base exacta `e454a334`.

## Abrir y probar

Abrir [ciudad-persistente.html](../prototipos/ciudad-persistente.html) directamente en el navegador. Es autónomo: React, estilos, Bricolage Grotesque, logotipos e imagen SN van incrustados. También está servido durante la revisión en `http://127.0.0.1:8274/ciudad-persistente.html?seccion=inicio&ciudad=leon`.

1. Desde Inicio, abrir el chip de ciudad y elegir León. Sale «Más adelante», con la fecha completa del 14 de noviembre.
2. Tocar «Ver la agenda»: Todos, León, sin filtros, con su evento visible.
3. Pasar por Lugares y Artistas. Conservan León y muestran exactamente sus vacíos actuales. El mapa es el fondo canónico de carga, sin cartografía ni servicio.
4. Volver mediante Inicio o el logotipo; recargar; abrir el archivo sin consulta. Conserva la elección manual.
5. Elegir San Luis por el mismo chip, poner un filtro en Agenda y salir. Elegir León desde Inicio y volver a Agenda: no repone el filtro de San Luis. En la misma ciudad sí restaura filtros y scroll.

Estados directos (añadir al nombre del HTML; la consulta no altera por sí misma la preferencia manual):

| Consulta | Qué comprobar |
| --- | --- |
| `?seccion=inicio&ciudad=puebla` | Más adelante, una tarjeta, «sáb 17 de oct · 19:00». |
| `?seccion=agenda&ciudad=monterrey` | Agenda Todos, 8 de noviembre. |
| `?seccion=inicio&ciudad=san-luis-potosi` | Hay evento esta semana: no sale Más adelante. |
| `?seccion=inicio&ciudad=san-miguel-de-allende` | Sin eventos: no sale Más adelante ni se inventa un vacío en Inicio. |
| `?seccion=agenda&ciudad=san-miguel-de-allende` | Vacío existente «Próximos días». |
| `?seccion=inicio&ciudad=leon&caso=planes` | Evento solo en Tus planes; no se duplica en Más adelante. |
| `?seccion=inicio&ciudad=leon&caso=varios` | 24 eventos de muestra → selección de los primeros20. |
| `?seccion=inicio&ciudad=leon&gps=slp` | GPS simulado en San Luis ordena la hoja; León sigue seleccionado. |
| `?seccion=inicio&ciudad=leon&caso=buscador` | Nueve ciudades con eventos de muestra activan el buscador. Buscar «Ciudad inexistente»: **Agregar un lugar**. Pedido explícito del founder incluido. |

## Canon y procedencia

Se compiló el código real, sin editar `src` ni CSS:

- `Armazon`, `BarraApp`, `NavSecciones`, `ui/Cabecera`, `FilaEventos`, `FilaLugares`, `Pestanas`, `Grupo`, `RenglonEvento`, `Renglon`, `Boton`, `CarrilEventosCliente` y `Destacados` de `e454a334`. Vacíos: estructura y textos exactos de `AgendaInicio`, `VistaLugares` y `ListaArtistas`.
- `Ciudad`, `Hoja` y sus estilos/importaciones de `fa828b15`, candidato OL-270 revisado en Safari. El wrapper solo da la sección al selector, porque los llamadores antiguos de main no la pasan.
- `calcularCarrilesAgenda`, `listarAgenda`, `agruparPorDia`, `tarjetaEvento` y el orden de `Destacados` reales. La navegación/memoria y las consultas son adaptadores locales; no constituye la corrección de producción.
- Tokens de `globals.css`; Bricolage Grotesque variable incrustada desde el build del canon. Solo dos conexiones de estilo del montaje: variable de la fuente y `--fondo-mapa` existente. No se diseñó ningún control, tarjeta, hoja o vacío.
- `canon-fuentes.json` registra las huellas SHA256 de97 fuentes y los recursos. El HTML contiene la fuente React legible en `script#fuente-prototipo-react` y el adaptador de navegación legible antes del bundle.

El gestor corrigió su primera indicación de cronología global: **tope20; selección cronológica primero; presentación con foto primero y fecha dentro de cada grupo**, como `ordenarTarjetasPorFoto`. Ninguna excepción a ese canon. Las muestras de esta entrega no llevan foto y usan su variante real, incluido el botón canónico del carril.

## Datos y simulación

Reloj: 4 de octubre de2026. Del reporte de lectura del gestor se reutilizan el título de la gira «Un León Marinero», ciudades y fechas: CDMX16oct, Puebla17oct, Morelia18oct, Monterrey8nov, León14nov, Aguascalientes15nov. **Todo otro atributo es sintético**: identificadores, horas19:00/21:00, publicación20sep, «Foro de muestra», ausencia de foto, recuentos, artistas y lugares. San Luis tiene un evento de muestra6oct; San Miguel/Guadalajara, un lugar de muestra y cero eventos. `caso=buscador` les añade eventos ficticios para llegar al umbral; no representa sus catálogos reales. `caso=varios` genera24 eventos de muestra. GPS es un punto de prueba del centro canónico de San Luis, nunca la ubicación de la persona.

Preferencia manual: `sn:ciudad-elegida` en el origen local. La URL explícita gana, sin sobrescribir la preferencia al recibir un enlace. Memorias del prototipo: `sn:prototipo-ciudad:memorias` por sección y ciudad, con filtro/pestaña/scroll. No se leen ni escriben los datos de producción. Usar ubicación se simula; no pide permisos ni geolocaliza.

Altas, Entrar, fichas, Perfil, Voy y servicios externos están fuera de esta reserva: se conservan sus controles canónicos, pero sus acciones se interceptan y registran en `window.__ciudadPrototipo.ultimaAccionSimulada`. No se completa registro/asistencia ni se navega a producción. Las pestañas muestran los datos de muestra publicados antes de la ventana de Nuevos.

Riesgo para código posterior: en una entrada externa sin `?ciudad`, el servidor todavía puede pintar San Luis antes de que el cliente restaure la preferencia. Aquí se resuelve sincrónicamente desde memoria porque es un HTML local. No se afirma eliminado ese parpadeo de la app. Los enlaces internos deben transportar ciudad desde el principio.

## Evidencia

25 capturas completas a320×844/390×844, vistas antes de medir. Chrome automatizado, escala1, navegador de escritorio con viewport móvil; no Safari físico. `recorridos.json`:13 comprobaciones, cero errores JS y cero peticiones externas en ese recorrido. `mediciones.json`: medidas reales y3 comprobaciones adicionales (mismo contexto/filtro/scroll, elección manual de la ciudad ya visible y apertura por `file://` sin HTTP).

| Medida | Canon | Render320 /390 |
| --- | --- | --- |
| Barra | 56 px | 56 /56 |
| Cabecera Inicio | 52 px | 52 /52 |
| Cabecera Agenda, con pestañas | 96 px | 96 /96 |
| Chip visible /tacto | 36 /44 px | 36 /44 en ambos |
| Nav | 60 px | 60 /60 |
| Gutter | 20 px | 20 /20 |
| Tarjeta única | ancho disponible | 280 /350 |
| Fecha Puebla | completa | scrollWidth=clientWidth280 /350 |
| Vacío título /texto | 19 /15 px | 19 /15 en ambos |
| Botón secundario | 48 px | 48 /48 |
| Miniatura /Voy en Agenda | 56 /44 px | 56 /44 en ambos |

Sin desborde horizontal del documento ni imágenes rotas en las medidas; la fila de contexto sí se desliza según canon cuando el nombre largo no deja ver todos los chips. Una segunda tarjeta asoma cortada en el carril según canon. No se agregó subtítulo a Más adelante, reset de ubicación ni sugerencias de otras ciudades. Todas las áreas de toque/márgenes provienen del CSS existente.

La suite de producción no se repitió: esta reserva solo crea un prototipo/documentación. Se comprobó el comportamiento local que cambió. OL-270/PR333 sigue congelado; A y B requieren firma del founder y reserva de archivos antes de tocar la app.
