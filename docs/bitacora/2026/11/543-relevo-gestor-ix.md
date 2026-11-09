# 543 · Relevo del Gestor de cambios VIII al IX

**Fecha:** 2026-11-09. **Rama:** `gestor-relevo-ix`, solo documentación. **Operador:** Gestor VIII (Fable 5.1, sesión `local_de64d008-65c2-4461-9fff-6d9796d69f5e`, del 2 al 9 de noviembre). **Pedido del founder:** «Hola, por favor, haz un cierre de este chat. Y organiza un relevo para seguir trabajando con Febel 5. Después de hacer el relevo y entregarle status, encarga por favor una revisión completa sobre toda la plataforma para identificar brechas de seguridad, o riesgos además de áreas de oportunidad dentro de la experiencia, la maquetación o cualquier otro elemento que identifiques.»

## Estado del repo al relevo

- `main` en `86be7aa2` (#642), igual en local y en origin; checkout limpio. Producción responde 200. Sin commits ni PR nuevos desde el cierre del 4 de noviembre (tampoco de chats en la nube).
- **Un PR abierto: [#630](https://github.com/robscan/somosnosotros/pull/630)** (OL-503, «No se pudo cargar» nativo en `apps/ios`, rama `respaldo-carga-nativa`, árbol `.claude/worktrees/agent-a23b0687a142504ac`). Espera la compilación 8 a TestFlight. **Tiene choques con `main` (49 commits detrás):** traer `main`, resolver, compilar en Xcode, repetir las capturas del simulador y solo entonces unir. El founder, el 4 de noviembre: «deja 503 pendiente para mañana»; sigue pendiente.
- En origin solo `main` y `respaldo-carga-nativa`. Un árbol de trabajo (el de #630).
- **Números:** el relevo usa la bitácora 543. **OL-511 y bitácora 544 quedan reservados para la revisión completa de la plataforma** (abajo). **Siguientes libres: OL-512 y bitácora 545** (OL-507 sigue reservado para índices y políticas de Supabase).

## Estado de producción al relevo (leído el 9 de noviembre)

- **Bandeja vacía.** El founder resolvió él mismo, el 6 de noviembre a las 17:00, las propuestas de eventos de San Luis del 3 de noviembre (las 12 de eticket entre ellas: aceptó las que quiso y rechazó 2).
- La rutina semanal «Completar fichas» corrió sola el 6 de noviembre a las 06:00 en cinco ciudades (San Luis, Ciudad de México, Oaxaca, San Miguel de Allende, Aguascalientes): 28 propuestas, todas aceptadas, menos de un centavo de dólar.
- Gasto de la API en noviembre: **0,89 USD**. El crédito de 200 USD **vence el 11 de noviembre** (en dos días): si el founder quiere aprovecharlo, es ahora (propuesta del 19 de octubre: abrir ciudades con «Buscar lugares» y «Buscar agendas»; ver `privado/` y la memoria de créditos).
- San Luis tiene apagadas «Universidades y museos» y «Búsqueda web» (`ciudades.parametros.fuentes_fuera`) y lee gratis el catálogo de Cultura y Turismo (OL-509). Última corrida real: 4 de noviembre, 31 s, 0 USD, 0 propuestas (todo estaba ya cargado). El PDF `nov_2026.pdf` está marcado leído: los contadores por trozo se verán con el de diciembre.
- En Vercel sigue `INSTAGRAM_TOKEN` (iba a retirarse hacia el 5 de noviembre si la conexión por Vault seguía sin fallos: **no se retiró, falta comprobarlo**) y las llaves viejas de Supabase (`anon`, `service_role`, `SUPABASE_JWT_SECRET`) junto a las nuevas.

## Lo que quedó en producción con el VIII (2 al 4 de noviembre)

Bitácoras 533 a 542, PR #625 a #642; registros 62 a 67 en `docs/ops/ASIGNACIONES.md`. En resumen: el respaldo web ante cargas fallidas y `sin-conexion.html` (OL-501); dos faltantes chicos (OL-504); **Repisa** (tarjetas de Instagram solo con foto de perfil, OL-505, y el arco del lugar más ancho con el círculo arriba, OL-510); `CLAUDE.md` y `DEFINICION.md` dicen que hay app en el App Store y Android en pruebas (#634); **publicar sin recargar** en Instagram de Administración (OL-506); el título de la semana cuando todo cae el mismo día (OL-508); la **agenda al día en cuatro ciudades sin la API** (4 de noviembre: Ciudad de México 574 eventos, San Luis 186, San Miguel de Allende 87 desde cero, Oaxaca 64); y **OL-509**: «Buscar agendas» cuenta y reintenta los trozos, lee gratis dos fuentes de San Luis, apaga fuentes por ciudad, busca carteles gratis antes de pagar y limpia teléfonos y correos de las descripciones.

## Lo pendiente, en orden

1. **Revisión completa de la plataforma (OL-511, bitácora 544), pedida hoy.** Encargo escrito en `privado/gestor/herramientas-2026-10-20/encargos/OL-511.md`: dos operadores de solo lectura (A seguridad y riesgos; B experiencia, maquetación y calidad), el gestor comprueba lo grave y presenta al founder una página con lo más importante y la lista completa con costos. **El repo es público: el detalle de cualquier brecha va en `privado/seguridad/544-revision-plataforma/`, nunca en git.** No se arregla nada dentro de la revisión; cada arreglo aprobado es después su pieza.
2. **OL-503 / #630** con la compilación 8 a TestFlight (arriba).
3. **El crédito de la API vence el 11 de noviembre.** Decide el founder.
4. **Retirar `INSTAGRAM_TOKEN` de Vercel** tras comprobar que la conexión por Vault no ha fallado; **pasar la app a las llaves nuevas de Supabase** (`sb_publishable`/`sb_secret`) para poder revocar la HS256. Los dos entran en la revisión (operador A, punto 4).
5. **Esperan decisión del founder:** OL-507 (índices y políticas de Supabase: su «sí»); carteles del sistema para eventos sin cartel («déjame meditarlo»); escritores para la revista; correo de la marca; «últimos 7 días» en «Volver a publicar»; (d) Instagram solo la pestaña visible, (e) y (f) de OL-497.
6. **Agenda:** revisar las fuentes hacia el 20 de noviembre (diciembre); cinco errores de eventos por verificar; fotos de los 40 artistas de Oaxaca; Silvina Moreno (Ciudad de México) sin confirmar; dos festivales de San Luis y Corona Capital cuando publiquen horas; seis dudas del operador de San Miguel de Allende (la primera, la hora del sábado 14 del festival de jazz; informe en `privado/investigaciones/agenda-2026-11-04/san-miguel-de-allende/`); las páginas de carteles del PDF no se leen gratis (no hay PDF→imagen en el servidor).
7. **Chicos:** 33 lugares sin portada; La Röckestra sin foto; la prueba del founder en su iPhone del respaldo web (modo avión) y de la hoja del día con la tarjeta Repisa.

## Lo que el VIII aprendió (además de `GESTION_DE_CAMBIOS.md`, la skill `gestor-con-agentes` y los relevos anteriores)

- **Al volver tras días sin sesión, leer producción y no solo git.** El founder resuelve cosas por su cuenta (la bandeja del 6 de noviembre) y las rutinas corren solas: antes de proponerle algo «pendiente», comprobar que lo sigue estando (`rutinas_corridas`, `propuestas` con `estado` y `resuelto_en`; la ciudad de una propuesta sale de su corrida).
- **Cargar sin la API rinde más que la API para ponerse al día:** un operador por ciudad con las diez buenas prácticas (`privado/investigaciones/agenda-2026-11-04/BUENAS-PRACTICAS.md`), `proponer` + `aceptar-corrida` en **dos pasos** (primero los lugares nuevos, luego los eventos; el guion solo casa eventos con lugares que ya existen), simulación antes de cada carga, respaldo de las filas antes de escribir.
- **Lo que una pieza cambia en datos guardados se aplica y se comprueba el mismo día:** tras unir OL-509, la conversión de las fuentes de San Luis y el apagado se aplicaron por SQL con respaldo, y una corrida real lo confirmó. Sin la corrida real, el resumen nuevo no se habría visto nunca.
- **psql:** las variables de `-v` no entran con `-c`; pasar `\set v \`cat archivo\`` y la consulta por la entrada estándar. Nunca imprimir la cadena de conexión (filtrar la salida).
- **Registros del gestor:** rama `gestor-registro-N` en el checkout principal, `publicar.sh` con la ruta del checkout principal, y al leer MERGED volver a `main`, `pull --ff-only` y borrar la rama local y la remota.
- **Explicar lo nuevo en una frase llana antes de usar su nombre** («apagar una fuente» costó una vuelta: «no entendí lo del apagado»).
- **Un pedido de diseño se resuelve con el código real y opciones lado a lado** (los cuatro anchos de Repisa) mejor que con un editor: «no me sirve ese editor».
- **Los avisos de «agente terminado» se repiten** cada vez que un agente se detiene; no significan que algo esté corriendo. Ante «¿estás ejecutando algo?», `ListAgents` y responder con lo que diga.
- **Los chats del founder en la nube pueden tomar números:** `git fetch` y `scripts/ops/siguiente-bitacora.sh` antes de reservar.
