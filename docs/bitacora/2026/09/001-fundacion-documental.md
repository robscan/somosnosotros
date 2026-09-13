# 001 · Fundación documental (2026-09-13)

El founder fijó el proyecto: **somosnosotros.org**, sin fines de lucro, directorio cultural y vinculador social. Empieza en **San Luis Potosí**, en español, publican el administrador y los usuarios por su cuenta. Objetivo: facilitar el registro de usuarios, de lugares culturales y de eventos; de cara al público, enterarse de dónde están los centros culturales y conocer gente local. No es un pasaporte ni una colección de lugares.

## Qué quedó en la carpeta

- [`docs/DEFINICION.md`](../../../DEFINICION.md) — una página: qué es, para quién, qué no es, reglas simples, stack.
- [`docs/PLAN.md`](../../../PLAN.md) — plan progresivo en 6 fases (base → usuarios → lugares → eventos → comunidad → alcance), cada una con su prueba; modelo de datos de 5 tablas.
- [`docs/ops/OPEN_LOOPS.md`](../../ops/OPEN_LOOPS.md) — estado del proyecto.
- `docs/heredado/` — solo 10 documentos de Flowya que sirven aquí (accesibilidad, microcopy, sheet inferior, formularios en móvil, geocodificar una vez, anti-duplicados, mutaciones optimistas, librería de componentes, y 2 referencias del shell mapa+panel). Se regeneran con `scripts/heredar.sh`.
- `docs/council/` — acta del council del mismo día (historia de cómo se llegó aquí).
- `.claude/skills/` — `council` y `front-visual`.

## Qué se descartó a propósito

La primera versión de esta carpeta traía 44 documentos heredados, una doctrina con 8 leyes, una lista de 10 decisiones y 4 experimentos. Sobraba. Fuera: capacidades nativas de iOS (fotos, Health), pasaporte, motor de lugares, MEMORIA/VISOR, doctrina del Passport, experimentos de push (los avisos empiezan por correo; push en la Fase 5), y el aparcado del proyecto Flowya (no es asunto de este repo).

## Estado de git

`git init` local, remoto `origin` apuntando a `robscan/somosnosotros`. Sin commit ni push: el founder da el VoBo a DEFINICION y PLAN y arranca la Fase 0.
