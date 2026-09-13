---
name: council
description: Convoca un LLM Council que cuestiona una propuesta ANTES del VoBo — advisors paralelos con lentes distintas opinan a ciegas, un peer review cruzado anonimizado rankea los argumentos y un Chairman emite veredicto recomendado (VOBO/VOBO_CONDICIONADO/NO_GO/FALTAN_DATOS) en acta persistente. Invocar SIEMPRE que el founder pida cuestionar, presionar o pressure-testear una propuesta, spec, diseño, plan o decisión de arquitectura/producto/motor con incertidumbre real; también ante frases como "qué se me escapa", "segunda opinión", "abogado del diablo", "panel", "council" o "consejo". NO usar para preguntas con respuesta única verificable, fixes quirúrgicos, ni para relitigar un handoff ya aprobado en plena implementación.
---

# council — cuestionar propuestas con un LLM Council

Protocolo de deliberación en 3 etapas (adaptado del LLM Council de Karpathy,
2025) sobre agentes paralelos del repo. El valor NO está en "más opiniones",
está en tres propiedades que una sola conversación no tiene:

1. **Independencia** — cada advisor opina sin ver a los demás; nadie ancla a nadie.
2. **Anonimización** — el peer review juzga argumentos sin autor; y como los
   revisores son contextos frescos, ni siquiera saben cuál respuesta "era la
   suya" (más ciego que el original de Karpathy: cero autopreferencia).
3. **Síntesis ponderada** — el Chairman NO promedia: pondera por lo que
   sobrevivió al peer review, y reporta el disenso como señal.

**El council RECOMIENDA; el founder decide.** Jamás presentar un veredicto
como decisión tomada — es insumo para el VoBo.

## Cuándo sí / cuándo no

- **Sí**: specs y diseños pre-VoBo, decisiones de arquitectura, cambios de
  motor, pivotes de producto — incertidumbre genuina + costo alto de
  equivocarse.
- **No**: preguntas con respuesta única (se verifica y ya), fixes
  quirúrgicos (skill de agilidad, no de deliberación), o relitigar un
  handoff aprobado en plena implementación — el handoff es ley: si la
  implementación revela un problema, se documenta y se pregunta a Design.

## Protocolo (5 pasos)

**0 · Brief.** Escribir UN archivo autocontenido en el scratchpad con: la
propuesta íntegra (o ruta a su doc), la pregunta EXACTA al council, rutas a
los docs/acuerdos relevantes (plan vigente, OPEN_LOOPS, capabilities,
bitácora) y las restricciones conocidas. Todos los advisors reciben el MISMO
brief. Regla de oro: presentar la propuesta en su versión más fuerte
(steelman) — un brief editorializado produce un council inútil.

**1 · Opiniones independientes.** Un agente por advisor, en paralelo, cada
uno con su lente (banca en `references/advisors.md`). Salida estructurada:
postura + hallazgos con severidad y evidencia + aciertos + condiciones.

**2 · Peer review ciego.** Cada lente recibe las N respuestas anonimizadas
(letras) y las rankea por rigor de evidencia, severidad real y
accionabilidad. También extrae: argumento más fuerte, más débil, y los
huecos que NADIE cubrió.

**3 · Chairman.** Recibe todo (aún anónimo) + ranking agregado determinista.
Emite el acta con veredicto: `VOBO | VOBO_CONDICIONADO | NO_GO |
FALTAN_DATOS` (plantilla en `references/acta.md`).

**4 · Acta.** Guardarla en `docs/council/COUNCIL_<slug>_<fecha>.md`
añadiendo los anexos des-anonimizados (autoría + opiniones completas +
reviews crudos). NO commitear ni abrir PR por iniciativa propia — la
economía de git del repo manda; ofrecer el commit al founder.

## Convocatoria

Leer `references/advisors.md`. Default: los 5 titulares. **El Contrario y
El Empirista siempre sentados** (son los asientos anti-groupthink).
Sustituir 1–2 titulares por suplentes cuando el dominio lo pide (motor →
Cartógrafo; UI → Esteta; release/privacidad → Auditor). Council mínimo
para decisiones medianas: 3 sillas (Contrario + lente de dominio +
Ejecutor).

## Ejecución

- **Vía primaria**: herramienta Workflow con el script VERBATIM de
  `references/workflow.md` — no editarlo (es el validado); toda la
  parametrización va por `args` (tema, briefPath, advisors con sus lentes
  copiadas de la banca).
- **Modelos**: el council es trabajo de definición — correr con el modelo de
  la sesión, sin degradar advisors por frugalidad (la lentitud por
  frugalidad es un error; la disciplina racionada es de git, no de
  agentes). El Chairman ya corre con esfuerzo alto dentro del script.
- **Fallback sin Workflow**: mismo protocolo con Agent en dos tandas
  paralelas (opiniones → reviews, anonimizando a mano con letras) + un
  chairman final. Nunca secuencial por tacañería.
- Si el script devuelve `{error: 'council incompleto'}`: relanzar una vez;
  si persiste, reportar al founder qué sillas fallaron.

## Presentación al founder

Primera línea: el veredicto y su razón central. Después: resumen ejecutivo,
bloqueantes, y el disenso (si lo hubo — es la parte más informativa). Ruta
del acta al final. Sin narrar la maquinaria.
