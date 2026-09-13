# Plantilla del acta del council

El Chairman produce las secciones hasta "Condiciones / próximos pasos".
Los anexos los añade el orquestador al guardar el acta (des-anonimizados).
Guardar en `docs/council/COUNCIL_<slug>_<fecha>.md`.

```markdown
# COUNCIL — {tema}

**Fecha:** {fecha} · **Brief:** {ruta} · **Advisors:** {n} · **Protocolo:** opiniones independientes → peer review ciego → chairman

## Veredicto recomendado: {VOBO | VOBO_CONDICIONADO | NO_GO | FALTAN_DATOS}

{Una línea con la razón central del veredicto.}

## Resumen ejecutivo

{≤10 líneas: qué se evaluó, qué encontró el council, qué recomienda y bajo qué condiciones.}

## Hallazgos consolidados

{Fusionar duplicados entre respuestas. Cada hallazgo: título — detalle — evidencia — qué respuestas lo vieron (letras).}

### Bloqueantes

### Mayores

### Menores

## Consenso y disenso

{En qué coinciden las lentes — y si ese consenso es fuerte o superficial. Dónde chocan y POR QUÉ: el disenso se reporta con sus razones, jamás se lava para que el acta "se vea limpia".}

## Peer review

{Tabla del ranking agregado (letra · posición media · votos). El argumento más fuerte y el más débil según los revisores. Los huecos que NINGUNA respuesta cubrió — esos huecos suelen ser la siguiente tarea.}

## Condiciones / próximos pasos

{Lista accionable y ordenada. Si VOBO_CONDICIONADO: condiciones exactas y verificables. Si FALTAN_DATOS: qué medición o experimento produce el dato y cuánto cuesta correrlo.}

---

## Anexo A — Autoría y opiniones completas

{Mapeo letra→advisor y la opinión completa de cada uno (postura, resumen, hallazgos, aciertos, condiciones).}

## Anexo B — Peer reviews crudos

{Ranking y comentarios de cada revisor, ya des-anonimizados.}
```
