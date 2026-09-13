# Prompt de inicio para el chat en `/Users/apple-1/somosnosotros/`

Copia y pega esto como primer mensaje del chat nuevo (Claude Code abierto en esa carpeta):

---

Este es somosnosotros: plataforma sin fines de lucro, directorio de centros culturales y agenda de eventos para que la gente local de San Luis Potosí se entere de qué hay y se conozca. Lee `CLAUDE.md`, después `docs/ops/OPEN_LOOPS.md`, `docs/DEFINICION.md` y `docs/PLAN.md`, en ese orden, antes de proponer nada.

Contexto que no está en los archivos:
- Viene de Flowya (un pasaporte de viajes iOS y un web legado en Expo). De ahí se heredan solo 10 documentos en `docs/heredado/`. No traigas nada más de esos repos; no aplican fotos, Health, pasaporte ni motor de lugares.
- Un council de 6 lentes ya evaluó la idea (acta en `docs/council/`): lo útil que quedó es "contenido antes que envase" y "un solo renderer de mapa". El interés de los centros y la lista de lugares los gestiono yo personalmente; no me pidas eso.
- Publican el administrador (yo) y los usuarios registrados por su cuenta. Español, tema claro, mobile first. Sin app de tienda en la primera versión.
- Repo `robscan/somosnosotros` público y vacío; la carpeta tiene `origin` apuntando ahí, sin commits. Tokens y llaves solo en Vercel y Supabase, nunca en git.

Tarea de hoy: Fase 0 del plan. (1) Haz el primer commit con los documentos y súbelo a `main`. (2) Crea el proyecto Next.js (App Router, TypeScript) con lint, typecheck y tests. (3) Deja listo el layout base mapa + panel inferior con Mapbox GL JS leyendo el token de una variable de entorno, y la conexión a Supabase por variables de entorno. (4) Dime exactamente qué tengo que hacer yo en Vercel (dominio, variables) y en Supabase (crear proyecto, región East US) para que somosnosotros.org abra en mi iPhone con el mapa. Prueba de la fase: el mapa de San Luis Potosí abre en Safari del iPhone. Mantén todo simple; una fase a la vez; nada de jerga sin explicarla.

---

Al terminar cada sesión allá: bitácora numerada + `OPEN_LOOPS.md` actualizado.
