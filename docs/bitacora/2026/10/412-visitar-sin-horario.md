# 412 · «Para visitar hoy/mañana» también con las exposiciones sin horario (OL-381)

**Fecha:** 2026-10-12. **Rama:** `visitar-sin-horario`, desde `origin/main` (`152ea11a`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder y mirarlo en su iPhone.

## El encargo

Founder (2026-10-12, pruebas de usuario con su iPhone): la agenda con Cuándo en «Mañana» muestra **una sola** exposición en «Para visitar
mañana» cuando hay 17 vigentes y visibles. Pide encontrar por qué se filtran.

**Causa** (comprobada por el gestor con los datos de producción): `abiertasEseDia` (`src/lib/agendaPorClase.ts`) solo dejaba pasar las
exposiciones con horario y con franja ese día; la regla venía del doc 55 §3 («sin horario no se promete “visitable hoy”», OL-322, bitácora
[351](351-agenda-por-clase.md)). En producción ninguna de las 17 tiene horario propio (`eventos_horarios` vacía) y solo Aether tiene
`lugares_horarios` (lunes a viernes 9:00–18:00): la única que salía era DESIERTO, que está en Aether. Las otras 16 quedaban fuera por lo que
no sabemos de ellas, no por algo que sepamos.

## Qué cambió

- **La regla** (`paraVisitarEseDia`, antes `abiertasEseDia`): «Para visitar hoy» (o el día elegido con Cuándo) lista las exposiciones que ese
  día están en su periodo de visita y **o abren según su horario o no tienen horario conocido**. La que tiene horario y ese día cierra sigue
  fuera: de ella sí se sabe que no abre. Orden: primero las que abren (con sus horas), la que cierra antes primero; después las sin horario,
  también por cierre (`porCierre`).
- **«Sin horario conocido»** (`sinHorario`): ninguna franja con días, igual que ya lo leían `notaDeClase` y `notaDeVisita`. Incluye la que no
  se pudo leer (`horario` ausente porque falló la lectura de horarios).
- **El renglón** (`cuandoParaVisitar`): las que abren dicen «Abre 9:00 a.m.–6:00 p.m.»; las sin horario, «Horario por confirmar», con el
  reloj y con su «· hasta el sáb 14 de nov» (`textoHastaEl`). Como el renglón recibe `nota`, no se repite el «Horario por confirmar» de
  `notaDeClase`. El texto es una constante compartida, `HORARIO_POR_CONFIRMAR` (`lib/claseEvento`), que ahora usan también la ficha
  (`textoHoy`) y las tarjetas (`notaDeClase`): un solo lugar para la frase.
- **El «Ver N»** de las hojas Cuándo y Filtros (`contarAgenda`) sigue contando con la misma función que pinta la sección: coinciden (prueba
  nueva que lo compara en cuatro días).
- **Comentarios**: la cabecera de `agendaPorClase.ts`, `paraVisitarEnAgenda` y `AgendaInicio` dicen la regla nueva, su fecha y su porqué.
- Sin cambios de CSS ni del tipo `EventoAgenda`.

Archivos: `src/lib/agendaPorClase.ts`, `src/lib/agenda.ts`, `src/lib/claseEvento.ts`, `src/lib/destacados.ts`,
`src/components/AgendaInicio.tsx`, `src/components/RenglonEvento.tsx` (comentario), y las pruebas `src/lib/agendaPorClase.test.ts`,
`src/lib/agenda.test.ts` y `src/components/AgendaPorClase.componentes.test.mjs`.

## Pruebas

- `agendaPorClase.test.ts`: hoy entran la que abre y, después, las dos sin horario (la sin leer y la vacía) por cierre; el lunes la del MUNI
  (con horario, cerrada ese día) no entra y la sin horario sí; fuera de su periodo no entra, con horario o sin él; el texto de cada renglón; los números de
  «Ver N» suben (de 1 a 3 hoy, de 1 a 2 el sábado).
- `agenda.test.ts`, bloque nuevo con la forma de producción: DESIERTO (inicio `2026-10-12T06:00:00Z`, fin `2026-11-16T05:59:00Z`, horario del
  lugar L-V 9:00–18:00), «Una vez más» (`2026-10-10T06:00:00Z` a `2026-11-15T05:59:00Z`, sin horario), una breve sin horario y una que solo
  abre los sábados. Mañana (martes): DESIERTO con «Abre 9:00 a.m.–6:00 p.m.», luego Breve y «Una vez más» con «Horario por confirmar»; la de
  los sábados fuera. El sábado: DESIERTO fuera, la sabatina dentro. El conteo coincide con la lista y dice «Ver 3 para visitar».
- `AgendaPorClase.componentes.test.mjs` (la agenda real en Chrome): Fotovisión, sin horario, ahora sale en «Para visitar hoy» tras Ecos con
  «Horario por confirmar · hasta el dom 20 de dic»; los títulos llevan «· 2» y los botones dicen «y 2 para visitar». 5 de 5.

Verificación: `npm run lint` (0 errores; 1 aviso ajeno en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npx vitest run
src/lib/agendaPorClase.test.ts src/lib/agenda.test.ts` (82), `npm test` (197 archivos, 3582 pruebas) y `npm run build`, en verde.

## Capturas (`docs/rediseno/capturas-412/`)

Contra el respaldo local de datos inventados del repo (`scripts/ops/auditoria-ui/respaldo-local/`) con DESIERTO en Aether (horario del lugar
L-V 9:00–18:00) y «Una vez más» en ACHE Galería sin horario, añadidos en una envoltura del scratchpad; `.env.local` temporal con
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8851` y una llave inventada (borrado al terminar), `next build` + `next start`, Chrome real a
390×844 (2×) con toda petición fuera de 127.0.0.1 bloqueada (cero intentos). Sin producción.

- `01-agenda-para-visitar-manana.png`: `/agenda` con Cuándo en «Mañana» (martes 13). «Para visitar mañana · 4»: Un mundo para mí (MUNI, Abre
  10:00 a.m.–6:00 p.m. · hasta el dom 8 de nov), DESIERTO (Aether, Abre 9:00 a.m.–6:00 p.m. · hasta el dom 15 de nov), Reflejo atemporal
  (MUNI, Abre 10:00 a.m.–6:00 p.m.) y, al final, «Una vez más» (ACHE Galería, «Horario por confirmar» con el reloj · hasta el sáb 14 de nov).
  Nada se sale a 390.
- `02-cuando-ver-n.png`: la hoja Cuándo con «Mañana» elegido: «Ver 1 evento y 4 para visitar», lo mismo que se ve.

## Por confirmar con el founder

1. **La regla misma.** La decidió el gestor a partir del reporte: lo que no se sabe no esconde la exposición; solo la que se sabe cerrada ese
   día queda fuera. Sustituye la del doc 55 §3 («sin horario no se promete “visitable hoy”»).
2. **El orden.** Primero todas las que abren con hora y después las «por confirmar», aunque una sin horario cierre antes («Una vez más» cierra
   el 14 y sale después de DESIERTO, que cierra el 15). Alternativa: todas juntas solo por cierre.
3. **El color.** «Horario por confirmar» va en el mismo morado y negrita que las horas (es el cuándo del renglón). Si se lee como promesa,
   podría ir en gris como la nota.
4. **La que no se pudo leer** (falló la lectura de horarios) también dice «Horario por confirmar»; antes, en esta sección, no salía.

## Siguiente

Con 16 de 17 sin horario, la sección se llenará de «Horario por confirmar». Cargar los horarios de los lugares con exposiciones (o pedirlos a
quien publica) es lo que hace útil la promesa de horas; queda para el gestor.
