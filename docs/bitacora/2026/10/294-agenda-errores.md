# 294 · Errores de carga en Inicio y Agenda (OL-267 / H11)

**Fecha:** 2026-10-04 UTC (2026-10-03 en México). **Estado:** candidato local probado; revisión y publicación pendientes.

Reserva del Gestor de cambios III, PR319 / `63bc24052e4f84b484f9eaf2a9d0392fb90c5fe5`,
después de PR318 / `972c3e9d`. Rama `agenda-errores`, worktree
`/Users/apple-1/somosnosotros-agenda-errores`. Script comprueba OL267/bit294 libres.
El gestor amplía expresamente los contratos de agenda/destacados/inicio y
RenglonEvento, con sus pruebas. Mantiene PR294/295 en pausa; no los modificamos.

## Corrección y criterio acordado

- La consulta de eventos es necesaria. Error, rechazo del transporte, respuesta
  nula o cliente no configurado lanzan un error genérico. Inicio y Agenda ya
  propagan ese fallo al `src/app/error.tsx` existente: mensaje en español y botón
  «Intentar de nuevo». Se conserva el texto y la composición global, sin CSS nuevo.
  Una respuesta `[]` sin error sigue siendo una agenda vacía válida.
- Asistencias y seguimientos personales también son necesarios con sesión:
  no fingir que no sigue a nadie ni confundir el error con falta de sesión.
  Incluye los eventos de artistas seguidos. Inicio reutiliza los IDs de artistas
  de esa misma lectura validada y elimina la consulta duplicada de seguimientos.
  Las demás promesas conservan su carga en paralelo.
- `van_por_evento` es secundario. Si falla, los eventos permanecen con `van:null`;
  cero solo se usa si la consulta fue correcta y no hay asistentes. El renglón y
  la tarjeta omiten la cifra desconocida. Si falta un recuento en los favoritos,
  todo ese grupo se ordena por fecha/título/id, conservando destacados manuales
  primero y sin un comparador inconsistente para mezclar desconocidos y números.
- Los destacados y carriles de entidades son opcionales. Un fallo al contar
  seguidores omite el respaldo de artistas; la tira manual no consulta ese
  recuento. Fallos de lectura en artistas o semanales omiten su carril. Se
  conserva el presupuesto semanal de filas, consultas y tiempo, y el tope12.
- Trazas estáticas en el servidor: solo el recurso interno que falló. No se
  registra `error.message`, respuesta remota, ciudad, usuario, IDs ni datos
  personales. El navegador recibe el error genérico de Next y su digest.

Alcance limitado a Inicio y `/agenda`. Los tipos compartidos admiten `null`, pero
no se cambia la carga de fichas, perfil, directorios, administración o sitemap.
Auth y `cargarPersona` conservan su contrato fuera del alcance. Sin SQL, variables
nuevas, escrituras de datos reales, apps/ios ni archivos de ubicación/Lugares.

## Reproducción y pruebas

Antes de corregir:13 pruebas nuevas del loader,11 fallos esperados y2 correctas.
Los fallos distinguen datos ausentes, consulta principal, recuentos secundarios,
seguimientos/asistencias y trazas. La app anterior (build de OL266) con respuesta
500 inventada muestra «Aún no hay eventos próximos»: captura antes conservada.

Después:

- 136 unitarias focalizadas en6 archivos correctas; incluye error de consultas y
  transportes, vacío real, cero real frente a desconocido, datos personales
  necesarios, destacados opcionales y orden sin recuento.
- 1860 unitarias en134 archivos correctas (6,56s). Tipos y lint correctos; sigue
  solo el warning previo de variable page en VisorImagen.componentes.test.mjs.
- 2 pruebas nuevas de componentes correctas: reintento por teclado recupera
  contenido, omisión de cifra desconocida y conservación de recuento confirmado.
  La suite completa se ejecutará en CI con las2 excepciones Linux de OL265.
- Build16s, inventario sin novedades y `medir`:24 pantallas×4 anchos,82s, sin
  cambios en presupuestos. Inicio/Agenda normales conservan sus nodos y estructura.

## Recorrido real compilado y capturas

Respaldo local con fallos inventados; el guion de QA y el servidor temporal viven
fuera del repositorio. Ningún fallo se provoca en Supabase o producción.

1. `/agenda` con500 muestra «Algo falló», explicación y «Intentar de nuevo»;
   no muestra el vacío ni la respuesta privada inventada del respaldo.
2. Al recuperar el respaldo, un clic al botón hace una segunda consulta principal
   (contador1→2) y vuelve a pintar los eventos. Se comprueba también en Inicio.
3. Respuesta vacía real mantiene «Aún no hay eventos próximos…», sin error.
4. Fallo solo de recuento conserva13 eventos, sin cifra, null ni NaN en la UI.
5. Lista degradada sin scroll horizontal: documento/viewport320/320,375/375,
   390/390 y1280/1280. Capturas390×844 con DPR3, fuentes de la app cargadas.

PNG abiertos y observados: antes-error-como-vacio, agenda-error, inicio-error,
agenda-recuperada, agenda-vacia y agenda-sin-recuentos. El error conserva cabecera,
botón violeta ancho, Atrás y navegación inferior; el vacío conserva filtros y
pestañas. Se esperaron las transiciones antes de capturar. Sin rediseño.

Al forzar los dos fallos del servidor puede aparecer React419 en el cliente
(0 a2 según el momento de streaming): es la recuperación de la frontera Suspense
tras el error inducido, ver [React419](https://react.dev/errors/419). El guion
inicial esperaba otra descripción del error minificado; se corrigió solo esa
expectativa tras contrastar el código React local y su documentación. La corrida
final pasó con2 avisos419, sin errores inesperados ni datos privados en logs.

Evidencia persistente:
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/agenda-errores/`.
Procesos temporales cerrados. Checkout principal preservado y limpio. Falta CI,
preview del SHA final y revisión/ventana del gestor; Safari físico sigue a cargo
del founder.
