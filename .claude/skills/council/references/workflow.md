# Workflow del council — script canónico

Invocar la herramienta Workflow con este script VERBATIM (no editarlo: está
validado end-to-end; toda la parametrización va por `args`). Estructura de
`args`:

```json
{
  "tema": "slug o título corto de la propuesta",
  "briefPath": "/ruta/absoluta/al/brief.md",
  "advisors": [ { "key": "contrario", "nombre": "El Contrario", "lente": "…copiada VERBATIM de advisors.md…" } ]
}
```

Tras el run: tomar `acta` del resultado, añadir los anexos con `autoria`,
`opiniones` y `reviews` (des-anonimizar), y guardar en
`docs/council/COUNCIL_<slug>_<fecha>.md`. La fecha la pone el orquestador
(el script no tiene reloj, por diseño de resume).

```javascript
export const meta = {
  name: 'council',
  description: 'LLM Council: opiniones independientes → peer review ciego → veredicto del Chairman',
  phases: [
    { title: 'Opiniones', detail: 'un advisor por lente, en paralelo, sin ver a los demás' },
    { title: 'Peer review', detail: 'cada lente rankea las opiniones anonimizadas' },
    { title: 'Chairman', detail: 'síntesis ponderada y veredicto recomendado' },
  ],
}

// El harness puede entregar args como objeto o como string JSON — tolerar ambos
const IN = typeof args === 'string' ? JSON.parse(args) : args

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const OPINION_SCHEMA = {
  type: 'object',
  properties: {
    postura: { type: 'string', enum: ['A_FAVOR', 'EN_CONTRA', 'CONDICIONADO'] },
    resumen: { type: 'string', description: 'Tu posición en ≤5 líneas' },
    hallazgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severidad: { type: 'string', enum: ['BLOQUEANTE', 'MAYOR', 'MENOR'] },
          titulo: { type: 'string' },
          detalle: { type: 'string' },
          evidencia: { type: 'string', description: 'Archivo:línea, medición o acuerdo documentado que lo respalda' },
        },
        required: ['severidad', 'titulo', 'detalle'],
      },
    },
    aciertos: { type: 'array', items: { type: 'string' }, description: 'Lo que la propuesta resuelve bien' },
    condiciones: { type: 'array', items: { type: 'string' }, description: 'Qué tendría que cambiar o probarse para tu A_FAVOR' },
  },
  required: ['postura', 'resumen', 'hallazgos'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    ranking: { type: 'array', items: { type: 'string' }, description: 'Letras de mejor a peor' },
    argumento_mas_fuerte: { type: 'string' },
    argumento_mas_debil: { type: 'string', description: 'El más débil o directamente erróneo, y por qué' },
    huecos: { type: 'array', items: { type: 'string' }, description: 'Lo que NINGUNA respuesta cubrió' },
  },
  required: ['ranking', 'argumento_mas_fuerte', 'argumento_mas_debil', 'huecos'],
}

phase('Opiniones')
const opiniones = await parallel(IN.advisors.map(a => () =>
  agent(
    `Eres "${a.nombre}", advisor de un council que evalúa una propuesta para Flowya (app iOS de viajes).\n` +
    `TU LENTE: ${a.lente}\n\n` +
    `Lee COMPLETO el brief en ${IN.briefPath} y los documentos del repo que referencia (puedes leer cualquier archivo del repo para verificar claims).\n` +
    `Opina SOLO desde tu lente, con evidencia concreta (archivo:línea, medición, acuerdo previo documentado). ` +
    `No eres cortés por default: si la propuesta tiene un problema, tu trabajo es encontrarlo. ` +
    `Tampoco eres negativo por deporte: si algo está bien resuelto, regístralo en aciertos. ` +
    `Trabajas SOLO — no hay otros advisors visibles y no debes especular sobre ellos.`,
    { label: `advisor:${a.key}`, phase: 'Opiniones', schema: OPINION_SCHEMA }
  )
))

const sillas = IN.advisors
  .map((a, i) => ({ advisor: a, opinion: opiniones[i] }))
  .filter(s => s.opinion)
sillas.forEach((s, i) => { s.letra = LETRAS[i] })
log(`Opiniones recibidas: ${sillas.length}/${IN.advisors.length}`)
if (sillas.length < 3) return { error: 'council incompleto', recibidas: sillas.length }

const paquete = sillas.map(s => {
  const o = s.opinion
  const hallazgos = o.hallazgos.map(h =>
    `- [${h.severidad}] ${h.titulo}: ${h.detalle}${h.evidencia ? ` (evidencia: ${h.evidencia})` : ''}`
  ).join('\n')
  const aciertos = (o.aciertos && o.aciertos.length) ? `\nAciertos: ${o.aciertos.join('; ')}` : ''
  const condiciones = (o.condiciones && o.condiciones.length) ? `\nCondiciones: ${o.condiciones.join('; ')}` : ''
  return `## Respuesta ${s.letra}\nPostura: ${o.postura}\nResumen: ${o.resumen}\nHallazgos:\n${hallazgos}${aciertos}${condiciones}`
}).join('\n\n')

phase('Peer review')
const reviews = await parallel(sillas.map(s => () =>
  agent(
    `Eres revisor ciego de un council que evalúa una propuesta para Flowya (brief: ${IN.briefPath} — léelo para tener contexto).\n` +
    `TU LENTE: ${s.advisor.lente}\n\n` +
    `Abajo hay ${sillas.length} respuestas ANÓNIMAS. No sabes de quién es cada una (alguna podría coincidir con tu lente; da igual: juzga el contenido, no la afinidad).\n` +
    `Rankéalas de mejor a peor por: (1) rigor de la evidencia, (2) severidad REAL de lo que encuentran (el alarmismo sin dato descuenta), (3) accionabilidad. ` +
    `Si un hallazgo te parece falso, verifícalo contra el repo antes de descontarlo.\n\n${paquete}`,
    { label: `review:${s.advisor.key}`, phase: 'Peer review', schema: REVIEW_SCHEMA }
  )
))
const reviewsOk = reviews.filter(Boolean)
log(`Peer reviews recibidos: ${reviewsOk.length}/${sillas.length}`)

const posiciones = {}
sillas.forEach(s => { posiciones[s.letra] = [] })
reviewsOk.forEach(r => r.ranking.forEach((letra, i) => {
  if (posiciones[letra]) posiciones[letra].push(i + 1)
}))
const rankingAgregado = sillas.map(s => ({
  letra: s.letra,
  votos: posiciones[s.letra].length,
  posicionMedia: posiciones[s.letra].length
    ? Math.round((posiciones[s.letra].reduce((a, b) => a + b, 0) / posiciones[s.letra].length) * 100) / 100
    : null,
})).sort((x, y) => (x.posicionMedia ?? 99) - (y.posicionMedia ?? 99))

phase('Chairman')
const acta = await agent(
  `Eres el Chairman de un council que evaluó una propuesta para Flowya. Tema: "${IN.tema}". Brief: ${IN.briefPath} (léelo).\n` +
  `Tienes las ${sillas.length} opiniones anónimas, los peer reviews cruzados y el ranking agregado (posición media; menor = mejor evaluada).\n` +
  `Tu trabajo NO es promediar: pondera por la fuerza de los argumentos y por lo que sobrevivió al peer review. ` +
  `El disenso es señal: repórtalo con sus razones, no lo laves. El council RECOMIENDA; el founder decide.\n` +
  `Escribe el acta en markdown siguiendo EXACTAMENTE la plantilla de .claude/skills/council/references/acta.md (léela). ` +
  `Los anexos los añade el orquestador después — tu acta termina en la sección "Condiciones / próximos pasos".\n` +
  `Veredicto posible: VOBO | VOBO_CONDICIONADO | NO_GO | FALTAN_DATOS.\n\n` +
  `=== OPINIONES (anónimas) ===\n${paquete}\n\n` +
  `=== PEER REVIEWS ===\n${JSON.stringify(reviewsOk, null, 2)}\n\n` +
  `=== RANKING AGREGADO ===\n${JSON.stringify(rankingAgregado)}\n\n` +
  `Devuelve SOLO el markdown del acta, sin preámbulo.`,
  { label: 'chairman', phase: 'Chairman', effort: 'high' }
)
if (!acta) return { error: 'chairman caído', ranking: rankingAgregado }

return {
  acta,
  autoria: sillas.map(s => ({ letra: s.letra, advisor: s.advisor.nombre, key: s.advisor.key })),
  posturas: sillas.map(s => ({ letra: s.letra, postura: s.opinion.postura })),
  ranking: rankingAgregado,
  reviews: reviewsOk,
  opiniones: sillas.map(s => ({ letra: s.letra, advisor: s.advisor.nombre, opinion: s.opinion })),
}
```

## Notas de diseño (por qué es así)

- **El guard `IN`** existe porque el harness puede entregar `args` como
  string JSON en vez de objeto (falló así en el smoke test 2026-07-31);
  el script tolera ambos. No quitarlo.
- **Los dos `parallel()` son barreras legítimas**: el peer review necesita
  TODAS las opiniones juntas (anonimizadas) — no es un pipeline.
- **Revisores = contextos frescos con la misma lente**: no recuerdan "su"
  respuesta de la etapa 1, así que el blind review es real (cero
  autopreferencia, mejora sobre el protocolo original de Karpathy).
- **El ranking agregado se computa en JS**, no con otro agente: es
  determinista y gratis.
- **11 agentes con 5 sillas** (5+5+1) — dentro de la guía de tamaño medio.
- El acta viaja como texto en el return; quien la escribe a disco es el
  orquestador (añade fecha y anexos des-anonimizados).
