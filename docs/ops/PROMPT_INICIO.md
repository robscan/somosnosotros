# Prompt de inicio para el siguiente chat en `/Users/apple-1/somosnosotros/`

Copia y pega esto como primer mensaje del chat nuevo (Claude Code abierto en esa carpeta):

---

Este es somosnosotros: plataforma sin fines de lucro, directorio de centros culturales y agenda de eventos para que la gente local de San Luis Potosí se entere de qué hay y se conozca. Lee `CLAUDE.md`, después `docs/ops/OPEN_LOOPS.md` (estado real, empieza por "Ahora"), `docs/DEFINICION.md` y `docs/PLAN.md`, en ese orden. Las 6 fases del plan ya están en producción en somosnosotros.org; las bitácoras 001–014 en `docs/bitacora/2026/09/` cuentan cómo.

Contexto que no está en los archivos:
- Mi cuenta real en la app es la de me.com (admin); no crees cuentas con mi Gmail.
- Todas las llaves viven en Vercel (Production) y en mi `.env` local, ignorado por git; nunca las imprimas ni las metas al repo. Las variables sensibles de Vercel no se pueden leer de vuelta; si necesitas un valor, está en `.env`.
- Para probar flujos con sesión, crea usuarios desechables con la API de administración de Supabase (correo `prueba-...@somosnosotros.org`), entra con `/auth/callback?token_hash=…&type=magiclink`, y bórralos al terminar. No toques mis lugares ni eventos reales.
- Regla de trabajo que ya aprendimos: UX invisible. El sistema hace el trabajo (deduce, sugiere, evita pasos), muestra lo decidido y abre solo lo que se toca o falla; si una acción lleva a un selector nativo, se abre directo. Mide en toques.
- Un PR por pieza, CI en verde, merge y despliegue; captura móvil 390×844 antes de dar algo por bueno; bitácora numerada y `OPEN_LOOPS.md` al cerrar.

Tarea de hoy: [escribe aquí qué sigue: resultado de las pruebas en el iPhone, la segunda ciudad, WhatsApp, o lo que la ciudad pida].

---
