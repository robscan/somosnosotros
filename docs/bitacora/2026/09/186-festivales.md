# 186 · Festivales y eventos con varios actos, propuesta de modelo (OL-151)

**Fecha:** 2026-09-23 · **Rama:** `festivales-modelo`, desde `origin/main` · **OL:** OL-151 (pieza C5 de la cola, L51) · **Modelo:** Sonnet 5. Sin council ni subagentes (costo). Solo documento, sin código ni migraciones.

## De dónde sale

El founder pidió (L51, `docs/ops/COLA_DE_PIEZAS.md`) analizar cómo registrar festivales de varios días con varios eventos, inauguraciones con varias salas y varios artistas el mismo día, y el EIMIM del CEART (varios días con talleres y conciertos), sabiendo que los eventos de un solo día siguen existiendo. Es el paso 3 del camino en pasos chicos de `docs/rediseno/24-grafo-cultural.md` ("Evento padre — festivales y eventos con varios actos. Con prototipo antes").

Lo leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-151 y el "Last updated" de `docs/ops/OPEN_LOOPS.md`, el renglón L51 de `docs/ops/COLA_DE_PIEZAS.md`, `docs/PLAN.md` (modelo de 5 tablas), `docs/rediseno/24-grafo-cultural.md`, la tabla `eventos` en `supabase/migrations/20260913120000_base.sql`, el alta de evento (`src/app/eventos/FormularioEvento.tsx`) y la lectura de cartel con IA (`src/lib/cartel.ts`), más `docs/ops/AGENDAS_CULTURALES.md` para dos casos reales adicionales (Festival de Cine UASLP, varios días en un solo lugar; Festival Internacional de Cine, varios días con sedes por anunciar).

## Qué se entrega

`docs/rediseno/42-festivales.md`, con:

1. Los tres casos del founder más dos de la agenda real, cada uno en tres líneas.
2. Tres formas de modelarlo: **A** evento padre con actos hijos (una columna nueva `eventos.evento_padre_id`), **B** un solo evento con tabla de programa aparte, **C** etiqueta de festival que agrupa eventos sueltos con tabla puente. Para cada una: ventajas, costo y qué rompe en agenda, ficha, coincidencias, "Voy", avisos y compartir.
3. Recomendación: **A**, porque conserva ficha, "Voy" y compartir por acto (lo que ya funciona en cada evento suelto) sin agregar un tipo de ficha nuevo ni tocar el alta del evento de un solo día. Migración que solo añade: `alter table eventos add column evento_padre_id uuid references eventos(id) on delete set null`. En la agenda: un renglón por festival, no uno por acto. En el alta: un renglón opcional al final ("¿Es parte de un festival?"), igual que "Duplicar evento" hoy.
4. Cómo lo leería la IA del cartel: un campo opcional `actos` en el esquema `Lectura` de `src/lib/cartel.ts` para cuando el cartel trae el programa completo, y un campo `festival: string | null` para cuando el cartel es de un acto suelto; siempre con confirmación de la persona, nunca publicado solo.
5. Tres preguntas cortas para el founder (horario propio del padre en una inauguración, herencia de lugar entre acto y padre, quién puede dar de alta actos de otros dentro de un festival ajeno).

## Verificación

Documentación sola: se revisó el diff (`git status`/`git diff` limpios salvo los tres archivos nuevos), sin build ni pruebas unitarias (no hay código). Sin datos privados: el documento no cita correos ni nombres de personas, solo nombres públicos de festivales e instituciones ya presentes en `docs/ops/AGENDAS_CULTURALES.md`.

## Pendiente

Firma del founder sobre cuál de las tres formas (A, B o C) prefiere, y respuesta a las tres preguntas antes de abrir el prototipo de pantalla (paso siguiente, pieza aparte).
